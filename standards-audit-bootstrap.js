const express=require('express');
const jwt=require('jsonwebtoken');

const nativePost=express.application.post;
const installed=new WeakSet();

function adminSession(req){
  try{
    const token=req.cookies?.ff_session||'';
    const user=jwt.verify(token,process.env.JWT_SECRET);
    return user?.role==='admin'?user:null;
  }catch{return null}
}
function extractJson(text){
  const raw=String(text||'').trim();
  try{return JSON.parse(raw)}catch{}
  const match=raw.match(/\{[\s\S]*\}/);
  if(match){try{return JSON.parse(match[0])}catch{}}
  throw new Error('Auditor returned invalid JSON');
}
function normalizeScore(v,max){
  const n=Number(v);
  return Number.isFinite(n)?Math.max(0,Math.min(max,n)):0;
}
function normalizeAudit(a){
  const scores={
    cefr:normalizeScore(a?.scores?.cefr,35),
    pedagogy:normalizeScore(a?.scores?.pedagogy,25),
    assessment:normalizeScore(a?.scores?.assessment,15),
    naturalness:normalizeScore(a?.scores?.naturalness,15),
    antiSlop:normalizeScore(a?.scores?.antiSlop,10)
  };
  const overall=Math.round(scores.cefr+scores.pedagogy+scores.assessment+scores.naturalness+scores.antiSlop);
  const issues=(Array.isArray(a?.issues)?a.issues:[]).slice(0,30).map(x=>({
    code:String(x?.code||'QUALITY_ISSUE').slice(0,80),
    severity:['INFO','MINOR','MODERATE','MAJOR','CRITICAL'].includes(String(x?.severity||'').toUpperCase())?String(x.severity).toUpperCase():'MODERATE',
    component:String(x?.component||'lesson').slice(0,40),
    evidence:String(x?.evidence||'').slice(0,700),
    message:String(x?.message||'').slice(0,700),
    fix:String(x?.fix||'').slice(0,700)
  }));
  const critical=issues.some(x=>x.severity==='CRITICAL');
  const major=issues.some(x=>x.severity==='MAJOR');
  let status=overall>=90?'PASS_EXCELLENT':overall>=80?'PASS':overall>=70?'REVIEW':overall>=50?'FIX':'REJECT';
  if(critical)status='REJECT';
  else if(major&&status.startsWith('PASS'))status='REVIEW';
  return {overall,status,scores,issues,criticalFailure:critical,summary:String(a?.summary||'').slice(0,1200),canDoFit:String(a?.canDoFit||'').slice(0,800),auditorVersion:'cefr-esl-semantic-v1'};
}
async function runAudit(body){
  if(!process.env.OPENAI_API_KEY)throw new Error('OPENAI_API_KEY is not configured');
  const lesson=body?.lesson||{};
  const lessonNumber=Math.max(1,Math.min(44,Number(body?.lessonNumber)||1));
  const prompt=`You are the EnglishGate independent lesson-quality auditor. AUDIT, do not rewrite. Inspect the actual learner-facing content deeply. Do not award points just because fields exist.\n\nTarget: CEFR A1. Lesson ${lessonNumber}.\n\nUse this exact weighted standard (100 points):\n1) CEFR ALIGNMENT 35: communicative can-do fit 10, vocabulary demand 6, grammar demand 6, text complexity 5, cognitive/task demand 5, learner independence 3.\n2) ESL PEDAGOGY 25: objective alignment 5, scaffolding 5, progression 5, meaningful context 4, instruction clarity 3, practice value 3.\n3) ASSESSMENT INTEGRITY 15: answer correctness 4, unique defensible answers 3, distractor quality 2, objective alignment 2, answer leakage 2, feedback/accepted-answer accuracy 2.\n4) NATURALNESS + COHERENCE 15: natural learner language, coherent reading/listening, consistent speakers, realistic examples, no broken or contradictory content.\n5) ANTI-SLOP 10: penalize generic filler, repetitive formulae, near-duplicate examples, empty motivation, predictable AI wording, needless restatement, placeholder/circular definitions.\n\nSkill rules:\n- Vocabulary: A1-A2 should primarily test use in context, not dictionary definitions. Definitions must be accurate, learner-friendly, non-circular, and easier than the target word.\n- Reading: coherent text; comprehension questions must be directly grounded in the passage; concrete comprehension before inference at A1.\n- Listening: natural spoken dialogue, coherent turns, consistent speaker identity, realistic language, and the task must require listening.\n- Speaking: move toward communicative use, not only repetition.\n- Writing: scaffold from controlled work toward a short authentic task; no teacher/developer meta text visible to learners.\n- Grammar: taught in context, clear form-meaning link, controlled practice before meaningful use.\n\nCritical failures: wrong answer key, materially incorrect teaching, serious CEFR mismatch, nonsensical/broken activity, materially wrong vocabulary definition, no defensible correct answer, multiple defensible answers when only one is accepted, or contradiction with the stated objective. A critical failure can NEVER pass. A MAJOR issue can NEVER receive PASS/PASS_EXCELLENT.\n\nBe skeptical. A lesson with unresolved issues should not display PASS EXCELLENT. Cite concrete evidence from the supplied lesson in each issue.\n\nReturn JSON only:\n{\n "scores":{"cefr":0,"pedagogy":0,"assessment":0,"naturalness":0,"antiSlop":0},\n "summary":"...",\n "canDoFit":"...",\n "issues":[{"code":"...","severity":"INFO|MINOR|MODERATE|MAJOR|CRITICAL","component":"objective|vocabulary|reading|listening|grammar|writing|speaking|assessment|lesson","evidence":"specific text or design evidence","message":"why it violates the standard","fix":"surgical correction"}]\n}\n\nACTUAL LESSON CONTENT:\n${JSON.stringify(lesson)}`;
  const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_AUDIT_MODEL||process.env.OPENAI_REPAIR_MODEL||'gpt-5-mini',messages:[{role:'system',content:'You are a strict independent CEFR/ESL quality auditor. Return JSON only. Never inflate scores.'},{role:'user',content:prompt}],response_format:{type:'json_object'}})});
  if(!r.ok){const detail=await r.text();throw new Error(`OpenAI audit ${r.status}: ${detail.slice(0,400)}`)}
  const data=await r.json();
  return normalizeAudit(extractJson(data?.choices?.[0]?.message?.content||''));
}
function install(app){
  if(installed.has(app))return;installed.add(app);
  nativePost.call(app,'/api/content-audit',async(req,res)=>{
    if(!adminSession(req))return res.status(403).json({error:'Admin access required.'});
    try{
      const audit=await runAudit(req.body||{});
      res.set('Cache-Control','no-store');
      res.json({ok:true,audit});
    }catch(e){
      console.error('content standards audit error',e.message);
      res.status(502).json({error:'Standards audit could not be completed.',detail:String(e.message||'').slice(0,300)});
    }
  });
}
express.application.post=function standardsAwarePost(route,...handlers){
  install(this);
  return nativePost.call(this,route,...handlers);
};
require('./public-assets-bootstrap.js');