/* EnglishGate Live Task — integrated Whiteboard classroom workspace */
(()=>{
'use strict';

let currentClass=null,currentDraft=null,activeTask=null,currentHost=null,currentResults=null;
let currentQuestionIndex=0,monitorToken=0,liveEndLocal=0,currentAnnotationController=null;
const revealedByTask=new Map();
const annotationStates=new Map();

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const getDb=()=>{try{return typeof getDB==='function'?getDB():null}catch{return null}};
const fmt=s=>{s=Math.max(0,Math.ceil(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};

function host(){return currentHost||window.EnglishGateWhiteboard?.getLiveTaskHost?.()||null}
function q(sel){return host()?.querySelector(sel)||null}
function qa(sel){return [...(host()?.querySelectorAll(sel)||[])]}
function setHtml(html){const h=host();if(h)h.innerHTML=html}
function classFromId(id){return (getDb()?.classes||[]).find(c=>c.id===id)||null}
function classSize(c){
  if(!c)return 0;
  return (getDb()?.users||[]).filter(u=>u.role==='student'&&Array.isArray(u.classIds)&&u.classIds.includes(c.id)).length;
}
function stopPolling(){monitorToken++;currentAnnotationController?.destroy?.();currentAnnotationController=null;window.EnglishGateWhiteboard?.setLiveAnnotationApi?.(null)}
function revealSet(taskId){
  const id=String(taskId||'draft');
  if(!revealedByTask.has(id))revealedByTask.set(id,new Set());
  return revealedByTask.get(id);
}
function promptElements(){
  return {
    input:window.EnglishGateWhiteboard?.getLivePromptInput?.()||document.getElementById('egWhiteboardLivePrompt'),
    button:window.EnglishGateWhiteboard?.getLiveGenerateButton?.()||document.getElementById('egWhiteboardGenerateLive'),
    status:window.EnglishGateWhiteboard?.getLiveStatus?.()||document.getElementById('egWhiteboardLiveStatus')
  };
}
function wirePrompt(handler,{disabled=false,label='Generate',placeholder='Create a quick check for this class',status=''}={}){
  const {input,button,status:statusEl}=promptElements();
  window.EnglishGateWhiteboard?.setLivePromptState?.({disabled,label,placeholder,status});
  if(!input||!button)return;
  button.onclick=handler?()=>handler(input.value.trim()):null;
  input.onkeydown=handler?e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handler(input.value.trim())}}:null;
  if(statusEl)statusEl.textContent=status||'';
}
function setPromptBusy(busy,status=''){
  const {input,button,status:statusEl}=promptElements();
  if(input)input.disabled=busy;
  if(button){button.disabled=busy;button.textContent=busy?'Generating…':'Generate'}
  if(statusEl)statusEl.textContent=status;
}

async function resolveTeachClass(){
  const localClassId=String(getDb()?.teacherContext?.classId||'').trim();
  if(localClassId){
    const localClass=classFromId(localClassId);
    if(localClass){
      if(localClass.approval_status&&localClass.approval_status!=='approved')throw new Error('This class is waiting for admin approval.');
      return localClass;
    }
  }
  const r=await api('/api/teacher/class-contexts');
  const ctx=r?.contexts?.[0];
  if(!ctx?.classId)throw new Error('Open a class in TEACH mode first.');
  const c=classFromId(ctx.classId);
  if(!c)throw new Error('The current teaching class could not be found.');
  if(c.approval_status&&c.approval_status!=='approved')throw new Error('This class is waiting for admin approval.');
  return c;
}

async function openInWhiteboard(target){
  if(target)currentHost=target;
  stopPolling();
  setHtml('<div class="eg-live-loading"><strong>Opening Live Task…</strong><span>Connecting to the current class.</span></div>');
  try{
    currentClass=await resolveTeachClass();
    const active=await api('/api/teacher/live-tasks/current?classId='+encodeURIComponent(currentClass.id));
    if(active?.task)return openMonitor(active.task,active.serverNow);
    openBuilder();
  }catch(e){
    setHtml('<div class="eg-live-loading"><strong>Live Task could not open</strong><span class="eg-live-error">'+esc(e.message)+'</span></div>');
    wirePrompt(null,{disabled:true,label:'Unavailable',status:e.message});
  }
}

function openBuilder(){
  stopPolling();activeTask=null;currentResults=null;currentDraft=null;currentQuestionIndex=0;
  wirePrompt(generateFromPrompt,{disabled:false,label:'Generate',placeholder:'Create 5 questions about going to, 5 minutes',status:currentClass?.name||''});
  setHtml(`<div class="eg-live-grid eg-live-builder-grid">
    <main class="eg-live-main-pane">
      <div class="eg-live-empty-board">
        <span class="eg-live-kicker">Live Task</span>
        <h1>Create a quick classroom check</h1>
        <p>Use the prompt in the top bar. The activity will appear here for review before students receive it.</p>
        <div class="eg-live-prompt-examples">
          <button type="button" data-prompt-example="Give me 5 MCQs about going to. 5 minutes.">5 MCQs · going to</button>
          <button type="button" data-prompt-example="Give me 5 MCQs about present simple. 5 minutes.">5 MCQs · present simple</button>
          <button type="button" data-prompt-example="Give the students a writing task about future plans. 7 minutes.">Writing · future plans</button>
        </div>
      </div>
    </main>
    <aside class="eg-live-side-pane">
      <div class="eg-live-side-head"><span class="eg-live-kicker">Class</span><h2>${esc(currentClass?.name||'Current class')}</h2><p>${classSize(currentClass)} enrolled students</p></div>
      <div class="eg-live-side-note"><strong>How it works</strong><span>Generate → review → send. During the activity this panel becomes the live student-status panel.</span></div>
    </aside>
  </div>`);
  qa('[data-prompt-example]').forEach(b=>b.onclick=()=>{
    const input=promptElements().input;if(input){input.value=b.dataset.promptExample;input.focus()}
  });
}

async function generateFromPrompt(request){
  const status=promptElements().status;
  if(!request){if(status)status.textContent='Type what you want students to do.';return}
  setPromptBusy(true,'Preparing activity…');
  try{
    const d=await api('/api/teacher/live-tasks/prepare',{method:'POST',body:JSON.stringify({classId:currentClass.id,request})});
    currentDraft=d;currentQuestionIndex=0;renderDraft();
    setPromptBusy(false,'Preview ready');
  }catch(e){
    setPromptBusy(false,e.message);
    if(status)status.classList.add('is-error');
  }
}

function renderDraft(){
  if(!currentDraft)return openBuilder();
  currentAnnotationController?.destroy?.();currentAnnotationController=null;
  setHtml(`<div class="eg-live-grid eg-live-builder-grid">
    <main class="eg-live-main-pane" data-draft-main></main>
    <aside class="eg-live-side-pane">
      <div class="eg-live-side-head"><span class="eg-live-kicker">Ready to send</span><h2>${esc(currentClass?.name||'Class')}</h2><p>${classSize(currentClass)} enrolled students</p></div>
      <div class="eg-live-setup-fields">
        <label>Activity title<input data-draft-title maxlength="100" value="${esc(currentDraft.title)}"></label>
        <label>Timer<input data-draft-minutes type="number" min="1" max="60" value="${Math.max(1,Math.round(currentDraft.durationSeconds/60))}"><span>minutes</span></label>
      </div>
      <div class="eg-live-side-note"><strong>Teacher approval</strong><span>Edit the question and answers before sending. Nothing is sent automatically.</span></div>
      <button class="eg-live-primary eg-live-send" data-draft-send type="button">Send to students</button>
      <div class="eg-live-side-feedback" data-draft-feedback></div>
    </aside>
  </div>`);
  q('[data-draft-send]').onclick=launchDraft;
  renderDraftQuestion();
}

function saveDraftQuestion(){
  if(!currentDraft)return;
  if(currentDraft.taskType==='writing'){
    const instructions=q('[data-draft-writing]')?.value.trim();
    const minWords=Number(q('[data-draft-minwords]')?.value)||40;
    if(instructions!==undefined)currentDraft.content.instructions=instructions;
    currentDraft.content.minWords=minWords;
    return;
  }
  const item=currentDraft.content.questions?.[currentQuestionIndex];if(!item)return;
  const text=q('[data-draft-question]')?.value.trim();
  const options=qa('[data-draft-option]').map(x=>x.value.trim());
  const answer=Number(q('[data-draft-answer]')?.value);
  if(text)item.q=text;
  if(options.length)item.options=options;
  if(Number.isInteger(answer))item.answer=answer;
}
function changeDraftQuestion(delta){
  saveDraftQuestion();
  const total=currentDraft?.content?.questions?.length||1;
  currentQuestionIndex=Math.max(0,Math.min(total-1,currentQuestionIndex+delta));
  renderDraftQuestion();
}
function renderDraftQuestion(){
  const main=q('[data-draft-main]');if(!main||!currentDraft)return;
  if(currentDraft.taskType==='writing'){
    main.innerHTML=`<div class="eg-live-pane-head"><div><span class="eg-live-kicker">Preview</span><h2>Writing task</h2></div></div>
      <div class="eg-live-draft-writing"><label>Instructions<textarea data-draft-writing rows="8">${esc(currentDraft.content.instructions||'')}</textarea></label><label class="eg-live-minwords">Minimum words<input data-draft-minwords type="number" min="1" max="500" value="${Number(currentDraft.content.minWords)||40}"></label></div>`;
    return;
  }
  const items=currentDraft.content.questions||[],item=items[currentQuestionIndex];if(!item)return;
  main.innerHTML=`<div class="eg-live-pane-head">
      <div><span class="eg-live-kicker">Preview · Question ${currentQuestionIndex+1} of ${items.length}</span><h2>Edit before sending</h2></div>
      <div class="eg-live-question-nav"><button type="button" data-draft-prev ${currentQuestionIndex===0?'disabled':''}>← Previous</button><button type="button" data-draft-next ${currentQuestionIndex===items.length-1?'disabled':''}>Next →</button></div>
    </div>
    <div class="eg-live-draft-question">
      <label class="eg-live-draft-question-text">Question<textarea data-draft-question rows="3">${esc(item.q)}</textarea></label>
      <div class="eg-live-draft-options">${item.options.map((o,j)=>`<label><span>${String.fromCharCode(65+j)}</span><input data-draft-option="${j}" value="${esc(o)}"></label>`).join('')}</div>
      <label class="eg-live-correct-select">Correct answer<select data-draft-answer>${item.options.map((_,j)=>`<option value="${j}" ${j===Number(item.answer)?'selected':''}>${String.fromCharCode(65+j)}</option>`).join('')}</select></label>
    </div>`;
  q('[data-draft-prev]')?.addEventListener('click',()=>changeDraftQuestion(-1));
  q('[data-draft-next]')?.addEventListener('click',()=>changeDraftQuestion(1));
}

async function launchDraft(){
  saveDraftQuestion();
  const btn=q('[data-draft-send]'),feedback=q('[data-draft-feedback]');
  if(!btn||!currentDraft)return;
  btn.disabled=true;btn.textContent='Sending…';if(feedback)feedback.textContent='';
  try{
    const title=q('[data-draft-title]')?.value.trim()||currentDraft.title;
    const durationSeconds=(Number(q('[data-draft-minutes]')?.value)||5)*60;
    const content=currentDraft.taskType==='mcq'
      ?{topic:currentDraft.content.topic,tip:currentDraft.content.tip,questions:currentDraft.content.questions}
      :{topic:currentDraft.content.topic,instructions:currentDraft.content.instructions,minWords:currentDraft.content.minWords};
    const r=await api('/api/teacher/live-tasks',{method:'POST',body:JSON.stringify({
      classId:currentClass.id,requestText:currentDraft.requestText,taskType:currentDraft.taskType,title,durationSeconds,content
    })});
    currentDraft=null;openMonitor(r.task,r.serverNow);
  }catch(e){
    if(feedback){feedback.textContent=e.message;feedback.classList.add('is-error')}
    btn.disabled=false;btn.textContent='Send to students';
  }
}

function openMonitor(task,serverNow){
  stopPolling();activeTask=task;currentResults=null;
  const total=task.taskType==='mcq'?(task.content?.questions?.length||1):1;
  currentQuestionIndex=Math.max(0,Math.min(currentQuestionIndex,total-1));
  const offset=Date.now()-new Date(serverNow||Date.now()).getTime();
  liveEndLocal=new Date(task.endsAt).getTime()+offset;
  wirePrompt(null,{disabled:true,label:'Live now',placeholder:'Live task is running',status:(task.className||currentClass?.name||'Class')+' · activity in progress'});
  setHtml(`<div class="eg-live-grid eg-live-active-grid">
    <main class="eg-live-main-pane" data-active-main></main>
    <aside class="eg-live-side-pane" data-active-side></aside>
  </div>`);
  renderActiveQuestion();
  renderLiveSide(null);
  const token=++monitorToken;
  const tick=()=>{
    if(token!==monitorToken)return;
    const clock=q('[data-live-timer]');if(clock)clock.textContent=fmt((liveEndLocal-Date.now())/1000);
    if(Date.now()<liveEndLocal)setTimeout(tick,500);
  };
  tick();
  const poll=async()=>{
    if(token!==monitorToken)return;
    try{currentResults=await api('/api/teacher/live-tasks/'+encodeURIComponent(task.id)+'/results');renderLiveSide(currentResults)}catch{}
    if(token===monitorToken)setTimeout(poll,2000);
  };
  poll();
}

function changeActiveQuestion(delta){
  if(!activeTask||activeTask.taskType!=='mcq')return;
  const total=activeTask.content?.questions?.length||1;
  currentQuestionIndex=Math.max(0,Math.min(total-1,currentQuestionIndex+delta));
  renderActiveQuestion();renderLiveSide(currentResults);
}
function toggleReveal(){
  if(!activeTask||activeTask.taskType!=='mcq')return;
  const item=activeTask.content.questions[currentQuestionIndex],set=revealSet(activeTask.id);
  if(set.has(item.id))set.delete(item.id);else set.add(item.id);
  renderActiveQuestion();renderLiveSide(currentResults);
}
function renderActiveQuestion(){
  const main=q('[data-active-main]');if(!main||!activeTask)return;
  currentAnnotationController?.destroy?.();currentAnnotationController=null;
  if(activeTask.taskType==='writing'){
    main.innerHTML=`<div class="eg-live-pane-head"><div><span class="eg-live-kicker">Live Task · Writing</span><h2>${esc(activeTask.title)}</h2></div></div>
      <div class="eg-live-question-surface" data-annotation-surface>
        <div class="eg-live-question-content eg-live-writing-prompt"><span class="eg-live-question-number">Writing</span><h1>${esc(activeTask.content.instructions||'')}</h1><p>Minimum ${Number(activeTask.content.minWords)||0} words</p></div>
        <canvas class="eg-live-annotation-canvas" data-annotation-canvas></canvas>
      </div>`;
    bindAnnotationCanvas(main.querySelector('[data-annotation-surface]'),main.querySelector('[data-annotation-canvas]'),activeTask.id+':writing');
    return;
  }
  const items=activeTask.content?.questions||[],item=items[currentQuestionIndex];if(!item)return;
  const revealed=revealSet(activeTask.id).has(item.id),answerIndex=Number(item.answer);
  main.innerHTML=`<div class="eg-live-pane-head">
      <div><span class="eg-live-kicker">Question ${currentQuestionIndex+1} of ${items.length}</span><h2>${esc(activeTask.title)}</h2></div>
      <div class="eg-live-question-nav"><button type="button" data-active-prev ${currentQuestionIndex===0?'disabled':''}>← Previous</button><button type="button" data-active-next ${currentQuestionIndex===items.length-1?'disabled':''}>Next →</button></div>
    </div>
    <div class="eg-live-question-surface" data-annotation-surface>
      <div class="eg-live-question-content">
        <span class="eg-live-question-number">${currentQuestionIndex+1}</span>
        <h1>${esc(item.q)}</h1>
        <div class="eg-live-board-options">${item.options.map((o,j)=>`<div class="eg-live-board-option ${revealed&&j===answerIndex?'is-correct':''}"><span>${String.fromCharCode(65+j)}</span><strong>${esc(o)}</strong>${revealed&&j===answerIndex?'<b>Correct</b>':''}</div>`).join('')}</div>
        ${revealed?`<div class="eg-live-answer-reveal"><span>Correct answer</span><strong>${String.fromCharCode(65+answerIndex)}. ${esc(item.options[answerIndex]||'')}</strong>${item.explanation?`<p>${esc(item.explanation)}</p>`:''}</div>`:''}
      </div>
      <canvas class="eg-live-annotation-canvas" data-annotation-canvas></canvas>
    </div>
    <div class="eg-live-board-footer"><span>Use Pen, Highlighter or Text above to work through the question before revealing the answer.</span><button class="${revealed?'eg-live-secondary':'eg-live-primary'}" type="button" data-reveal-answer>${revealed?'Hide answer':'Reveal answer'}</button></div>`;
  q('[data-active-prev]')?.addEventListener('click',()=>changeActiveQuestion(-1));
  q('[data-active-next]')?.addEventListener('click',()=>changeActiveQuestion(1));
  q('[data-reveal-answer]')?.addEventListener('click',toggleReveal);
  bindAnnotationCanvas(main.querySelector('[data-annotation-surface]'),main.querySelector('[data-annotation-canvas]'),activeTask.id+':'+item.id);
}

function statusLabel(status){
  if(status==='submitted')return 'Submitted';
  if(status==='working')return 'Working';
  return 'Waiting';
}
function renderLiveSide(r){
  const side=q('[data-active-side]');if(!side||!activeTask)return;
  const students=Array.isArray(r?.students)?r.students:[];
  const working=Number(r?.workingCount||0),submitted=Number(r?.submittedCount||0),connected=Number(r?.connectedCount||submitted+working),roster=Number(r?.rosterCount||classSize(currentClass));
  const sorted=[...students].sort((a,b)=>({working:0,submitted:1,waiting:2}[a.status]??3)-({working:0,submitted:1,waiting:2}[b.status]??3)||String(a.name).localeCompare(String(b.name)));
  let distribution='';
  if(activeTask.taskType==='mcq'){
    const item=activeTask.content.questions[currentQuestionIndex],stat=(r?.questionStats||[]).find(x=>x.id===item.id)||(r?.questionStats||[])[currentQuestionIndex],choices=stat?.choices||[];
    const max=Math.max(1,...choices),revealed=revealSet(activeTask.id).has(item.id),answer=Number(item.answer);
    distribution=`<section class="eg-live-response-block"><div class="eg-live-side-title"><strong>Responses · Q${currentQuestionIndex+1}</strong><span>${Number(stat?.answered||0)} answers</span></div>
      <div class="eg-live-choice-bars">${item.options.map((o,j)=>`<div class="eg-live-choice-row ${revealed&&j===answer?'is-correct':''}"><span>${String.fromCharCode(65+j)}</span><div><i style="width:${Math.round((Number(choices[j]||0)/max)*100)}%"></i></div><strong>${Number(choices[j]||0)}</strong></div>`).join('')}</div>
      ${revealed&&stat?`<div class="eg-live-understanding"><strong>${stat.correctPct}% correct</strong><span>Use this as one piece of classroom evidence, not a final mastery judgment.</span></div>`:''}
    </section>`;
  }
  side.innerHTML=`<div class="eg-live-livehead"><div><span class="eg-live-dot"></span><strong>LIVE</strong><small>${esc(activeTask.className||currentClass?.name||'Class')}</small></div><div class="eg-live-timer" data-live-timer>${fmt((liveEndLocal-Date.now())/1000)}</div></div>
    <div class="eg-live-mini-metrics"><div><strong>${connected}</strong><span>active</span></div><div><strong>${working}</strong><span>working</span></div><div><strong>${submitted}/${roster}</strong><span>submitted</span></div></div>
    <section class="eg-live-students-block">
      <div class="eg-live-side-title"><strong>Students</strong><span>updates live</span></div>
      <div class="eg-live-student-list">${sorted.length?sorted.map(s=>`<div class="eg-live-student-row is-${esc(s.status)}"><span class="eg-live-status-dot"></span><div><strong>${esc(s.name)}</strong><small>${statusLabel(s.status)}${s.timedOut?' · late':''}</small></div>${s.status==='submitted'&&s.score!==null&&s.score!==undefined?'<b>'+Number(s.score)+'%</b>':''}</div>`).join(''):'<div class="eg-live-side-empty">Waiting for students to open the activity…</div>'}</div>
    </section>
    ${distribution}
    <div class="eg-live-side-actions"><button class="eg-live-danger" type="button" data-end-live>End task</button></div>`;
  q('[data-end-live]')?.addEventListener('click',endTask);
}

async function endTask(){
  if(!activeTask||!confirm('End this live task now?'))return;
  try{await api('/api/teacher/live-tasks/'+encodeURIComponent(activeTask.id)+'/close',{method:'PATCH'});stopPolling();activeTask=null;openBuilder()}catch(e){
    const status=promptElements().status;if(status)status.textContent=e.message;
  }
}

function annotationStorageKey(key){return 'englishgate_live_annotation_'+String(key).replace(/[^a-zA-Z0-9:_-]/g,'_')}
function loadAnnotationState(key){
  if(annotationStates.has(key))return annotationStates.get(key);
  let state={actions:[]};
  try{const raw=localStorage.getItem(annotationStorageKey(key));const parsed=raw?JSON.parse(raw):null;if(parsed&&Array.isArray(parsed.actions))state=parsed}catch{}
  annotationStates.set(key,state);return state;
}
function saveAnnotationState(key,state){
  try{localStorage.setItem(annotationStorageKey(key),JSON.stringify(state))}catch{}
}
function bindAnnotationCanvas(surface,canvas,key){
  if(!surface||!canvas)return;
  currentAnnotationController?.destroy?.();
  const state=loadAnnotationState(key);
  let ctx=null,drawing=false,currentStroke=null,resizeObserver=null,textEditor=null;
  const point=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/Math.max(1,r.width),y:(e.clientY-r.top)/Math.max(1,r.height)}};
  const toolState=()=>window.EnglishGateWhiteboard?.getToolState?.()||{tool:'pen',color:'#0F172A',width:4};
  const redraw=()=>{
    if(!ctx)return;const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.lineCap='round';ctx.lineJoin='round';
    for(const a of state.actions){
      if(a.type==='text'){
        ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.fillStyle=a.color||'#0F172A';ctx.font=`600 ${a.size||22}px system-ui, sans-serif`;ctx.textBaseline='top';ctx.fillText(a.text,(a.x||0)*w,(a.y||0)*h);continue;
      }
      if(a.type!=='stroke'||!Array.isArray(a.points)||!a.points.length)continue;
      ctx.globalCompositeOperation=a.tool==='eraser'?'destination-out':'source-over';ctx.globalAlpha=a.tool==='highlighter'?.24:1;ctx.strokeStyle=a.color||'#0F172A';ctx.lineWidth=a.tool==='eraser'?Math.max(22,(a.width||4)*4):a.tool==='highlighter'?Math.max(16,(a.width||4)*4):(a.width||4);
      ctx.beginPath();ctx.moveTo(a.points[0].x*w,a.points[0].y*h);for(let i=1;i<a.points.length;i++)ctx.lineTo(a.points[i].x*w,a.points[i].y*h);ctx.stroke();ctx.closePath();
    }
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  };
  const resize=()=>{const r=surface.getBoundingClientRect();canvas.width=Math.max(1,Math.round(r.width));canvas.height=Math.max(1,Math.round(r.height));ctx=canvas.getContext('2d');redraw()};
  const syncPointer=()=>{
    const t=toolState().tool;
    canvas.style.pointerEvents=t==='pointer'?'none':'auto';
    canvas.style.cursor=t==='text'?'text':t==='eraser'?'cell':'crosshair';
  };
  const closeTextEditor=commit=>{
    if(!textEditor)return;
    const input=textEditor,text=input.value.trim(),x=Number(input.dataset.x),y=Number(input.dataset.y),s=toolState();
    textEditor=null;input.remove();
    if(commit&&text){state.actions.push({type:'text',text,x,y,color:s.color,size:Math.max(20,Number(s.width||4)*4)});saveAnnotationState(key,state);redraw()}
  };
  const openTextEditor=e=>{
    closeTextEditor(false);
    const p=point(e),r=surface.getBoundingClientRect(),input=document.createElement('input');
    input.className='eg-live-inline-text';input.placeholder='Type, then press Enter';input.dataset.x=String(p.x);input.dataset.y=String(p.y);
    input.style.left=Math.max(8,e.clientX-r.left)+'px';input.style.top=Math.max(8,e.clientY-r.top)+'px';surface.appendChild(input);textEditor=input;input.focus();
    input.onkeydown=ev=>{if(ev.key==='Enter'){ev.preventDefault();closeTextEditor(true)}else if(ev.key==='Escape'){ev.preventDefault();closeTextEditor(false)}};
    input.onblur=()=>closeTextEditor(true);
  };
  const down=e=>{
    const s=toolState();if(s.tool==='pointer')return;
    if(s.tool==='text'){e.preventDefault();openTextEditor(e);return}
    e.preventDefault();drawing=true;currentStroke={type:'stroke',tool:s.tool,color:s.color,width:Number(s.width)||4,points:[point(e)]};state.actions.push(currentStroke);canvas.setPointerCapture?.(e.pointerId);redraw();
  };
  const move=e=>{if(!drawing||!currentStroke)return;e.preventDefault();currentStroke.points.push(point(e));redraw()};
  const finish=e=>{if(!drawing)return;drawing=false;currentStroke=null;saveAnnotationState(key,state);try{canvas.releasePointerCapture?.(e.pointerId)}catch{}};
  const toolListener=()=>syncPointer();
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);
  window.addEventListener('englishgate:whiteboard-tool',toolListener);
  if(typeof ResizeObserver!=='undefined'){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(surface)}
  resize();syncPointer();
  const api={
    undo(){closeTextEditor(false);state.actions.pop();saveAnnotationState(key,state);redraw()},
    clear(){closeTextEditor(false);state.actions=[];saveAnnotationState(key,state);redraw()}
  };
  window.EnglishGateWhiteboard?.setLiveAnnotationApi?.(api);
  currentAnnotationController={
    destroy(){
      closeTextEditor(false);resizeObserver?.disconnect();window.removeEventListener('englishgate:whiteboard-tool',toolListener);
      window.EnglishGateWhiteboard?.setLiveAnnotationApi?.(null);
    }
  };
}

window.EnglishGateLiveTask={openInWhiteboard,stopPolling};
})();