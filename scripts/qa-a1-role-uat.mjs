import {spawn} from 'node:child_process';

const PORT=4001;
const BASE=`http://127.0.0.1:${PORT}`;
const studentUser=process.env.DEMO_STUDENT_USERNAME;
const studentPass=process.env.DEMO_STUDENT_PASSWORD;
const teacherUser=process.env.TEACHER_USERNAME||'teacher';
const teacherPass=process.env.TEACHER_PASSWORD;
const adminUser=process.env.SYSTEM_ADMIN_USERNAME||'admin';
const adminPass=process.env.SYSTEM_ADMIN_PASSWORD;
if(process.env.A1_PREVIEW_MODE!=='1')throw new Error('A1_PREVIEW_MODE=1 is required for role UAT.');
for(const [name,value] of [['student username',studentUser],['student password',studentPass],['teacher password',teacherPass],['admin password',adminPass]])if(!value)throw new Error('Missing '+name+' for role UAT.');

let cookie='';
let logs='';
const results=[];
function record(name,ok,evidence=''){results.push({name,ok,evidence});console.log(`${ok?'PASS':'FAIL'}  ${name}${evidence?'  '+evidence:''}`);if(!ok)throw new Error(name+' failed')}
async function req(path,{method='GET',body}={}){
 const headers={'Content-Type':'application/json'};if(cookie)headers.Cookie=cookie;
 const r=await fetch(BASE+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
 const setCookie=r.headers.get('set-cookie');if(setCookie)cookie=setCookie.split(';')[0];
 const type=r.headers.get('content-type')||'',data=type.includes('application/json')?await r.json().catch(()=>({})):await r.text();
 return{status:r.status,data};
}
async function login(username,password,expectedRole){
 cookie='';
 const r=await req('/api/auth/login',{method:'POST',body:{username,password}});
 record(expectedRole+' login',r.status===200&&r.data?.user?.role===expectedRole,'HTTP '+r.status);
 const me=await req('/api/me');
 record(expectedRole+' session',me.status===200&&me.data?.user?.role===expectedRole,'HTTP '+me.status);
 return me.data.user;
}
async function logout(role){const r=await req('/api/auth/logout',{method:'POST',body:{}});record(role+' logout',r.status===200&&r.data?.ok,'HTTP '+r.status);cookie=''}
async function waitHealth(){
 const until=Date.now()+30000;
 while(Date.now()<until){try{const r=await req('/api/a1_preview_health');if(r.status===200&&r.data?.ok)return r}catch{}await new Promise(r=>setTimeout(r,400))}
 throw new Error('A1 preview did not become healthy for role UAT.');
}
function validateState(role,state){
 const classes=state.data?.classes||[],books=state.data?.books||[];
 const previewClass=classes.find(x=>x.id==='a1_preview_class');
 const a1=books.find(x=>x.id==='speakup-a1-gold'),b2=books.find(x=>x.id==='speakup-b2');
 const wronglyActive=books.filter(x=>!['speakup-a1-gold','speakup-b2'].includes(x.id)&&['ready','pilot'].includes(x.status));
 record(role+' sees A1 preview class',state.status===200&&previewClass?.course_id==='speakup-a1-gold','HTTP '+state.status);
 record(role+' sees A1 Gold pilot + B2 ready',a1?.status==='pilot'&&b2?.status==='ready',`a1=${a1?.status||'missing'} b2=${b2?.status||'missing'}`);
 record(role+' sees no unintended active courses',wronglyActive.length===0,'count='+wronglyActive.length);
}
function validateReport(role,r){
 const d=r.data||{};
 record(role+' can open Lesson 22 360 report',r.status===200,'HTTP '+r.status);
 record(role+' report contains speaking',Array.isArray(d.speaking)&&d.speaking.length>0,'rows='+(d.speaking?.length||0));
 record(role+' report contains attempts/completion',Array.isArray(d.attempts)&&d.attempts.length>0&&Array.isArray(d.completion),'attempts='+(d.attempts?.length||0));
 record(role+' report contains Reading/Listening evidence',Array.isArray(d.workbookActivityAttempts)&&['reading','listening'].every(type=>d.workbookActivityAttempts.some(x=>x.activity_type===type)),'rows='+(d.workbookActivityAttempts?.length||0));
 record(role+' report contains writing',Boolean(d.writing?.content),'writing='+(d.writing?.content?'saved':'missing'));
 record(role+' report contains Fix & Improve',Array.isArray(d.fixes)&&d.fixes.length>0,'fixes='+(d.fixes?.length||0));
}

const child=spawn(process.execPath,['standards-audit-bootstrap.js'],{
 cwd:new URL('..',import.meta.url).pathname,
 env:{...process.env,PORT:String(PORT),AUDIO_STARTUP_SELF_TEST:'0',A1_SKIP_RELEASE_UAT:'1'},
 stdio:['ignore','pipe','pipe']
});
child.stdout.on('data',d=>logs+=d.toString());child.stderr.on('data',d=>logs+=d.toString());

try{
 const health=await waitHealth();
 record('role UAT preview health',health.status===200&&health.data?.books?.a1Gold==='pilot');

 const student=await login(studentUser,studentPass,'student');
 const sState=await req('/api/state');validateState('student',sState);
 const sReport=await req('/api/a1-gold/report/'+encodeURIComponent(student.id)+'/a1-gold-l22');validateReport('student',sReport);
 await logout('student');

 await login(teacherUser,teacherPass,'teacher');
 const tState=await req('/api/state');validateState('teacher',tState);
 const tReport=await req('/api/a1-gold/report/'+encodeURIComponent(student.id)+'/a1-gold-l22');validateReport('teacher',tReport);
 await logout('teacher');

 await login(adminUser,adminPass,'admin');
 const aState=await req('/api/state');validateState('admin',aState);
 const aReport=await req('/api/a1-gold/report/'+encodeURIComponent(student.id)+'/a1-gold-l22');validateReport('admin',aReport);
 await logout('admin');

 console.log(`A1 ROLE UAT: ${results.length}/${results.length} PASS · Student/Teacher/Admin evidence continuity confirmed.`);
 process.exitCode=0;
}catch(e){
 console.error('A1 ROLE UAT error:',e.message);
 const tail=logs.split(/\n/).slice(-80).join('\n').replace(/Bearer\s+[A-Za-z0-9._-]+/gi,'Bearer [redacted]');if(tail)console.error(tail);
 process.exitCode=1;
}finally{if(!child.killed)child.kill('SIGTERM')}
