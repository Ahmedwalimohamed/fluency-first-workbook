(function(){
'use strict';
const LESSON_ID='a1-gold-l1';

function esc(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function speakingCard(){
  return `<section class="section card a1-gold-speaking" id="a1GoldSpeaking">
    <div class="section-head"><div><span class="role-kicker">Speaking transfer · A1 Gold</span><h3>Meet your new classmate</h3><p>Introduce yourself, give at least two personal details, and ask at least two relevant questions.</p></div></div>
    <div id="a1GoldSpeakingTranscript" class="a1-speaking-transcript"></div>
    <div class="a1-speaking-controls"><textarea id="a1GoldSpeakingInput" rows="3" placeholder="Type what you would say…" disabled></textarea><div class="skill-action-row"><button class="primary-btn" id="a1GoldSpeakingStart">Start conversation</button><button class="secondary-btn" id="a1GoldSpeakingSend" disabled>Send reply</button><button class="ghost-btn" id="a1GoldSpeakingFinish" disabled>Finish & check</button></div></div>
    <div id="a1GoldSpeakingStatus"></div>
    <div id="a1GoldFixPanel"></div>
  </section>`;
}
function appendTurn(role,text){
  const box=document.getElementById('a1GoldSpeakingTranscript');if(!box)return;
  const node=document.createElement('div');node.className='a1-speaking-turn '+(role==='ai'?'is-ai':'is-student');
  node.innerHTML=`<small>${role==='ai'?'Sarah':'You'}</small><p>${esc(text)}</p>`;
  box.appendChild(node);box.scrollTop=box.scrollHeight;
}
function injectSpeaking(){
  if(session?.role!=='student')return;
  let current;try{current=lesson()}catch{return}
  if(current?.id!==LESSON_ID||currentStep!=='writing'||document.getElementById('a1GoldSpeaking'))return;
  const host=document.querySelector('.eg-workbook-teaching-surface')||document.getElementById('content');if(!host)return;
  const wrap=document.createElement('div');wrap.innerHTML=speakingCard();host.appendChild(wrap.firstElementChild);
  let speakingSessionId='',ready=false;
  const start=document.getElementById('a1GoldSpeakingStart'),send=document.getElementById('a1GoldSpeakingSend'),finish=document.getElementById('a1GoldSpeakingFinish'),input=document.getElementById('a1GoldSpeakingInput'),status=document.getElementById('a1GoldSpeakingStatus');
  start.onclick=async()=>{
    start.disabled=true;status.innerHTML='<p class="muted">Starting conversation…</p>';
    try{
      const r=await api('/api/a1-gold/speaking/start',{method:'POST',body:JSON.stringify({lessonId:LESSON_ID})});
      speakingSessionId=r.sessionId;appendTurn('ai',r.message);input.disabled=false;send.disabled=false;status.innerHTML='<div class="feedback good">Speak naturally. Small grammar mistakes do not stop the conversation.</div>';input.focus();
    }catch(e){start.disabled=false;status.innerHTML=`<div class="feedback bad">${esc(e.message)}</div>`}
  };
  async function sendTurn(){
    const text=input.value.trim();if(!text||!speakingSessionId)return;
    send.disabled=true;input.disabled=true;appendTurn('student',text);input.value='';
    try{
      const r=await api('/api/a1-gold/speaking/turn',{method:'POST',body:JSON.stringify({sessionId:speakingSessionId,text})});
      appendTurn('ai',r.message);ready=Boolean(r.readyToComplete);finish.disabled=!ready;
      const ev=r.evidence||{};status.innerHTML=`<div class="feedback ${ready?'good':''}"><strong>Evidence:</strong> ${Number(ev.personalDetails||0)} personal details · ${Number(ev.relevantQuestions||0)} questions${ready?' · Ready to check transfer':''}</div>`;
    }catch(e){status.innerHTML=`<div class="feedback bad">${esc(e.message)}</div>`}
    finally{send.disabled=false;input.disabled=false;input.focus()}
  }
  send.onclick=sendTurn;
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendTurn()}});
  finish.onclick=async()=>{
    if(!ready||!speakingSessionId)return;finish.disabled=true;send.disabled=true;input.disabled=true;status.innerHTML='<p class="muted">Jev is checking the A1 transfer evidence…</p>';
    try{
      const r=await api('/api/a1-gold/speaking/complete',{method:'POST',body:JSON.stringify({sessionId:speakingSessionId})});
      const good=r.masteryState==='MASTERED';
      status.innerHTML=`<div class="feedback ${good?'good':'bad'}"><strong>${esc(r.masteryState)}</strong> · Jev: ${esc(r.jevStatus)}. ${good?'You completed the real-life speaking goal.':'Review the feedback and try the conversation again.'}</div>`;
      renderFixes(r.repairs||[]);
    }catch(e){status.innerHTML=`<div class="feedback bad">${esc(e.message)}</div>`}
  };
}
function renderFixes(items){
  const host=document.getElementById('a1GoldFixPanel');if(!host)return;
  if(!items.length){host.innerHTML='<div class="feedback good"><strong>Fix & Improve:</strong> No priority correction was detected in this transfer.</div>';return}
  host.innerHTML=`<div class="section-head"><div><span class="role-kicker">Fix & Improve</span><h4>Repair your highest-value forms</h4><p>Read the model, then type the corrected sentence yourself.</p></div></div>`+items.map(x=>`<div class="guided-question" data-a1-fix="${Number(x.id)}"><p><s>${esc(x.original||'')}</s></p><strong>${esc(x.model||'')}</strong><input type="text" data-a1-fix-input placeholder="Type the corrected sentence"><button class="secondary-btn" type="button" data-a1-fix-retry>Check retry</button><div data-a1-fix-result></div></div>`).join('');
  host.querySelectorAll('[data-a1-fix]').forEach(card=>{
    const button=card.querySelector('[data-a1-fix-retry]'),input=card.querySelector('[data-a1-fix-input]'),result=card.querySelector('[data-a1-fix-result]');
    button.onclick=async()=>{
      const retry=input.value.trim();if(!retry)return;
      button.disabled=true;
      try{
        const r=await api('/api/a1-gold/fix-retry',{method:'POST',body:JSON.stringify({id:Number(card.dataset.a1Fix),retry})});
        result.innerHTML=r.resolved?'<div class="feedback good">Repair confirmed.</div>':`<div class="feedback bad">Try again. Model: ${esc(r.model)}</div>`;
        if(r.resolved){input.disabled=true;button.disabled=true}else button.disabled=false;
      }catch(e){result.innerHTML=`<div class="feedback bad">${esc(e.message)}</div>`;button.disabled=false}
    };
  });
}

async function injectReportEvidence(){
  if(activeStudentReportLessonId!==LESSON_ID||!activeStudentReportId)return;
  const page=document.querySelector('.lesson-performance-page');if(!page||document.getElementById('a1GoldReportEvidence'))return;
  const section=document.createElement('section');section.className='report-360-section';section.id='a1GoldReportEvidence';
  section.innerHTML='<div class="section-head"><div><h2>Speaking transfer & Fix evidence</h2><p>Loading saved A1 Gold evidence…</p></div></div>';
  page.appendChild(section);
  try{
    const r=await api('/api/a1-gold/report/'+encodeURIComponent(activeStudentReportId)+'/'+encodeURIComponent(LESSON_ID));
    const latest=(r.speaking||[])[0],fixes=r.fixes||[];
    const transcript=latest?.transcript||[];
    section.innerHTML=`<div class="section-head"><div><h2>Speaking transfer & Fix evidence</h2><p>Actual learner evidence from the A1 real-life mission.</p></div></div>
      <div class="report-kpi-strip"><div><small>Mastery</small><strong>${esc(latest?.mastery_state||'—')}</strong><span>Jev: ${esc(latest?.jev_status||'—')}</span></div><div><small>Personal details</small><strong>${Number(latest?.personal_details||0)}</strong><span>Minimum 2</span></div><div><small>Questions initiated</small><strong>${Number(latest?.relevant_questions||0)}</strong><span>Minimum 2</span></div><div><small>Fixes</small><strong>${fixes.length}</strong><span>${fixes.filter(x=>x.resolved).length} resolved</span></div></div>
      <div class="card"><h3>Conversation transcript</h3>${transcript.length?transcript.map(t=>`<div class="report-timeline-item"><span></span><div><strong>${t.role==='ai'?'Sarah':'Student'}</strong><small>${esc(t.text)}</small></div></div>`).join(''):'<p class="muted">No speaking transfer submitted yet.</p>'}</div>
      ${fixes.length?`<div class="card"><h3>Fix & Improve</h3>${fixes.map(f=>`<p><strong>${esc(f.focus)}</strong>: ${esc(f.original_text)} → ${esc(f.model_text)} ${f.resolved?'✓':''}</p>`).join('')}</div>`:''}`;
  }catch(e){section.innerHTML=`<div class="feedback bad">${esc(e.message)}</div>`}
}

try{
  const originalWorkbook=workbook;
  workbook=function a1GoldWorkbook(){
    const out=originalWorkbook.apply(this,arguments);
    setTimeout(injectSpeaking,0);
    return out;
  };
}catch(e){console.warn('A1 Gold workbook hook unavailable',e)}

try{
  const originalLessonReport=renderStudentLessonPage;
  renderStudentLessonPage=function a1GoldLessonReport(){
    const out=originalLessonReport.apply(this,arguments);
    setTimeout(injectReportEvidence,0);
    return out;
  };
}catch(e){console.warn('A1 Gold report hook unavailable',e)}
})();