(()=>{
  'use strict';

  const ROOT_SELECTOR='.eg-workbook,.lesson-book-workbook,.admin-preview-workbook';
  let scheduled=false;

  function workbookRoot(){
    return document.querySelector(ROOT_SELECTOR);
  }

  function isGrammarStageButton(el){
    if(!(el instanceof Element))return false;
    if(el.matches('[data-workbook-stage="grammar"]'))return true;
    if(!el.matches('.eg-stage,button,[role="tab"]'))return false;
    const root=el.closest(ROOT_SELECTOR);
    if(!root)return false;
    return (el.textContent||'').trim().toLowerCase()==='grammar';
  }

  function removeGrammarStageButtons(root=document){
    root.querySelectorAll('[data-workbook-stage="grammar"]').forEach(el=>el.remove());
    root.querySelectorAll(`${ROOT_SELECTOR} .eg-stage,${ROOT_SELECTOR} button,${ROOT_SELECTOR} [role="tab"]`).forEach(el=>{
      if(isGrammarStageButton(el))el.remove();
    });
  }

  function leaveGrammarPage(){
    const root=workbookRoot();
    if(!root||!root.querySelector('.eg-grammar-page'))return;
    const fallback=[...root.querySelectorAll('[data-workbook-stage]')].find(el=>{
      const step=(el.dataset.workbookStage||'').toLowerCase();
      return step&&step!=='grammar'&&!el.disabled;
    });
    if(fallback){
      fallback.click();
      return;
    }
    const page=root.querySelector('.eg-grammar-page');
    if(page)page.remove();
  }

  function clean(){
    scheduled=false;
    removeGrammarStageButtons();
    leaveGrammarPage();
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(clean);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();

  const target=document.getElementById('content')||document.body;
  new MutationObserver(schedule).observe(target,{childList:true,subtree:true});
})();
