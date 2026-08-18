'use client';
import { useEffect,useMemo,useState } from 'react';
import { allQuestions,appStats } from '../../lib/data';
import { getCurrentUserId,loadAttempts } from '../../lib/persistence';
import { accuracyColor } from '../../lib/accuracyColor';
export default function Statistics(){
 const [attempts,setAttempts]=useState<any[]>([]); const [status,setStatus]=useState('');
 useEffect(()=>{(async()=>{const uid=await getCurrentUserId();if(!uid){setStatus('Sign in to populate personal performance statistics.');return}try{setAttempts(await loadAttempts(uid))}catch{setStatus('Could not load synchronized attempt history.')}})()},[]);
 const qmap=useMemo(()=>new Map(allQuestions.map(q=>[q.id,q])),[]);
 const scored=attempts.filter(a=>a.result==='correct'||a.result==='incorrect'); const correct=scored.filter(a=>a.result==='correct').length;
 const overallAccuracy=scored.length?Math.round(correct/scored.length*100):0;
 const byType=useMemo(()=>['mcq','msq','nat','descriptive'].map(type=>{const ids=new Set(allQuestions.filter(q=>q.type===type).map(q=>q.id));const rows=attempts.filter(a=>ids.has(a.question_id));const ev=rows.filter(a=>a.result==='correct'||a.result==='incorrect');return {type,count:rows.length,attempted:new Set(rows.map(a=>a.question_id)).size,accuracy:ev.length?Math.round(ev.filter(a=>a.result==='correct').length/ev.length*100):0}}),[attempts]);
 const bySubject=useMemo(()=>{const m=new Map<string,{total:number;attempted:Set<string>;correct:number;scored:number}>();for(const q of allQuestions){if(!m.has(q.subjectId))m.set(q.subjectId,{total:0,attempted:new Set(),correct:0,scored:0});m.get(q.subjectId)!.total++}for(const a of attempts){const q=qmap.get(a.question_id);if(!q)continue;const x=m.get(q.subjectId)!;x.attempted.add(q.id);if(a.result==='correct')x.correct++;if(a.result==='correct'||a.result==='incorrect')x.scored++}return [...m.entries()].map(([id,x])=>({id,name:allQuestions.find(q=>q.subjectId===id)!.subject,...x,accuracy:x.scored?Math.round(x.correct/x.scored*100):0})).sort((a,b)=>b.accuracy-a.accuracy)},[attempts,qmap]);
 return <><div className="page-title"><div><div className="eyebrow">Performance</div><h1>Statistics</h1><p>Personal metrics are derived from attempt history; dataset counts remain fixed.</p></div></div>{status&&<div className="card notice">{status}</div>}
 <div className="grid stats-grid">
   <div className="card stat"><div className="label">Questions attempted</div><div className="value">{new Set(attempts.map(a=>a.question_id)).size}</div></div>
   <div className="card stat"><div className="label">Correct attempts</div><div className="value" style={{color:'var(--success)'}}>{correct}</div></div>
   <div className="card stat"><div className="label">Incorrect attempts</div><div className="value" style={{color:'var(--danger)'}}>{scored.length-correct}</div></div>
   <div className="card stat"><div className="label">Accuracy</div><div className="value" style={{color:scored.length?accuracyColor(overallAccuracy):undefined}}>{overallAccuracy}%</div></div>
   <div className="card stat"><div className="label">MCQ</div><div className="value">{appStats.types.mcq}</div></div>
   <div className="card stat"><div className="label">MSQ</div><div className="value">{appStats.types.msq}</div></div>
   <div className="card stat"><div className="label">NAT</div><div className="value">{appStats.types.nat}</div></div>
   <div className="card stat"><div className="label">Descriptive</div><div className="value">{appStats.types.descriptive}</div></div>
 </div>
 <div className="grid two-col">
   <div className="card section"><div className="section-head"><h3>Question-type performance</h3></div>{byType.map(x=><div className="subject-row" key={x.type}><div><div className="subject-name">{x.type.toUpperCase()}</div><div className="subject-meta">{x.attempted} unique attempted · {x.count} attempts</div></div><span className="accuracy" style={{color:x.attempted?accuracyColor(x.accuracy):undefined}}>{x.attempted?`${x.accuracy}%`:'—'}</span><div className="progress"><span style={{width:`${x.attempted?x.accuracy:0}%`,background:x.attempted?accuracyColor(x.accuracy):undefined}}/></div></div>)}</div>
   <div className="card section"><div className="section-head"><h3>Subject performance</h3></div>{bySubject.map(x=><div className="subject-row" key={x.id}><div><div className="subject-name">{x.name}</div><div className="subject-meta">{x.attempted.size}/{x.total} attempted</div></div><span className="accuracy" style={{color:x.attempted.size?accuracyColor(x.accuracy):undefined}}>{x.attempted.size?`${x.accuracy}%`:'—'}</span><div className="progress"><span style={{width:`${x.total?x.attempted.size/x.total*100:0}%`,background:x.attempted.size?accuracyColor(x.accuracy):undefined}}/></div></div>)}</div>
 </div></>;
}
