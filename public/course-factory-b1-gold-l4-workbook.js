/* EnglishGate B1 Gold Lesson 4 — SEE → CHOOSE → CHANGE → USE → FIX
   Clones the current B2 Northstar activity engine, not the B2 lesson content.
   Preview-only scope. */
(function(){
'use strict';

const TOTAL=10;
const MIN_COMPREHENSION_QUESTIONS=3;
const FLOW_VERSION='b1-gold-l4-see-choose-change-use-fix-v1';
const PHASES=['SEE','CHOOSE','CHANGE','USE','FIX'];
const STEPS=[
  {phase:'SEE',skill:'reading'},
  {phase:'CHOOSE',skill:'listening'},
  {phase:'CHOOSE',skill:'listening'},
  {phase:'CHOOSE',skill:'vocabulary'},
  {phase:'CHOOSE',skill:'speaking'},
  {phase:'CHANGE',skill:'writing'},
  {phase:'CHANGE',skill:'grammar'},
  {phase:'USE',skill:'speaking'},
  {phase:'USE',skill:'writing'},
  {phase:'FIX',skill:'grammar'}
];

const READING_TEXT=`For the last few months, Amina has been using her phone more than she wanted. She needs it for work messages, family groups and online learning, but she noticed that she was opening social media whenever a notification appeared. Even short checks often became twenty minutes of scrolling. She was not planning to stop using social media; she wanted to use it with more control.

Two weeks ago, Amina changed several settings. She turned off most notifications, moved entertainment apps away from her home screen and set a daily screen-time reminder. She has also been leaving her phone in another room during one hour of evening study. At first, she worried that she would miss something important. In fact, her close family and colleagues can still call her when something is urgent.

The changes have not solved everything. Amina sometimes ignores the reminder, especially when friends are discussing an interesting topic. However, she says she has been concentrating better and sleeping earlier. Her goal is not to have a perfect digital routine. She wants to notice when a useful platform becomes a distraction and make a deliberate choice about what to do next.`;

const READING_QUESTIONS=[
  {q:'Why does Amina still need her phone?',options:['For work, family and online learning','Only for entertainment','Because she cannot use a computer'],answer:0},
  {q:'What did Amina do to reduce interruptions?',options:['She turned off most notifications','She deleted every social-media account','She stopped answering work calls'],answer:0},
  {q:'What improvement does Amina report?',options:['She has been concentrating better and sleeping earlier','She no longer uses a phone','She has stopped talking to friends online'],answer:0}
];

const LISTENING_SCRIPT=`Last month, three people in our office noticed that lunch had become very quiet because everyone was looking at a phone. We decided to try one small change: during lunch, phones stay in bags unless someone is expecting an urgent call. We have been testing the idea for three weeks. At first, a few people felt uncomfortable because they were used to checking messages immediately. Nobody wanted a strict rule, so we agreed that joining the experiment was optional. The interesting thing is that more people have been joining us each week. We have been talking more about our families, weekend plans and problems at work. I still check my phone before lunch and again when I finish. For me, that makes the rule realistic. It does not say that phones are bad. It simply creates a short time when we choose to pay attention to the people sitting with us.`;

const LISTENING_QUESTIONS=[
  {q:'Why did the group start the experiment?',options:['Lunch had become quiet because people were using phones','The office internet stopped working','They wanted to buy new phones'],answer:0},
  {q:'How long have they been testing the idea?',options:['For three weeks','For three days','For three months'],answer:0},
  {q:'Why does the speaker think the rule is realistic?',options:['People can still check phones before and after lunch','Nobody is allowed to use a phone at work','Only managers have to follow it'],answer:0}
];

let activeState=null;
let reviewingComplete=false;

function el(id){return document.getElementById(id)}
function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})}
function norm(value){return String(value||'').toLowerCase().replace(/[’]/g,"'").replace(/[^a-z0-9'?]+/g,' ').replace(/\s+/g,' ').trim()}
function words(value){var s=String(value||'').trim();return s?s.split(/\s+/).filter(Boolean).length:0}
function key(){return 'englishgate:'+FLOW_VERSION+':preview'}
function fresh(){return {version:FLOW_VERSION,index:0,responses:{},results:{},attempts:{},subprogress:{},subresponses:{},complete:false,updatedAt:new Date().toISOString()}}
function read(){try{var x=JSON.parse(localStorage.getItem(key())||'null');return x&&x.version===FLOW_VERSION?Object.assign(fresh(),x):fresh()}catch(e){return fresh()}}
function write(state){state.updatedAt=new Date().toISOString();try{localStorage.setItem(key(),JSON.stringify(state))}catch(e){}}
function reset(){var s=fresh();write(s);return s}
function getR(state,i){return state.responses[String(i)]}
function setR(state,i,value){state.responses[String(i)]=value;write(state)}
function setOK(state,i,value){state.results[String(i)]=Boolean(value);write(state)}
function hit(state,i){var k=String(i);state.attempts[k]=Number(state.attempts[k]||0)+1;write(state);return state.attempts[k]}

function arrangeChoices(options,correctIndex,seed){
  var list=Array.isArray(options)?options.slice():[],n=list.length;
  if(n<2)return{options:list,answer:Math.max(0,Math.min(Number(correctIndex)||0,n-1))};
  var original=Math.max(0,Math.min(Number(correctIndex)||0,n-1)),desired=Math.abs(Number(seed)||0)%n,correct=list[original],others=list.filter(function(_,i){return i!==original}),out=new Array(n),oi=0;
  out[desired]=correct;
  for(var i=0;i<n;i++)if(i!==desired)out[i]=others[oi++];
  return{options:out,answer:desired}
}
function phaseFor(index){return STEPS[Math.max(0,Math.min(index,TOTAL-1))].phase}
function uiModeFor(index){
  var step=STEPS[Math.max(0,Math.min(index,TOTAL-1))]||{};
  if(step.phase==='SEE'||step.skill==='listening')return 'source';
  if(step.phase==='CHOOSE')return 'decision';
  if(step.phase==='CHANGE'||step.phase==='USE')return 'compose';
  return 'repair'
}
function phaseStrip(state){
  var current=phaseFor(state.index),currentIx=PHASES.indexOf(current);
  return '<div class="micro-framework" aria-label="Lesson flow">'+PHASES.map(function(p,i){
    return '<span class="'+(i<currentIx?'is-done':i===currentIx?'is-current':'')+'">'+(i<currentIx?'✓ ':'')+p+'</span>'
  }).join('')+'</div>'
}
function shell(body,state){
  var pct=state.complete?100:Math.round((state.index/TOTAL)*100),phase=phaseFor(state.index),step=STEPS[Math.max(0,Math.min(TOTAL-1,state.index))]||{},mode=uiModeFor(state.index);
  return '<div class="b2-microflow b2-northstar-flow" data-ui-mode="'+mode+'" data-phase="'+String(phase).toLowerCase()+'" data-skill="'+String(step.skill||'').toLowerCase()+'" data-step="'+(Number(state.index)+1)+'">'+
    '<div class="micro-top"><button class="ghost-btn" id="microBack" type="button">← Lessons</button>'+
      '<div class="micro-title"><small>B1 · Lesson 4</small><strong>Technology &amp; Social Media</strong></div>'+
      '<span class="micro-preview">Preview</span></div>'+
    phaseStrip(state)+
    '<div class="micro-history-nav"><button class="ghost-btn" id="microPrevious" type="button"'+((state.index<=0||(state.complete&&!reviewingComplete))?' hidden':'')+'>← Previous activity</button></div>'+
    '<div class="micro-progress-meta"><span>'+esc(phase)+'</span><span>Step '+(Number(state.index)+1)+' of '+TOTAL+'</span></div>'+
    '<div class="micro-progress" role="progressbar" aria-label="Lesson progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'"><span style="width:'+pct+'%"></span></div>'+
    '<main class="micro-stage">'+body+'</main></div>'
}
function speaker(name,text,you){
  return '<div class="micro-turn'+(you?' is-you':'')+'"><span class="micro-avatar">'+esc((name||'?').slice(0,1).toUpperCase())+'</span><div><small>'+esc(name)+'</small><p>'+esc(text)+'</p></div></div>'
}
function prompt(title,sub){return '<div class="micro-prompt"><h1>'+esc(title)+'</h1>'+(sub?'<p>'+esc(sub)+'</p>':'')+'</div>'}
function feedback(ok,title,text,buttonText){
  return '<div class="micro-feedback '+(ok?'is-good':'is-hint')+'"><strong>'+esc(title)+'</strong>'+(text?'<p>'+esc(text)+'</p>':'')+'<button class="'+(ok?'primary-btn':'ghost-btn')+'" id="microContinue" type="button">'+esc(buttonText||'Continue')+'</button></div>'
}
function choices(options){
  return '<div class="micro-choices">'+options.map(function(x,i){return '<button class="micro-choice" data-choice="'+i+'" type="button"><span>'+String.fromCharCode(65+i)+'</span><strong>'+esc(x)+'</strong></button>'}).join('')+'</div>'
}
function action(label,id,disabled){return '<div class="micro-action"><button class="primary-btn" id="'+id+'" type="button"'+(disabled?' disabled':'')+'>'+esc(label)+'</button></div>'}
function inputBox(id,placeholder,rows){return '<textarea id="'+id+'" rows="'+(rows||2)+'" placeholder="'+esc(placeholder||'Type here…')+'"></textarea>'}
function bindBack(){
  var b=el('microBack');if(b)b.onclick=leave;
  var p=el('microPrevious');
  if(p&&activeState){p.hidden=activeState.index<=0||(activeState.complete&&!reviewingComplete);p.onclick=function(){previous(activeState)}}
}

function readingSource(){
  return '<div class="northstar-reading"><span>Reading · A quieter phone, not no phone</span>'+READING_TEXT.split(/\n\n/).map(function(p){return '<p>'+esc(p)+'</p>'}).join('')+'</div>'
}
function playAudio(rate){
  if(!('speechSynthesis' in window))return;
  window.speechSynthesis.cancel();
  var u=new SpeechSynthesisUtterance(LISTENING_SCRIPT);
  u.rate=rate||0.92;u.pitch=1;
  window.speechSynthesis.speak(u)
}
function audioCard(){
  return '<div class="micro-help"><strong>Listen first</strong><span>Use normal speed. Replay when you need to.</span></div>'+
    '<div class="micro-action" style="justify-content:flex-start;gap:8px"><button class="primary-btn" id="microPlayAudio" type="button">▶ Play listening</button><button class="ghost-btn" id="microPlaySlow" type="button">Play slower</button></div>'
}
function bindAudio(){
  var play=el('microPlayAudio'),slow=el('microPlaySlow');
  if(play)play.onclick=function(){playAudio(.92)};
  if(slow)slow.onclick=function(){playAudio(.78)}
}

function renderQuestionSet(state,opts){
  var items=(opts.items||[]).slice(0,MIN_COMPREHENSION_QUESTIONS);
  if(!items.length)return;
  state.subprogress=state.subprogress||{};state.subresponses=state.subresponses||{};
  var keyName=String(opts.key||'questions'),pos=Math.max(0,Math.min(Number(state.subprogress[keyName]||0),items.length-1)),q=items[pos],arranged=arrangeChoices(q.options,q.answer,Number(state.index||0)+pos);
  var before=(pos===0?String(opts.intro||''):'')+(typeof opts.before==='function'?opts.before(pos):String(opts.before||''));
  var body=before+'<div class="micro-question-count">Question '+(pos+1)+' of '+items.length+'</div>'+prompt(q.q,opts.sub)+choices(arranged.options)+'<div id="microFeedbackSlot"></div>';
  el('content').innerHTML=shell(body,state);bindBack();
  if(typeof opts.afterRender==='function')opts.afterRender();
  Array.from(document.querySelectorAll('[data-choice]')).forEach(function(btn){
    btn.onclick=function(){
      if(el('microContinue'))return;
      var ix=Number(btn.dataset.choice),value=arranged.options[ix],ok=ix===arranged.answer;
      state.subresponses[keyName+':'+pos]=value;setOK(state,state.index,ok);hit(state,state.index);write(state);
      Array.from(document.querySelectorAll('[data-choice]')).forEach(function(b){b.disabled=true;b.classList.toggle('is-selected',b===btn)});
      var last=pos===items.length-1;
      el('microFeedbackSlot').innerHTML=feedback(ok,ok?'Correct.':'Try again.',ok?(opts.good||'You understood this part.'):(opts.bad||'Use the source and try again.'),ok?(last?'Next':'Next question'):'Try again');
      el('microContinue').onclick=function(){
        if(!ok)return renderQuestionSet(state,opts);
        if(last){
          setR(state,state.index,items.map(function(_,i){return String(state.subresponses[keyName+':'+i]||'')}).join(' | '));
          setOK(state,state.index,true);delete state.subprogress[keyName];write(state);return next(state)
        }
        state.subprogress[keyName]=pos+1;write(state);renderQuestionSet(state,opts)
      }
    }
  })
}

function renderChoice(state,opts){
  var arranged=arrangeChoices(opts.options,opts.answer,Number(state.index||0));
  var body=(opts.before||'')+prompt(opts.q,opts.sub)+choices(arranged.options)+'<div id="microFeedbackSlot"></div>';
  el('content').innerHTML=shell(body,state);bindBack();
  Array.from(document.querySelectorAll('[data-choice]')).forEach(function(btn){
    btn.onclick=function(){
      if(el('microContinue'))return;
      var ix=Number(btn.dataset.choice),value=arranged.options[ix],ok=ix===arranged.answer;
      setR(state,state.index,value);setOK(state,state.index,ok);hit(state,state.index);
      Array.from(document.querySelectorAll('[data-choice]')).forEach(function(b){b.disabled=true;b.classList.toggle('is-selected',b===btn)});
      el('microFeedbackSlot').innerHTML=feedback(ok,ok?'Correct.':'Try again.',ok?opts.good:opts.bad,ok?'Next':'Try again');
      el('microContinue').onclick=function(){if(ok)next(state);else render(state)}
    }
  })
}

function renderOpen(state,opts){
  var prior=String(getR(state,state.index)||'');
  var body=(opts.before||'')+prompt(opts.q,opts.sub)+(opts.help?'<div class="micro-help"><strong>Useful model</strong><span>'+esc(opts.help)+'</span></div>':'')+
    '<div class="micro-input">'+inputBox('microInput',opts.placeholder||'Type your answer…',opts.rows||2)+'</div>'+action(opts.button||'Check','microCheck',true)+'<div id="microFeedbackSlot"></div>';
  el('content').innerHTML=shell(body,state);bindBack();
  var box=el('microInput'),check=el('microCheck');box.value=prior;
  function valid(){return opts.validate?opts.validate(box.value):words(box.value)>=Number(opts.min||3)}
  function sync(){check.disabled=!valid()}box.oninput=sync;sync();
  check.onclick=function(){
    var value=box.value.trim();if(!valid())return;
    var ok=opts.correct?Boolean(opts.correct(value)):true;
    setR(state,state.index,value);setOK(state,state.index,ok);hit(state,state.index);
    box.disabled=true;check.disabled=true;
    el('microFeedbackSlot').innerHTML=feedback(true,opts.feedbackTitle||'Good.',ok?(opts.feedback||'You used the model in your own English.'):(opts.softFeedback||'Good attempt. Keep going — we will fix the important part at the end.'),'Next');
    el('microContinue').onclick=function(){next(state)}
  }
}

function digitalRelevant(value){return /phone|social|media|screen|notification|app|platform|privacy|setting|message|video|online|digital|scroll/i.test(String(value||''))}
function ppcCorrect(value){return /\b(?:i|we|you|they)\s+(?:have|'ve)\s+been\s+\w+ing\b/i.test(value)||/\b(?:he|she|it)\s+(?:has|'s)\s+been\s+\w+ing\b/i.test(value)}
function shortPersonal(value){return words(value)>=6&&digitalRelevant(value)}
function useRelevant(value){return words(value)>=12&&digitalRelevant(value)}
function postValid(value){var n=words(value);return n>=80&&n<=120}
function postHasResult(value){return /\bbecause\b|\bso\b|\bhelp(?:ed|s|ing)?\b|\bresult\b|\bbetter\b|\bfocus|\bsleep|\bconcentrat/i.test(value)}
function postHasClose(value){return /\btry\b|\brecommend\b|\bsuggest\b|\bshould\b|\bwhat about\b|\bhow about\b|\?/i.test(value)}
function postHasTarget(value){return ppcCorrect(value)||/\brecently\b|\blately\b|\bthis week\b/i.test(value)}

function renderReading(state){
  return renderQuestionSet(state,{key:'reading',items:READING_QUESTIONS,intro:prompt('Read for meaning.','Answer three short questions. One question appears at a time.'),before:function(){return readingSource()},sub:'Use the text as your source.',good:'That answer is supported by the text.',bad:'Check the text and try again.'})
}
function renderListening(state){
  return renderQuestionSet(state,{key:'listening',items:LISTENING_QUESTIONS,intro:prompt('Listen for meaning.','Answer three short questions. Replay the audio when you need to.'),before:function(){return audioCard()},sub:'Choose the answer supported by what you hear.',good:'You caught the key information.',bad:'Replay the audio and listen for the detail in the question.',afterRender:bindAudio})
}

function renderPost(state){
  var prior=String(getR(state,8)||'');
  var body=prompt('Write a short social post.','80–120 words. Describe one digital habit you have been changing, one result, and finish with one practical suggestion or question.')+
    '<div class="micro-help"><strong>Useful shape</strong><span>Recently, I have been… · This has helped… · One thing I still find difficult is… · My suggestion is…</span></div>'+ '<div class="micro-input">'+inputBox('microInput','Recently, I have been changing one digital habit…',8)+'</div>'+ '<div class="micro-counter" id="microCounter">0 / 80–120 words</div>'+action('Check post','microCheck',true)+'<div id="microFeedbackSlot"></div>';
  el('content').innerHTML=shell(body,state);bindBack();
  var box=el('microInput'),check=el('microCheck'),counter=el('microCounter');box.value=prior;
  function sync(){var n=words(box.value);counter.textContent=n+' / 80–120 words';check.disabled=!(n>=80&&n<=120)}
  box.oninput=sync;sync();
  check.onclick=function(){
    var value=box.value.trim();if(!postValid(value))return;
    var strong=postHasResult(value)&&postHasClose(value)&&postHasTarget(value);
    setR(state,8,value);setOK(state,8,strong);hit(state,8);
    box.disabled=true;check.disabled=true;
    el('microFeedbackSlot').innerHTML=feedback(true,strong?'Your post has a clear purpose.':'Good first post.',strong?'You described a change, showed a result and closed with a useful suggestion or question.':'Keep it. The final FIX step will improve only the most important missing part.','Check result');
    el('microContinue').onclick=function(){next(state)}
  }
}

function repairMode(state){
  var grammar=String(getR(state,6)||''),post=String(getR(state,8)||'');
  if(!ppcCorrect(grammar))return{type:'grammar',source:grammar};
  if(!postHasTarget(post))return{type:'target',source:post};
  if(!postHasResult(post))return{type:'result',source:post};
  if(!postHasClose(post))return{type:'close',source:post};
  return{type:'none',source:post}
}
function renderRepair(state){
  var mode=repairMode(state),prior=String(getR(state,9)||''),title,sub,help,placeholder,validate;
  if(mode.type==='none'){
    var body=prompt('No correction needed.','Your target sentence and social post already meet the main lesson target.')+'<div class="micro-help"><strong>Your result</strong><span>You used the target pattern and completed a purposeful digital-life post.</span></div>'+action('Finish lesson','microFinish',false);
    el('content').innerHTML=shell(body,state);bindBack();
    el('microFinish').onclick=function(){setR(state,9,'No repair needed');setOK(state,9,true);finish(state)};
    return
  }
  if(mode.type==='grammar'){
    title='Fix your ongoing-habit sentence.';sub='Use have/has + been + verb-ing for an activity continuing up to now.';help="I've been checking my phone less this week.";placeholder="I've been…";validate=ppcCorrect;
  }else if(mode.type==='target'){
    title='Add one target-language sentence.';sub='Add one sentence about something you have been doing recently.';help="I've been leaving my phone in another room while I study.";placeholder="I've been…";validate=function(v){return words(v)>=7&&ppcCorrect(v)};
  }else if(mode.type==='result'){
    title='Make the result clear.';sub='Add one sentence explaining what changed or why the new habit helps.';help='This has helped me concentrate better in the evening.';placeholder='This has helped me…';validate=function(v){return words(v)>=7&&postHasResult(v)};
  }else{
    title='Give the reader a useful next step.';sub='Finish with one practical suggestion or question.';help='Try turning off one notification today. Does it help you focus?';placeholder='My suggestion is…';validate=function(v){return words(v)>=7&&postHasClose(v)};
  }
  var body=prompt(title,sub)+'<div class="micro-help"><strong>Model</strong><span>'+esc(help)+'</span></div>'+ '<div class="micro-input">'+inputBox('microInput',placeholder,2)+'</div>'+action('Check fix','microCheck',true)+'<div id="microFeedbackSlot"></div>';
  el('content').innerHTML=shell(body,state);bindBack();
  var box=el('microInput'),check=el('microCheck');box.value=prior;
  function sync(){check.disabled=!validate(box.value)}box.oninput=sync;sync();
  check.onclick=function(){
    var value=box.value.trim();if(!validate(value))return;
    setR(state,9,value);setOK(state,9,true);hit(state,9);
    if(mode.type==='grammar')setOK(state,6,true);
    if(mode.type!=='grammar'){
      var post=String(getR(state,8)||'').trim();
      if(post&&value&&!post.includes(value))setR(state,8,post+' '+value);
      setOK(state,8,true)
    }
    box.disabled=true;check.disabled=true;
    el('microFeedbackSlot').innerHTML=feedback(true,'Fixed.','You improved one important part instead of correcting everything at once.','Finish lesson');
    el('microContinue').onclick=function(){finish(state)}
  }
}

function render(state){
  activeState=state;
  if(state.complete&&!reviewingComplete){renderDone(state);return}
  var i=state.index;
  if(i===0)return renderReading(state);
  if(i===1)return renderChoice(state,{before:'<div class="micro-scene">'+speaker('Hodan',"I've been trying to reduce my screen time this week.")+'</div>',q:'Which reply keeps the conversation moving?',options:['Has anything helped so far?','Screen time yesterday.','You use phone.'],answer:0,good:'It responds directly and invites Hodan to say more.',bad:'Choose the complete follow-up connected to what Hodan just said.'});
  if(i===2)return renderListening(state);
  if(i===3)return renderChoice(state,{before:'<div class="micro-scene">'+speaker('Hodan','Short videos can become a distraction when I need to work.')+'</div>',q:'What does “distraction” mean here?',options:['Something that takes your attention away','A setting that protects your privacy','A message from an app'],answer:0,good:'Right. A distraction pulls your attention away from the task.',bad:'Use the work context around the word.'});
  if(i===4)return renderChoice(state,{before:'<div class="micro-scene">'+speaker('Hodan',"I've been checking my phone too often lately.")+'</div>',q:'Which question is the best follow-up?',options:['What have you been doing to change that?','What colour is your phone?','Did phone yesterday?'],answer:0,good:'The question connects to the habit and invites a useful answer.',bad:'Choose the question that follows Hodan’s last idea.'});
  if(i===5)return renderOpen(state,{before:"<div class=\"northstar-model\"><small>Model</small><strong>I've been leaving my phone in another room while I study.</strong></div>",q:'Change the model so it is true for you.',sub:'One short sentence about a real digital habit is enough.',help:"I've been turning off notifications while I work.",placeholder:"I've been…",button:'Use my sentence',validate:shortPersonal,feedbackTitle:'Good.',feedback:'You changed a useful model into your own English.'});
  if(i===6)return renderOpen(state,{before:'<div class="micro-scene">'+speaker('Hodan',"I've been checking my screen-time report every evening.")+'</div>',q:'Write one sentence about something you have been doing recently.',sub:'Use have/has been + verb-ing if you can.',help:"I've been using social media less before bed.",placeholder:"I've been…",button:'Use my sentence',validate:function(v){return words(v)>=6&&digitalRelevant(v)},correct:ppcCorrect,feedbackTitle:'Nice use of the pattern.',feedback:'Your sentence describes an activity continuing or repeating up to now.',softFeedback:'Your idea is useful. We will repair the grammar once at the end.'});
  if(i===7)return renderOpen(state,{before:'<div class="micro-scene">'+speaker('Hodan','What digital habit have you been changing, and has it helped?')+'</div>',q:'Reply in 2–3 sentences.',sub:'This is the same kind of short, personal response used in Help Me Practice. Production is voice-first and hands-free.',help:"I've been turning off notifications while I study. It has helped me focus, but I still check messages during breaks.",placeholder:'I have been…',rows:4,button:'Reply',validate:useRelevant,feedbackTitle:'That works.',feedback:'You gave a personal example and enough information for a follow-up.'});
  if(i===8)return renderPost(state);
  if(i===9)return renderRepair(state)
}

function previous(state){if(!state||state.index<=0)return;if(state.complete)reviewingComplete=true;state.index=Math.max(0,state.index-1);write(state);render(state);window.scrollTo({top:0,behavior:'smooth'})}
function next(state){state.index=Math.min(TOTAL-1,state.index+1);write(state);render(state);window.scrollTo({top:0,behavior:'smooth'})}
function scoreFor(state,skill){var indexes=STEPS.map(function(x,i){return x.skill===skill?i:-1}).filter(function(i){return i>=0});if(!indexes.length)return 100;var sum=indexes.reduce(function(n,i){return n+(state.results[String(i)]?1:0)},0);return Math.round(sum/indexes.length*100)}
function finish(state){state.complete=true;write(state);renderDone(state)}
function renderDone(state){
  activeState=state;reviewingComplete=false;
  var skills=['reading','listening','vocabulary','grammar','speaking','writing'];
  var overall=Math.round(skills.reduce(function(n,s){return n+scoreFor(state,s)},0)/skills.length);
  var body='<div class="micro-complete"><div class="micro-complete-mark">✓</div><small>Lesson complete</small>'+ '<h1>You worked through Technology &amp; Social Media using the current EnglishGate activity rhythm.</h1>'+ '<p>See it, choose it, change it, use it, fix it.</p>'+ '<div class="micro-summary"><div><strong>'+TOTAL+'</strong><span>short actions</span></div><div><strong>'+overall+'%</strong><span>practice evidence</span></div><div><strong>1</strong><span>real social post</span></div></div>'+ '<p class="micro-save-status">Preview only — nothing was saved to production.</p>'+ '<div class="micro-finish-actions"><button class="primary-btn" id="microExit" type="button">Back to surfaces</button><button class="ghost-btn" id="microReview" type="button">Review activities</button><button class="ghost-btn" id="microRestart" type="button">Practise again</button></div></div>';
  el('content').innerHTML=shell(body,state);bindBack();
  el('microExit').onclick=leave;
  el('microReview').onclick=function(){reviewingComplete=true;render(state);window.scrollTo({top:0,behavior:'smooth'})};
  el('microRestart').onclick=function(){reviewingComplete=false;render(reset())}
}
function leave(){window.location.href='/course-factory-b1-gold-l4-preview.html'}
function start(){reviewingComplete=false;render(read());window.scrollTo({top:0})}

window.ENGLISHGATE_B1_GOLD_L4_MICROFLOW={version:FLOW_VERSION,framework:'SEE_CHOOSE_CHANGE_USE_FIX',total:TOTAL,phases:PHASES.slice(),steps:STEPS.map(function(x){return Object.assign({},x)}),reset:function(){render(reset())},logic:{ppcCorrect:ppcCorrect,digitalRelevant:digitalRelevant,postValid:postValid,postHasResult:postHasResult,postHasClose:postHasClose}};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();