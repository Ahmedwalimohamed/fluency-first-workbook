(()=>{
'use strict';

const LESSON_ID='su-b2-l24';
const LESSON_NUMBER=24;

const vocabItems=[
 {type:'choice',q:'Fatima says: “Moving from nursing into hospital management completely changed the direction of my career.” Which lesson phrase best describes this event?',options:['professional growth','turning point','responsibility','impact'],answer:'turning point',tag:'vocabulary:context'},
 {type:'choice',q:'Which sentence uses “take initiative” naturally?',options:['Ali took initiative and suggested a better reporting system.','Ali took initiative from his manager every Friday.','Ali made an initiative his career.','Ali was initiative for three years.'],answer:'Ali took initiative and suggested a better reporting system.',tag:'vocabulary:usage'},
 {type:'choice',q:'You learned communication skills while working in customer service. Now those skills help you manage staff. What kind of skills are they?',options:['transferable skills','transitions','impacts','career paths'],answer:'transferable skills',tag:'vocabulary:situation'},
 {type:'choice',q:'“The training programme had a positive ______ on staff confidence.”',options:['transition','progression','impact','path'],answer:'impact',tag:'vocabulary:context'},
 {type:'choice',q:'Which sentence best describes career progression?',options:['I have gradually moved into roles with more responsibility.','I arrive at work at 8:00 every morning.','I changed my office last week.','I completed one report yesterday.'],answer:'I have gradually moved into roles with more responsibility.',tag:'vocabulary:usage'},
 {type:'choice',q:'Interviewer: “What did you learn from managing your first team?” Candidate: “It contributed greatly to my ______ because I became more confident in leadership.”',options:['professional growth','career path','transition','responsibility'],answer:'professional growth',tag:'vocabulary:situation'}
];

const grammarItems=[
 {q:'“I ______ the company in 2021.”',options:['joined','have joined','have been joining','join since'],answer:'joined',tag:'grammar:past-simple'},
 {q:'“Since becoming a supervisor, I ______ much more confident.”',options:['became yesterday','have become','become last year','have becoming'],answer:'have become',tag:'grammar:present-perfect'},
 {q:'“I have worked in education ______ 2023.”',options:['for','since','during','from ago'],answer:'since',tag:'grammar:since'},
 {q:'Interviewer: “Have you ever managed a project?” Which answer is most natural?',options:['Yes, I managed one last year.','Yes, I have manage one.','Yes, I am managing yesterday.','Yes, I have managed last year.'],answer:'Yes, I managed one last year.',tag:'grammar:experience'},
 {q:'Which version turns the task into a stronger achievement?',options:['I prepared weekly reports.','I prepared weekly reports, which helped the team identify delivery delays earlier.','Weekly reports are reports.','I was the greatest report writer.'],answer:'I prepared weekly reports, which helped the team identify delivery delays earlier.',tag:'grammar:result-clause'},
 {q:'Which sentence would be most appropriate in a professional interview?',options:['I completely transformed the entire organisation.','I helped redesign our branch reporting system, which reduced duplication.','Nobody could do the job except me.','Everything improved because of me.'],answer:'I helped redesign our branch reporting system, which reduced duplication.',tag:'grammar:credible-claim'}
];

const questions=[
 {q:'What is the main purpose of Yusuf’s story?',options:['To show how he learned to describe career growth through evidence and impact','To explain how delivery trucks work','To complain about his colleagues','To advertise the logistics company'],answer:'To show how he learned to describe career growth through evidence and impact',tag:'reading:gist'},
 {q:'What recurring problem did Yusuf notice?',options:['Drivers received schedule changes through several channels and sometimes missed them.','The company did not have enough vehicles.','Customers stopped ordering deliveries.','His manager refused to prepare reports.'],answer:'Drivers received schedule changes through several channels and sometimes missed them.',tag:'reading:detail'},
 {q:'What did Yusuf do after identifying the problem?',options:['He created and tested a shared daily dispatch sheet.','He waited for management to solve it.','He changed companies.','He stopped updating delivery records.'],answer:'He created and tested a shared daily dispatch sheet.',tag:'reading:action'},
 {q:'Which action best demonstrates that Yusuf took initiative?',options:['He noticed the problem and proposed a solution.','He answered normal customer calls.','He received instructions from his manager.','He listed his daily tasks.'],answer:'He noticed the problem and proposed a solution.',tag:'reading:evidence'},
 {q:'Why does Yusuf avoid saying that he “transformed the whole company”?',options:['He wants his career story to remain accurate and credible.','He does not remember what happened.','He dislikes the company.','His project had no effect.'],answer:'He wants his career story to remain accurate and credible.',tag:'reading:inference'},
 {q:'According to the reading, what makes a strong career story?',options:['Connecting experience, evidence, learning and direction','Listing every job title','Using impressive claims','Mentioning only promotions'],answer:'Connecting experience, evidence, learning and direction',tag:'reading:message'},
 {q:'What is Samira mainly describing?',options:['An experience that changed her professional direction','Her daily teaching timetable','A disagreement with her manager','Why she wants to leave education'],answer:'An experience that changed her professional direction',tag:'listening:gist'},
 {q:'What was Samira doing before she coordinated the programme?',options:['Classroom teaching','Banking','School finance','Logistics'],answer:'Classroom teaching',tag:'listening:detail'},
 {q:'What problem did Samira’s programme initially have?',options:['Workshop attendance was inconsistent.','There were no teachers.','The school cancelled the programme.','She had no classroom.'],answer:'Workshop attendance was inconsistent.',tag:'listening:problem'},
 {q:'What did Samira and the team do?',options:['They changed the schedule and made the sessions more practical.','They stopped the workshops.','They replaced all the teachers.','They shortened the school year.'],answer:'They changed the schedule and made the sessions more practical.',tag:'listening:response'},
 {q:'When Samira says the “bigger result” was professional growth, what does she mean?',options:['The experience developed her own skills and confidence as well as improving attendance.','The programme earned more money.','She received a larger classroom.','More students joined the school.'],answer:'The experience developed her own skills and confidence as well as improving attendance.',tag:'listening:meaning'},
 {q:'Why is Samira now interested in education management?',options:['She discovered that she enjoys developing systems and supporting other teachers.','She no longer likes education.','She wants to avoid working with teachers.','Her manager told her she must change careers.'],answer:'She discovered that she enjoys developing systems and supporting other teachers.',tag:'listening:implication'}
];

const writingTasks=[
 {prompt:'Tell your career story in 120–150 words. Include where you started, one turning point, something you did, the result or impact, what you learned, and how the experience influenced your future direction. Use at least two lesson vocabulary expressions, one Past Simple sentence, two Present Perfect forms, and one clear action → result statement. If you do not have formal work experience, use study, volunteering, community work, an internship, or a personal project.',minWords:120,maxWords:150,authentic:true,autoGrade:false,tag:'writing:authentic-transfer'}
];

try{
 const wb=globalThis.BOOK_PACKS?.['speakup-b2'];
 if(!wb||!Array.isArray(wb.lessons))return;
 const index=wb.lessons.findIndex(l=>l?.id===LESSON_ID||Number(l?.number)===LESSON_NUMBER);
 if(index<0)return;
 const current=wb.lessons[index];
 wb.lessons[index]={
   ...current,
   workbookVersion:'pilot-25-v2',
   workbookMode:'approved-pilot-exact',
   vocabulary:{...(current.vocabulary||{}),items:vocabItems},
   grammar:{...(current.grammar||{}),items:grammarItems},
   listening:{...(current.listening||{}),questions},
   writing:{...(current.writing||{}),tasks:writingTasks}
 };
 globalThis.ENGLISHGATE_LESSON24_WORKBOOK_VERSION='pilot-25-v2';
}catch(err){console.warn('Lesson 24 approved pilot workbook replacement failed',err)}
})();
