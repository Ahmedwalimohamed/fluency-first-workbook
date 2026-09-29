(function(){
'use strict';

const PAGE_BOOK='admin-curriculum-book-v2';
let selectedBookId='';

function isSystemAdmin(){return session?.role==='admin'&&!session?.schoolId}
function esc(v){return typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function attr(v){return typeof escapeAttr==='function'?escapeAttr(String(v??'')):esc(v)}
function packs(){return typeof BOOK_PACKS!=='undefined'&&BOOK_PACKS?BOOK_PACKS:{}}
function levelRank(level){const s=String(level||'').toUpperCase();if(s.startsWith('A1'))return 1;if(s.startsWith('A2'))return 2;if(s.startsWith('B1'))return 3;if(s.startsWith('B2'))return 4;if(s.startsWith('C1'))return 5;return 9}
function books(){
  let rows=[];
  try{rows=typeof getDB==='function'&&Array.isArray(getDB().books)?getDB().books:[]}catch{}
  return rows.map(meta=>({meta,pack:packs()[meta.id]||null})).sort((a,b)=>levelRank(a.meta.level)-levelRank(b.meta.level)||String(a.meta.title||'').localeCompare(String(b.meta.title||'')))
}
function readyLessonsFor(book){return (book?.lessons||[]).filter(l=>l&&l.ready!==false)}

function openBook(id){
  const book=packs()[id];
  if(!book){showError('This workbook is not loaded in the curriculum library.');return}
  if(typeof setActiveBook==='function'&&!setActiveBook(id)){showError('EnglishGate could not activate this workbook.');return}
  selectedBookId=id;
  currentPage=PAGE_BOOK;
  renderNav();
  renderBook();
}
function showError(message){
  const content=document.getElementById('content');
  if(content)content.innerHTML=`<div class="feedback bad"><strong>Workbook could not open.</strong><br>${esc(message)}</div>`;
}
function openDeleteBook(id,name){
  try{
    if(typeof openAdminBookDelete==='function'){openAdminBookDelete(id,name);return}
    if(typeof window.openAdminBookDelete==='function'){window.openAdminBookDelete(id,name);return}
  }catch(e){console.error('Admin book delete action failed to open',e)}
  showError('The delete action is temporarily unavailable. Refresh the page and try again.');
}

function renderBooks(){
  const list=books();
  title('System Admin','Books');
  $('content').innerHTML=`<section class="book-library">
    <div class="role-page-head"><div><span class="role-kicker">Curriculum browser</span><h1>Books</h1><p>System Admin can browse, manage and delete books from the live EnglishGate library.</p></div></div>
    <div class="book-card-grid">
      ${list.map(({meta,pack})=>{
        const ready=readyLessonsFor(pack).length,total=Number(meta.totalLessons||pack?.totalLessons||pack?.lessons?.length||ready),status=String(meta.status||'inactive'),canBrowse=Boolean(pack),statusLabel=status==='pilot'?'Pilot':status==='ready'?'Ready':status==='inactive'?'Inactive':status;
        return `<article class="book-card" data-system-book="${attr(meta.id)}">
          <div class="book-card-top"><span class="pill teal">${esc(meta.level||pack?.level||'Course')}</span><span class="book-status ${attr(status)}">${esc(statusLabel)}</span></div>
          <div class="book-cover-mini"><span>EnglishGate</span><strong>${esc(meta.title||pack?.title||pack?.moduleTitle||meta.id)}</strong><small>${total} lessons</small></div>
          <p>${esc(meta.audience||pack?.audience||pack?.moduleGoal||'EnglishGate workbook')}</p>
          <div class="book-card-meta"><span>${canBrowse?ready+'/'+total+' digital lessons available':total+' lessons registered'}</span><span>${esc(meta.activityModel||'Vocabulary · Listening & Reading · Grammar · Writing')}</span></div>
          <div class="book-card-actions">
            ${canBrowse?`<button class="primary-btn" type="button" data-system-open-book="${attr(meta.id)}">Browse workbook</button>`:`<button class="ghost-btn" type="button" disabled>Workbook not digitized yet</button>`}
            <button class="ghost-btn danger-action" type="button" data-system-delete-book="${attr(meta.id)}" data-name="${attr(meta.title||pack?.title||meta.id)}">Delete book</button>
          </div>
        </article>`;
      }).join('')||'<div class="empty-state"><h3>No books</h3><p>The live curriculum library is empty.</p></div>'}
    </div>
  </section>`;
  document.querySelectorAll('[data-system-open-book]').forEach(btn=>btn.onclick=()=>openBook(btn.dataset.systemOpenBook));
  document.querySelectorAll('[data-system-delete-book]').forEach(btn=>btn.onclick=()=>openDeleteBook(btn.dataset.systemDeleteBook,btn.dataset.name));
}

function renderBook(){
  const b=packs()[selectedBookId]||COURSE;
  if(!b){currentPage='admin-books';return renderBooks()}
  if(typeof setActiveBook==='function')setActiveBook(b.id);
  const lessons=readyLessonsFor(b);
  title('System Admin','Workbook');
  $('content').innerHTML=`<section class="admin-book-browser">
    <button class="back-link" id="systemBackBooks">← Books</button>
    <div class="role-page-head"><div><span class="pill teal">${esc(b.level||'')}</span><h1>${esc(b.title||b.moduleTitle||b.id)}</h1><p>Read-only admin preview. Opening a lesson does not save answers or student progress.</p></div></div>
    <div class="admin-browser-list">
      ${lessons.map(l=>`<button class="admin-browser-lesson" type="button" data-system-lesson="${attr(l.id)}"><span class="admin-browser-num">${Number(l.number||0)}</span><span><strong>${esc(l.title||'Untitled lesson')}</strong><small>${esc(l.outcome||'Open all workbook skills')}</small></span><b>Open →</b></button>`).join('')||'<div class="empty-state"><h3>No ready lessons</h3><p>This workbook has no lessons available for preview.</p></div>'}
    </div>
  </section>`;
  $('systemBackBooks').onclick=()=>{currentPage='admin-books';renderNav();renderBooks()};
  document.querySelectorAll('[data-system-lesson]').forEach(btn=>btn.onclick=()=>{
    const lid=btn.dataset.systemLesson;
    const lesson=b.lessons?.find(x=>String(x.id)===String(lid));
    if(!lesson)return showError('The selected lesson was not found.');
    if(typeof setActiveBook==='function')setActiveBook(b.id);
    activeLessonId=lesson.id;
    currentStep='vocabulary';
    currentPage='admin-workbook-view';
    renderNav();
    try{
      if(typeof adminWorkbookView==='function')adminWorkbookView();
      else if(typeof workbook==='function')workbook();
      else showError('The workbook preview renderer is unavailable.');
    }catch(e){
      console.error('Admin workbook preview failed',e);
      showError(e?.message||'The lesson preview failed to render.');
    }
  });
}

try{
  const previousRenderAdmin=renderAdmin;
  renderAdmin=function(){
    if(isSystemAdmin()&&currentPage==='admin-books')return renderBooks();
    if(isSystemAdmin()&&currentPage===PAGE_BOOK)return renderBook();
    return previousRenderAdmin();
  };
  window.EnglishGateAdminCurriculum={renderBooks,openBook,renderBook};
}catch(e){console.error('Admin curriculum browser v2 install failed',e)}
})();
