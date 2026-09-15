const express=require('express');
const jwt=require('jsonwebtoken');
const crypto=require('crypto');
const {Pool}=require('pg');

const inheritedGet=express.application.get;
const inheritedPost=express.application.post;
const inheritedPatch=express.application.patch;
const installed=new WeakSet();
const pool=new Pool({connectionString:process.env.DATABASE_URL});
let schemaPromise=null;

function sessionUser(req){
  try{return jwt.verify(req.cookies?.ff_session||'',process.env.JWT_SECRET)}catch{return null}
}
function ensureSchema(){
  if(!schemaPromise){
    schemaPromise=(async()=>{
      await pool.query("alter table classes add column if not exists approval_status text not null default 'approved'");
      await pool.query("alter table classes add column if not exists created_by text references users(id) on delete set null");
      await pool.query("alter table classes add column if not exists approved_by text references users(id) on delete set null");
      await pool.query("alter table classes add column if not exists approved_at timestamptz");
      await pool.query("update classes set approval_status='approved' where approval_status is null or approval_status='' ");
    })().catch(err=>{schemaPromise=null;throw err});
  }
  return schemaPromise;
}
function isApprovedClass(c){return !c?.approval_status||c.approval_status==='approved'}

function install(app){
  if(installed.has(app))return;
  installed.add(app);

  app.use(async(req,res,next)=>{
    if(req.path!=='/api/state')return next();
    try{await ensureSchema()}catch(err){console.error('class approval schema error',err);return next(err)}
    const u=sessionUser(req);
    if(u?.role!=='student')return next();
    const originalJson=res.json.bind(res);
    res.json=(payload)=>{
      if(payload&&typeof payload==='object'){
        const approvedClasses=Array.isArray(payload.classes)?payload.classes.filter(isApprovedClass):[];
        const approvedIds=new Set(approvedClasses.map(c=>c.id));
        payload={...payload,classes:approvedClasses};
        if(Array.isArray(payload.assignments))payload.assignments=payload.assignments.filter(a=>approvedIds.has(a.classId));
        if(Array.isArray(payload.users))payload.users=payload.users.map(user=>({...user,class_ids:Array.isArray(user.class_ids)?user.class_ids.filter(id=>approvedIds.has(id)):user.class_ids,classIds:Array.isArray(user.classIds)?user.classIds.filter(id=>approvedIds.has(id)):user.classIds}));
      }
      return originalJson(payload);
    };
    next();
  });

  inheritedPost.call(app,'/api/teacher/classes',async(req,res)=>{
    const u=sessionUser(req);if(!u||u.role!=='teacher')return res.status(403).json({error:'Teacher access required.'});
    try{await ensureSchema()}catch(e){console.error('class approval schema error',e);return res.status(500).json({error:'Class setup is temporarily unavailable.'})}
    const name=String(req.body?.name||'').trim(),bookId=String(req.body?.bookId||'').trim();
    if(name.length<2||name.length>100)return res.status(400).json({error:'Enter a class name between 2 and 100 characters.'});
    const b=await pool.query("select id,title,level,status from books where id=$1",[bookId]);
    if(!b.rowCount)return res.status(400).json({error:'Choose a valid book.'});
    if(!['ready','pilot'].includes(b.rows[0].status))return res.status(400).json({error:'That book is not ready for classes yet.'});
    const duplicate=await pool.query("select 1 from classes where teacher_id=$1 and lower(trim(name))=lower(trim($2))",[u.id,name]);
    if(duplicate.rowCount)return res.status(409).json({error:'You already have a class with that name.'});
    const client=await pool.connect();
    try{
      await client.query('begin');
      const id='c_'+crypto.randomUUID();
      const q=await client.query("insert into classes(id,name,level,course_id,teacher_id,created_by,approval_status,approved_by,approved_at) values($1,$2,$3,$4,$5,$5,'pending',null,null) returning *",[id,name,b.rows[0].level,bookId,u.id]);
      await client.query('insert into enrollments(class_id,user_id) values($1,$2) on conflict do nothing',[id,u.id]);
      await client.query('commit');
      const c=q.rows[0];
      res.status(201).json({...c,bookId:c.course_id,message:'Class created and sent to the admin for approval.'});
    }catch(e){await client.query('rollback');console.error('teacher class creation error',e);res.status(500).json({error:'The class could not be created.'})}finally{client.release()}
  });

  inheritedPatch.call(app,'/api/admin/classes/:id/approval',async(req,res)=>{
    const u=sessionUser(req);if(!u||u.role!=='admin')return res.status(403).json({error:'System Admin access required.'});
    try{await ensureSchema()}catch(e){console.error('class approval schema error',e);return res.status(500).json({error:'Class approval is temporarily unavailable.'})}
    const classId=String(req.params.id||'').trim();
    const q=await pool.query("update classes set approval_status='approved',approved_by=$1,approved_at=now() where id=$2 returning *",[u.id,classId]);
    if(!q.rowCount)return res.status(404).json({error:'Class not found.'});
    const c=q.rows[0];
    res.json({ok:true,class:{...c,bookId:c.course_id}});
  });

  inheritedPost.call(app,'/api/teacher/assignments',async(req,res,next)=>{
    const u=sessionUser(req);if(!u||u.role!=='teacher')return next();
    try{await ensureSchema()}catch(e){return next(e)}
    const classId=String(req.body?.classId||'').trim();if(!classId)return next();
    const q=await pool.query('select teacher_id,approval_status from classes where id=$1',[classId]);
    if(!q.rowCount||q.rows[0].teacher_id!==u.id)return next();
    if(q.rows[0].approval_status!=='approved')return res.status(409).json({error:'This class is waiting for admin approval. You can add students now, but assign lessons after approval.'});
    next();
  });
}

express.application.get=function classApprovalAwareGet(route,...handlers){install(this);return inheritedGet.call(this,route,...handlers)};
express.application.post=function classApprovalAwarePost(route,...handlers){install(this);return inheritedPost.call(this,route,...handlers)};
express.application.patch=function classApprovalAwarePatch(route,...handlers){install(this);return inheritedPatch.call(this,route,...handlers)};

require('./ai-content-editor-generate-v2-bootstrap.js');
