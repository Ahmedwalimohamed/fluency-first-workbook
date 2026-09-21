'use strict';

const SUPPORTED_TYPES=[
  'multiple_choice','true_false','short_answer','fill_blank','sentence_correction',
  'matching','ordering','sentence_construction','teacher_speaking','individual_speaking','pair_discussion'
];
const CHOICE_TYPES=new Set(['multiple_choice','true_false']);
const TEXT_TYPES=new Set(['short_answer','fill_blank','sentence_correction','sentence_construction']);
const SPEAKING_TYPES=new Set(['teacher_speaking','individual_speaking','pair_discussion']);

function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
function clean(v,max=1000){return String(v??'').trim().replace(/\s+/g,' ').slice(0,max)}
function titleCase(s){return clean(s,120).replace(/\b\w/g,c=>c.toUpperCase())}
function parseCount(request){
  const text=String(request||'');
  const direct=text.match(/\b(\d{1,2})\s*(?:mcqs?|questions?|items?|prompts?|sentences?|activities?|tasks?)\b/i);
  if(direct)return clamp(Number(direct[1]),1,10);
  const nums=[...text.matchAll(/\b(\d{1,2})\b/g)].filter(m=>!/^\s*(?:minutes?|mins?|min)\b/i.test(text.slice((m.index||0)+m[0].length)));
  if(nums.length)return clamp(Number(nums[0][1]),1,10);
  if(/\b(?:a|an|one)\s+(?:matching|ordering|pair discussion|teacher[- ]?led speaking|individual speaking|speaking|live|quick)\s+(?:task|activity|check|prompt)\b/i.test(text)||/\bpair discussion\b/i.test(text))return 1;
  return 5;
}
function parseMinutes(request,fallback=5){
  const m=String(request||'').match(/\b(\d{1,2})\s*(?:minutes?|mins?|min)\b/i);
  return clamp(Number(m?.[1]||fallback),1,60);
}
function extractTopic(request){
  let raw=clean(request,400).replace(/(?:[,.!?]?\s*)\b\d{1,2}\s*(?:minutes?|mins?|min)\b[.!?]*/ig,'').trim();
  raw=raw.replace(/[.!?]+$/,'').trim();
  const m=raw.match(/\b(?:about|on|for)\b\s+(.+)$/i);
  return clean(m?.[1]||raw.replace(/^(?:create|make|give|generate|prepare)\s+(?:me\s+)?/i,''),120)||'the current lesson';
}
function inferRequestedTypes(request){
  const t=String(request||'').toLowerCase();
  if(/\bmixed\b|different types|all types/.test(t))return ['multiple_choice','true_false','short_answer','fill_blank','sentence_correction'];
  const hits=[];
  const add=x=>{if(!hits.includes(x))hits.push(x)};
  if(/\bmcq|multiple[- ]?choice|choose the correct|choice question/.test(t))add('multiple_choice');
  if(/true\s*\/\s*false|true or false|\bt\/f\b/.test(t))add('true_false');
  if(/short answer|open[- ]?ended|brief answer/.test(t))add('short_answer');
  if(/fill(?:-| )?in(?:-| )?the(?:-| )?blank|fill blank|gap fill|gap-fill/.test(t))add('fill_blank');
  if(/sentence correction|correct (?:the )?sentence|error correction|fix (?:the )?sentence/.test(t))add('sentence_correction');
  if(/matching|match (?:the|these|words|items)/.test(t))add('matching');
  // Treat role-play as speaking. Do not confuse real-world phrases such as "ordering food" with an ordering-question type.
  if(/role[- ]?play|roleplay|role[- ]?play cards?|scenario cards?/.test(t))add('pair_discussion');
  if(/ordering\s+(?:task|activity|question|exercise)|put .* in (?:the correct )?order|reorder|sequence (?:these|the|items|steps)/.test(t))add('ordering');
  if(/sentence construction|build (?:a|the) sentence|make (?:a|the) sentence|unscramble/.test(t))add('sentence_construction');
  if(/teacher[- ]?led speaking|whole class speaking/.test(t))add('teacher_speaking');
  if(/individual speaking|speaking prompt|oral response|speak individually/.test(t))add('individual_speaking');
  if(/pair discussion|pair speaking|discuss with (?:a|your) partner|in pairs/.test(t))add('pair_discussion');
  if(/\bspeaking\b/.test(t)&&!hits.some(x=>SPEAKING_TYPES.has(x)))add('individual_speaking');
  return hits.length?hits:['multiple_choice'];
}
function isWritingRequest(request){
  const t=String(request||'');
  return /\bwriting\s+(?:task|activity|prompt|assignment)\b/i.test(t)||/\bwrite\s+(?:a|an|the|\d+)?\s*(?:paragraph|essay|journal|composition|response)\b/i.test(t)||/\b(?:paragraph|essay|journal|composition)\s+(?:task|activity|prompt|assignment)\b/i.test(t);
}

function parseRequestNode(input){
  const request=clean(input.request,800);
  if(!request)throw Object.assign(new Error('Type what you want students to do.'),{status:400});
  const writing=isWritingRequest(request);
  return {
    request,
    count:parseCount(request),
    durationSeconds:parseMinutes(request,writing?7:5)*60,
    topic:extractTopic(request),
    requestedTypes:writing?[]:inferRequestedTypes(request),
    writing,
    level:clean(input.classInfo?.level||input.level||'B1',20),
    lessonContext:clean(input.lessonContext||'',1200)
  };
}
function planNode(state){
  if(state.writing)return {...state,plan:{taskType:'writing',types:[]}};
  const types=[];
  while(types.length<state.count)types.push(state.requestedTypes[types.length%state.requestedTypes.length]);
  return {...state,plan:{taskType:'activity',types}};
}

function systemPrompt(state){
  return [
    'You create teacher-approved live formative-assessment activities for adult ESL learners in EnglishGate.',
    'Return ONLY valid JSON. No markdown.',
    'The teacher must be able to preview and edit before sending.',
    'Ground every item in the requested topic. Avoid random trivia.',
    'Use concise classroom-safe language and one unambiguous learning target per item.',
    'Supported question types: '+SUPPORTED_TYPES.join(', ')+'.',
    'For multiple_choice: include options (2-4), answer as zero-based integer, explanation.',
    'For true_false: options must be ["True","False"], answer zero-based, explanation.',
    'For short_answer/fill_blank/sentence_correction/sentence_construction: include acceptedAnswers array and explanation.',
    'For matching: include pairs array of {"left":"...","right":"..."}; do not duplicate right values.',
    'For ordering: include items in scrambled order and correctOrder in correct order.',
    'For speaking types: include prompt and successCriteria array; these are teacher-marked and need no answer.',
    'Do not include unsafe, discriminatory, political persuasion, or personal-data collection tasks.'
  ].join('\n');
}
function userPrompt(state){
  return JSON.stringify({
    teacherRequest:state.request,
    topic:state.topic,
    cefrLevel:state.level||'B1',
    lessonContext:state.lessonContext||undefined,
    taskPlan:state.plan,
    requiredJsonShape:state.plan.taskType==='writing'
      ?{title:'string',instructions:'string',minWords:50,topic:'string'}
      :{title:'string',topic:'string',tip:'string',questions:state.plan.types.map((type,i)=>({id:'q'+(i+1),type,prompt:'string'}))}
  });
}
function outputText(data){
  if(typeof data?.output_text==='string'&&data.output_text.trim())return data.output_text.trim();
  for(const item of data?.output||[])for(const part of item?.content||[])if(typeof part?.text==='string'&&part.text.trim())return part.text.trim();
  return '';
}
async function aiGenerateNode(state){
  const key=process.env.OPENAI_API_KEY;
  if(!key)return {...state,ai:null,aiError:'OPENAI_API_KEY is not configured'};
  try{
    const response=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:process.env.LIVE_TASK_MODEL||'gpt-5.6-luna',
        input:[
          {role:'system',content:[{type:'input_text',text:systemPrompt(state)}]},
          {role:'user',content:[{type:'input_text',text:userPrompt(state)}]}
        ],
        max_output_tokens:5000
      }),
      signal:AbortSignal.timeout(30000)
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data?.error?.message||('OpenAI '+response.status));
    let text=outputText(data).replace(/^\s*\`\`\`(?:json)?/i,'').replace(/\`\`\`\s*$/,'').trim();
    const parsed=JSON.parse(text);
    return {...state,ai:parsed,aiError:null};
  }catch(error){
    return {...state,ai:null,aiError:clean(error?.message||'AI generation failed',300)};
  }
}

function roleplayFallback(topic,index){
  const label=topic||'the lesson topic',n=index+1,t=String(label).toLowerCase();
  const food=[
    {prompt:'Role-play: Customer A orders a main dish and a drink. Server B asks one follow-up question, confirms the order, and responds politely.',criteria:['Customer makes a clear, polite order','Server asks a natural follow-up question','Server confirms the order accurately']},
    {prompt:'Role-play: Customer A wants to order but has a food allergy. Server B explains which option is suitable and checks the customer’s choice.',criteria:['Customer explains the allergy clearly','Server gives a relevant option','Both speakers use polite restaurant language']},
    {prompt:'Role-play: Customer A orders an item that is unavailable. Server B apologizes and recommends an alternative. Customer decides what to order.',criteria:['Server apologizes and offers an alternative','Customer responds and makes a new choice','Conversation reaches a clear order']},
    {prompt:'Role-play: Customer A receives the wrong order. Explain the problem politely. Server B checks the order, apologizes, and offers a solution.',criteria:['Customer explains the problem politely','Server checks and responds appropriately','Both speakers agree on a solution']},
    {prompt:'Role-play: Customer A asks for the bill and notices an item they did not order. Server B checks the bill and resolves the problem politely.',criteria:['Customer asks about the bill clearly','Server responds professionally','The issue is resolved through natural dialogue']}
  ];
  if(/food|restaurant|cafe|café|meal|menu|dish/.test(t)){
    const x=food[index%food.length];return {id:'q'+n,type:'pair_discussion',prompt:x.prompt,successCriteria:x.criteria};
  }
  const generic=[
    `Role-play a realistic situation about ${label}. Partner A starts the conversation with a clear goal. Partner B asks one useful follow-up question before responding.`,
    `Role-play a small problem connected to ${label}. Partner A explains the problem. Partner B clarifies one detail and suggests a practical solution.`,
    `Role-play a decision about ${label}. Each partner gives one preference and one reason, then agree on what to do next.`,
    `Role-play a request connected to ${label}. Partner A makes the request politely. Partner B asks for clarification and gives a clear response.`,
    `Role-play a follow-up conversation about ${label}. Refer to one earlier detail, ask a natural question, and finish with a clear next step.`
  ];
  return {id:'q'+n,type:'pair_discussion',prompt:generic[index%generic.length],successCriteria:['Both partners contribute','Uses language that fits the situation','Conversation reaches a clear outcome']};
}
function fallbackQuestion(type,topic,index,request=''){
  const label=topic||'the lesson topic',n=index+1;
  if(type==='pair_discussion'&&/role[- ]?play|roleplay|scenario cards?/i.test(String(request)))return roleplayFallback(label,index);
  if(type==='multiple_choice')return {id:'q'+n,type,prompt:`Which option best demonstrates ${label}?`,options:[`A correct example of ${label}`,`An incorrect example of ${label}`,`An unrelated example`],answer:0,explanation:`Review why the first example matches ${label}.`};
  if(type==='true_false')return {id:'q'+n,type,prompt:`True or False: This statement correctly uses ${label}.`,options:['True','False'],answer:0,explanation:`Teacher should review the statement before sending.`};
  if(type==='short_answer')return {id:'q'+n,type,prompt:`Give a short example that shows ${label}.`,acceptedAnswers:[],explanation:'Open response for teacher review.'};
  if(type==='fill_blank')return {id:'q'+n,type,prompt:`Complete the blank using ${label}: ______.`,acceptedAnswers:[],explanation:'Teacher should add the expected answer before sending.'};
  if(type==='sentence_correction')return {id:'q'+n,type,prompt:`Correct this sentence so it accurately uses ${label}.`,acceptedAnswers:[],explanation:'Teacher-reviewed correction.'};
  if(type==='matching')return {id:'q'+n,type,prompt:`Match each item connected to ${label}.`,pairs:[{left:'Item 1',right:'Match 1'},{left:'Item 2',right:'Match 2'},{left:'Item 3',right:'Match 3'}],explanation:'Teacher should review the pairs before sending.'};
  if(type==='ordering')return {id:'q'+n,type,prompt:`Put these parts in the correct order for ${label}.`,items:['Part 2','Part 1','Part 3'],correctOrder:['Part 1','Part 2','Part 3'],explanation:'Arrange the items into the intended sequence.'};
  if(type==='sentence_construction')return {id:'q'+n,type,prompt:`Build one correct sentence that demonstrates ${label}.`,acceptedAnswers:[],explanation:'Open construction task for teacher review.'};
  if(type==='teacher_speaking')return {id:'q'+n,type,prompt:`Answer aloud as a class using ${label}.`,successCriteria:[`Uses ${label}`,'Complete spoken response']};
  if(type==='pair_discussion')return {id:'q'+n,type,prompt:`Discuss with a partner and use ${label} in your answer.`,successCriteria:[`Uses ${label}`,'Both partners contribute']};
  return {id:'q'+n,type:'individual_speaking',prompt:`Give a short spoken response using ${label}.`,successCriteria:[`Uses ${label}`,'Clear complete response']};
}
function fallbackNode(state){
  if(state.ai)return state;
  if(state.plan.taskType==='writing'){
    return {...state,fallback:{title:'Writing · '+titleCase(state.topic),topic:state.topic,instructions:`Write a clear response about ${state.topic}. Use complete sentences and check your work before submitting.`,minWords:50}};
  }
  return {...state,fallback:{title:'Live Check · '+titleCase(state.topic),topic:state.topic,tip:'Review the generated activity before sending it to students.',questions:state.plan.types.map((t,i)=>fallbackQuestion(t,state.topic,i,state.request))}};
}
function arrayClean(v,maxItems=10,maxLen=220){return Array.isArray(v)?v.slice(0,maxItems).map(x=>clean(x,maxLen)).filter(Boolean):[]}
function normalizeType(v,fallback='multiple_choice'){const t=clean(v,40).toLowerCase().replace(/[ -]+/g,'_');return SUPPORTED_TYPES.includes(t)?t:fallback}
function sanitizeQuestion(raw,i,plannedType){
  const type=normalizeType(raw?.type,plannedType),prompt=clean(raw?.prompt||raw?.q,400);
  if(prompt.length<3)throw new Error(`Question ${i+1} needs a prompt.`);
  const base={id:'q'+(i+1),type,prompt,explanation:clean(raw?.explanation,500)};
  if(CHOICE_TYPES.has(type)){
    let options=arrayClean(raw?.options,4,220);if(type==='true_false')options=['True','False'];
    if(options.length<2)throw new Error(`Question ${i+1} needs answer options.`);
    let answer=Number(raw?.answer);if(!Number.isInteger(answer)||answer<0||answer>=options.length)answer=0;
    return {...base,options,answer};
  }
  if(TEXT_TYPES.has(type)){
    const acceptedAnswers=arrayClean(raw?.acceptedAnswers||raw?.answers||(raw?.expectedAnswer?[raw.expectedAnswer]:[]),8,300);
    return {...base,acceptedAnswers};
  }
  if(type==='matching'){
    const pairs=(Array.isArray(raw?.pairs)?raw.pairs:[]).slice(0,8).map(p=>({left:clean(p?.left,220),right:clean(p?.right,220)})).filter(p=>p.left&&p.right);
    if(pairs.length<2)throw new Error(`Question ${i+1} needs at least two matching pairs.`);
    return {...base,pairs};
  }
  if(type==='ordering'){
    const items=arrayClean(raw?.items,8,220),correctOrder=arrayClean(raw?.correctOrder,8,220);
    if(items.length<2)throw new Error(`Question ${i+1} needs items to order.`);
    const validOrder=correctOrder.length===items.length&&correctOrder.every(x=>items.includes(x))?correctOrder:[...items];
    return {...base,items,correctOrder:validOrder};
  }
  if(SPEAKING_TYPES.has(type)){
    const successCriteria=arrayClean(raw?.successCriteria,6,220);
    return {...base,successCriteria:successCriteria.length?successCriteria:['Completes the speaking task','Uses the target language']};
  }
  return base;
}
function validateNode(state){
  const raw=state.ai||state.fallback;
  if(state.plan.taskType==='writing'){
    const instructions=clean(raw?.instructions,1600);
    if(instructions.length<5)throw Object.assign(new Error('The writing task could not be generated safely.'),{status:422});
    return {...state,result:{taskType:'writing',title:clean(raw?.title,100)||('Writing · '+titleCase(state.topic)),durationSeconds:state.durationSeconds,content:{topic:clean(raw?.topic,120)||state.topic,instructions,minWords:clamp(Number(raw?.minWords)||50,1,500)}}};
  }
  let questions=Array.isArray(raw?.questions)?raw.questions:[];
  const planned=state.plan.types;
  if(questions.length<planned.length){
    questions=[...questions,...planned.slice(questions.length).map((t,i)=>fallbackQuestion(t,state.topic,questions.length+i,state.request))];
  }
  questions=questions.slice(0,planned.length).map((x,i)=>sanitizeQuestion(x,i,planned[i]));
  return {...state,result:{taskType:'activity',title:clean(raw?.title,100)||('Live Check · '+titleCase(state.topic)),durationSeconds:state.durationSeconds,content:{topic:clean(raw?.topic,120)||state.topic,tip:clean(raw?.tip,400),questions}}};
}
function qualityGateNode(state){
  const r=state.result;
  if(!r||!r.content)throw Object.assign(new Error('The activity graph produced no usable activity.'),{status:422});
  if(r.taskType==='activity'&&(!Array.isArray(r.content.questions)||!r.content.questions.length))throw Object.assign(new Error('The activity graph produced no questions.'),{status:422});
  if(r.taskType==='activity'){
    const placeholder=/^(?:Part|Item|Match)\s*\d+$/i;
    for(const q of r.content.questions){
      if(q.type==='ordering'&&Array.isArray(q.items)&&q.items.some(x=>placeholder.test(String(x).trim())))throw Object.assign(new Error('The activity generator produced placeholder ordering content. Review is required before launch.'),{status:422});
      if(q.type==='matching'&&Array.isArray(q.pairs)&&q.pairs.some(p=>placeholder.test(String(p.left).trim())||placeholder.test(String(p.right).trim())))throw Object.assign(new Error('The activity generator produced placeholder matching content. Review is required before launch.'),{status:422});
    }
  }
  return {...state,quality:{approved:true,source:state.ai?'ai':'fallback'}};
}

async function runLiveTaskGraph(input){
  const trace=[];
  let state=parseRequestNode(input);trace.push({node:'parse_request',ok:true});
  state=planNode(state);trace.push({node:'plan_activity',ok:true,taskType:state.plan.taskType,types:state.plan.types});
  state=await aiGenerateNode(state);trace.push({node:'generate_activity',ok:Boolean(state.ai),fallback:Boolean(!state.ai),error:state.aiError||undefined});
  state=fallbackNode(state);trace.push({node:'fallback_if_needed',ok:true});
  state=validateNode(state);trace.push({node:'validate_and_normalize',ok:true});
  state=qualityGateNode(state);trace.push({node:'quality_gate',ok:true,source:state.quality.source});
  return {...state.result,requestText:state.request,graph:{version:'2.0',trace,source:state.quality.source}};
}

module.exports={SUPPORTED_TYPES,runLiveTaskGraph,normalizeType,CHOICE_TYPES,TEXT_TYPES,SPEAKING_TYPES};
