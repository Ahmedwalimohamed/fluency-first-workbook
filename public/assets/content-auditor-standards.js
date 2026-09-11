(function(){
'use strict';
const PAGE='content-auditor';
const RESULTS=window.__standardsAuditResults=window.__standardsAuditResults||{};
const esc=v=>typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const $=id=>document.getElementById(id);
function specs(){return (window.A1_FOUNDATION_SPECS||[]).slice(0,10)}
function statusBadge(status){const s=String(status||'NOT_AUDITED');return `<span class="ca-status ${s.toLowerCase()}">${esc(s.replaceAll('_',' '))}</span>`}
function scoreCards(a){
  if(!a)return '<p class="ca-note">No standards audit has been run yet.</p>';
  const s=a.scores||{};
  return `<div class="ca-metrics ca-standard-scores"><article><span>CEFR</span><strong>${s.cefr??0}/35</strong></article><article><span>ESL pedagogy</span><strong>${s.pedagogy??0}/25</strong></article><article><span>Assessment</span><strong>${s.assessment??0}/15</strong></article><article><span>Naturalness</span><strong>${s.naturalness??0}/15</strong></article><article><span>Anti-slop</span><strong>${s.antiSlop??0}/10</strong></article></div>`;
}
async function auditOne(n,button,opts={}){
  const lesson=specs()[n-1];if(!lesson)return;
  if(button){button.disabled=true;button.textContent='Auditing actual content…'}
  try{
    const r=await fetch('/api/content-audit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lessonNumber:n,lesson})});
    const data=await r.json();
    if(!r.ok)throw new Error(data?.detail||data?.error||'Audit failed');
    RESULTS[n]={...data.audit,checkedAt:new Date().toISOString()};
    if(!opts.silent)render();
    return RESULTS[n];
  }catch(e){
    RESULTS[n]={error:e.message,status:'AUDIT_ERROR',overall:null,issues:[]};
    if(!opts.silent)render();
    return RESULTS[n];
  }
}
async function auditAll(){
  const b=$('caStandardsAll');if(b){b.disabled=true;b.textContent='Auditing 1 of 10…'}
  for(let n=1;n<=specs().length;n++){
    if(b)b.textContent=`Auditing ${n} of ${specs().length}…`;
    await auditOne(n,null,{silent:true});
  }
  render();
}
function detail(r,n,titleText){
  if(!r)return `<div class="ca-issues"><div class="ca-action"><button class="primary-btn" data-standards-audit="${n}">Run standards audit</button><small>This sends the full lesson to the CEFR + ESL semantic auditor. No score is assigned before inspection.</small></div></div>`;
  if(r.error)return `<div class="ca-issues"><article class="ca-issue major"><div><span>ERROR</span><code>AUDIT_ERROR</code></div><strong>${esc(r.error)}</strong><p>The lesson has not been graded.</p></article><div class="ca-action"><button class="ghost-btn" data-standards-audit="${n}">Try audit again</button></div></div>`;
  const hasIssues=(r.issues||[]).length>0;
  return `<div class="ca-issues">${scoreCards(r)}<article class="ca-standard-summary"><strong>Standards finding</strong><p>${esc(r.summary||'')}</p><p><b>CEFR can-do fit:</b> ${esc(r.canDoFit||'')}</p></article>${(r.issues||[]).map(x=>`<article class="ca-issue ${String(x.severity||'moderate').toLowerCase()}"><div><span>${esc(x.severity)}</span><code>${esc(x.code)}</code><em>${esc(x.component||'lesson')}</em></div><strong>${esc(x.message)}</strong>${x.evidence?`<p><b>Evidence:</b> ${esc(x.evidence)}</p>`:''}<p><b>Fix:</b> ${esc(x.fix)}</p></article>`).join('')||'<p class="ca-clear">No substantive standards violations were found.</p>'}<div class="ca-action">${hasIssues?`<button class="primary-btn" data-standards-repair="${n}">Repair flagged issues</button><small>You do not need to audit again manually. After the approved fix is applied, the standards audit runs automatically.</small>`:`<span class="ca-clear"><b>No repair needed.</b> This lesson passed the standards review.</span>`}</div></div>`;
}
function render(){
  const lessons=specs();
  const done=lessons.filter((_,i)=>RESULTS[i+1]&&!RESULTS[i+1].error).length;
  const scores=lessons.map((_,i)=>RESULTS[i+1]?.overall).filter(Number.isFinite);
  const avg=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null;
  const need=scores.length?lessons.filter((_,i)=>{const s=RESULTS[i+1]?.status;return s&&!String(s).startsWith('PASS')}).length:0;
  if(typeof title==='function')title('Content quality','Lesson & Activity Checker');
  $('content').innerHTML=`<div class="ca-shell"><section class="ca-hero"><div><span class="ca-kicker">CEFR + ESL Standards Audit</span><h1>A1 Lessons 1–10</h1><p>Audit once, review the findings, then repair. After an approved repair is applied, the system re-audits automatically.</p></div><button class="primary-btn" id="caStandardsAll">Audit unaudited lessons</button></section><section class="ca-metrics"><article><span>Semantically audited</span><strong>${done}/${lessons.length}</strong></article><article><span>Average audited score</span><strong>${avg===null?'—':avg+'/100'}</strong></article><article><span>Need review/fix</span><strong>${need}</strong></article><article><span>Standard</span><strong>CEFR + ESL</strong></article></section><section class="ca-panel"><div class="ca-head"><div><h2>Standards results</h2><p>Weights: CEFR 35 · ESL pedagogy 25 · assessment 15 · naturalness/coherence 15 · anti-slop 10. Critical failure cannot pass; a major issue cannot receive PASS.</p></div></div><div class="ca-list">${lessons.map((s,i)=>{const n=i+1,r=RESULTS[n],score=Number.isFinite(r?.overall)?r.overall:'—',status=r?.status||'NOT_AUDITED';return `<details class="ca-row"><summary><div class="ca-lesson"><b>${n}</b><div><strong>${esc(s.title||'Lesson '+n)}</strong><small>${r?.error?'Audit failed':r?`${(r.issues||[]).length} standards issue${(r.issues||[]).length===1?'':'s'} found`:'Actual content not inspected yet'}</small></div></div><div class="ca-score"><strong>${score}</strong>${statusBadge(status)}</div></summary>${detail(r,n,s.title)}</details>`}).join('')}</div></section><p class="ca-note">Once a lesson is audited, the next action is Repair—not manual re-audit. Re-audit is automatic after an approved fix is applied.</p></div>`;
  $('caStandardsAll').onclick=async()=>{
    const pending=specs().map((_,i)=>i+1).filter(n=>!RESULTS[n]);
    if(!pending.length)return;
    const b=$('caStandardsAll');b.disabled=true;
    for(let i=0;i<pending.length;i++){b.textContent=`Auditing ${i+1} of ${pending.length}…`;await auditOne(pending[i],null,{silent:true});}
    render();
  };
  document.querySelectorAll('[data-standards-audit]').forEach(b=>b.onclick=()=>auditOne(Number(b.dataset.standardsAudit),b));
  document.querySelectorAll('[data-standards-repair]').forEach(b=>b.onclick=()=>{
    const n=Number(b.dataset.standardsRepair),result=RESULTS[n];
    if(typeof window.contentAuditorOpenRepair==='function')window.contentAuditorOpenRepair(result,n);
  });
}
window.runStandardsAuditForLesson=auditOne;
window.contentStandardsAuditor=render;
function install(){
  try{
    if(typeof renderAdmin==='function'&&!window.__standardsAuditorInstalled){
      const prev=renderAdmin;
      renderAdmin=function(){if(currentPage===PAGE)return render();return prev()};
      window.__standardsAuditorInstalled=true;
      if(typeof currentPage!=='undefined'&&currentPage===PAGE)render();
    }
  }catch(e){console.error('Standards auditor install failed',e)}
}
install();
})();