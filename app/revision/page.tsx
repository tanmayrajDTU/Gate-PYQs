'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { allQuestions } from '../../lib/data';
import { getCurrentUserId, loadFlags, reviewRevisionCard, type FlagRow } from '../../lib/persistence';
import { boxLabel } from '../../lib/spacedRepetition';

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
        return q ? { q, box: v.box, nextReviewAt: v.nextReviewAt, due } : null;
      })
      .filter((x): x is { q: typeof allQuestions[number]; box: number; nextReviewAt: string | null; due: boolean } => !!x)
      .sort((a, b) => (a.nextReviewAt ?? '').localeCompare(b.nextReviewAt ?? ''));
  }, [flags]);

  const due = entries.filter(e => e.due);
  const upcoming = entries.filter(e => !e.due);

  async function review(questionId: string, box: number, remembered: boolean) {
    if (!userId) return;
    setFlags(f => {
      const cur = f[questionId];
      if (!cur) return f;
      const nb = remembered ? Math.min(box + 1, 5) : 1;
      const days = [1, 3, 7, 14, 30][nb - 1];
      const next = new Date(); next.setDate(next.getDate() + days);
      return { ...f, [questionId]: { ...cur, box: nb, nextReviewAt: next.toISOString() } };
    });
    try { await reviewRevisionCard(userId, questionId, box, remembered); }
    catch { setStatus('Could not sync that review — it will retry next visit.'); }
  }

  return (
    <div className="setup">
      <div className="page-title">
        <div><div className="eyebrow">Spaced review queue</div><h1>Revision</h1><p>Cards you mark for revision resurface on a schedule — sooner if you forget, later once they stick.</p></div>
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
            {due.map(({ q, box }) => (
              <div className="table-row" key={q.id} style={{ gridTemplateColumns: '1.6fr .5fr .5fr .7fr' }}>
                <span><b>{q.number} · {q.title}</b><div className="muted">{q.subject} · {q.topic}</div></span>
                <span><span className="pill">{boxLabel(box)}</span></span>
                <span>{q.year ?? '—'}</span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <button className="btn" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }} onClick={() => review(q.id, box, false)}><X size={14} />Forgot</button>
                  <button className="btn" style={{ background: 'var(--answered-bg)' }} onClick={() => review(q.id, box, true)}><Check size={14} />Knew it</button>
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
            <div className="table-row header"><span>Question</span><span>Box</span><span>Year</span><span>Next review</span></div>
            {upcoming.map(({ q, box, nextReviewAt }) => (
              <div className="table-row" key={q.id}>
                <span><b>{q.number} · {q.title}</b><div className="muted">{q.subject} · {q.topic}</div></span>
                <span><span className="pill">{boxLabel(box)}</span></span>
                <span>{q.year ?? '—'}</span>
                <span className="muted">{nextReviewAt ? new Date(nextReviewAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
