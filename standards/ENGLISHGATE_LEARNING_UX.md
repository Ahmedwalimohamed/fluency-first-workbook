# EnglishGate Learning UX Standard v1

## Purpose
This standard defines how EnglishGate learning activities should feel and behave. It complements curriculum standards such as `B2_LIVING_STANDARD.md`; it does not replace CEFR, lesson-content, grading, or assessment contracts.

## Core learning UX rule
At every moment, the learner should be able to answer four questions without guessing:
1. What am I learning?
2. What do I need to do now?
3. Did I do it correctly?
4. What should I do next?

## Lesson structure
A lesson should have a stable, predictable shell even when activity types differ.

Recommended shell:
1. Lesson title + Can-Do outcome
2. Compact progress/status
3. Activity navigation
4. Current activity content
5. Feedback/correction
6. Previous / Next lesson-action controls
7. Reflection/performance task where curriculum requires it

Do not force learners to rediscover navigation on every skill tab.

## Activity tabs
Reading, Listening, Grammar, Vocabulary, Writing, and Speaking must be separate activity destinations when they contain independent content/questions.

Rules:
- Each tab owns its instructions, content, questions, attempts, and completion state.
- Switching tabs must not silently erase answers.
- Active tab must be visually and programmatically clear.
- Tabs on phones may scroll horizontally only inside the tab strip, never by making the whole page overflow.
- If there are too many tabs for a usable phone tab strip, use a compact selector or segmented overflow pattern.

## Question experience
Every question should use a consistent Question Card pattern.

A Question Card contains only what the learner needs:
- question number/progress when useful
- prompt
- stimulus/context when required
- response control
- submit/check action when required
- post-attempt feedback

Do not attach generic labels such as Build / Correct / Apply to every question unless those labels are pedagogically meaningful for that specific task.

### Navigation between questions
- Learners must be able to move Next and Back after answering unless an assessment rule explicitly prohibits it.
- On phones, Next/Back actions must remain easy to reach without covering content.
- Preserve answers when moving between questions.
- Show progress such as `3 of 8` when the learner is working sequentially.
- Do not automatically jump away before the learner can understand feedback.

### Correct/incorrect feedback
After an attempt:
- state whether the answer is correct/incorrect using text plus visual cue
- explain the correction when useful
- reveal the correct answer only according to assessment rules
- keep the learner's original response visible when pedagogically useful
- offer the next useful action: Try again, Review, Boost Grammar, Next question

## Boost Grammar
Boost Grammar is remediation, not punishment.

Trigger after relevant grammar mistakes. It should:
1. collect the specific missed grammar pattern(s)
2. show a very short explanation/example
3. provide a focused retry/retest
4. return the learner to the lesson with updated status

Avoid sending the learner through unrelated grammar content.

## Grammar micro-lessons
Student-facing grammar explanations should normally take under five minutes and focus on one usable language problem.

Recommended sequence:
1. Goal in plain language
2. One short model/context
3. Notice the pattern
4. Tiny rule/explanation
5. Controlled check
6. Communicative application
7. Feedback

The outcome is use, not naming the rule.

## Reading
- Passage and questions must be visually distinct but obviously connected.
- Reading width must support comfortable sustained reading.
- Avoid tiny text, very wide paragraphs, and dense walls of content.
- Questions should test the curriculum-required comprehension level; UI must not turn them into confusing puzzle interactions.
- Learners should be able to refer back to the passage while answering.
- On large screens, passage + question panel may coexist if both remain readable.
- On small screens, prefer a clear switch/anchor pattern rather than squeezing two columns.

## Listening
Listening is its own activity and must include its own questions.

Audio player requirements:
- Play/pause has a large accessible target.
- Current/total time is understandable.
- Replay is easy.
- Playback state is visually obvious.
- Loading/error states are explicit.
- Do not autoplay lesson audio unexpectedly.
- Transcript visibility follows the lesson's pedagogical intent.
- If pronunciation/audio accent is prescribed by EnglishGate, preserve that standard consistently.

## Vocabulary
Vocabulary interactions should help the learner understand and use words.

Each vocabulary item may expose:
- word/phrase
- accurate learner-friendly meaning
- contextual example
- pronunciation audio where available
- useful chunk/collocation where relevant

No placeholder, circular, or fake definitions. Clicking/tapping a vocabulary item should show meaning without disrupting lesson position.

## Writing
- Writing space must be large enough to compose comfortably on phone and desktop.
- Keep task instructions visible or easy to reopen.
- Provide word-count/status only when it serves the task.
- Preserve drafts safely.
- Disable copy/paste only where EnglishGate explicitly requires authentic production; explain the restriction rather than silently blocking interaction.
- Auto-graded preparation tasks and authentic teacher-graded writing must be visually distinct.
- After submission, clearly show status: submitted, auto-graded, awaiting teacher, reviewed.
- If sharing to My Writings is allowed, ask explicitly after the task is complete.

## Speaking
Speaking tasks need a simple recording loop:
1. prompt
2. record
3. visible recording state/timer
4. stop
5. playback
6. retry if allowed
7. submit/continue

Never leave the learner uncertain whether recording has started or been saved.

## Pronunciation
- Audio example controls must be accessible to both teacher and student where intended.
- Feedback should prioritize intelligibility and the lesson target rather than presenting false precision.
- Do not imply machine pronunciation scores are equivalent to a certified human assessment unless that is actually validated.

## Lesson visuals
EnglishGate lesson visuals are contextual learning media, not decoration.

Rules:
- meaningful alt text is required
- visuals should support topic activation/comprehension
- preserve appropriate aspect ratio and reserve layout space to prevent shifting
- avoid text-heavy images when the same text can be rendered accessibly in HTML
- the same underlying lesson visual should not be duplicated inconsistently across Reading/Listening views

## Teacher lesson player
Teacher and student should see the same core lesson content source, while the teacher receives presentation controls.

Teacher-only controls may include:
- pointer
- highlighter
- text annotation
- full-screen Present mode
- spotlight reading/question content
- vocabulary example support

Controls must not cover lesson content. Present mode must prioritize projected readability and remove irrelevant management chrome.

## Student progress
Progress should distinguish:
- not started
- in progress
- completed
- needs review
- optional upgrade/retry where relevant

Do not conflate course completion with CEFR performance demonstrated when curriculum standards distinguish them.

## Existing learners and upgraded lessons
When lesson content changes:
- preserve prior completion, scores, attempts, and writing when the curriculum contract requires it
- make optional redo/upgrade states understandable
- do not imply a learner failed merely because improved content is now available

## Motivation
Allowed:
- mastery evidence
- progress
- completion milestones
- useful streaks where appropriate
- profile/leaderboard recognition
- authentic community publishing

Avoid:
- childish confetti overload
- casino-like reward patterns
- artificial urgency
- excessive badges that compete with learning

## Error recovery
Learning state should be resilient:
- draft answers should survive accidental navigation where feasible
- failed network saves should clearly offer retry
- do not discard a long writing/speaking task because one request failed
- explain when an attempt cannot be restored

## Publication gate
A learner-facing change must not ship if it creates any of the following:
- hidden or clipped learning content
- whole-page horizontal scrolling on phone
- inaccessible core interaction
- lost answers when navigating normally
- unclear correct/incorrect state
- Reading/Listening content-question mismatch
- controls covering learning material
- a destructive/reset action without warning
- a duplicate visual/interaction pattern when a shared EnglishGate pattern already exists
