import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const lc=require('../learning-companion-v1.js');

// Deterministic offline shadow-evaluation harness.
// It tests current policy routing and promotion criteria without affecting learners.
const scenarios=[
 {name:'correct',snapshot:{correct:true,attempt_number:1,intervention_counts:{}},diagnosis:{misconception:null,confidence:1}},
 {name:'high-confidence-error',snapshot:{correct:false,attempt_number:1,intervention_counts:{}},diagnosis:{misconception:'target_form',confidence:.90}},
 {name:'medium-confidence-error',snapshot:{correct:false,attempt_number:2,intervention_counts:{}},diagnosis:{misconception:'target_form',confidence:.65}},
 {name:'low-confidence-error',snapshot:{correct:false,attempt_number:3,intervention_counts:{}},diagnosis:{misconception:null,confidence:.25}},
 {name:'assessment-safety',snapshot:{correct:false,attempt_number:3,assessment_item:true,intervention_counts:{}},diagnosis:{misconception:'target_form',confidence:.92}},
 {name:'hint-budget',snapshot:{correct:false,attempt_number:2,intervention_counts:{hints:2}},diagnosis:{misconception:'target_form',confidence:.9}}
];

let policyChecks=0;
for(const s of scenarios){
 const route=lc.confidenceRoute(s.diagnosis.confidence);
 assert(['TARGETED_REMEDIATION','DIAGNOSTIC_PROBE','GENERIC_HINT'].includes(route));
 const fallback=lc.deterministicFallback(s.snapshot);
 assert(lc.ACTIONS.includes(fallback.action),`${s.name}: fallback must use approved action`);
 const gate=lc.policyGate(fallback,s.snapshot);
 assert.equal(typeof gate.allowed,'boolean',`${s.name}: policy gate must decide`);
 assert(lc.ACTIONS.includes(gate.action),`${s.name}: policy output must use approved action`);
 if(s.name==='hint-budget'){
   assert.equal(gate.allowed,false);
   assert.equal(gate.action,'CONTINUE');
   assert.equal(gate.reason,'HINT_LIMIT');
 }
 policyChecks++;
}
const protectedGate=lc.policyGate({action:'WORKED_EXAMPLE',confidence:.92,reason_code:'TEST'},scenarios.find(x=>x.name==='assessment-safety').snapshot);
assert.equal(protectedGate.allowed,false);
assert.equal(protectedGate.action,'PROMPT_NOTICE');
assert.equal(protectedGate.reason,'ASSESSMENT_ANSWER_PROTECTION');

// Promotion gates. Real shadow telemetry must satisfy these before student-facing activation.
const PROMOTION={
 minimum_events:100,
 valid_decision_rate:.99,
 unknown_action_rate:0,
 policy_violation_rate:0,
 duplicate_execution_rate:0,
 shadow_error_rate:.01,
 high_confidence_false_intervention_rate:.02,
 p95_added_core_latency_ms:5
};

function evaluate(metrics){
 const failures=[];
 if(metrics.events<PROMOTION.minimum_events)failures.push('INSUFFICIENT_EVENTS');
 if(metrics.valid_decision_rate<PROMOTION.valid_decision_rate)failures.push('VALID_DECISION_RATE');
 if(metrics.unknown_action_rate>PROMOTION.unknown_action_rate)failures.push('UNKNOWN_ACTION');
 if(metrics.policy_violation_rate>PROMOTION.policy_violation_rate)failures.push('POLICY_VIOLATION');
 if(metrics.duplicate_execution_rate>PROMOTION.duplicate_execution_rate)failures.push('DUPLICATE_EXECUTION');
 if(metrics.shadow_error_rate>PROMOTION.shadow_error_rate)failures.push('SHADOW_ERROR_RATE');
 if(metrics.high_confidence_false_intervention_rate>PROMOTION.high_confidence_false_intervention_rate)failures.push('FALSE_INTERVENTION_RATE');
 if(metrics.p95_added_core_latency_ms>PROMOTION.p95_added_core_latency_ms)failures.push('CORE_LATENCY');
 return {promote:failures.length===0,failures};
}

assert.equal(evaluate({events:99,valid_decision_rate:1,unknown_action_rate:0,policy_violation_rate:0,duplicate_execution_rate:0,shadow_error_rate:0,high_confidence_false_intervention_rate:0,p95_added_core_latency_ms:0}).promote,false);
assert.equal(evaluate({events:100,valid_decision_rate:1,unknown_action_rate:0,policy_violation_rate:0,duplicate_execution_rate:0,shadow_error_rate:0,high_confidence_false_intervention_rate:0,p95_added_core_latency_ms:0}).promote,true);

console.log(JSON.stringify({status:'PASS',mode:'SHADOW_ONLY',policyChecks,promotionGates:PROMOTION},null,2));
export {PROMOTION,evaluate};
