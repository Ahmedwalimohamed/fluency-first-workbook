import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const adapter=require('../learning-companion-adapter.js');

const run=async(name,fn)=>{try{await fn();console.log('PASS',name)}catch(e){console.error('FAIL',name,e.message);process.exitCode=1}};

const context={
 lessonVersion:'b1-l1-v1',questionVersion:'q1-v1',courseId:'speakup-b1',lessonId:'su-b1-l1',activityId:'grammar-1',skill:'grammar',targetId:'present-simple-vs-continuous',answerKeyVersion:'ak-v1',versions:{content:'2026-09-25'}
};
const result={studentId:'s1',attemptId:'a1',timestamp:'2026-09-25T19:00:00Z',attempt:1,correct:false};

await run('maps B1 graded result to canonical event without mutating input',async()=>{
 const before=structuredClone(result);
 const payload=adapter.adaptActivityResult(result,context);
 assert.deepEqual(result,before);
 assert.equal(payload.event.learner_id,'s1');
 assert.equal(payload.event.course_id,'speakup-b1');
 assert.equal(payload.event.lesson_id,'su-b1-l1');
 assert.equal(payload.event.skill,'grammar');
 assert.equal(payload.coreState.correct,false);
 assert.equal(payload.coreState.answer_key_version,'ak-v1');
});

await run('same adapter contract works across CEFR levels',async()=>{
 for(const [courseId,lessonId] of [['speakup-a1','su-a1-l1'],['speakup-b1','su-b1-l1'],['speakup-b2','b2-l1']]){
  const payload=adapter.adaptActivityResult(result,{...context,courseId,lessonId});
  assert.equal(payload.event.course_id,courseId);
  assert.equal(payload.event.lesson_id,lessonId);
 }
});

await run('normalizes shared skill aliases',async()=>{
 assert.equal(adapter.normalizeSkill('Vocab'),'vocabulary');
 assert.equal(adapter.normalizeSkill('Language Focus'),'grammar');
 assert.equal(adapter.normalizeSkill('Listening'),'listening');
});

await run('event id is deterministic for replay safety',async()=>{
 const a=adapter.adaptActivityResult(result,context).event.event_id;
 const b=adapter.adaptActivityResult(result,context).event.event_id;
 assert.equal(a,b);
 assert.equal(a,'s1:a1:q1-v1');
});

await run('does not leak raw answer or answer key into companion event',async()=>{
 const payload=adapter.adaptActivityResult({...result,studentAnswer:'wrong',correctAnswer:'right',answerKey:'right'},context);
 assert.equal('studentAnswer' in payload.event,false);
 assert.equal('correctAnswer' in payload.event,false);
 assert.equal('answerKey' in payload.event,false);
});

await run('disabled Companion is fail-safe and leaves core unchanged',async()=>{
 process.env.LEARNING_COMPANION_V1='false';
 const out=await adapter.observeActivityResult({result,context});
 assert.equal(out.status,'DISABLED');
 assert.equal(out.core_unchanged,true);
});

await run('enabled correct result continues without generation',async()=>{
 process.env.LEARNING_COMPANION_V1='true';
 const out=await adapter.observeActivityResult({result:{...result,correct:true},context,diagnose:async()=>{throw new Error('must not diagnose correct answer')},decide:async()=>{throw new Error('must not decide correct answer')}});
 assert.equal(out.status,'OBSERVED');
 assert.equal(out.action,'CONTINUE');
 assert.equal(out.core_unchanged,true);
});

await run('enabled wrong result accepts bounded Jev action and persists companion-only evidence',async()=>{
 process.env.LEARNING_COMPANION_V1='true';
 const records=[];
 const out=await adapter.observeActivityResult({
  result,context,
  diagnose:async()=>({misconception:'tense-choice',confidence:0.91,evidence:['wrong-choice']}),
  decide:async()=>({action:'EXPLAIN',confidence:0.91,reason_code:'TARGETED'}),
  persistCompanionEvent:async record=>records.push(record)
 });
 assert.equal(out.action,'EXPLAIN');
 assert.equal(out.core_unchanged,true);
 assert.equal(records.length,1);
 assert.equal(records[0].event_id,'s1:a1:q1-v1');
});

await run('invalid Jev decision falls back deterministically',async()=>{
 process.env.LEARNING_COMPANION_V1='true';
 const out=await adapter.observeActivityResult({
  result,context,
  diagnose:async()=>({misconception:'x',confidence:0.9,evidence:[]}),
  decide:async()=>({action:'SHOW_ANSWER',confidence:0.9})
 });
 assert.equal(out.action,'PROMPT_NOTICE');
 assert.equal(out.core_unchanged,true);
});

await run('missing version metadata is rejected instead of guessed',async()=>{
 process.env.LEARNING_COMPANION_V1='true';
 const out=await adapter.observeActivityResult({result,context:{...context,lessonVersion:null}});
 assert.equal(out.status,'REJECTED_EVENT');
 assert.ok(out.missing.includes('lesson_version'));
});

process.env.LEARNING_COMPANION_V1='false';
if(!process.exitCode) console.log('Universal Learning Companion adapter gate: PASS');
