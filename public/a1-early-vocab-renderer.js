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
function isEarlyA1(l){
  const n=Number(l&&l.number||0);
  return !!l && /^su-a1-l/i.test(String(l.id||'')) && n>=1 && n<=10;
}
function contextualItems(l){
  const source=(l&&l.vocabulary&&Array.isArray(l.vocabulary.items))?l.vocabulary.items:[];
  return source.filter(q=>q&&q.q&&Array.isArray(q.options)&&q.answer).slice(0,10);
}
function card(q,index){
  return '<article class="guided-question core-activity-card vocab-core-card" data-core-type="context-use">'+
    '<div class="question-stage"><span>Use the word · '+index+'</span></div>'+
    '<p>'+esc(q.q)+'</p>'+
    radio('v'+(index-1),q.options,q.answer,q.tag||'vocabulary:context-use')+
    '</article>';
}

window.vocabActivity=function(l){
  if(!isEarlyA1(l)) return originalVocabActivity(l);

  const items=contextualItems(l);
  if(!items.length) return originalVocabActivity(l);

  return '<div class="eg-skill-page eg-vocabulary-page a1-early-vocabulary">'+
    '<header class="eg-skill-hero"><div><span class="eg-skill-kicker">Vocabulary</span><h1>Use the right word</h1><p>Choose words in simple sentences and real situations.</p></div><span class="eg-question-count">'+items.length+' questions</span></header>'+
    '<main class="eg-task-panel"><div class="eg-task-panel-head"><div><small>Practice</small><h2>Vocabulary in context</h2></div><span>See → choose → use</span></div>'+
      '<div class="activity-question-list">'+items.map((q,i)=>card(q,i+1)).join('')+'</div>'+
    '</main>'+
    '<div id="activityFeedback"></div><div class="skill-action-row"><button class="primary-btn guided-submit skill-submit" id="checkActivity">Check vocabulary</button>'+activityDoneButton(l)+'</div></div>';
};

window.A1_EARLY_VOCAB_RENDERER_VERSION='context-v1';
})();