const express=require('express');
const path=require('path');
const crypto=require('crypto');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const cookieParser=require('cookie-parser');
const helmet=require('helmet');
const rateLimit=require('express-rate-limit');
const {Pool}=require('pg');

const app=express();
const port=process.env.PORT||3000;
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const JWT_SECRET=process.env.JWT_SECRET;
if(!process.env.DATABASE_URL||!JWT_SECRET){console.error('DATABASE_URL and JWT_SECRET are required');process.exit(1)}
const LISTENING_SCRIPTS={"w1l1":"I use English in several parts of my life. At work, I sometimes read messages and speak with colleagues. Online, I watch short videos and search for information in English. Reading is usually comfortable for me, and I can understand the main idea when people speak clearly. Speaking is different. When I need to answer quickly, I sometimes pause for too long because I am searching for the right word. In my experience, I communicate better when I have a few seconds to think. One goal I have for the next twelve weeks is to speak for two minutes without stopping after every sentence. I also want to ask for repetition confidently when I do not understand a question.","w1l2":"Hello, my name is Hassan. I currently work as a project assistant for a local construction company. My background is in construction planning, and I have worked with the team for almost two years. I’m responsible for checking schedules, collecting progress information, and preparing weekly updates for the project manager. I’m particularly interested in planning because I enjoy turning a complicated project into clear steps. I also work closely with engineers and site supervisors, so communication is an important part of my role. My current goal is to lead larger projects in the future. To do that well, I want to communicate more confidently with international colleagues and explain project information clearly in English.","w1l3":"English matters to me for two main reasons. The first point is communication at work. Sometimes I meet people from different countries, and I need to explain an idea or ask a clear question. For example, last month I spoke with a visitor about a project schedule. I understood the topic, but I paused too often while searching for words. Another thing is career growth. Better English can help me join training, attend interviews, and take on more responsibility. Let me say that another way: I do not need perfect English before I speak. I need enough useful language to keep my message moving. That is why I practise short answers, examples, and repair phrases instead of stopping completely.","w2l4":"I arrived early for a digital skills workshop and stood near the registration desk. A woman next to me smiled and said, “Hi, have we met before?” I said I did not think so, and she introduced herself. Then she asked, “What brings you here?” I explained that I wanted to learn more about using technology at work. She responded, “That sounds interesting,” and asked how I knew the organising team. Her questions felt natural because they were connected to the event, not too personal. After a few minutes, I asked about her work and we discovered that we both knew someone from the same community project. The conversation became easy because each question gave us a shared topic to continue.","w2l5":"A colleague told me that she had recently started learning mapping software. I wanted to keep the conversation going, so I did not immediately talk about myself. First I said, “Really?” and asked how she became interested in it. She explained that a colleague had shown her how mapping could help with community projects. I asked what the first few lessons were like. She said they were challenging because the software had many tools, but she enjoyed seeing her progress. I checked my understanding by asking if the difficult beginning had become easier with practice. She agreed. Then I said I could relate because I had felt the same way when learning a new reporting system. Each question connected directly to what she had just said.","w2l6":"Near the end of a workshop, I noticed that the person I was speaking with kept looking toward the next session. I said, “I should let you get back to the workshop.” He thanked me and said it had been great speaking with me. Before leaving, I suggested that we stay in touch. I promised to send him a project link that afternoon, and he said he would review it the next day. We confirmed one clear next step instead of ending with a vague promise. I finished by saying that I looked forward to speaking again. The ending felt warm but professional because it respected his time, confirmed what would happen next, and gave both of us a clear reason to continue the relationship later.","w3l7":"When people ask what I do, I try not to start with technical language. In simple terms, I help our projects stay organised and on schedule. My main responsibility is collecting progress information and turning it into clear updates. A typical task involves checking what has been completed, identifying anything that is late, and asking colleagues for missing information. I work closely with field staff, supervisors, and the finance team because each group has part of the information I need. The purpose of my role is to help managers understand what is happening and decide what to do next. The result is not just a report. A useful update helps the team notice problems early and keep the project moving.","w3l8":"Most weeks, my routine is predictable. I usually start the morning by checking messages and reviewing the plan for the day. After that, I coordinate with colleagues and update our task list. I normally spend part of the afternoon preparing notes or reports. This week is different because we have an important deadline on Thursday. At the moment, I’m checking final details for a client update and waiting for two pieces of information from other team members. My top priority today is finishing the update before 4 p.m. I still have my normal duties, but I am giving less time to them until this deadline is complete. Tomorrow, I expect my routine to become more normal again.","w3l9":"Here is a quick update on the client plan. So far, I’ve completed the first review and corrected the two sections we discussed yesterday. I’m currently checking the final details and confirming the latest numbers with the finance team. The main issue is one missing document from a supplier. I have already requested it, and I expect to receive it this afternoon. If it arrives on time, I expect to finish the full update by 3 p.m. My next step is to add the document, check the final version once more, and send the completed plan to the manager. At the moment, the missing document is the only blocker, so I do not expect the deadline to change."};
const BOOK_SEEDS=[{"id":"career-fluency","title":"English Communication & Career Fluency","level":"A2+ → B1","audience":"Adult / professional","status":"ready","total_lessons":9,"activity_model":"Vocabulary · Listening & Reading · Grammar · Writing"},{"id":"speakup-a2-b1","title":"SpeakUp English A2 → B1","level":"A2 → B1","audience":"False beginner / pre-intermediate","status":"ready","total_lessons":22,"activity_model":"Vocabulary · Listening & Reading · Grammar · Writing"},{"id":"speakup-b2","title":"B2 Upper Intermediate","level":"B2","audience":"Upper-intermediate","status":"ready","total_lessons":22,"activity_model":"Vocabulary · Listening & Reading · Grammar · Writing"},{"id":"career-fluency-muna","title":"Career Fluency — Muna Edition","level":"A1+/A2 → functional B1","audience":"Personal edition","status":"ready","total_lessons":36,"activity_model":"Vocabulary · Listening & Reading · Grammar · Writing"},{"id":"career-fluency-abdisalan","title":"Career Fluency — Abdisalan Edition","level":"A2+ → functional B1","audience":"Personal edition","status":"ready","total_lessons":36,"activity_model":"Vocabulary · Listening & Reading · Grammar · Writing"},{"id":"career-fluency-abdishakur","title":"Career Fluency — Abdishakur Edition","level":"A2+ → functional B1","audience":"Personal edition","status":"ready","total_lessons":36,"activity_model":"Vocabulary · Listening & Reading · Grammar · Writing"}];
LISTENING_SCRIPTS["su-a2b1-l1"]="On the first day of a new training course, Amina sits next to Yusuf. Amina lives in Borama and works in a small office. Her hometown is Hargeisa. She enjoys reading and walking in the evening. Yusuf is a university student. He likes football and photography. They ask each other simple questions about work, hometowns, and hobbies. Before the lesson starts, Amina introduces Yusuf to another student and says that he is friendly and outgoing.";
const OPENAI_TTS_MODEL=process.env.OPENAI_TTS_MODEL||'gpt-4o-mini-tts';
const OPENAI_TTS_VOICE=process.env.OPENAI_TTS_VOICE||'coral';
const audioCache=new Map();

app.set('trust proxy',1);
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:'256kb'}));
app.use(cookieParser());

const loginLimiter=rateLimit({windowMs:10*60*1000,max:20,standardHeaders:true,legacyHeaders:false});
const passwordResetLimiter=rateLimit({windowMs:10*60*1000,max:5,standardHeaders:true,legacyHeaders:false});
function tokenFor(u){return jwt.sign({id:u.id,role:u.role,username:u.username,name:u.name},JWT_SECRET,{expiresIn:'12h'})}
function setSession(res,u){res.cookie('ff_session',tokenFor(u),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:12*60*60*1000,path:'/'})}
function auth(req,res,next){try{req.user=jwt.verify(req.cookies.ff_session||'',JWT_SECRET);next()}catch{return res.status(401).json({error:'Please sign in again.'})}}
function adminOnly(req,res,next){if(req.user.role!=='admin')return res.status(403).json({error:'System Admin access required.'});next()}
function teacherOnly(req,res,next){if(req.user.role!=='teacher')return res.status(403).json({error:'Teacher access required.'});next()}
function studentOnly(req,res,next){if(req.user.role!=='student')return res.status(403).json({error:'Student access required.'});next()}
function tempPassword(){return String(crypto.randomInt(0,100000000)).padStart(8,'0')}
function newLoginToken(){return crypto.randomBytes(24).toString('base64url')}
function chosenPassword(value){
 if(value===undefined||value===null||value==='')return tempPassword();
 if(typeof value!=='string'||!/^\d{8,20}$/.test(value))return null;
 return value;
}

async function initDb(){
 await pool.query(`create table if not exists users(id text primary key,username text unique not null,password_hash text not null,role text not null check(role in ('teacher','student')),name text not null,created_at timestamptz default now());
 create table if not exists classes(id text primary key,name text not null,level text not null,course_id text not null,teacher_id text references users(id),created_at timestamptz default now());
 create table if not exists enrollments(class_id text references classes(id) on delete cascade,user_id text references users(id) on delete cascade,primary key(class_id,user_id));
 create table if not exists profiles(user_id text primary key references users(id) on delete cascade,points int not null default 0,base jsonb not null default '{"vocabulary":60,"grammar":60,"listening":60,"writing":60}');
 create table if not exists attempts(id bigserial primary key,student_id text references users(id) on delete cascade,lesson_id text not null,skill text not null,score int not null check(score between 0 and 100),tags text[] not null default '{}',at timestamptz default now());
 create table if not exists completion(student_id text references users(id) on delete cascade,lesson_id text not null,step text not null,completed_at timestamptz default now(),primary key(student_id,lesson_id,step));
 create table if not exists writing_samples(student_id text references users(id) on delete cascade,lesson_id text not null,content text not null,score int check(score between 0 and 100),updated_at timestamptz default now(),primary key(student_id,lesson_id));
 create table if not exists listening_locks(student_id text references users(id) on delete cascade,lesson_id text not null,locked_at timestamptz default now(),primary key(student_id,lesson_id));
  create table if not exists teacher_contexts(teacher_id text primary key references users(id) on delete cascade,class_id text references classes(id) on delete set null,lesson_number int not null default 1,section_index int not null default 0,updated_at timestamptz default now());\n create table if not exists assignments(id text primary key,class_id text references classes(id) on delete cascade,book_id text not null,lesson_id text not null,lesson_number int not null,lesson_title text not null,skills text[] not null default '{vocabulary,listening,grammar,writing}',created_by text references users(id),created_at timestamptz default now());\n create table if not exists deleted_seed_accounts(username text primary key,deleted_at timestamptz default now());\n create table if not exists deleted_seed_classes(id text primary key,deleted_at timestamptz default now());\n create table if not exists deleted_seed_books(id text primary key,deleted_at timestamptz default now());`);
 await pool.query("alter table users add column if not exists whatsapp_number text");
 await pool.query("alter table users add column if not exists login_token text");
 await pool.query("alter table profiles add column if not exists profile_photo text");
 await pool.query("alter table profiles add column if not exists profile_photo_updated_at timestamptz");
 await pool.query("alter table profiles add column if not exists job_title text");
 await pool.query("create unique index if not exists users_login_token_unique on users(login_token) where login_token is not null");
 await pool.query("alter table writing_samples alter column score drop not null");
 await pool.query("delete from attempts where skill='writing' and tags @> array['writing:organisation','writing:task-completion']::text[]");
 await pool.query("alter table users drop constraint if exists users_role_check");
 await pool.query("alter table users add constraint users_role_check check(role in ('admin','teacher','student'))");
 await pool.query("create table if not exists books(id text primary key,title text not null,level text not null,audience text not null default '',status text not null default 'queued',total_lessons int not null default 0,activity_model text not null default '',created_at timestamptz default now())");
 for(const b of BOOK_SEEDS){if((await pool.query('select 1 from deleted_seed_books where id=$1',[b.id])).rowCount)continue;await pool.query("insert into books(id,title,level,audience,status,total_lessons,activity_model) values($1,$2,$3,$4,$5,$6,$7) on conflict(id) do update set title=excluded.title,level=excluded.level,audience=excluded.audience,status=excluded.status,total_lessons=excluded.total_lessons,activity_model=excluded.activity_model",[b.id,b.title,b.level,b.audience,b.status,b.total_lessons,b.activity_model]);}
 const aUser=(process.env.SYSTEM_ADMIN_USERNAME||'admin').trim().toLowerCase(),aPass=process.env.SYSTEM_ADMIN_PASSWORD;
 const adminWasDeleted=(await pool.query('select 1 from deleted_seed_accounts where lower(username)=lower($1)',[aUser])).rowCount>0;
 if(aPass&&!adminWasDeleted){let a=await pool.query('select id,role from users where lower(username)=lower($1)',[aUser]);if(!a.rowCount){await pool.query('insert into users(id,username,password_hash,role,name) values($1,$2,$3,$4,$5)',['a_'+crypto.randomUUID(),aUser,await bcrypt.hash(aPass,12),'admin',process.env.SYSTEM_ADMIN_NAME||'System Admin']);}else if(a.rows[0].role!=='admin'){throw new Error('SYSTEM_ADMIN_USERNAME is already used by a non-admin account');}else{await pool.query('update users set password_hash=$1,name=$2 where id=$3',[await bcrypt.hash(aPass,12),process.env.SYSTEM_ADMIN_NAME||'System Admin',a.rows[0].id]);}}
 const tUser=process.env.TEACHER_USERNAME||'teacher',tPass=process.env.TEACHER_PASSWORD;
 if(!tPass)throw new Error('TEACHER_PASSWORD is required');
 const teacherWasDeleted=(await pool.query('select 1 from deleted_seed_accounts where lower(username)=lower($1)',[tUser])).rowCount>0;
 let tid=null;
 if(!teacherWasDeleted){const t=await pool.query('select id,role from users where lower(username)=lower($1)',[tUser]);if(!t.rowCount){tid='t_'+crypto.randomUUID();await pool.query('insert into users(id,username,password_hash,role,name) values($1,$2,$3,$4,$5)',[tid,tUser,await bcrypt.hash(tPass,12),'teacher',process.env.TEACHER_NAME||'Teacher Ahmed']);}else{if(t.rows[0].role!=='teacher')throw new Error('TEACHER_USERNAME is already used by a non-teacher account');tid=t.rows[0].id;await pool.query('update users set password_hash=$1,name=$2 where id=$3',[await bcrypt.hash(tPass,12),process.env.TEACHER_NAME||'Teacher Ahmed',tid]);}}
 const seedClassWasDeleted=(await pool.query('select 1 from deleted_seed_classes where id=$1',['c1'])).rowCount>0;
 if(!seedClassWasDeleted){await pool.query(`insert into classes(id,name,level,course_id,teacher_id) values('c1','Fluency Foundations','A2+ → B1','career-fluency',$1) on conflict(id) do update set teacher_id=excluded.teacher_id`,[tid]);if(tid)await pool.query('insert into enrollments(class_id,user_id) values($1,$2) on conflict do nothing',['c1',tid]);}
 const demo=process.env.DEMO_STUDENT_USERNAME,demoPass=process.env.DEMO_STUDENT_PASSWORD;
 if(demo&&demoPass&&!(await pool.query('select 1 from deleted_seed_accounts where lower(username)=lower($1)',[demo])).rowCount){let s=await pool.query('select id,role from users where lower(username)=lower($1)',[demo]);let sid;if(!s.rowCount){sid='s_'+crypto.randomUUID();await pool.query('insert into users(id,username,password_hash,role,name) values($1,$2,$3,$4,$5)',[sid,demo,await bcrypt.hash(demoPass,12),'student',process.env.DEMO_STUDENT_NAME||'Raqiya Ibrahim']);await pool.query('insert into profiles(user_id,points,base) values($1,0,$2::jsonb)',[sid,JSON.stringify({vocabulary:60,grammar:60,listening:60,writing:60})]);}else{if(s.rows[0].role!=='student')throw new Error('DEMO_STUDENT_USERNAME is already used by a non-student account');sid=s.rows[0].id;await pool.query('update users set password_hash=$1,name=$2 where id=$3',[await bcrypt.hash(demoPass,12),process.env.DEMO_STUDENT_NAME||'Raqiya Ibrahim',sid]);}await pool.query('insert into profiles(user_id) values($1) on conflict do nothing',[sid]);if(!seedClassWasDeleted)await pool.query('insert into enrollments(class_id,user_id) values($1,$2) on conflict do nothing',['c1',sid]);}
 const missingLoginTokens=await pool.query("select id from users where role='student' and (login_token is null or login_token='')");
 for(const row of missingLoginTokens.rows){await pool.query('update users set login_token=$1 where id=$2',[newLoginToken(),row.id]);}
}

app.get('/api/health',async(req,res)=>{try{await pool.query('select 1');const adminCount=await pool.query("select count(*)::int as count from users where role='admin'");res.json({ok:true,service:'fluency-first-api',systemAdminConfigured:Boolean(process.env.SYSTEM_ADMIN_PASSWORD),systemAdminAccountExists:Number(adminCount.rows[0]?.count||0)>0,openaiTtsConfigured:Boolean(process.env.OPENAI_API_KEY),ttsModel:OPENAI_TTS_MODEL})}catch(e){res.status(503).json({ok:false})}});
app.post('/api/auth/login',loginLimiter,async(req,res)=>{const username=String(req.body.username||'').trim().toLowerCase(),password=String(req.body.password||'');const q=await pool.query(`select u.id,u.username,u.password_hash,u.role,u.name,(p.profile_photo is not null) as has_profile_photo from users u left join profiles p on p.user_id=u.id where lower(u.username)=lower($1)`,[username]);if(!q.rowCount||!(await bcrypt.compare(password,q.rows[0].password_hash)))return res.status(401).json({error:'Username or password is incorrect.'});const u=q.rows[0];setSession(res,u);res.json({user:{id:u.id,username:u.username,role:u.role,name:u.name,hasProfilePhoto:Boolean(u.has_profile_photo),profilePhotoUrl:u.has_profile_photo?'/api/profile-photo/'+encodeURIComponent(u.id):null}})});
app.get('/api/auth/access',loginLimiter,async(req,res)=>{
 const accessToken=String(req.query.token||'').trim();
 if(!/^[A-Za-z0-9_-]{24,128}$/.test(accessToken))return res.status(404).json({error:'Personal login link not found.'});
 const q=await pool.query("select username,name from users where login_token=$1 and role='student'",[accessToken]);
 if(!q.rowCount)return res.status(404).json({error:'Personal login link not found.'});
 res.set('Cache-Control','no-store');
 res.json({student:{username:q.rows[0].username,name:q.rows[0].name}});
});
app.post('/api/auth/forgot-password',passwordResetLimiter,async(req,res)=>{
 const accessToken=String(req.body.accessToken||'').trim();
 if(!/^[A-Za-z0-9_-]{24,128}$/.test(accessToken))return res.status(400).json({error:'Open your personal EnglishGate login link from WhatsApp and try again.'});
 const client=await pool.connect();
 try{
  await client.query('begin');
  const q=await client.query("select id,username,role,name,whatsapp_number,login_token from users where login_token=$1 and role='student' for update",[accessToken]);
  if(!q.rowCount){await client.query('rollback');return res.status(404).json({error:'Personal login link not found.'});}
  const user=q.rows[0];
  if(!normalizeWhatsapp(user.whatsapp_number)){await client.query('rollback');return res.status(409).json({error:'No registered WhatsApp number is available for this student. Ask your teacher for help.'});}
  const pw=tempPassword(),access=await accountAccessContext(user);
  const message=accountAccessMessage({name:user.name,username:user.username,password:pw,className:access.className,courseName:access.courseName,role:user.role,appUrl:appBaseUrl(req),loginToken:user.login_token,kind:'reset'});
  await client.query('update users set password_hash=$1 where id=$2',[await bcrypt.hash(pw,12),user.id]);
  await sendWhatsAppText(user.whatsapp_number,message);
  await client.query('commit');
  res.set('Cache-Control','no-store');
  res.json({ok:true,delivery:'whatsapp'});
 }catch(e){
  try{await client.query('rollback')}catch{}
  console.error('Student password reset delivery failed',e);
  res.status(502).json({error:'We could not send a new password to WhatsApp. Your current password is still active. Please try again.'});
 }finally{client.release()}
});
app.post('/api/auth/logout',(req,res)=>{res.clearCookie('ff_session',{path:'/'});res.json({ok:true})});
app.get('/api/me',auth,(req,res)=>res.json({user:req.user}));

function normalizedProfilePhoto(value){
 if(typeof value!=='string')return null;
 const m=value.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
 if(!m)return null;
 let buf;try{buf=Buffer.from(m[1],'base64')}catch{return null}
 if(buf.length<500||buf.length>180000)return null;
 if(buf[0]!==0xff||buf[1]!==0xd8||buf[2]!==0xff)return null;
 return 'data:image/jpeg;base64,'+buf.toString('base64');
}
app.put('/api/student/profile-photo',auth,studentOnly,async(req,res)=>{
 const photo=normalizedProfilePhoto(req.body.photo);
 if(!photo)return res.status(400).json({error:'Choose a JPG, PNG, or WebP photo. EnglishGate will resize it automatically.'});
 await pool.query(`insert into profiles(user_id,profile_photo,profile_photo_updated_at) values($1,$2,now()) on conflict(user_id) do update set profile_photo=excluded.profile_photo,profile_photo_updated_at=now()`,[req.user.id,photo]);
 res.set('Cache-Control','no-store');
 res.json({ok:true,photoUrl:'/api/profile-photo/'+encodeURIComponent(req.user.id)});
});
app.get('/api/profile-photo/:studentId',auth,async(req,res)=>{
 const studentId=String(req.params.studentId||'');
 const q=await pool.query(`select p.profile_photo from profiles p join users u on u.id=p.user_id where p.user_id=$1 and u.role='student'`,[studentId]);
 if(!q.rowCount||!q.rows[0].profile_photo)return res.status(404).end();
 const photo=normalizedProfilePhoto(q.rows[0].profile_photo);
 if(!photo)return res.status(404).end();
 const base64=photo.slice(photo.indexOf(',')+1);
 res.set('Content-Type','image/jpeg');
 res.set('Cache-Control','private, no-store');
 res.send(Buffer.from(base64,'base64'));
});

app.put('/api/student/job-title',auth,studentOnly,async(req,res)=>{
 const jobTitle=String(req.body.jobTitle||'').trim().replace(/\s+/g,' ');
 if(jobTitle.length<2||jobTitle.length>50)return res.status(400).json({error:'Enter one job title, for example Doctor, Teacher, or Accountant.'});
 if(!/^[\p{L}\p{N} .&'’/-]+$/u.test(jobTitle))return res.status(400).json({error:'Use a simple job title, for example Doctor, Teacher, or Accountant.'});
 await pool.query(`insert into profiles(user_id,job_title) values($1,$2) on conflict(user_id) do update set job_title=excluded.job_title`,[req.user.id,jobTitle]);
 res.set('Cache-Control','no-store');
 res.json({ok:true,jobTitle});
});


async function classIdsFor(user){if(user.role==='admin'){const q=await pool.query('select id from classes order by created_at,name');return q.rows.map(r=>r.id)}if(user.role==='teacher'){const q=await pool.query('select id from classes where teacher_id=$1 order by created_at,name',[user.id]);return q.rows.map(r=>r.id)}const q=await pool.query('select class_id from enrollments where user_id=$1',[user.id]);return q.rows.map(r=>r.class_id)}

async function isListeningLocked(studentId,lessonId){const q=await pool.query(`select 1 from listening_locks where student_id=$1 and lesson_id=$2 union select 1 from completion where student_id=$1 and lesson_id=$2 and step='listening' limit 1`,[studentId,lessonId]);return q.rowCount>0}
app.get('/api/listening/:lessonId/prep',auth,studentOnly,async(req,res)=>{const lessonId=String(req.params.lessonId||'');const script=LISTENING_SCRIPTS[lessonId];if(!script)return res.status(404).json({error:'Listening topic not found.'});if(await isListeningLocked(req.user.id,lessonId))return res.json({locked:true});res.set('Cache-Control','no-store');res.json({locked:false,script})});
app.post('/api/listening/:lessonId/lock',auth,studentOnly,async(req,res)=>{const lessonId=String(req.params.lessonId||'');if(!LISTENING_SCRIPTS[lessonId])return res.status(404).json({error:'Listening topic not found.'});await pool.query('insert into listening_locks(student_id,lesson_id) values($1,$2) on conflict do nothing',[req.user.id,lessonId]);res.json({ok:true,locked:true})});

app.post('/api/audio',auth,async(req,res)=>{
 const lessonId=String(req.body.lessonId||'').trim();
 const input=String(req.body.text||'').trim();
 if(!lessonId||input.length<5||input.length>5000)return res.status(400).json({error:'Invalid listening audio request.'});
 if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:'Natural listening audio is unavailable.'});
 const key=crypto.createHash('sha256').update(lessonId+'|'+input).digest('hex');
 try{
  if(audioCache.has(key)){res.set('Content-Type','audio/mpeg');res.set('Cache-Control','private, max-age=3600');return res.send(audioCache.get(key))}
  const r=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:OPENAI_TTS_MODEL,voice:OPENAI_TTS_VOICE,input,instructions:'Speak in clear, warm, natural conversational English for an English learner. Use realistic pacing, meaningful pauses, and natural emphasis. Do not sound like an announcement or a robot.',response_format:'mp3'})});
  if(!r.ok){const detail=await r.text();console.error('OpenAI TTS error',r.status,detail.slice(0,500));return res.status(502).json({error:'Natural listening audio could not be generated.'})}
  const buf=Buffer.from(await r.arrayBuffer());audioCache.set(key,buf);res.set('Content-Type','audio/mpeg');res.set('Cache-Control','private, max-age=3600');return res.send(buf)
 }catch(e){console.error('TTS request error',e);return res.status(502).json({error:'Natural listening audio could not be generated.'})}
});

app.get('/api/audio/:lessonId',auth,async(req,res)=>{
 const lessonId=String(req.params.lessonId||'');
 const input=LISTENING_SCRIPTS[lessonId];
 if(!input)return res.status(404).json({error:'Listening topic not found.'});
 if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:'Natural listening audio is ready, but OPENAI_API_KEY has not yet been added to Railway.'});
 try{
  if(audioCache.has(lessonId)){res.set('Content-Type','audio/mpeg');res.set('Cache-Control','private, max-age=3600');return res.send(audioCache.get(lessonId))}
  const r=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:OPENAI_TTS_MODEL,voice:OPENAI_TTS_VOICE,input,instructions:'Speak in clear, warm, natural conversational English for an A2+ to B1 adult learner. Use realistic pacing, meaningful pauses between ideas, and natural emphasis. Do not sound like an announcement or a robot.',response_format:'mp3'})});
  if(!r.ok){const detail=await r.text();console.error('OpenAI TTS error',r.status,detail.slice(0,500));return res.status(502).json({error:'Natural listening audio could not be generated.'})}
  const buf=Buffer.from(await r.arrayBuffer());audioCache.set(lessonId,buf);res.set('Content-Type','audio/mpeg');res.set('Cache-Control','private, max-age=3600');res.send(buf)
 }catch(e){console.error('TTS request error',e);res.status(502).json({error:'Natural listening audio could not be generated.'})}
});

app.get('/api/state',auth,async(req,res)=>{
 const classIds=await classIdsFor(req.user);
 const classes=req.user.role==='admin'
  ?(await pool.query('select * from classes order by created_at,name')).rows
  :(classIds.length?(await pool.query('select * from classes where id=any($1::text[]) order by created_at,name',[classIds])).rows:[]);
 let users=[];
 if(req.user.role==='admin'){
  users=(await pool.query(`select u.id,u.username,u.role,u.name,u.whatsapp_number,coalesce(array_remove(array_agg(distinct e.class_id),null),'{}'::text[]) as class_ids from users u left join enrollments e on e.user_id=u.id group by u.id,u.username,u.role,u.name order by case u.role when 'admin' then 1 when 'teacher' then 2 else 3 end,u.name`)).rows;
 }else if(classIds.length){
  users=(await pool.query(`select u.id,u.username,u.role,u.name,u.whatsapp_number,coalesce(array_remove(array_agg(distinct e.class_id),null),'{}'::text[]) as class_ids from users u left join enrollments e on e.user_id=u.id where u.id=$2 or e.class_id=any($1::text[]) group by u.id,u.username,u.role,u.name order by u.role desc,u.name`,[classIds,req.user.id])).rows;
 }else{
  users=(await pool.query("select id,username,role,name,whatsapp_number,'{}'::text[] as class_ids from users where id=$1",[req.user.id])).rows;
 }
 users=users.map(u=>({id:u.id,username:u.username,role:u.role,name:u.name,whatsappNumber:u.whatsapp_number||null,classIds:u.class_ids||[]}));
 const studentIds=users.filter(u=>u.role==='student').map(u=>u.id);
 const ownStudent=req.user.role==='student'?[req.user.id]:studentIds;
 const profileIds=req.user.role==='student'?[req.user.id]:studentIds;
 const profRows=profileIds.length?(await pool.query('select user_id,points,base,(profile_photo is not null) as has_photo,job_title from profiles where user_id=any($1::text[])',[profileIds])).rows:[];
 const profiles={};profRows.forEach(p=>profiles[p.user_id]={points:p.points,base:p.base,hasPhoto:Boolean(p.has_photo),photoUrl:p.has_photo?'/api/profile-photo/'+encodeURIComponent(p.user_id):null,jobTitle:p.job_title||''});
 const evidenceIds=req.user.role==='admin'?studentIds:ownStudent;
 const atRows=evidenceIds.length?(await pool.query('select id,student_id,lesson_id,skill,score,tags,at from attempts where student_id=any($1::text[]) order by at',[evidenceIds])).rows:[];
 const cRows=evidenceIds.length?(await pool.query('select student_id,lesson_id,step from completion where student_id=any($1::text[])',[evidenceIds])).rows:[];
 const wRows=evidenceIds.length?(await pool.query('select student_id,lesson_id,content,score from writing_samples where student_id=any($1::text[])',[evidenceIds])).rows:[];
 const lockRows=evidenceIds.length?(await pool.query('select student_id,lesson_id from listening_locks where student_id=any($1::text[])',[evidenceIds])).rows:[];
 const completion={},writing={},writingScores={},listeningLocks={};
 cRows.forEach(x=>{completion[x.student_id]??={};completion[x.student_id][x.lesson_id]??=[];completion[x.student_id][x.lesson_id].push(x.step)});
 wRows.forEach(x=>{writing[x.student_id]??={};writing[x.student_id][x.lesson_id]=x.content;writingScores[x.student_id]??={};writingScores[x.student_id][x.lesson_id]=x.score});
 lockRows.forEach(x=>{listeningLocks[x.student_id]??=[];listeningLocks[x.student_id].push(x.lesson_id)});
 const bookRows=(await pool.query('select id,title,level,audience,status,total_lessons,activity_model from books order by case status when \'pilot\' then 1 when \'ready\' then 2 else 3 end,title')).rows;
 const assignmentRows=classIds.length?(await pool.query('select id,class_id,book_id,lesson_id,lesson_number,lesson_title,skills,created_at from assignments where class_id=any($1::text[]) order by created_at desc',[classIds])).rows:[];
 const teacherContextRow=req.user.role==='teacher'?(await pool.query('select class_id,lesson_number,section_index,updated_at from teacher_contexts where teacher_id=$1',[req.user.id])).rows[0]:null;
 const teacherContext=teacherContextRow?{classId:teacherContextRow.class_id,lessonNumber:teacherContextRow.lesson_number,sectionIndex:teacherContextRow.section_index,updatedAt:teacherContextRow.updated_at}:null;
 res.json({version:9,assignments:assignmentRows.map(a=>({id:a.id,classId:a.class_id,bookId:a.book_id,lessonId:a.lesson_id,lessonNumber:a.lesson_number,lessonTitle:a.lesson_title,skills:a.skills,createdAt:a.created_at})),books:bookRows.map(b=>({id:b.id,title:b.title,level:b.level,audience:b.audience,status:b.status,totalLessons:b.total_lessons,activityModel:b.activity_model})),users,classes:classes.map(c=>({...c,bookId:c.course_id})),profiles,attempts:atRows.map(a=>({id:String(a.id),studentId:a.student_id,lessonId:a.lesson_id,skill:a.skill,score:a.score,tags:a.tags,at:a.at})),completion,writing,writingScores,listeningLocks,teacherContext});
});

app.get('/api/leaderboard',auth,async(req,res)=>{
 const rows=(await pool.query(`
  select u.id,u.name,(p.profile_photo is not null) as has_photo,p.job_title,
         coalesce(cls.name,'') as class_name,
         coalesce(cls.level,'') as level,
         coalesce(cls.book_title,'Workbook') as book_title,
         coalesce(cls.total_lessons,22)::int as total_lessons,
         coalesce(comp.completed,0)::int as completed,
         coalesce(perf.scored,0)::int as scored,
         perf.average,
         perf.last_active
  from users u
  left join profiles p on p.user_id=u.id
  left join lateral (
    select c.name,c.level,b.title as book_title,coalesce(b.total_lessons,22) as total_lessons
    from enrollments e
    join classes c on c.id=e.class_id
    left join books b on b.id=c.course_id
    where e.user_id=u.id
    order by c.created_at desc nulls last,c.name
    limit 1
  ) cls on true
  left join lateral (
    select count(*)::int as completed
    from completion c
    where c.student_id=u.id and c.step in ('vocabulary','listening','grammar','writing')
  ) comp on true
  left join lateral (
    select round(avg(latest.score)::numeric,0)::int as average,count(*)::int as scored,max(latest.at) as last_active
    from (
      select distinct on (a.lesson_id,a.skill) a.lesson_id,a.skill,a.score,a.at
      from attempts a
      where a.student_id=u.id and a.skill in ('vocabulary','listening','grammar','writing')
      order by a.lesson_id,a.skill,a.at desc
    ) latest
  ) perf on true
  where u.role='student'
 `)).rows;
 const students=rows.map(r=>{
  const completed=Number(r.completed||0),average=r.average===null||r.average===undefined?null:Number(r.average),scored=Number(r.scored||0),total=Math.max(1,Number(r.total_lessons||22)*4),completion=Math.min(100,Math.round(completed/total*100)),practice=Math.min(100,scored*8),score=Math.round((Number.isFinite(average)?average:0)*0.45+completion*0.35+practice*0.2);
  return {
  id:r.id,
  name:r.name,
  photoUrl:r.has_photo?'/api/profile-photo/'+encodeURIComponent(r.id):null,
  jobTitle:r.job_title||'',
  className:r.class_name||'',
  level:r.level||'',
  bookTitle:r.book_title||'Workbook',
  completed,
  scored,
  completion,
  practice,
  score,
  average,
  lastActive:r.last_active||null,
  rank:0
 }}).sort((a,b)=>b.score-a.score||b.completion-a.completion||b.completed-a.completed||b.scored-a.scored||String(a.name).localeCompare(String(b.name)));
 students.forEach((s,i)=>s.rank=i+1);
 res.set('Cache-Control','no-store');
 res.json({students,rankingMethod:'45% recorded activity average, 35% workbook completion, 20% practice consistency'});
});

app.post('/api/attempts',auth,studentOnly,async(req,res)=>{const {lessonId,skill,score,tags=[]}=req.body;if(!lessonId||!['vocabulary','grammar','listening','writing'].includes(skill)||!Number.isInteger(score)||score<0||score>100)return res.status(400).json({error:'Invalid attempt.'});await pool.query('insert into attempts(student_id,lesson_id,skill,score,tags) values($1,$2,$3,$4,$5)',[req.user.id,lessonId,skill,score,Array.isArray(tags)?tags.slice(0,10):[]]);await pool.query('update profiles set points=points+$1 where user_id=$2',[score>=70?8:2,req.user.id]);res.json({ok:true})});
app.post('/api/completion',auth,studentOnly,async(req,res)=>{const {lessonId,step}=req.body;if(!lessonId||!['vocabulary','listening','grammar','writing','review'].includes(step))return res.status(400).json({error:'Invalid completion step.'});const r=await pool.query('insert into completion(student_id,lesson_id,step) values($1,$2,$3) on conflict do nothing returning step',[req.user.id,lessonId,step]);if(r.rowCount)await pool.query('update profiles set points=points+10 where user_id=$1',[req.user.id]);res.json({ok:true})});
app.put('/api/writing/:lessonId',auth,studentOnly,async(req,res)=>{const content=String(req.body.content||'').trim();if(content.length<20)return res.status(400).json({error:'Invalid writing sample.'});await pool.query(`insert into writing_samples(student_id,lesson_id,content,score) values($1,$2,$3,null) on conflict(student_id,lesson_id) do update set content=excluded.content,score=null,updated_at=now()`,[req.user.id,req.params.lessonId,content]);await pool.query(`delete from attempts where student_id=$1 and lesson_id=$2 and skill='writing' and tags @> array['teacher:graded']::text[]`,[req.user.id,req.params.lessonId]);const done=await pool.query('insert into completion(student_id,lesson_id,step) values($1,$2,$3) on conflict do nothing returning step',[req.user.id,req.params.lessonId,'writing']);res.json({ok:true,completed:Boolean(done.rowCount)})});
app.post('/api/teacher/writing/:studentId/:lessonId/grade',auth,teacherOnly,async(req,res)=>{const rawScore=req.body.score,score=Number(rawScore),studentId=String(req.params.studentId||''),lessonId=String(req.params.lessonId||'');if(rawScore===''||rawScore===null||rawScore===undefined||!Number.isInteger(score)||score<0||score>100)return res.status(400).json({error:'Enter a whole-number grade from 0 to 100.'});const owns=await pool.query(`select 1 from enrollments es join classes c on c.id=es.class_id where es.user_id=$1 and c.teacher_id=$2`,[studentId,req.user.id]);if(!owns.rowCount)return res.status(404).json({error:'Student not found in your classes.'});const sample=await pool.query('select 1 from writing_samples where student_id=$1 and lesson_id=$2',[studentId,lessonId]);if(!sample.rowCount)return res.status(404).json({error:'Writing submission not found.'});const client=await pool.connect();try{await client.query('begin');await client.query('update writing_samples set score=$1,updated_at=now() where student_id=$2 and lesson_id=$3',[score,studentId,lessonId]);await client.query(`delete from attempts where student_id=$1 and lesson_id=$2 and skill='writing' and tags @> array['teacher:graded']::text[]`,[studentId,lessonId]);await client.query(`insert into attempts(student_id,lesson_id,skill,score,tags) values($1,$2,'writing',$3,array['teacher:graded','writing:final-assessment'])`,[studentId,lessonId,score]);await client.query('commit');res.json({ok:true,score})}catch(e){await client.query('rollback');throw e}finally{client.release()}});

app.post('/api/admin/teachers',auth,adminOnly,async(req,res)=>{
 const name=String(req.body.name||'').trim(),username=String(req.body.username||'').trim().toLowerCase();
 const whatsappNumber=normalizeWhatsapp(req.body.whatsappNumber);if(!whatsappNumber)return res.status(400).json({error:'Enter a WhatsApp number with country code, for example +252 63 1234567.'});
 if(name.length<2||!/^[a-z0-9._-]{3,32}$/.test(username))return res.status(400).json({error:'Use a valid name and a 3–32 character username.'});
 const passwordWasGenerated=req.body.password===undefined||req.body.password===null||req.body.password==='';
 const pw=chosenPassword(req.body.password);if(!pw)return res.status(400).json({error:'Password must contain numbers only and be 8–20 digits long.'});
 const exists=await pool.query('select 1 from users where lower(username)=lower($1)',[username]);if(exists.rowCount)return res.status(409).json({error:'That username already exists.'});
 const id='t_'+crypto.randomUUID();await pool.query('insert into users(id,username,password_hash,role,name,whatsapp_number) values($1,$2,$3,$4,$5,$6)',[id,username,await bcrypt.hash(pw,12),'teacher',name,whatsappNumber]);
 const message=accountAccessMessage({name,username,password:pw,className:'Teacher account',courseName:'EnglishGate Workbook',role:'teacher',appUrl:appBaseUrl(req)});
 res.status(201).json({id,username,temporaryPassword:pw,passwordWasGenerated,whatsappNumber,className:'Teacher account',courseName:'EnglishGate Workbook',whatsappMessage:message,whatsappLink:whatsappHref(whatsappNumber,message)});
});
app.post('/api/admin/classes',auth,adminOnly,async(req,res)=>{
 const name=String(req.body.name||'').trim(),teacherId=String(req.body.teacherId||'').trim(),bookId=String(req.body.bookId||'').trim();
 if(name.length<2)return res.status(400).json({error:'Class name is required.'});
 const t=await pool.query("select id from users where id=$1 and role='teacher'",[teacherId]);if(!t.rowCount)return res.status(400).json({error:'Choose a valid teacher.'});
 const b=await pool.query("select id,title,level,status from books where id=$1",[bookId]);if(!b.rowCount)return res.status(400).json({error:'Choose a valid book.'});
 if(!['ready','pilot'].includes(b.rows[0].status))return res.status(400).json({error:'That book is not ready for classes yet.'});
 const id='c_'+crypto.randomUUID();await pool.query('insert into classes(id,name,level,course_id,teacher_id) values($1,$2,$3,$4,$5)',[id,name,b.rows[0].level,bookId,teacherId]);
 await pool.query('insert into enrollments(class_id,user_id) values($1,$2) on conflict do nothing',[id,teacherId]);
 res.status(201).json({id,name,level:b.rows[0].level,bookId,teacherId});
});
app.patch('/api/admin/classes/:id/book',auth,adminOnly,async(req,res)=>{
 const classId=String(req.params.id||'').trim(),bookId=String(req.body.bookId||'').trim();
 const b=await pool.query("select id,title,level,status from books where id=$1",[bookId]);if(!b.rowCount)return res.status(400).json({error:'Choose a valid book.'});
 if(!['ready','pilot'].includes(b.rows[0].status))return res.status(400).json({error:'That book is not ready for classes yet.'});
 const client=await pool.connect();try{await client.query('begin');const c=await client.query('update classes set course_id=$1,level=$2 where id=$3 returning id,name',[bookId,b.rows[0].level,classId]);if(!c.rowCount){await client.query('rollback');return res.status(404).json({error:'Class not found.'});}await client.query('delete from assignments where class_id=$1',[classId]);await client.query('commit');res.json({ok:true,classId,bookId,bookTitle:b.rows[0].title,level:b.rows[0].level});}catch(e){await client.query('rollback');throw e}finally{client.release()}
});
app.delete('/api/admin/books/:id',auth,adminOnly,async(req,res)=>{
 const client=await pool.connect();try{await client.query('begin');const b=await client.query('select id,title from books where id=$1 for update',[req.params.id]);if(!b.rowCount){await client.query('rollback');return res.status(404).json({error:'Book not found.'});}const cls=await client.query('select count(*)::int as count from classes where course_id=$1',[req.params.id]);if(Number(cls.rows[0]?.count||0)>0){await client.query('rollback');return res.status(400).json({error:'Delete or move classes using this book before deleting the book.'});}await client.query('delete from assignments where book_id=$1',[req.params.id]);await client.query('delete from books where id=$1',[req.params.id]);await client.query('insert into deleted_seed_books(id) values($1) on conflict(id) do nothing',[req.params.id]);await client.query('commit');res.json({ok:true,id:b.rows[0].id,title:b.rows[0].title});}catch(e){await client.query('rollback');throw e}finally{client.release()}
});
function normalizeWhatsapp(value){
 if(typeof value!=='string'||value.length>40)return null;
 const number=value.trim().replace(/[\s().-]/g,'').replace(/^00/,'+');
 return /^\+[1-9]\d{7,14}$/.test(number)?number:null;
}
function appBaseUrl(req){const proto=req.get('x-forwarded-proto')||req.protocol,host=req.get('x-forwarded-host')||req.get('host');return process.env.PUBLIC_APP_URL||`${proto}://${host}`}
function whatsappHref(number,message){return `https://wa.me/${number.replace(/\D/g,'')}?text=${encodeURIComponent(message)}`}
function personalLoginUrl(appUrl,loginToken){return loginToken?`${String(appUrl).replace(/\/$/,'')}/?access=${encodeURIComponent(loginToken)}`:appUrl}
async function sendWhatsAppText(number,message){
 const endpoint=String(process.env.WHATSAPP_SENDER_URL||'').replace(/\/$/,'');
 const apiKey=String(process.env.WHATSAPP_SENDER_API_KEY||'');
 if(!endpoint||!apiKey)throw new Error('WhatsApp delivery is not configured');
 const r=await fetch(endpoint+'/api/send-text',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey},body:JSON.stringify({recipient:number,message})});
 if(!r.ok){let detail='';try{detail=String((await r.json())?.error||'')}catch{}throw new Error(detail||`WhatsApp delivery failed (${r.status})`)}
 return r.json();
}
function accountAccessMessage({name,username,password,className,courseName,role,appUrl,loginToken=null,kind='welcome'}){
 const greeting=kind==='reset'?'Your EnglishGate password has been reset.':'Welcome to EnglishGate.';
 const lines=[`${greeting} ${name}`,`Role: ${role==='teacher'?'Teacher':'Student'}`];
 if(className)lines.push(`Class: ${className}`);
 if(courseName)lines.push(`Course: ${courseName}`);
 const signInUrl=role==='student'&&loginToken?personalLoginUrl(appUrl,loginToken):appUrl;
 lines.push(`Username: ${username}`,`Password: ${password}`,`Sign in: ${signInUrl}`);
 return lines.join('\n');
}
async function accountAccessContext(user){
 if(user.role==='student'){
  const q=await pool.query(`select c.name as class_name,c.level,b.title as course_name from enrollments e join classes c on c.id=e.class_id left join books b on b.id=c.course_id where e.user_id=$1 order by c.created_at desc nulls last,c.name limit 1`,[user.id]);
  const row=q.rows[0]||{};
  return {className:row.class_name||'Not assigned',courseName:row.course_name||row.level||'EnglishGate Workbook'};
 }
 if(user.role==='teacher'){
  const q=await pool.query(`select string_agg(c.name, ', ' order by c.name) as class_name,string_agg(distinct coalesce(b.title,c.level), ', ') as course_name from classes c left join books b on b.id=c.course_id where c.teacher_id=$1`,[user.id]);
  const row=q.rows[0]||{};
  return {className:row.class_name||'Teacher classes',courseName:row.course_name||'EnglishGate Workbook'};
 }
 return {className:null,courseName:null};
}
app.post('/api/admin/students',auth,adminOnly,async(req,res)=>{
 const whatsappNumber=normalizeWhatsapp(req.body.whatsappNumber);if(!whatsappNumber)return res.status(400).json({error:'Enter a WhatsApp number with country code, for example +252 63 1234567.'});const name=String(req.body.name||'').trim(),username=String(req.body.username||'').trim().toLowerCase(),classId=String(req.body.classId||'').trim();
 if(name.length<2||!/^[a-z0-9._-]{3,32}$/.test(username))return res.status(400).json({error:'Use a valid name and a 3–32 character username.'});
 const passwordWasGenerated=req.body.password===undefined||req.body.password===null||req.body.password==='';
 const pw=chosenPassword(req.body.password);if(!pw)return res.status(400).json({error:'Password must contain numbers only and be 8–20 digits long.'});
 const c=await pool.query('select c.id,c.name,c.level,b.title as course_name from classes c left join books b on b.id=c.course_id where c.id=$1',[classId]);if(!c.rowCount)return res.status(400).json({error:'Choose a valid class.'});
 const exists=await pool.query('select 1 from users where lower(username)=lower($1)',[username]);if(exists.rowCount)return res.status(409).json({error:'That username already exists.'});
 const id='s_'+crypto.randomUUID(),accessToken=newLoginToken(),client=await pool.connect();try{await client.query('begin');await client.query('insert into users(id,username,password_hash,role,name,whatsapp_number,login_token) values($1,$2,$3,$4,$5,$6,$7)',[id,username,await bcrypt.hash(pw,12),'student',name,whatsappNumber,accessToken]);await client.query('insert into profiles(user_id) values($1)',[id]);await client.query('insert into enrollments(class_id,user_id) values($1,$2)',[classId,id]);await client.query('commit');const classInfo=c.rows[0],courseName=classInfo.course_name||classInfo.level||'EnglishGate Workbook',message=accountAccessMessage({name,username,password:pw,className:classInfo.name,courseName,role:'student',appUrl:appBaseUrl(req),loginToken:accessToken});res.status(201).json({id,username,temporaryPassword:pw,passwordWasGenerated,whatsappNumber,className:classInfo.name,courseName,personalLoginUrl:personalLoginUrl(appBaseUrl(req),accessToken),whatsappMessage:message,whatsappLink:whatsappHref(whatsappNumber,message)})}catch(e){await client.query('rollback');throw e}finally{client.release()}
});
async function transferStudent(req,res,isAdmin){
 const studentId=String(req.params.id||'').trim(),classId=String(req.body.classId||'').trim();
 if(!studentId||!classId)return res.status(400).json({error:'Choose a student and destination class.'});
 const student=await pool.query("select id,name from users where id=$1 and role='student'",[studentId]);if(!student.rowCount)return res.status(404).json({error:'Student not found.'});
 let target;
 if(isAdmin){
  target=await pool.query('select id,name from classes where id=$1',[classId]);if(!target.rowCount)return res.status(400).json({error:'Choose a valid class.'});
 }else{
  const ownsStudent=await pool.query(`select 1 from enrollments e join classes c on c.id=e.class_id where e.user_id=$1 and c.teacher_id=$2`,[studentId,req.user.id]);if(!ownsStudent.rowCount)return res.status(404).json({error:'Student not found in your classes.'});
  target=await pool.query('select id,name from classes where id=$1 and teacher_id=$2',[classId,req.user.id]);if(!target.rowCount)return res.status(403).json({error:'You can only transfer students to your own classes.'});
 }
 const client=await pool.connect();try{await client.query('begin');if(isAdmin){await client.query('delete from enrollments where user_id=$1',[studentId]);}else{await client.query('delete from enrollments where user_id=$1 and class_id in (select id from classes where teacher_id=$2)',[studentId,req.user.id]);}await client.query('insert into enrollments(class_id,user_id) values($1,$2) on conflict do nothing',[classId,studentId]);await client.query('commit');res.json({ok:true,studentId,classId,className:target.rows[0].name});}catch(e){await client.query('rollback');throw e}finally{client.release()}
}
app.patch('/api/admin/students/:id/class',auth,adminOnly,(req,res)=>transferStudent(req,res,true));
app.post('/api/admin/users/:id/reset-password',auth,adminOnly,async(req,res)=>{
 const q=await pool.query("select id,username,role,name,whatsapp_number,login_token from users where id=$1 and role in ('teacher','student')",[req.params.id]);if(!q.rowCount)return res.status(404).json({error:'User not found.'});
 const pw=chosenPassword(req.body?.password);if(!pw)return res.status(400).json({error:'Password must contain 8–20 digits.'});
 await pool.query('update users set password_hash=$1 where id=$2',[await bcrypt.hash(pw,12),req.params.id]);
 const user=q.rows[0],access=await accountAccessContext(user),message=user.whatsapp_number?accountAccessMessage({name:user.name,username:user.username,password:pw,className:access.className,courseName:access.courseName,role:user.role,appUrl:appBaseUrl(req),loginToken:user.login_token,kind:'reset'}):null;
 res.json({password:pw,temporaryPassword:pw,generated:!req.body?.password,username:user.username,whatsappNumber:user.whatsapp_number||null,className:access.className,courseName:access.courseName,whatsappMessage:message,whatsappLink:message?whatsappHref(user.whatsapp_number,message):null});
});
app.delete('/api/admin/users/:id',auth,adminOnly,async(req,res)=>{
 const client=await pool.connect();try{await client.query('begin');const q=await client.query("select id,username,role,name from users where id=$1 and role in ('admin','teacher','student') for update",[req.params.id]);if(!q.rowCount){await client.query('rollback');return res.status(404).json({error:'User not found.'});}const user=q.rows[0];if(user.id===req.user.id){await client.query('rollback');return res.status(400).json({error:'You cannot delete the account you are currently using.'});}if(user.role==='admin'){const admins=await client.query("select count(*)::int as count from users where role='admin'");if(Number(admins.rows[0]?.count||0)<=1){await client.query('rollback');return res.status(400).json({error:'At least one admin account must remain.'});}}await client.query('insert into deleted_seed_accounts(username) values($1) on conflict(username) do nothing',[user.username.toLowerCase()]);let unassignedClasses=0;if(user.role==='teacher'){const classes=await client.query('update classes set teacher_id=null where teacher_id=$1',[user.id]);unassignedClasses=classes.rowCount;}await client.query('update assignments set created_by=null where created_by=$1',[user.id]);await client.query('delete from users where id=$1',[user.id]);await client.query('commit');res.json({ok:true,id:user.id,name:user.name,role:user.role,unassignedClasses});}catch(e){await client.query('rollback');throw e}finally{client.release()}
});

app.delete('/api/admin/classes/:id',auth,adminOnly,async(req,res)=>{
 const client=await pool.connect();try{await client.query('begin');const q=await client.query('delete from classes where id=$1 returning id,name',[req.params.id]);if(!q.rowCount){await client.query('rollback');return res.status(404).json({error:'Class not found.'});}await client.query('insert into deleted_seed_classes(id) values($1) on conflict(id) do nothing',[q.rows[0].id]);await client.query('commit');res.json({ok:true,id:q.rows[0].id,name:q.rows[0].name});}catch(e){await client.query('rollback');throw e}finally{client.release()}
});

app.post('/api/teacher/students',auth,teacherOnly,async(req,res)=>{
 const whatsappNumber=normalizeWhatsapp(req.body.whatsappNumber);if(!whatsappNumber)return res.status(400).json({error:'Enter a WhatsApp number with country code, for example +252 63 1234567.'});
 const name=String(req.body.name||'').trim(),username=String(req.body.username||'').trim().toLowerCase(),classId=String(req.body.classId||'').trim();
 if(name.length<2||!/^[a-z0-9._-]{3,32}$/.test(username))return res.status(400).json({error:'Use a valid name and a 3–32 character username.'});
 const owns=await pool.query('select c.id,c.name,c.level,b.title as course_name from classes c left join books b on b.id=c.course_id where c.id=$1 and c.teacher_id=$2',[classId,req.user.id]);if(!owns.rowCount)return res.status(403).json({error:'You cannot add students to this class.'});
 const exists=await pool.query('select 1 from users where lower(username)=lower($1)',[username]);if(exists.rowCount)return res.status(409).json({error:'That username already exists.'});
 const id='s_'+crypto.randomUUID(),pw=tempPassword(),accessToken=newLoginToken(),client=await pool.connect();
 try{await client.query('begin');await client.query('insert into users(id,username,password_hash,role,name,whatsapp_number,login_token) values($1,$2,$3,$4,$5,$6,$7)',[id,username,await bcrypt.hash(pw,12),'student',name,whatsappNumber,accessToken]);await client.query('insert into profiles(user_id) values($1)',[id]);await client.query('insert into enrollments(class_id,user_id) values($1,$2)',[classId,id]);await client.query('commit');const classInfo=owns.rows[0],courseName=classInfo.course_name||classInfo.level||'EnglishGate Workbook',message=accountAccessMessage({name,username,password:pw,className:classInfo.name,courseName,role:'student',appUrl:appBaseUrl(req),loginToken:accessToken});res.status(201).json({id,username,temporaryPassword:pw,passwordWasGenerated:true,whatsappNumber,className:classInfo.name,courseName,personalLoginUrl:personalLoginUrl(appBaseUrl(req),accessToken),whatsappMessage:message,whatsappLink:whatsappHref(whatsappNumber,message)})}catch(e){await client.query('rollback');throw e}finally{client.release()}
});
app.patch('/api/teacher/students/:id/class',auth,teacherOnly,(req,res)=>transferStudent(req,res,false));
app.put('/api/teacher/context',auth,teacherOnly,async(req,res)=>{
 const classId=String(req.body.classId||'').trim(),lessonNumber=Number(req.body.lessonNumber),sectionIndex=Number(req.body.sectionIndex);
 if(!classId||!Number.isInteger(lessonNumber)||lessonNumber<1||lessonNumber>500||!Number.isInteger(sectionIndex)||sectionIndex<0||sectionIndex>100)return res.status(400).json({error:'Invalid teacher context.'});
 const owns=await pool.query('select 1 from classes where id=$1 and teacher_id=$2',[classId,req.user.id]);
 if(!owns.rowCount)return res.status(403).json({error:'You cannot save progress for this class.'});
 const q=await pool.query(`insert into teacher_contexts(teacher_id,class_id,lesson_number,section_index,updated_at) values($1,$2,$3,$4,now())
  on conflict(teacher_id) do update set class_id=excluded.class_id,lesson_number=excluded.lesson_number,section_index=excluded.section_index,updated_at=now()
  returning class_id,lesson_number,section_index,updated_at`,[req.user.id,classId,lessonNumber,sectionIndex]);
 const row=q.rows[0];
 res.json({ok:true,teacherContext:{classId:row.class_id,lessonNumber:row.lesson_number,sectionIndex:row.section_index,updatedAt:row.updated_at}});
});

app.post('/api/teacher/assignments',auth,teacherOnly,async(req,res)=>{
 const classId=String(req.body.classId||'').trim(),bookId=String(req.body.bookId||'').trim(),lessonId=String(req.body.lessonId||'').trim(),lessonTitle=String(req.body.lessonTitle||'').trim(),lessonNumber=Number(req.body.lessonNumber),allowed=['vocabulary','listening','grammar','writing'],skills=Array.isArray(req.body.skills)?req.body.skills.filter(x=>allowed.includes(x)):[];
 if(!classId||!bookId||!lessonId||!lessonTitle||!Number.isInteger(lessonNumber)||lessonNumber<1||skills.length<1)return res.status(400).json({error:'Invalid workbook assignment.'});
 const owns=await pool.query('select id,course_id from classes where id=$1 and teacher_id=$2',[classId,req.user.id]);
 if(!owns.rowCount)return res.status(403).json({error:'You cannot assign work to this class.'});
 if(owns.rows[0].course_id!==bookId)return res.status(400).json({error:'The lesson book does not match this class.'});
 const id='as_'+crypto.randomUUID();
 await pool.query('insert into assignments(id,class_id,book_id,lesson_id,lesson_number,lesson_title,skills,created_by) values($1,$2,$3,$4,$5,$6,$7,$8)',[id,classId,bookId,lessonId,lessonNumber,lessonTitle,[...new Set(skills)],req.user.id]);
 res.status(201).json({id,classId,bookId,lessonId,lessonNumber,lessonTitle,skills:[...new Set(skills)]});
});
app.post('/api/teacher/students/:id/reset-password',auth,teacherOnly,async(req,res)=>{
 const owns=await pool.query(`select 1 from enrollments es join classes c on c.id=es.class_id where es.user_id=$1 and c.teacher_id=$2`,[req.params.id,req.user.id]);
 if(!owns.rowCount)return res.status(404).json({error:'Student not found in your classes.'});
 const pw=chosenPassword(req.body?.password);if(!pw)return res.status(400).json({error:'Password must contain 8–20 digits.'});
 const updated=await pool.query('update users set password_hash=$1 where id=$2 and role=$3 returning id',[await bcrypt.hash(pw,12),req.params.id,'student']);
 if(!updated.rowCount)return res.status(404).json({error:'Student not found.'});
 res.json({password:pw,temporaryPassword:pw,generated:!req.body?.password});
});

app.use('/assets',express.static(path.join(__dirname,'public','assets')));
const sendFreshFile=(res,file,type)=>{res.set('Cache-Control','no-store, no-cache, must-revalidate');if(type)res.type(type);return res.sendFile(path.join(__dirname,'public',file))};
app.get('/lesson-visuals.js',(req,res)=>sendFreshFile(res,'lesson-visuals.js','application/javascript'));
app.get('/core-activities.js',(req,res)=>sendFreshFile(res,'core-activities.js','application/javascript'));
app.get('/styles.css',(req,res)=>sendFreshFile(res,'styles.css'));
app.get('/app.js',(req,res)=>sendFreshFile(res,'app.js','application/javascript'));
app.get('/live-books.js',(req,res)=>sendFreshFile(res,'live-books.js','application/javascript'));
app.get('/speakup-b2-blueprint.js',(req,res)=>sendFreshFile(res,'speakup-b2-blueprint.js','application/javascript'));
app.get('/live-books.json',(req,res)=>sendFreshFile(res,'live-books.json','application/json'));
app.get('/',(req,res)=>sendFreshFile(res,'index.html'));
app.use((req,res)=>{if(req.path.startsWith('/api/'))return res.status(404).json({error:'Not found'});res.sendFile(path.join(__dirname,'public','index.html'))});
app.use((err,req,res,next)=>{console.error('request error',err);if(res.headersSent)return next(err);res.status(500).json({error:'Server error'})});

async function authSelfCheck(){for(const [username,password,label,deletable] of [[process.env.SYSTEM_ADMIN_USERNAME||'admin',process.env.SYSTEM_ADMIN_PASSWORD,'system admin',true],[process.env.TEACHER_USERNAME||'teacher',process.env.TEACHER_PASSWORD,'teacher',true],[process.env.DEMO_STUDENT_USERNAME,process.env.DEMO_STUDENT_PASSWORD,'demo student',true]]){if(!username||!password)continue;if(deletable&&(await pool.query('select 1 from deleted_seed_accounts where lower(username)=lower($1)',[username])).rowCount)continue;const q=await pool.query('select password_hash from users where lower(username)=lower($1)',[username]);if(!q.rowCount||!(await bcrypt.compare(password,q.rows[0].password_hash)))throw new Error(`Auth self-check failed for ${label}`);console.log(`Auth self-check passed for ${label}`)}}
initDb().then(authSelfCheck).then(()=>app.listen(port,()=>console.log(`Fluency First listening on ${port}`))).catch(e=>{console.error(e);process.exit(1)});
