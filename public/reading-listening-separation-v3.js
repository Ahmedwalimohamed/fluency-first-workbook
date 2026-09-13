/* EnglishGate Reading / Listening separation v3
   Structural workbook split: independent tabs, state, attempts, completion and question flow.
   Existing educational content is preserved; legacy combined evidence is not fabricated into new skill scores. */
(function(){
'use strict';

const SEP_STEPS=['grammar','reading','listening','vocabulary','writing'];
const SEP_LABELS={grammar:'Grammar',reading:'Reading',listening:'Listening',vocabulary:'Vocabulary',writing:'Writing'};
const progressCache=new Map();
let progressLoadedFor=null,saveTimer=0;

const student=()=>typeof session!=='undefined'&&session?.role==='student';
const preview=()=>typeof isWorkbookPreview==='function'&&isWorkbookPreview();
const activityId=(lid,type)=>`${lid}:${type}`;
const storageKey=(lid,type)=>`eg:activity:v3:${session?.id||'preview'}:${activityId(lid,type)}`;
const norm=v=>String(v??'').toLowerCase().normalize('NFKD').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');

function qsFor(l,type){
 const all=Array.isArray(l?.listening?.questions)?l.listening.questions:[];
 if(type==='reading')return all.filter(q=>/^reading:|^listening-reading:/.test(String(q?.tag||'')));
 return all.filter(q=>/^listening:/.test(String(q?.tag||''))&&!/^listening-reading:/.test(String(q?.tag||'')));
}
function passageFor(l){return String(l?.reading?.passage||l?.listening?.readingText||'').trim()}
function scriptFor(l){return String(l?.listening?.audioScript||l?.listening?.text||'').trim()}
function hasStep(l,step){
 if(step==='reading')return Boolean(passageFor(l)&&qsFor(l,'reading').length);
 if(step==='listening')return Boolean(scriptFor(l)&&qsFor(l,'listening').length);
 if(step==='grammar')return Boolean(l?.grammar);
 if(step==='vocabulary')return Boolean(l?.vocabulary||l?.expressions?.length||l?.targetVocabulary?.length);
 if(step==='writing')return Boolean(l?.writing);
 return false;
}
function stepsFor(l){return SEP_STEPS.filter(s=>hasStep(l,s))}
function cachedState(lid,type){return progressCache.get(activityId(lid,type))||null}
function isSepComplete(lid,type){return cachedState(lid,type)?.status==='completed'}
function legacyComplete(sid,lid,step){return typeof completionFor==='function'&&completionFor(sid,lid).includes(step)}
function stepDone(sid,lid,step){return step==='reading'||step==='listening'?isSepComplete(lid,step):legacyComplete(sid,lid,step)}

async function loadProgress(force=false,studentId=''){
 if(!student()&&!studentId)return;
 const id=studentId||session.id;
 if(!force&&progressLoadedFor===id)return;
 try{
  const suffix=studentId&&studentId!==session?.id?'?studentId='+encodeURIComponent(studentId):'';
  const r=await api('/api/workbook-activities/progress'+suffix);
  if(id===session?.id){
   progressCache.clear();
   (r.states||[]).forEach(s=>progressCache.set(s.activity_id||s.activityId,s));
   progressLoadedFor=id;
  }
  return r;
 }catch(e){console.warn('Reading/Listening progress load failed:',e.message)}
}

function localState(l,type){
 try{return JSON.parse(localStorage.getItem(storageKey(l.id,type))||'null')}catch{return null}
}
function writeLocal(l,type,state){try{localStorage.setItem(storageKey(l.id,type),JSON.stringify(state))}catch{}}
function responseObject(root){
 const out={};
 root.querySelectorAll('[data-sep-question]').forEach((q,i)=>{
  const checked=q.querySelector('input[type="radio"]:checked,input[type="checkbox"]:checked');
  const field=q.querySelector('input[type="text"],textarea');
  out[String(i)]=checked?checked.value:String(field?.value||'');
 });
 return out;
}
function applyResponses(root,responses={}){
 root.querySelectorAll('[data-sep-question]').forEach((q,i)=>{
  const value=String(responses[String(i)]??'');if(!value)return;
  const radios=[...q.querySelectorAll('input[type="radio"]')];
  if(radios.length){const hit=radios.find(r=>r.value===value);if(hit)hit.checked=true}
  else{const field=q.querySelector('input[type="text"],textarea');if(field)field.value=value}
 });
}
function answered(q){
 const checked=q?.querySelector('input[type="radio"]:checked,input[type="checkbox"]:checked');
 const field=q?.querySelector('input[type="text"],textarea');
 return Boolean(checked||String(field?.value||'').trim());
}
function answerMatches(given,expected){
 const g=norm(given),e=norm(expected);if(!g||!e)return false;if(g===e)return true;
 const variants=String(expected||'').split(/\s*\|\s*|\s*;\s*/).map(norm).filter(Boolean);
 if(variants.some(v=>g===v||g.includes(v)))return true;
 const words=e.split(' ').filter(w=>w.length>2);return words.length>1&&words.every(w=>g.includes(w));
}

async function persist(l,type,index,status='in_progress'){
 if(!student()||preview())return;
 const root=document.querySelector('.eg-separated-activity[data-activity-type="'+type+'"]');if(!root)return;
 const state={lessonId:l.id,activityType:type,title:type==='reading'?(l.title+' · Reading'):(l.listening?.title||l.title),instructions:type==='reading'?'Read the passage and answer the questions.':'Listen to the audio and answer the questions.',currentQuestion:index,responses:responseObject(root),status};
 writeLocal(l,type,state);
 try{
  const r=await api('/api/workbook-activities/state',{method:'POST',body:JSON.stringify(state)});
  const s=r.state||{};progressCache.set(activityId(l.id,type),{...s,activity_id:s.activity_id||activityId(l.id,type),responses:state.responses});
  root.querySelector('[data-sep-save-status]')?.replaceChildren(document.createTextNode('Saved'));
 }catch(e){const el=root.querySelector('[data-sep-save-status]');if(el)el.textContent='Saved on this device · sync retry needed'}
}
function schedulePersist(l,type,index){clearTimeout(saveTimer);const el=document.querySelector('.eg-separated-activity [data-sep-save-status]');if(el)el.textContent='Saving…';saveTimer=setTimeout(()=>persist(l,type,index),350)}

function questionField(q,i,type){
 const name=`sep-${type}-${i}`;
 if(type==='reading'||q?.type==='short'||q?.type==='open')return `<textarea class="sep-short-answer" rows="3" aria-label="Answer question ${i+1}"></textarea>`;
 const opts=Array.isArray(q?.options)?q.options:[];
 return `<div class="sep-choice-list">${opts.map((o,j)=>`<label class="sep-choice"><input type="radio" name="${name}" value="${escapeHtml(String(o))}"><span class="sep-choice-index">${String.fromCharCode(65+j)}</span><span>${escapeHtml(String(o))}</span></label>`).join('')}</div>`;
}
function questionMarkup(q,i,type){return `<article class="sep-question" data-sep-question="${i}" ${i?'hidden':''}><div class="sep-question-meta"><span>${type==='reading'?'Reading':'Listening'} · ${i+1}</span></div><h3>${escapeHtml(String(q?.q||''))}</h3>${questionField(q,i,type)}<div class="sep-question-feedback" data-sep-feedback></div></article>`}
function audioMarkup(){return `<div class="audio-player eg-audio-console" data-audio-player><button id="playAudio" class="play-btn" type="button" aria-label="Play or pause audio">▶</button><div class="eg-audio-body"><div class="audio-timeline"><input id="audioSeek" type="range" min="0" max="100" value="0" step="0.1" aria-label="Audio progress"><div class="audio-time"><span id="audioCurrent">0:00</span><span id="audioDuration">0:00</span></div></div></div><button id="restartAudio" class="audio-icon-btn" type="button" aria-label="Restart audio">↺</button><select id="audioSpeed" class="audio-speed" aria-label="Playback speed"><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option></select><span id="audioStatus" class="muted">Listen for the main idea first, then replay for detail.</span></div>`}

function renderSeparated(l,type){
 document.body.classList.remove('student-question-focus-mode','student-question-nav-active');
 const root=document.getElementById('activityPanel');if(!root)return;
 const qs=qsFor(l,type),saved=cachedState(l.id,type)||localState(l,type)||{},index=Math.min(Math.max(Number(saved.current_question??saved.currentQuestion??0)||0,0),Math.max(0,qs.length-1));
 const source=type==='reading'?`<details class="sep-source" open><summary>Reading passage</summary><div class="sep-reading-text">${escapeHtml(passageFor(l)).replace(/\n/g,'<br>')}</div></details>`:`<section class="sep-audio-source"><div><span class="eg-skill-kicker">Listening audio</span><h2>${escapeHtml(l.listening?.title||l.title)}</h2><p>Use the audio only. The transcript stays hidden during the task.</p></div>${audioMarkup()}</section>`;
 root.innerHTML=`<section class="eg-separated-activity" data-activity-type="${type}" data-activity-id="${escapeHtml(activityId(l.id,type))}"><header class="sep-hero"><div><span class="eg-skill-kicker">${type==='reading'?'Reading':'Listening'}</span><h1>${escapeHtml(type==='reading'?(l.title+' · Reading'):(l.listening?.title||l.title))}</h1><p>${type==='reading'?'Read the passage, then answer each question in your own words.':'Listen to the audio, then answer the listening questions.'}</p></div><div class="sep-status"><span data-sep-save-status>${preview()?'Preview':'Saved'}</span><strong data-sep-progress>${index+1} / ${qs.length}</strong></div></header><div class="sep-layout">${source}<section class="sep-question-panel"><div class="sep-question-track"><span data-sep-bar></span></div><div class="sep-question-list">${qs.map((q,i)=>questionMarkup(q,i,type)).join('')}</div><div class="sep-nav"><button class="ghost-btn" type="button" data-sep-back>← Back</button><button class="primary-btn" type="button" data-sep-next>Next →</button></div><div id="activityFeedback"></div></section></div></section>`;
 applyResponses(root,saved.responses||{});
 let current=index;
 const questions=[...root.querySelectorAll('[data-sep-question]')],back=root.querySelector('[data-sep-back]'),next=root.querySelector('[data-sep-next]'),bar=root.querySelector('[data-sep-bar]'),progress=root.querySelector('[data-sep-progress]');
 function show(i,focus=false){current=Math.min(Math.max(i,0),questions.length-1);questions.forEach((q,n)=>q.hidden=n!==current);back.disabled=current===0;next.disabled=!answered(questions[current]);next.textContent=current===questions.length-1?'Submit '+(type==='reading'?'Reading':'Listening'):'Next →';if(bar)bar.style.width=((current+1)/Math.max(1,questions.length)*100)+'%';if(progress)progress.textContent=(current+1)+' / '+questions.length;if(focus)questions[current]?.querySelector('h3')?.scrollIntoView({block:'nearest'});if(student())schedulePersist(l,type,current)}
 function onResponse(){next.disabled=!answered(questions[current]);if(student())schedulePersist(l,type,current)}
 root.addEventListener('input',onResponse);root.addEventListener('change',onResponse);
 back.onclick=()=>{if(current>0)show(current-1,true)};
 next.onclick=async()=>{if(!answered(questions[current]))return;if(current<questions.length-1){show(current+1,true);return}await submitSeparated(l,type,qs,root,current)};
 if(type==='listening'){
  if(document.getElementById('playAudio'))document.getElementById('playAudio').onclick=()=>playListening(l);
  if(typeof wireAudioControls==='function')wireAudioControls(l);
 }
 if(typeof wireMcqCards==='function')wireMcqCards();
 show(index,false);
}

async function submitSeparated(l,type,qs,root,current){
 const questions=[...root.querySelectorAll('[data-sep-question]')];
 if(questions.some(q=>!answered(q))){root.querySelector('#activityFeedback').innerHTML='<div class="feedback bad">Answer every question before submitting.</div>';return}
 let correct=0;
 const responses=responseObject(root);
 questions.forEach((el,i)=>{
  const given=responses[String(i)]||'',expected=String(qs[i]?.answer||''),ok=answerMatches(given,expected);if(ok)correct++;
  const f=el.querySelector('[data-sep-feedback]');if(f)f.innerHTML=`<div class="feedback ${ok?'good':'bad'}">${ok?'<strong>Correct.</strong>':'<strong>Review this answer.</strong> Correct answer: '+escapeHtml(expected)}</div>`;
 });
 const score=Math.round(correct/Math.max(1,qs.length)*100),feedback=root.querySelector('#activityFeedback');
 if(preview()){feedback.innerHTML=`<div class="feedback good"><strong>Preview complete.</strong> ${correct}/${qs.length} matched the answer key.</div>`;return}
 feedback.innerHTML='<div class="feedback">Saving your '+type+' result…</div>';
 try{
  await persist(l,type,current,'in_progress');
  const a=await api('/api/workbook-activities/attempts',{method:'POST',body:JSON.stringify({lessonId:l.id,activityType:type,title:type==='reading'?(l.title+' · Reading'):(l.listening?.title||l.title),score,correctCount:correct,incorrectCount:qs.length-correct,responses})});
  const c=await api('/api/workbook-activities/complete',{method:'POST',body:JSON.stringify({lessonId:l.id,activityType:type,title:type==='reading'?(l.title+' · Reading'):(l.listening?.title||l.title)})});
  progressCache.set(activityId(l.id,type),{...(c.state||{}),activity_id:activityId(l.id,type),status:'completed',responses});
  feedback.innerHTML=`<div class="performance-result ${score>=70?'good':'bad'}"><div class="performance-score"><strong>${score}%</strong><span>${correct} of ${qs.length} correct</span></div><p>${SEP_LABELS[type]} is complete. This score is stored separately from the other skill.</p></div>`;
  rebuildStages(l);
 }catch(e){writeLocal(l,type,{lessonId:l.id,activityType:type,currentQuestion:current,responses,status:'in_progress'});feedback.innerHTML=`<div class="feedback bad"><strong>Could not sync yet.</strong> Your answers are saved on this device. ${escapeHtml(e.message||'Try again when connected.')}</div>`}
}

function pauseListening(){try{if(typeof activeAudio!=='undefined'&&activeAudio){activeAudio.pause()}}catch{}}
function rebuildStages(l){
 const host=document.querySelector('.eg-stage-list nav')||document.querySelector('.eg-stage-list');if(!host)return;
 const steps=stepsFor(l),sid=session?.id;
 host.setAttribute('role','tablist');host.setAttribute('aria-label','Workbook activities');
 host.innerHTML=steps.map((step,i)=>{const done=student()&&stepDone(sid,l.id,step);return `<button class="eg-stage ${step===currentStep?'is-current':''} ${done?'is-done':''}" type="button" role="tab" aria-selected="${step===currentStep?'true':'false'}" data-sep-stage="${step}"><span>${done?'✓':i+1}</span><strong>${SEP_LABELS[step]}</strong></button>`}).join('');
 host.querySelectorAll('[data-sep-stage]').forEach(btn=>btn.onclick=async()=>{const next=btn.dataset.sepStage;if(next===currentStep)return;if(currentStep==='listening')pauseListening();const l0=lesson();if(currentStep==='reading'||currentStep==='listening'){const root=document.querySelector('.eg-separated-activity');if(root)await persist(l0,currentStep,Number(root.querySelector('[data-sep-progress]')?.textContent?.split('/')[0]||1)-1)}currentStep=next;workbook()});
}

const coreWorkbook=typeof workbook==='function'?workbook:null;
if(coreWorkbook){
 workbook=function separatedWorkbook(){
  const l=lesson();let intended=currentStep;
  const available=stepsFor(l);if(!available.includes(intended))intended=available[0]||'grammar';
  const scaffold=intended==='reading'?'listening':intended;
  currentStep=scaffold;coreWorkbook();currentStep=intended;
  rebuildStages(l);
  if(intended==='reading'||intended==='listening')renderSeparated(l,intended);
  if(student())loadProgress().then(()=>{if((currentStep==='reading'||currentStep==='listening')&&lesson()?.id===l.id){rebuildStages(l);const root=document.querySelector('.eg-separated-activity');if(root&&!root.dataset.remoteHydrated){root.dataset.remoteHydrated='1';renderSeparated(l,intended)}}});
 };
}

if(typeof firstOpenStep==='function'){
 firstOpenStep=function separatedFirstOpenStep(sid,lid){
  const l=(typeof lessonById==='function'?lessonById(lid):null)||lesson();
  return stepsFor(l).find(step=>!stepDone(sid,lid,step))||stepsFor(l).slice(-1)[0]||'grammar';
 };
}

// Stop listening audio whenever the student leaves the Listening activity.
document.addEventListener('click',e=>{if(currentStep==='listening'&&e.target.closest?.('[data-page],#backWorkbook,#previousActivity,.lesson-tab'))pauseListening()},true);

// Load separated progress as soon as a student session becomes available.
let booted=false;
const observer=new MutationObserver(()=>{if(!booted&&student()){booted=true;loadProgress(true)}});
observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
if(student()){booted=true;loadProgress(true)}

window.ENGLISHGATE_SEPARATED_WORKBOOK={steps:SEP_STEPS,labels:SEP_LABELS,loadProgress,stepsFor,qsFor,activityId};
})();
