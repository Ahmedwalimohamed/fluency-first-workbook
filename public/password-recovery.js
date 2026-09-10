/* EnglishGate password recovery: personal-link reset or username + registered WhatsApp fallback. */
(function(){
 function closeButton(){const el=document.querySelector('[data-close]');if(el)el.onclick=closeModal;}
 function successHtml(){return '<div class="feedback good"><strong>New password sent.</strong><br>Check the WhatsApp number registered on your EnglishGate account, then sign in with the new password.</div>';}
 async function submitReset(payload,form,result,button){
  button.disabled=true;button.textContent='Sending…';
  result.innerHTML='<div class="feedback">Sending your new password to WhatsApp…</div>';
  try{
   await api('/api/auth/forgot-password',{method:'POST',body:JSON.stringify(payload)});
   if(form)form.classList.add('hidden');
   result.innerHTML=successHtml();
  }catch(err){
   button.disabled=false;button.textContent='Send new password';
   result.innerHTML='<div class="feedback bad">'+escapeHtml(err.message||'Could not send the new password. Please try again.')+'</div>';
  }
 }
 function openRecovery(){
  if(personalAccessToken){
   const who=personalAccessStudent?.name?' for <strong>'+escapeHtml(personalAccessStudent.name)+'</strong>':'';
   showModal('<div class="section-head"><div><span class="role-kicker">Password help</span><h3>Get a new password</h3><p class="muted">EnglishGate will send a new password'+who+' to the WhatsApp number registered on this account.</p></div><button class="icon-btn" data-close>×</button></div><form id="forgotPasswordForm" class="form-grid"><button class="primary-btn" type="submit">Send new password</button></form><div id="forgotPasswordResult"></div>');
   closeButton();
   const form=$('forgotPasswordForm'),result=$('forgotPasswordResult');
   form.onsubmit=e=>{e.preventDefault();const button=e.submitter||form.querySelector('button[type="submit"]');submitReset({accessToken:personalAccessToken},form,result,button);};
   return;
  }
  const currentUsername=String($('username')?.value||'').trim();
  showModal('<div class="section-head"><div><span class="role-kicker">Password help</span><h3>Get a new password</h3><p class="muted">Enter your EnglishGate username and the WhatsApp number registered on your account. We will send the new password there.</p></div><button class="icon-btn" data-close>×</button></div><form id="forgotPasswordForm" class="form-grid"><label>Username<input id="forgotUsername" autocomplete="username" required value="'+escapeAttr(currentUsername)+'" placeholder="e.g. amina.ali"></label><label>Registered WhatsApp number<input id="forgotWhatsapp" type="tel" autocomplete="tel" required maxlength="40" placeholder="+252 63 1234567"><small>Use the same WhatsApp number saved on your EnglishGate account.</small></label><button class="primary-btn" type="submit">Send new password</button></form><div id="forgotPasswordResult"></div>');
  closeButton();
  const form=$('forgotPasswordForm'),result=$('forgotPasswordResult');
  form.onsubmit=e=>{e.preventDefault();const button=e.submitter||form.querySelector('button[type="submit"]');submitReset({username:$('forgotUsername').value.trim(),whatsappNumber:$('forgotWhatsapp').value.trim()},form,result,button);};
 }
 window.openForgotPassword=openRecovery;
 function wire(){
  const old=document.getElementById('forgotPasswordBtn');
  if(!old)return;
  const button=old.cloneNode(true);
  old.replaceWith(button);
  button.addEventListener('click',openRecovery);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
