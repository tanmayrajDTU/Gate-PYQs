import { supabase } from './supabase';

export type UserState = { userId: string | null };

export async function getCurrentUserId() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function loadFlags(userId: string): Promise<Record<string, { bookmarked: boolean; revision: boolean }>> {
  if (!supabase) return {} as Record<string, { bookmarked: boolean; revision: boolean }>;
  const { data, error } = await supabase.from('question_flags').select('question_id,bookmarked,revision').eq('user_id', userId);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map(row => [row.question_id, { bookmarked: !!row.bookmarked, revision: !!row.revision }]));
}

export async function setQuestionFlags(userId: string, questionId: string, bookmarked: boolean, revision: boolean) {
  if (!supabase) return;
  const { error } = await supabase.from('question_flags').upsert({
    user_id: userId,
    question_id: questionId,
    bookmarked,
    revision,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,question_id' });
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
