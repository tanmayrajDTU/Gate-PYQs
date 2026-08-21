'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BarChart3, BookOpenCheck, Bookmark, CalendarClock, Flame, Layers, Minus, Plus, RotateCcw, Target, Trophy, XCircle } from 'lucide-react';
import { allQuestions, getSubjects } from '../lib/data';
import { getCurrentUserId, loadAttempts, loadFlags, type FlagRow } from '../lib/persistence';
import { computeStreak, daysUntil, dayKey } from '../lib/spacedRepetition';
import { computePoints, computeLevel, computeBadges, computeRedemptionCount, hasPerfectWeek, computeReviewPoints, mergeActivityDates, BadgeContext } from '../lib/gamification';
import { StreakHeatmap } from './StreakHeatmap';
import { formatNumber } from '../lib/format';

const GATE_DATE = new Date('2027-02-07T00:00:00');
const DAILY_GOAL_KEY = 'dailyGoal';
const DEFAULT_DAILY_GOAL = 15;
const SUBJECT_COUNT = new Set(allQuestions.map(q => q.subjectId)).size;

function ProgressRing({ pct }: { pct: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" className="progress-ring">
      <circle cx="38" cy="38" r={r} fill="none" stroke="var(--track-bg)" strokeWidth="6" />
      <circle cx="38" cy="38" r={r} fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} transform="rotate(-90 38 38)" />
      <text x="38" y="43" textAnchor="middle" className="progress-ring-label">{pct}%</text>
    </svg>
  );
}

export function DashboardClient(){
  const [attempts,setAttempts]=useState<any[]>([]); const [flags,setFlags]=useState<Record<string,FlagRow>>({}); const [status,setStatus]=useState('');
  const [dailyGoal, setDailyGoal] = useState(DEFAULT_DAILY_GOAL);

  useEffect(()=>{(async()=>{const uid=await getCurrentUserId(); if(!uid){setStatus('Sign in to sync your preparation metrics across devices.');return;} try{const [a,f]=await Promise.all([loadAttempts(uid),loadFlags(uid)]);setAttempts(a);setFlags(f);}catch{setStatus('Could not load synchronized metrics. The dataset remains available.')}})()},[]);

  useEffect(() => {
    try { const saved = localStorage.getItem(DAILY_GOAL_KEY); if (saved) setDailyGoal(Number(saved)); } catch {}
  }, []);

  function adjustGoal(delta: number) {
    setDailyGoal(g => {
      const next = Math.max(1, g + delta);
      try { localStorage.setItem(DAILY_GOAL_KEY, String(next)); } catch {}
      return next;
    });
  }

  const metrics=useMemo(()=>{
    const latest=new Map<string,string>();for(const a of attempts){if(!latest.has(a.question_id))latest.set(a.question_id,a.result)};
    const attempted=latest.size;
    const results=[...latest.values()];
    const correct=results.filter(r=>r==='correct').length;
    const incorrect=results.filter(r=>r==='incorrect').length;
    const evaluable=correct+incorrect;
    const now=Date.now();
    const revisionDue=Object.values(flags).filter(v=>v.revision && (!v.nextReviewAt || new Date(v.nextReviewAt).getTime()<=now)).length;
    return {attempted,correct,incorrect,evaluable,accuracy:evaluable?Math.round(correct/evaluable*100):0,bookmarks:Object.values(flags).filter(v=>v.bookmarked).length,revision:Object.values(flags).filter(v=>v.revision).length,revisionDue,latest}
  }, [attempts,flags]);

  // Streak/heatmap should reflect revision-review days too, not just fresh
  // practice attempts — see mergeActivityDates for why lastReviewedAt
  // specifically (not question_flags.updated_at) is the source for this.
  const activityDates = useMemo(() => mergeActivityDates(attempts, flags), [attempts, flags]);
  const streak = useMemo(() => computeStreak(activityDates), [activityDates]);
  const todayCount = useMemo(() => {
    const today = dayKey(new Date());
    return attempts.filter(a => dayKey(new Date(a.attempted_at)) === today).length;
  }, [attempts]);
  // Computed from Date.now() and rendered as text directly — must not run
  // during the server prerender of this static page, or the number gets
  // frozen at build time and mismatches the real value on hydration (the
  // same class of bug as StreakHeatmap). Compute it client-side only.
  const [gateDaysLeft, setGateDaysLeft] = useState<number | null>(null);
  useEffect(() => { setGateDaysLeft(daysUntil(GATE_DATE)); }, []);
  const overallPct = Math.round(Math.min(100, metrics.attempted / allQuestions.length * 100));

  const typeMap = useMemo(() => new Map(allQuestions.map(q => [q.id, q.type])), []);
  const subjectMap = useMemo(() => new Map(allQuestions.map(q => [q.id, q.subjectId])), []);
  const topicMap = useMemo(() => new Map(allQuestions.map(q => [q.id, q.topicId])), []);
  const yearMap = useMemo(() => new Map(allQuestions.map(q => [q.id, q.year])), []);
  const subjectsTotalCount = useMemo(() => getSubjects().length, []);
  const { total: solvePoints, solvedIds } = useMemo(() => computePoints(attempts, typeMap), [attempts, typeMap]);
  const reviewPoints = useMemo(() => computeReviewPoints(flags), [flags]);
  const points = solvePoints + reviewPoints;
  const levelInfo = useMemo(() => computeLevel(points), [points]);
  const badgeCtx: BadgeContext = useMemo(() => {
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
    const subjectStats = [...scoredBySubject.entries()].map(([id, s]) => ({ id, name: s.name, scored: s.scored, accuracy: s.scored ? Math.round(s.correct / s.scored * 100) : 0 }));
    const subjectsAttemptedCount = new Set(attempts.map(a => subjectMap.get(a.question_id)).filter(Boolean)).size;
    const natCorrectCount = [...solvedIds].filter(id => typeMap.get(id) === 'nat').length;
    const msqCorrectCount = [...solvedIds].filter(id => typeMap.get(id) === 'msq').length;
    const mcqCorrectCount = [...solvedIds].filter(id => typeMap.get(id) === 'mcq').length;
    const descriptiveCorrectCount = [...solvedIds].filter(id => typeMap.get(id) === 'descriptive').length;
    const totalAttemptedCount = new Set(attempts.map(a => a.question_id)).size;
    const topicsAttemptedCount = new Set(attempts.map(a => topicMap.get(a.question_id)).filter(Boolean)).size;
    const attemptedTypesCount = new Set(attempts.map(a => typeMap.get(a.question_id)).filter(Boolean)).size;
    const yearsAttemptedCount = new Set(attempts.map(a => yearMap.get(a.question_id)).filter(Boolean)).size;
    const redemptionCount = computeRedemptionCount(attempts);
    const totalReviewCount = Object.values(flags).reduce((sum, f) => sum + (f.reviewCount ?? 0), 0);
    const activeRevisionCount = Object.values(flags).filter(f => f.revision).length;
    return {
      correctCount: solvedIds.size, longestStreak: streak.longest, subjectStats, natCorrectCount, subjectsAttemptedCount,
      msqCorrectCount, mcqCorrectCount, descriptiveCorrectCount, totalAttemptedCount, topicsAttemptedCount,
      subjectsTotalCount, attemptedTypesCount, yearsAttemptedCount, redemptionCount, hasPerfectWeek: hasPerfectWeek(activityDates),
      totalReviewCount, activeRevisionCount,
    };
  }, [attempts, flags, subjectMap, topicMap, yearMap, subjectsTotalCount, solvedIds, streak.longest, typeMap, activityDates]);
  const badges = useMemo(() => computeBadges(badgeCtx), [badgeCtx]);
  const nextBadge = badges.filter(b => !b.unlocked).sort((a, b) => (b.progress.current / b.progress.target) - (a.progress.current / a.progress.target))[0];

  return <>
  <div className="page-title"><div><div className="eyebrow">Your preparation cockpit</div><h1>GATE PYQ Practice</h1><p>Practice, review and track the fixed Volume 1–3 question bank.</p></div><Link href="/practice" className="btn btn-primary">Start practice <ArrowRight size={16}/></Link></div>
  {status&&<div className="card notice">{status}<Link href="/login" className="btn btn-soft">Sign in</Link></div>}

  <div className="card continue"><div style={{flex:1}}><div className="eyebrow">Continue preparation</div><h2>{metrics.attempted?`${metrics.attempted} questions attempted`:'Start your first focused session'}</h2><p>{metrics.evaluable?`${metrics.accuracy}% accuracy across ${metrics.evaluable} scored attempts.`:'Choose volume, subject, topic, year and question type before you begin.'}</p><div className="progress"><span style={{width:`${overallPct}%`}}/></div></div><div style={{display:'flex',alignItems:'center',gap:22}}><ProgressRing pct={overallPct}/><Link href="/practice" className="btn btn-primary">Practice now <ArrowRight size={16}/></Link></div></div>

  <div className="grid pulse-grid" style={{marginTop:14}}>
    <div className="card stat">
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}><div className="icon-box tone-warning" style={{width:30,height:30}}><Flame size={15}/></div><div className="label" style={{marginBottom:0}}>Streak</div></div>
      <div className="value">{streak.current}<span style={{fontSize:13,fontWeight:500,color:'var(--muted)'}}> day{streak.current===1?'':'s'}</span></div>
      <div className="sub">Best: {streak.longest} day{streak.longest===1?'':'s'}</div>
    </div>
    <div className="card stat">
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}><div className="icon-box" style={{width:30,height:30}}><Target size={15}/></div><div className="label" style={{marginBottom:0}}>Today&apos;s goal</div>
        <span style={{marginLeft:'auto',display:'flex',gap:4}}>
          <button className="icon-btn" style={{width:24,height:24}} onClick={()=>adjustGoal(-1)}><Minus size={12}/></button>
          <button className="icon-btn" style={{width:24,height:24}} onClick={()=>adjustGoal(1)}><Plus size={12}/></button>
        </span>
      </div>
      <div className="value">{todayCount}<span style={{fontSize:13,fontWeight:500,color:'var(--muted)'}}> / {dailyGoal}</span></div>
      <div className="progress" style={{marginTop:9}}><span style={{width:`${Math.min(100,todayCount/dailyGoal*100)}%`}}/></div>
    </div>
    <div className="card stat">
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}><div className="icon-box tone-danger" style={{width:30,height:30}}><CalendarClock size={15}/></div><div className="label" style={{marginBottom:0}}>GATE CSE 2027</div></div>
      <div className="value">{gateDaysLeft ?? '—'}<span style={{fontSize:13,fontWeight:500,color:'var(--muted)'}}> days left</span></div>
      <div className="sub">Feb 7, 2027</div>
    </div>
  </div>

  <Link href="/achievements" className="card section" style={{marginTop:14,display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'}}>
    <div className="icon-box" style={{width:44,height:44}}><Trophy size={20}/></div>
    <div style={{flex:1,minWidth:200}}>
      <div style={{display:'flex',alignItems:'baseline',gap:8}}><b style={{fontSize:15}}>{levelInfo.level.name}</b><span className="muted" style={{fontSize:12,fontFamily:'var(--font-mono)'}}>{formatNumber(points)} pts</span></div>
      <div className="progress" style={{marginTop:8,maxWidth:360}}><span style={{width:`${levelInfo.progressPct}%`}}/></div>
    </div>
    {nextBadge && <div className="muted" style={{fontSize:12}}>Next: <b style={{color:'var(--text)'}}>{nextBadge.badge.title}</b> ({nextBadge.progress.current}/{nextBadge.progress.target})</div>}
    <ArrowRight size={16} className="muted"/>
  </Link>

  <div className="card section" style={{marginTop:14}}>
    <div className="section-head"><h3>Practice activity</h3></div>
    <StreakHeatmap attempts={activityDates} />
  </div>

  <div className="section-head" style={{marginTop:20,marginBottom:2}}><h3 style={{fontSize:13,textTransform:'uppercase',letterSpacing:'.04em',color:'var(--muted)',fontWeight:600}}>Jump to</h3></div>
  <div className="grid launch-grid">
    <Quick href="/practice" icon={<BookOpenCheck/>} title="Practice" text="Build a targeted question set."/>
    <Quick href="/subjects" icon={<Layers/>} title="Subjects" text={`${SUBJECT_COUNT} subjects · ${formatNumber(allQuestions.length)} questions`}/>
    <Quick href="/statistics" icon={<BarChart3/>} title="Statistics" text={metrics.evaluable?`${metrics.accuracy}% accuracy overall`:'Full performance breakdown'}/>
    <Quick href="/bookmarks" icon={<Bookmark/>} title="Bookmarks" text={`${metrics.bookmarks} saved question${metrics.bookmarks===1?'':'s'}`} tone="warning"/>
    <Quick href="/incorrect" icon={<XCircle/>} title="Incorrect" text={`${metrics.incorrect} to review`} tone="danger"/>
    <Quick href="/revision" icon={<RotateCcw/>} title="Revision" text={metrics.revisionDue?`${metrics.revisionDue} due now`:`${metrics.revision} scheduled`} tone="success"/>
  </div>
  </>;
}
function Quick({href,icon,title,text,tone}:{href:string;icon:React.ReactNode;title:string;text:string;tone?:'success'|'danger'|'warning'}){return <Link href={href} className="card quick"><div className={`icon-box${tone?` tone-${tone}`:''}`}>{icon}</div><h4>{title}</h4><p>{text}</p></Link>}
