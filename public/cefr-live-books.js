(function(){
'use strict';

const LEVELS=['A1','A2','B1','C1'];

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
  return v[0]+' — '+v[1]+'. Example: In a discussion about '+topic.toLowerCase()+', “'+v[0]+'” expresses this idea.';
 }).join('\n');
}

function lessonContent(level,lesson){
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
   return{number:lesson.number,title:lesson.title,content:lessonContent(level,lesson)};
  })
 };
});
})();