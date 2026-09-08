(function(){
  'use strict';

  function esc(v){return typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
  function attr(v){return typeof escapeAttr==='function'?escapeAttr(String(v??'')):esc(v).replace(/"/g,'&quot;')}
  function norm(v){return String(v??'').toLowerCase().replace(/[“”"'’]/g,"'").replace(/[^a-z0-9'&]+/g,' ').replace(/\s+/g,' ').trim()}
  function sentence(v){const t=String(v??'').trim();return /[.!?]$/.test(t)?t:t+'.'}
  function lower(v){const t=String(v??'').trim();return /^[A-Z][a-z]/.test(t)?t[0].toLowerCase()+t.slice(1):t}
  function uniqBy(items,keyFn){const seen=new Set();return items.filter(x=>{const k=keyFn(x);if(!k||seen.has(k))return false;seen.add(k);return true})}
  function takeCycle(items,start,count){if(!items.length)return[];return Array.from({length:count},(_,i)=>items[(start+i)%items.length])}

  function vocabPool(l){
    const items=[],qs=l.vocabulary?.items||buildVocabQuestions(l);
    qs.forEach((q,i)=>{const m=vocabFeedbackMeta(l,q,i);if(m)items.push({word:m.word,meaning:lower(m.meaning),example:m.example})});
    (l.expressions||[]).forEach(x=>items.push({word:x.text,meaning:lower(x.job||vocabMeaning(x.text)),example:x.example||lessonVocabExample(x.text,l)}));
    (Array.isArray(l.targetVocabulary)?l.targetVocabulary:[]).forEach(x=>items.push({word:x,meaning:lower(vocabMeaning(x)),example:lessonVocabExample(x,l)}));
    return uniqBy(items,x=>normalizeVocabWord(x.word));
  }

  function distractors(pool,target,field){
    const vals=uniqBy(pool.filter(x=>normalizeVocabWord(x.word)!==normalizeVocabWord(target.word)).map(x=>String(x[field]||'').trim()).filter(Boolean),norm);
    const fallback=field==='meaning'
      ?['a different meaning from this lesson','an unrelated action or idea','a different situation or purpose']
      :['another lesson word','a different expression','another possible word'];
    for(const x of fallback)if(!vals.some(v=>norm(v)===norm(x)))vals.push(x);
    return vals.slice(0,3);
  }

  const COLLOCATIONS={
    goal:'set a goal',experience:'gain experience',deadline:'meet a deadline',decision:'make a decision',
    attention:'pay attention',job:'apply for a job',promotion:'get a promotion',information:'find information',
    confidence:'build confidence',problem:'solve a problem',message:'send a message',report:'write a report',
    responsibility:'take responsibility',interest:'show interest',friend:'make friends',friends:'make friends',
    course:'take a course',university:'apply to university',technology:'use technology',ticket:'book a ticket',
    luggage:'pack luggage',request:'make a request',complaint:'make a complaint',progress:'make progress',
    meeting:'hold a meeting',plan:'make a plan',support:'give support',advice:'give advice',question:'ask a question'
  };
  function collocation(target){
    const key=normalizeVocabWord(target.word),clean=String(target.word||'').replace(/[.…!?]+$/,'').trim();
    if(COLLOCATIONS[key])return COLLOCATIONS[key];
    if(clean.split(/\s+/).length>=2&&clean.split(/\s+/).length<=5)return clean;
    return 'use '+clean;
  }
  function collocationOptions(pool,target){
    const answer=collocation(target),head=answer.split(/\s+/)[0],opts=[answer];
    for(const item of pool){
      if(normalizeVocabWord(item.word)===normalizeVocabWord(target.word))continue;
      const tail=collocation(item).split(/\s+/).slice(1).join(' ');
      const candidate=(head+' '+tail).trim();
      if(tail&&!opts.some(x=>norm(x)===norm(candidate)))opts.push(candidate);
      if(opts.length===4)break;
    }
    for(const tail of ['the wrong phrase','another option','a different item']){if(opts.length<4)opts.push(head+' '+tail)}
    return{answer,options:opts.slice(0,4)};
  }
  function previousVocab(l){
    const lessons=(COURSE?.lessons||[]).filter(x=>Number(x.number)<Number(l.number)).sort((a,b)=>Number(b.number)-Number(a.number)),out=[];
    for(const prior of lessons){
      for(const item of vocabPool(prior)){
        if(!out.some(x=>normalizeVocabWord(x.word)===normalizeVocabWord(item.word)))out.push({...item,sourceLesson:prior.number});
        if(out.length>=6)return out;
      }
    }
    return out;
  }
  function vocabChoice(item,index,label){
    return '<article class="guided-question core-activity-card vocab-core-card" data-core-type="'+attr(item.type)+'">'+
      '<div class="question-stage"><span>'+esc(label)+' · '+index+'</span></div>'+
      '<p>'+esc(item.q)+'</p>'+
      radio('v'+(index-1),item.options,item.answer,item.tag,item.target)+
      '</article>';
  }
  function vocabRecall(item,index){
    return '<article class="guided-question core-activity-card vocab-core-card vocab-retrieval-card">'+
      '<div class="question-stage"><span>Spaced Retrieval · '+index+'</span></div>'+
      '<p><b>'+(item.sourceLesson?'Recall from Lesson '+esc(item.sourceLesson)+':':'Retrieve it again:')+'</b> '+esc(sentence(item.meaning))+'</p>'+
      '<div class="core-exact-entry"><input type="text" autocomplete="off" data-open="1" data-exact="'+attr(item.word)+'" data-tag="vocabulary:spaced-retrieval" data-vocab-exact data-word="'+attr(item.word)+'" data-meaning="'+attr(item.meaning)+'" data-example="'+attr(item.example)+'" placeholder="Type the word or phrase"><button class="secondary-btn" type="button" data-vocab-exact-check>Check</button></div>'+
      '<div class="core-inline-feedback" data-vocab-exact-feedback aria-live="polite"></div>'+
      '</article>';
  }
  function vocabularyCore(l){
    let pool=vocabPool(l);
    if(!pool.length)pool=[{word:'English',meaning:'the language being learned',example:'We use English in class.'}];
    while(pool.length<6)pool.push({...pool[pool.length%pool.length]});
    const matching=pool.slice(0,3).map(target=>({type:'matching',target,q:'Match “'+target.word+'” to its meaning.',options:[target.meaning,...distractors(pool,target,'meaning')],answer:target.meaning,tag:'vocabulary:word-meaning'}));
    const context=pool.slice(3,6).map(target=>{
      const ex=String(target.example||lessonVocabExample(target.word,l)),escaped=String(target.word).replace(/[.*+?^$()|[\]\\]/g,'\\$&');
      const q=new RegExp(escaped,'i').test(ex)?ex.replace(new RegExp(escaped,'i'),'_____'):'Choose the best word for this situation: '+ex;
      return{type:'context',target,q,options:[target.word,...distractors(pool,target,'word')],answer:target.word,tag:'vocabulary:context'};
    });
    const coll=pool.slice(0,2).map(target=>{const c=collocationOptions(pool,target);return{type:'collocation',target,q:'Build the natural word combination for “'+target.word+'”.',options:c.options,answer:c.answer,tag:'vocabulary:collocation'}});
    let retrieval=previousVocab(l).slice(0,2);
    if(retrieval.length<2)retrieval=[...retrieval,...pool.filter(x=>!retrieval.some(r=>normalizeVocabWord(r.word)===normalizeVocabWord(x.word))).slice(0,2-retrieval.length)];
    return{matching,context,coll,retrieval};
  }

  window.vocabActivity=function(l){
    const core=vocabularyCore(l),refs=workbookVocabReferences(l);
    return '<div class="eg-skill-page eg-vocabulary-page">'+
      '<header class="eg-skill-hero"><div><span class="eg-skill-kicker">Vocabulary</span><h1>Meaning → context → collocation → recall</h1><p>Learn what a word means, use it in a real sentence, build natural combinations, then retrieve older vocabulary from memory.</p></div><span class="eg-question-count">10 questions</span></header>'+
      '<div class="eg-skill-layout">'+
        '<aside class="eg-editorial-panel eg-vocab-reference"><div class="eg-panel-heading"><small>Language bank</small><h2>'+esc(l.title)+'</h2><p>Every answer reconnects the word to its meaning and a natural example sentence.</p></div>'+
          '<div class="eg-vocab-reference-grid">'+(refs.length?refs.map((x,i)=>'<article class="eg-vocab-reference-card"><span>'+(i+1)+'</span><strong>'+esc(x.word)+'</strong><p>'+esc(x.meaning)+'</p>'+(x.example?'<small>“'+esc(x.example)+'”</small>':'')+'</article>').join(''):'<p class="muted">Use the activity questions to discover today’s key language.</p>')+'</div>'+
          '<div class="eg-tip-card"><b>Spaced retrieval</b><span>Vocabulary from earlier lessons returns later in a new direction or context.</span></div></aside>'+
        '<main class="eg-task-panel"><div class="eg-task-panel-head"><div><small>Practice</small><h2>Four vocabulary exercise types</h2></div><span>Match → use → build → retrieve</span></div>'+
          '<div class="core-group-head"><span>Word-Meaning Matching</span><strong>3 questions</strong></div><div class="activity-question-list">'+core.matching.map((x,i)=>vocabChoice(x,i+1,'Word-Meaning Matching')).join('')+'</div>'+
          '<div class="core-group-head"><span>Vocabulary in Context</span><strong>3 questions</strong></div><div class="activity-question-list">'+core.context.map((x,i)=>vocabChoice(x,i+4,'Vocabulary in Context')).join('')+'</div>'+
          '<div class="core-group-head"><span>Collocation Building</span><strong>2 questions</strong></div><div class="activity-question-list">'+core.coll.map((x,i)=>vocabChoice(x,i+7,'Collocation Building')).join('')+'</div>'+
          '<div class="core-group-head"><span>Spaced Retrieval</span><strong>2 questions</strong></div><div class="activity-question-list">'+core.retrieval.map((x,i)=>vocabRecall(x,i+9)).join('')+'</div>'+
        '</main>'+
      '</div><div id="activityFeedback"></div><div class="skill-action-row"><button class="primary-btn guided-submit skill-submit" id="checkActivity">Check vocabulary</button>'+activityDoneButton(l)+'</div></div>';
  };

  function sentenceOptions(q){
    const question=String(q.q||''),options=(q.options||[]).map(String),answer=String(q.answer||'');
    if(question.includes('___')){
      const base=question.replace(/^Complete:\s*/i,'');
      return{options:options.map(x=>base.replace('___',x)),answer:base.replace('___',answer)};
    }
    return{options,answer};
  }
  function grammarIntent(q){
    const tag=String(q.tag||'');
    if(tag.includes('question'))return'Ask the question with correct English word order.';
    if(tag.includes('negative'))return'Express the idea in the negative form.';
    if(tag.includes('infinitive'))return'Express a goal using the correct infinitive form.';
    if(tag.includes('because'))return'Show that the second idea gives a reason.';
    if(tag.includes('but')||tag.includes('contrast'))return'Show a contrast between the two ideas.';
    if(tag.includes('connector-so'))return'Show that the second idea is a result.';
    if(tag.includes('connector'))return'Connect the ideas with the relationship that makes sense.';
    if(tag.includes('gerund'))return'Use the natural verb form after the preposition.';
    if(tag.includes('present-perfect'))return'Connect a past action or state to the present.';
    if(tag.includes('present-continuous'))return'Describe something happening now.';
    if(tag.includes('third-person'))return'Describe what another person regularly does.';
    if(tag.includes('present-simple'))return'Describe a regular fact or routine accurately.';
    if(tag.includes('be'))return'Use the correct form of “be”.';
    return'Express the intended meaning with accurate grammar.';
  }
  function grammarChoice(q,index,type){
    const built=sentenceOptions(q),meaning=type==='meaning';
    return '<article class="guided-question core-activity-card grammar-core-card" data-grammar-choice>'+
      '<div class="question-stage"><span>'+(meaning?'Meaning-to-Grammar':'Grammar in Context')+' · '+index+'</span></div>'+
      (meaning?'<div class="grammar-intended-meaning"><small>Intended meaning</small><p>'+esc(grammarIntent(q))+'</p></div><p>Choose the sentence that expresses this meaning correctly.</p>':'<p>'+esc(q.q)+'</p>')+
      radio('g'+(index-1),built.options,built.answer,q.tag)+
      '<div class="core-inline-feedback" data-grammar-choice-feedback aria-live="polite"></div></article>';
  }
  function transformModels(l){
    const topic=String(l.title||'this topic').toLowerCase(),n=Number(l.number||1);
    const a=n%2===0
      ?{source:'She discusses '+topic+' in English.',instruction:'Change the sentence to the negative form.',answer:'She does not discuss '+topic+' in English.',tag:'grammar:transformation-negative'}
      :{source:'I discuss '+topic+' in English.',instruction:'Change the sentence to the negative form.',answer:'I do not discuss '+topic+' in English.',tag:'grammar:transformation-negative'};
    const b=n%3===0
      ?{source:'They are preparing the final response.',instruction:'Change the statement into a yes/no question.',answer:'Are they preparing the final response?',tag:'grammar:transformation-question'}
      :n%3===1
        ?{source:'You practise English every day.',instruction:'Change the statement into a yes/no question.',answer:'Do you practise English every day?',tag:'grammar:transformation-question'}
        :{source:'She works with international clients.',instruction:'Change the statement into a yes/no question.',answer:'Does she work with international clients?',tag:'grammar:transformation-question'};
    return[a,b];
  }
  function errorModels(qs){
    const out=[];
    for(const q of qs){
      const built=sentenceOptions(q),correct=String(built.answer||''),wrong=(built.options||[]).find(x=>norm(x)!==norm(correct));
      if(correct&&wrong)out.push({source:sentence(wrong),answer:sentence(correct),tag:q.tag||'grammar:error-correction'});
      if(out.length===2)break;
    }
    const fallbacks=[
      {source:'She explain the idea clearly.',answer:'She explains the idea clearly.',tag:'grammar:error-correction'},
      {source:'I am work on the report now.',answer:'I am working on the report now.',tag:'grammar:error-correction'}
    ];
    while(out.length<2)out.push(fallbacks[out.length]);
    return out;
  }
  function grammarExact(item,index,label,instruction){
    return '<article class="guided-question core-activity-card grammar-core-card" data-grammar-exact>'+
      '<div class="question-stage"><span>'+esc(label)+' · '+index+'</span></div>'+
      '<div class="grammar-source-sentence"><small>'+(label==='Error Correction'?'Incorrect sentence':'Start sentence')+'</small><p>'+esc(item.source)+'</p></div>'+
      '<p>'+esc(instruction)+'</p>'+
      '<div class="core-exact-entry"><input type="text" autocomplete="off" data-open="1" data-exact="'+attr(item.answer)+'" data-tag="'+attr(item.tag)+'" data-grammar-exact-input placeholder="Type the complete sentence"><button class="secondary-btn" type="button" data-grammar-exact-check>Check</button></div>'+
      '<div class="core-inline-feedback" data-grammar-exact-feedback aria-live="polite"></div></article>';
  }

  window.grammarActivity=function(l){
    const qs=l.grammar?.items||[],context=takeCycle(qs,0,3),meaning=takeCycle(qs,3,3),transforms=transformModels(l),errors=errorModels(qs.slice(6));
    return '<div class="eg-skill-page eg-grammar-page">'+
      '<header class="eg-skill-hero"><div><span class="eg-skill-kicker">Grammar</span><h1>Understand → Choose → Transform → Correct</h1><p>Start with meaning and context, then manipulate the grammar yourself.</p></div><span class="eg-question-count">10 questions</span></header>'+
      '<div class="eg-skill-layout eg-grammar-layout">'+
        '<aside class="eg-editorial-panel eg-grammar-coach"><div class="eg-panel-heading"><small>Grammar coach</small><h2>'+esc(l.grammar?.focus||l.title)+'</h2></div>'+
          (l.grammar?.rule?'<section class="grammar-rule-card"><small>Mini rule</small><p>'+esc(l.grammar.rule)+'</p></section>':'')+
          '<div class="eg-tip-card"><b>Strategy</b><span>Decide what the sentence needs to mean before you decide what grammar form it needs.</span></div></aside>'+
        '<main class="eg-task-panel"><div class="eg-task-panel-head"><div><small>Practice</small><h2>Four grammar exercise types</h2></div><span>Understand → choose → transform → correct</span></div>'+
          '<div class="core-group-head"><span>Grammar in Context</span><strong>3 questions</strong></div><div class="activity-question-list">'+context.map((q,i)=>grammarChoice(q,i+1,'context')).join('')+'</div>'+
          '<div class="core-group-head"><span>Meaning-to-Grammar</span><strong>3 questions</strong></div><div class="activity-question-list">'+meaning.map((q,i)=>grammarChoice(q,i+4,'meaning')).join('')+'</div>'+
          '<div class="core-group-head"><span>Sentence Transformation</span><strong>2 questions</strong></div><div class="activity-question-list">'+transforms.map((x,i)=>grammarExact(x,i+7,'Sentence Transformation',x.instruction)).join('')+'</div>'+
          '<div class="core-group-head"><span>Error Correction</span><strong>2 questions</strong></div><div class="activity-question-list">'+errors.map((x,i)=>grammarExact(x,i+9,'Error Correction','Correct the mistake in this sentence.')).join('')+'</div>'+
        '</main>'+
      '</div><div id="activityFeedback"></div><div class="skill-action-row"><button class="primary-btn guided-submit skill-submit" id="checkActivity">Check grammar</button>'+
      (!isWorkbookPreview()&&boostRecovery(l).ready?'<button class="ghost-btn" id="boostActivity">Practise missed questions with Boost</button>':'')+activityDoneButton(l)+'</div></div>';
  };

  function exactCorrect(input){return norm(input.value)===norm(input.dataset.exact||'')}
  function exactFeedback(box,correct,answer){
    box.innerHTML=correct
      ?'<div class="core-feedback is-correct"><strong>✓ Correct</strong></div>'
      :'<div class="core-feedback is-incorrect"><strong>✗ Incorrect</strong><span>Correct answer: <b>'+esc(sentence(answer))+'</b></span></div>';
  }
  function wireCoreExact(){
    document.querySelectorAll('[data-vocab-exact-check]').forEach(btn=>{if(btn.dataset.wired)return;btn.dataset.wired='1';btn.onclick=()=>{
      const card=btn.closest('.vocab-retrieval-card'),input=card.querySelector('[data-vocab-exact]'),box=card.querySelector('[data-vocab-exact-feedback]'),correct=exactCorrect(input);
      const meta={word:input.dataset.word,meaning:input.dataset.meaning,example:input.dataset.example};
      box.innerHTML=vocabFeedbackHtml(meta,correct);input.classList.toggle('is-correct',correct);input.classList.toggle('is-incorrect',!correct);
    }});
    document.querySelectorAll('[data-grammar-exact-check]').forEach(btn=>{if(btn.dataset.wired)return;btn.dataset.wired='1';btn.onclick=()=>{
      const card=btn.closest('[data-grammar-exact]'),input=card.querySelector('[data-grammar-exact-input]'),box=card.querySelector('[data-grammar-exact-feedback]'),correct=exactCorrect(input);
      exactFeedback(box,correct,input.dataset.exact);
    }});
  }
  function wireGrammarChoices(){
    document.querySelectorAll('[data-grammar-choice]').forEach(card=>{
      if(card.dataset.feedbackWired)return;card.dataset.feedbackWired='1';
      const box=card.querySelector('[data-grammar-choice-feedback]');
      card.querySelectorAll('input[type=radio]').forEach(input=>input.addEventListener('change',()=>{
        if(!input.checked)return;const correct=input.value===input.dataset.answer;
        box.innerHTML=correct
          ?'<div class="core-feedback is-correct"><strong>✓ Correct</strong><span>'+esc(sentence(input.dataset.answer))+'</span></div>'
          :'<div class="core-feedback is-incorrect"><strong>✗ Incorrect</strong><span>Correct form: <b>'+esc(sentence(input.dataset.answer))+'</b></span></div>';
      }));
    });
  }

  const originalWireActivity=window.wireActivity;
  window.wireActivity=function(l){
    originalWireActivity(l);
    wireCoreExact();
    wireGrammarChoices();
  };
})();