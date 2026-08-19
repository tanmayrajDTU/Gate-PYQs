// SM-2 spaced repetition (the SuperMemo-2 algorithm — the same core method
// Anki's default scheduler is built on). Replaces the earlier fixed
// 5-box Leitner system: every card now has its own ease factor that
// adapts to how consistently you actually remember it, instead of every
// card in "box 3" getting the same interval regardless of how hard it's
// been for you specifically.
//
// Grading is 4-way (Again / Hard / Good / Easy) rather than a binary
// remembered/forgot — the ease factor adjustment needs that resolution to
// do anything useful; collapsing it to two buttons degenerates back into
// a Leitner system in disguise.

export type Grade = 'again' | 'hard' | 'good' | 'easy';

export type Sm2State = {
  easeFactor: number;   // >= 1.3, starts at 2.5
  intervalDays: number; // days until next review, 0 = brand new / due now
  repetitions: number;  // consecutive non-"again" reviews
};

export const DEFAULT_SM2_STATE: Sm2State = { easeFactor: 2.5, intervalDays: 0, repetitions: 0 };

const MIN_EASE = 1.3;

// SM-2's quality scale is 0-5; we collapse the 4 UI grades onto it.
const GRADE_QUALITY: Record<Grade, number> = { again: 0, hard: 3, good: 4, easy: 5 };

export const GRADE_LABELS: Record<Grade, string> = {
  again: 'Again',
  hard: 'Hard',
  good: 'Good',
  easy: 'Easy',
};

/**
 * Runs one SM-2 review step. Returns the card's updated scheduling state
 * plus the resolved next-review timestamp.
 */
export function sm2Review(state: Sm2State, grade: Grade, now: Date = new Date()): { state: Sm2State; nextReviewAt: Date } {
  const q = GRADE_QUALITY[grade];
  let { easeFactor, intervalDays, repetitions } = state;

  if (q < 3) {
    // Forgotten: restart the learning steps.
    repetitions = 0;
    intervalDays = 1;
  } else {
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
    repetitions += 1;
  }

  easeFactor = Math.max(MIN_EASE, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  const nextReviewAt = new Date(now);
  nextReviewAt.setDate(nextReviewAt.getDate() + intervalDays);

  return { state: { easeFactor, intervalDays, repetitions }, nextReviewAt };
}

/** Anki-style maturity label, derived from the card's current interval — purely a display label, not stored separately. */
export function maturityLabel(state: Sm2State): string {
  if (state.repetitions === 0) return 'New';
  if (state.intervalDays < 21) return 'Learning';
  if (state.intervalDays < 60) return 'Young';
  return 'Mature';
}

// --- One-time migration helper -------------------------------------------
// Converts a card that only has old Leitner-box state (no SM-2 columns
// populated yet) into a reasonable starting SM-2 state, so existing
// revision history isn't discarded when the scheduler changes.
const LEGACY_BOX_INTERVALS_DAYS = [1, 3, 7, 14, 30];
export function sm2StateFromLegacyBox(box: number): Sm2State {
  const idx = Math.min(Math.max(box, 1), LEGACY_BOX_INTERVALS_DAYS.length) - 1;
  return {
    easeFactor: 2.5,
    intervalDays: LEGACY_BOX_INTERVALS_DAYS[idx],
    repetitions: idx, // rough equivalent of how many successful reviews got it this far
  };
}

// --- Unrelated helpers kept as-is (used by Achievements/Dashboard/Streaks) ---

export type AttemptLike = { attempted_at: string };

/** Returns { current, longest, days } where days is a Set of 'YYYY-MM-DD' strings with >=1 attempt. */
export function computeStreak(attempts: AttemptLike[]) {
  const days = new Set<string>();
  for (const a of attempts) {
    const d = new Date(a.attempted_at);
    days.add(dayKey(d));
  }
  const today = new Date();
  let current = 0;
  const cursor = new Date(today);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }
  const sorted = [...days].sort();
  let longest = 0, run = 0, prev: string | null = null;
  for (const key of sorted) {
    if (prev) {
      const prevDate = new Date(prev);
      prevDate.setDate(prevDate.getDate() + 1);
      run = dayKey(prevDate) === key ? run + 1 : 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = key;
  }
  return { current, longest, days };
}

export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function daysUntil(target: Date): number {
  const ms = target.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}
