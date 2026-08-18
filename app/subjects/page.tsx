'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { allQuestions } from '../../lib/data';
import { getCurrentUserId, loadAttempts } from '../../lib/persistence';
import { accuracyColor, accuracyTint } from '../../lib/accuracyColor';

export default function Subjects() {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');
  const [attempts, setAttempts] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const uid = await getCurrentUserId();
      if (!uid) return;
      try { setAttempts(await loadAttempts(uid)); } catch { /* accuracy pills just stay hidden */ }
    })();
  }, []);

  const accuracyBySubject = useMemo(() => {
    const latestPerQuestion = new Map<string, string>();
    for (const a of attempts) if (!latestPerQuestion.has(a.question_id)) latestPerQuestion.set(a.question_id, a.result);
    const bySubject = new Map<string, { correct: number; scored: number }>();
    for (const [qid, result] of latestPerQuestion) {
      if (result !== 'correct' && result !== 'incorrect') continue;
      const q = allQuestions.find(x => x.id === qid);
      if (!q) continue;
      if (!bySubject.has(q.subjectId)) bySubject.set(q.subjectId, { correct: 0, scored: 0 });
      const s = bySubject.get(q.subjectId)!;
      s.scored++;
      if (result === 'correct') s.correct++;
    }
    return new Map([...bySubject.entries()].map(([id, s]) => [id, { scored: s.scored, accuracy: Math.round(s.correct / s.scored * 100) }]));
  }, [attempts]);

  const groups = useMemo(() => [...new Map(allQuestions.map(q => [q.subjectId, { id: q.subjectId, name: q.subject, volume: q.volume }])).values()].sort((a, b) => a.name.localeCompare(b.name)), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(s => s.name.toLowerCase().includes(q));
  }, [groups, query]);

  function toggle(id: string) {
    setOpen(o => ({ ...o, [id]: !o[id] }));
  }

  return (
    <div className="setup" style={{ maxWidth: 880 }}>
      <div className="page-title">
        <div><div className="eyebrow">Browse the bank</div><h1>Subjects</h1><p>Navigate the fixed question bank by subject and topic.</p></div>
      </div>

      <div className="field" style={{ marginBottom: 16, position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--faint)' }} />
        <input
          placeholder="Search subjects…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ paddingLeft: 34 }}
        />
      </div>

      <div className="accordion">
        {filtered.map(s => {
          const qs = allQuestions.filter(q => q.subjectId === s.id);
          const topics = [...new Map(qs.map(q => [q.topic, q.topic])).values()];
          const isOpen = !!open[s.id];
          const acc = accuracyBySubject.get(s.id);
          return (
            <div className={`accordion-item card${isOpen ? ' open' : ''}`} key={s.id}>
              <button className="accordion-head" onClick={() => toggle(s.id)} aria-expanded={isOpen}>
                <ChevronDown size={16} className="accordion-chevron" />
                <span className="accordion-title">{s.name}</span>
                <span className="muted" style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)' }}>Vol {s.volume}</span>
                {acc && <span className="pill" style={{ marginLeft: 'auto', background: accuracyTint(acc.accuracy), color: accuracyColor(acc.accuracy) }}>{acc.accuracy}% accuracy</span>}
                <span className="pill" style={{ marginLeft: acc ? 0 : 'auto' }}>{qs.length} questions</span>
              </button>
              {isOpen && (
                <div className="accordion-body">
                  <div className="mini-bars">
                    {topics.map(t => (
                      <div className="mini" key={t}><span>{t}</span><span className="pill">{qs.filter(q => q.topic === t).length}</span></div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                    <Link href={'/practice?subject=' + encodeURIComponent(s.id)} className="btn btn-primary">Practice subject</Link>
                    <Link href={'/browse?subject=' + encodeURIComponent(s.id)} className="btn btn-soft">View questions</Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <div className="card section"><div className="empty">No subjects match &quot;{query}&quot;.</div></div>}
      </div>
    </div>
  );
}
