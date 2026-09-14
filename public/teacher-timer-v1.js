/* EnglishGate teacher classroom timer v1
   Teacher-only countdown timer for Teach/live-class view.
   Does not change lesson, grading, student, or navigation logic. */
(function(){
'use strict';

const DEFAULT_SECONDS=5*60;
const PRESETS=[60,120,300,600];
let durationSeconds=DEFAULT_SECONDS;
let remainingMs=DEFAULT_SECONDS*1000;
let running=false;
let endAt=0;
let ticker=null;
let audioCtx=null;

const q=(s,r=document)=>r.querySelector(s);
const inTeach=()=>document.body.classList.contains('teacher-live-active')&&!!q('.live-class-tools');
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));

function format(ms){
 const total=Math.max(0,Math.ceil(ms/1000));
 const m=Math.floor(total/60),s=total%60;
 return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function currentRemaining(){
 return running?Math.max(0,endAt-Date.now()):Math.max(0,remainingMs);
}

function ensureTimer(){
 if(!inTeach())return null;
 const tools=q('.live-class-tools');
 if(!tools)return null;
 let panel=q('#teacherClassTimer');
 if(panel&&document.body.contains(panel))return panel;
 panel=document.createElement('section');
 panel.id='teacherClassTimer';
 panel.className='teacher-class-timer';
 panel.setAttribute('aria-label','Teacher classroom timer');
 panel.innerHTML=`
  <div class="teacher-timer-main">
   <span class="teacher-timer-label">Timer</span>
   <output id="teacherTimerDisplay" class="teacher-timer-display" aria-live="polite">${format(currentRemaining())}</output>
   <button type="button" id="teacherTimerStart" class="teacher-timer-primary">Start</button>
   <button type="button" id="teacherTimerReset">Reset</button>
  </div>
  <div class="teacher-timer-settings">
   <div class="teacher-timer-presets" role="group" aria-label="Timer presets">
    ${PRESETS.map(seconds=>`<button type="button" data-timer-seconds="${seconds}">${seconds<60?seconds+' sec':(seconds/60)+' min'}</button>`).join('')}
   </div>
   <label class="teacher-timer-custom">Custom <input id="teacherTimerMinutes" type="number" min="1" max="90" step="1" inputmode="numeric" value="5" aria-label="Custom timer minutes"><span>min</span></label>
  </div>`;
 tools.insertAdjacentElement('afterend',panel);
 bind(panel);
 render();
 return panel;
}

function bind(panel){
 q('#teacherTimerStart',panel)?.addEventListener('click',()=>{
  if(running)pause();else start();
 });
 q('#teacherTimerReset',panel)?.addEventListener('click',reset);
 panel.addEventListener('click',e=>{
  const preset=e.target.closest('[data-timer-seconds]');
  if(!preset)return;
  setDuration(Number(preset.dataset.timerSeconds));
 });
 q('#teacherTimerMinutes',panel)?.addEventListener('change',e=>{
  const mins=clamp(Math.round(Number(e.target.value)||5),1,90);
  e.target.value=String(mins);
  setDuration(mins*60);
 });
}

function setDuration(seconds){
 running=false;
 durationSeconds=clamp(Math.round(seconds||DEFAULT_SECONDS),1,90*60);
 remainingMs=durationSeconds*1000;
 endAt=0;
 render();
}

function start(){
 if(currentRemaining()<=0)remainingMs=durationSeconds*1000;
 running=true;
 endAt=Date.now()+remainingMs;
 ensureTicker();
 render();
}

function pause(){
 if(!running)return;
 remainingMs=Math.max(0,endAt-Date.now());
 running=false;
 endAt=0;
 render();
}

function reset(){
 running=false;
 remainingMs=durationSeconds*1000;
 endAt=0;
 render();
}

function finish(){
 running=false;
 remainingMs=0;
 endAt=0;
 render(true);
 beep();
}

function ensureTicker(){
 if(ticker)return;
 ticker=setInterval(()=>{
  if(!running)return;
  const left=endAt-Date.now();
  if(left<=0){finish();return}
  remainingMs=left;
  render();
 },250);
}

function render(finished=false){
 const panel=ensureTimer();
 if(!panel)return;
 const left=currentRemaining();
 const display=q('#teacherTimerDisplay',panel);
 const startBtn=q('#teacherTimerStart',panel);
 if(display)display.textContent=format(left);
 if(startBtn)startBtn.textContent=running?'Pause':'Start';
 panel.classList.toggle('is-running',running);
 panel.classList.toggle('is-finished',finished||(!running&&left<=0));
 panel.classList.toggle('is-warning',running&&left>0&&left<=60000);
 const input=q('#teacherTimerMinutes',panel);
 if(input&&document.activeElement!==input)input.value=String(Math.max(1,Math.round(durationSeconds/60)));
 panel.querySelectorAll('[data-timer-seconds]').forEach(btn=>btn.classList.toggle('is-active',Number(btn.dataset.timerSeconds)===durationSeconds));
}

function beep(){
 try{
  const Ctx=window.AudioContext||window.webkitAudioContext;
  if(!Ctx)return;
  audioCtx=audioCtx||new Ctx();
  const now=audioCtx.currentTime;
  [0,.22,.44].forEach((offset,i)=>{
   const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
   osc.type='sine';osc.frequency.value=i===2?880:660;
   gain.gain.setValueAtTime(.001,now+offset);
   gain.gain.exponentialRampToValueAtTime(.18,now+offset+.02);
   gain.gain.exponentialRampToValueAtTime(.001,now+offset+.16);
   osc.connect(gain);gain.connect(audioCtx.destination);
   osc.start(now+offset);osc.stop(now+offset+.18);
  });
 }catch{}
}

let queued=false;
function schedule(){
 if(queued)return;
 queued=true;
 requestAnimationFrame(()=>{queued=false;if(inTeach()){ensureTimer();render()}});
}

function boot(){
 ensureTicker();
 new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
 schedule();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
