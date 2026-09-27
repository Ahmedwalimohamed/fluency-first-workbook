(()=>{
  'use strict';

  if(!document.querySelector('link[data-northstar-teaching-style]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='northstar-teaching-v1.css?v=1';
    link.dataset.northstarTeachingStyle='1';
    document.head.appendChild(link);
  }

  function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
  function currentLesson(){
    try{if(typeof lesson==='function'){const l=lesson();if(l)return l}}catch{}
    try{if(typeof activeLessonId!=='undefined'&&Array.isArray(window.SPEAKUP_B2_BLUEPRINT)){const l=window.SPEAKUP_B2_BLUEPRINT.find(x=>x.id===activeLessonId);if(l)return l}}catch{}
    const title=document.querySelector('.b2-northstar-flow .micro-title strong')?.textContent?.trim();
    if(title&&Array.isArray(window.SPEAKUP_B2_BLUEPRINT))return window.SPEAKUP_B2_BLUEPRINT.find(x=>String(x.title||'').trim()===title)||null;
    return null;
  }
  function promptText(flow){return flow.querySelector('.micro-prompt h1,.micro-prompt h2,.micro-prompt strong')?.textContent?.trim()||''}
  function modelText(flow){return flow.querySelector('.northstar-model')?.textContent?.replace(/^MODEL\s*/i,'').trim()||''}
  function feedbackBox(){return document.getElementById('northstarFeedback')}
  function showChecking(){
    const f=feedbackBox();
    if(!f)return;
    f.innerHTML='<section class="eg-northstar-status" aria-live="polite"><strong>Checking your English…</strong><p>I am checking the meaning and the lesson pattern, not only the number of words.</p></section>'
  }
  function showSimpleRevision(message,title='Check this part again'){
    const f=feedbackBox();
    if(!f)return;
    f.innerHTML='<section class="eg-northstar-teaching" data-mode="teach-retry"><header><span>Learning Companion</span><strong>'+esc(title)+'</strong></header><div class="eg-northstar-teaching-block"><small>What to fix</small><p>'+esc(message||'Check the task and try again.')+'</p></div><div class="eg-northstar-teaching-next"><strong>Now you try</strong><p>Edit your answer, then press <b>Check again</b>.</p></div></section>';
    f.scrollIntoView({behavior:'smooth',block:'nearest'})
  }
  function showUnavailable(message){
    const f=feedbackBox();
    if(!f)return;
    f.innerHTML='<section class="eg-northstar-status is-error" aria-live="polite"><strong>Your answer has not been graded.</strong><p>'+esc(message||'Response checking is temporarily unavailable. Your answer is still here; please try again.')+'</p></section>'
  }
  function block(label,text,className=''){
    const value=String(text||'').trim();
    if(!value)return '';
    return '<div class="eg-northstar-teaching-block '+className+'"><small>'+esc(label)+'</small><p>'+esc(value)+'</p></div>'
  }
  function showTeaching(result,response){
    const f=feedbackBox();
    if(!f)return;
    const t=result?.teaching||{};
    const diagnostic=t.mode==='diagnostic_probe';
    const corrected=String(t.suggestedCorrection||'').trim();
    const example=String(t.example||'').trim();
    const learner=String(t.learnerResponse||response||'').trim();
    const title=t.title||(diagnostic?'Let’s check one thing.':'Fix this, then try again.');
    let html='<section class="eg-northstar-teaching" data-mode="'+(diagnostic?'diagnostic-probe':'teach-retry')+'" aria-live="polite">';
    html+='<header><span>Learning Companion</span><strong>'+esc(title)+'</strong></header>';
    html+=block('Your sentence',learner,'is-answer');
    if(corrected)html+=block('Correction',corrected,'is-correction');
    html+=block(diagnostic?'What to check':'What to fix',t.whatToFix||result?.feedback,'is-focus');
    html+=block('Remember',t.remember,'is-rule');
    if(example&&example!==corrected)html+=block('Lesson model',example,'is-model');
    html+='<div class="eg-northstar-teaching-next"><strong>'+(diagnostic?'Check it yourself':'Now you try')+'</strong><p>'+esc(t.nextStep||'Edit only the problem part, then check your sentence again.')+'</p></div>';
    html+='</section>';
    f.innerHTML=html;
    f.scrollIntoView({behavior:'smooth',block:'nearest'})
  }
  function targetVocabulary(l){
    const raw=Array.isArray(l?.targetVocabulary)?l.targetVocabulary:Array.isArray(l?.vocabulary)?l.vocabulary:[];
    return raw.map(x=>typeof x==='string'?x:(x?.word||x?.term||'')).filter(Boolean).slice(0,24)
  }
  function targetLanguage(l){return String(l?.northstar?.fix?.target||l?.grammarFocus||l?.grammarRule||'').trim()}
  async function postJson(url,body){
    const r=await fetch(url,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    let data={};try{data=await r.json()}catch{}
    if(!r.ok)throw new Error(data?.error||('Grading request failed ('+r.status+').'));
    return data
  }
  function approveAndContinue(button){
    button.dataset.semanticApproved='1';
    button.disabled=false;
    button.click()
  }
  async function gradeFinal(button,flow,l,response){
    const final=l?.northstar?.final||l?.writing||{};
    const min=Number(final.minWords||l?.writing?.minWords||50),max=Number(final.maxWords||l?.writing?.maxWords||100);
    const task=String(final.task||l?.writing?.task||promptText(flow)||'Complete the final writing task.');
    const grade=await postJson('/api/writing-grade-v2',{lessonId:l.id,task,text:response,level:'B2',minWords:min,maxWords:max});
    if(grade?.pass!==true){
      const weak=Object.values(grade?.dimensions||{}).sort((a,b)=>(Number(a?.score)||0)-(Number(b?.score)||0))[0];
      const detail=grade?.feedback?.improve||weak?.descriptor||'Revise the response using the B2 writing rubric, then check it again.';
      showSimpleRevision((grade?.score!=null?'Writing score: '+grade.score+'%. ':'')+detail,'Improve your final response');
      return false
    }
    approveAndContinue(button);return true
  }
  async function gradeShort(button,flow,l,response,phase){
    const result=await postJson('/api/northstar-response-grade',{
      lessonId:l.id,
      lessonTitle:l.title,
      phase:phase.toUpperCase(),
      prompt:promptText(flow),
      model:modelText(flow),
      targetLanguage:targetLanguage(l),
      targetVocabulary:targetVocabulary(l),
      response
    });
    if(result?.pass!==true){showTeaching(result,response);return false}
    approveAndContinue(button);return true
  }

  document.addEventListener('click',async event=>{
    const button=event.target?.closest?.('#northstarCheck');
    if(!button)return;
    if(button.dataset.semanticApproved==='1'){delete button.dataset.semanticApproved;return}
    const flow=button.closest('.b2-northstar-flow');
    if(!flow)return;
    const phase=String(flow.dataset.phase||'').toLowerCase();
    const finalMode=phase==='use'&&Boolean(document.getElementById('northstarCounter'));
    if(!finalMode&&!['change','use'].includes(phase))return;

    event.preventDefault();
    event.stopImmediatePropagation();
    const box=flow.querySelector('#northstarInput,textarea');
    const response=String(box?.value||'').trim();
    const l=currentLesson();
    if(!l||!/^su-b2-l\d+$/.test(String(l.id||''))){showUnavailable('This B2 lesson could not be identified for checking.');return}
    if(!response){showSimpleRevision('Write your answer before checking it.','Write your answer first');return}

    const previousLabel=button.textContent;
    let outcome=null;
    button.disabled=true;button.textContent='Checking…';showChecking();
    try{
      outcome=finalMode?await gradeFinal(button,flow,l,response):await gradeShort(button,flow,l,response,phase)
    }catch(error){outcome=false;showUnavailable(error?.message)}
    finally{
      if(button.isConnected&&button.dataset.semanticApproved!=='1'){
        button.disabled=false;
        button.textContent=outcome===false?'Check again':previousLabel
      }
    }
  },true);

  window.ENGLISHGATE_NORTHSTAR_SEMANTIC_GRADING={version:'englishgate-northstar-teaching-v2'};
})();
