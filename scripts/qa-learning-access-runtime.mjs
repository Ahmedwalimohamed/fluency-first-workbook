import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const runtime=require('../learning-access-runtime.js');

const queries=[];
const pool={query:async(sql,args)=>{queries.push({sql,args});return{rows:args?.[0]==='pilot-1'?[{course_id:'speakup-b1'}]:[]}}};
const env={B1_LEARNING_COMPANION_SHADOW_PILOT:'true',B1_LEARNING_COMPANION_PILOT_STUDENT_IDS:'pilot-1',A1_PREVIEW_MODE:'1'};

assert.equal(runtime.courseIdFromLesson('su-b1-l1'),'speakup-b1');
assert.equal(runtime.courseIdFromLesson('su-b2-l9'),'speakup-b2');
assert.equal(runtime.courseIdFromLesson('a1-gold-l1'),'speakup-a1-gold');
assert.equal(runtime.courseIdFromLesson('unknown'),null);

const allowed=await runtime.decideStudentLessonAccess({pool,user:{id:'pilot-1',role:'student'},lessonId:'su-b1-l1',env});
assert.equal(allowed.allowed,true);
assert.equal(allowed.reason,'b1_pilot_enrollment_allowlist');

const wrongLesson=await runtime.decideStudentLessonAccess({pool,user:{id:'pilot-1',role:'student'},lessonId:'su-b1-l2',env});
assert.equal(wrongLesson.allowed,false);

const notEnrolled=await runtime.decideStudentLessonAccess({pool,user:{id:'other',role:'student'},lessonId:'su-b1-l1',env});
assert.equal(notEnrolled.allowed,false);

const nonStudent=await runtime.decideStudentLessonAccess({pool,user:{id:'pilot-1',role:'teacher'},lessonId:'su-b1-l1',env});
assert.equal(nonStudent.allowed,false);
assert.equal(nonStudent.reason,'student_required');

assert.ok(queries.some(x=>String(x.sql).includes('join classes')),'runtime authority must derive access from real enrollment/class data');
console.log('Learning access runtime gate: PASS');
