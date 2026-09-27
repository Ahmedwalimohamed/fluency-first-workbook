(()=>{
  'use strict';

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
  function showChecking(){const f=feedbackBox();if(f)f.innerHTML='<div class="micro-feedback is-hint"><strong>Checking your English…</strong><span>Your answer must match the task and the lesson language, not only the word count.</span></div>'}
  function showRevision(message){const f=feedbackBox();if(f)f.innerHTML='<div class="micro-feedback is-incorrect"><strong>Revise this answer</strong><span>'+esc(message||'Check the task and try again.')+'</span></div>'}
  function showUnavailable(message){const f=feedbackBox();if(f)f.innerHTML='<div class="micro-feedback is-incorrect"><strong>Your answer was not graded.</strong><span>'+esc(message||'AI grading is temporarily unavailable. Please try again.')+'</span></div>'}
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
      showRevision((grade?.score!=null?'Writing score: '+grade.score+'%. ':'')+detail);
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
    if(result?.pass!==true){showRevision(result?.feedback||'Check the task and language, then try again.');return false}
    approveAndContinue(button);return true
  }

  document.addEventListener('click',async event=>{
    const button=event.target?.closest?.('#northstarCheck');
    if(!button)return;
    if(button.dataset.semanticApproved==='1'){delete button.dataset.semanticApproved;return}
    const flow=button.closest('.b2-northstar-flow');
    if(!flow)return;
    const phase=String(flow.dataset.phase||'').toLowerCase();
    const finalMode=Boolean(document.getElementById('northstarCounter'));
    if(!finalMode&&!['change','use'].includes(phase))return;

    event.preventDefault();
    event.stopImmediatePropagation();
    const box=flow.querySelector('#northstarInput,textarea');
    const response=String(box?.value||'').trim();
    const l=currentLesson();
    if(!l||!/^su-b2-l\d+$/.test(String(l.id||''))){showUnavailable('This B2 lesson could not be identified for grading.');return}
    if(!response){showRevision('Write your answer before checking it.');return}

    const previousLabel=button.textContent;
    button.disabled=true;button.textContent='Checking…';showChecking();
    try{
      if(finalMode)await gradeFinal(button,flow,l,response);
      else await gradeShort(button,flow,l,response,phase)
    }catch(error){showUnavailable(error?.message)}
    finally{
      if(button.isConnected&&button.dataset.semanticApproved!=='1'){
        button.disabled=false;button.textContent=previousLabel
      }
    }
  },true);

  window.ENGLISHGATE_NORTHSTAR_SEMANTIC_GRADING={version:'englishgate-northstar-semantic-v1'};
})();
