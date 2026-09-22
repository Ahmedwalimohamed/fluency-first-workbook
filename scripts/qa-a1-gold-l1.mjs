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

const batchIds=['a1-gold-l1','a1-gold-l2','a1-gold-l3','a1-gold-l4','a1-gold-l5'];
const batchTitles=['Getting Acquainted','Work & Careers','Travel & Adventure','Technology & Social Media','Health & Wellbeing'];
const checks=[
 ['isolated Gold book retained as preview seed',/"id":"speakup-a1-gold"[^}]*"status":"inactive"[^}]*"total_lessons":22/.test(server)],
 ['legacy A1 retained but inactive',/"id":"speakup-a1"[^}]*"status":"inactive"[^}]*"total_lessons":44/.test(server)],
 ['production seed remains B2-only',(()=>{const m=server.match(/const BOOK_SEEDS=(\[[\s\S]*?\]);/);if(!m)return false;const books=JSON.parse(m[1]);return books.every(b=>b.id==='speakup-b2'?b.status==='ready':b.status==='inactive')})()],
 ['database production startup enforces B2-only',server.includes("update books set status=case when id='speakup-b2' then 'ready' else 'inactive' end")],
 ['preview standard activity guard covers only A1 Batch A',server.includes("/^a1-gold-l[1-5]$/")&&server.includes('function operationalLearningLesson')],
 ['preview separated activity guard covers only A1 Batch A',separated.includes("/^a1-gold-l[1-5]$/")&&separated.includes("A1_PREVIEW_MODE==='1'")],
 ['Gold curriculum and runtime loaded',index.includes('a1-gold-v1.js')&&index.includes('a1-gold-l1-runtime.js')],
 ['Gold bootstrap registered',teacher.includes("require('./a1-gold-bootstrap.js')")],
 ['all five Batch A lesson IDs present',batchIds.every(id=>lesson.includes("id:'"+id+"'"))],
 ['all five Batch A titles present',batchTitles.every(title=>lesson.includes("title:'"+title+"'"))],
 ['Batch A book exposes five implemented lessons',lesson.includes('const lessons=[L1,L2,L3,L4,L5]')],
 ['Lesson 1 can-do preserved',lesson.includes('Introduce yourself and exchange basic personal information with someone you have just met.')],
 ['Lesson 2 first-person grammar gate',lesson.includes("title:'Work & Careers'")&&lesson.includes('Do not add third-person -s here.')&&!lesson.includes('She works')],
 ['Lesson 3 does-not-teach-does gate',lesson.includes("title:'Travel & Adventure'")&&lesson.includes('Do not analyse or test “does” yet.')&&!lesson.includes('What time does the bus leave?')],
 ['Lesson 4 routine/purpose scope',lesson.includes("title:'Technology & Social Media'")&&lesson.includes('I use the internet for work.')],
 ['Lesson 5 first-person health gate',lesson.includes("title:'Health & Wellbeing'")&&lesson.includes('Keep the lesson in first person.')&&!lesson.includes('She feels tired')],
 ['reading and listening remain separately tagged',lesson.includes("'reading:detail'")&&lesson.includes("'listening:detail'")],
 ['all Batch A writing tasks preserve copy/paste block',(lesson.match(/copyPasteDisabled:true/g)||[]).length>=5],
 ['Batch A has natural speaker profiles',lesson.includes("voice:'nova'")&&lesson.includes("voice:'onyx'")],
 ['backend has five governed speaking configs',batchIds.every(id=>backend.includes("'"+id+"':{"))],
 ['backend Jev gate is generic by can-do',backend.includes("canDo:config.canDo")&&backend.includes("targetLevel:'A1'")],
 ['backend mastery requires deterministic + Jev',backend.includes('deterministicPass&&jevPass(jev)')],
 ['runtime has five speaking configs',batchIds.every(id=>runtime.includes("'"+id+"':{"))],
 ['Fix & Improve persistence retained',backend.includes('a1_gold_fix_evidence')&&runtime.includes('Fix & Improve')],
 ['360 report includes separated reading/listening evidence',backend.includes('workbookActivityStates')&&backend.includes('workbookActivityAttempts')&&runtime.includes('Reading attempts')&&runtime.includes('Listening attempts')],
 ['legacy progress isolation uses Gold lesson IDs',lesson.includes("const BOOK_ID='speakup-a1-gold'")&&batchIds.every(id=>lesson.includes(id))]
];

let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failed++}
if(failed){console.error(`A1 Gold Batch A QA failed: ${failed} check(s).`);process.exit(1)}
console.log(`A1 Gold Batch A QA passed: ${checks.length}/${checks.length}.`);
