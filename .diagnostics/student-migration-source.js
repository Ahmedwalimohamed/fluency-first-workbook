const http=require('http');
const {Pool}=require('pg');

const pool=new Pool({connectionString:process.env.DATABASE_URL});
const token=String(process.env.MIGRATION_TOKEN||'');
const port=Number(process.env.PORT||8080);
const tables=['users','classes','enrollments','profiles','attempts','completion','writing_samples','writing_likes','listening_locks','assignments','teacher_contexts','level_certificates','deleted_seed_accounts','deleted_seed_classes','deleted_seed_books'];

async function exists(table){
  const q=await pool.query("select to_regclass($1) as name",['public.'+table]);
  return Boolean(q.rows[0]?.name);
}
async function exportData(){
  const data={};
  for(const table of tables){
    if(await exists(table))data[table]=(await pool.query(`select * from ${table}`)).rows;
  }
  const studentCount=(data.users||[]).filter(x=>x.role==='student').length;
  if(studentCount<1)throw new Error('No students found in source database');
  return {version:1,studentCount,data};
}
const server=http.createServer(async(req,res)=>{
  try{
    if(req.url==='/health'){
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
      return res.end(JSON.stringify({ok:true}));
    }
    const auth=String(req.headers.authorization||'');
    if(req.method!=='GET'||req.url!=='/export'||!token||auth!==`Bearer ${token}`){
      res.writeHead(404,{'Content-Type':'application/json','Cache-Control':'no-store'});
      return res.end(JSON.stringify({error:'Not found'}));
    }
    const payload=await exportData();
    const body=JSON.stringify(payload);
    res.writeHead(200,{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'Cache-Control':'no-store'});
    res.end(body);
  }catch(e){
    console.error('MIGRATION_SOURCE_ERROR',e.message);
    if(!res.headersSent)res.writeHead(500,{'Content-Type':'application/json','Cache-Control':'no-store'});
    res.end(JSON.stringify({error:'Migration export failed'}));
  }
});
server.listen(port,()=>console.log('MIGRATION_SOURCE_READY'));
