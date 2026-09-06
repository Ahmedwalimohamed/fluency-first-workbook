const fs=require('fs');

const input=process.argv[2],output=process.argv[3];
if(!input||!output)throw new Error('Usage: node scripts/import-speakup-b2-blueprint.js <blueprint.md> <output.js>');
const markdown=fs.readFileSync(input,'utf8');
const appSource=fs.readFileSync('public/app.js','utf8');
const topicMatch=appSource.match(/const TOPIC_LIBRARY=(\{.*\});\nconst CAREER_LESSON_SPECS/s);
if(!topicMatch)throw new Error('Could not read TOPIC_LIBRARY');
const topicLibrary=JSON.parse(topicMatch[1]);
const definitions=new Map(Object.values(topicLibrary).flatMap(topic=>topic.v));
Object.entries({
 interest:'something you want to know more about',experience:'knowledge gained by doing or seeing something',confident:'sure of your ability',achievement:'something important completed successfully',workload:'the amount of work a person must do',qualification:'an official skill or achievement that makes someone suitable',route:'the way used to travel from one place to another',adventure:'an unusual or exciting experience',local:'connected with a nearby place or community',platform:'an online service where people communicate or share content',algorithm:'a set of rules a computer follows to make decisions',distraction:'something that takes attention away from a task',burnout:'extreme tiredness caused by long-term stress',wellbeing:'the state of being healthy and comfortable',recovery:'the process of becoming well or strong again',balance:'a healthy division of time or attention',dish:'food prepared and served as part of a meal',spice:'a plant substance used to add flavour to food',curriculum:'the subjects and content taught in a course',assessment:'a task used to measure knowledge or ability',method:'a particular way of doing something',independent:'able to work or decide without help',capital:'money used to start or grow a business',competitor:'a person or business offering a similar product',service:'work done to help or provide something for a customer',risk:'the possibility that something harmful or unwanted may happen',drought:'a long period with little or no rain',conservation:'the protection of natural resources',shortage:'a situation in which there is not enough of something',influence:'the power to affect a person or situation',trust:'belief that someone or something is honest and reliable',misinformation:'false or inaccurate information that is shared',training:'the process of learning skills for a job or activity',ability:'the skill or power to do something',discipline:'the habit of following a plan consistently',convenience:'the quality of being easy and useful',community:'people who live, work, or share interests together',milestone:'an important stage showing progress',direction:'the course or purpose that guides future action',incident:'an event, especially one requiring attention',prevention:'action taken to stop a problem before it happens',justice:'fair treatment according to law and principle',theory:'an explanation based on ideas and evidence',discovery:'something learned or found for the first time',signal:'a sign that communicates information',audition:'a performance used to select someone for a role',talent:'a natural or developed ability to do something well',inspiration:'an idea or person that encourages creative action',cooperation:'working together toward a shared result',policy:'an official rule or plan used by an organisation',development:'the process of growing or improving',relaxation:'time or activity that reduces tension',creativity:'the ability to produce original ideas',diaspora:'people living outside their ancestral homeland',instinct:'a natural feeling that guides a decision',commit:'to make a firm decision or promise',hesitate:'to pause because you are uncertain',indecisive:'unable to make decisions confidently',fluency:'the ability to communicate smoothly and effectively',confidence:'belief in your own ability',consistency:'the quality of continuing at a steady standard'
}).forEach(([word,meaning])=>definitions.set(word,meaning));

function plain(value=''){return value.replace(/<[^>]+>/g,' ').replace(/\*\*/g,'').replace(/^>\s*/gm,'').replace(/\\_/g,'_').replace(/\s+/g,' ').trim()}
function field(chunk,label,next){const re=new RegExp(label+':\\s*([\\s\\S]*?)'+next);return plain(chunk.match(re)?.[1]||'')}
function questionSet(block,tag){
 const rows=[];const re=/\*\*(?!Answer key:)([\s\S]*?)\*\*\s*\n([\s\S]*?)>\s*\*\*Answer key:\s*([\s\S]*?)\*\*/g;let match;
 while((match=re.exec(block))){let question=plain(match[1]);const questionStarts=['Why ','What ','How ','Which ','Where ','Who ','When ','Choose ','Select ','Arrange ','Complete '],start=Math.max(...questionStarts.map(word=>question.lastIndexOf(word)));if(start>0)question=question.slice(start);if(!question)continue;const answer=plain(match[3]);const listed=[...match[2].matchAll(/^>\s*○\s*([^\n]+)/gm)].map(x=>plain(x[1])).filter(x=>x&&!/distractor|correct|best answer|target|partial|context-dependent|one /i.test(x));rows.push({q:question,answer,listed,tag});}
 return rows;
}
function optionsFor(items,index){const item=items[index],pool=items.map(x=>x.answer).filter(x=>x&&x!==item.answer);return [...new Set([item.answer,...item.listed,...pool.slice(index%Math.max(1,pool.length)),...pool])].slice(0,3)}
function vocabItems(words,title){
 const meanings=words.map(word=>definitions.get(word)||('a useful word connected to '+title.toLowerCase()));
 const wordOpts=i=>[words[i],words[(i+2)%words.length],words[(i+4)%words.length]];
 const meaningOpts=i=>[meanings[i],meanings[(i+2)%words.length],meanings[(i+4)%words.length]];
 return [
  ...words.slice(0,6).map((word,i)=>({type:'choice',q:`Match “${word}” to its meaning.`,options:meaningOpts(i),answer:meanings[i],tag:'vocabulary:meaning'})),
  {type:'choice',q:`Which word means “${meanings[1]}”?`,options:wordOpts(1),answer:words[1],tag:'vocabulary:context'},
  {type:'choice',q:`Which target word best matches this idea: ${meanings[4]}?`,options:wordOpts(4),answer:words[4],tag:'vocabulary:context'},
  {type:'exact',q:`Type the target word meaning “${meanings[0]}”.`,answer:words[0],min:1,tag:'vocabulary:recall'},
  {type:'choice',q:`Choose the word that is most useful when discussing ${title.toLowerCase()}.`,options:[words[5],'unrelated','ordinary'],answer:words[5],tag:'vocabulary:application'}
 ];
}
function builderItems(finalWriting,words){
 const lower=finalWriting.toLowerCase(),isEmail=lower.includes('email'),isSocial=/facebook|x post|social|online post|comment/.test(lower),isWhatsapp=lower.includes('whatsapp')||lower.includes('message');
 const opening=isEmail?'Dear Sir or Madam,':isWhatsapp?'Hi everyone,':isSocial?'Here is something worth discussing:':'Hello,';
 const closing=isEmail?'Kind regards,':isWhatsapp?'Thanks — I look forward to hearing from you.':isSocial?'What do you think?':'Thank you.';
 return [
  {q:'Which opening best suits this task and audience?',options:[opening,'To whom it may concern regarding everything,','Hey!!! Send answer now.'],answer:opening,tag:'writing-builder:register'},
  {q:'Which content should be included?',options:[`A clear purpose connected to ${finalWriting.toLowerCase()}`,`Unrelated private details`,`A long list with no purpose`],answer:`A clear purpose connected to ${finalWriting.toLowerCase()}`,tag:'writing-builder:task'},
  {q:'Choose the clearest connector for adding a supporting point.',options:['In addition,','Despite because,','On the contrary of,'],answer:'In addition,',tag:'writing-builder:cohesion'},
  {q:`Which target word means “${definitions.get(words[5])}”?`,options:[words[5],words[1],words[3]],answer:words[5],tag:'writing-builder:vocabulary'},
  {q:'Which closing is most appropriate?',options:[closing,'Finish.','Reply immediately or else.'],answer:closing,tag:'writing-builder:register'}
 ];
}

const starts=[...markdown.matchAll(/^\*\*LESSON (\d+)\*\*\s*\n\s*([^\n]+)\s*\n/gm)];
const lessons=starts.map((start,index)=>{
 const number=Number(start[1]),title=plain(start[2]),chunk=markdown.slice(start.index,starts[index+1]?.index||markdown.length);
 const grammarFocus=field(chunk,'Grammar','<\\/p>'),finalWriting=field(chunk,'Final real-life writing','<\\/p>'),vocabulary=field(chunk,'Vocabulary','<\\/p>').split(',').map(x=>x.trim()).filter(Boolean),outcome=plain(chunk.match(/Outcome:\s*([\s\S]*?)\n\nUI:/)?.[1]||'');
 const readingBlock=chunk.match(/\| \*\*SCREEN 6\*\*[\s\S]*?(?=\| \*\*SCREEN 7\*\*)/)?.[0]||'';
 const readingLead=readingBlock.match(/\|[-|]+\|\s*\n\n([\s\S]*?)\n\n\*\*/)?.[1]||'';
 const readingText=plain(readingLead),readingRaw=questionSet(readingBlock,'reading:comprehension');
 const readingQuestions=readingRaw.map((item,i)=>({...item,options:optionsFor(readingRaw,i)}));
 const listeningBlock=chunk.match(/\| \*\*SCREEN 7\*\*[\s\S]*?(?=\| \*\*SCREEN 8\*\*)/)?.[0]||'';
 const audioScript=plain(listeningBlock.match(/AUDIO SCRIPT \/ PRODUCTION BRIEF<\/strong><\/p>\s*<p>([\s\S]*?)<\/p>\s*<p>Production target/)?.[1]||'');
 const listeningRaw=questionSet(listeningBlock,'listening:comprehension');
 const listeningQuestions=listeningRaw.map((item,i)=>({...item,options:optionsFor(listeningRaw,i)}));
 const writingBlock=chunk.match(/\| \*\*SCREEN 9\*\*[\s\S]*?(?=\| \*\*SCREEN 10\*\*)/)?.[0]||'';
 const writingTask=plain(writingBlock.match(/STUDENT TASK<\/strong><\/p>\s*<p>([\s\S]*?)<\/p>/)?.[1]||finalWriting);
 const range=writingTask.match(/(\d+)\s*[–-]\s*(\d+)\s*words?/i),minWords=range?Number(range[1]):number===22?150:60,maxWords=range?Number(range[2]):number===22?200:Math.max(100,minWords+40);
 return {id:`su-b2-l${number}`,number,title,outcome,grammarFocus,grammarRule:`Use ${grammarFocus} accurately for ${finalWriting.toLowerCase()}. Focus on form, meaning, and one useful contrast.`,finalWriting,vocabulary,vocabularyItems:vocabItems(vocabulary,title),readingText,audioScript,questions:[...readingQuestions,...listeningQuestions],writing:{builder:builderItems(finalWriting,vocabulary),task:writingTask,minWords,maxWords,humanGraded:number===22}};
});
if(lessons.length!==22)throw new Error(`Expected 22 lessons, found ${lessons.length}`);
for(const lesson of lessons){if(lesson.vocabulary.length!==6||!lesson.readingText||!lesson.audioScript||lesson.questions.length!==7||!lesson.writing.task)throw new Error(`Lesson ${lesson.number} incomplete: vocabulary=${lesson.vocabulary.length}, reading=${lesson.readingText.length}, audio=${lesson.audioScript.length}, questions=${lesson.questions.length}, writing=${lesson.writing.task.length}`)}
fs.writeFileSync(output,`window.SPEAKUP_B2_BLUEPRINT=${JSON.stringify(lessons)};\n`);
console.log(`Imported ${lessons.length} lessons into ${output}`);
