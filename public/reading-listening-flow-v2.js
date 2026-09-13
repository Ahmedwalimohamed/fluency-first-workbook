/* EnglishGate Reading & Listening flow repair v2
   Keeps the two source stages clean and guarantees Back/Next navigation for students.
   No lesson content or answer keys are changed. */
(function(){
'use strict';

const isStudent=()=>typeof session!=='undefined'&&session?.role==='student';
const panel=()=>document.getElementById('activityPanel');

function context(){
 const root=panel();
 const page=root?.querySelector('.eg-reading-listening-page');
 if(!root||!page||!isStudent())return null;
 const questions=[...page.querySelectorAll('.eg-reading-section .guided-question,.eg-listening-section .guided-question,.eg-shared-comprehension .guided-question')];
 if(questions.length<2)return null;
 return {root,page,questions};
}

function answered(q){
 if(!q)return false;
 if(q.dataset.responseRecorded==='1')return true;
 if(q.querySelector('input[type="radio"]:checked,input[type="checkbox"]:checked'))return true;
 const field=q.querySelector('input[data-short-answer],input[type="text"],textarea,[data-writing-core-input]');
 return Boolean(field&&String(field.value||'').trim());
}

function currentIndex(ctx){
 const marked=ctx.questions.findIndex(q=>q.classList.contains('is-flow-current'));
 if(marked>=0)return marked;
 const visible=ctx.questions.findIndex(q=>!q.hidden&&getComputedStyle(q).display!=='none');
 if(visible>=0)return visible;
 const saved=Number(ctx.root.dataset.readingListeningIndex||0);
 return Number.isFinite(saved)?Math.min(Math.max(saved,0),ctx.questions.length-1):0;
}

function setPartVisibility(ctx,q){
 const sections=[
  ctx.page.querySelector('.eg-reading-section'),
  ctx.page.querySelector('.eg-listening-section'),
  ctx.page.querySelector('.eg-shared-comprehension')
 ].filter(Boolean);
 sections.forEach(section=>{
  const active=section.contains(q);
  section.classList.toggle('is-reading-listening-active',active);
  section.hidden=!active;
 });
}

function syncHeader(ctx,index,q){
 const label=ctx.root.querySelector('[data-question-flow-label]');
 const stage=ctx.root.querySelector('[data-question-flow-stage]');
 const bar=ctx.root.querySelector('[data-question-flow-bar]');
 const back=ctx.root.querySelector('[data-question-flow-back]');
 const next=ctx.root.querySelector('.student-question-continue');
 const source=ctx.root.querySelector('[data-question-flow-source]');
 const audio=ctx.root.querySelector('[data-question-flow-audio]');
 const inReading=Boolean(q.closest('.eg-reading-section'));
 const inListening=Boolean(q.closest('.eg-listening-section'));
 const inShared=Boolean(q.closest('.eg-shared-comprehension'));

 if(label)label.textContent='Question '+(index+1)+' of '+ctx.questions.length;
 if(stage)stage.textContent=inReading?'Reading':inListening?'Listening':inShared?'Combined understanding':'';
 if(bar)bar.style.width=((index+1)/ctx.questions.length*100)+'%';
 if(back){back.hidden=false;back.disabled=index===0;back.setAttribute('aria-disabled',index===0?'true':'false')}
 if(next){
  next.hidden=false;
  next.dataset.autoAdvance='0';
  next.disabled=!answered(q);
  next.removeAttribute('aria-disabled');
  next.textContent=index===ctx.questions.length-1?'Check answers':'Next →';
 }
 if(source){source.hidden=!inReading;source.textContent='Text'}
 if(audio){audio.hidden=!inListening;audio.textContent='▶ Audio'}
}

function show(index,{scroll=true}={}){
 const ctx=context();if(!ctx)return;
 index=Math.min(Math.max(Number(index)||0,0),ctx.questions.length-1);
 const q=ctx.questions[index];
 ctx.root.dataset.readingListeningIndex=String(index);
 ctx.root.dataset.readingListeningFlow='2';

 ctx.questions.forEach((item,i)=>{
  item.hidden=i!==index;
  item.classList.toggle('is-flow-current',i===index);
  item.classList.toggle('is-flow-previous',i<index);
  item.setAttribute('aria-hidden',i===index?'false':'true');
  const list=item.closest('.activity-question-list');
  if(list){
   list.dataset.studentQuestionFlow='1';
   list.dataset.flowActiveList=list.contains(q)?'1':'0';
  }
 });
 setPartVisibility(ctx,q);
 syncHeader(ctx,index,q);
 if(scroll){
  const section=q.closest('.eg-source-task-section,.eg-shared-comprehension')||q;
  requestAnimationFrame(()=>section.scrollIntoView({block:'start',behavior:'smooth'}));
 }
}

function reconcile(){
 const ctx=context();if(!ctx)return;
 show(currentIndex(ctx),{scroll:false});
}

// Own Back/Next only on the split Reading & Listening page. This avoids conflicts
// between the old auto-advance listener and the newer persistent navigation patches.
document.addEventListener('click',e=>{
 const ctx=context();if(!ctx)return;
 const next=e.target.closest?.('.student-question-continue');
 const back=e.target.closest?.('[data-question-flow-back]');
 if(!next&&!back)return;
 e.preventDefault();
 e.stopImmediatePropagation();
 const index=currentIndex(ctx),q=ctx.questions[index];
 if(back){if(index>0)show(index-1);return}
 if(!answered(q)){syncHeader(ctx,index,q);return}
 if(index<ctx.questions.length-1){show(index+1);return}
 const submit=ctx.root.querySelector('#checkActivity');
 if(submit){submit.click()}
},true);

// Reading answers are typed; listening answers may be choices. Either response
// immediately enables Next. Listening MCQs no longer depend on fragile auto-advance.
document.addEventListener('input',e=>{
 const ctx=context();if(!ctx||!e.target.closest?.('.eg-reading-listening-page .guided-question'))return;
 const index=currentIndex(ctx);syncHeader(ctx,index,ctx.questions[index]);
},true);

document.addEventListener('change',e=>{
 const ctx=context();if(!ctx||!e.target.closest?.('.eg-reading-listening-page .guided-question'))return;
 const q=e.target.closest('.guided-question');
 q.dataset.responseRecorded='1';
 const index=currentIndex(ctx);
 setTimeout(()=>syncHeader(ctx,index,ctx.questions[index]),0);
},true);

// Clicking a styled MCQ card can update its hidden radio after the click handler.
document.addEventListener('click',e=>{
 if(!e.target.closest?.('.eg-reading-listening-page [data-mcq-option],.eg-reading-listening-page .mcq-option-card,.eg-reading-listening-page .choice'))return;
 setTimeout(()=>{
  const ctx=context();if(!ctx)return;
  const index=currentIndex(ctx),q=ctx.questions[index];
  if(answered(q))q.dataset.responseRecorded='1';
  syncHeader(ctx,index,q);
 },0);
},false);

let queued=false;
const observer=new MutationObserver(()=>{
 if(queued)return;queued=true;
 requestAnimationFrame(()=>{queued=false;reconcile()});
});
function start(){observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','disabled']});reconcile()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
