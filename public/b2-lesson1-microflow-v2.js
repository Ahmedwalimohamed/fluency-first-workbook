/* EnglishGate B2 Lesson 1 — conversation microflow v2
   Fixes question-generation logic by keeping explicit conversation state.
   Scope: su-b2-l1 only. */
(function(){
'use strict';

const LESSON_ID='su-b2-l1';
const TOTAL=15;
const FLOW_VERSION='b2-l1-microflow-v2';

function esc(value){
  if(typeof escapeHtml==='function')return escapeHtml(String(value==null?'':value));
  return String(value==null?'':value).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]});
}
function attr(value){
  if(typeof escapeAttr==='function')return escapeAttr(String(value==null?'':value));
  return esc(value);
}
function words(value){var s=String(value||'').trim();return s?s.split(/\s+/).filter(Boolean).length:0}
function norm(value){return String(value||'').toLowerCase().replace(/[’]/g,"'").replace(/[^a-z0-9'?]+/g,' ').replace(/\s+/g,' ').trim()}
function preview(){return typeof isWorkbookPreview==='function'&&isWorkbookPreview()}
function learnerName(){
  var n=String(session&&session.name||'').trim();
  return n?n.split(/\s+/)[0]:'there'
}
function key(){return 'englishgate:'+FLOW_VERSION+':'+(session&&session.id?session.id:'preview')}
function fresh(){
  return {
    version:FLOW_VERSION,index:0,responses:{},results:{},attempts:{},facts:{},
    branch:{occupation:'',occupationType:'general',learnerQuestion:'',saraAnswer:'',strategy:''},
    saved:false,complete:false,share:false,updatedAt:new Date().toISOString()
  }
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

function detectOccupation(text){
  var t=norm(text);
  if(/\b(teacher|teach|school|education|lecturer|trainer|instructor)\b/.test(t))return 'education';
  if(/\b(bank|banking|finance|accountant|accounting|cashier|loan|credit)\b/.test(t))return 'finance';
  if(/\b(student|study|university|college|course|degree)\b/.test(t))return 'student';
  if(/\b(engineer|engineering|construction|architect|developer|software|it|technology|tech)\b/.test(t))return 'technical';
  if(/\b(business|company|shop|store|entrepreneur|sales|marketing|customer)\b/.test(t))return 'business';
  if(/\b(doctor|nurse|clinic|hospital|health|medical|pharmacy)\b/.test(t))return 'health';
  if(/\b(manager|management|admin|administrator|office|operations|project)\b/.test(t))return 'management';
  return 'general';
}
function occupationFollowUp(type){
  var map={
    education:'What do you teach, and what do you enjoy most about it?',
    finance:'What kind of work do you mainly handle there?',
    student:'What are you studying, and what interested you in it?',
    technical:'What kind of projects do you usually work on?',
    business:'What kind of customers or clients do you usually work with?',
    health:'What kind of patients or health work do you mainly deal with?',
    management:'What is the main thing you are responsible for in that role?',
    general:'What does a normal day look like for you?'
  };
  return map[type]||map.general
}
function questionTopic(text){
  var t=norm(text);
  if(/hard|challenge|difficult|problem/.test(t))return 'challenge';
  if(/project|projects/.test(t))return 'projects';
  if(/customer|customers|client|clients/.test(t))return 'customers';
  if(/learn|learning|skill|skills/.test(t))return 'learning';
  if(/role|job|work|working|career/.test(t))return 'work';
  if(/technology|digital|online|tech/.test(t))return 'technology';
  if(/team|people|colleague|staff/.test(t))return 'team';
  if(/how long|when|since/.test(t))return 'duration';
  return 'general';
}
function answerSaraQuestion(text){
  var topic=questionTopic(text);
  var answers={
    challenge:'The hardest part has been getting everyone to use the same process consistently.',
    projects:'Mostly customer-service projects, including a new online support system and a small reporting dashboard.',
    customers:'A mix of regular customers and small business clients, so their needs can be quite different.',
    learning:'I am trying to get better at project coordination and communicating technical ideas more clearly.',
    work:'I spend a lot of time coordinating people, checking progress and making sure small problems do not become big ones.',
    technology:'We are using more online tools now, especially for customer support and internal reporting.',
    team:'I work with customer-service staff, a small technical team and our branch managers.',
    duration:'I moved into this role about a year ago, so I am still learning parts of it.',
    general:'A big part of my work is helping different people stay coordinated and solve problems quickly.'
  };
  return answers[topic]||answers.general
}
function strategyOptions(state){
  var a=state.branch.saraAnswer||'A big part of my work is helping different people stay coordinated.';
  var topic=questionTopic(state.branch.learnerQuestion||'');
  if(topic==='challenge')return [
    {id:'react',label:'React',text:'That sounds frustrating, especially when different people have different habits.'},
    {id:'ask',label:'Ask',text:'What have you tried so far to make the process easier?'},
    {id:'connect',label:'Connect',text:'I have seen something similar in my own work too.'}
  ];
  if(topic==='projects'||topic==='technology')return [
    {id:'react',label:'React',text:'That sounds like a useful project.'},
    {id:'ask',label:'Ask',text:'Which part of the project are you personally responsible for?'},
    {id:'connect',label:'Connect',text:'I am also interested in how technology changes everyday work.'}
  ];
  return [
    {id:'react',label:'React',text:'That sounds like a busy role.'},
    {id:'ask',label:'Ask',text:'What part of that work do you enjoy most?'},
    {id:'connect',label:'Connect',text:'My work also involves coordinating with different people.'}
  ]
}
function branchQuestion(state){
  var v=state.branch.strategy;
  var topic=questionTopic(state.branch.learnerQuestion||'');
  if(v==='ask'){
    if(topic==='challenge')return 'For me, clear follow-up and simple checklists have helped. What usually helps you when people are not following the same process?';
    if(topic==='projects'||topic==='technology')return 'I mainly coordinate the people and timelines. What kind of project would you like to work on next?';
    return 'I enjoy the problem-solving side most. What part of your own work do you enjoy?'
  }
  if(v==='connect'){
    if(topic==='challenge')return 'Then you know the feeling. What happened in your situation?';
    if(topic==='projects'||topic==='technology')return 'That is interesting. What kind of technology work interests you most?';
    return 'It sounds like we have something in common. What does coordination look like in your work?'
  }
  if(topic==='challenge')return 'Yes, it can be frustrating. How do you usually deal with that kind of problem?';
  if(topic==='projects'||topic==='technology')return 'Thanks. I like that it has a clear practical result. What kind of work are you hoping to do more of?';
  return 'Thanks. I like that the work is varied. What are you hoping to improve this year?'
}

function reasonRelevant(text){
  var t=norm(text);
  return words(text)>=4 && /\b(because|want|wanted|learn|improve|meet|network|interested|workshop|course|skill|skills|came|here|attend)\b/.test(t)
}
function occupationRelevant(text){
  var t=norm(text);
  return words(text)>=3 && /\b(work|working|study|studying|student|teacher|teach|manage|manager|run|own|business|bank|clinic|hospital|engineer|engineering|office|company|school|university|project|sales|marketing|doctor|nurse|developer|technology|it)\b/.test(t)
}
function questionRelevant(text){
  var t=String(text||'').trim();
  if(words(t)<4)return false;
  var q=/\?$/.test(t)||/^(what|how|why|when|where|which|who|do|did|are|is|have|has|can|could|would)\b/i.test(t);
  var relevant=/\b(project|projects|work|job|role|customer|customers|client|clients|learn|learning|technology|digital|team|challenge|hard|difficult|process|coordinate|coordination|online|support)\b/i.test(t);
  return q&&relevant
}
function meaningfulAnswer(text){
  var t=norm(text);
  if(words(text)<4)return false;
  if(/^(yes|no|maybe|i don't know|idk)[.!?]*$/.test(t))return false;
  return true
}
function durationCorrect(text){
  var t=norm(text);
  var hasTime=/\b(for|since)\b/.test(t);
  var hasPerfect=/\b(have|ve|has)\b/.test(t) && /\b(worked|studied|lived|been|done|taught|run|managed|worked|learned|learnt|owned)\b/.test(t);
  return words(text)>=5&&hasTime&&hasPerfect
}

function speaker(name,text){
  return '<div class="micro-turn '+(name==='You'?'is-you':'is-sara')+'"><span class="micro-avatar">'+(name==='You'?'Y':'S')+'</span><div><small>'+esc(name)+'</small><p>'+esc(text)+'</p></div></div>'
}
function shell(body,state){
  var progress=Math.round(((Math.min(state.index,TOTAL-1)+1)/TOTAL)*100);
  var p=preview()?'<span class="micro-preview">Preview</span>':'';
  return '<section class="b2-microflow">'+
    '<header class="micro-top"><button class="ghost-btn micro-back" id="microBack" type="button">← Lessons</button>'+
    '<div class="micro-title"><small>B2 · Getting Acquainted</small><strong>Coffee-break conversation</strong></div>'+p+'</header>'+
    '<div class="micro-progress" aria-label="Lesson progress"><span style="width:'+progress+'%"></span></div>'+
    '<main class="micro-stage">'+body+'</main></section>'
}
function prompt(text,sub){return '<div class="micro-prompt"><h1>'+esc(text)+'</h1>'+(sub?'<p>'+esc(sub)+'</p>':'')+'</div>'}
function choices(items){return '<div class="micro-choices">'+items.map(function(x,i){return '<button type="button" class="micro-choice" data-choice="'+i+'"><span>'+String.fromCharCode(65+i)+'</span><strong>'+esc(x)+'</strong></button>'}).join('')+'</div>'}
function inputBox(id,placeholder,rows){return rows>1?'<textarea id="'+id+'" rows="'+rows+'" placeholder="'+attr(placeholder)+'" autocomplete="off"></textarea>':'<input id="'+id+'" type="text" placeholder="'+attr(placeholder)+'" autocomplete="off">'}
function action(label,id,disabled){return '<div class="micro-action"><button class="primary-btn" id="'+id+'" type="button" '+(disabled?'disabled':'')+'>'+esc(label)+'</button></div>'}
function feedback(good,title,text,label){return '<div class="micro-feedback '+(good?'is-good':'is-hint')+'" id="microFeedback"><strong>'+esc(title)+'</strong><p>'+esc(text)+'</p>'+(label?'<button class="primary-btn" id="microContinue" type="button">'+esc(label)+'</button>':'')+'</div>'}
function hiddenMeta(stage,skill){return '<span class="micro-meta" aria-hidden="true" data-learning-stage="'+attr(stage)+'" data-evidence-skill="'+attr(skill)+'"></span>'}

const STEPS=[
 {stage:'scenario',skill:'listening',type:'choice'},
 {stage:'understand',skill:'listening',type:'choice'},
 {stage:'interact',skill:'grammar',type:'build'},
 {stage:'interact',skill:'writing',type:'open'},
 {stage:'interact',skill:'writing',type:'open'},
 {stage:'interact',skill:'writing',type:'open'},
 {stage:'understand',skill:'vocabulary',type:'choice'},
 {stage:'interact',skill:'listening',type:'choice'},
 {stage:'interact',skill:'grammar',type:'build'},
 {stage:'interact',skill:'writing',type:'question'},
 {stage:'interact',skill:'listening',type:'strategy'},
 {stage:'interact',skill:'writing',type:'open'},
 {stage:'interact',skill:'listening',type:'choice'},
 {stage:'produce',skill:'writing',type:'message'},
 {stage:'improve',skill:'grammar',type:'repair'}
];

function bindBack(){var b=document.getElementById('microBack');if(b)b.onclick=leave}
function wireMic(box){
  var btn=document.getElementById('microMic');if(!btn)return;
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){btn.hidden=true;return}
  btn.onclick=function(){
    var r=new SR();r.lang='en-US';r.interimResults=false;r.maxAlternatives=1;btn.disabled=true;btn.textContent='Listening…';
    r.onresult=function(e){var text=e.results&&e.results[0]&&e.results[0][0]?e.results[0][0].transcript:'';if(text){box.value=text;box.dispatchEvent(new Event('input',{bubbles:true}))}};
    r.onerror=function(){};r.onend=function(){btn.disabled=false;btn.textContent='Use microphone'};r.start()
  }
}

function renderChoice(state,opts){
  var body=hiddenMeta(opts.stage,opts.skill)+'<div class="micro-scene">'+speaker('Sara',opts.sara)+'</div>'+prompt(opts.q,opts.sub)+choices(opts.options)+'<div id="microFeedbackSlot"></div>';
  $('content').innerHTML=shell(body,state);bindBack();
  Array.from(document.querySelectorAll('[data-choice]')).forEach(function(btn){
    btn.onclick=function(){
      if(document.getElementById('microContinue'))return;
      var ix=Number(btn.dataset.choice),value=opts.options[ix],ok=ix===opts.answer;
      setR(state,state.index,value);setOK(state,state.index,ok);hit(state,state.index);
      Array.from(document.querySelectorAll('[data-choice]')).forEach(function(b){b.disabled=true;b.classList.toggle('is-selected',b===btn)});
      document.getElementById('microFeedbackSlot').innerHTML=feedback(ok,ok?'That works.':'Not quite.',ok?opts.good:opts.bad,ok?'Continue':'Try again');
      document.getElementById('microContinue').onclick=function(){
        if(ok){next(state);return}
        render(state)
      }
    }
  })
}
function renderBuild(state,opts){
  var chosen=Array.isArray(getR(state,state.index))?getR(state,state.index).slice():[];
  var bank=opts.scramble.map(function(i){return opts.tiles[i]});
  if(chosen.length)bank=bank.filter(function(word){var p=chosen.indexOf(word);if(p>=0){chosen.splice(p,1);return false}return true});
  chosen=Array.isArray(getR(state,state.index))?getR(state,state.index).slice():[];
  var body=hiddenMeta(opts.stage,opts.skill)+'<div class="micro-scene">'+speaker('Sara',opts.sara)+'</div>'+prompt(opts.q,opts.sub)+
    '<div class="micro-builder-answer" id="microBuilderAnswer"></div><div class="micro-wordbank" id="microWordbank"></div>'+
    action('Check','microCheck',chosen.length===0)+'<div id="microFeedbackSlot"></div>';
  $('content').innerHTML=shell(body,state);bindBack();
  function redraw(){
    var ans=document.getElementById('microBuilderAnswer'),wb=document.getElementById('microWordbank');
    ans.innerHTML=chosen.length?chosen.map(function(x,i){return '<button type="button" data-chosen="'+i+'">'+esc(x)+'</button>'}).join(''):'<span>Build your sentence here</span>';
    wb.innerHTML=bank.map(function(x,i){return '<button type="button" data-bank="'+i+'">'+esc(x)+'</button>'}).join('');
    document.getElementById('microCheck').disabled=!chosen.length;
    Array.from(ans.querySelectorAll('[data-chosen]')).forEach(function(b){b.onclick=function(){bank.push(chosen.splice(Number(b.dataset.chosen),1)[0]);setR(state,state.index,chosen.slice());redraw()}});
    Array.from(wb.querySelectorAll('[data-bank]')).forEach(function(b){b.onclick=function(){chosen.push(bank.splice(Number(b.dataset.bank),1)[0]);setR(state,state.index,chosen.slice());redraw()}})
  }
  redraw();
  document.getElementById('microCheck').onclick=function(){
    var ok=norm(chosen.join(' '))===norm(opts.expected);setOK(state,state.index,ok);hit(state,state.index);
    document.getElementById('microFeedbackSlot').innerHTML=feedback(ok,ok?'Exactly.':'The meaning is right, but the order is not natural yet.',ok?opts.good:opts.bad,ok?'Continue':'Reset');
    document.getElementById('microContinue').onclick=function(){
      if(ok){next(state);return}
      chosen=[];bank=opts.scramble.map(function(i){return opts.tiles[i]});setR(state,state.index,[]);document.getElementById('microFeedbackSlot').innerHTML='';redraw()
    }
  }
}
function renderOpen(state,opts){
  var prior=String(getR(state,state.index)||''),sara=typeof opts.sara==='function'?opts.sara(state):opts.sara;
  var body=hiddenMeta(opts.stage,opts.skill)+'<div class="micro-scene">'+(opts.before||'')+speaker('Sara',sara)+'</div>'+
    prompt(opts.q,opts.sub)+'<div class="micro-input">'+inputBox('microInput',opts.placeholder||'Type your response…',opts.rows||2)+(opts.mic?'<button class="ghost-btn micro-mic" id="microMic" type="button">Use microphone</button>':'')+'</div>'+
    action(opts.button||'Reply','microCheck',true)+'<div id="microFeedbackSlot"></div>';
  $('content').innerHTML=shell(body,state);bindBack();
  var box=document.getElementById('microInput'),check=document.getElementById('microCheck');box.value=prior;
  function valid(){return opts.validate?opts.validate(box.value):words(box.value)>=Number(opts.min||3)}
  function sync(){check.disabled=!valid()}box.oninput=sync;sync();wireMic(box);
  check.onclick=function(){
    var value=box.value.trim();if(!valid())return;
    setR(state,state.index,value);setOK(state,state.index,true);hit(state,state.index);
    if(opts.after)opts.after(state,value);
    box.disabled=true;check.disabled=true;
    document.getElementById('microFeedbackSlot').innerHTML=feedback(true,opts.feedbackTitle||'Good.',typeof opts.feedback==='function'?opts.feedback(state,value):opts.feedback,'Continue');
    document.getElementById('microContinue').onclick=function(){next(state)}
  }
}
function renderQuestion(state){
  var prior=String(getR(state,state.index)||'');
  var body=hiddenMeta('interact','writing')+
    '<div class="micro-scene">'+speaker('Sara','We are trying to improve how we communicate with customers online. I am still learning the project side of the job.')+'</div>'+
    prompt('Ask Sara one question that grows naturally from what she just said.','Your question must connect to her work, the project, customers, technology, learning or a challenge she mentioned.')+
    '<div class="micro-input">'+inputBox('microInput','What has been the hardest part of the project?',2)+'<button class="ghost-btn micro-mic" id="microMic" type="button">Use microphone</button></div>'+
    action('Ask','microCheck',true)+'<div id="microFeedbackSlot"></div>';
  $('content').innerHTML=shell(body,state);bindBack();
  var box=document.getElementById('microInput'),check=document.getElementById('microCheck');box.value=prior;
  function sync(){check.disabled=!questionRelevant(box.value)}box.oninput=sync;sync();wireMic(box);
  check.onclick=function(){
    var value=box.value.trim();if(!questionRelevant(value))return;
    setR(state,state.index,value);state.branch.learnerQuestion=value;state.branch.saraAnswer=answerSaraQuestion(value);setOK(state,state.index,true);hit(state,state.index);write(state);
    box.disabled=true;check.disabled=true;
    document.getElementById('microFeedbackSlot').innerHTML=feedback(true,'That follows the conversation.','Sara will answer the exact topic you chose instead of jumping to a canned line.','Hear Sara’s answer');
    document.getElementById('microContinue').onclick=function(){next(state)}
  }
}
function renderStrategy(state){
  var opts=strategyOptions(state),body=hiddenMeta('interact','listening')+
    '<div class="micro-scene">'+speaker('You',state.branch.learnerQuestion)+speaker('Sara',state.branch.saraAnswer)+'</div>'+
    prompt('What is the best next move for the conversation?','Choose how you want to respond to Sara’s actual answer.')+
    '<div class="micro-strategies">'+opts.map(function(x){return '<button type="button" data-strategy="'+x.id+'"><small>'+x.label+'</small><strong>'+esc(x.text)+'</strong></button>'}).join('')+'</div><div id="microFeedbackSlot"></div>';
  $('content').innerHTML=shell(body,state);bindBack();
  Array.from(document.querySelectorAll('[data-strategy]')).forEach(function(btn){
    btn.onclick=function(){
      if(document.getElementById('microContinue'))return;
      var id=btn.dataset.strategy,choice=opts.find(function(x){return x.id===id});state.branch.strategy=id;setR(state,state.index,choice.text);setOK(state,state.index,true);hit(state,state.index);write(state);
      Array.from(document.querySelectorAll('[data-strategy]')).forEach(function(b){b.disabled=true;b.classList.toggle('is-selected',b===btn)});
      document.getElementById('microFeedbackSlot').innerHTML=feedback(true,'Good conversation move.','Your next turn will now follow this exact choice.','Continue');
      document.getElementById('microContinue').onclick=function(){next(state)}
    }
  })
}
function renderMessage(state){
  var prior=String(getR(state,state.index)||''),body=hiddenMeta('produce','writing')+
    '<div class="micro-phone"><div class="micro-phone-head">Sara · WhatsApp</div>'+speaker('Sara','Great meeting you today. I enjoyed our conversation!')+'</div>'+
    prompt('Reply naturally.','Write 2–3 short sentences. Mention one real detail from your conversation and give Sara a reason to stay in touch.')+
    '<div class="micro-input">'+inputBox('microInput','Hi Sara, it was great meeting you too…',4)+'</div>'+
    '<label class="micro-share"><input type="checkbox" id="microShare"> <span>Share this later in My Writings</span></label><div class="micro-counter" id="microCounter">0 words</div>'+
    action('Send reply','microCheck',true)+'<div id="microFeedbackSlot"></div>';
  $('content').innerHTML=shell(body,state);bindBack();
  var box=document.getElementById('microInput'),check=document.getElementById('microCheck'),counter=document.getElementById('microCounter');box.value=prior;
  function sync(){var n=words(box.value);counter.textContent=n+' words';check.disabled=n<12}box.oninput=sync;sync();
  check.onclick=function(){
    var value=box.value.trim();if(words(value)<12)return;setR(state,state.index,value);state.share=Boolean(document.getElementById('microShare').checked);setOK(state,state.index,true);hit(state,state.index);write(state);
    box.disabled=true;check.disabled=true;document.getElementById('microFeedbackSlot').innerHTML=feedback(true,'Sent.','Short, specific and easy to reply to.','One last challenge');document.getElementById('microContinue').onclick=function(){next(state)}
  }
}
function renderRepair(state){
  var prior=String(getR(state,state.index)||''),body=hiddenMeta('improve','grammar')+
    '<div class="micro-scene">'+speaker('Sara','Before we go — how long have you been doing your current work, course or main activity?')+'</div>'+
    prompt('Answer from memory.','Use for or since. EnglishGate will only show a model if you need help.')+
    '<div class="micro-input">'+inputBox('microInput','I have worked here for three years.',2)+'</div>'+action('Check','microCheck',true)+'<div id="microFeedbackSlot"></div>';
  $('content').innerHTML=shell(body,state);bindBack();
  var box=document.getElementById('microInput'),check=document.getElementById('microCheck');box.value=prior;
  function sync(){check.disabled=words(box.value)<5}box.oninput=sync;sync();
  check.onclick=function(){
    var value=box.value.trim(),ok=durationCorrect(value);setR(state,state.index,value);setOK(state,state.index,ok);var n=hit(state,state.index);
    if(ok){box.disabled=true;check.disabled=true;document.getElementById('microFeedbackSlot').innerHTML=feedback(true,'You retrieved it.','You used present perfect with for/since from memory.','Finish lesson');document.getElementById('microContinue').onclick=function(){finish(state)}}
    else{var tip=n===1?'Use have/has + past participle for an activity that started in the past and continues now, plus for/since.':'Model: “I have worked here for three years.” Now make the sentence true for you.';document.getElementById('microFeedbackSlot').innerHTML=feedback(false,'Almost.',tip,'Try again');document.getElementById('microContinue').onclick=function(){document.getElementById('microFeedbackSlot').innerHTML='';box.focus()}}
  }
}

function render(state){
  var i=state.index;if(state.complete){renderDone(state);return}
  if(i===0)return renderChoice(state,{stage:'scenario',skill:'listening',sara:"Hi, I don't think we've met. I'm Sara.",q:'What sounds natural?',options:["Nice to meet you. I'm "+learnerName()+".",'Yes, workshop.','I am meet you.'],answer:0,good:'You returned the greeting and introduced yourself naturally.',bad:'Respond to Sara and introduce yourself.'});
  if(i===1)return renderChoice(state,{stage:'understand',skill:'listening',sara:'What brought you to the workshop?',q:'What does Sara want to know?',options:['Why you came','Where you live','How old you are'],answer:0,good:'Right. She is asking for your reason for attending.',bad:'Focus on the purpose of the question.'});
  if(i===2)return renderBuild(state,{stage:'interact',skill:'grammar',sara:'What brought you to the workshop?',q:'Build one natural answer.',tiles:["I'm",'here','because','I want to','improve','my digital skills.'],scramble:[2,0,5,1,4,3],expected:"I'm here because I want to improve my digital skills.",good:'Clear reason, natural structure.',bad:'Start with “I’m here because…” and complete one idea.'});
  if(i===3)return renderOpen(state,{stage:'interact',skill:'writing',sara:'What brought you here?',q:'Now make the answer yours.',sub:'Use one real reason.',placeholder:'I came because…',rows:2,mic:true,button:'Reply',validate:reasonRelevant,feedbackTitle:'Good — now it is your conversation.',feedback:'Sara now knows why you came.'});
  if(i===4)return renderOpen(state,{stage:'interact',skill:'writing',sara:'Nice. And what do you do?',q:'Tell Sara your real work, study or main activity.',sub:'One short answer is enough.',placeholder:'I work in… / I study… / I run…',rows:2,mic:true,button:'Reply',validate:occupationRelevant,after:function(s,v){s.branch.occupation=v;s.branch.occupationType=detectOccupation(v);write(s)},feedbackTitle:'Now Sara knows your background.',feedback:'The next question will use what you actually said.'});
  if(i===5)return renderOpen(state,{stage:'interact',skill:'writing',before:speaker('You',state.branch.occupation||String(getR(state,4)||'')),sara:function(s){return occupationFollowUp(s.branch.occupationType||detectOccupation(String(getR(s,4)||'')))},q:'Answer Sara’s follow-up.',sub:'Add one useful detail.',placeholder:'Usually I…',rows:2,mic:true,button:'Reply',validate:meaningfulAnswer,feedbackTitle:'That adds depth.',feedback:'Your answer gives Sara a clearer picture of your work or studies.'});
  if(i===6)return renderChoice(state,{stage:'understand',skill:'vocabulary',sara:'I started in customer service, but these days I coordinate some of our digital projects.',q:'What does “coordinate” mean here?',options:['Organize people and tasks so they work together','Design every technical detail alone','Only answer customer complaints'],answer:0,good:'Exactly. The context shows that she organizes work across people and tasks.',bad:'Use the job context around the word.'});
  if(i===7)return renderChoice(state,{stage:'interact',skill:'listening',sara:'I am still learning the project side of the job.',q:'Which follow-up shows you listened?',options:['What kind of projects are you working on?','Do you work?','How old is your office?'],answer:0,good:'Yes. It grows directly from Sara’s last idea.',bad:'A strong follow-up should use a detail Sara just gave you.'});
  if(i===8)return renderBuild(state,{stage:'interact',skill:'grammar',sara:'I am still learning the project side of the job.',q:'Build the follow-up question.',tiles:['What','kind of','projects','are you','working on?'],scramble:[3,1,4,0,2],expected:'What kind of projects are you working on?',good:'Natural and specific.',bad:'Start with “What kind of…” and keep “are you working on?” together.'});
  if(i===9)return renderQuestion(state);
  if(i===10)return renderStrategy(state);
  if(i===11){
    var move=String(getR(state,10)||'');
    return renderOpen(state,{stage:'interact',skill:'writing',before:speaker('You',move),sara:function(s){return branchQuestion(s)},q:'Respond to Sara.',sub:'Keep it natural — 1 or 2 sentences.',placeholder:'For me…',rows:2,mic:true,button:'Reply',validate:meaningfulAnswer,feedbackTitle:'The conversation stayed connected.',feedback:'Your answer follows the exact branch you created.'})
  }
  if(i===12)return renderChoice(state,{stage:'interact',skill:'listening',sara:'The break is nearly over. It was really nice talking to you.',q:'How would you close naturally?',options:['Great talking to you too. It would be good to stay in touch.','End of conversation.','Yes, break finished.'],answer:0,good:'That closes warmly and leaves the relationship open.',bad:'A natural closing responds warmly and signals what happens next.'});
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
    var skill=skills[i],tags=['microflow:v2','integrated:real-life','logic:conversation-state'];
    STEPS.forEach(function(x,n){if(x.skill===skill)tags.push('stage:'+x.stage+':step'+(n+1))});
    await recordAttempt(session.id,l.id,skill,scoreFor(state,skill),tags.slice(0,10));
    await markDone(session.id,l.id,skill)
  }
  var message=String(getR(state,13)||'').trim();
  if(message)await api('/api/writing/'+encodeURIComponent(l.id),{method:'PUT',body:JSON.stringify({content:message,publishToCommunity:Boolean(state.share)})});
  await refreshState();state.saved=true;write(state)
}
async function finish(state){
  state.complete=true;write(state);renderDone(state);
  try{await saveEvidence(state);renderDone(state)}catch(e){var slot=document.getElementById('microSaveStatus');if(slot)slot.textContent='Your lesson is complete on this device. Progress sync needs another try: '+e.message}
}
function renderDone(state){
  var overall=Math.round((scoreFor(state,'vocabulary')+scoreFor(state,'listening')+scoreFor(state,'grammar')+scoreFor(state,'writing'))/4);
  var body='<div class="micro-complete"><div class="micro-complete-mark">✓</div><small>Conversation complete</small>'+
    '<h1>You met Sara, kept the conversation moving and followed up afterward.</h1>'+
    '<p>The questions stayed connected to what you and Sara actually said.</p>'+
    '<div class="micro-summary"><div><strong>'+TOTAL+'</strong><span>micro-interactions</span></div><div><strong>'+overall+'%</strong><span>evidence</span></div><div><strong>1</strong><span>connected conversation</span></div></div>'+
    '<p class="micro-save-status" id="microSaveStatus">'+(preview()?'Preview only — nothing was saved.':state.saved?'Progress saved.':'Saving progress…')+'</p>'+
    '<div class="micro-finish-actions"><button class="primary-btn" id="microExit" type="button">Back to lessons</button><button class="ghost-btn" id="microRestart" type="button">Practise again</button></div></div>';
  $('content').innerHTML=shell(body,state);bindBack();document.getElementById('microExit').onclick=leave;document.getElementById('microRestart').onclick=function(){render(reset())}
}
function leave(){
  if(typeof setWorkbookDesignMode==='function')setWorkbookDesignMode(false);
  if(preview()){if(typeof returnToWorkbookLessons==='function')returnToWorkbookLessons();return}
  currentPage='course';if(typeof renderNav==='function')renderNav();if(typeof studentCourse==='function')studentCourse()
}
function microWorkbook(){
  if(typeof setWorkbookDesignMode==='function')setWorkbookDesignMode(true);
  if(typeof title==='function')title('Workbook','Lesson 1');
  var state=read();render(state);
  if(state.complete&&!state.saved&&!preview()&&session&&session.role==='student'){
    saveEvidence(state).then(function(){renderDone(state)}).catch(function(e){var slot=document.getElementById('microSaveStatus');if(slot)slot.textContent='Your lesson is complete on this device. Progress sync needs another try: '+e.message})
  }
  if(typeof resetAppScroll==='function')resetAppScroll()
}

const previousWorkbook=typeof workbook==='function'?workbook:null;
if(previousWorkbook){
  workbook=function englishGateB2Lesson1MicroflowV2(){
    var l=typeof lesson==='function'?lesson():null;
    if(l&&l.id===LESSON_ID)return microWorkbook();
    return previousWorkbook()
  }
}
const previousFirstOpen=typeof firstOpenStep==='function'?firstOpenStep:null;
if(previousFirstOpen){
  firstOpenStep=function englishGateMicroFirstOpenV2(sid,lid){if(lid===LESSON_ID)return 'scenario';return previousFirstOpen(sid,lid)}
}

window.ENGLISHGATE_B2_L1_MICROFLOW={
  version:FLOW_VERSION,total:TOTAL,reset:function(){render(reset())},
  logic:{detectOccupation:detectOccupation,occupationFollowUp:occupationFollowUp,questionTopic:questionTopic,answerSaraQuestion:answerSaraQuestion,questionRelevant:questionRelevant}
};
})();