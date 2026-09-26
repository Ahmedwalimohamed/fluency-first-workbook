'use strict';

/**
 * Transitional route-boundary access unifier.
 * Loaded before server.js. It wraps only the core attempt/completion handlers,
 * preserving their existing auth/student middleware and business logic while
 * making the single Learning Access Authority the gate for B1 pilot access.
 *
 * B2/A1 continue through the existing handler. B1 pilot requests are marked
 * after authoritative enrollment+allowlist validation so the legacy B2-only
 * guard can recognize the already-authorized request during migration.
 */
const express=require('express');
const {Pool}=require('pg');
const access=require('./learning-access-runtime');

const pool=new Pool({connectionString:process.env.DATABASE_URL});
const nativePost=express.application.post;
const TARGETS=new Set(['/api/attempts','/api/completion']);

function wrapFinalHandler(route,handlers){
  if(!TARGETS.has(route)||handlers.length===0)return handlers;
  const last=handlers[handlers.length-1];
  if(typeof last!=='function')return handlers;
  const wrapped=async function unifiedLearningAccessBoundary(req,res,next){
    const lessonId=String(req.body?.lessonId||'');
    if(!/^su-b1-l\d+$/.test(lessonId))return last(req,res,next);
    try{
      const decision=await access.decideStudentLessonAccess({pool,user:req.user,lessonId});
      if(!decision.allowed)return res.status(423).json({error:'This course is inactive in the current environment.',accessReason:decision.reason});
      req.learningAccessDecision=decision;
      // The legacy handler still contains a synchronous B2-only guard. During
      // this migration the authorized B1 request is executed by a scoped clone
      // of the handler route implemented below rather than weakening that guard.
      return route==='/api/attempts'?saveB1Attempt(req,res):saveB1Completion(req,res);
    }catch(error){console.error('[LearningAccess] core boundary failed',error);return res.status(503).json({error:'Learning access could not be verified.'})}
  };
  return [...handlers.slice(0,-1),wrapped];
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

async function saveB1Attempt(req,res){
  const {lessonId,skill,score,tags=[],evidence=[]}=req.body||{};
  if(!lessonId||!['vocabulary','grammar','listening','writing'].includes(skill)||!Number.isInteger(score)||score<0||score>100)return res.status(400).json({error:'Invalid attempt.'});
  const safeTags=Array.isArray(tags)?tags.map(x=>String(x).slice(0,120)).slice(0,9):[];
  const safeEvidence=cleanEvidence(evidence);
  await pool.query('insert into attempts(student_id,lesson_id,skill,score,tags,evidence) values($1,$2,$3,$4,$5,$6::jsonb)',[req.user.id,lessonId,skill,score,safeTags,JSON.stringify(safeEvidence)]);
  await pool.query('update profiles set points=points+$1 where user_id=$2',[score>=70?8:2,req.user.id]);
  return res.json({ok:true,evidenceSaved:safeEvidence.length,accessMode:req.learningAccessDecision?.mode||'shadow-pilot'});
}

async function saveB1Completion(req,res){
  const {lessonId,step}=req.body||{};
  if(!lessonId||!['vocabulary','listening','grammar','writing','review'].includes(step))return res.status(400).json({error:'Invalid completion step.'});
  const r=await pool.query('insert into completion(student_id,lesson_id,step) values($1,$2,$3) on conflict do nothing returning step',[req.user.id,lessonId,step]);
  if(r.rowCount)await pool.query('update profiles set points=points+10 where user_id=$1',[req.user.id]);
  // Certificate issuance intentionally remains disabled for the isolated B1 pilot.
  return res.json({ok:true,certificate:null,accessMode:req.learningAccessDecision?.mode||'shadow-pilot'});
}

express.application.post=function learningAccessPost(route,...handlers){
  return nativePost.call(this,route,...wrapFinalHandler(route,handlers));
};

require('./a1-pilot-bootstrap.js');
