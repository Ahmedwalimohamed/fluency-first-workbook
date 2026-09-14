/* EnglishGate question context + lesson-home escape
   Adds learner-facing activity context (e.g. Grammar Exercise) and a Home control
   that exits focused question mode to the current workbook lesson without losing draft answers. */
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
  .student-question-activity-title{
   display:block;
   margin:0 0 3px;
   color:#0f172a;
   font-size:clamp(.84rem,2.8vw,.96rem);
   font-weight:800;
   line-height:1.15;
   letter-spacing:.01em;
  }
  .student-question-home{
   flex:0 0 auto;
   min-width:44px;
   min-height:44px;
   display:inline-flex;
   align-items:center;
   justify-content:center;
   gap:6px;
   padding:0 11px;
   border:1px solid #e2e8f0;
   border-radius:12px;
   background:#fff;
   color:#0f172a;
   font:inherit;
   font-size:.88rem;
   font-weight:750;
   cursor:pointer;
  }
  .student-question-home svg{width:19px;height:19px;display:block}
  .student-question-home:focus-visible{outline:3px solid rgba(37,99,235,.22);outline-offset:2px}
  @media(max-width:480px){
   .student-question-home{width:44px;padding:0}
   .student-question-home span{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
  }
 `;
 document.head.appendChild(style);
}

function leaveQuestionFocus(root){
 try{if(typeof saveActivityDraft==='function')saveActivityDraft()}catch{}

 document.body.classList.remove('student-question-focus-mode','student-question-nav-active','student-question-mobile-proxy-active');
 root?.querySelectorAll('.eg-source-task-section,.eg-shared-comprehension').forEach(sec=>{sec.hidden=false});
 const proxy=document.querySelector('.student-question-mobile-proxy');
 if(proxy)proxy.hidden=true;

 // Stay inside the same lesson. The normal workbook chrome/stage navigation becomes visible
 // so the learner can revise Grammar, Vocabulary, Reading, Listening, Writing or the lesson book.
 const lesson=document.querySelector('.eg-workbook,.lesson-book-workbook');
 const stages=document.querySelector('.eg-stage-list');
 requestAnimationFrame(()=>{
  const target=stages||lesson;
  if(target?.scrollIntoView)target.scrollIntoView({block:'start',behavior:'smooth'});
 });
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
  home.addEventListener('click',()=>leaveQuestionFocus(root));
  top.insertBefore(home,copy);
 }
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
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
