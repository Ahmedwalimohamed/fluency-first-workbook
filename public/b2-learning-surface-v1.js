(()=>{
'use strict';
const ROOTS='.eg-stage-content,.classroom-stage-content';
const exactKind=new Map([
 ['FLUENCY START','fluency'],['FLUENCY USE','fluency'],['TALK AFTER READING','fluency'],
 ['MAKE IT PERSONAL — SPEAK FIRST','fluency'],['MAKE IT PERSONAL - SPEAK FIRST','fluency'],
 ['FLUENCY RULE','fluency'],['FLUENCY EXIT','fluency'],
 ['PRONUNCIATION FOCUS','pronunciation'],['MEDIATION MOVE','mediation'],
 ['B2 PERFORMANCE SHOWCASE','mission'],['PERFORMANCE LANGUAGE BANK','mission'],
 ['READING PERFORMANCE','mission'],['LISTENING PERFORMANCE','mission'],
 ['INTERACTION PERFORMANCE','mission'],['SPOKEN PRODUCTION','mission'],
 ['MEDIATION PERFORMANCE','mission'],['WRITING PERFORMANCE','mission']
]);
function clean(v){return String(v||'').replace(/\s+/g,' ').trim()}
function isUpperLabel(text){
 const t=clean(text),letters=t.replace(/[^A-Za-z]/g,'');
 if(letters.length<5||t.length>64)return false;
 return t===t.toUpperCase()&&!/^(PAGE|LESSON)\b/.test(t)
}
function kindFor(text){
 const t=clean(text);
 if(exactKind.has(t))return exactKind.get(t);
 if(/^THE\s+/.test(t)||/\?$/.test(t)||/(MISSION|PANEL|SHOWCASE|FESTIVAL|CLINIC|NEWSROOM|PLAN|BOOTH|SWAP|REPORT|DEBATE|CONFERENCE|TALE)$/.test(t))return'mission';
 return'section'
}
function replaceLabel(node){
 if(!node||node.dataset?.b2Surface==='1')return node;
 const text=clean(node.textContent);if(!isUpperLabel(text))return node;
 const h=document.createElement('h4');
 h.className='live-book-subhead b2-learning-label is-'+kindFor(text);
 h.dataset.b2Surface='1';h.textContent=text;
 node.replaceWith(h);
 const next=h.nextElementSibling;
 if(next&&next.tagName==='P'&&!isUpperLabel(clean(next.textContent)))next.classList.add('b2-learning-callout-copy');
 return h
}
function decorate(root=document){
 root.querySelectorAll(ROOTS).forEach(surface=>{
   surface.querySelectorAll(':scope > p').forEach(replaceLabel);
   surface.querySelectorAll(':scope > .live-book-subhead').forEach(h=>{
     if(h.classList.contains('b2-learning-label'))return;
     const text=clean(h.textContent);if(isUpperLabel(text)){h.classList.add('b2-learning-label','is-'+kindFor(text));h.dataset.b2Surface='1';const next=h.nextElementSibling;if(next&&next.tagName==='P'&&!isUpperLabel(clean(next.textContent)))next.classList.add('b2-learning-callout-copy')}
   });
   surface.dataset.b2LearningSurface='v1';
 });
 document.querySelectorAll('.b2-microflow').forEach(x=>x.dataset.b2LearningSurface='v1');
}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate()})}
function start(){decorate();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.ENGLISHGATE_B2_LEARNING_SURFACE={version:'b2-learning-surface-v1',labels:[...exactKind.keys()]};
})();
