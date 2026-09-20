'use strict';

const crypto=require('crypto');
const jwt=require('jsonwebtoken');

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
function normalizeAnswer(check,answer){
  const choice=String(answer?.choice||'').toLowerCase();
  const confidence=Number(answer?.confidence);
  const probabilities=answer?.probabilities&&typeof answer.probabilities==='object'?answer.probabilities:{};
  let status='BLOCKED';
  let reason='Jev did not return a valid decision.';
  if(choice==='pass'&&Number.isFinite(confidence)&&confidence>=0.4){
    status='PASS';
    reason='Requirement passed.';
  }else if(choice==='not_applicable'&&Number.isFinite(confidence)&&confidence>=0.4){
    status='NOT_APPLICABLE';
    reason='Check is not applicable to this lesson.';
  }else if(choice==='fail'){
    status='FAIL';
    reason='Jev found a concrete violation.';
  }else if((choice==='pass'||choice==='not_applicable')&&Number.isFinite(confidence)&&confidence<0.4){
    status='LOW_CONFIDENCE';
    reason='Jev decision confidence is too low to permit publication.';
  }else if(choice){
    status='BLOCKED';
    reason='Jev returned an unsupported decision.';
  }
  return {
    id:check.id,
    category:check.category,
    critical:check.critical,
    requirement:check.instructions,
    status,
    choice,
    confidence:Number.isFinite(confidence)?confidence:null,
    probabilities,
    reason
  };
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
    model:null,
    version:'jev-semantic-firewall-v1',
    totalChecks:CHECKS.length+structural.length,
    passed:0,
    blocked:structural.length,
    checks:structural,
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
  const checks=CHECKS.map(check=>normalizeAnswer(check,data?.answers?.[check.id]));
  const blocked=checks.filter(x=>!['PASS','NOT_APPLICABLE'].includes(x.status));
  const passed=checks.filter(x=>x.status==='PASS').length;
  const notApplicable=checks.filter(x=>x.status==='NOT_APPLICABLE').length;
  return {
    pass:blocked.length===0,
    model:String(data?.model||TYPE_SAFE_MODEL),
    version:'jev-semantic-firewall-v1',
    totalChecks:checks.length,
    passed,
    notApplicable,
    blocked:blocked.length,
    criticalFailures:blocked.filter(x=>x.critical).length,
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
    passed:report.passed
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
function installSemanticQaFirewall(app,{nativePost}){
  if(installed.has(app))return;
  installed.add(app);

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
          error:`Semantic QA blocked publication: ${report.blocked} check${report.blocked===1?'':'s'} did not pass.`,
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
  TYPE_SAFE_MODEL,
  TYPE_SAFE_URL
};
