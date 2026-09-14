import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
const fail=[];const warn=[];const pass=[];
const ok=(label,condition,failure)=>condition?pass.push(label):fail.push(failure||label);

const index=exists('public/index.html')?read('public/index.html'):'';
const css=exists('public/englishgate-admin-design-v1.css')?read('public/englishgate-admin-design-v1.css'):'';
const app=exists('public/app.js')?read('public/app.js'):'';
const studentEnh=exists('public/admin-student-management-v2.js')?read('public/admin-student-management-v2.js'):'';
const teacherEnh=exists('public/admin-teacher-management-v1.js')?read('public/admin-teacher-management-v1.js'):'';

ok('Canonical Admin design stylesheet exists',Boolean(css),'Missing public/englishgate-admin-design-v1.css');
ok('Canonical Admin design layer is loaded',/englishgate-admin-design-v1\.css\?v=1/i.test(index),'index.html must load englishgate-admin-design-v1.css?v=1');
const adminIdx=index.indexOf('englishgate-admin-design-v1.css');
const schoolIdx=index.indexOf('/assets/school-platform.css');
const academicIdx=index.indexOf('/assets/academic-manager.css');
ok('Admin design loads after school and academic management styles',adminIdx>schoolIdx&&adminIdx>academicIdx,'Canonical Admin layer must load after school-platform.css and academic-manager.css');

ok('Admin layer inherits canonical primary token',/--eg-admin-primary\s*:\s*var\(--eg-primary,#2563EB\)/i.test(css),'Admin layer must inherit --eg-primary with #2563EB fallback');
ok('Admin layer inherits canonical text token',/--eg-admin-text\s*:\s*var\(--eg-text,#0F172A\)/i.test(css),'Admin layer must inherit canonical text token');
ok('Admin layer has visible keyboard focus',/focus-visible/i.test(css),'Admin controls must have focus-visible styling');
ok('Admin management controls provide >=44px targets',/min-height\s*:\s*44px/i.test(css),'Admin action controls must include >=44px touch targets');
ok('Admin mobile primary actions provide >=48px targets',/min-height\s*:\s*48px/i.test(css),'Admin mobile primary actions must include >=48px touch targets');
ok('Admin data tables preserve horizontal overflow instead of clipping',/overflow\s*:\s*auto/i.test(css)&&/-webkit-overflow-scrolling\s*:\s*touch/i.test(css),'Admin tables need scrollable responsive wrappers');
ok('Admin destructive actions use explicit error treatment',/\.danger-action[\s\S]*var\(--eg-admin-error\)/i.test(css),'Admin destructive actions must use explicit error semantics');
ok('Admin layer respects reduced motion',/prefers-reduced-motion\s*:\s*reduce/i.test(css),'Admin layer must respect reduced motion');

ok('Core Admin pages remain owned by app.js',/function\s+adminHome\b/.test(app)&&/function\s+adminClasses\b/.test(app)&&/function\s+adminTeachers\b/.test(app),'app.js must retain core Admin page ownership');
ok('Student management enhancement remains scoped to Admin pages',/function\s+isSystemAdminPage\b/.test(studentEnh)&&/data-admin-add-student-v2/.test(studentEnh),'Admin student enhancement scope is missing');
ok('Teacher management enhancement remains scoped to Admin Teachers',/function\s+isAdminTeachers\b/.test(teacherEnh)&&/data-admin-edit-teacher/.test(teacherEnh),'Admin teacher enhancement scope is missing');

const oldBlueFiles=['public/assets/academic-manager.css','public/assets/school-platform.css'];
for(const file of oldBlueFiles){
 if(!exists(file))continue;
 const src=read(file);
 if(/#17369f/i.test(src))warn.push(`${file} still contains legacy #17369f values; canonical Admin layer currently overrides presentation.`);
}
if((app.match(/data-admin-delete/g)||[]).length>0)pass.push('Admin destructive behavior remains explicit in app.js data attributes');
else warn.push('Could not verify data-admin-delete destructive controls in app.js.');

console.log('\nEnglishGate Admin UI QA (static, non-blocking)');
console.log('==============================================');
for(const x of pass)console.log('PASS  '+x);
for(const x of warn)console.log('WARN  '+x);
for(const x of fail)console.log('FAIL  '+x);
console.log(`\nSummary: ${pass.length} pass, ${warn.length} warning, ${fail.length} critical.`);
if(fail.length)process.exit(1);
