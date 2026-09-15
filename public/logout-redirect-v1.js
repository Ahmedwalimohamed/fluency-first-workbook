(()=>{
  'use strict';

  const PENDING_KEY='englishgate:logout-pending-v2';
  const RETRY_MS=2500;
  const MAX_RETRIES=24;
  let signingOut=false;
  let retryTimer=null;
  let retryCount=0;

  function isLogoutTarget(target){
    return Boolean(target?.closest?.('#studentLogout,#logoutBtn'));
  }

  function safeStorage(action){
    try{return action(localStorage)}catch(_){return null}
  }

  function setPending(value){
    safeStorage(store=>value?store.setItem(PENDING_KEY,'1'):store.removeItem(PENDING_KEY));
  }

  function isPending(){
    return safeStorage(store=>store.getItem(PENDING_KEY)==='1')===true;
  }

  function showLogin(message='Signing you out securely…'){
    const app=document.getElementById('app');
    const login=document.getElementById('loginScreen');
    const error=document.getElementById('loginError');
    const form=document.getElementById('loginForm');
    const submit=form?.querySelector('button[type="submit"]');

    if(app)app.classList.add('hidden');
    if(login)login.classList.remove('hidden');
    if(error){
      error.textContent=message;
      error.style.display='block';
    }
    if(submit){
      submit.disabled=true;
      submit.setAttribute('aria-disabled','true');
    }

    try{
      history.replaceState(null,'','/');
    }catch(_){/* URL cleanup is optional */}
  }

  function enableLogin(message='You are signed out. You can sign in again.'){
    const error=document.getElementById('loginError');
    const form=document.getElementById('loginForm');
    const submit=form?.querySelector('button[type="submit"]');
    if(error){
      error.textContent=message;
      error.style.display='block';
    }
    if(submit){
      submit.disabled=false;
      submit.removeAttribute('aria-disabled');
    }
  }

  async function requestLogout(){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),4500);
    try{
      const response=await fetch('/api/auth/logout',{
        method:'POST',
        credentials:'same-origin',
        cache:'no-store',
        keepalive:true,
        headers:{'Content-Type':'application/json'},
        signal:controller.signal
      });
      return response.ok;
    }catch(_){
      return false;
    }finally{
      clearTimeout(timeout);
    }
  }

  async function completeLogout(){
    if(!isPending())return;
    const ok=await requestLogout();
    if(ok){
      if(retryTimer){clearTimeout(retryTimer);retryTimer=null}
      retryCount=0;
      setPending(false);
      signingOut=false;
      enableLogin();
      return;
    }

    retryCount+=1;
    showLogin(navigator.onLine
      ? 'EnglishGate is reconnecting. You remain on the sign-in screen while sign-out completes…'
      : 'You are offline. You remain on the sign-in screen and sign-out will finish when the connection returns.');

    if(retryCount<MAX_RETRIES){
      retryTimer=setTimeout(completeLogout,RETRY_MS);
    }else{
      // Keep the user safely on the local login screen. A later online event or
      // page load will resume the pending server-side logout.
      signingOut=false;
      enableLogin('Sign-out is waiting for the server to reconnect. Please wait a moment before signing in again.');
    }
  }

  function beginLogout(event){
    if(!isLogoutTarget(event.target)||signingOut)return;
    signingOut=true;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    setPending(true);
    retryCount=0;
    showLogin();
    completeLogout();
  }

  document.addEventListener('click',beginLogout,true);

  window.addEventListener('online',()=>{
    if(isPending()){
      retryCount=0;
      showLogin('Connection restored. Finishing sign-out…');
      completeLogout();
    }
  });

  // If the browser restored/reloaded the page while a logout was pending,
  // never flash the authenticated app. Stay on the login screen and finish
  // clearing the server session in the background.
  function resumePendingLogout(){
    if(!isPending())return;
    signingOut=true;
    showLogin();
    completeLogout();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',resumePendingLogout,{once:true});
  else resumePendingLogout();
})();
