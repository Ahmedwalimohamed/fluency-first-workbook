'use strict';

const express=require('express');
const jwt=require('jsonwebtoken');
const {Pool}=require('pg');
const crypto=require('crypto');

const pool=new Pool({connectionString:process.env.DATABASE_URL});
const nativeGet=express.application.get;
const nativePost=express.application.post;
const installed=new WeakSet();
const BOOK_ID='speakup-a1-gold';
const VERSION='englishgate-a1-gold-v1.1-batch-a';
const TYPE_SAFE_URL=process.env.TYPESAFE_API_URL||'https://api.typesafe.ai/v1/systemone';
const TYPE_SAFE_MODEL=process.env.TYPESAFE_MODEL||'jev-latest';

const LESSONS={
 'a1-gold-l1':{
  title:'Getting Acquainted',
  canDo:'Introduce yourself and exchange basic personal information with someone you have just met.',
  opening:"Hi. I'm Sarah. Nice to meet you.",
  keys:['intro','place','work','interest'],required:['intro'],minimumKeys:3,minimumQuestions:2,
  prompts:{intro:"What's your name?",place:'Where do you live?',work:'What do you do?',interest:'What do you like?'},
  detect:l=>({intro:/\b(i['’]?m|i am|my name is)\b/.test(l),place:/\b(i live in|i['’]?m from|i am from)\b/.test(l),work:/\b(i work|i study|i['’]?m a|i am a)\b/.test(l),interest:/\b(i like|i love|i enjoy)\b/.test(l)}),
  repairs:[
   {match:/\bi live\s+(?!in\b)[a-z]+/i,focus:'live_in_place',original:'I live Borama.',model:'I live in Borama.'},
   {match:/\bwhat\s+your\s+name\b/i,focus:'question_form',original:'What your name?',model:"What's your name?"},
   {match:/\bi\s+(?:am|'m)\s+(teacher|student|driver|doctor|nurse)\b/i,focus:'article_a',original:'I am teacher.',model:'I am a teacher.'}
  ]
 },
 'a1-gold-l2':{
  title:'Work & Careers',
  canDo:'Say what you do, where you work or study, and one basic thing you do there.',
  opening:"Hi. I'm Sarah. What do you do?",
  keys:['role','place','action'],required:[],minimumKeys:3,minimumQuestions:1,
  prompts:{role:'What do you do?',place:'Where do you work or study?',action:'What do you do there?'},
  detect:l=>({role:/\b(i['’]?m|i am)\s+(?:a\s+)?(?:driver|nurse|teacher|student|doctor|engineer|accountant|manager|assistant)\b|\bi (?:work|study)\b/.test(l),place:/\bi (?:work|study) (?:at|in|for)\b/.test(l),action:/\bi (?:help|drive|teach|study|serve|check|prepare|sell|work with|care for)\b/.test(l)}),
  repairs:[
   {match:/\bi\s+(?:am|'m)\s+(nurse|driver|teacher|student|doctor)\b/i,focus:'article_a',original:'I am nurse.',model:'I am a nurse.'},
   {match:/\bi work\s+(hospital|school|office)\b/i,focus:'work_place',original:'I work hospital.',model:'I work at a hospital.'},
   {match:/\bwhat\s+you\s+do\b/i,focus:'question_form',original:'What you do?',model:'What do you do?'}
  ]
 },
 'a1-gold-l3':{
  title:'Travel & Adventure',
  canDo:'Buy a simple ticket and ask about time, price, and place, including one simple change.',
  opening:'Hello. Where do you want to go?',
  keys:['request','destination','info','adapt'],required:['request'],minimumKeys:3,minimumQuestions:2,
  prompts:{request:'Ask me for a ticket.',destination:'Where do you want to go?',info:'Ask me about the time, price, or platform.',adapt:'The morning bus is full. The afternoon bus is available. What do you want to do?'},
  detect:l=>({request:/\b(i want|i need|i['’]?d like|one)\b[^.!?]*\bticket\b/.test(l),destination:/\b(?:ticket\s+)?to\s+[a-z]/.test(l),info:/\b(?:platform\s*\d+|\$?\d+(?::\d+)?|dollars?|morning|afternoon|what time|how much|where is platform)\b/.test(l),adapt:/\b(afternoon|later|that is okay|that's okay|that works|okay|ok)\b/.test(l)}),
  repairs:[
   {match:/\bi want ticket\b/i,focus:'article_a',original:'I want ticket.',model:'I want a ticket.'},
   {match:/\bhow much ticket\b/i,focus:'price_question',original:'How much ticket?',model:'How much is the ticket?'},
   {match:/\bwhat time bus\b/i,focus:'time_question',original:'What time bus?',model:'What time is the bus?'}
  ]
 },
 'a1-gold-l4':{
  title:'Technology & Social Media',
  canDo:'Say what technology you use, how often you use it, and one purpose.',
  opening:'Hi. What technology do you use every day?',
  keys:['device','purpose','frequency'],required:[],minimumKeys:3,minimumQuestions:1,
  prompts:{device:'What device do you use?',purpose:'What do you use it for?',frequency:'How often do you use it?'},
  detect:l=>({device:/\b(i use|my)\b[^.!?]*\b(phone|computer|app|internet)\b/.test(l),purpose:/\b(for work|for study|send messages|make calls|watch videos|use the internet)\b/.test(l),frequency:/\b(every day|daily|at work|at home|in the morning|in the evening)\b/.test(l)}),
  repairs:[
   {match:/\bi use phone every day\b/i,focus:'my_device',original:'I use phone every day.',model:'I use my phone every day.'},
   {match:/\bi use internet work\b/i,focus:'purpose',original:'I use internet work.',model:'I use the internet for work.'},
   {match:/\bwhat\s+you\s+use\s+(?:your\s+)?phone\s+for\b/i,focus:'question_form',original:'What you use phone for?',model:'What do you use your phone for?'}
  ]
 },
 'a1-gold-l5':{
  title:'Health & Wellbeing',
  canDo:'Say how you feel, name a simple health problem or need, and describe one healthy habit.',
  opening:'Hi. How do you feel today?',
  keys:['state','problem','habit'],required:['state'],minimumKeys:2,minimumQuestions:1,
  prompts:{state:'How do you feel?',problem:"What's wrong, or what do you need?",habit:'What healthy thing do you do?'},
  detect:l=>({state:/\bi feel\s+(tired|sick|better|okay|ok|well)\b/.test(l),problem:/\bi (?:have a headache|need water|need rest|need sleep)\b/.test(l),habit:/\bi (?:sleep|walk|exercise|drink water)\b/.test(l)}),
  repairs:[
   {match:/\bi am headache\b/i,focus:'have_problem',original:'I am headache.',model:'I have a headache.'},
   {match:/\bi feeling tired\b/i,focus:'feel_adjective',original:'I feeling tired.',model:'I feel tired.'},
   {match:/\bhow\s+you\s+feel\b/i,focus:'question_form',original:'How you feel?',model:'How do you feel?'}
  ]
 }
};

function session(req){try{return jwt.verify(req.cookies?.ff_session||'',process.env.JWT_SECRET)}catch{return null}}
function clean(v,max=1200){return String(v||'').trim().replace(/\s+/g,' ').slice(0,max)}
function configFor(id){return LESSONS[String(id||'')]||null}
async function goldActive(){const q=await pool.query("select 1 from books where id=$1 and status in ('ready','pilot')",[BOOK_ID]);return Boolean(q.rowCount)}
async function requireGoldActive(res){if(await goldActive())return true;res.status(423).json({error:'A1 Gold is currently inactive. Only B2 Upper Intermediate is active.'});return false}
function bool(v){return v===true}
async function ensureSchema(){
 await pool.query(`
  create table if not exists a1_gold_speaking_sessions(
   id text primary key,student_id text not null references users(id) on delete cascade,lesson_id text not null,
   status text not null default 'in_progress' check(status in ('in_progress','completed','needs_review')),
   transcript jsonb not null default '[]'::jsonb,functions jsonb not null default '{}'::jsonb,
   relevant_questions int not null default 0,personal_details int not null default 0,scaffold_level int not null default 0,
   deterministic_pass boolean not null default false,jev_status text not null default 'pending',jev_result jsonb not null default '{}'::jsonb,
   mastery_state text not null default 'in_progress',created_at timestamptz not null default now(),updated_at timestamptz not null default now()
  );
  create index if not exists a1_gold_speaking_student_lesson_idx on a1_gold_speaking_sessions(student_id,lesson_id,updated_at desc);
  create table if not exists a1_gold_fix_evidence(
   id bigserial primary key,student_id text not null references users(id) on delete cascade,lesson_id text not null,
   source_session_id text references a1_gold_speaking_sessions(id) on delete set null,focus text not null,
   original_text text not null default '',model_text text not null default '',retry_text text not null default '',
   resolved boolean not null default false,created_at timestamptz not null default now()
  );
 `);
}
function hasQuestion(text){const t=String(text||'').trim();return /\?/.test(t)||/^(what|where|who|how|do|are|is|can|when)\b/i.test(t)}
function detect(config,text){const l=String(text||'').toLowerCase();return {...config.detect(l),question:hasQuestion(text)}}
function evidenceCount(config,functions){return config.keys.filter(k=>bool(functions[k])).length}
function deterministicReady(config,functions,questions){
 const count=evidenceCount(config,functions);
 return config.required.every(k=>bool(functions[k]))&&count>=config.minimumKeys&&questions>=config.minimumQuestions;
}
function nextPrompt(config,functions,questions){
 for(const key of config.keys)if(!functions[key]&&config.prompts[key])return config.prompts[key];
 if(questions<config.minimumQuestions)return config.minimumQuestions===1?'Ask me one useful question too.':'Ask me another useful question.';
 return 'Good. Add one more useful detail.';
}
function commonRepairs(config,transcript){
 const text=transcript.filter(x=>x.role==='student').map(x=>x.text).join(' ');
 return config.repairs.filter(r=>r.match.test(text)).slice(0,3).map(({focus,original,model})=>({focus,original,model}));
}
async function callJev(state){
 const key=String(process.env.TYPESAFE_API_KEY||'').trim();
 if(!key)return {available:false,reason:'not_configured'};
 const canDo=String(state.canDo||'Complete the A1 communicative task.');
 const questions={
  task_completion:{type:'choice',instructions:'Does the learner successfully complete this CEFR A1 can-do: '+canDo+' Minor form errors must not erase successful communication.',criteria:{pass:'The communicative task is completed.',fail:'The learner cannot complete the basic task.',not_applicable:'Not applicable.'}},
  comprehensibility:{type:'choice',instructions:'Is the learner understandable enough for this simple A1 interaction?',criteria:{pass:'Meaning is generally understandable.',fail:'Meaning repeatedly breaks down.',not_applicable:'Not applicable.'}},
  reciprocity:{type:'choice',instructions:'Does the learner participate reciprocally by asking the required relevant basic question(s) as well as responding?',criteria:{pass:'The learner demonstrates the required reciprocal exchange.',fail:'The learner does not demonstrate reciprocal exchange.',not_applicable:'Not applicable.'}},
  cefr_fit:{type:'choice',instructions:'Is the interaction and expected output appropriate for CEFR A1 rather than demanding explanation or language above A1?',criteria:{pass:'The task remains A1 appropriate.',fail:'The interaction requires materially higher proficiency.',not_applicable:'Not applicable.'}}
 };
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Math.max(5000,Math.min(30000,Number(process.env.TYPESAFE_TIMEOUT_MS)||20000)));
 try{
  const r=await fetch(TYPE_SAFE_URL,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:TYPE_SAFE_MODEL,state,questions}),signal:controller.signal});
  if(!r.ok)return {available:false,reason:'http_'+r.status};
  return {available:true,data:await r.json()};
 }catch(e){return {available:false,reason:e?.name==='AbortError'?'timeout':'error'}}finally{clearTimeout(timer)}
}
function jevPass(result){
 if(!result?.available)return false;
 const answers=result.data?.answers||{};
 return ['task_completion','comprehensibility','reciprocity','cefr_fit'].every(k=>String(answers[k]?.choice||'').toLowerCase()==='pass');
}
async function canRead(user,studentId){
 if(user.role==='student')return user.id===studentId;
 if(user.role==='admin')return true;
 if(user.role!=='teacher')return false;
 const q=await pool.query('select 1 from enrollments e join classes c on c.id=e.class_id where e.user_id=$1 and c.teacher_id=$2 limit 1',[studentId,user.id]);
 return Boolean(q.rowCount);
}

function install(app){
 if(installed.has(app))return;installed.add(app);

 nativePost.call(app,'/api/a1-gold/speaking/start',async(req,res)=>{
  const user=session(req);if(!user||user.role!=='student')return res.status(403).json({error:'Student access required.'});
  await ensureSchema();if(!(await requireGoldActive(res)))return;
  const lessonId=clean(req.body?.lessonId,80),config=configFor(lessonId);
  if(!config)return res.status(400).json({error:'This A1 Gold speaking pilot is available for Lessons 1–5 only.'});
  const id='a1sp_'+crypto.randomUUID(),transcript=[{role:'ai',text:config.opening,at:new Date().toISOString()}];
  await pool.query('insert into a1_gold_speaking_sessions(id,student_id,lesson_id,transcript) values($1,$2,$3,$4::jsonb)',[id,user.id,lessonId,JSON.stringify(transcript)]);
  res.set('Cache-Control','no-store');res.json({ok:true,sessionId:id,message:config.opening,lessonId,version:VERSION});
 });

 nativePost.call(app,'/api/a1-gold/speaking/turn',async(req,res)=>{
  const user=session(req);if(!user||user.role!=='student')return res.status(403).json({error:'Student access required.'});
  await ensureSchema();if(!(await requireGoldActive(res)))return;
  const id=clean(req.body?.sessionId,100),text=clean(req.body?.text,800);if(!id||!text)return res.status(400).json({error:'Enter a response.'});
  const q=await pool.query('select * from a1_gold_speaking_sessions where id=$1 and student_id=$2',[id,user.id]);if(!q.rowCount)return res.status(404).json({error:'Speaking session not found.'});
  const row=q.rows[0],config=configFor(row.lesson_id);if(!config)return res.status(409).json({error:'This lesson is not available in the current A1 pilot.'});
  if(row.status!=='in_progress')return res.status(409).json({error:'This speaking session is already complete.'});
  const transcript=Array.isArray(row.transcript)?row.transcript:[],turn=detect(config,text),old=row.functions&&typeof row.functions==='object'?row.functions:{},functions={...old};
  for(const key of config.keys)functions[key]=bool(old[key])||bool(turn[key]);
  const relevantQuestions=Math.min(20,Number(row.relevant_questions||0)+(turn.question?1:0)),details=evidenceCount(config,functions);
  transcript.push({role:'student',text,at:new Date().toISOString()});
  const minimum=deterministicReady(config,functions,relevantQuestions),message=minimum?'Great. You completed the A1 speaking goal. We can check your transfer evidence.':nextPrompt(config,functions,relevantQuestions);
  transcript.push({role:'ai',text:message,at:new Date().toISOString()});
  await pool.query('update a1_gold_speaking_sessions set transcript=$1::jsonb,functions=$2::jsonb,relevant_questions=$3,personal_details=$4,deterministic_pass=$5,updated_at=now() where id=$6',[JSON.stringify(transcript),JSON.stringify(functions),relevantQuestions,details,minimum,id]);
  res.json({ok:true,message,readyToComplete:minimum,evidence:{functions,relevantQuestions,personalDetails:details,minimumDetails:config.minimumKeys,minimumQuestions:config.minimumQuestions}});
 });

 nativePost.call(app,'/api/a1-gold/speaking/complete',async(req,res)=>{
  const user=session(req);if(!user||user.role!=='student')return res.status(403).json({error:'Student access required.'});
  await ensureSchema();if(!(await requireGoldActive(res)))return;
  const id=clean(req.body?.sessionId,100);
  const q=await pool.query('select * from a1_gold_speaking_sessions where id=$1 and student_id=$2',[id,user.id]);if(!q.rowCount)return res.status(404).json({error:'Speaking session not found.'});
  const row=q.rows[0],config=configFor(row.lesson_id);if(!config)return res.status(409).json({error:'This lesson is not available in the current A1 pilot.'});
  const transcript=Array.isArray(row.transcript)?row.transcript:[],deterministicPass=Boolean(row.deterministic_pass);
  const jev=await callJev({
   purpose:`EnglishGate A1 ${config.title} speaking transfer decision`,targetLevel:'A1',canDo:config.canDo,
   minimumEvidence:{personalDetails:config.minimumKeys,relevantQuestions:config.minimumQuestions,requiredFunctions:config.required},
   transcript,deterministicEvidence:{personalDetails:Number(row.personal_details||0),relevantQuestions:Number(row.relevant_questions||0),functions:row.functions||{}},
   rules:['Prioritize successful communication over minor grammar errors.','Do not require explanations beyond A1.','Use the lesson can-do and supplied evidence only.']
  });
  const pass=deterministicPass&&jevPass(jev),jevStatus=jev.available?(pass?'pass':'fail'):'pending',mastery=pass?'MASTERED':deterministicPass&&!jev.available?'PARTIAL_MASTERY':'REVIEW_REQUIRED';
  const repairs=commonRepairs(config,transcript),savedRepairs=[],client=await pool.connect();
  try{
   await client.query('begin');
   await client.query('update a1_gold_speaking_sessions set status=$1,jev_status=$2,jev_result=$3::jsonb,mastery_state=$4,updated_at=now() where id=$5',[pass?'completed':'needs_review',jevStatus,JSON.stringify(jev),mastery,id]);
   for(const repair of repairs){
    const saved=await client.query('insert into a1_gold_fix_evidence(student_id,lesson_id,source_session_id,focus,original_text,model_text) values($1,$2,$3,$4,$5,$6) returning id',[user.id,row.lesson_id,id,repair.focus,repair.original,repair.model]);
    savedRepairs.push({...repair,id:saved.rows[0].id});
   }
   await client.query('commit');
  }catch(e){await client.query('rollback');throw e}finally{client.release()}
  res.json({ok:true,lessonId:row.lesson_id,masteryState:mastery,deterministicPass,jevStatus,repairs:savedRepairs,evidence:{personalDetails:Number(row.personal_details||0),relevantQuestions:Number(row.relevant_questions||0),functions:row.functions||{}},version:VERSION});
 });

 nativePost.call(app,'/api/a1-gold/fix-retry',async(req,res)=>{
  const user=session(req);if(!user||user.role!=='student')return res.status(403).json({error:'Student access required.'});
  await ensureSchema();if(!(await requireGoldActive(res)))return;
  const id=Number(req.body?.id),retry=clean(req.body?.retry,500);if(!Number.isInteger(id)||!retry)return res.status(400).json({error:'Enter your retry.'});
  const q=await pool.query('select * from a1_gold_fix_evidence where id=$1 and student_id=$2',[id,user.id]);if(!q.rowCount)return res.status(404).json({error:'Fix item not found.'});
  const model=String(q.rows[0].model_text||'').toLowerCase().replace(/[.!?]/g,'').replace(/\s+/g,' ').trim(),norm=retry.toLowerCase().replace(/[.!?]/g,'').replace(/\s+/g,' ').trim(),resolved=norm===model;
  await pool.query('update a1_gold_fix_evidence set retry_text=$1,resolved=$2 where id=$3',[retry,resolved,id]);res.json({ok:true,resolved,model:q.rows[0].model_text});
 });

 nativeGet.call(app,'/api/a1-gold/report/:studentId/:lessonId',async(req,res)=>{
  const user=session(req);if(!user)return res.status(401).json({error:'Sign in required.'});await ensureSchema();
  const studentId=clean(req.params.studentId,100),lessonId=clean(req.params.lessonId,80);if(!configFor(lessonId)||!(await canRead(user,studentId)))return res.status(403).json({error:'Not allowed.'});
  const speaking=(await pool.query('select id,status,transcript,functions,relevant_questions,personal_details,scaffold_level,deterministic_pass,jev_status,jev_result,mastery_state,created_at,updated_at from a1_gold_speaking_sessions where student_id=$1 and lesson_id=$2 order by updated_at desc',[studentId,lessonId])).rows;
  const fixes=(await pool.query('select id,focus,original_text,model_text,retry_text,resolved,created_at from a1_gold_fix_evidence where student_id=$1 and lesson_id=$2 order by created_at desc',[studentId,lessonId])).rows;
  const attempts=(await pool.query('select id,skill,score,tags,evidence,at from attempts where student_id=$1 and lesson_id=$2 order by at desc',[studentId,lessonId])).rows;
  const completion=(await pool.query('select step,completed_at from completion where student_id=$1 and lesson_id=$2 order by completed_at',[studentId,lessonId])).rows;
  const writing=(await pool.query('select content,score,updated_at from writing_samples where student_id=$1 and lesson_id=$2',[studentId,lessonId])).rows[0]||null;
  const workbookActivityStates=(await pool.query('select activity_id,activity_type,status,current_question,responses,started_at,last_activity_at,submitted_at,completed_at from workbook_activity_state where student_id=$1 and lesson_id=$2 order by activity_type',[studentId,lessonId])).rows;
  const workbookActivityAttempts=(await pool.query('select attempt_id,activity_id,activity_type,score,max_score,percentage,correct_count,incorrect_count,responses,status,started_at,submitted_at,created_at from workbook_activity_attempts where student_id=$1 and lesson_id=$2 order by submitted_at desc',[studentId,lessonId])).rows;
  res.set('Cache-Control','no-store');res.json({studentId,lessonId,version:VERSION,speaking,fixes,attempts,completion,writing,workbookActivityStates,workbookActivityAttempts});
 });
}

express.application.get=function a1GoldGet(route,...handlers){install(this);return nativeGet.call(this,route,...handlers)};
express.application.post=function a1GoldPost(route,...handlers){install(this);return nativePost.call(this,route,...handlers)};

require('./reading-listening-separation-bootstrap.js');
