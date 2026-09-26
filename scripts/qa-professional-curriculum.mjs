import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2] || 'professional-curriculum/abdijalil-week1-gold.json';
const p = path.resolve(process.cwd(), file);
const data = JSON.parse(fs.readFileSync(p, 'utf8'));
const errors=[];
const check=(ok,msg)=>{if(!ok)errors.push(msg)};

check(data.schema_version==='professional-curriculum-v1','schema_version must be professional-curriculum-v1');
check(data.week===1,'gold contract must identify week 1');
check(typeof data.weekly_can_do==='string'&&data.weekly_can_do.length>20,'weekly Can-Do missing');
check(data.curriculum_constraints?.sessions===5,'exactly five sessions required');
check(data.curriculum_constraints?.minutes_per_session===60,'60-minute session contract required');
check(data.curriculum_constraints?.feedback_timing==='DELAYED_UNTIL_PERFORMANCE_ENDS','speaking feedback must be delayed until performance ends');
const orientation=data.curriculum_constraints?.orientation||{};
check(Math.abs((orientation.speaking_fluency||0)-0.70)<0.001,'70% speaking/fluency orientation missing');
check(Math.abs((orientation.professional_writing||0)-0.30)<0.001,'30% professional-writing orientation missing');
check(Array.isArray(data.traceability?.reported_needs)&&data.traceability.reported_needs.length>0,'reported needs evidence missing');
check(data.traceability?.target_competency==='spontaneous_response_automaticity','Week 1 target competency mismatch');
check(Array.isArray(data.traceability?.decision_labels)&&['PASS','PARTIAL','FAIL','INSUFFICIENT_EVIDENCE'].every(x=>data.traceability.decision_labels.includes(x)),'transfer decision labels incomplete');

const sessions=data.sessions||[];
check(sessions.length===5,'five session objects required');
const ids=new Set();
for(const [i,s] of sessions.entries()){
  const label=`session ${i+1}`;
  check(s.id&&!ids.has(s.id),`${label}: stable unique id required`); ids.add(s.id);
  for(const k of ['day','title','can_do','foundation','b2_lift','b2_performance','pronunciation_focus','mediation_move','evidence']) check(typeof s[k]==='string'&&s[k].trim(),`${label}: ${k} missing`);
  check(Array.isArray(s.communicative_functions)&&s.communicative_functions.length>=3,`${label}: >=3 communicative functions required`);
  check(Array.isArray(s.discourse_targets)&&s.discourse_targets.length>=3,`${label}: >=3 discourse targets required`);
  check(Array.isArray(s.sequence)&&s.sequence.length>=5,`${label}: instructional sequence too thin`);
  if(i<4){
    check(Array.isArray(s.core_vocabulary)&&s.core_vocabulary.length>=6,`${label}: >=6 core vocabulary items required`);
    check(Array.isArray(s.chunks)&&s.chunks.length>=4,`${label}: >=4 chunks required`);
    check(Array.isArray(s.interaction_expressions)&&s.interaction_expressions.length>=3,`${label}: >=3 interaction expressions required`);
    check(s.sequence.some(x=>/delayed (feedback|correction)/i.test(x)),`${label}: delayed feedback/correction step missing`);
    check(s.sequence.some(x=>/retry|second attempt/i.test(x)),`${label}: retry after feedback missing`);
  }
}
const friday=sessions[4]||{};
check(friday.day==='Friday','session 5 must be Friday transfer');
check(/unseen/i.test(friday.title||'')||/unseen/i.test(friday.sequence?.join(' ')||''),'Friday must be unseen transfer');
check(friday.foundation==='No pre-teaching of the transfer scenario.','Friday transfer must prohibit pre-teaching');
check(Array.isArray(friday.scoring_dimensions)&&friday.scoring_dimensions.length>=5,'Friday scoring dimensions incomplete');
for(const d of ['PASS','PARTIAL','FAIL','INSUFFICIENT_EVIDENCE']) check(typeof friday.decision_rule?.[d]==='string',`Friday ${d} rule missing`);
check(Array.isArray(data.qa_blockers)&&data.qa_blockers.length>=5,'blocking QA policy missing');

if(errors.length){
  console.error(`PROFESSIONAL CURRICULUM QA: BLOCKED (${errors.length})`);
  for(const e of errors)console.error(` - ${e}`);
  process.exit(1);
}
console.log('PROFESSIONAL CURRICULUM QA: PASS');
console.log(`Contract: ${file}`);
console.log(`Sessions: ${sessions.length}/5`);
console.log(`Traceability: ${data.traceability.evidence_source.join(', ')} -> ${data.traceability.target_competency} -> ${data.traceability.verification}`);
console.log('Publication gate: structurally eligible; semantic/content QA still required before learner release.');
