/* EnglishGate password recovery: supports one-tap personal links and username + registered WhatsApp fallback. */
openForgotPassword=function(){
 const closeButton=()=>{const el=document.querySelector('[data-close]');if(el)el.onclick=closeModal};
 const success=`<div class="feedback good"><strong>New password sent.</strong><br>Check the WhatsApp number registered on your EnglishGate account, then sign in with the new password.</div>`;
 if(personalAccessToken){
  const who=personalAccessStudent?.name?` for <strong>${escapeHtml(personalAccessStudent.name)}</strong>`:'';
  showModal(`<div class="section-head"><div><span class="role-kicker">Password help</span><h3>Sending your new password</h3><p class="muted">EnglishGate is sending a new password${who} to the WhatsApp number registered on this account.</p></div><button class="icon-btn" data-close>×</button></div><div id="forgotPasswordResult"><div class="feedback">Sending…</div></div>`);
  closeButton();
  (async()=>{
   const result=$('forgotPasswordResult');
   try{
    await api('/api/auth/forgot-password',{method:'POST',body:JSON.stringify({accessToken:personalAccessToken})});
    result.innerHTML=success;
   }catch(err){
    result.innerHTML=`<div class="feedback bad">${escapeHtml(err.message)}</div>`;
   }
  })();
  return;
 }
 const currentUsername=String($('username')?.value||'').trim();
 showModal(`<div class="section-head"><div><span class="role-kicker">Password help</span><h3>Get a new password</h3><p class="muted">Enter your EnglishGate username and the WhatsApp number registered on your account. We will send the new password there.</p></div><button class="icon-btn" data-close>×</button></div><form id="forgotPasswordForm" class="form-grid"><label>Username<input id="forgotUsername" autocomplete="username" required value="${escapeAttr(currentUsername)}" placeholder="e.g. amina.ali"></label><label>Registered WhatsApp number<input id="forgotWhatsapp" type="tel" autocomplete="tel" required maxlength="40" placeholder="+252 63 1234567"><small>Use the same WhatsApp number saved on your EnglishGate account.</small></label><button class="primary-btn" type="submit">Send new password</button></form><div id="forgotPasswordResult"></div>`);
 closeButton();
 $('forgotPasswordForm').onsubmit=async e=>{
  e.preventDefault();
  const btn=e.submitter||$('forgotPasswordForm').querySelector('button[type="submit"]');
  const result=$('forgotPasswordResult');
  btn.disabled=true;btn.textContent='Sending…';
  try{
   await api('/api/auth/forgot-password',{method:'POST',body:JSON.stringify({username:$('forgotUsername').value.trim(),whatsappNumber:$('forgotWhatsapp').value.trim()})});
   $('forgotPasswordForm').classList.add('hidden');
   result.innerHTML=success;
  }catch(err){
   btn.disabled=false;btn.textContent='Send new password';
   result.innerHTML=`<div class="feedback bad">${escapeHtml(err.message)}</div>`;
  }
 };
};
