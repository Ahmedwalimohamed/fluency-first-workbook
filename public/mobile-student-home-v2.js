/* EnglishGate mobile student home v2
   Adds a focused student-home state without changing dashboard data or navigation logic. */
(function(){
'use strict';

const isMobile=()=>window.matchMedia('(max-width:760px)').matches;
const isStudent=()=>typeof session!=='undefined'&&session?.role==='student';
const hasHome=()=>Boolean(document.querySelector('.eg-student-home.eg-premium-home'));

function sync(){
  document.body.classList.toggle('student-home-focus-mode',isMobile()&&isStudent()&&hasHome());
}

let queued=false;
function schedule(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;sync();});
}

function start(){
  new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true});
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('orientationchange',schedule,{passive:true});
  sync();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
