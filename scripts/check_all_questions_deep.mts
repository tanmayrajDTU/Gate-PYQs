import { readFileSync } from 'fs';
import { join } from 'path';
import { isNatAnswerCorrect } from '../lib/natAnswer';
import { sanitizeHtml } from '../lib/sanitizeHtml';
import type { Question } from '../lib/types';

const gatePath = join(process.cwd(), 'data', 'questions.json');
const otherPath = join(process.cwd(), 'data', 'other-questions.json');

const gateQuestions: Question[] = JSON.parse(readFileSync(gatePath, 'utf8'));
const otherQuestions: Question[] = JSON.parse(readFileSync(otherPath, 'utf8'));

console.log(`Loaded ${gateQuestions.length} GATE questions and ${otherQuestions.length} companion questions.`);
console.log(`Total questions to test: ${gateQuestions.length + otherQuestions.length}\n`);

// Helper to simulate evaluateAnswer from PracticeClient
function evaluateAnswer(q: Question, answer: string[]): boolean | null {
  if (q.type === 'descriptive') return true;
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

// 1. ATTEMPT & CHECK ALL QUESTIONS
console.log('=== [1/4] ATTEMPTING ALL QUESTIONS ===');
let totalEvaluated = 0;
let autoCorrectDescriptive = 0;
let marksToAll = 0;
let scoredCorrect = 0;
let scoredIncorrect = 0;
let emptyHandled = 0;
let ungradable = 0;
let evaluationErrors = 0;

const allQuestions = [...gateQuestions, ...otherQuestions];

for (const q of allQuestions) {
  try {
    totalEvaluated++;
    
    // Test empty submission
    const emptyResult = evaluateAnswer(q, []);
    if (emptyResult === false || (q.type === 'descriptive' && emptyResult === true)) {
      emptyHandled++;
    }

    if (q.type === 'descriptive') {
      autoCorrectDescriptive++;
      continue;
    }

    if (!q.answer) {
      ungradable++;
      continue;
    }

    const ansTrim = q.answer.trim().toUpperCase();
    if (ansTrim === 'ALL') {
      marksToAll++;
      const res = evaluateAnswer(q, ['A']);
      if (res === true) scoredCorrect++;
      continue;
    }

    // Determine sample correct answer to test
    let sampleCorrectAns: string[] = [];
    let sampleWrongAns: string[] = ['__DEFINITELY_WRONG_CHOICE_XYZ__'];

    if (q.type === 'nat') {
      // Find a valid numeric value from the answer key
      const match = q.answer.match(/-?\d+(?:\.\d+)?/);
      if (match) {
        sampleCorrectAns = [match[0]];
      } else {
        sampleCorrectAns = [q.answer.trim()];
      }
      sampleWrongAns = ['999999999.8888'];
    } else {
      // MCQ or MSQ
      const labels = q.answer.split(/[{},;\s]+/).map(x => x.trim().toUpperCase()).filter(Boolean);
      sampleCorrectAns = labels;
    }

    // Test correct answer
    const correctRes = evaluateAnswer(q, sampleCorrectAns);
    if (correctRes === true) {
      scoredCorrect++;
    } else {
      // Log edge case
      console.warn(`[WARN] Question ${q.id} (${q.type}) correct attempt failed: answerKey="${q.answer}", attempted=${JSON.stringify(sampleCorrectAns)}`);
    }

    // Test wrong answer
    const wrongRes = evaluateAnswer(q, sampleWrongAns);
    if (wrongRes === false) {
      scoredIncorrect++;
    } else {
      console.warn(`[WARN] Question ${q.id} (${q.type}) wrong attempt was not false: answerKey="${q.answer}", attempted=${JSON.stringify(sampleWrongAns)}, result=${wrongRes}`);
    }

  } catch (err) {
    evaluationErrors++;
    console.error(`[ERROR] Exception evaluating question ${q.id}:`, err);
  }
}

console.log(`✓ Total questions attempted: ${totalEvaluated}`);
console.log(`✓ Correct attempts passed: ${scoredCorrect}`);
console.log(`✓ Incorrect attempts rejected: ${scoredIncorrect}`);
console.log(`✓ Empty attempts handled: ${emptyHandled}`);
console.log(`✓ Descriptive questions auto-handled: ${autoCorrectDescriptive}`);
console.log(`✓ 'Marks to ALL' questions handled: ${marksToAll}`);
console.log(`✓ Questions without answer key: ${ungradable}`);
console.log(`✓ Evaluation crashes/exceptions: ${evaluationErrors}`);

// 2. CHECK REDIRECTIONS & EXTERNAL URLS
console.log('\n=== [2/4] CHECKING REDIRECTIONS & EXTERNAL URLS ===');
let gateOverflowCount = 0;
let validGoUrls = 0;
let invalidGoUrls = 0;
let imageSrcCount = 0;
let suspiciousImageUrls = 0;

for (const q of allQuestions) {
  if (q.gateOverflowUrl) {
    gateOverflowCount++;
    try {
      const url = new URL(q.gateOverflowUrl);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        validGoUrls++;
      } else {
        invalidGoUrls++;
        console.warn(`[WARN] Non-http(s) GateOverflow URL in ${q.id}: ${q.gateOverflowUrl}`);
      }
    } catch {
      invalidGoUrls++;
      console.warn(`[WARN] Invalid GateOverflow URL format in ${q.id}: ${q.gateOverflowUrl}`);
    }
  }

  // Check image URLs inside bodyHtml, options, and solution
  const htmlBlob = `${q.bodyHtml} ${q.options.map(o => o.html).join(' ')} ${q.solution || ''}`;
  const imgMatches = htmlBlob.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
  for (const match of imgMatches) {
    imageSrcCount++;
    const src = match[1];
    if (src.startsWith('javascript:') || src.startsWith('data:text/html')) {
      suspiciousImageUrls++;
      console.warn(`[WARN] Dangerous image src in ${q.id}: ${src}`);
    }
  }
}

console.log(`✓ Questions with GateOverflow URL: ${gateOverflowCount}`);
console.log(`✓ Valid GateOverflow URLs: ${validGoUrls}`);
console.log(`✓ Invalid GateOverflow URLs: ${invalidGoUrls}`);
console.log(`✓ Total <img> references found: ${imageSrcCount}`);
console.log(`✓ Suspicious <img> sources: ${suspiciousImageUrls}`);

// 3. CHECK SOLUTIONS
console.log('\n=== [3/4] CHECKING SOLUTIONS & SANITIZATION ===');
let questionsWithSolution = 0;
let sanitizationErrors = 0;
let emptySolutions = 0;

for (const q of allQuestions) {
  if (q.solution) {
    questionsWithSolution++;
    if (!q.solution.trim()) {
      emptySolutions++;
    }
    try {
      const sanitized = sanitizeHtml(q.solution);
      if (!sanitized) {
        console.warn(`[WARN] Sanitization produced empty output for ${q.id}`);
      }
    } catch (err) {
      sanitizationErrors++;
      console.error(`[ERROR] Sanitization crashed on ${q.id}:`, err);
    }
  }
}

console.log(`✓ Questions with solutions: ${questionsWithSolution}`);
console.log(`✓ Empty solution strings: ${emptySolutions}`);
console.log(`✓ Sanitization errors: ${sanitizationErrors}`);

// 4. CHECK OVERFLOW VULNERABILITIES (TEXT, IMAGES, TABLES, PRE)
console.log('\n=== [4/4] CHECKING OVERFLOW RISKS (TEXT, TABLES, IMAGES, PRE) ===');
let wideTables = 0;
let wideImages = 0;
let longWords = 0;
let preCodeBlocks = 0;

for (const q of allQuestions) {
  const contentPieces = [
    { type: 'body', html: q.bodyHtml },
    ...q.options.map(o => ({ type: 'option', html: o.html })),
    ...(q.solution ? [{ type: 'solution', html: q.solution }] : []),
  ];

  for (const piece of contentPieces) {
    // Check for explicit large inline widths e.g. width="600" or style="width: 800px"
    const widthMatches = piece.html.matchAll(/(?:width=["']?(\d+)|style=["'][^"']*width:\s*(\d+)px)/gi);
    for (const wm of widthMatches) {
      const w = parseInt(wm[1] || wm[2], 10);
      if (w > 500) {
        if (piece.html.includes('<table')) wideTables++;
        else if (piece.html.includes('<img')) wideImages++;
      }
    }

    if (piece.html.includes('<pre') || piece.html.includes('<code')) {
      preCodeBlocks++;
    }

    // Check for unbroken long strings (e.g. > 80 chars without whitespace or tag boundary)
    const textOnly = piece.html.replace(/<[^>]+>/g, ' ');
    const tokens = textOnly.split(/\s+/);
    for (const t of tokens) {
      // Ignore LaTeX formulas and base64 strings
      if (t.length > 80 && !t.startsWith('$') && !t.startsWith('\\') && !t.includes('data:image')) {
        longWords++;
      }
    }
  }
}

console.log(`✓ Elements with explicit width > 500px: ${wideTables + wideImages} (Tables: ${wideTables}, Images: ${wideImages})`);
console.log(`✓ <pre> or <code> blocks requiring responsive scroll/wrap: ${preCodeBlocks}`);
console.log(`✓ Extremely long non-math text tokens (>80 chars): ${longWords}`);

console.log('\n=== AUDIT COMPLETED SUCCESSFULLY ===');
