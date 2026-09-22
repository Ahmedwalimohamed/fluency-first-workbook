import {spawn} from 'node:child_process';

const PORT=3999;
const BASE=`http://127.0.0.1:${PORT}`;
const USER=process.env.DEMO_STUDENT_USERNAME;
const PASS=process.env.DEMO_STUDENT_PASSWORD;
if(process.env.A1_PREVIEW_MODE!=='1')throw new Error('A1_PREVIEW_MODE=1 is required for preview runtime QA.');
if(!USER||!PASS)throw new Error('Preview demo student credentials are required.');

const CASES=[
 {id:'a1-gold-l1',title:'Getting Acquainted',task:'Write a short class introduction with name, place, work or study, and one interest.',min:20,max:40,writing:"Hi, my name is Ali. I live in Borama. I am a teacher and I work at a school. I like football and reading.",turns:["Hi. I'm Ali. I live Borama. I am teacher. What your name?","I live in Borama. I am a teacher. I like football. Where do you live?"]},
 {id:'a1-gold-l2',title:'Work & Careers',task:'Write a professional group introduction with job or study, place, and one action.',min:20,max:40,writing:'My name is Ali. I am a teacher. I work at a school in Borama. I teach English and help students every day.',turns:['I am nurse. I work hospital. I help patients. What you do?','I work at a hospital. I help patients. Where do you work?']},
 {id:'a1-gold-l3',title:'Travel & Adventure',task:'Write a travel message with destination, time, and one other detail.',min:20,max:40,writing:'I want to go to Hargeisa tomorrow morning. The bus is at eight. My ticket is seven dollars, and I need platform two.',turns:['I want ticket to Hargeisa. What time bus?','How much is the ticket? The afternoon bus is okay.']},
 {id:'a1-gold-l4',title:'Technology & Social Media',task:'Write a technology-use post with device, frequency or place, and two uses.',min:25,max:45,writing:'I use my phone every day. I send messages and watch short videos. I also use the internet for work and study.',turns:['I use phone every day. I use internet work. What you use phone for?','I use the internet for work. I send messages. What do you use your phone for?']},
 {id:'a1-gold-l5',title:'Health & Wellbeing',task:'Write a teacher message with feeling, problem or need, and one healthy action.',min:15,max:35,writing:'I feel tired today and I have a headache. I need water. This evening I will rest and take a short walk.',turns:['I feeling tired. I am headache. How you feel?','I feel tired. I have a headache. I walk every evening. How do you feel?']},
 {id:'a1-gold-l6',title:'Food & Culture',task:'Reply to a friend about food preferences and one thing you would order.',min:20,max:40,writing:"I like rice and vegetables. I don't like coffee. At the café, I'd like rice and tea, please. Water is also okay.",turns:['I no like coffee. I like tea please. Can I water?','I don\'t like coffee. I\'d like rice, please. Can I have water, please?']},
 {id:'a1-gold-l7',title:'Education & Learning',task:'Write a learner profile with two abilities, one difficulty, and one help phrase.',min:25,max:45,writing:"I can read English and I can write short messages. I can't understand every word. In class I can say, Can you repeat that, please?",turns:['I can to read. I no understand. You repeat?','I can read English. I can\'t understand this word. Can you repeat that?']},
 {id:'a1-gold-l8',title:'Money & Business',task:'Write a short price enquiry with item, price question, and payment question.',min:15,max:35,writing:'Hello. I want to buy this notebook. How much is it? Can I pay by card, please? Thank you.',turns:['How much this? I take. I pay card.','How much is this? I\'ll take it. Can I pay by card?']},
 {id:'a1-gold-l9',title:'Environment & Climate',task:'Write a short weather update and say whether you like the weather.',min:20,max:35,writing:"It is sunny but windy in Borama today. I like cool weather. I don't like very hot weather.",turns:['It hot today. I not like hot weather. What weather like?',"It is sunny but windy. I don't like hot weather. What's the weather like?"]},
 {id:'a1-gold-l10',title:'Relationships & Family',task:'Introduce a real or fictional person with relationship, place, work or study, and interest.',min:30,max:50,writing:'This is my sister Amina. She lives in Borama. She is a teacher at a school. She likes reading and music. Her favourite music is Somali music.',turns:['This is my sister. She live Borama. He name is Ali. Where does she lives?','This is my sister. She lives in Borama. She is a nurse. She likes reading. What does your sister do?']},
 {id:'a1-gold-l11',title:'Media & News',task:'Write a media-habit post with activity, source or device, and time.',min:30,max:50,writing:'I watch English videos on my phone in the evening. I read news online in the morning. I also listen to the radio at home after work.',turns:['I listen radio. I watch videos in my phone. I read news at morning. What do you watch?','I watch English videos on my phone in the evening. The football game is Saturday at four and tickets are two dollars. What do you watch?']},
 {id:'a1-gold-l12',title:'Sports & Fitness',task:'Write a fitness update with activity, frequency, and one free day or time.',min:30,max:50,writing:'I often walk after work. I exercise three times a week and go to the gym twice a week. I am usually free on Saturday morning.',turns:['I exercise two time a week. You free Saturday?','I walk after work and exercise twice a week. Are you free on Saturday? What time are you free? Let us meet at nine and walk together.']},
 {id:'a1-gold-l13',title:'City & Countryside',task:'Write a directions message with two places and simple location phrases.',min:30,max:50,writing:'There is a bank next to the market. There is a pharmacy opposite the school and near the hospital. The bus station is near the town centre.',turns:['There are a bank near here. Where the bank is? Bank next market.','There is a bank next to the market. Where is the pharmacy? Is there a hospital near here? The pharmacy is opposite the school.']},
 {id:'a1-gold-l14',title:'Dreams & Ambitions',task:'Write one goal, one next action, and one reason using because.',min:35,max:55,writing:'My goal is to improve my English for work. I am going to study every evening and speak with a partner twice a week because I need English for my career.',turns:['I want improve my English. I am going to studying every day. I learn English because for work.','I want to improve my English. I am going to study every day because I need it for work. What is your goal?']},
 {id:'a1-gold-l15',title:'Crime & Safety',task:'Write a safe lost-item notice with item, description, last known place, and contact method.',min:30,max:50,writing:'My black phone is missing. I last had it at the bus station. My name is Ali. Please contact me through the Help Desk. Do not ask for my password.',turns:['I lose my phone yesterday. My bag missing. You can help me?','I lost my black phone. It was at the bus station. I have a problem. Can you help me, please?']},
 {id:'a1-gold-l16',title:'Science & Everyday Life',task:'Write safe process instructions using first, next or then, and finally.',min:35,max:60,writing:'First, turn on your phone. Next, open the EnglishGate app. Then, choose your class and press Join. Finally, wait for the class page and check the lesson name.',turns:['First, turning on the phone. Finally after open app. What next?','First, turn on the phone. Next, open the app. What comes next? What is the missing step? Finally, wait for the class page.']},
 {id:'a1-gold-l17',title:'Arts & Entertainment',task:'Write a short entertainment recommendation with an opinion and reason.',min:35,max:55,writing:'I like live music because it is interesting and free. My favourite option is the evening music event. I do not choose the comedy because it is full.',turns:['I like film because funny. Why you like it? It full. Choose other.','I prefer live music because it is free. Why do you like Blue Road? Funny Family is full, so let us choose another. I choose live music. Good idea.']}
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

  const grade=await req('/api/writing-grade',{method:'POST',body:{lessonId:test.id,task:test.task,level:'A1',minWords:test.min,maxWords:test.max,text:test.writing}});
  must(grade.status===200&&Number.isInteger(Number(grade.data?.score)),label+' Jev writing grade',`HTTP ${grade.status} score=${grade.data?.score??'—'}`);
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
  must(finish.data?.jevStatus==='pass'&&finish.data?.masteryState==='MASTERED',label+' Jev speaking decision',finish.data?.masteryState||finish.data?.jevStatus||'missing');

  const repairs=finish.data?.repairs||[];
  must(repairs.length>=1,label+' Fix & Improve detection',`repairs=${repairs.length}`);
  const fix=await req('/api/a1-gold/fix-retry',{method:'POST',body:{id:repairs[0].id,retry:repairs[0].model}});
  must(fix.status===200&&fix.data?.resolved===true,label+' Fix & Improve retry','resolved=true');

  const report=await req('/api/a1-gold/report/'+encodeURIComponent(studentId)+'/'+encodeURIComponent(test.id));
  const rs=report.data?.workbookActivityStates||[],ra=report.data?.workbookActivityAttempts||[],reportHasRL=['reading','listening'].every(type=>rs.some(x=>x.activity_type===type)&&ra.some(x=>x.activity_type===type));
  must(report.status===200&&(report.data?.speaking||[]).length>0&&(report.data?.fixes||[]).length>0&&(report.data?.attempts||[]).length>0&&report.data?.writing&&reportHasRL,label+' 360 report',`speaking=${report.data?.speaking?.length||0} RL=${reportHasRL}`);
 }

 const audio=await req('/api/audio',{method:'POST',body:{lessonId:'a1-gold-l17',text:'Sahra: What do you want to watch? Yusuf: I like Funny Family because it is funny. Sahra: It is full. Yusuf: Okay. Let us choose another.',speakers:[{name:'Sahra',gender:'female',voice:'nova'},{name:'Yusuf',gender:'male',voice:'onyx'}]}});
 if(audio.status===200)record('Lessons 1-17 natural dialogue audio','PASS','HTTP 200');
 else{
  const ttsLines=childLogs.split(/\n/).filter(line=>/TTS request error|OpenAI TTS|audio\/speech|billing_not_active|insufficient_quota|model|voice/i.test(line)).slice(-8).join(' | ').replace(/Bearer\s+[A-Za-z0-9._-]+/gi,'Bearer [redacted]').slice(0,1200);
  record('Lessons 1-17 natural dialogue audio','FAIL','HTTP '+audio.status+' '+(ttsLines||'no upstream detail captured'));
 }

 const logout=await req('/api/auth/logout',{method:'POST',body:{}});must(logout.status===200&&logout.data?.ok,'logout','HTTP '+logout.status);
 const failed=results.filter(x=>x.status==='FAIL');
 console.log(`A1 LESSONS 1-17 RUNTIME QA: ${results.filter(x=>x.status==='PASS').length} PASS, ${failed.length} FAIL`);
 process.exitCode=failed.length?1:0;
}catch(e){console.error('A1 Lessons 1-17 runtime QA error:',e.message);const tail=childLogs.split(/\n/).slice(-100).join('\n').replace(/Bearer\s+[A-Za-z0-9._-]+/gi,'Bearer [redacted]');if(tail)console.error('A1 preview child startup tail:\n'+tail);process.exitCode=1}
finally{cleanup(child)}
