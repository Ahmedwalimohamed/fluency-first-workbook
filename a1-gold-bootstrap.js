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
const LESSON_ID='a1-gold-l1';
const VERSION='englishgate-a1-gold-v1.0';
const TYPE_SAFE_URL=process.env.TYPESAFE_API_URL||'https://api.typesafe.ai/v1/systemone';
const TYPE_SAFE_MODEL=process.env.TYPESAFE_MODEL||'jev-latest';

function session(req){
  try{return jwt.verify(req.cookies?.ff_session||'',process.env.JWT_SECRET)}catch{return null}
}
function clean(v,max=1200){return String(v||'').trim().replace(/\s+/g,' ').slice(0,max)}
async function goldActive(){const q=await pool.query("select 1 from books where id=$1 and status in ('ready','pilot')",[BOOK_ID]);return Boolean(q.rowCount)}
async function requireGoldActive(res){if(await goldActive())return true;res.status(423).json({error:'A1 Gold is currently inactive. Only B2 Upper Intermediate is active.'});return false}
function bool(v){return v===true}
async function ensureSchema(){
  await pool.query(`
    create table if not exists a1_gold_speaking_sessions(
      id text primary key,
      student_id text not null references users(id) on delete cascade,
      lesson_id text not null,
      status text not null default 'in_progress' check(status in ('in_progress','completed','needs_review')),
      transcript jsonb not null default '[]'::jsonb,
      functions jsonb not null default '{}'::jsonb,
      relevant_questions int not null default 0,
      personal_details int not null default 0,
      scaffold_level int not null default 0,
      deterministic_pass boolean not null default false,
      jev_status text not null default 'pending',
      jev_result jsonb not null default '{}'::jsonb,
      mastery_state text not null default 'in_progress',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create index if not exists a1_gold_speaking_student_lesson_idx
      on a1_gold_speaking_sessions(student_id,lesson_id,updated_at desc);
    create table if not exists a1_gold_fix_evidence(
      id bigserial primary key,
      student_id text not null references users(id) on delete cascade,
      lesson_id text not null,
      source_session_id text references a1_gold_speaking_sessions(id) on delete set null,
      focus text not null,
      original_text text not null default '',
      model_text text not null default '',
      retry_text text not null default '',
      resolved boolean not null default false,
      created_at timestamptz not null default now()
    );
  `);
}
function detect(text){
  const t=String(text||'').trim(),l=t.toLowerCase();
  return {
    intro:/\b(i['’]?m|i am|my name is)\b/.test(l),
    place:/\b(i live in|i['’]?m from|i am from)\b/.test(l),
    work:/\b(i work|i study|i['’]?m a|i am a)\b/.test(l),
    interest:/\b(i like|i love|i enjoy)\b/.test(l),
    question:/\?\s*$/.test(t)||/^(what|where|who|how|do|are|is|can)\b/i.test(t)
  };
}
function personalDetailCount(f){
  return [f.place,f.work,f.interest].filter(Boolean).length;
}
function nextPrompt(functions,questionCount){
  if(!functions.intro)return "What's your name?";
  if(!functions.place)return 'Where do you live?';
  if(!functions.work)return 'What do you do?';
  if(!functions.interest)return 'What do you like?';
  if(questionCount<1)return 'I like reading. Ask me a question too.';
  if(questionCount<2)return "I'm from Hargeisa. Ask me one more question.";
  return 'Nice. Tell me one more thing about yourself.';
}
function commonRepairs(transcript){
  const text=transcript.filter(x=>x.role==='student').map(x=>x.text).join(' ');
  const out=[];
  if(/\bi live\s+(?!in\b)[A-Z]?[a-z]+/i.test(text))out.push({focus:'live_in_place',original:'I live Borama.',model:'I live in Borama.'});
  if(/\bwhat\s+your\s+name\b/i.test(text))out.push({focus:'question_form',original:'What your name?',model:"What's your name?"});
  if(/\bi\s+(?:am|'m)\s+(teacher|student|driver|doctor|nurse)\b/i.test(text))out.push({focus:'article_a',original:'I am teacher.',model:'I am a teacher.'});
  return out.slice(0,3);
}
async function callJev(state){
  const key=String(process.env.TYPESAFE_API_KEY||'').trim();
  if(!key)return {available:false,reason:'not_configured'};
  const questions={
    task_completion:{type:'choice',instructions:'Does the learner successfully introduce themself and exchange basic personal information at CEFR A1? Minor form errors must not erase successful communication.',criteria:{pass:'The communicative task is completed.',fail:'The learner cannot complete the basic exchange.',not_applicable:'Not applicable.'}},
    comprehensibility:{type:'choice',instructions:'Is the learner understandable enough for a simple A1 first-meeting conversation?',criteria:{pass:'Meaning is generally understandable.',fail:'Meaning repeatedly breaks down.',not_applicable:'Not applicable.'}},
    reciprocity:{type:'choice',instructions:'Does the learner participate reciprocally by asking relevant basic questions as well as answering?',criteria:{pass:'The learner asks relevant questions and responds.',fail:'The learner does not demonstrate reciprocal exchange.',not_applicable:'Not applicable.'}},
    cefr_fit:{type:'choice',instructions:'Is the interaction and expected output appropriate for CEFR A1 rather than demanding higher-level explanation?',criteria:{pass:'The task remains A1 appropriate.',fail:'The interaction requires materially higher proficiency.',not_applicable:'Not applicable.'}}
  };
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),Math.max(5000,Math.min(30000,Number(process.env.TYPESAFE_TIMEOUT_MS)||20000)));
  try{
    const r=await fetch(TYPE_SAFE_URL,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:TYPE_SAFE_MODEL,state,questions}),signal:controller.signal});
    if(!r.ok)return {available:false,reason:'http_'+r.status};
    return {available:true,data:await r.json()};
  }catch(e){return {available:false,reason:e?.name==='AbortError'?'timeout':'error'}}
  finally{clearTimeout(timer)}
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
  if(installed.has(app))return;
  installed.add(app);

  nativePost.call(app,'/api/a1-gold/speaking/start',async(req,res)=>{
    const user=session(req);
    if(!user||user.role!=='student')return res.status(403).json({error:'Student access required.'});
    await ensureSchema();
    if(!(await requireGoldActive(res)))return;
    const lessonId=clean(req.body?.lessonId,80);
    if(lessonId!==LESSON_ID)return res.status(400).json({error:'This speaking pilot is available for A1 Lesson 1 only.'});
    const id='a1sp_'+crypto.randomUUID();
    const opening="Hi. I'm Sarah. Nice to meet you.";
    const transcript=[{role:'ai',text:opening,at:new Date().toISOString()}];
    await pool.query('insert into a1_gold_speaking_sessions(id,student_id,lesson_id,transcript) values($1,$2,$3,$4::jsonb)',[id,user.id,lessonId,JSON.stringify(transcript)]);
    res.set('Cache-Control','no-store');
    res.json({ok:true,sessionId:id,message:opening,version:VERSION});
  });

  nativePost.call(app,'/api/a1-gold/speaking/turn',async(req,res)=>{
    const user=session(req);
    if(!user||user.role!=='student')return res.status(403).json({error:'Student access required.'});
    await ensureSchema();
    if(!(await requireGoldActive(res)))return;
    const id=clean(req.body?.sessionId,100),text=clean(req.body?.text,800);
    if(!id||!text)return res.status(400).json({error:'Enter a response.'});
    const q=await pool.query('select * from a1_gold_speaking_sessions where id=$1 and student_id=$2 and lesson_id=$3',[id,user.id,LESSON_ID]);
    if(!q.rowCount)return res.status(404).json({error:'Speaking session not found.'});
    const row=q.rows[0];
    if(row.status!=='in_progress')return res.status(409).json({error:'This speaking session is already complete.'});
    const transcript=Array.isArray(row.transcript)?row.transcript:[];
    const turn=detect(text),old=row.functions&&typeof row.functions==='object'?row.functions:{};
    const functions={intro:bool(old.intro)||turn.intro,place:bool(old.place)||turn.place,work:bool(old.work)||turn.work,interest:bool(old.interest)||turn.interest};
    const relevantQuestions=Math.min(20,Number(row.relevant_questions||0)+(turn.question?1:0));
    const details=Math.max(Number(row.personal_details||0),personalDetailCount(functions));
    transcript.push({role:'student',text,at:new Date().toISOString()});
    const minimum=functions.intro&&details>=2&&relevantQuestions>=2;
    const message=minimum?'Great. You introduced yourself and asked me questions. We can finish this conversation.':nextPrompt(functions,relevantQuestions);
    transcript.push({role:'ai',text:message,at:new Date().toISOString()});
    await pool.query('update a1_gold_speaking_sessions set transcript=$1::jsonb,functions=$2::jsonb,relevant_questions=$3,personal_details=$4,deterministic_pass=$5,updated_at=now() where id=$6',[JSON.stringify(transcript),JSON.stringify(functions),relevantQuestions,details,minimum,id]);
    res.json({ok:true,message,readyToComplete:minimum,evidence:{functions,relevantQuestions,personalDetails:details}});
  });

  nativePost.call(app,'/api/a1-gold/speaking/complete',async(req,res)=>{
    const user=session(req);
    if(!user||user.role!=='student')return res.status(403).json({error:'Student access required.'});
    await ensureSchema();
    if(!(await requireGoldActive(res)))return;
    const id=clean(req.body?.sessionId,100);
    const q=await pool.query('select * from a1_gold_speaking_sessions where id=$1 and student_id=$2 and lesson_id=$3',[id,user.id,LESSON_ID]);
    if(!q.rowCount)return res.status(404).json({error:'Speaking session not found.'});
    const row=q.rows[0],transcript=Array.isArray(row.transcript)?row.transcript:[];
    const deterministicPass=Boolean(row.deterministic_pass);
    const jev=await callJev({
      purpose:'EnglishGate A1 Lesson 1 speaking transfer decision',
      targetLevel:'A1',
      canDo:'Introduce yourself and exchange basic personal information with someone you have just met.',
      minimumEvidence:{personalDetails:2,relevantQuestions:2},
      transcript,
      deterministicEvidence:{personalDetails:Number(row.personal_details||0),relevantQuestions:Number(row.relevant_questions||0),functions:row.functions||{}},
      rules:['Prioritize successful communication over minor grammar errors.','Do not require explanations beyond A1.','Reciprocal basic questions are required for mastery.']
    });
    const pass=deterministicPass&&jevPass(jev),jevStatus=jev.available?(pass?'pass':'fail'):'pending';
    const mastery=pass?'MASTERED':deterministicPass&&!jev.available?'PARTIAL_MASTERY':'REVIEW_REQUIRED';
    const repairs=commonRepairs(transcript),savedRepairs=[];
    const client=await pool.connect();
    try{
      await client.query('begin');
      await client.query('update a1_gold_speaking_sessions set status=$1,jev_status=$2,jev_result=$3::jsonb,mastery_state=$4,updated_at=now() where id=$5',[pass?'completed':'needs_review',jevStatus,JSON.stringify(jev),mastery,id]);
      for(const repair of repairs){
        const saved=await client.query('insert into a1_gold_fix_evidence(student_id,lesson_id,source_session_id,focus,original_text,model_text) values($1,$2,$3,$4,$5,$6) returning id',[user.id,LESSON_ID,id,repair.focus,repair.original,repair.model]);
        savedRepairs.push({...repair,id:saved.rows[0].id});
      }
      await client.query('commit');
    }catch(e){await client.query('rollback');throw e}finally{client.release()}
    res.json({ok:true,masteryState:mastery,deterministicPass,jevStatus,repairs:savedRepairs,evidence:{personalDetails:Number(row.personal_details||0),relevantQuestions:Number(row.relevant_questions||0),functions:row.functions||{}},version:VERSION});
  });

  nativePost.call(app,'/api/a1-gold/fix-retry',async(req,res)=>{
    const user=session(req);
    if(!user||user.role!=='student')return res.status(403).json({error:'Student access required.'});
    await ensureSchema();
    if(!(await requireGoldActive(res)))return;
    const id=Number(req.body?.id),retry=clean(req.body?.retry,500);
    if(!Number.isInteger(id)||!retry)return res.status(400).json({error:'Enter your retry.'});
    const q=await pool.query('select * from a1_gold_fix_evidence where id=$1 and student_id=$2',[id,user.id]);
    if(!q.rowCount)return res.status(404).json({error:'Fix item not found.'});
    const model=String(q.rows[0].model_text||'').toLowerCase().replace(/[.!?]/g,'').replace(/\s+/g,' ').trim();
    const norm=retry.toLowerCase().replace(/[.!?]/g,'').replace(/\s+/g,' ').trim();
    const resolved=norm===model;
    await pool.query('update a1_gold_fix_evidence set retry_text=$1,resolved=$2 where id=$3',[retry,resolved,id]);
    res.json({ok:true,resolved,model:q.rows[0].model_text});
  });

  nativeGet.call(app,'/api/a1-gold/report/:studentId/:lessonId',async(req,res)=>{
    const user=session(req);
    if(!user)return res.status(401).json({error:'Sign in required.'});
    await ensureSchema();
    const studentId=clean(req.params.studentId,100),lessonId=clean(req.params.lessonId,80);
    if(lessonId!==LESSON_ID||!(await canRead(user,studentId)))return res.status(403).json({error:'Not allowed.'});
    const speaking=(await pool.query('select id,status,transcript,functions,relevant_questions,personal_details,scaffold_level,deterministic_pass,jev_status,jev_result,mastery_state,created_at,updated_at from a1_gold_speaking_sessions where student_id=$1 and lesson_id=$2 order by updated_at desc',[studentId,lessonId])).rows;
    const fixes=(await pool.query('select id,focus,original_text,model_text,retry_text,resolved,created_at from a1_gold_fix_evidence where student_id=$1 and lesson_id=$2 order by created_at desc',[studentId,lessonId])).rows;
    const attempts=(await pool.query('select id,skill,score,tags,evidence,at from attempts where student_id=$1 and lesson_id=$2 order by at desc',[studentId,lessonId])).rows;
    const completion=(await pool.query('select step,completed_at from completion where student_id=$1 and lesson_id=$2 order by completed_at',[studentId,lessonId])).rows;
    const writing=(await pool.query('select content,score,updated_at from writing_samples where student_id=$1 and lesson_id=$2',[studentId,lessonId])).rows[0]||null;
    res.set('Cache-Control','no-store');
    res.json({studentId,lessonId,version:VERSION,speaking,fixes,attempts,completion,writing});
  });
}

express.application.get=function a1GoldGet(route,...handlers){install(this);return nativeGet.call(this,route,...handlers)};
express.application.post=function a1GoldPost(route,...handlers){install(this);return nativePost.call(this,route,...handlers)};

require('./reading-listening-separation-bootstrap.js');
