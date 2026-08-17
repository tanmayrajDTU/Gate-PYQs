import { parseNatAnswer, isNatAnswerCorrect, natTolerance } from '../lib/natAnswer';

let pass = 0, fail = 0;
function check(desc: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; } else { fail++; console.log(`FAIL: ${desc}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`); }
}
function checkBool(desc: string, actual: boolean, expected: boolean) {
  if (actual === expected) pass++; else { fail++; console.log(`FAIL: ${desc} (expected ${expected}, got ${actual})`); }
}

// --- parseNatAnswer: single values ---
check('single int', parseNatAnswer('42'), { type: 'valid', segments: [{ type: 'single', value: 42 }] });
check('single decimal', parseNatAnswer('197.9'), { type: 'valid', segments: [{ type: 'single', value: 197.9 }] });
check('single trailing .0', parseNatAnswer('42.0'), { type: 'valid', segments: [{ type: 'single', value: 42 }] });
check('single negative', parseNatAnswer('-2.1'), { type: 'valid', segments: [{ type: 'single', value: -2.1 }] });

// --- parseNatAnswer: ranges ---
check('range no spaces', parseNatAnswer('197.9:198.1'), { type: 'valid', segments: [{ type: 'range', min: 197.9, max: 198.1 }] });
check('range with spaces', parseNatAnswer('197.9 : 198.1'), { type: 'valid', segments: [{ type: 'range', min: 197.9, max: 198.1 }] });
check('range negative both', parseNatAnswer(' -2.1 : -1.9 '), { type: 'valid', segments: [{ type: 'range', min: -2.1, max: -1.9 }] });
check('equal-value range', parseNatAnswer('195:195'), { type: 'valid', segments: [{ type: 'range', min: 195, max: 195 }] });
check('equal-value range with spaces', parseNatAnswer('65 : 65'), { type: 'valid', segments: [{ type: 'range', min: 65, max: 65 }] });

// --- parseNatAnswer: multi-segment (real dataset pattern) ---
check('multi-segment', parseNatAnswer('13.3:13.3;13.5:13.5'), {
  type: 'valid', segments: [{ type: 'range', min: 13.3, max: 13.3 }, { type: 'range', min: 13.5, max: 13.5 }],
});
check('multi-segment with spaces', parseNatAnswer('819 : 820 ; 205 : 205'), {
  type: 'valid', segments: [{ type: 'range', min: 819, max: 820 }, { type: 'range', min: 205, max: 205 }],
});

// --- parseNatAnswer: invalid input never throws ---
check('empty string', parseNatAnswer(''), { type: 'invalid' });
check('whitespace only', parseNatAnswer('   '), { type: 'invalid' });
check('non-numeric', parseNatAnswer('abc'), { type: 'invalid' });
check('partial numeric (no unsafe parseFloat hack)', parseNatAnswer('12abc'), { type: 'invalid' });
check('triple colon', parseNatAnswer('1:2:3'), { type: 'invalid' });
check('null', parseNatAnswer(null), { type: 'invalid' });
check('undefined', parseNatAnswer(undefined), { type: 'invalid' });
check('the real bad record (X)', parseNatAnswer('X'), { type: 'invalid' });

// --- isNatAnswerCorrect: scoring semantics from the spec ---
checkBool('197.9 accepted at lower bound', isNatAnswerCorrect('197.9 : 198.1', '197.9'), true);
checkBool('198.0 accepted mid-range', isNatAnswerCorrect('197.9 : 198.1', '198.0'), true);
checkBool('198.1 accepted at upper bound', isNatAnswerCorrect('197.9 : 198.1', '198.1'), true);
checkBool('197.89 rejected (just below range)', isNatAnswerCorrect('197.9 : 198.1', '197.89'), false);
checkBool('198.11 rejected (just above range)', isNatAnswerCorrect('197.9 : 198.1', '198.11'), false);

checkBool('195:195 accepts 195', isNatAnswerCorrect('195:195', '195'), true);
checkBool('195:195 rejects 194', isNatAnswerCorrect('195:195', '194'), false);
checkBool('195:195 rejects 196', isNatAnswerCorrect('195:195', '196'), false);

checkBool('negative range accepts interior value', isNatAnswerCorrect('-2.1:-1.9', '-2.0'), true);
checkBool('negative range rejects out-of-range', isNatAnswerCorrect('-2.1:-1.9', '-1.5'), false);

checkBool('multi-segment accepts first alt', isNatAnswerCorrect('13.3:13.3;13.5:13.5', '13.3'), true);
checkBool('multi-segment accepts second alt', isNatAnswerCorrect('13.3:13.3;13.5:13.5', '13.5'), true);
checkBool('multi-segment rejects value between alts', isNatAnswerCorrect('13.3:13.3;13.5:13.5', '13.4'), false);

// single-value tolerance preserved exactly (relative 1e-6, floor 1e-9)
checkBool('single value exact match', isNatAnswerCorrect('42', '42'), true);
checkBool('single value tiny float noise accepted', isNatAnswerCorrect('42', String(42 + 1e-8)), true);
checkBool('single value real difference rejected', isNatAnswerCorrect('42', '42.1'), false);
check('tolerance formula for 197.9', natTolerance(197.9), Math.max(1e-9, Math.abs(197.9) * 1e-6));

// --- isNatAnswerCorrect: never crashes on garbage ---
checkBool('empty expected', isNatAnswerCorrect('', '42'), false);
checkBool('garbage expected', isNatAnswerCorrect('abc', '42'), false);
checkBool('empty user answer', isNatAnswerCorrect('42', ''), false);
checkBool('garbage user answer', isNatAnswerCorrect('42', '12abc'), false);
checkBool('triple-colon expected', isNatAnswerCorrect('1:2:3', '2'), false);
checkBool('null user answer', isNatAnswerCorrect('42', null), false);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
