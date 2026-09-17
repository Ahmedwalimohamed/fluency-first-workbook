/* EnglishGate Live Intervention — zero-fee template/question-bank workflow */
(function(){
'use strict';
let scheduled=false,currentDraft=null,monitorSeq=0,studentTaskId=null,studentTimer=null,studentSubmitting=false,studentResultShowing=false;
const dismissed=new Set();
const $id=id=>document.getElementById(id);
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function db(){try{return typeof getDB==='function'?getDB():null}catch{return null}}
function role(){try{return typeof session!=='undefined'?session?.role:null}catch{return null}}
function classById(id){return (db()?.classes||[]).find(c=>c.id===id)}
function fmt(sec){sec=Math.max(0,Math.ceil(sec));return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')}

function isTeacherClasses(){return role()==='teacher'&&String($id('pageTitle')?.textContent||'').trim()==='Classes'}
function enhanceTeacherClasses(){
 if(!isTeacherClasses())return;
 document.querySelectorAll('[data-add-student-class]').forEach(add=>{
   const classId=add.dataset.addStudentClass,actions=add.closest('.management-card-actions');if(!classId||!actions||actions.querySelector(`[data-live-task-class="${CSS.escape(classId)}"]`))return;
   const c=classById(classId),btn=document.createElement('button');btn.type='button';btn.className='secondary-btn';btn.dataset.liveTaskClass=classId;btn.textContent='⚡ Live task';
   if(c?.approval_status&&c.approval_status!=='approved'){btn.disabled=true;btn.title='Admin approval is required before live tasks can start.'}
   else btn.addEventListener('click',()=>openForClass(classId));
   actions.appendChild(btn);
 });
}
async function openForClass(classId){
 const c=classById(classId);if(!c)return;
 if(c.approval_status&&c.approval_status!=='approved'){alert('This class is waiting for admin approval.');return}
 try{const current=await api('/api/teacher/live-tasks/current?classId='+encodeURIComponent(classId));if(current?.task)return openMonitor(current.task,current.serverNow);openBuilder(c)}catch(e){alert(e.message)}
}
function openBuilder(c){
 currentDraft=null;monitorSeq++;
 showModal(`<section class="live-builder"><div class="section-head"><div><span class="role-kicker">Live Intervention · no AI fee</span><h3>Send a live task to ${esc(c.name)}</h3><p class="muted">Describe what students need. EnglishGate uses its local templates and question bank.</p></div><button class="icon-btn" data-close>×</button></div><div class="live-prompt-card"><label>What should students do?<textarea id="liveTaskRequest" rows="3" placeholder="Give me 5 MCQs about going to. 5 minutes."></textarea></label><div class="live-examples"><button type="button" data-live-example="Give me 5 MCQs about going to. 5 minutes.">5 MCQs · going to</button><button type="button" data-live-example="Give me 5 MCQs about present simple. 5 minutes.">5 MCQs · present simple</button><button type="button" data-live-example="Give the students a writing task about future plans. 7 minutes.">Writing · future plans</button></div><button class="primary-btn" type="button" id="prepareLiveTask">Prepare task</button><div id="livePrepareResult"></div></div><div id="liveTaskPreview"></div></section>`);
 document.querySelector('[data-close]').onclick=()=>{monitorSeq++;closeModal()};
 document.querySelectorAll('[data-live-example]').forEach(b=>b.onclick=()=>{$id('liveTaskRequest').value=b.dataset.liveExample});
 $id('prepareLiveTask').onclick=async()=>{const request=$id('liveTaskRequest').value.trim(),btn=$id('prepareLiveTask'),out=$id('livePrepareResult');btn.disabled=true;btn.textContent='Preparing…';out.innerHTML='';try{const d=await api('/api/teacher/live-tasks/prepare',{method:'POST',body:JSON.stringify({classId:c.id,request})});currentDraft=d;renderPreview(c,d)}catch(e){out.innerHTML=`<div class="feedback bad">${esc(e.message)}</div>`}finally{btn.disabled=false;btn.textContent='Prepare task'}};
}
function renderPreview(c,d){
 const p=$id('liveTaskPreview');if(!p)return;
 let body='';
 if(d.taskType==='mcq')body=`<div class="live-question-editor">${d.content.questions.map((q,i)=>`<article class="live-edit-q" data-live-edit-q="${i}"><strong>Question ${i+1}</strong><input class="live-q-text" value="${esc(q.q)}">${q.options.map((o,j)=>`<label class="live-option-edit"><span>${String.fromCharCode(65+j)}</span><input value="${esc(o)}" data-option="${j}"></label>`).join('')}<label>Correct answer<select class="live-answer-select">${q.options.map((_,j)=>`<option value="${j}" ${j===q.answer?'selected':''}>${String.fromCharCode(65+j)}</option>`).join('')}</select></label></article>`).join('')}</div>`;
 else body=`<label>Writing instructions<textarea id="liveWritingInstructions" rows="4">${esc(d.content.instructions)}</textarea></label><label>Minimum words<input id="liveWritingMinWords" type="number" min="1" max="500" value="${Number(d.content.minWords)||40}"></label>`;
 p.innerHTML=`<section class="live-preview-card"><div class="section-head"><div><span class="role-kicker">Preview before launch</span><h3>${esc(d.taskType==='mcq'?'Quick check':'Writing task')}</h3><p class="muted">Edit anything before students see it.</p></div><span class="pill teal">${d.taskType==='mcq'?d.content.questions.length+' questions':'Writing'}</span></div><div class="form-grid"><label>Title<input id="liveTaskTitle" maxlength="100" value="${esc(d.title)}"></label><label>Timer (minutes)<input id="liveTaskMinutes" type="number" min="1" max="60" value="${Math.max(1,Math.round(d.durationSeconds/60))}"></label>${body}</div><div class="live-launch-row"><span class="muted">Students receive this immediately when you launch it.</span><button class="primary-btn" type="button" id="launchLiveTask">Launch to class</button></div><div id="liveLaunchResult"></div></section>`;
 $id('launchLiveTask').onclick=()=>launch(c,d);
}
function collectContent(d){
 if(d.taskType==='writing')return {topic:d.content.topic,instructions:$id('liveWritingInstructions').value.trim(),minWords:Number($id('liveWritingMinWords').value)||40};
 const questions=[...document.querySelectorAll('[data-live-edit-q]')].map((box,i)=>({id:'q'+(i+1),q:box.querySelector('.live-q-text').value.trim(),options:[...box.querySelectorAll('[data-option]')].map(x=>x.value.trim()),answer:Number(box.querySelector('.live-answer-select').value),explanation:d.content.questions[i]?.explanation||''}));
 return {topic:d.content.topic,tip:d.content.tip,questions};
}
async function launch(c,d){
 const btn=$id('launchLiveTask'),out=$id('liveLaunchResult');btn.disabled=true;btn.textContent='Launching…';try{const payload={classId:c.id,requestText:d.requestText,taskType:d.taskType,title:$id('liveTaskTitle').value.trim(),durationSeconds:(Number($id('liveTaskMinutes').value)||5)*60,content:collectContent(d)};const r=await api('/api/teacher/live-tasks',{method:'POST',body:JSON.stringify(payload)});openMonitor(r.task,r.serverNow)}catch(e){out.innerHTML=`<div class="feedback bad">${esc(e.message)}</div>`;btn.disabled=false;btn.textContent='Launch to class'}
}
function openMonitor(task,serverNow){
 const seq=++monitorSeq,offset=Date.now()-new Date(serverNow||Date.now()).getTime(),endLocal=new Date(task.endsAt).getTime()+offset;
 showModal(`<section class="live-monitor"><div class="section-head"><div><span class="role-kicker">Live now · ${esc(task.className||classById(task.classId)?.name||'Class')}</span><h3>${esc(task.title)}</h3><p class="muted">Students are completing this task now.</p></div><div class="live-monitor-clock" id="teacherLiveClock">${fmt((endLocal-Date.now())/1000)}</div></div><div class="live-monitor-metrics" id="liveMonitorMetrics"></div><div id="liveQuestionStats"></div><div id="liveSubmissionList"></div><div class="live-monitor-actions"><button class="ghost-btn" type="button" id="closeMonitorModal">Close view</button><button class="ghost-btn danger-action" type="button" id="endLiveTask">End task now</button></div></section>`);
 $id('closeMonitorModal').onclick=()=>{monitorSeq++;closeModal()};
 $id('endLiveTask').onclick=async()=>{if(!confirm('End this live task now?'))return;await api('/api/teacher/live-tasks/'+encodeURIComponent(task.id)+'/close',{method:'PATCH'});monitorSeq++;closeModal()};
 const tick=()=>{if(seq!==monitorSeq||!$id('teacherLiveClock'))return;$id('teacherLiveClock').textContent=fmt((endLocal-Date.now())/1000);if(Date.now()<endLocal)setTimeout(tick,500)};tick();
 const poll=async()=>{if(seq!==monitorSeq||!$id('liveMonitorMetrics'))return;try{const r=await api('/api/teacher/live-tasks/'+encodeURIComponent(task.id)+'/results');renderResults(r)}catch{}if(seq===monitorSeq)setTimeout(poll,2000)};poll();
}
function renderResults(r){
 const m=$id('liveMonitorMetrics');if(!m)return;m.innerHTML=`<div><strong>${r.submittedCount}/${r.rosterCount}</strong><span>submitted</span></div><div><strong>${r.averageScore==null?'—':r.averageScore+'%'}</strong><span>${r.task.taskType==='mcq'?'average score':'writing task'}</span></div><div><strong>${r.remainingCount}</strong><span>still working</span></div><div><strong>${r.lateCount}</strong><span>late</span></div>`;
 const qs=$id('liveQuestionStats');if(qs)qs.innerHTML=r.questionStats?.length?`<section class="live-stat-card"><h4>Question understanding</h4>${r.questionStats.map((q,i)=>`<div class="live-stat-row"><span>Q${i+1} · ${esc(q.q)}</span><strong>${q.correctPct}%</strong></div>`).join('')}</section>`:'';
 const list=$id('liveSubmissionList');if(list)list.innerHTML=`<section class="live-stat-card"><h4>Student results</h4>${r.submissions?.length?r.submissions.map(s=>`<div class="live-student-result"><span><strong>${esc(s.name)}</strong><small>${s.timedOut?'Late':'Submitted'}</small></span><strong>${s.score==null?'✓':s.score+'%'}</strong></div>`).join(''):'<p class="muted">Waiting for the first submission…</p>'}</section>`;
}

function ensureStudentRoot(){let root=$id('egLiveTaskRoot');if(!root){root=document.createElement('div');root.id='egLiveTaskRoot';document.body.appendChild(root)}return root}
async function pollStudent(){
 if(role()!=='student'){setTimeout(pollStudent,4000);return}
 try{const r=await api('/api/student/live-task/current');if(!r.task){studentTaskId=null;clearStudentTimer();const root=$id('egLiveTaskRoot');if(root&&!studentResultShowing)root.innerHTML=''}else if(!r.submission&&!dismissed.has(r.task.id)){if(studentTaskId!==r.task.id)renderStudentTask(r.task,r.serverNow);studentTaskId=r.task.id}else if(r.submission&&studentTaskId!==r.task.id&&!dismissed.has(r.task.id)){renderStudentExistingResult(r.task,r.submission);studentTaskId=r.task.id}}catch{}
 setTimeout(pollStudent,4000);
}
function clearStudentTimer(){if(studentTimer){clearInterval(studentTimer);studentTimer=null}}
function renderStudentTask(task,serverNow){
 clearStudentTimer();studentSubmitting=false;studentResultShowing=false;const root=ensureStudentRoot(),offset=Date.now()-new Date(serverNow||Date.now()).getTime(),endLocal=new Date(task.endsAt).getTime()+offset;
 const body=task.taskType==='mcq'?`<div class="student-live-questions">${task.content.questions.map((q,i)=>`<fieldset class="student-live-q"><legend><span>${i+1}</span>${esc(q.q)}</legend>${q.options.map((o,j)=>`<label><input type="radio" name="live_${esc(q.id)}" value="${j}"><span>${esc(o)}</span></label>`).join('')}</fieldset>`).join('')}</div>`:`<div class="student-live-writing"><p>${esc(task.content.instructions)}</p><textarea id="studentLiveWriting" rows="8" placeholder="Write your response here…"></textarea><small>Minimum ${Number(task.content.minWords)||0} words</small></div>`;
 root.innerHTML=`<div class="student-live-overlay"><section class="student-live-panel"><header><div><span class="role-kicker">Live task · ${esc(task.className)}</span><h2>${esc(task.title)}</h2></div><div class="student-live-clock" id="studentLiveClock">00:00</div></header><div class="student-live-progress"><span>Complete and submit before the timer ends.</span></div>${body}<div class="student-live-submit"><div id="studentLiveMessage"></div><button class="primary-btn" type="button" id="studentLiveSubmit">Submit live task</button></div></section></div>`;
 $id('studentLiveSubmit').onclick=()=>submitStudent(task,false);
 let autoSent=false;const tick=()=>{const remain=(endLocal-Date.now())/1000,clock=$id('studentLiveClock');if(clock)clock.textContent=fmt(remain);if(remain<=0&&!autoSent){autoSent=true;submitStudent(task,true)}};tick();studentTimer=setInterval(tick,500);
}
function studentPayload(task){
 if(task.taskType==='writing')return {text:$id('studentLiveWriting')?.value||''};
 const answers={};for(const q of task.content.questions){const checked=document.querySelector(`input[name="live_${CSS.escape(q.id)}"]:checked`);if(checked)answers[q.id]=Number(checked.value)}return {answers};
}
async function submitStudent(task,automatic){
 if(studentSubmitting)return;studentSubmitting=true;const btn=$id('studentLiveSubmit'),msg=$id('studentLiveMessage');if(btn){btn.disabled=true;btn.textContent=automatic?'Time ended · saving…':'Submitting…'}
 try{const r=await api('/api/student/live-tasks/'+encodeURIComponent(task.id)+'/submit',{method:'POST',body:JSON.stringify(studentPayload(task))});clearStudentTimer();showStudentResult(task,r)}catch(e){studentSubmitting=false;if(msg)msg.innerHTML=`<div class="feedback bad">${esc(e.message)}</div>`;if(btn){btn.disabled=false;btn.textContent='Submit live task'}}
}
function showStudentResult(task,r){
 studentResultShowing=true;const root=ensureStudentRoot();let detail='';if(task.taskType==='mcq'){detail=`<div class="student-live-score"><strong>${r.score}%</strong><span>${r.correctCount} of ${r.totalCount} correct</span></div><div class="student-live-review">${(r.review||[]).map((x,i)=>`<div class="${x.correct?'good':'bad'}"><strong>Q${i+1}: ${x.correct?'Correct':'Review'}</strong>${x.explanation?`<span>${esc(x.explanation)}</span>`:''}</div>`).join('')}</div>`}else detail='<div class="student-live-score"><strong>Submitted</strong><span>Your writing was sent to your teacher.</span></div>';
 root.innerHTML=`<div class="student-live-overlay"><section class="student-live-panel student-live-result"><span class="role-kicker">Live task complete</span><h2>${esc(task.title)}</h2>${detail}<div class="feedback ${r.timedOut?'bad':'good'}">${esc(r.message||'Submitted.')}</div><button class="primary-btn" id="closeStudentLiveResult" type="button">Return to lesson</button></section></div>`;
 $id('closeStudentLiveResult').onclick=()=>{studentResultShowing=false;dismissed.add(task.id);root.innerHTML='';studentTaskId=task.id};
}
function renderStudentExistingResult(task,sub){
 studentResultShowing=true;const root=ensureStudentRoot();root.innerHTML=`<div class="student-live-overlay"><section class="student-live-panel student-live-result"><span class="role-kicker">Live task complete</span><h2>${esc(task.title)}</h2>${task.taskType==='mcq'?`<div class="student-live-score"><strong>${sub.score}%</strong><span>${sub.correctCount} of ${sub.totalCount} correct</span></div>`:'<div class="student-live-score"><strong>Submitted</strong><span>Your writing was sent to your teacher.</span></div>'}<button class="primary-btn" id="closeStudentLiveResult" type="button">Return to lesson</button></section></div>`;$id('closeStudentLiveResult').onclick=()=>{studentResultShowing=false;dismissed.add(task.id);root.innerHTML=''};
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhanceTeacherClasses()})}
function boot(){enhanceTeacherClasses();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true});setTimeout(pollStudent,1500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
