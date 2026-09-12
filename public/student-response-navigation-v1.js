/* EnglishGate student response navigation v1
   Correctness affects feedback and score only. It must never block moving forward. */
(function(){
'use strict';

const isStudent=()=>typeof session!=='undefined'&&session?.role==='student';
const panel=()=>document.getElementById('activityPanel');
const currentQuestion=root=>root?.querySelector('.guided-question.is-flow-current')||[...(root?.querySelectorAll('.guided-question')||[])].find(q=>!q.hidden&&getComputedStyle(q).display!=='none')||null;
const nextButton=root=>root?.querySelector('.student-question-continue')||null;

function hasResponse(q){
 if(!q)return false;
 if(q.dataset.responseRecorded==='1')return true;
 if(q.querySelector('input[type="radio"]:checked'))return true;
 if(q.querySelector('input[type="checkbox"]:checked'))return true;
 const text=q.querySelector('input[data-short-answer],input[type="text"],textarea,[data-writing-core-input]');
 if(text&&String(text.value||'').trim())return true;
 if(q.matches('[data-writing-core]')&&q.dataset.coreComplete==='1')return true;
 return false;
}

function unlock(q){
 const root=q?.closest('#activityPanel')||panel();
 const next=nextButton(root);
 if(!q||!next||!hasResponse(q))return;
 q.dataset.responseRecorded='1';
 next.disabled=false;
 next.removeAttribute('aria-disabled');
}

function fallbackAdvance(q){
 const root=q?.closest('#activityPanel');
 if(!root)return;
 window.setTimeout(()=>{
  if(!isStudent()||!document.body.contains(q))return;
  const active=currentQuestion(root);
  if(active!==q)return; // core flow already advanced normally
  const next=nextButton(root);
  if(!next||!hasResponse(q))return;
  next.disabled=false;
  // Preserve the approved MCQ workflow: choices advance automatically.
  if(next.dataset.autoAdvance==='1')next.click();
 },950);
}

// Any selected choice is a valid attempt, whether correct or wrong.
document.addEventListener('change',e=>{
 if(!isStudent())return;
 const q=e.target.closest?.('#activityPanel .guided-question');
 if(!q)return;
 if(e.target.matches('input[type="radio"],input[type="checkbox"]')){
  q.dataset.responseRecorded='1';
  unlock(q);
  fallbackAdvance(q);
 }
},false);

// Typed responses unlock Next as soon as the learner has actually entered a response.
document.addEventListener('input',e=>{
 if(!isStudent())return;
 const q=e.target.closest?.('#activityPanel .guided-question');
 if(!q)return;
 if(String(e.target.value||'').trim())q.dataset.responseRecorded='1';
 else if(!q.querySelector('input[type="radio"]:checked,input[type="checkbox"]:checked'))q.dataset.responseRecorded='0';
 unlock(q);
},false);

// Writing-core checks keep their own correctness result, but a complete attempted
// response is allowed to move forward even when coreCorrect === 0.
document.addEventListener('click',e=>{
 if(!isStudent())return;
 const check=e.target.closest?.('[data-writing-core-check]');
 if(check){
  const q=check.closest('.guided-question');
  window.setTimeout(()=>{
   if(q?.dataset.coreComplete==='1')q.dataset.responseRecorded='1';
   unlock(q);
   fallbackAdvance(q);
  },0);
  return;
 }
 const choice=e.target.closest?.('[data-mcq-option],.mcq-option-card,.choice');
 if(choice){
  const q=choice.closest('.guided-question');
  window.setTimeout(()=>{unlock(q);fallbackAdvance(q)},0);
 }
},false);

// Some feedback/render code toggles disabled after an answer. Reassert the rule:
// answered => navigation enabled, independent of correctness.
let queued=false;
const observer=new MutationObserver(()=>{
 if(queued||!isStudent())return;
 queued=true;
 requestAnimationFrame(()=>{
  queued=false;
  const root=panel(),q=currentQuestion(root);
  if(q&&hasResponse(q))unlock(q);
 });
});

function start(){
 observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','hidden','class','data-core-complete','data-core-correct']});
 const root=panel(),q=currentQuestion(root);if(q)unlock(q);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
