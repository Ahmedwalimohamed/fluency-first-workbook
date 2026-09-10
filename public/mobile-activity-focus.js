/* EnglishGate mobile activity focus trigger v1
   Ensures the focused activity UI activates even when only the current question is mounted. */
(function(){
  const isMobile=()=>window.matchMedia('(max-width: 760px)').matches;
  const isStudent=()=>typeof session!=='undefined'&&session?.role==='student';
  const hasActiveActivity=()=>{
    const panel=document.getElementById('activityPanel');
    if(!panel)return false;
    return Boolean(
      panel.querySelector('.activity-question-list')||
      panel.querySelector('.guided-question')||
      panel.querySelector('.mcq-option-cards')||
      panel.querySelector('[data-question-flow-label]')
    );
  };
  const sync=()=>{
    const shouldFocus=isMobile()&&isStudent()&&document.body.classList.contains('workbook-design-mode')&&hasActiveActivity();
    document.body.classList.toggle('student-question-focus-mode',shouldFocus);
  };
  const observer=new MutationObserver(sync);
  const start=()=>{
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    sync();
    window.addEventListener('resize',sync,{passive:true});
    window.addEventListener('orientationchange',sync,{passive:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
