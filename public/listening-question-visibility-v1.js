/* EnglishGate listening question visibility repair
   Ensures the active listening-comprehension question is never left fully hidden.
   Keeps the existing Back/Next question flow intact. */
(function(){
'use strict';

let queued=false;

function visible(q){
  if(!q||q.hidden)return false;
  const style=getComputedStyle(q);
  return style.display!=='none'&&style.visibility!=='hidden';
}

function repair(){
  queued=false;
  const panel=document.getElementById('activityPanel');
  if(!panel)return;
  const section=panel.querySelector('.eg-listening-section');
  const list=section?.querySelector('.activity-question-list');
  if(!list)return;
  const questions=[...list.querySelectorAll('.guided-question')];
  if(!questions.length)return;

  // If the core flow already has a visible listening question, do not interfere.
  if(questions.some(visible))return;

  // Prefer whichever question the core flow marked as current. If none exists,
  // show the first unanswered listening question, otherwise the first question.
  let current=questions.find(q=>q.classList.contains('is-flow-current'));
  if(!current){
    current=questions.find(q=>{
      if(q.querySelector('input[type="radio"]:checked,input[type="checkbox"]:checked'))return false;
      const input=q.querySelector('input[type="text"],textarea');
      return !input||!String(input.value||'').trim();
    })||questions[0];
  }

  questions.forEach(q=>{
    const active=q===current;
    if(active){
      q.hidden=false;
      q.classList.remove('is-flow-previous');
      q.classList.add('is-flow-current');
      q.removeAttribute('aria-hidden');
    }
  });

  list.dataset.flowActiveList='1';
  list.dataset.listeningVisibilityRepaired='1';
}

function schedule(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(repair);
}

const observer=new MutationObserver(schedule);
function start(){
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class']});
  repair();
  document.addEventListener('click',e=>{
    if(e.target.closest?.('.student-question-continue,[data-question-flow-back],#nextStudentLiveSection,#previousActivity')){
      setTimeout(schedule,0);
    }
  },true);
  document.addEventListener('change',e=>{
    if(e.target.closest?.('.eg-listening-section .guided-question'))setTimeout(schedule,0);
  },true);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
