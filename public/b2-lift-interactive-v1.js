/* EnglishGate interactive Grammar Lesson stage
   Replaces the old B2 Lift live-book stage with a proper grammar lesson.
*/
(function(){
'use strict';
const marker='__ENGLISHGATE_GRAMMAR_LESSON__';
const clean=v=>String(v==null?'':v).trim();
const esc=v=>typeof window.escapeHtml==='function'?window.escapeHtml(clean(v)):clean(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function lessonNumber(){
 const teacher=Number(window.activeTeacherLessonNumber||0),student=Number(window.activeStudentLiveLessonNumber||0);
 return teacher||student||0;
}
function currentLessonTitle(){
 try{
  if(window.session?.role==='teacher'&&typeof window.teacherClass==='function'&&typeof window.liveBookForClass==='function'){
   const live=window.liveBookForClass(window.teacherClass());
   return live?.lessons?.find(x=>Number(x.number)===lessonNumber())?.title||'';
  }
  if(window.session?.role==='student'&&typeof window.studentClass==='function'&&typeof window.liveBookForClass==='function'){
   const live=window.liveBookForClass(window.studentClass(window.session.id));
   return live?.lessons?.find(x=>Number(x.number)===lessonNumber())?.title||'';
  }
 }catch{}
 return '';
}
function grammarData(){
 const rows=Array.isArray(window.SPEAKUP_B2_BLUEPRINT)?window.SPEAKUP_B2_BLUEPRINT:[];
 const n=lessonNumber(),title=clean(currentLessonTitle()).toLowerCase();
 let row=rows.find(x=>Number(x.number)===n);
 if(!row&&title)row=rows.find(x=>clean(x.title).toLowerCase()===title);
 if(!row)return{focus:'Grammar in context',rule:'Notice how the grammar works in this lesson, then use it accurately in your own sentence.',items:[]};
 return{focus:clean(row.grammarFocus)||'Grammar in context',rule:clean(row.grammarRule)||clean(row.foundation),items:Array.isArray(row.grammarItems)?row.grammarItems:[],title:clean(row.title)};
}

const originalHeading=window.liveSectionHeading;
if(typeof originalHeading==='function'){
 window.liveSectionHeading=function(line){
  if(/^B2\s+LIFT$/i.test(clean(line)))return'Grammar Lesson';
  return originalHeading(line);
 };
}
const originalSections=window.liveSections;
if(typeof originalSections==='function'){
 window.liveSections=function(text){
  return originalSections(text).map(section=>{
   if(/^B2\s+LIFT$/i.test(clean(section?.title))||/^Grammar Lesson$/i.test(clean(section?.title))){
    return{...section,title:'Grammar Lesson',lines:[marker]};
   }
   return section;
  });
 };
}

function optionButtons(q,qi){
 return (q.options||[]).map((o,oi)=>`<button type="button" class="grammar-live-option" data-grammar-option data-q="${qi}" data-correct="${String(o)===String(q.answer)?'true':'false'}"><span>${String.fromCharCode(65+oi)}</span>${esc(o)}</button>`).join('');
}
function questionCard(q,i,total){
 return `<article class="grammar-live-question ${i?'is-hidden':''}" data-grammar-question="${i}">
  <div class="grammar-question-meta"><span>Question ${i+1} of ${total}</span><span>${esc((q.tag||'grammar').replace(/^grammar:/,'').replace(/-/g,' '))}</span></div>
  <h4>${esc(q.q)}</h4>
  <div class="grammar-live-options">${optionButtons(q,i)}</div>
  <div class="grammar-live-feedback" data-grammar-feedback aria-live="polite"></div>
 </article>`;
}
function grammarHtml(data){
 const qs=data.items.length?data.items:[{q:'Choose the sentence that best follows the grammar rule above.',options:['Use the form that matches the meaning and time.','Choose any form because grammar does not change meaning.'],answer:'Use the form that matches the meaning and time.',tag:'grammar:meaning'}];
 const sample=qs[0]?.answer||'';
 return `<section class="grammar-live-lesson" data-grammar-live>
  <header class="grammar-live-hero"><div><span class="grammar-live-kicker">Grammar Lesson</span><h3>${esc(data.focus)}</h3><p>Learn the pattern, notice it in context, practise it, then use it yourself.</p></div></header>
  <section class="grammar-live-rule"><div class="grammar-step-number">1</div><div><small>Understand the grammar</small><h4>Mini rule</h4><p>${esc(data.rule)}</p>${sample?`<div class="grammar-example"><b>Example</b><span>${esc(sample)}</span></div>`:''}</div></section>
  <section class="grammar-live-practice"><div class="grammar-live-section-head"><div><span class="grammar-step-number">2</span><div><small>Guided practice</small><h4>Choose the best answer</h4></div></div><strong data-grammar-progress>1 / ${qs.length}</strong></div><div data-grammar-question-box>${qs.map((q,i)=>questionCard(q,i,qs.length)).join('')}</div><div class="grammar-live-nav"><button type="button" class="ghost-btn" data-grammar-prev disabled>← Previous</button><button type="button" class="primary-btn" data-grammar-next disabled>${qs.length===1?'Finish practice':'Next →'}</button></div></section>
  <section class="grammar-live-apply"><div class="grammar-step-number">3</div><div class="grammar-live-apply-copy"><small>Apply it</small><h4>Make it yours</h4><p>Write one true sentence using <strong>${esc(data.focus)}</strong>.</p><textarea data-grammar-production rows="3" placeholder="Write your own sentence here..."></textarea><div class="grammar-production-actions"><button type="button" class="primary-btn" data-grammar-production-check>Check my sentence</button><span data-grammar-production-feedback aria-live="polite"></span></div></div></section>
 </section>`;
}

const originalRender=window.renderLiveContent;
if(typeof originalRender==='function'){
 window.renderLiveContent=function(text){
  const lines=String(text||'').split('\n');
  if(clean(lines[0])===marker)return grammarHtml(grammarData());
  return originalRender(text);
 };
}

function decorateStageCards(root=document){
 root.querySelectorAll('.eg-stage,.teacher-presentation-stage').forEach(card=>{
  const strong=card.querySelector('strong');if(!strong)return;
  const label=clean(strong.textContent);
  const isLegacy=/^B2\s+LIFT$/i.test(label);
  const isGrammar=/^Grammar Lesson$/i.test(label);
  if(!isLegacy&&!isGrammar)return;
  // Critical: do not rewrite textContent when it already says Grammar Lesson.
  // Rewriting an identical text node still creates a childList mutation and previously caused an observer loop.
  if(isLegacy)strong.textContent='Grammar Lesson';
  if(card.classList.contains('b2-lift-stage'))card.classList.remove('b2-lift-stage');
  if(!card.classList.contains('grammar-lesson-stage'))card.classList.add('grammar-lesson-stage');
  card.querySelectorAll('.b2-stage-badge').forEach(x=>x.remove());
 });
 root.querySelectorAll('h1,h2,h3,h4,small,span').forEach(node=>{
  if(node.children.length===0&&/^B2\s+LIFT$/i.test(clean(node.textContent)))node.textContent='Grammar Lesson';
 });
}
function questionState(root){
 const cards=[...root.querySelectorAll('[data-grammar-question]')];
 let index=cards.findIndex(x=>!x.classList.contains('is-hidden'));if(index<0)index=0;
 return{cards,index};
}
function showQuestion(root,index){
 const {cards}=questionState(root);if(!cards.length)return;
 const nextIndex=Math.max(0,Math.min(index,cards.length-1));
 cards.forEach((c,i)=>c.classList.toggle('is-hidden',i!==nextIndex));
 const progress=root.querySelector('[data-grammar-progress]');if(progress&&progress.textContent!==`${nextIndex+1} / ${cards.length}`)progress.textContent=`${nextIndex+1} / ${cards.length}`;
 const prev=root.querySelector('[data-grammar-prev]'),next=root.querySelector('[data-grammar-next]');
 if(prev)prev.disabled=nextIndex===0;
 if(next){const label=nextIndex===cards.length-1?'Finish practice':'Next →';if(next.textContent!==label)next.textContent=label;next.disabled=!cards[nextIndex].dataset.answered;}
}

document.addEventListener('click',e=>{
 const option=e.target.closest?.('[data-grammar-option]');
 if(option){
  const card=option.closest('[data-grammar-question]'),root=option.closest('[data-grammar-live]');if(!card||!root||card.dataset.answered)return;
  card.dataset.answered='1';const correct=option.dataset.correct==='true';
  card.querySelectorAll('[data-grammar-option]').forEach(btn=>{btn.disabled=true;if(btn.dataset.correct==='true')btn.classList.add('is-correct')});
  option.classList.add(correct?'is-correct':'is-wrong');
  const feedback=card.querySelector('[data-grammar-feedback]');if(feedback){feedback.className='grammar-live-feedback '+(correct?'is-good':'is-bad');feedback.textContent=correct?'Correct. Notice why this form matches the meaning.':'Not quite. Compare your choice with the highlighted correct answer.';}
  const next=root.querySelector('[data-grammar-next]');if(next)next.disabled=false;return;
 }
 const next=e.target.closest?.('[data-grammar-next]');
 if(next){const root=next.closest('[data-grammar-live]'),state=questionState(root);if(state.index<state.cards.length-1)showQuestion(root,state.index+1);else{next.textContent='Practice complete ✓';next.disabled=true;root.querySelector('[data-grammar-production]')?.focus();}return;}
 const prev=e.target.closest?.('[data-grammar-prev]');if(prev){const root=prev.closest('[data-grammar-live]'),state=questionState(root);showQuestion(root,state.index-1);return;}
 const check=e.target.closest?.('[data-grammar-production-check]');
 if(check){const root=check.closest('[data-grammar-live]'),box=root?.querySelector('[data-grammar-production]'),feedback=root?.querySelector('[data-grammar-production-feedback]');if(!box||!feedback)return;const text=clean(box.value);if(text.length<8){feedback.textContent='Write one complete sentence first.';feedback.className='is-bad';return;}feedback.textContent='Good. Read it aloud and check that the grammar matches the meaning you want.';feedback.className='is-good';}
},true);

let scheduled=false;
function scheduleDecorate(){
 if(scheduled)return;
 scheduled=true;
 requestAnimationFrame(()=>{scheduled=false;decorateStageCards();});
}
const observer=new MutationObserver(mutations=>{
 // Ignore mutations fully inside the interactive grammar lesson; they are expected user interactions.
 if(mutations.length&&mutations.every(m=>m.target?.nodeType===1&&m.target.closest?.('[data-grammar-live]')))return;
 scheduleDecorate();
});
function start(){decorateStageCards();observer.observe(document.body,{subtree:true,childList:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
