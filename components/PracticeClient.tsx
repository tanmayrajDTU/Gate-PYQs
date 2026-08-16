'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, ChevronLeft, ChevronRight, Clock3, ExternalLink, Flag, RotateCcw, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import type { Question } from '../lib/types';
import { QuestionRenderer } from './QuestionRenderer';
import { getCurrentUserId, loadFlags, setQuestionFlags, createPracticeSession, updatePracticeSession, recordAttempt } from '../lib/persistence';

type Feedback = 'immediate' | 'end';

type Props = {
  questions: Question[];
  count: number;
  feedback: Feedback;
  timerMinutes: number;
  order: 'sequential' | 'random';
};

export function PracticeClient({ questions, count, feedback, timerMinutes, order }: Props) {
  const [items] = useState<Question[]>(() => {
    const pool = [...questions];
    if (order === 'random') {
      for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
    }
    return pool.slice(0, count);
  });
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [review, setReview] = useState<Record<string, boolean>>({});
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});
  const [revision, setRevision] = useState<Record<string, boolean>>({});
  const [seconds, setSeconds] = useState(timerMinutes * 60);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncing, setSyncing] = useState(false);
  const lastPersistedRuntime = useRef('');

  const q = items[idx];

  useEffect(() => {
    let active = true;
    (async () => {
      const uid = await getCurrentUserId();
      if (!active) return;
      setUserId(uid);
      if (!uid) {
        setSyncMessage('Sign in to sync attempts, bookmarks, revision and sessions across devices.');
        return;
      }
      try {
        const flags = await loadFlags(uid);
        if (!active) return;
        setBookmarks(Object.fromEntries(Object.entries(flags).filter(([, v]) => v.bookmarked).map(([id]) => [id, true])));
        setRevision(Object.fromEntries(Object.entries(flags).filter(([, v]) => v.revision).map(([id]) => [id, true])));
        const id = await createPracticeSession(uid, {
          feedback,
          timerMinutes,
          order,
          count: items.length,
          questionCount: items.length,
        }, items.map(x => x.id));
        if (active) setSessionId(id);
      } catch (error) {
        console.error(error);
        if (active) setSyncMessage('Supabase sync is unavailable. Your current session will continue locally.');
      }
    })();
    return () => { active = false; };
  }, [feedback, timerMinutes, order, items]);

  useEffect(() => {
    if (done) return;
    const t = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
      if (timerMinutes > 0) setSeconds(current => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [done, startedAt, timerMinutes]);

  useEffect(() => {
    if (!done && timerMinutes > 0 && seconds === 0) void finish();
  }, [done, seconds, timerMinutes]);

  useEffect(() => {
    if (done) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [done]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      if (!q) return;
      if (event.key === 'ArrowLeft') setIdx(i => Math.max(0, i - 1));
      if (event.key === 'ArrowRight') setIdx(i => Math.min(items.length - 1, i + 1));
      if (event.key.toLowerCase() === 'r') setReview(s => ({ ...s, [q.id]: !s[q.id] }));
      if (event.key.toLowerCase() === 'b') void toggleFlag('bookmark');
      if (event.key.toLowerCase() === 'v') void toggleFlag('revision');
      if (event.key.toLowerCase() === 's' && !submitted[q.id]) void submitAnswer();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // Persist the resumable runtime without sending a request on every keystroke.
  useEffect(() => {
    if (!userId || !sessionId || done) return;
    const runtime = JSON.stringify({ index: idx, answers, submitted, review, elapsed });
    if (runtime === lastPersistedRuntime.current) return;
    const timer = window.setTimeout(async () => {
      try {
        setSyncing(true);
        await updatePracticeSession(userId, sessionId, {
          feedback, timerMinutes, order, count: items.length, questionCount: items.length,
          runtime: JSON.parse(runtime),
        });
        lastPersistedRuntime.current = runtime;
      } catch (error) {
        console.error(error);
        setSyncMessage('Could not save the latest session state.');
      } finally {
        setSyncing(false);
      }
    }, 750);
    return () => window.clearTimeout(timer);
  }, [userId, sessionId, idx, answers, submitted, review, elapsed, done, feedback, timerMinutes, order, items.length]);

  const answer = answers[q?.id] || [];
  const isSubmitted = !!submitted[q?.id];
  const correct = useMemo(() => q ? evaluateAnswer(q, answer) : null, [q, answer]);

  if (!q) return <div className="card section"><h2>No questions in this session</h2><Link href="/practice" className="btn btn-primary">Back to practice</Link></div>;

  async function submitAnswer() {
    if (submitted[q.id]) return;
    const nextResult = evaluateAnswer(q, answers[q.id] || []);
    setSubmitted(s => ({ ...s, [q.id]: true }));
    if (userId) {
      try {
        await recordAttempt(userId, q.id, sessionId, answers[q.id] || [], nextResult === true ? 'correct' : nextResult === false ? 'incorrect' : 'recorded');
      } catch (error) {
        console.error(error);
        setSyncMessage('Answer saved locally, but could not sync this attempt.');
      }
    }
  }

  async function toggleFlag(kind: 'bookmark' | 'revision') {
    const nextBookmark = kind === 'bookmark' ? !bookmarks[q.id] : !!bookmarks[q.id];
    const nextRevision = kind === 'revision' ? !revision[q.id] : !!revision[q.id];
    if (kind === 'bookmark') setBookmarks(s => ({ ...s, [q.id]: nextBookmark }));
    else setRevision(s => ({ ...s, [q.id]: nextRevision }));
    if (userId) {
      try { await setQuestionFlags(userId, q.id, nextBookmark, nextRevision); }
      catch (error) { console.error(error); setSyncMessage('Could not sync that saved state.'); }
    }
  }

  async function finish() {
    const finalElapsed = Math.floor((Date.now() - startedAt) / 1000);
    setElapsed(finalElapsed);
    setDone(true);
    if (userId && sessionId) {
      try {
        await updatePracticeSession(userId, sessionId, {
          feedback, timerMinutes, order, count: items.length, questionCount: items.length,
          runtime: { index: idx, answers, submitted, review, elapsed: finalElapsed, bookmarks, revision },
        }, true);
      } catch (error) { console.error(error); setSyncMessage('The result is available, but session completion could not be synced.'); }
    }
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  if (done) {
    return <PracticeResults items={items} answers={answers} submitted={submitted} elapsed={elapsed} bookmarks={bookmarks} revision={revision} review={review} syncMessage={syncMessage} />;
  }

  return (
    <div className="practice-layout">
      <div className="question-top">
        <div>
          <div className="eyebrow">Practice session</div>
          <h1 style={{ margin: 0, fontSize: 24 }}>Question {idx + 1} of {items.length}</h1>
        </div>
        <div className="q-meta">
          {timerMinutes > 0 && <span className="pill"><Clock3 size={13} /> {mm}:{ss}</span>}
          <span className="pill">{order === 'random' ? 'Random' : 'Sequential'}</span>
          {userId && <span className="pill">{syncing ? 'Saving…' : 'Synced'}</span>}
        </div>
      </div>

      {syncMessage && <div className="card" style={{ padding: 12, marginBottom: 14 }}><span className="muted">{syncMessage}</span>{!userId && <Link href="/login" className="btn btn-soft" style={{ marginLeft: 10 }}>Login</Link>}</div>}

      <div className="two-col grid">
        <div>
          <QuestionRenderer q={q} selected={answer} onSelect={v => setAnswers(a => ({ ...a, [q.id]: v }))} submitted={isSubmitted} />

          {isSubmitted && feedback === 'immediate' && (
            <div className="card" style={{ padding: 18, marginTop: 14 }}>
              <b className={correct === true ? 'success' : correct === false ? 'danger' : ''}>{correct === true ? 'Correct' : correct === false ? 'Incorrect' : 'Answer recorded'}</b>
              {q.answer && <div className="muted" style={{ marginTop: 6 }}>Correct answer: {q.answer}</div>}
              {q.type === 'descriptive' && <div className="muted" style={{ marginTop: 6 }}>Descriptive questions have no stored answer key, so they're marked correct automatically on submit. Use GateOverflow to check your working.</div>}
              {q.gateOverflowUrl && <a className="btn btn-soft" style={{ marginTop: 12 }} href={q.gateOverflowUrl} target="_blank" rel="noreferrer">Open GateOverflow <ExternalLink size={15} /></a>}
            </div>
          )}

          <div className="practice-bottom">
            <button className="btn btn-soft" onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}><ChevronLeft />Previous</button>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button className="btn" style={{ background: review[q.id] ? 'var(--review-bg)' : 'var(--surface2)' }} onClick={() => setReview(r => ({ ...r, [q.id]: !r[q.id] }))}><Flag size={16} />{review[q.id] ? 'Marked' : 'Review'}</button>
              <button className="btn" style={{ background: bookmarks[q.id] ? 'var(--btn-soft-bg)' : 'var(--surface2)', color: bookmarks[q.id] ? 'var(--btn-soft-text)' : 'var(--text)' }} onClick={() => void toggleFlag('bookmark')}><Bookmark size={16} />{bookmarks[q.id] ? 'Saved' : 'Save'}</button>
              <button className="btn" style={{ background: revision[q.id] ? 'var(--answered-bg)' : 'var(--surface2)' }} onClick={() => void toggleFlag('revision')}><RotateCcw size={16} />{revision[q.id] ? 'Revision' : 'Revise'}</button>
              {!isSubmitted && <button className="btn btn-primary" onClick={() => void submitAnswer()}>Submit</button>}
              {idx < items.length - 1 ? <button className="btn btn-primary" onClick={() => setIdx(idx + 1)}>Next<ChevronRight /></button> : <button className="btn btn-primary" onClick={() => void finish()}>Finish</button>}
            </div>
          </div>
        </div>

        <div className="card palette">
          <div className="section-head"><h3>Question palette</h3><span className="pill">{Object.keys(submitted).length} answered</span></div>
          <div className="palette-grid">{items.map((x, i) => <button key={x.id} className={(i === idx ? 'current ' : '') + (submitted[x.id] ? 'answered ' : '') + (review[x.id] ? 'review' : '')} onClick={() => setIdx(i)}>{i + 1}</button>)}</div>
          <div style={{ marginTop: 18, display: 'grid', gap: 8, fontSize: 12, color: 'var(--muted)' }}><span>🟢 Answered</span><span>🟡 Marked for review</span><span>⬜ Unanswered</span></div>
          <button className="btn btn-primary" style={{ marginTop: 18, width: '100%', justifyContent: 'center' }} onClick={() => void finish()}><RefreshCw size={15} /> End session</button>
        </div>
      </div>
    </div>
  );
}

function evaluateAnswer(q: Question, answer: string[]): boolean | null {
  // Descriptive questions have no stored answer key, so there is nothing to
  // grade against. Once submitted, they are marked correct by default.
  if (q.type === 'descriptive') return true;
  if (!q.answer) return null;
  if (!answer.length) return false;
  if (q.type === 'nat') {
    const expected = Number(q.answer);
    const actual = Number(answer[0]);
    return Number.isFinite(expected) && Number.isFinite(actual) && Math.abs(expected - actual) <= Math.max(1e-9, Math.abs(expected) * 1e-6);
  }
  const expected = q.answer.split(/[{},\s,]+/).map(x => x.trim().toUpperCase()).filter(Boolean).sort();
  const actual = answer.map(x => x.trim().toUpperCase()).filter(Boolean).sort();
  return expected.length === actual.length && expected.every((value, i) => value === actual[i]);
}

function PracticeResults({ items, answers, submitted, elapsed, bookmarks, revision, review, syncMessage }: { items: Question[]; answers: Record<string, string[]>; submitted: Record<string, boolean>; elapsed: number; bookmarks: Record<string, boolean>; revision: Record<string, boolean>; review: Record<string, boolean>; syncMessage: string }) {
  const attempted = items.filter(q => submitted[q.id]).length;
  const scored = items.filter(q => submitted[q.id] && evaluateAnswer(q, answers[q.id] || []) === true).length;
  // Descriptive questions are always evaluable (auto-correct on submit) even
  // though they have no stored answer key.
  const evaluableAttempted = items.filter(q => submitted[q.id] && (q.type === 'descriptive' || q.answer)).length;
  const evaluable = items.filter(q => q.type === 'descriptive' || q.answer).length;
  const unanswered = items.length - attempted;
  const average = items.length ? Math.round(elapsed / items.length) : 0;
  const accuracy = evaluableAttempted ? Math.round(scored / evaluableAttempted * 100) : 0;

  return <div className="setup">
    <div className="page-title"><div><div className="eyebrow">Session complete</div><h1>Practice results</h1><p>Review your responses and use GateOverflow where a full explanation is not embedded in the dataset.</p></div><Link className="btn btn-primary" href="/practice">Practice again</Link></div>
    {syncMessage && <div className="card" style={{ padding: 12, marginBottom: 14 }}><span className="muted">{syncMessage}</span></div>}
    <div className="grid result-grid"><Stat label="Questions" value={items.length} /><Stat label="Attempted" value={attempted} /><Stat label="Unanswered" value={unanswered} /><Stat label="Correct" value={scored} /><Stat label="Accuracy" value={`${accuracy}%`} /><Stat label="Time" value={formatDuration(elapsed)} /><Stat label="Avg / question" value={formatDuration(average)} /><Stat label="Evaluable" value={evaluable} /></div>
    <div className="card section" style={{ marginTop: 18 }}><div className="section-head"><h3>Question review</h3><span className="pill">{items.length} questions</span></div><div className="table-like"><div className="table-row header"><span>Question</span><span>Type</span><span>Result</span><span>Saved</span><span>Source</span></div>{items.map((q, i) => { const result = !submitted[q.id] ? 'Unanswered' : evaluateAnswer(q, answers[q.id] || []) === true ? 'Correct' : evaluateAnswer(q, answers[q.id] || []) === false ? 'Incorrect' : 'Recorded'; return <div className="table-row" key={q.id}><span><b>{i + 1}. {q.title}</b><div className="muted">{q.subject} · {q.topic}{review[q.id] ? ' · Marked for review' : ''}{revision[q.id] ? ' · Revision' : ''}</div></span><span>{q.type.toUpperCase()}</span><span className={result === 'Correct' ? 'success' : result === 'Incorrect' ? 'danger' : ''}>{result}</span><span>{bookmarks[q.id] ? '⭐' : '—'}</span><span>{q.gateOverflowUrl && <a href={q.gateOverflowUrl} target="_blank" rel="noreferrer" className="btn btn-soft"><ExternalLink size={14} /> GateOverflow</a>}</span></div>; })}</div></div>
  </div>;
}

function Stat({ label, value }: { label: string; value: string | number }) { return <div className="card stat"><div className="label">{label}</div><div className="result-number">{value}</div></div>; }
function formatDuration(totalSeconds: number) { const minutes = Math.floor(totalSeconds / 60); const seconds = totalSeconds % 60; return minutes ? `${minutes}m ${String(seconds).padStart(2, '0')}s` : `${seconds}s`; }
