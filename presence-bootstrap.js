const express=require('express');
const jwt=require('jsonwebtoken');

const nativeGet=express.application.get;
const nativePost=express.application.post;
const installed=new WeakSet();
const activeUsers=new Map();
const ACTIVE_WINDOW_MS=90*1000;

function sessionUser(req){
  try{return jwt.verify(req.cookies?.ff_session||'',process.env.JWT_SECRET)}catch{return null}
}
function prune(now=Date.now()){
  for(const [id,p] of activeUsers){if(now-p.lastSeen>ACTIVE_WINDOW_MS)activeUsers.delete(id)}
}
function publicPresence(p,now){
  return {id:p.id,name:p.name,username:p.username,role:p.role,lastSeenAt:new Date(p.lastSeen).toISOString(),secondsAgo:Math.max(0,Math.floor((now-p.lastSeen)/1000))};
}
function install(app){
  if(installed.has(app))return;
  installed.add(app);
  nativePost.call(app,'/api/presence/heartbeat',(req,res)=>{
    const u=sessionUser(req);if(!u)return res.status(401).json({error:'Please sign in again.'});
    const now=Date.now();
    activeUsers.set(String(u.id),{id:u.id,name:String(u.name||u.username||'User'),username:String(u.username||''),role:String(u.role||''),lastSeen:now});
    prune(now);res.set('Cache-Control','no-store');res.json({ok:true});
  });
  nativePost.call(app,'/api/presence/offline',(req,res)=>{
    const u=sessionUser(req);if(u)activeUsers.delete(String(u.id));
    res.set('Cache-Control','no-store');res.json({ok:true});
  });
  nativeGet.call(app,'/api/admin/live-users',(req,res)=>{
    const u=sessionUser(req);if(!u||u.role!=='admin')return res.status(403).json({error:'System Admin access required.'});
    const now=Date.now();prune(now);
    const users=[...activeUsers.values()].sort((a,b)=>a.role.localeCompare(b.role)||a.name.localeCompare(b.name)).map(p=>publicPresence(p,now));
    const byRole=users.reduce((acc,x)=>{acc[x.role]=(acc[x.role]||0)+1;return acc},{admin:0,teacher:0,student:0});
    res.set('Cache-Control','no-store');res.json({ok:true,count:users.length,byRole,windowSeconds:ACTIVE_WINDOW_MS/1000,generatedAt:new Date(now).toISOString(),users});
  });
}

express.application.get=function presenceAwareGet(route,...handlers){install(this);return nativeGet.call(this,route,...handlers)};
express.application.post=function presenceAwarePost(route,...handlers){install(this);return nativePost.call(this,route,...handlers)};

require('./class-approval-bootstrap.js');
