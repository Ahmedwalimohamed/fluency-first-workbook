/* EnglishGate B2 Lesson 1 — SEE → CHOOSE → CHANGE → USE → FIX Northstar
   Usage-first, EFL-friendly, one action at a time.
   Scope: su-b2-l1 only. */
(function(){
'use strict';

const LESSON_ID='su-b2-l1';
const TOTAL=9;
const FLOW_VERSION='b2-l1-see-choose-change-use-fix-v1';
const PHASES=['SEE','CHOOSE','CHANGE','USE','FIX'];
const STEPS=[
  {phase:'SEE',skill:'reading'},
  {phase:'CHOOSE',skill:'listening'},
  {phase:'CHOOSE',skill:'vocabulary'},
  {phase:'CHOOSE',skill:'listening'},
  {phase:'CHANGE',skill:'writing'},
  {phase:'CHANGE',skill:'grammar'},
  {phase:'USE',skill:'writing'},
  {phase:'USE',skill:'writing'},
  {phase:'FIX',skill:'grammar'}
];

function el(id){return document.getElementById(id)}
function esc(value){
  if(typeof escapeHtml==='function')return escapeHtml(String(value==null?'':value));
  return String(value==null?'':value).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]});
}
function norm(value){return String(value||'').toLowerCase().replace(/[’]/g,"'").replace(/[^a-z0-9'?]+/g,' ').replace(/\s+/g,' ').trim()}
function words(value){var s=String(value||'').trim();return s?s.split(/\s+/).filter(Boolean).length:0}
function preview(){return typeof isWorkbookPreview==='function'&&isWorkbookPreview()}
function learnerName(){
  if(preview())return 'Alex';
  var n=String(typeof session!=='undefined'&&session&&session.name||'').trim();
  return n?n.split(/\s+/)[0]:'Alex'
}
function key(){
  var sid=(typeof session!=='undefined'&&session&&session.id)?session.id:'preview';
  return 'englishgate:'+FLOW_VERSION+':'+sid
}
function fresh(){
  return {version:FLOW_VERSION,index:0,responses:{},results:{},attempts:{},saved:false,complete:false,share:false,updatedAt:new Date().toISOString()}
}
function read(){
  try{
    var x=JSON.parse(localStorage.getItem(key())||'null');
    return x&&x.version===FLOW_VERSION?Object.assign(fresh(),x):fresh()
  }catch(e){return fresh()}
}
function write(state){
  state.updatedAt=new Date().toISOString();
  try{localStorage.setItem(key(),JSON.stringify(state))}catch(e){}
}
function reset(){var s=fresh();write(s);return s}
function getR(state,i){return state.responses[String(i)]}
function setR(state,i,value){state.responses[String(i)]=value;write(state)}
function setOK(state,i,value){state.results[String(i)]=Boolean(value);write(state)}
function hit(state,i){var k=String(i);state.attempts[k]=Number(state.attempts[k]||0)+1;write(state);return state.attempts[k]}

function phaseFor(index){return STEPS[Math.max(0,Math.min(index,TOTAL-1))].phase}
function phaseStrip(state){
  var current=phaseFor(state.index);
  var currentIx=PHASES.indexOf(current);
  return '<div class="micro-framework" aria-label="Lesson flow">'+PHASES.map(function(p,i){
    return '<span class="'+(i<currentIx?'is-done':i===currentIx?'is-current':'')+'">'+(i<currentIx?'✓ ': '')+p+'</span>'
  }).join('')+'</div>'
}
function shell(body,state){
  var pct=state.complete?100:Math.round((state.index/TOTAL)*100);
  return '<div class="b2-microflow">'+
    '<div class="micro-top"><button class="ghost-btn" id="microBack" type="button">← Lessons</button>'+
      '<div class="micro-title"><small>B2 · Lesson 1</small><strong>Getting Acquainted</strong></div>'+
      '<span class="micro-preview">'+(preview()?'Preview':'Workbook')+'</span></div>'+
    phaseStrip(state)+
    '<div class="micro-progress" aria-hidden="true"><span style="width:'+pct+'%"></span></div>'+
    '<main class="micro-stage">'+body+'</main></div>'
}
function speaker(name,text,you){
  return '<div class="micro-turn'+(you?' is-you':'')+'"><span class="micro-avatar">'+esc((name||'?').slice(0,1).toUpperCase())+'</span><div><small>'+esc(name)+'</small><p>'+esc(text)+'</p></div></div>'
}
function prompt(title,sub){
  return '<div class="micro-prompt"><h1>'+esc(title)+'</h1>'+(sub?'<p>'+esc(sub)+'</p>':'')+'</div>'
}
function feedback(ok,title,text,buttonText){
  return '<div class="micro-feedback '+(ok?'is-good':'is-hint')+'"><strong>'+esc(title)+'</strong>'+
    (text?'<p>'+esc(text)+'</p>':'')+
    '<button class="'+(ok?'primary-btn':'ghost-btn')+'" id="microContinue" type="button">'+esc(buttonText||'Continue')+'</button></div>'
}
function choices(options){
  return '<div class="micro-choices">'+options.map(function(x,i){
    return '<button class="micro-choice" data-choice="'+i+'" type="button"><span>'+String.fromCharCode(65+i)+'</span><strong>'+esc(x)+'</strong></button>'
  }).join('')+'</div>'
}
function action(label,id,disabled){
  return '<div class="micro-action"><button class="primary-btn" id="'+id+'" type="button"'+(disabled?' disabled':'')+'>'+esc(label)+'</button></div>'
}
function inputBox(id,placeholder,rows){
  return '<textarea id="'+id+'" rows="'+(rows||2)+'" placeholder="'+esc(placeholder||'Type here…')+'"></textarea>'
}
function bindBack(){var b=el('microBack');if(b)b.onclick=leave}

function modelDialogue(){
  return '<div class="micro-scene">'+
    speaker('Sara',"Hi, I don't think we've met. I'm Sara.")+
    speaker('Daniel',"Nice to meet you. I'm Daniel. What brought you here?",true)+
    speaker('Sara',"A colleague recommended the workshop. I work for a logistics company and coordinate some digital projects.")+
    speaker('Daniel',"Interesting. How long have you worked there?",true)+
    speaker('Sara',"I've worked there for three years. I'm still learning the project side of the job.")+
    '</div>'
}

function renderChoice(state,opts){
  var body=(opts.before||'')+prompt(opts.q,opts.sub)+choices(opts.options)+'<div id="microFeedbackSlot"></div>';
  el('content').innerHTML=shell(body,state);bindBack();
  Array.from(document.querySelectorAll('[data-choice]')).forEach(function(btn){
    btn.onclick=function(){
      if(el('microContinue'))return;
      var ix=Number(btn.dataset.choice),value=opts.options[ix],ok=ix===opts.answer;
      setR(state,state.index,value);setOK(state,state.index,ok);hit(state,state.index);
      Array.from(document.querySelectorAll('[data-choice]')).forEach(function(b){b.disabled=true;b.classList.toggle('is-selected',b===btn)});
      el('microFeedbackSlot').innerHTML=feedback(ok,ok?(opts.goodTitle||'Correct.'):(opts.badTitle||'Try again.'),ok?opts.good:opts.bad,ok?'Next':'Try again');
      el('microContinue').onclick=function(){if(ok)next(state);else render(state)}
    }
  })
}

function renderOpen(state,opts){
  var prior=String(getR(state,state.index)||'');
  var body=(opts.before||'')+prompt(opts.q,opts.sub)+
    (opts.help?'<div class="micro-help"><strong>Useful model</strong><span>'+esc(opts.help)+'</span></div>':'')+
    '<div class="micro-input">'+inputBox('microInput',opts.placeholder||'Type your answer…',opts.rows||2)+'</div>'+
    action(opts.button||'Check','microCheck',true)+'<div id="microFeedbackSlot"></div>';
  el('content').innerHTML=shell(body,state);bindBack();
  var box=el('microInput'),check=el('microCheck');box.value=prior;
  function valid(){return opts.validate?opts.validate(box.value):words(box.value)>=Number(opts.min||3)}
  function sync(){check.disabled=!valid()}box.oninput=sync;sync();
  check.onclick=function(){
    var value=box.value.trim();if(!valid())return;
    var ok=opts.correct?Boolean(opts.correct(value)):true;
    setR(state,state.index,value);setOK(state,state.index,ok);hit(state,state.index);
    box.disabled=true;check.disabled=true;
    el('microFeedbackSlot').innerHTML=feedback(true,opts.feedbackTitle||'Good.',ok?(opts.feedback||'You used the model in your own English.'):(opts.softFeedback||'Good attempt. Keep going — we will fix this pattern at the end.'),'Next');
    el('microContinue').onclick=function(){next(state)}
  }
}

function reasonRelevant(value){return words(value)>=4}
function durationCorrect(value){
  var t=norm(value);
  var hasPresentPerfect=/\b(?:i|we|you|they)(?:\s+have|'ve)\s+[a-z]+\b/.test(t)||/\b(?:i|we|you|they)(?:\s+have|'ve)\s+been\s+\w+ing\b/.test(t)||/\b(?:he|she|it)(?:\s+has|'s)\s+[a-z]+\b/.test(t);
  var hasFor=/\bfor\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|several|many|a|an)\b/.test(t);
  var hasSince=/\bsince\s+(?:19|20)\d{2}\b/.test(t)||/\bsince\s+(january|february|march|april|may|june|july|august|september|october|november|december|school|college|university|childhood|last year)\b/.test(t);
  return hasPresentPerfect&&(hasFor||hasSince)
}
function useRelevant(value){var t=norm(value);return words(value)>=5&&/\bi\b/.test(t)}
function messageValid(value){var n=words(value);return n>=40&&n<=60}
function messageHasDetail(value){return /digital|project|customer|logistics|workshop|coordinate|technology/i.test(value)}
function messageHasStay(value){return /stay in touch|keep in touch|speak soon|hear how|share|contact|message/i.test(value)}

function renderMessage(state){
  var prior=String(getR(state,7)||'');
  var body='<div class="micro-scene">'+speaker('Sara','It was nice meeting you today. Keep in touch!')+'</div>'+
    prompt('Send Sara a short follow-up message.','40–60 words. Mention one thing from your conversation and give one natural reason to stay in touch.')+
    '<div class="micro-help"><strong>Useful starters</strong><span>Hi Sara, it was great meeting you… · I enjoyed hearing about… · It would be good to stay in touch because…</span></div>'+
    '<div class="micro-input">'+inputBox('microInput','Hi Sara, it was great meeting you at the workshop…',5)+'</div>'+
    '<div class="micro-counter" id="microCounter">0 / 40–60 words</div>'+
    '<label class="micro-share"><input id="microShare" type="checkbox"> Share this later in My Writings</label>'+
    action('Check message','microCheck',true)+'<div id="microFeedbackSlot"></div>';
  el('content').innerHTML=shell(body,state);bindBack();
  var box=el('microInput'),check=el('microCheck'),counter=el('microCounter'),share=el('microShare');box.value=prior;share.checked=Boolean(state.share);
  function sync(){var n=words(box.value);counter.textContent=n+' / 40–60 words';check.disabled=!(n>=40&&n<=60)}box.oninput=sync;share.onchange=function(){state.share=share.checked;write(state)};sync();
  check.onclick=function(){
    var value=box.value.trim();if(!messageValid(value))return;
    setR(state,7,value);setOK(state,7,messageHasDetail(value)&&messageHasStay(value));hit(state,7);
    box.disabled=true;check.disabled=true;share.disabled=true;
    var strong=messageHasDetail(value)&&messageHasStay(value);
    el('microFeedbackSlot').innerHTML=feedback(true,strong?'Your message has a clear purpose.':'Good first message.',strong?'You referred to the conversation and gave a reason to stay in touch.':'Keep it. The final step will help you improve one useful part.','Fix one thing');
    el('microContinue').onclick=function(){next(state)}
  }
}

function repairMode(state){
  var duration=String(getR(state,5)||'');
  var message=String(getR(state,7)||'');
  if(!durationCorrect(duration))return {type:'duration',source:duration};
  if(!messageHasDetail(message)&&!messageHasStay(message))return {type:'detailstay',source:message};
  if(!messageHasDetail(message))return {type:'detail',source:message};
  if(!messageHasStay(message))return {type:'stay',source:message};
  return {type:'polish',source:message}
}
function renderRepair(state){
  var mode=repairMode(state),prior=String(getR(state,8)||''),title,sub,help,placeholder,validate;
  if(mode.type==='duration'){
    title='Fix your duration sentence.';
    sub='Your meaning is clear. Now use present perfect with for or since.';
    help='I\'ve worked here for three years. / I\'ve studied English since 2023.';
    placeholder=mode.source||"I've worked here for three years.";
    validate=durationCorrect;
  }else if(mode.type==='detailstay'){
    title='Add one useful sentence.';
    sub='Mention Sara’s project and give a reason to stay in touch in the same sentence.';
    help="I'd like to stay in touch and hear how your digital project develops.";
    placeholder="I'd like to stay in touch and hear…";
    validate=function(v){return words(v)>=9&&messageHasDetail(v)&&messageHasStay(v)}
  }else if(mode.type==='detail'){
    title='Make your message more specific.';
    sub='Add one sentence that shows you remember what Sara told you.';
    help='I enjoyed hearing about the digital projects you coordinate.';
    placeholder='I enjoyed hearing about…';
    validate=function(v){return words(v)>=7&&messageHasDetail(v)}
  }else if(mode.type==='stay'){
    title='Give a reason to stay in touch.';
    sub='Write one natural sentence that keeps the connection open.';
    help="I'd like to hear how your project develops, and I'd be happy to share ideas too.";
    placeholder="I'd like to stay in touch because…";
    validate=function(v){return words(v)>=8&&messageHasStay(v)}
  }else{
    title='Make one line more useful.';
    sub='Turn a generic line into a specific reference to your conversation.';
    help='Instead of “It was nice meeting you,” say what you enjoyed hearing about.';
    placeholder='I enjoyed hearing about…';
    validate=function(v){return words(v)>=7&&messageHasDetail(v)}
  }
  var body=prompt(title,sub)+'<div class="micro-help"><strong>Model</strong><span>'+esc(help)+'</span></div>'+
    '<div class="micro-input">'+inputBox('microInput',placeholder,2)+'</div>'+action('Check fix','microCheck',true)+'<div id="microFeedbackSlot"></div>';
  el('content').innerHTML=shell(body,state);bindBack();
  var box=el('microInput'),check=el('microCheck');box.value=prior;
  function sync(){check.disabled=!validate(box.value)}box.oninput=sync;sync();
  check.onclick=function(){
    var value=box.value.trim();if(!validate(value))return;
    setR(state,8,value);setOK(state,8,true);hit(state,8);
    if(mode.type==='duration')setOK(state,5,true);
    if(mode.type==='detailstay'||mode.type==='detail'||mode.type==='stay'||mode.type==='polish'){
      var message=String(getR(state,7)||'').trim();
      if(message&&value&&!message.includes(value)){setR(state,7,message+' '+value)}
      setOK(state,7,true)
    }
    box.disabled=true;check.disabled=true;
    el('microFeedbackSlot').innerHTML=feedback(true,'Fixed.','You improved one important part instead of correcting everything at once.','Finish lesson');
    el('microContinue').onclick=function(){finish(state)}
  }
}

function render(state){
  if(state.complete){renderDone(state);return}
  var i=state.index;
  if(i===0)return renderChoice(state,{
    before:modelDialogue(),
    q:'What are Sara and Daniel mainly doing?',
    sub:'Read the short conversation and choose one answer.',
    options:['Getting acquainted at a workshop','Planning a holiday','Discussing a customer complaint'],
    answer:0,
    good:'They are meeting for the first time and learning about each other.',
    bad:'Look at how they introduce themselves and ask about work.'
  });
  if(i===1)return renderChoice(state,{
    before:'<div class="micro-scene">'+speaker('Sara','What brought you to the workshop?')+'</div>',
    q:'Which answer sounds natural?',
    options:["I'm here because I want to improve my digital skills.",'Because workshop digital.',"I am here yesterday."],
    answer:0,
    good:'It gives Sara one clear reason.',
    bad:'Choose the complete answer that explains why you came.'
  });
  if(i===2)return renderChoice(state,{
    before:'<div class="micro-scene">'+speaker('Sara','I coordinate some of our digital projects.')+'</div>',
    q:'What does “coordinate” mean here?',
    options:['Organize people and tasks so they work together','Do every technical task alone','Only answer customer complaints'],
    answer:0,
    good:'Right. Sara helps people and tasks work together.',
    bad:'Use the work context around the word.'
  });
  if(i===3)return renderChoice(state,{
    before:'<div class="micro-scene">'+speaker('Sara',"I've worked there for three years. I'm still learning the project side of the job.")+'</div>',
    q:'Which question keeps the conversation moving?',
    options:['What kind of projects are you working on?','Do you work?','How old is the company building?'],
    answer:0,
    good:'The question uses something Sara just said.',
    bad:'Choose the question that connects directly to her last idea.'
  });
  if(i===4)return renderOpen(state,{
    before:'<div class="micro-scene">'+speaker('Sara','What brought you here?')+'</div>',
    q:'Change the model so it is true for you.',
    sub:'One short sentence is enough.',
    help:"I'm here because I want to improve my digital skills.",
    placeholder:"I'm here because…",
    button:'Use my sentence',
    validate:reasonRelevant,
    feedbackTitle:'Good.',
    feedback:'You changed a useful model into your own English.'
  });
  if(i===5)return renderOpen(state,{
    before:'<div class="micro-scene">'+speaker('Sara',"I've worked at my company for three years.")+'</div>',
    q:'Change the model so it is true for you.',
    sub:'Use your job, studies or main activity. Try for or since.',
    help:"I've worked here for three years. / I've studied English since 2023.",
    placeholder:"I've worked… / I've studied…",
    button:'Use my sentence',
    validate:function(v){return words(v)>=5},
    correct:durationCorrect,
    feedbackTitle:'Nice use of the pattern.',
    feedback:'Your sentence connects a past starting point to now.',
    softFeedback:'Your idea is useful. We will repair the grammar once at the end.'
  });
  if(i===6)return renderOpen(state,{
    before:'<div class="micro-scene">'+speaker('Sara','Nice. Tell me a little about what you do.')+'</div>',
    q:'Reply in 1–2 sentences.',
    sub:'Say what you do and add one useful detail.',
    help:'I work in banking. I mainly help customers and manage a small team.',
    placeholder:'I work in… / I study…',
    rows:3,
    button:'Reply',
    validate:useRelevant,
    feedbackTitle:'That works.',
    feedback:'Sara now knows what you do and one useful detail.'
  });
  if(i===7)return renderMessage(state);
  if(i===8)return renderRepair(state)
}

function next(state){state.index=Math.min(TOTAL-1,state.index+1);write(state);render(state);if(typeof resetAppScroll==='function')resetAppScroll()}
function scoreFor(state,skill){
  var indexes=STEPS.map(function(x,i){return x.skill===skill?i:-1}).filter(function(i){return i>=0});
  if(!indexes.length)return 100;
  var sum=indexes.reduce(function(n,i){return n+(state.results[String(i)]?1:0)},0);
  return Math.round(sum/indexes.length*100)
}
async function saveEvidence(state){
  if(preview()||state.saved||typeof session==='undefined'||!session||session.role!=='student')return;
  var l=typeof lesson==='function'?lesson():null;if(!l)return;
  var skills=['reading','listening','vocabulary','grammar','writing'];
  for(var i=0;i<skills.length;i++){
    var skill=skills[i],tags=['northstar:see-choose-change-use-fix','usage-first','efl-scaffolded'];
    STEPS.forEach(function(x,n){if(x.skill===skill)tags.push('phase:'+x.phase.toLowerCase()+':step'+(n+1))});
    if(typeof recordAttempt==='function')await recordAttempt(session.id,l.id,skill,scoreFor(state,skill),tags.slice(0,10));
    if(typeof markDone==='function')await markDone(session.id,l.id,skill)
  }
  var message=String(getR(state,7)||'').trim();
  if(message&&typeof api==='function')await api('/api/writing/'+encodeURIComponent(l.id),{method:'PUT',body:JSON.stringify({content:message,publishToCommunity:Boolean(state.share)})});
  if(typeof refreshState==='function')await refreshState();
  state.saved=true;write(state)
}
async function finish(state){
  state.complete=true;write(state);renderDone(state);
  try{await saveEvidence(state);renderDone(state)}catch(e){var slot=el('microSaveStatus');if(slot)slot.textContent='Lesson complete on this device. Progress sync needs another try: '+String(e&&e.message||e)}
}
function renderDone(state){
  var skills=['reading','listening','vocabulary','grammar','writing'];
  var overall=Math.round(skills.reduce(function(n,s){return n+scoreFor(state,s)},0)/skills.length);
  var body='<div class="micro-complete"><div class="micro-complete-mark">✓</div><small>Lesson complete</small>'+
    '<h1>You met Sara, used useful English and improved one important part.</h1>'+
    '<p>You followed the same simple rhythm: see it, choose it, change it, use it, fix it.</p>'+
    '<div class="micro-summary"><div><strong>'+TOTAL+'</strong><span>short actions</span></div><div><strong>'+overall+'%</strong><span>practice evidence</span></div><div><strong>1</strong><span>real follow-up message</span></div></div>'+
    '<p class="micro-save-status" id="microSaveStatus">'+(preview()?'Preview only — nothing was saved.':state.saved?'Progress saved.':'Saving progress…')+'</p>'+
    '<div class="micro-finish-actions"><button class="primary-btn" id="microExit" type="button">Back to lessons</button><button class="ghost-btn" id="microRestart" type="button">Practise again</button></div></div>';
  el('content').innerHTML=shell(body,state);bindBack();el('microExit').onclick=leave;el('microRestart').onclick=function(){render(reset())}
}
function leave(){
  if(typeof setWorkbookDesignMode==='function')setWorkbookDesignMode(false);
  if(preview()){if(typeof returnToWorkbookLessons==='function')returnToWorkbookLessons();return}
  if(typeof currentPage!=='undefined')currentPage='course';
  if(typeof renderNav==='function')renderNav();
  if(typeof studentCourse==='function')studentCourse()
}
function microWorkbook(){
  if(typeof setWorkbookDesignMode==='function')setWorkbookDesignMode(true);
  if(typeof title==='function')title('Workbook','Lesson 1');
  var state=read();render(state);
  if(state.complete&&!state.saved&&!preview()&&typeof session!=='undefined'&&session&&session.role==='student'){
    saveEvidence(state).then(function(){renderDone(state)}).catch(function(e){var slot=el('microSaveStatus');if(slot)slot.textContent='Lesson complete on this device. Progress sync needs another try: '+String(e&&e.message||e)})
  }
  if(typeof resetAppScroll==='function')resetAppScroll()
}

const previousWorkbook=typeof workbook==='function'?workbook:null;
if(previousWorkbook){
  workbook=function englishGateB2Lesson1Northstar(){
    var l=typeof lesson==='function'?lesson():null;
    if(l&&l.id===LESSON_ID)return microWorkbook();
    return previousWorkbook()
  }
}
const previousFirstOpen=typeof firstOpenStep==='function'?firstOpenStep:null;
if(previousFirstOpen){
  firstOpenStep=function englishGateNorthstarFirstOpen(sid,lid){if(lid===LESSON_ID)return 'scenario';return previousFirstOpen(sid,lid)}
}

window.ENGLISHGATE_B2_L1_MICROFLOW={
  version:FLOW_VERSION,
  framework:'SEE_CHOOSE_CHANGE_USE_FIX',
  total:TOTAL,
  phases:PHASES.slice(),
  reset:function(){render(reset())},
  logic:{reasonRelevant:reasonRelevant,durationCorrect:durationCorrect,useRelevant:useRelevant,messageValid:messageValid,messageHasDetail:messageHasDetail,messageHasStay:messageHasStay}
};
})();
