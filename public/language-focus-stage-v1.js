(()=>{
  'use strict';

  const pageHeader=/^PAGE\s+\d+\s*[—–-]\s*(.+)$/i;
  const languageFocusHeader=/^PAGE\s+\d+\s*[—–-]\s*LANGUAGE\s+FOCUS$/i;
  const b2LiftHeader=/^B2\s+LIFT(?:\s*[·—–-].*)?$/i;

  let originalLiveSections=null;
  let originalLiveSectionHeading=null;
  try{
    originalLiveSections=typeof liveSections==='function'?liveSections:window.liveSections;
    originalLiveSectionHeading=typeof liveSectionHeading==='function'?liveSectionHeading:window.liveSectionHeading;
  }catch(_){
    originalLiveSections=window.liveSections;
    originalLiveSectionHeading=window.liveSectionHeading;
  }
  if(typeof originalLiveSections!=='function')return;

  function patchedLiveSectionHeading(line){
    const text=String(line||'').trim();
    if(languageFocusHeader.test(text))return 'Language Focus';
    return typeof originalLiveSectionHeading==='function'?originalLiveSectionHeading(line):'';
  }

  // Patch the actual global binding as well as the Window property. app.js calls
  // liveSectionHeading/liveSections by identifier, so changing window.* alone is
  // not a sufficiently strong compatibility boundary across browsers/runtimes.
  try{liveSectionHeading=patchedLiveSectionHeading}catch(_){/* global binding unavailable */}
  window.liveSectionHeading=patchedLiveSectionHeading;

  function extractLanguageFocus(text){
    const lines=String(text||'').split('\n');
    const start=lines.findIndex(line=>languageFocusHeader.test(line.trim()));
    if(start<0)return null;
    let end=lines.length;
    for(let i=start+1;i<lines.length;i++){
      const line=lines[i].trim();
      if(pageHeader.test(line)||b2LiftHeader.test(line)){end=i;break}
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
      const line=String(lines[i]||'').trim();
      if(pageHeader.test(line)||b2LiftHeader.test(line)){end=i;break}
    }
    return {...section,lines:[...lines.slice(0,start),...lines.slice(end)]};
  }

  function isLanguageFocusSection(section){
    return /LANGUAGE\s+FOCUS/i.test(String(section?.title||'').trim());
  }

  function isReadingSection(section){
    const title=String(section?.title||'').trim();
    let label=title;
    try{
      if(typeof sectionLabel==='function')label=sectionLabel(title,0,1)||title;
      else if(typeof window.sectionLabel==='function')label=window.sectionLabel(title,0,1)||title;
    }catch(_){/* use title */}
    return /\bREADING\b/i.test(`${title} ${label}`);
  }

  function separatedLiveSections(text){
    const base=originalLiveSections(text)||[];
    const focusLines=extractLanguageFocus(text);
    if(!focusLines?.length)return base;

    // The core parser historically did not recognize "PAGE n — LANGUAGE FOCUS",
    // so that page was left inside Reading. Remove any embedded copy and rebuild
    // exactly one dedicated Language Focus stage/tab after Reading.
    const cleaned=base
      .filter(section=>!isLanguageFocusSection(section))
      .map(stripEmbeddedLanguageFocus)
      .filter(section=>!Array.isArray(section.lines)||section.lines.length);

    const focusSection={title:'Language Focus',lines:focusLines};
    const readingIndex=cleaned.findIndex(isReadingSection);
    const insertAt=readingIndex>=0?readingIndex+1:Math.min(3,cleaned.length);
    cleaned.splice(insertAt,0,focusSection);
    return cleaned;
  }

  try{liveSections=separatedLiveSections}catch(_){/* global binding unavailable */}
  window.liveSections=separatedLiveSections;
  window.ENGLISHGATE_LANGUAGE_FOCUS_SEPARATION={
    version:'v2',
    split:separatedLiveSections
  };
})();
