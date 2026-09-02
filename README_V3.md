# Fluency First Digital Workbook

V3 adds a Railway-hosted Node API and PostgreSQL persistence while keeping the original GitHub Pages prototype at the repository root.

## Production architecture
- Railway Node/Express service (`server.js`)
- Railway PostgreSQL (`DATABASE_URL`)
- HTTP-only JWT session cookie
- bcrypt password hashing
- Teacher-created username/password accounts
- Persistent attempts, completion, writing and points
- Teacher-only account creation and password reset

## Required Railway variables
`DATABASE_URL`, `JWT_SECRET`, `TEACHER_USERNAME`, `TEACHER_PASSWORD`, `TEACHER_NAME`. Optional demo student variables: `DEMO_STUDENT_USERNAME`, `DEMO_STUDENT_PASSWORD`, `DEMO_STUDENT_NAME`.

The Railway app serves the API-connected frontend from `/public`.
