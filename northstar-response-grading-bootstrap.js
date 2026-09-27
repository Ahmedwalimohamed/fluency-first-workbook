const express=require('express');
const jwt=require('jsonwebtoken');

const previousPost=express.application.post;
const installed=new WeakSet();
const TYPE_SAFE_URL=process.env.TYPESAFE_API_URL||'https://api.typesafe.ai/v1/systemone';
const TYPE_SAFE_MODEL=process.env.TYPESAFE_MODEL||'jev-latest';
const VERSION='englishgate-northstar-teaching-v2';
const MIN_CONFIDENCE=0.55;
const MIN_TEACH_CONFIDENCE=0.35;

function studentSession(req){
  try{
    const user=jwt.verify(req.cookies?.ff_session||'',process.env.JWT_SECRET);
    return user?.role==='student'?user:null;
  }catch{return null}
}
function clean(value,max=4000){return String(value||'').trim().slice(0,max)}
function answerFor(data,id){
  const a=data?.answers?.[id]||data?.[id]||null;
  const choice=String(a?.choice||a?.answer||a?.value||'').toLowerCase().trim();
  if(!['meets','revise','not_applicable'].includes(choice))return null;
  const confidence=Number(a?.confidence);
  const probability=Number(a?.probabilities?.[choice]);
  const c=Number.isFinite(confidence)&&confidence>=0&&confidence<=1?confidence:null;
  const p=Number.isFinite(probability)&&probability>=0&&probability<=1?probability:null;
  return {choice,confidence:c!=null&&p!=null?Math.min(c,p):(p??c)};
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
        last=new Error(`Jev Northstar grader ${r.status}: ${detail}`);
        if(![429,529].includes(r.status))throw last;
        if(attempt<2)await new Promise(resolve=>setTimeout(resolve,350*(2**attempt)));
      }catch(e){
        last=e;
        if(e?.name==='AbortError')throw new Error('Jev Northstar grader timed out.');
        if(attempt>=2)throw e;
      }
    }
    throw last||new Error('Jev Northstar grader failed.');
  }finally{clearTimeout(timeout)}
}
function questionsFor(phase){
  const criteria={
    meets:'The learner response satisfies this dimension for the supplied task and target language.',
    revise:'There is a meaningful problem in this dimension that should be corrected before the learner progresses.',
    not_applicable:'This dimension is genuinely not required by the supplied task.'
  };
  return {
    task_fit:{type:'choice',instructions:'Judge whether the response directly answers the actual learner task and communicates the required idea. Do not pass merely because something was typed.',criteria},
    target_form:{type:'choice',instructions:`Judge whether the response uses the lesson target form accurately enough for a ${phase} activity. Treat an incorrect comparative, verb form, quantifier, collocation, or invented/misused word inside the target pattern as revise. Do not reward copying the sentence frame when the language inside it is wrong.`,criteria},
    word_choice:{type:'choice',instructions:'Judge whether key word choices fit the intended meaning. Mark revise when a real English word, typo-like form, or near-looking word changes the meaning or makes the target expression wrong.',criteria},
    clarity:{type:'choice',instructions:'Judge whether the response is understandable as written. Minor harmless punctuation or spelling errors may pass, but errors that create a wrong or unclear meaning require revision.',criteria}
  };
}
function feedbackFor(decisions,phase){
  if(decisions.task_fit?.choice==='revise')return 'Answer the task directly and make the meaning match the prompt.';
  if(decisions.target_form?.choice==='revise')return 'Check the lesson grammar pattern and correct the target form before continuing.';
  if(decisions.word_choice?.choice==='revise')return 'Check the key word choice. One word does not fit the meaning or form yet.';
  if(decisions.clarity?.choice==='revise')return 'Rewrite the sentence so the meaning is immediately clear.';
  return phase==='CHANGE'?'Your change fits the task and target language.':'Your response communicates the task successfully.';
}
function levenshtein(a,b){
  const x=String(a||''),y=String(b||'');
  const row=Array.from({length:y.length+1},(_,i)=>i);
  for(let i=1;i<=x.length;i++){
    let prev=row[0];row[0]=i;
    for(let j=1;j<=y.length;j++){
      const hold=row[j];
      row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(x[i-1]===y[j-1]?0:1));
      prev=hold;
    }
  }
  return row[y.length]
}
function comparativeBase(word){
  const irregular={better:'good',worse:'bad'};
  if(irregular[word])return irregular[word];
  if(/ier$/.test(word))return word.slice(0,-3)+'y';
  if(/er$/.test(word)){
    let base=word.slice(0,-2);
    if(base.length>2&&base.at(-1)===base.at(-2))base=base.slice(0,-1);
    return base
  }
  return ''
}
function comparativeCorrection(state){
  const context=[state.learnerTask,state.model,state.targetLanguage].join(' ').toLowerCase();
  if(!(/\bthan\b|comparative|comparison/.test(context)))return null;
  const match=state.learnerResponse.match(/\b([A-Za-z][A-Za-z'-]*)\s+than\b/i);
  if(!match)return null;
  const typed=match[1].toLowerCase();
  const candidates=['sweeter','spicier','saltier','tastier','healthier','cheaper','fresher','hotter','colder','bigger','smaller','faster','slower','easier','harder','safer','cleaner','quieter','louder','warmer','cooler','stronger','weaker','older','younger','longer','shorter','higher','lower','better','worse'];
  let best=null;
  for(const candidate of candidates){
    if(candidate===typed)continue;
    const distance=levenshtein(typed,candidate);
    if(!best||distance<best.distance)best={candidate,distance};
  }
  if(!best)return null;
  const limit=typed.length>=6?2:1;
  if(best.distance>limit)return null;
  const corrected=state.learnerResponse.replace(match[1],best.candidate);
  const base=comparativeBase(best.candidate);
  const pattern=base?`${base} → ${best.candidate}`:`Use ${best.candidate} before “than”.`;
  return {
    corrected,
    focusWord:match[1],
    replacement:best.candidate,
    rule:`In this comparison, the adjective needs the comparative form before “than”. ${pattern}.`
  }
}
function primaryIssue(decisions,required){
  const revised=required
    .filter(id=>decisions[id]?.choice==='revise')
    .map(id=>({id,confidence:Number(decisions[id]?.confidence)||0}))
    .sort((a,b)=>b.confidence-a.confidence);
  return revised[0]||null
}
function teachingFor(state,decisions,required,lowConfidence){
  const issue=primaryIssue(decisions,required);
  const canTeach=issue&&issue.confidence>=MIN_TEACH_CONFIDENCE;
  if(!canTeach&&lowConfidence){
    return {
      mode:'diagnostic_probe',
      focus:'uncertain',
      title:'Let’s check the pattern together.',
      learnerResponse:state.learnerResponse,
      whatToFix:'I am not confident enough to call this answer right or wrong yet.',
      remember:state.targetLanguage||'Use the lesson pattern and keep the meaning clear.',
      example:state.model||'',
      nextStep:'Compare your sentence with the pattern. Change only the part you are unsure about, then check again.'
    }
  }
  const focus=issue?.id||'clarity';
  const correction=(focus==='target_form'||focus==='word_choice')?comparativeCorrection(state):null;
  const common={
    mode:'teach_retry',focus,learnerResponse:state.learnerResponse,
    suggestedCorrection:correction?.corrected||'',
    example:state.model||''
  };
  if(focus==='task_fit')return {...common,
    title:'Make the sentence do the task.',
    whatToFix:'Your response does not fully match what the activity asks you to say.',
    remember:`Task: ${state.learnerTask}`,
    nextStep:'Keep your own meaning, but make the sentence answer this task directly. Then check again.'
  };
  if(focus==='target_form')return {...common,
    title:'Fix the grammar pattern.',
    whatToFix:correction?`The comparison form “${correction.focusWord}” needs to be “${correction.replacement}”.`:'The target grammar form is not correct yet.',
    remember:correction?.rule||state.targetLanguage||'Use the lesson grammar pattern accurately.',
    nextStep:'Keep your idea. Correct only the grammar form, then check the sentence again.'
  };
  if(focus==='word_choice')return {...common,
    title:'Fix one word.',
    whatToFix:correction?`“${correction.focusWord}” does not fit here. Use “${correction.replacement}”.`:'One key word does not fit the meaning or the form needed in this sentence.',
    remember:correction?.rule||state.targetLanguage||'Check both the meaning of the word and the form the sentence needs.',
    nextStep:'Change only the problem word, then check your sentence again.'
  };
  return {...common,
    title:'Make the meaning clearer.',
    whatToFix:'The sentence is not clear enough as written.',
    remember:state.targetLanguage||'Keep the sentence simple, complete, and easy to understand.',
    nextStep:'Rewrite only the unclear part, then check again.'
  }
}
async function grade(body){
  const lessonId=clean(body?.lessonId,100),phase=clean(body?.phase,20).toUpperCase(),prompt=clean(body?.prompt,1200),response=clean(body?.response,2200);
  if(!/^su-b2-l\d+$/.test(lessonId))throw Object.assign(new Error('Northstar semantic grading is currently enabled for B2 Upper Intermediate.'),{status:423});
  if(!['CHANGE','USE'].includes(phase))throw Object.assign(new Error('Only CHANGE and USE responses use this grading gate.'),{status:400});
  if(!prompt||!response)throw Object.assign(new Error('Task and learner response are required.'),{status:400});
  if(response.split(/\s+/).filter(Boolean).length<3)throw Object.assign(new Error('Write a complete response before checking it.'),{status:400});
  const state={
    purpose:'EnglishGate B2 Northstar short-response grading and targeted teaching',
    version:VERSION,
    phase,
    lessonId,
    lessonTitle:clean(body?.lessonTitle,200),
    learnerTask:prompt,
    model:clean(body?.model,900),
    targetLanguage:clean(body?.targetLanguage,900),
    targetVocabulary:Array.isArray(body?.targetVocabulary)?body.targetVocabulary.slice(0,24).map(x=>clean(typeof x==='string'?x:(x?.word||x?.term||''),120)).filter(Boolean):[],
    learnerResponse:response,
    rules:[
      'Judge the supplied learner response, not effort, length, or sentence shape alone.',
      'CHANGE must accurately reuse or transform the target language; matching the model frame is not enough.',
      'Do not silently correct the learner response before judging it.',
      'Do not pass incorrect lexical substitutions simply because they resemble a valid word or grammar ending.',
      'Minor errors may pass only when they do not break the task, target form, key word choice, or meaning.',
      'When confidence is insufficient, do not pretend certainty; route to a diagnostic teaching prompt instead.'
    ]
  };
  const data=await callJev(state,questionsFor(phase)),decisions={};
  for(const id of ['task_fit','target_form','word_choice','clarity']){
    const d=answerFor(data,id);if(!d)throw new Error(`Jev returned an incomplete ${id} decision.`);decisions[id]=d;
  }
  const required=['task_fit','word_choice','clarity',...(phase==='CHANGE'?['target_form']:[])];
  const lowConfidence=required.some(id=>decisions[id].confidence==null||decisions[id].confidence<MIN_CONFIDENCE);
  const failed=required.some(id=>decisions[id].choice!=='meets');
  const pass=!lowConfidence&&!failed;
  const teaching=pass?null:teachingFor(state,decisions,required,lowConfidence);
  const status=pass?'passed':teaching?.mode==='diagnostic_probe'?'diagnostic_probe':'needs_revision';
  const feedback=pass?feedbackFor(decisions,phase):(teaching?.whatToFix||feedbackFor(decisions,phase));
  return {pass,status,phase,feedback,teaching,decisions,threshold:{confidence:MIN_CONFIDENCE,teachingConfidence:MIN_TEACH_CONFIDENCE},model:String(data?.model||TYPE_SAFE_MODEL),version:VERSION};
}
function install(app){
  if(installed.has(app))return;
  installed.add(app);
  previousPost.call(app,'/api/northstar-response-grade',async(req,res)=>{
    if(!studentSession(req))return res.status(403).json({error:'Student access required.'});
    try{
      const result=await grade(req.body||{});
      res.set('Cache-Control','no-store');
      res.json({ok:true,...result});
    }catch(e){
      const status=Number(e?.status)||((e?.code==='JEV_NOT_CONFIGURED')?503:502);
      console.error('EnglishGate Northstar semantic grading error:',String(e?.message||e).slice(0,500));
      res.status(status).json({error:status===503?'AI response grading is temporarily unavailable. Your answer has not been marked correct.':String(e?.message||'Response could not be graded.'),version:VERSION});
    }
  });
}

express.application.post=function northstarSemanticPost(route,...handlers){
  install(this);
  return previousPost.call(this,route,...handlers);
};

require('./reading-semantic-grading-bootstrap.js');
