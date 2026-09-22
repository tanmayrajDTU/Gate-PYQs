'use client';

import { useEffect, useRef } from 'react';
import type { Question } from '../lib/types';
import { sanitizeHtml } from '../lib/sanitizeHtml';
import { typesetMath } from '../lib/mathjax';
import { attachImageFallback } from '../lib/imageFallback';
import { isNatAnswerCorrect } from '../lib/natAnswer';

export function QuestionRenderer({ q, selected, onSelect, submitted }: { q: Question; selected: string[]; onSelect: (v: string[]) => void; submitted: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) void typesetMath([cardRef.current]);
    attachImageFallback(cardRef.current, q.gateOverflowUrl);
  }, [q.id, submitted]);

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

  const isNatCorrect = submitted && q.type === 'nat' ? isNatAnswerCorrect(q.answer, selected[0]) : null;

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
            const isCorrectOption = submitted && (markedToAll || correctLabels.has(o.label.trim().toUpperCase()));
            const isWrongSelected = submitted && isSelected && !isCorrectOption && !markedToAll;

            let optClass = 'option';
            if (isCorrectOption) optClass += ' correct-answer';
            else if (isWrongSelected) optClass += ' wrong-answer';
            else if (isSelected) optClass += ' selected';

            return (
              <label key={o.label} className={optClass} style={{ cursor: submitted ? 'default' : 'pointer' }}>
                <input
                  type={q.type === 'msq' ? 'checkbox' : 'radio'}
                  checked={isSelected}
                  onChange={() => toggle(o.label)}
                  disabled={submitted}
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
            {submitted && (
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
            disabled={submitted}
            inputMode="decimal"
            placeholder="Enter a number"
            style={{
              borderColor: submitted ? (isNatCorrect ? 'var(--success)' : 'var(--danger)') : undefined,
              background: submitted ? (isNatCorrect ? 'var(--answered-bg)' : 'var(--danger-soft)') : undefined,
            }}
          />
        </div>
      )}

      {q.type === 'descriptive' && (
        <div className="card" style={{ padding: 16, marginTop: 22, background: 'var(--surface2)' }}>
          <b>Descriptive question</b>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            No selectable answer is assumed for this question. Use the GateOverflow discussion for the available answer or solution.
          </div>
        </div>
      )}

      {submitted && q.solution && (
        <div className="card" style={{ marginTop: 22, padding: 16, background: 'var(--surface2)', borderLeft: '3px solid var(--accent)' }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>Solution &amp; Explanation</div>
          <div className="solution-body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.solution) }} />
        </div>
      )}
    </div>
  );
}
