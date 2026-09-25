import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const lc = require('../learning-companion-v1.js');
const shadow = require('../learning-companion-shadow-bootstrap.js');

assert.equal(lc.validateEvent({}).valid, false);
assert.equal(lc.validateEvent({event_id:'1',learner_id:'s',lesson_version:1,question_version:1,attempt_id:'a',timestamp:'now'}).valid, true);
assert.equal(lc.confidenceRoute(.81), 'TARGETED_REMEDIATION');
assert.equal(lc.confidenceRoute(.62), 'DIAGNOSTIC_PROBE');
assert.equal(lc.confidenceRoute(.2), 'GENERIC_HINT');
assert.equal(lc.validateJevDecision({action:'MAKE_UP_ACTION',confidence:.9}).valid, false);
assert.equal(lc.policyGate({action:'WORKED_EXAMPLE',confidence:.9},{assessment_item:true}).allowed, false);
assert.equal(lc.policyGate({action:'HINT_1',confidence:.9},{intervention_counts:{hints:2}}).allowed, false);
assert.equal(lc.evidenceToMastery([{type:'guided_retry',result:'pass'}]), 'FRAGILE');
assert.equal(lc.evidenceToMastery([{type:'transfer_check',result:'pass'}]), 'SECURE');
assert.equal(lc.evidenceToMastery([{type:'transfer_check',result:'pass'},{type:'delayed_retrieval',result:'pass'}]), 'MASTERED');
assert.deepEqual(lc.retrievalSchedule('FRAGILE'), [1,3,7,14]);

const attempt={id:'a1',student_id:'s1',lesson_id:'B2_L05',skill:'grammar',score:50,created_at:'2026-09-25T00:00:00Z'};
const e1=shadow.canonicalAttemptEvent(attempt,{lesson_version:7,question_version:4});
const e2=shadow.canonicalAttemptEvent(attempt,{lesson_version:7,question_version:4});
assert.equal(e1.event_id,e2.event_id,'same accepted attempt must produce same event id');
assert.equal(e1.lesson_version,7);
assert.equal(e1.question_version,4);
const snapshot=shadow.snapshotFromAcceptedAttempt(attempt,{});
assert.equal(snapshot.correct,false);

// Feature is OFF by default: no core behavior or DB access occurs.
delete process.env.LEARNING_COMPANION_V1;
const disabled = await lc.observe({event:{},coreState:{}});
assert.equal(disabled.status, 'DISABLED');
assert.equal(disabled.core_unchanged, true);
const shadowDisabled = await shadow.observeAcceptedAttempt({pool:null,attempt});
assert.equal(shadowDisabled.status,'DISABLED');
assert.equal(shadowDisabled.core_unchanged,true);

console.log('Learning Companion v1 foundation + shadow QA: PASS');
