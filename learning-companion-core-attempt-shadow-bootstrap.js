'use strict';

/**
 * Additive server bootstrap for Learning Companion shadow observation.
 *
 * - Existing /api/attempts remains the source of truth for active courses.
 * - Successful core attempts are observed asynchronously after response.
 * - B1 Lesson 1 can be opened only when BOTH the pilot flag and an explicit
 *   student ID allowlist are configured. No database book-status mutation.
 * - Companion failures never block grading, completion, or navigation.
 */
const express=require('express');
const jwt=require('jsonwebtoken');
const {Pool}=require('pg');
const capture=require('./learning-companion-shadow-capture');
const pilot=require('./learning-companion-pilot-scope');

const originalPost=express.application.post;
const originalGet=express.application.get;
const installed=new WeakSet();
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const companionEnabled=()=>String(process.env.LEARNING_COMPANION_V1||'false').toLowerCase()==='true';

function userFrom(req){
  try{return jwt.verify(req.cookies?.ff_session||'',process.env.JWT_SECRET)}catch{return null}
}

function cleanEvidence(value){
  if(!Array.isArray(value))return[];
  return value.slice(0,24).map((x,i)=>({
    index:Number.isInteger(Number(x?.index))?Math.max(1,Math.min(99,Number(x.index))):i+1,
    question:String(x?.question||'').trim().slice(0,700),
    studentAnswer:String(x?.studentAnswer||'').trim().slice(0,1200),
    correctAnswer:String(x?.correctAnswer||'').trim().slice(0,1200),
    correct:x?.correct===true?true:x?.correct===false?false:null,
    tag:String(x?.tag||'').trim().slice(0,120)
  })).filter(x=>x.question||x.studentAnswer||x.correctAnswer)
}

function scheduleCoreObservation(row){
  if(!companionEnabled()||!row)return;
  setImmediate(()=>capture.observeCoreAttempt({pool,row}).catch(e=>console.error('[LearningCompanion shadow] core post-save observation failed:',e?.message||e)))
}

async function latestCoreAttempt(user,body,startedAt){
  if(!user?.id||!body?.lessonId||!body?.skill)return null;
  const r=await pool.query(
    `select id,student_id,lesson_id,skill,score,tags,evidence,at
       from attempts
      where student_id=$1 and lesson_id=$2 and skill=$3 and at >= $4
      order by at desc,id desc limit 1`,
    [user.id,String(body.lessonId),String(body.skill),startedAt]
  );
  return r.rows[0]||null
}

function observeNormalAttemptAfterSuccess(req,res,next){
  if(!companionEnabled())return next();
  const user=userFrom(req),startedAt=new Date(Date.now()-1000).toISOString(),nativeJson=res.json.bind(res);
  let scheduled=false;
  res.json=body=>{
    const successful=res.statusCode>=200&&res.statusCode<300&&body?.ok===true;
    const out=nativeJson(body);
    if(successful&&!scheduled){
      scheduled=true;
      setImmediate(async()=>{
        try{scheduleCoreObservation(await latestCoreAttempt(user,req.body||{},startedAt))}
        catch(e){console.error('[LearningCompanion shadow] accepted attempt lookup failed:',e?.message||e)}
      })
    }
    return out
  };
  next()
}

async function saveB1PilotAttempt(req,res,next){
  const user=userFrom(req),lessonId=String(req.body?.lessonId||'').trim();
  if(!pilot.isB1ShadowPilotLesson(lessonId))return observeNormalAttemptAfterSuccess(req,res,next);
  if(!user||user.role!=='student'||!pilot.isAllowedB1ShadowPilot(user.id,lessonId))return next();

  const skill=String(req.body?.skill||'').trim().toLowerCase(),score=Number(req.body?.score),tags=req.body?.tags,evidence=req.body?.evidence;
  if(!['vocabulary','grammar','listening','writing'].includes(skill)||!Number.isInteger(score)||score<0||score>100)return res.status(400).json({error:'Invalid attempt.'});
  const safeTags=Array.isArray(tags)?tags.map(x=>String(x).slice(0,120)).slice(0,8):[];
  if(!safeTags.includes('curriculum:b1-shadow-pilot-v1'))safeTags.push('curriculum:b1-shadow-pilot-v1');
  const safeEvidence=cleanEvidence(evidence);
  try{
    const r=await pool.query(
      `insert into attempts(student_id,lesson_id,skill,score,tags,evidence)
       values($1,$2,$3,$4,$5,$6::jsonb)
       returning id,student_id,lesson_id,skill,score,tags,evidence,at`,
      [user.id,lessonId,skill,score,safeTags,JSON.stringify(safeEvidence)]
    );
    await pool.query('update profiles set points=points+$1 where user_id=$2',[score>=70?8:2,user.id]);
    res.json({ok:true,evidenceSaved:safeEvidence.length,pilot:true});
    scheduleCoreObservation(r.rows[0])
  }catch(e){console.error('B1 shadow pilot attempt error:',e?.message||e);res.status(500).json({error:'Could not save pilot attempt.'})}
}

async function saveB1PilotCompletion(req,res,next){
  const user=userFrom(req),lessonId=String(req.body?.lessonId||'').trim();
  if(!pilot.isB1ShadowPilotLesson(lessonId))return next();
  if(!user||user.role!=='student'||!pilot.isAllowedB1ShadowPilot(user.id,lessonId))return next();
  const step=String(req.body?.step||'').trim().toLowerCase();
  if(!['vocabulary','listening','grammar','writing'].includes(step))return res.status(400).json({error:'Invalid completion step.'});
  try{
    const r=await pool.query('insert into completion(student_id,lesson_id,step) values($1,$2,$3) on conflict do nothing returning step',[user.id,lessonId,step]);
    if(r.rowCount)await pool.query('update profiles set points=points+10 where user_id=$1',[user.id]);
    res.json({ok:true,certificate:null,pilot:true})
  }catch(e){console.error('B1 shadow pilot completion error:',e?.message||e);res.status(500).json({error:'Could not save pilot completion.'})}
}

function exposeB1AsPilotInState(req,res,next){
  const user=userFrom(req);
  if(!user||user.role!=='student'||!pilot.pilotStudentAllowed(user.id))return next();
  const nativeJson=res.json.bind(res);
  res.json=body=>{
    if(body&&Array.isArray(body.books)){
      body={...body,books:body.books.map(b=>b?.id==='speakup-b1'?{...b,status:'pilot'}:b)}
    }
    return nativeJson(body)
  };
  next()
}

function pilotConfig(req,res){
  const user=userFrom(req),allowed=Boolean(user?.role==='student'&&pilot.pilotStudentAllowed(user.id));
  res.set('Cache-Control','no-store');
  res.json({enabled:allowed,courseId:allowed?'speakup-b1':null,lessonId:allowed?pilot.B1_PILOT_LESSON_ID:null,mode:allowed?'shadow':'off'})
}

function install(app){
  if(installed.has(app))return;installed.add(app);
  originalGet.call(app,'/api/state',exposeB1AsPilotInState);
  originalGet.call(app,'/api/learning-companion/pilot-config',pilotConfig);
  originalPost.call(app,'/api/attempts',saveB1PilotAttempt);
  originalPost.call(app,'/api/completion',saveB1PilotCompletion)
}

express.application.post=function learningCompanionCoreShadowPost(route,...handlers){install(this);return originalPost.call(this,route,...handlers)};
express.application.get=function learningCompanionCoreShadowGet(route,...handlers){install(this);return originalGet.call(this,route,...handlers)};

module.exports={cleanEvidence,latestCoreAttempt,observeNormalAttemptAfterSuccess,saveB1PilotAttempt,saveB1PilotCompletion,exposeB1AsPilotInState,pilotConfig,install};
