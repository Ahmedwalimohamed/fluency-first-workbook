(function(){
'use strict';

const STAGES=[
  {key:'warmup',label:'Warm-up'},
  {key:'language',label:'Language briefing'},
  {key:'discussion',label:'Guided discussion'},
  {key:'mission',label:'Fluency Mission'},
  {key:'feedback',label:'Feedback & retry'}
];
let lesson=null;
let index=0;
let presenting=false;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const list=items=>`<ul>${(items||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;

function stage(){return STAGES[Math.max(0,Math.min(index,STAGES.length-1))]}
function move(next){index=Math.max(0,Math.min(Number(next)||0,STAGES.length-1));render();window.scrollTo({top:0,behavior:'smooth'})}
function pill(text){return `<span class="eg-language-chip">${esc(text)}</span>`}
function card(title,body,kind=''){
  return `<section class="eg-live-card ${kind}">${title?`<strong>${esc(title)}</strong>`:''}${body}</section>`;
}

function warmup(){
  const s=lesson.stages.hook;
  return `<p class="eyebrow">Fluency start</p>
    <h1>Start with real digital life.</h1>
    ${card('',`<h2>${esc(s.prompt)}</h2>`,'callout')}
    <p><strong>Think 15 seconds → speak 30–45 seconds → partner asks one genuine follow-up.</strong></p>
    ${card('Teacher move',`<p>${esc(s.teacherMove)}</p><p>Listen first. Do not correct every error while students are building the message.</p>`,'soft')}
    <h2>Optional follow-ups</h2>
    <div class="eg-language-chips">${['Which app do you use most?','Has your screen time been changing?','Which notifications do you keep on?','What is your biggest digital distraction?'].map(pill).join('')}</div>`;
}

function language(){
  const v=lesson.stages.vocabulary;
  const g=lesson.stages.grammar;
  const core=(v.items||[]).filter(x=>!x.stretch);
  return `<p class="eyebrow">Brief, then use</p>
    <h1>Give students only the language they need to speak.</h1>
    <h2>Core technology language</h2>
    <div class="eg-language-chips">${core.map(x=>pill(x.word)).join('')}</div>
    ${card('Make the words usable',`<p>${core.slice(0,4).map(x=>`<strong>${esc(x.word)}:</strong> ${esc(x.example)}`).join('<br>')}</p>`)}
    <h2>${esc(g.focus)}</h2>
    ${card('Form & meaning',`<p><strong>${esc(lesson.curriculum.grammar.form||'have/has + been + verb-ing')}</strong></p><p>${esc(lesson.curriculum.grammar.meaning||'Use it for an activity continuing up to now or a recent repeated activity with a present result.')}</p>`,'callout')}
    <div class="eg-language-chips">${(lesson.curriculum.grammar.productiveUses||[]).map(pill).join('')}</div>
    ${card('B1 boundary',`<p>${esc(lesson.curriculum.grammar.b1Boundary||'Keep examples tied to familiar personal habits and recent activities. Do not turn this into an abstract grammar lecture.')}</p><p><strong>Pronunciation:</strong> ${esc(lesson.curriculum.pronunciation||'Stress the important content words and use natural thought groups.')}</p>`,'soft')}
    <p><strong>Teacher rule:</strong> model one or two examples, then return immediately to speaking.</p>`;
}

function discussion(){
  const s=lesson.stages.speaking;
  return `<p class="eyebrow">Guided speaking</p>
    <h1>${esc(s.openingPrompt)}</h1>
    <p>${esc(s.communicativeGoal)}</p>
    ${card('Follow the learner, not a script',list(s.followUps),'soft')}
    <h2>Speaking rhythm</h2>
    <p><strong>Think → answer → one follow-up → improve one answer and say it again.</strong></p>
    ${card('Listen for',list(s.successEvidence))}
    <p><strong>Correction rule:</strong> note one or two high-value issues while students speak. Correct after the exchange unless meaning breaks down.</p>`;
}

function mission(){
  const s=lesson.stages.fluencyMission;
  return `<p class="eyebrow">Fluency Mission</p>
    <h1>${esc(s.title)}</h1>
    <p>${esc(s.scenario)}</p>
    ${card('Real outcome',`<h2>${esc(s.outcome)}</h2>`,'callout')}
    <h2>Students must</h2>
    ${list(s.requirements)}
    ${card('Useful language',`<div class="eg-language-chips">${(s.languageSupport||[]).map(pill).join('')}</div>`,'soft')}
    ${card('Completion rule',`<p>${esc(s.completionPolicy||'The group completes the mission when it reaches the agreed real-world outcome. Grammar use is evidence for feedback, not the reason the task exists.')}</p>`)}
    <p><strong>Fluency rule:</strong> react to other people, give a reason or example, and help the group reach a decision.</p>`;
}

function feedback(){
  const g=lesson.stages.grammar;
  const m=lesson.stages.fluencyMission;
  return `<p class="eyebrow">Feedback & retry</p>
    <h1>Fix less. Improve more.</h1>
    ${card('Correct only what matters most',`<ol><li>Meaning or intelligibility problem.</li><li>One target-language issue that weakened the message.</li><li>One high-value technology word or phrase.</li><li>One pronunciation issue only if it affects clarity.</li></ol>`)}
    <h2>Quick repair</h2>
    ${list(g.transferPrompts)}
    ${card('Repeat after feedback',`<p><strong>Ask each learner to improve one earlier answer and say it again.</strong></p><p>${esc(m.exitTask||'Give a short final answer using the improved language.')}</p>`,'callout')}
    <p>Independent Reading, Listening, scored Grammar, Writing, mastery and adaptive repair remain in the Workbook.</p>
    <p><a class="primary-btn" href="/course-factory-b1-gold-l4-workbook.html">Open matching Workbook →</a></p>`;
}

function content(){
  const key=stage().key;
  return ({warmup,language,discussion,mission,feedback}[key]||warmup)();
}

function shell(){
  const s=stage();
  const prev=index>0;
  const next=index<STAGES.length-1;
  const canDo=lesson.canDo?.[0]||'Use English to discuss familiar technology habits and practical choices.';
  return `<section class="eg-lesson" data-course-factory-live-player="b1-gold-l4">
    <header class="eg-lesson-header">
      <div class="eg-lesson-header-row">
        <div><p class="eyebrow">B1 · Lesson ${Number(lesson.lessonNumber)||4}</p><h1 style="margin:0">${esc(lesson.title)}</h1><p class="muted" style="margin:5px 0 0">Teacher-led Lesson Book · preview</p></div>
        <div class="eg-lesson-actions">
          <span class="preview-pill">Preview only</span>
          <a class="ghost-btn" href="/course-factory-b1-gold-l4-preview.html">← Surfaces</a>
          <a class="ghost-btn" href="/course-factory-b1-gold-l4-workbook.html">Workbook</a>
          <button class="ghost-btn" type="button" data-presentation-toggle>${presenting?'Exit Present':'Present ⛶'}</button>
        </div>
      </div>
    </header>

    <div class="teacher-presentation-chrome">
      <strong>${esc(s.label)}</strong>
      <button class="ghost-btn" type="button" data-presentation-toggle>Exit Present</button>
    </div>

    <div class="eg-lesson-layout">
      <aside class="eg-stage-list" aria-label="Live lesson stages">
        <nav>${STAGES.map((x,i)=>`<button class="eg-stage ${i===index?'active':''}" type="button" data-stage-index="${i}" aria-current="${i===index?'step':'false'}">${i+1}. ${esc(x.label)}</button>`).join('')}</nav>
        <details class="eg-goal" open><summary><strong>Lesson goal</strong></summary><p>${esc(canDo)}</p></details>
      </aside>

      <div class="eg-teaching-surface">
        <header class="eg-stage-heading"><div><small>Stage ${index+1} of ${STAGES.length}</small><h2>${esc(s.label)}</h2></div><span class="preview-pill">Teacher controls pace</span></header>
        <div class="live-class-tools live-class-tools-whiteboard-only" aria-label="Live class tools"><div class="live-tool-actions"></div></div>
        <div class="teacher-annotation-stage">
          <article class="live-book-content eg-stage-content">${content()}</article>
        </div>
        <footer class="eg-lesson-footer">
          <button class="ghost-btn" type="button" data-prev-stage ${prev?'':'disabled'}>← Previous stage</button>
          <span class="eg-stage-progress">Stage ${index+1} of ${STAGES.length}</span>
          ${next?'<button class="primary-btn next" type="button" data-next-stage>Next stage →</button>':'<a class="primary-btn next" href="/course-factory-b1-gold-l4-workbook.html">Open Workbook →</a>'}
        </footer>
      </div>
    </div>
  </section>`;
}

function bind(){
  document.querySelectorAll('[data-stage-index]').forEach(btn=>btn.onclick=()=>move(Number(btn.dataset.stageIndex)));
  const prev=document.querySelector('[data-prev-stage]');if(prev)prev.onclick=()=>move(index-1);
  const next=document.querySelector('[data-next-stage]');if(next)next.onclick=()=>move(index+1);
  document.querySelectorAll('[data-presentation-toggle]').forEach(btn=>btn.onclick=()=>{presenting=!presenting;document.body.classList.toggle('teacher-presentation-mode',presenting);render()});
}

function render(){
  document.body.classList.add('role-teacher','teacher-live-active');
  document.body.classList.toggle('teacher-presentation-mode',presenting);
  $('content').innerHTML=shell();
  bind();
}

fetch('/__course-factory/b1-gold-l4/preview-data',{cache:'no-store'})
  .then(r=>{if(!r.ok)throw new Error('Lesson Book preview is available only on a Vercel preview deployment.');return r.json()})
  .then(data=>{lesson=data.lesson;render()})
  .catch(err=>{$('content').innerHTML=`<div class="feedback bad">${esc(err.message)}</div>`});
})();