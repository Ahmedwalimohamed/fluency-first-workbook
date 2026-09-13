(()=>{
  'use strict';

  const B2_LIFT_NUMBERS=new Set([23,24,25]);
  const pageHeader=/^PAGE\s+\d+\s*[—–-]\s*(.+)$/i;
  const criticalHeader=/^PAGE\s+\d+\s*[—–-]\s*CRITICAL\s+THINKING$/i;

  function upgradeListeningAudio(){
    const liveBook=window.LIVE_BOOKS?.['speakup-b2'];
    if(!liveBook||!Array.isArray(liveBook.lessons))return;

    liveBook.lessons.forEach(lesson=>{
      if(!B2_LIFT_NUMBERS.has(Number(lesson?.number)))return;
      let content=String(lesson.content||'');
      if(!/\nLISTENING SCRIPT\n/i.test(content))return;

      let speakers='';
      if(Number(lesson.number)===23)speakers='AUDIO SPEAKERS: Nadia=female|Hassan=male\n';
      if(Number(lesson.number)===24)speakers='AUDIO SPEAKERS: Interviewer=male|Samira=female\n';
      if(Number(lesson.number)===25)speakers='AUDIO SPEAKERS: Ayaan=female|Omar=male\n';

      content=content.replace(/\nLISTENING SCRIPT\n/i,`\n${speakers}AUDIO SCRIPT\n`);
      lesson.content=content;
    });
  }

  function extractCriticalThinking(text){
    const lines=String(text||'').split('\n');
    const start=lines.findIndex(line=>criticalHeader.test(String(line||'').trim()));
    if(start<0)return null;
    let end=lines.length;
    for(let i=start+1;i<lines.length;i++){
      if(pageHeader.test(String(lines[i]||'').trim())){end=i;break}
    }
    return lines.slice(start+1,end).map(x=>x.trim()).filter(Boolean);
  }

  function stripEmbeddedCriticalThinking(section){
    if(!section||!Array.isArray(section.lines))return section;
    const lines=section.lines.slice();
    const start=lines.findIndex(line=>criticalHeader.test(String(line||'').trim()));
    if(start<0)return section;
    let end=lines.length;
    for(let i=start+1;i<lines.length;i++){
      if(pageHeader.test(String(lines[i]||'').trim())){end=i;break}
    }
    return {...section,lines:[...lines.slice(0,start),...lines.slice(end)]};
  }

  function isCriticalThinking(section){
    return /CRITICAL\s+THINKING/i.test(String(section?.title||''));
  }

  function isListening(section){
    const raw=String(section?.title||'');
    let label=raw;
    try{
      if(typeof window.sectionLabel==='function')label=window.sectionLabel(raw,0,1)||raw;
    }catch(_){/* keep raw title */}
    return /\bLISTENING\b/i.test(`${raw} ${label}`);
  }

  upgradeListeningAudio();

  const originalLiveSections=window.liveSections;
  if(typeof originalLiveSections!=='function')return;

  window.liveSections=function(text){
    const base=originalLiveSections(text)||[];
    const criticalLines=extractCriticalThinking(text);
    if(!criticalLines?.length)return base;

    const cleaned=base
      .filter(section=>!isCriticalThinking(section))
      .map(stripEmbeddedCriticalThinking)
      .filter(section=>!Array.isArray(section.lines)||section.lines.length);

    const criticalSection={title:'Critical Thinking',lines:criticalLines};
    const listeningIndex=cleaned.findIndex(isListening);
    const insertAt=listeningIndex>=0?listeningIndex+1:Math.min(5,cleaned.length);
    cleaned.splice(insertAt,0,criticalSection);
    return cleaned;
  };
})();
