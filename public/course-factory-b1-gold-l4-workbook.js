(function(){
'use strict';

const STAGES=[
  ['vocabulary','Vocabulary'],
  ['practice','Help Me Practice'],
  ['reading','Reading'],
  ['listening','Listening'],
  ['grammar','Grammar'],
  ['writing','Writing']
];
const SCORED=['vocabulary','reading','listening','grammar'];
let lesson=null;
let current='vocabulary';
const state={scores:{vocabulary:0,reading:0,listening:0,grammar:0},completed:{},answers:{},selfMarks:{},listeningAttempts:0,practiceSaved:false};
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[ch]));
const norm=v=>String(v||'').trim().toLowerCase().replace(/[.!?]/g,'');
const wc=v=>String(v||'').trim().split(/\s+/).filter(Boolean).length;
const cap=s=>String(s).charAt(0).toUpperCase()+String(s).slice(1);

function mastery(){if(!SCORED.every(k=>state.completed[k]))return 0;return SCORED.reduce((sum,k)=>sum+Number(state.scores[k]||0),0)/SCORED.length}
function weakest(){return SCORED.slice().sort((a,b)=>(state.scores[a]||0)-(state.scores[b]||0))[0]}
function writingUnlocked(){return SCORED.every(k=>state.completed[k])&&mastery()>=Number(lesson?.mastery?.threshold||0.8)}
function nav(){
  $('workbookNav').innerHTML=STAGES.map(([key,label],i)=>`<button type="button" data-stage="${key}" class="${current===key?'active ':''}${state.completed[key]?'done':''}"><span class="cf-step">${state.completed[key]?'✓':i+1}</span><span>${esc(label)}</span></button>`).join('');
  $('workbookNav').querySelectorAll('[data-stage]').forEach(btn=>btn.onclick=()=>go(btn.dataset.stage));
}
function go(stage){current=stage;render();window.scrollTo({top:0,behavior:'smooth'})}
function header(kicker,title,lead=''){return `<span class="cf-kicker">${esc(kicker)}</span><h1>${esc(title)}</h1>${lead?`<p class="cf-lead">${esc(lead)}</p>`:''}`}
function next(stage){return `<div class="cf-actions"><button class="cf-btn" data-next="${stage}">Continue</button></div>`}
function bindNext(){document.querySelectorAll('[data-next]').forEach(btn=>btn.onclick=()=>go(btn.dataset.next))}

function updateSidebar(){
  const complete=SCORED.every(k=>state.completed[k]);
  const score=mastery();
  $('masteryTitle').textContent=complete?Math.round(score*100)+'%':'In progress';
  $('masteryBar').style.width=(complete?score*100:SCORED.filter(k=>state.completed[k]).length*12)+'%';
  $('scoreRows').innerHTML=SCORED.map(k=>`<div class="cf-score-row"><span>${esc(cap(k))}</span><strong>${state.completed[k]?Math.round(state.scores[k]*100)+'%':'—'}</strong></div>`).join('');
  if(!complete){
    $('masteryMessage').textContent='Complete Vocabulary, Reading, Listening and Grammar before the mastery decision.';
    $('boostCard').innerHTML='<span class="cf-kicker">Adaptive route</span><p style="margin-bottom:0;color:#64748b">No Boost yet. Finish the four scored areas first.</p>';
  }else if(score>=lesson.mastery.threshold){
    $('masteryMessage').textContent='Mastery reached. Writing is unlocked.';
    $('boostCard').innerHTML='<span class="cf-kicker">Adaptive route</span><div class="cf-feedback good">80%+ reached. No unnecessary Boost opens.</div>';
  }else{
    const area=weakest();
    $('masteryMessage').textContent='Below 80%. Only the weakest-area Boost opens.';
    $('boostCard').innerHTML=`<span class="cf-kicker">${esc(cap(area))} Boost</span><p>Review only this weak area, then recheck with new evidence.</p><button class="cf-btn secondary" data-boost="${esc(area)}">Review ${esc(cap(area))}</button>`;
    $('boostCard').querySelector('[data-boost]').onclick=()=>go(area);
  }
  nav();
}

function mcq(group,id,q,options,answer){return `<div class="cf-question" data-qgroup="${group}" data-qid="${esc(id)}" data-answer="${esc(answer)}"><label>${esc(q)}</label><div class="cf-options">${options.map(o=>`<button type="button" class="cf-option" data-value="${esc(o)}">${esc(o)}</button>`).join('')}</div></div>`}
function short(group,item){return `<div class="cf-question" data-shortgroup="${group}" data-qid="${esc(item.id)}"><label>${esc(item.question)}</label><input type="text" placeholder="Write a short answer"><div class="cf-actions"><button type="button" class="cf-btn secondary" data-selfcheck>Check model</button></div><div data-model class="cf-feedback info" style="display:none">Model answer: ${esc(item.answer)}</div><div data-selfmark class="cf-actions" style="display:none"><button type="button" class="cf-btn secondary" data-mark="yes">My answer matches</button><button type="button" class="cf-btn ghost" data-mark="no">I need practice</button></div></div>`}
function bindMcq(group){document.querySelectorAll(`[data-qgroup="${group}"] .cf-option`).forEach(btn=>btn.onclick=()=>{const box=btn.closest('[data-qgroup]');box.querySelectorAll('.cf-option').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');state.answers[`${group}:${box.dataset.qid}`]=btn.dataset.value})}
function bindShort(group){document.querySelectorAll(`[data-shortgroup="${group}"]`).forEach(box=>{box.querySelector('[data-selfcheck]').onclick=()=>{box.querySelector('[data-model]').style.display='block';box.querySelector('[data-selfmark]').style.display='flex'};box.querySelectorAll('[data-mark]').forEach(btn=>btn.onclick=()=>{state.selfMarks[`${group}:${box.dataset.qid}`]=btn.dataset.mark==='yes';box.querySelectorAll('[data-mark]').forEach(x=>x.disabled=true)})})}
function gradeGroup(stage,group,questions,feedbackId){
  let correct=0,total=0;
  questions.forEach(q=>{
    total++;
    if(Array.isArray(q.options)){
      const chosen=state.answers[`${group}:${q.id}`];
      if(norm(chosen)===norm(q.answer))correct++;
      const box=document.querySelector(`[data-qgroup="${group}"][data-qid="${q.id}"]`);
      if(box)box.querySelectorAll('.cf-option').forEach(btn=>{btn.classList.remove('correct','wrong');if(norm(btn.dataset.value)===norm(q.answer))btn.classList.add('correct');else if(norm(btn.dataset.value)===norm(chosen))btn.classList.add('wrong')});
    }else if(state.selfMarks[`${group}:${q.id}`]===true) correct++;
  });
  state.scores[stage]=total?correct/total:0;state.completed[stage]=true;
  $(feedbackId).innerHTML=`<div class="cf-feedback ${state.scores[stage]>=.8?'good':'bad'}">${correct}/${total} evidence checks met · ${Math.round(state.scores[stage]*100)}%</div>`;
  updateSidebar();
}

function renderVocabulary(){
  const s=lesson.stages.vocabulary;
  const core=s.items.filter(x=>!x.stretch);
  const choices=core.map(x=>x.word);
  $('workbookMain').innerHTML=header('Workbook 1','Vocabulary practice','Recognition first, then personal use. Stretch vocabulary does not count toward mastery.')+
  `<div class="cf-grid">${core.map(x=>`<article class="cf-vocab"><strong>${esc(x.word)}</strong><p>${esc(x.meaning)}</p><p><em>${esc(x.example)}</em></p></article>`).join('')}</div>`+
  `<h2>Quick check</h2>${core.map((x,i)=>{const opts=[x.word,choices[(i+1)%choices.length],choices[(i+3)%choices.length]];const shift=i%3;const first=opts.shift();opts.splice(shift,0,first);return mcq('vocabulary',`v${i}`,`Which word means “${x.meaning}”?`,opts,x.word)}).join('')}`+
  `<div class="cf-actions"><button class="cf-btn" id="checkVocabulary">Check vocabulary</button></div><div id="vocabularyFeedback"></div>`+
  `<div class="cf-card cf-soft"><span class="cf-kicker">Use the words</span>${s.productionPrompts.map(x=>`<p>• ${esc(x)}</p>`).join('')}</div>${next('practice')}`;
  bindMcq('vocabulary');bindNext();
  $('checkVocabulary').onclick=()=>gradeGroup('vocabulary','vocabulary',core.map((x,i)=>({id:`v${i}`,options:['x'],answer:x.word})),'vocabularyFeedback');
}
function renderPractice(){
  const p=lesson.helpMePractice;
  $('workbookMain').innerHTML=header('Workbook 2','Help Me Practice','Independent speaking practice tied to this exact lesson.')+
  `<div class="cf-card"><span class="cf-kicker">Opening question</span><h2>${esc(p.openingQuestion)}</h2><textarea id="practiceDraft" rows="7" placeholder="Type what you would say in the voice session…"></textarea><div class="cf-wordcount" id="practiceCount">0 words</div></div>`+
  `<div class="cf-card cf-soft"><span class="cf-kicker">AI boundary</span><p>${esc(p.b1Boundary||p.interventionPolicy)}</p><p style="margin-bottom:0"><strong>The AI should stay on personal habits, practical benefits/problems, reasons, examples and realistic suggestions.</strong></p></div>`+
  `<div class="cf-actions"><button class="cf-btn" id="savePractice">Save practice evidence</button></div><div id="practiceFeedback"></div>${next('reading')}`;
  bindNext();const input=$('practiceDraft');input.oninput=()=>{$('practiceCount').textContent=wc(input.value)+' words'};
  $('savePractice').onclick=()=>{state.practiceSaved=wc(input.value)>=15;state.completed.practice=state.practiceSaved;$('practiceFeedback').innerHTML=state.practiceSaved?'<div class="cf-feedback good">Practice evidence saved. Production uses the hands-free voice engine.</div>':'<div class="cf-feedback bad">Give a fuller answer before saving.</div>';nav()};
}
function renderReading(){
  const s=lesson.stages.reading;
  $('workbookMain').innerHTML=header('Workbook 3','Reading',s.title)+`<div class="cf-passage">${esc(s.text).replace(/\n\n/g,'</p><p>')}</div><h2>Check your understanding</h2>${s.questions.map(q=>Array.isArray(q.options)?mcq('reading',q.id,q.question,q.options,q.answer):short('reading',q)).join('')}<div class="cf-actions"><button class="cf-btn" id="checkReading">Check reading</button></div><div id="readingFeedback"></div>${next('listening')}`;
  bindMcq('reading');bindShort('reading');bindNext();$('checkReading').onclick=()=>gradeGroup('reading','reading',s.questions,'readingFeedback');
}
function play(text,rate){if(!('speechSynthesis' in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=rate;window.speechSynthesis.speak(u)}
function renderListening(){
  const s=lesson.stages.listening;
  const unlocked=state.listeningAttempts>=Number(s.transcriptUnlockAttempt||2);
  $('workbookMain').innerHTML=header('Workbook 4','Listening',`${s.title} · about ${s.targetSeconds} seconds`)+
  `<div class="cf-card"><strong>Listen before reading.</strong><div class="cf-actions"><button class="cf-btn" id="playListening">▶ Play</button><button class="cf-btn secondary" id="playSlow">Play slower</button></div><p style="margin-bottom:0">Transcript unlocks after checked attempt ${s.transcriptUnlockAttempt}.</p></div>`+
  `${s.questions.map(q=>Array.isArray(q.options)?mcq('listening',q.id,q.question,q.options,q.answer):short('listening',q)).join('')}`+
  `<div class="cf-actions"><button class="cf-btn" id="checkListening">Check attempt</button></div><div id="listeningFeedback"></div>`+
  `<div class="cf-card ${unlocked?'':'cf-soft'}"><span class="cf-kicker">Transcript</span>${unlocked?`<p>${esc(s.audioScript)}</p>`:`<p>Locked. Complete another checked listening attempt.</p>`}</div>${next('grammar')}`;
  bindMcq('listening');bindShort('listening');bindNext();$('playListening').onclick=()=>play(s.audioScript,.92);$('playSlow').onclick=()=>play(s.audioScript,.78);
  $('checkListening').onclick=()=>{state.listeningAttempts++;gradeGroup('listening','listening',s.questions,'listeningFeedback');renderListening();updateSidebar()};
}
function renderGrammar(){
  const s=lesson.stages.grammar;
  const scored=s.items.filter(q=>Array.isArray(q.options));
  const open=s.items.filter(q=>!Array.isArray(q.options));
  $('workbookMain').innerHTML=header('Workbook 5','Grammar practice',s.focus)+`<div class="cf-card cf-soft">${s.microBrief.map(x=>`<p>• ${esc(x)}</p>`).join('')}</div>`+
  `${scored.map(q=>mcq('grammar',q.id,q.prompt,q.options,q.answer)).join('')}`+
  `<div class="cf-actions"><button class="cf-btn" id="checkGrammar">Check grammar</button></div><div id="grammarFeedback"></div>`+
  `${open.map(q=>`<div class="cf-card"><span class="cf-kicker">Formative transfer · not scored</span><p><strong>${esc(q.prompt)}</strong></p><textarea rows="4" placeholder="Write your own sentence…"></textarea><p>Model guidance: ${esc(q.answerGuide||'')}</p></div>`).join('')}${next('writing')}`;
  bindMcq('grammar');bindNext();$('checkGrammar').onclick=()=>gradeGroup('grammar','grammar',scored,'grammarFeedback');
}
function renderWriting(){
  const s=lesson.stages.writing;
  if(!writingUnlocked()){
    const done=SCORED.every(k=>state.completed[k]);
    $('workbookMain').innerHTML=header('Workbook 6','Writing','Writing unlocks only after the four scored areas reach 80% mastery.')+`<div class="cf-card cf-soft"><h2>${done?Math.round(mastery()*100)+'% mastery':'Scored practice incomplete'}</h2><p>${done?'Complete the weakest-area Boost and recheck before writing.':'Finish Vocabulary, Reading, Listening and Grammar first.'}</p></div>`;
    return;
  }
  $('workbookMain').innerHTML=header('Workbook 6','Writing',`${s.realLifeFormat} · ${s.wordRange[0]}–${s.wordRange[1]} words`)+`<div class="cf-card"><h2>${esc(s.prompt)}</h2><textarea id="writingDraft" rows="12" placeholder="Write here…"></textarea><div class="cf-wordcount" id="writingCount">0 words</div></div><div class="cf-card cf-soft"><span class="cf-kicker">Success criteria</span>${s.successCriteria.map(x=>`<p>• ${esc(x)}</p>`).join('')}</div><div class="cf-actions"><button class="cf-btn" id="saveWriting">Save submission</button></div><div id="writingFeedback"></div>`;
  const input=$('writingDraft');input.oninput=()=>{$('writingCount').textContent=wc(input.value)+' words'};$('saveWriting').onclick=()=>{const count=wc(input.value);state.completed.writing=count>=s.wordRange[0]&&count<=s.wordRange[1];$('writingFeedback').innerHTML=state.completed.writing?'<div class="cf-feedback good">Writing submission saved as Workbook evidence.</div>':`<div class="cf-feedback bad">Keep the response within ${s.wordRange[0]}–${s.wordRange[1]} words.</div>`;nav()};
}
function render(){nav();updateSidebar();({vocabulary:renderVocabulary,practice:renderPractice,reading:renderReading,listening:renderListening,grammar:renderGrammar,writing:renderWriting}[current]||renderVocabulary)()}

fetch('/__course-factory/b1-gold-l4/preview-data',{cache:'no-store'})
  .then(r=>{if(!r.ok)throw new Error('Workbook preview is available only on a Vercel preview deployment.');return r.json()})
  .then(data=>{lesson=data.lesson;render()})
  .catch(err=>{$('workbookMain').innerHTML=`<div class="cf-feedback bad">${esc(err.message)}</div>`});
})();