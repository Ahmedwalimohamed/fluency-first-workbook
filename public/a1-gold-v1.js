(function(){
'use strict';

const VERSION='englishgate-a1-gold-v1.1-batch-a';
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
  q('A1L2_R02','Where does Ibrahim work?',['For a transport company','At a school','At a hospital'],'For a transport company','reading:detail','He works for a transport company.'),
  q('A1L2_R03','What does Ibrahim drive?',['A bus','A taxi','A truck'],'A bus','reading:detail','He says, “I drive a bus.”')
 ],
 listeningQuestions:[
  q('A1L2_L01','What is Hodan’s job?',['Nurse','Driver','Student'],'Nurse','listening:detail','Listen for “I am a nurse.”'),
  q('A1L2_L02','Where does Hodan work?',['At a hospital','In an office','At a school'],'At a hospital','listening:detail','Listen for “I work at a hospital.”'),
  q('A1L2_L03','What does Hodan do there?',['She helps patients.','She drives a bus.','She teaches students.'],'She helps patients.','listening:detail','Listen for “I help patients.”'),
  q('A1L2_L04','What time does she start work?',['8:00','9:00','10:00'],'8:00','listening:detail','Listen for “eight in the morning.”')
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

const lessons=[L1,L2,L3,L4,L5];
const liveSpecs=[
 [L1,["Amina: Hi. I'm Amina. What's your name?","Hassan: I'm Hassan. Nice to meet you.","Amina: Nice to meet you too. Where do you live?","Hassan: I live in Hargeisa. What about you?","Amina: I live in Borama. What do you do?","Hassan: I'm a student. I like football."]],
 [L2,["Amina: Hi. What do you do?","Yusuf: I'm a driver.","Amina: Where do you work?","Yusuf: I work for a transport company.","Amina: What do you do there?","Yusuf: I drive a bus and help customers."]],
 [L3,["Traveler: Hi. I want a ticket to Hargeisa, please.","Agent: Morning or afternoon?","Traveler: Morning, please. What time is the bus?","Agent: Eight o'clock. Platform 2.","Traveler: How much is the ticket?","Agent: Seven dollars."]],
 [L4,["Samira: Do you use a computer at work?","Bilal: Yes. I use a computer at work.","Samira: What do you use your phone for?","Bilal: I send messages and watch videos.","Samira: Do you use it every day?","Bilal: Yes, every day."]],
 [L5,["Amina: How do you feel?","Hodan: I feel tired. I have a headache.","Amina: What do you need?","Hodan: I need water.","Amina: What healthy habit do you have?","Hodan: I walk in the evening."]]
];
const book={id:BOOK_ID,title:'A1 Beginner',level:'A1',moduleTitle:'A1 Beginner · Gold v1.1',moduleGoal:'Build functional basic communication through 22 real-life lessons.',totalLessons:22,lessons,standardVersion:VERSION,releaseStatus:'pilot',curriculumLocked:true};

if(typeof BOOK_PACKS!=='undefined')BOOK_PACKS[BOOK_ID]=book;
window.A1_GOLD_V1_BOOK=book;
window.A1_GOLD_V1_VERSION=VERSION;
window.LIVE_BOOKS=window.LIVE_BOOKS||{};
window.LIVE_BOOKS[BOOK_ID]={title:'A1 Beginner',standardVersion:VERSION,releaseStatus:'pilot',lessons:liveSpecs.map(([spec,model])=>({number:spec.number,title:spec.title,content:live(spec,model)}))};
})();