'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { allOtherQuestions, getOtherExams } from '../../../lib/otherData';
import { BrowseQuestionCard } from '../../../components/BrowseQuestionCard';
import { MultiTopicSelect } from '../../../components/MultiTopicSelect';

const PAGE_SIZE = 10;

export default function OtherBrowsePage() {
  return (
    <Suspense fallback={<div className="setup"><div className="card section">Loading…</div></div>}>
      <OtherBrowsePageInner />
    </Suspense>
  );
}

function OtherBrowsePageInner() {
  const searchParams = useSearchParams();
  const rawTopicsParam = searchParams.get('topics') || searchParams.get('topic');
  const initialSelectedTopics = useMemo(() => {
    if (!rawTopicsParam || rawTopicsParam === 'all') return [];
    return rawTopicsParam.split(',').map(s => s.trim()).filter(Boolean);
  }, [rawTopicsParam]);

  const [exam, setExam] = useState(searchParams.get('exam') || 'all');
  const [subject, setSubject] = useState(searchParams.get('subject') || 'all');
  const [selectedTopics, setSelectedTopics] = useState<string[]>(initialSelectedTopics);
  const [year, setYear] = useState('all');
  const [type, setType] = useState('all');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['mcq', 'msq', 'nat']);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const exams = useMemo(() => getOtherExams(), []);

  const subjects = useMemo(() => {
    const rows = allOtherQuestions.filter(q => exam === 'all' || q.exam === exam);
    const seen = new Set<string>();
    const list: { id: string; name: string }[] = [];
    for (const q of rows) {
      if (!seen.has(q.subject)) {
        seen.add(q.subject);
        list.push({ id: q.subject, name: q.subject });
      }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [exam]);

  const topics = useMemo(() => {
    const rows = allOtherQuestions.filter(q =>
      (exam === 'all' || q.exam === exam) &&
      (subject === 'all' || q.subject === subject || q.subjectId === subject)
    );
    return [...new Map(rows.map(q => [q.topicId, q])).values()].sort((a, b) =>
      `${a.topicNumber} ${a.topic}`.localeCompare(`${b.topicNumber} ${b.topic}`, undefined, { numeric: true })
    );
  }, [exam, subject]);

  const topicOptions = useMemo(() => {
    return topics.map(t => {
      const qCount = allOtherQuestions.filter(q =>
        (exam === 'all' || q.exam === exam) &&
        (subject === 'all' || q.subject === subject || q.subjectId === subject) &&
        q.topicId === t.topicId
      ).length;
      return {
        id: t.topicId,
        label: `${t.topicNumber} · ${t.topic}`,
        count: qCount,
      };
    });
  }, [topics, exam, subject]);

  const years = useMemo(() => {
    return [...new Set(allOtherQuestions.filter(q =>
      (exam === 'all' || q.exam === exam) &&
      (subject === 'all' || q.subject === subject || q.subjectId === subject) &&
      (selectedTopics.length === 0 || selectedTopics.includes(q.topicId))
    ).map(q => q.year).filter((y): y is number => y !== null))].sort((a, b) => b - a);
  }, [exam, subject, selectedTopics]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allOtherQuestions.filter(q => {
      if (exam !== 'all' && q.exam !== exam) return false;
      if (subject !== 'all' && q.subject !== subject && q.subjectId !== subject) return false;
      if (selectedTopics.length > 0 && !selectedTopics.includes(q.topicId)) return false;
      if (year !== 'all' && q.year !== Number(year)) return false;

      // Question type matching
      if (type === 'objective' || type === 'no_descriptive') {
        if (q.type === 'descriptive') return false;
      } else if (type === 'custom') {
        if (selectedTypes.length > 0 && !selectedTypes.includes(q.type)) return false;
      } else if (type !== 'all') {
        if (q.type !== type) return false;
      }

      if (term && !q.title.toLowerCase().includes(term) && !q.number.toLowerCase().includes(term) && !q.bodyHtml.toLowerCase().includes(term)) {
        return false;
      }

      return true;
    });
  }, [exam, subject, selectedTopics, year, type, selectedTypes, search]);

  useEffect(() => { setPage(1); }, [exam, subject, selectedTopics, year, type, selectedTypes, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="setup" style={{ maxWidth: 960 }}>
      <div className="page-title">
        <div>
          <div className="eyebrow">Non-GATE Questions</div>
          <h1>Browse Questions</h1>
          <p>Read through ISRO, TIFR, and other exam practice questions with instant answer reveals.</p>
        </div>
      </div>

      <div className="card section">
        <div className="grid form-grid">
          <Field label="Exam / Collection">
            <select value={exam} onChange={e => { setExam(e.target.value); setSubject('all'); setSelectedTopics([]); setYear('all'); }}>
              <option value="all">All Exams</option>
              {exams.map(ex => <option key={ex} value={ex}>{ex}</option>)}
            </select>
          </Field>
          <Field label="Subject">
            <select value={subject} onChange={e => { setSubject(e.target.value); setSelectedTopics([]); setYear('all'); }}>
              <option value="all">All subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Topics">
            <MultiTopicSelect
              options={topicOptions}
              selected={selectedTopics}
              onChange={setSelectedTopics}
              placeholder="All topics"
            />
          </Field>
          <Field label="Year">
            <select value={year} onChange={e => setYear(e.target.value)}>
              <option value="all">All years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
          <Field label="Question type">
            <select value={type} onChange={e => setType(e.target.value)}>
              <option value="all">All types</option>
              <option value="objective">Objective only (Exclude Descriptive: MCQ, MSQ, NAT)</option>
              <option value="mcq">MCQ only</option>
              <option value="msq">MSQ only</option>
              <option value="nat">NAT only</option>
              <option value="descriptive">Descriptive only</option>
              <option value="custom">Custom (select multiple)…</option>
            </select>
            {type === 'custom' && (
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                {(['mcq', 'msq', 'nat', 'descriptive'] as const).map(t => {
                  const checked = selectedTypes.includes(t);
                  return (
                    <label key={t} className="radio-card" style={{ padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedTypes(prev =>
                            checked ? prev.filter(x => x !== t) : [...prev, t]
                          );
                        }}
                      />
                      {t.toUpperCase()}
                    </label>
                  );
                })}
                <button
                  type="button"
                  className="btn btn-soft"
                  style={{ fontSize: 11, padding: '4px 8px' }}
                  onClick={() => setSelectedTypes(['mcq', 'msq', 'nat'])}
                >
                  Exclude Descriptive
                </button>
                <button
                  type="button"
                  className="btn btn-soft"
                  style={{ fontSize: 11, padding: '4px 8px' }}
                  onClick={() => setSelectedTypes(['mcq', 'msq', 'nat', 'descriptive'])}
                >
                  Select all
                </button>
              </div>
            )}
          </Field>
          <Field label="Search text or number">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="e.g. sorting, critical section, K_m,n" />
          </Field>
        </div>
      </div>

      <div className="card section" style={{ marginTop: 18 }}>
        <div className="section-head">
          <h3>Questions</h3>
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
