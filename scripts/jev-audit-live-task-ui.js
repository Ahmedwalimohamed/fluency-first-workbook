'use strict';

const fs=require('fs');
const path=require('path');
const {TYPE_SAFE_MODEL,TYPE_SAFE_URL}=require('../semantic-qa-firewall.js');

function read(rel){return fs.readFileSync(path.join(__dirname,'..',rel),'utf8')}
function count(s,needle){return s.split(needle).length-1}
function evidence(answer){
  const choice=String(answer?.choice||'').toLowerCase();
  const p=Number(answer?.probabilities?.[choice]),c=Number(answer?.confidence);
  const pp=Number.isFinite(p)&&p>=0&&p<=1?p:null,cc=Number.isFinite(c)&&c>=0&&c<=1?c:null;
  return {choice,evidence:pp!=null&&cc!=null?Math.min(pp,cc):pp!=null?pp:cc}
}
function question(instructions){return {type:'choice',instructions,criteria:{
  pass:'The current implementation clearly follows the stated UI/UX best practice for a live teacher-facing classroom tool.',
  review:'The implementation is usable but has a localized weakness, tradeoff, or missing polish that merits improvement.',
  fail:'There is a concrete usability, accessibility, hierarchy, safety, or responsiveness problem that materially violates the best practice.'
}}}

async function main(){
  const key=String(process.env.TYPESAFE_API_KEY||'').trim();
  if(!key){console.warn('JEV_LIVE_UI_AUDIT_SKIPPED: TYPESAFE_API_KEY is not configured.');return}

  const css=read('public/teacher-whiteboard-v1.css');
  const board=read('public/teacher-whiteboard-v1.js');
  const live=read('public/live-intervention-teach-mode-v1.js');
  const student=read('public/live-intervention-v1.js');
  const index=read('public/index.html');

  const state={
    task:'EnglishGate Whiteboard Live Task UI/UX best-practice audit',
    audience:'English teachers running a live class; secondary audience is adult EFL students responding on mobile',
    context:'Teacher must teach, model, monitor responses, notice misunderstanding and intervene without losing classroom flow.',
    northStar:'The whiteboard should feel like one calm classroom command center: question first, teaching tools second, live evidence third, administrative controls last.',
    bestPractices:[
      'One primary task per screen; the current question or teaching action must dominate.',
      'Teacher cognitive load must remain low during live instruction; high-value signals should be glanceable in under two seconds.',
      'Progressive disclosure should hide secondary analytics and setup detail until needed.',
      'Interactive targets should normally be at least 44 by 44 CSS pixels on touch-capable layouts.',
      'Keyboard users need visible focus states and logical navigation.',
      'Full-screen overlays should expose appropriate dialog semantics, focus management, and an obvious exit.',
      'Status must never rely on color alone; labels or icons must carry the meaning.',
      'Live-changing information that matters to assistive technology should use appropriate announcements without becoming noisy.',
      'Motion should respect prefers-reduced-motion when animation or transition is used.',
      'Destructive actions need friction; routine teaching actions should avoid disruptive browser alert/confirm interactions where a calmer in-product pattern is feasible.',
      'AI/Jev advice must be advisory, explainable enough to trust, and never override teacher control.',
      'Student privacy must be protected during projection/screen sharing.',
      'Mobile layouts should preserve the essential teaching job rather than merely stack every desktop panel into a long page.',
      'Empty, loading, offline/error, and completed states must remain understandable.',
      'Visual design should use a restrained adult-professional palette and coherent component language.'
    ],
    implementation:{
      assetsLoaded:{
        boardCss:index.includes('teacher-whiteboard-v1.css'),
        boardJs:index.includes('teacher-whiteboard-v1.js'),
        liveTeacherJs:index.includes('live-intervention-teach-mode-v1.js'),
        studentJs:index.includes('live-intervention-v1.js')
      },
      hierarchy:{
        desktopThreeColumn:css.includes('grid-template-columns:92px minmax(0,2.65fr) minmax(280px,1fr)'),
        currentQuestionLarge:css.includes('.eg-live-question-content h1'),
        leftTabsOnlyQuestionsAndSubmissions:live.includes('Questions</strong>')&&live.includes('Submissions</strong>'),
        rightPanelContainsWorkflow:live.includes('Live workflow'),
        rightPanelContainsJevSignal:live.includes('Jev classroom signal'),
        rightPanelContainsFourMetrics:live.includes('ready</span>')&&live.includes('partial</span>')&&live.includes('need help</span>')&&live.includes('working</span>'),
        rightPanelContainsStudentList:live.includes('<strong>Students</strong>'),
        rightPanelContainsResponseDistribution:live.includes('Responses · Q'),
        rightPanelContainsTimeControls:live.includes('Extend time')&&live.includes('End task')
      },
      teacherControl:{
        answerRevealTeacherControlled:live.includes('data-reveal-answer')&&live.includes('toggleReveal'),
        revealBlockedWhileStudentsWork:live.includes('Answer hidden:')&&live.includes('stillWorking'),
        jevIsAdvisory:live.includes('teacher decides'),
        jevCannotDirectlyReveal:!live.includes("data-intel-action")||!live.includes("toggleReveal()"),
        needsHelpSortedFirst:live.includes('needs_help:0'),
        annotateOnQuestion:live.includes('bindAnnotationCanvas'),
        privateSubmissionWarning:live.includes('Student answers are visible here'),
        submissionReviewConfirm:count(live,'confirm(')>=1,
        endTaskConfirm:live.includes("confirm('End this live task now?')")
      },
      responsive:{
        breakpoint820:css.includes('@media(max-width:820px)'),
        liveGridSingleColumnMobile:css.includes('.eg-live-grid{height:auto;min-height:100%;grid-template-columns:1fr}'),
        toolbarHorizontalScrollMobile:css.includes('overflow-x:auto;flex-wrap:nowrap'),
        mobileMainMinHeight68vh:css.includes('min-height:68vh'),
        mobileSideAfterMain:css.includes('.eg-live-side-pane{min-height:32vh;max-height:none}'),
        matchingCollapses:css.includes('.eg-live-order-edit,.eg-live-board-matching{grid-template-columns:1fr}')
      },
      accessibility:{
        focusVisibleCount:count(css,':focus-visible'),
        reducedMotion:css.includes('prefers-reduced-motion'),
        boardAriaCount:count(board,'aria-'),
        liveAriaCount:count(live,'aria-'),
        fullScreenDialogSemantics:board.includes('role="dialog"')||board.includes('aria-modal'),
        liveRegionInTeacherFlow:live.includes('aria-live'),
        visibleStatusLabels:live.includes("return 'Ready'")&&live.includes("return 'Needs help'"),
        colorNotSoleStatus:live.includes('statusLabel(s.status,s.signal)'),
        explicitWhiteboardLabel:board.includes("aria-label','EnglishGate classroom whiteboard")
      },
      interactionSizing:{
        topTabsHeight34:css.includes('.eg-whiteboard-tabs button{height:34px'),
        toolsHeight34:css.includes('.eg-whiteboard-tools button,.eg-whiteboard-tools label{height:34px'),
        commandButtonHeight36:css.includes('.eg-whiteboard-live-command button{height:36px'),
        entryWhiteboardButtonMin44:css.includes('.teacher-whiteboard-btn')&&css.includes('min-height:44px!important'),
        any44Token:css.includes('44px')
      },
      feedbackAndStates:{
        loadingState:live.includes('Opening Live Task'),
        builderEmptyState:live.includes('Create a quick classroom check'),
        errorState:live.includes('Live Task could not open'),
        recentEndedState:live.includes('ENDED'),
        submittedStatus:live.includes('submittedCount'),
        serverPolling:live.includes("setTimeout(poll,viewingRecentTask?5000:2000)"),
        browserAlertUsed:count(live,'alert(')>0,
        browserConfirmUsed:count(live,'confirm(')>0
      },
      visualSystem:{
        primaryBlue:css.includes('#2563eb'),
        slateText:css.includes('#0f172a')||css.includes('#0F172A'),
        successGreen:css.includes('#16a34a'),
        errorRed:css.includes('#dc2626'),
        reviewAmber:css.includes('#f59e0b')||css.includes('#d97706'),
        gradients:count(css,'gradient('),
        shadowCount:count(css,'box-shadow:'),
        transitionCount:count(css,'transition:')
      },
      studentSurface:{
        studentOverlay:student.includes('student-live-overlay'),
        studentTimer:student.includes('student-live-clock'),
        submitButton:student.includes('Submit live task'),
        mobileMediaCss:read('public/live-intervention-v1.css').includes('@media(max-width:700px)')
      }
    }
  };

  const questions={
    primary_hierarchy:question('Is the current question/teaching surface visually dominant over navigation, analytics, status and administrative controls?'),
    teacher_cognitive_load:question('Can a teacher plausibly understand what is happening and what to do next within roughly two seconds while still teaching, without scanning too many competing cards, metrics or controls?'),
    progressive_disclosure:question('Does the UI hide or defer secondary workflow, analytics, roster detail and administrative controls until the teacher needs them, instead of showing everything at once?'),
    jev_signal_usability:question('Is the Jev classroom signal presented as a compact, trustworthy advisory cue that supports teacher judgment rather than competing with the lesson or behaving as an autonomous controller?'),
    action_safety:question('Are high-impact actions such as reveal, ending a task, opening private student work and Jev-driven next steps protected appropriately while routine teaching actions stay fast?'),
    status_scanability:question('Are Ready, Partial, Needs help, Review, Working and Waiting states easy to scan and understandable without relying only on color?'),
    touch_targets:question('Are the main teacher controls adequately sized for touch-first use, especially top tabs, annotation tools and command controls?'),
    keyboard_focus:question('Does the whiteboard provide strong keyboard accessibility through visible focus styling and discoverable focus behavior?'),
    overlay_accessibility:question('Does the full-screen whiteboard behave accessibly as an overlay, with suitable dialog semantics, exit affordance and focus-management evidence?'),
    live_accessibility:question('Does the implementation provide enough assistive-technology support for meaningful live state changes without relying only on visual polling?'),
    reduced_motion:question('Does the current implementation respect reduced-motion preferences for users who need it?'),
    mobile_teacher_flow:question('On narrow screens, does the layout preserve the teacher’s essential live-class job rather than simply stacking a large question surface followed by a long intelligence/status panel?'),
    privacy_projection:question('Does the teacher experience adequately protect individual student responses from accidental projection or screen sharing?'),
    state_feedback:question('Are loading, empty, active, ended, error and submission states clearly represented with understandable feedback?'),
    browser_dialog_friction:question('Are alerts/confirms used sparingly enough that they do not make the live teaching flow feel abrupt or browser-native when an in-product interaction would be clearer?'),
    visual_coherence:question('Does the whiteboard follow a restrained adult-professional design system with coherent blue/slate semantic colors and without decorative AI-style gradients or excessive visual novelty?'),
    overall_live_command_center:question('Taken together, does the UI currently achieve the north-star goal of one calm classroom command center where the teacher can teach, observe, decide and intervene with minimal friction?')
  };

  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),Math.max(5000,Math.min(45000,Number(process.env.TYPESAFE_TIMEOUT_MS)||30000)));
  let data;
  try{
    const res=await fetch(TYPE_SAFE_URL,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({state,model:TYPE_SAFE_MODEL,questions}),signal:controller.signal});
    if(!res.ok){console.warn('JEV_LIVE_UI_AUDIT_SKIPPED: '+res.status+' '+(await res.text()).slice(0,300));return}
    data=await res.json();
  }catch(e){console.warn('JEV_LIVE_UI_AUDIT_SKIPPED: '+String(e?.message||e));return}
  finally{clearTimeout(timeout)}

  const findings={};let fail=0,review=0,pass=0;
  for(const id of Object.keys(questions)){
    const d=evidence(data?.answers?.[id]);
    const status=d.choice==='fail'?'FAIL':d.choice==='review'?'REVIEW':'PASS';
    if(status==='FAIL')fail++;else if(status==='REVIEW')review++;else pass++;
    findings[id]={...d,status};
  }
  console.log('JEV_LIVE_UI_AUDIT '+JSON.stringify({fail,review,pass,findings,model:String(data?.model||TYPE_SAFE_MODEL),northStar:state.northStar}));
}
main().catch(e=>{console.warn('JEV_LIVE_UI_AUDIT_SKIPPED: '+String(e?.message||e))});
