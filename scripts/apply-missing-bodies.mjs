import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const QUESTIONS_PATH = path.join(ROOT, 'data', 'questions.json');
const MISSING_PATH = path.join(ROOT, 'scripts', 'missing-bodies.json');

if (!existsSync(MISSING_PATH)) {
  console.error('scripts/missing-bodies.json not found. Run scripts/scrape-missing-bodies.js in browser first.');
  process.exit(1);
}

const questions = JSON.parse(readFileSync(QUESTIONS_PATH, 'utf-8'));
const bodies = JSON.parse(readFileSync(MISSING_PATH, 'utf-8'));
const bodyMap = new Map(bodies.map(b => [b.id, b.bodyHtml]));

let count = 0;
for (const q of questions) {
  if (bodyMap.has(q.id)) {
    const fetched = bodyMap.get(q.id);
    if (fetched && fetched.trim()) {
      q.bodyHtml = fetched.trim();
      count++;
      console.log(`Updated body for ${q.number} (${q.id})`);
    }
  }
}

writeFileSync(QUESTIONS_PATH, JSON.stringify(questions, null, 2), 'utf-8');
console.log(`\nSuccessfully backfilled ${count} question bodies into questions.json.`);
