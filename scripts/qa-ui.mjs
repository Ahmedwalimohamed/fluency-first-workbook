import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

const critical = [];
const warnings = [];
const passes = [];

function requireFile(file) {
  if (!exists(file)) critical.push(`Missing required UI standard: ${file}`);
  else passes.push(`Found ${file}`);
}

function requireMatch(label, source, pattern, failure) {
  if (!pattern.test(source)) critical.push(`${label}: ${failure}`);
  else passes.push(label);
}

for (const file of [
  'standards/ENGLISHGATE_DESIGN_SYSTEM.md',
  'standards/ENGLISHGATE_LEARNING_UX.md',
  'standards/ENGLISHGATE_UI_QA_CHECKLIST.md'
]) requireFile(file);

if (!exists('public/index.html')) {
  critical.push('Missing public/index.html');
} else {
  const html = read('public/index.html');

  requireMatch('Mobile viewport configured', html, /<meta\s+name=["']viewport["'][^>]*width=device-width[^>]*>/i, 'viewport meta must include width=device-width');
  requireMatch('Safe-area viewport support', html, /viewport-fit=cover/i, 'viewport meta should include viewport-fit=cover');
  requireMatch('Document language declared', html, /<html\s+[^>]*lang=["'][^"']+["']/i, 'html element needs a lang attribute');
  requireMatch('Canonical EnglishGate theme color', html, /<meta\s+name=["']theme-color["']\s+content=["']#2563EB["']/i, 'theme-color must use canonical #2563EB');
  requireMatch('Canonical question navigation controller loaded', html, /<script\s+src=["']question-nav-fix\.js\?v=7["']/i, 'question-nav-fix.js?v=7 must be loaded');
  requireMatch('Consolidated Reading/Listening renderer loaded', html, /reading-listening-separation-v3\.js\?v=4/i, 'reading-listening-separation-v3.js?v=4 must be loaded');
  requireMatch('Consolidated Reading/Listening grader loaded', html, /reading-listening-grading-v1\.js\?v=2/i, 'reading-listening-grading-v1.js?v=2 must be loaded');

  if (/student-response-navigation-v1\.js/i.test(html)) critical.push('Duplicate question navigation controller is loaded: student-response-navigation-v1.js');
  else passes.push('Duplicate question navigation controller removed from runtime');

  const legacyLessonPlayerIndex = html.indexOf('mobile-lesson-player-v1.css');
  const canonicalLessonPlayerIndex = html.indexOf('englishgate-lesson-player-design-v2.css');
  if (legacyLessonPlayerIndex >= 0 && canonicalLessonPlayerIndex > legacyLessonPlayerIndex) passes.push('Lesson player structural bridge loads before canonical visual layer');
  else critical.push('Lesson player CSS ownership order is invalid: structural bridge must load before englishgate-lesson-player-design-v2.css.');

  const cssLinks = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)].length;
  const scripts = [...html.matchAll(/<script\s+src=/gi)].length;
  if (cssLinks > 14) warnings.push(`CSS layering risk: ${cssLinks} stylesheets are loaded by public/index.html.`);
  if (scripts > 24) warnings.push(`JavaScript patch-stack risk: ${scripts} external scripts are loaded by public/index.html.`);

  if (/[>\s](☰|↗|⚙|✎|✏|🗑|✓|✕)[<\s]/u.test(html)) warnings.push('Glyph/emoji-style UI icons detected in public/index.html; prefer one SVG icon family with accessible names.');
}

if (exists('public/question-nav-fix.css')) {
  const navCss = read('public/question-nav-fix.css');
  if (/env\(safe-area-inset-bottom\)/.test(navCss)) passes.push('Canonical question navigation uses safe-area bottom inset');
  else critical.push('Canonical question navigation is missing safe-area bottom inset.');
  if (/min-height\s*:\s*(44|4[5-9]|[5-9]\d)px/i.test(navCss)) passes.push('Canonical question navigation includes a >=44px touch target');
  else critical.push('Canonical question navigation must use >=44px touch targets.');
  if (/focus-visible/.test(navCss)) passes.push('Canonical question navigation has visible keyboard focus states');
  else warnings.push('Canonical question navigation does not define focus-visible states.');
  if (/prefers-reduced-motion/.test(navCss)) passes.push('Canonical question navigation respects reduced-motion preference');
  else warnings.push('Canonical question navigation does not appear to respect reduced motion.');
}

if (exists('public/question-nav-fix.js')) {
  const navJs = read('public/question-nav-fix.js');
  if (/responseRecorded/.test(navJs) && /fallbackAdvance/.test(navJs)) passes.push('Question response state and forward navigation are consolidated in one controller');
  else critical.push('Canonical question controller is missing response-state or forward-navigation handling.');
}

if (exists('public/mobile-lesson-player-v1.css')) {
  const bridge = read('public/mobile-lesson-player-v1.css');
  const forbiddenVisuals = /(?:background|color|border(?:-radius)?|box-shadow|font-size|font-weight)\s*:/i;
  if (forbiddenVisuals.test(bridge)) critical.push('Lesson player structural bridge contains visual styling; visual ownership belongs to englishgate-lesson-player-design-v2.css.');
  else passes.push('Lesson player legacy CSS is constrained to structural layout only');
  if (/\.sidebar[\s\S]*display\s*:\s*none/i.test(bridge) && /min-height\s*:\s*100dvh/i.test(bridge)) passes.push('Lesson player structural bridge preserves focused mobile shell behavior');
  else critical.push('Lesson player structural bridge is missing required focused mobile shell rules.');
}

if (exists('public/englishgate-lesson-player-design-v2.css')) {
  const lessonCss = read('public/englishgate-lesson-player-design-v2.css');
  if (/--eg-lp-primary\s*:\s*#2563EB/i.test(lessonCss)) passes.push('Lesson player canonical layer uses EnglishGate primary token');
  else critical.push('Lesson player canonical layer must use #2563EB as its primary token.');
  if (/min-width\s*:\s*44px/i.test(lessonCss) && /focus-visible/.test(lessonCss)) passes.push('Lesson player canonical layer includes touch-target and keyboard-focus safeguards');
  else warnings.push('Could not verify both 44px touch targets and focus-visible states in canonical lesson player layer.');
}

if (exists('public/reading-listening-separation-v3.js')) {
  const renderer = read('public/reading-listening-separation-v3.js');
  if (/englishgate:separated-submit/.test(renderer)) passes.push('Reading/Listening renderer delegates final submission through the canonical event boundary');
  else critical.push('Reading/Listening renderer must dispatch englishgate:separated-submit at final submission.');
  if (/function\s+submitSeparated\b/.test(renderer) || /workbook-activities\/attempts/.test(renderer) || /workbook-activities\/complete/.test(renderer)) {
    critical.push('Reading/Listening renderer still contains grading/attempt/completion ownership.');
  } else passes.push('Reading/Listening renderer contains no grading, attempt or completion implementation');
}

if (exists('public/reading-listening-grading-v1.js')) {
  const grader = read('public/reading-listening-grading-v1.js');
  if (/englishgate:separated-submit/.test(grader) && /function\s+grade\b/.test(grader)) passes.push('Reading/Listening grader owns canonical submission event and scoring');
  else critical.push('Reading/Listening grader must own the canonical submission event and grade function.');
  if (/workbook-activities\/attempts/.test(grader) && /workbook-activities\/complete/.test(grader) && /data-grade-retry/.test(grader)) passes.push('Reading/Listening grader owns attempts, completion and retry workflow');
  else critical.push('Reading/Listening grader is missing attempt, completion or retry ownership.');
}

if (exists('public/mobile-single-question-v5.css')) {
  const mobile = read('public/mobile-single-question-v5.css');
  if (/overflow\s*:\s*hidden\s*!important/i.test(mobile)) warnings.push('Nested-scroll risk remains in mobile-single-question-v5.css; test virtual keyboard and long-form writing on phones.');
}

console.log('\nEnglishGate UI/UX QA (static, non-blocking)');
console.log('========================================');
for (const item of passes) console.log(`PASS  ${item}`);
for (const item of warnings) console.log(`WARN  ${item}`);
for (const item of critical) console.log(`FAIL  ${item}`);
console.log(`\nSummary: ${passes.length} pass, ${warnings.length} warning, ${critical.length} critical.`);

if (critical.length) process.exit(1);
