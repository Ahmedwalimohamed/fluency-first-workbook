const express=require('express');
const jwt=require('jsonwebtoken');

const nativeGet=express.application.get;
const nativePost=express.application.post;
const installedApps=new WeakSet();

const SENSITIVE_PATH=/(^|\/)(?:\.env(?:\..*)?|\.git(?:\/|$)|\.svn(?:\/|$)|\.ssh(?:\/|$)|\.vscode(?:\/|$)|wp-admin(?:\/|$)|wp-config\.php$|phpinfo\.php$|storage\/logs(?:\/|$)|actuator(?:\/|$)|_vti_pvt(?:\/|$)|server\.key$|secrets?\.json$|user_secrets\.ya?ml$|docker-compose\.ya?ml$|\.npmrc$|\.bash_history$|(?:backup|database|database_backup|dump)(?:\.[a-z0-9._-]+)?$)/i;
const SENSITIVE_EXTENSION=/\.(?:sql|bak|old|orig|save|zip|tar|tgz|gz|7z|key|pem|log|sqlite|sqlite3|db|php|conf|ini|ya?ml)$/i;

function securityHeaders(req,res,next){
  res.set({
    'X-Content-Type-Options':'nosniff',
    'X-Frame-Options':'SAMEORIGIN',
    'Referrer-Policy':'strict-origin-when-cross-origin',
    'Permissions-Policy':'camera=(), geolocation=(), microphone=(self)'
  });
  if(SENSITIVE_PATH.test(req.path)||SENSITIVE_EXTENSION.test(req.path)){
    res.set('Cache-Control','no-store');
    return res.status(404).type('text/plain').send('Not found');
  }
  next();
}

function adminSession(req){
  try{
    const token=req.cookies?.ff_session||'';
    const user=jwt.verify(token,process.env.JWT_SECRET);
    return user?.role==='admin'?user:null;
  }catch{return null}
}
function cleanIssue(x){return{code:String(x?.code||'').slice(0,80),severity:String(x?.severity||'').slice(0,20),message:String(x?.message||'').slice(0,500),fix:String(x?.fix||'').slice(0,500)}}
function extractJson(text){
  const raw=String(text||'').trim();
  try{return JSON.parse(raw)}catch{}
  const match=raw.match(/\{[\s\S]*\}/);
  if(match){try{return JSON.parse(match[0])}catch{}}
  throw new Error('AI returned invalid JSON');
}
async function generateRepair(body){
  if(!process.env.OPENAI_API_KEY)throw new Error('OPENAI_API_KEY is not configured');
  const lesson=body?.lesson||{},issues=Array.isArray(body?.issues)?body.issues.map(cleanIssue).slice(0,12):[];
  const lessonNumber=Math.max(1,Math.min(44,Number(body?.lessonNumber)||1));
  const allowed=['vocabulary','reading','listening','grammar','writing','objective','speaking'];
  const requested=allowed.includes(String(body?.component||''))?String(body.component):'vocabulary';
  const prompt=`You are the EnglishGate CEFR + ESL surgical content repair engine.\n\nRepair ONLY the requested component. Preserve the lesson topic, learning outcome, names, facts, level, and all non-broken content. Do not regenerate the whole lesson.\n\nTarget level: A1 beginner. Lesson number: ${lessonNumber}. Component: ${requested}.\n\nQuality rules:\n- Use CEFR A1 communicative ability and established ESL pedagogy.\n- For A1 vocabulary, test USE IN CONTEXT, not dictionary definitions. Prefer situation→word, sentence completion, contextual choice, function/action, and simple recall.\n- Reading questions must be directly answerable from the supplied text.\n- Listening must sound like natural spoken English with coherent turns and consistent speakers.\n- Grammar must have one defensible answer per auto-graded item.\n- Writing must be short, scaffolded, useful, and student-facing; never expose teacher/developer meta language.\n- Do not invent new business claims, people, or facts unrelated to the lesson.\n- Keep instructions at beginner-friendly reading level.\n- Return valid JSON only.\n\nReturn this exact top-level shape:\n{\n  "component":"${requested}",\n  "summary":"one sentence explaining what was fixed",\n  "changes":["short change note"],\n  "replacement":{},\n  "selfAudit":{"cefrFit":0,"pedagogy":0,"assessment":0,"naturalness":0,"antiSlop":0,"overall":0,"remainingIssues":[]}\n}\n\nFor vocabulary replacement use {"items":[{"q":"...","options":["..."],"answer":"...","tag":"vocabulary:context-use"}]} with 10 items where possible. Each MCQ must have exactly one correct answer and 3-4 concise options.\n\nFlagged issues:\n${JSON.stringify(issues)}\n\nCurrent lesson source:\n${JSON.stringify(lesson)}`;
  const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_REPAIR_MODEL||'gpt-5-mini',messages:[{role:'system',content:'Return JSON only. Make conservative, surgical ESL corrections.'},{role:'user',content:prompt}],response_format:{type:'json_object'}})});
  if(!r.ok){const detail=await r.text();throw new Error(`OpenAI repair ${r.status}: ${detail.slice(0,400)}`)}
  const data=await r.json();
  const text=data?.choices?.[0]?.message?.content||'';
  const result=extractJson(text);
  if(!result||typeof result!=='object'||!result.replacement)throw new Error('AI repair response is incomplete');
  return result;
}

function installBuildRoute(app){
  if(installedApps.has(app))return;
  installedApps.add(app);
  app.use(securityHeaders);
  nativeGet.call(app,'/health',(req,res)=>{
    res.set('Cache-Control','no-store');
    res.status(200).json({ok:true,service:'englishgate'});
  });
  nativeGet.call(app,'/api/build',(req,res)=>{
    res.set('Cache-Control','no-store');
    res.json({
      environment:process.env.RAILWAY_ENVIRONMENT_NAME||process.env.NODE_ENV||'production',
      commit:String(process.env.RAILWAY_GIT_COMMIT_SHA||process.env.GIT_COMMIT_SHA||'local').slice(0,7),
      commitFull:String(process.env.RAILWAY_GIT_COMMIT_SHA||process.env.GIT_COMMIT_SHA||'local'),
      deploymentId:process.env.RAILWAY_DEPLOYMENT_ID||'',
      service:process.env.RAILWAY_SERVICE_NAME||'',
      project:process.env.RAILWAY_PROJECT_NAME||''
    });
  });
  nativePost.call(app,'/api/content-repair',async(req,res)=>{
    if(!adminSession(req))return res.status(403).json({error:'Admin access required.'});
    try{
      const result=await generateRepair(req.body||{});
      res.set('Cache-Control','no-store');
      res.json({ok:true,proposal:result});
    }catch(e){
      console.error('content repair error',e.message);
      res.status(502).json({error:'AI correction could not be generated.',detail:String(e.message||'').slice(0,300)});
    }
  });
}

express.application.get=function englishGateBuildAwareGet(route,...handlers){
  installBuildRoute(this);
  return nativeGet.call(this,route,...handlers);
};
express.application.post=function englishGateBuildAwarePost(route,...handlers){
  installBuildRoute(this);
  return nativePost.call(this,route,...handlers);
};

require('./school-platform-bootstrap.js');
