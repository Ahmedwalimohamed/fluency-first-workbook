(()=>{
'use strict';

const isTeacher=()=>window.session?.role==='teacher'||document.body?.classList.contains('role-teacher')||String(document.querySelector('#sidebarRole')?.textContent||'').toLowerCase().includes('teacher');
let overlay=null,canvas=null,ctx=null,drawing=false,last=null,tool='pen',color='#0F172A',width=4,history=[],mode='board';

const snapshot=()=>{if(canvas)history.push(canvas.toDataURL())};

const resize=()=>{
  if(!canvas)return;
  const old=canvas.toDataURL();
  const wrap=canvas.closest('.eg-whiteboard-canvas-wrap');
  const w=Math.max(800,Math.round(wrap?.clientWidth||window.innerWidth));
  const h=Math.max(500,Math.round(wrap?.clientHeight||window.innerHeight-88));
  canvas.width=w;canvas.height=h;
  ctx=canvas.getContext('2d');ctx.lineCap='round';ctx.lineJoin='round';
  const img=new Image();img.onload=()=>ctx.drawImage(img,0,0,canvas.width,canvas.height);img.src=old;
};

function setMode(next){
  mode=next==='live-task'?'live-task':'board';
  if(!overlay)return;
  overlay.classList.toggle('is-live-task',mode==='live-task');
  const board=overlay.querySelector('[data-wb-board-view]');
  const live=overlay.querySelector('[data-wb-live-view]');
  if(board)board.hidden=mode!=='board';
  if(live)live.hidden=mode!=='live-task';
  overlay.querySelectorAll('[data-wb-mode]').forEach(b=>b.classList.toggle('active',b.dataset.wbMode===mode));
  if(mode==='board')requestAnimationFrame(resize);
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
    host.innerHTML='<div class="eg-wb-live-empty"><strong>Loading Live Task…</strong><span>Please wait a moment.</span></div>';
    setTimeout(()=>{if(window.EnglishGateLiveTask?.openInWhiteboard)window.EnglishGateLiveTask.openInWhiteboard(host);else host.innerHTML='<div class="eg-wb-live-empty"><strong>Live Task is unavailable.</strong><span>Refresh EnglishGate and try again.</span></div>'},300);
    return;
  }
  await window.EnglishGateLiveTask.openInWhiteboard(host);
}

function open(){
  if(overlay){overlay.hidden=false;setMode(mode);return}
  overlay=document.createElement('section');
  overlay.className='eg-whiteboard';
  overlay.setAttribute('aria-label','Teacher whiteboard');
  overlay.innerHTML=`<header class="eg-whiteboard-bar">
    <div class="eg-whiteboard-brand">
      <strong>Whiteboard</strong>
      <span>Teach, explain and check understanding in one workspace.</span>
      <nav class="eg-whiteboard-modes" aria-label="Whiteboard mode">
        <button type="button" data-wb-mode="board" class="active">Board</button>
        <button type="button" data-wb-mode="live-task"><span aria-hidden="true">⚡</span> Live task</button>
      </nav>
    </div>
    <div class="eg-whiteboard-tools eg-whiteboard-drawing-tools">
      <button type="button" data-wb-tool="pen" class="active">Pen</button>
      <button type="button" data-wb-tool="eraser">Eraser</button>
      <label>Ink <input type="color" data-wb-color value="#0F172A" aria-label="Ink colour"></label>
      <label>Size <input type="range" data-wb-size min="2" max="24" value="4" aria-label="Pen size"></label>
      <button type="button" data-wb-undo>Undo</button>
      <button type="button" data-wb-clear>Clear</button>
      <button type="button" data-wb-close>Back to lesson</button>
    </div>
    <div class="eg-whiteboard-tools eg-whiteboard-live-tools">
      <button type="button" data-wb-board-return>← Board</button>
      <button type="button" data-wb-close>Back to lesson</button>
    </div>
  </header>
  <div class="eg-whiteboard-workspace">
    <div class="eg-whiteboard-canvas-wrap" data-wb-board-view><canvas class="eg-whiteboard-canvas"></canvas></div>
    <div class="eg-whiteboard-live-view" data-wb-live-view hidden><div id="egWhiteboardLiveTaskHost" class="eg-whiteboard-live-host"></div></div>
  </div>`;
  document.body.appendChild(overlay);
  canvas=overlay.querySelector('canvas');resize();snapshot();

  const point=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*(canvas.width/r.width),y:(e.clientY-r.top)*(canvas.height/r.height)}};
  canvas.addEventListener('pointerdown',e=>{e.preventDefault();drawing=true;last=point(e);canvas.setPointerCapture?.(e.pointerId);ctx.beginPath();ctx.moveTo(last.x,last.y)});
  canvas.addEventListener('pointermove',e=>{if(!drawing)return;e.preventDefault();const p=point(e);ctx.globalCompositeOperation=tool==='eraser'?'destination-out':'source-over';ctx.strokeStyle=color;ctx.lineWidth=tool==='eraser'?Math.max(18,width*3):width;ctx.lineTo(p.x,p.y);ctx.stroke();last=p});
  const end=e=>{if(!drawing)return;drawing=false;ctx.closePath();ctx.globalCompositeOperation='source-over';snapshot();try{canvas.releasePointerCapture?.(e.pointerId)}catch{}};
  canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);

  overlay.querySelectorAll('[data-wb-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.wbTool;overlay.querySelectorAll('[data-wb-tool]').forEach(x=>x.classList.toggle('active',x===b));canvas.style.cursor=tool==='eraser'?'cell':'crosshair'});
  overlay.querySelector('[data-wb-color]').oninput=e=>color=e.target.value;
  overlay.querySelector('[data-wb-size]').oninput=e=>width=Number(e.target.value)||4;
  overlay.querySelector('[data-wb-clear]').onclick=()=>{snapshot();ctx.clearRect(0,0,canvas.width,canvas.height)};
  overlay.querySelector('[data-wb-undo]').onclick=()=>{if(history.length<2)return;history.pop();const img=new Image();img.onload=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height)};img.src=history[history.length-1]};
  overlay.querySelectorAll('[data-wb-close]').forEach(b=>b.onclick=()=>{window.EnglishGateLiveTask?.stopPolling?.();overlay.hidden=true});
  overlay.querySelector('[data-wb-board-return]').onclick=showCanvas;
  overlay.querySelectorAll('[data-wb-mode]').forEach(b=>b.onclick=()=>b.dataset.wbMode==='live-task'?openLiveTask():showCanvas);
  window.addEventListener('resize',()=>{if(mode==='board'&&!overlay.hidden)resize()},{passive:true});
}

function inject(){
  if(!isTeacher())return;
  document.querySelectorAll('.live-class-tools').forEach(bar=>{
    if(bar.querySelector('[data-open-whiteboard]'))return;
    const actions=bar.querySelector('.live-tool-actions')||bar;
    const b=document.createElement('button');
    b.type='button';b.className='live-tool-btn teacher-whiteboard-btn';b.dataset.openWhiteboard='1';
    b.innerHTML='<span aria-hidden="true">▭</span> <span>Whiteboard</span>';
    b.onclick=open;actions.prepend(b);
  });
}

window.EnglishGateWhiteboard={open,setMode,showCanvas,getLiveTaskHost:()=>overlay?.querySelector('#egWhiteboardLiveTaskHost')||null};
const obs=new MutationObserver(inject);obs.observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',inject);inject();
})();