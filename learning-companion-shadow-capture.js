'use strict';

/**
 * Safe shadow capture for already-accepted EnglishGate attempts.
 * Call only AFTER the core write succeeds/commits.
 * Raw learner answers and answer keys are deliberately excluded from the
 * Learning Companion event contract and shadow persistence.
 */
const companion=require('./learning-companion-v1');
const adapter=require('./learning-companion-adapter');
const shadow=require('./learning-companion-shadow-bootstrap');
const jev=require('./learning-companion-jev');

function lessonVersion(lessonId){
  const id=String(lessonId||'');
  if(/^su-b1-l\d+$/.test(id))return'speakup-b1-v1';
  if(/^su-b2-l\d+$/.test(id))return'b2-living-standard-v1';
  if(/^a1-gold-l\d+$/.test(id))return'a1-gold-v1';
  return'englishgate-workbook-v1';
}

function safeResultFromWorkbook(row){
  if(!row)return null;
  const score=Number(row.percentage ?? row.score ?? 0),skill=String(row.activity_type||'unknown');
  return {
    learner_id:String(row.student_id||''),
    attempt_id:`workbook:${row.attempt_id}`,
    lesson_id:String(row.lesson_id||''),
    activity_id:String(row.activity_id||`${row.lesson_id||''}:${skill}`),
    skill,
    target_id:skill,
    correct:score>=80,
    timestamp:row.submitted_at||row.created_at||new Date().toISOString(),
    attempt_number:Number(row.attempt_number||1),
    previous_errors:Number(row.previous_errors||0)
  };
}

function safeResultFromCore(row){
  if(!row)return null;
  const score=Number(row.score ?? 0),skill=String(row.skill||'unknown');
  return {
    learner_id:String(row.student_id||''),
    attempt_id:`core:${row.id}`,
    lesson_id:String(row.lesson_id||''),
    activity_id:`${row.lesson_id||''}:${skill}`,
    skill,
    target_id:skill,
    correct:score>=80,
    timestamp:row.at||row.created_at||new Date().toISOString(),
    attempt_number:Number(row.attempt_number||1),
    previous_errors:Number(row.previous_errors||0)
  };
}

function safeContext(result,source){
  const lv=lessonVersion(result.lesson_id),qv=`${source}:${result.skill}:result-v1`;
  return {
    lesson_version:lv,
    question_version:qv,
    answer_key_version:qv,
    versions:{adapter:'learning-companion-adapter-v1',source,lesson_version:lv,question_version:qv}
  };
}

async function observeSafeResult({pool,result,source}){
  if(!companion.enabled())return{status:'DISABLED',core_unchanged:true};
  if(!result||!result.learner_id||!result.lesson_id||!result.attempt_id)return{status:'INVALID_SHADOW_INPUT',core_unchanged:true};
  await shadow.ensureShadowSchema(pool);
  const context=safeContext(result,source);
  const {event}=adapter.adaptActivityResult(result,context);
  const persistedEvent={...event,event_type:'ATTEMPT_RECORDED'};
  const inserted=await shadow.persistEventOnce(pool,persistedEvent);
  if(!inserted)return{status:'DUPLICATE_IGNORED',event_id:event.event_id,core_unchanged:true};

  const observed=await adapter.observeActivityResult({
    result,
    context,
    diagnose:jev.diagnose,
    decide:jev.decide,
    persistCompanionEvent:async record=>{
      await pool.query(
        `insert into learning_companion_shadow_decisions(event_id,learner_id,lesson_id,action,diagnosis,policy,record)
         values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb)
         on conflict(event_id) do nothing`,
        [event.event_id,event.learner_id,event.lesson_id,record.policy?.action||'NO_ACTION',JSON.stringify(record.diagnosis||{}),JSON.stringify(record.policy||{}),JSON.stringify(record)]
      );
    }
  });
  return{...observed,event_id:event.event_id,shadow:true,core_unchanged:true};
}

async function observeWorkbookAttempt({pool,row}){
  try{return await observeSafeResult({pool,result:safeResultFromWorkbook(row),source:'workbook_activity_attempts'})}
  catch(error){console.error('[LearningCompanion shadow] workbook observation failed:',error?.message||error);return{status:'SHADOW_ERROR',core_unchanged:true}}
}

async function observeCoreAttempt({pool,row}){
  try{return await observeSafeResult({pool,result:safeResultFromCore(row),source:'core_attempts'})}
  catch(error){console.error('[LearningCompanion shadow] core observation failed:',error?.message||error);return{status:'SHADOW_ERROR',core_unchanged:true}}
}

module.exports={lessonVersion,safeResultFromWorkbook,safeResultFromCore,safeContext,observeSafeResult,observeWorkbookAttempt,observeCoreAttempt};
