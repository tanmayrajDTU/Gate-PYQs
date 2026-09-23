import questionsData from '../data/questions.json' with { type: 'json' };
import type { Question } from '../lib/types';
import { isNatAnswerCorrect } from '../lib/natAnswer';
import { POINTS_BY_TYPE } from '../lib/gamification';

const allQuestions = questionsData as Question[];

interface TestRunResult {
  name: string;
  passed: boolean;
  details: string[];
}

const testResults: TestRunResult[] = [];

async function runTest(name: string, fn: () => Promise<void> | void) {
  const details: string[] = [];
  try {
    await fn();
    testResults.push({ name, passed: true, details });
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    testResults.push({ name, passed: false, details: [err.message || String(err)] });
    console.error(`  ✗ ${name}: ${err.message || String(err)}`);
  }
}

// Emulate filter logic from app/practice/page.tsx
function filterPool(options: {
  volume?: string;
  subject?: string;
  selectedTopics?: string[];
  year?: string;
  type?: string;
  selectedTypes?: string[];
}): Question[] {
  const {
    volume = 'all',
    subject = 'all',
    selectedTopics = [],
    year = 'all',
    type = 'all',
    selectedTypes = ['mcq', 'msq', 'nat'],
  } = options;

  return allQuestions.filter(q => {
    if (volume !== 'all' && q.volume !== Number(volume)) return false;
    if (subject !== 'all' && q.subjectId !== subject) return false;
    if (selectedTopics.length > 0 && !selectedTopics.includes(q.topicId)) return false;

    // Year matching
    if (year !== 'all') {
      if (!q.year) return false;
      if (year === 'gte_2000' || year === 'above_2000') {
        if (q.year < 2000) return false;
      } else if (year === 'gte_2010') {
        if (q.year < 2010) return false;
      } else if (year === 'gte_2015') {
        if (q.year < 2015) return false;
      } else if (q.year !== Number(year)) {
        return false;
      }
    }

    // Question type matching
    if (type === 'objective' || type === 'no_descriptive') {
      if (q.type === 'descriptive') return false;
    } else if (type === 'custom') {
      if (selectedTypes.length > 0 && !selectedTypes.includes(q.type)) return false;
    } else if (type !== 'all') {
      if (q.type !== type) return false;
    }

    return true;
  });
}

// Emulate answer evaluation from PracticeClient.tsx
function evaluateAnswer(q: Question, answer: string[]): boolean | null {
  if (q.type === 'descriptive') return (answer && answer.length > 0) ? true : null;
  if (!q.answer) return null;
  if (!answer.length) return false;
  if (q.answer.trim().toUpperCase() === 'ALL') return true;
  if (q.type === 'nat') {
    return isNatAnswerCorrect(q.answer, answer[0]);
  }
  const expected = q.answer.split(/[{},;\s]+/).map(x => x.trim().toUpperCase()).filter(Boolean).sort();
  const actual = answer.map(x => x.trim().toUpperCase()).filter(Boolean).sort();
  return expected.length === actual.length && expected.every((value, i) => value === actual[i]);
}

// Format time from PracticeClient.tsx
function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

console.log('\n======================================================');
console.log('   PRACTICE ENGINE: MULTI-TEST SCENARIOS VALIDATION   ');
console.log('======================================================\n');

// -----------------------------------------------------------------------------
// TEST 1: Operating Systems, Year 2000+, Objective Only, 20 Questions
// -----------------------------------------------------------------------------
await runTest('Test 1: OS, 2000+, Objective Only - Filter pool & full correct attempt', () => {
  const pool = filterPool({
    subject: 'cat16', // Operating System
    year: 'gte_2000',
    type: 'objective',
  });

  if (pool.length === 0) throw new Error('Pool should not be empty');
  if (pool.some(q => (q.year ?? 0) < 2000)) throw new Error('Found pre-2000 question in 2000+ pool');
  if (pool.some(q => q.type === 'descriptive')) throw new Error('Found descriptive question in objective pool');

  // Slice 20 questions
  const items = pool.slice(0, 20);
  if (items.length !== 20) throw new Error(`Expected 20 items, got ${items.length}`);

  let totalPoints = 0;
  const submitted: Record<string, boolean> = {};
  const answers: Record<string, string[]> = {};

  for (const q of items) {
    submitted[q.id] = true;
    let myAnswer: string[] = [];

    if (q.type === 'mcq') {
      const correctOpt = q.answer?.trim() || 'A';
      myAnswer = [correctOpt];
    } else if (q.type === 'msq') {
      const correctOpts = (q.answer || 'A').split(/[{},;\s]+/).map(x => x.trim()).filter(Boolean);
      myAnswer = correctOpts;
    } else if (q.type === 'nat') {
      const natKey = q.answer || '0';
      const rangeMatch = natKey.match(/([-\d.]+)\s*(?:to|:|-)\s*([-\d.]+)/i);
      if (rangeMatch) {
        myAnswer = [rangeMatch[1]]; // pick lower bound
      } else {
        const numMatch = natKey.match(/([-\d.]+)/);
        myAnswer = [numMatch ? numMatch[1] : '0'];
      }
    }

    answers[q.id] = myAnswer;
    const isCorrect = evaluateAnswer(q, myAnswer);
    if (!isCorrect) {
      throw new Error(`Expected correct answer for question ${q.id} (type: ${q.type}, answer: ${q.answer}), got evaluated as: ${isCorrect}`);
    }
    totalPoints += POINTS_BY_TYPE[q.type] || 0;
  }

  // Calculate results
  const attempted = items.filter(q => submitted[q.id]).length;
  const scored = items.filter(q => submitted[q.id] && evaluateAnswer(q, answers[q.id] || []) === true).length;
  const accuracy = Math.round((scored / attempted) * 100);

  if (attempted !== 20) throw new Error(`Expected 20 attempted, got ${attempted}`);
  if (scored !== 20) throw new Error(`Expected 20 scored, got ${scored}`);
  if (accuracy !== 100) throw new Error(`Expected 100% accuracy, got ${accuracy}%`);
  if (totalPoints <= 0) throw new Error('Points should be > 0');
});

// -----------------------------------------------------------------------------
// TEST 2: Multi-Topic Select + Custom Question Types [MCQ, NAT] + End-of-Test Feedback
// -----------------------------------------------------------------------------
await runTest('Test 2: Multi-Topic Select + Custom Types [MCQ, NAT] + Mixed Attempts', () => {
  const topics = ['2_topic_bubble-sort', '2_topic_dynamic-programming', '2_topic_graph-algorithms'];
  const pool = filterPool({
    subject: 'cat2', // Algorithms
    selectedTopics: topics,
    type: 'custom',
    selectedTypes: ['mcq', 'nat'],
  });

  if (pool.length === 0) throw new Error('Multi-topic pool should not be empty');
  if (pool.some(q => !topics.includes(q.topicId))) throw new Error('Question found from unselected topic');
  if (pool.some(q => q.type !== 'mcq' && q.type !== 'nat')) throw new Error('Question found with type other than mcq/nat');

  // Attempt 12 questions: 8 correct, 4 deliberately wrong
  const count = Math.min(12, pool.length);
  const items = pool.slice(0, count);

  const submitted: Record<string, boolean> = {};
  const answers: Record<string, string[]> = {};

  for (let i = 0; i < items.length; i++) {
    const q = items[i];
    submitted[q.id] = true;

    if (i < 8) {
      // Correct
      if (q.type === 'mcq') {
        answers[q.id] = [q.answer?.trim() || 'A'];
      } else {
        const numMatch = (q.answer || '0').match(/([-\d.]+)/);
        answers[q.id] = [numMatch ? numMatch[1] : '0'];
      }
    } else {
      // Deliberately wrong
      if (q.type === 'mcq') {
        const wrongOpt = ['A', 'B', 'C', 'D'].find(x => x !== q.answer?.trim()) || 'Z';
        answers[q.id] = [wrongOpt];
      } else {
        answers[q.id] = ['-99999.99'];
      }
    }
  }

  const attempted = items.filter(q => submitted[q.id]).length;
  const scored = items.filter(q => submitted[q.id] && evaluateAnswer(q, answers[q.id] || []) === true).length;
  const accuracy = Math.round((scored / attempted) * 100);

  if (attempted !== count) throw new Error(`Expected ${count} attempted, got ${attempted}`);
  if (scored !== 8) throw new Error(`Expected 8 scored, got ${scored}`);
  const expectedAccuracy = Math.round((8 / count) * 100);
  if (accuracy !== expectedAccuracy) throw new Error(`Expected ${expectedAccuracy}% accuracy, got ${accuracy}%`);
});

// -----------------------------------------------------------------------------
// TEST 3: Recent Decade (2015+) + All Types + Custom Count
// -----------------------------------------------------------------------------
await runTest('Test 3: Year 2015+ (Last 10+ yrs) + All Types + Custom Count 25', () => {
  const pool = filterPool({
    year: 'gte_2015',
    type: 'all',
  });

  if (pool.length === 0) throw new Error('2015+ pool should not be empty');
  if (pool.some(q => (q.year ?? 0) < 2015)) throw new Error('Question found with year < 2015');

  // Verify all 4 types exist in this modern era
  const typesInPool = new Set(pool.map(q => q.type));
  if (!typesInPool.has('mcq') || !typesInPool.has('msq') || !typesInPool.has('nat')) {
    throw new Error('2015+ pool must have MCQ, MSQ, and NAT');
  }

  const items = pool.slice(0, 25);
  if (items.length !== 25) throw new Error('Expected 25 items');

  // Attempt all 25
  for (const q of items) {
    let ans: string[] = [];
    if (q.type === 'mcq') ans = [q.answer || 'A'];
    else if (q.type === 'msq') ans = (q.answer || 'A').split(/[{},;\s]+/).filter(Boolean);
    else if (q.type === 'nat') {
      const match = (q.answer || '0').match(/([-\d.]+)/);
      ans = [match ? match[1] : '0'];
    } else if (q.type === 'descriptive') {
      ans = ['attempted'];
    }
    const evalResult = evaluateAnswer(q, ans);
    if (!evalResult) {
      throw new Error(`Question ${q.id} failed evaluation: type=${q.type}, answer=${q.answer}`);
    }
  }
});

// -----------------------------------------------------------------------------
// TEST 4: Full GATE Mock (65 Questions, 3hr timer, Random Order)
// -----------------------------------------------------------------------------
await runTest('Test 4: Full Mock (65 Questions, 180 min timer, Random Shuffling)', () => {
  const pool = filterPool({
    volume: 'all',
    subject: 'all',
    year: 'all',
    type: 'all',
  });

  if (pool.length !== 3822) throw new Error(`Full pool should be 3822, got ${pool.length}`);

  // Emulate Fisher-Yates random shuffle
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const mockQuestions = shuffled.slice(0, 65);
  if (mockQuestions.length !== 65) throw new Error('Expected 65 questions');

  // Check 0 duplicates in sample
  const ids = new Set(mockQuestions.map(q => q.id));
  if (ids.size !== 65) throw new Error('Duplicate questions found in random sample');

  // Timer format check
  const timerSecs = 180 * 60; // 10800s
  const formattedTime = formatTime(timerSecs);
  if (formattedTime !== '3:00:00') throw new Error(`Expected '3:00:00', got '${formattedTime}'`);

  const formatted75 = formatTime(75 * 60);
  if (formatted75 !== '1:15:00') throw new Error(`Expected '1:15:00', got '${formatted75}'`);

  const formatted45 = formatTime(45 * 60);
  if (formatted45 !== '45:00') throw new Error(`Expected '45:00', got '${formatted45}'`);

  // Attempt all 65
  let answeredCount = 0;
  for (const q of mockQuestions) {
    answeredCount++;
  }
  if (answeredCount !== 65) throw new Error('Failed to iterate all 65 questions');
});

// -----------------------------------------------------------------------------
// TEST 5: Edge Filters & Boundary Controls
// -----------------------------------------------------------------------------
await runTest('Test 5: Edge Filters, Custom Count clamping & Empty Pools', () => {
  // Empty pool simulation (e.g. impossible year/volume combination)
  const impossiblePool = filterPool({
    volume: '1',
    subject: 'cat14', // Compiler Design is in Volume 2
  });
  if (impossiblePool.length !== 0) throw new Error('Expected 0 matching questions for impossible combination');

  // Custom count clamping
  const smallPool = filterPool({
    subject: 'cat2',
    year: '2024',
  });
  const customCountInput = '9999';
  const effectiveCount = Math.max(1, parseInt(customCountInput, 10) || 1);
  const maxCount = Math.min(effectiveCount, smallPool.length);
  if (maxCount !== smallPool.length) throw new Error(`Expected clamp to ${smallPool.length}, got ${maxCount}`);

  // Custom timer boundaries
  const customTimerInputNegative = '-15';
  const clampedTimer1 = Math.max(1, Math.min(720, parseInt(customTimerInputNegative, 10) || 1));
  if (clampedTimer1 !== 1) throw new Error(`Expected clamp to 1 min, got ${clampedTimer1}`);

  const customTimerInputHuge = '1000';
  const clampedTimer2 = Math.max(1, Math.min(720, parseInt(customTimerInputHuge, 10) || 1));
  if (clampedTimer2 !== 720) throw new Error(`Expected clamp to 720 min, got ${clampedTimer2}`);
});

// -----------------------------------------------------------------------------
// TEST 6: GATE Cancelled Questions ('ALL' Sentinel)
// -----------------------------------------------------------------------------
await runTest('Test 6: Questions with answer === "ALL" (Marks awarded to all candidates)', () => {
  const allMarkedQuestions = allQuestions.filter(q => (q.answer || '').trim().toUpperCase() === 'ALL');
  if (allMarkedQuestions.length === 0) throw new Error('Should have questions with ALL answer key');

  for (const q of allMarkedQuestions) {
    // Any answer should evaluate to true
    if (evaluateAnswer(q, ['A']) !== true) throw new Error(`Failed for question ${q.id} with option A`);
    if (evaluateAnswer(q, ['D']) !== true) throw new Error(`Failed for question ${q.id} with option D`);
    if (evaluateAnswer(q, ['anything']) !== true) throw new Error(`Failed for question ${q.id} with text`);
    // Empty submission for objective questions should be false (unanswered)
    if (q.type !== 'descriptive') {
      if (evaluateAnswer(q, []) !== false) throw new Error(`Empty answer should evaluate to false for ${q.id}`);
    }
  }
});

// -----------------------------------------------------------------------------
// TEST 7: MSQ Order & Normalization Invariance
// -----------------------------------------------------------------------------
await runTest('Test 7: MSQ Order & Token Normalization', () => {
  const msqQuestions = allQuestions.filter(q => q.type === 'msq' && q.answer && q.answer.includes(';'));
  if (msqQuestions.length === 0) throw new Error('Should have multi-token MSQ questions');

  const sample = msqQuestions[0];
  const tokens = sample.answer.split(';').map(x => x.trim().toUpperCase());
  const reversedTokens = [...tokens].reverse();

  // Exact reversed order should match
  if (!evaluateAnswer(sample, reversedTokens)) {
    throw new Error(`MSQ should match regardless of selection order for ${sample.id}`);
  }

  // Partial answer should fail
  if (tokens.length > 1) {
    const partial = [tokens[0]];
    if (evaluateAnswer(sample, partial) === true) {
      throw new Error(`MSQ partial answer should not be marked completely correct for ${sample.id}`);
    }
  }

  // Excess option should fail
  const excess = [...tokens, 'Z'];
  if (evaluateAnswer(sample, excess) === true) {
    throw new Error(`MSQ excess option should fail for ${sample.id}`);
  }
});

// -----------------------------------------------------------------------------
// TEST 8: NAT Precision & Edge Range Matches
// -----------------------------------------------------------------------------
await runTest('Test 8: NAT Precision, Negative numbers, and Ranges', () => {
  // Test range parsing (uses ':' in the dataset)
  const mockNatRange: Question = {
    id: 'test-nat-range',
    number: '1',
    volume: 1,
    subjectId: 'sub',
    subject: 'Sub',
    topicId: 'top',
    topic: 'Top',
    topicNumber: '1',
    year: 2024,
    exam: 'GATE',
    type: 'nat',
    bodyHtml: '<p>Test</p>',
    options: [],
    answer: '12.5 : 13.5',
  };

  if (!evaluateAnswer(mockNatRange, ['13'])) throw new Error('13 should be inside [12.5, 13.5]');
  if (!evaluateAnswer(mockNatRange, ['12.5'])) throw new Error('12.5 lower bound should match');
  if (!evaluateAnswer(mockNatRange, ['13.5'])) throw new Error('13.5 upper bound should match');
  if (evaluateAnswer(mockNatRange, ['12.4'])) throw new Error('12.4 should be outside range');
  if (evaluateAnswer(mockNatRange, ['13.6'])) throw new Error('13.6 should be outside range');

  // Test negative float
  const mockNatNeg: Question = {
    ...mockNatRange,
    id: 'test-nat-neg',
    answer: '-2.5',
  };
  if (!evaluateAnswer(mockNatNeg, ['-2.5'])) throw new Error('-2.5 should match');
  if (!evaluateAnswer(mockNatNeg, ['-2.50'])) throw new Error('-2.50 should match -2.5');
  if (evaluateAnswer(mockNatNeg, ['2.5'])) throw new Error('2.5 should not match -2.5');

  // Test invalid input
  if (evaluateAnswer(mockNatNeg, ['abc'])) throw new Error('abc should not match number');
  if (evaluateAnswer(mockNatNeg, [''])) throw new Error('empty string should not match');
});

// -----------------------------------------------------------------------------
// TEST 9: Non-GATE Practice Builder Filter & Session Flow
// -----------------------------------------------------------------------------
await runTest('Test 9: Non-GATE Practice Builder Pool & Flow', async () => {
  // Test ISRO CSE with Objective only preset
  const otherQuestions = (await import('../data/other-questions.json', { with: { type: 'json' } })).default as Question[];
  const isroPool = otherQuestions.filter(q => {
    if (q.exam !== 'ISRO CSE') return false;
    if (q.type === 'descriptive') return false; // objective only
    return true;
  });

  if (isroPool.length === 0) throw new Error('ISRO objective pool should not be empty');
  if (isroPool.some(q => q.type === 'descriptive')) throw new Error('Found descriptive question in ISRO objective pool');

  // Attempt 10 questions
  const sample = isroPool.slice(0, 10);
  for (const q of sample) {
    if (q.type === 'mcq' && q.answer) {
      const correct = evaluateAnswer(q, [q.answer.trim()]);
      if (!correct) throw new Error(`ISRO MCQ ${q.id} failed evaluation`);
    }
  }
});

// -----------------------------------------------------------------------------
// TEST 10: Descriptive Questions in End-of-Test Mode (Paper Marked vs Notes vs Unanswered)
// -----------------------------------------------------------------------------
await runTest('Test 10: Descriptive Question Attempt & End-of-Test Review Flow', async () => {
  const descriptiveQuestions = allQuestions.filter(q => q.type === 'descriptive');

  if (descriptiveQuestions.length < 3) {
    throw new Error(`Need at least 3 descriptive questions to test, found ${descriptiveQuestions.length}`);
  }

  const [q1, q2, q3] = descriptiveQuestions.slice(0, 3);

  const submitted: Record<string, boolean> = {};
  const answers: Record<string, string[]> = {};

  // Case 1: Marked on paper via 1-click button ("['attempted']")
  submitted[q1.id] = true;
  answers[q1.id] = ['attempted'];

  // Case 2: Solved with working notes entered in textarea
  submitted[q2.id] = true;
  answers[q2.id] = ['Derived closed-form solution: T(n) = 2T(n/2) + O(n) => O(n log n) by Master Theorem.'];

  // Case 3: Left unanswered (skipped)
  submitted[q3.id] = false;
  answers[q3.id] = [];

  const testItems = [q1, q2, q3];

  const isQuestionAnswered = (q: Question) => !!submitted[q.id] && (answers[q.id] || []).length > 0;

  if (!isQuestionAnswered(q1)) throw new Error('q1 (marked on paper) must be identified as answered');
  if (!isQuestionAnswered(q2)) throw new Error('q2 (working notes) must be identified as answered');
  if (isQuestionAnswered(q3)) throw new Error('q3 (skipped) must NOT be identified as answered');

  // Verify evaluateAnswer
  if (evaluateAnswer(q1, answers[q1.id]) !== true) throw new Error('q1 evaluateAnswer must return true for recorded attempt');
  if (evaluateAnswer(q2, answers[q2.id]) !== true) throw new Error('q2 evaluateAnswer must return true for recorded notes');
  if (evaluateAnswer(q3, answers[q3.id]) !== null) throw new Error('q3 evaluateAnswer must return null for unattempted descriptive');

  const attemptedCount = testItems.filter(isQuestionAnswered).length;
  const scoredCount = testItems.filter(q => isQuestionAnswered(q) && evaluateAnswer(q, answers[q.id] || []) === true).length;
  const unansweredCount = testItems.filter(q => !isQuestionAnswered(q)).length;
  const incorrectCount = testItems.filter(q => isQuestionAnswered(q) && q.type !== 'descriptive' && evaluateAnswer(q, answers[q.id] || []) === false).length;

  if (attemptedCount !== 2) throw new Error(`Expected 2 attempted descriptive questions, got ${attemptedCount}`);
  if (scoredCount !== 2) throw new Error(`Expected 2 scored descriptive questions, got ${scoredCount}`);
  if (unansweredCount !== 1) throw new Error(`Expected 1 unanswered descriptive question, got ${unansweredCount}`);
  if (incorrectCount !== 0) throw new Error(`Descriptive questions should not be counted as incorrect, got ${incorrectCount}`);
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n======================================================');
const passedCount = testResults.filter(r => r.passed).length;
const failedCount = testResults.filter(r => !r.passed).length;
console.log(`TOTAL PRACTICE SCENARIOS TESTED : ${testResults.length}`);
console.log(`PASSED                          : ${passedCount}`);
console.log(`FAILED                          : ${failedCount}`);
console.log('======================================================\n');

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL PRACTICE SCENARIOS TESTED & VERIFIED WITH 0 ISSUES!\n');
}

