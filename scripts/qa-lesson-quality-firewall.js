'use strict';

const assert=require('assert');
const {
  deterministicLessonChecks,
  QUALITY_DOMAINS,
  FIREWALL_VERSION,
  LESSON_QUALITY_AUDIT_VERSION,
  buildDomainProfile,
  releaseFrom,
  issueSeverity,
  MAJOR_REVIEW_MIN_EVIDENCE
}=require('../semantic-qa-firewall.js');

function lesson(overrides={}){
  return {
    number:2,
    title:'Work & Careers',
    outcome:'Explain your work and ask follow-up questions.',
    readingText:'Amina works in a small logistics company. She coordinates customer deliveries and helps her team solve problems.',
    audioScript:'Amina: I coordinate deliveries for our customers. Yusuf: What do you enjoy most about the work?',
    questions:[
      {q:'What does Amina coordinate?',options:['Deliveries','School exams','Hotel rooms'],answer:'Deliveries',tag:'reading:1'},
      {q:'Where does Amina work?',options:['A logistics company','A hospital','A university'],answer:'A logistics company',tag:'reading:2'},
      {q:'What does she help her team do?',options:['Solve problems','Cook lunch','Book holidays'],answer:'Solve problems',tag:'reading:3'},
      {q:'What does Amina say she coordinates?',options:['Deliveries','Training sessions','Interviews'],answer:'Deliveries',tag:'listening:1'},
      {q:'What does Yusuf ask about?',options:['What she enjoys','Her age','Her salary'],answer:'What she enjoys',tag:'listening:2'},
      {q:'What is the conversation mainly about?',options:['Amina’s work','A football match','A holiday'],answer:'Amina’s work',tag:'listening:3'}
    ],
    northstar:{
      framework:'SEE_CHOOSE_CHANGE_USE_FIX',
      change:[
        {model:'I work in logistics.',prompt:'Change the model so it is true for you.'},
        {model:'I have worked there for three years.',prompt:'Change the duration so it is true for you.'}
      ],
      use:{prompt:'Tell a new colleague what you do and add one useful detail.'},
      final:{task:'Write a short introduction for a professional networking event.'},
      fix:{target:'clarity',model:'I work in logistics, where I coordinate deliveries.'}
    },
    ...overrides
  };
}

const good=deterministicLessonChecks({context:{targetLevel:'B2'},lesson:lesson()});
assert.equal(good.length,0,'A valid Northstar lesson should pass deterministic preflight.');

const badAnswer=lesson();
badAnswer.questions[0].answer='Something else';
const answerIssues=deterministicLessonChecks({context:{targetLevel:'B2'},lesson:badAnswer});
assert(answerIssues.some(x=>x.id==='det_answer_not_in_options'&&x.severity==='Critical'),'Invalid answer key must be Critical.');

const numericAnswer=lesson();
numericAnswer.questions[0].answer=0;
assert(!deterministicLessonChecks({context:{targetLevel:'B2'},lesson:numericAnswer}).some(x=>x.id==='det_answer_not_in_options'),'Numeric answer indexes must be supported.');

const duplicate=lesson();
duplicate.questions[0].options=['Deliveries','Deliveries','Hotel rooms'];
const duplicateIssues=deterministicLessonChecks({context:{targetLevel:'B2'},lesson:duplicate});
assert(duplicateIssues.some(x=>x.id==='det_duplicate_options'&&x.severity==='Major'),'Duplicate options must be Major.');

const noAudio=lesson({audioScript:''});
assert(deterministicLessonChecks({context:{targetLevel:'B2'},lesson:noAudio}).some(x=>x.id==='det_missing_listening'&&x.severity==='Critical'),'Missing listening source must be Critical.');

const shallow=lesson();
shallow.questions=shallow.questions.filter(x=>!String(x.tag).startsWith('reading:3')&&!String(x.tag).startsWith('listening:3'));
const shallowIssues=deterministicLessonChecks({context:{targetLevel:'B2'},lesson:shallow});
assert(shallowIssues.some(x=>x.id==='det_reading_depth'&&x.severity==='Major'),'Shallow reading must be Major.');
assert(shallowIssues.some(x=>x.id==='det_listening_depth'&&x.severity==='Major'),'Shallow listening must be Major.');

const placeholder=lesson({readingText:'TODO replace me'});
assert(deterministicLessonChecks({context:{targetLevel:'B2'},lesson:placeholder}).some(x=>x.id==='det_no_placeholders'&&x.severity==='Critical'),'Placeholder residue must be Critical.');

const sampleChecks=[
 {id:'a',domain:'Alignment',severity:'Minor',status:'REVIEW',review:true},
 {id:'b',domain:'Language Quality',severity:'Major',status:'REVIEW',review:true},
 {id:'c',domain:'Assessment Validity',severity:null,status:'PASS',review:false}
];
const amber=releaseFrom(sampleChecks);
assert.equal(amber.releaseState,'AMBER','Major review must produce AMBER.');
const profile=buildDomainProfile(sampleChecks);
assert.equal(profile['Language Quality'].status,'AMBER','Domain profile must expose AMBER.');
assert.deepEqual(Object.keys(profile),QUALITY_DOMAINS,'All six quality domains must always be present.');

const weakFail={id:'weak',critical:true,blocking:false,status:'REVIEW',review:true,rawChoice:'fail',evidence:0.30};
const meaningfulFail={id:'meaningful',critical:true,blocking:false,status:'REVIEW',review:true,rawChoice:'fail',evidence:0.50};
const weakPass={id:'weak-pass',critical:true,blocking:false,status:'REVIEW',review:true,rawChoice:'pass',evidence:0.20};
assert.equal(issueSeverity(weakFail),'Minor','Weak Jev fail evidence must stay advisory.');
assert.equal(issueSeverity(meaningfulFail),'Major','Meaningful Jev fail evidence must require review.');
assert.equal(issueSeverity(weakPass),'Minor','Low-confidence pass should not make a lesson AMBER.');
assert.equal(MAJOR_REVIEW_MIN_EVIDENCE,0.40);
assert.equal(FIREWALL_VERSION,'jev-semantic-firewall-v3.1');
assert.equal(LESSON_QUALITY_AUDIT_VERSION,'englishgate-lesson-quality-v1');

console.log('LESSON QUALITY FIREWALL QA PASSED: deterministic checks, severity, six domains, and release-state logic are stable.');
