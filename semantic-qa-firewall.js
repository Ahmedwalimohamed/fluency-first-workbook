'use strict';

const crypto=require('crypto');
const jwt=require('jsonwebtoken');
const fs=require('fs');
const path=require('path');
const {Pool}=require('pg');
const b2AuditPool=new Pool({connectionString:process.env.DATABASE_URL});
const TYPE_SAFE_URL=process.env.TYPESAFE_API_URL||'https://api.typesafe.ai/v1/systemone';
const TYPE_SAFE_MODEL=process.env.TYPESAFE_MODEL||'jev-latest';
const TOKEN_TTL_SECONDS=Math.max(120,Math.min(1800,Number(process.env.SEMANTIC_QA_TOKEN_TTL_SECONDS)||600));
const installed=new WeakSet();

const CRITERIA={
  pass:'The requirement is clearly met by the supplied lesson content.',
  fail:'There is a concrete violation of the requirement in the supplied lesson content.',
  not_applicable:'The requirement genuinely does not apply because the relevant content type is absent.'
};

const CHECKS=[
  // CEFR fit
  ['cefr_lexical_load','CEFR','Vocabulary load fits the target CEFR level in `context.targetLevel`; required words are not materially above level without support.',true],
  ['cefr_grammar_load','CEFR','Grammar forms and sentence structures fit the target CEFR level in `context.targetLevel`.',true],
  ['cefr_reading_complexity','CEFR','Reading text complexity, density, sentence length, and inference demand fit `context.targetLevel`.'],
  ['cefr_listening_complexity','CEFR','Listening language, speed implied by text, turn length, and processing demand fit `context.targetLevel`.'],
  ['cefr_instruction_load','CEFR','Learner-facing instructions are linguistically simpler than or appropriate for the target CEFR level.'],
  ['cefr_cognitive_demand','CEFR','The cognitive demand of tasks is appropriate for the target CEFR level rather than testing reasoning unrelated to language ability.'],
  ['cefr_output_demand','CEFR','Required speaking/writing output length and complexity are appropriate for the target CEFR level.'],
  ['cefr_independence','CEFR','The amount of scaffolding and learner independence is appropriate for the target CEFR level.'],

  // Objective and answer alignment
  ['objective_task_alignment','Alignment','The lesson activities materially practice or assess the stated lesson outcome/can-do objective.',true],
  ['question_answer_alignment','Alignment','Every selected-response question has an answer that directly answers the actual question stem.',true],
  ['answer_key_correctness','Alignment','Every explicit answer key or accepted answer is correct given the lesson content and task.',true],
  ['reading_question_grounding','Alignment','Reading-comprehension questions are answerable from the reading passage and do not rely on missing outside information.',true],
  ['listening_question_grounding','Alignment','Listening-comprehension questions are answerable from the listening script/audio content and do not rely on missing outside information.',true],
  ['grammar_target_alignment','Alignment','Grammar practice actually tests the grammar point taught or implied by the lesson objective.'],
  ['feedback_answer_alignment','Alignment','Any learner feedback, explanations, examples, or corrections agree with the accepted answer and teaching point.',true],

  // Ambiguity and assessment integrity
  ['single_defensible_answer','Assessment','For questions that accept one correct answer, only one option is defensibly correct.',true],
  ['sufficient_evidence','Assessment','Each question provides enough information for a learner to answer without guessing because essential context is missing.',true],
  ['stem_unambiguous','Assessment','Question stems are clear and have one reasonable interpretation in context.',true],
  ['reference_clarity','Assessment','Pronouns, references, labels, and deictic words such as this/that/they clearly refer to identifiable content.'],
  ['open_task_criteria','Assessment','Open speaking/writing tasks make the expected communicative outcome sufficiently clear to a learner.'],
  ['no_hidden_assumptions','Assessment','Questions do not depend on hidden cultural, factual, or teacher-only assumptions not supplied in the lesson.'],
  ['no_trick_wording','Assessment','Questions assess the intended language skill rather than confusing learners with avoidable trick wording.'],

  // Distractor quality
  ['distractors_plausible','Distractors','Multiple-choice distractors are plausible enough to test understanding rather than being obviously absurd.'],
  ['distractors_incorrect','Distractors','Distractors are genuinely incorrect under a reasonable reading of the question.',true],
  ['distractors_distinct','Distractors','Answer choices are meaningfully distinct rather than duplicates or near-duplicates.'],
  ['distractors_parallel','Distractors','Answer choices use reasonably parallel grammatical form and level so form alone does not reveal the answer.'],
  ['no_answer_leakage','Distractors','The correct answer is not leaked by wording, length, grammar agreement, formatting, or repetition from the stem/passage.'],

  // Reading/listening coherence
  ['reading_internal_coherence','Coherence','Reading text is internally coherent, logically ordered, and free from contradictions or broken references.',true],
  ['listening_internal_coherence','Coherence','Listening dialogue/script is internally coherent and sounds like a possible spoken interaction.',true],
  ['speaker_consistency','Coherence','Speaker identity, role, facts, and point of view remain consistent across listening/dialogue turns.'],
  ['scenario_continuity','Coherence','Scenario details remain consistent across instructions, texts, questions, examples, and follow-up tasks.'],
  ['chronology_consistency','Coherence','Time references and event order are internally consistent.'],
  ['cross_component_consistency','Coherence','Reading, listening, vocabulary, grammar, and writing components do not contradict one another on shared facts.',true],
  ['reading_listening_separation','Coherence','Reading and listening questions refer to the correct source text and are not accidentally mismatched or swapped.',true],

  // Vocabulary integrity
  ['vocab_definition_accuracy','Vocabulary','Each vocabulary definition accurately matches the target word or expression in the lesson context.',true],
  ['vocab_definition_non_circular','Vocabulary','Vocabulary definitions do not define a word using the same word, a trivial morphological variant, or an equally opaque synonym.'],
  ['vocab_definition_accessible','Vocabulary','Vocabulary definitions are easier to understand than the target item and suitable for the target CEFR level.'],
  ['vocab_example_alignment','Vocabulary','Vocabulary example sentences use the target item with the intended meaning and natural grammar.',true],
  ['vocab_task_alignment','Vocabulary','Vocabulary questions and answer choices test the same meaning or use that the lesson teaches.',true],

  // Duplication / quality
  ['no_duplicate_instructions','Quality','The lesson does not repeat the same learner-facing instruction unnecessarily across adjacent items or sections.'],
  ['no_duplicate_questions','Quality','The lesson does not contain duplicate or near-duplicate questions that test the same thing with trivial wording changes.'],
  ['no_recycled_examples','Quality','Examples are not repeatedly recycled with only superficial noun/name substitutions.'],
  ['no_placeholders','Quality','There is no placeholder, TODO, developer note, template residue, lorem ipsum, or unfinished learner-facing content.',true],
  ['no_broken_activity','Quality','No activity is structurally broken, nonsensical, incomplete, or impossible to complete as written.',true],
  ['natural_language','Quality','Learner-facing English is natural, idiomatic, and appropriate for the stated real-life context.'],
  ['real_world_plausibility','Quality','Scenarios, dialogues, examples, and tasks are plausible for real adult English use rather than artificial worksheet language.'],

  // Progression
  ['scaffold_progression','Progression','Within the lesson, support generally moves from easier recognition/controlled work toward more independent use.'],
  ['practice_to_production','Progression','The lesson gives learners enough supported practice before asking for independent speaking or writing.'],
  ['skill_integration','Progression','Where multiple skills are used, they connect around the same communicative context rather than feeling randomly assembled.'],
  ['correction_alignment','Progression','Correction or improvement tasks address actual target language or plausible learner errors rather than unrelated remediation.']
].map(([id,category,instructions,critical=false])=>({id,category,instructions,critical}));

const FIREWALL_VERSION='jev-semantic-firewall-v2';
const REVIEW_ONLY_CHECKS=new Set([
  'distractors_plausible',
  'distractors_parallel',
  'no_answer_leakage',
  'no_duplicate_instructions',
  'no_duplicate_questions',
  'no_recycled_examples',
  'natural_language',
  'real_world_plausibility',
  'practice_to_production',
  'skill_integration',
  'correction_alignment'
]);

// These checks remain capable of blocking, but only when Jev is sufficiently certain.
// Thresholds are intentionally stricter for broad or subjective judgments.
const FAIL_THRESHOLDS={
  cefr_lexical_load:0.65,
  cefr_grammar_load:0.65,
  cefr_reading_complexity:0.70,
  cefr_listening_complexity:0.70,
  cefr_instruction_load:0.70,
  cefr_cognitive_demand:0.70,
  cefr_output_demand:0.70,
  cefr_independence:0.70,

  objective_task_alignment:0.55,
  question_answer_alignment:0.55,
  answer_key_correctness:0.55,
  reading_question_grounding:0.60,
  listening_question_grounding:0.60,
  grammar_target_alignment:0.65,
  feedback_answer_alignment:0.60,

  single_defensible_answer:0.60,
  sufficient_evidence:0.55,
  stem_unambiguous:0.60,
  reference_clarity:0.65,
  open_task_criteria:0.65,
  no_hidden_assumptions:0.70,
  no_trick_wording:0.70,

  distractors_incorrect:0.60,
  distractors_distinct:0.70,

  reading_internal_coherence:0.60,
  listening_internal_coherence:0.60,
  speaker_consistency:0.65,
  scenario_continuity:0.70,
  chronology_consistency:0.70,
  cross_component_consistency:0.60,
  reading_listening_separation:0.60,

  vocab_definition_accuracy:0.55,
  vocab_definition_non_circular:0.70,
  vocab_definition_accessible:0.70,
  vocab_example_alignment:0.60,
  vocab_task_alignment:0.55,

  no_placeholders:0.60,
  no_broken_activity:0.55
};

const CORROBORATION_CLUSTERS={
  answer_integrity:['question_answer_alignment','answer_key_correctness','feedback_answer_alignment','single_defensible_answer','distractors_incorrect'],
  source_grounding:['reading_question_grounding','listening_question_grounding','sufficient_evidence','cross_component_consistency','reading_listening_separation'],
  vocabulary_integrity:['vocab_definition_accuracy','vocab_example_alignment','vocab_task_alignment'],
  structural_integrity:['no_placeholders','no_broken_activity'],
  cefr_core:['cefr_lexical_load','cefr_grammar_load']
};
const CORROBORATION_MIN_EVIDENCE=0.35;
const LOW_CONFIDENCE_REVIEW_THRESHOLD=0.25;

function sha(value){
  return crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
}
function adminSession(req){
  try{
    const token=req.cookies?.ff_session||'';
    const user=jwt.verify(token,process.env.JWT_SECRET);
    return user?.role==='admin'?user:null;
  }catch{return null}
}
function questions(){
  const out={};
  for(const check of CHECKS){
    out[check.id]={
      type:'choice',
      instructions:check.instructions,
      criteria:CRITERIA
    };
  }
  return out;
}
function selectedProbability(answer,choice){
  const value=Number(answer?.probabilities?.[choice]);
  return Number.isFinite(value)&&value>=0&&value<=1?value:null;
}
function evidenceScore(answer,choice){
  const confidence=Number(answer?.confidence);
  const probability=selectedProbability(answer,choice);
  const hasConfidence=Number.isFinite(confidence)&&confidence>=0&&confidence<=1;
  if(probability!=null&&hasConfidence)return Math.min(probability,confidence);
  if(probability!=null)return probability;
  if(hasConfidence)return confidence;
  return null;
}
function thresholdFor(check){
  if(Number.isFinite(FAIL_THRESHOLDS[check.id]))return FAIL_THRESHOLDS[check.id];
  return check.critical?0.60:0.70;
}
function normalizeAnswer(check,answer){
  const choice=String(answer?.choice||'').toLowerCase();
  const confidence=Number(answer?.confidence);
  const probabilities=answer?.probabilities&&typeof answer.probabilities==='object'?answer.probabilities:{};
  const selected=selectedProbability(answer,choice);
  const evidence=evidenceScore(answer,choice);
  const base={
    id:check.id,
    category:check.category,
    critical:check.critical,
    requirement:check.instructions,
    choice,
    rawChoice:choice,
    confidence:Number.isFinite(confidence)?confidence:null,
    selectedProbability:selected,
    evidence,
    probabilities,
    threshold:thresholdFor(check),
    blocking:false,
    review:false,
    policy:REVIEW_ONLY_CHECKS.has(check.id)?'review-only':'threshold'
  };

  if(!['pass','fail','not_applicable'].includes(choice)||evidence==null){
    return {...base,status:'BLOCKED',blocking:true,reason:'Jev did not return a complete calibrated decision for this check.'};
  }

  if(choice==='pass'){
    if(evidence<LOW_CONFIDENCE_REVIEW_THRESHOLD){
      return {...base,status:'REVIEW',review:true,reason:'Jev leaned pass, but confidence is low enough to keep this as a review note.'};
    }
    return {...base,status:'PASS',reason:'Requirement passed.'};
  }

  if(choice==='not_applicable'){
    if(evidence<LOW_CONFIDENCE_REVIEW_THRESHOLD){
      return {...base,status:'REVIEW',review:true,reason:'Jev marked this not applicable with low confidence; keep it as a review note.'};
    }
    return {...base,status:'NOT_APPLICABLE',reason:'Check is not applicable to this lesson.'};
  }

  if(REVIEW_ONLY_CHECKS.has(check.id)){
    return {...base,status:'REVIEW',review:true,reason:'Jev detected a possible issue, but Calibration v2 treats this check as advisory unless stronger integrity checks corroborate it.'};
  }

  if(evidence>=thresholdFor(check)){
    return {...base,status:'FAIL',blocking:true,reason:'Jev found a sufficiently confident semantic failure.'};
  }

  return {...base,status:'REVIEW',review:true,reason:'Jev leaned fail, but evidence is below this check’s publication-blocking threshold.'};
}
function applyCorroboration(checks){
  const byId=new Map(checks.map(x=>[x.id,x]));
  for(const [cluster,ids] of Object.entries(CORROBORATION_CLUSTERS)){
    const candidates=ids.map(id=>byId.get(id)).filter(x=>
      x&&!x.blocking&&!REVIEW_ONLY_CHECKS.has(x.id)&&x.rawChoice==='fail'&&Number(x.evidence)>=CORROBORATION_MIN_EVIDENCE
    );
    if(candidates.length<2)continue;
    for(const item of candidates){
      item.status='CORROBORATED_FAIL';
      item.blocking=true;
      item.review=false;
      item.corroboratedBy=cluster;
      item.reason='Multiple related Jev checks independently indicate the same integrity problem.';
    }
  }
  return checks;
}
function structuralChecks(payload){
  const issues=[];
  if(!payload||typeof payload!=='object')issues.push({id:'payload_missing',category:'Structure',critical:true,status:'FAIL',requirement:'A candidate lesson must be supplied.',reason:'Candidate lesson payload is missing.'});
  const lesson=payload?.lesson;
  if(!lesson||typeof lesson!=='object'||Array.isArray(lesson))issues.push({id:'lesson_missing',category:'Structure',critical:true,status:'FAIL',requirement:'Candidate lesson must be a structured lesson object.',reason:'Candidate lesson is missing or invalid.'});
  const level=String(payload?.context?.targetLevel||'').trim();
  if(!level)issues.push({id:'level_missing',category:'Structure',critical:true,status:'FAIL',requirement:'Target CEFR level must be supplied.',reason:'Target CEFR level is missing.'});
  const bytes=Buffer.byteLength(JSON.stringify(lesson||{}),'utf8');
  if(bytes>700000)issues.push({id:'lesson_too_large',category:'Structure',critical:true,status:'FAIL',requirement:'Candidate lesson must fit within the QA payload limit.',reason:'Candidate lesson is too large to audit safely.'});
  return issues;
}
async function callJev(state){
  const apiKey=String(process.env.TYPESAFE_API_KEY||'').trim();
  if(!apiKey)throw Object.assign(new Error('TYPESAFE_API_KEY is not configured.'),{code:'JEV_NOT_CONFIGURED'});
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),Math.max(5000,Math.min(60000,Number(process.env.TYPESAFE_TIMEOUT_MS)||30000)));
  try{
    let last;
    for(let attempt=0;attempt<3;attempt++){
      try{
        const r=await fetch(TYPE_SAFE_URL,{
          method:'POST',
          headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
          body:JSON.stringify({state,model:TYPE_SAFE_MODEL,questions:questions()}),
          signal:controller.signal
        });
        if(r.ok)return await r.json();
        const detail=(await r.text()).slice(0,500);
        last=new Error(`Jev API ${r.status}: ${detail}`);
        if(![429,529].includes(r.status))throw last;
        if(attempt<2)await new Promise(resolve=>setTimeout(resolve,300*(2**attempt)));
      }catch(e){
        last=e;
        if(e?.name==='AbortError')throw new Error('Jev QA timed out.');
        if(attempt>=2)throw e;
      }
    }
    throw last||new Error('Jev QA failed.');
  }finally{clearTimeout(timeout)}
}
async function runSemanticQa(payload){
  const structural=structuralChecks(payload);
  if(structural.some(x=>x.status==='FAIL'))return {
    pass:false,
    decision:'BLOCK',
    model:null,
    version:FIREWALL_VERSION,
    totalChecks:CHECKS.length+structural.length,
    passed:0,
    notApplicable:0,
    review:0,
    blocked:structural.length,
    criticalFailures:structural.filter(x=>x.critical).length,
    checks:structural.map(x=>({...x,blocking:true,review:false})),
    usage:null
  };
  const state={
    context:{
      targetLevel:String(payload.context.targetLevel),
      courseId:String(payload.context.courseId||''),
      lessonNumber:Number(payload.context.lessonNumber)||null,
      lessonTitle:String(payload.context.lessonTitle||payload.lesson?.title||''),
      learningOutcome:String(payload.context.learningOutcome||payload.lesson?.outcome||''),
      audience:String(payload.context.audience||'adult English learners'),
      editTarget:String(payload.context.targetPath||'lesson')
    },
    lesson:payload.lesson
  };
  const data=await callJev(state);
  const checks=applyCorroboration(CHECKS.map(check=>normalizeAnswer(check,data?.answers?.[check.id])));
  const blocked=checks.filter(x=>x.blocking);
  const review=checks.filter(x=>x.review&&!x.blocking);
  const passed=checks.filter(x=>x.status==='PASS').length;
  const notApplicable=checks.filter(x=>x.status==='NOT_APPLICABLE').length;
  const decision=blocked.length?'BLOCK':review.length?'PASS_WITH_REVIEW':'PASS';
  return {
    pass:blocked.length===0,
    decision,
    model:String(data?.model||TYPE_SAFE_MODEL),
    version:FIREWALL_VERSION,
    totalChecks:checks.length,
    passed,
    notApplicable,
    review:review.length,
    blocked:blocked.length,
    criticalFailures:blocked.filter(x=>x.critical).length,
    reviewCritical:review.filter(x=>x.critical).length,
    checks,
    usage:data?.usage||null
  };
}
function approvalToken({user,context,replacement,report}){
  const secret=process.env.JWT_SECRET;
  if(!secret)throw new Error('JWT_SECRET is not configured.');
  return jwt.sign({
    typ:'semantic-qa-approval',
    sub:String(user.id||'admin'),
    courseId:String(context.courseId||''),
    lessonNumber:Number(context.lessonNumber)||0,
    targetPath:String(context.targetPath||''),
    replacementHash:sha(replacement),
    qaVersion:report.version,
    qaModel:report.model,
    totalChecks:report.totalChecks,
    passed:report.passed,
    review:Number(report.review||0),
    decision:String(report.decision||'PASS')
  },secret,{expiresIn:TOKEN_TTL_SECONDS});
}
function verifyApproval(req){
  const raw=String(req.body?.semanticQaToken||'').trim();
  if(!raw)return {ok:false,error:'Semantic QA approval is required before publication.'};
  let decoded;
  try{decoded=jwt.verify(raw,process.env.JWT_SECRET)}catch{return {ok:false,error:'Semantic QA approval is invalid or expired. Run Jev QA again.'}}
  if(decoded?.typ!=='semantic-qa-approval')return {ok:false,error:'Semantic QA approval token is invalid.'};
  const fields=[
    ['courseId',String(req.body?.courseId||'')],
    ['lessonNumber',Number(req.body?.lessonNumber)||0],
    ['targetPath',String(req.body?.targetPath||'')]
  ];
  for(const [k,v] of fields){if(decoded[k]!==v)return {ok:false,error:'The lesson changed after QA. Run Jev QA again.'}}
  if(decoded.replacementHash!==sha(req.body?.replacement))return {ok:false,error:'The proposed content changed after QA. Run Jev QA again.'};
  return {ok:true,decoded};
}
function installSemanticQaFirewall(app,{nativePost,nativeGet}){
  if(installed.has(app))return;
  installed.add(app);

  if(nativeGet){
    nativeGet.call(app,'/api/semantic-qa/internal-b2-calibration',async(req,res)=>{
      const expected=String(process.env.SEMANTIC_B2_AUDIT_NONCE||'');
      const supplied=String(req.query?.nonce||'');
      const ok=expected&&supplied&&expected.length===supplied.length&&crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(supplied));
      if(!ok)return res.status(404).json({error:'Not found.'});
      res.set('Cache-Control','no-store');
      try{
        const raw=fs.readFileSync(path.join(__dirname,'public','speakup-b2-blueprint.js'),'utf8').trim();
        const prefix='window.SPEAKUP_B2_BLUEPRINT=';
        if(!raw.startsWith(prefix))throw new Error('B2 blueprint format not recognised.');
        const json=raw.slice(prefix.length).replace(/;\s*$/,'');
        const lessons=JSON.parse(json);
        const patchRows=await b2AuditPool.query("select id,course_id,lesson_number,component,replacement from content_patches where is_active=true and course_id='speakup-b2' order by created_at,id");
        function segs(p){return String(p||'').split('.').filter(Boolean)}
        function specificity(p){return p==='lesson'?0:Math.max(1,segs(p).length)}
        function setPath(root,target,value){
          if(target==='lesson'){
            const keys=['title','outcome','expressions','vocabulary','vocabularyItems','readingText','audioScript','questions','grammarItems','grammarFocus','grammarRule','writing','review','performance','foundation','b2Lift','pronunciation','mediation','functions','discourse','chunks','interactionExpressions'];
            for(const k of keys)delete root[k];
            for(const k of keys)if(value&&Object.prototype.hasOwnProperty.call(value,k))root[k]=JSON.parse(JSON.stringify(value[k]));
            return true;
          }
          const parts=segs(target);if(!parts.length||parts.some(x=>['__proto__','prototype','constructor'].includes(x)))return false;
          let cur=root;
          for(let i=0;i<parts.length-1;i++){
            const k=/^\d+$/.test(parts[i])?Number(parts[i]):parts[i];
            if(cur?.[k]==null)return false;
            cur=cur[k];
          }
          const last=/^\d+$/.test(parts.at(-1))?Number(parts.at(-1)):parts.at(-1);
          if(cur==null)return false;
          cur[last]=JSON.parse(JSON.stringify(value));
          return true;
        }
        const patches=(patchRows.rows||[]).slice().sort((a,b)=>specificity(a.component)-specificity(b.component)||Number(a.id||0)-Number(b.id||0));
        let appliedPatches=0;
        for(const p of patches){
          const lesson=lessons.find(x=>Number(x.number)===Number(p.lesson_number));
          if(lesson&&setPath(lesson,String(p.component||''),p.replacement))appliedPatches++;
        }
        const start=Math.max(0,Number(req.query?.start)||0);
        const limit=Math.max(1,Math.min(2,Number(req.query?.limit)||1));
        const selected=lessons.slice(start,start+limit);
        const results=[];
        for(const lesson of selected){
          const report=await runSemanticQa({
            context:{
              targetLevel:'B2',
              courseId:'speakup-b2',
              lessonNumber:Number(lesson.number)||0,
              targetPath:'lesson',
              lessonTitle:String(lesson.title||''),
              learningOutcome:String(lesson.outcome||''),
              audience:'adult English learners'
            },
            lesson
          });
          results.push({
            lessonNumber:Number(lesson.number)||0,
            lessonTitle:String(lesson.title||''),
            decision:String(report.decision||''),
            pass:Boolean(report.pass),
            passed:Number(report.passed||0),
            notApplicable:Number(report.notApplicable||0),
            review:Number(report.review||0),
            blocked:Number(report.blocked||0),
            criticalFailures:Number(report.criticalFailures||0),
            blockingChecks:(report.checks||[]).filter(x=>x.blocking).map(x=>({id:x.id,category:x.category,status:x.status,evidence:x.evidence,confidence:x.confidence,corroboratedBy:x.corroboratedBy||null})),
            reviewChecks:(report.checks||[]).filter(x=>x.review&&!x.blocking).map(x=>({id:x.id,category:x.category,status:x.status,evidence:x.evidence,confidence:x.confidence}))
          });
        }
        const nextStart=start+selected.length;
        res.json({
          ok:true,
          version:FIREWALL_VERSION,
          totalLessons:lessons.length,
          appliedPatches,
          start,
          completed:selected.length,
          nextStart:nextStart<lessons.length?nextStart:null,
          results
        });
      }catch(e){
        console.error('B2 calibration audit failed',e.message);
        res.status(500).json({error:'B2 calibration audit failed.',detail:String(e.message||e).slice(0,400)});
      }
    });
  }

  nativePost.call(app,'/api/semantic-qa/lesson',async(req,res)=>{
    const user=adminSession(req);
    if(!user)return res.status(403).json({error:'Admin access required.'});
    try{
      const body=req.body||{};
      const context={
        courseId:String(body.courseId||''),
        lessonNumber:Number(body.lessonNumber)||0,
        targetPath:String(body.targetPath||'lesson'),
        targetLevel:String(body.level||body.targetLevel||'').trim(),
        lessonTitle:String(body.lessonTitle||body.lesson?.title||''),
        learningOutcome:String(body.learningOutcome||body.lesson?.outcome||''),
        audience:String(body.audience||'adult English learners')
      };
      const report=await runSemanticQa({context,lesson:body.lesson});
      res.set('Cache-Control','no-store');
      if(!report.pass){
        return res.status(422).json({
          ok:false,
          error:`Semantic QA blocked publication: ${report.blocked} calibrated blocker${report.blocked===1?'':'s'} remain${report.blocked===1?'s':''}${report.review?` and ${report.review} review note${report.review===1?'':'s'}`:''}.`,
          report
        });
      }
      const token=approvalToken({user,context,replacement:body.replacement,report});
      res.json({
        ok:true,
        report,
        semanticQaToken:token,
        expiresInSeconds:TOKEN_TTL_SECONDS,
        fingerprint:sha({courseId:context.courseId,lessonNumber:context.lessonNumber,targetPath:context.targetPath,replacement:body.replacement})
      });
    }catch(e){
      console.error('semantic qa firewall error',e.message);
      const notConfigured=e?.code==='JEV_NOT_CONFIGURED';
      res.status(notConfigured?503:502).json({
        ok:false,
        error:notConfigured?'Semantic QA is not configured. Publication is blocked until Jev is available.':'Semantic QA could not complete. Publication remains blocked.',
        detail:String(e.message||'').slice(0,400)
      });
    }
  });

  // This route intentionally runs before the real content-editor apply route.
  // It is fail-closed: no valid, fresh Jev approval => no publication.
  nativePost.call(app,'/api/content-editor/apply',(req,res,next)=>{
    const user=adminSession(req);
    if(!user)return res.status(403).json({error:'Admin access required.'});
    const verified=verifyApproval(req);
    if(!verified.ok)return res.status(423).json({
      ok:false,
      error:verified.error,
      code:'SEMANTIC_QA_REQUIRED'
    });
    req.semanticQaApproval=verified.decoded;
    next();
  });
}

module.exports={
  installSemanticQaFirewall,
  runSemanticQa,
  CHECKS,
  FIREWALL_VERSION,
  REVIEW_ONLY_CHECKS,
  FAIL_THRESHOLDS,
  CORROBORATION_CLUSTERS,
  TYPE_SAFE_MODEL,
  TYPE_SAFE_URL
};
