import { supabase } from './supabase';
import { sm2Review, sm2StateFromLegacyBox, DEFAULT_SM2_STATE, type Sm2State, type Grade } from './spacedRepetition';

export type UserState = { userId: string | null };

export async function getCurrentUserId() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Question ids this user has ever answered correctly — used to award first-time points exactly once. */
export async function loadCorrectQuestionIds(userId: string): Promise<Set<string>> {
  if (!supabase) return new Set();
  const { data, error } = await supabase.from('question_attempts').select('question_id').eq('user_id', userId).eq('result', 'correct');
  if (error) throw error;
  return new Set((data ?? []).map(r => r.question_id));
}

export type FlagRow = { bookmarked: boolean; revision: boolean; sm2: Sm2State; nextReviewAt: string | null };

export async function loadFlags(userId: string): Promise<Record<string, FlagRow>> {
  if (!supabase) return {} as Record<string, FlagRow>;
  const { data, error } = await supabase
    .from('question_flags')
    .select('question_id,bookmarked,revision,box,next_review_at,ease_factor,interval_days,repetitions')
    .eq('user_id', userId);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map(row => {
    // Rows created before the SM-2 migration only have the old `box` value —
    // convert those on the fly rather than requiring a separate backfill pass.
    const sm2: Sm2State = row.ease_factor != null
      ? { easeFactor: row.ease_factor, intervalDays: row.interval_days ?? 0, repetitions: row.repetitions ?? 0 }
      : sm2StateFromLegacyBox(row.box ?? 1);
    return [row.question_id, { bookmarked: !!row.bookmarked, revision: !!row.revision, sm2, nextReviewAt: row.next_review_at }];
  }));
}

export async function setQuestionFlags(userId: string, questionId: string, bookmarked: boolean, revision: boolean, priorRevision = false) {
  if (!supabase) return;
  const payload: Record<string, unknown> = {
    user_id: userId,
    question_id: questionId,
    bookmarked,
    revision,
    updated_at: new Date().toISOString(),
  };
  // Starting a fresh revision cycle: reset SM-2 state and make it due right away.
  if (revision && !priorRevision) {
    payload.ease_factor = DEFAULT_SM2_STATE.easeFactor;
    payload.interval_days = DEFAULT_SM2_STATE.intervalDays;
    payload.repetitions = DEFAULT_SM2_STATE.repetitions;
    payload.next_review_at = new Date().toISOString();
  }
  const { error } = await supabase.from('question_flags').upsert(payload, { onConflict: 'user_id,question_id' });
  if (error) throw error;
}

export async function reviewRevisionCard(userId: string, questionId: string, currentState: Sm2State, grade: Grade) {
  if (!supabase) return;
  const { state, nextReviewAt } = sm2Review(currentState, grade);
  const { error } = await supabase.from('question_flags').update({
    ease_factor: state.easeFactor,
    interval_days: state.intervalDays,
    repetitions: state.repetitions,
    next_review_at: nextReviewAt.toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId).eq('question_id', questionId);
  if (error) throw error;
}

export async function createPracticeSession(userId: string, config: Record<string, unknown>, questionIds: string[]) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('practice_sessions').insert({
    user_id: userId,
    config: { ...config, runtime: { index: 0, answers: {}, submitted: {}, review: {}, elapsed: 0 } },
    question_ids: questionIds,
  }).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function updatePracticeSession(userId: string, sessionId: string, config: Record<string, unknown>, completed = false) {
  if (!supabase) return;
  const payload: Record<string, unknown> = { config };
  if (completed) payload.completed_at = new Date().toISOString();
  const { error } = await supabase.from('practice_sessions').update(payload).eq('id', sessionId).eq('user_id', userId);
  if (error) throw error;
}

export async function recordAttempt(userId: string, questionId: string, sessionId: string | null, answer: string[], result: 'correct' | 'incorrect' | 'unanswered' | 'recorded') {
  if (!supabase) return;
  const { error } = await supabase.from('question_attempts').insert({
    user_id: userId,
    question_id: questionId,
    session_id: sessionId,
    answer,
    result,
  });
  if (error) throw error;
}

export async function loadAttempts(userId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase.from('question_attempts').select('id,question_id,session_id,answer,result,attempted_at').eq('user_id', userId).order('attempted_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
