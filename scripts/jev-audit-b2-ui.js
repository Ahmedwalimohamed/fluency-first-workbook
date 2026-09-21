'use strict';

const fs=require('fs');
const path=require('path');
const {TYPE_SAFE_MODEL,TYPE_SAFE_URL}=require('../semantic-qa-firewall.js');

function read(rel){return fs.readFileSync(path.join(__dirname,'..',rel),'utf8')}
function evidence(answer){
 const choice=String(answer?.choice||'').toLowerCase();
 const p=Number(answer?.probabilities?.[choice]),c=Number(answer?.confidence);
 const pp=Number.isFinite(p)&&p>=0&&p<=1?p:null,cc=Number.isFinite(c)&&c>=0&&c<=1?c:null;
 return {choice,evidence:pp!=null&&cc!=null?Math.min(pp,cc):pp!=null?pp:cc}
}
async function main(){
 const key=String(process.env.TYPESAFE_API_KEY||'').trim();
 if(!key){console.warn('JEV_UI_AUDIT_SKIPPED: TYPESAFE_API_KEY is not configured.');return}
 const css=read('public/englishgate-b2-premium-v3.css');
 const sharedCss=read('public/b2-learning-surface-v1.css');
 const sharedJs=read('public/b2-learning-surface-v1.js');
 const liveBooks=read('public/live-books.js');
 const engine=read('public/b2-northstar-workbook-v1.js');
 const lesson1=read('public/b2-lesson1-microflow-v3.js');
 const index=read('public/index.html');

 const state={
  task:'EnglishGate B2 premium learning UI release audit',
  audience:'adult B2 EFL learners, mobile-first',
  designRead:'premium professional EdTech product; calm, clear, focused; not a marketing landing page',
  tasteDials:{designVariance:7,motionIntensity:3,visualDensity:4},
  jevUiModes:['source','decision','compose','repair'],
  rules:[
   'The interface must make the current learning action obvious within seconds.',
   'Reading/listening source-heavy stages may use split layout on desktop but must collapse cleanly on mobile.',
   'Question choice stages must prioritize the prompt and answer options over decoration.',
   'Writing and repair stages must reduce distraction and give the response area visual priority.',
   'No purple AI-gradient aesthetic, cartoon styling, excessive glass, or decorative motion.',
   'Motion must respect prefers-reduced-motion and must not be required to understand the task.',
   'The interface must feel credible for adult professional learners, not like a children learning game.',
   'The B2 lesson should behave as one immersive product surface rather than a premium card nested inside legacy dashboard chrome.',
   'Source, decision, compose, and repair stages must differ structurally, not merely through color or width.',
   'Live lessons and workbook activities must share a recognizable design system: typography hierarchy, border language, radius family, spacing rhythm, and restrained accent color.',
   'A pedagogically important label must not appear as an undifferentiated plain paragraph when comparable grammar content is presented as a dedicated visual component.',
   'Uniformity means coherent component treatment, not making reading, speaking, listening, grammar, and writing visually identical.'
  ],
  implementation:{
   premiumStylesLoaded:index.includes('englishgate-b2-premium-v3.css?v=1'),
   sharedSurfaceCssLoaded:index.includes('b2-learning-surface-v1.css?v=1'),
   sharedSurfaceJsLoaded:index.includes('b2-learning-surface-v1.js?v=1'),
   sharedSurfaceLoadsAfterPremium:index.indexOf('b2-learning-surface-v1.css?v=1')>index.indexOf('englishgate-b2-premium-v3.css?v=1'),
   sharedDesignTokens:['--b2-learn-line','--b2-learn-radius','--b2-learn-blue-soft'].every(x=>sharedCss.includes(x)),
   liveFluencyLabels:['FLUENCY START','FLUENCY USE','TALK AFTER READING','MAKE IT PERSONAL — SPEAK FIRST','FLUENCY RULE','FLUENCY EXIT','PRONUNCIATION FOCUS','MEDIATION MOVE'].every(x=>liveBooks.includes(x)&&sharedJs.includes(x)),
   liveMissionHeadingsDecorated:sharedJs.includes("return'mission'")&&sharedJs.includes('isUpperLabel'),
   liveInstructionCopyCard:sharedCss.includes('.b2-learning-callout-copy'),
   livePromptColorNormalized:sharedCss.includes('.live-prompt-grid .live-prompt-row:nth-child(3n+1)')&&sharedCss.includes('.live-prompt-grid .live-prompt-row:nth-child(3n+2)')&&sharedCss.includes('.live-prompt-grid .live-prompt-row:nth-child(3n+3)'),
   grammarUsesSharedTokens:sharedCss.includes('.grammar-book-section')&&sharedCss.includes('var(--b2-learn-line)'),
   workbookUsesSharedTokens:sharedCss.includes('.b2-microflow .micro-stage')&&sharedCss.includes('.b2-northstar-flow .northstar-reading'),
   uiContractGeneric:engine.includes("uiDecisionContract:'jev-ui-v1'"),
   uiContractLesson1:lesson1.includes("uiDecisionContract:'jev-ui-v1'"),
   immersiveShellClass:engine.includes("classList.add('b2-premium-workbook-mode')")&&lesson1.includes("classList.add('b2-premium-workbook-mode')"),
   legacyChromeSuppressed:css.includes('body.b2-premium-workbook-mode .sidebar')&&css.includes('body.b2-premium-workbook-mode .topbar')&&css.includes('display:none!important'),
   hasSourceLayout:css.includes('[data-ui-mode="source"]'),
   hasDecisionLayout:css.includes('[data-ui-mode="decision"]'),
   hasComposeLayout:css.includes('[data-ui-mode="compose"]'),
   hasRepairLayout:css.includes('[data-ui-mode="repair"]'),
   sourceSplitStructure:css.includes('grid-template-columns:minmax(0,1.16fr) minmax(360px,.84fr)'),
   composeDeskStructure:css.includes('grid-template-columns:minmax(290px,.76fr) minmax(480px,1.24fr)'),
   repairDeskStructure:css.includes('grid-template-columns:minmax(310px,.9fr) minmax(420px,1.1fr)'),
   decisionFocusWidth:css.includes('max-width:760px'),
   hasReducedMotion:css.includes('@media(prefers-reduced-motion:reduce)'),
   hasFocusVisible:css.includes(':focus-visible'),
   hasMobileBreakpoints:css.includes('@media(max-width:899px)')&&css.includes('@media(max-width:520px)'),
   purpleAiStyling:/purple|#5b2c8d/i.test(css),
   motionCount:(css.match(/transition:/g)||[]).length+(css.match(/animation:/g)||[]).length,
   shadowCount:(css.match(/box-shadow:/g)||[]).length,
   gradientCount:(css.match(/gradient\(/g)||[]).length
  }
 };

 const question=(instructions)=>({type:'choice',instructions,criteria:{
  pass:'The implementation clearly satisfies this requirement for the stated audience and context.',
  review:'The direction is acceptable but there is a localized concern worth human review.',
  fail:'There is a concrete design or usability problem that materially violates the requirement.'
 }});
 const questions={
  hierarchy:question('Does this implementation create a clear visual hierarchy where the current learning task, prompt, and response controls dominate secondary chrome?'),
  adult_professional:question('Does the described implementation plausibly feel like a premium adult professional EdTech product rather than a children learning game or generic AI-generated interface?'),
  stage_focus:question('Do the source, decision, compose, and repair UI modes appropriately change emphasis for the learning task without adding unnecessary interface complexity?'),
  mobile_accessibility:question('Does the implementation include enough evidence of mobile simplification, focus visibility, and reduced-motion support to be safe for a mobile-first learning product?'),
  anti_slop:question('Does the implementation avoid the common AI-design failure modes named in the rules, including purple AI styling, excessive decoration, and treating every screen identically?'),
  shell_cohesion:question('Does the implementation make the B2 workbook feel like one cohesive immersive product experience instead of a redesigned card embedded in legacy application chrome?'),
  mode_distinction:question('Are source, decision, compose, and repair stages structurally distinct enough that the interface emphasis matches the learner job in each stage?'),
  live_lesson_consistency:question('Do the B2 Live lessons now give important Fluency First, pronunciation, mediation, mission, prompt, vocabulary and reading elements deliberate visual hierarchy instead of mixing rich grammar cards with otherwise plain text?'),
  workbook_consistency:question('Does the B2 workbook use a coherent family of surfaces, borders, radii, inputs, choices, source cards and feedback components while still differentiating source, decision, compose and repair jobs?'),
  cross_surface_consistency:question('Do the B2 Live lessons and workbook now plausibly feel like two parts of the same EnglishGate product through shared visual tokens and hierarchy, without flattening all learning modes into identical cards?')
 };

 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),Math.max(5000,Math.min(45000,Number(process.env.TYPESAFE_TIMEOUT_MS)||30000)));
 let data;
 try{
  const res=await fetch(TYPE_SAFE_URL,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({state,model:TYPE_SAFE_MODEL,questions}),signal:controller.signal});
  if(!res.ok){console.warn('JEV_UI_AUDIT_SKIPPED: '+res.status+' '+(await res.text()).slice(0,300));return}
  data=await res.json();
 }catch(e){console.warn('JEV_UI_AUDIT_SKIPPED: '+String(e?.message||e));return}
 finally{clearTimeout(timeout)}

 const findings={};let blocked=0,review=0;
 for(const id of Object.keys(questions)){
  const d=evidence(data?.answers?.[id]),status=d.choice==='fail'&&Number(d.evidence)>=.70?'BLOCK':d.choice==='review'||d.choice==='fail'?'REVIEW':'PASS';
  if(status==='BLOCK')blocked++;if(status==='REVIEW')review++;
  findings[id]={...d,status}
 }
 console.log('JEV_UI_AUDIT '+JSON.stringify({blocked,review,findings,model:String(data?.model||TYPE_SAFE_MODEL),tasteDials:state.tasteDials}));
 if(blocked)process.exit(2)
}
main().catch(e=>{console.warn('JEV_UI_AUDIT_SKIPPED: '+String(e?.message||e))});
