(()=>{
 'use strict';
 const ENDPOINT='/api/admin/a1-pilot/health';
 const PANEL_ID='a1PilotHealthPanel';
 let lastSnapshot=null,loading=false,authorized=null;
 const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const n=value=>Number(value||0);
 const fmt=value=>{if(!value)return'No activity yet';const d=new Date(value);return Number.isNaN(d.getTime())?'No activity yet':d.toLocaleString()};
 function isReports(){return /reports?/i.test(document.querySelector('#pageTitle')?.textContent||'')}
 function removePanel(){document.getElementById(PANEL_ID)?.remove()}
 function statusClass(status){return status==='PASS'?'is-pass':status==='WARN'?'is-warn':'is-block'}
 function metric(label,value,sub=''){
  return `<div class="a1ph-metric"><span>${esc(label)}</span><strong>${esc(value)}</strong>${sub?`<small>${esc(sub)}</small>`:''}</div>`;
 }
 function render(snapshot){
  lastSnapshot=snapshot;
  if(!isReports()){removePanel();return}
  const content=document.querySelector('#content');if(!content)return;
  let panel=document.getElementById(PANEL_ID);
  if(!panel){panel=document.createElement('section');panel.id=PANEL_ID;panel.className='a1ph-panel';content.prepend(panel)}
  const safety=snapshot.safety||{}, learner=snapshot.learner||{};
  const attempts=learner.attempts||{}, completion=learner.completion||{}, workbook=learner.workbook||{}, wa=learner.workbookAttempts||{}, writing=learner.writing||{}, speaking=learner.speaking||{}, fixes=learner.fixes||{};
  const notices=[...(snapshot.blockers||[]),...(snapshot.warnings||[])];
  const footprint=Math.max(n(attempts.lessons),n(completion.lessons),n(workbook.lessons),n(writing.lessons),n(speaking.lessons));
  panel.innerHTML=`
   <div class="a1ph-head">
    <div><p class="a1ph-eyebrow">Controlled production pilot</p><h3>A1 Gold Pilot Health</h3><p>Read-only operational view. Learner answers are not displayed here.</p></div>
    <div class="a1ph-actions"><span class="a1ph-status ${statusClass(snapshot.status)}">${esc(snapshot.status)}</span><button type="button" data-a1ph-refresh>Refresh</button></div>
   </div>
   <div class="a1ph-grid a1ph-grid-safety">
    ${metric('B2 production',safety.b2||'unknown')}
    ${metric('A1 Gold',safety.a1||'unknown')}
    ${metric('Pilot learners',n(safety.pilotStudents),'locked to 1')}
    ${metric('Pilot teachers',n(safety.pilotTeachers))}
    ${metric('Expansion locks',(!safety.extraStudentsAllowed&&!safety.extraClassesAllowed)?'Closed':'OPEN')}
    ${metric('OpenAI TTS',safety.ttsCredentialAligned?'Aligned':'Check credential')}
   </div>
   <div class="a1ph-section-head"><h4>Learning footprint</h4><span>${footprint}/22 lessons touched</span></div>
   <div class="a1ph-grid">
    ${metric('Core attempts',n(attempts.attempts),`${n(attempts.lessons)} lessons · avg ${attempts.avg_score??'—'}`)}
    ${metric('Completed steps',n(completion.steps),`${n(completion.lessons)} lessons`)}
    ${metric('Workbook',`${n(workbook.completed)}/${n(workbook.activities)}`,`${n(workbook.in_progress)} in progress · ${n(workbook.stalled)} stalled`)}
    ${metric('Workbook attempts',n(wa.attempts),`avg ${wa.avg_percentage??'—'}%`)}
    ${metric('Writing samples',n(writing.samples),`${n(writing.lessons)} lessons · avg ${writing.avg_score??'—'}`)}
    ${metric('Speaking mastery',`${n(speaking.mastered)}/${n(speaking.completed)}`,`${n(speaking.needs_review)} review · ${n(speaking.stalled)} stalled`)}
    ${metric('Fix & Improve',`${n(fixes.resolved)}/${n(fixes.total)}`,`${n(fixes.unresolved)} unresolved`)}
    ${metric('Last learning activity',fmt([attempts.latest_at,completion.latest_at,workbook.latest_at,wa.latest_at,writing.latest_at,speaking.latest_at,fixes.latest_at].filter(Boolean).sort().at(-1)))}
   </div>
   ${notices.length?`<div class="a1ph-notices"><strong>Needs attention</strong>${notices.map(x=>`<span>${esc(x.replaceAll('_',' '))}</span>`).join('')}</div>`:`<div class="a1ph-clear">No pilot blockers or warnings detected.</div>`}
   ${(snapshot.latestSpeaking||[]).length?`<div class="a1ph-detail"><h4>Latest speaking decisions</h4><div class="a1ph-chips">${snapshot.latestSpeaking.map(x=>`<span><b>${esc(x.lesson_id.replace('a1-gold-l','L'))}</b> ${esc(x.mastery_state)} · Jev ${esc(x.jev_status)}</span>`).join('')}</div></div>`:''}
   ${(snapshot.unfinishedWorkbook||[]).length?`<div class="a1ph-detail"><h4>Open workbook activity</h4><div class="a1ph-chips">${snapshot.unfinishedWorkbook.map(x=>`<span><b>${esc(x.lesson_id.replace('a1-gold-l','L'))}</b> ${esc(x.activity_type)} · ${esc(x.status)}</span>`).join('')}</div></div>`:''}
   <div class="a1ph-foot">Snapshot: ${esc(fmt(snapshot.generatedAt))}</div>`;
  panel.querySelector('[data-a1ph-refresh]')?.addEventListener('click',()=>load(true));
 }
 async function load(force=false){
  if(loading)return;if(authorized===false&&!force)return;
  loading=true;
  try{
   const response=await fetch(ENDPOINT,{credentials:'same-origin',cache:'no-store',headers:{'Accept':'application/json'}});
   if(response.status===401||response.status===403){authorized=false;removePanel();return}
   if(!response.ok)throw new Error(`HTTP ${response.status}`);
   authorized=true;render(await response.json());
  }catch(error){
   if(isReports()&&authorized){
    const panel=document.getElementById(PANEL_ID);if(panel)panel.innerHTML=`<div class="a1ph-error"><strong>Pilot health temporarily unavailable.</strong><span>${esc(error.message)}</span><button type="button" data-a1ph-refresh>Retry</button></div>`,panel.querySelector('[data-a1ph-refresh]')?.addEventListener('click',()=>load(true));
   }
  }finally{loading=false}
 }
 function sync(){
  if(!isReports()){removePanel();return}
  if(lastSnapshot)render(lastSnapshot);
  load();
 }
 const boot=()=>{
  sync();
  const title=document.querySelector('#pageTitle'),content=document.querySelector('#content');
  if(title)new MutationObserver(sync).observe(title,{childList:true,subtree:true,characterData:true});
  if(content)new MutationObserver(()=>{if(isReports()&&!document.getElementById(PANEL_ID)){lastSnapshot?render(lastSnapshot):load()}}).observe(content,{childList:true,subtree:false});
  window.addEventListener('focus',()=>{if(isReports())load(true)});
 };
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
