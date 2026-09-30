/* EnglishGate Help Me Practice voice stability guard.
   Keeps the existing speaking engine intact while preventing self-echo from
   starting a new learner turn during coach playback and tolerating brief
   WebRTC disconnects on mobile networks. */
(function(){
  'use strict';
  const PC=window.RTCPeerConnection;
  if(!PC||PC.prototype.__egVoiceStabilityV1)return;

  const proto=PC.prototype;
  Object.defineProperty(proto,'__egVoiceStabilityV1',{value:true,configurable:true});
  const nativeAddTrack=proto.addTrack;
  const nativeCreateDataChannel=proto.createDataChannel;

  proto.addTrack=function(track,...streams){
    if(track?.kind==='audio'){
      if(!this.__egVoiceAudioTracks)this.__egVoiceAudioTracks=new Set();
      this.__egVoiceAudioTracks.add(track);
    }
    return nativeAddTrack.call(this,track,...streams);
  };

  proto.createDataChannel=function(label,...args){
    const channel=nativeCreateDataChannel.call(this,label,...args);
    if(label!=='oai-events')return channel;

    const peer=this;
    let coachAudioPlaying=false;
    let savedTrackStates=new Map();
    let disconnectTimer=null;
    let appConnectionHandler=null;

    const pauseLearnerMic=()=>{
      if(savedTrackStates.size)return;
      for(const track of peer.__egVoiceAudioTracks||[]){
        savedTrackStates.set(track,track.enabled);
        track.enabled=false;
      }
    };
    const restoreLearnerMic=()=>{
      for(const [track,enabled] of savedTrackStates){
        if(track.readyState!=='ended')track.enabled=enabled;
      }
      savedTrackStates.clear();
    };

    // WebRTC can briefly enter `disconnected` while a phone changes radio/network
    // conditions. The speaking feature used to terminate immediately. Give it a
    // short recovery window; real failures still fail immediately.
    try{
      Object.defineProperty(peer,'onconnectionstatechange',{
        configurable:true,
        enumerable:true,
        get(){return appConnectionHandler;},
        set(fn){appConnectionHandler=typeof fn==='function'?fn:null;}
      });
      peer.addEventListener('connectionstatechange',event=>{
        const state=peer.connectionState;
        if(state==='disconnected'){
          clearTimeout(disconnectTimer);
          disconnectTimer=setTimeout(()=>{
            if(peer.connectionState==='disconnected')appConnectionHandler?.call(peer,event);
          },10000);
          return;
        }
        clearTimeout(disconnectTimer);
        disconnectTimer=null;
        appConnectionHandler?.call(peer,event);
      });
    }catch(_){/* Fall back to the browser's native handler behavior. */}

    // The remote speaker can leak back into the microphone on phones/loudspeakers.
    // During coach playback, temporarily close only this practice mic. This keeps
    // the coach's own voice/background noise from being mistaken for a learner turn.
    channel.addEventListener('message',event=>{
      let message;
      try{message=JSON.parse(event.data)}catch{return;}
      if(message?.type==='output_audio_buffer.started'){
        coachAudioPlaying=true;
        pauseLearnerMic();
        return;
      }
      if(message?.type==='output_audio_buffer.stopped'||message?.type==='output_audio_buffer.cleared'){
        coachAudioPlaying=false;
        restoreLearnerMic();
        return;
      }
      if(coachAudioPlaying&&(
        message?.type==='input_audio_buffer.speech_started'||
        message?.type==='input_audio_buffer.speech_stopped'||
        message?.type==='conversation.item.input_audio_transcription.completed'||
        message?.type==='conversation.item.input_audio_transcription.failed'
      )){
        event.stopImmediatePropagation();
      }
    },true);

    channel.addEventListener('close',()=>{
      clearTimeout(disconnectTimer);
      restoreLearnerMic();
    },{once:true});
    return channel;
  };
})();