(function(){
'use strict';
const A1_VERSION='a1-foundation-44-v1';
const A1_SPEAKERS={
 Amina:{gender:'female',voice:'coral'},Hodan:{gender:'female',voice:'coral'},Maryan:{gender:'female',voice:'nova'},Rahma:{gender:'female',voice:'coral'},
 Sahra:{gender:'female',voice:'nova'},Nimo:{gender:'female',voice:'nova'},Fadumo:{gender:'female',voice:'coral'},Anisa:{gender:'female',voice:'shimmer'},
 Leyla:{gender:'female',voice:'shimmer'},Samira:{gender:'female',voice:'shimmer'},Zahra:{gender:'female',voice:'nova'},Nasra:{gender:'female',voice:'nova'},
 Yusuf:{gender:'male',voice:'echo'},Abdi:{gender:'male',voice:'ash'},Hassan:{gender:'male',voice:'onyx'},Khalid:{gender:'male',voice:'echo'},
 Omar:{gender:'male',voice:'onyx'},Bilal:{gender:'male',voice:'echo'},Farah:{gender:'male',voice:'onyx'},Hamza:{gender:'male',voice:'onyx'},Ismail:{gender:'male',voice:'echo'}
};
function q(text,options,answer,tag){return{q:text,options,answer,tag}}
function phaseFor(n){return n<=11?1:n<=22?2:n<=33?3:4}
function wordRange(n){return n<=11?[25,60]:n<=22?[45,80]:n<=33?[60,100]:[70,110]}
function grammarRule(focus){
 const f=String(focus||'').toLowerCase();
 if(f.includes('demonstrative'))return'Use this/these for things near you and that/those for things farther away. This/that are singular; these/those are plural.';
 if(f.includes('possessive'))return'Use my, your, his, her, our and their before a noun to show who something belongs to.';
 if(f.includes('imperative'))return'Use the base verb to give a simple instruction. Add please to make an instruction more polite.';
 if(f.includes('there is'))return'Use there is with one thing and there are with more than one thing.';
 if(f.includes('preposition'))return'Use place words such as next to, opposite, between, near and behind to say where something is.';
 if(f.includes('present continuous'))return'Use am/is/are + verb-ing for actions happening now or around now.';
 if(f.includes('present simple vs'))return'Use the present simple for routines and the present continuous for actions happening now or temporary situations.';
 if(f.includes('countable'))return'Countable nouns can use numbers and a/an; uncountable nouns are usually talked about as an amount.';
 if(f.includes('some / any'))return'Use some mainly in positive statements and many offers or requests; use any mainly in questions and negative statements.';
 if(f.includes('was / were')||f.includes('past simple of be'))return'Use was with I/he/she/it and were with you/we/they to talk about past states and locations.';
 if(f.includes('past simple'))return'Use the past simple for finished actions in a finished past time.';
 if(f.includes('going to'))return'Use am/is/are going to + base verb for a plan or intention.';
 if(f.includes('would you like')||f.includes('invitation'))return'Use Would you like to ...? to invite someone politely.';
 if(f.includes('comparative'))return'Use comparative forms such as bigger, cheaper and better + than to compare two things.';
 if(f.includes('superlative'))return'Use the + superlative, such as the cheapest or the best, to compare one thing with all the others in a group.';
 if(f.includes('should'))return'Use should + base verb for advice and should not when advising someone not to do something.';
 if(f.includes('can'))return'Use can + base verb for ability or a possible action. Use cannot/can’t for no ability or possibility.';
 if(f.includes('frequency'))return'Use always, usually, often, sometimes and never with the present simple to say how often something happens.';
 if(f.includes('present simple'))return'Use the present simple for routines, repeated actions and stable facts.';
 if(f.includes('have / has'))return'Use have with I/you/we/they and has with he/she/it.';
 if(f.includes('be:')||f.includes('be questions')||f.includes('be +'))return'Use am with I, is with he/she/it, and are with you/we/they. Put am/is/are before the subject to make a question.';
 if(f.includes('question')||f.includes('spell'))return'Use the correct question word and word order. Put the helping verb or form of be before the subject when needed.';
 return'Choose the simplest accurate form that matches the meaning and time.';
}
function g(text,answer,a,b,tag='grammar:accuracy'){return q(text,[answer,a,b],answer,tag)}
function basicBe(){return[
 g('Complete: I ___ a student.','am','is','are'),g('Complete: She ___ new.','is','am','are'),g('Complete: They ___ classmates.','are','is','am'),
 g('Choose the correct negative.','He is not a teacher.','He not is a teacher.','He are not a teacher.'),
 g('Choose the correct question.','Are you a student?','You are a student?','Is you a student?','grammar:question'),
 g('Complete: We ___ from Borama.','are','is','am'),g('Repair: She are friendly.','She is friendly.','She am friendly.','She be friendly.','grammar:repair'),
 g('Which sentence is correct?','I am new here.','I is new here.','I are new here.','grammar:perform')
]}
function haveHas(){return[
 g('Complete: I ___ a phone.','have','has','having'),g('Complete: She ___ two notebooks.','has','have','having'),g('Complete: They ___ a class today.','have','has','is'),
 g('Choose the correct negative.','He does not have a pen.','He does not has a pen.','He not have a pen.'),
 g('Choose the correct question.','Do you have a book?','Have you a book do?','Does you have a book?','grammar:question'),
 g('Choose the correct sentence.','My sister has a blue bag.','My sister have a blue bag.','My sister having a blue bag.'),
 g('Repair: They has two keys.','They have two keys.','They has two keys.','They are two keys.','grammar:repair'),
 g('Which sentence can describe possessions?','I have a phone and two books.','I has a phone.','I am have two books.','grammar:perform')
]}
function imperatives(){return[
 g('Choose the instruction.','Open your book.','You opening your book.','Opens your book.'),g('Choose the polite instruction.','Please sit down.','Please you sitting down.','Please sits down.'),
 g('Complete: ___ carefully.','Listen','Listens','Listening'),g('Complete: ___ your answer.','Write','Writes','Writing'),
 g('Choose the negative instruction.','Do not close the book.','Not close the book.','Do not closes the book.'),
 g('Repair: Repeats the sentence.','Repeat the sentence.','Repeating the sentence.','You repeats the sentence.','grammar:repair'),
 g('Choose the best direction.','Turn left at the bank.','Turns left at the bank.','Turning left at bank.'),
 g('Which form gives a clear instruction?','Read the first paragraph.','You are read first paragraph.','Reads the first paragraph.','grammar:perform')
]}
function possessives(){return[
 g('Amina has a book. It is ___ book.','her','his','their'),g('Yusuf has a phone. It is ___ phone.','his','her','our'),g('We have a class. It is ___ class.','our','their','his'),
 g('Choose the correct sentence.','Their parents live in Borama.','They parents live in Borama.','Them parents live in Borama.'),
 g('Complete: I have a sister. ___ name is Amina.','Her','His','Their'),g('Complete: They have a house. ___ house is small.','Their','Our','Her'),
 g('Repair: She brother is Bilal.','Her brother is Bilal.','His brother is Bilal.','She brother Bilal.','grammar:repair'),
 g('Which sentence is correct?','My father is a driver.','Me father is a driver.','I father is driver.','grammar:perform')
]}
function demonstratives(){return[
 g('One book near you: ___ book.','this','these','those'),g('Two pens near you: ___ pens.','these','this','that'),g('One chair far from you: ___ chair.','that','these','this'),
 g('Three bags far from you: ___ bags.','those','that','this'),g('Choose the correct sentence.','These are my keys.','This are my keys.','These is my keys.'),
 g('Choose the correct singular sentence.','That is a table.','Those is a table.','These is a table.'),
 g('Repair: This are my books.','These are my books.','This is my books.','Those is my books.','grammar:repair'),
 g('Which sentence is correct for two objects near you?','These pens are blue.','This pens are blue.','Those pen is blue.','grammar:perform')
]}
function thereIsAre(){return[
 g('Complete: There ___ a table in the kitchen.','is','are','be'),g('Complete: There ___ two bedrooms.','are','is','be'),
 g('Choose the question for one thing.','Is there a bathroom?','Are there a bathroom?','There is a bathroom?','grammar:question'),
 g('Choose the question for plural things.','Are there any chairs?','Is there any chairs?','Do there chairs?','grammar:question'),
 g('Choose the negative.','There is not a television.','There are not a television.','There no television is.'),
 g('Choose the plural negative.','There are not any books.','There is not any books.','There not are books.'),
 g('Repair: There is three rooms.','There are three rooms.','There is three rooms.','There be three rooms.','grammar:repair'),
 g('Which sentence describes a home correctly?','There are two bedrooms and there is one kitchen.','There is two bedrooms and there are one kitchen.','There two bedrooms is one kitchen.','grammar:perform')
]}
function placePreps(){return[
 g('The shop is ___ the bank and the café.','between','behind','on'),g('The school is ___ the mosque; they face each other.','opposite','between','inside'),
 g('The bus stop is ___ the bank. It is beside it.','next to','behind','between'),g('The car park is ___ the building.','behind','opposite','between'),
 g('Choose the correct sentence.','The market is near my house.','The market near is my house.','The market is between my house alone.'),
 g('Choose the best location phrase.','on the corner','at between','behind to'),g('Repair: The café is next the bank.','The café is next to the bank.','The café is next the bank.','The café next to is bank.','grammar:repair'),
 g('Which sentence clearly gives a location?','The library is opposite the school.','The library opposite is school.','The library are opposite school.','grammar:perform')
]}
function presentContinuous(){return[
 g('Complete: I ___ reading now.','am','is','are'),g('Complete: She ___ studying now.','is','am','are'),g('Complete: They ___ waiting for the bus.','are','is','am'),
 g('Choose the correct form.','He is working.','He is work.','He working is.'),g('Choose the correct question.','What are you doing?','What you are doing?','What do you doing?','grammar:question'),
 g('Choose the negative.','She is not sleeping.','She does not sleeping.','She not is sleep.'),
 g('Repair: We is talking now.','We are talking now.','We is talking now.','We are talk now.','grammar:repair'),
 g('Which sentence is about now?','I am studying now.','I study every Monday.','I studied yesterday.','grammar:perform')
]}
function pastBe(){return[
 g('Yesterday I ___ at home.','was','were','am'),g('They ___ at school yesterday.','were','was','are'),g('She ___ tired last night.','was','were','is'),
 g('Choose the question.','Where were you yesterday?','Where was you yesterday?','Where you were yesterday?','grammar:question'),
 g('Choose the negative.','He was not at work.','He did not was at work.','He not were at work.'),
 g('Choose the plural sentence.','We were busy yesterday.','We was busy yesterday.','We are busy yesterday.'),
 g('Repair: They was at the café.','They were at the café.','They was at the café.','They are at the café yesterday.','grammar:repair'),
 g('Which sentence is clearly about the past?','The shop was closed yesterday.','The shop is closed tomorrow.','The shop were closed today.','grammar:perform')
]}
function countable(){return[
 g('Which noun is countable?','apple','water','rice'),g('Which noun is usually uncountable?','milk','egg','apple'),g('Choose the correct phrase.','two eggs','two rice','two milk'),
 g('Choose the natural phrase.','some water','a water','three water'),g('Choose the correct sentence.','I have an apple.','I have a rice.','I have two milk.'),
 g('Choose the correct plural.','three bottles','three bottle','three breads of bottle'),g('Repair: I need two water.','I need two bottles of water.','I need two water.','I need a waters.','grammar:repair'),
 g('Which sentence is accurate?','We have some rice and three apples.','We have a rice and three apple.','We has some rices.','grammar:perform')
]}
function someAny(){return[
 g('Positive: We have ___ bread.','some','any','an'),g('Question: Do you have ___ apples?','any','some','a'),g('Negative: We do not have ___ milk.','any','some','many'),
 g('Choose the polite request.','Can I have some water?','Can I have any water some?','Can I has water?'),
 g('Choose the correct sentence.','There are some bottles on the shelf.','There is some bottles on shelf.','There are any bottle on shelf.'),
 g('Choose the correct question.','Is there any rice?','Are there any rice?','Is there some rices?','grammar:question'),
 g('Repair: We do not have some bread.','We do not have any bread.','We do not have some bread.','We not have any breads.','grammar:repair'),
 g('Which sentence sounds natural in a shop?','I would like some rice, please.','I would like any rice please.','I like some rice to.','grammar:perform')
]}
function spellingQs(){return[
 g('Choose the correct question.','How do you spell your name?','How you spell your name?','How does you spell name?','grammar:question'),
 g('Choose the correct response.','It is H-O-D-A-N.','It H-O-D-A-N is.','I am spell H-O-D-A-N.'),
 g('Choose the polite request.','Can you repeat that?','Can repeat you that?','You can repeating that?'),
 g('Complete: What ___ your first name?','is','are','do'),g('Complete: What ___ your last name?','is','are','does'),
 g('Choose the correct sentence.','My first name is Hodan.','My first name are Hodan.','My first name Hodan is are.'),
 g('Repair: How you spell it?','How do you spell it?','How you spell it?','How does spell it?','grammar:repair'),
 g('Which question checks one unclear letter?','Was that B or D?','That was B D?','Were that B or D?','grammar:perform')
]}
function a1GrammarItems(focus){
 const f=String(focus||'').toLowerCase();
 if(f.includes('demonstrative'))return demonstratives();
 if(f.includes('possessive'))return possessives();
 if(f.includes('imperative'))return imperatives();
 if(f.includes('there is'))return thereIsAre();
 if(f.includes('preposition'))return placePreps();
 if(f.includes('present continuous'))return presentContinuous();
 if(f.includes('countable'))return countable();
 if(f.includes('some / any'))return someAny();
 if(f.includes('was / were')||f.includes('past simple of be'))return pastBe();
 if(f.includes('have / has'))return haveHas();
 if(f.includes('spell'))return spellingQs();
 if(f.includes('be:')||f.includes('be questions')||f.includes('be +'))return basicBe();
 return typeof grammarQuestions==='function'?grammarQuestions(focus).slice(0,8):basicBe();
}
function vocabItems(spec){
 const words=spec.v.map(x=>x[0]),defs=spec.v.map(x=>x[1]);
 const opts=(arr,i)=>[arr[i],arr[(i+1)%arr.length],arr[(i+2)%arr.length]];
 return{items:[
  q('Which word means “'+defs[0]+'”?',opts(words,0),words[0],'vocabulary:meaning'),
  q('Which word means “'+defs[1]+'”?',opts(words,1),words[1],'vocabulary:meaning'),
  q('What does “'+words[2]+'” mean?',opts(defs,2),defs[2],'vocabulary:reverse-meaning'),
  q('What does “'+words[3]+'” mean?',opts(defs,3),defs[3],'vocabulary:reverse-meaning'),
  q('Choose the best word for this idea: '+defs[4]+'.',opts(words,4),words[4],'vocabulary:context'),
  q('Choose the best word for this idea: '+defs[5]+'.',opts(words,5),words[5],'vocabulary:context'),
  q('Which example uses “'+words[0]+'” naturally?',[spec.v[0][2],'This sentence does not use the word correctly.','The word is not used in this option.'],spec.v[0][2],'vocabulary:application'),
  q('Which example uses “'+words[1]+'” naturally?',[spec.v[1][2],'This sentence does not use the word correctly.','The word is not used in this option.'],spec.v[1][2],'vocabulary:application'),
  {type:'exact',q:'Type the target word that means: '+defs[4]+'.',answer:words[4],min:1,tag:'vocabulary:recall'},
  {type:'open',q:'Write one simple sentence using “'+words[5]+'”.',answer:'',min:5,tag:'vocabulary:production'}
 ]};
}
function readingQs(spec){
 const x=spec.r;
 return[
  q('Who is the reading mainly about?',[x.who,'A visitor who is not mentioned','A bus driver'],x.who,'reading:detail'),
  q('Where does the reading happen or focus on?',[x.where,'an airport','a sports stadium'],x.where,'reading:detail'),
  q('What is the main idea?',[x.main,'The text gives unrelated words.','Nothing happens in the text.'],x.main,'reading:main-idea'),
  q('Which detail is correct?',[x.detail1,'The opposite is true.','This detail is not in the reading.'],x.detail1,'reading:detail'),
  q('Which other detail is correct?',[x.detail2,'The text says the opposite.','This never appears in the reading.'],x.detail2,'reading:detail'),
  x.skillQ
 ];
}
function listeningQs(spec){
 const x=spec.l,names=x.speakers.map(s=>s.name);
 return[
  q('Where does the listening situation happen?',[x.setting,'at an airport','in a stadium'],x.setting,'listening:detail'),
  q('What are the speakers mainly trying to do?',[x.purpose,'avoid speaking to each other','talk about an unrelated problem'],x.purpose,'listening:main-idea'),
  q('Which detail do you hear?',[x.detail,'The opposite detail is stated.','This is never mentioned.'],x.detail,'listening:detail'),
  q('What is the result of the conversation?',[x.result,'They end without any useful result.','They change to a completely different topic.'],x.result,'listening:result'),
  q('Who are the speakers?',[names.join(' and '),names[0]+' and an unnamed visitor','Two unnamed people'],names.join(' and '),'listening:speakers'),
  q('Which statement best describes the conversation?',['The speakers exchange clear everyday information and reach a useful understanding.','The speakers do not understand any words.','The conversation is only a vocabulary list.'],'The speakers exchange clear everyday information and reach a useful understanding.','listening:inference')
 ];
}
function makeLesson(spec,i){
 const n=i+1,range=wordRange(n);
 return{
  id:'su-a1-l'+n,number:n,title:spec.title,outcome:spec.outcome,ready:true,standardVersion:A1_VERSION,phase:phaseFor(n),readingSkill:spec.skill,
  targetVocabulary:spec.v.map(x=>x[0]),expressions:spec.u.map(text=>({text})),chunks:spec.u.slice(),interactionExpressions:spec.u.slice(0,3),
  functions:['understand familiar language','give simple information','respond to a partner'],discourse:['short complete sentences','clear turn taking','recycle earlier A1 language'],
  vocabulary:vocabItems(spec),
  listening:{title:spec.title+' · Reading & Listening',readingText:spec.r.text,audioScript:spec.l.script,text:spec.l.script,speakers:spec.l.speakers,questions:[...readingQs(spec),...listeningQs(spec)]},
  grammar:{focus:spec.focus,rule:grammarRule(spec.focus),items:a1GrammarItems(spec.focus)},
  writing:{task:spec.writing,minWords:range[0],maxWords:range[1],humanGraded:false,checkpoint:false},
  foundation:n<=11?'Core A1 foundation: recognise, locate and build simple accurate English.':n<=22?'Everyday A1: scan, understand and communicate about daily life.':n<=33?'Independent A1: connect information, sequence events and solve familiar tasks.':'A1 mastery: interpret short connected texts and prepare for A2.',
  performance:spec.performance,pronunciation:'Use clear word stress, slow natural rhythm, and complete short thought groups.',mediation:'Listen to a partner and relay one or two accurate details in simple English.',
  review:{keywords:spec.v.map(x=>x[0]).join(' · '),mission:spec.performance}
 };
}
const specs=Array.isArray(window.A1_FOUNDATION_SPECS)?window.A1_FOUNDATION_SPECS:[];
if(specs.length!==44)throw new Error('A1 Foundation must contain exactly 44 lesson specifications; found '+specs.length);
const lessons=specs.map(makeLesson);
BOOK_PACKS['speakup-a1']={id:'speakup-a1',title:'A1 Beginner',level:'A1',moduleTitle:'A1 Foundation English',moduleGoal:'Build a strong foundation through 44 lessons with deliberate recycling, growing reading independence, practical listening, core grammar and everyday communication.',totalLessons:44,lessons,standardVersion:A1_VERSION};
window.A1_FOUNDATION_STANDARD_VERSION=A1_VERSION;
})();