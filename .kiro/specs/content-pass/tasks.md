# Implementation Plan: Content Pass

## Overview

Baseline first, then one leaf task per legend (the eight known ones get the fairness fix and the prose pass together, the other four get the prose pass only), then final checks, dev import with an atlas check, and the handover. All tasks are required. No task makes a commit or a push. Edits are limited to `content/legends/*.md`, the Known_Findings list in `skeleton/test/play-atlas-player.property.test.ts`, `docs/` and `.debug/content-pass/`. Execution stops if a fix needs a change to `apps/`, `skeleton/src/`, the generator, player, fear constants or matcher. Facts, sources, anchors, chapter ids, tables and Answer_Text stay as they are. Load `.env` into the shell only, never print values. The production database is not touched.

## Tasks

- [x] 1. Baseline
  - [x] 1.1 Run the fairness test and count the prose patterns
    - Run the Fairness_Test with `FAIRNESS_WRITE=1`; read `docs/phase-4-notes/fairness.md` and list the Costly_Slots per legend with slot type
    - Count the five patterns per legend in chapter text and `Hook:` lines, and save counts and seeds won of 40 to `.debug/content-pass/before.md`
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Eight legends with a fairness fix and a prose pass
  - [x] 2.1 banshee
    - Add or reword one Fix_Sentence per Costly_Slot in the linked chapter, then apply the prose pass
    - Run `pnpm check:content` and fix until it passes
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.1, 4.2, 4.3, 4.4_

  - [x] 2.2 chupacabra
    - Same steps as 2.1
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.1, 4.2, 4.3, 4.4_

  - [x] 2.3 draugr
    - Same steps as 2.1
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.1, 4.2, 4.3, 4.4_

  - [x] 2.4 el-coco
    - Same steps as 2.1
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.1, 4.2, 4.3, 4.4_

  - [x] 2.5 gumiho
    - Same steps as 2.1
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.1, 4.2, 4.3, 4.4_

  - [x] 2.6 naddaha
    - Same steps as 2.1
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.1, 4.2, 4.3, 4.4_

  - [x] 2.7 spring-heeled-jack
    - Same steps as 2.1
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.1, 4.2, 4.3, 4.4_

  - [x] 2.8 vetala
    - Same steps as 2.1
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.1, 4.2, 4.3, 4.4_

- [x] 3. Fairness result for the eight legends
  - [x] 3.1 Rerun the fairness test and update Known_Findings
    - Run the Fairness_Test; remove each legend that wins 40 of 40 from `KNOWN_CONTENT_FINDINGS`, and change nothing else in the test
    - Record each remaining Costly_Slot with the reason it is not fixed
    - _Requirements: 2.7, 2.8, 6.1_

- [x] 4. Four legends with the prose pass only
  - [x] 4.1 First remaining legend
    - Name the four legends not in Known_Findings from `content/legends/`; apply the prose pass to the first, in alphabetical order
    - Run `pnpm check:content` and fix until it passes
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.1, 4.2, 4.3_

  - [x] 4.2 Second remaining legend
    - Same steps as 4.1
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.1, 4.2, 4.3_

  - [x] 4.3 Third remaining legend
    - Same steps as 4.1
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.1, 4.2, 4.3_

  - [x] 4.4 Fourth remaining legend
    - Same steps as 4.1
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.1, 4.2, 4.3_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Final checks
  - [x] 6.1 Run audit, typecheck, tests and fairness
    - Load `.env` into the shell only. Run once: `pnpm --filter @kiroween/skeleton audit:content` (all zeros in the gaps table), `pnpm -r typecheck`, `pnpm -r test`, and the Fairness_Test with `FAIRNESS_WRITE=1`
    - Recount the five patterns and write `.debug/content-pass/after.md` with the before and after table per legend: seeds won of 40 and pattern counts
    - _Requirements: 5.1, 5.2_

  - [x] 6.2 Dev import and atlas check
    - Run `pnpm --filter @kiroween/skeleton db:import` against the Dev_Database named in `.env`, never printing values; do not touch production
    - Build the atlas, serve it on port 3500 (not 3305 or 3306), open one changed chapter and confirm the new text shows, then stop every server
    - _Requirements: 5.3, 5.4, 5.5_

- [x] 7. Handover
  - [x] 7.1 Write the handover and the usage entry
    - Write `docs/content-pass-handover.md`: per legend a short list of changes, fairness numbers, and any slot not fixed with the reason
    - Add a short entry to `docs/kiro-usage.md`
    - Confirm no server is running, make no commit and no push, and report the full list of changed files
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

## Notes

- Every task is required; none is optional.
- Property-based testing does not apply to the edits (see design, Testing Strategy). The existing fast-check tests are run as gates.
- The four prose-only legends are those not in the Known_Findings list; task 4 names them from `content/legends/`.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["2.3"] },
    { "id": 4, "tasks": ["2.4"] },
    { "id": 5, "tasks": ["2.5"] },
    { "id": 6, "tasks": ["2.6"] },
    { "id": 7, "tasks": ["2.7"] },
    { "id": 8, "tasks": ["2.8"] },
    { "id": 9, "tasks": ["3.1"] },
    { "id": 10, "tasks": ["4.1"] },
    { "id": 11, "tasks": ["4.2"] },
    { "id": 12, "tasks": ["4.3"] },
    { "id": 13, "tasks": ["4.4"] },
    { "id": 14, "tasks": ["5"] },
    { "id": 15, "tasks": ["6.1"] },
    { "id": 16, "tasks": ["6.2"] },
    { "id": 17, "tasks": ["7.1"] }
  ]
}
```
