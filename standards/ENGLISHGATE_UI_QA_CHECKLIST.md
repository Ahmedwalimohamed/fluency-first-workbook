# EnglishGate UI/UX QA Checklist v1

Use this checklist before merging or deploying any learner-, teacher-, or admin-facing UI change.

## Severity model
- **CRITICAL** — blocks deployment; prevents task completion, loses data, creates inaccessible core flow, or breaks lesson/business logic.
- **HIGH** — major usability/responsive/consistency problem; fix before normal release.
- **MEDIUM** — noticeable friction or polish issue; schedule promptly.
- **LOW** — cosmetic improvement with little task impact.

## 1. Accessibility — CRITICAL
- [ ] Essential text/control contrast meets WCAG AA (normally 4.5:1 for normal text).
- [ ] All core actions can be reached and used by keyboard.
- [ ] Focus indicator is visible and not obscured.
- [ ] Native semantic controls are used where possible.
- [ ] Icon-only controls have accessible names.
- [ ] Meaningful images have useful alt text.
- [ ] Decorative images/icons are ignored by assistive technology where appropriate.
- [ ] Correct/incorrect or status meaning is not communicated by color alone.
- [ ] Browser zoom is not disabled.
- [ ] Increased text size does not destroy the flow.

## 2. Touch & interaction — CRITICAL
- [ ] Main tap targets are at least 44×44 CSS px.
- [ ] Adjacent controls have enough spacing to prevent accidental taps.
- [ ] Essential actions do not require hover.
- [ ] Loading/submitting state is shown after a user action.
- [ ] Disabled controls look and behave disabled.
- [ ] Repeated taps cannot accidentally duplicate destructive/submission actions.

## 3. Learning-state safety — CRITICAL
- [ ] Student answers are preserved during normal Next/Back navigation.
- [ ] Switching activity tabs does not silently erase work.
- [ ] Writing drafts are protected from avoidable loss.
- [ ] Network failure has an understandable retry/recovery path.
- [ ] No UI change modifies scoring, answer keys, curriculum IDs, role permissions, or progress rules unintentionally.
- [ ] Existing-student completion/history remains intact where required by living standards.

## 4. Content integrity — CRITICAL
- [ ] Reading passage matches its questions.
- [ ] Listening audio/script matches its questions.
- [ ] Correct answers are valid.
- [ ] Vocabulary definitions/examples are real and accurate.
- [ ] Lesson identity/course identity has not drifted.
- [ ] Teacher and student lesson views use the same intended content source.

## 5. Mobile responsive behavior — HIGH
Test at minimum 320px, 360/375px, 390/430px, tablet, and desktop widths.

- [ ] No whole-page horizontal scrolling.
- [ ] No clipped/covered learning content.
- [ ] Sticky/fixed navigation does not cover controls or final content.
- [ ] Safe-area padding works on mobile devices.
- [ ] Text does not overflow cards/buttons/chips.
- [ ] Long labels wrap gracefully.
- [ ] Tables have an intentional small-screen strategy.
- [ ] Modals fit the viewport and remain dismissible.
- [ ] Virtual keyboard does not make the active form field/action unusable.

## 6. Navigation — HIGH
- [ ] Current location/activity is obvious.
- [ ] Back behavior is predictable.
- [ ] Next action is obvious after a question/task is complete.
- [ ] Sequential questions expose useful progress such as `3 of 8`.
- [ ] Activity tab state is clear visually and programmatically.
- [ ] Mobile navigation is not overloaded.
- [ ] Deep links/bookmarks do not land users in an impossible state where supported.

## 7. Question card — HIGH
For each question type used on the changed screen:

- [ ] Prompt is easy to distinguish from instructions/options.
- [ ] Response control is appropriate for the task.
- [ ] Selected state is obvious.
- [ ] Submit/check behavior is clear.
- [ ] Correct/incorrect feedback is understandable.
- [ ] Feedback remains visible long enough to read.
- [ ] Next/Back does not overlap content.
- [ ] Generic labels such as Build/Correct/Apply are not inserted unless pedagogically required.

## 8. Reading UX — HIGH
- [ ] Passage has comfortable line length and line height.
- [ ] Learner can reference the passage while answering.
- [ ] Phone layout does not squeeze passage and questions into unusable columns.
- [ ] Scroll position/navigation between passage and question is understandable.

## 9. Listening UX — HIGH
- [ ] Audio play/pause is accessible and obvious.
- [ ] Loading/error state is present.
- [ ] Replay is easy.
- [ ] Audio does not autoplay unexpectedly.
- [ ] Transcript visibility matches teaching intent.
- [ ] Listening questions live within the Listening activity rather than being mixed ambiguously with Reading.

## 10. Writing UX — HIGH
- [ ] Editor is usable on mobile.
- [ ] Instructions remain available while writing.
- [ ] Draft/save state is understandable.
- [ ] Submission status is explicit.
- [ ] Copy/paste restriction, where intentionally enabled, is explained.
- [ ] Auto-graded preparation and authentic teacher-graded writing are visually distinct.

## 11. Speaking UX — HIGH
- [ ] Recording state is unmistakable.
- [ ] Timer/status is readable.
- [ ] Stop/playback/retry controls are clear.
- [ ] Learner knows whether recording was saved/submitted.
- [ ] Microphone permission failure has recovery instructions.

## 12. Teacher Present mode — HIGH
- [ ] Full-screen presentation prioritizes lesson content.
- [ ] Teacher controls do not cover projected material.
- [ ] Pointer/highlighter/annotation states are obvious.
- [ ] Spotlighting does not make hidden content impossible to recover.
- [ ] Exiting Present mode is always possible.

## 13. Forms & authentication — HIGH
- [ ] Every field has a visible/accessible label.
- [ ] Error message appears next to the relevant field.
- [ ] User input is preserved after validation failure.
- [ ] WhatsApp/password reset states clearly explain what happened next.
- [ ] Password visibility control has accessible labeling.
- [ ] Success does not rely on a disappearing toast alone for important actions.

## 14. Destructive/admin actions — CRITICAL/HIGH
- [ ] Delete/reset/transfer actions clearly identify the affected student/class/book/user.
- [ ] Destructive actions require confirmation.
- [ ] Confirmation text states consequences.
- [ ] Permissions match role rules.
- [ ] Bulk action selection is clearly visible and reversible where feasible.

## 15. Visual consistency — MEDIUM
- [ ] Same component type uses same padding/radius/border/state behavior.
- [ ] Button hierarchy is consistent: primary, secondary, tertiary/destructive.
- [ ] Typography follows established hierarchy.
- [ ] Semantic color tokens are used rather than introducing arbitrary raw colors.
- [ ] Icons come from a consistent SVG family; emoji are not used as UI icons.
- [ ] New patterns are reusable rather than one-off CSS patches.

## 16. Motion — MEDIUM
- [ ] Animation communicates state/spatial relationship.
- [ ] Motion does not delay task completion.
- [ ] `prefers-reduced-motion` is respected.
- [ ] Layout-heavy/janky animations are avoided.

## 17. Performance — HIGH/MEDIUM
- [ ] Images/media reserve layout space.
- [ ] Non-critical large images are lazy loaded where appropriate.
- [ ] Re-render/DOM work while typing or scrolling is reasonable.
- [ ] No new blocking asset is loaded on every lesson without need.
- [ ] Layout shift remains minimal.

## 18. Empty/loading/error states — HIGH
For every changed data-driven panel:

- [ ] Loading state exists.
- [ ] Empty state explains what to do next.
- [ ] Error state explains recovery/retry.
- [ ] Permission-denied state is distinct from empty data.

## 19. Analytics/data visualization — MEDIUM
- [ ] Chart type matches the question being answered.
- [ ] Legend/labels are understandable.
- [ ] Color is not the only differentiator.
- [ ] Values can be understood without relying only on hover.
- [ ] Mobile fallback remains readable.

## 20. Regression gate
Before deployment:
- [ ] Run existing EnglishGate QA scripts required by the repository.
- [ ] Test Student role.
- [ ] Test Teacher role.
- [ ] Test affected Admin role(s).
- [ ] Test at least one existing learner with saved progress if the change touches lessons/progress.
- [ ] Confirm no unexpected console/runtime errors in the changed flow.
- [ ] Confirm no new horizontal overflow.
- [ ] Confirm changed screens against `ENGLISHGATE_DESIGN_SYSTEM.md` and `ENGLISHGATE_LEARNING_UX.md`.

## Release decision
- Any unresolved **CRITICAL** item = DO NOT DEPLOY.
- Any unresolved **HIGH** item affecting the primary changed flow = DO NOT NORMAL-RELEASE without an explicit documented exception.
- MEDIUM/LOW items may ship only if they do not combine into a larger usability problem.
