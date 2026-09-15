/* EnglishGate teacher: add an existing school student to another class without moving or duplicating them. */
(function(){
'use strict';
let scheduled=false;
function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
function escAttr(s){return esc(s).replace(/'/g,'&#39;')}
function isTeacherClasses(){return String(document.getElementById('pageEyebrow')?.textContent||'').trim()==='Teacher'&&String(document.getElementById('pageTitle')?.textContent||'').trim()==='Classes'}
async function openExistingStudent(classId,className){
 if(typeof showModal!=='function'||typeof api!=='function')return;
 showModal(`<section class="student-manage-modal"><div class="section-head"><div><span class="role-kicker">Class enrollment</span><h3>Add existing student</h3><p class="muted">Add an existing EnglishGate student to ${esc(className)}. The student stays in their other classes and keeps existing learning progress.</p></div><button class="icon-btn" data-close>×</button></div><div id="existingStudentBody"><div class="feedback">Loading students…</div></div></section>`);
 const close=document.querySelector('[data-close]');if(close)close.onclick=closeModal;
 const body=document.getElementById('existingStudentBody');
 try{
  const data=await api('/api/teacher/classes/'+encodeURIComponent(classId)+'/available-students');
  const students=Array.isArray(data?.students)?data.students:[];
  if(!students.length){body.innerHTML='<div class="feedback"><strong>No available existing students.</strong><br>Every existing student is already in this class, or no student accounts exist yet.</div>';return}
  body.innerHTML=`<form id="existingStudentForm" class="form-grid"><label>Search existing students<input id="existingStudentSearch" type="search" placeholder="Search by name or username" autocomplete="off"></label><label>Select student<select id="existingStudentSelect" size="8" required>${students.map(s=>`<option value="${escAttr(s.id)}" data-search="${escAttr((s.name+' '+s.username).toLowerCase())}">${esc(s.name)} · ${esc(s.username)}</option>`).join('')}</select></label><div class="feedback"><strong>This adds membership only.</strong> It does not create a duplicate account, remove the student from another class, or reset learning progress.</div><button class="primary-btn" type="submit">Add to this class</button></form><div id="existingStudentResult"></div>`;
  const search=document.getElementById('existingStudentSearch'),select=document.getElementById('existingStudentSelect');
  search.oninput=()=>{const q=search.value.trim().toLowerCase();[...select.options].forEach(o=>{o.hidden=q&&!o.dataset.search.includes(q)});const first=[...select.options].find(o=>!o.hidden);if(first)select.value=first.value};
  document.getElementById('existingStudentForm').onsubmit=async e=>{
   e.preventDefault();const btn=e.submitter||e.currentTarget.querySelector('button[type="submit"]'),studentId=select.value,result=document.getElementById('existingStudentResult');
   if(!studentId)return;
   btn.disabled=true;btn.textContent='Adding…';
   try{
    await api('/api/teacher/classes/'+encodeURIComponent(classId)+'/existing-students',{method:'POST',body:JSON.stringify({studentId})});
    if(typeof refreshState==='function')await refreshState();
    closeModal();if(typeof renderPage==='function')renderPage();
   }catch(err){btn.disabled=false;btn.textContent='Add to this class';result.innerHTML='<div class="feedback bad">'+esc(err.message)+'</div>'}
  };
 }catch(err){body.innerHTML='<div class="feedback bad">'+esc(err.message||'Could not load existing students.')+'</div>'}
}
function enhance(){
 if(!isTeacherClasses())return;
 const data=typeof getDB==='function'?getDB():window.getDB?.();
 document.querySelectorAll('[data-add-student-class]').forEach(add=>{
  const classId=add.dataset.addStudentClass;if(!classId)return;
  const actions=add.closest('.management-card-actions')||add.parentElement;if(!actions||actions.querySelector('[data-add-existing-student="'+CSS.escape(classId)+'"]'))return;
  const c=data?.classes?.find(x=>x.id===classId),className=c?.name||add.closest('.management-card')?.querySelector('h3')?.textContent?.trim()||'this class';
  const button=document.createElement('button');button.type='button';button.className='ghost-btn';button.dataset.addExistingStudent=classId;button.textContent='+ Add existing student';button.onclick=()=>openExistingStudent(classId,className);actions.insertBefore(button,add.nextSibling);
  if(!add.dataset.newStudentLabel){add.dataset.newStudentLabel='1';add.textContent='+ Add new student'}
 });
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance()})}
function boot(){enhance();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
