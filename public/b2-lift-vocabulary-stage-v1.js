(()=>{
  'use strict';

  const originalLiveSections=window.liveSections;
  if(typeof originalLiveSections!=='function')return;

  const pageHeader=/^PAGE\s+\d+\s*[—–-]\s*(.+)$/i;
  const vocabHeader=/^PAGE\s+\d+\s*[—–-]\s*(?:ADVANCED\s+)?VOCABULARY$/i;

  function extractVocabulary(text){
    const lines=String(text||'').split('\n');
    const start=lines.findIndex(line=>vocabHeader.test(String(line||'').trim()));
    if(start<0)return null;
    let end=lines.length;
    for(let i=start+1;i<lines.length;i++){
      if(pageHeader.test(String(lines[i]||'').trim())){end=i;break}
    }
    return lines.slice(start+1,end).map(x=>x.trim()).filter(Boolean);
  }

  function stripEmbeddedVocabulary(section){
    if(!section||!Array.isArray(section.lines))return section;
    const lines=section.lines.slice();
    const start=lines.findIndex(line=>vocabHeader.test(String(line||'').trim()));
    if(start<0)return section;
    let end=lines.length;
    for(let i=start+1;i<lines.length;i++){
      if(pageHeader.test(String(lines[i]||'').trim())){end=i;break}
    }
    return {...section,lines:[...lines.slice(0,start),...lines.slice(end)]};
  }

  function isVocabularySection(section){
    const title=String(section?.title||'').trim();
    return /\bVOCABULARY\b/i.test(title);
  }

  function isWarmupSection(section){
    const title=String(section?.title||'').trim();
    let label=title;
    try{
      if(typeof window.sectionLabel==='function')label=window.sectionLabel(title,0,1)||title;
    }catch(_){/* keep raw title */}
    return /WARM\s*UP/i.test(`${title} ${label}`);
  }

  window.liveSections=function(text){
    const base=originalLiveSections(text)||[];
    const vocabLines=extractVocabulary(text);
    if(!vocabLines?.length)return base;

    const cleaned=base
      .filter(section=>!isVocabularySection(section))
      .map(stripEmbeddedVocabulary)
      .filter(section=>!Array.isArray(section.lines)||section.lines.length);

    const vocabSection={title:'Vocabulary',lines:vocabLines};
    const warmupIndex=cleaned.findIndex(isWarmupSection);
    const insertAt=warmupIndex>=0?warmupIndex+1:Math.min(1,cleaned.length);
    cleaned.splice(insertAt,0,vocabSection);
    return cleaned;
  };
})();
