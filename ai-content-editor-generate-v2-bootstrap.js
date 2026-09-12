const express=require('express');
const jwt=require('jsonwebtoken');

const nativePost=express.application.post;
const installed=new WeakSet();

function superAdmin(req){
  try{
    const user=jwt.verify(req.cookies?.ff_session||'',process.env.JWT_SECRET);
    return user?.role==='admin'&&!user?.schoolId?user:null;
  }catch{return null}
}
function extractJson(text){
  const raw=String(text||'').trim();
  try{return JSON.parse(raw)}catch{}
  const match=raw.match(/\{[\s\S]*\}/);
  if(match){try{return JSON.parse(match[0])}catch{}}
  throw new Error('AI returned invalid JSON');
}
function valueType(value){return Array.isArray(value)?'array':value===null?'null':typeof value}
function validPath(path){
  const p=String(path||'').trim();
  if(!p||p.length>160||/(^|\.)(?:__proto__|prototype|constructor)(\.|$)/.test(p))return false;
  if(p==='lesson'||p==='outcome'||p==='performance')return true;
  return /^(?:vocabulary|listening|reading|grammar|writing|review|expressions)(?:\.(?:items|questions|tasks))?(?:\.\d+)?$/.test(p);
}
function walk(value,fn){
  if(Array.isArray(value)){value.forEach(x=>walk(x,fn));return}
  if(!value||typeof value!=='object')return;
  fn(value);Object.values(value).forEach(x=>walk(x,fn));
}
function structuralProblems(source,replacement){
  const problems=[];
  if(valueType(source)!==valueType(replacement))problems.push('The AI changed the root content type.');
  let count=0;
  walk(replacement,obj=>{
    if(++count>500)return;
    if(typeof obj.q==='string'||Array.isArray(obj.options)){
      if(typeof obj.q!=='string'||obj.q.trim().length<2)problems.push('A question is missing its question text.');
      if(Array.isArray(obj.options)){
        if(obj.options.length<2||obj.options.length>6)problems.push('A multiple-choice question must have 2–6 options.');
        if(new Set(obj.options.map(String)).size!==obj.options.length)problems.push('A multiple-choice question has duplicate options.');
        if(Object.prototype.hasOwnProperty.call(obj,'answer')&&!obj.options.some(x=>String(x)===String(obj.answer)))problems.push('A multiple-choice answer does not match an option.');
      }
    }
    if(Array.isArray(obj.choices)&&Object.prototype.hasOwnProperty.call(obj,'answer')){
      if(obj.choices.length<2||obj.choices.length>6)problems.push('A choice item must have 2–6 choices.');
      if(!obj.choices.some(x=>String(x)===String(obj.answer)))problems.push('A choice item answer does not match a choice.');
    }
  });
  return [...new Set(problems)].slice(0,20);
}
async function generateEdit(body){
  if(!process.env.OPENAI_API_KEY)throw new Error('OPENAI_API_KEY is not configured');
  const courseId=String(body?.courseId||'').trim().slice(0,80);
  const lessonNumber=Number(body?.lessonNumber);
  const targetPath=String(body?.targetPath||'').trim();
  const scope=String(body?.scope||'activity').trim();
  const instruction=String(body?.instruction||'').trim();
  const source=body?.source;
  const context=body?.lessonContext||{};
  if(!courseId||!Number.isInteger(lessonNumber)||lessonNumber<1||lessonNumber>500)throw Object.assign(new Error('Choose a valid course and lesson.'),{status:400});
  if(!validPath(targetPath))throw Object.assign(new Error('Choose a supported content target.'),{status:400});
  if(instruction.length<3)throw Object.assign(new Error('Write what you want AI to change.'),{status:400});
  if(instruction.length>20000)throw Object.assign(new Error('Your edit instruction is too long. Keep it under 20,000 characters.'),{status:400});
  const serialized=JSON.stringify(source);
  if(!serialized||serialized.length>120000)throw Object.assign(new Error('Selected content is too large for one edit.'),{status:400});
  const prompt=`You are EnglishGate's AI Content Editor. Edit ONLY the selected ESL content according to the administrator's instruction.\n\nADMIN INSTRUCTION:\n${instruction}\n\nCONTEXT:\nCourse: ${courseId}\nLesson: ${lessonNumber}\nLesson title: ${String(context.title||'').slice(0,180)}\nCEFR level: ${String(context.level||'').slice(0,40)}\nLesson outcome: ${String(context.outcome||'').slice(0,500)}\nEdit scope: ${scope}\nTarget path: ${targetPath}\n\nNON-NEGOTIABLE RULES:\n- Return a replacement for exactly the selected content, not a different lesson or unrelated material.\n- Preserve the source JSON shape and fields unless the instruction explicitly requires changing content inside them.\n- Preserve lesson identity, level, topic, names, factual context, and learning purpose unless the administrator explicitly asks to change them.\n- Follow CEFR and established ESL pedagogy.\n- Reading questions must be answerable from the supplied reading unless the administrator explicitly requests another assessment type.\n- Auto-graded questions must have one defensible answer. The answer must exactly match an option when options exist.\n- Keep distractors plausible but clearly wrong from the learner's level/context.\n- Do not expose teacher/developer instructions to students.\n- Remove generic AI filler and repetitive wording.\n- Do not add unsupported claims, statistics, accreditation, or facts.\n- Return JSON only.\n\nReturn exactly:\n{\n  "summary":"short description of the edit",\n  "changes":["short change note"],\n  "replacement": <same JSON type and structure as SELECTED CONTENT>,\n  "quality":{"cefrAligned":true,"answerKeysChecked":true,"sourceGrounded":true}\n}\n\nSELECTED CONTENT:\n${serialized}`;
  const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_CONTENT_EDITOR_MODEL||process.env.OPENAI_REPAIR_MODEL||'gpt-5-mini',messages:[{role:'system',content:'You are a conservative ESL content editor. Follow the admin instruction exactly and return JSON only.'},{role:'user',content:prompt}],response_format:{type:'json_object'}})});
  if(!response.ok){const detail=await response.text();throw new Error(`OpenAI editor ${response.status}: ${detail.slice(0,400)}`)}
  const data=await response.json();
  const result=extractJson(data?.choices?.[0]?.message?.content||'');
  if(!Object.prototype.hasOwnProperty.call(result||{},'replacement'))throw new Error('AI edit response is incomplete');
  return {courseId,lessonNumber,targetPath,scope,instruction,summary:String(result.summary||'AI content edit').slice(0,500),changes:Array.isArray(result.changes)?result.changes.map(x=>String(x).slice(0,300)).slice(0,12):[],replacement:result.replacement,quality:result.quality||{},problems:structuralProblems(source,result.replacement)};
}
function install(app){
  if(installed.has(app))return;installed.add(app);
  nativePost.call(app,'/api/content-editor/generate-v2',async(req,res)=>{
    if(!superAdmin(req))return res.status(403).json({error:'EnglishGate Super Admin access required.'});
    try{
      const proposal=await generateEdit(req.body||{});
      res.set('Cache-Control','no-store');
      res.json({ok:true,proposal});
    }catch(e){
      const status=Number(e?.status)||502;
      console.error('AI content editor v2 generation error:',e.message);
      res.status(status).json({error:status===400?String(e.message):'AI edit could not be generated.',detail:String(e.message||'').slice(0,500)});
    }
  });
}
express.application.post=function aiContentEditorV2Post(route,...handlers){
  install(this);
  return nativePost.call(this,route,...handlers);
};

require('./ai-content-editor-bootstrap.js');
