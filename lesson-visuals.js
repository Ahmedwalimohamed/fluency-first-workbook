// EnglishGate Lesson Visuals MVP
// Adds one reusable 16:9 contextual image per lesson, managed by the teacher
// and rendered from the same source in the student workbook.

const LESSON_VISUAL_DEFAULTS = {
  w1l1: {
    alt: 'Adult English learner discussing personal goals with a tutor.',
    caption: 'Look at the picture. Where might this learner use English?',
    sourceType: 'none'
  },
  w1l2: {
    alt: 'Two professionals introducing themselves in a workplace setting.',
    caption: 'Look at the picture. What information do people usually share when they meet professionally?',
    sourceType: 'none'
  },
  w1l3: {
    alt: 'Professional explaining an idea during a conversation.',
    caption: 'Look at the picture. What can a speaker do when they need more time to think?',
    sourceType: 'none'
  }
};

function getLessonVisual(lessonId) {
  const db = getDB();
  const saved = db.lessonVisuals?.[lessonId] || {};
  return { ...(LESSON_VISUAL_DEFAULTS[lessonId] || {}), ...saved };
}

function saveLessonVisual(lessonId, visual) {
  const db = getDB();
  db.lessonVisuals = db.lessonVisuals || {};
  db.lessonVisuals[lessonId] = {
    src: visual.src || '',
    alt: visual.alt || '',
    caption: visual.caption || '',
    sourceType: visual.sourceType || 'url',
    updatedAt: new Date().toISOString()
  };
  saveDB(db);
}

function removeLessonVisual(lessonId) {
  const db = getDB();
  if (db.lessonVisuals) delete db.lessonVisuals[lessonId];
  saveDB(db);
}

function lessonVisualMarkup(l, { compact = false } = {}) {
  const v = getLessonVisual(l.id);
  const hasImage = Boolean(v.src);
  const caption = v.caption || '';
  return `
    <figure class="lesson-visual ${compact ? 'compact' : ''}">
      <div class="lesson-visual-media ${hasImage ? '' : 'is-empty'}">
        ${hasImage
          ? `<img src="${escapeAttr(v.src)}" alt="${escapeAttr(v.alt || '')}" loading="lazy" onerror="lessonVisualImageError(this)">`
          : `<div class="lesson-visual-fallback" role="img" aria-label="Lesson visual not added yet">
              <span class="lesson-visual-icon">▧</span>
              <strong>Lesson visual</strong>
              <small>Teacher can add a contextual image.</small>
            </div>`}
      </div>
      ${hasImage && caption ? `<figcaption><span>Before you begin</span>${escapeHtml(caption)}</figcaption>` : ''}
    </figure>`;
}

window.lessonVisualImageError = function lessonVisualImageError(img) {
  const media = img.closest('.lesson-visual-media');
  if (!media) return;
  media.classList.add('is-empty');
  media.innerHTML = `<div class="lesson-visual-fallback" role="img" aria-label="Lesson image could not be loaded">
    <span class="lesson-visual-icon">▧</span>
    <strong>Image unavailable</strong>
    <small>Ask your teacher to replace this lesson visual.</small>
  </div>`;
};

function lessonVisualThumbnail(l) {
  const v = getLessonVisual(l.id);
  return `
    <div class="lesson-visual-thumb ${v.src ? '' : 'is-empty'}">
      ${v.src
        ? `<img src="${escapeAttr(v.src)}" alt="${escapeAttr(v.alt || '')}" onerror="lessonVisualImageError(this)">`
        : `<div><span>▧</span><small>No image yet</small></div>`}
    </div>`;
}

function listeningActivity(l) {
  return `<p class="eyebrow">Step 2 · Listening</p>
    <h3>Listen for meaning, then detail</h3>
    <p class="muted">Use the picture to understand the situation. Then play once for the overall message and again for detail.</p>
    ${lessonVisualMarkup(l)}
    <div class="audio-box">
      <button id="playAudio" class="play-btn" aria-label="Play listening">▶</button>
      <div>
        <strong>${l.listening.title}</strong>
        <div class="muted">Listen, then answer without reading a transcript.</div>
      </div>
    </div>
    ${l.listening.questions.map((q,i)=>`<div class="question"><p>${i+1}. ${q.q}</p>${radio('l'+i,q.options,q.answer,q.tag)}</div>`).join('')}
    <div id="activityFeedback"></div>
    <button class="primary-btn" id="checkActivity">Check listening</button>`;
}

function classes() {
  const sts = classStudents();
  title('Course management','Classes');
  $('content').innerHTML = `
    <div class="card">
      <div class="section-head">
        <div>
          <span class="pill teal">Active cohort</span>
          <h3>Fluency Foundations</h3>
          <p>${COURSE.level} · Week 1 · ${sts.length} students</p>
        </div>
        <strong>${Math.round(sts.reduce((a,s)=>a+completionPct(s.id),0)/sts.length)}% average completion</strong>
      </div>
      <div class="lesson-admin-grid">
        ${COURSE.lessons.map(l=>{
          const avg = Math.round(sts.reduce((a,s)=>a+lessonProgress(s.id,l.id),0)/sts.length);
          const visual = getLessonVisual(l.id);
          return `<div class="card lesson-admin-card">
            ${lessonVisualThumbnail(l)}
            <div class="lesson-admin-copy">
              <span class="pill">Lesson ${l.number}</span>
              <h3>${l.title}</h3>
              <p>${l.outcome}</p>
              <div class="lesson-admin-meta">
                <span>${visual.src ? 'Visual added' : 'Visual missing'}</span>
                <strong>${avg}% class completion</strong>
              </div>
              ${progress(avg)}
              <button class="secondary-btn lesson-visual-manage" data-lesson-visual="${l.id}">${visual.src ? 'Edit lesson visual' : '+ Add lesson visual'}</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
    <p class="teacher-note section">Lesson visuals use one shared source. A visual added here is the same visual students see in the workbook.</p>`;

  document.querySelectorAll('[data-lesson-visual]').forEach(btn => {
    btn.onclick = () => openLessonVisualEditor(btn.dataset.lessonVisual);
  });
}

function openLessonVisualEditor(lessonId) {
  const l = lesson(lessonId);
  const v = getLessonVisual(lessonId);
  let pendingUpload = '';

  showModal(`
    <div class="section-head">
      <div>
        <p class="eyebrow">Lesson Visual</p>
        <h3>Lesson ${l.number} · ${escapeHtml(l.title)}</h3>
        <p>Use one contextual 16:9 image. It should support understanding without revealing answers.</p>
      </div>
      <button class="icon-btn" data-close aria-label="Close">×</button>
    </div>

    <div class="visual-editor-grid">
      <div>
        <div id="visualPreview" class="visual-editor-preview">
          ${lessonVisualMarkup(l)}
        </div>
      </div>

      <form id="lessonVisualForm" class="form-grid">
        <label>Upload image
          <input id="visualFile" type="file" accept="image/jpeg,image/png,image/webp">
          <small class="muted">EnglishGate will crop and compress it to 16:9 for this prototype.</small>
        </label>

        <div class="visual-or"><span>or</span></div>

        <label>Image URL
          <input id="visualUrl" type="url" value="${escapeAttr(v.src?.startsWith('data:') ? '' : (v.src || ''))}" placeholder="https://...">
        </label>

        <label>Alt text
          <input id="visualAlt" required value="${escapeAttr(v.alt || '')}" placeholder="Describe what is important in the picture">
        </label>

        <label>Before-you-begin prompt
          <textarea id="visualCaption" rows="3" placeholder="A short question that helps the learner notice the context.">${escapeHtml(v.caption || '')}</textarea>
        </label>

        <div id="visualEditorFeedback"></div>

        <div class="visual-editor-actions">
          <button class="primary-btn" type="submit">Save lesson visual</button>
          ${v.src ? '<button class="ghost-btn danger-text" id="removeVisual" type="button">Remove visual</button>' : ''}
        </div>
      </form>
    </div>`);

  document.querySelector('[data-close]').onclick = closeModal;

  const fileInput = $('visualFile');
  const urlInput = $('visualUrl');
  const altInput = $('visualAlt');
  const captionInput = $('visualCaption');

  function renderPreview(src = pendingUpload || urlInput.value.trim() || v.src || '') {
    const previewVisual = {
      src,
      alt: altInput.value.trim() || v.alt || '',
      caption: captionInput.value.trim() || v.caption || ''
    };
    $('visualPreview').innerHTML = previewLessonVisual(previewVisual);
  }

  fileInput.onchange = async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const feedback = $('visualEditorFeedback');
    feedback.innerHTML = '<div class="feedback">Preparing image…</div>';
    try {
      pendingUpload = await compressLessonVisual(file);
      urlInput.value = '';
      feedback.innerHTML = '<div class="feedback good">Image ready. Add alt text, then save.</div>';
      renderPreview(pendingUpload);
    } catch {
      pendingUpload = '';
      feedback.innerHTML = '<div class="feedback bad">This image could not be prepared. Try a JPG, PNG or WebP image.</div>';
    }
  };

  urlInput.oninput = () => {
    if (urlInput.value.trim()) pendingUpload = '';
    renderPreview();
  };
  altInput.oninput = () => renderPreview();
  captionInput.oninput = () => renderPreview();

  $('lessonVisualForm').onsubmit = e => {
    e.preventDefault();
    const src = pendingUpload || urlInput.value.trim() || (v.src?.startsWith('data:') ? v.src : '');
    const alt = altInput.value.trim();
    const caption = captionInput.value.trim();

    if (!src) {
      $('visualEditorFeedback').innerHTML = '<div class="feedback bad">Add an image by upload or URL.</div>';
      return;
    }
    if (!alt) {
      $('visualEditorFeedback').innerHTML = '<div class="feedback bad">Add alt text so the visual is accessible.</div>';
      return;
    }

    saveLessonVisual(lessonId, {
      src,
      alt,
      caption,
      sourceType: pendingUpload || src.startsWith('data:') ? 'upload' : 'url'
    });

    $('visualEditorFeedback').innerHTML = '<div class="feedback good">Saved. Students now see this same lesson visual.</div>';
    setTimeout(() => {
      closeModal();
      classes();
    }, 500);
  };

  if ($('removeVisual')) {
    $('removeVisual').onclick = () => {
      removeLessonVisual(lessonId);
      closeModal();
      classes();
    };
  }
}

function previewLessonVisual(v) {
  const hasImage = Boolean(v.src);
  return `
    <figure class="lesson-visual">
      <div class="lesson-visual-media ${hasImage ? '' : 'is-empty'}">
        ${hasImage
          ? `<img src="${escapeAttr(v.src)}" alt="${escapeAttr(v.alt || '')}" onerror="lessonVisualImageError(this)">`
          : `<div class="lesson-visual-fallback"><span class="lesson-visual-icon">▧</span><strong>Lesson visual preview</strong><small>Add an image to preview it here.</small></div>`}
      </div>
      ${hasImage && v.caption ? `<figcaption><span>Before you begin</span>${escapeHtml(v.caption)}</figcaption>` : ''}
    </figure>`;
}

function compressLessonVisual(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const targetW = 1280;
        const targetH = 720;
        const sourceRatio = image.width / image.height;
        const targetRatio = targetW / targetH;

        let sx = 0, sy = 0, sw = image.width, sh = image.height;
        if (sourceRatio > targetRatio) {
          sw = image.height * targetRatio;
          sx = (image.width - sw) / 2;
        } else if (sourceRatio < targetRatio) {
          sh = image.width / targetRatio;
          sy = (image.height - sh) / 2;
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, sx, sy, sw, sh, 0, 0, targetW, targetH);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Public helper for future Reading activities so both Reading and Listening
// can render the exact same lesson visual component.
window.EnglishGateLessonVisuals = {
  get: getLessonVisual,
  render: lessonVisualMarkup,
  edit: openLessonVisualEditor
};
