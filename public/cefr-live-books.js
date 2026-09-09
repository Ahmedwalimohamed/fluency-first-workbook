(function(){
'use strict';

const LEVELS=['A1','A2','B1','C1'];

const VOCAB_USAGE={
 hobby:'Reading is my favourite hobby.',
 hometown:'Borama is my hometown.',
 occupation:'Teaching is her occupation.',
 outgoing:'She is outgoing and enjoys meeting new people.',
 background:'Tell us briefly about your professional background.',
 introduce:'Let me introduce my colleague, Amina.',
 colleague:'I asked my colleague to review the report.',
 deadline:'The deadline for the report is Friday.',
 shift:'My evening shift starts at 4 p.m.',
 promotion:'He received a promotion after leading the project.',
 responsibility:'Checking the final report is my responsibility.',
 priority:'Finishing the urgent task is our first priority.',
 journey:'The journey from Borama to Hargeisa took several hours.',
 destination:'Hargeisa is our final destination today.',
 reservation:'I made a hotel reservation before travelling.',
 delay:'The flight left after a short delay.',
 explore:'We want to explore the old part of the city.',
 memorable:'Our first class trip was a memorable experience.',
 device:'This device can connect to the internet.',
 privacy:'Check your privacy settings before sharing personal information.',
 notification:'I received a notification from the school app.',
 upload:'Please upload your assignment before the deadline.',
 'screen time':'I try to reduce my screen time in the evening.',
 reliable:'We need a reliable internet connection for the live class.',
 symptom:'A high fever can be a symptom of illness.',
 stress:'Regular breaks can help reduce stress.',
 balanced:'A balanced diet includes different kinds of healthy food.',
 rest:'You should rest after a busy day.',
 habit:'Reading every morning is a useful habit.',
 recover:'She needed a few days to recover from the illness.',
 ingredient:'Tomato is an important ingredient in the sauce.',
 recipe:'I followed the recipe carefully.',
 traditional:'We served traditional food at the family celebration.',
 flavour:'This soup has a rich flavour.',
 portion:'He ordered a small portion of rice.',
 hospitality:'The visitors thanked the family for their warm hospitality.',
 assignment:'I submitted my English assignment yesterday.',
 feedback:'The teacher gave me useful feedback on my paragraph.',
 revise:'I need to revise these words before the test.',
 progress:'Daily practice helped me make steady progress.',
 strategy:'My reading strategy is to look for the main idea first.',
 concentrate:'I can concentrate better in a quiet room.',
 budget:'We made a monthly budget before spending the money.',
 profit:'The business made a small profit this month.',
 expense:'Transport is one of my biggest monthly expenses.',
 customer:'The customer asked for more information about the service.',
 invest:'They plan to invest in new equipment next year.',
 afford:'I cannot afford that laptop at the moment.',
 waste:'We should reduce food waste.',
 recycle:'Our school collects bottles so we can recycle them.',
 pollution:'Traffic can cause serious air pollution.',
 conserve:'We must conserve water during the dry season.',
 climate:'The region has a hot, dry climate.',
 resource:'Water is an important natural resource.',
 relative:'One of my relatives lives in Hargeisa.',
 supportive:'My family was very supportive when I started university.',
 generation:'My grandparents belong to an older generation.',
 relationship:'Trust is important in any strong relationship.',
 respect:'Good teamwork depends on mutual respect.',
 dependable:'She is dependable and always finishes her work on time.',
 headline:'The headline made me want to read the full news story.',
 source:'Always check the source before sharing a news story.',
 report:'The journalist published a report about the event.',
 claim:'The article makes a claim that needs stronger evidence.',
 bias:'Good readers look for possible bias in a news report.',
 verify:'We should verify the information before we share it.',
 stamina:'Regular training can improve your stamina.',
 routine:'Walking is part of my morning routine.',
 stretch:'Remember to stretch before you start running.',
 pace:'She kept a steady pace throughout the race.',
 consistent:'His training has been consistent for three months.',
 crowded:'The city centre is crowded during the morning rush hour.',
 convenient:'Online banking is convenient for many customers.',
 peaceful:'The countryside is quiet and peaceful at night.',
 commute:'Her daily commute takes about forty minutes.',
 facility:'The new sports facility has a gym and a swimming pool.',
 traffic:'Heavy traffic made us late for the meeting.',
 ambition:'Her ambition is to become a doctor.',
 goal:'My goal is to speak English more confidently.',
 achieve:'You can achieve your goal with regular practice.',
 opportunity:'This course is a good opportunity to improve my skills.',
 plan:'Our plan is to finish the project by Friday.',
 motivation:'Seeing my progress gives me motivation to continue.',
 evidence:'The police collected evidence from the scene.',
 witness:'A witness described what happened to the police.',
 law:'Everyone must follow the law.',
 investigate:'The police will investigate the incident carefully.',
 court:'The case will be heard in court next week.',
 fair:'The teacher made a fair decision.',
 research:'The students are doing research for their science project.',
 experiment:'The class carried out a simple experiment.',
 innovation:'Mobile banking was an important innovation for many communities.',
 develop:'The team wants to develop a better learning tool.',
 performance:'The audience enjoyed the final performance.',
 audience:'The audience clapped at the end of the play.',
 creative:'She found a creative way to explain the idea.',
 review:'I read a positive review of the film.',
 character:'My favourite character in the story is the teacher.',
 plot:'The plot becomes more exciting near the end of the film.',
 poverty:'Education can help communities reduce poverty.',
 access:'Many learners need better access to digital resources.',
 conflict:'The two groups are trying to resolve the conflict peacefully.',
 aid:'Emergency aid arrived after the floods.',
 inequality:'The report discusses inequality in access to education.',
 sustainable:'Solar power can be part of a sustainable energy plan.',
 leisure:'I enjoy reading during my leisure time.',
 collect:'My brother likes to collect old coins.',
 relaxing:'Listening to quiet music is relaxing for me.',
 skill:'Speaking clearly is an important communication skill.',
 join:'I decided to join the school football club.',
 identity:'Language can be an important part of cultural identity.',
 tradition:'Sharing food with guests is an important family tradition.',
 heritage:'The museum protects the region’s cultural heritage.',
 belong:'Children want to feel that they belong in their community.',
 custom:'Removing your shoes before entering is a common custom in some homes.',
 preserve:'The community is working to preserve its historic buildings.',
 option:'Taking the morning class is one possible option.',
 consequence:'Every major decision can have an unexpected consequence.',
 consider:'We should consider the cost before making a decision.',
 compare:'Compare the two options before you choose.',
 decide:'We need to decide which plan is more practical.',
 reflect:'Take a minute to reflect on what you learned.',
 strength:'Clear communication is one of her main strengths.',
 challenge:'Speaking without preparation is still a challenge for me.',
 improve:'Daily practice can improve your pronunciation.',
 'next step':'My next step is to practise the lesson again.'
};

function warm(level,topic){
 const t=topic.toLowerCase();
 if(level==='A1')return[
  'What do you know about '+t+'?',
  'Is this topic part of your daily life?',
  'What is one English word you know about it?',
  'Do you like talking about this topic?',
  'Ask a partner one simple question about '+t+'.'
 ];
 if(level==='A2')return[
  'What experience do you have with '+t+'?',
  'What is easy or difficult about this topic?',
  'When did you last discuss it?',
  'What would you like to know more about?',
  'Ask a partner one follow-up question.'
 ];
 if(level==='B1')return[
  'What is one important issue connected to '+t+'?',
  'Describe a recent experience related to it.',
  'What usually makes this topic difficult?',
  'What decision do people often need to make?',
  'Compare your answer with a partner and ask why.'
 ];
 return[
  'What assumption do people often make about '+t+'?',
  'Which part of the topic deserves closer examination?',
  'What evidence would you want before reaching a conclusion?',
  'How might two reasonable people interpret the issue differently?',
  'Summarise a partner’s view before giving your own.'
 ];
}

function canDo(level,topic){
 const t=topic.toLowerCase();
 if(level==='A1')return'Talk about '+t+' using short, clear sentences and ask one simple follow-up question.';
 if(level==='A2')return'Handle a familiar conversation about '+t+', connect ideas and ask for clarification when needed.';
 if(level==='B1')return'Explain and justify a viewpoint about '+t+', respond to follow-up questions and summarise another person’s main point.';
 return'Discuss '+t+' with precision, qualify a claim, evaluate evidence and synthesise another person’s viewpoint for a different audience.';
}

function useful(level){
 if(level==='A1')return['I think ...','How about you?','Could you repeat that?'];
 if(level==='A2')return['In my experience, ...','What do you mean?','That sounds ...'];
 if(level==='B1')return['From my point of view, ...','The main reason is ...','Could you explain what you mean?'];
 return['A useful distinction is ...','To put that another way, ...','What I would question is ...'];
}

function texts(level,topic,data){
 const s=data.s,p=s[0],place=s[1],goal=s[2],challenge=s[3],action=s[4],result=s[5],t=topic.toLowerCase();
 if(level==='A1')return{
  reading:p+' is at '+place+'. '+p+' wants to '+goal+'. At first, '+challenge+'. '+p+' decides to '+action+'. This helps. After that, '+result+'. '+p+' tells a classmate what happened and gives one simple reason for the choice.',
  audio:p+' is learning about '+t+'. The goal is to '+goal+'. There is a problem because '+challenge+'. '+p+' chooses to '+action+'. In the end, '+result+'.'
 };
 if(level==='A2')return{
  reading:p+' is learning about '+t+' at '+place+'. The main goal is to '+goal+'. At first, '+challenge+'. Instead of giving up, '+p+' decides to '+action+'. The choice improves the situation and '+result+'. Afterwards, '+p+' explains what happened to another learner and says why the action helped. The experience shows that simple planning and clear communication can make an everyday problem easier to manage.',
  audio:'At '+place+', '+p+' has a practical goal: '+goal+'. The situation becomes difficult because '+challenge+'. '+p+' considers what to do and chooses to '+action+'. This leads to a useful result: '+result+'. Later, '+p+' explains the sequence to a classmate.'
 };
 if(level==='B1')return{
  reading:p+' takes part in an activity about '+t+' at '+place+'. The goal is to '+goal+', but the situation becomes less predictable when '+challenge+'. Rather than reacting immediately, '+p+' identifies the main problem and decides to '+action+'. The decision works reasonably well: '+result+'. Later, '+p+' explains the experience to a small group, gives reasons for the choice and answers follow-up questions. The group also considers one alternative and discusses what might have changed if a different decision had been made. By the end, the group has separated facts from opinions and agreed on one lesson that could be useful in a similar situation.',
  audio:'During a discussion on '+t+', '+p+' describes a recent experience at '+place+'. The original aim was to '+goal+'. A complication appeared because '+challenge+'. After considering the options, '+p+' chose to '+action+'. As a result, '+result+'. The speaker then explains why that option was practical and identifies one lesson for a similar future situation.'
 };
 return{
  reading:'A discussion at '+place+' gives '+p+' an opportunity to examine a realistic issue connected to '+t+'. The immediate objective is to '+goal+'; however, the task becomes more complex when '+challenge+'. The difficulty is not simply operational. It also requires '+p+' to decide which information deserves priority, how much uncertainty can be tolerated and how the decision should be explained to others. Rather than responding impulsively, '+p+' chooses to '+action+'. That intervention produces a measurable improvement: '+result+'. In the follow-up discussion, participants challenge the assumption that one successful action automatically provides a universal solution. They distinguish between what worked in this particular context and what could reasonably be transferred elsewhere. '+p+' therefore reframes the experience as evidence rather than proof, acknowledges one limitation and summarises the reasoning for an audience that was not present. The final conclusion is deliberately qualified: sound decisions depend on interpreting evidence, communicating uncertainty and adapting an explanation to the listener.',
  audio:'In an extended conversation about '+t+', '+p+' revisits a situation at '+place+'. The objective had been to '+goal+', yet the task became difficult because '+challenge+'. '+p+' considered several responses before deciding to '+action+'. The result was positive: '+result+'. What matters in the discussion, however, is not the result alone. '+p+' explains the assumptions behind the decision, acknowledges one limitation and responds to a colleague who proposes a different interpretation. The speakers eventually agree that the action was appropriate in context, while recognising that the same response should not be applied mechanically in every case. Their final summary separates evidence, inference and recommendation.'
 };
}

function mission(level,topic){
 const t=topic.toLowerCase();
 if(level==='A1')return'Talk to a partner for one minute about '+t+'. Use two target words and ask one follow-up question.';
 if(level==='A2')return'Have a two-minute conversation about '+t+'. Give a reason, react to your partner and ask at least two follow-up questions.';
 if(level==='B1')return'Discuss a realistic situation connected to '+t+'. Explain your choice, give a reason and example, then summarise your partner’s view.';
 return'Evaluate a realistic issue connected to '+t+'. State and qualify your position, respond to a counterpoint, then synthesise the strongest points for another audience.';
}

function reflection(level){
 if(level==='A1')return[
  'I used simple English without reading a script.',
  'I used at least two target words.',
  'I asked one follow-up question.',
  'I can say what I still need to practise.'
 ];
 if(level==='A2')return[
  'I connected my ideas with simple linkers.',
  'I reacted to another speaker.',
  'I asked for clarification when needed.',
  'I can identify one next step.'
 ];
 if(level==='B1')return[
  'I explained a reason and example.',
  'I kept the conversation moving with follow-up questions.',
  'I summarised another person’s main point.',
  'I can identify one correction to retry.'
 ];
 return[
  'I qualified a claim instead of overstating it.',
  'I distinguished evidence from interpretation.',
  'I adapted my explanation to the listener.',
  'I can identify one precision or register improvement.'
 ];
}

function vocabularyRows(topic,data){
 return data.v.map(function(v){
  const example=VOCAB_USAGE[v[0]];
  if(!example)throw new Error('Missing CEFR vocabulary usage example: '+v[0]+' · '+topic);
  return v[0]+' — '+v[1]+'. Example: '+example;
 }).join('\n');
}

function a2VocabularyRows(lesson){
 const meaningItems=(lesson.vocabulary?.items||[]).filter(item=>item?.tag==='vocabulary:meaning');
 return (lesson.targetVocabulary||[]).map(function(word,index){
  const source=meaningItems[index],meaning=String(source?.answer||'').trim()||(typeof vocabMeaning==='function'?vocabMeaning(word):word);
  const example=String(source?.example||'').trim()||(typeof lessonVocabExample==='function'?lessonVocabExample(word,lesson):'Use this word in a sentence about '+lesson.title.toLowerCase()+'.');
  return word+' — '+meaning+'. Example: '+example;
 }).join('\n');
}
function a2GrammarModel(item){
 const prompt=String(item?.q||''),answer=String(item?.answer||'');
 if(prompt.includes('___'))return prompt.replace('___',answer);
 if(answer.split(/\s+/).length>=3)return answer;
 return prompt+' → '+answer;
}
function a2LessonContent(lesson){
 const topic=lesson.title,w=warm('A2',topic),reading=(lesson.listening?.readingText||''),audio=(lesson.listening?.audioScript||lesson.listening?.text||''),speakerMarker=(lesson.listening?.speakers||[]).map(x=>x.name+'='+x.gender+(x.voice?'='+x.voice:'')).join('|');
 const rqs=(lesson.listening?.questions||[]).filter(q=>String(q.tag||'').startsWith('reading:')).slice(0,4);
 const lqs=(lesson.listening?.questions||[]).filter(q=>String(q.tag||'').startsWith('listening:')).slice(0,4);
 const grammarExamples=(lesson.grammar?.items||[]).slice(0,3).map(q=>'• '+a2GrammarModel(q));
 const useful=[...(lesson.chunks||[]),...(lesson.interactionExpressions||[])].slice(0,6);
 return[
  'LESSON '+lesson.number+' '+topic,
  'CAN-DO GOAL: '+lesson.outcome,
  'PAGE 1 — WARM UP',
  'FOUNDATION',
  lesson.foundation,
  'Think & Talk',
  w.map(function(q,i){return(i+1)+'. '+q}).join('\n'),
  'SPEAKING STARTER',
  'Work with a partner. Use keywords only. Give a short answer, react, then ask one follow-up question.',
  '',
  'PAGE 2 — VOCABULARY',
  'Talking About '+topic,
  'WORD — MEANING — EXAMPLE',
  a2VocabularyRows(lesson),
  'Useful Expressions',
  useful.map(x=>'• '+x).join('\n'),
  'PRONUNCIATION FOCUS',
  lesson.pronunciation,
  '',
  'PAGE 3 — READING',
  'READ',
  reading,
  'Check Your Understanding',
  rqs.map(function(q,i){return(i+1)+'. '+q.q}).join('\n'),
  'A2 LIFT',
  lesson.a2Lift,
  '',
  'PAGE 4 — LANGUAGE FOCUS',
  lesson.grammar.focus,
  lesson.grammar.rule,
  'Examples from today’s grammar practice',
  grammarExamples.join('\n'),
  'Make it personal',
  'Say two true sentences connected to '+topic.toLowerCase()+'. Then explain why your grammar form matches your meaning.',
  '',
  'PAGE 5 — LISTENING',
  'Listen without reading first.',
  speakerMarker?'AUDIO SPEAKERS: '+speakerMarker:'',
  'AUDIO SCRIPT',
  audio,
  'After listening',
  lqs.map(function(q,i){return(i+1)+'. '+q.q}).join('\n'),
  'MEDIATION MOVE',
  lesson.mediation,
  '',
  'PAGE 6 — FLUENCY MISSION',
  'YOUR MISSION',
  lesson.performance,
  'Communication jobs',
  (lesson.functions||[]).map(x=>'• '+x).join('\n'),
  'Success means',
  '• I communicate the main message without reading a full script.',
  '• I use at least two useful words or expressions from the lesson.',
  '• I react to my partner and ask a follow-up question.',
  '• I repair one unclear sentence and try it again.',
  '',
  'PAGE 7 — CLASSROOM CHALLENGE',
  'GRAMMAR RELAY',
  'Open the matching Grammar workbook activity.',
  'Complete Questions 1–5 together in class.',
  'For every answer:',
  '1. Choose the answer.',
  '2. Check it with EnglishGate.',
  '3. One student explains why the answer matches the intended meaning.',
  '4. If it is wrong, repair the sentence and explain the reason again.',
  'Finish this challenge before Reflection.',
  '',
  'PAGE 8 — REFLECTION',
  'Today I can...',
  '☐ '+lesson.outcome,
  '☐ I can use today’s grammar to express the intended meaning.',
  '☐ I can use at least two target words or expressions.',
  '☐ I can explain one idea from a partner in my own words.',
  'One sentence I used well:',
  '____________________________',
  'One correction I will retry:',
  '____________________________',
  'One useful expression I want to remember:',
  '____________________________'
 ].join('\n');
}

function lessonContent(level,lesson){
 if(level==='A2'&&lesson.standardVersion==='a2-living-standard-v1')return a2LessonContent(lesson);
 const topic=lesson.title,data=TOPIC_LIBRARY[topic],focus=lesson.grammar.focus;
 const w=warm(level,topic),u=useful(level),tx=texts(level,topic,data),r=reflection(level);
 return[
  'LESSON '+lesson.number+' '+topic,
  'CAN-DO GOAL: '+canDo(level,topic),
  'PAGE 1 — WARM UP',
  'Think & Talk',
  w.map(function(q,i){return(i+1)+'. '+q}).join('\n'),
  'SPEAKING STARTER',
  'Work with a partner. Keep notes to keywords only; do not write a full script.',
  '',
  'PAGE 2 — VOCABULARY',
  'Talking About '+topic,
  'WORD — MEANING — EXAMPLE',
  vocabularyRows(topic,data),
  'Useful Expressions',
  u.map(function(x){return'• '+x}).join('\n'),
  'Pronunciation',
  'Listen to your teacher, notice the stressed words, then repeat one complete example naturally.',
  '',
  'PAGE 3 — READING',
  'READ',
  tx.reading,
  'Check Your Understanding',
  '1. Who is the main person?',
  '2. What is the main goal?',
  '3. What problem appears?',
  '4. What action is taken?',
  '5. What result follows?',
  '6. What lesson can be transferred to another situation?',
  '',
  'PAGE 4 — LANGUAGE FOCUS',
  focus,
  'Meaning first: choose the form that matches what you want to say.',
  'Teacher model',
  '• Read two examples from the matching workbook Grammar page.',
  '• Ask: What does each sentence mean?',
  '• Ask: Why is this form correct here?',
  'Student practice',
  'Create two examples about '+topic.toLowerCase()+'. One partner listens for meaning; the other checks the form.',
  '',
  'PAGE 5 — LISTENING',
  'Listen without reading first.',
  'AUDIO SCRIPT',
  tx.audio,
  'After listening',
  '1. What was the speaker trying to do?',
  '2. What made the situation difficult?',
  '3. What action was chosen?',
  '4. What was the result?',
  '5. Which detail best explains the speaker’s reasoning?',
  'Pair check',
  'Compare answers and explain the evidence you heard.',
  '',
  'PAGE 6 — FLUENCY MISSION',
  'YOUR MISSION',
  mission(level,topic),
  'Success means',
  '• communicate the main message without a full script',
  '• use today’s target language',
  '• react to what another person says',
  '• repair one unclear sentence and try it again',
  '',
  'PAGE 7 — CLASSROOM CHALLENGE',
  'GRAMMAR RELAY',
  'Open the matching Grammar workbook activity on screen.',
  'Complete Questions 1–5 together in class.',
  'For every answer:',
  '1. Choose the answer.',
  '2. Check it with EnglishGate.',
  '3. One student explains why that answer matches the intended meaning.',
  '4. If the answer is wrong, repair the sentence and explain the reason again.',
  'Finish this challenge before Reflection.',
  '',
  'PAGE 8 — REFLECTION',
  'Today I can...',
  r.map(function(x){return'☐ '+x}).join('\n'),
  'One sentence I used well:',
  '____________________________',
  'One correction I will retry:',
  '____________________________',
  'One useful expression I want to remember:',
  '____________________________'
 ].join('\n');
}

window.LIVE_BOOKS=window.LIVE_BOOKS||{};
LEVELS.forEach(function(level){
 const id='speakup-'+level.toLowerCase(),book=BOOK_PACKS[id];
 if(!book||book.lessons.length!==22)throw new Error('EnglishGate CEFR live book cannot load: '+id);
 window.LIVE_BOOKS[id]={
  title:book.title,
  lessons:book.lessons.map(function(lesson){
   return{number:lesson.number,title:lesson.title,content:lessonContent(level,{...lesson,standardVersion:book.standardVersion||lesson.standardVersion})};
  })
 };
});
const legacyA2=BOOK_PACKS['speakup-a2-b1'];
if(legacyA2?.standardVersion==='a2-living-standard-v1'){
 window.LIVE_BOOKS['speakup-a2-b1']={
  title:legacyA2.title,
  lessons:legacyA2.lessons.map(lesson=>({number:lesson.number,title:lesson.title,content:a2LessonContent(lesson)}))
 };
}
})();