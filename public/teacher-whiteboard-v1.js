(()=>{
'use strict';

const isTeacher=()=>window.session?.role==='teacher'||document.body?.classList.contains('role-teacher')||String(document.querySelector('#sidebarRole')?.textContent||'').toLowerCase().includes('teacher');

let overlay=null,boardCanvas=null,boardCtx=null,boardDrawing=false,boardLast=null;
let mode='board',tool='pen',color='#0F172A',width=4,liveAnnotationApi=null;
const boardHistory=[];

function boardSnapshot(){
  if(!boardCanvas)return;
  boardHistory.push(boardCanvas.toDataURL());
  if(boardHistory.length>60)boardHistory.shift();
}
function boardResize(){
  if(!boardCanvas||!overlay||overlay.hidden||mode!=='board')return;
  const wrap=boardCanvas.closest('.eg-whiteboard-canvas-wrap');
  const previous=boardCanvas.toDataURL();
  const cssW=Math.max(640,Math.round(wrap?.clientWidth||window.innerWidth));
  const cssH=Math.max(420,Math.round(wrap?.clientHeight||window.innerHeight-130));
  boardCanvas.width=cssW;boardCanvas.height=cssH;
  boardCtx=boardCanvas.getContext('2d');boardCtx.lineCap='round';boardCtx.lineJoin='round';
  const img=new Image();img.onload=()=>boardCtx.drawImage(img,0,0,boardCanvas.width,boardCanvas.height);img.src=previous;
}
function boardPoint(e){
  const r=boardCanvas.getBoundingClientRect();
  return{x:(e.clientX-r.left)*(boardCanvas.width/r.width),y:(e.clientY-r.top)*(boardCanvas.height/r.height)};
}
function boardStyle(){
  boardCtx.globalCompositeOperation=tool==='eraser'?'destination-out':'source-over';
  boardCtx.globalAlpha=tool==='highlighter'?.24:1;
  boardCtx.strokeStyle=color;
  boardCtx.lineWidth=tool==='eraser'?Math.max(20,width*4):tool==='highlighter'?Math.max(14,width*4):width;
}
function openBoardTextEditor(e){
  const wrap=boardCanvas.closest('.eg-whiteboard-canvas-wrap'),r=wrap.getBoundingClientRect(),p=boardPoint(e);
  const input=document.createElement('input');
  input.className='eg-whiteboard-inline-text';
  input.placeholder='Type, then press Enter';
  input.style.left=Math.max(8,e.clientX-r.left)+'px';
  input.style.top=Math.max(8,e.clientY-r.top)+'px';
  wrap.appendChild(input);input.focus();
  let done=false;
  const commit=()=>{
    if(done)return;done=true;
    const text=input.value.trim();input.remove();
    if(!text)return;
    boardCtx.globalCompositeOperation='source-over';boardCtx.globalAlpha=1;boardCtx.fillStyle=color;
    boardCtx.font=`600 ${Math.max(18,width*4)}px system-ui, sans-serif`;
    boardCtx.textBaseline='top';boardCtx.fillText(text,p.x,p.y);boardSnapshot();
  };
  input.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();commit()}if(ev.key==='Escape'){done=true;input.remove()}});
  input.addEventListener('blur',commit,{once:true});
}
function boardUndo(){
  if(boardHistory.length<2)return;
  boardHistory.pop();const src=boardHistory[boardHistory.length-1],img=new Image();
  img.onload=()=>{boardCtx.clearRect(0,0,boardCanvas.width,boardCanvas.height);boardCtx.drawImage(img,0,0,boardCanvas.width,boardCanvas.height)};
  img.src=src;
}
function boardClear(){
  if(!boardCanvas)return;boardSnapshot();boardCtx.clearRect(0,0,boardCanvas.width,boardCanvas.height);
}
function emitToolState(){
  const detail={tool,color,width};
  window.dispatchEvent(new CustomEvent('englishgate:whiteboard-tool',{detail}));
}
function selectTool(next){
  tool=next||'pointer';
  overlay?.querySelectorAll('[data-wb-tool]').forEach(b=>b.classList.toggle('active',b.dataset.wbTool===tool));
  if(boardCanvas)boardCanvas.style.cursor=tool==='pointer'?'default':tool==='text'?'text':tool==='eraser'?'cell':'crosshair';
  emitToolState();
}
function undo(){
  if(mode==='live-task'&&liveAnnotationApi?.undo)return liveAnnotationApi.undo();
  boardUndo();
}
function clear(){
  if(mode==='live-task'&&liveAnnotationApi?.clear)return liveAnnotationApi.clear();
  boardClear();
}
function setMode(next){
  mode=next==='live-task'?'live-task':'board';
  if(!overlay)return;
  overlay.classList.toggle('is-live-task',mode==='live-task');
  const board=overlay.querySelector('[data-wb-board-view]'),live=overlay.querySelector('[data-wb-live-view]'),command=overlay.querySelector('[data-wb-live-command]');
  if(board)board.hidden=mode!=='board';
  if(live)live.hidden=mode!=='live-task';
  if(command)command.hidden=mode!=='live-task';
  overlay.querySelectorAll('[data-wb-mode]').forEach(b=>b.classList.toggle('active',b.dataset.wbMode===mode));
  if(mode==='board'){liveAnnotationApi=null;requestAnimationFrame(boardResize)}
}
function showCanvas(){
  window.EnglishGateLiveTask?.stopPolling?.();
  setMode('board');
}
async function openLiveTask(){
  setMode('live-task');
  const host=overlay?.querySelector('#egWhiteboardLiveTaskHost');
  if(!host)return;
  if(!window.EnglishGateLiveTask?.openInWhiteboard){
    host.innerHTML='<div class="eg-live-loading"><strong>Loading Live Task…</strong><span>Please wait.</span></div>';
    setTimeout(()=>window.EnglishGateLiveTask?.openInWhiteboard?.(host),250);
    return;
  }
  await window.EnglishGateLiveTask.openInWhiteboard(host);
}
function close(){
  window.EnglishGateLiveTask?.stopPolling?.();
  if(overlay)overlay.hidden=true;
}

function open(){
  if(overlay){
    overlay.hidden=false;
    if(mode==='live-task')openLiveTask();else{setMode('board');requestAnimationFrame(boardResize)}
    return;
  }
  overlay=document.createElement('section');
  overlay.className='eg-whiteboard';
  overlay.setAttribute('aria-label','EnglishGate classroom whiteboard');
  overlay.innerHTML=`<header class="eg-whiteboard-head">
    <div class="eg-whiteboard-head-main">
      <div class="eg-whiteboard-brand"><strong>EnglishGate Board</strong><span>Teach and check understanding without leaving the board.</span></div>
      <nav class="eg-whiteboard-tabs" aria-label="Board views">
        <button type="button" data-wb-close>Lesson</button>
        <button type="button" data-wb-mode="board" class="active">Whiteboard</button>
        <button type="button" data-wb-mode="live-task"><span aria-hidden="true">⚡</span> Live Task</button>
      </nav>
      <div class="eg-whiteboard-tools" role="toolbar" aria-label="Annotation tools">
        <button type="button" data-wb-tool="pointer">Pointer</button>
        <button type="button" data-wb-tool="pen" class="active">Pen</button>
        <button type="button" data-wb-tool="highlighter">Highlighter</button>
        <button type="button" data-wb-tool="text">Text</button>
        <button type="button" data-wb-tool="eraser">Eraser</button>
        <button type="button" data-wb-undo>Undo</button>
        <button type="button" data-wb-clear>Clear</button>
        <label class="eg-wb-ink"><span>Ink</span><input type="color" data-wb-color value="#0F172A" aria-label="Ink colour"></label>
        <label class="eg-wb-size"><span>Size</span><input type="range" data-wb-size min="2" max="18" value="4" aria-label="Annotation size"></label>
      </div>
    </div>
    <div class="eg-whiteboard-live-command" data-wb-live-command hidden>
      <span class="eg-live-command-label">Live Task</span>
      <input id="egWhiteboardLivePrompt" type="text" autocomplete="off" placeholder="Create 5 questions about going to, 5 minutes">
      <button id="egWhiteboardGenerateLive" type="button">Generate</button>
      <span id="egWhiteboardLiveStatus" class="eg-live-command-status"></span>
    </div>
  </header>
  <div class="eg-whiteboard-workspace">
    <div class="eg-whiteboard-canvas-wrap" data-wb-board-view><canvas class="eg-whiteboard-canvas"></canvas></div>
    <div class="eg-whiteboard-live-view" data-wb-live-view hidden><div id="egWhiteboardLiveTaskHost" class="eg-whiteboard-live-host"></div></div>
  </div>`;
  document.body.appendChild(overlay);

  boardCanvas=overlay.querySelector('.eg-whiteboard-canvas');
  requestAnimationFrame(()=>{boardResize();boardSnapshot()});

  boardCanvas.addEventListener('pointerdown',e=>{
    if(tool==='pointer')return;
    if(tool==='text'){e.preventDefault();openBoardTextEditor(e);return}
    e.preventDefault();boardDrawing=true;boardLast=boardPoint(e);boardCanvas.setPointerCapture?.(e.pointerId);
    boardCtx.beginPath();boardCtx.moveTo(boardLast.x,boardLast.y);boardStyle();
  });
  boardCanvas.addEventListener('pointermove',e=>{
    if(!boardDrawing)return;e.preventDefault();const p=boardPoint(e);boardStyle();boardCtx.lineTo(p.x,p.y);boardCtx.stroke();boardLast=p;
  });
  const finish=e=>{
    if(!boardDrawing)return;boardDrawing=false;boardCtx.closePath();boardCtx.globalCompositeOperation='source-over';boardCtx.globalAlpha=1;boardSnapshot();
    try{boardCanvas.releasePointerCapture?.(e.pointerId)}catch{}
  };
  boardCanvas.addEventListener('pointerup',finish);boardCanvas.addEventListener('pointercancel',finish);

  overlay.querySelectorAll('[data-wb-tool]').forEach(b=>b.onclick=()=>selectTool(b.dataset.wbTool));
  overlay.querySelector('[data-wb-color]').oninput=e=>{color=e.target.value;emitToolState()};
  overlay.querySelector('[data-wb-size]').oninput=e=>{width=Number(e.target.value)||4;emitToolState()};
  overlay.querySelector('[data-wb-undo]').onclick=undo;
  overlay.querySelector('[data-wb-clear]').onclick=clear;
  overlay.querySelectorAll('[data-wb-close]').forEach(b=>b.onclick=close);
  overlay.querySelectorAll('[data-wb-mode]').forEach(b=>b.onclick=()=>b.dataset.wbMode==='live-task'?openLiveTask():showCanvas);
  window.addEventListener('resize',()=>{if(mode==='board'&&!overlay.hidden)requestAnimationFrame(boardResize)},{passive:true});
  selectTool('pen');
}
function inject(){
  if(!isTeacher())return;
  document.querySelectorAll('.live-class-tools').forEach(bar=>{
    if(bar.querySelector('[data-open-whiteboard]'))return;
    const actions=bar.querySelector('.live-tool-actions')||bar;
    const b=document.createElement('button');b.type='button';b.className='live-tool-btn teacher-whiteboard-btn';b.dataset.openWhiteboard='1';
    b.innerHTML='<span aria-hidden="true">▭</span> <span>Whiteboard</span>';b.onclick=open;actions.prepend(b);
  });
}
window.EnglishGateWhiteboard={
  open,setMode,showCanvas,
  getLiveTaskHost:()=>overlay?.querySelector('#egWhiteboardLiveTaskHost')||null,
  getLivePromptInput:()=>overlay?.querySelector('#egWhiteboardLivePrompt')||null,
  getLiveGenerateButton:()=>overlay?.querySelector('#egWhiteboardGenerateLive')||null,
  getLiveStatus:()=>overlay?.querySelector('#egWhiteboardLiveStatus')||null,
  getToolState:()=>({tool,color,width}),
  setLiveAnnotationApi:api=>{liveAnnotationApi=api||null},
  setLivePromptState:({disabled=false,busy=false,label,value,placeholder,status}={})=>{
    const input=overlay?.querySelector('#egWhiteboardLivePrompt'),button=overlay?.querySelector('#egWhiteboardGenerateLive'),statusEl=overlay?.querySelector('#egWhiteboardLiveStatus');
    if(input){input.disabled=disabled||busy;if(value!==undefined)input.value=value;if(placeholder!==undefined)input.placeholder=placeholder}
    if(button){button.disabled=disabled||busy;button.textContent=busy?'Generating…':(label||'Generate')}
    if(statusEl&&status!==undefined)statusEl.textContent=status||'';
  }
};
const obs=new MutationObserver(inject);obs.observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',inject);inject();
})();