import fs from 'node:fs';

const failures=[];
const read=p=>{try{return fs.readFileSync(p,'utf8')}catch(e){failures.push('Missing '+p);return''}};
const must=(ok,msg)=>{if(!ok)failures.push(msg)};

const runtime=read('public/a1-gold-lesson1-v1.js');
const index=read('public/index.html');
const server=read('server.js');
const app=read('public/app.js');

try{new Function(runtime)}catch(e){failures.push('A1 Gold runtime syntax: '+e.message)}
try{new Function(server)}catch(e){failures.push('Server syntax after A1 Gold changes: '+e.message)}

must(runtime.includes("A1_CURRICULUM_VERSION='ENGLISHGATE_A1_GOLD_v1.0'"),'Frozen A1 curriculum version missing');
must(runtime.includes("totalLessons:22"),'A1 Gold must expose 22 lessons');
must(runtime.includes("id:'a1g-v1-l1'")&&runtime.includes("ready:true"),'A1 Lesson 1 must be enabled');
must(runtime.includes("status:'LOCKED_IMPLEMENTATION'")&&runtime.includes("ready:false"),'A1 Lessons 2–22 must remain locked during Lesson 1 pilot');
must(runtime.includes("['vocabulary','grammar','reading','listening','writing','speaking','review']"),'A1 seven-stage workbook contract missing');
must(runtime.includes("window.LIVE_BOOKS['speakup-a1']"),'A1 Gold Live lesson override missing');
must(runtime.includes("speaking:transfer"),'A1 speaking transfer evidence tag missing');
must(runtime.includes("writing:authentic"),'A1 authentic writing evidence tag missing');

const goldIndex=index.indexOf('a1-gold-lesson1-v1.js');
must(goldIndex>index.indexOf('a1-early-vocab-renderer.js'),'A1 Gold must load after legacy A1 vocabulary patches');
must(goldIndex>index.indexOf('cefr-live-books.js'),'A1 Gold must load after legacy CEFR live-book generation');
must(goldIndex>=0&&goldIndex<index.indexOf('pwa.js'),'A1 Gold runtime must load before PWA bootstrap');

must(server.includes("app.get('/a1-gold-lesson1-v1.js'"),'Server must explicitly serve the A1 Gold runtime');
must(server.includes('LISTENING_SCRIPTS["a1g-v1-l1"]'),'A1 Lesson 1 listening source missing');
must(server.includes("app.post('/api/a1/speaking/evaluate'"),'Jev speaking evaluation endpoint missing');
must(server.includes("['vocabulary','grammar','reading','listening','writing','speaking','review'].includes(skill)"),'Attempt API does not accept all A1 Gold skills');
must(server.includes("['vocabulary','grammar','reading','listening','writing','speaking','review'].includes(step)"),'Completion API does not accept all A1 Gold stages');
must(server.includes('"status":"pilot","total_lessons":22'), 'A1 backend book seed must be 22-lesson pilot');
must(server.includes("ctx.course_id==='speakup-a1'?['vocabulary','grammar','reading','listening','writing','speaking','review']"),'A1 certificate gate must require all seven stages');
must(app.includes("readyLessons(c).reduce((n,l)=>n+workbookStepsForLesson(l).length,0)"),'Student progress total must be lesson-aware');

if(failures.length){
 console.error('A1 GOLD QA FAILED');
 failures.forEach(x=>console.error('- '+x));
 process.exit(1);
}
console.log('A1 Gold QA passed: Lesson 1 end-to-end runtime contract is intact.');
