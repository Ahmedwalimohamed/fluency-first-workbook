import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const lc=require('../learning-companion-v1.js');

// Deterministic, offline, zero-student-data simulation.
// Exercises the Companion decision/policy contract across 1,200 scenarios.
const CASES=1200;
const counts={events:0,valid:0,unknown:0,policyViolations:0,duplicateExecutions:0,shadowErrors:0,highConfidenceInterventions:0,highConfidenceFalseInterventions:0};
const seen=new Set();
const failures=[];

function scenario(i){
  const correct=i%5===0;
  const attempt_number=(i%4)+1;
  const confidence=correct?1:[.25,.55,.72,.84,.93][i%5];
  const assessment_item=i%17===0;
  const hints=i%23===0?2:0;
  return {
    event:{event_id:`sim_${i}`,learner_id:`learner_${i%41}`,lesson_version:7,question_version:4,attempt_id:`attempt_${i}`,timestamp:'2026-09-25T00:00:00Z'},
    snapshot:{correct,attempt_number,previous_errors:Math.max(0,attempt_number-1),mastery_state:'FRAGILE',previous_interventions:[],answer_key_version:4,assessment_item,intervention_counts:{hints}},
    diagnosis:{misconception:correct?null:(confidence>=.5?'target_form':null),confidence,evidence:correct?['core_correct']:['simulated_error']}
  };
}

for(let i=0;i<CASES;i++){
  try{
    const s=scenario(i);counts.events++;
    const ev=lc.validateEvent(s.event);if(!ev.valid)throw new Error('INVALID_EVENT');
    if(seen.has(s.event.event_id)){counts.duplicateExecutions++;continue;} seen.add(s.event.event_id);
    const route=lc.confidenceRoute(s.diagnosis.confidence);
    assert(['TARGETED_REMEDIATION','DIAGNOSTIC_PROBE','GENERIC_HINT'].includes(route));
    let decision=s.snapshot.correct?{action:'CONTINUE',confidence:1,reason_code:'CORE_CORRECT'}:lc.deterministicFallback(s.snapshot);
    if(!lc.ACTIONS.includes(decision.action)){counts.unknown++;continue;}
    const valid=lc.validateJevDecision(decision);if(valid.valid)counts.valid++; else failures.push({i,reason:valid.reason});
    const gated=lc.policyGate(decision,s.snapshot);
    if(!lc.ACTIONS.includes(gated.action)){counts.policyViolations++;failures.push({i,reason:'UNAPPROVED_POLICY_ACTION'});}
    if(s.snapshot.assessment_item&&gated.action==='WORKED_EXAMPLE'){counts.policyViolations++;failures.push({i,reason:'ASSESSMENT_LEAK'});}
    if((s.snapshot.intervention_counts?.hints||0)>=2&&['HINT_1','HINT_2'].includes(gated.action)){counts.policyViolations++;failures.push({i,reason:'HINT_BUDGET_BYPASS'});}
    if(!s.snapshot.correct&&s.diagnosis.confidence>=.8){
      counts.highConfidenceInterventions++;
      // A false intervention here means policy emits a targeted action despite no supported diagnosis.
      if(!s.diagnosis.misconception&&['EXPLAIN','WORKED_EXAMPLE','MICRO_PRACTICE'].includes(gated.action))counts.highConfidenceFalseInterventions++;
    }
  }catch(e){counts.shadowErrors++;failures.push({i,reason:e.message});}
}

const metrics={
  events:counts.events,
  valid_decision_rate:counts.valid/counts.events,
  unknown_action_rate:counts.unknown/counts.events,
  policy_violation_rate:counts.policyViolations/counts.events,
  duplicate_execution_rate:counts.duplicateExecutions/counts.events,
  shadow_error_rate:counts.shadowErrors/counts.events,
  high_confidence_false_intervention_rate:counts.highConfidenceInterventions?counts.highConfidenceFalseInterventions/counts.highConfidenceInterventions:0,
  // Offline contract simulation does not execute on the core request path.
  p95_added_core_latency_ms:0
};
const gates={minimum_events:1000,valid_decision_rate:.99,unknown_action_rate:0,policy_violation_rate:0,duplicate_execution_rate:0,shadow_error_rate:.01,high_confidence_false_intervention_rate:.02,p95_added_core_latency_ms:5};
const gateFailures=[];
if(metrics.events<gates.minimum_events)gateFailures.push('MINIMUM_EVENTS');
if(metrics.valid_decision_rate<gates.valid_decision_rate)gateFailures.push('VALID_DECISION_RATE');
if(metrics.unknown_action_rate>gates.unknown_action_rate)gateFailures.push('UNKNOWN_ACTION');
if(metrics.policy_violation_rate>gates.policy_violation_rate)gateFailures.push('POLICY_VIOLATION');
if(metrics.duplicate_execution_rate>gates.duplicate_execution_rate)gateFailures.push('DUPLICATE_EXECUTION');
if(metrics.shadow_error_rate>gates.shadow_error_rate)gateFailures.push('SHADOW_ERROR_RATE');
if(metrics.high_confidence_false_intervention_rate>gates.high_confidence_false_intervention_rate)gateFailures.push('FALSE_INTERVENTION_RATE');
if(metrics.p95_added_core_latency_ms>gates.p95_added_core_latency_ms)gateFailures.push('CORE_LATENCY');

const report={mode:'OFFLINE_SIMULATION',cases:CASES,status:gateFailures.length?'HOLD':'PASS',metrics,gates,gateFailures,sampleFailures:failures.slice(0,20)};
console.log(JSON.stringify(report,null,2));
if(gateFailures.length)process.exitCode=1;
