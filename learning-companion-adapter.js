'use strict';

/**
 * Universal EnglishGate activity -> Learning Companion adapter.
 *
 * The existing activity engine remains the source of truth for grading,
 * navigation, completion, and progress. This adapter only translates an
 * already-graded activity result into the canonical Companion contract.
 */

const companion = require('./learning-companion-v1');

function first(...values) {
  return values.find(v => v !== undefined && v !== null && v !== '');
}

function normalizeSkill(value) {
  const skill = String(value || '').trim().toLowerCase();
  if (skill === 'vocab') return 'vocabulary';
  if (skill === 'language focus') return 'grammar';
  return skill || null;
}

function buildEventId({ learnerId, attemptId, questionVersion, explicitEventId }) {
  if (explicitEventId) return String(explicitEventId);
  if (!learnerId || !attemptId || !questionVersion) return null;
  return `${learnerId}:${attemptId}:${questionVersion}`;
}

function adaptActivityResult(result = {}, context = {}) {
  const learnerId = first(result.learner_id, result.learnerId, result.student_id, result.studentId, context.learner_id, context.learnerId);
  const attemptId = first(result.attempt_id, result.attemptId, context.attempt_id, context.attemptId);
  const lessonVersion = first(result.lesson_version, result.lessonVersion, context.lesson_version, context.lessonVersion);
  const questionVersion = first(result.question_version, result.questionVersion, context.question_version, context.questionVersion);
  const timestamp = first(result.timestamp, result.created_at, result.createdAt, context.timestamp);
  const eventId = buildEventId({
    learnerId,
    attemptId,
    questionVersion,
    explicitEventId: first(result.event_id, result.eventId, context.event_id, context.eventId)
  });

  const event = Object.freeze({
    event_id: eventId,
    learner_id: learnerId || null,
    lesson_version: lessonVersion || null,
    question_version: questionVersion || null,
    attempt_id: attemptId || null,
    timestamp: timestamp || null,
    course_id: first(result.course_id, result.courseId, context.course_id, context.courseId) || null,
    lesson_id: first(result.lesson_id, result.lessonId, context.lesson_id, context.lessonId) || null,
    activity_id: first(result.activity_id, result.activityId, context.activity_id, context.activityId) || null,
    skill: normalizeSkill(first(result.skill, context.skill)),
    target_id: first(result.target_id, result.targetId, context.target_id, context.targetId) || null,
    source: 'englishgate_activity_engine'
  });

  const coreState = Object.freeze({
    target: first(result.target, result.target_id, result.targetId, context.target, context.target_id, context.targetId) || null,
    correct: result.correct === true,
    attempt_number: Number(first(result.attempt_number, result.attemptNumber, result.attempt, context.attempt_number, context.attemptNumber, 1)),
    previous_errors: Number(first(result.previous_errors, result.previousErrors, context.previous_errors, context.previousErrors, 0)),
    mastery_state: first(result.mastery_state, result.masteryState, context.mastery_state, context.masteryState, 'UNKNOWN'),
    previous_interventions: Array.isArray(first(result.previous_interventions, result.previousInterventions, context.previous_interventions, context.previousInterventions))
      ? [...first(result.previous_interventions, result.previousInterventions, context.previous_interventions, context.previousInterventions)]
      : [],
    answer_key_version: first(result.answer_key_version, result.answerKeyVersion, context.answer_key_version, context.answerKeyVersion) || null,
    intervention_counts: Object.freeze({ ...(first(result.intervention_counts, result.interventionCounts, context.intervention_counts, context.interventionCounts) || {}) }),
    assessment_item: first(result.assessment_item, result.assessmentItem, context.assessment_item, context.assessmentItem) === true,
    versions: Object.freeze({ ...(context.versions || result.versions || {}) })
  });

  return Object.freeze({ event, coreState });
}

/**
 * Observe an already-graded activity result. No result fields are changed and
 * no core write callback is accepted by design.
 */
async function observeActivityResult({ result, context = {}, diagnose, decide, persistCompanionEvent }) {
  const { event, coreState } = adaptActivityResult(result, context);
  return companion.observe({ event, coreState, diagnose, decide, persistCompanionEvent });
}

module.exports = { normalizeSkill, buildEventId, adaptActivityResult, observeActivityResult };
