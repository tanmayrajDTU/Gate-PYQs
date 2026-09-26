'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, ChevronLeft, ChevronRight, Clock3, ExternalLink, Flag, RotateCcw, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import type { Question } from '../lib/types';
import { QuestionRenderer } from './QuestionRenderer';
import { PracticeReviewCard } from './PracticeReviewCard';
import { getCurrentUserId, loadFlags, setQuestionFlags, createPracticeSession, updatePracticeSession, recordAttempt, updateAttemptConfidence, scheduleRevisionFromGrade, loadCorrectQuestionIds } from '../lib/persistence';
import { isNatAnswerCorrect } from '../lib/natAnswer';
import { POINTS_BY_TYPE, REVIEW_POINTS } from '../lib/gamification';
import { DEFAULT_SM2_STATE, GRADE_LABELS, maturityLabel, type Sm2State, type Grade } from '../lib/spacedRepetition';
import { formatShortDate } from '../lib/format';
import { sanitizeHtml } from '../lib/sanitizeHtml';
import { typesetMath } from '../lib/mathjax';
import { isValidGateOverflowUrl } from '../lib/url';

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
  const [earnedIds, setEarnedIds] = useState<Set<string>>(new Set());
  const [pointsAwarded, setPointsAwarded] = useState<Record<string, number>>({});
  const [attemptIds, setAttemptIds] = useState<Record<string, number>>({});
  const [sm2States, setSm2States] = useState<Record<string, Sm2State>>({});
  const [reviewCounts, setReviewCounts] = useState<Record<string, number>>({});
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
        const [flags, correctIds] = await Promise.all([loadFlags(uid), loadCorrectQuestionIds(uid)]);
        if (!active) return;
        setBookmarks(Object.fromEntries(Object.entries(flags).filter(([, v]) => v.bookmarked).map(([id]) => [id, true])));
        setRevision(Object.fromEntries(Object.entries(flags).filter(([, v]) => v.revision).map(([id]) => [id, true])));
        setSm2States(Object.fromEntries(Object.entries(flags).map(([id, v]) => [id, v.sm2])));
        setReviewCounts(Object.fromEntries(Object.entries(flags).map(([id, v]) => [id, v.reviewCount])));
        setEarnedIds(correctIds);
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
      const target = event.target;
      const isRadioOrCheckbox = target instanceof HTMLInputElement && (target.type === 'radio' || target.type === 'checkbox');
      // Option inputs are radio/checkbox elements and legitimately hold
      // focus after a click — only text-entry-style fields (the NAT input,
      // any textarea/select) should suppress the shortcuts below.
      const isTypingField = (target instanceof HTMLInputElement && !isRadioOrCheckbox) || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
      if (isTypingField) {
        if (event.key === 'Enter' && q) {
          event.preventDefault();
          if (feedback === 'immediate' && !submitted[q.id]) {
            void submitAnswer();
          } else if (idx < items.length - 1) {
            if (answers[q.id]?.length && !submitted[q.id]) void submitAnswer();
            setIdx(i => Math.min(items.length - 1, i + 1));
          } else {
            void finish();
          }
        }
        return;
      }
      if (!q) return;
      if (event.key === 'ArrowLeft') setIdx(i => Math.max(0, i - 1));
      if (event.key === 'ArrowRight') setIdx(i => Math.min(items.length - 1, i + 1));
      if (event.key.toLowerCase() === 'r') setReview(s => ({ ...s, [q.id]: !s[q.id] }));
      if (event.key.toLowerCase() === 'b') void toggleFlag('bookmark');
      if (event.key.toLowerCase() === 'v') void toggleFlag('revision');
      if (feedback === 'immediate' && event.key.toLowerCase() === 's' && !submitted[q.id]) void submitAnswer();
      if (event.key === 'Enter') {
        event.preventDefault();
        if (feedback === 'immediate' && !submitted[q.id]) {
          void submitAnswer();
        } else if (idx < items.length - 1) {
          if (answers[q.id]?.length && !submitted[q.id]) void submitAnswer();
          setIdx(i => Math.min(items.length - 1, i + 1));
        } else {
          void finish();
        }
      }
      // Digit keys 1-9 select that option (mcq: single-select, msq: toggle).
      // Deliberately digits only, not letters — A-D would collide with the
      // r/b/v/s shortcuts above (e.g. "B" is both "bookmark" and "option B").
      if (!submitted[q.id] && (q.type === 'mcq' || q.type === 'msq') && /^[1-9]$/.test(event.key)) {
        const option = q.options[Number(event.key) - 1];
        if (option) {
          if (q.type === 'mcq') setAnswers(a => ({ ...a, [q.id]: [option.label] }));
          else setAnswers(a => { const cur = a[q.id] || []; return { ...a, [q.id]: cur.includes(option.label) ? cur.filter(x => x !== option.label) : [...cur, option.label] }; });
        }
      }
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

  async function submitAnswer(targetQ?: Question) {
    const activeQ = targetQ || q;
    if (!activeQ || submitted[activeQ.id]) return;
    const nextResult = evaluateAnswer(activeQ, answers[activeQ.id] || []);
    setSubmitted(s => ({ ...s, [activeQ.id]: true }));
    if (nextResult === true && !earnedIds.has(activeQ.id)) {
      setEarnedIds(s => new Set(s).add(activeQ.id));
      setPointsAwarded(p => ({ ...p, [activeQ.id]: POINTS_BY_TYPE[activeQ.type] ?? 0 }));
    }
    if (userId) {
      try {
        const attemptId = await recordAttempt(userId, activeQ.id, sessionId, answers[activeQ.id] || [], nextResult === true ? 'correct' : nextResult === false ? 'incorrect' : 'recorded');
        if (attemptId != null) setAttemptIds(a => ({ ...a, [activeQ.id]: attemptId }));
      } catch (error) {
        console.error(error);
        setSyncMessage('Answer saved locally, but could not sync this attempt.');
      }
    }
  }

  async function toggleFlag(kind: 'bookmark' | 'revision') {
    const priorRevision = !!revision[q.id];
    const nextBookmark = kind === 'bookmark' ? !bookmarks[q.id] : !!bookmarks[q.id];
    const nextRevision = kind === 'revision' ? !revision[q.id] : !!revision[q.id];
    if (kind === 'bookmark') setBookmarks(s => ({ ...s, [q.id]: nextBookmark }));
    else setRevision(s => ({ ...s, [q.id]: nextRevision }));
    if (userId) {
      try { await setQuestionFlags(userId, q.id, nextBookmark, nextRevision, priorRevision); }
      catch (error) { console.error(error); setSyncMessage('Could not sync that saved state.'); }
    }
  }

  async function finish() {
    const finalElapsed = Math.floor((Date.now() - startedAt) / 1000);
    setElapsed(finalElapsed);

    // Auto-submit any question that has a selected answer but was not explicitly submitted
    const newlySubmitted: Record<string, boolean> = {};
    for (const item of items) {
      if (!submitted[item.id] && (answers[item.id] || []).length > 0) {
        newlySubmitted[item.id] = true;
        void submitAnswer(item);
      }
    }
    if (Object.keys(newlySubmitted).length > 0) {
      setSubmitted(s => ({ ...s, ...newlySubmitted }));
    }

    setDone(true);
    if (userId && sessionId) {
      try {
        await updatePracticeSession(userId, sessionId, {
          feedback, timerMinutes, order, count: items.length, questionCount: items.length,
          runtime: { index: idx, answers, submitted: { ...submitted, ...newlySubmitted }, review, elapsed: finalElapsed, bookmarks, revision },
        }, true);
      } catch (error) { console.error(error); setSyncMessage('The result is available, but session completion could not be synced.'); }
    }
  }

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (done) {
    return <PracticeResults items={items} answers={answers} submitted={submitted} elapsed={elapsed} bookmarks={bookmarks} revision={revision} review={review} syncMessage={syncMessage} userId={userId} attemptIds={attemptIds} sm2States={sm2States} reviewCounts={reviewCounts} />;
  }

  return (
    <div className="practice-layout">
      <div className="question-top">
        <div>
          <div className="eyebrow">Practice session</div>
          <h1 style={{ margin: 0, fontSize: 24 }}>Question {idx + 1} of {items.length}</h1>
        </div>
        <div className="q-meta">
          {timerMinutes > 0 && (
            <span
              className="pill"
              style={{
                color: seconds < 300 ? 'var(--danger)' : undefined,
                borderColor: seconds < 300 ? 'var(--danger)' : undefined,
                fontWeight: seconds < 300 ? 700 : undefined,
              }}
            >
              <Clock3 size={13} /> {formatTime(seconds)}
            </span>
          )}
          <span className="pill">{order === 'random' ? 'Random' : 'Sequential'}</span>
          {userId && <span className="pill">{syncing ? 'Saving…' : 'Synced'}</span>}
        </div>
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: -8, marginBottom: 10 }}>Keyboard: 1-9 to select an option · Enter to submit/next · ← → to navigate · R review · B save · V revise</div>

      {syncMessage && <div className="card" style={{ padding: 12, marginBottom: 14 }}><span className="muted">{syncMessage}</span>{!userId && <Link href="/login" className="btn btn-soft" style={{ marginLeft: 10 }}>Login</Link>}</div>}

      <div className="two-col grid">
        <div>
          <QuestionRenderer
            q={q}
            selected={answer}
            onSelect={v => setAnswers(a => ({ ...a, [q.id]: v }))}
            submitted={isSubmitted}
            showFeedback={feedback === 'immediate' && isSubmitted}
          />

          {isSubmitted && feedback === 'immediate' && (
            <div className="card" style={{ padding: 18, marginTop: 14, borderLeft: correct === true ? '3px solid var(--success)' : correct === false ? '3px solid var(--danger)' : '3px solid var(--accent)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <b className={correct === true ? 'success' : correct === false ? 'danger' : ''} style={{ fontSize: 16 }}>
                      {correct === true ? '✓ Correct' : correct === false ? '✗ Incorrect' : 'Answer recorded'}
                    </b>
                    {pointsAwarded[q.id] > 0 && <span className="pill" style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}>+{pointsAwarded[q.id]} pts</span>}
                  </div>
                  {q.answer && (
                    <div className="muted" style={{ marginTop: 6, fontSize: 13.5 }}>
                      <b>Correct answer:</b> {q.answer}
                      {q.answer.trim().toUpperCase() === 'ALL' && (
                        <span style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
                          (Marks awarded to all candidates — GATE declared this question ambiguous, having multiple correct options, or containing errors)
                        </span>
                      )}
                    </div>
                  )}
                  {q.type === 'descriptive' && <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>Descriptive questions have no stored answer key, so they're marked correct automatically on submit. Use GateOverflow to check your working.</div>}
                </div>
                {isValidGateOverflowUrl(q.gateOverflowUrl) && (
                  <a className="btn btn-soft" href={q.gateOverflowUrl!} target="_blank" rel="noreferrer" style={{ gap: 6, fontSize: 13 }}>
                    Open GateOverflow <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          )}

          {isSubmitted && feedback === 'end' && (
            <div className="card" style={{ padding: 16, marginTop: 14, background: 'var(--surface2)', borderLeft: '3px solid var(--accent)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="pill" style={{ background: 'var(--answered-bg)', color: 'var(--success)', fontWeight: 700 }}>✓ Answer Saved</span>
                <span className="muted" style={{ fontSize: 13 }}>End-of-test mode active: your response has been saved. Full scoring, explanations, and answer keys will appear in your final review.</span>
              </div>
            </div>
          )}

          <div className="practice-bottom">
            <button className="btn btn-soft" onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}><ChevronLeft />Previous</button>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button className="btn" style={{ background: review[q.id] ? 'var(--review-bg)' : 'var(--surface2)' }} onClick={() => setReview(r => ({ ...r, [q.id]: !r[q.id] }))}><Flag size={16} />{review[q.id] ? 'Marked' : 'Review'}</button>
              <button className="btn" style={{ background: bookmarks[q.id] ? 'var(--btn-soft-bg)' : 'var(--surface2)', color: bookmarks[q.id] ? 'var(--btn-soft-text)' : 'var(--text)' }} onClick={() => void toggleFlag('bookmark')}><Bookmark size={16} />{bookmarks[q.id] ? 'Saved' : 'Save'}</button>
              <button className="btn" style={{ background: revision[q.id] ? 'var(--answered-bg)' : 'var(--surface2)' }} onClick={() => void toggleFlag('revision')}><RotateCcw size={16} />{revision[q.id] ? 'Revision' : 'Revise'}</button>
              {feedback === 'immediate' && !isSubmitted && <button className="btn btn-primary" onClick={() => void submitAnswer()}>Submit</button>}
              {idx < items.length - 1 ? (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    if (answers[q.id]?.length && !submitted[q.id]) {
                      void submitAnswer();
                    }
                    setIdx(idx + 1);
                  }}
                >
                  Next<ChevronRight />
                </button>
              ) : (
                <button className="btn btn-primary" onClick={() => void finish()}>Finish</button>
              )}
            </div>
          </div>
        </div>

        <div className="card palette">
          <div className="section-head">
            <h3>Question palette</h3>
            <span className="pill">{items.filter(x => submitted[x.id] || (answers[x.id] && answers[x.id].length > 0)).length} answered</span>
          </div>
          <div className="palette-grid">
            {items.map((x, i) => {
              const isAnswered = submitted[x.id] || (answers[x.id] && answers[x.id].length > 0);
              return (
                <button
                  key={x.id}
                  className={(i === idx ? 'current ' : '') + (isAnswered ? 'answered ' : '') + (review[x.id] ? 'review' : '')}
                  onClick={() => setIdx(i)}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 18, display: 'grid', gap: 8, fontSize: 12, color: 'var(--muted)' }}><span>🟢 Answered</span><span>🟡 Marked for review</span><span>⬜ Unanswered</span></div>
          <button className="btn btn-primary" style={{ marginTop: 18, width: '100%', justifyContent: 'center' }} onClick={() => void finish()}><RefreshCw size={15} /> End session</button>
        </div>
      </div>
    </div>
  );
}

function evaluateAnswer(q: Question, answer: string[]): boolean | null {
  // Descriptive questions have no stored answer key. If attempted, they evaluate as true (recorded).
  if (q.type === 'descriptive') return (answer && answer.length > 0) ? true : null;
  if (!q.answer) return null;
  if (!answer.length) return false;
  // "ALL" is a special sentinel (not a real option/value) for GATE questions
  // that were officially declared wrong/out-of-syllabus, where the exam
  // authority awarded marks to every candidate regardless of what they
  // chose. Once the candidate submits any answer, mark it correct.
  if (q.answer.trim().toUpperCase() === 'ALL') return true;
  if (q.type === 'nat') {
    return isNatAnswerCorrect(q.answer, answer[0]);
  }
  const expected = q.answer.split(/[{},;\s]+/).map(x => x.trim().toUpperCase()).filter(Boolean).sort();
  const actual = answer.map(x => x.trim().toUpperCase()).filter(Boolean).sort();
  return expected.length === actual.length && expected.every((value, i) => value === actual[i]);
}

// Confidence isn't asked separately anymore — grading a question into the
// SM-2 scheduler right after the session *is* the self-report. This maps
// each grade onto the same 3-value confidence scale Statistics reads.
const GRADE_TO_CONFIDENCE: Record<Grade, 'knew' | 'guessed' | 'unknown'> = {
  again: 'unknown',
  hard: 'guessed',
  good: 'knew',
  easy: 'knew',
};

function PracticeResults({ items, answers, submitted, elapsed, bookmarks, revision, review, syncMessage, userId, attemptIds, sm2States, reviewCounts }: { items: Question[]; answers: Record<string, string[]>; submitted: Record<string, boolean>; elapsed: number; bookmarks: Record<string, boolean>; revision: Record<string, boolean>; review: Record<string, boolean>; syncMessage: string; userId: string | null; attemptIds: Record<string, number>; sm2States: Record<string, Sm2State>; reviewCounts: Record<string, number> }) {
  const isQuestionAnswered = (q: Question) => !!submitted[q.id] && (answers[q.id] || []).length > 0;
  const attempted = items.filter(isQuestionAnswered).length;
  const scored = items.filter(q => isQuestionAnswered(q) && evaluateAnswer(q, answers[q.id] || []) === true).length;
  // Descriptive questions are evaluable when attempted
  const evaluableAttempted = items.filter(q => isQuestionAnswered(q) && (q.type === 'descriptive' || q.answer)).length;
  const evaluable = items.filter(q => q.type === 'descriptive' || q.answer).length;
  const unanswered = items.length - attempted;
  const average = items.length ? Math.round(elapsed / items.length) : 0;
  const accuracy = evaluableAttempted ? Math.round(scored / evaluableAttempted * 100) : 0;

  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [filter, setFilter] = useState<'all' | 'incorrect' | 'correct' | 'unanswered' | 'review'>('all');
  const [localBookmarks, setLocalBookmarks] = useState<Record<string, boolean>>(bookmarks);
  const [localRevision, setLocalRevision] = useState<Record<string, boolean>>(revision);

  const [graded, setGraded] = useState<Record<string, { grade: Grade; nextReviewAt: string }>>({});
  const [gradeMessage, setGradeMessage] = useState('');
  const [expandedSolution, setExpandedSolution] = useState<Record<string, boolean>>({});
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resultsRef.current) void typesetMath([resultsRef.current]);
  }, [expandedSolution, viewMode, filter]);

  async function toggleReviewFlag(questionId: string, kind: 'bookmark' | 'revision') {
    const priorRevision = !!localRevision[questionId];
    const nextBookmark = kind === 'bookmark' ? !localBookmarks[questionId] : !!localBookmarks[questionId];
    const nextRevision = kind === 'revision' ? !localRevision[questionId] : !!localRevision[questionId];
    if (kind === 'bookmark') setLocalBookmarks(s => ({ ...s, [questionId]: nextBookmark }));
    else setLocalRevision(s => ({ ...s, [questionId]: nextRevision }));
    if (userId) {
      try { await setQuestionFlags(userId, questionId, nextBookmark, nextRevision, priorRevision); }
      catch (error) { console.error(error); }
    }
  }

  async function gradeQuestion(questionId: string, grade: Grade) {
    if (!userId) { setGradeMessage('Sign in to save these to your revision schedule.'); return; }
    const currentState = sm2States[questionId] ?? DEFAULT_SM2_STATE;
    const currentReviewCount = reviewCounts[questionId] ?? 0;
    try {
      const result = await scheduleRevisionFromGrade(userId, questionId, currentState, grade, currentReviewCount);
      const attemptId = attemptIds[questionId];
      if (attemptId != null) {
        // Best-effort: the SM-2 schedule is the primary outcome of grading;
        // don't fail the whole action if only the confidence backfill errors.
        try { await updateAttemptConfidence(userId, attemptId, GRADE_TO_CONFIDENCE[grade]); }
        catch (error) { console.error(error); }
      }
      if (result) setGraded(g => ({ ...g, [questionId]: { grade, nextReviewAt: result.nextReviewAt.toISOString() } }));
    } catch (error) {
      console.error(error);
      setGradeMessage('Could not save that to your revision schedule — check your connection and try again.');
    }
  }

  const attemptedItems = items.filter(isQuestionAnswered);
  const incorrectCount = items.filter(q => isQuestionAnswered(q) && q.type !== 'descriptive' && evaluateAnswer(q, answers[q.id] || []) === false).length;
  const reviewCount = items.filter(q => review[q.id]).length;

  const displayedItems = items
    .map((q, idx) => ({ q, originalIndex: idx + 1 }))
    .filter(({ q }) => {
      const isAns = isQuestionAnswered(q);
      if (filter === 'incorrect') return isAns && q.type !== 'descriptive' && evaluateAnswer(q, answers[q.id] || []) === false;
      if (filter === 'correct') return isAns && evaluateAnswer(q, answers[q.id] || []) === true;
      if (filter === 'unanswered') return !isAns;
      if (filter === 'review') return !!review[q.id];
      return true;
    });

  return (
    <div className="setup">
      <div className="page-title">
        <div>
          <div className="eyebrow">Session complete</div>
          <h1>Practice results</h1>
          <p>Review your responses and use GateOverflow where a full explanation is not embedded in the dataset.</p>
        </div>
        <Link className="btn btn-primary" href="/practice">Practice again</Link>
      </div>

      {syncMessage && <div className="card" style={{ padding: 12, marginBottom: 14 }}><span className="muted">{syncMessage}</span></div>}
      <div className="grid result-grid">
        <Stat label="Questions" value={items.length} />
        <Stat label="Attempted" value={attempted} />
        <Stat label="Unanswered" value={unanswered} />
        <Stat label="Correct" value={scored} />
        <Stat label="Accuracy" value={`${accuracy}%`} />
        <Stat label="Time" value={formatDuration(elapsed)} />
        <Stat label="Avg / question" value={formatDuration(average)} />
        <Stat label="Evaluable" value={evaluable} />
      </div>

      {attemptedItems.length > 0 && (
        <div className="card section" style={{ marginTop: 18 }}>
          <div className="section-head"><h3>Schedule for revision</h3><span className="pill">SM-2</span></div>
          <p className="muted" style={{ marginTop: -4, marginBottom: 12 }}>Grade how well you knew each question — this schedules it into your spaced-repetition queue (and continues its existing schedule if it's already there, rather than resetting it). Earns {REVIEW_POINTS} points per review.</p>
          {gradeMessage && <div className="muted" style={{ marginBottom: 10, fontSize: 13 }}>{gradeMessage}</div>}
          <div className="table-like">
            {attemptedItems.map((q, i) => (
              <div className="table-row" key={q.id} style={{ gridTemplateColumns: '1.6fr 1fr' }}>
                <span><b>{i + 1}. {q.title}</b><div className="muted">{q.subject} · {q.topic}</div></span>
                <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {graded[q.id] ? (
                    <span className="pill">{GRADE_LABELS[graded[q.id].grade]} · next {formatShortDate(new Date(graded[q.id].nextReviewAt))}</span>
                  ) : (
                    (['again', 'hard', 'good', 'easy'] as Grade[]).map(g => (
                      <button key={g} className="btn btn-soft" onClick={() => void gradeQuestion(q.id, g)}>{GRADE_LABELS[g]}</button>
                    ))
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Header Card */}
      <div className="card section" style={{ marginTop: 18 }} ref={resultsRef}>
        <div className="section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>Question Review</h3>
            <p className="muted" style={{ margin: '4px 0 0 0', fontSize: 13 }}>
              Detailed breakdown of each question with your selected options vs official answer keys.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              type="button"
              className={viewMode === 'cards' ? 'btn btn-primary' : 'btn btn-soft'}
              style={{ fontSize: 12, padding: '5px 12px' }}
              onClick={() => setViewMode('cards')}
            >
              Detailed Cards
            </button>
            <button
              type="button"
              className={viewMode === 'table' ? 'btn btn-primary' : 'btn btn-soft'}
              style={{ fontSize: 12, padding: '5px 12px' }}
              onClick={() => setViewMode('table')}
            >
              Summary Table
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className={filter === 'all' ? 'btn btn-primary' : 'btn btn-soft'}
            style={{ fontSize: 12, padding: '4px 10px' }}
            onClick={() => setFilter('all')}
          >
            All ({items.length})
          </button>
          {incorrectCount > 0 && (
            <button
              type="button"
              className={filter === 'incorrect' ? 'btn btn-primary' : 'btn btn-soft'}
              style={{
                fontSize: 12,
                padding: '4px 10px',
                color: filter === 'incorrect' ? undefined : 'var(--danger)',
              }}
              onClick={() => setFilter('incorrect')}
            >
              Incorrect ({incorrectCount})
            </button>
          )}
          {scored > 0 && (
            <button
              type="button"
              className={filter === 'correct' ? 'btn btn-primary' : 'btn btn-soft'}
              style={{
                fontSize: 12,
                padding: '4px 10px',
                color: filter === 'correct' ? undefined : 'var(--success)',
              }}
              onClick={() => setFilter('correct')}
            >
              Correct ({scored})
            </button>
          )}
          {unanswered > 0 && (
            <button
              type="button"
              className={filter === 'unanswered' ? 'btn btn-primary' : 'btn btn-soft'}
              style={{ fontSize: 12, padding: '4px 10px' }}
              onClick={() => setFilter('unanswered')}
            >
              Unanswered ({unanswered})
            </button>
          )}
          {reviewCount > 0 && (
            <button
              type="button"
              className={filter === 'review' ? 'btn btn-primary' : 'btn btn-soft'}
              style={{ fontSize: 12, padding: '4px 10px' }}
              onClick={() => setFilter('review')}
            >
              Marked for Review ({reviewCount})
            </button>
          )}
        </div>
      </div>

      {/* Detailed Cards View (Default) */}
      {viewMode === 'cards' && (
        <div style={{ marginTop: 16 }}>
          {displayedItems.length === 0 ? (
            <div className="card section muted" style={{ textAlign: 'center', padding: 28 }}>
              No questions match the selected filter.
            </div>
          ) : (
            displayedItems.map(({ q, originalIndex }) => (
              <PracticeReviewCard
                key={q.id}
                q={q}
                index={originalIndex}
                userAnswer={answers[q.id] || []}
                isSubmitted={!!submitted[q.id]}
                isBookmarked={!!localBookmarks[q.id]}
                isRevision={!!localRevision[q.id]}
                isMarkedReview={!!review[q.id]}
                onToggleBookmark={() => void toggleReviewFlag(q.id, 'bookmark')}
                onToggleRevision={() => void toggleReviewFlag(q.id, 'revision')}
                onGrade={grade => void gradeQuestion(q.id, grade)}
                gradedState={graded[q.id]}
                isGradingAvailable={!!userId}
              />
            ))
          )}
        </div>
      )}

      {/* Summary Table View */}
      {viewMode === 'table' && (
        <div className="card section" style={{ marginTop: 16 }}>
          <div className="table-like" style={{ overflowX: 'auto' }}>
            <div className="table-row header" style={{ gridTemplateColumns: 'minmax(200px, 1.4fr) 75px 95px 65px minmax(140px, .9fr)', minWidth: 620 }}>
              <span>Question</span>
              <span>Type</span>
              <span>Result</span>
              <span>Saved</span>
              <span>Source / Solution</span>
            </div>
            {displayedItems.length === 0 ? (
              <div style={{ padding: 18, textAlign: 'center' }} className="muted">
                No questions match the selected filter.
              </div>
            ) : (
              displayedItems.map(({ q, originalIndex }) => {
                const isAns = isQuestionAnswered(q);
                const result = !isAns
                  ? 'Unanswered'
                  : q.type === 'descriptive'
                  ? 'Attempted'
                  : evaluateAnswer(q, answers[q.id] || []) === true
                  ? 'Correct'
                  : evaluateAnswer(q, answers[q.id] || []) === false
                  ? 'Incorrect'
                  : 'Recorded';
                return (
                  <div key={q.id}>
                    <div className="table-row" style={{ gridTemplateColumns: 'minmax(200px, 1.4fr) 75px 95px 65px minmax(140px, .9fr)', minWidth: 620 }}>
                      <span>
                        <b>{originalIndex}. {q.title}</b>
                        <div className="muted">{q.subject} · {q.topic}{review[q.id] ? ' · Marked for review' : ''}{localRevision[q.id] || graded[q.id] ? ' · Revision' : ''}</div>
                      </span>
                      <span>{q.type.toUpperCase()}</span>
                      <span className={result === 'Correct' ? 'success' : result === 'Incorrect' ? 'danger' : ''}>{result}</span>
                      <span>{localBookmarks[q.id] ? '⭐' : '—'}</span>
                      <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        {q.solution && (
                          <button className="btn btn-soft" onClick={() => setExpandedSolution(s => ({ ...s, [q.id]: !s[q.id] }))} style={{ fontSize: 12, padding: '4px 8px' }}>
                            {expandedSolution[q.id] ? 'Hide Solution' : 'View Solution'}
                          </button>
                        )}
                        {isValidGateOverflowUrl(q.gateOverflowUrl) && (
                          <a href={q.gateOverflowUrl!} target="_blank" rel="noreferrer" className="btn btn-soft" style={{ fontSize: 12, padding: '4px 8px' }}>
                            <ExternalLink size={13} /> GateOverflow
                          </a>
                        )}
                      </span>
                    </div>
                    {expandedSolution[q.id] && q.solution && (
                      <div style={{ padding: '12px 16px', background: 'var(--surface2)', borderLeft: '3px solid var(--accent)', margin: '8px 0 16px 0', borderRadius: 6 }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>Solution &amp; Explanation</div>
                        <div className="solution-body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.solution) }} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) { return <div className="card stat"><div className="label">{label}</div><div className="result-number">{value}</div></div>; }
function formatDuration(totalSeconds: number) { const minutes = Math.floor(totalSeconds / 60); const seconds = totalSeconds % 60; return minutes ? `${minutes}m ${String(seconds).padStart(2, '0')}s` : `${seconds}s`; }
