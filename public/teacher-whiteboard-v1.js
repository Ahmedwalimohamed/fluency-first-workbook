(()=>{
  const isTeacher=()=>window.session?.role==='teacher'||document.body?.classList.contains('role-teacher')||String(document.querySelector('#sidebarRole')?.textContent||'').toLowerCase().includes('teacher');
  let overlay=null,canvas=null,ctx=null,drawing=false,last=null,tool='pen',color='#0F172A',width=4,history=[];
  const snapshot=()=>{if(canvas)history.push(canvas.toDataURL())};
  const resize=()=>{if(!canvas)return;const old=canvas.toDataURL();canvas.width=Math.max(800,window.innerWidth);canvas.height=Math.max(500,window.innerHeight-70);ctx=canvas.getContext('2d');ctx.lineCap='round';ctx.lineJoin='round';const img=new Image();img.onload=()=>ctx.drawImage(img,0,0,canvas.width,canvas.height);img.src=old};
  function open(){
    if(overlay){overlay.hidden=false;return}
    overlay=document.createElement('section');overlay.className='eg-whiteboard';overlay.setAttribute('aria-label','Teacher whiteboard');
    overlay.innerHTML=`<header class="eg-whiteboard-bar"><div><strong>Whiteboard</strong><span>Explain, draw, write and sketch for your class.</span></div><div class="eg-whiteboard-tools"><button type="button" data-wb-tool="pen" class="active">Pen</button><button type="button" data-wb-tool="eraser">Eraser</button><label>Ink <input type="color" data-wb-color value="#0F172A" aria-label="Ink colour"></label><label>Size <input type="range" data-wb-size min="2" max="24" value="4" aria-label="Pen size"></label><button type="button" data-wb-undo>Undo</button><button type="button" data-wb-clear>Clear</button><button type="button" data-wb-close>Back to lesson</button></div></header><div class="eg-whiteboard-canvas-wrap"><canvas class="eg-whiteboard-canvas"></canvas></div>`;
    document.body.appendChild(overlay);canvas=overlay.querySelector('canvas');resize();snapshot();
    const point=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*(canvas.width/r.width),y:(e.clientY-r.top)*(canvas.height/r.height)}};
    canvas.addEventListener('pointerdown',e=>{e.preventDefault();drawing=true;last=point(e);canvas.setPointerCapture?.(e.pointerId);ctx.beginPath();ctx.moveTo(last.x,last.y)});
    canvas.addEventListener('pointermove',e=>{if(!drawing)return;e.preventDefault();const p=point(e);ctx.globalCompositeOperation=tool==='eraser'?'destination-out':'source-over';ctx.strokeStyle=color;ctx.lineWidth=tool==='eraser'?Math.max(18,width*3):width;ctx.lineTo(p.x,p.y);ctx.stroke();last=p});
    const end=e=>{if(!drawing)return;drawing=false;ctx.closePath();ctx.globalCompositeOperation='source-over';snapshot();try{canvas.releasePointerCapture?.(e.pointerId)}catch{}};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
    overlay.querySelectorAll('[data-wb-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.wbTool;overlay.querySelectorAll('[data-wb-tool]').forEach(x=>x.classList.toggle('active',x===b));canvas.style.cursor=tool==='eraser'?'cell':'crosshair'});
    overlay.querySelector('[data-wb-color]').oninput=e=>color=e.target.value;overlay.querySelector('[data-wb-size]').oninput=e=>width=Number(e.target.value)||4;
    overlay.querySelector('[data-wb-clear]').onclick=()=>{snapshot();ctx.clearRect(0,0,canvas.width,canvas.height)};
    overlay.querySelector('[data-wb-undo]').onclick=()=>{if(history.length<2)return;history.pop();const img=new Image();img.onload=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height)};img.src=history[history.length-1]};
    overlay.querySelector('[data-wb-close]').onclick=()=>overlay.hidden=true;
    window.addEventListener('resize',resize,{passive:true});
  }
  function inject(){
    if(!isTeacher())return;
    document.querySelectorAll('.live-class-tools').forEach(bar=>{if(bar.querySelector('[data-open-whiteboard]'))return;const actions=bar.querySelector('.live-tool-actions')||bar;const b=document.createElement('button');b.type='button';b.className='live-tool-btn teacher-whiteboard-btn';b.dataset.openWhiteboard='1';b.innerHTML='<span aria-hidden="true">▭</span> <span>Whiteboard</span>';b.onclick=open;actions.prepend(b)});
  }
  const obs=new MutationObserver(inject);obs.observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('DOMContentLoaded',inject);inject();
})();