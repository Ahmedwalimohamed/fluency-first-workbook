/* EnglishGate mobile activity focus trigger v9
   One-question mobile flow: MCQs auto-advance; typed/open responses use Continue; Back remains available. */
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
    const activeQuestion=panel.querySelector('.guided-question.is-flow-current')||panel.querySelector('.guided-question:not([hidden])');

    lists.forEach(list=>{
      const visible=Boolean(list.querySelector('.guided-question:not([hidden])'));
      const active=visible?'1':'0';
      if(list.dataset.flowActiveList!==active)list.dataset.flowActiveList=active;
    });

    const continueBtn=panel.querySelector('.student-question-continue');
    if(continueBtn){
      const question=activeQuestion;
      const isChoice=Boolean(question?.querySelector('input[type="radio"],.mcq-option-card'));
      const hasInlineCheck=Boolean(question?.querySelector('[data-writing-core-check]'));
      const allQuestions=[...panel.querySelectorAll('.guided-question[data-flow-index]')];
      const index=question?allQuestions.indexOf(question):-1;
      const last=index>=0&&index===allQuestions.length-1;
      const autoAdvance=(isChoice||hasInlineCheck)&&!last?'1':'0';
      if(continueBtn.dataset.autoAdvance!==autoAdvance)continueBtn.dataset.autoAdvance=autoAdvance;
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
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
    sync();
    window.addEventListener('resize',scheduleSync,{passive:true});
    window.addEventListener('orientationchange',scheduleSync,{passive:true});
    if(window.visualViewport)window.visualViewport.addEventListener('resize',scheduleSync,{passive:true});
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
