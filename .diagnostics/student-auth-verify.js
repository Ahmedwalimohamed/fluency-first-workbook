const {Pool}=require('pg');
const bcrypt=require('bcryptjs');

const pool=new Pool({connectionString:process.env.DATABASE_URL});
const sourceUrl=String(process.env.SOURCE_URL||'').replace(/\/$/,'');
const token=String(process.env.MIGRATION_TOKEN||'');
const appUrl=String(process.env.APP_URL||'https://learnenglish.iouborama.com').replace(/\/$/,'');

(async()=>{
  try{
    if(!sourceUrl||!token)throw new Error('Missing source configuration');
    const r=await fetch(sourceUrl+'/export',{headers:{Authorization:`Bearer ${token}`}});
    if(!r.ok)throw new Error('Source export HTTP '+r.status);
    const payload=await r.json();
    const sourceStudents=(payload.data?.users||[]).filter(x=>x.role==='student');
    const q=await pool.query("select id,username,password_hash,login_token from users where role='student' order by id");
    const targetStudents=q.rows;
    const sourceById=new Map(sourceStudents.map(x=>[String(x.id),x]));
    const lowerNames=new Map();
    let blankUsernames=0,duplicateUsernames=0,blankHashes=0,validBcryptHashes=0,exactHashMatches=0,exactUsernameMatches=0,exactTokenMatches=0,missingFromTarget=0,link200=0,linkFailures=0;
    const badAccounts=[];

    for(const t of targetStudents){
      const username=String(t.username||'').trim();
      const key=username.toLowerCase();
      if(!username)blankUsernames++;
      lowerNames.set(key,(lowerNames.get(key)||0)+1);
      if(!t.password_hash)blankHashes++;
      else {
        try{bcrypt.getRounds(t.password_hash);validBcryptHashes++;}catch{}
      }
      const s=sourceById.get(String(t.id));
      if(!s){badAccounts.push({username,issue:'not in original database'});continue;}
      if(String(s.username)===String(t.username))exactUsernameMatches++;else badAccounts.push({username,issue:'username changed'});
      if(String(s.password_hash)===String(t.password_hash))exactHashMatches++;else badAccounts.push({username,issue:'password hash changed'});
      if(String(s.login_token||'')===String(t.login_token||''))exactTokenMatches++;else badAccounts.push({username,issue:'login token changed'});
      if(t.login_token){
        try{
          const lr=await fetch(appUrl+'/api/auth/access?token='+encodeURIComponent(t.login_token),{redirect:'manual'});
          if(lr.status===200)link200++;else {linkFailures++;badAccounts.push({username,issue:'personal login link HTTP '+lr.status});}
        }catch(e){linkFailures++;badAccounts.push({username,issue:'personal login link request failed'});}
      }
    }
    duplicateUsernames=[...lowerNames.values()].filter(n=>n>1).reduce((a,n)=>a+n,0);
    for(const s of sourceStudents){if(!targetStudents.some(t=>String(t.id)===String(s.id)))missingFromTarget++;}

    const result={
      sourceStudents:sourceStudents.length,
      targetStudents:targetStudents.length,
      blankUsernames,duplicateUsernames,blankHashes,validBcryptHashes,
      exactUsernameMatches,exactHashMatches,exactTokenMatches,missingFromTarget,
      personalLoginLinks:{ok:link200,failed:linkFailures},
      allRestoredCredentialsIntact:
        sourceStudents.length===targetStudents.length &&
        sourceStudents.length===validBcryptHashes &&
        exactUsernameMatches===sourceStudents.length &&
        exactHashMatches===sourceStudents.length &&
        blankUsernames===0 && duplicateUsernames===0 && blankHashes===0 && missingFromTarget===0,
      badAccounts
    };
    console.log('STUDENT_AUTH_VERIFY',JSON.stringify(result));
    process.exit(result.allRestoredCredentialsIntact&&linkFailures===0?0:2);
  }catch(e){
    console.error('STUDENT_AUTH_VERIFY_FAILED',e.message);
    process.exit(1);
  }finally{await pool.end().catch(()=>{});}
})();
