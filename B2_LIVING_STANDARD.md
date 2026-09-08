# EnglishGate B2 Upper Intermediate — Living Standard v1

## Purpose
B2 Upper Intermediate is the reference implementation for future EnglishGate CEFR pathways. It is designed for EFL learners in a non-English-speaking environment.

## Bridge principle
The course label represents the destination, not the difficulty of every activity.

Each lesson must move through:
1. **Foundation** — accessible B1/B1+ language that gets learners communicating quickly.
2. **B2 Lift** — richer language, discourse, pronunciation, interaction, mediation, and reasoning.
3. **B2 Performance** — a meaningful task that requires increasingly independent communication approaching B2.

## Required lesson fields
Every B2 lesson must include:
- stable lesson id and topic
- Can-Do / performance outcome
- foundation
- B2 lift
- pronunciation focus
- mediation move
- at least 3 communicative functions
- at least 3 discourse/interaction targets
- at least 6 core vocabulary items
- at least 4 chunks/collocations
- at least 3 interaction expressions
- 4 reading questions
- 4 listening questions
- at least 6 contextual B2 grammar questions
- 12 auto-graded writing-preparation questions
- 1 authentic writing task

## Receptive progression
Minimum source lengths used by QA:
- Lessons 1–7: reading 100+ words; listening 70+ words
- Lessons 8–14: reading 140+ words; listening 90+ words
- Lessons 15–22: reading 180+ words; listening 110+ words

Text length is a floor, not a target. Genre and communicative purpose still determine appropriate length.

## Question quality
Reading and listening must include both factual understanding and higher-order processing such as:
- inference
- purpose
- stance
- synthesis
- evaluation
- decision-making
- mediation

B2 grammar questions must test meaning and context, not merely contrast one correct answer with obviously malformed English.

## Vocabulary
Teach:
- core words
- chunks/collocations
- interaction expressions

Vocabulary definitions must be real, specific, and usable. Placeholder or circular definitions are prohibited.

## Writing
Every lesson keeps:
- 3 Sentence Building items
- 3 Sentence Combining items
- 3 Error Correction items
- 3 Paragraph Ordering items
- 1 authentic real-life writing task

Teacher-graded writing checkpoints:
- Lesson 5
- Lesson 10
- Lesson 15
- Lesson 18
- Lesson 22 final assessment

All other writing remains formative.

## Pronunciation
Pronunciation is progressive and communication-focused. It develops stress, rhythm, pausing, thought groups, connected speech, contrastive stress, stance, and intelligibility across the course.

## Mediation
Mediation is introduced gradually. Learners must increasingly be able to:
- relay another person's information
- summarise a source
- explain unfamiliar information
- compare viewpoints
- bridge differences in understanding
- synthesise information for another audience

## Final exit evidence
Lesson 22 is the B2 Performance Showcase and must contain:
- Reading Performance
- Listening Performance
- Interaction Performance
- Spoken Production
- Mediation Performance
- Writing Performance

Completing the course does not automatically mean B2 has been demonstrated. EnglishGate must distinguish **course completion** from **B2 performance demonstrated**.

## QA rule
The QA layer is blocking, not advisory.

A lesson cannot be published if it fails critical checks for:
- missing lesson structure
- incorrect lesson identity
- missing bridge metadata
- insufficient reading/listening input
- invalid auto-graded answers
- missing higher-order comprehension
- missing B2 grammar bank
- missing writing checkpoint rules
- placeholder content
- mismatch between live book and workbook sources
- missing final B2 exit-performance components

The production start process runs `npm run qa:b2` before the application starts.

## Change discipline
Future B2 changes must:
1. preserve stable lesson ids,
2. preserve the 22-topic curriculum,
3. pass `npm run qa:b2`,
4. avoid changing non-B2 books unless a separate task explicitly requires it,
5. update this living standard when the curriculum contract itself changes.
