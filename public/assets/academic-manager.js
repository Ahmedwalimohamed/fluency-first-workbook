(function(){
  'use strict';

  const PAGE_ID='academic-manager';
  const SKILLS=['vocabulary','listening','grammar','writing'];
  const LABELS={vocabulary:'Vocabulary',listening:'Listening & Reading',grammar:'Grammar',writing:'Writing'};

  function num(v){return Number.isFinite(Number(v))?Number(v):null}
  function clamp(v,min=0,max=100){return Math.max(min,Math.min(max,v))}
  function esc(v){return typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function pct(v){return Number.isFinite(v)?Math.round(v)+'%':'Needs data'}
  function studentClassIds(st){return Array.isArray(st?.classIds)?st.classIds:Array.isArray(st?.class_ids)?st.class_ids:[]}
  function studentAttempts(sid){return (getDB().attempts||[]).filter(a=>(a.studentId||a.student_id)===sid)}
  function scoreFor(sid,skill){try{const v=mastery(sid,skill);return Number.isFinite(v)?v:null}catch{return null}}
  function completionForStudent(sid){try{return completionPct(sid)}catch{return 0}}
  function lastActivity(sid){const rows=studentAttempts(sid).filter(a=>a.at);if(!rows.length)return null;return rows.slice().sort((a,b)=>new Date(b.at)-new Date(a.at))[0]}
  function daysSince(value){if(!value)return null;const t=new Date(value).getTime();if(!Number.isFinite(t))return null;return Math.floor((Date.now()-t)/86400000)}

  function studentSignal(st){
    const scores=SKILLS.map(skill=>({skill,score:scoreFor(st.id,skill)})).filter(x=>Number.isFinite(x.score));
    const overallScore=scores.length?Math.round(scores.reduce((s,x)=>s+x.score,0)/scores.length):null;
    const weak=scores.length?scores.slice().sort((a,b)=>a.score-b.score)[0]:null;
    const comp=completionForStudent(st.id);
    const latest=lastActivity(st.id);
    const inactiveDays=daysSince(latest?.at);
    const hasEvidence=scores.length>0||studentAttempts(st.id).length>0||comp>0;
    let status='on-track',label='On track',reason='Performance evidence is currently within the support range.';

    if(!hasEvidence){status='needs-data';label='Needs data';reason='No saved learning evidence yet.'}
    else if((Number.isFinite(overallScore)&&overallScore<65)||(weak&&weak.score<60)){
      status='intervention';label='Intervention';reason=weak?`${LABELS[weak.skill]} is ${weak.score}%.`:`Overall mastery is ${overallScore}%.`;
    }else if((weak&&weak.score<70)||(Number.isFinite(overallScore)&&overallScore<75)||(Number.isFinite(inactiveDays)&&inactiveDays>=7)){
      status='watch';label='Watch';
      if(Number.isFinite(inactiveDays)&&inactiveDays>=7)reason=`No scored practice for ${inactiveDays} days.`;
      else if(weak)reason=`${LABELS[weak.skill]} is the lowest area at ${weak.score}%.`;
      else reason='Progress should be reviewed before the next class.';
    }

    return {student:st,status,label,reason,scores,overall:overallScore,weakest:weak,completion:comp,attemptCount:studentAttempts(st.id).length,lastAt:latest?.at||null,inactiveDays};
  }

  function classSignal(cls,students){
    const members=students.filter(st=>studentClassIds(st).includes(cls.id));
    const signals=members.map(studentSignal);
    const evidenced=signals.filter(s=>s.status!=='needs-data');
    const masteryValues=evidenced.map(s=>s.overall).filter(Number.isFinite);
    const avgMastery=masteryValues.length?Math.round(masteryValues.reduce((sum,v)=>sum+v,0)/masteryValues.length):null;
    const avgCompletion=members.length?Math.round(signals.reduce((sum,s)=>sum+s.completion,0)/members.length):0;
    const intervention=signals.filter(s=>s.status==='intervention').length;
    const watch=signals.filter(s=>s.status==='watch').length;
    const noData=signals.filter(s=>s.status==='needs-data').length;
    const skillAvgs=SKILLS.map(skill=>{
      const vals=signals.map(s=>s.scores.find(x=>x.skill===skill)?.score).filter(Number.isFinite);
      return {skill,score:vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null,count:vals.length};
    });
    const gap=skillAvgs.filter(x=>Number.isFinite(x.score)).sort((a,b)=>a.score-b.score)[0]||null;
    return {cls,members,signals,evidenced,avgMastery,avgCompletion,intervention,watch,noData,skillAvgs,gap};
  }

  function programSignal(){
    const db=getDB();
    const students=(db.users||[]).filter(u=>u.role==='student');
    const classes=db.classes||[];
    const studentSignals=students.map(studentSignal);
    const evidenced=studentSignals.filter(s=>s.status!=='needs-data'&&Number.isFinite(s.overall));
    const avgMastery=evidenced.length?Math.round(evidenced.reduce((a,s)=>a+s.overall,0)/evidenced.length):null;
    const intervention=studentSignals.filter(s=>s.status==='intervention').length;
    const watch=studentSignals.filter(s=>s.status==='watch').length;
    const needsData=studentSignals.filter(s=>s.status==='needs-data').length;
    const onTrack=studentSignals.filter(s=>s.status==='on-track').length;
    const engagement=students.length?(students.length-needsData)/students.length:0;
    const supportRate=students.length?intervention/students.length:0;
    const health=Number.isFinite(avgMastery)?Math.round(clamp(avgMastery*.62+(1-supportRate)*100*.23+engagement*100*.15)):null;
    const skillAvgs=SKILLS.map(skill=>{
      const vals=studentSignals.map(s=>s.scores.find(x=>x.skill===skill)?.score).filter(Number.isFinite);
      return {skill,score:vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null,count:vals.length};
    });
    const gap=skillAvgs.filter(x=>Number.isFinite(x.score)).sort((a,b)=>a.score-b.score)[0]||null;
    const classSignals=classes.map(c=>classSignal(c,students));
    return {students,classes,studentSignals,evidenced,avgMastery,intervention,watch,needsData,onTrack,engagement,health,skillAvgs,gap,classSignals};
  }

  function healthLabel(score){
    if(!Number.isFinite(score))return {label:'Needs data',tone:'neutral'};
    if(score>=80)return {label:'Healthy',tone:'good'};
    if(score>=68)return {label:'Watch closely',tone:'watch'};
    return {label:'Needs intervention',tone:'risk'};
  }

  function skillAction(skill){
    const map={
      vocabulary:'Run a short retrieval review before the next speaking task, then retest the same expressions.',
      listening:'Use one short listening or reading text, check the main idea first, then target missed details.',
      grammar:'Run a 10-minute correction cycle: example, guided questions, explanation, then a short retest.',
      writing:'Review one authentic writing sample, model a stronger version, then ask students to rewrite.'
    };
    return map[skill]||'Review the weakest evidence before moving to new content.';
  }

  function buildPriorities(p){
    const items=[];
    const riskiest=p.classSignals.slice().sort((a,b)=>b.intervention-a.intervention||b.watch-a.watch)[0];
    if(riskiest&&riskiest.intervention>0)items.push({level:'urgent',title:`Intervene in ${riskiest.cls.name}`,body:`${riskiest.intervention} student${riskiest.intervention===1?'':'s'} currently meet the intervention rule. Review them before adding more difficulty.`,action:'admin-students',button:'Review students'});
    if(p.gap)items.push({level:'focus',title:`School-wide focus: ${LABELS[p.gap.skill]}`,body:`This is the lowest measured skill at ${p.gap.score}% across ${p.gap.count} learner${p.gap.count===1?'':'s'} with evidence. ${skillAction(p.gap.skill)}`,action:'admin-reports',button:'Open evidence'});
    if(p.needsData>0)items.push({level:'data',title:'Collect missing evidence',body:`${p.needsData} student${p.needsData===1?' has':'s have'} no usable learning evidence yet. Ask teachers to get one scored activity completed before making academic decisions.`,action:'admin-students',button:'See students'});
    const inactive=p.studentSignals.filter(s=>Number.isFinite(s.inactiveDays)&&s.inactiveDays>=7).length;
    if(inactive>0)items.push({level:'watch',title:'Re-engage inactive learners',body:`${inactive} student${inactive===1?' has':'s have'} gone at least 7 days without scored practice.`,action:'admin-students',button:'Review activity'});
    if(!items.length)items.push({level:'good',title:'No urgent academic action detected',body:'Current saved evidence does not show an urgent program-level problem. Keep collecting evidence and review this page regularly.',action:'admin-reports',button:'Open reports'});
    return items.slice(0,4);
  }

  function metricCard(label,value,detail,tone=''){
    return `<article class="am-metric ${tone}"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(detail)}</small></article>`;
  }

  function gotoAdmin(page){currentPage=page;renderNav();renderPage()}

  function renderOverview(p){
    const h=healthLabel(p.health),priorities=buildPriorities(p);
    return `<section class="am-hero">
      <div>
        <span class="am-kicker">AI Academic Manager</span>
        <h1>Know what needs attention before it becomes a problem.</h1>
        <p>EnglishGate reads saved learning evidence across classes and turns it into clear academic priorities. No evidence means <strong>Needs data</strong> — never a guessed weakness.</p>
      </div>
      <div class="am-health ${h.tone}">
        <span>Program health</span>
        <strong>${Number.isFinite(p.health)?p.health:'—'}</strong>
        <small>${h.label}</small>
        <em>Internal EnglishGate signal, not a CEFR score.</em>
      </div>
    </section>
    <section class="am-metrics">
      ${metricCard('Students',p.students.length,'Enrolled')}
      ${metricCard('On track',p.onTrack,'Current evidence','good')}
      ${metricCard('Watch',p.watch,'Review soon','watch')}
      ${metricCard('Intervention',p.intervention,'Needs action','risk')}
      ${metricCard('Needs data',p.needsData,'No usable evidence','neutral')}
    </section>
    <section class="am-grid-two">
      <article class="am-panel">
        <div class="am-panel-head"><div><span class="am-kicker">What to do next</span><h2>Academic priorities</h2></div><button class="ghost-btn" id="amRefresh">Refresh analysis</button></div>
        <div class="am-priority-list">${priorities.map((x,i)=>`<div class="am-priority ${x.level}"><b>${i+1}</b><div><strong>${esc(x.title)}</strong><p>${esc(x.body)}</p></div><button class="text-link" data-am-go="${esc(x.action)}">${esc(x.button)}</button></div>`).join('')}</div>
      </article>
      <article class="am-panel">
        <span class="am-kicker">School-wide learning gap</span>
        <h2>${p.gap?LABELS[p.gap.skill]:'Needs more evidence'}</h2>
        ${p.gap?`<div class="am-gap-score"><strong>${p.gap.score}%</strong><span>average from ${p.gap.count} learner${p.gap.count===1?'':'s'} with evidence</span></div><p>${esc(skillAction(p.gap.skill))}</p>`:'<p>There is not enough scored learning evidence to identify a reliable school-wide weakness yet.</p>'}
        <div class="am-skill-bars">${p.skillAvgs.map(s=>`<div><span><b>${LABELS[s.skill]}</b><em>${pct(s.score)}</em></span><div class="am-bar"><i style="width:${Number.isFinite(s.score)?clamp(s.score):0}%"></i></div></div>`).join('')}</div>
      </article>
    </section>`;
  }

  function renderAttention(p){
    const rows=p.studentSignals.slice().sort((a,b)=>{
      const rank={intervention:0,watch:1,'needs-data':2,'on-track':3};
      return rank[a.status]-rank[b.status]||(a.overall??999)-(b.overall??999);
    });
    return `<section class="am-panel">
      <div class="am-panel-head"><div><span class="am-kicker">Learner intervention</span><h2>Students needing attention</h2><p>Priority is based on saved mastery, weakest skill, and recent evidence.</p></div><button class="primary-btn" id="amOpenStudents">Manage students</button></div>
      <div class="am-table-wrap"><table class="am-table"><thead><tr><th>Student</th><th>Status</th><th>Overall</th><th>Weakest area</th><th>Completion</th><th>Reason</th></tr></thead><tbody>
        ${rows.map(s=>`<tr><td><strong>${esc(s.student.name)}</strong><small>${esc(studentClassIds(s.student).map(id=>p.classes.find(c=>c.id===id)?.name).filter(Boolean).join(', ')||'No class')}</small></td><td><span class="am-status ${s.status}">${esc(s.label)}</span></td><td>${pct(s.overall)}</td><td>${s.weakest?`${LABELS[s.weakest.skill]} ${s.weakest.score}%`:'Needs data'}</td><td>${s.completion}%</td><td>${esc(s.reason)}</td></tr>`).join('')||'<tr><td colspan="6">No students found.</td></tr>'}
      </tbody></table></div>
    </section>`;
  }

  function renderClasses(p){
    return `<section class="am-panel"><div class="am-panel-head"><div><span class="am-kicker">Class health</span><h2>Where management should look first</h2><p>Compare real evidence across all active classes.</p></div><button class="primary-btn" id="amOpenClasses">Manage classes</button></div>
      <div class="am-class-grid">${p.classSignals.map(c=>{
        const status=c.intervention>0?'risk':c.watch>0?'watch':c.evidenced.length?'good':'neutral';
        return `<article class="am-class-card ${status}"><div class="am-class-head"><div><span>${esc(c.cls.level||'English')}</span><h3>${esc(c.cls.name)}</h3></div><strong>${c.members.length}</strong></div><div class="am-class-stats"><span><b>${pct(c.avgMastery)}</b> mastery</span><span><b>${c.avgCompletion}%</b> completion</span><span><b>${c.intervention}</b> intervention</span></div><p>${c.gap?`Lowest measured area: <strong>${LABELS[c.gap.skill]} ${c.gap.score}%</strong>.`:`No reliable skill gap yet — collect scored evidence.`}</p></article>`;
      }).join('')||'<div class="am-empty">No classes have been created yet.</div>'}</div>
    </section>`;
  }

  function reportText(p){
    const date=new Date().toLocaleDateString();
    const h=healthLabel(p.health);
    const priority=buildPriorities(p);
    return [
      `EnglishGate AI Academic Manager — Program Brief`,
      `Generated: ${date}`,
      `Program health: ${Number.isFinite(p.health)?p.health+'/100':'Needs data'} (${h.label})`,
      `Students: ${p.students.length} | On track: ${p.onTrack} | Watch: ${p.watch} | Intervention: ${p.intervention} | Needs data: ${p.needsData}`,
      `Average mastery: ${pct(p.avgMastery)}`,
      `Lowest measured skill: ${p.gap?LABELS[p.gap.skill]+' '+p.gap.score+'%':'Needs data'}`,
      '',
      'Recommended priorities:',
      ...priority.map((x,i)=>`${i+1}. ${x.title} — ${x.body}`),
      '',
      'Class health:',
      ...p.classSignals.map(c=>`${c.cls.name}: ${c.members.length} students, mastery ${pct(c.avgMastery)}, completion ${c.avgCompletion}%, intervention ${c.intervention}, watch ${c.watch}.`),
      '',
      'Note: Program health is an internal EnglishGate management signal. It is not a CEFR score or formal assessment result.'
    ].join('\n');
  }

  function renderReport(p){
    const h=healthLabel(p.health),priority=buildPriorities(p);
    return `<section class="am-report am-panel">
      <div class="am-panel-head"><div><span class="am-kicker">Management brief</span><h2>English Program Report</h2><p>Ready for a principal, school owner, or academic meeting.</p></div><div class="am-actions"><button class="ghost-btn" id="amCopyBrief">Copy brief</button><button class="primary-btn" id="amPrintBrief">Print / Save PDF</button></div></div>
      <div class="am-report-summary"><div><span>Program health</span><strong>${Number.isFinite(p.health)?p.health+'/100':'Needs data'}</strong><small>${h.label}</small></div><div><span>Average mastery</span><strong>${pct(p.avgMastery)}</strong><small>${p.evidenced.length} learners with scored evidence</small></div><div><span>Priority skill</span><strong>${p.gap?LABELS[p.gap.skill]:'Needs data'}</strong><small>${p.gap?p.gap.score+'% measured average':'Collect evidence first'}</small></div></div>
      <h3>Recommended management actions</h3>
      <ol class="am-report-list">${priority.map(x=>`<li><strong>${esc(x.title)}</strong><span>${esc(x.body)}</span></li>`).join('')}</ol>
      <h3>Class summary</h3>
      <div class="am-table-wrap"><table class="am-table"><thead><tr><th>Class</th><th>Students</th><th>Mastery</th><th>Completion</th><th>Intervention</th><th>Lowest area</th></tr></thead><tbody>${p.classSignals.map(c=>`<tr><td><strong>${esc(c.cls.name)}</strong></td><td>${c.members.length}</td><td>${pct(c.avgMastery)}</td><td>${c.avgCompletion}%</td><td>${c.intervention}</td><td>${c.gap?LABELS[c.gap.skill]+' '+c.gap.score+'%':'Needs data'}</td></tr>`).join('')}</tbody></table></div>
      <p class="am-footnote">Program health is an internal EnglishGate management signal created from available mastery, intervention, and evidence coverage. It is not a CEFR score or formal assessment result.</p>
    </section>`;
  }

  function bind(section,p){
    document.querySelectorAll('[data-am-tab]').forEach(b=>b.onclick=()=>{window.__amTab=b.dataset.amTab;academicManager()});
    document.querySelectorAll('[data-am-go]').forEach(b=>b.onclick=()=>gotoAdmin(b.dataset.amGo));
    $('amOpenStudents')&&($('amOpenStudents').onclick=()=>gotoAdmin('admin-students'));
    $('amOpenClasses')&&($('amOpenClasses').onclick=()=>gotoAdmin('admin-classes'));
    $('amRefresh')&&($('amRefresh').onclick=async()=>{const b=$('amRefresh');b.disabled=true;b.textContent='Refreshing…';try{await refreshState()}catch{}academicManager()});
    $('amPrintBrief')&&($('amPrintBrief').onclick=()=>window.print());
    $('amCopyBrief')&&($('amCopyBrief').onclick=async()=>{const text=reportText(p),b=$('amCopyBrief');try{await navigator.clipboard.writeText(text);b.textContent='Copied'}catch{const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();b.textContent='Copied'}setTimeout(()=>b.textContent='Copy brief',1400)});
  }

  window.academicManager=function academicManager(){
    const p=programSignal(),tab=window.__amTab||'overview';
    title('Academic intelligence','AI Academic Manager');
    const tabs=[['overview','Overview'],['attention','Needs attention'],['classes','Class health'],['report','Report']];
    const body=tab==='attention'?renderAttention(p):tab==='classes'?renderClasses(p):tab==='report'?renderReport(p):renderOverview(p);
    $('content').innerHTML=`<div class="am-shell"><div class="am-tabs" role="tablist">${tabs.map(([id,label])=>`<button class="${tab===id?'active':''}" data-am-tab="${id}" role="tab">${label}</button>`).join('')}</div>${body}</div>`;
    bind(tab,p);
  };

  function install(){
    try{
      if(typeof NAV!=='undefined'&&Array.isArray(NAV.admin)&&!NAV.admin.some(x=>x[0]===PAGE_ID))NAV.admin.splice(1,0,[PAGE_ID,'✦','AI Academic Manager']);
      if(typeof renderAdmin==='function'&&!window.__academicManagerRenderInstalled){
        const previous=renderAdmin;
        renderAdmin=function(){if(currentPage===PAGE_ID)return window.academicManager();return previous()};
        window.__academicManagerRenderInstalled=true;
      }
    }catch(e){console.error('Academic Manager install failed',e)}
  }

  install();
})();
