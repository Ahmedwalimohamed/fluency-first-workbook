/* EnglishGate evidence loop: teacher live monitor, prioritized intervention, transfer check. */
(function(){
 'use strict';
 const clean=x=>String(x??'').trim();
 const esc=x=>clean(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let launcher=null,panel=null,pollTimer=null,open=false,lastLessonId='',payload=null;
 function role(){try{return typeof session!=='undefined'?session?.role:null}catch{return null}}
 function currentLesson(){
  try{if(typeof lesson==='function'){const l=lesson();if(l?.id)return l}}catch{}
  try{const id=document.querySelector('[data-lesson-id]')?.dataset?.lessonId;if(id)return{id,title:document.querySelector('#pageTitle')?.textContent||id}}catch{}
  return null;
 }
 async function api(path,options={}){
  const r=await fetch(path,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
  const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Could not load practice evidence.');return data;
 }
 const css=document.createElement('style');css.textContent=`
 .eg-ev-launch{position:fixed;right:22px;bottom:22px;z-index:850;border:0;border-radius:999px;background:#0f172a;color:#fff;padding:13px 18px;font:700 13px/1.2 system-ui;box-shadow:0 14px 34px #0f172a2e;cursor:pointer}.eg-ev-launch span{display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;margin-right:8px}
 .eg-ev-panel{position:fixed;right:16px;top:16px;bottom:16px;z-index:900;width:min(560px,calc(100vw - 32px));background:#f8fafc;border:1px solid #e2e8f0;border-radius:22px;box-shadow:0 30px 90px #0f172a38;display:flex;flex-direction:column;overflow:hidden;font-family:system-ui;color:#0f172a}.eg-ev-panel[hidden]{display:none}.eg-ev-head{padding:20px 22px 16px;background:#fff;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:16px}.eg-ev-head small{display:block;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:10px}.eg-ev-head h2{font-size:20px;margin:3px 0 0}.eg-ev-close{border:1px solid #e2e8f0;background:#fff;border-radius:10px;width:36px;height:36px;cursor:pointer}.eg-ev-body{overflow:auto;padding:18px 20px 28px}.eg-ev-counts{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}.eg-ev-count{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:11px}.eg-ev-count strong{display:block;font-size:20px}.eg-ev-count span{font-size:11px;color:#64748b}.eg-ev-decision{background:#fff;border:1px solid #cbd5e1;border-radius:16px;padding:16px;margin-bottom:16px}.eg-ev-kicker{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#2563eb}.eg-ev-decision h3{font-size:17px;margin:5px 0}.eg-ev-decision p{font-size:13px;line-height:1.5;color:#475569;margin:7px 0}.eg-ev-confidence{display:flex;gap:8px;flex-wrap:wrap;font-size:11px;color:#64748b}.eg-ev-seq{margin:10px 0 0;padding-left:18px;font-size:12px;color:#334155}.eg-ev-actions{display:flex;gap:7px;margin-top:12px}.eg-ev-actions button{border:1px solid #cbd5e1;border-radius:10px;background:#fff;padding:8px 11px;font:700 12px system-ui;cursor:pointer}.eg-ev-actions .primary{background:#2563eb;color:#fff;border-color:#2563eb}.eg-ev-edit{display:flex;gap:7px;margin-top:9px}.eg-ev-edit input{flex:1;border:1px solid #cbd5e1;border-radius:10px;padding:9px 10px}.eg-ev-table{display:grid;gap:8px}.eg-ev-row{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px 13px;display:grid;grid-template-columns:minmax(110px,1.4fr) .8fr .55fr .55fr;gap:8px;align-items:center}.eg-ev-name strong{font-size:13px;display:block}.eg-ev-name small{font-size:10px;color:#64748b}.eg-ev-status{font-size:11px;font-weight:800}.eg-ev-status[data-tone=danger]{color:#dc2626}.eg-ev-status[data-tone=warn]{color:#b45309}.eg-ev-status[data-tone=done]{color:#15803d}.eg-ev-status[data-tone=active]{color:#2563eb}.eg-ev-metric{font-size:11px;color:#475569}.eg-ev-transfer{grid-column:1/-1;border-top:1px solid #f1f5f9;padding-top:9px;display:flex;gap:8px;align-items:center}.eg-ev-transfer label{font-size:11px;color:#64748b}.eg-ev-transfer select{margin-left:auto;border:1px solid #cbd5e1;border-radius:9px;padding:7px 8px;background:#fff;font-size:11px}.eg-ev-empty{background:#fff;border:1px dashed #cbd5e1;border-radius:14px;padding:24px;text-align:center;color:#64748b;font-size:13px}.eg-ev-foot{font-size:11px;color:#64748b;margin-top:12px;line-height:1.5}.eg-ev-toast{position:sticky;bottom:0;margin-top:10px;background:#0f172a;color:#fff;border-radius:10px;padding:9px 11px;font-size:11px}
 @media(max-width:640px){.eg-ev-launch{right:12px;bottom:76px}.eg-ev-panel{inset:0;width:100%;border-radius:0}.eg-ev-counts{grid-template-columns:repeat(2,1fr)}.eg-ev-row{grid-template-columns:1.3fr .8fr .5fr}.eg-ev-row .eg-ev-words{display:none}}
 `;document.head.appendChild(css);
 function ensureUi(){
  if(!launcher){launcher=document.createElement('button');launcher.type='button';launcher.className='eg-ev-launch';launcher.innerHTML='<span></span>Practice Monitor';launcher.onclick=()=>toggle(true);document.body.appendChild(launcher)}
  if(!panel){panel=document.createElement('aside');panel.className='eg-ev-panel';panel.hidden=true;panel.innerHTML='<header class="eg-ev-head"><div><small>EnglishGate evidence loop</small><h2>AI Practice Monitor</h2></div><button class="eg-ev-close" type="button" aria-label="Close">×</button></header><div class="eg-ev-body"><div class="eg-ev-empty">Open a lesson to see practice evidence.</div></div>';panel.querySelector('.eg-ev-close').onclick=()=>toggle(false);document.body.appendChild(panel)}
 }
 function removeUi(){launcher?.remove();panel?.remove();launcher=panel=null;toggle(false)}
 function toggle(value){open=value;if(panel)panel.hidden=!value;clearTimeout(pollTimer);if(value)refresh()}
 function goalCount(s){return Object.keys(s.goals||{}).filter(k=>s.goals[k]?.status==='observed').length}
 function decisionHtml(d){
  if(!d)return '<section class="eg-ev-decision"><span class="eg-ev-kicker">Prioritized teacher decision</span><h3>Collect evidence first</h3><p>There is not enough practice evidence yet to recommend a class-wide intervention.</p></section>';
  return `<section class="eg-ev-decision" data-decision><span class="eg-ev-kicker">Teach this next</span><h3>${esc(d.title)}</h3><p>${esc(d.why)}</p><div class="eg-ev-confidence"><span>${Math.round(Number(d.confidence||0)*100)}% evidence confidence</span><span>·</span><span>${Number(d.affectedCount||0)} affected</span><span>·</span><span>${Number(d.suggestedMinutes||0)} min</span></div>${Array.isArray(d.sequence)?`<ol class="eg-ev-seq">${d.sequence.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`:''}<div class="eg-ev-actions"><button class="primary" data-use type="button">Use</button><button data-edit type="button">Edit</button><button data-ignore type="button">Ignore</button></div><div class="eg-ev-edit" hidden><input value="${esc(d.title)}" aria-label="Edit teaching decision"><button type="button" data-save-edit>Save</button></div></section>`;
 }
 function rowHtml(s,totalGoals){
  const transfer=s.finished?`<div class="eg-ev-transfer"><label>After Fluency Mission</label><select data-transfer data-student="${esc(s.studentId)}" data-class="${esc(s.classId)}"><option value="not_observed" ${s.transferStatus==='not_observed'?'selected':''}>Not observed</option><option value="observed" ${s.transferStatus==='observed'?'selected':''}>Transferred</option><option value="partial" ${s.transferStatus==='partial'?'selected':''}>Partial</option><option value="struggling" ${s.transferStatus==='struggling'?'selected':''}>Still struggling</option></select></div>`:'';
  return `<article class="eg-ev-row"><div class="eg-ev-name"><strong>${esc(s.name)}</strong><small>${esc(s.className||'Class')}</small></div><div class="eg-ev-status" data-tone="${esc(s.tone)}">${esc(s.status)}</div><div class="eg-ev-metric">${Number(s.turns||0)} turns</div><div class="eg-ev-metric eg-ev-words">${Number(s.words||0)} words</div><div class="eg-ev-metric" style="grid-column:1/-1">Goals observed: ${goalCount(s)}/${totalGoals}${s.technicalIssue?` · <strong>Technical:</strong> ${esc(s.technicalIssue)}`:''}</div>${transfer}</article>`;
 }
 function render(data){
  payload=data;const body=panel?.querySelector('.eg-ev-body');if(!body)return;
  const c=data.counts||{},goals=data.lesson?.goals||[];
  body.innerHTML=`<div class="eg-ev-counts"><div class="eg-ev-count"><strong>${Number(c.active||0)}</strong><span>Active</span></div><div class="eg-ev-count"><strong>${Number(c.finished||0)}</strong><span>Finished</span></div><div class="eg-ev-count"><strong>${Number(c.notStarted||0)}</strong><span>Not started</span></div><div class="eg-ev-count"><strong>${Number(c.technical||0)}</strong><span>Technical</span></div></div>${decisionHtml(data.decision)}<div class="eg-ev-table">${(data.students||[]).length?(data.students||[]).map(s=>rowHtml(s,goals.length)).join(''):'<div class="eg-ev-empty">No students are enrolled in your class for this lesson.</div>'}</div><p class="eg-ev-foot">Evidence is deliberately conservative. “Not observed” does not mean “cannot do.” Transfer is recorded only after you observe the student using the language with another person.</p>`;
  wireActions();
 }
 function toast(text){const body=panel?.querySelector('.eg-ev-body');if(!body)return;body.querySelector('.eg-ev-toast')?.remove();const n=document.createElement('div');n.className='eg-ev-toast';n.textContent=text;body.appendChild(n);setTimeout(()=>n.remove(),3500)}
 async function saveDecision(action,editedText=''){
  const l=currentLesson();if(!l||!payload?.decision)return;const classId=payload.students?.find(x=>x.classId)?.classId||null;
  try{await api('/api/lesson-practice/teacher/decision',{method:'POST',body:JSON.stringify({lessonId:l.id,classId,action,recommendation:payload.decision,editedText})});toast(action==='ignore'?'Recommendation ignored. Teacher decision saved.':'Teacher decision saved.')}catch(e){toast(e.message)}
 }
 function wireActions(){
  const d=panel.querySelector('[data-decision]');if(d){
   d.querySelector('[data-use]')?.addEventListener('click',()=>saveDecision('use'));
   d.querySelector('[data-ignore]')?.addEventListener('click',()=>saveDecision('ignore'));
   d.querySelector('[data-edit]')?.addEventListener('click',()=>{const box=d.querySelector('.eg-ev-edit');box.hidden=!box.hidden;if(!box.hidden)box.querySelector('input')?.focus()});
   d.querySelector('[data-save-edit]')?.addEventListener('click',()=>saveDecision('edit',d.querySelector('.eg-ev-edit input')?.value||''));
  }
  panel.querySelectorAll('[data-transfer]').forEach(sel=>sel.addEventListener('change',async()=>{
   const l=currentLesson();if(!l)return;
   try{const r=await api('/api/lesson-practice/teacher/transfer',{method:'POST',body:JSON.stringify({lessonId:l.id,classId:sel.dataset.class,studentId:sel.dataset.student,status:sel.value})});toast('Transfer evidence saved. '+r.consolidation)}catch(e){toast(e.message)}
  }));
 }
 async function refresh(){
  clearTimeout(pollTimer);if(!open||role()!=='teacher')return;
  const l=currentLesson();if(!l?.id){render({lesson:{goals:[]},counts:{},students:[],decision:null});return}
  lastLessonId=l.id;
  try{render(await api('/api/lesson-practice/teacher/live?lessonId='+encodeURIComponent(l.id)))}catch(e){const body=panel?.querySelector('.eg-ev-body');if(body)body.innerHTML=`<div class="eg-ev-empty">${esc(e.message)}</div>`}
  if(open)pollTimer=setTimeout(refresh,5000);
 }
 function sync(){
  if(role()!=='teacher'){removeUi();return}
  const l=currentLesson();if(!l?.id){launcher?.remove();launcher=null;if(open)toggle(false);return}
  ensureUi();if(open&&l.id!==lastLessonId)refresh();
 }
 const content=document.getElementById('content');if(content)new MutationObserver(sync).observe(content,{childList:true,subtree:true,attributes:true});
 const login=document.getElementById('loginScreen');if(login)new MutationObserver(sync).observe(login,{attributes:true,attributeFilter:['style','class','hidden']});
 setInterval(sync,1800);sync();
})();