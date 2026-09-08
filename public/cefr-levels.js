(function(){
'use strict';

const TOPICS=SPEAKUP_A2_B1_SYLLABUS.map(function(x){return x[0]});
const CONFIG={
 A1:{
  title:'A1 Beginner',
  audience:'Beginner',
  goal:'Build survival English, short everyday exchanges, basic reading and simple writing with strong support.',
  range:[30,50],
  focuses:[
   'Present Simple (be, have, like)','Present Simple for routines','Past Simple','Adverbs of Frequency + Present Simple',
   "Should / Shouldn't",'Comparatives and Superlatives','Past Simple review','Going to for future plans',
   "Have to / Don't have to",'Present Simple for people and relationships','Can / Could','Adverbs of Manner',
   'Quantifiers','Would like to / Want to + infinitive','Past Simple review','Can / Could for possibility',
   'Future Forms','Modals of Obligation','Gerunds and Infinitives','Adverbs of Frequency + Present Simple',
   'Comparatives','Mixed Review'
  ]
 },
 A2:{
  title:'A2 Elementary',
  audience:'Elementary / pre-intermediate',
  goal:'Handle familiar everyday situations with connected sentences, clearer listening and practical writing.',
  range:[50,75],
  focuses:SPEAKUP_A2_B1_SYLLABUS.map(function(x){return x[1]})
 },
 B1:{
  title:'B1 Intermediate',
  audience:'Intermediate',
  goal:'Communicate independently about familiar and less predictable situations using connected discourse and reasons.',
  range:[80,120],
  focuses:[
   'Present Simple vs Present Continuous','Present Perfect vs Past Simple','Narrative Tenses','Present Perfect Continuous',
   'Modals of Advice and Obligation','Comparatives, Superlatives, and Quantifiers','Used to / Would','First and Second Conditionals',
   'Passive Voice','Relative Clauses','Reported Speech','Modals of Ability and Possibility',
   'Gerunds and Infinitives','Future Forms','Third Conditional','Modals of Speculation and Deduction',
   'First and Second Conditionals','Passive Voice','Phrasal Verbs','Wish / If Only',
   'Question Tags and Indirect Questions','Mixed Review'
  ]
 },
 C1:{
  title:'C1 Advanced',
  audience:'Advanced',
  goal:'Develop precise, flexible communication, nuanced stance, synthesis, mediation and extended academic/professional writing.',
  range:[150,200],
  focuses:[
   'Present Perfect vs Past Simple','Present Perfect Continuous','Narrative Tenses','Present Perfect Continuous',
   'Modals of Advice and Obligation','Comparatives, Superlatives, and Quantifiers','Used to / Would','Mixed Conditionals',
   'Passive Reporting Structures','Relative Clauses','Reported Speech','Modals of Speculation and Deduction',
   'Gerunds and Infinitives','Future Forms','Third Conditional','Modals of Speculation and Deduction',
   'Mixed Conditionals','Passive Reporting Structures','Phrasal Verbs','Wish / If Only',
   'Question Tags and Indirect Questions','Mixed Review'
  ]
 }
};

function grammarRule(focus){
 const f=String(focus||'').toLowerCase();
 if(f.indexOf('present perfect continuous')>=0)return 'Use have/has been + -ing to connect an activity to the present, especially when duration or recent evidence matters.';
 if(f.indexOf('present perfect')>=0)return 'Use the present perfect for past experience or change connected to now; use the past simple when the finished past time is stated or understood.';
 if(f.indexOf('narrative')>=0||f.indexOf('past continuous')>=0)return 'Use past continuous for background, past simple for main events and past perfect when you need to show an earlier past event.';
 if(f.indexOf('past simple')>=0)return 'Use the past simple for finished events and situations in a completed past time.';
 if(f.indexOf('frequency')>=0)return 'Use frequency adverbs with the present simple to show how often something happens. Most go before the main verb but after be.';
 if(f.indexOf('present simple')>=0&&f.indexOf('continuous')>=0)return 'Use the present simple for routines and stable facts, and the present continuous for actions happening now or temporary situations.';
 if(f.indexOf('present simple')>=0)return 'Use the present simple for facts, routines, preferences and repeated actions.';
 if(f.indexOf('mixed conditional')>=0)return 'Mixed conditionals connect a condition in one time with a result in another time. Choose each tense according to the real time relationship.';
 if(f.indexOf('third conditional')>=0)return 'Use if + past perfect with would/could/might have + past participle to discuss unreal past conditions and imagined results.';
 if(f.indexOf('condition')>=0)return 'Use the first conditional for realistic future possibilities and the second conditional for hypothetical or unlikely situations.';
 if(f.indexOf('passive reporting')>=0)return 'Use reporting passives such as “It is believed that…” or “She is said to…” when the source is general, unknown or less important than the information.';
 if(f.indexOf('passive')>=0)return 'Use be + past participle when the action or result is more important than the person who performs it.';
 if(f.indexOf('reported')>=0)return 'Use reported speech to relay what another person said, adjusting tense, pronouns and time references when the context requires it.';
 if(f.indexOf('relative')>=0)return 'Use relative clauses to add identifying or extra information about a person, thing, place or idea.';
 if(f.indexOf('deduction')>=0||f.indexOf('speculation')>=0)return 'Use modal verbs such as must, might, may and can’t to show how certain or uncertain you are about an explanation.';
 if(f.indexOf('advice')>=0||f.indexOf('should')>=0)return 'Use should/shouldn’t for advice. Use stronger modals such as must or have to when an obligation is necessary.';
 if(f.indexOf('obligation')>=0||f.indexOf('have to')>=0)return 'Use must/have to for obligations and don’t have to for something that is not necessary.';
 if(f.indexOf('can / could')>=0||f.indexOf('ability')>=0||f.indexOf('possibility')>=0)return 'Use can/could and related modal forms to express ability, possibility, permission or polite requests according to context.';
 if(f.indexOf('compar')>=0||f.indexOf('superl')>=0)return 'Use comparative forms to compare two things and superlative forms to identify the highest or lowest degree in a group.';
 if(f.indexOf('quantifier')>=0)return 'Choose quantifiers according to whether the noun is countable or uncountable and the amount you want to express.';
 if(f.indexOf('gerund')>=0||f.indexOf('infinitive')>=0)return 'Some verbs and expressions are followed by -ing forms, while others are followed by to + infinitive. Learn the pattern with the expression.';
 if(f.indexOf('future')>=0||f.indexOf('going to')>=0)return 'Choose a future form according to meaning: plans and intentions, predictions, arrangements, promises or schedules.';
 if(f.indexOf('wish')>=0||f.indexOf('if only')>=0)return 'Use wish/if only to express a present situation you want to be different or a past situation you regret.';
 if(f.indexOf('question')>=0)return 'Use indirect questions when you want a more polite or less direct question; keep statement word order after the introductory phrase.';
 return 'Choose the form that best matches the intended time, relationship and meaning in the sentence.';
}

function textPair(level,title,data){
 const s=data.s,person=s[0],place=s[1],goal=s[2],challenge=s[3],action=s[4],result=s[5],topic=title.toLowerCase();
 if(level==='A1')return{
  reading:person+' is at '+place+'. '+person+' wants to '+goal+'. At first, '+challenge+'. '+person+' decides to '+action+'. This helps. After that, '+result+'. '+person+' tells a classmate what happened and gives one simple reason for the choice.',
  audio:person+' is learning about '+topic+'. The goal is to '+goal+'. There is a problem because '+challenge+'. '+person+' chooses to '+action+'. In the end, '+result+'.'
 };
 if(level==='A2')return{
  reading:person+' is learning about '+topic+' at '+place+'. The main goal is to '+goal+'. At first, '+challenge+'. Instead of giving up, '+person+' decides to '+action+'. The choice improves the situation and '+result+'. Afterwards, '+person+' explains what happened to another learner and says why the action helped. The experience shows that simple planning and clear communication can make an everyday problem easier to manage.',
  audio:'At '+place+', '+person+' has a practical goal: '+goal+'. The situation becomes difficult because '+challenge+'. '+person+' considers what to do and chooses to '+action+'. This leads to a useful result: '+result+'. Later, '+person+' explains the sequence to a classmate.'
 };
 if(level==='B1')return{
  reading:person+' takes part in an activity about '+topic+' at '+place+'. The goal is to '+goal+', but the situation becomes less predictable when '+challenge+'. Rather than reacting immediately, '+person+' identifies the main problem and decides to '+action+'. The decision works reasonably well: '+result+'. Later, '+person+' explains the experience to a small group, gives reasons for the choice and answers follow-up questions. The group also considers one alternative and discusses what might have changed if a different decision had been made.',
  audio:'During a discussion on '+topic+', '+person+' describes a recent experience at '+place+'. The original aim was to '+goal+'. A complication appeared because '+challenge+'. After considering the options, '+person+' chose to '+action+'. As a result, '+result+'. The speaker then explains why that option was practical and identifies one lesson for a similar future situation.'
 };
 return{
  reading:'A discussion at '+place+' gives '+person+' an opportunity to examine a realistic issue connected to '+topic+'. The immediate objective is to '+goal+'; however, the task becomes more complex when '+challenge+'. The difficulty requires '+person+' to decide which information deserves priority, how much uncertainty can be tolerated and how the decision should be explained to others. Rather than responding impulsively, '+person+' chooses to '+action+'. That intervention produces a measurable improvement: '+result+'. In the follow-up discussion, participants distinguish between what worked in this context and what could reasonably be transferred elsewhere. '+person+' reframes the experience as evidence rather than proof, acknowledges one limitation and summarises the reasoning for an audience that was not present.',
  audio:'In an extended conversation about '+topic+', '+person+' revisits a situation at '+place+'. The objective had been to '+goal+', yet the task became difficult because '+challenge+'. '+person+' considered several responses before deciding to '+action+'. The result was positive: '+result+'. The speaker then explains the assumptions behind the decision, acknowledges one limitation and responds to an alternative interpretation. The final summary separates evidence, inference and recommendation.'
 };
}

function comprehension(title,data){
 const s=data.s,person=s[0],place=s[1],goal=s[2],challenge=s[3],action=s[4],result=s[5];
 return[
  {q:'Who is the main person in the text?',options:[person,'A visitor','The teacher'],answer:person,tag:'listening-reading:detail'},
  {q:'Where does the situation happen?',options:[place,'a hotel lobby','a sports stadium'],answer:place,tag:'listening-reading:detail'},
  {q:'What is the main goal?',options:[goal,'avoid the topic completely','cancel the activity'],answer:goal,tag:'listening-reading:main-idea'},
  {q:'What complication appears?',options:[challenge,'there is no difficulty','everyone immediately agrees'],answer:challenge,tag:'listening-reading:detail'},
  {q:'What action does the person take?',options:[action,'ignore the situation','leave without deciding'],answer:action,tag:'listening-reading:sequence'},
  {q:'What result follows?',options:[result,'the situation becomes unrelated','nothing changes at all'],answer:result,tag:'listening-reading:detail'},
  {q:'Which happened first?',options:[challenge,action,result],answer:challenge,tag:'listening-reading:sequence'},
  {q:'Which best describes the response?',options:['The person identifies a problem and takes a purposeful action.','The person avoids making any decision.','The text only lists vocabulary.'],answer:'The person identifies a problem and takes a purposeful action.',tag:'listening-reading:inference'},
  {q:'What broader lesson is most useful?',options:['A useful response should connect evidence, purpose and action.','The fastest response is always the best response.','One solution works in every context.'],answer:'A useful response should connect evidence, purpose and action.',tag:'listening-reading:evaluation'},
  {q:'What is the main purpose of the text?',options:['To explain a challenge, response and lesson.','To advertise a product.','To give unrelated facts.'],answer:'To explain a challenge, response and lesson.',tag:'listening-reading:purpose'}
 ];
}

function finalWriting(level,title,number){
 const c=CONFIG[level],min=c.range[0],max=c.range[1],topic=title.toLowerCase(),slot=(number-1)%5;
 const common=[
  'Write a WhatsApp message about '+topic+'. Explain the situation, give useful details and ask for a response.',
  'Write an email about '+topic+'. State your purpose, explain the background and close appropriately.',
  'Write a social post about '+topic+'. Give your viewpoint, support it and invite a response.',
  'Write a connected response about your experience of '+topic+'. Explain what happened and what you learned.',
  'Write a polite request or proposal about '+topic+'. Explain the need, give a reason and state the desired outcome.'
 ];
 const advanced=[
  'Write a professional message about '+topic+'. Summarise the situation, distinguish evidence from interpretation and recommend a proportionate next step.',
  'Write a professional email about '+topic+'. Establish context, present a nuanced position, acknowledge one limitation and specify the action you want the reader to take.',
  'Write a public-facing post about '+topic+'. Present a defensible claim, qualify it appropriately, support it and anticipate one reasonable counterpoint.',
  'Write an analytical response about '+topic+'. Compare two perspectives, synthesise the strongest evidence and explain the implications for a future decision.',
  'Write a concise proposal about '+topic+'. Define the problem, justify your recommendation, address one possible objection and specify the desired outcome.'
 ];
 const task=(level==='C1'?advanced:common)[slot];
 const checkpoint=(level==='B1'||level==='C1')&&[5,10,15,18,22].indexOf(number)>=0;
 return{task:task,minWords:min,maxWords:max,humanGraded:checkpoint,checkpoint:checkpoint};
}

function expressions(level){
 const map={
  A1:['Could you repeat that?','I think ...','How about you?'],
  A2:['In my experience, ...','What do you mean?','That sounds ...'],
  B1:['From my point of view, ...','Could you explain what you mean?','That makes sense, although ...'],
  C1:['A useful distinction is ...','To put that another way, ...','What I would question is ...']
 };
 return map[level].map(function(text){return{text:text}});
}

function lesson(level,number,title,focus){
 const data=TOPIC_LIBRARY[title],pair=textPair(level,title,data);
 const x=makeLesson('su-'+level.toLowerCase(),number,title,focus,level,data);
 x.outcome=level==='A1'?'Handle a short supported exchange about '+title.toLowerCase()+' using simple, accurate language.':
  level==='A2'?'Handle a familiar everyday situation about '+title.toLowerCase()+' and connect several ideas clearly.':
  level==='B1'?'Communicate independently about '+title.toLowerCase()+', explain reasons and respond to follow-up questions.':
  'Discuss '+title.toLowerCase()+' precisely, qualify a viewpoint, synthesise information and adapt the message to audience and purpose.';
 x.targetVocabulary=data.v.map(function(v){return v[0]});
 x.expressions=expressions(level);
 x.listening={title:title+' · Reading & Listening',readingText:pair.reading,audioScript:pair.audio,text:pair.audio,questions:comprehension(title,data)};
 x.grammar={focus:focus,rule:grammarRule(focus),items:grammarQuestions(focus)};
 x.writing=finalWriting(level,title,number);
 x.foundation=level==='A1'?'Short supported phrases and model sentences.':level==='A2'?'Familiar language with sentence-level support.':level==='B1'?'Accessible B1 input with clear task structure.':'Accessible B2+/C1 bridge input before more demanding analysis.';
 x.performance='Complete a meaningful communication task about '+title.toLowerCase()+' with decreasing support.';
 x.pronunciation=level==='A1'?'Make key words clear and use simple sentence stress.':level==='A2'?'Use clear word stress and short thought groups.':level==='B1'?'Use sentence stress, pausing and connected speech to keep ideas easy to follow.':'Use stress, rhythm, pausing and intonation deliberately to signal structure and stance.';
 x.mediation=level==='A1'?'Relay one clear detail from a partner.':level==='A2'?'Summarise the main point of a partner’s short message.':level==='B1'?'Summarise and compare two people’s main points.':'Synthesize key information from more than one viewpoint for a different audience.';
 return x;
}

function build(level){
 const c=CONFIG[level];
 const lessons=TOPICS.map(function(title,i){return lesson(level,i+1,title,c.focuses[i])});
 return{id:'speakup-'+level.toLowerCase(),title:c.title,level:level,moduleTitle:c.title,moduleGoal:c.goal,totalLessons:22,lessons:lessons};
}

['A1','A2','B1','C1'].forEach(function(level){
 const book=build(level);
 BOOK_PACKS[book.id]=book;
});
})();