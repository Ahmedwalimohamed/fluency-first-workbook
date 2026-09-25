'use strict';

/**
 * EnglishGate Learning Companion v1
 * Additive reliability layer. It MUST NOT replace core grading, progress,
 * authentication, lesson state, reports, or content structures.
 *
 * Governing rule:
 * LLM generates. Jev decides. Deterministic code enforces.
 * Evidence updates learning state.
 */

const ACTIONS = Object.freeze([
  'NO_ACTION','PROMPT_NOTICE','HINT_1','HINT_2','EXPLAIN','WORKED_EXAMPLE',
  'MICRO_PRACTICE','RETRY_ORIGINAL','TRANSFER_CHECK','RETRIEVAL_SCHEDULE',
  'ESCALATE_TEACHER','FLAG_CONTENT','CONTINUE'
]);

const MASTERY_STATES = Object.freeze([
  'UNKNOWN','INTRODUCED','FRAGILE','DEVELOPING','SECURE','MASTERED','NEEDS_REVIEW'
]);

const LIMITS = Object.freeze({ hints: 2, explanations: 1, microPractice: 2, guidedRetries: 3 });

function enabled(env = process.env) {
  return String(env.LEARNING_COMPANION_V1 || 'false').toLowerCase() === 'true';
}

function validateEvent(e) {
  const required = ['event_id','learner_id','lesson_version','question_version','attempt_id','timestamp'];
  const missing = required.filter(k => e == null || e[k] === undefined || e[k] === null || e[k] === '');
  return { valid: missing.length === 0, missing };
}

function buildSnapshot(core) {
  // Core supplies truth; Companion never reconstructs state from chat history.
  return Object.freeze({
    target: core.target || null,
    correct: core.correct === true,
    attempt_number: Number(core.attempt_number || 1),
    previous_errors: Number(core.previous_errors || 0),
    mastery_state: MASTERY_STATES.includes(core.mastery_state) ? core.mastery_state : 'UNKNOWN',
    previous_interventions: Array.isArray(core.previous_interventions) ? [...core.previous_interventions] : [],
    answer_key_version: core.answer_key_version || null
  });
}

function confidenceRoute(confidence) {
  const c = Number(confidence || 0);
  if (c >= 0.80) return 'TARGETED_REMEDIATION';
  if (c >= 0.50) return 'DIAGNOSTIC_PROBE';
  return 'GENERIC_HINT';
}

function validateJevDecision(decision) {
  if (!decision || !ACTIONS.includes(decision.action)) return { valid: false, reason: 'UNKNOWN_ACTION' };
  const c = Number(decision.confidence);
  if (!Number.isFinite(c) || c < 0 || c > 1) return { valid: false, reason: 'INVALID_CONFIDENCE' };
  return { valid: true };
}

function policyGate(decision, ctx) {
  const checked = validateJevDecision(decision);
  if (!checked.valid) return { allowed: false, action: 'NO_ACTION', reason: checked.reason };

  const used = ctx.intervention_counts || {};
  if (decision.action === 'HINT_1' || decision.action === 'HINT_2') {
    if (Number(used.hints || 0) >= LIMITS.hints) return { allowed: false, action: 'CONTINUE', reason: 'HINT_LIMIT' };
  }
  if (decision.action === 'EXPLAIN' && Number(used.explanations || 0) >= LIMITS.explanations)
    return { allowed: false, action: 'CONTINUE', reason: 'EXPLANATION_LIMIT' };
  if (decision.action === 'MICRO_PRACTICE' && Number(used.microPractice || 0) >= LIMITS.microPractice)
    return { allowed: false, action: 'CONTINUE', reason: 'MICRO_PRACTICE_LIMIT' };
  if (decision.action === 'WORKED_EXAMPLE' && ctx.assessment_item === true)
    return { allowed: false, action: 'PROMPT_NOTICE', reason: 'ASSESSMENT_ANSWER_PROTECTION' };

  return { allowed: true, action: decision.action, reason: decision.reason_code || 'APPROVED' };
}

function deterministicFallback(snapshot) {
  if (snapshot.correct) return { action: 'CONTINUE', reason_code: 'CORE_CORRECT', confidence: 1 };
  if (snapshot.attempt_number <= 1) return { action: 'PROMPT_NOTICE', reason_code: 'FIRST_ERROR', confidence: 1 };
  if (snapshot.attempt_number === 2) return { action: 'HINT_1', reason_code: 'REPEATED_ERROR', confidence: 1 };
  return { action: 'HINT_2', reason_code: 'PERSISTENT_ERROR', confidence: 1 };
}

function evidenceToMastery(evidence = []) {
  const has = (type, result) => evidence.some(e => e.type === type && e.result === result);
  const independentFails = evidence.filter(e => ['transfer_check','delayed_retrieval'].includes(e.type) && e.result === 'fail').length;
  if (independentFails >= 2) return 'NEEDS_REVIEW';
  if (has('delayed_retrieval','pass') && has('transfer_check','pass')) return 'MASTERED';
  if (has('transfer_check','pass')) return 'SECURE';
  if (has('independent_retry','pass')) return 'DEVELOPING';
  if (has('guided_retry','pass')) return 'FRAGILE';
  if (evidence.length) return 'INTRODUCED';
  return 'UNKNOWN';
}

function retrievalSchedule(mastery) {
  if (['FRAGILE','NEEDS_REVIEW'].includes(mastery)) return [1,3,7,14];
  if (mastery === 'DEVELOPING') return [3,7,14];
  if (mastery === 'SECURE') return [7,14];
  return [];
}

/**
 * Observer entry point. No mutation of EnglishGate core is permitted here.
 * persistCompanionEvent must write only to Companion-owned storage.
 */
async function observe({ event, coreState, diagnose, decide, persistCompanionEvent }) {
  if (!enabled()) return { status: 'DISABLED', core_unchanged: true };
  const validation = validateEvent(event);
  if (!validation.valid) return { status: 'REJECTED_EVENT', missing: validation.missing, core_unchanged: true };

  const snapshot = buildSnapshot(coreState);
  if (snapshot.correct) return { status: 'OBSERVED', action: 'CONTINUE', core_unchanged: true };

  let diagnosis = { misconception: null, confidence: 0, evidence: [] };
  try { diagnosis = await diagnose(snapshot, event); } catch (_) { /* deterministic fallback below */ }

  const route = confidenceRoute(diagnosis.confidence);
  let decision;
  try {
    decision = await decide({ snapshot, diagnosis, route, approved_actions: ACTIONS });
    if (!validateJevDecision(decision).valid) throw new Error('invalid Jev decision');
  } catch (_) {
    decision = deterministicFallback(snapshot);
  }

  const policy = policyGate(decision, coreState);
  const record = {
    event_id: event.event_id,
    learner_id: event.learner_id,
    snapshot,
    diagnosis,
    route,
    jev_decision: decision,
    policy,
    versions: coreState.versions || {},
    recorded_at: new Date().toISOString()
  };

  if (typeof persistCompanionEvent === 'function') await persistCompanionEvent(record);
  return { status: 'OBSERVED', action: policy.action, policy, diagnosis, core_unchanged: true };
}

module.exports = {
  ACTIONS, MASTERY_STATES, LIMITS, enabled, validateEvent, buildSnapshot,
  confidenceRoute, validateJevDecision, policyGate, deterministicFallback,
  evidenceToMastery, retrievalSchedule, observe
};
