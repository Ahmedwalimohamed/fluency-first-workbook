(function(){
'use strict';

function $(sel,root=document){return root.querySelector(sel)}

function currentVisibleQuestion(root){
 return [...root.querySelectorAll('.guided-question')].find(q=>!q.hidden&&getComputedStyle(q).display!=='none')||null;
}

function questionAnswered(q){
 if(!q)return false;
 const radio=q.querySelector('input[type="radio"]');
 if(radio)return Boolean(q.querySelector('input[type="radio"]:checked'));
 const short=q.querySelector('input[data-short-answer],input[type="text"]');
 if(short)return Boolean(String(short.value||'').trim());
 const area=q.querySelector('textarea');
 if(area)return Boolean(String(area.value||'').trim());
 const checked=q.querySelector('input[type="checkbox"]:checked');
 if(checked)return true;
 if(q.dataset.coreComplete==='1')return true;
 return false;
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

function enhance(){
 const root=$('#activityPanel');
 if(!root||!document.body.classList.contains('student-question-focus-mode'))return;
 const back=$('[data-question-flow-back]',root);
 const next=$('.student-question-continue',root);
 if(!back||!next)return;
 const nav=makeNav(root),inner=$('.student-question-bottom-inner',nav);

 if(back.hidden)back.hidden=false;
 if(!back.classList.contains('student-question-nav-back'))back.classList.add('student-question-nav-back');
 if(back.textContent!=='← Back')back.textContent='← Back';
 if(back.getAttribute('aria-label')!=='Previous question')back.setAttribute('aria-label','Previous question');

 if(next.hidden)next.hidden=false;
 if(!next.classList.contains('student-question-nav-next'))next.classList.add('student-question-nav-next');
 if(next.textContent!=='Next →'&&!/check|save/i.test(next.textContent||''))next.textContent='Next →';

 let hint=$('#activityHint');
 if(hint){
  if(!hint.classList.contains('student-question-nav-hint'))hint.classList.add('student-question-nav-hint');
  if(hint.textContent!=='Hint')hint.textContent='Hint';
 }

 if(back.parentElement!==inner)inner.appendChild(back);
 if(hint&&hint.parentElement!==inner)inner.appendChild(hint);
 if(next.parentElement!==inner)inner.appendChild(next);

 const previousSkill=$('#previousActivity');
 if(previousSkill&&!previousSkill.hidden)previousSkill.hidden=true;

 const q=currentVisibleQuestion(root);
 if(next.disabled&&q&&questionAnswered(q))next.disabled=false;
 if(!document.body.classList.contains('student-question-nav-active'))document.body.classList.add('student-question-nav-active');
}

function cleanup(){
 if(!document.body.classList.contains('student-question-focus-mode')&&document.body.classList.contains('student-question-nav-active')){
  document.body.classList.remove('student-question-nav-active');
 }
}

// Preserve the core activity handler so simple choice questions can auto-advance.
// This patch only refreshes the persistent navigation state after the answer is recorded.
document.addEventListener('change',function(e){
 const radio=e.target.closest&&e.target.closest('input[type="radio"]');
 if(!radio||!document.body.classList.contains('student-question-focus-mode'))return;
 const root=radio.closest('#activityPanel');
 if(!root)return;
 setTimeout(function(){
  enhance();
  const next=$('.student-question-continue',root);
  const q=currentVisibleQuestion(root);
  if(next?.disabled&&q&&questionAnswered(q))next.disabled=false;
 },0);
},false);

document.addEventListener('input',function(e){
 if(!document.body.classList.contains('student-question-focus-mode'))return;
 if(!e.target.closest||!e.target.closest('#activityPanel .guided-question'))return;
 setTimeout(enhance,0);
},true);

document.addEventListener('click',function(e){
 if(e.target.closest&&e.target.closest('.student-question-nav-back,.student-question-nav-next,[data-mcq-option],.choice')){
  setTimeout(function(){enhance();cleanup()},0);
 }
},true);

// Reconcile once per frame; idempotent writes let observed mutations settle.
let refreshQueued=false;
const observer=new MutationObserver(function(){
 if(refreshQueued)return;
 refreshQueued=true;
 requestAnimationFrame(function(){refreshQueued=false;enhance();cleanup()});
});
observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','disabled']});

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);
else enhance();
})();
