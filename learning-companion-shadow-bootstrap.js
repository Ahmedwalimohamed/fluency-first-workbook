'use strict';

/**
 * Learning Companion shadow-mode bootstrap.
 * Observes existing attempt writes AFTER core has accepted them.
 * Never changes core grading, progress, lesson state, auth, or reports.
 * Any Companion failure is swallowed/logged so core behavior continues.
 */
const crypto = require('crypto');
const companion = require('./learning-companion-v1');

function stableId(parts) {
  return crypto.createHash('sha256').update(parts.map(v => String(v ?? '')).join('|')).digest('hex').slice(0,32);
}

function canonicalAttemptEvent(attempt, versions={}) {
  const timestamp = attempt.created_at || new Date().toISOString();
  return {
    event_id: attempt.event_id || `lc_${stableId([attempt.id, attempt.student_id, attempt.lesson_id, attempt.skill, timestamp])}`,
    event_type: 'ATTEMPT_RECORDED',
    learner_id: attempt.student_id,
    lesson_id: attempt.lesson_id,
    lesson_version: versions.lesson_version || 1,
    activity_id: attempt.skill || 'unknown',
    question_id: attempt.question_id || attempt.id || 'attempt',
    question_version: versions.question_version || 1,
    attempt_id: attempt.id,
    response: attempt.response ?? null,
    timestamp
  };
}

function snapshotFromAcceptedAttempt(attempt, prior={}) {
  return {
    target: attempt.target || attempt.skill || null,
    correct: typeof attempt.correct === 'boolean' ? attempt.correct : Number(attempt.score) >= 80,
    attempt_number: prior.attempt_number || 1,
    previous_errors: prior.previous_errors || 0,
    mastery_state: prior.mastery_state || 'UNKNOWN',
    previous_interventions: prior.previous_interventions || [],
    answer_key_version: prior.answer_key_version || 1,
    intervention_counts: prior.intervention_counts || {},
    assessment_item: prior.assessment_item === true,
    versions: prior.versions || {}
  };
}

async function ensureShadowSchema(pool) {
  // Additive tables only. No ALTER/DROP of EnglishGate core tables.
  await pool.query(`
    create table if not exists learning_companion_events (
      event_id text primary key,
      learner_id text not null,
      lesson_id text,
      event_type text not null,
      payload jsonb not null,
      observed_at timestamptz not null default now()
    );
    create index if not exists learning_companion_events_learner_idx
      on learning_companion_events(learner_id, observed_at desc);
    create table if not exists learning_companion_shadow_decisions (
      id bigserial primary key,
      event_id text not null unique references learning_companion_events(event_id) on delete cascade,
      learner_id text not null,
      lesson_id text,
      action text not null,
      diagnosis jsonb not null default '{}'::jsonb,
      policy jsonb not null default '{}'::jsonb,
      record jsonb not null,
      created_at timestamptz not null default now()
    );
  `);
}

async function persistEventOnce(pool, event) {
  const result = await pool.query(
    `insert into learning_companion_events(event_id,learner_id,lesson_id,event_type,payload)
     values($1,$2,$3,$4,$5::jsonb)
     on conflict(event_id) do nothing returning event_id`,
    [event.event_id,event.learner_id,event.lesson_id,event.event_type,JSON.stringify(event)]
  );
  return result.rowCount === 1;
}

async function observeAcceptedAttempt({pool, attempt, priorState={}, diagnose, decide}) {
  if (!companion.enabled()) return {status:'DISABLED',core_unchanged:true};
  try {
    const event = canonicalAttemptEvent(attempt, priorState.versions || {});
    const inserted = await persistEventOnce(pool,event);
    if (!inserted) return {status:'DUPLICATE_IGNORED',event_id:event.event_id,core_unchanged:true};

    const coreState = snapshotFromAcceptedAttempt(attempt,priorState);
    const safeDiagnose = diagnose || (async snapshot => ({
      misconception: snapshot.correct ? null : 'UNCLASSIFIED_ERROR',
      confidence: 0,
      evidence: snapshot.correct ? [] : ['accepted_core_attempt_failed']
    }));
    const safeDecide = decide || (async ({snapshot}) => companion.deterministicFallback(snapshot));

    const result = await companion.observe({
      event,
      coreState,
      diagnose:safeDiagnose,
      decide:safeDecide,
      persistCompanionEvent: async record => {
        await pool.query(
          `insert into learning_companion_shadow_decisions(event_id,learner_id,lesson_id,action,diagnosis,policy,record)
           values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb)
           on conflict(event_id) do nothing`,
          [event.event_id,event.learner_id,event.lesson_id,record.policy?.action || 'NO_ACTION',JSON.stringify(record.diagnosis||{}),JSON.stringify(record.policy||{}),JSON.stringify(record)]
        );
      }
    });
    return {...result,event_id:event.event_id,shadow:true,core_unchanged:true};
  } catch (error) {
    console.error('[LearningCompanion shadow] observation failed:', error?.message || error);
    return {status:'SHADOW_ERROR',core_unchanged:true};
  }
}

module.exports={stableId,canonicalAttemptEvent,snapshotFromAcceptedAttempt,ensureShadowSchema,persistEventOnce,observeAcceptedAttempt};
