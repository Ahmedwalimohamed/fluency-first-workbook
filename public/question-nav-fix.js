/* EnglishGate canonical student question navigation
   Single owner for Back/Next placement and response-based navigation state.
   Correctness affects feedback/score only; any genuine response may move forward. */
(function(){
'use strict';

const $=(sel,root=document)=>root.querySelector(sel);
const isStudent=()=>typeof session==='undefined'||session?.role==='student';
const isMobile=()=>window.matchMedia('(max-width:760px)').matches;

function currentQuestion(root){
 return root?.querySelector('.guided-question.is-flow-current')||
  [...(root?.querySelectorAll('.guided-question')||[])].find(q=>!q.hidden&&getComputedStyle(q).display!=='none')||null;
}

function hasResponse(q){
 if(!q)return false;
 if(q.dataset.responseRecorded==='1'||q.dataset.coreComplete==='1')return true;
 if(q.querySelector('input[type="radio"]:checked,input[type="checkbox"]:checked'))return true;
 const field=q.querySelector('input[data-short-answer],input[type="text"],textarea,[data-writing-core-input]');
 return Boolean(field&&String(field.value||'').trim());
}

function makeNav(root){
 let nav=$('.student-question-bottom-nav',root);
 if(nav)return nav;
 nav=document.createElement('nav');
 nav.className='student-question-bottom-nav';
 nav.setAttribute('aria-label','Question navigation');
 nav.innerHTML='<div class="student-question-bottom-inner"></div>';
 root.appendChild(nav);
 return nav;
}

function makeMobileProxy(){
 let nav=document.querySelector('.student-question-mobile-proxy');
 if(nav)return nav;
 nav=document.createElement('nav');
 nav.className='student-question-mobile-proxy';
 nav.setAttribute('aria-label','Question navigation');
 nav.innerHTML='<div class="student-question-mobile-proxy-inner"><button type="button" class="student-question-mobile-back">← Back</button><button type="button" class="student-question-mobile-next">Next →</button></div>';
 document.body.appendChild(nav);
 nav.querySelector('.student-question-mobile-back').addEventListener('click',()=>{
  const root=$('#activityPanel');
  const original=$('[data-question-flow-back]',root);
  if(original&&!original.disabled)original.click();
 });
 nav.querySelector('.student-question-mobile-next').addEventListener('click',()=>{
  const root=$('#activityPanel');
  const original=$('.student-question-continue',root);
  if(original&&!original.disabled)original.click();
 });
 return nav;
}

function syncResponseState(q){
 if(!q)return;
 q.dataset.responseRecorded=hasResponse(q)?'1':'0';
}

function syncNavigationState(root){
 const q=currentQuestion(root);
 const next=$('.student-question-continue',root);
 if(!q||!next)return;
 syncResponseState(q);
 const attempted=hasResponse(q);
 if(attempted){
  next.disabled=false;
  next.removeAttribute('aria-disabled');
 }else if(!/check|save/i.test(next.textContent||'')){
  next.setAttribute('aria-disabled',String(Boolean(next.disabled)));
 }
}

function syncMobileProxy(root,back,next){
 const proxy=makeMobileProxy();
 const proxyBack=$('.student-question-mobile-back',proxy);
 const proxyNext=$('.student-question-mobile-next',proxy);
 const q=currentQuestion(root);
 const active=isMobile()&&document.body.classList.contains('student-question-focus-mode')&&isStudent();
 proxy.hidden=!active;
 if(!active)return;

 proxyBack.hidden=Boolean(back.hidden);
 proxyBack.disabled=Boolean(back.disabled||back.hidden);
 proxyNext.hidden=false;
 proxyNext.disabled=Boolean(next.disabled);
 proxyNext.textContent=/check/i.test(next.textContent||'')?'Check answer':(/save/i.test(next.textContent||'')?next.textContent:'Next →');
 proxyNext.setAttribute('aria-disabled',String(Boolean(next.disabled)));

 if(q&&hasResponse(q)){
  q.dataset.responseRecorded='1';
  next.disabled=false;
  next.removeAttribute('aria-disabled');
  proxyNext.disabled=false;
  proxyNext.removeAttribute('aria-disabled');
 }
 document.body.classList.add('student-question-mobile-proxy-active');
}

function enhance(){
 const root=$('#activityPanel');
 if(!root||!document.body.classList.contains('student-question-focus-mode')||!isStudent())return;
 const back=$('[data-question-flow-back]',root);
 const next=$('.student-question-continue',root);
 if(!back||!next)return;

 const nav=makeNav(root);
 const inner=$('.student-question-bottom-inner',nav);

 back.hidden=false;
 back.classList.add('student-question-nav-back');
 back.textContent='← Back';
 back.setAttribute('aria-label','Previous question');

 next.hidden=false;
 next.classList.add('student-question-nav-next');
 next.setAttribute('aria-label',/check/i.test(next.textContent||'')?'Check answer':'Next question');
 if(!/check|save/i.test(next.textContent||''))next.textContent='Next →';

 const hint=$('#activityHint');
 if(hint){
  hint.classList.add('student-question-nav-hint');
  hint.textContent='Hint';
  hint.setAttribute('aria-label','Show hint');
 }

 if(back.parentElement!==inner)inner.appendChild(back);
 if(hint&&hint.parentElement!==inner)inner.appendChild(hint);
 if(next.parentElement!==inner)inner.appendChild(next);

 const previousSkill=$('#previousActivity');
 if(previousSkill&&!previousSkill.hidden)previousSkill.hidden=true;

 syncNavigationState(root);
 document.body.classList.add('student-question-nav-active');
 syncMobileProxy(root,back,next);
}

function cleanup(){
 if(document.body.classList.contains('student-question-focus-mode'))return;
 document.body.classList.remove('student-question-nav-active','student-question-mobile-proxy-active');
 const proxy=document.querySelector('.student-question-mobile-proxy');
 if(proxy)proxy.hidden=true;
}

function fallbackAdvance(q){
 const root=q?.closest('#activityPanel');
 if(!root)return;
 window.setTimeout(()=>{
  if(!document.body.contains(q))return;
  const active=currentQuestion(root);
  if(active!==q)return;
  const next=$('.student-question-continue',root);
  if(!next||!hasResponse(q))return;
  next.disabled=false;
  next.removeAttribute('aria-disabled');
  if(next.dataset.autoAdvance==='1')next.click();
  else enhance();
 },950);
}

document.addEventListener('change',e=>{
 if(!document.body.classList.contains('student-question-focus-mode'))return;
 const q=e.target.closest?.('#activityPanel .guided-question');
 if(!q||!e.target.matches('input[type="radio"],input[type="checkbox"]'))return;
 q.dataset.responseRecorded='1';
 enhance();
 fallbackAdvance(q);
},false);

document.addEventListener('input',e=>{
 if(!document.body.classList.contains('student-question-focus-mode'))return;
 const q=e.target.closest?.('#activityPanel .guided-question');
 if(!q)return;
 syncResponseState(q);
 enhance();
},false);

document.addEventListener('click',e=>{
 if(!document.body.classList.contains('student-question-focus-mode'))return;
 const writingCheck=e.target.closest?.('[data-writing-core-check]');
 if(writingCheck){
  const q=writingCheck.closest('.guided-question');
  setTimeout(()=>{
   if(q?.dataset.coreComplete==='1')q.dataset.responseRecorded='1';
   enhance();
   fallbackAdvance(q);
  },0);
  return;
 }

 // Typed grammar/transformation questions often use a plain "Check" button.
 // A genuine typed attempt must unlock navigation regardless of correctness.
 const genericCheck=e.target.closest?.('button');
 if(genericCheck&&/^check(?: answer| answers)?$/i.test(String(genericCheck.textContent||'').trim())){
  const q=genericCheck.closest('.guided-question');
  if(q&&hasResponse(q))q.dataset.responseRecorded='1';
  setTimeout(()=>{enhance();if(q)fallbackAdvance(q)},0);
 }

 const choice=e.target.closest?.('[data-mcq-option],.mcq-option-card,.choice');
 if(choice){
  const q=choice.closest('.guided-question');
  setTimeout(()=>{enhance();fallbackAdvance(q)},0);
  return;
 }
 if(e.target.closest?.('.student-question-nav-back,.student-question-nav-next')){
  setTimeout(()=>{enhance();cleanup()},0);
 }
},true);

let queued=false;
const observer=new MutationObserver(()=>{
 if(queued)return;
 queued=true;
 requestAnimationFrame(()=>{
  queued=false;
  enhance();
  cleanup();
 });
});

function start(){
 observer.observe(document.documentElement,{
  subtree:true,
  childList:true,
  attributes:true,
  attributeFilter:['class','hidden','disabled','data-core-complete','data-core-correct','data-response-recorded']
 });
 enhance();
 window.addEventListener('resize',()=>{enhance();cleanup()},{passive:true});
 window.addEventListener('orientationchange',()=>{enhance();cleanup()},{passive:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
