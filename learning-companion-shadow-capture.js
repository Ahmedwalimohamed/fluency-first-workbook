'use strict';

/**
 * Shadow capture for already-accepted EnglishGate workbook attempts.
 * IMPORTANT: call only AFTER the core DB transaction commits.
 * This module never writes grading/progress/content/auth state.
 */
const shadow=require('./learning-companion-shadow-bootstrap');
const jev=require('./learning-companion-jev');

function normalizeWorkbookAttempt(row){
  if(!row)return null;
  return {
    id:`workbook:${row.attempt_id}`,
    student_id:String(row.student_id||''),
    lesson_id:String(row.lesson_id||''),
    skill:String(row.activity_type||'unknown'),
    score:Number(row.percentage ?? row.score ?? 0),
    response:row.responses ?? null,
    created_at:row.submitted_at||row.created_at||new Date().toISOString(),
    target:String(row.activity_type||'unknown'),
    correct:Number(row.percentage ?? row.score ?? 0)>=80
  };
}

async function observeWorkbookAttempt({pool,row,priorState={}}){
  const attempt=normalizeWorkbookAttempt(row);
  if(!attempt||!attempt.student_id||!attempt.lesson_id)return {status:'INVALID_SHADOW_INPUT',core_unchanged:true};
  return shadow.observeAcceptedAttempt({
    pool,
    attempt,
    priorState,
    diagnose:jev.diagnose,
    decide:jev.decide
  });
}

module.exports={normalizeWorkbookAttempt,observeWorkbookAttempt};
