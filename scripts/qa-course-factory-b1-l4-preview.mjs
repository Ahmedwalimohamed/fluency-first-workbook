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
const appJs=read('public/app.js');
const productionIndex=read('public/index.html');
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

const lessonBookWorkbookForbidden=[
  /SEE_CHOOSE_CHANGE_USE_FIX/,
  /const\s+PHASES\s*=/,
  /function\s+renderQuestionSet\s*\(/,
  /function\s+renderRepair\s*\(/,
  /function\s+mastery\s*\(/,
  /function\s+gradeGroup\s*\(/,
  /masteryTitle/,
  /boostCard/
];

const temporaryLessonUiForbidden=[
  /course-factory-teacher-preview/,
  /eg-live-card/,
  /eg-language-chip/,
  /preview-pill/,
  /eg-lesson-header-row/,
  /<style>/i
];

const workbookTeacherFlowForbidden=[
  /teacherMove/,
  /\['mission','Fluency Mission'\]/,
  /\['debrief','Correction & debrief'\]/
];

const landingLower=landing.toLowerCase();
const productionCssMarkers=[
  'englishgate-unified-ui-v1.css',
  'englishgate-blue-red-white-v1.css',
  'englishgate-lesson-player-design-v2.css',
  'englishgate-teacher-design-v1.css',
  'teacher-whiteboard-v1.css',
  'englishgate-b2-premium-v3.css',
  'b2-learning-surface-v1.css'
];
const checks=[
  ['landing clearly separates Lesson Book and Workbook',landingLower.includes('lesson book')&&landingLower.includes('workbook')&&landingLower.includes('teacher-led')&&landingLower.includes('student practice')],
  ['landing links to Lesson Book',landing.includes('/course-factory-b1-gold-l4-lesson-book.html')],
  ['landing links to Workbook',landing.includes('/course-factory-b1-gold-l4-workbook.html')],

  ['Lesson Book uses production EnglishGate CSS stack',productionCssMarkers.every(marker=>lessonBookHtml.includes(marker)&&productionIndex.includes(marker))],
  ['Lesson Book uses production app shell',lessonBookHtml.includes('id="app" class="app"')&&lessonBookHtml.includes('class="sidebar"')&&lessonBookHtml.includes('class="main"')&&lessonBookHtml.includes('class="topbar"')&&lessonBookHtml.includes('id="content" class="content"')],
  ['Lesson Book uses real teacher navigation chrome',lessonBookHtml.includes('Overview')&&lessonBookHtml.includes('Teach')&&lessonBookHtml.includes('Workbooks')&&lessonBookHtml.includes('Students')&&lessonBookHtml.includes('Needs review')&&lessonBookHtml.includes('Reports')],
  ['Lesson Book loads current teacher Whiteboard and Timer tools',lessonBookHtml.includes('/teacher-whiteboard-v1.css?v=8')&&lessonBookHtml.includes('/teacher-whiteboard-v1.js?v=7')&&lessonBookHtml.includes('/teacher-timer-v1.js?v=1')],
  ['Lesson Book loads production-parity runtime',lessonBookHtml.includes('/course-factory-b1-gold-l4-lesson-book.js?v=3')],
  ['Lesson Book removes temporary custom preview CSS and chrome',temporaryLessonUiForbidden.every(pattern=>!pattern.test(lessonBookHtml)&&!pattern.test(lessonBookJs))],
  ['Lesson Book enters teacher live mode',lessonBookHtml.includes('role-teacher teacher-live-active')&&lessonBookJs.includes("document.body.classList.add('role-teacher','teacher-live-active')")],
  ['Lesson Book has five teacher-led stages',lessonBookJs.includes("{key:'warmup',label:'Warm Up'}")&&lessonBookJs.includes("{key:'language',label:'Vocabulary & Language'}")&&lessonBookJs.includes("{key:'discussion',label:'Guided Discussion'}")&&lessonBookJs.includes("{key:'mission',label:'Fluency Mission'}")&&lessonBookJs.includes("{key:'feedback',label:'Feedback & Retry'}")],
  ['Lesson Book mirrors canonical teacher lesson markup',lessonBookJs.includes('class="eg-lesson"')&&lessonBookJs.includes('eg-lesson-header-actions')&&lessonBookJs.includes('eg-lesson-layout')&&lessonBookJs.includes('eg-stage-list')&&lessonBookJs.includes("?'is-current':''")&&lessonBookJs.includes('eg-teaching-surface')&&lessonBookJs.includes('live-book-content eg-stage-content')&&lessonBookJs.includes('eg-lesson-footer')],
  ['Lesson Book mirrors canonical B2 presentation chrome',lessonBookJs.includes('teacher-presentation-chrome')&&lessonBookJs.includes('teacher-presentation-title')&&lessonBookJs.includes('teacher-presentation-stages')&&lessonBookJs.includes('teacher-presentation-stage')&&lessonBookJs.includes('data-presentation-toggle')],
  ['Lesson Book mirrors canonical teacher annotation surface',lessonBookJs.includes('teacher-annotation-stage')&&lessonBookJs.includes('teacher-annotation-text-layer')&&lessonBookJs.includes('teacher-annotation-canvas')&&lessonBookJs.includes('teacher-laser-pointer')],
  ['Lesson Book keeps canonical live teacher tools slot',lessonBookJs.includes('live-class-tools live-class-tools-whiteboard-only')&&lessonBookJs.includes('live-tool-actions')],
  ['Lesson Book uses native B2 content renderer classes',lessonBookJs.includes('live-book-section')&&lessonBookJs.includes('live-book-subhead')&&lessonBookJs.includes('live-prompt-grid')&&lessonBookJs.includes('live-prompt-row')&&lessonBookJs.includes('live-vocab-table')&&lessonBookJs.includes('live-vocab-row')&&lessonBookJs.includes('live-check-row')],
  ['Lesson Book preserves Previous and Next stage navigation',lessonBookJs.includes('id="prevLiveSection"')&&lessonBookJs.includes('id="nextLiveSection"')&&lessonBookJs.includes('Stage ${index+1} of ${total}')],
  ['Lesson Book hands off to matching Workbook',lessonBookJs.includes('/course-factory-b1-gold-l4-workbook.html')&&lessonBookJs.includes('Open matching workbook')],
  ['Lesson Book stays teacher-led rather than Workbook-scored',lessonBookWorkbookForbidden.every(pattern=>!pattern.test(lessonBookJs))],
  ['Lesson Book keeps independent evidence out of live stages',!lessonBookJs.includes('renderReading(')&&!lessonBookJs.includes('renderListening(')&&!lessonBookJs.includes('renderWriting(')],
  ['Lesson Book architecture vocabulary exists in canonical app player',appJs.includes('eg-lesson-header-actions')&&appJs.includes('eg-lesson-layout')&&appJs.includes('eg-stage-list')&&appJs.includes('eg-teaching-surface')&&appJs.includes('teacher-presentation-title')&&appJs.includes('teacher-annotation-canvas')&&appJs.includes('live-class-tools')],

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
  ['Workbook no longer uses temporary custom stage/sidebar engine',!workbookJs.includes('const STAGES=')&&!workbookJs.includes('workbookNav')&&!workbookHtml.includes('masteryTitle')&&!workbookHtml.includes('boostCard')],
  ['Workbook does not contain teacher-led mission/debrief flow',workbookTeacherFlowForbidden.every(pattern=>!pattern.test(workbookJs))],
  ['shared Northstar CSS includes mobile five-phase strip',northstarCss.includes('.micro-framework')&&northstarCss.includes('@media(max-width:700px)')],

  ['preview data endpoint remains preview-gated',api.includes('/__course-factory/b1-gold-l4/preview-data')&&api.includes('if(!isPreview())return json(res,404')],
  ['Jev endpoint remains preview-gated',api.includes('/__course-factory/b1-gold-l4/jev-review')],
  ['separated surfaces do not modify production book registries',forbiddenRegistryWrites.every(pattern=>!pattern.test(lessonBookJs)&&!pattern.test(workbookJs)&&!pattern.test(api))]
];

let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failed++}
if(failed){console.error(`B1 Gold production-parity preview QA failed: ${failed} check(s).`);process.exit(1)}
console.log(`B1 Gold production-parity preview QA passed: ${checks.length}/${checks.length}.`);
