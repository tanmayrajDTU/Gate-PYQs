// scripts/import-other-questions.mjs
//
// Utility script to easily append new questions (e.g. ISRO, TIFR, or your custom sets)
// into data/other-questions.json.
//
// USAGE:
//   node scripts/import-other-questions.mjs path/to/new-questions.json
//
// Each question in your JSON should adhere to this structure:
// {
//   "id": "unique_id_string",
//   "number": "EXAM-2023-01",
//   "title": "ISRO CS 2023 | Question 1",
//   "exam": "ISRO CSE",               // e.g. "ISRO CSE", "TIFR CSE", "Custom Set 1"
//   "year": 2023,                     // or null
//   "subject": "Algorithms",
//   "subjectId": "algorithms",
//   "topic": "Dynamic Programming",
//   "topicId": "dp",
//   "topicNumber": "1.1",
//   "type": "mcq",                    // "mcq" | "msq" | "nat" | "descriptive"
//   "bodyHtml": "<p>Question text or HTML here...</p>",
//   "options": [
//     { "label": "A", "html": "Option 1" },
//     { "label": "B", "html": "Option 2" },
//     { "label": "C", "html": "Option 3" },
//     { "label": "D", "html": "Option 4" }
//   ],
//   "answer": "A",                    // e.g. "A" for MCQ, "A;B" for MSQ, "42" for NAT
//   "gateOverflowUrl": null,
//   "answerUrl": null,
//   "tags": ["isro", "algorithms"]
// }

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const TARGET_PATH = path.join(ROOT, 'data', 'other-questions.json');

const inputFile = process.argv[2];

if (!inputFile) {
  console.log('Please specify a JSON file to import:');
  console.log('  node scripts/import-other-questions.mjs <file.json>');
  process.exit(1);
}

const inputPath = path.resolve(process.cwd(), inputFile);
if (!existsSync(inputPath)) {
  console.error(`File not found: ${inputPath}`);
  process.exit(1);
}

const newItems = JSON.parse(readFileSync(inputPath, 'utf-8'));
if (!Array.isArray(newItems)) {
  console.error('Expected JSON input to be an array of questions.');
  process.exit(1);
}

const existing = existsSync(TARGET_PATH)
  ? JSON.parse(readFileSync(TARGET_PATH, 'utf-8'))
  : [];

const existingIds = new Set(existing.map(q => q.id));
let added = 0;
let updated = 0;

for (const item of newItems) {
  if (!item.id) {
    console.warn(`Skipping item without ID: ${item.title || item.number || 'unknown'}`);
    continue;
  }
  if (existingIds.has(item.id)) {
    const idx = existing.findIndex(q => q.id === item.id);
    existing[idx] = item;
    updated++;
  } else {
    existing.push(item);
    existingIds.add(item.id);
    added++;
  }
}

writeFileSync(TARGET_PATH, JSON.stringify(existing, null, 2), 'utf-8');
console.log(`\nImport complete:`);
console.log(`  - Added: ${added}`);
console.log(`  - Updated: ${updated}`);
console.log(`  - Total Non-GATE questions now: ${existing.length}`);
