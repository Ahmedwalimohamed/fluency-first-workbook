'use strict';
// Optional browser lifecycle suite: npm install --no-save playwright, then node --test this file.
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('path'),fs=require('fs');
let chromium;try{({chromium}=require('playwright'))}catch{}
test('voice UI follows B2 activity and releases microphone, including late permission grants',{skip:!chromium||!fs.existsSync(chromium.executablePath())},async()=>{
 const browser=await chromium.launch({headless:true,executablePath:chromium.executablePath(),args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:390,height:844}}),requests=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://localhost:4178/**',async route=>{
  const url=new URL(route.request().url());if(url.pathname==='/'){return route.fulfill({contentType:'text/html',body:'<main id="content"><div class="b2-microflow" data-phase="choose" data-step="2"><div class="micro-top"><strong>Crime &amp; Justice</strong></div><main class="micro-stage"><h2>Use evidence in a conversation</h2><p>What can evidence tell us about an incident?</p></main></div></main><div id="loginScreen" hidden></div>'})}
  const data=route.request().postDataJSON();requests.push({url:url.pathname,data});
  let body={ok:true};if(url.pathname.endsWith('/status'))body={available:true};
  if(url.pathname.endsWith('/session'))body={sessionId:'test-session',sdp:'v=0',instructions:'CURRENT ACTIVITY: Crime & Justice. Ask one question.'};
  if(url.pathname.endsWith('/decision'))body={move:'follow_up',instructions:'CURRENT ACTIVITY: Crime & Justice. Ask one follow-up.',finish:false};
  return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
 });
 try{
  await page.goto('http://localhost:4178');
  await page.addScriptTag({content:`let session={id:'learner',role:'student'},currentPage='workbook',currentStep='grammar';function lesson(){return {id:'su-b2-l15',title:'Crime & Justice'}};
   window.stopped=0;window.sent=[];window.pendingPermission=false;window.fakeStream={getTracks:()=>[{stop:()=>window.stopped++}],getAudioTracks:()=>[{enabled:true,stop:()=>window.stopped++}]};
   navigator.mediaDevices.getUserMedia=async()=>window.pendingPermission?new Promise(r=>window.grant=()=>r(window.fakeStream)):window.fakeStream;
   window.RTCPeerConnection=class {constructor(){this.connectionState='new'}addTrack(){}createDataChannel(){window.channel={readyState:'open',send:x=>window.sent.push(JSON.parse(x)),close(){this.readyState='closed'}};return window.channel}async createOffer(){return {sdp:'v=0'}}async setLocalDescription(){}async setRemoteDescription(){setTimeout(()=>window.channel.onopen?.(),0)}close(){this.connectionState='closed'}};`});
  await page.addScriptTag({path:path.resolve(__dirname,'../public/assets/lesson-practice.js')});
  await page.getByRole('button',{name:'Help me practise',exact:true}).click();assert.equal(await page.locator('dialog textarea,dialog input').count(),0);
  await page.getByRole('button',{name:'Start speaking',exact:true}).click();await page.getByRole('button',{name:'End practice',exact:true}).waitFor();
  await page.waitForFunction(()=>window.sent.some(x=>x.type==='response.create'));
  assert.match(await page.evaluate(()=>window.sent[0].response.instructions),/CURRENT ACTIVITY: Crime/);
  const sessionRequest=requests.find(x=>x.url.endsWith('/session')).data;assert.equal(sessionRequest.lessonId,'su-b2-l15');assert.match(sessionRequest.stage,/choose.*Activity 2/);assert.match(sessionRequest.pageText,/evidence/);assert.doesNotMatch(sessionRequest.pageText,/Help me practise/);
  await page.evaluate(()=>{const emit=x=>channel.onmessage({data:JSON.stringify(x)});emit({type:'response.created'});emit({type:'response.output_audio_transcript.done',transcript:'Why is evidence useful?'});emit({type:'response.done',response:{status:'completed'}});emit({type:'output_audio_buffer.stopped'});emit({type:'input_audio_buffer.speech_started'});emit({type:'conversation.item.input_audio_transcription.completed',item_id:'turn1',transcript:'Evidence helps us find the facts.'});});
  await page.waitForFunction(()=>window.sent.filter(x=>x.type==='response.create').length===2);
  assert.match(requests.find(x=>x.url.endsWith('/decision')).data.learnerTurn,/find the facts/);
  await page.evaluate(()=>document.querySelector('.b2-microflow').dataset.step='3');
  await page.waitForFunction(()=>window.stopped===1);assert.equal(await page.locator('dialog[open]').count(),0);
  await page.getByRole('button',{name:'Help me practise',exact:true}).click();await page.evaluate(()=>window.pendingPermission=true);
  await page.getByRole('button',{name:'Start speaking',exact:true}).click();await page.waitForFunction(()=>typeof window.grant==='function');
  await page.getByRole('button',{name:'Close',exact:true}).click();await page.evaluate(()=>window.grant());await page.waitForFunction(()=>window.stopped===2);
  await page.evaluate(()=>{session.role='teacher';document.querySelector('.b2-microflow').dataset.step='4'});
  await page.waitForFunction(()=>!document.querySelector('[data-lesson-practise]'));assert.deepEqual(errors,[]);
 }finally{await browser.close()}
});
