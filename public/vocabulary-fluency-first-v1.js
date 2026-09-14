(function(){
'use strict';

const previousVocabActivity=window.vocabActivity;

function esc(v){
  return typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function attr(v){
  return typeof escapeAttr==='function'?escapeAttr(String(v??'')):esc(v).replace(/"/g,'&quot;');
}
function norm(v){return String(v??'').toLowerCase().replace(/[“”"'’]/g,"'").replace(/[^a-z0-9'&]+/g,' ').replace(/\s+/g,' ').trim()}
function uniq(items,keyFn){const seen=new Set();return items.filter(x=>{const k=keyFn(x);if(!k||seen.has(k))return false;seen.add(k);return true})}
function shuffleStable(items,seed){const a=[...items];for(let i=a.length-1;i>0;i--){const j=(seed+i*7)%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}

const COLLOCATIONS={
 accommodation:'book accommodation',goal:'set a goal',experience:'gain experience',deadline:'meet a deadline',decision:'make a decision',
 attention:'pay attention',job:'apply for a job',promotion:'get a promotion',information:'find information',confidence:'build confidence',
 problem:'solve a problem',message:'send a message',report:'write a report',responsibility:'take responsibility',interest:'show interest',
 friend:'make friends',friends:'make friends',course:'take a course',university:'apply to university',technology:'use technology',
 ticket:'book a ticket',luggage:'pack luggage',request:'make a request',complaint:'make a complaint',progress:'make progress',
 meeting:'hold a meeting',plan:'make a plan',support:'give support',advice:'give advice',question:'ask a question',
 budget:'make a budget',reservation:'make a reservation',feedback:'give feedback',research:'do research',exercise:'do exercise'
};

function references(l){
  try{
    if(typeof workbookVocabReferences==='function'){
      const refs=workbookVocabReferences(l);
      if(Array.isArray(refs)&&refs.length)return refs.map(x=>({word:String(x.word||'').trim(),meaning:String(x.meaning||'').trim(),example:String(x.example||'').trim()})).filter(x=>x.word);
    }
  }catch{}
  const out=[];
  const items=Array.isArray(l?.vocabulary?.items)?l.vocabulary.items:[];
  for(const q of items){
    const quoted=String(q.q||'').match(/[“"]([^”"]+)[”"]/);
    const answer=String(q.answer||'').trim();
    let word=quoted?.[1]||'';
    if(!word && answer && answer.split(/\s+/).length<=4)word=answer;
    if(word)out.push({word,meaning:'',example:''});
  }
  (Array.isArray(l?.targetVocabulary)?l.targetVocabulary:[]).forEach(word=>out.push({word:String(word),meaning:'',example:''}));
  (Array.isArray(l?.expressions)?l.expressions:[]).forEach(x=>out.push({word:String(x.text||''),meaning:String(x.job||''),example:String(x.example||'')}));
  return uniq(out,x=>norm(x.word));
}

function exampleFor(item,l){
  if(item.example&&new RegExp('\\b'+String(item.word).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(item.example))return item.example;
  const topic=String(l?.title||'this topic').toLowerCase();
  const key=norm(item.word);
  if(COLLOCATIONS[key])return 'In this situation, I would '+COLLOCATIONS[key]+'.';
  return 'When I talk about '+topic+', I can use the word “'+item.word+'” naturally.';
}

function blankExample(item,l){
  const ex=exampleFor(item,l),escaped=String(item.word).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re=new RegExp(escaped,'i');
  if(re.test(ex))return ex.replace(re,'_____');
  const coll=COLLOCATIONS[norm(item.word)];
  if(coll){const cRe=new RegExp(escaped,'i');return coll.replace(cRe,'_____')+'.'}
  return 'Choose the word that completes this natural sentence about '+String(l?.title||'the lesson').toLowerCase()+': _____.';
}

function options(pool,target,seed){
  const distractors=pool.filter(x=>norm(x.word)!==norm(target.word)).map(x=>x.word);
  return shuffleStable([target.word,...distractors.slice(0,3)],seed).slice(0,4);
}

function gradedItems(l,pool){
  const usable=pool.length?pool:[{word:'English',meaning:'',example:'I use English every day.'}];
  const items=[];
  for(let i=0;i<10;i++){
    const target=usable[i%usable.length];
    const mode=i<4?'context':i<7?'situation':'collocation';
    if(mode==='context'){
      items.push({
        q:'Complete the sentence naturally: “'+blankExample(target,l)+'”',
        options:options(usable,target,i+1),answer:target.word,tag:'vocabulary:fluency-context',target:target.word,label:'Use in context'
      });
    }else if(mode==='situation'){
      const topic=String(l?.title||'this topic');
      items.push({
        q:'You are speaking about '+topic+'. Which word best fits this real-life sentence? “'+blankExample(target,l)+'”',
        options:options(usable,target,i+11),answer:target.word,tag:'vocabulary:fluency-situation',target:target.word,label:'Situation use'
      });
    }else{
      const coll=COLLOCATIONS[norm(target.word)];
      if(coll){
        const verb=coll.split(/\s+/)[0],rest=coll.split(/\s+/).slice(1).join(' ');
        items.push({
          q:'Choose the natural phrase: “'+verb+' _____”',
          options:options(usable,target,i+21),answer:target.word,tag:'vocabulary:fluency-collocation',target:target.word,label:'Natural phrase'
        });
      }else{
        items.push({
          q:'Which word would you use to complete this sentence naturally? “'+blankExample(target,l)+'”',
          options:options(usable,target,i+21),answer:target.word,tag:'vocabulary:fluency-collocation',target:target.word,label:'Natural phrase'
        });
      }
    }
  }
  return items;
}

function questionCard(q,index){
  return '<article class="guided-question vocab-core-card eg-vocab-fluency-question">'+
    '<div class="question-stage"><span>'+esc(q.label)+' · '+index+'</span></div>'+
    '<p>'+esc(q.q)+'</p>'+
    radio('vf'+(index-1),q.options,q.answer,q.tag,q.target)+
    '</article>';
}

function productionPrompt(item,l,index){
  const topic=String(l?.title||'this topic');
  const ask=index===0
    ?'Write one sentence you could genuinely say in a conversation about '+topic+'. Use “'+item.word+'” naturally.'
    :'Ask a natural question that you could say to another person about '+topic+'. Use “'+item.word+'”.';
  return '<article class="eg-vocab-production-card" data-vocab-production-card data-target="'+attr(item.word)+'">'+
    '<div class="eg-vocab-production-meta"><span>Say it yourself</span><strong>'+esc(item.word)+'</strong></div>'+
    '<p>'+esc(ask)+'</p>'+
    '<textarea rows="3" data-vocab-production-input placeholder="Write your own sentence..."></textarea>'+
    '<div class="core-inline-feedback" data-vocab-production-feedback aria-live="polite"></div>'+
    '<button class="secondary-btn" type="button" data-vocab-production-check>Check my use</button>'+
    '</article>';
}

window.vocabActivity=function(l){
  try{
    let pool=uniq(references(l),x=>norm(x.word)).filter(x=>x.word&&x.word.length<=48);
    if(!pool.length)return previousVocabActivity(l);
    const graded=gradedItems(l,pool);
    const production=[pool[0],pool[Math.min(1,pool.length-1)]].filter(Boolean);
    return '<div class="eg-skill-page eg-vocabulary-page eg-vocab-fluency-first">'+
      '<header class="eg-skill-hero"><div><span class="eg-skill-kicker">Vocabulary</span><h1>Use the words, don’t define them</h1><p>Practise vocabulary in real sentences, natural phrases and situations. Definitions stay in the language bank; the exercises test whether you can actually use the words.</p></div><span class="eg-question-count">10 usage questions</span></header>'+
      '<div class="eg-skill-layout">'+
        '<aside class="eg-editorial-panel eg-vocab-reference"><div class="eg-panel-heading"><small>Language bank</small><h2>'+esc(l.title||'Vocabulary')+'</h2><p>Review meaning and examples here before you practise using the words.</p></div>'+
          '<div class="eg-vocab-reference-grid">'+pool.slice(0,10).map((x,i)=>'<article class="eg-vocab-reference-card"><span>'+(i+1)+'</span><strong>'+esc(x.word)+'</strong>'+(x.meaning?'<p>'+esc(x.meaning)+'</p>':'')+(x.example?'<small>“'+esc(x.example)+'”</small>':'')+'</article>').join('')+'</div></aside>'+
        '<main class="eg-task-panel"><div class="eg-task-panel-head"><div><small>Fluency practice</small><h2>Context → situation → natural phrase</h2></div><span>Usage first</span></div>'+
          '<div class="activity-question-list">'+graded.map((q,i)=>questionCard(q,i+1)).join('')+'</div>'+
          '<section class="eg-vocab-production-lab"><div class="eg-panel-heading"><small>Personal production</small><h2>Now use the vocabulary yourself</h2><p>These two prompts are for fluency practice. Write a complete sentence, not a definition.</p></div>'+production.map((x,i)=>productionPrompt(x,l,i)).join('')+'</section>'+
        '</main>'+
      '</div><div id="activityFeedback"></div><div class="skill-action-row"><button class="primary-btn guided-submit skill-submit" id="checkActivity">Check vocabulary</button>'+activityDoneButton(l)+'</div></div>';
  }catch(err){
    console.warn('Vocabulary fluency-first renderer fallback',err);
    return previousVocabActivity(l);
  }
};

function checkProduction(card){
  const input=card.querySelector('[data-vocab-production-input]');
  const feedback=card.querySelector('[data-vocab-production-feedback]');
  const target=String(card.dataset.target||'').trim();
  const text=String(input?.value||'').trim();
  const words=text.split(/\s+/).filter(Boolean);
  const used=norm(text).includes(norm(target));
  const complete=words.length>=5&&/[.!?]$/.test(text);
  if(!text){feedback.textContent='Write a sentence first.';feedback.className='core-inline-feedback is-wrong';return}
  if(!used){feedback.textContent='Use “'+target+'” in your sentence.';feedback.className='core-inline-feedback is-wrong';return}
  if(!complete){feedback.textContent='Make it a complete sentence of at least 5 words.';feedback.className='core-inline-feedback is-wrong';return}
  feedback.textContent='Good — you used “'+target+'” in your own sentence.';
  feedback.className='core-inline-feedback is-correct';
}

document.addEventListener('click',e=>{
  const btn=e.target.closest?.('[data-vocab-production-check]');
  if(!btn)return;
  const card=btn.closest('[data-vocab-production-card]');
  if(card)checkProduction(card);
});

window.ENGLISHGATE_VOCAB_FLUENCY_FIRST_VERSION='1.0.0';
})();
