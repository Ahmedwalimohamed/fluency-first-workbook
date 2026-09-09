# EnglishGate CEFR Level Population Standard v1

## Scope

This standard governs the standalone EnglishGate books for A1, A2, B1, B2 and C1. B2 remains the reference implementation. This population pass adds standalone A1, A2, B1 and C1 books without replacing the existing A2 → B1 or career books.

Each standalone level uses the same 22-topic spine so teachers and administrators can understand progression consistently across the ladder.

## Stable IDs

- A1 course: `speakup-a1`; lessons: `su-a1-l1`–`su-a1-l22`
- A2 course: `speakup-a2`; lessons: `su-a2-l1`–`su-a2-l22`
- B1 course: `speakup-b1`; lessons: `su-b1-l1`–`su-b1-l22`
- B2 course: `speakup-b2`; existing IDs remain unchanged
- C1 course: `speakup-c1`; lessons: `su-c1-l1`–`su-c1-l22`

Do not reuse or renumber these IDs after students begin producing evidence.

## Live lesson order

Every new standalone level uses this order: Warm Up → Vocabulary → Reading → Language Focus → Listening → Fluency Mission → Classroom Challenge → Reflection.

Reflection is always the last stage. There is no Homework stage. The Classroom Challenge is completed during the live class and uses the matching auto-graded Grammar workbook questions. Students must justify why a checked answer matches the intended meaning and repair incorrect answers.

## Workbook experience

Every lesson uses the existing four workbook stages: Vocabulary, Listening & Reading, Grammar and Writing.

The shared EnglishGate activity engine remains the interaction source of truth:
- Vocabulary: meaning, context, collocation and spaced retrieval
- Grammar: context, meaning-to-grammar, transformation and error correction
- Writing preparation: 12 auto-graded questions — 3 Sentence Building, 3 Sentence Combining, 3 Error Correction and 3 Paragraph Ordering — followed by one authentic writing task
- Drafts remain resumable after interruption or connectivity loss

## Level progression

**A1** — short supported exchanges, high-frequency language, simple reading/listening and short practical messages.

**A2** — governed by `A2_LIVING_STANDARD.md`: the original A2 content spine rebuilt with Foundation → A2 Lift → A2 Performance, stronger receptive input, contextual grammar, pronunciation, mediation, and authentic writing.

**B1** — independent communication, connected discourse, reasons, examples, follow-up questions and basic mediation.

**B2** — governed by `B2_LIVING_STANDARD.md`.

**C1** — precision, register control, qualification, synthesis, evidence-based reasoning and audience-aware mediation.

The course label is the destination. Activities may begin below the destination level when scaffolding is required, then increase independence and complexity.

## Assessment

- A1 and A2 objective practice remains auto-graded.
- B1 and C1 authentic writing checkpoints occur at Lessons 5, 10, 15, 18 and 22 and are teacher-reviewed.
- Course completion is not automatically proof that the CEFR performance standard has been demonstrated.
- Existing students are never reset simply because content is upgraded.

## Blocking QA

`npm run qa:cefr` blocks startup if a new standalone level is incomplete. It checks the four new level books, 22-lesson counts, lesson numbering, the Classroom Challenge → Reflection ending, removal of Homework, vocabulary rows, placeholder content, workbook registration and backend book metadata.
