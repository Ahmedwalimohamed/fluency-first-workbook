(()=>{
  'use strict';

  let signingOut=false;

  function isLogoutTarget(target){
    return Boolean(target?.closest?.('#studentLogout,#logoutBtn'));
  }

  async function forceLogoutRedirect(event){
    if(!isLogoutTarget(event.target)||signingOut)return;
    signingOut=true;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const app=document.getElementById('app');
    const login=document.getElementById('loginScreen');
    if(app)app.classList.add('hidden');
    if(login)login.classList.remove('hidden');

    try{
      await fetch('/api/auth/logout',{
        method:'POST',
        credentials:'same-origin',
        headers:{'Content-Type':'application/json'}
      });
    }catch(_){/* redirect even if the request fails */}

    window.location.replace('/');
  }

  document.addEventListener('click',forceLogoutRedirect,true);
})();
