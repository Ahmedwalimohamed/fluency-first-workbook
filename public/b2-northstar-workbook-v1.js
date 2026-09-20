/* EnglishGate B2 Lessons 2–22 — Northstar workbook engine
   SEE → CHOOSE → CHANGE → USE → FIX
   Keeps the learner experience simple while Jev handles the repair decision. */
(function(){
'use strict';

const FLOW_VERSION='b2-northstar-v1.1';
const REMEMBER_OFFSETS=[1,3,7];
const TOTAL=10;
const MIN_COMPREHENSION_QUESTIONS=3;
const PHASES=['SEE','CHOOSE','CHANGE','USE','FIX'];
const STEPS=[
 {phase:'SEE',skill:'reading'},
 {phase:'CHOOSE',skill:'grammar'},
 {phase:'CHOOSE',skill:'grammar'},
 {phase:'CHOOSE',skill:'vocabulary'},
 {phase:'CHOOSE',skill:'listening'},
 {phase:'CHANGE',skill:'grammar'},
 {phase:'CHANGE',skill:'grammar'},
 {phase:'USE',skill:'writing'},
 {phase:'USE',skill:'writing'},
 {phase:'FIX',skill:'writing'}
];

function el(id){return document.getElementById(id)}
function esc(v){
 if(typeof escapeHtml==='function')return escapeHtml(String(v==null?'':v));
 return String(v==null?'':v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))
}
function words(v){const s=String(v||'').trim();return s?s.split(/\s+/).filter(Boolean).length:0}
function preview(){return typeof isWorkbookPreview==='function'&&isWorkbookPreview()}
function sid(){return typeof session!=='undefined'&&session&&session.id?session.id:'preview'}
function key(l){return 'englishgate:'+FLOW_VERSION+':'+sid()+':'+l.id}
function fresh(l){return{version:FLOW_VERSION,lessonId:l.id,index:0,responses:{},results:{},attempts:{},subprogress:{},subresponses:{},repair:null,complete:false,saved:false,share:false,updatedAt:new Date().toISOString()}}
function read(l){
 try{const x=JSON.parse(localStorage.getItem(key(l))||'null');return x&&x.version===FLOW_VERSION&&x.lessonId===l.id?Object.assign(fresh(l),x):fresh(l)}
 catch{return fresh(l)}
}
function write(l,s){s.updatedAt=new Date().toISOString();try{localStorage.setItem(key(l),JSON.stringify(s))}catch{}}
function setR(l,s,i,v){s.responses[String(i)]=v;write(l,s)}
function getR(s,i){return s.responses[String(i)]}
function setOK(l,s,i,v){s.results[String(i)]=Boolean(v);write(l,s)}
function hit(l,s,i){const k=String(i);s.attempts[k]=Number(s.attempts[k]||0)+1;write(l,s)}
function phaseAt(i){return STEPS[Math.max(0,Math.min(TOTAL-1,i))].phase}
function uiModeAt(i){
 const step=STEPS[Math.max(0,Math.min(TOTAL-1,i))]||{};
 if(step.phase==='SEE'||step.skill==='listening')return 'source';
 if(step.phase==='CHOOSE')return 'decision';
 if(step.phase==='CHANGE'||step.phase==='USE')return 'compose';
 return 'repair'
}
function phaseStrip(s){
 const current=phaseAt(s.index),ci=PHASES.indexOf(current);
 return '<div class="micro-framework northstar-framework" aria-label="Lesson flow">'+PHASES.map((p,i)=>'<span class="'+(i<ci?'is-done':i===ci?'is-current':'')+'">'+(i<ci?'✓ ':'')+p+'</span>').join('')+'</div>'
}
function shell(l,s,body){
 const pct=s.complete?100:Math.round(s.index/TOTAL*100),phase=phaseAt(s.index),step=STEPS[Math.max(0,Math.min(TOTAL-1,s.index))]||{},mode=uiModeAt(s.index);
 return '<div class="b2-microflow b2-northstar-flow" data-ui-mode="'+mode+'" data-phase="'+String(phase).toLowerCase()+'" data-skill="'+String(step.skill||'').toLowerCase()+'" data-step="'+(Number(s.index)+1)+'">'+
  '<div class="micro-top"><button class="ghost-btn" id="northstarBack" type="button">← Lessons</button>'+
  '<div class="micro-title"><small>B2 · Lesson '+Number(l.number)+'</small><strong>'+esc(l.title)+'</strong></div>'+
  '<span class="micro-preview">'+(preview()?'Preview':'Workbook')+'</span></div>'+
  phaseStrip(s)+
  '<div class="micro-progress-meta"><span>'+esc(phase)+'</span><span>Step '+(Number(s.index)+1)+' of '+TOTAL+'</span></div>'+
  '<div class="micro-progress" role="progressbar" aria-label="Lesson progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'"><span style="width:'+pct+'%"></span></div>'+
  '<main class="micro-stage">'+body+'</main></div>'
}
function bindBack(){const b=el('northstarBack');if(b)b.onclick=leave}
function prompt(title,sub){
 return '<div class="micro-prompt"><h1>'+esc(title)+'</h1>'+(sub?'<p>'+esc(sub)+'</p>':'')+'</div>'
}
function choices(options){
 return '<div class="micro-choices">'+options.map((x,i)=>'<button class="micro-choice" data-choice="'+i+'" type="button"><span>'+String.fromCharCode(65+i)+'</span><strong>'+esc(x)+'</strong></button>').join('')+'</div>'
}
function feedback(ok,title,text,buttonText){
 return '<div class="micro-feedback '+(ok?'is-good':'is-hint')+'"><strong>'+esc(title)+'</strong>'+(text?'<p>'+esc(text)+'</p>':'')+'<button class="'+(ok?'primary-btn':'ghost-btn')+'" id="northstarContinue" type="button">'+esc(buttonText||'Next')+'</button></div>'
}
function action(label,id,disabled){return '<div class="micro-action"><button class="primary-btn" id="'+id+'" type="button"'+(disabled?' disabled':'')+'>'+esc(label)+'</button></div>'}
function textarea(id,placeholder,rows){return '<textarea id="'+id+'" rows="'+(rows||3)+'" placeholder="'+esc(placeholder||'Type your answer…')+'"></textarea>'}
function helpBox(text,label){
 if(!text)return '';
 return '<details class="northstar-help"><summary>'+esc(label||'Need help?')+'</summary><div>'+esc(text)+'</div></details>'
}
function readingHtml(text){
 const parts=String(text||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
 return '<article class="northstar-reading"><span>Read</span>'+parts.map(x=>'<p>'+esc(x)+'</p>').join('')+'</article>'
}
function taggedQuestions(l,prefix){
 return (l.listening?.questions||[]).filter(q=>String(q.tag||'').startsWith(prefix)).slice(0,MIN_COMPREHENSION_QUESTIONS)
}
function firstTaggedQuestion(l,prefix){return taggedQuestions(l,prefix)[0]||null}
function firstChoiceVocab(l){
 return (l.vocabulary?.items||[]).find(x=>Array.isArray(x.options)&&x.options.length>=3&&x.answer!==undefined)||null
}
function grammarItem(l){return (l.grammar?.items||[]).find(x=>Array.isArray(x.options)&&x.options.length>=3&&x.answer!==undefined)||null}
function choiceIndex(q){return Math.max(0,(q.options||[]).findIndex(x=>String(x)===String(q.answer)))}
function arrangeChoices(options,correctIndex,seed){
 const list=Array.isArray(options)?options.slice():[],n=list.length;
 if(n<2)return{options:list,answer:Math.max(0,Math.min(Number(correctIndex)||0,n-1))};
 const original=Math.max(0,Math.min(Number(correctIndex)||0,n-1)),desired=Math.abs(Number(seed)||0)%n,correct=list[original],others=list.filter((_,i)=>i!==original),out=new Array(n);
 out[desired]=correct;let oi=0;
 for(let i=0;i<n;i++)if(i!==desired)out[i]=others[oi++];
 return{options:out,answer:desired}
}
function weakKey(lessonId){return 'englishgate:northstar:weak:'+sid()+':'+lessonId}
function markWeak(lessonId){
 try{localStorage.setItem(weakKey(lessonId),new Date().toISOString())}catch{}
}
function rememberOffsetForNumber(n){
 const lessonNumber=Number(n)||0;
 const available=REMEMBER_OFFSETS.filter(offset=>lessonNumber-offset>=1);
 if(!available.length)return null;
 const desired=REMEMBER_OFFSETS[(Math.max(2,lessonNumber)-2)%REMEMBER_OFFSETS.length];
 return available.includes(desired)?desired:available[0]
}
function rememberCandidate(l){
 const n=Number(l.number)||0;
 const candidates=REMEMBER_OFFSETS.filter(offset=>n-offset>=1).map(offset=>{
  const from=n-offset;
  const prior=typeof lessonById==='function'?lessonById('su-b2-l'+from):null;
  const q=prior?grammarItem(prior):null;
  return q?{offset,from,q,weak:(()=>{try{return Boolean(localStorage.getItem(weakKey(prior.id)))}catch{return false}})()}:null
 }).filter(Boolean);
 if(!candidates.length){
  const r=l.northstar?.retrieval;
  return r?{offset:1,from:Number(r.from)||Math.max(1,n-1),q:{q:r.prompt,options:r.options,answer:r.answer},weak:false}:null
 }
 const weak=candidates.find(x=>x.weak);
 if(weak)return weak;
 const planned=rememberOffsetForNumber(n);
 return candidates.find(x=>x.offset===planned)||candidates[0]
}

function renderChoice(l,s,opts){
 const arranged=arrangeChoices(opts.options||[],opts.answer,(Number(l.number)||0)+Number(s.index||0));
 const body=(opts.before||'')+prompt(opts.q,opts.sub)+choices(arranged.options)+'<div id="northstarFeedback"></div>';
 el('content').innerHTML=shell(l,s,body);bindBack();
 Array.from(document.querySelectorAll('[data-choice]')).forEach(btn=>{
  btn.onclick=()=>{
   if(el('northstarContinue'))return;
   const ix=Number(btn.dataset.choice),value=arranged.options[ix],ok=ix===arranged.answer;
   setR(l,s,s.index,value);setOK(l,s,s.index,ok);hit(l,s,s.index);
   if(!ok&&opts.memoryId)markWeak(opts.memoryId);
   Array.from(document.querySelectorAll('[data-choice]')).forEach(b=>{b.disabled=true;b.classList.toggle('is-selected',b===btn)});
   el('northstarFeedback').innerHTML=feedback(ok,ok?'Correct.':'Try again.',ok?(opts.good||'That meaning fits the context.'):(opts.bad||'Look at the context and try once more.'),ok?'Next':'Try again');
   el('northstarContinue').onclick=()=>ok?next(l,s):render(l,s)
  }
 })
}
function renderChoiceSet(l,s,opts){
 const items=(opts.questions||[]).slice(0,MIN_COMPREHENSION_QUESTIONS);
 if(!items.length)return renderOpen(l,s,{before:opts.before||'',q:opts.emptyQuestion||'What is the main idea?',minWords:4});
 const key=String(opts.key||phaseAt(s.index));
 s.subprogress=s.subprogress||{};s.subresponses=s.subresponses||{};
 const pos=Math.max(0,Math.min(Number(s.subprogress[key]||0),items.length-1));
 const q=items[pos],arranged=arrangeChoices(q.options||[],choiceIndex(q),(Number(l.number)||0)+Number(s.index||0)+pos),before=(pos===0?String(opts.intro||''):'')+(typeof opts.before==='function'?opts.before(pos):String(opts.before||''));
 const body=before+'<div class="micro-question-count">Question '+(pos+1)+' of '+items.length+'</div>'+prompt(q.q,opts.sub)+choices(arranged.options)+'<div id="northstarFeedback"></div>';
 el('content').innerHTML=shell(l,s,body);bindBack();
 if(typeof opts.afterRender==='function')opts.afterRender();
 Array.from(document.querySelectorAll('[data-choice]')).forEach(btn=>{
  btn.onclick=()=>{
   if(el('northstarContinue'))return;
   const ix=Number(btn.dataset.choice),value=arranged.options[ix],ok=ix===arranged.answer;
   s.subresponses[key+':'+pos]=value;setOK(l,s,s.index,ok);hit(l,s,s.index);write(l,s);
   Array.from(document.querySelectorAll('[data-choice]')).forEach(b=>{b.disabled=true;b.classList.toggle('is-selected',b===btn)});
   const last=pos===items.length-1;
   el('northstarFeedback').innerHTML=feedback(ok,ok?'Correct.':'Try again.',ok?(opts.good||'You understood this part.'):(opts.bad||'Use the source and try again.'),ok?(last?'Next':'Next question'):'Try again');
   el('northstarContinue').onclick=()=>{
    if(!ok)return renderChoiceSet(l,s,opts);
    if(last){
     setR(l,s,s.index,items.map((_,i)=>String(s.subresponses[key+':'+i]||'')).join(' | '));
     setOK(l,s,s.index,true);delete s.subprogress[key];write(l,s);return next(l,s)
    }
    s.subprogress[key]=pos+1;write(l,s);renderChoiceSet(l,s,opts)
   }
  }
 })
}

function renderOpen(l,s,opts){
 const prior=String(getR(s,s.index)||'');
 const body=(opts.before||'')+prompt(opts.q,opts.sub)+
  (opts.model?'<div class="northstar-model"><small>Model</small><strong>'+esc(opts.model)+'</strong></div>':'')+
  helpBox(opts.help)+
  '<div class="micro-input">'+textarea('northstarInput',opts.placeholder||'Type your response…',opts.rows||3)+'</div>'+
  action(opts.button||'Continue','northstarCheck',true)+'<div id="northstarFeedback"></div>';
 el('content').innerHTML=shell(l,s,body);bindBack();
 const box=el('northstarInput'),check=el('northstarCheck');box.value=prior;
 const min=Number(opts.minWords||4);
 const valid=()=>words(box.value)>=min;
 const sync=()=>check.disabled=!valid();box.oninput=sync;sync();
 check.onclick=()=>{
  if(!valid())return;
  const value=box.value.trim();setR(l,s,s.index,value);setOK(l,s,s.index,true);hit(l,s,s.index);
  box.disabled=true;check.disabled=true;
  el('northstarFeedback').innerHTML=feedback(true,opts.feedbackTitle||'Good.','You used the language for your own meaning.','Next');
  el('northstarContinue').onclick=()=>next(l,s)
 }
}
function renderSee(l,s){
 const qs=taggedQuestions(l,'reading:');
 return renderChoiceSet(l,s,{
  key:'reading',
  questions:qs,
  intro:prompt(l.northstar.mission,'Read first. The lesson will help you do this in English.'),
  before:()=>readingHtml(l.listening?.readingText||''),
  sub:'Use the reading as your source.',
  good:'You understood the key idea from the reading.',
  bad:'Check the reading and try again.',
  emptyQuestion:'What is the main idea?'
 })
}
function renderRetrieval(l,s){
 const item=rememberCandidate(l);
 if(!item)return renderGrammar(l,s);
 const q=item.q;
 return renderChoice(l,s,{
  q:q.q,
  sub:'Choose the response that sounds natural.',
  options:q.options,
  answer:choiceIndex(q),
  good:'That earlier language is still useful here.',
  bad:'Choose the form that sounds natural and communicates the meaning clearly.',
  memoryId:'su-b2-l'+item.from
 })
}
function renderGrammar(l,s){
 const q=grammarItem(l);
 return renderChoice(l,s,{q:q.q,sub:l.grammar?.rule||'',options:q.options,answer:choiceIndex(q),good:'This form matches the meaning.',bad:'Use the short rule above, then try again.',memoryId:l.id})
}
function renderVocab(l,s){
 const q=firstChoiceVocab(l);
 return renderChoice(l,s,{q:q.q,sub:'Choose the meaning or use that fits this context.',options:q.options,answer:choiceIndex(q),good:'Right. Keep this word available for later use.',bad:'Use the sentence context rather than guessing from the word alone.'})
}
function renderListening(l,s){
 const qs=taggedQuestions(l,'listening:'),script=String(l.listening?.audioScript||'').trim();
 const player=typeof liveAudioPlayerHtml==='function'?liveAudioPlayerHtml(script,[]):'<div class="feedback bad">Listening audio is unavailable.</div>';
 return renderChoiceSet(l,s,{
  key:'listening',
  questions:qs,
  intro:prompt('Listen first.','Listen for meaning. Replay if needed; open the transcript only after listening.'),
  before:()=>player,
  sub:'Choose the answer supported by what you hear.',
  good:'You caught the key information from the audio.',
  bad:'Replay and listen for the information the question asks for.',
  afterRender:()=>{if(typeof wireLiveAudioPlayers==='function')wireLiveAudioPlayers(document)},
  emptyQuestion:'What is the main idea?'
 })
}
function renderChange(l,s,which){
 const x=l.northstar.change[which];
 const support=String(l.northstar.support||'');
 let model=x.model,help='',placeholder='Type your sentence…',before='';
 if(support==='high'){
  help=x.starter;placeholder=x.starter||placeholder
 }else if(support==='medium-high'){
  help=which===0?x.starter:'';placeholder=x.starter||placeholder
 }else if(support==='medium'){
  placeholder='Make the pattern true for you…'
 }else if(support==='low'){
  model='';before=helpBox('Model: '+x.model,'Need to see the model?');placeholder='Use the pattern independently…'
 }
 return renderOpen(l,s,{before,q:x.prompt,sub:support==='low'?'Use the lesson language independently.':'Keep the useful pattern, but make the meaning yours.',model,help,placeholder,minWords:5,feedbackTitle:'Good change.'})
}
function renderUse(l,s){
 const x=l.northstar.use||{},support=String(l.northstar.support||'');
 const help=(support==='high'||support==='medium-high')?x.help:'';
 return renderOpen(l,s,{q:x.prompt,sub:'Keep it short and useful.',help,placeholder:'Type what you would say…',minWords:Number(l.number)>=12?8:6,rows:3,button:'Use my English',feedbackTitle:'That communicates.'})
}
function finalResponse(s){return String(getR(s,9)||getR(s,8)||'').trim()}
function renderFinal(l,s){
 const x=l.northstar.final||l.writing||{},prior=String(getR(s,8)||'');
 const min=Number(x.minWords||l.writing?.minWords||50),max=Number(x.maxWords||l.writing?.maxWords||100);
 const body=prompt('Do it for real.',x.task||l.writing?.task||'Complete the final task.')+
  (String(l.northstar.support)==='high'?helpBox(l.northstar.use?.help,'Need a starter?'):'')+
  '<div class="micro-input">'+textarea('northstarInput','Write your response…',6)+'</div>'+
  '<div class="micro-counter" id="northstarCounter">0 / '+min+'–'+max+' words</div>'+
  '<label class="micro-share"><input id="northstarShare" type="checkbox"> Share this later in My Writings</label>'+
  action('Check my response','northstarCheck',true)+'<div id="northstarFeedback"></div>';
 el('content').innerHTML=shell(l,s,body);bindBack();
 const box=el('northstarInput'),check=el('northstarCheck'),counter=el('northstarCounter'),share=el('northstarShare');
 box.value=prior;share.checked=Boolean(s.share);
 const sync=()=>{const n=words(box.value);counter.textContent=n+' / '+min+'–'+max+' words';check.disabled=!(n>=min&&n<=max)};
 box.oninput=sync;share.onchange=()=>{s.share=share.checked;write(l,s)};sync();
 check.onclick=()=>{
  const value=box.value.trim();const n=words(value);if(n<min||n>max)return;
  setR(l,s,8,value);setOK(l,s,8,true);hit(l,s,8);box.disabled=true;check.disabled=true;share.disabled=true;
  el('northstarFeedback').innerHTML=feedback(true,'Response complete.',x.noAutomatedCorrection?'Your final response will be reviewed by a person. Do a short self-check next.':'Jev will check whether anything actually needs improving. If it is already correct, you will keep it as it is.','Fix one thing');
  el('northstarContinue').onclick=()=>next(l,s)
 }
}
async function requestRepair(l,s){
 const x=l.northstar;
 if(x.final?.noAutomatedCorrection)return {focus:'self_check',title:'Do one final self-check.',prompt:x.fix.target};
 try{
  const res=await fetch('/api/workbook-activities/grade-use',{
   method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({
    lessonId:l.id,lessonTitle:l.title,level:'B2',mission:x.mission,
    finalTask:x.final.task,targetLanguage:x.fix.target,model:x.fix.model,
    targetVocabulary:l.targetVocabulary||[],response:String(getR(s,8)||'')
   })
  });
  if(!res.ok)throw new Error('Jev repair unavailable');
  const data=await res.json();return data.repair
 }catch{
  return {focus:'unavailable',title:'Automated feedback unavailable.',prompt:'Your response is saved. Finish without an invented correction.',needsCorrection:false}
 }
}
async function renderFix(l,s){
 if(!s.repair){s.repair=await requestRepair(l,s);write(l,s)}
 const repair=s.repair||{},original=String(getR(s,8)||'');
 if(repair.focus==='none'||repair.needsCorrection===false){
  const body=prompt(repair.title||'No correction needed.',repair.prompt||'Your response already meets the lesson target.')+
   '<div class="northstar-model"><small>Your response</small><div class="northstar-final-preview">'+esc(original)+'</div></div>'+
   action('Finish lesson','northstarNoFix',false);
  el('content').innerHTML=shell(l,s,body);bindBack();
  el('northstarNoFix').onclick=()=>{setR(l,s,9,original);setOK(l,s,9,true);finish(l,s)};
  return
 }
 if(l.northstar.final?.noAutomatedCorrection){
  const body=prompt(repair.title||'Do one final self-check.',repair.prompt||l.northstar.fix.target)+
   '<div class="northstar-model"><small>Your response</small><div class="northstar-final-preview">'+esc(original)+'</div></div>'+
   action('I checked it — submit','northstarSelfCheck',false);
  el('content').innerHTML=shell(l,s,body);bindBack();
  el('northstarSelfCheck').onclick=()=>{setR(l,s,9,original);setOK(l,s,9,true);finish(l,s)};
  return
 }
 const x=l.northstar.final||{},min=Number(x.minWords||50),max=Number(x.maxWords||120);
 const prior=String(getR(s,9)||original);
 const body=prompt(repair.title||'Fix one thing.',repair.prompt||l.northstar.fix.target)+
  '<div class="northstar-model"><small>Useful model</small><strong>'+esc(l.northstar.fix.model||'')+'</strong></div>'+
  '<div class="micro-input">'+textarea('northstarInput','Edit only what needs improving…',6)+'</div>'+
  '<div class="micro-counter" id="northstarCounter">0 / '+min+'–'+max+' words</div>'+
  action('Save my fix','northstarCheck',true);
 el('content').innerHTML=shell(l,s,body);bindBack();
 const box=el('northstarInput'),check=el('northstarCheck'),counter=el('northstarCounter');box.value=prior;
 const sync=()=>{const n=words(box.value);counter.textContent=n+' / '+min+'–'+max+' words';check.disabled=!(n>=min&&n<=max&&box.value.trim()!==original.trim())};
 box.oninput=sync;sync();
 check.onclick=()=>{
  if(check.disabled)return;
  setR(l,s,9,box.value.trim());setOK(l,s,9,true);hit(l,s,9);finish(l,s)
 }
}
function render(l,s){
 if(s.complete){renderDone(l,s);return}
 const i=s.index;
 if(i===0)return renderSee(l,s);
 if(i===1)return renderRetrieval(l,s);
 if(i===2)return renderGrammar(l,s);
 if(i===3)return renderVocab(l,s);
 if(i===4)return renderListening(l,s);
 if(i===5)return renderChange(l,s,0);
 if(i===6)return renderChange(l,s,1);
 if(i===7)return renderUse(l,s);
 if(i===8)return renderFinal(l,s);
 if(i===9)return renderFix(l,s)
}
function next(l,s){s.index=Math.min(TOTAL-1,s.index+1);write(l,s);render(l,s);if(typeof resetAppScroll==='function')resetAppScroll()}
function scoreFor(s,skill){
 const indexes=STEPS.map((x,i)=>x.skill===skill?i:-1).filter(i=>i>=0);
 if(!indexes.length)return 100;
 const hitCount=indexes.reduce((n,i)=>n+(s.results[String(i)]?1:0),0);
 return Math.round(hitCount/indexes.length*100)
}
async function saveEvidence(l,s){
 if(preview()||s.saved||typeof session==='undefined'||!session||session.role!=='student')return;
 const human=Boolean(l.northstar?.final?.humanGraded);
 for(const skill of ['vocabulary','listening','grammar']){
  if(typeof recordAttempt==='function')await recordAttempt(session.id,l.id,skill,scoreFor(s,skill),['northstar:v1','framework:see-choose-change-use-fix','support:'+String(l.northstar.support||'')]);
  if(typeof markDone==='function')await markDone(session.id,l.id,skill)
 }
 const response=finalResponse(s);
 if(response&&typeof api==='function')await api('/api/writing/'+encodeURIComponent(l.id),{method:'PUT',body:JSON.stringify({content:response,publishToCommunity:Boolean(s.share)})});
 if(!human&&typeof recordAttempt==='function')await recordAttempt(session.id,l.id,'writing',scoreFor(s,'writing'),['northstar:v1','independent-use','jev-fix:'+String(s.repair?.focus||'none')]);
 if(typeof refreshState==='function')await refreshState();
 s.saved=true;write(l,s)
}
async function finish(l,s){
 s.complete=true;write(l,s);renderDone(l,s);
 try{await saveEvidence(l,s);renderDone(l,s)}catch(e){const slot=el('northstarSaveStatus');if(slot)slot.textContent='Lesson complete on this device. Progress sync needs another try: '+String(e?.message||e)}
}
function renderDone(l,s){
 const body='<div class="micro-complete"><div class="micro-complete-mark">✓</div><small>Lesson complete</small>'+
  '<h1>'+esc(l.northstar.mission)+'</h1>'+
  '<p>You saw useful English, chose meaning, changed the pattern, used it independently, and improved one important part.</p>'+
  '<div class="micro-summary"><div><strong>'+TOTAL+'</strong><span>short actions</span></div><div><strong>'+scoreFor(s,'listening')+'%</strong><span>listening evidence</span></div><div><strong>1</strong><span>real final task</span></div></div>'+
  '<p class="micro-save-status" id="northstarSaveStatus">'+(preview()?'Preview only — nothing was saved.':s.saved?'Progress saved.':'Saving progress…')+'</p>'+
  '<div class="micro-finish-actions"><button class="primary-btn" id="northstarExit" type="button">Back to lessons</button><button class="ghost-btn" id="northstarRestart" type="button">Practise again</button></div></div>';
 el('content').innerHTML=shell(l,s,body);bindBack();
 el('northstarExit').onclick=leave;
 el('northstarRestart').onclick=()=>{const ns=fresh(l);write(l,ns);render(l,ns)}
}
function leave(){
 document.body.classList.remove('b2-premium-workbook-mode');
 if(typeof setWorkbookDesignMode==='function')setWorkbookDesignMode(false);
 if(preview()){if(typeof returnToWorkbookLessons==='function')returnToWorkbookLessons();return}
 if(typeof currentPage!=='undefined')currentPage='course';
 if(typeof renderNav==='function')renderNav();
 if(typeof studentCourse==='function')studentCourse()
}
function northstarWorkbook(l){
 document.body.classList.add('b2-premium-workbook-mode');
 if(typeof setWorkbookDesignMode==='function')setWorkbookDesignMode(true);
 if(typeof title==='function')title('Workbook','Lesson '+l.number);
 const s=read(l);render(l,s);
 if(s.complete&&!s.saved&&!preview()&&typeof session!=='undefined'&&session&&session.role==='student'){
  saveEvidence(l,s).then(()=>renderDone(l,s)).catch(e=>{const slot=el('northstarSaveStatus');if(slot)slot.textContent='Lesson complete on this device. Progress sync needs another try: '+String(e?.message||e)})
 }
 if(typeof resetAppScroll==='function')resetAppScroll()
}

const previousWorkbook=typeof workbook==='function'?workbook:null;
if(previousWorkbook){
 workbook=function englishGateB2NorthstarWorkbook(){
  const l=typeof lesson==='function'?lesson():null;
  if(l&&Number(l.number)>=2&&l.northstar?.framework==='SEE_CHOOSE_CHANGE_USE_FIX')return northstarWorkbook(l);
  return previousWorkbook()
 }
}

window.ENGLISHGATE_B2_NORTHSTAR={version:FLOW_VERSION,total:TOTAL,phases:PHASES.slice(),rememberOffsets:REMEMBER_OFFSETS.slice(),rememberOffsetForNumber,uiDecisionContract:'jev-ui-v1',uiModes:['source','decision','compose','repair']};
})();