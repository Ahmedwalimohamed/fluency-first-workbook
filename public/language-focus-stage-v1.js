(()=>{
  'use strict';

  const originalLiveSections=window.liveSections;
  if(typeof originalLiveSections!=='function')return;

  const pageHeader=/^PAGE\s+\d+\s*[—–-]\s*(.+)$/i;
  const languageFocusHeader=/^PAGE\s+\d+\s*[—–-]\s*LANGUAGE\s+FOCUS$/i;

  function extractLanguageFocus(text){
    const lines=String(text||'').split('\n');
    const start=lines.findIndex(line=>languageFocusHeader.test(line.trim()));
    if(start<0)return null;
    let end=lines.length;
    for(let i=start+1;i<lines.length;i++){
      if(pageHeader.test(lines[i].trim())){end=i;break}
    }
    return lines.slice(start+1,end).map(x=>x.trim()).filter(Boolean);
  }

  function stripEmbeddedLanguageFocus(section){
    if(!section||!Array.isArray(section.lines))return section;
    const lines=section.lines.slice();
    const start=lines.findIndex(line=>languageFocusHeader.test(String(line||'').trim()));
    if(start<0)return section;
    let end=lines.length;
    for(let i=start+1;i<lines.length;i++){
      if(pageHeader.test(String(lines[i]||'').trim())){end=i;break}
    }
    return {...section,lines:[...lines.slice(0,start),...lines.slice(end)]};
  }

  function isLanguageFocusSection(section){
    const title=String(section?.title||'').trim();
    return /LANGUAGE\s+FOCUS/i.test(title);
  }

  function isReadingSection(section){
    const title=String(section?.title||'').trim();
    let label=title;
    try{
      if(typeof window.sectionLabel==='function')label=window.sectionLabel(title,0,1)||title;
    }catch(_){/* use title */}
    return /\bREADING\b/i.test(`${title} ${label}`);
  }

  window.liveSections=function(text){
    const base=originalLiveSections(text)||[];
    const focusLines=extractLanguageFocus(text);
    if(!focusLines?.length)return base;

    const cleaned=base
      .filter(section=>!isLanguageFocusSection(section))
      .map(stripEmbeddedLanguageFocus)
      .filter(section=>!Array.isArray(section.lines)||section.lines.length);

    const focusSection={title:'Language Focus',lines:focusLines};
    const readingIndex=cleaned.findIndex(isReadingSection);
    const insertAt=readingIndex>=0?readingIndex+1:Math.min(3,cleaned.length);
    cleaned.splice(insertAt,0,focusSection);
    return cleaned;
  };
})();
