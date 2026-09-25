'use strict';

const companion=require('./learning-companion-v1');
const TYPE_SAFE_URL=process.env.TYPESAFE_API_URL||'https://api.typesafe.ai/v1/systemone';
const TYPE_SAFE_MODEL=process.env.TYPESAFE_MODEL||'jev-latest';
const VERSION='learning-companion-jev-v1';

function evidence(answer,choice){
  const c=Number(answer?.confidence),p=Number(answer?.probabilities?.[choice]);
  const cc=Number.isFinite(c)&&c>=0&&c<=1?c:null;
  const pp=Number.isFinite(p)&&p>=0&&p<=1?p:null;
  if(cc!=null&&pp!=null)return Math.min(cc,pp);
  return pp??cc??0;
}

async function callJev(state,questions){
  const key=String(process.env.TYPESAFE_API_KEY||'').trim();
  if(!key)throw new Error('JEV_NOT_CONFIGURED');
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),Math.max(3000,Math.min(15000,Number(process.env.LC_JEV_TIMEOUT_MS)||7000)));
  try{
    const r=await fetch(TYPE_SAFE_URL,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({state,model:TYPE_SAFE_MODEL,questions}),signal:controller.signal});
    if(!r.ok)throw new Error(`JEV_${r.status}`);
    return await r.json();
  }finally{clearTimeout(timeout)}
}

async function diagnose(snapshot,event){
  if(snapshot.correct)return {misconception:null,confidence:1,evidence:['core_correct']};
  const state={task:'Classify a learner error narrowly. Do not teach and do not generate feedback.',snapshot,event:{event_type:event.event_type,activity_id:event.activity_id,response:event.response},rules:['Use only supplied evidence.','Do not infer a misconception when evidence is insufficient.','Return uncertain when evidence is weak.']};
  const questions={diagnosis:{type:'choice',instructions:'Which diagnosis is best supported?',criteria:{target_form:'Evidence supports an error in the target form or skill.',repeated_pattern:'Evidence supports a repeated known pattern.',uncertain:'Evidence is insufficient for a specific diagnosis.'}}};
  const data=await callJev(state,questions),a=data?.answers?.diagnosis,choice=String(a?.choice||'uncertain');
  const confidence=evidence(a,choice);
  return {misconception:choice==='uncertain'?null:choice,confidence,evidence:[`jev:${choice}`],version:VERSION};
}

async function decide({snapshot,diagnosis,route,approved_actions}){
  const allowed=approved_actions.filter(x=>companion.ACTIONS.includes(x));
  const state={task:'Select exactly one approved Learning Companion action.',snapshot,diagnosis,route,allowed_actions:allowed,rules:['Never invent an action.','Prefer minimum necessary help.','Uncertain diagnosis requires evidence gathering, not confident remediation.','Do not reveal assessment answers.']};
  const criteria={};
  for(const action of allowed)criteria[action]=`Choose ${action} only when it is the minimum safe instructional action supported by the state.`;
  const data=await callJev(state,{action:{type:'choice',instructions:'Choose one and only one allowed action.',criteria}}),a=data?.answers?.action,action=String(a?.choice||'');
  if(!allowed.includes(action))throw new Error('JEV_UNKNOWN_ACTION');
  return {action,reason_code:`JEV_${route}`,confidence:evidence(a,action),jev_graph_version:VERSION};
}

module.exports={VERSION,evidence,diagnose,decide};
