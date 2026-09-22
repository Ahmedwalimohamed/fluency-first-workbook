(function(){
'use strict';

const A1_GOLD_VERSION='a1-gold-v1';
const A1_CURRICULUM_VERSION='ENGLISHGATE_A1_GOLD_v1.0';
const A1_GOLD_STEPS=['vocabulary','grammar','reading','listening','writing','speaking','review'];
const A1_GOLD_LABELS={
 vocabulary:'Vocabulary',
 grammar:'Language',
 reading:'Reading',
 listening:'Listening',
 writing:'Writing',
 speaking:'Speaking',
 review:'Fix & Improve'
};
const LESSON_TITLES=[
 'Getting Acquainted','Work & Careers','Travel & Adventure','Technology & Social Media','Health & Wellbeing',
 'Food & Culture','Education & Learning','Money & Business','Environment & Climate','Relationships & Family',
 'Media & News','Sports & Fitness','City & Countryside','Dreams & Ambitions','Crime & Safety',
 'Science & Everyday Life','Arts & Entertainment','Global Connections','Shopping & Services','Home & Daily Life',
 'Plans & Events','My English in the Real World'
];

function esc(value){return typeof escapeHtml==='function'?escapeHtml(String(value==null?'':value)):String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function attr(value){return typeof escapeAttr==='function'?escapeAttr(String(value==null?'':value)):esc(value).replace(/"/g,'&quot;')}
function wc(value){const t=String(value||'').trim();return t?t.split(/\s+/).filter(Boolean).length:0}
function choice(name,q,options,answer,tag){
 return '<article class="guided-question a1-gold-question"><div class="question-stage"><span>'+esc(tag.replace(/[-_:]+/g,' '))+'</span></div><p>'+esc(q)+'</p>'+radio(name,options,answer,tag)+'</article>'
}
function openField(name,q,placeholder,tag){
 return '<article class="guided-question a1-gold-question"><div class="question-stage"><span>'+esc(tag.replace(/[-_:]+/g,' '))+'</span></div><p>'+esc(q)+'</p><div class="open-evidence"><textarea name="'+attr(name)+'" data-a1-open="1" data-tag="'+attr(tag)+'" rows="3" placeholder="'+attr(placeholder||'Type your answer…')+'"></textarea></div></article>'
}
function balancedOptions(options,answer,index){
 const distractors=options.filter(function(x){return x!==answer}).slice(0,2),out=distractors.slice();
 out.splice(Math.max(0,Math.min(out.length,index%3)),0,answer);
 return out
}
function questionCount(text){
 const value=String(text||''),punctuation=(value.match(/\?/g)||[]).length,forms=(value.match(/\b(?:what(?:'s| is)?|where|when|who|how|why|do you|are you|can you|is your)\b/gi)||[]).length;
 return Math.max(punctuation,forms)
}
function stageShell(kicker,title,description,body,buttonLabel){
 return '<div class="eg-skill-page a1-gold-stage"><header class="eg-skill-hero"><div><span class="eg-skill-kicker">'+esc(kicker)+'</span><h1>'+esc(title)+'</h1><p>'+esc(description)+'</p></div></header>'+body+
 '<div id="activityFeedback"></div><div class="skill-action-row"><button class="primary-btn" id="a1CheckStage">'+esc(buttonLabel||'Check activity')+'</button><button class="secondary-btn done-activity-btn" id="doneActivity" disabled>Continue →</button></div></div>'
}

const L1={
 id:'su-a1-l1',
 number:1,
 title:'Getting Acquainted',
 level:'A1',
 ready:true,
 status:'PILOT_READY',
 standardVersion:A1_GOLD_VERSION,
 curriculumVersion:A1_CURRICULUM_VERSION,
 outcome:'Introduce yourself and exchange basic personal information with someone you have just met.',
 realWorldSituation:'Your first day in an evening English course. You meet another adult learner.',
 communicationGoal:'Introduce yourself, answer basic personal questions, and ask relevant questions back.',
 targetVocabulary:['name','live','work','study','teacher','student','city','like'],
 recycledVocabulary:[],
 vocabularyEntries:[
  {word:'name',meaning:'what people call you',example:'My name is Amina.'},
  {word:'live',meaning:'have your home in a place',example:'I live in Borama.'},
  {word:'work',meaning:'do a job',example:'I work at a school.'},
  {word:'study',meaning:'learn at a school, college, university, or course',example:'I study English.'},
  {word:'teacher',meaning:'a person who helps people learn',example:'I am a teacher.'},
  {word:'student',meaning:'a person who is learning',example:'I am a student.'},
  {word:'city',meaning:'a large place where many people live and work',example:'Hargeisa is a city.'},
  {word:'like',meaning:'enjoy something',example:'I like football.'}
 ],
 chunks:[
  "Hi. I'm ...",
  "I'm from ...",
  "I live in ...",
  "I'm a ...",
  "I like ...",
  "What's your name?",
  "Where are you from?",
  "Where do you live?",
  "What do you do?",
  "What do you like?"
 ],
 expressions:[
  {text:"Hi. I'm ..."},
  {text:"I'm from ..."},
  {text:"I live in ..."},
  {text:"I'm a ..."},
  {text:"I like ..."}
 ],
 functions:['greet','introduce','ask basic personal questions','answer basic personal questions','express a simple preference','respond to a partner'],
 discourse:['short complete sentences','simple reciprocal questions','natural greeting and closing'],
 pronunciation:'Make key words clear. Practise: I’m Amina. What’s your name? Where are you from? What do you do? Nice to meet you.',
 readingSkill:'Find explicit personal information in a short profile.',
 vocabulary:{items:[]},
 grammar:{
  focus:'Language for introductions and basic personal information',
  rule:'Use I am / I’m to identify yourself, live in + place, and simple present questions to exchange personal information.',
  items:[
   {q:'Complete: I ___ a student.',options:['am','is','are'],answer:'am',tag:'language:be'},
   {q:'Choose the correct question.',options:["What's your name?","What your name?","What name is you?"],answer:"What's your name?",tag:'language:question'},
   {q:'Complete: I live ___ Borama.',options:['in','at','on'],answer:'in',tag:'language:place'},
   {q:'Choose the correct question.',options:['What do you do?','What you do?','What does you do?'],answer:'What do you do?',tag:'language:question'},
   {q:'Complete: I ___ football.',options:['like','likes','am like'],answer:'like',tag:'language:preference'}
  ]
 },
 listening:{
  title:'Getting Acquainted · Listening',
  readingText:"Hi. My name is Hamza. I'm from Somalia. I live in Hargeisa. I'm a driver. I work for a small company. I like football and coffee.",
  audioScript:"Maryan: Hi. I'm Maryan. I'm from Somalia, and I live in Borama. I'm a teacher. I work at a school. I like reading and walking.",
  text:"Maryan: Hi. I'm Maryan. I'm from Somalia, and I live in Borama. I'm a teacher. I work at a school. I like reading and walking.",
  speakers:[{name:'Maryan',gender:'female',voice:'nova'}],
  questions:[]
 },
 writing:{
  task:'Your new English class has a group page. Write a short introduction so your classmates can know you. Include your name, where you live, work or study, and one interest.',
  minWords:20,
  maxWords:40,
  humanGraded:false,
  checkpoint:false,
  realWorldSurface:'class introduction'
 },
 performance:'Meet a new classmate. Introduce yourself, exchange basic personal information, and ask at least two relevant questions.',
 review:{keywords:'name · live · work · study · teacher · student · city · like',mission:'Meet a new classmate and exchange personal information.'},
 masteryRules:{transferRequired:true,speakingRequired:true,minimumQuestionsInitiated:2}
};

const placeholders=LESSON_TITLES.slice(1).map(function(title,index){
 return {
  id:'su-a1-l'+(index+2),
  number:index+2,
  title:title,
  level:'A1',
  ready:false,
  status:'LOCKED_IMPLEMENTATION',
  standardVersion:A1_GOLD_VERSION,
  curriculumVersion:A1_CURRICULUM_VERSION,
  outcome:'Gold curriculum approved. Runtime implementation is locked until its implementation wave passes QA.',
  targetVocabulary:[],
  vocabularyEntries:[],
  expressions:[],
  chunks:[],
  listening:{readingText:'',audioScript:'',text:'',speakers:[],questions:[]},
  grammar:{focus:'',rule:'',items:[]},
  writing:{task:'',minWords:0,maxWords:0},
  review:{keywords:'',mission:''}
 }
});

const goldBook={
 id:'speakup-a1',
 title:'A1 Beginner',
 level:'A1',
 moduleTitle:'A1 Beginner · Gold v1.0',
 moduleGoal:'Build functional basic communication through 22 real-life lessons with cumulative retrieval, correction, and transfer.',
 totalLessons:22,
 lessons:[L1].concat(placeholders),
 standardVersion:A1_GOLD_VERSION,
 curriculumVersion:A1_CURRICULUM_VERSION,
 implementationStatus:'LESSON_1_PILOT'
};

BOOK_PACKS['speakup-a1']=goldBook;
if(window.BOOK_PACKS)window.BOOK_PACKS['speakup-a1']=goldBook;

const LIVE_CONTENT=[
 'LESSON 1 GETTING ACQUAINTED',
 'CAN-DO GOAL: Introduce yourself and exchange basic personal information with someone you have just met.',
 '',
 'PAGE 1 — WARM UP',
 'REAL-LIFE SITUATION',
 'You are starting a new English course. You do not know the person next to you.',
 'Think & Talk',
 '1. What can you say when you meet someone for the first time?',
 '2. Say your name in English.',
 '3. Ask one question you already know.',
 '',
 'PAGE 2 — MODEL CONVERSATION',
 "Amina: Hi. I'm Amina. What's your name?",
 "Hassan: I'm Hassan. Nice to meet you.",
 'Amina: Nice to meet you too. Where are you from?',
 "Hassan: I'm from Somalia. I live in Hargeisa. What about you?",
 'Amina: I live in Borama.',
 'Hassan: What do you do?',
 "Amina: I'm a teacher. What about you?",
 "Hassan: I'm a student.",
 'Amina: What do you like?',
 'Hassan: I like football.',
 'Amina: Really? Me too.',
 'Quick check: What is her name? Where does Hassan live? What does Amina do? What does Hassan like?',
 '',
 'PAGE 3 — USEFUL LANGUAGE',
 'name — what people call you. Example: My name is Amina.',
 'live — have your home in a place. Example: I live in Borama.',
 'work — do a job. Example: I work at a school.',
 'study — learn at a school, college, university, or course. Example: I study English.',
 'teacher — a person who helps people learn. Example: I am a teacher.',
 'student — a person who is learning. Example: I am a student.',
 'city — a large place where many people live and work. Example: Hargeisa is a city.',
 'like — enjoy something. Example: I like football.',
 'PRONUNCIATION FOCUS',
 "Practise: I'm Amina. What's your name? Where are you from? What do you do? Nice to meet you.",
 '',
 'PAGE 4 — NOTICE & BUILD',
 "Useful patterns: I'm ... / I'm from ... / I live in ... / I'm a ... / I like ...",
 "Questions: What's your name? / Where are you from? / Where do you live? / What do you do? / What do you like?",
 'Change the model with your real information.',
 '',
 'PAGE 5 — GUIDED SPEAKING',
 'Use four prompts only: NAME · PLACE · WORK/STUDY · INTEREST.',
 'Introduce yourself in 3–4 short sentences.',
 'Then listen to your partner and ask one follow-up question.',
 '',
 'PAGE 6 — INTERACTION',
 'Student A asks about name, city, work/study, and interest. Student B answers. Switch roles.',
 'Upgrade the conversation with natural reactions: Really? / Me too. / Nice to meet you.',
 'PERSONAL DETAILS EXTENSION',
 "Practise if useful: How do you spell your name? What's your phone number? What's your email address?",
 '',
 'PAGE 7 — LIVE TASK',
 'Meet a new classmate.',
 'Success means:',
 '• I greet the person.',
 '• I give my name and at least two personal details.',
 '• I answer understandable questions.',
 '• I ask at least two relevant questions.',
 '• I respond naturally to one thing my partner says.',
 '',
 'PAGE 8 — REFLECTION',
 'Today I can...',
 '☐ introduce myself',
 '☐ ask basic personal questions',
 '☐ answer basic personal questions',
 'One sentence I used well: ____________________________',
 'One correction I will retry: ____________________________'
].join('\n');

window.LIVE_BOOKS=window.LIVE_BOOKS||{};
window.LIVE_BOOKS['speakup-a1']={title:'A1 Beginner',lessons:[{number:1,title:'Getting Acquainted',content:LIVE_CONTENT}]};

function isGoldLesson(l){return !!l&&l.standardVersion===A1_GOLD_VERSION&&l.id==='su-a1-l1'}
window.isA1GoldLesson=isGoldLesson;

const baseWorkbookStepsForLesson=workbookStepsForLesson;
const baseWorkbookStageLabel=workbookStageLabel;
const baseWorkbookCompletionKey=workbookCompletionKey;
const baseFirstOpenStep=firstOpenStep;
const baseRenderActivity=renderActivity;
const baseSkillCompletionFor=skillCompletionFor;
const baseLessonProgress=lessonProgress;
const baseCompletionPct=completionPct;
const baseOverall=overall;
const baseScoredActivityCount=scoredActivityCount;
const baseStudentPerformanceTable=studentPerformanceTable;

workbookStepsForLesson=function(l){return isGoldLesson(l)?A1_GOLD_STEPS:baseWorkbookStepsForLesson(l)};
workbookStageLabel=function(l,step){return isGoldLesson(l)?(A1_GOLD_LABELS[step]||cap(step)):baseWorkbookStageLabel(l,step)};
workbookCompletionKey=function(l,step){return isGoldLesson(l)?step:baseWorkbookCompletionKey(l,step)};
firstOpenStep=function(sid,lid){
 const l=lessonById(lid);
 if(!isGoldLesson(l))return baseFirstOpenStep(sid,lid);
 const done=completionFor(sid,lid);
 return A1_GOLD_STEPS.find(function(step){return !done.includes(step)})||A1_GOLD_STEPS[A1_GOLD_STEPS.length-1]
};
skillCompletionFor=function(sid,lid){
 const l=lessonById(lid);
 if(!isGoldLesson(l))return baseSkillCompletionFor(sid,lid);
 return completionFor(sid,lid).filter(function(x){return A1_GOLD_STEPS.includes(x)})
};
lessonProgress=function(sid,lid){
 const l=lessonById(lid);
 if(!isGoldLesson(l))return baseLessonProgress(sid,lid);
 return Math.round(skillCompletionFor(sid,lid).length/A1_GOLD_STEPS.length*100)
};
completionPct=function(sid){
 const c=courseForStudent(sid);
 if(c&&c.standardVersion===A1_GOLD_VERSION){
  const lessons=readyLessons(c),total=lessons.reduce(function(n,l){return n+workbookStepsForLesson(l).length},0);
  const done=lessons.reduce(function(n,l){return n+skillCompletionFor(sid,l.id).length},0);
  return total?Math.round(done/total*100):0
 }
 return baseCompletionPct(sid)
};
overall=function(sid){
 const c=courseForStudent(sid);
 if(!(c&&c.standardVersion===A1_GOLD_VERSION))return baseOverall(sid);
 const skills=['vocabulary','grammar','reading','listening','writing','speaking','review'];
 const vals=skills.map(function(k){return mastery(sid,k)}).filter(Number.isFinite);
 return vals.length?Math.round(vals.reduce(function(a,b){return a+b},0)/vals.length):null
};
scoredActivityCount=function(sid){
 const c=courseForStudent(sid);
 if(!(c&&c.standardVersion===A1_GOLD_VERSION))return baseScoredActivityCount(sid);
 return ['vocabulary','grammar','reading','listening','writing','speaking','review'].reduce(function(n,k){return n+latestScoredAttempts(sid,k).length},0)
};
studentPerformanceTable=function(sid){
 const c=courseForStudent(sid);
 if(!(c&&c.standardVersion===A1_GOLD_VERSION))return baseStudentPerformanceTable(sid);
 const lessons=readyLessons(c);
 return '<section class="section student-work-report"><div class="section-head"><div><h3>Workbook work</h3><p>Open any activity to inspect the student response, feedback, retries, and saved evidence.</p></div></div><div class="table-wrap performance-detail-table"><table class="data-table"><thead><tr><th>Lesson</th>'+A1_GOLD_STEPS.map(function(k){return '<th>'+esc(A1_GOLD_LABELS[k])+'</th>'}).join('')+'<th>Lesson progress</th></tr></thead><tbody>'+
 lessons.map(function(l){return '<tr><td><strong>Lesson '+l.number+'</strong><small>'+esc(l.title)+'</small></td>'+A1_GOLD_STEPS.map(function(k){return '<td>'+workbookEvidenceCell(sid,l.id,k)+'</td>'}).join('')+'<td><strong>'+lessonProgress(sid,l.id)+'%</strong><small>'+skillCompletionFor(sid,l.id).length+' of '+A1_GOLD_STEPS.length+' activities completed</small></td></tr>'}).join('')+
 '</tbody></table></div></section>'
};

function footerize(l){
 const p=$('activityPanel'),footer=$('workbookStageFooter'),row=p&&p.querySelector('.skill-action-row');
 if(row&&footer){
  row.insertAdjacentHTML('afterbegin','<button class="ghost-btn eg-previous-btn" id="previousActivity">← Previous</button><button class="ghost-btn eg-hint-btn" id="activityHint">Hint</button>');
  while(row.firstChild)footer.appendChild(row.firstChild);
  row.remove()
 }
 if($('previousActivity'))$('previousActivity').onclick=function(){a1Previous(l)};
 if($('activityHint'))$('activityHint').onclick=function(){
  const feedback=$('activityFeedback');
  if(feedback)feedback.innerHTML='<div class="feedback">Use the lesson language bank. Focus on meaning first, then form.</div>'
 }
}
function a1Next(l){
 const steps=workbookStepsForLesson(l),i=steps.indexOf(currentStep);
 if(i<steps.length-1){currentStep=steps[i+1];workbook();return}
 if(isWorkbookPreview()){returnToWorkbookLessons();return}
 currentPage='home';renderNav();studentHome()
}
function a1Previous(l){
 const steps=workbookStepsForLesson(l),i=steps.indexOf(currentStep);
 if(i>0){currentStep=steps[i-1];workbook();return}
 setWorkbookDesignMode(false);
 if(isWorkbookPreview()){returnToWorkbookLessons();return}
 currentPage='course';renderNav();studentCourse()
}
function choiceEvidence(){
 return Array.prototype.slice.call(document.querySelectorAll('#activityPanel .guided-question')).map(function(card,index){
  const q=String(card.querySelector('p')&&card.querySelector('p').textContent||'Question').trim();
  const inputs=Array.prototype.slice.call(card.querySelectorAll('input[type="radio"]'));
  if(!inputs.length)return null;
  const selected=inputs.find(function(x){return x.checked}),answer=inputs[0]&&inputs[0].dataset.answer||'';
  return {index:index+1,question:q,studentAnswer:selected?selected.value:'',correctAnswer:answer,correct:!!(selected&&selected.value===answer),tag:(selected&&selected.dataset.tag)||(inputs[0]&&inputs[0].dataset.tag)||''}
 }).filter(Boolean)
}
async function saveChoiceStage(l,skill){
 const evidence=choiceEvidence(),feedback=$('activityFeedback');
 if(!evidence.length||evidence.some(function(x){return !x.studentAnswer})){
  feedback.innerHTML='<div class="feedback bad">Answer every question first.</div>';return
 }
 const correct=evidence.filter(function(x){return x.correct}).length,score=Math.round(correct/evidence.length*100),passScore=skill==='review'?100:70,passed=score>=passScore;
 const cards=Array.prototype.slice.call(document.querySelectorAll('#activityPanel .guided-question'));
 evidence.forEach(function(row,i){
  const card=cards[i];if(!card)return;
  const prior=card.querySelector('.a1-item-feedback');if(prior)prior.remove();
  card.insertAdjacentHTML('beforeend','<div class="a1-item-feedback feedback '+(row.correct?'good':'bad')+'">'+(row.correct?'Correct.':'Review: '+esc(row.correctAnswer))+'</div>')
 });
 if(!isWorkbookPreview()){
  await recordAttempt(session.id,l.id,skill,score,['curriculum:a1-gold-v1','a1:lesson1',passed?'retry:passed':'retry:needed'],evidence);
  if(passed)await markDone(session.id,l.id,skill);
  await refreshState()
 }
 feedback.innerHTML='<div class="performance-result '+(passed?'good':'bad')+'"><div class="performance-score"><strong>'+score+'%</strong><span>'+esc(A1_GOLD_LABELS[skill]||skill)+'</span></div><p>'+correct+' of '+evidence.length+' evidence points demonstrated. '+(passed?'You can continue.':'Correct the missed items and check again.')+'</p></div>';
 $('doneActivity').disabled=!passed
}
function vocabHtml(l){
 const qs=[
  ['My ___ is Amina.',['name','city','study'],'name'],
  ['I ___ in Borama.',['work','live','like'],'live'],
  ['I ___ at a school.',['study','work','city'],'work'],
  ['I ___ English in the evening.',['like','study','name'],'study'],
  ['A person who helps people learn is a ___.',['student','teacher','city'],'teacher'],
  ['I enjoy football. I ___ football.',['live','like','work'],'like']
 ];
 return stageShell('Vocabulary','Words for meeting someone','Use each word inside a real introduction.',qs.map(function(x,i){return choice('a1v'+i,x[0],balancedOptions(x[1],x[2],i),x[2],'vocabulary:context')}).join(''),'Check vocabulary')
}
function languageHtml(l){
 return stageShell('Language','Build a clear introduction','Choose the form that communicates the meaning accurately.',l.grammar.items.map(function(q,i){return choice('a1g'+i,q.q,balancedOptions(q.options,q.answer,i),q.answer,q.tag)}).join(''),'Check language')
}
function readingHtml(){
 const text="Hi. My name is Hamza. I'm from Somalia. I live in Hargeisa. I'm a driver. I work for a small company. I like football and coffee.";
 const qs=[
  ["What is his name?",['Ahmed','Hamza','Hassan'],'Hamza'],
  ["Where does he live?",['Borama','Berbera','Hargeisa'],'Hargeisa'],
  ["What does he do?",['He is a teacher.','He is a driver.','He is a student.'],'He is a driver.'],
  ["What does he like?",['Football and coffee','Reading and walking','Music and tea'],'Football and coffee']
 ];
 return stageShell('Reading','Meet Hamza','Read a short real-life profile and find explicit personal information.','<section class="eg-reading-article"><span class="eg-skill-kicker">Profile</span><p>'+esc(text)+'</p></section><div class="activity-question-list">'+qs.map(function(x,i){return choice('a1r'+i,x[0],balancedOptions(x[1],x[2],i),x[2],'reading:detail')}).join('')+'</div>','Check reading')
}
function listeningHtml(l){
 const qs=[
  ["What is the speaker's name?",['Maryan','Amina','Sahra'],'Maryan'],
  ["Where does she live?",['Hargeisa','Borama','Berbera'],'Borama'],
  ["What does she do?",['She is a driver.','She is a teacher.','She is a student.'],'She is a teacher.'],
  ["What does she like?",['Reading and walking','Football and coffee','Music and running'],'Reading and walking']
 ];
 const source='<section class="eg-audio-card"><small>Natural A1 listening</small><button id="playAudio" class="play-btn" title="Play or pause audio" aria-label="Play or pause audio">▶</button><button id="restartAudio" class="audio-icon-btn" title="Restart audio" aria-label="Restart audio">↺</button><select id="audioSpeed" class="audio-speed" aria-label="Playback speed"><option value="0.85">0.85×</option><option value="1" selected>1×</option><option value="1.15">1.15×</option></select><span id="audioStatus" class="muted">Listen first for meaning. Replay for detail.</span><input id="audioSeek" type="range" min="0" max="100" value="0" step="0.1" aria-label="Audio progress"></section>';
 return stageShell('Listening','Listen to Maryan introduce herself','The transcript stays hidden while you answer. Focus on name, place, work, and interests.',source+'<div class="activity-question-list">'+qs.map(function(x,i){return choice('a1l'+i,x[0],balancedOptions(x[1],x[2],i),x[2],'listening:detail')}).join('')+'</div>','Check listening')
}
function writingHtml(l){
 const saved=isWorkbookPreview()?'':writingFor(session.id,l.id);
 return '<div class="eg-skill-page a1-gold-stage"><header class="eg-skill-hero"><div><span class="eg-skill-kicker">Writing</span><h1>Introduce yourself to your class group</h1><p>Write a real message your classmates could read. Include your name, where you live, work or study, and one interest.</p></div><span class="eg-question-count">Target 20–40 words</span></header>'+
 '<article class="guided-question"><div class="question-stage"><span>Real-life writing</span></div><textarea id="a1WritingText" rows="7" placeholder="Hi. My name is ...">'+esc(saved)+'</textarea><div class="muted" id="a1WritingCount">0 words</div><label class="share-writing-choice"><input type="checkbox" id="a1ShareWriting"> Share this to My Writings after I improve it.</label></article>'+
 '<div id="activityFeedback"></div><div class="skill-action-row"><button class="primary-btn" id="a1SaveWriting">Check & save writing</button><button class="secondary-btn done-activity-btn" id="doneActivity" disabled>Continue →</button></div></div>'
}
function speakingHtml(){
 const prompts=[
  "Sarah: Hi. I'm Sarah. Nice to meet you.",
  'Sarah: Where do you live?',
  'Sarah: What do you do?',
  'Sarah: What do you like?',
  'Sarah: Before we finish, ask me two questions about myself.'
 ];
 return '<div class="eg-skill-page a1-gold-stage"><header class="eg-skill-hero"><div><span class="eg-skill-kicker">Speaking transfer</span><h1>Meet your new classmate</h1><p>Respond naturally. You may speak with the microphone or type what you would say.</p></div><span class="eg-question-count">5 turns</span></header><div class="a1-speaking-turns">'+
 prompts.map(function(p,i){return '<article class="guided-question a1-speaking-turn"><div class="question-stage"><span>Turn '+(i+1)+'</span></div><p>'+esc(p)+'</p><textarea rows="3" data-a1-speaking="'+i+'" placeholder="Speak or type your answer…"></textarea><button type="button" class="ghost-btn" data-a1-mic="'+i+'">Use microphone</button></article>'}).join('')+
 '</div><div id="activityFeedback"></div><div class="skill-action-row"><button class="primary-btn" id="a1EvaluateSpeaking">Check speaking transfer</button><button class="secondary-btn done-activity-btn" id="doneActivity" disabled>Continue →</button></div></div>'
}
function reviewHtml(){
 const stored=readA1Evidence(),note=stored.speakingFeedback&&stored.speakingFeedback.improve?stored.speakingFeedback.improve:'Review three high-value forms from this lesson, then try them again.';
 const qs=[
  ['Complete: I live ___ Hargeisa.',['at','in','on'],'in'],
  ["Complete: What's ___ name?",['you','your','yours'],'your'],
  ["Complete: I'm ___ teacher.",['the','a','an'],'a']
 ];
 return stageShell('Fix & Improve','Repair the language that matters',''+note+'',qs.map(function(x,i){return choice('a1fix'+i,x[0],x[1],x[2],'review:repair')}).join(''),'Check improvement')
}
function evidenceKey(){return 'englishgate:a1-gold-l1:evidence:'+(session&&session.id||'preview')}
function readA1Evidence(){try{return JSON.parse(localStorage.getItem(evidenceKey())||'{}')||{}}catch(e){return{}}}
function saveA1Evidence(patch){try{localStorage.setItem(evidenceKey(),JSON.stringify(Object.assign({},readA1Evidence(),patch)))}catch(e){}}

async function saveWriting(l){
 const box=$('a1WritingText'),feedback=$('activityFeedback'),text=String(box&&box.value||'').trim(),count=wc(text);
 if(count<20){feedback.innerHTML='<div class="feedback bad">Write at least 20 words so your introduction includes enough real information. You have '+count+' words.</div>';return}
 if(count>50){feedback.innerHTML='<div class="feedback bad">Keep this A1 introduction concise. Aim for 20–40 words; you have '+count+'.</div>';return}
 let grade={score:65,feedback:{strength:'Your introduction communicates personal information.',improve:'Jev feedback is temporarily unavailable; review the target language, then read your message once more.'},fallback:true};
 if(!isWorkbookPreview()){
  try{grade=await api('/api/writing-grade',{method:'POST',body:JSON.stringify({lessonId:l.id,task:l.writing.task,text:text,level:'A1',minWords:20,maxWords:40})})}catch(e){}
  await api('/api/writing/'+encodeURIComponent(l.id),{method:'PUT',body:JSON.stringify({content:text,publishToCommunity:Boolean($('a1ShareWriting')&&$('a1ShareWriting').checked)})});
  const evidence=[{index:1,question:l.writing.task,studentAnswer:text,correctAnswer:'Authentic A1 introduction: name + place + work/study + interest',correct:null,tag:'writing:real-life-introduction'}];
  const writingScore=Math.max(0,Math.min(100,Math.round(Number(grade.score)||65)));
  await recordAttempt(session.id,l.id,'writing',writingScore,['curriculum:a1-gold-v1','writing:authentic','writing:jev-'+(grade.fallback?'fallback':'checked')],evidence);
  if(writingScore>=60)await markDone(session.id,l.id,'writing');
  await refreshState()
 }
 saveA1Evidence({writing:text,writingFeedback:grade.feedback||null});
 const finalWritingScore=Math.round(Number(grade.score)||65),writingPassed=finalWritingScore>=60;
 feedback.innerHTML='<div class="performance-result '+(writingPassed?'good':'bad')+'"><div class="performance-score"><strong>'+finalWritingScore+'%</strong><span>Writing evidence</span></div><p>'+esc((grade.feedback&&grade.feedback.strength)||'Your introduction is saved.')+'</p><p>'+esc((grade.feedback&&grade.feedback.improve)||'Review it once, then continue.')+'</p></div>';
 $('doneActivity').disabled=!writingPassed
}
function speakingEvidence(prompts,answers){
 return answers.map(function(a,i){return{index:i+1,question:prompts[i],studentAnswer:a,correctAnswer:'Meaningful A1 spoken response',correct:null,tag:i===4?'speaking:initiate-questions':'speaking:turn'}})
}
async function evaluateSpeaking(l){
 const boxes=Array.prototype.slice.call(document.querySelectorAll('[data-a1-speaking]')),answers=boxes.map(function(x){return x.value.trim()}),feedback=$('activityFeedback');
 if(answers.some(function(x){return wc(x)<1})){feedback.innerHTML='<div class="feedback bad">Respond to all five turns first.</div>';return}
 const qCount=questionCount(answers[4]);
 if(qCount<2){feedback.innerHTML='<div class="feedback bad">In the final turn, ask Sarah two questions. This proves you can initiate the conversation too.</div>';return}
 let result={score:65,status:'A1_FUNCTIONAL',feedback:{strength:'You completed the conversation.',improve:'Jev feedback is temporarily unavailable; keep your questions short and clear.'},fallback:true};
 if(!isWorkbookPreview()){
  try{result=await api('/api/a1/speaking/evaluate',{method:'POST',body:JSON.stringify({lessonId:l.id,responses:answers})})}catch(e){}
  const speakingScore=Math.max(0,Math.min(100,Math.round(Number(result.score)||65)));
  await recordAttempt(session.id,l.id,'speaking',speakingScore,['curriculum:a1-gold-v1','speaking:transfer','speaking:'+(result.status||'functional').toLowerCase()],speakingEvidence([
   "Hi. I'm Sarah. Nice to meet you.",'Where do you live?','What do you do?','What do you like?','Ask Sarah two questions.'
  ],answers));
  if(speakingScore>=60&&result.status!=='A1_DEVELOPING')await markDone(session.id,l.id,'speaking');
  await refreshState()
 }
 saveA1Evidence({speaking:answers,speakingStatus:result.status,speakingFeedback:result.feedback||null});
 const finalSpeakingScore=Math.round(Number(result.score)||65),speakingPassed=finalSpeakingScore>=60&&result.status!=='A1_DEVELOPING';
 feedback.innerHTML='<div class="performance-result '+(speakingPassed?'good':'bad')+'"><div class="performance-score"><strong>'+finalSpeakingScore+'%</strong><span>'+esc(result.status||'Speaking evidence')+'</span></div><p>'+esc((result.feedback&&result.feedback.strength)||'You completed the exchange.')+'</p><p>'+esc((result.feedback&&result.feedback.improve)||'Review one form, then continue.')+'</p></div>';
 $('doneActivity').disabled=!speakingPassed
}
function wireMics(){
 document.querySelectorAll('[data-a1-mic]').forEach(function(btn){
  const idx=Number(btn.dataset.a1Mic),box=document.querySelector('[data-a1-speaking="'+idx+'"]'),SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){btn.hidden=true;return}
  btn.onclick=function(){
   const rec=new SR();rec.lang='en-US';rec.interimResults=false;rec.maxAlternatives=1;btn.disabled=true;btn.textContent='Listening…';
   rec.onresult=function(e){const text=e.results&&e.results[0]&&e.results[0][0]&&e.results[0][0].transcript||'';if(box){box.value=text;box.dispatchEvent(new Event('input',{bubbles:true}))}};
   rec.onerror=function(){};
   rec.onend=function(){btn.disabled=false;btn.textContent='Use microphone'};
   rec.start()
  }
 })
}
function wireGold(l){
 footerize(l);
 if($('doneActivity'))$('doneActivity').onclick=function(){a1Next(l)};
 if(currentStep==='listening'){
  if($('playAudio'))$('playAudio').onclick=function(){playListening(l)};
  if(typeof wireAudioControls==='function')wireAudioControls(l)
 }
 if(currentStep==='writing'){
  const box=$('a1WritingText'),count=$('a1WritingCount');
  const sync=function(){if(count)count.textContent=wc(box&&box.value)+' words · target 20–40'};
  if(box){box.addEventListener('input',sync);sync()}
  if($('a1SaveWriting'))$('a1SaveWriting').onclick=function(){saveWriting(l).catch(function(e){$('activityFeedback').innerHTML='<div class="feedback bad">'+esc(e.message)+'</div>'})}
  return
 }
 if(currentStep==='speaking'){
  wireMics();
  if($('a1EvaluateSpeaking'))$('a1EvaluateSpeaking').onclick=function(){evaluateSpeaking(l).catch(function(e){$('activityFeedback').innerHTML='<div class="feedback bad">'+esc(e.message)+'</div>'})};
  return
 }
 if($('a1CheckStage'))$('a1CheckStage').onclick=function(){
  saveChoiceStage(l,currentStep).catch(function(e){$('activityFeedback').innerHTML='<div class="feedback bad">'+esc(e.message)+'</div>'})
 }
}
renderActivity=function(){
 const l=lesson();
 if(!isGoldLesson(l)){baseRenderActivity();return}
 document.body.classList.remove('student-question-focus-mode');
 const p=$('activityPanel');
 if(currentStep==='vocabulary')p.innerHTML=vocabHtml(l);
 else if(currentStep==='grammar')p.innerHTML=languageHtml(l);
 else if(currentStep==='reading')p.innerHTML=readingHtml(l);
 else if(currentStep==='listening')p.innerHTML=listeningHtml(l);
 else if(currentStep==='writing')p.innerHTML=writingHtml(l);
 else if(currentStep==='speaking')p.innerHTML=speakingHtml(l);
 else if(currentStep==='review')p.innerHTML=reviewHtml(l);
 wireMcqCards(p);
 wireGold(l)
};

window.A1_GOLD_RUNTIME_VERSION=A1_GOLD_VERSION;
window.A1_GOLD_CURRICULUM_VERSION=A1_CURRICULUM_VERSION;
})();