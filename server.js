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
app.set('trust proxy',1);
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:'256kb'}));
app.use(cookieParser());

const loginLimiter=rateLimit({windowMs:10*60*1000,max:20,standardHeaders:true,legacyHeaders:false});
function tokenFor(u){return jwt.sign({id:u.id,role:u.role,username:u.username,name:u.name},JWT_SECRET,{expiresIn:'12h'})}
function setSession(res,u){res.cookie('ff_session',tokenFor(u),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:12*60*60*1000,path:'/'})}
function auth(req,res,next){try{req.user=jwt.verify(req.cookies.ff_session||'',JWT_SECRET);next()}catch{return res.status(401).json({error:'Please sign in again.'})}}
function teacherOnly(req,res,next){if(req.user.role!=='teacher')return res.status(403).json({error:'Teacher access required.'});next()}
function studentOnly(req,res,next){if(req.user.role!=='student')return res.status(403).json({error:'Student access required.'});next()}
function tempPassword(){return 'FF-'+crypto.randomBytes(5).toString('base64url')}

async function initDb(){
 await pool.query(`create table if not exists users(id text primary key,username text unique not null,password_hash text not null,role text not null check(role in ('teacher','student')),name text not null,created_at timestamptz default now());
 create table if not exists classes(id text primary key,name text not null,level text not null,course_id text not null,teacher_id text references users(id),created_at timestamptz default now());
 create table if not exists enrollments(class_id text references classes(id) on delete cascade,user_id text references users(id) on delete cascade,primary key(class_id,user_id));
 create table if not exists profiles(user_id text primary key references users(id) on delete cascade,points int not null default 0,base jsonb not null default '{"vocabulary":60,"grammar":60,"listening":60,"writing":60}');
 create table if not exists attempts(id bigserial primary key,student_id text references users(id) on delete cascade,lesson_id text not null,skill text not null,score int not null check(score between 0 and 100),tags text[] not null default '{}',at timestamptz default now());
 create table if not exists completion(student_id text references users(id) on delete cascade,lesson_id text not null,step text not null,completed_at timestamptz default now(),primary key(student_id,lesson_id,step));
 create table if not exists writing_samples(student_id text references users(id) on delete cascade,lesson_id text not null,content text not null,score int not null check(score between 0 and 100),updated_at timestamptz default now(),primary key(student_id,lesson_id));`);
 const tUser=process.env.TEACHER_USERNAME||'teacher',tPass=process.env.TEACHER_PASSWORD;
 if(!tPass)throw new Error('TEACHER_PASSWORD is required');
 let t=await pool.query('select id from users where username=$1',[tUser]);
 let tid;
 if(!t.rowCount){tid='t_'+crypto.randomUUID();await pool.query('insert into users(id,username,password_hash,role,name) values($1,$2,$3,$4,$5)',[tid,tUser,await bcrypt.hash(tPass,12),'teacher',process.env.TEACHER_NAME||'Teacher Ahmed']);}
 else tid=t.rows[0].id;
 await pool.query(`insert into classes(id,name,level,course_id,teacher_id) values('c1','Fluency Foundations','A2+ → B1','career-fluency',$1) on conflict(id) do update set teacher_id=excluded.teacher_id`,[tid]);
 await pool.query('insert into enrollments(class_id,user_id) values($1,$2) on conflict do nothing',['c1',tid]);
 const demo=process.env.DEMO_STUDENT_USERNAME,demoPass=process.env.DEMO_STUDENT_PASSWORD;
 if(demo&&demoPass){let s=await pool.query('select id from users where username=$1',[demo]);let sid;if(!s.rowCount){sid='s_'+crypto.randomUUID();await pool.query('insert into users(id,username,password_hash,role,name) values($1,$2,$3,$4,$5)',[sid,demo,await bcrypt.hash(demoPass,12),'student',process.env.DEMO_STUDENT_NAME||'Raqiya Ibrahim']);await pool.query('insert into profiles(user_id,points,base) values($1,0,$2::jsonb)',[sid,JSON.stringify({vocabulary:60,grammar:60,listening:60,writing:60})]);}else sid=s.rows[0].id;await pool.query('insert into enrollments(class_id,user_id) values($1,$2) on conflict do nothing',['c1',sid]);}
}

app.get('/api/health',async(req,res)=>{try{await pool.query('select 1');res.json({ok:true,service:'fluency-first-api'})}catch(e){res.status(503).json({ok:false})}});
app.post('/api/auth/login',loginLimiter,async(req,res)=>{const username=String(req.body.username||'').trim().toLowerCase(),password=String(req.body.password||'');const q=await pool.query('select id,username,password_hash,role,name from users where lower(username)=lower($1)',[username]);if(!q.rowCount||!(await bcrypt.compare(password,q.rows[0].password_hash)))return res.status(401).json({error:'Username or password is incorrect.'});const u=q.rows[0];setSession(res,u);res.json({user:{id:u.id,username:u.username,role:u.role,name:u.name}})});
app.post('/api/auth/logout',(req,res)=>{res.clearCookie('ff_session',{path:'/'});res.json({ok:true})});
app.get('/api/me',auth,(req,res)=>res.json({user:req.user}));

async function classIdsFor(user){const q=await pool.query('select class_id from enrollments where user_id=$1',[user.id]);return q.rows.map(r=>r.class_id)}
app.get('/api/state',auth,async(req,res)=>{const classIds=await classIdsFor(req.user);const classes=(await pool.query('select * from classes where id=any($1::text[])',[classIds])).rows;let users=[];if(classIds.length)users=(await pool.query(`select distinct u.id,u.username,u.role,u.name from users u join enrollments e on e.user_id=u.id where e.class_id=any($1::text[]) order by u.role desc,u.name`,[classIds])).rows;const studentIds=users.filter(u=>u.role==='student').map(u=>u.id);const ownStudent=req.user.role==='student'?[req.user.id]:studentIds;const profileIds=req.user.role==='teacher'?studentIds:[...new Set([req.user.id,...studentIds])];const profRows=profileIds.length?(await pool.query('select user_id,points,base from profiles where user_id=any($1::text[])',[profileIds])).rows:[];const profiles={};profRows.forEach(p=>profiles[p.user_id]={points:p.points,base:p.base});const attemptIds=req.user.role==='teacher'?studentIds:ownStudent;const atRows=attemptIds.length?(await pool.query('select id,student_id,lesson_id,skill,score,tags,at from attempts where student_id=any($1::text[]) order by at',[attemptIds])).rows:[];const compIds=req.user.role==='teacher'?studentIds:studentIds;const cRows=compIds.length?(await pool.query('select student_id,lesson_id,step from completion where student_id=any($1::text[])',[compIds])).rows:[];const wIds=req.user.role==='teacher'?studentIds:ownStudent;const wRows=wIds.length?(await pool.query('select student_id,lesson_id,content from writing_samples where student_id=any($1::text[])',[wIds])).rows:[];const completion={},writing={};cRows.forEach(x=>{completion[x.student_id]??={};completion[x.student_id][x.lesson_id]??=[];completion[x.student_id][x.lesson_id].push(x.step)});wRows.forEach(x=>{writing[x.student_id]??={};writing[x.student_id][x.lesson_id]=x.content});res.json({version:3,users,classes,profiles,attempts:atRows.map(a=>({id:String(a.id),studentId:a.student_id,lessonId:a.lesson_id,skill:a.skill,score:a.score,tags:a.tags,at:a.at})),completion,writing})});

app.post('/api/attempts',auth,studentOnly,async(req,res)=>{const {lessonId,skill,score,tags=[]}=req.body;if(!lessonId||!['vocabulary','grammar','listening','writing'].includes(skill)||!Number.isInteger(score)||score<0||score>100)return res.status(400).json({error:'Invalid attempt.'});await pool.query('insert into attempts(student_id,lesson_id,skill,score,tags) values($1,$2,$3,$4,$5)',[req.user.id,lessonId,skill,score,Array.isArray(tags)?tags.slice(0,10):[]]);await pool.query('update profiles set points=points+$1 where user_id=$2',[score>=70?8:2,req.user.id]);res.json({ok:true})});
app.post('/api/completion',auth,studentOnly,async(req,res)=>{const {lessonId,step}=req.body;if(!lessonId||!['vocabulary','listening','grammar','writing','review'].includes(step))return res.status(400).json({error:'Invalid completion step.'});const r=await pool.query('insert into completion(student_id,lesson_id,step) values($1,$2,$3) on conflict do nothing returning step',[req.user.id,lessonId,step]);if(r.rowCount)await pool.query('update profiles set points=points+10 where user_id=$1',[req.user.id]);res.json({ok:true})});
app.put('/api/writing/:lessonId',auth,studentOnly,async(req,res)=>{const content=String(req.body.content||'').trim(),score=Number(req.body.score);if(content.length<20||!Number.isInteger(score)||score<0||score>100)return res.status(400).json({error:'Invalid writing sample.'});await pool.query(`insert into writing_samples(student_id,lesson_id,content,score) values($1,$2,$3,$4) on conflict(student_id,lesson_id) do update set content=excluded.content,score=excluded.score,updated_at=now()`,[req.user.id,req.params.lessonId,content,score]);await pool.query('insert into attempts(student_id,lesson_id,skill,score,tags) values($1,$2,$3,$4,$5)',[req.user.id,req.params.lessonId,'writing',score,['writing:organisation','writing:task-completion']]);await pool.query('update profiles set points=points+$1 where user_id=$2',[score>=70?8:2,req.user.id]);const done=await pool.query('insert into completion(student_id,lesson_id,step) values($1,$2,$3) on conflict do nothing returning step',[req.user.id,req.params.lessonId,'writing']);if(done.rowCount)await pool.query('update profiles set points=points+10 where user_id=$1',[req.user.id]);res.json({ok:true})});

app.post('/api/teacher/students',auth,teacherOnly,async(req,res)=>{const name=String(req.body.name||'').trim(),username=String(req.body.username||'').trim().toLowerCase(),classId=String(req.body.classId||'c1');if(name.length<2||!/^[a-z0-9._-]{3,32}$/.test(username))return res.status(400).json({error:'Use a valid name and a 3–32 character username.'});const owns=await pool.query('select 1 from classes where id=$1 and teacher_id=$2',[classId,req.user.id]);if(!owns.rowCount)return res.status(403).json({error:'You cannot add students to this class.'});const exists=await pool.query('select 1 from users where lower(username)=lower($1)',[username]);if(exists.rowCount)return res.status(409).json({error:'That username already exists.'});const id='s_'+crypto.randomUUID(),pw=tempPassword(),client=await pool.connect();try{await client.query('begin');await client.query('insert into users(id,username,password_hash,role,name) values($1,$2,$3,$4,$5)',[id,username,await bcrypt.hash(pw,12),'student',name]);await client.query('insert into profiles(user_id) values($1)',[id]);await client.query('insert into enrollments(class_id,user_id) values($1,$2)',[classId,id]);await client.query('commit');res.status(201).json({id,username,temporaryPassword:pw})}catch(e){await client.query('rollback');throw e}finally{client.release()}});
app.post('/api/teacher/students/:id/reset-password',auth,teacherOnly,async(req,res)=>{const owns=await pool.query(`select 1 from enrollments es join classes c on c.id=es.class_id where es.user_id=$1 and c.teacher_id=$2`,[req.params.id,req.user.id]);if(!owns.rowCount)return res.status(404).json({error:'Student not found in your classes.'});const pw=tempPassword();await pool.query('update users set password_hash=$1 where id=$2 and role=$3',[await bcrypt.hash(pw,12),req.params.id,'student']);res.json({temporaryPassword:pw})});

app.get('/styles.css',(req,res)=>res.sendFile(path.join(__dirname,'public','styles.css')));
app.get('/app.js',(req,res)=>res.sendFile(path.join(__dirname,'public','app.js')));
app.get('/',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.use((req,res)=>{if(req.path.startsWith('/api/'))return res.status(404).json({error:'Not found'});res.sendFile(path.join(__dirname,'public','index.html'))});
app.use((err,req,res,next)=>{console.error('request error',err);if(res.headersSent)return next(err);res.status(500).json({error:'Server error'})});

async function authSelfCheck(){for(const [username,password,label] of [[process.env.TEACHER_USERNAME||'teacher',process.env.TEACHER_PASSWORD,'teacher'],[process.env.DEMO_STUDENT_USERNAME,process.env.DEMO_STUDENT_PASSWORD,'demo student']]){if(!username||!password)continue;const q=await pool.query('select password_hash from users where lower(username)=lower($1)',[username]);if(!q.rowCount||!(await bcrypt.compare(password,q.rows[0].password_hash)))throw new Error(`Auth self-check failed for ${label}`);console.log(`Auth self-check passed for ${label}`)}}
initDb().then(authSelfCheck).then(()=>app.listen(port,()=>console.log(`Fluency First listening on ${port}`))).catch(e=>{console.error(e);process.exit(1)});
