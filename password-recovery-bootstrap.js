const crypto=require('crypto');
const express=require('express');
const bcrypt=require('bcryptjs');
const rateLimit=require('express-rate-limit');
const {Pool}=require('pg');

const pool=new Pool({connectionString:process.env.DATABASE_URL});
const originalGet=express.application.get;
const originalPost=express.application.post;
let forgotPasswordRouteReplaced=false;
const recoveryPages=new WeakSet();

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
function userError(status,message){const e=new Error(message);e.status=status;e.publicMessage=message;return e;}

const resetLimiter=rateLimit({windowMs:10*60*1000,max:5,standardHeaders:true,legacyHeaders:false});

async function resetStudentPassword(body){
 const accessToken=String(body?.accessToken||'').trim();
 const username=String(body?.username||'').trim().toLowerCase();
 const whatsappNumber=normalizeWhatsapp(body?.whatsappNumber);
 const client=await pool.connect();
 try{
  await client.query('begin');
  let q;
  if(accessToken){
   if(!/^[A-Za-z0-9_-]{24,128}$/.test(accessToken))throw userError(400,'This personal login link is invalid. Ask your teacher for help.');
   q=await client.query("select id,username,role,name,whatsapp_number,login_token from users where login_token=$1 and role='student' for update",[accessToken]);
  }else{
   if(!/^[a-z0-9._-]{3,32}$/.test(username)||!whatsappNumber)throw userError(400,'Enter your username and registered WhatsApp number with country code.');
   q=await client.query("select id,username,role,name,whatsapp_number,login_token from users where lower(username)=lower($1) and role='student' for update",[username]);
   const stored=q.rowCount?normalizeWhatsapp(q.rows[0].whatsapp_number):null;
   if(!q.rowCount||!stored||stored!==whatsappNumber)throw userError(404,'The username and registered WhatsApp number do not match an EnglishGate student account.');
  }
  if(!q.rowCount)throw userError(404,'Student account not found. Ask your teacher for help.');
  const user=q.rows[0];
  const destination=normalizeWhatsapp(user.whatsapp_number);
  if(!destination)throw userError(409,'No registered WhatsApp number is available for this student. Ask your teacher for help.');
  const password=numericPassword();
  await client.query('update users set password_hash=$1 where id=$2',[await bcrypt.hash(password,12),user.id]);
  await deliverWhatsapp(destination,resetMessage(user,password));
  await client.query('commit');
  return {ok:true,delivery:'whatsapp'};
 }catch(error){
  try{await client.query('rollback')}catch{}
  if(error?.publicMessage)throw error;
  console.error('Student password reset delivery failed:',String(error?.message||error).slice(0,300));
  throw userError(502,'We could not send the new password to WhatsApp. Your current password is still active. Please try again.');
 }finally{client.release()}
}

async function passwordResetHandler(req,res){
 try{
  const result=await resetStudentPassword(req.body||{});
  res.set('Cache-Control','no-store');
  res.json(result);
 }catch(error){
  res.status(Number(error?.status)||500).json({error:error?.publicMessage||'Password reset failed.'});
 }
}

function esc(value){return String(value||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function recoveryPage({username='',whatsappNumber='',error='',success=false}={}){
 const notice=success
  ?'<div class="notice good"><strong>New password sent.</strong><br>Check the registered WhatsApp number, then return to EnglishGate and sign in with the new password.</div>'
  :error?`<div class="notice bad">${esc(error)}</div>`:'';
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EnglishGate · Password help</title><style>body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f8fafc;color:#0f172a;margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;box-sizing:border-box}.card{width:min(100%,460px);background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:28px;box-shadow:0 18px 50px rgba(15,23,42,.08)}h1{font-size:26px;margin:0 0 8px}p{color:#64748b;line-height:1.55}label{display:block;font-weight:700;margin:18px 0 7px}input{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:13px 14px;font:inherit}button{width:100%;margin-top:22px;border:0;border-radius:10px;padding:13px 16px;background:#17369f;color:#fff;font:inherit;font-weight:800;cursor:pointer}.notice{margin:18px 0 0;padding:13px 14px;border-radius:10px;line-height:1.45}.good{background:#ecfdf3;color:#166534}.bad{background:#fef2f2;color:#991b1b}.back{display:inline-block;margin-top:20px;color:#17369f;text-decoration:none;font-weight:700}small{display:block;color:#64748b;margin-top:6px}</style></head><body><main class="card"><h1>Get a new password</h1><p>Enter your EnglishGate username and the WhatsApp number registered on your student account. Your new password will be sent only to that registered number.</p>${notice}${success?'':`<form method="post" action="/forgot-password"><label for="username">Username</label><input id="username" name="username" value="${esc(username)}" autocomplete="username" required placeholder="e.g. amina.ali"><label for="whatsappNumber">Registered WhatsApp number</label><input id="whatsappNumber" name="whatsappNumber" value="${esc(whatsappNumber)}" type="tel" autocomplete="tel" required placeholder="+252 63 1234567"><small>Use the same number saved on the account, including country code.</small><button type="submit">Send new password</button></form>`}<a class="back" href="/">← Back to sign in</a></main></body></html>`;
}

async function passwordResetPageHandler(req,res){
 const username=String(req.body?.username||'').trim();
 const whatsappNumber=String(req.body?.whatsappNumber||'').trim();
 try{
  await resetStudentPassword({username,whatsappNumber});
  res.set('Cache-Control','no-store');
  res.status(200).type('html').send(recoveryPage({success:true}));
 }catch(error){
  res.set('Cache-Control','no-store');
  res.status(Number(error?.status)||500).type('html').send(recoveryPage({username,whatsappNumber,error:error?.publicMessage||'Password reset failed.'}));
 }
}

function ensureRecoveryPage(app){
 if(recoveryPages.has(app))return;
 recoveryPages.add(app);
 originalGet.call(app,'/forgot-password',(req,res)=>{res.set('Cache-Control','no-store');res.type('html').send(recoveryPage());});
 originalPost.call(app,'/forgot-password',express.urlencoded({extended:false,limit:'8kb'}),resetLimiter,passwordResetPageHandler);
}

express.application.get=function patchedGet(route,...handlers){
 ensureRecoveryPage(this);
 return originalGet.call(this,route,...handlers);
};
express.application.post=function patchedPost(route,...handlers){
 ensureRecoveryPage(this);
 if(route==='/api/auth/forgot-password'&&!forgotPasswordRouteReplaced){
  forgotPasswordRouteReplaced=true;
  return originalPost.call(this,route,resetLimiter,passwordResetHandler);
 }
 return originalPost.call(this,route,...handlers);
};

require('./server.js');
