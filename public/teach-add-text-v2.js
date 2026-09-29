(()=>{
'use strict';

const STORAGE_PREFIX='englishgate:teach-text:v2:';
let activeDialog=null;
let scheduled=false;

function isTeacher(){
  try{if(window.session?.role==='teacher')return true}catch{}
  if(document.body?.classList.contains('role-teacher'))return true;
  return String(document.querySelector('#sidebarRole')?.textContent||'').toLowerCase().includes('teacher');
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function clean(v){return String(v||'').replace(/\s+/g,' ').trim()}
function slug(v){return clean(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,100)||'activity'}
function teachSurface(){return document.querySelector('.eg-teaching-surface')}
function stage(){return document.getElementById('teacherAnnotationStage')}
function context(){
  const surface=teachSurface(),s=stage();
  if(!surface||!s)return null;
  const header=document.querySelector('.eg-lesson-header');
  const classLesson=clean(header?.querySelector('div>p')?.textContent||'');
  const lesson=clean(header?.querySelector('div>h1')?.textContent||'');
  const stageTitle=clean(document.getElementById('liveStageTitle')?.textContent||'Activity');
  const pageIdentity=clean(document.getElementById('pageTitle')?.textContent||'');
  const key=[classLesson,lesson,stageTitle,pageIdentity].map(slug).join('::');
  return {surface,stage:s,key,stageTitle,lesson,classLesson};
}
function storageKey(ctx){return STORAGE_PREFIX+ctx.key}
function readNotes(ctx){
  try{
    const parsed=JSON.parse(localStorage.getItem(storageKey(ctx))||'[]');
    return Array.isArray(parsed)?parsed.filter(n=>n&&n.id&&n.text):[];
  }catch{return []}
}
function writeNotes(ctx,notes){
  try{localStorage.setItem(storageKey(ctx),JSON.stringify(notes.slice(0,30)))}catch{}
}
function typeMeta(type){
  const map={
    instruction:{label:'Instruction',icon:'i',placeholder:'e.g. Look at the verb first. Then choose the correct form.'},
    example:{label:'Example',icon:'Aa',placeholder:'e.g. I speak English every day. / She speaks English every day.'},
    note:{label:'Teacher note',icon:'✎',placeholder:'e.g. Remember: I / you / we / they + base verb.'}
  };
  return map[type]||map.note;
}
function noteHtml(n,index,total){
  const m=typeMeta(n.type);
  return `<article class="eg-teach-text-card is-${esc(n.type)}" data-teach-text-id="${esc(n.id)}">
    <div class="eg-teach-text-kind"><span aria-hidden="true">${esc(m.icon)}</span><strong>${esc(m.label)}</strong></div>
    <div class="eg-teach-text-body">${esc(n.text).replace(/\n/g,'<br>')}</div>
    <div class="eg-teach-text-actions" aria-label="Text actions">
      <button type="button" data-teach-text-edit title="Edit">Edit</button>
      <button type="button" data-teach-text-up ${index===0?'disabled':''} title="Move up">↑</button>
      <button type="button" data-teach-text-down ${index===total-1?'disabled':''} title="Move down">↓</button>
      <button type="button" data-teach-text-delete class="is-danger" title="Delete">Delete</button>
    </div>
  </article>`;
}
function ensureRail(ctx){
  let rail=ctx.surface.querySelector('[data-teach-text-rail]');
  if(!rail){
    rail=document.createElement('section');
    rail.className='eg-teach-text-rail';
    rail.dataset.teachTextRail='1';
    rail.setAttribute('aria-label','Teacher-added teaching text');
    const anchor=ctx.surface.querySelector('.live-class-tools');
    if(anchor)anchor.insertAdjacentElement('afterend',rail);else ctx.stage.insertAdjacentElement('beforebegin',rail);
  }
  return rail;
}
function render(ctx=context()){
  if(!ctx||!isTeacher())return;
  const notes=readNotes(ctx),rail=ensureRail(ctx);
  rail.hidden=!notes.length;
  rail.innerHTML=notes.map((n,i)=>noteHtml(n,i,notes.length)).join('');
  rail.querySelectorAll('[data-teach-text-id]').forEach(card=>{
    const id=card.dataset.teachTextId;
    card.querySelector('[data-teach-text-edit]')?.addEventListener('click',()=>openWizard(id));
    card.querySelector('[data-teach-text-delete]')?.addEventListener('click',()=>removeNote(id));
    card.querySelector('[data-teach-text-up]')?.addEventListener('click',()=>moveNote(id,-1));
    card.querySelector('[data-teach-text-down]')?.addEventListener('click',()=>moveNote(id,1));
  });
}
function removeNote(id){
  const ctx=context();if(!ctx)return;
  const notes=readNotes(ctx),note=notes.find(n=>n.id===id);if(!note)return;
  if(!window.confirm('Delete this teacher text?'))return;
  writeNotes(ctx,notes.filter(n=>n.id!==id));render(ctx);
}
function moveNote(id,delta){
  const ctx=context();if(!ctx)return;
  const notes=readNotes(ctx),i=notes.findIndex(n=>n.id===id),j=i+delta;
  if(i<0||j<0||j>=notes.length)return;
  [notes[i],notes[j]]=[notes[j],notes[i]];writeNotes(ctx,notes);render(ctx);
}
function closeDialog(){
  if(!activeDialog)return;
  try{activeDialog.close()}catch{}
  activeDialog.remove();activeDialog=null;
}
function openWizard(editId=''){
  const ctx=context();if(!ctx)return;
  const notes=readNotes(ctx),existing=notes.find(n=>n.id===editId)||null;
  closeDialog();
  const dialog=document.createElement('dialog');activeDialog=dialog;
  dialog.className='eg-teach-text-dialog';
  const selected=existing?.type||'example';
  dialog.innerHTML=`<form method="dialog" class="eg-teach-text-wizard" data-teach-text-form>
    <div class="eg-teach-text-wizard-head">
      <div><span>TEACH · ${esc(ctx.stageTitle)}</span><h2>${existing?'Edit text':'Add text'}</h2><p>Add a teaching aid to this activity. It does not change the lesson content.</p></div>
      <button type="button" class="eg-teach-text-close" data-teach-text-close aria-label="Close">×</button>
    </div>
    <div class="eg-teach-text-types" role="radiogroup" aria-label="Text type">
      ${['instruction','example','note'].map(type=>{const m=typeMeta(type);return `<label class="${selected===type?'is-selected':''}"><input type="radio" name="teachTextType" value="${type}" ${selected===type?'checked':''}><span>${esc(m.icon)}</span><strong>${esc(m.label)}</strong></label>`}).join('')}
    </div>
    <label class="eg-teach-text-field"><span>What do you want students to see?</span><textarea data-teach-text-value rows="5" maxlength="800" placeholder="${esc(typeMeta(selected).placeholder)}" required>${esc(existing?.text||'')}</textarea><small><b data-teach-text-count>${String(existing?.text||'').length}</b>/800 · Ctrl/⌘ + Enter to add</small></label>
    <div class="eg-teach-text-preview" data-teach-text-preview></div>
    <div class="eg-teach-text-wizard-actions"><button type="button" class="ghost-btn" data-teach-text-close>Cancel</button><button type="submit" class="primary-btn">${existing?'Save changes':'Add to activity'}</button></div>
  </form>`;
  document.body.appendChild(dialog);
  const form=dialog.querySelector('[data-teach-text-form]'),textarea=dialog.querySelector('[data-teach-text-value]'),preview=dialog.querySelector('[data-teach-text-preview]'),count=dialog.querySelector('[data-teach-text-count]');
  const update=()=>{
    const type=form.elements.teachTextType.value,m=typeMeta(type),value=textarea.value;
    count.textContent=String(value.length);
    textarea.placeholder=m.placeholder;
    dialog.querySelectorAll('.eg-teach-text-types label').forEach(l=>l.classList.toggle('is-selected',l.querySelector('input')?.checked));
    preview.innerHTML=value.trim()?`<span>${esc(m.label)}</span><p>${esc(value.trim()).replace(/\n/g,'<br>')}</p>`:'<small>Preview appears here.</small>';
  };
  form.addEventListener('change',update);textarea.addEventListener('input',update);
  textarea.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();form.requestSubmit()}});
  dialog.querySelectorAll('[data-teach-text-close]').forEach(b=>b.addEventListener('click',closeDialog));
  dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog()});
  dialog.addEventListener('click',e=>{if(e.target===dialog)closeDialog()});
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const text=textarea.value.trim(),type=form.elements.teachTextType.value;if(!text)return textarea.focus();
    const latest=readNotes(ctx);
    if(existing){const n=latest.find(x=>x.id===existing.id);if(n){n.text=text;n.type=type;n.updatedAt=Date.now()}}
    else latest.push({id:'tt_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),type,text,createdAt:Date.now()});
    writeNotes(ctx,latest);closeDialog();render(ctx);
  });
  update();
  try{dialog.showModal()}catch{dialog.setAttribute('open','')}
  requestAnimationFrame(()=>textarea.focus());
}
function ensureButton(ctx){
  const actions=ctx.surface.querySelector('.live-tool-actions');
  if(!actions)return;
  let b=actions.querySelector('[data-teach-add-text]');
  if(!b){
    b=document.createElement('button');b.type='button';b.className='live-tool-btn eg-teach-add-text-btn';b.dataset.teachAddText='1';b.innerHTML='<span aria-hidden="true">T+</span><span>Add Text</span>';b.addEventListener('click',()=>openWizard());actions.appendChild(b);
  }
}
function sync(){
  scheduled=false;if(!isTeacher())return;
  const ctx=context();if(!ctx)return;
  ensureButton(ctx);render(ctx);
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(sync)}

const observer=new MutationObserver(mutations=>{
  if(mutations.some(m=>m.target?.closest?.('.eg-teach-text-dialog,.eg-teach-text-rail')))return;
  schedule();
});
observer.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('popstate',schedule);
document.addEventListener('DOMContentLoaded',schedule,{once:true});
schedule();

window.EnglishGateTeachText={open:()=>openWizard(),render:()=>render(),version:'teach-add-text-v2'};
})();
