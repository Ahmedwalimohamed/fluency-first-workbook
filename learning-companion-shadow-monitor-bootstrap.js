'use strict';

/**
 * Admin-only Learning Companion shadow monitor.
 * Read-only. Never writes grades, attempts, completion, learner state, or
 * Companion decisions. Raw learner answers are not queried or rendered.
 */
const express=require('express');
const jwt=require('jsonwebtoken');
const {Pool}=require('pg');
const shadow=require('./learning-companion-shadow-bootstrap');
const companion=require('./learning-companion-v1');

const pool=new Pool({connectionString:process.env.DATABASE_URL});
const originalGet=express.application.get;
const installed=new WeakSet();

function adminFrom(req){
  try{
    const user=jwt.verify(req.cookies?.ff_session||'',process.env.JWT_SECRET);
    return user?.role==='admin'?user:null;
  }catch{return null}
}

function requireAdmin(req,res,next){
  if(!adminFrom(req))return res.status(403).json({error:'System Admin access required.'});
  next()
}

async function shadowSnapshot({limit=100,lessonId='su-b1-l1'}={}){
  await shadow.ensureShadowSchema(pool);
  const safeLimit=Math.max(1,Math.min(250,Number(limit)||100));
  const lesson=String(lessonId||'su-b1-l1').slice(0,120);
  const summary=(await pool.query(`
    select
      count(*)::int as events,
      count(*) filter (where e.observed_at >= now()-interval '24 hours')::int as events_24h,
      count(d.id)::int as decisions,
      count(d.id) filter (where d.created_at >= now()-interval '24 hours')::int as decisions_24h,
      count(*) filter (where e.lesson_id=$1)::int as lesson_events,
      count(d.id) filter (where e.lesson_id=$1)::int as lesson_decisions
    from learning_companion_events e
    left join learning_companion_shadow_decisions d on d.event_id=e.event_id
  `,[lesson])).rows[0]||{};

  const actions=(await pool.query(`
    select coalesce(d.action,'NO_DECISION') as action,count(*)::int as count
      from learning_companion_events e
      left join learning_companion_shadow_decisions d on d.event_id=e.event_id
     where e.lesson_id=$1
     group by coalesce(d.action,'NO_DECISION')
     order by count(*) desc,action asc
  `,[lesson])).rows;

  const rows=(await pool.query(`
    select e.event_id,e.learner_id,e.lesson_id,e.event_type,e.payload,e.observed_at,
           d.action,d.diagnosis,d.policy,d.record,d.created_at as decision_at,
           u.name as learner_name,u.username as learner_username
      from learning_companion_events e
      left join learning_companion_shadow_decisions d on d.event_id=e.event_id
      left join users u on u.id=e.learner_id
     where e.lesson_id=$1
     order by e.observed_at desc
     limit $2
  `,[lesson,safeLimit])).rows.map(row=>{
    const payload=row.payload&&typeof row.payload==='object'?row.payload:{};
    const diagnosis=row.diagnosis&&typeof row.diagnosis==='object'?row.diagnosis:{};
    const policy=row.policy&&typeof row.policy==='object'?row.policy:{};
    const record=row.record&&typeof row.record==='object'?row.record:{};
    return {
      eventId:row.event_id,
      learner:{id:row.learner_id,name:row.learner_name||null,username:row.learner_username||null},
      lessonId:row.lesson_id,
      eventType:row.event_type,
      skill:payload.skill||payload.activity_id||null,
      targetId:payload.target_id||null,
      observedAt:row.observed_at,
      decisionAt:row.decision_at||null,
      action:row.action||null,
      diagnosis:{
        misconception:diagnosis.misconception??null,
        confidence:Number.isFinite(Number(diagnosis.confidence))?Number(diagnosis.confidence):null,
        evidence:Array.isArray(diagnosis.evidence)?diagnosis.evidence.slice(0,8):[]
      },
      policy:{allowed:policy.allowed??null,action:policy.action??null,reason:policy.reason??null},
      route:record.route||null,
      version:record.versions||{},
      // Explicit proof fields for privacy review. These are booleans only.
      rawAnswerPresent:Boolean(payload.response||payload.studentAnswer||payload.correctAnswer),
      coreUnchanged:true
    }
  });

  return {
    mode:{learnerFacing:companion.enabled(),shadowObservation:companion.shadowEnabled()},
    lessonId:lesson,
    summary:{
      events:Number(summary.events||0),events24h:Number(summary.events_24h||0),
      decisions:Number(summary.decisions||0),decisions24h:Number(summary.decisions_24h||0),
      lessonEvents:Number(summary.lesson_events||0),lessonDecisions:Number(summary.lesson_decisions||0)
    },
    actions,
    rows
  }
}

function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}

function monitorHtml(){return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Learning Companion · Shadow Monitor</title><style>
body{margin:0;background:#f8fafc;color:#0f172a;font:14px/1.45 Arial,sans-serif}.shell{max-width:1180px;margin:auto;padding:24px}.head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:20px}.k{font-size:12px;font-weight:800;letter-spacing:.12em;color:#2563eb;text-transform:uppercase}h1{font-size:28px;margin:5px 0}p{color:#64748b;margin:4px 0}.badge{display:inline-flex;padding:7px 10px;border-radius:999px;background:#e2e8f0;font-weight:700}.ok{background:#dcfce7;color:#166534}.warn{background:#fef3c7;color:#92400e}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:18px 0}.card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px}.card strong{display:block;font-size:26px;margin-top:5px}.toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:16px 0}.toolbar button{border:0;border-radius:9px;background:#2563eb;color:#fff;padding:10px 14px;font-weight:700;cursor:pointer}.table{overflow:auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px}table{border-collapse:collapse;width:100%;min-width:980px}th,td{text-align:left;padding:11px 12px;border-bottom:1px solid #e2e8f0;vertical-align:top}th{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#64748b;background:#f8fafc}.muted{color:#64748b}.bad{color:#b91c1c;font-weight:700}.good{color:#166534;font-weight:700}.empty{padding:32px;text-align:center;color:#64748b}@media(max-width:760px){.grid{grid-template-columns:1fr 1fr}.head{display:block}.shell{padding:16px}}
</style></head><body><main class="shell"><div class="head"><div><div class="k">EnglishGate Reliability</div><h1>Learning Companion Shadow Monitor</h1><p>B1 Lesson 1 · metadata-only observation · no learner-facing intervention</p></div><div id="mode"></div></div><div class="grid" id="summary"></div><div class="toolbar"><button id="refresh">Refresh</button><span class="muted" id="stamp"></span><span id="privacy"></span></div><div class="table"><table><thead><tr><th>Observed</th><th>Learner</th><th>Skill</th><th>Action</th><th>Diagnosis</th><th>Confidence</th><th>Policy</th><th>Route</th><th>Privacy</th></tr></thead><tbody id="rows"></tbody></table></div></main><script>
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function load(){const r=await fetch('/api/admin/learning-companion/shadow?lessonId=su-b1-l1&limit=100',{credentials:'include'});const d=await r.json();if(!r.ok){document.body.innerHTML='<pre>'+esc(d.error||'Could not load monitor')+'</pre>';return}document.getElementById('mode').innerHTML='<span class="badge '+(!d.mode.learnerFacing&&d.mode.shadowObservation?'ok':'warn')+'">Learner-facing '+(d.mode.learnerFacing?'ON':'OFF')+' · Shadow '+(d.mode.shadowObservation?'ON':'OFF')+'</span>';const s=d.summary;document.getElementById('summary').innerHTML=[['Lesson events',s.lessonEvents],['Lesson decisions',s.lessonDecisions],['All events · 24h',s.events24h],['All decisions · 24h',s.decisions24h]].map(x=>'<div class="card"><span class="muted">'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong></div>').join('');const rows=d.rows||[];document.getElementById('rows').innerHTML=rows.length?rows.map(x=>'<tr><td>'+esc(new Date(x.observedAt).toLocaleString())+'</td><td><b>'+esc(x.learner.name||x.learner.username||x.learner.id)+'</b><div class="muted">'+esc(x.learner.username||'')+'</div></td><td>'+esc(x.skill||'—')+'</td><td><b>'+esc(x.action||'—')+'</b></td><td>'+esc(x.diagnosis.misconception||'—')+'</td><td>'+esc(x.diagnosis.confidence==null?'—':Math.round(x.diagnosis.confidence*100)+'%')+'</td><td>'+esc((x.policy.allowed===true?'allowed · ':x.policy.allowed===false?'blocked · ':'')+(x.policy.reason||x.policy.action||'—'))+'</td><td>'+esc(x.route||'—')+'</td><td class="'+(x.rawAnswerPresent?'bad':'good')+'">'+(x.rawAnswerPresent?'RAW DATA DETECTED':'metadata only')+'</td></tr>').join(''):'<tr><td colspan="9" class="empty">No B1 Lesson 1 shadow events yet.</td></tr>';const leaked=rows.some(x=>x.rawAnswerPresent);document.getElementById('privacy').innerHTML='<span class="badge '+(leaked?'warn':'ok')+'">'+(leaked?'Privacy check failed':'No raw answers detected')+'</span>';document.getElementById('stamp').textContent='Updated '+new Date().toLocaleTimeString()}
document.getElementById('refresh').onclick=load;load();setInterval(load,30000);
</script></body></html>`}

function install(app){
  if(installed.has(app))return;installed.add(app);
  originalGet.call(app,'/api/admin/learning-companion/shadow',requireAdmin,async(req,res)=>{
    try{res.set('Cache-Control','no-store');res.json(await shadowSnapshot({limit:req.query.limit,lessonId:req.query.lessonId}))}
    catch(error){console.error('[LearningCompanion monitor] snapshot failed:',error?.message||error);res.status(500).json({error:'Could not load Learning Companion shadow monitor.'})}
  });
  originalGet.call(app,'/admin/learning-companion-shadow',(req,res)=>{
    if(!adminFrom(req))return res.status(403).type('html').send('<h1>System Admin access required.</h1>');
    res.set('Cache-Control','no-store');res.type('html').send(monitorHtml())
  })
}

express.application.get=function learningCompanionMonitorGet(route,...handlers){install(this);return originalGet.call(this,route,...handlers)};

module.exports={adminFrom,requireAdmin,shadowSnapshot,monitorHtml,install};
