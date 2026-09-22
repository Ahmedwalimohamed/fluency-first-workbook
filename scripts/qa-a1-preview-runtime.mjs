import {spawn} from 'node:child_process';

const PORT=3999;
const BASE=`http://127.0.0.1:${PORT}`;
const USER=process.env.DEMO_STUDENT_USERNAME;
const PASS=process.env.DEMO_STUDENT_PASSWORD;
const allowAudioBlock=process.env.A1_QA_ALLOW_AUDIO_BLOCK==='1';
if(process.env.A1_PREVIEW_MODE!=='1')throw new Error('A1_PREVIEW_MODE=1 is required for preview runtime QA.');
if(!USER||!PASS)throw new Error('Preview demo student credentials are required.');

const CASES=[
 {
  id:'a1-gold-l1',title:'Getting Acquainted',
  task:'Your new English class has a group page. Write a short introduction so your classmates can know you. Include your name, where you live, work or study, and one interest.',
  writing:"Hi, my name is Ali. I live in Borama. I am a teacher and I work at a school. I like football and reading. Nice to meet you.",
  turns:["Hi. I'm Ali. I live Borama. I am teacher. What your name?","I live in Borama. I am a teacher. I like football. Where do you live?"]
 },
 {
  id:'a1-gold-l2',title:'Work & Careers',
  task:'Write a short introduction for a professional group. Say your name, your job or study, where you work or study, and one thing you do there.',
  writing:'My name is Ali. I am a teacher. I work at a school in Borama. I teach English and help students every day.',
  turns:['I am nurse. I work hospital. I help patients. What you do?','I work at a hospital. I help patients. Where do you work?']
 },
 {
  id:'a1-gold-l3',title:'Travel & Adventure',
  task:'Write a short travel message. Say where you want to go, the travel time, and one other useful detail such as platform, price, or taxi.',
  writing:'I want to go to Hargeisa tomorrow morning. The bus is at eight. My ticket is seven dollars, and I need platform two.',
  turns:['I want ticket to Hargeisa. What time bus?','How much is the ticket? The afternoon bus is okay.']
 },
 {
  id:'a1-gold-l4',title:'Technology & Social Media',
  task:'Write a short post about your technology use. Say one device you use, where or how often you use it, and two things you do with it.',
  writing:'I use my phone every day. I send messages and watch short videos. I also use the internet for work and study.',
  turns:['I use phone every day. I use internet work. What you use phone for?','I use the internet for work. I send messages. What do you use your phone for?']
 },
 {
  id:'a1-gold-l5',title:'Health & Wellbeing',
  task:'Write a short message to your teacher. Say how you feel, one simple problem or need, and one healthy thing you do or plan to do today.',
  writing:'I feel tired today and I have a headache. I need water. This evening I will rest and take a short walk.',
  turns:['I feeling tired. I am headache. How you feel?','I feel tired. I have a headache. I walk every evening. How do you feel?']
 }
];

const results=[];
let cookie='',childLogs='';
function record(name,status,evidence=''){results.push({name,status,evidence});console.log(`${status.padEnd(16)} ${name} ${evidence}`)}
async function req(path,{method='GET',body}={}){
 const headers={'Content-Type':'application/json'};if(cookie)headers.Cookie=cookie;
 const r=await fetch(BASE+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
 const setCookie=r.headers.get('set-cookie');if(setCookie)cookie=setCookie.split(';')[0];
 const type=r.headers.get('content-type')||'',data=type.includes('application/json')?await r.json().catch(()=>({})):await r.arrayBuffer();
 return{status:r.status,data};
}
async function waitHealth(){
 const end=Date.now()+30000;
 while(Date.now()<end){try{const r=await req('/api/a1_preview_health');if(r.status===200&&r.data?.ok)return r}catch{}await new Promise(r=>setTimeout(r,500))}
 throw new Error('Preview app did not become healthy.');
}
function must(ok,name,evidence=''){if(!ok){record(name,'FAIL',evidence);throw new Error(name+' failed')}record(name,'PASS',evidence)}
function cleanup(child){if(child&&!child.killed)child.kill('SIGTERM')}

const child=spawn(process.execPath,['standards-audit-bootstrap.js'],{
 cwd:new URL('..',import.meta.url).pathname,
 env:{...process.env,PORT:String(PORT),AUDIO_STARTUP_SELF_TEST:'0'},
 stdio:['ignore','pipe','pipe']
});
child.stdout.on('data',d=>{childLogs+=d.toString()});
child.stderr.on('data',d=>{childLogs+=d.toString()});

try{
 const health=await waitHealth();
 must(health.data?.books?.b2==='ready'&&health.data?.books?.a1Gold==='pilot','preview health',JSON.stringify(health.data));

 const login=await req('/api/auth/login',{method:'POST',body:{username:USER,password:PASS}});
 must(login.status===200&&login.data?.user?.role==='student','student login','HTTP '+login.status);
 const studentId=login.data.user.id;
 const me=await req('/api/me');must(me.status===200&&me.data?.user?.id===studentId,'session restore','HTTP '+me.status);
 const state=await req('/api/state'),cls=(state.data?.classes||[]).find(c=>c.id==='a1_preview_class'),books=state.data?.books||[],badActive=books.filter(b=>!['speakup-b2','speakup-a1-gold'].includes(b.id)&&['ready','pilot'].includes(b.status));
 must(state.status===200&&cls?.course_id==='speakup-a1-gold'&&badActive.length===0,'preview enrollment + book isolation',`class=${cls?.course_id||'missing'} badActive=${badActive.length}`);

 for(const [idx,test] of CASES.entries()){
  const label=`L${idx+1} ${test.title}`;
  const core=await req('/api/attempts',{method:'POST',body:{lessonId:test.id,skill:'vocabulary',score:80,tags:['qa:a1-preview-runtime','qa:'+test.id],evidence:[{index:1,question:'Vocabulary QA',studentAnswer:'test',correctAnswer:'test',correct:true,tag:'qa'}]}});
  must(core.status===200&&core.data?.ok,label+' vocabulary persistence','HTTP '+core.status);

  const comp=await req('/api/completion',{method:'POST',body:{lessonId:test.id,step:'vocabulary'}});
  must(comp.status===200&&comp.data?.ok,label+' completion persistence','HTTP '+comp.status);

  for(const type of ['reading','listening']){
   const st=await req('/api/workbook-activities/state',{method:'POST',body:{lessonId:test.id,activityType:type,status:'in_progress',currentQuestion:0,responses:{}}});
   const at=await req('/api/workbook-activities/attempts',{method:'POST',body:{lessonId:test.id,activityType:type,score:75,correctCount:3,incorrectCount:1,responses:{q1:'qa'}}});
   const done=await req('/api/workbook-activities/complete',{method:'POST',body:{lessonId:test.id,activityType:type}});
   const prog=await req('/api/workbook-activities/progress');
   const saved=(prog.data?.states||[]).some(x=>x.lesson_id===test.id&&x.activity_type===type&&x.status==='completed')&&(prog.data?.attempts||[]).some(x=>x.lesson_id===test.id&&x.activity_type===type&&Number(x.score)===75);
   must(st.status===200&&at.status===200&&done.status===200&&saved,label+' '+type+' persistence',`state=${st.status} attempt=${at.status} complete=${done.status}`);
  }

  const grade=await req('/api/writing-grade',{method:'POST',body:{lessonId:test.id,task:test.task,level:'A1',minWords:15,maxWords:45,text:test.writing}});
  if(grade.status===200)record(label+' Jev writing grade','PASS',`score=${grade.data?.score??'returned'}`);
  else record(label+' Jev writing grade','BLOCKED_EXTERNAL','HTTP '+grade.status);
  const save=await req('/api/writing/'+encodeURIComponent(test.id),{method:'PUT',body:{content:test.writing,publishToCommunity:false}});
  must(save.status===200&&save.data?.ok,label+' writing persistence','HTTP '+save.status);

  const start=await req('/api/a1-gold/speaking/start',{method:'POST',body:{lessonId:test.id}});
  must(start.status===200&&start.data?.sessionId,label+' speaking start','HTTP '+start.status);
  const sid=start.data.sessionId;
  let lastTurn=null;
  for(const text of test.turns){lastTurn=await req('/api/a1-gold/speaking/turn',{method:'POST',body:{sessionId:sid,text}});must(lastTurn.status===200,label+' speaking turn','HTTP '+lastTurn.status)}
  must(lastTurn.data?.readyToComplete===true,label+' deterministic speaking gate',`details=${lastTurn.data?.evidence?.personalDetails||0} questions=${lastTurn.data?.evidence?.relevantQuestions||0}`);
  const finish=await req('/api/a1-gold/speaking/complete',{method:'POST',body:{sessionId:sid}});
  must(finish.status===200&&finish.data?.deterministicPass===true,label+' speaking completion','HTTP '+finish.status);
  if(finish.data?.jevStatus==='pass')record(label+' Jev speaking decision','PASS',finish.data.masteryState||'MASTERED');
  else record(label+' Jev speaking decision','BLOCKED_EXTERNAL',finish.data?.jevStatus||'pending');

  const repairs=finish.data?.repairs||[];
  must(repairs.length>=1,label+' Fix & Improve detection',`repairs=${repairs.length}`);
  const fix=await req('/api/a1-gold/fix-retry',{method:'POST',body:{id:repairs[0].id,retry:repairs[0].model}});
  must(fix.status===200&&fix.data?.resolved===true,label+' Fix & Improve retry','resolved=true');

  const report=await req('/api/a1-gold/report/'+encodeURIComponent(studentId)+'/'+encodeURIComponent(test.id));
  const rs=report.data?.workbookActivityStates||[],ra=report.data?.workbookActivityAttempts||[],reportHasRL=['reading','listening'].every(type=>rs.some(x=>x.activity_type===type)&&ra.some(x=>x.activity_type===type));
  must(report.status===200&&(report.data?.speaking||[]).length>0&&(report.data?.fixes||[]).length>0&&(report.data?.attempts||[]).length>0&&report.data?.writing&&reportHasRL,label+' 360 report',`speaking=${report.data?.speaking?.length||0} RL=${reportHasRL}`);
 }

 const audio=await req('/api/audio',{method:'POST',body:{lessonId:'a1-gold-l3',text:"Agent: Hello. Traveler: I want a ticket to Hargeisa, please.",speakers:[{name:'Agent',gender:'female',voice:'nova'},{name:'Traveler',gender:'male',voice:'onyx'}]}});
 if(audio.status===200)record('Batch A natural listening audio','PASS','HTTP 200');
 else{
  const ttsLines=childLogs.split(/\n/).filter(line=>/TTS request error|OpenAI TTS|audio\/speech|billing_not_active|insufficient_quota|model|voice/i.test(line)).slice(-8).join(' | ').replace(/Bearer\s+[A-Za-z0-9._-]+/gi,'Bearer [redacted]').slice(0,1200);
  if(audio.status===502&&/billing_not_active|account is not active|insufficient_quota|quota|billing/i.test(ttsLines))record('Batch A natural listening audio','BLOCKED_EXTERNAL',ttsLines||'OpenAI billing/quota blocked');
  else record('Batch A natural listening audio','FAIL','HTTP '+audio.status+' '+(ttsLines||'no upstream detail captured'));
 }

 const logout=await req('/api/auth/logout',{method:'POST',body:{}});must(logout.status===200&&logout.data?.ok,'logout','HTTP '+logout.status);
 const failed=results.filter(x=>x.status==='FAIL'),blocked=results.filter(x=>x.status==='BLOCKED_EXTERNAL');
 console.log(`A1 BATCH A RUNTIME QA: ${results.filter(x=>x.status==='PASS').length} PASS, ${failed.length} FAIL, ${blocked.length} BLOCKED_EXTERNAL`);
 if(failed.length)process.exitCode=1;
 else if(blocked.some(x=>x.name==='Batch A natural listening audio')&&!allowAudioBlock)process.exitCode=2;
 else process.exitCode=0;
}catch(e){console.error('A1 Batch A runtime QA error:',e.message);process.exitCode=1}
finally{cleanup(child)}
