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

  requireMatch(
    'Mobile viewport configured',
    html,
    /<meta\s+name=["']viewport["'][^>]*width=device-width[^>]*>/i,
    'viewport meta must include width=device-width'
  );

  requireMatch(
    'Safe-area viewport support',
    html,
    /viewport-fit=cover/i,
    'viewport meta should include viewport-fit=cover'
  );

  requireMatch(
    'Document language declared',
    html,
    /<html\s+[^>]*lang=["'][^"']+["']/i,
    'html element needs a lang attribute'
  );

  requireMatch(
    'Canonical EnglishGate theme color',
    html,
    /<meta\s+name=["']theme-color["']\s+content=["']#2563EB["']/i,
    'theme-color must use canonical #2563EB'
  );

  requireMatch(
    'Canonical question navigation controller loaded',
    html,
    /<script\s+src=["']question-nav-fix\.js\?v=7["']/i,
    'question-nav-fix.js?v=7 must be loaded'
  );

  if (/student-response-navigation-v1\.js/i.test(html)) {
    critical.push('Duplicate question navigation controller is loaded: student-response-navigation-v1.js');
  } else passes.push('Duplicate question navigation controller removed from runtime');

  const cssLinks = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)].length;
  const scripts = [...html.matchAll(/<script\s+src=/gi)].length;
  if (cssLinks > 14) warnings.push(`CSS layering risk: ${cssLinks} stylesheets are loaded by public/index.html.`);
  if (scripts > 24) warnings.push(`JavaScript patch-stack risk: ${scripts} external scripts are loaded by public/index.html.`);

  if (/[>\s](☰|↗|⚙|✎|✏|🗑|✓|✕)[<\s]/u.test(html)) {
    warnings.push('Glyph/emoji-style UI icons detected in public/index.html; prefer one SVG icon family with accessible names.');
  }
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
  if (/responseRecorded/.test(navJs) && /fallbackAdvance/.test(navJs)) {
    passes.push('Question response state and forward navigation are consolidated in one controller');
  } else {
    critical.push('Canonical question controller is missing response-state or forward-navigation handling.');
  }
}

if (exists('public/mobile-single-question-v5.css')) {
  const mobile = read('public/mobile-single-question-v5.css');
  if (/overflow\s*:\s*hidden\s*!important/i.test(mobile)) {
    warnings.push('Nested-scroll risk remains in mobile-single-question-v5.css; test virtual keyboard and long-form writing on phones.');
  }
}

console.log('\nEnglishGate UI/UX QA (static, non-blocking)');
console.log('========================================');
for (const item of passes) console.log(`PASS  ${item}`);
for (const item of warnings) console.log(`WARN  ${item}`);
for (const item of critical) console.log(`FAIL  ${item}`);
console.log(`\nSummary: ${passes.length} pass, ${warnings.length} warning, ${critical.length} critical.`);

if (critical.length) process.exit(1);
