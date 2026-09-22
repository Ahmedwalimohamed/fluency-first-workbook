import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const server=read('server.js');
const index=read('public/index.html');
const lesson=read('public/a1-gold-v1.js');
const runtime=read('public/a1-gold-l1-runtime.js');
const backend=read('a1-gold-bootstrap.js');
const separated=read('reading-listening-separation-bootstrap.js');
const teacher=read('teacher-management-bootstrap.js');

const syntaxFiles=['server.js','standards-audit-bootstrap.js','school-platform-bootstrap.js','teacher-management-bootstrap.js','reading-listening-separation-bootstrap.js','a1-gold-bootstrap.js','public/app.js','public/a1-gold-v1.js','public/a1-gold-l1-runtime.js'];
for(const file of syntaxFiles){
 const run=spawnSync(process.execPath,['--check',new URL('../'+file,import.meta.url).pathname],{encoding:'utf8'});
 if(run.status!==0){console.error('FAIL  syntax '+file);console.error(run.stderr||run.stdout);process.exit(1)}
 console.log('PASS  syntax '+file);
}

const ids=Array.from({length:22},(_,i)=>`a1-gold-l${i+1}`);
const titles=['Getting Acquainted','Work & Careers','Travel & Adventure','Technology & Social Media','Health & Wellbeing','Food & Culture','Education & Learning','Money & Business','Environment & Climate','Relationships & Family','Media & News','Sports & Fitness','City & Countryside','Dreams & Ambitions','Crime & Safety','Science & Everyday Life','Arts & Entertainment','Global Connections','Shopping & Services','Home & Daily Life','Plans & Events','My English in the Real World'];
function lessonSegment(n){
 const start=lesson.indexOf(`const L${n}=lesson({`);
 const end=n<22?lesson.indexOf(`const l${n+1}v=[`,start):lesson.indexOf('const lessons=',start);
 return start>=0&&end>start?lesson.slice(start,end):'';
}
const S={};
for(let n=1;n<=22;n++)S[n]=lessonSegment(n);

const checks=[
 ['isolated Gold book retained as preview seed',/"id":"speakup-a1-gold"[^}]*"status":"inactive"[^}]*"total_lessons":22/.test(server)],
 ['legacy A1 retained but inactive',/"id":"speakup-a1"[^}]*"status":"inactive"[^}]*"total_lessons":44/.test(server)],
 ['production seed remains B2-only',(()=>{const m=server.match(/const BOOK_SEEDS=(\[[\s\S]*?\]);/);if(!m)return false;const books=JSON.parse(m[1]);return books.every(b=>b.id==='speakup-b2'?b.status==='ready':b.status==='inactive')})()],
 ['database production startup enforces B2-only',server.includes("update books set status=case when id='speakup-b2' then 'ready' else 'inactive' end")],
 ['preview standard activity guard covers A1 Lessons 1-22 only',server.includes("/^a1-gold-l(?:[1-9]|1\\d|2[0-2])$/")&&server.includes('function operationalLearningLesson')],
 ['preview separated activity guard covers A1 Lessons 1-22 only',separated.includes("/^a1-gold-l(?:[1-9]|1\\d|2[0-2])$/")&&separated.includes("A1_PREVIEW_MODE==='1'")],
 ['Gold curriculum and runtime loaded',index.includes('a1-gold-v1.js')&&index.includes('a1-gold-l1-runtime.js')],
 ['Gold bootstrap registered',teacher.includes("require('./a1-gold-bootstrap.js')")],
 ['all twenty-two lesson IDs present',ids.every(id=>lesson.includes("id:'"+id+"'"))],
 ['all twenty-two lesson titles present',titles.every(title=>lesson.includes("title:'"+title+"'"))],
 ['course exposes all 22 Gold lessons',lesson.includes('const lessons=[L1,L2,L3,L4,L5,L6,L7,L8,L9,L10,L11,L12,L13,L14,L15,L16,L17,L18,L19,L20,L21,L22]')],

 ['Lesson 2 remains first-person only',S[2].includes('Do not add third-person -s here.')&&!/\bShe works\b|\bHe works\b/.test(S[2])],
 ['Lesson 3 does remains a chunk blocker',S[3].includes('Do not analyse or test “does” yet.')&&!S[3].includes('What time does the bus leave?')],
 ['Lesson 5 remains first-person health',S[5].includes('Keep the lesson in first person.')&&!S[5].includes('She feels tired')],
 ['Lesson 6 introduces negatives and request distinction',S[6].includes("I do not / don’t like")&&S[6].includes('preference')&&S[6].includes('request chunks')],
 ['Lesson 7 formally introduces can/can’t',S[7].includes('Can and can’t for simple learning ability.')&&S[7].includes('can + base verb')],
 ['Lesson 8 separates number understanding from language',S[8].includes('scores number understanding separately from language')&&S[8].includes("Can I pay by card?")],
 ['Lesson 9 introduces but without formally targeting because',S[9].includes('Use “but”')&&!S[9].includes("grammar:connector-because")],
 ['Lesson 10 is formal third-person and does start',S[10].includes('formal start of third-person present simple')&&S[10].includes('Where does he live?')&&S[10].includes('What does she do?')],
 ['Lesson 12 formalizes frequency and schedule gap',S[12].includes('How often do you exercise?')&&S[12].includes('two different weekly activity schedules')],
 ['Lesson 13 formally introduces there is/are with map gap',S[13].includes('There is / there are for places')&&S[13].includes('maps with different missing places')],
 ['Lesson 14 introduces concrete future plans and because',S[14].includes('Want to, going to, and because')&&S[14].includes('because I need it for work')],
 ['Lesson 15 limits past to functional chunks',S[15].includes('without a past-tense lesson')&&S[15].includes('I lost my phone.')],
 ['Lesson 16 requires missing-step process gap',S[16].includes('different missing process steps')&&S[16].includes('What comes next?')],
 ['Lesson 17 requires reason plus changed-condition adaptation',S[17].includes('first choice becomes unavailable')&&S[17].includes('Let us choose another')],

 ['Lesson 18 combines international profile exchange + changed location',S[18].includes('Profile information gap')&&S[18].includes('meeting place changes')&&S[18].includes('What languages do you speak?')],
 ['Lesson 19 completes service transaction with unavailable option',S[19].includes('preferred option is unavailable')&&S[19].includes('Can I have a receipt, please?')&&S[19].includes('Blue Large: NOT AVAILABLE')],
 ['Lesson 20 combines home + routine + changed time',S[20].includes('home and daily routine')&&S[20].includes('today I am late')&&S[20].includes('There are two bedrooms.')],
 ['Lesson 21 requires calendar availability gap + changed event',S[21].includes('Availability-calendar information gap')&&S[21].includes('event time changes')&&S[21].includes('I cannot meet at three.')],
 ['Lesson 22 introduces no major new vocabulary',S[22].includes('const l22v=[]')||lesson.includes('const l22v=[]')],
 ['Lesson 22 is integrated unscripted transfer',S[22].includes('Unscripted final transfer')&&S[22].includes('No new grammar')&&S[22].includes('The AI changes one detail during the exchange.')],
 ['Lesson 22 requires mixed documents and changed condition',S[22].includes('WELCOME EVENT PACK')&&S[22].includes('Blue badge unavailable')&&S[22].includes('Event start changed to 6:00 p.m.')],
 ['final Independent A1 checkpoint present',S[22].includes("id:'a1-stage-4-independent-a1'")&&S[22].includes("domains:['UNDERSTAND','RESPOND','INITIATE','PRODUCE','ADAPT']")],
 ['final checkpoint requires unscripted integrated mission',S[22].includes('Complete one unscripted integrated real-world mission.')&&S[22].includes('communication breakdown, inability to initiate, or inability to adapt requires repair')],

 ['reading and listening remain separately tagged',lesson.includes("'reading:detail'")&&lesson.includes("'listening:detail'")],
 ['all implemented lessons preserve copy/paste block',(lesson.match(/copyPasteDisabled:true/g)||[]).length>=22],
 ['dialogue audio speaker profiles present',lesson.includes("voice:'nova'")&&lesson.includes("voice:'onyx'")],
 ['late-stage listening is dialogue dominant', [18,19,20,21,22].every(n=>S[n].includes("speakers:[")&&S[n].includes("audioScript:"))],
 ['backend has twenty-two governed speaking configs',ids.every(id=>backend.includes("'"+id+"':{"))],
 ['backend Jev gate remains generic by can-do',backend.includes("canDo:config.canDo")&&backend.includes("targetLevel:'A1'")],
 ['backend mastery requires deterministic + Jev',backend.includes('deterministicPass&&jevPass(jev)')],
 ['speaking evidence counts multiple question acts per turn',backend.includes('function questionCount(text)')&&backend.includes('Number(turn.questionCount||0)')],
 ['runtime has twenty-two transfer configs',ids.every(id=>runtime.includes("'"+id+"':{"))],
 ['Fix & Improve persistence retained',backend.includes('a1_gold_fix_evidence')&&runtime.includes('Fix & Improve')],
 ['360 report includes separated reading/listening evidence',backend.includes('workbookActivityStates')&&backend.includes('workbookActivityAttempts')&&runtime.includes('Reading attempts')&&runtime.includes('Listening attempts')],
 ['Gold lesson IDs remain isolated from legacy progress',lesson.includes("const BOOK_ID='speakup-a1-gold'")&&ids.every(id=>lesson.includes(id))],
 ['course publishes both stage checkpoints in course data',lesson.includes('stageCheckpoints:lessons.filter(x=>x.stageCheckpoint)')&&lesson.includes('a1-stage-3-my-community')&&lesson.includes('a1-stage-4-independent-a1')]
];

let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failed++}
if(failed){console.error(`A1 Gold Lessons 1-22 QA failed: ${failed} check(s).`);process.exit(1)}
console.log(`A1 Gold Lessons 1-22 QA passed: ${checks.length}/${checks.length}.`);
