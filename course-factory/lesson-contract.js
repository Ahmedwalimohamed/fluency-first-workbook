'use strict';

/**
 * EnglishGate Course Factory — Golden Lesson Contract v1
 *
 * The contract deliberately separates reusable course architecture from
 * level-specific language content. Deterministic rules live here; Jev/TypeSafe
 * receives only the bounded semantic questions that code cannot answer safely.
 */

const CONTRACT_VERSION = 'englishgate-golden-lesson-contract-v1';
const ALLOWED_LEVELS = Object.freeze(['A1', 'A2', 'B1', 'B2']);
const REQUIRED_STAGES = Object.freeze([
  'hook',
  'vocabulary',
  'speaking',
  'reading',
  'listening',
  'grammar',
  'writing',
  'fluencyMission'
]);
const REQUIRED_REPORTING = Object.freeze([
  'activityEvidence',
  'submissions',
  'aiPracticeUsage',
  'progressSummary'
]);

const GOLDEN_INVARIANTS = Object.freeze({
  masteryThreshold: 0.8,
  boostWeakAreaOnly: true,
  transcriptUnlockAttempt: 2,
  architectureCloneOnly: true,
  originalLevelContentRequired: true,
  topicBoundAiPractice: true,
  teacherEvidenceRequired: true
});

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function nonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function countWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

function uniqueNormalized(items) {
  const seen = new Set();
  for (const item of items || []) {
    const key = String(item || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

function validateLessonContract(contract) {
  const errors = [];
  const warnings = [];

  if (!contract || typeof contract !== 'object') {
    return { ok: false, errors: ['Contract must be an object.'], warnings };
  }

  if (contract.contractVersion !== CONTRACT_VERSION) {
    errors.push(`contractVersion must be ${CONTRACT_VERSION}.`);
  }
  if (!nonEmptyString(contract.id)) errors.push('id is required.');
  if (!ALLOWED_LEVELS.includes(contract.level)) errors.push('level must be A1, A2, B1, or B2.');
  if (!Number.isInteger(contract.lessonNumber) || contract.lessonNumber < 1) errors.push('lessonNumber must be a positive integer.');
  if (!nonEmptyString(contract.title)) errors.push('title is required.');
  if (!nonEmptyString(contract.sourceGoldenLesson)) errors.push('sourceGoldenLesson is required.');
  if (!nonEmptyArray(contract.canDo) || contract.canDo.length < 2) errors.push('At least two learner can-do outcomes are required.');

  const clonePolicy = contract.clonePolicy || {};
  if (clonePolicy.architectureOnly !== true) errors.push('clonePolicy.architectureOnly must be true.');
  if (clonePolicy.originalContent !== true) errors.push('clonePolicy.originalContent must be true.');
  if (clonePolicy.copySourceWording !== false) errors.push('clonePolicy.copySourceWording must be false.');

  const curriculum = contract.curriculum || {};
  if (!nonEmptyArray(curriculum.functions)) errors.push('curriculum.functions is required.');
  if (!nonEmptyString(curriculum.grammar?.focus)) errors.push('curriculum.grammar.focus is required.');
  if (!nonEmptyArray(curriculum.grammar?.productiveUses)) errors.push('curriculum.grammar.productiveUses is required.');
  if (!nonEmptyArray(curriculum.vocabulary?.core)) errors.push('curriculum.vocabulary.core is required.');
  if (!uniqueNormalized(curriculum.vocabulary?.core)) errors.push('Core vocabulary must be unique and non-empty.');
  if (!nonEmptyString(curriculum.pronunciation)) errors.push('curriculum.pronunciation is required.');

  const stages = contract.stages || {};
  for (const stage of REQUIRED_STAGES) {
    if (!stages[stage] || typeof stages[stage] !== 'object') errors.push(`stages.${stage} is required.`);
  }

  if (stages.vocabulary) {
    if (!nonEmptyArray(stages.vocabulary.items) || stages.vocabulary.items.length < 6) errors.push('Vocabulary stage requires at least six items.');
    if (!nonEmptyArray(stages.vocabulary.productionPrompts)) errors.push('Vocabulary stage requires productive use, not recognition only.');
  }

  if (stages.speaking) {
    if (!nonEmptyString(stages.speaking.communicativeGoal)) errors.push('Speaking stage needs a communicativeGoal.');
    if (!nonEmptyArray(stages.speaking.followUps)) errors.push('Speaking stage needs follow-up prompts.');
    if (stages.speaking.studentTalkTargetSeconds < 45) warnings.push('Speaking target is under 45 seconds; confirm this is intentional for the level.');
  }

  if (stages.reading) {
    const wc = countWords(stages.reading.text);
    if (wc < 120) errors.push(`Reading text is too short for this B1 Gold pilot (${wc} words; minimum 120).`);
    if (!nonEmptyArray(stages.reading.questions) || stages.reading.questions.length < 5) errors.push('Reading requires at least five aligned comprehension questions.');
  }

  if (stages.listening) {
    const seconds = Number(stages.listening.targetSeconds || 0);
    if (seconds < 60 || seconds > 120) errors.push('Listening targetSeconds must stay within the Golden Lesson 60–120 second envelope.');
    if (Number(stages.listening.transcriptUnlockAttempt) !== GOLDEN_INVARIANTS.transcriptUnlockAttempt) errors.push('Listening transcript must unlock after attempt 2.');
    if (!nonEmptyString(stages.listening.audioScript)) errors.push('Listening audioScript is required.');
    if (!nonEmptyArray(stages.listening.questions) || stages.listening.questions.length < 5) errors.push('Listening requires at least five questions.');
  }

  if (stages.grammar) {
    if (!nonEmptyArray(stages.grammar.items) || stages.grammar.items.length < 6) errors.push('Grammar stage requires at least six items.');
    if (!nonEmptyArray(stages.grammar.transferPrompts)) errors.push('Grammar must transfer into meaningful communication.');
  }

  if (stages.writing) {
    const range = stages.writing.wordRange;
    if (!Array.isArray(range) || range.length !== 2 || range[0] < 1 || range[1] <= range[0]) errors.push('Writing wordRange must be [min,max].');
    if (!nonEmptyString(stages.writing.realLifeFormat)) errors.push('Writing must use a real-life format.');
    if (!nonEmptyArray(stages.writing.successCriteria) || stages.writing.successCriteria.length < 3) errors.push('Writing requires at least three visible success criteria.');
  }

  if (stages.fluencyMission) {
    if (!nonEmptyString(stages.fluencyMission.outcome)) errors.push('Fluency Mission needs a real communicative outcome.');
    if (!nonEmptyArray(stages.fluencyMission.requirements) || stages.fluencyMission.requirements.length < 3) errors.push('Fluency Mission requires at least three observable requirements.');
    if (stages.fluencyMission.repeatAfterFeedback !== true) errors.push('Fluency Mission must include repeat-after-feedback.');
  }

  const practice = contract.helpMePractice || {};
  if (practice.topicBound !== true) errors.push('Help Me Practice must remain topic-bound.');
  if (!nonEmptyArray(practice.allowedIntents)) errors.push('Help Me Practice allowedIntents are required.');
  if (!nonEmptyArray(practice.targetLanguage)) errors.push('Help Me Practice targetLanguage is required.');
  if (!nonEmptyString(practice.openingQuestion)) errors.push('Help Me Practice openingQuestion is required.');

  const mastery = contract.mastery || {};
  if (Number(mastery.threshold) !== GOLDEN_INVARIANTS.masteryThreshold) errors.push('Mastery threshold must remain 0.80 for the Golden Lesson pilot.');
  if (mastery.boostWeakAreaOnly !== true) errors.push('Below mastery, only the weak-area Boost may open.');
  if (!nonEmptyArray(mastery.scoredAreas)) errors.push('Mastery scoredAreas are required.');

  const reporting = contract.reporting || {};
  for (const field of REQUIRED_REPORTING) {
    if (reporting[field] !== true) errors.push(`reporting.${field} must be true.`);
  }

  if (!nonEmptyArray(contract.semanticQa?.questions)) errors.push('semanticQa.questions is required for bounded Jev review.');
  if (contract.productionActivation !== false) errors.push('Gold pilot must not activate production automatically.');

  return { ok: errors.length === 0, errors, warnings };
}

function buildSemanticReviewInput(contract) {
  const result = validateLessonContract(contract);
  if (!result.ok) {
    const error = new Error(`Golden Lesson contract failed deterministic QA:\n- ${result.errors.join('\n- ')}`);
    error.code = 'GOLDEN_CONTRACT_INVALID';
    error.details = result;
    throw error;
  }

  return Object.freeze({
    contractVersion: contract.contractVersion,
    lessonId: contract.id,
    level: contract.level,
    title: contract.title,
    canDo: contract.canDo,
    grammar: contract.curriculum.grammar,
    coreVocabulary: contract.curriculum.vocabulary.core,
    reading: {
      text: contract.stages.reading.text,
      questions: contract.stages.reading.questions
    },
    listening: {
      script: contract.stages.listening.audioScript,
      questions: contract.stages.listening.questions
    },
    speaking: contract.stages.speaking,
    writing: contract.stages.writing,
    fluencyMission: contract.stages.fluencyMission,
    helpMePractice: contract.helpMePractice,
    reviewQuestions: contract.semanticQa.questions
  });
}

module.exports = {
  CONTRACT_VERSION,
  ALLOWED_LEVELS,
  REQUIRED_STAGES,
  GOLDEN_INVARIANTS,
  validateLessonContract,
  buildSemanticReviewInput
};
