/* EnglishGate interactive Grammar Lesson stage */
(function(){
'use strict';
const marker='__ENGLISHGATE_GRAMMAR_LESSON__';
const clean=v=>String(v==null?'':v).trim();
const esc=v=>typeof window.escapeHtml==='function'?window.escapeHtml(clean(v)):clean(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=v=>clean(v).toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9' ]+/g,' ').replace(/\s+/g,' ').trim();

function lessonNumber(){return Number(window.activeTeacherLessonNumber||0)||Number(window.activeStudentLiveLessonNumber||0)||0}
function currentContext(){
 try{
  const role=window.session?.role;
  if(role==='teacher'&&typeof window.teacherClass==='function'&&typeof window.liveBookForClass==='function'){
   const c=window.teacherClass(),live=window.liveBookForClass(c),lesson=live?.lessons?.find(x=>Number(x.number)===lessonNumber());return{c,live,lesson};
  }
  if(role==='student'&&typeof window.studentClass==='function'&&typeof window.liveBookForClass==='function'){
   const c=window.studentClass(window.session.id),live=window.liveBookForClass(c),lesson=live?.lessons?.find(x=>Number(x.number)===lessonNumber());return{c,live,lesson};
  }
 }catch{}
 return{};
}
function targetFor(focus,outcome){
 const f=focus.toLowerCase();
 if(f.includes('present simple'))return'Use the Present Simple to talk about routines, stable facts and things that happen regularly.';
 if(f.includes('present perfect')&&f.includes('past simple'))return'Use the Present Perfect for experience or current relevance and the Past Simple for finished past events.';
 if(f.includes('present continuous'))return'Use the Present Continuous to talk about actions happening now or temporary situations.';
 if(f.includes('past continuous'))return'Use the Past Continuous to describe an action in progress around a past event.';
 if(f.includes('past simple'))return'Use the Past Simple to talk clearly about completed events in the past.';
 if(f.includes('future')||f.includes('will')||f.includes('going to'))return'Use the target future forms to talk about plans, predictions and decisions accurately.';
 if(f.includes('modal'))return'Use modal verbs to express the target meaning clearly and appropriately.';
 if(f.includes('conditional'))return'Use conditionals to connect a situation with its possible or imagined result.';
 if(f.includes('passive'))return'Use the passive when the action or result is more important than the person who does it.';
 if(f.includes('reported'))return'Use reported speech to explain what another person said without repeating the exact words.';
 if(f.includes('relative'))return'Use relative clauses to add clear information about a person, place or thing.';
 return outcome?`Use ${focus} accurately to achieve this lesson goal: ${outcome}`:`Use ${focus} accurately in meaningful communication.`;
}
function talkTarget(focus,title){
 const f=focus.toLowerCase();
 if(f.includes('present simple'))return'Talk about routines and stable facts';
 if(f.includes('present perfect')&&f.includes('past simple'))return'Talk about experience and finished past events';
 if(f.includes('present continuous'))return'Talk about what is happening now';
 if(f.includes('past simple'))return'Talk about completed past events';
 if(f.includes('conditional'))return'Talk about situations and results';
 if(f.includes('passive'))return'Focus on actions, processes and results';
 if(f.includes('reported'))return'Report what people said';
 return title?`Use grammar for ${title}`:'Use the grammar in real communication';
}
function grammarData(){
 const rows=Array.isArray(window.SPEAKUP_B2_BLUEPRINT)?window.SPEAKUP_B2_BLUEPRINT:[];
 const ctx=currentContext(),n=lessonNumber(),title=clean(ctx.lesson?.title).toLowerCase();
 let row=rows.find(x=>Number(x.number)===n);if(!row&&title)row=rows.find(x=>clean(x.title).toLowerCase()===title);
 if(!row)return{focus:'Grammar in context',title:clean(ctx.lesson?.title)||'Grammar',outcome:clean(ctx.lesson?.outcome),rule:'Notice the form, connect it to meaning, then use it in your own sentence.',items:[],readingText:'Read the examples and notice how the grammar communicates meaning.',questions:[]};
 return{focus:clean(row.grammarFocus)||'Grammar in context',title:clean(row.title),outcome:clean(row.outcome),rule:clean(row.grammarRule)||clean(row.foundation),items:Array.isArray(row.grammarItems)?row.grammarItems:[],readingText:clean(row.readingText),questions:Array.isArray(row.questions)?row.questions:[]};
}

const originalHeading=window.liveSectionHeading;
if(typeof originalHeading==='function')window.liveSectionHeading=function(line){return /^B2\s+LIFT$/i.test(clean(line))?'Grammar Lesson':originalHeading(line)};
const originalSections=window.liveSections;
if(typeof originalSections==='function')window.liveSections=function(text){return originalSections(text).map(s=>(/^B2\s+LIFT$/i.test(clean(s?.title))||/^Grammar Lesson$/i.test(clean(s?.title)))?{...s,title:'Grammar Lesson',lines:[marker]}:s)};

function sentences(text,max=4){return (clean(text).match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[]).map(x=>x.trim()).filter(Boolean).slice(0,max).join(' ')}
function options(q,attrName='data-grammar-option'){return (q?.options||[]).map((o,i)=>`<button type="button" class="grammar-live-option" ${attrName} data-correct="${String(o)===String(q.answer)?'true':'false'}"><span>${String.fromCharCode(65+i)}</span>${esc(o)}</button>`).join('')}
function practiceCard(q,i){return `<article class="grammar-live-question" data-practice-card><div class="grammar-question-meta"><span>${i+1}</span><span>${esc((q.tag||'grammar').replace(/^grammar:/,'').replace(/-/g,' '))}</span></div><h4>${esc(q.q)}</h4><div class="grammar-live-options">${options(q)}</div><div class="grammar-live-feedback" data-grammar-feedback aria-live="polite"></div></article>`}
function fixRow(q,i){const wrong=(q.options||[]).find(x=>String(x)!==String(q.answer))||'';return `<div class="grammar-fix-item" data-fix-item data-answer="${esc(q.answer)}"><b>${i+1}. ${esc(wrong)}</b><label>Write the correct sentence<input type="text" data-fix-input autocomplete="off" /></label><button type="button" class="ghost-btn" data-fix-check>Check</button><span data-fix-feedback aria-live="polite"></span></div>`}
function noticeRows(items){return items.slice(0,4).map((q,i)=>`<tr><td>${esc((q.tag||`Pattern ${i+1}`).replace(/^grammar:/,'').replace(/-/g,' '))}</td><td>${esc(q.answer)}</td></tr>`).join('')}

function grammarHtml(data){
 const qs=data.items.length?data.items:[{q:'Choose the sentence that best follows the grammar rule.',options:['Use the form that matches the meaning.','Choose any form.'],answer:'Use the form that matches the meaning.',tag:'grammar:meaning'}];
 const readQ=data.questions[0]||qs[0],practice=qs.slice(0,3),fix=qs.slice(0,2),quick=qs[Math.min(3,qs.length-1)]||qs[0],readText=sentences(data.readingText,4)||`This lesson uses ${data.focus} in a real communication context. Read the examples carefully and notice how the form changes the meaning.`;
 const examples=qs.slice(0,2).map(q=>q.answer);
 return `<section class="grammar-live-lesson grammar-book-format" data-grammar-live>
  <header class="grammar-book-hero"><span class="grammar-live-kicker">Grammar</span><h2>Grammar: ${esc(data.focus)}</h2><h3>${esc(talkTarget(data.focus,data.title))}</h3><p><b>Goal:</b> ${esc(targetFor(data.focus,data.outcome))}</p></header>

  <section class="grammar-book-section" data-section="read"><div class="grammar-book-number">1</div><div><h3>Read</h3><div class="grammar-reading-card"><h4>${esc(data.title||'In context')}</h4><p>${esc(readText)}</p></div><div class="grammar-read-question"><b>${esc(readQ.q)}</b><div class="grammar-live-options">${options(readQ,'data-read-option')}</div><div class="grammar-live-feedback" data-read-feedback></div></div></div></section>

  <section class="grammar-book-section" data-section="notice"><div class="grammar-book-number">2</div><div><h3>Notice</h3><p>Look at these examples:</p><div class="grammar-notice-examples">${examples.map(x=>`<strong>${esc(x)}</strong>`).join('')}</div><h4>What changes?</h4><div class="grammar-remember"><span>Remember</span><p>${esc(data.rule)}</p><table><thead><tr><th>Pattern / use</th><th>Example</th></tr></thead><tbody>${noticeRows(qs)}</tbody></table></div></div></section>

  <section class="grammar-book-section" data-section="practice"><div class="grammar-book-number">3</div><div><h3>Practice</h3><p>Choose the correct answer.</p><div class="grammar-practice-list">${practice.map(practiceCard).join('')}</div></div></section>

  <section class="grammar-book-section" data-section="fix"><div class="grammar-book-number">4</div><div><h3>Fix the mistake</h3><p>Rewrite each sentence correctly.</p><div class="grammar-fix-list">${fix.map(fixRow).join('')}</div></div></section>

  <section class="grammar-book-section" data-section="about"><div class="grammar-book-number">5</div><div><h3>About You</h3><p>Complete the sentences about your life.</p><div class="grammar-about-fields"><label>I usually <input type="text" placeholder="..." /></label><label>In my life, I <input type="text" placeholder="..." /></label><label>Every week, I <input type="text" placeholder="..." /></label></div><div class="grammar-challenge"><b>Challenge</b><p>Write one true sentence using <strong>${esc(data.focus)}</strong>.</p><textarea rows="3" data-grammar-production placeholder="Write your sentence here..."></textarea><button type="button" class="primary-btn" data-grammar-production-check>Check my sentence</button><span data-grammar-production-feedback></span></div></div></section>

  <section class="grammar-book-section grammar-quick-check" data-section="quick"><div class="grammar-book-number">✓</div><div><h3>Quick Check</h3><p>Choose the best answer.</p><div class="grammar-live-question"><h4>${esc(quick.q)}</h4><div class="grammar-live-options">${options(quick,'data-quick-option')}</div><div class="grammar-live-feedback" data-quick-feedback></div></div><div class="grammar-confidence"><b>Can you use ${esc(data.focus)} for this lesson target?</b><label><input type="radio" name="grammar-confidence" value="yes"> Yes, confidently</label><label><input type="radio" name="grammar-confidence" value="almost"> Almost</label><label><input type="radio" name="grammar-confidence" value="help"> I need more practice</label></div><button type="button" class="ghost-btn grammar-boost-btn" data-grammar-boost>Need help? → Boost Grammar</button><div class="grammar-live-feedback" data-boost-feedback></div></div></section>
 </section>`;
}
const originalRender=window.renderLiveContent;
if(typeof originalRender==='function')window.renderLiveContent=function(text){const lines=String(text||'').split('\n');return clean(lines[0])===marker?grammarHtml(grammarData()):originalRender(text)};

function markChoice(btn,feedback){const box=btn.closest('.grammar-live-options');if(!box||box.dataset.answered)return;box.dataset.answered='1';const correct=btn.dataset.correct==='true';box.querySelectorAll('button').forEach(x=>{x.disabled=true;if(x.dataset.correct==='true')x.classList.add('is-correct')});btn.classList.add(correct?'is-correct':'is-wrong');if(feedback){feedback.textContent=correct?'Correct.':'Not quite. Look at the highlighted answer and notice the pattern.';feedback.className='grammar-live-feedback '+(correct?'is-good':'is-bad')}}
document.addEventListener('click',e=>{
 let b=e.target.closest?.('[data-grammar-option]');if(b){markChoice(b,b.closest('[data-practice-card]')?.querySelector('[data-grammar-feedback]'));return}
 b=e.target.closest?.('[data-read-option]');if(b){markChoice(b,b.closest('.grammar-read-question')?.querySelector('[data-read-feedback]'));return}
 b=e.target.closest?.('[data-quick-option]');if(b){markChoice(b,b.closest('.grammar-live-question')?.querySelector('[data-quick-feedback]'));return}
 b=e.target.closest?.('[data-fix-check]');if(b){const row=b.closest('[data-fix-item]'),input=row?.querySelector('[data-fix-input]'),fb=row?.querySelector('[data-fix-feedback]');if(!input||!fb)return;const ok=norm(input.value)===norm(row.dataset.answer);fb.textContent=ok?'Correct.':'Try again. Check the subject, verb form and time meaning.';fb.className=ok?'is-good':'is-bad';return}
 b=e.target.closest?.('[data-grammar-production-check]');if(b){const root=b.closest('[data-grammar-live]'),box=root?.querySelector('[data-grammar-production]'),fb=root?.querySelector('[data-grammar-production-feedback]');if(!box||!fb)return;const text=clean(box.value);fb.textContent=text.split(/\s+/).filter(Boolean).length>=4?'Good. Now read it aloud and check that the form matches your meaning.':'Write one complete sentence first.';fb.className=text.split(/\s+/).filter(Boolean).length>=4?'is-good':'is-bad';return}
 b=e.target.closest?.('[data-grammar-boost]');if(b){const root=b.closest('[data-grammar-live]'),fb=root?.querySelector('[data-boost-feedback]');root?.querySelector('[data-section="notice"]')?.scrollIntoView({behavior:'smooth',block:'start'});if(fb){fb.textContent='Boost Grammar: review the Notice rule, then retry the Practice and Quick Check.';fb.className='grammar-live-feedback is-good'};return}
},true);

function decorateStageCards(root=document){
 root.querySelectorAll('.eg-stage,.teacher-presentation-stage').forEach(card=>{const strong=card.querySelector('strong');if(!strong)return;const label=clean(strong.textContent),legacy=/^B2\s+LIFT$/i.test(label),grammar=/^Grammar Lesson$/i.test(label);if(!legacy&&!grammar)return;if(legacy)strong.textContent='Grammar Lesson';card.classList.remove('b2-lift-stage');card.classList.add('grammar-lesson-stage');card.querySelectorAll('.b2-stage-badge').forEach(x=>x.remove())});
 root.querySelectorAll('h1,h2,h3,h4,small,span').forEach(node=>{if(node.children.length===0&&/^B2\s+LIFT$/i.test(clean(node.textContent)))node.textContent='Grammar Lesson'});
}
let scheduled=false;function scheduleDecorate(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;decorateStageCards()})}
const observer=new MutationObserver(ms=>{if(ms.length&&ms.every(m=>m.target?.nodeType===1&&m.target.closest?.('[data-grammar-live]')))return;scheduleDecorate()});
function start(){decorateStageCards();observer.observe(document.body,{subtree:true,childList:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
