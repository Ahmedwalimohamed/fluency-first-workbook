# EnglishGate B1 Intermediate — Living Standard v1

## Purpose
B1 Intermediate is built from the B2 Upper Intermediate north star (`B2_LIVING_STANDARD.md`). Everything is the same — topics, lesson schema, Live lesson format, Northstar workbook (SEE → CHOOSE → CHANGE → USE → FIX), graders, UI and design — **except content difficulty**.

## What stays identical to B2
- 22 topics in the same order, stable IDs `su-b1-l1` … `su-b1-l22`, course ID `speakup-b1`
- The grammar focus of each lesson (simplified, not replaced)
- Lesson fields: outcome, foundation, lift, performance, pronunciation, mediation, functions, discourse, chunks, interaction expressions
- 4 reading + 4 listening questions (with higher-order items), 6 grammar items, 10 vocabulary activities, 5 writing-builder items, 1 real-life writing task
- Northstar support fade: high (1–5), medium-high (6–11), medium (12–17), low (18–22)
- Hidden REMEMBER retrieval from the previous lesson (from Lesson 2)
- Teacher-graded checkpoints: Lessons 5, 10, 15, 18, 22
- Six-page fluency-first Live lesson with FLUENCY START, FLUENCY USE, TALK AFTER READING, MAKE IT PERSONAL — SPEAK FIRST, PRONUNCIATION FOCUS, MEDIATION MOVE, FLUENCY RULE, FLUENCY EXIT; no homework

## What changes for B1 (difficulty only)
| | B2 | B1 |
|---|---|---|
| Reading (L1–7 / 8–14 / 15–22) | 100+ / 140+ / 180+ words | 70–160 / 100–180 / 120–200, always shorter than B2 |
| Listening | 70+ / 90+ / 110+ words | 60–120 / 70–130 / 80–140 |
| Average sentence length (reading) | ~15–21 words | ≤ 14 words, always shorter than B2 |
| Writing range | 40–60 → 180–220 | 30–45 → 140–180, always shorter than B2 |
| Vocabulary | upper-intermediate, collocations | high-frequency words with plain definitions |
| Live speaking turns | think 15s, speak 30–45s | think 20s, speak 20–30s |

## Files
- `public/speakup-b1-blueprint.js` — workbook lessons (`SPEAKUP_B1_BLUEPRINT`) and Live lessons (`SPEAKUP_B1_LIVE_LESSONS`)
- `public/speakup-b1-northstar-v1.js` — installs authored lessons into `BOOK_PACKS['speakup-b1']` and `LIVE_BOOKS['speakup-b1']` using the shared B2 lesson mapper; lessons not yet authored keep their existing content
- `scripts/qa-b1.mjs` — blocking gate (`npm run qa:b1`, runs in `prestart`)

The Northstar engine and the AI graders read the level from the lesson ID, so B1 lessons are graded as B1 and B2 behaviour is unchanged.

## Rollout
- Lessons are authored in phases. Phase 1: Lessons 1–3.
- `speakup-b1` stays **inactive** for learners until all 22 lessons pass `qa:b1` and are approved. Admins and teachers can preview it from Books.
- Activation step (separate task): set the book to `ready`, allow `su-b1-l*` in the server learning-lesson gate, and add the B1 curriculum tag to attempts.

## Change discipline
Future B1 changes must preserve stable IDs and topics, keep the grammar focus aligned with B2, pass `npm run qa:b1` and `npm run qa:b2`, and update this standard when the contract changes.
