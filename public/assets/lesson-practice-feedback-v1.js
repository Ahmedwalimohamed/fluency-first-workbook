(()=>{
 'use strict';
 let activeSeen=false,loading=false,lastSignature='';
 const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 function dialog(){return document.querySelector('.eg-practise-dialog')}
 function ensureStyle(){
  if(document.getElementById('egPracticeFeedbackStyle'))return;
  const s=document.createElement('style');s.id='egPracticeFeedbackStyle';s.textContent=`
   .eg-practice-feedback{margin:0 26px 24px;text-align:left;border:1px solid #dbe5e1;background:#fff;border-radius:18px;padding:18px;box-shadow:0 8px 24px #1534350d}.eg-practice-feedback h3{margin:0 0 4px;font:700 18px/1.3 system-ui;color:#173f38}.eg-practice-feedback .eg-pf-sub{margin:0 0 14px;color:#6d7e77;font-size:12px}.eg-practice-feedback .eg-pf-grid{display:grid;gap:10px}.eg-practice-feedback .eg-pf-card{border-radius:13px;background:#f4f7f4;padding:12px 13px}.eg-practice-feedback .eg-pf-card strong{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#657a72;margin-bottom:4px}.eg-practice-feedback .eg-pf-card p{margin:0;color:#234940;font-size:14px}.eg-practice-feedback .eg-pf-goals{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.eg-practice-feedback .eg-pf-goal{font-size:11px;border-radius:999px;padding:5px 8px;background:#edf4ef;color:#2b594c}.eg-practice-feedback .eg-pf-goal.is-missing{background:#f5f2e9;color:#6a5a29}.eg-practice-feedback .eg-pf-note{margin:12px 0 0;color:#78877f;font-size:11px}.eg-practice-feedback .eg-pf-vocab{font-weight:600}`;document.head.appendChild(s);
 }
 function render(feedback){
  const d=dialog();if(!d||!feedback)return;
  ensureStyle();let root=d.querySelector('.eg-practice-feedback');if(!root){root=document.createElement('section');root.className='eg-practice-feedback';const note=d.querySelector('.eg-practise-note');d.insertBefore(root,note||null)}
  const observed=(feedback.goalEvidence||[]).filter(x=>x.status==='observed');
  const goals=(feedback.goalEvidence||[]).filter(x=>x.required).map(g=>`<span class="eg-pf-goal${g.status==='observed'?'':' is-missing'}">${g.status==='observed'?'✓ ':'○ '}${esc(g.label)}</span>`).join('');
  const vocab=(feedback.vocabularyUsed||[]).slice(0,6);
  root.innerHTML=`<h3>Your speaking practice</h3><p class="eg-pf-sub">${esc(feedback.title||'Current lesson')} · ${Number(feedback.turns||0)} speaking turn${Number(feedback.turns||0)===1?'':'s'} · ${observed.length} goal${observed.length===1?'':'s'} observed</p><div class="eg-pf-grid"><div class="eg-pf-card"><strong>You did well</strong><p>${esc(feedback.didWell)}</p></div>${feedback.improve?`<div class="eg-pf-card"><strong>One thing to improve</strong><p>${esc(feedback.improve)}</p></div>`:''}${vocab.length?`<div class="eg-pf-card"><strong>Language you used</strong><p class="eg-pf-vocab">${vocab.map(esc).join(' · ')}</p></div>`:''}${feedback.usefulPhrase?`<div class="eg-pf-card"><strong>Useful phrase</strong><p>${esc(feedback.usefulPhrase)}</p></div>`:''}<div class="eg-pf-card"><strong>Next</strong><p>${esc(feedback.next)}</p></div></div>${goals?`<div class="eg-pf-goals" aria-label="Lesson speaking evidence">${goals}</div>`:''}<p class="eg-pf-note">${esc(feedback.note||'This is practice evidence, not a grade.')}</p>`;
  root.scrollIntoView({behavior:'smooth',block:'nearest'});
 }
 async function load(){
  if(loading)return;loading=true;
  try{
   const r=await fetch('/api/lesson-practice/student/feedback',{credentials:'same-origin',cache:'no-store'});if(!r.ok)return;
   const data=await r.json(),f=data?.feedback;if(!f)return;
   const sig=JSON.stringify([f.lessonId,f.turns,f.words,f.evidenceSummary?.observed,f.evidenceQuality]);if(sig===lastSignature)return;lastSignature=sig;render(f);
  }catch{}finally{loading=false}
 }
 function inspect(){
  const d=dialog();if(!d){activeSeen=false;return}
  const start=d.querySelector('.eg-practise-primary'),status=d.querySelector('.eg-practise-status');
  if(start?.hidden)activeSeen=true;
  if(activeSeen&&start&&!start.hidden&&status&&/practice ended|practice paused|five-minute practice|voice connection ended|voice service|audio connection/i.test(status.textContent||''))setTimeout(load,250);
 }
 const observer=new MutationObserver(inspect);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','data-state']});
 document.addEventListener('click',e=>{if(e.target?.closest?.('.eg-practise-button')){activeSeen=false;lastSignature='';setTimeout(inspect,0)}});
 window.ENGLISHGATE_PRACTICE_FEEDBACK={version:'trusted-evidence-v1',refresh:load};
})();
