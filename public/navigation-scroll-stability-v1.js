/* Prevent content-level DOM mutations from repeatedly forcing the page back to the top.
   Normal navigation still resets scroll through renderNav()/renderPage(). */
(function(){
'use strict';
try{
  if(typeof scheduleAppScrollReset==='function'){
    const ignoreMutationDrivenScrollReset=function(){};
    scheduleAppScrollReset=ignoreMutationDrivenScrollReset;
    window.scheduleAppScrollReset=ignoreMutationDrivenScrollReset;
  }
}catch(e){
  console.error('Navigation scroll stability fix failed',e);
}
})();
