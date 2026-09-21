import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const QUESTIONS_PATH = path.join(ROOT, 'data', 'questions.json');

const questions = JSON.parse(readFileSync(QUESTIONS_PATH, 'utf-8'));

const issues = {
  duplicate_ids: [],
  invalid_type: [],
  missing_body: [],
  mcq_msq_no_options: [],
  options_with_empty_html: [],
  mcq_msq_no_answer: [],
  mcq_msq_placeholder_answer: [],
  nat_no_answer: [],
  nat_placeholder_answer: [],
  descriptive_has_options: [],
  descriptive_with_letter_answer: [],
  descriptive_has_choice_text: [],
};

const idSet = new Set();

for (const q of questions) {
  if (idSet.has(q.id)) issues.duplicate_ids.push(q.id);
  idSet.add(q.id);

  if (!['mcq', 'msq', 'nat', 'descriptive'].includes(q.type)) {
    issues.invalid_type.push({ id: q.id, number: q.number, type: q.type });
  }

  if (!q.bodyHtml || q.bodyHtml.trim() === '') {
    issues.missing_body.push({ id: q.id, number: q.number });
  }

  const ans = (q.answer || '').trim();

  // MCQ / MSQ checks
  if (q.type === 'mcq' || q.type === 'msq') {
    if (!q.options || q.options.length === 0) {
      issues.mcq_msq_no_options.push({ id: q.id, number: q.number, year: q.year, type: q.type });
    } else {
      for (const opt of q.options) {
        if (!opt.html || opt.html.trim() === '') {
          issues.options_with_empty_html.push({ id: q.id, number: q.number, label: opt.label });
        }
      }
    }

    if (!ans) {
      issues.mcq_msq_no_answer.push({ id: q.id, number: q.number, year: q.year, type: q.type });
    } else if (ans.toUpperCase() === 'TBA' || ans.toUpperCase() === 'X') {
      issues.mcq_msq_placeholder_answer.push({ id: q.id, number: q.number, year: q.year, answer: q.answer });
    }
  }

  // NAT checks
  if (q.type === 'nat') {
    if (!ans) {
      issues.nat_no_answer.push({ id: q.id, number: q.number, year: q.year });
    } else if (ans.toUpperCase() === 'TBA' || ans.toUpperCase() === 'X') {
      issues.nat_placeholder_answer.push({ id: q.id, number: q.number, year: q.year, answer: q.answer });
    }
  }

  // Descriptive checks
  if (q.type === 'descriptive') {
    if (q.options && q.options.length > 0) {
      issues.descriptive_has_options.push({ id: q.id, number: q.number, year: q.year });
    }
    if (ans && /^[A-D]$/i.test(ans)) {
      issues.descriptive_with_letter_answer.push({ id: q.id, number: q.number, year: q.year, answer: q.answer });
    }
    const body = (q.bodyHtml || '').toLowerCase();
    if (body.includes('which of the following') || body.includes('which one of the following')) {
      issues.descriptive_has_choice_text.push({ id: q.id, number: q.number, year: q.year, answer: q.answer });
    }
  }
}

console.log('--- AUDIT SUMMARY ---');
console.log('Total questions:', questions.length);
console.log('Duplicate IDs:', issues.duplicate_ids.length);
console.log('Invalid types:', issues.invalid_type.length);
console.log('Missing body:', issues.missing_body.length);
console.log('MCQ/MSQ with no options:', issues.mcq_msq_no_options.length);
console.log('Options with empty HTML:', issues.options_with_empty_html.length);
console.log('MCQ/MSQ with no answer:', issues.mcq_msq_no_answer.length);
console.log('MCQ/MSQ with placeholder answer (TBA/X):', issues.mcq_msq_placeholder_answer.length);
console.log('NAT with no answer:', issues.nat_no_answer.length);
console.log('NAT with placeholder answer (TBA/X):', issues.nat_placeholder_answer.length);
console.log('Descriptive with options array:', issues.descriptive_has_options.length);
console.log('Descriptive with single-letter answer (A-D):', issues.descriptive_with_letter_answer.length);
console.log('Descriptive with choice text ("which of the following"):', issues.descriptive_has_choice_text.length);

console.log('\n--- DETAILS ---');
console.log('MCQ/MSQ placeholder answers (' + issues.mcq_msq_placeholder_answer.length + '):');
console.log(JSON.stringify(issues.mcq_msq_placeholder_answer, null, 2));

console.log('NAT placeholder answers (' + issues.nat_placeholder_answer.length + '):');
console.log(JSON.stringify(issues.nat_placeholder_answer, null, 2));

console.log('Descriptive with letter answer (' + issues.descriptive_with_letter_answer.length + '):');
console.log(JSON.stringify(issues.descriptive_with_letter_answer, null, 2));

console.log('Descriptive with choice text (' + issues.descriptive_has_choice_text.length + '):');
console.log(JSON.stringify(issues.descriptive_has_choice_text, null, 2));
