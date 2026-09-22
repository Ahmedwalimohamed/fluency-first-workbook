import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../public/a1-gold-v1.js',import.meta.url),'utf8');
const context={window:{},BOOK_PACKS:{},console};
vm.runInNewContext(source,context,{filename:'public/a1-gold-v1.js'});
const book=context.window.A1_GOLD_V1_BOOK;
if(!book)throw new Error('A1 Gold book did not load.');

const lessons=book.lessons||[];
const checks=[];
const add=(name,ok,evidence='')=>checks.push([name,Boolean(ok),evidence]);

add('exactly 22 lessons',lessons.length===22,'count='+lessons.length);
add('lesson numbers contiguous',lessons.every((x,i)=>x.number===i+1));
add('lesson IDs unique',new Set(lessons.map(x=>x.id)).size===22);
add('all lessons ready + transfer required',lessons.every(x=>x.ready===true&&x.mastery?.requiresTransfer===true));
add('all writing blocks copy/paste disabled',lessons.every(x=>x.writing?.copyPasteDisabled===true));
add('new vocabulary stays within A1 budget',lessons.slice(0,21).every(x=>(x.targetVocabulary||[]).length<=8)&&((lessons[21]?.targetVocabulary||[]).length===0));
add('vocabulary entries are complete and non-circular',lessons.slice(0,21).every(x=>(x.vocabularyEntries||[]).every(v=>v.word&&v.meaning&&v.example&&v.meaning.toLowerCase()!==v.word.toLowerCase())));
add('Lesson 22 introduces no new vocabulary',(lessons[21]?.targetVocabulary||[]).length===0);
add('every lesson has at least 3 reading questions',lessons.every(x=>(x.listening?.questions||[]).filter(q=>String(q.tag||'').startsWith('reading:')).length>=3));
add('every lesson has at least 3 listening questions',lessons.every(x=>(x.listening?.questions||[]).filter(q=>String(q.tag||'').startsWith('listening:')).length>=3));
add('late lessons use dialogue audio',lessons.slice(17).every(x=>(x.listening?.speakers||[]).length>=2&&String(x.listening?.audioScript||'').includes(':')));
add('writing demand remains bounded for A1',lessons.every(x=>Number(x.writing?.maxWords||0)<=70&&Number(x.writing?.minWords||0)>=10));
add('final writing is a checkpoint',lessons[21]?.writing?.checkpoint===true);
add('stage checkpoints occur after Lessons 17 and 22',(book.stageCheckpoints||[]).some(x=>x.afterLesson===17)&&(book.stageCheckpoints||[]).some(x=>x.afterLesson===22));
add('final checkpoint covers five transfer domains',JSON.stringify((book.stageCheckpoints||[]).find(x=>x.afterLesson===22)?.domains||[])===JSON.stringify(['UNDERSTAND','RESPOND','INITIATE','PRODUCE','ADAPT']));
add('progression milestone can/cant at L7',String(lessons[6]?.grammar?.focus||'').toLowerCase().includes('can'));
add('progression milestone third-person at L10',String(lessons[9]?.grammar?.focus||'').toLowerCase().includes('third-person'));
add('progression milestone there is/are at L13',String(lessons[12]?.grammar?.focus||'').toLowerCase().includes('there is'));
add('progression milestone future + because at L14',String(lessons[13]?.grammar?.focus||'').toLowerCase().includes('going to')&&String(lessons[13]?.grammar?.focus||'').toLowerCase().includes('because'));
add('final lesson adds no new grammar',String(lessons[21]?.grammar?.focus||'').includes('No new grammar'));
add('final speaking evidence exceeds early lesson evidence',Number(lessons[21]?.mastery?.minimumSpeakingEvidence?.personalDetails||0)>Number(lessons[0]?.mastery?.minimumSpeakingEvidence?.personalDetails||0)&&Number(lessons[21]?.mastery?.minimumSpeakingEvidence?.relevantQuestions||0)>=2);

const items=[];
for(const lesson of lessons){
 for(const q of lesson.vocabulary?.items||[])items.push(q);
 for(const q of lesson.grammar?.items||[])items.push(q);
 for(const q of lesson.listening?.questions||[])items.push(q);
}
const ids=items.map(x=>x.id).filter(Boolean);
add('all assessment item IDs unique',ids.length===new Set(ids).size,'items='+ids.length);
add('all MCQ answers are defensible members of options',items.every(x=>!Array.isArray(x.options)||x.options.includes(x.answer)));

const triple=items.filter(x=>Array.isArray(x.options)&&x.options.length===3&&x.options.includes(x.answer));
const position=[0,0,0];
for(const q of triple)position[q.options.indexOf(q.answer)]++;
const total=triple.length||1,shares=position.map(n=>n/total);
add('MCQ answer positions are balanced',position.every(n=>n>0)&&Math.max(...shares)<0.5&&Math.min(...shares)>0.2,'A/B/C='+position.join('/'));

const placeholder=/\b(todo|tbd|placeholder|lorem ipsum)\b/i;
add('no placeholder learner content',lessons.every(x=>!placeholder.test(JSON.stringify(x))));
add('all lessons have reporting-relevant mastery IDs',lessons.every(x=>x.mastery?.communicationGoal&&x.id));

let failed=0;
for(const [name,ok,evidence] of checks){console.log(`${ok?'PASS':'FAIL'}  ${name}${evidence?'  '+evidence:''}`);if(!ok)failed++}
if(failed){console.error(`A1 WHOLE-LEVEL REGRESSION failed: ${failed} check(s).`);process.exit(1)}
console.log(`A1 WHOLE-LEVEL REGRESSION passed: ${checks.length}/${checks.length}. Lessons=22 Items=${items.length} MCQ_A_B_C=${position.join('/')}.`);
