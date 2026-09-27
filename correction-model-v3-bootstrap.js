const express=require('express');
const jwt=require('jsonwebtoken');

const previousPost=express.application.post;
const installed=new WeakSet();
const TYPE_SAFE_URL=process.env.TYPESAFE_API_URL||'https://api.typesafe.ai/v1/systemone';
const TYPE_SAFE_MODEL=process.env.TYPESAFE_MODEL||'jev-latest';
const VERSION='englishgate-correction-model-v3';
const PRIORITY=['task','organisation','clarity','grammar','vocabulary','mechanics'];

function studentSession(req){
  try{
    const user=jwt.verify(req.cookies?.ff_session||'',process.env.JWT_SECRET);
    return user?.role==='student'?user:null;
  }catch{return null}
}
function clean(value,max=8000){return String(value||'').trim().slice(0,max)}
function clip(value,max=220){const s=clean(value,max+20);return s.length>max?s.slice(0,max-1)+'…':s}
function splitSentences(text){
  const src=clean(text,6000).replace(/\s+/g,' ').trim();
  if(!src)return [];
  const chunks=src.match(/[^.!?]+[.!?]?/g)||[src];
  return chunks.map(x=>x.trim()).filter(Boolean).slice(0,12)
}
function genericChoice(data,id,allowed){
  const a=data?.answers?.[id]||data?.[id]||null;
  const choice=String(a?.choice||a?.answer||a?.value||'').toLowerCase().trim();
  if(!allowed.includes(choice))return null;
  const confidence=Number(a?.confidence),probability=Number(a?.probabilities?.[choice]);
  const c=Number.isFinite(confidence)&&confidence>=0&&confidence<=1?confidence:null;
  const p=Number.isFinite(probability)&&probability>=0&&probability<=1?probability:null;
  return {choice,confidence:c!=null&&p!=null?Math.min(c,p):(p??c)}
}
async function callJev(state,questions){
  const key=String(process.env.TYPESAFE_API_KEY||'').trim();
  if(!key)throw new Error('Jev is not configured.');
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),Math.max(7000,Math.min(45000,Number(process.env.TYPESAFE_TIMEOUT_MS)||30000)));
  try{
    const r=await fetch(TYPE_SAFE_URL,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({state,model:TYPE_SAFE_MODEL,questions}),signal:controller.signal});
    if(!r.ok)throw new Error(`Jev correction selector ${r.status}`);
    return await r.json()
  }finally{clearTimeout(timeout)}
}
function levenshtein(a,b){
  const x=String(a||''),y=String(b||'');
  const row=Array.from({length:y.length+1},(_,i)=>i);
  for(let i=1;i<=x.length;i++){
    let prev=row[0];row[0]=i;
    for(let j=1;j<=y.length;j++){
      const hold=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(x[i-1]===y[j-1]?0:1));prev=hold
    }
  }
  return row[y.length]
}
function replaceOnce(sentence,from,to){
  const ix=sentence.toLowerCase().indexOf(String(from).toLowerCase());
  return ix<0?sentence:sentence.slice(0,ix)+to+sentence.slice(ix+String(from).length)
}
function makeCorrection({priority='grammar',sourceSentence='',focusDifference='',term='',label='',definition='',rule='',contrastFrom='',contrastTo='',repairPrompt='',suggestedCorrection='',confidence=1,mode='teach_retry'}){
  return {version:VERSION,mode,priority,sourceSentence,focusDifference,dictionary:{term,label,definition},rule,contrast:{from:contrastFrom,to:contrastTo},repairPrompt,suggestedCorrection,confidence}
}
function detectComparative(sentence,context=''){
  if(!/\bthan\b/i.test(sentence+' '+context))return null;
  const match=sentence.match(/\b([A-Za-z][A-Za-z'-]*)\s+than\b/i);if(!match)return null;
  const typed=match[1].toLowerCase();
  const pairs={sweet:'sweeter',spicy:'spicier',salty:'saltier',tasty:'tastier',healthy:'healthier',cheap:'cheaper',fresh:'fresher',hot:'hotter',cold:'colder',big:'bigger',small:'smaller',fast:'faster',slow:'slower',easy:'easier',hard:'harder',safe:'safer',clean:'cleaner',quiet:'quieter',loud:'louder',warm:'warmer',cool:'cooler',strong:'stronger',weak:'weaker',old:'older',young:'younger',long:'longer',short:'shorter',high:'higher',low:'lower',good:'better',bad:'worse'};
  let best=null;
  for(const [base,comparative] of Object.entries(pairs)){
    if(typed===comparative)return null;
    const distance=Math.min(levenshtein(typed,comparative),levenshtein(typed,base));
    if(!best||distance<best.distance)best={base,comparative,distance}
  }
  if(!best||best.distance>(typed.length>=6?2:1))return null;
  return makeCorrection({priority:'grammar',sourceSentence:sentence,focusDifference:`${match[1]} → ${best.comparative}`,term:best.comparative,label:'comparative adjective',definition:`the comparative form of “${best.base}”; it compares two things or people.`,rule:'Use the comparative form before “than” when you compare two things.',contrastFrom:`This food is ${best.base}.`,contrastTo:`This food is ${best.comparative} than the other one.`,repairPrompt:`Change only “${match[1]}” in your sentence, then check the sentence again.`,suggestedCorrection:replaceOnce(sentence,match[1],best.comparative)})
}
const ADVERBS={confident:'confidently',slow:'slowly',quick:'quickly',clear:'clearly',fluent:'fluently',careful:'carefully',effective:'effectively',professional:'professionally',correct:'correctly',easy:'easily',good:'well'};
function detectAdverb(sentence){
  const verbs='speak|write|communicate|respond|explain|read|work|drive|talk|present';
  const match=sentence.match(new RegExp(`\\b(${verbs})\\s+(confident|slow|quick|clear|fluent|careful|effective|professional|correct|easy|good)\\b`,'i'));
  if(!match)return null;
  const base=match[2].toLowerCase(),adv=ADVERBS[base];if(!adv)return null;
  return makeCorrection({priority:'grammar',sourceSentence:sentence,focusDifference:`${match[2]} → ${adv}`,term:adv,label:'adverb',definition:`a word that tells us how an action happens; “${adv}” describes the verb.`,rule:`Use an adverb to describe how someone ${match[1].toLowerCase()}s.`,contrastFrom:`Her English is ${base}.`,contrastTo:`She speaks ${adv}.`,repairPrompt:`Change only “${match[2]}” to the adverb form in your sentence, then check again.`,suggestedCorrection:replaceOnce(sentence,match[2],adv)})
}
function detectVerbPattern(sentence){
  const triggers='want|wants|need|needs|plan|plans|hope|hopes|decide|decides|learn|learns|try|tries';
  const verbs='communicate|improve|speak|learn|work|travel|study|write|read|buy|get|become|practice|practise|use|make|go|start|finish|apply|help';
  const match=sentence.match(new RegExp(`\\b(${triggers})\\s+(${verbs})\\b`,'i'));
  if(!match)return null;
  const phrase=`to ${match[2].toLowerCase()}`;
  return makeCorrection({priority:'grammar',sourceSentence:sentence,focusDifference:`${match[2]} → ${phrase}`,term:'to + verb',label:'verb pattern',definition:'the infinitive form used after verbs such as want, need, plan, hope, and decide.',rule:`After “${match[1]}”, use “to + verb” when the next word is an action.`,contrastFrom:'I want a new job.',contrastTo:'I want to improve my English.',repairPrompt:`Add “to” before “${match[2]}” in your sentence, then check again.`,suggestedCorrection:replaceOnce(sentence,match[2],phrase)})
}
function detectAgreement(sentence){
  const subjects='my work|my job|the job|the course|the teacher|the student|the company|the school|the system|the app|the program|the programme|he|she|it';
  const forms={require:'requires',need:'needs',help:'helps',make:'makes',use:'uses',have:'has',do:'does',go:'goes',work:'works',speak:'speaks',want:'wants'};
  const match=sentence.match(new RegExp(`\\b(${subjects})\\s+(require|need|help|make|use|have|do|go|work|speak|want)\\b`,'i'));
  if(!match)return null;
  const base=match[2].toLowerCase(),fixed=forms[base];
  return makeCorrection({priority:'grammar',sourceSentence:sentence,focusDifference:`${match[2]} → ${fixed}`,term:fixed,label:'third-person singular verb',definition:`the present-simple form used with a singular subject such as “${match[1]}”.`,rule:'In the present simple, a singular third-person subject normally takes a verb ending in -s or an irregular singular form.',contrastFrom:'My jobs require English.',contrastTo:'My job requires English.',repairPrompt:`Repair only the verb “${match[2]}” so it agrees with “${match[1]}”, then check again.`,suggestedCorrection:replaceOnce(sentence,match[2],fixed)})
}
const MISSPELLINGS={becouse:'because',definately:'definitely',recieve:'receive',seperate:'separate',wich:'which',frist:'first',langauge:'language',became:'became'};
function detectSpelling(sentence){
  const tokens=sentence.match(/[A-Za-z]+/g)||[];
  for(const token of tokens){
    const fixed=MISSPELLINGS[token.toLowerCase()];
    if(fixed&&fixed!==token.toLowerCase())return makeCorrection({priority:'mechanics',sourceSentence:sentence,focusDifference:`${token} → ${fixed}`,term:fixed,label:'spelling',definition:`the standard spelling of this word is “${fixed}”.`,rule:'Keep the meaning the same; repair only the spelling.',contrastFrom:`Incorrect spelling: ${token}`,contrastTo:`Standard spelling: ${fixed}`,repairPrompt:`Correct only “${token}” in your sentence, then check again.`,suggestedCorrection:replaceOnce(sentence,token,fixed)})
  }
  return null
}
function detectRepetition(sentence){
  const match=sentence.match(/\b([A-Za-z]{2,})\s+\1\b/i);if(!match)return null;
  return makeCorrection({priority:'mechanics',sourceSentence:sentence,focusDifference:`${match[0]} → ${match[1]}`,term:'repetition',label:'editing',definition:'an accidental repeated word that should appear only once.',rule:'Delete the duplicate word; do not change the rest of the sentence.',contrastFrom:'I really really enjoyed the class.',contrastTo:'I really enjoyed the class.',repairPrompt:`Remove one repeated “${match[1]}”, then check again.`,suggestedCorrection:sentence.replace(match[0],match[1])})
}
function detectCapitalization(sentence){
  const match=sentence.match(/^\s*([a-z])/);if(!match)return null;
  const fixed=match[1].toUpperCase();
  return makeCorrection({priority:'mechanics',sourceSentence:sentence,focusDifference:`${match[1]} → ${fixed}`,term:'capital letter',label:'mechanics',definition:'an uppercase letter used at the beginning of a sentence.',rule:'Begin a complete sentence with a capital letter.',contrastFrom:'my job requires English.',contrastTo:'My job requires English.',repairPrompt:'Change only the first letter to a capital letter, then check again.',suggestedCorrection:sentence.replace(match[1],fixed)})
}
function detectTerminalPunctuation(sentence){
  if(!sentence||/[.!?][”’"']?$/.test(sentence))return null;
  return makeCorrection({priority:'mechanics',sourceSentence:sentence,focusDifference:'no final mark → .',term:'full stop',label:'punctuation',definition:'the punctuation mark used to end a complete statement.',rule:'End a complete statement with a full stop.',contrastFrom:'I finished the report',contrastTo:'I finished the report.',repairPrompt:'Add the missing end punctuation, then check again.',suggestedCorrection:sentence+'.'})
}
function localCorrection(sentences,context=''){
  for(const sentence of sentences){
    for(const detector of [s=>detectComparative(s,context),detectVerbPattern,detectAdverb,detectAgreement,detectSpelling,detectRepetition,detectCapitalization,detectTerminalPunctuation]){
      const found=detector(sentence);if(found)return found
    }
  }
  return null
}
function shortPriority(decisions={}){
  const rows=[
    ['task',decisions.task_fit],['grammar',decisions.target_form],['vocabulary',decisions.word_choice],['clarity',decisions.clarity]
  ].filter(([,d])=>String(d?.choice||'')==='revise').map(([id,d])=>({id,confidence:Number(d?.confidence)||0})).sort((a,b)=>b.confidence-a.confidence);
  return rows[0]?.id||'clarity'
}
function paragraphPriority(dimensions={}){
  const score=id=>Number(dimensions?.[id]?.score??100);
  for(const id of ['task','organisation','grammar','vocabulary','mechanics'])if(score(id)<85)return id;
  return Object.keys(dimensions).sort((a,b)=>score(a)-score(b))[0]||'clarity'
}
const ISSUE_TEMPLATES={
  subject_verb_agreement:{term:'subject–verb agreement',label:'grammar pattern',definition:'the rule that the verb form must match whether the subject is singular or plural.',rule:'Check the subject first, then choose the present-tense verb form that agrees with it.',from:'My jobs require English.',to:'My job requires English.'},
  verb_pattern:{term:'verb pattern',label:'grammar pattern',definition:'the form that normally follows a particular verb, such as “want to + verb”.',rule:'Some verbs require “to + verb” before the next action.',from:'I want a new job.',to:'I want to improve my English.'},
  comparative:{term:'comparative form',label:'grammar pattern',definition:'the adjective form used to compare two things, often with “than”.',rule:'Use the comparative adjective before “than”.',from:'This dish is spicy.',to:'This dish is spicier than that one.'},
  adverb_form:{term:'adverb',label:'word class',definition:'a word that tells us how an action happens.',rule:'Use an adverb when you describe how a verb is performed.',from:'Her English is clear.',to:'She speaks clearly.'},
  article:{term:'article',label:'grammar word',definition:'a small word such as “a”, “an”, or “the” used before a noun.',rule:'Check whether the noun needs an article and whether it is specific or general.',from:'I bought book yesterday.',to:'I bought a book yesterday.'},
  tense:{term:'tense',label:'grammar system',definition:'the verb form that locates an action in time.',rule:'Make the verb time match the time meaning in the sentence.',from:'Yesterday I go to class.',to:'Yesterday I went to class.'},
  sentence_structure:{term:'sentence structure',label:'grammar',definition:'the way subjects, verbs, clauses, and other parts are arranged to make a complete sentence.',rule:'Keep one clear subject–verb relationship before adding extra detail.',from:'Because I was tired.',to:'Because I was tired, I went home early.'},
  wrong_word:{term:'word choice',label:'vocabulary',definition:'choosing a word whose meaning fits the idea and the sentence around it.',rule:'Keep your idea, but replace the word that does not express the intended meaning.',from:'I made a strong rain.',to:'We had heavy rain.'},
  collocation:{term:'collocation',label:'vocabulary pattern',definition:'words that are commonly used together in natural English.',rule:'Use the word combination English speakers normally use together.',from:'do a decision',to:'make a decision'},
  repetition:{term:'repetition',label:'vocabulary control',definition:'using the same word or idea too often when another clear expression would improve the text.',rule:'Replace or remove one repeated item without changing your main meaning.',from:'The course was good. The teacher was good.',to:'The course was useful. The teacher was supportive.'},
  spelling:{term:'spelling',label:'mechanics',definition:'the standard written form of a word.',rule:'Repair the letters in the word without changing the sentence meaning.',from:'recieve',to:'receive'},
  capitalization:{term:'capitalization',label:'mechanics',definition:'using uppercase letters where standard writing requires them.',rule:'Start a sentence and proper names with capital letters.',from:'my teacher is Ahmed.',to:'My teacher is Ahmed.'},
  punctuation:{term:'punctuation',label:'mechanics',definition:'marks such as full stops and commas that show sentence boundaries and relationships.',rule:'Use punctuation to show where one complete idea ends and another begins.',from:'I finished the task',to:'I finished the task.'},
  sentence_boundary:{term:'sentence boundary',label:'mechanics',definition:'the point where one complete sentence ends and another begins.',rule:'Separate complete ideas with appropriate punctuation instead of running them together.',from:'I finished work I went home.',to:'I finished work. Then I went home.'},
  clarity:{term:'clarity',label:'writing quality',definition:'how easily a reader can understand exactly what you mean.',rule:'Keep the main subject, action, and meaning easy to identify.',from:'It was this thing that made it hard.',to:'The unclear instructions made the task hard.'}
};
function globalCorrection(priority,task,response){
  if(priority==='task')return makeCorrection({priority,sourceSentence:clip(response,260),focusDifference:'partial/general response → direct task response',term:'task achievement',label:'writing skill',definition:'how completely your writing does the job described in the prompt.',rule:`Your paragraph must directly answer this task: ${clip(task,180)}`,contrastFrom:'I like online learning.',contrastTo:'I prefer online learning because I can study after work.',repairPrompt:'Repair one sentence so it directly answers the missing or underdeveloped part of the task. Do not rewrite the whole paragraph.'});
  if(priority==='organisation')return makeCorrection({priority,sourceSentence:clip(response,260),focusDifference:'separate ideas → clearly connected ideas',term:'cohesion',label:'writing skill',definition:'the way sentences and ideas connect so the reader can follow them easily.',rule:'Connect ideas by showing the relationship between them: reason, contrast, result, order, or example.',contrastFrom:'I was tired. I finished the report.',contrastTo:'Although I was tired, I finished the report.',repairPrompt:'Choose one abrupt transition in your paragraph and connect those two ideas more clearly. Then recheck the paragraph.'});
  const template=ISSUE_TEMPLATES.clarity;
  return makeCorrection({priority,sourceSentence:clip(response,260),focusDifference:'unclear expression → precise expression',...template,contrastFrom:template.from,contrastTo:template.to,repairPrompt:'Choose the least clear sentence, make its main meaning more precise, and then recheck the paragraph.'})
}
async function chooseSentenceAndIssue(sentences,priority,state){
  const taxonomies={
    grammar:['subject_verb_agreement','verb_pattern','comparative','adverb_form','article','tense','sentence_structure'],
    vocabulary:['wrong_word','collocation','repetition'],
    mechanics:['spelling','capitalization','punctuation','sentence_boundary'],
    clarity:['clarity']
  };
  const issues=taxonomies[priority]||['clarity'];
  if(!sentences.length)return null;
  if(!String(process.env.TYPESAFE_API_KEY||'').trim())return {sentence:sentences[0],issue:issues[0],confidence:null};
  const sentenceCriteria={};sentences.forEach((s,i)=>sentenceCriteria['s'+(i+1)]=`Sentence ${i+1}: ${clip(s,180)}`);
  const issueCriteria={};issues.forEach(id=>issueCriteria[id]=ISSUE_TEMPLATES[id]?.definition||id.replace(/_/g,' '));
  try{
    const data=await callJev({...state,priority,sentences}, {
      repair_sentence:{type:'choice',instructions:`Choose the ONE sentence with the clearest, highest-value ${priority} problem. Prefer the smallest teachable problem that the learner can repair without rewriting the paragraph.`,criteria:sentenceCriteria},
      repair_type:{type:'choice',instructions:`Classify the smallest teachable ${priority} difference in that sentence. Choose the most specific available type.`,criteria:issueCriteria}
    });
    const s=genericChoice(data,'repair_sentence',Object.keys(sentenceCriteria)),i=genericChoice(data,'repair_type',issues);
    if(!s||!i)return null;
    const index=Math.max(0,Number(s.choice.slice(1))-1);
    return {sentence:sentences[index]||sentences[0],issue:i.choice,confidence:Math.min(s.confidence??1,i.confidence??1)}
  }catch{return null}
}
function templateCorrection(target,priority){
  if(!target)return null;
  const t=ISSUE_TEMPLATES[target.issue]||ISSUE_TEMPLATES.clarity;
  return makeCorrection({priority,sourceSentence:target.sentence,focusDifference:`${t.term}: find and repair the smallest problem in this sentence`,term:t.term,label:t.label,definition:t.definition,rule:t.rule,contrastFrom:t.from,contrastTo:t.to,repairPrompt:'Repair only this sentence in your own paragraph, then submit the paragraph again.',confidence:target.confidence??0.5,mode:(target.confidence!=null&&target.confidence<0.45)?'diagnostic_probe':'teach_retry'})
}
async function buildCorrection(body){
  const mode=clean(body?.mode||'paragraph',20).toLowerCase(),lessonId=clean(body?.lessonId,100),task=clean(body?.task,1400),response=clean(body?.response,6000),targetLanguage=clean(body?.targetLanguage,1200),model=clean(body?.model,1200),grading=body?.gradingContext||{};
  if(!/^su-b2-l\d+$/.test(lessonId))throw Object.assign(new Error('Correction Model v3 is currently enabled for B2 Upper Intermediate.'),{status:423});
  if(!task||!response)throw Object.assign(new Error('Task and learner response are required.'),{status:400});
  const sentences=splitSentences(response),context=[task,targetLanguage,model].join(' ');
  const priority=mode==='short'?shortPriority(grading.decisions||{}):paragraphPriority(grading.dimensions||{});
  if(!['task','organisation'].includes(priority)){
    const local=localCorrection(sentences,context);
    if(local)return {correction:{...local,priority},priority,layer:'local-difference'}
  }
  if(['task','organisation'].includes(priority))return {correction:globalCorrection(priority,task,response),priority,layer:'paragraph-priority'};
  const target=await chooseSentenceAndIssue(sentences,priority,{purpose:'EnglishGate smallest-teachable-difference selector',lessonId,task,response,targetLanguage,model,rules:['Choose one repair only.','Prefer the smallest high-value difference.','Do not rewrite the learner paragraph.','Do not infer anything about the learner beyond the supplied writing.']});
  const correction=templateCorrection(target,priority)||globalCorrection(priority,task,response);
  return {correction,priority,layer:target?'jev-targeted-sentence':'safe-fallback'}
}
function install(app){
  if(installed.has(app))return;installed.add(app);
  previousPost.call(app,'/api/correction-model-v3',async(req,res)=>{
    if(!studentSession(req))return res.status(403).json({error:'Student access required.'});
    try{
      const result=await buildCorrection(req.body||{});
      res.set('Cache-Control','no-store');
      res.json({ok:true,version:VERSION,...result})
    }catch(e){
      const status=Number(e?.status)||502;
      console.error('EnglishGate Correction Model v3 error:',String(e?.message||e).slice(0,500));
      res.status(status).json({error:status===400?String(e.message):'A reliable correction could not be prepared. Your answer has not been marked correct.',version:VERSION})
    }
  })
}
express.application.post=function englishGateCorrectionModelPost(route,...handlers){install(this);return previousPost.call(this,route,...handlers)};

require('./reading-semantic-grading-bootstrap.js');
