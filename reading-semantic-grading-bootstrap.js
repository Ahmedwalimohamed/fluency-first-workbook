const express=require('express');
const jwt=require('jsonwebtoken');

const nativePost=express.application.post;
const installed=new WeakSet();

function studentSession(req){
  try{
    const user=jwt.verify(req.cookies?.ff_session||'',process.env.JWT_SECRET);
    return user?.role==='student'?user:null;
  }catch{return null}
}
function extractJson(text){
  const raw=String(text||'').trim();
  try{return JSON.parse(raw)}catch{}
  const match=raw.match(/\{[\s\S]*\}/);
  if(match){try{return JSON.parse(match[0])}catch{}}
  throw new Error('Semantic grader returned invalid JSON');
}
function clean(value,max=8000){return String(value||'').trim().slice(0,max)}
function normalizeItems(value){
  if(!Array.isArray(value))return[];
  return value.slice(0,12).map((item,index)=>({
    index:Number.isInteger(Number(item?.index))?Number(item.index):index,
    question:clean(item?.question,700),
    expected:clean(item?.expected,700),
    response:clean(item?.response,1800)
  })).filter(x=>x.question&&x.expected);
}
async function gradeReading(body){
  if(!process.env.OPENAI_API_KEY)throw new Error('OPENAI_API_KEY is not configured');
  const passage=clean(body?.passage,16000),items=normalizeItems(body?.items);
  if(!passage||!items.length)throw Object.assign(new Error('Reading grading input is incomplete.'),{status:400});
  const prompt=`You are EnglishGate's strict but fair ESL reading-comprehension grader. Grade ONLY whether each learner response communicates the core meaning required by the passage and official answer.\n\nRules:\n- Accept valid paraphrases and different wording.\n- Ignore spelling, grammar, punctuation, and style errors unless they make the meaning unclear.\n- Do NOT require exact wording from the official answer.\n- A response can be shorter or longer than the official answer.\n- Mark incorrect if it contradicts the passage, gives a different idea, is too vague to show comprehension, or omits an essential part of a multi-part answer.\n- Do not award credit merely because some individual words overlap.\n- Judge each answer independently from the passage.\n- Return JSON only.\n\nReturn exactly:\n{"results":[{"index":0,"correct":true,"reason":"brief learner-friendly reason"}]}\n\nPASSAGE:\n${passage}\n\nQUESTIONS AND RESPONSES:\n${JSON.stringify(items)}`;
  const r=await fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      model:process.env.OPENAI_READING_GRADER_MODEL||process.env.OPENAI_AUDIT_MODEL||'gpt-5-mini',
      messages:[
        {role:'system',content:'You are a conservative ESL reading-comprehension grader. Accept genuine paraphrase, but do not guess missing meaning. Return JSON only.'},
        {role:'user',content:prompt}
      ],
      response_format:{type:'json_object'}
    })
  });
  if(!r.ok){const detail=await r.text();throw new Error(`Reading semantic grader ${r.status}: ${detail.slice(0,400)}`)}
  const data=await r.json(),parsed=extractJson(data?.choices?.[0]?.message?.content||'');
  const byIndex=new Map((Array.isArray(parsed?.results)?parsed.results:[]).map(x=>[Number(x?.index),x]));
  return items.map(item=>{
    const result=byIndex.get(item.index);
    if(!result||typeof result.correct!=='boolean')throw new Error('Semantic grader returned an incomplete result.');
    return {index:item.index,correct:Boolean(result.correct),reason:clean(result.reason,300)};
  });
}
function install(app){
  if(installed.has(app))return;
  installed.add(app);
  nativePost.call(app,'/api/workbook-activities/grade-reading',async(req,res)=>{
    if(!studentSession(req))return res.status(403).json({error:'Student access required.'});
    try{
      const results=await gradeReading(req.body||{});
      res.set('Cache-Control','no-store');
      res.json({ok:true,results});
    }catch(e){
      const status=Number(e?.status)||502;
      console.error('Reading semantic grading error:',String(e?.message||e).slice(0,500));
      res.status(status).json({error:status===400?String(e.message):'Reading answers could not be checked semantically.'});
    }
  });
}

express.application.post=function readingSemanticPost(route,...handlers){
  install(this);
  return nativePost.call(this,route,...handlers);
};

require('./reading-listening-separation-bootstrap.js');
