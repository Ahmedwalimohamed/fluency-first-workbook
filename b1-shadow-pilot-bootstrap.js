'use strict';

/**
 * Controlled B1 Learning Companion shadow pilot.
 *
 * This bootstrap creates/maintains one dedicated test learner and class without
 * changing the B1 book status in the database. The student sees B1 as `pilot`
 * only through the existing per-session state adapter.
 *
 * Safety invariants:
 * - learner-facing Companion activation must remain OFF;
 * - shadow observation must be ON;
 * - only su-b1-l1 is available through the B1 pilot guards;
 * - only the dedicated pilot learner is injected into the runtime allowlist.
 */
const express=require('express');
const {Pool}=require('pg');
const bcrypt=require('bcryptjs');
const crypto=require('crypto');
const companion=require('./learning-companion-v1');
const smoke=require('./b1-shadow-pilot-smoke');

const BOOK_ID='speakup-b1';
const PILOT_CLASS_ID='b1_shadow_pilot_class';
const PILOT_CLASS_NAME='B1 Companion Shadow Pilot';
const pool=new Pool({connectionString:process.env.DATABASE_URL});
let preparing=null;

function enabled(){return String(process.env.B1_LEARNING_COMPANION_SHADOW_PILOT||'false').toLowerCase()==='true'}
function pilotUsername(){return String(process.env.B1_LEARNING_COMPANION_PILOT_STUDENT_USERNAME||'b1pilot').trim().toLowerCase()}
function pilotStudentName(){return String(process.env.B1_LEARNING_COMPANION_PILOT_STUDENT_NAME||'B1 Pilot Student').trim()||'B1 Pilot Student'}
function teacherUsername(){return String(process.env.B1_LEARNING_COMPANION_PILOT_TEACHER_USERNAME||process.env.TEACHER_USERNAME||'teacher').trim().toLowerCase()}

function assertSafeMode(){
  if(!enabled())return;
  if(companion.enabled())throw new Error('B1 shadow pilot refuses to start while LEARNING_COMPANION_V1 learner-facing mode is enabled.');
  if(!companion.shadowEnabled())throw new Error('B1 shadow pilot requires LEARNING_COMPANION_SHADOW_V1=true.');
}

async function verifyPilotState(studentId,password){
  const books=await pool.query("select id,status from books where id in ('speakup-b2',$1)",[BOOK_ID]);
  const byId=Object.fromEntries(books.rows.map(x=>[x.id,x.status]));
  const cls=await pool.query('select id,course_id,teacher_id from classes where id=$1 limit 1',[PILOT_CLASS_ID]);
  const memberships=await pool.query(`select e.class_id,u.role,u.id from enrollments e join users u on u.id=e.user_id where e.class_id=$1`,[PILOT_CLASS_ID]);
  const studentClasses=await pool.query('select class_id from enrollments where user_id=$1',[studentId]);
  const cred=await pool.query('select password_hash from users where id=$1 limit 1',[studentId]);
  const credentialValid=Boolean(cred.rowCount&&await bcrypt.compare(password,cred.rows[0].password_hash));
  const pilotStudents=memberships.rows.filter(x=>x.role==='student');
  const runtimeIds=new Set(String(process.env.B1_LEARNING_COMPANION_PILOT_STUDENT_IDS||'').split(',').map(x=>x.trim()).filter(Boolean));
  const ok=byId['speakup-b2']==='ready'&&byId[BOOK_ID]!=='ready'&&byId[BOOK_ID]!=='pilot'&&
    cls.rows[0]?.course_id===BOOK_ID&&pilotStudents.length===1&&pilotStudents[0].id===studentId&&
    studentClasses.rows.length===1&&studentClasses.rows[0].class_id===PILOT_CLASS_ID&&credentialValid&&
    runtimeIds.size===1&&runtimeIds.has(studentId)&&!companion.enabled()&&companion.shadowEnabled();
  if(!ok)throw new Error(`B1 shadow pilot self-check failed b2=${byId['speakup-b2']||'missing'} b1=${byId[BOOK_ID]||'missing'} pilotStudents=${pilotStudents.length} studentClasses=${studentClasses.rows.length} credential=${credentialValid} runtimeAllowlist=${runtimeIds.size}`);
  console.log('B1 SHADOW PILOT SELF-CHECK PASSED b2=ready b1=db-inactive dedicatedLearner=1 class=ok credential=valid shadow=on learnerFacing=off');
}

async function preparePilot(){
  if(!enabled())return null;
  if(preparing)return preparing;
  preparing=(async()=>{
    assertSafeMode();
    const password=String(process.env.B1_LEARNING_COMPANION_PILOT_STUDENT_PASSWORD||'').trim();
    if(!/^\d{8,20}$/.test(password))throw new Error('B1_LEARNING_COMPANION_PILOT_STUDENT_PASSWORD must contain 8–20 digits.');

    const b1=await pool.query('select id,status from books where id=$1 limit 1',[BOOK_ID]);
    if(!b1.rowCount)throw new Error('B1 course seed was not found.');
    if(['ready','pilot'].includes(String(b1.rows[0].status)))throw new Error('B1 shadow pilot requires B1 to remain globally inactive in the database.');

    const tq=await pool.query("select id from users where lower(username)=lower($1) and role='teacher' limit 1",[teacherUsername()]);
    if(!tq.rowCount)throw new Error('B1 shadow pilot teacher account was not found.');
    const teacherId=tq.rows[0].id;

    await pool.query(`insert into classes(id,name,level,course_id,teacher_id)
      values($1,$2,'B1',$3,$4)
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
      if(sq.rows[0].role!=='student')throw new Error('B1 pilot username belongs to a non-student account.');
      studentId=sq.rows[0].id;
      await pool.query('update users set password_hash=$1,name=$2 where id=$3',[await bcrypt.hash(password,12),pilotStudentName(),studentId]);
    }
    await pool.query('insert into profiles(user_id) values($1) on conflict do nothing',[studentId]);
    await pool.query('delete from enrollments where user_id=$1 and class_id<>$2',[studentId,PILOT_CLASS_ID]);
    await pool.query('insert into enrollments(class_id,user_id) values($1,$2) on conflict do nothing',[PILOT_CLASS_ID,studentId]);

    process.env.B1_LEARNING_COMPANION_PILOT_STUDENT_IDS=studentId;
    await verifyPilotState(studentId,password);
    console.log(`B1 CONTROLLED SHADOW PILOT ACTIVE class=${PILOT_CLASS_ID} learner=${username} lesson=su-b1-l1`);
    return{studentId,username,password}
  })();
  try{return await preparing}finally{preparing=null}
}

const nativeListen=express.application.listen;
express.application.listen=function b1ShadowPilotListen(...args){
  if(!enabled())return nativeListen.apply(this,args);
  const app=this;
  preparePilot().then(context=>{
    nativeListen.apply(app,args);
    if(context&&smoke.enabled()){
      const port=Number(process.env.PORT)||(typeof args[0]==='number'?args[0]:3000);
      setTimeout(()=>smoke.runAutosmoke({pool,port,...context}).catch(error=>console.error('B1 shadow autosmoke runner failed:',error?.message||error)),1500)
    }
  }).catch(error=>{
    console.error('B1 controlled shadow pilot activation failed:',error.message);
    process.exitCode=1;
    setTimeout(()=>process.exit(1),25);
  });
  return app;
};

module.exports={BOOK_ID,PILOT_CLASS_ID,PILOT_CLASS_NAME,enabled,pilotUsername,pilotStudentName,teacherUsername,assertSafeMode,preparePilot,verifyPilotState};
