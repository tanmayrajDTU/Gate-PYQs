import fs from 'node:fs';
import { parseNatAnswer } from '../lib/natAnswer';

const questions = JSON.parse(fs.readFileSync(new URL('../data/questions.json', import.meta.url), 'utf8'));
const allowed = new Set(['mcq', 'msq', 'nat', 'descriptive']);
const required = ['id', 'number', 'title', 'volume', 'subject', 'subjectId', 'topic', 'topicId', 'type', 'bodyHtml', 'options', 'answer', 'gateOverflowUrl'];
const ids = new Set<string>();
const errors: string[] = [];

for (const q of questions) {
  if (ids.has(q.id)) errors.push(`duplicate id: ${q.id}`);
  ids.add(q.id);
  for (const k of required) if (!(k in q)) errors.push(`${q.id}: missing ${k}`);
  if (!allowed.has(q.type)) errors.push(`${q.id}: invalid type ${q.type}`);
  if ((q.type === 'nat' || q.type === 'descriptive') && q.options.length) errors.push(`${q.id}: ${q.type} has options`);
  if ((q.type === 'mcq' || q.type === 'msq') && q.options.length === 0) errors.push(`${q.id}: ${q.type} has no options`);
}

// NAT answer-key validation, using the same canonical parser the app scores
// with (lib/natAnswer.ts) — never a separate/duplicated implementation.
// This surfaces genuine data errors (e.g. a non-numeric answer key) without
// the QA script silently guessing or "fixing" anything.
const natQuestions = questions.filter((q: any) => q.type === 'nat');
let natSingle = 0, natRange = 0, natMultiSegment = 0;
for (const q of natQuestions) {
  const parsed = parseNatAnswer(q.answer);
  if (parsed.type === 'invalid') {
    errors.push(`${q.id}: NAT answer "${q.answer}" could not be parsed (not a single value, range, or ';'-separated set of either)`);
    continue;
  }
  if (parsed.segments.length > 1) natMultiSegment++;
  else if (parsed.segments[0].type === 'range') natRange++;
  else natSingle++;
}

const counts = Object.fromEntries([...allowed].map(t => [t, questions.filter((q: any) => q.type === t).length]));
console.log(JSON.stringify({
  total: questions.length,
  uniqueIds: ids.size,
  counts,
  natAnswerShapes: { single: natSingle, range: natRange, multiSegment: natMultiSegment, totalNat: natQuestions.length },
  errors,
}, null, 2));
if (errors.length) process.exit(1);
