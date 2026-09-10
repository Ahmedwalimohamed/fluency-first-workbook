const crypto=require('crypto');
const express=require('express');
const bcrypt=require('bcryptjs');
const rateLimit=require('express-rate-limit');
const {Pool}=require('pg');

const pool=new Pool({connectionString:process.env.DATABASE_URL});
const originalPost=express.application.post;
let forgotPasswordRouteReplaced=false;

function normalizeWhatsapp(value){
 const number=String(value||'').trim().replace(/[\s().-]/g,'').replace(/^00/,'+');
 return /^\+[1-9]\d{7,14}$/.test(number)?number:null;
}
function numericPassword(){return String(crypto.randomInt(10000000,100000000));}
function appUrl(){return String(process.env.PUBLIC_APP_URL||'https://learnenglish.iouborama.com').replace(/\/$/,'');}
async function deliverWhatsapp(number,message){
 const endpoint=String(process.env.WHATSAPP_SENDER_URL||'').replace(/\/$/,'');
 const apiKey=String(process.env.WHATSAPP_SENDER_API_KEY||'');
 if(!endpoint||!apiKey)throw new Error('WhatsApp delivery is not configured');
 const r=await fetch(endpoint+'/api/send-text',{
  method:'POST',
  headers:{'Content-Type':'application/json','x-api-key':apiKey},
  body:JSON.stringify({recipient:number,message})
 });
 if(!r.ok){let detail='';try{detail=String((await r.json())?.error||'')}catch{}throw new Error(detail||`WhatsApp delivery failed (${r.status})`)}
}
function resetMessage(user,password){
 const personalUrl=user.login_token?`${appUrl()}/?access=${encodeURIComponent(user.login_token)}`:appUrl();
 return `EnglishGate password reset\n\nHello ${user.name||'Student'},\nUsername: ${user.username}\nNew password: ${password}\n\nSign in: ${personalUrl}\n\nKeep this password private.`;
}

const resetLimiter=rateLimit({windowMs:10*60*1000,max:5,standardHeaders:true,legacyHeaders:false});

async function passwordResetHandler(req,res){
 const accessToken=String(req.body?.accessToken||'').trim();
 const username=String(req.body?.username||'').trim().toLowerCase();
 const whatsappNumber=normalizeWhatsapp(req.body?.whatsappNumber);
 const client=await pool.connect();
 try{
  await client.query('begin');
  let q;
  if(accessToken){
   if(!/^[A-Za-z0-9_-]{24,128}$/.test(accessToken)){
    await client.query('rollback');
    return res.status(400).json({error:'This personal login link is invalid. Ask your teacher for help.'});
   }
   q=await client.query("select id,username,role,name,whatsapp_number,login_token from users where login_token=$1 and role='student' for update",[accessToken]);
  }else{
   if(!/^[a-z0-9._-]{3,32}$/.test(username)||!whatsappNumber){
    await client.query('rollback');
    return res.status(400).json({error:'Enter your username and registered WhatsApp number with country code.'});
   }
   q=await client.query("select id,username,role,name,whatsapp_number,login_token from users where lower(username)=lower($1) and role='student' for update",[username]);
   const stored=q.rowCount?normalizeWhatsapp(q.rows[0].whatsapp_number):null;
   if(!q.rowCount||!stored||stored!==whatsappNumber){
    await client.query('rollback');
    return res.status(404).json({error:'The username and registered WhatsApp number do not match an EnglishGate student account.'});
   }
  }
  if(!q.rowCount){
   await client.query('rollback');
   return res.status(404).json({error:'Student account not found. Ask your teacher for help.'});
  }
  const user=q.rows[0];
  const destination=normalizeWhatsapp(user.whatsapp_number);
  if(!destination){
   await client.query('rollback');
   return res.status(409).json({error:'No registered WhatsApp number is available for this student. Ask your teacher for help.'});
  }
  const password=numericPassword();
  await client.query('update users set password_hash=$1 where id=$2',[await bcrypt.hash(password,12),user.id]);
  await deliverWhatsapp(destination,resetMessage(user,password));
  await client.query('commit');
  res.set('Cache-Control','no-store');
  res.json({ok:true,delivery:'whatsapp'});
 }catch(error){
  try{await client.query('rollback')}catch{}
  console.error('Student password reset delivery failed:',String(error?.message||error).slice(0,300));
  res.status(502).json({error:'We could not send the new password to WhatsApp. Your current password is still active. Please try again.'});
 }finally{client.release()}
}

express.application.post=function patchedPost(route,...handlers){
 if(route==='/api/auth/forgot-password'&&!forgotPasswordRouteReplaced){
  forgotPasswordRouteReplaced=true;
  return originalPost.call(this,route,resetLimiter,passwordResetHandler);
 }
 return originalPost.call(this,route,...handlers);
};

require('./server.js');
