/* Current-activity voice practice. Coach replay is held in browser memory only; no learner recordings. */
(function(){
 'use strict';
 const clean=(x,n=6000)=>String(x||'').replace(/\s+/g,' ').trim().slice(0,n);
 const pageKey=c=>c?[c.userId,c.lessonId,c.page,c.stageId,c.stage].join(':'):'';
 if(typeof module!=='undefined'&&module.exports){module.exports={clean,pageKey};return;}
 const content=document.getElementById('content');if(!content)return;
 let dialog,launcher,key='',context,pc,dc,microphone,audio,sessionId='',request,generation=0,timer,idleTimer,connectTimer,transcriptTimer;
 let recorder,replayUrl='',replayAudio,replaying=false,recordingComplete=false;
 let status,start,mute,help,repeat,end,play,caption,orb,coachTurn='',baseInstructions='',connected=false,muted=false,responding=false,deciding=false,finished=false,speechActive=false,awaitingTranscript=0,pending=[],captionParts=new Map(),seenTurns=new Set();
 function current(){
  if(typeof session==='undefined'||session?.role!=='student'||typeof currentPage==='undefined')return null;
  let l,stageId;
  if(currentPage==='workbook'){l=lesson();stageId=currentStep;}
  else if(currentPage==='student-live-lesson'){
   const c=studentClass(session.id),live=liveBookForClass(c),selected=live?.lessons?.find(x=>x.number===activeStudentLiveLessonNumber);
   if(!selected)return null;
   l=workbookForClass(c)?.lessons?.find(x=>x.number===selected.number);stageId=activeStudentSectionIndex;
  }else return null;
  if(!l?.id)return null;
  const surface=content.querySelector('.b2-microflow')||content.querySelector('#activityPanel')||content.querySelector('.live-book-content');
  if(!surface)return null;
  const heading=content.querySelector('#workbookStageTitle,#liveStageTitle');
  const phase=surface.dataset.phase,step=surface.dataset.step;
  const stage=clean([heading?.textContent,phase,step?'Activity '+step:''].filter(Boolean).join(' · '),180);
  const activity=surface.querySelector('.micro-stage')||surface;
  return {userId:session.id,lessonId:l.id,title:l.title,page:currentPage,stageId:stageId+':'+(step||''),stage:stage||String(stageId),pageText:clean(activity.innerText||activity.textContent)};
 }
 function el(tag,text,cls){const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;}
 function button(label,fn,primary=false){const b=el('button',label,primary?'eg-practise-primary':'eg-practise-control');b.type='button';b.onclick=fn;return b;}
 const style=el('style');style.textContent=`
 .eg-practise-button{border:1px solid #bccfd5;border-radius:999px;background:#eaf4f1;color:#174f4b;padding:11px 17px;font:600 14px/1.4 system-ui;cursor:pointer;white-space:nowrap}.eg-practise-button:hover{background:#dcece7}.b2-microflow .micro-top .eg-practise-button{grid-column:1/-1;justify-self:end}
 .eg-practise-dialog{border:1px solid #d5e1df;border-radius:24px;padding:0;width:min(500px,calc(100vw - 24px));max-width:none;max-height:calc(100dvh - 32px);background:#fcfcf9;color:#183b38;box-shadow:0 28px 90px #102d3633;overflow:auto;font:16px/1.55 system-ui}.eg-practise-dialog::backdrop{background:#15343580;backdrop-filter:blur(3px)}
 .eg-practise-head{display:flex;align-items:center;justify-content:space-between;padding:18px 24px;border-bottom:1px solid #e0e8e4}.eg-practise-head strong{font-size:15px;letter-spacing:-.02em}.eg-practise-control{border:1px solid #d4e1db;border-radius:12px;background:#fff;color:#244f48;padding:10px 14px;font:600 13px system-ui;cursor:pointer}.eg-practise-body{padding:26px;text-align:center}.eg-practise-kicker{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#647c74}.eg-practise-body h2{font:normal 30px/1.2 Georgia,serif;margin:10px 0;color:#173f38}.eg-practise-stage{font-size:13px;color:#667c74;margin:8px 0 24px}.eg-practise-orb{width:100px;height:100px;display:grid;place-items:center;margin:22px auto;border-radius:50%;background:radial-gradient(circle at 35% 25%,#dcefe4,#9ecab8 65%,#7caf9d);box-shadow:0 0 0 12px #edf3ec;color:#245c4c;font-size:34px}.eg-practise-orb[data-state=speaking]{animation:eg-voice-breathe 1.6s ease-in-out infinite}.eg-practise-orb[data-state=listening]{box-shadow:0 0 0 12px #e1eee8}.eg-practise-status{font-size:15px;min-height:48px;margin:25px 0 14px}.eg-practise-caption{font-size:15px;line-height:1.65;text-align:left;background:#f0f4ed;padding:16px 18px;border-radius:14px;max-height:155px;overflow:auto;white-space:pre-wrap}.eg-practise-caption:empty{display:none}.eg-practise-actions{display:flex;justify-content:center;flex-wrap:wrap;gap:9px;margin-top:20px}.eg-practise-primary{border:0;border-radius:13px;background:#20594d;color:#fff;padding:14px 25px;font:600 15px system-ui;cursor:pointer}.eg-practise-note{color:#72827a;font-size:12px;padding:0 26px 23px;text-align:center}.eg-practise-dialog button:disabled{opacity:.45;cursor:default}.eg-practise-dialog button:focus-visible,.eg-practise-button:focus-visible{outline:3px solid #6fa793;outline-offset:3px}.eg-practise-dialog [hidden]{display:none!important}@keyframes eg-voice-breathe{50%{transform:scale(1.055);box-shadow:0 0 0 17px #e1eee8}}@media(prefers-reduced-motion:reduce){.eg-practise-orb{animation:none!important}}`;
 document.head.append(style);
 function controls(){
  if(!start)return;start.hidden=connected;start.disabled=Boolean(request)&&!connected;
  mute.hidden=help.hidden=repeat.hidden=end.hidden=!connected;
  mute.textContent=muted?'Resume microphone':'Pause microphone';mute.setAttribute('aria-pressed',String(muted));
  help.disabled=repeat.disabled=!connected||responding||deciding||finished;repeat.disabled=repeat.disabled||!replayUrl||replaying;help.disabled=help.disabled||replaying;
 }
 function state(message,value='ready'){if(status)status.textContent=message;if(orb)orb.dataset.state=value;controls();}
 function clearReplay(){
  replayAudio?.pause();replayAudio=null;replaying=false;
  if(recorder){recorder.ondataavailable=recorder.onstop=null;if(recorder.state!=='inactive')recorder.stop();recorder=null;}
  if(replayUrl)URL.revokeObjectURL(replayUrl);replayUrl='';recordingComplete=false;
 }
 function recordCoach(){
  clearReplay();if(!audio?.srcObject||typeof MediaRecorder==='undefined')return;
  const g=generation,chunks=[];let size=0;
  try{const r=new MediaRecorder(audio.srcObject);recorder=r;
   r.ondataavailable=e=>{if(e.data?.size){size+=e.data.size;if(size<=2000000)chunks.push(e.data);else{chunks.length=0;if(r.state!=='inactive')r.stop();}}};
   r.onstop=()=>{if(g!==generation||recorder!==r)return;recorder=null;if(recordingComplete&&chunks.length&&size<=2000000){replayUrl=URL.createObjectURL(new Blob(chunks,{type:r.mimeType}));controls();}};
   r.start();
  }catch{recorder=null;}
 }
 async function replayCoach(){
  if(!replayUrl||replaying)return;
  replaying=true;microphone?.getAudioTracks().forEach(t=>t.enabled=false);controls();
  const g=generation;replayAudio=el('audio');replayAudio.src=replayUrl;
  const resume=()=>{if(g!==generation)return;replaying=false;microphone?.getAudioTracks().forEach(t=>t.enabled=!muted&&!replaying);state(muted?'Microphone paused. Resume when you’re ready.':'Your turn. Take your time.',muted?'ready':'listening');touch();};
  replayAudio.onended=replayAudio.onerror=resume;
  state('Repeating the question…','speaking');try{await replayAudio.play();}catch{resume();}
 }
 function touch(){clearTimeout(idleTimer);if(connected)idleTimer=setTimeout(()=>stop('Practice paused after two quiet minutes. Start again when you’re ready.'),120000);}
 function send(event){if(dc?.readyState!=='open')return false;dc.send(JSON.stringify(event));return true;}
 async function post(route,body,signal){const r=await fetch('/api/lesson-practice/'+route,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal});const data=await r.json();if(!r.ok)throw new Error(data.error||'Voice practice could not connect.');return data;}
 function stop(message='Practice ended. You can start again on this page.'){
  generation++;request?.abort();request=null;clearTimeout(timer);clearTimeout(idleTimer);clearTimeout(connectTimer);clearTimeout(transcriptTimer);clearReplay();
  const old=sessionId;sessionId='';connected=false;responding=false;deciding=false;speechActive=false;awaitingTranscript=0;pending=[];muted=false;finished=false;captionParts.clear();seenTurns.clear();
  if(dc){dc.onmessage=dc.onopen=null;dc.close();dc=null;}
  if(pc){pc.ontrack=pc.onconnectionstatechange=null;pc.close();pc=null;}
  microphone?.getTracks().forEach(t=>t.stop());microphone=null;
  if(audio){audio.pause();audio.srcObject=null;audio.remove();audio=null;}
  if(play)play.hidden=true;
  if(old)void post('end',{sessionId:old}).catch(()=>{});
  state(message);
 }
 function close(){stop();if(dialog?.open)dialog.close();}
 function show(){
  const now=current();if(!now)return;close();dialog?.remove();context=now;coachTurn='';
  dialog=el('dialog',null,'eg-practise-dialog');dialog.setAttribute('aria-labelledby','egPractiseTitle');
  const head=el('header',null,'eg-practise-head');head.append(el('strong','EnglishGate · Speaking partner'),button('Close',close));
  const body=el('div',null,'eg-practise-body'),title=el('h2',now.title);title.id='egPractiseTitle';
  orb=el('div','◌','eg-practise-orb');orb.setAttribute('aria-hidden','true');
  status=el('p','Start a voice conversation about this activity.','eg-practise-status');status.setAttribute('role','status');
  caption=el('div',null,'eg-practise-caption');caption.setAttribute('aria-label','Speaking partner captions');
  start=button('Start speaking',begin,true);mute=button('Pause microphone',()=>{muted=!muted;microphone?.getAudioTracks().forEach(t=>t.enabled=!muted&&!replaying);state(muted?'Microphone paused. Resume when you’re ready.':'I’m listening. Take your time.',muted?'ready':'listening');touch();});
  help=button('Help me answer',()=>assist(false));repeat=button('Say it again',()=>assist(true));end=button('End practice',()=>stop());
  play=button('Tap to hear the coach',async()=>{try{await audio?.play();play.hidden=true}catch{state('Please allow audio playback, then tap to hear the coach.')}});play.hidden=true;
  const actions=el('div',null,'eg-practise-actions');actions.append(start,mute,help,repeat,end,play);
  body.append(el('div','Practise this page','eg-practise-kicker'),title,el('p',now.stage,'eg-practise-stage'),orb,status,caption,actions);
  dialog.append(head,body,el('p','Voice is processed by AI. Only the coach’s last reply is kept temporarily in this browser for replay; it is cleared when practice ends. Extra practice does not affect your score.','eg-practise-note'));
  dialog.addEventListener('cancel',e=>{e.preventDefault();close()});dialog.addEventListener('close',()=>{if(pc||request||microphone)stop()});document.body.append(dialog);controls();dialog.showModal();start.focus();
 }
 async function begin(){
  if(request||connected)return;
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection){state('Voice practice needs a browser with microphone support. Open EnglishGate in Chrome, Edge or Safari over HTTPS.');return;}
  const g=++generation;request=new AbortController();const signal=request.signal;
  state('Checking the voice connection…','connecting');
  try{
   const available=await fetch('/api/lesson-practice/status',{credentials:'same-origin',signal});const info=await available.json();
   if(!available.ok)throw new Error(info.error||'Please sign in again.');if(!info.available)throw new Error('Voice practice is not configured yet. Please ask your teacher to check the voice service.');
   state('Allow your microphone to start speaking.','connecting');
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
   if(g!==generation){stream.getTracks().forEach(t=>t.stop());return;}microphone=stream;
   pc=new RTCPeerConnection();audio=el('audio');audio.autoplay=true;audio.setAttribute('playsinline','');document.body.append(audio);
   pc.ontrack=e=>{if(g!==generation)return;audio.srcObject=e.streams[0];void audio.play().catch(()=>{if(g===generation)play.hidden=false})};
   microphone.getAudioTracks().forEach(t=>pc.addTrack(t,microphone));dc=pc.createDataChannel('oai-events');
   dc.onmessage=e=>{if(g!==generation)return;try{handle(JSON.parse(e.data))}catch{stop('The audio connection was interrupted. Please start again.')}};
   dc.onopen=()=>{if(g!==generation)return;request=null;clearTimeout(connectTimer);connected=true;state('Your speaking partner is getting ready…','thinking');touch();responding=true;send({type:'response.create',response:{instructions:'Briefly welcome the learner to this current activity. Ask ONE easy opening question about its situation or language, then wait. Do not read the lesson text aloud.'}});timer=setTimeout(()=>stop('Your five-minute practice is complete. Start again when you’re ready.'),300000);};
   pc.onconnectionstatechange=()=>{if(g===generation&&['failed','disconnected','closed'].includes(pc?.connectionState))stop('The voice connection ended. Start again when you’re ready.');};
   const offer=await pc.createOffer();if(g!==generation)return;await pc.setLocalDescription(offer);
   const answer=await post('session',{...context,sdp:offer.sdp},signal);
   if(g!==generation){void post('end',{sessionId:answer.sessionId}).catch(()=>{});return;}
   sessionId=answer.sessionId;baseInstructions=answer.instructions;await pc.setRemoteDescription({type:'answer',sdp:answer.sdp});if(g!==generation)return;
   controls();connectTimer=setTimeout(()=>{if(!connected)stop('The audio connection took too long. Please try again.');},20000);
  }catch(e){if(g!==generation)return;stop(e.name==='NotAllowedError'?'Microphone permission was denied. Allow microphone access in your browser and start again.':e.name==='NotFoundError'?'No microphone was found. Connect one and start again.':e.message||'Voice practice could not start.');}
 }
 function handle(e){
  switch(e.type){
   case 'input_audio_buffer.speech_started':if(replaying)break;speechActive=true;touch();state('I’m listening. Take your time.','listening');break;
   case 'input_audio_buffer.speech_stopped':
    speechActive=false;awaitingTranscript++;state('Thinking about your answer…','thinking');
    clearTimeout(transcriptTimer);transcriptTimer=setTimeout(()=>{
     if(!connected||!awaitingTranscript)return;
     awaitingTranscript=0;pending.push({text:'[Speech was unclear. Ask for repetition.]',id:crypto.randomUUID()});
     void nextTurn();
    },8000);break;
   case 'conversation.item.input_audio_transcription.completed':
    if(e.item_id&&seenTurns.has(e.item_id))break;if(e.item_id)seenTurns.add(e.item_id);
    awaitingTranscript=Math.max(0,awaitingTranscript-1);if(!awaitingTranscript)clearTimeout(transcriptTimer);
    pending.push({text:clean(e.transcript,2000)||'[Speech was unclear. Ask for repetition.]',id:e.item_id||crypto.randomUUID()});
    void nextTurn();break;
   case 'conversation.item.input_audio_transcription.failed':
    if(e.item_id&&seenTurns.has(e.item_id))break;if(e.item_id)seenTurns.add(e.item_id);
    awaitingTranscript=Math.max(0,awaitingTranscript-1);if(!awaitingTranscript)clearTimeout(transcriptTimer);
    pending.push({text:'[Transcription failed. Ask for repetition; do not correct.]',id:e.item_id||crypto.randomUUID()});void nextTurn();break;
   case 'output_audio_buffer.started':recordCoach();break;
   case 'output_audio_buffer.cleared':clearReplay();break;
   case 'response.created':responding=true;coachTurn='';caption.textContent='';state('Your speaking partner is responding…','speaking');break;
   case 'response.output_audio_transcript.delta':{
    const id=e.item_id||e.response_id||'current';const text=(captionParts.get(id)||'')+(e.delta||'');captionParts.set(id,text);caption.textContent=text;break;}
   case 'response.output_audio_transcript.done':coachTurn=clean(e.transcript,1200);caption.textContent=e.transcript||caption.textContent;break;
   case 'response.done':responding=false;if(e.response?.status==='failed'){stop('The voice service could not respond. Please try again.');return;}controls();void nextTurn();break;
   case 'output_audio_buffer.stopped':
    recordingComplete=true;if(recorder?.state==='recording')recorder.stop();
    if(finished){stop('Practice ended. Well done for speaking today.');return;}
    if(!deciding&&!responding&&!speechActive)state(muted?'Microphone paused. Resume when you’re ready.':'Your turn. Take your time.',muted?'ready':'listening');touch();break;
   case 'error':stop('The voice service reported a connection problem. Please start again.');break;
  }
 }
 async function nextTurn(){
  if(!connected||deciding||responding||speechActive||awaitingTranscript||!pending.length)return;
  const turns=pending.splice(0),turn={...turns[turns.length-1],text:turns.map(t=>t.text).join(' ').slice(0,2000)},g=generation;
  deciding=true;state('Thinking about your answer…','thinking');
  try{
   const d=await post('decision',{sessionId,turnId:turn.id,learnerTurn:turn.text,coachTurn});
   if(g!==generation)return;deciding=false;
   if(speechActive||awaitingTranscript||pending.length){pending.unshift(turn);controls();void nextTurn();return;}
   finished=d.finish;
   if(!send({type:'response.create',response:{instructions:d.instructions}})){stop('The voice connection ended. Start again when you’re ready.');return;}
   responding=true;state('Your speaking partner is responding…','speaking');
  }catch(e){if(g===generation)stop(e.message)}
 }
 async function assist(replay){
  if(!connected||responding||deciding||finished)return;touch();
  if(replay){await replayCoach();return;}
  const g=generation;deciding=true;state('Finding a little help…','thinking');
  try{const d=await post('decision',{sessionId,turnId:crypto.randomUUID(),helpRequested:true,coachTurn});if(g!==generation)return;deciding=false;send({type:'conversation.item.create',item:{type:'message',role:'user',content:[{type:'input_text',text:'Please help me answer your current question with one useful word or sentence starter.'}]}});send({type:'response.create',response:{instructions:d.instructions}});responding=true;state('Here’s a little help…','speaking');}catch(e){if(g===generation)stop(e.message)}
 }
 function sync(){
  const now=current(),next=pageKey(now),header=content.querySelector('.eg-lesson-header,.micro-top');
  if(next!==key){if(dialog?.open)close();key=next;}
  if(!now||!header){launcher?.remove();launcher=null;if(pc||request)stop();return;}
  if(!header.querySelector('[data-lesson-practise]')){launcher=button('Help me practise',show);launcher.className='eg-practise-button';launcher.dataset.lessonPractise='true';launcher.setAttribute('aria-haspopup','dialog');header.append(launcher);}
 }
 new MutationObserver(sync).observe(content,{childList:true,subtree:true,attributes:true,attributeFilter:['data-step','data-phase']});
 const login=document.getElementById('loginScreen');if(login)new MutationObserver(sync).observe(login,{attributes:true,attributeFilter:['style','class','hidden']});
 window.addEventListener('pagehide',()=>{const old=sessionId;stop();if(old)navigator.sendBeacon('/api/lesson-practice/end',new Blob([JSON.stringify({sessionId:old})],{type:'application/json'}));});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&(pc||request))stop('Practice paused while the page was away. Start again when you’re ready.');});
 sync();
})();
