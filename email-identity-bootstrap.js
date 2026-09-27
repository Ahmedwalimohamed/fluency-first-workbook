'use strict';

const express=require('express');
const crypto=require('crypto');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const rateLimit=require('express-rate-limit');
const {Pool}=require('pg');

const pool=new Pool({connectionString:process.env.DATABASE_URL});
const nativeGet=express.application.get;
const nativePost=express.application.post;
const nativePut=express.application.put;
const installed=new WeakSet();
let schemaPromise=null;

const resetLimiter=rateLimit({windowMs:10*60*1000,max:5,standardHeaders:true,legacyHeaders:false});
const emailUpdateLimiter=rateLimit({windowMs:10*60*1000,max:8,standardHeaders:true,legacyHeaders:false});

function normalizeEmail(value){
 const email=String(value||'').trim().toLowerCase();
 if(email.length<5||email.length>254)return '';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return '';
 return email;
}
function cookieValue(req,name){
 const header=String(req.headers?.cookie||'');
 for(const part of header.split(';')){
  const i=part.indexOf('=');if(i<0)continue;
  if(part.slice(0,i).trim()!==name)continue;
  try{return decodeURIComponent(part.slice(i+1).trim())}catch{return part.slice(i+1).trim()}
 }
 return '';
}
function sessionUser(req){
 try{return jwt.verify(req.cookies?.ff_session||cookieValue(req,'ff_session')||'',String(process.env.JWT_SECRET||''))}catch{return null}
}
function hashToken(token){return crypto.createHash('sha256').update(String(token)).digest('hex')}
function newToken(){return crypto.randomBytes(32).toString('base64url')}
function requestBase(req){
 const proto=String(req.headers?.['x-forwarded-proto']||'https').split(',')[0].trim()||'https';
 const host=String(req.headers?.['x-forwarded-host']||req.headers?.host||'').split(',')[0].trim();
 return host?`${proto}://${host}`:'';
}
function appBase(req){return String(process.env.EMAIL_PUBLIC_APP_URL||'').replace(/\/$/,'')||requestBase(req)}
function emailConfig(){
 const apiKey=String(process.env.RESEND_API_KEY||process.env.EMAIL_API_KEY||'').trim();
 const from=String(process.env.EMAIL_FROM||process.env.RESEND_FROM_EMAIL||'').trim();
 return {apiKey,from,configured:Boolean(apiKey&&from)};
}
async function ensureSchema(){
 if(schemaPromise)return schemaPromise;
 schemaPromise=(async()=>{
  await pool.query('alter table users add column if not exists email text');
  await pool.query('alter table users add column if not exists email_verified_at timestamptz');
  await pool.query("create unique index if not exists users_email_unique_lower on users(lower(email)) where email is not null and btrim(email)<>''");
  await pool.query(`create table if not exists email_verification_tokens(
   id text primary key,
   user_id text not null references users(id) on delete cascade,
   token_hash text unique not null,
   expires_at timestamptz not null,
   used_at timestamptz,
   created_at timestamptz not null default now()
  )`);
  await pool.query(`create table if not exists password_reset_tokens(
   id text primary key,
   user_id text not null references users(id) on delete cascade,
   token_hash text unique not null,
   expires_at timestamptz not null,
   used_at timestamptz,
   created_at timestamptz not null default now()
  )`);
 })().catch(error=>{schemaPromise=null;throw error});
 return schemaPromise;
}
async function sendEmail({to,subject,text,html}){
 const cfg=emailConfig();
 if(!cfg.configured){const e=new Error('Email delivery is not configured.');e.code='EMAIL_NOT_CONFIGURED';throw e}
 const r=await fetch('https://api.resend.com/emails',{
  method:'POST',
  headers:{Authorization:`Bearer ${cfg.apiKey}`,'Content-Type':'application/json'},
  body:JSON.stringify({from:cfg.from,to:[to],subject,text,html})
 });
 if(!r.ok){const detail=(await r.text()).slice(0,500);const e=new Error(`Email provider ${r.status}: ${detail}`);e.code='EMAIL_SEND_FAILED';throw e}
 return r.json().catch(()=>({ok:true}));
}
function safeName(value){return String(value||'EnglishGate learner').replace(/[<>]/g,'').slice(0,120)}
function verificationEmail({name,link}){
 const n=safeName(name);
 return {
  subject:'Verify your EnglishGate email',
  text:`Hello ${n},\n\nVerify your email for EnglishGate:\n${link}\n\nThis link expires in 30 minutes. If you did not request this, you can ignore this email.`,
  html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>Verify your EnglishGate email</h2><p>Hello ${n},</p><p>Confirm this email address so it can be used for account recovery.</p><p><a href="${link}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:white;text-decoration:none;border-radius:8px">Verify email</a></p><p style="color:#64748b">This link expires in 30 minutes.</p></div>`
 };
}
function resetEmail({name,link}){
 const n=safeName(name);
 return {
  subject:'Reset your EnglishGate password',
  text:`Hello ${n},\n\nReset your EnglishGate password:\n${link}\n\nThis link expires in 20 minutes and can only be used once. If you did not request this, ignore this email.`,
  html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>Reset your EnglishGate password</h2><p>Hello ${n},</p><p>Use the secure link below to choose a new password.</p><p><a href="${link}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:white;text-decoration:none;border-radius:8px">Reset password</a></p><p style="color:#64748b">This link expires in 20 minutes and works once.</p></div>`
 };
}
async function createVerification(user,req){
 const token=newToken(),hash=hashToken(token),id='evt_'+crypto.randomUUID();
 await pool.query('update email_verification_tokens set used_at=coalesce(used_at,now()) where user_id=$1 and used_at is null',[user.id]);
 await pool.query("insert into email_verification_tokens(id,user_id,token_hash,expires_at) values($1,$2,$3,now()+interval '30 minutes')",[id,user.id,hash]);
 const link=`${appBase(req)}/?emailVerify=${encodeURIComponent(token)}`;
 await sendEmail({to:user.email,...verificationEmail({name:user.name,link})});
}
async function createReset(user,req){
 const token=newToken(),hash=hashToken(token),id='prt_'+crypto.randomUUID();
 await pool.query('update password_reset_tokens set used_at=coalesce(used_at,now()) where user_id=$1 and used_at is null',[user.id]);
 await pool.query("insert into password_reset_tokens(id,user_id,token_hash,expires_at) values($1,$2,$3,now()+interval '20 minutes')",[id,user.id,hash]);
 const link=`${appBase(req)}/?passwordReset=${encodeURIComponent(token)}`;
 await sendEmail({to:user.email,...resetEmail({name:user.name,link})});
}
function install(app){
 if(installed.has(app))return;
 installed.add(app);

 nativeGet.call(app,'/__migration/email-config',async(req,res)=>{
  try{await ensureSchema();const cfg=emailConfig();res.set('Cache-Control','no-store');return res.status(cfg.configured?200:503).json({ok:cfg.configured,layer:'email-config',provider:'resend',fromConfigured:Boolean(cfg.from),apiKeyConfigured:Boolean(cfg.apiKey)})}
  catch(e){console.error('Email schema probe failed:',e);return res.status(503).json({ok:false,layer:'email-config',error:'EMAIL_SCHEMA_UNAVAILABLE'})}
 });

 nativeGet.call(app,'/api/account/email',async(req,res)=>{
  const user=sessionUser(req);if(!user)return res.status(401).json({error:'Please sign in again.'});
  try{
   await ensureSchema();
   const q=await pool.query('select email,email_verified_at from users where id=$1 limit 1',[user.id]);
   if(!q.rowCount)return res.status(404).json({error:'Account not found.'});
   return res.json({email:q.rows[0].email||'',verified:Boolean(q.rows[0].email_verified_at),verifiedAt:q.rows[0].email_verified_at||null});
  }catch(e){console.error('Read account email failed:',e);return res.status(503).json({error:'Email settings are temporarily unavailable.'})}
 });

 nativePut.call(app,'/api/account/email',emailUpdateLimiter,async(req,res)=>{
  const user=sessionUser(req);if(!user)return res.status(401).json({error:'Please sign in again.'});
  const email=normalizeEmail(req.body?.email);if(!email)return res.status(400).json({error:'Enter a valid email address.'});
  try{
   await ensureSchema();
   const duplicate=await pool.query('select 1 from users where lower(email)=lower($1) and id<>$2 limit 1',[email,user.id]);
   if(duplicate.rowCount)return res.status(409).json({error:'That email is already used by another EnglishGate account.'});
   const q=await pool.query('update users set email=$1,email_verified_at=null where id=$2 returning id,name,email',[email,user.id]);
   if(!q.rowCount)return res.status(404).json({error:'Account not found.'});
   try{await createVerification(q.rows[0],req)}catch(e){console.error('Verification email failed:',e.message);return res.status(e.code==='EMAIL_NOT_CONFIGURED'?503:502).json({error:'Your email was saved, but the verification message could not be sent. Please try again.'})}
   return res.json({ok:true,email,verified:false,message:'Verification email sent.'});
  }catch(e){console.error('Update account email failed:',e);return res.status(503).json({error:'Email settings are temporarily unavailable.'})}
 });

 nativePost.call(app,'/api/auth/verify-email',resetLimiter,async(req,res)=>{
  const token=String(req.body?.token||'').trim();if(token.length<30||token.length>200)return res.status(400).json({error:'This verification link is invalid or expired.'});
  const client=await pool.connect();
  try{
   await ensureSchema();await client.query('begin');
   const q=await client.query("select id,user_id from email_verification_tokens where token_hash=$1 and used_at is null and expires_at>now() for update",[hashToken(token)]);
   if(!q.rowCount){await client.query('rollback');return res.status(400).json({error:'This verification link is invalid or expired.'})}
   const row=q.rows[0];
   await client.query('update users set email_verified_at=now() where id=$1',[row.user_id]);
   await client.query('update email_verification_tokens set used_at=now() where id=$1',[row.id]);
   await client.query('commit');return res.json({ok:true,message:'Email verified.'});
  }catch(e){try{await client.query('rollback')}catch{}console.error('Verify email failed:',e);return res.status(503).json({error:'Email verification is temporarily unavailable.'})}
  finally{client.release()}
 });

 nativePost.call(app,'/api/auth/forgot-password',resetLimiter,async(req,res)=>{
  const email=normalizeEmail(req.body?.email);
  if(!email)return res.status(400).json({error:'Enter the email registered on your EnglishGate account.'});
  const generic={ok:true,message:'If this verified email belongs to an EnglishGate account, a reset link has been sent.'};
  try{
   await ensureSchema();
   const cfg=emailConfig();if(!cfg.configured)return res.status(503).json({error:'Email recovery is not configured yet.'});
   const q=await pool.query('select id,name,email from users where lower(email)=lower($1) and email_verified_at is not null limit 1',[email]);
   if(!q.rowCount){await new Promise(r=>setTimeout(r,180));return res.json(generic)}
   try{await createReset(q.rows[0],req)}catch(e){console.error('Password reset email failed:',e.message)}
   return res.json(generic);
  }catch(e){console.error('Forgot password email flow failed:',e);return res.status(503).json({error:'Email recovery is temporarily unavailable.'})}
 });

 nativePost.call(app,'/api/auth/reset-password',resetLimiter,async(req,res)=>{
  const token=String(req.body?.token||'').trim(),password=String(req.body?.password||'').trim();
  if(token.length<30||token.length>200)return res.status(400).json({error:'This reset link is invalid or expired.'});
  if(!/^\d{8,20}$/.test(password))return res.status(400).json({error:'Password must contain 8–20 numbers.'});
  const client=await pool.connect();
  try{
   await ensureSchema();await client.query('begin');
   const q=await client.query("select id,user_id from password_reset_tokens where token_hash=$1 and used_at is null and expires_at>now() for update",[hashToken(token)]);
   if(!q.rowCount){await client.query('rollback');return res.status(400).json({error:'This reset link is invalid or expired.'})}
   const row=q.rows[0];
   await client.query('update users set password_hash=$1 where id=$2',[await bcrypt.hash(password,12),row.user_id]);
   await client.query('update password_reset_tokens set used_at=now() where user_id=$1 and used_at is null',[row.user_id]);
   await client.query('commit');
   return res.json({ok:true,message:'Password changed. You can sign in now.'});
  }catch(e){try{await client.query('rollback')}catch{}console.error('Reset password failed:',e);return res.status(503).json({error:'Password reset is temporarily unavailable.'})}
  finally{client.release()}
 });
}

express.application.get=function emailIdentityGet(route,...handlers){install(this);return nativeGet.call(this,route,...handlers)};
express.application.post=function emailIdentityPost(route,...handlers){install(this);return nativePost.call(this,route,...handlers)};
express.application.put=function emailIdentityPut(route,...handlers){install(this);return nativePut.call(this,route,...handlers)};

module.exports={ensureSchema,emailConfig,normalizeEmail};
