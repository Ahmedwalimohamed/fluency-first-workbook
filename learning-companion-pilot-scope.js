'use strict';

const B1_PILOT_LESSON_ID = 'su-b1-l1';

function b1ShadowPilotEnabled(env = process.env) {
  return String(env.B1_LEARNING_COMPANION_SHADOW_PILOT || 'false').toLowerCase() === 'true';
}

function pilotStudentIds(env = process.env) {
  return new Set(String(env.B1_LEARNING_COMPANION_PILOT_STUDENT_IDS || '')
    .split(',').map(x => x.trim()).filter(Boolean));
}

function pilotStudentAllowed(studentId, env = process.env) {
  if (!b1ShadowPilotEnabled(env)) return false;
  const ids = pilotStudentIds(env);
  return ids.size > 0 && ids.has(String(studentId || ''));
}

function isB1ShadowPilotLesson(lessonId, env = process.env) {
  return b1ShadowPilotEnabled(env) && String(lessonId || '') === B1_PILOT_LESSON_ID;
}

function isAllowedB1ShadowPilot(studentId, lessonId, env = process.env) {
  return isB1ShadowPilotLesson(lessonId, env) && pilotStudentAllowed(studentId, env);
}

module.exports = {
  B1_PILOT_LESSON_ID,
  b1ShadowPilotEnabled,
  pilotStudentIds,
  pilotStudentAllowed,
  isB1ShadowPilotLesson,
  isAllowedB1ShadowPilot
};
