'use client';

import { useEffect, useRef } from 'react';
import type { Question } from '../lib/types';
import { sanitizeHtml } from '../lib/sanitizeHtml';
import { typesetMath } from '../lib/mathjax';
import { attachImageFallback } from '../lib/imageFallback';
import { isNatAnswerCorrect } from '../lib/natAnswer';

export function QuestionRenderer({
  q,
  selected,
  onSelect,
  submitted,
  showFeedback = submitted,
}: {
  q: Question;
  selected: string[];
  onSelect: (v: string[]) => void;
  submitted: boolean;
  showFeedback?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) void typesetMath([cardRef.current]);
    attachImageFallback(cardRef.current, q.gateOverflowUrl);
  }, [q.id, submitted, showFeedback]);

  const toggle = (label: string) => {
    if (q.type === 'mcq') onSelect([label]);
    else if (q.type === 'msq') onSelect(selected.includes(label) ? selected.filter(x => x !== label) : [...selected, label]);
  };

  const markedToAll = q.type !== 'descriptive' && (q.answer || '').trim().toUpperCase() === 'ALL';

  const correctLabels = new Set(
    markedToAll
      ? []
      : (q.answer || '')
          .split(/[{},;\s]+/)
          .map(x => x.trim().toUpperCase())
          .filter(Boolean)
  );

  const isNatCorrect = showFeedback && q.type === 'nat' ? isNatAnswerCorrect(q.answer, selected[0]) : null;

  return (
    <div className="question-card card" ref={cardRef}>
      <div className="q-meta">
        <span className="pill">{q.type.toUpperCase()}</span>
        {q.year && <span className="pill">{q.exam} {q.year}</span>}
        <span className="q-title">{q.number} · {q.subject} · {q.topic}</span>
      </div>
      <div className="q-body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.bodyHtml) }} />

      {q.options.length > 0 && (q.type === 'mcq' || q.type === 'msq') && (
        <div className="options">
          {q.options.map(o => {
            const isSelected = selected.includes(o.label);
            const isCorrectOption = showFeedback && (markedToAll || correctLabels.has(o.label.trim().toUpperCase()));
            const isWrongSelected = showFeedback && isSelected && !isCorrectOption && !markedToAll;

            let optClass = 'option';
            if (isCorrectOption) optClass += ' correct-answer';
            else if (isWrongSelected) optClass += ' wrong-answer';
            else if (isSelected) optClass += ' selected';

            return (
              <label key={o.label} className={optClass} style={{ cursor: showFeedback ? 'default' : 'pointer' }}>
                <input
                  type={q.type === 'msq' ? 'checkbox' : 'radio'}
                  checked={isSelected}
                  onChange={() => toggle(o.label)}
                  disabled={showFeedback}
                />
                <span>
                  <span className="option-letter">{o.label}</span>
                  <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(o.html) }} />
                </span>
              </label>
            );
          })}
        </div>
      )}

      {q.type === 'nat' && (
        <div className="field" style={{ marginTop: 22 }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <span>Your numerical answer</span>
            {showFeedback && (
              <span
                className="pill"
                style={{
                  fontWeight: 700,
                  fontSize: 12,
                  background: isNatCorrect ? 'var(--answered-bg)' : 'var(--danger-soft)',
                  color: isNatCorrect ? 'var(--success)' : 'var(--danger)',
                  border: `1px solid ${isNatCorrect ? 'var(--answered-border)' : 'var(--danger)'}`,
                }}
              >
                {isNatCorrect ? '✓ Correct' : `✗ Incorrect (Official Key: ${q.answer ?? '—'})`}
              </span>
            )}
          </label>
          <input
            value={selected[0] || ''}
            onChange={e => onSelect([e.target.value])}
            disabled={showFeedback}
            inputMode="decimal"
            placeholder="Enter a number"
            style={{
              borderColor: showFeedback ? (isNatCorrect ? 'var(--success)' : 'var(--danger)') : undefined,
              background: showFeedback ? (isNatCorrect ? 'var(--answered-bg)' : 'var(--danger-soft)') : undefined,
            }}
          />
        </div>
      )}

      {q.type === 'descriptive' && (
        <div
          className="card"
          style={{
            padding: 18,
            marginTop: 22,
            background: 'var(--surface2)',
            border: selected.length > 0 ? '1px solid var(--success)' : undefined,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <b style={{ fontSize: 15 }}>Descriptive Question</b>
              <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
                Solve on paper or note your working. Mark as attempted to record your progress.
              </div>
            </div>
            <button
              type="button"
              className={selected.length > 0 ? 'btn' : 'btn btn-soft'}
              style={{
                background: selected.length > 0 ? 'var(--answered-bg)' : undefined,
                color: selected.length > 0 ? 'var(--success)' : undefined,
                border: selected.length > 0 ? '1px solid var(--answered-border)' : undefined,
                fontWeight: 700,
                fontSize: 13,
                padding: '8px 16px',
              }}
              onClick={() => {
                if (selected.length > 0) onSelect([]);
                else onSelect(['attempted']);
              }}
              disabled={showFeedback}
            >
              {selected.length > 0 ? '✓ Attempted on paper' : 'Mark as Attempted'}
            </button>
          </div>

          <div style={{ marginTop: 14 }}>
            <textarea
              value={selected[0] === 'attempted' ? '' : selected[0] || ''}
              onChange={e => {
                const val = e.target.value;
                onSelect(val.trim() ? [val] : ['attempted']);
              }}
              disabled={showFeedback}
              placeholder="Optional rough notes or final answer (e.g. key formula, final derived value)..."
              rows={2}
              style={{
                width: '100%',
                fontSize: 13,
                resize: 'vertical',
                borderColor: selected.length > 0 ? 'var(--success)' : undefined,
              }}
            />
          </div>
        </div>
      )}

      {showFeedback && q.solution && (
        <div className="card" style={{ marginTop: 22, padding: 16, background: 'var(--surface2)', borderLeft: '3px solid var(--accent)' }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>Solution &amp; Explanation</div>
          <div className="solution-body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.solution) }} />
        </div>
      )}
    </div>
  );
}
