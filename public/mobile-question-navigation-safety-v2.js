/* EnglishGate mobile question navigation safety v2
   Ensures students can always move Back/Next after a genuine attempt.
   This is a narrow repair layer; it does not change grading or answer correctness. */
(function(){
'use strict';

const isMobile=()=>window.matchMedia('(max-width:760px)').matches;
const isStudent=()=>typeof session==='undefined'||session?.role==='student';
const root=()=>document.getElementById('activityPanel');

function currentQuestion(panel){
  return panel?.querySelector('.guided-question.is-flow-current')||
    [...(panel?.querySelectorAll('.guided-question')||[])].find(q=>!q.hidden&&getComputedStyle(q).display!=='none')||null;
}

function hasResponse(q){
  if(!q)return false;
  if(q.dataset.responseRecorded==='1'||q.dataset.coreComplete==='1')return true;
  if(q.querySelector('input[type="radio"]:checked,input[type="checkbox"]:checked'))return true;
  const field=q.querySelector('input[data-short-answer],input[type="text"],textarea,[data-writing-core-input]');
  return Boolean(field&&String(field.value||'').trim());
}

function ensureNav(){
  const panel=root();
  if(!panel||!isMobile()||!isStudent()||!document.body.classList.contains('student-question-focus-mode'))return;

  const back=panel.querySelector('[data-question-flow-back]');
  const next=panel.querySelector('.student-question-continue');
  if(!back||!next)return;

  let nav=panel.querySelector('.student-question-bottom-nav');
  if(!nav){
    nav=document.createElement('nav');
    nav.className='student-question-bottom-nav';
    nav.setAttribute('aria-label','Question navigation');
    nav.innerHTML='<div class="student-question-bottom-inner"></div>';
    panel.appendChild(nav);
  }
  const inner=nav.querySelector('.student-question-bottom-inner');
  if(!inner)return;

  back.hidden=false;
  back.classList.add('student-question-nav-back');
  back.textContent='← Back';
  back.setAttribute('aria-label','Previous question');

  next.hidden=false;
  next.classList.add('student-question-nav-next');
  next.setAttribute('aria-label',/check/i.test(next.textContent||'')?'Check answer':'Next question');
  if(!/check|save/i.test(next.textContent||''))next.textContent='Next →';

  if(back.parentElement!==inner)inner.appendChild(back);
  if(next.parentElement!==inner)inner.appendChild(next);

  const q=currentQuestion(panel);
  if(q&&hasResponse(q)){
    q.dataset.responseRecorded='1';
    next.disabled=false;
    next.removeAttribute('aria-disabled');
  }

  document.body.classList.add('student-question-nav-active');
}

function markTypedAttemptFromCheck(target){
  const check=target.closest?.('button');
  if(!check||!/^(check|check answer|check answers)$/i.test(String(check.textContent||'').trim()))return;
  const q=check.closest('.guided-question');
  if(!q)return;
  const field=q.querySelector('input[data-short-answer],input[type="text"],textarea,[data-writing-core-input]');
  if(field&&String(field.value||'').trim())q.dataset.responseRecorded='1';
  setTimeout(ensureNav,0);
}

document.addEventListener('input',e=>{
  const q=e.target.closest?.('#activityPanel .guided-question');
  if(q&&String(e.target.value||'').trim())q.dataset.responseRecorded='1';
  ensureNav();
},true);

document.addEventListener('change',e=>{
  const q=e.target.closest?.('#activityPanel .guided-question');
  if(q&&e.target.matches('input[type="radio"],input[type="checkbox"]'))q.dataset.responseRecorded='1';
  ensureNav();
},true);

document.addEventListener('click',e=>{
  markTypedAttemptFromCheck(e.target);
  if(e.target.closest?.('.student-question-nav-back,.student-question-nav-next,.student-question-continue,[data-question-flow-back]')){
    setTimeout(ensureNav,0);
  }
},true);

let queued=false;
const observer=new MutationObserver(()=>{
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;ensureNav();});
});

function start(){
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','disabled','data-response-recorded']});
  ensureNav();
  window.addEventListener('resize',ensureNav,{passive:true});
  window.addEventListener('orientationchange',ensureNav,{passive:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
