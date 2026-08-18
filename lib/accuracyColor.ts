/** Accuracy-tier color, using the app's existing semantic palette (no new hues). */
export function accuracyColor(pct: number): string {
  if (pct >= 75) return 'var(--success)';
  if (pct >= 50) return 'var(--accent)';
  return 'var(--danger)';
}

export function accuracyTint(pct: number): string {
  if (pct >= 75) return 'var(--success-soft)';
  if (pct >= 50) return 'var(--accent-soft)';
  return 'var(--danger-soft)';
}
