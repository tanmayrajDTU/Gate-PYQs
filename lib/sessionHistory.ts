import { supabase } from './supabase';
import { loadAttempts } from './persistence';
import type { Question } from './types';
import { allQuestions } from './data';
import { allOtherQuestions } from './otherData';
import { isNatAnswerCorrect } from './natAnswer';

export interface PracticeSessionRecord {
  id: string;
  userId?: string | null;
  exam: string;
  title: string;
  config: {
    subject?: string;
    topics?: string[];
    year?: string;
    type?: string;
    feedback?: 'immediate' | 'end';
    timerMinutes?: number;
    order?: 'sequential' | 'random';
    count?: number;
    questionCount?: number;
    exam?: string;
    [key: string]: unknown;
  };
  questionIds: string[];
  answers: Record<string, string[]>;
  submitted: Record<string, boolean>;
  score: number;
  totalQuestions: number;
  attemptedCount: number;
  accuracy: number;
  elapsedSeconds: number;
  startedAt: string;
  completedAt?: string | null;
}

const LOCAL_SESSIONS_KEY = 'gate_pyq_sessions_v1';
const LOCAL_ATTEMPTS_KEY = 'gate_pyq_attempted_ids_v1';

/**
 * Evaluates whether a user's answer to a question is correct.
 */
export function evaluateAnswer(q: Question, answer: string[]): boolean | null {
  if (q.type === 'descriptive') return (answer && answer.length > 0) ? true : null;
  if (!q.answer) return null;
  if (!answer.length) return false;
  if (q.answer.trim().toUpperCase() === 'ALL') return true;
  if (q.type === 'nat') {
    return isNatAnswerCorrect(q.answer, answer[0]);
  }
  const expected = q.answer.split(/[{},;\s]+/).map(x => x.trim().toUpperCase()).filter(Boolean).sort();
  const actual = answer.map(x => x.trim().toUpperCase()).filter(Boolean).sort();
  return expected.length === actual.length && expected.every((value, i) => value === actual[i]);
}

let questionLookupMap: Map<string, Question> | null = null;
function getQuestionMap(): Map<string, Question> {
  if (!questionLookupMap) {
    questionLookupMap = new Map<string, Question>();
    for (const q of allQuestions) questionLookupMap.set(q.id, q);
    for (const q of allOtherQuestions) questionLookupMap.set(q.id, q);
  }
  return questionLookupMap;
}

/**
 * Dynamically evaluate score and accuracy on the fly for any past test session
 * that didn't have metrics saved or had accuracy as 0 despite attempted questions.
 */
export function evaluateSessionMetrics(
  questionIds: string[],
  answers: Record<string, string[]>,
  submitted: Record<string, boolean>
): { score: number; accuracy: number; attemptedCount: number } {
  const qMap = getQuestionMap();
  let attempted = 0;
  let scored = 0;
  let evaluableAttempted = 0;

  for (const qid of questionIds) {
    const isSubmitted = !!submitted[qid] && (answers[qid] || []).length > 0;
    if (!isSubmitted) continue;
    attempted++;

    const q = qMap.get(qid);
    if (!q) continue;

    if (q.type === 'descriptive' || q.answer) {
      evaluableAttempted++;
    }

    if (q.type === 'descriptive') {
      scored++;
    } else if (q.answer) {
      const isCorrect = evaluateAnswer(q, answers[qid] || []);
      if (isCorrect === true) {
        scored++;
      }
    }
  }

  const accuracy = evaluableAttempted > 0 ? Math.round((scored / evaluableAttempted) * 100) : 0;
  return { score: scored, accuracy, attemptedCount: attempted };
}

/**
 * Check if a session's exam matches the requested exam filter.
 * Handles fuzzy matching (e.g. 'GATE' matches 'GATE CSE', 'GATE IT', etc.,
 * and empty/legacy session exams default to 'GATE').
 */
export function matchesExamFilter(sessionExam: string | undefined | null, filter: string): boolean {
  if (!filter || filter === 'all') return true;
  const raw = (sessionExam || '').trim();
  const exam = raw || 'GATE';

  const fLower = filter.trim().toLowerCase();
  const eLower = exam.toLowerCase();

  // Exact match (case insensitive)
  if (eLower === fLower) return true;

  // GATE category: matches any GATE exam (e.g. 'GATE CSE', 'GATE IT', 'GATE DS&AI', 'GATE 2014 AE', 'GATE')
  if (fLower === 'gate' || fLower === 'gate pyqs') {
    return eLower.startsWith('gate');
  }

  // ISRO category
  if (fLower.includes('isro')) {
    return eLower.includes('isro');
  }

  // TIFR category
  if (fLower.includes('tifr')) {
    return eLower.includes('tifr');
  }

  // Knowledge Gate category
  if (fLower.includes('knowledge gate')) {
    return eLower.includes('knowledge gate');
  }

  // Fallback bidirectional contains
  return eLower.includes(fLower) || fLower.includes(eLower);
}

/** Load sessions saved in localStorage */
export function loadLocalSessions(): PracticeSessionRecord[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((s: any) => {
      const qids: string[] = Array.isArray(s.questionIds) ? s.questionIds : [];
      const answers: Record<string, string[]> = s.answers || {};
      const submitted: Record<string, boolean> = s.submitted || {};
      const rawAttempted = s.attemptedCount ?? Object.keys(submitted).filter(k => submitted[k] && answers[k]?.length).length;

      let score = Number(s.score ?? s.config?.score ?? 0);
      let accuracy = Number(s.accuracy ?? s.config?.accuracy ?? 0);
      let finalAttempted = rawAttempted;

      // If score/accuracy is missing or 0 when questions were attempted, evaluate dynamically
      if ((s.score === undefined && s.config?.score === undefined) || (accuracy === 0 && rawAttempted > 0)) {
        const metrics = evaluateSessionMetrics(qids, answers, submitted);
        score = metrics.score;
        accuracy = metrics.accuracy;
        finalAttempted = metrics.attemptedCount;
      }

      return {
        ...s,
        exam: (s.exam || s.config?.exam || 'GATE') as string,
        score,
        accuracy,
        attemptedCount: finalAttempted,
      };
    });
  } catch (e) {
    console.error('Failed to parse local sessions:', e);
    return [];
  }
}

/** Save or update a session in localStorage */
export function saveLocalSession(session: PracticeSessionRecord): void {
  if (typeof localStorage === 'undefined') return;
  try {
    let score = session.score;
    let accuracy = session.accuracy;
    let attemptedCount = session.attemptedCount;

    if (score === undefined || accuracy === undefined || (accuracy === 0 && attemptedCount > 0)) {
      const metrics = evaluateSessionMetrics(session.questionIds || [], session.answers || {}, session.submitted || {});
      score = metrics.score;
      accuracy = metrics.accuracy;
      attemptedCount = metrics.attemptedCount;
    }

    const normalized: PracticeSessionRecord = {
      ...session,
      exam: (session.exam || session.config?.exam || 'GATE') as string,
      score,
      accuracy,
      attemptedCount,
    };
    const current = loadLocalSessions();
    const filtered = current.filter(s => s.id !== session.id);
    const updated = [normalized, ...filtered];
    // Keep up to 100 sessions locally
    localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(updated.slice(0, 100)));
  } catch (e) {
    console.error('Failed to save local session:', e);
  }
}

/** Delete a session from localStorage */
export function deleteLocalSession(sessionId: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const current = loadLocalSessions();
    const updated = current.filter(s => s.id !== sessionId);
    localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete local session:', e);
  }
}

/** Record a single question attempt in localStorage */
export function recordLocalAttempt(questionId: string): void {
  if (typeof localStorage === 'undefined' || !questionId) return;
  try {
    const current = loadLocalAttemptedIds();
    current.add(questionId);
    localStorage.setItem(LOCAL_ATTEMPTS_KEY, JSON.stringify([...current]));
  } catch (e) {
    console.error('Failed to record local attempt:', e);
  }
}

/** Load set of all attempted question IDs from localStorage */
export function loadLocalAttemptedIds(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(LOCAL_ATTEMPTS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (e) {
    console.error('Failed to parse local attempts:', e);
    return new Set();
  }
}

/**
 * Load all attempted question IDs across localStorage and Supabase.
 * Unified so user coverage is accurate whether logged in or guest.
 */
export async function loadAllAttemptedQuestionIds(userId?: string | null): Promise<Set<string>> {
  const localSet = loadLocalAttemptedIds();

  // Also extract any questions attempted inside saved local sessions
  const localSessions = loadLocalSessions();
  for (const s of localSessions) {
    if (s.submitted) {
      for (const [qid, wasSubmitted] of Object.entries(s.submitted)) {
        if (wasSubmitted && s.answers?.[qid]?.length) {
          localSet.add(qid);
        }
      }
    }
  }

  if (!userId || !supabase) return localSet;

  try {
    const attempts = await loadAttempts(userId);
    for (const a of attempts) {
      if (a.question_id) localSet.add(a.question_id);
    }
  } catch (e) {
    console.error('Error fetching Supabase attempts:', e);
  }

  return localSet;
}

/**
 * Load all practice sessions, combining localStorage and Supabase (if logged in).
 * Deduplicated by session id, sorted newest first.
 */
export async function loadAllPracticeSessions(userId?: string | null): Promise<PracticeSessionRecord[]> {
  const localList = loadLocalSessions();
  const map = new Map<string, PracticeSessionRecord>();

  for (const s of localList) {
    map.set(s.id, s);
  }

  if (userId && supabase) {
    try {
      const { data, error } = await supabase
        .from('practice_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        for (const row of data) {
          const cfg = (row.config || {}) as Record<string, unknown>;
          const runtime = (cfg.runtime || {}) as Record<string, unknown>;
          const answers = (runtime.answers || {}) as Record<string, string[]>;
          const submitted = (runtime.submitted || {}) as Record<string, boolean>;
          const elapsed = Number(runtime.elapsed || 0);

          const qids: string[] = Array.isArray(row.question_ids) ? row.question_ids : [];
          const rawAttempted = Object.keys(submitted).filter(k => submitted[k] && answers[k]?.length).length;

          let score = Number(cfg.score ?? 0);
          let accuracy = Number(cfg.accuracy ?? 0);
          let finalAttempted = rawAttempted;

          // If score/accuracy is missing or 0 when questions were attempted, evaluate dynamically
          if (cfg.score === undefined || cfg.accuracy === undefined || (accuracy === 0 && rawAttempted > 0)) {
            const metrics = evaluateSessionMetrics(qids, answers, submitted);
            score = metrics.score;
            accuracy = metrics.accuracy;
            finalAttempted = metrics.attemptedCount;
          }

          const sessionRecord: PracticeSessionRecord = {
            id: row.id,
            userId: row.user_id,
            exam: (cfg.exam as string) || (row.exam as string) || 'GATE',
            title: (cfg.title as string) || `Session · ${qids.length} Questions`,
            config: cfg as PracticeSessionRecord['config'],
            questionIds: qids,
            answers,
            submitted,
            score,
            totalQuestions: qids.length,
            attemptedCount: finalAttempted,
            accuracy,
            elapsedSeconds: elapsed,
            startedAt: row.started_at,
            completedAt: row.completed_at,
          };

          // Supabase copy can merge with or augment local session
          if (!map.has(row.id)) {
            map.set(row.id, sessionRecord);
          }
        }
      }
    } catch (e) {
      console.error('Error loading Supabase practice sessions:', e);
    }
  }

  const all = [...map.values()];
  all.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  return all;
}

/** Fetch a single session by ID */
export async function getPracticeSessionById(sessionId: string, userId?: string | null): Promise<PracticeSessionRecord | null> {
  const local = loadLocalSessions().find(s => s.id === sessionId);
  if (local) return local;

  if (userId && supabase) {
    try {
      const { data, error } = await supabase
        .from('practice_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (!error && data) {
        const cfg = (data.config || {}) as Record<string, unknown>;
        const runtime = (cfg.runtime || {}) as Record<string, unknown>;
        const answers = (runtime.answers || {}) as Record<string, string[]>;
        const submitted = (runtime.submitted || {}) as Record<string, boolean>;
        const elapsed = Number(runtime.elapsed || 0);
        const qids: string[] = Array.isArray(data.question_ids) ? data.question_ids : [];
        const rawAttempted = Object.keys(submitted).filter(k => submitted[k] && answers[k]?.length).length;

        let score = Number(cfg.score ?? 0);
        let accuracy = Number(cfg.accuracy ?? 0);
        let finalAttempted = rawAttempted;

        if (cfg.score === undefined || cfg.accuracy === undefined || (accuracy === 0 && rawAttempted > 0)) {
          const metrics = evaluateSessionMetrics(qids, answers, submitted);
          score = metrics.score;
          accuracy = metrics.accuracy;
          finalAttempted = metrics.attemptedCount;
        }

        return {
          id: data.id,
          userId: data.user_id,
          exam: (cfg.exam as string) || (data.exam as string) || 'GATE',
          title: (cfg.title as string) || `Session · ${qids.length} Questions`,
          config: cfg as PracticeSessionRecord['config'],
          questionIds: qids,
          answers,
          submitted,
          score,
          totalQuestions: qids.length,
          attemptedCount: finalAttempted,
          accuracy,
          elapsedSeconds: elapsed,
          startedAt: data.started_at,
          completedAt: data.completed_at,
        };
      }
    } catch (e) {
      console.error('Error fetching session by id:', e);
    }
  }

  return null;
}

/** Delete a session from local and Supabase */
export async function deletePracticeSession(sessionId: string, userId?: string | null): Promise<void> {
  deleteLocalSession(sessionId);
  if (userId && supabase) {
    try {
      await supabase.from('practice_sessions').delete().eq('id', sessionId).eq('user_id', userId);
    } catch (e) {
      console.error('Failed to delete Supabase session:', e);
    }
  }
}
