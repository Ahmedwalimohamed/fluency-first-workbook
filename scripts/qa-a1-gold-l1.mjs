import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const server=read('server.js');
const index=read('public/index.html');
const lesson=read('public/a1-gold-v1.js');
const runtime=read('public/a1-gold-l1-runtime.js');
const backend=read('a1-gold-bootstrap.js');
const teacher=read('teacher-management-bootstrap.js');

const syntaxFiles=['server.js','standards-audit-bootstrap.js','reading-listening-separation-bootstrap.js','a1-gold-bootstrap.js','public/app.js','public/a1-gold-v1.js','public/a1-gold-l1-runtime.js'];
for(const file of syntaxFiles){
  const run=spawnSync(process.execPath,['--check',new URL('../'+file,import.meta.url).pathname],{encoding:'utf8'});
  if(run.status!==0){
    console.error('FAIL  syntax '+file);
    console.error(run.stderr||run.stdout);
    process.exit(1);
  }
  console.log('PASS  syntax '+file);
}

const checks=[
  ['isolated Gold book retained but inactive',/"id":"speakup-a1-gold"[^}]*"status":"inactive"[^}]*"total_lessons":22/.test(server)],
  ['legacy A1 retained but inactive',/"id":"speakup-a1"[^}]*"status":"inactive"[^}]*"total_lessons":44/.test(server)],
  ['B2 is the only active seed',(()=>{const m=server.match(/const BOOK_SEEDS=(\[[\s\S]*?\]);/);if(!m)return false;const books=JSON.parse(m[1]);return books.every(b=>b.id==='speakup-b2'?b.status==='ready':b.status==='inactive')})()],
  ['database startup enforces B2-only active state',server.includes("update books set status=case when id='speakup-b2' then 'ready' else 'inactive' end")],
  ['B2-only standard activity guard',server.includes('requireB2LearningLesson')&&server.includes("Only B2 Upper Intermediate is currently active")],
  ['B2-only separated activity guard',read('reading-listening-separation-bootstrap.js').includes('b2LessonOnly')],
  ['Gold curriculum loaded',index.includes('a1-gold-v1.js')&&index.includes('a1-gold-l1-runtime.js')],
  ['Gold bootstrap registered',teacher.includes("require('./a1-gold-bootstrap.js')")],
  ['inactive runtime guard present',runtime.includes('bookOperational')||read('public/app.js').includes('function bookOperational(id)')],
  ['Gold speaking APIs dormant while inactive',backend.includes('requireGoldActive')&&backend.includes('A1 Gold is currently inactive')],
  ['lesson identity',lesson.includes("id:LESSON_ID")&&lesson.includes("title:'Getting Acquainted'")],
  ['A1 can-do',lesson.includes('Introduce yourself and exchange basic personal information')],
  ['target vocabulary', ['name','live','work','study','teacher','student','city','like'].every(x=>lesson.includes(`word:'${x}'`))],
  ['separate reading/listening tags',lesson.includes("'reading:detail'")&&lesson.includes("'listening:detail'")],
  ['Maryan audio speaker profile',lesson.includes("name:'Maryan'")&&lesson.includes("voice:'nova'")],
  ['writing task present',lesson.includes('class has a group page')&&lesson.includes('minWords:20')&&lesson.includes('maxWords:40')],
  ['speaking transfer present',lesson.includes('ask at least two relevant questions')&&runtime.includes('/api/a1-gold/speaking/start')],
  ['Jev final gate present',backend.includes('EnglishGate A1 Lesson 1 speaking transfer decision')&&backend.includes('targetLevel:\'A1\'')],
  ['mastery requires reciprocity',backend.includes('relevantQuestions>=2')&&backend.includes('details>=2')],
  ['Fix & Improve persistence',backend.includes('a1_gold_fix_evidence')&&runtime.includes('Fix & Improve')],
  ['360 report endpoint',backend.includes('/api/a1-gold/report/:studentId/:lessonId')&&runtime.includes('Speaking transfer & Fix evidence')],
  ['legacy progress isolation',lesson.includes("const BOOK_ID='speakup-a1-gold'")&&lesson.includes("const LESSON_ID='a1-gold-l1'")]
];

let failed=0;
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if(!ok)failed++;
}
if(failed){
  console.error(`A1 Gold Lesson 1 QA failed: ${failed} check(s).`);
  process.exit(1);
}
console.log(`A1 Gold Lesson 1 QA passed: ${checks.length}/${checks.length}.`);
