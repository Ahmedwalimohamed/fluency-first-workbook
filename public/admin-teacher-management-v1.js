/* EnglishGate admin teacher editing */
(function(){
'use strict';
let scheduled=false;
function isAdminTeachers(){return String(document.getElementById('pageEyebrow')?.textContent||'').trim()==='System Admin'&&String(document.getElementById('pageTitle')?.textContent||'').trim()==='Teachers'}
function db(){try{return typeof getDB==='function'?getDB():window.getDB?.()}catch{return null}}
function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function teacherById(id){return db()?.users?.find(u=>u.id===id&&u.role==='teacher')||null}
function openEditor(id){
 const t=teacherById(id);if(!t)return;
 const classes=(db()?.classes||[]).filter(c=>c.teacher_id===id).map(c=>c.name);
 if(typeof showModal!=='function')return;
 showModal(`<section class="student-manage-modal"><div class="section-head"><div><span class="role-kicker">Teacher management</span><h3>Edit ${esc(t.name)}</h3><p class="muted">Update teacher account details. Existing classes and teaching history stay unchanged.</p></div><button class="icon-btn" data-close>×</button></div><form id="adminTeacherManageForm" class="form-grid"><label>Teacher name<input id="adminTeacherManageName" value="${esc(t.name)}" required maxlength="100"></label><label>Login username<input id="adminTeacherManageUsername" value="${esc(t.username)}" required maxlength="32"><small>The username must be unique.</small></label><label>WhatsApp number<input id="adminTeacherManageWhatsapp" type="tel" value="${esc(t.whatsappNumber||'')}" required maxlength="40"><small>Use country code, for example +252 63 1234567.</small></label><label>Assigned classes<input value="${esc(classes.join(', ')||'No class assigned')}" disabled><small>Class assignment is managed from the Classes page.</small></label><div class="student-manage-actions"><button class="primary-btn" type="submit">Save changes</button><button class="ghost-btn" type="button" id="adminTeacherManageReset">Reset password</button></div></form><div id="adminTeacherManageResult"></div></section>`);
 document.querySelector('[data-close]').onclick=closeModal;
 document.getElementById('adminTeacherManageReset').onclick=()=>{closeModal();if(typeof adminResetPassword==='function')adminResetPassword(id)};
 document.getElementById('adminTeacherManageForm').onsubmit=async e=>{
  e.preventDefault();const btn=e.submitter||e.currentTarget.querySelector('button[type="submit"]');const result=document.getElementById('adminTeacherManageResult');btn.disabled=true;btn.textContent='Saving…';
  try{
   await api('/api/admin/teachers/'+encodeURIComponent(id)+'/manage',{method:'PATCH',body:JSON.stringify({name:document.getElementById('adminTeacherManageName').value.trim(),username:document.getElementById('adminTeacherManageUsername').value.trim(),whatsappNumber:document.getElementById('adminTeacherManageWhatsapp').value.trim()})});
   await refreshState();closeModal();renderPage();
  }catch(err){btn.disabled=false;btn.textContent='Save changes';result.innerHTML='<div class="feedback bad">'+esc(err.message)+'</div>'}
 };
}
function enhance(){
 if(!isAdminTeachers())return;
 document.querySelectorAll('[data-admin-reset]').forEach(reset=>{
  const actions=reset.closest('.management-row-meta');const id=reset.dataset.adminReset;if(!actions||!id||actions.querySelector('[data-admin-edit-teacher="'+CSS.escape(id)+'"]'))return;
  const edit=document.createElement('button');edit.type='button';edit.className='primary-btn compact-action';edit.dataset.adminEditTeacher=id;edit.textContent='Edit teacher';edit.onclick=()=>openEditor(id);actions.insertBefore(edit,reset);
 });
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance()})}
function boot(){enhance();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
