'use strict';

/**
 * EnglishGate Learning Access Authority
 * Single source of truth for whether a learner may use a course/lesson.
 * No route should independently invent B1/B2/A1 access rules.
 */

function csvSet(value){
  return new Set(String(value||'').split(',').map(x=>x.trim()).filter(Boolean));
}

function b2Lesson(lessonId){return /^su-b2-l\d+$/.test(String(lessonId||''));}
function a1PreviewLesson(lessonId){return /^a1-gold-l(?:[1-9]|1\d|2[0-2])$/.test(String(lessonId||''));}
function b1PilotLesson(lessonId){return String(lessonId||'')==='su-b1-l1';}

function decideLearningAccess({userId,courseId,lessonId,env=process.env,enrolledCourseIds=[]}={}){
  const enrolled=new Set(Array.isArray(enrolledCourseIds)?enrolledCourseIds.map(String):[]);

  if(courseId==='speakup-b2' && b2Lesson(lessonId)){
    return {allowed:true,mode:'production',reason:'b2_ready'};
  }

  if(courseId==='speakup-a1-gold' && env.A1_PREVIEW_MODE==='1' && a1PreviewLesson(lessonId) && enrolled.has('speakup-a1-gold')){
    return {allowed:true,mode:'preview',reason:'a1_preview_enrollment'};
  }

  if(courseId==='speakup-b1' && env.B1_LEARNING_COMPANION_SHADOW_PILOT==='true' && b1PilotLesson(lessonId) && enrolled.has('speakup-b1')){
    const allow=csvSet(env.B1_LEARNING_COMPANION_PILOT_STUDENT_IDS);
    if(allow.has(String(userId||''))) return {allowed:true,mode:'shadow-pilot',reason:'b1_pilot_enrollment_allowlist'};
    return {allowed:false,mode:'inactive',reason:'b1_student_not_allowlisted'};
  }

  return {allowed:false,mode:'inactive',reason:'course_or_lesson_inactive'};
}

module.exports={decideLearningAccess,b2Lesson,a1PreviewLesson,b1PilotLesson};
