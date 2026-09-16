/* EnglishGate: each class is a saved teaching workspace with its own resume position. */
(function(){
'use strict';
let contexts=new Map(),loading=false,scheduled=false,lastFetch=0;
function teacherSessionReady(){return window.session?.role==='teacher'&&document.getElementById('app')&&!document.getElementById('app').classList.contains('hidden')}
function isTeacher(){return teacherSessionReady()&&String(document.getElementById('pageEyebrow')?.textContent||'').trim()==='Teacher'}
function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
function age(v){if(!v)return'Saved teaching position';const ms=Date.now()-new Date(v).getTime();if(!Number.isFinite(ms)||ms<0)return'Saved teaching position';const m=Math.floor(ms/60000);if(m<2)return'Just now';if(m<60)return m+' min ago';const h=Math.floor(m/60);if(h<24)return h+' hr'+(h===1?'':'s')+' ago';const d=Math.floor(h/24);return d+' day'+(d===1?'':'s')+' ago'}
async function load(force=false){if(loading||!isTeacher()||typeof api!=='function')return;if(!force&&Date.now()-lastFetch<15000)return;loading=true;try{const r=await api('/api/teacher/class-contexts');contexts=new Map((r.contexts||[]).map(x=>[String(x.classId),x]));lastFetch=Date.now()}catch{}finally{loading=false}}
function classIdForCard(card){return card.querySelector('[data-add-student-class]')?.dataset.addStudentClass||card.querySelector('[data-teach-class]')?.dataset.teachClass||card.querySelector('[data-overview-class]')?.dataset.overviewClass||''}
function goToSaved(classId,ctx){
 const teachNav=[...document.querySelectorAll('#sideNav button,#sideNav a')].find(x=>/^Teach$/i.test(x.textContent.trim()));if(teachNav)teachNav.click();
 const openClass=()=>{const b=document.querySelector('[data-teach-class="'+CSS.escape(classId)+'"]');if(!b)return requestAnimationFrame(openClass);b.click();const openLesson=()=>{const l=document.querySelector('[data-live-lesson="'+Number(ctx.lessonNumber)+'"]');if(!l)return requestAnimationFrame(openLesson);l.click();const openStage=()=>{const s=document.querySelector('[data-live-section="'+Number(ctx.sectionIndex)+'"]');if(s)s.click()};requestAnimationFrame(()=>requestAnimationFrame(openStage))};requestAnimationFrame(()=>requestAnimationFrame(openLesson))};
 requestAnimationFrame(()=>requestAnimationFrame(openClass));
}
function enhanceCards(){
 if(!isTeacher())return;
 document.querySelectorAll('.management-card').forEach(card=>{
  const classId=classIdForCard(card);if(!classId||card.querySelector('[data-class-resume]'))return;const ctx=contexts.get(String(classId));
  const box=document.createElement('div');box.dataset.classResume='1';box.style.cssText='margin-top:12px;padding:12px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc';
  if(ctx){box.innerHTML=`<div style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap"><div><small style="display:block;color:#64748b;font-weight:700">CONTINUE WHERE YOU LEFT OFF</small><strong style="display:block;margin-top:3px">Lesson ${Number(ctx.lessonNumber)} · Stage ${Number(ctx.sectionIndex)+1}</strong><small style="color:#64748b">${esc(age(ctx.updatedAt))}</small></div><button type="button" class="primary-btn" data-continue-class="${esc(classId)}">Continue teaching →</button></div>`;box.querySelector('[data-continue-class]').onclick=()=>goToSaved(classId,ctx)}
  else box.innerHTML='<small style="display:block;color:#64748b;font-weight:700">TEACHING POSITION</small><strong style="display:block;margin-top:3px">Not started yet</strong><small style="color:#64748b">Open a lesson and EnglishGate will remember where this class stops.</small>';
  const actions=card.querySelector('.management-card-actions');if(actions)card.insertBefore(box,actions);else card.appendChild(box)
 });
}
async function enhance(){if(!isTeacher())return;await load();enhanceCards()}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance()})}
function boot(){enhance();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true});window.addEventListener('focus',()=>{if(!teacherSessionReady())return;load(true).then(enhanceCards)})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
