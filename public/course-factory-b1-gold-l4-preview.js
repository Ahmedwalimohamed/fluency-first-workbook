(function(){
'use strict';

const STAGES=[
  ['hook','Start'],['vocabulary','Vocabulary'],['speaking','Speaking'],['reading','Reading'],
  ['listening','Listening'],['grammar','Grammar'],['writing','Writing'],['fluencyMission','Fluency Mission']
];
const SCORED=['vocabulary','reading','listening','grammar'];
let lesson=null;
let current='hook';
const state={
  scores:{vocabulary:0,reading:0,listening:0,grammar:0},
  completed:{},
  answers:{},
  selfMarks:{},
  listeningAttempts:0,
  speakingSaved:false,
  writingStarted:false
};

const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const norm=value=>String(value||'').trim().toLowerCase().replace(/[.!?]/g,'');
const wordCount=value=>String(value||'').trim().split(/\s+/).filter(Boolean).length;

function mastery(){
  if(!SCORED.every(k=>state.completed[k]))return 0;
  return SCORED.reduce((sum,k)=>sum+Number(state.scores[k]||0),0)/SCORED.length;
}
function weakest(){
  return SCORED.slice().sort((a,b)=>(state.scores[a]||0)-(state.scores[b]||0))[0];
}
function writingUnlocked(){return SCORED.every(k=>state.completed[k])&&mastery()>=Number(lesson?.mastery?.threshold||0.8)}

function updateSidebar(){
  const complete=SCORED.every(k=>state.completed[k]);
  const score=mastery();
  $('masteryTitle').textContent=complete?Math.round(score*100)+'%':'In progress';
  $('masteryBar').style.width=(complete?score*100:SCORED.filter(k=>state.completed[k]).length*12)+'%';
  $('scoreRows').innerHTML=SCORED.map(k=>`<div class="cf-score-row"><span>${esc(cap(k))}</span><strong>${state.completed[k]?Math.round(state.scores[k]*100)+'%':'—'}</strong></div>`).join('');
  if(!complete){
    $('masteryMessage').textContent='Complete Vocabulary, Reading, Listening and Grammar before the mastery decision.';
    $('boostCard').className='cf-side-card';
    $('boostCard').innerHTML='<span class="cf-kicker">Adaptive route</span><p style="margin-bottom:0;color:#64748b">No Boost yet. The weakest-area Boost appears only after scored evidence is complete.</p>';
  }else if(score>=lesson.mastery.threshold){
    $('masteryMessage').textContent='Mastery reached. Writing is unlocked.';
    $('boostCard').className='cf-side-card';
    $('boostCard').innerHTML='<span class="cf-kicker">Adaptive route</span><div class="cf-feedback good">80%+ reached. No unnecessary remediation opens.</div>';
  }else{
    const area=weakest();
    $('masteryMessage').textContent='Below 80%. Only the weakest-area Boost opens.';
    $('boostCard').className='cf-side-card cf-boost';
    $('boostCard').innerHTML=`<span class="cf-kicker">${esc(cap(area))} Boost</span><p>Focus only on your weakest area, then recheck with new evidence.</p><button class="cf-btn secondary" data-go="${esc(area)}">Review ${esc(cap(area))}</button>`;
    $('boostCard').querySelector('[data-go]').onclick=()=>go(area);
  }
  renderNav();
}

function renderNav(){
  $('previewNav').innerHTML=STAGES.map(([key,label],i)=>{
    const done=state.completed[key]||key==='hook'&&current!=='hook'||key==='speaking'&&state.speakingSaved||key==='writing'&&state.writingStarted;
    return `<button type="button" data-stage="${key}" class="${current===key?'active ':''}${done?'done':''}"><span class="cf-step">${done?'✓':i+1}</span><span>${esc(label)}</span></button>`;
  }).join('');
  $('previewNav').querySelectorAll('[data-stage]').forEach(btn=>btn.onclick=()=>go(btn.dataset.stage));
}
function go(stage){current=stage;render();window.scrollTo({top:0,behavior:'smooth'})}
function cap(s){return String(s).charAt(0).toUpperCase()+String(s).slice(1)}
function header(kicker,title,lead){return `<span class="cf-kicker">${esc(kicker)}</span><h2>${esc(title)}</h2><p class="cf-lead">${esc(lead||'')}</p>`}
function nextButton(next){return next?`<div class="cf-actions"><button class="cf-btn" data-next="${next}">Continue</button></div>`:''}
function bindNext(){document.querySelectorAll('[data-next]').forEach(b=>b.onclick=()=>go(b.dataset.next))}

function render(){
  renderNav();updateSidebarOnly();
  const f={hook:renderHook,vocabulary:renderVocabulary,speaking:renderSpeaking,reading:renderReading,listening:renderListening,grammar:renderGrammar,writing:renderWriting,fluencyMission:renderMission}[current];
  if(f)f();
}
function updateSidebarOnly(){
  const complete=SCORED.every(k=>state.completed[k]),score=mastery();
  $('masteryTitle').textContent=complete?Math.round(score*100)+'%':'In progress';
  $('masteryBar').style.width=(complete?score*100:SCORED.filter(k=>state.completed[k]).length*12)+'%';
  $('scoreRows').innerHTML=SCORED.map(k=>`<div class="cf-score-row"><span>${esc(cap(k))}</span><strong>${state.completed[k]?Math.round(state.scores[k]*100)+'%':'—'}</strong></div>`).join('');
}

function renderHook(){
  const s=lesson.stages.hook;
  $('previewMain').innerHTML=`<span class="cf-kicker">B1 · Lesson ${lesson.lessonNumber}</span><h1>${esc(lesson.title)}</h1><p class="cf-lead">${esc(lesson.canDo.join(' '))}</p><div class="cf-card cf-soft"><span class="cf-kicker">Start with your life</span><h3>${esc(s.prompt)}</h3><p>${esc(s.purpose)}</p></div><div class="cf-card"><strong>Today's language</strong><p>${esc(lesson.curriculum.grammar.focus)} · ${lesson.curriculum.vocabulary.core.map(x=>`<span class="cf-chip">${esc(x)}</span>`).join(' ')}</p></div>${nextButton('vocabulary')}`;
  bindNext();
}

function vocabChoices(item,index){
  const words=lesson.stages.vocabulary.items.filter(x=>!x.stretch).map(x=>x.word);
  const others=words.filter(x=>x!==item.word);
  const choice=[item.word,others[index%others.length],others[(index+2)%others.length]];
  const pos=index%3;
  const correct=choice.shift();choice.splice(pos,0,correct);return choice.slice(0,3);
}
function renderVocabulary(){
  const s=lesson.stages.vocabulary,core=s.items.filter(x=>!x.stretch),stretch=s.items.filter(x=>x.stretch);
  $('previewMain').innerHTML=header('Stage 1','Vocabulary','Understand the words in context, then use them for your own digital life.')+
  `<div class="cf-grid">${core.map(x=>`<article class="cf-vocab"><strong>${esc(x.word)}</strong><p>${esc(x.meaning)}</p><p><em>${esc(x.example)}</em></p></article>`).join('')}</div>`+
  (stretch.length?`<div class="cf-card cf-soft"><strong>Stretch word · optional</strong><p><b>${esc(stretch[0].word)}</b> — ${esc(stretch[0].meaning)}</p></div>`:'')+
  `<h3>Quick check</h3><div id="vocabQuiz">${core.map((x,i)=>mcqHtml('vocab',`v${i}`,`Which word means “${x.meaning}”?`,vocabChoices(x,i),x.word)).join('')}</div><div class="cf-actions"><button class="cf-btn" id="checkVocab">Check vocabulary</button></div><div id="vocabFeedback"></div><h3>Make it personal</h3><div class="cf-card cf-soft">${s.productionPrompts.map(p=>`<p>• ${esc(p)}</p>`).join('')}</div>${nextButton('speaking')}`;
  bindMcqClicks('vocab');bindNext();
  $('checkVocab').onclick=()=>gradeMcqStage('vocabulary',core.map((x,i)=>({id:`v${i}`,answer:x.word})),core.length,'vocabFeedback');
}

function renderSpeaking(){
  const s=lesson.stages.speaking;
  $('previewMain').innerHTML=header('Stage 2','Speaking',s.communicativeGoal)+`<div class="cf-card"><span class="cf-kicker">Help Me Practice · bounded preview</span><h3>${esc(s.openingPrompt)}</h3><p>This isolated content preview does not replace the live voice engine. Answer as you would speak; the purpose here is to test the lesson flow and prompt demand.</p><textarea id="speakingDraft" rows="7" placeholder="Type what you would say…"></textarea><div class="cf-wordcount" id="speakingCount">0 words</div></div><div class="cf-card cf-soft"><strong>Possible follow-ups</strong>${s.followUps.map(x=>`<p>• ${esc(x)}</p>`).join('')}</div><div class="cf-actions"><button class="cf-btn" id="saveSpeaking">Save speaking evidence</button></div><div id="speakingFeedback"></div>${nextButton('reading')}`;
  bindNext();const input=$('speakingDraft');input.oninput=()=>{$('speakingCount').textContent=wordCount(input.value)+' words'};
  $('saveSpeaking').onclick=()=>{const wc=wordCount(input.value);state.speakingSaved=wc>=12;state.completed.speaking=state.speakingSaved;$('speakingFeedback').innerHTML=state.speakingSaved?'<div class="cf-feedback good">Speaking evidence saved. In the live version this stage is voice-first and hands-free.</div>':'<div class="cf-feedback bad">Add a little more detail before saving.</div>';renderNav()};
}

function mcqHtml(group,id,q,options,answer){
  return `<div class="cf-question" data-qgroup="${group}" data-qid="${esc(id)}" data-answer="${esc(answer)}"><label>${esc(q)}</label><div class="cf-options">${options.map(o=>`<button type="button" class="cf-option" data-value="${esc(o)}">${esc(o)}</button>`).join('')}</div></div>`;
}
function shortHtml(group,item){
  return `<div class="cf-question" data-shortgroup="${group}" data-qid="${esc(item.id)}"><label>${esc(item.question)}</label><input type="text" placeholder="Write a short answer" /><div class="cf-actions"><button type="button" class="cf-btn secondary" data-selfcheck>Check against model</button></div><div data-model class="cf-feedback info" style="display:none">Model answer: ${esc(item.answer)}</div><div data-selfmark style="display:none" class="cf-actions"><button type="button" class="cf-btn secondary" data-mark="yes">My answer matches</button><button type="button" class="cf-btn ghost" data-mark="no">I need practice</button></div></div>`;
}
function bindMcqClicks(group){
  document.querySelectorAll(`[data-qgroup="${group}"] .cf-option`).forEach(btn=>btn.onclick=()=>{
    const box=btn.closest('[data-qgroup]');box.querySelectorAll('.cf-option').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');state.answers[`${group}:${box.dataset.qid}`]=btn.dataset.value;
  });
}
function bindSelfChecks(group){
  document.querySelectorAll(`[data-shortgroup="${group}"]`).forEach(box=>{
    box.querySelector('[data-selfcheck]').onclick=()=>{box.querySelector('[data-model]').style.display='block';box.querySelector('[data-selfmark]').style.display='flex'};
    box.querySelectorAll('[data-mark]').forEach(btn=>btn.onclick=()=>{state.selfMarks[`${group}:${box.dataset.qid}`]=btn.dataset.mark==='yes';box.querySelectorAll('[data-mark]').forEach(x=>x.disabled=true);btn.classList.add(btn.dataset.mark==='yes'?'correct':'wrong')});
  });
}
function markMcq(group){
  let correct=0,total=0;
  document.querySelectorAll(`[data-qgroup="${group}"]`).forEach(box=>{
    total++;const chosen=state.answers[`${group}:${box.dataset.qid}`];
    box.querySelectorAll('.cf-option').forEach(btn=>{btn.classList.remove('correct','wrong');if(btn.dataset.value===box.dataset.answer)btn.classList.add('correct');else if(chosen===btn.dataset.value)btn.classList.add('wrong')});
    if(norm(chosen)===norm(box.dataset.answer))correct++;
  });
  return{correct,total};
}
function gradeMcqStage(stage,answerKeys,total,feedbackId){
  const r=markMcq(stage==='vocabulary'?'vocab':stage);state.scores[stage]=r.total?r.correct/r.total:0;state.completed[stage]=true;
  $(feedbackId).innerHTML=`<div class="cf-feedback ${state.scores[stage]>=.8?'good':'bad'}">${r.correct}/${total} correct · ${Math.round(state.scores[stage]*100)}%</div>`;updateSidebar();
}
function gradeMixed(stage,group,questions,feedbackId){
  const mcq=questions.filter(x=>Array.isArray(x.options));const shorts=questions.filter(x=>!Array.isArray(x.options));const m=markMcq(group);let shortCorrect=0;
  shorts.forEach(x=>{if(state.selfMarks[`${group}:${x.id}`]===true)shortCorrect++});
  const total=mcq.length+shorts.length,correct=m.correct+shortCorrect;
  state.scores[stage]=total?correct/total:0;state.completed[stage]=true;
  $(feedbackId).innerHTML=`<div class="cf-feedback ${state.scores[stage]>=.8?'good':'bad'}">${correct}/${total} evidence checks met · ${Math.round(state.scores[stage]*100)}%.${shorts.some(x=>state.selfMarks[`${group}:${x.id}`]===undefined)?' Unmarked short answers count as not yet secure in this preview.':''}</div>`;updateSidebar();
}

function renderReading(){
  const s=lesson.stages.reading;
  $('previewMain').innerHTML=header('Stage 3','Reading',s.title)+`<div class="cf-passage">${esc(s.text)}</div><h3>Check your understanding</h3>${s.questions.map(x=>Array.isArray(x.options)?mcqHtml('reading',x.id,x.question,x.options,x.answer):shortHtml('reading',x)).join('')}<div class="cf-actions"><button class="cf-btn" id="checkReading">Check reading</button></div><div id="readingFeedback"></div>${nextButton('listening')}`;
  bindMcqClicks('reading');bindSelfChecks('reading');bindNext();$('checkReading').onclick=()=>gradeMixed('reading','reading',s.questions,'readingFeedback');
}

function speakScript(text){
  if(!('speechSynthesis' in window))return false;
  speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=.92;u.pitch=1;speechSynthesis.speak(u);return true;
}
function renderListening(){
  const s=lesson.stages.listening;
  $('previewMain').innerHTML=header('Stage 4','Listening',`${s.title} · target ${s.targetSeconds} seconds`)+`<div class="cf-card"><strong>Listen before you read</strong><p>Use normal speed. The transcript opens only after your second checked attempt.</p><div class="cf-actions"><button class="cf-btn" id="playListening">▶ Play listening</button><button class="cf-btn secondary" id="slowerListening">Play slower</button></div><div class="cf-feedback info">Browser speech is used only for this isolated content preview. Production uses the EnglishGate voice system.</div></div><h3>Listening questions</h3>${s.questions.map(x=>Array.isArray(x.options)?mcqHtml('listening',x.id,x.question,x.options,x.answer):shortHtml('listening',x)).join('')}<div class="cf-actions"><button class="cf-btn" id="checkListening">Check attempt</button></div><div id="listeningFeedback"></div><div id="transcriptBox" class="cf-card cf-transcript ${state.listeningAttempts>=s.transcriptUnlockAttempt?'open':''}"><span class="cf-kicker">Transcript · unlocked after attempt 2</span><p class="cf-passage">${esc(s.audioScript)}</p></div>${nextButton('grammar')}`;
  bindMcqClicks('listening');bindSelfChecks('listening');bindNext();
  $('playListening').onclick=()=>speakScript(s.audioScript);$('slowerListening').onclick=()=>{if('speechSynthesis' in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(s.audioScript);u.rate=.75;speechSynthesis.speak(u)}};
  $('checkListening').onclick=()=>{state.listeningAttempts++;gradeMixed('listening','listening',s.questions,'listeningFeedback');if(state.listeningAttempts>=s.transcriptUnlockAttempt){$('transcriptBox').classList.add('open');$('listeningFeedback').innerHTML+=`<div class="cf-feedback info">Attempt ${state.listeningAttempts}: transcript unlocked for noticing and repair.</div>`}else $('listeningFeedback').innerHTML+=`<div class="cf-feedback info">Attempt 1 complete. Try once more before opening the transcript.</div>`};
}

function renderGrammar(){
  const s=lesson.stages.grammar,mcqs=s.items.filter(x=>Array.isArray(x.options)),open=s.items.filter(x=>!Array.isArray(x.options));
  $('previewMain').innerHTML=header('Stage 5','Grammar',s.focus)+`<div class="cf-card cf-soft">${s.microBrief.map(x=>`<p>• ${esc(x)}</p>`).join('')}<p><strong>B1 boundary:</strong> ${esc(lesson.curriculum.grammar.b1Boundary)}</p></div>${mcqs.map(x=>mcqHtml('grammar',x.id,x.prompt,x.options,x.answer)).join('')}${open.map(x=>`<div class="cf-question"><label>${esc(x.prompt)}</label><input id="grammarOpen" type="text" placeholder="Your sentence" /><div class="cf-feedback info">Formative only — this open item does not reduce your mastery score.</div></div>`).join('')}<div class="cf-actions"><button class="cf-btn" id="checkGrammar">Check grammar</button></div><div id="grammarFeedback"></div><h3>Use it</h3><div class="cf-card cf-soft">${s.transferPrompts.map(x=>`<p>• ${esc(x)}</p>`).join('')}</div>${nextButton('writing')}`;
  bindMcqClicks('grammar');bindNext();$('checkGrammar').onclick=()=>gradeMcqStage('grammar',mcqs.map(x=>({id:x.id,answer:x.answer})),mcqs.length,'grammarFeedback');
}

function renderWriting(){
  const s=lesson.stages.writing,unlocked=writingUnlocked();
  if(!unlocked){$('previewMain').innerHTML=header('Stage 6','Writing','Writing opens only after the four scored areas reach 80% mastery.')+`<div class="cf-lock"><strong>Writing is locked.</strong><p>Your current scored evidence is ${SCORED.every(k=>state.completed[k])?Math.round(mastery()*100)+'%':'incomplete'}. Complete/retry the weakest area first.</p></div><div class="cf-actions"><button class="cf-btn secondary" data-go="${weakest()}">Go to ${esc(cap(weakest()))}</button></div>`;$('previewMain').querySelector('[data-go]').onclick=()=>go(weakest());return}
  $('previewMain').innerHTML=header('Stage 6','Writing',`${s.realLifeFormat} · ${s.wordRange[0]}–${s.wordRange[1]} words`)+`<div class="cf-card cf-soft"><strong>Task</strong><p>${esc(s.prompt)}</p></div><div class="cf-card"><strong>Build your response</strong>${s.builder.map(x=>`<p>• ${esc(x)}</p>`).join('')}</div><textarea id="writingDraft" rows="12" placeholder="Write your social post…"></textarea><div class="cf-wordcount" id="writingCount">0 / ${s.wordRange[0]}–${s.wordRange[1]} words</div><div class="cf-card"><strong>Success criteria</strong>${s.successCriteria.map(x=>`<p>✓ ${esc(x)}</p>`).join('')}</div><div class="cf-actions"><button class="cf-btn" id="saveWriting">Save writing evidence</button></div><div id="writingFeedback"></div>${nextButton('fluencyMission')}`;
  bindNext();const t=$('writingDraft');t.oninput=()=>{$('writingCount').textContent=`${wordCount(t.value)} / ${s.wordRange[0]}–${s.wordRange[1]} words`};$('saveWriting').onclick=()=>{const wc=wordCount(t.value),ok=wc>=s.wordRange[0]&&wc<=s.wordRange[1];state.writingStarted=wc>0;state.completed.writing=ok;$('writingFeedback').innerHTML=`<div class="cf-feedback ${ok?'good':'bad'}">${ok?'Writing evidence saved.':'Keep revising until the response is inside the target range.'} ${wc} words.</div>`;renderNav()};
}

function renderMission(){
  const s=lesson.stages.fluencyMission;
  $('previewMain').innerHTML=header('Stage 7','Fluency Mission',s.title)+`<section class="cf-card cf-mission"><span class="cf-kicker">Real outcome</span><h3>${esc(s.scenario)}</h3><p><strong>Finish when:</strong> ${esc(s.outcome)}</p></section><div class="cf-grid"><div class="cf-card"><strong>What you must do</strong>${s.requirements.map(x=>`<p>• ${esc(x)}</p>`).join('')}</div><div class="cf-card"><strong>Useful language</strong>${s.languageSupport.map(x=>`<p>• ${esc(x)}</p>`).join('')}</div></div><div class="cf-card cf-soft"><strong>Language evidence — for feedback, not the mission gate</strong>${(s.languageEvidence||[]).map(x=>`<p>• ${esc(x)}</p>`).join('')}<p>${esc(s.completionPolicy||'')}</p></div><div class="cf-card"><strong>Exit task</strong><p>${esc(s.exitTask)}</p></div><div class="cf-actions"><button class="cf-btn" id="completeMission">Mark mission outcome reached</button><button class="cf-btn secondary" id="repeatMission">Repeat after feedback</button></div><div id="missionFeedback"></div>`;
  $('completeMission').onclick=()=>{state.completed.fluencyMission=true;$('missionFeedback').innerHTML='<div class="cf-feedback good">Mission outcome recorded. The group decision—not a grammar count—is the completion gate.</div>';renderNav()};$('repeatMission').onclick=()=>{$('missionFeedback').innerHTML='<div class="cf-feedback info">Repeat once after feedback, aiming for clearer reasons, smoother interaction and one improved language choice.</div>'};
}

async function loadQuality(){
  try{const r=await fetch('/__course-factory/b1-gold-l4/jev-review',{cache:'no-store'});const d=await r.json();if(!d.ok)throw new Error(d.error||'Quality gate unavailable');const x=d.result;const passes=Object.values(x.results||{}).filter(v=>v.accepted).length;const total=Object.keys(x.results||{}).length;$('qualityStatus').innerHTML=`<div class="cf-feedback ${x.status==='semantic_pass'?'good':'info'}"><strong>${esc(x.status.replaceAll('_',' '))}</strong><br>${passes}/${total} semantic criteria cleared automatically. Teacher review resolves the remaining low-confidence criteria for preview only.</div><p style="font-size:12px;color:#64748b">Production activation: ${x.productionActivation?'on':'off'}</p>`}catch(e){$('qualityStatus').innerHTML=`<div class="cf-feedback bad">${esc(e.message)}</div>`}
}

async function init(){
  try{
    const r=await fetch('/__course-factory/b1-gold-l4/preview-data',{cache:'no-store'});const data=await r.json();if(!r.ok||!data.ok)throw new Error(data.error||'Preview data unavailable');lesson=data.lesson;render();loadQuality();
  }catch(e){$('previewMain').innerHTML=`<div class="cf-error"><strong>Preview unavailable</strong><p>${esc(e.message)}</p></div>`}
}
init();
})();