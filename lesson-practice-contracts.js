'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');

const clean=(x,n=1200)=>String(x||'').replace(/\u0000/g,'').replace(/\s+/g,' ').trim().slice(0,n);
let cachedLessons=null;

function curriculum(){
 if(cachedLessons)return cachedLessons;
 const ctx={window:{}};vm.createContext(ctx);
 for(const file of ['speakup-b2-blueprint.js','a1-gold-v1.js']){
  vm.runInContext(fs.readFileSync(path.join(__dirname,'public',file),'utf8'),ctx,{timeout:2500});
 }
 cachedLessons=new Map([...(ctx.window.SPEAKUP_B2_BLUEPRINT||[]),...(ctx.window.A1_GOLD_V1_BOOK?.lessons||[])].map(l=>[l.id,l]));
 return cachedLessons;
}

function slug(value){
 return clean(value,120).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,48)||'goal';
}
function humanize(value){
 return clean(value,120).replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
}
function sentence(value){const s=clean(value,220);return s?s.charAt(0).toUpperCase()+s.slice(1):''}
function goalId(label){
 const x=String(label||'').toLowerCase();
 if(/introduc/.test(x))return'introduce';
 if(/follow[ -]?up|ask.+question|relevant question/.test(x))return'follow_up';
 if(/add.+detail|useful detail|extend.+answer/.test(x))return'detail';
 if(/react/.test(x))return'react';
 if(/maintain|keep.+exchange|keep.+interaction/.test(x))return'maintain';
 if(/respond/.test(x))return'respond';
 if(/duration|for or since|for\/since/.test(x))return'duration';
 return slug(label);
}
function uniqueGoals(items){
 const used=new Map();
 return items.filter(x=>x&&x.label).map(x=>{
  const base=x.id||goalId(x.label),n=(used.get(base)||0)+1;used.set(base,n);
  return {...x,id:n===1?base:`${base}_${n}`};
 });
}

function minimumEvidenceGoals(minimum={}){
 const out=[];
 for(const [key,value] of Object.entries(minimum||{})){
  if(value===false||value==null)continue;
  const name=humanize(key);
  if(typeof value==='number'&&value>0){
   const noun={
    personaldetails:'relevant personal details',relevantquestions:'relevant questions',workfacts:'work facts',workdetails:'work or study details',
    reasons:'clear reasons',steps:'sequence steps',preferences:'preferences',placedetails:'place details',scheduledetails:'schedule details',
    futuredetails:'future-plan details',pastevents:'past-event details',servicemoves:'service interaction moves'
   }[name.replace(/\s/g,'')]||name;
   out.push({label:`Give at least ${value} ${noun}`,required:true,source:`mastery.minimumSpeakingEvidence.${key}`});
  }else if(value===true){
   const label=/maintain|exchange|interaction/.test(name)?'Keep the exchange moving with an appropriate response':`Show ${name} during the conversation`;
   out.push({label,safeLabel:label,required:true,source:`mastery.minimumSpeakingEvidence.${key}`});
  }else if(typeof value==='string')out.push({label:sentence(value),required:true,source:`mastery.minimumSpeakingEvidence.${key}`});
 }
 return out;
}

function a1Goals(lesson){
 let goals=minimumEvidenceGoals(lesson?.mastery?.minimumSpeakingEvidence||{});
 if(goals.length<2){
  for(const fn of lesson?.functions||[]){
   if(goals.length>=4)break;
   goals.push({label:sentence(fn),required:true,source:'functions'});
  }
 }
 if(!goals.some(g=>/question/.test(g.label.toLowerCase()))&&(lesson?.interactionExpressions||[]).length){
  goals.push({label:'Ask or answer a relevant lesson question',required:true,source:'interactionExpressions'});
 }
 if(!goals.some(g=>/exchange|interaction/.test(g.label.toLowerCase()))){
  goals.push({label:'Keep the short exchange moving naturally',required:true,source:'performance'});
 }
 const target=Array.isArray(lesson?.targetLanguage)?lesson.targetLanguage.filter(Boolean).slice(0,3):[];
 if(target.length)goals.push({id:'target_language',label:`Use lesson language naturally, such as ${target.join(' / ')}`,required:false,source:'targetLanguage'});
 return uniqueGoals(goals).slice(0,6);
}

function b2Goals(lesson){
 const source=Array.isArray(lesson?.evidence?.conversation)&&lesson.evidence.conversation.length
  ?lesson.evidence.conversation
  :Array.isArray(lesson?.interact?.turns)&&lesson.interact.turns.length?lesson.interact.turns:(lesson?.functions||[]);
 const goals=[];
 for(const item of source.slice(0,5))goals.push({label:sentence(item),required:true,source:Array.isArray(lesson?.evidence?.conversation)&&lesson.evidence.conversation.length?'evidence.conversation':Array.isArray(lesson?.interact?.turns)&&lesson.interact.turns.length?'interact.turns':'functions'});
 if(!goals.some(g=>/maintain|interaction|respond|react|question/.test(g.label.toLowerCase())))goals.push({label:'Help maintain the interaction naturally',required:true,source:'performance'});
 if(lesson?.grammarFocus)goals.push({id:'target_language',label:`Use the lesson language accurately when relevant: ${clean(lesson.grammarFocus,140)}`,required:false,source:'grammarFocus'});
 return uniqueGoals(goals).slice(0,6);
}

function contractFor(lesson){
 if(!lesson?.id)return null;
 const isA1=String(lesson.id).startsWith('a1-');
 const goals=isA1?a1Goals(lesson):b2Goals(lesson);
 const required=goals.filter(g=>g.required);
 const minFromInteract=Number(lesson?.interact?.maxTurns||0);
 const minFromQuestions=Number(lesson?.mastery?.minimumSpeakingEvidence?.relevantQuestions||0);
 const minMeaningfulTurns=Math.max(isA1?2:3,Math.min(5,Math.max(minFromInteract,minFromQuestions+1||0)));
 const vocabulary=(Array.isArray(lesson?.targetVocabulary)?lesson.targetVocabulary:Array.isArray(lesson?.vocabulary)?lesson.vocabulary:[])
  .map(x=>clean(typeof x==='string'?x:x?.word||x?.text,80)).filter(Boolean).slice(0,8);
 const targetLanguage=isA1
  ?(Array.isArray(lesson?.targetLanguage)?lesson.targetLanguage.filter(Boolean).slice(0,6):[])
  :[clean(lesson?.grammarFocus,180)].filter(Boolean);
 const usefulPhrase=clean((lesson?.chunks||[])[0]||(lesson?.interactionExpressions||[])[0]||(Array.isArray(lesson?.targetLanguage)?lesson.targetLanguage[0]:''),160);
 const canDo=clean(lesson?.communicationGoal||lesson?.outcome||lesson?.performance||lesson?.mastery?.communicationGoal,500);
 const transferMission=clean(lesson?.review?.mission||lesson?.performance||lesson?.outcome,500);
 const requiredObserved=Math.min(required.length,Math.max(1,Math.ceil(required.length*0.6)));
 return {
  version:'englishgate-speaking-contract-v1',lessonId:lesson.id,title:clean(lesson.title,180),level:isA1?'A1':'B2',
  canDo,goals,minMeaningfulTurns,requiredObserved,targetVocabulary:vocabulary,targetLanguage,usefulPhrase,transferMission,
  source:isA1?'A1 Gold curriculum: mastery/functions/interaction':'B2 blueprint: conversation evidence/interact/functions'
 };
}
function contractForId(lessonId){return contractFor(curriculum().get(clean(lessonId,80)))}
function goalsForContext(context={}){
 const contract=contractForId(context.lessonId);
 if(contract?.goals?.length)return contract.goals;
 return [
  {id:'answer',label:'Answer the current activity question clearly',required:true,source:'safety_fallback'},
  {id:'maintain',label:'Help maintain the interaction',required:true,source:'safety_fallback'}
 ];
}

function feedbackForSession(contract,row={}){
 const goals=contract?.goals||[],evidence=row.goal_evidence||{};
 const goalEvidence=goals.map(g=>({id:g.id,label:g.label,required:Boolean(g.required),status:evidence?.[g.id]?'observed':'not_observed',confidence:evidence?.[g.id]?.confidence??null}));
 const observed=goalEvidence.filter(g=>g.status==='observed'),requiredObserved=observed.filter(g=>g.required),missingRequired=goalEvidence.filter(g=>g.required&&g.status!=='observed');
 const turns=Number(row.turn_count||0),uncertain=Number(row.uncertain_count||0),technical=clean(row.technical_issue,180);
 const quality=technical?'technical_issue':(uncertain>0&&uncertain>=Math.max(1,turns)?'uncertain':'trusted');
 let didWell=requiredObserved[0]?.label||observed[0]?.label||'';
 if(!didWell&&turns>0)didWell=`You completed ${turns} meaningful speaking turn${turns===1?'':'s'}.`;
 if(!didWell)didWell='You opened the speaking practice and prepared to respond.';
 const improve=missingRequired[0]?`Next time, try to show this more clearly: ${missingRequired[0].label}.`:null;
 const enough=turns>=Number(contract?.minMeaningfulTurns||2)&&requiredObserved.length>=Number(contract?.requiredObserved||1)&&quality==='trusted';
 const next=technical?'Retry when your microphone or connection is stable.':quality==='uncertain'?'Try one short round again so EnglishGate can collect clearer evidence.':enough?'Continue to the next lesson activity.':'Try one more short speaking round, focusing on the suggested goal.';
 return {
  lessonId:contract?.lessonId||row.lesson_id,title:contract?.title||row.lesson_id,canDo:contract?.canDo||'',
  evidenceQuality:quality,turns,words:Number(row.word_count||0),vocabularyUsed:Array.isArray(row.vocabulary_used)?row.vocabulary_used:[],
  didWell,improve,usefulPhrase:contract?.usefulPhrase||'',next,goalEvidence,
  evidenceSummary:{observed:observed.length,requiredObserved:requiredObserved.length,requiredTarget:Number(contract?.requiredObserved||1),uncertainTurns:uncertain},
  note:'This is practice evidence, not a grade or mastery decision.'
 };
}

function allContracts(){return [...curriculum().values()].map(contractFor)}

module.exports={curriculum,contractFor,contractForId,goalsForContext,feedbackForSession,allContracts};
