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
  q('Which sentence describes a regular routine?',['I check my email every morning.','I am checking my email every morning this minute.','I checked my email right now.'],'I check my email every morning.','grammar:routine'),
  q('Which sentence describes something happening now?',['The team is meeting a client now.','The team meets a client now every day.','The team met a client now.'],'The team is meeting a client now.','grammar:now'),
  q('Complete: He ___ a report this week, so he is very busy.',['prepares','is preparing','prepared last year'],'is preparing','grammar:temporary'),
  q('Choose the best contrast.',['I usually teach in the morning, but this week I am teaching in the evening.','I am usually teaching in the morning, but this week I teach yesterday.','I taught usually in the morning, but this week I am teach.'],'I usually teach in the morning, but this week I am teaching in the evening.','grammar:contrast'),
  q('What ___ you usually do after class?',['do','are','did'],'do','grammar:question')
 ];
 if(f==='past simple')return[
  q('Yesterday Yusuf ___ the bus to Berbera.',['takes','took','has taken'],'took','grammar:past'),
  q('Choose the correct negative.',['We did not miss the reservation.','We did not missed the reservation.','We have not miss the reservation yesterday.'],'We did not miss the reservation.','grammar:negative'),
  q('___ you enjoy the trip last weekend?',['Did','Have','Do'],'Did','grammar:question'),
  q('The bus ___ late, so we changed our plan.',['left','leaves','has left'],'left','grammar:sequence'),
  q('Choose the sentence with a finished past time.',['I visited Hargeisa last month.','I have visited Hargeisa last month.','I visit Hargeisa last month.'],'I visited Hargeisa last month.','grammar:time'),
  q('What happened after you ___ at the hotel?',['arrived','arrive','have arrive'],'arrived','grammar:sequence')
 ];
 if(f.includes('frequency'))return[
  q('Rahma ___ turns off notifications when she studies.',['usually','right now','yesterday'],'usually','grammar:frequency'),
  q('Choose the correct word order.',['I often use my phone for study.','I use often my phone for study.','Often I am use my phone for study.'],'I often use my phone for study.','grammar:word-order'),
  q('She is ___ late for the online class; she arrives on time almost every day.',['rarely','always','now'],'rarely','grammar:meaning'),
  q('How often ___ you check social media?',['do','are','did yesterday'],'do','grammar:question'),
  q('Choose the best sentence with be.',['He is usually careful with privacy settings.','He usually is careful with privacy settings always.','He does usually careful with privacy settings.'],'He is usually careful with privacy settings.','grammar:be'),
  q('Which sentence means 100% of the time?',['I always check the source.','I sometimes check the source.','I rarely check the source.'],'I always check the source.','grammar:meaning')
 ];
 if(f.includes('should'))return[
  q('You feel very tired. You ___ get some rest.',['should','should to','must not'],'should','grammar:advice'),
  q('Choose the best advice.',['You should drink more water during a hot day.','You should drinking more water during a hot day.','You should to drink more water during a hot day.'],'You should drink more water during a hot day.','grammar:form'),
  q('A friend is stressed. What is the best negative advice?',['You should not work all night.','You do not should work all night.','You should not to work all night.'],'You should not work all night.','grammar:negative'),
  q('___ I talk to my teacher about the problem?',['Should','Do should','Am should'],'Should','grammar:question'),
  q('Which sentence gives advice, not a rule?',['You should take a short break.','You have to show your passport at the border.','You must wear a seat belt.'],'You should take a short break.','grammar:function'),
  q('Complete: He should ___ a more balanced routine.',['try','tries','trying'],'try','grammar:base-verb')
 ];
 if(f.includes('comparatives and superlatives'))return[
  q('This dish is ___ than the other one.',['spicier','spiciest','more spicy than all'],'spicier','grammar:comparative'),
  q('Which sentence compares two dishes correctly?',['Rice is cheaper than grilled fish here.','Rice is cheapest than grilled fish here.','Rice is more cheaper than grilled fish here.'],'Rice is cheaper than grilled fish here.','grammar:comparative'),
  q('This is the ___ dish on the menu.',['most popular','more popular','popularer'],'most popular','grammar:superlative'),
  q('Which form is correct?',['This portion is bigger than mine.','This portion is more big than mine.','This portion is biggest than mine.'],'This portion is bigger than mine.','grammar:comparative'),
  q('Of the three restaurants, this one is ___.',['the cheapest','cheaper','more cheap'],'the cheapest','grammar:superlative'),
  q('Traditional tea is ___ sweet than this juice.',['less','least','fewer'],'less','grammar:comparison')
 ];
 if(f.includes('past simple vs past continuous'))return[
  q('Maryan ___ when her phone rang.',['was studying','studied every day','has studied'],'was studying','grammar:background'),
  q('While I was revising, my friend ___ me.',['called','was call','has called yesterday'],'called','grammar:interruption'),
  q('Choose the best story sentence.',['We were working when the internet stopped.','We worked when the internet was stop.','We have worked when the internet stopped yesterday.'],'We were working when the internet stopped.','grammar:contrast'),
  q('What ___ you doing when the teacher arrived?',['were','did','have'],'were','grammar:question'),
  q('The students ___ quietly when the fire alarm started.',['were reading','read usually','have read'],'were reading','grammar:background'),
  q('Which action was shorter? “I was writing when the lights went out.”',['The lights went out.','I was writing.','Both actions were regular habits.'],'The lights went out.','grammar:meaning')
 ];
 if(f.includes('going to'))return[
  q('Khalid ___ make a new budget next month.',['is going to','goes to','is going'],'is going to','grammar:plan'),
  q('We ___ save more money this year.',['are going to','are go to','going to'],'are going to','grammar:plan'),
  q('What are you going to ___ first?',['buy','bought','buying'],'buy','grammar:base-verb'),
  q('Choose the correct negative plan.',['I am not going to buy a new phone this month.','I do not going to buy a new phone this month.','I am going not buy a new phone this month.'],'I am not going to buy a new phone this month.','grammar:negative'),
  q('___ she going to invest in new equipment?',['Is','Does','Has'],'Is','grammar:question'),
  q('Which sentence is a planned action?',['We are going to review our expenses on Friday.','We reviewed our expenses last Friday.','We usually review expenses every Friday.'],'We are going to review our expenses on Friday.','grammar:function')
 ];
 if(f.includes('have to'))return[
  q('At this recycling centre, visitors ___ separate plastic and paper.',['have to','would like to','could yesterday'],'have to','grammar:obligation'),
  q('You ___ bring your own bag; the centre provides one.',['do not have to','must not','should not to'],'do not have to','grammar:no-obligation'),
  q('Which sentence means “it is necessary”?',['We have to conserve water.','We do not have to conserve water.','We might conserve water yesterday.'],'We have to conserve water.','grammar:meaning'),
  q('Does she ___ wear gloves here?',['have to','has to','having to'],'have to','grammar:question'),
  q('Students ___ leave waste on the floor; it is against the rules.',['must not','do not have to','could not yesterday'],'must not','grammar:prohibition'),
  q('Which sentence means the action is optional?',['You do not have to attend the extra meeting.','You must attend the extra meeting.','You have to attend the extra meeting.'],'You do not have to attend the extra meeting.','grammar:meaning')
 ];
 if(f.includes('relative'))return[
  q('A dependable relative is someone ___ you can trust.',['who','where','which place'],'who','grammar:people'),
  q('This is the house ___ my grandparents live.',['where','who','which person'],'where','grammar:place'),
  q('The gift ___ she gave me is very special.',['that','who','where'],'that','grammar:thing'),
  q('Choose the correct sentence.',['I have an aunt who works at a hospital.','I have an aunt which works at a hospital.','I have an aunt where works at a hospital.'],'I have an aunt who works at a hospital.','grammar:people'),
  q('A family tradition is something ___ people repeat over many years.',['that','who','where'],'that','grammar:thing'),
  q('Borama is the town ___ many of my relatives live.',['where','who','that person'],'where','grammar:place')
 ];
 if(f.includes('can / could'))return[
  q('I ___ check several news sources now.',['can','could when I was younger only','am can'],'can','grammar:present-ability'),
  q('When I first used the internet, I ___ not identify unreliable sources easily.',['could','can','will can'],'could','grammar:past-ability'),
  q('___ you show me the original source, please?',['Could','Did could','Are can'],'Could','grammar:request'),
  q('This headline ___ be misleading, so let us verify it.',['could','did','has to yesterday'],'could','grammar:possibility'),
  q('Choose the present ability sentence.',['She can compare two reports quickly.','She could compare two reports when she is doing it now.','She can to compare two reports quickly.'],'She can compare two reports quickly.','grammar:ability'),
  q('Which is the most polite request?',['Could you send me the link?','Send me the link.','You can send link now?'],'Could you send me the link?','grammar:politeness')
 ];
 if(f.includes('as...as'))return[
  q('Walking is not ___ running for building stamina.',['as intense as','more intense as','as intense than'],'as intense as','grammar:equality'),
  q('Anisa runs ___.',['slowly','slow','slowness'],'slowly','grammar:adverb'),
  q('This routine is ___ the other one.',['as consistent as','as consistent than','more consistent as'],'as consistent as','grammar:equality'),
  q('Choose the sentence that describes how she exercises.',['She stretches carefully.','She stretches careful.','She carefully is stretch.'],'She stretches carefully.','grammar:adverb'),
  q('My new pace is not as fast ___ my old pace.',['as','than','like'],'as','grammar:structure'),
  q('Which sentence compares two people equally?',['Ali trains as regularly as Omar.','Ali trains regular as Omar.','Ali trains more regularly as Omar.'],'Ali trains as regularly as Omar.','grammar:equality')
 ];
 if(f.includes('quantifier'))return[
  q('There are ___ buses in the city centre.',['many','much','a little'],'many','grammar:countable'),
  q('There is ___ traffic early in the morning.',['less','fewer','many'],'less','grammar:uncountable'),
  q('The village has ___ large facilities, but it has the basic services.',['a few','a little','much'],'a few','grammar:countable'),
  q('I have ___ time before work, so my commute matters.',['a little','a few','many'],'a little','grammar:uncountable'),
  q('There are ___ cars in the countryside than in the city.',['fewer','less','little'],'fewer','grammar:comparison'),
  q('Which sentence is correct?',['There is not much noise at night.','There are not much noise at night.','There is not many noise at night.'],'There is not much noise at night.','grammar:uncountable')
 ];
 if(f.includes('would like'))return[
  q('I ___ to improve my English this year.',['would like','would like improving','am like to'],'would like','grammar:wish'),
  q('She wants ___ university next year.',['to start','starting after wants','start to'],'to start','grammar:infinitive'),
  q('What would you like ___ next?',['to learn','learning','learned'],'to learn','grammar:infinitive'),
  q('Choose the polite wish.',['I would like to ask a question.','I want ask a question now.','I would like asking a question.'],'I would like to ask a question.','grammar:function'),
  q('My goal is clear: I want ___ more confidently.',['to speak','speaking after want','speak to'],'to speak','grammar:infinitive'),
  q('Which sentence describes a direct personal goal?',['I want to finish the course this year.','I would finished the course this year.','I want finishing the course this year.'],'I want to finish the course this year.','grammar:goal')
 ];
 if(f==='present perfect')return[
  q('The police ___ collected the evidence.',['have','did','are'],'have','grammar:form'),
  q('She has already ___ to the witness.',['spoken','spoke','speak'],'spoken','grammar:participle'),
  q('Have they found the missing document ___?',['yet','last night','ago'],'yet','grammar:yet'),
  q('Choose the recent-result sentence.',['The investigators have finished the first report.','The investigators finished the first report in 2020.','The investigators finish the first report yesterday.'],'The investigators have finished the first report.','grammar:result'),
  q('I have never ___ a court case.',['seen','saw','see'],'seen','grammar:experience'),
  q('___ you ever spoken to a witness?',['Have','Did ever','Are'],'Have','grammar:question')
 ];
 if(f.includes('present perfect vs past simple'))return[
  q('I ___ this experiment twice. No finished time is given.',['have done','did','do yesterday'],'have done','grammar:present-perfect'),
  q('We ___ the experiment yesterday.',['did','have done','do'],'did','grammar:past-simple'),
  q('She ___ three research projects since January.',['has completed','completed last January only','completes yesterday'],'has completed','grammar:since'),
  q('When ___ they develop the first version?',['did','have','do since'],'did','grammar:finished-time'),
  q('Choose the correct pair.',['I have visited the science centre before, but I went there again last Saturday.','I visited the science centre before, but I have went there last Saturday.','I have visit the science centre before, but I go there last Saturday.'],'I have visited the science centre before, but I went there again last Saturday.','grammar:contrast'),
  q('Which time expression normally goes with the past simple?',['last year','ever','since 2024'],'last year','grammar:time-marker')
 ];
 if(f.includes('first conditional'))return[
  q('If the audience is large, we ___ more chairs.',['will need','would need','needed yesterday'],'will need','grammar:first-conditional'),
  q('If the weather changes, the performance ___ indoors.',['will move','moves yesterday','would moved'],'will move','grammar:result'),
  q('Choose the correct first conditional.',['If I get a ticket, I will go to the show.','If I will get a ticket, I go to the show.','If I got a ticket, I will went to the show.'],'If I get a ticket, I will go to the show.','grammar:form'),
  q('What will you do if the film ___ late?',['starts','will start','started yesterday'],'starts','grammar:if-clause'),
  q('If they receive a good review, more people ___ the event.',['will attend','would attended','attend yesterday'],'will attend','grammar:result'),
  q('Which sentence describes a realistic future possibility?',['If we finish early, we will meet the actors.','If we finished early yesterday, we will meet the actors.','If we will finish early, we met the actors.'],'If we finish early, we will meet the actors.','grammar:meaning')
 ];
 if(f.includes('present simple passive'))return[
  q('Emergency aid ___ to families after the assessment.',['is delivered','delivers','is deliver'],'is delivered','grammar:passive'),
  q('Choose the passive sentence.',['Information is shared through local centres.','Local centres share information.','Information shares local centres.'],'Information is shared through local centres.','grammar:passive'),
  q('Many community programmes ___ by volunteers.',['are supported','support','are support'],'are supported','grammar:plural'),
  q('Where ___ the food distributed?',['is','does','has'],'is','grammar:question'),
  q('The service ___ every weekday.',['is provided','provides itself','is provide'],'is provided','grammar:passive'),
  q('Which sentence focuses on the process, not the actor?',['The applications are checked every morning.','The staff check the applications every morning.','The applications check the staff.'],'The applications are checked every morning.','grammar:function')
 ];
 if(f.includes('gerunds'))return[
  q('I enjoy ___ in my free time.',['reading','to read after enjoy','read to'],'reading','grammar:gerund'),
  q('She wants ___ a photography course.',['to join','joining after wants','join to'],'to join','grammar:infinitive'),
  q('They decided ___ a new hobby.',['to try','trying after decided','try to a hobby'],'to try','grammar:infinitive'),
  q('He avoids ___ too much time online.',['spending','to spend after avoids','spend to'],'spending','grammar:gerund'),
  q('We plan ___ the club next month.',['to visit','visiting after plan','visit to'],'to visit','grammar:infinitive'),
  q('Choose the correct sentence.',['She keeps practising the guitar.','She keeps to practise the guitar.','She keeps practise the guitar.'],'She keeps practising the guitar.','grammar:gerund')
 ];
 if(f.includes('reported'))return[
  q('Amina said, “I enjoy this tradition.” → Amina said that she ___ the tradition.',['enjoyed','enjoy','is enjoy'],'enjoyed','grammar:reported'),
  q('He said, “I am busy.” → He said that he ___ busy.',['was','is yesterday','were'],'was','grammar:backshift'),
  q('She told me, “We can help.” → She told me that they ___ help.',['could','can yesterday','were can'],'could','grammar:modal'),
  q('Choose the correct sentence.',['Hodan said that the custom was important to her family.','Hodan said me that the custom important.','Hodan told that the custom was important.'],'Hodan said that the custom was important to her family.','grammar:reported'),
  q('“I will call tomorrow.” → He said that he ___ call the next day.',['would','will yesterday','was'],'would','grammar:future'),
  q('Which reporting verb needs an object?',['told','said','explained that'],'told','grammar:verb-pattern')
 ];
 if(f.includes('second conditional'))return[
  q('If I had more time, I ___ another course.',['would take','will take','took yesterday'],'would take','grammar:second-conditional'),
  q('What ___ you do if you could choose any job?',['would','will','did yesterday'],'would','grammar:question'),
  q('If I were you, I ___ the two options carefully.',['would compare','will compare','compare yesterday'],'would compare','grammar:advice'),
  q('Choose the imaginary situation.',['If I lived near the sea, I would swim every morning.','If I live near the sea now, I swim every morning as a fact.','I lived near the sea last year, so I swam every morning.'],'If I lived near the sea, I would swim every morning.','grammar:meaning'),
  q('If she knew the answer, she ___ us.',['would tell','will told','told every day'],'would tell','grammar:result'),
  q('Which clause uses the past form in a second conditional?',['If I had two choices, ...','If I will have two choices, ...','If I have two choices yesterday, ...'],'If I had two choices, ...','grammar:if-clause')
 ];
 if(f.includes('mixed review'))return[
  q('Choose the routine sentence.',['I practise English every evening.','I practised English right now.','I am practise English every evening.'],'I practise English every evening.','grammar:review'),
  q('Choose the finished past event.',['I completed the lesson yesterday.','I have completed the lesson yesterday.','I complete the lesson yesterday.'],'I completed the lesson yesterday.','grammar:review'),
  q('Choose the experience sentence.',['I have spoken to new people in English.','I spoke to new people since January.','I have spoke to new people.'],'I have spoken to new people in English.','grammar:review'),
  q('Choose the future plan.',['I am going to practise listening next month.','I am practise listening next month.','I practised listening next month.'],'I am going to practise listening next month.','grammar:review'),
  q('Choose the advice.',['You should practise a little every day.','You should to practise a little every day.','You should practising a little every day.'],'You should practise a little every day.','grammar:review'),
  q('Choose the first conditional.',['If I have time tonight, I will review the lesson.','If I will have time tonight, I review the lesson.','If I had time tonight yesterday, I will review.'],'If I have time tonight, I will review the lesson.','grammar:review')
 ];
 return[
  q('I ___ a student.',['am','is','are'],'am','grammar:be'),
  q('She ___ two sisters.',['has','have','is having every day'],'has','grammar:have'),
  q('We ___ learning English.',['like','likes','are like'],'like','grammar:preference'),
  q('Where ___ you live?',['do','does','are live'],'do','grammar:question'),
  q('He ___ from Borama.',['is','are','am'],'is','grammar:be'),
  q('My friends ___ football.',['like','likes','is liking'],'like','grammar:preference')
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
  {type:'choice',q:'Which target word is used in this example: “'+example(words[5])+'”?',options:wordOptions(5),answer:words[5],tag:'vocabulary:application',example:example(words[5])}
 ];
}
function readingText(number,title,data,meta){
 const [person,place,goal,challenge,action,result]=data.s;
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
  writing:{task:meta.task,minWords:range[0],maxWords:range[1],humanGraded:false,checkpoint:false},
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