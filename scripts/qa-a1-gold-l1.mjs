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

const ids=Array.from({length:17},(_,i)=>`a1-gold-l${i+1}`);
const titles=['Getting Acquainted','Work & Careers','Travel & Adventure','Technology & Social Media','Health & Wellbeing','Food & Culture','Education & Learning','Money & Business','Environment & Climate','Relationships & Family','Media & News','Sports & Fitness','City & Countryside','Dreams & Ambitions','Crime & Safety','Science & Everyday Life','Arts & Entertainment'];
function lessonSegment(n){
 const start=lesson.indexOf(`const L${n}=lesson({`);
 const end=n<17?lesson.indexOf(`const l${n+1}v=[`,start):lesson.indexOf('const lessons=',start);
 return start>=0&&end>start?lesson.slice(start,end):'';
}
const L2=lessonSegment(2),L3=lessonSegment(3),L5=lessonSegment(5),L6=lessonSegment(6),L7=lessonSegment(7),L8=lessonSegment(8),L9=lessonSegment(9),L10=lessonSegment(10),L11=lessonSegment(11),L12=lessonSegment(12),L13=lessonSegment(13),L14=lessonSegment(14),L15=lessonSegment(15),L16=lessonSegment(16),L17=lessonSegment(17);

const checks=[
 ['isolated Gold book retained as preview seed',/"id":"speakup-a1-gold"[^}]*"status":"inactive"[^}]*"total_lessons":22/.test(server)],
 ['legacy A1 retained but inactive',/"id":"speakup-a1"[^}]*"status":"inactive"[^}]*"total_lessons":44/.test(server)],
 ['production seed remains B2-only',(()=>{const m=server.match(/const BOOK_SEEDS=(\[[\s\S]*?\]);/);if(!m)return false;const books=JSON.parse(m[1]);return books.every(b=>b.id==='speakup-b2'?b.status==='ready':b.status==='inactive')})()],
 ['database production startup enforces B2-only',server.includes("update books set status=case when id='speakup-b2' then 'ready' else 'inactive' end")],
 ['preview standard activity guard covers only A1 Lessons 1-17',server.includes("/^a1-gold-l(?:[1-9]|1[0-7])$/")&&server.includes('function operationalLearningLesson')],
 ['preview separated activity guard covers only A1 Lessons 1-17',separated.includes("/^a1-gold-l(?:[1-9]|1[0-7])$/")&&separated.includes("A1_PREVIEW_MODE==='1'")],
 ['Gold curriculum and runtime loaded',index.includes('a1-gold-v1.js')&&index.includes('a1-gold-l1-runtime.js')],
 ['Gold bootstrap registered',teacher.includes("require('./a1-gold-bootstrap.js')")],
 ['all seventeen lesson IDs present',ids.every(id=>lesson.includes("id:'"+id+"'"))],
 ['all seventeen lesson titles present',titles.every(title=>lesson.includes("title:'"+title+"'"))],
 ['course exposes Lessons 1-17 as implemented Gold preview',lesson.includes('const lessons=[L1,L2,L3,L4,L5,L6,L7,L8,L9,L10,L11,L12,L13,L14,L15,L16,L17]')],
 ['Lesson 2 remains first-person only',L2.includes('Do not add third-person -s here.')&&!/\bShe works\b|\bHe works\b/.test(L2)],
 ['Lesson 3 does remains a chunk blocker',L3.includes('Do not analyse or test “does” yet.')&&!L3.includes('What time does the bus leave?')],
 ['Lesson 5 remains first-person health',L5.includes('Keep the lesson in first person.')&&!L5.includes('She feels tired')],
 ['Lesson 6 introduces negatives and request distinction',L6.includes("I do not / don’t like")&&L6.includes('preference')&&L6.includes('request chunks')],
 ['Lesson 7 formally introduces can/can’t',L7.includes('Can and can’t for simple learning ability.')&&L7.includes('can + base verb')],
 ['Lesson 8 separates number understanding from language',L8.includes('scores number understanding separately from language')&&L8.includes("Can I pay by card?")],
 ['Lesson 9 introduces but without formally targeting because',L9.includes('Use “but”')&&!L9.includes("grammar:connector-because")],
 ['Lesson 10 is formal third-person and does start',L10.includes('formal start of third-person present simple')&&L10.includes('Where does he live?')&&L10.includes('What does she do?')],
 ['Lesson 11 integrates media + announcement transfer',L11.includes('relay two facts from a short announcement')&&L11.includes('Tickets are two dollars')],
 ['Lesson 12 formalizes frequency and true schedule gap',L12.includes('How often do you exercise?')&&L12.includes('Information gap: compare two different weekly activity schedules')&&L12.includes('twice a week')],
 ['Lesson 13 formally introduces there is/are with map gap',L13.includes('There is / there are for places')&&L13.includes('maps with different missing places')&&L13.includes("'reading:map'")],
 ['Lesson 14 introduces concrete future plans and because',L14.includes('Want to, going to, and because')&&L14.includes('I am going to study every day.')&&L14.includes('because I need it for work')],
 ['Lesson 15 uses limited past chunks without a past unit',L15.includes('without a past-tense lesson')&&L15.includes('I lost my phone.')&&L15.includes('It was at the station.')],
 ['Lesson 15 stays safety/help focused',L15.includes('Report a simple lost or missing-item problem')&&L15.includes('Do not give your password')],
 ['Lesson 16 requires missing-step process information gap',L16.includes('different missing process steps')&&L16.includes('First, Next, Then, Finally')&&L16.includes('What comes next?')],
 ['Lesson 17 requires reason plus changed-condition adaptation',L17.includes('first choice becomes unavailable')&&L17.includes('because it is funny')&&L17.includes('Let us choose another')],
 ['My Community checkpoint follows Lesson 17',L17.includes("id:'a1-stage-3-my-community'")&&L17.includes("domains:['UNDERSTAND','RESPOND','INITIATE','PRODUCE','ADAPT']")&&lesson.includes('stageCheckpoints:lessons.filter(x=>x.stageCheckpoint)')],
 ['checkpoint uses integrated communication missions',L17.includes('Use two schedules to arrange a fitness meet-up.')&&L17.includes('Use a map to ask for and give directions')&&L17.includes('Report a missing item and ask for help.')&&L17.includes('Reconstruct a short safe process')&&L17.includes('adapt when the first choice changes.')],
 ['Batch C increases dialogue/interdependence',L12.includes("speakers:[{name:'Amina'")&&L13.includes("speakers:[{name:'Visitor'")&&L14.includes("speakers:[{name:'Ali'")&&L15.includes("speakers:[{name:'Officer'")&&L16.includes("speakers:[{name:'Muna'")&&L17.includes("speakers:[{name:'Sahra'")],
 ['reading and listening remain separately tagged',lesson.includes("'reading:detail'")&&lesson.includes("'listening:detail'")],
 ['every implemented lesson preserves copy/paste block',(lesson.match(/copyPasteDisabled:true/g)||[]).length>=17],
 ['dialogue audio speaker profiles present',lesson.includes("voice:'nova'")&&lesson.includes("voice:'onyx'")],
 ['backend has seventeen governed speaking configs',ids.every(id=>backend.includes("'"+id+"':{"))],
 ['backend Jev gate remains generic by can-do',backend.includes("canDo:config.canDo")&&backend.includes("targetLevel:'A1'")],
 ['backend mastery requires deterministic + Jev',backend.includes('deterministicPass&&jevPass(jev)')],
 ['runtime has seventeen transfer configs',ids.every(id=>runtime.includes("'"+id+"':{"))],
 ['Fix & Improve persistence retained',backend.includes('a1_gold_fix_evidence')&&runtime.includes('Fix & Improve')],
 ['360 report includes separated reading/listening evidence',backend.includes('workbookActivityStates')&&backend.includes('workbookActivityAttempts')&&runtime.includes('Reading attempts')&&runtime.includes('Listening attempts')],
 ['Gold lesson IDs remain isolated from legacy progress',lesson.includes("const BOOK_ID='speakup-a1-gold'")&&ids.every(id=>lesson.includes(id))]
];

let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failed++}
if(failed){console.error(`A1 Gold Lessons 1-17 QA failed: ${failed} check(s).`);process.exit(1)}
console.log(`A1 Gold Lessons 1-17 QA passed: ${checks.length}/${checks.length}.`);
