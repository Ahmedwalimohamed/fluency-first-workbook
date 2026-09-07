// EnglishGate lesson visual runtime — safe integration for the current app.
const ENGLISHGATE_LESSON_VISUALS = {
  startingPoint: {
    src: 'https://images.pexels.com/photos/5649522/pexels-photo-5649522.jpeg?auto=compress&cs=tinysrgb&w=1280&h=720&fit=crop',
    alt: 'Two adult learners studying English together at a table while an English lesson plays on a laptop.',
    caption: 'Look at the picture. Where might these learners use English in real life?',
    credit: 'Thirdman / Pexels'
  },
  professionalIntro: {
    src: 'https://images.pexels.com/photos/12903292/pexels-photo-12903292.jpeg?auto=compress&cs=tinysrgb&w=1280&h=720&fit=crop',
    alt: 'Two business professionals greeting each other with a handshake in a modern office.',
    caption: 'Look at the picture. What information do people usually share when they meet professionally?',
    credit: 'Mizuno K / Pexels'
  },
  thinkingTime: {
    src: 'https://images.pexels.com/photos/9064335/pexels-photo-9064335.jpeg?auto=compress&cs=tinysrgb&w=1280&h=720&fit=crop',
    alt: 'Two adults having a focused one-to-one conversation in a professional mentoring setting.',
    caption: 'Look at the picture. What can a speaker do when they need more time to think?',
    credit: 'RDNE Stock project / Pexels'
  }
};

function lessonVisualFor(l){
  if(!l)return null;
  const id=String(l.id||'').toLowerCase(),title=String(l.title||'').toLowerCase();
  if(id==='w1l1'||id==='su-a2b1-l1'||/starting point|getting acquainted/.test(title))return ENGLISHGATE_LESSON_VISUALS.startingPoint;
  if(id==='w1l2'||/professional introduction|work\s*&\s*careers|work and careers/.test(title))return ENGLISHGATE_LESSON_VISUALS.professionalIntro;
  if(id==='w1l3'||/long pauses|managing pauses|thinking time/.test(title))return ENGLISHGATE_LESSON_VISUALS.thinkingTime;
  return null;
}

function lessonVisualMarkup(l,{compact=false}={}){
  const v=lessonVisualFor(l);
  if(!v)return '';
  return `<figure class="lesson-visual ${compact?'compact':''}">
    <div class="lesson-visual-media">
      <img src="${escapeAttr(v.src)}" alt="${escapeAttr(v.alt)}" loading="${compact?'lazy':'eager'}" referrerpolicy="no-referrer" onerror="lessonVisualImageError(this)">
    </div>
    <figcaption><div><span>Before you begin</span><strong>${escapeHtml(v.caption)}</strong></div><small>${escapeHtml(v.credit)}</small></figcaption>
  </figure>`;
}

window.lessonVisualImageError=function lessonVisualImageError(img){
  const media=img?.closest?.('.lesson-visual-media');
  if(!media)return;
  media.classList.add('is-empty');
  media.innerHTML='<div class="lesson-visual-fallback"><strong>Image unavailable</strong><span>Reload the lesson or try again.</span></div>';
};
