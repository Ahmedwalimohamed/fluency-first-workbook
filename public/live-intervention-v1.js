/* EnglishGate Live Task — student delivery */
(function(){
'use strict';

let studentTaskId=null,studentTimer=null,studentSubmitting=false,studentResultShowing=false,studentEndLocal=0;
const dismissed=new Set();
const $id=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const role=()=>{try{return typeof session!=='undefined'?session?.role:null}catch{return null}};
const fmt=sec=>{sec=Math.max(0,Math.ceil(sec));return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')};

function ensureRoot(){
  let root=$id('egLiveTaskRoot');
  if(!root){root=document.createElement('div');root.id='egLiveTaskRoot';document.body.appendChild(root)}
  return root;
}
function clearTimer(){if(studentTimer){clearInterval(studentTimer);studentTimer=null}}

function renderQuestion(q,i){
  const type=q.type||'multiple_choice',legend=`<legend><span>${i+1}</span>${esc(q.prompt||'')}</legend>`;
  if(type==='multiple_choice'||type==='true_false'){
    return `<fieldset class="student-live-q">${legend}${(q.options||[]).map((o,j)=>`<label><input type="radio" name="live_${esc(q.id)}" value="${j}"><span>${esc(o)}</span></label>`).join('')}</fieldset>`;
  }
  if(['short_answer','fill_blank','sentence_correction','sentence_construction'].includes(type)){
    const placeholder=type==='fill_blank'?'Type the missing word or phrase…':type==='sentence_correction'?'Write the corrected sentence…':type==='sentence_construction'?'Build the sentence here…':'Type your answer…';
    return `<fieldset class="student-live-q student-live-text-q">${legend}<textarea data-live-text-answer="${esc(q.id)}" rows="3" placeholder="${placeholder}"></textarea></fieldset>`;
  }
  if(type==='matching'){
    return `<fieldset class="student-live-q student-live-matching">${legend}${(q.leftItems||[]).map(left=>`<label class="student-live-match-row"><span>${esc(left)}</span><select data-live-match="${esc(q.id)}" data-left="${esc(left)}"><option value="">Choose match</option>${(q.rightOptions||[]).map(r=>`<option value="${esc(r)}">${esc(r)}</option>`).join('')}</select></label>`).join('')}</fieldset>`;
  }
  if(type==='ordering'){
    const items=q.items||[],n=items.length;
    return `<fieldset class="student-live-q student-live-ordering">${legend}<p class="student-live-help">Choose the position for each item.</p>${items.map(item=>`<label class="student-live-order-row"><span>${esc(item)}</span><select data-live-order="${esc(q.id)}" data-item="${esc(item)}"><option value="">Position</option>${Array.from({length:n},(_,k)=>`<option value="${k+1}">${k+1}</option>`).join('')}</select></label>`).join('')}</fieldset>`;
  }
  if(['teacher_speaking','individual_speaking','pair_discussion'].includes(type)){
    return `<fieldset class="student-live-q student-live-speaking">${legend}<div class="student-live-speaking-criteria">${(q.successCriteria||[]).map(x=>`<span>• ${esc(x)}</span>`).join('')}</div><label class="student-live-speaking-done"><input type="checkbox" data-live-speaking="${esc(q.id)}"><span>I completed this speaking task</span></label><textarea data-live-speaking-note="${esc(q.id)}" rows="2" placeholder="Optional note…"></textarea></fieldset>`;
  }
  return `<fieldset class="student-live-q">${legend}<textarea data-live-text-answer="${esc(q.id)}" rows="3" placeholder="Type your response…"></textarea></fieldset>`;
}

function renderTask(task,serverNow){
  clearTimer();studentSubmitting=false;studentResultShowing=false;
  const root=ensureRoot(),offset=Date.now()-new Date(serverNow||Date.now()).getTime();studentEndLocal=new Date(task.endsAt).getTime()+offset;
  const body=task.taskType==='writing'
    ?`<div class="student-live-writing"><p>${esc(task.content.instructions)}</p><textarea id="studentLiveWriting" rows="8" placeholder="Write your response here…"></textarea><small>Minimum ${Number(task.content.minWords)||0} words</small></div>`
    :`<div class="student-live-questions">${(task.content.questions||[]).map(renderQuestion).join('')}</div>`;
  root.innerHTML=`<div class="student-live-overlay"><section class="student-live-panel"><header><div><span class="role-kicker">Live task · ${esc(task.className)}</span><h2>${esc(task.title)}</h2></div><div class="student-live-clock" id="studentLiveClock">00:00</div></header><div class="student-live-progress"><span>Complete and submit before the timer ends.</span></div>${body}<div class="student-live-submit"><div id="studentLiveMessage"></div><button class="primary-btn" type="button" id="studentLiveSubmit">Submit live task</button></div></section></div>`;
  $id('studentLiveSubmit').onclick=()=>submit(task,false);
  let autoSent=false;
  const tick=()=>{
    const remain=(studentEndLocal-Date.now())/1000,clock=$id('studentLiveClock');
    if(clock)clock.textContent=fmt(remain);
    if(remain<=0&&!autoSent){autoSent=true;submit(task,true)}
  };
  tick();studentTimer=setInterval(tick,500);
}

function payload(task){
  if(task.taskType==='writing')return {text:$id('studentLiveWriting')?.value||''};
  const answers={};
  for(const q of task.content.questions||[]){
    const type=q.type||'multiple_choice';
    if(type==='multiple_choice'||type==='true_false'){
      const checked=document.querySelector(`input[name="live_${CSS.escape(q.id)}"]:checked`);
      if(checked)answers[q.id]=Number(checked.value);
    }else if(['short_answer','fill_blank','sentence_correction','sentence_construction'].includes(type)){
      const el=document.querySelector(`[data-live-text-answer="${CSS.escape(q.id)}"]`);
      if(el&&el.value.trim())answers[q.id]=el.value.trim();
    }else if(type==='matching'){
      const obj={};
      document.querySelectorAll(`[data-live-match="${CSS.escape(q.id)}"]`).forEach(el=>{if(el.value)obj[el.dataset.left]=el.value});
      if(Object.keys(obj).length)answers[q.id]=obj;
    }else if(type==='ordering'){
      const rows=[...document.querySelectorAll(`[data-live-order="${CSS.escape(q.id)}"]`)]
        .map(el=>({item:el.dataset.item,pos:Number(el.value)}))
        .filter(x=>Number.isInteger(x.pos)&&x.pos>0)
        .sort((a,b)=>a.pos-b.pos);
      if(rows.length)answers[q.id]=rows.map(x=>x.item);
    }else if(['teacher_speaking','individual_speaking','pair_discussion'].includes(type)){
      const done=document.querySelector(`[data-live-speaking="${CSS.escape(q.id)}"]`),note=document.querySelector(`[data-live-speaking-note="${CSS.escape(q.id)}"]`);
      if(done?.checked)answers[q.id]={done:true,note:note?.value.trim()||''};
    }
  }
  return {answers};
}

async function submit(task,automatic){
  if(studentSubmitting)return;
  studentSubmitting=true;
  const btn=$id('studentLiveSubmit'),msg=$id('studentLiveMessage');
  if(btn){btn.disabled=true;btn.textContent=automatic?'Time ended · saving…':'Submitting…'}
  try{
    const r=await api('/api/student/live-tasks/'+encodeURIComponent(task.id)+'/submit',{method:'POST',body:JSON.stringify(payload(task))});
    clearTimer();showResult(task,r);
  }catch(e){
    studentSubmitting=false;
    if(msg)msg.innerHTML=`<div class="feedback bad">${esc(e.message)}</div>`;
    if(btn){btn.disabled=false;btn.textContent='Submit live task'}
  }
}

function resultDetail(score,correctCount,totalCount){
  const hasScore=score!==null&&score!==undefined&&Number.isFinite(Number(score));
  return hasScore
    ?`<div class="student-live-score"><strong>${Number(score)}%</strong><span>${Number(correctCount||0)} of ${Number(totalCount||0)} auto-graded items correct</span></div><div class="student-live-progress"><span>Your work is submitted. Correct answers remain teacher-controlled.</span></div>`
    :'<div class="student-live-score"><strong>Submitted</strong><span>Your response was sent to your teacher.</span></div>';
}
function showResult(task,r){
  studentResultShowing=true;
  const root=ensureRoot();
  root.innerHTML=`<div class="student-live-overlay"><section class="student-live-panel student-live-result"><span class="role-kicker">Live task complete</span><h2>${esc(task.title)}</h2>${resultDetail(r.score,r.correctCount,r.totalCount)}<div class="feedback ${r.timedOut?'bad':'good'}">${esc(r.message||'Submitted.')}</div><button class="primary-btn" id="closeStudentLiveResult" type="button">Return to lesson</button></section></div>`;
  $id('closeStudentLiveResult').onclick=()=>{studentResultShowing=false;dismissed.add(task.id);root.innerHTML='';studentTaskId=task.id};
}
function showExistingResult(task,sub){
  studentResultShowing=true;
  const root=ensureRoot();
  root.innerHTML=`<div class="student-live-overlay"><section class="student-live-panel student-live-result"><span class="role-kicker">Live task complete</span><h2>${esc(task.title)}</h2>${resultDetail(sub.score,sub.correctCount,sub.totalCount)}<button class="primary-btn" id="closeStudentLiveResult" type="button">Return to lesson</button></section></div>`;
  $id('closeStudentLiveResult').onclick=()=>{studentResultShowing=false;dismissed.add(task.id);root.innerHTML=''};
}

async function poll(){
  if(role()!=='student'){setTimeout(poll,4000);return}
  try{
    const r=await api('/api/student/live-task/current');
    if(!r.task){
      studentTaskId=null;clearTimer();const root=$id('egLiveTaskRoot');if(root&&!studentResultShowing)root.innerHTML='';
    }else if(!r.submission&&!dismissed.has(r.task.id)){
      if(studentTaskId!==r.task.id)renderTask(r.task,r.serverNow);
      else if(r.task?.endsAt){const offset=Date.now()-new Date(r.serverNow||Date.now()).getTime();studentEndLocal=new Date(r.task.endsAt).getTime()+offset}
      studentTaskId=r.task.id;
    }else if(r.submission&&studentTaskId!==r.task.id&&!dismissed.has(r.task.id)){
      showExistingResult(r.task,r.submission);studentTaskId=r.task.id;
    }
  }catch{}
  setTimeout(poll,4000);
}

function boot(){setTimeout(poll,1200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();