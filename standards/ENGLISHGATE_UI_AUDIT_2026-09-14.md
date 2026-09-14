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
**Status:** Completed — non-blocking gates added

`npm run qa:ui` provides static checks for EnglishGate UI standards and ownership boundaries. `npm run qa:teacher-ui` now adds Teacher-specific ownership and accessibility checks. Both remain intentionally outside blocking `prestart` until the checks are validated against production behavior.

## High
### H1 — CSS patch-stack complexity
**Status:** In progress

Completed ownership steps:
- `question-nav-fix.css` is the final visual authority for student Back/Next navigation.
- `mobile-lesson-player-v1.css` is restricted to mobile Lesson Player structure only.
- `englishgate-lesson-player-design-v2.css` owns Lesson Player visual treatment.
- `reading-listening-separation-v3.css?v=2` is a structural bridge only.
- `englishgate-reading-design-v2.css` owns Reading presentation.
- `englishgate-listening-design-v2.css` owns Listening presentation.
- `reading-listening-grading-v1.css` owns result/retry presentation.
- `grammar-lesson-clean-v1.css?v=2` is a structural/content-layout bridge only.
- `englishgate-grammar-design-v2.css` owns Grammar presentation.
- `englishgate-vocabulary-design-v2.css` remains the Vocabulary visual authority.
- `mobile-student-home-v2.css?v=3` is restricted to focused mobile Student Home structure only.
- `englishgate-student-home-design-v3.css` is the canonical Student Home visual layer on desktop and mobile.
- `englishgate-teacher-design-v1.css?v=1` is now the final Teacher presentation layer for Teacher Assist, live-book browsing, assignment surfaces and live-lesson controls.
- `qa:ui` and `qa:teacher-ui` enforce these ownership boundaries and stylesheet ordering.

**Known Teacher legacy debt:** `public/styles.css` still physically contains duplicate `Teacher Assist intelligence layer v1` and `Teacher live book + assignment flow` blocks. The canonical Teacher stylesheet loads after the monolith and wins at runtime. `qa:teacher-ui` reports those duplicate legacy blocks as warnings. They have not been surgically deleted because `styles.css` is a large monolith and a broad replacement would create unnecessary regression risk.

Remaining CSS targets: Admin surfaces, then legacy shell/course layers where duplication remains.

### H2 — JavaScript behavior patch-stack complexity
**Status:** In progress

Completed ownership steps:
- `public/question-nav-fix.js` is the sole generic student question-navigation controller.
- `student-response-navigation-v1.js` is no longer loaded.
- `reading-listening-separation-v3.js?v=4` owns Reading/Listening rendering, draft persistence, stage navigation and question navigation only.
- `reading-listening-grading-v1.js?v=2` solely owns Reading/Listening submission, scoring, attempts, retry-only-missed workflow, result acceptance and completion.
- Final Reading/Listening submission crosses the explicit `englishgate:separated-submit` event boundary.
- `mobile-student-home-v2.js` owns only activation/deactivation of `student-home-focus-mode`; it does not render dashboard content or own data/navigation behavior.
- Teacher behavior remains in `app.js`: page routing, Teacher Assist data, resume context, lesson state, assignment logic, presentation-mode state and role permissions were not moved into the Teacher design layer.

### H3 — Visual source of truth alignment
**Status:** Substantially completed for student and Teacher learning surfaces

`englishgate-unified-ui-v1.css?v=2` exposes the canonical semantic token contract:
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

The Teacher canonical layer inherits these semantic tokens instead of defining a competing palette. Legacy aliases remain for compatibility while new work can use the semantic contract directly.

### H4 — Interface icons
**Status:** Shell actions completed; navigation and learning-surface migration remains

The main shell menu and sign-out controls no longer use `☰` and `↗`. They use inline stroke SVG icons with explicit accessible names while preserving existing button IDs and behavior.

Role navigation generated in `app.js` still uses compact text glyphs such as `⌂`, `▣`, `▤`, `◎`, `✎`, `△` and `▦`. Audio/playback and some live-class controls also still contain glyphs. Migrate these only when their owning component is consolidated so icon work does not become another global patch.

### H5 — Mobile question nested-scroll risk
**Status:** Open — guarded by QA warning

The current single-question experience uses an internal scroll container with `overflow:hidden` on outer containers. Preserve until device testing covers 320, 360/375, 390/430 widths plus virtual keyboard and long writing responses.

## Medium
### M1 — Semantic token aliases
**Status:** Completed

Canonical semantic tokens exist in the unified UI layer while legacy aliases remain available for compatibility.

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
- Unified semantic design token contract matches the approved EnglishGate palette.
- Safe-area handling in question, Lesson Player and Student Home navigation.
- Canonical question navigation has >=44px controls, visible keyboard focus and reduced-motion support.
- Lesson Player has a structural-vs-visual ownership boundary.
- Reading and Listening have structural-vs-visual ownership boundaries.
- Grammar has a structural-vs-visual ownership boundary.
- Vocabulary has an explicit canonical visual layer with the approved purple vocabulary accent.
- Student Home has structural focus-mode ownership separated from canonical visual ownership.
- Student Home focus-mode JavaScript does not own dashboard rendering or data behavior.
- Teacher now has a canonical semantic-token-based presentation layer loaded after legacy design layers.
- Teacher live controls receive >=44px touch-target protection, visible focus states and reduced-motion handling from the canonical layer.
- Teacher assignment, lesson-state and permission behavior remains isolated from presentation work.
- Reading and Listening are independent activities with separately stored attempts and completion.
- Reading question headings receive programmatic focus when moving Back/Next.
- Reading/Listening grading preserves retry-only-missed behavior while having a single submission owner.
- Main shell menu/sign-out actions use accessible SVG icons instead of text glyphs.
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
10. Reduced shared Reading/Listening CSS to structural ownership only.
11. Made Reading, Listening and grading styles the presentation owners for their respective surfaces.
12. Reduced legacy Grammar CSS to structural/content-layout ownership only.
13. Preserved `englishgate-grammar-design-v2.css` as the Grammar visual authority.
14. Verified Vocabulary’s canonical design layer and accessibility safeguards.
15. Added canonical semantic design tokens to the unified UI layer.
16. Reduced `mobile-student-home-v2.css` to Student Home focus structure only.
17. Preserved `mobile-student-home-v2.js` as mode activation only.
18. Made `englishgate-student-home-design-v3.css` the canonical Student Home presentation layer.
19. Replaced shell menu/sign-out glyphs with accessible inline SVG icons.
20. Added QA enforcement for Student Home ownership, semantic tokens and shell SVG controls.
21. Added `englishgate-teacher-design-v1.css` as the canonical Teacher presentation layer.
22. Loaded the Teacher design layer after legacy/global styles so it is the final Teacher visual authority.
23. Added `npm run qa:teacher-ui` to verify Teacher token inheritance, focus states, touch targets, responsive safeguards and known duplicate legacy blocks.

## Next remediation order
1. **Consolidate Admin surfaces. Current target.**
2. Review remaining legacy shell/course CSS ownership.
3. Physically retire duplicate Teacher blocks from the monolithic base stylesheet only when a low-risk editing path is available.
4. Replace remaining actionable role-navigation and learning-surface glyph icons with accessible SVG controls when their owning components are touched.
5. Update outdated login activity-model copy once the final public wording is confirmed.
6. Test nested scrolling, safe areas, Teacher presentation mode and virtual-keyboard behavior on mobile devices.
7. Only after stable passing results, consider making UI QA blocking in `prestart`.

## Do-not-do list
- Do not redesign every page in one commit.
- Do not delete legacy CSS merely because a newer file exists.
- Do not mass-remove `!important` until selector ownership is understood.
- Do not migrate frameworks as part of this UX program.
- Do not change lesson IDs, answer keys, scoring rules, progress meaning, role permissions, or content sources while consolidating UI.
- Do not add another broad patch to fix a conflict created by existing design layers; establish explicit component ownership instead.
