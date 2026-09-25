import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
process.env.B1_LEARNING_COMPANION_PILOT='true';
const c=require('../b1-learning-companion-e2e.js');

const base={eventId:'e1',studentId:'s1',courseId:'speakup-b1',lessonId:'su-b1-l1',activityId:'a1',targetId:'t1',skill:'grammar',attempt:1,correct:false,timestamp:'2026-09-25T18:00:00Z'};
const run=(name,fn)=>{try{fn();console.log('PASS',name)}catch(e){console.error('FAIL',name,e.message);process.exitCode=1}};

run('correct answer continues without intervention',()=>{
 const r=c.runDeterministicPilot({event:{...base,correct:true}});
 assert.equal(r.action,c.ACTION.CONTINUE); assert.equal(r.requiresGeneration,false); assert.equal(r.requiresRetest,false);
});
run('wrong grammar answer gets bounded help',()=>{
 const r=c.runDeterministicPilot({event:base});
 assert.equal(r.status,'accepted'); assert.equal(r.action,c.ACTION.MICRO_EXPLAIN); assert.equal(r.requiresRetest,true);
});
run('wrong vocabulary answer routes to vocabulary help',()=>{
 const r=c.runDeterministicPilot({event:{...base,skill:'vocabulary'}});
 assert.equal(r.action,c.ACTION.CLARIFY_VOCABULARY);
});
run('reading and listening route to comprehension help',()=>{
 for(const skill of ['reading','listening']){
  const r=c.runDeterministicPilot({event:{...base,skill,eventId:'e-'+skill}});
  assert.equal(r.diagnosis.need,c.NEED.COMPREHENSION); assert.equal(r.action,c.ACTION.GIVE_EXAMPLE);
 }
});
run('low confidence safely falls back to retest',()=>{
 const r=c.runDeterministicPilot({event:{...base,skill:'writing'}});
 assert.equal(r.action,c.ACTION.RETEST);
});
run('unknown proposed action is rejected and replaced',()=>{
 const r=c.runDeterministicPilot({event:base,proposedAction:'SHOW_ANSWER'});
 assert.equal(r.status,'held'); assert.equal(r.action,c.ACTION.RETEST);
});
run('intervention budget escalates',()=>{
 const r=c.runDeterministicPilot({event:base,state:{interventionsThisActivity:3}});
 assert.equal(r.action,c.ACTION.ESCALATE_TEACHER); assert.equal(r.requiresRetest,false);
});
run('malformed event cannot execute',()=>{
 const r=c.runDeterministicPilot({event:{...base,eventId:null}});
 assert.equal(r.status,'rejected'); assert.equal(r.validation.valid,false);
});
run('evidence update is additive and never mutates grade',()=>{
 const before={grade:77,t1:{attempts:1,correct:0,interventions:0}};
 const after=c.evidenceUpdate(before,base,{intervened:true,action:c.ACTION.MICRO_EXPLAIN});
 assert.equal(before.grade,77); assert.equal(after.grade,77); assert.equal(after.t1.attempts,2); assert.equal(after.t1.interventions,1);
});

if(!process.exitCode) console.log('B1 Learning Companion pilot gate: PASS');
