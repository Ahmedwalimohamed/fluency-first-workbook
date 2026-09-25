# Fluency First Workbook

EnglishGate multi-school digital workbook and academic management platform.

## Learning Companion reliability contract

The Learning Companion is additive. The existing EnglishGate activity engine remains the source of truth for grading, progress, completion, navigation, authentication, and reports.

Core rule:

> LLM generates. Jev decides. Deterministic code enforces. Evidence updates learning state.

Learner-facing activation is disabled by default with `LEARNING_COMPANION_V1=false`.

### B1 Lesson 1 shadow pilot

The B1 pilot is deliberately narrower than normal course activation. It is available only when all of the following are true:

- `LEARNING_COMPANION_V1=true`
- `B1_LEARNING_COMPANION_SHADOW_PILOT=true`
- the learner ID is explicitly listed in `B1_LEARNING_COMPANION_PILOT_STUDENT_IDS`
- the lesson is exactly `su-b1-l1`

The pilot does not change the B1 database book status. For an allowlisted pilot learner, the state API exposes B1 as `pilot` for that session only.

Shadow observation happens only after the core attempt has been accepted. Companion failures must never block grading, completion, or navigation. Raw learner answers and answer keys are excluded from the Companion event and shadow-decision records.

Run the reliability suite with:

```bash
npm run qa:learning-companion
npm run qa:learning-companion:b1-pilot
npm run qa:learning-companion:b1-shadow
```
