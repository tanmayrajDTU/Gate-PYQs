'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  History,
  RotateCcw,
  Eye,
  Trash2,
  Clock3,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  PlusCircle,
  Sparkles,
} from 'lucide-react';
import { getCurrentUserId } from '../../lib/persistence';
import {
  loadAllPracticeSessions,
  deletePracticeSession,
  matchesExamFilter,
  type PracticeSessionRecord,
} from '../../lib/sessionHistory';
import { accuracyColor } from '../../lib/accuracyColor';
import { formatShortDate } from '../../lib/format';

export default function HistoryPage() {
  const [sessions, setSessions] = useState<PracticeSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [examFilter, setExamFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'score' | 'time'>('newest');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const uid = await getCurrentUserId();
      if (!active) return;
      setUserId(uid);
      const list = await loadAllPracticeSessions(uid);
      if (active) {
        setSessions(list);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this test session from history?')) return;
    setSessions(prev => prev.filter(s => s.id !== id));
    await deletePracticeSession(id, userId);
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all past test history? This action cannot be undone.')) return;
    for (const s of sessions) {
      await deletePracticeSession(s.id, userId);
    }
    setSessions([]);
  };

  const getSessionExam = (s: PracticeSessionRecord): string => {
    return (s.exam || (s.config?.exam as string) || 'GATE').trim();
  };

  // Dynamic exam filter options
  const examOptions = useMemo(() => {
    const baseOptions = [
      { value: 'all', label: 'All Exams' },
      { value: 'GATE', label: 'GATE PYQs' },
      { value: 'ISRO CSE', label: 'ISRO CSE' },
      { value: 'TIFR CSE', label: 'TIFR CSE' },
      { value: 'Knowledge Gate Practice', label: 'Knowledge Gate Practice' },
    ];
    const knownValues = new Set(baseOptions.map(o => o.value.toLowerCase()));
    for (const s of sessions) {
      const raw = getSessionExam(s);
      if (raw && !raw.toLowerCase().startsWith('gate') && !knownValues.has(raw.toLowerCase())) {
        baseOptions.push({ value: raw, label: raw });
        knownValues.add(raw.toLowerCase());
      }
    }
    return baseOptions;
  }, [sessions]);

  // Aggregated performance statistics
  const stats = useMemo(() => {
    const totalTests = sessions.length;
    let totalQuestions = 0;
    let totalAttempted = 0;
    let totalScored = 0;
    let totalSeconds = 0;

    for (const s of sessions) {
      totalQuestions += s.totalQuestions || (s.questionIds?.length ?? 0);
      totalAttempted += s.attemptedCount || 0;
      totalScored += s.score || 0;
      totalSeconds += s.elapsedSeconds || 0;
    }

    const avgAccuracy = totalAttempted > 0 ? Math.round((totalScored / totalAttempted) * 100) : 0;

    return {
      totalTests,
      totalQuestions,
      totalAttempted,
      totalScored,
      totalSeconds,
      avgAccuracy,
    };
  }, [sessions]);

  // Filtered & sorted session list
  const filteredSessions = useMemo(() => {
    return sessions
      .filter(s => {
        if (!matchesExamFilter(getSessionExam(s), examFilter)) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchesTitle = s.title.toLowerCase().includes(q);
          const matchesSubject = (s.config?.subject || '').toLowerCase().includes(q);
          const matchesExam = getSessionExam(s).toLowerCase().includes(q);
          return matchesTitle || matchesSubject || matchesExam;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'score') return (b.accuracy || 0) - (a.accuracy || 0);
        if (sortBy === 'time') return (b.elapsedSeconds || 0) - (a.elapsedSeconds || 0);
        return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
      });
  }, [sessions, search, examFilter, sortBy]);

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return minutes ? `${minutes}m ${String(seconds).padStart(2, '0')}s` : `${seconds}s`;
  };

  const formatTestDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="setup">
      <div className="page-title">
        <div>
          <div className="eyebrow">Past Tests &amp; Analysis</div>
          <h1>Test History Repository</h1>
          <p>Review solutions, examine performance breakdowns, and reattempt any past test with identical questions.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link
            className="btn btn-primary"
            href="/practice"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <PlusCircle size={15} /> New Practice Test
          </Link>
          {sessions.length > 0 && (
            <button
              type="button"
              className="btn btn-soft"
              onClick={handleClearAll}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--danger)' }}
              title="Clear all recorded test sessions"
            >
              <Trash2 size={14} /> Clear History
            </button>
          )}
        </div>
      </div>

      {/* Aggregate Stats Grid */}
      <div className="grid result-grid" style={{ marginBottom: 20 }}>
        <div className="card stat">
          <div className="label">Tests Completed</div>
          <div className="result-number">{stats.totalTests}</div>
        </div>
        <div className="card stat">
          <div className="label">Questions Attempted</div>
          <div className="result-number">{stats.totalAttempted}</div>
        </div>
        <div className="card stat">
          <div className="label">Average Accuracy</div>
          <div className="result-number" style={{ color: stats.totalAttempted ? accuracyColor(stats.avgAccuracy) : undefined }}>
            {stats.totalAttempted ? `${stats.avgAccuracy}%` : '—'}
          </div>
        </div>
        <div className="card stat">
          <div className="label">Total Practice Time</div>
          <div className="result-number">{formatDuration(stats.totalSeconds)}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: 14,
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 260, alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              background: 'var(--surface2)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line)',
              width: '100%',
              maxWidth: 360,
            }}
          >
            <Search size={14} className="muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tests by title or subject..."
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text)',
                fontSize: 13,
                width: '100%',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }} className="muted">
            <Filter size={14} /> Exam:
            <select
              value={examFilter}
              onChange={e => setExamFilter(e.target.value)}
              style={{ fontSize: 12, padding: '4px 8px' }}
            >
              {examOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }} className="muted">
            Sort:
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              style={{ fontSize: 12, padding: '4px 8px' }}
            >
              <option value="newest">Most Recent</option>
              <option value="score">Highest Score</option>
              <option value="time">Longest Duration</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sessions Repository List */}
      {loading ? (
        <div className="card section" style={{ padding: 24, textAlign: 'center' }}>
          <p className="muted">Loading test history repository…</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="card section" style={{ padding: 36, textAlign: 'center' }}>
          <History size={36} className="muted" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ margin: '0 0 6px 0' }}>
            {sessions.length === 0 ? 'No test history recorded yet' : 'No tests matching filters'}
          </h3>
          <p className="muted" style={{ maxWidth: 460, margin: '0 auto 18px', fontSize: 13.5 }}>
            {sessions.length === 0
              ? 'Whenever you finish a practice session, it is automatically archived here. You will be able to review full solutions and reattempt questions anytime.'
              : 'Try clearing your search query or switching exam filters to view past sessions.'}
          </p>
          <Link className="btn btn-primary" href="/practice">
            Start a Practice Session
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {filteredSessions.map(session => {
            const acc = session.accuracy ?? 0;
            const attempted = session.attemptedCount ?? 0;
            const total = session.totalQuestions || session.questionIds?.length || 0;

            return (
              <div
                key={session.id}
                className="card"
                style={{
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  transition: 'box-shadow .15s ease, border-color .15s ease',
                  borderLeft: `4px solid ${accuracyColor(acc)}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className="pill" style={{ fontSize: 11, fontWeight: 700 }}>
                        {getSessionExam(session)}
                      </span>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {formatTestDate(session.startedAt)}
                      </span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: 17 }}>{session.title}</h3>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Link
                      href={`/practice?reviewSession=${session.id}`}
                      className="btn btn-soft"
                      style={{ fontSize: 12.5, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <Eye size={14} /> Review &amp; Solutions
                    </Link>

                    <Link
                      href={`/practice?reattempt=${session.id}`}
                      className="btn btn-primary"
                      style={{ fontSize: 12.5, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <RotateCcw size={14} /> Reattempt Test
                    </Link>

                    <button
                      type="button"
                      className="icon-btn"
                      onClick={e => void handleDelete(session.id, e)}
                      title="Delete test from history"
                      style={{ width: 32, height: 32 }}
                    >
                      <Trash2 size={14} style={{ color: 'var(--muted)' }} />
                    </button>
                  </div>
                </div>

                {/* Score & Summary Metrics */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    flexWrap: 'wrap',
                    padding: '10px 14px',
                    background: 'var(--surface2)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 13,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={15} style={{ color: accuracyColor(acc) }} />
                    <span>
                      Score: <b>{session.score} / {total}</b>
                    </span>
                    <span
                      className="pill"
                      style={{
                        fontSize: 11,
                        background: 'transparent',
                        borderColor: accuracyColor(acc),
                        color: accuracyColor(acc),
                        fontWeight: 700,
                        marginLeft: 4,
                      }}
                    >
                      {acc}% accuracy
                    </span>
                  </div>

                  <span className="muted">·</span>

                  <div>
                    <span className="muted">Attempted:</span>{' '}
                    <b>{attempted}</b> of <b>{total}</b> questions ({total - attempted} skipped)
                  </div>

                  <span className="muted">·</span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} className="muted">
                    <Clock3 size={14} />
                    <span>Time: <b>{formatDuration(session.elapsedSeconds || 0)}</b></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
