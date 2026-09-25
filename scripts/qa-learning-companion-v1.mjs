import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const lc = require('../learning-companion-v1.js');

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

// Feature is off by default: core remains untouched.
delete process.env.LEARNING_COMPANION_V1;
const disabled = await lc.observe({event:{},coreState:{}});
assert.equal(disabled.status, 'DISABLED');
assert.equal(disabled.core_unchanged, true);

console.log('Learning Companion v1 foundation QA: PASS');
