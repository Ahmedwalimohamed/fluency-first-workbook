import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];

function read(rel){
  const p = path.join(root, rel);
  if(!fs.existsSync(p)){failures.push(`Missing required file: ${rel}`);return ''}
  return fs.readFileSync(p, 'utf8');
}
function must(text, needle, label){if(!text.includes(needle))failures.push(`${label}: missing ${needle}`)}
function mustNot(text, needle, label){if(text.includes(needle))failures.push(`${label}: forbidden ${needle}`)}
function warnIf(text, needle, label){if(text.includes(needle))warnings.push(`${label}: ${needle}`)}

const index = read('public/index.html');
const vocab = read('public/vocabulary-fluency-first-v1.js');
const reading = read('public/englishgate-reading-design-v2.css');
const listening = read('public/englishgate-listening-design-v2.css');
const packageJsonText = read('package.json');
const app = read('public/app.js');
const server = read('server.js');

must(index, 'reading-listening-separation-v3.js', 'Reading/Listening separation');
must(index, 'reading-listening-grading-v1.js', 'Reading/Listening grading');
must(index, 'question-nav-fix.js', 'Question navigation');
must(index, 'question-context-home-v2.js', 'Question Home/exit');
must(index, 'englishgate-heading-hierarchy-v1.css', 'Heading hierarchy');
must(index, 'vocabulary-fluency-first-v1.js?v=2', 'Vocabulary fluency-first cache version');
must(index, 'app.js?v=openai-listening-only-v1', 'OpenAI-only listening cache version');
must(app, "X-EnglishGate-Audio-Provider", 'Learner listening provider verification');
must(app, "Ready · OpenAI natural voice", 'Learner listening OpenAI status');
mustNot(app, "Ready · browser voice", 'Learner listening browser fallback');
mustNot(app, "playWorkbookBrowserSpeech", 'Learner listening browser fallback');
mustNot(app, "dataset.audioFallback", 'Learner listening browser fallback state');
must(server, "X-EnglishGate-Audio-Provider','openai", 'Server OpenAI audio marker');
must(server, "https://api.openai.com/v1/audio/speech", 'OpenAI speech endpoint');


mustNot(index, 'englishgate-visual-scene-engine', 'Removed Visual Scene Engine');

must(vocab, "ENGLISHGATE_VOCAB_FLUENCY_FIRST_VERSION='1.1.0'", 'Vocabulary renderer version');
must(vocab, 'SCENARIOS', 'Vocabulary controlled usage scenarios');
must(vocab, 'feedbackMeta', 'Vocabulary feedback metadata');
mustNot(vocab, 'undefined = undefined', 'Vocabulary feedback');
mustNot(vocab, 'Example: undefined', 'Vocabulary feedback');

must(reading, 'data-activity-type="reading"', 'Reading design scope');
must(listening, 'data-activity-type="listening"', 'Listening design scope');

const publicFiles = fs.readdirSync(path.join(root, 'public')).filter(f=>/\.(js|css|html)$/.test(f));
for(const file of publicFiles){
  const text = fs.readFileSync(path.join(root,'public',file),'utf8');
  mustNot(text, 'undefined = undefined', file);
  mustNot(text, 'Example: undefined', file);
  warnIf(text, '>Build<', `${file} may contain obsolete Build label`);
  warnIf(text, '>Correct<', `${file} may contain obsolete Correct label`);
  warnIf(text, '>Apply<', `${file} may contain obsolete Apply label`);
}

let pkg;
try{pkg=JSON.parse(packageJsonText)}catch{failures.push('package.json is invalid JSON')}
if(pkg){
  if(!pkg.scripts?.['qa:quality-gate'])warnings.push('package.json does not yet expose qa:quality-gate');
}

console.log('EnglishGate Quality Gate');
console.log('========================');
if(warnings.length){
  console.log(`Warnings (${warnings.length}):`);
  for(const w of warnings)console.log(`- ${w}`);
}
if(failures.length){
  console.error(`Failures (${failures.length}):`);
  for(const f of failures)console.error(`- ${f}`);
  process.exit(1);
}
console.log('PASS: deterministic EnglishGate release invariants are present.');
