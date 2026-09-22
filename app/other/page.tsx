'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ArrowRight, BookOpen, Compass, Eye, Layers, Sparkles, Target } from 'lucide-react';
import { allOtherQuestions, getOtherExams } from '../../lib/otherData';

export default function OtherExamsHub() {
  const exams = useMemo(() => getOtherExams(), []);
  const examStats = useMemo(() => {
    const stats: Record<string, { total: number; subjects: Set<string>; years: Set<number> }> = {};
    for (const q of allOtherQuestions) {
      if (!stats[q.exam]) {
        stats[q.exam] = { total: 0, subjects: new Set(), years: new Set() };
      }
      stats[q.exam].total++;
      if (q.subject) stats[q.exam].subjects.add(q.subject);
      if (q.year) stats[q.exam].years.add(q.year);
    }
    return stats;
  }, []);

  return (
    <div className="setup" style={{ maxWidth: 960 }}>
      <div className="page-title">
        <div>
          <div className="eyebrow">Companion Question Banks</div>
          <h1>Non-GATE Practice</h1>
          <p>Practice past questions and test sets from other premier examinations (ISRO, TIFR, and custom sets) separate from your main GATE CSE pool.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/other/browse" className="btn btn-soft">
            <Eye size={15} /> Browse all
          </Link>
          <Link href="/other/practice" className="btn btn-primary">
            <Target size={15} /> Start practice
          </Link>
        </div>
      </div>

      <div className="card continue" style={{ marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} /> Independent Practice Sandbox
          </div>
          <h2>{allOtherQuestions.length} Questions Available</h2>
          <p>Attempts and scores in this section are kept separate from your core GATE CSE analytics.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/other/practice" className="btn btn-primary">
            Quick practice <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      <div className="section-head" style={{ marginBottom: 12 }}>
        <h3>Available Exams & Collections</h3>
        <span className="pill">{exams.length} collections</span>
      </div>

      <div className="grid quick-grid" style={{ marginBottom: 24 }}>
        {exams.map(exam => {
          const s = examStats[exam] || { total: 0, subjects: new Set(), years: new Set() };
          return (
            <div key={exam} className="card quick" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="pill">{exam}</span>
                  <span className="muted" style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{s.total} questions</span>
                </div>
                <h4 style={{ fontSize: 17, marginTop: 12, marginBottom: 6 }}>{exam} Question Bank</h4>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
                  {s.subjects.size} subjects · {s.years.size > 0 ? `${Math.min(...s.years)}–${Math.max(...s.years)}` : 'Practice set'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                <Link href={`/other/practice?exam=${encodeURIComponent(exam)}`} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  Practice
                </Link>
                <Link href={`/other/browse?exam=${encodeURIComponent(exam)}`} className="btn btn-soft" style={{ flex: 1, justifyContent: 'center' }}>
                  Browse
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid launch-grid">
        <Link href="/other/practice" className="card quick">
          <div className="icon-box"><Target size={18} /></div>
          <h4>Practice Builder</h4>
          <p>Configure custom timer, feedback mode, and subject sets.</p>
        </Link>
        <Link href="/other/browse" className="card quick">
          <div className="icon-box"><Eye size={18} /></div>
          <h4>Read-Only Browse</h4>
          <p>Browse questions with answers revealed on demand.</p>
        </Link>
        <Link href="/practice" className="card quick">
          <div className="icon-box"><Compass size={18} /></div>
          <h4>GATE CSE Engine</h4>
          <p>Return to the main 3-Volume GATE CSE practice bank.</p>
        </Link>
      </div>
    </div>
  );
}
