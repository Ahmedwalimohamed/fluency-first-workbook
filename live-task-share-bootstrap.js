const express=require('express');
const jwt=require('jsonwebtoken');
const {Pool}=require('pg');

const nativeGet=express.application.get;
const installed=new WeakSet();
const pool=new Pool({connectionString:process.env.DATABASE_URL});

const CHOICE_TYPES=new Set(['multiple_choice','true_false']);
const TEXT_TYPES=new Set(['short_answer','fill_blank','sentence_correction','sentence_construction']);
const SPEAKING_TYPES=new Set(['teacher_speaking','individual_speaking','pair_discussion']);

console.log('LIVE TASK SHARE PRELOAD ACTIVE');

function cookieValue(req,name){
  if(req.cookies&&Object.prototype.hasOwnProperty.call(req.cookies,name))return req.cookies[name];
  const header=String(req.headers?.cookie||'');
  for(const part of header.split(';')){
    const i=part.indexOf('=');if(i<0)continue;
    const key=part.slice(0,i).trim();if(key!==name)continue;
    try{return decodeURIComponent(part.slice(i+1).trim())}catch{return part.slice(i+1).trim()}
  }
  return '';
}
function studentSession(req){
  try{
    const user=jwt.verify(cookieValue(req,'ff_session')||'',process.env.JWT_SECRET);
    return user?.role==='student'?user:null;
  }catch{return null}
}
function safeQuestion(q){
  const type=String(q?.type||'multiple_choice');
  const common={id:String(q?.id||''),type,prompt:String(q?.prompt||q?.q||''),explanation:''};
  if(CHOICE_TYPES.has(type))return {...common,options:Array.isArray(q?.options)?q.options:[]};
  if(TEXT_TYPES.has(type))return common;
  if(type==='matching'){
    const pairs=Array.isArray(q?.pairs)?q.pairs:[];
    return {...common,leftItems:pairs.map(p=>p.left),rightOptions:pairs.map(p=>p.right).reverse()};
  }
  if(type==='ordering')return {...common,items:Array.isArray(q?.items)?q.items:[]};
  if(SPEAKING_TYPES.has(type))return {...common,successCriteria:Array.isArray(q?.successCriteria)?q.successCriteria:[]};
  return common;
}
function studentTask(row){
  const content=row.content||{};
  let safeContent;
  if(row.task_type==='writing'){
    safeContent={topic:content.topic||'',instructions:content.instructions||'',minWords:content.minWords||0};
  }else{
    const legacy=row.task_type==='mcq';
    const questions=(Array.isArray(content.questions)?content.questions:[]).map((q,i)=>{
      const normalized=legacy?{id:q.id||`q${i+1}`,type:'multiple_choice',prompt:q.prompt||q.q,options:q.options}:q;
      return safeQuestion(normalized);
    });
    safeContent={topic:content.topic||'',tip:content.tip||'',questions};
  }
  return {
    id:row.id,
    classId:row.class_id,
    className:row.class_name||'',
    title:row.title,
    taskType:row.task_type==='mcq'?'activity':row.task_type,
    durationSeconds:row.duration_seconds,
    status:row.status,
    startsAt:row.starts_at,
    endsAt:row.ends_at,
    content:safeContent
  };
}
function validTaskId(value){return /^lt_[0-9a-f-]{20,80}$/i.test(String(value||'').trim())}
function submissionDto(row){
  if(!row)return null;
  return {
    answers:row.answers||{},score:row.score,correctCount:row.correct_count,totalCount:row.total_count,
    timedOut:Boolean(row.timed_out),submittedAt:row.submitted_at
  };
}
async function activeSharedTask(taskId,studentId){
  return pool.query(`
    select lt.*,c.name as class_name
    from live_tasks lt
    join classes c on c.id=lt.class_id and c.approval_status='approved'
    join enrollments e on e.class_id=lt.class_id and e.user_id=$2
    where lt.id=$1
      and lt.status='live'
      and lt.starts_at<=now()
      and lt.ends_at>now()
    limit 1
  `,[taskId,studentId]);
}
async function recoverCurrentTaskForSameClass(taskId,studentId){
  // An old WhatsApp link may still point at the previous task. Recover only inside
  // the exact class encoded by that old task and only when this student is enrolled.
  const classAccess=await pool.query(`
    select lt.class_id
    from live_tasks lt
    join classes c on c.id=lt.class_id and c.approval_status='approved'
    join enrollments e on e.class_id=lt.class_id and e.user_id=$2
    where lt.id=$1
    limit 1
  `,[taskId,studentId]);
  if(!classAccess.rowCount)return null;
  const classId=classAccess.rows[0].class_id;
  const current=await pool.query(`
    select lt.*,c.name as class_name
    from live_tasks lt
    join classes c on c.id=lt.class_id and c.approval_status='approved'
    join enrollments e on e.class_id=lt.class_id and e.user_id=$2
    where lt.class_id=$1
      and lt.status='live'
      and lt.starts_at<=now()
      and lt.ends_at>now()
    order by lt.starts_at desc
    limit 1
  `,[classId,studentId]);
  return current.rows[0]||null;
}

function install(app){
  if(installed.has(app))return;
  installed.add(app);

  // A shared URL is only a deep link. Student authentication + exact class
  // enrollment are always required. If the teacher has replaced an expired task
  // in the same class, an old WhatsApp link resolves to that class's current task.
  nativeGet.call(app,'/api/student/live-task/shared',async(req,res)=>{
    res.set({
      'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'strict-origin-when-cross-origin'
    });
    const student=studentSession(req);
    if(!student)return res.status(403).json({error:'Student access required.'});
    const requestedTaskId=String(req.query?.taskId||'').trim();
    if(!validTaskId(requestedTaskId))return res.status(400).json({error:'Invalid live task link.'});
    try{
      const exact=await activeSharedTask(requestedTaskId,student.id);
      let row=exact.rows[0]||null;
      let recovered=false;
      if(!row){
        row=await recoverCurrentTaskForSameClass(requestedTaskId,student.id);
        recovered=Boolean(row);
      }
      if(!row)return res.status(404).json({error:'This live task has ended or is not assigned to your class.',code:'LIVE_TASK_NOT_AVAILABLE'});
      if(recovered)console.log(`LIVE TASK SHARE RECOVERED stale=${requestedTaskId} current=${row.id} class=${row.class_id}`);
      const sub=await pool.query('select answers,score,correct_count,total_count,timed_out,submitted_at from live_task_submissions where task_id=$1 and student_id=$2',[row.id,student.id]);
      return res.json({
        task:studentTask(row),
        submission:submissionDto(sub.rows[0]),
        serverNow:new Date().toISOString(),
        resolvedTaskId:row.id,
        staleLinkRecovered:recovered
      });
    }catch(e){
      if(e?.code==='42P01')return res.status(404).json({error:'This live task is not available yet.',code:'LIVE_TASK_NOT_AVAILABLE'});
      console.error('Shared live task lookup error:',e);
      return res.status(500).json({error:'The shared live task could not be opened.'});
    }
  });
  console.log('LIVE TASK SHARE ROUTE ACTIVE /api/student/live-task/shared');
}

// Preloaded before server.js. The first GET route registration triggers the share
// route installation, so it is guaranteed to be registered before the final API 404.
express.application.get=function englishGateLiveTaskShareGet(route,...handlers){
  install(this);
  return nativeGet.call(this,route,...handlers);
};
