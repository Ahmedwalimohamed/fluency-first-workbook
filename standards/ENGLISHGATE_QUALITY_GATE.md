# EnglishGate Quality Gate

## Purpose

EnglishGate must stop relying on manual visual checking and one-off fixes. This document defines the minimum quality contract that every release must satisfy.

The Quality Gate has three layers:

1. **Deterministic repo checks** — fast static checks run on every change.
2. **Authenticated product checks** — real Student, Teacher and Admin flows in the deployed app.
3. **Independent AI audit** — iFixAi audits the EnglishGate QA Agent itself so the auditor is not trusted blindly.

A release is not considered healthy because one page looks correct. It is healthy only when the contract below passes without critical failures.

---

## Severity model

- **P0 — Release blocker:** security, authorization, data loss, broken auth, grading corruption, cross-role access.
- **P1 — Learning blocker:** wrong answer key, nonsensical question, missing source/audio, `undefined` feedback, unusable navigation.
- **P2 — UX regression:** covered content, broken responsive layout, weak hierarchy, inaccessible controls.
- **P3 — Polish:** spacing, minor copy, visual consistency.

P0 and P1 failures block release.

---

## Pillar 1 — Curriculum correctness

Every student-facing activity must satisfy all of the following:

- The activity matches its declared skill and CEFR level.
- Reading questions are answerable from the passage.
- Listening questions are answerable from the audio/script and do not expose the transcript before the intended point.
- Vocabulary practice is usage-first. Definitions may appear in the language bank, but graded practice should test contextual use, natural combinations, situation choice, or production.
- Grammar practice tests one clear target and does not contain unrelated labels or scaffolding.
- No placeholder meanings, placeholder examples, fake definitions, or missing examples are rendered as real content.
- No generated question may be accepted merely because its stored answer key matches; the answer must also linguistically fit the prompt.

### Hard failures

- `undefined`, `null`, `[object Object]`, or placeholder text visible to students.
- Correct answer does not fit the sentence/question.
- Reading/Listening question contradicts its source.
- Missing required audio for a Listening activity.

---

## Pillar 2 — Learning UX

- Student UI is mobile-first and usable at 320px width and above.
- Every focused question view shows the activity context/title.
- Students can move Back and Next without losing answers.
- Students can exit question mode and return to the lesson/activity overview.
- Reading and Listening remain separate activities with separate source, questions, drafts and progress.
- Headline hierarchy remains consistent: lesson title → skill/activity title → task subtitle → muted instruction.
- Touch targets are at least 44px where practical.
- Keyboard focus is visible.
- Sticky navigation must not cover content.

---

## Pillar 3 — Assessment integrity

- Correct answers, grading and feedback must come from the same semantic target.
- Feedback must never display missing metadata.
- Correct/incorrect colors are reserved for assessment state, not decoration.
- A student must not receive a correct mark for a linguistically invalid completion.
- Open production tasks must not be presented as fully machine-validated fluency unless the checker actually evaluates language quality.
- Saved answers and progress must survive Back/Next navigation and normal rerenders.

---

## Pillar 4 — Role and system integrity

### Student
- Can access assigned books/classes only.
- Cannot access Teacher/Admin management surfaces.

### Teacher
- Can manage students/classes only within authorized scope.
- Can reset/edit permitted student credentials.
- Cannot perform Super Admin-only operations.

### School Admin
- Can manage authorized school resources and users.
- Cannot cross school boundaries.

### Super Admin
- Can perform global platform management.

### Shared
- Logout clears privileged session context.
- Authentication failures do not expose sensitive details.
- Destructive actions require the correct role and deliberate action.

---

## Pillar 5 — Regression protection

The following are protected invariants and must not silently regress:

- Reading and Listening are separate.
- Question Back/Next navigation remains functional.
- Question Home/exit remains functional.
- Existing B2 learners retain the intended B2 book assignment.
- Vocabulary feedback never renders `undefined` metadata.
- Grammar question UI does not show obsolete Build/Correct/Apply labels.
- Student, Teacher and Admin presentation layers remain scoped to their roles.
- Removing or replacing visual experiments must not leave dead asset references.

---

## Pillar 6 — Release evidence

A release is **PASS** only when:

1. `npm run qa:quality-gate` passes.
2. Existing repo QA scripts relevant to the change pass.
3. The deployment health check passes.
4. At least one authenticated Student regression pass is completed for learning-facing changes.
5. Teacher/Admin regression passes are completed when those areas changed.
6. Any P0/P1 finding is fixed or explicitly blocks release.

A visual screenshot alone is not release evidence.

---

## iFixAi role

iFixAi does not replace this contract. It independently audits the **EnglishGate QA Agent** that reads the repo, inspects lessons, runs tests, proposes fixes and, when explicitly authorized, applies patches.

The QA Agent must be able to:

- read repository/content data;
- run deterministic QA;
- inspect lesson semantics;
- inspect UI/assessment invariants;
- produce evidence-backed findings;
- propose minimal patches;
- refuse destructive or out-of-scope changes without authorization;
- keep an audit trail of findings and changes.

The QA Agent must not be trusted to grade itself as the final authority. iFixAi is the independent audit layer for that agent.
