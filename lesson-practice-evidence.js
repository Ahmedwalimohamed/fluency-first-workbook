'use strict';

const crypto=require('crypto');
const contracts=require('./lesson-practice-contracts');
const ALLOWED_EVENTS=new Set(['starting','listening','speaking','thinking','ready','microphone_problem','connection_problem']);
const TRANSFER_STATES=new Set(['observed','partial','struggling','not_observed']);
const DECISION_ACTIONS=new Set(['use','edit','ignore']);
const clean=(x,n=1200)=>String(x||'').replace(/\u0000/g,'').trim().slice(0,n);
const words=x=>clean(x,3000).match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)||[];
const escapeRegex=x=>String(x).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));

function goalsFor(context={}){
 return contracts.goalsForContext(context);
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
  create table if not exists ai_practice_rounds(
   id text primary key,
   teacher_id text not null references users(id) on delete cascade,
   class_id text not null references classes(id) on delete cascade,
   lesson_id text not null,
   status text not null default 'active',
   started_at timestamptz not null default now(),
   ends_at timestamptz not null,
   ended_at timestamptz,
   created_at timestamptz not null default now()
  );
  create index if not exists ai_practice_rounds_class_lesson_idx on ai_practice_rounds(class_id,lesson_id,started_at desc);
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
  alter table ai_teacher_decisions add column if not exists round_id text;
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
  alter table ai_transfer_evidence add column if not exists round_id text;
  alter table ai_transfer_evidence drop constraint if exists ai_transfer_evidence_teacher_id_class_id_student_id_lesson_id_key;
  create unique index if not exists ai_transfer_evidence_round_student_uidx on ai_transfer_evidence(teacher_id,class_id,student_id,lesson_id,coalesce(round_id,''));
 `).catch(e=>{schemaPromise=null;throw e}));

 const studentOnly=(req,res,next)=>{if(req.user?.role!=='student')return res.status(403).json({error:'Student access required.'});next()};
 const teacherOnly=(req,res,next)=>{if(req.user?.role!=='teacher')return res.status(403).json({error:'Teacher access required.'});next()};
 const sameOrigin=(req,res,next)=>{try{if(req.get('origin')&&new URL(req.get('origin')).host!==req.get('host'))return res.status(403).json({error:'Open practice inside EnglishGate.'});next()}catch{return res.status(403).json({error:'Invalid request origin.'})}};

 async function classForStudent(userId,courseId){
  const r=await pool.query(`select c.id from classes c join enrollments e on e.class_id=c.id where e.user_id=$1 and c.course_id=$2 order by c.created_at desc limit 1`,[userId,courseId]);
  return r.rows[0]?.id||null;
 }
 async function teacherClass(teacherId,classId,courseId){
  const params=[teacherId,courseId];let extra='';
  if(classId){params.push(classId);extra=' and c.id=$3'}
  const r=await pool.query(`select c.id,c.name,c.course_id from classes c where c.teacher_id=$1 and c.course_id=$2${extra} order by c.created_at desc limit 1`,params);
  return r.rows[0]||null;
 }
 async function normalizeRound(row){
  if(!row)return null;
  if(row.status==='active'&&!row.ended_at&&new Date(row.ends_at).getTime()<=Date.now()){
   const ended=await pool.query(`update ai_practice_rounds set status='ended',ended_at=coalesce(ended_at,ends_at) where id=$1 returning *`,[row.id]);
   return ended.rows[0]||row;
  }
  return row;
 }
 async function latestRound(teacherId,classId,lessonId){
  const r=await pool.query(`select * from ai_practice_rounds where teacher_id=$1 and class_id=$2 and lesson_id=$3 order by started_at desc limit 1`,[teacherId,classId,lessonId]);
  return normalizeRound(r.rows[0]||null);
 }
 function roundJson(row){
  if(!row)return null;const active=row.status==='active'&&!row.ended_at&&new Date(row.ends_at).getTime()>Date.now();
  return {id:row.id,classId:row.class_id,lessonId:row.lesson_id,status:active?'active':'ended',startedAt:row.started_at,endsAt:row.ends_at,endedAt:row.ended_at||null,remainingSeconds:active?Math.max(0,Math.ceil((new Date(row.ends_at).getTime()-Date.now())/1000)):0};
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
   await ensureSchema();const issue=type.endsWith('_problem')?clean(detail||type,180):null;
   await pool.query(`update ai_practice_sessions set status=$3,last_event_at=now(),technical_issue=coalesce($4,technical_issue) where id=$1 and student_id=$2`,[id,userId,type,issue]);return true;
  }catch(e){console.error('AI PRACTICE EVIDENCE EVENT FAILED',e.message);return false}
 }
 async function turn({id,userId,turnId,learnerTurn,coachTurn,decision,helpRequested,context}){
  try{
   await ensureSchema();const placeholder=/^\[(speech|transcription)/i.test(clean(learnerTurn,200));
   const count=placeholder?0:words(learnerTurn).length,vocab=placeholder?[]:observedVocabulary(learnerTurn,context?.vocabulary||[]),status=placeholder?'uncertain':'observed';
   const allowedGoals=new Set(goalsFor(context).map(g=>g.id));
   const goal=decision?.goal&&allowedGoals.has(decision.goal)&&Number(decision.goalConfidence)>=0.75?clean(decision.goal,60):null,goalConfidence=goal?Number(decision.goalConfidence):null;
   const inserted=await pool.query(`insert into ai_practice_turns(session_id,turn_id,learner_text,coach_text,word_count,evidence_status,teaching_move,move_source,move_confidence,goal_id,goal_confidence,vocabulary_used,help_requested)
    select $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13 where exists(select 1 from ai_practice_sessions where id=$1 and student_id=$14)
    on conflict(session_id,turn_id) do nothing returning id`,[id,turnId,clean(learnerTurn,2000),clean(coachTurn,1200),count,status,clean(decision?.move,40),clean(decision?.source,40),Number.isFinite(Number(decision?.confidence))?Number(decision.confidence):null,goal,goalConfidence,vocab,Boolean(helpRequested),userId]);
   if(!inserted.rowCount)return;
   const goalPatch=goal?JSON.stringify({[goal]:{status:'observed',confidence:goalConfidence,turnId,at:new Date().toISOString()}}):'{}';
   await pool.query(`update ai_practice_sessions set turn_count=turn_count+1,word_count=word_count+$3,short_answer_count=short_answer_count+$4,help_count=help_count+$5,uncertain_count=uncertain_count+$6,vocabulary_used=array(select distinct unnest(vocabulary_used||$7::text[])),goal_evidence=goal_evidence||$8::jsonb,last_event_at=now(),status='ready' where id=$1 and student_id=$2`,[id,userId,count,!placeholder&&count>0&&count<5?1:0,helpRequested?1:0,placeholder?1:0,vocab,goalPatch]);
  }catch(e){console.error('AI PRACTICE EVIDENCE TURN FAILED',e.message)}
 }
 async function end(id,userId){
  try{await ensureSchema();await pool.query(`update ai_practice_sessions set ended_at=coalesce(ended_at,now()),last_event_at=now(),status='finished' where id=$1 and student_id=$2`,[id,userId])}catch(e){console.error('AI PRACTICE EVIDENCE END FAILED',e.message)}
 }

 function lessonContract(lessonId){return contracts.contractFor(lessons.get(lessonId))||contracts.contractForId(lessonId)}
 function lessonContext(lessonId){
  const c=lessonContract(lessonId);return {lessonId,title:c?.title||lessonId,canDo:c?.canDo||'',goals:c?.goals||goalsFor({lessonId}),minMeaningfulTurns:c?.minMeaningfulTurns||2,requiredObserved:c?.requiredObserved||1,transferMission:c?.transferMission||''};
 }
 function priorityFor(rows,lessonId){
  const participants=rows.filter(r=>Number(r.turn_count)>0);if(!participants.length)return null;const candidates=[];
  const contract=lessonContract(lessonId),minTurns=Number(contract?.minMeaningfulTurns||2);
  const shortAffected=participants.filter(r=>Number(r.turn_count)>=2&&Number(r.short_answer_count)/Math.max(1,Number(r.turn_count))>=0.5).length;
  if(shortAffected)candidates.push({key:'extend_answers',title:'Extend answers with one reason or useful detail',affectedCount:shortAffected,confidence:.96,relevance:.9,impact:.9,suggestedMinutes:4,why:`${shortAffected} learner${shortAffected===1?' has':'s have'} repeatedly given answers under five words.`,sequence:['Show one short answer from class evidence.','Model: answer + reason, detail, or example.','Ask learners to extend one answer orally.','Recheck during the Fluency Mission.']});
  const helpAffected=participants.filter(r=>Number(r.help_count)>0).length;
  if(helpAffected)candidates.push({key:'independent_response',title:'Build an answer before asking for help',affectedCount:helpAffected,confidence:.9,relevance:.78,impact:.72,suggestedMinutes:3,why:`${helpAffected} learner${helpAffected===1?' used':'s used'} scaffolding during practice.`,sequence:['Give one short answer frame.','Model one example.','Remove the frame and ask for an independent retry.']});
  const completed=participants.filter(r=>r.ended_at||Number(r.turn_count)>=minTurns);
  for(const goal of contract?.goals?.filter(g=>g.required)||[]){
   const affected=completed.filter(r=>!r.goal_evidence?.[goal.id]).length;
   if(!affected)continue;
   candidates.push({key:'goal_'+goal.id,title:`Practise: ${goal.label}`,affectedCount:affected,confidence:.72,relevance:1,impact:.92,suggestedMinutes:4,why:`Trusted evidence of this lesson goal was not yet observed for ${affected} learner${affected===1?'':'s'}. Treat this as a teaching check, not proof of inability.`,sequence:['Show or model one clear example.','Elicit the target behaviour from learners.','Give a short paired retry.','Recheck it during the Fluency Mission.']});
  }
  if(!candidates.length)return {key:'maintain_and_transfer',title:'Move to human performance',affectedCount:0,confidence:.9,relevance:1,impact:.8,suggestedMinutes:0,why:'No high-priority class-wide issue is supported by the current trusted evidence.',sequence:['Start the Fluency Mission.','Observe whether learners transfer the practised language to human interaction.']};
  for(const c of candidates)c.score=Number((c.affectedCount*c.confidence*c.relevance*c.impact).toFixed(3));return candidates.sort((a,b)=>b.score-a.score)[0];
 }
 function signalFor(row){
  if(!row.session_id)return {label:'Not started',tone:'muted'};if(row.technical_issue)return {label:'Technical help',tone:'danger'};if(row.ended_at||row.status==='finished')return {label:'Finished',tone:'done'};
  const age=Date.now()-new Date(row.last_event_at||row.started_at).getTime();if(age>60000)return {label:'Check in',tone:'warn'};if(row.status==='speaking')return {label:'Speaking',tone:'active'};if(row.status==='thinking')return {label:'Thinking',tone:'active'};if(row.status==='listening')return {label:'Listening',tone:'active'};return {label:'Ready',tone:'active'};
 }
 async function latestDecision(teacherId,classId,lessonId,roundId){
  const r=await pool.query(`select action,recommendation,edited_text,created_at,round_id from ai_teacher_decisions where teacher_id=$1 and class_id=$2 and lesson_id=$3 and coalesce(round_id,'')=coalesce($4,'') order by created_at desc limit 1`,[teacherId,classId,lessonId,roundId||null]);return r.rows[0]||null;
 }

 app.post('/api/lesson-practice/event',auth,studentOnly,sameOrigin,async(req,res)=>{
  const id=clean(req.body?.sessionId,80),type=clean(req.body?.type,40);if(!id||!ALLOWED_EVENTS.has(type))return res.status(400).json({error:'Invalid practice event.'});await event({id,userId:req.user.id,type,detail:req.body?.detail});res.json({ok:true});
 });

 app.get('/api/lesson-practice/student/feedback',auth,studentOnly,async(req,res)=>{
  try{
   await ensureSchema();const requested=clean(req.query.sessionId,80);
   const params=[req.user.id];let filter='';if(requested){params.push(requested);filter=' and id=$2'}
   const r=await pool.query(`select * from ai_practice_sessions where student_id=$1${filter} order by started_at desc limit 1`,params);
   const row=r.rows[0];if(!row)return res.status(404).json({error:'No speaking practice evidence is available yet.'});
   const contract=lessonContract(row.lesson_id);if(!contract)return res.status(404).json({error:'This lesson does not have a speaking feedback contract yet.'});
   res.set('Cache-Control','no-store').json({feedback:contracts.feedbackForSession(contract,row)});
  }catch(e){console.error('AI PRACTICE STUDENT FEEDBACK FAILED',e.message);res.status(503).json({error:'Your speaking feedback is temporarily unavailable.'})}
 });

 app.get('/api/lesson-practice/student/round',auth,studentOnly,async(req,res)=>{
  try{
   await ensureSchema();
   const r=await pool.query(`select r.* from ai_practice_rounds r join enrollments e on e.class_id=r.class_id where e.user_id=$1 and r.status='active' and r.ended_at is null and r.ends_at>now() order by r.started_at desc limit 1`,[req.user.id]);
   const round=r.rows[0]||null,l=round?lessons.get(round.lesson_id):null;res.set('Cache-Control','no-store').json({round:round?{...roundJson(round),title:l?.title||round.lesson_id}:null});
  }catch(e){res.status(503).json({error:'Class AI practice status is temporarily unavailable.'})}
 });

 app.post('/api/lesson-practice/teacher/round/start',auth,teacherOnly,sameOrigin,async(req,res)=>{
  try{
   await ensureSchema();const lessonId=clean(req.body?.lessonId,80),courseId=access.courseIdFromLesson(lessonId),classId=clean(req.body?.classId,80);if(!lessonId||!courseId)return res.status(400).json({error:'Choose a valid lesson first.'});
   const c=await teacherClass(req.user.id,classId,courseId);if(!c)return res.status(403).json({error:'Open one of your classes for this course first.'});
   const duration=clamp(req.body?.durationSeconds||300,120,600);await pool.query(`update ai_practice_rounds set status='ended',ended_at=coalesce(ended_at,now()) where teacher_id=$1 and class_id=$2 and lesson_id=$3 and status='active'`,[req.user.id,c.id,lessonId]);
   const id=crypto.randomUUID(),r=await pool.query(`insert into ai_practice_rounds(id,teacher_id,class_id,lesson_id,ends_at) values($1,$2,$3,$4,now()+($5::text||' seconds')::interval) returning *`,[id,req.user.id,c.id,lessonId,String(duration)]);
   res.json({ok:true,round:roundJson(r.rows[0]),class:{id:c.id,name:c.name}});
  }catch(e){console.error('AI PRACTICE ROUND START FAILED',e.message);res.status(503).json({error:'Could not start the class AI Conversation.'})}
 });
 app.patch('/api/lesson-practice/teacher/round/:id/extend',auth,teacherOnly,sameOrigin,async(req,res)=>{
  try{
   await ensureSchema();const minutes=clamp(req.body?.minutes||2,1,5),id=clean(req.params.id,80);
   const r=await pool.query(`update ai_practice_rounds set ends_at=least(ends_at+($3::text||' minutes')::interval,started_at+interval '10 minutes') where id=$1 and teacher_id=$2 and status='active' and ended_at is null returning *`,[id,req.user.id,String(minutes)]);
   if(!r.rowCount)return res.status(404).json({error:'This AI Conversation round is no longer active.'});res.json({ok:true,round:roundJson(r.rows[0])});
  }catch(e){res.status(503).json({error:'Could not extend the AI Conversation.'})}
 });
 app.patch('/api/lesson-practice/teacher/round/:id/end',auth,teacherOnly,sameOrigin,async(req,res)=>{
  try{await ensureSchema();const r=await pool.query(`update ai_practice_rounds set status='ended',ended_at=coalesce(ended_at,now()) where id=$1 and teacher_id=$2 returning *`,[clean(req.params.id,80),req.user.id]);if(!r.rowCount)return res.status(404).json({error:'AI Conversation round not found.'});res.json({ok:true,round:roundJson(r.rows[0])})}catch(e){res.status(503).json({error:'Could not end the AI Conversation.'})}
 });

 app.get('/api/lesson-practice/teacher/live',auth,teacherOnly,async(req,res)=>{
  try{
   await ensureSchema();const lessonId=clean(req.query.lessonId,80),courseId=access.courseIdFromLesson(lessonId),requestedClass=clean(req.query.classId,80);if(!lessonId||!courseId)return res.status(400).json({error:'Choose a lesson first.'});
   const c=await teacherClass(req.user.id,requestedClass,courseId);if(!c)return res.status(403).json({error:'Open one of your classes for this course first.'});
   const round=await latestRound(req.user.id,c.id,lessonId),windowStart=round?.started_at||null,windowEnd=round?(round.ended_at||round.ends_at):null;
   const r=await pool.query(`select u.id student_id,u.name,c.id class_id,c.name class_name,
    s.id session_id,s.started_at,s.last_event_at,s.ended_at,s.status,s.turn_count,s.word_count,s.short_answer_count,s.help_count,s.uncertain_count,s.vocabulary_used,s.goal_evidence,s.technical_issue,
    t.status transfer_status,t.note transfer_note
    from classes c join enrollments e on e.class_id=c.id join users u on u.id=e.user_id
    left join lateral(select * from ai_practice_sessions x where x.student_id=u.id and x.class_id=c.id and x.lesson_id=$3 and ($4::timestamptz is null or x.started_at>=$4) and ($5::timestamptz is null or x.started_at<=$5) order by x.started_at desc limit 1)s on true
    left join lateral(select * from ai_transfer_evidence z where z.teacher_id=$1 and z.class_id=c.id and z.student_id=u.id and z.lesson_id=$3 and coalesce(z.round_id,'')=coalesce($6,'') order by z.observed_at desc limit 1)t on true
    where c.id=$2 and c.teacher_id=$1 and u.role='student' order by u.name`,[req.user.id,c.id,lessonId,windowStart,windowEnd,round?.id||null]);
   const rows=r.rows.map(x=>({...x,signal:signalFor(x)})),decision=priorityFor(rows,lessonId),ctx=lessonContext(lessonId),teacherDecision=await latestDecision(req.user.id,c.id,lessonId,round?.id||null);
   const counts={total:rows.length,notStarted:rows.filter(x=>!x.session_id).length,active:rows.filter(x=>x.session_id&&!x.ended_at&&!x.technical_issue).length,finished:rows.filter(x=>x.ended_at||x.status==='finished').length,technical:rows.filter(x=>x.technical_issue).length};
   res.set('Cache-Control','no-store').json({lesson:ctx,class:{id:c.id,name:c.name},round:roundJson(round),counts,decision,teacherDecision:teacherDecision?{action:teacherDecision.action,recommendation:teacherDecision.recommendation,editedText:teacherDecision.edited_text||'',createdAt:teacherDecision.created_at}:null,students:rows.map(x=>({studentId:x.student_id,name:x.name,classId:x.class_id,className:x.class_name,status:x.signal.label,tone:x.signal.tone,turns:Number(x.turn_count||0),words:Number(x.word_count||0),shortAnswers:Number(x.short_answer_count||0),helpCount:Number(x.help_count||0),uncertainCount:Number(x.uncertain_count||0),vocabulary:x.vocabulary_used||[],goals:x.goal_evidence||{},technicalIssue:x.technical_issue||null,finished:Boolean(x.ended_at||x.status==='finished'),transferStatus:x.transfer_status||'not_observed',transferNote:x.transfer_note||''}))});
  }catch(e){console.error('AI PRACTICE TEACHER LIVE FAILED',e.message);res.status(503).json({error:'Practice evidence is temporarily unavailable.'})}
 });
 app.post('/api/lesson-practice/teacher/decision',auth,teacherOnly,sameOrigin,async(req,res)=>{
  try{
   await ensureSchema();const lessonId=clean(req.body?.lessonId,80),classId=clean(req.body?.classId,80),roundId=clean(req.body?.roundId,80)||null,action=clean(req.body?.action,20),recommendation=req.body?.recommendation||{},editedText=clean(req.body?.editedText,500)||null;
   if(!lessonId||!classId||!DECISION_ACTIONS.has(action))return res.status(400).json({error:'Invalid teacher decision.'});const own=await pool.query('select 1 from classes where id=$1 and teacher_id=$2',[classId,req.user.id]);if(!own.rowCount)return res.status(403).json({error:'This class is not assigned to you.'});
   await pool.query(`insert into ai_teacher_decisions(teacher_id,class_id,lesson_id,round_id,recommendation_key,action,recommendation,edited_text) values($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`,[req.user.id,classId,lessonId,roundId,clean(recommendation.key||'teacher_choice',80),action,JSON.stringify(recommendation),editedText]);res.json({ok:true});
  }catch(e){console.error('AI PRACTICE TEACHER DECISION FAILED',e.message);res.status(503).json({error:'Could not save the teacher decision.'})}
 });
 app.post('/api/lesson-practice/teacher/transfer',auth,teacherOnly,sameOrigin,async(req,res)=>{
  try{
   await ensureSchema();const lessonId=clean(req.body?.lessonId,80),classId=clean(req.body?.classId,80),studentId=clean(req.body?.studentId,80),roundId=clean(req.body?.roundId,80)||null,status=clean(req.body?.status,30),note=clean(req.body?.note,500)||null;
   if(!lessonId||!classId||!studentId||!TRANSFER_STATES.has(status))return res.status(400).json({error:'Invalid transfer evidence.'});const own=await pool.query(`select 1 from classes c join enrollments e on e.class_id=c.id where c.id=$1 and c.teacher_id=$2 and e.user_id=$3`,[classId,req.user.id,studentId]);if(!own.rowCount)return res.status(403).json({error:'This learner is not assigned to your class.'});
   const existing=await pool.query(`select id from ai_transfer_evidence where teacher_id=$1 and class_id=$2 and student_id=$3 and lesson_id=$4 and coalesce(round_id,'')=coalesce($5,'') limit 1`,[req.user.id,classId,studentId,lessonId,roundId]);
   if(existing.rowCount)await pool.query(`update ai_transfer_evidence set status=$2,note=$3,observed_at=now() where id=$1`,[existing.rows[0].id,status,note]);else await pool.query(`insert into ai_transfer_evidence(teacher_id,class_id,student_id,lesson_id,round_id,status,note) values($1,$2,$3,$4,$5,$6,$7)`,[req.user.id,classId,studentId,lessonId,roundId,status,note]);
   const consolidation=status==='observed'?'Continue the normal workbook sequence.':status==='partial'?'Assign one short targeted workbook review, then recheck in the next speaking task.':status==='struggling'?'Use a short targeted Help Me Practice retry, then one workbook consolidation activity.':'No consolidation change yet; collect human-performance evidence first.';res.json({ok:true,consolidation});
  }catch(e){console.error('AI PRACTICE TRANSFER EVIDENCE FAILED',e.message);res.status(503).json({error:'Could not save transfer evidence.'})}
 });

 app.get('/api/lesson-practice/teacher/usage',auth,teacherOnly,async(req,res)=>{
  try{
   await ensureSchema();const days=clamp(req.query.days||7,1,30),classId=clean(req.query.classId,80),lessonId=clean(req.query.lessonId,80)||null;
   const own=await pool.query(`select id,name from classes where id=$1 and teacher_id=$2`,[classId,req.user.id]);if(!own.rowCount)return res.status(403).json({error:'This class is not assigned to you.'});
   const r=await pool.query(`select u.id student_id,u.name,count(s.id)::int sessions,coalesce(sum(s.turn_count),0)::int turns,coalesce(sum(s.word_count),0)::int words,max(s.started_at) last_practice_at,
    coalesce(sum(least(300,greatest(0,extract(epoch from (coalesce(s.ended_at,s.last_event_at)-s.started_at))))),0) seconds
    from enrollments e join users u on u.id=e.user_id
    left join ai_practice_sessions s on s.student_id=u.id and s.class_id=e.class_id and s.started_at>=now()-($2::text||' days')::interval and ($3::text is null or s.lesson_id=$3)
    where e.class_id=$1 and u.role='student' group by u.id,u.name order by u.name`,[classId,String(days),lessonId]);
   const students=r.rows.map(x=>({studentId:x.student_id,name:x.name,used:Number(x.sessions)>0,sessions:Number(x.sessions||0),turns:Number(x.turns||0),words:Number(x.words||0),minutes:Math.round(Number(x.seconds||0)/60),lastPracticeAt:x.last_practice_at||null}));
   res.set('Cache-Control','no-store').json({days,class:own.rows[0],counts:{total:students.length,used:students.filter(x=>x.used).length,notUsed:students.filter(x=>!x.used).length},students});
  }catch(e){console.error('AI PRACTICE USAGE FAILED',e.message);res.status(503).json({error:'Practice usage report is temporarily unavailable.'})}
 });

 return {ensureSchema,start,event,turn,end};
}

module.exports={createEvidenceStore,goalsFor,observedVocabulary,words};