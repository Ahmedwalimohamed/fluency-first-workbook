document.addEventListener('DOMContentLoaded',()=>{
  const toggle=document.getElementById('passwordToggle');
  const input=document.getElementById('password');
  if(!toggle||!input)return;
  toggle.addEventListener('click',()=>{
    const showing=input.type==='text';
    input.type=showing?'password':'text';
    toggle.setAttribute('aria-label',showing?'Show password':'Hide password');
    toggle.setAttribute('aria-pressed',String(!showing));
    toggle.innerHTML=showing
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.06 12.35a1 1 0 0 1 0-.7C3.55 7.6 7.42 5 12 5c4.58 0 8.45 2.6 9.94 6.65a1 1 0 0 1 0 .7C20.45 16.4 16.58 19 12 19c-4.58 0-8.45-2.6-9.94-6.65Z"/><circle cx="12" cy="12" r="3"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2 2 20 20"/><path d="M6.71 6.71C4.9 7.89 3.53 9.59 2.74 11.6a1 1 0 0 0 0 .8C4.16 16.04 7.74 18.5 12 18.5c1.35 0 2.63-.25 3.8-.71"/><path d="M10.73 5.08A10.7 10.7 0 0 1 12 5c4.26 0 7.84 2.46 9.26 6.1a1 1 0 0 1 0 .8 10.3 10.3 0 0 1-1.73 2.78"/><path d="M14.12 14.12A3 3 0 0 1 9.88 9.88"/></svg>';
  });
});
