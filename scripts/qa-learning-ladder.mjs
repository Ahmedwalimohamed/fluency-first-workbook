import fs from 'node:fs';

const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');

function requireText(text,label){
 if(!app.includes(text))throw new Error('Learning ladder QA failed: missing '+label);
}
['Recognize','Build','Correct','Apply','Perform'].forEach((label)=>requireText("label:'"+label+"'","ladder stage "+label));
requireText('function learningLadderHtml','ladder renderer');
requireText('function ladderResultFromAnswers','ladder result scoring');
requireText('function writingLadderResult','writing ladder scoring');
requireText('ladder:highest:','persisted ladder standing tag');
requireText("learningLadderHtml(l,'vocabulary'","vocabulary ladder");
requireText("learningLadderHtml(l,'listening'","listening ladder");
requireText("learningLadderHtml(l,'grammar'","grammar ladder");
requireText("learningLadderHtml(l,'writing'","writing ladder");
requireText('Level 5 · Perform independently','independent writing performance step');
requireText("i>=Math.max(0,qs.length-2)?openEvidence","reduced-support grammar performance step");
requireText("questionSetHtml(readingQs,'lr','Reading',0,all.length)","global split reading ladder");
requireText("questionSetHtml(listeningQs,'ll','Listening',readingQs.length,all.length)","global split listening ladder");
if(!css.includes('.eg-learning-ladder')||!css.includes('.eg-ladder-step.is-current')||!css.includes('.eg-ladder-step.is-reached')){
 throw new Error('Learning ladder QA failed: ladder styles are incomplete');
}
console.log('Learning ladder QA passed: 5-stage progression is present across vocabulary, listening/reading, grammar, and writing.');
