/* EnglishGate grammar option instruction repair
   Keeps shared directions once above the choices while preserving the original
   radio values/data attributes used by grading. */
(function(){
'use strict';

function cleanInstruction(text){
 const s=String(text||'').trim();
 const m=s.match(/^([^:]{3,80}:)\s+/);
 return m?m[1].replace(/:$/,'').trim():'';
}

function repairCard(card){
 if(!card||card.dataset.sharedInstructionFixed==='1')return;
 const texts=[...card.querySelectorAll('.mcq-option-text')];
 if(texts.length<2)return;
 const values=texts.map(x=>String(x.textContent||'').trim());
 const instruction=cleanInstruction(values[0]);
 if(!instruction)return;
 const prefix=instruction+':';
 if(!values.every(v=>v.startsWith(prefix)))return;

 texts.forEach(node=>{
  node.textContent=String(node.textContent||'').trim().slice(prefix.length).trim();
 });

 const instructionNode=document.createElement('p');
 instructionNode.className='grammar-shared-instruction';
 instructionNode.textContent=instruction+'.';
 const intended=card.querySelector('.grammar-intended-meaning');
 const stage=card.querySelector('.question-stage');
 if(intended)card.insertBefore(instructionNode,intended);
 else if(stage&&stage.nextSibling)card.insertBefore(instructionNode,stage.nextSibling);
 else card.prepend(instructionNode);

 card.dataset.sharedInstructionFixed='1';
}

function repair(root=document){
 root.querySelectorAll('.grammar-core-card[data-grammar-choice], .guided-question[data-grammar-choice]').forEach(repairCard);
}

const style=document.createElement('style');
style.id='grammar-option-instruction-v1-style';
style.textContent='.grammar-shared-instruction{margin:0 0 14px;font-weight:800;color:var(--eg-text,#0F172A);line-height:1.45}.grammar-shared-instruction+.grammar-intended-meaning{margin-top:0}';
document.head.appendChild(style);

let queued=false;
const observer=new MutationObserver(()=>{
 if(queued)return;
 queued=true;
 requestAnimationFrame(()=>{queued=false;repair();});
});
function start(){repair();observer.observe(document.body,{subtree:true,childList:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
