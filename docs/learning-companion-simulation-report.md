# Learning Companion v1 — Reliability Evidence

Status: **PASS for disabled-code merge / shadow-pilot infrastructure**

Learner-facing activation remains **OFF**.

## Universal deterministic simulation

Scope: 1,200 synthetic scenarios, no student data, no production learner-facing execution.

| Metric | Result | Gate |
|---|---:|---:|
| Events | 1,200 | >= 1,000 |
| Valid decision rate | 100% | >= 99% |
| Unknown action rate | 0% | 0% |
| Policy violation rate | 0% | 0% |
| Duplicate execution rate | 0% | 0% |
| Shadow error rate | 0% | <= 1% |
| High-confidence false-intervention rate | 0% | <= 2% |
| Added core latency | 0 ms (offline; not a production latency measurement) | <= 5 ms |

480 scenarios exercised the high-confidence intervention accounting path; none met the simulation definition of a false targeted intervention.

## B1 Lesson 1 reference contract

The isolated B1 contract suite passed for correct responses, grammar errors, vocabulary errors, reading/listening comprehension errors, low-confidence fallback, unknown actions, intervention budgets, malformed events, and additive evidence updates that preserve the original grade.

## Universal adapter gate

The universal activity-result adapter passed checks for CEFR-level reuse, canonical event mapping, deterministic replay IDs, safe skill normalization, disabled fail-safe behavior, bounded Jev actions, deterministic fallback, and rejection of missing version metadata.

## Safe B1 shadow pilot gate

The pilot infrastructure passed the following blocking checks:

- the pilot flag alone cannot activate B1;
- an explicit student ID allowlist is required;
- B1 scope is restricted to `su-b1-l1`;
- workbook raw responses are stripped before the Companion adapter;
- core detailed response evidence and answer keys are stripped before the Companion adapter;
- shadow persistence contains metadata only;
- shadow event IDs are deterministic and versioned;
- disabled Companion mode returns before shadow database access;
- Reading/Listening observation occurs only after the core transaction commits;
- core attempt observation runs after the accepted core response and cannot block grading/navigation.

## Adversarial gate

Status: **PASS** — 10 adversarial cases, 21 checks, 0 core mutations, student-facing mode disabled.

## Interpretation

These results verify merge-readiness for the additive, disabled/shadow infrastructure. They do **not** establish real learner outcome gains, real-world Jev diagnosis accuracy, production latency under load, transfer validity, or delayed retention.

A real B1 shadow pilot requires all of the following configuration before any learner can access it:

- `LEARNING_COMPANION_V1=true`
- `B1_LEARNING_COMPANION_SHADOW_PILOT=true`
- the learner ID in `B1_LEARNING_COMPANION_PILOT_STUDENT_IDS`
- lesson exactly `su-b1-l1`

No learner-facing intervention should be enabled from this evidence alone.
