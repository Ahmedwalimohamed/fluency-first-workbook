import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
const findings=[];
const pass=[];
function ok(name,condition,severity='BLOCKER',detail=''){
  if(condition)pass.push(name);
  else findings.push({severity,name,detail});
}
function sliceFunction(src,name,next='\nfunction '){
  const start=src.indexOf('function '+name);
  if(start<0)return '';
  const end=src.indexOf(next,start+10);
  return src.slice(start,end<0?src.length:end);
}

// Reuse the established EnglishGate UI audits as part of A1 UAT.
for(const script of ['scripts/qa-final-ui.mjs','scripts/qa-teacher-ui.mjs','scripts/qa-admin-ui.mjs']){
  try{execFileSync(process.execPath,[script],{stdio:'inherit'});pass.push('existing UI audit '+script)}
  catch{findings.push({severity:'BLOCKER',name:'existing UI audit failed: '+script,detail:'Fix canonical UI regression before A1 release.'})}
}

const required=['public/index.html','public/app.js','public/a1-gold-v1.js','public/a1-gold-l1-runtime.js','public/englishgate-student-course-design-v1.css','public/englishgate-teacher-design-v1.css','public/englishgate-admin-design-v1.css'];
for(const p of required)ok('required UAT surface exists: '+p,exists(p));

const index=read('public/index.html');
const app=read('public/app.js');
const a1=read('public/a1-gold-v1.js');
const runtime=read('public/a1-gold-l1-runtime.js');
const studentCss=read('public/englishgate-student-course-design-v1.css');
const teacherCss=read('public/englishgate-teacher-design-v1.css');
const adminCss=read('public/englishgate-admin-design-v1.css');

const live=sliceFunction(app,'studentLiveLesson');
const lessonReport=sliceFunction(app,'renderStudentLessonPage');

ok('mobile viewport uses safe-area support',index.includes('viewport-fit=cover'));
ok('Reading and Listening separation is loaded',index.includes('reading-listening-separation-v3.js')&&index.includes('reading-listening-grading-v1.js'));
ok('A1 Gold curriculum/runtime scripts are loaded',index.includes('a1-gold-v1.js')&&index.includes('a1-gold-l1-runtime.js'));
ok('A1 exposes all 22 lessons',a1.includes('L18,L19,L20,L21,L22')&&a1.includes('totalLessons:22'));

ok('live lesson lets learner move backward',live.includes('prevStudentLiveSection')&&live.includes('← Previous'));
ok('live lesson stage buttons remain directly navigable',live.includes('data-student-live-section'));
ok('workbook preserves previous-activity navigation',app.includes("id=\"previousActivity\"")&&app.includes('b2PreviousStep'));
ok('admin/teacher workbook preview can move previous and next',app.includes('adminPreviewPrevious')&&app.includes('adminPreviewNext'));

ok('lesson performance opens as a full page',lessonReport.includes('lesson-performance-page')&&lessonReport.includes('<main'));
ok('lesson performance uses card/grid layout rather than a wide table',lessonReport.includes('report-activity-grid')&&!lessonReport.includes('<table'));
ok('lesson report includes meaningful written summary',lessonReport.includes('Teacher lesson summary')&&lessonReport.includes('lessonNarrative'));
ok('lesson report includes completion, score, attempts, attention',lessonReport.includes('Completion')&&lessonReport.includes('Lesson score')&&lessonReport.includes('Total attempts')&&lessonReport.includes('Needs attention'));
ok('lesson report includes chronological learning journey',lessonReport.includes('Learning journey')&&lessonReport.includes('report-timeline'));

ok('A1 360 report adds speaking evidence',runtime.includes('Conversation transcript')&&runtime.includes('mastery_state'));
ok('A1 360 report adds Reading and Listening attempts',runtime.includes('Reading attempts')&&runtime.includes('Listening attempts'));
ok('A1 360 report adds writing evidence',runtime.includes("<small>Writing</small>"));
ok('A1 360 report adds Fix & Improve evidence',runtime.includes('<h3>Fix & Improve</h3>'));

ok('A1 speaking transfer has start/send/finish controls',runtime.includes('a1GoldSpeakingStart')&&runtime.includes('a1GoldSpeakingSend')&&runtime.includes('a1GoldSpeakingFinish'));
ok('A1 speaking transfer has learner text entry',runtime.includes('a1GoldSpeakingInput')&&runtime.includes('<textarea'));
ok('A1 speaking feedback distinguishes mastery status',runtime.includes('masteryState')&&runtime.includes('Jev:'));
ok('A1 Fix & Improve requires learner retry',runtime.includes('data-a1-fix-input')&&runtime.includes('data-a1-fix-retry'));

ok('student UI has mobile breakpoint',/@media\s*\(max-width\s*:\s*(?:760|768|800)px\)/i.test(studentCss),'MAJOR','Student course design needs a mobile breakpoint.');
ok('student controls include >=44px touch target',/min-height\s*:\s*44px/i.test(studentCss),'MAJOR','Increase touch targets for mobile learners.');
ok('teacher UI has mobile breakpoint',/@media\s*\(max-width\s*:\s*760px\)/i.test(teacherCss),'MAJOR','Teacher UI needs mobile safeguards.');
ok('teacher controls include >=44px touch target',/min-height\s*:\s*44px/i.test(teacherCss),'MAJOR');
ok('admin controls include >=44px touch target',/min-height\s*:\s*44px/i.test(adminCss),'MAJOR');
ok('admin mobile actions include >=48px touch target',/min-height\s*:\s*48px/i.test(adminCss),'MAJOR');

ok('final A1 lesson is explicitly unscripted transfer',a1.includes('Unscripted final transfer')&&a1.includes('No new grammar'));
ok('final checkpoint includes UNDERSTAND/RESPOND/INITIATE/PRODUCE/ADAPT',a1.includes("domains:['UNDERSTAND','RESPOND','INITIATE','PRODUCE','ADAPT']"));
ok('production activation remains false in frozen metadata',a1.includes('productionActivation:false'));

console.log('\nA1 GOLD RELEASE UAT — VISUAL/SOURCE GATE');
console.log('=========================================');
for(const p of pass)console.log('PASS  '+p);
for(const f of findings)console.log(`${f.severity}  ${f.name}${f.detail?' — '+f.detail:''}`);
const blockers=findings.filter(x=>x.severity==='BLOCKER').length;
const majors=findings.filter(x=>x.severity==='MAJOR').length;
const minors=findings.filter(x=>x.severity==='MINOR').length;
console.log(`SUMMARY  ${pass.length} PASS · ${blockers} BLOCKER · ${majors} MAJOR · ${minors} MINOR`);
if(blockers||majors)process.exit(1);
