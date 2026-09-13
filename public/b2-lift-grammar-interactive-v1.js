(()=>{
  'use strict';

  const LIFT_NUMBERS=new Set([23,24,25]);
  if(typeof window.grammarActivity!=='function')return;

  const previous=window.grammarActivity;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const escAttr=s=>esc(s).replace(/`/g,'&#96;');
  const lessonNumber=l=>{
    const direct=Number(l?.number);
    if(Number.isFinite(direct))return direct;
    const m=String(l?.id||'').match(/su-b2-l(\d+)$/i);
    return m?Number(m[1]):0;
  };

  window.grammarActivity=function(l){
    const n=lessonNumber(l);
    if(!LIFT_NUMBERS.has(n))return previous(l);

    const realFocus=String(l?.grammar?.focus||'Grammar').trim()||'Grammar';
    const realRule=String(l?.grammar?.rule||'').trim();
    let html=previous(l);

    // The legacy 1–22 B2 briefing must never overwrite B2 Lift grammar.
    if(l?.grammar)l.grammar.focus=realFocus;
    html=html.replace(/<section class="eg-grammar-briefing"[\s\S]*?<\/section>/i,'');
    html=html.replace(/<h1>Grammar:\s*(?:undefined|null)?<\/h1>/i,`<h1>Grammar: ${esc(realFocus)}</h1>`);
    html=html.replace('<h1>Build accurate English</h1>',`<h1>Grammar: ${esc(realFocus)}</h1>`);
    html=html.replace('<div class="eg-skill-page eg-grammar-page">',`<div class="eg-skill-page eg-grammar-page" data-b2-lift-grammar="${n}">`);

    const questions=(l?.grammar?.items||[]).slice(0,10);
    if(questions.length){
      const quick=questions[0];
      const options=(quick.options||[]).slice(0,4);
      const quickCheck=`<section class="b2-lift-grammar-quick" aria-label="Interactive grammar quick check"><div><small>Quick check</small><h3>Try it now</h3><p>${esc(quick.q)}</p></div><div class="b2-lift-grammar-quick-options">${options.map((o,i)=>`<button type="button" class="b2-lift-grammar-quick-option" data-value="${escAttr(o)}" data-answer="${escAttr(quick.answer)}"><span>${String.fromCharCode(65+i)}</span>${esc(o)}</button>`).join('')}</div><p class="b2-lift-grammar-quick-feedback" aria-live="polite"></p></section>`;
      const coachEnd='</aside>';
      const pos=html.indexOf(coachEnd);
      if(pos!==-1)html=html.slice(0,pos)+quickCheck+html.slice(pos);
    }

    // Keep the main scored practice intact: its MCQ pickers and free-response fields
    // continue to use EnglishGate's native answer/checking system.
    return html;
  };

  document.addEventListener('click',e=>{
    const btn=e.target.closest('.b2-lift-grammar-quick-option');
    if(!btn)return;
    const box=btn.closest('.b2-lift-grammar-quick');
    if(!box)return;
    const selected=String(btn.dataset.value||'');
    const answer=String(btn.dataset.answer||'');
    box.querySelectorAll('.b2-lift-grammar-quick-option').forEach(x=>{
      x.classList.remove('is-correct','is-wrong');
      x.setAttribute('aria-pressed','false');
    });
    btn.setAttribute('aria-pressed','true');
    const ok=selected===answer;
    btn.classList.add(ok?'is-correct':'is-wrong');
    const feedback=box.querySelector('.b2-lift-grammar-quick-feedback');
    if(feedback)feedback.textContent=ok?'Correct. Now continue to the scored practice.':'Not yet. Check the grammar pattern and try again.';
  });

  const style=document.createElement('style');
  style.id='b2-lift-grammar-interactive-v1-style';
  style.textContent=`
  .b2-lift-grammar-quick{margin-top:16px;padding:16px;border:1px solid var(--border,#d9e0ea);border-radius:14px;background:var(--surface,#fff)}
  .b2-lift-grammar-quick small{font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted,#667085)}
  .b2-lift-grammar-quick h3{margin:4px 0 6px;font-size:1rem}
  .b2-lift-grammar-quick p{margin:0 0 12px;line-height:1.5}
  .b2-lift-grammar-quick-options{display:grid;gap:8px}
  .b2-lift-grammar-quick-option{display:flex;gap:10px;align-items:flex-start;width:100%;min-height:44px;padding:11px 12px;border:1px solid var(--border,#d9e0ea);border-radius:10px;background:#fff;text-align:left;cursor:pointer;font:inherit;color:inherit}
  .b2-lift-grammar-quick-option span{font-weight:800}
  .b2-lift-grammar-quick-option.is-correct{border-color:#16a34a;background:#f0fdf4}
  .b2-lift-grammar-quick-option.is-wrong{border-color:#dc2626;background:#fef2f2}
  .b2-lift-grammar-quick-feedback{margin-top:10px!important;font-weight:700}
  `;
  document.head.appendChild(style);
})();
