import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const exists=p=>fs.existsSync(p);
let critical=0,warnings=0;
const ok=m=>console.log('✓',m);
const warn=m=>{warnings++;console.warn('WARN:',m)};
const fail=m=>{critical++;console.error('FAIL:',m)};

const required=[
  'public/index.html',
  'public/englishgate-unified-ui-v1.css',
  'public/englishgate-student-home-design-v3.css',
  'public/englishgate-student-course-design-v1.css',
  'public/englishgate-lesson-player-design-v2.css',
  'public/englishgate-grammar-design-v2.css',
  'public/englishgate-vocabulary-design-v2.css',
  'public/englishgate-reading-design-v2.css',
  'public/englishgate-listening-design-v2.css',
  'public/englishgate-teacher-design-v1.css',
  'public/englishgate-admin-design-v1.css',
  'public/role-navigation-icons-v1.js'
];
for(const p of required)exists(p)?ok('exists '+p):fail('missing '+p);

if(critical){console.error(`Final UI QA: ${critical} critical, ${warnings} warnings`);process.exit(1)}

const index=read('public/index.html');
const unified=read('public/englishgate-unified-ui-v1.css');
const courseBridge=read('public/mobile-student-course-v1.css');
const courseDesign=read('public/englishgate-student-course-design-v1.css');
const roleIcons=read('public/role-navigation-icons-v1.js');
const rl=read('public/reading-listening-separation-v3.js');

const tokens={
  '--eg-primary':'#2563EB',
  '--eg-text':'#0F172A',
  '--eg-secondary':'#64748B',
  '--eg-background':'#F8FAFC',
  '--eg-card':'#FFFFFF',
  '--eg-border':'#E2E8F0',
  '--eg-success':'#16A34A',
  '--eg-error':'#DC2626',
  '--eg-review':'#F59E0B',
  '--eg-vocabulary':'#7C3AED'
};
for(const [name,value] of Object.entries(tokens)){
  unified.includes(name)&&unified.toUpperCase().includes(value.toUpperCase())?ok(`semantic token ${name}`):fail(`semantic token missing/mismatched: ${name}`);
}

const order=[
  'englishgate-unified-ui-v1.css',
  'englishgate-student-home-design-v3.css',
  'englishgate-student-course-design-v1.css',
  'englishgate-lesson-player-design-v2.css',
  'englishgate-grammar-design-v2.css',
  'englishgate-vocabulary-design-v2.css',
  'englishgate-reading-design-v2.css',
  'englishgate-listening-design-v2.css',
  'englishgate-teacher-design-v1.css',
  'englishgate-admin-design-v1.css'
];
let previous=-1;
for(const file of order){
  const pos=index.indexOf(file);
  if(pos<0)fail('stylesheet not loaded: '+file);
  else if(pos<previous)fail('canonical stylesheet order reversed at '+file);
  else{ok('stylesheet order '+file);previous=pos}
}

if(index.includes('Book → Lesson → Four skill pages'))fail('outdated four-skill-page login promise remains');
else ok('login activity-model copy updated');
if(index.includes('Reading and Listening are separate activities'))ok('login copy reflects separate Reading and Listening');
else warn('login copy does not explicitly mention separate Reading and Listening');

if(index.includes('role-navigation-icons-v1.js?v=1'))ok('role navigation SVG enhancer loaded');
else fail('role navigation SVG enhancer not loaded');
if(roleIcons.includes('<svg')&&roleIcons.includes('data-page'))ok('role navigation uses SVG presentation without replacing routing attributes');
else fail('role navigation icon layer missing SVG/data-page safeguards');

const forbiddenVisual=/\b(background|color|border(?:-radius)?|box-shadow|font-size|font-weight)\s*:/i;
forbiddenVisual.test(courseBridge)?fail('mobile student course bridge still owns visual properties'):ok('mobile student course bridge is structural only');
if(courseDesign.includes('var(--eg-primary')&&courseDesign.includes(':focus-visible')&&courseDesign.includes('min-height:44px'))ok('canonical student course design has semantic tokens, focus and touch safeguards');
else fail('canonical student course design safeguards incomplete');

if(index.indexOf('mobile-student-course-v1.css')<index.indexOf('englishgate-student-course-design-v1.css'))ok('course structure loads before course visual authority');
else fail('student course stylesheet ownership order incorrect');

if(index.includes('englishgate-teacher-design-v1.css?v=1')&&index.includes('englishgate-admin-design-v1.css?v=1'))ok('Teacher and Admin canonical layers loaded');
else fail('Teacher/Admin canonical layer missing');

if(rl.includes('>▶<')||rl.includes('>↺<'))warn('Reading/Listening audio controls still use text glyph icons; migrate in owning renderer after browser verification');
else ok('Reading/Listening audio controls no longer use text glyph icons');

const legacy=read('public/styles.css');
const teacherAssistCount=(legacy.match(/Teacher Assist intelligence layer v1/g)||[]).length;
const teacherLiveCount=(legacy.match(/Teacher live book \+ assignment flow/g)||[]).length;
if(teacherAssistCount>1)warn(`legacy styles.css still contains ${teacherAssistCount} Teacher Assist blocks`);
if(teacherLiveCount>1)warn(`legacy styles.css still contains ${teacherLiveCount} Teacher live-book blocks`);

for(const p of ['public/assets/academic-manager.css','public/assets/school-platform.css']){
  const css=read(p);
  if(/#17369f/i.test(css))warn(`${p} still contains legacy #17369f values; canonical Admin layer wins at runtime`);
}

if(index.includes('viewport-fit=cover'))ok('viewport safe-area support present');else fail('viewport-fit=cover missing');
if(index.includes('theme-color" content="#2563EB"'))ok('browser theme color canonical');else fail('browser theme color mismatch');

console.log(`Final UI QA: ${critical} critical, ${warnings} warnings`);
process.exit(critical?1:0);
