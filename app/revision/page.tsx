'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Check, X, Minus, Zap } from 'lucide-react';
import { allQuestions } from '../../lib/data';
import { getCurrentUserId, loadFlags, reviewRevisionCard, type FlagRow } from '../../lib/persistence';
import { maturityLabel, GRADE_LABELS, type Grade, type Sm2State } from '../../lib/spacedRepetition';
import { formatShortDate } from '../../lib/format';

const GRADE_ICONS: Record<Grade, React.ReactNode> = {
  again: <X size={14} />,
  hard: <Minus size={14} />,
  good: <Check size={14} />,
  easy: <Zap size={14} />,
};

const GRADE_STYLES: Record<Grade, React.CSSProperties> = {
  again: { background: 'var(--danger-soft)', color: 'var(--danger)' },
  hard: { background: 'var(--accent-soft)', color: 'var(--accent-strong)' },
  good: { background: 'var(--answered-bg)' },
  easy: { background: 'var(--answered-bg)' },
};

export default function Revision() {
  const [userId, setUserId] = useState<string | null>(null);
  const [flags, setFlags] = useState<Record<string, FlagRow>>({});
  const [status, setStatus] = useState('Loading revision queue…');

  useEffect(() => {
    (async () => {
      const uid = await getCurrentUserId();
      if (!uid) { setStatus('Sign in to access your synchronized revision queue.'); return; }
      setUserId(uid);
      try { setFlags(await loadFlags(uid)); setStatus(''); }
      catch { setStatus('Could not load revision queue.'); }
    })();
  }, []);

  const entries = useMemo(() => {
    const now = Date.now();
    return Object.entries(flags)
      .filter(([, v]) => v.revision)
      .map(([id, v]) => {
        const q = allQuestions.find(x => x.id === id);
        const due = v.nextReviewAt ? new Date(v.nextReviewAt).getTime() <= now : true;
        return q ? { q, sm2: v.sm2, nextReviewAt: v.nextReviewAt, due } : null;
      })
      .filter((x): x is { q: typeof allQuestions[number]; sm2: Sm2State; nextReviewAt: string | null; due: boolean } => !!x)
      .sort((a, b) => (a.nextReviewAt ?? '').localeCompare(b.nextReviewAt ?? ''));
  }, [flags]);

  const due = entries.filter(e => e.due);
  const upcoming = entries.filter(e => !e.due);

  async function review(questionId: string, currentState: Sm2State, grade: Grade) {
    if (!userId) return;
    setFlags(f => {
      const cur = f[questionId];
      if (!cur) return f;
      // Optimistic local update mirroring sm2Review, so the UI reflects the
      // new schedule immediately without waiting on the round trip.
      let { easeFactor, intervalDays, repetitions } = currentState;
      const q = { again: 0, hard: 3, good: 4, easy: 5 }[grade];
      if (q < 3) { repetitions = 0; intervalDays = 1; }
      else {
        if (repetitions === 0) intervalDays = 1;
        else if (repetitions === 1) intervalDays = 6;
        else intervalDays = Math.round(intervalDays * easeFactor);
        repetitions += 1;
      }
      easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
      const next = new Date(); next.setDate(next.getDate() + intervalDays);
      return { ...f, [questionId]: { ...cur, sm2: { easeFactor, intervalDays, repetitions }, nextReviewAt: next.toISOString() } };
    });
    try { await reviewRevisionCard(userId, questionId, currentState, grade); }
    catch { setStatus('Could not sync that review — it will retry next visit.'); }
  }

  return (
    <div className="setup">
      <div className="page-title">
        <div><div className="eyebrow">Spaced review queue · SM-2</div><h1>Revision</h1><p>Cards you mark for revision resurface on a schedule that adapts to each card individually — grade honestly and the interval tunes itself.</p></div>
        {due.length > 0 && <Link className="btn btn-primary" href="/practice?only=revision">Practice revision</Link>}
      </div>

      {status && entries.length === 0 && <div className="card section"><div className="empty">{status}</div></div>}

      {entries.length === 0 && !status && (
        <div className="card section"><div className="empty">Your revision queue is empty. Mark questions &quot;Revise&quot; while practicing to schedule them here.</div></div>
      )}

      {due.length > 0 && (
        <div className="card section" style={{ marginBottom: 16 }}>
          <div className="section-head"><h3>Due now ({due.length})</h3></div>
          <div className="table-like">
            {due.map(({ q, sm2 }) => (
              <div className="table-row" key={q.id} style={{ gridTemplateColumns: '1.4fr .55fr .45fr 1fr' }}>
                <span><b>{q.number} · {q.title}</b><div className="muted">{q.subject} · {q.topic}</div></span>
                <span><span className="pill">{maturityLabel(sm2)}</span></span>
                <span>{q.year ?? '—'}</span>
                <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(['again', 'hard', 'good', 'easy'] as Grade[]).map(g => (
                    <button key={g} className="btn" style={GRADE_STYLES[g]} onClick={() => review(q.id, sm2, g)}>
                      {GRADE_ICONS[g]}{GRADE_LABELS[g]}
                    </button>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="card section">
          <div className="section-head"><h3>Upcoming ({upcoming.length})</h3></div>
          <div className="table-like">
            <div className="table-row header"><span>Question</span><span>Stage</span><span>Year</span><span>Next review</span></div>
            {upcoming.map(({ q, sm2, nextReviewAt }) => (
              <div className="table-row" key={q.id}>
                <span><b>{q.number} · {q.title}</b><div className="muted">{q.subject} · {q.topic}</div></span>
                <span><span className="pill">{maturityLabel(sm2)}</span></span>
                <span>{q.year ?? '—'}</span>
                <span className="muted">{nextReviewAt ? formatShortDate(new Date(nextReviewAt)) : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
