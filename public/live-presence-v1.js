/* EnglishGate live presence v1: heartbeat for signed-in users + admin live-now panel. */
(function(){
'use strict';
const HEARTBEAT_MS=30000,REFRESH_MS=15000;
let heartbeatBusy=false,adminBusy=false;
const app=()=>document.getElementById('app');
const signedIn=()=>{const el=app();return !!el&&!el.classList.contains('hidden')};
const isAdminOverview=()=>signedIn()&&app().classList.contains('admin-mode')&&document.getElementById('pageTitle')?.textContent.trim()==='Overview';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function heartbeat(){
 if(!signedIn()||document.visibilityState==='hidden'||heartbeatBusy)return;
 heartbeatBusy=true;
 try{await fetch('/api/presence/heartbeat',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}',cache:'no-store'})}catch{}finally{heartbeatBusy=false}
}
function sendOffline(){
 if(!signedIn())return;
 try{navigator.sendBeacon('/api/presence/offline',new Blob(['{}'],{type:'application/json'}))}catch{fetch('/api/presence/offline',{method:'POST',credentials:'same-origin',keepalive:true}).catch(()=>{})}
}
function ensurePanel(){
 if(!isAdminOverview())return null;
 const content=document.getElementById('content');if(!content)return null;
 let panel=document.getElementById('adminLiveUsersPanel');if(panel)return panel;
 panel=document.createElement('section');panel.id='adminLiveUsersPanel';panel.className='admin-live-users section';
 panel.innerHTML='<div class="admin-live-head"><div><span class="role-kicker">Platform activity</span><h2>Live users now</h2><p>Users active in the last 90 seconds.</p></div><div class="admin-live-total"><span class="admin-live-dot" aria-hidden="true"></span><strong id="adminLiveCount">—</strong><small>online</small></div></div><div id="adminLiveBody" class="admin-live-body"><div class="admin-live-loading">Checking current activity…</div></div>';
 const metrics=content.querySelector('.admin-metrics');if(metrics)metrics.insertAdjacentElement('afterend',panel);else content.prepend(panel);
 return panel;
}
function roleLabel(role){return role==='admin'?'Admin':role==='teacher'?'Teacher':'Student'}
function renderLive(data){
 const panel=ensurePanel();if(!panel)return;
 const count=panel.querySelector('#adminLiveCount'),body=panel.querySelector('#adminLiveBody');
 if(count)count.textContent=String(data.count||0);
 const roles=data.byRole||{};
 const summary=`<div class="admin-live-role-summary"><span><b>${Number(roles.student||0)}</b> students</span><span><b>${Number(roles.teacher||0)}</b> teachers</span><span><b>${Number(roles.admin||0)}</b> admins</span></div>`;
 const users=Array.isArray(data.users)?data.users:[];
 const rows=users.map(u=>`<div class="admin-live-row"><div class="admin-live-person"><span class="admin-live-avatar">${esc((u.name||'U').slice(0,1).toUpperCase())}</span><div><strong>${esc(u.name||u.username||'User')}</strong><small>@${esc(u.username||'')} · ${roleLabel(u.role)}</small></div></div><span class="admin-live-seen">${Number(u.secondsAgo||0)<15?'Active now':esc(u.secondsAgo)+'s ago'}</span></div>`).join('');
 body.innerHTML=summary+(rows?`<div class="admin-live-list">${rows}</div>`:'<div class="admin-live-empty"><strong>No active users yet.</strong><span>The list updates as signed-in users send activity heartbeats.</span></div>');
}
async function refreshAdmin(){
 if(!isAdminOverview()||adminBusy)return;
 ensurePanel();adminBusy=true;
 try{const r=await fetch('/api/admin/live-users',{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw new Error('Unable to load live users');renderLive(await r.json())}
 catch{const body=document.getElementById('adminLiveBody');if(body)body.innerHTML='<div class="admin-live-empty"><strong>Live status unavailable.</strong><span>Refresh the page if this continues.</span></div>'}
 finally{adminBusy=false}
}
function sync(){if(signedIn())heartbeat();if(isAdminOverview()){ensurePanel();refreshAdmin()}}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync()})}
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sync()});
document.addEventListener('click',e=>{if(e.target.closest?.('#logoutBtn'))sendOffline()},true);
window.addEventListener('pagehide',sendOffline);
setInterval(heartbeat,HEARTBEAT_MS);setInterval(refreshAdmin,REFRESH_MS);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
})();
