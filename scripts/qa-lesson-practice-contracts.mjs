import {createRequire} from 'module';
const require=createRequire(import.meta.url);
const {allContracts}=require('../lesson-practice-contracts');

const contracts=allContracts();
let failed=0;
function check(ok,label,detail=''){
 if(ok)console.log('PASS ',label,detail);
 else{failed++;console.error('FAIL ',label,detail)}
}
check(contracts.length>=40,'all active A1 + B2 lessons expose speaking contracts','count='+contracts.length);
const ids=new Set();
for(const c of contracts){
 check(Boolean(c?.lessonId&&c?.title),`contract identity ${c?.lessonId||'missing'}`);
 check(!ids.has(c.lessonId),`contract id unique ${c.lessonId}`);ids.add(c.lessonId);
 check(Boolean(c.canDo),`curriculum can-do present ${c.lessonId}`);
 check(Array.isArray(c.goals)&&c.goals.length>=2,`observable goals present ${c.lessonId}`,'goals='+(c.goals?.length||0));
 check(c.goals.some(g=>g.required),`required evidence goal present ${c.lessonId}`);
 check(c.goals.every(g=>g.source!=='safety_fallback'),`no generic fallback goals ${c.lessonId}`);
 check(c.goals.every(g=>g.id&&g.label),`stable goal ids and labels ${c.lessonId}`);
 check(new Set(c.goals.map(g=>g.id)).size===c.goals.length,`goal ids unique ${c.lessonId}`);
 check(Number(c.minMeaningfulTurns)>=2&&Number(c.minMeaningfulTurns)<=5,`bounded speaking-turn requirement ${c.lessonId}`,'turns='+c.minMeaningfulTurns);
 check(Number(c.requiredObserved)>=1,`trusted evidence threshold present ${c.lessonId}`);
}
if(failed){console.error(`Lesson practice contract QA failed: ${failed} check(s).`);process.exit(1)}
console.log(`Lesson practice contract QA passed. Contracts=${contracts.length}.`);
