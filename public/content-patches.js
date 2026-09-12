(function(){
'use strict';
const PATCHES=window.ENGLISHGATE_CONTENT_PATCHES=window.ENGLISHGATE_CONTENT_PATCHES||{};
const BASE=window.__ENGLISHGATE_CONTENT_BASE=window.__ENGLISHGATE_CONTENT_BASE||{};
const APPLIED=new Set();
const EDITABLE=['title','outcome','expressions','vocabulary','reading','listening','grammar','writing','review','performance'];

function clone(v){return v===undefined?undefined:JSON.parse(JSON.stringify(v))}
function key(p){return `${p.course_id||p.courseId}:${Number(p.lesson_number||p.lessonNumber)}:${p.component}`}
function parts(path){
 const out=String(path||'').split('.').filter(Boolean);
 if(out.some(x=>['__proto__','prototype','constructor'].includes(x)))return[];
 return out;
}
function specificity(path){if(path==='lesson')return 0;return Math.max(1,parts(path).length)}
function books(){
 try{
  if(typeof BOOK_PACKS!=='undefined'&&BOOK_PACKS)return Object.values(BOOK_PACKS).filter(b=>b&&Array.isArray(b.lessons));
 }catch{}
 return[];
}
function book(courseId){return books().find(b=>String(b.id)===String(courseId))||null}
function lesson(courseId,lessonNumber){return book(courseId)?.lessons?.find(l=>Number(l.number)===Number(lessonNumber))||null}
function lessonSnapshot(l){const out={};EDITABLE.forEach(k=>{if(Object.prototype.hasOwnProperty.call(l,k))out[k]=clone(l[k])});return out}
function getPath(root,path){
 if(path==='lesson')return lessonSnapshot(root);
 const seg=parts(path);if(!seg.length)return undefined;
 let cur=root;
 for(const s of seg){if(cur==null)return undefined;cur=cur[/^\d+$/.test(s)?Number(s):s]}
 return clone(cur);
}
function setPath(root,path,value){
 if(!root)return false;
 if(path==='lesson'){
  EDITABLE.forEach(k=>{if(Object.prototype.hasOwnProperty.call(root,k))delete root[k]});
  if(value&&typeof value==='object'&&!Array.isArray(value))EDITABLE.forEach(k=>{if(Object.prototype.hasOwnProperty.call(value,k))root[k]=clone(value[k])});
  return true;
 }
 const seg=parts(path);if(!seg.length)return false;
 let cur=root;
 for(let i=0;i<seg.length-1;i++){
  const s=/^\d+$/.test(seg[i])?Number(seg[i]):seg[i];
  if(cur[s]==null)return false;
  cur=cur[s];
 }
 const last=/^\d+$/.test(seg.at(-1))?Number(seg.at(-1)):seg.at(-1);
 if(cur==null)return false;
 cur[last]=clone(value);return true;
}
function patchInfo(p){return{courseId:p.course_id||p.courseId,lessonNumber:Number(p.lesson_number||p.lessonNumber),targetPath:String(p.component||'')}}
function ensureBase(p){
 const info=patchInfo(p),k=`${info.courseId}:${info.lessonNumber}:${info.targetPath}`,l=lesson(info.courseId,info.lessonNumber);
 if(!l||BASE[k])return;
 BASE[k]={...info,value:getPath(l,info.targetPath)};
}
function restoreApplied(){
 const keys=[...APPLIED].sort((a,b)=>specificity(BASE[a]?.targetPath)-specificity(BASE[b]?.targetPath));
 for(const k of keys){const base=BASE[k];if(!base)continue;const l=lesson(base.courseId,base.lessonNumber);if(l)setPath(l,base.targetPath,base.value)}
 APPLIED.clear();
}
function applyPatch(p){
 const info=patchInfo(p),l=lesson(info.courseId,info.lessonNumber);if(!l)return false;
 const k=`${info.courseId}:${info.lessonNumber}:${info.targetPath}`;
 if(!BASE[k])BASE[k]={...info,value:getPath(l,info.targetPath)};
 if(!setPath(l,info.targetPath,p.replacement))return false;
 APPLIED.add(k);return true;
}
async function load(){
 restoreApplied();Object.keys(PATCHES).forEach(k=>delete PATCHES[k]);
 try{
  const r=await fetch('/api/content-patches',{cache:'no-store'}),data=await r.json();
  if(!r.ok||!Array.isArray(data?.patches))return;
  const ordered=data.patches.slice().sort((a,b)=>specificity(a.component)-specificity(b.component)||Number(a.id||0)-Number(b.id||0));
  ordered.forEach(p=>ensureBase(p));
  let applied=0;
  ordered.forEach(p=>{PATCHES[key(p)]={...p,loadedAt:new Date().toISOString()};if(applyPatch(p))applied++});
  window.dispatchEvent(new CustomEvent('englishgate:content-patches-loaded',{detail:{count:data.patches.length,applied}}));
 }catch(e){console.warn('Content patches unavailable',e?.message||e)}
}
window.EnglishGateContentPatches={
 all:PATCHES,
 get(courseId,lessonNumber,component){return PATCHES[`${courseId}:${Number(lessonNumber)}:${component}`]||null},
 source(courseId,lessonNumber,targetPath){const l=lesson(courseId,lessonNumber);return l?getPath(l,targetPath):undefined},
 books,
 reload:load
};
load();
})();
