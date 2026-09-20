'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');

function elementStub(){
  return {
    dataset:{},style:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},
    addEventListener(){},removeEventListener(){},appendChild(){},prepend(){},remove(){},setAttribute(){},
    insertAdjacentElement(){},insertAdjacentHTML(){},querySelector(){return null},querySelectorAll(){return[]},
    closest(){return null},focus(){},blur(){},scrollIntoView(){},getBoundingClientRect(){return{top:0,left:0,width:0,height:0,right:0,bottom:0}},
    innerHTML:'',textContent:'',value:'',checked:false,disabled:false
  };
}
function makeSandbox(){
  const document={
    addEventListener(){},removeEventListener(){},getElementById(){return null},querySelector(){return null},querySelectorAll(){return[]},
    createElement(){return elementStub()},body:elementStub(),documentElement:elementStub(),scrollingElement:elementStub(),visibilityState:'visible'
  };
  const store=()=>{const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()}};
  const win={
    document,location:{href:'https://englishgate.local/',search:'',hash:'',pathname:'/'},history:{scrollRestoration:'manual',replaceState(){}},
    addEventListener(){},removeEventListener(){},scrollTo(){},open(){},dispatchEvent(){},
    localStorage:store(),sessionStorage:store(),navigator:{language:'en-US',clipboard:{writeText:async()=>{}}},
    speechSynthesis:{cancel(){},speak(){},getVoices(){return[]}}
  };
  win.window=win;win.self=win;win.top=win;
  const sandbox={
    window:win,document,location:win.location,history:win.history,navigator:win.navigator,
    localStorage:win.localStorage,sessionStorage:win.sessionStorage,
    console:{log(){},warn(){},error(){}},
    MutationObserver:class{observe(){} disconnect(){}},ResizeObserver:class{observe(){} disconnect(){}},IntersectionObserver:class{observe(){} disconnect(){}},
    CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail}},
    SpeechSynthesisUtterance:class{constructor(text){this.text=text}},
    Audio:class{play(){return Promise.resolve()} pause(){}},
    URL,URLSearchParams,TextEncoder,TextDecoder,Map,Set,WeakMap,WeakSet,Date,Math,JSON,Array,Object,String,Number,Boolean,RegExp,Promise,
    crypto:{randomUUID:()=> 'audit-'+Math.random().toString(36).slice(2)},
    fetch:async()=>({ok:false,status:404,json:async()=>({}),text:async()=>''}),
    setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},requestAnimationFrame:fn=>{if(typeof fn==='function')fn();return 0},cancelAnimationFrame(){},
    alert(){},confirm(){return false},atob:s=>Buffer.from(String(s),'base64').toString('binary'),btoa:s=>Buffer.from(String(s),'binary').toString('base64')
  };
  sandbox.globalThis=sandbox;
  return sandbox;
}
function scriptSources(){
  const pub=path.join(__dirname,'public');
  const html=fs.readFileSync(path.join(pub,'index.html'),'utf8');
  const sources=[...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map(m=>m[1].split('?')[0]).filter(x=>x&&!x.startsWith('/')&&x.endsWith('.js'));
  const stop=sources.indexOf('content-patches.js');
  return (stop>=0?sources.slice(0,stop):sources).filter((src,i,a)=>a.indexOf(src)===i).map(src=>path.join(pub,src)).filter(fs.existsSync);
}
function shouldEval(file,code){
  const base=path.basename(file);
  if(['speakup-b2-blueprint.js','app.js','cefr-levels.js','a1-foundation-phase1.js','a1-foundation-phase2.js','a1-foundation-phase3.js','a1-foundation-phase4.js','a1-foundation-standard.js','a2-living-standard.js'].includes(base))return true;
  return /BOOK_PACKS\s*\[|BOOK_PACKS\.|A1_FOUNDATION_SPECS|SPEAKUP_B2_BLUEPRINT/.test(code);
}
function buildBooks(){
  const context=vm.createContext(makeSandbox());
  const evaluated=[],skipped=[],errors=[];
  for(const file of scriptSources()){
    const code=fs.readFileSync(file,'utf8');
    if(!shouldEval(file,code)){skipped.push(path.basename(file));continue}
    try{
      const extra=path.basename(file)==='app.js'?';globalThis.__englishGateBooks=()=>BOOK_PACKS;':'';
      vm.runInContext(code+extra,context,{filename:file,timeout:3000});
      evaluated.push(path.basename(file));
    }catch(e){
      errors.push({file:path.basename(file),error:String(e.message||e).slice(0,300)});
    }
  }
  if(typeof context.__englishGateBooks!=='function')throw new Error('BOOK_PACKS could not be exported from app.js');
  const books=context.__englishGateBooks();
  return {books:JSON.parse(JSON.stringify(Object.values(books).filter(b=>b&&Array.isArray(b.lessons)))),evaluated,skipped,errors};
}
function parts(p){return String(p||'').split('.').filter(Boolean)}
function specificity(p){return p==='lesson'?0:Math.max(1,parts(p).length)}
function setPath(root,target,value){
  if(target==='lesson'){
    const keys=['title','outcome','expressions','vocabulary','reading','listening','grammar','writing','review','performance'];
    for(const k of keys)delete root[k];
    for(const k of keys)if(value&&Object.prototype.hasOwnProperty.call(value,k))root[k]=JSON.parse(JSON.stringify(value[k]));
    return true;
  }
  const seg=parts(target);if(!seg.length||seg.some(x=>['__proto__','prototype','constructor'].includes(x)))return false;
  let cur=root;
  for(let i=0;i<seg.length-1;i++){const k=/^\d+$/.test(seg[i])?Number(seg[i]):seg[i];if(cur?.[k]==null)return false;cur=cur[k]}
  const k=/^\d+$/.test(seg.at(-1))?Number(seg.at(-1)):seg.at(-1);if(cur==null)return false;
  cur[k]=JSON.parse(JSON.stringify(value));return true;
}
function applyPatches(books,patches=[]){
  const byId=new Map(books.map(b=>[String(b.id),b]));
  const ordered=patches.slice().sort((a,b)=>specificity(a.component)-specificity(b.component)||Number(a.id||0)-Number(b.id||0));
  let applied=0;
  for(const p of ordered){
    const book=byId.get(String(p.course_id||p.courseId));if(!book)continue;
    const lesson=book.lessons.find(l=>Number(l.number)===Number(p.lesson_number||p.lessonNumber));if(!lesson)continue;
    if(setPath(lesson,String(p.component||''),p.replacement)){applied++}
  }
  return applied;
}
module.exports={buildBooks,applyPatches};
