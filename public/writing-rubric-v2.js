(()=>{
  'use strict';

  if(!document.querySelector('script[data-northstar-semantic-grading]')){
    const semantic=document.createElement('script');
    semantic.src='northstar-semantic-grading-v1.js?v=1';
    semantic.dataset.northstarSemanticGrading='1';
    document.head.appendChild(semantic);
  }

  let originalSaveWriting=null;
  try{originalSaveWriting=typeof saveWriting==='function'?saveWriting:window.saveWriting}catch(_){originalSaveWriting=window.saveWriting}
  if(typeof originalSaveWriting!=='function')return;

  const PASS_SCORE=70;
  const RUBRIC=[
    ['Task achievement',30,'Answer the exact task, include the required content, and stay relevant.'],
    ['Organisation and cohesion',20,'Make ideas easy to follow with clear order, paragraphs or sequencing, and useful linking.'],
    ['Grammar accuracy and range',20,'Use B2-appropriate grammar with enough range; minor errors are acceptable when meaning stays clear.'],
    ['Vocabulary range and precision',20,'Use relevant, varied, and reasonably precise vocabulary for the task.'],
    ['Sentence control and mechanics',10,'Control sentence boundaries, spelling, capitals, and punctuation so the response is easy to read.']
  ];

  function isB2Lesson(l){return /^su-b2-l\d+$/.test(String(l?.id||''))}
  function safe(value){
    try{return typeof escapeHtml==='function'?escapeHtml(String(value??'')):String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
    catch{return String(value??'')}
  }
  function rubricCard(){
    return `<section class="eg-writing-rubric-v2" data-writing-rubric-v2>
      <div class="eg-writing-rubric-head"><div><span class="eg-skill-kicker">B2 writing standard</span><h3>How your final writing is graded</h3></div><strong>Pass: ${PASS_SCORE}%</strong></div>
      <div class="eg-writing-rubric-grid">${RUBRIC.map(([label,weight,desc])=>`<article><span>${weight}%</span><strong>${label}</strong><p>${desc}</p></article>`).join('')}</div>
      <p class="eg-writing-rubric-rule"><strong>Important:</strong> Word count alone never earns a pass. The response must answer the task, meet the rubric, and be graded successfully by the AI assessment service.</p>
    </section>`
  }
  function ensureRubricVisible(){
    let lessonObj=null;
    try{lessonObj=typeof lesson==='function'?lesson():null}catch{}
    if(!isB2Lesson(lessonObj))return;
    const card=document.querySelector('.final-writing-card');
    if(!card||card.querySelector('[data-writing-rubric-v2]'))return;
    const taskHead=card.querySelector('.writing-task-head');
    if(taskHead)taskHead.insertAdjacentHTML('beforebegin',rubricCard());
  }
  function dimensionHtml(grade){
    const dimensions=grade?.dimensions||{};
    return `<div class="eg-writing-grade-grid">${Object.values(dimensions).map(d=>`<article class="eg-writing-grade-dimension"><div><strong>${safe(d.label)}</strong><span>${Number(d.weight)||0}% weight</span></div><b>${Number(d.score)||0}%</b><small>${safe(String(d.band||'').replace(/_/g,' '))}</small><p>${safe(d.descriptor||'')}</p></article>`).join('')}</div>`
  }
  function resultHtml(grade){
    const passed=grade?.pass===true,tone=passed?'good':'bad',headline=passed?'Writing standard met':'Revision required';
    return `<div class="performance-result ${tone} eg-writing-grade-result">
      <div class="performance-score"><strong>${Number(grade?.score)||0}%</strong><span>${headline}</span></div>
      <p><strong>${safe(grade?.feedback?.strength||'')}</strong> ${safe(grade?.feedback?.improve||'')}</p>
      ${dimensionHtml(grade)}
      <p class="eg-writing-grade-action">${safe(grade?.feedback?.action||'')}</p>
      <p><small>Rubric ${safe(grade?.version||'englishgate-writing-rubric-v2')} · pass threshold ${Number(grade?.threshold)||PASS_SCORE}%.</small></p>
    </div>`
  }
  async function standardSaveWriting(l){
    if(!isB2Lesson(l)||l?.writing?.humanGraded)return originalSaveWriting(l);

    const f=typeof $==='function'?$('activityFeedback'):document.getElementById('activityFeedback');
    const cards=[...document.querySelectorAll('[data-writing-core]')];
    const results=cards.map(card=>checkWritingCoreCard(card,true));
    const firstIncomplete=results.findIndex(x=>!x.complete);
    if(firstIncomplete>=0){
      if(f)f.innerHTML='<div class="feedback bad">Complete all writing practice questions before submitting your final response.</div>';
      cards[firstIncomplete]?.scrollIntoView({behavior:'smooth',block:'center'});
      return;
    }

    const box=document.querySelector('.writing-final-response'),response=box?.value.trim()||'',spec=writingFinalSpec(l),checks=formativeWritingChecks(l,response,spec);
    if(!checks.length){
      if(f)f.innerHTML=`<div class="feedback bad">Your final response has ${checks.words} words. Write ${spec.min}–${spec.max} words before grading.</div>`;
      box?.focus();
      return;
    }
    const shareChoice=document.querySelector('input[name="writing-community-share"]:checked');
    if(!shareChoice){
      if(f)f.innerHTML='<div class="feedback bad">Choose whether you would like to share this writing to My Writings.</div>';
      document.querySelector('.writing-share-choice')?.scrollIntoView({behavior:'smooth',block:'center'});
      return;
    }
    const publishToCommunity=shareChoice.value==='yes';
    const button=typeof $==='function'?$('saveWriting'):document.getElementById('saveWriting');
    if(button){button.disabled=true;button.textContent='Grading writing…'}
    if(f)f.innerHTML='<div class="feedback">Checking your writing against the B2 rubric…</div>';

    let grade;
    try{
      grade=await api('/api/writing-grade-v2',{method:'POST',body:JSON.stringify({lessonId:l.id,task:spec.task,text:response,level:'B2',minWords:spec.min,maxWords:spec.max})});
    }catch(e){
      if(typeof saveActivityDraft==='function')saveActivityDraft();
      if(f)f.innerHTML='<div class="feedback bad"><strong>Your writing was not graded.</strong> The AI writing grader is temporarily unavailable, so EnglishGate did not mark this activity correct or complete. Your draft remains on this device. Please retry when grading is available.</div>';
      if(button){button.disabled=false;button.textContent='Grade & save writing'}
      return;
    }

    const tags=['writing:rubric-v2',`writing:rubric:${grade.version||'v2'}`];
    for(const [id,d] of Object.entries(grade.dimensions||{}))tags.push(`writing:${id}:${d.band}`);
    try{
      await recordAttempt(session.id,l.id,'writing',Number(grade.score)||0,tags,[{index:1,question:spec.task,studentAnswer:response,correctAnswer:'Evaluated against the EnglishGate B2 writing rubric',correct:grade.pass===true,tag:'writing:rubric-v2'}]);
    }catch(e){
      if(typeof saveActivityDraft==='function')saveActivityDraft();
      if(f)f.innerHTML='<div class="feedback bad">Your writing was graded, but the evidence could not be saved. Nothing was marked complete. Please retry.</div>';
      if(button){button.disabled=false;button.textContent='Grade & save writing'}
      return;
    }

    if(grade.pass!==true){
      if(typeof saveActivityDraft==='function')saveActivityDraft();
      const done=typeof $==='function'?$('doneActivity'):document.getElementById('doneActivity');if(done)done.disabled=true;
      if(f)f.innerHTML=resultHtml(grade)+'<div class="feedback bad"><strong>Not complete yet.</strong> Revise your final response using the rubric feedback, then submit it again. Your current draft has not been marked correct.</div>';
      if(button){button.disabled=false;button.textContent='Re-grade writing'}
      return;
    }

    try{
      await api(`/api/writing/${l.id}`,{method:'PUT',body:JSON.stringify({content:response,publishToCommunity})});
      await refreshState();
      if(typeof clearActivityDraft==='function')clearActivityDraft();
      const done=typeof $==='function'?$('doneActivity'):document.getElementById('doneActivity');if(done)done.disabled=false;
      if(f)f.innerHTML=resultHtml(grade)+`<div class="feedback good"><strong>Passed and saved.</strong> ${publishToCommunity?'Your writing was also shared to My Writings.':'Your writing remains private from My Writings.'} Press <strong>Done</strong> when you are ready to continue.</div>`;
      if(button){button.disabled=false;button.textContent='Grade & save writing'}
    }catch(e){
      if(typeof saveActivityDraft==='function')saveActivityDraft();
      if(f)f.innerHTML=resultHtml(grade)+'<div class="feedback bad"><strong>Your grade passed, but the response could not be saved.</strong> The activity is not complete yet. Retry saving when the connection is available.</div>';
      if(button){button.disabled=false;button.textContent='Grade & save writing'}
    }
  }

  try{saveWriting=standardSaveWriting}catch(_){/* global lexical binding unavailable */}
  window.saveWriting=standardSaveWriting;

  const observer=new MutationObserver(()=>ensureRubricVisible());
  observer.observe(document.documentElement,{subtree:true,childList:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureRubricVisible,{once:true});else ensureRubricVisible();
  window.ENGLISHGATE_WRITING_RUBRIC_V2={version:'englishgate-writing-rubric-v2',passScore:PASS_SCORE,rubric:RUBRIC};
})();
