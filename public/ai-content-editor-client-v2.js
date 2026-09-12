(function(){
'use strict';

const nativeFetch=window.fetch.bind(window);
window.fetch=function englishGateAiEditorFetch(input,init){
  if(typeof input==='string'&&input==='/api/content-editor/generate'){
    return nativeFetch('/api/content-editor/generate-v2',init);
  }
  return nativeFetch(input,init);
};

let scheduled=false;
function scheduleEnhance(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;enhance()});
}
function enhance(){
  const prompt=document.getElementById('acePrompt');
  if(!prompt)return;
  let count=document.getElementById('acePromptCount');
  if(!count){
    count=document.createElement('small');
    count.id='acePromptCount';
    count.style.cssText='display:block;margin-top:7px;color:#64748b;font-weight:600;text-align:right';
    prompt.insertAdjacentElement('afterend',count);
  }
  const updateCount=()=>{
    const n=prompt.value.length;
    count.textContent=n.toLocaleString()+' / 20,000 characters';
    count.style.color=n>20000?'#b91c1c':'#64748b';
  };
  if(!prompt.dataset.aiEditorV2){
    prompt.dataset.aiEditorV2='1';
    prompt.addEventListener('input',updateCount);
  }
  updateCount();

  const state=window.__aiContentEditorState||{};
  document.querySelectorAll('.ace-inline-message').forEach(x=>x.remove());
  if(state.message){
    const button=document.getElementById('aceGenerate');
    if(button){
      const note=document.createElement('div');
      note.className='ace-inline-message';
      note.textContent=state.message;
      note.style.cssText='margin:12px 0 0;padding:11px 13px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-weight:700;line-height:1.4';
      button.insertAdjacentElement('beforebegin',note);
    }
  }

  const result=document.querySelector('.ace-result');
  if(state.proposal&&result&&!result.dataset.previewShown){
    result.dataset.previewShown='1';
    setTimeout(()=>result.scrollIntoView({behavior:'smooth',block:'start'}),80);
  }
}

const observer=new MutationObserver(scheduleEnhance);
function start(){
  const root=document.getElementById('content')||document.body;
  observer.observe(root,{childList:true,subtree:true});
  enhance();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
