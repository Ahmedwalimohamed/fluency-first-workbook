# EnglishGate UI/UX Audit — 2026-09-14

## Scope
Initial code-level audit of the current EnglishGate student shell and lesson/workbook UI against:
- `standards/ENGLISHGATE_DESIGN_SYSTEM.md`
- `standards/ENGLISHGATE_LEARNING_UX.md`
- `standards/ENGLISHGATE_UI_QA_CHECKLIST.md`
- UI/UX Pro Max priority rules

This audit does not change authentication, curriculum, grading, progress, or database behavior.

## Executive finding
EnglishGate already contains many good mobile and accessibility patches, but the front end has accumulated too many overlapping CSS and JavaScript layers. The largest current UX risk is **design/behavior drift caused by patch stacking**, not the absence of responsive work.

The remediation strategy is therefore **consolidate, verify, retire** rather than add another redesign layer.

## Critical
### C1 — No single automated UI quality gate
**Status:** Completed — non-blocking gate added

`npm run qa:ui` now provides static checks for the EnglishGate UI standards. It remains intentionally outside blocking `prestart` until the existing application passes reliably and the checks have been validated against production behavior.

## High
### H1 — CSS patch-stack complexity
**Status:** In progress

`public/index.html` still loads the large base stylesheet plus numerous targeted/mobile redesign stylesheets.

**Risk:**
- later files override earlier files unpredictably
- `!important` becomes necessary to win specificity
- fixing one screen can break another
- tokens and spacing drift across skill pages
- mobile bugs are repaired downstream instead of at the shared source

**Completed step:** `question-nav-fix.css` is now the canonical final authority for the student Back/Next navigation controls and loads after the older mobile single-question layer.

**Next:** consolidate Lesson Player styling and then Reading/Listening surfaces.

### H2 — JavaScript behavior patch-stack complexity
**Status:** In progress

**Completed step:** question response navigation and question Back/Next behavior are now owned by one runtime controller: `public/question-nav-fix.js`. The separate `student-response-navigation-v1.js` controller is no longer loaded by `public/index.html`.

The canonical controller now owns:
- response detection
- response-based Next unlocking
- wrong-answer forward progression
- MCQ auto-advance fallback
- Back/Next placement
- navigation accessibility labels
- question-navigation runtime reconciliation

`qa:ui` now treats re-loading the duplicate response-navigation controller as a critical failure.

**Next interaction owner to consolidate:** Lesson Player.

### H3 — Visual source of truth alignment
**Status:** Partially completed

`englishgate-unified-ui-v1.css` already defines a strong token layer and uses the correct primary blue `#2563EB`.

**Completed:** HTML/PWA browser theme color migrated from the older `#17369F` to canonical `#2563EB`.

**Remaining:** alias/migrate lesson-player and skill-specific tokens toward the shared semantic token contract without mass replacing colors before contrast checks.

### H4 — Interface icons still include text/emoji-style glyphs
**Status:** Open

The shell still includes glyph-based menu/sign-out controls such as `☰` and `↗`.

**Action:** replace with one SVG icon family and explicit accessible names without changing actions.

### H5 — Global `overflow:hidden` in mobile question focus is structurally fragile
**Status:** Open — guarded by QA warning

The current single-question stylesheet deliberately sets body/content overflow to hidden and creates its own internal scroll container. This solves coverage issues but makes the experience dependent on exact topbar/nav height assumptions and nested scrolling.

**Positive:** it uses `100dvh`, safe-area insets, constrained media, and >=48px mobile question navigation controls.

**Action:** preserve current behavior until device regression tests cover 320, 360/375, 390/430 widths plus virtual keyboard and long writing tasks.

## Medium
### M1 — Existing unified tokens should be renamed/mapped to canonical semantic tokens
**Status:** Open

The unified stylesheet uses `--eg-ink`, `--eg-blue`, `--eg-bg`, etc. These are good foundations. Add canonical aliases (`--eg-primary`, `--eg-text`, `--eg-background`, `--eg-error`) rather than duplicating another independent token system.

### M2 — Hover transforms should not be the main feedback model
**Status:** Open

Several desktop controls/cards translate slightly on hover. Touch/keyboard feedback must remain complete without hover.

### M3 — Login copy still describes the older skill-page model
**Status:** Open

The login hero currently says “Four skill pages” while Reading and Listening are now separate destinations and the platform has expanded beyond the older model.

### M4 — Font policy needs consolidation
**Status:** Open

The unified layer uses Nunito with system fallbacks. Confirm one permanent EnglishGate application font before adding more typography overrides.

## Positive findings already present
- Correct mobile viewport meta with `viewport-fit=cover`.
- Canonical browser theme color is now `#2563EB`.
- Existing safe-area handling in the mobile single-question flow.
- Mobile media constrained to viewport width.
- Canonical question navigation uses >=48px mobile controls, visible keyboard focus, safe-area padding and reduced-motion handling.
- A unified UI token layer already exists, making consolidation feasible.
- Reading/Listening separation and grading have dedicated implementation files, so the product is already moving toward activity ownership.
- Lesson visuals already require alt text at the product-contract level.
- Existing B2 QA is explicitly blocking and separates course completion from demonstrated B2 performance, which is the right pattern to mirror for future UI QA maturity.

## Completed remediation
1. Added non-blocking `npm run qa:ui` static checks.
2. Consolidated Question Card navigation behavior into one JavaScript controller.
3. Made question navigation CSS the final navigation authority.
4. Removed duplicate response-navigation controller from runtime.
5. Added keyboard focus, reduced motion, safe-area and >=44px touch-target protections to canonical question navigation.
6. Migrated browser theme color to `#2563EB`.

## Next remediation order
1. Consolidate Lesson Player shell ownership.
2. Consolidate Reading and Listening skill surfaces.
3. Alias existing unified tokens to canonical semantic tokens.
4. Replace shell glyph icons with accessible SVG icons.
5. Consolidate Grammar and Vocabulary surfaces.
6. Expand to Student Home, Teacher, then Admin.
7. Test nested scrolling and virtual-keyboard behavior on mobile.
8. Only after stable passing results, consider making UI QA blocking in `prestart`.

## Do-not-do list
- Do not redesign every page in one commit.
- Do not delete legacy CSS merely because a newer file exists.
- Do not mass-remove `!important` until selector ownership is understood.
- Do not migrate frameworks as part of this UX program.
- Do not change lesson IDs, answer keys, scores, progress, role permissions, or content sources while consolidating UI.
- Do not add a new design layer to fix a conflict created by existing design layers; consolidate instead.
