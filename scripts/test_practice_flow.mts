import { allQuestions } from '../lib/data';
import { isNatAnswerCorrect } from '../lib/natAnswer';
import type { Question } from '../lib/types';

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

console.log('Testing GATE questions evaluation:');
const gateMCQ = allQuestions.find(q => q.type === 'mcq')!;
console.log('Sample GATE MCQ:', gateMCQ.id, gateMCQ.number, 'Expected answer:', gateMCQ.answer);

// Test correct answer
const resCorrect = evaluateAnswer(gateMCQ, [gateMCQ.answer!]);
console.log('Evaluate correct answer:', resCorrect);

// Test wrong answer
const resWrong = evaluateAnswer(gateMCQ, ['Z']);
console.log('Evaluate wrong answer:', resWrong);

// Test empty answer
const resEmpty = evaluateAnswer(gateMCQ, []);
console.log('Evaluate empty answer:', resEmpty);
