(function(){
'use strict';

const LESSON_ID='su-a1-l1';
const MICRO_VERSION='lesson1-grammar-micro-v1';

function choice(q,options,answer,tag){return{type:'choice',q,options,answer,tag}}

const microGrammar={
 version:MICRO_VERSION,
 focus:'Be: I am / You are',
 microSkill:'Use am with I and are with you in first-meeting introductions.',
 communicativeGoal:'Introduce yourself and speak directly to a new classmate.',
 context:[
  'Amina: Hello. I am Amina. I am a new student.',
  'Yusuf: Hi, Amina. I am Yusuf.',
  'Amina: Nice to meet you. You are in my English class.'
 ],
 noticeExamples:['I am Amina.','You are in my English class.'],
 rule:'Use am after I and are after you. Use these forms when you introduce yourself or speak directly to another person. Keep the subject and verb together.',
 examples:['I am Amina.','You are my classmate.'],
 items:[
  choice('Which pattern is correct?',['I + am / you + are','I + are / you + am','I + is / you + is'],'I + am / you + are','grammar:a1-micro-notice'),
  choice('Complete: I ___ new here.',['am','is','are'],'am','grammar:a1-micro-i-am'),
  choice('Complete: You ___ in my English class.',['are','am','is'],'are','grammar:a1-micro-you-are'),
  choice('Choose the correct sentence.',['I am a student.','I are a student.','I is a student.'],'I am a student.','grammar:a1-micro-choice'),
  {type:'exact',q:'Fix the sentence: You am new here.',answer:'You are new here.',min:1,tag:'grammar:a1-micro-repair'},
  {type:'open',q:'Meet a new classmate. Write one short introduction that begins “Hello, I am …”',answer:'',min:3,tag:'grammar:a1-micro-use'},
  choice('Teacher: “Welcome! You ___ in Class A.”',['are','am','is'],'are','grammar:a1-micro-check')
 ]
};

function patchLesson(){
 const book=typeof BOOK_PACKS!=='undefined'?BOOK_PACKS['speakup-a1']:null;
 const lesson=book?.lessons?.find(x=>x.id===LESSON_ID);
 if(!lesson)return false;
 lesson.grammar={...microGrammar,items:microGrammar.items.map(x=>({...x,options:x.options?[...x.options]:undefined}))};
 return true;
}

function section(title,body,className=''){
 return `<section class="eg-grammar-micro-section ${className}"><h2>${escapeHtml(title)}</h2>${body}</section>`;
}
function promptCard(q,index,label){
 const control=q.type==='open'
  ?openEvidence('g'+index,q.q,Number(q.min||1),q.tag,'')
  :q.type==='exact'
   ?openEvidence('g'+index,q.q,Number(q.min||1),q.tag,q.answer)
   :radio('g'+index,q.options,q.answer,q.tag);
 return `<article class="guided-question eg-micro-question" data-micro-stage="${escapeAttr(label)}"><div class="eg-micro-task-label">${escapeHtml(label)}</div><p>${escapeHtml(q.q)}</p>${control}</article>`;
}

const originalGrammarActivity=grammarActivity;
grammarActivity=function(l){
 if(l?.id!==LESSON_ID||l?.grammar?.version!==MICRO_VERSION)return originalGrammarActivity(l);
 const g=l.grammar,qs=g.items||[];
 return `<div class="eg-skill-page eg-grammar-page eg-grammar-micro-page">
  <header class="eg-skill-hero eg-micro-hero"><div><span class="eg-skill-kicker">Grammar · under 5 minutes</span><h1>${escapeHtml(g.focus)}</h1><p>${escapeHtml(g.communicativeGoal)}</p></div><span class="eg-question-count">7 quick interactions</span></header>
  <div class="eg-grammar-micro-flow">
   ${section('See',`<div class="eg-micro-dialogue">${g.context.map(line=>`<p>${escapeHtml(line)}</p>`).join('')}</div>`,'eg-micro-see')}
   ${section('Notice',`<div class="eg-micro-examples">${g.noticeExamples.map(x=>`<p>${escapeHtml(x)}</p>`).join('')}</div>${promptCard(qs[0],0,'Notice')}`)}
   ${section('Remember',`<div class="eg-micro-rule"><p>${escapeHtml(g.rule)}</p>${g.examples.map(x=>`<p class="eg-micro-model">${escapeHtml(x)}</p>`).join('')}</div>`)}
   ${section('Practice',`${promptCard(qs[1],1,'Practice 1')}${promptCard(qs[2],2,'Practice 2')}${promptCard(qs[3],3,'Practice 3')}`)}
   ${section('Fix It',promptCard(qs[4],4,'Fix It'))}
   ${section('Use It',promptCard(qs[5],5,'Use It'))}
   ${section('Quick Check',promptCard(qs[6],6,'Quick Check'))}
  </div>
  <div class="eg-micro-boost-line"><button class="ghost-btn" id="boostActivity" type="button"><strong>Need more practice?</strong> → Boost Grammar</button></div>
  <div id="activityFeedback"></div><div class="skill-action-row"><button class="primary-btn guided-submit skill-submit" id="checkActivity">Check grammar</button>${activityDoneButton(l)}</div>
 </div>`;
};

const originalBoostFreshQuestion=boostFreshQuestion;
boostFreshQuestion=function(q){
 const tag=String(q?.tag||'');
 if(!tag.includes('grammar:a1-micro-'))return originalBoostFreshQuestion(q);
 if(tag.includes('i-am'))return{q:'Complete: I ___ ready for class.',options:['am','are','is'],answer:'am'};
 if(tag.includes('you-are'))return{q:'Complete: You ___ my partner today.',options:['are','am','is'],answer:'are'};
 if(tag.includes('repair'))return{q:'Choose the corrected sentence.',options:['You are new here.','You am new here.','You is new here.'],answer:'You are new here.'};
 if(tag.includes('check'))return{q:'A classmate says: “You ___ in my group.”',options:['are','am','is'],answer:'are'};
 if(tag.includes('notice'))return{q:'Choose the matching pair.',options:['I am / you are','I are / you am','I is / you is'],answer:'I am / you are'};
 return{q:'Choose the correct first-meeting sentence.',options:['I am new here.','I are new here.','I is new here.'],answer:'I am new here.'};
};

const style=document.createElement('style');
style.id='lesson1-grammar-micro-style';
style.textContent=`
.eg-grammar-micro-page{max-width:820px;margin:0 auto}.eg-micro-hero{margin-bottom:14px}.eg-grammar-micro-flow{display:grid;gap:12px}.eg-grammar-micro-section{border:1px solid var(--border,#d9e0ea);border-radius:16px;padding:16px;background:var(--surface,#fff)}.eg-grammar-micro-section>h2{font-size:1rem;margin:0 0 10px}.eg-micro-dialogue,.eg-micro-rule,.eg-micro-examples{display:grid;gap:7px}.eg-micro-dialogue p,.eg-micro-examples p,.eg-micro-rule p{margin:0;line-height:1.55}.eg-micro-examples p,.eg-micro-model{font-weight:700}.eg-micro-rule{padding:12px;border-radius:12px;background:var(--surface-soft,#f5f7fb)}.eg-micro-question{margin-top:10px}.eg-micro-task-label{font-size:.76rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;margin-bottom:6px;color:var(--muted,#5e6877)}.eg-micro-boost-line{margin:14px 0}.eg-micro-boost-line .ghost-btn{width:100%;min-height:48px}.eg-grammar-micro-page .mcq-picker label,.eg-grammar-micro-page .mcq-option{min-height:48px}.eg-grammar-micro-page textarea,.eg-grammar-micro-page input[type=text]{font-size:16px}@media(max-width:640px){.eg-grammar-micro-page{max-width:none}.eg-grammar-micro-section{padding:13px;border-radius:14px}.eg-micro-hero .eg-question-count{white-space:nowrap}.eg-grammar-micro-flow{gap:10px}}
`;
document.head.appendChild(style);

patchLesson();
window.ENGLISHGATE_LESSON1_GRAMMAR_MICRO_VERSION=MICRO_VERSION;
})();
