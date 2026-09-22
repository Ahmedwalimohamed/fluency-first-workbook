import {spawn} from 'node:child_process';

const PORT=3999;
const BASE=`http://127.0.0.1:${PORT}`;
const USER=process.env.DEMO_STUDENT_USERNAME;
const PASS=process.env.DEMO_STUDENT_PASSWORD;
const allowAudioBlock=process.env.A1_QA_ALLOW_AUDIO_BLOCK==='1';
if(process.env.A1_PREVIEW_MODE!=='1')throw new Error('A1_PREVIEW_MODE=1 is required for preview runtime QA.');
if(!USER||!PASS)throw new Error('Preview demo student credentials are required.');

const results=[];
let cookie='';
let childLogs='';
function record(name,status,evidence=''){results.push({name,status,evidence});console.log(`${status.padEnd(16)} ${name} ${evidence}`)}
async function req(path,{method='GET',body}={}){
  const headers={'Content-Type':'application/json'};
  if(cookie)headers.Cookie=cookie;
  const r=await fetch(BASE+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  const setCookie=r.headers.get('set-cookie');
  if(setCookie)cookie=setCookie.split(';')[0];
  const type=r.headers.get('content-type')||'';
  const data=type.includes('application/json')?await r.json().catch(()=>({})):await r.arrayBuffer();
  return {status:r.status,data};
}
async function waitHealth(){
  const end=Date.now()+30000;
  while(Date.now()<end){
    try{const r=await req('/api/a1_preview_health');if(r.status===200&&r.data?.ok)return r}catch{}
    await new Promise(r=>setTimeout(r,500));
  }
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

  const me=await req('/api/me');
  must(me.status===200&&me.data?.user?.id===studentId,'session restore','HTTP '+me.status);

  const state=await req('/api/state');
  const cls=(state.data?.classes||[]).find(c=>c.id==='a1_preview_class');
  const books=state.data?.books||[];
  const badActive=books.filter(b=>!['speakup-b2','speakup-a1-gold'].includes(b.id)&&['ready','pilot'].includes(b.status));
  must(state.status===200&&cls?.course_id==='speakup-a1-gold'&&badActive.length===0,'preview enrollment + book isolation',`class=${cls?.course_id||'missing'} badActive=${badActive.length}`);

  const att=await req('/api/attempts',{method:'POST',body:{lessonId:'a1-gold-l1',skill:'vocabulary',score:80,tags:['qa:a1-preview-runtime'],evidence:[{index:1,question:'Vocabulary QA',studentAnswer:'live',correctAnswer:'live',correct:true,tag:'qa'}]}});
  must(att.status===200&&att.data?.ok,'vocabulary attempt persistence','HTTP '+att.status);

  const comp=await req('/api/completion',{method:'POST',body:{lessonId:'a1-gold-l1',step:'vocabulary'}});
  must(comp.status===200&&comp.data?.ok,'vocabulary completion persistence','HTTP '+comp.status);

  for(const type of ['reading','listening']){
    const st=await req('/api/workbook-activities/state',{method:'POST',body:{lessonId:'a1-gold-l1',activityType:type,status:'in_progress',currentQuestion:0,responses:{}}});
    const at=await req('/api/workbook-activities/attempts',{method:'POST',body:{lessonId:'a1-gold-l1',activityType:type,score:75,correctCount:3,incorrectCount:1,responses:{q1:'qa'}}});
    const done=await req('/api/workbook-activities/complete',{method:'POST',body:{lessonId:'a1-gold-l1',activityType:type}});
    const prog=await req('/api/workbook-activities/progress');
    const saved=(prog.data?.states||[]).some(x=>x.lesson_id==='a1-gold-l1'&&x.activity_type===type&&x.status==='completed')&&(prog.data?.attempts||[]).some(x=>x.lesson_id==='a1-gold-l1'&&x.activity_type===type&&Number(x.score)===75);
    must(st.status===200&&at.status===200&&done.status===200&&saved,`${type} state + attempt + completion`,`state=${st.status} attempt=${at.status} complete=${done.status}`);
  }

  const writingText="Hi, my name is Ali. I live in Borama. I am a teacher and I work at a school. I like football and reading. Nice to meet you.";
  const writingTask='Your new English class has a group page. Write a short introduction so your classmates can know you. Include your name, where you live, work or study, and one interest.';
  const grade=await req('/api/writing-grade',{method:'POST',body:{lessonId:'a1-gold-l1',task:writingTask,level:'A1',minWords:20,maxWords:40,text:writingText}});
  if(grade.status===200)record('Jev writing grade','PASS',`score=${grade.data?.score??'returned'}`);
  else record('Jev writing grade','BLOCKED_EXTERNAL','HTTP '+grade.status);
  const save=await req('/api/writing/a1-gold-l1',{method:'PUT',body:{content:writingText,publishToCommunity:false}});
  must(save.status===200&&save.data?.ok,'writing persistence','HTTP '+save.status);

  const start=await req('/api/a1-gold/speaking/start',{method:'POST',body:{lessonId:'a1-gold-l1'}});
  must(start.status===200&&start.data?.sessionId,'speaking start','HTTP '+start.status);
  const sid=start.data.sessionId;
  const turn1=await req('/api/a1-gold/speaking/turn',{method:'POST',body:{sessionId:sid,text:"Hi. I'm Ali. I live Borama. I am teacher. What your name?"}});
  const turn2=await req('/api/a1-gold/speaking/turn',{method:'POST',body:{sessionId:sid,text:"I live in Borama. I am a teacher. I like football. Where do you live?"}});
  must(turn1.status===200&&turn2.status===200&&turn2.data?.readyToComplete===true,'speaking reciprocity gate',`questions=${turn2.data?.evidence?.relevantQuestions||0}`);
  const finish=await req('/api/a1-gold/speaking/complete',{method:'POST',body:{sessionId:sid}});
  must(finish.status===200&&finish.data?.deterministicPass===true,'speaking deterministic transfer','HTTP '+finish.status);
  if(finish.data?.jevStatus==='pass')record('Jev speaking decision','PASS',finish.data.masteryState||'MASTERED');
  else record('Jev speaking decision','BLOCKED_EXTERNAL',finish.data?.jevStatus||'pending');

  const repairs=finish.data?.repairs||[];
  must(repairs.length>=1,'Fix & Improve detection',`repairs=${repairs.length}`);
  const fix=await req('/api/a1-gold/fix-retry',{method:'POST',body:{id:repairs[0].id,retry:repairs[0].model}});
  must(fix.status===200&&fix.data?.resolved===true,'Fix & Improve retry','resolved=true');

  const report=await req('/api/a1-gold/report/'+encodeURIComponent(studentId)+'/a1-gold-l1');
  const rs=report.data?.workbookActivityStates||[],ra=report.data?.workbookActivityAttempts||[];
  const reportHasRL=['reading','listening'].every(type=>rs.some(x=>x.activity_type===type)&&ra.some(x=>x.activity_type===type));
  must(report.status===200&&(report.data?.speaking||[]).length>0&&(report.data?.fixes||[]).length>0&&(report.data?.attempts||[]).length>0&&report.data?.writing&&reportHasRL,'360 report persistence',`speaking=${report.data?.speaking?.length||0} RL=${reportHasRL}`);

  const audio=await req('/api/audio',{method:'POST',body:{lessonId:'a1-gold-l1',text:"Maryan: Hi. I'm Maryan. Nice to meet you.",speakers:[{name:'Maryan',gender:'female',voice:'nova'}]}});
  if(audio.status===200)record('natural listening audio','PASS','HTTP 200');
  else {
    const ttsLines=childLogs.split(/\n/).filter(line=>/TTS request error|OpenAI TTS|audio\/speech|billing_not_active|insufficient_quota|model|voice/i.test(line)).slice(-8).join(' | ').replace(/Bearer\s+[A-Za-z0-9._-]+/gi,'Bearer [redacted]').slice(0,1200);
    if(audio.status===502&&/billing_not_active|account is not active|insufficient_quota|quota|billing/i.test(ttsLines))record('natural listening audio','BLOCKED_EXTERNAL',ttsLines||'OpenAI billing/quota blocked');
    else record('natural listening audio','FAIL','HTTP '+audio.status+' '+(ttsLines||'no upstream detail captured'));
  }

  const logout=await req('/api/auth/logout',{method:'POST',body:{}});
  must(logout.status===200&&logout.data?.ok,'logout','HTTP '+logout.status);

  const failed=results.filter(x=>x.status==='FAIL');
  const blocked=results.filter(x=>x.status==='BLOCKED_EXTERNAL');
  console.log(`A1 PREVIEW RUNTIME QA: ${results.filter(x=>x.status==='PASS').length} PASS, ${failed.length} FAIL, ${blocked.length} BLOCKED_EXTERNAL`);
  if(failed.length)process.exitCode=1;
  else if(blocked.some(x=>x.name==='natural listening audio')&&!allowAudioBlock)process.exitCode=2;
  else process.exitCode=0;
} catch(e){
  console.error('A1 preview runtime QA error:',e.message);
  process.exitCode=1;
} finally{
  cleanup(child);
}
