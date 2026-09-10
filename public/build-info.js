(()=>{
  const ID='englishgateBuildInfo';
  async function fetchBuild(){
    const r=await fetch('/api/build',{cache:'no-store',credentials:'same-origin'});
    if(!r.ok)throw new Error('Build info unavailable');
    return r.json();
  }
  function isAdmin(){
    const app=document.getElementById('app');
    const role=(document.getElementById('sidebarRole')?.textContent||'').toLowerCase();
    return Boolean(app?.classList.contains('admin-mode')||role.includes('admin'));
  }
  function mount(build){
    if(!isAdmin()||document.getElementById(ID))return;
    const footer=document.querySelector('.sidebar-footer');
    if(!footer)return;
    const badge=document.createElement('button');
    badge.id=ID;
    badge.type='button';
    badge.title=`Environment: ${build.environment||'production'}\nService: ${build.service||'unknown'}\nProject: ${build.project||'unknown'}\nDeployment: ${build.deploymentId||'unknown'}\nCommit: ${build.commitFull||build.commit||'unknown'}`;
    badge.textContent=`Production · Build ${build.commit||'unknown'}`;
    badge.style.cssText='grid-column:1/-1;margin-top:10px;width:100%;border:1px solid #e2e8f0;border-radius:9px;background:#f8fafc;color:#64748b;padding:7px 9px;font-size:11px;font-weight:700;line-height:1.2;text-align:left;cursor:help;';
    footer.appendChild(badge);
  }
  async function boot(){
    try{
      const build=await fetchBuild();
      let attempts=0;
      const timer=setInterval(()=>{
        attempts+=1;
        mount(build);
        if(document.getElementById(ID)||attempts>40)clearInterval(timer);
      },250);
    }catch(e){console.warn('EnglishGate build info:',e.message)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
