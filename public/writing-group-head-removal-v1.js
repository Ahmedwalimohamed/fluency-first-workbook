/* EnglishGate writing cleanup
   Build / Correct / Apply group banners are presentation-only and do not belong between writing questions.
   Keep the actual writing exercises and question flow unchanged. */
(function(){
'use strict';

function cleanExisting(root=document){
  root.querySelectorAll?.('.eg-writing-page .writing-core-group-head').forEach(el=>el.remove());
}

try{
  if(typeof writingCoreHtml==='function'&&typeof writingCoreExercises==='function'){
    const renderWritingCore=function(l){
      return writingCoreExercises(l).map(ex=>
        (ex.type==='build'||ex.type==='organize')
          ?writingArrangeHtml(ex)
          :writingTextCoreHtml(ex)
      ).join('');
    };
    writingCoreHtml=renderWritingCore;
    window.writingCoreHtml=renderWritingCore;
  }
}catch(e){
  console.error('Writing group heading cleanup failed',e);
}

let queued=false;
const observer=new MutationObserver(()=>{
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;cleanExisting();});
});

function start(){
  cleanExisting();
  observer.observe(document.body,{subtree:true,childList:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
