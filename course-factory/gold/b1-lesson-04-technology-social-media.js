'use strict';

const { CONTRACT_VERSION } = require('../lesson-contract');

const lesson = {
  contractVersion: CONTRACT_VERSION,
  id: 'b1-gold-l4',
  level: 'B1',
  lessonNumber: 4,
  title: 'Technology & Social Media',
  sourceGoldenLesson: 'B2 Lesson 4 · Technology & Social Media',
  status: 'gold-pilot',
  productionActivation: false,

  clonePolicy: {
    architectureOnly: true,
    originalContent: true,
    copySourceWording: false,
    note: 'Preserve B2 learning architecture and quality controls; author new B1 language, texts, scripts, prompts and answers.'
  },

  canDo: [
    'I can describe how my use of technology has been changing.',
    'I can explain benefits and problems of social media and give reasons for my opinion.',
    'I can discuss practical ways to manage screen time with other people.'
  ],

  curriculum: {
    functions: [
      'describe an activity continuing up to the present',
      'give and support an opinion',
      'agree and disagree politely',
      'make and negotiate practical suggestions'
    ],
    grammar: {
      focus: 'Present Perfect Continuous',
      form: 'have/has + been + verb-ing',
      meaning: 'Use it for an activity that started in the past and continues now, or a recent repeated activity with a present result.',
      productiveUses: [
        'I have been using my phone less this week.',
        'She has been checking her notifications too often.',
        'We have been trying a no-phone rule at dinner.'
      ],
      contrast: 'Use Present Perfect Simple when the result or completed amount is more important; use Present Perfect Continuous when the activity or duration is the focus.'
    },
    vocabulary: {
      core: ['platform', 'privacy', 'notification', 'screen time', 'distraction', 'settings'],
      stretch: ['algorithm'],
      policy: 'Core words must be understandable from examples and reused productively. Stretch vocabulary must be scaffolded and must not be required for mastery.'
    },
    pronunciation: 'Use sentence stress to make the important content words clear, and use natural thought groups when giving reasons.'
  },

  stages: {
    hook: {
      prompt: 'Think about yesterday. What did you mainly use your phone for: messaging, work or study, entertainment, news, or something else? Give one reason.',
      purpose: 'Activate the learner’s real digital habits before target language is taught.',
      teacherMove: 'Collect two or three short answers without correcting every error; listen for language that can be recycled later.'
    },

    vocabulary: {
      items: [
        { word: 'platform', meaning: 'an online service or app where people communicate or share content', example: 'I use one platform for work messages and another for friends.' },
        { word: 'privacy', meaning: 'control over who can see your personal information', example: 'I changed my privacy options so only friends can see my photos.' },
        { word: 'notification', meaning: 'a message or alert from an app or device', example: 'I turn off notifications while I am studying.' },
        { word: 'screen time', meaning: 'the amount of time you spend looking at a phone, computer, tablet, or television', example: 'My screen time is usually higher at the weekend.' },
        { word: 'distraction', meaning: 'something that takes your attention away from what you should be doing', example: 'Short videos can become a distraction when I need to work.' },
        { word: 'settings', meaning: 'the controls that change how an app or device works', example: 'You can change the notification settings on your phone.' },
        { word: 'algorithm', meaning: 'a set of rules a digital service uses to decide what content to show', example: 'The algorithm often shows me more videos similar to the ones I watch.', stretch: true }
      ],
      recognitionTask: 'Match each word to its meaning, then choose the best word for six short digital-life situations.',
      productionPrompts: [
        'Name one notification you usually keep on and explain why.',
        'Describe one digital distraction you want to reduce.',
        'Say one privacy or settings change you have made or would like to make.'
      ],
      feedback: 'Immediate answer feedback. On an error, explain the meaning in one short sentence and require a retry with a new example.'
    },

    speaking: {
      communicativeGoal: 'Describe a real digital habit, explain how it has been changing, and respond to follow-up questions.',
      openingPrompt: 'How has the way you use your phone or social media been changing recently?',
      followUps: [
        'What has caused that change?',
        'What benefit have you noticed?',
        'What problem are you still having?',
        'What would you recommend to someone with the same problem?'
      ],
      studentTalkTargetSeconds: 75,
      interactionPattern: 'Think → speak → partner/AI follow-up → improve one answer and say it again.',
      successEvidence: [
        'gives at least two relevant details',
        'uses a reason or example',
        'attempts Present Perfect Continuous at least once',
        'responds meaningfully to one follow-up question'
      ]
    },

    reading: {
      title: 'A Quieter Phone, Not No Phone',
      text: `For the last few months, Amina has been using her phone more than she wanted. She needs it for work messages, family groups and online learning, but she noticed that she was opening social media whenever a notification appeared. Even short checks often became twenty minutes of scrolling. She was not planning to stop using social media; she wanted to use it with more control.\n\nTwo weeks ago, Amina changed several settings. She turned off most notifications, moved entertainment apps away from her home screen and set a daily screen-time reminder. She has also been leaving her phone in another room during one hour of evening study. At first, she worried that she would miss something important. In fact, her close family and colleagues can still call her when something is urgent.\n\nThe changes have not solved everything. Amina sometimes ignores the reminder, especially when friends are discussing an interesting topic. However, she says she has been concentrating better and sleeping earlier. Her goal is not to have a perfect digital routine. She wants to notice when a useful platform becomes a distraction and make a deliberate choice about what to do next.`,
      questions: [
        { id: 'r1', type: 'short', question: 'Why does Amina still need her phone?', answer: 'For work messages, family groups and online learning.', skill: 'detail' },
        { id: 'r2', type: 'short', question: 'What often happened after Amina checked one notification?', answer: 'A short check often became about twenty minutes of scrolling.', skill: 'detail' },
        { id: 'r3', type: 'short', question: 'Name two changes Amina made to her phone or routine.', answer: 'Any two: turned off most notifications; moved entertainment apps; set a screen-time reminder; left the phone in another room during study.', skill: 'detail' },
        { id: 'r4', type: 'mcq', question: 'What was Amina mainly worried about at first?', options: ['Breaking her phone', 'Missing something important', 'Paying for a new platform'], answer: 'Missing something important', skill: 'detail' },
        { id: 'r5', type: 'short', question: 'What two improvements does Amina report?', answer: 'She has been concentrating better and sleeping earlier.', skill: 'detail' },
        { id: 'r6', type: 'short', question: 'What is the main idea of the final paragraph?', answer: 'The goal is controlled, deliberate technology use rather than a perfect or phone-free routine.', skill: 'gist-inference' }
      ]
    },

    listening: {
      title: 'Trying a Phone-Free Lunch',
      targetSeconds: 75,
      naturalSpeech: true,
      transcriptUnlockAttempt: 2,
      speedControl: true,
      audioScript: `Last month, three people in our office noticed that lunch had become very quiet because everyone was looking at a phone. We decided to try one small change: during lunch, phones stay in bags unless someone is expecting an urgent call. We have been testing the idea for three weeks. At first, a few people felt uncomfortable because they were used to checking messages immediately. Nobody wanted a strict rule, so we agreed that joining the experiment was optional. The interesting thing is that more people have been joining us each week. We have been talking more about our families, weekend plans and problems at work. I still check my phone before lunch and again when I finish. For me, that makes the rule realistic. It does not say that phones are bad. It simply creates a short time when we choose to pay attention to the people sitting with us.`,
      questions: [
        { id: 'l1', type: 'mcq', question: 'Why did the group start the experiment?', options: ['The office internet stopped working', 'Lunch had become quiet because people were using phones', 'They wanted to buy new phones'], answer: 'Lunch had become quiet because people were using phones', skill: 'gist' },
        { id: 'l2', type: 'short', question: 'How long have they been testing the idea?', answer: 'For three weeks.', skill: 'detail' },
        { id: 'l3', type: 'short', question: 'Why did some people feel uncomfortable at first?', answer: 'They were used to checking messages immediately.', skill: 'detail' },
        { id: 'l4', type: 'mcq', question: 'Is the lunch rule compulsory?', options: ['Yes, for everyone', 'Only for managers', 'No, joining is optional'], answer: 'No, joining is optional', skill: 'detail' },
        { id: 'l5', type: 'short', question: 'What has been changing during lunch?', answer: 'More people have been joining and they have been talking more.', skill: 'change-over-time' },
        { id: 'l6', type: 'short', question: 'Why does the speaker think the rule is realistic?', answer: 'Because people can still check phones before and after lunch; it only creates a short phone-free period.', skill: 'reason' }
      ]
    },

    grammar: {
      focus: 'Present Perfect Continuous',
      microBrief: [
        'Form: have/has + been + verb-ing.',
        'Use it when an activity started before now and is still continuing, or when a recent repeated activity explains the present situation.',
        'Common time phrases include for, since, recently, lately and all week.'
      ],
      items: [
        { id: 'g1', prompt: 'I ___ my notifications less often this week.', options: ['am check', 'have been checking', 'checked since'], answer: 'have been checking' },
        { id: 'g2', prompt: 'She ___ a screen-time limit since Monday.', options: ['is tried', 'have been try', 'has been trying'], answer: 'has been trying' },
        { id: 'g3', prompt: 'We ___ phones away during lunch for three weeks.', options: ['have been putting', 'has been putting', 'putting'], answer: 'have been putting' },
        { id: 'g4', prompt: 'How long ___ you ___ that platform?', options: ['are / use', 'have / been using', 'did / been use'], answer: 'have / been using' },
        { id: 'g5', prompt: 'My brother ___ late because he has been watching videos.', options: ['have sleep', 'is been sleeping', 'has been sleeping'], answer: 'has been sleeping' },
        { id: 'g6', prompt: 'They ___ their privacy settings recently.', options: ['has been change', 'have been changing', 'were been changing'], answer: 'have been changing' },
        { id: 'g7', prompt: 'Choose the sentence that focuses most clearly on the ongoing activity.', options: ['I have been reducing my screen time.', 'I reduced my screen time yesterday.', 'I reduce it every Friday.'], answer: 'I have been reducing my screen time.' },
        { id: 'g8', prompt: 'Complete naturally: “Since I turned off notifications, I ___.”', type: 'open', answerGuide: 'A meaningful Present Perfect Continuous clause, e.g. “have been concentrating better.”' }
      ],
      transferPrompts: [
        'Say one digital habit you have been trying to change.',
        'Ask another learner how long they have been using one platform.',
        'Explain one present result of something you have been doing recently.'
      ],
      boost: {
        trigger: 'grammar mastery below 80%',
        content: 'Short form-and-meaning repair focused only on have/has been + -ing and for/since, followed by a new transfer item.'
      }
    },

    writing: {
      realLifeFormat: 'social post',
      wordRange: [80, 120],
      prompt: 'Write a short social post about one digital habit you have been changing. Explain what you were doing before, what you have been doing differently, and one result. Finish with one practical suggestion or question for readers.',
      builder: [
        'My old habit was…',
        'Recently, I have been…',
        'This has helped / caused…',
        'One thing I still find difficult is…',
        'My suggestion / question is…'
      ],
      successCriteria: [
        '80–120 words',
        'clear description of the changed habit',
        'at least one accurate or intelligible Present Perfect Continuous attempt',
        'one reason, result or example',
        'appropriate social-post tone and a useful closing suggestion or question'
      ],
      feedbackOrder: ['meaning and task completion', 'organisation', 'target grammar', 'high-value vocabulary', 'spelling/punctuation'],
      unlockRule: 'Writing unlocks after the scored pre-writing activities reach the 80% mastery threshold.'
    },

    fluencyMission: {
      title: 'Digital Life Committee · B1',
      scenario: 'Your class or team wants technology to help people without controlling their attention. Agree on three realistic digital-use rules for one week.',
      outcome: 'The group agrees on three rules and can explain why each rule is realistic and useful.',
      requirements: [
        'propose at least one rule',
        'give at least one reason or example',
        'use Present Perfect Continuous at least twice across the discussion',
        'agree or disagree politely at least once',
        'respond to at least one follow-up or alternative suggestion'
      ],
      languageSupport: [
        'I think we should… because…',
        'We have been spending too much time…',
        'That makes sense, but…',
        'What if we…?',
        'I agree with that because…'
      ],
      repeatAfterFeedback: true,
      exitTask: 'In 30–45 seconds, defend the best rule and explain what problem it is designed to solve.'
    }
  },

  helpMePractice: {
    topicBound: true,
    handsFreeAfterStart: true,
    openingQuestion: 'How has your use of your phone or social media been changing recently?',
    allowedIntents: [
      'describe a digital habit',
      'explain a benefit or problem',
      'give a reason or example',
      'make a suggestion',
      'respond to a relevant follow-up'
    ],
    targetLanguage: [
      'Present Perfect Continuous for recent/ongoing activity',
      'technology and social-media core vocabulary',
      'because / so for reasons and results',
      'polite agreement and disagreement'
    ],
    disallowedBehavior: [
      'random off-topic conversation',
      'long teacher monologues',
      'correcting every error while the learner is speaking',
      'requiring another microphone tap after every AI turn'
    ],
    interventionPolicy: 'Continue when meaning is clear; clarify when meaning is unclear; recast only high-value errors; ask one short follow-up at a time.',
    completionEvidence: [
      'learner gives at least three on-topic turns',
      'learner gives at least one reason/example',
      'learner attempts the target grammar',
      'learner responds to at least one follow-up'
    ]
  },

  mastery: {
    threshold: 0.8,
    scoredAreas: ['vocabulary', 'reading', 'listening', 'grammar'],
    writingUnlockAtThreshold: true,
    boostWeakAreaOnly: true,
    belowThresholdAction: 'Open only the lowest-performing area Boost, then recheck with new items.',
    aboveThresholdAction: 'Unlock writing and keep the learner moving toward the Fluency Mission.'
  },

  reporting: {
    activityEvidence: true,
    submissions: true,
    aiPracticeUsage: true,
    progressSummary: true,
    fields: [
      'activity attempts and scores',
      'reading/listening evidence kept separate',
      'writing submission and feedback',
      'Help Me Practice used/not used, minutes/turns and completion evidence',
      'Fluency Mission evidence',
      'weak-area Boost recommendation'
    ]
  },

  semanticQa: {
    engine: 'Jev + TypeSafe bounded semantic review',
    questions: [
      'Is the overall linguistic demand genuinely B1 rather than simplified B2 or advanced A2?',
      'Do the reading questions have clear answers supported by the reading text?',
      'Do the listening questions have clear answers supported by the audio script?',
      'Are distractors plausible but unambiguously wrong?',
      'Does every productive task support at least one stated can-do outcome?',
      'Is Present Perfect Continuous taught for meaning and then transferred into communication?',
      'Does Help Me Practice remain within the lesson topic and target language without becoming a random conversation bot?',
      'Does the Fluency Mission require a meaningful decision or outcome rather than display-only language practice?'
    ],
    failClosed: true,
    publishRule: 'Do not promote to a level-wide Gold override until deterministic QA passes, Jev semantic review is acceptable, and a teacher human review signs off.'
  }
};

module.exports = lesson;
