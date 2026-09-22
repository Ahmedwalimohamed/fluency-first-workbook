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

const ids=Array.from({length:11},(_,i)=>`a1-gold-l${i+1}`);
const titles=['Getting Acquainted','Work & Careers','Travel & Adventure','Technology & Social Media','Health & Wellbeing','Food & Culture','Education & Learning','Money & Business','Environment & Climate','Relationships & Family','Media & News'];
function lessonSegment(n){
 const start=lesson.indexOf(`const L${n}=lesson({`);
 const end=n<11?lesson.indexOf(`const l${n+1}v=[`,start):lesson.indexOf('const lessons=',start);
 return start>=0&&end>start?lesson.slice(start,end):'';
}
const L2=lessonSegment(2),L3=lessonSegment(3),L5=lessonSegment(5),L6=lessonSegment(6),L7=lessonSegment(7),L8=lessonSegment(8),L9=lessonSegment(9),L10=lessonSegment(10),L11=lessonSegment(11);

const checks=[
 ['isolated Gold book retained as preview seed',/"id":"speakup-a1-gold"[^}]*"status":"inactive"[^}]*"total_lessons":22/.test(server)],
 ['legacy A1 retained but inactive',/"id":"speakup-a1"[^}]*"status":"inactive"[^}]*"total_lessons":44/.test(server)],
 ['production seed remains B2-only',(()=>{const m=server.match(/const BOOK_SEEDS=(\[[\s\S]*?\]);/);if(!m)return false;const books=JSON.parse(m[1]);return books.every(b=>b.id==='speakup-b2'?b.status==='ready':b.status==='inactive')})()],
 ['database production startup enforces B2-only',server.includes("update books set status=case when id='speakup-b2' then 'ready' else 'inactive' end")],
 ['preview standard activity guard covers only A1 Lessons 1-11',server.includes("/^a1-gold-l(?:[1-9]|1[01])$/")&&server.includes('function operationalLearningLesson')],
 ['preview separated activity guard covers only A1 Lessons 1-11',separated.includes("/^a1-gold-l(?:[1-9]|1[01])$/")&&separated.includes("A1_PREVIEW_MODE==='1'")],
 ['Gold curriculum and runtime loaded',index.includes('a1-gold-v1.js')&&index.includes('a1-gold-l1-runtime.js')],
 ['Gold bootstrap registered',teacher.includes("require('./a1-gold-bootstrap.js')")],
 ['all eleven lesson IDs present',ids.every(id=>lesson.includes("id:'"+id+"'"))],
 ['all eleven lesson titles present',titles.every(title=>lesson.includes("title:'"+title+"'"))],
 ['course exposes Lessons 1-11 only as implemented Gold preview',lesson.includes('const lessons=[L1,L2,L3,L4,L5,L6,L7,L8,L9,L10,L11]')],
 ['Lesson 2 remains first-person only',L2.includes('Do not add third-person -s here.')&&!/\bShe works\b|\bHe works\b/.test(L2)],
 ['Lesson 3 does remains a chunk blocker',L3.includes('Do not analyse or test “does” yet.')&&!L3.includes('What time does the bus leave?')],
 ['Lesson 5 remains first-person health',L5.includes('Keep the lesson in first person.')&&!L5.includes('She feels tired')],
 ['Lesson 6 introduces negatives and request distinction',L6.includes("I do not / don’t like")&&L6.includes('preference')&&L6.includes('request chunks')],
 ['Lesson 7 formally introduces can/can’t',L7.includes('Can and can’t for simple learning ability.')&&L7.includes('can + base verb')],
 ['Lesson 8 separates number understanding from language',L8.includes('scores number understanding separately from language')&&L8.includes("Can I pay by card?")],
 ['Lesson 9 introduces but without formally targeting because',L9.includes('Use “but”')&&!L9.includes("grammar:connector-because")&&!L9.includes('targetLanguage:[\'because') ],
 ['Lesson 10 is formal third-person and does start',L10.includes('formal start of third-person present simple')&&L10.includes('Where does he live?')&&L10.includes('What does she do?')],
 ['Lesson 11 integrates media + announcement transfer',L11.includes('relay two facts from a short announcement')&&L11.includes('football game')&&L11.includes('Tickets are two dollars')],
 ['reading and listening remain separately tagged',lesson.includes("'reading:detail'")&&lesson.includes("'listening:detail'")],
 ['every implemented lesson preserves copy/paste block',(lesson.match(/copyPasteDisabled:true/g)||[]).length>=11],
 ['dialogue audio speaker profiles present',lesson.includes("voice:'nova'")&&lesson.includes("voice:'onyx'")],
 ['backend has eleven governed speaking configs',ids.every(id=>backend.includes("'"+id+"':{"))],
 ['backend Jev gate remains generic by can-do',backend.includes("canDo:config.canDo")&&backend.includes("targetLevel:'A1'")],
 ['backend mastery requires deterministic + Jev',backend.includes('deterministicPass&&jevPass(jev)')],
 ['runtime has eleven transfer configs',ids.every(id=>runtime.includes("'"+id+"':{"))],
 ['Fix & Improve persistence retained',backend.includes('a1_gold_fix_evidence')&&runtime.includes('Fix & Improve')],
 ['360 report includes separated reading/listening evidence',backend.includes('workbookActivityStates')&&backend.includes('workbookActivityAttempts')&&runtime.includes('Reading attempts')&&runtime.includes('Listening attempts')],
 ['Gold lesson IDs remain isolated from legacy progress',lesson.includes("const BOOK_ID='speakup-a1-gold'")&&ids.every(id=>lesson.includes(id))]
];

let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failed++}
if(failed){console.error(`A1 Gold Lessons 1-11 QA failed: ${failed} check(s).`);process.exit(1)}
console.log(`A1 Gold Lessons 1-11 QA passed: ${checks.length}/${checks.length}.`);
