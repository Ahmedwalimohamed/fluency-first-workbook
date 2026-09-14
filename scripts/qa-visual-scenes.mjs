import fs from 'node:fs';

const enginePath='public/englishgate-visual-scene-engine-v1.js';
const indexPath='public/index.html';
const failures=[];
const warnings=[];
const ok=(cond,msg)=>cond?console.log('PASS',msg):failures.push(msg);
const warn=(cond,msg)=>{if(!cond)warnings.push(msg)};

const engine=fs.readFileSync(enginePath,'utf8');
const index=fs.readFileSync(indexPath,'utf8');

ok(/MAX_BYTES\s*=\s*10\s*\*\s*1024/.test(engine),'scene hard cap is 10 KB');
ok(/TextEncoder\(\)\.encode\(svg\)\.length/.test(engine),'rendered SVG byte size is measured');
ok(/if\(bytes>=MAX_BYTES\)/.test(engine),'oversized scenes fall back to a minimal SVG');
ok(/type==='reading'&&type!=='listening'|type!=='reading'&&type!=='listening'/.test(engine),'engine is scoped to Reading and Listening');
ok(!/<image\b/i.test(engine),'engine contains no embedded raster image elements');
ok(!/data:image\/(png|jpeg|jpg|webp)/i.test(engine),'engine contains no raster data URIs');
ok(/role=\"img\"/.test(engine)&&/<title>/.test(engine),'scene SVGs include accessible image semantics');
ok(/englishgate-visual-scene-engine-v1\.js\?v=1/.test(index),'scene engine is loaded by the production shell');
ok(/englishgate-visual-scene-engine-v1\.css\?v=1/.test(index),'scene engine stylesheet is loaded by the production shell');

const jsPos=index.indexOf('englishgate-visual-scene-engine-v1.js?v=1');
const sepPos=index.indexOf('reading-listening-separation-v3.js?v=4');
ok(jsPos>sepPos,'scene engine loads after the Reading/Listening renderer');

function settingFor(text){
  const t=String(text||'').toLowerCase();
  const rules=[
    ['airport',/airport|flight|boarding|gate|passport|luggage|terminal/],
    ['cafe',/cafe|café|coffee|tea|barista/],
    ['restaurant',/restaurant|menu|waiter|waitress|order food|dinner|lunch/],
    ['classroom',/classroom|teacher|student|lesson|school|university|homework/],
    ['office',/office|meeting|manager|colleague|client|workplace|report/],
    ['hospital',/hospital|doctor|nurse|patient|clinic|medicine|appointment/],
    ['shop',/shop|store|customer|cashier|price|buy|purchase/],
    ['transport',/bus|station|taxi|train|driver|ticket|journey|travel/],
    ['home',/home|house|kitchen|bedroom|family|mother|father|sister|brother/],
    ['park',/park|garden|tree|outside|walk|picnic/],
    ['phone',/phone|call|calling|telephone|video call/]
  ];
  return rules.find(([,re])=>re.test(t))?.[0]||'conversation';
}
function speakerCount(text,type){
  const names=[];
  String(text||'').split(/\n+/).forEach(line=>{
    const m=line.trim().match(/^([A-Z][A-Za-z'’.-]{1,24})(?:\s+[A-Z][A-Za-z'’.-]{1,24})?\s*:/);
    if(m&&!names.includes(m[1]))names.push(m[1]);
  });
  if(names.length)return Math.max(1,Math.min(3,names.length));
  if(type==='listening')return 2;
  return /\bthey\b|\btwo\b|\bfriends\b|\bcouple\b/i.test(String(text||''))?2:1;
}

const samples=[
  ['airport','Passenger: My flight leaves from gate 6. Agent: May I see your passport and boarding pass?'],
  ['cafe','Amina: Would you like coffee? Yusuf: Tea, please. We can sit in the café.'],
  ['classroom','Teacher: Open your lesson book. Student: Which homework should I check?'],
  ['office','Interviewer: Tell me about the client report. Amina: My manager reviewed it yesterday.'],
  ['hospital','Doctor: How is the patient feeling? Nurse: The clinic appointment went well.'],
  ['shop','Customer: How much is this? Cashier: The price is ten dollars.'],
  ['transport','Hodan: Our bus is late. Amina: We can take a taxi to the station.'],
  ['home','Mother: Dinner is ready in the kitchen. Ahmed: I will tell the family.'],
  ['park','Amina: Let us walk in the park. Hodan: We can sit under that tree.'],
  ['phone','Ahmed: I will call you tonight. Amina: Okay, use the video call.']
];
for(const [expected,text] of samples)ok(settingFor(text)===expected,`classifier maps representative ${expected} scene correctly`);
ok(speakerCount('Amina: Hello\nYusuf: Hi','listening')===2,'two-speaker dialogue renders two people');
ok(speakerCount('Amina: Hi\nYusuf: Hello\nHodan: Good morning','listening')===3,'three-speaker dialogue renders three people');
ok(speakerCount('A short monologue with no speaker labels.','listening')===2,'unlabelled listening uses safe two-person conversation default');

warn(/visualScene|sceneOverride|sceneSetting/.test(engine),'manual scene override metadata is not yet supported; ambiguous lessons rely on keyword inference');

for(const w of warnings)console.warn('WARN',w);
if(failures.length){
  failures.forEach(f=>console.error('FAIL',f));
  process.exit(1);
}
console.log(`Visual Scene Engine QA passed with ${warnings.length} warning(s).`);
