'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createEvidenceStore}=require('../lesson-practice-evidence');

function makeHarness(){
  const routes=new Map();
  const app={
    get:(p,...h)=>routes.set('GET '+p,h),
    post:(p,...h)=>routes.set('POST '+p,h),
    patch:(p,...h)=>routes.set('PATCH '+p,h),
  };
  const now=Date.now();
  const state={
    classRow:{id:'class-1',name:'B2 Live',course_id:'speakup-b2',teacher_id:'teacher-1'},
    students:[{id:'student-1',name:'Amina'}],
    rounds:[],sessions:[],turns:[],decisions:[],transfers:[]
  };
  const rows=(xs)=>({rows:xs,rowCount:xs.length});
  const pool={query:async(sql,params=[])=>{
    const q=String(sql).replace(/\s+/g,' ').trim().toLowerCase();
    if(q.startsWith('create table')||q.includes('create table if not exists ai_practice_sessions'))return rows([]);
    if(q.startsWith('select c.id from classes c join enrollments'))return rows([{id:'class-1'}]);
    if(q.startsWith('select c.id,c.name,c.course_id from classes c where c.teacher_id='))return rows([state.classRow]);
    if(q.startsWith('select id,name from classes where id='))return rows(params[0]==='class-1'&&params[1]==='teacher-1'?[{id:'class-1',name:'B2 Live'}]:[]);
    if(q.startsWith('select 1 from classes where id='))return rows(params[0]==='class-1'&&params[1]==='teacher-1'?[{ok:1}]:[]);
    if(q.startsWith('select 1 from classes c join enrollments e'))return rows(params[0]==='class-1'&&params[1]==='teacher-1'&&params[2]==='student-1'?[{ok:1}]:[]);

    if(q.startsWith("update ai_practice_rounds set status='ended',ended_at=coalesce(ended_at,now()) where teacher_id=")){
      state.rounds.forEach(r=>{if(r.teacher_id===params[0]&&r.class_id===params[1]&&r.lesson_id===params[2]&&r.status==='active'){r.status='ended';r.ended_at=new Date()}});return rows([]);
    }
    if(q.startsWith('insert into ai_practice_rounds')){
      const [id,teacherId,classId,lessonId,duration]=params;const r={id,teacher_id:teacherId,class_id:classId,lesson_id:lessonId,status:'active',started_at:new Date(),ends_at:new Date(Date.now()+Number(duration)*1000),ended_at:null,created_at:new Date()};state.rounds.push(r);return rows([r]);
    }
    if(q.startsWith('select * from ai_practice_rounds where teacher_id=')){
      const found=state.rounds.filter(r=>r.teacher_id===params[0]&&r.class_id===params[1]&&r.lesson_id===params[2]).sort((a,b)=>b.started_at-a.started_at)[0];return rows(found?[found]:[]);
    }
    if(q.startsWith('select r.* from ai_practice_rounds r join enrollments e')){
      const found=state.rounds.filter(r=>r.class_id==='class-1'&&r.status==='active'&&!r.ended_at&&r.ends_at>Date.now()).sort((a,b)=>b.started_at-a.started_at)[0];return rows(found?[found]:[]);
    }
    if(q.startsWith("update ai_practice_rounds set ends_at=least")){
      const r=state.rounds.find(x=>x.id===params[0]&&x.teacher_id===params[1]&&x.status==='active'&&!x.ended_at);if(!r)return rows([]);r.ends_at=new Date(Math.min(r.ends_at.getTime()+Number(params[2])*60000,r.started_at.getTime()+600000));return rows([r]);
    }
    if(q.startsWith("update ai_practice_rounds set status='ended',ended_at=coalesce(ended_at,now()) where id=")){
      const r=state.rounds.find(x=>x.id===params[0]&&x.teacher_id===params[1]);if(!r)return rows([]);r.status='ended';r.ended_at=r.ended_at||new Date();return rows([r]);
    }

    if(q.startsWith('insert into ai_practice_sessions')){
      const [id,studentId,classId,lessonId,page,stage]=params;if(!state.sessions.find(s=>s.id===id))state.sessions.push({id,student_id:studentId,class_id:classId,lesson_id:lessonId,page,stage,started_at:new Date(),last_event_at:new Date(),ended_at:null,status:'starting',turn_count:0,word_count:0,short_answer_count:0,help_count:0,uncertain_count:0,vocabulary_used:[],goal_evidence:{},technical_issue:null});return rows([]);
    }
    if(q.startsWith('update ai_practice_sessions set status=')){
      const s=state.sessions.find(x=>x.id===params[0]&&x.student_id===params[1]);if(s){s.status=params[2];s.last_event_at=new Date();if(params[3])s.technical_issue=params[3]}return rows([]);
    }
    if(q.startsWith('insert into ai_practice_turns')){
      if(state.turns.find(t=>t.session_id===params[0]&&t.turn_id===params[1]))return rows([]);
      state.turns.push({session_id:params[0],turn_id:params[1],learner_text:params[2],coach_text:params[3],word_count:params[4],goal_id:params[9],goal_confidence:params[10]});return rows([{id:state.turns.length}]);
    }
    if(q.startsWith('update ai_practice_sessions set turn_count=turn_count+1')){
      const s=state.sessions.find(x=>x.id===params[0]&&x.student_id===params[1]);if(s){s.turn_count+=1;s.word_count+=Number(params[2]);s.short_answer_count+=Number(params[3]);s.help_count+=Number(params[4]);s.uncertain_count+=Number(params[5]);s.vocabulary_used=[...new Set([...s.vocabulary_used,...(params[6]||[])])];s.goal_evidence={...s.goal_evidence,...JSON.parse(params[7]||'{}')};s.last_event_at=new Date();s.status='ready'}return rows([]);
    }
    if(q.startsWith('update ai_practice_sessions set ended_at=coalesce')){
      const s=state.sessions.find(x=>x.id===params[0]&&x.student_id===params[1]);if(s){s.ended_at=s.ended_at||new Date();s.last_event_at=new Date();s.status='finished'}return rows([]);
    }
    if(q.startsWith('select * from ai_practice_sessions where student_id=')){
      const found=state.sessions.filter(s=>s.student_id===params[0]&&(!params[1]||s.id===params[1])).sort((a,b)=>b.started_at-a.started_at)[0];return rows(found?[found]:[]);
    }

    if(q.includes('from classes c join enrollments e on e.class_id=c.id join users u on u.id=e.user_id')&&q.includes('left join lateral')){
      const roundId=params[5]||null;const round=state.rounds.find(r=>r.id===roundId)||state.rounds.at(-1);const s=state.sessions.filter(x=>x.student_id==='student-1'&&x.class_id==='class-1'&&x.lesson_id===params[2]&&(!round||x.started_at>=round.started_at)&&(!round||x.started_at<=(round.ended_at||round.ends_at))).sort((a,b)=>b.started_at-a.started_at)[0];
      const t=state.transfers.filter(x=>x.student_id==='student-1'&&x.lesson_id===params[2]&&String(x.round_id||'')===String(roundId||'')).at(-1);
      return rows([{student_id:'student-1',name:'Amina',class_id:'class-1',class_name:'B2 Live',...(s?{session_id:s.id,started_at:s.started_at,last_event_at:s.last_event_at,ended_at:s.ended_at,status:s.status,turn_count:s.turn_count,word_count:s.word_count,short_answer_count:s.short_answer_count,help_count:s.help_count,uncertain_count:s.uncertain_count,vocabulary_used:s.vocabulary_used,goal_evidence:s.goal_evidence,technical_issue:s.technical_issue}:{session_id:null}),transfer_status:t?.status||null,transfer_note:t?.note||null}]);
    }

    if(q.startsWith('select action,recommendation,edited_text,created_at,round_id from ai_teacher_decisions')){
      const d=state.decisions.filter(x=>x.teacher_id===params[0]&&x.class_id===params[1]&&x.lesson_id===params[2]&&String(x.round_id||'')===String(params[3]||'')).at(-1);return rows(d?[d]:[]);
    }
    if(q.startsWith('insert into ai_teacher_decisions')){
      state.decisions.push({teacher_id:params[0],class_id:params[1],lesson_id:params[2],round_id:params[3],recommendation_key:params[4],action:params[5],recommendation:JSON.parse(params[6]),edited_text:params[7],created_at:new Date()});return rows([]);
    }

    if(q.startsWith('select id from ai_transfer_evidence')){
      const t=state.transfers.find(x=>x.teacher_id===params[0]&&x.class_id===params[1]&&x.student_id===params[2]&&x.lesson_id===params[3]&&String(x.round_id||'')===String(params[4]||''));return rows(t?[{id:t.id}]:[]);
    }
    if(q.startsWith('insert into ai_transfer_evidence')){
      state.transfers.push({id:state.transfers.length+1,teacher_id:params[0],class_id:params[1],student_id:params[2],lesson_id:params[3],round_id:params[4],status:params[5],note:params[6],observed_at:new Date()});return rows([]);
    }
    if(q.startsWith('update ai_transfer_evidence set status=')){
      const t=state.transfers.find(x=>x.id===params[0]);if(t){t.status=params[1];t.note=params[2];t.observed_at=new Date()}return rows([]);
    }

    if(q.includes('from enrollments e join users u on u.id=e.user_id')&&q.includes('left join ai_practice_sessions s')){
      const lessonId=params[2]||null;const ss=state.sessions.filter(s=>s.student_id==='student-1'&&s.class_id==='class-1'&&(!lessonId||s.lesson_id===lessonId));const seconds=ss.reduce((n,s)=>n+Math.min(300,Math.max(0,((s.ended_at||s.last_event_at)-s.started_at)/1000)),0);return rows([{student_id:'student-1',name:'Amina',sessions:ss.length,turns:ss.reduce((n,s)=>n+s.turn_count,0),words:ss.reduce((n,s)=>n+s.word_count,0),last_practice_at:ss.at(-1)?.started_at||null,seconds}]);
    }
    throw new Error('Unhandled proof-test query: '+q.slice(0,180));
  }};
  const auth=(req,res,next)=>next();
  const access={courseIdFromLesson:id=>String(id).startsWith('su-b2-')?'speakup-b2':null};
  const lessons=new Map();
  const store=createEvidenceStore({app,auth,pool,access,lessons});

  async function invoke(method,path,req={}){
    const handlers=routes.get(method+' '+path);assert.ok(handlers,'route exists: '+method+' '+path);
    const out={statusCode:200,headers:{},body:null};
    const res={status(n){out.statusCode=n;return this},set(k,v){out.headers[k]=v;return this},json(v){out.body=v;return this}};
    let i=0;const next=async()=>{const h=handlers[i++];if(h)await h(req,res,next)};await next();return out;
  }
  const teacher=(extra={})=>({user:{id:'teacher-1',role:'teacher'},body:{},query:{},params:{},get:()=>'',...extra});
  const student=(extra={})=>({user:{id:'student-1',role:'student'},body:{},query:{},params:{},get:()=>'',...extra});
  return {state,store,invoke,teacher,student};
}

test('teacher-started Live Task AI Conversation completes the evidence-to-transfer loop',async()=>{
  const h=makeHarness();
  const start=await h.invoke('POST','/api/lesson-practice/teacher/round/start',h.teacher({body:{lessonId:'su-b2-l1',classId:'class-1',durationSeconds:300}}));
  assert.equal(start.statusCode,200);assert.equal(start.body.round.status,'active');assert.equal(start.body.round.remainingSeconds>0,true);
  const roundId=start.body.round.id;

  const invite=await h.invoke('GET','/api/lesson-practice/student/round',h.student());
  assert.equal(invite.statusCode,200);assert.equal(invite.body.round.id,roundId);assert.equal(invite.body.round.lessonId,'su-b2-l1');

  await h.store.start({id:'session-1',userId:'student-1',courseId:'speakup-b2',context:{lessonId:'su-b2-l1',page:'workbook',stage:'AI Conversation'}});
  await h.store.event({id:'session-1',userId:'student-1',type:'speaking'});
  await h.store.turn({id:'session-1',userId:'student-1',turnId:'turn-1',learnerTurn:'I work on community projects, and what kind of work do you do?',coachTurn:'I work with learners. What do you enjoy about your projects?',decision:{move:'follow_up',source:'jev',confidence:.95,goal:'follow_up',goalConfidence:.95},helpRequested:false,context:{lessonId:'su-b2-l1',vocabulary:['project','coordinate']}});
  await h.store.end('session-1','student-1');

  const feedback=await h.invoke('GET','/api/lesson-practice/student/feedback',h.student({query:{sessionId:'session-1'}}));
  assert.equal(feedback.statusCode,200);assert.equal(feedback.body.feedback.lessonId,'su-b2-l1');assert.ok(feedback.body.feedback.didWell);assert.ok(Array.isArray(feedback.body.feedback.goalEvidence));

  const live=await h.invoke('GET','/api/lesson-practice/teacher/live',h.teacher({query:{lessonId:'su-b2-l1',classId:'class-1'}}));
  assert.equal(live.statusCode,200);assert.equal(live.body.round.id,roundId);assert.equal(live.body.students[0].name,'Amina');assert.equal(live.body.students[0].turns,1);assert.equal(live.body.students[0].goals.follow_up.status,'observed');assert.ok(live.body.decision);

  const save=await h.invoke('POST','/api/lesson-practice/teacher/decision',h.teacher({body:{lessonId:'su-b2-l1',classId:'class-1',roundId,action:'use',recommendation:live.body.decision,editedText:''}}));
  assert.equal(save.statusCode,200);assert.equal(h.state.decisions.length,1);

  const ended=await h.invoke('PATCH','/api/lesson-practice/teacher/round/:id/end',h.teacher({params:{id:roundId},body:{}}));
  assert.equal(ended.statusCode,200);assert.equal(ended.body.round.status,'ended');

  const transfer=await h.invoke('POST','/api/lesson-practice/teacher/transfer',h.teacher({body:{lessonId:'su-b2-l1',classId:'class-1',studentId:'student-1',roundId,status:'observed'}}));
  assert.equal(transfer.statusCode,200);assert.match(transfer.body.consolidation,/normal workbook/i);

  const usage=await h.invoke('GET','/api/lesson-practice/teacher/usage',h.teacher({query:{classId:'class-1',lessonId:'su-b2-l1',days:'7'}}));
  assert.equal(usage.statusCode,200);assert.equal(usage.body.counts.total,1);assert.equal(usage.body.counts.used,1);assert.equal(usage.body.students[0].used,true);
});
