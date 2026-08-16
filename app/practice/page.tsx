'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { allQuestions } from '../../lib/data';
import { PracticeClient } from '../../components/PracticeClient';
import { getCurrentUserId, loadAttempts, loadFlags } from '../../lib/persistence';

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="setup"><div className="card section">Loading…</div></div>}>
      <PracticePageInner />
    </Suspense>
  );
}

function PracticePageInner() {
  const searchParams = useSearchParams();
  const initialSubject = searchParams.get('subject') || 'all';
  const initialTopic = searchParams.get('topic') || 'all';
  const only = searchParams.get('only') || 'all';
  const [savedIds, setSavedIds] = useState<string[] | null>(only === 'all' ? [] : null);
  const [filterMessage, setFilterMessage] = useState('');
  useEffect(() => {
    if (only === 'all') { setSavedIds([]); return; }
    (async () => {
      const uid = await getCurrentUserId();
      if (!uid) { setSavedIds([]); setFilterMessage('Sign in to practice your synchronized saved queue.'); return; }
      try {
        if (only === 'bookmarks' || only === 'revision') {
          const flags = await loadFlags(uid);
          setSavedIds(Object.entries(flags).filter(([, v]) => only === 'bookmarks' ? v.bookmarked : v.revision).map(([id]) => id));
        } else if (only === 'incorrect') {
          const attempts = await loadAttempts(uid);
          const latest = new Map<string, string>();
          for (const a of attempts) if (!latest.has(a.question_id)) latest.set(a.question_id, a.result);
          setSavedIds([...latest.entries()].filter(([, result]) => result === 'incorrect').map(([id]) => id));
        }
      } catch { setSavedIds([]); setFilterMessage('Could not load the selected practice queue.'); }
    })();
  }, [only]);

  const [started, setStarted] = useState(false);
  const [volume, setVolume] = useState('all');
  const [subject, setSubject] = useState(initialSubject);
  const [topic, setTopic] = useState(initialTopic);
  const [year, setYear] = useState('all');
  const [type, setType] = useState('all');
  const [count, setCount] = useState('20');
  const [feedback, setFeedback] = useState<'immediate' | 'end'>('immediate');
  const [timer, setTimer] = useState('0');
  const [order, setOrder] = useState<'sequential' | 'random'>('sequential');

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

  const pool = useMemo(() => {
    const base = allQuestions.filter(q =>
      (volume === 'all' || q.volume === Number(volume)) &&
      (subject === 'all' || q.subjectId === subject) &&
      (topic === 'all' || q.topicId === topic) &&
      (year === 'all' || q.year === Number(year)) &&
      (type === 'all' || q.type === type)
    );
    if (only === 'all') return base;
    if (savedIds === null) return [];
    const ids = new Set(savedIds);
    return base.filter(q => ids.has(q.id));
  }, [volume, subject, topic, year, type, only, savedIds]);

  const maxCount = Math.min(Number(count), pool.length);
  const start = () => {
    if (pool.length > 0) setStarted(true);
  };

  if (started) {
    return (
      <PracticeClient
        questions={pool}
        count={maxCount}
        feedback={feedback}
        timerMinutes={Number(timer)}
        order={order}
      />
    );
  }

  return (
    <div className="setup">
      <div className="page-title">
        <div>
          <div className="eyebrow">Practice builder</div>
          <h1>Configure a session</h1>
          <p>Choose exactly what you want to practice from the fixed PYQ dataset.</p>{filterMessage && <div className="notice" style={{marginTop:12}}>{filterMessage}</div>}
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
          <Field label="Number of questions">
            <select value={count} onChange={e => setCount(e.target.value)}>
              {[10, 20, 30, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
        </div>

        <div style={{ marginTop: 24 }}>
          <div className="field">
            <label>Question order</label>
            <div className="radio-row">
              <label className="radio-card"><input type="radio" checked={order === 'sequential'} onChange={() => setOrder('sequential')} />Sequential</label>
              <label className="radio-card"><input type="radio" checked={order === 'random'} onChange={() => setOrder('random')} />Random</label>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }} className="grid form-grid">
        <div className="card section">
          <div className="field">
            <label>Feedback mode</label>
            <div className="radio-row">
              <label className="radio-card"><input type="radio" checked={feedback === 'immediate'} onChange={() => setFeedback('immediate')} />Immediate feedback</label>
              <label className="radio-card"><input type="radio" checked={feedback === 'end'} onChange={() => setFeedback('end')} />End-of-test review</label>
            </div>
          </div>
        </div>
        <div className="card section">
          <div className="field">
            <label>Timer</label>
            <select value={timer} onChange={e => setTimer(e.target.value)}>
              <option value="0">No timer</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">60 minutes</option>
              <option value="90">90 minutes</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card section" style={{ marginTop: 18 }}>
        <div className="section-head"><h3>Session preview</h3><span className="pill">{pool.length} matching questions</span></div>
        <p className="muted">{savedIds === null ? 'Loading the selected queue…' : pool.length ? `The engine will ${order === 'random' ? 'shuffle the complete matching pool and select' : 'take'} ${maxCount} question${maxCount === 1 ? '' : 's'}.` : 'No questions match the selected filters.'}</p>
        <button className="btn btn-primary" disabled={!pool.length} onClick={start}>Start practice</button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}
