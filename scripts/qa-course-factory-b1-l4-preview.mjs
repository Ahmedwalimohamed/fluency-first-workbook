import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>fs.readFileSync(root+p,'utf8');
const landing=read('public/course-factory-b1-gold-l4-preview.html');
const lessonBookHtml=read('public/course-factory-b1-gold-l4-lesson-book.html');
const lessonBookJs=read('public/course-factory-b1-gold-l4-lesson-book.js');
const workbookHtml=read('public/course-factory-b1-gold-l4-workbook.html');
const workbookJs=read('public/course-factory-b1-gold-l4-workbook.js');
const css=read('public/course-factory-preview.css');
const api=read('api/vercel-parity-entry.js');

for(const file of [
  'public/course-factory-b1-gold-l4-lesson-book.js',
  'public/course-factory-b1-gold-l4-workbook.js',
  'api/vercel-parity-entry.js'
]){
  const run=spawnSync(process.execPath,['--check',root+file],{encoding:'utf8'});
  if(run.status!==0){console.error(`FAIL  syntax ${file}`);console.error(run.stderr||run.stdout);process.exit(1)}
  console.log(`PASS  syntax ${file}`);
}

const forbiddenRegistryWrites=[
  /BOOK_PACKS\s*\[/,
  /LIVE_BOOKS\s*\[/,
  /BOOK_SEEDS\s*=/,
  /update\s+books\s+set\s+status/i
];

const lessonBookForbidden=[
  /function\s+mastery\s*\(/,
  /const\s+SCORED\s*=/,
  /weakest-area Boost/i,
  /renderReading\s*\(/,
  /renderListening\s*\(/,
  /renderWriting\s*\(/
];

const workbookForbidden=[
  /teacherMove/,
  /renderMission\s*\(/,
  /Correction & debrief/i,
  /Fluency Mission.*completion gate/i
];

const checks=[
  ['landing clearly separates Lesson Book and Workbook',landing.includes('Lesson Book')&&landing.includes('Workbook')&&landing.includes('teacher-led')&&landing.includes('student practice')],
  ['landing links to Lesson Book',landing.includes('/course-factory-b1-gold-l4-lesson-book.html')],
  ['landing links to Workbook',landing.includes('/course-factory-b1-gold-l4-workbook.html')],
  ['Lesson Book loads its own runtime',lessonBookHtml.includes('/course-factory-b1-gold-l4-lesson-book.js?v=1')],
  ['Workbook loads its own runtime',workbookHtml.includes('/course-factory-b1-gold-l4-workbook.js?v=1')],
  ['Lesson Book explicitly rejects workbook scoring',lessonBookHtml.includes('No mastery score')&&lessonBookHtml.includes('Those belong to the Workbook')],
  ['Lesson Book contains live teaching flow',lessonBookJs.includes("['warmup','Warm-up']")&&lessonBookJs.includes("['mission','Fluency Mission']")&&lessonBookJs.includes("['debrief','Correction & debrief']")],
  ['Lesson Book contains no workbook scoring engine',lessonBookForbidden.every(pattern=>!pattern.test(lessonBookJs))],
  ['Workbook uses four scored evidence areas',workbookJs.includes("const SCORED=['vocabulary','reading','listening','grammar']")],
  ['Workbook includes Help Me Practice evidence',workbookJs.includes("['practice','Help Me Practice']")&&workbookJs.includes('practiceSaved')],
  ['Workbook writing remains mastery-gated',workbookJs.includes('mastery()>=Number(lesson?.mastery?.threshold||0.8)')],
  ['Workbook opens only weakest-area Boost below mastery',workbookJs.includes('function weakest()')&&workbookJs.includes('Only the weakest-area Boost opens')],
  ['Workbook keeps transcript-attempt rule',workbookJs.includes('state.listeningAttempts>=Number(s.transcriptUnlockAttempt||2)')&&workbookJs.includes('state.listeningAttempts++')],
  ['Workbook does not contain teacher-led mission/debrief flow',workbookForbidden.every(pattern=>!pattern.test(workbookJs))],
  ['preview data endpoint remains preview-gated',api.includes("/__course-factory/b1-gold-l4/preview-data")&&api.includes('if(!isPreview())return json(res,404')],
  ['Jev endpoint remains preview-gated',api.includes("/__course-factory/b1-gold-l4/jev-review")],
  ['preview reads reviewed lesson from server',api.includes('b1-lesson-04-quality-patch.js')],
  ['mobile layout still exists',css.includes('@media(max-width:760px)')],
  ['separated surfaces do not modify production book registries',forbiddenRegistryWrites.every(pattern=>!pattern.test(lessonBookJs)&&!pattern.test(workbookJs)&&!pattern.test(api))]
];

let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failed++}
if(failed){console.error(`B1 Gold separated preview QA failed: ${failed} check(s).`);process.exit(1)}
console.log(`B1 Gold separated preview QA passed: ${checks.length}/${checks.length}.`);
