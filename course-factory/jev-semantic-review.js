'use strict';

const { buildSemanticReviewInput } = require('./lesson-contract');

const TYPE_SAFE_URL = process.env.TYPESAFE_API_URL || 'https://api.typesafe.ai/v1/systemone';
const TYPE_SAFE_MODEL = process.env.TYPESAFE_MODEL || 'jev-latest';
const VERSION = 'englishgate-course-factory-jev-v1';
const DEFAULT_THRESHOLD = 0.72;

const CRITERIA = Object.freeze({
  cefr_fit: {
    instruction: 'Judge whether the lesson demand is genuinely B1.',
    pass: 'Language, task demand, support and expected output are appropriate for an independent B1 learner.',
    review: 'Most of the lesson is B1, but one or more elements may drift toward A2 or B2 and need human review.',
    fail: 'The lesson is materially mis-leveled or depends on language/task demands inconsistent with B1.'
  },
  reading_alignment: {
    instruction: 'Judge reading question-to-text alignment.',
    pass: 'Each answer is clearly supported by the supplied reading, with no material ambiguity.',
    review: 'Most questions align, but at least one answer or inference could reasonably be interpreted another way.',
    fail: 'One or more questions are unsupported, misleading, contradictory or materially ambiguous.'
  },
  listening_alignment: {
    instruction: 'Judge listening question-to-script alignment.',
    pass: 'Each answer is clearly supported by the supplied audio script, with an appropriate mix of gist/detail/reason.',
    review: 'Most questions align, but at least one answer or inference needs human review.',
    fail: 'One or more questions are unsupported, misleading, contradictory or materially ambiguous.'
  },
  distractor_quality: {
    instruction: 'Judge multiple-choice distractor quality.',
    pass: 'Distractors are plausible enough to test comprehension but clearly wrong from the supplied input.',
    review: 'A distractor is too weak, too obviously wrong or close enough to the answer to merit revision.',
    fail: 'A distractor creates ambiguity or makes the item invalid.'
  },
  outcome_alignment: {
    instruction: 'Judge alignment between productive tasks and the stated can-do outcomes.',
    pass: 'Speaking, writing and the Fluency Mission provide observable evidence for the stated can-do outcomes.',
    review: 'The relationship is mostly clear but one productive task is weakly connected to the can-do outcomes.',
    fail: 'Productive tasks do not provide meaningful evidence for the stated outcomes.'
  },
  grammar_transfer: {
    instruction: 'Judge whether Present Perfect Continuous is taught for meaning and transferred into communication.',
    pass: 'The lesson moves from form/meaning to contextualized practice and communicative use without making grammar the final goal.',
    review: 'The grammar is broadly correct but transfer, contrast or scaffolding needs improvement.',
    fail: 'The grammar explanation/practice is misleading, mechanically isolated or not meaningfully transferred.'
  },
  ai_scope: {
    instruction: 'Judge the Help Me Practice contract for lesson-bound pedagogical behavior.',
    pass: 'AI practice remains on topic, asks short relevant follow-ups, uses bounded targets and avoids over-correction/random chat.',
    review: 'The scope is mostly bounded but one instruction could allow drift, over-teaching or weak evidence collection.',
    fail: 'The AI contract allows random conversation, unbounded correction or behavior disconnected from the lesson.'
  },
  mission_authenticity: {
    instruction: 'Judge whether the Fluency Mission is a meaningful communicative task.',
    pass: 'Learners must negotiate and reach a real outcome while using target language as a tool, not merely display forms.',
    review: 'The mission has an outcome but could become display practice without stronger information/decision pressure.',
    fail: 'The mission is primarily form display with no meaningful communicative outcome.'
  }
});

function evidence(answer, choice) {
  const confidence = Number(answer?.confidence);
  const probability = Number(answer?.probabilities?.[choice]);
  const c = Number.isFinite(confidence) && confidence >= 0 && confidence <= 1 ? confidence : null;
  const p = Number.isFinite(probability) && probability >= 0 && probability <= 1 ? probability : null;
  if (c != null && p != null) return Math.min(c, p);
  return p ?? c ?? 0;
}

async function callJev(state, questions) {
  const key = String(process.env.TYPESAFE_API_KEY || '').trim();
  if (!key) throw new Error('JEV_NOT_CONFIGURED');

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Math.max(3000, Math.min(20000, Number(process.env.COURSE_FACTORY_JEV_TIMEOUT_MS) || 10000))
  );

  try {
    const response = await fetch(TYPE_SAFE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ state, model: TYPE_SAFE_MODEL, questions }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`JEV_${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function makeQuestions() {
  const out = {};
  for (const [key, criterion] of Object.entries(CRITERIA)) {
    out[key] = {
      type: 'choice',
      instructions: criterion.instruction,
      criteria: {
        pass: criterion.pass,
        review: criterion.review,
        fail: criterion.fail
      }
    };
  }
  return out;
}

function narrowState(contract) {
  const input = buildSemanticReviewInput(contract);
  return {
    task: 'Review one EnglishGate Gold lesson against eight bounded semantic quality criteria. Do not rewrite the lesson and do not introduce facts outside the supplied lesson.',
    lesson: input,
    rules: [
      'Use only the supplied lesson evidence.',
      'Judge each criterion independently.',
      'Choose review when evidence is mixed or insufficient.',
      'Do not infer that a green deterministic check proves semantic quality.',
      'Do not recommend production activation; teacher human review remains mandatory.'
    ]
  };
}

async function reviewGoldenLesson(contract, options = {}) {
  const thresholdRaw = Number(options.threshold ?? process.env.COURSE_FACTORY_JEV_PASS_THRESHOLD ?? DEFAULT_THRESHOLD);
  const threshold = Number.isFinite(thresholdRaw) ? Math.max(0.5, Math.min(0.95, thresholdRaw)) : DEFAULT_THRESHOLD;
  const state = narrowState(contract);
  const data = await callJev(state, makeQuestions());
  const answers = data?.answers || {};
  const results = {};
  let hasFail = false;
  let hasReview = false;

  for (const key of Object.keys(CRITERIA)) {
    const answer = answers[key] || {};
    const choice = String(answer.choice || 'review').toLowerCase();
    const confidence = evidence(answer, choice);
    const acceptedChoice = ['pass', 'review', 'fail'].includes(choice) ? choice : 'review';
    const accepted = acceptedChoice === 'pass' && confidence >= threshold;
    if (acceptedChoice === 'fail') hasFail = true;
    if (!accepted || acceptedChoice === 'review') hasReview = true;
    results[key] = {
      choice: acceptedChoice,
      confidence,
      accepted
    };
  }

  const status = hasFail ? 'semantic_fail' : hasReview ? 'needs_human_review' : 'semantic_pass';
  return {
    version: VERSION,
    model: TYPE_SAFE_MODEL,
    lessonId: contract.id,
    threshold,
    status,
    productionActivation: false,
    results
  };
}

module.exports = {
  VERSION,
  CRITERIA,
  evidence,
  makeQuestions,
  narrowState,
  reviewGoldenLesson
};
