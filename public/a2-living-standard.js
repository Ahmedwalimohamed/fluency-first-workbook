(function(){
'use strict';

const A2_VERSION='a2-living-standard-v1';
const ORIGINAL_SOURCE_OVERRIDES={
 'Getting Acquainted':{
  v:[['hobby','an activity you enjoy in your free time'],['hometown','the town or city you come from'],['occupation','your job or type of work'],['outgoing','friendly and comfortable meeting people'],['married','having a husband or wife'],['single','not married']]
 }
};
function sourceData(title){
 const base=TOPIC_LIBRARY[title],override=ORIGINAL_SOURCE_OVERRIDES[title];
 return override?{...base,...override}:base;
}
function capFirst(value){const x=String(value||'').trim();return x?x.charAt(0).toUpperCase()+x.slice(1):x}
const META={
'Getting Acquainted':{
 outcome:'Introduce yourself, give key personal information, and keep a short conversation going with simple follow-up questions.',
 foundation:'Recycle be, have, like, hometown, job, and hobby language from the original A2 course.',
 lift:'Move from isolated personal facts to a short connected introduction with a reaction and a follow-up question.',
 performance:'Have a two-minute first-meeting conversation, then introduce your partner to another classmate.',
 pronunciation:'Stress the important words in short personal-information sentences and questions.',
 mediation:'Listen to a partner and accurately relay three basic facts about that person.',
 functions:['introduce yourself','ask for personal information','show interest'],
 discourse:['link facts with and/but/because','take short turns','ask a follow-up question'],
 chunks:['Nice to meet you.','I come from ...','In my free time, I ...','How about you?'],
 interaction:['Really?','That sounds interesting.','What do you do?'],
 task:'You have joined a new English class WhatsApp group. Write 50–60 words introducing yourself. Include where you are from, what you do, one hobby, and one friendly question.',
 extra:'A good introduction does not need to be long. Amina learns that one or two details can give another person something to respond to. She also notices that asking a simple question makes the conversation feel more natural.'
},
'Work & Careers':{
 outcome:'Describe your usual work or study routine and explain what you are working on now.',
 foundation:'Reuse familiar job, colleague, deadline, shift, responsibility, and priority language.',
 lift:'Contrast regular routines with a temporary task happening around now.',
 performance:'Give a short work update: usual responsibilities, today’s priority, and one current task.',
 pronunciation:'Use clear sentence stress to contrast usually with today/right now.',
 mediation:'Listen to a classmate’s work update and tell the group their main responsibility and current priority.',
 functions:['describe routines','give a current update','ask for clarification'],
 discourse:['usually vs now','sequence a short update','add one reason'],
 chunks:['meet a deadline','work with a colleague','my main responsibility','right now'],
 interaction:['What are you working on now?','What do you usually do?','Do you need any help?'],
 task:'Write a 55–65 word message to a classmate about your work or studies. Explain what you usually do and what you are working on this week.',
 extra:'Hodan discovers that a clear update should separate routine work from the task that needs attention now. This helps her colleague understand what is normal and what has changed this week.'
},
'Travel & Adventure':{
 outcome:'Tell a simple travel story in the past and explain what happened when a plan changed.',
 foundation:'Recycle journey, destination, reservation, delay, explore, and memorable from the original A2 travel lesson.',
 lift:'Connect past events in a clear order using first, then, after that, and finally.',
 performance:'Tell a partner about a past trip, including one problem and how you solved it.',
 pronunciation:'Use pauses between story stages so the sequence is easy to follow.',
 mediation:'Listen to a travel story and retell the main events in the correct order.',
 functions:['narrate past events','describe a problem','explain a solution'],
 discourse:['first/then/finally','past-event sequence','problem → action → result'],
 chunks:['make a reservation','miss a bus','change the plan','arrive at the destination'],
 interaction:['What happened next?','How did you solve it?','Was the trip memorable?'],
 task:'Write 55–70 words about a trip you took. Say where you went, what happened, one problem you had, and how the trip ended.',
 extra:'Yusuf’s trip is still enjoyable even though the bus is late. He learns that a delay does not have to ruin the whole journey when people check their options and change the plan calmly.'
},
'Technology & Social Media':{
 outcome:'Describe digital habits and explain how often you use technology for different purposes.',
 foundation:'Reuse device, privacy, notification, upload, screen time, and reliable.',
 lift:'Use frequency language to describe useful habits and habits you want to change.',
 performance:'Compare your normal phone habits with one healthier or more useful digital habit.',
 pronunciation:'Stress frequency words such as always, usually, often, sometimes, and never.',
 mediation:'Summarise a partner’s main digital habit and one change they want to make.',
 functions:['describe frequency','give a simple reason','suggest a change'],
 discourse:['frequency + routine','because for reasons','one habit vs another'],
 chunks:['check notifications','protect my privacy','upload a file','reduce screen time'],
 interaction:['How often do you ...?','Why do you use it?','Would you change anything?'],
 task:'Write a 55–70 word post about your technology habits. Say how often you use your phone or computer, what you use it for, and one habit you want to improve.',
 extra:'Rahma notices that her phone is useful but also distracting. She decides to control notifications instead of checking every alert immediately. The change gives her more time to concentrate on her assignment.'
},
'Health & Wellbeing':{
 outcome:'Describe a simple health or wellbeing problem and give practical advice.',
 foundation:'Recycle symptom, stress, balanced, rest, habit, and recover.',
 lift:'Use should and should not to give clear, realistic advice with a reason.',
 performance:'Listen to a classmate’s everyday wellbeing problem and give two useful suggestions.',
 pronunciation:'Use a calm falling tone for advice and stress the action after should.',
 mediation:'Relay a partner’s problem and the advice they received without adding new medical claims.',
 functions:['describe a problem','give advice','respond to advice'],
 discourse:['problem → advice','because for reasons','two-step recommendation'],
 chunks:['get enough rest','feel stressed','healthy habit','recover well'],
 interaction:['You should ...','Maybe you should ...','That sounds helpful.'],
 task:'A friend says they are tired and stressed. Write a 55–70 word WhatsApp message giving two practical pieces of advice and explaining why they may help.',
 extra:'Abdi does not try to change everything at once. He chooses two realistic habits: more rest and a better daily routine. After several days, he notices that his concentration is improving.'
},
'Food & Culture':{
 outcome:'Compare foods or eating traditions and describe what makes one option different.',
 foundation:'Recycle ingredient, recipe, traditional, flavour, portion, and hospitality.',
 lift:'Use comparative and superlative forms to compare food, preparation, cost, or taste.',
 performance:'Compare two dishes and recommend one to a visitor with two reasons.',
 pronunciation:'Stress the changing part in comparative forms such as cheaper, healthier, and more traditional.',
 mediation:'Listen to two food preferences and explain the main difference to another learner.',
 functions:['compare options','describe food','make a recommendation'],
 discourse:['comparison language','reason + example','recommendation ending'],
 chunks:['traditional dish','main ingredient','strong flavour','small portion'],
 interaction:['Which one do you prefer?','It is more ... than ...','I would recommend ...'],
 task:'Write 60–75 words comparing two foods or dishes you know. Say which is cheaper, healthier, tastier, or more traditional, and explain which one you prefer.',
 extra:'Sahra cannot find one ingredient, so she changes the recipe carefully. The final dish keeps its main flavour, and the guests enjoy both the food and the family’s hospitality.'
},
'Education & Learning':{
 outcome:'Describe what happened during a study session and explain an interruption or change.',
 foundation:'Recycle assignment, feedback, revise, progress, strategy, and concentrate.',
 lift:'Contrast a longer background action with a shorter past event.',
 performance:'Tell a partner about a study problem and the strategy that helped you improve.',
 pronunciation:'Use a slight pause before when/while clauses so the two past actions are clear.',
 mediation:'Retell a partner’s study experience, including the problem, strategy, and result.',
 functions:['describe study actions','explain an interruption','share a strategy'],
 discourse:['while/when contrast','problem → strategy → result','short reflection'],
 chunks:['revise for an exam','get feedback','make progress','concentrate on'],
 interaction:['What were you doing when ...?','What strategy helped?','Did it improve?'],
 task:'Write 60–75 words about a time you were studying or doing an assignment when something happened. Explain the situation, the interruption, and what you did next.',
 extra:'Maryan used to study for many hours without a clear plan. During one revision session, she realised that she was reading the same notes again and again. She changed her strategy and started using shorter practice sessions with feedback.'
},
'Money & Business':{
 outcome:'Talk about future money or business plans using going to.',
 foundation:'Recycle budget, profit, expense, customer, invest, and afford.',
 lift:'Connect a future plan to a reason or expected result.',
 performance:'Explain one simple personal or business spending plan for next month.',
 pronunciation:'Use natural contractions in going to statements while keeping the key plan word clear.',
 mediation:'Listen to a simple budget plan and report the two most important planned actions.',
 functions:['state a plan','give a reason','talk about spending priorities'],
 discourse:['plan + reason','first/next','expected result'],
 chunks:['make a budget','control expenses','invest in','can afford'],
 interaction:['What are you going to do?','Why are you planning that?','What is your priority?'],
 task:'Write a 60–75 word plan for next month. Explain what you are going to spend money on, what you are going to save for, and one thing you are not going to buy.',
 extra:'Khalid’s small business is selling more, but expenses are also rising. He makes a budget before the new month begins so he can protect essential costs and still keep enough cash for daily operations.'
},
'Environment & Climate':{
 outcome:'Explain simple environmental rules and responsibilities using have to and do not have to.',
 foundation:'Recycle waste, recycle, pollution, conserve, climate, and resource.',
 lift:'Distinguish between something that is necessary and something that is optional.',
 performance:'Explain three simple environmental rules for a school, home, or community.',
 pronunciation:'Stress have to when an obligation is important and reduce it naturally in connected speech.',
 mediation:'Listen to community rules and explain which actions are required and which are optional.',
 functions:['state an obligation','state no obligation','explain a rule'],
 discourse:['rule + reason','required vs optional','simple consequence'],
 chunks:['reduce waste','recycle plastic','conserve water','natural resource'],
 interaction:['Do we have to ...?','You do not have to ...','Why is that necessary?'],
 task:'Write 60–75 words explaining environmental rules for your home, school, or community. Include two things people have to do and one thing they do not have to do.',
 extra:'At the community meeting, Nimo learns that small rules are easier to follow when people understand the reason for them. The group chooses simple actions that families can practise every day.'
},
'Relationships & Family':{
 outcome:'Describe people, places, and things using simple relative clauses.',
 foundation:'Recycle relative, supportive, generation, relationship, respect, and dependable.',
 lift:'Add useful identifying information with who, that, and where.',
 performance:'Describe two people in your life and explain why they are important to you.',
 pronunciation:'Pause naturally before extra information so relative clauses remain easy to follow.',
 mediation:'Listen to a partner describe a relative and introduce that person to the class using one relative clause.',
 functions:['describe a person','identify a place or thing','explain a relationship'],
 discourse:['noun + relative clause','detail + reason','connected description'],
 chunks:['supportive relative','different generation','show respect','dependable person'],
 interaction:['Who is someone who ...?','Is that the place where ...?','Why is this person important?'],
 task:'Write 60–75 words about a relative or friend who is important to you. Describe the person, what they do, and one reason you respect or depend on them.',
 extra:'Fadumo’s family discussion improves when everyone gets time to explain one reason before other people reply. The change does not remove every disagreement, but it helps different generations listen with more respect.'
},
'Media & News':{
 outcome:'Talk about what you can and could do when checking news and information.',
 foundation:'Recycle headline, source, report, claim, bias, and verify.',
 lift:'Use can/could for present ability, past ability, possibility, and polite requests.',
 performance:'Explain how you check a simple online story before sharing it.',
 pronunciation:'Use rising intonation for polite Could you ...? requests and clear stress on key information.',
 mediation:'Read or hear a short claim and explain to a partner what should be checked before sharing it.',
 functions:['describe ability','make a polite request','discuss possibility'],
 discourse:['claim → check → conclusion','ability now vs past','simple caution'],
 chunks:['check a source','read a headline','verify a claim','possible bias'],
 interaction:['Could you show me the source?','Can you verify it?','It could be misleading.'],
 task:'Write a 60–75 word message explaining how you check online news. Include what you can do now and one thing you could not do as confidently before.',
 extra:'Omar compares the original source with several headlines. He finds that one popular post has removed important context. The experience reminds him that a strong headline is not the same as reliable evidence.'
},
'Sports & Fitness':{
 outcome:'Compare fitness routines and describe how an activity is done using as ... as and adverbs.',
 foundation:'Recycle stamina, routine, stretch, pace, recover, and consistent.',
 lift:'Compare two routines fairly and describe actions with simple adverbs.',
 performance:'Compare two ways of exercising and recommend one for a beginner.',
 pronunciation:'Keep as ... as phrases in one thought group and stress the comparison word.',
 mediation:'Listen to two exercise routines and explain one similarity and one difference.',
 functions:['compare routines','describe how an action happens','give a recommendation'],
 discourse:['similarity + difference','manner description','recommendation + reason'],
 chunks:['keep a steady pace','follow a routine','recover slowly','train consistently'],
 interaction:['Is it as difficult as ...?','How often do you train?','Which routine works better for you?'],
 task:'Write 60–75 words comparing two exercise routines or sports. Say how often people do them, how difficult they are, and which one you prefer.',
 extra:'Anisa begins by training too quickly, so she becomes tired before she can complete longer sessions. She slows her pace, stretches carefully, and follows a more consistent routine.'
},
'City vs Countryside':{
 outcome:'Compare city and countryside life using common quantifiers.',
 foundation:'Recycle crowded, convenient, peaceful, commute, facility, and traffic.',
 lift:'Use many, much, a few, a little, fewer, and less with the correct noun type.',
 performance:'Compare two places to live and choose one based on three practical factors.',
 pronunciation:'Link quantifiers smoothly to the noun and stress the amount contrast.',
 mediation:'Summarise a partner’s reasons for preferring the city or countryside.',
 functions:['talk about quantity','compare places','state a preference'],
 discourse:['factor-by-factor comparison','quantity + noun','preference + reasons'],
 chunks:['heavy traffic','public facilities','long commute','peaceful area'],
 interaction:['Is there much traffic?','Are there many facilities?','Which place would you choose?'],
 task:'Write 60–80 words comparing city and countryside life. Mention traffic, facilities, noise, or free time and explain where you would prefer to live.',
 extra:'Hassan compares more than one factor before choosing where to live. He likes the convenience of the city, but he also values less traffic and a more peaceful environment.'
},
'Dreams & Ambitions':{
 outcome:'Talk politely about things you would like to do and goals you want to achieve.',
 foundation:'Recycle ambition, goal, achieve, opportunity, plan, and motivation.',
 lift:'Use would like to for polite wishes and want to for direct personal goals.',
 performance:'Explain one short-term goal and one longer-term ambition with a practical next step.',
 pronunciation:'Use the contraction I’d like naturally and stress the main goal word.',
 mediation:'Listen to a partner’s goal and explain their next step to another learner.',
 functions:['state a goal','express a wish','describe a next step'],
 discourse:['goal → reason → next step','short-term vs long-term','motivation statement'],
 chunks:['achieve a goal','good opportunity','make a plan','stay motivated'],
 interaction:['What would you like to do?','What do you want to achieve?','What is your next step?'],
 task:'Write 60–80 words about one goal you want to achieve. Explain why it matters, what you would like to do, and the first step in your plan.',
 extra:'A clear ambition becomes more useful when it is connected to a small next step. The learner in this lesson moves from a general dream to a simple plan that can begin this month.'
},
'Crime & Justice':{
 outcome:'Talk about recent experiences and results using the present perfect.',
 foundation:'Recycle evidence, witness, law, investigate, court, and fair.',
 lift:'Use have/has + past participle for recent events and experiences connected to now.',
 performance:'Give a short update about what has happened in a simple incident or investigation scenario.',
 pronunciation:'Use natural contractions such as has not/haven’t while keeping the past participle clear.',
 mediation:'Listen to an incident update and report what has happened so far.',
 functions:['report a recent event','ask about experience','state a present result'],
 discourse:['event → present result','already/yet','experience question'],
 chunks:['collect evidence','speak to a witness','follow the law','fair decision'],
 interaction:['What has happened?','Have they found any evidence?','They have not finished yet.'],
 task:'Write a 65–80 word update about a simple incident or problem. Explain what has happened, what people have already done, and what has not happened yet.',
 extra:'The people involved do not have every answer yet. They focus on the evidence they have collected, the witnesses they have spoken to, and the steps that still need to happen.'
},
'Science & Innovation':{
 outcome:'Choose between the present perfect and past simple when discussing discoveries and experiences.',
 foundation:'Recycle research, experiment, innovation, develop, theory, and discovery.',
 lift:'Use the present perfect for experience or a present result and the past simple for a finished past time.',
 performance:'Describe one invention, experiment, or discovery and say when a key event happened.',
 pronunciation:'Make time expressions such as last year, since, and already easy to hear.',
 mediation:'Listen to a short science update and separate what happened at a finished time from what has changed now.',
 functions:['describe experience','give a finished-time fact','report a result'],
 discourse:['past event vs present result','time marker contrast','short explanation'],
 chunks:['do research','carry out an experiment','develop a product','make a discovery'],
 interaction:['Have you ever ...?','When did that happen?','What has changed since then?'],
 task:'Write 65–80 words about an invention, experiment, or discovery. Use the present perfect for experience/result and the past simple for at least one finished event.',
 extra:'A useful science story often includes both a finished event and a result that matters now. Learners practise noticing the time expression before choosing the tense.'
},
'Arts & Entertainment':{
 outcome:'Talk about a realistic future possibility using the first conditional.',
 foundation:'Recycle performance, audience, creative, review, character, and plot.',
 lift:'Connect a possible future condition with a likely result.',
 performance:'Discuss a plan for an event, film night, or performance and explain what you will do if something changes.',
 pronunciation:'Pause lightly after an if-clause when it comes first.',
 mediation:'Listen to an event plan and explain what will happen if one condition changes.',
 functions:['state a future condition','predict a result','make a simple plan'],
 discourse:['if → result','plan + alternative','likely future consequence'],
 chunks:['live performance','large audience','positive review','main character'],
 interaction:['What will you do if ...?','If that happens, we will ...','Do you think it will work?'],
 task:'Write 65–80 words about a future event or entertainment plan. Include two first conditional sentences explaining what you will do if something changes.',
 extra:'Plans are easier to manage when people think about likely problems before the event starts. A simple if-sentence helps the team connect a possible situation to a practical response.'
},
'Global Issues':{
 outcome:'Describe common processes and actions using the present simple passive.',
 foundation:'Recycle poverty, access, conflict, aid, inequality, and sustainable.',
 lift:'Use be + past participle when the action or result is more important than the person doing it.',
 performance:'Explain how aid, information, or resources are provided in a simple community example.',
 pronunciation:'Stress the main content word in passive sentences rather than the form of be.',
 mediation:'Read a short process and explain the key steps to another learner without focusing on the actor.',
 functions:['describe a process','focus on a result','explain a community action'],
 discourse:['process sequence','passive description','cause + response'],
 chunks:['access to education','emergency aid','reduce inequality','sustainable development'],
 interaction:['How is help provided?','Where is the information shared?','Why is this needed?'],
 task:'Write 65–80 words explaining how a service, aid programme, or community process works. Use at least two present simple passive sentences.',
 extra:'In many global issues, the result is more important than the name of the person who performs every action. This makes the passive useful when describing how support or resources are provided.'
},
'Free Time & Hobbies':{
 outcome:'Talk about hobbies using common gerund and infinitive patterns.',
 foundation:'Recycle leisure, collect, relaxing, skill, join, and creative hobby language.',
 lift:'Use -ing after enjoy/avoid/keep and to + infinitive after want/plan/decide.',
 performance:'Describe a hobby, why you enjoy it, and one new activity you plan to try.',
 pronunciation:'Keep verb + -ing and verb + to combinations together as one phrase.',
 mediation:'Listen to a partner’s hobby plan and explain what they enjoy doing and what they want to try.',
 functions:['describe enjoyment','state an intention','talk about a skill'],
 discourse:['enjoyment + reason','current hobby → future plan','example detail'],
 chunks:['spend leisure time','enjoy doing','want to learn','join a club'],
 interaction:['What do you enjoy doing?','Would you like to try ...?','How did you learn that skill?'],
 task:'Write 65–80 words about your free time. Explain what you enjoy doing, what you avoid doing, and one hobby or skill you want to learn.',
 extra:'A hobby can be relaxing, social, creative, or practical. The lesson focuses on the verb pattern that comes after expressions such as enjoy, want, plan, and decide.'
},
'Cultural Identity':{
 outcome:'Report simple statements about culture, traditions, or identity.',
 foundation:'Recycle identity, tradition, heritage, belong, custom, and preserve.',
 lift:'Change pronouns and basic tense/time references when reporting what another person said.',
 performance:'Interview a partner about one tradition and report two of their answers to the class.',
 pronunciation:'Use a clear pause after said/told before the reported message.',
 mediation:'Listen to a partner’s cultural experience and relay it accurately in reported speech.',
 functions:['report information','describe a tradition','relay another person’s view'],
 discourse:['speaker → reported message','one fact + one opinion','source attribution'],
 chunks:['cultural identity','family tradition','local heritage','preserve a custom'],
 interaction:['She said that ...','He told me that ...','What did they say about ...?'],
 task:'Interview someone about a tradition or custom. Then write 65–80 words reporting what the person said. Include at least two examples of reported speech.',
 extra:'Cultural identity can be connected to language, food, family traditions, places, and shared customs. Reporting another person’s words carefully is also a simple form of mediation.'
},
'Making Decisions':{
 outcome:'Discuss an imaginary choice using the second conditional.',
 foundation:'Recycle option, consequence, consider, compare, decide, and reflect.',
 lift:'Use if + past form and would + verb for unlikely or imaginary situations.',
 performance:'Compare two choices and explain what you would do in an imaginary situation.',
 pronunciation:'Use a short pause between the if-clause and the result when speaking slowly.',
 mediation:'Listen to a partner’s hypothetical choice and accurately explain their reason to another learner.',
 functions:['discuss an imaginary choice','give a reason','compare consequences'],
 discourse:['if-condition → imagined result','option A vs B','decision + reason'],
 chunks:['consider an option','possible consequence','compare choices','make a decision'],
 interaction:['What would you do if ...?','If I were you, I would ...','Why would you choose that?'],
 task:'Write 65–85 words about an imaginary decision. Explain what you would do if you had two options and give at least two reasons for your choice.',
 extra:'Imaginary choices give learners a safe way to practise decision language. The important part is not choosing the “correct” option; it is explaining the consequence and the reason clearly.'
},
'Looking Back, Looking Forward':{
 outcome:'Review key A2 language, reflect on progress, and describe a realistic next English goal.',
 foundation:'Recycle the most useful language from the A2 course instead of introducing a new isolated grammar point.',
 lift:'Choose the tense or structure that matches the meaning: routine, past event, experience, plan, advice, or condition.',
 performance:'Give a short A2 progress reflection and a practical 30-day English plan.',
 pronunciation:'Use clear stress, pausing, and question intonation across a short prepared reflection.',
 mediation:'Listen to a partner’s progress reflection and summarise one achievement and one next goal.',
 functions:['reflect on progress','describe an achievement','state a future goal'],
 discourse:['past → present → future','achievement + evidence','goal + next step'],
 chunks:['make progress','feel more confident','next learning goal','keep practising'],
 interaction:['What has improved?','What are you going to practise next?','What helped you most?'],
 task:'Write 70–90 words about your English progress. Say what you can do better now, one challenge you still have, and what you are going to practise during the next month.',
 extra:'The final A2 lesson is a practical review. Learners use familiar grammar and vocabulary to look back at real progress and look forward to one clear next step rather than completing a disconnected grammar test.'
}
};

function q(q,options,answer,tag){return{q,options,answer,tag}}
function ruleFor(focus){
 const f=focus.toLowerCase();
 if(f.includes('present simple vs present continuous'))return'Use the present simple for routines and stable facts; use the present continuous for actions happening now or temporary situations.';
 if(f.includes('past simple vs past continuous'))return'Use the past continuous for a longer background action and the past simple for the shorter event that happened during it.';
 if(f==='past simple'||f.includes('past simple review'))return'Use the past simple for completed actions at a finished past time.';
 if(f.includes('frequency'))return'Use frequency adverbs with the present simple. Most go before the main verb but after be.';
 if(f.includes('should'))return'Use should/shouldn’t + base verb to give advice.';
 if(f.includes('comparatives and superlatives'))return'Use comparative forms to compare two things and superlative forms for the highest or lowest in a group.';
 if(f.includes('going to'))return'Use be going to + base verb for plans and intentions.';
 if(f.includes('have to'))return'Use have to for something necessary and don’t have to for something that is not necessary.';
 if(f.includes('relative'))return'Use who for people, that/which for things, and where for places.';
 if(f.includes('can / could'))return'Use can for present ability or possibility and could for past ability, possibility, or polite requests.';
 if(f.includes('as...as'))return'Use as + adjective/adverb + as to show equality and adverbs to describe how an action happens.';
 if(f.includes('quantifier'))return'Use many/a few/fewer with countable nouns and much/a little/less with uncountable nouns.';
 if(f.includes('would like'))return'Use would like to + base verb for a polite wish and want to + base verb for a direct goal.';
 if(f==='present perfect')return'Use have/has + past participle for experience or a recent event connected to now.';
 if(f.includes('present perfect vs past simple'))return'Use the present perfect when no finished past time is given; use the past simple with a finished past time.';
 if(f.includes('first conditional'))return'Use if + present simple, will + base verb for a realistic future possibility.';
 if(f.includes('present simple passive'))return'Use am/is/are + past participle when the action or process is more important than the person doing it.';
 if(f.includes('gerunds'))return'Use -ing after verbs such as enjoy/avoid/keep and to + infinitive after verbs such as want/plan/decide.';
 if(f.includes('reported'))return'Use reported speech to tell another person what someone said; change pronouns and time references when needed.';
 if(f.includes('second conditional'))return'Use if + past form, would + base verb for an imaginary or unlikely situation.';
 if(f.includes('mixed review'))return'Choose the grammar form that matches the intended time and meaning.';
 return'Use the present simple with be, have, and like to give personal facts, describe possessions, and express preferences.';
}
function grammarItems(focus){
 const f=focus.toLowerCase();
 if(f.includes('present simple vs present continuous'))return[
  q('Muna usually works in the office, but today she ___ from home.',['works','is working','worked'],'is working','grammar:contrast'),
  q('Which sentence describes a regular work routine?',['I check my email every morning.','I am checking my email right now.','I checked my email before breakfast yesterday.'],'I check my email every morning.','grammar:routine'),
  q('Which sentence describes something happening now?',['The team is meeting a client now.','The team meets this client every Monday.','The team met the client yesterday.'],'The team is meeting a client now.','grammar:now'),
  q('This week is different from normal. Which sentence fits?',['He is preparing a special report this week.','He prepares the monthly report on the first Monday.','He prepared a similar report last month.'],'He is preparing a special report this week.','grammar:temporary'),
  q('Which sentence clearly contrasts a routine with a temporary change?',['I usually teach in the morning, but this week I am teaching in the evening.','I teach in the morning and my colleague teaches in the evening.','I taught in the morning last term, but now I work in an office.'],'I usually teach in the morning, but this week I am teaching in the evening.','grammar:contrast'),
  q('Which question asks about a regular routine after class?',['What do you usually do after class?','What are you doing right now?','What did you do after class yesterday?'],'What do you usually do after class?','grammar:question')
 ];
 if(f==='past simple')return[
  q('The trip happened yesterday. Which sentence is correct?',['Yusuf took the bus to Berbera.','Yusuf takes the bus to Berbera every Friday.','Yusuf has taken that bus many times.'],'Yusuf took the bus to Berbera.','grammar:past'),
  q('The reservation was for yesterday. Which negative sentence fits that finished time?',['We did not miss the reservation.','We have not missed any reservations this year.','We do not usually miss reservations.'],'We did not miss the reservation.','grammar:negative'),
  q('Which question asks about a finished trip last weekend?',['Did you enjoy the trip last weekend?','Have you ever enjoyed a trip like that?','Do you enjoy weekend trips?'],'Did you enjoy the trip last weekend?','grammar:question'),
  q('The bus was late on Saturday. Which sentence reports that event?',['The bus left late, so we changed our plan.','The bus usually leaves at seven.','The bus has already left today.'],'The bus left late, so we changed our plan.','grammar:sequence'),
  q('Which sentence uses a clearly finished past time?',['I visited Hargeisa last month.','I have visited Hargeisa several times.','I visit Hargeisa when I have time.'],'I visited Hargeisa last month.','grammar:time'),
  q('You are telling the next event in a past story. Which sentence fits?',['After we arrived at the hotel, we called our family.','After we arrive at the hotel, we usually call our family.','We have arrived at the hotel, so you can call us now.'],'After we arrived at the hotel, we called our family.','grammar:sequence')
 ];
 if(f.includes('frequency'))return[
  q('Rahma does this on most study days. Which sentence fits?',['Rahma usually turns off notifications when she studies.','Rahma is turning off notifications right now.','Rahma turned off notifications yesterday.'],'Rahma usually turns off notifications when she studies.','grammar:frequency'),
  q('Which sentence uses often to describe a regular habit?',['I often use my phone for study.','I am using my phone for study at the moment.','I used my phone for study last night.'],'I often use my phone for study.','grammar:word-order'),
  q('She arrives on time almost every day. Which statement matches that frequency?',['She is rarely late for the online class.','She is always late for the online class.','She is sometimes late, about half the time.'],'She is rarely late for the online class.','grammar:meaning'),
  q('Which question asks about frequency?',['How often do you check social media?','Are you checking social media now?','When did you check social media yesterday?'],'How often do you check social media?','grammar:question'),
  q('Which sentence places a frequency adverb naturally with be?',['He is usually careful with privacy settings.','He is careful with privacy settings at this moment.','He was careful with privacy settings yesterday.'],'He is usually careful with privacy settings.','grammar:be'),
  q('Which sentence means the action happens every time?',['I always check the source.','I sometimes check the source.','I rarely check the source.'],'I always check the source.','grammar:meaning')
 ];
 if(f.includes('should'))return[
  q('A friend feels very tired after several busy days. Which sentence gives advice?',['You should get some rest.','You have to show your ID at reception.','You could run five kilometres yesterday.'],'You should get some rest.','grammar:advice'),
  q('Which sentence gives practical advice for a hot day?',['You should drink more water.','You must submit the form before noon.','You do not have to bring a notebook.'],'You should drink more water.','grammar:function'),
  q('A friend is stressed because they work all night. Which advice tells them what not to do?',['You should not work all night.','You should take a short walk after work.','You should speak to someone you trust.'],'You should not work all night.','grammar:negative'),
  q('You want advice from your teacher. Which question is best?',['Should I talk to my teacher about the problem?','Do I have to submit the task today?','Could I use your phone for a minute?'],'Should I talk to my teacher about the problem?','grammar:question'),
  q('Which sentence is advice rather than a compulsory rule?',['You should take a short break.','Passengers must wear a seat belt.','Visitors have to show their passport.'],'You should take a short break.','grammar:function'),
  q('Which sentence uses should + base verb correctly?',['He should try a more balanced routine.','He tries a more balanced routine every week.','He is trying a more balanced routine this month.'],'He should try a more balanced routine.','grammar:form')
 ];
 if(f.includes('comparatives and superlatives'))return[
  q('You are comparing two dishes. Which sentence makes that comparison?',['This dish is spicier than the other one.','This is the spiciest dish on the menu.','This dish is very spicy.'],'This dish is spicier than the other one.','grammar:comparative'),
  q('Which sentence correctly compares the price of two foods?',['Rice is cheaper than grilled fish here.','Rice is the cheapest item on the whole menu.','Rice is cheap at this restaurant.'],'Rice is cheaper than grilled fish here.','grammar:comparative'),
  q('You are talking about every dish on the menu. Which sentence identifies number one for popularity?',['This is the most popular dish on the menu.','This dish is more popular than the soup.','This dish is quite popular.'],'This is the most popular dish on the menu.','grammar:superlative'),
  q('Which sentence compares the size of two portions?',['This portion is bigger than mine.','This is the biggest portion in the restaurant.','This portion is very big.'],'This portion is bigger than mine.','grammar:comparative'),
  q('You compare three restaurants. Which sentence identifies the lowest price?',['This one is the cheapest.','This one is cheaper than the café next door.','This one is quite cheap.'],'This one is the cheapest.','grammar:superlative'),
  q('Which sentence means the tea has a smaller amount of sweetness than the juice?',['Traditional tea is less sweet than this juice.','Traditional tea is sweeter than this juice.','Traditional tea is the sweetest drink here.'],'Traditional tea is less sweet than this juice.','grammar:comparison')
 ];
 if(f.includes('past simple vs past continuous'))return[
  q('Her phone rang in the middle of a longer study action. Which sentence fits?',['Maryan was studying when her phone rang.','Maryan studied every evening last term.','Maryan has studied the chapter already.'],'Maryan was studying when her phone rang.','grammar:background'),
  q('Which sentence shows a short event interrupting a longer action?',['While I was revising, my friend called me.','I revised with my friend every weekend.','I have revised the chapter with my friend.'],'While I was revising, my friend called me.','grammar:interruption'),
  q('Which sentence clearly shows background action + interruption?',['We were working when the internet stopped.','We worked online every Tuesday last year.','We have worked online since January.'],'We were working when the internet stopped.','grammar:contrast'),
  q('Which question asks about an action in progress when the teacher arrived?',['What were you doing when the teacher arrived?','What did you do after the teacher arrived?','What have you done since the teacher arrived?'],'What were you doing when the teacher arrived?','grammar:question'),
  q('The fire alarm started during a longer action. Which sentence fits?',['The students were reading quietly when the fire alarm started.','The students read quietly every morning.','The students have read the safety notice.'],'The students were reading quietly when the fire alarm started.','grammar:background'),
  q('In “I was writing when the lights went out,” which event is the shorter interruption?',['The lights went out.','I was writing.','Both actions were regular habits.'],'The lights went out.','grammar:meaning')
 ];
 if(f.includes('going to'))return[
  q('Khalid has already decided his plan for next month. Which sentence fits?',['Khalid is going to make a new budget next month.','Khalid makes a budget at the start of every month.','Khalid made a budget last month.'],'Khalid is going to make a new budget next month.','grammar:plan'),
  q('Which sentence describes a future intention to save money?',['We are going to save more money this year.','We save a little money every month.','We saved more money last year.'],'We are going to save more money this year.','grammar:plan'),
  q('Which question asks about the first action in someone’s future plan?',['What are you going to buy first?','What do you usually buy first?','What did you buy first yesterday?'],'What are you going to buy first?','grammar:question'),
  q('Which sentence describes a decision NOT to buy a phone this month?',['I am not going to buy a new phone this month.','I do not usually buy expensive phones.','I did not buy a phone last month.'],'I am not going to buy a new phone this month.','grammar:negative'),
  q('Which question asks whether she has a future investment plan?',['Is she going to invest in new equipment?','Does she invest in new equipment every year?','Did she invest in new equipment last year?'],'Is she going to invest in new equipment?','grammar:question'),
  q('Which sentence is a planned future action?',['We are going to review our expenses on Friday.','We reviewed our expenses last Friday.','We usually review expenses every Friday.'],'We are going to review our expenses on Friday.','grammar:function')
 ];
 if(f.includes('have to'))return[
  q('The recycling centre says separating plastic and paper is required. Which sentence fits?',['Visitors have to separate plastic and paper.','Visitors would like to separate plastic and paper.','Visitors sometimes separate plastic and paper.'],'Visitors have to separate plastic and paper.','grammar:obligation'),
  q('The centre provides bags, so bringing your own is optional. Which sentence says that?',['You do not have to bring your own bag.','You must not bring your own bag.','You have to bring your own bag.'],'You do not have to bring your own bag.','grammar:no-obligation'),
  q('Which sentence means conserving water is necessary?',['We have to conserve water.','We do not have to conserve water.','We would like to conserve water.'],'We have to conserve water.','grammar:meaning'),
  q('Which question asks whether gloves are required?',['Does she have to wear gloves here?','Would she like to wear gloves here?','Could she wear gloves here?'],'Does she have to wear gloves here?','grammar:question'),
  q('The rules forbid leaving waste on the floor. Which sentence fits?',['Students must not leave waste on the floor.','Students do not have to leave waste on the floor.','Students would not like to leave waste on the floor.'],'Students must not leave waste on the floor.','grammar:prohibition'),
  q('Which sentence means attendance is optional?',['You do not have to attend the extra meeting.','You must attend the extra meeting.','You have to attend the extra meeting.'],'You do not have to attend the extra meeting.','grammar:meaning')
 ];
 if(f.includes('relative'))return[
  q('Which sentence identifies a dependable relative with extra information?',['A dependable relative is someone who you can trust.','A dependable relative is someone I call every week.','My relative is dependable and friendly.'],'A dependable relative is someone who you can trust.','grammar:people'),
  q('Which sentence uses where to identify a place?',['This is the house where my grandparents live.','This is my grandparents’ old house.','My grandparents live in this house.'],'This is the house where my grandparents live.','grammar:place'),
  q('Which sentence uses a relative clause to identify a thing?',['The gift that she gave me is very special.','She gave me a very special gift.','The gift is special because it came from her.'],'The gift that she gave me is very special.','grammar:thing'),
  q('Which sentence uses who correctly for a person?',['I have an aunt who works at a hospital.','I have an aunt and she works at a hospital.','My aunt works at a hospital near here.'],'I have an aunt who works at a hospital.','grammar:people'),
  q('Which sentence defines a family tradition with a relative clause?',['A family tradition is something that people repeat over many years.','Families repeat traditions over many years.','This tradition is important to our family.'],'A family tradition is something that people repeat over many years.','grammar:thing'),
  q('Which sentence uses where to add information about Borama?',['Borama is the town where many of my relatives live.','Many of my relatives live in Borama.','Borama is my relatives’ hometown.'],'Borama is the town where many of my relatives live.','grammar:place')
 ];
 if(f.includes('can / could'))return[
  q('You are describing an ability you have now. Which sentence fits?',['I can check several news sources now.','I could check several news sources when I was at school.','I checked several news sources yesterday.'],'I can check several news sources now.','grammar:present-ability'),
  q('You are describing a past difficulty. Which sentence fits?',['When I first used the internet, I could not identify unreliable sources easily.','Now I can identify unreliable sources more easily.','I am checking an unreliable source right now.'],'When I first used the internet, I could not identify unreliable sources easily.','grammar:past-ability'),
  q('Which sentence is a polite request?',['Could you show me the original source, please?','You can show me the original source.','I could find the original source yesterday.'],'Could you show me the original source, please?','grammar:request'),
  q('You are not certain the headline is misleading. Which sentence shows possibility?',['This headline could be misleading.','This headline is definitely misleading.','This headline was misleading yesterday.'],'This headline could be misleading.','grammar:possibility'),
  q('Which sentence describes present ability?',['She can compare two reports quickly.','She could compare two reports when she was a student.','She compared two reports yesterday.'],'She can compare two reports quickly.','grammar:ability'),
  q('Which request sounds most polite?',['Could you send me the link?','Send me the link, please.','I want the link now.'],'Could you send me the link?','grammar:politeness')
 ];
 if(f.includes('as...as'))return[
  q('You want to say walking is less intense than running. Which sentence does that?',['Walking is not as intense as running.','Walking is more intense than running.','Walking is as intense as running.'],'Walking is not as intense as running.','grammar:equality'),
  q('Which sentence describes HOW Anisa runs?',['Anisa runs slowly.','Anisa is a slow runner.','Anisa runs every morning.'],'Anisa runs slowly.','grammar:adverb'),
  q('Two routines have the same level of consistency. Which sentence fits?',['This routine is as consistent as the other one.','This routine is more consistent than the other one.','This is the most consistent routine.'],'This routine is as consistent as the other one.','grammar:equality'),
  q('Which sentence describes how she stretches?',['She stretches carefully.','She is careful before she stretches.','She does a careful stretch before running.'],'She stretches carefully.','grammar:adverb'),
  q('Which sentence shows your new pace is slower than your old pace?',['My new pace is not as fast as my old pace.','My new pace is faster than my old pace.','My new pace is as fast as my old pace.'],'My new pace is not as fast as my old pace.','grammar:structure'),
  q('Which sentence says Ali and Omar train with equal regularity?',['Ali trains as regularly as Omar.','Ali trains more regularly than Omar.','Omar trains less regularly than Ali.'],'Ali trains as regularly as Omar.','grammar:equality')
 ];
 if(f.includes('quantifier'))return[
  q('Which sentence is correct with a countable noun?',['There are many buses in the city centre.','There is much traffic in the city centre.','There is a little noise in the city centre.'],'There are many buses in the city centre.','grammar:countable'),
  q('Which sentence says the countryside has a smaller amount of traffic?',['There is less traffic in the countryside.','There are fewer buses in the countryside.','There is a little traffic near my house.'],'There is less traffic in the countryside.','grammar:uncountable'),
  q('The village has a small number of large facilities. Which phrase fits?',['a few large facilities','a little traffic','much noise'],'a few large facilities','grammar:countable'),
  q('You have a small amount of time before work. Which phrase fits?',['a little time','a few minutes','many tasks'],'a little time','grammar:uncountable'),
  q('Which sentence compares the number of cars?',['There are fewer cars in the countryside than in the city.','There is less traffic in the countryside than in the city.','There are a few cars outside the office.'],'There are fewer cars in the countryside than in the city.','grammar:comparison'),
  q('Which sentence uses much correctly?',['There is not much noise at night.','There are not many buses at night.','There are only a few shops open at night.'],'There is not much noise at night.','grammar:uncountable')
 ];
 if(f.includes('would like'))return[
  q('Which sentence expresses a polite wish to improve English?',['I would like to improve my English this year.','I want to improve my English this year.','I am improving my English this year.'],'I would like to improve my English this year.','grammar:wish'),
  q('Which sentence states a direct goal for next year?',['She wants to start university next year.','She would like to visit a university next week.','She started university last year.'],'She wants to start university next year.','grammar:infinitive'),
  q('Which question politely asks about a future wish?',['What would you like to learn next?','What do you usually learn in class?','What did you learn yesterday?'],'What would you like to learn next?','grammar:infinitive'),
  q('Which sentence is the most polite way to introduce a request?',['I would like to ask a question.','I want an answer now.','I asked a question yesterday.'],'I would like to ask a question.','grammar:function'),
  q('Which sentence states a direct personal goal?',['I want to speak more confidently.','I would like some tea, please.','I spoke confidently yesterday.'],'I want to speak more confidently.','grammar:goal'),
  q('Which sentence describes a goal rather than a past achievement?',['I want to finish the course this year.','I finished the course last year.','I have already finished the course.'],'I want to finish the course this year.','grammar:goal')
 ];
 if(f==='present perfect')return[
  q('The investigation is still relevant now. Which update fits?',['The police have collected the evidence.','The police collected the evidence in 2020.','The police collect evidence every day.'],'The police have collected the evidence.','grammar:form'),
  q('Which sentence reports a recent action with already?',['She has already spoken to the witness.','She spoke to the witness last Tuesday.','She speaks to witnesses every week.'],'She has already spoken to the witness.','grammar:participle'),
  q('Which question asks whether the document has been found up to now?',['Have they found the missing document yet?','Did they find the document yesterday?','Do they usually find missing documents quickly?'],'Have they found the missing document yet?','grammar:yet'),
  q('Which sentence focuses on a recent result, with no finished past time?',['The investigators have finished the first report.','The investigators finished the first report in 2020.','The investigators finish a report every month.'],'The investigators have finished the first report.','grammar:result'),
  q('Which sentence describes life experience up to now?',['I have never seen a court case.','I did not see the court case yesterday.','I do not see court cases at work.'],'I have never seen a court case.','grammar:experience'),
  q('Which question asks about experience at any time before now?',['Have you ever spoken to a witness?','Did you speak to the witness on Monday?','Do you speak to witnesses at work?'],'Have you ever spoken to a witness?','grammar:question')
 ];
 if(f.includes('present perfect vs past simple'))return[
  q('No finished time is given. Which sentence fits?',['I have done this experiment twice.','I did this experiment yesterday.','I do this experiment every term.'],'I have done this experiment twice.','grammar:present-perfect'),
  q('The time “yesterday” is finished. Which sentence fits?',['We did the experiment yesterday.','We have done the experiment twice.','We do the experiment every month.'],'We did the experiment yesterday.','grammar:past-simple'),
  q('Which sentence connects January to the present?',['She has completed three research projects since January.','She completed a research project last January.','She completes one research project every January.'],'She has completed three research projects since January.','grammar:since'),
  q('Which question asks about a finished past event?',['When did they develop the first version?','Have they developed a new version yet?','Do they develop new versions every year?'],'When did they develop the first version?','grammar:finished-time'),
  q('Which pair correctly contrasts experience with a finished past visit?',['I have visited the science centre before, but I went there again last Saturday.','I visit the science centre often, and I am going there next Saturday.','I visited the science centre last Saturday, and I usually go there with my class.'],'I have visited the science centre before, but I went there again last Saturday.','grammar:contrast'),
  q('Which time expression normally points to the past simple?',['last year','ever','since 2024'],'last year','grammar:time-marker')
 ];
 if(f.includes('first conditional'))return[
  q('You think a large audience is a real possibility. Which sentence fits?',['If the audience is large, we will need more chairs.','If the audience were larger, we would need more chairs.','The audience was large, so we needed more chairs.'],'If the audience is large, we will need more chairs.','grammar:first-conditional'),
  q('Which sentence gives a likely future result if the weather changes?',['If the weather changes, the performance will move indoors.','If the weather changed yesterday, the performance moved indoors.','If the weather were different, the performance would move indoors.'],'If the weather changes, the performance will move indoors.','grammar:result'),
  q('Which sentence is a first conditional about getting a ticket?',['If I get a ticket, I will go to the show.','If I got a ticket, I would go to the show.','I got a ticket, so I went to the show.'],'If I get a ticket, I will go to the show.','grammar:form'),
  q('Which question asks about a realistic future possibility?',['What will you do if the film starts late?','What would you do if the cinema closed forever?','What did you do when the film started late yesterday?'],'What will you do if the film starts late?','grammar:if-clause'),
  q('Which sentence connects a possible good review to a future result?',['If they receive a good review, more people will attend the event.','They received a good review, so more people attended the event.','If they received reviews every week, people usually attended.'],'If they receive a good review, more people will attend the event.','grammar:result'),
  q('Which sentence describes a realistic future possibility?',['If we finish early, we will meet the actors.','If we finished early yesterday, we met the actors.','If we lived near the theatre, we would go more often.'],'If we finish early, we will meet the actors.','grammar:meaning')
 ];
 if(f.includes('present simple passive'))return[
  q('You want to focus on the aid, not the organisation delivering it. Which sentence fits?',['Emergency aid is delivered to families after the assessment.','Local teams deliver emergency aid after the assessment.','Emergency aid arrived yesterday.'],'Emergency aid is delivered to families after the assessment.','grammar:passive'),
  q('Which sentence is passive?',['Information is shared through local centres.','Local centres share information.','People can find information at local centres.'],'Information is shared through local centres.','grammar:passive'),
  q('Which sentence focuses on programmes receiving support?',['Many community programmes are supported by volunteers.','Volunteers support many community programmes.','Many volunteers join community programmes.'],'Many community programmes are supported by volunteers.','grammar:plural'),
  q('Which question asks about where a process happens?',['Where is the food distributed?','Where do volunteers distribute the food?','Where did the food arrive yesterday?'],'Where is the food distributed?','grammar:question'),
  q('Which sentence describes a regular service in the passive?',['The service is provided every weekday.','Staff provide the service every weekday.','The service started last year.'],'The service is provided every weekday.','grammar:passive'),
  q('Which sentence focuses on the process rather than the actor?',['The applications are checked every morning.','The staff check the applications every morning.','The staff start work at eight every morning.'],'The applications are checked every morning.','grammar:function')
 ];
 if(f.includes('gerunds'))return[
  q('Which sentence correctly follows enjoy with an -ing form?',['I enjoy reading in my free time.','I want to read a new book this weekend.','I read for an hour yesterday.'],'I enjoy reading in my free time.','grammar:gerund'),
  q('Which sentence correctly follows want with to + infinitive?',['She wants to join a photography course.','She enjoys joining photography groups.','She joined a photography course last year.'],'She wants to join a photography course.','grammar:infinitive'),
  q('Which sentence correctly follows decide with to + infinitive?',['They decided to try a new hobby.','They enjoy trying new hobbies.','They tried a new hobby yesterday.'],'They decided to try a new hobby.','grammar:infinitive'),
  q('Which sentence correctly follows avoid with an -ing form?',['He avoids spending too much time online.','He wants to spend less time online.','He spent less time online yesterday.'],'He avoids spending too much time online.','grammar:gerund'),
  q('Which sentence correctly follows plan with to + infinitive?',['We plan to visit the club next month.','We enjoy visiting the club every week.','We visited the club last month.'],'We plan to visit the club next month.','grammar:infinitive'),
  q('Which sentence correctly follows keep with an -ing form?',['She keeps practising the guitar.','She wants to practise the guitar.','She practised the guitar yesterday.'],'She keeps practising the guitar.','grammar:gerund')
 ];
 if(f.includes('reported'))return[
  q('Amina said, “I enjoy this tradition.” Which sentence reports her words later?',['Amina said that she enjoyed the tradition.','Amina says that she enjoys the tradition every year.','Amina enjoyed the tradition at the festival.'],'Amina said that she enjoyed the tradition.','grammar:reported'),
  q('He said, “I am busy.” Which sentence reports that statement later?',['He said that he was busy.','He says that he is busy every Monday.','He was busy yesterday afternoon.'],'He said that he was busy.','grammar:backshift'),
  q('She told me, “We can help.” Which sentence reports the message?',['She told me that they could help.','She says that they can help today.','They helped us yesterday.'],'She told me that they could help.','grammar:modal'),
  q('Which sentence reports Hodan’s statement with said?',['Hodan said that the custom was important to her family.','Hodan told me that the custom was important to her family.','Hodan explained the custom to her family.'],'Hodan said that the custom was important to her family.','grammar:reported'),
  q('“I will call tomorrow.” Which sentence reports that promise later?',['He said that he would call the next day.','He says that he will call tomorrow.','He called the next day.'],'He said that he would call the next day.','grammar:future'),
  q('Which sentence uses told with the required object?',['She told me that the tradition was important.','She said that the tradition was important.','She explained that the tradition was important.'],'She told me that the tradition was important.','grammar:verb-pattern')
 ];
 if(f.includes('second conditional'))return[
  q('You are imagining having more free time. Which sentence fits?',['If I had more time, I would take another course.','If I have time tonight, I will review the lesson.','I had more time last year, so I took another course.'],'If I had more time, I would take another course.','grammar:second-conditional'),
  q('Which question asks about an imaginary job choice?',['What would you do if you could choose any job?','What will you do when you start your new job?','What did you do at work yesterday?'],'What would you do if you could choose any job?','grammar:question'),
  q('Which sentence gives hypothetical advice?',['If I were you, I would compare the two options carefully.','If I have time, I will compare the two options tonight.','I compared the two options yesterday.'],'If I were you, I would compare the two options carefully.','grammar:advice'),
  q('Which sentence describes an imaginary present situation?',['If I lived near the sea, I would swim every morning.','I live near the sea, so I swim every morning.','I lived near the sea last year and swam every morning.'],'If I lived near the sea, I would swim every morning.','grammar:meaning'),
  q('She does not know the answer. Which imagined result fits?',['If she knew the answer, she would tell us.','If she learns the answer tonight, she will tell us.','She knew the answer yesterday and told us.'],'If she knew the answer, she would tell us.','grammar:result'),
  q('Which if-clause uses the past form for an imaginary choice?',['If I had two choices, ...','If I have two choices tomorrow, ...','When I had two choices yesterday, ...'],'If I had two choices, ...','grammar:if-clause')
 ];
 if(f.includes('mixed review'))return[
  q('Which sentence describes a regular routine?',['I practise English every evening.','I am practising English right now.','I practised English yesterday evening.'],'I practise English every evening.','grammar:review'),
  q('Which sentence describes a finished past event?',['I completed the lesson yesterday.','I have completed three lessons this week.','I complete one lesson every day.'],'I completed the lesson yesterday.','grammar:review'),
  q('Which sentence describes experience up to now?',['I have spoken to new people in English.','I spoke to a new classmate yesterday.','I speak to classmates every lesson.'],'I have spoken to new people in English.','grammar:review'),
  q('Which sentence describes a future plan?',['I am going to practise listening next month.','I practise listening every morning.','I practised listening last month.'],'I am going to practise listening next month.','grammar:review'),
  q('Which sentence gives advice?',['You should practise a little every day.','You have to show your ID at reception.','You practised for an hour yesterday.'],'You should practise a little every day.','grammar:review'),
  q('Which sentence is a first conditional about tonight?',['If I have time tonight, I will review the lesson.','If I had more free time, I would study another language.','I had time last night, so I reviewed the lesson.'],'If I have time tonight, I will review the lesson.','grammar:review')
 ];
 return[
  q('Which sentence gives a personal fact about identity?',['I am a student.','I have two sisters.','I like football.'],'I am a student.','grammar:be'),
  q('Which sentence expresses possession?',['She has two sisters.','She is from Hargeisa.','She likes reading.'],'She has two sisters.','grammar:have'),
  q('Which sentence expresses a preference?',['We like learning English.','We are in an English class.','We have two English books.'],'We like learning English.','grammar:preference'),
  q('Which question asks about someone’s usual home as a general fact?',['Where do you live?','Where are you staying this week?','Where did you live in 2024?'],'Where do you live?','grammar:question'),
  q('Which sentence gives a personal fact about origin?',['He is from Borama.','He has family in Borama.','He likes visiting Borama.'],'He is from Borama.','grammar:be'),
  q('Your friends enjoy football. Which sentence says that?',['My friends like football.','My friends play football every Friday.','My friends watched football yesterday.'],'My friends like football.','grammar:preference')
 ];
}
function vocabItems(title,data){
 const words=data.v.map(v=>v[0]),meanings=data.v.map(v=>v[1]);
 const meaningOptions=i=>[meanings[i],meanings[(i+2)%6],meanings[(i+4)%6]];
 const wordOptions=i=>[words[i],words[(i+2)%6],words[(i+4)%6]];
 const example=word=>typeof lessonVocabExample==='function'?lessonVocabExample(word,{title}):'We use “'+word+'” when we talk about '+title.toLowerCase()+'.';
 return[
  ...words.map((word,i)=>({type:'choice',q:'What does “'+word+'” mean?',options:meaningOptions(i),answer:meanings[i],tag:'vocabulary:meaning',example:example(word)})),
  {type:'choice',q:'Which word means “'+meanings[1]+'”?',options:wordOptions(1),answer:words[1],tag:'vocabulary:retrieval',example:example(words[1])},
  {type:'choice',q:'Which word best matches this idea: '+meanings[4]+'?',options:wordOptions(4),answer:words[4],tag:'vocabulary:context',example:example(words[4])},
  {type:'exact',q:'Type the target word meaning “'+meanings[0]+'”.',answer:words[0],min:1,tag:'vocabulary:recall',example:example(words[0])},
  {type:'choice',q:'Complete the example: “'+example(words[5]).replace(new RegExp(words[5],'i'),'___')+'”',options:wordOptions(5),answer:words[5],tag:'vocabulary:application',example:example(words[5])}
 ];
}
function readingText(number,title,data,meta){
 const [person,place,goal,challenge,action,result]=data.s;
 if(number===1)return 'On the first day of a new training course, Amina sits next to Yusuf. Amina lives in Borama and works in a small office. Her hometown is Hargeisa. She enjoys reading and walking in the evening. Yusuf is a university student who likes football and photography. They ask each other simple questions about work, hometowns, and hobbies. Before the lesson starts, Amina introduces Yusuf to another student and says that he is friendly and outgoing. The conversation becomes easier because they react to each other and ask short follow-up questions.';
 const start=[
  person+' is taking part in an activity about '+title.toLowerCase()+' at '+place+'. The main goal is to '+goal+'.',
  'During a practical lesson on '+title.toLowerCase()+', '+person+' has a clear goal: '+goal+'. The activity takes place at '+place+'.',
  person+' has a real-life situation connected to '+title.toLowerCase()+'. At '+place+', the aim is to '+goal+'.',
  'A short class case study follows '+person+' at '+place+'. '+person+' wants to '+goal+'.'
 ][(number-1)%4];
 let text=start+' At first, '+challenge+'. '+person+' decides to '+action+'. As a result, '+result+'. '+meta.extra;
 if(number>7)text+=' Before making the decision, '+person+' thinks about the most important information and chooses one practical next step. Afterwards, '+person+' explains the choice to another learner and gives a simple reason.';
 if(number>14)text+=' The class then compares this response with another possible option. They agree that a useful answer should match the situation, be easy to explain, and lead to a clear result. '+person+' ends by saying what could be done next time.';
 return text;
}
function audioScript(number,title,data,meta){
 const [person,place,goal,challenge,action,result]=data.s,partner=['Amina','Yusuf','Hodan','Maryan'][(number+1)%4];
 const variants=[
  partner+': What are you trying to do? '+person+': I want to '+goal+'. '+partner+': What is making it difficult? '+person+': '+capFirst(challenge)+'. '+partner+': So what are you going to do? '+person+': I am going to '+action+'. '+partner+': Did it help? '+person+': Yes. '+capFirst(result)+'. '+partner+': That sounds like a useful lesson.',
  person+': I had a problem during an activity at '+place+'. I wanted to '+goal+', but '+challenge+'. '+partner+': What did you do? '+person+': I decided to '+action+'. '+partner+': And what happened after that? '+person+': '+result+'. '+partner+': Would you use the same idea again? '+person+': Yes, but I would explain the plan earlier next time.',
  partner+': Tell me about your '+title.toLowerCase()+' task. '+person+': The goal was to '+goal+'. The difficult part was that '+challenge+'. '+partner+': How did you respond? '+person+': I chose to '+action+'. That helped because '+result+'. '+partner+': What did you learn? '+person+': A clear plan and a clear explanation can make the situation easier.'
 ];
 let text=variants[(number-1)%3];
 if(number>7)text+=' '+partner+': What is the most important point? '+person+': I need a clear plan and one practical next step.';
 if(number>14)text+=' '+partner+': Can you summarise the main point in one sentence? '+person+': Yes. I should identify the problem, choose a realistic action, and check the result.';
 return text;
}
function questions(title,data){
 const [person,place,goal,challenge,action,result]=data.s;
 return[
  q('What is '+person+' trying to do?',[goal,'leave the activity immediately','avoid making any decision'],goal,'reading:main-idea'),
  q('What problem appears?',[challenge,'there is no difficulty','the activity finishes before it starts'],challenge,'reading:detail'),
  q('What action does '+person+' take?',[action,'ignore the situation','cancel every plan'],action,'reading:sequence'),
  q('What is the main lesson from the reading?',['A clear action and explanation can improve a difficult situation.','The safest choice is always to do nothing.','One solution works in every situation.'],'A clear action and explanation can improve a difficult situation.','reading:inference'),
  q('Where does the situation happen?',[place,'at a sports stadium','at an airport every time'],place,'listening:detail'),
  q('Why does '+person+' need to make a change?',[challenge,'everything is already perfect','the goal is no longer important'],challenge,'listening:reason'),
  q('What response does '+person+' choose?',[action,'wait without deciding','change to an unrelated topic'],action,'listening:decision'),
  q('What happens after the response?',[result,'nothing changes at all','the original goal disappears'],result,'listening:result')
 ];
}
function ranges(number){return number<=7?[50,70]:number<=14?[60,80]:[65,90]}
function cleanTask(task){return String(task||'').replace(/\b\d+\s*[–-]\s*\d+\s*words?\b/gi,'').replace(/\s+/g,' ').trim()}
function makeLesson(number,title,focus){
 const data=sourceData(title),meta=META[title],range=ranges(number);
 if(!data||!meta)throw new Error('Missing A2 source data for '+title);
 return{
  id:'su-a2-l'+number,number,title,outcome:meta.outcome,ready:true,targetVocabulary:data.v.map(v=>v[0]),
  foundation:meta.foundation,a2Lift:meta.lift,performance:meta.performance,pronunciation:meta.pronunciation,mediation:meta.mediation,
  functions:meta.functions,discourse:meta.discourse,chunks:meta.chunks,interactionExpressions:meta.interaction,
  expressions:[...meta.chunks,...meta.interaction].slice(0,6).map(text=>({text})),
  vocabulary:{items:vocabItems(title,data)},
  listening:{title:title+' · Reading & Listening',readingText:readingText(number,title,data,meta),audioScript:audioScript(number,title,data,meta),text:audioScript(number,title,data,meta),questions:questions(title,data)},
  grammar:{focus,rule:ruleFor(focus),items:grammarItems(focus)},
  writing:{task:cleanTask(meta.task),minWords:range[0],maxWords:range[1],humanGraded:false,checkpoint:false},
  review:{keywords:data.v.map(v=>v[0]).join(' · '),mission:meta.performance}
 };
}
const lessons=SPEAKUP_A2_B1_SYLLABUS.map((row,i)=>makeLesson(i+1,row[0],row[1]));
BOOK_PACKS['speakup-a2']={
 id:'speakup-a2',title:'A2 Elementary',level:'A2',moduleTitle:'A2 Elementary',
 moduleGoal:'Build confident everyday English through the original A2 topic spine, upgraded to the EnglishGate Living Standard.',
 totalLessons:22,lessons,standardVersion:A2_VERSION
};
window.A2_LIVING_STANDARD_VERSION=A2_VERSION;
})();