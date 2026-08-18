'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, Trophy, Sparkles, Medal, Award, Gem, Crown,
  Sunrise, Flame, Rocket, Target, Hash, Compass, Globe2, LucideIcon,
} from 'lucide-react';
import { allQuestions } from '../../lib/data';
import { getCurrentUserId, loadAttempts } from '../../lib/persistence';
import { computePoints, computeLevel, computeBadges, POINTS_BY_TYPE } from '../../lib/gamification';
import { computeStreak } from '../../lib/spacedRepetition';

const BADGE_ICONS: Record<string, LucideIcon> = {
  'first-blood': Sparkles,
  'half-century': Medal,
  'century': Award,
  'quarter-k': Gem,
  'half-k': Crown,
  'streak-3': Sunrise,
  'streak-7': Flame,
  'streak-30': Rocket,
  'subject-master': Target,
  'nat-ace': Hash,
  'explorer': Compass,
  'well-rounded': Globe2,
};

export default function Achievements() {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    (async () => {
      const uid = await getCurrentUserId();
      if (!uid) { setStatus('Sign in to track points, levels and badges across devices.'); return; }
      try { setAttempts(await loadAttempts(uid)); }
      catch { setStatus('Could not load synchronized attempt history.'); }
    })();
  }, []);

  const typeMap = useMemo(() => new Map(allQuestions.map(q => [q.id, q.type])), []);
  const subjectMap = useMemo(() => new Map(allQuestions.map(q => [q.id, q.subjectId])), []);

  const { total: points, byType, solvedIds } = useMemo(() => computePoints(attempts, typeMap), [attempts, typeMap]);
  const levelInfo = useMemo(() => computeLevel(points), [points]);
  const streak = useMemo(() => computeStreak(attempts), [attempts]);

  const subjectStats = useMemo(() => {
    const scoredBySubject = new Map<string, { correct: number; scored: number; name: string }>();
    const latestPerQuestion = new Map<string, string>();
    for (const a of attempts) if (!latestPerQuestion.has(a.question_id)) latestPerQuestion.set(a.question_id, a.result);
    for (const [qid, result] of latestPerQuestion) {
      if (result !== 'correct' && result !== 'incorrect') continue;
      const subjectId = subjectMap.get(qid);
      if (!subjectId) continue;
      const q = allQuestions.find(x => x.subjectId === subjectId)!;
      if (!scoredBySubject.has(subjectId)) scoredBySubject.set(subjectId, { correct: 0, scored: 0, name: q.subject });
      const s = scoredBySubject.get(subjectId)!;
      s.scored++;
      if (result === 'correct') s.correct++;
    }
    return [...scoredBySubject.entries()].map(([id, s]) => ({ id, name: s.name, scored: s.scored, accuracy: s.scored ? Math.round(s.correct / s.scored * 100) : 0 }));
  }, [attempts, subjectMap]);

  const subjectsAttemptedCount = useMemo(() => new Set(attempts.map(a => subjectMap.get(a.question_id)).filter(Boolean)).size, [attempts, subjectMap]);
  const natCorrectCount = useMemo(() => [...solvedIds].filter(id => typeMap.get(id) === 'nat').length, [solvedIds, typeMap]);

  const badgeCtx = { correctCount: solvedIds.size, longestStreak: streak.longest, subjectStats, natCorrectCount, subjectsAttemptedCount };
  const badges = useMemo(() => computeBadges(badgeCtx), [solvedIds, streak.longest, subjectStats, natCorrectCount, subjectsAttemptedCount]);
  const unlockedCount = badges.filter(b => b.unlocked).length;

  return (
    <div className="setup" style={{ maxWidth: 920 }}>
      <div className="page-title">
        <div><div className="eyebrow">Progress & rewards</div><h1>Achievements</h1><p>Points are earned once per question, the first time you solve it — no penalty for wrong attempts.</p></div>
      </div>

      {status && <div className="card notice">{status}</div>}

      <div className="card section" style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', background: 'var(--surface2)', backgroundImage: 'radial-gradient(circle at 88% 15%, var(--accent-glow), transparent 55%)' }}>
        <div className="icon-box" style={{ width: 52, height: 52 }}><Trophy size={24} /></div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="eyebrow">{levelInfo.level.name}</div>
          <div style={{ fontSize: 30, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '-.02em', color: 'var(--accent-strong)' }}>{points.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)' }}>points</span></div>
          <div className="progress" style={{ marginTop: 12, maxWidth: 420 }}><span style={{ width: `${levelInfo.progressPct}%` }} /></div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            {levelInfo.next ? `${levelInfo.pointsToNext} points to ${levelInfo.next.name}` : 'Maximum level reached'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>{solvedIds.size}</div><div className="muted" style={{ fontSize: 11 }}>Solved</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-strong)' }}>{unlockedCount}/{badges.length}</div><div className="muted" style={{ fontSize: 11 }}>Badges</div></div>
        </div>
      </div>

      <div className="card section" style={{ marginTop: 14 }}>
        <div className="section-head"><h3>Points by question type</h3></div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {(['mcq', 'msq', 'nat', 'descriptive'] as const).map(type => (
            <div key={type} className="card stat">
              <div className="label">{type.toUpperCase()}</div>
              <div className="value">{byType[type] ?? 0}</div>
              <div className="sub">{POINTS_BY_TYPE[type]} pts each</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card section" style={{ marginTop: 14 }}>
        <div className="section-head"><h3>Badges</h3><span className="muted" style={{ fontSize: 12 }}>{unlockedCount} of {badges.length} unlocked</span></div>
        <div style={{ display: 'flex', gap: 14, marginBottom: 16, fontSize: 11.5 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />Milestone</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', display: 'inline-block' }} />Streak</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />Mastery</span>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 12 }}>
          {badges.map(({ badge, unlocked, progress }) => {
            const tone = badge.category === 'streak' ? 'warning' : badge.category === 'mastery' ? 'success' : 'accent';
            const color = `var(--${tone})`;
            const soft = `var(--${tone}-soft)`;
            const Icon = BADGE_ICONS[badge.id] ?? Trophy;
            return (
              <div
                key={badge.id}
                className="card"
                title={badge.description}
                style={{
                  padding: '18px 12px 14px',
                  textAlign: 'center',
                  position: 'relative',
                  borderColor: unlocked ? color : undefined,
                  background: unlocked ? soft : undefined,
                  transition: 'background .2s, border-color .2s',
                }}
              >
                {unlocked && (
                  <CheckCircle2
                    size={16}
                    style={{ position: 'absolute', top: 8, right: 8, color, background: 'var(--bg)', borderRadius: '50%' }}
                  />
                )}
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    margin: '0 auto 10px',
                    display: 'grid',
                    placeItems: 'center',
                    background: unlocked ? color : 'var(--surface2)',
                    boxShadow: unlocked ? `0 6px 16px -6px ${color}` : 'none',
                    transition: 'background .2s, box-shadow .2s',
                  }}
                >
                  <Icon
                    size={30}
                    strokeWidth={unlocked ? 2.25 : 1.6}
                    style={{ color: unlocked ? '#fff' : 'var(--faint)', opacity: unlocked ? 1 : 0.55 }}
                  />
                </div>
                <b style={{ fontSize: 12.5, display: 'block', lineHeight: 1.25 }}>{badge.title}</b>
                {unlocked ? (
                  <div style={{ fontSize: 10.5, marginTop: 6, color, fontWeight: 600, letterSpacing: '.02em' }}>UNLOCKED</div>
                ) : (
                  <>
                    <div className="progress" style={{ marginTop: 9 }}><span style={{ width: `${Math.min(100, progress.current / progress.target * 100)}%`, background: color }} /></div>
                    <div className="muted" style={{ fontSize: 10.5, marginTop: 4, fontFamily: 'var(--font-mono)' }}>{progress.current}/{progress.target}</div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
