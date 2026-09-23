/* EnglishGate A1 Gold — Northstar content overlay v1
   Governing rule: B2-quality communicative design at A1 language load.
   This layer does not change the frozen vocabulary/grammar progression.
   It upgrades learner-facing context, source texts, interaction, transfer and writing purpose. */
(function(){
'use strict';
const VERSION='a1-northstar-content-v1';

function rotate(id,options,answer){
  const list=[...(options||[])];
  if(list.length<2||!list.includes(answer)) return list;
  const m=String(id).match(/(\d+)$/),shift=(Number(m?.[1]||1)-1)%list.length;
  if(shift) list.push(...list.splice(0,shift));
  return list;
}
function q(id,text,options,answer,tag,feedback=''){
  return {id,q:text,options:rotate(id,options,answer),answer,tag,feedback};
}
const S={
1:{
 situation:'You arrive early for your first evening English class. Another adult learner sits beside you, so you start a short conversation before the teacher arrives.',
 foundation:'Use familiar personal information to start and maintain a short first-meeting conversation.',
 reading:`Amina: Hi. I’m Amina. Is this your first class here?\nYusuf: Yes. I’m Yusuf. Nice to meet you.\nAmina: Nice to meet you too. I live in Borama and I work at a bank. What do you do?\nYusuf: I’m a student. I study business. I like football too.\nAmina: Really? I like football too.`,
 audio:`Maryan: Hi. I’m Maryan. What’s your name?\nSahal: I’m Sahal. Nice to meet you.\nMaryan: Nice to meet you too. Where do you live?\nSahal: I live in Borama. I work at a shop. What do you do?\nMaryan: I’m a teacher. I work at a school. I like reading.`,
 speakers:[{name:'Maryan',gender:'female',voice:'coral'},{name:'Sahal',gender:'male',voice:'onyx'}],
 rq:[
  q('NS1R01','Why are Amina and Yusuf talking?',['They are meeting before class.','They are buying tickets.','They are ordering food.'],'They are meeting before class.','reading:purpose'),
  q('NS1R02','What does Amina do?',['She works at a bank.','She studies business.','She drives a bus.'],'She works at a bank.','reading:detail'),
  q('NS1R03','What do Amina and Yusuf both like?',['Football','Coffee','Travel'],'Football','reading:connection'),
  q('NS1R04','Which question helps Yusuf continue the conversation?',['What do you do?','How much is it?','Where is platform two?'],'What do you do?','reading:response')],
 lq:[
  q('NS1L01','Where does Sahal live?',['Borama','Hargeisa','Berbera'],'Borama','listening:detail'),
  q('NS1L02','Where does Sahal work?',['At a shop','At a school','At a hospital'],'At a shop','listening:detail'),
  q('NS1L03','What is Maryan’s job?',['Teacher','Student','Driver'],'Teacher','listening:detail'),
  q('NS1L04','What does Maryan like?',['Reading','Football','Walking'],'Reading','listening:detail')],
 writing:'Write a 20–40 word introduction for your new English class group. Give your name, where you live, what you do, and one interest. End with one friendly question.',
 performance:'Meet a new classmate. Introduce yourself, give three useful details, react to one thing they say, and ask at least two relevant questions.',
 mediation:'After the conversation, tell the teacher your partner’s name and one detail you remember.',
 change:'Your partner says they live in the same city as you. React naturally and continue the conversation.'
},
2:{
 situation:'You attend a short workplace training session and sit with someone from another organisation. During the break, you exchange simple information about your work or study.',
 foundation:'Move from a personal introduction to a simple professional introduction.',
 reading:`Ibrahim: Hi, I’m Ibrahim. I work for a transport company.\nHodan: Nice to meet you. I’m Hodan. I work at a hospital.\nIbrahim: What do you do there?\nHodan: I’m a nurse. I help patients. What do you do?\nIbrahim: I’m a driver. I drive a bus and I meet customers every day.`,
 audio:`Farah: What do you do?\nLeyla: I’m a student. I study business at college. What about you?\nFarah: I work in an office. I help customers and I use a computer every day.\nLeyla: Nice. Do you like your job?\nFarah: Yes, I do.`,
 speakers:[{name:'Farah',gender:'male',voice:'onyx'},{name:'Leyla',gender:'female',voice:'coral'}],
 rq:[
  q('NS2R01','Where does Hodan work?',['At a hospital','At a transport company','At a school'],'At a hospital','reading:detail'),
  q('NS2R02','What does Hodan do there?',['She helps patients.','She drives a bus.','She studies business.'],'She helps patients.','reading:detail'),
  q('NS2R03','What is Ibrahim’s job?',['Driver','Nurse','Student'],'Driver','reading:detail'),
  q('NS2R04','Which question moves the conversation from job to work action?',['What do you do there?','What’s your name?','Where do you live?'],'What do you do there?','reading:response')],
 lq:[
  q('NS2L01','What does Leyla study?',['Business','English teaching','Nursing'],'Business','listening:detail'),
  q('NS2L02','Where does Farah work?',['In an office','At a hospital','On a bus'],'In an office','listening:detail'),
  q('NS2L03','Who helps customers?',['Farah','Leyla','Both speakers'],'Farah','listening:detail'),
  q('NS2L04','Does Farah like his job?',['Yes','No','He does not say.'],'Yes','listening:detail')],
 writing:'Write a 20–40 word professional group introduction. Say what you do or study, where you work or study, and one thing you do there.',
 performance:'Introduce your work or study to someone at a training session. Give your role, workplace, and one action, then ask two questions about the other person.',
 mediation:'Tell a third person what your partner does using only the information you understood.',
 change:'The other person does not understand your job title. Explain it with one simple work action.'
},
3:{
 situation:'You are at a bus station and need to travel this afternoon. You must understand the departure information and ask for the ticket you need.',
 foundation:'Use fixed travel questions and place/time language to complete a simple journey.',
 reading:`BORAMA BUS STATION\nHargeisa — 9:00 — Platform 2 — $6\nGabiley — 11:30 — Platform 1 — $4\nHargeisa — 15:00 — Platform 3 — $6\nTickets: Main desk near the entrance.`,
 audio:`Passenger: Hello. I’d like a ticket to Hargeisa, please.\nClerk: Morning or afternoon?\nPassenger: Afternoon, please.\nClerk: The bus leaves at three o’clock from platform three.\nPassenger: How much is the ticket?\nClerk: Six dollars.\nPassenger: Thank you.`,
 speakers:[{name:'Passenger',gender:'female',voice:'coral'},{name:'Clerk',gender:'male',voice:'onyx'}],
 rq:[
  q('NS3R01','Which Hargeisa bus leaves in the afternoon?',['15:00','9:00','11:30'],'15:00','reading:detail'),
  q('NS3R02','Which platform does the afternoon Hargeisa bus use?',['Platform 3','Platform 2','Platform 1'],'Platform 3','reading:detail'),
  q('NS3R03','How much is a ticket to Hargeisa?',['$6','$4','$9'],'$6','reading:detail'),
  q('NS3R04','Where can you buy a ticket?',['At the main desk','On platform one','Outside the station'],'At the main desk','reading:detail')],
 lq:[
  q('NS3L01','Where does the passenger want to go?',['Hargeisa','Gabiley','Borama'],'Hargeisa','listening:detail'),
  q('NS3L02','Does the passenger want the morning or afternoon bus?',['Afternoon','Morning','Either one'],'Afternoon','listening:detail'),
  q('NS3L03','What time does the bus leave?',['Three o’clock','Nine o’clock','Eleven thirty'],'Three o’clock','listening:detail'),
  q('NS3L04','What does the passenger ask after the platform information?',['The price','The driver’s name','The weather'],'The price','listening:sequence')],
 writing:'Write a 20–35 word travel message to a friend. Say where you are going, what time you leave, and which platform or meeting place you will use.',
 performance:'Buy the correct ticket. Ask about destination, time, price, and platform. Then change your plan from morning to afternoon without using a full script.',
 mediation:'Read the board and tell your travel partner the correct departure time and platform.',
 change:'The morning bus is full. Ask for the afternoon option and confirm the new platform.'
},
4:{
 situation:'A colleague asks how you normally use your phone and internet. You compare simple technology routines and explain one useful purpose.',
 foundation:'Connect familiar present-simple routines to real technology use.',
 reading:`Ayan: I use my phone every day. I send messages to my family and I use WhatsApp for work. I often watch short videos in the evening. I don’t use my computer every day, but I use it for study on Saturday.`,
 audio:`Bilal: Do you use your phone for work?\nSamira: Yes. I send messages and I make video calls.\nBilal: Do you use social media every day?\nSamira: No. I use it sometimes. I usually use the internet for work and study.\nBilal: Me too.`,
 speakers:[{name:'Bilal',gender:'male',voice:'onyx'},{name:'Samira',gender:'female',voice:'coral'}],
 rq:[
  q('NS4R01','What does Ayan use WhatsApp for?',['Work','Travel tickets','Exercise'],'Work','reading:detail'),
  q('NS4R02','When does Ayan often watch videos?',['In the evening','In the morning','At work'],'In the evening','reading:detail'),
  q('NS4R03','Does Ayan use a computer every day?',['No','Yes','The text does not say.'],'No','reading:detail'),
  q('NS4R04','What does Ayan use the computer for on Saturday?',['Study','Shopping','Calling family'],'Study','reading:detail')],
 lq:[
  q('NS4L01','What does Samira do on her phone?',['She sends messages and makes video calls.','She buys bus tickets.','She reads menus.'],'She sends messages and makes video calls.','listening:detail'),
  q('NS4L02','Does Samira use social media every day?',['No','Yes','Only at work'],'No','listening:detail'),
  q('NS4L03','What does she usually use the internet for?',['Work and study','Food and travel','Weather only'],'Work and study','listening:detail'),
  q('NS4L04','How does Bilal react?',['He says he is similar.','He says he never uses the internet.','He changes the topic to travel.'],'He says he is similar.','listening:response')],
 writing:'Write a 25–45 word post about how you use one device or app. Say what you use, what you use it for, and how often you use it.',
 performance:'Compare technology habits with a partner. Say what you use, its purpose, frequency, and ask at least two questions.',
 mediation:'Tell a classmate one useful way your partner uses technology.',
 change:'Your phone has no internet today. Say what you can use instead for one important task.'
},
5:{
 situation:'You do not feel well during class and need to explain the problem simply, ask for what you need, and say one healthy habit.',
 foundation:'Use simple first-person health language for an immediate real-life need.',
 reading:`Amal: I feel tired today. I have a headache and I need some water. I don’t want coffee. I want to go home early, sleep, and rest. Tomorrow I want to take a short walk if I feel better.`,
 audio:`Amina: I don’t feel well today.\nHodan: What’s the problem?\nAmina: I have a headache and I feel tired.\nHodan: Do you need water?\nAmina: Yes, please. I also need some rest.\nHodan: Okay.`,
 speakers:[{name:'Amina',gender:'female',voice:'coral'},{name:'Hodan',gender:'female',voice:'nova'}],
 rq:[
  q('NS5R01','How does Amal feel?',['Tired','Hungry','Cold'],'Tired','reading:detail'),
  q('NS5R02','What health problem does Amal have?',['A headache','A cough','A sore foot'],'A headache','reading:detail'),
  q('NS5R03','What does Amal need now?',['Water','Coffee','Food'],'Water','reading:detail'),
  q('NS5R04','What healthy action does Amal plan for tomorrow?',['A short walk','A long bus trip','A late night'],'A short walk','reading:detail')],
 lq:[
  q('NS5L01','What problem does Amina have?',['A headache','A broken phone','A lost ticket'],'A headache','listening:detail'),
  q('NS5L02','How does Amina feel?',['Tired','Hungry','Happy'],'Tired','listening:detail'),
  q('NS5L03','What does Hodan offer?',['Water','Coffee','Medicine'],'Water','listening:detail'),
  q('NS5L04','What else does Amina say she needs?',['Rest','A taxi','Exercise now'],'Rest','listening:detail')],
 writing:'Write a 20–35 word message to your teacher or manager. Say you do not feel well, name the problem, and say what you need.',
 performance:'Explain how you feel, name one problem or need, say one healthy habit, and answer two simple follow-up questions.',
 mediation:'Tell someone what your partner needs without adding medical advice.',
 change:'You cannot go home immediately. Ask for one simple thing that can help you until class or work ends.'
},
6:{
 situation:'You are ordering a simple meal at a café. One item you want is unavailable, so you must choose another option and complete the order.',
 foundation:'Use preference language and polite requests in a real service exchange.',
 reading:`CITY CAFÉ\nBreakfast: tea + bread — $3\nRice + vegetables — $5\nRice + meat — $7\nCoffee — $2\nTea — $1\nToday: no meat after 2:00 p.m.`,
 audio:`Server: Hello. What would you like?\nCustomer: I’d like rice and meat, please.\nServer: Sorry, we don’t have meat now. We have rice and vegetables.\nCustomer: Okay. I’d like rice and vegetables, please. And a tea.\nServer: Sure.`,
 speakers:[{name:'Server',gender:'female',voice:'coral'},{name:'Customer',gender:'male',voice:'onyx'}],
 rq:[
  q('NS6R01','How much is rice and vegetables?',['$5','$7','$3'],'$5','reading:detail'),
  q('NS6R02','Which drink is cheaper?',['Tea','Coffee','They cost the same.'],'Tea','reading:detail'),
  q('NS6R03','What is not available after 2:00 p.m.?',['Meat','Rice','Tea'],'Meat','reading:constraint'),
  q('NS6R04','Which sentence is a polite order?',["I’d like tea, please.",'I like tea every day.','Tea is cheap.'],"I’d like tea, please.",'reading:response')],
 lq:[
  q('NS6L01','What does the customer want first?',['Rice and meat','Breakfast','Coffee'],'Rice and meat','listening:detail'),
  q('NS6L02','Why does the customer change the order?',['Meat is unavailable.','Tea is unavailable.','The café is closing.'],'Meat is unavailable.','listening:constraint'),
  q('NS6L03','What food does the customer choose instead?',['Rice and vegetables','Bread','Meat only'],'Rice and vegetables','listening:response'),
  q('NS6L04','What drink does the customer add?',['Tea','Coffee','Water'],'Tea','listening:detail')],
 writing:'Write a 20–35 word food order or message. Say what you would like, one thing you do not want, and one drink.',
 performance:'Order a meal politely. If the first choice is unavailable, choose an alternative and complete the order.',
 mediation:'Read the menu and tell your partner which suitable alternative is available.',
 change:'Your first food choice is unavailable. Change your order politely without ending the conversation.'
},
7:{
 situation:'You are in an English class and a task is difficult. You must understand the teacher’s direction and ask for specific help.',
 foundation:'Use can/can’t and simple classroom help strategies to stay in the learning task.',
 reading:`CLASS TASK\n1. Read the short message.\n2. Circle two important words.\n3. Work with a partner.\n4. Ask and answer the questions.\n5. If you don’t understand, say: “Can you repeat that, please?”`,
 audio:`Teacher: Open your book to page twelve. Read the message first. Then work with your partner.\nStudent: Sorry, I can’t find page twelve. Can you help me?\nTeacher: Yes. It’s here.\nStudent: Thank you. Can you repeat the last instruction, please?\nTeacher: Work with your partner.`,
 speakers:[{name:'Teacher',gender:'female',voice:'coral'},{name:'Student',gender:'male',voice:'onyx'}],
 rq:[
  q('NS7R01','What do students do first?',['Read the short message.','Work with a partner.','Ask the teacher to repeat.'],'Read the short message.','reading:sequence'),
  q('NS7R02','How many important words should students circle?',['Two','Five','One'],'Two','reading:detail'),
  q('NS7R03','Who do students work with?',['A partner','The receptionist','A customer'],'A partner','reading:detail'),
  q('NS7R04','What can a student say when they do not understand?',['Can you repeat that, please?','How much is the ticket?','I’d like tea.'],'Can you repeat that, please?','reading:response')],
 lq:[
  q('NS7L01','Which page does the teacher say?',['Page twelve','Page twenty','Page two'],'Page twelve','listening:detail'),
  q('NS7L02','What can’t the student do?',['Find the page','Read English','Work with a partner'],'Find the page','listening:problem'),
  q('NS7L03','What does the student ask for first?',['Help','A ticket','Food'],'Help','listening:response'),
  q('NS7L04','What instruction does the teacher repeat?',['Work with your partner.','Close the book.','Go home.'],'Work with your partner.','listening:detail')],
 writing:'Write a 20–35 word learner message. Say one thing you can do, one thing you can’t do yet, and ask for specific help.',
 performance:'Explain a learning problem, use can/can’t, ask for help or repetition, and follow one simple instruction.',
 mediation:'Tell your partner one teacher instruction they missed.',
 change:'The teacher repeats the instruction, but one word is still unclear. Ask a second, more specific help question.'
},
8:{
 situation:'You are buying a few items and need to understand prices, choose a payment method, and check the total.',
 foundation:'Use numbers and payment language to complete a simple transaction accurately.',
 reading:`MINI MARKET\nWater — $1\nNotebook — $3\nPhone charger — $8\nBag — $12\nPayment: cash or card\nReceipt available at the desk.`,
 audio:`Cashier: That’s twelve dollars, please.\nCustomer: Can I pay by card?\nCashier: Yes, you can.\nCustomer: Okay. Here is my card. Can I have a receipt, please?\nCashier: Of course.`,
 speakers:[{name:'Cashier',gender:'female',voice:'coral'},{name:'Customer',gender:'male',voice:'onyx'}],
 rq:[
  q('NS8R01','How much is the phone charger?',['$8','$12','$3'],'$8','reading:number'),
  q('NS8R02','Which item costs $3?',['Notebook','Bag','Water'],'Notebook','reading:number'),
  q('NS8R03','How can customers pay?',['Cash or card','Card only','Cash only'],'Cash or card','reading:detail'),
  q('NS8R04','Where is the receipt available?',['At the desk','At the bus station','At the café'],'At the desk','reading:detail')],
 lq:[
  q('NS8L01','What is the total price?',['Twelve dollars','Eight dollars','Three dollars'],'Twelve dollars','listening:number'),
  q('NS8L02','How does the customer want to pay?',['By card','In cash','By phone'],'By card','listening:detail'),
  q('NS8L03','Does the cashier accept the payment method?',['Yes','No','The cashier does not answer.'],'Yes','listening:detail'),
  q('NS8L04','What does the customer ask for at the end?',['A receipt','A bag','Change'],'A receipt','listening:sequence')],
 writing:'Write a 20–35 word price enquiry. Name the item, ask the price, and ask whether you can pay by cash or card.',
 performance:'Ask about a price, understand the number, choose cash or card, and request a receipt or change.',
 mediation:'Read two prices and tell your partner which option is cheaper.',
 change:'Your preferred payment method is not available. Ask if you can use the other method.'
},
9:{
 situation:'You are planning your day with a friend and need to understand a simple weather update before deciding what to do.',
 foundation:'Use weather words and simple contrast with but to make an everyday plan.',
 reading:`TODAY’S WEATHER\nBorama: sunny, 24°C, windy in the afternoon\nHargeisa: hot, 31°C, dry\nGabiley: cloudy, 22°C, light rain in the evening`,
 audio:`Asha: It’s sunny now, but it’s windy this afternoon.\nMuna: Do you want to walk now?\nAsha: Yes. I like sunny weather, but I don’t like strong wind.\nMuna: Okay. Let’s walk before lunch.`,
 speakers:[{name:'Asha',gender:'female',voice:'coral'},{name:'Muna',gender:'female',voice:'nova'}],
 rq:[
  q('NS9R01','Where is it hottest?',['Hargeisa','Borama','Gabiley'],'Hargeisa','reading:detail'),
  q('NS9R02','Which place may have rain in the evening?',['Gabiley','Hargeisa','Borama'],'Gabiley','reading:detail'),
  q('NS9R03','What changes in Borama in the afternoon?',['It becomes windy.','It becomes snowy.','It becomes cold and rainy.'],'It becomes windy.','reading:detail'),
  q('NS9R04','Which sentence shows a contrast?',["It’s sunny, but it’s windy.",'It is 24 degrees.','It is dry.'],"It’s sunny, but it’s windy.",'reading:language')],
 lq:[
  q('NS9L01','What is the weather like now?',['Sunny','Rainy','Cold'],'Sunny','listening:detail'),
  q('NS9L02','What weather is expected this afternoon?',['Windy','Snowy','Foggy'],'Windy','listening:detail'),
  q('NS9L03','Does Asha like strong wind?',['No','Yes','She does not say.'],'No','listening:detail'),
  q('NS9L04','When do they decide to walk?',['Before lunch','In the evening','Tomorrow'],'Before lunch','listening:decision')],
 writing:'Write a 20–35 word weather update to a friend. Describe the weather now, one later change, and one simple preference or plan.',
 performance:'Describe today’s weather, say what you like or do not like, and make a simple plan that fits the conditions.',
 mediation:'Read the weather panel and tell your partner the best simple time for the planned activity.',
 change:'The weather changes later in the day. Adjust your plan using but.'
},
10:{
 situation:'A colleague shows you a family photo during a break. You introduce one person in your family and ask about one person in theirs.',
 foundation:'Move from I/you language to he/she and simple third-person information.',
 reading:`This is Mariam’s family. Her husband is Abdi. He works at a bank. Her sister is Fadumo. She studies at university and she likes music. Mariam’s brother, Ali, lives in Hargeisa. He works at a hospital.`,
 audio:`Nimo: Who is this?\nKhalid: She’s my sister, Sahra. She works at a school.\nNimo: What does she do?\nKhalid: She’s a teacher. And this is my brother, Ahmed. He studies business.\nNimo: Does he live here?\nKhalid: No, he lives in Hargeisa.`,
 speakers:[{name:'Nimo',gender:'female',voice:'coral'},{name:'Khalid',gender:'male',voice:'onyx'}],
 rq:[
  q('NS10R01','Who works at a bank?',['Abdi','Fadumo','Ali'],'Abdi','reading:detail'),
  q('NS10R02','What does Fadumo do?',['She studies at university.','She works at a bank.','She drives a bus.'],'She studies at university.','reading:detail'),
  q('NS10R03','Where does Ali live?',['Hargeisa','Borama','Gabiley'],'Hargeisa','reading:detail'),
  q('NS10R04','Which sentence correctly describes Fadumo?',['She likes music.','She like music.','She liking music.'],'She likes music.','reading:language')],
 lq:[
  q('NS10L01','Who is Sahra?',["Khalid’s sister","Khalid’s wife","Nimo’s sister"],"Khalid’s sister",'listening:detail'),
  q('NS10L02','Where does Sahra work?',['At a school','At a hospital','At a bank'],'At a school','listening:detail'),
  q('NS10L03','What does Ahmed study?',['Business','Medicine','English'],'Business','listening:detail'),
  q('NS10L04','Does Ahmed live here?',['No','Yes','The speakers do not say.'],'No','listening:detail')],
 writing:'Write a 25–45 word message introducing one family member or friend. Say who the person is, where they live, what they do, and one thing they like.',
 performance:'Introduce one person clearly using he/she, answer follow-up questions, and ask about one person in your partner’s family or social circle.',
 mediation:'Look at a simple profile and introduce that person to someone else accurately.',
 change:'Your listener asks one extra question about the person. Answer using a third-person sentence.'
},
11:{
 situation:'You see a short community announcement online and need to tell a friend the important information.',
 foundation:'Find practical information in a simple public message and transfer it accurately.',
 reading:`COMMUNITY NOTICE\nFree English Conversation Hour\nSaturday, 4:00 p.m.\nCity Library, Room 2\nTopic: Work and daily life\nBring a notebook. No registration needed.`,
 audio:`Radio host: Good morning. Here is a community update. The city library has a free English conversation hour this Saturday at four o’clock. It is in Room Two. The topic is work and daily life. You do not need to register.`,
 speakers:[{name:'Radio host',gender:'female',voice:'coral'}],
 rq:[
  q('NS11R01','What is the event?',['An English conversation hour','A football match','A job interview'],'An English conversation hour','reading:main-idea'),
  q('NS11R02','When is it?',['Saturday at 4:00 p.m.','Friday at 2:00 p.m.','Sunday at 4:00 p.m.'],'Saturday at 4:00 p.m.','reading:detail'),
  q('NS11R03','Where is the event?',['City Library, Room 2','City Bank, Room 4','The market'],'City Library, Room 2','reading:detail'),
  q('NS11R04','Do people need to register?',['No','Yes','Only students do.'],'No','reading:detail')],
 lq:[
  q('NS11L01','Which place is giving the update?',['The city library','A hospital','A café'],'The city library','listening:detail'),
  q('NS11L02','What day is the event?',['Saturday','Monday','Friday'],'Saturday','listening:detail'),
  q('NS11L03','What is the topic?',['Work and daily life','Travel and food','Sports and health'],'Work and daily life','listening:detail'),
  q('NS11L04','What important registration information does the host give?',['No registration is needed.','Registration costs money.','Registration closes today.'],'No registration is needed.','listening:transfer')],
 writing:'Write a 25–45 word message or post sharing the announcement. Include what the event is, when and where it is, and one important instruction.',
 performance:'Read or listen to a public announcement, identify the essential details, and explain them to a partner who has not seen the source.',
 mediation:'Transfer what, when, where, and one instruction without changing the information.',
 change:'Your friend can only remember three details. Decide which three are essential and repeat them clearly.'
},
12:{
 situation:'You and a colleague want to exercise together, but your weekly schedules are different. You need to find a time that works for both of you.',
 foundation:'Use frequency and simple schedule language to solve a real coordination problem.',
 reading:`FITNESS SCHEDULE\nAsha: Gym — Monday 6 p.m.; Walk — Wednesday 7 a.m.; Run — Saturday 8 a.m.\nHassan: Football — Tuesday 6 p.m.; Gym — Thursday 6 p.m.; Walk — Saturday 8 a.m.`,
 audio:`Asha: I usually go to the gym once a week. What about you?\nHassan: I go twice a week, but I’m free on Saturday morning.\nAsha: I run on Saturday at eight.\nHassan: I’m free at eight too. Do you want to walk together after your run?\nAsha: Yes, that works.`,
 speakers:[{name:'Asha',gender:'female',voice:'coral'},{name:'Hassan',gender:'male',voice:'onyx'}],
 rq:[
  q('NS12R01','When does Asha go to the gym?',['Monday at 6 p.m.','Thursday at 6 p.m.','Saturday at 8 a.m.'],'Monday at 6 p.m.','reading:detail'),
  q('NS12R02','How often does Hassan have gym on the schedule?',['Once','Twice','Three times'],'Once','reading:frequency'),
  q('NS12R03','When are both connected to an activity at 8 a.m.?',['Saturday','Tuesday','Wednesday'],'Saturday','reading:information-gap'),
  q('NS12R04','Which activity does Hassan do on Tuesday?',['Football','Gym','Walking'],'Football','reading:detail')],
 lq:[
  q('NS12L01','How often does Asha say she goes to the gym?',['Once a week','Twice a week','Every day'],'Once a week','listening:frequency'),
  q('NS12L02','When is Hassan free?',['Saturday morning','Monday evening','Wednesday morning'],'Saturday morning','listening:detail'),
  q('NS12L03','What does Asha do Saturday at eight?',['Run','Gym','Football'],'Run','listening:detail'),
  q('NS12L04','What do they agree to do together?',['Walk','Run a race','Play football'],'Walk','listening:decision')],
 writing:'Write a 25–45 word fitness update. Say what activity you do, how often you do it, and when you are free for one activity with another person.',
 performance:'Compare two weekly schedules, ask frequency questions, find one shared time, and agree on an activity.',
 mediation:'Compare the schedule cards and tell your partner one time both people can use.',
 change:'The first shared time becomes unavailable. Find and suggest another possible time.'
},
13:{
 situation:'A visitor asks you where to find three places in town. You use a simple map and give short directions.',
 foundation:'Use there is/are and place language to help someone navigate a familiar area.',
 reading:`TOWN MAP\nThe market is in the centre. There is a bank next to the market. There is a pharmacy opposite the bank. The bus station is behind the market. There are two cafés near the bus station.`,
 audio:`Visitor: Excuse me. Is there a pharmacy near here?\nLocal: Yes. There’s a pharmacy opposite the bank.\nVisitor: Where is the bank?\nLocal: It’s next to the market in the centre.\nVisitor: And is there a café near the bus station?\nLocal: Yes. There are two cafés near it.`,
 speakers:[{name:'Visitor',gender:'female',voice:'coral'},{name:'Local',gender:'male',voice:'onyx'}],
 rq:[
  q('NS13R01','What is next to the market?',['A bank','A pharmacy','A school'],'A bank','reading:detail'),
  q('NS13R02','Where is the pharmacy?',['Opposite the bank','Behind the bus station','Inside the market'],'Opposite the bank','reading:detail'),
  q('NS13R03','What is behind the market?',['The bus station','The bank','The pharmacy'],'The bus station','reading:detail'),
  q('NS13R04','How many cafés are near the bus station?',['Two','One','Three'],'Two','reading:there-are')],
 lq:[
  q('NS13L01','Which place does the visitor ask about first?',['A pharmacy','A café','A school'],'A pharmacy','listening:detail'),
  q('NS13L02','Where is the bank?',['Next to the market','Opposite the pharmacy','Behind the café'],'Next to the market','listening:detail'),
  q('NS13L03','Where is the market?',['In the centre','Near the hospital','At the station'],'In the centre','listening:detail'),
  q('NS13L04','How many cafés does the local mention?',['Two','One','Four'],'Two','listening:detail')],
 writing:'Write a 25–45 word directions message. Say where one place is and use there is/are to mention one useful nearby place.',
 performance:'Use a map to answer where questions, describe what is nearby, and help a visitor reach one place.',
 mediation:'Use information from your map that your partner cannot see and give the missing location accurately.',
 change:'The visitor asks for a different place after your first direction. Use the map again without restarting the whole explanation.'
},
14:{
 situation:'You are talking with a classmate about one practical goal for the next year and the first action you will take.',
 foundation:'Connect simple future language to a concrete personal goal and reason.',
 reading:`GOAL CARD — Amal\nGoal: improve my English for work\nNext step: study for 30 minutes after work\nStart: next Monday\nReason: I want to speak with more customers\nSupport: practise with a classmate on Saturday`,
 audio:`Ahmed: What are you going to do next year?\nAmal: I’m going to improve my English.\nAhmed: Why?\nAmal: Because I want to speak with more customers at work.\nAhmed: What are you going to do first?\nAmal: I’m going to study for thirty minutes after work.`,
 speakers:[{name:'Ahmed',gender:'male',voice:'onyx'},{name:'Amal',gender:'female',voice:'coral'}],
 rq:[
  q('NS14R01','What is Amal’s goal?',['Improve her English for work','Change her home','Buy a car'],'Improve her English for work','reading:goal'),
  q('NS14R02','When does she plan to start?',['Next Monday','Next year only','Saturday night'],'Next Monday','reading:detail'),
  q('NS14R03','Why does she want to improve English?',['To speak with more customers','To watch more films','To travel tomorrow'],'To speak with more customers','reading:reason'),
  q('NS14R04','Who will she practise with?',['A classmate','A customer','A doctor'],'A classmate','reading:detail')],
 lq:[
  q('NS14L01','What is Amal going to improve?',['Her English','Her driving','Her cooking'],'Her English','listening:goal'),
  q('NS14L02','Why?',['Because she wants to speak with more customers.','Because she dislikes work.','Because she is moving today.'],'Because she wants to speak with more customers.','listening:reason'),
  q('NS14L03','What is her first action?',['Study for thirty minutes after work','Buy a new phone','Leave her job'],'Study for thirty minutes after work','listening:plan'),
  q('NS14L04','Which question asks for the first step?',['What are you going to do first?','Where do you live?','How much is it?'],'What are you going to do first?','listening:response')],
 writing:'Write a 30–50 word goal statement. Say what you want to improve, what you are going to do first, when you will start, and one simple reason using because.',
 performance:'Explain one realistic goal, give a reason, name the first action, and answer a changed-condition question about the plan.',
 mediation:'Read a goal card and tell a partner the goal, reason, and first action.',
 change:'Your original first step is not possible this week. Give a simple alternative that still supports the same goal.'
},
15:{
 situation:'You cannot find an important personal item in a public place. You need to report the problem clearly and follow simple safety instructions.',
 foundation:'Use safe help-seeking language and functional past chunks without turning the lesson into a past-tense unit.',
 reading:`LOST ITEM NOTICE\nLost: black phone\nPlace: City Market entrance\nTime: about 5:00 p.m.\nContact: Market security desk\nImportant: Do not share your password. Describe the phone before collecting it.`,
 audio:`Officer: Can I help you?\nVisitor: Yes. My phone is missing.\nOfficer: Where did you last have it?\nVisitor: At the market entrance, about five o’clock.\nOfficer: What colour is it?\nVisitor: Black.\nOfficer: Okay. Please wait here while I check the security desk.`,
 speakers:[{name:'Officer',gender:'male',voice:'onyx'},{name:'Visitor',gender:'female',voice:'coral'}],
 rq:[
  q('NS15R01','What item is missing?',['A black phone','A blue bag','A wallet'],'A black phone','reading:detail'),
  q('NS15R02','Where was it lost?',['At the City Market entrance','At a school','On a bus'],'At the City Market entrance','reading:detail'),
  q('NS15R03','Who should the person contact?',['Market security desk','A café server','A teacher'],'Market security desk','reading:safety'),
  q('NS15R04','What should the person NOT share?',['A password','The phone colour','The place'],'A password','reading:safety')],
 lq:[
  q('NS15L01','What is missing?',['A phone','A ticket','A bag'],'A phone','listening:detail'),
  q('NS15L02','Where did the visitor last have it?',['At the market entrance','At home','At the bank'],'At the market entrance','listening:detail'),
  q('NS15L03','What colour is the phone?',['Black','Blue','White'],'Black','listening:detail'),
  q('NS15L04','What does the officer ask the visitor to do?',['Wait there','Go home','Call a taxi'],'Wait there','listening:instruction')],
 writing:'Write a 25–45 word lost-item notice. Name the item, give the place and approximate time, and say how someone can contact you safely.',
 performance:'Report a missing item to a responsible person. Give the item, place, time chunk, and one identifying detail, then follow a simple instruction.',
 mediation:'Read a lost-item notice and pass the essential details to security or another responsible person.',
 change:'The first person cannot help you. Ask where you should go next without sharing private information.'
},
16:{
 situation:'A colleague asks you how to complete a simple everyday process. One step is missing, so you need to put the steps in order and explain them.',
 foundation:'Use imperatives and first/next/then/finally to make a simple process clear.',
 reading:`HOW TO JOIN THE VIDEO CALL\nFirst, open the app.\nNext, tap the meeting link.\nThen, check your microphone.\nFinally, tap “Join”.\nIf you cannot hear, check the sound on your phone or computer.`,
 audio:`Asha: How do I send this file?\nFarah: First, open the message. Next, tap the paperclip. Then choose the file. Finally, tap send.\nAsha: Do I write the message before or after I choose the file?\nFarah: Write it before you tap send.`,
 speakers:[{name:'Asha',gender:'female',voice:'coral'},{name:'Farah',gender:'male',voice:'onyx'}],
 rq:[
  q('NS16R01','What do you do first?',['Open the app.','Tap Join.','Check the microphone.'],'Open the app.','reading:sequence'),
  q('NS16R02','What comes after opening the app?',['Tap the meeting link.','Close the app.','Turn off the microphone.'],'Tap the meeting link.','reading:sequence'),
  q('NS16R03','When do you check the microphone?',['Before tapping Join','After leaving the call','Before opening the app'],'Before tapping Join','reading:sequence'),
  q('NS16R04','What can you check if you cannot hear?',['The sound','The bus time','The price'],'The sound','reading:instruction')],
 lq:[
  q('NS16L01','What does Asha want to send?',['A file','A ticket','A payment'],'A file','listening:purpose'),
  q('NS16L02','What does Farah say to tap after opening the message?',['The paperclip','The delete button','The camera'],'The paperclip','listening:sequence'),
  q('NS16L03','What happens after choosing the file?',['Tap send','Close the message','Open the app store'],'Tap send','listening:sequence'),
  q('NS16L04','When should Asha write the message?',['Before she taps send','After she sends it','The next day'],'Before she taps send','listening:clarification')],
 writing:'Write 30–50 words of simple instructions for an everyday task. Use first, next, then, and finally.',
 performance:'Explain a four-step process clearly. Your partner has one missing step, so answer a clarification question and restore the correct order.',
 mediation:'Take steps from one source and explain the complete sequence to someone who has incomplete information.',
 change:'One step does not work. Give one simple alternative before continuing the process.'
},
17:{
 situation:'A friend asks you to recommend a film, song, or programme for the weekend. You give a simple opinion and reason.',
 foundation:'Use familiar preference language plus because to make a useful recommendation.',
 reading:`WEEKEND PICKS\nCity Lights — film — funny — 7:00 p.m.\nOcean World — programme — interesting — 8:30 p.m.\nLive Music Hour — music programme — 9:00 p.m.\nSara’s pick: “Ocean World is my favourite because it is interesting.”`,
 audio:`Ali: Do you want to watch City Lights tonight?\nHawa: Maybe. Is it good?\nAli: I think it’s funny, but Ocean World is more interesting for me.\nHawa: Why?\nAli: Because I like programmes about nature.\nHawa: Okay. Let’s watch Ocean World.`,
 speakers:[{name:'Ali',gender:'male',voice:'onyx'},{name:'Hawa',gender:'female',voice:'coral'}],
 rq:[
  q('NS17R01','Which item is a film?',['City Lights','Ocean World','Live Music Hour'],'City Lights','reading:detail'),
  q('NS17R02','What time is Ocean World?',['8:30 p.m.','7:00 p.m.','9:00 p.m.'],'8:30 p.m.','reading:detail'),
  q('NS17R03','Which word describes City Lights?',['Funny','Boring','Expensive'],'Funny','reading:detail'),
  q('NS17R04','Why is Ocean World Sara’s favourite?',['Because it is interesting.','Because it is at 7:00.','Because it is a song.'],'Because it is interesting.','reading:reason')],
 lq:[
  q('NS17L01','What does Ali first suggest?',['City Lights','Live Music Hour','A football match'],'City Lights','listening:detail'),
  q('NS17L02','What does Ali think about City Lights?',['It is funny.','It is boring.','It is difficult.'],'It is funny.','listening:opinion'),
  q('NS17L03','Which programme does Ali prefer?',['Ocean World','City Lights','The news'],'Ocean World','listening:preference'),
  q('NS17L04','Why does he prefer it?',['Because he likes nature programmes.','Because it is cheaper.','Because it is shorter.'],'Because he likes nature programmes.','listening:reason')],
 writing:'Write a 30–50 word recommendation for a film, song, or programme. Name it, give your opinion, and add one simple reason using because.',
 performance:'Recommend one entertainment option, give a reason, respond to a different preference, and adapt when the first option is unavailable.',
 mediation:'Read two listings and recommend one that matches another person’s stated preference.',
 change:'Your first choice is unavailable. Recommend a different option and give a new reason.'
},
18:{
 situation:'You meet an international visitor at a community event. You exchange basic information about countries, languages, and places you have or want to visit.',
 foundation:'Combine identity, language, and place information in a reciprocal exchange with less scaffolding.',
 reading:`VISITOR PROFILES\nLina — Kenya — speaks Swahili and English — wants to visit Borama\nOmar — Somaliland — speaks Somali and English — wants to visit Nairobi\nRita — Ethiopia — speaks Amharic and English — wants to visit Hargeisa`,
 audio:`Lina: Hi. I’m Lina. I’m from Kenya. What country are you from?\nOmar: I’m from Somaliland. I speak Somali and English. What languages do you speak?\nLina: Swahili and English. I want to visit Borama this year.\nOmar: Nice. I want to visit Nairobi.`,
 speakers:[{name:'Lina',gender:'female',voice:'coral'},{name:'Omar',gender:'male',voice:'onyx'}],
 rq:[
  q('NS18R01','Who wants to visit Borama?',['Lina','Omar','Rita'],'Lina','reading:detail'),
  q('NS18R02','Which two people speak English and another listed language?',['All three people','Only Lina and Omar','Only Rita'],'All three people','reading:comparison'),
  q('NS18R03','Where does Omar want to visit?',['Nairobi','Borama','Hargeisa'],'Nairobi','reading:detail'),
  q('NS18R04','Who is from Ethiopia?',['Rita','Lina','Omar'],'Rita','reading:detail')],
 lq:[
  q('NS18L01','Where is Lina from?',['Kenya','Somaliland','Ethiopia'],'Kenya','listening:detail'),
  q('NS18L02','Which languages does Omar speak?',['Somali and English','Swahili and English','Amharic and English'],'Somali and English','listening:detail'),
  q('NS18L03','Where does Lina want to visit?',['Borama','Nairobi','Hargeisa'],'Borama','listening:detail'),
  q('NS18L04','Which question does Omar ask to continue the exchange?',['What languages do you speak?','How much is the ticket?','Where is the pharmacy?'],'What languages do you speak?','listening:interaction')],
 writing:'Write a 30–50 word international introduction. Say where you are from, which language(s) you speak, one place you want to visit, and one question for the reader.',
 performance:'Exchange country, language, and travel information with a visitor. Ask follow-up questions and adapt when the visitor changes the place they want to discuss.',
 mediation:'Compare two short visitor profiles and pass one relevant connection to your partner.',
 change:'The visitor changes the destination they want to discuss. Continue with the new place instead of repeating your prepared exchange.'
},
19:{
 situation:'You need to buy a practical item. The first size or colour is unavailable, so you ask for another option and complete the transaction.',
 foundation:'Combine price, size, colour, availability, payment, and receipt language in a multi-turn service exchange.',
 reading:`WORK SHOP\nBlue shirt — small / medium — $12\nWhite shirt — medium / large — $12\nBlack bag — small / large — $18\nToday: no blue shirts in large.\nReturns: keep your receipt.`,
 audio:`Customer: Do you have this shirt in large?\nAssistant: Not in blue. We have large in white.\nCustomer: Can I try the white one?\nAssistant: Of course.\nCustomer: It’s good. I’ll take it. Can I pay by card?\nAssistant: Yes. Please keep your receipt.`,
 speakers:[{name:'Customer',gender:'female',voice:'coral'},{name:'Assistant',gender:'male',voice:'onyx'}],
 rq:[
  q('NS19R01','Which blue shirt sizes are available?',['Small and medium','Medium and large','Large only'],'Small and medium','reading:availability'),
  q('NS19R02','Which colour has a large shirt?',['White','Blue','Black'],'White','reading:availability'),
  q('NS19R03','How much is a shirt?',['$12','$18','$20'],'$12','reading:price'),
  q('NS19R04','What should customers keep for returns?',['The receipt','The price label only','A bus ticket'],'The receipt','reading:instruction')],
 lq:[
  q('NS19L01','What size does the customer want?',['Large','Small','Medium'],'Large','listening:detail'),
  q('NS19L02','Why can’t the customer get the first choice?',['Large blue is unavailable.','The shop has no shirts.','Cards are unavailable.'],'Large blue is unavailable.','listening:constraint'),
  q('NS19L03','Which alternative does the assistant offer?',['Large white','Small blue','Large black bag'],'Large white','listening:alternative'),
  q('NS19L04','How does the customer pay?',['By card','Cash only','They do not buy it.'],'By card','listening:transaction')],
 writing:'Write a 30–50 word product enquiry. Ask for an item, size or colour, price or availability, and one payment or receipt question.',
 performance:'Complete a shopping transaction: ask about size/colour, respond when the first option is unavailable, choose an alternative, pay, and handle the receipt.',
 mediation:'Compare the product list with another person’s needs and tell them which available option fits.',
 change:'Your first size or colour is unavailable. Ask for a realistic alternative and complete the purchase.'
},
20:{
 situation:'You are explaining your home and daily routine to someone who will visit or share a task with you. The planned time changes.',
 foundation:'Connect home vocabulary, place language, and routine time into a short connected description.',
 reading:`MY HOME & MORNING — Hani\nI live in a small apartment. There is a kitchen next to the living room and one bedroom. I wake up at 6:30. I make tea in the kitchen, clean the room, and leave home at 7:30. On Friday, I wake up later.`,
 audio:`Yasin: What time do you usually wake up?\nHani: At six thirty. I make tea and clean the living room before work.\nYasin: Can I visit at seven tomorrow?\nHani: Seven is difficult. I leave home at seven thirty. Can you come at six forty-five?\nYasin: Yes, that works.`,
 speakers:[{name:'Yasin',gender:'male',voice:'onyx'},{name:'Hani',gender:'female',voice:'coral'}],
 rq:[
  q('NS20R01','What room is next to the living room?',['The kitchen','The bathroom','A second bedroom'],'The kitchen','reading:home'),
  q('NS20R02','What time does Hani wake up?',['6:30','7:30','6:00'],'6:30','reading:routine'),
  q('NS20R03','What does Hani do in the kitchen?',['Make tea','Exercise','Study'],'Make tea','reading:routine'),
  q('NS20R04','What changes on Friday?',['She wakes up later.','She moves home.','She does not make tea.'],'She wakes up later.','reading:change')],
 lq:[
  q('NS20L01','What does Hani do before work?',['Makes tea and cleans the living room','Goes to the gym','Visits Yasin'],'Makes tea and cleans the living room','listening:routine'),
  q('NS20L02','What time does Yasin first suggest?',['7:00','6:45','7:30'],'7:00','listening:time'),
  q('NS20L03','Why is seven difficult?',['Hani leaves at 7:30.','Hani wakes at 7:30.','Yasin is at work.'],'Hani leaves at 7:30.','listening:constraint'),
  q('NS20L04','What new time do they agree on?',['6:45','7:30','8:00'],'6:45','listening:decision')],
 writing:'Write a 30–50 word message about your home and routine. Mention one room, two routine actions, and one time.',
 performance:'Describe where one thing is in your home, explain a short routine, and adjust a meeting or task when the time changes.',
 mediation:'Use a home/routine note to tell another person one location, one routine, and one useful time.',
 change:'The planned time is no longer possible. Suggest another time that fits the routine you described.'
},
21:{
 situation:'You are arranging a weekend event with a friend. Your first suggested time does not work, so you must negotiate another time and finish with a clear agreement.',
 foundation:'Combine free/busy language, invitation, let’s, and going to in a goal-driven exchange.',
 reading:`WEEKEND CALENDAR\nFriday: Amal free after 6 p.m.; Yusuf busy all evening\nSaturday: Amal free 3–7 p.m.; Yusuf free after 5 p.m.\nSunday: Amal busy morning; Yusuf free 2–6 p.m.\nCommunity film: Saturday 6 p.m.`,
 audio:`Amal: Are you free Saturday afternoon?\nYusuf: Not at three. I’m free after five.\nAmal: The community film starts at six. Let’s meet at five thirty.\nYusuf: Yes, that works. Where are we going to meet?\nAmal: At the library entrance.\nYusuf: Great. See you there.`,
 speakers:[{name:'Amal',gender:'female',voice:'coral'},{name:'Yusuf',gender:'male',voice:'onyx'}],
 rq:[
  q('NS21R01','When are both Amal and Yusuf free on Saturday?',['After 5 p.m.','At 3 p.m.','Before noon'],'After 5 p.m.','reading:information-gap'),
  q('NS21R02','What time is the community film?',['6 p.m.','5 p.m.','7 p.m.'],'6 p.m.','reading:event'),
  q('NS21R03','Who is busy Friday evening?',['Yusuf','Amal','Both are free.'],'Yusuf','reading:availability'),
  q('NS21R04','Which day gives a clear shared window for the film?',['Saturday','Friday','Sunday morning'],'Saturday','reading:decision')],
 lq:[
  q('NS21L01','Why can’t Yusuf meet at three?',['He is not free then.','The film is finished.','He is travelling.'],'He is not free then.','listening:constraint'),
  q('NS21L02','What new meeting time does Amal suggest?',['5:30','3:00','6:30'],'5:30','listening:alternative'),
  q('NS21L03','Where will they meet?',['At the library entrance','At the bank','At the bus station'],'At the library entrance','listening:detail'),
  q('NS21L04','Do they reach a final agreement?',['Yes','No','The conversation stops before a decision.'],'Yes','listening:decision')],
 writing:'Write a 30–50 word invitation or planning message. Suggest an event, give a time and place, and offer one alternative if the first time does not work.',
 performance:'Invite someone, check availability, handle a rejected first time, suggest an alternative, agree on the final time and place, and close naturally.',
 mediation:'Compare two availability calendars and identify a shared time for the event.',
 change:'Your first time is rejected. Do not restart—offer an alternative and reach a final agreement.'
},
22:{
 situation:'You are helping a new English-speaking visitor during a community day. Across several short moments, you must understand information, respond, ask questions, write a useful message, and adapt when one detail changes.',
 foundation:'Integrate familiar A1 language from the whole course with low scaffolding and no new grammar or major vocabulary.',
 reading:`COMMUNITY DAY\nWelcome desk — Library entrance — 10:00 a.m.\nConversation table — Room 2 — 11:00 a.m.\nLunch — Garden — 1:00 p.m.\nCity walk — Main gate — 3:00 p.m.\nNote: If it rains, the city walk starts inside the library.`,
 audio:`Visitor: Hi. I’m new here. Is the conversation table in Room Two?\nVolunteer: Yes. It starts at eleven.\nVisitor: Great. And where is lunch?\nVolunteer: In the garden at one o’clock.\nVisitor: I also want to join the city walk.\nVolunteer: It starts at three at the main gate. But if it rains, meet inside the library.\nVisitor: Thank you. Can you remind me where the welcome desk is?\nVolunteer: At the library entrance.`,
 speakers:[{name:'Visitor',gender:'female',voice:'coral'},{name:'Volunteer',gender:'male',voice:'onyx'}],
 rq:[
  q('NS22R01','Where is the conversation table?',['Room 2','The garden','The main gate'],'Room 2','reading:detail'),
  q('NS22R02','What happens at 1:00 p.m.?',['Lunch','The city walk','The welcome desk opens'],'Lunch','reading:detail'),
  q('NS22R03','Where does the city walk normally start?',['Main gate','Room 2','Garden'],'Main gate','reading:detail'),
  q('NS22R04','What changes if it rains?',['The walk starts inside the library.','Lunch moves to the bank.','The conversation table closes.'],'The walk starts inside the library.','reading:adapt')],
 lq:[
  q('NS22L01','What does the visitor ask about first?',['The conversation table','Lunch','The city walk'],'The conversation table','listening:sequence'),
  q('NS22L02','What time is lunch?',['1:00 p.m.','11:00 a.m.','3:00 p.m.'],'1:00 p.m.','listening:detail'),
  q('NS22L03','What changed condition does the volunteer explain?',['Rain changes the city-walk meeting point.','The library is closed.','Lunch is cancelled.'],'Rain changes the city-walk meeting point.','listening:adapt'),
  q('NS22L04','Where is the welcome desk?',['At the library entrance','In Room 2','At the main gate'],'At the library entrance','listening:detail')],
 writing:'Write a 35–60 word welcome or help message for the visitor. Include at least three useful event details and one changed-condition instruction.',
 performance:'Complete an unscripted A1 mission: understand a short source, answer and ask questions, explain key information, make one practical suggestion, and adapt when a detail changes.',
 mediation:'Combine information from the schedule and conversation, then pass the essential details to someone who has not seen either source.',
 change:'One event detail changes. Update your message and conversation without losing the other correct information.'
}
};

function apply(){
 const book=window.A1_GOLD_V1_BOOK;
 if(!book||!Array.isArray(book.lessons)||book.lessons.length!==22)return false;
 for(const lesson of book.lessons){
  const x=S[Number(lesson.number)];if(!x)continue;
  lesson.northstarContentVersion=VERSION;
  lesson.realWorldSituation=x.situation;
  lesson.foundation=x.foundation;
  lesson.listening=lesson.listening||{};
  lesson.listening.readingText=x.reading;
  lesson.listening.audioScript=x.audio;
  lesson.listening.text=x.audio;
  lesson.listening.speakers=x.speakers||[];
  lesson.listening.questions=[...(x.rq||[]),...(x.lq||[])];
  lesson.writing={...(lesson.writing||{}),task:x.writing,realWorldSurface:(lesson.writing?.realWorldSurface||lesson.title.toLowerCase()+' message'),copyPasteDisabled:true};
  lesson.performance=x.performance;
  lesson.mediation=x.mediation;
  lesson.northstarChangedCondition=x.change;
  lesson.northstarScenario={context:x.situation,changedCondition:x.change};
  lesson.northstarEvidence={
   reading:['purpose','explicit detail','useful response'],
   listening:['key detail','speaker need','appropriate response'],
   speaking:['task achievement','comprehensibility','reciprocity','adaptation'],
   writing:['task achievement','clarity','A1 language control','useful detail'],
   conversation:['responds','adds information','asks','adapts']
  };
  lesson.northstarAdaptive={
   strong:['remove model after first success','ask one new follow-up','apply changed condition'],
   developing:['keep one sentence starter','allow one replay','prompt one relevant question'],
   struggling:['simplify instruction','show one model','reduce choice set','retry same communication goal'],
   repeatedError:'Capture → focused help → retry → later retrieval.'
  };
 }
 book.northstarContent={version:VERSION,lessonCount:22,principle:'B2-quality communicative design at A1 language load',frozenProgressionPreserved:true};
 window.ENGLISHGATE_A1_NORTHSTAR_CONTENT=S;
 return true;
}
function boot(){if(!apply())setTimeout(boot,100)}
boot();
})();
