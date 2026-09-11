(function(){
'use strict';
const PATCHES=window.ENGLISHGATE_CONTENT_PATCHES=window.ENGLISHGATE_CONTENT_PATCHES||{};
function key(p){return `${p.course_id||p.courseId}:${Number(p.lesson_number||p.lessonNumber)}:${p.component}`}
async function load(){
 try{
  const r=await fetch('/api/content-patches',{cache:'no-store'}),data=await r.json();
  if(!r.ok||!Array.isArray(data?.patches))return;
  data.patches.forEach(p=>{PATCHES[key(p)]={...p,loadedAt:new Date().toISOString()}});
  window.dispatchEvent(new CustomEvent('englishgate:content-patches-loaded',{detail:{count:data.patches.length}}));
 }catch(e){console.warn('Content patches unavailable',e?.message||e)}
}
window.EnglishGateContentPatches={all:PATCHES,get(courseId,lessonNumber,component){return PATCHES[`${courseId}:${Number(lessonNumber)}:${component}`]||null},reload:load};
load();
})();
