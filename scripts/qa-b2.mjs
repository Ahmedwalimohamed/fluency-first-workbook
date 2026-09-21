import fs from 'node:fs';
import vm from 'node:vm';

const ROOT=new URL('../',import.meta.url);
const TOPICS=[
 'Getting Acquainted','Work & Careers','Travel & Adventure','Technology & Social Media','Health & Wellbeing',
 'Food & Culture','Education & Learning','Money & Business','Environment & Climate','Relationships & Family',
 'Media & News','Sports & Fitness','City vs Countryside','Dreams & Ambitions','Crime & Justice','Science & Innovation',
 'Arts & Entertainment','Global Issues','Free Time & Hobbies','Cultural Identity','Making Decisions','Looking Back, Looking Forward'
];
const HUMAN=new Set([5,10,15,18,22]);
const failures=[],warnings=[];
const fail=x=>failures.push(x),warn=x=>warnings.push(x);
const norm=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
const words=s=>String(s||'').trim().split(/\s+/).filter(Boolean).length;

function loadWindowScript(rel,key){
 const code=fs.readFileSync(new URL(rel,ROOT),'utf8'),ctx={window:{}};
 vm.createContext(ctx);vm.runInContext(code,ctx,{filename:rel});return ctx.window[key]
}
function validChoice(q,label){
 if(!q?.q||!Array.isArray(q.options)||q.options.length<3||q.answer===undefined){fail(label+': incomplete selected-response item.');return}
 if(!q.options.includes(q.answer))fail(label+': accepted answer is not one of the options.');
 if(new Set(q.options.map(norm)).size!==q.options.length)fail(label+': duplicate options.');
}
function expectedSupport(n){return n<=5?'high':n<=11?'medium-high':n<=17?'medium':'low'}
function expectedRange(n){
 if(n===1)return[40,60];
 if(n===2)return[50,70];
 if(n<=5)return[60,80];
 if(n===6)return[65,85];
 if(n<=11)return[70,90];
 if(n<=13)return[75,95];
 if(n<=17)return[80,100];
 if(n===18)return[90,110];
 if(n===19)return[70,90];
 if(n<=21)return[90,110];
 return[180,220]
}

const blueprint=loadWindowScript('public/speakup-b2-blueprint.js','SPEAKUP_B2_BLUEPRINT');
const northstarRuntime=loadWindowScript('public/b2-northstar-workbook-v1.js','ENGLISHGATE_B2_NORTHSTAR');
const liveBooks=loadWindowScript('public/live-books.js','LIVE_BOOKS');
const live=liveBooks?.['speakup-b2'];
if(!Array.isArray(blueprint)||blueprint.length!==22)fail('Blueprint must contain exactly 22 B2 lessons.');
if(new Set((blueprint||[]).map(x=>x.id)).size!==22)fail('B2 lesson IDs must be unique.');
if(!live||!Array.isArray(live.lessons)||live.lessons.length!==22)fail('Live B2 book must contain exactly 22 lessons.');

for(let i=0;i<22;i++){
 const n=i+1,l=blueprint?.[i],liveLesson=live?.lessons?.[i];
 if(!l){fail('Lesson '+n+': missing.');continue}
 if(Number(l.number)!==n)fail('Lesson '+n+': lesson number mismatch.');
 if(l.id!==`su-b2-l${n}`)fail('Lesson '+n+': stable ID must remain su-b2-l'+n+'.');
 if(l.title!==TOPICS[i])fail('Lesson '+n+': topic changed unexpectedly.');
 if(!String(l.outcome||'').trim())fail('Lesson '+n+': missing outcome.');
 if(!String(l.readingText||'').trim())fail('Lesson '+n+': reading source is missing.');
 if(!String(l.audioScript||'').trim())fail('Lesson '+n+': listening source is missing.');
 if(norm(l.readingText)===norm(l.audioScript)&&n>=2)warn('Lesson '+n+': reading and listening sources are identical; Northstar listening should normally add new information.');

 const qs=Array.isArray(l.questions)?l.questions:[];
 qs.forEach((q,j)=>validChoice(q,`Lesson ${n}, question ${j+1}`));
 if(n>=2){
  const readingCount=qs.filter(q=>String(q.tag||'').startsWith('reading:')).length;
  const listeningCount=qs.filter(q=>String(q.tag||'').startsWith('listening:')).length;
  if(readingCount<3)fail('Lesson '+n+': Northstar SEE needs at least 3 reading-comprehension questions.');
  if(listeningCount<3)fail('Lesson '+n+': Northstar CHOOSE needs at least 3 listening-comprehension questions.');
 }
 (l.grammarItems||[]).forEach((q,j)=>validChoice(q,`Lesson ${n}, grammar ${j+1}`));
 (l.vocabularyItems||[]).filter(q=>Array.isArray(q.options)).forEach((q,j)=>validChoice(q,`Lesson ${n}, vocabulary choice ${j+1}`));

 const [emin,emax]=expectedRange(n),wr=l.writing||{};
 if(Number(wr.minWords)!==emin||Number(wr.maxWords)!==emax)fail(`Lesson ${n}: writing range must be ${emin}–${emax} words for the Northstar progression.`);
 if(Boolean(wr.humanGraded)!==HUMAN.has(n))fail(`Lesson ${n}: humanGraded must be ${HUMAN.has(n)}.`);

 if(n===1){
  if(l.northstarFramework!=='SEE_CHOOSE_CHANGE_USE_FIX')fail('Lesson 1: Northstar framework marker is missing.');
  if(qs.filter(q=>String(q.tag||'').startsWith('reading:')).length<3)fail('Lesson 1: needs at least 3 reading-comprehension questions.');
  if((l.vocabularyItems||[]).length<4)fail('Lesson 1: needs at least 4 useful vocabulary items.');
  if((l.grammarItems||[]).length<3)fail('Lesson 1: needs at least 3 focused grammar items.');
 }else{
  const x=l.northstar;
  if(!x||x.framework!=='SEE_CHOOSE_CHANGE_USE_FIX'||x.version!=='b2-northstar-v1'){fail('Lesson '+n+': Northstar metadata is missing or has the wrong version.');continue}
  if(x.support!==expectedSupport(n))fail(`Lesson ${n}: support must be "${expectedSupport(n)}", found "${x.support}".`);
  if(!String(x.mission||'').trim())fail('Lesson '+n+': missing real-world mission.');
  if(!Array.isArray(x.change)||x.change.length!==2)fail('Lesson '+n+': CHANGE must contain exactly two guided transformations.');
  for(const [ci,ch] of (x.change||[]).entries()){
   if(!String(ch.model||'').trim()||!String(ch.prompt||'').trim())fail(`Lesson ${n}: CHANGE ${ci+1} needs a model and prompt.`);
  }
  if(!String(x.use?.prompt||'').trim())fail('Lesson '+n+': USE prompt is missing.');
  if(!String(x.final?.task||'').trim())fail('Lesson '+n+': final USE task is missing.');
  if(Number(x.final?.minWords)!==emin||Number(x.final?.maxWords)!==emax)fail('Lesson '+n+': Northstar final range does not match the writing range.');
  if(!String(x.fix?.target||'').trim()||!String(x.fix?.model||'').trim())fail('Lesson '+n+': FIX needs one target and one useful model.');
  const r=x.retrieval;
  if(!r||Number(r.from)!==n-1)fail('Lesson '+n+': hidden REMEMBER must retrieve from the immediately previous lesson.');
  if(!String(r?.prompt||'').trim()||!Array.isArray(r?.options)||r.options.length!==3||!r.options.includes(r.answer))fail('Lesson '+n+': retrieval question is incomplete.');
  if(n===22&&!x.final?.noAutomatedCorrection)fail('Lesson 22: final human-graded task must disable automated correction.');
  if(n!==22&&x.final?.noAutomatedCorrection)fail('Lesson '+n+': noAutomatedCorrection is reserved for the final human-graded task.');
 }

 const allText=JSON.stringify(l);
 if(/lorem ipsum|\btodo\b|\btbd\b|placeholder text/i.test(allText))fail('Lesson '+n+': placeholder/template residue detected.');
 if(liveLesson&&liveLesson.number!==n)fail('Lesson '+n+': live-book number mismatch.');
 if(liveLesson&&liveLesson.title!==l.title)fail('Lesson '+n+': live-book/workbook topic mismatch.');
 if(liveLesson){
  for(const marker of ['CAN-DO GOAL:','PRONUNCIATION FOCUS','MEDIATION MOVE']){
   if(!String(liveLesson.content||'').includes(marker))fail(`Lesson ${n}: live lesson missing "${marker}".`);
  }
  const liveText=String(liveLesson.content||'');
  if(liveText.includes('B2 LIFT'))fail(`Lesson ${n}: B2 LIFT must not appear in the Live lesson.`);
  for(const marker of ['FLUENCY START','FLUENCY USE','TALK AFTER READING','FLUENCY RULE','FLUENCY EXIT']){
   if(!liveText.includes(marker))fail(`Lesson ${n}: fluency-first Live lesson missing "${marker}".`);
  }
  if(n!==22&&!liveText.includes('MAKE IT PERSONAL — SPEAK FIRST'))fail(`Lesson ${n}: language focus must personalise through speaking first.`);
  if(/Make It Personal — write/i.test(liveText))fail(`Lesson ${n}: Live lesson must not return to writing-first personalisation.`);
  if(/Write their names below:/i.test(liveText))fail(`Lesson ${n}: speaking challenge must not require note-taking before interaction.`);
  if(/\bHOMEWORK\b/i.test(liveText))fail(`Lesson ${n}: B2 Live lesson must not include homework; follow-up practice belongs in the workbook.`);
 }
}

const engine=fs.readFileSync(new URL('public/b2-northstar-workbook-v1.js',ROOT),'utf8');
const lesson1Engine=fs.readFileSync(new URL('public/b2-lesson1-microflow-v3.js',ROOT),'utf8');
const premiumUi=fs.readFileSync(new URL('public/englishgate-b2-premium-v3.css',ROOT),'utf8');

const b2LearningCss=fs.readFileSync(new URL('public/b2-learning-surface-v1.css',ROOT),'utf8');
const b2LearningJs=fs.readFileSync(new URL('public/b2-learning-surface-v1.js',ROOT),'utf8');
const app=fs.readFileSync(new URL('public/app.js',ROOT),'utf8');
const index=fs.readFileSync(new URL('public/index.html',ROOT),'utf8');
const standards=fs.readFileSync(new URL('standards-audit-bootstrap.js',ROOT),'utf8');
const grader=fs.readFileSync(new URL('northstar-jev-grading-bootstrap.js',ROOT),'utf8');
try{new vm.Script(engine)}catch(e){fail('Northstar engine syntax error: '+e.message)}
try{new vm.Script(lesson1Engine)}catch(e){fail('Lesson 1 engine syntax error: '+e.message)}
try{new vm.Script(grader)}catch(e){fail('Northstar Jev grader syntax error: '+e.message)}

if(!app.includes('northstar:x.northstar||null'))fail('Runtime B2 lesson mapper does not expose Northstar metadata.');
if(!index.includes('b2-learning-surface-v1.css?v=2'))fail('Unified B2 learning surface CSS is not loaded.');
if(!index.includes('b2-learning-surface-v1.js?v=1'))fail('Unified B2 learning surface decorator is not loaded.');
if(index.indexOf('b2-learning-surface-v1.css?v=2')<index.indexOf('englishgate-b2-premium-v3.css?v=1'))fail('Unified B2 learning surface CSS must load after the premium B2 CSS so it can normalize legacy visual rules.');
for(const label of ['FLUENCY START','FLUENCY USE','TALK AFTER READING','MAKE IT PERSONAL — SPEAK FIRST','FLUENCY RULE','FLUENCY EXIT','PRONUNCIATION FOCUS','MEDIATION MOVE']){
 if(!b2LearningJs.includes(label))fail('Unified B2 learning surface is missing label coverage for '+label+'.');
}
for(const token of ['--b2-learn-line','--b2-learn-radius','.b2-learning-label','.b2-learning-callout-copy','.grammar-book-section','.b2-microflow .micro-stage']){
 if(!b2LearningCss.includes(token))fail('Unified B2 learning surface CSS is missing '+token+'.');
}
if(!b2LearningCss.includes('.live-prompt-grid .live-prompt-row:nth-child(3n+1)')||!b2LearningCss.includes('.live-prompt-grid .live-prompt-row:nth-child(3n+2)')||!b2LearningCss.includes('.live-prompt-grid .live-prompt-row:nth-child(3n+3)'))fail('Unified B2 learning surface must neutralize legacy alternating prompt-card colors.');
for(const token of ['--b2-learn-blue:#2563eb','--b2-learn-success:#16a34a','--b2-learn-error:#dc2626','--b2-learn-review:#d97706','--teal:var(--b2-learn-blue)','--pink:var(--b2-learn-blue)','--purple:var(--b2-learn-blue)']){
 if(!b2LearningCss.toLowerCase().includes(token))fail('B2 theme coherence is missing semantic palette mapping '+token+'.');
}
for(const guard of ['Neutralize the legacy green Grammar Lesson theme','Remove the purple vocabulary identity inside B2 workbook','B2 lesson shell: remove red/pink decorative theme leakage']){
 if(!b2LearningCss.includes(guard))fail('B2 theme coherence guard missing: '+guard+'.');
}

if(!index.includes('b2-northstar-workbook-v1.js?v=7'))fail('Northstar engine is not loaded in index.html with the current cache version.');
if(index.indexOf('b2-northstar-workbook-v1.js?v=7')>index.indexOf('b2-lesson1-microflow-v3.js?v=6'))fail('Lesson 1 override must load after the generic Northstar engine.');
if(!standards.includes("require('./northstar-jev-grading-bootstrap.js')"))fail('Jev Northstar grading bootstrap is not in the server chain.');
if(!grader.includes('/api/workbook-activities/grade-use'))fail('Jev Northstar USE grading route is missing.');
if(!engine.includes("framework==='SEE_CHOOSE_CHANGE_USE_FIX'"))fail('Northstar renderer is not gated by the framework marker.');
if(!engine.includes("if(i===4)return renderListening"))fail('Dedicated Listening activity is missing from the Northstar sequence.');
if(!engine.includes('const MIN_COMPREHENSION_QUESTIONS=3'))fail('Northstar renderer must show at least 3 Reading and 3 Listening questions.');
if(!lesson1Engine.includes('const MIN_COMPREHENSION_QUESTIONS=3'))fail('Lesson 1 must show at least 3 Reading and 3 Listening questions.');
if(!lesson1Engine.includes("questionCounts:{reading:READING_QUESTIONS.length,listening:LISTENING_QUESTIONS.length}"))fail('Lesson 1 comprehension question-count metadata is missing.');
if(!engine.includes("repair.focus==='none'"))fail('Northstar FIX must allow a correct response to finish with no correction.');
if(!lesson1Engine.includes("mode.type==='none'"))fail('Lesson 1 FIX must allow a correct response to finish with no correction.');
if(!engine.includes('function arrangeChoices(options,correctIndex,seed)'))fail('Northstar multiple-choice renderer must distribute correct answer positions.');
if(!lesson1Engine.includes('function arrangeChoices(options,correctIndex,seed)'))fail('Lesson 1 multiple-choice renderer must distribute correct answer positions.');
if(!engine.includes('desired=Math.abs(Number(seed)||0)%n'))fail('Northstar answer-position rotation rule is missing.');
if(!lesson1Engine.includes('desired=Math.abs(Number(seed)||0)%n'))fail('Lesson 1 answer-position rotation rule is missing.');
if(!index.includes('englishgate-b2-premium-v3.css?v=1'))fail('Premium B2 learning UI stylesheet is not loaded.');
if(!engine.includes("uiDecisionContract:'jev-ui-v1'"))fail('Generic Northstar Jev UI decision contract is missing.');
if(!lesson1Engine.includes("uiDecisionContract:'jev-ui-v1'"))fail('Lesson 1 Jev UI decision contract is missing.');
for(const mode of ['source','decision','compose','repair']){
 if(!premiumUi.includes('[data-ui-mode="'+mode+'"]'))fail('Premium B2 UI is missing '+mode+' treatment.');
}
if(!premiumUi.includes('@media(prefers-reduced-motion:reduce)'))fail('Premium B2 UI must respect reduced-motion settings.');
if(!engine.includes("classList.add('b2-premium-workbook-mode')"))fail('Generic B2 workbook must enter immersive premium mode.');
if(!lesson1Engine.includes("classList.add('b2-premium-workbook-mode')"))fail('Lesson 1 must enter immersive premium mode.');
if(!app.includes("classList.remove('b2-premium-workbook-mode')"))fail('Application must clear immersive premium mode on exit.');
for(const marker of [
 'body.b2-premium-workbook-mode .sidebar',
 'body.b2-premium-workbook-mode .topbar',
 '[data-ui-mode="source"] .micro-stage',
 '[data-ui-mode="decision"] .micro-stage',
 '[data-ui-mode="compose"] .micro-stage',
 '[data-ui-mode="repair"] .micro-stage'
])if(!premiumUi.includes(marker))fail('Premium B2 v2 structural treatment missing: '+marker);
if(/purple|#5b2c8d/i.test(premiumUi))fail('Premium B2 UI must not introduce purple AI styling.');
if(!grader.includes("focus:'none'"))fail('Jev grader must return no correction when all checks pass.');
if(!engine.includes("if(i===9)return renderFix"))fail('FIX is not the final Northstar stage.');
if(!engine.includes('const REMEMBER_OFFSETS=[1,3,7]'))fail('Hidden REMEMBER must use +1, +3, +7 spaced retrieval opportunities.');
if(!northstarRuntime||typeof northstarRuntime.rememberOffsetForNumber!=='function')fail('Northstar runtime must expose its spaced-retrieval schedule for QA.');
else{
 const schedule=Array.from({length:21},(_,i)=>i+2).map(n=>({n,offset:northstarRuntime.rememberOffsetForNumber(n)}));
 const used=new Set(schedule.map(x=>x.offset));
 for(const offset of [1,3,7])if(!used.has(offset))fail('Runtime REMEMBER schedule never uses +'+offset+' retrieval.');
 for(const [lesson,expected] of [[6,3],[10,7],[12,3],[13,7],[18,3],[19,7],[21,3],[22,7]]){
  const actual=northstarRuntime.rememberOffsetForNumber(lesson);
  if(actual!==expected)fail(`Lesson ${lesson}: expected runtime REMEMBER +${expected}, found +${actual}.`);
 }
}
if(!engine.includes('const weak=candidates.find(x=>x.weak);')||!engine.includes('if(weak)return weak;'))fail('Hidden REMEMBER must prioritise previously weak grammar before the scheduled offset.');
if(!engine.includes("support==='low'"))fail('Northstar engine must explicitly fade support in later B2 lessons.');
if(!engine.includes("model='';before=helpBox('Model: '+x.model,'Need to see the model?')"))fail('Low-support CHANGE must hide the model behind optional reveal.');
if(!engine.includes("const help=(support==='high'||support==='medium-high')?x.help:'';"))fail('USE help must disappear by medium/low support.');

const server=fs.readFileSync(new URL('server.js',ROOT),'utf8');
for(const marker of ['b2_upgrade_notice_version','curriculum:b2-living-standard-v1'])if(!server.includes(marker))fail('Student migration protection missing: '+marker);
for(const marker of ['Your progress and previous scores are still saved.','Review earlier lessons','Retry upgraded lesson','eg-workbook-draft-b2-living-standard-v1'])if(!app.includes(marker))fail('Student migration UI protection missing: '+marker);

if(words(blueprint?.[21]?.writing?.task||'')<12)fail('Lesson 22 final task is too vague for an exit assessment.');

if(warnings.length){console.warn('\nB2 QA warnings:');warnings.forEach(x=>console.warn('  - '+x))}
if(failures.length){
 console.error('\nB2 NORTHSTAR QA FAILED:');failures.forEach(x=>console.error('  - '+x));
 console.error(`\n${failures.length} blocking issue(s).\n`);process.exit(1)
}
console.log(`B2 NORTHSTAR QA PASSED: 22 stable lessons; Lessons 2–22 use SEE → CHOOSE → CHANGE → USE → FIX; ${warnings.length} warning(s).\n`);
