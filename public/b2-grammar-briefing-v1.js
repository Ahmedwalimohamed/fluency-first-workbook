(function(){
'use strict';

const TOPICS=[
 'Present Simple',
 'Present Perfect vs Past Simple',
 'Narrative Tenses',
 'Present Perfect Continuous',
 'Should / Must / Have to',
 'Comparatives / Superlatives / Quantifiers',
 'Used to / Would',
 'First / Second Conditionals',
 'Passive Voice',
 'Relative Clauses',
 'Reported Speech',
 'Can / Could / Be able to',
 'Gerunds / Infinitives',
 'Future Forms',
 'Third Conditional',
 'Modals of Deduction',
 'Mixed Conditionals',
 'Passive Reporting',
 'Phrasal Verbs',
 'Wish / If Only',
 'Indirect Questions / Question Tags',
 'Mixed Review'
];

function lessonNumber(l){
 const direct=Number(l?.number);
 if(Number.isFinite(direct))return direct;
 const m=String(l?.id||'').match(/su-b2-l(\d+)$/i);
 return m?Number(m[1]):0;
}
function isCoreB2Lesson(l){
 const n=lessonNumber(l);
 return n>=1&&n<=22;
}
function topicFor(l){
 const n=lessonNumber(l);
 return n>=1&&n<=22?TOPICS[n-1]:(l?.grammar?.focus||'Grammar');
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

if(typeof grammarActivity!=='function')return;
const original=grammarActivity;
grammarActivity=function(l){
 // Lessons 23+ are B2 Lift. Leave their own grammar objects untouched so
 // EnglishGate's native interactive MCQ/free-response practice is rendered.
 if(!isCoreB2Lesson(l))return original(l);
 const n=lessonNumber(l),topic=topicFor(l),rule=String(l?.grammar?.rule||'').trim();
 if(l.grammar)l.grammar.focus=topic;
 let html=original(l);
 const briefing=`<section class="eg-grammar-briefing" aria-label="Grammar briefing"><div class="eg-grammar-briefing-meta"><span>Grammar briefing</span><span>Topic ${n} of 22</span></div><h2>${esc(topic)}</h2>${rule?`<p>${esc(rule)}</p>`:''}</section>`;
 const heroEnd='</header>';
 const pos=html.indexOf(heroEnd);
 if(pos!==-1)html=html.slice(0,pos+heroEnd.length)+briefing+html.slice(pos+heroEnd.length);
 html=html.replace('<h1>Build accurate English</h1>',`<h1>Grammar: ${esc(topic)}</h1>`);
 return html;
};

const style=document.createElement('style');
style.id='b2-grammar-briefing-v1-style';
style.textContent=`
.eg-grammar-briefing{margin:0 0 16px;padding:16px 18px;border:1px solid var(--border,#d9e0ea);border-radius:14px;background:var(--surface,#fff)}
.eg-grammar-briefing-meta{display:flex;justify-content:space-between;gap:12px;margin-bottom:6px;font-size:.76rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted,#667085)}
.eg-grammar-briefing h2{margin:0 0 6px;font-size:1.15rem;line-height:1.3}
.eg-grammar-briefing p{margin:0;line-height:1.55;color:var(--text,#1d2939)}
@media(max-width:640px){.eg-grammar-briefing{padding:14px}.eg-grammar-briefing-meta{align-items:flex-start;flex-direction:column;gap:3px}}
`;
document.head.appendChild(style);
window.ENGLISHGATE_B2_GRAMMAR_TOPICS=[...TOPICS];
})();
