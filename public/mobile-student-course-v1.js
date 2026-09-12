/* EnglishGate mobile My Book v1
   Focuses the course list around the learner's next unfinished lesson. */
(function(){
'use strict';

const isMobile=()=>window.matchMedia('(max-width:760px)').matches;
const isStudent=()=>typeof session!=='undefined'&&session?.role==='student';

function courseRoot(){
  const home=document.getElementById('courseHome');
  const list=document.querySelector('.course-shell .student-course-list');
  return home&&list?list:null;
}

function markNext(list){
  list.querySelectorAll('.eg-course-next').forEach(el=>el.classList.remove('eg-course-next'));
  const cards=[...list.querySelectorAll('.course-topic')];
  const next=cards.find(card=>card.classList.contains('current')&&!card.classList.contains('complete'))||cards.find(card=>card.classList.contains('current'))||null;
  if(next)next.classList.add('eg-course-next');
}

function sync(){
  const list=courseRoot();
  const should=isMobile()&&isStudent()&&Boolean(list);
  document.body.classList.toggle('student-course-focus-mode',should);
  if(should)markNext(list);
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
