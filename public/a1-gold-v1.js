(function(){
'use strict';

const VERSION='englishgate-a1-gold-v1.2-batch-b';
const BOOK_ID='speakup-a1-gold';

function q(id,text,options,answer,tag,feedback=''){return{id,q:text,options,answer,tag,feedback}}
function vq(id,entry,distractors){return q(id,`What does “${entry.word}” mean?`,[entry.meaning,...distractors],entry.meaning,'vocabulary:meaning',`${entry.word}: ${entry.meaning}. Example: ${entry.example}`)}
function entry(word,meaning,example){return{word,meaning,example}}
function lesson(spec){
  return {
    id:spec.id,number:spec.number,title:spec.title,outcome:spec.outcome,ready:true,standardVersion:VERSION,releaseStatus:'pilot',phase:1,
    readingSkill:spec.readingSkill,communicationGoal:spec.communicationGoal,realWorldSituation:spec.realWorldSituation,
    targetVocabulary:spec.vocab.map(x=>x.word),recycledVocabulary:spec.recycled||[],vocabularyEntries:spec.vocab,
    targetLanguage:spec.targetLanguage,chunks:spec.chunks||[],interactionExpressions:spec.interactionExpressions||[],
    functions:spec.functions||[],discourse:spec.discourse||['short complete sentences','simple reciprocal questions'],
    vocabulary:{items:spec.vocabItems},grammar:{focus:spec.grammarFocus,rule:spec.grammarRule,items:spec.grammarItems},
    listening:{title:spec.title+' · Reading & Listening',readingText:spec.readingText,audioScript:spec.audioScript,text:spec.audioScript,speakers:spec.speakers||[],questions:[...spec.readingQuestions,...spec.listeningQuestions]},
    writing:spec.writing,foundation:spec.foundation,performance:spec.performance,pronunciation:spec.pronunciation,mediation:spec.mediation,
    review:{keywords:spec.reviewKeywords,mission:spec.reviewMission},
    mastery:{requiresTransfer:true,communicationGoal:spec.masteryGoal,minimumSpeakingEvidence:spec.minimumSpeakingEvidence},
    fixAndImprove:spec.fixAndImprove||[]
  };
}
function live(spec,modelLines){
  return [
    `LESSON ${spec.number} ${spec.title}`,
    'CAN-DO GOAL: '+spec.outcome,
    'PAGE 1 — REAL-LIFE START',
    spec.realWorldSituation,
    'Try first: What can you say?',
    '',
    'PAGE 2 — MODEL',
    ...modelLines,
    '',
    'PAGE 3 — NOTICE & PRONUNCIATION',
    ...spec.targetLanguage.map(x=>'• '+x),
    'Listen → repeat → personalise.',
    '',
    'PAGE 4 — SEE → CHANGE → USE',
    'Use the model language with your real information.',
    'Change one detail, then say the new sentence aloud.',
    '',
    'PAGE 5 — CONVERSATION BUILDER',
    spec.performance,
    '',
    'PAGE 6 — LIVE TRANSFER',
    spec.reviewMission,
    'Success means the listener understands your message and you keep the short exchange moving.',
    '',
    'PAGE 7 — REFLECTION',
    'Today I can…',
    '☐ complete the real-life goal',
    '☐ ask or answer a useful question',
    '☐ fix one important language problem',
    'One sentence I used well: ____________________________',
    'One thing I want to fix: ____________________________'
  ].join('\n');
}

const l1v=[
 entry('name','what people call you','My name is Amina.'),
 entry('live','have your home in a place','I live in Borama.'),
 entry('work','do a job','I work at a school.'),
 entry('study','learn at school, college or university','I study English.'),
 entry('teacher','a person who helps people learn','I am a teacher.'),
 entry('student','a person who is learning','I am a student.'),
 entry('city','a large place where many people live','Hargeisa is a city.'),
 entry('like','enjoy something','I like football.')
];
const L1=lesson({
 id:'a1-gold-l1',number:1,title:'Getting Acquainted',
 outcome:'Introduce yourself and exchange basic personal information with someone you have just met.',
 readingSkill:'Find explicit personal information in a short profile.',
 communicationGoal:'Introduce yourself and exchange name, place, work or study, and one interest.',
 realWorldSituation:'Your first day in a new evening English class.',
 vocab:l1v,recycled:[],
 vocabItems:[
  vq('A1L1_V01',l1v[0],['a place where you work','something you eat']),
  vq('A1L1_V02',l1v[1],['ask a question','do a job']),
  vq('A1L1_V03',l1v[4],['a person who drives a bus','a place where people live']),
  vq('A1L1_V04',l1v[5],['a person who teaches','a country']),
  q('A1L1_V05','Complete: I ___ in Borama.',['live','teacher','city'],'live','vocabulary:use','Use “live in + place”.'),
  q('A1L1_V06','Complete: I ___ football.',['like','student','name'],'like','vocabulary:use','Use “like + thing or activity”.')
 ],
 targetLanguage:["Hi. I'm…",'My name is…',"I'm from…",'I live in…',"I'm a…",'I work at…','I study…','I like…',"What's your name?",'Where are you from?','Where do you live?','What do you do?','What do you like?'],
 chunks:['Nice to meet you.','Nice to meet you too.','Really?','Me too.'],
 interactionExpressions:["What's your name?",'Where do you live?','What do you do?','What do you like?'],
 functions:['greet','introduce','ask','answer','express a simple preference'],
 grammarFocus:'Introducing yourself with be, live, and basic personal questions.',
 grammarRule:'Use “I’m / I am” for identity, “I live in + place”, and simple questions to learn about another person.',
 grammarItems:[
  q('A1L1_G01','Complete: I ___ a student.',['am','is','are'],'am','grammar:be','With “I”, use “am”.'),
  q('A1L1_G02','Choose the correct question.',['What’s your name?','What your name?','Where your name?'],'What’s your name?','grammar:question','Use “What’s your name?”'),
  q('A1L1_G03','Complete: I ___ in Hargeisa.',['live','lives','living'],'live','grammar:present-simple','With “I”, use “live”.'),
  q('A1L1_G04','Complete: I am ___ teacher.',['a','an','the two'],'a','grammar:article','Use “a” before “teacher”.'),
  q('A1L1_G05','Choose the correct question.',['Where do you live?','Where you live?','Where does you live?'],'Where do you live?','grammar:question','Use “Where do you live?”')
 ],
 readingText:"Hi. My name is Hamza. I'm from Somalia. I live in Hargeisa. I'm a driver. I work for a small company. I like football and coffee.",
 audioScript:"Maryan: Hi. I'm Maryan. I'm from Somalia, and I live in Borama. I'm a teacher. I work at a school. I like reading and walking.",
 speakers:[{name:'Maryan',gender:'female',voice:'nova'}],
 readingQuestions:[
  q('A1L1_R01','What is his name?',['Hamza','Ahmed','Hassan'],'Hamza','reading:detail','The profile says, “My name is Hamza.”'),
  q('A1L1_R02','Where does Hamza live?',['Borama','Hargeisa','Berbera'],'Hargeisa','reading:detail','He says, “I live in Hargeisa.”'),
  q('A1L1_R03','What does Hamza do?',['He is a driver.','He is a teacher.','He is a student.'],'He is a driver.','reading:detail','The profile says, “I’m a driver.”'),
  q('A1L1_R04','What does Hamza like?',['Football and coffee','Reading and walking','Music and tea'],'Football and coffee','reading:detail','He says he likes football and coffee.')
 ],
 listeningQuestions:[
  q('A1L1_L01','What is her name?',['Amina','Maryan','Sahra'],'Maryan','listening:detail','Listen for “I’m Maryan.”'),
  q('A1L1_L02','Where does Maryan live?',['Borama','Hargeisa','Berbera'],'Borama','listening:detail','Listen for “I live in Borama.”'),
  q('A1L1_L03','What does Maryan do?',['She is a teacher.','She is a doctor.','She is a driver.'],'She is a teacher.','listening:detail','Listen for “I’m a teacher.”'),
  q('A1L1_L04','What does Maryan like?',['Reading and walking','Football and coffee','Travel and music'],'Reading and walking','listening:detail','Listen for “I like reading and walking.”')
 ],
 writing:{task:'Your new English class has a group page. Write a short introduction so your classmates can know you. Include your name, where you live, work or study, and one interest.',minWords:20,maxWords:40,humanGraded:false,checkpoint:false,realWorldSurface:'class group introduction',copyPasteDisabled:true},
 foundation:'Meet someone new using simple, useful English.',
 performance:'Meet a new classmate. Introduce yourself, give at least two pieces of personal information, ask at least two relevant questions, and respond naturally.',
 pronunciation:"Practise: I’m Amina. What’s your name? Where are you from? What do you do? Nice to meet you.",
 mediation:'Listen to your partner and remember their name plus one detail.',
 reviewKeywords:'name · live · work · study · teacher · student · city · like',
 reviewMission:'Introduce yourself and exchange basic personal information without reading a full script.',
 masteryGoal:'introduce_self_and_exchange_basic_information',
 minimumSpeakingEvidence:{personalDetails:2,relevantQuestions:2,maintainsExchange:true},
 fixAndImprove:[{pattern:'I live Borama.',model:'I live in Borama.',focus:'live in + place'},{pattern:'What your name?',model:"What's your name?",focus:'question form'},{pattern:'I am teacher.',model:'I am a teacher.',focus:'article a'}]
});

const l2v=[
 entry('driver','a person whose job is driving','I am a driver.'),
 entry('nurse','a person who cares for sick people','I am a nurse.'),
 entry('office','a place where people do desk work','I work in an office.'),
 entry('school','a place where people teach and learn','I work at a school.'),
 entry('hospital','a place where sick people receive care','I work at a hospital.'),
 entry('customer','a person who buys or uses a service','I help customers.'),
 entry('help','make something easier for someone','I help customers.'),
 entry('job','the work you do for money','My job is teaching.')
];
const L2=lesson({
 id:'a1-gold-l2',number:2,title:'Work & Careers',
 outcome:'Say what you do, where you work or study, and one basic thing you do there.',
 readingSkill:'Find a job, workplace, and work action in a short profile.',
 communicationGoal:'Exchange simple information about work or study.',
 realWorldSituation:'You meet someone at a short workplace training session.',
 vocab:l2v,recycled:['work','study','teacher','student','name'],
 vocabItems:[
  vq('A1L2_V01',l2v[0],['a place for study','a person who buys something']),
  vq('A1L2_V02',l2v[1],['a person who drives','a room with desks']),
  vq('A1L2_V03',l2v[2],['a person who helps patients','a bus stop']),
  vq('A1L2_V04',l2v[4],['a place where buses leave','a person who studies']),
  q('A1L2_V05','Complete: I ___ customers.',['help','hospital','job'],'help','vocabulary:use','Use “help + people”.'),
  q('A1L2_V06','Complete: My ___ is teaching.',['job','office','customer'],'job','vocabulary:use','Use “job” for the work you do.')
 ],
 targetLanguage:["I'm a…",'I work at…','I work in…','I study at…','I help…','I drive…','What do you do?','Where do you work?','What do you do there?'],
 chunks:['Nice.','Really?','That sounds useful.'],
 interactionExpressions:['What do you do?','Where do you work?','What do you do there?'],
 functions:['state job or study','state workplace','state one work action','ask about work'],
 grammarFocus:'First-person work and study sentences.',
 grammarRule:'Keep the focus on “I”: I am a nurse. I work at a hospital. I help patients. Do not add third-person -s here.',
 grammarItems:[
  q('A1L2_G01','Complete: I ___ a nurse.',['am','is','are'],'am','grammar:be','With “I”, use “am”.'),
  q('A1L2_G02','Complete: I ___ at a school.',['work','works','working'],'work','grammar:present-simple','With “I”, use the base verb “work”.'),
  q('A1L2_G03','Complete: I ___ customers.',['help','helps','helping'],'help','grammar:present-simple','With “I”, use “help”.'),
  q('A1L2_G04','Choose the correct question.',['What do you do?','What does you do?','What you do?'],'What do you do?','grammar:question','Use “do” with “you”.'),
  q('A1L2_G05','Choose the natural sentence.',['I work in an office.','I works in an office.','I am work in an office.'],'I work in an office.','grammar:present-simple','Use “I work…”.')
 ],
 readingText:'My name is Ibrahim. I live in Hargeisa. I am a driver. I work for a transport company. I drive a bus and I meet customers every day.',
 audioScript:'Hodan: Hi. I am Hodan. I am a nurse. I work at a hospital. I help patients. I start work at eight in the morning.',
 speakers:[{name:'Hodan',gender:'female',voice:'nova'}],
 readingQuestions:[
  q('A1L2_R01','What is Ibrahim’s job?',['Driver','Nurse','Teacher'],'Driver','reading:detail','He says, “I am a driver.”'),
  q('A1L2_R02','Ibrahim’s workplace is…',['A transport company','A school','A hospital'],'A transport company','reading:detail','The profile says, “I work for a transport company.”'),
  q('A1L2_R03','Ibrahim’s work vehicle is…',['A bus','A taxi','A truck'],'A bus','reading:detail','The profile says, “I drive a bus.”')
 ],
 listeningQuestions:[
  q('A1L2_L01','What is Hodan’s job?',['Nurse','Driver','Student'],'Nurse','listening:detail','Listen for “I am a nurse.”'),
  q('A1L2_L02','Hodan’s workplace is…',['A hospital','An office','A school'],'A hospital','listening:detail','Listen for “I work at a hospital.”'),
  q('A1L2_L03','Hodan’s work action is…',['Help patients','Drive a bus','Teach students'],'Help patients','listening:detail','Listen for “I help patients.”'),
  q('A1L2_L04','Hodan’s start time is…',['8:00','9:00','10:00'],'8:00','listening:detail','Listen for “eight in the morning.”')
 ],
 writing:{task:'Write a short introduction for a professional group. Say your name, your job or study, where you work or study, and one thing you do there.',minWords:20,maxWords:40,humanGraded:false,checkpoint:false,realWorldSurface:'professional group introduction',copyPasteDisabled:true},
 foundation:'Talk about your work or study with first-person English.',
 performance:'Meet someone at training. Say your job or study, your workplace, and one thing you do. Ask at least one relevant question.',
 pronunciation:'Practise: I work at a school. I work in an office. What do you do? Where do you work?',
 mediation:'Listen to a partner and remember their job plus workplace.',
 reviewKeywords:'driver · nurse · office · school · hospital · customer · help · job',
 reviewMission:'Tell a new colleague what you do, where you work or study, and one thing you do there.',
 masteryGoal:'exchange_basic_work_information',
 minimumSpeakingEvidence:{personalDetails:3,relevantQuestions:1,maintainsExchange:true},
 fixAndImprove:[{pattern:'I am nurse.',model:'I am a nurse.',focus:'article a'},{pattern:'I work hospital.',model:'I work at a hospital.',focus:'work at + place'},{pattern:'What you do?',model:'What do you do?',focus:'question form'}]
});

const l3v=[
 entry('bus','a large road vehicle for many passengers','I take the bus.'),
 entry('ticket','a paper or digital pass for travel','I want a ticket to Hargeisa.'),
 entry('station','a place where buses or trains arrive and leave','I am at the bus station.'),
 entry('airport','a place where planes arrive and leave','The airport is near the city.'),
 entry('taxi','a car you pay to take you somewhere','I need a taxi.'),
 entry('leave','go away from a place','I leave in the morning.'),
 entry('arrive','reach a place','I arrive at eleven.'),
 entry('platform','the numbered place where you wait for a bus or train','The bus is at platform 2.')
];
const L3=lesson({
 id:'a1-gold-l3',number:3,title:'Travel & Adventure',
 outcome:'Buy a simple ticket and ask about time, price, and place.',
 readingSkill:'Use a simple travel board to find destination, time, platform, and price.',
 communicationGoal:'Ask for a ticket and understand basic travel information.',
 realWorldSituation:'You are at a bus station and need a ticket for a trip.',
 vocab:l3v,recycled:['city','want','need','where','how much','morning'],
 vocabItems:[
  vq('A1L3_V01',l3v[1],['a person who drives','a place to sleep']),
  vq('A1L3_V02',l3v[2],['a car you pay for','a job']),
  vq('A1L3_V03',l3v[4],['a paper for travel','a large bus building']),
  vq('A1L3_V04',l3v[7],['the price of a ticket','a person at an airport']),
  q('A1L3_V05','Complete: I want a ___ to Hargeisa.',['ticket','platform','station'],'ticket','vocabulary:use','Use “ticket to + place”.'),
  q('A1L3_V06','Complete: The bus is at ___ 2.',['platform','airport','taxi'],'platform','vocabulary:use','Use “platform + number”.')
 ],
 targetLanguage:['I want a ticket to…','Morning, please.','What time is the bus?','How much is the ticket?','Where is platform 2?','I need a taxi.','The afternoon bus is okay.'],
 chunks:['One ticket, please.','Thank you.','That is okay.'],
 interactionExpressions:['What time is the bus?','How much is the ticket?','Where is platform 2?'],
 functions:['request a ticket','ask time','ask price','ask place','adapt to a simple travel change'],
 grammarFocus:'Useful travel question chunks.',
 grammarRule:'Learn the whole useful question: “What time is the bus?” and “How much is the ticket?” Do not analyse or test “does” yet.',
 grammarItems:[
  q('A1L3_G01','Choose the request.',['I want a ticket to Hargeisa.','I ticket Hargeisa.','I am ticket to Hargeisa.'],'I want a ticket to Hargeisa.','grammar:functional-chunk','Use “I want a ticket to + place”.'),
  q('A1L3_G02','Which question asks about departure time?',['What time is the bus?','How much is the ticket?','Where is the station?'],'What time is the bus?','grammar:functional-chunk','Learn the full question as one useful chunk.'),
  q('A1L3_G03','Which question asks about price?',['How much is the ticket?','What time is the bus?','Where is platform 2?'],'How much is the ticket?','grammar:functional-chunk','Use “How much is…?” for price.'),
  q('A1L3_G04','Complete: The bus is ___ platform 2.',['at','in','from'],'at','grammar:place','Use “at + platform”.'),
  q('A1L3_G05','Choose the natural reply when the morning bus is full.',['The afternoon bus is okay.','I am platform.','How much morning?'],'The afternoon bus is okay.','grammar:interaction','Use a simple alternative.')
 ],
 readingText:'BUS BOARD\nBorama → Hargeisa\nTime: 8:00 a.m.\nArrive: 11:00 a.m.\nPlatform: 2\nPrice: $7',
 audioScript:'Agent: Hello. Traveler: Hi. I want a ticket to Berbera, please. Agent: Morning or afternoon? Traveler: Morning, please. What time is the bus? Agent: Nine thirty. Platform 3. Traveler: How much is the ticket? Agent: Six dollars.',
 speakers:[{name:'Agent',gender:'female',voice:'nova'},{name:'Traveler',gender:'male',voice:'onyx'}],
 readingQuestions:[
  q('A1L3_R01','Where does the bus go?',['Hargeisa','Berbera','Borama'],'Hargeisa','reading:detail','The board says Borama → Hargeisa.'),
  q('A1L3_R02','What time is the bus?',['8:00 a.m.','9:30 a.m.','11:00 a.m.'],'8:00 a.m.','reading:detail','The time is 8:00 a.m.'),
  q('A1L3_R03','What platform is it?',['2','3','7'],'2','reading:detail','The board says Platform 2.'),
  q('A1L3_R04','How much is the ticket?',['$7','$6','$11'],'$7','reading:detail','The price is $7.')
 ],
 listeningQuestions:[
  q('A1L3_L01','Where does the traveler want to go?',['Berbera','Hargeisa','Borama'],'Berbera','listening:detail','Listen for “a ticket to Berbera”.'),
  q('A1L3_L02','What time is the bus?',['9:30','8:00','11:00'],'9:30','listening:detail','The agent says “Nine thirty.”'),
  q('A1L3_L03','What platform is it?',['3','2','6'],'3','listening:detail','The agent says “Platform 3.”'),
  q('A1L3_L04','How much is the ticket?',['$6','$7','$9'],'$6','listening:detail','The agent says “Six dollars.”')
 ],
 writing:{task:'Write a short travel message. Say where you want to go, the travel time, and one other useful detail such as platform, price, or taxi.',minWords:20,maxWords:40,humanGraded:false,checkpoint:false,realWorldSurface:'travel message',copyPasteDisabled:true},
 foundation:'Use short travel questions as complete useful chunks.',
 performance:'Buy a ticket. Ask about time and price or platform. If the morning bus is full, choose the afternoon bus.',
 pronunciation:'Practise: One ticket, please. What time is the bus? How much is the ticket? Platform two.',
 mediation:'Read a travel board and tell a partner the time plus platform.',
 reviewKeywords:'bus · ticket · station · airport · taxi · leave · arrive · platform',
 reviewMission:'Get the travel information you need and respond to one simple change.',
 masteryGoal:'complete_basic_ticket_exchange',
 minimumSpeakingEvidence:{personalDetails:3,relevantQuestions:2,maintainsExchange:true},
 fixAndImprove:[{pattern:'I want ticket.',model:'I want a ticket.',focus:'article a'},{pattern:'How much ticket?',model:'How much is the ticket?',focus:'price question'},{pattern:'What time bus?',model:'What time is the bus?',focus:'time question'}]
});

const l4v=[
 entry('phone','a device you use to call, message, and go online','I use my phone every day.'),
 entry('computer','an electronic machine for work, study, and information','I use a computer at work.'),
 entry('message','a short piece of information sent to someone','I send messages.'),
 entry('video','moving pictures you watch on a screen','I watch videos.'),
 entry('call','speak to someone by phone','I make calls.'),
 entry('app','a program on a phone or computer','I use a learning app.'),
 entry('internet','the global network used for websites and online services','I use the internet for work.'),
 entry('use','do something with a tool or service','I use my phone for study.')
];
const L4=lesson({
 id:'a1-gold-l4',number:4,title:'Technology & Social Media',
 outcome:'Say what technology you use, how often you use it, and one purpose.',
 readingSkill:'Find device, purpose, and frequency in a short technology profile.',
 communicationGoal:'Exchange simple information about everyday technology use.',
 realWorldSituation:'You meet a classmate and talk about how you use technology.',
 vocab:l4v,recycled:['work','study','like','every day'],
 vocabItems:[
  vq('A1L4_V01',l4v[0],['a place where you work','a person who studies']),
  vq('A1L4_V02',l4v[1],['a short text to someone','a travel ticket']),
  vq('A1L4_V03',l4v[2],['moving pictures','a phone conversation']),
  vq('A1L4_V04',l4v[5],['the whole internet','a hospital']),
  q('A1L4_V05','Complete: I send ___.',['messages','computers','internet'],'messages','vocabulary:use','Use “send messages”.'),
  q('A1L4_V06','Complete: I use the ___ for work.',['internet','video','call'],'internet','vocabulary:use','Use “the internet”.')
 ],
 targetLanguage:['I use my phone every day.','I use a computer at work.','I send messages.','I make calls.','I watch videos.','I use the internet for work.','Do you use WhatsApp?','What do you use your phone for?'],
 chunks:['Every day.','At work.','At home.','For work.','For study.'],
 interactionExpressions:['Do you use WhatsApp?','What do you use your phone for?'],
 functions:['name a device','state purpose','state simple frequency','ask about technology use'],
 grammarFocus:'First-person present simple for technology routines.',
 grammarRule:'Use “I use… / I send… / I watch…” for routines. Use “Do you…?” to ask another person.',
 grammarItems:[
  q('A1L4_G01','Complete: I ___ my phone every day.',['use','uses','using'],'use','grammar:present-simple','With “I”, use “use”.'),
  q('A1L4_G02','Complete: I ___ messages.',['send','sends','sending'],'send','grammar:present-simple','With “I”, use “send”.'),
  q('A1L4_G03','Complete: I use the internet ___ work.',['for','at','to'],'for','grammar:purpose','Use “for + purpose”.'),
  q('A1L4_G04','Choose the correct question.',['Do you use WhatsApp?','Does you use WhatsApp?','You use WhatsApp?'],'Do you use WhatsApp?','grammar:question','Use “Do you…?”'),
  q('A1L4_G05','Choose the natural sentence.',['I use a computer at work.','I uses a computer at work.','I am use a computer at work.'],'I use a computer at work.','grammar:present-simple','Use the base verb with “I”.')
 ],
 readingText:'My name is Ayan. I use my phone every day. I send messages to my family and classmates. I use a computer at work. At home, I watch short videos and use a learning app.',
 audioScript:'Samira: Do you use a computer at work? Bilal: Yes. I use a computer at work. At home I use my phone. Samira: What do you use your phone for? Bilal: I send messages and watch videos.',
 speakers:[{name:'Samira',gender:'female',voice:'nova'},{name:'Bilal',gender:'male',voice:'onyx'}],
 readingQuestions:[
  q('A1L4_R01','What does Ayan use every day?',['Her phone','A bus','A ticket'],'Her phone','reading:detail','She says “I use my phone every day.”'),
  q('A1L4_R02','Who gets Ayan’s messages?',['Family and classmates','Customers only','Doctors'],'Family and classmates','reading:detail','She sends messages to family and classmates.'),
  q('A1L4_R03','Where does Ayan use a computer?',['At work','At the station','At a hospital'],'At work','reading:detail','She says “I use a computer at work.”'),
  q('A1L4_R04','What does she do at home?',['Watches videos and uses a learning app','Drives a bus','Buys tickets'],'Watches videos and uses a learning app','reading:detail','The final sentence gives both activities.')
 ],
 listeningQuestions:[
  q('A1L4_L01','Where does Bilal use a computer?',['At work','At home','At school only'],'At work','listening:detail','Listen for “I use a computer at work.”'),
  q('A1L4_L02','What does Bilal use at home?',['His phone','A bus','A hospital computer'],'His phone','listening:detail','He says “At home I use my phone.”'),
  q('A1L4_L03','What does Bilal do on his phone?',['Sends messages and watches videos','Buys tickets and drives','Reads a bus board'],'Sends messages and watches videos','listening:detail','Listen to his final answer.')
 ],
 writing:{task:'Write a short post about your technology use. Say one device you use, where or how often you use it, and two things you do with it.',minWords:25,maxWords:45,humanGraded:false,checkpoint:false,realWorldSurface:'technology-use post',copyPasteDisabled:true},
 foundation:'Describe simple technology routines with first-person English.',
 performance:'Tell a classmate what device you use, what you use it for, and how often. Ask one relevant question.',
 pronunciation:'Practise: I use my phone every day. I send messages. What do you use your phone for?',
 mediation:'Listen to a partner and remember one device plus one purpose.',
 reviewKeywords:'phone · computer · message · video · call · app · internet · use',
 reviewMission:'Explain your everyday technology use and ask another person one useful question.',
 masteryGoal:'exchange_basic_technology_use',
 minimumSpeakingEvidence:{personalDetails:3,relevantQuestions:1,maintainsExchange:true},
 fixAndImprove:[{pattern:'I use phone every day.',model:'I use my phone every day.',focus:'my + device'},{pattern:'I use internet work.',model:'I use the internet for work.',focus:'for + purpose'},{pattern:'What you use phone for?',model:'What do you use your phone for?',focus:'question form'}]
});

const l5v=[
 entry('tired','needing rest or sleep','I feel tired.'),
 entry('sick','not feeling healthy','I feel sick.'),
 entry('headache','pain in your head','I have a headache.'),
 entry('water','a clear drink your body needs','I need water.'),
 entry('sleep','rest with your eyes closed, usually at night','I sleep for eight hours.'),
 entry('walk','move on your feet','I walk every evening.'),
 entry('exercise','physical activity that helps your body stay strong','I exercise in the morning.'),
 entry('healthy','good for your body or mind','Walking is healthy.')
];
const L5=lesson({
 id:'a1-gold-l5',number:5,title:'Health & Wellbeing',
 outcome:'Say how you feel, name a simple health problem, and describe one healthy habit.',
 readingSkill:'Find a feeling, simple problem, and healthy habit in a short message.',
 communicationGoal:'Exchange simple information about how you feel and one healthy habit.',
 realWorldSituation:'You arrive at class feeling unwell and a classmate asks how you are.',
 vocab:l5v,recycled:['need','morning','evening','every day','feel'],
 vocabItems:[
  vq('A1L5_V01',l5v[0],['very hungry','very busy']),
  vq('A1L5_V02',l5v[2],['pain in your foot','a healthy drink']),
  vq('A1L5_V03',l5v[3],['a place to sleep','physical activity']),
  vq('A1L5_V04',l5v[6],['a type of ticket','a job']),
  q('A1L5_V05','Complete: I feel ___.',['tired','water','walk'],'tired','vocabulary:use','Use “feel + adjective”.'),
  q('A1L5_V06','Complete: I have a ___.',['headache','healthy','sleep'],'headache','vocabulary:use','Use “have a headache”.')
 ],
 targetLanguage:['I feel tired.','I feel sick.','I have a headache.','I need water.','I sleep for eight hours.','I walk every evening.','I exercise in the morning.','How do you feel?',"What's wrong?"],
 chunks:['I need some water.','I feel better now.','Thank you.'],
 interactionExpressions:['How do you feel?',"What's wrong?"],
 functions:['state a feeling','state a simple problem','state a basic need','state one healthy habit','ask how someone feels'],
 grammarFocus:'I feel / I have / I need for simple health communication.',
 grammarRule:'Use “I feel + adjective”, “I have + problem”, and “I need + thing”. Keep the lesson in first person.',
 grammarItems:[
  q('A1L5_G01','Complete: I ___ tired.',['feel','feels','feeling'],'feel','grammar:present-simple','Use “I feel…”.'),
  q('A1L5_G02','Complete: I ___ a headache.',['have','has','am'],'have','grammar:have','Use “I have a headache.”'),
  q('A1L5_G03','Complete: I ___ water.',['need','needs','needing'],'need','grammar:present-simple','Use “I need…”.'),
  q('A1L5_G04','Choose the correct question.',['How do you feel?','How does you feel?','How you feel?'],'How do you feel?','grammar:question','Use “How do you feel?”'),
  q('A1L5_G05','Choose the natural sentence.',['I walk every evening.','I walks every evening.','I am walk every evening.'],'I walk every evening.','grammar:present-simple','Use the base verb with “I”.')
 ],
 readingText:'My name is Amal. I work in an office. After work I often feel tired. I drink water, walk for twenty minutes, and sleep for eight hours. These habits help me feel better.',
 audioScript:'Amina: How do you feel? Hodan: I feel tired. I have a headache. I need water. Amina: Do you sleep well? Hodan: Yes. I sleep for eight hours most nights. I also walk in the evening.',
 speakers:[{name:'Amina',gender:'female',voice:'nova'},{name:'Hodan',gender:'female',voice:'shimmer'}],
 readingQuestions:[
  q('A1L5_R01','Where does Amal work?',['In an office','At a station','At an airport'],'In an office','reading:detail','The message says “I work in an office.”'),
  q('A1L5_R02','How does Amal often feel after work?',['Tired','Hungry','Cold'],'Tired','reading:detail','Amal says “I often feel tired.”'),
  q('A1L5_R03','How long does Amal walk?',['20 minutes','8 hours','2 minutes'],'20 minutes','reading:detail','The message says “walk for twenty minutes.”'),
  q('A1L5_R04','How many hours does Amal sleep?',['8','6','10'],'8','reading:detail','The message says “sleep for eight hours.”')
 ],
 listeningQuestions:[
  q('A1L5_L01','How does Hodan feel?',['Tired','Happy','Hungry'],'Tired','listening:detail','Listen for “I feel tired.”'),
  q('A1L5_L02','What problem does Hodan have?',['A headache','A ticket problem','A phone problem'],'A headache','listening:detail','Listen for “I have a headache.”'),
  q('A1L5_L03','What does Hodan need?',['Water','A taxi','A computer'],'Water','listening:detail','Listen for “I need water.”'),
  q('A1L5_L04','What healthy habit does Hodan mention?',['Walking in the evening','Driving a bus','Buying a ticket'],'Walking in the evening','listening:detail','She says she walks in the evening.')
 ],
 writing:{task:'Write a short message to your teacher. Say how you feel, one simple problem or need, and one healthy thing you do or plan to do today.',minWords:15,maxWords:35,humanGraded:false,checkpoint:false,realWorldSurface:'short message to teacher',copyPasteDisabled:true},
 foundation:'Communicate simple health and wellbeing information without giving medical advice.',
 performance:'Tell a classmate how you feel, one simple problem or need, and one healthy habit. Ask how they feel.',
 pronunciation:'Practise: I feel tired. I have a headache. I need water. How do you feel?',
 mediation:'Listen to a partner and remember how they feel plus one healthy habit.',
 reviewKeywords:'tired · sick · headache · water · sleep · walk · exercise · healthy',
 reviewMission:'Say how you feel and one healthy habit in a short, understandable exchange.',
 masteryGoal:'exchange_basic_wellbeing_information',
 minimumSpeakingEvidence:{personalDetails:2,relevantQuestions:1,maintainsExchange:true},
 fixAndImprove:[{pattern:'I am headache.',model:'I have a headache.',focus:'have + problem'},{pattern:'I feeling tired.',model:'I feel tired.',focus:'feel + adjective'},{pattern:'How you feel?',model:'How do you feel?',focus:'question form'}]
});


const l6v=[
 entry('rice','small white or brown grains eaten as food','I like rice.'),
 entry('meat','food from an animal','I eat meat.'),
 entry('vegetables','plants such as carrots or tomatoes eaten as food','I like vegetables.'),
 entry('tea','a hot drink made with tea leaves','I would like tea.'),
 entry('coffee','a dark drink made from coffee beans','I do not like coffee.'),
 entry('breakfast','the first meal of the day','I eat breakfast in the morning.'),
 entry('hungry','needing or wanting food','I am hungry.'),
 entry('order','ask for food or drink in a café or restaurant','I want to order lunch.')
];
const L6=lesson({
 id:'a1-gold-l6',number:6,title:'Food & Culture',
 outcome:'Say what food you like and order a simple meal or drink.',
 readingSkill:'Use a simple menu to find food, drink, and prices.',
 communicationGoal:'Express a food preference and make a simple order.',
 realWorldSituation:'You are at a café with a classmate and want to order food and a drink.',
 vocab:l6v,recycled:['water','like','want','need','morning','how much'],
 vocabItems:[
  vq('A1L6_V01',l6v[0],['a hot drink','a person at a café']),
  vq('A1L6_V02',l6v[2],['a type of ticket','a work place']),
  vq('A1L6_V03',l6v[5],['the evening meal','a drink']),
  vq('A1L6_V04',l6v[6],['needing sleep','needing food']),
  q('A1L6_V05','Complete: I would like ___.',['tea','hungry','order'],'tea','vocabulary:use','Use a food or drink after “I would like…”.'),
  q('A1L6_V06','Complete: I am ___.',['hungry','rice','breakfast'],'hungry','vocabulary:use','Use “hungry” for needing food.')
 ],
 targetLanguage:['I like rice.','I do not like coffee.','I would like tea, please.','Can I have water, please?','What would you like?','Anything else?','No, thank you.'],
 chunks:['I’d like…','Can I have…?','Anything else?','No, thank you.'],
 interactionExpressions:['What would you like?','Can I have water, please?','Anything else?'],
 functions:['express food preference','make a request','respond to a server','choose an alternative'],
 grammarFocus:'Food preferences, simple negatives, and polite request chunks.',
 grammarRule:'Use “I like…” for preference and “I do not / don’t like…” for a negative preference. Treat “I’d like…” and “Can I have…?” as complete useful request chunks.',
 grammarItems:[
  q('A1L6_G01','Choose the preference.',['I like tea.','I would like tea, please.','Can I have tea?'],'I like tea.','grammar:meaning','“I like…” tells a general preference.'),
  q('A1L6_G02','Choose the order.',['I would like tea, please.','I like tea.','Tea likes me.'],'I would like tea, please.','grammar:functional-chunk','“I’d like…” is a polite order.'),
  q('A1L6_G03','Complete: I ___ like coffee.',['do not','does not','am not'],'do not','grammar:negative','With “I”, use “do not / don’t”.'),
  q('A1L6_G04','Choose the polite request.',['Can I have water, please?','I can water.','Have water me.'],'Can I have water, please?','grammar:functional-chunk','Learn the full request as one useful chunk.'),
  q('A1L6_G05','What can you say when you do not want another item?',['No, thank you.','I am breakfast.','Anything rice.'],'No, thank you.','grammar:interaction','Use a short natural response.')
 ],
 readingText:'CITY CAFÉ MENU\nRice and vegetables — $4\nChicken and rice — $5\nTea — $1\nCoffee — $2\nWater — $1',
 audioScript:'Server: Hello. What would you like? Customer: I would like rice and vegetables, please. Server: And a drink? Customer: Can I have tea, please? Server: Yes. Anything else? Customer: No, thank you.',
 speakers:[{name:'Server',gender:'female',voice:'nova'},{name:'Customer',gender:'male',voice:'onyx'}],
 readingQuestions:[
  q('A1L6_R01','How much are rice and vegetables?',['$4','$5','$2'],'$4','reading:detail','The menu shows $4.'),
  q('A1L6_R02','Which drink costs $1?',['Tea','Coffee only','Chicken'],'Tea','reading:detail','Tea is $1.'),
  q('A1L6_R03','Which meal costs $5?',['Chicken and rice','Rice and vegetables','Breakfast tea'],'Chicken and rice','reading:detail','The menu shows chicken and rice at $5.')
 ],
 listeningQuestions:[
  q('A1L6_L01','What food does the customer order?',['Rice and vegetables','Chicken and rice','Meat only'],'Rice and vegetables','listening:detail','Listen for “rice and vegetables”.'),
  q('A1L6_L02','What drink does the customer order?',['Tea','Coffee','Water'],'Tea','listening:detail','Listen for “Can I have tea…?”'),
  q('A1L6_L03','Does the customer want anything else?',['No','Yes, coffee','Yes, meat'],'No','listening:detail','The customer says “No, thank you.”')
 ],
 writing:{task:'A friend asks what food and drinks you like. Write a short reply. Include one thing you like, one thing you do not like, and one food or drink you would order.',minWords:20,maxWords:40,humanGraded:false,checkpoint:false,realWorldSurface:'food preference reply',copyPasteDisabled:true},
 foundation:'Separate general preference from a request you make now.',
 performance:'Tell a classmate one food you like and one you do not like, then order food and a drink. If one item is unavailable, choose another.',
 pronunciation:'Practise: I like rice. I don’t like coffee. I’d like tea, please. Can I have water, please?',
 mediation:'Read a menu and tell a partner the price of one meal and one drink.',
 reviewKeywords:'rice · meat · vegetables · tea · coffee · breakfast · hungry · order',
 reviewMission:'Order one food and one drink, then respond when one first choice is unavailable.',
 masteryGoal:'express_preference_and_order_food',
 minimumSpeakingEvidence:{personalDetails:3,relevantQuestions:1,maintainsExchange:true},
 fixAndImprove:[{pattern:'I no like coffee.',model:"I don't like coffee.",focus:'negative preference'},{pattern:'I like tea please.',model:"I'd like tea, please.",focus:'preference vs request'},{pattern:'Can I water?',model:'Can I have water, please?',focus:'request chunk'}]
});

const l7v=[
 entry('lesson','a period of time when you learn something','This lesson is about English.'),
 entry('class','a group of students learning together','I am in an English class.'),
 entry('read','look at and understand written words','I can read English.'),
 entry('write','make words and sentences with letters','I can write a short message.'),
 entry('speak','use your voice to say words','I can speak a little English.'),
 entry('listen','pay attention to sound or speech','I listen to English.'),
 entry('understand','know the meaning of something','I understand this sentence.'),
 entry('repeat','say something again','Can you repeat that?')
];
const L7=lesson({
 id:'a1-gold-l7',number:7,title:'Education & Learning',
 outcome:'Say what you can do in English and ask for help when you do not understand.',
 readingSkill:'Follow short classroom instructions.',
 communicationGoal:'Describe simple learning ability and use repair language.',
 realWorldSituation:'You are in English class and need to tell the teacher what you can do and ask for help.',
 vocab:l7v,recycled:['study','teacher','student','English','like','help'],
 vocabItems:[
  vq('A1L7_V01',l7v[2],['make words on paper','hear a sound']),
  vq('A1L7_V02',l7v[4],['understand written words','say words with your voice']),
  vq('A1L7_V03',l7v[6],['say something again','know the meaning']),
  vq('A1L7_V04',l7v[7],['say something again','write a sentence']),
  q('A1L7_V05','Complete: Can you ___ that?',['repeat','class','lesson'],'repeat','vocabulary:use','Use “repeat” when you need to hear something again.'),
  q('A1L7_V06','Complete: I can ___ a short message.',['write','understand','class'],'write','vocabulary:use','Use “write” for making a written message.')
 ],
 targetLanguage:['I can read English.','I can write a short message.','I can speak a little English.','I cannot understand this word.','I don’t understand.','Can you repeat that?','Can you help me?'],
 chunks:['I can…','I can’t…','I don’t understand.','Can you repeat that?','Can you help me?'],
 interactionExpressions:['Can you repeat that?','Can you help me?','What does this word mean?'],
 functions:['state ability','state difficulty','ask for repetition','ask for help'],
 grammarFocus:'Can and can’t for simple learning ability.',
 grammarRule:'Use “can + base verb” and “can’t / cannot + base verb”: I can read. I can’t understand. Use repair questions when communication stops.',
 grammarItems:[
  q('A1L7_G01','Complete: I ___ read English.',['can','am','do'],'can','grammar:can','Use “can + base verb”.'),
  q('A1L7_G02','Complete: I ___ understand this word.',['cannot','does not','am not'],'cannot','grammar:can-negative','Use “cannot / can’t + base verb”.'),
  q('A1L7_G03','Choose the correct sentence.',['I can speak a little English.','I can to speak a little English.','I cans speak English.'],'I can speak a little English.','grammar:can','Do not add “to” or “-s” after can.'),
  q('A1L7_G04','What can you say when you did not hear clearly?',['Can you repeat that?','I am repeat.','Do you repeat me?'],'Can you repeat that?','grammar:repair','Use the complete repair question.'),
  q('A1L7_G05','What can you say when you need support?',['Can you help me?','You can me help?','I help can?'],'Can you help me?','grammar:repair','Use “Can you help me?”')
 ],
 readingText:'CLASS TASK\n1. Open your book.\n2. Read the short text.\n3. Work with a partner.\n4. Ask two questions.\n5. Write one answer.',
 audioScript:'Teacher: Open your book to page fourteen. Read the short text. Then work with a partner and answer questions one and two. Student: Sorry, can you repeat that? Teacher: Yes. Page fourteen. Questions one and two.',
 speakers:[{name:'Teacher',gender:'female',voice:'nova'},{name:'Student',gender:'male',voice:'onyx'}],
 readingQuestions:[
  q('A1L7_R01','What do students open first?',['Their book','A phone app','A ticket'],'Their book','reading:detail','Instruction 1 says “Open your book.”'),
  q('A1L7_R02','Who do students work with?',['A partner','A customer','A driver'],'A partner','reading:detail','Instruction 3 says “Work with a partner.”'),
  q('A1L7_R03','How many questions do they ask?',['Two','One','Five'],'Two','reading:detail','Instruction 4 says “Ask two questions.”')
 ],
 listeningQuestions:[
  q('A1L7_L01','What page should the student open?',['14','40','4'],'14','listening:detail','Listen for “page fourteen”.'),
  q('A1L7_L02','What should the student read?',['The short text','The menu','The travel board'],'The short text','listening:detail','The teacher says “Read the short text.”'),
  q('A1L7_L03','What questions should the student answer?',['1 and 2','3 and 4','4 and 5'],'1 and 2','listening:detail','The teacher repeats “questions one and two.”'),
  q('A1L7_L04','What repair phrase does the student use?',['Can you repeat that?','How much is it?','Anything else?'],'Can you repeat that?','listening:strategy','The student asks for repetition.')
 ],
 writing:{task:'Write a short learner profile. Say two things you can do in English, one thing that is difficult, and one help phrase you can use in class.',minWords:25,maxWords:45,humanGraded:false,checkpoint:false,realWorldSurface:'learner profile and help request',copyPasteDisabled:true},
 foundation:'Use can/can’t for ability and repair phrases when you need help.',
 performance:'Tell a classmate two things you can do in English. Say one difficulty. When you receive an unfamiliar word or instruction, use a repair phrase.',
 pronunciation:'Practise: I can read English. I can’t understand this word. Can you repeat that? Can you help me?',
 mediation:'Listen to one classroom instruction and repeat the important action to a partner.',
 reviewKeywords:'lesson · class · read · write · speak · listen · understand · repeat',
 reviewMission:'Describe your English ability and successfully repair one communication problem.',
 masteryGoal:'state_learning_ability_and_repair',
 minimumSpeakingEvidence:{personalDetails:3,relevantQuestions:1,maintainsExchange:true},
 fixAndImprove:[{pattern:'I can to read.',model:'I can read.',focus:'can + base verb'},{pattern:'I no understand.',model:"I don't understand.",focus:'repair statement'},{pattern:'You repeat?',model:'Can you repeat that?',focus:'repair question'}]
});

const l8v=[
 entry('money','what people use to buy things','I need money to buy the bag.'),
 entry('dollar','a unit of money','It is five dollars.'),
 entry('price','the amount of money something costs','What is the price?'),
 entry('cash','money in notes or coins','I will pay cash.'),
 entry('card','a bank card used to pay','Can I pay by card?'),
 entry('pay','give money for something','I need to pay.'),
 entry('cheap','not costing much money','The notebook is cheap.'),
 entry('expensive','costing a lot of money','The bag is expensive.')
];
const L8=lesson({
 id:'a1-gold-l8',number:8,title:'Money & Business',
 outcome:'Ask a price, understand a simple amount, and pay for an item.',
 readingSkill:'Use a simple receipt to identify items, prices, and total.',
 communicationGoal:'Complete a basic price and payment exchange.',
 realWorldSituation:'You are buying a small item in a shop.',
 vocab:l8v,recycled:['customer','want','need','how much','numbers'],
 vocabItems:[
  vq('A1L8_V01',l8v[2],['a bank card','the amount something costs']),
  vq('A1L8_V02',l8v[3],['money in notes or coins','a shop worker']),
  vq('A1L8_V03',l8v[6],['costing a lot','not costing much']),
  vq('A1L8_V04',l8v[7],['not costing much','costing a lot']),
  q('A1L8_V05','Complete: Can I pay by ___?',['card','price','cheap'],'card','vocabulary:use','Use “pay by card”.'),
  q('A1L8_V06','Complete: The bag is very ___.',['expensive','cash','pay'],'expensive','vocabulary:use','Use “expensive” for a high price.')
 ],
 targetLanguage:['How much is this?','It is five dollars.','That is cheap.','That is expensive.','I want to buy this.','Can I pay by card?','I will pay cash.','I’ll take it.','No, thank you.'],
 chunks:['How much is this?','Can I pay by card?','I’ll take it.','No, thank you.'],
 interactionExpressions:['How much is this?','Can I pay by card?'],
 functions:['ask price','understand amount','accept or decline purchase','state payment method'],
 grammarFocus:'Price and payment chunks with practical numbers.',
 grammarRule:'Use “How much is this?” for price. Use “Can I pay by card?” as a complete payment question. The lesson scores number understanding separately from language.',
 grammarItems:[
  q('A1L8_G01','Choose the price question.',['How much is this?','What time is this?','Where is this?'],'How much is this?','grammar:functional-chunk','Use “How much…?” for price.'),
  q('A1L8_G02','Complete: It is five ___.',['dollars','cash','price'],'dollars','grammar:number-chunk','Use a number + dollars.'),
  q('A1L8_G03','Choose the payment question.',['Can I pay by card?','Can I card pay?','Do I paying card?'],'Can I pay by card?','grammar:functional-chunk','Learn the complete question.'),
  q('A1L8_G04','What can you say when you want the item?',['I’ll take it.','I am price.','It takes me.'],'I’ll take it.','grammar:transaction','Use the transaction chunk “I’ll take it.”'),
  q('A1L8_G05','What can you say when you do not want the item?',['No, thank you.','I no buy expensive.','Not take.'],'No, thank you.','grammar:interaction','A short polite decline is enough.')
 ],
 readingText:'RECEIPT\nNotebook — $3\nWater — $1\nBag — $10\nTOTAL — $14',
 audioScript:'Seller: This charger is nine dollars. Customer: Nine dollars? Okay. I will take it. Can I pay by card? Seller: Sorry, cash only. Customer: Okay. I will pay cash.',
 speakers:[{name:'Seller',gender:'female',voice:'nova'},{name:'Customer',gender:'male',voice:'onyx'}],
 readingQuestions:[
  q('A1L8_R01','How much is the notebook?',['$3','$1','$10'],'$3','reading:number','The receipt shows $3.'),
  q('A1L8_R02','How much is the bag?',['$10','$14','$3'],'$10','reading:number','The bag costs $10.'),
  q('A1L8_R03','What is the total?',['$14','$10','$4'],'$14','reading:number','The receipt total is $14.')
 ],
 listeningQuestions:[
  q('A1L8_L01','How much is the charger?',['$9','$10','$5'],'$9','listening:number','Listen for “nine dollars”.'),
  q('A1L8_L02','Does the customer buy it?',['Yes','No','The dialogue does not say'],'Yes','listening:detail','The customer says “I will take it.”'),
  q('A1L8_L03','Can the customer pay by card?',['No','Yes','Only online'],'No','listening:detail','The seller says “cash only”.'),
  q('A1L8_L04','How does the customer pay?',['Cash','Card','Ticket'],'Cash','listening:detail','The customer says “I will pay cash.”')
 ],
 writing:{task:'Write a short price enquiry to a shop. Name the item, ask the price, and ask whether you can pay by card.',minWords:15,maxWords:35,humanGraded:false,checkpoint:false,realWorldSurface:'price enquiry',copyPasteDisabled:true},
 foundation:'Combine price language with practical number comprehension.',
 performance:'Ask the price of an item, respond to the amount, decide whether to buy it, and state how you want to pay.',
 pronunciation:'Practise: How much is this? Nine dollars. Can I pay by card? I’ll take it.',
 mediation:'Read a receipt and tell a partner one item price plus the total.',
 reviewKeywords:'money · dollar · price · cash · card · pay · cheap · expensive',
 reviewMission:'Complete a simple purchase from price question to payment choice.',
 masteryGoal:'complete_basic_purchase_exchange',
 minimumSpeakingEvidence:{personalDetails:3,relevantQuestions:2,maintainsExchange:true},
 fixAndImprove:[{pattern:'How much this?',model:'How much is this?',focus:'price question'},{pattern:'I pay card.',model:'Can I pay by card?',focus:'payment question'},{pattern:'I take.',model:"I'll take it.",focus:'transaction chunk'}]
});

const l9v=[
 entry('hot','having a high temperature','It is hot today.'),
 entry('cold','having a low temperature','It is cold today.'),
 entry('sunny','with a lot of sun','It is sunny this morning.'),
 entry('rainy','with a lot of rain','It is rainy today.'),
 entry('windy','with a lot of wind','It is windy this afternoon.'),
 entry('dry','with little rain or water','The weather is dry.'),
 entry('weather','the condition of the air outside','The weather is hot today.'),
 entry('cloud','a white or grey shape in the sky','There is a dark cloud.')
];
const L9=lesson({
 id:'a1-gold-l9',number:9,title:'Environment & Climate',
 outcome:'Describe today’s weather and say a simple weather preference.',
 readingSkill:'Use a simple weather panel to find temperature and conditions.',
 communicationGoal:'Exchange simple information about current weather and preference.',
 realWorldSituation:'You are talking with a classmate about today’s weather and plans.',
 vocab:l9v,recycled:['today','city','morning','afternoon','water','like'],
 vocabItems:[
  vq('A1L9_V01',l9v[2],['with a lot of wind','with a lot of sun']),
  vq('A1L9_V02',l9v[4],['with a lot of rain','with a lot of wind']),
  vq('A1L9_V03',l9v[5],['with little rain or water','very cold']),
  vq('A1L9_V04',l9v[6],['the price of something','conditions outside']),
  q('A1L9_V05','Complete: It is ___ today.',['sunny','weather','cloud'],'sunny','vocabulary:use','Use a weather adjective after “It is…”.'),
  q('A1L9_V06','Complete: The weather is very ___.',['dry','cloud','today'],'dry','vocabulary:use','Use “dry” for little rain.')
 ],
 targetLanguage:['It is hot today.','It is sunny.','It is raining.','It is windy.','What is the weather like?','I like cool weather.','I do not like very hot weather.','It is sunny but windy.'],
 chunks:['What’s the weather like?','It’s hot.','It’s windy.'],
 interactionExpressions:["What's the weather like?",'Do you like hot weather?'],
 functions:['describe weather','ask about weather','express weather preference','combine two conditions with but'],
 grammarFocus:'It is / it’s for simple weather descriptions.',
 grammarRule:'Use “It is / It’s + weather word”. Use “but” when two simple weather ideas contrast: It is sunny but windy.',
 grammarItems:[
  q('A1L9_G01','Complete: It ___ hot today.',['is','am','are'],'is','grammar:be','Use “It is…” for weather.'),
  q('A1L9_G02','Choose the weather question.',['What is the weather like?','How much is the weather?','Where weather?'],'What is the weather like?','grammar:functional-chunk','Use the complete weather question.'),
  q('A1L9_G03','Choose the natural sentence.',['It is sunny but windy.','It sunny because windy.','It is sunny and but windy.'],'It is sunny but windy.','grammar:connector-but','Use “but” for a simple contrast.'),
  q('A1L9_G04','Choose the preference.',['I like cool weather.','I am cool weather.','I like weather is cool.'],'I like cool weather.','grammar:preference','Use “I like + noun phrase”.'),
  q('A1L9_G05','Choose the negative preference.',['I do not like very hot weather.','I not like very hot weather.','I does not like hot weather.'],'I do not like very hot weather.','grammar:negative','With “I”, use “do not / don’t”.')
 ],
 readingText:'TODAY’S WEATHER\nBorama — 24°C — Sunny and windy\nHargeisa — 29°C — Sunny and dry\nBerbera — 34°C — Hot and sunny',
 audioScript:'Asha: What is the weather like today? Omar: It is sunny, but it is windy too. Asha: Is it cold? Omar: No, it is warm. I like this weather. Asha: Me too. I do not like very hot weather.',
 speakers:[{name:'Asha',gender:'female',voice:'nova'},{name:'Omar',gender:'male',voice:'onyx'}],
 readingQuestions:[
  q('A1L9_R01','What is the weather like in Borama?',['Sunny and windy','Rainy and cold','Hot and rainy'],'Sunny and windy','reading:detail','The panel says sunny and windy.'),
  q('A1L9_R02','Which city is 29°C?',['Hargeisa','Borama','Berbera'],'Hargeisa','reading:number','Hargeisa is 29°C.'),
  q('A1L9_R03','Which city is hottest?',['Berbera','Borama','Hargeisa'],'Berbera','reading:number','Berbera is 34°C.')
 ],
 listeningQuestions:[
  q('A1L9_L01','What is the weather like?',['Sunny and windy','Rainy and cold','Dry only'],'Sunny and windy','listening:detail','Omar says it is sunny and windy.'),
  q('A1L9_L02','Is it cold?',['No','Yes','The dialogue does not say'],'No','listening:detail','Omar says “No, it is warm.”'),
  q('A1L9_L03','Does Asha like very hot weather?',['No','Yes','Only in the morning'],'No','listening:detail','Asha says she does not like very hot weather.')
 ],
 writing:{task:'Write a short weather update for a class group. Say what the weather is like today and whether you like it.',minWords:20,maxWords:35,humanGraded:false,checkpoint:false,realWorldSurface:'weather update',copyPasteDisabled:true},
 foundation:'Describe current weather with short, useful English.',
 performance:'Tell a classmate today’s weather, combine two conditions if useful, and say one preference. Ask one weather question.',
 pronunciation:"Practise: What's the weather like? It's sunny. It's windy. I don't like very hot weather.",
 mediation:'Read a weather panel and tell a partner the condition in one city.',
 reviewKeywords:'hot · cold · sunny · rainy · windy · dry · weather · cloud',
 reviewMission:'Give a short weather update and exchange one preference.',
 masteryGoal:'exchange_basic_weather_information',
 minimumSpeakingEvidence:{personalDetails:2,relevantQuestions:1,maintainsExchange:true},
 fixAndImprove:[{pattern:'It hot today.',model:'It is hot today.',focus:'it is'},{pattern:'I not like hot weather.',model:"I don't like hot weather.",focus:'negative preference'},{pattern:'What weather like?',model:"What's the weather like?",focus:'weather question'}]
});

const l10v=[
 entry('mother','a female parent','My mother is a teacher.'),
 entry('father','a male parent','My father works in an office.'),
 entry('brother','a male sibling','My brother lives in Hargeisa.'),
 entry('sister','a female sibling','My sister likes music.'),
 entry('husband','a married woman’s male partner','Her husband works at a hospital.'),
 entry('wife','a married man’s female partner','His wife is a teacher.'),
 entry('friend','a person you know and like','My friend lives near me.'),
 entry('family','parents, children, and close relatives','My family lives in Borama.')
];
const L10=lesson({
 id:'a1-gold-l10',number:10,title:'Relationships & Family',
 outcome:'Introduce a family member or friend and give basic information about that person.',
 readingSkill:'Use short profile cards to find relationship, place, work, and interest.',
 communicationGoal:'Describe another person and ask a simple follow-up question.',
 realWorldSituation:'A classmate asks you about someone in your family or a friend.',
 vocab:l10v,recycled:['name','live','work','teacher','student','like'],
 vocabItems:[
  vq('A1L10_V01',l10v[0],['a male sibling','a female parent']),
  vq('A1L10_V02',l10v[2],['a male sibling','a female sibling']),
  vq('A1L10_V03',l10v[6],['a person you know and like','a parent']),
  vq('A1L10_V04',l10v[7],['one person at work','parents and close relatives']),
  q('A1L10_V05','Complete: My ___ lives in Hargeisa.',['brother','family','wife'],'brother','vocabulary:use','Use a person word after “My”.'),
  q('A1L10_V06','Complete: This is my ___.',['friend','mother and father are','family lives'],'friend','vocabulary:use','Use “This is my + person”.')
 ],
 targetLanguage:['This is my sister.','Her name is Amina.','She lives in Borama.','She is a teacher.','She likes music.','His name is…','He works at…','Do you have brothers or sisters?','Where does he live?','What does she do?'],
 chunks:['This is my…','His name is…','Her name is…'],
 interactionExpressions:['Do you have brothers or sisters?','Where does he live?','What does she do?'],
 functions:['introduce another person','describe another person','ask about another person'],
 grammarFocus:'He/she, his/her, third-person -s, and does questions.',
 grammarRule:'Lesson 10 is the formal start of third-person present simple: he/she lives, works, likes. Use “does” in questions and the base verb after does: Where does he live?',
 grammarItems:[
  q('A1L10_G01','Complete: She ___ in Borama.',['lives','live','living'],'lives','grammar:third-person','Use “lives” with she.'),
  q('A1L10_G02','Complete: He ___ football.',['likes','like','liking'],'likes','grammar:third-person','Use “likes” with he.'),
  q('A1L10_G03','Choose the correct word. ___ name is Hassan.',['His','Her','He'],'His','grammar:possessive','Use “his” for a male person.'),
  q('A1L10_G04','Choose the correct question.',['Where does he live?','Where do he lives?','Where does he lives?'],'Where does he live?','grammar:does','After does, use the base verb.'),
  q('A1L10_G05','Choose the correct question.',['What does she do?','What do she does?','What she do?'],'What does she do?','grammar:does','Use does with she.')
 ],
 readingText:'FAMILY CARDS\nAmina — sister — Borama — teacher — likes music\nHassan — brother — Hargeisa — student — likes football\nYusuf — father — Borama — driver — likes tea',
 audioScript:'Nimo: Do you have brothers or sisters? Ali: Yes. I have one sister. Her name is Sahra. Nimo: Where does she live? Ali: She lives in Hargeisa. She is a nurse. Nimo: What does she like? Ali: She likes reading.',
 speakers:[{name:'Nimo',gender:'female',voice:'nova'},{name:'Ali',gender:'male',voice:'onyx'}],
 readingQuestions:[
  q('A1L10_R01','Who is a teacher?',['Amina','Hassan','Yusuf'],'Amina','reading:detail','Amina’s card says teacher.'),
  q('A1L10_R02','Where does Hassan live?',['Hargeisa','Borama','Berbera'],'Hargeisa','reading:detail','Hassan’s card says Hargeisa.'),
  q('A1L10_R03','Who likes tea?',['Yusuf','Amina','Hassan'],'Yusuf','reading:detail','Yusuf’s card says likes tea.')
 ],
 listeningQuestions:[
  q('A1L10_L01','Who does Ali talk about?',['His sister','His mother','His friend'],'His sister','listening:detail','Ali says he has one sister.'),
  q('A1L10_L02','What is her name?',['Sahra','Nimo','Amina'],'Sahra','listening:detail','Listen for “Her name is Sahra.”'),
  q('A1L10_L03','Where does Sahra live?',['Hargeisa','Borama','Berbera'],'Hargeisa','listening:detail','Ali says she lives in Hargeisa.'),
  q('A1L10_L04','What does Sahra do?',['She is a nurse.','She is a teacher.','She is a driver.'],'She is a nurse.','listening:detail','Ali says she is a nurse.')
 ],
 writing:{task:'Introduce a family member, friend, or fictional person. Say the relationship, name, where the person lives, work or study, and one interest.',minWords:30,maxWords:50,humanGraded:false,checkpoint:false,realWorldSurface:'person introduction',copyPasteDisabled:true},
 foundation:'Move from “I/you” to controlled third-person description.',
 performance:'Describe one real or fictional person with at least three details. Answer a follow-up question and ask one reciprocal family or friend question.',
 pronunciation:'Practise: She lives in Borama. He works at a school. Where does he live? What does she do?',
 mediation:'Read one profile card and introduce that person to a partner.',
 reviewKeywords:'mother · father · brother · sister · husband · wife · friend · family',
 reviewMission:'Introduce another person and handle one follow-up question.',
 masteryGoal:'describe_another_person',
 minimumSpeakingEvidence:{personalDetails:3,relevantQuestions:1,maintainsExchange:true},
 fixAndImprove:[{pattern:'She live Borama.',model:'She lives in Borama.',focus:'third-person form'},{pattern:'Where does she lives?',model:'Where does she live?',focus:'does + base verb'},{pattern:'He name is Ali.',model:'His name is Ali.',focus:'his/her'}]
});

const l11v=[
 entry('news','information about recent events','I watch the news in the evening.'),
 entry('TV','television','I watch TV at home.'),
 entry('radio','a service or device for audio programmes','I listen to the radio.'),
 entry('story','an account of events or people','I read short stories online.'),
 entry('programme','a show on TV or radio','This programme is interesting.'),
 entry('online','using the internet','I read news online.'),
 entry('media','TV, radio, websites, and other ways of sharing information','I use different media every day.'),
 entry('article','a piece of writing in a newspaper or website','I read a short article.')
];
const L11=lesson({
 id:'a1-gold-l11',number:11,title:'Media & News',
 outcome:'Talk about simple media habits and understand key information in a short public announcement.',
 readingSkill:'Find key facts in a short public-information notice.',
 communicationGoal:'Describe a media habit and transfer key announcement information.',
 realWorldSituation:'You talk with a classmate about how you get information and then hear a short public announcement.',
 vocab:l11v,recycled:['phone','video','read','listen','watch','morning','evening','internet'],
 vocabItems:[
  vq('A1L11_V01',l11v[0],['a personal message','information about recent events']),
  vq('A1L11_V02',l11v[2],['a visual screen only','audio programmes and broadcasts']),
  vq('A1L11_V03',l11v[5],['using the internet','inside a classroom']),
  vq('A1L11_V04',l11v[7],['a piece of writing','a radio device']),
  q('A1L11_V05','Complete: I read news ___.',['online','radio','story'],'online','vocabulary:use','Use “online” for internet-based activity.'),
  q('A1L11_V06','Complete: I listen to the ___.',['radio','article','TV watch'],'radio','vocabulary:use','Use “listen to the radio”.')
 ],
 targetLanguage:['I watch the news.','I read stories online.','I listen to the radio.','I watch videos on my phone.','I read the news in the morning.','What do you watch?','When do you read the news?'],
 chunks:['on my phone','in the morning','in the evening','listen to the radio'],
 interactionExpressions:['What do you watch?','What do you read?','When do you listen?'],
 functions:['describe media habit','ask about media habit','understand public information','relay key information'],
 grammarFocus:'Present-simple media routines with common prepositions.',
 grammarRule:'Use “listen to”, “on my phone”, and “in the morning/evening”. Build one connected routine sentence with what + device or time.',
 grammarItems:[
  q('A1L11_G01','Complete: I listen ___ the radio.',['to','on','at'],'to','grammar:preposition','Use “listen to”.'),
  q('A1L11_G02','Complete: I watch videos ___ my phone.',['on','in','to'],'on','grammar:preposition','Use “on my phone”.'),
  q('A1L11_G03','Complete: I read the news ___ the morning.',['in','on','at'],'in','grammar:time','Use “in the morning”.'),
  q('A1L11_G04','Choose the correct question.',['What do you watch?','What does you watch?','What you watches?'],'What do you watch?','grammar:question','Use “do” with you.'),
  q('A1L11_G05','Choose the connected sentence.',['I watch English videos on my phone in the evening.','I watch English videos my phone evening.','I watches videos on evening.'],'I watch English videos on my phone in the evening.','grammar:connected-output','Combine activity, device, and time.')
 ],
 readingText:'COMMUNITY UPDATE\nThe new health centre is near the city market.\nIt has 5 doctors and 10 nurses.\nOpen every day: 8:00 a.m. – 6:00 p.m.',
 audioScript:'Announcer: Community announcement. There is a football game on Saturday at four in the afternoon at City Stadium. Tickets are two dollars. Please arrive before three forty-five.',
 speakers:[{name:'Announcer',gender:'female',voice:'nova'}],
 readingQuestions:[
  q('A1L11_R01','Where is the health centre?',['Near the city market','At the airport','At the bus station'],'Near the city market','reading:detail','The notice says near the city market.'),
  q('A1L11_R02','How many doctors are there?',['5','10','8'],'5','reading:number','The notice says 5 doctors.'),
  q('A1L11_R03','What time does the health centre close?',['6:00 p.m.','8:00 a.m.','10:00 p.m.'],'6:00 p.m.','reading:time','It is open until 6:00 p.m.')
 ],
 listeningQuestions:[
  q('A1L11_L01','What event is announced?',['A football game','A class','A market sale'],'A football game','listening:detail','Listen for “football game”.'),
  q('A1L11_L02','What time is the game?',['4:00 p.m.','3:45 p.m.','6:00 p.m.'],'4:00 p.m.','listening:time','The game is at four in the afternoon.'),
  q('A1L11_L03','How much is a ticket?',['$2','$4','$5'],'$2','listening:number','Tickets are two dollars.'),
  q('A1L11_L04','When should people arrive?',['Before 3:45','After 4:00','At 6:00'],'Before 3:45','listening:detail','The announcement says before 3:45.')
 ],
 writing:{task:'Write a short media-habit post. Say what you watch, read, or listen to, the device or source you use, and when you usually do it.',minWords:30,maxWords:50,humanGraded:false,checkpoint:false,realWorldSurface:'media habit post',copyPasteDisabled:true},
 foundation:'Connect a simple media routine with source, device, or time.',
 performance:'Tell a classmate one media habit with a device or time. Ask a follow-up question. Then hear a short announcement and relay two key facts.',
 pronunciation:'Practise: I listen to the radio. I watch videos on my phone. I read the news in the morning.',
 mediation:'Hear a public announcement and tell a partner the event plus two key details.',
 reviewKeywords:'news · TV · radio · story · programme · online · media · article',
 reviewMission:'Describe one media habit and relay two facts from a short announcement.',
 masteryGoal:'describe_media_habit_and_transfer_information',
 minimumSpeakingEvidence:{personalDetails:3,relevantQuestions:1,maintainsExchange:true},
 fixAndImprove:[{pattern:'I listen radio.',model:'I listen to the radio.',focus:'listen to'},{pattern:'I watch videos in my phone.',model:'I watch videos on my phone.',focus:'on my phone'},{pattern:'I read news at morning.',model:'I read the news in the morning.',focus:'in the morning'}]
});

const lessons=[L1,L2,L3,L4,L5,L6,L7,L8,L9,L10,L11];
const liveSpecs=[
 [L1,["Amina: Hi. I'm Amina. What's your name?","Hassan: I'm Hassan. Nice to meet you.","Amina: Nice to meet you too. Where do you live?","Hassan: I live in Hargeisa. What about you?","Amina: I live in Borama. What do you do?","Hassan: I'm a student. I like football."]],
 [L2,["Amina: Hi. What do you do?","Yusuf: I'm a driver.","Amina: Where do you work?","Yusuf: I work for a transport company.","Amina: What do you do there?","Yusuf: I drive a bus and help customers."]],
 [L3,["Traveler: Hi. I want a ticket to Hargeisa, please.","Agent: Morning or afternoon?","Traveler: Morning, please. What time is the bus?","Agent: Eight o'clock. Platform 2.","Traveler: How much is the ticket?","Agent: Seven dollars."]],
 [L4,["Samira: Do you use a computer at work?","Bilal: Yes. I use a computer at work.","Samira: What do you use your phone for?","Bilal: I send messages and watch videos.","Samira: Do you use it every day?","Bilal: Yes, every day."]],
 [L5,["Amina: How do you feel?","Hodan: I feel tired. I have a headache.","Amina: What do you need?","Hodan: I need water.","Amina: What healthy habit do you have?","Hodan: I walk in the evening."]],
 [L6,["Server: Hello. What would you like?","Customer: I would like rice and vegetables, please.","Server: And a drink?","Customer: Can I have tea, please?","Server: Sorry, tea is unavailable. We have water or coffee.","Customer: Water, please."]],
 [L7,["Teacher: What can you do in English?","Student: I can read and write a little.","Teacher: What is difficult?","Student: I cannot understand every word.","Teacher: Here is a new instruction.","Student: Sorry, can you repeat that?"]],
 [L8,["Seller: This bag is ten dollars.","Customer: How much is this notebook?","Seller: Three dollars.","Customer: I will take it. Can I pay by card?","Seller: Yes, you can.","Customer: Thank you."]],
 [L9,["Asha: What's the weather like today?","Omar: It's sunny but windy.","Asha: Do you like this weather?","Omar: Yes. I like cool weather. What about you?","Asha: I don't like very hot weather."]],
 [L10,["Nimo: Do you have brothers or sisters?","Ali: Yes. This is my sister Sahra.","Nimo: Where does she live?","Ali: She lives in Hargeisa.","Nimo: What does she do?","Ali: She is a nurse and she likes reading."]],
 [L11,["Amina: What do you watch?","Hassan: I watch English videos on my phone in the evening.","Amina: Do you read news too?","Hassan: Yes, I read news online in the morning.","Amina: Listen to this announcement and tell me the time and ticket price."]]
];
const book={id:BOOK_ID,title:'A1 Beginner',level:'A1',moduleTitle:'A1 Beginner · Gold v1.2',moduleGoal:'Build functional basic communication through 22 real-life lessons.',totalLessons:22,lessons,standardVersion:VERSION,releaseStatus:'pilot',curriculumLocked:true};

if(typeof BOOK_PACKS!=='undefined')BOOK_PACKS[BOOK_ID]=book;
window.A1_GOLD_V1_BOOK=book;
window.A1_GOLD_V1_VERSION=VERSION;
window.LIVE_BOOKS=window.LIVE_BOOKS||{};
window.LIVE_BOOKS[BOOK_ID]={title:'A1 Beginner',standardVersion:VERSION,releaseStatus:'pilot',lessons:liveSpecs.map(([spec,model])=>({number:spec.number,title:spec.title,content:live(spec,model)}))};
})();