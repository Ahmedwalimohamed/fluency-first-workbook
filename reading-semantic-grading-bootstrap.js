const express=require('express');
const jwt=require('jsonwebtoken');

const nativePost=express.application.post;
const installed=new WeakSet();
const TYPE_SAFE_URL=process.env.TYPESAFE_API_URL||'https://api.typesafe.ai/v1/systemone';
const TYPE_SAFE_MODEL=process.env.TYPESAFE_MODEL||'jev-latest';
const READING_GRADER_VERSION='jev-reading-semantic-v1';

function studentSession(req){
  try{
    const user=jwt.verify(req.cookies?.ff_session||'',process.env.JWT_SECRET);
    return user?.role==='student'?user:null;
  }catch{return null}
}
function clean(value,max=8000){return String(value||'').trim().slice(0,max)}
function normalizeItems(value){
  if(!Array.isArray(value))return[];
  return value.slice(0,12).map((item,index)=>({
    index:Number.isInteger(Number(item?.index))?Number(item.index):index,
    question:clean(item?.question,700),
    expected:clean(item?.expected,700),
    response:clean(item?.response,1800)
  })).filter(x=>x.question&&x.expected&&x.response);
}
function jevQuestions(items){
  const out={};
  for(const item of items){
    out['item_'+item.index]={
      type:'choice',
      instructions:`Judge ONLY whether the learner response correctly communicates the core meaning needed to answer reading question ${item.index+1}. Use the supplied passage as the source of truth and the official answer as a reference, not as wording the learner must copy. Accept valid paraphrases. Ignore spelling, grammar, punctuation, capitalization, and style unless they make meaning unclear. Mark incorrect when the response contradicts the passage, gives a different idea, is too vague to demonstrate comprehension, or omits an essential part of a multi-part answer. Do not award credit merely for overlapping words.`,
      criteria:{
        correct:'The learner response communicates the required meaning supported by the passage. A valid paraphrase counts as correct.',
        incorrect:'The learner response does not communicate the required meaning, is contradicted by the passage, is materially incomplete, or is too vague to demonstrate comprehension.'
      }
    };
  }
  return out;
}
function evidence(answer,choice){
  const confidence=Number(answer?.confidence);
  const probability=Number(answer?.probabilities?.[choice]);
  const c=Number.isFinite(confidence)&&confidence>=0&&confidence<=1?confidence:null;
  const p=Number.isFinite(probability)&&probability>=0&&probability<=1?probability:null;
  if(c!=null&&p!=null)return Math.min(c,p);
  if(p!=null)return p;
  if(c!=null)return c;
  return null;
}
async function callJev(state,questions){
  const apiKey=String(process.env.TYPESAFE_API_KEY||'').trim();
  if(!apiKey)throw Object.assign(new Error('TYPESAFE_API_KEY is not configured.'),{code:'JEV_NOT_CONFIGURED'});
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),Math.max(5000,Math.min(60000,Number(process.env.TYPESAFE_TIMEOUT_MS)||30000)));
  try{
    let last;
    for(let attempt=0;attempt<3;attempt++){
      try{
        const r=await fetch(TYPE_SAFE_URL,{
          method:'POST',
          headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
          body:JSON.stringify({state,model:TYPE_SAFE_MODEL,questions}),
          signal:controller.signal
        });
        if(r.ok)return await r.json();
        const detail=(await r.text()).slice(0,400);
        last=new Error(`Jev reading grader ${r.status}: ${detail}`);
        if(![429,529].includes(r.status))throw last;
        if(attempt<2)await new Promise(resolve=>setTimeout(resolve,300*(2**attempt)));
      }catch(e){
        last=e;
        if(e?.name==='AbortError')throw new Error('Jev reading grader timed out.');
        if(attempt>=2)throw e;
      }
    }
    throw last||new Error('Jev reading grader failed.');
  }finally{clearTimeout(timeout)}
}
async function gradeReading(body){
  const passage=clean(body?.passage,16000),items=normalizeItems(body?.items);
  if(!passage||!items.length)throw Object.assign(new Error('Reading grading input is incomplete.'),{status:400});
  const state={
    task:'EnglishGate adult ESL reading-comprehension semantic grading',
    targetLevel:clean(body?.level||body?.targetLevel||'B2',20),
    lessonId:clean(body?.lessonId,100),
    rules:[
      'Use only the passage as the factual source of truth.',
      'The official answer defines the required idea but learners do not need to copy its wording.',
      'Accept concise answers when they clearly communicate the required meaning.',
      'Ignore language-form errors unless they obscure or change meaning.',
      'Do not infer missing meaning from what the learner may have intended.'
    ],
    passage,
    items
  };
  const data=await callJev(state,jevQuestions(items));
  const results=[];
  for(const item of items){
    const answer=data?.answers?.['item_'+item.index];
    const choice=String(answer?.choice||'').toLowerCase();
    const score=evidence(answer,choice);
    if(!['correct','incorrect'].includes(choice)||score==null){
      throw new Error('Jev returned an incomplete reading decision.');
    }
    // Jev's selected decision remains authoritative. Confidence is returned for diagnostics,
    // but a low-confidence answer does not crash the learner flow.
    const correct=choice==='correct';
    results.push({
      index:item.index,
      correct,
      confidence:score,
      reason:correct
        ?'Your answer communicates the key idea from the passage.'
        :'Your answer does not yet communicate the key idea supported by the passage.'
    });
  }
  return {results,model:String(data?.model||TYPE_SAFE_MODEL),version:READING_GRADER_VERSION};
}
function install(app){
  if(installed.has(app))return;
  installed.add(app);
  nativePost.call(app,'/api/workbook-activities/grade-reading',async(req,res)=>{
    if(!studentSession(req))return res.status(403).json({error:'Student access required.'});
    try{
      const graded=await gradeReading(req.body||{});
      res.set('Cache-Control','no-store');
      res.json({ok:true,...graded});
    }catch(e){
      const status=Number(e?.status)||((e?.code==='JEV_NOT_CONFIGURED')?503:502);
      console.error('Jev reading semantic grading error:',String(e?.message||e).slice(0,500));
      res.status(status).json({
        error:status===400
          ?String(e.message)
          :status===503
            ?'Reading semantic grading is temporarily unavailable.'
            :'Reading answers could not be checked with Jev right now.'
      });
    }
  });
}

express.application.post=function readingSemanticPost(route,...handlers){
  install(this);
  return nativePost.call(this,route,...handlers);
};

require('./reading-listening-separation-bootstrap.js');
