'use strict';

const base = require('./b1-lesson-04-technology-social-media.js');
const lesson = structuredClone(base);

lesson.qualityReview = {
  version: 'teacher-review-v1',
  status: 'revised-after-jev-review',
  rationale: [
    'Keep Present Perfect Continuous at B1 because the lesson uses it for familiar ongoing habits and recent change, not abstract analysis.',
    'Keep algorithm as optional stretch vocabulary only.',
    'Keep productive outcomes personal and practical: habits, reasons, suggestions and negotiated rules.',
    'Use plausible distractors based on common learner confusions or near-miss comprehension, not joke answers.',
    'Treat target-grammar use as evidence, not as the communicative purpose of the Fluency Mission.'
  ],
  humanTeacherReviewRequiredBeforeProduction: true
};

lesson.curriculum.grammar.b1Boundary = 'At B1, learners need to understand and attempt the Present Perfect Continuous for familiar ongoing/recent activities. Fine-grained contrast with the Present Perfect Simple is supportive noticing, not an independent mastery target.';
lesson.curriculum.grammar.contrast = 'Notice the useful difference: the simple form often highlights a result, while the continuous form often highlights an activity or duration. In this lesson, learners are assessed mainly on communicating an ongoing or recent activity clearly.';

lesson.stages.reading.questions = lesson.stages.reading.questions.map(item => {
  if (item.id !== 'r4') return item;
  return {
    ...item,
    options: [
      'Missing something important',
      'Not being able to contact colleagues during work',
      'Having to delete all her social-media accounts'
    ],
    answer: 'Missing something important'
  };
});

lesson.stages.listening.questions = lesson.stages.listening.questions.map(item => {
  if (item.id === 'l1') {
    return {
      ...item,
      options: [
        'Lunch had become quiet because people were using phones',
        'People were receiving too many work calls during lunch',
        'The lunch break had become too short for conversation'
      ],
      answer: 'Lunch had become quiet because people were using phones'
    };
  }
  if (item.id === 'l4') {
    return {
      ...item,
      options: [
        'No, joining is optional',
        'Yes, except for people expecting an urgent call',
        'Yes, but only for people who use social media at lunch'
      ],
      answer: 'No, joining is optional'
    };
  }
  return item;
});

lesson.stages.grammar.items = [
  {
    id: 'g1',
    prompt: 'I ___ my notifications too often lately, so I am trying to change the habit.',
    options: ['have checked', 'have been checking', 'has been checking'],
    answer: 'have been checking'
  },
  {
    id: 'g2',
    prompt: 'She ___ a screen-time limit since Monday.',
    options: ['has trying', 'have been trying', 'has been trying'],
    answer: 'has been trying'
  },
  {
    id: 'g3',
    prompt: 'We ___ phones away during lunch for three weeks.',
    options: ['have been putting', 'have putting', 'has been putting'],
    answer: 'have been putting'
  },
  {
    id: 'g4',
    prompt: 'How long ___ you ___ that platform?',
    options: ['are / using', 'have / been using', 'did / been using'],
    answer: 'have / been using'
  },
  {
    id: 'g5',
    prompt: 'My brother ___ badly all week because he keeps watching videos late at night.',
    options: ['has slept', 'has been sleep', 'has been sleeping'],
    answer: 'has been sleeping'
  },
  {
    id: 'g6',
    prompt: 'They ___ their notification settings little by little recently.',
    options: ['has been changing', 'have been changing', 'have changing'],
    answer: 'have been changing'
  },
  {
    id: 'g7',
    prompt: 'Which sentence focuses most clearly on an activity that is still in progress?',
    options: [
      'I have been reducing my screen time.',
      'I reduced my screen time last month.',
      'I have reduced my screen time by two hours.'
    ],
    answer: 'I have been reducing my screen time.'
  },
  {
    id: 'g8',
    prompt: 'Complete naturally: “Since I turned off notifications, I ___.”',
    type: 'open',
    answerGuide: 'A meaningful Present Perfect Continuous clause showing an ongoing/recent activity or effect, e.g. “have been concentrating better.”',
    formativeOnly: true
  }
];

lesson.stages.grammar.transferPrompts = [
  'Say one digital habit you have been trying to change.',
  'Ask another learner how long they have been using one platform or digital tool.',
  'Explain one recent activity that has been affecting your screen time or concentration.'
];

lesson.stages.fluencyMission.requirements = [
  'propose at least one realistic rule',
  'give at least one reason or example',
  'agree or disagree politely at least once',
  'respond to at least one follow-up or alternative suggestion',
  'help the group reach a final set of three rules'
];
lesson.stages.fluencyMission.languageEvidence = [
  'Use Present Perfect Continuous naturally when describing an ongoing or recent digital habit when relevant.',
  'Use at least one target technology word accurately enough to support the discussion.'
];
lesson.stages.fluencyMission.completionPolicy = 'The communicative outcome is the completion gate. Target-language evidence informs feedback and mastery reporting but does not invalidate a successful group decision by itself.';

lesson.helpMePractice.interventionPolicy = 'Ask one short, B1-friendly follow-up at a time. Continue when meaning is clear; clarify when meaning is unclear; recast only a high-value error that affects the lesson target or intelligibility. Do not turn the exchange into an abstract debate about algorithms, platform ethics or societal harms.';
lesson.helpMePractice.b1Boundary = 'Stay on personal habits, practical benefits/problems, reasons, examples and realistic suggestions. Do not require sustained counterargument, source evaluation or qualified societal claims.';

lesson.semanticQa.teacherReviewFocus = [
  'B1 scope stays personal/familiar rather than B2-style abstract debate.',
  'Present Perfect Continuous is taught as a communicative resource, not a precision-heavy contrast test.',
  'Distractors are plausible but clearly wrong from the supplied context.',
  'Fluency Mission outcome remains the decision itself, not counting grammar forms.'
];

module.exports = lesson;
