/* EnglishGate Live Intervention bridge for TEACH mode */
(()=>{
'use strict';
let currentClass=null,currentDraft=null,monitorToken=0;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byId=id=>document.getElementById(id);
const getDb=()=>{try{return typeof getDB==='function'?getDB():null}catch{return null}};
const isTeacher=()=>window.session?.role==='teacher'||String(document.querySelector('#sidebarRole')?.textContent||'').toLowerCase().includes('teacher');
const fmt=s=>{s=Math.max(0,Math.ceil(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
function classFromId(id){return (getDb()?.classes||[]).find(c=>c.id===id)||null}
async function resolveTeachClass(){
  // The TEACH lesson already stores its active class in the in-memory teacher context
  // before this toolbar is rendered. Prefer that source so Live Task works immediately
  // and does not depend on the per-class context mirror being populated first.
  const localClassId=String(getDb()?.teacherContext?.classId||'').trim();
  if(localClassId){
    const localClass=classFromId(localClassId);
    if(localClass){
      if(localClass.approval_status&&localClass.approval_status!=='approved')throw new Error('This class is waiting for admin approval.');
      return localClass;
    }
  }

  // Fallback for resumed sessions / older clients that only have the server-side context.
  const r=await api('/api/teacher/class-contexts');
  const ctx=r?.contexts?.[0];
  if(!ctx?.classId)throw new Error('Open a class in TEACH mode first.');
  const c=classFromId(ctx.classId);
  if(!c)throw new Error('The current teaching class could not be found.');
  if(c.approval_status&&c.approval_status!=='approved')throw new Error('This class is waiting for admin approval.');
  return c;
}
async function openTeachLiveTask(){
  try{
    const c=await resolveTeachClass();currentClass=c;
    const active=await api('/api/teacher/live-tasks/current?classId='+encodeURIComponent(c.id));
    if(active?.task)return openMonitor(active.task,active.serverNow);
    openBuilder(c);
  }catch(e){alert(e.message)}
}
function openBuilder(c){
  currentDraft=null;monitorToken++;
  showModal(`<section class="live-builder"><div class="section-head"><div><span class="role-kicker">TEACH · Live Task</span><h3>${esc(c.name)}</h3><p class="muted">Create a quick activity without leaving TEACH mode.</p></div><button class="icon-btn" data-close>×</button></div><div class="live-prompt-card"><label>What should students do?<textarea id="teachLiveRequest" rows="3" placeholder="Give me 5 MCQs about going to. 5 minutes."></textarea></label><div class="live-examples"><button type="button" data-example="Give me 5 MCQs about going to. 5 minutes.">5 MCQs · going to</button><button type="button" data-example="Give me 5 MCQs about present simple. 5 minutes.">5 MCQs · present simple</button><button type="button" data-example="Give the students a writing task about future plans. 7 minutes.">Writing · future plans</button></div><button class="primary-btn" id="teachPrepareLive" type="button">Prepare task</button><div id="teachPrepareResult"></div></div><div id="teachLivePreview"></div></section>`);
  document.querySelector('[data-close]').onclick=()=>{monitorToken++;closeModal()};
  document.querySelectorAll('[data-example]').forEach(b=>b.onclick=()=>byId('teachLiveRequest').value=b.dataset.example);
  byId('teachPrepareLive').onclick=async()=>{
    const btn=byId('teachPrepareLive'),out=byId('teachPrepareResult'),request=byId('teachLiveRequest').value.trim();btn.disabled=true;btn.textContent='Preparing…';out.innerHTML='';
    try{const d=await api('/api/teacher/live-tasks/prepare',{method:'POST',body:JSON.stringify({classId:c.id,request})});currentDraft=d;renderPreview(c,d)}catch(e){out.innerHTML=`<div class="feedback bad">${esc(e.message)}</div>`}finally{btn.disabled=false;btn.textContent='Prepare task'}
  };
}
function renderPreview(c,d){
  const target=byId('teachLivePreview');if(!target)return;
  const body=d.taskType==='mcq'?`<div class="live-question-editor">${d.content.questions.map((q,i)=>`<article class="live-edit-q" data-teach-live-q="${i}"><strong>Question ${i+1}</strong><input class="teach-q" value="${esc(q.q)}">${q.options.map((o,j)=>`<label class="live-option-edit"><span>${String.fromCharCode(65+j)}</span><input data-opt="${j}" value="${esc(o)}"></label>`).join('')}<label>Correct answer<select class="teach-answer">${q.options.map((_,j)=>`<option value="${j}" ${j===q.answer?'selected':''}>${String.fromCharCode(65+j)}</option>`).join('')}</select></label></article>`).join('')}</div>`:`<label>Writing instructions<textarea id="teachWritingInstructions" rows="4">${esc(d.content.instructions)}</textarea></label><label>Minimum words<input id="teachWritingMinWords" type="number" min="1" max="500" value="${Number(d.content.minWords)||40}"></label>`;
  target.innerHTML=`<section class="live-preview-card"><div class="section-head"><div><span class="role-kicker">Preview</span><h3>${d.taskType==='mcq'?'Quick check':'Writing task'}</h3><p class="muted">Edit before launching to students.</p></div></div><div class="form-grid"><label>Title<input id="teachLiveTitle" value="${esc(d.title)}" maxlength="100"></label><label>Timer (minutes)<input id="teachLiveMinutes" type="number" min="1" max="60" value="${Math.max(1,Math.round(d.durationSeconds/60))}"></label>${body}</div><div class="live-launch-row"><span class="muted">Launches instantly to this class.</span><button class="primary-btn" id="teachLaunchLive" type="button">Launch to students</button></div><div id="teachLaunchResult"></div></section>`;
  byId('teachLaunchLive').onclick=()=>launch(c,d);
}
function collectContent(d){
  if(d.taskType==='writing')return {topic:d.content.topic,instructions:byId('teachWritingInstructions').value.trim(),minWords:Number(byId('teachWritingMinWords').value)||40};
  const questions=[...document.querySelectorAll('[data-teach-live-q]')].map((box,i)=>({id:'q'+(i+1),q:box.querySelector('.teach-q').value.trim(),options:[...box.querySelectorAll('[data-opt]')].map(x=>x.value.trim()),answer:Number(box.querySelector('.teach-answer').value),explanation:d.content.questions[i]?.explanation||''}));
  return {topic:d.content.topic,tip:d.content.tip,questions};
}
async function launch(c,d){
  const btn=byId('teachLaunchLive'),out=byId('teachLaunchResult');btn.disabled=true;btn.textContent='Launching…';
  try{const r=await api('/api/teacher/live-tasks',{method:'POST',body:JSON.stringify({classId:c.id,requestText:d.requestText,taskType:d.taskType,title:byId('teachLiveTitle').value.trim(),durationSeconds:(Number(byId('teachLiveMinutes').value)||5)*60,content:collectContent(d)})});openMonitor(r.task,r.serverNow)}catch(e){out.innerHTML=`<div class="feedback bad">${esc(e.message)}</div>`;btn.disabled=false;btn.textContent='Launch to students'}
}
function openMonitor(task,serverNow){
  const token=++monitorToken,offset=Date.now()-new Date(serverNow||Date.now()).getTime(),endLocal=new Date(task.endsAt).getTime()+offset;
  showModal(`<section class="live-monitor"><div class="section-head"><div><span class="role-kicker">TEACH · Live now</span><h3>${esc(task.title)}</h3><p class="muted">${esc(task.className||currentClass?.name||'Class')}</p></div><div class="live-monitor-clock" id="teachLiveClock">${fmt((endLocal-Date.now())/1000)}</div></div><div class="live-monitor-metrics" id="teachLiveMetrics"></div><div id="teachLiveQuestionStats"></div><div id="teachLiveStudents"></div><div class="live-monitor-actions"><button class="ghost-btn" id="teachCloseMonitor" type="button">Back to TEACH</button><button class="ghost-btn danger-action" id="teachEndLive" type="button">End task now</button></div></section>`);
  byId('teachCloseMonitor').onclick=()=>{monitorToken++;closeModal()};
  byId('teachEndLive').onclick=async()=>{if(!confirm('End this live task now?'))return;await api('/api/teacher/live-tasks/'+encodeURIComponent(task.id)+'/close',{method:'PATCH'});monitorToken++;closeModal()};
  const tick=()=>{if(token!==monitorToken||!byId('teachLiveClock'))return;byId('teachLiveClock').textContent=fmt((endLocal-Date.now())/1000);if(Date.now()<endLocal)setTimeout(tick,500)};tick();
  const poll=async()=>{if(token!==monitorToken||!byId('teachLiveMetrics'))return;try{const r=await api('/api/teacher/live-tasks/'+encodeURIComponent(task.id)+'/results');renderResults(r)}catch{}if(token===monitorToken)setTimeout(poll,2000)};poll();
}
function renderResults(r){
  const m=byId('teachLiveMetrics');if(m)m.innerHTML=`<div><strong>${r.submittedCount}/${r.rosterCount}</strong><span>submitted</span></div><div><strong>${r.averageScore==null?'—':r.averageScore+'%'}</strong><span>${r.task.taskType==='mcq'?'average score':'writing task'}</span></div><div><strong>${r.remainingCount}</strong><span>still working</span></div><div><strong>${r.lateCount}</strong><span>late</span></div>`;
  const q=byId('teachLiveQuestionStats');if(q)q.innerHTML=r.questionStats?.length?`<section class="live-stat-card"><h4>Question understanding</h4>${r.questionStats.map((x,i)=>`<div class="live-stat-row"><span>Q${i+1} · ${esc(x.q)}</span><strong>${x.correctPct}%</strong></div>`).join('')}</section>`:'';
  const s=byId('teachLiveStudents');if(s)s.innerHTML=`<section class="live-stat-card"><h4>Student results</h4>${r.submissions?.length?r.submissions.map(x=>`<div class="live-student-result"><span><strong>${esc(x.name)}</strong><small>${x.timedOut?'Late':'Submitted'}</small></span><strong>${x.score==null?'✓':x.score+'%'}</strong></div>`).join(''):'<p class="muted">Waiting for the first submission…</p>'}</section>`;
}
function inject(){
  if(!isTeacher())return;
  document.querySelectorAll('.live-class-tools').forEach(bar=>{
    const actions=bar.querySelector('.live-tool-actions')||bar;if(actions.querySelector('[data-teach-live-task]'))return;
    const b=document.createElement('button');b.type='button';b.className='live-tool-btn';b.dataset.teachLiveTask='1';b.innerHTML='<span aria-hidden="true">⚡</span> <span>Live task</span>';b.onclick=openTeachLiveTask;actions.prepend(b);
  });
}
const observer=new MutationObserver(inject);observer.observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('DOMContentLoaded',inject);inject();
})();