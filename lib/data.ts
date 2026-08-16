import type { Question } from './types';
import catalog from '../data/catalog.json';
import stats from '../data/stats.json';
import questions from '../data/questions.json';
export const allQuestions = questions as Question[];
export const appCatalog = catalog;
export const appStats = stats as {total:number;types:Record<string,number>;volumes:Record<string,number>};
export function getSubjects(){return [...new Map(allQuestions.map(q=>[q.subjectId,{id:q.subjectId,name:q.subject,volume:q.volume}])).values()];}
export function getTopics(subject?:string){return [...new Map(allQuestions.filter(q=>!subject||q.subjectId===subject).map(q=>[q.topicId,{id:q.topicId,name:q.topic,number:q.topicNumber,subjectId:q.subjectId}])).values()];}
