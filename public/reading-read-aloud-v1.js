/* EnglishGate student Reading read-aloud v3 — visible Reading button */
(function(){
'use strict';
const synth=window.speechSynthesis;
let activeSource=null,chunks=[],chunkIndex=0,currentUtterance=null,rate=1,playing=false,paused=false;
const app=()=>document.getElementById('app');
const studentMode=()=>{const el=app();return !!el&&!el.classList.contains('hidden')&&el.classList.contains('student-mode')};

function readingSources(){
 if(!studentMode())return[];
 const separated=[...document.querySelectorAll('.eg-separated-activity[data-activity-type="reading"] .sep-reading-text')];
 const legacy=[...document.querySelectorAll('.eg-reading-article')].filter(article=>{
   const text=(article.querySelector('.eg-skill-kicker')?.textContent||'Reading')+' '+(article.closest('.eg-reading-section,.eg-reading-page,.eg-reading-listening-page,.eg-skill-page')?.textContent||'');
   return /reading/i.test(text);
 });
 return [...separated,...legacy];
}
function sourceText(source){
 if(!source)return'';
 if(source.classList?.contains('sep-reading-text'))return String(source.textContent||'').trim();
 const ps=[...source.querySelectorAll('p')].map(p=>p.textContent.trim()).filter(Boolean);
 return ps.join(' ');
}
function splitText(text,max=220){
 const sentences=String(text||'').match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[];const out=[];let current='';
 for(const s of sentences){const next=(current+' '+s.trim()).trim();if(next.length>max&&current){out.push(current);current=s.trim()}else current=next}
 if(current)out.push(current);
 return out.flatMap(x=>x.length<=max?[x]:Array.from({length:Math.ceil(x.length/max)},(_,i)=>x.slice(i*max,(i+1)*max)));
}
function preferredVoice(){
 const voices=synth?.getVoices?.()||[];
 return voices.find(v=>/^en-US$/i.test(v.lang)&&/samantha|ava|allison|karen|zira|google us english|aria|jenny|guy/i.test(v.name))||voices.find(v=>/^en-US$/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang))||null;
}
function controlsFor(source){return source?.parentElement?.querySelector?.('.eg-reading-readaloud-inline')||source?.querySelector?.('.eg-reading-readaloud-inline')||null}
function allControls(){return [...document.querySelectorAll('.eg-reading-readaloud-inline')]}
function setStatus(text){allControls().forEach(c=>{const el=c.querySelector('[data-read-status]');if(el)el.textContent=text})}
function updateControls(){
 allControls().forEach(c=>{
  const read=c.querySelector('[data-read-action="read"]'),pause=c.querySelector('[data-read-action="pause"]'),stop=c.querySelector('[data-read-action="stop"]');
  if(read)read.textContent=playing?'Restart':'Read aloud';
  if(pause){pause.disabled=!playing;pause.textContent=paused?'Resume':'Pause'}
  if(stop)stop.disabled=!playing;
  c.classList.toggle('is-reading-aloud',playing);
 });
}
function stopReading(status='Ready to read aloud.'){
 try{synth?.cancel()}catch{}
 playing=false;paused=false;chunks=[];chunkIndex=0;currentUtterance=null;setStatus(status);updateControls();
}
function speakNext(){
 if(!playing||paused||chunkIndex>=chunks.length){if(playing&&chunkIndex>=chunks.length)stopReading('Finished reading.');return}
 const u=new SpeechSynthesisUtterance(chunks[chunkIndex]);currentUtterance=u;u.lang='en-US';u.rate=rate;u.pitch=1;const voice=preferredVoice();if(voice)u.voice=voice;
 u.onstart=()=>{setStatus(`Reading ${chunkIndex+1} of ${chunks.length}…`);updateControls()};
 u.onend=()=>{if(!playing)return;chunkIndex++;currentUtterance=null;speakNext()};
 u.onerror=e=>{if(e.error==='canceled'||e.error==='interrupted')return;stopReading('Read aloud stopped. Try again.')};
 try{synth.speak(u)}catch{stopReading('Read aloud is not available on this device.')}
}
function startReading(source){
 activeSource=source;
 if(!synth){setStatus('Read aloud is not supported by this browser.');return}
 try{synth.cancel()}catch{}
 const text=sourceText(source);if(!text){setStatus('No reading text found.');return}
 chunks=splitText(text);chunkIndex=0;playing=true;paused=false;setStatus('Starting…');updateControls();setTimeout(speakNext,60);
}
function togglePause(){
 if(!synth||!playing)return;
 try{if(paused){synth.resume();paused=false;setStatus(`Reading ${Math.min(chunkIndex+1,chunks.length)} of ${chunks.length}…`)}else{synth.pause();paused=true;setStatus('Paused.')}}catch{}
 updateControls();
}
function ensureControls(source){
 const host=source.classList?.contains('sep-reading-text')?source.parentElement:source;
 if(!host||host.querySelector('.eg-reading-readaloud-inline'))return;
 const controls=document.createElement('div');controls.className='eg-reading-readaloud-inline';controls.setAttribute('aria-label','Reading read aloud controls');
 controls.innerHTML='<button type="button" class="primary-btn" data-read-action="read">Read aloud</button><button type="button" class="ghost-btn" data-read-action="pause" disabled>Pause</button><button type="button" class="ghost-btn" data-read-action="stop" disabled>Stop</button><label class="eg-read-speed"><span>Speed</span><select data-read-speed aria-label="Reading speed"><option value="0.8">0.8×</option><option value="1" selected>1×</option><option value="1.15">1.15×</option><option value="1.3">1.3×</option></select></label><span class="eg-read-status" data-read-status aria-live="polite">Ready to read aloud.</span>';
 if(source.classList?.contains('sep-reading-text'))host.insertBefore(controls,source);else{const heading=host.querySelector('h2');if(heading)heading.insertAdjacentElement('afterend',controls);else host.prepend(controls)}
 controls.querySelector('[data-read-action="read"]').addEventListener('click',()=>startReading(source));
 controls.querySelector('[data-read-action="pause"]').addEventListener('click',togglePause);
 controls.querySelector('[data-read-action="stop"]').addEventListener('click',()=>stopReading());
 controls.querySelector('[data-read-speed]').addEventListener('change',e=>{rate=Number(e.target.value)||1;if(playing&&activeSource===source)startReading(source)});
}
function sync(){
 const sources=readingSources();sources.forEach(ensureControls);
 if(activeSource&&!document.body.contains(activeSource)&&playing)stopReading();
 if(!studentMode()&&playing)stopReading();
}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync()})}
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&playing&&!paused)togglePause()});
document.addEventListener('click',e=>{if(e.target.closest?.('[data-sep-stage]:not([data-sep-stage="reading"]),[data-page],#backWorkbook,#previousActivity,.lesson-tab')&&playing)stopReading()},true);
window.addEventListener('pagehide',()=>{try{synth?.cancel()}catch{}});
if(synth&&'onvoiceschanged' in synth)synth.onvoiceschanged=()=>{};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
})();
