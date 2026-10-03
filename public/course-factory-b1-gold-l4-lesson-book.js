(function(){
'use strict';

const STAGES=[
  {key:'warmup',label:'Warm Up'},
  {key:'language',label:'Vocabulary & Language'},
  {key:'discussion',label:'Guided Discussion'},
  {key:'mission',label:'Fluency Mission'},
  {key:'feedback',label:'Feedback & Retry'}
];
let lesson=null;
let index=0;
let presenting=false;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const attr=v=>esc(v).replace(/`/g,'&#96;');

function stage(){return STAGES[Math.max(0,Math.min(index,STAGES.length-1))]}
function go(next){index=Math.max(0,Math.min(Number(next)||0,STAGES.length-1));render();resetScroll();focusStage()}
function resetScroll(){try{window.scrollTo({top:0,left:0,behavior:'auto'})}catch{window.scrollTo(0,0)}const c=$('content');if(c)c.scrollTop=0}
function focusStage(){const h=$('liveStageTitle');if(h){try{h.focus({preventScroll:true})}catch{h.focus()}}}
function section(text){return `<h3 class="live-book-section">${esc(text)}</h3>`}
function subhead(text){return `<h4 class="live-book-subhead">${esc(text)}</h4>`}
function bullet(text){return `<div class="live-book-bullet">${esc(text)}</div>`}
function promptRow(number,text){return `<div class="live-prompt-row"><span>${number}</span><div class="live-prompt-copy"><p>${esc(text)}</p></div></div>`}
function promptGrid(items){return `<div class="live-prompt-grid">${(items||[]).map((x,i)=>promptRow(i+1,x)).join('')}</div>`}
function checkRows(items){return (items||[]).map(x=>`<div class="live-check-row is-readonly"><span class="live-check-copy"><b>${esc(x)}</b></span></div>`).join('')}
function vocabTable(items){
  const rows=(items||[]).map(item=>`<button class="live-vocab-row live-vocab-click" type="button" data-vocab-word="${attr(item.word)}" data-vocab-meaning="${attr(item.meaning||'') }" data-vocab-example="${attr(item.example||'')}"><div class="live-vocab-word"><small>Target word</small><strong>${esc(item.word)}</strong></div><div class="live-vocab-example"><small>Example</small><span>${esc(item.example||'')}</span></div></button>`).join('');
  return `<div class="live-vocab-table"><div class="live-vocab-head"><span>Target word</span><span>Example in context</span></div>${rows}</div>`;
}
function plainList(items){return (items||[]).map(bullet).join('')}

function warmupContent(){
  const s=lesson.stages.hook;
  const questions=[
    s.prompt,
    'Which app do you use the most, and why?',
    'How often do you check your phone during the day?',
    'What usually distracts you when you are online?',
    'Is there one technology habit you would like to change?'
  ].filter(Boolean);
  return `${section('PAGE 1 — WARM UP')}
    ${subhead('FLUENCY START')}
    <p>Choose one question first. Think for 15 seconds, then speak for 30–45 seconds. Your partner asks one genuine follow-up question before you switch.</p>
    ${subhead('Think & Talk')}
    ${promptGrid(questions)}
    ${subhead('SPEAKING CHALLENGE')}
    <p>Find someone who...</p>
    ${checkRows(['checks their phone soon after waking up','uses social media every day','has turned off notifications to focus','sometimes takes a break from an app','prefers calling to texting'])}
    <p>A name only counts after one follow-up question. Remember one interesting detail about the person.</p>`;
}

function languageContent(){
  const v=lesson.stages.vocabulary;
  const g=lesson.stages.grammar;
  const items=(v.items||[]).filter(x=>!x.stretch).slice(0,8);
  const expressions=[
    'I use it mainly for…',
    'I tend to check it when…',
    'I have been trying to cut down on…',
    'The main advantage is…',
    'One problem is that…',
    'It depends on how you use it.'
  ];
  return `${section('PAGE 2 — VOCABULARY & LANGUAGE')}
    ${subhead('Talking About Technology & Social Media')}
    ${vocabTable(items)}
    ${subhead('Useful Expressions')}
    ${plainList(expressions)}
    ${subhead('Pronunciation')}
    <p>${esc(lesson.curriculum.pronunciation||'Stress the important content words and use natural thought groups.')}</p>
    ${section('LANGUAGE FOCUS')}
    <h2>${esc(g.focus)}</h2>
    <p>${esc(lesson.curriculum.grammar.meaning||'Use the target form to connect a recent or continuing activity to now.')}</p>
    ${subhead('Examples')}
    ${plainList((lesson.curriculum.grammar.productiveUses||[]).slice(0,4))}
    ${subhead('Make It Personal')}
    ${promptGrid((g.transferPrompts||[]).slice(0,4))}`;
}

function discussionContent(){
  const s=lesson.stages.speaking;
  const prompts=[s.openingPrompt,...(s.followUps||[])].filter(Boolean);
  return `${section('PAGE 3 — GUIDED DISCUSSION')}
    ${subhead('FLUENCY BUILD')}
    <p>${esc(s.communicativeGoal||'Discuss familiar technology habits, give reasons and respond to another person.')}</p>
    ${subhead('Think & Talk')}
    ${promptGrid(prompts)}
    ${subhead('SUCCESS CHECK')}
    ${checkRows(s.successEvidence||[])}
    <p>Do not stop the conversation for every error. Finish the exchange first, then improve one answer and say it again.</p>`;
}

function missionContent(){
  const s=lesson.stages.fluencyMission;
  return `${section('PAGE 4 — FLUENCY MISSION')}
    ${subhead('FLUENCY MISSION')}
    <h1>${esc(s.title)}</h1>
    <p>${esc(s.scenario)}</p>
    ${subhead('YOUR MISSION')}
    <p><strong>${esc(s.outcome)}</strong></p>
    ${subhead('Try to cover:')}
    ${plainList(s.requirements||[])}
    ${subhead('LANGUAGE BANK')}
    ${plainList(s.languageSupport||[])}
    ${subhead('Challenge')}
    <p>${esc(s.completionPolicy||'React to other people, give a reason or example, and help the group reach a real decision.')}</p>`;
}

function feedbackContent(){
  const g=lesson.stages.grammar;
  const m=lesson.stages.fluencyMission;
  return `${section('PAGE 5 — FEEDBACK & RETRY')}
    ${subhead('SUCCESS CHECK')}
    ${checkRows(['My message was clear enough to follow.','I used useful technology language.','I supported at least one idea with a reason or example.','I responded to another person instead of giving isolated answers.'])}
    ${subhead('ACCURACY FOCUS')}
    <p>Correct only the highest-value issue: meaning first, then one target-language problem, one useful word or phrase, and one pronunciation point only if it affects clarity.</p>
    ${subhead('Make It Personal')}
    ${promptGrid((g.transferPrompts||[]).slice(0,4))}
    ${subhead('FLUENCY EXIT')}
    <p><strong>Improve one earlier answer and say it again without reading.</strong></p>
    <p>${esc(m.exitTask||'Give a short final answer using the improved language.')}</p>
    ${subhead('INDEPENDENT MISSION')}
    <p>Continue to the matching Workbook for Reading, Listening, scored Grammar, Writing and adaptive repair.</p>`;
}

function stageContent(){
  return ({warmup:warmupContent,language:languageContent,discussion:discussionContent,mission:missionContent,feedback:feedbackContent}[stage().key]||warmupContent)();
}

function headerActions(){
  return `<div class="eg-lesson-header-actions"><a class="ghost-btn" href="/course-factory-b1-gold-l4-workbook.html">Workbook</a><button class="primary-btn teacher-present-btn" type="button" data-presentation-toggle data-presentation-label="dynamic" aria-pressed="${presenting?'true':'false'}">${presenting?'Exit presentation':'Present ⛶'}</button></div>`;
}

function shell(){
  const s=stage();
  const total=STAGES.length;
  const isLast=index===total-1;
  const stages=STAGES.map((x,i)=>`<button class="eg-stage ${i===index?'is-current':''}" data-live-section="${i}" type="button" ${i===index?'aria-current="step"':''}><span>${i+1}</span><strong>${esc(x.label.toLowerCase())}</strong></button>`).join('');
  const presentationStages=STAGES.map((x,i)=>`<button class="teacher-presentation-stage ${i===index?'is-current':''}" data-live-section="${i}" type="button" ${i===index?'aria-current="step"':''}><span>${i+1}</span><strong>${esc(x.label)}</strong></button>`).join('');
  const goal=(lesson.canDo||[]).join(' · ')||'Discuss technology habits, support an opinion and respond to another speaker.';
  const nextAction=isLast?'<a class="primary-btn" href="/course-factory-b1-gold-l4-workbook.html">Open matching workbook →</a>':'<button class="primary-btn" id="nextLiveSection" type="button">Next stage →</button>';
  return `<section class="eg-lesson" data-course-factory-live-player="b1-gold-l4-production-parity">
    <header class="eg-lesson-header"><a class="ghost-btn" href="/course-factory-b1-gold-l4-preview.html">← Lessons</a><div><p>B1 Gold Preview · EnglishGate</p><h1>Lesson ${Number(lesson.lessonNumber)||4} · ${esc(lesson.title||'Technology & Social Media')}</h1></div>${headerActions()}</header>
    <div class="teacher-presentation-chrome"><div class="teacher-presentation-title"><div><span>B1 Gold Preview</span><strong>Lesson ${Number(lesson.lessonNumber)||4} · ${esc(lesson.title||'Technology & Social Media')}</strong></div><button class="teacher-exit-presentation" type="button" data-presentation-toggle aria-label="Exit presentation">Exit ⛶</button></div><nav class="teacher-presentation-stages" aria-label="Lesson stages">${presentationStages}</nav></div>
    <div class="eg-lesson-layout"><aside class="eg-stage-list"><p class="eg-label">Lesson stages</p><nav aria-label="Lesson stages">${stages}</nav><details class="eg-goal"><summary>Lesson goal</summary><p>${esc(goal)}</p></details></aside>
    <div class="eg-teaching-surface"><header class="eg-stage-heading"><p class="eg-label">Stage ${index+1} of ${total}</p><h2 id="liveStageTitle" tabindex="-1">${esc(s.label.toLowerCase())}</h2></header>
    <div class="live-class-tools live-class-tools-whiteboard-only" role="toolbar" aria-label="Classroom whiteboard"><div class="live-tool-actions"></div></div>
    <div class="teacher-annotation-stage" id="teacherAnnotationStage" data-annotation-mode="interact">
      <article class="live-book-content eg-stage-content" aria-labelledby="liveStageTitle">${stageContent()}</article>
      <div class="teacher-annotation-text-layer" id="teacherAnnotationTextLayer" aria-hidden="true"></div>
      <canvas class="teacher-annotation-canvas" id="teacherAnnotationCanvas" aria-label="Teacher annotation layer"></canvas>
      <div class="teacher-laser-pointer" id="teacherLaserPointer" aria-hidden="true"></div>
    </div>
    <footer class="eg-lesson-footer"><button class="ghost-btn" id="prevLiveSection" type="button" ${index===0?'disabled':''}>← Previous</button>${nextAction}</footer></div></div>
  </section>`;
}

function bind(){
  document.querySelectorAll('[data-live-section]').forEach(btn=>btn.onclick=()=>go(Number(btn.dataset.liveSection)));
  const prev=$('prevLiveSection');if(prev)prev.onclick=()=>{if(index>0)go(index-1)};
  const next=$('nextLiveSection');if(next)next.onclick=()=>go(index+1);
  document.querySelectorAll('[data-presentation-toggle]').forEach(btn=>btn.onclick=()=>{presenting=!presenting;document.body.classList.toggle('teacher-presentation-mode',presenting);render();focusStage()});
  const menu=$('menuBtn');if(menu)menu.onclick=()=>document.querySelector('.sidebar')?.classList.toggle('open');
  document.querySelectorAll('.live-vocab-click').forEach(btn=>btn.onclick=()=>{const old=document.querySelector('.live-vocab-preview');if(old)old.remove();const box=document.createElement('div');box.className='live-vocab-preview feedback good';box.innerHTML=`<strong>${esc(btn.dataset.vocabWord||'')}</strong><br>${esc(btn.dataset.vocabMeaning||'')}<br><em>${esc(btn.dataset.vocabExample||'')}</em>`;btn.insertAdjacentElement('afterend',box)});
}

function render(){
  document.body.classList.add('role-teacher','teacher-live-active');
  document.body.classList.toggle('teacher-presentation-mode',presenting);
  $('pageEyebrow').textContent='Teacher';
  $('pageTitle').textContent='Lesson '+(Number(lesson.lessonNumber)||4);
  $('content').innerHTML=shell();
  bind();
}

fetch('/__course-factory/b1-gold-l4/preview-data',{cache:'no-store'})
  .then(r=>{if(!r.ok)throw new Error('Lesson Book preview is available only on a Vercel preview deployment.');return r.json()})
  .then(data=>{lesson=data.lesson;render()})
  .catch(err=>{$('content').innerHTML=`<div class="feedback bad">${esc(err.message)}</div>`});
})();
