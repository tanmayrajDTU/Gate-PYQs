'use client';
import { useState } from 'react';
import { ListPlus } from 'lucide-react';
import type { Question } from '../lib/types';
import { getCurrentUserId, setQuestionFlags, type FlagRow } from '../lib/persistence';
import { DEFAULT_SM2_STATE } from '../lib/spacedRepetition';

/**
 * Bulk-adds every not-yet-revision question in `rows` to the SM-2 revision
 * queue in one click — without needing to re-attempt each one first (the
 * only other way in was toggling "Revise" mid-practice or grading right
 * after a session). Uses setQuestionFlags with revision=true, so each
 * question shows up "due now" on the Revision page ready to be graded.
 *
 * Preserves each question's existing bookmarked state explicitly, since
 * setQuestionFlags's upsert always writes whatever `bookmarked` value it's
 * given — passing the wrong one would silently un-bookmark a question.
 */
export function AddAllToRevisionButton({ rows, flags, onFlagsChange }: {
  rows: Question[];
  flags: Record<string, FlagRow>;
  onFlagsChange: (next: Record<string, FlagRow>) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  if (rows.length === 0) return null;

  const notYetRevision = rows.filter(q => !flags[q.id]?.revision);

  async function addAll() {
    if (notYetRevision.length === 0 || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const uid = await getCurrentUserId();
      if (!uid) { setMessage('Sign in to add these to your revision schedule.'); return; }
      for (const q of notYetRevision) {
        await setQuestionFlags(uid, q.id, flags[q.id]?.bookmarked ?? false, true, flags[q.id]?.revision ?? false);
      }
      const added = notYetRevision.length;
      onFlagsChange({
        ...flags,
        ...Object.fromEntries(notYetRevision.map(q => [q.id, {
          bookmarked: flags[q.id]?.bookmarked ?? false,
          revision: true,
          sm2: DEFAULT_SM2_STATE,
          nextReviewAt: new Date().toISOString(),
          reviewCount: flags[q.id]?.reviewCount ?? 0,
          lastReviewedAt: flags[q.id]?.lastReviewedAt ?? null,
        }])),
      });
      setMessage(`Added ${added} question${added === 1 ? '' : 's'} to your revision queue.`);
    } catch (error) {
      console.error(error);
      setMessage('Could not add these to your revision schedule — check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button className="btn btn-soft" onClick={() => void addAll()} disabled={busy || notYetRevision.length === 0}>
        <ListPlus size={16} /> {notYetRevision.length === 0 ? 'All in revision queue' : busy ? 'Adding…' : `Add all to revision (${notYetRevision.length})`}
      </button>
      {message && <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>{message}</div>}
    </div>
  );
}
