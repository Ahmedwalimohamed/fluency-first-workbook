const express=require('express');
const jwt=require('jsonwebtoken');
const {Pool}=require('pg');

const nativePost=express.application.post;
const nativeGet=express.application.get;
const installed=new WeakSet();
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const TYPES=new Set(['reading','listening']);

const schemaReady=(async()=>{
  await pool.query(`
    create table if not exists workbook_activities(
      activity_id text primary key,
      lesson_id text not null,
      activity_type text not null check(activity_type in ('reading','listening')),
      title text not null default '',
      instructions text not null default '',
      transcript_visibility text not null default 'after_submission',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(lesson_id,activity_type)
    );
    create table if not exists workbook_activity_state(
      student_id text not null references users(id) on delete cascade,
      activity_id text not null references workbook_activities(activity_id) on delete cascade,
      lesson_id text not null,
      activity_type text not null check(activity_type in ('reading','listening')),
      status text not null default 'not_started' check(status in ('not_started','in_progress','completed','needs_review')),
      current_question int not null default 0,
      responses jsonb not null default '{}'::jsonb,
      started_at timestamptz,
      last_activity_at timestamptz not null default now(),
      submitted_at timestamptz,
      completed_at timestamptz,
      primary key(student_id,activity_id)
    );
    create table if not exists workbook_activity_attempts(
      attempt_id bigserial primary key,
      activity_id text not null references workbook_activities(activity_id) on delete cascade,
      lesson_id text not null,
      activity_type text not null check(activity_type in ('reading','listening')),
      student_id text not null references users(id) on delete cascade,
      score int not null check(score between 0 and 100),
      max_score int not null default 100,
      percentage int not null check(percentage between 0 and 100),
      correct_count int not null default 0,
      incorrect_count int not null default 0,
      responses jsonb not null default '{}'::jsonb,
      status text not null default 'submitted',
      started_at timestamptz,
      submitted_at timestamptz not null default now(),
      created_at timestamptz not null default now()
    );
    create index if not exists workbook_activity_attempts_student_lesson_type_idx on workbook_activity_attempts(student_id,lesson_id,activity_type,submitted_at desc);
    create table if not exists legacy_workbook_activity_history(
      legacy_key text primary key,
      student_id text,
      lesson_id text,
      legacy_type text not null,
      payload jsonb not null,
      preserved_at timestamptz not null default now()
    );
  `);
  await pool.query(`
    insert into legacy_workbook_activity_history(legacy_key,student_id,lesson_id,legacy_type,payload)
    select 'attempt:'||id::text,student_id,lesson_id,'reading_listening',jsonb_build_object('source','attempts','id',id,'skill',skill,'score',score,'tags',tags,'at',at)
    from attempts where skill='listening'
    on conflict(legacy_key) do nothing
  `);
  await pool.query(`
    insert into legacy_workbook_activity_history(legacy_key,student_id,lesson_id,legacy_type,payload)
    select 'completion:'||student_id||':'||lesson_id||':'||step,student_id,lesson_id,'reading_listening',jsonb_build_object('source','completion','step',step,'completed_at',completed_at)
    from completion where step='listening'
    on conflict(legacy_key) do nothing
  `);
  await pool.query("create table if not exists books(id text primary key,title text not null,level text not null,audience text not null default '',status text not null default 'queued',total_lessons int not null default 0,activity_model text not null default '',created_at timestamptz default now())");
  await pool.query("update books set activity_model='Grammar · Reading · Listening · Vocabulary · Writing' where activity_model ilike '%Listening%Reading%' or activity_model ilike '%Reading%Listening%'");
})().catch(e=>{console.error('Reading/Listening separation schema error:',e);throw e});

function userFrom(req){
  try{return jwt.verify(req.cookies?.ff_session||'',process.env.JWT_SECRET)}catch{return null}
}
function activityId(lessonId,type){return `${String(lessonId).trim()}:${type}`}
function b2LessonOnly(lessonId){return /^su-b2-l\d+$/.test(String(lessonId||''))||(process.env.A1_PREVIEW_MODE==='1'&&/^a1-gold-l(?:[1-9]|1\d|2[0-2])$/.test(String(lessonId||'')))}
function cleanType(value){const type=String(value||'').trim().toLowerCase();return TYPES.has(type)?type:null}
async function ensureActivity(lessonId,type,title='',instructions=''){
  const id=activityId(lessonId,type);
  await pool.query(`insert into workbook_activities(activity_id,lesson_id,activity_type,title,instructions)
    values($1,$2,$3,$4,$5)
    on conflict(lesson_id,activity_type) do update set title=case when excluded.title<>'' then excluded.title else workbook_activities.title end,instructions=case when excluded.instructions<>'' then excluded.instructions else workbook_activities.instructions end,updated_at=now()`,[id,lessonId,type,String(title||'').slice(0,300),String(instructions||'').slice(0,1000)]);
  return id;
}
async function canReadStudent(req,user,studentId){
  if(user.role==='student')return user.id===studentId;
  if(user.role==='admin')return true;
  if(user.role!=='teacher')return false;
  const r=await pool.query(`select 1 from enrollments e join classes c on c.id=e.class_id where e.user_id=$1 and c.teacher_id=$2 limit 1`,[studentId,user.id]);
  return Boolean(r.rowCount);
}
function install(app){
  if(installed.has(app))return;installed.add(app);
  nativeGet.call(app,'/api/workbook-activities/progress',async(req,res)=>{
    const user=userFrom(req);if(!user)return res.status(401).json({error:'Sign in required.'});
    await schemaReady;
    const studentId=user.role==='student'?user.id:String(req.query.studentId||'').trim();
    if(!studentId||!(await canReadStudent(req,user,studentId)))return res.status(403).json({error:'Not allowed.'});
    const states=(await pool.query(`select s.student_id,s.activity_id,s.lesson_id,s.activity_type,s.status,s.current_question,s.responses,s.started_at,s.last_activity_at,s.submitted_at,s.completed_at,a.title,a.instructions,a.transcript_visibility from workbook_activity_state s join workbook_activities a using(activity_id) where s.student_id=$1`,[studentId])).rows;
    const attempts=(await pool.query(`select attempt_id,activity_id,lesson_id,activity_type,student_id,score,max_score,percentage,correct_count,incorrect_count,status,started_at,submitted_at,created_at from workbook_activity_attempts where student_id=$1 order by submitted_at desc`,[studentId])).rows;
    res.set('Cache-Control','no-store');res.json({studentId,states,attempts});
  });
  nativePost.call(app,'/api/workbook-activities/state',async(req,res)=>{
    const user=userFrom(req);if(!user||user.role!=='student')return res.status(403).json({error:'Student access required.'});
    await schemaReady;
    const lessonId=String(req.body?.lessonId||'').trim(),type=cleanType(req.body?.activityType);
    if(!lessonId||!type)return res.status(400).json({error:'Invalid Reading/Listening activity.'});
    if(!b2LessonOnly(lessonId))return res.status(423).json({error:'This course is inactive. Only B2 Upper Intermediate is currently active.'});
    const id=await ensureActivity(lessonId,type,req.body?.title,req.body?.instructions);
    const currentQuestion=Math.max(0,Math.min(500,Number(req.body?.currentQuestion)||0));
    const responses=req.body?.responses&&typeof req.body.responses==='object'?req.body.responses:{};
    const status=['not_started','in_progress','completed','needs_review'].includes(req.body?.status)?req.body.status:'in_progress';
    const r=await pool.query(`insert into workbook_activity_state(student_id,activity_id,lesson_id,activity_type,status,current_question,responses,started_at,last_activity_at)
      values($1,$2,$3,$4,$5,$6,$7,now(),now())
      on conflict(student_id,activity_id) do update set status=excluded.status,current_question=excluded.current_question,responses=excluded.responses,last_activity_at=now(),started_at=coalesce(workbook_activity_state.started_at,now()) returning *`,[user.id,id,lessonId,type,status,currentQuestion,responses]);
    res.json({ok:true,state:r.rows[0]});
  });
  nativePost.call(app,'/api/workbook-activities/attempts',async(req,res)=>{
    const user=userFrom(req);if(!user||user.role!=='student')return res.status(403).json({error:'Student access required.'});
    await schemaReady;
    const lessonId=String(req.body?.lessonId||'').trim(),type=cleanType(req.body?.activityType),score=Number(req.body?.score),correct=Number(req.body?.correctCount||0),incorrect=Number(req.body?.incorrectCount||0);
    if(!lessonId||!type||!Number.isInteger(score)||score<0||score>100)return res.status(400).json({error:'Invalid activity attempt.'});
    if(!b2LessonOnly(lessonId))return res.status(423).json({error:'This course is inactive. Only B2 Upper Intermediate is currently active.'});
    const id=await ensureActivity(lessonId,type,req.body?.title,req.body?.instructions),responses=req.body?.responses&&typeof req.body.responses==='object'?req.body.responses:{};
    const client=await pool.connect();
    try{
      await client.query('begin');
      const a=await client.query(`insert into workbook_activity_attempts(activity_id,lesson_id,activity_type,student_id,score,max_score,percentage,correct_count,incorrect_count,responses,status,started_at,submitted_at)
        values($1,$2,$3,$4,$5,100,$5,$6,$7,$8,'submitted',coalesce((select started_at from workbook_activity_state where student_id=$4 and activity_id=$1),now()),now()) returning *`,[id,lessonId,type,user.id,score,correct,incorrect,responses]);
      await client.query(`insert into workbook_activity_state(student_id,activity_id,lesson_id,activity_type,status,current_question,responses,started_at,last_activity_at,submitted_at)
        values($1,$2,$3,$4,'in_progress',0,$5,now(),now(),now())
        on conflict(student_id,activity_id) do update set status='in_progress',responses=excluded.responses,last_activity_at=now(),submitted_at=now()`,[user.id,id,lessonId,type,responses]);
      await client.query('commit');res.json({ok:true,attempt:a.rows[0]});
    }catch(e){await client.query('rollback');throw e}finally{client.release()}
  });
  nativePost.call(app,'/api/workbook-activities/complete',async(req,res)=>{
    const user=userFrom(req);if(!user||user.role!=='student')return res.status(403).json({error:'Student access required.'});
    await schemaReady;
    const lessonId=String(req.body?.lessonId||'').trim(),type=cleanType(req.body?.activityType);
    if(!lessonId||!type)return res.status(400).json({error:'Invalid activity.'});
    if(!b2LessonOnly(lessonId))return res.status(423).json({error:'This course is inactive. Only B2 Upper Intermediate is currently active.'});
    const id=await ensureActivity(lessonId,type,req.body?.title,req.body?.instructions);
    const r=await pool.query(`update workbook_activity_state set status='completed',completed_at=now(),last_activity_at=now() where student_id=$1 and activity_id=$2 and submitted_at is not null returning *`,[user.id,id]);
    if(!r.rowCount)return res.status(409).json({error:'Submit the activity before marking it complete.'});
    res.json({ok:true,state:r.rows[0]});
  });
}

express.application.post=function separatedReadingListeningPost(route,...handlers){install(this);return nativePost.call(this,route,...handlers)};

require('./teacher-management-bootstrap.js');
