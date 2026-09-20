'use strict';

const express=require('express');
const jwt=require('jsonwebtoken');

const nativePost=express.application.post;
const installed=new WeakSet();
const TYPE_SAFE_URL=process.env.TYPESAFE_API_URL||'https://api.typesafe.ai/v1/systemone';
const TYPE_SAFE_MODEL=process.env.TYPESAFE_MODEL||'jev-latest';
const VERSION='jev-b2-northstar-fix-v2';

function studentSession(req){
  try{
    const user=jwt.verify(req.cookies?.ff_session||'',process.env.JWT_SECRET);
    return user?.role==='student'?user:null;
  }catch{return null}
}
function clean(v,max=6000){return String(v||'').trim().slice(0,max)}
function evidence(answer,choice){
  const c=Number(answer?.confidence),p=Number(answer?.probabilities?.[choice]);
  const cc=Number.isFinite(c)&&c>=0&&c<=1?c:null,pp=Number.isFinite(p)&&p>=0&&p<=1?p:null;
  if(cc!=null&&pp!=null)return Math.min(cc,pp);
  if(pp!=null)return pp;
  return cc
}
async function callJev(state,questions){
  const key=String(process.env.TYPESAFE_API_KEY||'').trim();
  if(!key)throw Object.assign(new Error('TYPESAFE_API_KEY is not configured.'),{code:'JEV_NOT_CONFIGURED'});
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),Math.max(5000,Math.min(60000,Number(process.env.TYPESAFE_TIMEOUT_MS)||30000)));
  try{
    let last;
    for(let attempt=0;attempt<3;attempt++){
      try{
        const r=await fetch(TYPE_SAFE_URL,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({state,model:TYPE_SAFE_MODEL,questions}),signal:controller.signal});
        if(r.ok)return await r.json();
        const detail=(await r.text()).slice(0,400);
        last=new Error(`Jev Northstar grader ${r.status}: ${detail}`);
        if(![429,529].includes(r.status))throw last;
        if(attempt<2)await new Promise(resolve=>setTimeout(resolve,300*(2**attempt)));
      }catch(e){
        last=e;
        if(e?.name==='AbortError')throw new Error('Jev Northstar grader timed out.');
        if(attempt>=2)throw e;
      }
    }
    throw last||new Error('Jev Northstar grader failed.');
  }finally{clearTimeout(timeout)}
}
function questions(){
  const yesNo=(instruction)=>({type:'choice',instructions:instruction,criteria:{
    pass:'The requirement is materially satisfied by the learner response.',
    fail:'The requirement is materially not satisfied by the learner response.',
    not_applicable:'The requirement genuinely does not apply to this task.'
  }});
  return {
    task_completion:yesNo('Does the learner response actually accomplish the real-world task and communicate the required meaning? Ignore minor grammar/spelling if communication succeeds.'),
    target_language:yesNo('Does the learner use the lesson target language accurately enough for the intended meaning? Mark not_applicable only if the final task does not reasonably require the target form.'),
    specificity:yesNo('Does the response include enough specific detail or evidence to sound useful and believable rather than generic?'),
    vocabulary_use:yesNo('If target vocabulary is naturally relevant to the task, is at least one useful lesson word/chunk used appropriately or is equivalent language used? Mark not_applicable when forcing target vocabulary would sound unnatural.'),
    clarity:yesNo('Is the response clear and understandable to the intended real-world reader/listener without a serious ambiguity or broken sentence that changes the meaning?')
  }
}
function decision(data,id){
  const a=data?.answers?.[id],choice=String(a?.choice||'').toLowerCase(),score=evidence(a,choice);
  if(!['pass','fail','not_applicable'].includes(choice)||score==null)return {choice:'unknown',score:null};
  return {choice,score}
}
function repairFrom(decisions,state){
  if(decisions.task_completion.choice==='fail')return {
    focus:'task',
    title:'Make the message do its job.',
    prompt:`Make sure your response directly completes this task: ${state.finalTask}`
  };
  if(decisions.clarity.choice==='fail')return {
    focus:'clarity',
    title:'Make one sentence clearer.',
    prompt:'Rewrite the least clear sentence in simpler English so the reader can understand your meaning immediately.'
  };
  if(decisions.target_language.choice==='fail')return {
    focus:'target_language',
    title:'Fix the lesson pattern.',
    prompt:`Use this lesson language accurately in one sentence: ${state.targetLanguage}`
  };
  if(decisions.specificity.choice==='fail')return {
    focus:'specificity',
    title:'Make one idea specific.',
    prompt:'Replace one general claim with a concrete example, reason, result, or detail.'
  };
  if(decisions.vocabulary_use.choice==='fail')return {
    focus:'vocabulary',
    title:'Use one useful lesson word.',
    prompt:`Add one natural sentence using a relevant word or chunk from: ${state.targetVocabulary.join(', ')}.`
  };
  return {
    focus:'none',
    title:'No correction needed.',
    prompt:'Your response already completes the task clearly and meets the lesson targets.',
    needsCorrection:false
  }
}
async function grade(body){
  const state={
    task:'EnglishGate B2 Northstar final-use repair selection',
    targetLevel:clean(body?.level||'B2',20),
    lessonId:clean(body?.lessonId,100),
    lessonTitle:clean(body?.lessonTitle,160),
    mission:clean(body?.mission,1200),
    finalTask:clean(body?.finalTask,1600),
    targetLanguage:clean(body?.targetLanguage,1200),
    model:clean(body?.model,1200),
    targetVocabulary:Array.isArray(body?.targetVocabulary)?body.targetVocabulary.slice(0,8).map(x=>clean(x,100)):[],
    learnerResponse:clean(body?.response,6000),
    rules:[
      'Prioritize communication over minor grammar.',
      'Choose one highest-value repair only.',
      'Do not penalize a learner for not using a target word when equivalent natural language communicates the idea.',
      'Treat this as adult EFL coaching, not exam scoring.'
    ]
  };
  if(!state.learnerResponse||!state.finalTask)throw Object.assign(new Error('Northstar grading input is incomplete.'),{status:400});
  const data=await callJev(state,questions());
  const decisions={};
  for(const id of Object.keys(questions()))decisions[id]=decision(data,id);
  if(Object.values(decisions).some(x=>x.choice==='unknown'))throw new Error('Jev returned an incomplete Northstar decision.');
  const repair=repairFrom(decisions,state);
  return {repair,decisions,model:String(data?.model||TYPE_SAFE_MODEL),version:VERSION};
}
function install(app){
  if(installed.has(app))return;
  installed.add(app);
  nativePost.call(app,'/api/workbook-activities/grade-use',async(req,res)=>{
    if(!studentSession(req))return res.status(403).json({error:'Student access required.'});
    try{
      const result=await grade(req.body||{});
      res.set('Cache-Control','no-store');
      res.json({ok:true,...result});
    }catch(e){
      const status=Number(e?.status)||((e?.code==='JEV_NOT_CONFIGURED')?503:502);
      console.error('Jev Northstar grading error:',String(e?.message||e).slice(0,500));
      res.status(status).json({error:status===400?String(e.message):status===503?'Northstar feedback is temporarily unavailable.':'Northstar feedback could not be checked with Jev right now.'});
    }
  });
}
express.application.post=function northstarAwarePost(route,...handlers){
  install(this);
  return nativePost.call(this,route,...handlers)
};

require('./public-assets-bootstrap.js');
