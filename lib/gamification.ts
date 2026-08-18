// Gamification layer: points, levels, badges.
//
// Design (see conversation for full rationale):
// - Points are scaled by question type, not flat, and only awarded the
//   FIRST time a question is ever answered correctly — otherwise points
//   could be farmed by re-answering known questions.
// - No penalty for wrong answers. This is a motivation layer for a study
//   tool, not a replica of GATE's real negative marking — punishing wrong
//   attempts here would discourage attempting hard questions.
// - Everything here is derived from `question_attempts` at read time.
//   Nothing new is written to Supabase for this feature.

import type { Question } from './types';

export const POINTS_BY_TYPE: Record<Question['type'], number> = {
  mcq: 10,
  msq: 12,
  nat: 15,
  descriptive: 5,
};

export type LevelTier = { name: string; min: number };

export const LEVELS: LevelTier[] = [
  { name: 'Novice', min: 0 },
  { name: 'Apprentice', min: 100 },
  { name: 'Practitioner', min: 500 },
  { name: 'Adept', min: 1500 },
  { name: 'Expert', min: 4000 },
  { name: 'Master', min: 10000 },
  { name: 'Grandmaster', min: 20000 },
];

export type LevelProgress = {
  level: LevelTier;
  index: number;
  next: LevelTier | null;
  progressPct: number; // 0-100 toward next level; 100 if maxed out
  pointsIntoLevel: number;
  pointsToNext: number | null;
};

export function computeLevel(points: number): LevelProgress {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (points >= LEVELS[i].min) index = i;
  }
  const level = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  const pointsIntoLevel = points - level.min;
  const pointsToNext = next ? next.min - points : null;
  const progressPct = next ? Math.min(100, Math.round((pointsIntoLevel / (next.min - level.min)) * 100)) : 100;
  return { level, index, next, progressPct, pointsIntoLevel, pointsToNext };
}

export type AttemptLike = { question_id: string; result: string; attempted_at: string };

/**
 * Finds the earliest correct attempt per question (points are awarded once,
 * at first success — not on every re-answer). Returns the set of question
 * ids that have ever been solved correctly, plus the total point value.
 */
export function computePoints(attempts: AttemptLike[], questionTypeMap: Map<string, Question['type']>) {
  const earliestCorrect = new Map<string, string>();
  for (const a of attempts) {
    if (a.result !== 'correct') continue;
    const cur = earliestCorrect.get(a.question_id);
    if (!cur || a.attempted_at < cur) earliestCorrect.set(a.question_id, a.attempted_at);
  }
  let total = 0;
  const byType: Record<string, number> = { mcq: 0, msq: 0, nat: 0, descriptive: 0 };
  for (const qid of earliestCorrect.keys()) {
    const type = questionTypeMap.get(qid);
    if (!type) continue;
    const pts = POINTS_BY_TYPE[type] ?? 0;
    total += pts;
    byType[type] = (byType[type] ?? 0) + pts;
  }
  return { total, byType, solvedIds: new Set(earliestCorrect.keys()) };
}

/** Small same-day bonus for maintaining a streak — flavor only, not baked into the stored/lifetime total. */
export function streakMultiplier(currentStreak: number): number {
  return 1 + Math.min(currentStreak, 10) * 0.02; // capped at +20%
}

export type BadgeContext = {
  correctCount: number;
  longestStreak: number;
  subjectStats: { id: string; name: string; accuracy: number; scored: number }[];
  natCorrectCount: number;
  subjectsAttemptedCount: number;
};

export type Badge = {
  id: string;
  category: 'milestone' | 'streak' | 'mastery';
  title: string;
  description: string;
  check: (ctx: BadgeContext) => boolean;
  progress: (ctx: BadgeContext) => { current: number; target: number };
};

export const BADGES: Badge[] = [
  { id: 'first-blood', category: 'milestone', title: 'First Blood', description: 'Solve your first question correctly.', check: c => c.correctCount >= 1, progress: c => ({ current: Math.min(c.correctCount, 1), target: 1 }) },
  { id: 'half-century', category: 'milestone', title: 'Half Century', description: 'Solve 50 questions correctly.', check: c => c.correctCount >= 50, progress: c => ({ current: Math.min(c.correctCount, 50), target: 50 }) },
  { id: 'century', category: 'milestone', title: 'Century', description: 'Solve 100 questions correctly.', check: c => c.correctCount >= 100, progress: c => ({ current: Math.min(c.correctCount, 100), target: 100 }) },
  { id: 'quarter-k', category: 'milestone', title: 'Quarter Thousand', description: 'Solve 250 questions correctly.', check: c => c.correctCount >= 250, progress: c => ({ current: Math.min(c.correctCount, 250), target: 250 }) },
  { id: 'half-k', category: 'milestone', title: '500 Club', description: 'Solve 500 questions correctly.', check: c => c.correctCount >= 500, progress: c => ({ current: Math.min(c.correctCount, 500), target: 500 }) },
  { id: 'streak-3', category: 'streak', title: 'Warming Up', description: 'Reach a 3-day practice streak.', check: c => c.longestStreak >= 3, progress: c => ({ current: Math.min(c.longestStreak, 3), target: 3 }) },
  { id: 'streak-7', category: 'streak', title: 'Week Strong', description: 'Reach a 7-day practice streak.', check: c => c.longestStreak >= 7, progress: c => ({ current: Math.min(c.longestStreak, 7), target: 7 }) },
  { id: 'streak-30', category: 'streak', title: 'Unstoppable', description: 'Reach a 30-day practice streak.', check: c => c.longestStreak >= 30, progress: c => ({ current: Math.min(c.longestStreak, 30), target: 30 }) },
  { id: 'subject-master', category: 'mastery', title: 'Subject Master', description: 'Hit 90%+ accuracy in a subject (20+ scored attempts).', check: c => c.subjectStats.some(s => s.scored >= 20 && s.accuracy >= 90), progress: c => { const best = c.subjectStats.filter(s => s.scored >= 20).sort((a, b) => b.accuracy - a.accuracy)[0]; return { current: best ? Math.min(best.accuracy, 90) : 0, target: 90 }; } },
  { id: 'nat-ace', category: 'mastery', title: 'NAT Ace', description: 'Solve 50 NAT questions correctly.', check: c => c.natCorrectCount >= 50, progress: c => ({ current: Math.min(c.natCorrectCount, 50), target: 50 }) },
  { id: 'explorer', category: 'mastery', title: 'Explorer', description: 'Attempt questions in 10 different subjects.', check: c => c.subjectsAttemptedCount >= 10, progress: c => ({ current: Math.min(c.subjectsAttemptedCount, 10), target: 10 }) },
  { id: 'well-rounded', category: 'mastery', title: 'Well Rounded', description: 'Attempt questions in 20 different subjects.', check: c => c.subjectsAttemptedCount >= 20, progress: c => ({ current: Math.min(c.subjectsAttemptedCount, 20), target: 20 }) },
];

export function computeBadges(ctx: BadgeContext) {
  return BADGES.map(b => ({ badge: b, unlocked: b.check(ctx), progress: b.progress(ctx) }));
}
