(function(){
'use strict';

function catalogBooks(){
  const dbBooks=(typeof getDB==='function'&&Array.isArray(getDB()?.books))?getDB().books:[];
  const byId=new Map(dbBooks.map(b=>[String(b.id),b]));
  const ids=[];
  dbBooks.forEach(b=>{if(b?.id&&!ids.includes(String(b.id)))ids.push(String(b.id))});
  Object.keys(typeof BOOK_PACKS!=='undefined'?BOOK_PACKS:{}).forEach(id=>{if(!ids.includes(String(id)))ids.push(String(id))});
  return ids.map(id=>{
    const db=byId.get(id)||{},pack=BOOK_PACKS?.[id]||null;
    return {
      id,
      title:db.title||pack?.title||pack?.moduleTitle||id,
      level:db.level||pack?.level||'',
      audience:db.audience||pack?.audience||'',
      status:db.status||(pack?'ready':'queued'),
      totalLessons:Number(db.totalLessons||db.total_lessons||pack?.totalLessons||pack?.lessons?.length||0),
      pack
    };
  });
}

function readyCount(pack){
  if(!pack||!Array.isArray(pack.lessons))return 0;
  return pack.lessons.filter(l=>l&&l.ready!==false).length;
}

function renderAdminBooks(){
  const books=catalogBooks();
  title('System Admin','Books');
  $('content').innerHTML=`<section class="book-library">
    <div class="role-page-head"><div><span class="role-kicker">Curriculum browser</span><h1>Books</h1><p>Browse every digitized EnglishGate workbook directly. Admin access does not depend on class enrollment.</p></div></div>
    <div class="book-card-grid">
      ${books.map(b=>{
        const pack=b.pack,count=readyCount(pack),canBrowse=Boolean(pack);
        return `<article class="book-card" data-admin-book-card="${escapeAttr(b.id)}">
          <div class="book-card-top"><span class="pill teal">${escapeHtml(b.level||'Course')}</span><span class="book-status ${canBrowse?'ready':'queued'}">${canBrowse?'Ready':'Queued'}</span></div>
          <div class="book-cover-mini"><span>EnglishGate</span><strong>${escapeHtml(b.title)}</strong><small>${b.totalLessons||count} lessons</small></div>
          <p>${escapeHtml(b.audience||'')}</p>
          <div class="book-card-meta"><span>${count}/${b.totalLessons||count} digital lessons ready</span><span>Vocabulary · Listening & Reading · Grammar · Writing</span></div>
          <div class="book-card-actions">
            ${canBrowse?`<button class="primary-btn" data-admin-open-workbook="${escapeAttr(b.id)}">Browse workbook</button>`:`<button class="ghost-btn" disabled>Workbook not digitized yet</button>`}
            ${canBrowse&&window.LIVE_BOOKS?.[b.id]?`<button class="ghost-btn" data-admin-open-lesson-book="${escapeAttr(b.id)}">Open lesson book</button>`:''}
            <button class="ghost-btn danger-action" data-admin-delete-book="${escapeAttr(b.id)}" data-name="${escapeAttr(b.title)}">Delete book</button>
          </div>
        </article>`;
      }).join('')}
    </div>
  </section>`;

  document.querySelectorAll('[data-admin-open-workbook]').forEach(btn=>btn.onclick=()=>{
    if(!setActiveBook(btn.dataset.adminOpenWorkbook))return;
    currentStep='vocabulary';
    activeLessonId=readyLessons(COURSE)[0]?.id||COURSE.lessons?.[0]?.id||activeLessonId;
    currentPage='admin-book-browse';
    renderNav();
    adminBookBrowse();
  });

  document.querySelectorAll('[data-admin-open-lesson-book]').forEach(btn=>btn.onclick=()=>{
    if(!setActiveBook(btn.dataset.adminOpenLessonBook))return;
    activeTeacherLessonNumber=Number(COURSE.lessons?.[0]?.number||1);
    activeTeacherSectionIndex=0;
    currentPage='admin-live-book-browse';
    renderNav();
    adminLiveBookBrowse();
  });

  if(typeof bindAdminBookActions==='function')bindAdminBookActions();
}

try{
  adminBooks=renderAdminBooks;
  window.adminBooks=renderAdminBooks;
}catch(e){console.error('Admin workbook access install failed',e)}
})();
