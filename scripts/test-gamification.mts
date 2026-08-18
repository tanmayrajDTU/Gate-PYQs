import gamification from '../lib/gamification';
const { computePoints, computeLevel, computeBadges, POINTS_BY_TYPE } = gamification as any;

let pass = 0, fail = 0;
function check(desc: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else { fail++; console.log(`FAIL: ${desc}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`); }
}

// --- points: first-correct-only, type-weighted ---
const typeMap = new Map([['q1', 'mcq'], ['q2', 'nat'], ['q3', 'msq'], ['q4', 'descriptive']]) as Map<string, any>;
const attempts = [
  { question_id: 'q1', result: 'incorrect', attempted_at: '2026-01-01T10:00:00Z' },
  { question_id: 'q1', result: 'correct', attempted_at: '2026-01-01T10:05:00Z' },
  { question_id: 'q1', result: 'correct', attempted_at: '2026-01-05T10:00:00Z' }, // re-answer, should NOT double-count
  { question_id: 'q2', result: 'correct', attempted_at: '2026-01-02T10:00:00Z' },
  { question_id: 'q3', result: 'correct', attempted_at: '2026-01-03T10:00:00Z' },
  { question_id: 'q4', result: 'correct', attempted_at: '2026-01-04T10:00:00Z' },
];
const points = computePoints(attempts, typeMap);
check('points total = 10+15+12+5', points.total, POINTS_BY_TYPE.mcq + POINTS_BY_TYPE.nat + POINTS_BY_TYPE.msq + POINTS_BY_TYPE.descriptive);
check('solved count = 4 unique (not 5 attempts)', points.solvedIds.size, 4);
check('re-answering does not inflate points', points.byType.mcq, POINTS_BY_TYPE.mcq);

// --- levels ---
check('0 points = Novice', computeLevel(0).level.name, 'Novice');
check('99 points = still Novice', computeLevel(99).level.name, 'Novice');
check('100 points = Apprentice', computeLevel(100).level.name, 'Apprentice');
check('20000+ points = Grandmaster, maxed', computeLevel(50000).progressPct, 100);
check('Grandmaster has no next tier', computeLevel(50000).next, null);
const mid = computeLevel(300); // between Apprentice(100) and Practitioner(500)
check('mid-level progress is between 0-100', mid.progressPct > 0 && mid.progressPct < 100, true);

// --- badges ---
const ctxNone = { correctCount: 0, longestStreak: 0, subjectStats: [], natCorrectCount: 0, subjectsAttemptedCount: 0 };
const badgesNone = computeBadges(ctxNone);
check('no badges unlocked with zero activity', badgesNone.every(b => !b.unlocked), true);

const ctxSome = { correctCount: 100, longestStreak: 7, subjectStats: [{ id: 'a', name: 'Algorithms', accuracy: 92, scored: 25 }], natCorrectCount: 10, subjectsAttemptedCount: 12 };
const badgesSome = computeBadges(ctxSome);
const unlockedIds = badgesSome.filter(b => b.unlocked).map(b => b.badge.id).sort();
check('correct badges unlock at ctxSome', unlockedIds, ['century', 'explorer', 'first-blood', 'half-century', 'streak-3', 'streak-7', 'subject-master'].sort());
check('nat-ace NOT unlocked (only 10/50)', badgesSome.find(b => b.badge.id === 'nat-ace')!.unlocked, false);
check('well-rounded NOT unlocked (12/20 subjects)', badgesSome.find(b => b.badge.id === 'well-rounded')!.unlocked, false);
check('subject-master progress caps at 90', badgesSome.find(b => b.badge.id === 'subject-master')!.progress, { current: 90, target: 90 });

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
