(function(){
'use strict';
const PAGE='content-auditor';
const $=id=>document.getElementById(id);
const esc=v=>typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const attr=v=>esc(v).replace(/"/g,'&quot;');
const EDITABLE=['title','outcome','expressions','vocabulary','reading','listening','grammar','writing','review','performance'];
const LABELS={vocabulary:'Vocabulary',reading:'Reading',listening:'Listening & Reading',grammar:'Grammar',writing:'Writing',expressions:'Expressions',review:'Review',performance:'Speaking / Performance',outcome:'Learning outcome'};
const state=window.__aiContentEditorState=window.__aiContentEditorState||{courseId:'',lessonNumber:1,scope:'activity',activity:'',questionIndex:0,instruction:'',proposal:null,proposalContext:null,message:''};

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
function clearProposal(){state.proposal=null;state.proposalContext=null;state.message=''}

async function generate(){
 const t=target(),l=lesson(),b=book(),btn=$('aceGenerate');if(!t||!l||!b)return;
 const instruction=String($('acePrompt')?.value||'').trim();state.instruction=instruction;
 if(instruction.length<3){state.message='Write what you want AI to change.';render();return}
 btn.disabled=true;btn.textContent='Creating preview…';
 try{
  const r=await fetch('/api/content-editor/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({courseId:b.id,lessonNumber:l.number,targetPath:t.path,scope:state.scope,instruction,source:t.source,lessonContext:{id:l.id,title:l.title,outcome:l.outcome,level:b.level}})}),data=await r.json();
  if(!r.ok)throw new Error(data?.detail||data?.error||'AI edit failed');
  state.proposal=data.proposal;state.proposalContext={courseId:b.id,lessonNumber:l.number,targetPath:t.path,scope:state.scope,source:t.source,instruction};state.message='';render();
 }catch(e){state.message=e.message;render()}
}
async function apply(){
 const p=state.proposal,c=state.proposalContext,btn=$('aceApply');if(!p||!c)return;
 btn.disabled=true;btn.textContent='Applying…';
 try{
  const r=await fetch('/api/content-editor/apply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...c,replacement:p.replacement,summary:p.summary,quality:p.quality})}),data=await r.json();
  if(!r.ok)throw new Error(data?.problems?.join(' ')||data?.error||'Apply failed');
  await window.EnglishGateContentPatches?.reload?.();
  state.proposal=null;state.proposalContext=null;state.message='Applied. Students will see the new version. You can undo it at any time.';render();
 }catch(e){state.message=e.message;render()}
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
 if(typeof title==='function')title('Content','AI Content Editor');
 const bs=books(),b=book(),l=lesson();
 if(!bs.length){$('content').innerHTML='<section class="ace-shell"><div class="empty-state"><h3>No editable course content found</h3><p>EnglishGate could not find the lesson library.</p></div></section>';return}
 const acts=state.scope==='question'?questionActivities(l):activities(l),coll=state.scope==='question'?questionCollection(l,state.activity):null,t=target(),patch=activePatch(t),p=state.proposal;
 const problems=Array.isArray(p?.problems)?p.problems:[];
 $('content').innerHTML=`<section class="ace-shell">
  <header class="ace-hero"><div><span class="ace-kicker">EnglishGate · Admin</span><h1>Edit with AI</h1><p>Select the content, describe the change in normal language, preview it, then apply. Nothing changes for students until you press Apply.</p></div><div class="ace-safety"><span>Preview first</span><span>Versioned</span><span>Undo anytime</span></div></header>
  ${state.message?`<div class="ace-message">${esc(state.message)}</div>`:''}
  <section class="ace-workspace">
   <div class="ace-controls">
    <label>Course<select id="aceCourse">${bs.map(x=>`<option value="${attr(x.id)}" ${String(x.id)===String(state.courseId)?'selected':''}>${esc(x.title||x.id)} · ${esc(x.level||'')}</option>`).join('')}</select></label>
    <label>Lesson<select id="aceLesson">${(b?.lessons||[]).map(x=>`<option value="${Number(x.number)}" ${Number(x.number)===Number(state.lessonNumber)?'selected':''}>Lesson ${Number(x.number)} · ${esc(x.title||'Untitled')}</option>`).join('')}</select></label>
    <label>Edit<select id="aceScope"><option value="question" ${state.scope==='question'?'selected':''}>One question</option><option value="activity" ${state.scope==='activity'?'selected':''}>Whole activity</option><option value="lesson" ${state.scope==='lesson'?'selected':''}>Whole lesson</option></select></label>
    ${state.scope!=='lesson'?`<label>Area<select id="aceActivity">${acts.map(k=>`<option value="${attr(k)}" ${k===state.activity?'selected':''}>${esc(LABELS[k]||k)}</option>`).join('')}</select></label>`:''}
    ${state.scope==='question'&&coll?`<label>Question<select id="aceQuestion">${coll.items.map((x,i)=>`<option value="${i}" ${i===Number(state.questionIndex)?'selected':''}>${esc(shortItem(x,i))}</option>`).join('')}</select></label>`:''}
   </div>
   <div class="ace-selected"><div><span>Selected</span><strong>${esc(b?.title||'')} · Lesson ${Number(l?.number||0)} · ${esc(t?.label||'Content')}</strong></div>${patch?`<button class="ace-undo" id="aceUndo" type="button">↶ Undo active edit</button>`:'<small>Using original course content</small>'}</div>
   <div class="ace-source"><span>Current content</span><pre>${esc(pretty(t?.source))}</pre></div>
   <div class="ace-prompt-card"><label for="acePrompt">What should AI change?</label><textarea id="acePrompt" rows="4" placeholder="Example: Make these reading questions direct comprehension questions. Keep them at A2 level.">${esc(state.instruction)}</textarea><div class="ace-prompt-examples"><button type="button" data-ace-example="Make the questions direct, text-grounded comprehension questions. Keep the same CEFR level.">Fix reading questions</button><button type="button" data-ace-example="Make this simpler and clearer for the current CEFR level without changing the learning objective.">Simplify</button><button type="button" data-ace-example="Improve the distractors so they are plausible but only one answer is clearly correct.">Improve answer choices</button><button type="button" data-ace-example="Fix everything pedagogically weak in this selected content using CEFR and ESL best practices. Preserve what is already good.">Fix weaknesses</button></div><button class="primary-btn ace-generate" id="aceGenerate" type="button">✦ Generate preview</button></div>
  </section>
  ${p?`<section class="ace-result"><div class="ace-result-head"><div><span class="ace-kicker">AI proposed edit</span><h2>${esc(p.summary||'Proposed change')}</h2>${Array.isArray(p.changes)&&p.changes.length?`<p>${p.changes.map(esc).join(' · ')}</p>`:''}</div>${problems.length?'<span class="ace-warning-badge">Needs review</span>':'<span class="ace-ready-badge">Ready to apply</span>'}</div><div class="ace-compare">${previewBox('Before',state.proposalContext?.source,'before')}${previewBox('After',p.replacement,'after')}</div>${problems.length?`<div class="ace-warnings"><strong>Check before applying</strong>${problems.map(x=>`<p>${esc(x)}</p>`).join('')}</div>`:''}<div class="ace-result-actions"><button class="ghost-btn" id="aceEditPrompt" type="button">Edit prompt</button><button class="ghost-btn" id="aceRegenerate" type="button">Regenerate</button><button class="ghost-btn" id="aceCancel" type="button">Cancel</button><button class="primary-btn" id="aceApply" type="button" ${problems.length?'disabled':''}>Apply change</button></div></section>`:''}
 </section>`;
 $('aceCourse').onchange=e=>{state.courseId=e.target.value;state.lessonNumber=1;state.activity='';state.questionIndex=0;clearProposal();render()};
 $('aceLesson').onchange=e=>{state.lessonNumber=Number(e.target.value);state.activity='';state.questionIndex=0;clearProposal();render()};
 $('aceScope').onchange=e=>{state.scope=e.target.value;state.activity='';state.questionIndex=0;clearProposal();render()};
 if($('aceActivity'))$('aceActivity').onchange=e=>{state.activity=e.target.value;state.questionIndex=0;clearProposal();render()};
 if($('aceQuestion'))$('aceQuestion').onchange=e=>{state.questionIndex=Number(e.target.value);clearProposal();render()};
 $('acePrompt').oninput=e=>{state.instruction=e.target.value};
 $('aceGenerate').onclick=generate;
 if($('aceUndo'))$('aceUndo').onclick=undo;
 document.querySelectorAll('[data-ace-example]').forEach(btn=>btn.onclick=()=>{state.instruction=btn.dataset.aceExample;$('acePrompt').value=state.instruction;$('acePrompt').focus()});
 if($('aceApply'))$('aceApply').onclick=apply;
 if($('aceRegenerate'))$('aceRegenerate').onclick=generate;
 if($('aceCancel'))$('aceCancel').onclick=()=>{state.proposal=null;state.proposalContext=null;render()};
 if($('aceEditPrompt'))$('aceEditPrompt').onclick=()=>{state.proposal=null;state.proposalContext=null;render();setTimeout(()=>$('acePrompt')?.focus(),0)};
}
window.contentAuditor=render;
window.aiContentEditor=render;
function install(){
 try{
  if(typeof NAV!=='undefined'&&Array.isArray(NAV.admin)){
   const found=NAV.admin.find(x=>x[0]===PAGE);
   if(found){found[1]='✦';found[2]='AI Content Editor'}else NAV.admin.splice(2,0,[PAGE,'✦','AI Content Editor']);
  }
  if(typeof renderAdmin==='function'&&!window.__aiContentEditorInstalled){const prev=renderAdmin;renderAdmin=function(){if(currentPage===PAGE)return render();return prev()};window.__aiContentEditorInstalled=true}
 }catch(e){console.error('AI Content Editor install failed',e)}
}
install();
})();
