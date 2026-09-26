/* EnglishGate question context + reliable lesson-home escape */
(function(){
'use strict';

const $=(sel,root=document)=>root.querySelector(sel);

function isStudent(){
 return typeof session==='undefined'||session?.role==='student';
}

function stepName(){
 let step='';
 try{step=typeof currentStep!=='undefined'?String(currentStep||'').toLowerCase():''}catch{}
 return ({
  grammar:'Grammar Exercise',
  vocabulary:'Vocabulary Exercise',
  reading:'Reading Comprehension',
  listening:'Listening Exercise',
  writing:'Writing Practice'
 })[step]||'Practice Exercise';
}

function installStyles(){
 if(document.getElementById('questionContextHomeStyles'))return;
 const style=document.createElement('style');
 style.id='questionContextHomeStyles';
 style.textContent=`
  .student-question-activity-title{display:block;margin:0 0 3px;color:#0f172a;font-size:clamp(.84rem,2.8vw,.96rem);font-weight:800;line-height:1.15;letter-spacing:.01em}
  .student-question-home{flex:0 0 auto;min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 11px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;color:#0f172a;font:inherit;font-size:.88rem;font-weight:750;cursor:pointer;touch-action:manipulation;position:relative;z-index:4}
  .student-question-home svg{width:19px;height:19px;display:block;pointer-events:none}
  .student-question-home span{pointer-events:none}
  .student-question-home:focus-visible{outline:3px solid rgba(37,99,235,.22);outline-offset:2px}
  @media(max-width:760px){
    body.student-question-focus-mode #activityPanel[data-student-question-flow="1"]{
      padding-top:var(--eg-question-context-clearance,112px)!important;
      scroll-padding-top:var(--eg-question-context-clearance,112px)!important;
    }
    body.student-question-focus-mode #activityPanel[data-student-question-flow="1"] .guided-question.is-flow-current,
    body.student-question-focus-mode #activityPanel[data-student-question-flow="1"] .guided-question:not([hidden]):not(.is-flow-previous){
      scroll-margin-top:var(--eg-question-context-clearance,112px)!important;
    }
  }
  @media(max-width:480px){.student-question-home{width:44px;padding:0}.student-question-home span{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}}
 `;
 document.head.appendChild(style);
}

function syncHeaderClearance(root){
 if(!root||window.matchMedia('(min-width:761px)').matches)return;
 requestAnimationFrame(()=>{
  if(!document.body.classList.contains('student-question-focus-mode'))return;
  const header=$('.student-question-flow-head',root);
  if(!header)return;
  const rootRect=root.getBoundingClientRect();
  const headerRect=header.getBoundingClientRect();
  const relativeBottom=Math.max(0,Math.ceil(headerRect.bottom-rootRect.top));
  const clearance=Math.max(96,relativeBottom+12);
  root.style.setProperty('--eg-question-context-clearance',clearance+'px');
 });
}

function leaveQuestionFocus(root){
 // Persist whatever the learner has typed or selected before navigating away.
 try{if(typeof saveActivityDraft==='function')saveActivityDraft()}catch{}

 const proxy=document.querySelector('.student-question-mobile-proxy');
 if(proxy)proxy.hidden=true;
 if(root)root.style.removeProperty('--eg-question-context-clearance');
 document.body.classList.remove('student-question-focus-mode','student-question-nav-active','student-question-mobile-proxy-active');

 // Re-render the same workbook lesson. This restores all workbook stages and normal
 // lesson navigation, while restoreActivityDraft() restores the learner's responses.
 try{
  if(typeof workbook==='function'){
   workbook();
   requestAnimationFrame(()=>{
    const stages=document.querySelector('.eg-stage-list');
    const lesson=document.querySelector('.eg-workbook,.lesson-book-workbook');
    (stages||lesson)?.scrollIntoView?.({block:'start',behavior:'auto'});
   });
   return;
  }
 }catch(e){console.error('EnglishGate Home navigation failed',e)}

 // Fallback: use the workbook lesson's existing "Lessons" control if workbook() is unavailable.
 const back=document.getElementById('backWorkbookLessons');
 if(back){back.click();return}

 // Last resort: restore hidden source sections and normal question layout.
 root?.querySelectorAll('.eg-source-task-section,.eg-shared-comprehension,.guided-question').forEach(el=>{el.hidden=false});
}

function enhance(){
 if(!isStudent()||!document.body.classList.contains('student-question-focus-mode'))return;
 const root=$('#activityPanel');
 if(!root)return;
 const top=$('.student-question-flow-top',root);
 const copy=$('.student-question-flow-copy',root);
 if(!top||!copy)return;

 let title=$('.student-question-activity-title',copy);
 if(!title){
  title=document.createElement('span');
  title.className='student-question-activity-title';
  copy.insertBefore(title,copy.firstChild);
 }
 title.textContent=stepName();

 let home=$('.student-question-home',top);
 if(!home){
  home=document.createElement('button');
  home.type='button';
  home.className='student-question-home';
  home.setAttribute('aria-label','Back to lesson activities');
  home.setAttribute('title','Back to lesson activities');
  home.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/></svg><span>Home</span>';
  home.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();leaveQuestionFocus(root)});
  top.insertBefore(home,copy);
 }

 // The fixed question header is outside normal document flow. Reserve its real
 // measured height in the scroll surface so the first line of every task can never
 // sit underneath the header on iPhone/Safari or other mobile browsers.
 syncHeaderClearance(root);
 setTimeout(()=>syncHeaderClearance(root),60);
 setTimeout(()=>syncHeaderClearance(root),220);
}

let queued=false;
const observer=new MutationObserver(()=>{
 if(queued)return;
 queued=true;
 requestAnimationFrame(()=>{queued=false;enhance()});
});

function start(){
 installStyles();
 observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
 enhance();
 const resync=()=>enhance();
 window.addEventListener('resize',resync,{passive:true});
 window.addEventListener('orientationchange',resync,{passive:true});
 if(window.visualViewport){
  window.visualViewport.addEventListener('resize',resync,{passive:true});
 }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
