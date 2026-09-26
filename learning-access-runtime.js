'use strict';

const {decideLearningAccess}=require('./learning-access-authority');

async function enrolledCourseIds(pool,userId){
  if(!pool||!userId)return[];
  const r=await pool.query(`select distinct c.course_id
    from enrollments e join classes c on c.id=e.class_id
    where e.user_id=$1 and c.course_id is not null`,[userId]);
  return r.rows.map(x=>String(x.course_id)).filter(Boolean)
}

async function decideStudentLearningAccess({pool,user,courseId,lessonId,env=process.env}={}){
  if(!user||user.role!=='student')return{allowed:false,mode:'inactive',reason:'student_required'};
  const courses=await enrolledCourseIds(pool,user.id);
  return decideLearningAccess({userId:user.id,courseId,lessonId,env,enrolledCourseIds:courses})
}

function courseIdFromLesson(lessonId){
  const id=String(lessonId||'');
  if(/^su-b2-l\d+$/.test(id))return'speakup-b2';
  if(/^su-b1-l\d+$/.test(id))return'speakup-b1';
  if(/^a1-gold-l(?:[1-9]|1\d|2[0-2])$/.test(id))return'speakup-a1-gold';
  return null
}

async function decideStudentLessonAccess({pool,user,lessonId,env=process.env}={}){
  const courseId=courseIdFromLesson(lessonId);
  if(!courseId)return{allowed:false,mode:'inactive',reason:'unknown_lesson'};
  return decideStudentLearningAccess({pool,user,courseId,lessonId,env})
}

module.exports={enrolledCourseIds,decideStudentLearningAccess,courseIdFromLesson,decideStudentLessonAccess};
