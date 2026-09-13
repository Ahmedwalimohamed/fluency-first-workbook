# EnglishGate Design System v1

## Purpose
This file is the visual and interaction source of truth for EnglishGate. It applies to student, teacher, school-admin, super-admin, authentication, lesson-player, workbook, community, and reporting surfaces.

EnglishGate is an adult-first ESL learning and academic management platform. The interface must feel calm, professional, trustworthy, accessible, and easy to use on a phone before desktop polish is considered.

This standard adopts the highest-impact rules from UI/UX Pro Max: accessibility first; touch and interaction safety; performance; consistent style; mobile-first responsive layout; semantic typography/color tokens; purposeful motion; clear forms/feedback; predictable navigation; accessible data visualization.

## Product principles
1. Learning content is always more important than decoration.
2. Mobile is the primary constraint. Desktop enhances the same experience.
3. One interaction pattern should behave the same everywhere.
4. Student cognitive load must stay low: one primary action per state whenever possible.
5. Teacher interfaces may be denser, but never cryptic.
6. Admin interfaces may be data-rich, but must preserve hierarchy, searchability, and safe destructive actions.
7. No childish gamification. Motivation should come from progress, mastery, feedback, streak/progress evidence, and meaningful recognition.
8. Never change curriculum logic or application business logic merely to satisfy a visual preference.

## Design tokens
### Color
- Primary: `#2563EB`
- Text / Ink: `#0F172A`
- Secondary text: `#64748B`
- Page background: `#F8FAFC`
- Surface / cards: `#FFFFFF`
- Border: `#E2E8F0`
- Success: `#16A34A`
- Error: `#DC2626`
- Review / warning: `#F59E0B`
- Vocabulary accent: `#7C3AED`

Rules:
- Use semantic CSS variables rather than scattering raw hex values through components.
- Body text and interactive labels must meet WCAG AA contrast (normally at least 4.5:1).
- Never rely on color alone to communicate correct/incorrect, active/inactive, or chart meaning.
- Avoid adding new skill-specific colors. EnglishGate should remain one coherent product.

Suggested variables:
```css
:root {
  --eg-primary: #2563EB;
  --eg-ink: #0F172A;
  --eg-muted: #64748B;
  --eg-bg: #F8FAFC;
  --eg-surface: #FFFFFF;
  --eg-border: #E2E8F0;
  --eg-success: #16A34A;
  --eg-error: #DC2626;
  --eg-review: #F59E0B;
  --eg-vocab: #7C3AED;
}
```

### Typography
- Default interface font: one highly readable sans-serif already supported by the application. Do not introduce multiple display families without a deliberate migration.
- Base body size: 16px minimum.
- Body line-height: approximately 1.5–1.7.
- Reading passages: optimize for sustained reading, not dashboard density.
- Long reading text should normally stay around 55–75 characters per line on larger screens.
- Do not use body text below 12px. Avoid using sub-14px text for essential student instructions.
- Headings must use a consistent hierarchy; visual size must follow semantic heading order.

### Spacing
Use an 8px-based rhythm where practical:
- 4px: micro-gap only
- 8px: related inline items
- 12–16px: compact component padding
- 20–24px: card/content grouping
- 32px+: section separation

Do not use arbitrary spacing to repair individual screens if the same pattern exists elsewhere.

### Radius and elevation
- Cards: restrained radius, generally 12–16px.
- Major containers/modals: 16–24px where appropriate.
- Avoid excessive shadow. Prefer border + subtle elevation.
- All repeated cards of the same type should share radius, border, padding, and state behavior.

## Responsive rules
### Mobile first
Design and test from 320px upward.

Required behaviors:
- No horizontal page scrolling.
- No fixed-width student content containers that overflow phones.
- Content must not hide behind sticky/fixed navigation.
- Safe-area padding must be respected on modern mobile devices.
- Reading/listening/writing controls must remain usable at narrow widths.
- Tables must transform, scroll inside an intentional container, or become cards; never break the viewport.
- Desktop sidebars must collapse into a clear mobile navigation pattern.

### Touch
- Interactive touch targets: minimum 44×44 CSS px.
- Maintain enough spacing between adjacent targets to prevent accidental taps.
- No essential interaction may depend on hover.
- Buttons must have visible pressed/loading/disabled states.

## Component contract
EnglishGate should converge toward shared components/patterns for:
- `PageHeader`
- `SectionCard`
- `LessonHeader`
- `ActivityTabs`
- `QuestionCard`
- `AnswerOption`
- `FeedbackPanel`
- `LessonNavigation`
- `ProgressIndicator`
- `AudioPlayer`
- `ReadingPanel`
- `VocabularyCard`
- `WritingEditor`
- `SpeakingRecorder`
- `TeacherToolbar`
- `DataTable`
- `EmptyState`
- `ErrorState`
- `LoadingState`
- `ConfirmDialog`

If the current architecture is DOM/template based rather than component-framework based, these names represent reusable rendering/CSS contracts rather than a requirement to migrate frameworks.

## Navigation
- Back behavior must be predictable and must not unexpectedly discard work.
- Student lesson navigation must always expose a clear Next action and a clear Back action where backward navigation is allowed.
- Tabs must preserve learner state when switching between activities unless the activity explicitly resets.
- Mobile bottom navigation should contain no more than five primary destinations.
- Do not create two different navigation systems for the same role.

## Forms
- Every input needs a visible label or an equally accessible programmatic label.
- Never use placeholder text as the only label.
- Validation errors appear next to the relevant field and explain how to fix the problem.
- Preserve entered data after validation errors.
- Password and WhatsApp flows must clearly communicate success, failure, and next steps.
- Destructive actions require explicit confirmation and a clear description of what will be deleted.

## Feedback and state
Every asynchronous or scored interaction must support appropriate states:
- idle
- focused/selected
- submitting/loading
- success/correct
- error/incorrect
- disabled/locked
- empty/no data
- offline/retry when relevant

Do not use an instant unexplained visual change as feedback. The learner must understand what happened.

## Motion
- Motion must clarify state or spatial relationship, not decorate.
- Prefer short, subtle transitions.
- Avoid animating layout-heavy width/height properties when transforms/opacity can achieve the same effect.
- Respect `prefers-reduced-motion`.
- Never delay learning interaction for animation.

## Icons
- Use a consistent SVG icon family.
- Do not use emoji as interface icons.
- Icon-only controls require accessible names/tooltips where meaning is not universally obvious.
- Decorative icons should not be announced by screen readers.

## Accessibility
Blocking requirements:
- Keyboard navigation for all core flows.
- Visible focus states; never remove focus outline without a strong replacement.
- Semantic controls (`button`, `input`, headings, lists, tables) rather than clickable generic containers.
- Appropriate ARIA only when native semantics are insufficient.
- Alt text for meaningful images. EnglishGate lesson visuals already require alt text; this remains mandatory.
- Zoom must not be disabled.
- Content must remain usable at increased text size.
- Correct/incorrect feedback must include text/icon cues in addition to color.

## Performance
- Reserve space for images/media to reduce layout shift.
- Lazy-load non-critical imagery.
- Prefer modern compressed image formats where the delivery pipeline supports them.
- Do not load large decorative assets on every lesson.
- Avoid repeated expensive DOM work during typing, scrolling, or audio playback.

## Role-specific density
### Student
Spacious, guided, low cognitive load, obvious primary action.

### Teacher
Moderate density, fast access to class/lesson/student context, strong continuation cues (e.g. where the teacher left off).

### Admin
Higher density allowed, but preserve filtering, search, grouping, table readability, confirmations, and responsive fallbacks.

## Change discipline
Before a UI change is merged:
1. Reuse an existing pattern if one exists.
2. Verify phone width first.
3. Verify keyboard/focus behavior.
4. Verify loading/error/empty states.
5. Verify the change does not alter curriculum or grading logic unintentionally.
6. Run the EnglishGate UI QA checklist in `standards/ENGLISHGATE_UI_QA_CHECKLIST.md`.
7. If a new reusable visual contract is introduced, update this document.
