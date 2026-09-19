/* EnglishGate Live Task — integrated Whiteboard classroom workspace */
(()=>{
'use strict';

let currentClass=null,currentDraft=null,activeTask=null,currentHost=null,currentResults=null;
let currentQuestionIndex=0,monitorToken=0,liveEndLocal=0,currentAnnotationController=null,reviewStudentId=null,activeLiveView='questions',viewingRecentTask=false;
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
function stopPolling(){monitorToken++;currentAnnotationController?.destroy?.();currentAnnotationController=null;reviewStudentId=null;window.EnglishGateWhiteboard?.setLiveAnnotationApi?.(null)}
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
  const candidates=[];
  const dbClassId=String(getDb()?.teacherContext?.classId||'').trim();
  if(dbClassId)candidates.push(dbClassId);
  try{
    if(typeof activeTeacherClassId!=='undefined'&&String(activeTeacherClassId||'').trim())candidates.push(String(activeTeacherClassId).trim());
  }catch{}
  try{
    if(typeof teacherResumeContext==='function'){
      const resumed=teacherResumeContext();
      if(resumed?.c?.id)candidates.push(String(resumed.c.id).trim());
      else if(resumed?.ctx?.classId)candidates.push(String(resumed.ctx.classId).trim());
    }
  }catch{}
  for(const classId of [...new Set(candidates.filter(Boolean))]){
    const c=classFromId(classId);
    if(!c)continue;
    if(c.approval_status&&c.approval_status!=='approved')throw new Error('This class is waiting for admin approval.');
    return c;
  }
  throw new Error('Open a class in TEACH mode first.');
}

async function openInWhiteboard(target){
  if(target)currentHost=target;
  stopPolling();
  setHtml('<div class="eg-live-loading"><strong>Opening Live Task…</strong><span>Connecting to the current class.</span></div>');
  try{
    currentClass=await resolveTeachClass();
    const active=await api('/api/teacher/live-tasks/current?classId='+encodeURIComponent(currentClass.id));
    if(active?.task)return openMonitor(active.task,active.serverNow,false);
    if(active?.recentTask)return openMonitor(active.recentTask,active.serverNow,true);
    openBuilder();
  }catch(e){
    setHtml('<div class="eg-live-loading"><strong>Live Task could not open</strong><span class="eg-live-error">'+esc(e.message)+'</span></div>');
    wirePrompt(null,{disabled:true,label:'Unavailable',status:e.message});
  }
}

function openBuilder(){
  stopPolling();activeTask=null;currentResults=null;currentDraft=null;currentQuestionIndex=0;viewingRecentTask=false;
  wirePrompt(generateFromPrompt,{disabled:false,label:'Generate',placeholder:'Create 5 questions about going to, 5 minutes',status:currentClass?.name||''});
  setHtml(`<div class="eg-live-grid eg-live-builder-grid">
    <main class="eg-live-main-pane">
      <div class="eg-live-empty-board">
        <span class="eg-live-kicker">Live Task</span>
        <h1>Create a quick classroom check</h1>
        <p>Use the prompt in the top bar. The activity will appear here for review before students receive it.</p>
        <div class="eg-live-prompt-examples">
          <button type="button" data-prompt-example="Create 5 mixed questions about present perfect for B2. 5 minutes.">Mixed check</button>
          <button type="button" data-prompt-example="Create 5 fill-in-the-blank questions about for and since. 5 minutes.">Fill blanks</button>
          <button type="button" data-prompt-example="Create a matching task about travel vocabulary. 5 minutes.">Matching</button>
          <button type="button" data-prompt-example="Create 3 individual speaking prompts about future plans. 6 minutes.">Speaking</button>
          <button type="button" data-prompt-example="Create a pair discussion about work and careers. 7 minutes.">Pair discussion</button>
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
      <div class="eg-live-side-note"><strong>Presenter-safe preview</strong><span>Student-facing content stays visible, but answer keys are hidden by default. Stop screen sharing before opening a private answer key.</span></div>
      <button class="eg-live-primary eg-live-send" data-draft-send type="button">Send to students</button>
      <div class="eg-live-side-feedback" data-draft-feedback></div>
    </aside>
  </div>`);
  q('[data-draft-send]').onclick=launchDraft;
  renderDraftQuestion();
}

function typeLabel(type){
  return ({
    multiple_choice:'Multiple choice',true_false:'True / False',short_answer:'Short answer',
    fill_blank:'Fill in the blank',sentence_correction:'Sentence correction',matching:'Matching',
    ordering:'Ordering',sentence_construction:'Sentence construction',teacher_speaking:'Teacher-led speaking',
    individual_speaking:'Individual speaking',pair_discussion:'Pair discussion'
  })[type]||'Activity';
}
function isChoice(type){return type==='multiple_choice'||type==='true_false'}
function isText(type){return ['short_answer','fill_blank','sentence_correction','sentence_construction'].includes(type)}
function isSpeaking(type){return ['teacher_speaking','individual_speaking','pair_discussion'].includes(type)}

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
  const prompt=q('[data-draft-question]')?.value.trim();
  if(prompt)item.prompt=prompt;
  if(isChoice(item.type)){
    const options=qa('[data-draft-option]').map(x=>x.value.trim());
    const answer=Number(q('[data-draft-answer]')?.value);
    if(options.length)item.options=options;
    if(Number.isInteger(answer))item.answer=answer;
  }else if(isText(item.type)){
    const values=String(q('[data-draft-answers]')?.value||'').split(/\n|\|/).map(x=>x.trim()).filter(Boolean);
    item.acceptedAnswers=values;
  }else if(item.type==='matching'){
    item.pairs=qa('[data-draft-pair]').map(row=>({left:row.querySelector('[data-pair-left]')?.value.trim()||'',right:row.querySelector('[data-pair-right]')?.value.trim()||''})).filter(x=>x.left&&x.right);
  }else if(item.type==='ordering'){
    item.items=String(q('[data-draft-items]')?.value||'').split('\n').map(x=>x.trim()).filter(Boolean);
    item.correctOrder=String(q('[data-draft-order]')?.value||'').split('\n').map(x=>x.trim()).filter(Boolean);
  }else if(isSpeaking(item.type)){
    item.successCriteria=String(q('[data-draft-criteria]')?.value||'').split('\n').map(x=>x.trim()).filter(Boolean);
  }
}
function changeDraftQuestion(delta){
  saveDraftQuestion();
  const total=currentDraft?.content?.questions?.length||1;
  currentQuestionIndex=Math.max(0,Math.min(total-1,currentQuestionIndex+delta));
  renderDraftQuestion();
}
function draftTypeEditor(item){
  if(isChoice(item.type)){
    return `<div class="eg-live-draft-options">${(item.options||[]).map((o,j)=>`<label><span>${String.fromCharCode(65+j)}</span><input data-draft-option="${j}" value="${esc(o)}"></label>`).join('')}</div>
      <details class="eg-live-private-key"><summary>Private answer key · hidden</summary><div class="eg-live-private-key-body"><p>Stop screen sharing before opening or editing the answer key.</p><label class="eg-live-correct-select">Correct answer<select data-draft-answer>${(item.options||[]).map((_,j)=>`<option value="${j}" ${j===Number(item.answer)?'selected':''}>${String.fromCharCode(65+j)}</option>`).join('')}</select></label></div></details>`;
  }
  if(isText(item.type)){
    return `<details class="eg-live-private-key"><summary>Private answer key · hidden</summary><div class="eg-live-private-key-body"><p>Stop screen sharing before opening or editing the answer key.</p><label>Accepted answer(s) <small>One per line. Leave blank for teacher-reviewed open response.</small><textarea data-draft-answers rows="5">${esc((item.acceptedAnswers||[]).join('\n'))}</textarea></label></div></details>`;
  }
  if(item.type==='matching'){
    return `<div class="eg-live-board-matching"><div>${(item.pairs||[]).map((p,i)=>`<span><b>${i+1}</b>${esc(p.left)}</span>`).join('')}</div><div>${(item.pairs||[]).map((p,i)=>`<span><b>${String.fromCharCode(65+i)}</b>${esc(p.right)}</span>`).join('')}</div></div><details class="eg-live-private-key"><summary>Private matching key · hidden</summary><div class="eg-live-private-key-body"><p>Stop screen sharing before opening or editing the matching key.</p><div class="eg-live-draft-pairs">${(item.pairs||[]).map((p,j)=>`<div data-draft-pair="${j}"><input data-pair-left value="${esc(p.left)}"><span>↔</span><input data-pair-right value="${esc(p.right)}"></div>`).join('')}</div></div></details>`;
  }
  if(item.type==='ordering'){
    return `<div class="eg-live-order-edit"><label>Items shown to students<textarea data-draft-items rows="6">${esc((item.items||[]).join('\n'))}</textarea></label></div><details class="eg-live-private-key"><summary>Private correct order · hidden</summary><div class="eg-live-private-key-body"><p>Stop screen sharing before opening or editing the correct order.</p><label>Correct order<textarea data-draft-order rows="6">${esc((item.correctOrder||[]).join('\n'))}</textarea></label></div></details>`;
  }
  if(isSpeaking(item.type)){
    return `<details class="eg-live-private-key"><summary>Private success criteria · hidden</summary><div class="eg-live-private-key-body"><p>Stop screen sharing before opening or editing the criteria.</p><label>Success criteria<textarea data-draft-criteria rows="5">${esc((item.successCriteria||[]).join('\n'))}</textarea></label></div></details>`;
  }
  return '';
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
      <div><span class="eg-live-kicker">Preview · Question ${currentQuestionIndex+1} of ${items.length}</span><h2>${esc(typeLabel(item.type))}</h2></div>
      <div class="eg-live-question-nav"><button type="button" data-draft-prev ${currentQuestionIndex===0?'disabled':''}>← Previous</button><button type="button" data-draft-next ${currentQuestionIndex===items.length-1?'disabled':''}>Next →</button></div>
    </div>
    <div class="eg-live-draft-question">
      <label class="eg-live-draft-question-text">Prompt<textarea data-draft-question rows="3">${esc(item.prompt||'')}</textarea></label>
      ${draftTypeEditor(item)}
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
    const content=currentDraft.taskType==='writing'
      ?{topic:currentDraft.content.topic,instructions:currentDraft.content.instructions,minWords:currentDraft.content.minWords}
      :{topic:currentDraft.content.topic,tip:currentDraft.content.tip,questions:currentDraft.content.questions};
    const r=await api('/api/teacher/live-tasks',{method:'POST',body:JSON.stringify({
      classId:currentClass.id,requestText:currentDraft.requestText,taskType:currentDraft.taskType,title,durationSeconds,content
    })});
    currentDraft=null;openMonitor(r.task,r.serverNow);
  }catch(e){
    if(feedback){feedback.textContent=e.message;feedback.classList.add('is-error')}
    btn.disabled=false;btn.textContent='Send to students';
  }
}

function openMonitor(task,serverNow,recent=false){
  stopPolling();activeTask=task;currentResults=null;viewingRecentTask=Boolean(recent);
  const total=task.taskType==='activity'?(task.content?.questions?.length||1):1;
  currentQuestionIndex=Math.max(0,Math.min(currentQuestionIndex,total-1));
  const offset=Date.now()-new Date(serverNow||Date.now()).getTime();
  liveEndLocal=new Date(task.endsAt).getTime()+offset;
  wirePrompt(null,{disabled:true,label:viewingRecentTask?'Ended':'Live now',placeholder:viewingRecentTask?'Previous live task results':'Live task is running',status:(task.className||currentClass?.name||'Class')+(viewingRecentTask?' · previous submissions':' · activity in progress')});
  activeLiveView='questions';reviewStudentId=null;
  setHtml(`<div class="eg-live-grid eg-live-active-grid">
    <nav class="eg-live-left-tabs" data-active-tabs aria-label="Live Task views"></nav>
    <main class="eg-live-main-pane" data-active-main></main>
    <aside class="eg-live-side-pane" data-active-side></aside>
  </div>`);
  renderActiveTabs();
  renderActiveQuestion();
  renderLiveSide(null);
  const token=++monitorToken;
  const tick=()=>{
    if(token!==monitorToken)return;
    const clock=q('[data-live-timer]');if(clock)clock.textContent=fmt((liveEndLocal-Date.now())/1000);
    if(!viewingRecentTask&&Date.now()<liveEndLocal)setTimeout(tick,500);
  };
  tick();
  const poll=async()=>{
    if(token!==monitorToken)return;
    try{
      currentResults=await api('/api/teacher/live-tasks/'+encodeURIComponent(task.id)+'/results');
      if(currentResults?.task?.endsAt){const serverMs=new Date(currentResults.serverNow||Date.now()).getTime(),offset=Date.now()-serverMs;liveEndLocal=new Date(currentResults.task.endsAt).getTime()+offset;activeTask={...activeTask,...currentResults.task}}
      renderLiveSide(currentResults);renderActiveTabs();
      if(activeLiveView==='submissions'){if(reviewStudentId)renderSubmissionReview();else renderSubmissionInbox()}
    }catch{}
    if(token===monitorToken)setTimeout(poll,viewingRecentTask?5000:2000);
  };
  poll();
}

function renderActiveTabs(){
  const nav=q('[data-active-tabs]');if(!nav)return;
  const count=Number(currentResults?.submittedCount||0);
  nav.innerHTML=`<button type="button" data-active-view="questions" class="${activeLiveView==='questions'?'active':''}"><span class="eg-live-left-tab-icon">Q</span><strong>Questions</strong></button>
    <button type="button" data-active-view="submissions" class="${activeLiveView==='submissions'?'active':''}"><span class="eg-live-left-tab-icon">✓</span><strong>Submissions</strong><b>${count}</b></button>`;
  qa('[data-active-view]').forEach(b=>b.addEventListener('click',()=>showActiveView(b.dataset.activeView)));
}
function showActiveView(view){
  activeLiveView=view==='submissions'?'submissions':'questions';
  reviewStudentId=null;
  renderActiveTabs();
  if(activeLiveView==='submissions')renderSubmissionInbox();else renderActiveQuestion();
}
function renderSubmissionInbox(){
  const main=q('[data-active-main]');if(!main||!activeTask)return;
  currentAnnotationController?.destroy?.();currentAnnotationController=null;window.EnglishGateWhiteboard?.setLiveAnnotationApi?.(null);
  const subs=Array.isArray(currentResults?.submissions)?[...currentResults.submissions]:[];
  subs.sort((a,b)=>new Date(b.submittedAt||0)-new Date(a.submittedAt||0));
  const roster=Number(currentResults?.rosterCount||classSize(currentClass)||0),submitted=Number(currentResults?.submittedCount||subs.length);
  main.innerHTML=`<div class="eg-live-pane-head"><div><span class="eg-live-kicker">Live Task</span><h2>Submissions</h2></div><div class="eg-live-submission-summary"><strong>${submitted}/${roster}</strong><span>submitted</span></div></div>
    <div class="eg-live-submissions-inbox">
      <div class="eg-live-submissions-note"><strong>Student submissions</strong><span>Open a student to review the actual response. Individual answers may be visible if you are sharing your screen.</span></div>
      ${subs.length?subs.map(sub=>`<button type="button" class="eg-live-inbox-row" data-inbox-student="${esc(sub.studentId)}"><div><strong>${esc(sub.name||sub.username||'Student')}</strong><small>${sub.timedOut?'Late · ':''}${sub.submittedAt?new Date(sub.submittedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):'Submitted'}</small></div><span>${sub.score!==null&&sub.score!==undefined?Number(sub.score)+'%':'Review'}</span><b>Open →</b></button>`).join(''):`<div class="eg-live-empty-submissions"><strong>No submissions yet</strong><span>As students submit, their responses will appear here automatically.</span></div>`}
    </div>`;
  qa('[data-inbox-student]').forEach(b=>b.addEventListener('click',()=>openSubmissionReview(b.dataset.inboxStudent)));
}

function changeActiveQuestion(delta){
  if(!activeTask||activeTask.taskType!=='activity')return;
  const total=activeTask.content?.questions?.length||1;
  currentQuestionIndex=Math.max(0,Math.min(total-1,currentQuestionIndex+delta));
  renderActiveQuestion();renderLiveSide(currentResults);
}
function toggleReveal(){
  if(!activeTask||activeTask.taskType!=='activity')return;
  const item=activeTask.content.questions[currentQuestionIndex],set=revealSet(activeTask.id);
  if(set.has(item.id)){
    set.delete(item.id);renderActiveQuestion();renderLiveSide(currentResults);return;
  }
  const roster=Number(currentResults?.rosterCount||classSize(currentClass)||0);
  const submitted=Number(currentResults?.submittedCount||0);
  const stillWorking=roster>submitted&&Date.now()<liveEndLocal;
  if(stillWorking){
    const remaining=Math.max(0,roster-submitted);
    alert(`Answer hidden: ${remaining} student${remaining===1?' is':'s are'} still working. The answer can be revealed after everyone submits or the timer ends.`);
    return;
  }
  set.add(item.id);
  renderActiveQuestion();renderLiveSide(currentResults);
}
function liveQuestionBody(item,revealed){
  if(isChoice(item.type)){
    const answerIndex=Number(item.answer);
    return `<div class="eg-live-board-options">${(item.options||[]).map((o,j)=>`<div class="eg-live-board-option ${revealed&&j===answerIndex?'is-correct':''}"><span>${String.fromCharCode(65+j)}</span><strong>${esc(o)}</strong>${revealed&&j===answerIndex?'<b>Correct</b>':''}</div>`).join('')}</div>`;
  }
  if(item.type==='matching'){
    return `<div class="eg-live-board-matching"><div>${(item.pairs||[]).map((p,i)=>`<span><b>${i+1}</b>${esc(p.left)}</span>`).join('')}</div><div>${(item.pairs||[]).map((p,i)=>`<span><b>${String.fromCharCode(65+i)}</b>${esc(p.right)}</span>`).join('')}</div></div>`;
  }
  if(item.type==='ordering'){
    return `<div class="eg-live-board-order">${(item.items||[]).map((x,i)=>`<div><span>${i+1}</span><strong>${esc(x)}</strong></div>`).join('')}</div>`;
  }
  if(isSpeaking(item.type)){
    return `<div class="eg-live-speaking-card"><strong>${esc(typeLabel(item.type))}</strong><span>Students respond orally. Use the board to model an example before showing the success criteria.</span></div>`;
  }
  return `<div class="eg-live-open-response"><span>Students type their own response.</span></div>`;
}
function revealContent(item){
  if(isChoice(item.type)){
    const i=Number(item.answer);
    return `<span>Correct answer</span><strong>${String.fromCharCode(65+i)}. ${esc(item.options?.[i]||'')}</strong>${item.explanation?`<p>${esc(item.explanation)}</p>`:''}`;
  }
  if(isText(item.type)){
    const answers=item.acceptedAnswers||[];
    return answers.length?`<span>Accepted answer${answers.length>1?'s':''}</span><strong>${esc(answers.join(' / '))}</strong>${item.explanation?`<p>${esc(item.explanation)}</p>`:''}`:`<span>Teacher-reviewed response</span><strong>Discuss a strong answer with the class.</strong>`;
  }
  if(item.type==='matching')return `<span>Correct matches</span><div class="eg-live-reveal-list">${(item.pairs||[]).map(p=>`<p><strong>${esc(p.left)}</strong> → ${esc(p.right)}</p>`).join('')}</div>`;
  if(item.type==='ordering')return `<span>Correct order</span><div class="eg-live-reveal-list">${(item.correctOrder||[]).map((x,i)=>`<p><strong>${i+1}.</strong> ${esc(x)}</p>`).join('')}</div>`;
  if(isSpeaking(item.type))return `<span>Success criteria</span><div class="eg-live-reveal-list">${(item.successCriteria||[]).map(x=>`<p>✓ ${esc(x)}</p>`).join('')}</div>`;
  return '<span>Teacher review</span><strong>Discuss the response with the class.</strong>';
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
  const revealed=revealSet(activeTask.id).has(item.id),revealLabel=isSpeaking(item.type)?'Reveal criteria':'Reveal answer';
  main.innerHTML=`<div class="eg-live-pane-head">
      <div><span class="eg-live-kicker">Question ${currentQuestionIndex+1} of ${items.length} · ${esc(typeLabel(item.type))}</span><h2>${esc(activeTask.title)}</h2></div>
      <div class="eg-live-question-nav"><button type="button" data-active-prev ${currentQuestionIndex===0?'disabled':''}>← Previous</button><button type="button" data-active-next ${currentQuestionIndex===items.length-1?'disabled':''}>Next →</button></div>
    </div>
    <div class="eg-live-question-surface" data-annotation-surface>
      <div class="eg-live-question-content">
        <span class="eg-live-question-number">${currentQuestionIndex+1}</span>
        <h1>${esc(item.prompt||'')}</h1>
        ${liveQuestionBody(item,revealed)}
        ${revealed?`<div class="eg-live-answer-reveal">${revealContent(item)}</div>`:''}
      </div>
      <canvas class="eg-live-annotation-canvas" data-annotation-canvas></canvas>
    </div>
    <div class="eg-live-board-footer"><span>Use Pen, Highlighter or Text to model an example before revealing the answer or criteria.</span><button class="${revealed?'eg-live-secondary':'eg-live-primary'}" type="button" data-reveal-answer>${revealed?'Hide':' '+revealLabel}</button></div>`;
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
function submissionByStudent(id){return (currentResults?.submissions||[]).find(s=>String(s.studentId)===String(id))||null}
function responseText(item,raw){
  const type=item?.type||'multiple_choice';
  if(raw===null||raw===undefined||raw==='')return '<em>No response</em>';
  if(isChoice(type)){const i=Number(raw),letter=Number.isInteger(i)?String.fromCharCode(65+i):'',label=Number.isInteger(i)?item.options?.[i]:'';return esc((letter?letter+'. ':'')+(label||String(raw)))}
  if(type==='matching'&&raw&&typeof raw==='object'&&!Array.isArray(raw))return Object.entries(raw).map(([a,b])=>`<span>${esc(a)} → ${esc(b)}</span>`).join('');
  if(type==='ordering'&&Array.isArray(raw))return raw.map((x,i)=>`<span>${i+1}. ${esc(x)}</span>`).join('');
  if(isSpeaking(type)&&raw&&typeof raw==='object')return `<span>${raw.done?'Completed':'Not completed'}${raw.note?' · '+esc(raw.note):''}</span>`;
  return esc(typeof raw==='string'?raw:JSON.stringify(raw));
}
function responseState(item,raw){
  const type=item?.type||'multiple_choice';
  if(raw===null||raw===undefined||raw==='')return {label:'No response',cls:'is-empty'};
  if(isChoice(type)){const ok=Number(raw)===Number(item.answer);return {label:ok?'Correct':'Incorrect',cls:ok?'is-correct':'is-wrong'}}
  if(isText(type)&&Array.isArray(item.acceptedAnswers)&&item.acceptedAnswers.length){const n=x=>String(x??'').trim().toLowerCase().replace(/\s+/g,' '),ok=item.acceptedAnswers.some(a=>n(a)===n(raw));return {label:ok?'Correct':'Incorrect',cls:ok?'is-correct':'is-wrong'}}
  if(type==='matching'&&raw&&typeof raw==='object'){const ok=(item.pairs||[]).every(p=>String(raw[p.left]??'')===String(p.right));return {label:ok?'Correct':'Incorrect',cls:ok?'is-correct':'is-wrong'}}
  if(type==='ordering'&&Array.isArray(raw)){const target=item.correctOrder||[],ok=raw.length===target.length&&raw.every((x,i)=>String(x)===String(target[i]));return {label:ok?'Correct':'Incorrect',cls:ok?'is-correct':'is-wrong'}}
  return {label:'Teacher review',cls:'is-review'};
}
function openSubmissionReview(studentId,skipWarning=false){
  const sub=submissionByStudent(studentId);if(!sub)return;
  if(!skipWarning&&!confirm('Open this student submission? Individual answers may be visible on your shared screen. Stop screen sharing first if the class should not see them.'))return;
  reviewStudentId=String(studentId);renderSubmissionReview();
}
function renderSubmissionReview(){
  const main=q('[data-active-main]');if(!main||!activeTask||!reviewStudentId)return;
  currentAnnotationController?.destroy?.();currentAnnotationController=null;window.EnglishGateWhiteboard?.setLiveAnnotationApi?.(null);
  const subs=Array.isArray(currentResults?.submissions)?currentResults.submissions:[],sub=submissionByStudent(reviewStudentId);
  if(!sub){reviewStudentId=null;renderActiveQuestion();return}
  const ordered=[...subs].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''))),idx=ordered.findIndex(x=>String(x.studentId)===String(reviewStudentId)),prev=ordered[idx-1],next=ordered[idx+1];
  let body='';
  if(activeTask.taskType==='writing'){body=`<article class="eg-live-submission-writing"><span>Student writing</span><p>${esc(sub.answers?.text||'No response submitted.')}</p></article>`}
  else{body=`<div class="eg-live-submission-answers">${(activeTask.content?.questions||[]).map((item,i)=>{const raw=sub.answers?.[item.id],state=responseState(item,raw);return `<article class="eg-live-submission-answer ${state.cls}"><header><span>Q${i+1}</span><strong>${esc(item.prompt||'')}</strong><b>${state.label}</b></header><div>${responseText(item,raw)}</div></article>`}).join('')}</div>`}
  const submittedAt=sub.submittedAt?new Date(sub.submittedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):'';
  main.innerHTML=`<div class="eg-live-pane-head eg-live-review-head"><div><span class="eg-live-kicker">Private submission review</span><h2>${esc(sub.name||sub.username||'Student')}</h2><p>${submittedAt?'Submitted '+esc(submittedAt):'Submitted'}${sub.timedOut?' · late':''}${sub.score!==null&&sub.score!==undefined?' · '+Number(sub.score)+'%':''}</p></div><button type="button" data-close-submission>← Back to submissions</button></div>
    <div class="eg-live-private-warning">Student answers are visible here. Use this view privately when screen sharing.</div>
    ${body}
    <div class="eg-live-submission-nav"><button type="button" data-prev-submission ${prev?'':'disabled'}>← Previous student</button><span>${idx+1} of ${ordered.length} submissions</span><button type="button" data-next-submission ${next?'':'disabled'}>Next student →</button></div>`;
  q('[data-close-submission]')?.addEventListener('click',()=>{reviewStudentId=null;activeLiveView='submissions';renderActiveTabs();renderSubmissionInbox()});
  q('[data-prev-submission]')?.addEventListener('click',()=>prev&&openSubmissionReview(prev.studentId,true));
  q('[data-next-submission]')?.addEventListener('click',()=>next&&openSubmissionReview(next.studentId,true));
}

function renderLiveSide(r){
  const side=q('[data-active-side]');if(!side||!activeTask)return;
  const students=Array.isArray(r?.students)?r.students:[];
  const working=Number(r?.workingCount||0),submitted=Number(r?.submittedCount||0),connected=Number(r?.connectedCount||submitted+working),roster=Number(r?.rosterCount||classSize(currentClass));
  const sorted=[...students].sort((a,b)=>({working:0,submitted:1,waiting:2}[a.status]??3)-({working:0,submitted:1,waiting:2}[b.status]??3)||String(a.name).localeCompare(String(b.name)));
  let distribution='';
  if(activeTask.taskType==='activity'){
    const item=activeTask.content.questions[currentQuestionIndex],stat=(r?.questionStats||[]).find(x=>x.id===item.id)||(r?.questionStats||[])[currentQuestionIndex];
    const revealed=revealSet(activeTask.id).has(item.id);
    if(isChoice(item.type)){
      const choices=stat?.choices||[],max=Math.max(1,...choices),answer=Number(item.answer);
      distribution=`<section class="eg-live-response-block"><div class="eg-live-side-title"><strong>Responses · Q${currentQuestionIndex+1}</strong><span>${Number(stat?.answered||0)} answers</span></div>
        <div class="eg-live-choice-bars">${(item.options||[]).map((o,j)=>`<div class="eg-live-choice-row ${revealed&&j===answer?'is-correct':''}"><span>${String.fromCharCode(65+j)}</span><div><i style="width:${Math.round((Number(choices[j]||0)/max)*100)}%"></i></div><strong>${Number(choices[j]||0)}</strong></div>`).join('')}</div>
        ${revealed&&stat?.correctPct!==null&&stat?.correctPct!==undefined?`<div class="eg-live-understanding"><strong>${stat.correctPct}% correct</strong><span>Use this as one piece of classroom evidence, not a final mastery judgment.</span></div>`:''}
      </section>`;
    }else{
      distribution=`<section class="eg-live-response-block"><div class="eg-live-side-title"><strong>Responses · Q${currentQuestionIndex+1}</strong><span>${Number(stat?.answered||0)} answers</span></div>
        <div class="eg-live-understanding"><strong>${Number(stat?.answered||0)} responded</strong><span>${stat?.correctPct===null||stat?.correctPct===undefined?'Teacher review required':revealed?stat.correctPct+'% matched the expected answer':'Reveal the answer to discuss accuracy'}</span></div>
      </section>`;
    }
  }
  side.innerHTML=`<div class="eg-live-livehead"><div><span class="eg-live-dot"></span><strong>${viewingRecentTask?'ENDED':'LIVE'}</strong><small>${esc(activeTask.className||currentClass?.name||'Class')}</small></div><div class="eg-live-timer" data-live-timer>${viewingRecentTask?'00:00':fmt((liveEndLocal-Date.now())/1000)}</div></div>
    <div class="eg-live-mini-metrics"><div><strong>${connected}</strong><span>active</span></div><div><strong>${working}</strong><span>working</span></div><div><strong>${submitted}/${roster}</strong><span>submitted</span></div></div>
    <section class="eg-live-students-block">
      <div class="eg-live-side-title"><strong>Students</strong><span>updates live</span></div>
      <div class="eg-live-student-list">${sorted.length?sorted.map(s=>`<div class="eg-live-student-row is-${esc(s.status)}"><span class="eg-live-status-dot"></span><div><strong>${esc(s.name)}</strong><small>${statusLabel(s.status)}${s.timedOut?' · late':''}</small></div>${s.status==='submitted'&&s.score!==null&&s.score!==undefined?'<b>'+Number(s.score)+'%</b>':''}</div>`).join(''):'<div class="eg-live-side-empty">Waiting for students to open the activity…</div>'}</div>
    </section>
    ${distribution}
    <div class="eg-live-side-actions">${viewingRecentTask?'<button class="eg-live-primary" type="button" data-new-live>New live task</button>':'<div class="eg-live-extend-time"><span>Extend time</span><button type="button" data-extend-live="1">+1 min</button><button type="button" data-extend-live="3">+3 min</button><button type="button" data-extend-live="5">+5 min</button></div><button class="eg-live-danger" type="button" data-end-live>End task</button>'}</div>`;
  qa('[data-extend-live]').forEach(b=>b.addEventListener('click',()=>extendTime(Number(b.dataset.extendLive)||1,b)));
  q('[data-end-live]')?.addEventListener('click',endTask);
  q('[data-new-live]')?.addEventListener('click',()=>{viewingRecentTask=false;openBuilder()});
}

async function extendTime(minutes,button){
  if(!activeTask)return;
  const buttons=qa('[data-extend-live]');buttons.forEach(b=>b.disabled=true);
  const oldLabel=button?.textContent;if(button)button.textContent='Adding…';
  try{
    const r=await api('/api/teacher/live-tasks/'+encodeURIComponent(activeTask.id)+'/extend',{method:'PATCH',body:JSON.stringify({minutes})});
    if(r?.task?.endsAt){
      activeTask={...activeTask,...r.task};
      const serverMs=new Date(r.serverNow||Date.now()).getTime();
      const offset=Date.now()-serverMs;
      liveEndLocal=new Date(r.task.endsAt).getTime()+offset;
    }
    renderLiveSide(currentResults);
  }catch(e){
    const status=promptElements().status;if(status)status.textContent=e.message;
  }finally{buttons.forEach(b=>b.disabled=false);if(button&&oldLabel)button.textContent=oldLabel}
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