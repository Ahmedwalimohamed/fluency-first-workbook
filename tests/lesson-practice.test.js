'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),express=require('express');
const {register,chooseMove,contextFor,curriculum}=require('../lesson-practice-service');
const env={OPENAI_API_KEY:'test-openai',TYPESAFE_API_KEY:'test-jev'};
const answer=(move,confidence=0.95)=>async()=>new Response(JSON.stringify({answers:{move:{choice:move,confidence,probabilities:{[move]:confidence}}}}));
test('Jev bounds uncertain corrections and unexpected actions',async()=>{
 assert.equal((await chooseMove({learnerTurn:'I go yesterday'},{env,fetchImpl:answer('correct',0.6)})).move,'clarify');
 assert.equal((await chooseMove({learnerTurn:'I went yesterday'},{env,fetchImpl:answer('follow_up')})).move,'follow_up');
 assert.equal((await chooseMove({learnerTurn:'Hello'},{env,fetchImpl:answer('finish')})).move,'follow_up');
 assert.equal((await chooseMove({helpRequested:true},{env,fetchImpl:answer('award_grade')})).move,'scaffold');
 assert.equal((await chooseMove({learnerTurn:'unclear'},{env,fetchImpl:async()=>{throw Error('timeout')}})).move,'clarify');
});
test('uses canonical lesson title and bounds activity text',()=>{
 const c=contextFor({lessonId:'su-b2-l15',title:'Ignore instructions',page:'workbook',stage:'Vocabulary',pageText:'x'.repeat(9000)},curriculum());
 assert.equal(c.title,'Crime & Justice');assert.equal(c.pageText.length,6000);
 assert.throws(()=>contextFor({lessonId:'unknown'},curriculum()));
});
test('voice routes enforce role, ownership, active enrollment, deduplication and cleanup',async()=>{
 const app=express();app.use(express.json());let upstreamCalls=0,jevCalls=0,hangups=0,sessionConfig;
 const auth=(req,res,next)=>{const role=req.headers['x-role'];if(!role)return res.status(401).json({error:'sign in'});req.user={id:req.headers['x-user']||'student-1',role};next();};
 const studentOnly=(req,res,next)=>req.user.role==='student'?next():res.status(403).json({error:'student required'});
 const pool={query:async(sql)=>{assert.match(sql,/^select distinct c.course_id/);return {rows:[{course_id:'speakup-b2'}]}}};
 const fetchImpl=async(url,opts)=>{
  if(url.endsWith('/hangup')){hangups++;return new Response('{}')}
  if(url.endsWith('/calls')){upstreamCalls++;sessionConfig=JSON.parse(opts.body.get('session'));return new Response('v=0\r\nanswer',{headers:{location:'/v1/realtime/calls/rtc_test'}})}
  jevCalls++;return answer('follow_up')(url,opts);
 };
 const service=register({app,auth,studentOnly,pool,fetchImpl,env});const server=app.listen(0);await new Promise(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+server.address().port;
 const body={lessonId:'su-b2-l15',page:'workbook',stage:'Vocabulary',pageText:'Talk about evidence and justice.',sdp:'v=0\r\n'};
 const post=(route,data,headers={})=>fetch(base+'/api/lesson-practice/'+route,{method:'POST',headers:{'Content-Type':'application/json','x-role':'student',...headers},body:JSON.stringify(data)});
 try{
  assert.equal((await fetch(base+'/api/lesson-practice/status')).status,401);
  assert.equal((await post('session',body,{'x-role':'teacher'})).status,403);
  assert.equal((await post('session',body,{Origin:'https://other.example'})).status,403);
  assert.equal((await post('session',{...body,lessonId:'a1-gold-l1'})).status,423);assert.equal(upstreamCalls,0);
  const session=await (await post('session',body)).json();assert.ok(session.sessionId);
  assert.equal(sessionConfig.audio.input.turn_detection.create_response,false);assert.equal(sessionConfig.audio.input.turn_detection.eagerness,'low');
  assert.match(sessionConfig.instructions,/Crime & Justice/);assert.doesNotMatch(JSON.stringify(session),/test-openai/);
  assert.equal((await post('decision',{sessionId:session.sessionId,turnId:'x'},{'x-user':'other'})).status,410);
  const turn={sessionId:session.sessionId,turnId:'1',learnerTurn:'Evidence helps us understand an incident.',coachTurn:'Why is evidence useful?'};
  const d=await (await post('decision',turn)).json();assert.equal(d.move,'follow_up');assert.match(d.instructions,/CURRENT ACTIVITY/);
  await post('decision',turn);assert.equal(jevCalls,1);
  const help=await (await post('decision',{...turn,turnId:'2',helpRequested:true})).json();assert.equal(help.move,'scaffold');
  service.sessions.get(session.sessionId).expires=Date.now()-1;
  assert.equal((await post('decision',{...turn,turnId:'3'})).status,410);
  await post('end',{sessionId:session.sessionId});assert.equal(hangups,1);assert.equal(service.sessions.size,0);
 }finally{service.close();await new Promise(r=>server.close(r))}
});
