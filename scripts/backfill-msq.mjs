// scripts/backfill-msq.mjs
//
// One-off backfill: re-grades every stored `question_attempts` row using the
// corrected MSQ evaluation logic (the old grader didn't split answer keys on
// ";", so keys like "B;C" were treated as one token and correct MSQ
// submissions got recorded as "incorrect").
//
// This does NOT touch your app code — it only fixes historical rows in
// Supabase so your stats/accuracy reflect the corrected grading.
//
// USAGE:
//   1. npm install   (make sure @supabase/supabase-js is installed)
//   2. Get your Supabase Service Role key: Supabase dashboard -> Project
//      Settings -> API -> "service_role" secret (NOT the anon key — the
//      anon key is blocked by RLS from updating rows across the board, and
//      you want this to fix your own row regardless of session).
//   3. Run a dry run first (default, makes no changes):
//        SUPABASE_URL=https://xxxx.supabase.co \
//        SUPABASE_SERVICE_ROLE_KEY=xxxx \
//        node scripts/backfill-msq.mjs
//   4. Review the printed list, then actually apply the fix:
//        SUPABASE_URL=https://xxxx.supabase.co \
//        SUPABASE_SERVICE_ROLE_KEY=xxxx \
//        node scripts/backfill-msq.mjs --apply
//
// Never commit your service role key or put it in NEXT_PUBLIC_* env vars —
// it bypasses Row Level Security.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes('--apply');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars. See the comment at the top of this script.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- Load question bank and build id -> {type, answer} map -----------------
const questionsPath = path.join(__dirname, '..', 'data', 'questions.json');
const questions = JSON.parse(readFileSync(questionsPath, 'utf-8'));
const qMap = new Map(questions.map(q => [q.id, q]));

// --- Corrected evaluation logic (mirrors the fixed evaluateAnswer/browse card) ---
function evaluateAnswer(q, answer) {
  if (q.type === 'descriptive') return true;
  if (!q.answer) return null;
  if (!answer || !answer.length) return false;
  if (q.type === 'nat') {
    // NAT grading isn't affected by this bug; skip re-grading NAT here.
    return null;
  }
  const expected = q.answer.split(/[{},;\s]+/).map(x => x.trim().toUpperCase()).filter(Boolean).sort();
  const actual = answer.map(x => String(x).trim().toUpperCase()).filter(Boolean).sort();
  return expected.length === actual.length && expected.every((value, i) => value === actual[i]);
}

async function main() {
  console.log(APPLY ? 'Running in APPLY mode — rows will be updated.' : 'Running in DRY-RUN mode — no writes will happen. Pass --apply to write.');

  // Only need to look at rows currently marked 'incorrect' — those are the
  // only ones that could have been wrongly graded by the old bug.
  const pageSize = 1000;
  let from = 0;
  let allRows = [];
  for (;;) {
    const { data, error } = await supabase
      .from('question_attempts')
      .select('id,user_id,question_id,answer,result')
      .eq('result', 'incorrect')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log(`Fetched ${allRows.length} rows marked 'incorrect'.`);

  const toFix = [];
  for (const row of allRows) {
    const q = qMap.get(row.question_id);
    if (!q || q.type !== 'msq') continue;
    if (!q.answer || !q.answer.includes(';')) continue; // only affected keys
    const nowCorrect = evaluateAnswer(q, row.answer);
    if (nowCorrect === true) {
      toFix.push({ id: row.id, user_id: row.user_id, question_id: row.question_id, answer: row.answer, key: q.answer });
    }
  }

  console.log(`Found ${toFix.length} attempt(s) that were wrongly marked incorrect and should be 'correct'.`);
  for (const row of toFix) {
    console.log(`  attempt#${row.id}  user=${row.user_id}  question=${row.question_id}  your_answer=${JSON.stringify(row.answer)}  key=${row.key}`);
  }

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to write these updates.');
    return;
  }

  let updated = 0;
  for (const row of toFix) {
    const { error } = await supabase
      .from('question_attempts')
      .update({ result: 'correct' })
      .eq('id', row.id);
    if (error) {
      console.error(`Failed to update attempt#${row.id}:`, error.message);
      continue;
    }
    updated++;
  }
  console.log(`\nUpdated ${updated}/${toFix.length} rows to 'correct'.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
