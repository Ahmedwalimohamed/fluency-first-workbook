'use strict';

const fs=require('fs');
const vm=require('vm');
const path=require('path');
const {Pool}=require('pg');

const API_URL=process.env.TYPESAFE_API_URL||'https://api.typesafe.ai/v1/systemone';
const MODEL=process.env.TYPESAFE_MODEL||'jev-latest';
const API_KEY=String(process.env.TYPESAFE_API_KEY||'').trim();
const pool=new Pool({connectionString:process.env.DATABASE_URL});

if(!API_KEY){
  console.error('JEV_AUDIT_FATAL '+JSON.stringify({error:'TYPESAFE_API_KEY missing'}));
  process.exit(2);
}

function loadBlueprint(){
  const file=path.join(process.cwd(),'public','speakup-b2-blueprint.js');
  const code=fs.readFileSync(file,'utf8');
  const sandbox={window:{}};
  vm.runInNewContext(code,sandbox,{filename:file,timeout:5000});
  const lessons=sandbox.window.SPEAKUP_B2_BLUEPRINT;
  if(!Array.isArray(lessons)||!lessons.length)throw new Error('B2 blueprint not found');
  return JSON.parse(JSON.stringify(lessons));
}
function clone(v){return v===undefined?undefined:JSON.parse(JSON.stringify(v))}
function parts(p){return String(p||'').split('.').filter(Boolean)}
function setPath(root,targetPath,value){
  if(targetPath==='lesson'){
    const replacement=clone(value);
    Object.keys(root).forEach(k=>delete root[k]);
    Object.assign(root,replacement);
    return true;
  }
  const seg=parts(targetPath); if(!seg.length)return false;
  let cur=root;
  for(let i=0;i<seg.length-1;i++){
    const k=/^\d+$/.test(seg[i])?Number(seg[i]):seg[i];
    if(cur==null||cur[k]==null)return false;
    cur=cur[k];
  }
  const last=/^\d+$/.test(seg.at(-1))?Number(seg.at(-1)):seg.at(-1);
  if(cur==null)return false;
  cur[last]=clone(value); return true;
}
async function activePatches(){
  try{
    const q=await pool.query(`
      select id,course_id,lesson_number,component,replacement,summary,created_at
      from content_patches
      where course_id=$1 and is_active=true
      order by lesson_number,created_at,id
    `,['speakup-b2']);
    return q.rows;
  }catch(e){
    console.error('JEV_AUDIT_WARN '+JSON.stringify({warning:'Could not load active patches',detail:e.message}));
    return [];
  }
}
function applyPatches(lessons,patches){
  const applied=[];
  for(const p of patches){
    const lesson=lessons.find(l=>Number(l.number)===Number(p.lesson_number));
    if(!lesson)continue;
    const ok=setPath(lesson,String(p.component||''),p.replacement);
    if(ok)applied.push({id:p.id,lessonNumber:Number(p.lesson_number),component:p.component});
  }
  return applied;
}
function sourceFor(lesson,kind){
  return kind==='reading'?String(lesson.readingText||lesson.reading?.text||lesson.reading?.passage||''):
         kind==='listening'?String(lesson.audioScript||lesson.listening?.script||lesson.listening?.text||''):'';
}
function questionsFor(lesson){
  const qs=Array.isArray(lesson.questions)?lesson.questions:[];
  return qs.map((q,index)=>{
    const tag=String(q?.tag||'');
    const kind=tag.startsWith('reading:')?'reading':tag.startsWith('listening:')?'listening':'';
    if(!kind)return null;
    const designated=sourceFor(lesson,kind);
    const alternate=sourceFor(lesson,kind==='reading'?'listening':'reading');
    return {
      index,
      kind,
      tag,
      question:String(q?.q||q?.prompt||''),
      options:Array.isArray(q?.options)?q.options.map(String):[],
      answer:q?.answer==null?'':String(q.answer),
      designatedSource:designated,
      alternateSource:alternate
    };
  }).filter(Boolean);
}
function jevQuestions(items){
  const out={};
  for(const item of items){
    const n=item.index;
    out[`q${n}_grounding`]={
      type:'choice',
      instructions:`Evaluate item index ${n}. PASS only if the question can be answered from item.designatedSource without needing facts that exist only in item.alternateSource or outside knowledge. FAIL if the displayed/assigned source does not contain enough evidence for the question. NOT_APPLICABLE only if there is no substantive comprehension claim to ground.`,
      criteria:{
        pass:'The designated source provides enough direct or reasonable inferential evidence to answer the question.',
        fail:'The designated source is missing required evidence, contradicts the question, or the question actually depends on the alternate source.',
        not_applicable:'This item genuinely does not require source grounding.'
      }
    };
    out[`q${n}_answer_key`]={
      type:'choice',
      instructions:`Evaluate item index ${n}. PASS only if item.answer is supported by item.designatedSource and is the best accepted answer among item.options. FAIL if the answer key is wrong, unsupported, contradicted, or another option is equally/better supported. NOT_APPLICABLE only if there is no answer key.`,
      criteria:{
        pass:'The accepted answer is correct and best supported by the designated source.',
        fail:'The accepted answer is wrong, unsupported, contradicted, or not uniquely best.',
        not_applicable:'The item has no accepted answer/key.'
      }
    };
    out[`q${n}_source_assignment`]={
      type:'choice',
      instructions:`Evaluate item index ${n}. The item is tagged as ${item.kind}. PASS if that source assignment is semantically correct. FAIL if the question clearly belongs to the alternate source, depends on information absent from the designated source, or a reading item actually tests listening-only content / a listening item is attached to the wrong passage. NOT_APPLICABLE only if both sources are intentionally identical and the assignment cannot meaningfully be distinguished.`,
      criteria:{
        pass:'The question is attached to the correct reading/listening source.',
        fail:'The question is attached to the wrong source or depends on the alternate source.',
        not_applicable:'The two sources are intentionally identical so separation cannot be meaningfully judged.'
      }
    };
    out[`q${n}_ambiguity`]={
      type:'choice',
      instructions:`Evaluate item index ${n}. PASS only if the stem is clear and exactly one listed option is defensibly correct in context. FAIL if the stem is ambiguous, multiple choices are defensible, no choice is defensible, or wording makes the intended answer uncertain. NOT_APPLICABLE only if the item is not selected-response.`,
      criteria:{
        pass:'The item is unambiguous and has one defensible correct option.',
        fail:'The item is ambiguous, underdetermined, or has multiple/no defensible answers.',
        not_applicable:'The item is not selected-response.'
      }
    };
  }
  return out;
}
async function callJev(state,questions){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),30000);
  try{
    let lastError;
    for(let attempt=0;attempt<3;attempt++){
      try{
        const r=await fetch(API_URL,{
          method:'POST',
          headers:{Authorization:`Bearer ${API_KEY}`,'Content-Type':'application/json'},
          body:JSON.stringify({state,model:MODEL,questions}),
          signal:controller.signal
        });
        if(r.ok)return await r.json();
        const detail=(await r.text()).slice(0,600);
        lastError=new Error(`Jev HTTP ${r.status}: ${detail}`);
        if(![429,529].includes(r.status))throw lastError;
        await new Promise(res=>setTimeout(res,400*Math.pow(2,attempt)));
      }catch(e){
        lastError=e;
        if(e?.name==='AbortError')throw new Error('Jev request timed out');
        if(attempt===2)throw e;
      }
    }
    throw lastError||new Error('Jev request failed');
  }finally{clearTimeout(timer)}
}
function decision(answer){
  const choice=String(answer?.choice||'').toLowerCase();
  const confidence=Number(answer?.confidence);
  if(choice==='fail')return {status:'FAIL',choice,confidence:Number.isFinite(confidence)?confidence:null};
  if(choice==='pass'&&Number.isFinite(confidence)&&confidence>=0.4)return {status:'PASS',choice,confidence};
  if(choice==='not_applicable'&&Number.isFinite(confidence)&&confidence>=0.4)return {status:'NOT_APPLICABLE',choice,confidence};
  if((choice==='pass'||choice==='not_applicable')&&Number.isFinite(confidence)&&confidence<0.4)return {status:'LOW_CONFIDENCE',choice,confidence};
  return {status:'BLOCKED',choice,confidence:Number.isFinite(confidence)?confidence:null};
}
function excerpt(text,answer,question){
  const s=String(text||'').replace(/\s+/g,' ').trim();
  if(!s)return '';
  const needles=[answer,...String(question||'').split(/\W+/).filter(w=>w.length>=6)].filter(Boolean);
  let pos=-1;
  for(const n of needles){
    pos=s.toLowerCase().indexOf(String(n).toLowerCase());
    if(pos>=0)break;
  }
  if(pos<0)return s.slice(0,520);
  return s.slice(Math.max(0,pos-180),Math.min(s.length,pos+340));
}
async function auditLesson(lesson){
  const items=questionsFor(lesson);
  if(!items.length)return {lesson,items,findings:[],counts:{},usage:null,skipped:true};
  const state={
    context:{
      courseId:'speakup-b2',
      targetLevel:'B2',
      lessonNumber:Number(lesson.number),
      lessonTitle:String(lesson.title||''),
      learningOutcome:String(lesson.outcome||''),
      auditFocus:'reading/listening source alignment, answer-key correctness, ambiguity'
    },
    items
  };
  const jq=jevQuestions(items);
  const data=await callJev(state,jq);
  const findings=[],counts={grounding:{},answer_key:{},source_assignment:{},ambiguity:{}};
  for(const item of items){
    for(const check of ['grounding','answer_key','source_assignment','ambiguity']){
      const ans=data?.answers?.[`q${item.index}_${check}`];
      const d=decision(ans);
      counts[check][d.status]=(counts[check][d.status]||0)+1;
      if(!['PASS','NOT_APPLICABLE'].includes(d.status)){
        findings.push({
          courseId:'speakup-b2',
          lessonNumber:Number(lesson.number),
          lessonTitle:String(lesson.title||''),
          component:`${item.kind}.questions.${item.index}`,
          questionIndex:item.index,
          sourceKind:item.kind,
          tag:item.tag,
          check,
          status:d.status,
          confidence:d.confidence,
          question:item.question,
          acceptedAnswer:item.answer,
          options:item.options,
          sourceEvidence:excerpt(item.designatedSource,item.answer,item.question),
          alternateSourceEvidence:excerpt(item.alternateSource,item.answer,item.question)
        });
      }
    }
  }
  return {lesson,items,findings,counts,usage:data?.usage||null,skipped:false};
}
function addCounts(total,local){
  for(const [check,statuses] of Object.entries(local||{})){
    total[check]=total[check]||{};
    for(const [status,n] of Object.entries(statuses))total[check][status]=(total[check][status]||0)+Number(n||0);
  }
}
async function main(){
  const lessons=loadBlueprint();
  const patches=await activePatches();
  const applied=applyPatches(lessons,patches);
  console.log('JEV_AUDIT_META '+JSON.stringify({
    courseId:'speakup-b2',
    targetLevel:'B2',
    lessons:lessons.length,
    activePatches:patches.length,
    appliedPatches:applied,
    model:MODEL,
    focus:['reading_question_grounding','listening_question_grounding','answer_key_correctness','reading_listening_separation','ambiguity']
  }));

  const totalCounts={},allFindings=[],errors=[];
  let audited=0,questionItems=0;
  for(const lesson of lessons){
    try{
      const result=await auditLesson(lesson);
      if(!result.skipped)audited++;
      questionItems+=result.items.length;
      addCounts(totalCounts,result.counts);
      for(const finding of result.findings){
        allFindings.push(finding);
        console.log('JEV_AUDIT_FINDING '+JSON.stringify(finding));
      }
      console.log('JEV_AUDIT_LESSON '+JSON.stringify({
        lessonNumber:Number(lesson.number),lessonTitle:String(lesson.title||''),
        items:result.items.length,findings:result.findings.length,counts:result.counts,usage:result.usage
      }));
    }catch(e){
      const err={lessonNumber:Number(lesson.number),lessonTitle:String(lesson.title||''),error:String(e.message||e).slice(0,800)};
      errors.push(err);
      console.error('JEV_AUDIT_ERROR '+JSON.stringify(err));
    }
  }
  const summary={
    courseId:'speakup-b2',
    lessonsInBook:lessons.length,
    lessonsAudited:audited,
    taggedQuestionItems:questionItems,
    findings:allFindings.length,
    counts:totalCounts,
    errors,
    completedAt:new Date().toISOString()
  };
  console.log('JEV_AUDIT_SUMMARY '+JSON.stringify(summary));
  await pool.end();
}
module.exports={main};

if(require.main===module){
  main().catch(async e=>{
    console.error('JEV_AUDIT_FATAL '+JSON.stringify({error:String(e.message||e),stack:String(e.stack||'').slice(0,1600)}));
    try{await pool.end()}catch{}
    process.exit(2);
  });
}
