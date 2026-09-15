const express=require('express');
const jwt=require('jsonwebtoken');
const {Pool}=require('pg');
const nativeGet=express.application.get;
const nativeUse=express.application.use;
const installed=new WeakSet();
const pool=new Pool({connectionString:process.env.DATABASE_URL});
let schemaPromise;
function user(req){try{return jwt.verify(req.cookies?.ff_session||'',process.env.JWT_SECRET)}catch{return null}}
function schema(){if(!schemaPromise)schemaPromise=pool.query(`create table if not exists class_teaching_contexts(
 teacher_id text not null references users(id) on delete cascade,
 class_id text not null references classes(id) on delete cascade,
 lesson_number integer not null default 1,
 section_index integer not null default 0,
 updated_at timestamptz not null default now(),
 primary key(teacher_id,class_id)
)`).catch(e=>{schemaPromise=null;throw e});return schemaPromise}
function install(app){
 if(installed.has(app))return;installed.add(app);
 // Mirror the existing teacher context save into a durable per-class position.
 nativeUse.call(app,async(req,res,next)=>{
  if(req.method!=='PUT'||req.path!=='/api/teacher/context')return next();
  const u=user(req),classId=String(req.body?.classId||'').trim();
  if(!u||u.role!=='teacher'||!classId)return next();
  try{
   await schema();
   const owns=await pool.query('select 1 from classes where id=$1 and teacher_id=$2',[classId,u.id]);
   if(owns.rowCount){
    const lesson=Math.max(1,Number(req.body?.lessonNumber)||1),section=Math.max(0,Number(req.body?.sectionIndex)||0);
    await pool.query(`insert into class_teaching_contexts(teacher_id,class_id,lesson_number,section_index,updated_at)
      values($1,$2,$3,$4,now()) on conflict(teacher_id,class_id) do update set lesson_number=excluded.lesson_number,section_index=excluded.section_index,updated_at=now()`,[u.id,classId,lesson,section]);
   }
  }catch(e){console.error('class teaching context mirror error',e)}
  next();
 });
 nativeGet.call(app,'/api/teacher/class-contexts',async(req,res)=>{
  const u=user(req);if(!u||u.role!=='teacher')return res.status(403).json({error:'Teacher access required.'});
  try{
   await schema();
   const q=await pool.query(`select t.class_id as "classId",t.lesson_number as "lessonNumber",t.section_index as "sectionIndex",t.updated_at as "updatedAt"
     from class_teaching_contexts t join classes c on c.id=t.class_id where t.teacher_id=$1 and c.teacher_id=$1 order by t.updated_at desc`,[u.id]);
   res.set('Cache-Control','no-store');res.json({contexts:q.rows});
  }catch(e){console.error('class teaching contexts error',e);res.status(500).json({error:'Teaching positions are temporarily unavailable.'})}
 });
}
express.application.get=function classTeachingContextGet(route,...handlers){install(this);return nativeGet.call(this,route,...handlers)};
express.application.use=function classTeachingContextUse(...handlers){install(this);return nativeUse.call(this,...handlers)};
require('./presence-bootstrap.js');
