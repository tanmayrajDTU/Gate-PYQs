'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {BookOpenCheck,Bookmark,ChartNoAxesCombined,Eye,Home,Menu,RotateCcw,Settings2,Target,XCircle,X} from 'lucide-react';
import {useState} from 'react';
import {UserMenu} from './UserMenu';
import {ThemeToggle} from './ThemeToggle';
const nav=[['/','Dashboard',Home],['/practice','Practice',Target],['/browse','Browse',Eye],['/subjects','Subjects',BookOpenCheck],['/bookmarks','Bookmarks',Bookmark],['/incorrect','Incorrect',XCircle],['/revision','Revision',RotateCcw],['/statistics','Statistics',ChartNoAxesCombined]] as const;
export function AppShell({children}:{children:React.ReactNode}){const path=usePathname();const [open,setOpen]=useState(false);return <div className="app"><aside className={open?'sidebar open':'sidebar'}><div className="brand"><div className="brand-mark">G</div><div><b>GATE Practice</b><span>PYQ Engine</span></div><button className="icon-btn mobile-only" onClick={()=>setOpen(false)}><X/></button></div><nav>{nav.map(([href,label,Icon])=><Link key={href} href={href} onClick={()=>setOpen(false)} className={path===href?'active':''}><Icon size={18}/><span>{label}</span></Link>)}</nav><div className="sidebar-bottom"><Link href="/settings"><Settings2 size={18}/>Settings</Link><div className="mobile-only" style={{padding:'6px 12px'}}><ThemeToggle/></div></div></aside><div className="main"><header className="topbar"><button className="icon-btn mobile-only" onClick={()=>setOpen(true)}><Menu/></button><div className="crumb">GATE CSE · Practice Engine</div><div className="top-actions"><span className="status-dot"/> <ThemeToggle/> <UserMenu/></div></header><main>{children}</main></div></div>}
