export type QuestionType = 'mcq' | 'msq' | 'nat' | 'descriptive';
export type Question = {
  id:string; number:string; title:string; volume:number; subject:string; subjectId:string;
  topic:string; topicId:string; topicNumber:string; year:number|null; exam:string; type:QuestionType;
  bodyHtml:string; options:{label:string;html:string}[]; answer:string|null; gateOverflowUrl:string|null;
  answerUrl:string|null; tags:string[];
};
