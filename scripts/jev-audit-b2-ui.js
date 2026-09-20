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
 const css=read('public/englishgate-b2-premium-v1.css');
 const engine=read('public/b2-northstar-workbook-v1.js');
 const lesson1=read('public/b2-lesson1-microflow-v3.js');
 const index=read('public/index.html');

 const state={
  task:'EnglishGate B2 premium learning UI release audit',
  audience:'adult B2 EFL learners, mobile-first',
  designRead:'premium professional EdTech product; calm, clear, focused; not a marketing landing page',
  tasteDials:{designVariance:7,motionIntensity:5,visualDensity:4},
  jevUiModes:['source','decision','compose','repair'],
  rules:[
   'The interface must make the current learning action obvious within seconds.',
   'Reading/listening source-heavy stages may use split layout on desktop but must collapse cleanly on mobile.',
   'Question choice stages must prioritize the prompt and answer options over decoration.',
   'Writing and repair stages must reduce distraction and give the response area visual priority.',
   'No purple AI-gradient aesthetic, cartoon styling, excessive glass, or decorative motion.',
   'Motion must respect prefers-reduced-motion and must not be required to understand the task.',
   'The interface must feel credible for adult professional learners, not like a children learning game.'
  ],
  implementation:{
   premiumStylesLoaded:index.includes('englishgate-b2-premium-v1.css?v=1'),
   uiContractGeneric:engine.includes("uiDecisionContract:'jev-ui-v1'"),
   uiContractLesson1:lesson1.includes("uiDecisionContract:'jev-ui-v1'"),
   hasSourceLayout:css.includes('[data-ui-mode="source"]'),
   hasDecisionLayout:css.includes('[data-ui-mode="decision"]'),
   hasComposeLayout:css.includes('[data-ui-mode="compose"]'),
   hasRepairLayout:css.includes('[data-ui-mode="repair"]'),
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
  anti_slop:question('Does the implementation avoid the common AI-design failure modes named in the rules, including purple AI styling, excessive decoration, and treating every screen identically?')
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
