/* Lesson-scoped, ungraded practice. Does not send learner responses to a server. */
(function(){
 'use strict';
 function clean(value){return typeof value==='string'?value.trim():'';}
 function languageFor(l,refs=[]){
  const seen=new Set(),out=[];
  const add=(word,meaning,example)=>{word=clean(word);if(!word||seen.has(word.toLowerCase()))return;seen.add(word.toLowerCase());out.push({word,meaning:clean(meaning),example:clean(example)});};
  (l?.expressions||[]).forEach(x=>add(x.text,x.job||x.meaning,x.example));
  refs.forEach(x=>add(x.word,x.meaning,x.example));
  return out.slice(0,6);
 }
 const normalize=s=>clean(s).toLowerCase().replace(/[.!?]+$/,'').replace(/\s+/g,' ');
 if(typeof module!=='undefined'&&module.exports){module.exports={languageFor,normalize};return;}
 const content=document.getElementById('content');if(!content)return;
 let dialog=null,launcher=null,key='',context=null,position=0,phase='learn';
 function current(){
  if(typeof session==='undefined'||session?.role!=='student')return null;
  if(typeof currentPage==='undefined')return null;
  if(currentPage==='workbook')return {lesson:lesson(),page:currentPage};
  if(currentPage==='student-live-lesson'){
   const live=liveBookForClass(studentClass(session.id));
   const selected=live?.lessons?.find(x=>x.number===activeStudentLiveLessonNumber);
   if(!selected)return null;
   const wb=workbookForClass(studentClass(session.id));
   return {lesson:selected,languageLesson:wb?.lessons?.find(x=>x.number===selected.number)||selected,page:currentPage};
  }
  return null;
 }
 const style=document.createElement('style');style.textContent=`
 .eg-practise-button{border:1px solid #bfcef0;border-radius:10px;background:#edf3ff;color:#174aa5;padding:12px 17px;font:600 15px/1.3 system-ui;cursor:pointer;white-space:nowrap}.eg-practise-button:hover{background:#e1ebff}.eg-practise-dialog{border:1px solid #dce5f2;border-radius:20px;padding:0;width:min(540px,calc(100vw - 24px));max-width:none;max-height:calc(100dvh - 24px);background:#fff;color:#14263e;box-shadow:0 24px 80px #0f172a35;overflow:auto;font:16px/1.6 system-ui}.eg-practise-dialog::backdrop{background:#10213a77}.eg-practise-head{position:sticky;top:0;background:#fff;display:flex;justify-content:space-between;align-items:center;gap:15px;padding:20px 24px;border-bottom:1px solid #e4eaf4;z-index:1}.eg-practise-head strong{font-size:18px}.eg-practise-close{border:0;background:#f0f4fa;color:#334155;padding:9px 12px;border-radius:9px;cursor:pointer;font:inherit}.eg-practise-body{padding:24px}.eg-practise-body h3{font:normal 29px/1.3 Georgia,'Times New Roman',serif;margin:12px 0;overflow-wrap:anywhere}.eg-practise-body p{margin:10px 0}.eg-practise-kicker{color:#627797;font-size:13px;font-weight:600}.eg-practise-example{background:#f4f7fc;border-left:3px solid #91b4f5;padding:15px;margin:18px 0;border-radius:0 10px 10px 0}.eg-practise-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px}.eg-practise-next{border:0;border-radius:10px;padding:13px 18px;background:#2563eb;color:#fff;font:600 15px system-ui;cursor:pointer}.eg-practise-secondary{background:#eef3fb;color:#355476}.eg-practise-input{width:100%;padding:13px;border:1px solid #c9d5e8;border-radius:10px;color:#14263e;background:#fff;font:16px system-ui}.eg-practise-feedback{padding:14px;background:#f2f7ff;border-radius:10px;margin:16px 0}.eg-practise-note{font-size:13px;color:#61738d;padding:0 24px 20px}.eg-practise-dialog button:focus-visible,.eg-practise-button:focus-visible,.eg-practise-input:focus-visible{outline:3px solid #72a4f6;outline-offset:3px}@media(max-width:600px){.eg-practise-dialog{margin:auto}.eg-practise-head,.eg-practise-body{padding:18px}.eg-practise-button{white-space:normal}.eg-practise-actions button{flex:1}}`;
 document.head.append(style);
 function el(tag,text,className){const n=document.createElement(tag);if(text)n.textContent=text;if(className)n.className=className;return n;}
 function action(label,fn,secondary=false){const b=el('button',label,'eg-practise-next'+(secondary?' eg-practise-secondary':''));b.type='button';b.onclick=fn;return b;}
 function close(){if(dialog?.open)dialog.close();}
 function show(){
  const now=current();if(!now)return;
  context=now;position=0;phase='learn';
  const l=now.languageLesson||now.lesson;
  let refs=[];try{if(typeof workbookVocabReferences==='function')refs=workbookVocabReferences(l);}catch{}
  context.language=languageFor(l,refs);
  if(!dialog){
   dialog=el('dialog',null,'eg-practise-dialog');dialog.setAttribute('aria-labelledby','egPractiseTitle');
   const head=el('header',null,'eg-practise-head'),title=el('strong','Help me practise');title.id='egPractiseTitle';
   const exit=el('button','Close','eg-practise-close');exit.type='button';exit.onclick=close;head.append(title,exit);
   const body=el('div',null,'eg-practise-body');body.id='egPractiseBody';
   dialog.append(head,body,el('div','Extra practice only. Your lesson marks and completion stay the same.','eg-practise-note'));
   dialog.addEventListener('close',()=>{if(launcher?.isConnected)launcher.focus();});document.body.append(dialog);
  }
  render();dialog.showModal();dialog.querySelector('.eg-practise-close').focus();
 }
 function render(){
  const root=dialog.querySelector('#egPractiseBody');root.replaceChildren();
  root.append(el('div','Lesson '+context.lesson.number+' · '+context.lesson.title,'eg-practise-kicker'));
  const items=context.language;
  if(phase==='use'||!items.length){
   root.append(el('h3','Make it yours.'),el('p',clean(context.lesson.outcome)||clean(context.languageLesson?.outcome)||'Talk about the topic of this lesson using your own experience.'));
   if(items.length)root.append(el('div','Use one of these: '+items.map(x=>x.word).join(' · '),'eg-practise-example'));
   root.append(el('p','Say two or three sentences aloud. Then say them again with less help.'));
   const label=el('label','Write a sentence to help you rehearse.');label.htmlFor='egPractiseSentence';const input=el('textarea',null,'eg-practise-input');input.id='egPractiseSentence';input.rows=3;input.maxLength=1000;root.append(label,input,el('p','This sentence is for your practice. It is not graded or saved.','eg-practise-kicker'));
   const row=el('div',null,'eg-practise-actions');if(items.length)row.append(action('Review the language',()=>{position=0;phase='learn';render();},true));row.append(action('Return to my lesson',close));root.append(row);return;
  }
  const item=items[position];root.append(el('div',(position+1)+' of '+items.length+' useful expressions','eg-practise-kicker'));
  if(phase==='learn'){
   root.append(el('h3',item.word));if(item.meaning)root.append(el('p',item.meaning));if(item.example)root.append(el('div',item.example,'eg-practise-example'));
   root.append(el('p','Read it once. Say it aloud. Then check whether you can remember it.'));
   const row=el('div',null,'eg-practise-actions');row.append(action('Check my recall',()=>{phase='recall';render();}),action('Use it in my own words',()=>{phase='use';render();},true));root.append(row);
  }else{
   root.append(el('h3','Can you remember it?'),el('p',item.meaning||'Recall the expression you just practised.'));
   const label=el('label','Type the expression.');label.htmlFor='egPractiseRecall';const input=el('input',null,'eg-practise-input');input.id='egPractiseRecall';input.maxLength=250;input.autocomplete='off';
   const feedback=el('div');feedback.setAttribute('aria-live','polite');const row=el('div',null,'eg-practise-actions');
   const check=action('Check recall',()=>{if(!input.value.trim()){feedback.textContent='Type the expression first.';input.focus();return;}feedback.className='eg-practise-feedback';feedback.textContent=normalize(input.value)===normalize(item.word)?'You recalled the expression. Now use it in a sentence.':'The lesson expression is: '+item.word+'. '+(item.meaning||'Read it again, then try to recall it.');});
   input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();check.click();}});
   row.append(check,action(position+1<items.length?'Next expression':'Use the language',()=>{if(position+1<items.length){position++;phase='learn';}else phase='use';render();},true));root.append(label,input,feedback,row);input.focus();
  }
 }
 function sync(){
  const now=current(),header=content.querySelector('.eg-lesson-header');const nextKey=now?now.page+':'+now.lesson.id+':'+now.lesson.number:'';
  if(nextKey!==key){close();key=nextKey;}
  if(!now||!header){launcher?.remove();launcher=null;close();return;}
  if(!header.querySelector('[data-lesson-practise]')){launcher=el('button','Help me practise','eg-practise-button');launcher.type='button';launcher.dataset.lessonPractise='true';launcher.setAttribute('aria-haspopup','dialog');launcher.onclick=show;header.append(launcher);}
 }
 new MutationObserver(sync).observe(content,{childList:true,subtree:true});
 const login=document.getElementById('loginScreen');if(login)new MutationObserver(sync).observe(login,{attributes:true,attributeFilter:['style','class','hidden']});sync();
})();
