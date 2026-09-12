(()=>{
  'use strict';

  const originalLiveSections=window.liveSections;
  if(typeof originalLiveSections!=='function')return;

  function isGrammarLessonSection(section,index,total){
    if(!section)return false;
    const raw=String(section.title||'').trim();
    let label=raw;
    try{
      if(typeof window.sectionLabel==='function')label=window.sectionLabel(raw,index,total)||raw;
    }catch(_){/* use raw title */}
    const text=`${raw} ${label}`.trim();
    return /\bgrammar\b/i.test(text)||/^B2\s+LIFT$/i.test(raw);
  }

  window.liveSections=function(text){
    const sections=originalLiveSections(text)||[];
    const total=sections.length;
    return sections.filter((section,index)=>!isGrammarLessonSection(section,index,total));
  };
})();
