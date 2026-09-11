(function(){
'use strict';
const PAGE='content-auditor';
const esc=v=>typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const $id=id=>document.getElementById(id);
const APPROVALS=window.__contentAuditorApprovals=window.__contentAuditorApprovals||{};
function specs(){return (window.A1_FOUNDATION_SPECS||[]).slice(0,10)}
function issue(code,severity,message,fix){return{code,severity,message,fix}}
function lessonUsesContextVocab(n){return n>=1&&n<=10&&window.A1_EARLY_VOCAB_RENDERER_VERSION==='context-v2-live-runner'}
function auditLesson(s,i){
 const issues=[]; const n=i+1;
 const reading=String(s?.r?.text||''),listening=String(s?.l?.script||''),writing=String(s?.writing||''),performance=String(s?.performance||'');
 const vocab=Array.isArray(s?.v)?s.v:[];
 if(!s?.outcome||String(s.outcome).length<12)issues.push(issue('OBJECTIVE_WEAK','MAJOR','Learning outcome is missing or too vague.','Write one observable A1 can-do outcome.'));
 if(vocab.length<5||vocab.length>8)issues.push(issue('VOCAB_LOAD','MODERATE',`Vocabulary load is ${vocab.length}; early A1 should stay tightly controlled.`,'Keep 5–8 high-frequency, immediately useful items.'));
 vocab.forEach((v,j)=>{const [word,def,example]=v||[];if(!word||!def||!example)issues.push(issue('VOCAB_INCOMPLETE','MAJOR',`Vocabulary item ${j+1} is incomplete.`,'Add a learner-friendly meaning and natural example.'));if(String(def||'').length>75)issues.push(issue('DEFINITION_COMPLEXITY','MODERATE',`“${word}” has a long definition for early A1.`,'Shorten the meaning or teach it through a situation/example.'))});
 if(n<=10&&!lessonUsesContextVocab(n))issues.push(issue('META_LANGUAGE_OVERUSE','MAJOR','The learner-facing vocabulary activity is still definition-heavy.','Replace definition testing with situation → word, sentence completion, context choice, picture/function, and simple recall.'));
 if(/auto-graded|build\s*[→>-]|combine\s*[→>-]|correct\s*[→>-]/i.test(writing))issues.push(issue('STUDENT_META_TEXT','CRITICAL','Teacher/developer workflow language appears in student-facing writing.','Remove meta instructions from student content.'));
 if(reading.length<45)issues.push(issue('READING_TOO_THIN','MODERATE','Reading text may be too thin to support comprehension practice.','Use a short coherent text with concrete who/where/detail information.'));
 if(!s?.r?.skillQ?.q)issues.push(issue('READING_CHECK_MISSING','MAJOR','No source reading comprehension check found.','Add direct text-grounded comprehension questions.'));
 if(!listening.includes(':'))issues.push(issue('LISTENING_STRUCTURE','MAJOR','Listening does not appear to contain clear speaker turns.','Use a coherent dialogue with consistent named speakers.'));
 if(performance.length<20)issues.push(issue('COMMUNICATIVE_USE','MODERATE','Speaking/performance task is weak or missing.','Add one short communicative A1 task tied to the lesson outcome.'));
 if(writing.length<15)issues.push(issue('WRITING_SCAFFOLD','MODERATE','Writing task is weak or missing.','Add a short guided real-life writing task.'));
 const critical=issues.some(x=>x.severity==='CRITICAL'),major=issues.filter(x=>x.severity==='MAJOR').length,moderate=issues.filter(x=>x.severity==='MODERATE').length;
 let score=Math.max(0,100-(critical?35:0)-major*9-moderate*4);
 let status=critical||score<50?'REJECT':score<70?'FIX':score<80?'REVIEW':score<90?'PASS':'PASS_EXCELLENT';
 return{lesson:n,title:s?.title||`Lesson ${n}`,score,status,issues,counts:{critical:issues.filter(x=>x.severity==='CRITICAL').length,major,moderate}};
}
function audit(){return specs().map(auditLesson)}
function badge(s){return `<span class="ca-status ${s.toLowerCase()}">${s.replace('_',' ')}</span>`}
function fixPlan(r){
 const fixes=r.issues.map(x=>({code:x.code,action:x.fix}));
 if(!fixes.length)return{lesson:r.lesson,title:r.title,summary:'No configured repair is required.',fixes:[],ready:true};
 return{lesson:r.lesson,title:r.title,summary:`Repair only ${fixes.length} flagged area${fixes.length===1?'':'s'}; keep the rest of the lesson unchanged.`,fixes,ready:false};
}
function openRepair(r){
 const p=fixPlan(r); window.__caRepair=p;
 const modal=document.createElement('div');modal.className='ca-modal';modal.id='caModal';
 modal.innerHTML=`<div class="ca-modal-card"><div class="ca-modal-head"><div><span class="ca-kicker">Controlled repair</span><h2>Lesson ${r.lesson}: ${esc(r.title)}</h2><p>${esc(p.summary)}</p></div><button class="icon-btn" id="caClose">×</button></div><div class="ca-repair-flow"><div class="active"><b>1</b><span>Diagnose</span></div><div><b>2</b><span>Prepare fix</span></div><div><b>3</b><span>Re-audit</span></div><div><b>4</b><span>Approve</span></div></div><div class="ca-repair-list">${p.fixes.map((x,i)=>`<article><span>${i+1}</span><div><code>${esc(x.code)}</code><p>${esc(x.action)}</p></div></article>`).join('')||'<p class="ca-clear">No configured issues remain.</p>'}</div><div class="ca-modal-actions"><button class="ghost-btn" id="caReaudit">Re-audit lesson</button><button class="primary-btn" id="caApprove" ${p.fixes.length?'disabled':''}>Approve for publish</button></div><p class="ca-gate" id="caGate">${p.fixes.length?'Approval stays locked until the repaired lesson passes re-audit.':'This lesson is ready for approval.'}</p></div>`;
 document.body.appendChild(modal);
 $id('caClose').onclick=()=>modal.remove();
 $id('caReaudit').onclick=()=>{const latest=audit()[r.lesson-1];const pass=latest.status.startsWith('PASS');$id('caGate').textContent=pass?'Re-audit passed. Approval is now available.':`Re-audit result: ${latest.status} (${latest.score}/100). Fix remaining flagged items before publishing.`;$id('caApprove').disabled=!pass};
 $id('caApprove').onclick=()=>{const latest=audit()[r.lesson-1];if(!latest.status.startsWith('PASS'))return;APPROVALS[r.lesson]={at:new Date().toISOString(),score:latest.score,status:latest.status};$id('caGate').textContent='Approved. This lesson has passed the configured audit gate.';$id('caApprove').disabled=true;$id('caApprove').textContent='Approved';setTimeout(()=>{modal.remove();render()},700)};
}
function render(){
 const rows=audit(),avg=Math.round(rows.reduce((a,b)=>a+b.score,0)/Math.max(1,rows.length)),flagged=rows.filter(r=>!r.status.startsWith('PASS')).length,critical=rows.reduce((a,r)=>a+r.counts.critical,0),approved=Object.keys(APPROVALS).length;
 title('Content quality','Lesson & Activity Checker');
 $id('content').innerHTML=`<div class="ca-shell"><section class="ca-hero"><div><span class="ca-kicker">CEFR + ESL Quality Control</span><h1>A1 Lessons 1–10 audit</h1><p>Diagnose → prepare one surgical repair → re-audit → approve. No mass regeneration and no automatic publishing.</p></div><button class="primary-btn" id="caRun">Run audit again</button></section><section class="ca-metrics"><article><span>Lessons checked</span><strong>${rows.length}</strong></article><article><span>Average score</span><strong>${avg}/100</strong></article><article><span>Need review/fix</span><strong>${flagged}</strong></article><article><span>Approved</span><strong>${approved}</strong></article></section><section class="ca-panel"><div class="ca-head"><div><h2>Audit results</h2><p>Open a lesson to see the exact issue and controlled repair path.</p></div></div><div class="ca-list">${rows.map(r=>`<details class="ca-row"><summary><div class="ca-lesson"><b>${r.lesson}</b><div><strong>${esc(r.title)}</strong><small>${r.issues.length} issue${r.issues.length===1?'':'s'} detected${APPROVALS[r.lesson]?' · approved':''}</small></div></div><div class="ca-score"><strong>${r.score}</strong>${badge(r.status)}</div></summary><div class="ca-issues">${r.issues.map(x=>`<article class="ca-issue ${x.severity.toLowerCase()}"><div><span>${esc(x.severity)}</span><code>${esc(x.code)}</code></div><strong>${esc(x.message)}</strong><p><b>Fix:</b> ${esc(x.fix)}</p></article>`).join('')||'<p class="ca-clear">No rule-based issues detected in this pilot scan.</p>'}<div class="ca-action"><button class="ghost-btn" data-ca-lesson="${r.lesson}">${r.issues.length?'Prepare surgical fix':'Review & approve'}</button><small>Publishing remains locked until re-audit passes.</small></div></div></details>`).join('')}</div></section><p class="ca-note">Pilot scope: A1 Lessons 1–10. Approval is an internal quality gate; it does not alter lesson files by itself.</p></div>`;
 $id('caRun').onclick=render;
 document.querySelectorAll('[data-ca-lesson]').forEach(b=>b.onclick=()=>openRepair(rows[Number(b.dataset.caLesson)-1]));
}
window.contentAuditor=render;
function install(){try{if(typeof NAV!=='undefined'&&Array.isArray(NAV.admin)&&!NAV.admin.some(x=>x[0]===PAGE))NAV.admin.splice(2,0,[PAGE,'✓','Content Checker']);if(typeof renderAdmin==='function'&&!window.__contentAuditorInstalled){const prev=renderAdmin;renderAdmin=function(){if(currentPage===PAGE)return render();return prev()};window.__contentAuditorInstalled=true}}catch(e){console.error('Content auditor install failed',e)}}
install();
})();
