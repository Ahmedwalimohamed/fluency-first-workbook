const express=require('express');
const jwt=require('jsonwebtoken');

const previousPost=express.application.post;
const installed=new WeakSet();
const TYPE_SAFE_URL=process.env.TYPESAFE_API_URL||'https://api.typesafe.ai/v1/systemone';
const TYPE_SAFE_MODEL=process.env.TYPESAFE_MODEL||'jev-latest';
const RUBRIC_VERSION='englishgate-writing-rubric-v2';
const PASS_SCORE=70;

const BAND_POINTS={exceeds:100,meets:85,developing:65,limited:40};
const RUBRIC={
  task:{label:'Task achievement',weight:30,criteria:{
    exceeds:'Fully fulfils the writing task, covers all important requirements, stays relevant, and develops ideas with useful detail.',
    meets:'Fulfils the main task and is relevant, with enough detail for the purpose. Minor omissions do not prevent success.',
    developing:'Partly fulfils the task but an important requirement is missing, underdeveloped, vague, or only partly relevant.',
    limited:'Does not adequately fulfil the task, is substantially off-topic, or gives too little relevant content to demonstrate the required writing ability.'
  }},
  organisation:{label:'Organisation and cohesion',weight:20,criteria:{
    exceeds:'Ideas are logically organised and easy to follow, with effective paragraphing or sequencing and natural linking.',
    meets:'Ideas follow a clear progression with generally appropriate linking. The reader can follow the message without difficulty.',
    developing:'There is some organisation, but progression is uneven, repetitive, abrupt, or weakly connected.',
    limited:'Ideas are difficult to follow because organisation, sequencing, or linking is seriously weak.'
  }},
  grammar:{label:'Grammar accuracy and range',weight:20,criteria:{
    exceeds:'Uses a good range of B2-appropriate structures with strong control. Errors are infrequent and do not distract from meaning.',
    meets:'Uses both simple and some complex structures with generally good control. Errors occur but do not impede communication.',
    developing:'Relies on a limited range or shows repeated grammatical errors that distract the reader, though the main meaning is usually recoverable.',
    limited:'Frequent or serious grammatical errors regularly obscure meaning or show control well below the target level.'
  }},
  vocabulary:{label:'Vocabulary range and precision',weight:20,criteria:{
    exceeds:'Uses a good range of relevant vocabulary with accurate, flexible, and precise word choice for the task.',
    meets:'Uses adequate B2-level vocabulary for the task. Most word choices are appropriate, with occasional awkwardness or repetition.',
    developing:'Vocabulary is noticeably limited, repetitive, or sometimes inaccurate, reducing precision and effectiveness.',
    limited:'Very limited or frequently inaccurate vocabulary makes the response difficult to understand or unsuitable for the task.'
  }},
  mechanics:{label:'Sentence control and mechanics',weight:10,criteria:{
    exceeds:'Sentence boundaries, spelling, capitalization, and punctuation are consistently controlled and support effortless reading.',
    meets:'Mechanics are generally accurate. Minor errors are present but do not interfere with readability.',
    developing:'Noticeable sentence-boundary, spelling, capitalization, or punctuation errors reduce readability but the text remains understandable.',
    limited:'Frequent mechanics errors make the response difficult to read or cause repeated misunderstanding.'
  }}
};

function studentSession(req){
  try{
    const user=jwt.verify(req.cookies?.ff_session||'',process.env.JWT_SECRET);
    return user?.role==='student'?user:null;
  }catch{return null}
}
function clean(value,max=8000){return String(value||'').trim().slice(0,max)}
function words(text){return clean(text).split(/\s+/).filter(Boolean)}
function basicIntegrity(text,minWords,maxWords){
  const ws=words(text),count=ws.length,lower=ws.map(w=>w.toLowerCase().replace(/[^a-z']/gi,'')).filter(Boolean);
  const unique=new Set(lower).size,uniqueRatio=lower.length?unique/lower.length:0;
  const freq={};for(const w of lower)freq[w]=(freq[w]||0)+1;
  const dominant=lower.length?Math.max(0,...Object.values(freq))/lower.length:1;
  const alpha=(clean(text).match(/[A-Za-z]/g)||[]).length,visible=clean(text).replace(/\s/g,'').length||1,alphaRatio=alpha/visible;
  const min=Math.max(1,Number(minWords)||1),max=Math.max(min,Number(maxWords)||Math.max(min,500));
  const hardMax=Math.ceil(max*1.25);
  const meaningful=count>=Math.min(min,20)&&alphaRatio>=0.55&&(count<20||uniqueRatio>=0.28)&&dominant<=0.3;
  return {wordCount:count,minWords:min,maxWords:max,hardMax,withinTarget:count>=min&&count<=max,withinHardLimit:count>=min&&count<=hardMax,meaningful,uniqueRatio:Number(uniqueRatio.toFixed(2)),dominantWordRatio:Number(dominant.toFixed(2))};
}
function jevQuestions(level){
  const questions={};
  for(const [id,r] of Object.entries(RUBRIC)){
    questions[id]={
      type:'choice',
      instructions:`Judge ONLY ${r.label.toLowerCase()} for this ${level||'B2'} English learner writing response. Do not reward the learner merely for writing enough words. Use the task and learner response supplied in state. Select the single descriptor that best matches the evidence.`,
      criteria:r.criteria
    };
  }
  return questions;
}
function answerFor(data,id){
  const a=data?.answers?.[id]||data?.[id]||null;
  const choice=String(a?.choice||a?.answer||a?.value||'').toLowerCase().trim();
  if(!Object.hasOwn(BAND_POINTS,choice))return null;
  const confidence=Number(a?.confidence);
  const probability=Number(a?.probabilities?.[choice]);
  const c=Number.isFinite(confidence)&&confidence>=0&&confidence<=1?confidence:null;
  const p=Number.isFinite(probability)&&probability>=0&&probability<=1?probability:null;
  return {band:choice,confidence:c!=null&&p!=null?Math.min(c,p):(p??c)};
}
async function callJev(state,questions){
  const apiKey=String(process.env.TYPESAFE_API_KEY||'').trim();
  if(!apiKey)throw Object.assign(new Error('TYPESAFE_API_KEY is not configured.'),{code:'JEV_NOT_CONFIGURED'});
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),Math.max(7000,Math.min(60000,Number(process.env.TYPESAFE_TIMEOUT_MS)||30000)));
  try{
    let last;
    for(let attempt=0;attempt<3;attempt++){
      try{
        const r=await fetch(TYPE_SAFE_URL,{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({state,model:TYPE_SAFE_MODEL,questions}),signal:controller.signal});
        if(r.ok)return await r.json();
        const detail=(await r.text()).slice(0,400);
        last=new Error(`Jev writing grader ${r.status}: ${detail}`);
        if(![429,529].includes(r.status))throw last;
        if(attempt<2)await new Promise(resolve=>setTimeout(resolve,350*(2**attempt)));
      }catch(e){
        last=e;
        if(e?.name==='AbortError')throw new Error('Jev writing grader timed out.');
        if(attempt>=2)throw e;
      }
    }
    throw last||new Error('Jev writing grader failed.');
  }finally{clearTimeout(timeout)}
}
function scoreDimensions(decisions){
  let total=0;
  const dimensions={};
  for(const [id,r] of Object.entries(RUBRIC)){
    const d=decisions[id],raw=BAND_POINTS[d.band];
    total+=raw*(r.weight/100);
    dimensions[id]={label:r.label,weight:r.weight,band:d.band,score:raw,confidence:d.confidence,descriptor:r.criteria[d.band]};
  }
  return {score:Math.round(total),dimensions};
}
function feedbackFor(dimensions,pass){
  const rows=Object.entries(dimensions).sort((a,b)=>b[1].score-a[1].score);
  const strongest=rows[0]?.[1],weakest=rows[rows.length-1]?.[1];
  return {
    strength:strongest?`Strongest area: ${strongest.label}.`:'',
    improve:weakest?`Priority for revision: ${weakest.label}.`:'',
    action:pass?'This response meets the EnglishGate B2 writing standard.':'Revise the weakest rubric area, then submit again for a new grade.'
  };
}
async function gradeWriting(body){
  const lessonId=clean(body?.lessonId,100),task=clean(body?.task,1400),text=clean(body?.text,6000),level=clean(body?.level||'B2',30);
  if(!/^su-b2-l\d+$/.test(lessonId))throw Object.assign(new Error('The standard writing grader is currently enabled for B2 Upper Intermediate.'),{status:423});
  if(!task||!text)throw Object.assign(new Error('Writing task and learner response are required.'),{status:400});
  const integrity=basicIntegrity(text,body?.minWords,body?.maxWords);
  if(!integrity.meaningful)throw Object.assign(new Error('The response does not yet contain enough meaningful English for reliable grading.'),{status:400,integrity});
  if(!integrity.withinHardLimit)throw Object.assign(new Error(`Write within ${integrity.minWords}–${integrity.maxWords} words before grading.`),{status:400,integrity});
  const state={
    purpose:'EnglishGate B2 writing assessment',
    rubricVersion:RUBRIC_VERSION,
    targetLevel:level||'B2',
    lessonId,
    writingTask:task,
    learnerResponse:text,
    wordTarget:{min:integrity.minWords,max:integrity.maxWords,actual:integrity.wordCount},
    rules:[
      'Judge the learner response, not effort or length alone.',
      'Task relevance is mandatory: unrelated fluent writing must not receive a passing task-achievement decision.',
      'At B2, minor errors are acceptable when communication remains clear.',
      'Do not infer learner identity, background, intelligence, motivation, or intent.',
      'Do not silently correct the learner text before judging it.',
      'Use the rubric descriptors consistently across learners.'
    ]
  };
  const data=await callJev(state,jevQuestions(level||'B2'));
  const decisions={};
  for(const id of Object.keys(RUBRIC)){
    const d=answerFor(data,id);
    if(!d)throw new Error(`Jev returned an incomplete ${id} decision.`);
    decisions[id]=d;
  }
  const {score,dimensions}=scoreDimensions(decisions);
  const taskScore=dimensions.task.score;
  const lowConfidence=Object.values(dimensions).some(d=>d.confidence!=null&&d.confidence<0.55);
  const pass=score>=PASS_SCORE&&taskScore>=65&&integrity.withinTarget&&!lowConfidence;
  const status=lowConfidence?'review_required':pass?'passed':'needs_revision';
  return {score,pass,status,threshold:PASS_SCORE,dimensions,integrity,feedback:feedbackFor(dimensions,pass),model:String(data?.model||TYPE_SAFE_MODEL),version:RUBRIC_VERSION};
}
function rubricSummary(){
  return {version:RUBRIC_VERSION,level:'B2',passScore:PASS_SCORE,dimensions:Object.fromEntries(Object.entries(RUBRIC).map(([id,r])=>[id,{label:r.label,weight:r.weight,bands:r.criteria}]))};
}
function install(app){
  if(installed.has(app))return;
  installed.add(app);
  previousPost.call(app,'/api/writing-grade-v2',async(req,res)=>{
    if(!studentSession(req))return res.status(403).json({error:'Student access required.'});
    try{
      const graded=await gradeWriting(req.body||{});
      res.set('Cache-Control','no-store');
      res.json({ok:true,...graded});
    }catch(e){
      const status=Number(e?.status)||((e?.code==='JEV_NOT_CONFIGURED')?503:502);
      console.error('EnglishGate writing rubric grading error:',String(e?.message||e).slice(0,500));
      res.status(status).json({error:status===503?'AI writing grading is temporarily unavailable. Your work has not been marked complete.':String(e?.message||'Writing could not be graded.'),version:RUBRIC_VERSION,...(e?.integrity?{integrity:e.integrity}:{})});
    }
  });
  previousPost.call(app,'/api/writing-rubric-v2',async(req,res)=>{
    if(!studentSession(req))return res.status(403).json({error:'Student access required.'});
    res.set('Cache-Control','no-store');
    res.json({ok:true,...rubricSummary()});
  });
}

express.application.post=function englishGateWritingRubricPost(route,...handlers){
  install(this);
  return previousPost.call(this,route,...handlers);
};

require('./reading-listening-separation-bootstrap.js');
