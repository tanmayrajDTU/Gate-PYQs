import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'data', 'other-questions.json');
const text = fs.readFileSync(file, 'utf8');

const regex = /\/question-images\/kg\/([^"'`\s>]+)/g;
const matches = [...text.matchAll(regex)];

const missing = [];
for (const m of matches) {
  const p = path.join(process.cwd(), 'public', 'question-images', 'kg', m[1]);
  if (!fs.existsSync(p)) {
    missing.push(m[1]);
  }
}

console.log(`Total local KG image references: ${matches.length}`);
console.log(`Unique local KG image files: ${new Set(matches.map(m => m[1])).size}`);
console.log(`Missing files: ${missing.length}`);
if (missing.length > 0) {
  console.log('Sample missing:', missing.slice(0, 5));
} else {
  console.log('All referenced Knowledge Gate images are present locally on disk! 100% complete.');
}
