/* EnglishGate Live Task controller for the Whiteboard */
(()=>{
'use strict';

let currentClass=null,currentDraft=null,monitorToken=0,currentHost=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const getDb=()=>{try{return typeof getDB==='function'?getDB():null}catch{return null}};
const fmt=s=>{s=Math.max(0,Math.ceil(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};

function classFromId(id){return (getDb()?.classes||[]).find(c=>c.id===id)||null}
function host(){return currentHost||window.EnglishGateWhiteboard?.getLiveTaskHost?.()||null}
function q(sel){return host()?.querySelector(sel)||null}
function qa(sel){return [...(host()?.querySelectorAll(sel)||[])]}
function setHtml(html){const h=host();if(h)h.innerHTML=html}
function stopPolling(){monitorToken++}

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
  const h=host();if(!h)return;
  stopPolling();
  h.innerHTML='<div class="eg-wb-live-empty"><strong>Opening Live Task…</strong><span>Checking this class.</span></div>';
  try{
    const c=await resolveTeachClass();currentClass=c;
    const active=await api('/api/teacher/live-tasks/current?classId='+encodeURIComponent(c.id));
    if(active?.task)return openMonitor(active.task,active.serverNow);
    openBuilder(c);
  }catch(e){
    h.innerHTML='<div class="eg-wb-live-empty"><strong>Live Task could not open.</strong><span class="eg-wb-live-bad">'+esc(e.message)+'</span></div>';
  }
}

function openBuilder(c){
  currentDraft=null;stopPolling();
  setHtml(`<section class="eg-wb-live-shell">
    <header class="eg-wb-live-head"><div><span class="eg-wb-live-kicker">Whiteboard · Live Task</span><h2>Check understanding</h2><div class="eg-wb-live-sub">${esc(c.name)} · Create the activity here and send it to students.</div></div></header>
    <div class="eg-wb-live-compose">
      <label>What should students do?<textarea data-live-request placeholder="Give me 5 MCQs about going to. 5 minutes."></textarea></label>
      <div class="eg-wb-live-examples">
        <button type="button" data-live-example="Give me 5 MCQs about going to. 5 minutes.">5 MCQs · going to</button>
        <button type="button" data-live-example="Give me 5 MCQs about present simple. 5 minutes.">5 MCQs · present simple</button>
        <button type="button" data-live-example="Give the students a writing task about future plans. 7 minutes.">Writing · future plans</button>
      </div>
      <div class="eg-wb-live-actions"><div class="eg-wb-live-feedback" data-live-prepare-result></div><button class="eg-wb-live-primary" data-live-prepare type="button">Prepare task</button></div>
    </div>
    <div data-live-preview></div>
  </section>`);
  qa('[data-live-example]').forEach(b=>b.onclick=()=>{const input=q('[data-live-request]');if(input)input.value=b.dataset.liveExample});
  const btn=q('[data-live-prepare]');
  if(btn)btn.onclick=async()=>{
    const request=q('[data-live-request]')?.value.trim()||'',out=q('[data-live-prepare-result]');
    btn.disabled=true;btn.textContent='Preparing…';if(out)out.textContent='';
    try{
      const d=await api('/api/teacher/live-tasks/prepare',{method:'POST',body:JSON.stringify({classId:c.id,request})});
      currentDraft=d;renderPreview(c,d);
    }catch(e){
      if(out){out.textContent=e.message;out.className='eg-wb-live-feedback eg-wb-live-bad'}
    }finally{btn.disabled=false;btn.textContent='Prepare task'}
  };
}

function renderPreview(c,d){
  const target=q('[data-live-preview]');if(!target)return;
  const body=d.taskType==='mcq'
    ?`<div class="eg-wb-live-questions">${d.content.questions.map((item,i)=>`<article class="eg-wb-live-question" data-live-q="${i}"><strong>Question ${i+1}</strong><input data-q-text value="${esc(item.q)}">${item.options.map((o,j)=>`<label class="eg-wb-live-option"><span>${String.fromCharCode(65+j)}</span><input data-opt="${j}" value="${esc(o)}"></label>`).join('')}<label>Correct answer<select data-answer>${item.options.map((_,j)=>`<option value="${j}" ${j===item.answer?'selected':''}>${String.fromCharCode(65+j)}</option>`).join('')}</select></label></article>`).join('')}</div>`
    :`<label class="eg-wb-live-wide">Writing instructions<textarea data-writing-instructions rows="4">${esc(d.content.instructions)}</textarea></label><label>Minimum words<input data-writing-min type="number" min="1" max="500" value="${Number(d.content.minWords)||40}"></label>`;
  target.innerHTML=`<section class="eg-wb-live-preview"><div><span class="eg-wb-live-kicker">Preview on whiteboard</span><h3>${d.taskType==='mcq'?'Quick check':'Writing task'}</h3></div><div class="eg-wb-live-form"><label>Title<input data-live-title maxlength="100" value="${esc(d.title)}"></label><label>Timer (minutes)<input data-live-minutes type="number" min="1" max="60" value="${Math.max(1,Math.round(d.durationSeconds/60))}"></label>${body}<div class="eg-wb-live-launch"><button class="eg-wb-live-primary" data-live-launch type="button">Send to students</button></div><div class="eg-wb-live-feedback eg-wb-live-wide" data-live-launch-result></div></div></section>`;
  q('[data-live-launch]').onclick=()=>launch(c,d);
}

function collectContent(d){
  if(d.taskType==='writing')return {topic:d.content.topic,instructions:q('[data-writing-instructions]')?.value.trim()||'',minWords:Number(q('[data-writing-min]')?.value)||40};
  const questions=qa('[data-live-q]').map((box,i)=>({
    id:'q'+(i+1),
    q:box.querySelector('[data-q-text]')?.value.trim()||'',
    options:[...box.querySelectorAll('[data-opt]')].map(x=>x.value.trim()),
    answer:Number(box.querySelector('[data-answer]')?.value),
    explanation:d.content.questions[i]?.explanation||''
  }));
  return {topic:d.content.topic,tip:d.content.tip,questions};
}

async function launch(c,d){
  const btn=q('[data-live-launch]'),out=q('[data-live-launch-result]');
  if(!btn)return;btn.disabled=true;btn.textContent='Sending…';if(out)out.textContent='';
  try{
    const r=await api('/api/teacher/live-tasks',{method:'POST',body:JSON.stringify({
      classId:c.id,
      requestText:d.requestText,
      taskType:d.taskType,
      title:q('[data-live-title]')?.value.trim()||d.title,
      durationSeconds:(Number(q('[data-live-minutes]')?.value)||5)*60,
      content:collectContent(d)
    })});
    openMonitor(r.task,r.serverNow);
  }catch(e){
    if(out){out.textContent=e.message;out.className='eg-wb-live-feedback eg-wb-live-wide eg-wb-live-bad'}
    btn.disabled=false;btn.textContent='Send to students';
  }
}

function openMonitor(task,serverNow){
  const token=++monitorToken,offset=Date.now()-new Date(serverNow||Date.now()).getTime(),endLocal=new Date(task.endsAt).getTime()+offset;
  setHtml(`<section class="eg-wb-live-monitor">
    <header class="eg-wb-live-head"><div><span class="eg-wb-live-kicker">Live now · Whiteboard</span><h2>${esc(task.title)}</h2><div class="eg-wb-live-sub">${esc(task.className||currentClass?.name||'Class')} · Student responses update here.</div></div><div class="eg-wb-live-clock" data-live-clock>${fmt((endLocal-Date.now())/1000)}</div></header>
    <div class="eg-wb-live-metrics" data-live-metrics></div>
    <section class="eg-wb-live-section" data-live-question-stats></section>
    <section class="eg-wb-live-section" data-live-students></section>
    <div class="eg-wb-live-actions"><button class="eg-wb-live-secondary" data-live-board type="button">← Back to board</button><button class="eg-wb-live-danger" data-live-end type="button">End task now</button></div>
  </section>`);
  q('[data-live-board]').onclick=()=>window.EnglishGateWhiteboard?.showCanvas?.();
  q('[data-live-end]').onclick=async()=>{
    if(!confirm('End this live task now?'))return;
    await api('/api/teacher/live-tasks/'+encodeURIComponent(task.id)+'/close',{method:'PATCH'});
    stopPolling();openBuilder(currentClass);
  };
  const tick=()=>{
    if(token!==monitorToken||!q('[data-live-clock]'))return;
    q('[data-live-clock]').textContent=fmt((endLocal-Date.now())/1000);
    if(Date.now()<endLocal)setTimeout(tick,500);
  };
  tick();
  const poll=async()=>{
    if(token!==monitorToken||!q('[data-live-metrics]'))return;
    try{const r=await api('/api/teacher/live-tasks/'+encodeURIComponent(task.id)+'/results');renderResults(r)}catch{}
    if(token===monitorToken)setTimeout(poll,2000);
  };
  poll();
}

function renderResults(r){
  const m=q('[data-live-metrics]');
  if(m)m.innerHTML=`<div><strong>${r.submittedCount}/${r.rosterCount}</strong><span>submitted</span></div><div><strong>${r.averageScore==null?'—':r.averageScore+'%'}</strong><span>${r.task.taskType==='mcq'?'average score':'writing task'}</span></div><div><strong>${r.remainingCount}</strong><span>still working</span></div><div><strong>${r.lateCount}</strong><span>late</span></div>`;
  const qs=q('[data-live-question-stats]');
  if(qs)qs.innerHTML=r.questionStats?.length?`<h3>Question understanding</h3>${r.questionStats.map((x,i)=>`<div class="eg-wb-live-row"><span><strong>Q${i+1}</strong><small>${esc(x.q)}</small></span><strong>${x.correctPct}%</strong></div>`).join('')}`:'';
  const students=q('[data-live-students]');
  if(students)students.innerHTML=`<h3>Student results</h3>${r.submissions?.length?r.submissions.map(x=>`<div class="eg-wb-live-row"><span><strong>${esc(x.name)}</strong><small>${x.timedOut?'Late':'Submitted'}</small></span><strong>${x.score==null?'✓':x.score+'%'}</strong></div>`).join(''):'<div class="eg-wb-live-sub">Waiting for the first submission…</div>'}`;
}

window.EnglishGateLiveTask={openInWhiteboard,stopPolling};
})();