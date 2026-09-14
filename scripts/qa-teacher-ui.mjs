import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
const critical=[];
const warnings=[];
const passes=[];

if(!exists('public/index.html')) critical.push('Missing public/index.html');
if(!exists('public/englishgate-teacher-design-v1.css')) critical.push('Missing canonical Teacher design layer');

if(exists('public/index.html')){
  const html=read('public/index.html');
  const base=html.indexOf('styles.css');
  const teacher=html.indexOf('englishgate-teacher-design-v1.css?v=1');
  if(teacher<0) critical.push('Canonical Teacher design layer is not loaded.');
  else if(teacher>base) passes.push('Canonical Teacher design layer loads after base styles');
  else critical.push('Canonical Teacher design layer must load after base styles.');
}

if(exists('public/englishgate-teacher-design-v1.css')){
  const css=read('public/englishgate-teacher-design-v1.css');
  if(/--eg-teacher-primary\s*:\s*var\(--eg-primary,#2563EB\)/i.test(css)) passes.push('Teacher design inherits canonical EnglishGate primary token');
  else critical.push('Teacher design must inherit --eg-primary with #2563EB fallback.');
  if(/focus-visible/.test(css)) passes.push('Teacher design defines keyboard focus states');
  else critical.push('Teacher design is missing focus-visible states.');
  if(/min-height\s*:\s*44px/i.test(css)) passes.push('Teacher design includes >=44px teaching controls');
  else critical.push('Teacher design is missing >=44px control safeguards.');
  if(/prefers-reduced-motion/.test(css)) passes.push('Teacher design respects reduced-motion preference');
  else warnings.push('Teacher design does not appear to respect reduced motion.');
  if(/@media\(max-width:760px\)/.test(css)) passes.push('Teacher design includes mobile teaching safeguards');
  else warnings.push('Teacher design has no mobile breakpoint.');
}

if(exists('public/styles.css')){
  const base=read('public/styles.css');
  const assist=(base.match(/Teacher Assist intelligence layer v1/g)||[]).length;
  const live=(base.match(/Teacher live book \+ assignment flow/g)||[]).length;
  if(assist>1) warnings.push(`Legacy styles.css still contains ${assist} Teacher Assist blocks; canonical Teacher layer currently wins at runtime.`);
  else passes.push('No duplicate Teacher Assist marker detected in base styles');
  if(live>1) warnings.push(`Legacy styles.css still contains ${live} Teacher live-book blocks; canonical Teacher layer currently wins at runtime.`);
  else passes.push('No duplicate Teacher live-book marker detected in base styles');
}

console.log('\nEnglishGate Teacher UI QA (static, non-blocking)');
console.log('==============================================');
for(const item of passes) console.log(`PASS  ${item}`);
for(const item of warnings) console.log(`WARN  ${item}`);
for(const item of critical) console.log(`FAIL  ${item}`);
console.log(`\nSummary: ${passes.length} pass, ${warnings.length} warning, ${critical.length} critical.`);
if(critical.length) process.exit(1);
