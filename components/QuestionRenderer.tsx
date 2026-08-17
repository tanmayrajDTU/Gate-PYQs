'use client';

import { useEffect, useRef } from 'react';
import type { Question } from '../lib/types';
import { sanitizeHtml } from '../lib/sanitizeHtml';
import { typesetMath } from '../lib/mathjax';

export function QuestionRenderer({ q, selected, onSelect, submitted }: { q: Question; selected: string[]; onSelect: (v: string[]) => void; submitted: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) void typesetMath([cardRef.current]);
  }, [q.id, submitted]);

  const toggle = (label: string) => {
    if (q.type === 'mcq') onSelect([label]);
    else if (q.type === 'msq') onSelect(selected.includes(label) ? selected.filter(x => x !== label) : [...selected, label]);
  };

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
          {q.options.map(o => (
            <label key={o.label} className={`option ${selected.includes(o.label) ? 'selected' : ''}`}>
              <input type={q.type === 'msq' ? 'checkbox' : 'radio'} checked={selected.includes(o.label)} onChange={() => toggle(o.label)} disabled={submitted} />
              <span><span className="option-letter">{o.label}</span><span dangerouslySetInnerHTML={{ __html: sanitizeHtml(o.html) }} /></span>
            </label>
          ))}
        </div>
      )}

      {q.type === 'nat' && (
        <div className="field" style={{ marginTop: 22 }}>
          <label>Your numerical answer</label>
          <input value={selected[0] || ''} onChange={e => onSelect([e.target.value])} disabled={submitted} inputMode="decimal" placeholder="Enter a number" />
        </div>
      )}

      {q.type === 'descriptive' && (
        <div className="card" style={{ padding: 16, marginTop: 22, background: 'var(--surface2)' }}>
          <b>Descriptive question</b>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>No selectable answer is assumed for this question. Use the GateOverflow discussion for the available answer or solution.</div>
        </div>
      )}
    </div>
  );
}
