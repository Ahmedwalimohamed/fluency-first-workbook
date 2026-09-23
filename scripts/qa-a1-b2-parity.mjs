import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const parity=fs.readFileSync(new URL('../public/a1-northstar-parity-v1.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/a1-northstar-parity-v1.css',import.meta.url),'utf8');
const pwa=fs.readFileSync(new URL('../public/pwa.js',import.meta.url),'utf8');
const gold=fs.readFileSync(new URL('../public/a1-gold-v1.js',import.meta.url),'utf8');
const b2=fs.readFileSync(new URL('../public/b2-northstar-workbook-v1.js',import.meta.url),'utf8');

function syntax(path){return spawnSync(process.execPath,['--check',new URL(path,import.meta.url).pathname],{encoding:'utf8'}).status===0}
const checks=[
 ['parity engine syntax',syntax('../public/a1-northstar-parity-v1.js')],
 ['PWA loader syntax',syntax('../public/pwa.js')],
 ['all 22 frozen A1 lessons remain present',/const lessons=\[L1,L2,L3,L4,L5,L6,L7,L8,L9,L10,L11,L12,L13,L14,L15,L16,L17,L18,L19,L20,L21,L22\]/.test(gold)],
 ['A1 keeps Gold v1.0 frozen identity',gold.includes("englishgate-a1-gold-v1.0-frozen")&&gold.includes("curriculumLocked:true")],
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
 ['A1 parity loader runs after parser stack via PWA boot',pwa.includes('loadA1NorthstarParity()')&&pwa.includes('/a1-northstar-parity-v1.js?v=1')],
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
