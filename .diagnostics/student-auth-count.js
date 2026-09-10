const {Pool}=require('pg');
setTimeout(async()=>{
  const pool=new Pool({connectionString:process.env.DATABASE_URL});
  try{
    const counts=await pool.query("select role,count(*)::int as count from users group by role order by role");
    const studentStats=await pool.query("select count(*)::int as total,count(*) filter (where login_token is not null and login_token<>'')::int as with_login_token,count(*) filter (where whatsapp_number is not null and trim(whatsapp_number)<>'')::int as with_whatsapp from users where role='student'");
    const names=['student','hodan','mohamed','sahra','abdi'];
    const legacyStatus={};
    for(const username of names){
      const q=await pool.query("select role from users where lower(username)=lower($1)",[username]);
      legacyStatus[username]={exists:q.rowCount===1,role:q.rows[0]?.role||null};
    }
    console.log('STUDENT_AUTH_DIAGNOSTIC',JSON.stringify({counts:counts.rows,studentStats:studentStats.rows[0],legacyStatus}));
  }catch(e){console.error('STUDENT_AUTH_DIAGNOSTIC_FAILED',e.message)}finally{await pool.end().catch(()=>{})}
},3500);
