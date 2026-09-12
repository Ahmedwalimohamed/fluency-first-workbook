const express=require('express');
const jwt=require('jsonwebtoken');
const {Pool}=require('pg');

const originalPost=express.application.post;
const originalPatch=express.application.patch;
const installed=new WeakSet();
const pool=new Pool({connectionString:process.env.DATABASE_URL});

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

require('./ai-content-editor-bootstrap.js');
