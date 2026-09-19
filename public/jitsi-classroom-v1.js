/* EnglishGate Jitsi Live Classroom */
(()=>{
'use strict';

let teacherApi=null,studentApi=null,teacherHost=null,teacherJoin=null,studentJoin=null;
let teacherHeartbeat=null,studentHeartbeat=null,studentPollTimer=null;
let teacherControl='';let studentControl='';
try{teacherControl=sessionStorage.getItem('egJitsiTeacherControl')||'';studentControl=sessionStorage.getItem('egJitsiStudentControl')||''}catch{}

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const role=()=>{try{return typeof session!=='undefined'?session?.role:null}catch{return null}};
const getDb=()=>{try{return typeof getDB==='function'?getDB():null}catch{return null}};
const headers=token=>token?{'X-EnglishGate-Jitsi-Token':token}:{};
function remember(kind,token){
  if(kind==='teacher')teacherControl=String(token||'');else studentControl=String(token||'');
  try{sessionStorage.setItem(kind==='teacher'?'egJitsiTeacherControl':'egJitsiStudentControl',String(token||''))}catch{}
}
function activeClass(){
  const ids=[];
  try{if(getDb()?.teacherContext?.classId)ids.push(getDb().teacherContext.classId)}catch{}
  try{if(typeof activeTeacherClassId!=='undefined'&&activeTeacherClassId)ids.push(activeTeacherClassId)}catch{}
  try{if(typeof teacherResumeContext==='function'){const r=teacherResumeContext();if(r?.c?.id)ids.push(r.c.id);else if(r?.ctx?.classId)ids.push(r.ctx.classId)}}catch{}
  for(const id of ids){const c=(getDb()?.classes||[]).find(x=>String(x.id)===String(id));if(c)return c}
  return null;
}
async function loadApi(domain){
  if(window.JitsiMeetExternalAPI)return;
  const id='englishgateJitsiExternalApi';
  let script=document.getElementById(id);
  if(!script){
    script=document.createElement('script');script.id=id;script.async=true;
    script.src='https://'+domain+'/external_api.js';document.head.appendChild(script);
  }
  await new Promise((resolve,reject)=>{
    if(window.JitsiMeetExternalAPI)return resolve();
    const done=()=>window.JitsiMeetExternalAPI?resolve():reject(new Error('Jitsi failed to load.'));
    script.addEventListener('load',done,{once:true});script.addEventListener('error',()=>reject(new Error('Jitsi failed to load.')),{once:true});
    setTimeout(()=>window.JitsiMeetExternalAPI?resolve():reject(new Error('Jitsi took too long to load.')),12000);
  });
}
async function presence(join,action,kind){
  if(!join?.session?.id)return;
  const token=kind==='teacher'?teacherControl:studentControl;
  try{await api('/api/jitsi-session/'+encodeURIComponent(join.session.id)+'/presence',{method:'POST',headers:headers(token),body:JSON.stringify({action})})}catch{}
}
function startHeartbeat(kind,join){
  const key=kind==='teacher'?'teacherHeartbeat':'studentHeartbeat';
  if(kind==='teacher'&&teacherHeartbeat)clearInterval(teacherHeartbeat);
  if(kind==='student'&&studentHeartbeat)clearInterval(studentHeartbeat);
  presence(join,'join',kind);
  const timer=setInterval(()=>presence(join,'heartbeat',kind),12000);
  if(key==='teacherHeartbeat')teacherHeartbeat=timer;else studentHeartbeat=timer;
}
function stopHeartbeat(kind,join){
  if(kind==='teacher'&&teacherHeartbeat){clearInterval(teacherHeartbeat);teacherHeartbeat=null}
  if(kind==='student'&&studentHeartbeat){clearInterval(studentHeartbeat);studentHeartbeat=null}
  presence(join,'leave',kind);
}
async function mountMeet(parent,join,kind){
  await loadApi(join.domain);
  const old=kind==='teacher'?teacherApi:studentApi;try{old?.dispose?.()}catch{}
  parent.innerHTML='';
  const options={
    roomName:join.session.roomName,
    jwt:join.jwt,
    parentNode:parent,
    width:'100%',height:'100%',
    userInfo:{displayName:join.displayName},
    configOverwrite:{prejoinPageEnabled:false,disableDeepLinking:true,startWithAudioMuted:kind==='student',startWithVideoMuted:false}
  };
  const instance=new window.JitsiMeetExternalAPI(join.domain,options);
  if(kind==='teacher')teacherApi=instance;else studentApi=instance;
  instance.addEventListener('videoConferenceJoined',()=>startHeartbeat(kind,join));
  instance.addEventListener('videoConferenceLeft',()=>stopHeartbeat(kind,join));
  return instance;
}

async function openTeacher(host){
  teacherHost=host;const c=activeClass();
  if(!c){host.innerHTML='<div class="eg-jitsi-state"><strong>Open a class in TEACH mode first.</strong></div>';return}
  host.innerHTML='<div class="eg-jitsi-state"><strong>Opening Live Class…</strong><span>Checking the current class.</span></div>';
  try{
    const r=await api('/api/teacher/jitsi-session/current?classId='+encodeURIComponent(c.id),{headers:headers(teacherControl)});
    if(r?.controlToken)remember('teacher',r.controlToken);
    if(r?.session)return renderTeacherActive(r,c);
    renderTeacherReady(c,r?.configured!==false);
  }catch(e){renderTeacherError(c,e.message)}
}
function renderTeacherReady(c,configured){
  if(!teacherHost)return;
  teacherHost.innerHTML=`<div class="eg-jitsi-ready"><div><span class="eg-jitsi-kicker">EnglishGate Live Class</span><h2>${esc(c.name||'Current class')}</h2><p>${configured?'Start a protected video classroom for enrolled students.':'The EnglishGate side is ready. Connect a JWT-enabled Jitsi server to activate video.'}</p></div><button type="button" data-jitsi-start ${configured?'':'disabled'}>Start Live Class</button></div>`;
  teacherHost.querySelector('[data-jitsi-start]')?.addEventListener('click',()=>startTeacher(c));
}
function renderTeacherError(c,msg){
  if(!teacherHost)return;
  teacherHost.innerHTML=`<div class="eg-jitsi-state is-error"><strong>Live Class is not ready</strong><span>${esc(msg)}</span><button type="button" data-jitsi-retry>Retry</button></div>`;
  teacherHost.querySelector('[data-jitsi-retry]')?.addEventListener('click',()=>openTeacher(teacherHost));
}
async function startTeacher(c){
  const btn=teacherHost?.querySelector('[data-jitsi-start]');if(btn){btn.disabled=true;btn.textContent='Starting…'}
  try{
    const r=await api('/api/teacher/jitsi-session/start',{method:'POST',body:JSON.stringify({classId:c.id})});
    if(r?.controlToken)remember('teacher',r.controlToken);
    renderTeacherActive(r,c);
  }catch(e){renderTeacherError(c,e.message)}
}
async function renderTeacherActive(join,c){
  teacherJoin=join;if(!teacherHost)return;
  teacherHost.innerHTML=`<div class="eg-jitsi-teacher-shell"><div class="eg-jitsi-meet-area" data-jitsi-teacher-meet></div><aside class="eg-jitsi-teacher-side"><span class="eg-jitsi-live-dot">LIVE</span><h3>${esc(c.name||'Live class')}</h3><p>Only authenticated EnglishGate users with a valid room token can join this classroom.</p><div data-jitsi-attendance class="eg-jitsi-attendance">Loading attendance…</div><button type="button" class="eg-jitsi-end" data-jitsi-end>End Live Class</button></aside></div>`;
  teacherHost.querySelector('[data-jitsi-end]')?.addEventListener('click',endTeacher);
  try{await mountMeet(teacherHost.querySelector('[data-jitsi-teacher-meet]'),join,'teacher');pollAttendance()}catch(e){renderTeacherError(c,e.message)}
}
async function pollAttendance(){
  if(!teacherJoin?.session?.id||!teacherHost)return;
  try{
    const r=await api('/api/teacher/jitsi-session/'+encodeURIComponent(teacherJoin.session.id)+'/attendance',{headers:headers(teacherControl)});
    const a=(r.attendance||[]).filter(x=>x.role==='student');
    const box=teacherHost.querySelector('[data-jitsi-attendance]');
    if(box)box.innerHTML=`<strong>${a.length} joined</strong><span>${a.slice(0,8).map(x=>esc(x.name||x.username)).join(', ')||'Waiting for students…'}</span>`;
  }catch{}
  if(teacherJoin)setTimeout(pollAttendance,8000);
}
async function endTeacher(){
  if(!teacherJoin?.session?.id||!confirm('End this live class for everyone?'))return;
  try{await api('/api/teacher/jitsi-session/'+encodeURIComponent(teacherJoin.session.id)+'/end',{method:'PATCH',headers:headers(teacherControl)});}catch(e){alert(e.message);return}
  stopHeartbeat('teacher',teacherJoin);try{teacherApi?.dispose?.()}catch{}teacherApi=null;teacherJoin=null;
  openTeacher(teacherHost);
}
function leaveTeacherView(){
  if(teacherJoin)stopHeartbeat('teacher',teacherJoin);
  try{teacherApi?.dispose?.()}catch{}teacherApi=null;
}

function ensureStudentBanner(){
  let root=document.getElementById('egJitsiStudentBanner');
  if(!root){root=document.createElement('div');root.id='egJitsiStudentBanner';root.className='eg-jitsi-student-banner';root.hidden=true;document.body.appendChild(root)}
  return root;
}
async function pollStudent(){
  if(role()!=='student'){studentPollTimer=setTimeout(pollStudent,5000);return}
  try{
    const r=await api('/api/student/jitsi-session/current',{headers:headers(studentControl)});
    if(r?.controlToken)remember('student',r.controlToken);
    const banner=ensureStudentBanner();
    if(r?.session){
      studentJoin=r;banner.hidden=false;
      banner.innerHTML=`<div><span>Live class is open</span><strong>Join your class now</strong></div><button type="button" data-jitsi-student-join>Join Live Class</button>`;
      banner.querySelector('[data-jitsi-student-join]').onclick=openStudentRoom;
    }else{studentJoin=null;banner.hidden=true}
  }catch{}
  studentPollTimer=setTimeout(pollStudent,5000);
}
async function openStudentRoom(){
  if(!studentJoin)return;
  let root=document.getElementById('egJitsiStudentRoom');
  if(!root){root=document.createElement('section');root.id='egJitsiStudentRoom';root.className='eg-jitsi-student-room';document.body.appendChild(root)}
  root.innerHTML='<header><strong>EnglishGate Live Class</strong><button type="button" data-jitsi-leave>Leave class</button></header><div class="eg-jitsi-student-meet" data-jitsi-student-meet></div>';
  root.hidden=false;root.querySelector('[data-jitsi-leave]').onclick=closeStudentRoom;
  try{await mountMeet(root.querySelector('[data-jitsi-student-meet]'),studentJoin,'student')}catch(e){root.querySelector('[data-jitsi-student-meet]').innerHTML='<div class="eg-jitsi-state is-error"><strong>'+esc(e.message)+'</strong></div>'}
}
function closeStudentRoom(){
  const root=document.getElementById('egJitsiStudentRoom');
  if(studentJoin)stopHeartbeat('student',studentJoin);
  try{studentApi?.dispose?.()}catch{}studentApi=null;if(root)root.hidden=true;
}

window.EnglishGateJitsi={openTeacher,leaveTeacherView};
function boot(){ensureStudentBanner();pollStudent()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
