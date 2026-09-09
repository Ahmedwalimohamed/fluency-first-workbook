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
function speakerProfile(value){
 const name=typeof value==='string'?value:String(value?.name||''),base=A1_SPEAKERS[name];
 if(!base)throw new Error('Missing A1 speaker profile for '+name);
 return{name,gender:base.gender,voice:base.voice}
}
function lessonSpeakers(spec){return (spec?.l?.speakers||[]).map(speakerProfile)}
function phaseFor(n){return n<=11?1:n<=22?2:n<=33?3:4}
function wordRange(n){
 if(n<=3)return[10,20];
 if(n<=6)return[15,25];
 if(n<=10)return[20,30];
 if(n<=14)return[25,35];
 if(n<=18)return[30,40];
 if(n<=22)return[35,50];
 if(n<=27)return[40,55];
 if(n<=33)return[45,65];
 if(n<=38)return[55,75];
 if(n<=43)return[65,90];
 return[80,100]
}
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
function beQuestionQs(){return[
 g('Choose the age question.','How old are you?','How old you are?','How do old you?','grammar:question'),
 g('Choose the place question.','Where are you from?','Where you are from?','Where do you from?','grammar:question'),
 g('Choose the name question.','What is your name?','What your name is?','What does your name?','grammar:question'),
 g('Complete: I ___ twenty years old.','am','is','are'),g('Complete: She ___ from Hargeisa.','is','am','are'),
 g('Choose the correct answer.','I am from Borama.','I is from Borama.','I from Borama am are.'),
 g('Repair: Where you are from?','Where are you from?','Where is you from?','Where do you are from?','grammar:repair'),
 g('Which exchange is correct?','Where are you from? I am from Hargeisa.','Where you from? I is Hargeisa.','Where does you from? I are Hargeisa.','grammar:perform')
]}
function pronounBeQs(){return[
 g('Amina is friendly. ___ is friendly.','She','He','They'),g('Yusuf is quiet. ___ is quiet.','He','She','We'),
 g('Amina and Yusuf are students. ___ are students.','They','She','He'),g('The teacher and I are here. ___ are here.','We','They is','He'),
 g('Complete: She ___ helpful.','is','are','am'),g('Complete: They ___ busy.','are','is','am'),
 g('Repair: He are tall.','He is tall.','He am tall.','He be tall.','grammar:repair'),
 g('Which description is correct?','They are friendly classmates.','They is friendly classmates.','Them are friendly.','grammar:perform')
]}
function jobsQs(){return[
 g('Complete: She ___ a doctor.','is','are','am'),g('Complete: I am ___ teacher.','a','an','the two'),
 g('Complete: He is ___ office worker.','an','a','two'),g('Choose the correct question.','What do you do?','What you do?','What does you do?','grammar:question'),
 g('Choose the correct answer.','I am a driver.','I am driver a.','I is a driver.'),g('Choose the correct sentence.','She is a teacher.','She are teacher.','She is an teacher.'),
 g('Repair: He is doctor.','He is a doctor.','He a doctor is are.','He is an doctor.','grammar:repair'),
 g('Which sentence clearly describes work?','Omar is a doctor at a health centre.','Omar are doctor health centre.','Omar is an driver.','grammar:perform')
]}
function presentSimpleQs(){return[
 g('Complete: I ___ English every day.','study','studies','am studying'),g('Complete: She ___ work at eight.','starts','start','starting'),
 g('Choose the negative.','He does not work on Friday.','He does not works on Friday.','He not work on Friday.'),
 g('Choose the question.','Where do you live?','Where you live?','Where does you live?','grammar:question'),
 g('Complete: My brother ___ football.','plays','play','is play'),g('Complete: We ___ breakfast at seven.','have','has','having'),
 g('Repair: She walk to class every day.','She walks to class every day.','She walking to class every day.','She walk class every day.','grammar:repair'),
 g('Which sentence describes a routine?','I usually study in the evening.','I am studying right now yesterday.','I studied every tomorrow.','grammar:perform')
]}
function timeQs(){return[
 g('Complete: Class starts ___ eight o’clock.','at','on','in'),g('7:30 is ___.','half past seven','quarter past seven','quarter to seven'),
 g('9:15 is ___.','quarter past nine','half past nine','quarter to nine'),g('9:45 is ___.','quarter to ten','quarter past ten','half past nine'),
 g('Choose the correct question.','What time does class start?','What time class does start?','What time do class starts?','grammar:question'),
 g('Choose the correct answer.','It starts at ten o’clock.','It start in ten.','It starts on ten o’clock.'),
 g('Repair: Lunch is in twelve thirty.','Lunch is at twelve thirty.','Lunch is on twelve thirty.','Lunch at is twelve thirty.','grammar:repair'),
 g('Which sentence gives a clear schedule time?','The break is at half past nine.','The break are half past nine.','The break at nine past half.','grammar:perform')
]}
function dayQs(){return[
 g('Complete: I study English ___ Monday.','on','at','in'),g('Complete: We are free ___ Saturday.','on','at','to'),
 g('Choose the correct sentence.','Speaking practice is on Thursday.','Speaking practice is at Thursday.','Speaking practice on is Thursday.'),
 g('Choose the question.','What do you do on Friday?','What you do Friday?','What does you do on Friday?','grammar:question'),
 g('Complete: ___ the weekend, I visit family.','At','On Monday','At Monday'),g('Choose the correct routine.','I work from Sunday to Thursday.','I works Sunday to Thursday.','I am work every Thursday.'),
 g('Repair: I have class at Wednesday.','I have class on Wednesday.','I have class in Wednesday.','I has class on Wednesday.','grammar:repair'),
 g('Which sentence talks clearly about a weekly plan?','On Tuesday, I study at home.','Tuesday I studying yesterday.','At Tuesday I studies home.','grammar:perform')
]}
function adjectiveQs(){return[
 g('Choose the natural order.','a blue shirt','a shirt blue','blue a shirt'),g('Choose the natural order.','black trousers','trousers black','black a trousers'),
 g('Complete: She has ___ shoes.','new black','black are','shoes new'),g('Choose the correct question.','What colour is the dress?','What colour the dress is?','What is colour dress?','grammar:question'),
 g('Choose the correct plural sentence.','These trousers are black.','This trousers is black.','These trouser is black.'),
 g('Choose the correct singular sentence.','The shirt is white.','The shirt are white.','The shirt white are.'),
 g('Repair: She has a dress green.','She has a green dress.','She has green a dress.','She have a dress green.','grammar:repair'),
 g('Which description is clear?','He is wearing a white shirt and dark trousers.','He wearing white a shirt and trousers dark.','He wear shirt white trousers.','grammar:perform')
]}
function canQs(){return[
 g('Complete: I ___ swim.','can','am can','can to'),g('Choose the negative.','She cannot swim.','She does not can swim.','She cannot to swim.'),
 g('Choose the question.','Can you cook?','Do can you cook?','Can you to cook?','grammar:question'),g('Choose the short answer.','Yes, I can.','Yes, I do can.','Yes, I am can.'),
 g('Choose the correct sentence.','Bilal can play football.','Bilal can plays football.','Bilal can to play football.'),
 g('Choose a possible activity.','We can walk in the park.','We can walking in the park.','We can to walk in park.'),
 g('Repair: She can sings.','She can sing.','She can sings.','She can singing.','grammar:repair'),
 g('Which sentence clearly states ability?','I can cook simple meals.','I am cook can meals.','I can cooking meals.','grammar:perform')
]}
function contrastQs(){return[
 g('Routine: Maryan ___ at home every evening.','studies','is studying','study now'),g('Now: Maryan ___ in the library today.','is studying','studies every day','study'),
 g('Choose the routine sentence.','I usually read after dinner.','I am usually reading right now every day.','I read now at this moment every day.'),
 g('Choose the action happening now.','They are doing practice questions now.','They do practice questions yesterday now.','They are do practice questions.'),
 g('Choose the correct question about now.','What are you doing today?','What do you doing today?','What are you do today?','grammar:question'),
 g('Choose the correct question about routine.','Where do you usually study?','Where are you usually study?','Where you do study usually?','grammar:question'),
 g('Repair: She studies in the library right now.','She is studying in the library right now.','She studying in library now.','She is study in library now.','grammar:repair'),
 g('Which pair shows routine versus now?','I study at home, but today I am studying at the library.','I am study home but today I study now.','I studied every day but now I studies.','grammar:perform')
]}
function shouldQs(){return[
 g('Complete: You ___ get more rest.','should','should to','shoulds'),g('Choose the negative advice.','You should not stay up very late.','You do not should stay up late.','You should not to stay late.'),
 g('Choose the question.','What should I do?','What I should do?','What should I to do?','grammar:question'),
 g('Choose the useful advice.','You should drink more water.','You should drinking more water.','You should to drink more water.'),
 g('Choose the correct form.','He should take a short walk.','He should takes a walk.','He should taking a walk.'),
 g('Choose the response to advice.','That is good advice.','That advice is good do.','I good advice am.'),
 g('Repair: You should to sleep earlier.','You should sleep earlier.','You should sleeping earlier.','You should sleeps earlier.','grammar:repair'),
 g('Which sentence gives a practical solution?','You can try the printed worksheet.','You can trying the worksheet.','You can to try worksheet.','grammar:perform')
]}
function appointmentQs(){return[
 g('Choose the correct question.','Are you available on Tuesday?','You are available Tuesday?','Do you available on Tuesday?','grammar:question'),
 g('Choose the correct time question.','What time is available?','What time available is?','What time does available?','grammar:question'),
 g('Choose the date question.','What date is the appointment?','What date the appointment is?','What does date appointment?','grammar:question'),
 g('Choose the correct reply.','Tuesday at ten thirty is fine.','Tuesday ten thirty are fine.','At Tuesday is fine ten thirty.'),
 g('Choose the confirmation question.','Does ten thirty work for you?','Ten thirty does work you?','Do ten thirty works you?','grammar:question'),
 g('Choose the polite request.','I would like an appointment, please.','I like appointment to please.','I would appointment like.'),
 g('Repair: What time you are available?','What time are you available?','What time you available are?','What time do available you?','grammar:repair'),
 g('Which exchange is clear?','Are you free Tuesday? Yes, I am.','Are free you Tuesday? Yes I do.','You free Tuesday? Yes are.','grammar:perform')
]}
function wouldLikeQs(){return[
 g('Complete: I ___ the soup, please.','would like','would liking','like to can'),g('Complete: Can I ___ some water?','have','having','to have'),
 g('Choose the polite order.','I would like rice and chicken, please.','I would like to rice chicken.','I like would rice.'),
 g('Choose the question.','Would you like a drink?','Would you like drink a?','Do would you like a drink?','grammar:question'),
 g('Choose the short reply.','Yes, please.','Yes, I please do would.','Yes, like please.'),
 g('Choose the bill request.','Can we have the bill, please?','Can we having bill?','Can the bill have we?'),
 g('Repair: I would like order soup.','I would like to order soup.','I would liking order soup.','I would like ordering to soup.','grammar:repair'),
 g('Which sentence is a polite restaurant request?','Can I have a bottle of water?','Can I having bottle water?','I can bottle water have?','grammar:perform')
]}
function transportQs(){return[
 g('Complete: I go to work ___ bus.','by','on a','with'),g('Choose the natural sentence.','I take the bus to university.','I take by bus to university.','I am take bus university.'),
 g('Choose the walking sentence.','I walk to school.','I go by walk to school.','I take walk school.'),
 g('Choose the question.','How do you go to university?','How you go university?','How does you go to university?','grammar:question'),
 g('Choose the route question.','Where do I get off?','Where I get off do?','Where does I get off?','grammar:question'),
 g('Complete: The fare ___ one dollar.','is','are','do'),g('Repair: I go by the foot.','I walk there.','I go by foots.','I taking foot there.','grammar:repair'),
 g('Which sentence clearly describes transport?','I take Bus 4 and get off at University Gate.','I takes Bus 4 and gets I off.','I am take bus and off get.','grammar:perform')
]}
function pastSimpleQs(){return[
 g('Complete: Yesterday I ___ my uncle.','visited','visit','visiting'),g('Complete: We ___ to the market.','went','goed','go'),
 g('Complete: They ___ lunch at one.','had','have','haved'),g('Choose the regular past form.','watched','watch','watcht'),
 g('Choose the question.','What did you do last weekend?','What did you did last weekend?','What you did do weekend?','grammar:question'),
 g('Choose the negative.','I did not work on Saturday.','I did not worked Saturday.','I not did work Saturday.'),
 g('Repair: We goed to the beach.','We went to the beach.','We go to the beach yesterday.','We wented to beach.','grammar:repair'),
 g('Which sentence tells a finished past event?','I returned home on Sunday.','I return home tomorrow yesterday.','I am return Sunday.','grammar:perform')
]}
function goingToQs(){return[
 g('Complete: I ___ visit my aunt on Saturday.','am going to','going to','am go to'),g('Complete: She ___ study tonight.','is going to','are going to','is go'),
 g('Complete: They ___ meet on Sunday.','are going to','is going to','are go to'),g('Choose the question.','What are you going to do?','What you are going to do?','What do you going to do?','grammar:question'),
 g('Choose the negative.','I am not going to work.','I do not going to work.','I am going not work.'),
 g('Choose the clear plan.','We are going to practise speaking.','We going practise speaking.','We are practise going.'),
 g('Repair: He is going visit family.','He is going to visit family.','He going to visiting family.','He is go visit family.','grammar:repair'),
 g('Which sentence expresses a future plan?','I am going to prepare for class tonight.','I prepared for class tomorrow yesterday.','I am prepare class every now.','grammar:perform')
]}
function invitationQs(){return[
 g('Choose the invitation.','Would you like to come for tea?','Do you would like come tea?','Would like you to tea come?','grammar:question'),
 g('Choose the acceptance.','Yes, I would love to.','Yes, I love would.','Yes, I would to love.'),
 g('Choose the polite refusal.','Sorry, I cannot come at five.','No I not come five.','Sorry, I cannot to come.'),
 g('Choose another invitation.','Would you like to practise English?','Would you practise to like English?','Do would like practising?','grammar:question'),
 g('Choose the time question.','What time should I come?','What time I should come?','What time should come I?','grammar:question'),
 g('Choose the alternative.','Maybe another time.','Maybe time another is.','Another maybe time do.'),
 g('Repair: Would you like come?','Would you like to come?','Would you like coming to?','Do you would like come?','grammar:repair'),
 g('Which exchange is polite?','Would you like to join us? Yes, I would love to.','You join us? Yes love.','Would join? I do love to.','grammar:perform')
]}
function messageQs(){return[
 g('Choose the question asking for confirmation.','Is class in Room 5 tomorrow?','Class Room 5 tomorrow is?','Do class is Room 5?','grammar:question'),
 g('Choose the useful request.','Can you tell Bilal?','Can tell you Bilal?','You can telling Bilal?'),
 g('Choose the correct reply.','Yes, I saw your message.','Yes, I see yesterday your message now.','Yes message I saws.'),
 g('Choose the future response.','I will tell Bilal.','I will telling Bilal.','I tell will Bilal.'),
 g('Choose the correct detail question.','Do I need the worksheet?','I need do the worksheet?','Does I need worksheet?','grammar:question'),
 g('Choose the thank-you response.','Thanks for letting me know.','Thanks letting know me for.','Thank you let I know.'),
 g('Repair: Can you tells him?','Can you tell him?','Can you tells him?','Do can you tell him?','grammar:repair'),
 g('Which reply clearly confirms the message?','Got it. I will be in Room 5 at eight.','Got it room five being eight I.','I got room five yesterday tomorrow.','grammar:perform')
]}
function comparativeQs(){return[
 g('Complete: Phone A is ___ than Phone B.','bigger','biggest','more big'),g('Complete: Phone B is ___ than Phone A.','cheaper','cheapest','more cheap'),
 g('Choose the correct sentence.','The bus is faster than walking.','The bus is fastest than walking.','The bus more fast than walking.'),
 g('Choose the irregular comparative.','better','gooder','best than'),g('Complete: This room is ___ than that room.','smaller','smallest','most small'),
 g('Choose the question.','Which phone is cheaper?','Which phone cheaper is than?','Which is cheap phone more?','grammar:question'),
 g('Repair: This bag is more cheap than that one.','This bag is cheaper than that one.','This bag is cheapest than that one.','This bag cheaper that one.','grammar:repair'),
 g('Which comparison is accurate?','Phone B is lighter and cheaper than Phone A.','Phone B is lightest than Phone A.','Phone B lighter more Phone A.','grammar:perform')
]}
function superlativeQs(){return[
 g('Complete: Café Green is ___ café.','the closest','closer','most close'),g('Complete: Café Star is ___.','the cheapest','cheaper','the more cheap'),
 g('Choose the correct form.','Café City has the biggest seating area.','Café City has bigger seating area of all.','Café City has the most big seating.'),
 g('Choose the irregular superlative.','the best','the goodest','the better'),g('Choose the question.','Which is the best choice?','Which the best choice is?','Which is better all choice?','grammar:question'),
 g('Complete: This is ___ convenient option.','the most','the more','most than'),g('Repair: It is cheapest café.','It is the cheapest café.','It is the cheaper café of all than.','It the cheapest is café.','grammar:repair'),
 g('Which sentence clearly gives one top choice?','For me, Café Green is the best choice today.','For me, Café Green better all today.','Café Green is best than every café.','grammar:perform')
]}
function integratedQs(){return[
 g('Present routine: I ___ English every evening.','study','studied','am study'),g('Now: I ___ English right now.','am studying','study yesterday','studied'),
 g('Past: Yesterday I ___ at the library.','was','am','were I'),g('Past action: Last weekend we ___ football.','played','play','are playing yesterday'),
 g('Future plan: I ___ practise tomorrow.','am going to','am practised','going'),g('Ability: I ___ ask simple questions now.','can','am can','can to'),
 g('Advice: You ___ keep practising.','should','should to','shoulds'),g('Which sentence connects past, present and future clearly?','Before I was nervous; now I am more confident; next I am going to practise every day.','Before I am nervous yesterday; now I went confident; next I practised tomorrow.','Before nervous now confident tomorrow practised.','grammar:perform')
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
 if(f.includes('integrated'))return integratedQs();
 if(f.includes('present simple vs'))return contrastQs();
 if(f.includes('demonstrative'))return demonstratives();
 if(f.includes('possessive'))return possessives();
 if(f.includes('should'))return shouldQs();
 if(f.includes('imperative'))return imperatives();
 if(f.includes('there is'))return thereIsAre();
 if(f.includes('preposition'))return placePreps();
 if(f.includes('present continuous'))return presentContinuous();
 if(f.includes('countable'))return countable();
 if(f.includes('some / any'))return someAny();
 if(f.includes('was / were')||f.includes('past simple of be'))return pastBe();
 if(f.includes('past simple'))return pastSimpleQs();
 if(f.includes('have / has'))return haveHas();
 if(f.includes('spell'))return spellingQs();
 if(f.includes('subject pronouns'))return pronounBeQs();
 if(f.includes('jobs + a/an'))return jobsQs();
 if(f.includes('be questions'))return beQuestionQs();
 if(f.includes('time expression'))return timeQs();
 if(f.includes('days of the week'))return dayQs();
 if(f.includes('adjective + noun'))return adjectiveQs();
 if(f.includes('question forms'))return appointmentQs();
 if(f.includes('would like / can i have'))return wouldLikeQs();
 if(f.includes('by + transport'))return transportQs();
 if(f.includes('weather language'))return canQs();
 if(f.includes('can / cannot'))return canQs();
 if(f.includes('going to'))return goingToQs();
 if(f.includes('would you like'))return invitationQs();
 if(f.includes('question and reply'))return messageQs();
 if(f.includes('comparative'))return comparativeQs();
 if(f.includes('superlative'))return superlativeQs();
 if(f.includes('frequency'))return presentSimpleQs();
 if(f.includes('present simple'))return presentSimpleQs();
 if(f.includes('be:')||f.includes('be questions')||f.includes('be +'))return basicBe();
 return basicBe();
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
function shortReading(qText,answer,tag='reading:detail'){return{type:'short',q:qText,answer,min:1,tag}}
const A1_READING_DIRECT={
 1:[
  ['Who is the new student?','Amina'],['Who is Amina’s teacher?','Mr Ali'],['Who sits next to Amina?','Yusuf'],['What does Yusuf say when he meets Amina?','Nice to meet you']
 ],
 2:[
  ['Who is registering for the English course?','Hodan'],['How do you spell Hodan’s first name?','H-O-D-A-N'],['Which letter does Hodan repeat?','D'],['What is Hodan’s last name?','Ahmed']
 ],
 3:[
  ['How old is Yusuf?','20'],['Where does Yusuf live?','Borama'],['What are the last four digits of Yusuf’s phone number?','7850'],['What information does Yusuf put on the form?','name, age, city, and phone number']
 ],
 4:[
  ['Which page do the students open their books to?','page six'],['What do the students do after they read?','They listen to the teacher'],['What do they do after they listen?','They repeat the sentence'],['How many words do they write in their notebooks?','two']
 ],
 5:[
  ['Where is Rahma from?','Hargeisa'],['Where does Rahma live now?','Borama'],['Where is Hassan from?','Burao'],['What do Rahma and Hassan talk about before class?','their hometowns']
 ],
 6:[
  ['Who is Maryan’s mother?','Sahra'],['Who is Maryan’s father?','Abdi'],['Who is Maryan’s brother?','Bilal'],['Who is Maryan’s sister?','Amina']
 ],
 7:[
  ['How is Hodan described?','friendly'],['How is Yusuf described?','quiet and helpful'],['Who is tall?','Hassan'],['Where does Hassan usually sit?','at the back']
 ],
 8:[
  ['What is Abdi’s job?','driver'],['What is Sahra’s job?','teacher'],['Who is a college student?','Maryan'],['What is Omar’s job?','doctor']
 ],
 9:[
  ['What colour is Yusuf’s school bag?','black'],['How many notebooks does Yusuf have?','two'],['How many pens does Yusuf have?','three'],['What does Amina not have today?','her English book']
 ],
 10:[
  ['What is on Amina’s desk?','a notebook and a pen'],['What is near the door?','an empty chair'],['How many bags are across the room?','three'],['Which word refers to the bags across the room?','those']
 ],
 11:[
  ['How old is Amina?','19'],['Where is Amina from?','Borama'],['What is Amina’s father’s job?','driver'],['What is Amina’s mother’s job?','teacher'],['What is in Amina’s school bag?','two notebooks, a phone, and three pens']
 ],
 12:[
  ['What time does Hodan wake up?','six'],['What time does she leave home?','seven'],['What time does she start work?','eight'],['What does Hodan do after work?','She studies English'],['When does she study English?','in the evening']
 ],
 13:[
  ['What time does English class start?','8:00'],['What time is the first break?','9:30'],['What time does reading practice start?','10:00'],['What time is lunch?','12:30'],['What time does speaking class begin?','2:00']
 ],
 14:[
  ['Which days does Maryan attend English class?','Monday and Wednesday'],['What does Maryan do on Tuesday?','She studies at home'],['When is speaking practice?','Thursday'],['When does Maryan visit her family?','Friday'],['Which day is Maryan free?','Saturday']
 ],
 15:[
  ['When does Yusuf usually study English?','after dinner'],['What does he often listen to?','short English videos'],['Who does he sometimes practise with?','a friend'],['What does Yusuf never do?','study very late at night'],['When does he usually review vocabulary?','Friday morning']
 ],
 16:[
  ['How many bedrooms are in Amina’s house?','two'],['What is in the kitchen?','a table with four chairs'],['What is in the living room?','a sofa and a small table'],['Where are the books?','near the window'],['How many chairs are in the kitchen?','four']
 ],
 17:[
  ['What is next to Hassan’s apartment building?','the pharmacy'],['What is opposite the pharmacy?','a café'],['Where is the bank?','between the café and the clothing shop'],['Where is the bus stop?','on the corner'],['Where is the car park?','behind the bank']
 ],
 18:[
  ['What does Sahra eat for breakfast?','bread and one egg'],['What does she drink with tea?','a little milk'],['What does she often eat for lunch?','rice with vegetables'],['What fruit does she keep at home?','apples'],['What does she drink during the day?','water']
 ],
 19:[
  ['How much is one kilo of rice?','$2'],['How much is one bottle of water?','$0.50'],['How much is one kilo of apples?','$1.50'],['How much is one bread?','$0.70'],['What three things does Amina buy?','rice, water, and bread']
 ],
 20:[
  ['What is Hodan wearing?','a long blue dress and black shoes'],['What colour is Yusuf’s shirt?','white'],['What colour is Amina’s shirt?','green'],['Who is called first?','Hodan'],['What is Yusuf waiting near?','the shirts']
 ],
 21:[
  ['What sport can Bilal play?','football'],['Can Bilal swim?','yes'],['What can Zahra do?','sing and draw'],['Can Zahra swim?','no'],['What activity do Bilal and Zahra decide to do together?','cook lunch']
 ],
 22:[
  ['What time does Yusuf wake up on weekdays?','6:30'],['What does he eat for breakfast?','bread and eggs'],['What does he sometimes do after class?','play football'],['When does Yusuf study English?','in the evening'],['What does Yusuf do at the weekend?','visits family and has more free time']
 ],
 23:[
  ['What is Amina doing at seven o’clock?','sitting at her desk'],['What is Amina reading?','an English text'],['What is her brother doing?','helping their mother in the kitchen'],['What is their father doing?','talking on the phone outside'],['Who is sleeping?','their younger sister'],['What time is it in the reading?','seven o’clock in the evening']
 ],
 24:[
  ['What does Maryan study at college?','business'],['When does she usually review her notes?','every evening'],['Why is this week different?','She has an exam on Thursday'],['Where is Maryan studying today?','in the library'],['What is she working on?','practice questions'],['What is Maryan’s teacher giving the class?','extra revision materials']
 ],
 25:[
  ['Who has a headache?','Abdi'],['Who has back pain?','Hodan'],['Why does Hodan have back pain?','She carried a heavy bag'],['Whose stomach hurts after lunch?','Yusuf’s'],['What does the nurse write on the form?','where each person hurts'],['Where are the three people waiting?','at a health centre']
 ],
 26:[
  ['Why is Hassan tired every morning?','He goes to bed after midnight'],['What does Hassan drink very little of?','water'],['What does Amina say Hassan should do about sleep?','sleep earlier'],['What should Hassan drink more of?','water'],['What should he stop doing for a long time in bed?','using his phone'],['How long does Hassan decide to try the advice?','one week']
 ],
 27:[
  ['What is Rahma’s appointment date?','Tuesday 14 March'],['What time is the appointment?','10:30 a.m.'],['Where is the appointment?','City Health Centre, Room 3'],['How early should Rahma arrive?','ten minutes early'],['What should Rahma bring?','her identification card'],['Which room is the appointment in?','Room 3']
 ],
 28:[
  ['What does Amina order?','vegetable soup and water'],['How much is Amina’s order?','$3.50'],['What does Yusuf order?','rice and chicken'],['How much is rice and chicken?','$5'],['Why do they ask for separate bills?','They are paying for their own meals'],['Where are Amina and Yusuf eating?','at a café']
 ],
 29:[
  ['Where does the route start?','the bus station'],['What do you pass on your right?','the bank'],['Where do you turn left?','at the traffic lights'],['What is opposite the library?','the school'],['How long does the walk take?','about seven minutes'],['What do you pass before the traffic lights?','the bank']
 ],
 30:[
  ['Where does Bus 4 start?','Central Market'],['What is the second stop?','City Hospital'],['Where does Yusuf get off?','University Gate'],['How much is the bus fare?','$1'],['What time does Yusuf get on the bus?','7:10'],['How long does the journey usually take?','about twenty-five minutes']
 ],
 31:[
  ['Why was Hassan at home in the morning?','His office was closed'],['Where was Hassan at noon?','at a café'],['Where was he in the afternoon?','at the library'],['What was the library like?','quiet'],['Where was Hassan in the evening?','at home with his family'],['Where is Hassan today?','at work']
 ],
 32:[
  ['Who did Bilal visit last Saturday?','his uncle'],['Where did Bilal and his uncle go?','the market'],['What did they do at one o’clock?','had lunch at home'],['What did Bilal do after lunch?','played football with his cousins'],['What did everyone do in the evening?','watched a film'],['When did Bilal come home?','Sunday morning']
 ],
 33:[
  ['Where did Maryan go first yesterday?','college'],['Who did Maryan meet after class?','Amina'],['Why did Maryan go to the library?','to finish an assignment'],['How long did she work in the library?','two hours'],['What did she do in the evening?','helped her sister with homework'],['What is Maryan doing today?','resting at home and preparing for class']
 ],
 34:[
  ['What event did Amina attend?','her first English speaking event'],['How did Amina feel when she arrived?','nervous'],['Who helped Amina relax?','another beginner'],['How long did they practise together?','one hour'],['What did Amina do at the end?','introduced her partner to the group'],['Why does Amina remember the day?','It was her first time speaking English in front of many people']
 ],
 35:[
  ['Where did Yusuf go in July?','Berbera'],['Who did Yusuf travel with?','his brother'],['How did they travel?','by bus'],['Where did they stay?','a small hotel near the beach'],['What did they do on Friday?','swam, visited the old market, and ate fish'],['Why did Yusuf return on Saturday evening?','He had class on Sunday']
 ],
 36:[
  ['What will the weather be like on Saturday morning?','sunny and warm'],['What may the afternoon be like?','windy'],['When is rain expected?','after six o’clock'],['Where do Rahma and Nasra plan to go in the morning?','the park'],['Why do they not plan an evening picnic?','because of the rain'],['What will they do after dinner?','watch a film at Nasra’s house']
 ],
 37:[
  ['Who is Samira going to visit on Saturday morning?','her aunt'],['What are Samira and her aunt going to do after lunch?','shop for food'],['What is Samira going to do in the evening?','prepare for English class'],['Who is Samira going to meet on Sunday?','a friend'],['What will they practise?','speaking'],['Why is Samira not going to work?','the office is closed']
 ],
 38:[
  ['Who sends the invitation?','Amina'],['Who is Amina inviting?','Maryan'],['What day is the invitation for?','Friday'],['What time does the meeting start?','5 p.m.'],['What should Maryan bring?','her English notebook'],['When should Maryan reply?','by Thursday']
 ],
 39:[
  ['Who sends the class message?','Yusuf'],['Which room is the class in tomorrow?','Room 5'],['What time does the class start?','8:00'],['What should Hassan bring?','the reading worksheet'],['Who should Hassan tell about the room change?','Bilal'],['What does Hassan reply?','Got it']
 ],
 40:[
  ['How much does Phone A cost?','$120'],['How much does Phone B cost?','$90'],['Which phone has the larger screen?','Phone A'],['Which phone has the longer battery life?','Phone B'],['Which phone is cheaper and lighter?','Phone B'],['Why does Amina choose Phone B?','It is cheaper, lighter, and its battery lasts longer']
 ],
 41:[
  ['Which café is closest to Maryan’s college?','Café Green'],['Which café is cheapest?','Café Star'],['Which café has the biggest seating area?','Café City'],['How far is Café Green?','two minutes away'],['Why does Maryan choose Café Green today?','She only has twenty minutes before class'],['Which café might Maryan choose when she has more time?','Café City']
 ],
 42:[
  ['What is not working in the classroom?','the projector'],['What does the teacher check first?','the power cable'],['What solution does Amina suggest?','using the printed worksheets'],['What does Yusuf offer to do?','give one worksheet to each pair'],['What does the teacher do after class?','messages the technician'],['How does the class continue the lesson?','by using printed worksheets']
 ],
 43:[
  ['What could Samira do when she started A1?','say only a few short sentences'],['What can Samira read now?','messages, schedules, menus, directions, and simple stories'],['What can she do in conversation now?','ask questions and keep a short conversation going'],['What is still difficult for Samira?','fast listening'],['How much listening does she plan to do each day?','ten minutes'],['What level does Samira want to enter next?','A2']
 ],
 44:[
  ['What does Amina read in the morning?','class messages and the timetable'],['What did Amina help a new learner find yesterday?','the library'],['What did Amina do at lunch without help?','read a café menu and ordered'],['What is Amina going to do this weekend?','meet two classmates for speaking practice'],['What does Amina do when people speak too quickly?','asks them to repeat'],['What is Amina’s next goal?','read longer texts and speak for several minutes without stopping']
 ]
};
function readingQs(spec,n){
 const rows=A1_READING_DIRECT[n];
 if(!Array.isArray(rows))throw new Error('Missing direct A1 reading questions for lesson '+n);
 return rows.map(row=>shortReading(row[0],row[1],'reading:detail'))
}
function listeningTurns(script){
 const turns=[],rx=/(?:^|\s)([A-Z][A-Za-z'’-]*):\s*(.*?)(?=\s+[A-Z][A-Za-z'’-]*:\s|$)/g;
 let m;
 while((m=rx.exec(String(script||''))))turns.push({speaker:m[1],text:m[2].trim()});
 return turns;
}
function firstSentenceBeforeQuestion(text){
 const clean=String(text||'').trim();
 const q=clean.indexOf('?');
 if(q>=0){
  const before=clean.slice(0,q).trim();
  const lastStop=Math.max(before.lastIndexOf('.'),before.lastIndexOf('!'));
  return (lastStop>=0?before.slice(lastStop+1):before).trim();
 }
 const m=clean.match(/^(.+?[.!])(?:\s|$)/);
 return (m?m[1]:clean).replace(/[.!]$/,'').trim();
}
function questionSentence(text){
 const clean=String(text||'').trim(),q=clean.indexOf('?');
 if(q<0)return '';
 const start=Math.max(clean.lastIndexOf('.',q),clean.lastIndexOf('!',q))+1;
 return clean.slice(start,q+1).trim();
}
function shortListening(qText,answer,tag='listening:detail'){return{type:'short',q:qText,answer,min:1,tag}}
function listeningQs(spec){
 const x=spec.l,names=lessonSpeakers(spec).map(s=>s.name),turns=listeningTurns(x.script),items=[];
 items.push(shortListening('Who are the speakers?',names.join(' and '),'listening:speakers'));
 items.push(shortListening('Where does the conversation happen?',x.setting,'listening:detail'));
 for(let i=0;i<turns.length-1&&items.length<6;i++){
  const asked=questionSentence(turns[i].text);
  if(!asked)continue;
  const reply=firstSentenceBeforeQuestion(turns[i+1].text);
  if(!reply)continue;
  items.push(shortListening(turns[i].speaker+' asks, “'+asked+'” What does '+turns[i+1].speaker+' answer?',reply,'listening:detail'));
 }
 if(items.length<6&&turns.length){
  const first=turns[0],asked=questionSentence(first.text);
  if(asked)items.push(shortListening('What does '+first.speaker+' ask at the beginning?',asked.replace(/\?$/,''),'listening:detail'));
 }
 if(items.length<6&&turns.length){
  const last=turns[turns.length-1];
  items.push(shortListening('What does '+last.speaker+' say at the end?',firstSentenceBeforeQuestion(last.text),'listening:detail'));
 }
 while(items.length<6){
  const fallbackIndex=items.length===2?0:Math.min(turns.length-1,items.length-2),turn=turns[fallbackIndex];
  if(turn)items.push(shortListening('What does '+turn.speaker+' say in the conversation?',firstSentenceBeforeQuestion(turn.text),'listening:detail'));
  else break;
 }
 return items.slice(0,6);
}
function makeLesson(spec,i){
 const n=i+1,range=wordRange(n);
 return{
  id:'su-a1-l'+n,number:n,title:spec.title,outcome:spec.outcome,ready:true,standardVersion:A1_VERSION,phase:phaseFor(n),readingSkill:spec.skill,
  targetVocabulary:spec.v.map(x=>x[0]),vocabularyEntries:spec.v.map(x=>({word:x[0],meaning:x[1],example:x[2]})),expressions:spec.u.map(text=>({text})),chunks:spec.u.slice(),interactionExpressions:spec.u.slice(0,3),
  functions:['understand familiar language','give simple information','respond to a partner'],discourse:['short complete sentences','clear turn taking','recycle earlier A1 language'],
  vocabulary:vocabItems(spec),
  listening:{title:spec.title+' · Reading & Listening',readingText:spec.r.text,audioScript:spec.l.script,text:spec.l.script,speakers:lessonSpeakers(spec),questions:[...readingQs(spec,n),...listeningQs(spec)]},
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