# Learning Companion v1 — Offline Simulation Report

Status: **PASS (deterministic contract simulation)**

Scope: 1,200 synthetic scenarios, no student data, no production DB, no learner-facing execution.

## Results

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

## Interpretation

This PASS verifies the deterministic event/action/policy contract under the synthetic scenario generator. It does **not** prove real Jev semantic diagnosis accuracy, production latency, real learner outcomes, transfer validity, or delayed retention. Those remain later gates.

## Promotion decision

**PASS for the next engineering gate only.** Do not activate student-facing interventions from this result alone.

Next gate: adversarial/fault-injection simulation (duplicate events, stale versions, invalid Jev actions/confidence, timeouts, answer-leak attempts, prompt injection, exhausted intervention budgets, and corrupted/ambiguous content), followed by disabled-code merge review if that suite passes.
