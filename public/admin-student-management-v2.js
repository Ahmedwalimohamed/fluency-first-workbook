/* EnglishGate admin student management enhancements
   - Admin can create students directly from Students or Classes.
   - Admin gets an explicit Edit username action for each student.
   Existing backend routes already validate unique usernames and class enrollment. */
(function(){
'use strict';

let scheduled=false;

function isSystemAdminPage(){
  return String(document.getElementById('pageEyebrow')?.textContent||'').trim()==='System Admin';
}

function callOpenAdminStudent(){
  if(typeof window.openAdminStudent==='function'){window.openAdminStudent();return true}
  try{if(typeof openAdminStudent==='function'){openAdminStudent();return true}}catch{}
  return false;
}

function callOpenManageStudent(id){
  if(typeof window.openManageStudent==='function'){window.openManageStudent(id);return true}
  try{if(typeof openManageStudent==='function'){openManageStudent(id);return true}}catch{}
  return false;
}

function decorateStudentModal(classId='',className=''){
  requestAnimationFrame(()=>{
    const select=document.getElementById('adminStudentClass');
    if(select&&classId&&[...select.options].some(o=>o.value===classId))select.value=classId;
    const modal=select?.closest('.modal-card')||document.querySelector('.modal-card');
    if(!modal)return;
    const title=modal.querySelector('.section-head h3');
    const kicker=modal.querySelector('.section-head .role-kicker');
    if(title)title.textContent=className?'Add student to '+className:'Add student';
    if(kicker)kicker.textContent=className?'Class enrollment':'Student account';
  });
}

function openStudentCreator(classId='',className=''){
  if(!callOpenAdminStudent())return;
  decorateStudentModal(classId,className);
}

function focusUsernameEditor(id){
  if(!callOpenManageStudent(id))return;
  requestAnimationFrame(()=>{
    const input=document.getElementById('manageStudentUsername');
    if(!input)return;
    const label=input.closest('label');
    if(label&&!label.dataset.adminUsernameEnhanced){
      label.dataset.adminUsernameEnhanced='1';
      const first=[...label.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
      if(first)first.textContent='Login username';
      const note=document.createElement('small');
      note.textContent='Change the username the student uses to sign in. It must be unique.';
      label.appendChild(note);
    }
    input.focus();
    input.select();
  });
}

function enhanceAdminStudents(content){
  const h1=content.querySelector('.role-page-head h1');
  if(!h1||h1.textContent.trim()!=='Students')return;

  const head=content.querySelector('.role-page-head');
  const intro=head?.querySelector('p');
  if(intro)intro.textContent='Create students, place them in classes, edit usernames, move classes, reset access, or remove accounts.';

  if(head&&!head.querySelector('[data-admin-add-student-v2]')){
    const add=document.createElement('button');
    add.type='button';
    add.className='primary-btn';
    add.dataset.adminAddStudentV2='1';
    add.textContent='+ Add student';
    add.onclick=()=>openStudentCreator();
    head.appendChild(add);
  }

  content.querySelectorAll('[data-manage-student]').forEach(manage=>{
    const actions=manage.closest('.management-row-meta');
    const id=manage.dataset.manageStudent;
    if(!actions||!id||actions.querySelector('[data-admin-edit-username="'+CSS.escape(id)+'"]'))return;
    const edit=document.createElement('button');
    edit.type='button';
    edit.className='ghost-btn';
    edit.dataset.adminEditUsername=id;
    edit.textContent='Edit username';
    edit.onclick=()=>focusUsernameEditor(id);
    actions.insertBefore(edit,manage);
  });

  const empty=content.querySelector('tbody tr td[colspan="3"]');
  if(empty&&/No students yet/i.test(empty.textContent))empty.textContent='No students yet. Use “Add student” to create the first student and choose their class.';
}

function enhanceAdminClasses(content){
  const h1=content.querySelector('.role-page-head h1');
  if(!h1||h1.textContent.trim()!=='Classes')return;

  const intro=content.querySelector('.role-page-head p');
  if(intro)intro.textContent='Create classes, choose the book and teacher, and add students directly to each class.';

  content.querySelectorAll('.management-card').forEach(card=>{
    const deleteBtn=card.querySelector('[data-admin-delete-class]');
    const actions=deleteBtn?.closest('.management-card-actions');
    const classId=deleteBtn?.dataset.adminDeleteClass;
    const className=card.querySelector('h3')?.textContent.trim()||'this class';
    if(!actions||!classId||actions.querySelector('[data-admin-add-to-class]'))return;
    const add=document.createElement('button');
    add.type='button';
    add.className='primary-btn';
    add.dataset.adminAddToClass=classId;
    add.textContent='+ Add student';
    add.onclick=()=>openStudentCreator(classId,className);
    actions.insertBefore(add,deleteBtn);
  });

  const empty=content.querySelector('.empty-state p');
  if(empty&&/teacher can then add students/i.test(empty.textContent))empty.textContent='Create a class first. After that, admin can add students directly to it.';
}

function enhanceManageModal(){
  if(!isSystemAdminPage())return;
  const input=document.getElementById('manageStudentUsername');
  if(!input)return;
  const label=input.closest('label');
  if(!label||label.dataset.adminUsernameEnhanced)return;
  label.dataset.adminUsernameEnhanced='1';
  const first=[...label.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
  if(first)first.textContent='Login username';
  const note=document.createElement('small');
  note.textContent='Admin can edit this username. The new username must be unique.';
  label.appendChild(note);
}

function enhance(){
  if(!isSystemAdminPage())return;
  const content=document.getElementById('content');
  if(content){enhanceAdminStudents(content);enhanceAdminClasses(content)}
  enhanceManageModal();
}

function schedule(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;enhance()});
}

function boot(){
  enhance();
  new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
