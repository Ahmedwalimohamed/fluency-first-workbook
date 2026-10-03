import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const root=fileURLToPath(new URL('../',import.meta.url));
const b1=require('../course-factory/gold/b1-lesson-04-quality-patch.js');
const source=fs.readFileSync(root+'public/speakup-b2-blueprint.js','utf8');
const sandbox={window:{}};
vm.runInNewContext(source,sandbox,{filename:'public/speakup-b2-blueprint.js'});
const b2=(sandbox.window.SPEAKUP_B2_BLUEPRINT||[]).find(x=>x.id==='su-b2-l4');

function assert(name,condition,detail=''){
 if(!condition){console.error(`FAIL  ${name}${detail?' · '+detail:''}`);process.exitCode=1}else console.log(`PASS  ${name}`)
}

assert('B2 Golden source lesson exists',Boolean(b2));
if(!b2)process.exit(1);
assert('topic identity is preserved',b1.title===b2.title&&b1.title==='Technology & Social Media');
assert('grammar family is preserved',b1.curriculum.grammar.focus===b2.grammarFocus&&b2.grammarFocus==='Present Perfect Continuous');
assert('B1 uses a distinct lesson id',b1.id!=='su-b2-l4');
assert('B1 keeps algorithm out of core mastery vocabulary',!b1.curriculum.vocabulary.core.includes('algorithm')&&b1.curriculum.vocabulary.stretch.includes('algorithm'));
assert('B2 treats algorithm as core vocabulary',Array.isArray(b2.vocabulary)&&b2.vocabulary.includes('algorithm'));
assert('B2 performance explicitly requires debate/opposing views',/debate/i.test(b2.outcome)&&/opposing views/i.test(b2.outcome));
assert('B1 outcome stays practical and familiar',b1.canDo.some(x=>/habits|use of technology|screen time/i.test(x))&&!b1.canDo.some(x=>/counterargument|evidence seems|reasoned position/i.test(x)));
assert('B2 discourse requires concession and evidence',Array.isArray(b2.discourse)&&b2.discourse.some(x=>/conced/i.test(x))&&b2.discourse.some(x=>/evidence/i.test(x)));
assert('B1 mission is a practical negotiated decision',/three realistic digital-use rules/i.test(b1.stages.fluencyMission.scenario)&&/three rules/i.test(b1.stages.fluencyMission.outcome));
assert('B1 mission completion does not require grammar counting',!b1.stages.fluencyMission.requirements.some(x=>/present perfect|twice/i.test(x)));
assert('B1 Help Me Practice blocks B2-style abstraction',/Do not require sustained counterargument/.test(b1.helpMePractice.b1Boundary)&&/abstract debate/.test(b1.helpMePractice.interventionPolicy));
assert('B1 and B2 reading content is original/distinct',!String(b1.stages.reading.text).includes('Yusuf has been working from his laptop')&&String(b1.stages.reading.text)!==String(b2.readingText));
assert('B1 and B2 listening content is original/distinct',String(b1.stages.listening.audioScript)!==String(b2.audioScript)&&!/Moderator: Do you think social media/.test(b1.stages.listening.audioScript));
assert('B1 writing task is original/distinct',String(b1.stages.writing.prompt)!==String(b2.writing?.task||'')&&/digital habit/i.test(b1.stages.writing.prompt));
assert('B1 production remains disabled',b1.productionActivation===false);

if(process.exitCode)process.exit(process.exitCode);
console.log('B1 vs B2 Lesson 4 comparison QA passed: same architecture/theme, distinct CEFR demand and original content.');
