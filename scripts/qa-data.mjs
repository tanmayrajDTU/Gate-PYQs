import fs from 'node:fs';
const questions=JSON.parse(fs.readFileSync(new URL('../data/questions.json',import.meta.url)));
const allowed=new Set(['mcq','msq','nat','descriptive']);
const required=['id','number','title','volume','subject','subjectId','topic','topicId','type','bodyHtml','options','answer','gateOverflowUrl'];
const ids=new Set(); const errors=[];
for(const q of questions){
  if(ids.has(q.id)) errors.push(`duplicate id: ${q.id}`); ids.add(q.id);
  for(const k of required) if(!(k in q)) errors.push(`${q.id}: missing ${k}`);
  if(!allowed.has(q.type)) errors.push(`${q.id}: invalid type ${q.type}`);
  if((q.type==='nat'||q.type==='descriptive') && q.options.length) errors.push(`${q.id}: ${q.type} has options`);
  if((q.type==='mcq'||q.type==='msq') && q.options.length===0) errors.push(`${q.id}: ${q.type} has no options`);
}
const counts=Object.fromEntries([...allowed].map(t=>[t,questions.filter(q=>q.type===t).length]));
console.log(JSON.stringify({total:questions.length,uniqueIds:ids.size,counts,errors},null,2));
if(errors.length) process.exit(1);
