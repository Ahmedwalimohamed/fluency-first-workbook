# Fluency First Digital Workbook — MVP

A mobile-first prototype for an EnglishGate Fluency First course.

## Learning design

The live class remains speaking-first. The digital workbook handles independent vocabulary, listening, grammar, writing and review so the teacher can use live time for interaction, feedback and fluency.

The first prototype lesson is based on the supplied **English Communication & Career Fluency** Week 1 material: starting point, conversation-rescue expressions, complete simple sentences, a short listening model, an independent writing goal, and preparation for a two-minute speaking baseline.

## Prototype features

- Familiar username/password sign-in flow
- Student dashboard
- Vocabulary → listening → grammar → writing → review lesson path
- Browser speech synthesis for the prototype listening activity
- Automatic scoring and skill mastery
- Private student weakness recommendation
- Teacher class dashboard
- Class-wide weakness map and revision recommendation
- Progress reporting
- Improvement/participation-based leaderboard
- Mobile bottom navigation and desktop sidebar following familiar LMS conventions

## Demo accounts

- Student: `student` / `student123`
- Teacher: `teacher` / `teacher123`

## Important security note

This GitHub Pages version is a **front-end learning prototype**. The demo credentials and sample learner records are intentionally local and are **not production authentication**.

Before real students use the system, connect a backend such as Supabase/Neon with:

1. hashed passwords / secure auth,
2. teacher-owned classes,
3. student account creation and password reset,
4. per-attempt activity records,
5. tagged skills/subskills/difficulty,
6. writing submissions and teacher feedback,
7. role-based access control,
8. server-generated reports and leaderboard points.

Teachers should be able to reset student passwords, not read stored passwords.

## Next build phase

1. Convert Week 1 Lessons 1–3 into structured curriculum data.
2. Add secure database/authentication.
3. Save question-level attempts and weakness tags.
4. Add teacher student-detail pages.
5. Add spaced review queues (Day 2 / Day 7 / Day 21).
6. Expand the engine across the 36-lesson A2+/B1 Career Fluency course, then reuse it for the B2 SpeakUp course.
