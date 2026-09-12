const express=require('express');
const jwt=require('jsonwebtoken');
const {Pool}=require('pg');

const nativePost=express.application.post;
const installed=new WeakSet();
const pool=new Pool({connectionString:process.env.DATABASE_URL});

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
function clone(value){return value===undefined?null:JSON.parse(JSON.stringify(value))}
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
async function ensureSchema(){
  await pool.query(`create table if not exists content_patches(
    id bigserial primary key,
    course_id text not null default 'speakup-a1',
    lesson_number integer not null,
    component text not null,
    replacement jsonb not null,
    summary text not null default '',
    self_audit jsonb,
    created_by text,
    created_at timestamptz not null default now(),
    is_active boolean not null default true,
    rolled_back_at timestamptz
  )`);
  await pool.query('alter table content_patches add column if not exists instruction text');
  await pool.query('alter table content_patches add column if not exists target_scope text');
  await pool.query('alter table content_patches add column if not exists before_snapshot jsonb');
  await pool.query('alter table content_patches add column if not exists parent_patch_id bigint');
  await pool.query('create index if not exists content_patches_editor_idx on content_patches(course_id,lesson_number,component,is_active,created_at desc)');
}
async function generateEdit(body){
  if(!process.env.OPENAI_API_KEY)throw new Error('OPENAI_API_KEY is not configured');
  const courseId=String(body?.courseId||'').trim().slice(0,80),lessonNumber=Number(body?.lessonNumber),targetPath=String(body?.targetPath||'').trim(),scope=String(body?.scope||'activity').trim(),instruction=String(body?.instruction||'').trim(),source=body?.source,context=body?.lessonContext||{};
  if(!courseId||!Number.isInteger(lessonNumber)||lessonNumber<1||lessonNumber>500)throw new Error('Choose a valid course and lesson.');
  if(!validPath(targetPath))throw new Error('Choose a supported content target.');
  if(instruction.length<3||instruction.length>3000)throw new Error('Write a short instruction describing the change.');
  const serialized=JSON.stringify(source);
  if(!serialized||serialized.length>120000)throw new Error('Selected content is too large for one edit.');
  const prompt=`You are EnglishGate's AI Content Editor. Edit ONLY the selected ESL content according to the administrator's instruction.\n\nADMIN INSTRUCTION:\n${instruction}\n\nCONTEXT:\nCourse: ${courseId}\nLesson: ${lessonNumber}\nLesson title: ${String(context.title||'').slice(0,180)}\nCEFR level: ${String(context.level||'').slice(0,40)}\nLesson outcome: ${String(context.outcome||'').slice(0,500)}\nEdit scope: ${scope}\nTarget path: ${targetPath}\n\nNON-NEGOTIABLE RULES:\n- Return a replacement for exactly the selected content, not a different lesson or unrelated material.\n- Preserve the source JSON shape and fields unless the instruction explicitly requires changing content inside them.\n- Preserve lesson identity, level, topic, names, factual context, and learning purpose unless the administrator explicitly asks to change them.\n- Follow CEFR and established ESL pedagogy.\n- Reading questions must be answerable from the supplied reading unless the administrator explicitly requests another assessment type.\n- Auto-graded questions must have one defensible answer. The answer must exactly match an option when options exist.\n- Keep distractors plausible but clearly wrong from the learner's level/context.\n- Do not expose teacher/developer instructions to students.\n- Remove generic AI filler and repetitive wording.\n- Do not add claims, accreditation, statistics, or facts not supported by the lesson.\n- Return JSON only.\n\nReturn exactly:\n{\n  "summary":"short description of the edit",\n  "changes":["short change note"],\n  "replacement": <same JSON type and structure as SELECTED CONTENT>,\n  "quality":{"cefrAligned":true,"answerKeysChecked":true,"sourceGrounded":true}\n}\n\nSELECTED CONTENT:\n${serialized}`;
  const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_CONTENT_EDITOR_MODEL||process.env.OPENAI_REPAIR_MODEL||'gpt-5-mini',messages:[{role:'system',content:'You are a conservative ESL content editor. Follow the admin instruction exactly and return JSON only.'},{role:'user',content:prompt}],response_format:{type:'json_object'}})});
  if(!response.ok){const detail=await response.text();throw new Error(`OpenAI editor ${response.status}: ${detail.slice(0,400)}`)}
  const data=await response.json(),result=extractJson(data?.choices?.[0]?.message?.content||'');
  if(!Object.prototype.hasOwnProperty.call(result||{},'replacement'))throw new Error('AI edit response is incomplete');
  const problems=structuralProblems(source,result.replacement);
  return {courseId,lessonNumber,targetPath,scope,instruction,summary:String(result.summary||'AI content edit').slice(0,500),changes:Array.isArray(result.changes)?result.changes.map(x=>String(x).slice(0,300)).slice(0,12):[],replacement:result.replacement,quality:result.quality||{},problems};
}
function install(app){
  if(installed.has(app))return;installed.add(app);
  nativePost.call(app,'/api/content-editor/generate',async(req,res)=>{
    if(!superAdmin(req))return res.status(403).json({error:'EnglishGate Super Admin access required.'});
    try{const proposal=await generateEdit(req.body||{});res.set('Cache-Control','no-store');res.json({ok:true,proposal})}
    catch(e){console.error('AI content editor generation error:',e.message);res.status(502).json({error:'AI edit could not be generated.',detail:String(e.message||'').slice(0,300)})}
  });
  nativePost.call(app,'/api/content-editor/apply',async(req,res)=>{
    const admin=superAdmin(req);if(!admin)return res.status(403).json({error:'EnglishGate Super Admin access required.'});
    try{
      await ensureSchema();
      const courseId=String(req.body?.courseId||'').trim().slice(0,80),lessonNumber=Number(req.body?.lessonNumber),targetPath=String(req.body?.targetPath||'').trim(),scope=String(req.body?.scope||'activity').trim().slice(0,30),instruction=String(req.body?.instruction||'').trim().slice(0,3000),source=req.body?.source,replacement=req.body?.replacement,summary=String(req.body?.summary||'AI content edit').slice(0,500);
      if(!courseId||!Number.isInteger(lessonNumber)||lessonNumber<1||lessonNumber>500||!validPath(targetPath))return res.status(400).json({error:'Invalid content target.'});
      const problems=structuralProblems(source,replacement);if(problems.length)return res.status(400).json({error:'Edit failed structural validation.',problems});
      const size=JSON.stringify(replacement)?.length||0;if(!size||size>140000)return res.status(400).json({error:'Replacement content is invalid or too large.'});
      const client=await pool.connect();
      try{
        await client.query('begin');
        const current=await client.query('select id from content_patches where course_id=$1 and lesson_number=$2 and component=$3 and is_active=true order by created_at desc,id desc limit 1 for update',[courseId,lessonNumber,targetPath]);
        const parent=current.rows[0]?.id||null;
        if(parent)await client.query('update content_patches set is_active=false,rolled_back_at=now() where id=$1',[parent]);
        const q=await client.query(`insert into content_patches(course_id,lesson_number,component,replacement,summary,self_audit,created_by,instruction,target_scope,before_snapshot,parent_patch_id) values($1,$2,$3,$4::jsonb,$5,$6::jsonb,$7,$8,$9,$10::jsonb,$11) returning id,created_at`,[courseId,lessonNumber,targetPath,JSON.stringify(replacement),summary,JSON.stringify(req.body?.quality||{}),String(admin.id||admin.username||'admin'),instruction,scope,JSON.stringify(clone(source)),parent]);
        await client.query('commit');
        res.set('Cache-Control','no-store');res.json({ok:true,patchId:q.rows[0].id,createdAt:q.rows[0].created_at,parentPatchId:parent});
      }catch(e){await client.query('rollback');throw e}finally{client.release()}
    }catch(e){console.error('AI content editor apply error:',e.message);res.status(500).json({error:'The edit could not be applied.'})}
  });
  nativePost.call(app,'/api/content-editor/undo',async(req,res)=>{
    const admin=superAdmin(req);if(!admin)return res.status(403).json({error:'EnglishGate Super Admin access required.'});
    try{
      await ensureSchema();
      const courseId=String(req.body?.courseId||'').trim().slice(0,80),lessonNumber=Number(req.body?.lessonNumber),targetPath=String(req.body?.targetPath||'').trim();
      if(!courseId||!Number.isInteger(lessonNumber)||!validPath(targetPath))return res.status(400).json({error:'Invalid content target.'});
      const client=await pool.connect();
      try{
        await client.query('begin');
        const current=await client.query('select id,parent_patch_id from content_patches where course_id=$1 and lesson_number=$2 and component=$3 and is_active=true order by created_at desc,id desc limit 1 for update',[courseId,lessonNumber,targetPath]);
        if(!current.rowCount){await client.query('rollback');return res.status(404).json({error:'There is no active edit to undo.'})}
        const row=current.rows[0];
        await client.query('update content_patches set is_active=false,rolled_back_at=now() where id=$1',[row.id]);
        let restored=null;
        if(row.parent_patch_id){const prev=await client.query('update content_patches set is_active=true,rolled_back_at=null where id=$1 returning id',[row.parent_patch_id]);restored=prev.rows[0]?.id||null}
        await client.query('commit');res.json({ok:true,undonePatchId:row.id,restoredPatchId:restored});
      }catch(e){await client.query('rollback');throw e}finally{client.release()}
    }catch(e){console.error('AI content editor undo error:',e.message);res.status(500).json({error:'Undo failed.'})}
  });
}

express.application.post=function aiContentEditorPost(route,...handlers){
  install(this);
  return nativePost.call(this,route,...handlers);
};

require('./build-info-bootstrap.js');
