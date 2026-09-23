import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';

const parity=fs.readFileSync(new URL('../public/a1-northstar-parity-v1.js',import.meta.url),'utf8');
const content=fs.readFileSync(new URL('../public/a1-northstar-content-v1.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/a1-northstar-parity-v1.css',import.meta.url),'utf8');
const pwa=fs.readFileSync(new URL('../public/pwa.js',import.meta.url),'utf8');
const gold=fs.readFileSync(new URL('../public/a1-gold-v1.js',import.meta.url),'utf8');
const b2=fs.readFileSync(new URL('../public/b2-northstar-workbook-v1.js',import.meta.url),'utf8');

function syntax(path){return spawnSync(process.execPath,['--check',new URL(path,import.meta.url).pathname],{encoding:'utf8'}).status===0}
const mockLessons=Array.from({length:22},(_,i)=>({number:i+1,title:`L${i+1}`,listening:{},writing:{},realWorldSituation:'old',foundation:'old',performance:'old',mediation:'old'}));
const sandbox={window:{A1_GOLD_V1_BOOK:{lessons:mockLessons}},setTimeout:()=>{}};
vm.runInNewContext(content,sandbox,{filename:'a1-northstar-content-v1.js'});
const overlay=sandbox.window.ENGLISHGATE_A1_NORTHSTAR_CONTENT||{};
const allOverlayed=mockLessons.every(l=>l.northstarContentVersion==='a1-northstar-content-v1');
const allSources=mockLessons.every(l=>String(l.listening?.readingText||'').length>=40&&String(l.listening?.audioScript||'').length>=40);
const allQuestionDepth=mockLessons.every(l=>{
 const qs=l.listening?.questions||[];
 return qs.filter(q=>String(q.tag||'').startsWith('reading:')).length>=4&&qs.filter(q=>String(q.tag||'').startsWith('listening:')).length>=4;
});
const allTransfer=mockLessons.every(l=>String(l.performance||'').length>=35&&String(l.northstarChangedCondition||'').length>=25&&String(l.mediation||'').length>=25);
const allEvidence=mockLessons.every(l=>l.northstarEvidence?.speaking?.length>=4&&l.northstarAdaptive?.strong?.length>=3&&l.northstarAdaptive?.struggling?.length>=3);

const checks=[
 ['parity engine syntax',syntax('../public/a1-northstar-parity-v1.js')],
 ['Northstar content overlay syntax',syntax('../public/a1-northstar-content-v1.js')],
 ['PWA loader syntax',syntax('../public/pwa.js')],
 ['all 22 frozen A1 lessons remain present',/const lessons=\[L1,L2,L3,L4,L5,L6,L7,L8,L9,L10,L11,L12,L13,L14,L15,L16,L17,L18,L19,L20,L21,L22\]/.test(gold)],
 ['A1 keeps Gold v1.0 frozen identity',gold.includes("englishgate-a1-gold-v1.0-frozen")&&gold.includes("curriculumLocked:true")],
 ['content overlay contains exactly 22 lesson scenarios',Object.keys(overlay).length===22],
 ['content overlay applies to all 22 lessons',allOverlayed],
 ['every A1 lesson has substantial adult reading and listening sources',allSources],
 ['every A1 lesson has >=4 reading and >=4 listening comprehension decisions',allQuestionDepth],
 ['every A1 lesson has performance + mediation + changed-condition transfer',allTransfer],
 ['every A1 lesson has B2-style evidence + adaptive metadata',allEvidence],
 ['content overlay preserves frozen target grammar/vocabulary ledger',!content.includes('targetLanguage=')&&!content.includes('targetVocabulary=')&&!content.includes('grammar=')&&!content.includes('vocabularyEntries=')],
 ['content overlay explicitly protects frozen progression',content.includes('This layer does not change the frozen vocabulary/grammar progression')&&content.includes('frozenProgressionPreserved:true')],
 ['A1 parity explicitly references B2 Northstar',parity.includes("reference:'B2 Northstar'")&&parity.includes("qualityParity:true")],
 ['A1 uses exact five-phase Northstar flow',parity.includes("const PHASES=['SEE','CHOOSE','CHANGE','USE','FIX']")],
 ['A1 uses focused 10-step microflow',parity.includes("const TOTAL=10")&&parity.includes("{phase:'SEE',skill:'reading'}")&&parity.includes("{phase:'FIX',skill:'writing'}")],
 ['A1 reuses B2 premium DOM contract',parity.includes('b2-microflow b2-northstar-flow a1-northstar-flow')],
 ['A1 uses B2 source decision compose repair UI contract',parity.includes("return'source'")&&parity.includes("return'decision'")&&parity.includes("return'compose'")&&parity.includes("return'repair'")],
 ['A1 has progressive support reduction',parity.includes("if(n<=5)return'high'")&&parity.includes("if(n<=11)return'medium-high'")&&parity.includes("if(n<=17)return'medium'")&&parity.includes("return'low'")],
 ['A1 has spaced retrieval offsets 1/3/7',parity.includes("const REMEMBER_OFFSETS=[1,3,7]")],
 ['A1 contract carries B2-quality content fields',parity.includes('foundation:l.foundation')&&parity.includes('chunks:(l.chunks||[])')&&parity.includes('interaction:(l.interactionExpressions||[])')&&parity.includes('functions:(l.functions||[])')&&parity.includes('pronunciation:l.pronunciation')&&parity.includes('mediation:l.mediation')],
 ['A1 reading uses source-grounded multi-question flow',parity.includes("key:'reading',items:readingQuestions(l)")&&parity.includes("Question '+(pos+1)+' of '")],
 ['A1 listening uses natural audio player + multi-question flow',parity.includes('liveAudioPlayerHtml')&&parity.includes("key:'listening',items:qs")],
 ['A1 includes real speaking transfer in the Northstar flow',parity.includes('/api/a1-gold/speaking/start')&&parity.includes('/api/a1-gold/speaking/turn')&&parity.includes('/api/a1-gold/speaking/complete')],
 ['A1 speaking mastery remains Jev-gated',parity.includes("result.masteryState==='MASTERED'")&&parity.includes('result.jevStatus')],
 ['A1 writing stays authentic and bounded',parity.includes("prompt('Do it for real.'")&&parity.includes('x.minWords')&&parity.includes('x.maxWords')],
 ['A1 writing blocks paste/drop',parity.includes("addEventListener('paste',e=>e.preventDefault())")&&parity.includes("addEventListener('drop',e=>e.preventDefault())")],
 ['A1 FIX calls Jev-backed writing grade instead of inventing correction',parity.includes('/api/writing-grade')&&parity.includes('Automated feedback is unavailable. Your response is saved without an invented correction.')],
 ['A1 persists authentic writing',parity.includes('/api/writing/')&&parity.includes('publishToCommunity')],
 ['A1 saves Northstar evidence tags',parity.includes("'northstar:a1-parity-v1'")&&parity.includes("'b2-parity:true'")],
 ['A1 intercepts only Gold lesson IDs',parity.includes("startsWith('a1-gold-l')")],
 ['A1 exits premium mode cleanly',parity.includes("classList.remove('b2-premium-workbook-mode','a1-northstar-workbook-mode')")],
 ['A1 content loads before parity renderer',pwa.indexOf('/a1-northstar-content-v1.js?v=1')>=0&&pwa.indexOf("content.addEventListener('load',startParity")>=0&&pwa.includes('/a1-northstar-parity-v1.js?v=1')],
 ['A1 CSS intentionally inherits B2 premium surface',css.includes('Base layout intentionally reuses englishgate-b2-premium-v3.css')&&css.includes('.a1-northstar-flow')],
 ['A1 mobile speaking actions remain single-column and touch-safe',css.includes('@media (max-width:700px)')&&css.includes('min-height:44px')],
 ['B2 Northstar engine remains present',b2.includes("FLOW_VERSION='b2-northstar-v1.1'")&&b2.includes("const PHASES=['SEE','CHOOSE','CHANGE','USE','FIX']")],
 ['A1 correct-choice placement is rearranged deterministically',parity.includes('function arrangeChoices')&&parity.includes('desired=Math.abs(Number(seed)||0)%n')],
 ['A1 learner sees previous-activity navigation',parity.includes('← Previous activity')],
 ['A1 completion summary describes the same Northstar learning logic',parity.includes('understood a source, retrieved earlier English, chose useful language, changed it for your situation, used it in a real exchange')]
];

let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failed++}
if(failed){console.error(`A1↔B2 NORTHSTAR PARITY QA failed: ${failed} check(s).`);process.exit(1)}
console.log(`A1↔B2 NORTHSTAR PARITY QA passed: ${checks.length}/${checks.length}.`);
