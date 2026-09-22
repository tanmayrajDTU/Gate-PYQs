import type { Question } from './types';
import otherQuestionsData from '../data/other-questions.json';

export const allOtherQuestions = otherQuestionsData as Question[];

export function getOtherExams(): string[] {
  return [...new Set(allOtherQuestions.map(q => q.exam))].filter(Boolean).sort();
}

export function getOtherSubjects(exam?: string): { id: string; name: string }[] {
  const filtered = allOtherQuestions.filter(q => !exam || exam === 'all' || q.exam === exam);
  const seen = new Set<string>();
  const list: { id: string; name: string }[] = [];
  for (const q of filtered) {
    if (!seen.has(q.subject)) {
      seen.add(q.subject);
      list.push({ id: q.subject, name: q.subject });
    }
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export function getOtherTopics(exam?: string, subject?: string): { id: string; name: string; number: string; subjectId: string }[] {
  const filtered = allOtherQuestions.filter(q =>
    (!exam || exam === 'all' || q.exam === exam) &&
    (!subject || subject === 'all' || q.subject === subject || q.subjectId === subject)
  );
  return [...new Map(filtered.map(q => [q.topicId, { id: q.topicId, name: q.topic, number: q.topicNumber, subjectId: q.subjectId }])).values()]
    .sort((a, b) => `${a.number} ${a.name}`.localeCompare(`${b.number} ${b.name}`, undefined, { numeric: true }));
}

export function getOtherYears(exam?: string): number[] {
  const filtered = allOtherQuestions.filter(q => (!exam || exam === 'all' || q.exam === exam) && q.year !== null);
  return [...new Set(filtered.map(q => q.year as number))].sort((a, b) => b - a);
}
