/* EnglishGate B2 Lift interactive stage
   - Makes B2 LIFT a real lesson stage in the left rail
   - Adds natural audio, follow-up questions, language selection and timed speaking practice
   - Works in both teacher and student lesson-book views
*/
(function(){
  const marker='__ENGLISHGATE_B2_LIFT__';
  const clean=v=>String(v==null?'':v).trim();
  const esc=v=>typeof window.escapeHtml==='function'?window.escapeHtml(clean(v)):clean(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const attr=v=>typeof window.escapeAttr==='function'?window.escapeAttr(clean(v)):esc(v);

  const originalHeading=window.liveSectionHeading;
  if(typeof originalHeading==='function'){
    window.liveSectionHeading=function(line){
      const t=clean(line);
      if(/^B2\s+LIFT$/i.test(t))return 'B2 LIFT';
      return originalHeading(line);
    };
  }

  const originalSections=window.liveSections;
  if(typeof originalSections==='function'){
    window.liveSections=function(text){
      return originalSections(text).map(section=>{
        if(/^B2\s+LIFT$/i.test(clean(section?.title))){
          const lines=Array.isArray(section.lines)?section.lines.slice():[];
          if(lines[0]!==marker)lines.unshift(marker);
          return {...section,lines};
        }
        return section;
      });
    };
  }

  function parseLift(lines){
    const raw=lines.map(clean).filter(Boolean);
    const usefulAt=raw.findIndex(x=>/^Useful Language$/i.test(x));
    const pronAt=raw.findIndex(x=>/^PRONUNCIATION FOCUS$/i.test(x));
    const medAt=raw.findIndex(x=>/^MEDIATION MOVE$/i.test(x));
    const endObjective=[usefulAt,pronAt,medAt].filter(i=>i>=0).sort((a,b)=>a-b)[0]??raw.length;
    const objective=raw.slice(0,endObjective).join(' ');
    const usefulStart=usefulAt>=0?usefulAt+1:endObjective;
    const usefulEnd=[pronAt,medAt].filter(i=>i>=usefulStart).sort((a,b)=>a-b)[0]??raw.length;
    const useful=raw.slice(usefulStart,usefulEnd).map(x=>x.replace(/^[•·\-*]\s*/,'').trim()).filter(Boolean);
    const pronStart=pronAt>=0?pronAt+1:-1;
    const pronEnd=pronStart>=0?([medAt].filter(i=>i>=pronStart)[0]??raw.length):-1;
    const pronunciation=pronStart>=0?raw.slice(pronStart,pronEnd).join(' '):'';
    const mediation=medAt>=0?raw.slice(medAt+1).join(' '):'';
    return {objective,useful,pronunciation,mediation};
  }

  function currentLessonTitle(){
    try{
      if(window.session?.role==='teacher'&&typeof window.teacherClass==='function'&&typeof window.liveBookForClass==='function'){
        const live=window.liveBookForClass(window.teacherClass());
        return live?.lessons?.find(x=>Number(x.number)===Number(window.activeTeacherLessonNumber))?.title||'';
      }
      if(window.session?.role==='student'&&typeof window.studentClass==='function'&&typeof window.liveBookForClass==='function'){
        const live=window.liveBookForClass(window.studentClass(window.session.id));
        return live?.lessons?.find(x=>Number(x.number)===Number(window.activeStudentLiveLessonNumber))?.title||'';
      }
    }catch{}
    return '';
  }

  function audioScript(data){
    const title=currentLessonTitle();
    const phraseLine=data.useful.length?`Useful language includes: ${data.useful.join(' ... ')}`:'';
    const pron=data.pronunciation?`Pronunciation focus: ${data.pronunciation}`:'';
    const med=data.mediation?`After listening to your partner, ${data.mediation.charAt(0).toLowerCase()+data.mediation.slice(1)}`:'';
    return [title?`B2 challenge for ${title}.`:'B2 challenge.',data.objective,phraseLine,pron,med].filter(Boolean).join(' ');
  }

  function revealCard(index,question,answer){
    return `<article class="b2-followup-card" data-b2-question="${index}">
      <div class="b2-followup-number">${index+1}</div>
      <div class="b2-followup-copy"><p>${esc(question)}</p><div class="b2-followup-answer" data-b2-answer hidden>${esc(answer)}</div></div>
      <button class="ghost-btn b2-reveal-btn" type="button" data-b2-reveal aria-expanded="false">Show answer</button>
    </article>`;
  }

  function liftHtml(data){
    const audio=audioScript(data);
    const audioHtml=typeof window.liveAudioPlayerHtml==='function'
      ?window.liveAudioPlayerHtml(audio,[])
      :`<div class="feedback bad">Audio player unavailable.</div>`;
    const usefulAnswer=data.useful.length?`Any of these: ${data.useful.join(' / ')}`:'Use one suitable phrase from the lesson.';
    const questions=[
      ['What is the main B2 goal in this challenge?',data.objective||'Use the lesson language at a more precise, independent B2 level.'],
      ['Name one useful expression you heard.',usefulAnswer],
      ['What should you focus on when speaking?',data.pronunciation||'Clear stress, pausing and intelligible delivery.'],
      ['What should you do after listening to your partner?',data.mediation||'Summarise the partner’s main idea accurately for another listener.']
    ];
    const phraseButtons=data.useful.length
      ?data.useful.map((p,i)=>`<button class="b2-phrase-chip" type="button" data-b2-phrase="${attr(p)}" aria-pressed="false"><span>${i+1}</span>${esc(p)}</button>`).join('')
      :'<p class="muted">Use one strong phrase from the lesson language bank.</p>';

    return `<section class="b2-lift-interactive" data-b2-lift>
      <header class="b2-lift-hero">
        <div><span class="stage-badge">B2 stretch</span><h3>Go further</h3></div>
        <p>${esc(data.objective||'Use this lesson language with more precision, evidence and independence.')}</p>
      </header>

      <section class="b2-lift-block b2-listen-block">
        <div class="b2-block-heading"><div><span>1</span><div><small>Listen & notice</small><strong>Hear the B2 coaching note</strong></div></div><em>Listen before opening the transcript.</em></div>
        ${audioHtml}
      </section>

      <section class="b2-lift-block">
        <div class="b2-block-heading"><div><span>2</span><div><small>Check understanding</small><strong>Follow-up questions</strong></div></div><em>Think first, then reveal.</em></div>
        <div class="b2-followups">${questions.map((q,i)=>revealCard(i,q[0],q[1])).join('')}</div>
      </section>

      <section class="b2-lift-block">
        <div class="b2-block-heading"><div><span>3</span><div><small>Useful language</small><strong>Choose one phrase to use</strong></div></div><em data-b2-selected-label>No phrase selected yet.</em></div>
        <div class="b2-phrase-grid">${phraseButtons}</div>
      </section>

      <div class="b2-lift-two-col">
        <section class="b2-lift-mini-card"><span class="b2-mini-icon">◉</span><div><small>Pronunciation focus</small><p>${esc(data.pronunciation||'Stress the key information and pause clearly between ideas.')}</p></div></section>
        <section class="b2-lift-mini-card"><span class="b2-mini-icon">↔</span><div><small>Mediation move</small><p>${esc(data.mediation||'Listen carefully, then summarise the main point for another person.')}</p></div></section>
      </div>

      <section class="b2-speaking-challenge">
        <div><span class="stage-badge">Your turn</span><h3>60-second B2 response</h3><p>Give one strong response connected to this lesson. Use your selected phrase, include a reason or evidence, and apply the pronunciation focus.</p></div>
        <div class="b2-speaking-controls"><button class="primary-btn" type="button" data-b2-timer>Start 60 seconds</button><button class="ghost-btn" type="button" data-b2-reset>Reset</button><strong data-b2-time aria-live="polite">1:00</strong></div>
      </section>
    </section>`;
  }

  const originalRender=window.renderLiveContent;
  if(typeof originalRender==='function'){
    window.renderLiveContent=function(text){
      const lines=String(text||'').split('\n');
      if(clean(lines[0])===marker){
        const data=parseLift(lines.slice(1));
        return liftHtml(data);
      }
      return originalRender(text);
    };
  }

  function decorateStageCards(root=document){
    root.querySelectorAll('.eg-stage,.teacher-presentation-stage').forEach(button=>{
      const strong=button.querySelector('strong');
      if(!strong)return;
      if(/^b2\s+lift$/i.test(clean(strong.textContent))){
        button.classList.add('b2-lift-stage');
        if(!button.querySelector('.b2-stage-badge')){
          const badge=document.createElement('span');badge.className='b2-stage-badge';badge.textContent='B2';button.appendChild(badge);
        }
      }
    });
  }

  function stopTimer(box){
    if(box?._b2Timer){clearInterval(box._b2Timer);box._b2Timer=null;}
  }
  function syncTime(node,seconds){node.textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}

  document.addEventListener('click',e=>{
    const reveal=e.target.closest?.('[data-b2-reveal]');
    if(reveal){
      const card=reveal.closest('.b2-followup-card'),answer=card?.querySelector('[data-b2-answer]');
      if(!answer)return;
      const opening=answer.hidden;answer.hidden=!opening;reveal.setAttribute('aria-expanded',opening?'true':'false');reveal.textContent=opening?'Hide answer':'Show answer';return;
    }
    const phrase=e.target.closest?.('[data-b2-phrase]');
    if(phrase){
      const root=phrase.closest('[data-b2-lift]');
      root?.querySelectorAll('[data-b2-phrase]').forEach(x=>{x.classList.remove('is-selected');x.setAttribute('aria-pressed','false')});
      phrase.classList.add('is-selected');phrase.setAttribute('aria-pressed','true');
      const label=root?.querySelector('[data-b2-selected-label]');if(label)label.textContent='Selected: '+phrase.dataset.b2Phrase;return;
    }
    const start=e.target.closest?.('[data-b2-timer]');
    if(start){
      const box=start.closest('.b2-speaking-challenge'),node=box?.querySelector('[data-b2-time]');if(!box||!node)return;
      stopTimer(box);let left=60;syncTime(node,left);start.disabled=true;start.textContent='Speaking…';
      box._b2Timer=setInterval(()=>{if(!box.isConnected){stopTimer(box);return}left-=1;syncTime(node,Math.max(0,left));if(left<=0){stopTimer(box);start.disabled=false;start.textContent='Start again';node.textContent='Time ✓'}},1000);return;
    }
    const reset=e.target.closest?.('[data-b2-reset]');
    if(reset){
      const box=reset.closest('.b2-speaking-challenge'),node=box?.querySelector('[data-b2-time]'),start=box?.querySelector('[data-b2-timer]');if(!box||!node||!start)return;
      stopTimer(box);syncTime(node,60);start.disabled=false;start.textContent='Start 60 seconds';
    }
  },true);

  const observer=new MutationObserver(()=>decorateStageCards());
  function start(){decorateStageCards();observer.observe(document.documentElement,{subtree:true,childList:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
