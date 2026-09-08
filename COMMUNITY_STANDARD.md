# EnglishGate Community Standard v1

## My Writings
My Writings is the authenticated learner writing community.

- Every saved authentic final writing sample is eligible to appear in the internal feed.
- The feed shows the learner's name, profile picture, class, lesson, writing, date, and thumbs-up count.
- It never exposes usernames, student WhatsApp numbers, passwords, login tokens, or academic grades.
- Students may give one thumbs up to another learner's writing and may remove it later.
- Students cannot like their own writing.
- Likes are encouragement only. They do not change grades, EnglishGate points, completion, reports, or leaderboard performance.
- If an author changes the text of a published writing sample, its previous likes are reset so the count reflects the current version.

## External sharing
External sharing is author-controlled.

- Only the author may create/share a social poster for their writing.
- Other students, teachers, and admins may read the internal post but cannot create an external poster for someone else.
- The poster is 9:16 for mobile social sharing.
- It includes the learner's name, profile picture when available, writing, lesson context, and EnglishGate learning identity.
- It includes the public institution branding:
  - Islamic Online University-Borama
  - 063 325 3947
  - learnenglish.iouborama.com
- It never prints the learner's phone number or username.
- Where the browser supports file sharing, the native share sheet is used. Otherwise the poster is saved so the learner can add it to WhatsApp Status manually.

## Student management
Admin and teacher student-management actions must preserve learning history.

Admin may:
- edit student name, username, and WhatsApp number;
- move a student to any class;
- reset passwords;
- view reports;
- delete student accounts.

Teacher may:
- edit students who belong to their classes;
- move those students only between classes assigned to that same teacher;
- reset passwords;
- view reports.

Moving or editing a student must not delete attempts, completion, writing samples, grades, or existing progress.

## QA
Production must run both:
- `npm run qa:b2`
- `npm run qa:community`

Community QA blocks deployment if privacy boundaries, author-only sharing, role-based transfer restrictions, non-academic likes, or learning-history preservation regress.
