'use strict';

const express=require('express');
const {Pool}=require('pg');
const bcrypt=require('bcryptjs');
const crypto=require('crypto');

const BOOK_ID='speakup-a1-gold';
const PILOT_CLASS_ID='a1_gold_pilot_class';
const PILOT_CLASS_NAME='A1 Gold Pilot';
const pool=new Pool({connectionString:process.env.DATABASE_URL});

function enabled(){return process.env.A1_GOLD_PILOT_MODE==='1'}
function allowExtraStudents(){return process.env.A1_GOLD_PILOT_ALLOW_EXTRA_STUDENTS==='1'}
function allowExtraClasses(){return process.env.A1_GOLD_PILOT_ALLOW_EXTRA_CLASSES==='1'}
function pilotUsername(){return String(process.env.A1_GOLD_PILOT_STUDENT_USERNAME||'a1pilot').trim().toLowerCase()}
function pilotStudentName(){return String(process.env.A1_GOLD_PILOT_STUDENT_NAME||'A1 Pilot Student').trim()||'A1 Pilot Student'}
function teacherUsername(){return String(process.env.TEACHER_USERNAME||'teacher').trim().toLowerCase()}

async function preparePilot(){
 if(!enabled())return;
 const password=String(process.env.A1_GOLD_PILOT_STUDENT_PASSWORD||'').trim();
 if(!/^\d{8,20}$/.test(password))throw new Error('A1_GOLD_PILOT_STUDENT_PASSWORD must contain 8–20 digits.');

 await pool.query("update books set status=case when id='speakup-b2' then 'ready' when id=$1 then 'pilot' else 'inactive' end",[BOOK_ID]);
 const tq=await pool.query("select id from users where lower(username)=lower($1) and role='teacher' limit 1",[teacherUsername()]);
 if(!tq.rowCount)throw new Error('Controlled A1 pilot teacher account was not found.');
 const teacherId=tq.rows[0].id;

 await pool.query(`insert into classes(id,name,level,course_id,teacher_id)
  values($1,$2,'A1',$3,$4)
  on conflict(id) do update set name=excluded.name,level=excluded.level,course_id=excluded.course_id,teacher_id=excluded.teacher_id`,
  [PILOT_CLASS_ID,PILOT_CLASS_NAME,BOOK_ID,teacherId]);
 await pool.query('insert into enrollments(class_id,user_id) values($1,$2) on conflict do nothing',[PILOT_CLASS_ID,teacherId]);

 const username=pilotUsername();
 let sq=await pool.query("select id,role from users where lower(username)=lower($1) limit 1",[username]);
 let studentId;
 if(!sq.rowCount){
  studentId='s_'+crypto.randomUUID();
  await pool.query(`insert into users(id,username,password_hash,role,name,login_token)
   values($1,$2,$3,'student',$4,$5)`,[studentId,username,await bcrypt.hash(password,12),pilotStudentName(),crypto.randomBytes(24).toString('hex')]);
 }else{
  if(sq.rows[0].role!=='student')throw new Error('A1 pilot username belongs to a non-student account.');
  studentId=sq.rows[0].id;
  await pool.query('update users set password_hash=$1,name=$2 where id=$3',[await bcrypt.hash(password,12),pilotStudentName(),studentId]);
 }
 await pool.query('insert into profiles(user_id) values($1) on conflict do nothing',[studentId]);
 await pool.query('delete from enrollments where user_id=$1 and class_id<>$2',[studentId,PILOT_CLASS_ID]);
 await pool.query('insert into enrollments(class_id,user_id) values($1,$2) on conflict do nothing',[PILOT_CLASS_ID,studentId]);

 // Existing A1 request guards intentionally key off preview mode. Set it only after initDb has
 // completed so production seed logic is not converted into preview seeding.
 process.env.A1_PREVIEW_MODE='1';
 process.env.A1_GOLD_PILOT_RUNTIME='1';
 console.log(`A1 CONTROLLED PILOT ACTIVE class=${PILOT_CLASS_ID} teacher=${teacherUsername()} student=${username} extras=blocked`);
}

async function guardPilotTarget(req,res,next){
 if(!enabled()||allowExtraStudents())return next();
 const classId=String(req.body?.classId||'').trim();
 if(classId!==PILOT_CLASS_ID)return next();
 const configured=pilotUsername();
 let username=String(req.body?.username||'').trim().toLowerCase();
 if(!username&&req.params?.id){
  const q=await pool.query('select username from users where id=$1 and role=\'student\' limit 1',[String(req.params.id)]);
  username=String(q.rows[0]?.username||'').trim().toLowerCase();
 }
 if(username===configured)return next();
 return res.status(409).json({error:'A1 Gold pilot enrollment is locked to the dedicated pilot learner. Enable the explicit extra-student override before adding real learners.'});
}

function guardExtraClass(req,res,next){
 if(!enabled()||allowExtraClasses())return next();
 if(String(req.body?.bookId||'').trim()!==BOOK_ID)return next();
 return res.status(409).json({error:'A1 Gold pilot is limited to the controlled pilot class. Enable the explicit extra-class override before creating another A1 class.'});
}

function protectPilotClassDelete(req,res,next){
 if(!enabled())return next();
 if(String(req.params?.id||'').trim()!==PILOT_CLASS_ID)return next();
 return res.status(409).json({error:'The controlled A1 pilot class cannot be deleted while pilot mode is enabled.'});
}

function wrapMethod(method){
 const native=express.application[method];
 express.application[method]=function pilotAwareRoute(route,...handlers){
  const path=String(route||'');
  if(path==='/api/admin/classes'&&method==='post')return native.call(this,route,guardExtraClass,...handlers);
  if(path==='/api/admin/classes/:id'&&method==='delete')return native.call(this,route,protectPilotClassDelete,...handlers);
  if(path.includes('/students')&&['post','patch','put'].includes(method))return native.call(this,route,guardPilotTarget,...handlers);
  return native.call(this,route,...handlers);
 };
}
for(const method of ['post','patch','put','delete'])wrapMethod(method);

const nativeListen=express.application.listen;
express.application.listen=function controlledPilotListen(...args){
 if(!enabled())return nativeListen.apply(this,args);
 const app=this;
 preparePilot().then(()=>nativeListen.apply(app,args)).catch(error=>{
  console.error('A1 controlled pilot activation failed:',error.message);
  process.exitCode=1;
  setTimeout(()=>process.exit(1),25);
 });
 return app;
};
