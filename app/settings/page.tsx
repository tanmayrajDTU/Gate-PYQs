'use client';
import { useState } from 'react';
import { Download } from 'lucide-react';
import { getCurrentUserId, exportAllUserData } from '../../lib/persistence';

export default function Settings() {
  const [status, setStatus] = useState('');
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    setStatus('');
    try {
      const uid = await getCurrentUserId();
      if (!uid) { setStatus('Sign in to export your synchronized data.'); return; }
      const data = await exportAllUserData(uid);
      if (!data) { setStatus('Export is unavailable right now.'); return; }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gate-practice-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus(`Exported ${data.questionAttempts.length} attempt(s), ${data.questionFlags.length} saved/revision item(s), and ${data.practiceSessions.length} session(s).`);
    } catch (error) {
      console.error(error);
      setStatus('Could not complete the export — check your connection and try again.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="setup">
      <div className="page-title">
        <div><div className="eyebrow">Account</div><h1>Settings</h1><p>Supabase authentication and cross-device progress are part of the production configuration.</p></div>
      </div>

      <div className="card section">
        <h3>Authentication</h3>
        <p className="muted">Email/password sign-in with email verification is supported by the Supabase integration. Add your project environment variables to enable account persistence.</p>
        <pre style={{ background: '#171b2d', color: '#eef0ff', padding: 16, borderRadius: 12, overflow: 'auto' }}>NEXT_PUBLIC_SUPABASE_URL=...{`\n`}NEXT_PUBLIC_SUPABASE_ANON_KEY=...</pre>
      </div>

      <div className="card section" style={{ marginTop: 16 }}>
        <h3>Export your data</h3>
        <p className="muted">Download every attempt, bookmark/revision flag, and practice session tied to your account as a single JSON file — a backup independent of this app, in case you ever want to migrate or just keep your own copy.</p>
        <button className="btn btn-primary" style={{ marginTop: 4 }} onClick={() => void handleExport()} disabled={exporting}>
          <Download size={16} /> {exporting ? 'Exporting…' : 'Export my data'}
        </button>
        {status && <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>{status}</p>}
      </div>
    </div>
  );
}
