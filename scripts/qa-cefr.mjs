import fs from 'node:fs';

const app=fs.readFileSync('public/app.js','utf8');
const cefr=fs.readFileSync('public/cefr-levels.js','utf8');
const live=fs.readFileSync('public/cefr-live-books.js','utf8');
const server=fs.readFileSync('server.js','utf8');
if(!server.includes("app.get('/cefr-levels.js'"))errors.push('CEFR asset routes: /cefr-levels.js is not served');
if(!server.includes("app.get('/cefr-live-books.js'"))errors.push('CEFR asset routes: /cefr-live-books.js is not served');
const index=fs.readFileSync('public/index.html','utf8');
const levels=['A1','A2','B1','C1'];
let errors=[];

try{new Function(cefr)}catch(e){errors.push('cefr-levels.js syntax: '+e.message)}
try{new Function(live)}catch(e){errors.push('cefr-live-books.js syntax: '+e.message)}

const syllabusMatch=app.match(/const SPEAKUP_A2_B1_SYLLABUS=(\[[\s\S]*?\]);\nconst SPEAKUP_B2_SYLLABUS/);
if(!syllabusMatch)errors.push('Could not read the 22-topic syllabus');
else{
 try{const syllabus=JSON.parse(syllabusMatch[1]);if(syllabus.length!==22)errors.push('Expected 22 topics, found '+syllabus.length)}
 catch(e){errors.push('Could not parse the 22-topic syllabus: '+e.message)}
}

if(!index.includes('cefr-levels.js')||!index.includes('cefr-live-books.js'))errors.push('CEFR modules are not loaded by index.html');
if(!cefr.includes('BOOK_PACKS[book.id]=book'))errors.push('Standalone workbooks are not registered in BOOK_PACKS');
if(!live.includes("const LEVELS=['A1','A2','B1','C1']"))errors.push('Live CEFR level registry is incomplete');
const topicMatch=app.match(/const TOPIC_LIBRARY=(\{[\s\S]*?\});\nconst CAREER_LESSON_SPECS/);
const vocabMatch=live.match(/const VOCAB_USAGE=(\{[\s\S]*?\});\n\nfunction warm/);
if(!topicMatch||!vocabMatch)errors.push('Could not inspect CEFR vocabulary coverage');
else{
 try{
  const topicLibrary=JSON.parse(topicMatch[1]);
  const usage=new Function('return ('+vocabMatch[1]+')')();
  const words=[...new Set(Object.values(topicLibrary).flatMap(x=>x.v.map(v=>v[0])))];
  const missing=words.filter(word=>!usage[word]);
  if(missing.length)errors.push('Missing real vocabulary usage examples: '+missing.join(', '));
 }catch(e){errors.push('Could not validate vocabulary usage examples: '+e.message)}
}

for(const level of levels){
 const id='speakup-'+level.toLowerCase();
 if(!cefr.includes(level+':{'))errors.push(id+': workbook configuration missing');
 if(!server.includes('"id":"'+id+'"'))errors.push(id+': backend book seed missing');
}

const requiredStages=['PAGE 1 — WARM UP','PAGE 2 — VOCABULARY','PAGE 3 — READING','PAGE 4 — LANGUAGE FOCUS','PAGE 5 — LISTENING','PAGE 6 — FLUENCY MISSION','PAGE 7 — CLASSROOM CHALLENGE','PAGE 8 — REFLECTION'];
requiredStages.forEach(stage=>{if(!live.includes(stage))errors.push('Live lesson generator missing '+stage)});
if(/\bHOMEWORK\b/i.test(live))errors.push('Homework must not appear in standalone CEFR live lessons');
if(!live.includes('Complete Questions 1–5 together in class.'))errors.push('Classroom grammar relay is missing');
if(!live.includes('explains why that answer matches the intended meaning'))errors.push('Grammar justification rule is missing');
if(!cefr.includes('[5,10,15,18,22]'))errors.push('B1/C1 writing checkpoint schedule missing');
if(!cefr.includes('minWords:min,maxWords:max'))errors.push('Level-specific authentic writing ranges missing');

if(errors.length){console.error('CEFR population QA failed:\n- '+errors.join('\n- '));process.exit(1)}
console.log('CEFR population QA passed: A1, A2, B1 and C1 modules are complete and wired to the 22-topic EnglishGate spine.');
