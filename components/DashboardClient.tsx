'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpenCheck, Bookmark, RotateCcw, XCircle } from 'lucide-react';
import { allQuestions } from '../lib/data';
import { getCurrentUserId, loadAttempts, loadFlags } from '../lib/persistence';

export function DashboardClient(){
  const [attempts,setAttempts]=useState<any[]>([]); const [flags,setFlags]=useState<Record<string,{bookmarked:boolean;revision:boolean}>>({}); const [status,setStatus]=useState('');
  useEffect(()=>{(async()=>{const uid=await getCurrentUserId(); if(!uid){setStatus('Sign in to sync your preparation metrics across devices.');return;} try{const [a,f]=await Promise.all([loadAttempts(uid),loadFlags(uid)]);setAttempts(a);setFlags(f);}catch{setStatus('Could not load synchronized metrics. The dataset remains available.')}})()},[]);
  const metrics=useMemo(()=>{
    // attempts are loaded newest-first (see loadAttempts), so the first entry
    // per question is that question's latest result.
    const latest=new Map<string,string>();for(const a of attempts){if(!latest.has(a.question_id))latest.set(a.question_id,a.result)};
    const attempted=latest.size;
    // Correct/incorrect/accuracy are derived from each question's latest result,
    // not raw attempt rows, so they stay on the same "per question" basis as
    // `attempted` instead of double-counting retried questions.
    const results=[...latest.values()];
    const correct=results.filter(r=>r==='correct').length;
    const incorrect=results.filter(r=>r==='incorrect').length;
    const evaluable=correct+incorrect;
    return {attempted,correct,incorrect,evaluable,accuracy:evaluable?Math.round(correct/evaluable*100):0,bookmarks:Object.values(flags).filter(v=>v.bookmarked).length,revision:Object.values(flags).filter(v=>v.revision).length,latest}
  }, [attempts,flags]);
  const subjects=useMemo(()=>[...new Map(allQuestions.map(q=>[q.subjectId,q])).values()].map(q=>({id:q.subjectId,name:q.subject})).sort((a,b)=>a.name.localeCompare(b.name)),[]);
  const subjectStats=useMemo(()=>subjects.map(s=>{
    const ids=new Set(allQuestions.filter(q=>q.subjectId===s.id).map(q=>q.id));
    // Same "latest result per question" basis as the top-level metrics above,
    // so attempted/accuracy stay consistent instead of accuracy double-counting retries.
    const latestForSubject=[...metrics.latest.entries()].filter(([qid])=>ids.has(qid)).map(([,r])=>r);
    const ev=latestForSubject.filter(r=>r==='correct'||r==='incorrect');
    return {...s,total:ids.size,attempted:latestForSubject.length,accuracy:ev.length?Math.round(ev.filter(r=>r==='correct').length/ev.length*100):0}
  }),[subjects,metrics.latest]);
  return <><div className="page-title"><div><div className="eyebrow">Your preparation cockpit</div><h1>GATE PYQ Practice</h1><p>Practice, review and track the fixed Volume 1–3 question bank.</p></div><Link href="/practice" className="btn btn-primary">Start practice <ArrowRight size={16}/></Link></div>
  {status&&<div className="card notice">{status}<Link href="/login" className="btn btn-soft">Sign in</Link></div>}
  <div className="card continue"><div style={{flex:1}}><div className="eyebrow">Continue preparation</div><h2>{metrics.attempted?`${metrics.attempted} questions attempted`:'Start your first focused session'}</h2><p>{metrics.evaluable?`${metrics.accuracy}% accuracy across ${metrics.evaluable} scored attempts.`:'Choose volume, subject, topic, year and question type before you begin.'}</p><div className="progress"><span style={{width:`${Math.min(100,metrics.attempted/allQuestions.length*100)}%`}}/></div></div><Link href="/practice" className="btn" style={{background:'#fff',color:'#171b2d'}}>Practice now <ArrowRight size={16}/></Link></div>
  <div className="grid stats-grid" style={{marginTop:18}}>{[['Attempted',metrics.attempted],['Correct',metrics.correct],['Incorrect',metrics.incorrect],['Accuracy',`${metrics.accuracy}%`],['Bookmarks',metrics.bookmarks],['Revision',metrics.revision],['Question bank',allQuestions.length.toLocaleString()],['Subjects',subjects.length]].map(([l,v])=><div className="card stat" key={String(l)}><div className="label">{l}</div><div className="value">{v}</div><div className="sub">{l==='Attempted'?`${Math.round(metrics.attempted/allQuestions.length*100)}% of bank`:l==='Accuracy'?'Scored attempts':'Persistent preparation data'}</div></div>)}</div>
  <div className="grid two-col"><div className="card section"><div className="section-head"><h3>Subject coverage</h3><Link href="/subjects">View all</Link></div>{subjectStats.slice(0,10).map(s=><div className="subject-row" key={s.id}><div><div className="subject-name">{s.name}</div><div className="subject-meta">{s.attempted}/{s.total} attempted</div></div><span className="accuracy">{s.attempted?`${s.accuracy}%`:'—'}</span><div className="progress"><span style={{width:`${s.total?s.attempted/s.total*100:0}%`}}/></div></div>)}</div><div className="grid quick-grid"><Quick href="/practice" icon={<BookOpenCheck/>} title="Practice" text="Build a targeted question set."/><Quick href="/bookmarks" icon={<Bookmark/>} title="Bookmarks" text={`${metrics.bookmarks} saved questions.`}/><Quick href="/incorrect" icon={<XCircle/>} title="Incorrect" text={`${metrics.incorrect} incorrect attempts.`}/><Quick href="/revision" icon={<RotateCcw/>} title="Revision" text={`${metrics.revision} questions in revision.`}/></div></div></>;
}
function Quick({href,icon,title,text}:{href:string;icon:React.ReactNode;title:string;text:string}){return <Link href={href} className="card quick"><div className="icon-box">{icon}</div><h4>{title}</h4><p>{text}</p></Link>}
