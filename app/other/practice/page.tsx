'use client';

import { Suspense, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { allOtherQuestions, getOtherExams } from '../../../lib/otherData';
import { PracticeClient } from '../../../components/PracticeClient';
import { MultiTopicSelect } from '../../../components/MultiTopicSelect';

export default function OtherPracticePage() {
  return (
    <Suspense fallback={<div className="setup"><div className="card section">Loading…</div></div>}>
      <OtherPracticePageInner />
    </Suspense>
  );
}

function OtherPracticePageInner() {
  const searchParams = useSearchParams();
  const initialExam = searchParams.get('exam') || 'all';
  const rawTopicsParam = searchParams.get('topics') || searchParams.get('topic');
  const initialSelectedTopics = useMemo(() => {
    if (!rawTopicsParam || rawTopicsParam === 'all') return [];
    return rawTopicsParam.split(',').map(s => s.trim()).filter(Boolean);
  }, [rawTopicsParam]);

  const [started, setStarted] = useState(false);
  const [exam, setExam] = useState(initialExam);
  const [subject, setSubject] = useState('all');
  const [selectedTopics, setSelectedTopics] = useState<string[]>(initialSelectedTopics);
  const [year, setYear] = useState('all');
  const [type, setType] = useState('all');
  const [count, setCount] = useState('20');
  const [feedback, setFeedback] = useState<'immediate' | 'end'>('immediate');
  const [timer, setTimer] = useState('0');
  const [order, setOrder] = useState<'sequential' | 'random'>('sequential');

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

  const pool = useMemo(() => {
    return allOtherQuestions.filter(q =>
      (exam === 'all' || q.exam === exam) &&
      (subject === 'all' || q.subject === subject || q.subjectId === subject) &&
      (selectedTopics.length === 0 || selectedTopics.includes(q.topicId)) &&
      (year === 'all' || q.year === Number(year)) &&
      (type === 'all' || q.type === type)
    );
  }, [exam, subject, selectedTopics, year, type]);

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
          <div className="eyebrow">Non-GATE Practice</div>
          <h1>Configure a Practice Session</h1>
          <p>Choose an exam collection (ISRO, TIFR, or Custom) and practice with the dedicated scoring engine.</p>
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
              <option value="mcq">MCQ</option>
              <option value="msq">MSQ</option>
              <option value="nat">NAT</option>
              <option value="descriptive">Descriptive</option>
            </select>
          </Field>
          <Field label="Number of questions">
            <select value={count} onChange={e => setCount(e.target.value)}>
              {[5, 10, 20, 30, 50].map(n => <option key={n} value={n}>{n}</option>)}
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
        <p className="muted">{pool.length ? `The engine will ${order === 'random' ? 'shuffle and select' : 'take'} ${maxCount} question${maxCount === 1 ? '' : 's'} from ${exam === 'all' ? 'all Non-GATE sets' : exam}.` : 'No questions match the selected filters.'}</p>
        <button className="btn btn-primary" disabled={!pool.length} onClick={start}>Start practice</button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}
