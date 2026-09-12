(function(){
'use strict';

const PAGE_BOOK='admin-curriculum-book-v2';
let selectedBookId='';

function isSystemAdmin(){return session?.role==='admin'&&!session?.schoolId}
function esc(v){return typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function attr(v){return typeof escapeAttr==='function'?escapeAttr(String(v??'')):esc(v)}
function packs(){return typeof BOOK_PACKS!=='undefined'&&BOOK_PACKS?BOOK_PACKS:{}}
function levelRank(level){const s=String(level||'').toUpperCase();if(s.startsWith('A1'))return 1;if(s.startsWith('A2'))return 2;if(s.startsWith('B1'))return 3;if(s.startsWith('B2'))return 4;if(s.startsWith('C1'))return 5;return 9}
function books(){return Object.values(packs()).filter(Boolean).slice().sort((a,b)=>levelRank(a.level)-levelRank(b.level)||String(a.title||'').localeCompare(String(b.title||'')))}
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

function renderBooks(){
  const list=books();
  title('System Admin','Books');
  $('content').innerHTML=`<section class="book-library">
    <div class="role-page-head"><div><span class="role-kicker">Curriculum browser</span><h1>Books</h1><p>System Admin can open every workbook that is actually loaded in EnglishGate. Class enrollment is not required.</p></div></div>
    <div class="book-card-grid">
      ${list.map(b=>{
        const ready=readyLessonsFor(b).length,total=Number(b.totalLessons||b.lessons?.length||ready);
        return `<article class="book-card" data-system-book="${attr(b.id)}">
          <div class="book-card-top"><span class="pill teal">${esc(b.level||'Course')}</span><span class="book-status ready">Ready</span></div>
          <div class="book-cover-mini"><span>EnglishGate</span><strong>${esc(b.title||b.moduleTitle||b.id)}</strong><small>${total} lessons</small></div>
          <p>${esc(b.audience||b.moduleGoal||'EnglishGate workbook')}</p>
          <div class="book-card-meta"><span>${ready}/${total} lessons available</span><span>Vocabulary · Listening & Reading · Grammar · Writing</span></div>
          <div class="book-card-actions"><button class="primary-btn" type="button" data-system-open-book="${attr(b.id)}">Browse workbook</button></div>
        </article>`;
      }).join('')||'<div class="empty-state"><h3>No workbooks loaded</h3><p>The curriculum library is empty.</p></div>'}
    </div>
  </section>`;
  document.querySelectorAll('[data-system-open-book]').forEach(btn=>btn.onclick=()=>openBook(btn.dataset.systemOpenBook));
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
