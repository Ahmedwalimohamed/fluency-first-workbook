/* EnglishGate PWA registration and install experience */
(function(){
'use strict';

let deferredInstallPrompt = null;
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

function ensureInstallButton(){
  let button = document.getElementById('pwaInstallBtn');
  if(button) return button;
  const actions = document.querySelector('.top-actions');
  if(!actions) return null;
  button = document.createElement('button');
  button.id = 'pwaInstallBtn';
  button.type = 'button';
  button.className = 'pwa-install-btn';
  button.textContent = 'Install app';
  button.hidden = true;
  button.setAttribute('aria-label','Install EnglishGate app');
  actions.prepend(button);
  button.addEventListener('click', installApp);
  return button;
}

function showIOSInstructions(){
  let sheet = document.getElementById('pwaIosSheet');
  if(!sheet){
    sheet = document.createElement('div');
    sheet.id = 'pwaIosSheet';
    sheet.className = 'pwa-ios-sheet';
    sheet.innerHTML = '<div class="pwa-ios-card" role="dialog" aria-modal="true" aria-labelledby="pwaIosTitle"><button type="button" class="pwa-ios-close" aria-label="Close">×</button><span class="pwa-ios-kicker">Install EnglishGate</span><h2 id="pwaIosTitle">Add it to your Home Screen</h2><ol><li>Tap the <strong>Share</strong> button in Safari.</li><li>Choose <strong>Add to Home Screen</strong>.</li><li>Tap <strong>Add</strong>.</li></ol></div>';
    document.body.appendChild(sheet);
    sheet.addEventListener('click',e=>{if(e.target===sheet||e.target.closest('.pwa-ios-close'))sheet.classList.remove('is-visible')});
  }
  sheet.classList.add('is-visible');
}

async function installApp(){
  if(isStandalone()) return;
  if(deferredInstallPrompt){
    deferredInstallPrompt.prompt();
    try{ await deferredInstallPrompt.userChoice; }catch(e){}
    deferredInstallPrompt = null;
    const button = ensureInstallButton();
    if(button) button.hidden = true;
    return;
  }
  if(isIOS()) showIOSInstructions();
}

function syncInstallButton(){
  const button = ensureInstallButton();
  if(!button) return;
  if(isStandalone()){
    button.hidden = true;
    return;
  }
  button.hidden = !(deferredInstallPrompt || isIOS());
}

function ensureNetworkStatus(){
  let badge = document.getElementById('pwaNetworkStatus');
  if(badge) return badge;
  badge = document.createElement('div');
  badge.id = 'pwaNetworkStatus';
  badge.className = 'pwa-network-status';
  badge.setAttribute('role','status');
  badge.setAttribute('aria-live','polite');
  document.body.appendChild(badge);
  return badge;
}

function syncNetworkStatus(){
  const badge = ensureNetworkStatus();
  if(navigator.onLine){
    badge.classList.remove('is-visible');
    badge.textContent = '';
  }else{
    badge.textContent = 'Offline · saved app shell available';
    badge.classList.add('is-visible');
  }
}

async function registerServiceWorker(){
  if(!('serviceWorker' in navigator)) return;
  try{
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    registration.update().catch(()=>{});
  }catch(error){
    console.warn('EnglishGate PWA service worker registration failed:', error);
  }
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  syncInstallButton();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  syncInstallButton();
});

window.addEventListener('online', syncNetworkStatus);
window.addEventListener('offline', syncNetworkStatus);

function boot(){
  ensureInstallButton();
  syncInstallButton();
  syncNetworkStatus();
  registerServiceWorker();
  const observer = new MutationObserver(()=>syncInstallButton());
  const actions = document.querySelector('.top-actions');
  if(actions) observer.observe(actions,{childList:true});
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
else boot();
})();
