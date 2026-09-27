/* EnglishGate recovery-email settings. Additive UI: no WhatsApp dependency. */
(function(){
 'use strict';
 let state=null,loading=false,scheduled=false;
 function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
 async function readEmail(){
  if(loading)return state;loading=true;
  try{state=await api('/api/account/email');return state}catch{state=null;return null}finally{loading=false}
 }
 function buttonLabel(){if(!state?.email)return 'Add email';return state.verified?'Email ✓':'Verify email'}
 async function openSettings(){
  const data=await readEmail()||{email:'',verified:false};
  showModal(`<div class="section-head"><div><span class="role-kicker">Account recovery</span><h3>Recovery email</h3><p class="muted">Use a verified email to recover your EnglishGate account securely.</p></div><button class="icon-btn" data-close>×</button></div><form id="recoveryEmailForm" class="form-grid"><label>Email address<input id="recoveryEmailInput" type="email" autocomplete="email" maxlength="254" required value="${esc(data.email||'')}"><small>${data.verified?'Verified and ready for password recovery.':data.email?'Not verified yet. Save it again to receive a new verification email.':'Add an email you can access.'}</small></label><button class="primary-btn" type="submit">${data.verified?'Update email':'Save & verify email'}</button></form><div id="recoveryEmailResult"></div>`);
  document.querySelector('[data-close]').onclick=closeModal;
  const form=document.getElementById('recoveryEmailForm'),result=document.getElementById('recoveryEmailResult');
  form.onsubmit=async e=>{
   e.preventDefault();const button=e.submitter||form.querySelector('button[type="submit"]');button.disabled=true;button.textContent='Sending…';
   try{
    const r=await api('/api/account/email',{method:'PUT',body:JSON.stringify({email:document.getElementById('recoveryEmailInput').value.trim()})});
    state={email:r.email||document.getElementById('recoveryEmailInput').value.trim(),verified:false};
    result.innerHTML='<div class="feedback good"><strong>Verification email sent.</strong><br>Open your email and confirm the address. The verification link expires in 30 minutes.</div>';form.classList.add('hidden');enhance();
   }catch(err){button.disabled=false;button.textContent='Save & verify email';result.innerHTML='<div class="feedback bad">'+esc(err.message||'Could not save the recovery email.')+'</div>'}
  };
 }
 async function enhance(){
  const app=document.getElementById('app'),login=document.getElementById('loginScreen'),actions=document.querySelector('.top-actions');
  if(!actions||!app||app.classList.contains('hidden')||(!login?.classList.contains('hidden')&&getComputedStyle(login).display!=='none'))return;
  await readEmail();if(!state)return;
  let b=document.getElementById('recoveryEmailSettingsBtn');
  if(!b){b=document.createElement('button');b.id='recoveryEmailSettingsBtn';b.type='button';b.className='ghost-btn compact-action';b.onclick=openSettings;actions.insertBefore(b,document.getElementById('studentProfileBtn')||null)}
  b.textContent=buttonLabel();b.title=state?.verified?'Recovery email verified':'Set up recovery email';
 }
 function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;enhance()},120)}
 function boot(){schedule();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']})}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
