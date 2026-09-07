(function () {
  var visuals = {
    w1l1: {
      src: '/assets/lesson-visuals/w1l1.svg',
      alt: 'Two adult learners discussing English goals together at a table with a laptop and notebooks.',
      prompt: 'Where might these learners use English in real life?'
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

  window.lessonVisualMarkup = function (lesson, options) {
    var visual = visuals[lesson && lesson.id];
    if (!visual) return '';
    var compact = options && options.compact;
    return '<figure class="eg-lesson-visual' + (compact ? ' compact' : '') + '">' +
      '<div class="eg-lesson-visual-media">' +
      '<img src="' + esc(visual.src) + '" alt="' + esc(visual.alt) + '" loading="eager">' +
      '</div>' +
      '<figcaption><span>Before you begin</span><strong>' + esc(visual.prompt) + '</strong></figcaption>' +
      '</figure>';
  };
})();