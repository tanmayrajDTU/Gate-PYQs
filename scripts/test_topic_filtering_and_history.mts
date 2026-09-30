import { allQuestions } from '../lib/data';
import { allOtherQuestions } from '../lib/otherData';
import { matchesYearFilter } from '../app/practice/page';
import {
  saveLocalSession,
  loadLocalSessions,
  deleteLocalSession,
  recordLocalAttempt,
  loadLocalAttemptedIds,
  loadAllAttemptedQuestionIds,
  loadAllPracticeSessions,
  getPracticeSessionById,
  matchesExamFilter,
  type PracticeSessionRecord,
} from '../lib/sessionHistory';

console.log('================================================================');
console.log('  TESTING TOPIC YEAR-FILTERING, ATTEMPT COUNTS & TEST HISTORY   ');
console.log('================================================================\n');

let pass = 0;
let fail = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    pass++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    fail++;
  }
}

// ---------------------------------------------------------
// 1. Year Filter Logic Validation
// ---------------------------------------------------------
console.log('--- 1. Testing matchesYearFilter helper ---');
assert(matchesYearFilter(2024, 'all') === true, 'All years accepts 2024');
assert(matchesYearFilter(1995, 'all') === true, 'All years accepts 1995');
assert(matchesYearFilter(null, 'all') === true, 'All years accepts null');

assert(matchesYearFilter(2005, 'gte_2000') === true, '2000+ accepts 2005');
assert(matchesYearFilter(1999, 'gte_2000') === false, '2000+ rejects 1999');
assert(matchesYearFilter(null, 'gte_2000') === false, '2000+ rejects null');

assert(matchesYearFilter(2006, 'gte_2006') === true, '2006+ accepts 2006');
assert(matchesYearFilter(2005, 'gte_2006') === false, '2006+ rejects 2005');

assert(matchesYearFilter(2008, 'gte_2008') === true, '2008+ accepts 2008');
assert(matchesYearFilter(2007, 'gte_2008') === false, '2008+ rejects 2007');

assert(matchesYearFilter(2015, 'gte_2015') === true, '2015+ accepts 2015');
assert(matchesYearFilter(2014, 'gte_2015') === false, '2015+ rejects 2014');

assert(matchesYearFilter(2022, '2022') === true, 'Exact year 2022 accepts 2022');
assert(matchesYearFilter(2023, '2022') === false, 'Exact year 2022 rejects 2023');

// Setup mock localStorage in Node environment
const mockStorage: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (k: string) => mockStorage[k] ?? null,
  setItem: (k: string, v: string) => { mockStorage[k] = v; },
  removeItem: (k: string) => { delete mockStorage[k]; },
  clear: () => { for (const k in mockStorage) delete mockStorage[k]; },
  key: (i: number) => Object.keys(mockStorage)[i] ?? null,
  length: 0,
} as unknown as Storage;

// ---------------------------------------------------------
// 2. Topic Question Count Filtered by Year
// ---------------------------------------------------------
console.log('\n--- 2. Topic Question Counts Filtered by Year ---');
const cacheTopic = '15_topic_cache-memory';
const cacheQuestions = allQuestions.filter(q => q.topicId === cacheTopic);
assert(cacheQuestions.length > 0, 'Found Cache Memory questions (' + cacheQuestions.length + ')');

const allCount = allQuestions.filter(q => q.topicId === cacheTopic && matchesYearFilter(q.year, 'all')).length;
const count2000 = allQuestions.filter(q => q.topicId === cacheTopic && matchesYearFilter(q.year, 'gte_2000')).length;
const count2015 = allQuestions.filter(q => q.topicId === cacheTopic && matchesYearFilter(q.year, 'gte_2015')).length;

console.log(`     Cache Memory questions: All = ${allCount}, 2000+ = ${count2000}, 2015+ = ${count2015}`);
assert(allCount >= count2000, 'All-years count >= 2000+ count');
assert(count2000 >= count2015, '2000+ count >= 2015+ count');
assert(count2015 > 0, '2015+ has questions (>0)');

// ---------------------------------------------------------
// 3. Attempt Tracking per Topic & MultiTopicSelect Pill
// ---------------------------------------------------------
console.log('\n--- 3. Attempt Tracking per Topic ---');
// Mock recording 2 attempts in Cache Memory
const sampleQuestions = cacheQuestions;
const q1 = sampleQuestions[0]?.id;
const q2 = sampleQuestions[1]?.id;



recordLocalAttempt(q1);
recordLocalAttempt(q2);

const attemptedIds = loadLocalAttemptedIds();
assert(attemptedIds.has(q1), `Attempted IDs has ${q1}`);
assert(attemptedIds.has(q2), `Attempted IDs has ${q2}`);

const attemptedInTopic = sampleQuestions.filter(q => attemptedIds.has(q.id)).length;
assert(attemptedInTopic >= 2, `Topic has at least 2 attempted questions (got ${attemptedInTopic})`);

// ---------------------------------------------------------
// 4. Test History Repository: Save, Load, Reattempt, Review
// ---------------------------------------------------------
console.log('\n--- 4. Test History Repository Save & Retrieval ---');

const testSessionId = 'test_session_abc123';
const mockSession: PracticeSessionRecord = {
  id: testSessionId,
  exam: 'GATE',
  title: 'Operating Systems · 10 Questions',
  config: {
    subject: 'operating-systems',
    year: 'gte_2015',
    timerMinutes: 20,
    feedback: 'end',
    order: 'sequential',
    count: 10,
  },
  questionIds: sampleQuestions.slice(0, 10).map(q => q.id),
  answers: {
    [q1]: ['A'],
    [q2]: ['42'],
  },
  submitted: {
    [q1]: true,
    [q2]: true,
  },
  score: 1,
  totalQuestions: 10,
  attemptedCount: 2,
  accuracy: 50,
  elapsedSeconds: 345,
  startedAt: new Date(Date.now() - 360000).toISOString(),
  completedAt: new Date().toISOString(),
};

saveLocalSession(mockSession);

const savedSessions = loadLocalSessions();
assert(savedSessions.length >= 1, 'Loaded at least 1 saved session');
const retrieved = savedSessions.find(s => s.id === testSessionId);
assert(!!retrieved, 'Found saved session by ID');
assert(retrieved?.title === 'Operating Systems · 10 Questions', 'Title matches');
assert(retrieved?.accuracy === 50, 'Accuracy matches (50%)');
assert(retrieved?.attemptedCount === 2, 'Attempted count matches (2)');
assert(retrieved?.questionIds.length === 10, 'Question IDs count matches (10)');

// Test getPracticeSessionById
let fetchedSession: PracticeSessionRecord | null = null;
(async () => {
  fetchedSession = await getPracticeSessionById(testSessionId, null);
  assert(fetchedSession?.id === testSessionId, 'getPracticeSessionById returns correct session');

  // Test reattempt question pool reconstruction
  const reconstructedQuestions = allQuestions.filter(q => fetchedSession?.questionIds.includes(q.id));
  assert(reconstructedQuestions.length === 10, 'Reconstructed exact 10 questions for reattempt');

  // Test session deletion
  deleteLocalSession(testSessionId);
  const afterDelete = loadLocalSessions().find(s => s.id === testSessionId);
  assert(!afterDelete, 'Session deleted cleanly from repository');

  // ---------------------------------------------------------
  // 5. Non-GATE Question Reconstruction (ISRO / TIFR)
  // ---------------------------------------------------------
  console.log('\n--- 5. Non-GATE Question Reconstruction ---');
  const isroSample = allOtherQuestions.filter(q => q.exam === 'ISRO CSE').slice(0, 5);
  assert(isroSample.length === 5, 'Found 5 ISRO questions');
  const combinedMap = new Map([...allQuestions, ...allOtherQuestions].map(q => [q.id, q]));
  const reconstructedNonGate = isroSample.map(q => combinedMap.get(q.id)).filter(Boolean);
  assert(reconstructedNonGate.length === 5, 'Successfully reconstructed 5 non-GATE questions using combined pool');

  // ---------------------------------------------------------
  // 6. matchesExamFilter Comprehensive Validation
  // ---------------------------------------------------------
  console.log('\n--- 6. matchesExamFilter Comprehensive Validation ---');
  assert(matchesExamFilter('GATE CSE', 'all') === true, 'All accepts GATE CSE');
  assert(matchesExamFilter('ISRO CSE', 'all') === true, 'All accepts ISRO CSE');
  assert(matchesExamFilter('GATE CSE', 'GATE') === true, 'GATE filter accepts GATE CSE');
  assert(matchesExamFilter('GATE IT', 'GATE') === true, 'GATE filter accepts GATE IT');
  assert(matchesExamFilter('GATE DS&AI', 'GATE') === true, 'GATE filter accepts GATE DS&AI');
  assert(matchesExamFilter('GATE', 'GATE') === true, 'GATE filter accepts GATE');
  assert(matchesExamFilter(undefined, 'GATE') === true, 'GATE filter accepts undefined legacy session');
  assert(matchesExamFilter('', 'GATE') === true, 'GATE filter accepts empty exam');
  assert(matchesExamFilter(null, 'GATE') === true, 'GATE filter accepts null exam');
  assert(matchesExamFilter('ISRO CSE', 'GATE') === false, 'GATE filter rejects ISRO CSE');
  assert(matchesExamFilter('TIFR CSE', 'GATE') === false, 'GATE filter rejects TIFR CSE');
  assert(matchesExamFilter('Knowledge Gate Practice', 'GATE') === false, 'GATE filter rejects Knowledge Gate Practice');

  assert(matchesExamFilter('ISRO CSE', 'ISRO CSE') === true, 'ISRO filter accepts ISRO CSE');
  assert(matchesExamFilter('ISRO', 'ISRO CSE') === true, 'ISRO filter accepts ISRO');
  assert(matchesExamFilter('GATE CSE', 'ISRO CSE') === false, 'ISRO filter rejects GATE CSE');
  assert(matchesExamFilter(undefined, 'ISRO CSE') === false, 'ISRO filter rejects undefined');

  assert(matchesExamFilter('TIFR CSE', 'TIFR CSE') === true, 'TIFR filter accepts TIFR CSE');
  assert(matchesExamFilter('GATE CSE', 'TIFR CSE') === false, 'TIFR filter rejects GATE CSE');

  assert(matchesExamFilter('Knowledge Gate Practice', 'Knowledge Gate Practice') === true, 'Knowledge Gate filter accepts Knowledge Gate Practice');
  assert(matchesExamFilter('GATE CSE', 'Knowledge Gate Practice') === false, 'Knowledge Gate filter rejects GATE CSE');

  // ---------------------------------------------------------
  // 7. On-the-fly Accuracy & Score Recalculation for Legacy Sessions
  // ---------------------------------------------------------
  console.log('\n--- 7. On-the-fly Accuracy & Score Recalculation ---');
  const legacySessionId = 'legacy_session_xyz789';
  const q1CorrectAns = sampleQuestions[0]?.answer || 'A';
  mockStorage['gate_pyq_sessions_v1'] = JSON.stringify([{
    id: legacySessionId,
    exam: 'GATE CSE',
    title: 'Legacy Practice Session',
    questionIds: [sampleQuestions[0].id, sampleQuestions[1].id],
    answers: {
      [sampleQuestions[0].id]: [q1CorrectAns],
      [sampleQuestions[1].id]: ['WRONG_ANSWER_123'],
    },
    submitted: {
      [sampleQuestions[0].id]: true,
      [sampleQuestions[1].id]: true,
    },
    score: 0,
    accuracy: 0,
    attemptedCount: 2,
    totalQuestions: 2,
    startedAt: new Date().toISOString(),
  }]);

  const loadedLegacy = loadLocalSessions().find(s => s.id === legacySessionId);
  assert(!!loadedLegacy, 'Found legacy session');
  assert(loadedLegacy?.score === 1, `Legacy session score dynamically evaluated to 1 (got ${loadedLegacy?.score})`);
  assert(loadedLegacy?.accuracy === 50, `Legacy session accuracy dynamically evaluated to 50% (got ${loadedLegacy?.accuracy}%)`);
  assert(loadedLegacy?.attemptedCount === 2, `Attempted count is 2 (got ${loadedLegacy?.attemptedCount})`);

  console.log('\n================================================================');
  console.log(`TOTAL TESTS RUN : ${pass + fail}`);
  console.log(`PASSED          : ${pass}`);
  console.log(`FAILED          : ${fail}`);
  console.log('================================================================');

  if (fail > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL TOPIC FILTERING, HISTORY & EXAM FILTER TESTS PASSED!\n');
  }
})();
