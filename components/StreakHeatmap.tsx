'use client';
import { dayKey } from '../lib/spacedRepetition';

type AttemptLike = { attempted_at: string };

export function StreakHeatmap({ attempts, weeks = 18 }: { attempts: AttemptLike[]; weeks?: number }) {
  const counts = new Map<string, number>();
  for (const a of attempts) {
    const k = dayKey(new Date(a.attempted_at));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Align the grid so the last column ends on the current week.
  const end = new Date(today);
  const endDow = end.getDay(); // 0=Sun
  end.setDate(end.getDate() + (6 - endDow));
  const start = new Date(end);
  start.setDate(start.getDate() - weeks * 7 + 1);

  const cols: Date[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < weeks; w++) {
    const col: Date[] = [];
    for (let d = 0; d < 7; d++) { col.push(new Date(cursor)); cursor.setDate(cursor.getDate() + 1); }
    cols.push(col);
  }

  function level(n: number) {
    if (n <= 0) return 0;
    if (n === 1) return 1;
    if (n <= 3) return 2;
    if (n <= 6) return 3;
    return 4;
  }
  const shades = ['var(--track-bg)', 'var(--accent-soft)', 'var(--accent)', 'var(--accent)', 'var(--accent)'];
  const opacities = [1, 1, 0.55, 0.8, 1];

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {cols.map((col, ci) => (
          <div key={ci} style={{ display: 'grid', gridTemplateRows: 'repeat(7,1fr)', gap: 3 }}>
            {col.map((d, di) => {
              const future = d > today;
              const k = dayKey(d);
              const n = counts.get(k) ?? 0;
              const lvl = level(n);
              return (
                <div
                  key={di}
                  title={future ? '' : `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${n} question${n === 1 ? '' : 's'}`}
                  style={{
                    width: 11, height: 11, borderRadius: 3,
                    background: future ? 'transparent' : shades[lvl],
                    opacity: future ? 0 : opacities[lvl],
                    border: future ? 'none' : lvl === 0 ? '1px solid var(--line)' : 'none',
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 11, color: 'var(--faint)' }}>
        <span>Less</span>
        {[0, 1, 2, 3, 4].map(l => (
          <span key={l} style={{ width: 11, height: 11, borderRadius: 3, background: shades[l], opacity: l === 0 ? 1 : opacities[l], border: l === 0 ? '1px solid var(--line)' : 'none', display: 'inline-block' }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
