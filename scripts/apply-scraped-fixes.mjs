// scripts/apply-scraped-fixes.mjs
//
// Fixes misclassified questions in data/questions.json.
//
// Steps:
//   1. Normalizes answer "X" → "ALL" for all 15 questions (Option A)
//   2. Applies scraped options from GateOverflow
//   3. Extracts options from bodyHtml where possible
//   4. Changes type from "descriptive" → "mcq"/"msq" for questions that now have options
//   5. Leaves truly descriptive questions untouched
//
// USAGE:
//   node scripts/apply-scraped-fixes.mjs            # dry run
//   node scripts/apply-scraped-fixes.mjs --apply    # write changes

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const APPLY = process.argv.includes('--apply');

const QUESTIONS_PATH = path.join(ROOT, 'data', 'questions.json');
const SCRAPED_PATH = path.join(ROOT, 'scripts', 'scraped-data.json');

// ─── Configuration ──────────────────────────────────────────────────────────

// Questions that should be converted to MCQ/MSQ (have options available)
// These are the ones we confirmed are real MCQ questions, NOT descriptive.
const CONVERT_TO_MCQ = new Set([
  // Category A questions with scraped options
  'question441',     // 3.1.10, 2008 — X→ALL, 4 scraped options
  'question80',      // 3.1.17, 2013 — X→ALL, 4 scraped options
  'question40307',   // 8.8.18, 2014 — answer B, 4 scraped options
  'question786',     // 1.31.18, 2012 — X→ALL, 4 scraped options
  'question333224',  // 6.18.18, 2020 — X→ALL, 4 scraped options
  'question3346',    // 6.7.42, 2008 — X→ALL, 4 scraped options
  'question703',     // 1.25.1, 2001 — X→ALL, 4 scraped options
  'question1339',    // 3.21.24, 2009 — X→ALL, 4 scraped options
  'question3721',    // 3.25.23, 2004 — X→ALL, 4 scraped options
  'question413601',  // 3.6.49, 2024 — TBA, 4 scraped options
  // Category B questions with existing answers
  'question83991',   // 1.2.2, 1990 — answer B (options may come from scrape)
  'question2739',    // 2.12.13, 1996 — answer D
  'question1758',    // 2.24.18, 2012 — answer D
  'question2113',    // 5.15.6, 2011 — answer D
  // Additional scraped ones
  'question488084',  // 6.11.1, 2023 — 4 scraped options
  'question1513',    // 3.3.16, 1999 — options in body (if scrape found them)
  'question43583',   // 2.13.3, 1992 — (if scrape found options)
]);

// Questions from Category A that are TRULY descriptive despite MCQ-like phrasing.
// These say "which of the following" but actually require written proofs/explanations.
const TRULY_DESCRIPTIVE = new Set([
  'question87129',   // 2.8.2, 1989 — "Which graphs are planar?" — graphs are images, no text options
  'question2756',    // 3.5.2, 1996 — "Which probe sequences are possible? Explain."
  'question578',     // 2.3.3, 1992 — "Write short answers to the following"
  'question2515',    // 6.9.4, 1994 — Descriptive with roman numeral sub-parts
]);

// Special case: 6.1.2 (1992) — answer A;B → MSQ, options are roman-numeral <ol> in body
const CONVERT_TO_MSQ = new Set([
  'question595',     // 6.1.2, 1992 — "Which statements are true? Prove." answer: A;B
]);

function main() {
  console.log(APPLY
    ? '🔧 APPLY MODE — questions.json will be updated.\n'
    : '🔍 DRY-RUN MODE — no writes. Pass --apply to write.\n');

  const questions = JSON.parse(readFileSync(QUESTIONS_PATH, 'utf-8'));
  const qMap = new Map(questions.map(q => [q.id, q]));

  // Load scraped data
  let scrapedMap = new Map();
  if (existsSync(SCRAPED_PATH)) {
    const scraped = JSON.parse(readFileSync(SCRAPED_PATH, 'utf-8'));
    scrapedMap = new Map(scraped.map(s => [s.id, s]));
    console.log(`Loaded ${scrapedMap.size} scraped entries.\n`);
  } else {
    console.log('⚠️  No scraped-data.json found.\n');
  }

  // ─── Step 1: Normalize X → ALL ──────────────────────────────────────────

  let xNormalized = 0;
  for (const q of questions) {
    if (q.answer === 'X') {
      q.answer = 'ALL';
      xNormalized++;
    }
  }
  console.log(`Step 1: Normalized ${xNormalized} "X" answers → "ALL"\n`);

  // ─── Step 2: Apply scraped options ──────────────────────────────────────

  const results = { converted: [], partiallyFixed: [], keptDescriptive: [], skipped: [] };

  for (const id of CONVERT_TO_MCQ) {
    const q = qMap.get(id);
    if (!q) { results.skipped.push({ id, reason: 'not found' }); continue; }

    const scraped = scrapedMap.get(id);
    let newOptions = [];

    // Try scraped options first
    if (scraped && scraped.options && scraped.options.length > 0) {
      newOptions = scraped.options;
    }

    // Fallback: extract from body HTML
    if (newOptions.length === 0) {
      newOptions = extractOptionsFromBody(q.bodyHtml);
    }

    // Determine answer
    let answer = q.answer;
    // "ALL" is fine — the app handles it correctly

    // Determine type
    let newType = 'mcq';
    if (answer && answer.includes(';')) newType = 'msq';

    if (newOptions.length > 0) {
      q.type = newType;
      q.options = newOptions;
      results.converted.push({
        id, number: q.number, year: q.year,
        type: newType, optionCount: newOptions.length,
        answer: q.answer,
        source: scraped && scraped.options?.length > 0 ? 'scraped' : 'body-extracted'
      });
    } else if (answer && answer !== 'TBA') {
      // Has answer but no options — convert type but flag
      q.type = newType;
      results.partiallyFixed.push({
        id, number: q.number, year: q.year,
        type: newType, answer: q.answer,
        issue: 'no options available'
      });
    } else {
      results.skipped.push({
        id, number: q.number, year: q.year,
        reason: 'no options and no answer'
      });
    }
  }

  // ─── Step 3: Handle MSQ conversions ─────────────────────────────────────

  for (const id of CONVERT_TO_MSQ) {
    const q = qMap.get(id);
    if (!q) continue;

    const scraped = scrapedMap.get(id);
    let newOptions = [];

    if (scraped && scraped.options && scraped.options.length > 0) {
      newOptions = scraped.options;
    }
    if (newOptions.length === 0) {
      newOptions = extractOptionsFromBody(q.bodyHtml);
    }

    if (newOptions.length > 0) {
      q.type = 'msq';
      q.options = newOptions;
      results.converted.push({
        id, number: q.number, year: q.year,
        type: 'msq', optionCount: newOptions.length,
        answer: q.answer,
        source: scraped && scraped.options?.length > 0 ? 'scraped' : 'body-extracted'
      });
    } else {
      // Extract from roman-numeral list in body
      const opts = extractRomanOptions(q.bodyHtml);
      if (opts.length > 0) {
        q.type = 'msq';
        q.options = opts;
        results.converted.push({
          id, number: q.number, year: q.year,
          type: 'msq', optionCount: opts.length,
          answer: q.answer,
          source: 'roman-numeral-extracted'
        });
      } else {
        results.partiallyFixed.push({
          id, number: q.number, year: q.year,
          type: 'msq', answer: q.answer,
          issue: 'no options extracted'
        });
      }
    }
  }

  // ─── Step 4: Log truly descriptive ──────────────────────────────────────

  for (const id of TRULY_DESCRIPTIVE) {
    const q = qMap.get(id);
    if (!q) continue;
    // Normalize X→ALL was already done in step 1
    results.keptDescriptive.push({
      id, number: q.number, year: q.year, answer: q.answer
    });
  }

  // ─── Report ─────────────────────────────────────────────────────────────

  console.log('═'.repeat(70));
  console.log(`✅ CONVERTED TO MCQ/MSQ: ${results.converted.length}`);
  console.log('═'.repeat(70));
  for (const r of results.converted) {
    console.log(`  ${r.number} (${r.year}) → ${r.type.toUpperCase()}, ${r.optionCount} options, answer: ${r.answer}, source: ${r.source}`);
  }

  console.log(`\n⚠️  PARTIALLY FIXED (type changed but missing data): ${results.partiallyFixed.length}`);
  console.log('═'.repeat(70));
  for (const r of results.partiallyFixed) {
    console.log(`  ${r.number} (${r.year}) → ${r.type.toUpperCase()}, answer: ${r.answer}, issue: ${r.issue}`);
  }

  console.log(`\n📋 KEPT AS DESCRIPTIVE (truly descriptive): ${results.keptDescriptive.length}`);
  console.log('═'.repeat(70));
  for (const r of results.keptDescriptive) {
    console.log(`  ${r.number} (${r.year}), answer: ${r.answer}`);
  }

  if (results.skipped.length > 0) {
    console.log(`\n⏭️  SKIPPED: ${results.skipped.length}`);
    console.log('═'.repeat(70));
    for (const r of results.skipped) {
      console.log(`  ${r.id} ${r.number || ''} (${r.year || ''}) — ${r.reason}`);
    }
  }

  // Verify: check the original 16 Category A questions
  console.log('\n' + '═'.repeat(70));
  console.log('📊 ORIGINAL 16 ISSUE QUESTIONS STATUS');
  console.log('═'.repeat(70));
  const catA = ['question87129','question441','question80','question40307','question2756','question786','question578','question595','question333224','question3346','question2515','question703','question1339','question3721','question413601','question2113'];
  for (const id of catA) {
    const q = qMap.get(id);
    if (!q) continue;
    const hasOpts = q.options && q.options.length > 0;
    const hasAnswer = q.answer && q.answer !== 'TBA';
    const isDesc = q.type === 'descriptive';
    let status;
    if (!isDesc && hasOpts && hasAnswer) status = '✅ FULLY FIXED';
    else if (!isDesc && hasOpts) status = '⚠️  HAS OPTIONS, NO ANSWER';
    else if (!isDesc && hasAnswer) status = '⚠️  HAS ANSWER, NO OPTIONS';
    else if (isDesc && TRULY_DESCRIPTIVE.has(id)) status = '📋 TRULY DESCRIPTIVE (correct)';
    else status = '❌ STILL BROKEN';
    console.log(`  ${q.number} (${q.year}) → ${q.type.toUpperCase()}, ${q.options.length} opts, answer: ${q.answer} — ${status}`);
  }

  // ─── Summary ────────────────────────────────────────────────────────────

  const totalChanged = results.converted.length + results.partiallyFixed.length + xNormalized;
  console.log('\n' + '═'.repeat(70));
  console.log(`TOTAL: ${results.converted.length} converted, ${results.partiallyFixed.length} partial, ${results.keptDescriptive.length} kept descriptive, ${xNormalized} X→ALL`);
  console.log('═'.repeat(70));

  // ─── Write ──────────────────────────────────────────────────────────────

  if (APPLY) {
    writeFileSync(QUESTIONS_PATH, JSON.stringify(questions, null, 2), 'utf-8');
    console.log(`\n✅ Wrote updated questions.json (${questions.length} questions)`);

    const reportPath = path.join(ROOT, 'scripts', 'fix-report.json');
    writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`📄 Report: scripts/fix-report.json`);
  } else {
    console.log('\nDry run complete — re-run with --apply to write changes.');
  }
}

/** Extract MCQ options from HTML body */
function extractOptionsFromBody(bodyHtml) {
  if (!bodyHtml) return [];

  // Pattern 1: <ol style="...upper-alpha..."> with <li> children
  const olAlphaMatch = bodyHtml.match(/<ol[^>]*style[^>]*upper-alpha[^>]*>([\s\S]*?)<\/ol>/i);
  if (olAlphaMatch) {
    const items = extractLiItems(olAlphaMatch[1]);
    if (items.length >= 2) {
      const labels = 'ABCDEFGHIJ';
      return items.map((html, i) => ({ label: labels[i] || String(i + 1), html }));
    }
  }

  // Pattern 2: Plain <ol> (without style) — the LAST <ol> in the body is
  // typically the options list (earlier ones might be context/data)
  const olMatches = [...bodyHtml.matchAll(/<ol(?:\s[^>]*)?>([\s\S]*?)<\/ol>/gi)];
  if (olMatches.length > 0) {
    // Take the last <ol> — it's most likely the answer choices
    const lastOl = olMatches[olMatches.length - 1];
    // Skip if it's a roman-numeral styled list (those are sub-parts, not MCQ options)
    if (!/lower-roman/i.test(lastOl[0])) {
      const items = extractLiItems(lastOl[1]);
      if (items.length >= 2 && items.length <= 6) {
        const labels = 'ABCDEFGHIJ';
        return items.map((html, i) => ({ label: labels[i] || String(i + 1), html }));
      }
    }
  }

  // Pattern 3: Explicit (A) ... (B) ... (C) ... (D) markers
  const optionRegex = /\(([A-D])\)\s*([\s\S]*?)(?=\([A-D]\)\s|$)/g;
  const opts = [];
  let m2;
  while ((m2 = optionRegex.exec(bodyHtml))) {
    opts.push({ label: m2[1], html: m2[2].trim() });
  }
  if (opts.length >= 2) return opts;

  return [];
}

function extractLiItems(olInnerHtml) {
  const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  const items = [];
  let m;
  while ((m = liPattern.exec(olInnerHtml))) items.push(m[1].trim());
  return items;
}

/** Extract options from roman-numeral ordered lists */
function extractRomanOptions(bodyHtml) {
  if (!bodyHtml) return [];
  const olMatch = bodyHtml.match(/<ol[^>]*style[^>]*lower-roman[^>]*>([\s\S]*?)<\/ol>/i);
  if (olMatch) {
    const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    const items = [];
    let m;
    while ((m = liPattern.exec(olMatch[1]))) items.push(m[1].trim());
    if (items.length >= 2) {
      const labels = 'ABCDEFGHIJ';
      return items.map((html, i) => ({ label: labels[i] || String(i + 1), html }));
    }
  }
  return [];
}

main();
