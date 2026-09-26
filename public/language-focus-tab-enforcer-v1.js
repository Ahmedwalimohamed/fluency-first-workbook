(()=>{
  'use strict';

  const current=window.liveSections;
  if(typeof current!=='function')return;

  const pageHeader=/^PAGE\s+\d+\s*[—–-]\s*(.+)$/i;

  function pageBlocks(text){
    const lines=String(text||'').split('\n');
    const blocks=[];
    let block=null;
    for(const raw of lines){
      const line=String(raw||'').trim();
      const match=line.match(pageHeader);
      if(match){
        if(block)blocks.push(block);
        block={title:match[1].trim(),lines:[]};
        continue;
      }
      if(block&&line)block.lines.push(line);
    }
    if(block)blocks.push(block);
    return blocks;
  }

  function isLanguageFocusTitle(value){
    return /\bLANGUAGE\s+FOCUS\b/i.test(String(value||''));
  }

  function isReading(section){
    const title=String(section?.title||'');
    let label=title;
    try{
      if(typeof window.sectionLabel==='function')label=window.sectionLabel(title,0,1)||title;
    }catch(_){/* use title */}
    return /\bREADING\b/i.test(`${title} ${label}`);
  }

  function removeFocusPayload(section,focusLines){
    if(!section||!Array.isArray(section.lines)||!focusLines.length)return section;
    const source=section.lines.map(x=>String(x||'').trim());
    const needle=focusLines.map(x=>String(x||'').trim());
    let start=-1;
    for(let i=0;i<=source.length-needle.length;i++){
      let same=true;
      for(let j=0;j<needle.length;j++){
        if(source[i+j]!==needle[j]){same=false;break}
      }
      if(same){start=i;break}
    }
    if(start<0)return section;
    return {...section,lines:[...section.lines.slice(0,start),...section.lines.slice(start+needle.length)]};
  }

  window.liveSections=function languageFocusSeparated(text){
    const base=current(text)||[];
    const block=pageBlocks(text).find(x=>isLanguageFocusTitle(x.title));
    if(!block||!block.lines.length)return base;

    const cleaned=base
      .filter(section=>!isLanguageFocusTitle(section?.title))
      .map(section=>removeFocusPayload(section,block.lines))
      .filter(section=>!Array.isArray(section.lines)||section.lines.length>0);

    const focus={title:'Language Focus',lines:block.lines.slice()};
    const readingIndex=cleaned.findIndex(isReading);
    cleaned.splice(readingIndex>=0?readingIndex+1:Math.min(3,cleaned.length),0,focus);
    return cleaned;
  };
})();
