/* EnglishGate B2 Lesson 1 — conversation microflow v1
   Scope: su-b2-l1 only. The pedagogical stages remain analytics metadata;
   learners experience one continuous conversation. */
(function(){
'use strict';

const LESSON_ID='su-b2-l1';
const TOTAL=15;
const FLOW_VERSION='b2-l1-microflow-v1';

function esc(value){
  if(typeof escapeHtml==='function')return escapeHtml(String(value==null?'':value));
  return String(value==null?'':value).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]});
}
function attr(value){
  if(typeof escapeAttr==='function')return escapeAttr(String(value==null?'':value));
  return esc(value);
}
function words(value){var s=String(value||'').trim();return s?s.split(/\s+/).filter(Boolean).length:0}
function normal(value){return String(value||'').toLowerCase().replace(/[’]/g,"'").replace(/[^a-z0-9']+/g,' ').trim()}
function preview(){return typeof isWorkbookPreview==='function'&&isWorkbookPreview()}
function key(){return 'englishgate:'+FLOW_VERSION+':'+(session&&session.id?session.id:'preview')}
function fresh(){return {version:FLOW_VERSION,index:0,responses:{},results:{},attempts:{},strategy:'',saved:false,complete:false,updatedAt:new Date().toISOString()}}
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
function getResponse(state,i){return state.responses[String(i)]}
function setResponse(state,i,value){state.responses[String(i)]=value;write(state)}
function setResult(state,i,value){state.results[String(i)]=Boolean(value);write(state)}
function attempt(state,i){var k=String(i);state.attempts[k]=Number(state.attempts[k]||0)+1;write(state);return state.attempts[k]}

function adaptiveQuestion(state){
  var text=String(getResponse(state,3)||'');
  if(typeof b2AdaptiveFollowUp==='function')return b2AdaptiveFollowUp(text);
  var t=text.toLowerCase();
  if(/teacher|school|education/.test(t))return 'What do you teach, and what do you enjoy most about it?';
  if(/bank|finance/.test(t))return 'What do you mainly do there?';
  if(/business|company|shop/.test(t))return 'What kind of customers do you usually work with?';
  if(/student|study|university/.test(t))return 'What are you studying?';
  return 'And what do you do?';
}
function strategyReply(state){
  var v=state.strategy;
  if(v==='ask')return {sara:'Getting everyone to use the same process has been the hardest part.',q:'Have you ever had a similar problem at work or while studying?'};
  if(v==='connect')return {sara:'Really? That sounds like something we have in common.',q:'What kind of technology work are you doing?'};
  return {sara:'Exactly. I am still learning this side of the job too.',q:'Has your role changed much recently?'};
}
function speaker(name,text){
  return '<div class="micro-turn '+(name==='You'?'is-you':'is-sara')+'"><span class="micro-avatar">'+(name==='You'?'Y':'S')+'</span><div><small>'+esc(name)+'</small><p>'+esc(text)+'</p></div></div>'
}
function shell(body,state){
  var progress=Math.round(((Math.min(state.index,TOTAL-1)+1)/TOTAL)*100);
  var p=preview()?'<span class="micro-preview">Preview</span>':'';
  return '<section class="b2-microflow">'+
    '<header class="micro-top">'+
      '<button class="ghost-btn micro-back" id="microBack" type="button">← Lessons</button>'+
      '<div class="micro-title"><small>B2 · Getting Acquainted</small><strong>Coffee-break conversation</strong></div>'+p+
    '</header>'+
    '<div class="micro-progress" aria-label="Lesson progress"><span style="width:'+progress+'%"></span></div>'+
    '<main class="micro-stage">'+body+'</main>'+
  '</section>'
}
function prompt(text,sub){
  return '<div class="micro-prompt"><h1>'+esc(text)+'</h1>'+(sub?'<p>'+esc(sub)+'</p>':'')+'</div>'
}
function choices(items){
  return '<div class="micro-choices">'+items.map(function(x,i){
    return '<button type="button" class="micro-choice" data-choice="'+i+'"><span>'+String.fromCharCode(65+i)+'</span><strong>'+esc(x)+'</strong></button>'
  }).join('')+'</div>'
}
function inputBox(id,placeholder,rows){
  return rows>1?'<textarea id="'+id+'" rows="'+rows+'" placeholder="'+attr(placeholder)+'" autocomplete="off"></textarea>':'<input id="'+id+'" type="text" placeholder="'+attr(placeholder)+'" autocomplete="off">'
}
function action(label,id,disabled){
  return '<div class="micro-action"><button class="primary-btn" id="'+id+'" type="button" '+(disabled?'disabled':'')+'>'+esc(label)+'</button></div>'
}
function feedback(good,title,text,continueLabel){
  return '<div class="micro-feedback '+(good?'is-good':'is-hint')+'" id="microFeedback"><strong>'+esc(title)+'</strong><p>'+esc(text)+'</p>'+
    (continueLabel?'<button class="primary-btn" id="microContinue" type="button">'+esc(continueLabel)+'</button>':'')+'</div>'
}
function hiddenMeta(stage,skill){
  return '<span class="micro-meta" aria-hidden="true" data-learning-stage="'+attr(stage)+'" data-evidence-skill="'+attr(skill)+'"></span>'
}

const STEPS=[
  {stage:'scenario',skill:'listening',type:'choice'},
  {stage:'understand',skill:'listening',type:'choice'},
  {stage:'interact',skill:'grammar',type:'build'},
  {stage:'interact',skill:'writing',type:'open'},
  {stage:'interact',skill:'writing',type:'open'},
  {stage:'understand',skill:'vocabulary',type:'choice'},
  {stage:'interact',skill:'listening',type:'choice'},
  {stage:'interact',skill:'grammar',type:'build'},
  {stage:'interact',skill:'writing',type:'open'},
  {stage:'interact',skill:'listening',type:'strategy'},
  {stage:'interact',skill:'writing',type:'open'},
  {stage:'interact',skill:'writing',type:'open'},
  {stage:'interact',skill:'listening',type:'choice'},
  {stage:'produce',skill:'writing',type:'message'},
  {stage:'improve',skill:'grammar',type:'repair'}
];

function renderChoice(state,opts){
  var selected=getResponse(state,state.index);
  var body=hiddenMeta(opts.stage,opts.skill)+
    '<div class="micro-scene">'+speaker('Sara',opts.sara)+'</div>'+
    prompt(opts.q,opts.sub)+choices(opts.options)+
    '<div id="microFeedbackSlot"></div>';
  $('content').innerHTML=shell(body,state);
  bindBack();
  Array.from(document.querySelectorAll('[data-choice]')).forEach(function(btn){
    btn.onclick=function(){
      if(document.getElementById('microContinue'))return;
      var ix=Number(btn.dataset.choice),value=opts.options[ix],ok=ix===opts.answer;
      setResponse(state,state.index,value);setResult(state,state.index,ok);attempt(state,state.index);
      Array.from(document.querySelectorAll('[data-choice]')).forEach(function(b){b.disabled=true;b.classList.toggle('is-selected',b===btn)});
      document.getElementById('microFeedbackSlot').innerHTML=feedback(ok,ok?'That works.':'Not quite.',ok?opts.good:opts.bad,'Continue');
      document.getElementById('microContinue').onclick=function(){next(state)};
    }
  });
  if(selected!=null){}
}
function renderOpen(state,opts){
  var prior=String(getResponse(state,state.index)||'');
  var scene='<div class="micro-scene">'+(opts.before||'')+speaker('Sara',typeof opts.sara==='function'?opts.sara(state):opts.sara)+'</div>';
  var body=hiddenMeta(opts.stage,opts.skill)+scene+prompt(opts.q,opts.sub)+
    '<div class="micro-input">'+inputBox('microInput',opts.placeholder||'Type your response…',opts.rows||2)+
    (opts.mic?'<button class="ghost-btn micro-mic" id="microMic" type="button">Use microphone</button>':'')+'</div>'+
    action(opts.button||'Reply','microCheck',!prior.trim())+'<div id="microFeedbackSlot"></div>';
  $('content').innerHTML=shell(body,state);bindBack();
  var box=document.getElementById('microInput'),check=document.getElementById('microCheck');
  box.value=prior;
  box.oninput=function(){check.disabled=words(box.value)<Number(opts.min||3)};
  wireMic(box);
  check.onclick=function(){
    var value=box.value.trim();if(words(value)<Number(opts.min||3))return;
    setResponse(state,state.index,value);setResult(state,state.index,true);attempt(state,state.index);
    box.disabled=true;check.disabled=true;
    document.getElementById('microFeedbackSlot').innerHTML=feedback(true,opts.feedbackTitle||'Nice.',typeof opts.feedback==='function'?opts.feedback(state,value):opts.feedback,'Continue');
    document.getElementById('microContinue').onclick=function(){next(state)};
  }
}
function renderBuild(state,opts){
  var answer=Array.isArray(getResponse(state,state.index))?getResponse(state,state.index):[];
  var shuffled=opts.tiles.slice();
  if(!answer.length){shuffled=opts.order.map(function(i){return opts.tiles[i]})}
  var body=hiddenMeta(opts.stage,opts.skill)+'<div class="micro-scene">'+speaker('Sara',opts.sara)+'</div>'+
    prompt(opts.q,opts.sub)+
    '<div class="micro-builder-answer" id="microBuilderAnswer"><span>Build your sentence here</span></div>'+
    '<div class="micro-wordbank" id="microWordbank">'+shuffled.map(function(x,i){return '<button type="button" data-tile="'+i+'">'+esc(x)+'</button>'}).join('')+'</div>'+
    action('Check','microCheck',true)+'<div id="microFeedbackSlot"></div>';
  $('content').innerHTML=shell(body,state);bindBack();
  var chosen=[];
  function sync(){
    var ans=document.getElementById('microBuilderAnswer');
    ans.innerHTML=chosen.length?chosen.map(function(x,i){return '<button type="button" data-chosen="'+i+'">'+esc(x)+'</button>'}).join(''):'<span>Build your sentence here</span>';
    document.getElementById('microCheck').disabled=!chosen.length;
    Array.from(ans.querySelectorAll('[data-chosen]')).forEach(function(b){b.onclick=function(){var word=chosen.splice(Number(b.dataset.chosen),1)[0];addBank(word);sync()}});
  }
  function addBank(word){
    var b=document.createElement('button');b.type='button';b.textContent=word;b.onclick=function(){chosen.push(word);b.remove();sync()};document.getElementById('microWordbank').appendChild(b)
  }
  Array.from(document.querySelectorAll('#microWordbank button')).forEach(function(b){b.onclick=function(){chosen.push(b.textContent);b.remove();sync()}});
  document.getElementById('microCheck').onclick=function(){
    var made=chosen.join(' '),ok=normal(made)===normal(opts.expected);
    setResponse(state,state.index,chosen.slice());setResult(state,state.index,ok);attempt(state,state.index);
    document.getElementById('microFeedbackSlot').innerHTML=feedback(ok,ok?'Exactly.':'Try that pattern again.',ok?opts.good:opts.bad,ok?'Continue':'Reset');
    document.getElementById('microContinue').onclick=function(){
      if(ok){next(state);return}
      chosen=[];document.getElementById('microWordbank').innerHTML='';
      opts.order.map(function(i){return opts.tiles[i]}).forEach(addBank);sync();
      document.getElementById('microFeedbackSlot').innerHTML=''
    }
  };
  sync()
}
function renderStrategy(state){
  var options=[
    {id:'react',label:'React',text:'I know the feeling. My role has changed too.'},
    {id:'ask',label:'Ask',text:'What has been the hardest part of that change?'},
    {id:'connect',label:'Connect',text:'We have something in common. I am also working more with technology.'}
  ];
  var body=hiddenMeta('interact','listening')+
    '<div class="micro-scene">'+speaker('Sara','I started in customer service, but now I coordinate some of our digital projects. I am still learning that side of the job.')+'</div>'+
    prompt('She has given you a conversation cue. What do you want to do with it?','All three moves can work. Choose how you want the conversation to develop.')+
    '<div class="micro-strategies">'+options.map(function(x){return '<button type="button" data-strategy="'+x.id+'"><small>'+x.label+'</small><strong>'+esc(x.text)+'</strong></button>'}).join('')+'</div>'+
    '<div id="microFeedbackSlot"></div>';
  $('content').innerHTML=shell(body,state);bindBack();
  Array.from(document.querySelectorAll('[data-strategy]')).forEach(function(btn){
    btn.onclick=function(){
      if(document.getElementById('microContinue'))return;
      state.strategy=btn.dataset.strategy;setResponse(state,state.index,btn.textContent.trim());setResult(state,state.index,true);attempt(state,state.index);write(state);
      Array.from(document.querySelectorAll('[data-strategy]')).forEach(function(b){b.disabled=true;b.classList.toggle('is-selected',b===btn)});
      document.getElementById('microFeedbackSlot').innerHTML=feedback(true,'Good conversation move.','You used what Sara said instead of jumping to an unrelated question.','See what Sara says');
      document.getElementById('microContinue').onclick=function(){next(state)}
    }
  })
}
function renderMessage(state){
  var prior=String(getResponse(state,state.index)||'');
  var body=hiddenMeta('produce','writing')+
    '<div class="micro-phone"><div class="micro-phone-head">Sara · WhatsApp</div>'+speaker('Sara','Great meeting you today. I hope the rest of the workshop was useful!')+'</div>'+
    prompt('Reply naturally.','Write 2–3 short sentences. Mention something from your conversation and give Sara a reason to stay in touch.')+
    '<div class="micro-input">'+inputBox('microInput','Hi Sara, it was great meeting you too…',4)+'</div>'+
    '<label class="micro-share"><input type="checkbox" id="microShare"> <span>Share this later in My Writings</span></label>'+
    '<div class="micro-counter" id="microCounter">0 words</div>'+
    action('Send reply','microCheck',true)+'<div id="microFeedbackSlot"></div>';
  $('content').innerHTML=shell(body,state);bindBack();
  var box=document.getElementById('microInput'),check=document.getElementById('microCheck'),counter=document.getElementById('microCounter');
  box.value=prior;
  function sync(){var n=words(box.value);counter.textContent=n+' words';check.disabled=n<12}
  box.oninput=sync;sync();
  check.onclick=function(){
    var value=box.value.trim();if(words(value)<12)return;
    setResponse(state,state.index,value);state.share=Boolean(document.getElementById('microShare').checked);setResult(state,state.index,true);attempt(state,state.index);write(state);
    box.disabled=true;check.disabled=true;
    document.getElementById('microFeedbackSlot').innerHTML=feedback(true,'Sent.','Short, specific and easy to reply to — exactly what a real follow-up message needs.','One last challenge');
    document.getElementById('microContinue').onclick=function(){next(state)}
  }
}
function renderRepair(state){
  var prior=String(getResponse(state,state.index)||'');
  var body=hiddenMeta('improve','grammar')+
    '<div class="micro-scene">'+speaker('Sara','Before we go — how long have you been doing your current work, course or main activity?')+'</div>'+
    prompt('Answer from memory.','Use for or since. EnglishGate will only help if you need it.')+
    '<div class="micro-input">'+inputBox('microInput','I have worked here for three years.',2)+'</div>'+
    action('Check','microCheck',!prior.trim())+'<div id="microFeedbackSlot"></div>';
  $('content').innerHTML=shell(body,state);bindBack();
  var box=document.getElementById('microInput'),check=document.getElementById('microCheck');
  box.value=prior;box.oninput=function(){check.disabled=words(box.value)<5};
  check.onclick=function(){
    var value=box.value.trim(),t=normal(value);
    var hasTime=/\b(for|since)\b/.test(t);
    var hasPerfect=/\b(have|ve|has)\b/.test(t)&&/\b(worked|studied|lived|been|done|taught|run|managed|worked)\b/.test(t);
    var ok=words(value)>=5&&hasTime&&hasPerfect;
    setResponse(state,state.index,value);setResult(state,state.index,ok);var n=attempt(state,state.index);
    if(ok){
      box.disabled=true;check.disabled=true;
      document.getElementById('microFeedbackSlot').innerHTML=feedback(true,'You retrieved it.','You used present perfect with for/since without seeing the model first.','Finish lesson');
      document.getElementById('microContinue').onclick=function(){finish(state)}
    }else{
      var tip=n===1?'The activity started in the past and continues now. Try: have/has + past participle + for/since.':'Model: “I have worked here for three years.” Now make the sentence true for you.';
      document.getElementById('microFeedbackSlot').innerHTML=feedback(false,'Almost.',tip,'Try again');
      document.getElementById('microContinue').onclick=function(){document.getElementById('microFeedbackSlot').innerHTML='';box.focus()}
    }
  }
}
function wireMic(box){
  var btn=document.getElementById('microMic');if(!btn)return;
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){btn.hidden=true;return}
  btn.onclick=function(){
    var r=new SR();r.lang='en-US';r.interimResults=false;r.maxAlternatives=1;btn.disabled=true;btn.textContent='Listening…';
    r.onresult=function(e){var text=e.results&&e.results[0]&&e.results[0][0]?e.results[0][0].transcript:'';if(text){box.value=text;box.dispatchEvent(new Event('input',{bubbles:true}))}};
    r.onend=function(){btn.disabled=false;btn.textContent='Use microphone'};r.onerror=function(){};r.start()
  }
}

function render(state){
  var i=state.index;
  if(state.complete){renderDone(state);return}
  if(i===0)return renderChoice(state,{stage:'scenario',skill:'listening',sara:"Hi, I don't think we've met. I'm Sara.",q:'You have about two seconds to respond. What sounds natural?',options:["Nice to meet you. I'm Ahmed.","Yes, workshop.","I am meet you."],answer:0,good:'You returned the greeting and introduced yourself naturally.',bad:'In a first meeting, respond to the person and give them something easy to respond to.'});
  if(i===1)return renderChoice(state,{stage:'understand',skill:'listening',sara:'What brought you to the workshop?',q:'What does Sara want to know?',options:['Why you came','Where you live','How old you are'],answer:0,good:'Exactly. “What brought you here?” asks for the reason you came.',bad:'Listen to the purpose of the question, not just individual words.'});
  if(i===2)return renderBuild(state,{stage:'interact',skill:'grammar',sara:'What brought you to the workshop?',q:'Build one natural answer.',tiles:["I'm","here","because","I want to","improve","my digital skills."],order:[2,0,5,1,4,3],expected:"I'm here because I want to improve my digital skills.",good:'That answer gives Sara a clear reason and enough detail to continue.',bad:'Start with “I’m here because…” and complete one clear idea.'});
  if(i===3)return renderOpen(state,{stage:'interact',skill:'writing',sara:'What brought you here?',q:'Now make the answer yours.',sub:'One real sentence is enough.',placeholder:'I came because…',rows:2,min:4,button:'Reply',feedbackTitle:'Good — now it is your conversation.',feedback:'A real detail creates a much better next question than a memorised introduction.'});
  if(i===4)return renderOpen(state,{stage:'interact',skill:'writing',sara:function(s){return adaptiveQuestion(s)},q:'Answer Sara briefly.',sub:'Give one useful detail she can react to.',placeholder:'I work in… / I study… / I run…',rows:2,min:4,mic:true,button:'Reply',feedbackTitle:'That gives Sara a conversation cue.',feedback:'You gave enough information for the conversation to move somewhere specific.'});
  if(i===5)return renderChoice(state,{stage:'understand',skill:'vocabulary',sara:'I started in customer service, but these days I coordinate some of our digital projects.',q:'In this conversation, what does “coordinate” mean?',options:['Organize people and tasks so they work together','Design every technical detail alone','Only answer customer complaints'],answer:0,good:'Right. The meaning comes from Sara describing a broader role.',bad:'Use the job context: Sara moved from one role into organizing digital work.'});
  if(i===6)return renderChoice(state,{stage:'interact',skill:'listening',sara:'I am still learning that side of the job, though.',q:'Which follow-up sounds like you actually listened?',options:['What kind of projects are you working on?','Do you work?','How old is your office?'],answer:0,good:'Yes. It picks up the exact conversation cue Sara just gave you.',bad:'A strong follow-up grows directly from the other person’s last idea.'});
  if(i===7)return renderBuild(state,{stage:'interact',skill:'grammar',sara:'These days I coordinate some of our digital projects.',q:'Build the follow-up question.',tiles:['What','kind of','projects','are you','working on?'],order:[3,1,4,0,2],expected:'What kind of projects are you working on?',good:'Natural, specific and open enough for Sara to say more.',bad:'Start with “What kind of…” and keep the question connected to projects.'});
  if(i===8)return renderOpen(state,{stage:'interact',skill:'writing',sara:'We are trying to improve how we communicate with customers online.',q:'Ask Sara one relevant question of your own.',sub:'Do not repeat the model. Follow the conversation.',placeholder:'What…?',rows:2,min:4,mic:true,button:'Ask',feedbackTitle:'Good follow-up.',feedback:'You are now generating the question instead of selecting one.'});
  if(i===9)return renderStrategy(state);
  if(i===10){
    var r=strategyReply(state);
    return renderOpen(state,{stage:'interact',skill:'writing',before:speaker('You',state.strategy==='ask'?'What has been the hardest part of that change?':state.strategy==='connect'?'We have something in common. I am also working more with technology.':'I know the feeling. My role has changed too.'),sara:r.sara,q:r.q,sub:'Respond naturally — 1 or 2 sentences.',placeholder:'For me…',rows:2,min:4,mic:true,button:'Reply',feedbackTitle:'The conversation is moving.',feedback:'Your previous choice changed what Sara asked next.'})
  }
  if(i===11)return renderOpen(state,{stage:'interact',skill:'writing',sara:'What are you hoping to learn or improve this year?',q:'Answer with one real goal.',sub:'Give a little detail so Sara can understand why it matters.',placeholder:'This year I want to… because…',rows:3,min:6,mic:true,button:'Reply',feedbackTitle:'Specific beats impressive.',feedback:'A clear personal goal sounds more natural than a long prepared speech.'});
  if(i===12)return renderChoice(state,{stage:'interact',skill:'listening',sara:'The break is nearly over. It was really nice talking to you.',q:'How would you close naturally?',options:['Great talking to you too. It would be good to stay in touch.','End of conversation.','Yes, break finished.'],answer:0,good:'That closes the moment and leaves the relationship open.',bad:'A natural closing responds warmly and signals what happens next.'});
  if(i===13)return renderMessage(state);
  if(i===14)return renderRepair(state)
}

function next(state){state.index=Math.min(TOTAL-1,state.index+1);write(state);render(state);if(typeof resetAppScroll==='function')resetAppScroll()}
function scoreFor(state,skill){
  var indexes=STEPS.map(function(x,i){return x.skill===skill?i:-1}).filter(function(i){return i>=0});
  if(!indexes.length)return 100;
  var sum=indexes.reduce(function(n,i){return n+(state.results[String(i)]?1:0)},0);
  return Math.round(sum/indexes.length*100)
}
async function saveEvidence(state){
  if(preview()||state.saved||!session||session.role!=='student')return;
  var l=lesson(),skills=['vocabulary','listening','grammar','writing'];
  for(var i=0;i<skills.length;i++){
    var skill=skills[i],tags=['microflow:v1','integrated:real-life'];
    STEPS.forEach(function(x,n){if(x.skill===skill)tags.push('stage:'+x.stage+':step'+(n+1))});
    await recordAttempt(session.id,l.id,skill,scoreFor(state,skill),tags.slice(0,10));
    await markDone(session.id,l.id,skill)
  }
  var message=String(getResponse(state,13)||'').trim();
  if(message){
    await api('/api/writing/'+encodeURIComponent(l.id),{method:'PUT',body:JSON.stringify({content:message,publishToCommunity:Boolean(state.share)})})
  }
  await refreshState();
  state.saved=true;write(state)
}
async function finish(state){
  state.complete=true;write(state);renderDone(state);
  try{await saveEvidence(state);renderDone(state)}catch(e){
    var slot=document.getElementById('microSaveStatus');
    if(slot)slot.textContent='Your lesson is complete on this device. Progress sync needs another try: '+e.message
  }
}
function renderDone(state){
  var overall=Math.round((scoreFor(state,'vocabulary')+scoreFor(state,'listening')+scoreFor(state,'grammar')+scoreFor(state,'writing'))/4);
  var body='<div class="micro-complete">'+
    '<div class="micro-complete-mark">✓</div>'+
    '<small>Conversation complete</small>'+
    '<h1>You met Sara, kept the conversation moving and followed up afterward.</h1>'+
    '<p>The learning stages stayed in the background. You experienced one continuous situation instead.</p>'+
    '<div class="micro-summary"><div><strong>'+TOTAL+'</strong><span>micro-interactions</span></div><div><strong>'+overall+'%</strong><span>evidence</span></div><div><strong>1</strong><span>real conversation</span></div></div>'+
    '<p class="micro-save-status" id="microSaveStatus">'+(preview()?'Preview only — nothing was saved.':state.saved?'Progress saved.':'Saving progress…')+'</p>'+
    '<div class="micro-finish-actions"><button class="primary-btn" id="microExit" type="button">Back to lessons</button><button class="ghost-btn" id="microRestart" type="button">Practise again</button></div>'+
  '</div>';
  $('content').innerHTML=shell(body,state);bindBack();
  document.getElementById('microExit').onclick=leave;
  document.getElementById('microRestart').onclick=function(){render(reset())}
}
function leave(){
  if(typeof setWorkbookDesignMode==='function')setWorkbookDesignMode(false);
  if(preview()){
    if(typeof returnToWorkbookLessons==='function')returnToWorkbookLessons();
    return
  }
  currentPage='course';if(typeof renderNav==='function')renderNav();if(typeof studentCourse==='function')studentCourse()
}
function bindBack(){var b=document.getElementById('microBack');if(b)b.onclick=leave}

function microWorkbook(){
  if(typeof setWorkbookDesignMode==='function')setWorkbookDesignMode(true);
  if(typeof title==='function')title('Workbook','Lesson 1');
  var state=read();render(state);
  if(state.complete&&!state.saved&&!preview()&&session&&session.role==='student'){
    saveEvidence(state).then(function(){renderDone(state)}).catch(function(e){
      var slot=document.getElementById('microSaveStatus');
      if(slot)slot.textContent='Your lesson is complete on this device. Progress sync needs another try: '+e.message
    })
  }
  if(typeof resetAppScroll==='function')resetAppScroll()
}

const previousWorkbook=typeof workbook==='function'?workbook:null;
if(previousWorkbook){
  workbook=function englishGateB2Lesson1Microflow(){
    var l=typeof lesson==='function'?lesson():null;
    if(l&&l.id===LESSON_ID)return microWorkbook();
    return previousWorkbook()
  }
}
const previousFirstOpen=typeof firstOpenStep==='function'?firstOpenStep:null;
if(previousFirstOpen){
  firstOpenStep=function englishGateMicroFirstOpen(sid,lid){
    if(lid===LESSON_ID)return 'scenario';
    return previousFirstOpen(sid,lid)
  }
}

window.ENGLISHGATE_B2_L1_MICROFLOW={version:FLOW_VERSION,total:TOTAL,reset:function(){render(reset())}};
})();