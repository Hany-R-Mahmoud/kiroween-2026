# Implementation Plan: Final Polish

## Overview

Four small fixes in order, then checks, a dev-only import and the handover. All tasks are required. No task makes a commit or a push. Execution stops and reports if any fix would change a Protected_Surface in normal motion (`/`, `/legends`, the Banshee atlas page and book, the game Hall, the study, the Banshee world). Do not edit the Hall in the app. Load `.env` into the shell only, never print values. The production database is not touched.

## Tasks

- [x] 1. Yuki-onna dramatization label
  - [x] 1.1 Add the label and run the content check
    - Read `content/legends/banshee.md` line 19 for the form; add `[Dramatization]` at the start of the Cold_Open paragraph in `content/legends/yuki-onna.md`; change nothing else
    - Run `pnpm check:content` for yuki-onna
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. Result-aware fairness text
  - [x] 2.1 Make the "Reading of the findings" template depend on Known_Findings
    - In `skeleton/test/play-atlas-player.property.test.ts` (~line 145): when `KNOWN_CONTENT_FINDINGS` is empty write one plain line (all legends win every seed; the slot table lists only wrong answers the player recovered from); otherwise keep the old lines
    - Change no player, seed, budget or assertion
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 2.2 Regenerate the fairness report
    - Run the Fairness_Test with `FAIRNESS_WRITE=1`; confirm `docs/phase-4-notes/fairness.md` no longer has "known findings", "cluster on true-or-told" or "Owner decision needed"
    - _Requirements: 3.4_

- [x] 3. Two old game browser checks
  - [x] 3.1 Hall_Check: establish the intended height
    - Read `scene.css` and the Batch A to D handovers in `docs/`; use `git log -S` to date the change from `min(70dvh, 36rem)` to `clamp(18rem, 64dvh, 40rem)`
    - If intended, update only the expected rule in `apps/game/scripts/browser-check.mjs` (~line 668); if the app seems wrong, change nothing and record the finding
    - Verify in a real browser at the check's viewport; record what was found
    - _Requirements: 1.1, 1.2, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 3.2 Motion_Check: list animations under reduced motion
    - In a real browser at the check's viewport with reduced motion emulated, list the running fear animation names and the properties they change
    - If only opacity or colour changes, update the check (~line 772) to assert no movement or scale animation runs; if something moves, make the smallest fix inside the reduced-motion CSS block only, and stop and report if it would touch normal motion on a Protected_Surface
    - Record what was found
    - _Requirements: 1.1, 1.2, 5.1, 5.2, 5.3, 5.4_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Final checks
  - [x] 5.1 Typecheck, tests and audit
    - Load `.env` into the shell only. Run once: `pnpm -r typecheck` and `pnpm -r test`
    - Run `pnpm --filter @kiroween/skeleton audit:content` and confirm all zeros in the gaps table
    - _Requirements: 1.4, 6.1, 6.2_

  - [x] 5.2 Build, serve and run the game browser check
    - Build and serve the game and the atlas on ports other than 3305 and 3306 (for example 3500 and 3501)
    - Run the Browser_Check once for the groups keyboard, touch, motion and the Hall group; report pass or fail against the last run (35 passed, 2 failed in keyboard, touch, motion)
    - Stop every server afterwards
    - _Requirements: 6.3, 6.4_

  - [x] 5.3 Dev import and local label check
    - Confirm the target is the dev branch without printing values; if not clearly dev, do not import and report the blocker
    - Run `pnpm --filter @kiroween/skeleton db:import`, serve the atlas locally, open `/legends/yuki-onna` and confirm the label shows; stop the server
    - _Requirements: 6.5, 6.6, 6.7_

- [x] 6. Handover
  - [x] 6.1 Write the handover and the usage entry
    - Write `docs/final-polish-handover.md`: what changed, the Hall_Check and Motion_Check findings, the check results against the last run
    - Add a short entry to `docs/kiro-usage.md`
    - Confirm no server is running, make no commit and no push, and report the full list of changed files
    - _Requirements: 1.3, 7.1, 7.2, 7.3_

## Notes

- Every task is required; none is optional.
- Property-based testing does not apply to these edits (see design, Testing Strategy). The existing fast-check tests run as gates.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["3.1"] },
    { "id": 4, "tasks": ["3.2"] },
    { "id": 5, "tasks": ["4"] },
    { "id": 6, "tasks": ["5.1"] },
    { "id": 7, "tasks": ["5.2"] },
    { "id": 8, "tasks": ["5.3"] },
    { "id": 9, "tasks": ["6.1"] }
  ]
}
```
