import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const lesson=require('../course-factory/gold/b1-lesson-04-quality-patch.js');
const flow=require('../course-factory/student-flow.js');

function assert(name,condition,detail=''){
  if(!condition){console.error(`FAIL  ${name}${detail?' · '+detail:''}`);process.exitCode=1}else console.log(`PASS  ${name}`)
}

console.log('STUDENT JOURNEY A — strong learner');
const strong={completed:{vocabulary:true,reading:true,listening:true,grammar:true},scores:{vocabulary:1,reading:1,listening:1,grammar:6/7}};
const strongRoute=flow.decideAdaptiveRoute(strong,lesson);
assert('strong learner reaches mastery',strongRoute.status==='mastered',JSON.stringify(strongRoute));
assert('strong learner unlocks writing',strongRoute.writingUnlocked===true);
assert('strong learner gets no unnecessary Boost',strongRoute.boost===null);

console.log('STUDENT JOURNEY B — grammar weakness');
const weakGrammar={completed:{vocabulary:true,reading:true,listening:true,grammar:true},scores:{vocabulary:1,reading:1,listening:1,grammar:0}};
const weakRoute=flow.decideAdaptiveRoute(weakGrammar,lesson);
assert('below-80 learner is routed to Boost',weakRoute.status==='boost',JSON.stringify(weakRoute));
assert('writing remains locked below mastery',weakRoute.writingUnlocked===false);
assert('only Grammar Boost opens',weakRoute.boost?.area==='grammar'&&weakRoute.boost?.weakAreaOnly===true,JSON.stringify(weakRoute));
assert('mastery calculation is 75 percent',Math.abs(weakRoute.mastery-0.75)<0.0001,String(weakRoute.mastery));

console.log('LISTENING TRANSCRIPT JOURNEY');
assert('transcript stays locked after attempt 1',flow.transcriptUnlocked(1,lesson)===false);
assert('transcript unlocks after attempt 2',flow.transcriptUnlocked(2,lesson)===true);

console.log('FLUENCY MISSION JOURNEY');
const missionWithImperfectGrammar=flow.missionCompletion({outcomeReached:true,targetLanguageEvidence:['one intelligible Present Perfect Continuous attempt']});
assert('real outcome completes mission despite imperfect grammar count',missionWithImperfectGrammar.completed===true);
const missionWithoutOutcome=flow.missionCompletion({outcomeReached:false,targetLanguageEvidence:['multiple accurate target forms']});
assert('grammar display alone cannot complete mission',missionWithoutOutcome.completed===false);

if(process.exitCode)process.exit(process.exitCode);
console.log('B1 Gold Lesson 4 student-flow proof passed.');
