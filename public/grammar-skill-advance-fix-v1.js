/* EnglishGate Grammar completion handoff fix v1
   Student-only reliability layer: once Check grammar has successfully produced the
   completion result, Done becomes available and advances to the next visible skill.
   Correctness affects score/feedback only; it never blocks progression. */
(function(){
'use strict';

const isStudent=()=>typeof session!=='undefined'&&session?.role==='student';
const isGrammar=()=>typeof currentStep!=='undefined'&&currentStep==='grammar';
const panel=()=>document.getElementById('activityPanel');

function grammarCompleted(){
 if(!isStudent()||!isGrammar())return false;
 const root=panel();
 if(!root)return false;
 // checkCurrent renders this only after recordAttempt + markDone + refreshState succeed.
 if(root.querySelector('#activityFeedback .performance-result'))return true;
 try{
  if(typeof skillCompletionFor==='function'&&typeof activeLessonId!=='undefined'){
   return skillCompletionFor(session.id,activeLessonId).includes('grammar');
  }
 }catch{}
 return false;
}

function unlockDone(){
 if(!grammarCompleted())return false;
 const done=panel()?.querySelector('#doneActivity');
 if(!done)return false;
 done.disabled=false;
 done.removeAttribute('aria-disabled');
 done.dataset.grammarCompletionReady='1';
 return true;
}

function nextVisibleStageButton(){
 const stages=[...document.querySelectorAll('.eg-stage-list [data-sep-stage], [data-sep-stage]')];
 if(!stages.length)return null;
 const here=stages.findIndex(b=>b.dataset.sepStage==='grammar'||b.classList.contains('is-current'));
 if(here>=0){
  for(let i=here+1;i<stages.length;i++){
   const b=stages[i];
   if(!b.hidden&&getComputedStyle(b).display!=='none'&&!b.disabled)return b;
  }
 }
 return stages.find(b=>b.dataset.sepStage!=='grammar'&&!b.hidden&&getComputedStyle(b).display!=='none'&&!b.disabled)||null;
}

function advance(){
 if(!grammarCompleted())return false;
 const stage=nextVisibleStageButton();
 if(stage){stage.click();return true}
 try{
  if(typeof advanceAfterDone==='function'){advanceAfterDone();return true}
 }catch{}
 return false;
}

// Check grammar may finish asynchronously. Keep syncing until the successful result appears.
document.addEventListener('click',e=>{
 const check=e.target.closest?.('#checkActivity');
 if(check&&isStudent()&&isGrammar()){
  [0,120,350,700,1200,2000].forEach(ms=>setTimeout(unlockDone,ms));
  return;
 }
 const done=e.target.closest?.('#doneActivity');
 if(done&&isStudent()&&isGrammar()&&grammarCompleted()){
  e.preventDefault();
  e.stopImmediatePropagation();
  advance();
 }
},true);

let queued=false;
const observer=new MutationObserver(()=>{
 if(queued||!isStudent()||!isGrammar())return;
 queued=true;
 requestAnimationFrame(()=>{queued=false;unlockDone()});
});

function start(){
 observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','class','hidden']});
 unlockDone();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
