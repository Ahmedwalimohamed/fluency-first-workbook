/* Student invitation for teacher-started EnglishGate AI Conversation rounds. */
(function(){
 'use strict';
 const clean=x=>String(x??'').trim();
 function currentLessonSnapshot(){
  try{if(typeof lesson==='function'){const l=lesson();if(l)return l}}catch{}
  return {id:document.querySelector('[data-lesson-id]')?.dataset?.lessonId||'',title:document.querySelector('#pageTitle')?.textContent||''};
 }
 function canonicalLessonId(rawId,titleHint=''){
  const id=clean(rawId);
  if(/^su-b2-l\d+$/.test(id)||/^su-b1-l\d+$/.test(id)||/^a1-gold-l(?:[1-9]|1\d|2[0-2])$/.test(id))return id;
  const title=clean(titleHint||currentLessonSnapshot()?.title).toLowerCase();
  if(!title)return id;
  const candidates=[...(Array.isArray(window.SPEAKUP_B2_BLUEPRINT)?window.SPEAKUP_B2_BLUEPRINT:[]),...((window.A1_GOLD_V1_BOOK?.lessons)||[])];
  const match=candidates.find(x=>clean(x?.title).toLowerCase()===title&&x?.id);
  return match?.id||id;
 }
 if(!window.__egPracticeLessonCompatV1){
  window.__egPracticeLessonCompatV1=true;
  const nativeFetch=window.fetch.bind(window);
  window.fetch=function(input,init={}){
   const rawUrl=typeof input==='string'?input:(input instanceof URL?input.toString():'');
   if(!rawUrl)return nativeFetch(input,init);
   try{
    const url=new URL(rawUrl,window.location.href);
    if(url.pathname.startsWith('/api/lesson-practice/teacher/')){
     const snap=currentLessonSnapshot(),title=snap?.title||'';
     if(url.searchParams.has('lessonId'))url.searchParams.set('lessonId',canonicalLessonId(url.searchParams.get('lessonId'),title));
     let nextInit=init;
     if(typeof init?.body==='string'&&init.body){
      try{const body=JSON.parse(init.body);if(body&&body.lessonId){body.lessonId=canonicalLessonId(body.lessonId,title);nextInit={...init,body:JSON.stringify(body)}}}catch{}
     }
     const nextInput=typeof input==='string'?(url.origin===window.location.origin?url.pathname+url.search:url.toString()):url;
     return nativeFetch(nextInput,nextInit);
    }
   }catch{}
   return nativeFetch(input,init);
  };
 }
 if(!document.querySelector('script[data-eg-practice-feedback]')){
  const s=document.createElement('script');s.src='/assets/lesson-practice-feedback-v1.js?v=1';s.defer=true;s.dataset.egPracticeFeedback='1';document.head.appendChild(s);
 }
 let banner=null,timer=null,lastRoundId='',lastActive=false;
 function role(){try{return typeof session!=='undefined'?session?.role:null}catch{return null}}
 function currentLessonId(){
  const snap=currentLessonSnapshot();
  return canonicalLessonId(snap?.id||'',snap?.title||'');
 }
 function remove(){banner?.remove();banner=null}
 function ensure(round){
  if(!banner){
   banner=document.createElement('aside');banner.className='eg-class-ai-invite';banner.setAttribute('role','status');
   const style=document.createElement('style');style.textContent=`
    .eg-class-ai-invite{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:880;width:min(560px,calc(100vw - 24px));background:#0f172a;color:#fff;border:1px solid #334155;border-radius:18px;padding:14px 15px;box-shadow:0 20px 60px #0f172a55;font-family:system-ui;display:flex;gap:12px;align-items:center}.eg-class-ai-copy{min-width:0;flex:1}.eg-class-ai-copy small{display:block;color:#93c5fd;font-size:10px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.eg-class-ai-copy strong{display:block;font-size:14px;margin-top:2px}.eg-class-ai-copy span{display:block;font-size:11px;color:#cbd5e1;margin-top:3px}.eg-class-ai-invite button{border:0;border-radius:11px;background:#2563eb;color:#fff;padding:10px 13px;font:750 12px system-ui;cursor:pointer;white-space:nowrap}.eg-class-ai-invite button:disabled{background:#475569;color:#cbd5e1;cursor:default}@media(max-width:600px){.eg-class-ai-invite{bottom:76px;align-items:flex-start;flex-wrap:wrap}.eg-class-ai-invite button{width:100%}}
   `;document.head.appendChild(style);document.body.appendChild(banner);
  }
  const here=currentLessonId(),matches=here===round.lessonId,mins=Math.max(0,Math.ceil(Number(round.remainingSeconds||0)/60));
  banner.innerHTML=`<div class="eg-class-ai-copy"><small>Teacher started AI Conversation</small><strong>${clean(round.title||'Speaking practice')}</strong><span>${matches?`Practise this lesson now · about ${mins} min left`:'Open this lesson to join the class speaking round.'}</span></div><button type="button" ${matches?'':'disabled'}>${matches?'Open speaking practice':'Open lesson first'}</button>`;
  const b=banner.querySelector('button');if(matches)b.onclick=()=>{const launch=document.querySelector('[data-lesson-practise]');if(launch){launch.click();remove()}else{b.textContent='Speaking coach is loading…';setTimeout(()=>{document.querySelector('[data-lesson-practise]')?.click()},500)}};
 }
 function endClassPracticeIfOpen(){
  const dialog=document.querySelector('.eg-practise-dialog[open]');if(!dialog)return;
  const end=[...dialog.querySelectorAll('button')].find(b=>/^End practice$/i.test(clean(b.textContent)));if(end)end.click();
 }
 async function poll(){
  clearTimeout(timer);if(role()!=='student'){remove();lastRoundId='';lastActive=false;timer=setTimeout(poll,5000);return}
  try{
   const r=await fetch('/api/lesson-practice/student/round',{credentials:'same-origin'}),data=await r.json();const round=r.ok?data.round:null;
   if(round){lastRoundId=round.id;lastActive=true;ensure(round)}else{if(lastActive&&lastRoundId)endClassPracticeIfOpen();lastActive=false;lastRoundId='';remove()}
  }catch{}
  timer=setTimeout(poll,3500);
 }
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll()});setTimeout(poll,1400);
})();