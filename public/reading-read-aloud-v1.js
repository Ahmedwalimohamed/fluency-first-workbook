/* EnglishGate student Reading read-aloud v1 */
(function(){
'use strict';
const synth=window.speechSynthesis;
let activeArticle=null,chunks=[],chunkIndex=0,currentUtterance=null,rate=1,playing=false,paused=false;
const app=()=>document.getElementById('app');
const studentMode=()=>{const el=app();return !!el&&!el.classList.contains('hidden')&&el.classList.contains('student-mode')};

function readingArticles(){
 if(!studentMode())return[];
 return [...document.querySelectorAll('.eg-reading-article')].filter(article=>/reading/i.test(article.querySelector('.eg-skill-kicker')?.textContent||'Reading'));
}
function passageText(article){
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
 return voices.find(v=>/^en-US$/i.test(v.lang)&&/samantha|ava|allison|karen|zira|google us english/i.test(v.name))||voices.find(v=>/^en-US$/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang))||null;
}
function setStatus(text){if(!activeArticle)return;const el=activeArticle.querySelector('[data-read-status]');if(el)el.textContent=text}
function updateControls(){
 if(!activeArticle)return;
 const read=activeArticle.querySelector('[data-read-action="read"]'),pause=activeArticle.querySelector('[data-read-action="pause"]'),stop=activeArticle.querySelector('[data-read-action="stop"]');
 if(read)read.textContent=playing?'Restart':'Read aloud';
 if(pause){pause.disabled=!playing;pause.textContent=paused?'Resume':'Pause'}
 if(stop)stop.disabled=!playing;
 activeArticle.classList.toggle('is-reading-aloud',playing);
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
function startReading(article){
 if(!synth){activeArticle=article;setStatus('Read aloud is not supported by this browser.');return}
 if(activeArticle&&activeArticle!==article)stopReading();
 activeArticle=article;try{synth.cancel()}catch{}
 const text=passageText(article);if(!text){setStatus('No reading text found.');return}
 chunks=splitText(text);chunkIndex=0;playing=true;paused=false;setStatus('Starting…');updateControls();setTimeout(speakNext,60);
}
function togglePause(){
 if(!synth||!playing)return;
 try{if(paused){synth.resume();paused=false;setStatus(`Reading ${Math.min(chunkIndex+1,chunks.length)} of ${chunks.length}…`)}else{synth.pause();paused=true;setStatus('Paused.')}}catch{}
 updateControls();
}
function ensureControls(article){
 if(article.querySelector('.eg-reading-readaloud'))return;
 const text=passageText(article);if(!text)return;
 const controls=document.createElement('div');controls.className='eg-reading-readaloud';controls.setAttribute('aria-label','Reading audio controls');
 controls.innerHTML='<button type="button" class="eg-read-btn primary-btn" data-read-action="read">Read aloud</button><button type="button" class="eg-read-btn ghost-btn" data-read-action="pause" disabled>Pause</button><button type="button" class="eg-read-btn ghost-btn" data-read-action="stop" disabled>Stop</button><label class="eg-read-speed"><span>Speed</span><select data-read-speed aria-label="Reading speed"><option value="0.8">0.8×</option><option value="1" selected>1×</option><option value="1.15">1.15×</option><option value="1.3">1.3×</option></select></label><span class="eg-read-status" data-read-status aria-live="polite">Ready to read aloud.</span>';
 const heading=article.querySelector('h2');if(heading)heading.insertAdjacentElement('afterend',controls);else article.prepend(controls);
 controls.querySelector('[data-read-action="read"]').addEventListener('click',()=>startReading(article));
 controls.querySelector('[data-read-action="pause"]').addEventListener('click',()=>{activeArticle=article;togglePause()});
 controls.querySelector('[data-read-action="stop"]').addEventListener('click',()=>{activeArticle=article;stopReading()});
 controls.querySelector('[data-read-speed]').addEventListener('change',e=>{rate=Number(e.target.value)||1;if(playing&&activeArticle===article){startReading(article)}});
}
function sync(){
 const articles=readingArticles();articles.forEach(ensureControls);
 if(activeArticle&&!document.body.contains(activeArticle))stopReading();
 if(!studentMode()&&playing)stopReading();
}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync()})}
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&playing&&!paused)togglePause()});
window.addEventListener('pagehide',()=>{try{synth?.cancel()}catch{}});
if(synth&&'onvoiceschanged' in synth)synth.onvoiceschanged=()=>{};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
})();
