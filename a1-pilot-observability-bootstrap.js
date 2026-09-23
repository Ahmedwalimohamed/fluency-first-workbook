'use strict';

const express=require('express');
const jwt=require('jsonwebtoken');
const {Pool}=require('pg');

const BOOK_ID='speakup-a1-gold';
const PILOT_CLASS_ID='a1_gold_pilot_class';
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const nativeUse=express.application.use;
let installed=false;

function enabled(){return process.env.A1_GOLD_PILOT_MODE==='1'}
function pilotUsername(){return String(process.env.A1_GOLD_PILOT_STUDENT_USERNAME||'a1pilot').trim().toLowerCase()}
function parseCookie(header,name){
 const raw=String(header||'');
 for(const part of raw.split(';')){
  const i=part.indexOf('=');
  if(i<0)continue;
  const key=part.slice(0,i).trim();
  if(key!==name)continue;
  try{return decodeURIComponent(part.slice(i+1).trim())}catch{return part.slice(i+1).trim()}
 }
 return'';
}
function adminFromRequest(req){
 try{
  const token=parseCookie(req.headers.cookie,'ff_session');
  const user=jwt.verify(token,String(process.env.JWT_SECRET||''));
  return user&&user.role==='admin'?user:null;
 }catch{return null}
}
async function one(sql,args=[]){const q=await pool.query(sql,args);return q.rows[0]||{}}
async function hasRelation(name){
 const q=await pool.query('select to_regclass($1) as relation',[`public.${name}`]);
 return Boolean(q.rows[0]?.relation);
}
async function optionalOne(table,sql,args,fallback){return await hasRelation(table)?one(sql,args):fallback}
async function optionalRows(table,sql,args){return await hasRelation(table)?(await pool.query(sql,args)).rows:[]}

async function pilotSnapshot(){
 const uq=await pool.query("select id from users where lower(username)=lower($1) and role='student' limit 1",[pilotUsername()]);
 if(!uq.rowCount)throw new Error('Pilot learner not found');
 const studentId=uq.rows[0].id;
 const books=await pool.query("select id,status from books where id in ('speakup-b2',$1)",[BOOK_ID]);
 const bookState=Object.fromEntries(books.rows.map(r=>[r.id,r.status]));
 const membership=await one(`select
   count(*) filter(where u.role='student')::int as students,
   count(*) filter(where u.role='teacher')::int as teachers
   from enrollments e join users u on u.id=e.user_id where e.class_id=$1`,[PILOT_CLASS_ID]);

 const attempts=await optionalOne('attempts',`select count(*)::int as attempts,count(distinct lesson_id)::int as lessons,
   round(avg(score)::numeric,1) as avg_score,max(at) as latest_at
   from attempts where student_id=$1 and lesson_id like 'a1-gold-l%'`,[studentId],{attempts:0,lessons:0,avg_score:null,latest_at:null});
 const completion=await optionalOne('completion',`select count(*)::int as steps,count(distinct lesson_id)::int as lessons,max(completed_at) as latest_at
   from completion where student_id=$1 and lesson_id like 'a1-gold-l%'`,[studentId],{steps:0,lessons:0,latest_at:null});
 const workbook=await optionalOne('workbook_activity_state',`select count(*)::int as activities,
   count(*) filter(where status='completed')::int as completed,
   count(*) filter(where status='in_progress')::int as in_progress,
   count(*) filter(where status='in_progress' and coalesce(last_activity_at,started_at)<now()-interval '30 minutes')::int as stalled,
   count(distinct lesson_id)::int as lessons,max(coalesce(last_activity_at,completed_at,started_at)) as latest_at
   from workbook_activity_state where student_id=$1 and lesson_id like 'a1-gold-l%'`,[studentId],{activities:0,completed:0,in_progress:0,stalled:0,lessons:0,latest_at:null});
 const workbookAttempts=await optionalOne('workbook_activity_attempts',`select count(*)::int as attempts,count(distinct lesson_id)::int as lessons,
   round(avg(percentage)::numeric,1) as avg_percentage,max(coalesce(submitted_at,created_at)) as latest_at
   from workbook_activity_attempts where student_id=$1 and lesson_id like 'a1-gold-l%'`,[studentId],{attempts:0,lessons:0,avg_percentage:null,latest_at:null});
 const writing=await optionalOne('writing_samples',`select count(*)::int as samples,count(distinct lesson_id)::int as lessons,
   round(avg(score)::numeric,1) as avg_score,max(updated_at) as latest_at
   from writing_samples where student_id=$1 and lesson_id like 'a1-gold-l%'`,[studentId],{samples:0,lessons:0,avg_score:null,latest_at:null});
 const speaking=await optionalOne('a1_gold_speaking_sessions',`select count(*)::int as sessions,
   count(*) filter(where status='completed')::int as completed,
   count(*) filter(where mastery_state='MASTERED')::int as mastered,
   count(*) filter(where status='needs_review' or mastery_state in ('REVIEW_REQUIRED','PARTIAL_MASTERY'))::int as needs_review,
   count(*) filter(where status='in_progress' and updated_at<now()-interval '30 minutes')::int as stalled,
   count(distinct lesson_id)::int as lessons,max(updated_at) as latest_at
   from a1_gold_speaking_sessions where student_id=$1`,[studentId],{sessions:0,completed:0,mastered:0,needs_review:0,stalled:0,lessons:0,latest_at:null});
 const fixes=await optionalOne('a1_gold_fix_evidence',`select count(*)::int as total,count(*) filter(where resolved)::int as resolved,
   count(*) filter(where not resolved)::int as unresolved,count(distinct lesson_id)::int as lessons,max(created_at) as latest_at
   from a1_gold_fix_evidence where student_id=$1`,[studentId],{total:0,resolved:0,unresolved:0,lessons:0,latest_at:null});
 const latestSpeaking=await optionalRows('a1_gold_speaking_sessions',`select distinct on (lesson_id) lesson_id,mastery_state,jev_status,deterministic_pass,updated_at
   from a1_gold_speaking_sessions where student_id=$1 order by lesson_id,updated_at desc`,[studentId]);
 const unfinishedWorkbook=await optionalRows('workbook_activity_state',`select lesson_id,activity_type,status,last_activity_at
   from workbook_activity_state where student_id=$1 and status<>'completed' and lesson_id like 'a1-gold-l%'
   order by coalesce(last_activity_at,started_at) asc limit 10`,[studentId]);

 const safety={
  b2:bookState['speakup-b2']||'missing',a1:bookState[BOOK_ID]||'missing',
  pilotStudents:Number(membership.students||0),pilotTeachers:Number(membership.teachers||0),
  extraStudentsAllowed:process.env.A1_GOLD_PILOT_ALLOW_EXTRA_STUDENTS==='1',
  extraClassesAllowed:process.env.A1_GOLD_PILOT_ALLOW_EXTRA_CLASSES==='1',
  ttsCredentialAligned:Boolean(process.env.OPENAI_TTS_API_KEY&&process.env.OPENAI_API_KEY&&process.env.OPENAI_TTS_API_KEY===process.env.OPENAI_API_KEY)
 };
 const blockers=[];const warnings=[];
 if(safety.b2!=='ready')blockers.push('B2_NOT_READY');
 if(safety.a1!=='pilot')blockers.push('A1_NOT_PILOT');
 if(safety.pilotStudents!==1)blockers.push('PILOT_STUDENT_COUNT');
 if(safety.extraStudentsAllowed||safety.extraClassesAllowed)blockers.push('EXPANSION_LOCK_OPEN');
 if(Number(workbook.stalled||0)>0)warnings.push('STALLED_WORKBOOK');
 if(Number(speaking.stalled||0)>0)warnings.push('STALLED_SPEAKING');
 if(Number(fixes.unresolved||0)>0)warnings.push('UNRESOLVED_FIXES');
 if(!safety.ttsCredentialAligned)warnings.push('TTS_CREDENTIAL_NOT_ALIGNED');
 return{
  status:blockers.length?'BLOCK':warnings.length?'WARN':'PASS',generatedAt:new Date().toISOString(),
  safety,blockers,warnings,
  learner:{attempts,completion,workbook,workbookAttempts,writing,speaking,fixes},
  latestSpeaking,unfinishedWorkbook
 };
}

async function observabilityMiddleware(req,res,next){
 if(!enabled()||req.method!=='GET'||req.path!=='/api/admin/a1-pilot/health')return next();
 if(!adminFromRequest(req))return res.status(403).json({error:'System Admin access required.'});
 try{
  const snapshot=await pilotSnapshot();
  res.set('Cache-Control','no-store');
  return res.json(snapshot);
 }catch(error){
  console.error('A1 pilot observability error:',error.message);
  return res.status(503).json({error:'Pilot health snapshot unavailable.'});
 }
}

express.application.use=function a1PilotObservabilityUse(...args){
 if(!installed){installed=true;nativeUse.call(this,observabilityMiddleware)}
 return nativeUse.apply(this,args);
};

module.exports={pilotSnapshot};
