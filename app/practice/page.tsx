'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { allQuestions } from '../../lib/data';
import { PracticeClient } from '../../components/PracticeClient';
import { MultiTopicSelect } from '../../components/MultiTopicSelect';
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
  const rawTopicsParam = searchParams.get('topics') || searchParams.get('topic');
  const initialSelectedTopics = useMemo(() => {
    if (!rawTopicsParam || rawTopicsParam === 'all') return [];
    return rawTopicsParam.split(',').map(s => s.trim()).filter(Boolean);
  }, [rawTopicsParam]);
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
  const [selectedTopics, setSelectedTopics] = useState<string[]>(initialSelectedTopics);
  const [year, setYear] = useState('all');
  const [type, setType] = useState('all');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['mcq', 'msq', 'nat']);
  const [count, setCount] = useState('20');
  const [customCount, setCustomCount] = useState('25');
  const [feedback, setFeedback] = useState<'immediate' | 'end'>('immediate');
  const [timer, setTimer] = useState('0');
  const [customTimer, setCustomTimer] = useState('45');
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

  const topicOptions = useMemo(() => {
    return topics.map(t => {
      const qCount = allQuestions.filter(q =>
        (volume === 'all' || q.volume === Number(volume)) &&
        (subject === 'all' || q.subjectId === subject) &&
        q.topicId === t.topicId
      ).length;
      return {
        id: t.topicId,
        label: `${t.topicNumber} · ${t.topic}`,
        count: qCount,
      };
    });
  }, [topics, volume, subject]);

  const years = useMemo(() => {
    return [...new Set(allQuestions.filter(q =>
      (volume === 'all' || q.volume === Number(volume)) &&
      (subject === 'all' || q.subjectId === subject) &&
      (selectedTopics.length === 0 || selectedTopics.includes(q.topicId))
    ).map(q => q.year).filter((y): y is number => y !== null))].sort((a, b) => b - a);
  }, [volume, subject, selectedTopics]);

  const pool = useMemo(() => {
    const base = allQuestions.filter(q => {
      if (volume !== 'all' && q.volume !== Number(volume)) return false;
      if (subject !== 'all' && q.subjectId !== subject) return false;
      if (selectedTopics.length > 0 && !selectedTopics.includes(q.topicId)) return false;

      // Year matching
      if (year !== 'all') {
        if (!q.year) return false;
        if (year === 'gte_2000' || year === 'above_2000') {
          if (q.year < 2000) return false;
        } else if (year === 'gte_2006' || year === 'above_2006') {
          if (q.year < 2006) return false;
        } else if (year === 'gte_2008' || year === 'above_2008') {
          if (q.year < 2008) return false;
        } else if (year === 'gte_2010') {
          if (q.year < 2010) return false;
        } else if (year === 'gte_2015') {
          if (q.year < 2015) return false;
        } else if (q.year !== Number(year)) {
          return false;
        }
      }

      // Question type matching
      if (type === 'objective' || type === 'no_descriptive') {
        if (q.type === 'descriptive') return false;
      } else if (type === 'custom') {
        if (selectedTypes.length > 0 && !selectedTypes.includes(q.type)) return false;
      } else if (type !== 'all') {
        if (q.type !== type) return false;
      }

      return true;
    });

    if (only === 'all') return base;
    if (savedIds === null) return [];
    const ids = new Set(savedIds);
    return base.filter(q => ids.has(q.id));
  }, [volume, subject, selectedTopics, year, type, selectedTypes, only, savedIds]);

  const effectiveCount = count === 'all'
    ? pool.length
    : count === 'custom'
    ? Math.max(1, parseInt(customCount, 10) || 1)
    : Number(count);

  const maxCount = Math.min(effectiveCount, pool.length);
  const start = () => {
    if (pool.length > 0) setStarted(true);
  };

  const effectiveTimerMinutes = timer === 'custom'
    ? Math.max(1, Math.min(720, parseInt(customTimer, 10) || 1))
    : Number(timer);

  if (started) {
    return (
      <PracticeClient
        questions={pool}
        count={maxCount}
        feedback={feedback}
        timerMinutes={effectiveTimerMinutes}
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
            <select value={volume} onChange={e => { setVolume(e.target.value); setSubject('all'); setSelectedTopics([]); setYear('all'); }}>
              <option value="all">All volumes</option>
              <option value="1">Volume 1</option>
              <option value="2">Volume 2</option>
              <option value="3">Volume 3</option>
            </select>
          </Field>
          <Field label="Subject">
            <select value={subject} onChange={e => { setSubject(e.target.value); setSelectedTopics([]); setYear('all'); }}>
              <option value="all">All subjects</option>
              {subjects.map(q => <option key={q.subjectId} value={q.subjectId}>{q.subject}</option>)}
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
          <Field label="GATE year">
            <select value={year} onChange={e => setYear(e.target.value)}>
              <option value="all">All years (1987 - 2026)</option>
              <option value="gte_2000">2000 and above (2000+)</option>
              <option value="gte_2006">2006 and above (2006+)</option>
              <option value="gte_2008">2008 and above (2008+)</option>
              <option value="gte_2010">2010 and above (2010+)</option>
              <option value="gte_2015">2015 and above (Last 10+ yrs)</option>
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
          <Field label="Number of questions">
            <select value={count} onChange={e => setCount(e.target.value)}>
              {[5, 10, 15, 20, 30, 50, 65, 100].map(n => (
                <option key={n} value={n}>{n} questions{n === 65 ? ' (Full GATE mock)' : ''}</option>
              ))}
              <option value="all">All matching questions ({pool.length})</option>
              <option value="custom">Custom count…</option>
            </select>
            {count === 'custom' && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  min="1"
                  max={Math.max(1, pool.length)}
                  value={customCount}
                  onChange={e => setCustomCount(e.target.value)}
                  placeholder="Count"
                  style={{ maxWidth: 120 }}
                />
                <span className="muted" style={{ fontSize: 13 }}>
                  questions {pool.length > 0 ? `(max ${pool.length} available)` : ''}
                </span>
              </div>
            )}
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
              <option value="45">45 minutes</option>
              <option value="60">60 minutes (1 hour)</option>
              <option value="90">90 minutes (1.5 hours)</option>
              <option value="120">120 minutes (2 hours)</option>
              <option value="150">150 minutes (2.5 hours)</option>
              <option value="180">180 minutes (3 hours — Full Mock)</option>
              <option value="custom">Custom duration…</option>
            </select>
            {timer === 'custom' && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={customTimer}
                  onChange={e => setCustomTimer(e.target.value)}
                  placeholder="Minutes"
                  style={{ maxWidth: 130 }}
                />
                <span className="muted" style={{ fontSize: 13 }}>
                  minutes {effectiveTimerMinutes > 0 ? `(${Math.floor(effectiveTimerMinutes / 60) > 0 ? `${Math.floor(effectiveTimerMinutes / 60)}h ` : ''}${effectiveTimerMinutes % 60 > 0 ? `${effectiveTimerMinutes % 60}m` : ''})` : ''}
                </span>
              </div>
            )}
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
