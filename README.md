# Fluency First Digital Workbook — V2

A mobile-first companion application for the English Communication & Career Fluency course. Live lessons remain speaking-first; the digital workbook strengthens vocabulary, grammar, listening and writing and converts practice evidence into teacher revision priorities.

## V2 features

- Week 1 fully digitised: Lessons 1–3
- Student username/password demo access
- Teacher-created student accounts in local prototype storage
- Vocabulary, listening, grammar, writing and review steps
- Attempt history with skill/subskill tags
- Student mastery, completion and private weakness detection
- Teacher roster, student detail review and password reset prototype
- Class-wide weakness map and revision recommendation
- Improvement/participation leaderboard
- Mobile and desktop layouts using familiar LMS patterns

## Demo accounts

- Teacher: `teacher` / `teacher123`
- Student: `student` / `student123`

## Important security note

This GitHub Pages version uses browser localStorage so the interaction model can be tested. It is not the production authentication system. Do not use it for real student credentials.

See `supabase-schema.sql` and `BACKEND_SETUP.md` for the production data model and migration plan.
