import fs from 'node:fs';

const ROOT=new URL('../',import.meta.url);
const appCode=fs.readFileSync(new URL('public/app.js',ROOT),'utf8');
const serverCode=fs.readFileSync(new URL('server.js',ROOT),'utf8');
const indexCode=fs.readFileSync(new URL('public/index.html',ROOT),'utf8');
const packageJson=JSON.parse(fs.readFileSync(new URL('package.json',ROOT),'utf8'));
const failures=[];
const fail=m=>failures.push(m);

try{new Function(appCode)}catch(e){fail('public/app.js syntax error: '+e.message)}
try{new Function(serverCode)}catch(e){fail('server.js syntax error: '+e.message)}

for(const marker of [
 "['my-writings','✎','My Writings']",
 "'my-writings':myWritings",
 "writings:myWritings",
 "'admin-writings':myWritings",
 "function myWritings()",
 "Share my poster",
 "data-writing-like",
 "IOU_PUBLIC_NAME='Islamic Online University-Borama'",
 "IOU_PUBLIC_CONTACT='063 325 3947'"
])if(!appCode.includes(marker))fail('My Writings UI missing: '+marker);

for(const marker of [
 'create table if not exists writing_likes',
 "app.get('/api/writings',auth",
 "app.post('/api/writings/:studentId/:lessonId/like',auth,studentOnly",
 "app.delete('/api/writings/:studentId/:lessonId/like',auth,studentOnly",
 "You cannot like your own writing.",
 "canShare:req.user.role==='student'&&r.student_id===req.user.id",
 "app.patch('/api/admin/students/:id/manage',auth,adminOnly",
 "app.patch('/api/teacher/students/:id/manage',auth,teacherOnly",
 "app.patch('/api/admin/students/:id/class',auth,adminOnly",
 "app.patch('/api/teacher/students/:id/class',auth,teacherOnly"
])if(!serverCode.includes(marker))fail('Server safeguard missing: '+marker);

const writingsStart=serverCode.indexOf("app.get('/api/writings'");
const writingsEnd=serverCode.indexOf("app.post('/api/writings/:studentId",writingsStart);
const writingsSegment=writingsStart>=0&&writingsEnd>writingsStart?serverCode.slice(writingsStart,writingsEnd):'';
if(!writingsSegment)fail('Could not isolate writing-feed route.');
if(/whatsapp_number|username|password_hash|login_token/i.test(writingsSegment))fail('Writing feed exposes private account/contact data.');

const likeStart=serverCode.indexOf("app.post('/api/writings/:studentId/:lessonId/like'");
const likeEnd=serverCode.indexOf("app.delete('/api/writings/:studentId/:lessonId/like'",likeStart);
const likeSegment=likeStart>=0&&likeEnd>likeStart?serverCode.slice(likeStart,likeEnd):'';
if(/update profiles|insert into attempts|completion/i.test(likeSegment))fail('Thumbs-up logic must not change grades, points, attempts, or completion.');
if(!serverCode.includes("delete from writing_likes where author_student_id=$1 and lesson_id=$2"))fail('Likes must reset when the published writing text changes.');

const manageStart=serverCode.indexOf('async function manageStudent');
const manageEnd=serverCode.indexOf("app.post('/api/admin/users/:id/reset-password'",manageStart);
const manageSegment=manageStart>=0&&manageEnd>manageStart?serverCode.slice(manageStart,manageEnd):'';
if(!manageSegment.includes("You can only move students to your own classes."))fail('Teacher class-transfer ownership restriction is missing.');
if(/delete from attempts|delete from completion|delete from writing_samples/i.test(manageSegment))fail('Student management must preserve learning history.');

if(!appCode.includes("Only you can share your writing outside EnglishGate."))fail('Student-facing external-sharing privacy message is missing.');
if(!appCode.includes("Likes encourage learners; they do not change academic grades or leaderboard scores."))fail('Non-academic likes message is missing.');
if(!indexCode.includes('student-management-my-writings-v1'))fail('Community asset cache-bust version is missing.');

if(packageJson.scripts?.['qa:b2']!=='node scripts/qa-b2.mjs')fail('Existing B2 QA script changed unexpectedly.');
if(packageJson.scripts?.['qa:community']!=='node scripts/qa-community.mjs')fail('Community QA script is not registered.');
if(packageJson.scripts?.prestart!=='npm run qa:b2 && npm run qa:community')fail('Both QA layers must run before production start.');

if(failures.length){
 console.error('\nCOMMUNITY QA FAILED:');
 failures.forEach(x=>console.error('  - '+x));
 console.error(`\n${failures.length} blocking issue(s). Production start is blocked.\n`);
 process.exit(1);
}
console.log('COMMUNITY QA PASSED: student management, My Writings, likes, privacy, and sharing safeguards validated.\n');
