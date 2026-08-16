'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { Question } from '../lib/types';
import { sanitizeHtml } from '../lib/sanitizeHtml';
import { typesetMath } from '../lib/mathjax';

export function BrowseQuestionCard({ q, index }: { q: Question; index: number }) {
  const [showAnswer, setShowAnswer] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) void typesetMath([cardRef.current]);
  }, [q.id]);

  const correctLabels = new Set(
    (q.answer || '')
      .split(/[{},\s,]+/)
      .map(x => x.trim().toUpperCase())
      .filter(Boolean)
  );

  return (
    <div className="question-card card" style={{ marginBottom: 16 }} ref={cardRef}>
      <div className="q-meta">
        <span className="pill">{q.type.toUpperCase()}</span>
        {q.year && <span className="pill">{q.exam} {q.year}</span>}
        <span className="q-title">{index}. {q.number} · {q.subject} · {q.topic}</span>
      </div>
      <div className="q-body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.bodyHtml) }} />

      {q.options.length > 0 && (q.type === 'mcq' || q.type === 'msq') && (
        <div className="options">
          {q.options.map(o => {
            const isCorrect = showAnswer && correctLabels.has(o.label.trim().toUpperCase());
            return (
              <div key={o.label} className={`option ${isCorrect ? 'correct-answer' : ''}`} style={{ cursor: 'default' }}>
                <span><b>{o.label}.</b>&nbsp; <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(o.html) }} /></span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 18, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-soft" onClick={() => setShowAnswer(s => !s)}>{showAnswer ? 'Hide answer' : 'Show answer'}</button>
        {showAnswer && q.type === 'nat' && <span className="pill">Answer: {q.answer ?? '—'}</span>}
        {showAnswer && q.type === 'descriptive' && <span className="muted" style={{ fontSize: 13 }}>No fixed answer is stored for this question — use the GateOverflow discussion for the solution.</span>}
        {showAnswer && (q.type === 'mcq' || q.type === 'msq') && !q.answer && <span className="muted" style={{ fontSize: 13 }}>No answer key is stored for this question.</span>}
        {showAnswer && q.gateOverflowUrl && <a className="btn btn-soft" href={q.gateOverflowUrl} target="_blank" rel="noreferrer">Open GateOverflow <ExternalLink size={15} /></a>}
      </div>
    </div>
  );
}
