# EnglishGate UI/UX Audit — 2026-09-14

## Scope
Code-level audit and consolidation of the EnglishGate Student, Teacher and Admin UI against:
- `standards/ENGLISHGATE_DESIGN_SYSTEM.md`
- `standards/ENGLISHGATE_LEARNING_UX.md`
- `standards/ENGLISHGATE_UI_QA_CHECKLIST.md`
- UI/UX Pro Max priority rules

This program does not change authentication, curriculum, grading rules, progress meaning, CRUD routes, role permissions, assignment logic or database contracts.

## Executive finding
EnglishGate had accumulated overlapping CSS and JavaScript patches. The remediation strategy has been **consolidate, verify, retire** rather than layering a wholesale redesign on top.

Primary Student, Teacher and Admin presentation ownership is now explicit. The remaining work is production/browser validation and deliberate retirement of a few legacy blocks that are still physically present but no longer visual authorities.

## Critical
### C1 — Automated UI quality gates
**Status:** Completed — non-blocking gates added

Available commands:
- `npm run qa:ui`
- `npm run qa:teacher-ui`
- `npm run qa:admin-ui`
- `npm run qa:final-ui`

They remain outside blocking `prestart` until production/browser verification confirms there are no false positives or missed regressions.

## High
### H1 — CSS patch-stack complexity
**Status:** Primary ownership consolidation completed

Canonical ownership now includes:
- `question-nav-fix.css` — student Back/Next navigation.
- `mobile-lesson-player-v1.css` — mobile Lesson Player structure only.
- `englishgate-lesson-player-design-v2.css` — Lesson Player presentation.
- `reading-listening-separation-v3.css` — Reading/Listening structure only.
- `englishgate-reading-design-v2.css` — Reading presentation.
- `englishgate-listening-design-v2.css` — Listening presentation.
- `reading-listening-grading-v1.css` — result/retry presentation.
- `grammar-lesson-clean-v1.css` — Grammar structural/content bridge only.
- `englishgate-grammar-design-v2.css` — Grammar presentation.
- `englishgate-vocabulary-design-v2.css` — Vocabulary presentation.
- `mobile-student-home-v2.css` — Student Home mobile focus structure only.
- `englishgate-student-home-design-v3.css` — Student Home presentation.
- `mobile-student-course-v1.css` — My Book mobile focus structure only.
- `englishgate-student-course-design-v1.css` — My Book / course presentation.
- `englishgate-teacher-design-v1.css` — Teacher presentation.
- `englishgate-admin-design-v1.css` — Admin presentation.

### Known legacy debt
`public/styles.css` still physically contains duplicate Teacher Assist and Teacher live-book blocks. The canonical Teacher layer loads later and wins. These blocks were not surgically deleted because the base stylesheet is a large monolith and broad replacement adds unnecessary regression risk.

`public/assets/academic-manager.css` and `public/assets/school-platform.css` still contain older `#17369f` values. The canonical Admin layer normalizes presentation at runtime. Retire those legacy values only after confirming no non-Admin consumer depends on them.

### H2 — JavaScript ownership
**Status:** Primary behavior ownership consolidated

- `question-nav-fix.js` is the sole generic student question-navigation controller.
- `student-response-navigation-v1.js` is not loaded.
- `reading-listening-separation-v3.js` owns rendering, draft persistence, stage navigation and question flow only.
- `reading-listening-grading-v1.js` owns submission, scoring, attempts, retry-only-missed, acceptance and completion.
- Reading/Listening submission crosses `englishgate:separated-submit`.
- `mobile-student-home-v2.js` owns Student Home focus-mode activation only.
- `mobile-student-course-v1.js` owns My Book focus-mode activation and next-lesson tagging only.
- Teacher behavior remains in `app.js`.
- Admin core rendering/CRUD remains in `app.js`.
- `admin-student-management-v2.js` and `admin-teacher-management-v1.js` remain scoped enhancement scripts.
- `role-navigation-icons-v1.js` is presentation-only: it replaces rendered navigation glyphs with inline SVG while preserving `data-page`, labels, click handlers and routing.

### H3 — Visual source of truth
**Status:** Completed for primary surfaces

`englishgate-unified-ui-v1.css` exposes the approved semantic tokens:
- `--eg-primary: #2563EB`
- `--eg-text: #0F172A`
- `--eg-secondary: #64748B`
- `--eg-background: #F8FAFC`
- `--eg-card: #FFFFFF`
- `--eg-border: #E2E8F0`
- `--eg-success: #16A34A`
- `--eg-error: #DC2626`
- `--eg-review: #F59E0B`
- `--eg-vocabulary: #7C3AED`

Student Course, Teacher and Admin canonical layers inherit this token system rather than defining competing palettes.

### H4 — Interface icons
**Status:** Primary shell and role navigation completed; audio glyphs remain

Completed:
- main shell menu SVG
- sign-out SVG
- Student/Teacher/Admin role navigation SVGs

Remaining known glyph debt:
- Reading/Listening audio play/restart controls currently render `▶` and `↺`.

The audio handlers bind by ID/function rather than visible text, so these can be migrated safely in the owning renderer after browser verification. `qa:final-ui` reports them as a warning.

### H5 — Mobile question nested-scroll risk
**Status:** Open — requires real device/browser testing

The single-question experience still uses an internal scroll container with outer `overflow:hidden`. Preserve until validation covers:
- 320px
- 360/375px
- 390/430px
- long Reading/Writing responses
- virtual keyboard open/close
- safe-area devices

## Medium
### M1 — Semantic token aliases
**Status:** Completed

Legacy aliases remain for compatibility while canonical semantic tokens are available to all new layers.

### M2 — Hover-only interaction risk
**Status:** Reduced, still verify in browser

Canonical layers include keyboard focus and touch behavior. Final validation must ensure no important action depends on hover.

### M3 — Login activity-model copy
**Status:** Completed

The old “Four skill pages” promise was removed. Login now states that the workbook contains Grammar, Reading, Listening, Vocabulary and Writing and explicitly notes that Reading and Listening are separate activities.

### M4 — Font policy
**Status:** Open

Confirm one permanent application font before further typography work. Do not add another font override during this consolidation program.

## Positive findings
- `viewport-fit=cover` is present.
- Browser theme color is `#2563EB`.
- Semantic tokens match the approved EnglishGate palette.
- Student Home and My Book have structure-vs-presentation ownership boundaries.
- Lesson Player has structure-vs-presentation ownership.
- Reading and Listening have separate presentation and behavior boundaries.
- Grammar and Vocabulary have canonical presentation owners.
- Teacher and Admin have canonical semantic-token-based presentation layers.
- Question navigation has visible keyboard focus, safe-area handling and >=44px controls.
- Student Course actions have >=44px touch targets and visible focus states.
- Teacher live controls and Admin management controls have touch/focus safeguards.
- Admin destructive actions have explicit error styling.
- Admin tables remain horizontally scrollable rather than clipping.
- Role navigation no longer visually depends on text glyph icons.
- Reading/Listening grading has one submission owner.
- Reading question headings receive programmatic focus on Back/Next.

## Completed remediation
1. Added `qa:ui`.
2. Consolidated generic question navigation.
3. Retired duplicate response-navigation runtime loading.
4. Added keyboard, reduced-motion, safe-area and touch protections.
5. Standardized browser theme color.
6. Split Lesson Player structural and visual ownership.
7. Split Reading/Listening rendering and grading ownership.
8. Split Reading/Listening structural and visual ownership.
9. Split Grammar structural and visual ownership.
10. Verified Vocabulary canonical ownership.
11. Added canonical semantic design tokens.
12. Split Student Home structural and presentation ownership.
13. Replaced shell menu/sign-out glyphs with SVG.
14. Added canonical Teacher design layer plus `qa:teacher-ui`.
15. Added canonical Admin design layer plus `qa:admin-ui`.
16. Split My Book / Student Course structural and presentation ownership.
17. Added accessible SVG role-navigation presentation.
18. Updated login activity-model copy for separate Reading and Listening.
19. Added `qa:final-ui` to verify the consolidated ownership model and report remaining legacy debt.

## Remaining work before declaring production UI complete
1. Run the static QA commands in the deployed/build environment.
2. Browser-test Student Home, My Book, Lesson Player, Grammar, Reading, Listening, Vocabulary and Writing.
3. Browser-test Teacher Assist and Teacher PRESENT mode.
4. Browser-test Admin books/classes/teachers/students/reports plus long tables and modals.
5. Validate mobile widths 320, 360/375, 390/430 and virtual keyboard behavior.
6. Migrate Reading/Listening audio play/restart glyphs to SVG in their owning renderer.
7. Retire duplicate legacy Teacher CSS and old Admin palette values only after regression verification.
8. Consider making UI QA blocking in `prestart` only after stable production validation.

## Do-not-do list
- Do not redesign every page in one commit.
- Do not delete legacy CSS merely because a newer file exists.
- Do not mass-remove `!important` until selector ownership is understood.
- Do not migrate frameworks as part of this UX program.
- Do not change lesson IDs, answer keys, scoring rules, progress meaning, role permissions, CRUD routes or content sources while consolidating UI.
- Do not add another broad patch to fix conflicts created by legacy layers; retire them deliberately after validation.
