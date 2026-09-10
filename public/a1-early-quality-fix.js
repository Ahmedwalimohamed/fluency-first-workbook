(function(){
'use strict';
const pack=window.BOOK_PACKS&&window.BOOK_PACKS['speakup-a1'];
if(!pack||!Array.isArray(pack.lessons))return;

const meanings={
  hello:'what you say when you meet someone',name:'what people call you',student:'a person who learns at a school or class',teacher:'a person who helps students learn',new:'here for the first time',meet:'see and speak to someone for the first time',
  spell:'say or write the letters in a word',letter:'one sign in the alphabet', 'first name':'your personal name','last name':'your family name',alphabet:'all the letters from A to Z',repeat:'say it again',
  age:'how old a person is','phone number':'the numbers people use to call you',address:'where you live',form:'a page where you write information',number:'a sign such as 1, 2, or 3',information:'facts about a person or thing',
  open:'make something not closed',close:'make something shut',listen:'pay attention to sound',read:'look at words and understand them',write:'make words with a pen, pencil, or keyboard',
  country:'a place such as Somalia or Kenya',city:'a large town',hometown:'the town or city you come from',nationality:'the country you are a citizen of',from:'used to say where someone comes from',live:'have your home in a place',
  mother:'your female parent',father:'your male parent',sister:'a girl or woman with the same parent or parents as you',brother:'a boy or man with the same parent or parents as you',parents:'your mother and father',family:'parents, children, brothers, sisters, and other relatives',
  friendly:'kind and nice to other people',quiet:'not making much noise',tall:'high, not short',young:'not old',helpful:'ready to help',busy:'having many things to do',
  doctor:'a person who helps sick people get better',driver:'a person whose job is driving',shopkeeper:'a person who owns or works in a shop',job:'the work a person does',
  book:'pages with words or pictures that you read',phone:'something you use to call or message people',bag:'something you carry things in',notebook:'a small book for writing notes',pen:'something you write with',key:'a small thing used to open a lock',
  this:'one thing near you',that:'one thing farther from you',these:'two or more things near you',those:'two or more things farther from you',singular:'one person or thing',plural:'more than one person or thing'
};

function escRe(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function options(answer,pool){const out=[answer];for(const x of pool){if(x!==answer&&!out.includes(x))out.push(x);if(out.length===3)break}return out}
function contextualVocab(lesson){
  const entries=(lesson.vocabularyEntries||[]).slice(0,6);
  const words=entries.map(x=>x.word);
  const items=[];
  entries.forEach((e,i)=>{
    const example=String(e.example||'');
    const re=new RegExp(escRe(e.word),'i');
    let prompt,answer=e.word;
    if(re.test(example)) prompt=example.replace(re,'_____');
    else prompt='Choose the best word: '+example;
    items.push({q:prompt,options:options(answer,words.slice(i+1).concat(words.slice(0,i))),answer,tag:'vocabulary:context-use'});
  });
  // Four additional use-based checks. No dictionary-definition questions.
  const scenarios=entries.slice(0,4).map((e,i)=>({
    q:'Which word best completes this real situation? '+String(e.example||'').replace(new RegExp(escRe(e.word),'i'),'_____'),
    options:options(e.word,words.slice(i+2).concat(words.slice(0,i+2))),answer:e.word,tag:'vocabulary:situation-use'
  }));
  return{items:items.concat(scenarios).slice(0,10)};
}

for(let i=0;i<10;i++){
  const l=pack.lessons[i]; if(!l)continue;
  (l.vocabularyEntries||[]).forEach(e=>{if(meanings[e.word])e.meaning=meanings[e.word]});
  l.vocabulary=contextualVocab(l);
}

// Early-A1 reading should use only language needed for the lesson target.
const l2=pack.lessons[1];
if(l2&&l2.listening){
  l2.listening.readingText='Hodan is in English class. Her first name is H-O-D-A-N. Her last name is Ahmed. Omar asks, “How do you spell your first name?” Hodan says the letters slowly. Omar asks, “B or D?” Hodan says, “D.”';
}

// Writing progression: recognition/building first; short guided production only after learners have enough language.
const writing=[
 ['Complete these models: “Hello, I am ___.” and “My name is ___.”',3,10],
 ['Write your first name, last name, and spell your first name.',3,12],
 ['Complete: “My name is ___.” “I am ___ years old.” “I live in ___.”',6,18],
 ['Build three classroom instructions from the lesson models.',6,18],
 ['Complete: “I am from ___.” “I live in ___.” Then write one similar sentence.',6,20],
 ['Complete three model sentences about your family, then change the names to fit your family.',8,24],
 ['Write two guided sentences: “___ is friendly/quiet/helpful.” and “He/She is ___.”',8,25],
 ['Write two guided sentences about a job: “___ is a ___.” and “He/She works as a ___.”',8,25],
 ['Write two or three guided sentences about things you have. Use “I have ...”.',8,30],
 ['Write three short sentences using this, that, these, or those.',10,30]
];
writing.forEach((x,i)=>{const l=pack.lessons[i];if(l&&l.writing){l.writing.task=x[0];l.writing.minWords=x[1];l.writing.maxWords=x[2]}});

// Keep speaking practical and manageable in the first ten lessons.
const performance=[
 'Greet a partner, say your name, and respond to the greeting.',
 'Spell your first name and ask a partner to spell theirs.',
 'Say your age and one simple personal detail, then ask your partner.',
 'Follow classroom instructions, then give two simple instructions.',
 'Ask and answer where you are from and where you live.',
 'Identify three family members using simple sentences.',
 'Describe two people using one simple adjective for each.',
 'Ask one person about a job or studies and give one answer.',
 'Ask and answer three questions about things you have.',
 'Point to four objects and use this, that, these, or those.'
];
performance.forEach((x,i)=>{if(pack.lessons[i]){pack.lessons[i].performance=x;if(pack.lessons[i].review)pack.lessons[i].review.mission=x}});

window.A1_EARLY_QUALITY_FIX_VERSION='cefr-esl-v1';
})();