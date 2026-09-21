'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { allQuestions } from '../../lib/data';
import { BrowseQuestionCard } from '../../components/BrowseQuestionCard';

const PAGE_SIZE = 10;

export default function BrowsePage() {
  return (
    <Suspense fallback={<div className="setup"><div className="card section">Loading…</div></div>}>
      <BrowsePageInner />
    </Suspense>
  );
}

function BrowsePageInner() {
  const searchParams = useSearchParams();
  const [volume, setVolume] = useState('all');
  const [subject, setSubject] = useState(searchParams.get('subject') || 'all');
  const [topic, setTopic] = useState(searchParams.get('topic') || 'all');
  const [year, setYear] = useState('all');
  const [type, setType] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const subjects = useMemo(() => {
    const rows = allQuestions.filter(q => volume === 'all' || q.volume === Number(volume));
    return [...new Map(rows.map(q => [q.subjectId, q])).values()].sort((a, b) => a.subject.localeCompare(b.subject));
  }, [volume]);

  const topics = useMemo(() => {
    const rows = allQuestions.filter(q =>
      (volume === 'all' || q.volume === Number(volume)) &&
      (subject === 'all' || q.subjectId === subject)
    );
    return [...new Map(rows.map(q => [q.topicId, q])).values()].sort((a, b) =>
      `${a.topicNumber} ${a.topic}`.localeCompare(`${b.topicNumber} ${b.topic}`, undefined, { numeric: true })
    );
  }, [volume, subject]);

  const years = useMemo(() => {
    return [...new Set(allQuestions.filter(q =>
      (volume === 'all' || q.volume === Number(volume)) &&
      (subject === 'all' || q.subjectId === subject) &&
      (topic === 'all' || q.topicId === topic)
    ).map(q => q.year).filter((y): y is number => y !== null))].sort((a, b) => b - a);
  }, [volume, subject, topic]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allQuestions.filter(q =>
      (volume === 'all' || q.volume === Number(volume)) &&
      (subject === 'all' || q.subjectId === subject) &&
      (topic === 'all' || q.topicId === topic) &&
      (year === 'all' || q.year === Number(year)) &&
      (type === 'all' || q.type === type) &&
      (!term || q.title.toLowerCase().includes(term) || q.number.toLowerCase().includes(term))
    );
  }, [volume, subject, topic, year, type, search]);

  useEffect(() => { setPage(1); }, [volume, subject, topic, year, type, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="setup" style={{ maxWidth: 960 }}>
      <div className="page-title">
        <div>
          <div className="eyebrow">Read-only mode</div>
          <h1>Browse questions</h1>
          <p>Look through the fixed PYQ dataset with answers shown on demand — no session, no scoring, no timer.</p>
        </div>
      </div>

      <div className="card section">
        <div className="grid form-grid">
          <Field label="Volume">
            <select value={volume} onChange={e => { setVolume(e.target.value); setSubject('all'); setTopic('all'); setYear('all'); }}>
              <option value="all">All volumes</option>
              <option value="1">Volume 1</option>
              <option value="2">Volume 2</option>
              <option value="3">Volume 3</option>
            </select>
          </Field>
          <Field label="Subject">
            <select value={subject} onChange={e => { setSubject(e.target.value); setTopic('all'); setYear('all'); }}>
              <option value="all">All subjects</option>
              {subjects.map(q => <option key={q.subjectId} value={q.subjectId}>{q.subject}</option>)}
            </select>
          </Field>
          <Field label="Topic">
            <select value={topic} onChange={e => { setTopic(e.target.value); setYear('all'); }}>
              <option value="all">All topics</option>
              {topics.map(q => <option key={q.topicId} value={q.topicId}>{q.topicNumber} · {q.topic}</option>)}
            </select>
          </Field>
          <Field label="GATE year">
            <select value={year} onChange={e => setYear(e.target.value)}>
              <option value="all">All years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
          <Field label="Question type">
            <select value={type} onChange={e => setType(e.target.value)}>
              <option value="all">All types</option>
              <option value="mcq">MCQ</option>
              <option value="msq">MSQ</option>
              <option value="nat">NAT</option>
              <option value="descriptive">Descriptive</option>
            </select>
          </Field>
          <Field label="Search title or number">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="e.g. 2021 or pointer arithmetic" />
          </Field>
        </div>
      </div>

      <div className="card section" style={{ marginTop: 18 }}>
        <div className="section-head">
          <h3>Results</h3>
          <span className="pill">{filtered.length} question{filtered.length === 1 ? '' : 's'}</span>
        </div>
        {!filtered.length && <p className="muted">No questions match the selected filters.</p>}
      </div>

      {pageItems.map((q, i) => (
        <BrowseQuestionCard key={q.id} q={q} index={(safePage - 1) * PAGE_SIZE + i + 1} />
      ))}

      {filtered.length > 0 && (
        <div className="card section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <button className="btn btn-soft" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>Previous</button>
          <span className="muted" style={{ fontSize: 13 }}>Page {safePage} of {totalPages}</span>
          <button className="btn btn-soft" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>Next</button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}
