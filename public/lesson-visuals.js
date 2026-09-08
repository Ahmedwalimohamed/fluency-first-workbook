(function () {
  var visuals = {
    w1l1: {
      src: '/assets/lesson-visuals/w1l1.svg',
      alt: 'Three learners meet on the first day of an international English course and talk together around a table.',
      prompt: 'What can you tell about these three learners before you listen?'
    },
    w1l2: {
      src: '/assets/lesson-visuals/w1l2.svg',
      alt: 'Two professionals greeting each other with a handshake in a modern office.',
      prompt: 'What information do people usually share when they meet professionally?'
    },
    w1l3: {
      src: '/assets/lesson-visuals/w1l3.svg',
      alt: 'Two adults having a focused conversation while one person takes a moment to think.',
      prompt: 'What can a speaker do when they need more time to think?'
    }
  };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function markup(visual) {
    if (!visual) return '';
    return '<figure class="eg-lesson-visual eg-listening-context-visual" data-injected-listening-visual="1">' +
      '<div class="eg-lesson-visual-media">' +
      '<img src="' + esc(visual.src) + '" alt="' + esc(visual.alt) + '" loading="eager">' +
      '</div>' +
      '<figcaption><span>Before you begin</span><strong>' + esc(visual.prompt) + '</strong></figcaption>' +
      '</figure>';
  }

  window.lessonVisualMarkup = function (lesson, options) {
    var visual = visuals[lesson && lesson.id];
    if (!visual) return '';
    var compact = options && options.compact;
    var html = markup(visual);
    return compact ? html.replace('eg-lesson-visual eg-listening-context-visual', 'eg-lesson-visual eg-listening-context-visual compact') : html;
  };

  function injectFirstListeningVisual() {
    var panel = document.getElementById('activityPanel');
    if (!panel || panel.querySelector('[data-injected-listening-visual="1"]')) return;

    var page = panel.closest('.eg-workbook');
    if (!page) return;

    var headerText = (page.querySelector('.eg-lesson-header') || {}).textContent || '';
    var stageText = (page.querySelector('#workbookStageTitle') || {}).textContent || '';
    var isLessonOne = /Lesson\s*1\b/i.test(headerText);
    var isListening = /listening/i.test(stageText);
    if (!isLessonOne || !isListening) return;

    var target = panel.querySelector('.eg-skill-page') || panel.firstElementChild || panel;
    if (target === panel) panel.insertAdjacentHTML('afterbegin', markup(visuals.w1l1));
    else target.insertAdjacentHTML('afterbegin', markup(visuals.w1l1));
  }

  var observer = new MutationObserver(function () {
    injectFirstListeningVisual();
  });

  function start() {
    injectFirstListeningVisual();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();