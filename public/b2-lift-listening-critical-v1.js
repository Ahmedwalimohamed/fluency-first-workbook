(()=>{
  'use strict';

  const B2_LIFT_NUMBERS=new Set([23,24,25]);
  const pageHeader=/^PAGE\s+\d+\s*[—–-]\s*(.+)$/i;
  const criticalHeader=/^PAGE\s+\d+\s*[—–-]\s*CRITICAL\s+THINKING$/i;
  const polished={
    23:[
      'THINK DEEPER — WHAT BUILDS RAPPORT?',
      'TASK 1 — RANK & JUSTIFY',
      'Rank these behaviours from MOST helpful to LEAST helpful when meeting someone for the first time.',
      '• remembering the person’s name','• finding genuine common ground','• reacting to details in the other person’s answer','• checking meaning when something is unclear','• changing your language for the context','• giving a long, impressive introduction','• asking many questions without sharing anything about yourself','• immediately giving advice about a problem',
      'Be ready to explain your top three choices.',
      'TASK 2 — DISCUSS',
      '1. When can too many questions make a conversation feel like an interview?','2. Do people need to agree in order to build rapport? Why or why not?','3. How can you show interest without pretending to agree?','4. Which behaviours may change across cultures or professional settings?',
      'TASK 3 — DECIDE',
      'Choose the THREE most important principles for building rapport in English. Agree as a pair and prepare one reason for each choice.',
      'LANGUAGE SUPPORT','• I would rank ___ first because ...','• I see it differently because ...','• The strongest reason is ...','• On balance, we think ...'
    ],
    24:[
      'THINK DEEPER — WHAT COUNTS AS AN ACHIEVEMENT?',
      'TASK 1 — CLASSIFY',
      'Decide whether each statement is mainly a TASK, an ACHIEVEMENT, or an UNSUPPORTED CLAIM.',
      '• I answered customer emails every day.','• I redesigned the response template and reduced repeated questions.','• I was the best employee in the whole company.','• I trained three new staff members during a busy period.','• I managed stock records.','• I introduced a weekly stock check that reduced missing items.',
      'TASK 2 — DISCUSS',
      '1. Does every achievement need a number? Why or why not?','2. When can numbers make a career story misleading?','3. Can learning from a failed project still be professionally valuable?','4. How can someone with limited work experience still tell a strong career story?',
      'TASK 3 — IMPROVE IT',
      'Choose one ordinary work or study task. Turn it into a credible achievement statement using: situation → action → result → learning.',
      'LANGUAGE SUPPORT','• The situation was ...','• I took responsibility for ...','• As a result, ...','• What I learned was ...'
    ],
    25:[
      'THINK DEEPER — WHAT MAKES A STORY WORTH TELLING?',
      'TASK 1 — RANK THE INGREDIENTS',
      'Rank these from MOST important to LEAST important in an engaging travel story.',
      '• clear sequence','• a serious problem','• emotional reaction','• a surprising detail','• a turning point','• accurate facts','• a lesson or reflection','• humour',
      'TASK 2 — DISCUSS',
      '1. Can a small travel problem make a better story than a major emergency?','2. When does exaggeration make a story less credible?','3. Is it acceptable to leave out unimportant details? Why?','4. What is the difference between listing events and telling a story?',
      'TASK 3 — REBUILD THE STORY',
      'Improve this flat story: “The bus was late. I waited. Another bus came. I arrived.” Add background, one complication, one turning point, and one reflection.',
      'LANGUAGE SUPPORT','• Everything was going smoothly until ...','• To make matters worse, ...','• The turning point came when ...','• Looking back, ...'
    ]
  };

  function upgradeLessonContent(){
    const liveBook=window.LIVE_BOOKS?.['speakup-b2'];
    if(!liveBook||!Array.isArray(liveBook.lessons))return;

    liveBook.lessons.forEach(lesson=>{
      const n=Number(lesson?.number);
      if(!B2_LIFT_NUMBERS.has(n))return;
      let content=String(lesson.content||'');

      // Convert the spoken portion to EnglishGate's audio format.
      if(/\nLISTENING SCRIPT\n/i.test(content)){
        let speakers='';
        if(n===23)speakers='AUDIO SPEAKERS: Nadia=female|Hassan=male\n';
        if(n===24)speakers='AUDIO SPEAKERS: Interviewer=male|Samira=female\n';
        if(n===25)speakers='AUDIO SPEAKERS: Ayaan=female|Omar=male\n';
        content=content.replace(/\nLISTENING SCRIPT\n/i,`\n${speakers}AUDIO SCRIPT\n`);
      }

      // Written questions begin after this boundary, so they are displayed but never read by audio.
      content=content.replace(/\nLISTENING TASK\n/i,'\nAfter listening\n');

      // Replace dense Critical Thinking content with a clearer three-step activity.
      if(polished[n]){
        content=content.replace(/PAGE 6 — CRITICAL THINKING[\s\S]*?PAGE 7 — FLUENCY MISSION/i,`PAGE 6 — CRITICAL THINKING\n${polished[n].join('\n')}\n\nPAGE 7 — FLUENCY MISSION`);
      }
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

  function isCriticalThinking(section){return /CRITICAL\s+THINKING/i.test(String(section?.title||''));}
  function isListening(section){
    const raw=String(section?.title||'');
    let label=raw;
    try{if(typeof window.sectionLabel==='function')label=window.sectionLabel(raw,0,1)||raw}catch(_){ }
    return /\bLISTENING\b/i.test(`${raw} ${label}`);
  }

  upgradeLessonContent();

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
