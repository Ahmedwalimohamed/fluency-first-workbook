/* EnglishGate A1 Gold — B2 Northstar parity engine v1
   Same learning architecture and visual contract as B2:
   SEE → CHOOSE → CHANGE → USE → FIX.
   A1 changes language load, not product quality. */
(function(){
'use strict';

const BOOK_ID='speakup-a1-gold';
const FLOW_VERSION='a1-b2-northstar-parity-v1';
const PHASES=['SEE','CHOOSE','CHANGE','USE','FIX'];
const REMEMBER_OFFSETS=[1,3,7];
const TOTAL=10;
const MIN_COMPREHENSION_QUESTIONS=3;
const STEPS=[
 {phase:'SEE',skill:'reading'},
 {phase:'CHOOSE',skill:'retrieval'},
 {phase:'CHOOSE',skill:'grammar'},
 {phase:'CHOOSE',skill:'vocabulary'},
 {phase:'CHOOSE',skill:'listening'},
 {phase:'CHANGE',skill:'language'},
 {phase:'CHANGE',skill:'mediation'},
 {phase:'USE',skill:'speaking'},
 {phase:'USE',skill:'writing'},
 {phase:'FIX',skill:'writing'}
];
let activeLesson=null,activeState=null,reviewingComplete=false;

function book(){return window.A1_GOLD_V1_BOOK||((typeof BOOK_PACKS!=='undefined')?BOOK_PACKS[BOOK_ID]:null)}
function esc(v){
 if(typeof escapeHtml==='function')return escapeHtml(String(v==null?'':v));
 return String(v==null?'':v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))
}
function words(v){const s=String(v||'').trim();return s?s.split(/\s+/).filter(Boolean).length:0}
function preview(){return typeof isWorkbookPreview==='function'&&isWorkbookPreview()}
function sid(){return typeof session!=='undefined'&&session&&session.id?session.id:'preview'}
function key(l){return 'englishgate:'+FLOW_VERSION+':'+sid()+':'+l.id}
function fresh(l){return{version:FLOW_VERSION,lessonId:l.id,index:0,responses:{},results:{},attempts:{},subprogress:{},subresponses:{},speaking:null,grade:null,complete:false,saved:false,share:false,updatedAt:new Date().toISOString()}}
function read(l){
 try{const x=JSON.parse(localStorage.getItem(key(l))||'null');return x&&x.version===FLOW_VERSION&&x.lessonId===l.id?Object.assign(fresh(l),x):fresh(l)}
 catch{return fresh(l)}
}
function write(l,s){s.updatedAt=new Date().toISOString();try{localStorage.setItem(key(l),JSON.stringify(s))}catch{}}
function setR(l,s,i,v){s.responses[String(i)]=v;write(l,s)}
function getR(s,i){return s.responses[String(i)]}
function setOK(l,s,i,v){s.results[String(i)]=Boolean(v);write(l,s)}
function hit(l,s,i){const k=String(i);s.attempts[k]=Number(s.attempts[k]||0)+1;write(l,s)}
function supportFor(n){n=Number(n)||1;if(n<=5)return'high';if(n<=11)return'medium-high';if(n<=17)return'medium';return'low'}
function readingQuestions(l){return (l.listening?.questions||[]).filter(q=>String(q.tag||'').startsWith('reading:')).slice(0,4)}
function listeningQuestions(l){return (l.listening?.questions||[]).filter(q=>String(q.tag||'').startsWith('listening:')).slice(0,4)}
function choiceIndex(q){return Math.max(0,(q.options||[]).findIndex(x=>String(x)===String(q.answer)))}
function grammarItem(l,offset=0){
 const items=(l.grammar?.items||[]).filter(x=>Array.isArray(x.options)&&x.options.length>=3&&x.answer!==undefined);
 return items.length?items[Math.abs(offset)%items.length]:null
}
function vocabItem(l,offset=0){
 const items=(l.vocabulary?.items||[]).filter(x=>Array.isArray(x.options)&&x.options.length>=3&&x.answer!==undefined);
 return items.length?items[Math.abs(offset)%items.length]:null
}
function priorLesson(l){
 const b=book(),n=Number(l.number)||1;if(!b||n<=1)return null;
 const available=REMEMBER_OFFSETS.filter(o=>n-o>=1);
 const offset=available[(Math.max(2,n)-2)%Math.max(1,available.length)]||1;
 return b.lessons.find(x=>Number(x.number)===n-offset)||b.lessons.find(x=>Number(x.number)===n-1)||null
}
function statementModel(l){
 const list=(l.targetLanguage||[]).filter(x=>!String(x).trim().endsWith('?'));
 return String(list[0]||l.chunks?.[0]||'').trim()
}
function questionModel(l){return String((l.interactionExpressions||[])[0]||(l.targetLanguage||[]).find(x=>String(x).trim().endsWith('?'))||'').trim()}
function contract(l){
 const prior=priorLesson(l),pq=prior?grammarItem(prior,Number(l.number)):null;
 return{
  framework:'SEE_CHOOSE_CHANGE_USE_FIX',
  level:'A1',
  mission:l.communicationGoal||l.outcome,
  canDo:l.outcome,
  scenario:l.realWorldSituation,
  support:supportFor(l.number),
  foundation:l.foundation,
  retrieval:prior&&pq?{from:prior.number,title:prior.title,q:pq}:null,
  languageBank:{
   vocabulary:(l.targetVocabulary||[]).slice(0,8),
   chunks:(l.chunks||[]).slice(0,6),
   interaction:(l.interactionExpressions||[]).slice(0,5),
   functions:(l.functions||[]).slice(0,6)
  },
  change:[
   {prompt:'Make this language true for you or your situation.',model:statementModel(l),starter:statementModel(l)},
   {prompt:'Pass on one useful detail, then add or ask one useful question.',model:questionModel(l),starter:questionModel(l)}
  ],
  use:{prompt:l.performance,help:[...(l.chunks||[]).slice(0,3),...(l.interactionExpressions||[]).slice(0,2)].join(' · ')},
  final:{...(l.writing||{})},
  fix:{models:(l.fixAndImprove||[]).map(x=>({focus:x.focus,model:x.model})).slice(0,3)},
  pronunciation:l.pronunciation,
  mediation:l.mediation
 }
}
function installContracts(){
 const b=book();if(!b||!Array.isArray(b.lessons))return false;
 b.lessons.forEach(l=>{l.northstarA1=contract(l)});
 b.northstarParity={version:FLOW_VERSION,reference:'B2 Northstar',framework:'SEE_CHOOSE_CHANGE_USE_FIX',qualityParity:true,cefrLoad:'A1'};
 return true
}

function phaseAt(i){return STEPS[Math.max(0,Math.min(TOTAL-1,i))].phase}
function uiModeAt(i){
 const step=STEPS[Math.max(0,Math.min(TOTAL-1,i))]||{};
 if(step.phase==='SEE'||step.skill==='listening')return'source';
 if(step.phase==='CHOOSE')return'decision';
 if(step.phase==='CHANGE'||step.phase==='USE')return'compose';
 return'repair'
}
function phaseStrip(s){
 const current=phaseAt(s.index),ci=PHASES.indexOf(current);
 return '<div class="micro-framework northstar-framework" aria-label="Lesson flow">'+PHASES.map((p,i)=>'<span class="'+(i<ci?'is-done':i===ci?'is-current':'')+'">'+(i<ci?'✓ ':'')+p+'</span>').join('')+'</div>'
}
function shell(l,s,body){
 const pct=s.complete?100:Math.round(s.index/TOTAL*100),phase=phaseAt(s.index),step=STEPS[Math.max(0,Math.min(TOTAL-1,s.index))]||{},mode=uiModeAt(s.index);
 return '<div class="b2-microflow b2-northstar-flow a1-northstar-flow" data-ui-mode="'+mode+'" data-phase="'+String(phase).toLowerCase()+'" data-skill="'+String(step.skill||'').toLowerCase()+'" data-step="'+(Number(s.index)+1)+'">'+
  '<div class="micro-top"><button class="ghost-btn" id="a1NorthstarBack" type="button">← Lessons</button>'+
  '<div class="micro-title"><small>A1 · Lesson '+Number(l.number)+'</small><strong>'+esc(l.title)+'</strong></div>'+
  '<span class="micro-preview">'+(preview()?'Preview':'Workbook')+'</span></div>'+
  phaseStrip(s)+
  '<div class="micro-history-nav"><button class="ghost-btn" id="a1NorthstarPrevious" type="button"'+((s.index<=0||(s.complete&&!reviewingComplete))?' hidden':'')+'>← Previous activity</button></div>'+
  '<div class="micro-progress-meta"><span>'+esc(phase)+'</span><span>Step '+(Number(s.index)+1)+' of '+TOTAL+'</span></div>'+
  '<div class="micro-progress" role="progressbar" aria-label="Lesson progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'"><span style="width:'+pct+'%"></span></div>'+
  '<main class="micro-stage">'+body+'</main></div>'
}
function prompt(titleText,sub){
 return '<div class="micro-prompt"><h1>'+esc(titleText)+'</h1>'+(sub?'<p>'+esc(sub)+'</p>':'')+'</div>'
}
function choices(options){return '<div class="micro-choices">'+options.map((x,i)=>'<button class="micro-choice" data-a1-choice="'+i+'" type="button"><span>'+String.fromCharCode(65+i)+'</span><strong>'+esc(x)+'</strong></button>').join('')+'</div>'}
function feedback(ok,titleText,text,buttonText){
 return '<div class="micro-feedback '+(ok?'is-good':'is-hint')+'"><strong>'+esc(titleText)+'</strong>'+(text?'<p>'+esc(text)+'</p>':'')+'<button class="'+(ok?'primary-btn':'ghost-btn')+'" id="a1NorthstarContinue" type="button">'+esc(buttonText||'Next')+'</button></div>'
}
function action(label,id,disabled){return '<div class="micro-action"><button class="primary-btn" id="'+id+'" type="button"'+(disabled?' disabled':'')+'>'+esc(label)+'</button></div>'}
function textarea(id,placeholder,rows){return '<textarea id="'+id+'" rows="'+(rows||3)+'" placeholder="'+esc(placeholder||'Type your answer…')+'"></textarea>'}
function helpBox(text,label){
 if(!text)return'';
 return '<details class="northstar-help"><summary>'+esc(label||'Need help?')+'</summary><div>'+esc(text)+'</div></details>'
}
function readingHtml(l){
 const text=String(l.listening?.readingText||'');
 const parts=text.split(/\n+/).map(x=>x.trim()).filter(Boolean);
 return '<article class="northstar-reading"><span>READ</span>'+parts.map(x=>'<p>'+esc(x)+'</p>').join('')+'</article>'
}
function missionCard(l){
 const n=l.northstarA1||contract(l);
 return '<section class="a1-parity-mission"><small>REAL-WORLD GOAL</small><strong>'+esc(n.canDo)+'</strong><p>'+esc(n.scenario)+'</p></section>'
}
function languageBank(l){
 const n=l.northstarA1||contract(l),chunks=n.languageBank.chunks,questions=n.languageBank.interaction;
 return '<div class="a1-parity-bank"><small>USEFUL LANGUAGE</small>'+
  (chunks.length?'<div><strong>Chunks</strong><span>'+chunks.map(esc).join(' · ')+'</span></div>':'')+
  (questions.length?'<div><strong>Interaction</strong><span>'+questions.map(esc).join(' · ')+'</span></div>':'')+'</div>'
}
function arrangeChoices(options,correctIndex,seed){
 const list=Array.isArray(options)?options.slice():[],n=list.length;
 if(n<2)return{options:list,answer:Math.max(0,Math.min(Number(correctIndex)||0,n-1))};
 const original=Math.max(0,Math.min(Number(correctIndex)||0,n-1)),desired=Math.abs(Number(seed)||0)%n,correct=list[original],others=list.filter((_,i)=>i!==original),out=new Array(n);
 out[desired]=correct;let oi=0;for(let i=0;i<n;i++)if(i!==desired)out[i]=others[oi++];
 return{options:out,answer:desired}
}
function bindNav(){
 const b=document.getElementById('a1NorthstarBack');if(b)b.onclick=leave;
 const p=document.getElementById('a1NorthstarPrevious');
 if(p&&activeLesson&&activeState){p.hidden=activeState.index<=0||(activeState.complete&&!reviewingComplete);p.onclick=()=>previous(activeLesson,activeState)}
}
function renderChoice(l,s,opts){
 const arranged=arrangeChoices(opts.options||[],opts.answer,(Number(l.number)||0)*13+Number(s.index||0));
 const body=(opts.before||'')+prompt(opts.q,opts.sub)+choices(arranged.options)+'<div id="a1NorthstarFeedback"></div>';
 document.getElementById('content').innerHTML=shell(l,s,body);bindNav();
 Array.from(document.querySelectorAll('[data-a1-choice]')).forEach(btn=>{
  btn.onclick=()=>{
   if(document.getElementById('a1NorthstarContinue'))return;
   const ix=Number(btn.dataset.a1Choice),value=arranged.options[ix],ok=ix===arranged.answer;
   setR(l,s,s.index,value);setOK(l,s,s.index,ok);hit(l,s,s.index);
   Array.from(document.querySelectorAll('[data-a1-choice]')).forEach(b=>{b.disabled=true;b.classList.toggle('is-selected',b===btn)});
   document.getElementById('a1NorthstarFeedback').innerHTML=feedback(ok,ok?'Correct.':'Try again.',ok?(opts.good||'That works in this situation.'):(opts.bad||'Use the source or model and try again.'),ok?'Next':'Try again');
   document.getElementById('a1NorthstarContinue').onclick=()=>ok?next(l,s):render(l,s)
  }
 })
}
function renderQuestionSet(l,s,opts){
 const items=(opts.items||[]).slice(0,Math.max(MIN_COMPREHENSION_QUESTIONS,Math.min(4,(opts.items||[]).length)));
 if(!items.length)return renderOpen(l,s,{before:opts.before||'',q:opts.emptyQuestion||'What is the main idea?',minWords:3});
 const keyName=String(opts.key||phaseAt(s.index));s.subprogress=s.subprogress||{};s.subresponses=s.subresponses||{};
 const pos=Math.max(0,Math.min(Number(s.subprogress[keyName]||0),items.length-1)),q=items[pos],arranged=arrangeChoices(q.options||[],choiceIndex(q),(Number(l.number)||0)*17+Number(s.index||0)+pos);
 const before=(pos===0?String(opts.intro||''):'')+(typeof opts.before==='function'?opts.before(pos):String(opts.before||''));
 const body=before+'<div class="micro-question-count">Question '+(pos+1)+' of '+items.length+'</div>'+prompt(q.q,opts.sub)+choices(arranged.options)+'<div id="a1NorthstarFeedback"></div>';
 document.getElementById('content').innerHTML=shell(l,s,body);bindNav();
 if(typeof opts.afterRender==='function')opts.afterRender();
 Array.from(document.querySelectorAll('[data-a1-choice]')).forEach(btn=>{
  btn.onclick=()=>{
   if(document.getElementById('a1NorthstarContinue'))return;
   const ix=Number(btn.dataset.a1Choice),value=arranged.options[ix],ok=ix===arranged.answer;
   s.subresponses[keyName+':'+pos]=value;setOK(l,s,s.index,ok);hit(l,s,s.index);write(l,s);
   Array.from(document.querySelectorAll('[data-a1-choice]')).forEach(b=>{b.disabled=true;b.classList.toggle('is-selected',b===btn)});
   const last=pos===items.length-1;
   document.getElementById('a1NorthstarFeedback').innerHTML=feedback(ok,ok?'Correct.':'Try again.',ok?(opts.good||'You understood this part.'):(opts.bad||'Use the source and try again.'),ok?(last?'Next':'Next question'):'Try again');
   document.getElementById('a1NorthstarContinue').onclick=()=>{
    if(!ok)return renderQuestionSet(l,s,opts);
    if(last){setR(l,s,s.index,items.map((_,i)=>String(s.subresponses[keyName+':'+i]||'')).join(' | '));setOK(l,s,s.index,true);delete s.subprogress[keyName];write(l,s);return next(l,s)}
    s.subprogress[keyName]=pos+1;write(l,s);renderQuestionSet(l,s,opts)
   }
  }
 })
}
function renderOpen(l,s,opts){
 const prior=String(getR(s,s.index)||'');
 const body=(opts.before||'')+prompt(opts.q,opts.sub)+(opts.model?'<div class="northstar-model"><small>MODEL</small><strong>'+esc(opts.model)+'</strong></div>':'')+helpBox(opts.help)+
  '<div class="micro-input">'+textarea('a1NorthstarInput',opts.placeholder||'Type what you would say…',opts.rows||3)+'</div>'+
  action(opts.button||'Continue','a1NorthstarCheck',true)+'<div id="a1NorthstarFeedback"></div>';
 document.getElementById('content').innerHTML=shell(l,s,body);bindNav();
 const box=document.getElementById('a1NorthstarInput'),check=document.getElementById('a1NorthstarCheck');box.value=prior;
 const min=Number(opts.minWords||3),valid=()=>words(box.value)>=min,sync=()=>{check.disabled=!valid()};box.oninput=sync;sync();
 check.onclick=()=>{
  if(!valid())return;const value=box.value.trim();setR(l,s,s.index,value);setOK(l,s,s.index,true);hit(l,s,s.index);box.disabled=true;check.disabled=true;
  document.getElementById('a1NorthstarFeedback').innerHTML=feedback(true,opts.feedbackTitle||'Good.','You changed the model without losing the meaning.','Next');
  document.getElementById('a1NorthstarContinue').onclick=()=>next(l,s)
 }
}
function renderSee(l,s){
 return renderQuestionSet(l,s,{
  key:'reading',items:readingQuestions(l),
  intro:missionCard(l)+prompt('Read for meaning.','Use the real-life source. One question appears at a time.'),
  before:()=>readingHtml(l),sub:'Find the answer in the source.',
  good:'That answer is supported by the source.',bad:'Look back at the source and try again.'
 })
}
function renderRetrieval(l,s){
 const n=l.northstarA1||contract(l),r=n.retrieval;
 if(!r){
  const q=grammarItem(l,1);if(!q)return renderGrammar(l,s);
  return renderChoice(l,s,{before:missionCard(l),q:q.q,sub:'First lesson: choose the useful form.',options:q.options,answer:choiceIndex(q),good:'This is useful language for today.'})
 }
 const q=r.q;
 return renderChoice(l,s,{before:'<div class="a1-retrieval-badge">REMEMBER · Lesson '+Number(r.from)+' · '+esc(r.title)+'</div>',q:q.q,sub:'Bring earlier English into today’s situation.',options:q.options,answer:choiceIndex(q),good:'Good retrieval. Earlier language is still available to you.'})
}
function renderGrammar(l,s){
 const q=grammarItem(l,Number(l.number)+1);if(!q)return renderOpen(l,s,{q:'Write one useful sentence for this situation.',minWords:3});
 return renderChoice(l,s,{q:q.q,sub:'Choose the form that communicates the intended meaning.',options:q.options,answer:choiceIndex(q),good:q.feedback||'That form fits the situation.',bad:'Use the meaning and the sentence pattern, then try again.'})
}
function renderVocab(l,s){
 const q=vocabItem(l,Number(l.number)+2);if(!q)return renderOpen(l,s,{q:'Use one lesson word in a useful sentence.',minWords:3});
 return renderChoice(l,s,{q:q.q,sub:'Choose by meaning, not by position.',options:q.options,answer:choiceIndex(q),good:q.feedback||'That word fits the meaning.',bad:'Think about the real-life meaning and try again.'})
}
function renderListening(l,s){
 const qs=listeningQuestions(l),script=String(l.listening?.audioScript||l.listening?.text||''),speakers=l.listening?.speakers||[];
 const player=typeof liveAudioPlayerHtml==='function'?liveAudioPlayerHtml(script,speakers):'<div class="micro-feedback is-hint"><strong>Audio unavailable.</strong><p>Try again on a device with listening audio.</p></div>';
 return renderQuestionSet(l,s,{key:'listening',items:qs,intro:prompt('Listen for meaning.','Replay the audio when you need to.'),before:()=>player,sub:'Choose the answer supported by what you hear.',good:'You caught the important information.',bad:'Replay the audio and listen for the detail in the question.',afterRender:()=>{if(typeof wireLiveAudioPlayers==='function')wireLiveAudioPlayers(document)}})
}
function renderChange(l,s,which){
 const n=l.northstarA1||contract(l),x=n.change[which]||n.change[0],support=n.support;
 let model=x.model,help='',placeholder='Type your sentence…';
 if(support==='high'){help=x.starter;placeholder=x.starter||placeholder}
 else if(support==='medium-high'){help=which===0?x.starter:''}
 else if(support==='low'){model='';help=x.model}
 const before=which===1?'<div class="a1-mediation-note"><small>MEDIATION</small><p>'+esc(n.mediation||'Pass on one important detail clearly.')+'</p></div>':'';
 return renderOpen(l,s,{before,q:x.prompt,sub:which===0?'Keep the useful pattern, but make the meaning yours.':'Connect information and interaction.',model,help,placeholder,minWords:which===0?3:4,feedbackTitle:which===0?'Good change.':'Message passed on.'})
}
function transcriptHtml(turns){
 return '<div class="a1-northstar-speaking-transcript">'+(turns||[]).map(t=>'<div class="micro-turn '+(t.role==='student'?'is-you':'')+'"><span class="micro-avatar">'+(t.role==='student'?'Y':'E')+'</span><div><small>'+(t.role==='student'?'You':'EnglishGate')+'</small><p>'+esc(t.text)+'</p></div></div>').join('')+'</div>'
}
function renderSpeaking(l,s){
 const n=l.northstarA1||contract(l),student=typeof session!=='undefined'&&session&&session.role==='student';
 if(!student||preview()){
  const body=prompt('Use it in a real exchange.',n.use.prompt)+languageBank(l)+
   '<div class="a1-preview-transfer"><small>PREVIEW MISSION</small><p>'+esc(l.performance||n.use.prompt)+'</p><p><strong>Pronunciation:</strong> '+esc(n.pronunciation||'')+'</p></div>'+
   action('Continue preview','a1NorthstarPreviewUse',false);
  document.getElementById('content').innerHTML=shell(l,s,body);bindNav();
  document.getElementById('a1NorthstarPreviewUse').onclick=()=>{setR(l,s,7,'preview');setOK(l,s,7,true);next(l,s)};return
 }
 s.speaking=s.speaking||{sessionId:'',turns:[],ready:false,result:null};
 const sp=s.speaking,result=sp.result;
 const body=prompt('Use it in a real exchange.',n.use.prompt)+languageBank(l)+transcriptHtml(sp.turns)+
  (!sp.sessionId?'<div class="micro-action"><button class="primary-btn" id="a1SpeakStart" type="button">Start conversation</button></div>':
   result?'<div class="micro-feedback '+(result.masteryState==='MASTERED'?'is-good':'is-hint')+'"><strong>'+esc(result.masteryState||'Checked')+'</strong><p>Jev: '+esc(result.jevStatus||'—')+'. '+(result.masteryState==='MASTERED'?'You completed the transfer goal.':'Try the exchange again and repair the communication gap.')+'</p></div>'+
    (result.masteryState==='MASTERED'?action('Continue to writing','a1SpeakContinue',false):'<div class="micro-action"><button class="ghost-btn" id="a1SpeakRestart" type="button">Practise again</button></div>'):
   '<div class="micro-input"><textarea id="a1SpeakInput" rows="3" placeholder="Type what you would say…"></textarea></div><div class="a1-speaking-actions"><button class="primary-btn" id="a1SpeakSend" type="button">Send reply</button><button class="ghost-btn" id="a1SpeakFinish" type="button"'+(sp.ready?'':' disabled')+'>Finish & check</button></div><div id="a1SpeakStatus"></div>');
 document.getElementById('content').innerHTML=shell(l,s,body);bindNav();
 const start=document.getElementById('a1SpeakStart');
 if(start)start.onclick=async()=>{
  start.disabled=true;
  try{const r=await api('/api/a1-gold/speaking/start',{method:'POST',body:JSON.stringify({lessonId:l.id})});sp.sessionId=r.sessionId;sp.turns=[{role:'ai',text:r.message}];write(l,s);renderSpeaking(l,s)}
  catch(e){start.disabled=false;start.insertAdjacentHTML('afterend','<div class="micro-feedback is-hint"><strong>Conversation unavailable.</strong><p>'+esc(e.message)+'</p></div>')}
 };
 const send=document.getElementById('a1SpeakSend'),input=document.getElementById('a1SpeakInput'),finishBtn=document.getElementById('a1SpeakFinish');
 if(send&&input)send.onclick=async()=>{
  const text=input.value.trim();if(!text)return;send.disabled=true;input.disabled=true;sp.turns.push({role:'student',text});write(l,s);
  try{const r=await api('/api/a1-gold/speaking/turn',{method:'POST',body:JSON.stringify({sessionId:sp.sessionId,text})});sp.turns.push({role:'ai',text:r.message});sp.ready=Boolean(r.readyToComplete);write(l,s);renderSpeaking(l,s)}
  catch(e){sp.turns.pop();write(l,s);renderSpeaking(l,s)}
 };
 if(finishBtn)finishBtn.onclick=async()=>{
  if(!sp.ready)return;finishBtn.disabled=true;
  try{const r=await api('/api/a1-gold/speaking/complete',{method:'POST',body:JSON.stringify({sessionId:sp.sessionId})});sp.result=r;setR(l,s,7,r.masteryState||'checked');setOK(l,s,7,r.masteryState==='MASTERED');write(l,s);renderSpeaking(l,s)}
  catch(e){renderSpeaking(l,s)}
 };
 const cont=document.getElementById('a1SpeakContinue');if(cont)cont.onclick=()=>next(l,s);
 const restart=document.getElementById('a1SpeakRestart');if(restart)restart.onclick=()=>{s.speaking={sessionId:'',turns:[],ready:false,result:null};write(l,s);renderSpeaking(l,s)}
}
function renderWriting(l,s){
 const n=l.northstarA1||contract(l),x=n.final||{},prior=String(getR(s,8)||''),min=Number(x.minWords||15),max=Number(x.maxWords||70);
 const body=prompt('Do it for real.',x.task||'Complete the real-world writing task.')+
  (n.support==='high'?helpBox(n.languageBank.chunks.slice(0,3).join(' · '),'Need a starter?'):'')+
  '<div class="micro-input">'+textarea('a1NorthstarInput','Write your response…',6)+'</div>'+
  '<div class="micro-counter" id="a1NorthstarCounter">0 / '+min+'–'+max+' words</div>'+
  '<label class="micro-share"><input id="a1NorthstarShare" type="checkbox"> Share this later in My Writings</label>'+
  action('Check my response','a1NorthstarCheck',true)+'<div id="a1NorthstarFeedback"></div>';
 document.getElementById('content').innerHTML=shell(l,s,body);bindNav();
 const box=document.getElementById('a1NorthstarInput'),check=document.getElementById('a1NorthstarCheck'),counter=document.getElementById('a1NorthstarCounter'),share=document.getElementById('a1NorthstarShare');
 box.value=prior;share.checked=Boolean(s.share);
 box.addEventListener('paste',e=>e.preventDefault());box.addEventListener('drop',e=>e.preventDefault());
 const sync=()=>{const count=words(box.value);counter.textContent=count+' / '+min+'–'+max+' words';check.disabled=!(count>=min&&count<=max)};
 box.oninput=sync;share.onchange=()=>{s.share=share.checked;write(l,s)};sync();
 check.onclick=()=>{
  if(check.disabled)return;setR(l,s,8,box.value.trim());setOK(l,s,8,true);hit(l,s,8);s.grade=null;write(l,s);
  document.getElementById('a1NorthstarFeedback').innerHTML=feedback(true,'Response complete.','Jev will now check whether anything actually needs improving.','Fix only what needs it');
  document.getElementById('a1NorthstarContinue').onclick=()=>next(l,s)
 }
}
function gradeMessage(g){
 if(!g)return'';
 if(typeof g.feedback==='string'&&g.feedback.trim())return g.feedback.trim();
 if(typeof g.summary==='string'&&g.summary.trim())return g.summary.trim();
 if(typeof g.message==='string'&&g.message.trim())return g.message.trim();
 if(Array.isArray(g.corrections)&&g.corrections[0])return String(g.corrections[0].feedback||g.corrections[0].message||g.corrections[0]);
 return''
}
async function requestGrade(l,s){
 const n=l.northstarA1||contract(l),x=n.final||{},text=String(getR(s,8)||'');
 return api('/api/writing-grade',{method:'POST',body:JSON.stringify({lessonId:l.id,task:x.task,level:'A1',minWords:Number(x.minWords||15),maxWords:Number(x.maxWords||70),text})})
}
async function saveWriting(l,s){
 if(preview()||typeof session==='undefined'||!session||session.role!=='student')return;
 const text=String(getR(s,9)||getR(s,8)||'').trim();if(!text)return;
 await api('/api/writing/'+encodeURIComponent(l.id),{method:'PUT',body:JSON.stringify({content:text,publishToCommunity:Boolean(s.share)})})
}
async function renderFix(l,s){
 const original=String(getR(s,8)||''),n=l.northstarA1||contract(l);
 if(!s.grade){
  document.getElementById('content').innerHTML=shell(l,s,prompt('Check only what needs fixing.','Jev is checking task achievement, clarity, and A1 language control.')+'<div class="a1-jev-wait">Checking your response…</div>');bindNav();
  try{s.grade=await requestGrade(l,s);write(l,s)}catch(e){s.grade={score:null,unavailable:true,message:'Automated feedback is unavailable. Your response is saved without an invented correction.'};write(l,s)}
 }
 const g=s.grade||{},score=Number(g.score),passed=Number.isFinite(score)?score>=70:false,msg=gradeMessage(g);
 if(g.unavailable){
  const body=prompt('Your response is saved.',g.message)+'<div class="northstar-model"><small>YOUR RESPONSE</small><div class="northstar-final-preview">'+esc(original)+'</div></div>'+action('Finish lesson','a1NoFix',false);
  document.getElementById('content').innerHTML=shell(l,s,body);bindNav();document.getElementById('a1NoFix').onclick=()=>finish(l,s);return
 }
 if(passed){
  const body=prompt('No priority repair needed.','Jev score: '+score+'. '+(msg||'Your response meets the A1 task target.'))+
   '<div class="northstar-model"><small>YOUR RESPONSE</small><div class="northstar-final-preview">'+esc(original)+'</div></div>'+action('Finish lesson','a1NoFix',false);
  document.getElementById('content').innerHTML=shell(l,s,body);bindNav();document.getElementById('a1NoFix').onclick=()=>{setR(l,s,9,original);setOK(l,s,9,true);finish(l,s)};return
 }
 const model=n.fix.models[0]?.model||n.change[0]?.model||'',prior=String(getR(s,9)||original),min=Number(n.final.minWords||15),max=Number(n.final.maxWords||70);
 const body=prompt('Improve one important part.',msg||'Keep your meaning, but repair the part that stops the task from being clear.')+
  (model?'<div class="northstar-model"><small>LESSON MODEL</small><strong>'+esc(model)+'</strong></div>':'')+
  '<div class="micro-input">'+textarea('a1NorthstarInput','Edit only what needs improving…',6)+'</div>'+
  '<div class="micro-counter" id="a1NorthstarCounter">0 / '+min+'–'+max+' words</div>'+action('Recheck my response','a1NorthstarCheck',true);
 document.getElementById('content').innerHTML=shell(l,s,body);bindNav();
 const box=document.getElementById('a1NorthstarInput'),check=document.getElementById('a1NorthstarCheck'),counter=document.getElementById('a1NorthstarCounter');box.value=prior;
 box.addEventListener('paste',e=>e.preventDefault());box.addEventListener('drop',e=>e.preventDefault());
 const sync=()=>{const count=words(box.value);counter.textContent=count+' / '+min+'–'+max+' words';check.disabled=!(count>=min&&count<=max&&box.value.trim()!==original.trim())};box.oninput=sync;sync();
 check.onclick=()=>{if(check.disabled)return;setR(l,s,8,box.value.trim());setR(l,s,9,box.value.trim());hit(l,s,9);s.grade=null;write(l,s);renderFix(l,s)}
}
function scoreFor(s,skill){
 const indexes=STEPS.map((x,i)=>x.skill===skill?i:-1).filter(i=>i>=0);if(!indexes.length)return 100;
 const good=indexes.reduce((n,i)=>n+(s.results[String(i)]?1:0),0);return Math.round(good/indexes.length*100)
}
async function saveEvidence(l,s){
 if(preview()||s.saved||typeof session==='undefined'||!session||session.role!=='student')return;
 for(const skill of ['vocabulary','listening','grammar']){
  if(typeof recordAttempt==='function')await recordAttempt(session.id,l.id,skill,scoreFor(s,skill),['northstar:a1-parity-v1','framework:see-choose-change-use-fix','b2-parity:true']);
  if(typeof markDone==='function')await markDone(session.id,l.id,skill)
 }
 await saveWriting(l,s);
 if(typeof markDone==='function')await markDone(session.id,l.id,'writing');
 if(typeof refreshState==='function')await refreshState();
 s.saved=true;write(l,s)
}
async function finish(l,s){
 s.complete=true;write(l,s);renderDone(l,s);
 try{await saveEvidence(l,s);renderDone(l,s)}catch(e){const slot=document.getElementById('a1NorthstarSaveStatus');if(slot)slot.textContent='Lesson complete on this device. Progress sync needs another try: '+String(e?.message||e)}
}
function renderDone(l,s){
 activeLesson=l;activeState=s;reviewingComplete=false;
 const n=l.northstarA1||contract(l);
 const body='<div class="micro-complete"><div class="micro-complete-mark">✓</div><small>Lesson complete</small><h1>'+esc(n.mission)+'</h1>'+
 '<p>You understood a source, retrieved earlier English, chose useful language, changed it for your situation, used it in a real exchange, wrote independently, and fixed only what needed attention.</p>'+
 '<div class="micro-summary"><div><strong>'+TOTAL+'</strong><span>focused actions</span></div><div><strong>'+scoreFor(s,'listening')+'%</strong><span>listening evidence</span></div><div><strong>1</strong><span>real transfer</span></div></div>'+
 '<p class="micro-save-status" id="a1NorthstarSaveStatus">'+(preview()?'Preview only — nothing was saved.':s.saved?'Progress saved.':'Saving progress…')+'</p>'+
 '<div class="micro-finish-actions"><button class="primary-btn" id="a1NorthstarExit" type="button">Back to lessons</button><button class="ghost-btn" id="a1NorthstarReview" type="button">Review activities</button><button class="ghost-btn" id="a1NorthstarRestart" type="button">Practise again</button></div></div>';
 document.getElementById('content').innerHTML=shell(l,s,body);bindNav();
 document.getElementById('a1NorthstarExit').onclick=leave;
 document.getElementById('a1NorthstarReview').onclick=()=>{reviewingComplete=true;s.index=0;render(l,s)};
 document.getElementById('a1NorthstarRestart').onclick=()=>{reviewingComplete=false;const ns=fresh(l);write(l,ns);render(l,ns)}
}
function render(l,s){
 activeLesson=l;activeState=s;if(s.complete&&!reviewingComplete)return renderDone(l,s);
 const i=s.index;if(i===0)return renderSee(l,s);if(i===1)return renderRetrieval(l,s);if(i===2)return renderGrammar(l,s);if(i===3)return renderVocab(l,s);if(i===4)return renderListening(l,s);if(i===5)return renderChange(l,s,0);if(i===6)return renderChange(l,s,1);if(i===7)return renderSpeaking(l,s);if(i===8)return renderWriting(l,s);return renderFix(l,s)
}
function previous(l,s){if(!l||!s||s.index<=0)return;if(s.complete)reviewingComplete=true;s.index=Math.max(0,s.index-1);write(l,s);render(l,s);if(typeof resetAppScroll==='function')resetAppScroll()}
function next(l,s){s.index=Math.min(TOTAL-1,s.index+1);write(l,s);render(l,s);if(typeof resetAppScroll==='function')resetAppScroll()}
function leave(){
 document.body.classList.remove('b2-premium-workbook-mode','a1-northstar-workbook-mode');
 if(typeof setWorkbookDesignMode==='function')setWorkbookDesignMode(false);
 if(preview()){if(typeof returnToWorkbookLessons==='function')returnToWorkbookLessons();return}
 if(typeof currentPage!=='undefined')currentPage='course';
 if(typeof renderNav==='function')renderNav();
 if(typeof studentCourse==='function')studentCourse()
}
function northstarWorkbook(l){
 reviewingComplete=false;document.body.classList.add('b2-premium-workbook-mode','a1-northstar-workbook-mode');
 if(typeof setWorkbookDesignMode==='function')setWorkbookDesignMode(true);
 if(typeof title==='function')title('Workbook','Lesson '+l.number);
 const s=read(l);render(l,s);
 if(s.complete&&!s.saved&&!preview()&&typeof session!=='undefined'&&session&&session.role==='student')saveEvidence(l,s).then(()=>renderDone(l,s)).catch(()=>{});
 if(typeof resetAppScroll==='function')resetAppScroll()
}
function installHook(){
 if(!installContracts())return false;
 const previousWorkbook=typeof workbook==='function'?workbook:null;if(!previousWorkbook)return false;
 if(previousWorkbook.__a1NorthstarParity)return true;
 const wrapped=function englishGateA1NorthstarParityWorkbook(){
  const l=typeof lesson==='function'?lesson():null;
  if(l&&String(l.id||'').startsWith('a1-gold-l')&&l.northstarA1?.framework==='SEE_CHOOSE_CHANGE_USE_FIX')return northstarWorkbook(l);
  return previousWorkbook.apply(this,arguments)
 };
 wrapped.__a1NorthstarParity=true;workbook=wrapped;return true
}
function ensureParityStyles(){
 if(document.querySelector('link[data-a1-northstar-parity="v1"]'))return;
 const link=document.createElement('link');link.rel='stylesheet';link.href='/a1-northstar-parity-v1.css?v=1';link.dataset.a1NorthstarParity='v1';document.head.appendChild(link)
}
function boot(){
 ensureParityStyles();
 if(!installHook()){setTimeout(boot,250);return}
 window.ENGLISHGATE_A1_NORTHSTAR={version:FLOW_VERSION,total:TOTAL,phases:PHASES.slice(),rememberOffsets:REMEMBER_OFFSETS.slice(),reference:'B2 Northstar',uiDecisionContract:'jev-ui-v1',uiModes:['source','decision','compose','repair'],lessonCount:book()?.lessons?.length||0}
}
if(document.readyState==='complete')boot();else window.addEventListener('load',boot,{once:true});
})();