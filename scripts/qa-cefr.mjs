import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync('public/app.js','utf8');
const cefr=fs.readFileSync('public/cefr-levels.js','utf8');
const live=fs.readFileSync('public/cefr-live-books.js','utf8');
const a1p1=fs.readFileSync('public/a1-foundation-phase1.js','utf8');
const a1p2=fs.readFileSync('public/a1-foundation-phase2.js','utf8');
const a1p3=fs.readFileSync('public/a1-foundation-phase3.js','utf8');
const a1p4=fs.readFileSync('public/a1-foundation-phase4.js','utf8');
const a1=fs.readFileSync('public/a1-foundation-standard.js','utf8');
const a2=fs.readFileSync('public/a2-living-standard.js','utf8');
const server=fs.readFileSync('server.js','utf8');
const index=fs.readFileSync('public/index.html','utf8');
const levels=['A1','A2','B1','C1'];
let errors=[];
if(!server.includes("app.get('/cefr-levels.js'"))errors.push('CEFR asset routes: /cefr-levels.js is not served');
if(!server.includes("app.get('/cefr-live-books.js'"))errors.push('CEFR asset routes: /cefr-live-books.js is not served');
['a1-foundation-phase1.js','a1-foundation-phase2.js','a1-foundation-phase3.js','a1-foundation-phase4.js','a1-foundation-standard.js'].forEach(file=>{if(!server.includes("app.get('/"+file+"'"))errors.push('A1 Foundation: /'+file+' is not served')});
if(!server.includes("app.get('/a2-living-standard.js'"))errors.push('A2 Living Standard: /a2-living-standard.js is not served');

try{new Function(cefr)}catch(e){errors.push('cefr-levels.js syntax: '+e.message)}
try{new Function(live)}catch(e){errors.push('cefr-live-books.js syntax: '+e.message)}
[[a1p1,'a1-foundation-phase1.js'],[a1p2,'a1-foundation-phase2.js'],[a1p3,'a1-foundation-phase3.js'],[a1p4,'a1-foundation-phase4.js'],[a1,'a1-foundation-standard.js']].forEach(([code,name])=>{try{new Function(code)}catch(e){errors.push(name+' syntax: '+e.message)}});
try{new Function(a2)}catch(e){errors.push('a2-living-standard.js syntax: '+e.message)}

const syllabusMatch=app.match(/const SPEAKUP_A2_B1_SYLLABUS=(\[[\s\S]*?\]);\nconst SPEAKUP_B2_SYLLABUS/);
if(!syllabusMatch)errors.push('Could not read the 22-topic syllabus');
else{
 try{const syllabus=JSON.parse(syllabusMatch[1]);if(syllabus.length!==22)errors.push('Expected 22 topics, found '+syllabus.length)}
 catch(e){errors.push('Could not parse the 22-topic syllabus: '+e.message)}
}

if(!index.includes('cefr-levels.js')||!index.includes('cefr-live-books.js'))errors.push('CEFR modules are not loaded by index.html');
const a1p1Index=index.indexOf('a1-foundation-phase1.js'),a1p2Index=index.indexOf('a1-foundation-phase2.js'),a1p3Index=index.indexOf('a1-foundation-phase3.js'),a1p4Index=index.indexOf('a1-foundation-phase4.js'),a1Index=index.indexOf('a1-foundation-standard.js'),a2Index=index.indexOf('a2-living-standard.js'),cefrIndex=index.indexOf('cefr-levels.js'),liveIndex=index.indexOf('cefr-live-books.js');
if([a1p1Index,a1p2Index,a1p3Index,a1p4Index,a1Index,a2Index,cefrIndex,liveIndex].some(x=>x<0)||!(cefrIndex<a1p1Index&&a1p1Index<a1p2Index&&a1p2Index<a1p3Index&&a1p3Index<a1p4Index&&a1p4Index<a1Index&&a1Index<a2Index&&a2Index<liveIndex))errors.push('A1/A2 standard modules are not loaded in the required order');
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

/* A1 Foundation 44 validation */
try{
 const context={window:{A1_FOUNDATION_SPECS:[]},BOOK_PACKS:{}};
 vm.createContext(context);
 vm.runInContext(a1p1,context,{filename:'public/a1-foundation-phase1.js'});
 vm.runInContext(a1p2,context,{filename:'public/a1-foundation-phase2.js'});
 vm.runInContext(a1p3,context,{filename:'public/a1-foundation-phase3.js'});
 vm.runInContext(a1p4,context,{filename:'public/a1-foundation-phase4.js'});
 vm.runInContext(a1,context,{filename:'public/a1-foundation-standard.js'});
 const book=context.BOOK_PACKS['speakup-a1'],wordCount=value=>String(value||'').trim().split(/\s+/).filter(Boolean).length;
 const readingBand=n=>n<=11?[30,60]:n<=22?[50,80]:n<=33?[70,110]:[100,140],writingBand=n=>n<=3?[10,20]:n<=6?[15,25]:n<=10?[20,30]:n<=11?[25,60]:n<=22?[45,80]:n<=33?[60,100]:[70,110];
 const femaleVoices=new Set(['coral','nova','shimmer']),maleVoices=new Set(['echo','onyx','ash']),speakerProfiles=new Map(),scripts=[];
 if(!book||book.standardVersion!=='a1-foundation-44-v1')errors.push('A1 Foundation: 44-lesson standard did not replace the generic A1 book');
 else{
  if(book.totalLessons!==44||book.lessons.length!==44)errors.push('A1 Foundation: expected exactly 44 lessons');
  const phases=[0,0,0,0];
  book.lessons.forEach((lesson,i)=>{
   const n=i+1;phases[(lesson.phase||1)-1]=(phases[(lesson.phase||1)-1]||0)+1;
   if(lesson.id!=='su-a1-l'+n)errors.push('A1 lesson '+n+': stable ID must remain su-a1-l'+n);
   if(lesson.number!==n)errors.push('A1 lesson '+n+': lesson number mismatch');
   if(!lesson.title||!lesson.outcome||!lesson.readingSkill||!lesson.performance)errors.push('A1 lesson '+n+': core lesson metadata is incomplete');
   if((lesson.vocabularyEntries||[]).length!==6)errors.push('A1 lesson '+n+': needs exactly 6 vocabulary entries');
   if((lesson.vocabulary?.items||[]).length!==10)errors.push('A1 lesson '+n+': needs exactly 10 vocabulary questions');
   const questions=lesson.listening?.questions||[],rqs=questions.filter(q=>String(q.tag||'').startsWith('reading:')),lqs=questions.filter(q=>String(q.tag||'').startsWith('listening:'));
   if(rqs.length!==6||lqs.length!==6)errors.push('A1 lesson '+n+': needs 6 reading and 6 listening checks');
   const [minReading,maxReading]=readingBand(n),readingWords=wordCount(lesson.listening?.readingText);
   if(readingWords<minReading||readingWords>maxReading)errors.push('A1 lesson '+n+': reading length '+readingWords+' is outside '+minReading+'–'+maxReading+' words');
   if((lesson.grammar?.items||[]).length!==8)errors.push('A1 lesson '+n+': needs exactly 8 focused grammar questions');
   (lesson.grammar?.items||[]).forEach((item,idx)=>{if(!Array.isArray(item.options)||item.options.length!==3||!item.options.includes(item.answer))errors.push('A1 lesson '+n+': invalid grammar item '+(idx+1))});
   const [minWriting,maxWriting]=writingBand(n);
   if(!lesson.writing?.task||Number(lesson.writing.minWords)!==minWriting||Number(lesson.writing.maxWords)!==maxWriting)errors.push('A1 lesson '+n+': writing range must progress to '+minWriting+'–'+maxWriting+' words');
   const script=String(lesson.listening?.audioScript||''),matches=[...script.matchAll(/(?:^|(?<=[.!?])\s+)([A-Z][A-Za-z'’-]{1,24}(?:\s+[A-Z][A-Za-z'’-]{1,24})?):\s*/g)],labels=matches.map(m=>m[1].trim()),unique=[...new Set(labels)],profiles=lesson.listening?.speakers||[];
   scripts.push(script);
   if(unique.length!==2)errors.push('A1 lesson '+n+': listening must contain exactly two named speakers');
   if(labels.length<6||labels.length>12)errors.push('A1 lesson '+n+': listening dialogue should contain 6–12 turns');
   if(profiles.length!==2)errors.push('A1 lesson '+n+': each dialogue needs exactly two speaker profiles');
   const profileMap=new Map(profiles.map(p=>[String(p?.name||'').toLowerCase(),p]));
   unique.forEach(name=>{
    const p=profileMap.get(name.toLowerCase()),gender=String(p?.gender||''),voice=String(p?.voice||'');
    if(!p||!['female','male'].includes(gender))errors.push('A1 lesson '+n+': explicit gender metadata missing for '+name);
    else{
     const allowed=gender==='female'?femaleVoices:maleVoices;
     if(!allowed.has(voice))errors.push('A1 lesson '+n+': stable voice metadata missing or invalid for '+name);
     const prior=speakerProfiles.get(name.toLowerCase());
     if(prior&&(prior.gender!==gender||prior.voice!==voice))errors.push('A1 speaker '+name+': gender or voice changes between lessons');
     speakerProfiles.set(name.toLowerCase(),{gender,voice})
    }
   });
   profiles.forEach(p=>{if(!unique.some(name=>name.toLowerCase()===String(p?.name||'').toLowerCase()))errors.push('A1 lesson '+n+': unused speaker profile '+String(p?.name||''))});
   if(profiles.length===2&&profiles[0]?.gender===profiles[1]?.gender&&profiles[0]?.voice===profiles[1]?.voice)errors.push('A1 lesson '+n+': same-gender speakers must use different voices');
   if(/placeholder|lorem ipsum|todo\b|tbd\b|being prepared|coming soon/i.test(JSON.stringify(lesson)))errors.push('A1 lesson '+n+': placeholder content detected');
  });
  if(phases.some(x=>x!==11))errors.push('A1 Foundation: each of the four phases must contain exactly 11 lessons');
  if(new Set(scripts).size!==44)errors.push('A1 Foundation: all 44 listening scripts must be distinct');
 }
}catch(e){errors.push('A1 Foundation validation failed: '+e.message)}
if(!server.includes('{"id":"speakup-a1","title":"A1 Beginner","level":"A1","audience":"Beginner","status":"ready","total_lessons":44'))errors.push('A1 Foundation: backend book seed must expose 44 lessons');
if(!app.includes("const all=(l.listening?.questions||[]).slice(0,12)"))errors.push('A1 Foundation: workbook listening must expose all 12 reading/listening checks');
if(!app.includes('const A1_EARLY_WRITING_MODELS=')||!app.includes("early?'Sentence Order':'Paragraph Ordering'")||!app.includes("early?'Tap the two sentences in the natural order.'"))errors.push('A1 Foundation: Lessons 1–10 must use the simplified writing progression instead of paragraph ordering');
if(!app.includes("build:{level:1,label:'Build a sentence'}")||!app.includes("organize:{level:4,label:'Put two sentences in order'}"))errors.push('A1 Foundation: early writing ladder labels must stay beginner-friendly');
if(!live.includes("level==='A1'&&lesson.standardVersion==='a1-foundation-44-v1'")||!live.includes('function a1LessonContent')||!live.includes("expected=level==='A1'?44:22"))errors.push('A1 Foundation: 44-lesson live-book renderer is not wired');
if(!live.includes('READING SKILL')||!live.includes('a1VocabularyRows'))errors.push('A1 Foundation: live lessons must expose explicit reading-skill progression and real vocabulary entries');

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
  const listeningScripts=[],speakerProfilesSeen=new Map(),femaleVoices=new Set(['coral','nova','shimmer']),maleVoices=new Set(['onyx','echo','ash']);
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
   const script=String(lesson.listening?.audioScript||''),speakerMatches=[...script.matchAll(/(?:^|(?<=[.!?])\s+)([A-Z][A-Za-z'’-]{1,24}(?:\s+[A-Z][A-Za-z'’-]{1,24})?):\s*/g)],speakerLabels=speakerMatches.map(m=>m[1].trim()),uniqueSpeakers=[...new Set(speakerLabels)],profiles=lesson.listening?.speakers||[];
   listeningScripts.push(script);
   if(uniqueSpeakers.length!==2)errors.push('A2 lesson '+n+': listening conversation must contain exactly two named speakers');
   if(speakerLabels.length<8||speakerLabels.length>12)errors.push('A2 lesson '+n+': listening dialogue should have 8–12 coherent turns');
   for(let t=1;t<speakerLabels.length;t++)if(speakerLabels[t]===speakerLabels[t-1])errors.push('A2 lesson '+n+': consecutive dialogue turns must not belong to the same speaker');
   if(!Array.isArray(profiles)||profiles.length!==uniqueSpeakers.length)errors.push('A2 lesson '+n+': every listening speaker needs explicit gender and voice metadata');
   const profileMap=new Map((profiles||[]).map(x=>[String(x?.name||'').toLowerCase(),{gender:String(x?.gender||'').toLowerCase(),voice:String(x?.voice||'')}]));
   uniqueSpeakers.forEach(name=>{
    const profile=profileMap.get(name.toLowerCase());
    if(!profile||!['female','male'].includes(profile.gender))errors.push('A2 lesson '+n+': explicit gender metadata missing for '+name);
    else{
     const allowed=profile.gender==='female'?femaleVoices:maleVoices;
     if(!allowed.has(profile.voice))errors.push('A2 lesson '+n+': stable voice metadata missing or invalid for '+name);
     const prior=speakerProfilesSeen.get(name.toLowerCase());
     if(prior&&(prior.gender!==profile.gender||prior.voice!==profile.voice))errors.push('A2 speaker '+name+': gender or voice changes between lessons');
     speakerProfilesSeen.set(name.toLowerCase(),profile)
    }
   });
   if(profiles.length===2&&profiles[0]?.gender===profiles[1]?.gender&&profiles[0]?.voice===profiles[1]?.voice)errors.push('A2 lesson '+n+': same-gender speakers must use different voices');
   (profiles||[]).forEach(profile=>{if(!uniqueSpeakers.some(name=>name.toLowerCase()===String(profile?.name||'').toLowerCase()))errors.push('A2 lesson '+n+': speaker metadata contains unused name '+String(profile?.name||''))});
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
  if(new Set(listeningScripts).size!==22)errors.push('A2 listening: every lesson must have a distinct audio script');
  const oldTemplateFragments=['What are you trying to do?','What is making it difficult?','So what are you going to do?','And what happened after that?','What did you learn?','A clear plan and a clear explanation can make the situation easier.'];
  oldTemplateFragments.forEach(fragment=>{const count=listeningScripts.filter(script=>script.includes(fragment)).length;if(count>1)errors.push('A2 listening: repeated template line still appears across '+count+' lessons: '+fragment)});
  const shingleSet=text=>{const words=String(text||'').toLowerCase().replace(/[^a-z0-9' ]+/g,' ').split(/\s+/).filter(Boolean),set=new Set();for(let i=0;i<=words.length-8;i++)set.add(words.slice(i,i+8).join(' '));return set};
  const shingles=listeningScripts.map(shingleSet);
  for(let i=0;i<shingles.length;i++)for(let j=i+1;j<shingles.length;j++){let shared=0;for(const x of shingles[i])if(shingles[j].has(x))shared++;const base=Math.max(1,Math.min(shingles[i].size,shingles[j].size));if(shared/base>.18)errors.push('A2 listening: lessons '+(i+1)+' and '+(j+1)+' are still too structurally similar')}
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
const adminLiveStart=app.indexOf('function adminLiveLesson('),adminLiveEnd=app.indexOf('function adminBookBrowse(',adminLiveStart);
const adminLiveBlock=adminLiveStart>=0&&adminLiveEnd>adminLiveStart?app.slice(adminLiveStart,adminLiveEnd):'';
if(!adminLiveBlock.includes('wireLiveAudioPlayers()'))errors.push('Admin live lesson preview must wire listening audio playback');
if(!app.includes('Transcript · open after listening'))errors.push('Live lesson transcript must be hidden until the learner chooses to open it');
if(!app.includes('function dialogueTranscriptTurns')||!app.includes('function dialogueTranscriptHtml')||!app.includes('eg-dialogue-turn')||!app.includes("dialogueTranscriptHtml(l.listening.audioScript,'is-workbook')"))errors.push('Listening transcripts must render as speaker-by-speaker dialogue cards in live lessons and workbooks');
try{
 const start=app.indexOf('function dialogueTranscriptTurns'),end=app.indexOf('function liveAudioPlayerHtml',start),block=app.slice(start,end);
 const context={escapeHtml:x=>String(x),escapeAttr:x=>String(x)};const fn=new Function('escapeHtml','escapeAttr',block+';return {dialogueTranscriptTurns,dialogueTranscriptHtml};')(context.escapeHtml,context.escapeAttr);
 const turns=fn.dialogueTranscriptTurns('Amina: Hello Yusuf. Yusuf: Hi Amina. Amina: How are you?');
 if(turns.length!==3||turns[0].speaker!=='Amina'||turns[1].speaker!=='Yusuf')errors.push('Dialogue transcript parser does not preserve speaker turns');
 const html=fn.dialogueTranscriptHtml('Amina: Hello Yusuf. Yusuf: Hi Amina.');
 if(!html.includes('speaker-1')||!html.includes('speaker-2')||!html.includes('Amina')||!html.includes('Yusuf'))errors.push('Dialogue transcript renderer does not visually separate speakers');
}catch(e){errors.push('Dialogue transcript QA failed: '+e.message)}
if(!app.includes('Preparing audio…')||!app.includes('browserSpeechAvailable')||!app.includes('playBrowserSpeech'))errors.push('Listening audio must preload and provide a browser-voice fallback when natural audio cannot play');
if(!server.includes("app.post('/api/audio'"))errors.push('Live lesson audio requires the authenticated natural-audio endpoint');
if(!server.includes('OPENAI_TTS_FEMALE_VOICES')||!server.includes('OPENAI_TTS_MALE_VOICES')||!server.includes('dialogueTurns')||!server.includes('speakerVoicePlan')||!server.includes("response_format:'wav'"))errors.push('Conversation listening must support distinct male/female multi-speaker voices');
try{
 const start=server.indexOf('function wavParts(buf){'),end=server.indexOf('function wavChunk',start);
 if(start<0||end<0)throw new Error('wavParts not found');
 const wavParts=new Function('Buffer',server.slice(start,end)+';return wavParts;')(Buffer);
 const fmt=Buffer.alloc(16);fmt.writeUInt16LE(1,0);fmt.writeUInt16LE(1,2);fmt.writeUInt32LE(24000,4);fmt.writeUInt32LE(48000,8);fmt.writeUInt16LE(2,12);fmt.writeUInt16LE(16,14);
 const pcm=Buffer.from([0,0,1,0,2,0,3,0]),fmtHead=Buffer.alloc(8),dataHead=Buffer.alloc(8),head=Buffer.alloc(12);
 head.write('RIFF',0,4,'ascii');head.writeUInt32LE(0xffffffff,4);head.write('WAVE',8,4,'ascii');
 fmtHead.write('fmt ',0,4,'ascii');fmtHead.writeUInt32LE(fmt.length,4);
 dataHead.write('data',0,4,'ascii');dataHead.writeUInt32LE(0xffffffff,4);
 const parsed=wavParts(Buffer.concat([head,fmtHead,fmt,dataHead,pcm]));
 if(!parsed?.data||parsed.data.length!==pcm.length)errors.push('Listening WAV parser does not support streaming-size WAV data');
}catch(e){errors.push('Listening WAV parser QA failed: '+e.message)}
if(!a2.includes('const A2_SPEAKER_PROFILES=')||!a2.includes('const A2_LISTENING_SCENES=')||!a2.includes('speakers:listeningScene(title).speakers'))errors.push('A2 listening must use lesson-specific scenes with stable speaker profiles');
if(!server.includes('normalizeSpeakerProfiles')||!server.includes("requestedVoice=String(raw?.voice||'')")||!server.includes('profile?.voice||pool[')||!server.includes('generateListeningAudio(input,speakerProfiles'))errors.push('Listening audio server must preserve explicit stable speaker voices instead of reassigning by turn order');
if(!app.includes('data-audio-speakers')||!app.includes('speakers:l.listening?.speakers||[]')||!app.includes("voice=String(bits[2]||'').trim()"))errors.push('Listening clients must pass explicit gender and voice metadata for workbook and live audio');
if(!live.includes("x.name+'='+x.gender+(x.voice?'='+x.voice:'')")||!live.includes("'AUDIO SPEAKERS: '+speakerMarker"))errors.push('A2 live lessons must carry stable speaker voice IDs into the audio player');
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
console.log('CEFR population QA passed: A1 has 44 foundation lessons; A2, B1 and C1 remain complete on the EnglishGate spine.');
