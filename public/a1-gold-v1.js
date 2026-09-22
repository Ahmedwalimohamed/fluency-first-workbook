(function(){
'use strict';

const VERSION='englishgate-a1-gold-v1.0';
const BOOK_ID='speakup-a1-gold';
const LESSON_ID='a1-gold-l1';

function q(id,text,options,answer,tag,feedback){
  return {id,q:text,options,answer,tag,feedback:feedback||''};
}
function vocab(id,word,meaning,example,distractors){
  return q(id,`What does “${word}” mean?`,[meaning,...distractors],meaning,'vocabulary:meaning',`${word}: ${meaning}. Example: ${example}`);
}

const vocabEntries=[
  {word:'name',meaning:'what people call you',example:'My name is Amina.'},
  {word:'live',meaning:'have your home in a place',example:'I live in Borama.'},
  {word:'work',meaning:'do a job',example:'I work at a school.'},
  {word:'study',meaning:'learn at school, college or university',example:'I study English.'},
  {word:'teacher',meaning:'a person who helps people learn',example:'I am a teacher.'},
  {word:'student',meaning:'a person who is learning',example:'I am a student.'},
  {word:'city',meaning:'a large place where many people live',example:'Hargeisa is a city.'},
  {word:'like',meaning:'enjoy something',example:'I like football.'}
];

const vocabularyItems=[
  vocab('A1L1_V01','name','what people call you','My name is Amina.',['a place where you work','something you eat']),
  vocab('A1L1_V02','live','have your home in a place','I live in Borama.',['ask a question','do a job']),
  vocab('A1L1_V03','teacher','a person who helps people learn','I am a teacher.',['a person who drives a bus','a place where people live']),
  vocab('A1L1_V04','student','a person who is learning','I am a student.',['a person who teaches','a country']),
  q('A1L1_V05','Complete: I ___ in Borama.',['live','teacher','city'],'live','vocabulary:use','Use “live in + place”.'),
  q('A1L1_V06','Complete: I ___ football.',['like','student','name'],'like','vocabulary:use','Use “like + thing/activity”.')
];

const grammarItems=[
  q('A1L1_G01','Complete: I ___ a student.',['am','is','are'],'am','grammar:be','With “I”, use “am”.'),
  q('A1L1_G02','Choose the correct question.',['What’s your name?','What your name?','Where your name?'],'What’s your name?','grammar:question','Use “What’s your name?”'),
  q('A1L1_G03','Complete: I ___ in Hargeisa.',['live','lives','living'],'live','grammar:present-simple','With “I”, use “live”.'),
  q('A1L1_G04','Complete: I am ___ teacher.',['a','an','the two'],'a','grammar:article','Use “a” before “teacher”.'),
  q('A1L1_G05','Choose the correct question.',['Where do you live?','Where you live?','Where does you live?'],'Where do you live?','grammar:question','Use “Where do you live?”'),
  q('A1L1_G06','Choose the best reply to “Nice to meet you.”',['Nice to meet you too.','I live in Borama.','Teacher.'],'Nice to meet you too.','grammar:interaction','Reply with “Nice to meet you too.”')
];

const readingText="Hi. My name is Hamza. I'm from Somalia. I live in Hargeisa. I'm a driver. I work for a small company. I like football and coffee.";
const listeningScript="Maryan: Hi. I'm Maryan. I'm from Somalia, and I live in Borama. I'm a teacher. I work at a school. I like reading and walking.";

const readingQuestions=[
  q('A1L1_R01','What is his name?',['Hamza','Ahmed','Hassan'],'Hamza','reading:detail','The profile says, “My name is Hamza.”'),
  q('A1L1_R02','Where does Hamza live?',['Borama','Hargeisa','Berbera'],'Hargeisa','reading:detail','He says, “I live in Hargeisa.”'),
  q('A1L1_R03','What does Hamza do?',['He is a driver.','He is a teacher.','He is a student.'],'He is a driver.','reading:detail','The profile says, “I’m a driver.”'),
  q('A1L1_R04','What does Hamza like?',['Football and coffee','Reading and walking','Music and tea'],'Football and coffee','reading:detail','He says he likes football and coffee.')
];

const listeningQuestions=[
  q('A1L1_L01','What is her name?',['Amina','Maryan','Sahra'],'Maryan','listening:detail','Listen for “I’m Maryan.”'),
  q('A1L1_L02','Where does Maryan live?',['Borama','Hargeisa','Berbera'],'Borama','listening:detail','Listen for “I live in Borama.”'),
  q('A1L1_L03','What does Maryan do?',['She is a teacher.','She is a doctor.','She is a driver.'],'She is a teacher.','listening:detail','Listen for “I’m a teacher.”'),
  q('A1L1_L04','What does Maryan like?',['Reading and walking','Football and coffee','Travel and music'],'Reading and walking','listening:detail','Listen for “I like reading and walking.”')
];

const targetLanguage=[
  "Hi. I'm…",
  'My name is…',
  "I'm from…",
  'I live in…',
  "I'm a…",
  'I work at…',
  'I study…',
  'I like…',
  "What's your name?",
  'Where are you from?',
  'Where do you live?',
  'What do you do?',
  'What do you like?'
];

const lesson={
  id:LESSON_ID,
  number:1,
  title:'Getting Acquainted',
  outcome:'Introduce yourself and exchange basic personal information with someone you have just met.',
  ready:true,
  standardVersion:VERSION,
  releaseStatus:'pilot',
  phase:1,
  readingSkill:'Find explicit personal information in a short profile.',
  communicationGoal:'Introduce yourself and exchange name, place, work/study and one interest.',
  realWorldSituation:'Your first day in a new evening English class.',
  targetVocabulary:vocabEntries.map(x=>x.word),
  recycledVocabulary:[],
  vocabularyEntries:vocabEntries,
  targetLanguage,
  chunks:["Nice to meet you.","Nice to meet you too.","Really?","Me too."],
  interactionExpressions:["What's your name?",'Where do you live?','What do you do?','What do you like?'],
  functions:['greet','introduce','ask','answer','express a simple preference'],
  discourse:['short complete sentences','simple reciprocal questions','natural greeting and response'],
  vocabulary:{items:vocabularyItems},
  grammar:{
    focus:'Introducing yourself with be, live, and basic personal questions.',
    rule:'Use “I’m / I am” for identity, “I live in + place”, and simple questions to learn about another person.',
    items:grammarItems
  },
  listening:{
    title:'Getting Acquainted · Listening',
    readingText,
    audioScript:listeningScript,
    text:listeningScript,
    speakers:[{name:'Maryan',gender:'female',voice:'nova'}],
    questions:[...readingQuestions,...listeningQuestions]
  },
  writing:{
    task:'Your new English class has a group page. Write a short introduction so your classmates can know you. Include your name, where you live, work or study, and one interest.',
    minWords:20,
    maxWords:40,
    humanGraded:false,
    checkpoint:false,
    realWorldSurface:'class group introduction',
    copyPasteDisabled:true
  },
  foundation:'Meet someone new using simple, useful English.',
  performance:'Meet a new classmate. Introduce yourself, give at least two pieces of personal information, ask at least two relevant questions, and respond naturally.',
  pronunciation:'Practise: I’m Amina. What’s your name? Where are you from? What do you do? Nice to meet you.',
  mediation:'Listen to your partner and remember their name plus one detail.',
  review:{
    keywords:'name · live · work · study · teacher · student · city · like',
    mission:'Introduce yourself and exchange basic personal information without reading a full script.'
  },
  mastery:{
    requiresTransfer:true,
    communicationGoal:'introduce_self_and_exchange_basic_information',
    minimumSpeakingEvidence:{personalDetails:2,relevantQuestions:2,maintainsExchange:true}
  },
  fixAndImprove:[
    {pattern:'I live Borama.',model:'I live in Borama.',focus:'live in + place'},
    {pattern:'What your name?',model:"What's your name?",focus:'question form'},
    {pattern:'I am teacher.',model:'I am a teacher.',focus:'article a'}
  ]
};

const liveContent=[
  'LESSON 1 Getting Acquainted',
  'CAN-DO GOAL: '+lesson.outcome,
  'PAGE 1 — REAL-LIFE START',
  'You are starting a new English course. You meet the person next to you.',
  'Try first: What can you say?',
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
  '',
  'QUICK CHECK',
  '1. What is the woman’s name?',
  '2. Where does Hassan live?',
  '3. What does Amina do?',
  '4. What does Hassan like?',
  '',
  'PAGE 3 — NOTICE & PRONUNCIATION',
  'Useful patterns',
  "• I'm…",
  '• I live in…',
  "• I'm a…",
  '• I like…',
  "• What's your name?",
  '• Where do you live?',
  '• What do you do?',
  'Listen → repeat → personalise.',
  '',
  'PAGE 4 — SEE → CHANGE → USE',
  'Model: I’m Amina. → I’m [your name].',
  'Model: I live in Borama. → I live in [your city].',
  'Model: I like football. → I like [your interest].',
  'Now introduce yourself using your real information.',
  '',
  'PAGE 5 — CONVERSATION BUILDER',
  'Ask your partner about:',
  '• name',
  '• city',
  '• work or study',
  '• interest',
  'React naturally with: Really? / Me too. / Nice.',
  '',
  'PAGE 6 — LIVE TRANSFER',
  'MEET YOUR NEW CLASSMATE',
  'Introduce yourself and ask at least two relevant questions.',
  'Success means:',
  '• I give at least two pieces of personal information.',
  '• I answer understandable questions.',
  '• I ask at least two relevant questions.',
  '• I keep the short exchange moving.',
  '',
  'PAGE 7 — REFLECTION',
  'Today I can…',
  '☐ introduce myself',
  '☐ ask someone basic personal questions',
  '☐ respond naturally to one thing they say',
  'One sentence I used well:',
  '____________________________',
  'One thing I want to fix:',
  '____________________________'
].join('\n');

const book={
  id:BOOK_ID,
  title:'A1 Beginner',
  level:'A1',
  moduleTitle:'A1 Beginner · Gold v1.0',
  moduleGoal:'Build functional basic communication through 22 real-life lessons.',
  totalLessons:22,
  lessons:[lesson],
  standardVersion:VERSION,
  releaseStatus:'pilot',
  curriculumLocked:true
};

if(typeof BOOK_PACKS!=='undefined')BOOK_PACKS[BOOK_ID]=book;
window.A1_GOLD_V1_BOOK=book;
window.A1_GOLD_V1_VERSION=VERSION;
window.LIVE_BOOKS=window.LIVE_BOOKS||{};
window.LIVE_BOOKS[BOOK_ID]={title:'A1 Beginner',standardVersion:VERSION,releaseStatus:'pilot',lessons:[{number:1,title:'Getting Acquainted',content:liveContent}]};
})();