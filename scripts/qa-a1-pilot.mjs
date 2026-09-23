import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const file=new URL('../a1-pilot-bootstrap.js',import.meta.url);
const src=fs.readFileSync(file,'utf8');
const syntax=spawnSync(process.execPath,['--check',file.pathname],{encoding:'utf8'});
const checks=[
 ['pilot bootstrap syntax',syntax.status===0],
 ['activation is feature-flagged',src.includes("A1_GOLD_PILOT_MODE==='1'")],
 ['pilot class ID is fixed',src.includes("PILOT_CLASS_ID='a1_gold_pilot_class'")],
 ['A1 becomes pilot while B2 stays ready',src.includes("id='speakup-b2' then 'ready' when id=$1 then 'pilot' else 'inactive'")],
 ['extra students are blocked by default',src.includes("A1_GOLD_PILOT_ALLOW_EXTRA_STUDENTS==='1'")&&src.includes('locked to the dedicated pilot learner')),
 ['extra classes are blocked by default',src.includes("A1_GOLD_PILOT_ALLOW_EXTRA_CLASSES==='1'")&&src.includes('limited to the controlled pilot class')),
 ['pilot learner is removed from other classes',src.includes("delete from enrollments where user_id=$1 and class_id<>$2")],
 ['pilot class deletion is protected',src.includes('cannot be deleted while pilot mode is enabled')),
 ['credential and enrollment self-check exists',src.includes('credentialValid')&&src.includes('pilotStudents.length===1')&&src.includes('studentClasses.rows.length===1')),
 ['no unintended active books allowed',src.includes("status in ('ready','pilot')")&&src.includes("id not in ('speakup-b2',$1)"))],
 ['request guards are enabled only after DB setup',src.indexOf("process.env.A1_PREVIEW_MODE='1'")>src.indexOf("update books set status=case"))],
 ['pilot runtime emits explicit safe marker',src.includes('A1 PILOT SELF-CHECK PASSED')&&src.includes('A1 CONTROLLED PILOT ACTIVE'))
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failed++}
if(failed){console.error(`A1 PILOT SAFETY QA failed: ${failed} check(s).`);process.exit(1)}
console.log(`A1 PILOT SAFETY QA passed: ${checks.length}/${checks.length}.`);
