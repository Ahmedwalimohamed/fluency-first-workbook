/* EnglishGate B1 Intermediate — Northstar installer
   Installs every authored B1 Northstar lesson into the existing speakup-b1
   workbook pack and Live book, using the same lesson mapper as B2.
   Lessons that are not yet authored keep their current content.
   Course ID speakup-b1 and lesson IDs su-b1-l1 … su-b1-l22 stay stable. */
(function(){
'use strict';
const BOOK_ID='speakup-b1';
const rows=Array.isArray(window.SPEAKUP_B1_BLUEPRINT)?window.SPEAKUP_B1_BLUEPRINT:[];
const liveRows=Array.isArray(window.SPEAKUP_B1_LIVE_LESSONS)?window.SPEAKUP_B1_LIVE_LESSONS:[];

/* One place for "which blueprint belongs to this book / lesson". */
function blueprintForBook(bookId){
 if(bookId===BOOK_ID)return rows;
 if(bookId==='speakup-b2')return Array.isArray(window.SPEAKUP_B2_BLUEPRINT)?window.SPEAKUP_B2_BLUEPRINT:[];
 return [];
}
function blueprintForLessonId(lessonId){
 const id=String(lessonId||'');
 if(/^su-b1-l\d+$/.test(id))return rows;
 if(/^su-b2-l\d+$/.test(id))return Array.isArray(window.SPEAKUP_B2_BLUEPRINT)?window.SPEAKUP_B2_BLUEPRINT:[];
 return [];
}
window.ENGLISHGATE_BLUEPRINTS={blueprintForBook,blueprintForLessonId};

function toRuntimeLesson(x){
 /* B1 stores the Lift stage as `lift`; the shared runtime field is b2Lift. */
 const source={...x,b2Lift:x.lift||x.b2Lift||''};
 if(typeof makeBlueprintB2Lesson==='function')return makeBlueprintB2Lesson(source);
 return null;
}

try{
 const pack=typeof BOOK_PACKS!=='undefined'?BOOK_PACKS[BOOK_ID]:null;
 if(pack&&Array.isArray(pack.lessons)){
  rows.forEach(x=>{
   const i=Number(x.number)-1,lesson=toRuntimeLesson(x);
   if(lesson&&i>=0&&i<pack.lessons.length&&pack.lessons[i]?.id===x.id)pack.lessons[i]={...lesson,level:'B1',curriculum:'b1-northstar-v1'};
  });
  pack.title='B1 Intermediate';pack.moduleTitle='B1 Intermediate';
  pack.moduleGoal='Independent workbook practice for vocabulary, listening & reading, grammar and writing that supports the live B1 fluency course.';
 }
}catch(err){console.warn('B1 Northstar workbook install skipped',err)}

try{
 const books=window.LIVE_BOOKS||{},liveBook=books[BOOK_ID];
 if(liveBook&&Array.isArray(liveBook.lessons)){
  liveRows.forEach(x=>{
   const i=Number(x.number)-1;
   if(i>=0&&i<liveBook.lessons.length&&liveBook.lessons[i]?.title===x.title)liveBook.lessons[i]={number:x.number,title:x.title,content:x.content};
  });
  liveBook.title='B1 Intermediate';
 }
}catch(err){console.warn('B1 Northstar live book install skipped',err)}

window.ENGLISHGATE_B1_NORTHSTAR={version:'b1-northstar-v1',bookId:BOOK_ID,installed:rows.map(x=>x.id)};
})();
