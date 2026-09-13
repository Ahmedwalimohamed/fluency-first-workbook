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

`public/index.html` currently loads the large base stylesheet plus many subsequent mobile, activity, skill-specific, unified-UI, and redesign stylesheets. It also loads a long chain of behavior patches after the main application script. This makes cascade order and runtime patch order part of product behavior and increases regression risk.

## Critical
### C1 — No single automated UI quality gate
**Status:** Open

The repository has curriculum, deployment, security, multi-school, community, CEFR, and learning-ladder QA scripts, but there is no UI/UX standards check in the package scripts.

**Action:** add a non-destructive `qa:ui` command first. Do not add it to blocking `prestart` until the current application passes reliably.

## High
### H1 — CSS patch-stack complexity
**Evidence:** `public/index.html` loads `styles.css` followed by numerous targeted/mobile redesign stylesheets, including mobile activity, question nav, single-question, lesson player, student home/course, reading/listening separation, unified UI, blue/red/white theme, and separate skill design sheets.

**Risk:**
- later files override earlier files unpredictably
- `!important` becomes necessary to win specificity
- fixing one screen can break another
- tokens and spacing drift across skill pages
- mobile bugs are repaired downstream instead of at the shared source

**Action:** create a controlled consolidation path. Do not delete old CSS immediately. First inventory which selectors are still active, move shared tokens/controls into the unified layer, then retire redundant patches one at a time with regression checks.

### H2 — JavaScript behavior patch-stack complexity
`public/index.html` loads many post-`app.js` behavior patches for mobile focus, lesson player, student course/home, question navigation, response navigation, listening visibility, reading/listening separation, grading, grammar cleanup and other fixes.

**Risk:** behavior depends on script order and DOM mutation timing; multiple patches may observe or rewrite the same elements.

**Action:** identify ownership for each interaction (question navigation, activity tabs, reading/listening rendering, grading feedback). Move each behavior toward one canonical implementation before adding further patch files.

### H3 — Visual source of truth is not fully aligned with the new design token contract
`englishgate-unified-ui-v1.css` already defines a strong token layer and uses the correct primary blue `#2563EB`, but some token values differ from the new canonical contract (for example background, muted, border, success/error variants). The HTML theme color also still uses an older blue.

**Action:** treat the new Design System file as policy, then migrate tokens deliberately. Do not mass-replace raw colors until contrast and role-specific states have been checked.

### H4 — Interface icons still include text/emoji-style glyphs
The current shell includes glyph-based menu/sign-out controls such as `☰` and `↗`.

**Risk:** inconsistent rendering and weaker accessible/icon-system consistency.

**Action:** replace with one SVG icon family and add explicit accessible names. This is visual-only and can be done without changing the actions.

### H5 — Global `overflow:hidden` in mobile question focus is structurally fragile
The current single-question stylesheet deliberately sets body/content overflow to hidden and creates its own internal scroll container. This solves coverage issues but makes the experience dependent on exact topbar/nav height assumptions and nested scrolling.

**Positive:** it already uses `100dvh`, safe-area insets, constrained media, and 48px mobile navigation buttons.

**Action:** preserve the current behavior for now; test at 320, 360/375, 390/430 widths and with the virtual keyboard. Long writing/input tasks should be specifically tested because nested scroll + keyboard is the likely failure mode.

## Medium
### M1 — Existing unified tokens should be renamed/mapped to canonical semantic tokens
The unified stylesheet uses `--eg-ink`, `--eg-blue`, `--eg-bg`, etc. These are good foundations. Add canonical aliases (`--eg-primary`, `--eg-text`, `--eg-background`, `--eg-error`) rather than duplicating another independent token system.

### M2 — Hover transforms should not be the main feedback model
Several desktop controls/cards translate slightly on hover. This is acceptable as polish, but touch/keyboard feedback must remain complete without hover.

### M3 — Login copy still describes the older skill-page model
The login hero currently says “Four skill pages” while the platform now treats Reading and Listening as separate destinations and EnglishGate has expanded beyond that earlier model.

**Action:** revise marketing copy only after confirming the final current activity taxonomy. This is copy, not structural UX.

### M4 — Font policy needs consolidation
The unified layer uses Nunito with system fallbacks. The Design System now requires one deliberate readable application font and discourages family drift. Confirm whether Nunito is the permanent EnglishGate UI font before adding more typography overrides.

## Positive findings already present
- Correct mobile viewport meta with `viewport-fit=cover`.
- Existing safe-area handling in the mobile single-question flow.
- Mobile media constrained to viewport width.
- Mobile question navigation uses 48px minimum height in compact layouts.
- A unified UI token layer already exists, making consolidation feasible.
- Reading/Listening separation and grading have dedicated implementation files, so the product is already moving toward activity ownership.
- Lesson visuals already require alt text at the product-contract level.
- Existing B2 QA is explicitly blocking and separates course completion from demonstrated B2 performance, which is the right pattern to mirror for future UI QA maturity.

## Remediation order
1. Add non-blocking `npm run qa:ui` static checks.
2. Standardize canonical design tokens by aliasing existing unified tokens.
3. Replace shell glyph icons with accessible SVG icons.
4. Inventory CSS ownership for Student Shell, Lesson Player, Question Card, Reading, Listening, Grammar, Vocabulary.
5. Inventory JS ownership for Activity Tabs, Question Navigation, Feedback/Grading, Reading/Listening rendering.
6. Consolidate the Question Card + navigation pattern first.
7. Consolidate Lesson Player shell second.
8. Consolidate Reading and Listening skill surfaces third.
9. Expand to Student Home, Teacher, then Admin.
10. Only after the application passes consistently, consider making UI QA blocking in `prestart`.

## Do-not-do list
- Do not redesign every page in one commit.
- Do not delete legacy CSS merely because a newer file exists.
- Do not mass-remove `!important` until selector ownership is understood.
- Do not migrate frameworks as part of this UX program.
- Do not change lesson IDs, answer keys, scores, progress, role permissions, or content sources while consolidating UI.
- Do not add a new design layer to fix a conflict created by existing design layers; consolidate instead.
