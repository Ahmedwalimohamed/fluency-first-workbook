# EnglishGate A2 Elementary — Living Standard v1

## Purpose
A2 Elementary is rebuilt from the original EnglishGate A2 content spine — the same 22 topics, A2 grammar sequence, vocabulary banks, and real-life scenarios — using the quality architecture established by the B2 Living Standard.

**Old A2 content strengths + B2 quality architecture = New A2.**

A2 remains A2 in language difficulty.

## Lesson progression
Every lesson moves through:
1. **Foundation** — familiar language and support.
2. **A2 Lift** — connected sentences, reasons, interaction, pronunciation, and simple mediation.
3. **A2 Performance** — a meaningful everyday communication task with decreasing support.

## Required lesson fields
Every lesson includes:
- stable ID `su-a2-l1`–`su-a2-l22`
- the original 22-topic sequence
- Can-Do outcome
- Foundation
- A2 Lift
- A2 Performance
- pronunciation focus
- mediation move
- 3+ communicative functions
- 3+ discourse/interaction targets
- exactly 6 core vocabulary items
- 4+ chunks/collocations
- 3+ interaction expressions
- 10 vocabulary activities
- 4+ reading questions
- 4+ listening questions
- 6+ contextual grammar questions
- 12 writing-preparation activities from the shared EnglishGate engine
- one authentic real-life A2 writing task

## Receptive progression
Minimum floors:
- Lessons 1–7: reading 75+ words; listening 60+ words
- Lessons 8–14: reading 100+ words; listening 65+ words
- Lessons 15–22: reading 130+ words; listening 85+ words

Longer input must remain A2-accessible and purposeful.

## Original content preservation
The original A2 topic and grammar sequence remains the source of truth. Original Lesson 1 vocabulary is preserved:
**hobby, hometown, occupation, outgoing, married, single**.

## Vocabulary
Definitions must be real and usable. Practice includes meaning, retrieval, context, recall, application, and natural examples.

## Reading & listening
Reading and listening are separate sources. Each has factual questions plus accessible higher-order processing such as main idea, reason, inference, decision, or result.

## Grammar
Grammar follows the original A2 sequence. Questions must test meaning in context and allow students to justify why the answer is correct.

## Writing
The shared engine keeps:
- 3 Sentence Building
- 3 Sentence Combining
- 3 Error Correction
- 3 Paragraph Ordering
- 1 authentic real-life writing task

A2 writing remains formative rather than using the B2 teacher-checkpoint system.

## Live lesson order
1. Warm Up / Foundation
2. Vocabulary
3. Reading + A2 Lift
4. Language Focus
5. Listening + Mediation
6. Fluency Mission
7. Classroom Challenge
8. Reflection

Reflection is last. There is no Homework stage.

## Existing learners
This is a content upgrade, not a reset:
- standalone course ID remains `speakup-a2` with lesson IDs `su-a2-l1`–`su-a2-l22`
- the original/legacy A2 pathway remains `speakup-a2-b1` with lesson IDs `su-a2b1-l1`–`su-a2b1-l22`
- both pathways use the rebuilt A2 Living Standard content without renumbering their existing lesson identities
- existing completion, scores, attempts, writings, enrollments, and student records remain attached to the same identities

## QA
`npm run qa:cefr` blocks production if A2 fails its Living Standard contract: stable IDs, original spine, missing progression fields, weak receptive input, invalid questions, missing vocabulary/chunks/interaction, weak grammar, missing authentic writing, placeholder content, or missing A2 Lift/pronunciation/mediation in the live book.
