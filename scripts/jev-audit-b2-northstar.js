'use strict';

const fs=require('fs');
const vm=require('vm');
const path=require('path');
const {runSemanticQa,TYPE_SAFE_MODEL,TYPE_SAFE_URL}=require('../semantic-qa-firewall.js');

function loadBlueprint(){
 const code=fs.readFileSync(path.join(__dirname,'../public/speakup-b2-blueprint.js'),'utf8');
 const context={window:{}};vm.createContext(context);vm.runInContext(code,context);
 return context.window.SPEAKUP_B2_BLUEPRINT||[]
}
function selectedEvidence(answer){
 const choice=String(answer?.choice||'').toLowerCase();
 const p=Number(answer?.probabilities?.[choice]),c=Number(answer?.confidence);
 const pp=Number.isFinite(p)&&p>=0&&p<=1?p:null,cc=Number.isFinite(c)&&c>=0&&c<=1?c:null;
 const evidence=pp!=null&&cc!=null?Math.min(pp,cc):pp!=null?pp:cc;
 return {choice,evidence}
}
async function callJev(state,questions){
 const key=String(process.env.TYPESAFE_API_KEY||'').trim();
 if(!key)throw new Error('TYPESAFE_API_KEY is not configured.');
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),Math.max(5000,Math.min(90000,Number(process.env.TYPESAFE_TIMEOUT_MS)||30000)));
 try{
  const r=await fetch(TYPE_SAFE_URL,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({state,model:TYPE_SAFE_MODEL,questions}),signal:controller.signal});
  if(!r.ok)throw new Error('Jev cross-course audit '+r.status+': '+(await r.text()).slice(0,500));
  return await r.json()
 }finally{clearTimeout(timeout)}
}
function crossQuestions(){
 const q=(instructions)=>({type:'choice',instructions,criteria:{
  pass:'The course clearly satisfies this requirement overall.',
  fail:'There is a concrete course-level violation of this requirement.',
  review:'The direction is acceptable but there is a localized concern worth human review.'
 }});
 return {
  progression:q('Across Lessons 2–22, does learner independence generally increase from high support to low support without a sudden unreasonable jump in output or cognitive demand?'),
  retrieval:q('Does the hidden REMEMBER system provide meaningful spaced retrieval from prior lessons at +1, +3, and +7 opportunities, prioritising previously weak grammar when available, without exposing review-system meta language to learners?'),
  variety:q('Do the missions, CHANGE prompts, USE tasks, and final-task formats have enough real variation that the course does not feel like the same AI template with nouns replaced?'),
  mission_alignment:q('Across the course, does each final USE task plausibly demonstrate its stated real-world mission?'),
  final_independence:q('Does Lesson 22 function as a substantially independent human-graded B2 exit task rather than another heavily scaffolded practice lesson?')
 }
}
async function auditCourseCrossLesson(lessons){
 const compact=lessons.filter(l=>Number(l.number)>=2).map(l=>({
  number:l.number,title:l.title,support:l.northstar?.support,mission:l.northstar?.mission,
  change:(l.northstar?.change||[]).map(x=>({model:x.model,prompt:x.prompt})),
  use:l.northstar?.use?.prompt,final:l.northstar?.final,
  retrieval:l.northstar?.retrieval,grammar:l.grammarFocus,
  readingWords:String(l.readingText||'').trim().split(/\s+/).filter(Boolean).length,
  listeningWords:String(l.audioScript||'').trim().split(/\s+/).filter(Boolean).length
 }));
 const data=await callJev({
  task:'EnglishGate B2 Northstar cross-lesson curriculum audit',
  targetLevel:'B2',framework:'SEE → CHOOSE → CHANGE → USE → FIX with hidden REMEMBER',
  runtimeRememberOffsets:[1,3,7],
  supportFading:{high:'visible model + starter',mediumHigh:'visible model + reduced starter',medium:'visible model without starter',low:'independent CHANGE with optional model reveal; USE has no starter'},
  rules:[
   'The learner-facing experience should stay simple for adult EFL learners.',
   'Difficulty should come from language and independence, not interface complexity.',
   'Repeated framework rhythm is intentional; near-identical content/task templates are not.',
   'Lesson 22 is a human-graded exit task and must not receive automated correction.'
  ],
  lessons:compact
 },crossQuestions());
 const findings={};let blocked=0,review=0;
 for(const id of Object.keys(crossQuestions())){
  const d=selectedEvidence(data?.answers?.[id]);
  const status=d.choice==='fail'&&Number(d.evidence)>=0.60?'BLOCK':d.choice==='review'||(d.choice==='fail'&&Number(d.evidence)<0.60)?'REVIEW':'PASS';
  if(status==='BLOCK')blocked++;if(status==='REVIEW')review++;
  findings[id]={...d,status}
 }
 return {blocked,review,findings,model:String(data?.model||TYPE_SAFE_MODEL)}
}
async function main(){
 const lessons=loadBlueprint();
 if(lessons.length!==22)throw new Error('Expected exactly 22 B2 lessons.');
 const targets=lessons.filter(l=>Number(l.number)>=2);
 const results=[],errors=[];
 for(let i=0;i<targets.length;i+=3){
  const batch=targets.slice(i,i+3);
  const settled=await Promise.all(batch.map(async lesson=>{
   try{
    const report=await runSemanticQa({
     context:{
      targetLevel:'B2',courseId:'speakup-b2',lessonNumber:Number(lesson.number),
      lessonTitle:String(lesson.title||''),learningOutcome:String(lesson.outcome||''),
      audience:'adult EFL learners using a mobile-first workbook',targetPath:'northstar'
     },
     lesson
    });
    console.log('JEV_NORTHSTAR_LESSON '+JSON.stringify({lessonNumber:lesson.number,title:lesson.title,releaseState:report.releaseState,decision:report.decision,blocked:report.blocked,criticalFailures:report.criticalFailures,majorFindings:report.majorFindings,minorFindings:report.minorFindings,majorIssues:(report.checks||[]).filter(x=>x.severity==='Major'&&(x.status==='FAIL'||x.status==='CORROBORATED_FAIL'||x.status==='BLOCKED'||x.review)).map(x=>({id:x.id,domain:x.domain,status:x.status,choice:x.choice,evidence:x.evidence,requirement:x.requirement,reason:x.reason})),domains:report.domains,model:report.model,version:report.version,auditVersion:report.auditVersion,contentHash:report.contentHash}));
    return {lessonNumber:lesson.number,title:lesson.title,report}
   }catch(e){
    const error=String(e?.message||e).slice(0,800);
    console.error('JEV_NORTHSTAR_ERROR '+JSON.stringify({lessonNumber:lesson.number,title:lesson.title,error}));
    return {lessonNumber:lesson.number,title:lesson.title,error}
   }
  }));
  for(const x of settled){if(x.error)errors.push(x);else results.push(x)}
 }
 const blocked=results.filter(x=>!x.report.pass);
 const review=results.filter(x=>x.report.releaseState==='AMBER');
 const cross=await auditCourseCrossLesson(lessons);
 const summary={
  lessonsAudited:results.length,errors:errors.length,blockedLessons:blocked.map(x=>x.lessonNumber),
  amberLessons:review.map(x=>x.lessonNumber),
  greenLessons:results.filter(x=>x.report.releaseState==='GREEN').map(x=>x.lessonNumber),
  releaseCounts:{
    green:results.filter(x=>x.report.releaseState==='GREEN').length,
    amber:results.filter(x=>x.report.releaseState==='AMBER').length,
    red:results.filter(x=>x.report.releaseState==='RED').length
  },
  cross,completedAt:new Date().toISOString()
 };
 console.log('JEV_NORTHSTAR_SUMMARY '+JSON.stringify(summary));
 if(errors.length||blocked.length||cross.blocked)process.exit(2)
}
main().catch(e=>{console.error('JEV_NORTHSTAR_FATAL '+JSON.stringify({error:String(e?.message||e),stack:String(e?.stack||'').slice(0,1200)}));process.exit(2)});
