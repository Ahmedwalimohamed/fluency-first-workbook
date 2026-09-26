/* EnglishGate Live Task — teacher share link */
(()=>{
'use strict';

const STYLE_ID='egLiveTaskShareStyles';
const MIN_FETCH_MS=2200;
const POLL_MS=3000;
let pending=false,lastKey='',lastFetchAt=0,pollTimer=null;

function currentRole(){try{return typeof session!=='undefined'?String(session?.role||''):''}catch{return''}}
function addStyles(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
    .eg-live-share-card{display:grid;gap:9px;margin:12px 0;padding:12px;border:1px solid #bfdbfe;border-radius:14px;background:#eff6ff}
    .eg-live-share-card-head{display:flex;justify-content:space-between;align-items:center;gap:8px}
    .eg-live-share-card-head strong{font-size:13px;color:#0f172a}.eg-live-share-card-head span{font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#2563eb}
    .eg-live-share-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px}
    .eg-live-share-row input{min-width:0;width:100%;height:38px;border:1px solid #bfdbfe;border-radius:9px;background:#fff;padding:0 9px;font:500 11px/1.2 system-ui,sans-serif;color:#334155}
    .eg-live-share-row button,.eg-live-share-actions button,.eg-live-share-actions a{min-height:38px;border:1px solid #93c5fd;border-radius:9px;background:#fff;color:#1d4ed8;padding:0 11px;font:800 12px/1 system-ui,sans-serif;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;cursor:pointer}
    .eg-live-share-row button:hover,.eg-live-share-actions button:hover,.eg-live-share-actions a:hover{background:#dbeafe}
    .eg-live-share-actions{display:flex;gap:7px;flex-wrap:wrap}.eg-live-share-card small{color:#475569;line-height:1.35}
    @media(max-width:640px){.eg-live-share-row{grid-template-columns:1fr}.eg-live-share-actions>*{flex:1}}
  `;
  document.head.appendChild(style);
}
function getDb(){try{return typeof getDB==='function'?getDB():null}catch{return null}}
function resolveClassId(){
  const candidates=[];
  try{const id=String(getDb()?.teacherContext?.classId||'').trim();if(id)candidates.push(id)}catch{}
  try{if(typeof activeTeacherClassId!=='undefined'){const id=String(activeTeacherClassId||'').trim();if(id)candidates.push(id)}}catch{}
  try{
    if(typeof teacherResumeContext==='function'){
      const r=teacherResumeContext();
      const id=String(r?.c?.id||r?.ctx?.classId||'').trim();
      if(id)candidates.push(id);
    }
  }catch{}
  return candidates.find(Boolean)||'';
}
function liveSide(){
  return [...document.querySelectorAll('.eg-live-side-pane')].find(side=>{
    const head=side.querySelector('.eg-live-livehead strong');
    return String(head?.textContent||'').trim().toUpperCase()==='LIVE';
  })||null;
}
async function getCurrentTask(classId){
  const r=await fetch('/api/teacher/live-tasks/current?classId='+encodeURIComponent(classId),{
    credentials:'same-origin',headers:{Accept:'application/json','Cache-Control':'no-cache'}
  });
  if(!r.ok)throw new Error('Live task link is not available yet.');
  return r.json();
}
function taskUrl(taskId){
  const url=new URL(window.location.href);
  url.search='';url.hash='';
  url.searchParams.set('liveTask',String(taskId));
  return url.toString();
}
async function copyText(text){
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return}
  const el=document.createElement('textarea');el.value=text;el.setAttribute('readonly','');el.style.position='fixed';el.style.opacity='0';document.body.appendChild(el);el.select();document.execCommand('copy');el.remove();
}
function renderCard(side,url,taskId,classId){
  const old=side.querySelector('[data-live-share-card]');
  if(old?.dataset.taskId===String(taskId)&&old?.dataset.classId===String(classId)){
    const input=old.querySelector('[data-live-share-input]');if(input&&input.value!==url)input.value=url;
    const open=old.querySelector('[data-live-open]');if(open&&open.href!==url)open.href=url;
    return;
  }
  old?.remove();
  const card=document.createElement('section');
  card.className='eg-live-share-card';card.dataset.liveShareCard='1';card.dataset.taskId=String(taskId);card.dataset.classId=String(classId);
  card.innerHTML=`<div class="eg-live-share-card-head"><strong>Student link</strong><span>Current live task</span></div>
    <div class="eg-live-share-row"><input data-live-share-input readonly aria-label="Live task student link"><button type="button" data-live-copy>Copy link</button></div>
    <div class="eg-live-share-actions"><button type="button" data-live-share>Share</button><a data-live-open target="_blank" rel="noopener">Open link</a></div>
    <small>This link automatically follows the current task for this class. Students must sign in and be enrolled in the class.</small>`;
  const input=card.querySelector('[data-live-share-input]');input.value=url;
  card.querySelector('[data-live-open]').href=url;
  const copy=card.querySelector('[data-live-copy]');
  copy.onclick=async()=>{try{await copyText(url);const oldText=copy.textContent;copy.textContent='Copied';setTimeout(()=>{if(copy.isConnected)copy.textContent=oldText},1600)}catch{copy.textContent='Copy failed'}};
  const share=card.querySelector('[data-live-share]');
  share.onclick=async()=>{
    try{
      if(navigator.share)await navigator.share({title:'EnglishGate Live Task',text:'Open this EnglishGate live task.',url});
      else{await copyText(url);share.textContent='Link copied';setTimeout(()=>{if(share.isConnected)share.textContent='Share'},1600)}
    }catch(e){if(e?.name!=='AbortError'){share.textContent='Try copy link';setTimeout(()=>{if(share.isConnected)share.textContent='Share'},1600)}}
  };
  const students=side.querySelector('.eg-live-students-block');
  if(students)students.before(card);else side.prepend(card);
}
function removeCard(){document.querySelectorAll('[data-live-share-card]').forEach(el=>el.remove());lastKey=''}
async function inject(){
  pending=false;
  if(currentRole()!=='teacher'){removeCard();return}
  addStyles();
  const side=liveSide();
  if(!side){lastKey='';return}
  const classId=resolveClassId();if(!classId)return;
  try{
    lastFetchAt=Date.now();
    const data=await getCurrentTask(classId),task=data?.task,nowSide=liveSide();
    if(!nowSide)return;
    if(!task?.id||task.status!=='live'){
      nowSide.querySelector('[data-live-share-card]')?.remove();lastKey='';return;
    }
    const key=classId+':'+task.id;
    if(lastKey!==key||!nowSide.querySelector(`[data-live-share-card][data-task-id="${CSS.escape(String(task.id))}"]`)){
      lastKey=key;renderCard(nowSide,taskUrl(task.id),task.id,classId);
    }
  }catch{}
}
function schedule(){
  if(currentRole()!=='teacher'){removeCard();return}
  if(pending)return;
  pending=true;
  const wait=Math.max(80,MIN_FETCH_MS-(Date.now()-lastFetchAt));
  setTimeout(inject,wait);
}
function startPolling(){
  if(pollTimer)return;
  pollTimer=setInterval(()=>{if(currentRole()==='teacher')schedule();else removeCard()},POLL_MS);
}

const observer=new MutationObserver(()=>{if(currentRole()==='teacher')schedule()});
observer.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('englishgate:live-task-share-refresh',schedule);
startPolling();schedule();
})();
