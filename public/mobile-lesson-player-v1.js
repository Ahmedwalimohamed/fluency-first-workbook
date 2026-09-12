/* EnglishGate mobile lesson player v1
   Student-only pre-activity simplification. Does not alter lesson data or teacher/admin views. */
(function(){
'use strict';

const mobile=()=>window.matchMedia('(max-width:760px)').matches;
const student=()=>typeof session!=='undefined'&&session?.role==='student';
const workbook=()=>document.querySelector('.lesson-book-workbook');

function visible(el){
 if(!el)return false;
 const s=getComputedStyle(el);
 return !el.hidden&&s.display!=='none'&&s.visibility!=='hidden';
}

function scoreAction(el){
 const t=(el.textContent||'').trim().toLowerCase();
 if(!t)return -100;
 if(/back|previous|hint|example|pronunciation|transcript|teacher|close|cancel/.test(t))return -50;
 let score=0;
 if(/start|begin/.test(t))score+=10;
 if(/practice|activity|exercise/.test(t))score+=8;
 if(/continue|next/.test(t))score+=6;
 if(/try|open/.test(t))score+=4;
 if(el.matches('.primary-btn,[class*="primary"]'))score+=3;
 return score;
}

function markPrimaryAction(root){
 root.querySelectorAll('.eg-mobile-primary-action,.eg-mobile-primary-action-row').forEach(el=>{
  el.classList.remove('eg-mobile-primary-action','eg-mobile-primary-action-row');
 });
 const rows=[...root.querySelectorAll('.skill-action-row,.activity-actions,.eg-action-row,.eg-stage-actions')].filter(visible);
 for(const row of rows){
  const candidates=[...row.querySelectorAll('button,a,[role="button"]')].filter(visible);
  if(!candidates.length)continue;
  const ranked=candidates.map(el=>({el,score:scoreAction(el)})).sort((a,b)=>b.score-a.score);
  if(ranked[0].score<4)continue;
  row.classList.add('eg-mobile-primary-action-row');
  ranked[0].el.classList.add('eg-mobile-primary-action');
  break;
 }
}

function compactStages(root){
 const stageLists=[...root.querySelectorAll('.eg-stage-list')];
 stageLists.forEach(list=>{
  list.classList.remove('eg-mobile-current-stage-only');
  [...list.children].forEach(el=>el.classList.remove('eg-mobile-current-stage'));
  const current=[...list.children].find(el=>
    el.matches('.active,.is-active,[aria-current="step"],[aria-current="true"],[aria-selected="true"],[data-active="true"]')||
    el.querySelector('.active,.is-active,[aria-current="step"],[aria-current="true"],[aria-selected="true"],[data-active="true"]')
  );
  if(current){
    current.classList.add('eg-mobile-current-stage');
    list.classList.add('eg-mobile-current-stage-only');
  }
 });
}

function sync(){
 const root=workbook();
 const should=mobile()&&student()&&Boolean(root)&&!document.body.classList.contains('student-question-focus-mode');
 document.body.classList.toggle('student-lesson-player-mode',should);
 if(!should)return;
 compactStages(root);
 markPrimaryAction(root);
}

let queued=false;
function schedule(){
 if(queued)return;
 queued=true;
 requestAnimationFrame(()=>{queued=false;sync();});
}

function start(){
 new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','aria-current','aria-selected','data-active']});
 window.addEventListener('resize',schedule,{passive:true});
 window.addEventListener('orientationchange',schedule,{passive:true});
 sync();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
