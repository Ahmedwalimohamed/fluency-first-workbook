const express=require('express');
const jwt=require('jsonwebtoken');
const crypto=require('crypto');
const {Pool}=require('pg');

const nativeGet=express.application.get;
const nativePost=express.application.post;
const nativePatch=express.application.patch;
const nativeUse=express.application.use;
const installed=new WeakSet();
const pool=new Pool({connectionString:process.env.DATABASE_URL});
let schemaPromise=null;

function ensureCookies(req){
  if(req.cookies&&Object.keys(req.cookies).length)return;
  const raw=String(req.headers?.cookie||'');req.cookies=req.cookies||{};
  for(const part of raw.split(';')){
    const i=part.indexOf('=');if(i<1)continue;
    const k=part.slice(0,i).trim(),v=part.slice(i+1).trim();
    try{req.cookies[k]=decodeURIComponent(v)}catch{req.cookies[k]=v}
  }
}
function user(req){try{ensureCookies(req);return jwt.verify(req.cookies?.ff_session||'',process.env.JWT_SECRET)}catch{return null}}
function clean(v,max=120){return String(v??'').trim().slice(0,max)}
function controlToken(u,session,role){
  return jwt.sign({scope:'englishgate-jitsi',userId:String(u.id),role:String(role),classId:String(session.class_id),sessionId:String(session.id)},process.env.JWT_SECRET,{expiresIn:'8h'});
}
function scoped(req){
  try{
    const raw=String(req.headers?.['x-englishgate-jitsi-token']||'').trim();if(!raw)return null;
    const p=jwt.verify(raw,process.env.JWT_SECRET);return p?.scope==='englishgate-jitsi'?p:null;
  }catch{return null}
}
function teacherAuth(req,{classId=null,sessionId=null}={}){
  const u=user(req);if(u?.role==='teacher')return {id:String(u.id),name:u.name,username:u.username};
  const p=scoped(req);if(!p||p.role!=='teacher')return null;
  if(classId&&String(p.classId)!==String(classId))return null;
  if(sessionId&&String(p.sessionId)!==String(sessionId))return null;
  return {id:String(p.userId),name:'Teacher',username:''};
}
function studentAuth(req,{sessionId=null}={}){
  const u=user(req);if(u?.role==='student')return {id:String(u.id),name:u.name,username:u.username};
  const p=scoped(req);if(!p||p.role!=='student')return null;
  if(sessionId&&String(p.sessionId)!==String(sessionId))return null;
  return {id:String(p.userId),name:'Student',username:''};
}
function domainHost(){
  const raw=clean(process.env.JITSI_DOMAIN,300).replace(/\/$/,'');
  if(!raw)return '';
  try{return new URL(raw.includes('://')?raw:'https://'+raw).host}catch{return raw.replace(/^https?:\/\//,'').split('/')[0]}
}
function configured(){return Boolean(domainHost()&&process.env.JITSI_APP_ID&&process.env.JITSI_APP_SECRET)}
function ensureSchema(){if(!schemaPromise)schemaPromise=(async()=>{
  await pool.query(`create table if not exists jitsi_class_sessions(
    id text primary key,
    class_id text not null references classes(id) on delete cascade,
    teacher_id text not null references users(id) on delete cascade,
    room_name text not null unique,
    status text not null default 'active' check(status in ('active','ended')),
    started_at timestamptz not null default now(),
    ended_at timestamptz
  )`);
  await pool.query(`create table if not exists jitsi_session_attendance(
    session_id text not null references jitsi_class_sessions(id) on delete cascade,
    user_id text not null references users(id) on delete cascade,
    role text not null,
    joined_at timestamptz not null default now(),
    last_seen timestamptz not null default now(),
    left_at timestamptz,
    primary key(session_id,user_id)
  )`);
})();return schemaPromise}
async function teacherClass(classId,teacherId){
  const q=await pool.query(`select c.* from classes c where c.id=$1 and c.teacher_id=$2`,[classId,teacherId]);
  return q.rows[0]||null;
}
function roomName(classId){return ('eg-'+String(classId).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,28)+'-'+crypto.randomUUID().replace(/-/g,'').slice(0,16)).toLowerCase()}
function joinToken(session,u,moderator){
  const host=domainHost(),appId=String(process.env.JITSI_APP_ID);
  const payload={
    aud:appId,iss:appId,sub:host,room:session.room_name,
    context:{user:{id:String(u.id),name:String(u.name||u.username||'EnglishGate user'),moderator:Boolean(moderator)}}
  };
  return jwt.sign(payload,String(process.env.JITSI_APP_SECRET),{algorithm:'HS256',expiresIn:'2h'});
}
function publicSession(row){return {id:row.id,classId:row.class_id,roomName:row.room_name,status:row.status,startedAt:row.started_at,endedAt:row.ended_at||null}}
function joinPayload(row,u,moderator){return {session:publicSession(row),domain:domainHost(),jwt:joinToken(row,u,moderator),controlToken:controlToken(u,row,moderator?'teacher':'student'),displayName:String(u.name||u.username||'EnglishGate user'),moderator:Boolean(moderator)}}

function install(app){
  if(installed.has(app))return;installed.add(app);
  nativeUse.call(app,(req,res,next)=>{ensureCookies(req);next()});

  nativeGet.call(app,'/api/jitsi/status',(req,res)=>{
    const u=user(req);if(!u)return res.status(401).json({error:'Please sign in again.'});
    res.set('Cache-Control','no-store').json({configured:configured(),domain:configured()?domainHost():null});
  });

  nativeGet.call(app,'/api/teacher/jitsi-session/current',async(req,res)=>{
    try{
      await ensureSchema();const classId=clean(req.query?.classId),u=teacherAuth(req,{classId});if(!u)return res.status(403).json({error:'Teacher access required.'});const c=await teacherClass(classId,u.id);
      if(!c)return res.status(404).json({error:'Class not found.'});
      const q=await pool.query(`select * from jitsi_class_sessions where class_id=$1 and teacher_id=$2 and status='active' order by started_at desc limit 1`,[classId,u.id]);
      res.set('Cache-Control','no-store');
      if(!q.rowCount)return res.json({session:null,configured:configured()});
      if(!configured())return res.status(503).json({error:'Jitsi is not configured on this EnglishGate deployment.'});
      res.json({...joinPayload(q.rows[0],u,true),configured:true});
    }catch(e){console.error('jitsi teacher current error',e);res.status(500).json({error:'Live classroom status is temporarily unavailable.'})}
  });

  nativePost.call(app,'/api/teacher/jitsi-session/start',async(req,res)=>{
    const u=user(req);if(!u||u.role!=='teacher')return res.status(403).json({error:'Teacher access required.'});
    if(!configured())return res.status(503).json({error:'Jitsi is not configured yet. Add JITSI_DOMAIN, JITSI_APP_ID and JITSI_APP_SECRET.'});
    try{
      await ensureSchema();const classId=clean(req.body?.classId),c=await teacherClass(classId,u.id);
      if(!c)return res.status(404).json({error:'Class not found.'});
      if(c.approval_status&&c.approval_status!=='approved')return res.status(409).json({error:'The class must be approved before starting a live class.'});
      const client=await pool.connect();try{
        await client.query('begin');
        await client.query(`update jitsi_class_sessions set status='ended',ended_at=coalesce(ended_at,now()) where class_id=$1 and status='active'`,[classId]);
        const id='jc_'+crypto.randomUUID(),room=roomName(classId);
        const q=await client.query(`insert into jitsi_class_sessions(id,class_id,teacher_id,room_name,status) values($1,$2,$3,$4,'active') returning *`,[id,classId,u.id,room]);
        await client.query('commit');
        res.status(201).json({...joinPayload(q.rows[0],u,true),configured:true,className:c.name});
      }catch(e){await client.query('rollback');throw e}finally{client.release()}
    }catch(e){console.error('jitsi start error',e);res.status(500).json({error:'The live classroom could not be started.'})}
  });

  nativePatch.call(app,'/api/teacher/jitsi-session/:id/end',async(req,res)=>{
    const u=teacherAuth(req,{sessionId:req.params.id});if(!u)return res.status(403).json({error:'Teacher access required.'});
    try{
      await ensureSchema();const q=await pool.query(`update jitsi_class_sessions set status='ended',ended_at=now() where id=$1 and teacher_id=$2 returning id`,[req.params.id,u.id]);
      if(!q.rowCount)return res.status(404).json({error:'Live classroom not found.'});
      await pool.query(`update jitsi_session_attendance set left_at=coalesce(left_at,now()),last_seen=now() where session_id=$1 and left_at is null`,[req.params.id]);
      res.json({ok:true});
    }catch(e){console.error('jitsi end error',e);res.status(500).json({error:'The live classroom could not be ended.'})}
  });

  nativeGet.call(app,'/api/student/jitsi-session/current',async(req,res)=>{
    const u=studentAuth(req);if(!u)return res.status(403).json({error:'Student access required.'});
    try{
      await ensureSchema();
      const q=await pool.query(`select s.* from jitsi_class_sessions s join classes c on c.id=s.class_id and coalesce(c.approval_status,'approved')='approved' join enrollments e on e.class_id=s.class_id and e.user_id=$1 where s.status='active' order by s.started_at desc limit 1`,[u.id]);
      res.set('Cache-Control','no-store');
      if(!q.rowCount)return res.json({session:null,configured:configured()});
      if(!configured())return res.status(503).json({error:'Live classroom video is not configured yet.'});
      res.json({...joinPayload(q.rows[0],u,false),configured:true});
    }catch(e){console.error('jitsi student current error',e);res.status(500).json({error:'Live classroom status is temporarily unavailable.'})}
  });

  nativePost.call(app,'/api/jitsi-session/:id/presence',async(req,res)=>{
    const p=scoped(req),cookie=user(req),role=cookie?.role||p?.role,u=role==='teacher'?teacherAuth(req,{sessionId:req.params.id}):studentAuth(req,{sessionId:req.params.id});if(!u||!['teacher','student'].includes(role))return res.status(403).json({error:'Live classroom access required.'});u.role=role;
    try{
      await ensureSchema();
      const sessionQ=await pool.query(`select s.* from jitsi_class_sessions s where s.id=$1`,[req.params.id]);
      if(!sessionQ.rowCount)return res.status(404).json({error:'Live classroom not found.'});
      const session=sessionQ.rows[0];
      if(u.role==='teacher'&&String(session.teacher_id)!==String(u.id))return res.status(403).json({error:'Teacher access required.'});
      if(u.role==='student'){
        const e=await pool.query('select 1 from enrollments where class_id=$1 and user_id=$2',[session.class_id,u.id]);
        if(!e.rowCount)return res.status(403).json({error:'You are not enrolled in this class.'});
      }
      const action=clean(req.body?.action,20);
      if(action==='leave'){
        await pool.query(`insert into jitsi_session_attendance(session_id,user_id,role,joined_at,last_seen,left_at) values($1,$2,$3,now(),now(),now()) on conflict(session_id,user_id) do update set last_seen=now(),left_at=now()`,[session.id,u.id,u.role]);
      }else{
        await pool.query(`insert into jitsi_session_attendance(session_id,user_id,role,joined_at,last_seen,left_at) values($1,$2,$3,now(),now(),null) on conflict(session_id,user_id) do update set last_seen=now(),left_at=null`,[session.id,u.id,u.role]);
      }
      res.json({ok:true});
    }catch(e){console.error('jitsi presence error',e);res.status(500).json({error:'Attendance could not be updated.'})}
  });

  nativeGet.call(app,'/api/teacher/jitsi-session/:id/attendance',async(req,res)=>{
    const u=teacherAuth(req,{sessionId:req.params.id});if(!u)return res.status(403).json({error:'Teacher access required.'});
    try{
      await ensureSchema();
      const own=await pool.query('select 1 from jitsi_class_sessions where id=$1 and teacher_id=$2',[req.params.id,u.id]);
      if(!own.rowCount)return res.status(404).json({error:'Live classroom not found.'});
      const q=await pool.query(`select a.user_id as "userId",u.name,u.username,a.role,a.joined_at as "joinedAt",a.last_seen as "lastSeen",a.left_at as "leftAt" from jitsi_session_attendance a join users u on u.id=a.user_id where a.session_id=$1 order by a.joined_at`,[req.params.id]);
      res.set('Cache-Control','no-store').json({attendance:q.rows});
    }catch(e){console.error('jitsi attendance error',e);res.status(500).json({error:'Attendance is temporarily unavailable.'})}
  });
}

express.application.get=function jitsiGet(route,...handlers){install(this);return nativeGet.call(this,route,...handlers)};
express.application.post=function jitsiPost(route,...handlers){install(this);return nativePost.call(this,route,...handlers)};
express.application.patch=function jitsiPatch(route,...handlers){install(this);return nativePatch.call(this,route,...handlers)};
express.application.use=function jitsiUse(...handlers){install(this);return nativeUse.call(this,...handlers)};

require('./ai-content-editor-generate-v2-bootstrap.js');
