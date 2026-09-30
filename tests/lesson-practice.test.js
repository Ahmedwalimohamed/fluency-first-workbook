'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),express=require('express');
const {register,chooseMove,contextFor,curriculum,offerSdp,checkConfiguration,providerFailure,checkHandshake}=require('../lesson-practice-service');
const env={OPENAI_API_KEY:'test-openai',TYPESAFE_API_KEY:'test-jev'};
const answer=(move,confidence=0.95)=>async()=>new Response(JSON.stringify({answers:{move:{choice:move,confidence,probabilities:{[move]:confidence}}}}));
test('preserves WebRTC offer bytes and final CRLF; rejects oversized offers instead of truncating',()=>{
 const sdp='v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\ns=-\r\na=ice-ufrag:abc\r\n';
 assert.equal(offerSdp(sdp),sdp);assert.equal(offerSdp('v=0\r\n'+'x'.repeat(40000)+'\r\n').length,40007);
 assert.throws(()=>offerSdp('v=0\r\n'+'x'.repeat(65000)));assert.throws(()=>offerSdp('bad offer'));
});
test('configuration check reports rejection safely and never logs credentials or ephemeral secrets',async()=>{
 const logs=[],log=x=>logs.push(x);
 const result=await checkConfiguration({env,log,fetchImpl:async(url,options)=>{
  assert.match(url,/client_secrets$/);const body=JSON.parse(options.body);assert.equal(body.session.audio.input.turn_detection.eagerness,'low');
  return new Response(JSON.stringify({error:{type:'invalid_request_error',code:'unknown_parameter',param:'session.audio.input',message:'private message sk-proj-secret'}}),{status:400});
 }});
 assert.equal(result.ok,false);assert.equal(result.param,'session.audio.input');assert.doesNotMatch(logs.join(' '),/sk-proj-secret|private message|test-openai/);
 const good=await checkConfiguration({env,log,fetchImpl:async()=>new Response(JSON.stringify({value:'ek-private-secret'}))});assert.equal(good.ok,true);assert.doesNotMatch(logs.join(' '),/ek-private-secret/);
 const error=await providerFailure(new Response(JSON.stringify({error:{code:'invalid_api_key',param:'sk-proj-secret private'}}),{status:401}));assert.equal(error.param,null);
});
test('synthetic handshake uses the same request as learners and always closes the call',async()=>{
 const calls=[],logs=[];const result=await checkHandshake({env,log:x=>logs.push(x),fetchImpl:async(url,options)=>{
  calls.push(url);if(url.endsWith('/hangup'))return new Response('{}');
  const sdp=options.body.get('sdp');assert.match(sdp,/m=audio/);assert.match(sdp,/m=application/);assert.match(sdp,/OPUS\/48000\/2/i);assert.ok(sdp.endsWith('\r\n'));
  assert.equal(JSON.parse(options.body.get('session')).audio.input.turn_detection.create_response,false);
  return new Response('v=0\r\nanswer\r\n',{headers:{location:'/v1/realtime/calls/rtc_probe'}});
 }});
 assert.equal(result.ok,true);assert.equal(calls.length,2);assert.ok(calls[1].endsWith('/rtc_probe/hangup'));assert.doesNotMatch(logs.join(' '),/test-openai|ice-pwd/);
});
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
  if(url.endsWith('/calls')){upstreamCalls++;assert.equal(opts.body.get('sdp'),'v=0\r\n');sessionConfig=JSON.parse(opts.body.get('session'));return new Response('v=0\r\nanswer',{headers:{location:'/v1/realtime/calls/rtc_test'}})}
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
  const d=await (await post('decision',turn)).json();assert.equal(d.move,'follow_up');assert.match(d.instructions,/CURRENT ACTIVITY/);assert.doesNotMatch(d.instructions,/CURRENT ACTIVITY DATA/);assert.equal(session.maxMinutes,5);assert.equal(sessionConfig.model,'gpt-realtime-2.1-mini');assert.equal(sessionConfig.max_output_tokens,180);assert.equal(sessionConfig.truncation.token_limits.post_instructions,4000);
  await post('decision',turn);assert.equal(jevCalls,1);
  const help=await (await post('decision',{...turn,turnId:'2',helpRequested:true})).json();assert.equal(help.move,'scaffold');
  service.sessions.get(session.sessionId).expires=Date.now()-1;
  assert.equal((await post('decision',{...turn,turnId:'3'})).status,410);
  await post('end',{sessionId:session.sessionId});assert.equal(hangups,1);assert.equal(service.sessions.size,0);
 }finally{service.close();await new Promise(r=>server.close(r))}
});
