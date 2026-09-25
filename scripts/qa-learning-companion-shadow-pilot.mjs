import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);

process.env.LEARNING_COMPANION_V1='false';
process.env.LEARNING_COMPANION_SHADOW_V1='true';
process.env.B1_LEARNING_COMPANION_SHADOW_PILOT='true';
delete process.env.TYPESAFE_API_KEY;

const companion=require('../learning-companion-v1.js');
const pilot=require('../learning-companion-pilot-scope.js');
const capture=require('../learning-companion-shadow-capture.js');
const adapter=require('../learning-companion-adapter.js');
const b1Bootstrap=require('../b1-shadow-pilot-bootstrap.js');

const run=async(name,fn)=>{try{await fn();console.log('PASS',name)}catch(e){console.error('FAIL',name,e.message);process.exitCode=1}};

await run('shadow observation can run while learner-facing Companion remains off',async()=>{
 assert.equal(companion.enabled(),false);
 assert.equal(companion.shadowEnabled(),true);
 assert.equal(companion.observationEnabled(),true);
});

await run('B1 controlled bootstrap rejects unsafe learner-facing activation',async()=>{
 assert.doesNotThrow(()=>b1Bootstrap.assertSafeMode());
 process.env.LEARNING_COMPANION_V1='true';
 assert.throws(()=>b1Bootstrap.assertSafeMode(),/refuses to start/);
 process.env.LEARNING_COMPANION_V1='false';
 process.env.LEARNING_COMPANION_SHADOW_V1='false';
 assert.throws(()=>b1Bootstrap.assertSafeMode(),/requires LEARNING_COMPANION_SHADOW_V1/);
 process.env.LEARNING_COMPANION_SHADOW_V1='true';
});

await run('B1 pilot requires flag and explicit student allowlist',async()=>{
 const flagOnly={B1_LEARNING_COMPANION_SHADOW_PILOT:'true'};
 assert.equal(pilot.isAllowedB1ShadowPilot('student-1','su-b1-l1',flagOnly),false);
 const allowed={B1_LEARNING_COMPANION_SHADOW_PILOT:'true',B1_LEARNING_COMPANION_PILOT_STUDENT_IDS:'student-1,student-2'};
 assert.equal(pilot.isAllowedB1ShadowPilot('student-1','su-b1-l1',allowed),true);
 assert.equal(pilot.isAllowedB1ShadowPilot('student-3','su-b1-l1',allowed),false);
});

await run('B1 pilot is limited to Lesson 1',async()=>{
 const env={B1_LEARNING_COMPANION_SHADOW_PILOT:'true',B1_LEARNING_COMPANION_PILOT_STUDENT_IDS:'student-1'};
 assert.equal(pilot.isAllowedB1ShadowPilot('student-1','su-b1-l1',env),true);
 assert.equal(pilot.isAllowedB1ShadowPilot('student-1','su-b1-l2',env),false);
 assert.equal(pilot.isAllowedB1ShadowPilot('student-1','su-b2-l1',env),false);
});

await run('workbook capture strips raw responses before adapter',async()=>{
 const row={attempt_id:7,activity_id:'su-b1-l1:reading',lesson_id:'su-b1-l1',activity_type:'reading',student_id:'student-1',percentage:40,responses:{q1:'SECRET LEARNER ANSWER'},submitted_at:'2026-09-25T19:00:00Z'};
 const safe=capture.safeResultFromWorkbook(row);
 assert.equal('responses' in safe,false);
 assert.equal('response' in safe,false);
 const adapted=adapter.adaptActivityResult(safe,capture.safeContext(safe,'workbook_activity_attempts'));
 assert.equal(JSON.stringify(adapted).includes('SECRET LEARNER ANSWER'),false);
});

await run('core capture strips detailed evidence before adapter',async()=>{
 const row={id:9,student_id:'student-1',lesson_id:'su-b1-l1',skill:'grammar',score:50,evidence:[{studentAnswer:'PRIVATE',correctAnswer:'ANSWER KEY'}],at:'2026-09-25T19:00:00Z'};
 const safe=capture.safeResultFromCore(row);
 assert.equal('evidence' in safe,false);
 assert.equal(JSON.stringify(safe).includes('PRIVATE'),false);
 assert.equal(JSON.stringify(safe).includes('ANSWER KEY'),false);
});

await run('safe shadow persistence works with learner-facing mode disabled',async()=>{
 const calls=[];
 const pool={query:async(sql,params=[])=>{
   calls.push({sql:String(sql),params});
   if(String(sql).includes('insert into learning_companion_events'))return{rowCount:1,rows:[{event_id:params[0]}]};
   if(String(sql).includes('insert into learning_companion_shadow_decisions'))return{rowCount:1,rows:[]};
   return{rowCount:0,rows:[]};
 }};
 const row={attempt_id:11,activity_id:'su-b1-l1:listening',lesson_id:'su-b1-l1',activity_type:'listening',student_id:'student-1',percentage:25,responses:{q1:'DO NOT STORE ME'},submitted_at:'2026-09-25T19:00:00Z'};
 const result=await capture.observeWorkbookAttempt({pool,row});
 assert.notEqual(result.status,'SHADOW_ERROR');
 assert.equal(result.shadow,true);
 const serialized=JSON.stringify(calls);
 assert.equal(serialized.includes('DO NOT STORE ME'),false);
 assert.equal(serialized.includes('student-1'),true);
 assert.equal(serialized.includes('su-b1-l1'),true);
});

await run('safe core shadow event is deterministic and versioned',async()=>{
 const safe=capture.safeResultFromCore({id:42,student_id:'student-1',lesson_id:'su-b1-l1',skill:'vocabulary',score:90,at:'2026-09-25T19:00:00Z'});
 const context=capture.safeContext(safe,'core_attempts');
 const a=adapter.adaptActivityResult(safe,context),b=adapter.adaptActivityResult(safe,context);
 assert.equal(a.event.event_id,b.event.event_id);
 assert.equal(a.event.lesson_version,'speakup-b1-v1');
 assert.ok(a.event.question_version);
});

if(!process.exitCode)console.log('Learning Companion safe B1 real shadow pilot gate: PASS');
