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
function regexEscape(v){return String(v??'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}

const USAGE_TEMPLATES={
  'accommodation':'Before our trip, we booked _____ near the city centre.',
  'career progression':'Training and mentoring can support my _____ over the next few years.',
  'gain hands on experience':'During my internship, I hope to _____ before applying for a full-time role.',
  'meet a deadline':'We need to _____ by Friday, so the report must be finished today.',
  'take on responsibility':'After two years on the team, I am ready to _____ for a larger project.',
  'goal':'I want to set a clear _____ for the next three months.',
  'experience':'This internship will help me gain useful _____.',
  'deadline':'The _____ is Friday, so we need to finish the report today.',
  'decision':'We need to make a final _____ before the meeting ends.',
  'attention':'Please pay close _____ to the instructions.',
  'job':'She plans to apply for a _____ after graduation.',
  'promotion':'He hopes to get a _____ after taking on more responsibility.',
  'information':'I need more _____ before I can make a decision.',
  'confidence':'Speaking every day can help you build _____.',
  'problem':'We worked together to solve the _____.',
  'message':'I will send you a _____ after the meeting.',
  'report':'I need to finish the _____ before Friday.',
  'responsibility':'After my promotion, I had more _____ at work.',
  'interest':'She showed real _____ in the new project.',
  'friend':'It is easier to make a new _____ when you join a club.',
  'friends':'It is easier to make _____ when you join a club.',
  'course':'I am planning to take a short _____ next month.',
  'university':'She wants to apply to _____ next year.',
  'technology':'We use _____ to communicate with customers.',
  'ticket':'I booked my _____ online before the journey.',
  'luggage':'I packed my _____ the night before the flight.',
  'request':'The customer made a special _____ at reception.',
  'complaint':'The customer made a _____ about the service.',
  'progress':'I practise every day because I want to make _____.',
  'meeting':'We will hold a _____ tomorrow morning.',
  'plan':'Let us make a _____ before we start the project.',
  'support':'My manager gave me useful _____ when I started.',
  'advice':'My teacher gave me useful _____ about my presentation.',
  'question':'If you are unsure, ask a _____.',
  'budget':'We need to make a _____ before we spend the money.',
  'reservation':'I made a hotel _____ before travelling.',
  'feedback':'My manager gave me useful _____ after the presentation.',
  'research':'We need to do more _____ before making a decision.',
  'exercise':'Regular _____ can improve your health.'
};

function references(l){
  try{
    if(typeof workbookVocabReferences==='function'){
      const refs=workbookVocabReferences(l);
      if(Array.isArray(refs)&&refs.length){
        return refs.map(x=>({
          word:String(x.word||'').trim(),
          meaning:String(x.meaning||'').trim(),
          example:String(x.example||'').trim()
        })).filter(x=>x.word);
      }
    }
  }catch{}
  const out=[];
  const items=Array.isArray(l?.vocabulary?.items)?l.vocabulary.items:[];
  for(const q of items){
    const quoted=String(q.q||'').match(/[“"]([^”"]+)[”"]/);
    const answer=String(q.answer||'').trim();
    let word=quoted?.[1]||'';
    if(!word&&answer&&answer.split(/\s+/).length<=4)word=answer;
    if(word)out.push({word,meaning:'',example:''});
  }
  (Array.isArray(l?.targetVocabulary)?l.targetVocabulary:[]).forEach(word=>out.push({word:String(word),meaning:'',example:''}));
  (Array.isArray(l?.expressions)?l.expressions:[]).forEach(x=>out.push({word:String(x.text||''),meaning:String(x.job||''),example:String(x.example||'')}));
  return uniq(out,x=>norm(x.word));
}

function safeExample(item){
  const example=String(item.example||'').trim();
  if(!example)return'';
  const re=new RegExp(regexEscape(item.word),'i');
  return re.test(example)?example:'';
}

function usageSentence(item){
  const key=norm(item.word);
  if(USAGE_TEMPLATES[key])return USAGE_TEMPLATES[key];
  const ex=safeExample(item);
  if(ex)return ex.replace(new RegExp(regexEscape(item.word),'i'),'_____');
  return'';
}

function feedbackMeta(item,l){
  const sentence=usageSentence(item);
  const example=safeExample(item)||sentence.replace('_____',item.word)||('Use “'+item.word+'” naturally when speaking about '+String(l?.title||'this topic').toLowerCase()+'.');
  return{
    word:String(item.word||'').trim(),
    meaning:String(item.meaning||'Use this word or phrase in the situation shown.').trim(),
    example:String(example||'').trim()
  };
}

function options(pool,target,seed){
  const distractors=pool.filter(x=>norm(x.word)!==norm(target.word)).map(x=>x.word);
  return shuffleStable([target.word,...distractors.slice(0,3)],seed).slice(0,4);
}

function usagePrompt(target,l,mode){
  const sentence=usageSentence(target);
  if(sentence){
    return mode==='situation'
      ?'You are in a real situation connected to '+String(l?.title||'this lesson')+'. Complete the sentence naturally: “'+sentence+'”'
      :'Complete the sentence naturally: “'+sentence+'”';
  }
  const meaning=String(target.meaning||'').trim();
  if(meaning){
    return 'In a real conversation, which word or phrase would you use when you want to '+meaning.replace(/[.!?]+$/,'')+'?';
  }
  return 'Which word or phrase would you use naturally when talking about '+String(l?.title||'this topic').toLowerCase()+'?';
}

function gradedItems(l,pool){
  const usable=pool.filter(x=>usageSentence(x)||String(x.meaning||'').trim());
  const source=usable.length?usable:pool;
  const items=[];
  for(let i=0;i<10;i++){
    const target=source[i%source.length];
    const mode=i<6?'context':'situation';
    items.push({
      q:usagePrompt(target,l,mode),
      options:options(source,target,i+1),
      answer:target.word,
      tag:mode==='context'?'vocabulary:fluency-context':'vocabulary:fluency-situation',
      target:feedbackMeta(target,l),
      label:mode==='context'?'Use in context':'Situation use'
    });
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
    const pool=uniq(references(l),x=>norm(x.word)).filter(x=>x.word&&x.word.length<=48);
    if(!pool.length)return previousVocabActivity(l);
    const graded=gradedItems(l,pool);
    if(!graded.length)return previousVocabActivity(l);
    const production=[pool[0],pool[Math.min(1,pool.length-1)]].filter(Boolean);
    return '<div class="eg-skill-page eg-vocabulary-page eg-vocab-fluency-first">'+
      '<header class="eg-skill-hero"><div><span class="eg-skill-kicker">Vocabulary</span><h1>Use the words, don’t define them</h1><p>Practise vocabulary in real sentences and situations. Definitions stay in the language bank; the exercises test whether you can actually use the words.</p></div><span class="eg-question-count">10 usage questions</span></header>'+ 
      '<div class="eg-skill-layout">'+
        '<aside class="eg-editorial-panel eg-vocab-reference"><div class="eg-panel-heading"><small>Language bank</small><h2>'+esc(l.title||'Vocabulary')+'</h2><p>Review meaning and examples here before you practise using the words.</p></div>'+ 
          '<div class="eg-vocab-reference-grid">'+pool.slice(0,10).map((x,i)=>'<article class="eg-vocab-reference-card"><span>'+(i+1)+'</span><strong>'+esc(x.word)+'</strong>'+(x.meaning?'<p>'+esc(x.meaning)+'</p>':'')+(x.example?'<small>“'+esc(x.example)+'”</small>':'')+'</article>').join('')+'</div></aside>'+ 
        '<main class="eg-task-panel"><div class="eg-task-panel-head"><div><small>Fluency practice</small><h2>Context → situation → real use</h2></div><span>Usage first</span></div>'+ 
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

window.ENGLISHGATE_VOCAB_FLUENCY_FIRST_VERSION='1.1.0';
})();
