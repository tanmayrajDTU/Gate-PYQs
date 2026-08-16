'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

export function UserMenu() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setEmail(session?.user?.email ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);
  if (!email) return <Link href="/login" className="btn btn-soft" style={{padding:'7px 10px',marginLeft:8}}>Login</Link>;
  return <div style={{display:'flex',alignItems:'center',gap:8}}><span className="muted" style={{fontSize:12,maxWidth:170,overflow:'hidden',textOverflow:'ellipsis'}}>{email}</span><button className="btn btn-soft" style={{padding:'7px 10px'}} onClick={() => void supabase?.auth.signOut()}>Logout</button></div>;
}
