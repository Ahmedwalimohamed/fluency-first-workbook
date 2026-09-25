'use strict';

/**
 * EnglishGate B1 Learning Companion — end-to-end pilot contract.
 * Additive only: this module does not change workbook grading or navigation.
 * Governing rule: LLM generates. Jev decides. Deterministic code enforces.
 * Evidence updates learning state.
 */

const PILOT = Object.freeze({
  courseId: 'speakup-b1',
  lessonId: 'su-b1-l1',
  cefr: 'B1',
  enabled: process.env.B1_LEARNING_COMPANION_PILOT === 'true'
});

const NEED = Object.freeze({
  NONE: 'none',
  GRAMMAR_FORM: 'grammar_form',
  GRAMMAR_MEANING: 'grammar_meaning',
  VOCABULARY: 'vocabulary',
  COMPREHENSION: 'comprehension',
  INSTRUCTION: 'instruction',
  INSUFFICIENT_EVIDENCE: 'insufficient_evidence'
});

const ACTION = Object.freeze({
  CONTINUE: 'continue',
  MICRO_EXPLAIN: 'micro_explain',
  GIVE_EXAMPLE: 'give_example',
  CONTRAST: 'contrast',
  CHECK_PREREQUISITE: 'check_prerequisite',
  CLARIFY_VOCABULARY: 'clarify_vocabulary',
  RETEST: 'retest',
  ESCALATE_TEACHER: 'escalate_teacher'
});

function isPilotEvent(event) {
  return Boolean(PILOT.enabled && event && event.courseId === PILOT.courseId && event.lessonId === PILOT.lessonId);
}

function validateEvent(event) {
  const required = ['eventId','studentId','courseId','lessonId','activityId','skill','attempt','correct','timestamp'];
  const missing = required.filter(k => event?.[k] === undefined || event?.[k] === null || event?.[k] === '');
  return { valid: missing.length === 0, missing };
}

function deterministicDetection(event, history = []) {
  if (event.correct === true) return { need: NEED.NONE, confidence: 1, reason: 'correct_response' };
  const sameTarget = history.filter(x => x.targetId && x.targetId === event.targetId);
  if (!event.targetId || event.attempt < 1) return { need: NEED.INSUFFICIENT_EVIDENCE, confidence: 0, reason: 'missing_target_or_attempt' };
  if (event.skill === 'vocabulary') return { need: NEED.VOCABULARY, confidence: sameTarget.length >= 1 ? 0.8 : 0.6, reason: 'vocabulary_error' };
  if (event.skill === 'reading' || event.skill === 'listening') return { need: NEED.COMPREHENSION, confidence: sameTarget.length >= 1 ? 0.8 : 0.6, reason: 'comprehension_error' };
  if (event.skill === 'grammar') return { need: NEED.GRAMMAR_MEANING, confidence: sameTarget.length >= 1 ? 0.85 : 0.65, reason: 'grammar_error' };
  return { need: NEED.INSUFFICIENT_EVIDENCE, confidence: 0.3, reason: 'unsupported_signal' };
}

function policyGate({event, diagnosis, proposedAction, state = {}}) {
  if (!isPilotEvent(event)) return { allowed: false, action: ACTION.CONTINUE, reason: 'pilot_disabled_or_outside_scope' };
  if (!validateEvent(event).valid) return { allowed: false, action: ACTION.CONTINUE, reason: 'invalid_event' };
  if (event.correct === true) return { allowed: true, action: ACTION.CONTINUE, reason: 'no_intervention_needed' };
  if (!diagnosis || diagnosis.confidence < 0.55) return { allowed: true, action: ACTION.RETEST, reason: 'confidence_gate' };
  if ((state.interventionsThisActivity || 0) >= 3) return { allowed: true, action: ACTION.ESCALATE_TEACHER, reason: 'intervention_budget_exhausted' };
  const allowed = new Set(Object.values(ACTION));
  if (!allowed.has(proposedAction)) return { allowed: false, action: ACTION.RETEST, reason: 'unknown_action' };
  return { allowed: true, action: proposedAction, reason: 'policy_pass' };
}

function fallbackDecision(diagnosis) {
  switch (diagnosis.need) {
    case NEED.VOCABULARY: return ACTION.CLARIFY_VOCABULARY;
    case NEED.COMPREHENSION: return ACTION.GIVE_EXAMPLE;
    case NEED.GRAMMAR_FORM: return ACTION.CONTRAST;
    case NEED.GRAMMAR_MEANING: return ACTION.MICRO_EXPLAIN;
    case NEED.INSTRUCTION: return ACTION.CHECK_PREREQUISITE;
    default: return ACTION.RETEST;
  }
}

function evidenceUpdate(previous = {}, event, outcome = {}) {
  const key = event.targetId || event.activityId;
  const prior = previous[key] || { attempts: 0, correct: 0, interventions: 0 };
  return {
    ...previous,
    [key]: {
      attempts: prior.attempts + 1,
      correct: prior.correct + (event.correct ? 1 : 0),
      interventions: prior.interventions + (outcome.intervened ? 1 : 0),
      lastAction: outcome.action || ACTION.CONTINUE,
      lastEvidenceAt: event.timestamp
    }
  };
}

function runDeterministicPilot({event, history = [], state = {}, proposedAction}) {
  const validation = validateEvent(event);
  if (!validation.valid) return { status: 'rejected', validation };
  const diagnosis = deterministicDetection(event, history);
  const action = proposedAction || fallbackDecision(diagnosis);
  const policy = policyGate({event, diagnosis, proposedAction: action, state});
  return {
    status: policy.allowed ? 'accepted' : 'held',
    pilot: PILOT,
    diagnosis,
    policy,
    action: policy.action,
    requiresGeneration: [ACTION.MICRO_EXPLAIN, ACTION.GIVE_EXAMPLE, ACTION.CONTRAST, ACTION.CLARIFY_VOCABULARY].includes(policy.action),
    requiresRetest: policy.action !== ACTION.CONTINUE && policy.action !== ACTION.ESCALATE_TEACHER
  };
}

module.exports = { PILOT, NEED, ACTION, validateEvent, deterministicDetection, policyGate, fallbackDecision, evidenceUpdate, runDeterministicPilot };
