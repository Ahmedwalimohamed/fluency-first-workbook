import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { validateLessonContract } = require('../course-factory/lesson-contract.js');
const lesson = require('../course-factory/gold/b1-lesson-04-quality-patch.js');

const root = fileURLToPath(new URL('../', import.meta.url));
for (const file of [
  'course-factory/gold/b1-lesson-04-quality-patch.js',
  'api/vercel-parity-entry.js'
]) {
  const run = spawnSync(process.execPath, ['--check', root + file], { encoding: 'utf8' });
  if (run.status !== 0) {
    console.error(`FAIL  syntax ${file}`);
    console.error(run.stderr || run.stdout);
    process.exit(1);
  }
  console.log(`PASS  syntax ${file}`);
}

const contract = validateLessonContract(lesson);
if (!contract.ok) {
  console.error('FAIL  reviewed lesson contract');
  for (const error of contract.errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log('PASS  reviewed lesson contract');

const mcqs = lesson.stages.grammar.items.filter(x => Array.isArray(x.options));
const positions = mcqs.map(x => x.options.indexOf(x.answer));
const distinct = new Set(positions);
const allOptionsUnique = mcqs.every(x => new Set(x.options).size === x.options.length);
const weakLegacyDistractors = ['am check', 'is tried', 'putting', 'have sleep', 'were been changing'];
const allGrammarText = JSON.stringify(lesson.stages.grammar.items).toLowerCase();

const checks = [
  ['teacher review metadata present', lesson.qualityReview?.status === 'revised-after-jev-review'],
  ['production remains disabled', lesson.productionActivation === false],
  ['B1 grammar boundary is explicit', String(lesson.curriculum.grammar.b1Boundary || '').includes('not an independent mastery target')],
  ['algorithm remains stretch only', lesson.curriculum.vocabulary.stretch.includes('algorithm') && !lesson.curriculum.vocabulary.core.includes('algorithm')],
  ['reading near-miss distractors revised', lesson.stages.reading.questions.find(x => x.id === 'r4')?.options?.includes('Not being able to contact colleagues during work')],
  ['listening distractors revised', lesson.stages.listening.questions.find(x => x.id === 'l1')?.options?.includes('People were receiving too many work calls during lunch')],
  ['grammar answer positions remain varied', distinct.size >= 3 && positions.filter(x => x === 0).length < positions.length / 2],
  ['grammar options contain no duplicates', allOptionsUnique],
  ['legacy joke distractors removed', weakLegacyDistractors.every(x => !allGrammarText.includes(x))],
  ['open grammar item is formative only', lesson.stages.grammar.items.find(x => x.id === 'g8')?.formativeOnly === true],
  ['mission completion is communicative', String(lesson.stages.fluencyMission.completionPolicy || '').includes('communicative outcome')],
  ['mission no longer counts grammar forms as a pass requirement', !lesson.stages.fluencyMission.requirements.some(x => /present perfect|twice/i.test(x))],
  ['mission still collects language evidence', lesson.stages.fluencyMission.languageEvidence.some(x => /Present Perfect Continuous/.test(x))],
  ['Help Me Practice has B1 anti-drift boundary', String(lesson.helpMePractice.b1Boundary || '').includes('Do not require sustained counterargument')],
  ['teacher review remains mandatory', lesson.qualityReview.humanTeacherReviewRequiredBeforeProduction === true]
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failed++;
}

console.log(`INFO  reviewed grammar answer positions: ${positions.map(x => x + 1).join(', ')}`);
if (failed) {
  console.error(`Reviewed B1 Gold Lesson 4 QA failed: ${failed} check(s).`);
  process.exit(1);
}
console.log(`Reviewed B1 Gold Lesson 4 QA passed: ${checks.length}/${checks.length}.`);
