/* EnglishGate Visual Scene Engine v1
   Lightweight contextual visuals for Reading and Listening.
   Scenes are generated in-browser as inline SVG from reusable vector primitives,
   so lessons do not store separate image files. The engine never uses transcript
   text inside the visual and keeps each rendered SVG below 10 KB. */
(function(){
'use strict';

const MAX_BYTES=10*1024;
const panel=()=>document.getElementById('activityPanel');
const currentLesson=()=>{try{return typeof lesson==='function'?lesson():null}catch{return null}};
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function sourceText(l,type){
  if(!l)return'';
  if(type==='listening')return String(l?.listening?.audioScript||l?.listening?.text||'');
  return String(l?.reading?.passage||l?.listening?.readingText||'');
}

function settingFor(text){
  const t=String(text||'').toLowerCase();
  const rules=[
    ['airport',/airport|flight|boarding|gate|passport|luggage|terminal/],
    ['cafe',/cafe|café|coffee|tea|barista/],
    ['restaurant',/restaurant|menu|waiter|waitress|order food|dinner|lunch/],
    ['classroom',/classroom|teacher|student|lesson|school|university|homework/],
    ['office',/office|meeting|manager|colleague|client|workplace|report/],
    ['hospital',/hospital|doctor|nurse|patient|clinic|medicine|appointment/],
    ['shop',/shop|store|customer|cashier|price|buy|purchase/],
    ['transport',/bus|station|taxi|train|driver|ticket|journey|travel/],
    ['home',/home|house|kitchen|bedroom|family|mother|father|sister|brother/],
    ['park',/park|garden|tree|outside|walk|picnic/],
    ['phone',/phone|call|calling|telephone|video call/]
  ];
  return rules.find(([,re])=>re.test(t))?.[0]||'conversation';
}

function dialogueSpeakers(text){
  const names=[];
  String(text||'').split(/\n+/).forEach(line=>{
    const m=line.trim().match(/^([A-Z][A-Za-z'’.-]{1,24})(?:\s+[A-Z][A-Za-z'’.-]{1,24})?\s*:/);
    if(m&&!names.includes(m[1]))names.push(m[1]);
  });
  return names.slice(0,3);
}
function speakerCount(text,type){
  const detected=dialogueSpeakers(text).length;
  if(detected)return Math.max(1,Math.min(3,detected));
  if(type==='listening')return 2;
  const t=String(text||'').toLowerCase();
  if(/\bthey\b|\btwo\b|\bfriends\b|\bcouple\b/.test(t))return 2;
  return 1;
}

function sceneProps(setting){
  const common='<rect width="800" height="450" fill="#F8FAFC"/><rect y="330" width="800" height="120" fill="#E2E8F0"/>';
  const scenes={
    cafe:common+'<rect x="70" y="58" width="660" height="250" rx="18" fill="#FFF7ED"/><rect x="108" y="86" width="185" height="125" rx="10" fill="#DBEAFE"/><path d="M126 210h148" stroke="#94A3B8" stroke-width="8"/><rect x="510" y="86" width="150" height="94" rx="10" fill="#FED7AA"/><circle cx="585" cy="130" r="27" fill="#F59E0B"/><rect x="250" y="292" width="300" height="22" rx="10" fill="#92400E"/><rect x="280" y="314" width="18" height="70" fill="#78350F"/><rect x="502" y="314" width="18" height="70" fill="#78350F"/>' ,
    airport:common+'<rect x="55" y="48" width="690" height="270" rx="18" fill="#EFF6FF"/><rect x="86" y="78" width="410" height="165" rx="10" fill="#BFDBFE"/><path d="M105 215h370M290 79v164" stroke="#fff" stroke-width="8"/><path d="M540 106h145M540 144h112" stroke="#94A3B8" stroke-width="12" stroke-linecap="round"/><path d="M144 134l122 30-122 30 22-30z" fill="#2563EB"/>' ,
    classroom:common+'<rect x="70" y="52" width="660" height="260" rx="18" fill="#FFFBEB"/><rect x="130" y="88" width="420" height="130" rx="10" fill="#D1FAE5"/><path d="M170 245h130M420 245h130" stroke="#92400E" stroke-width="16"/><path d="M200 245v66M500 245v66" stroke="#78350F" stroke-width="12"/>' ,
    office:common+'<rect x="65" y="48" width="670" height="270" rx="18" fill="#F1F5F9"/><rect x="104" y="78" width="210" height="130" rx="10" fill="#DBEAFE"/><path d="M340 92h320M340 128h250M340 164h285" stroke="#CBD5E1" stroke-width="13" stroke-linecap="round"/><rect x="235" y="284" width="330" height="22" rx="9" fill="#475569"/>' ,
    hospital:common+'<rect x="65" y="48" width="670" height="270" rx="18" fill="#F0FDFA"/><rect x="110" y="84" width="145" height="145" rx="12" fill="#CCFBF1"/><path d="M183 112v88M139 156h88" stroke="#0F766E" stroke-width="24"/><rect x="450" y="235" width="210" height="45" rx="16" fill="#fff" stroke="#CBD5E1" stroke-width="5"/>' ,
    restaurant:common+'<rect x="70" y="55" width="660" height="255" rx="18" fill="#FFF7ED"/><circle cx="175" cy="116" r="38" fill="#FDBA74"/><circle cx="650" cy="116" r="38" fill="#FDBA74"/><rect x="255" y="285" width="290" height="24" rx="10" fill="#7C2D12"/><circle cx="398" cy="282" r="34" fill="#fff" stroke="#CBD5E1" stroke-width="5"/>' ,
    shop:common+'<rect x="65" y="50" width="670" height="265" rx="18" fill="#FAF5FF"/><path d="M100 105h230M100 165h230M100 225h230" stroke="#C4B5FD" stroke-width="16"/><rect x="515" y="202" width="145" height="74" rx="12" fill="#EDE9FE"/>' ,
    transport:common+'<rect x="60" y="55" width="680" height="255" rx="18" fill="#EFF6FF"/><rect x="95" y="105" width="430" height="135" rx="24" fill="#2563EB"/><rect x="125" y="125" width="110" height="65" rx="8" fill="#DBEAFE"/><rect x="255" y="125" width="110" height="65" rx="8" fill="#DBEAFE"/><circle cx="185" cy="252" r="30" fill="#0F172A"/><circle cx="445" cy="252" r="30" fill="#0F172A"/>' ,
    home:common+'<path d="M120 190L400 65l280 125v135H120z" fill="#FEF3C7"/><path d="M95 198L400 45l305 153" fill="none" stroke="#92400E" stroke-width="24" stroke-linecap="round"/><rect x="330" y="190" width="140" height="135" rx="8" fill="#FED7AA"/><rect x="175" y="205" width="105" height="72" rx="8" fill="#DBEAFE"/>' ,
    park:common+'<rect y="240" width="800" height="120" fill="#DCFCE7"/><circle cx="140" cy="150" r="72" fill="#86EFAC"/><rect x="125" y="185" width="30" height="125" fill="#854D0E"/><circle cx="660" cy="145" r="78" fill="#BBF7D0"/><rect x="645" y="185" width="30" height="125" fill="#854D0E"/><path d="M280 315c80-80 160-80 240 0" fill="none" stroke="#D6D3D1" stroke-width="44"/>' ,
    phone:common+'<rect x="70" y="55" width="660" height="255" rx="18" fill="#EFF6FF"/><rect x="330" y="80" width="140" height="210" rx="24" fill="#0F172A"/><rect x="348" y="104" width="104" height="150" rx="12" fill="#DBEAFE"/><circle cx="400" cy="272" r="8" fill="#94A3B8"/>' ,
    conversation:common+'<rect x="70" y="55" width="660" height="255" rx="18" fill="#F8FAFC"/><rect x="110" y="90" width="210" height="118" rx="12" fill="#DBEAFE"/><rect x="480" y="90" width="210" height="118" rx="12" fill="#EDE9FE"/><rect x="255" y="292" width="290" height="20" rx="10" fill="#CBD5E1"/>'
  };
  return scenes[setting]||scenes.conversation;
}

function person(x,y,variant){
  const skin=variant%3===0?'#8D5524':variant%3===1?'#C68642':'#E0AC69';
  const shirt=variant%3===0?'#2563EB':variant%3===1?'#7C3AED':'#0F766E';
  const hair=variant%2===0?'#1F2937':'#111827';
  return `<g transform="translate(${x} ${y})"><circle cx="0" cy="0" r="35" fill="${skin}"/><path d="M-34-7c7-36 62-36 68 1v10c-12-12-22-18-34-18S-22-7-34 5z" fill="${hair}"/><rect x="-48" y="36" width="96" height="112" rx="42" fill="${shirt}"/><path d="M-32 76l-58 42M32 76l58 42" stroke="${skin}" stroke-width="20" stroke-linecap="round"/></g>`;
}

function buildSvg(setting,count,type){
  const people=count===1?person(400,205,1):count===2?person(300,205,0)+person(500,205,1):person(245,210,0)+person(400,195,1)+person(555,210,2);
  const label=type==='listening'?'Conversation scene':'Reading scene';
  return `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label} in a ${setting} setting"><title>${label} in a ${setting} setting</title>${sceneProps(setting)}${people}</svg>`;
}

function minimalSvg(count,type){
  const people=count===1?person(400,210,0):person(310,210,0)+person(490,210,1);
  const label=type==='listening'?'Conversation scene':'Reading scene';
  return `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}"><title>${label}</title><rect width="800" height="450" fill="#F8FAFC"/><rect y="330" width="800" height="120" fill="#E2E8F0"/>${people}</svg>`;
}

function makeFigure(l,type){
  const text=sourceText(l,type),setting=settingFor(text),count=speakerCount(text,type);
  let svg=buildSvg(setting,count,type);
  let bytes=new TextEncoder().encode(svg).length;
  if(bytes>=MAX_BYTES){svg=minimalSvg(Math.min(count,2),type);bytes=new TextEncoder().encode(svg).length}
  const figure=document.createElement('figure');
  figure.className='eg-scene-card';
  figure.dataset.sceneEngine='v1';
  figure.dataset.sceneSetting=setting;
  figure.dataset.sceneBytes=String(bytes);
  figure.innerHTML=`<div class="eg-scene-art">${svg}</div><figcaption>${type==='listening'?'Look at the scene before you listen.':'Look at the scene before you read.'}</figcaption>`;
  return figure;
}

function render(){
  const root=panel()?.querySelector('.eg-separated-activity');
  if(!root||root.querySelector('[data-scene-engine]'))return;
  const type=root.dataset.activityType;
  if(type!=='reading'&&type!=='listening')return;
  const l=currentLesson();if(!l)return;
  const figure=makeFigure(l,type);
  const source=root.querySelector(type==='listening'?'.sep-audio-source':'.sep-source');
  if(source)source.parentElement?.insertBefore(figure,source);
}

let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render()})}
function start(){
  const host=panel()||document.body;
  new MutationObserver(schedule).observe(host,{subtree:true,childList:true,attributes:true,attributeFilter:['data-activity-type']});
  schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();

window.ENGLISHGATE_VISUAL_SCENE_ENGINE={version:'1.0.0',maxBytes:MAX_BYTES,settingFor,speakerCount,buildSvg};
})();
