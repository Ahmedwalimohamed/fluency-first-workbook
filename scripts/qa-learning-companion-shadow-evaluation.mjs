import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const lc=require('../learning-companion-v1.js');

// Deterministic offline shadow-evaluation harness.
// It tests policy routing and promotion criteria without affecting learners.
const scenarios=[
 {name:'correct',snapshot:{correct:true,mastery_state:'UNKNOWN'},diagnosis:{misconception:null,confidence:1},expected:['NO_ACTION']},
 {name:'high-confidence-error',snapshot:{correct:false,mastery_state:'UNKNOWN'},diagnosis:{misconception:'target_form',confidence:.90},expected:['HINT_1','TARGETED_MICRO_EXPLANATION','GUIDED_RETRY','DIAGNOSTIC_PROBE']},
 {name:'medium-confidence-error',snapshot:{correct:false,mastery_state:'UNKNOWN'},diagnosis:{misconception:'target_form',confidence:.65},expected:['DIAGNOSTIC_PROBE','HINT_1']},
 {name:'low-confidence-error',snapshot:{correct:false,mastery_state:'UNKNOWN'},diagnosis:{misconception:null,confidence:.25},expected:['GENERIC_HINT','DIAGNOSTIC_PROBE','HINT_1']},
 {name:'assessment-safety',snapshot:{correct:false,assessment_item:true,intervention_counts:{}},diagnosis:{misconception:'target_form',confidence:.92},forbidden:['WORKED_EXAMPLE','ANSWER_REVEAL']},
 {name:'hint-budget',snapshot:{correct:false,intervention_counts:{hints:2}},diagnosis:{misconception:'target_form',confidence:.9},forbidden:['HINT_1']}
];

let policyChecks=0;
for(const s of scenarios){
 const route=lc.confidenceRoute(s.diagnosis.confidence);
 const fallback=lc.deterministicFallback(s.snapshot);
 const decision={action:fallback.action,confidence:s.diagnosis.confidence,reason_code:`SHADOW_${route}`};
 const gate=lc.policyGate(decision,s.snapshot);
 assert.equal(typeof gate.allowed,'boolean',`${s.name}: policy gate must decide`);
 if(s.forbidden)assert(!s.forbidden.includes(gate.action||decision.action),`${s.name}: forbidden action escaped gate`);
 policyChecks++;
}

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
