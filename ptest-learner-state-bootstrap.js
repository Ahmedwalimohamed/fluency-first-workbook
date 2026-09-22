'use strict';

const express=require('express');
const crypto=require('crypto');
const jwt=require('jsonwebtoken');
const {Pool}=require('pg');

const pool=new Pool({connectionString:process.env.DATABASE_URL});
const HANDOFF_SECRET=String(process.env.PTEST_HANDOFF_SECRET||'');
const STATE_VERSION='englishgate-learner-state-v0';

const nativePost=express.application.post;
const nativeGet=express.application.get;
const installed=new WeakSet();

function safeEqual(a,b){
  const aa=Buffer.from(String(a||'')),bb=Buffer.from(String(b||''));
  return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb);
}
function tokenFrom(req){
  const bearer=String(req.headers.authorization||'').match(/^Bearer\s+(.+)$/i)?.[1]||'';
  return bearer||String(req.headers['x-ptest-handoff-secret']||'');
}
function authorized(req){return Boolean(HANDOFF_SECRET)&&safeEqual(tokenFrom(req),HANDOFF_SECRET)}
function phoneDigits(v){return String(v||'').replace(/\D/g,'');}
function validCefr(v){return ['A1','A2','B1','B2','C1','C2'].includes(String(v||''));}
function studentSession(req){
  try{
    const user=jwt.verify(req.cookies?.ff_session||'',process.env.JWT_SECRET);
    return user?.role==='student'?user:null;
  }catch{return null}
}

async function ensureSchema(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ptest_learner_states(
      id BIGSERIAL PRIMARY KEY,
      ptest_lead_id BIGINT NOT NULL,
      state_version TEXT NOT NULL,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      learner_profile_id BIGINT,
      learner_name TEXT,
      whatsapp_number TEXT,
      acquisition_source TEXT,
      overall_cefr TEXT,
      overall_confidence_state TEXT,
      strongest_skill TEXT,
      priority_skill TEXT,
      evidence_count INTEGER NOT NULL DEFAULT 0,
      skill_states JSONB NOT NULL DEFAULT '[]'::jsonb,
      concept_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
      assessment_history JSONB NOT NULL DEFAULT '[]'::jsonb,
      diagnostic JSONB NOT NULL DEFAULT '{}'::jsonb,
      source_payload JSONB NOT NULL,
      payload_hash TEXT NOT NULL,
      received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(ptest_lead_id,state_version)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS ptest_learner_states_user_idx ON ptest_learner_states(user_id,updated_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS ptest_learner_states_phone_idx ON ptest_learner_states((regexp_replace(COALESCE(whatsapp_number,''),'\\D','','g')))`);

  // If the learner state arrives before the EnglishGate student account, attach it when a matching WhatsApp account appears.
  await pool.query(`
    CREATE OR REPLACE FUNCTION englishgate_link_ptest_state_to_user()
    RETURNS trigger AS $$
    DECLARE digits TEXT;
    BEGIN
      digits:=regexp_replace(COALESCE(NEW.whatsapp_number,''),'\\D','','g');
      IF digits<>'' THEN
        UPDATE ptest_learner_states
        SET user_id=NEW.id,updated_at=now()
        WHERE user_id IS NULL
          AND regexp_replace(COALESCE(whatsapp_number,''),'\\D','','g')=digits;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await pool.query(`DROP TRIGGER IF EXISTS englishgate_link_ptest_state_user_trg ON users`);
  await pool.query(`
    CREATE TRIGGER englishgate_link_ptest_state_user_trg
    AFTER INSERT OR UPDATE OF whatsapp_number ON users
    FOR EACH ROW EXECUTE FUNCTION englishgate_link_ptest_state_to_user()
  `);
}

function validatePayload(body){
  if(!body||typeof body!=='object')return'Invalid learner-state payload.';
  if(body.schemaVersion!==STATE_VERSION)return'Unsupported learner-state version.';
  const id=Number(body?.identity?.ptestLeadId);
  if(!Number.isInteger(id)||id<=0)return'Missing PTest lead identity.';
  const state=body.initialLearnerState;
  if(!state||typeof state!=='object')return'Missing initial learner state.';
  if(state.overallCefr!=null&&!validCefr(state.overallCefr))return'Invalid overall CEFR.';
  if(!Array.isArray(body.skillStates))return'Missing skill states.';
  if(!Array.isArray(body.conceptEvidence))return'Missing concept evidence.';
  if(!Array.isArray(body.assessmentHistory))return'Missing assessment history.';
  return'';
}
function payloadHash(body){return crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex')}

async function findStudentByPhone(phone){
  const digits=phoneDigits(phone);
  if(!digits)return null;
  return (await pool.query(`
    SELECT id,name,username FROM users
    WHERE role='student'
      AND regexp_replace(COALESCE(whatsapp_number,''),'\\D','','g')=$1
    ORDER BY created_at DESC
    LIMIT 1
  `,[digits])).rows[0]||null;
}

async function saveState(body){
  await ensureSchema();
  const identity=body.identity||{},state=body.initialLearnerState||{};
  const student=await findStudentByPhone(identity.phone);
  const hash=payloadHash(body);
  const q=await pool.query(`
    INSERT INTO ptest_learner_states(
      ptest_lead_id,state_version,user_id,learner_profile_id,learner_name,whatsapp_number,acquisition_source,
      overall_cefr,overall_confidence_state,strongest_skill,priority_skill,evidence_count,
      skill_states,concept_evidence,assessment_history,diagnostic,source_payload,payload_hash
    )
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15::jsonb,$16::jsonb,$17::jsonb,$18)
    ON CONFLICT(ptest_lead_id,state_version) DO UPDATE SET
      user_id=COALESCE(EXCLUDED.user_id,ptest_learner_states.user_id),
      learner_profile_id=EXCLUDED.learner_profile_id,
      learner_name=EXCLUDED.learner_name,
      whatsapp_number=EXCLUDED.whatsapp_number,
      acquisition_source=EXCLUDED.acquisition_source,
      overall_cefr=EXCLUDED.overall_cefr,
      overall_confidence_state=EXCLUDED.overall_confidence_state,
      strongest_skill=EXCLUDED.strongest_skill,
      priority_skill=EXCLUDED.priority_skill,
      evidence_count=EXCLUDED.evidence_count,
      skill_states=EXCLUDED.skill_states,
      concept_evidence=EXCLUDED.concept_evidence,
      assessment_history=EXCLUDED.assessment_history,
      diagnostic=EXCLUDED.diagnostic,
      source_payload=EXCLUDED.source_payload,
      payload_hash=EXCLUDED.payload_hash,
      updated_at=now()
    RETURNING id,user_id,received_at,updated_at
  `,[
    Number(identity.ptestLeadId),body.schemaVersion,student?.id||null,
    identity.learnerProfileId==null?null:Number(identity.learnerProfileId),
    identity.name||null,identity.phone||null,identity.acquisitionSource||null,
    state.overallCefr||null,state.overallConfidenceState||'INSUFFICIENT_EVIDENCE',
    state.strongestSkill||null,state.prioritySkill||null,Number(state.evidenceCount||0),
    JSON.stringify(body.skillStates||[]),JSON.stringify(body.conceptEvidence||[]),
    JSON.stringify(body.assessmentHistory||[]),JSON.stringify(body.diagnostic||{}),
    JSON.stringify(body),hash
  ]);
  return{row:q.rows[0],student};
}

function install(app){
  if(installed.has(app))return;
  installed.add(app);

  nativePost.call(app,'/api/integrations/ptest/learner-state',async(req,res)=>{
    if(!HANDOFF_SECRET)return res.status(503).json({error:'PTest handoff receiver is not configured.'});
    if(!authorized(req))return res.status(401).json({error:'Unauthorized.'});
    const error=validatePayload(req.body);
    if(error)return res.status(400).json({error});
    try{
      const saved=await saveState(req.body);
      res.set('Cache-Control','no-store');
      return res.status(200).json({
        ok:true,
        stateVersion:STATE_VERSION,
        ptestLeadId:Number(req.body.identity.ptestLeadId),
        userLinked:Boolean(saved.row.user_id),
        englishGateUserId:saved.row.user_id||null
      });
    }catch(e){
      console.error('PTest learner-state receive error:',e.message);
      return res.status(500).json({error:'Learner state could not be stored.'});
    }
  });

  nativeGet.call(app,'/api/student/initial-learner-state',async(req,res)=>{
    const student=studentSession(req);
    if(!student)return res.status(401).json({error:'Student access required.'});
    try{
      await ensureSchema();
      const row=(await pool.query(`
        SELECT state_version,overall_cefr,overall_confidence_state,strongest_skill,priority_skill,evidence_count,
               skill_states,concept_evidence,assessment_history,diagnostic,updated_at
        FROM ptest_learner_states
        WHERE user_id=$1
        ORDER BY updated_at DESC,id DESC LIMIT 1
      `,[student.id])).rows[0];
      res.set('Cache-Control','no-store');
      return res.json({ok:true,initialState:row||null});
    }catch(e){
      return res.status(500).json({error:'Initial learner state could not be loaded.'});
    }
  });

  nativeGet.call(app,'/api/integrations/ptest/health',async(req,res)=>{
    try{
      await ensureSchema();
      const count=Number((await pool.query('SELECT COUNT(*)::int c FROM ptest_learner_states')).rows[0]?.c||0);
      return res.json({ok:true,stateVersion:STATE_VERSION,receiverConfigured:Boolean(HANDOFF_SECRET),statesReceived:count});
    }catch(e){return res.status(503).json({ok:false,stateVersion:STATE_VERSION});}
  });
}

express.application.post=function ptestLearnerStatePost(route,...handlers){
  install(this);
  return nativePost.call(this,route,...handlers);
};
express.application.get=function ptestLearnerStateGet(route,...handlers){
  install(this);
  return nativeGet.call(this,route,...handlers);
};

module.exports={STATE_VERSION,ensureSchema};
