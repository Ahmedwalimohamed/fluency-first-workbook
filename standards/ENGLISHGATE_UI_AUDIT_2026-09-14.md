# EnglishGate UI/UX Audit — 2026-09-14

## Scope
Initial code-level audit of the current EnglishGate student shell and lesson/workbook UI against:
- `standards/ENGLISHGATE_DESIGN_SYSTEM.md`
- `standards/ENGLISHGATE_LEARNING_UX.md`
- `standards/ENGLISHGATE_UI_QA_CHECKLIST.md`
- UI/UX Pro Max priority rules

This audit does not change authentication, curriculum, grading rules, progress meaning, or database contracts.

## Executive finding
EnglishGate already contains many good mobile and accessibility improvements, but the front end accumulated overlapping CSS and JavaScript patches. The remediation strategy is therefore **consolidate, verify, retire** rather than add another redesign layer.

## Critical
### C1 — No single automated UI quality gate
**Status:** Completed — non-blocking gate added

`npm run qa:ui` now provides static checks for EnglishGate UI standards and ownership boundaries. It remains intentionally outside blocking `prestart` until the checks are validated against production behavior.

## High
### H1 — CSS patch-stack complexity
**Status:** In progress

Completed ownership steps:
- `question-nav-fix.css` is the final visual authority for student Back/Next navigation.
- `mobile-lesson-player-v1.css` is restricted to mobile Lesson Player structure only.
- `englishgate-lesson-player-design-v2.css` owns Lesson Player visual treatment.
- `qa:ui` fails if Lesson Player visual properties leak into the structural bridge or if CSS ownership order is reversed.

Remaining CSS targets: Reading, Listening, Grammar, Vocabulary, Student Home, Teacher and Admin.

### H2 — JavaScript behavior patch-stack complexity
**Status:** In progress

Completed ownership steps:
- `public/question-nav-fix.js` is the sole generic student question-navigation controller.
- `student-response-navigation-v1.js` is no longer loaded.
- `reading-listening-separation-v3.js?v=4` now owns only Reading/Listening rendering, draft persistence, stage navigation and question navigation.
- `reading-listening-grading-v1.js?v=2` is the sole owner of Reading/Listening submission, score calculation, attempts, retry-only-missed workflow, result acceptance and completion.
- Final submission now crosses an explicit `englishgate:separated-submit` event boundary instead of relying on two competing submit implementations.
- The obsolete `submitSeparated()` grading/completion path has been removed from the renderer.
- `qa:ui` now fails if grading/attempt/completion logic is reintroduced into the Reading/Listening renderer.

### H3 — Visual source of truth alignment
**Status:** Partially completed

`englishgate-unified-ui-v1.css` already provides a strong token foundation and the canonical primary blue `#2563EB`. HTML/PWA theme color now uses the same primary.

Remaining: alias existing token names to semantic tokens and reduce skill-specific token drift.

### H4 — Interface icons still include glyph-style controls
**Status:** Open

Shell and learning surfaces still contain glyph controls such as `☰`, `↗`, `▶`, `↺` and completion checkmarks.

Action: migrate actionable controls to one accessible SVG icon family without changing behavior. Decorative completion marks may remain text only where semantically appropriate.

### H5 — Mobile question nested-scroll risk
**Status:** Open — guarded by QA warning

The current single-question experience uses an internal scroll container with `overflow:hidden` on outer containers. Preserve until device testing covers 320, 360/375, 390/430 widths plus virtual keyboard and long writing responses.

## Medium
### M1 — Semantic token aliases
**Status:** Open

Add canonical aliases such as `--eg-primary`, `--eg-text`, `--eg-background`, `--eg-border`, `--eg-success`, `--eg-error` to the existing unified token system rather than introducing another token family.

### M2 — Hover transforms
**Status:** Open

Touch and keyboard feedback must remain complete without hover-dependent movement.

### M3 — Login copy reflects an older activity model
**Status:** Open

The login hero still references “Four skill pages” even though Reading and Listening are independent activities and the workbook taxonomy has evolved.

### M4 — Font policy
**Status:** Open

Confirm a single permanent EnglishGate application font before adding further typography overrides.

## Positive findings already present
- Correct mobile viewport meta with `viewport-fit=cover`.
- Canonical browser theme color `#2563EB`.
- Safe-area handling in question and lesson-player navigation.
- Canonical question navigation has >=44px controls, visible keyboard focus and reduced-motion support.
- Lesson Player has a structural-vs-visual ownership boundary.
- Reading and Listening are independent activities with separately stored attempts and completion.
- Reading question headings now receive programmatic focus when moving Back/Next.
- Reading/Listening grading preserves retry-only-missed behavior while having a single submission owner.
- Lesson visuals require alt text at the product-contract level.

## Completed remediation
1. Added non-blocking `npm run qa:ui`.
2. Consolidated generic Question Card navigation into one controller.
3. Removed duplicate response-navigation runtime controller.
4. Added keyboard focus, reduced motion, safe-area and touch-target protections.
5. Migrated browser theme color to `#2563EB`.
6. Split Lesson Player structural and visual ownership.
7. Added QA enforcement for Lesson Player ownership/order.
8. Removed duplicate Reading/Listening grading/completion implementation from the renderer.
9. Established explicit renderer → grader submission event boundary.
10. Added QA enforcement for Reading/Listening ownership.

## Next remediation order
1. **Consolidate Reading and Listening visual surfaces.**
2. Alias unified tokens to canonical semantic tokens.
3. Consolidate Grammar and Vocabulary surfaces.
4. Replace actionable glyph icons with accessible SVG icons.
5. Expand to Student Home, Teacher, then Admin.
6. Test nested scrolling and virtual-keyboard behavior on mobile.
7. Only after stable passing results, consider making UI QA blocking in `prestart`.

## Do-not-do list
- Do not redesign every page in one commit.
- Do not delete legacy CSS merely because a newer file exists.
- Do not mass-remove `!important` until selector ownership is understood.
- Do not migrate frameworks as part of this UX program.
- Do not change lesson IDs, answer keys, scoring rules, progress meaning, role permissions, or content sources while consolidating UI.
- Do not add a new design layer to fix a conflict created by existing design layers; consolidate instead.
