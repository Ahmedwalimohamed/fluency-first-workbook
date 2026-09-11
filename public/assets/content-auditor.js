(function(){
'use strict';
const PAGE='content-auditor';
const esc=v=>typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const $id=id=>document.getElementById(id);
const APPROVALS=window.__contentAuditorApprovals=window.__contentAuditorApprovals||{};
const PROPOSALS=window.__contentAuditorProposals=window.__contentAuditorProposals||{};
function specs(){return (window.A1_FOUNDATION_SPECS||[]).slice(0,10)}
function issue(code,severity,message,fix){return{code,severity,message,fix}}
function lessonUsesContextVocab(n){return n>=1&&n<=10&&/^context-v(2|3)-/.test(String(window.A1_EARLY_VOCAB_RENDERER_VERSION||''))}
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
function repairComponent(r){
 const codes=new Set(r.issues.map(x=>x.code));
 if(codes.has('META_LANGUAGE_OVERUSE')||codes.has('VOCAB_LOAD')||codes.has('VOCAB_INCOMPLETE')||codes.has('DEFINITION_COMPLEXITY'))return'vocabulary';
 if(codes.has('READING_TOO_THIN')||codes.has('READING_CHECK_MISSING'))return'reading';
 if(codes.has('LISTENING_STRUCTURE'))return'listening';
 if(codes.has('WRITING_SCAFFOLD')||codes.has('STUDENT_META_TEXT'))return'writing';
 if(codes.has('OBJECTIVE_WEAK'))return'objective';
 if(codes.has('COMMUNICATIVE_USE'))return'speaking';
 return'vocabulary';
}
function validateProposal(p,component){
 const problems=[];
 if(!p||typeof p!=='object'||!p.replacement)problems.push('Missing replacement content.');
 if(component==='vocabulary'){
   const items=p?.replacement?.items;
   if(!Array.isArray(items)||items.length<6)problems.push('Vocabulary proposal needs at least 6 usable items.');
   (items||[]).forEach((q,i)=>{if(!q?.q||!Array.isArray(q?.options)||q.options.length<3||!q?.answer||!q.options.includes(q.answer))problems.push(`Vocabulary item ${i+1} is not safely auto-gradable.`);if(/what does|which word means|means:/i.test(String(q?.q||'')))problems.push(`Vocabulary item ${i+1} still uses definition testing.`)});
 } else problems.push('Safe publishing is currently enabled for vocabulary only.');
 const score=Number(p?.selfAudit?.overall||0);
 if(score&&score<80)problems.push(`AI self-audit is only ${score}/100.`);
 return{pass:problems.length===0,problems};
}
async function generateProposal(r){
 const b=$id('caGenerate'),gate=$id('caGate'),preview=$id('caProposal'),approve=$id('caApprove');
 const component=repairComponent(r),lesson=specs()[r.lesson-1];
 b.disabled=true;b.textContent='Generating…';gate.textContent='AI is preparing a surgical correction. Nothing will be published automatically.';
 try{
   const resp=await fetch('/api/content-repair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lessonNumber:r.lesson,component,lesson,issues:r.issues})});
   const data=await resp.json();
   if(!resp.ok)throw new Error(data?.detail||data?.error||'Generation failed');
   const proposal=data.proposal,check=validateProposal(proposal,component);PROPOSALS[r.lesson]={proposal,check,component,generatedAt:new Date().toISOString()};
   preview.classList.remove('hidden');preview.innerHTML=`<div class="ca-proposal-head"><div><span class="ca-kicker">AI proposed correction</span><h3>${esc(proposal.summary||'Surgical correction')}</h3></div>${check.pass?'<span class="ca-proposal-pass">Pre-check passed</span>':'<span class="ca-proposal-fail">Needs review</span>'}</div><div class="ca-proposal-meta"><span>Component: <b>${esc(component)}</b></span><span>AI self-audit: <b>${esc(proposal?.selfAudit?.overall??'—')}/100</b></span></div><pre>${esc(JSON.stringify(proposal.replacement,null,2))}</pre>${check.problems.length?`<div class="ca-proposal-warnings"><b>Automated pre-check:</b>${check.problems.map(x=>`<p>${esc(x)}</p>`).join('')}</div>`:''}`;
   gate.textContent=check.pass?'Proposal passed the structural pre-check. Review it, then approve and apply the patch.':'The proposal was generated, but automated checks found issues. Generate again or review manually.';
   approve.disabled=!check.pass;approve.textContent='Approve & apply patch';
 }catch(e){gate.textContent='Generation failed: '+e.message}
 finally{b.disabled=false;b.textContent='Generate AI correction'}
}
async function applyProposal(r){
 const saved=PROPOSALS[r.lesson],gate=$id('caGate'),approve=$id('caApprove');if(!saved?.check?.pass)return;
 approve.disabled=true;approve.textContent='Applying…';gate.textContent='Saving approved patch. Standards re-audit will run automatically after apply…';
 try{
   const resp=await fetch('/api/content-patches/apply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({courseId:'speakup-a1',lessonNumber:r.lesson,component:saved.component,replacement:saved.proposal.replacement,summary:saved.proposal.summary,selfAudit:saved.proposal.selfAudit})});
   const data=await resp.json();if(!resp.ok)throw new Error(data?.problems?.join(' ')||data?.error||'Patch apply failed');
   await window.EnglishGateContentPatches?.reload?.();
   APPROVALS[r.lesson]={at:new Date().toISOString(),score:Number(saved.proposal?.selfAudit?.overall||0),status:'PUBLISHED_PATCH',component:saved.component,patchId:data.patchId};
   gate.textContent=`Patch ${data.patchId} applied. Running CEFR + ESL standards re-audit…`;
   if(typeof window.runStandardsAuditForLesson==='function'){
     await window.runStandardsAuditForLesson(r.lesson,null,{silent:true});
     approve.textContent='Applied & re-audited';
     setTimeout(()=>{document.getElementById('caModal')?.remove();window.contentStandardsAuditor?.()},700);
   } else {
     approve.textContent='Patch applied';
     setTimeout(()=>render(),1000);
   }
 }catch(e){gate.textContent='Patch was not applied: '+e.message;approve.disabled=false;approve.textContent='Approve & apply patch'}
}
function openRepair(r){
 const p=fixPlan(r); window.__caRepair=p;
 const modal=document.createElement('div');modal.className='ca-modal';modal.id='caModal';
 modal.innerHTML=`<div class="ca-modal-card"><div class="ca-modal-head"><div><span class="ca-kicker">Controlled repair</span><h2>Lesson ${r.lesson}: ${esc(r.title)}</h2><p>${esc(p.summary)}</p></div><button class="icon-btn" id="caClose">×</button></div><div class="ca-repair-flow"><div class="active"><b>1</b><span>Diagnose</span></div><div><b>2</b><span>Generate fix</span></div><div><b>3</b><span>Pre-check</span></div><div><b>4</b><span>Apply + re-audit</span></div></div><div class="ca-repair-list">${p.fixes.map((x,i)=>`<article><span>${i+1}</span><div><code>${esc(x.code)}</code><p>${esc(x.action)}</p></div></article>`).join('')||'<p class="ca-clear">No configured issues remain.</p>'}</div><div class="ca-modal-actions"><button class="ghost-btn" id="caGenerate" ${p.fixes.length?'':'disabled'}>Generate AI correction</button><button class="primary-btn" id="caApprove" disabled>Approve & apply patch</button></div><div class="ca-proposal hidden" id="caProposal"></div><p class="ca-gate" id="caGate">${p.fixes.length?'Generate a correction first. After apply, CEFR + ESL re-audit runs automatically.':'No repair is required.'}</p></div>`;
 document.body.appendChild(modal);
 $id('caClose').onclick=()=>modal.remove();
 $id('caGenerate').onclick=()=>generateProposal(r);
 $id('caApprove').onclick=()=>applyProposal(r);
}
window.contentAuditorOpenRepair=function(standardsResult,lessonNumber){
 const s=specs()[lessonNumber-1]||{};
 const issues=(standardsResult?.issues||[]).map(x=>issue(String(x.code||'STANDARDS_ISSUE'),String(x.severity||'MODERATE').toUpperCase(),String(x.message||''),String(x.fix||'Repair the flagged component.')));
 openRepair({lesson:lessonNumber,title:s.title||`Lesson ${lessonNumber}`,issues,score:standardsResult?.overall,status:standardsResult?.status,counts:{}});
};
function render(){
 const rows=audit(),avg=Math.round(rows.reduce((a,b)=>a+b.score,0)/Math.max(1,rows.length)),flagged=rows.filter(r=>!r.status.startsWith('PASS')).length,approved=Object.keys(APPROVALS).length;
 title('Content quality','Lesson & Activity Checker');
 $id('content').innerHTML=`<div class="ca-shell"><section class="ca-hero"><div><span class="ca-kicker">CEFR + ESL Quality Control</span><h1>A1 Lessons 1–10 audit</h1><p>Diagnose → generate a surgical AI correction → pre-check → approve & apply. Approved vocabulary patches are versioned in the database and used by the learner renderer.</p></div><button class="primary-btn" id="caRun">Run audit again</button></section><section class="ca-metrics"><article><span>Lessons checked</span><strong>${rows.length}</strong></article><article><span>Average score</span><strong>${avg}/100</strong></article><article><span>Need review/fix</span><strong>${flagged}</strong></article><article><span>Patches applied this session</span><strong>${approved}</strong></article></section><section class="ca-panel"><div class="ca-head"><div><h2>Audit results</h2><p>Open a lesson to repair only the flagged component. Vocabulary is the first safe-publish pilot.</p></div></div><div class="ca-list">${rows.map(r=>`<details class="ca-row"><summary><div class="ca-lesson"><b>${r.lesson}</b><div><strong>${esc(r.title)}</strong><small>${r.issues.length} issue${r.issues.length===1?'':'s'} detected${APPROVALS[r.lesson]?' · patch applied':''}</small></div></div><div class="ca-score"><strong>${r.score}</strong>${badge(r.status)}</div></summary><div class="ca-issues">${r.issues.map(x=>`<article class="ca-issue ${x.severity.toLowerCase()}"><div><span>${esc(x.severity)}</span><code>${esc(x.code)}</code></div><strong>${esc(x.message)}</strong><p><b>Fix:</b> ${esc(x.fix)}</p></article>`).join('')||'<p class="ca-clear">No rule-based issues detected in this pilot scan.</p>'}<div class="ca-action"><button class="ghost-btn" data-ca-lesson="${r.lesson}">${r.issues.length?'Open AI repair':'Review'}</button><small>Only validated, admin-approved patches can reach learner activities.</small></div></div></details>`).join('')}</div></section><p class="ca-note">Pilot scope: A1 Lessons 1–10. Safe publishing is enabled for vocabulary first; other components remain proposal-only until component-specific validators are added.</p></div>`;
 $id('caRun').onclick=render;
 document.querySelectorAll('[data-ca-lesson]').forEach(b=>b.onclick=()=>openRepair(rows[Number(b.dataset.caLesson)-1]));
}
window.contentAuditor=render;
function install(){try{if(typeof NAV!=='undefined'&&Array.isArray(NAV.admin)&&!NAV.admin.some(x=>x[0]===PAGE))NAV.admin.splice(2,0,[PAGE,'✓','Content Checker']);if(typeof renderAdmin==='function'&&!window.__contentAuditorInstalled){const prev=renderAdmin;renderAdmin=function(){if(currentPage===PAGE)return render();return prev()};window.__contentAuditorInstalled=true}}catch(e){console.error('Content auditor install failed',e)}}
install();
})();