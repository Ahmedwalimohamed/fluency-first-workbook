const {Pool}=require('pg');

const target=new Pool({connectionString:process.env.DATABASE_URL});
const sourceUrl=String(process.env.SOURCE_URL||'').replace(/\/$/,'');
const token=String(process.env.MIGRATION_TOKEN||'');
const qi=s=>'"'+String(s).replace(/"/g,'""')+'"';

async function targetColumns(client,table){
  const q=await client.query("select column_name from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position",[table]);
  return new Set(q.rows.map(r=>r.column_name));
}
async function insertRows(client,table,rows,transform=x=>x){
  if(!Array.isArray(rows)||!rows.length)return 0;
  const allowed=await targetColumns(client,table);
  if(!allowed.size)return 0;
  let n=0;
  for(const original of rows){
    const row=transform({...original});
    if(!row)continue;
    const cols=Object.keys(row).filter(c=>allowed.has(c));
    if(!cols.length)continue;
    const vals=cols.map(c=>row[c]);
    const sql=`insert into ${qi(table)} (${cols.map(qi).join(',')}) values (${cols.map((_,i)=>'$'+(i+1)).join(',')}) on conflict do nothing`;
    await client.query(sql,vals);n++;
  }
  return n;
}
async function main(){
  if(!sourceUrl||!token)throw new Error('SOURCE_URL and MIGRATION_TOKEN are required');
  const r=await fetch(sourceUrl+'/export',{headers:{Authorization:'Bearer '+token}});
  if(!r.ok)throw new Error('Source export failed with HTTP '+r.status);
  const payload=await r.json();
  const data=payload?.data||{};
  const students=(data.users||[]).filter(u=>u.role==='student');
  if(students.length<1||students.length!==Number(payload.studentCount))throw new Error('Invalid source student payload');
  const studentIds=new Set(students.map(u=>u.id));
  const sourceTeachers=(data.users||[]).filter(u=>u.role==='teacher');
  const client=await target.connect();
  try{
    await client.query('begin');
    const existing=await client.query("select count(*)::int as count from users where role='student'");
    if(Number(existing.rows[0]?.count||0)!==0)throw new Error('Target already contains students; migration aborted to prevent duplicates');
    const targetTeachers=(await client.query("select id,username from users where role='teacher' order by created_at,id")).rows;
    if(!targetTeachers.length)throw new Error('Target teacher account not found');
    const teacherMap=new Map();
    for(const st of sourceTeachers){
      const match=targetTeachers.find(t=>String(t.username).toLowerCase()===String(st.username).toLowerCase())||targetTeachers[0];
      teacherMap.set(st.id,match.id);
    }
    const fallbackTeacher=targetTeachers[0].id;
    const counts={};
    counts.users=await insertRows(client,'users',students);
    counts.classes=await insertRows(client,'classes',data.classes||[],row=>{if(row.teacher_id)row.teacher_id=teacherMap.get(row.teacher_id)||fallbackTeacher;return row});
    counts.profiles=await insertRows(client,'profiles',(data.profiles||[]).filter(r=>studentIds.has(r.user_id)));
    counts.enrollments=await insertRows(client,'enrollments',(data.enrollments||[]).filter(r=>studentIds.has(r.user_id)));
    counts.attempts=await insertRows(client,'attempts',(data.attempts||[]).filter(r=>studentIds.has(r.student_id)));
    counts.completion=await insertRows(client,'completion',(data.completion||[]).filter(r=>studentIds.has(r.student_id)));
    counts.writing_samples=await insertRows(client,'writing_samples',(data.writing_samples||[]).filter(r=>studentIds.has(r.student_id)));
    counts.writing_likes=await insertRows(client,'writing_likes',(data.writing_likes||[]).filter(r=>studentIds.has(r.liker_student_id)&&studentIds.has(r.author_student_id)));
    counts.listening_locks=await insertRows(client,'listening_locks',(data.listening_locks||[]).filter(r=>studentIds.has(r.student_id)));
    counts.assignments=await insertRows(client,'assignments',data.assignments||[],row=>{if(row.created_by)row.created_by=teacherMap.get(row.created_by)||fallbackTeacher;return row});
    counts.level_certificates=await insertRows(client,'level_certificates',(data.level_certificates||[]).filter(r=>studentIds.has(r.student_id)));
    try{await client.query("select setval(pg_get_serial_sequence('attempts','id'),greatest(coalesce((select max(id) from attempts),1),1),true)")}catch{}
    const verify=await client.query("select count(*)::int as count,count(*) filter (where login_token is not null and login_token<>'')::int as with_login_token,count(*) filter (where whatsapp_number is not null and trim(whatsapp_number)<>'')::int as with_whatsapp from users where role='student'");
    if(Number(verify.rows[0]?.count||0)!==students.length)throw new Error('Verification failed: student count mismatch');
    await client.query('commit');
    console.log('STUDENT_MIGRATION_COMPLETE',JSON.stringify({students:students.length,withLoginToken:verify.rows[0].with_login_token,withWhatsapp:verify.rows[0].with_whatsapp,rows:counts}));
  }catch(e){
    try{await client.query('rollback')}catch{}
    throw e;
  }finally{client.release();await target.end().catch(()=>{})}
}
main().catch(e=>{console.error('STUDENT_MIGRATION_FAILED',e.message);process.exit(1)});
