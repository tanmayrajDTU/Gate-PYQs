'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpenCheck, Bookmark, Flame, Minus, Plus, RotateCcw, Target, XCircle } from 'lucide-react';
import { allQuestions } from '../lib/data';
import { getCurrentUserId, loadAttempts, loadFlags } from '../lib/persistence';
import { computeStreak, daysUntil, dayKey } from '../lib/spacedRepetition';
import { StreakHeatmap } from './StreakHeatmap';

const GATE_DATE = new Date('2027-02-07T00:00:00');
const DAILY_GOAL_KEY = 'dailyGoal';
const DEFAULT_DAILY_GOAL = 15;

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
  const [attempts,setAttempts]=useState<any[]>([]); const [flags,setFlags]=useState<Record<string,{bookmarked:boolean;revision:boolean}>>({}); const [status,setStatus]=useState('');
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
    return {attempted,correct,incorrect,evaluable,accuracy:evaluable?Math.round(correct/evaluable*100):0,bookmarks:Object.values(flags).filter(v=>v.bookmarked).length,revision:Object.values(flags).filter(v=>v.revision).length,latest}
  }, [attempts,flags]);

  const subjects=useMemo(()=>[...new Map(allQuestions.map(q=>[q.subjectId,q])).values()].map(q=>({id:q.subjectId,name:q.subject})).sort((a,b)=>a.name.localeCompare(b.name)),[]);
  const subjectStats=useMemo(()=>subjects.map(s=>{
    const ids=new Set(allQuestions.filter(q=>q.subjectId===s.id).map(q=>q.id));
    const latestForSubject=[...metrics.latest.entries()].filter(([qid])=>ids.has(qid)).map(([,r])=>r);
    const ev=latestForSubject.filter(r=>r==='correct'||r==='incorrect');
    return {...s,total:ids.size,attempted:latestForSubject.length,accuracy:ev.length?Math.round(ev.filter(r=>r==='correct').length/ev.length*100):0,evaluable:ev.length}
  }),[subjects,metrics.latest]);

  const focusAreas = useMemo(() => subjectStats.filter(s => s.evaluable >= 3).sort((a, b) => a.accuracy - b.accuracy).slice(0, 4), [subjectStats]);

  const streak = useMemo(() => computeStreak(attempts), [attempts]);
  const todayCount = useMemo(() => {
    const today = dayKey(new Date());
    return attempts.filter(a => dayKey(new Date(a.attempted_at)) === today).length;
  }, [attempts]);
  const gateDaysLeft = daysUntil(GATE_DATE);

  return <><div className="page-title"><div><div className="eyebrow">Your preparation cockpit</div><h1>GATE PYQ Practice</h1><p>Practice, review and track the fixed Volume 1–3 question bank.</p></div><Link href="/practice" className="btn btn-primary">Start practice <ArrowRight size={16}/></Link></div>
  {status&&<div className="card notice">{status}<Link href="/login" className="btn btn-soft">Sign in</Link></div>}
  <div className="card continue"><div style={{flex:1}}><div className="eyebrow">Continue preparation</div><h2>{metrics.attempted?`${metrics.attempted} questions attempted`:'Start your first focused session'}</h2><p>{metrics.evaluable?`${metrics.accuracy}% accuracy across ${metrics.evaluable} scored attempts.`:'Choose volume, subject, topic, year and question type before you begin.'}</p><div className="progress"><span style={{width:`${Math.min(100,metrics.attempted/allQuestions.length*100)}%`}}/></div></div><div style={{display:'flex',alignItems:'center',gap:22}}><ProgressRing pct={Math.round(Math.min(100,metrics.attempted/allQuestions.length*100))}/><Link href="/practice" className="btn btn-primary">Practice now <ArrowRight size={16}/></Link></div></div>

  <div className="grid pulse-grid" style={{marginTop:14}}>
    <div className="card stat">
      <div className="label">Streak</div>
      <div className="value" style={{display:'flex',alignItems:'baseline',gap:6}}><Flame size={18} style={{color:'var(--warning)'}}/>{streak.current}<span style={{fontSize:13,fontWeight:500,color:'var(--muted)'}}>day{streak.current===1?'':'s'}</span></div>
      <div className="sub">Best: {streak.longest} day{streak.longest===1?'':'s'}</div>
    </div>
    <div className="card stat">
      <div className="label">Today&apos;s goal</div>
      <div className="value" style={{display:'flex',alignItems:'center',gap:8}}>
        <Target size={18} style={{color:'var(--accent)'}}/>{todayCount}<span style={{fontSize:13,fontWeight:500,color:'var(--muted)'}}>/ {dailyGoal}</span>
        <span style={{marginLeft:'auto',display:'flex',gap:4}}>
          <button className="icon-btn" style={{width:24,height:24}} onClick={()=>adjustGoal(-1)}><Minus size={12}/></button>
          <button className="icon-btn" style={{width:24,height:24}} onClick={()=>adjustGoal(1)}><Plus size={12}/></button>
        </span>
      </div>
      <div className="progress" style={{marginTop:9}}><span style={{width:`${Math.min(100,todayCount/dailyGoal*100)}%`}}/></div>
    </div>
    <div className="card stat">
      <div className="label">GATE CSE 2027</div>
      <div className="value">{gateDaysLeft}<span style={{fontSize:13,fontWeight:500,color:'var(--muted)'}}> days left</span></div>
      <div className="sub">Feb 7, 2027</div>
    </div>
  </div>

  <div className="grid stats-grid" style={{marginTop:14}}>{[['Attempted',metrics.attempted],['Correct',metrics.correct],['Incorrect',metrics.incorrect],['Accuracy',`${metrics.accuracy}%`],['Bookmarks',metrics.bookmarks],['Revision',metrics.revision],['Question bank',allQuestions.length.toLocaleString()],['Subjects',subjects.length]].map(([l,v])=><div className="card stat" key={String(l)}><div className="label">{l}</div><div className="value">{v}</div><div className="sub">{l==='Attempted'?`${Math.round(metrics.attempted/allQuestions.length*100)}% of bank`:l==='Accuracy'?'Scored attempts':'Persistent preparation data'}</div></div>)}</div>

  <div className="card section" style={{marginTop:14}}>
    <div className="section-head"><h3>Practice activity</h3></div>
    <StreakHeatmap attempts={attempts} />
  </div>

  <div className="grid two-col" style={{marginTop:14}}>
    <div className="grid" style={{gap:14}}>
      {focusAreas.length > 0 && (
        <div className="card section">
          <div className="section-head"><h3>Focus areas</h3><span className="muted" style={{fontSize:12}}>Lowest accuracy</span></div>
          {focusAreas.map(s => (
            <div className="subject-row" key={s.id}>
              <div><div className="subject-name">{s.name}</div><div className="subject-meta">{s.attempted}/{s.total} attempted</div></div>
              <span className="accuracy" style={{color: s.accuracy < 50 ? 'var(--danger)' : 'var(--text)'}}>{s.accuracy}%</span>
              <div className="progress"><span style={{width:`${s.accuracy}%`, background: s.accuracy < 50 ? 'var(--danger)' : 'var(--accent)'}}/></div>
            </div>
          ))}
        </div>
      )}
      <div className="card section"><div className="section-head"><h3>Subject coverage</h3><Link href="/subjects">View all</Link></div>{subjectStats.slice(0,10).map(s=><div className="subject-row" key={s.id}><div><div className="subject-name">{s.name}</div><div className="subject-meta">{s.attempted}/{s.total} attempted</div></div><span className="accuracy">{s.attempted?`${s.accuracy}%`:'—'}</span><div className="progress"><span style={{width:`${s.total?s.attempted/s.total*100:0}%`}}/></div></div>)}</div>
    </div>
    <div className="grid quick-grid"><Quick href="/practice" icon={<BookOpenCheck/>} title="Practice" text="Build a targeted question set."/><Quick href="/bookmarks" icon={<Bookmark/>} title="Bookmarks" text={`${metrics.bookmarks} saved questions.`}/><Quick href="/incorrect" icon={<XCircle/>} title="Incorrect" text={`${metrics.incorrect} incorrect attempts.`}/><Quick href="/revision" icon={<RotateCcw/>} title="Revision" text={`${metrics.revision} questions in revision.`}/></div>
  </div></>;
}
function Quick({href,icon,title,text}:{href:string;icon:React.ReactNode;title:string;text:string}){return <Link href={href} className="card quick"><div className="icon-box">{icon}</div><h4>{title}</h4><p>{text}</p></Link>}
