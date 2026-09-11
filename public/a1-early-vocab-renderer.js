(function(){
'use strict';

const originalVocabActivity=window.vocabActivity;

function esc(v){
  return typeof escapeHtml==='function'
    ? escapeHtml(String(v??''))
    : String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function attr(v){
  return typeof escapeAttr==='function'
    ? escapeAttr(String(v??''))
    : esc(v).replace(/"/g,'&quot;');
}
function courseId(){
  try{return typeof COURSE!=='undefined'&&COURSE?String(COURSE.id||''):''}catch{return''}
}
function isEarlyA1(l){
  const n=Number(l&&l.number||0),id=String(l&&l.id||'');
  return !!l && n>=1 && n<=10 && (
    courseId()==='speakup-a1' ||
    /^su-a1-l\d+$/i.test(id) ||
    /^a1[-_]/i.test(id) ||
    String(l.level||'').toUpperCase()==='A1'
  );
}
function approvedPatchItems(l){
  const n=Number(l?.number||0),api=window.EnglishGateContentPatches;
  const patch=api?.get?.('speakup-a1',n,'vocabulary');
  const items=patch?.replacement?.items;
  return Array.isArray(items)?items.filter(q=>q&&q.q&&Array.isArray(q.options)&&q.options.length&&q.answer&&q.options.includes(q.answer)).slice(0,10):[];
}
function sourceItems(l){
  const source=l&&l.vocabulary&&Array.isArray(l.vocabulary.items)?l.vocabulary.items:[];
  return source.filter(q=>q&&q.q&&Array.isArray(q.options)&&q.options.length&&q.answer).slice(0,10);
}
function lessonOneItems(l){
  const words=['hello','name','student','teacher','new','meet'];
  const optionsFor=answer=>[answer,...words.filter(x=>x!==answer)].slice(0,4);
  return [
    {q:'You meet your new teacher. What do you say?',options:optionsFor('hello'),answer:'hello',tag:'vocabulary:situation-use'},
    {q:'Complete: “My ___ is Amina.”',options:optionsFor('name'),answer:'name',tag:'vocabulary:context-use'},
    {q:'Amina learns in this class. She is a ___.',options:optionsFor('student'),answer:'student',tag:'vocabulary:context-use'},
    {q:'Mr Ali helps students learn. He is the ___.',options:optionsFor('teacher'),answer:'teacher',tag:'vocabulary:context-use'},
    {q:'It is my first day. I am ___ here.',options:optionsFor('new'),answer:'new',tag:'vocabulary:context-use'},
    {q:'Complete: “Nice to ___ you.”',options:optionsFor('meet'),answer:'meet',tag:'vocabulary:context-use'},
    {q:'Yusuf walks into class and sees Amina. Which word can he use to greet her?',options:optionsFor('hello'),answer:'hello',tag:'vocabulary:situation-use'},
    {q:'Complete: “My ___ is Yusuf.”',options:optionsFor('name'),answer:'name',tag:'vocabulary:context-use'},
    {q:'Hodan is learning English in the class. She is a ___.',options:optionsFor('student'),answer:'student',tag:'vocabulary:context-use'},
    {q:'Two people see each other for the first time. Complete: “Nice to ___ you.”',options:optionsFor('meet'),answer:'meet',tag:'vocabulary:situation-use'}
  ];
}
function itemsFor(l){
  const approved=approvedPatchItems(l);if(approved.length)return approved;
  if(Number(l.number)===1)return lessonOneItems(l);
  return sourceItems(l);
}
function slide(q,index,total){
  return '<section class="vocab-question-slide" data-vocab-slide data-vocab-index="'+index+'" hidden>'+
    '<div class="vocab-question-meta"><span>Vocabulary</span><i>•</i><span>Use in context</span><i>•</i><strong>'+(index+1)+' of '+total+'</strong></div>'+
    '<div class="vocab-question-heading"><h1>'+esc(q.q)+'</h1><p>Choose the word that fits this situation or sentence.</p></div>'+
    '<div class="vocab-answer-area">'+radio('v'+index,q.options,q.answer,q.tag||'vocabulary:context-use')+'</div>'+
    '</section>';
}

window.vocabActivity=function(l){
  if(!isEarlyA1(l))return originalVocabActivity(l);
  const items=itemsFor(l);
  if(!items.length)return originalVocabActivity(l);
  const total=items.length;
  return '<div class="eg-skill-page eg-vocabulary-page vocab-focus-runner a1-context-vocab-runner" data-vocab-runner>'+
    '<div class="vocab-runner-card">'+
      '<div class="vocab-progress-row"><div class="vocab-progress-track"><span data-vocab-progress></span></div><strong data-vocab-progress-text>1 of '+total+'</strong></div>'+
      '<div class="vocab-slide-stack">'+items.map((q,i)=>slide(q,i,total)).join('')+'</div>'+
      '<div id="activityFeedback" class="vocab-overall-feedback"></div>'+
      '<div class="vocab-runner-nav"><button class="vocab-prev-btn" type="button" data-vocab-prev>← <span>Previous</span></button><button class="primary-btn vocab-next-btn" type="button" data-vocab-next disabled>Continue <span>→</span></button></div>'+
    '</div>'+
    '<div class="vocab-hidden-actions" aria-hidden="true"><button id="checkActivity" type="button">Check vocabulary</button>'+activityDoneButton(l)+'</div>'+
    '</div>';
};

window.A1_EARLY_VOCAB_RENDERER_VERSION='context-v3-approved-patches';
})();