// Gamification layer: points, levels, badges.
//
// Design (see conversation for full rationale):
// - Points are scaled by question type, not flat, and only awarded the
//   FIRST time a question is ever answered correctly — otherwise points
//   could be farmed by re-answering known questions.
// - No penalty for wrong answers. This is a motivation layer for a study
//   tool, not a replica of GATE's real negative marking — punishing wrong
//   attempts here would discourage attempting hard questions.
// - Revision (SM-2 grading) earns a smaller, flat per-review point value
//   (see REVIEW_POINTS) — smaller because it's reinforcing something
//   already learned rather than novel solving, and flat (not scaled by
//   which of the 4 grades you pick) so the point system never incentivizes
//   dishonest grading (e.g. always clicking "Easy" to bank more points,
//   which would corrupt the SM-2 schedule itself). It's still naturally
//   rate-limited without an explicit check: SM-2's minimum interval is 1
//   day, so a given question can't be graded — and therefore rewarded —
//   more than once per calendar day.
// - Everything here is derived from `question_attempts` (solving) and
//   `question_flags` (revision). Nothing new is written to Supabase beyond
//   what practicing/reviewing already writes.

import type { Question } from './types';
import { dayKey } from './spacedRepetition';
import type { FlagRow } from './persistence';

export const POINTS_BY_TYPE: Record<Question['type'], number> = {
  mcq: 10,
  msq: 12,
  nat: 15,
  descriptive: 5,
};

/** Flat point value per SM-2 grading action — see the file-level comment for why this isn't scaled by grade or question type. */
export const REVIEW_POINTS = 3;

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

/** Sum of review points earned across every flagged question's lifetime review_count. */
export function computeReviewPoints(flags: Record<string, FlagRow>): number {
  return Object.values(flags).reduce((sum, f) => sum + (f.reviewCount ?? 0) * REVIEW_POINTS, 0);
}

/**
 * Merges practice attempts with revision activity (question_flags.lastReviewedAt)
 * into one list of "did something today" events, for streak/heatmap purposes.
 * A day where you only reviewed due SM-2 cards — no fresh practice — should
 * still count toward your streak; without this merge it wouldn't, since
 * computeStreak only ever looked at question_attempts. Deliberately keyed off
 * lastReviewedAt (set only by actual grading) rather than question_flags'
 * generic updated_at, so a bare bookmark toggle can't masquerade as revision
 * activity and inflate the streak for free.
 */
export function mergeActivityDates(attempts: AttemptLike[], flags: Record<string, FlagRow>): AttemptLike[] {
  const reviewEvents: AttemptLike[] = Object.entries(flags)
    .filter(([, f]) => f.lastReviewedAt)
    .map(([id, f]) => ({ question_id: id, result: 'reviewed', attempted_at: f.lastReviewedAt as string }));
  return [...attempts, ...reviewEvents];
}

export type BadgeContext = {
  correctCount: number;
  longestStreak: number;
  subjectStats: { id: string; name: string; accuracy: number; scored: number }[];
  natCorrectCount: number;
  subjectsAttemptedCount: number;
  // Added for the expanded badge set below — all still derived purely from
  // question_attempts (+ the static question catalog for type/subject/topic
  // lookups), consistent with this file's original design.
  msqCorrectCount: number;
  mcqCorrectCount: number;
  descriptiveCorrectCount: number;
  totalAttemptedCount: number;    // distinct questions ever attempted, any result
  topicsAttemptedCount: number;
  subjectsTotalCount: number;     // total subjects in the catalog, for a "cover every subject" badge
  attemptedTypesCount: number;    // 0-4, how many of {mcq,msq,nat,descriptive} have at least one attempt
  yearsAttemptedCount: number;    // distinct GATE exam years with at least one attempted question
  redemptionCount: number;        // questions first gotten wrong, later answered correctly
  hasPerfectWeek: boolean;        // any single Mon-Sun week with practice activity on all 7 days
  totalReviewCount: number;       // lifetime sum of review_count across all flagged questions
  activeRevisionCount: number;    // distinct questions currently flagged revision=true
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
  { id: 'grandmaster-recall', category: 'milestone', title: 'Grandmaster of Recall', description: 'Solve 1,000 questions correctly.', check: c => c.correctCount >= 1000, progress: c => ({ current: Math.min(c.correctCount, 1000), target: 1000 }) },
  { id: 'grinder', category: 'milestone', title: 'Grinder', description: 'Attempt 1,000 distinct questions, right or wrong.', check: c => c.totalAttemptedCount >= 1000, progress: c => ({ current: Math.min(c.totalAttemptedCount, 1000), target: 1000 }) },
  { id: 'msq-ace', category: 'milestone', title: 'MSQ Ace', description: 'Solve 30 multi-select questions correctly.', check: c => c.msqCorrectCount >= 30, progress: c => ({ current: Math.min(c.msqCorrectCount, 30), target: 30 }) },
  { id: 'mcq-specialist', category: 'milestone', title: 'MCQ Specialist', description: 'Solve 200 MCQ questions correctly.', check: c => c.mcqCorrectCount >= 200, progress: c => ({ current: Math.min(c.mcqCorrectCount, 200), target: 200 }) },
  { id: 'descriptive-scholar', category: 'milestone', title: 'Descriptive Scholar', description: 'Work through 50 descriptive questions.', check: c => c.descriptiveCorrectCount >= 50, progress: c => ({ current: Math.min(c.descriptiveCorrectCount, 50), target: 50 }) },
  { id: 'redemption', category: 'milestone', title: 'Redemption', description: 'Come back and solve 20 questions you\u2019d previously gotten wrong.', check: c => c.redemptionCount >= 20, progress: c => ({ current: Math.min(c.redemptionCount, 20), target: 20 }) },
  { id: 'streak-3', category: 'streak', title: 'Warming Up', description: 'Reach a 3-day practice streak.', check: c => c.longestStreak >= 3, progress: c => ({ current: Math.min(c.longestStreak, 3), target: 3 }) },
  { id: 'streak-7', category: 'streak', title: 'Week Strong', description: 'Reach a 7-day practice streak.', check: c => c.longestStreak >= 7, progress: c => ({ current: Math.min(c.longestStreak, 7), target: 7 }) },
  { id: 'streak-14', category: 'streak', title: 'Fortnight', description: 'Reach a 14-day practice streak.', check: c => c.longestStreak >= 14, progress: c => ({ current: Math.min(c.longestStreak, 14), target: 14 }) },
  { id: 'streak-30', category: 'streak', title: 'Unstoppable', description: 'Reach a 30-day practice streak.', check: c => c.longestStreak >= 30, progress: c => ({ current: Math.min(c.longestStreak, 30), target: 30 }) },
  { id: 'streak-100', category: 'streak', title: 'Centurion', description: 'Reach a 100-day practice streak.', check: c => c.longestStreak >= 100, progress: c => ({ current: Math.min(c.longestStreak, 100), target: 100 }) },
  { id: 'perfect-week', category: 'streak', title: 'Perfect Week', description: 'Practice every single day of one Mon\u2013Sun week.', check: c => c.hasPerfectWeek, progress: c => ({ current: c.hasPerfectWeek ? 1 : 0, target: 1 }) },
  { id: 'subject-master', category: 'mastery', title: 'Subject Master', description: 'Hit 90%+ accuracy in a subject (20+ scored attempts).', check: c => c.subjectStats.some(s => s.scored >= 20 && s.accuracy >= 90), progress: c => { const best = c.subjectStats.filter(s => s.scored >= 20).sort((a, b) => b.accuracy - a.accuracy)[0]; return { current: best ? Math.min(best.accuracy, 90) : 0, target: 90 }; } },
  { id: 'perfectionist', category: 'mastery', title: 'Perfectionist', description: 'Hit 100% accuracy in a subject (20+ scored attempts).', check: c => c.subjectStats.some(s => s.scored >= 20 && s.accuracy >= 100), progress: c => { const best = c.subjectStats.filter(s => s.scored >= 20).sort((a, b) => b.accuracy - a.accuracy)[0]; return { current: best ? Math.min(best.accuracy, 100) : 0, target: 100 }; } },
  { id: 'nat-ace', category: 'mastery', title: 'NAT Ace', description: 'Solve 50 NAT questions correctly.', check: c => c.natCorrectCount >= 50, progress: c => ({ current: Math.min(c.natCorrectCount, 50), target: 50 }) },
  { id: 'explorer', category: 'mastery', title: 'Explorer', description: 'Attempt questions in 10 different subjects.', check: c => c.subjectsAttemptedCount >= 10, progress: c => ({ current: Math.min(c.subjectsAttemptedCount, 10), target: 10 }) },
  { id: 'well-rounded', category: 'mastery', title: 'Well Rounded', description: 'Attempt questions in 20 different subjects.', check: c => c.subjectsAttemptedCount >= 20, progress: c => ({ current: Math.min(c.subjectsAttemptedCount, 20), target: 20 }) },
  { id: 'full-house', category: 'mastery', title: 'Full House', description: 'Attempt at least one question in every subject.', check: c => c.subjectsTotalCount > 0 && c.subjectsAttemptedCount >= c.subjectsTotalCount, progress: c => ({ current: Math.min(c.subjectsAttemptedCount, c.subjectsTotalCount || 1), target: c.subjectsTotalCount || 1 }) },
  { id: 'topic-hopper', category: 'mastery', title: 'Topic Hopper', description: 'Attempt questions across 50 different topics.', check: c => c.topicsAttemptedCount >= 50, progress: c => ({ current: Math.min(c.topicsAttemptedCount, 50), target: 50 }) },
  { id: 'well-versed', category: 'mastery', title: 'Well-Versed', description: 'Attempt at least one MCQ, MSQ, NAT, and descriptive question.', check: c => c.attemptedTypesCount >= 4, progress: c => ({ current: Math.min(c.attemptedTypesCount, 4), target: 4 }) },
  { id: 'time-traveler', category: 'mastery', title: 'Time Traveler', description: 'Attempt questions from 15 different GATE years.', check: c => c.yearsAttemptedCount >= 15, progress: c => ({ current: Math.min(c.yearsAttemptedCount, 15), target: 15 }) },
  { id: 'reviewer', category: 'mastery', title: 'Reviewer', description: 'Complete 50 spaced-repetition reviews.', check: c => c.totalReviewCount >= 50, progress: c => ({ current: Math.min(c.totalReviewCount, 50), target: 50 }) },
  { id: 'revision-queue-builder', category: 'mastery', title: 'Revision Queue Builder', description: 'Keep 25 questions actively in your revision queue.', check: c => c.activeRevisionCount >= 25, progress: c => ({ current: Math.min(c.activeRevisionCount, 25), target: 25 }) },
];

export function computeBadges(ctx: BadgeContext) {
  return BADGES.map(b => ({ badge: b, unlocked: b.check(ctx), progress: b.progress(ctx) }));
}

/** Count of questions that were first gotten wrong, then later (any subsequent attempt) answered correctly. */
export function computeRedemptionCount(attempts: AttemptLike[]): number {
  const firstWrongAt = new Map<string, string>();
  const firstCorrectAt = new Map<string, string>();
  for (const a of attempts) {
    if (a.result === 'incorrect') {
      const cur = firstWrongAt.get(a.question_id);
      if (!cur || a.attempted_at < cur) firstWrongAt.set(a.question_id, a.attempted_at);
    }
    if (a.result === 'correct') {
      const cur = firstCorrectAt.get(a.question_id);
      if (!cur || a.attempted_at < cur) firstCorrectAt.set(a.question_id, a.attempted_at);
    }
  }
  let count = 0;
  for (const [qid, wrongAt] of firstWrongAt) {
    const correctAt = firstCorrectAt.get(qid);
    if (correctAt && correctAt > wrongAt) count++;
  }
  return count;
}

/** True if any single Monday-Sunday week has at least one attempt on all 7 days. */
export function hasPerfectWeek(attempts: AttemptLike[]): boolean {
  const daysByWeek = new Map<string, Set<string>>();
  for (const a of attempts) {
    const d = new Date(a.attempted_at);
    const dow = d.getDay(); // 0=Sun..6=Sat
    const monday = new Date(d);
    monday.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
    monday.setHours(0, 0, 0, 0);
    const weekKey = dayKey(monday);
    if (!daysByWeek.has(weekKey)) daysByWeek.set(weekKey, new Set());
    daysByWeek.get(weekKey)!.add(dayKey(d));
  }
  for (const days of daysByWeek.values()) if (days.size >= 7) return true;
  return false;
}
