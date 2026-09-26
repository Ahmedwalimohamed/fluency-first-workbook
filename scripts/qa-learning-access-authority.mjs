import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {decideLearningAccess}=require('../learning-access-authority.js');
const env={B1_LEARNING_COMPANION_SHADOW_PILOT:'true',B1_LEARNING_COMPANION_PILOT_STUDENT_IDS:'pilot-1',A1_PREVIEW_MODE:'1'};
const yes=(x)=>assert.equal(x.allowed,true);
const no=(x)=>assert.equal(x.allowed,false);

yes(decideLearningAccess({userId:'any',courseId:'speakup-b2',lessonId:'su-b2-l1',env,enrolledCourseIds:[]}));
yes(decideLearningAccess({userId:'pilot-1',courseId:'speakup-b1',lessonId:'su-b1-l1',env,enrolledCourseIds:['speakup-b1']}));
no(decideLearningAccess({userId:'other',courseId:'speakup-b1',lessonId:'su-b1-l1',env,enrolledCourseIds:['speakup-b1']}));
no(decideLearningAccess({userId:'pilot-1',courseId:'speakup-b1',lessonId:'su-b1-l2',env,enrolledCourseIds:['speakup-b1']}));
no(decideLearningAccess({userId:'pilot-1',courseId:'speakup-b1',lessonId:'su-b1-l1',env,enrolledCourseIds:[]}));
yes(decideLearningAccess({userId:'a1',courseId:'speakup-a1-gold',lessonId:'a1-gold-l1',env,enrolledCourseIds:['speakup-a1-gold']}));
no(decideLearningAccess({userId:'a1',courseId:'speakup-a1-gold',lessonId:'a1-gold-l1',env:{...env,A1_PREVIEW_MODE:'0'},enrolledCourseIds:['speakup-a1-gold']}));
console.log('Learning access authority gate: PASS');
