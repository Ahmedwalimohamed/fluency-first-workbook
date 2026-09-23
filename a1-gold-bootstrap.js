'use strict';

const express=require('express');
const jwt=require('jsonwebtoken');
const {Pool}=require('pg');
const crypto=require('crypto');

const pool=new Pool({connectionString:process.env.DATABASE_URL});
const nativeGet=express.application.get;
const nativePost=express.application.post;
const installed=new WeakSet();
const BOOK_ID='speakup-a1-gold';
const VERSION='englishgate-a1-gold-v1.0-frozen';
const TYPE_SAFE_URL=process.env.TYPESAFE_API_URL||'https://api.typesafe.ai/v1/systemone';
const TYPE_SAFE_MODEL=process.env.TYPESAFE_MODEL||'jev-latest';

const LESSONS={
 'a1-gold-l1':{
  title:'Getting Acquainted',
  canDo:'Introduce yourself and exchange basic personal information with someone you have just met.',
  opening:"Hi. I'm Sarah. Nice to meet you.",
  keys:['intro','place','work','interest'],required:['intro'],minimumKeys:3,minimumQuestions:2,
  prompts:{intro:"What's your name?",place:'Where do you live?',work:'What do you do?',interest:'What do you like?'},
  detect:l=>({intro:/\b(i['’]?m|i am|my name is)\b/.test(l),place:/\b(i live in|i['’]?m from|i am from)\b/.test(l),work:/\b(i work|i study|i['’]?m a|i am a)\b/.test(l),interest:/\b(i like|i love|i enjoy)\b/.test(l)}),
  repairs:[
   {match:/\bi live\s+(?!in\b)[a-z]+/i,focus:'live_in_place',original:'I live Borama.',model:'I live in Borama.'},
   {match:/\bwhat\s+your\s+name\b/i,focus:'question_form',original:'What your name?',model:"What's your name?"},
   {match:/\bi\s+(?:am|'m)\s+(teacher|student|driver|doctor|nurse)\b/i,focus:'article_a',original:'I am teacher.',model:'I am a teacher.'}
  ]
 },
 'a1-gold-l2':{
  title:'Work & Careers',
  canDo:'Say what you do, where you work or study, and one basic thing you do there.',
  opening:"Hi. I'm Sarah. What do you do?",
  keys:['role','place','action'],required:[],minimumKeys:3,minimumQuestions:1,
  prompts:{role:'What do you do?',place:'Where do you work or study?',action:'What do you do there?'},
  detect:l=>({role:/\b(i['’]?m|i am)\s+(?:a\s+)?(?:driver|nurse|teacher|student|doctor|engineer|accountant|manager|assistant)\b|\bi (?:work|study)\b/.test(l),place:/\bi (?:work|study) (?:at|in|for)\b/.test(l),action:/\bi (?:help|drive|teach|study|serve|check|prepare|sell|work with|care for)\b/.test(l)}),
  repairs:[
   {match:/\bi\s+(?:am|'m)\s+(nurse|driver|teacher|student|doctor)\b/i,focus:'article_a',original:'I am nurse.',model:'I am a nurse.'},
   {match:/\bi work\s+(hospital|school|office)\b/i,focus:'work_place',original:'I work hospital.',model:'I work at a hospital.'},
   {match:/\bwhat\s+you\s+do\b/i,focus:'question_form',original:'What you do?',model:'What do you do?'}
  ]
 },
 'a1-gold-l3':{
  title:'Travel & Adventure',
  canDo:'Buy a simple ticket and ask about time, price, and place, including one simple change.',
  opening:'Hello. Where do you want to go?',
  keys:['request','destination','info','adapt'],required:['request'],minimumKeys:3,minimumQuestions:2,
  prompts:{request:'Ask me for a ticket.',destination:'Where do you want to go?',info:'Ask me about the time, price, or platform.',adapt:'The morning bus is full. The afternoon bus is available. What do you want to do?'},
  detect:l=>({request:/\b(i want|i need|i['’]?d like|one)\b[^.!?]*\bticket\b/.test(l),destination:/\b(?:ticket\s+)?to\s+[a-z]/.test(l),info:/\b(?:platform\s*\d+|\$?\d+(?::\d+)?|dollars?|morning|afternoon|what time|how much|where is platform)\b/.test(l),adapt:/\b(afternoon|later|that is okay|that's okay|that works|okay|ok)\b/.test(l)}),
  repairs:[
   {match:/\bi want ticket\b/i,focus:'article_a',original:'I want ticket.',model:'I want a ticket.'},
   {match:/\bhow much ticket\b/i,focus:'price_question',original:'How much ticket?',model:'How much is the ticket?'},
   {match:/\bwhat time bus\b/i,focus:'time_question',original:'What time bus?',model:'What time is the bus?'}
  ]
 },
 'a1-gold-l4':{
  title:'Technology & Social Media',
  canDo:'Say what technology you use, how often you use it, and one purpose.',
  opening:'Hi. What technology do you use every day?',
  keys:['device','purpose','frequency'],required:[],minimumKeys:3,minimumQuestions:1,
  prompts:{device:'What device do you use?',purpose:'What do you use it for?',frequency:'How often do you use it?'},
  detect:l=>({device:/\b(i use|my)\b[^.!?]*\b(phone|computer|app|internet)\b/.test(l),purpose:/\b(for work|for study|send messages|make calls|watch videos|use the internet)\b/.test(l),frequency:/\b(every day|daily|at work|at home|in the morning|in the evening)\b/.test(l)}),
  repairs:[
   {match:/\bi use phone every day\b/i,focus:'my_device',original:'I use phone every day.',model:'I use my phone every day.'},
   {match:/\bi use internet work\b/i,focus:'purpose',original:'I use internet work.',model:'I use the internet for work.'},
   {match:/\bwhat\s+you\s+use\s+(?:your\s+)?phone\s+for\b/i,focus:'question_form',original:'What you use phone for?',model:'What do you use your phone for?'}
  ]
 },
 'a1-gold-l5':{
  title:'Health & Wellbeing',
  canDo:'Say how you feel, name a simple health problem or need, and describe one healthy habit.',
  opening:'Hi. How do you feel today?',
  keys:['state','problem','habit'],required:['state'],minimumKeys:2,minimumQuestions:1,
  prompts:{state:'How do you feel?',problem:"What's wrong, or what do you need?",habit:'What healthy thing do you do?'},
  detect:l=>({state:/\bi feel\s+(tired|sick|better|okay|ok|well)\b/.test(l),problem:/\bi (?:have a headache|need water|need rest|need sleep)\b/.test(l),habit:/\bi (?:sleep|walk|exercise|drink water)\b/.test(l)}),
  repairs:[
   {match:/\bi am headache\b/i,focus:'have_problem',original:'I am headache.',model:'I have a headache.'},
   {match:/\bi feeling tired\b/i,focus:'feel_adjective',original:'I feeling tired.',model:'I feel tired.'},
   {match:/\bhow\s+you\s+feel\b/i,focus:'question_form',original:'How you feel?',model:'How do you feel?'}
  ]

 },
 'a1-gold-l6':{
  title:'Food & Culture',
  canDo:'Say what food you like and order a simple meal or drink.',
  opening:'Hello. What would you like?',
  keys:['preference','request','order','alternative'],required:['request'],minimumKeys:3,minimumQuestions:1,
  prompts:{preference:'What food or drink do you like?',request:'Please order one food or drink.',order:'What else would you like?',alternative:'Sorry, your first drink is unavailable. Choose another.'},
  detect:l=>({preference:/\bi (?:like|do not like|don't like)\b/.test(l),request:/\b(i would like|i'd like|can i have)\b/.test(l),order:/\b(rice|meat|vegetables|tea|coffee|water|breakfast)\b/.test(l),alternative:/\b(water|coffee|tea|another|instead|okay|ok)\b/.test(l)}),
  repairs:[
   {match:/\bi no like coffee\b/i,focus:'negative_preference',original:'I no like coffee.',model:"I don't like coffee."},
   {match:/\bi like tea please\b/i,focus:'preference_vs_request',original:'I like tea please.',model:"I'd like tea, please."},
   {match:/\bcan i water\b/i,focus:'request_chunk',original:'Can I water?',model:'Can I have water, please?'}
  ]
 },
 'a1-gold-l7':{
  title:'Education & Learning',
  canDo:'Say what you can do in English and ask for help when you do not understand.',
  opening:'Hi. What can you do in English?',
  keys:['ability','difficulty','repair'],required:['repair'],minimumKeys:3,minimumQuestions:1,
  prompts:{ability:'Tell me one thing you can do in English.',difficulty:'What is difficult for you?',repair:'I will give you a new instruction. Ask for help or repetition if you need it.'},
  detect:l=>({ability:/\bi can (?:read|write|speak|listen|understand)\b/.test(l),difficulty:/\bi (?:cannot|can't|do not|don't) (?:understand|read|write|speak|listen)\b/.test(l),repair:/\b(can you repeat|can you help me|what does .+ mean|i don't understand)\b/.test(l)}),
  repairs:[
   {match:/\bi can to read\b/i,focus:'can_base_verb',original:'I can to read.',model:'I can read.'},
   {match:/\bi no understand\b/i,focus:'repair_statement',original:'I no understand.',model:"I don't understand."},
   {match:/\byou repeat\b/i,focus:'repair_question',original:'You repeat?',model:'Can you repeat that?'}
  ]
 },
 'a1-gold-l8':{
  title:'Money & Business',
  canDo:'Ask a price, understand a simple amount, and pay for an item.',
  opening:'Hello. This notebook is on sale today.',
  keys:['price','decision','payment'],required:['price'],minimumKeys:3,minimumQuestions:2,
  prompts:{price:'Ask me the price.',decision:'Tell me if you want the item.',payment:'Ask or tell me how you want to pay.'},
  detect:l=>({price:/\b(how much|dollars?|price)\b/.test(l),decision:/\b(i(?:'ll| will) take it|i want to buy|no thank you|no, thank you)\b/.test(l),payment:/\b(pay by card|pay cash|card|cash)\b/.test(l)}),
  repairs:[
   {match:/\bhow much this\b/i,focus:'price_question',original:'How much this?',model:'How much is this?'},
   {match:/\bi pay card\b/i,focus:'payment_question',original:'I pay card.',model:'Can I pay by card?'},
   {match:/\bi take\b/i,focus:'transaction_chunk',original:'I take.',model:"I'll take it."}
  ]
 },
 'a1-gold-l9':{
  title:'Environment & Climate',
  canDo:'Describe today’s weather and say a simple weather preference.',
  opening:"Hi. What's the weather like today?",
  keys:['condition','preference','contrast'],required:['condition'],minimumKeys:2,minimumQuestions:1,
  prompts:{condition:'Describe the weather today.',preference:'Do you like this weather?',contrast:'Can you describe two weather conditions together?'},
  detect:l=>({condition:/\bit(?:'s| is) (?:hot|cold|sunny|rainy|raining|windy|dry|warm)\b/.test(l),preference:/\bi (?:like|do not like|don't like)\b[^.!?]*weather\b/.test(l),contrast:/\b(?:but|and)\b[^.!?]*(?:sunny|windy|hot|cold|rainy|dry)\b/.test(l)}),
  repairs:[
   {match:/\bit hot today\b/i,focus:'it_is',original:'It hot today.',model:'It is hot today.'},
   {match:/\bi not like hot weather\b/i,focus:'negative_preference',original:'I not like hot weather.',model:"I don't like hot weather."},
   {match:/\bwhat weather like\b/i,focus:'weather_question',original:'What weather like?',model:"What's the weather like?"}
  ]
 },
 'a1-gold-l10':{
  title:'Relationships & Family',
  canDo:'Introduce a family member or friend and give basic information about that person.',
  opening:'Hi. Tell me about one family member or friend.',
  keys:['relation','place','role','interest'],required:['relation'],minimumKeys:3,minimumQuestions:1,
  prompts:{relation:'Who is this person?',place:'Where does this person live?',role:'What does this person do?',interest:'What does this person like?'},
  detect:l=>({relation:/\b(this is my|my) (?:mother|father|brother|sister|husband|wife|friend)\b/.test(l),place:/\b(?:he|she) lives in\b/.test(l),role:/\b(?:he|she) (?:is a|works at|works in|studies)\b/.test(l),interest:/\b(?:he|she) likes\b/.test(l)}),
  repairs:[
   {match:/\bshe live borama\b/i,focus:'third_person_form',original:'She live Borama.',model:'She lives in Borama.'},
   {match:/\bwhere does she lives\b/i,focus:'does_base_verb',original:'Where does she lives?',model:'Where does she live?'},
   {match:/\bhe name is ali\b/i,focus:'possessive',original:'He name is Ali.',model:'His name is Ali.'}
  ]
 },
 'a1-gold-l11':{
  title:'Media & News',
  canDo:'Talk about simple media habits and understand key information in a short public announcement.',
  opening:'Hi. What do you watch, read, or listen to?',
  keys:['habit','sourceTime','transfer'],required:['habit','transfer'],minimumKeys:3,minimumQuestions:1,
  prompts:{habit:'Tell me one media habit.',sourceTime:'What device, source, or time do you use?',transfer:'Announcement: There is a football game on Saturday at four in the afternoon. Tickets are two dollars. Tell me two key facts.'},
  detect:l=>({habit:/\bi (?:watch|read|listen to)\b/.test(l),sourceTime:/\b(on my phone|online|radio|tv|in the morning|in the evening|at night)\b/.test(l),transfer:/\b(football|game)\b[^.!?]*(?:four|4|two|2|dollars?|saturday)|(?:four|4)[^.!?]*(?:two|2|dollars?)/.test(l)}),
  repairs:[
   {match:/\bi listen radio\b/i,focus:'listen_to',original:'I listen radio.',model:'I listen to the radio.'},
   {match:/\bi watch videos in my phone\b/i,focus:'on_my_phone',original:'I watch videos in my phone.',model:'I watch videos on my phone.'},
   {match:/\bi read news at morning\b/i,focus:'time_preposition',original:'I read news at morning.',model:'I read the news in the morning.'}
  ]
 },
 'a1-gold-l12':{
  title:'Sports & Fitness',
  canDo:'Talk about exercise frequency and use two simple schedules to find a time to be active together.',
  opening:'Hi. How often do you exercise?',
  keys:['routine','frequency','availability','arrangement'],required:['frequency','arrangement'],minimumKeys:4,minimumQuestions:2,
  prompts:{routine:'Tell me one activity you do.',frequency:'How often do you do it?',availability:'Ask when I am free.',arrangement:'Use our schedules to suggest one time and activity we can do together.'},
  detect:l=>({routine:/\b(i (?:walk|run|exercise|go running|go to the gym|play sport))\b/.test(l),frequency:/\b(often|once a week|twice a week|times a week|every (?:day|week))\b/.test(l),availability:/\b(are you free|what time are you free|when are you free)\b/.test(l),arrangement:/\b(let(?:'s| us)|meet|together|we can)\b/.test(l)}),
  repairs:[
   {match:/\bi exercise two time a week\b/i,focus:'frequency',original:'I exercise two time a week.',model:'I exercise twice a week.'},
   {match:/\bhow many often do you exercise\b/i,focus:'frequency_question',original:'How many often do you exercise?',model:'How often do you exercise?'},
   {match:/\byou free saturday\b/i,focus:'availability_question',original:'You free Saturday?',model:'Are you free on Saturday?'}
  ]
 },
 'a1-gold-l13':{
  title:'City & Countryside',
  canDo:'Describe a simple place and ask for or give the location of basic services.',
  opening:'You have Map A and I have Map B. Ask me about a missing place.',
  keys:['existence','location','mapQuestion','mapTransfer'],required:['location','mapQuestion','mapTransfer'],minimumKeys:4,minimumQuestions:2,
  prompts:{existence:'Tell me one place that exists on your map.',location:'Give one location using near, next to, opposite, or behind.',mapQuestion:'Ask me where one missing place is.',mapTransfer:'Use my answer to complete one missing place, then tell me its location.'},
  detect:l=>({existence:/\bthere (?:is|are)\b/.test(l),location:/\b(near|next to|opposite|behind)\b/.test(l),mapQuestion:/\b(where is|is there|where are)\b/.test(l),mapTransfer:/\b(bank|market|pharmacy|school|station|hospital|centre)\b[^.!?]*\b(near|next to|opposite|behind)\b/.test(l)}),
  repairs:[
   {match:/\bthere are a bank near here\b/i,focus:'there_is_are',original:'There are a bank near here.',model:'There is a bank near here.'},
   {match:/\bwhere the bank is\b/i,focus:'location_question',original:'Where the bank is?',model:'Where is the bank?'},
   {match:/\bbank next market\b/i,focus:'place_phrase',original:'Bank next market.',model:'The bank is next to the market.'}
  ]
 },
 'a1-gold-l14':{
  title:'Dreams & Ambitions',
  canDo:'State one concrete future goal, one planned action, and one simple reason.',
  opening:'What is one goal you have for your English, work, or study?',
  keys:['goal','plan','reason'],required:['goal','plan','reason'],minimumKeys:3,minimumQuestions:1,
  prompts:{goal:'Tell me one goal using “I want to…” or “My goal is…”.',plan:'What are you going to do next?',reason:'Why is this goal important? Use because.'},
  detect:l=>({goal:/\b(i want to|my goal is|i hope to)\b/.test(l),plan:/\b(i am going to|i'm going to|i plan to)\b/.test(l),reason:/\bbecause\b/.test(l)}),
  repairs:[
   {match:/\bi want improve my english\b/i,focus:'want_to',original:'I want improve my English.',model:'I want to improve my English.'},
   {match:/\bi am going to studying every day\b/i,focus:'going_to_base',original:'I am going to studying every day.',model:'I am going to study every day.'},
   {match:/\bi learn english because for work\b/i,focus:'because_reason',original:'I learn English because for work.',model:'I want to learn English because I need it for work.'}
  ]
 },
 'a1-gold-l15':{
  title:'Crime & Safety',
  canDo:'Report a simple lost or missing-item problem and ask an appropriate person for help.',
  opening:'Hello. I am at the Help Desk. What is the problem?',
  keys:['problem','itemDetails','lastPlace','help'],required:['problem','lastPlace','help'],minimumKeys:4,minimumQuestions:1,
  prompts:{problem:'Report what is lost or missing.',itemDetails:'Tell me one identifying detail such as colour or type.',lastPlace:'Where did you last have it?',help:'Ask me for help.'},
  detect:l=>({problem:/\b(i lost my|my .+ is missing|i have a problem)\b/.test(l),itemDetails:/\b(black|blue|white|red|small|large|phone|bag|card|wallet)\b/.test(l),lastPlace:/\b(it was at|last had|at the (?:station|market|school|office|hospital|bus station))\b/.test(l),help:/\b(can you help me|please help me|i need help)\b/.test(l)}),
  repairs:[
   {match:/\bi lose my phone yesterday\b/i,focus:'functional_past_chunk',original:'I lose my phone yesterday.',model:'I lost my phone.'},
   {match:/\bmy bag missing\b/i,focus:'be_missing',original:'My bag missing.',model:'My bag is missing.'},
   {match:/\byou can help me\b/i,focus:'help_request',original:'You can help me?',model:'Can you help me, please?'}
  ]
 },
 'a1-gold-l16':{
  title:'Science & Everyday Life',
  canDo:'Give and follow a short sequence of safe everyday instructions.',
  opening:'We have different missing steps. Tell me your first step, then ask me for a missing step.',
  keys:['firstStep','sequence','missingStep','finalStep'],required:['sequence','missingStep','finalStep'],minimumKeys:4,minimumQuestions:2,
  prompts:{firstStep:'Give the first instruction.',sequence:'Give a next or then step.',missingStep:'Ask me what comes next or what the missing step is.',finalStep:'Finish the process using finally.'},
  detect:l=>({firstStep:/\bfirst\b[^.!?]*\b(turn on|open|add|choose|press)\b/.test(l),sequence:/\b(next|then)\b[^.!?]*\b(open|add|choose|press|close|turn on|wait)\b/.test(l),missingStep:/\b(what comes next|what is the missing step|what is step|and after that)\b/.test(l),finalStep:/\bfinally\b[^.!?]*\b(open|close|press|wait|turn on|add)\b/.test(l)}),
  repairs:[
   {match:/\bfirst, turning on the phone\b/i,focus:'imperative',original:'First, turning on the phone.',model:'First, turn on the phone.'},
   {match:/\bfinally after open app\b/i,focus:'sequence_marker',original:'Finally after open app.',model:'Finally, open the class page.'},
   {match:/\bwhat next\b/i,focus:'sequence_question',original:'What next?',model:'What comes next?'}
  ]
 },
 'a1-gold-l17':{
  title:'Arts & Entertainment',
  canDo:'Express a simple opinion, give a reason, and choose an entertainment option with another person.',
  opening:'We want to choose something to watch or listen to. What do you prefer?',
  keys:['preference','reason','adaptation','choice'],required:['reason','adaptation','choice'],minimumKeys:4,minimumQuestions:1,
  prompts:{preference:'Tell me which option you prefer.',reason:'Why do you like it?',adaptation:'Your first choice is full. Respond and change the plan.',choice:'Choose a second option with me.'},
  detect:l=>({preference:/\b(i like|i prefer|my favourite|i do not like|i don't like)\b/.test(l),reason:/\bbecause\b/.test(l),adaptation:/\b(full|unavailable|choose another|another option|what about)\b/.test(l),choice:/\b(let(?:'s| us)|good idea|we can|i choose|i prefer the)\b/.test(l)}),
  repairs:[
   {match:/\bi like film because funny\b/i,focus:'because_reason',original:'I like film because funny.',model:'I like the film because it is funny.'},
   {match:/\bwhy you like it\b/i,focus:'why_question',original:'Why you like it?',model:'Why do you like it?'},
   {match:/\bit full\. choose other\b/i,focus:'adaptation',original:'It full. Choose other.',model:'It is full. Let us choose another.'}
  ]
 },
 'a1-gold-l18':{
  title:'Global Connections',
  canDo:'Introduce yourself to an international visitor, talk about languages and places, and adapt when one detail changes.',
  opening:'Hi. I am visiting your city. Please introduce yourself.',
  keys:['identity','language','visit','questions','adaptation'],required:['identity','language','adaptation'],minimumKeys:5,minimumQuestions:2,
  prompts:{identity:'Tell me where you are from or where you live.',language:'What languages do you speak?',visit:'Tell me one place you want to visit and why.',questions:'Ask me two useful questions about my country, language, or visit.',adaptation:'The meeting place changed from the library to the community centre. Ask for the new location.'},
  detect:l=>({identity:/\b(i am from|i'm from|i live in|my name is)\b/.test(l),language:/\b(i speak|i can speak|some english|somali|arabic|swahili)\b/.test(l),visit:/\b(i want to visit|i hope to visit|because)\b/.test(l),questions:/\b(what country are you from|what languages do you speak|what place do you want to visit|where do you live)\b/.test(l),adaptation:/\b(where is the (?:new place|community centre)|where should we meet|meeting place changed)\b/.test(l)}),
  repairs:[
   {match:/\bi can speaking english\b/i,focus:'can_base',original:'I can speaking English.',model:'I can speak English.'},
   {match:/\bwhat country you from\b/i,focus:'origin_question',original:'What country you from?',model:'What country are you from?'},
   {match:/\bi want visit kenya\b/i,focus:'want_to',original:'I want visit Kenya.',model:'I want to visit Kenya.'}
  ]
 },
 'a1-gold-l19':{
  title:'Shopping & Services',
  canDo:'Ask about a product, choose size or colour, pay, and adapt when the preferred option is unavailable.',
  opening:'Hello. I can help you in the shop. What do you need?',
  keys:['product','option','adaptation','payment','receipt'],required:['product','adaptation','payment'],minimumKeys:5,minimumQuestions:3,
  prompts:{product:'Ask about the item or price.',option:'Ask for a size or colour.',adaptation:'Your first colour or size is unavailable. Ask for another option.',payment:'Finish the purchase and ask how to pay.',receipt:'Ask for a receipt.'},
  detect:l=>({product:/\b(how much|i want|shirt|bag|notebook|size|colour)\b/.test(l),option:/\b(do you have|what size|blue|black|small|medium|large|can i try)\b/.test(l),adaptation:/\b(do you have (?:black|blue|another)|another one|another size|another colour|not available|unavailable)\b/.test(l),payment:/\b(can i pay|pay by card|pay cash|i will take it|i'll take it)\b/.test(l),receipt:/\b(receipt|can i have a receipt)\b/.test(l)}),
  repairs:[
   {match:/\byou have blue this\b/i,focus:'service_question',original:'You have blue this?',model:'Do you have this in blue?'},
   {match:/\bcan i trying this\b/i,focus:'can_base',original:'Can I trying this?',model:'Can I try this?'},
   {match:/\bi pay card\b/i,focus:'payment_question',original:'I pay card.',model:'Can I pay by card?'}
  ]
 },
 'a1-gold-l20':{
  title:'Home & Daily Life',
  canDo:'Describe a home and daily routine, and give a visitor the practical information they need.',
  opening:'I am visiting your home. Tell me one thing about your home and routine.',
  keys:['home','routine','location','timeQuestion','adaptation'],required:['home','routine','adaptation'],minimumKeys:5,minimumQuestions:1,
  prompts:{home:'Describe one or two rooms using there is or there are.',routine:'Tell me one routine and time.',location:'Tell me where one room is.',timeQuestion:'Ask me one useful routine or location question.',adaptation:'Today you will arrive one hour later than usual. Tell me the updated time.'},
  detect:l=>({home:/\bthere (?:is|are)\b/.test(l),routine:/\b(i wake up|i cook|i clean|i get home|i sleep)\b/.test(l),location:/\b(next to|near|behind|opposite)\b/.test(l),timeQuestion:/\b(what time do you|where is|is there)\b/.test(l),adaptation:/\b(today|late|later|at six|at 6|changed)\b/.test(l)}),
  repairs:[
   {match:/\bthere is two bedrooms\b/i,focus:'there_are',original:'There is two bedrooms.',model:'There are two bedrooms.'},
   {match:/\bi wake up in six\b/i,focus:'time_preposition',original:'I wake up in six.',model:'I wake up at six.'},
   {match:/\bwhat time you get home\b/i,focus:'question_form',original:'What time you get home?',model:'What time do you get home?'}
  ]
 },
 'a1-gold-l21':{
  title:'Plans & Events',
  canDo:'Invite someone, compare availability, arrange a time and place, and adapt when the plan changes.',
  opening:'Let us make a plan for Saturday. Ask when I am free.',
  keys:['availability','proposal','place','adaptation','alternative'],required:['availability','proposal','adaptation'],minimumKeys:5,minimumQuestions:2,
  prompts:{availability:'Ask when I am free and tell me when you are free.',proposal:'Suggest a meeting time.',place:'Choose a meeting place.',adaptation:'The event time changed and your first plan no longer works. Respond to the change.',alternative:'Make a new workable plan.'},
  detect:l=>({availability:/\b(are you free|when are you free|what time can you meet|i can meet|i cannot meet|i can't meet)\b/.test(l),proposal:/\b(let(?:'s| us) meet|we can meet|meet at)\b/.test(l),place:/\b(town hall|market|cafe|café|community centre|where should we meet)\b/.test(l),adaptation:/\b(changed|starts at|cannot stay|can't stay|later|instead)\b/.test(l),alternative:/\b(let(?:'s| us) (?:go|meet)|afternoon market|another time|instead)\b/.test(l)}),
  repairs:[
   {match:/\bdo you free saturday\b/i,focus:'availability_question',original:'Do you free Saturday?',model:'Are you free on Saturday?'},
   {match:/\bi cannot to meet at three\b/i,focus:'can_base',original:'I cannot to meet at three.',model:'I cannot meet at three.'},
   {match:/\blet us meeting at five\b/i,focus:'lets_base',original:'Let us meeting at five.',model:'Let us meet at five.'}
  ]
 },
 'a1-gold-l22':{
  title:'My English in the Real World',
  canDo:'Use A1 English independently to manage a short real-world sequence involving people, place, time, service, and a changed condition.',
  opening:'Welcome to the community event. Start the conversation and tell me who you are.',
  keys:['identity','placeTime','service','helpOrQuestion','arrangement','adaptation'],required:['identity','placeTime','service','adaptation'],minimumKeys:6,minimumQuestions:2,
  prompts:{identity:'Introduce yourself with at least two useful details.',placeTime:'Find the event place and confirm the updated time.',service:'Your preferred badge is unavailable. Solve the service problem.',helpOrQuestion:'Ask at least two useful questions during the mission.',arrangement:'Make one next arrangement with another person.',adaptation:'The event time or available option changes. Show that you can update your plan.'},
  detect:l=>({identity:/\b(my name is|i['’]?m|i am|i live in|i work|i study)\b/.test(l),placeTime:/\b(where is|community centre|what time|starts at|at six|6:00|city market)\b/.test(l),service:/\b(how much|badge|black|blue|another one|available|i will take|i'll take)\b/.test(l),helpOrQuestion:/\b(can you help|where is|what time|how much|are you free|do you have|what should we do)\b/.test(l),arrangement:/\b(let(?:'s| us) meet|we can meet|meet at|see you at)\b/.test(l),adaptation:/\b(changed|not available|unavailable|another one|black is okay|new time|now starts)\b/.test(l)}),
  repairs:[
   {match:/\bwhere the community centre is\b/i,focus:'location_question',original:'Where the community centre is?',model:'Where is the community centre?'},
   {match:/\bi can to get black\b/i,focus:'can_base',original:'I can to get black.',model:'I can get the black one.'},
   {match:/\blet us meeting at six\b/i,focus:'arrangement',original:'Let us meeting at six.',model:'Let us meet at six.'}
  ]
 }
};

function session(req){try{return jwt.verify(req.cookies?.ff_session||'',process.env.JWT_SECRET)}catch{return null}}
function clean(v,max=1200){return String(v||'').trim().replace(/\s+/g,' ').slice(0,max)}
function configFor(id){return LESSONS[String(id||'')]||null}
async function goldActive(){const q=await pool.query("select 1 from books where id=$1 and status in ('ready','pilot')",[BOOK_ID]);return Boolean(q.rowCount)}
async function requireGoldActive(res){if(await goldActive())return true;res.status(423).json({error:'A1 Gold is currently inactive. Only B2 Upper Intermediate is active.'});return false}
function bool(v){return v===true}
async function ensureSchema(){
 await pool.query(`
  create table if not exists a1_gold_speaking_sessions(
   id text primary key,student_id text not null references users(id) on delete cascade,lesson_id text not null,
   status text not null default 'in_progress' check(status in ('in_progress','completed','needs_review')),
   transcript jsonb not null default '[]'::jsonb,functions jsonb not null default '{}'::jsonb,
   relevant_questions int not null default 0,personal_details int not null default 0,scaffold_level int not null default 0,
   deterministic_pass boolean not null default false,jev_status text not null default 'pending',jev_result jsonb not null default '{}'::jsonb,
   mastery_state text not null default 'in_progress',created_at timestamptz not null default now(),updated_at timestamptz not null default now()
  );
  create index if not exists a1_gold_speaking_student_lesson_idx on a1_gold_speaking_sessions(student_id,lesson_id,updated_at desc);
  create table if not exists a1_gold_fix_evidence(
   id bigserial primary key,student_id text not null references users(id) on delete cascade,lesson_id text not null,
   source_session_id text references a1_gold_speaking_sessions(id) on delete set null,focus text not null,
   original_text text not null default '',model_text text not null default '',retry_text text not null default '',
   resolved boolean not null default false,created_at timestamptz not null default now()
  );
 `);
}
function questionCount(text){
 const t=String(text||'').trim();if(!t)return 0;
 const marked=(t.match(/\?/g)||[]).length;if(marked)return Math.min(8,marked);
 return /^(what|where|who|why|how|do|does|are|is|can|when|which)\b/i.test(t)?1:0;
}
function hasQuestion(text){return questionCount(text)>0}
function detect(config,text){const l=String(text||'').toLowerCase(),qc=questionCount(text);return {...config.detect(l),question:qc>0,questionCount:qc}}
function evidenceCount(config,functions){return config.keys.filter(k=>bool(functions[k])).length}
function deterministicReady(config,functions,questions){
 const count=evidenceCount(config,functions);
 return config.required.every(k=>bool(functions[k]))&&count>=config.minimumKeys&&questions>=config.minimumQuestions;
}
function nextPrompt(config,functions,questions){
 for(const key of config.keys)if(!functions[key]&&config.prompts[key])return config.prompts[key];
 if(questions<config.minimumQuestions)return config.minimumQuestions===1?'Ask me one useful question too.':'Ask me another useful question.';
 return 'Good. Add one more useful detail.';
}
function commonRepairs(config,transcript){
 const text=transcript.filter(x=>x.role==='student').map(x=>x.text).join(' ');
 return config.repairs.filter(r=>r.match.test(text)).slice(0,3).map(({focus,original,model})=>({focus,original,model}));
}
async function callJev(state){
 const key=String(process.env.TYPESAFE_API_KEY||'').trim();
 if(!key)return {available:false,reason:'not_configured'};
 const canDo=String(state.canDo||'Complete the A1 communicative task.');
 const questions={
  task_completion:{type:'choice',instructions:'Does the learner successfully complete this CEFR A1 can-do: '+canDo+' Minor form errors must not erase successful communication.',criteria:{pass:'The communicative task is completed.',fail:'The learner cannot complete the basic task.',not_applicable:'Not applicable.'}},
  comprehensibility:{type:'choice',instructions:'Is the learner understandable enough for this simple A1 interaction?',criteria:{pass:'Meaning is generally understandable.',fail:'Meaning repeatedly breaks down.',not_applicable:'Not applicable.'}},
  reciprocity:{type:'choice',instructions:'Does the learner participate reciprocally by asking the required relevant basic question(s) as well as responding?',criteria:{pass:'The learner demonstrates the required reciprocal exchange.',fail:'The learner does not demonstrate reciprocal exchange.',not_applicable:'Not applicable.'}},
  cefr_fit:{type:'choice',instructions:'Is the interaction and expected output appropriate for CEFR A1 rather than demanding explanation or language above A1?',criteria:{pass:'The task remains A1 appropriate.',fail:'The interaction requires materially higher proficiency.',not_applicable:'Not applicable.'}}
 };
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Math.max(5000,Math.min(30000,Number(process.env.TYPESAFE_TIMEOUT_MS)||20000)));
 try{
  const r=await fetch(TYPE_SAFE_URL,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:TYPE_SAFE_MODEL,state,questions}),signal:controller.signal});
  if(!r.ok)return {available:false,reason:'http_'+r.status};
  return {available:true,data:await r.json()};
 }catch(e){return {available:false,reason:e?.name==='AbortError'?'timeout':'error'}}finally{clearTimeout(timer)}
}
function jevPass(result){
 if(!result?.available)return false;
 const answers=result.data?.answers||{};
 return ['task_completion','comprehensibility','reciprocity','cefr_fit'].every(k=>String(answers[k]?.choice||'').toLowerCase()==='pass');
}
async function canRead(user,studentId){
 if(user.role==='student')return user.id===studentId;
 if(user.role==='admin')return true;
 if(user.role!=='teacher')return false;
 const q=await pool.query('select 1 from enrollments e join classes c on c.id=e.class_id where e.user_id=$1 and c.teacher_id=$2 limit 1',[studentId,user.id]);
 return Boolean(q.rowCount);
}

function install(app){
 if(installed.has(app))return;installed.add(app);

 nativePost.call(app,'/api/a1-gold/speaking/start',async(req,res)=>{
  const user=session(req);if(!user||user.role!=='student')return res.status(403).json({error:'Student access required.'});
  await ensureSchema();if(!(await requireGoldActive(res)))return;
  const lessonId=clean(req.body?.lessonId,80),config=configFor(lessonId);
  if(!config)return res.status(400).json({error:'This A1 Gold speaking pilot is available for Lessons 1–5 only.'});
  const id='a1sp_'+crypto.randomUUID(),transcript=[{role:'ai',text:config.opening,at:new Date().toISOString()}];
  await pool.query('insert into a1_gold_speaking_sessions(id,student_id,lesson_id,transcript) values($1,$2,$3,$4::jsonb)',[id,user.id,lessonId,JSON.stringify(transcript)]);
  res.set('Cache-Control','no-store');res.json({ok:true,sessionId:id,message:config.opening,lessonId,version:VERSION});
 });

 nativePost.call(app,'/api/a1-gold/speaking/turn',async(req,res)=>{
  const user=session(req);if(!user||user.role!=='student')return res.status(403).json({error:'Student access required.'});
  await ensureSchema();if(!(await requireGoldActive(res)))return;
  const id=clean(req.body?.sessionId,100),text=clean(req.body?.text,800);if(!id||!text)return res.status(400).json({error:'Enter a response.'});
  const q=await pool.query('select * from a1_gold_speaking_sessions where id=$1 and student_id=$2',[id,user.id]);if(!q.rowCount)return res.status(404).json({error:'Speaking session not found.'});
  const row=q.rows[0],config=configFor(row.lesson_id);if(!config)return res.status(409).json({error:'This lesson is not available in the current A1 pilot.'});
  if(row.status!=='in_progress')return res.status(409).json({error:'This speaking session is already complete.'});
  const transcript=Array.isArray(row.transcript)?row.transcript:[],turn=detect(config,text),old=row.functions&&typeof row.functions==='object'?row.functions:{},functions={...old};
  for(const key of config.keys)functions[key]=bool(old[key])||bool(turn[key]);
  const relevantQuestions=Math.min(20,Number(row.relevant_questions||0)+Number(turn.questionCount||0)),details=evidenceCount(config,functions);
  transcript.push({role:'student',text,at:new Date().toISOString()});
  const minimum=deterministicReady(config,functions,relevantQuestions),message=minimum?'Great. You completed the A1 speaking goal. We can check your transfer evidence.':nextPrompt(config,functions,relevantQuestions);
  transcript.push({role:'ai',text:message,at:new Date().toISOString()});
  await pool.query('update a1_gold_speaking_sessions set transcript=$1::jsonb,functions=$2::jsonb,relevant_questions=$3,personal_details=$4,deterministic_pass=$5,updated_at=now() where id=$6',[JSON.stringify(transcript),JSON.stringify(functions),relevantQuestions,details,minimum,id]);
  res.json({ok:true,message,readyToComplete:minimum,evidence:{functions,relevantQuestions,personalDetails:details,minimumDetails:config.minimumKeys,minimumQuestions:config.minimumQuestions}});
 });

 nativePost.call(app,'/api/a1-gold/speaking/complete',async(req,res)=>{
  const user=session(req);if(!user||user.role!=='student')return res.status(403).json({error:'Student access required.'});
  await ensureSchema();if(!(await requireGoldActive(res)))return;
  const id=clean(req.body?.sessionId,100);
  const q=await pool.query('select * from a1_gold_speaking_sessions where id=$1 and student_id=$2',[id,user.id]);if(!q.rowCount)return res.status(404).json({error:'Speaking session not found.'});
  const row=q.rows[0],config=configFor(row.lesson_id);if(!config)return res.status(409).json({error:'This lesson is not available in the current A1 pilot.'});
  const transcript=Array.isArray(row.transcript)?row.transcript:[],deterministicPass=Boolean(row.deterministic_pass);
  const jev=await callJev({
   purpose:`EnglishGate A1 ${config.title} speaking transfer decision`,targetLevel:'A1',canDo:config.canDo,
   minimumEvidence:{personalDetails:config.minimumKeys,relevantQuestions:config.minimumQuestions,requiredFunctions:config.required},
   transcript,deterministicEvidence:{personalDetails:Number(row.personal_details||0),relevantQuestions:Number(row.relevant_questions||0),functions:row.functions||{}},
   rules:['Prioritize successful communication over minor grammar errors.','Do not require explanations beyond A1.','Use the lesson can-do and supplied evidence only.']
  });
  const pass=deterministicPass&&jevPass(jev),jevStatus=jev.available?(pass?'pass':'fail'):'pending',mastery=pass?'MASTERED':deterministicPass&&!jev.available?'PARTIAL_MASTERY':'REVIEW_REQUIRED';
  const repairs=commonRepairs(config,transcript),savedRepairs=[],client=await pool.connect();
  try{
   await client.query('begin');
   await client.query('update a1_gold_speaking_sessions set status=$1,jev_status=$2,jev_result=$3::jsonb,mastery_state=$4,updated_at=now() where id=$5',[pass?'completed':'needs_review',jevStatus,JSON.stringify(jev),mastery,id]);
   for(const repair of repairs){
    const saved=await client.query('insert into a1_gold_fix_evidence(student_id,lesson_id,source_session_id,focus,original_text,model_text) values($1,$2,$3,$4,$5,$6) returning id',[user.id,row.lesson_id,id,repair.focus,repair.original,repair.model]);
    savedRepairs.push({...repair,id:saved.rows[0].id});
   }
   await client.query('commit');
  }catch(e){await client.query('rollback');throw e}finally{client.release()}
  res.json({ok:true,lessonId:row.lesson_id,masteryState:mastery,deterministicPass,jevStatus,repairs:savedRepairs,evidence:{personalDetails:Number(row.personal_details||0),relevantQuestions:Number(row.relevant_questions||0),functions:row.functions||{}},version:VERSION});
 });

 nativePost.call(app,'/api/a1-gold/fix-retry',async(req,res)=>{
  const user=session(req);if(!user||user.role!=='student')return res.status(403).json({error:'Student access required.'});
  await ensureSchema();if(!(await requireGoldActive(res)))return;
  const id=Number(req.body?.id),retry=clean(req.body?.retry,500);if(!Number.isInteger(id)||!retry)return res.status(400).json({error:'Enter your retry.'});
  const q=await pool.query('select * from a1_gold_fix_evidence where id=$1 and student_id=$2',[id,user.id]);if(!q.rowCount)return res.status(404).json({error:'Fix item not found.'});
  const model=String(q.rows[0].model_text||'').toLowerCase().replace(/[.!?]/g,'').replace(/\s+/g,' ').trim(),norm=retry.toLowerCase().replace(/[.!?]/g,'').replace(/\s+/g,' ').trim(),resolved=norm===model;
  await pool.query('update a1_gold_fix_evidence set retry_text=$1,resolved=$2 where id=$3',[retry,resolved,id]);res.json({ok:true,resolved,model:q.rows[0].model_text});
 });

 nativeGet.call(app,'/api/a1-gold/report/:studentId/:lessonId',async(req,res)=>{
  const user=session(req);if(!user)return res.status(401).json({error:'Sign in required.'});await ensureSchema();
  const studentId=clean(req.params.studentId,100),lessonId=clean(req.params.lessonId,80);if(!configFor(lessonId)||!(await canRead(user,studentId)))return res.status(403).json({error:'Not allowed.'});
  const speaking=(await pool.query('select id,status,transcript,functions,relevant_questions,personal_details,scaffold_level,deterministic_pass,jev_status,jev_result,mastery_state,created_at,updated_at from a1_gold_speaking_sessions where student_id=$1 and lesson_id=$2 order by updated_at desc',[studentId,lessonId])).rows;
  const fixes=(await pool.query('select id,focus,original_text,model_text,retry_text,resolved,created_at from a1_gold_fix_evidence where student_id=$1 and lesson_id=$2 order by created_at desc',[studentId,lessonId])).rows;
  const attempts=(await pool.query('select id,skill,score,tags,evidence,at from attempts where student_id=$1 and lesson_id=$2 order by at desc',[studentId,lessonId])).rows;
  const completion=(await pool.query('select step,completed_at from completion where student_id=$1 and lesson_id=$2 order by completed_at',[studentId,lessonId])).rows;
  const writing=(await pool.query('select content,score,updated_at from writing_samples where student_id=$1 and lesson_id=$2',[studentId,lessonId])).rows[0]||null;
  const workbookActivityStates=(await pool.query('select activity_id,activity_type,status,current_question,responses,started_at,last_activity_at,submitted_at,completed_at from workbook_activity_state where student_id=$1 and lesson_id=$2 order by activity_type',[studentId,lessonId])).rows;
  const workbookActivityAttempts=(await pool.query('select attempt_id,activity_id,activity_type,score,max_score,percentage,correct_count,incorrect_count,responses,status,started_at,submitted_at,created_at from workbook_activity_attempts where student_id=$1 and lesson_id=$2 order by submitted_at desc',[studentId,lessonId])).rows;
  res.set('Cache-Control','no-store');res.json({studentId,lessonId,version:VERSION,speaking,fixes,attempts,completion,writing,workbookActivityStates,workbookActivityAttempts});
 });
}

express.application.get=function a1GoldGet(route,...handlers){install(this);return nativeGet.call(this,route,...handlers)};
express.application.post=function a1GoldPost(route,...handlers){install(this);return nativePost.call(this,route,...handlers)};

require('./reading-listening-separation-bootstrap.js');
