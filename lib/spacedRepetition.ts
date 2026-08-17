// Simple Leitner-box spaced repetition: 5 boxes, each with a growing interval.
// Box 1 = review tomorrow, box 5 = review in a month (effectively "mastered").
export const BOX_INTERVALS_DAYS = [1, 3, 7, 14, 30];

export function boxLabel(box: number): string {
  if (box >= 5) return 'Mastered';
  return `Box ${box}`;
}

export function nextReviewDate(box: number, from: Date = new Date()): Date {
  const idx = Math.min(Math.max(box, 1), BOX_INTERVALS_DAYS.length) - 1;
  const days = BOX_INTERVALS_DAYS[idx];
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

export function advanceBox(box: number, remembered: boolean): number {
  if (remembered) return Math.min(box + 1, BOX_INTERVALS_DAYS.length);
  return 1;
}

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
  // If nothing logged today yet, streak can still count from yesterday backward.
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }
  // Longest streak across all recorded days.
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
