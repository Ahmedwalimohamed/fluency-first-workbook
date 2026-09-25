'use strict';

const B1_PILOT_LESSON_ID = 'su-b1-l1';

function b1ShadowPilotEnabled(env = process.env) {
  return String(env.B1_LEARNING_COMPANION_SHADOW_PILOT || 'false').toLowerCase() === 'true';
}

function isB1ShadowPilotLesson(lessonId, env = process.env) {
  return b1ShadowPilotEnabled(env) && String(lessonId || '') === B1_PILOT_LESSON_ID;
}

module.exports = { B1_PILOT_LESSON_ID, b1ShadowPilotEnabled, isB1ShadowPilotLesson };
