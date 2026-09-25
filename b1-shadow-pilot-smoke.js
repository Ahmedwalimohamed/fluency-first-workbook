'use strict';

const SMOKE_ID='b1-shadow-autosmoke-v1';

function enabled(env=process.env){return String(env.B1_LEARNING_COMPANION_AUTOSMOKE||'false').toLowerCase()==='true'}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms))}

async function ensureMarkerTable(pool){
  await pool.query(`create table if not exists learning_companion_smoke_runs(
    id text primary key,
    status text not null,
    detail jsonb not null default '{}'::jsonb,
    ran_at timestamptz not null default now()
  )`)
}

async function marker(pool){
  await ensureMarkerTable(pool);
  return (await pool.query('select id,status,detail,ran_at from learning_companion_smoke_runs where id=$1 limit 1',[SMOKE_ID])).rows[0]||null
}

async function writeMarker(pool,status,detail={}){
  await ensureMarkerTable(pool);
  await pool.query(`insert into learning_companion_smoke_runs(id,status,detail,ran_at)
    values($1,$2,$3::jsonb,now())
    on conflict(id) do update set status=excluded.status,detail=excluded.detail,ran_at=now()`,[SMOKE_ID,status,JSON.stringify(detail)])
}

async function requestWithRetry(url,options={},attempts=8){
  let last;
  for(let i=0;i<attempts;i++){
    try{return await fetch(url,options)}catch(error){last=error;await sleep(500+250*i)}
  }
  throw last||new Error('SMOKE_HTTP_UNAVAILABLE')
}

async function runAutosmoke({pool,port,username,password,studentId}){
  if(!enabled())return{status:'DISABLED'};
  const previous=await marker(pool);
  if(previous?.status==='PASS'){
    console.log('B1 SHADOW AUTOSMOKE SKIPPED reason=already-passed');
    return{status:'ALREADY_PASSED',detail:previous.detail||{}}
  }
  const base=`http://127.0.0.1:${Number(port)||3000}`;
  const sentinel=`B1_PRIVATE_SENTINEL_${Date.now()}`;
  const startedAt=new Date();
  try{
    const login=await requestWithRetry(base+'/api/auth/login',{
      method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username,password})
    });
    if(!login.ok)throw new Error('SMOKE_LOGIN_'+login.status);
    const setCookie=login.headers.get('set-cookie')||'';
    const cookie=setCookie.split(';')[0];
    if(!cookie.includes('='))throw new Error('SMOKE_COOKIE_MISSING');

    const config=await requestWithRetry(base+'/api/learning-companion/pilot-config',{headers:{cookie}});
    const configBody=await config.json().catch(()=>({}));
    if(!config.ok||configBody.enabled!==true||configBody.lessonId!=='su-b1-l1'||configBody.learnerFacing!==false||configBody.shadowObservation!==true){
      throw new Error('SMOKE_PILOT_CONFIG_INVALID')
    }

    const attempt=await requestWithRetry(base+'/api/attempts',{
      method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify({
        lessonId:'su-b1-l1',skill:'vocabulary',score:40,
        tags:['smoke:b1-shadow-v1'],
        evidence:[{index:1,question:'Controlled production shadow smoke item',studentAnswer:sentinel,correctAnswer:'CONTROL_KEY',correct:false,tag:'smoke:privacy'}]
      })
    });
    const attemptBody=await attempt.json().catch(()=>({}));
    if(!attempt.ok||attemptBody.ok!==true||attemptBody.pilot!==true)throw new Error('SMOKE_ATTEMPT_REJECTED_'+attempt.status);

    let row=null;
    for(let i=0;i<12&&!row;i++){
      await sleep(350);
      row=(await pool.query(`select e.event_id,e.payload,e.observed_at,d.action,d.record
        from learning_companion_events e
        left join learning_companion_shadow_decisions d on d.event_id=e.event_id
        where e.learner_id=$1 and e.lesson_id='su-b1-l1' and e.observed_at >= $2
        order by e.observed_at desc limit 1`,[studentId,startedAt])).rows[0]||null
    }
    if(!row)throw new Error('SMOKE_SHADOW_EVENT_MISSING');
    const shadowSerialized=JSON.stringify({payload:row.payload,record:row.record});
    if(shadowSerialized.includes(sentinel)||shadowSerialized.includes('CONTROL_KEY'))throw new Error('SMOKE_RAW_ANSWER_LEAK');
    const skill=row.payload?.skill||row.payload?.activity_id||null;
    if(skill!=='vocabulary')throw new Error('SMOKE_SKILL_MISMATCH');

    const detail={lessonId:'su-b1-l1',skill:'vocabulary',eventId:row.event_id,action:row.action||null,privacy:'metadata-only',learnerFacing:false,shadowObservation:true};
    await writeMarker(pool,'PASS',detail);
    console.log(`B1 SHADOW AUTOSMOKE PASSED login=ok pilotConfig=ok attempt=accepted shadowEvent=stored privacy=metadata-only action=${row.action||'NONE'}`);
    return{status:'PASS',detail}
  }catch(error){
    const message=String(error?.message||error).slice(0,240);
    await writeMarker(pool,'FAIL',{error:message,lessonId:'su-b1-l1'}).catch(()=>{});
    console.error('B1 SHADOW AUTOSMOKE FAILED',message);
    return{status:'FAIL',error:message}
  }
}

module.exports={SMOKE_ID,enabled,ensureMarkerTable,marker,writeMarker,requestWithRetry,runAutosmoke};
