import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>fs.readFileSync(root+p,'utf8');
const js=read('public/course-factory-b1-gold-l4-preview.js');
const html=read('public/course-factory-b1-gold-l4-preview.html');
const css=read('public/course-factory-preview.css');
const api=read('api/vercel-parity-entry.js');

for(const file of ['public/course-factory-b1-gold-l4-preview.js','api/vercel-parity-entry.js']){
  const run=spawnSync(process.execPath,['--check',root+file],{encoding:'utf8'});
  if(run.status!==0){console.error(`FAIL  syntax ${file}`);console.error(run.stderr||run.stdout);process.exit(1)}
  console.log(`PASS  syntax ${file}`);
}

const forbiddenRegistryWrites=[
 /BOOK_PACKS\s*\[/,
 /LIVE_BOOKS\s*\[/,
 /BOOK_SEEDS\s*=/,
 /update\s+books\s+set\s+status/i
];

const checks=[
 ['preview HTML loads dedicated CSS',html.includes('/course-factory-preview.css?v=1')],
 ['preview HTML loads interactive runtime',html.includes('/course-factory-b1-gold-l4-preview.js?v=1')],
 ['preview labels itself B1 Gold preview only',html.includes('B1 Gold · Preview only')],
 ['preview data endpoint is preview-gated',api.includes("/__course-factory/b1-gold-l4/preview-data")&&api.includes('if(!isPreview())return json(res,404')],
 ['Jev endpoint remains preview-gated',api.includes("/__course-factory/b1-gold-l4/jev-review")],
 ['preview reads reviewed lesson from server',api.includes("b1-lesson-04-quality-patch.js")],
 ['mastery uses four scored areas',js.includes("const SCORED=['vocabulary','reading','listening','grammar']")],
 ['writing requires mastery threshold',js.includes('mastery()>=Number(lesson?.mastery?.threshold||0.8)')],
 ['weakest-area Boost is implemented',js.includes('function weakest()')&&js.includes('Only the weakest-area Boost opens')],
 ['transcript unlock uses lesson attempt rule',js.includes('state.listeningAttempts>=s.transcriptUnlockAttempt')],
 ['listening requires checked attempts',js.includes('state.listeningAttempts++')],
 ['open grammar response is formative',js.includes('Formative only — this open item does not reduce your mastery score')],
 ['Fluency Mission completion follows outcome',js.includes('The group decision—not a grammar count—is the completion gate')],
 ['mobile layout exists',css.includes('@media(max-width:760px)')],
 ['preview does not modify production book registries',forbiddenRegistryWrites.every(pattern=>!pattern.test(js)&&!pattern.test(api))]
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failed++}
if(failed){console.error(`B1 Gold student preview QA failed: ${failed} check(s).`);process.exit(1)}
console.log(`B1 Gold student preview QA passed: ${checks.length}/${checks.length}.`);
