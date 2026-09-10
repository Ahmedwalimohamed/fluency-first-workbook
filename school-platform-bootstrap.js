const crypto=require('crypto');
const express=require('express');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const {Pool}=require('pg');

const pool=new Pool({connectionString:process.env.DATABASE_URL});
const JWT_SECRET=process.env.JWT_SECRET;
const DEFAULT_SCHOOL_ID='school_iou_borama';

const nativeGet=express.application.get;
const nativePost=express.application.post;
const nativePatch=express.application.patch;
const nativeDelete=express.application.delete;
const nativePut=express.application.put;

const installedApps=new WeakSet();
let loginRouteReplaced=false;
let stateRouteReplaced=false;
let leaderboardRouteReplaced=false;
let writingsRouteReplaced=false;

function cleanText(value,max=120){return String(value||'').trim().replace(/\s+/g,' ').slice(0,max)}
function cleanWhatsapp(value){const n=String(value||'').trim().replace(/[\s().-]/g,'').replace(/^00/,'+');return !n?'':/^\+[1-9]\d{7,14}$/.test(n)?n:null}
function slugify(value){return cleanText(value,80).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)}
function numericPassword(value){if(value===undefined||value===null||value==='')return String(crypto.randomInt(10000000,100000000));const v=String(value).trim();return /^\d{8,20}$/.test(v)?v:null}
function tokenFor(user){return jwt.sign({id:user.id,role:user.role,username:user.username,name:user.name,schoolId:user.school_id||null},JWT_SECRET,{expiresIn:'12h'})}
function setSession(res,user){res.cookie('ff_session',tokenFor(user),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:12*60*60*1000,path:'/'})}
function sessionUser(req){try{return jwt.verify(req.cookies?.ff_session||'',JWT_SECRET)}catch{return null}}
async function scopeForUserId(id){const q=await pool.query(`select u.id,u.username,u.role,u.name,u.school_id,s.name as school_name,s.slug as school_slug,s.plan as school_plan,s.status as school_status,s.whatsapp_number as school_whatsapp from users u left join schools s on s.id=u.school_id where u.id=$1`,[id]);return q.rows[0]||null}
async function platformAuth(req,res,next){const token=sessionUser(req);if(!token)return res.status(401).json({error:'Please sign in again.'});const scope=await scopeForUserId(token.id);if(!scope)return res.status(401).json({error:'Please sign in again.'});req.platformUser=scope;next()}
function superAdminOnly(req,res,next){if(req.platformUser?.role!=='admin'||req.platformUser?.school_id)return res.status(403).json({error:'EnglishGate Super Admin access required.'});next()}
function schoolAdminOnly(req,res,next){if(req.platformUser?.role!=='admin'||!req.platformUser?.school_id)return res.status(403).json({error:'School Admin access required.'});if(req.platformUser.school_status!=='active')return res.status(403).json({error:'This school workspace is not active.'});next()}
async function blockTenantAdmin(req,res,next){try{if(req.user?.role!=='admin')return next();const q=await pool.query('select school_id from users where id=$1',[req.user.id]);if(q.rows[0]?.school_id)return res.status(403).json({error:'This action belongs to the school workspace.'});next()}catch(e){next(e)}}

async function ensureMultiSchoolSchema(){
 await pool.query(`
  create table if not exists schools(
    id text primary key,
    name text not null,
    slug text unique not null,
    contact_name text not null default '',
    whatsapp_number text,
    plan text not null default 'School',
    status text not null default 'active',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
 `);
 await pool.query("alter table users add column if not exists school_id text");
 await pool.query("alter table classes add column if not exists school_id text");
 await pool.query("create index if not exists users_school_id_idx on users(school_id)");
 await pool.query("create index if not exists classes_school_id_idx on classes(school_id)");
 await pool.query(`insert into schools(id,name,slug,contact_name,plan,status) values($1,$2,$3,$4,$5,'active') on conflict(id) do update set name=excluded.name,updated_at=now()`,[DEFAULT_SCHOOL_ID,'Islamic Online University-Borama','iou-borama','IOU-Borama','School']);
 await pool.query(`update users set school_id=$1 where role in ('teacher','student') and school_id is null`,[DEFAULT_SCHOOL_ID]);
 await pool.query(`update classes c set school_id=coalesce((select u.school_id from users u where u.id=c.teacher_id),$1) where c.school_id is null`,[DEFAULT_SCHOOL_ID]);
 await pool.query(`
  do $$ begin
   if not exists(select 1 from pg_constraint where conname='users_school_fk') then
    alter table users add constraint users_school_fk foreign key(school_id) references schools(id) on delete set null;
   end if;
   if not exists(select 1 from pg_constraint where conname='classes_school_fk') then
    alter table classes add constraint classes_school_fk foreign key(school_id) references schools(id) on delete restrict;
   end if;
  end $$;
 `);
 await pool.query(`
  create or replace function englishgate_class_school_guard() returns trigger as $$
  declare teacher_school text;
  begin
   if new.teacher_id is not null then
    select school_id into teacher_school from users where id=new.teacher_id and role='teacher';
    if teacher_school is null then raise exception 'Teacher must belong to a school'; end if;
    if new.school_id is null then new.school_id:=teacher_school; end if;
    if new.school_id is distinct from teacher_school then raise exception 'Teacher and class must belong to the same school'; end if;
   end if;
   if new.school_id is null then raise exception 'Class must belong to a school'; end if;
   return new;
  end; $$ language plpgsql;
  drop trigger if exists englishgate_class_school_guard_trigger on classes;
  create trigger englishgate_class_school_guard_trigger before insert or update of teacher_id,school_id on classes for each row execute function englishgate_class_school_guard();
 `);
 await pool.query(`
  create or replace function englishgate_enrollment_school_guard() returns trigger as $$
  declare class_school text; user_school text; user_role text;
  begin
   select school_id into class_school from classes where id=new.class_id;
   select school_id,role into user_school,user_role from users where id=new.user_id;
   if class_school is null then raise exception 'Class must belong to a school'; end if;
   if user_role in ('teacher','student') and user_school is null then
    update users set school_id=class_school where id=new.user_id;
    user_school:=class_school;
   end if;
   if user_role in ('teacher','student') and user_school is distinct from class_school then raise exception 'User and class must belong to the same school'; end if;
   return new;
  end; $$ language plpgsql;
  drop trigger if exists englishgate_enrollment_school_guard_trigger on enrollments;
  create trigger englishgate_enrollment_school_guard_trigger before insert or update on enrollments for each row execute function englishgate_enrollment_school_guard();
 `);
}

async function loginHandler(req,res){
 const username=cleanText(req.body?.username,32).toLowerCase(),password=String(req.body?.password||'');
 const q=await pool.query(`select u.id,u.username,u.password_hash,u.role,u.name,u.school_id,(p.profile_photo is not null) as has_profile_photo,s.name as school_name,s.slug as school_slug,s.plan as school_plan,s.status as school_status from users u left join profiles p on p.user_id=u.id left join schools s on s.id=u.school_id where lower(u.username)=lower($1)`,[username]);
 if(!q.rowCount||!(await bcrypt.compare(password,q.rows[0].password_hash)))return res.status(401).json({error:'Username or password is incorrect.'});
 const u=q.rows[0];
 if(u.school_id&&u.school_status!=='active')return res.status(403).json({error:'This school workspace is not active. Contact EnglishGate.'});
 setSession(res,u);
 res.json({user:{id:u.id,username:u.username,role:u.role,name:u.name,schoolId:u.school_id||null,school:u.school_id?{id:u.school_id,name:u.school_name,slug:u.school_slug,plan:u.school_plan,status:u.school_status}:null,hasProfilePhoto:Boolean(u.has_profile_photo),profilePhotoUrl:u.has_profile_photo?'/api/profile-photo/'+encodeURIComponent(u.id):null}});
}

async function tenantState(req,res){
 const scope=await scopeForUserId(req.user.id),schoolId=scope?.school_id;
 if(!schoolId)return res.status(403).json({error:'School workspace not found.'});
 const school=(await pool.query('select id,name,slug,contact_name,whatsapp_number,plan,status,created_at from schools where id=$1',[schoolId])).rows[0];
 const classes=(await pool.query('select * from classes where school_id=$1 order by created_at,name',[schoolId])).rows;
 const classIds=classes.map(c=>c.id);
 let users=(await pool.query(`select u.id,u.username,u.role,u.name,u.whatsapp_number,u.school_id,coalesce(array_remove(array_agg(distinct e.class_id),null),'{}'::text[]) as class_ids from users u left join enrollments e on e.user_id=u.id where u.school_id=$1 group by u.id,u.username,u.role,u.name,u.whatsapp_number,u.school_id order by case u.role when 'admin' then 1 when 'teacher' then 2 else 3 end,u.name`,[schoolId])).rows;
 users=users.map(u=>({id:u.id,username:u.username,role:u.role,name:u.name,whatsappNumber:u.whatsapp_number||null,schoolId:u.school_id,classIds:u.class_ids||[]}));
 const studentIds=users.filter(u=>u.role==='student').map(u=>u.id);
 const profRows=studentIds.length?(await pool.query('select user_id,points,base,(profile_photo is not null) as has_photo,job_title,b2_upgrade_notice_version,b2_upgrade_notice_seen_at from profiles where user_id=any($1::text[])',[studentIds])).rows:[];
 const profiles={};profRows.forEach(p=>profiles[p.user_id]={points:p.points,base:p.base,hasPhoto:Boolean(p.has_photo),photoUrl:p.has_photo?'/api/profile-photo/'+encodeURIComponent(p.user_id):null,jobTitle:p.job_title||'',b2UpgradeNoticeVersion:p.b2_upgrade_notice_version||null,b2UpgradeNoticeSeenAt:p.b2_upgrade_notice_seen_at||null});
 const atRows=studentIds.length?(await pool.query('select id,student_id,lesson_id,skill,score,tags,at from attempts where student_id=any($1::text[]) order by at',[studentIds])).rows:[];
 const cRows=studentIds.length?(await pool.query('select student_id,lesson_id,step from completion where student_id=any($1::text[])',[studentIds])).rows:[];
 const wRows=studentIds.length?(await pool.query('select student_id,lesson_id,content,score from writing_samples where student_id=any($1::text[])',[studentIds])).rows:[];
 const lockRows=studentIds.length?(await pool.query('select student_id,lesson_id from listening_locks where student_id=any($1::text[])',[studentIds])).rows:[];
 const completion={},writing={},writingScores={},listeningLocks={};
 cRows.forEach(x=>{completion[x.student_id]??={};completion[x.student_id][x.lesson_id]??=[];completion[x.student_id][x.lesson_id].push(x.step)});
 wRows.forEach(x=>{writing[x.student_id]??={};writing[x.student_id][x.lesson_id]=x.content;writingScores[x.student_id]??={};writingScores[x.student_id][x.lesson_id]=x.score});
 lockRows.forEach(x=>{listeningLocks[x.student_id]??=[];listeningLocks[x.student_id].push(x.lesson_id)});
 const bookRows=(await pool.query("select id,title,level,audience,status,total_lessons,activity_model from books order by case status when 'pilot' then 1 when 'ready' then 2 else 3 end,title")).rows;
 const assignmentRows=classIds.length?(await pool.query('select id,class_id,book_id,lesson_id,lesson_number,lesson_title,skills,created_at from assignments where class_id=any($1::text[]) order by created_at desc',[classIds])).rows:[];
 const certificateRows=studentIds.length?(await pool.query('select * from level_certificates where student_id=any($1::text[]) order by issued_at desc',[studentIds])).rows:[];
 const certificates=certificateRows.map(r=>({id:r.id,certificateNumber:r.certificate_number,studentId:r.student_id,classId:r.class_id,bookId:r.book_id,level:r.level,studentName:r.student_name,bookTitle:r.book_title,teacherName:r.teacher_name||'',issuedAt:r.issued_at}));
 res.json({version:11,school:{id:school.id,name:school.name,slug:school.slug,contactName:school.contact_name||'',whatsappNumber:school.whatsapp_number||'',plan:school.plan,status:school.status,createdAt:school.created_at},assignments:assignmentRows.map(a=>({id:a.id,classId:a.class_id,bookId:a.book_id,lessonId:a.lesson_id,lessonNumber:a.lesson_number,lessonTitle:a.lesson_title,skills:a.skills,createdAt:a.created_at})),books:bookRows.map(b=>({id:b.id,title:b.title,level:b.level,audience:b.audience,status:b.status,totalLessons:b.total_lessons,activityModel:b.activity_model})),users,classes:classes.map(c=>({...c,schoolId:c.school_id,bookId:c.course_id})),profiles,attempts:atRows.map(a=>({id:String(a.id),studentId:a.student_id,lessonId:a.lesson_id,skill:a.skill,score:a.score,tags:a.tags,at:a.at})),completion,writing,writingScores,listeningLocks,teacherContext:null,certificates});
}

async function tenantLeaderboard(req,res){
 const scope=await scopeForUserId(req.user.id);if(!scope?.school_id)return null;
 const rows=(await pool.query(`select u.id,u.name,(p.profile_photo is not null) as has_photo,p.job_title,coalesce(cls.name,'') as class_name,coalesce(cls.level,'') as level,coalesce(cls.book_title,'Workbook') as book_title,coalesce(cls.total_lessons,22)::int as total_lessons,coalesce(comp.completed,0)::int as completed,coalesce(perf.scored,0)::int as scored,perf.average,perf.last_active from users u left join profiles p on p.user_id=u.id left join lateral (select c.name,c.level,b.title as book_title,coalesce(b.total_lessons,22) as total_lessons from enrollments e join classes c on c.id=e.class_id left join books b on b.id=c.course_id where e.user_id=u.id order by c.created_at desc nulls last,c.name limit 1) cls on true left join lateral (select count(*)::int as completed from completion c where c.student_id=u.id and c.step in ('vocabulary','listening','grammar','writing')) comp on true left join lateral (select round(avg(latest.score)::numeric,0)::int as average,count(*)::int as scored,max(latest.at) as last_active from (select distinct on (a.lesson_id,a.skill) a.lesson_id,a.skill,a.score,a.at from attempts a where a.student_id=u.id and a.skill in ('vocabulary','listening','grammar','writing') order by a.lesson_id,a.skill,a.at desc) latest) perf on true where u.role='student' and u.school_id=$1`,[scope.school_id])).rows;
 const students=rows.map(r=>{const completed=Number(r.completed||0),average=r.average==null?null:Number(r.average),scored=Number(r.scored||0),total=Math.max(1,Number(r.total_lessons||22)*4),completion=Math.min(100,Math.round(completed/total*100)),practice=Math.min(100,scored*8),score=Math.round((Number.isFinite(average)?average:0)*.45+completion*.35+practice*.2);return{id:r.id,name:r.name,photoUrl:r.has_photo?'/api/profile-photo/'+encodeURIComponent(r.id):null,jobTitle:r.job_title||'',className:r.class_name||'',level:r.level||'',bookTitle:r.book_title||'Workbook',completed,scored,completion,practice,score,average,lastActive:r.last_active||null,rank:0}}).sort((a,b)=>b.score-a.score||b.completion-a.completion||String(a.name).localeCompare(String(b.name)));
 students.forEach((s,i)=>s.rank=i+1);res.set('Cache-Control','no-store');res.json({students,rankingMethod:'45% recorded activity average, 35% workbook completion, 20% practice consistency'});return true;
}

async function tenantWritings(req,res){
 const scope=await scopeForUserId(req.user.id);if(!scope?.school_id)return null;
 const rows=(await pool.query(`select w.student_id,w.lesson_id,w.content,w.updated_at,u.name,(p.profile_photo is not null) as has_photo,coalesce(cls.class_name,'') as class_name,coalesce(lc.like_count,0)::int as like_count,exists(select 1 from writing_likes mine where mine.liker_student_id=$1 and mine.author_student_id=w.student_id and mine.lesson_id=w.lesson_id) as liked_by_me from writing_samples w join users u on u.id=w.student_id and u.role='student' left join profiles p on p.user_id=w.student_id left join lateral (select c.name as class_name from enrollments e join classes c on c.id=e.class_id where e.user_id=w.student_id order by c.created_at desc nulls last,c.name limit 1) cls on true left join lateral (select count(*)::int as like_count from writing_likes wl where wl.author_student_id=w.student_id and wl.lesson_id=w.lesson_id) lc on true where w.published_to_community=true and length(trim(w.content))>=20 and u.school_id=$2 order by w.updated_at desc limit 1000`,[req.user.id,scope.school_id])).rows;
 const valid=raw=>{const text=String(raw||'').trim();if(text.length<20)return'';if(/^[\[{]/.test(text)){try{const p=JSON.parse(text);if(Array.isArray(p)){const last=[...p].reverse().find(v=>typeof v==='string'&&v.trim());return String(last||'').trim()}if(p&&typeof p==='object')return typeof p.final==='string'?p.final.trim():'';return typeof p==='string'?p.trim():''}catch{return''}}return text};
 const writings=rows.map(r=>({...r,published_content:valid(r.content)})).filter(r=>r.published_content).sort((a,b)=>Number(b.like_count||0)-Number(a.like_count||0)||new Date(b.updated_at)-new Date(a.updated_at)).slice(0,250).map(r=>({studentId:r.student_id,lessonId:r.lesson_id,content:r.published_content,updatedAt:r.updated_at,studentName:r.name,className:r.class_name||'',photoUrl:r.has_photo?'/api/profile-photo/'+encodeURIComponent(r.student_id):null,likeCount:Number(r.like_count||0),likedByMe:Boolean(r.liked_by_me),canLike:req.user.role==='student'&&r.student_id!==req.user.id,canShare:req.user.role==='student'&&r.student_id===req.user.id}));
 res.set('Cache-Control','no-store');res.json({writings});return true;
}

async function sameSchoolResourceGuard(req,res,next){try{const me=await scopeForUserId(req.user.id);if(!me?.school_id)return next();const targetId=String(req.params.studentId||req.params.id||'');if(!targetId)return next();const q=await pool.query('select school_id from users where id=$1',[targetId]);if(q.rowCount&&q.rows[0].school_id!==me.school_id)return res.status(404).json({error:'Not found.'});next()}catch(e){next(e)}}

function schoolDto(r){return{id:r.id,name:r.name,slug:r.slug,contactName:r.contact_name||'',whatsappNumber:r.whatsapp_number||'',plan:r.plan,status:r.status,createdAt:r.created_at,admins:Number(r.admins||0),teachers:Number(r.teachers||0),students:Number(r.students||0),classes:Number(r.classes||0)}}

function installPlatformRoutes(app){
 if(installedApps.has(app))return;installedApps.add(app);
 nativeGet.call(app,'/api/platform/schools',platformAuth,superAdminOnly,async(req,res)=>{const q=await pool.query(`select s.*,count(distinct case when u.role='admin' then u.id end)::int as admins,count(distinct case when u.role='teacher' then u.id end)::int as teachers,count(distinct case when u.role='student' then u.id end)::int as students,count(distinct c.id)::int as classes from schools s left join users u on u.school_id=s.id left join classes c on c.school_id=s.id group by s.id order by s.created_at desc`);res.json({schools:q.rows.map(schoolDto)})});
 nativeGet.call(app,'/api/platform/schools/:id',platformAuth,superAdminOnly,async(req,res)=>{const s=(await pool.query(`select s.*,count(distinct case when u.role='admin' then u.id end)::int as admins,count(distinct case when u.role='teacher' then u.id end)::int as teachers,count(distinct case when u.role='student' then u.id end)::int as students,count(distinct c.id)::int as classes from schools s left join users u on u.school_id=s.id left join classes c on c.school_id=s.id where s.id=$1 group by s.id`,[req.params.id])).rows[0];if(!s)return res.status(404).json({error:'School not found.'});const admins=(await pool.query("select id,name,username,whatsapp_number from users where school_id=$1 and role='admin' order by name",[req.params.id])).rows;res.json({school:schoolDto(s),admins:admins.map(a=>({id:a.id,name:a.name,username:a.username,whatsappNumber:a.whatsapp_number||''}))})});
 nativePost.call(app,'/api/platform/schools',platformAuth,superAdminOnly,async(req,res)=>{const name=cleanText(req.body?.name,100),slug=slugify(req.body?.slug||name),contactName=cleanText(req.body?.contactName,100),whatsapp=cleanWhatsapp(req.body?.whatsappNumber),plan=['Pilot','School','Growth','Enterprise'].includes(req.body?.plan)?req.body.plan:'School',adminName=cleanText(req.body?.adminName,100),adminUsername=cleanText(req.body?.adminUsername,32).toLowerCase(),adminWhatsapp=cleanWhatsapp(req.body?.adminWhatsapp),password=numericPassword(req.body?.adminPassword);if(name.length<2||slug.length<2)return res.status(400).json({error:'Enter a valid school name.'});if(!adminName||!/^[a-z0-9._-]{3,32}$/.test(adminUsername))return res.status(400).json({error:'Enter a valid primary school admin name and username.'});if(whatsapp===null||adminWhatsapp===null)return res.status(400).json({error:'Use WhatsApp numbers with country code.'});if(!password)return res.status(400).json({error:'School admin password must be 8–20 digits.'});const id='school_'+crypto.randomUUID(),adminId='a_'+crypto.randomUUID(),client=await pool.connect();try{await client.query('begin');if((await client.query('select 1 from schools where slug=$1',[slug])).rowCount)throw Object.assign(new Error('School slug already exists.'),{status:409});if((await client.query('select 1 from users where lower(username)=lower($1)',[adminUsername])).rowCount)throw Object.assign(new Error('That admin username already exists.'),{status:409});await client.query('insert into schools(id,name,slug,contact_name,whatsapp_number,plan,status) values($1,$2,$3,$4,$5,$6,\'active\')',[id,name,slug,contactName,whatsapp||null,plan]);await client.query('insert into users(id,username,password_hash,role,name,whatsapp_number,school_id) values($1,$2,$3,\'admin\',$4,$5,$6)',[adminId,adminUsername,await bcrypt.hash(password,12),adminName,adminWhatsapp||null,id]);await client.query('commit');res.status(201).json({school:{id,name,slug,contactName,whatsappNumber:whatsapp||'',plan,status:'active'},admin:{id:adminId,name:adminName,username:adminUsername,whatsappNumber:adminWhatsapp||'',temporaryPassword:password}})}catch(e){await client.query('rollback');res.status(e.status||500).json({error:e.status?e.message:'Could not create school.'})}finally{client.release()}});
 nativePatch.call(app,'/api/platform/schools/:id',platformAuth,superAdminOnly,async(req,res)=>{const current=(await pool.query('select * from schools where id=$1',[req.params.id])).rows[0];if(!current)return res.status(404).json({error:'School not found.'});const name=cleanText(req.body?.name??current.name,100),contactName=cleanText(req.body?.contactName??current.contact_name,100),whatsapp=cleanWhatsapp(req.body?.whatsappNumber??current.whatsapp_number),plan=['Pilot','School','Growth','Enterprise'].includes(req.body?.plan)?req.body.plan:current.plan,status=['active','suspended'].includes(req.body?.status)?req.body.status:current.status;if(whatsapp===null)return res.status(400).json({error:'Use a WhatsApp number with country code.'});const q=await pool.query('update schools set name=$1,contact_name=$2,whatsapp_number=$3,plan=$4,status=$5,updated_at=now() where id=$6 returning *',[name,contactName,whatsapp||null,plan,status,req.params.id]);res.json({school:schoolDto(q.rows[0])})});
 nativePost.call(app,'/api/platform/schools/:id/admins',platformAuth,superAdminOnly,async(req,res)=>{const school=(await pool.query('select id from schools where id=$1',[req.params.id])).rows[0];if(!school)return res.status(404).json({error:'School not found.'});const name=cleanText(req.body?.name,100),username=cleanText(req.body?.username,32).toLowerCase(),whatsapp=cleanWhatsapp(req.body?.whatsappNumber),password=numericPassword(req.body?.password);if(!name||!/^[a-z0-9._-]{3,32}$/.test(username)||whatsapp===null||!password)return res.status(400).json({error:'Enter valid school admin details.'});if((await pool.query('select 1 from users where lower(username)=lower($1)',[username])).rowCount)return res.status(409).json({error:'That username already exists.'});const id='a_'+crypto.randomUUID();await pool.query('insert into users(id,username,password_hash,role,name,whatsapp_number,school_id) values($1,$2,$3,\'admin\',$4,$5,$6)',[id,username,await bcrypt.hash(password,12),name,whatsapp||null,req.params.id]);res.status(201).json({admin:{id,name,username,whatsappNumber:whatsapp||'',temporaryPassword:password}})});

 nativePatch.call(app,'/api/school/profile',platformAuth,schoolAdminOnly,async(req,res)=>{const current=(await pool.query('select * from schools where id=$1',[req.platformUser.school_id])).rows[0],name=cleanText(req.body?.name??current.name,100),contactName=cleanText(req.body?.contactName??current.contact_name,100),whatsapp=cleanWhatsapp(req.body?.whatsappNumber??current.whatsapp_number);if(name.length<2||whatsapp===null)return res.status(400).json({error:'Enter valid school details.'});const q=await pool.query('update schools set name=$1,contact_name=$2,whatsapp_number=$3,updated_at=now() where id=$4 returning *',[name,contactName,whatsapp||null,req.platformUser.school_id]);res.json({school:schoolDto(q.rows[0])})});
 nativePost.call(app,'/api/school/teachers',platformAuth,schoolAdminOnly,async(req,res)=>{const name=cleanText(req.body?.name,100),username=cleanText(req.body?.username,32).toLowerCase(),whatsapp=cleanWhatsapp(req.body?.whatsappNumber),password=numericPassword(req.body?.password);if(!name||!/^[a-z0-9._-]{3,32}$/.test(username)||whatsapp===null||!password)return res.status(400).json({error:'Enter valid teacher details. Passwords must contain 8–20 digits.'});if((await pool.query('select 1 from users where lower(username)=lower($1)',[username])).rowCount)return res.status(409).json({error:'That username already exists.'});const id='t_'+crypto.randomUUID();await pool.query('insert into users(id,username,password_hash,role,name,whatsapp_number,school_id) values($1,$2,$3,\'teacher\',$4,$5,$6)',[id,username,await bcrypt.hash(password,12),name,whatsapp||null,req.platformUser.school_id]);res.status(201).json({teacher:{id,name,username,whatsappNumber:whatsapp||'',temporaryPassword:password}})});
 nativePost.call(app,'/api/school/classes',platformAuth,schoolAdminOnly,async(req,res)=>{const name=cleanText(req.body?.name,100),teacherId=String(req.body?.teacherId||''),bookId=String(req.body?.bookId||'');const t=(await pool.query("select id from users where id=$1 and role='teacher' and school_id=$2",[teacherId,req.platformUser.school_id])).rows[0],b=(await pool.query("select id,title,level,status from books where id=$1 and status in ('ready','pilot')",[bookId])).rows[0];if(name.length<2||!t||!b)return res.status(400).json({error:'Choose a valid school teacher and ready EnglishGate book.'});const id='c_'+crypto.randomUUID();await pool.query('insert into classes(id,name,level,course_id,teacher_id,school_id) values($1,$2,$3,$4,$5,$6)',[id,name,b.level,bookId,teacherId,req.platformUser.school_id]);await pool.query('insert into enrollments(class_id,user_id) values($1,$2) on conflict do nothing',[id,teacherId]);res.status(201).json({class:{id,name,level:b.level,bookId,teacherId,schoolId:req.platformUser.school_id}})});
 nativePost.call(app,'/api/school/students',platformAuth,schoolAdminOnly,async(req,res)=>{const name=cleanText(req.body?.name,100),username=cleanText(req.body?.username,32).toLowerCase(),whatsapp=cleanWhatsapp(req.body?.whatsappNumber),classId=String(req.body?.classId||''),password=numericPassword(req.body?.password),target=(await pool.query('select id,name from classes where id=$1 and school_id=$2',[classId,req.platformUser.school_id])).rows[0];if(!name||!/^[a-z0-9._-]{3,32}$/.test(username)||whatsapp===null||!password||!target)return res.status(400).json({error:'Enter valid student details and choose a class in this school.'});if((await pool.query('select 1 from users where lower(username)=lower($1)',[username])).rowCount)return res.status(409).json({error:'That username already exists.'});const id='s_'+crypto.randomUUID(),loginToken=crypto.randomBytes(24).toString('base64url'),client=await pool.connect();try{await client.query('begin');await client.query('insert into users(id,username,password_hash,role,name,whatsapp_number,login_token,school_id) values($1,$2,$3,\'student\',$4,$5,$6,$7)',[id,username,await bcrypt.hash(password,12),name,whatsapp||null,loginToken,req.platformUser.school_id]);await client.query('insert into profiles(user_id) values($1)',[id]);await client.query('insert into enrollments(class_id,user_id) values($1,$2)',[classId,id]);await client.query('commit');res.status(201).json({student:{id,name,username,classId,className:target.name,whatsappNumber:whatsapp||'',temporaryPassword:password}})}catch(e){await client.query('rollback');throw e}finally{client.release()}});
 nativePatch.call(app,'/api/school/students/:id/class',platformAuth,schoolAdminOnly,async(req,res)=>{const studentId=String(req.params.id),classId=String(req.body?.classId||''),st=(await pool.query("select id from users where id=$1 and role='student' and school_id=$2",[studentId,req.platformUser.school_id])).rows[0],cl=(await pool.query('select id from classes where id=$1 and school_id=$2',[classId,req.platformUser.school_id])).rows[0];if(!st||!cl)return res.status(404).json({error:'Student or class not found.'});const client=await pool.connect();try{await client.query('begin');await client.query('delete from enrollments where user_id=$1 and class_id in (select id from classes where school_id=$2)',[studentId,req.platformUser.school_id]);await client.query('insert into enrollments(class_id,user_id) values($1,$2) on conflict do nothing',[classId,studentId]);await client.query('commit');res.json({ok:true})}catch(e){await client.query('rollback');throw e}finally{client.release()}});
 nativePost.call(app,'/api/school/users/:id/reset-password',platformAuth,schoolAdminOnly,async(req,res)=>{const target=(await pool.query("select id,role from users where id=$1 and school_id=$2 and role in ('teacher','student')",[req.params.id,req.platformUser.school_id])).rows[0],password=numericPassword(req.body?.password);if(!target)return res.status(404).json({error:'User not found.'});if(!password)return res.status(400).json({error:'Password must contain 8–20 digits.'});await pool.query('update users set password_hash=$1 where id=$2',[await bcrypt.hash(password,12),target.id]);res.json({ok:true,temporaryPassword:password})});
}

function withAdminIsolation(method,route,handlers){if(typeof route==='string'&&route.startsWith('/api/admin/')&&handlers.length){return method.call(this,route,handlers[0],blockTenantAdmin,...handlers.slice(1))}return method.call(this,route,...handlers)}

express.application.get=function schoolGet(route,...handlers){installPlatformRoutes(this);if(route==='/api/state'&&!stateRouteReplaced){stateRouteReplaced=true;return nativeGet.call(this,route,handlers[0],async(req,res,next)=>{try{const scope=await scopeForUserId(req.user.id);if(req.user.role==='admin'&&scope?.school_id)return tenantState(req,res);return handlers[1](req,res,next)}catch(e){next(e)}})}if(route==='/api/leaderboard'&&!leaderboardRouteReplaced){leaderboardRouteReplaced=true;return nativeGet.call(this,route,handlers[0],async(req,res,next)=>{try{if(await tenantLeaderboard(req,res))return;return handlers[1](req,res,next)}catch(e){next(e)}})}if(route==='/api/writings'&&!writingsRouteReplaced){writingsRouteReplaced=true;return nativeGet.call(this,route,handlers[0],async(req,res,next)=>{try{if(await tenantWritings(req,res))return;return handlers[1](req,res,next)}catch(e){next(e)}})}if(typeof route==='string'&&route.startsWith('/api/admin/'))return withAdminIsolation.call(this,nativeGet,route,handlers);if(route==='/api/profile-photo/:studentId'&&handlers.length)return nativeGet.call(this,route,handlers[0],sameSchoolResourceGuard,...handlers.slice(1));return nativeGet.call(this,route,...handlers)};
express.application.post=function schoolPost(route,...handlers){installPlatformRoutes(this);if(route==='/api/auth/login'&&!loginRouteReplaced){loginRouteReplaced=true;return nativePost.call(this,route,handlers[0],loginHandler)}if(typeof route==='string'&&route.startsWith('/api/admin/'))return withAdminIsolation.call(this,nativePost,route,handlers);if(typeof route==='string'&&route.startsWith('/api/writings/:studentId/'))return nativePost.call(this,route,handlers[0],sameSchoolResourceGuard,...handlers.slice(1));return nativePost.call(this,route,...handlers)};
express.application.patch=function schoolPatch(route,...handlers){installPlatformRoutes(this);if(typeof route==='string'&&route.startsWith('/api/admin/'))return withAdminIsolation.call(this,nativePatch,route,handlers);return nativePatch.call(this,route,...handlers)};
express.application.delete=function schoolDelete(route,...handlers){installPlatformRoutes(this);if(typeof route==='string'&&route.startsWith('/api/admin/'))return withAdminIsolation.call(this,nativeDelete,route,handlers);if(typeof route==='string'&&route.startsWith('/api/writings/:studentId/'))return nativeDelete.call(this,route,handlers[0],sameSchoolResourceGuard,...handlers.slice(1));return nativeDelete.call(this,route,...handlers)};
express.application.put=function schoolPut(route,...handlers){installPlatformRoutes(this);if(typeof route==='string'&&route.startsWith('/api/admin/'))return withAdminIsolation.call(this,nativePut,route,handlers);return nativePut.call(this,route,...handlers)};

ensureMultiSchoolSchema().then(()=>require('./password-recovery-bootstrap.js')).catch(e=>{console.error('Multi-school bootstrap failed',e);process.exit(1)});
