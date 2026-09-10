/* EnglishGate mobile activity focus trigger v2
   Activates one-question mobile mode for any student workbook activity. */
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
    const lists=[...panel.querySelectorAll('.activity-question-list')];
    const activeQuestion=panel.querySelector('.guided-question:not([hidden])');
    lists.forEach(list=>{
      const active=list===activeQuestion?.closest('.activity-question-list')||list.querySelector('.guided-question:not([hidden])');
      list.dataset.flowActiveList=active?'1':'0';
    });

    /* Keep the final/manual button available, but remove it visually for auto-advance MCQs. */
    const continueBtn=panel.querySelector('.student-question-continue');
    if(continueBtn){
      const question=activeQuestion;
      const isChoice=Boolean(question?.querySelector('input[type="radio"],.mcq-option-card'));
      const allQuestions=[...panel.querySelectorAll('.guided-question')];
      const index=question?allQuestions.indexOf(question):-1;
      const last=index>=0&&index===allQuestions.length-1;
      continueBtn.dataset.autoAdvance=isChoice&&!last?'1':'0';
    }
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
