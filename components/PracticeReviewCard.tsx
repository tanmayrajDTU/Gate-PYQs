'use client';

import { useEffect, useRef, useState } from 'react';
import { Bookmark, CheckCircle2, ExternalLink, RotateCcw, XCircle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { Question } from '../lib/types';
import { sanitizeHtml } from '../lib/sanitizeHtml';
import { typesetMath } from '../lib/mathjax';
import { attachImageFallback } from '../lib/imageFallback';
import { isNatAnswerCorrect } from '../lib/natAnswer';
import { GRADE_LABELS, type Grade, type Sm2State } from '../lib/spacedRepetition';
import { formatShortDate } from '../lib/format';
import { isValidGateOverflowUrl } from '../lib/url';

interface PracticeReviewCardProps {
  q: Question;
  index: number;
  userAnswer: string[];
  isSubmitted: boolean;
  isBookmarked: boolean;
  isRevision: boolean;
  isMarkedReview: boolean;
  onToggleBookmark: () => void;
  onToggleRevision: () => void;
  onGrade?: (grade: Grade) => void;
  gradedState?: { grade: Grade; nextReviewAt: string };
  isGradingAvailable?: boolean;
}

export function PracticeReviewCard({
  q,
  index,
  userAnswer,
  isSubmitted,
  isBookmarked,
  isRevision,
  isMarkedReview,
  onToggleBookmark,
  onToggleRevision,
  onGrade,
  gradedState,
  isGradingAvailable,
}: PracticeReviewCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [showSolution, setShowSolution] = useState(true);

  useEffect(() => {
    if (cardRef.current) void typesetMath([cardRef.current]);
    attachImageFallback(cardRef.current, q.gateOverflowUrl);
  }, [q.id, showSolution]);

  // Evaluate correctness
  const markedToAll = q.type !== 'descriptive' && (q.answer || '').trim().toUpperCase() === 'ALL';

  const correctLabels = new Set(
    markedToAll
      ? []
      : (q.answer || '')
          .split(/[{},;\s]+/)
          .map(x => x.trim().toUpperCase())
          .filter(Boolean)
  );

  let isCorrect: boolean | null = null;
  if (q.type === 'descriptive') {
    isCorrect = isSubmitted && userAnswer.length > 0 ? true : null;
  } else if (!isSubmitted || !userAnswer.length) {
    isCorrect = null; // Unanswered
  } else if (markedToAll) {
    isCorrect = true;
  } else if (q.type === 'nat') {
    isCorrect = isNatAnswerCorrect(q.answer, userAnswer[0]);
  } else {
    const expected = Array.from(correctLabels).sort();
    const actual = userAnswer.map(x => x.trim().toUpperCase()).filter(Boolean).sort();
    isCorrect = expected.length === actual.length && expected.every((val, i) => val === actual[i]);
  }

  const isNatCorrect = isSubmitted && q.type === 'nat' && userAnswer.length > 0 ? isCorrect : null;

  return (
    <div className="question-card card" style={{ marginBottom: 18 }} ref={cardRef}>
      {/* Header bar */}
      <div className="q-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="pill" style={{ fontWeight: 700 }}>#{index}</span>
          <span className="pill">{q.type.toUpperCase()}</span>
          {q.year && <span className="pill">{q.exam} {q.year}</span>}
          <span className="q-title">{q.number} · {q.subject} · {q.topic}</span>
          {isMarkedReview && <span className="pill" style={{ background: 'var(--review-bg)' }}>🚩 Marked for review</span>}
        </div>

        {/* Outcome Badge */}
        <div>
          {!isSubmitted || userAnswer.length === 0 ? (
            <span className="pill" style={{ background: 'var(--surface2)', color: 'var(--muted)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <HelpCircle size={14} /> Unanswered
            </span>
          ) : q.type === 'descriptive' ? (
            <span className="pill" style={{ background: 'var(--answered-bg)', color: 'var(--success)', border: '1px solid var(--answered-border)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <CheckCircle2 size={14} /> Attempted (Recorded)
            </span>
          ) : isCorrect === true ? (
            <span className="pill" style={{ background: 'var(--answered-bg)', color: 'var(--success)', border: '1px solid var(--answered-border)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <CheckCircle2 size={14} /> Correct
            </span>
          ) : isCorrect === false ? (
            <span className="pill" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <XCircle size={14} /> Incorrect
            </span>
          ) : (
            <span className="pill" style={{ background: 'var(--surface2)', fontWeight: 600 }}>Recorded</span>
          )}
        </div>
      </div>

      {/* Question Body */}
      <div className="q-body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.bodyHtml) }} />

      {/* Options for MCQ / MSQ */}
      {q.options.length > 0 && (q.type === 'mcq' || q.type === 'msq') && (
        <div className="options" style={{ marginTop: 16 }}>
          {q.options.map(o => {
            const isUserSelected = userAnswer.includes(o.label);
            const isOfficialCorrect = markedToAll || correctLabels.has(o.label.trim().toUpperCase());
            const isWrongChoice = isUserSelected && !isOfficialCorrect && !markedToAll;

            let optClass = 'option';
            if (isOfficialCorrect) optClass += ' correct-answer';
            else if (isWrongChoice) optClass += ' wrong-answer';
            else if (isUserSelected) optClass += ' selected';

            return (
              <div
                key={o.label}
                className={optClass}
                style={{
                  cursor: 'default',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flex: 1 }}>
                  <span className="option-letter" style={{ fontWeight: 700 }}>{o.label}</span>
                  <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(o.html) }} />
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginLeft: 12 }}>
                  {isUserSelected && (
                    <span
                      className="pill"
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        background: isOfficialCorrect ? 'var(--answered-bg)' : 'var(--danger-soft)',
                        color: isOfficialCorrect ? 'var(--success)' : 'var(--danger)',
                        border: `1px solid ${isOfficialCorrect ? 'var(--answered-border)' : 'var(--danger)'}`,
                        fontWeight: 700,
                      }}
                    >
                      {isOfficialCorrect ? '✓ Your Answer' : '✗ Your Answer'}
                    </span>
                  )}
                  {isOfficialCorrect && !isUserSelected && (
                    <span
                      className="pill"
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        background: 'var(--answered-bg)',
                        color: 'var(--success)',
                        border: '1px solid var(--answered-border)',
                        fontWeight: 700,
                      }}
                    >
                      ✓ Correct Answer
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* NAT Response Comparison */}
      {q.type === 'nat' && (
        <div className="card" style={{ marginTop: 18, padding: 14, background: 'var(--surface2)', borderLeft: isCorrect === true ? '3px solid var(--success)' : isCorrect === false ? '3px solid var(--danger)' : '3px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>Numerical Answer Comparison</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>Your input: </span>
                  <b style={{ color: isNatCorrect === true ? 'var(--success)' : isNatCorrect === false ? 'var(--danger)' : 'var(--text)' }}>
                    {userAnswer[0] ? userAnswer[0] : 'None (Unanswered)'}
                  </b>
                </div>
                <div>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>Official range / value: </span>
                  <b style={{ color: 'var(--text)' }}>{q.answer || '—'}</b>
                </div>
              </div>
            </div>
            <div>
              {isNatCorrect === true ? (
                <span className="pill" style={{ background: 'var(--answered-bg)', color: 'var(--success)', fontWeight: 700 }}>✓ Within acceptable range</span>
              ) : isNatCorrect === false ? (
                <span className="pill" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', fontWeight: 700 }}>✗ Outside official key</span>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Descriptive question note */}
      {q.type === 'descriptive' && (
        <div
          className="card"
          style={{
            marginTop: 18,
            padding: 16,
            background: 'var(--surface2)',
            borderLeft: userAnswer.length > 0 ? '3px solid var(--success)' : '3px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <b style={{ fontSize: 14 }}>Descriptive Question Review</b>
            <span
              className="pill"
              style={{
                background: userAnswer.length > 0 ? 'var(--answered-bg)' : 'var(--surface2)',
                color: userAnswer.length > 0 ? 'var(--success)' : 'var(--muted)',
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              {userAnswer.length > 0 ? '✓ Attempted on paper' : '○ Not Attempted'}
            </span>
          </div>

          {userAnswer.length > 0 && userAnswer[0] && userAnswer[0] !== 'attempted' && (
            <div style={{ marginTop: 12, padding: 12, background: 'var(--surface)', borderRadius: 6, fontSize: 13 }}>
              <span className="muted" style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Your working notes / response:</span>
              <div style={{ whiteSpace: 'pre-wrap' }}>{userAnswer[0]}</div>
            </div>
          )}

          <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
            Descriptive questions do not have an automated numerical or multiple-choice key. Use the GateOverflow discussion below to verify your solution and mathematical working.
          </div>
        </div>
      )}

      {/* Ambiguous sentinel notice */}
      {markedToAll && (
        <div className="notice" style={{ marginTop: 14, fontSize: 13 }}>
          Marks awarded to all candidates — GATE declared this question ambiguous, having multiple valid options, or containing printing/drafting errors.
        </div>
      )}

      {/* Solution & Explanation */}
      {q.solution && (
        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            className="btn btn-soft"
            style={{ fontSize: 12, padding: '4px 10px', gap: 5, marginBottom: 8 }}
            onClick={() => setShowSolution(s => !s)}
          >
            {showSolution ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showSolution ? 'Hide Solution & Explanation' : 'Show Solution & Explanation'}
          </button>
          {showSolution && (
            <div className="card" style={{ padding: 16, background: 'var(--surface2)', borderLeft: '3px solid var(--accent)' }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>Solution &amp; Explanation</div>
              <div className="solution-body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.solution) }} />
            </div>
          )}
        </div>
      )}

      {/* Action Footer: GateOverflow, Bookmark, Revise, and SM-2 Self-Grading */}
      <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {isValidGateOverflowUrl(q.gateOverflowUrl) && (
            <a
              className="btn btn-soft"
              href={q.gateOverflowUrl}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 12, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              Open GateOverflow <ExternalLink size={14} />
            </a>
          )}
          <button
            type="button"
            className="btn"
            style={{
              fontSize: 12,
              padding: '6px 12px',
              background: isBookmarked ? 'var(--btn-soft-bg)' : 'var(--surface2)',
              color: isBookmarked ? 'var(--btn-soft-text)' : 'var(--text)',
            }}
            onClick={onToggleBookmark}
          >
            <Bookmark size={14} /> {isBookmarked ? 'Saved' : 'Save'}
          </button>
          <button
            type="button"
            className="btn"
            style={{
              fontSize: 12,
              padding: '6px 12px',
              background: isRevision ? 'var(--answered-bg)' : 'var(--surface2)',
            }}
            onClick={onToggleRevision}
          >
            <RotateCcw size={14} /> {isRevision ? 'In Revision' : 'Revise'}
          </button>
        </div>

        {/* Inline SM-2 Grading */}
        {isGradingAvailable && onGrade && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {gradedState ? (
              <span className="pill" style={{ fontSize: 12 }}>
                Graded: {GRADE_LABELS[gradedState.grade]} · Next {formatShortDate(new Date(gradedState.nextReviewAt))}
              </span>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="muted" style={{ fontSize: 12 }}>Rate recall:</span>
                {(['again', 'hard', 'good', 'easy'] as Grade[]).map(g => (
                  <button
                    key={g}
                    type="button"
                    className="btn btn-soft"
                    style={{ fontSize: 11, padding: '3px 8px' }}
                    onClick={() => onGrade(g)}
                  >
                    {GRADE_LABELS[g]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
