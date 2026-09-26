const express=require('express');
const jwt=require('jsonwebtoken');
const crypto=require('crypto');
const {Pool}=require('pg');

const originalPost=express.application.post;
const originalPatch=express.application.patch;
const installed=new WeakSet();
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const DEFAULT_SCHOOL_ID='school_iou_borama';

function adminFrom(req){
  try{
    const user=jwt.verify(req.cookies?.ff_session||'',process.env.JWT_SECRET);
    return user?.role==='admin'?user:null;
  }catch{return null}
}
function normalizeWhatsapp(value){
  if(typeof value!=='string'||value.length>40)return null;
  const number=value.trim().replace(/[\s().-]/g,'').replace(/^00/,'+');
  return /^\+[1-9]\d{7,14}$/.test(number)?number:null;
}
function install(app){
  if(installed.has(app))return;
  installed.add(app);

  // Compatibility bridge for the legacy admin class-creation screen.
  // Multi-school DB guards require every teacher/class to have a school. Older
  // /api/admin/teachers creation did not set school_id, so a newly created teacher
  // could be selected successfully but the class INSERT then failed in
  // englishgate_class_school_guard() with "Teacher must belong to a school".
  // Repair a missing teacher scope atomically at class creation, then write the
  // class with an explicit matching school_id. Never move an already-scoped
  // teacher between schools.
  originalPost.call(app,'/api/admin/classes',async(req,res,next)=>{
    const admin=adminFrom(req);
    if(!admin)return next();
    const name=String(req.body?.name||'').trim();
    const teacherId=String(req.body?.teacherId||'').trim();
    const bookId=String(req.body?.bookId||'').trim();
    if(name.length<2)return res.status(400).json({error:'Class name is required.'});
    const client=await pool.connect();
    try{
      await client.query('begin');
      const adminRow=(await client.query("select school_id from users where id=$1 and role='admin'",[admin.id])).rows[0];
      const teacher=(await client.query("select id,school_id from users where id=$1 and role='teacher' for update",[teacherId])).rows[0];
      if(!teacher){await client.query('rollback');return res.status(400).json({error:'Choose a valid teacher.'});}
      const book=(await client.query("select id,title,level,status from books where id=$1",[bookId])).rows[0];
      if(!book){await client.query('rollback');return res.status(400).json({error:'Choose a valid book.'});}
      if(!['ready','pilot'].includes(book.status)){await client.query('rollback');return res.status(400).json({error:'That book is not ready for classes yet.'});}

      // School admins are hard-scoped to their own school. A system admin keeps an
      // already-scoped teacher in that school; only an unscoped legacy teacher is
      // attached to the original EnglishGate/IOU-Borama school.
      const adminSchool=adminRow?.school_id||null;
      const schoolId=adminSchool||teacher.school_id||DEFAULT_SCHOOL_ID;
      if(adminSchool&&teacher.school_id&&teacher.school_id!==adminSchool){
        await client.query('rollback');
        return res.status(400).json({error:'Choose a teacher from this school.'});
      }
      if(!teacher.school_id){
        const schoolExists=await client.query("select 1 from schools where id=$1 and status='active'",[schoolId]);
        if(!schoolExists.rowCount){await client.query('rollback');return res.status(409).json({error:'The teacher is not linked to an active school. Assign the teacher to a school first.'});}
        await client.query("update users set school_id=$1 where id=$2 and role='teacher' and school_id is null",[schoolId,teacherId]);
      }

      const id='c_'+crypto.randomUUID();
      await client.query('insert into classes(id,name,level,course_id,teacher_id,school_id) values($1,$2,$3,$4,$5,$6)',[id,name,book.level,bookId,teacherId,schoolId]);
      await client.query('insert into enrollments(class_id,user_id) values($1,$2) on conflict do nothing',[id,teacherId]);
      await client.query('commit');
      return res.status(201).json({id,name,level:book.level,bookId,teacherId,schoolId});
    }catch(e){
      try{await client.query('rollback')}catch{}
      console.error('Admin class creation compatibility error:',e);
      return next(e);
    }finally{client.release()}
  });

  originalPatch.call(app,'/api/admin/teachers/:id/manage',async(req,res)=>{
    const admin=adminFrom(req);
    if(!admin)return res.status(403).json({error:'System Admin access required.'});
    const teacherId=String(req.params.id||'').trim();
    const name=String(req.body?.name||'').trim().replace(/\s+/g,' ');
    const username=String(req.body?.username||'').trim().toLowerCase();
    const whatsappNumber=normalizeWhatsapp(req.body?.whatsappNumber);
    if(name.length<2||name.length>100)return res.status(400).json({error:'Enter a valid teacher name.'});
    if(!/^[a-z0-9._-]{3,32}$/.test(username))return res.status(400).json({error:'Use a 3–32 character username with letters, numbers, dots, dashes, or underscores.'});
    if(!whatsappNumber)return res.status(400).json({error:'Enter a WhatsApp number with country code, for example +252 63 1234567.'});
    try{
      const teacher=await pool.query("select id from users where id=$1 and role='teacher'",[teacherId]);
      if(!teacher.rowCount)return res.status(404).json({error:'Teacher not found.'});
      const duplicate=await pool.query('select 1 from users where lower(username)=lower($1) and id<>$2',[username,teacherId]);
      if(duplicate.rowCount)return res.status(409).json({error:'That username already exists.'});
      await pool.query('update users set name=$1,username=$2,whatsapp_number=$3 where id=$4',[name,username,whatsappNumber,teacherId]);
      res.json({ok:true,teacher:{id:teacherId,name,username,whatsappNumber}});
    }catch(e){
      console.error('Teacher management update error:',e.message);
      res.status(500).json({error:'Teacher details could not be updated.'});
    }
  });
}

express.application.post=function teacherManagementPost(route,...handlers){
  install(this);
  return originalPost.call(this,route,...handlers);
};

require('./a1-gold-bootstrap.js');
require('./b1-shadow-pilot-bootstrap.js');
require('./reading-listening-separation-bootstrap.js');
require('./learning-companion-core-attempt-shadow-bootstrap.js');
require('./learning-companion-shadow-monitor-bootstrap.js');
require('./ai-content-editor-bootstrap.js');