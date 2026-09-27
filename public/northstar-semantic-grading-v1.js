(()=>{
  'use strict';

  if(!document.querySelector('link[data-northstar-teaching-style]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='northstar-teaching-v1.css?v=4';
    link.dataset.northstarTeachingStyle='1';
    document.head.appendChild(link);
  }

  const repairState=new WeakMap();

  function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
  function currentLesson(){
    try{if(typeof lesson==='function'){const l=lesson();if(l)return l}}catch{}
    try{if(typeof activeLessonId!=='undefined'&&Array.isArray(window.SPEAKUP_B2_BLUEPRINT)){const l=window.SPEAKUP_B2_BLUEPRINT.find(x=>x.id===activeLessonId);if(l)return l}}catch{}
    const title=document.querySelector('.b2-northstar-flow .micro-title strong')?.textContent?.trim();
    if(title&&Array.isArray(window.SPEAKUP_B2_BLUEPRINT))return window.SPEAKUP_B2_BLUEPRINT.find(x=>String(x.title||'').trim()===title)||null;
    return null
  }
  function promptText(flow){return flow.querySelector('.micro-prompt h1,.micro-prompt h2,.micro-prompt strong')?.textContent?.trim()||''}
  function modelText(flow){return flow.querySelector('.northstar-model')?.textContent?.replace(/^MODEL\s*/i,'').trim()||''}
  function feedbackBox(){return document.getElementById('northstarFeedback')}
  function targetVocabulary(l){
    const raw=Array.isArray(l?.targetVocabulary)?l.targetVocabulary:Array.isArray(l?.vocabulary)?l.vocabulary:[];
    return raw.map(x=>typeof x==='string'?x:(x?.word||x?.term||'')).filter(Boolean).slice(0,24)
  }
  function targetLanguage(l){return String(l?.northstar?.fix?.target||l?.grammarFocus||l?.grammarRule||'').trim()}
  function stateKey(flow,l,phase){return `${l?.id||''}|${phase||''}|${promptText(flow)}`}
  function stateFor(flow,l,phase){
    const key=stateKey(flow,l,phase);
    let state=repairState.get(flow);
    if(!state||state.key!==key){state={key,failures:0,answer:'',source:''};repairState.set(flow,state)}
    return state
  }
  function resetState(flow){repairState.delete(flow)}
  function replaceOnce(text,from,to){
    const source=String(text||''),needle=String(from||'');
    if(!needle)return String(to||source);
    const i=source.indexOf(needle);
    return i<0?String(to||source):source.slice(0,i)+String(to||'')+source.slice(i+needle.length)
  }

  async function postJson(url,body){
    const r=await fetch(url,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    let data={};try{data=await r.json()}catch{}
    if(!r.ok)throw new Error(data?.error||('Grading request failed ('+r.status+').'));
    return data
  }
  async function correctionFor({mode,l,task,response,model='',target='',gradingContext={}}){
    const result=await postJson('/api/correction-model-v3',{
      mode,lessonId:l.id,task,response,model,targetLanguage:target,
      targetVocabulary:targetVocabulary(l),gradingContext
    });
    if(!result?.correction)throw new Error('No teachable correction was returned.');
    return result.correction
  }

  function showChecking(){
    const f=feedbackBox();if(!f)return;
    f.innerHTML='<div class="eg-checking"><strong>Checking…</strong><span>Looking for the smallest useful correction.</span></div>'
  }
  function showUnavailable(message){
    const f=feedbackBox();if(!f)return;
    f.innerHTML='<div class="eg-correction-unavailable"><strong>Could not check this answer.</strong><span>'+esc(message||'Please try again.')+'</span></div>'
  }
  function showFallback(message){
    const f=feedbackBox();if(!f)return;
    f.innerHTML='<section class="eg-simple-correction"><div class="eg-wrong-card"><span class="eg-x">×</span><div><strong>Not quite</strong><p>'+esc(message||'Check one part and try again.')+'</p></div></div><button type="button" class="eg-try-btn" data-eg-repair>TRY AGAIN</button></section>';
    wireSimpleCard(f)
  }
  function wireSimpleCard(root){
    const explain=root.querySelector('[data-eg-explain]');
    const details=root.querySelector('[data-eg-details]');
    if(explain&&details)explain.onclick=()=>{
      const hidden=details.hasAttribute('hidden');
      if(hidden)details.removeAttribute('hidden');else details.setAttribute('hidden','');
      explain.textContent=hidden?'HIDE EXPLANATION':'EXPLAIN MY MISTAKE'
    };
    const retry=root.querySelector('[data-eg-repair]');
    if(retry)retry.onclick=()=>{
      root.innerHTML='';
      const box=document.querySelector('.b2-northstar-flow #northstarInput,.b2-northstar-flow textarea');
      if(box){box.disabled=false;box.focus();try{box.setSelectionRange(box.value.length,box.value.length)}catch{}}
      const check=document.getElementById('northstarCheck');
      if(check){check.disabled=false;check.textContent='Check again'}
    }
  }
  function showCorrection(correction,response){
    const f=feedbackBox();if(!f)return {answer:'',source:''};
    const c=correction||{},d=c.dictionary||{},contrast=c.contrast||{};
    const corrected=String(c.suggestedCorrection||'').trim();
    const focus=String(c.focusDifference||'').trim();
    const term=String(d.term||'').trim();
    const label=String(d.label||'').trim();
    const definition=String(d.definition||'').trim();
    const rule=String(c.rule||'').trim();
    const from=String(contrast.from||'').trim(),to=String(contrast.to||'').trim();
    const source=String(c.sourceSentence||response||'').trim();
    const answerLine=corrected||source;
    const dictionaryLine=[label,definition].filter(Boolean).join(' — ');
    const contrastHtml=(from||to)?`<div class="eg-contrast">${from?`<div><span class="eg-mini-x">×</span><p>${esc(from)}</p></div>`:''}${to?`<div class="is-good"><span class="eg-mini-check">✓</span><p>${esc(to)}</p></div>`:''}</div>`:'';
    f.innerHTML=`<section class="eg-simple-correction" data-correction-model="simple-v2" aria-live="polite">
      <div class="eg-wrong-card">
        <span class="eg-x">×</span>
        <div><strong>Not quite</strong><small>Correct answer:</small><p>${esc(answerLine)}</p></div>
      </div>
      <button type="button" class="eg-explain-btn" data-eg-explain>EXPLAIN MY MISTAKE</button>
      <div class="eg-explanation-card" data-eg-details hidden>
        ${term?`<div class="eg-word-head"><strong>${esc(term)}</strong>${dictionaryLine?`<span>${esc(dictionaryLine)}</span>`:''}</div>`:''}
        ${focus?`<p class="eg-focus-line"><strong>${esc(focus)}</strong></p>`:''}
        ${rule?`<p class="eg-rule-line">${esc(rule)}</p>`:''}
        ${contrastHtml}
      </div>
      <button type="button" class="eg-try-btn" data-eg-repair>TRY AGAIN</button>
    </section>`;
    wireSimpleCard(f);
    f.scrollIntoView({behavior:'smooth',block:'nearest'});
    return {answer:corrected||to||'',source}
  }
  function showFinalAnswer(flow,button,box,state,fallbackAnswer=''){
    const f=feedbackBox();if(!f)return;
    const answer=String(state?.answer||fallbackAnswer||'').trim();
    if(!answer){showUnavailable('The correct answer could not be determined safely.');return}
    f.innerHTML=`<section class="eg-simple-correction eg-final-answer" aria-live="polite">
      <div class="eg-answer-card">
        <span class="eg-check">✓</span>
        <div><strong>Correct answer</strong><p>${esc(answer)}</p></div>
      </div>
      <p class="eg-answer-note">You already had one correction and one retry. We will not add another correction for the same error.</p>
      <button type="button" class="eg-try-btn" data-eg-use-answer>USE CORRECT ANSWER</button>
    </section>`;
    const use=f.querySelector('[data-eg-use-answer]');
    if(use)use.onclick=()=>{
      const current=String(box?.value||'');
      const next=state?.source&&current.includes(state.source)?replaceOnce(current,state.source,answer):answer;
      if(box){box.value=next;box.disabled=false;box.dispatchEvent(new Event('input',{bubbles:true}));box.dispatchEvent(new Event('change',{bubbles:true}))}
      flow.dataset.egAnswerSupplied='1';
      resetState(flow);
      f.innerHTML='';
      button.disabled=false;button.textContent='Checking…';
      button.click()
    };
    f.scrollIntoView({behavior:'smooth',block:'nearest'})
  }

  function approveAndContinue(button,flow){
    if(flow)resetState(flow);
    button.dataset.semanticApproved='1';button.disabled=false;button.click()
  }
  async function gradeFinal(button,flow,l,response,phase){
    const state=stateFor(flow,l,phase);
    const final=l?.northstar?.final||l?.writing||{};
    const min=Number(final.minWords||l?.writing?.minWords||50),max=Number(final.maxWords||l?.writing?.maxWords||100);
    const task=String(final.task||l?.writing?.task||promptText(flow)||'Complete the final writing task.');
    const grade=await postJson('/api/writing-grade-v2',{lessonId:l.id,task,text:response,level:'B2',minWords:min,maxWords:max});
    if(grade?.pass!==true){
      if(state.failures>=1){showFinalAnswer(flow,button,flow.querySelector('#northstarInput,textarea'),state,modelText(flow));return false}
      try{
        const correction=await correctionFor({mode:'paragraph',l,task,response,model:modelText(flow),target:targetLanguage(l),gradingContext:{dimensions:grade?.dimensions||{}}});
        const shown=showCorrection(correction,response);
        state.failures=1;state.answer=shown.answer||modelText(flow);state.source=shown.source||response
      }catch(_){
        const weak=Object.values(grade?.dimensions||{}).sort((a,b)=>(Number(a?.score)||0)-(Number(b?.score)||0))[0];
        showFallback(grade?.feedback?.improve||weak?.descriptor||'Improve one part of your response, then check again.');state.failures=1
      }
      return false
    }
    approveAndContinue(button,flow);return true
  }
  async function gradeShort(button,flow,l,response,phase){
    const state=stateFor(flow,l,phase);
    const task=promptText(flow),model=modelText(flow),target=targetLanguage(l);
    const result=await postJson('/api/northstar-response-grade',{
      lessonId:l.id,lessonTitle:l.title,phase:phase.toUpperCase(),prompt:task,model,
      targetLanguage:target,targetVocabulary:targetVocabulary(l),response
    });
    if(result?.pass!==true){
      if(state.failures>=1){showFinalAnswer(flow,button,flow.querySelector('#northstarInput,textarea'),state,model);return false}
      try{
        const correction=await correctionFor({mode:'short',l,task,response,model,target,gradingContext:{decisions:result?.decisions||{}}});
        const shown=showCorrection(correction,response);
        state.failures=1;state.answer=shown.answer||model;state.source=shown.source||response
      }catch(_){showFallback(result?.feedback||'Check one part of your answer, then try again.');state.failures=1;state.answer=model;state.source=response}
      return false
    }
    approveAndContinue(button,flow);return true
  }

  document.addEventListener('click',async event=>{
    const button=event.target?.closest?.('#northstarCheck');
    if(!button)return;
    if(button.dataset.semanticApproved==='1'){delete button.dataset.semanticApproved;return}
    const flow=button.closest('.b2-northstar-flow');if(!flow)return;
    const phase=String(flow.dataset.phase||'').toLowerCase();
    const finalMode=phase==='use'&&Boolean(document.getElementById('northstarCounter'));
    if(!finalMode&&!['change','use'].includes(phase))return;

    const l=currentLesson();
    if(finalMode&&(l?.writing?.humanGraded===true||l?.writing?.noAutomatedCorrection===true||l?.northstar?.final?.humanGraded===true||l?.northstar?.final?.noAutomatedCorrection===true))return;

    event.preventDefault();event.stopImmediatePropagation();
    const box=flow.querySelector('#northstarInput,textarea');
    const response=String(box?.value||'').trim();
    if(!l||!/^su-b2-l\d+$/.test(String(l.id||''))){showUnavailable('This B2 lesson could not be identified for checking.');return}
    if(!response){showFallback('Write your answer first.');return}

    const previousLabel=button.textContent;let outcome=null;
    button.disabled=true;button.textContent='Checking…';showChecking();
    try{outcome=finalMode?await gradeFinal(button,flow,l,response,phase):await gradeShort(button,flow,l,response,phase)}
    catch(error){outcome=false;showUnavailable(error?.message)}
    finally{
      if(button.isConnected&&button.dataset.semanticApproved!=='1'){
        button.disabled=false;button.textContent=outcome===false?'Check again':previousLabel
      }
    }
  },true);

  window.ENGLISHGATE_NORTHSTAR_SEMANTIC_GRADING={version:'englishgate-simple-correction-v2',retryPolicy:'one-correction-one-retry-then-answer'};
})();
