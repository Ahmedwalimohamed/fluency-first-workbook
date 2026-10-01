'use strict';

const ALLOWED_EVENTS=new Set(['starting','listening','speaking','thinking','ready','microphone_problem','connection_problem']);
const TRANSFER_STATES=new Set(['observed','partial','struggling','not_observed']);
const DECISION_ACTIONS=new Set(['use','edit','ignore']);
const clean=(x,n=1200)=>String(x||'').replace(/\u0000/g,'').trim().slice(0,n);
const words=x=>clean(x,3000).match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)||[];
const escapeRegex=x=>String(x).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function goalsFor(context={}){
 if(context.lessonId==='su-b2-l1')return [
  {id:'introduce',label:'Introduce yourself and say what you do or study',required:true},
  {id:'detail',label:'Add a useful detail instead of giving only a short answer',required:true},
  {id:'react',label:'React to something the other speaker says',required:true},
  {id:'follow_up',label:'Ask one relevant follow-up question',required:true},
  {id:'duration',label:'Use accurate duration language such as for or since when relevant',required:false},
  {id:'maintain',label:'Help maintain the interaction naturally',required:true}
 ];
 return [
  {id:'answer',label:'Answer the current activity question clearly',required:true},
  {id:'detail',label:'Add one useful detail, reason or example',required:true},
  {id:'target_language',label:'Use relevant lesson language naturally',required:false},
  {id:'maintain',label:'Help maintain the interaction',required:true}
 ];
}

function observedVocabulary(text,vocabulary=[]){
 const source=clean(text,3000).toLowerCase();if(!source)return[];
 return vocabulary.filter(Boolean).map(x=>clean(x,100)).filter(Boolean).filter(item=>{
  const phrase=item.toLowerCase();
  return new RegExp('(^|[^a-z0-9])'+escapeRegex(phrase)+'([^a-z0-9]|$)','i').test(source);
 }).slice(0,20);
}

function createEvidenceStore({app,auth,pool,access,lessons}){
 let schemaPromise=null;
 const ensureSchema=()=>schemaPromise||(schemaPromise=pool.query(`
  create table if not exists ai_practice_sessions(
   id text primary key,
   student_id text not null references users(id) on delete cascade,
   class_id text references classes(id) on delete set null,
   lesson_id text not null,
   page text not null,
   stage text not null,
   started_at timestamptz not null default now(),
   last_event_at timestamptz not null default now(),
   ended_at timestamptz,
   status text not null default 'starting',
   turn_count int not null default 0,
   word_count int not null default 0,
   short_answer_count int not null default 0,
   help_count int not null default 0,
   uncertain_count int not null default 0,
   vocabulary_used text[] not null default '{}',
   goal_evidence jsonb not null default '{}',
   technical_issue text
  );
  create index if not exists ai_practice_sessions_student_lesson_idx on ai_practice_sessions(student_id,lesson_id,started_at desc);
  create index if not exists ai_practice_sessions_class_lesson_idx on ai_practice_sessions(class_id,lesson_id,started_at desc);
  create table if not exists ai_practice_turns(
   id bigserial primary key,
   session_id text not null references ai_practice_sessions(id) on delete cascade,
   turn_id text not null,
   learner_text text,
   coach_text text,
   word_count int not null default 0,
   evidence_status text not null,
   teaching_move text,
   move_source text,
   move_confidence numeric,
   goal_id text,
   goal_confidence numeric,
   vocabulary_used text[] not null default '{}',
   help_requested boolean not null default false,
   created_at timestamptz not null default now(),
   unique(session_id,turn_id)
  );
  create table if not exists ai_teacher_decisions(
   id bigserial primary key,
   teacher_id text not null references users(id) on delete cascade,
   class_id text references classes(id) on delete set null,
   lesson_id text not null,
   recommendation_key text not null,
   action text not null,
   recommendation jsonb not null default '{}',
   edited_text text,
   created_at timestamptz not null default now()
  );
  create table if not exists ai_transfer_evidence(
   id bigserial primary key,
   teacher_id text not null references users(id) on delete cascade,
   class_id text references classes(id) on delete set null,
   student_id text not null references users(id) on delete cascade,
   lesson_id text not null,
   status text not null,
   note text,
   observed_at timestamptz not null default now(),
   unique(teacher_id,class_id,student_id,lesson_id)
  );
 `).catch(e=>{schemaPromise=null;throw e}));

 const studentOnly=(req,res,next)=>{if(req.user?.role!=='student')return res.status(403).json({error:'Student access required.'});next()};
 const teacherOnly=(req,res,next)=>{if(req.user?.role!=='teacher')return res.status(403).json({error:'Teacher access required.'});next()};
 const sameOrigin=(req,res,next)=>{try{if(req.get('origin')&&new URL(req.get('origin')).host!==req.get('host'))return res.status(403).json({error:'Open practice inside EnglishGate.'});next()}catch{return res.status(403).json({error:'Invalid request origin.'})}};

 async function classForStudent(userId,courseId){
  const r=await pool.query(`select c.id from classes c join enrollments e on e.class_id=c.id where e.user_id=$1 and c.course_id=$2 order by c.created_at desc limit 1`,[userId,courseId]);
  return r.rows[0]?.id||null;
 }
 async function start({id,userId,context,courseId}){
  try{
   await ensureSchema();const classId=await classForStudent(userId,courseId);
   await pool.query(`insert into ai_practice_sessions(id,student_id,class_id,lesson_id,page,stage,status) values($1,$2,$3,$4,$5,$6,'starting') on conflict(id) do nothing`,[id,userId,classId,context.lessonId,context.page,context.stage]);
   return classId;
  }catch(e){console.error('AI PRACTICE EVIDENCE START FAILED',e.message);return null}
 }
 async function event({id,userId,type,detail}){
  if(!ALLOWED_EVENTS.has(type))return false;
  try{
   await ensureSchema();
   const issue=type.endsWith('_problem')?clean(detail||type,180):null;
   await pool.query(`update ai_practice_sessions set status=$3,last_event_at=now(),technical_issue=coalesce($4,technical_issue) where id=$1 and student_id=$2`,[id,userId,type,issue]);
   return true;
  }catch(e){console.error('AI PRACTICE EVIDENCE EVENT FAILED',e.message);return false}
 }
 async function turn({id,userId,turnId,learnerTurn,coachTurn,decision,helpRequested,context}){
  try{
   await ensureSchema();
   const placeholder=/^\[(speech|transcription)/i.test(clean(learnerTurn,200));
   const count=placeholder?0:words(learnerTurn).length;
   const vocab=placeholder?[]:observedVocabulary(learnerTurn,context?.vocabulary||[]);
   const status=placeholder?'uncertain':'observed';
   const goal=decision?.goal&&Number(decision.goalConfidence)>=0.75?clean(decision.goal,60):null;
   const goalConfidence=goal?Number(decision.goalConfidence):null;
   const inserted=await pool.query(`insert into ai_practice_turns(session_id,turn_id,learner_text,coach_text,word_count,evidence_status,teaching_move,move_source,move_confidence,goal_id,goal_confidence,vocabulary_used,help_requested)
    select $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13 where exists(select 1 from ai_practice_sessions where id=$1 and student_id=$14)
    on conflict(session_id,turn_id) do nothing returning id`,[id,turnId,clean(learnerTurn,2000),clean(coachTurn,1200),count,status,clean(decision?.move,40),clean(decision?.source,40),Number.isFinite(Number(decision?.confidence))?Number(decision.confidence):null,goal,goalConfidence,vocab,Boolean(helpRequested),userId]);
   if(!inserted.rowCount)return;
   const goalPatch=goal?JSON.stringify({[goal]:{status:'observed',confidence:goalConfidence,turnId,at:new Date().toISOString()}}):'{}';
   await pool.query(`update ai_practice_sessions set
    turn_count=turn_count+1,
    word_count=word_count+$3,
    short_answer_count=short_answer_count+$4,
    help_count=help_count+$5,
    uncertain_count=uncertain_count+$6,
    vocabulary_used=array(select distinct unnest(vocabulary_used||$7::text[])),
    goal_evidence=goal_evidence||$8::jsonb,
    last_event_at=now(),status='ready'
    where id=$1 and student_id=$2`,[id,userId,count,!placeholder&&count>0&&count<5?1:0,helpRequested?1:0,placeholder?1:0,vocab,goalPatch]);
  }catch(e){console.error('AI PRACTICE EVIDENCE TURN FAILED',e.message)}
 }
 async function end(id,userId){
  try{await ensureSchema();await pool.query(`update ai_practice_sessions set ended_at=coalesce(ended_at,now()),last_event_at=now(),status='finished' where id=$1 and student_id=$2`,[id,userId])}catch(e){console.error('AI PRACTICE EVIDENCE END FAILED',e.message)}
 }

 function lessonContext(lessonId){
  const l=lessons.get(lessonId);return {lessonId,title:l?.title||lessonId,goals:goalsFor({lessonId})};
 }
 function priorityFor(rows,lessonId){
  const participants=rows.filter(r=>Number(r.turn_count)>0);
  if(!participants.length)return null;
  const candidates=[];
  const shortAffected=participants.filter(r=>Number(r.turn_count)>=2&&Number(r.short_answer_count)/Math.max(1,Number(r.turn_count))>=0.5).length;
  if(shortAffected)candidates.push({key:'extend_answers',title:'Extend answers with one reason or useful detail',affectedCount:shortAffected,confidence:0.96,relevance:0.9,impact:0.9,suggestedMinutes:4,why:`${shortAffected} learner${shortAffected===1?' has':'s have'} repeatedly given answers under five words.`,sequence:['Show one short answer from class evidence.','Model: answer + because/reason/example.','Ask learners to extend one answer orally.','Recheck during the Fluency Mission.']});
  const helpAffected=participants.filter(r=>Number(r.help_count)>0).length;
  if(helpAffected)candidates.push({key:'independent_response',title:'Build an answer before asking for help',affectedCount:helpAffected,confidence:0.9,relevance:0.78,impact:0.72,suggestedMinutes:3,why:`${helpAffected} learner${helpAffected===1?' used':'s used'} scaffolding during practice.`,sequence:['Give one simple answer frame.','Model one example.','Remove the frame and ask for an independent retry.']});
  if(lessonId==='su-b2-l1'){
   const completed=participants.filter(r=>r.ended_at||Number(r.turn_count)>=3);
   for(const spec of [{id:'follow_up',title:'Natural follow-up questions',impact:1,relevance:1,minutes:5,sequence:['Show a statement from the conversation.','Ask: What could you naturally ask next?','Model one relevant follow-up.','Students ask and answer in pairs.']},{id:'detail',title:'Add useful detail when introducing yourself',impact:.9,relevance:1,minutes:4,sequence:['Compare a one-line introduction with an extended one.','Elicit one extra detail.','Students retry their introductions.']}]){
    const affected=completed.filter(r=>!r.goal_evidence?.[spec.id]).length;
    if(affected)candidates.push({key:'goal_'+spec.id,title:spec.title,affectedCount:affected,confidence:0.72,relevance:spec.relevance,impact:spec.impact,suggestedMinutes:spec.minutes,why:`Trusted evidence of this goal was not yet observed for ${affected} learner${affected===1?'':'s'}. Treat this as a teaching check, not proof of inability.`,sequence:spec.sequence});
   }
  }
  if(!candidates.length)return {key:'maintain_and_transfer',title:'Move to human performance',affectedCount:0,confidence:0.9,relevance:1,impact:.8,suggestedMinutes:0,why:'No high-priority class-wide issue is supported by the current evidence.',sequence:['Start the Fluency Mission.','Observe whether learners transfer the practised language to human interaction.']};
  for(const c of candidates)c.score=Number((c.affectedCount*c.confidence*c.relevance*c.impact).toFixed(3));
  return candidates.sort((a,b)=>b.score-a.score)[0];
 }
 function signalFor(row){
  if(!row.session_id)return {label:'Not started',tone:'muted'};
  if(row.technical_issue)return {label:'Technical help',tone:'danger'};
  if(row.ended_at||row.status==='finished')return {label:'Finished',tone:'done'};
  const age=Date.now()-new Date(row.last_event_at||row.started_at).getTime();
  if(age>60000)return {label:'Check in',tone:'warn'};
  if(row.status==='speaking')return {label:'Speaking',tone:'active'};
  if(row.status==='thinking')return {label:'Thinking',tone:'active'};
  if(row.status==='listening')return {label:'Listening',tone:'active'};
  return {label:'Ready',tone:'active'};
 }

 app.post('/api/lesson-practice/event',auth,studentOnly,sameOrigin,async(req,res)=>{
  const id=clean(req.body?.sessionId,80),type=clean(req.body?.type,40);if(!id||!ALLOWED_EVENTS.has(type))return res.status(400).json({error:'Invalid practice event.'});
  await event({id,userId:req.user.id,type,detail:req.body?.detail});res.json({ok:true});
 });
 app.get('/api/lesson-practice/teacher/live',auth,teacherOnly,async(req,res)=>{
  try{
   await ensureSchema();const lessonId=clean(req.query.lessonId,80);if(!lessonId)return res.status(400).json({error:'Choose a lesson first.'});
   const courseId=access.courseIdFromLesson(lessonId);
   const r=await pool.query(`select distinct on(u.id) u.id student_id,u.name,c.id class_id,c.name class_name,
    s.id session_id,s.started_at,s.last_event_at,s.ended_at,s.status,s.turn_count,s.word_count,s.short_answer_count,s.help_count,s.uncertain_count,s.vocabulary_used,s.goal_evidence,s.technical_issue,
    t.status transfer_status,t.note transfer_note
    from classes c join enrollments e on e.class_id=c.id join users u on u.id=e.user_id
    left join lateral(select * from ai_practice_sessions x where x.student_id=u.id and x.lesson_id=$3 order by x.started_at desc limit 1)s on true
    left join ai_transfer_evidence t on t.teacher_id=$1 and t.class_id=c.id and t.student_id=u.id and t.lesson_id=$3
    where c.teacher_id=$1 and c.course_id=$2 and u.role='student'
    order by u.id,c.created_at desc`,[req.user.id,courseId,lessonId]);
   const rows=r.rows.map(x=>({...x,signal:signalFor(x)}));
   const decision=priorityFor(rows,lessonId),ctx=lessonContext(lessonId);
   const counts={total:rows.length,notStarted:rows.filter(x=>!x.session_id).length,active:rows.filter(x=>x.session_id&&!x.ended_at&&!x.technical_issue).length,finished:rows.filter(x=>x.ended_at||x.status==='finished').length,technical:rows.filter(x=>x.technical_issue).length};
   res.set('Cache-Control','no-store').json({lesson:ctx,counts,decision,students:rows.map(x=>({studentId:x.student_id,name:x.name,classId:x.class_id,className:x.class_name,status:x.signal.label,tone:x.signal.tone,turns:Number(x.turn_count||0),words:Number(x.word_count||0),shortAnswers:Number(x.short_answer_count||0),helpCount:Number(x.help_count||0),uncertainCount:Number(x.uncertain_count||0),vocabulary:x.vocabulary_used||[],goals:x.goal_evidence||{},technicalIssue:x.technical_issue||null,finished:Boolean(x.ended_at||x.status==='finished'),transferStatus:x.transfer_status||'not_observed',transferNote:x.transfer_note||''}))});
  }catch(e){console.error('AI PRACTICE TEACHER LIVE FAILED',e.message);res.status(503).json({error:'Practice evidence is temporarily unavailable.'})}
 });
 app.post('/api/lesson-practice/teacher/decision',auth,teacherOnly,sameOrigin,async(req,res)=>{
  try{
   await ensureSchema();const lessonId=clean(req.body?.lessonId,80),classId=clean(req.body?.classId,80)||null,action=clean(req.body?.action,20),recommendation=req.body?.recommendation||{},editedText=clean(req.body?.editedText,500)||null;
   if(!lessonId||!DECISION_ACTIONS.has(action))return res.status(400).json({error:'Invalid teacher decision.'});
   if(classId){const own=await pool.query('select 1 from classes where id=$1 and teacher_id=$2',[classId,req.user.id]);if(!own.rowCount)return res.status(403).json({error:'This class is not assigned to you.'})}
   await pool.query(`insert into ai_teacher_decisions(teacher_id,class_id,lesson_id,recommendation_key,action,recommendation,edited_text) values($1,$2,$3,$4,$5,$6::jsonb,$7)`,[req.user.id,classId,lessonId,clean(recommendation.key||'teacher_choice',80),action,JSON.stringify(recommendation),editedText]);
   res.json({ok:true});
  }catch(e){console.error('AI PRACTICE TEACHER DECISION FAILED',e.message);res.status(503).json({error:'Could not save the teacher decision.'})}
 });
 app.post('/api/lesson-practice/teacher/transfer',auth,teacherOnly,sameOrigin,async(req,res)=>{
  try{
   await ensureSchema();const lessonId=clean(req.body?.lessonId,80),classId=clean(req.body?.classId,80),studentId=clean(req.body?.studentId,80),status=clean(req.body?.status,30),note=clean(req.body?.note,500)||null;
   if(!lessonId||!classId||!studentId||!TRANSFER_STATES.has(status))return res.status(400).json({error:'Invalid transfer evidence.'});
   const own=await pool.query(`select 1 from classes c join enrollments e on e.class_id=c.id where c.id=$1 and c.teacher_id=$2 and e.user_id=$3`,[classId,req.user.id,studentId]);if(!own.rowCount)return res.status(403).json({error:'This learner is not assigned to your class.'});
   await pool.query(`insert into ai_transfer_evidence(teacher_id,class_id,student_id,lesson_id,status,note) values($1,$2,$3,$4,$5,$6)
    on conflict(teacher_id,class_id,student_id,lesson_id) do update set status=excluded.status,note=excluded.note,observed_at=now()`,[req.user.id,classId,studentId,lessonId,status,note]);
   const consolidation=status==='observed'?'Continue the normal workbook sequence.':status==='partial'?'Assign one short targeted workbook review, then recheck in the next speaking task.':status==='struggling'?'Use a short targeted Help Me Practice retry, then one workbook consolidation activity.':'No consolidation change yet; collect human-performance evidence first.';
   res.json({ok:true,consolidation});
  }catch(e){console.error('AI PRACTICE TRANSFER EVIDENCE FAILED',e.message);res.status(503).json({error:'Could not save transfer evidence.'})}
 });
 return {ensureSchema,start,event,turn,end};
}

module.exports={createEvidenceStore,goalsFor,observedVocabulary,words};