(function(){
'use strict';
/* CEFR/ESL audit remains available as a background safeguard.
   It no longer owns the admin page or interrupts the Edit with AI workflow. */
async function auditLesson(lessonNumber,lesson,opts={}){
 try{
  const r=await fetch('/api/content-audit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lessonNumber,lesson})});
  const data=await r.json();
  if(!r.ok)throw new Error(data?.detail||data?.error||'Audit unavailable');
  return data.audit||null;
 }catch(e){
  if(!opts.silent)console.warn('Background standards audit unavailable:',e.message);
  return null;
 }
}
window.runStandardsAuditForLesson=async function(lessonNumber,lesson,opts={}){
 if(!lesson){
  try{
   const books=window.EnglishGateContentPatches?.books?.()||[];
   lesson=books.flatMap(b=>b.lessons||[]).find(l=>Number(l.number)===Number(lessonNumber))||null;
  }catch{}
 }
 if(!lesson)return null;
 return auditLesson(lessonNumber,lesson,opts);
};
})();
