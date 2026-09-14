/* EnglishGate teacher text formatting v1
   Adds color, size and edit controls to the existing teacher Text annotation tool
   without changing lesson content or annotation creation/grading logic. */
(function(){
'use strict';

const COLORS=['#0F172A','#2563EB','#DC2626','#16A34A','#7C3AED','#F59E0B'];
let currentColor='#0F172A';
let currentSize=24;
let selectedNote=null;
const overrides=new Map();
const knownKeys=new Set();

const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const noteKey=n=>`${n.style.left||getComputedStyle(n).left}|${n.style.top||getComputedStyle(n).top}`;

function inTeacherLive(){return document.body.classList.contains('teacher-live-active')&&!!q('.live-class-tools')}
function textMode(){return q('.live-stage,[data-annotation-mode="text"]')?.dataset?.annotationMode==='text'||q('[data-live-tool="text"]')?.classList.contains('active')}

function ensureToolbar(){
 if(!inTeacherLive())return;
 const modes=q('.live-tool-modes');
 if(!modes||q('#teacherTextFormatControls'))return;
 const wrap=document.createElement('div');
 wrap.id='teacherTextFormatControls';
 wrap.className='teacher-text-format-controls';
 wrap.setAttribute('aria-label','Text formatting controls');
 wrap.innerHTML=`<span class="teacher-text-format-label">Text</span><div class="teacher-text-colors" role="group" aria-label="Text color">${COLORS.map(c=>`<button type="button" class="teacher-text-color" data-text-color="${c}" aria-label="Text color ${c}" style="--swatch:${c}"></button>`).join('')}<label class="teacher-text-custom" title="Custom text color"><span>Custom</span><input type="color" id="teacherTextCustomColor" value="${currentColor}" aria-label="Custom text color"></label></div><div class="teacher-text-size" role="group" aria-label="Text size"><button type="button" data-text-size="down" aria-label="Decrease text size">A−</button><output id="teacherTextSizeValue">${currentSize}px</output><button type="button" data-text-size="up" aria-label="Increase text size">A+</button></div><button type="button" class="teacher-text-edit" id="teacherEditText" disabled>Edit selected</button>`;
 modes.insertAdjacentElement('afterend',wrap);
 bindToolbar(wrap);
 refreshToolbar();
}

function bindToolbar(wrap){
 wrap.addEventListener('click',e=>{
  const color=e.target.closest('[data-text-color]');
  if(color){currentColor=color.dataset.textColor;applyStyleToSelected();refreshToolbar();return}
  const size=e.target.closest('[data-text-size]');
  if(size){currentSize=clamp(currentSize+(size.dataset.textSize==='up'?2:-2),12,72);applyStyleToSelected();refreshToolbar();return}
  if(e.target.closest('#teacherEditText')&&selectedNote)startEdit(selectedNote);
 });
 q('#teacherTextCustomColor',wrap)?.addEventListener('input',e=>{currentColor=e.target.value;applyStyleToSelected();refreshToolbar()});
}

function refreshToolbar(){
 qa('.teacher-text-color').forEach(b=>b.classList.toggle('is-active',b.dataset.textColor.toLowerCase()===currentColor.toLowerCase()));
 const custom=q('#teacherTextCustomColor');if(custom)custom.value=currentColor;
 const out=q('#teacherTextSizeValue');if(out)out.textContent=`${currentSize}px`;
 const edit=q('#teacherEditText');if(edit)edit.disabled=!selectedNote;
}

function selectNote(note){
 qa('.live-text-note.is-text-selected').forEach(n=>n.classList.remove('is-text-selected'));
 selectedNote=note||null;
 if(!note){refreshToolbar();return}
 note.classList.add('is-text-selected');
 const style=getComputedStyle(note);
 currentColor=rgbToHex(style.color)||currentColor;
 currentSize=clamp(parseInt(style.fontSize,10)||currentSize,12,72);
 refreshToolbar();
}

function applyStyleToSelected(){
 if(!selectedNote)return;
 const key=noteKey(selectedNote),o=overrides.get(key)||{};
 o.color=currentColor;o.size=currentSize;o.text=selectedNote.textContent;
 overrides.set(key,o);
 selectedNote.style.color=currentColor;
 selectedNote.style.fontSize=`${currentSize}px`;
}

function startEdit(note){
 if(!note||!textMode())return;
 selectNote(note);
 note.contentEditable='true';
 note.setAttribute('role','textbox');
 note.setAttribute('aria-label','Edit teacher text annotation');
 note.classList.add('is-text-editing');
 const initial=note.textContent;
 note.focus();
 const range=document.createRange();range.selectNodeContents(note);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
 const save=()=>{
  const text=note.textContent.trim();
  if(!text)note.textContent=initial;
  const key=noteKey(note),o=overrides.get(key)||{};
  o.text=note.textContent;o.color=currentColor;o.size=currentSize;overrides.set(key,o);
  note.contentEditable='false';note.classList.remove('is-text-editing');
 };
 const onKey=e=>{if(e.key==='Escape'){e.preventDefault();note.textContent=initial;note.blur()}else if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();note.blur()}};
 note.addEventListener('keydown',onKey,{once:false});
 note.addEventListener('blur',()=>{note.removeEventListener('keydown',onKey);save()},{once:true});
}

function wireNotes(){
 const layer=q('#teacherAnnotationTextLayer');
 if(!layer)return;
 layer.setAttribute('aria-hidden','false');
 qa('.live-text-note',layer).forEach(note=>{
  const key=noteKey(note);
  if(!knownKeys.has(key)){
   knownKeys.add(key);
   const freshStyle=textMode()?{text:note.textContent,color:currentColor,size:currentSize}:{text:note.textContent,color:getComputedStyle(note).color,size:parseInt(getComputedStyle(note).fontSize,10)||currentSize};
   overrides.set(key,freshStyle);
  }
  const o=overrides.get(key);
  if(o){
   if(!note.isContentEditable&&!note.classList.contains('is-text-editing'))note.textContent=o.text;
   note.style.color=o.color;
   note.style.fontSize=`${o.size}px`;
  }
  if(note.dataset.textFormattingBound==='1')return;
  note.dataset.textFormattingBound='1';note.tabIndex=0;
  note.addEventListener('click',e=>{if(!textMode())return;e.stopPropagation();selectNote(note)});
  note.addEventListener('dblclick',e=>{if(!textMode())return;e.preventDefault();e.stopPropagation();startEdit(note)});
  note.addEventListener('keydown',e=>{if(textMode()&&(e.key==='Enter'||e.key===' ')){e.preventDefault();startEdit(note)}});
 });
}

function sync(){
 if(!inTeacherLive()){selectedNote=null;return}
 ensureToolbar();wireNotes();
 document.body.classList.toggle('teacher-text-edit-mode',textMode());
 if(selectedNote&&!document.body.contains(selectedNote))selectedNote=null;
 refreshToolbar();
}

function rgbToHex(value){
 const m=String(value||'').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);if(!m)return /^#[0-9a-f]{6}$/i.test(value)?value:null;
 return '#'+[m[1],m[2],m[3]].map(v=>Number(v).toString(16).padStart(2,'0')).join('');
}

let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync()})};
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-annotation-mode']});
document.addEventListener('click',e=>{if(!e.target.closest('.live-text-note,#teacherTextFormatControls,[data-live-tool="text"]')&&selectedNote)selectNote(null)},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
})();
