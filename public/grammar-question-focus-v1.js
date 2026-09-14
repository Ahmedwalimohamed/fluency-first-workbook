/* EnglishGate grammar question focus v2
   Global mobile grammar question focus: whenever any grammar question is active,
   show only the current question, its task label/progress, feedback, and navigation.
   No grading, lesson data, answer keys, or progress logic changes. */
(function(){
'use strict';

const isMobile=()=>window.matchMedia('(max-width:760px)').matches;
const panel=()=>document.getElementById('activityPanel');

function isGrammarActivity(root){
  if(!root)return false;
  return Boolean(
    root.querySelector('.eg-grammar-briefing,.eg-grammar-layout,.eg-grammar-page,.eg-grammar-micro-page,[data-b2-lift-grammar],.grammar-core-card') ||
    /\bgrammar\b/i.test(String(root.querySelector('.eg-skill-kicker,.eg-skill-hero h1')?.textContent||''))
  );
}

function activeQuestion(root){
  return root?.querySelector('.guided-question.is-flow-current') ||
    [...(root?.querySelectorAll('.guided-question')||[])].find(q=>!q.hidden&&getComputedStyle(q).display!=='none') || null;
}

function cleanSharedInstruction(text){
  const value=String(text||'').trim();
  const match=value.match(/^([^:]{3,80}:)\s+/);
  return match?match[1].replace(/:$/,'').trim():'';
}

function repairRepeatedOptionInstruction(q){
  if(!q||q.dataset.sharedInstructionFixed==='1')return;
  const optionTexts=[...q.querySelectorAll('.mcq-option-text')];
  if(optionTexts.length<2)return;
  const values=optionTexts.map(node=>String(node.textContent||'').trim());
  const instruction=cleanSharedInstruction(values[0]);
  if(!instruction)return;
  const prefix=instruction+':';
  if(!values.every(value=>value.startsWith(prefix)))return;

  optionTexts.forEach(node=>{
    node.textContent=String(node.textContent||'').trim().slice(prefix.length).trim();
  });

  const instructionNode=document.createElement('p');
  instructionNode.className='grammar-shared-instruction';
  instructionNode.textContent=instruction+'.';
  const intended=q.querySelector('.grammar-intended-meaning');
  const stage=q.querySelector('.question-stage');
  if(intended)q.insertBefore(instructionNode,intended);
  else if(stage&&stage.nextSibling)q.insertBefore(instructionNode,stage.nextSibling);
  else q.prepend(instructionNode);

  q.dataset.sharedInstructionFixed='1';
}

function clear(root){
  root?.classList.remove('eg-grammar-question-only');
  root?.querySelectorAll('.eg-focus-path').forEach(el=>el.classList.remove('eg-focus-path'));
  root?.querySelectorAll('.eg-grammar-focus-hidden').forEach(el=>el.classList.remove('eg-grammar-focus-hidden'));
}

function preserveBranch(root,q){
  const keep=new Set();
  let node=q;
  while(node&&node!==root){
    keep.add(node);
    node=node.parentElement;
  }

  const special=[
    root.querySelector('.student-question-flow-head'),
    root.querySelector('#activityFeedback'),
    root.querySelector('.student-question-bottom-nav')
  ].filter(Boolean);

  root.querySelectorAll('*').forEach(el=>{
    if(keep.has(el)||q.contains(el))return;
    if(special.some(container=>el===container||container.contains(el)))return;
    if(el.contains(q))return;
    el.classList.add('eg-grammar-focus-hidden');
  });
}

function sync(){
  const root=panel();
  if(!root)return;
  clear(root);
  if(!isMobile()||!isGrammarActivity(root))return;

  const q=activeQuestion(root);
  if(!q)return;

  const questionMode=
    document.body.classList.contains('student-question-focus-mode') ||
    q.classList.contains('is-flow-current') ||
    Boolean(root.querySelector('.student-question-flow-head'));
  if(!questionMode)return;

  repairRepeatedOptionInstruction(q);
  root.classList.add('eg-grammar-question-only');

  let node=q;
  while(node&&node!==root){
    node.classList.add('eg-focus-path');
    node=node.parentElement;
  }

  preserveBranch(root,q);

  const stage=q.querySelector('.question-stage span');
  const flowStage=root.querySelector('[data-question-flow-stage]');
  if(stage&&flowStage)flowStage.textContent=stage.textContent.trim();
}

const style=document.createElement('style');
style.id='grammar-shared-instruction-style';
style.textContent='\
.grammar-shared-instruction{margin:0 0 14px;font-weight:800;line-height:1.45;color:var(--eg-text,#0F172A)}\
.grammar-shared-instruction+.grammar-intended-meaning{margin-top:0}\
@media(max-width:760px){#activityPanel.eg-grammar-question-only .eg-grammar-focus-hidden{display:none!important}}';
document.head.appendChild(style);

let queued=false;
const schedule=()=>{
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;sync();});
};

function start(){
  new MutationObserver(schedule).observe(document.documentElement,{
    subtree:true,
    childList:true,
    attributes:true,
    attributeFilter:['class','hidden']
  });
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('orientationchange',schedule,{passive:true});
  sync();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
