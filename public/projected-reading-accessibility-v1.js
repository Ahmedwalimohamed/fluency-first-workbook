/* EnglishGate projector reading controls */
(function(){
'use strict';

const KEY='englishgate.projectedReadingScale';
const MIN=.85,MAX=1.5,STEP=.1;
let scheduled=false;

function clamp(n){return Math.min(MAX,Math.max(MIN,n))}
function savedScale(){
  const n=Number(localStorage.getItem(KEY));
  return Number.isFinite(n)&&n>=MIN&&n<=MAX?n:1;
}
function setScale(value){
  const n=Math.round(clamp(Number(value)||1)*100)/100;
  document.body.style.setProperty('--eg-project-reading-scale',String(n));
  try{localStorage.setItem(KEY,String(n))}catch{}
  document.querySelectorAll('[data-project-reading-scale]').forEach(el=>el.textContent=Math.round(n*100)+'%');
  return n;
}
function currentScale(){
  const inline=parseFloat(document.body.style.getPropertyValue('--eg-project-reading-scale'));
  return Number.isFinite(inline)?inline:savedScale();
}
function visibleReadingStage(){
  const stages=[...document.querySelectorAll('.teacher-presentation-mode .eg-stage-content.is-reading-stage')];
  return stages.find(el=>!el.hidden&&el.getClientRects().length)||stages[0]||null;
}
function ensureControls(){
  const stage=visibleReadingStage();
  document.querySelectorAll('.projected-reading-controls').forEach(el=>{if(!stage||el.parentElement!==stage)el.remove()});
  if(!stage)return;
  let bar=stage.querySelector(':scope > .projected-reading-controls');
  if(!bar){
    bar=document.createElement('div');
    bar.className='projected-reading-controls';
    bar.setAttribute('role','group');
    bar.setAttribute('aria-label','Projected reading text size');
    bar.innerHTML='<span>Projector text</span><button type="button" data-project-reading-smaller aria-label="Make projected reading text smaller">A−</button><button type="button" class="projected-reading-reset" data-project-reading-reset data-project-reading-scale aria-label="Reset projected reading text size">100%</button><button type="button" data-project-reading-larger aria-label="Make projected reading text larger">A+</button>';
    stage.prepend(bar);
    bar.querySelector('[data-project-reading-smaller]').onclick=()=>setScale(currentScale()-STEP);
    bar.querySelector('[data-project-reading-larger]').onclick=()=>setScale(currentScale()+STEP);
    bar.querySelector('[data-project-reading-reset]').onclick=()=>setScale(1);
  }
  setScale(currentScale());
}
function schedule(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;ensureControls()});
}
function boot(){
  setScale(savedScale());
  ensureControls();
  new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
  document.addEventListener('fullscreenchange',schedule);
  window.addEventListener('resize',schedule,{passive:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
