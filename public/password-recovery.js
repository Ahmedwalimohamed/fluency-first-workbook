/* EnglishGate email password recovery for admin, teacher and student accounts. */
(function(){
 'use strict';
 function closeButton(){const el=document.querySelector('[data-close]');if(el)el.onclick=closeModal}
 function clearParam(name){
  try{const u=new URL(location.href);u.searchParams.delete(name);history.replaceState({},'',u.pathname+(u.search||'')+(u.hash||''))}catch{}
 }
 function recoverySuccess(){return '<div class="feedback good"><strong>Check your email.</strong><br>If that verified email belongs to an EnglishGate account, we sent a secure password-reset link. The link expires in 20 minutes.</div>'}
 async function submitRecovery(email,form,result,button){
  button.disabled=true;button.textContent='Sending…';
  result.innerHTML='<div class="feedback">Sending a secure reset link…</div>';
  try{
   await api('/api/auth/forgot-password',{method:'POST',body:JSON.stringify({email})});
   if(form)form.classList.add('hidden');
   result.innerHTML=recoverySuccess();
  }catch(err){
   button.disabled=false;button.textContent='Send reset link';
   result.innerHTML='<div class="feedback bad">'+escapeHtml(err.message||'Could not start email recovery. Please try again.')+'</div>';
  }
 }
 function openRecovery(){
  const who=typeof personalAccessStudent!=='undefined'&&personalAccessStudent?.name?' for <strong>'+escapeHtml(personalAccessStudent.name)+'</strong>':'';
  showModal('<div class="section-head"><div><span class="role-kicker">Password help</span><h3>Reset your password</h3><p class="muted">Enter the verified email registered on your EnglishGate account'+who+'. We will send a secure one-time reset link.</p></div><button class="icon-btn" data-close>×</button></div><form id="forgotPasswordForm" class="form-grid"><label>Email address<input id="forgotEmail" type="email" autocomplete="email" required maxlength="254" placeholder="name@example.com"><small>Use the email saved and verified on your EnglishGate account.</small></label><button class="primary-btn" type="submit">Send reset link</button></form><div id="forgotPasswordResult"></div>');
  closeButton();
  const form=$('forgotPasswordForm'),result=$('forgotPasswordResult');
  form.onsubmit=e=>{e.preventDefault();const button=e.submitter||form.querySelector('button[type="submit"]');submitRecovery($('forgotEmail').value.trim(),form,result,button)};
 }
 function openReset(token){
  showModal('<div class="section-head"><div><span class="role-kicker">Secure reset</span><h3>Choose a new password</h3><p class="muted">Use 8–20 numbers, matching the current EnglishGate password format.</p></div><button class="icon-btn" data-close>×</button></div><form id="emailResetPasswordForm" class="form-grid"><label>New password<input id="emailResetPassword" type="password" inputmode="numeric" pattern="[0-9]{8,20}" autocomplete="new-password" minlength="8" maxlength="20" required></label><label>Confirm password<input id="emailResetPasswordConfirm" type="password" inputmode="numeric" pattern="[0-9]{8,20}" autocomplete="new-password" minlength="8" maxlength="20" required></label><button class="primary-btn" type="submit">Save new password</button></form><div id="emailResetPasswordResult"></div>');
  closeButton();
  const form=$('emailResetPasswordForm'),result=$('emailResetPasswordResult');
  form.onsubmit=async e=>{
   e.preventDefault();const button=e.submitter||form.querySelector('button[type="submit"]'),password=$('emailResetPassword').value,confirm=$('emailResetPasswordConfirm').value;
   if(password!==confirm){result.innerHTML='<div class="feedback bad">The passwords do not match.</div>';return}
   button.disabled=true;button.textContent='Saving…';
   try{
    await api('/api/auth/reset-password',{method:'POST',body:JSON.stringify({token,password})});
    clearParam('passwordReset');form.classList.add('hidden');result.innerHTML='<div class="feedback good"><strong>Password changed.</strong><br>You can now sign in with your new password.</div>';
   }catch(err){button.disabled=false;button.textContent='Save new password';result.innerHTML='<div class="feedback bad">'+escapeHtml(err.message||'This reset link could not be used.')+'</div>'}
  };
 }
 async function verifyEmail(token){
  showModal('<div class="section-head"><div><span class="role-kicker">Email verification</span><h3>Verifying your email…</h3></div><button class="icon-btn" data-close>×</button></div><div id="emailVerifyResult"><div class="feedback">Please wait.</div></div>');
  closeButton();const result=$('emailVerifyResult');
  try{await api('/api/auth/verify-email',{method:'POST',body:JSON.stringify({token})});clearParam('emailVerify');result.innerHTML='<div class="feedback good"><strong>Email verified.</strong><br>This email can now be used for secure password recovery.</div>'}
  catch(err){result.innerHTML='<div class="feedback bad">'+escapeHtml(err.message||'This verification link is invalid or expired.')+'</div>'}
 }
 window.openForgotPassword=openRecovery;
 function wire(){
  const old=document.getElementById('forgotPasswordBtn');
  if(old){const button=old.cloneNode(true);old.replaceWith(button);button.addEventListener('click',openRecovery)}
  let params;try{params=new URLSearchParams(location.search)}catch{return}
  const reset=params.get('passwordReset'),verify=params.get('emailVerify');
  if(reset)openReset(reset);else if(verify)verifyEmail(verify);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
