'use strict';

const SCORED_AREAS=Object.freeze(['vocabulary','reading','listening','grammar']);

function normalizeScore(value){
  const n=Number(value);
  if(!Number.isFinite(n))return 0;
  return Math.max(0,Math.min(1,n));
}

function allScoredComplete(state){
  return SCORED_AREAS.every(area=>Boolean(state?.completed?.[area]));
}

function masteryScore(state){
  if(!allScoredComplete(state))return null;
  return SCORED_AREAS.reduce((sum,area)=>sum+normalizeScore(state?.scores?.[area]),0)/SCORED_AREAS.length;
}

function weakestArea(state){
  return SCORED_AREAS.slice().sort((a,b)=>normalizeScore(state?.scores?.[a])-normalizeScore(state?.scores?.[b]))[0];
}

function decideAdaptiveRoute(state,lesson){
  const score=masteryScore(state);
  const threshold=normalizeScore(lesson?.mastery?.threshold??0.8);
  if(score==null)return Object.freeze({status:'collect_evidence',mastery:null,writingUnlocked:false,boost:null});
  if(score>=threshold)return Object.freeze({status:'mastered',mastery:score,writingUnlocked:true,boost:null});
  const area=weakestArea(state);
  return Object.freeze({status:'boost',mastery:score,writingUnlocked:false,boost:{area,weakAreaOnly:true}});
}

function transcriptUnlocked(listeningAttempts,lesson){
  const required=Math.max(1,Number(lesson?.stages?.listening?.transcriptUnlockAttempt||2));
  return Number(listeningAttempts||0)>=required;
}

function missionCompletion({outcomeReached=false,targetLanguageEvidence=[]}={}){
  return Object.freeze({
    completed:Boolean(outcomeReached),
    targetLanguageEvidence:Array.isArray(targetLanguageEvidence)?targetLanguageEvidence:[],
    rule:'Communicative outcome controls completion; target-language evidence informs feedback.'
  });
}

module.exports={SCORED_AREAS,normalizeScore,allScoredComplete,masteryScore,weakestArea,decideAdaptiveRoute,transcriptUnlocked,missionCompletion};
