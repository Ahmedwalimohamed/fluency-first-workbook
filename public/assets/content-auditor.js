(function(){
'use strict';
const PAGE='content-auditor';
const $=id=>document.getElementById(id);
const esc=v=>typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const attr=v=>esc(v).replace(/"/g,'&quot;');
const EDITABLE=['title','outcome','expressions','vocabulary','reading','listening','grammar','writing','review','performance'];
const LABELS={vocabulary:'Vocabulary',reading:'Reading',listening:'Listening & Reading',grammar:'Grammar',writing:'Writing',expressions:'Expressions',review:'Review',performance:'Speaking / Performance',outcome:'Learning outcome'};
const state=window.__aiContentEditorState=window.__aiContentEditorState||{courseId:'',lessonNumber:1,scope:'activity',activity:'',questionIndex:0,instruction:'',proposal:null,proposalContext:null,qaReport:null,qaApprovalToken:null,qaNeedsHumanReview:false,message:''};
if(!Object.prototype.hasOwnProperty.call(state,'qaReport'))state.qaReport=null;
if(!Object.prototype.hasOwnProperty.call(state,'qaApprovalToken'))state.qaApprovalToken=null;
if(!Object.prototype.hasOwnProperty.call(state,'qaNeedsHumanReview'))state.qaNeedsHumanReview=false;

function books(){return window.EnglishGateContentPatches?.books?.()||[]}
function book(){return books().find(b=>String(b.id)===String(state.courseId))||books()[0]||null}
function lesson(){return book()?.lessons?.find(l=>Number(l.number)===Number(state.lessonNumber))||book()?.lessons?.[0]||null}
function lessonSnapshot(l){const out={};EDITABLE.forEach(k=>{if(Object.prototype.hasOwnProperty.call(l||{},k))out[k]=JSON.parse(JSON.stringify(l[k]))});return out}
function activities(l){return ['vocabulary','reading','listening','grammar','writing','expressions','review','performance'].filter(k=>l&&Object.prototype.hasOwnProperty.call(l,k)&&l[k]!=null)}
function questionCollection(l,k){
 if(!l)return null;
 const map={vocabulary:'items',reading:'questions',listening:'questions',grammar:'items',writing:'tasks'};
 const child=map[k];
 if(child&&Array.isArray(l?.[k]?.[child]))return{path:`${k}.${child}`,items:l[k][child]};
 if(k==='expressions'&&Array.isArray(l.expressions))return{path:'expressions',items:l.expressions};
 return null;
}
function questionActivities(l){return activities(l).filter(k=>questionCollection(l,k)?.items?.length)}
function getPath(root,path){
 if(path==='lesson')return lessonSnapshot(root);
 const seg=String(path||'').split('.').filter(Boolean);let cur=root;
 for(const s of seg){if(cur==null)return undefined;cur=cur[/^\d+$/.test(s)?Number(s):s]}
 return cur===undefined?undefined:JSON.parse(JSON.stringify(cur));
}
function clone(v){return v===undefined?undefined:JSON.parse(JSON.stringify(v))}
function setCandidatePath(root,path,value){
 if(path==='lesson')return clone(value);
 const seg=String(path||'').split('.').filter(Boolean);
 if(!seg.length||seg.some(x=>['__proto__','prototype','constructor'].includes(x)))return root;
 let cur=root;
 for(let i=0;i<seg.length-1;i++){
  const k=/^\d+$/.test(seg[i])?Number(seg[i]):seg[i];
  if(cur[k]==null)cur[k]=/^\d+$/.test(seg[i+1])?[]:{};
  cur=cur[k];
 }
 const last=/^\d+$/.test(seg.at(-1))?Number(seg.at(-1)):seg.at(-1);
 cur[last]=clone(value);return root;
}
function candidateLesson(l,path,replacement){
 const base=lessonSnapshot(l);
 if(path==='lesson')return clone(replacement);
 return setCandidatePath(base,path,replacement);
}
function qaReportHtml(report){
 if(!report)return '';
 const checks=Array.isArray(report.checks)?report.checks:[];
 const release=String(report.releaseState||'').toUpperCase()||(report.pass?'GREEN':'RED');
 const domains=report.domains&&typeof report.domains==='object'?report.domains:{};
 const critical=checks.filter(x=>String(x.severity)==='Critical'&&(x.status==='FAIL'||x.status==='CORROBORATED_FAIL'||x.status==='BLOCKED'));
 const major=checks.filter(x=>String(x.severity)==='Major'&&(x.status==='FAIL'||x.status==='CORROBORATED_FAIL'||x.status==='BLOCKED'||x.review));
 const minor=checks.filter(x=>String(x.severity)==='Minor'&&x.review);
 const unresolved=release==='RED'?critical:release==='AMBER'?major:minor;
 const metric=x=>{
  const p=Number(x.selectedProbability),c=Number(x.confidence),e=Number(x.evidence);
  if(Number.isFinite(e))return `Evidence: ${Math.round(e*100)}%`;
  if(Number.isFinite(p))return `Decision probability: ${Math.round(p*100)}%`;
  if(Number.isFinite(c))return `Jev confidence: ${Math.round(c*100)}%`;
  return x.source==='deterministic'?'Deterministic check':'';
 };
 const domainCards=Object.entries(domains).map(([name,d])=>`<article class="ace-domain-card is-${String(d?.status||'GREEN').toLowerCase()}"><span>${esc(name)}</span><strong>${esc(d?.status||'GREEN')}</strong><small>${Number(d?.critical||0)} critical · ${Number(d?.major||0)} major · ${Number(d?.minor||0)} minor</small></article>`).join('');
 const cards=(items,kind)=>items.slice(0,16).map(x=>`<article class="${kind}"><div><b>${esc(x.domain||x.category||'QA')}</b><span>${esc(x.severity||x.status||kind.toUpperCase())}</span></div><p>${esc(x.requirement||x.id||'Quality check')}</p><small>${esc(x.reason||'')}${metric(x)?` · ${esc(metric(x))}`:''}${x.path?` · ${esc(x.path)}`:''}</small></article>`).join('');
 const mode=release==='GREEN'?'is-pass':release==='AMBER'?'is-review':'is-blocked';
 const title=release==='GREEN'?'GREEN · Ready to publish':release==='AMBER'?'AMBER · Human review required':'RED · Publication blocked';
 const body=release==='GREEN'
  ?'No Critical or Major lesson-quality issue remains. Minor findings can be reviewed without unnecessary rewriting.'
  :release==='AMBER'
   ?'One or more Major findings need human review. EnglishGate will not auto-publish this candidate.'
   :'A Critical lesson-quality failure is present. Publication remains blocked.';
 const meta=`${Number(report.criticalFailures||report.critical||0)} critical · ${Number(report.majorFindings||report.major||0)} major · ${Number(report.minorFindings||report.minor||0)} minor · ${Number(report.totalChecks||checks.length)} checks`;
 return `<div class="ace-qa-report ${mode}" data-release="${attr(release)}">
   <div class="ace-qa-title"><strong>${title}</strong><span>${esc(meta)}</span></div>
   <p>${esc(body)}</p>
   ${domainCards?`<div class="ace-quality-domains">${domainCards}</div>`:''}
   ${unresolved.length?`<div class="ace-qa-failures ${release==='GREEN'?'ace-qa-review-list':''}">${cards(unresolved,release==='RED'?'blocking':'review')}</div>`:''}
   ${unresolved.length>16?`<small>+${unresolved.length-16} more findings</small>`:''}
   <div class="ace-audit-meta"><span>${esc(report.auditVersion||report.version||'')}</span><span>${report.model?`Jev ${esc(report.model)}`:''}</span><span>${report.contentHash?`Content ${esc(String(report.contentHash).slice(0,10))}`:''}</span></div>
  </div>`;
}
function ensureSelection(){
 const bs=books();if(!bs.length)return;
 if(!bs.some(b=>String(b.id)===String(state.courseId)))state.courseId=String(bs[0].id);
 const b=book(),ls=b?.lessons||[];
 if(!ls.some(l=>Number(l.number)===Number(state.lessonNumber)))state.lessonNumber=Number(ls[0]?.number||1);
 const l=lesson(),acts=state.scope==='question'?questionActivities(l):activities(l);
 if(!acts.includes(state.activity))state.activity=acts[0]||'';
 const coll=questionCollection(l,state.activity);if(coll&&state.questionIndex>=coll.items.length)state.questionIndex=0;
}
function target(){
 const l=lesson();if(!l)return null;
 if(state.scope==='lesson')return{path:'lesson',label:'Whole lesson',source:lessonSnapshot(l)};
 if(state.scope==='question'){
  const coll=questionCollection(l,state.activity);if(!coll?.items?.length)return null;
  const i=Math.max(0,Math.min(coll.items.length-1,Number(state.questionIndex)||0));
  return{path:`${coll.path}.${i}`,label:`${LABELS[state.activity]||state.activity} · Question ${i+1}`,source:JSON.parse(JSON.stringify(coll.items[i]))};
 }
 return{path:state.activity,label:LABELS[state.activity]||state.activity,source:getPath(l,state.activity)};
}
function shortItem(x,i){
 const text=typeof x==='string'?x:x?.q||x?.prompt||x?.text||x?.title||'';
 return `${i+1}. ${String(text||'Item').replace(/\s+/g,' ').slice(0,80)}`;
}
function pretty(v){return typeof v==='string'?v:JSON.stringify(v,null,2)}
function previewBox(titleText,value,kind){return `<article class="ace-preview ${kind}"><header><span>${esc(titleText)}</span></header><pre>${esc(pretty(value))}</pre></article>`}
function activePatch(t){return t?window.EnglishGateContentPatches?.get?.(state.courseId,state.lessonNumber,t.path):null}
function clearProposal(){state.proposal=null;state.proposalContext=null;state.qaReport=null;state.qaApprovalToken=null;state.qaNeedsHumanReview=false;state.message=''}

async function generate(){
 const t=target(),l=lesson(),b=book(),btn=$('aceGenerate');if(!t||!l||!b)return;
 const instruction=String($('acePrompt')?.value||'').trim();state.instruction=instruction;
 if(instruction.length<3){state.message='Write what you want AI to change.';render();return}
 btn.disabled=true;btn.textContent='Creating preview…';state.qaApprovalToken=null;state.qaNeedsHumanReview=false;
 try{
  const r=await fetch('/api/content-editor/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({courseId:b.id,lessonNumber:l.number,targetPath:t.path,scope:state.scope,instruction,source:t.source,lessonContext:{id:l.id,title:l.title,outcome:l.outcome,level:b.level}})}),data=await r.json();
  if(!r.ok)throw new Error(data?.detail||data?.error||'AI edit failed');
  state.proposal=data.proposal;state.proposalContext={courseId:b.id,lessonNumber:l.number,targetPath:t.path,scope:state.scope,source:t.source,instruction};state.qaReport=null;state.message='';render();
 }catch(e){state.message=e.message;render()}
}
async function gradeCurrentLesson(){
 const l=lesson(),b=book(),btn=$('aceGradeLesson');if(!l||!b)return;
 const candidate=clone(l);
 state.qaReport=null;state.message='';
 if(btn){btn.disabled=true;btn.textContent='Grading lesson…'}
 try{
  const r=await fetch('/api/semantic-qa/lesson',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
   courseId:b.id,lessonNumber:l.number,targetPath:'lesson',level:b.level,lessonTitle:l.title,learningOutcome:l.outcome,audience:b.audience||'adult English learners',
   lesson:candidate,replacement:candidate
  })});
  const data=await r.json();state.qaReport=data?.report||null;
  if(!state.qaReport)throw new Error(data?.error||'Lesson grading could not complete.');
  const release=String(state.qaReport.releaseState||'').toUpperCase();
  state.message=release==='GREEN'?'Lesson grade: GREEN — ready to publish.':release==='AMBER'?'Lesson grade: AMBER — human review required.':'Lesson grade: RED — critical issue blocks publication.';
  render();
 }catch(e){state.message=e.message;render()}
}
async function publishApproved(token,humanReviewAccepted){
 const p=state.proposal,c=state.proposalContext;if(!p||!c||!token)return;
 const publishBtn=$('aceApproveReview')||$('aceApply');if(publishBtn){publishBtn.disabled=true;publishBtn.textContent='Publishing…'}
 const r=await fetch('/api/content-editor/apply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
  ...c,replacement:p.replacement,summary:p.summary,quality:p.quality,lessonQualityReport:state.qaReport,
  semanticQaToken:token,humanReviewAccepted:Boolean(humanReviewAccepted)
 })}),data=await r.json();
 if(!r.ok)throw new Error(data?.problems?.join(' ')||data?.error||'Publish failed');
 await window.EnglishGateContentPatches?.reload?.();
 state.proposal=null;state.proposalContext=null;state.qaReport=null;state.qaApprovalToken=null;state.qaNeedsHumanReview=false;
 state.message=humanReviewAccepted
  ?'Published after explicit Admin review of the AMBER findings. The decision and exact audit evidence were saved with this version.'
  :'Published. Lesson Quality Firewall is GREEN and the exact audit evidence was saved with this version.';
 render();
}
async function apply(){
 const p=state.proposal,c=state.proposalContext,btn=$('aceApply'),l=lesson(),b=book();if(!p||!c||!l||!b)return;
 const candidate=candidateLesson(l,c.targetPath,p.replacement);
 btn.disabled=true;btn.textContent='Running Jev QA…';state.message='';state.qaReport=null;state.qaApprovalToken=null;state.qaNeedsHumanReview=false;
 try{
  const qr=await fetch('/api/semantic-qa/lesson',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
   courseId:b.id,lessonNumber:l.number,targetPath:c.targetPath,level:b.level,lessonTitle:l.title,learningOutcome:l.outcome,audience:b.audience||'adult English learners',
   lesson:candidate,replacement:p.replacement
  })});
  const qd=await qr.json();state.qaReport=qd?.report||null;
  if(qd?.code==='LESSON_QUALITY_REVIEW_REQUIRED'&&qd?.semanticQaToken){
   state.qaApprovalToken=qd.semanticQaToken;state.qaNeedsHumanReview=true;
   state.message='AMBER: review the Major findings below. You may fix them, re-run Jev, or explicitly approve this reviewed version.';
   render();return;
  }
  if(!qr.ok||!qd?.ok){
   state.message=qd?.error||'Lesson Quality Firewall blocked publication.';
   render();return;
  }
  state.qaApprovalToken=qd.semanticQaToken;
  await publishApproved(qd.semanticQaToken,false);
 }catch(e){state.message=e.message;render()}
}
async function approveAmber(){
 if(!state.qaNeedsHumanReview||!state.qaApprovalToken)return;
 try{await publishApproved(state.qaApprovalToken,true)}catch(e){state.message=e.message;render()}
}
async function undo(){
 const t=target(),b=book(),l=lesson();if(!t||!b||!l)return;
 try{
  const r=await fetch('/api/content-editor/undo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({courseId:b.id,lessonNumber:l.number,targetPath:t.path})}),data=await r.json();
  if(!r.ok)throw new Error(data?.error||'Undo failed');
  await window.EnglishGateContentPatches?.reload?.();state.proposal=null;state.proposalContext=null;state.message=data.restoredPatchId?'Previous version restored.':'Original version restored.';render();
 }catch(e){state.message=e.message;render()}
}
function render(){
 ensureSelection();
 if(typeof title==='function')title('Content','Lesson Quality & AI Editor');
 const bs=books(),b=book(),l=lesson();
 if(!bs.length){$('content').innerHTML='<section class="ace-shell"><div class="empty-state"><h3>No editable course content found</h3><p>EnglishGate could not find the lesson library.</p></div></section>';return}
 const acts=state.scope==='question'?questionActivities(l):activities(l),coll=state.scope==='question'?questionCollection(l,state.activity):null,t=target(),patch=activePatch(t),p=state.proposal;
 const problems=Array.isArray(p?.problems)?p.problems:[];
 $('content').innerHTML=`<section class="ace-shell">
  <header class="ace-hero"><div><span class="ace-kicker">EnglishGate · Admin</span><h1>Lesson Quality & AI Editor</h1><p>Select the content, describe the change, preview it, then publish. Grade any lesson on demand, edit only what needs improvement, and publish only when the Lesson Quality Firewall is GREEN.</p></div><div class="ace-safety"><span>Preview first</span><span>Lesson graded</span><span>Jev QA gated</span><span>Undo anytime</span></div></header>
  ${state.message?`<div class="ace-message">${esc(state.message)}</div>`:''}
  <section class="ace-workspace">
   <div class="ace-controls">
    <label>Course<select id="aceCourse">${bs.map(x=>`<option value="${attr(x.id)}" ${String(x.id)===String(state.courseId)?'selected':''}>${esc(x.title||x.id)} · ${esc(x.level||'')}</option>`).join('')}</select></label>
    <label>Lesson<select id="aceLesson">${(b?.lessons||[]).map(x=>`<option value="${Number(x.number)}" ${Number(x.number)===Number(state.lessonNumber)?'selected':''}>Lesson ${Number(x.number)} · ${esc(x.title||'Untitled')}</option>`).join('')}</select></label>
    <label>Edit<select id="aceScope"><option value="question" ${state.scope==='question'?'selected':''}>One question</option><option value="activity" ${state.scope==='activity'?'selected':''}>Whole activity</option><option value="lesson" ${state.scope==='lesson'?'selected':''}>Whole lesson</option></select></label>
    ${state.scope!=='lesson'?`<label>Area<select id="aceActivity">${acts.map(k=>`<option value="${attr(k)}" ${k===state.activity?'selected':''}>${esc(LABELS[k]||k)}</option>`).join('')}</select></label>`:''}
    ${state.scope==='question'&&coll?`<label>Question<select id="aceQuestion">${coll.items.map((x,i)=>`<option value="${i}" ${i===Number(state.questionIndex)?'selected':''}>${esc(shortItem(x,i))}</option>`).join('')}</select></label>`:''}
   </div>
   <div class="ace-selected"><div><span>Selected</span><strong>${esc(b?.title||'')} · Lesson ${Number(l?.number||0)} · ${esc(t?.label||'Content')}</strong></div><div class="ace-selected-actions">${patch?`<button class="ace-undo" id="aceUndo" type="button">↶ Undo active edit</button>`:'<small>Using original course content</small>'}<button class="ghost-btn ace-grade-lesson" id="aceGradeLesson" type="button">Grade current lesson</button></div></div>
   <div class="ace-source"><span>Current content</span><pre>${esc(pretty(t?.source))}</pre></div>
   ${!p&&state.qaReport?qaReportHtml(state.qaReport):''}
   <div class="ace-prompt-card"><label for="acePrompt">What should AI change?</label><textarea id="acePrompt" rows="4" placeholder="Example: Make these reading questions direct comprehension questions. Keep them at A2 level.">${esc(state.instruction)}</textarea><div class="ace-prompt-examples"><button type="button" data-ace-example="Make the questions direct, text-grounded comprehension questions. Keep the same CEFR level.">Fix reading questions</button><button type="button" data-ace-example="Make this simpler and clearer for the current CEFR level without changing the learning objective.">Simplify</button><button type="button" data-ace-example="Improve the distractors so they are plausible but only one answer is clearly correct.">Improve answer choices</button><button type="button" data-ace-example="Fix everything pedagogically weak in this selected content using CEFR and ESL best practices. Preserve what is already good.">Fix weaknesses</button></div><button class="primary-btn ace-generate" id="aceGenerate" type="button">✦ Generate preview</button></div>
  </section>
  ${p?`<section class="ace-result"><div class="ace-result-head"><div><span class="ace-kicker">AI proposed edit</span><h2>${esc(p.summary||'Proposed change')}</h2>${Array.isArray(p.changes)&&p.changes.length?`<p>${p.changes.map(esc).join(' · ')}</p>`:''}</div>${problems.length?'<span class="ace-warning-badge">Needs review</span>':'<span class="ace-ready-badge">Ready to apply</span>'}</div><div class="ace-compare">${previewBox('Before',state.proposalContext?.source,'before')}${previewBox('After',p.replacement,'after')}</div>${problems.length?`<div class="ace-warnings"><strong>Check before applying</strong>${problems.map(x=>`<p>${esc(x)}</p>`).join('')}</div>`:''}${qaReportHtml(state.qaReport)}<div class="ace-result-actions"><button class="ghost-btn" id="aceEditPrompt" type="button">Edit prompt</button><button class="ghost-btn" id="aceRegenerate" type="button">Regenerate</button><button class="ghost-btn" id="aceCancel" type="button">Cancel</button><button class="primary-btn" id="aceApply" type="button" ${problems.length?'disabled':''}>${state.qaNeedsHumanReview?'Re-run Jev QA':'Run Jev QA & Publish'}</button>${state.qaNeedsHumanReview?'<button class="primary-btn ace-amber-approve" id="aceApproveReview" type="button">Approve AMBER & Publish</button>':''}</div></section>`:''}
 </section>`;
 $('aceCourse').onchange=e=>{state.courseId=e.target.value;state.lessonNumber=1;state.activity='';state.questionIndex=0;clearProposal();render()};
 $('aceLesson').onchange=e=>{state.lessonNumber=Number(e.target.value);state.activity='';state.questionIndex=0;clearProposal();render()};
 $('aceScope').onchange=e=>{state.scope=e.target.value;state.activity='';state.questionIndex=0;clearProposal();render()};
 if($('aceActivity'))$('aceActivity').onchange=e=>{state.activity=e.target.value;state.questionIndex=0;clearProposal();render()};
 if($('aceQuestion'))$('aceQuestion').onchange=e=>{state.questionIndex=Number(e.target.value);clearProposal();render()};
 $('acePrompt').oninput=e=>{state.instruction=e.target.value};
 $('aceGenerate').onclick=generate;
 if($('aceGradeLesson'))$('aceGradeLesson').onclick=gradeCurrentLesson;
 if($('aceUndo'))$('aceUndo').onclick=undo;
 document.querySelectorAll('[data-ace-example]').forEach(btn=>btn.onclick=()=>{state.instruction=btn.dataset.aceExample;$('acePrompt').value=state.instruction;$('acePrompt').focus()});
 if($('aceApply'))$('aceApply').onclick=apply;
 if($('aceApproveReview'))$('aceApproveReview').onclick=approveAmber;
 if($('aceRegenerate'))$('aceRegenerate').onclick=generate;
 if($('aceCancel'))$('aceCancel').onclick=()=>{clearProposal();render()};
 if($('aceEditPrompt'))$('aceEditPrompt').onclick=()=>{clearProposal();render();setTimeout(()=>$('acePrompt')?.focus(),0)};
}
window.contentAuditor=render;
window.aiContentEditor=render;
function install(){
 try{
  if(typeof NAV!=='undefined'&&Array.isArray(NAV.admin)){
   const found=NAV.admin.find(x=>x[0]===PAGE);
   if(found){found[1]='✦';found[2]='Lesson Quality'}else NAV.admin.splice(2,0,[PAGE,'✦','Lesson Quality']);
  }
  if(typeof renderAdmin==='function'&&!window.__aiContentEditorInstalled){const prev=renderAdmin;renderAdmin=function(){if(currentPage===PAGE)return render();return prev()};window.__aiContentEditorInstalled=true}
 }catch(e){console.error('AI Content Editor install failed',e)}
}
install();
})();
