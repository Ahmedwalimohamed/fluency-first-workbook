/* EnglishGate student Reading read-aloud v2 — persistent control dock */
(function(){
'use strict';
const synth=window.speechSynthesis;
let activeArticle=null,chunks=[],chunkIndex=0,currentUtterance=null,rate=1,playing=false,paused=false;
const app=()=>document.getElementById('app');
const studentMode=()=>{const el=app();return !!el&&!el.classList.contains('hidden')&&el.classList.contains('student-mode')};

function readingArticles(){
 if(!studentMode())return[];
 return [...document.querySelectorAll('.eg-reading-article')].filter(article=>{
   const text=(article.querySelector('.eg-skill-kicker')?.textContent||'Reading')+' '+(article.closest('.eg-reading-section,.eg-reading-page,.eg-reading-listening-page,.eg-skill-page')?.textContent||'');
   return /reading/i.test(text);
 });
}
function passageText(article){
 if(!article)return'';
 const ps=[...article.querySelectorAll('p')].map(p=>p.textContent.trim()).filter(Boolean);
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
function dock(){return document.getElementById('egReadingReadAloudDock')}
function setStatus(text){const el=dock()?.querySelector('[data-read-status]');if(el)el.textContent=text}
function updateControls(){
 const d=dock();if(!d)return;
 const read=d.querySelector('[data-read-action="read"]'),pause=d.querySelector('[data-read-action="pause"]'),stop=d.querySelector('[data-read-action="stop"]');
 if(read)read.textContent=playing?'Restart':'Read aloud';
 if(pause){pause.disabled=!playing;pause.textContent=paused?'Resume':'Pause'}
 if(stop)stop.disabled=!playing;
 d.classList.toggle('is-reading-aloud',playing);
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
function startReading(){
 const article=readingArticles()[0];
 if(!article){stopReading('Open a Reading activity first.');return}
 activeArticle=article;
 if(!synth){setStatus('Read aloud is not supported by this browser.');return}
 try{synth.cancel()}catch{}
 const text=passageText(article);if(!text){setStatus('No reading text found.');return}
 chunks=splitText(text);chunkIndex=0;playing=true;paused=false;setStatus('Starting…');updateControls();setTimeout(speakNext,60);
}
function togglePause(){
 if(!synth||!playing)return;
 try{if(paused){synth.resume();paused=false;setStatus(`Reading ${Math.min(chunkIndex+1,chunks.length)} of ${chunks.length}…`)}else{synth.pause();paused=true;setStatus('Paused.')}}catch{}
 updateControls();
}
function ensureDock(){
 let d=dock();
 if(!d){
   d=document.createElement('aside');d.id='egReadingReadAloudDock';d.className='eg-reading-readaloud-dock';d.setAttribute('aria-label','Reading read aloud controls');
   d.innerHTML='<div class="eg-read-dock-head"><strong>Reading audio</strong><span data-read-status aria-live="polite">Ready to read aloud.</span></div><div class="eg-read-dock-actions"><button type="button" class="primary-btn" data-read-action="read">Read aloud</button><button type="button" class="ghost-btn" data-read-action="pause" disabled>Pause</button><button type="button" class="ghost-btn" data-read-action="stop" disabled>Stop</button><label class="eg-read-speed"><span>Speed</span><select data-read-speed aria-label="Reading speed"><option value="0.8">0.8×</option><option value="1" selected>1×</option><option value="1.15">1.15×</option><option value="1.3">1.3×</option></select></label></div>';
   document.body.appendChild(d);
   d.querySelector('[data-read-action="read"]').addEventListener('click',startReading);
   d.querySelector('[data-read-action="pause"]').addEventListener('click',togglePause);
   d.querySelector('[data-read-action="stop"]').addEventListener('click',()=>stopReading());
   d.querySelector('[data-read-speed]').addEventListener('change',e=>{rate=Number(e.target.value)||1;if(playing)startReading()});
 }
 return d;
}
function sync(){
 const articles=readingArticles();const d=ensureDock();
 const show=studentMode()&&articles.length>0;
 d.classList.toggle('is-visible',show);
 d.setAttribute('aria-hidden',show?'false':'true');
 if(show)activeArticle=articles[0];
 if(!show&&playing)stopReading();
 if(activeArticle&&!document.body.contains(activeArticle)&&playing)stopReading();
}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync()})}
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&playing&&!paused)togglePause()});
window.addEventListener('pagehide',()=>{try{synth?.cancel()}catch{}});
if(synth&&'onvoiceschanged' in synth)synth.onvoiceschanged=()=>{};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
})();
