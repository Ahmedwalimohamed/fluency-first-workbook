import fs from 'node:fs';
import vm from 'node:vm';

const ROOT = new URL('../', import.meta.url);
const EXPECTED_TOPICS = [
  'Getting Acquainted','Work & Careers','Travel & Adventure','Technology & Social Media',
  'Health & Wellbeing','Food & Culture','Education & Learning','Money & Business',
  'Environment & Climate','Relationships & Family','Media & News','Sports & Fitness',
  'City vs Countryside','Dreams & Ambitions','Crime & Justice','Science & Innovation',
  'Arts & Entertainment','Global Issues','Free Time & Hobbies','Cultural Identity',
  'Making Decisions','Looking Back, Looking Forward'
];
const WRITING_CHECKPOINTS = new Set([5,10,15,18,22]);
const failures = [];
const warnings = [];

function loadWindowScript(rel, key) {
  const code = fs.readFileSync(new URL(rel, ROOT), 'utf8');
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: rel });
  return context.window[key];
}
function words(s=''){ return String(s).trim().split(/\s+/).filter(Boolean).length; }
function fail(msg){ failures.push(msg); }
function warn(msg){ warnings.push(msg); }
function phaseMinReading(n){ return n <= 7 ? 100 : n <= 14 ? 140 : 180; }
function phaseMinListening(n){ return n <= 7 ? 70 : n <= 14 ? 90 : 110; }
function phaseWritingRange(n){
  if(n===22) return [180,250];
  if(n<=7) return [70,110];
  if(n<=14) return [90,140];
  return [110,170];
}
function normalized(s){ return String(s||'').toLowerCase().replace(/\s+/g,' ').trim(); }

const blueprint = loadWindowScript('public/speakup-b2-blueprint.js','SPEAKUP_B2_BLUEPRINT');
const books = loadWindowScript('public/live-books.js','LIVE_BOOKS');
const b2Live = books?.['speakup-b2'];

if(!Array.isArray(blueprint) || blueprint.length !== 22) fail('Blueprint must contain exactly 22 B2 lessons.');
if(!b2Live || !Array.isArray(b2Live.lessons) || b2Live.lessons.length !== 22) fail('Live B2 book must contain exactly 22 lessons.');
if(b2Live?.title !== 'B2 Upper Intermediate') fail('Live B2 title must be "B2 Upper Intermediate".');

for(let i=0;i<22;i++){
  const n=i+1, l=blueprint?.[i], live=b2Live?.lessons?.[i];
  if(!l){ fail(`Lesson ${n}: missing blueprint lesson.`); continue; }
  if(l.number !== n) fail(`Lesson ${n}: number mismatch.`);
  if(l.title !== EXPECTED_TOPICS[i]) fail(`Lesson ${n}: expected topic "${EXPECTED_TOPICS[i]}", found "${l.title}".`);
  if(l.id !== `su-b2-l${n}`) fail(`Lesson ${n}: stable id must remain su-b2-l${n}.`);

  for(const key of ['foundation','b2Lift','performance','pronunciation','mediation']){
    if(!String(l[key]||'').trim()) fail(`Lesson ${n}: missing ${key} progression metadata.`);
  }
  if(!Array.isArray(l.functions) || l.functions.length < 3) fail(`Lesson ${n}: needs at least 3 communicative functions.`);
  if(!Array.isArray(l.discourse) || l.discourse.length < 3) fail(`Lesson ${n}: needs at least 3 discourse/interaction targets.`);

  if(!Array.isArray(l.vocabulary) || l.vocabulary.length < 6) fail(`Lesson ${n}: needs at least 6 core vocabulary items.`);
  if(!Array.isArray(l.chunks) || l.chunks.length < 4) fail(`Lesson ${n}: needs at least 4 usable chunks/collocations.`);
  if(!Array.isArray(l.interactionExpressions) || l.interactionExpressions.length < 3) fail(`Lesson ${n}: needs at least 3 interaction expressions.`);
  const grammarItems = Array.isArray(l.grammarItems) ? l.grammarItems : [];
  if(grammarItems.length < 6) fail(`Lesson ${n}: needs at least 6 B2-specific grammar questions.`);
  for(const [gi,g] of grammarItems.entries()){
    if(!g.q || !Array.isArray(g.options) || g.options.length !== 3 || !g.options.includes(g.answer)) fail(`Lesson ${n}, grammar ${gi+1}: invalid question/options/answer.`);
    if(new Set((g.options||[]).map(normalized)).size !== 3) fail(`Lesson ${n}, grammar ${gi+1}: duplicate options.`);
  }


  const rw=words(l.readingText), lw=words(l.audioScript);
  if(rw < phaseMinReading(n)) fail(`Lesson ${n}: reading is ${rw} words; minimum for this phase is ${phaseMinReading(n)}.`);
  if(lw < phaseMinListening(n)) fail(`Lesson ${n}: listening is ${lw} words; minimum for this phase is ${phaseMinListening(n)}.`);

  const qs=Array.isArray(l.questions)?l.questions:[];
  const rqs=qs.filter(q=>String(q.tag||'').startsWith('reading:'));
  const lqs=qs.filter(q=>String(q.tag||'').startsWith('listening:'));
  if(rqs.length < 4) fail(`Lesson ${n}: needs at least 4 reading questions.`);
  if(lqs.length < 4) fail(`Lesson ${n}: needs at least 4 listening questions.`);
  const higherReading = rqs.some(q=>/(inference|stance|main-idea|purpose|reason|development|strategy|evaluation|scientific|self-assessment)/i.test(String(q.tag||'')));
  const higherListening = lqs.some(q=>/(synthesis|evaluation|inference|reason|reasoning|decision|mediation|interpretation|pragmatics|planning|stance|interaction|media-literacy|goal-setting|evidence|recommendation|scientific|intercultural)/i.test(String(q.tag||'')));
  if(!higherReading) fail(`Lesson ${n}: needs at least one higher-order reading item.`);
  if(!higherListening) fail(`Lesson ${n}: needs at least one higher-order listening item.`);

  for(const [qi,q] of qs.entries()){
    if(!q.q || q.answer===undefined || !Array.isArray(q.options) || q.options.length<3) fail(`Lesson ${n}, question ${qi+1}: incomplete auto-graded question.`);
    if(Array.isArray(q.options) && !q.options.includes(q.answer)) fail(`Lesson ${n}, question ${qi+1}: answer is not one of the options.`);
    if(new Set((q.options||[]).map(normalized)).size !== (q.options||[]).length) fail(`Lesson ${n}, question ${qi+1}: duplicate options.`);
  }

  const wr=l.writing||{}, [minExpected,maxExpected]=phaseWritingRange(n);
  if(!wr.task) fail(`Lesson ${n}: missing authentic writing task.`);
  if(Number(wr.minWords)<minExpected) fail(`Lesson ${n}: writing minimum ${wr.minWords} is below bridge-phase minimum ${minExpected}.`);
  if(Number(wr.maxWords)>maxExpected+30) warn(`Lesson ${n}: writing maximum ${wr.maxWords} may be high for this bridge phase.`);
  if(WRITING_CHECKPOINTS.has(n) !== Boolean(wr.humanGraded)) fail(`Lesson ${n}: humanGraded must be ${WRITING_CHECKPOINTS.has(n)}.`);

  const allText=JSON.stringify(l);
  if(/placeholder|lorem ipsum|todo\b|tbd\b/i.test(allText)) fail(`Lesson ${n}: placeholder/TODO content detected.`);
  const vocabText=JSON.stringify(l.vocabularyItems||[]);
  if(/\bunrelated\b|\bordinary\b/i.test(vocabText)) warn(`Lesson ${n}: generic vocabulary distractor detected; replace with plausible level-appropriate distractors.`);

  if(!live || live.number!==n || live.title!==l.title) fail(`Lesson ${n}: live book / workbook topic mismatch.`);
  if(live && !/CAN-DO GOAL:/i.test(live.content||'')) fail(`Lesson ${n}: live lesson missing Can-Do goal.`);
  if(live && !/B2 LIFT/i.test(live.content||'')) fail(`Lesson ${n}: live lesson missing explicit B2 LIFT section.`);
  if(live && !/PRONUNCIATION FOCUS/i.test(live.content||'')) fail(`Lesson ${n}: live lesson missing pronunciation focus.`);
  if(live && !/MEDIATION MOVE/i.test(live.content||'')) fail(`Lesson ${n}: live lesson missing mediation move.`);
}

const finalLive=b2Live?.lessons?.[21]?.content||'';
for(const marker of ['B2 PERFORMANCE SHOWCASE','READING PERFORMANCE','LISTENING PERFORMANCE','INTERACTION PERFORMANCE','SPOKEN PRODUCTION','MEDIATION PERFORMANCE','WRITING PERFORMANCE']){
  if(!finalLive.includes(marker)) fail(`Lesson 22: final exit assessment missing "${marker}".`);
}

if(warnings.length){
  console.warn('\nB2 QA warnings:');
  warnings.forEach(x=>console.warn('  - '+x));
}
if(failures.length){
  console.error('\nB2 QA FAILED:');
  failures.forEach(x=>console.error('  - '+x));
  console.error(`\n${failures.length} blocking issue(s). Production start is blocked until they are fixed.\n`);
  process.exit(1);
}

const appCode = fs.readFileSync(new URL('public/app.js', ROOT), 'utf8');
const serverCode = fs.readFileSync(new URL('server.js', ROOT), 'utf8');
if(!appCode.includes("B2_UPGRADE_VERSION='b2-living-standard-v1'")) fail('Student migration: B2 upgrade version constant is missing.');
if(!appCode.includes("B2_UPGRADE_RELEASE_AT='2026-09-08T21:47:25.822Z'")) fail('Student migration: release boundary is missing.');
if(!appCode.includes('Your progress and previous scores are still saved.')) fail('Student migration: preservation message is missing.');
if(!appCode.includes('Review earlier lessons')) fail('Student migration: review option is missing.');
if(!appCode.includes('Retry upgraded lesson')) fail('Student migration: upgraded lesson retry action is missing.');
if(!appCode.includes('eg-workbook-draft-b2-living-standard-v1')) fail('Student migration: B2 draft version isolation is missing.');
if(!serverCode.includes('b2_upgrade_notice_version')) fail('Student migration: persistent notice acknowledgement is missing.');
if(!serverCode.includes('curriculum:b2-living-standard-v1')) fail('Student migration: new B2 attempts are not version-tagged.');

console.log(`B2 QA PASSED: 22 lessons validated, ${warnings.length} warning(s).\n`);
