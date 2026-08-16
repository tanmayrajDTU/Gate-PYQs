'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { allQuestions } from '../../lib/data';
import { getCurrentUserId, loadFlags } from '../../lib/persistence';

export default function Bookmarks() {
  const [ids, setIds] = useState<string[]>([]);
  const [status, setStatus] = useState('Loading saved questions…');
  useEffect(() => { (async () => { const uid = await getCurrentUserId(); if (!uid) { setStatus('Sign in to access your synchronized bookmarks.'); return; } try { const flags = await loadFlags(uid); setIds(Object.entries(flags).filter(([,v]) => v.bookmarked).map(([id]) => id)); setStatus(''); } catch { setStatus('Could not load bookmarks.'); } })(); }, []);
  const rows = useMemo(() => allQuestions.filter(q => ids.includes(q.id)), [ids]);
  return <Queue title="Bookmarks" eyebrow="Saved questions" description="Questions you explicitly bookmarked. Bookmark and revision states remain independent." rows={rows} empty={status || 'No bookmarked questions yet.'} action="Practice bookmarks" practiceHref="/practice?only=bookmarks" />;
}

function Queue({title,eyebrow,description,rows,empty,action,practiceHref}:{title:string;eyebrow:string;description:string;rows:typeof allQuestions;empty:string;action:string;practiceHref:string}){
 return <div className="setup"><div className="page-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{rows.length>0&&<Link className="btn btn-primary" href={practiceHref}>{action}</Link>}</div><div className="card section">{rows.length===0?<div className="empty">{empty}</div>:<div className="table-like">{rows.map(q=><div className="table-row" key={q.id}><span><b>{q.number} · {q.title}</b><div className="muted">{q.subject} · {q.topic} · {q.type.toUpperCase()}</div></span><span>{q.year ?? '—'}</span><span>{q.gateOverflowUrl&&<a href={q.gateOverflowUrl} target="_blank" rel="noreferrer" className="btn btn-soft">GateOverflow</a>}</span></div>)}</div>}</div></div>;
}
