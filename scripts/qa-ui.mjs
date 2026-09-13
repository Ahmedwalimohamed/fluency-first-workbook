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

  const cssLinks = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)].length;
  const scripts = [...html.matchAll(/<script\s+src=/gi)].length;
  if (cssLinks > 14) warnings.push(`CSS layering risk: ${cssLinks} stylesheets are loaded by public/index.html.`);
  if (scripts > 24) warnings.push(`JavaScript patch-stack risk: ${scripts} external scripts are loaded by public/index.html.`);

  if (/[>\s](☰|↗|⚙|✎|✏|🗑|✓|✕)[<\s]/u.test(html)) {
    warnings.push('Glyph/emoji-style UI icons detected in public/index.html; prefer one SVG icon family with accessible names.');
  }

  const theme = html.match(/<meta\s+name=["']theme-color["']\s+content=["']([^"']+)["']/i)?.[1];
  if (theme && theme.toLowerCase() !== '#2563eb') {
    warnings.push(`Theme color is ${theme}; canonical EnglishGate primary is #2563EB. Migrate deliberately after visual regression checks.`);
  }
}

if (exists('public/mobile-single-question-v5.css')) {
  const mobile = read('public/mobile-single-question-v5.css');
  if (/env\(safe-area-inset-bottom\)/.test(mobile)) passes.push('Mobile question flow uses safe-area bottom inset');
  else warnings.push('Mobile question flow does not appear to use safe-area bottom inset.');

  if (/min-height\s*:\s*(44|4[5-9]|[5-9]\d)px/i.test(mobile)) passes.push('Mobile question navigation includes a >=44px minimum control height');
  else warnings.push('Could not verify >=44px touch-target height in mobile question navigation stylesheet.');

  if (/overflow\s*:\s*hidden\s*!important/i.test(mobile)) {
    warnings.push('Nested-scroll risk: mobile question flow uses overflow:hidden; test virtual keyboard and long-form writing on phones.');
  }
}

console.log('\nEnglishGate UI/UX QA (static, non-blocking)');
console.log('========================================');
for (const item of passes) console.log(`PASS  ${item}`);
for (const item of warnings) console.log(`WARN  ${item}`);
for (const item of critical) console.log(`FAIL  ${item}`);
console.log(`\nSummary: ${passes.length} pass, ${warnings.length} warning, ${critical.length} critical.`);

if (critical.length) process.exit(1);
