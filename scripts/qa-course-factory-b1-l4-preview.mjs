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
const northstarCss=read('public/b2-lesson1-microflow-v1.css');
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
  /SEE_CHOOSE_CHANGE_USE_FIX/,
  /const\s+PHASES\s*=/,
  /function\s+renderQuestionSet\s*\(/,
  /function\s+renderRepair\s*\(/
];

const workbookTeacherFlowForbidden=[
  /teacherMove/,
  /\['mission','Fluency Mission'\]/,
  /\['debrief','Correction & debrief'\]/
];

const landingLower=landing.toLowerCase();
const checks=[
  ['landing clearly separates Lesson Book and Workbook',landingLower.includes('lesson book')&&landingLower.includes('workbook')&&landingLower.includes('teacher-led')&&landingLower.includes('student practice')],
  ['landing links to Lesson Book',landing.includes('/course-factory-b1-gold-l4-lesson-book.html')],
  ['landing links to Workbook',landing.includes('/course-factory-b1-gold-l4-workbook.html')],
  ['Lesson Book loads its own runtime',lessonBookHtml.includes('/course-factory-b1-gold-l4-lesson-book.js?v=1')],
  ['Lesson Book remains teacher-led rather than Northstar workbook',lessonBookForbidden.every(pattern=>!pattern.test(lessonBookJs))],
  ['Workbook loads the shared current Northstar CSS',workbookHtml.includes('/b2-lesson1-microflow-v1.css?v=1')],
  ['Workbook loads its current-engine runtime',workbookHtml.includes('/course-factory-b1-gold-l4-workbook.js?v=2')],
  ['Workbook uses the exact five current phases',workbookJs.includes("const PHASES=['SEE','CHOOSE','CHANGE','USE','FIX']")],
  ['Workbook has ten short actions',workbookJs.includes('const TOTAL=10;')&&workbookJs.includes("data-step=\"'+(Number(state.index)+1)+'\"")],
  ['Workbook preserves current phase strip',workbookJs.includes('class="micro-framework"')&&workbookJs.includes('phaseStrip(state)')],
  ['Workbook preserves current step counter and progress bar',workbookJs.includes("Step '+(Number(state.index)+1)+' of '+TOTAL")&&workbookJs.includes('class="micro-progress"')],
  ['Workbook is one action at a time',workbookJs.includes('state.index')&&workbookJs.includes('function next(state)')&&workbookJs.includes('function previous(state)')],
  ['Reading and listening use one-question-at-a-time subprogress',workbookJs.includes('function renderQuestionSet')&&workbookJs.includes('state.subprogress')&&workbookJs.includes("Question '+(pos+1)+' of '+items.length")],
  ['Workbook gives immediate retry feedback',workbookJs.includes("ok?'Correct.':'Try again.'")&&workbookJs.includes('if(!ok)return renderQuestionSet(state,opts)')],
  ['Workbook follows the same SEE→CHOOSE→CHANGE→USE→FIX step architecture',workbookJs.includes("{phase:'SEE',skill:'reading'}")&&workbookJs.includes("{phase:'CHANGE',skill:'grammar'}")&&workbookJs.includes("{phase:'USE',skill:'writing'}")&&workbookJs.includes("{phase:'FIX',skill:'grammar'}")],
  ['B1 content remains original Technology & Social Media content',workbookJs.includes('Technology &amp; Social Media')&&workbookJs.includes('A quieter phone, not no phone')&&workbookJs.includes('screen time')],
  ['Help Me Practice is embedded in USE rather than a separate navigation system',workbookJs.includes('same kind of short, personal response used in Help Me Practice')&&!workbookJs.includes("['practice','Help Me Practice']")],
  ['Writing uses the B1 80–120 word social-post task',workbookJs.includes('80–120 words')&&workbookJs.includes('function renderPost')],
  ['FIX repairs one important issue adaptively',workbookJs.includes('function repairMode')&&workbookJs.includes('function renderRepair')&&workbookJs.includes('one important part instead of correcting everything at once')],
  ['Workbook no longer uses the temporary custom stage/sidebar engine',!workbookJs.includes('const STAGES=')&&!workbookJs.includes('workbookNav')&&!workbookHtml.includes('masteryTitle')&&!workbookHtml.includes('boostCard')],
  ['Workbook does not contain teacher-led mission/debrief flow',workbookTeacherFlowForbidden.every(pattern=>!pattern.test(workbookJs))],
  ['shared Northstar CSS includes mobile five-phase strip',northstarCss.includes('.micro-framework')&&northstarCss.includes('@media(max-width:700px)')],
  ['preview data endpoint remains preview-gated',api.includes('/__course-factory/b1-gold-l4/preview-data')&&api.includes('if(!isPreview())return json(res,404')],
  ['Jev endpoint remains preview-gated',api.includes('/__course-factory/b1-gold-l4/jev-review')],
  ['separated surfaces do not modify production book registries',forbiddenRegistryWrites.every(pattern=>!pattern.test(lessonBookJs)&&!pattern.test(workbookJs)&&!pattern.test(api))]
];

let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failed++}
if(failed){console.error(`B1 Gold current-engine preview QA failed: ${failed} check(s).`);process.exit(1)}
console.log(`B1 Gold current-engine preview QA passed: ${checks.length}/${checks.length}.`);
