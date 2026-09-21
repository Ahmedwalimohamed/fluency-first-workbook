const express=require('express');
const jwt=require('jsonwebtoken');
const crypto=require('crypto');
const {Pool}=require('pg');
const {runLiveTaskGraph,normalizeType,CHOICE_TYPES,TEXT_TYPES,SPEAKING_TYPES}=require('./live-task-generation-graph.js');

const inheritedGet=express.application.get;
const inheritedPost=express.application.post;
const inheritedPatch=express.application.patch;
const installed=new WeakSet();
const pool=new Pool({connectionString:process.env.DATABASE_URL});
let schemaPromise=null;
const liveTaskPresence=new Map();
const liveTaskIntelligenceCache=new Map();
const TYPE_SAFE_LIVE_URL=process.env.TYPESAFE_API_URL||'https://api.typesafe.ai/v1/systemone';
const TYPE_SAFE_LIVE_MODEL=process.env.TYPESAFE_MODEL||'jev-latest';
const LIVE_INTELLIGENCE_VERSION='live-task-jev-v1';
const LIVE_TASK_ACTIVE_MS=15000;
function touchLiveTaskPresence(taskId,studentId){
  const id=String(taskId||'');if(!id||!studentId)return;
  let map=liveTaskPresence.get(id);if(!map){map=new Map();liveTaskPresence.set(id,map)}
  map.set(String(studentId),Date.now());
}
function activeLiveTaskStudents(taskId){
  const now=Date.now(),map=liveTaskPresence.get(String(taskId||'')),active=new Set();
  if(!map)return active;
  for(const [studentId,lastSeen] of map){if(now-lastSeen<=LIVE_TASK_ACTIVE_MS)active.add(studentId);else map.delete(studentId)}
  if(!map.size)liveTaskPresence.delete(String(taskId||''));
  return active;
}

const MCQ_BANK={
  'going to':{aliases:['going to','be going to','future plans'],title:'Going to: Future Plans',tip:'Use am/is/are + going to + the base form of the verb.',questions:[
    {q:'Choose the correct sentence about a future plan.',options:['I am going to visit my aunt tomorrow.','I going to visit my aunt tomorrow.','I am go to visit my aunt tomorrow.'],answer:0,explanation:'Use am + going to + base verb: am going to visit.'},
    {q:'Complete: She ___ going to study tonight.',options:['is','are','am'],answer:0,explanation:'With she, use is: She is going to study.'},
    {q:'Choose the correct negative sentence.',options:['They are not going to travel this week.','They not going to travel this week.','They are going not to travel this week.'],answer:0,explanation:'Put not after am/is/are: are not going to.'},
    {q:'Complete the question: ___ you going to cook dinner?',options:['Are','Do','Is'],answer:0,explanation:'With you, start the question with Are.'},
    {q:'Choose the best answer: What are you going to do this weekend?',options:['I am going to visit my family.','I going visit my family.','I visited my family tomorrow.'],answer:0,explanation:'A future plan uses am going to + base verb.'},
    {q:'Complete: Ahmed and Ali ___ going to play football.',options:['are','is','am'],answer:0,explanation:'A plural subject takes are.'},
    {q:'Which sentence is about a plan already decided?',options:['We are going to start a new course next month.','We started a new course yesterday.','We start a new course every Monday.'],answer:0,explanation:'Going to is commonly used for future plans and intentions.'},
    {q:'Choose the correct question.',options:['Is she going to apply for the job?','Does she going to apply for the job?','Is she go to apply for the job?'],answer:0,explanation:'Use Is + subject + going to + base verb.'},
    {q:'Complete: I ___ going to buy a new notebook.',options:['am','is','are'],answer:0,explanation:'With I, use am.'},
    {q:'Choose the correct short answer: Are they going to come?',options:['Yes, they are.','Yes, they do.','Yes, they is.'],answer:0,explanation:'The auxiliary in the question is are, so the short answer is Yes, they are.'}
  ]},
  'present simple':{aliases:['present simple','simple present','daily routine','routines'],title:'Present Simple: Routines',tip:'Use the base verb with I/you/we/they and add -s/-es with he/she/it.',questions:[
    {q:'Choose the correct sentence.',options:['She works in a bank.','She work in a bank.','She working in a bank.'],answer:0,explanation:'With she in the present simple, work becomes works.'},
    {q:'Complete: I ___ English every day.',options:['study','studies','studying'],answer:0,explanation:'With I, use the base form study.'},
    {q:'Choose the correct negative.',options:['He does not drive to work.','He do not drives to work.','He not drive to work.'],answer:0,explanation:'Use does not + base verb with he/she/it.'},
    {q:'Choose the correct question.',options:['Do they live in Borama?','Does they live in Borama?','Do they lives in Borama?'],answer:0,explanation:'With they, use Do + base verb.'},
    {q:'Complete: My teacher ___ the lesson at 8:00.',options:['starts','start','starting'],answer:0,explanation:'My teacher is singular, so add -s.'},
    {q:'Which sentence describes a routine?',options:['I usually walk to work.','I am walking to work right now.','I walked to work yesterday.'],answer:0,explanation:'Usually signals a repeated routine.'}
  ]},
  'past simple':{aliases:['past simple','simple past','yesterday','last weekend'],title:'Past Simple: Finished Actions',tip:'Use the past form for finished actions in the past.',questions:[
    {q:'Choose the correct sentence.',options:['We visited Hargeisa last week.','We visit Hargeisa last week.','We are visiting Hargeisa last week.'],answer:0,explanation:'A finished past time uses the past form visited.'},
    {q:'Complete: She ___ the report yesterday.',options:['finished','finish','finishes'],answer:0,explanation:'Yesterday requires the past form finished.'},
    {q:'Choose the correct negative.',options:['I did not see him.','I did not saw him.','I not saw him.'],answer:0,explanation:'After did not, use the base verb see.'},
    {q:'Choose the correct question.',options:['Did you call the client?','Did you called the client?','Do you called the client?'],answer:0,explanation:'Use Did + subject + base verb.'},
    {q:'Complete: They ___ home at 6 p.m.',options:['went','go','goed'],answer:0,explanation:'The past form of go is went.'},
    {q:'Which sentence is in the past simple?',options:['He bought a new phone yesterday.','He buys a new phone every year.','He is buying a new phone now.'],answer:0,explanation:'Bought is the past form of buy.'}
  ]},
  'present continuous':{aliases:['present continuous','continuous','right now','now'],title:'Present Continuous: Now',tip:'Use am/is/are + verb-ing for actions happening now.',questions:[
    {q:'Choose the correct sentence.',options:['I am reading now.','I reading now.','I am read now.'],answer:0,explanation:'Use am + verb-ing: am reading.'},
    {q:'Complete: They ___ working at the moment.',options:['are','is','am'],answer:0,explanation:'With they, use are.'},
    {q:'Choose the correct negative.',options:['She is not sleeping.','She not is sleeping.','She does not sleeping.'],answer:0,explanation:'Put not after is: is not sleeping.'},
    {q:'Choose the correct question.',options:['Are you listening?','Do you listening?','Is you listening?'],answer:0,explanation:'With you, use Are + subject + verb-ing.'},
    {q:'Which sentence describes something happening now?',options:['The students are taking a test.','The students take a test every Friday.','The students took a test yesterday.'],answer:0,explanation:'Are taking shows an action happening now.'}
  ]},
  comparatives:{aliases:['comparative','comparatives','bigger than','more than'],title:'Comparatives',tip:'Use -er for many short adjectives and more for many longer adjectives, usually followed by than.',questions:[
    {q:'Complete: A car is usually ___ than a bicycle.',options:['faster','fastest','more fast'],answer:0,explanation:'Fast is a short adjective, so use faster.'},
    {q:'Choose the correct sentence.',options:['This book is more interesting than that one.','This book is interestinger than that one.','This book is most interesting than that one.'],answer:0,explanation:'Use more interesting + than.'},
    {q:'Complete: My new office is ___ than my old office.',options:['bigger','more big','biggest'],answer:0,explanation:'Big doubles the final consonant: bigger.'},
    {q:'Choose the correct comparative of good.',options:['better','gooder','more good'],answer:0,explanation:'Good has the irregular comparative better.'},
    {q:'Complete: Today is ___ than yesterday.',options:['hotter','more hot','hottest'],answer:0,explanation:'Hot becomes hotter.'}
  ]}
};

function sessionUser(req){try{return jwt.verify(req.cookies?.ff_session||'',process.env.JWT_SECRET)}catch{return null}}
function liveScopedUser(req,scope){
  try{
    const raw=String(req.headers?.['x-live-task-token']||'').trim();
    if(!raw)return null;
    const p=jwt.verify(raw,process.env.JWT_SECRET);
    return p?.scope===scope?p:null;
  }catch{return null}
}
function signTeacherLiveToken(teacherId,classId,taskId){
  return jwt.sign({scope:'live-task-teacher',teacherId:String(teacherId),classId:String(classId),taskId:String(taskId)},process.env.JWT_SECRET,{expiresIn:'8h'});
}
function signStudentLiveToken(studentId){
  return jwt.sign({scope:'live-task-student',studentId:String(studentId)},process.env.JWT_SECRET,{expiresIn:'8h'});
}
function teacherLiveAuth(req,{classId=null,taskId=null}={}){
  const t=liveScopedUser(req,'live-task-teacher');
  if(t?.teacherId){
    const classOk=!classId||String(t.classId)===String(classId);
    const taskOk=!taskId||String(t.taskId)===String(taskId);
    if(classOk&&taskOk)return {teacherId:String(t.teacherId),token:t};
  }
  const u=sessionUser(req);
  if(u?.role==='teacher')return {teacherId:String(u.id),cookie:true};
  return null;
}
function studentLiveAuth(req){
  const u=sessionUser(req);
  if(u?.role==='student')return {studentId:String(u.id),cookie:true};
  const t=liveScopedUser(req,'live-task-student');
  return t?.studentId?{studentId:String(t.studentId),token:t}:null;
}
function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
function cleanText(v,max=500){return String(v??'').trim().replace(/\s+/g,' ').slice(0,max)}
function ensureSchema(){if(!schemaPromise){schemaPromise=(async()=>{
  await pool.query(`create table if not exists live_tasks(id text primary key,class_id text not null references classes(id) on delete cascade,teacher_id text not null references users(id) on delete cascade,title text not null,task_type text not null check(task_type in ('mcq','writing')),request_text text not null default '',duration_seconds int not null check(duration_seconds between 60 and 3600),content jsonb not null default '{}'::jsonb,status text not null default 'live' check(status in ('live','closed')),starts_at timestamptz not null default now(),ends_at timestamptz not null,created_at timestamptz not null default now())`);
  await pool.query(`create table if not exists live_task_submissions(task_id text not null references live_tasks(id) on delete cascade,student_id text not null references users(id) on delete cascade,answers jsonb not null default '{}'::jsonb,score int check(score between 0 and 100),correct_count int,total_count int,timed_out boolean not null default false,submitted_at timestamptz not null default now(),primary key(task_id,student_id))`);
  await pool.query('alter table live_tasks drop constraint if exists live_tasks_task_type_check');
  await pool.query("alter table live_tasks add constraint live_tasks_task_type_check check(task_type in ('mcq','writing','activity'))");
  await pool.query('create index if not exists live_tasks_class_status_idx on live_tasks(class_id,status,ends_at desc)');
})().catch(e=>{schemaPromise=null;throw e})}return schemaPromise}
function findBank(request){const text=String(request||'').toLowerCase();for(const [key,entry] of Object.entries(MCQ_BANK))if(entry.aliases.some(a=>text.includes(a)))return {key,entry};return null}
function parseCount(request){const m=String(request||'').match(/\b(\d{1,2})\s*(?:mcq|mcqs|multiple[- ]?choice|questions?)\b/i);return clamp(Number(m?.[1]||5),1,10)}
function parseMinutes(request,fallback){const m=String(request||'').match(/\b(\d{1,2})\s*(?:minutes?|mins?|min)\b/i);return clamp(Number(m?.[1]||fallback),1,60)}
function titleCase(s){return String(s||'').replace(/\b\w/g,c=>c.toUpperCase())}
function extractTopic(request){
  let raw=cleanText(request,300).replace(/(?:[,.!?]?\s*)\b\d{1,2}\s*(?:minutes?|mins?|min)\b[.!?]*/ig,'').trim();
  raw=raw.replace(/[.!?]+$/,'').trim();
  const m=raw.match(/(?:about|on)\s+(.+)$/i)||raw.match(/writing\s+task\s*[:\-]?\s*(.+)$/i);
  return cleanText(m?.[1]||'this topic',80);
}
function prepareTask(request){
  const text=cleanText(request,500);if(!text)throw Object.assign(new Error('Type what you want the students to do.'),{status:400});
  const wantsWriting=/\b(write|writing|paragraph|essay)\b/i.test(text);
  if(wantsWriting){const topic=extractTopic(text),bank=findBank(text),minutes=parseMinutes(text,7);let instructions=`Write 5–7 clear sentences about ${topic}. Use complete sentences and check your work before submitting.`,minWords=45;if(bank?.key==='going to'){instructions='Write 5–7 sentences about your future plans. Use “going to” at least three times and include at least one negative or question form.';minWords=50}return {taskType:'writing',title:`Writing · ${titleCase(topic)}`.slice(0,100),durationSeconds:minutes*60,content:{instructions,minWords,topic}}}
  const bank=findBank(text);if(!bank)throw Object.assign(new Error('No free MCQ bank matches that topic yet. Try “going to”, “present simple”, “past simple”, “present continuous”, or “comparatives”, or create a writing task on any topic.'),{status:422});
  const count=Math.min(parseCount(text),bank.entry.questions.length),minutes=parseMinutes(text,5),questions=bank.entry.questions.slice(0,count).map((q,i)=>({id:`q${i+1}`,...q}));return {taskType:'mcq',title:bank.entry.title,durationSeconds:minutes*60,content:{topic:bank.key,tip:bank.entry.tip,questions}};
}
function sanitizeLaunchQuestion(raw,i){
  const type=normalizeType(raw?.type,raw?.options?'multiple_choice':'short_answer'),prompt=cleanText(raw?.prompt||raw?.q,400);
  if(prompt.length<3)throw Object.assign(new Error(`Question ${i+1} needs a prompt.`),{status:400});
  const base={id:`q${i+1}`,type,prompt,explanation:cleanText(raw?.explanation,500)};
  if(CHOICE_TYPES.has(type)){
    const options=type==='true_false'?['True','False']:(Array.isArray(raw?.options)?raw.options.slice(0,4).map(x=>cleanText(x,220)).filter(Boolean):[]);
    const answer=Number(raw?.answer);
    if(options.length<2||!Number.isInteger(answer)||answer<0||answer>=options.length)throw Object.assign(new Error(`Check question ${i+1} and its correct answer.`),{status:400});
    return {...base,options,answer};
  }
  if(TEXT_TYPES.has(type)){
    const acceptedAnswers=Array.isArray(raw?.acceptedAnswers)?raw.acceptedAnswers.slice(0,8).map(x=>cleanText(x,300)).filter(Boolean):[];
    return {...base,acceptedAnswers};
  }
  if(type==='matching'){
    const pairs=(Array.isArray(raw?.pairs)?raw.pairs:[]).slice(0,8).map(p=>({left:cleanText(p?.left,220),right:cleanText(p?.right,220)})).filter(p=>p.left&&p.right);
    if(pairs.length<2)throw Object.assign(new Error(`Question ${i+1} needs at least two matching pairs.`),{status:400});
    return {...base,pairs};
  }
  if(type==='ordering'){
    const items=Array.isArray(raw?.items)?raw.items.slice(0,8).map(x=>cleanText(x,220)).filter(Boolean):[];
    const correctOrder=Array.isArray(raw?.correctOrder)?raw.correctOrder.slice(0,8).map(x=>cleanText(x,220)).filter(Boolean):[];
    if(items.length<2||correctOrder.length!==items.length||!correctOrder.every(x=>items.includes(x)))throw Object.assign(new Error(`Check the ordering answer for question ${i+1}.`),{status:400});
    return {...base,items,correctOrder};
  }
  if(SPEAKING_TYPES.has(type)){
    const successCriteria=Array.isArray(raw?.successCriteria)?raw.successCriteria.slice(0,6).map(x=>cleanText(x,220)).filter(Boolean):[];
    return {...base,successCriteria:successCriteria.length?successCriteria:['Completes the speaking task','Uses the target language']};
  }
  throw Object.assign(new Error(`Unsupported activity type in question ${i+1}.`),{status:400});
}
function validateLaunch(body){
  let taskType=String(body?.taskType||''),title=cleanText(body?.title,100),durationSeconds=clamp(Number(body?.durationSeconds)||300,60,3600),requestText=cleanText(body?.requestText,800),content=body?.content;
  if(taskType==='mcq')taskType='activity';
  if(!['activity','writing'].includes(taskType)||title.length<2||!content||typeof content!=='object')throw Object.assign(new Error('Invalid live task.'),{status:400});
  if(taskType==='writing'){
    const instructions=cleanText(content.instructions,1600),minWords=clamp(Number(content.minWords)||40,1,500);
    if(instructions.length<5)throw Object.assign(new Error('Add writing instructions.'),{status:400});
    return {taskType,title,durationSeconds,requestText,content:{topic:cleanText(content.topic,120),instructions,minWords}};
  }
  const qs=Array.isArray(content.questions)?content.questions.slice(0,10):[];
  if(!qs.length)throw Object.assign(new Error('Add at least one activity question.'),{status:400});
  const questions=qs.map((raw,i)=>sanitizeLaunchQuestion(raw,i));
  return {taskType,title,durationSeconds,requestText,content:{topic:cleanText(content.topic,120),tip:cleanText(content.tip,400),questions}};
}
async function ownedApprovedClass(classId,teacherId){return (await pool.query('select id,name,level,course_id,approval_status from classes where id=$1 and teacher_id=$2',[classId,teacherId])).rows[0]||null}
function safeQuestionForStudent(q){
  const common={id:q.id,type:q.type||'multiple_choice',prompt:q.prompt||q.q||'',explanation:''};
  if(CHOICE_TYPES.has(common.type))return {...common,options:Array.isArray(q.options)?q.options:[]};
  if(TEXT_TYPES.has(common.type))return common;
  if(common.type==='matching'){
    const pairs=Array.isArray(q.pairs)?q.pairs:[];
    return {...common,leftItems:pairs.map(p=>p.left),rightOptions:pairs.map(p=>p.right).reverse()};
  }
  if(common.type==='ordering')return {...common,items:Array.isArray(q.items)?q.items:[]};
  if(SPEAKING_TYPES.has(common.type))return {...common,successCriteria:Array.isArray(q.successCriteria)?q.successCriteria:[]};
  return common;
}
function publicTask(row,includeAnswers=false){
  const content=row.content||{};let safeContent;
  if(row.task_type==='writing'){
    safeContent={topic:content.topic||'',instructions:content.instructions||'',minWords:content.minWords||0};
  }else{
    const legacy=row.task_type==='mcq';
    const questions=(content.questions||[]).map((q,i)=>{
      const normalized=legacy?{id:q.id||`q${i+1}`,type:'multiple_choice',prompt:q.prompt||q.q,options:q.options,answer:q.answer,explanation:q.explanation}:q;
      return includeAnswers?normalized:safeQuestionForStudent(normalized);
    });
    safeContent={topic:content.topic||'',tip:content.tip||'',questions};
  }
  return {id:row.id,classId:row.class_id,className:row.class_name||'',title:row.title,taskType:row.task_type==='mcq'?'activity':row.task_type,durationSeconds:row.duration_seconds,status:row.status,startsAt:row.starts_at,endsAt:row.ends_at,content:safeContent};
}
function normAnswer(v){return cleanText(v,500).toLowerCase().replace(/[’‘]/g,"'").replace(/[^\p{L}\p{N}'\s]/gu,'').replace(/\s+/g,' ').trim()}
function answerPresent(v){if(v===null||v===undefined)return false;if(Array.isArray(v))return v.length>0;if(typeof v==='object')return Object.keys(v).length>0;return String(v).trim().length>0}
function gradeQuestion(q,raw){
  const type=q.type||'multiple_choice';
  if(CHOICE_TYPES.has(type)){
    const selected=Number(raw),answer=Number(q.answer),answered=Number.isInteger(selected),correct=answered&&selected===answer;
    return {gradable:true,answered,correct,selected,answer};
  }
  if(TEXT_TYPES.has(type)){
    const accepted=Array.isArray(q.acceptedAnswers)?q.acceptedAnswers.map(normAnswer).filter(Boolean):[];
    const given=normAnswer(raw);
    if(!accepted.length)return {gradable:false,answered:Boolean(given),correct:null};
    return {gradable:true,answered:Boolean(given),correct:Boolean(given)&&accepted.includes(given)};
  }
  if(type==='matching'){
    const pairs=Array.isArray(q.pairs)?q.pairs:[],obj=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
    const answered=pairs.some(p=>String(obj[p.left]??'').trim());
    const correct=answered&&pairs.every(p=>String(obj[p.left]??'')===String(p.right));
    return {gradable:true,answered,correct};
  }
  if(type==='ordering'){
    const given=Array.isArray(raw)?raw.map(String):[],correctOrder=Array.isArray(q.correctOrder)?q.correctOrder.map(String):[];
    const answered=given.length>0,correct=answered&&given.length===correctOrder.length&&given.every((x,i)=>x===correctOrder[i]);
    return {gradable:true,answered,correct};
  }
  if(SPEAKING_TYPES.has(type))return {gradable:false,answered:answerPresent(raw),correct:null};
  return {gradable:false,answered:answerPresent(raw),correct:null};
}
function gradeActivity(taskContent,answers){
  const qs=Array.isArray(taskContent?.questions)?taskContent.questions:[];
  let correct=0,graded=0,answered=0;
  const detail=qs.map(q=>{
    const g=gradeQuestion(q,answers?.[q.id]);
    if(g.answered)answered++;
    if(g.gradable){graded++;if(g.correct)correct++}
    return {id:q.id,type:q.type,answered:g.answered,gradable:g.gradable,correct:g.correct};
  });
  return {correct,total:graded,answered,score:graded?Math.round(correct*100/graded):null,detail};
}

function jevChoice(data,id,allowed){
  const a=data?.answers?.[id],choice=String(a?.choice||'').toLowerCase();
  if(!allowed.includes(choice))return null;
  const confidence=Number(a?.probabilities?.[choice]??a?.confidence);
  return {choice,confidence:Number.isFinite(confidence)&&confidence>=0&&confidence<=1?confidence:null};
}
function deterministicClassroomDecision(rosterCount,subs,avg){
  const submittedCount=subs.length,responseRate=rosterCount?submittedCount/rosterCount:0;
  let understanding='insufficient',nextAction='wait';
  if(submittedCount>=2&&avg!==null&&avg!==undefined){
    if(avg>=80)understanding='strong';
    else if(avg>=60)understanding='mixed';
    else understanding='weak';
  }
  if(responseRate<0.5)nextAction='wait';
  else if(avg===null||avg===undefined)nextAction='check_again';
  else if(avg<60)nextAction='reteach';
  else if(avg<80)nextAction='check_again';
  else nextAction='continue';
  return {source:'rules',understanding,nextAction,confidence:null,responseRate:Math.round(responseRate*100),version:LIVE_INTELLIGENCE_VERSION};
}
async function classroomIntelligence(task,rosterCount,subs,avg,questionStats){
  const fallback=deterministicClassroomDecision(rosterCount,subs,avg);
  const apiKey=String(process.env.TYPESAFE_API_KEY||'').trim();
  if(!apiKey||!subs.length)return {...fallback,jevAvailable:Boolean(apiKey)};
  const snapshot=JSON.stringify({
    taskId:task.id,submitted:subs.length,avg,
    stats:(questionStats||[]).map(x=>[x.id,x.answered,x.correctPct])
  });
  const cached=liveTaskIntelligenceCache.get(snapshot);
  if(cached)return cached;
  const state={
    task:'EnglishGate live classroom teaching decision',
    taskType:task.task_type,
    title:cleanText(task.title,120),
    topic:cleanText(task.content?.topic,120),
    rosterCount,
    submittedCount:subs.length,
    responseRate:rosterCount?Math.round(subs.length*100/rosterCount):0,
    averageAutoGradedScore:avg,
    questionEvidence:(questionStats||[]).map(x=>({id:x.id,type:x.type,answered:x.answered,graded:x.graded,correctPct:x.correctPct})),
    rules:[
      'Use only the aggregated class evidence provided.',
      'Do not infer anything about named learners because no learner identity is provided.',
      'Prefer wait when too few learners have responded.',
      'Prefer reteach when there is broad evidence of misunderstanding.',
      'Prefer check_again when understanding is mixed or evidence is inconclusive.',
      'Prefer continue only when the evidence is sufficiently strong.',
      'This is advisory. The teacher remains in control.'
    ]
  };
  const questions={
    understanding:{type:'choice',instructions:'Classify the current class understanding from the evidence.',criteria:{
      strong:'Most available evidence shows the class is succeeding and there is enough participation to trust the signal.',
      mixed:'The evidence shows a meaningful mix of success and difficulty.',
      weak:'The available evidence shows broad misunderstanding or low success.',
      insufficient:'There is not enough evidence yet to judge class understanding.'
    }},
    next_action:{type:'choice',instructions:'Choose the safest next teaching action from the current evidence.',criteria:{
      continue:'Enough learners have responded and the evidence is strong enough to move forward.',
      reteach:'The class evidence indicates a broad misunderstanding that merits another explanation or model.',
      check_again:'Understanding is mixed, open-ended, or uncertain, so another quick check is the safest next step.',
      wait:'Too few learners have responded or learners still need time before judging.'
    }}
  };
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),2500);
  try{
    const r=await fetch(TYPE_SAFE_LIVE_URL,{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({state,model:TYPE_SAFE_LIVE_MODEL,questions}),signal:controller.signal});
    if(!r.ok)throw new Error('Jev '+r.status);
    const data=await r.json();
    const u=jevChoice(data,'understanding',['strong','mixed','weak','insufficient']);
    const a=jevChoice(data,'next_action',['continue','reteach','check_again','wait']);
    if(!u||!a)throw new Error('Incomplete Jev live-task decision');
    const result={
      source:'jev',jevAvailable:true,understanding:u.choice,nextAction:a.choice,
      confidence:a.confidence??u.confidence??null,responseRate:fallback.responseRate,
      model:String(data?.model||TYPE_SAFE_LIVE_MODEL),version:LIVE_INTELLIGENCE_VERSION
    };
    liveTaskIntelligenceCache.set(snapshot,result);
    if(liveTaskIntelligenceCache.size>300)liveTaskIntelligenceCache.delete(liveTaskIntelligenceCache.keys().next().value);
    return result;
  }catch{
    const result={...fallback,jevAvailable:true};
    liveTaskIntelligenceCache.set(snapshot,result);
    if(liveTaskIntelligenceCache.size>300)liveTaskIntelligenceCache.delete(liveTaskIntelligenceCache.keys().next().value);
    return result;
  }finally{clearTimeout(timeout)}
}

function install(app){
  if(installed.has(app))return;installed.add(app);
  inheritedPost.call(app,'/api/teacher/live-tasks/prepare',async(req,res)=>{
    try{
      await ensureSchema();
      const classId=cleanText(req.body?.classId,100),auth=teacherLiveAuth(req,{classId});
      if(!auth)return res.status(403).json({error:'Teacher access required.'});
      const c=await ownedApprovedClass(classId,auth.teacherId);
      if(!c)return res.status(404).json({error:'Class not found.'});
      if(c.approval_status!=='approved')return res.status(409).json({error:'The class must be approved before you can launch a live task.'});
      const task=await runLiveTaskGraph({request:req.body?.request,classInfo:c,lessonContext:req.body?.lessonContext});
      res.set('Cache-Control','no-store');
      res.json({ok:true,class:{id:c.id,name:c.name},teacherLiveToken:signTeacherLiveToken(auth.teacherId,classId,''),...task});
    }catch(e){console.error('live task prepare error',e);res.status(e.status||500).json({error:e.status?e.message:'The live task could not be prepared.'})}
  });
  inheritedPost.call(app,'/api/teacher/live-tasks',async(req,res)=>{
    try{
      await ensureSchema();
      const classId=cleanText(req.body?.classId,100),auth=teacherLiveAuth(req,{classId});
      if(!auth)return res.status(403).json({error:'Teacher access required.'});
      const c=await ownedApprovedClass(classId,auth.teacherId);
      if(!c)return res.status(404).json({error:'Class not found.'});
      if(c.approval_status!=='approved')return res.status(409).json({error:'The class must be approved before you can launch a live task.'});
      const task=validateLaunch(req.body),client=await pool.connect();
      try{
        await client.query('begin');
        await client.query("update live_tasks set status='closed',ends_at=least(ends_at,now()) where class_id=$1 and status='live'",[classId]);
        const id='lt_'+crypto.randomUUID(),q=await client.query(`insert into live_tasks(id,class_id,teacher_id,title,task_type,request_text,duration_seconds,content,status,starts_at,ends_at) values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,'live',now(),now()+($7::int*interval '1 second')) returning *`,[id,classId,auth.teacherId,task.title,task.taskType,task.requestText,task.durationSeconds,JSON.stringify(task.content)]);
        await client.query('commit');
        res.status(201).json({ok:true,task:publicTask({...q.rows[0],class_name:c.name},true),teacherLiveToken:signTeacherLiveToken(auth.teacherId,classId,q.rows[0].id),serverNow:new Date().toISOString()});
      }catch(e){await client.query('rollback');throw e}finally{client.release()}
    }catch(e){console.error('live task launch error',e);res.status(e.status||500).json({error:e.status?e.message:'The live task could not be launched.'})}
  });
  inheritedGet.call(app,'/api/teacher/live-tasks/current',async(req,res)=>{
    try{
      await ensureSchema();
      const classId=cleanText(req.query?.classId,100),auth=teacherLiveAuth(req,{classId});
      if(!auth)return res.status(403).json({error:'Teacher access required.'});
      const c=await ownedApprovedClass(classId,auth.teacherId);
      if(!c)return res.status(404).json({error:'Class not found.'});
      const active=await pool.query(`select lt.*,c.name as class_name from live_tasks lt join classes c on c.id=lt.class_id where lt.class_id=$1 and lt.teacher_id=$2 and lt.status='live' and lt.ends_at>now() order by lt.starts_at desc limit 1`,[classId,auth.teacherId]);
      let recent=null,row=active.rows[0]||null;
      if(!row){
        const recentQ=await pool.query(`select lt.*,c.name as class_name from live_tasks lt join classes c on c.id=lt.class_id where lt.class_id=$1 and lt.teacher_id=$2 and lt.starts_at>now()-interval '24 hours' and exists(select 1 from live_task_submissions s where s.task_id=lt.id) order by lt.starts_at desc limit 1`,[classId,auth.teacherId]);
        if(recentQ.rowCount){row=recentQ.rows[0];recent=publicTask(row,true)}
      }
      res.set('Cache-Control','no-store');
      res.json({task:active.rowCount?publicTask(active.rows[0],true):null,recentTask:recent,teacherLiveToken:signTeacherLiveToken(auth.teacherId,classId,row?.id||''),serverNow:new Date().toISOString()});
    }catch(e){console.error('current live task error',e);res.status(500).json({error:'Live task status is temporarily unavailable.'})}
  });
  inheritedGet.call(app,'/api/teacher/live-tasks/:id/results',async(req,res)=>{
    const auth=teacherLiveAuth(req,{taskId:req.params.id});if(!auth)return res.status(403).json({error:'Teacher access required.'});
    try{
      await ensureSchema();
      const taskQ=await pool.query(`select lt.*,c.name as class_name from live_tasks lt join classes c on c.id=lt.class_id where lt.id=$1 and lt.teacher_id=$2`,[req.params.id,auth.teacherId]);
      if(!taskQ.rowCount)return res.status(404).json({error:'Live task not found.'});
      const task=taskQ.rows[0];
      const roster=await pool.query(`select u.id,u.name,u.username from enrollments e join users u on u.id=e.user_id and u.role='student' where e.class_id=$1 order by lower(u.name)`,[task.class_id]);
      const subs=await pool.query(`select s.*,u.name,u.username from live_task_submissions s join users u on u.id=s.student_id where s.task_id=$1 order by s.submitted_at`,[task.id]);
      const scoreRows=subs.rows.filter(x=>x.score!==null&&x.score!==undefined&&Number.isFinite(Number(x.score)));
      const avg=scoreRows.length?Math.round(scoreRows.reduce((a,x)=>a+Number(x.score),0)/scoreRows.length):null;
      let questionStats=[];
      if(task.task_type!=='writing'){
        const questions=(task.content?.questions||[]).map((q,i)=>task.task_type==='mcq'?{id:q.id||`q${i+1}`,type:'multiple_choice',prompt:q.q||q.prompt,options:q.options,answer:q.answer,explanation:q.explanation}:q);
        questionStats=questions.map(q=>{
          let correct=0,answered=0,graded=0;
          const choices=CHOICE_TYPES.has(q.type)?Array.from({length:Array.isArray(q.options)?q.options.length:0},()=>0):[];
          for(const s of subs.rows){
            const raw=s.answers?.[q.id],g=gradeQuestion(q,raw);
            if(g.answered)answered++;
            if(g.gradable){graded++;if(g.correct)correct++}
            if(choices.length&&Number.isInteger(Number(raw))&&Number(raw)>=0&&Number(raw)<choices.length)choices[Number(raw)]++;
          }
          return {id:q.id,type:q.type,prompt:q.prompt||q.q||'',answered,graded,correct,correctPct:graded?Math.round(correct*100/graded):null,choices};
        });
      }
      const active=activeLiveTaskStudents(task.id),submittedById=new Map(subs.rows.map(s=>[String(s.student_id),s]));
      const students=roster.rows.map(st=>{
        const sub=submittedById.get(String(st.id));
        const status=sub?'submitted':active.has(String(st.id))?'working':'waiting';
        let signal=status;
        if(sub){
          const score=sub.score===null||sub.score===undefined?null:Number(sub.score);
          signal=score===null||!Number.isFinite(score)?'review':score>=80?'ready':score>=50?'partial':'needs_help';
        }
        return {
          studentId:st.id,name:st.name,username:st.username,status,signal,
          score:sub?.score??null,timedOut:Boolean(sub?.timed_out),submittedAt:sub?.submitted_at||null
        };
      });
      const classroomDecision=await classroomIntelligence(task,roster.rowCount,subs.rows,avg,questionStats);
      res.set('Cache-Control','no-store');
      res.json({
        ok:true,task:publicTask(task,true),serverNow:new Date().toISOString(),
        rosterCount:roster.rowCount,connectedCount:students.filter(x=>x.status!=='waiting').length,
        workingCount:students.filter(x=>x.status==='working').length,
        submittedCount:subs.rowCount,remainingCount:Math.max(0,roster.rowCount-subs.rowCount),
        readyCount:students.filter(x=>x.signal==='ready').length,
        partialCount:students.filter(x=>x.signal==='partial').length,
        needsHelpCount:students.filter(x=>x.signal==='needs_help').length,
        reviewCount:students.filter(x=>x.signal==='review').length,
        lateCount:subs.rows.filter(x=>x.timed_out).length,averageScore:avg,questionStats,students,classroomDecision,
        submissions:subs.rows.map(s=>({studentId:s.student_id,name:s.name,username:s.username,answers:s.answers,score:s.score,correctCount:s.correct_count,totalCount:s.total_count,timedOut:s.timed_out,submittedAt:s.submitted_at}))
      });
    }catch(e){console.error('live task results error',e);res.status(500).json({error:'Live results are temporarily unavailable.'})}
  });
  inheritedPatch.call(app,'/api/teacher/live-tasks/:id/extend',async(req,res)=>{
    const auth=teacherLiveAuth(req,{taskId:req.params.id});if(!auth)return res.status(403).json({error:'Teacher access required.'});
    try{
      await ensureSchema();
      const minutes=clamp(Number(req.body?.minutes)||0,1,30);
      const q=await pool.query(`update live_tasks lt set ends_at=least(lt.ends_at+($3::int*interval '1 minute'),lt.starts_at+interval '120 minutes'),duration_seconds=extract(epoch from (least(lt.ends_at+($3::int*interval '1 minute'),lt.starts_at+interval '120 minutes')-lt.starts_at))::int from classes c where lt.class_id=c.id and lt.id=$1 and lt.teacher_id=$2 and lt.status='live' and lt.ends_at>now() returning lt.*,c.name as class_name`,[req.params.id,auth.teacherId,minutes]);
      if(!q.rowCount)return res.status(409).json({error:'This live task has already ended or could not be found.'});
      res.set('Cache-Control','no-store');res.json({ok:true,task:publicTask(q.rows[0],true),serverNow:new Date().toISOString()});
    }catch(e){console.error('live task extend error',e);res.status(500).json({error:'The live task time could not be extended.'})}
  });
  inheritedPatch.call(app,'/api/teacher/live-tasks/:id/close',async(req,res)=>{const auth=teacherLiveAuth(req,{taskId:req.params.id});if(!auth)return res.status(403).json({error:'Teacher access required.'});try{await ensureSchema();const q=await pool.query("update live_tasks set status='closed',ends_at=least(ends_at,now()) where id=$1 and teacher_id=$2 returning id",[req.params.id,auth.teacherId]);if(!q.rowCount)return res.status(404).json({error:'Live task not found.'});res.json({ok:true})}catch(e){res.status(500).json({error:'The live task could not be closed.'})}});
  inheritedGet.call(app,'/api/student/live-task/current',async(req,res)=>{
    const auth=studentLiveAuth(req);if(!auth)return res.status(403).json({error:'Student access required.'});
    try{
      await ensureSchema();
      let q=await pool.query(`select lt.*,c.name as class_name from live_tasks lt join classes c on c.id=lt.class_id and c.approval_status='approved' join enrollments e on e.class_id=lt.class_id and e.user_id=$1 where lt.status='live' and lt.starts_at<=now() and lt.ends_at>now() order by lt.starts_at desc limit 1`,[auth.studentId]);
      let task=q.rows[0]||null;
      if(!task){
        q=await pool.query(`select lt.*,c.name as class_name from live_tasks lt join classes c on c.id=lt.class_id and c.approval_status='approved' join enrollments e on e.class_id=lt.class_id and e.user_id=$1 join live_task_submissions s on s.task_id=lt.id and s.student_id=$1 where lt.starts_at>now()-interval '24 hours' order by s.submitted_at desc limit 1`,[auth.studentId]);
        task=q.rows[0]||null;
      }
      if(!task)return res.json({task:null,serverNow:new Date().toISOString()});
      if(task.status==='live'&&new Date(task.ends_at).getTime()>Date.now())touchLiveTaskPresence(task.id,auth.studentId);
      const sub=await pool.query('select * from live_task_submissions where task_id=$1 and student_id=$2',[task.id,auth.studentId]);
      let submission=null;
      if(sub.rowCount){
        const sr=sub.rows[0];
        submission={answers:sr.answers||{},score:sr.score,correctCount:sr.correct_count,totalCount:sr.total_count,timedOut:sr.timed_out,submittedAt:sr.submitted_at};
      }
      res.set('Cache-Control','no-store');res.json({task:publicTask(task,false),submission,studentLiveToken:signStudentLiveToken(auth.studentId),serverNow:new Date().toISOString()});
    }catch(e){console.error('student live task current error',e);res.status(500).json({error:'Live task status is temporarily unavailable.'})}
  });
  inheritedPost.call(app,'/api/student/live-tasks/:id/submit',async(req,res)=>{const auth=studentLiveAuth(req);if(!auth)return res.status(403).json({error:'Student access required.'});try{await ensureSchema();const q=await pool.query(`select lt.*,c.name as class_name,now() as server_now from live_tasks lt join classes c on c.id=lt.class_id and c.approval_status='approved' join enrollments e on e.class_id=lt.class_id and e.user_id=$2 where lt.id=$1`,[req.params.id,auth.studentId]);if(!q.rowCount)return res.status(404).json({error:'Live task not found.'});const task=q.rows[0],existing=await pool.query('select 1 from live_task_submissions where task_id=$1 and student_id=$2',[task.id,auth.studentId]);if(existing.rowCount)return res.status(409).json({error:'You already submitted this live task.'});const now=new Date(task.server_now),end=new Date(task.ends_at);if(now.getTime()>end.getTime()+30000)return res.status(409).json({error:'This live task has ended.'});const timedOut=now>end;let answers={},score=null,correctCount=null,totalCount=null,review=null;if(task.task_type==='mcq'||task.task_type==='activity'){answers=req.body?.answers&&typeof req.body.answers==='object'?req.body.answers:{};const content=task.task_type==='mcq'?{...task.content,questions:(task.content?.questions||[]).map((q,i)=>({id:q.id||`q${i+1}`,type:'multiple_choice',prompt:q.q||q.prompt,options:q.options,answer:q.answer,explanation:q.explanation}))}:task.content;const graded=gradeActivity(content,answers);score=graded.score;correctCount=graded.correct;totalCount=graded.total;review=graded.detail}else{const text=String(req.body?.text||'').trim().slice(0,10000);answers={text};if(!text&&!timedOut)return res.status(400).json({error:'Write your response before submitting.'})}await pool.query(`insert into live_task_submissions(task_id,student_id,answers,score,correct_count,total_count,timed_out,submitted_at) values($1,$2,$3::jsonb,$4,$5,$6,$7,now())`,[task.id,auth.studentId,JSON.stringify(answers),score,correctCount,totalCount,timedOut]);res.status(201).json({ok:true,taskId:task.id,taskType:task.task_type,answers,score,correctCount,totalCount,timedOut,submittedAt:new Date().toISOString(),message:timedOut?'Time ended. Your work was saved and marked late.':'Submitted on time.'})}catch(e){console.error('live task submission error',e);res.status(500).json({error:'Your live task could not be submitted.'})}});
}

express.application.get=function liveInterventionGet(route,...handlers){install(this);return inheritedGet.call(this,route,...handlers)};
express.application.post=function liveInterventionPost(route,...handlers){install(this);return inheritedPost.call(this,route,...handlers)};
express.application.patch=function liveInterventionPatch(route,...handlers){install(this);return inheritedPatch.call(this,route,...handlers)};

require('./jitsi-classroom-bootstrap.js');
