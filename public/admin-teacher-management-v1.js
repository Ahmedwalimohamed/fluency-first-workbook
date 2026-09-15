/* EnglishGate admin teacher editing + teacher class approval workflow */
(function(){
'use strict';
let scheduled=false;
function pageEyebrow(){return String(document.getElementById('pageEyebrow')?.textContent||'').trim()}
function pageTitle(){return String(document.getElementById('pageTitle')?.textContent||'').trim()}
function isAdminTeachers(){return pageEyebrow()==='System Admin'&&pageTitle()==='Teachers'}
function isAdminClasses(){return pageEyebrow()==='System Admin'&&pageTitle()==='Classes'}
function isTeacherClasses(){return pageEyebrow()==='Teacher'&&pageTitle()==='Classes'}
function db(){try{return typeof getDB==='function'?getDB():window.getDB?.()}catch{return null}}
function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function escAttr(s){return esc(s).replace(/'/g,'&#39;')}
function teacherById(id){return db()?.users?.find(u=>u.id===id&&u.role==='teacher')||null}
function openEditor(id){
 const t=teacherById(id);if(!t)return;
 const classes=(db()?.classes||[]).filter(c=>c.teacher_id===id).map(c=>c.name);
 if(typeof showModal!=='function')return;
 showModal(`<section class="student-manage-modal"><div class="section-head"><div><span class="role-kicker">Teacher management</span><h3>Edit ${esc(t.name)}</h3><p class="muted">Update teacher account details. Existing classes and teaching history stay unchanged.</p></div><button class="icon-btn" data-close>×</button></div><form id="adminTeacherManageForm" class="form-grid"><label>Teacher name<input id="adminTeacherManageName" value="${escAttr(t.name)}" required maxlength="100"></label><label>Login username<input id="adminTeacherManageUsername" value="${escAttr(t.username)}" required maxlength="32"><small>The username must be unique.</small></label><label>WhatsApp number<input id="adminTeacherManageWhatsapp" type="tel" value="${escAttr(t.whatsappNumber||'')}" required maxlength="40"><small>Use country code, for example +252 63 1234567.</small></label><label>Assigned classes<input value="${escAttr(classes.join(', ')||'No class assigned')}" disabled><small>Class assignment is managed from the Classes page.</small></label><div class="student-manage-actions"><button class="primary-btn" type="submit">Save changes</button><button class="ghost-btn" type="button" id="adminTeacherManageReset">Reset password</button></div></form><div id="adminTeacherManageResult"></div></section>`);
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
function openTeacherClassCreator(){
 const books=(db()?.books||[]).filter(b=>['ready','pilot'].includes(String(b.status||'')));
 if(!books.length){showModal(`<div class="section-head"><div><span class="role-kicker">Create class</span><h3>No ready book</h3><p class="muted">An admin must make at least one curriculum book ready before you can create a class.</p></div><button class="icon-btn" data-close>×</button></div>`);document.querySelector('[data-close]').onclick=closeModal;return}
 showModal(`<div class="section-head"><div><span class="role-kicker">Teacher class request</span><h3>Create a class</h3><p class="muted">Choose the book and create your class. You can add students immediately; the class becomes active for learning after admin approval.</p></div><button class="icon-btn" data-close>×</button></div><form id="teacherClassCreateForm" class="form-grid"><label>Class name<input id="teacherClassName" required maxlength="100" placeholder="e.g. B1 Evening Class"></label><label>Book<select id="teacherClassBook">${books.map(b=>`<option value="${escAttr(b.id)}">${esc(b.title)} · ${esc(b.level)}</option>`).join('')}</select></label><div class="feedback"><strong>Approval flow:</strong> Create class → add students → admin approves → class becomes active.</div><button class="primary-btn" type="submit">Create class & send for approval</button></form><div id="teacherClassCreateResult"></div>`);
 document.querySelector('[data-close]').onclick=closeModal;
 document.getElementById('teacherClassCreateForm').onsubmit=async e=>{
  e.preventDefault();const btn=e.submitter||e.currentTarget.querySelector('button[type="submit"]'),result=document.getElementById('teacherClassCreateResult');btn.disabled=true;btn.textContent='Creating…';
  try{await api('/api/teacher/classes',{method:'POST',body:JSON.stringify({name:document.getElementById('teacherClassName').value.trim(),bookId:document.getElementById('teacherClassBook').value})});await refreshState();closeModal();renderPage()}
  catch(err){btn.disabled=false;btn.textContent='Create class & send for approval';result.innerHTML='<div class="feedback bad">'+esc(err.message)+'</div>'}
 };
}
async function approveClass(id,button){
 if(button){button.disabled=true;button.textContent='Approving…'}
 try{await api('/api/admin/classes/'+encodeURIComponent(id)+'/approval',{method:'PATCH',body:JSON.stringify({status:'approved'})});await refreshState();renderPage()}
 catch(err){if(button){button.disabled=false;button.textContent='Approve class'}alert(err.message)}
}
function addStatusToCard(card,c,adminMode){
 if(!card||!c)return;const status=String(c.approval_status||'approved');
 const head=card.querySelector('.management-card-head');
 if(head&&!head.querySelector('[data-class-approval-badge]')){const badge=document.createElement('span');badge.dataset.classApprovalBadge='1';badge.className='pill '+(status==='approved'?'teal':'gold');badge.textContent=status==='approved'?'Approved':'Pending approval';head.prepend(badge)}
 if(status==='pending'&&!card.querySelector('[data-class-approval-note]')){const note=document.createElement('p');note.dataset.classApprovalNote='1';note.className='muted';note.textContent=adminMode?'Teacher-created class waiting for admin approval.':'Waiting for admin approval. You can add students now; students get active access after approval.';const actions=card.querySelector('.management-card-actions');card.insertBefore(note,actions||null)}
 if(adminMode&&status==='pending'){
  const actions=card.querySelector('.management-card-actions');
  if(actions&&!actions.querySelector('[data-approve-class]')){const b=document.createElement('button');b.type='button';b.className='primary-btn';b.dataset.approveClass=c.id;b.textContent='Approve class';b.onclick=()=>approveClass(c.id,b);actions.prepend(b)}
 }
}
function enhanceAdminTeachers(){
 if(!isAdminTeachers())return;
 document.querySelectorAll('[data-admin-reset]').forEach(reset=>{
  const actions=reset.closest('.management-row-meta');const id=reset.dataset.adminReset;if(!actions||!id||actions.querySelector('[data-admin-edit-teacher="'+CSS.escape(id)+'"]'))return;
  const edit=document.createElement('button');edit.type='button';edit.className='primary-btn compact-action';edit.dataset.adminEditTeacher=id;edit.textContent='Edit teacher';edit.onclick=()=>openEditor(id);actions.insertBefore(edit,reset);
 });
}
function enhanceTeacherClasses(){
 if(!isTeacherClasses())return;const data=db();if(!data)return;
 const head=document.querySelector('.role-page-head');if(head&&!document.getElementById('teacherCreateClassRequest')){const b=document.createElement('button');b.id='teacherCreateClassRequest';b.type='button';b.className='primary-btn';b.textContent='+ Create class';b.onclick=openTeacherClassCreator;head.appendChild(b)}
 const empty=document.querySelector('.class-card-grid .empty-state p');if(empty&&/System Admin/i.test(empty.textContent||''))empty.textContent='Create your first class, choose its book, then add students while the admin reviews it.';
 document.querySelectorAll('[data-add-student-class]').forEach(add=>{const c=(data.classes||[]).find(x=>x.id===add.dataset.addStudentClass);addStatusToCard(add.closest('.management-card'),c,false)})
}
function enhanceAdminClasses(){
 if(!isAdminClasses())return;const data=db();if(!data)return;
 document.querySelectorAll('[data-admin-delete-class]').forEach(del=>{const c=(data.classes||[]).find(x=>x.id===del.dataset.adminDeleteClass);addStatusToCard(del.closest('.management-card'),c,true)})
 const pending=(data.classes||[]).filter(c=>String(c.approval_status||'approved')==='pending').length;
 const head=document.querySelector('.role-page-head p');if(head&&!head.dataset.approvalCopy){head.dataset.approvalCopy='1';head.textContent=pending?`${pending} teacher-created class${pending===1?' is':'es are'} waiting for approval. Admin-created classes are approved immediately.`:'Teacher-created classes appear here for approval. Admin-created classes are approved immediately.'}
}
function enhance(){enhanceAdminTeachers();enhanceTeacherClasses();enhanceAdminClasses()}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance()})}
function boot(){enhance();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
