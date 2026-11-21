# Implementation Plan: Game Play (Phase 4)

## Overview

Language: TypeScript (`strict: true`), as in the design. Tests use Vitest and fast-check.

Order of work:

1. Preflight: read the docs and check the token key.
2. Skeleton play core: pure rules, token, service, and the property tests.
3. Schema migration (approved SQL, `dev-skeleton-core` only) and the Keeper's Note import.
4. Atlas Keeper's Note page.
5. Game server layer and the two Phase 3 fixes.
6. Game UI foundation.
7. Hall, tutorial room and the Banshee World.
8. **Mid-way stop.** Nothing after it starts until the owner replies.
9. The other eleven Worlds.
10. Kiro agent and hook.
11. Verification.
12. Handover and final stop.

Standing rules for every task (requirements 15 and the process constraints):

- Do not create, edit or delete anything under `content/` or `assets/`. Do not touch `vercel.json`.
- Do not commit or push. Do not start Phase 5.
- Database work only on `dev-skeleton-core`. Never print a secret, a cookie, a token, or the Seed of an unfinished Run.
- Skills: `read-the-damn-docs`, `ponytail`, `agent-security`, `agent-impeccable` (in this thread, reviewer sub-agents off; if not installed under that name, say so and use `impeccable`), `agent-tester`, `agent-guard`, `verify-and-stop`. Do not use `agent-pilot`, `agent-superpowers`, `agent-gamestudio`, or any skill that starts sub-agents.
- Run the property tests after any change to the generator, RNG or lead logic. Never loosen a constant or a test to make a Run pass.
- Package names and script names below follow the design (`@kiroween/skeleton`, `@kiroween/game`, `atlas`). Confirm them in each `package.json` before running a command.
- Property tests are not marked optional. Requirement 13 makes them part of the phase, and the tech rule requires them.
- Property-test sub-tasks carry the tag `Feature: game-play, Property <n>: <title>`, run at least 100 iterations, and use one `fc.assert` each.
- Scratch results go in `docs/phase-4-notes/` (one file per task). Task 11.8 folds them into `docs/phase-4-handover.md`.
- Content note: the owner is rewriting question texts, tap texts and Flying Dutchman [D]/[T] markers in content/ outside Kiro. When content files change, rerun the tests and update the known-findings set (play-atlas-player) and docs/phase-4-notes/fairness.md. Never edit content/.

## Tasks

- [x] 1. Preflight
  - [x] 1.1 Read the current official docs and start the Phase 4 usage entry
    - Use `read-the-damn-docs`. Read TanStack Start server functions, middleware and CSRF; Node `crypto` AES-256-GCM; MDN pointer events, pointer capture and `touch-action`; Neon and Drizzle migrations.
    - Create `docs/phase-4-notes/docs-read.md` with each page and the date read, and note any API that differs from the design.
    - Add a draft Phase 4 section to `docs/kiro-usage.md` listing these pages.
    - If a page contradicts the design, stop and report before coding.
    - _Requirements: 12.1, 16.2_
  - [x] 1.2 Check `GAME_TOKEN_KEY` and add it to the game env
    - Check that `GAME_TOKEN_KEY` is set in `.env` and decodes to 32 bytes, in a way that prints only "set and 32 bytes" or "missing" or "wrong length". Never print the value or any part of it.
    - Add `GAME_TOKEN_KEY=` with a comment and no value to `.env.example`.
    - Extend `apps/game/src/server/env.ts` `parseEnv` to require it, decode it, and throw an `EnvError` that names the variable and never shows its value. Add a unit test for set, missing and wrong length.
    - If the variable is missing or has the wrong length, stop, name it and wait for the owner.
    - _Requirements: 7.8, 7.12, 15.6, 15.7_

- [x] 2. Skeleton play core
  - [x] 2.1 Create the foundation modules
    - In `skeleton/src/play/`: `types.ts` (wire types: `PlayView`, `Reply`, `EndInfo`, `Action`), `fearTable.ts` (`HOTSPOT_FEAR`, `HOTSPOT_FEAR_STEP`), `fear.ts` (`FEAR` constants: wrongAnswer 15, hint2 6, deadEnd 6, tutorialHint2 10, max 100), `errors.ts` (`PlayError` with fixed messages and statuses), `validate.ts` (strict zod schemas, id regex, token regex, option 0 to 3, tutorial answer 1 to 40 characters).
    - Export the browser-safe types and fear constants from `client.ts` and keep the existing browser-safety test green.
    - _Requirements: 6.1, 7.14_
  - [x] 2.2 Implement the pure engine
    - `state.ts` (`PlayState`, `playStateSchema`), `engine.ts` (`initState`, `step` for tap, hint1, hint2, answer, follow, with the end checks: restart first, then win), `relic.ts` (`relicOf`, display name rules, `jersey-devil` fallback).
    - No `Date`, no I/O, no `Math.random`. Apply `HOTSPOT_FEAR` once per Hotspot per Run and only when the served role equals the authored role. Treat a `step: null` link as collecting every step. Treat the slot flagged `isFinal`, else the last slot, as final.
    - _Requirements: 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.13, 4.14, 5.1, 5.3, 5.5, 6.2, 6.3, 6.5, 7.4, 7.16_
  - [x] 2.3 Implement `toView`
    - `view.ts`: build `PlayView` from Earned_Data only. Question and options only for an open slot, in generator order; Hint 2 anchor only after use; the same lead fields for true and dead-end leads; Seed and curse text only on an ended Run.
    - _Requirements: 4.12, 5.6, 7.2, 7.3_
  - [x] 2.4 Implement the token codec
    - `token.ts`: AES-256-GCM, fresh 12-byte IV, additional authenticated data `v1|<kind>|<legendId>`, format `v1.` plus base64url, payload with `v`, `exp`, `legendId`, `seed`, `state`. Kinds: play, tutorial, receipt. Play expiry 6 hours, receipt 365 days. Injected clock and key. One fixed error for every failure.
    - _Requirements: 7.8, 7.9, 7.10, 7.11, 7.13_
  - [x] 2.5 Implement the tutorial rules
    - `tutorial.ts`: seeded pick of `d-year`, `d-keys` or `d-rooms` with `createRng('tutorial/' + seed)`, `normaliseAnswer`, answer check with "Also accept", Hint 1 constant, Hint 2 with `FEAR.tutorialHint2` once, reward, receipt creation.
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_
  - [x] 2.6 Implement hall rules and the hub contrast report
    - `play/hall.ts`: door state from visitor, tutorial flag, legend id and guest world; curses remaining as 12 minus distinct broken worlds.
    - `theme/hub.ts`: `hubContrastReport()` for the pairings in the design.
    - _Requirements: 1.3, 1.4, 1.5, 1.7_
  - [x] 2.7 Implement the store port and the service
    - `store.ts` (the `PlayStore` port) with an in-memory implementation for tests, and `service.ts`: `startWorld`, `actInWorld`, `startTutorial`, `actInTutorial`, `redeemTutorialReceipt`. Include resume, restart with a new Seed (retry up to `MAX_SEED_TRIES`), `rev` retry once then 409, score from server counts with `score/score.ts` unchanged, guest refusal for other worlds, and a user id in every store call.
    - _Requirements: 4.6, 6.5, 6.6, 7.1, 7.4, 7.5, 7.7, 7.14, 7.15, 7.17, 2.12_
  - [x] 2.8 Write property tests for the token codec
    - **Property 1: Token round trip**
    - **Property 2: Bad tokens are refused with one message**
    - Cover one-character change at every position, truncation, other legend, other kind, expiry, other key.
    - **Validates: Requirements 7.8, 7.9, 7.10, 13.7**
  - [x] 2.9 Write property tests for payload secrecy
    - **Property 3: Responses never carry secrets before they are earned**
    - **Property 4: The correct option position is not fixed**
    - Use an in-memory store and the real service, for a fresh Run and after each action.
    - **Validates: Requirements 7.1, 7.2, 7.3, 4.12, 5.6, 1.8, 13.5**
  - [x] 2.10 Write property tests for answers and hints
    - **Property 5: Answers are checked on the server and counted**
    - **Property 6: Hint 1 is free and Hint 2 is charged once**
    - **Property 7: The Hint 2 chapter contains the answer**
    - **Validates: Requirements 5.1, 5.3, 5.5, 5.7, 6.2, 7.4**
  - [x] 2.11 Write property tests for taps and hotspot fear
    - **Property 8: Taps open slots by role and use the right text**
    - **Property 9: Hotspot fear changes apply once, from the table**
    - Add the guard test: any `onTap` text in the 12 legend files that matches `/\b(fear|meter|tick)\b/i` must be in `HOTSPOT_FEAR` or the "none" list.
    - **Validates: Requirements 4.7, 4.8, 6.1**
  - [x] 2.12 Write property tests for leads and the final slot
    - **Property 10: Leads are followable only when collected, and dead ends are provable**
    - **Property 11: The final slot opens last**
    - **Validates: Requirements 4.9, 4.10, 4.11, 4.13, 6.3, 13.4**
  - [x] 2.13 Write property tests for win, score and fear
    - **Property 12: A Run is won exactly when every slot is solved and the true lead is followed, and the score is the server's**
    - **Property 13: Fear stays in range and a full meter restarts with a new Seed**
    - Include known-count score cases against the Phase 2 formula.
    - **Validates: Requirements 4.14, 6.5, 6.6, 7.5, 13.3, 13.8**
  - [x] 2.14 Write the resume property test
    - **Property 15: Saved state resumes to the same view**
    - Cover the store path and the token path.
    - **Validates: Requirements 7.7, 7.17**
  - [x] 2.15 Write property tests for ownership and input validation, plus source tests
    - **Property 19: Players cannot touch each other's Runs, and guests cannot enter other worlds**
    - **Property 20: Input is validated or refused with a fixed message**
    - Source tests: no `Math.random` anywhere under `skeleton/src/play`; a store spy shows no store call for a guest.
    - **Validates: Requirements 7.14, 7.15, 7.16, 7.11**
  - [x] 2.16 Write property tests for the tutorial and the receipt
    - **Property 16: Tutorial detail pick is deterministic and covers all three**
    - **Property 17: Tutorial answers**
    - **Property 18: Tutorial Hint 2 costs fear once**
    - **Property 21: The tutorial receipt is redeemed once and cannot be forged**
    - Add an example test that the Hint 1 constant equals the text in `content/hub-and-tutorial.md`, and one per detail for the digit and "Also accept" forms.
    - **Validates: Requirements 2.3, 2.4, 2.5, 2.7, 2.8, 2.10, 2.12, 13.6**
  - [x] 2.17 Write the hall rules property test and the hub contrast test
    - **Property 22: Hall rules are a function of visitor, tutorial flag and world**
    - Contrast test pins every pairing in the design table, including danger on background at 3.0.
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.7**
  - [x] 2.18 Write the fear budget test
    - Import the constants from `fear.ts` and `fearTable.ts`, derive the real maxima from the 12 legends (slots, dead ends, positive `HOTSPOT_FEAR` entries), assert the budget rule: worst-case sum (every Hint 2, every dead end, every positive hotspot tick) + 2 × FEAR.wrongAnswer < FEAR.max. Assert exactly that, reading the constants. Fail if a legend exceeds the design's maxima. No literal copy of the constants.
    - **Validates: Requirements 6.1**
  - [x] 2.19 Write the scripted player, the guessing player and the fairness report
    - Test helper `playFromAtlas` as in the design: uses only views and chapter text at the anchors the views gave; matches an option to the fact's statement; counts ambiguity per legend; follows leads in a seeded shuffled order.
    - **Property 14: A player who reads only the atlas wins** for all 12 legends under the real fear constants.
    - Guessing player: for every legend, reach a full meter, restart with a different Seed, and keep the old row's counts.
    - Write the per-legend fairness table (slot-instances, ambiguous, wrong answers paid, restarts) to `docs/phase-4-notes/fairness.md`.
    - **STOP if any legend cannot be won under the fear budget.** Report the legend and slots as a content finding and wait. Do not change the constants, the budget or the test.
    - **Validates: Requirements 13.2, 13.3**
  - [x] 2.20 Guard and security pass on the skeleton play core
    - Run `agent-guard` and `agent-security` over `skeleton/src/play`, `theme/hub.ts` and their tests. Fix findings, then run the skeleton suite (`pnpm --filter @kiroween/skeleton test --run`) and typecheck.
    - Record findings in `docs/phase-4-notes/guard-skeleton.md`.
    - _Requirements: 7.1 to 7.17_

- [x] 3. Schema migration and the Keeper's Note import
  - [x] 3.1 Implement the Keeper's Note parser, planner and reader mapping
    - `skeleton/src/keepers/parse.ts`, `plan.ts`, `read.ts`: a separate parser for `content/keepers-note.md` (title, label, reading time, hook, chapter, anchor, three detail rows) with line-numbered errors. Do not import or change the legend parser, audit, `check:content` or `db:import`.
    - _Requirements: 3.1, 3.2, 3.9_
  - [x] 3.2 Write the Keeper's Note round-trip property test and parse examples
    - **Property 25: Keeper's Note import round trip**
    - Examples: anchor appears once; each of the three phrases appears exactly once in the chapter; no other year or count matches an answer.
    - **Validates: Requirements 3.2, 3.9**
  - [x] 3.3 Generate and apply the approved schema migration (dev only)
    - Use `read-the-damn-docs` results from 1.1. Edit the skeleton schema to add `keepers_note`, `keepers_note_details`, `runs.play_state`, `runs.rev` and `player_flags`, then generate the Drizzle migration.
    - Compare the generated SQL with the approved SQL in the design (including the single `GRANT SELECT ON keepers_note TO atlas_reader`). **If it differs, STOP and show the diff before applying anything.**
    - Confirm the connection target is `dev-skeleton-core` before applying. Apply it, then confirm the game role can read and write the new objects; if a grant is missing, stop and list it.
    - Add the grant to the privilege lists the repo keeps. Record the migration file name in `docs/phase-4-notes/migration.md`.
    - _Requirements: 3.8, 3.10, 7.7, 15.4, 15.5_
  - [x] 3.4 Implement the Postgres play store
    - `skeleton/src/db/playStore.ts`: `current`, `begin`, `save` (with the `rev` check), `end` (one transaction, optional follow-up row), `tutorialDone`, `markTutorialDone` (`ON CONFLICT DO NOTHING`). Parameterized queries only; `user_id` in every `WHERE`. Treat an in-progress row with an empty or invalid state as abandoned.
    - _Requirements: 7.7, 7.14, 7.17, 2.12_
  - [x] 3.5 Add the importer script and run it against `dev-skeleton-core`
    - `scripts/import-keepers-note.ts` and the package script `db:import-keepers-note`: one transaction, idempotent by `content_hash`, does not call the legend importer.
    - Run it after 3.3 has been applied. Record the row counts in `docs/phase-4-notes/migration.md`.
    - _Requirements: 3.1, 3.2, 3.3, 15.4_
  - [x] 3.6 Extend the reader role checks
    - Update `db:check-reader` and the reader privilege list test so the atlas role can read `keepers_note` and cannot read `keepers_note_details`, `player_flags` or `runs`, and the list holds exactly the new privilege and nothing else. Run `db:check-reader`.
    - **Validates: Requirements 3.8, 13.11**
  - [x] 3.7 Guard pass on the schema and import work
    - Run `agent-guard` over `skeleton/src/keepers`, `skeleton/src/db/playStore.ts` and the scripts. Fix findings and run the skeleton suite.
    - _Requirements: 3.1 to 3.10, 7.14_

- [x] 4. Atlas Keeper's Note page
  - [x] 4.1 Add the page, the anchor lookup and the footer link
    - In `apps/atlas`: handle `keepers-note` in the legend route before the legend lookup, reading `keepers_note` through the reader role; render title, label "Fiction: the story of this archive", chapter and hook with one element `id="keepers-note--ch-1"`; extend the anchor lookup with a second read of `keepers_note.anchor` (same `resolveAnchor` signature); add the footer link and catalog strings. Do not change `listLegends` or `atlasUrl`.
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7_
  - [x] 4.2 Write atlas tests for the Keeper's Note
    - Render test (title, label, one `id`), footer link, `resolveAnchor` and `atlasUrl('keepers-note--ch-1')` examples, and the note absent from `listLegends`. Keep the existing 154 atlas tests green.
    - _Requirements: 3.4, 3.5, 3.6, 3.7, 13.11_
  - [x] 4.3 Guard pass on the atlas changes
    - Run `agent-guard` over the atlas diff. Fix findings and run `pnpm --filter atlas test --run`.
    - _Requirements: 3.1 to 3.9, 15.2_

- [x] 5. Game server layer and the two Phase 3 fixes
  - [x] 5.1 Fix `serve-build.mjs` for malformed percent paths
    - Wrap `decodeURIComponent` so a `URIError` answers 400 and the server keeps running. Add tests for `/game/%E0%A4%A` and `/game/%`.
    - _Requirements: 10.1_
  - [x] 5.2 Fix the no-hardcoded-text test
    - Make the test fail on a JSX line that holds only a word, and add a meta test that feeds it a failing sample and expects failure.
    - _Requirements: 10.2, 10.3_
  - [x] 5.3 Rewrite the game server functions
    - Use the docs read in 1.1. Wire the play store and token codec into `server/db.ts` and `server/env.ts`. In `functions.ts`: extend `getShell` (`mediaBase`) and `getHall`; add `getWorldInfo`, `startWorld`, `worldAct`, `startTutorial`, `tutorialAct`, `redeemTutorialReceipt`; **remove `startRunFn` and `finishRunFn`**. Each function: CSRF middleware kept, strict schema, `requireUser` where needed, fixed errors through `safely()`, no user id from the browser. `getAccount` shows the Seed for ended Runs only.
    - _Requirements: 4.6, 7.1, 7.6, 7.14, 7.15, 1.8, 2.12_
  - [x] 5.4 Write game server tests
    - Source test that `startRunFn` and `finishRunFn` are absent from the source and the built server manifest; build grep that `GAME_TOKEN_KEY` is not in the client bundle; guest world refusal returns the redirect and no data; payload tests call the same service functions the server functions call. Keep the 46 Phase 3 game tests green.
    - _Requirements: 7.6, 7.12, 7.15, 13.1, 13.5_
  - [x] 5.5 Guard and security pass on the server layer
    - Run `agent-guard` and `agent-security` over `apps/game/src/server`, `scripts/serve-build.mjs` and the new tests. Fix findings and run the game suite.
    - _Requirements: 7.14, 10.1 to 10.3_

- [x] 6. Game UI foundation
  - [x] 6.1 Add the new UI sentences to the catalog
    - Add every key in the design's "New UI sentences" tables to `apps/game/src/i18n/en.ts` with Arabic placeholder entries as today, and remove `world.comingLater`. Flag the G8 sentences for owner review in a comment.
    - _Requirements: 9.1, 9.5_
  - [x] 6.2 Implement the pan and media helpers
    - `lib/pan.ts` (`clampPan`, `panToReveal`, physical-x comment) and `lib/media.ts` (`mediaUrl(base, assetId)` through `assetUrl`, refusing ids `assetUrl` refuses).
    - _Requirements: 8.3, 8.4, 8.6, 11.1, 11.2_
  - [x] 6.3 Create the layout types, fear event data and registry
    - `layout/types.ts` (`HotspotBox`, `SceneLayout`, `WorldLayout`, `MIN_BOX` 176), `layout/fearEvents.ts` (trigger and caption kind for every legend event, per the design table), and `layout/index.ts` registering layouts with `import.meta.glob('./worlds/*.ts', { eager: true })`.
    - Add layout tests: inside 4096 by 1536, size at least `MIN_BOX`, no overlap in a scene, `x` ascending, sprite or region present, every content Hotspot has exactly one box, sprite matched by the single asset `usage` text that names it (zero or two matches fail), scene file matched by name and order, every asset id maps through `assetUrl` to an existing file. A fear-events test checks exactly one entry per event for every legend. The "every legend has a layout" check is added in 9.12.
    - _Requirements: 4.1, 4.2, 4.3, 4.16, 4.17, 11.1, 13.9, 13.10_
  - [x] 6.4 Build the Scene_Viewer, Hotspot and scene navigation components
    - Use the pointer-events docs from 1.1. `SceneViewer` (drag with pointer capture, 8 px click-cancel threshold, `touch-action: pan-y`, arrows, Home, End, pan buttons, clamped bounds, focus pans into view, real `width` and `height`, `fetchpriority="high"`, lazy sprites), `Hotspot` (focusable button, accessible name, marked state with ring, icon and hidden text), `SceneNav` (tabs, previous, next, back to the hall, `PageUp` and `PageDown`, live region). Logical CSS only; 44 px targets. Styles go in `components/scene.css`.
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.6, 8.7, 8.9, 8.10, 9.2, 14.1_
  - [x] 6.5 Apply themes and fonts
    - Apply the resolved World theme vars with `resolveTheme` from `@kiroween/skeleton/client`, add the font imports the atlas uses, and add the hub theme variables for the Hall and Tutorial_Room. Styles go in `styles/theme.css`.
    - _Requirements: 4.5, 9.2_
  - [x] 6.6 Write the pan and media property tests
    - **Property 23: Pan helpers keep the scene inside the viewport**
    - **Property 24: Image URLs are the canonical ones**
    - **Validates: Requirements 8.3, 8.6, 11.1, 11.2**
  - [x] 6.7 Build the fear overlay, motion setting and spirit panel parts
    - Non-interactive overlay (`pointer-events: none`), at most 4 s between events, reduced-motion path (static caption, fade at most 400 ms, per-event line where it exists), settings toggle stored in `kiroween.motion.v1`, fear meter with `shared-game-ui-fear-01` and a text equivalent. Keyframe test: no more than 3 flashes in any one second.
    - _Requirements: 6.4, 6.7, 6.8, 6.9_
  - [x] 6.8 Write component tests for the viewer
    - Keys and buttons pan and stay in bounds, drag over the threshold does not activate a Hotspot, Enter, Space and click give the same result, accessible names present, marked mark is not colour only, image attributes set.
    - _Requirements: 8.2, 8.5, 8.7, 8.10, 11.4, 14.1_
  - [x] 6.9 Guard pass on the UI foundation
    - Run `agent-guard` over the new components, helpers and tests. Fix findings and run the game suite.
    - _Requirements: 8.1 to 8.10, 9.1 to 9.5_

- [x] 7. Hall, tutorial room and the Banshee World
  - [x] 7.1 Write the hall and tutorial layouts
    - `layout/hub.ts` (18 Hotspots, 12 doors in the table order of `content/hub-and-tutorial.md`, regions) and `layout/tutorial.ts` (7 Hotspots, corkboard outside the visible area at 390 px). Check positions with the dev overlay `?layout=1`.
    - _Requirements: 1.1, 2.1, 2.2, 4.16_
  - [x] 7.2 Write the Banshee layout
    - `layout/worlds/banshee.ts`: three scenes, every Hotspot with its sprite, `banshee-game-hotspot-15` cropped left for `hs-bedstead` and right for `hs-candle`.
    - _Requirements: 4.1, 4.2, 4.16_
  - [x] 7.3 Write the hall and tutorial role table tests
    - Compare the hall Hotspot list, door order and tutorial roles with `content/hub-and-tutorial.md`.
    - _Requirements: 1.1, 2.1_
  - [x] 7.4 Build the client play library
    - `lib/play.ts`: calls the server functions, keeps the guest token per legend in `kiroween.guest.play.v1.<legendId>`, the tutorial receipt in `kiroween.guest.tutorial.v1`, and guest broken worlds from the server's ended result; clears a refused token; redeems the receipt once after sign-in.
    - _Requirements: 1.12, 2.12, 7.11_
  - [x] 7.5 Build the Hall route
    - Route `/`: Scene_Viewer with the hall Hotspots, door states and panels, ledger, clock in hours, cabinet with relics, decoy results, ending screen; remove the Phase 2 door cards. "Read the legend" links through `ATLAS_ORIGIN` and `legendUrl`.
    - _Requirements: 1.1 to 1.12_
  - [x] 7.6 Build the Tutorial route
    - Route `/tutorial`: pan prompt, the seven Hotspots, drawer with digit input, Hint 1 highlight, Hint 2 opening the atlas in a new tab with `rel="noopener"`, fixed refusal on a wrong code, mirror event, reward (key, first cabinet slot glow), tutorial marked done.
    - _Requirements: 2.1 to 2.12_
  - [x] 7.7 Build the World route
    - Route `/world/$target`: scene navigation, notebook of slots (number and type before open), spirit full and close figures, question panel with option buttons, tried options disabled, Hint 1 and Hint 2, leads and dead-end panels with proof links, fear meter, restart notice, ending panel (curse prose, relic, score, Seed), resume on entry. Sprites and scenes for the current World only.
    - _Requirements: 4.1 to 4.14, 5.1 to 5.4, 6.4, 6.5, 14.1_
  - [x] 7.8 Regenerate the route tree and write render tests
    - Regenerate `routeTree.gen.ts` with the TanStack tool (never by hand). Render tests: door states, panels, no door cards, ending, tutorial flow, World flow with a mocked client library, restart notice.
    - _Requirements: 1.2 to 1.11, 2.9, 4.14, 6.5_
  - [x] 7.9 Guard pass on the playable slice
    - Run `agent-guard` over the routes, layouts, client library and tests. Fix findings and run `pnpm -r test --run` and typecheck.
    - _Requirements: 1 to 8, 13.1_

- [x] 8. MID-WAY STOP: the Hall, tutorial and Banshee World are playable end to end
  - Run `pnpm -r test --run` and typecheck, and fix failures.
  - Do not start the dev servers from the agent. Give the owner these commands to run in two terminals (confirm script names in `package.json` first): atlas `pnpm --filter atlas dev` (port 3001, serves `/media` and the Keeper's Note), game `pnpm --filter @kiroween/game dev` (port 3000, opens at `/game`).
  - Give the owner a try-list: pan by drag, arrow keys and buttons; open the ledger, clock and cabinet; try a locked door before the tutorial; finish the tutorial using Hint 1, then Hint 2 and read the Keeper's Note in the atlas; enter Banshee; open each scene; tap decoys; use Hint 1 and Hint 2; answer wrong until the fear restart; follow a dead end and read its proof in the atlas; win and check the relic in the cabinet; sign in and resume; check at 390 px width and with reduced motion on; use `?layout=1` to see boxes.
  - **STOP and wait for the owner's feedback. Do not build the other eleven Worlds until the owner replies.** Apply requested changes first.

- [x] 8. Mid-way review fixes (8A)
  - Source: the owner's mid-way review of the Hall, Tutorial and Banshee World (task 8). Run 8A.1 to 8A.4 in this order, before any task 9.x, 10.x or 11.x. Never edit `content/` or `assets/`.
  - [x] 8.1 (8A.1) Map hall door ids to legend ids explicitly
    - Source: owner's mid-way review. Content hub id `hub-door-dutchman` does not match legend id `flying-dutchman`, so door 1 gets no lock, the label "Brass lamp", cannot be entered, and its relic slot never fills.
    - Add an explicit mapping from hub door ids to legend ids in game code (not in `content/`). Use it in the Hall for the lock, label, enter action, relic slot and atlas link.
    - Add a test that all 12 doors map to real legend ids (taken from the legend list) and get the right label.
    - Mutation-check the mapping (for example, break one entry) and confirm a test fails, then revert. Record it in `docs/phase-4-notes/mutations.md`.
    - _Requirements: 1.1, 1.3, 1.4, 1.5_
  - [x] 8.2 (8A.2) Allow one play action in flight at a time
    - Source: owner's mid-way review. Two quick taps send the same guest token, the second reply overwrites the first and progress is lost (seen live, each call about 3 s in dev).
    - In the client play library and the Hall, Tutorial and World routes, allow one play action in flight at a time (queue or disable controls while pending). Show a pending state with a catalog string, `aria-busy` and logical CSS only.
    - Check the signed-in path: a 409 from the `rev` check must reload the state and must not lose progress.
    - Add tests, including two overlapping calls with a delayed fake API, and a 409 reload test.
    - Mutation-check (remove the in-flight guard, remove the 409 reload) and confirm tests fail, then revert.
    - _Requirements: 4.6, 7.4, 7.7, 7.11, 7.17, 14.1_
  - [x] 8.3 (8A.3) Render italic marks in content texts
    - Source: owner's mid-way review. Content uses `*italic*` marks in question texts, options and tap texts, and raw asterisks show in the game.
    - Render them as `<em>` the way the atlas does. Reuse the atlas approach or a shared skeleton helper if one exists. No raw asterisks, no `dangerouslySetInnerHTML`.
    - Add tests for rendering and for accessible names: hotspot accessible names must not contain asterisks.
    - _Requirements: 4.4, 4.7, 5.1, 8.7, 14.1_
  - [x] 8.4 (8A.4) Make the skeleton test suite reliable under load
    - Source: owner's mid-way review. `pnpm -r test` failed 5 skeleton property tests (play-answers-hints, play-atlas-player, play-guessing-anchors, play-taps-fear, play-win-score-fear) while both dev servers were running; one passed alone.
    - Find the cause (likely the default 5 s timeout under CPU load plus parallel heavy files). Fix it with explicit per-test timeouts, vitest `testTimeout`, limited file concurrency for the heavy files in config, or caching generated legends. Do not weaken any property, lower any iteration count, or loosen any constant.
    - Verify by starting both dev servers in the background, running the full `pnpm -r test --run`, then stopping the servers. Record the cause, the change and the result in `docs/phase-4-notes/test-reliability.md`.
    - _Requirements: 13.1, 13.2, 13.3_

- [x] 9. The other eleven Worlds
  - [x] 9.1 Write the Baba Yaga layout
    - `layout/worlds/baba-yaga.ts` with sprites matched by usage text.
    - _Requirements: 4.1, 4.2, 4.16_
  - [x] 9.2 Write the Chupacabra layout
    - `layout/worlds/chupacabra.ts`.
    - _Requirements: 4.1, 4.2, 4.16_
  - [x] 9.3 Write the Draugr layout
    - `layout/worlds/draugr.ts`.
    - _Requirements: 4.1, 4.2, 4.16_
  - [x] 9.4 Write the El Coco layout
    - `layout/worlds/el-coco.ts`.
    - _Requirements: 4.1, 4.2, 4.16_
  - [x] 9.5 Write the Flying Dutchman layout
    - `layout/worlds/flying-dutchman.ts`.
    - _Requirements: 4.1, 4.2, 4.16_
  - [x] 9.6 Write the Gumiho layout
    - `layout/worlds/gumiho.ts`.
    - _Requirements: 4.1, 4.2, 4.16_
  - [x] 9.7 Write the Jersey Devil layout
    - `layout/worlds/jersey-devil.ts` (relic name uses the catalog fallback).
    - _Requirements: 4.1, 4.2, 4.16_
  - [x] 9.8 Write the Naddaha layout
    - `layout/worlds/naddaha.ts`.
    - _Requirements: 4.1, 4.2, 4.16_
  - [x] 9.9 Write the Spring-heeled Jack layout
    - `layout/worlds/spring-heeled-jack.ts`.
    - _Requirements: 4.1, 4.2, 4.16_
  - [x] 9.10 Write the Vetala layout
    - `layout/worlds/vetala.ts`.
    - _Requirements: 4.1, 4.2, 4.16_
  - [x] 9.11 Write the Yuki-onna layout
    - `layout/worlds/yuki-onna.ts`.
    - _Requirements: 4.1, 4.2, 4.16_
  - [x] 9.12 Add the all-worlds completeness checks and run the layout tests
    - Add the test that every one of the 12 legends has a layout; run all layout, sprite, scene-file and asset tests. List the relic display names of all 12 legends in the test output for owner review. Fix layout data until green. Do not edit `content/` or `assets/`; if a Hotspot has no unique sprite match, stop and list it.
    - _Requirements: 4.3, 13.9, 13.10_
  - [x] 9.13 Review the Hall, Tutorial_Room and two Worlds with `agent-impeccable`
    - Run in this thread with reviewer sub-agents off. Review the Hall, Tutorial_Room, Banshee and one other World against the design steering and the theme packs (hierarchy, contrast, touch targets, motion, copy). Fix findings. Write `docs/phase-4-notes/impeccable.md`.
    - _Requirements: 4.5, 8.7, 9.2_
  - [x] 9.14 Guard pass on the eleven Worlds
    - Run `agent-guard` over the new layout files and tests. Fix findings and run `pnpm -r test --run`.
    - _Requirements: 4.1 to 4.17, 13.9_

- [x] 10. Kiro custom agent and hook
  - [x] 10.1 Read the current Kiro docs for custom agents and hooks
    - Use `read-the-damn-docs`. Record the page and date in `docs/phase-4-notes/kiro-docs.md`. Check `.kiro/hooks/` for an existing hook that reports physical left and right CSS on save.
    - _Requirements: 12.1_
  - [x] 10.2 Create the `game-balance-reviewer` agent
    - File in the format the docs give: read-only tools, a prompt that reviews puzzle difficulty, fear pacing with the constants in `fear.ts`, and dead-end fairness per World. It writes findings only.
    - _Requirements: 12.2_
  - [x] 10.3 Create the physical-CSS hook if none exists
    - `.kiro/hooks/physical-css-check.json` in the existing `v1` format, trigger on saving `.tsx` and `.css` under `apps/` and `skeleton/`, reports the listed physical properties and edits nothing. Test the command on a failing and a clean sample. If a hook already covers it, record that and add none.
    - _Requirements: 12.4_
  - [x] 10.4 Run the Balance_Reviewer over all twelve Worlds
    - Save findings per World in `docs/phase-4-notes/balance.md`. Do not change constants without the owner's approval; report them.
    - _Requirements: 12.3_
  - [x] 10.5 Record the agent and the hook
    - Add both to the Phase 4 section of `docs/kiro-usage.md`.
    - _Requirements: 12.5, 16.2_

- [x] 11. Verification
  - [x] 11.1 Write and run the smoke check against `dev-skeleton-core`
    - Separate script. As a guest: finish the tutorial, get a receipt, win Banshee through the server functions. As a test user: redeem the receipt, win one other World, check the `runs` row and the score against `score()`. Force one full-fear restart and check both rows. Delete the test users and their rows by exact id. Print no cookie, password, token or Seed of an unfinished Run. Save commands and results to `docs/phase-4-notes/smoke.md`.
    - _Requirements: 13.14, 13.16, 15.4_
  - [x] 11.2 Write and run the headless Chrome checks and panorama timing
    - Against the atlas build (for `/media`) and the game build: keyboard-only play from the Hall to a broken curse; a 390 px touch pass (drag, tap targets); a reduced-motion pass; the Slow 4G first-view timing with every scene file size (budget 3.0 s). A miss is a finding, not an image change. Save commands, sizes and times to `docs/phase-4-notes/browser.md`.
    - _Requirements: 8.8, 13.15, 13.16, 14.2, 14.3_
  - [x] 11.3 Run the mutation record
    - Apply each mutation in the design's mutation table by hand, one at a time, confirm a test fails, and revert it. Confirm the tree is clean of mutations afterwards. Save the table to `docs/phase-4-notes/mutations.md`.
    - _Requirements: 13.13_
  - [x] 11.4 Review test quality with `agent-tester`
    - Check that each new test fails when its rule is broken and that no test only restates the code. Fix weak tests. Save to `docs/phase-4-notes/tester.md`.
    - _Requirements: 13.13_
  - [x] 11.5 Check the boundaries
    - Check `git status` and `git diff --stat` show no change under `content/` or `assets/`, none to `vercel.json`, no committed or pushed work; scan for secrets and confirm `.env.example` holds names only; confirm the Phase 1 parser, generator and audit, Phase 2 auth, access rule and score formula, and the atlas (other than requirement 3) are unchanged.
    - _Requirements: 15.1, 15.2, 15.3, 15.6, 15.7, 15.8, 15.9_
  - [x] 11.6 Complete the Phase 4 entry in `docs/kiro-usage.md`
    - List the Kiro features used and each skill used with what it found.
    - _Requirements: 16.2_
  - [x] 11.7 Final check with `verify-and-stop`
    - Run `pnpm -r test --run`, typecheck, lint and the builds of both apps. Confirm the Phase 1 to 3 tests are still green and list counts. Do not add scope.
    - _Requirements: 13.1_
  - [x] 11.8 Write `docs/phase-4-handover.md`
    - Fold in `docs/phase-4-notes/`. Sections: files and folders created; versions pinned and why; Play state model; fear amounts and Balance_Reviewer findings per World; Layout_Data and how to adjust a Hotspot; Keeper's Note import and page; schema changes and grants; test results; smoke results; panorama sizes and throttled load; skills used and findings; the per-legend fairness counts; Content_Gaps G1 to G15; the replay-limit and tutorial-lock notes; the production `/media` plan for Phase 5; owner actions.
    - Include the polish item: the two caption kinds are generic and replace each event's own text for 11 of 12 legends (only `flying-dutchman` has per-event reduced-motion lines); per-event captions need new content.
    - _Requirements: 16.1_

- [x] 12. Final STOP
  - Report the handover path and the results. Wait for the owner. Do not commit, push or start Phase 5.

## Notes

- Every task references requirement clauses for traceability.
- The guard pass after each group is a task of its own (2.20, 3.7, 4.3, 5.5, 6.9, 7.9, 9.14).
- Stops: after tasks.md (done here); schema SQL differs (3.3); missing secret or key length (1.2); missing content that blocks a mechanic; a scripted player that cannot win (2.19); a failing checkpoint that cannot be fixed inside this spec; the mid-way stop (8); the final stop (12).
- All work after the mid-way stop is in later waves than everything before it, so a wave scheduler cannot start it early.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "3.1", "3.3", "5.1", "5.2", "6.1", "6.2"] },
    { "id": 2, "tasks": ["2.2", "2.4", "2.6", "2.18", "3.2", "3.5", "6.3", "6.4", "6.5", "6.6"] },
    { "id": 3, "tasks": ["2.3", "2.5", "2.8", "2.17", "3.6", "6.7", "6.8", "7.1", "7.2"] },
    { "id": 4, "tasks": ["2.7", "4.1", "6.9", "7.3"] },
    { "id": 5, "tasks": ["2.9", "2.10", "2.11", "2.12", "2.13", "2.14", "2.15", "2.16", "2.19", "3.4", "4.2"] },
    { "id": 6, "tasks": ["2.20", "3.7", "4.3", "5.3"] },
    { "id": 7, "tasks": ["5.4", "7.4"] },
    { "id": 8, "tasks": ["5.5", "7.5", "7.6", "7.7"] },
    { "id": 9, "tasks": ["7.8"] },
    { "id": 10, "tasks": ["7.9"] },
    { "id": 11, "tasks": ["8.1"] },
    { "id": 12, "tasks": ["8.2"] },
    { "id": 13, "tasks": ["8.3"] },
    { "id": 14, "tasks": ["8.4"] },
    { "id": 15, "tasks": ["9.1", "9.2", "9.3", "9.4", "9.5", "9.6", "9.7", "9.8", "9.9", "9.10", "9.11", "10.1"] },
    { "id": 16, "tasks": ["9.12", "9.13", "10.2", "10.3"] },
    { "id": 17, "tasks": ["9.14", "10.4"] },
    { "id": 18, "tasks": ["10.5", "11.1", "11.2"] },
    { "id": 19, "tasks": ["11.3"] },
    { "id": 20, "tasks": ["11.4"] },
    { "id": 21, "tasks": ["11.5", "11.6"] },
    { "id": 22, "tasks": ["11.7"] },
    { "id": 23, "tasks": ["11.8"] }
  ]
}
```
