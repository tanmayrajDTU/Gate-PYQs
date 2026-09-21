'use client';
import { useEffect, useState } from 'react';
import { dayKey } from '../lib/spacedRepetition';
import { formatShortDate } from '../lib/format';

type AttemptLike = { attempted_at: string };

// Fixed GATE prep window for the activity grid — this is a calendar range,
// not a rolling "last N weeks ending today" window. Update these two dates
// if the prep window ever shifts.
const RANGE_START = new Date(2026, 7, 1);  // Aug 1, 2026
const RANGE_END = new Date(2027, 1, 10);   // Feb 10, 2027

// Pad the range out to full weeks (Sun-Sat columns), GitHub-heatmap style,
// so the requested start/end dates land inside a complete week rather than
// a partial one. This only depends on the two fixed dates above, so it's
// safe to compute at module scope — no "today" involved, nothing that can
// differ between server and client.
const GRID_START = new Date(RANGE_START);
GRID_START.setDate(GRID_START.getDate() - GRID_START.getDay());
const GRID_END = new Date(RANGE_END);
GRID_END.setDate(GRID_END.getDate() + (6 - GRID_END.getDay()));
const GRID_WEEKS = Math.round((GRID_END.getTime() - GRID_START.getTime()) / 86400000 / 7) + 1;

export function StreakHeatmap({ attempts }: { attempts: AttemptLike[] }) {
  // This grid depends on toLocaleDateString's default locale, which can
  // legitimately differ between the server that pre-rendered this (static)
  // page at build time and the browser that hydrates it later. Rendering a
  // fixed placeholder on the server and computing the real grid only after
  // mount avoids a hydration mismatch instead of fighting that skew.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 3 }}>
          {Array.from({ length: GRID_WEEKS }).map((_, ci) => (
            <div key={ci} style={{ display: 'grid', gridTemplateRows: 'repeat(7,1fr)', gap: 3 }}>
              {Array.from({ length: 7 }).map((_, di) => (
                <div key={di} style={{ width: 11, height: 11, borderRadius: 3, background: 'var(--track-bg)', border: '1px solid var(--line)' }} />
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 11, color: 'var(--faint)' }}>
          <span>Less</span>
          {[0, 1, 2, 3, 4].map(l => (
            <span key={l} style={{ width: 11, height: 11, borderRadius: 3, background: 'var(--track-bg)', border: '1px solid var(--line)', display: 'inline-block' }} />
          ))}
          <span>More</span>
        </div>
      </div>
    );
  }

  const counts = new Map<string, number>();
  for (const a of attempts) {
    const k = dayKey(new Date(a.attempted_at));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const cols: Date[][] = [];
  const cursor = new Date(GRID_START);
  for (let w = 0; w < GRID_WEEKS; w++) {
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
              // Padding cells that fall outside the fixed Aug 1 - Feb 10
              // window (added only to complete the first/last week) render
              // blank rather than as data — same treatment as "future"
              // days got in the old rolling-window version.
              const outOfRange = d < RANGE_START || d > RANGE_END;
              const k = dayKey(d);
              const n = counts.get(k) ?? 0;
              const lvl = level(n);
              return (
                <div
                  key={di}
                  title={outOfRange ? '' : `${formatShortDate(d)}: ${n} question${n === 1 ? '' : 's'}`}
                  style={{
                    width: 11, height: 11, borderRadius: 3,
                    background: outOfRange ? 'transparent' : shades[lvl],
                    opacity: outOfRange ? 0 : opacities[lvl],
                    border: outOfRange ? 'none' : lvl === 0 ? '1px solid var(--line)' : 'none',
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
