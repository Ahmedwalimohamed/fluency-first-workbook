'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
let JSDOM;try{({JSDOM}=require('jsdom'))}catch{}
const tick=()=>new Promise(r=>setTimeout(r,10));
test('voice lifecycle: current activity, spoken turn, page change and late microphone permission',{skip:!JSDOM},async()=>{
 const dom=new JSDOM('<main id="content"><div class="b2-microflow" data-phase="choose" data-step="2"><div class="micro-top">Crime &amp; Justice</div><main class="micro-stage">What can evidence tell us about an incident?</main></div></main>',{url:'https://englishgate.test',runScripts:'outside-only'});
 const w=dom.window,requests=[],sent=[];let stopped=0,pendingPermission=false,grant;
 Object.defineProperty(w,'isSecureContext',{value:true});w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'))};w.HTMLMediaElement.prototype.pause=function(){};w.HTMLMediaElement.prototype.play=async()=>{};
 const track={enabled:true,stop:()=>stopped++},stream={getTracks:()=>[track],getAudioTracks:()=>[track]};
 Object.defineProperty(w.navigator,'mediaDevices',{value:{getUserMedia:async()=>pendingPermission?new Promise(r=>grant=()=>r(stream)):stream}});
 let channel;w.RTCPeerConnection=class{constructor(){this.connectionState='new'}addTrack(){}createDataChannel(){channel={readyState:'open',send:x=>sent.push(JSON.parse(x)),close(){this.readyState='closed'}};return channel}async createOffer(){return{sdp:'v=0'}}async setLocalDescription(){}async setRemoteDescription(){setTimeout(()=>channel.onopen?.(),0)}close(){this.connectionState='closed'}};
 w.fetch=async(url,opts={})=>{const body=opts.body?JSON.parse(opts.body):{};requests.push({url,body});let data={ok:true};if(url.endsWith('/status'))data={available:true};if(url.endsWith('/session'))data={sessionId:'test-session',sdp:'v=0',instructions:'CURRENT ACTIVITY: Crime & Justice'};if(url.endsWith('/decision'))data={move:'follow_up',instructions:'Follow up on evidence.',finish:false};return{ok:true,json:async()=>data}};
 w.eval("var session={id:'learner',role:'student'},currentPage='workbook',currentStep='grammar';function lesson(){return{id:'su-b2-l15',title:'Crime & Justice'}}");
 const click=text=>{const b=[...w.document.querySelectorAll('button')].find(x=>x.textContent===text);assert.ok(b,text+' exists');b.click()};
 const emit=x=>channel.onmessage({data:JSON.stringify(x)});
 try{
  w.eval(fs.readFileSync(path.resolve(__dirname,'../public/assets/lesson-practice.js'),'utf8'));
  click('Help me practise');assert.equal(w.document.querySelectorAll('dialog input,dialog textarea').length,0);
  click('Start speaking');await tick();assert.ok(sent.length);assert.match(sent[0].response.instructions,/CURRENT ACTIVITY: Crime/);
  const sessionRequest=requests.find(x=>x.url.endsWith('/session')).body;assert.equal(sessionRequest.lessonId,'su-b2-l15');assert.match(sessionRequest.stage,/choose.*Activity 2/);assert.match(sessionRequest.pageText,/evidence/);assert.doesNotMatch(sessionRequest.pageText,/Help me practise/);
  emit({type:'response.created'});emit({type:'response.output_audio_transcript.done',transcript:'Why is evidence useful?'});emit({type:'response.done',response:{status:'completed'}});emit({type:'output_audio_buffer.stopped'});
  click('Pause microphone');assert.equal(track.enabled,false);click('Resume microphone');assert.equal(track.enabled,true);
  emit({type:'input_audio_buffer.speech_started'});emit({type:'conversation.item.input_audio_transcription.completed',item_id:'turn1',transcript:'Evidence helps us find the facts.'});await tick();
  assert.equal(sent.filter(x=>x.type==='response.create').length,2);assert.match(requests.find(x=>x.url.endsWith('/decision')).body.learnerTurn,/find the facts/);
  emit({type:'conversation.item.input_audio_transcription.completed',item_id:'turn1',transcript:'duplicate'});await tick();assert.equal(requests.filter(x=>x.url.endsWith('/decision')).length,1);
  w.document.querySelector('.b2-microflow').dataset.step='3';await tick();assert.equal(stopped,1);assert.equal(w.document.querySelectorAll('dialog[open]').length,0);
  pendingPermission=true;click('Help me practise');click('Start speaking');await tick();assert.ok(grant);click('Close');grant();await tick();assert.equal(stopped,2);
  w.eval("session.role='teacher'");w.document.querySelector('.b2-microflow').dataset.step='4';await tick();assert.equal(w.document.querySelector('[data-lesson-practise]'),null);
 }finally{w.close()}
});
