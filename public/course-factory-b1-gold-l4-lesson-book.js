(function(){
'use strict';

const SECTIONS=[
  ['overview','Overview'],
  ['warmup','Warm-up'],
  ['language','Language briefing'],
  ['discussion','Guided discussion'],
  ['mission','Fluency Mission'],
  ['debrief','Correction & debrief']
];
let lesson=null;
let current='overview';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

function nav(){
  $('lessonBookNav').innerHTML=SECTIONS.map(([key,label],i)=>`<button type="button" data-section="${key}" class="${current===key?'active':''}"><span class="cf-step">${i+1}</span><span>${esc(label)}</span></button>`).join('');
  $('lessonBookNav').querySelectorAll('[data-section]').forEach(btn=>btn.onclick=()=>{current=btn.dataset.section;render();window.scrollTo({top:0,behavior:'smooth'})});
}
function next(key){return `<div class="cf-actions"><button class="cf-btn" data-next="${key}">Continue</button></div>`}
function bindNext(){document.querySelectorAll('[data-next]').forEach(btn=>btn.onclick=()=>{current=btn.dataset.next;render();window.scrollTo({top:0,behavior:'smooth'})})}
function header(kicker,title,lead=''){return `<span class="cf-kicker">${esc(kicker)}</span><h1>${esc(title)}</h1>${lead?`<p class="cf-lead">${esc(lead)}</p>`:''}`}

function renderOverview(){
  $('lessonBookMain').innerHTML=header(`B1 · Lesson ${lesson.lessonNumber}`,'Technology & Social Media','Teacher-led live lesson. The teacher controls the pace; students speak before they move to independent practice.')+
  `<div class="cf-card cf-soft"><span class="cf-kicker">Can-do outcomes</span>${lesson.canDo.map(x=>`<p>• ${esc(x)}</p>`).join('')}</div>`+
  `<div class="cf-card"><span class="cf-kicker">Live lesson flow</span><p><strong>Warm-up → language briefing → guided discussion → Fluency Mission → correction/debrief.</strong></p><p style="margin-bottom:0">Reading, listening, scored grammar practice, writing, mastery and Boost are intentionally absent from the Lesson Book.</p></div>${next('warmup')}`;
  bindNext();
}
function renderWarmup(){
  const s=lesson.stages.hook;
  $('lessonBookMain').innerHTML=header('1 · Warm-up','Start with the learner’s real digital life')+
  `<div class="cf-card"><h2>${esc(s.prompt)}</h2><p>${esc(s.purpose)}</p></div>`+
  `<div class="cf-card cf-soft"><span class="cf-kicker">Teacher move</span><p>${esc(s.teacherMove)}</p><p style="margin-bottom:0"><strong>Goal:</strong> get students speaking quickly. Do not turn this into a scored task.</p></div>${next('language')}`;
  bindNext();
}
function renderLanguage(){
  const v=lesson.stages.vocabulary;
  const g=lesson.stages.grammar;
  $('lessonBookMain').innerHTML=header('2 · Language briefing','Give only the language students need for the live task','Brief, contextual and immediately usable.')+
  `<div class="cf-card"><span class="cf-kicker">Vocabulary briefing</span><div class="cf-grid">${v.items.map(item=>`<article class="cf-vocab"><strong>${esc(item.word)}${item.stretch?' · stretch':''}</strong><p>${esc(item.meaning)}</p><p><em>${esc(item.example)}</em></p></article>`).join('')}</div></div>`+
  `<div class="cf-card"><span class="cf-kicker">Grammar briefing</span><h2>${esc(g.focus)}</h2>${(g.microBrief||[]).map(x=>`<p>• ${esc(x)}</p>`).join('')}<p><strong>B1 boundary:</strong> ${esc(lesson.curriculum.grammar.b1Boundary||'Use the form for familiar ongoing or recent activities.')}</p><p><strong>Useful contrast:</strong> ${esc(lesson.curriculum.grammar.contrast||'')}</p></div>`+
  `<div class="cf-card cf-soft"><span class="cf-kicker">Teacher rule</span><p style="margin-bottom:0">Explain briefly, model one or two examples, then return students to speaking. Accuracy supports communication; it does not replace it.</p></div>${next('discussion')}`;
  bindNext();
}
function renderDiscussion(){
  const s=lesson.stages.speaking;
  $('lessonBookMain').innerHTML=header('3 · Guided discussion','Build the conversation before the mission',s.communicativeGoal)+
  `<div class="cf-card"><span class="cf-kicker">Opening question</span><h2>${esc(s.openingPrompt)}</h2></div>`+
  `<div class="cf-card cf-soft"><span class="cf-kicker">Follow-ups</span>${s.followUps.map(x=>`<p>• ${esc(x)}</p>`).join('')}</div>`+
  `<div class="cf-card"><span class="cf-kicker">Listen for</span>${s.successEvidence.map(x=>`<p>• ${esc(x)}</p>`).join('')}<p style="margin-bottom:0"><strong>Correction:</strong> note high-value errors while students speak. Correct selectively after the exchange rather than interrupting every turn.</p></div>${next('mission')}`;
  bindNext();
}
function renderMission(){
  const s=lesson.stages.fluencyMission;
  $('lessonBookMain').innerHTML=header('4 · Fluency Mission',s.title,s.scenario)+
  `<div class="cf-card"><span class="cf-kicker">Real outcome</span><h2>${esc(s.outcome)}</h2></div>`+
  `<div class="cf-card"><span class="cf-kicker">Students must</span>${s.requirements.map(x=>`<p>• ${esc(x)}</p>`).join('')}</div>`+
  `<div class="cf-card cf-soft"><span class="cf-kicker">Language support</span>${(s.languageSupport||[]).map(x=>`<p>• ${esc(x)}</p>`).join('')}</div>`+
  `<div class="cf-card"><span class="cf-kicker">Completion rule</span><p>${esc(s.completionPolicy||'The communicative outcome is the completion gate.')}</p><p><strong>Exit task:</strong> ${esc(s.exitTask||'')}</p></div>${next('debrief')}`;
  bindNext();
}
function renderDebrief(){
  const g=lesson.stages.grammar;
  const m=lesson.stages.fluencyMission;
  $('lessonBookMain').innerHTML=header('5 · Correction & debrief','Turn live performance into the next learning move')+
  `<div class="cf-card"><span class="cf-kicker">Correct only what matters most</span><p>1. Meaning/intelligibility problem.</p><p>2. Target grammar that blocked or weakened the message.</p><p>3. High-value technology vocabulary.</p><p>4. One pronunciation issue that affects clarity.</p></div>`+
  `<div class="cf-card cf-soft"><span class="cf-kicker">Quick repair</span>${g.transferPrompts.map(x=>`<p>• ${esc(x)}</p>`).join('')}</div>`+
  `<div class="cf-card"><span class="cf-kicker">Close the live lesson</span><p><strong>Ask students to repeat or improve one answer after feedback.</strong></p><p>${esc(m.exitTask||'')}</p><p style="margin-bottom:0">Then move students to the Workbook, where reading, listening, scored practice, writing and adaptive evidence are collected.</p></div>`+
  `<div class="cf-actions"><a class="cf-btn" href="/course-factory-b1-gold-l4-workbook.html">Continue to Workbook</a></div>`;
}
function render(){nav();({overview:renderOverview,warmup:renderWarmup,language:renderLanguage,discussion:renderDiscussion,mission:renderMission,debrief:renderDebrief}[current]||renderOverview)()}

fetch('/__course-factory/b1-gold-l4/preview-data',{cache:'no-store'})
  .then(r=>{if(!r.ok)throw new Error('Lesson Book preview is available only on a Vercel preview deployment.');return r.json()})
  .then(data=>{lesson=data.lesson;render()})
  .catch(err=>{$('lessonBookMain').innerHTML=`<div class="cf-feedback bad">${esc(err.message)}</div>`});
})();