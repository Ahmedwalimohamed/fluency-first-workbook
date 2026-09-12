/* EnglishGate mobile activity focus trigger v4
   Keeps the current question prominent and requires explicit Back/Next taps. */
(function(){
  const isMobile=()=>window.matchMedia('(max-width: 760px)').matches;
  const isStudent=()=>typeof session!=='undefined'&&session?.role==='student';
  const activityPanel=()=>document.getElementById('activityPanel');
  const hasActiveActivity=()=>{
    const panel=activityPanel();
    if(!panel)return false;
    return Boolean(panel.querySelector('.activity-question-list,.guided-question,.mcq-option-cards,[data-question-flow-label]'));
  };

  function normalizeFlow(){
    const panel=activityPanel();
    if(!panel)return;
    const lists=[...panel.querySelectorAll('.activity-question-list,.writing-core-sequence')];
    lists.forEach(list=>{
      const visible=Boolean(list.querySelector('.guided-question:not([hidden])'));
      list.dataset.flowActiveList=visible?'1':'0';
    });

    // Never auto-advance. The learner must explicitly tap Next.
    const continueBtn=panel.querySelector('.student-question-continue');
    if(continueBtn)continueBtn.dataset.autoAdvance='0';
  }

  const sync=()=>{
    const shouldFocus=isMobile()&&isStudent()&&hasActiveActivity();
    document.body.classList.toggle('student-question-focus-mode',shouldFocus);
    if(shouldFocus)normalizeFlow();
  };

  let scheduled=false;
  const scheduleSync=()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;sync();});
  };

  const observer=new MutationObserver(scheduleSync);
  const start=()=>{
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','data-auto-advance','data-flow-active-list']});
    sync();
    window.addEventListener('resize',scheduleSync,{passive:true});
    window.addEventListener('orientationchange',scheduleSync,{passive:true});
    if(window.visualViewport)window.visualViewport.addEventListener('resize',scheduleSync,{passive:true});
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
