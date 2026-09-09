import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync('public/app.js','utf8');
const cefr=fs.readFileSync('public/cefr-levels.js','utf8');
const live=fs.readFileSync('public/cefr-live-books.js','utf8');
const a2=fs.readFileSync('public/a2-living-standard.js','utf8');
const server=fs.readFileSync('server.js','utf8');
const index=fs.readFileSync('public/index.html','utf8');
const levels=['A1','A2','B1','C1'];
let errors=[];
if(!server.includes("app.get('/cefr-levels.js'"))errors.push('CEFR asset routes: /cefr-levels.js is not served');
if(!server.includes("app.get('/cefr-live-books.js'"))errors.push('CEFR asset routes: /cefr-live-books.js is not served');
if(!server.includes("app.get('/a2-living-standard.js'"))errors.push('A2 Living Standard: /a2-living-standard.js is not served');

try{new Function(cefr)}catch(e){errors.push('cefr-levels.js syntax: '+e.message)}
try{new Function(live)}catch(e){errors.push('cefr-live-books.js syntax: '+e.message)}
try{new Function(a2)}catch(e){errors.push('a2-living-standard.js syntax: '+e.message)}

const syllabusMatch=app.match(/const SPEAKUP_A2_B1_SYLLABUS=(\[[\s\S]*?\]);\nconst SPEAKUP_B2_SYLLABUS/);
if(!syllabusMatch)errors.push('Could not read the 22-topic syllabus');
else{
 try{const syllabus=JSON.parse(syllabusMatch[1]);if(syllabus.length!==22)errors.push('Expected 22 topics, found '+syllabus.length)}
 catch(e){errors.push('Could not parse the 22-topic syllabus: '+e.message)}
}

if(!index.includes('cefr-levels.js')||!index.includes('cefr-live-books.js'))errors.push('CEFR modules are not loaded by index.html');
const a2Index=index.indexOf('a2-living-standard.js'),cefrIndex=index.indexOf('cefr-levels.js'),liveIndex=index.indexOf('cefr-live-books.js');
if(a2Index<0||!(cefrIndex<a2Index&&a2Index<liveIndex))errors.push('A2 living standard modules are not loaded in the required order');
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

/* A2 Living Standard validation */
try{
 const syllabus=JSON.parse(syllabusMatch[1]);
 const topicLibrary=JSON.parse(topicMatch[1]);
 const context={window:{},BOOK_PACKS:{'speakup-a2-b1':{id:'speakup-a2-b1',title:'SpeakUp English A2 → B1',level:'A2 → B1',moduleTitle:'SpeakUp English A2 → B1',moduleGoal:'Legacy A2 pathway',totalLessons:22,lessons:[]}},SPEAKUP_A2_B1_SYLLABUS:syllabus,TOPIC_LIBRARY:topicLibrary,lessonVocabExample:(word,lesson)=>'Natural example using '+word+' for '+lesson.title+'.'};
 vm.createContext(context);
 vm.runInContext(a2,context,{filename:'public/a2-living-standard.js'});
 const book=context.BOOK_PACKS['speakup-a2'];
 const wordCount=s=>String(s||'').trim().split(/\s+/).filter(Boolean).length;
 const minReading=n=>n<=7?75:n<=14?100:130;
 const minListening=n=>n<=7?60:n<=14?65:85;
 if(!book||book.standardVersion!=='a2-living-standard-v1')errors.push('A2 Living Standard: standalone A2 was not replaced by the living-standard book');
 else{
  if(book.lessons.length!==22)errors.push('A2 Living Standard: expected 22 lessons');
  const oldLessonOne=['hobby','hometown','occupation','outgoing','married','single'];
  const lessonOneWords=book.lessons[0]?.targetVocabulary||[];
  if(oldLessonOne.some(word=>!lessonOneWords.includes(word)))errors.push('A2 Living Standard: original Lesson 1 vocabulary was not preserved');
  const femaleNamesMatch=server.match(/const FEMALE_SPEAKER_NAMES=new Set\((\[[^\]]+\])\)/),maleNamesMatch=server.match(/const MALE_SPEAKER_NAMES=new Set\((\[[^\]]+\])\)/);
  const femaleNames=femaleNamesMatch?new Set(new Function('return '+femaleNamesMatch[1])()):new Set(),maleNames=maleNamesMatch?new Set(new Function('return '+maleNamesMatch[1])()):new Set();
  if(femaleNames.size<2||maleNames.size<2)errors.push('A2 multi-speaker QA: male/female speaker registries are missing');
  book.lessons.forEach((lesson,i)=>{
   const n=i+1;
   if(lesson.id!=='su-a2-l'+n)errors.push('A2 lesson '+n+': stable ID must remain su-a2-l'+n);
   if(lesson.title!==syllabus[i][0])errors.push('A2 lesson '+n+': topic mismatch');
   for(const key of ['foundation','a2Lift','performance','pronunciation','mediation'])if(!String(lesson[key]||'').trim())errors.push('A2 lesson '+n+': missing '+key);
   if(!Array.isArray(lesson.functions)||lesson.functions.length<3)errors.push('A2 lesson '+n+': needs 3 communicative functions');
   if(!Array.isArray(lesson.discourse)||lesson.discourse.length<3)errors.push('A2 lesson '+n+': needs 3 discourse targets');
   if(!Array.isArray(lesson.targetVocabulary)||lesson.targetVocabulary.length!==6)errors.push('A2 lesson '+n+': needs exactly 6 core vocabulary items');
   if(!Array.isArray(lesson.chunks)||lesson.chunks.length<4)errors.push('A2 lesson '+n+': needs at least 4 chunks');
   if(!Array.isArray(lesson.interactionExpressions)||lesson.interactionExpressions.length<3)errors.push('A2 lesson '+n+': needs at least 3 interaction expressions');
   if((lesson.vocabulary?.items||[]).length!==10)errors.push('A2 lesson '+n+': needs 10 vocabulary questions');
   const qs=lesson.listening?.questions||[],rqs=qs.filter(q=>String(q.tag||'').startsWith('reading:')),lqs=qs.filter(q=>String(q.tag||'').startsWith('listening:'));
   if(rqs.length<4||lqs.length<4)errors.push('A2 lesson '+n+': needs at least 4 reading and 4 listening questions');
   if(!rqs.some(q=>/(inference|main-idea|reason|purpose)/i.test(String(q.tag||''))))errors.push('A2 lesson '+n+': needs higher-order reading');
   if(!lqs.some(q=>/(reason|decision|result|inference)/i.test(String(q.tag||''))))errors.push('A2 lesson '+n+': needs higher-order listening');
   if(wordCount(lesson.listening?.readingText)<minReading(n))errors.push('A2 lesson '+n+': reading is below phase minimum');
   if(wordCount(lesson.listening?.audioScript)<minListening(n))errors.push('A2 lesson '+n+': listening is below phase minimum');
   const speakerLabels=[...String(lesson.listening?.audioScript||'').matchAll(/(?:^|\s)([A-Z][A-Za-z'’.-]{1,24}(?:\s+[A-Z][A-Za-z'’.-]{1,24})?):\s*/g)].map(m=>m[1].trim()),uniqueSpeakers=[...new Set(speakerLabels)];
   if(uniqueSpeakers.length<2)errors.push('A2 lesson '+n+': listening conversation must contain at least two named speakers');
   uniqueSpeakers.forEach(name=>{const key=String(name).toLowerCase().replace(/[^a-z ]+/g,' ').replace(/\s+/g,' ').trim().split(' ').pop();if(!femaleNames.has(key)&&!maleNames.has(key))errors.push('A2 lesson '+n+': speaker gender/voice mapping missing for '+name)});
   const grammar=lesson.grammar?.items||[];
   if(grammar.length<6)errors.push('A2 lesson '+n+': needs at least 6 contextual grammar questions');
   [...(lesson.vocabulary?.items||[]),...qs,...grammar].forEach((item,idx)=>{
    if(item.type==='exact')return;
    if(!Array.isArray(item.options)||item.options.length<3||!item.options.includes(item.answer))errors.push('A2 lesson '+n+': invalid auto-graded item '+(idx+1));
    else if(new Set(item.options.map(x=>String(x).toLowerCase().trim())).size!==item.options.length)errors.push('A2 lesson '+n+': duplicate options in item '+(idx+1));
   });
   const writing=lesson.writing||{};
   if(!writing.task||Number(writing.minWords)<50||Number(writing.maxWords)>90)errors.push('A2 lesson '+n+': authentic writing task/range is invalid');
   if(writing.humanGraded)errors.push('A2 lesson '+n+': A2 writing remains formative/auto-supported, not a teacher checkpoint');
   if(/placeholder|lorem ipsum|todo\b|tbd\b|being prepared|coming soon/i.test(JSON.stringify(lesson)))errors.push('A2 lesson '+n+': placeholder content detected');
  });
 }
 const legacy=context.BOOK_PACKS['speakup-a2-b1'];
 if(!legacy||legacy.standardVersion!=='a2-living-standard-v1'||legacy.lessons.length!==22)errors.push('A2 Living Standard: legacy A2 pathway was not upgraded');
 else legacy.lessons.forEach((lesson,i)=>{if(lesson.id!=='su-a2b1-l'+(i+1))errors.push('A2 legacy lesson '+(i+1)+': stable ID must remain su-a2b1-l'+(i+1))});
}catch(e){errors.push('A2 Living Standard validation failed: '+e.message)}
if(!live.includes('A2 LIFT'))errors.push('A2 live book must include explicit A2 LIFT');
if(!live.includes('PRONUNCIATION FOCUS'))errors.push('A2 live book must include pronunciation focus');
if(!live.includes('MEDIATION MOVE'))errors.push('A2 live book must include mediation move');
if(!live.includes("standardVersion==='a2-living-standard-v1'"))errors.push('A2 live book is not gated to the living-standard source');
if(!live.includes("window.LIVE_BOOKS['speakup-a2-b1']"))errors.push('Legacy A2 live book is not rebuilt from the A2 Living Standard');

const requiredStages=['PAGE 1 — WARM UP','PAGE 2 — VOCABULARY','PAGE 3 — READING','PAGE 4 — LANGUAGE FOCUS','PAGE 5 — LISTENING','PAGE 6 — FLUENCY MISSION','PAGE 7 — CLASSROOM CHALLENGE','PAGE 8 — REFLECTION'];
requiredStages.forEach(stage=>{if(!live.includes(stage))errors.push('Live lesson generator missing '+stage)});
if(!app.includes("LANGUAGE FOCUS|LISTENING|FLUENCY MISSION|CLASSROOM CHALLENGE"))errors.push('Listening must be a standalone live lesson stage and Classroom Challenge must not be merged into adjacent stages');
if(!app.includes('data-live-audio-player')||!app.includes('wireLiveAudioPlayers'))errors.push('Live lesson listening audio player is missing');
if(!app.includes('Transcript · open after listening'))errors.push('Live lesson transcript must be hidden until the learner chooses to open it');
if(!app.includes('Preparing audio…')||!app.includes('browserSpeechAvailable')||!app.includes('playBrowserSpeech'))errors.push('Listening audio must preload and provide a browser-voice fallback when natural audio cannot play');
if(!server.includes("app.post('/api/audio'"))errors.push('Live lesson audio requires the authenticated natural-audio endpoint');
if(!server.includes('OPENAI_TTS_FEMALE_VOICES')||!server.includes('OPENAI_TTS_MALE_VOICES')||!server.includes('dialogueTurns')||!server.includes('speakerVoicePlan')||!server.includes("response_format:'wav'"))errors.push('Conversation listening must support distinct male/female multi-speaker voices');
if(!a2.includes("partner+': ")||!a2.includes("person+': "))errors.push('A2 listening conversations must preserve explicit speaker labels for multi-speaker audio');
if(!app.includes('function isVocabularyHeader')||!app.includes('data-vocab-meaning')||!app.includes("modern=t.match(/^(.+?)\\s+[—–-]"))errors.push('CEFR vocabulary must render as clickable EnglishGate word + example cards with hidden definitions');
if(!live.includes("meaningItems=(lesson.vocabulary?.items||[]).filter")||!live.includes("item?.tag==='vocabulary:meaning'"))errors.push('A2 live vocabulary must use the original source definitions, not placeholder meanings');
if(/\bHOMEWORK\b/i.test(live))errors.push('Homework must not appear in standalone CEFR live lessons');
if(!live.includes('Complete Questions 1–5 together in class.'))errors.push('Classroom grammar relay is missing');
if(!live.includes('explains why that answer matches the intended meaning'))errors.push('Grammar justification rule is missing');
if(!cefr.includes('[5,10,15,18,22]'))errors.push('B1/C1 writing checkpoint schedule missing');
if(!cefr.includes('minWords:min,maxWords:max'))errors.push('Level-specific authentic writing ranges missing');
if(!server.includes('CLASS_BOOK_LOCKED'))errors.push('Class workflow must lock one book to one class');
if(!server.includes('Create a new class when the teacher starts a different book.'))errors.push('Class-book change guard is missing');
if(!app.includes('One class = one teacher + one book.'))errors.push('Admin class workflow explanation is missing');
if(app.includes('data-admin-class-book='))errors.push('Admin UI still exposes book reassignment on an existing class');
if(!app.includes('data-add-student-class='))errors.push('Teacher class cards must allow adding students to that class');
if(!server.includes('create table if not exists level_certificates'))errors.push('Level certificate persistence is missing');
if(!server.includes("app.post('/api/certificates/claim'"))errors.push('Student certificate claim endpoint is missing');
if(!server.includes("app.get('/api/certificates/verify/:number'"))errors.push('Certificate verification endpoint is missing');
if(!server.includes("'speakup-a1':'su-a1-l'" )||!server.includes("'speakup-c1':'su-c1-l'"))errors.push('Standalone CEFR certificate lesson mapping is incomplete');
if(!app.includes('Level Completion Certificate'))errors.push('Student certificate experience is missing');
if(!app.includes('Print / Save as PDF'))errors.push('Certificate print/save action is missing');

if(errors.length){console.error('CEFR population QA failed:\n- '+errors.join('\n- '));process.exit(1)}
console.log('CEFR population QA passed: A1, A2, B1 and C1 modules are complete and wired to the 22-topic EnglishGate spine.');
