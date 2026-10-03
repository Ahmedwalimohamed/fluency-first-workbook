import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { validateLessonContract, buildSemanticReviewInput, GOLDEN_INVARIANTS } = require('../course-factory/lesson-contract.js');
const lesson = require('../course-factory/gold/b1-lesson-04-technology-social-media.js');

const root = fileURLToPath(new URL('../', import.meta.url));
const syntaxFiles = [
  'course-factory/lesson-contract.js',
  'course-factory/gold/b1-lesson-04-technology-social-media.js'
];

for (const file of syntaxFiles) {
  const run = spawnSync(process.execPath, ['--check', root + file], { encoding: 'utf8' });
  if (run.status !== 0) {
    console.error(`FAIL  syntax ${file}`);
    console.error(run.stderr || run.stdout);
    process.exit(1);
  }
  console.log(`PASS  syntax ${file}`);
}

const deterministic = validateLessonContract(lesson);
if (!deterministic.ok) {
  console.error('FAIL  deterministic Golden Lesson contract');
  for (const error of deterministic.errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log('PASS  deterministic Golden Lesson contract');
for (const warning of deterministic.warnings) console.warn(`WARN  ${warning}`);

function words(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

function answerPosition(item) {
  if (!Array.isArray(item.options)) return -1;
  return item.options.indexOf(item.answer);
}

function mcqAlignment(items) {
  return items.filter(x => Array.isArray(x.options)).every(x => x.options.includes(x.answer));
}

const grammarMcq = lesson.stages.grammar.items.filter(x => Array.isArray(x.options));
const grammarPositions = grammarMcq.map(answerPosition);
const distinctGrammarPositions = new Set(grammarPositions);
const readingWords = words(lesson.stages.reading.text);
const listeningWords = words(lesson.stages.listening.audioScript);
const semanticInput = buildSemanticReviewInput(lesson);

const checks = [
  ['pilot is isolated from production', lesson.productionActivation === false && lesson.status === 'gold-pilot'],
  ['B1 Lesson 4 identity is stable', lesson.id === 'b1-gold-l4' && lesson.level === 'B1' && lesson.lessonNumber === 4 && lesson.title === 'Technology & Social Media'],
  ['clone policy copies architecture only', lesson.clonePolicy.architectureOnly === true && lesson.clonePolicy.originalContent === true && lesson.clonePolicy.copySourceWording === false],
  ['B1 target grammar is Present Perfect Continuous', lesson.curriculum.grammar.focus === 'Present Perfect Continuous'],
  ['core vocabulary is six-item B1 set', lesson.curriculum.vocabulary.core.length === 6 && lesson.curriculum.vocabulary.core.includes('screen time') && lesson.curriculum.vocabulary.core.includes('privacy')],
  ['algorithm is scaffolded stretch vocabulary', lesson.curriculum.vocabulary.stretch.includes('algorithm') && !lesson.curriculum.vocabulary.core.includes('algorithm')],
  ['reading has substantial B1 input', readingWords >= 120 && readingWords <= 260],
  ['reading questions align to options', mcqAlignment(lesson.stages.reading.questions)],
  ['listening stays inside Golden 60–120 second envelope', lesson.stages.listening.targetSeconds >= 60 && lesson.stages.listening.targetSeconds <= 120],
  ['listening transcript unlock remains attempt 2', lesson.stages.listening.transcriptUnlockAttempt === GOLDEN_INVARIANTS.transcriptUnlockAttempt],
  ['listening script is substantial but controlled', listeningWords >= 110 && listeningWords <= 220],
  ['listening questions align to options', mcqAlignment(lesson.stages.listening.questions)],
  ['grammar has enough practice plus transfer', lesson.stages.grammar.items.length >= 8 && lesson.stages.grammar.transferPrompts.length >= 3],
  ['grammar correct answers are not fixed to option A', distinctGrammarPositions.size >= 3 && grammarPositions.filter(x => x === 0).length < grammarPositions.length / 2],
  ['writing is B1 80–120 words', lesson.stages.writing.wordRange[0] === 80 && lesson.stages.writing.wordRange[1] === 120],
  ['writing is real-world social output', lesson.stages.writing.realLifeFormat === 'social post' && lesson.stages.writing.successCriteria.length >= 5],
  ['mastery keeps B2 80 percent threshold', lesson.mastery.threshold === 0.8],
  ['Boost is weak-area only', lesson.mastery.boostWeakAreaOnly === true],
  ['Help Me Practice stays lesson-bound and hands-free', lesson.helpMePractice.topicBound === true && lesson.helpMePractice.handsFreeAfterStart === true],
  ['AI practice has bounded completion evidence', lesson.helpMePractice.completionEvidence.length >= 4 && lesson.helpMePractice.disallowedBehavior.includes('random off-topic conversation')],
  ['Fluency Mission has negotiated real outcome', lesson.stages.fluencyMission.outcome.includes('three rules') && lesson.stages.fluencyMission.repeatAfterFeedback === true],
  ['teacher report retains AI practice usage evidence', lesson.reporting.aiPracticeUsage === true && lesson.reporting.activityEvidence === true && lesson.reporting.submissions === true],
  ['Jev review is bounded after deterministic validation', semanticInput.reviewQuestions.length === 8 && semanticInput.level === 'B1' && semanticInput.lessonId === 'b1-gold-l4'],
  ['semantic QA fails closed before promotion', lesson.semanticQa.failClosed === true && lesson.semanticQa.publishRule.includes('teacher human review')]
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failed++;
}

console.log(`INFO  reading words: ${readingWords}`);
console.log(`INFO  listening-script words: ${listeningWords}`);
console.log(`INFO  grammar answer positions: ${grammarPositions.map(x => x + 1).join(', ')}`);
console.log(`INFO  bounded Jev questions prepared: ${semanticInput.reviewQuestions.length}`);

if (failed) {
  console.error(`B1 Gold Lesson 4 QA failed: ${failed} check(s).`);
  process.exit(1);
}

console.log(`B1 Gold Lesson 4 QA passed: ${checks.length}/${checks.length}.`);
console.log('NEXT  Run bounded Jev/TypeSafe semantic review, then teacher human review. Do not activate production before both pass.');
