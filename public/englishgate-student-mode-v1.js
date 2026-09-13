/* EnglishGate student visual-mode hook.
   Adds the student-mode class used by the unified UI/theme layers without
   changing authentication, routing, grading, or lesson behavior. */
(function(){
'use strict';

function currentRole(){
  try{
    if(typeof session !== 'undefined' && session && session.role){
      return String(session.role).toLowerCase();
    }
  }catch(error){}
  return '';
}

function syncStudentMode(){
  const app=document.getElementById('app');
  const isStudent=currentRole()==='student';
  if(app) app.classList.toggle('student-mode',isStudent);
  document.body.classList.toggle('englishgate-student-mode',isStudent);
}

let queued=false;
function schedule(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{
    queued=false;
    syncStudentMode();
  });
}

function boot(){
  syncStudentMode();

  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{
    subtree:true,
    childList:true,
    attributes:true,
    attributeFilter:['class']
  });

  window.addEventListener('hashchange',schedule,{passive:true});
  window.addEventListener('popstate',schedule,{passive:true});
  window.addEventListener('pageshow',schedule,{passive:true});

  /* Authentication can update the shared session object between DOM turns.
     Poll briefly after page load/login so the theme activates immediately. */
  let checks=0;
  const timer=setInterval(()=>{
    syncStudentMode();
    checks+=1;
    if(checks>=80)clearInterval(timer);
  },250);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
