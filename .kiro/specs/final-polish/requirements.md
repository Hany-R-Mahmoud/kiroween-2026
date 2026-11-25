# Requirements Document

## Introduction

The owner approved a final polish before submission. The demo video is already recorded, so nothing a player or reader sees in normal motion may change on the entry page `/`, on `/legends` (hero, map, cards), on the Banshee atlas page and its book, in the game Hall, in the study, or in the Banshee world (layout, size, colour, text, animation). If a fix would need such a change, execution stops and reports. The batch follows `content/legend-format.md` and `.kiro/steering/content.md`, `product.md` and `tech.md`.

Four items: (1) the Yuki-onna cold open lacks the `[Dramatization]` label that `legend-format.md` requires for imagined scenes; (2) `docs/phase-4-notes/fairness.md` carries stale "Reading of the findings" text produced by a fixed template in `skeleton/test/play-atlas-player.property.test.ts`; (3) two old game browser checks fail in `apps/game/scripts/browser-check.mjs` (Hall scene height, reduced-motion animations); (4) final checks, a dev-only import and a handover. The owner asks for the label edit in the legend text for this batch only.

## Glossary

- **Polish_Batch**: the work described by this spec.
- **Yuki_Onna_File**: `content/legends/yuki-onna.md`.
- **Cold_Open**: section "1. Cold open" of a legend file.
- **Fairness_Test**: `skeleton/test/play-atlas-player.property.test.ts`.
- **Fairness_Report**: `docs/phase-4-notes/fairness.md`.
- **Known_Findings**: the `KNOWN_CONTENT_FINDINGS` list in the Fairness_Test.
- **Browser_Check**: `apps/game/scripts/browser-check.mjs`.
- **Hall_Check**: the Browser_Check test "hall: the scene height follows the dynamic viewport".
- **Motion_Check**: the Browser_Check test "reduced motion: only the opacity fade runs".
- **Protected_Surfaces**: `/`, `/legends` (hero, map, cards), the Banshee atlas page and book, the game Hall, the study, the Banshee world.
- **Dev_Database**: the database named in `.env` for the dev branch; production is excluded.
- **Handover**: `docs/final-polish-handover.md`.

## Requirements

### Requirement 1: Protected surfaces

**User Story:** As the owner, I want the recorded surfaces unchanged, so that the live app matches the demo video.

#### Acceptance Criteria

1. THE Polish_Batch SHALL leave the layout, size, colour, text and animation of every Protected_Surface unchanged.
2. IF a fix would change a Protected_Surface in normal motion, THEN THE Polish_Batch SHALL stop that fix and report it in the Handover.
3. THE Polish_Batch SHALL make no commit and no push.
4. THE Polish_Batch SHALL load `.env` into the shell only and print or write no value from it.

### Requirement 2: Yuki-onna dramatization label

**User Story:** As a reader, I want imagined scenes marked, so that I can tell dramatization from record.

#### Acceptance Criteria

1. THE Yuki_Onna_File SHALL start the Cold_Open paragraph with `[Dramatization]`, in the same form the other 11 legends use (for example `content/legends/banshee.md` line 19).
2. THE Polish_Batch SHALL change no other character of the Yuki_Onna_File.
3. WHEN the label is added, THE Polish_Batch SHALL run `pnpm check:content` for yuki-onna and fix the label only if the check fails because of it.

### Requirement 3: Result-aware fairness text

**User Story:** As the owner, I want the fairness report to match its numbers, so that it does not claim findings that no longer exist.

#### Acceptance Criteria

1. WHILE Known_Findings is empty, THE Fairness_Test SHALL write one short plain line in "Reading of the findings" stating that all legends win every seed and that the slot table lists only wrong answers the player recovered from.
2. WHILE Known_Findings is not empty, THE Fairness_Test SHALL write the existing lines of that section unchanged.
3. THE Polish_Batch SHALL leave the player, the seeds, the budget and every assertion of the Fairness_Test unchanged.
4. WHEN the Fairness_Test runs with `FAIRNESS_WRITE=1`, THE Fairness_Test SHALL regenerate the Fairness_Report without the stale lines "known findings", "cluster on true-or-told" and "Owner decision needed".

### Requirement 4: Hall_Check

**User Story:** As the maintainer, I want the Hall check to match the intended Hall height, so that a red check means a real problem.

#### Acceptance Criteria

1. THE Polish_Batch SHALL leave the Hall CSS and every app file unchanged.
2. THE Polish_Batch SHALL read the Hall CSS (`scene.css`, `clamp(18rem, 64dvh, 40rem)`) and the Batch A to D handovers to establish when the height rule changed and whether the change was intended.
3. WHERE the app height is intended, THE Polish_Batch SHALL update the expected rule of the Hall_Check to match the Hall CSS at the viewport the check uses.
4. IF the app height appears wrong, THEN THE Polish_Batch SHALL leave the app and the Hall_Check unchanged and report the finding.
5. THE Polish_Batch SHALL verify the result in a real browser at the viewport the Browser_Check uses.

### Requirement 5: Motion_Check

**User Story:** As a player who prefers reduced motion, I want no movement or scaling, so that fear looks stay comfortable.

#### Acceptance Criteria

1. WHEN `prefers-reduced-motion: reduce` is active, THE Polish_Batch SHALL list the fear animation names that run, found in a real browser at the viewport the Browser_Check uses.
2. WHERE every running animation changes only opacity or colour, THE Polish_Batch SHALL update the Motion_Check to assert that no movement or scale animation runs and only opacity or colour changes.
3. IF an animation moves or scales an element under reduced motion, THEN THE Polish_Batch SHALL fix it with the smallest change inside the reduced-motion CSS block only.
4. IF that fix would change a Protected_Surface in normal motion, THEN THE Polish_Batch SHALL leave the app unchanged and report the finding.

### Requirement 6: Final checks

**User Story:** As the owner, I want evidence, so that I can review without rerunning anything.

#### Acceptance Criteria

1. THE Polish_Batch SHALL run once: `pnpm -r typecheck` and `pnpm -r test`.
2. THE Polish_Batch SHALL run `pnpm --filter @kiroween/skeleton audit:content` and confirm all zeros in the gaps table.
3. THE Polish_Batch SHALL build and serve the game and the atlas on ports other than 3305 and 3306 (for example 3500 and 3501), run the Browser_Check once for the groups keyboard, touch, motion and the Hall group, and report pass or fail against the last run of 35 passed and 2 failed in keyboard, touch, motion.
4. THE Polish_Batch SHALL stop every server afterwards.
5. WHEN the target is confirmed as the Dev_Database without printing values, THE Polish_Batch SHALL run `pnpm --filter @kiroween/skeleton db:import` and open `/legends/yuki-onna` locally to confirm the label shows.
6. IF the target is not clearly the Dev_Database, THEN THE Polish_Batch SHALL not run the import and SHALL report the blocker.
7. THE Polish_Batch SHALL leave the production database untouched; the owner runs the production import after the push.

### Requirement 7: Handover

**User Story:** As the owner, I want a short record, so that I know what changed and what was found.

#### Acceptance Criteria

1. THE Polish_Batch SHALL write the Handover with what changed, the findings for the Hall_Check and the Motion_Check, and the check results.
2. THE Polish_Batch SHALL add a short entry to `docs/kiro-usage.md`.
3. THE Polish_Batch SHALL report the full list of changed files.
4. IF execution is blocked, THEN THE Polish_Batch SHALL stop and report the blocker.
