import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const lesson = require('../course-factory/gold/b1-lesson-04-technology-social-media.js');
const { reviewGoldenLesson } = require('../course-factory/jev-semantic-review.js');

try {
  const result = await reviewGoldenLesson(lesson);
  console.log(JSON.stringify(result, null, 2));

  if (result.status === 'semantic_fail') {
    console.error('Jev semantic review failed. Keep productionActivation=false and revise the lesson.');
    process.exit(1);
  }

  if (result.status === 'needs_human_review') {
    console.log('Jev found one or more uncertain/review items. Keep productionActivation=false and send those items to teacher review.');
    process.exit(0);
  }

  console.log('Jev semantic review passed its bounded criteria. Teacher human review is still mandatory before preview promotion.');
} catch (error) {
  if (String(error?.message || '') === 'JEV_NOT_CONFIGURED') {
    console.error('JEV_NOT_CONFIGURED: set TYPESAFE_API_KEY before running semantic Course Factory QA.');
    process.exit(2);
  }
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
}
