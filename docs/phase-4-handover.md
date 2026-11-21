# Phase 4 handover: game play

Status: all Phase 4 work is uncommitted in the working tree. Nothing was committed or pushed. `vercel.json`, `assets/` and `.env` were not touched by Phase 4 tasks. Phase 5 was not started.

This file folds in `docs/phase-4-notes/*` and `docs/kiro-usage.md`. Where a number comes from an earlier task and was not re-run in task 11.8, it says so. Secret values appear nowhere in this file.

## 1. What was built, in one paragraph

A single-player point-and-click game over the twelve legends: the archive Hall (hub), a Tutorial_Room, and twelve World layouts with seeded puzzles, hints, fear, leads and dead ends, a fear meter and fear events, a spirit panel, endings, and relics. Play state lives on the server. The atlas gained one page, the Keeper's Note. Content reaches the game from Neon, not from code.

## 2. Files and folders created

Counts are from `git status` (untracked entries). Paths are relative to the repo root.

**Spec and agent tooling**
- `.kiro/specs/game-play/` (requirements, design, tasks, config).
- `.kiro/agents/game-balance-reviewer.md` (custom agent).
- `.kiro/hooks/physical-css-check.json` and `scripts/check-physical-css.mjs` with `scripts/check-physical-css.d.mts`.

**Skeleton (`skeleton/`)**
- `src/play/`: `engine.ts`, `view.ts`, `state.ts`, `types.ts`, `validate.ts`, `token.ts`, `service.ts`, `store.ts`, `tutorial.ts`, `hall.ts`, `relic.ts`, `fear.ts`, `fearTable.ts`, `errors.ts`.
- `src/keepers/`: `parse.ts`, `plan.ts`, `import.ts`, `read.ts`.
- `src/db/`: `playStore.ts`, `keepersRead.ts`, `tutorialRead.ts`. `src/theme/hub.ts`.
- `drizzle/0003_keepers_note_play_state.sql` and `drizzle/meta/0003_snapshot.json`.
- `scripts/`: `import-keepers-note.ts`, `reader-checks.ts`, `smoke-play.ts`.
- 22 new test files plus two helpers (`play-*.test.ts`, `token.property.test.ts`, `hall.test.ts`, `fear-budget.test.ts`, `keepers-*.test.ts`, `reader-privileges.test.ts`, `view.test.ts`, `story-marks.test.ts`, `balance-reviewer-agent.test.ts`, helpers `helpers/play.ts` and `helpers/playFromAtlas.ts`).

**Game app (`apps/game/`)**
- `src/layout/`: `types.ts`, `boxes.ts`, `hub.ts`, `tutorial.ts`, `fearEvents.ts`, `index.ts`, and `worlds/<legend-id>.ts` for all twelve legends.
- `src/lib/`: `playClient.ts`, `play.ts`, `hall.ts`, `world.ts`, `tutorial.ts`, `pan.ts`, `media.ts`, `theme.ts`, `motion.ts`, `fearPlayer.ts`, `viewerInput.ts`, `focus.ts`.
- `src/components/`: `Hall`, `TutorialRoom`, `WorldPlay`, `SceneViewer`, `SceneNav`, `Hotspot`, `FearOverlay`, `FearMeter`, `SpiritPanel`, `MotionToggle`, `ThemeRoot`, `Marked`, `StartRetry` (`.tsx`) and `fear.css`, `scene.css`, `tutorial.css`, `world.css`.
- `src/routes/tutorial.tsx`; `src/fonts.ts`; `src/styles/` (`theme.css`).
- `scripts/browser-check.mjs`, `static-file.mjs`, `static-file.d.mts`.
- 16 new test files in `test/` (hall, tutorial, world, layout, viewer, fear-ui, pan-media, theme, fonts, marked, playClient, server, serve-build, client-boundary, hub-tutorial-roles, physical-css-hook).

**Atlas app (`apps/atlas/`)**
- New: `src/components/KeepersNotePage.tsx`, `test/keepers-note.test.tsx`.
- Edited (requirement 3 only): `src/i18n/en.ts` (one key), `src/routes/__root.tsx` (footer link), `src/routes/legends.$legendId.tsx`, `src/server/functions.ts`.

**Edited existing files (not new)**: `apps/game/src/{routes/index.tsx, routes/world.$target.tsx, routes/__root.tsx, server/{db,env,functions}.ts, i18n/en.ts, styles.css, routeTree.gen.ts}`, `apps/game/scripts/{serve-build,smoke}.mjs`, `apps/game/vitest.config.ts`, `skeleton/src/{client,index}.ts`, `skeleton/src/atlas/story.ts` (two pure exports), `skeleton/src/db/{schema,runStore}.ts`, `skeleton/vitest.config.ts`, `.env.example` (adds an empty `GAME_TOKEN_KEY=`), `docs/tech-decisions.md`, `docs/kiro-usage.md`.

**Docs**: `docs/phase-4-notes/` (scratch notes, one file per task, plus `screens/` and `browser-results.json`) and this file.

## 3. Versions pinned and why

- **New dependencies: only the fontsource packages in `apps/game`.** 22 `@fontsource/*` packages at exact versions (20 at 5.3.0, `noto-serif-jp` 5.3.1, `source-serif-4` 5.3.1), the same versions as the atlas. They were added so the game can load each World's theme-pack fonts under the same OFL packages as the atlas; installed offline from the pnpm store. `pnpm-lock.yaml` grew by 66 lines. No other `package.json` dependency changed. `skeleton/package.json` gained one script (`db:import-keepers-note`).
- **Node and pnpm.** `engines.node` is `>=22` (unchanged); `packageManager` is `pnpm@9.15.9` (unchanged). Local runs used Node 24.13.1 and pnpm 9.15.9 (checked in this task). The browser checker uses Node's built-in `WebSocket`, so it needs a Node that has it (24 here); it was not tried on 22.
- **drizzle-kit 0.31.11, drizzle-orm 0.45.4** (unchanged). The installed kit writes flat migration files, which is why 0003 sits next to the older ones.
- **AES-256-GCM** uses Node `crypto` with `authTagLength: 16` on the decipher (found in the docs read).
- **No YAML, DOM or browser-driver package was added.** The agent file uses JSON-style values on one line each; the game tests use `react-dom/server` instead of jsdom; the browser checker speaks the DevTools protocol itself.
- **Lint:** no package defines a `lint` script, so lint was not run.

## 4. Play state model

- **Where state lives.** The server holds all play state. For signed-in players it is `runs.play_state` (JSON, parsed with a strict zod schema on every read) and `runs.rev` (integer). Saves and ends use `WHERE id AND user_id AND status = 'in_progress' AND rev = <expected>`. A failed save reloads and re-applies once; a second miss answers 409 `conflict`. Ending a run bumps `rev` and sets `finished_at`.
- **Unusable state.** An empty or schema-invalid `play_state` on an in-progress row is closed as abandoned so it cannot block the unique in-progress index.
- **Guests.** There is no database row. The server returns an encrypted token (AES-256-GCM, random 12-byte IV, 16-byte tag, associated data binds the token kind and the legend id, expiry checked). The browser stores it and sends it back. Play tokens last 6 hours (`PLAY_TOKEN_TTL_SECONDS` 21,600); receipt tokens 365 days (31,536,000). Every failure maps to one fixed `session` error. The key is `GAME_TOKEN_KEY` (32 bytes), server only.
- **Tutorial.** `startTutorial` and `actInTutorial` take a visitor. A solved tutorial writes `player_flags.tutorial_done_at` for a signed-in user (`ON CONFLICT DO NOTHING`) and returns a signed receipt for a guest. The browser stores the receipt and redeems it once after sign-in. A guest's tutorial state is a token under the browser key `kiroween.guest.tutorial.play.v1`.
- **What the browser receives.** A view: the slots the player has opened (question and four options in generator order, tried options), solved slots, hints already used (Hint 2 anchor only after Hint 2 was used), the leads the player has started (same fields for true and dead-end leads, listed in content order), fear, and a reply to the last action. The Seed, the curse text and the ended summary come only when a run is won or restarted. Tutorial and World info carry scene names, alt text, hotspot ids and names, theme variables, per-event reduced-motion lines, relic name and image id.
- **What it never receives.** `correctIndex`, hotspot roles, swaps, the true version, the true lead, the Seed of an unfinished run, unearned Hint 2 anchors, the answer to a tutorial drawer question, `world.spirit` prose, or the key. The browser may not send a user id, score, counts, status or seed; every action schema is `.strict()`. Property 3 (secrecy) and the built-output tests in `server.test.ts` check this. Note: the built-output tests are skipped when `dist/` does not exist.
- **Single-flight client queue.** `createPlayClient` runs one start or act call at a time and reads the token from storage only when a call starts, so a call uses the token the previous reply stored. A failed call does not block the queue. One shared client per mode (guest, signed in) spans routes. On a remaining 409 the client reloads the stored run and applies the action once more; a second conflict is shown as the generic error. Controls use `aria-disabled` while busy; hotspot taps queue and are never dropped.
- **Server functions.** Each is behind `authMiddleware` or `requireUser`, goes through `safely()`, and maps unknown errors to the fixed `unavailable` (503). A guest asking for a non-guest world is redirected to `/sign-in`. The Phase 2 stub run functions were removed.

## 5. Fear amounts, worst-case budget and balance findings

**Amounts** (`skeleton/src/play/fear.ts`, pinned by `skeleton/test/fear-budget.test.ts`): wrong answer 15, Hint 2 6 (once per slot), dead end 6 (once per lead), tutorial Hint 2 10, max 100. `HOTSPOT_FEAR` (`fearTable.ts`, step 3, once per hotspot): baba-yaga `h-05` +3, banshee `hs-comb` +3, banshee `hs-cat` -3, flying-dutchman `h-04` +3.

**Worst-case budget (test assumption):** 5 slots x 6 + 4 dead ends x 6 + 3 positive ticks x 3 + 2 wrong answers x 15 = 30 + 24 + 9 + 30 = **93, which is below 100**. A correct answer never lowers fear.

**Balance review** (`docs/phase-4-notes/balance.md`, task 10.4). Run in the main thread by adopting the `game-balance-reviewer` prompt (the sub-agent tool could not launch the agent file by name). Evidence: 300 generated seeds and 20 played seeds per legend, plus `fairness.md`. 300 of 300 seeds generated for every legend; every contradiction anchor resolves. Worst case here uses the most dead ends any generated run offered.

| World | Win rate (full reader / design-rule reader) | Ambiguous slots | Worst-case fear | Wrong answers affordable | Worst severity | Main finding |
|---|---|---|---|---|---|---|
| baba-yaga | 100% / 63% | 14% | 81 | 3 | minor | `p-5` true-or-told paid in 25 of 40 seeds; peak fear 96 |
| banshee | 98% / 43% | 0% | 81 | 3 | major | `pz-2` ritual-order paid in 32 of 40; one lost seed (`fair-4`) |
| chupacabra | 80% / 75% | 5% | 84 | 3 | major | `p-5` paid in 37, `p-4` who-said-it in 25; 8 restarts; lead-5 never true |
| draugr | 98% / 85% | 26% | 78 | 3 | minor | ambiguity at the flag line; two contradictions repeat an anchor |
| el-coco | 78% / 50% | 50% | 78 | 3 | major | half of all slots have more than one option text in the chapter; 9 restarts |
| flying-dutchman | 100% / 90% | 0% | 87 | 2 | minor | highest worst case (4 dead ends every run); budget test needs re-approval if a slot, lead or tick is added |
| gumiho | 95% / 93% | 22% | 84 | 3 | minor | 8 of 14 hotspots are decoys; lead-5 never true |
| jersey-devil | 100% / 78% | 28% | 78 | 3 | minor | 4 wrong answers paid in 40 seeds; fear barely matters |
| naddaha | 98% / 40% | 33% | 78 | 3 | major | ambiguity 33%; widest reader gap after banshee |
| spring-heeled-jack | 90% / 80% | 28% | 84 | 3 | major | every slot costs something; lead-4 never true |
| vetala | 90% / 90% | 22% | 78 | 3 | major | `p-5` paid in 40 of 40 seeds; highest average peak (84) |
| yuki-onna | 100% / 100% | 4% | 78 | 3 | minor | peak 93, 7 points under the restart line |

Cross-World findings (X-ids in `balance.md`):
- **X-1 (major):** `true-or-told` slots act as paid guesses. They are exempt from the answer-in-chapter rule (`TEXT_EXEMPT`) and appear in every lost run.
- X-2: hotspot fear is rare (4 entries in 3 Worlds).
- X-3: some contradictions list one anchor twice (draugr, el-coco, flying-dutchman, gumiho, naddaha, spring-heeled-jack).
- X-4: no dead end points at a `--versions` anchor.
- X-5: most contradiction facts describe the lead's own version (a proxy, not proof of ambiguity).
- X-6: three never-true leads are always offered (chupacabra lead-5, gumiho lead-5, spring-heeled-jack lead-4).
- Not checked: whether Spirit and fear-event text matches what the code does (for example banshee text says the meter falls on a correct answer; the code never does that), and balance of the tutorial and hub.
- Suggested fixes are content advice. No constant, content file or test was changed for balance.

## 6. Layout data and how to adjust a hotspot

- **Files.** One per World: `apps/game/src/layout/worlds/<legend-id>.ts` (for example `gumiho.ts`). The registry in `layout/index.ts` fails if a file's `legendId` differs from its file name, or two files share an id. The Hall is `layout/hub.ts` (18 regions), the Tutorial_Room `layout/tutorial.ts` (7 regions). Fear events are in `layout/fearEvents.ts` (five per World, ids `fe-1` to `fe-5`).
- **Coordinates.** Panorama pixels of the 4096 x 1536 scene images (`SCENE_WIDTH`, `SCENE_HEIGHT` in `layout/types.ts`). x is physical on purpose (the painted scene does not mirror in RTL).
- **Entry shape.** Eleven Worlds use `const h = squareSpriteBox('<legend-id>')` and write `h('h-04', x, y, w, h)`. The tap box is x, y, w, h; the sprite is the largest square centred in it, so changing a box also moves its art. Banshee has its own helper (ids `hs-*`, one cropped sheet shared by two hotspots).
- **Rules enforced by `apps/game/test/layout.test.ts`:** box inside the scene; at least `MIN_BOX` (176) wide and tall; no overlaps; hotspots in ascending x within a scene; hotspot ids equal the content ids; sprite id equals the content asset; sprite stays inside its tap box; each scene matches exactly one scene image by id, then name, then order; every asset id maps to a file under `assets/`.
- **To move a hotspot:** (1) run the game in dev, `pnpm --filter @kiroween/game dev` (the atlas dev server must also run for images), open `/game/world/<legend-id>?layout=1`; the overlay outlines every tap box. It is compiled out of production builds (checked: no `scene-outline` in the built JS). (2) Edit the numbers in the World file. Keep ascending x order. (3) Run `pnpm --filter @kiroween/game test` (the layout test names the failing rule). I did not run the overlay in a browser; it was exercised by tests only.

**Placements that were guesses** (no clearly painted object; from `layout-open-matches.md`). Owner to check each with `?layout=1`:

| World | Hotspots placed by best guess |
|---|---|
| baba-yaga | `h-03` broom, `h-10` hands panel, `h-12` horns on hook, `h-14` cracked print, `h-16` skull on staff |
| banshee | none recorded as guesses; sprite boxes equal tap boxes, may need a visual tune |
| chupacabra | `h-06` faded drawing on post |
| draugr | `h-14` spear (not painted), `h-02` horse rail (taken as the right fence), `h-06` lantern placement |
| el-coco | `h-04` hooded shadow |
| flying-dutchman | `h-03` letters, `h-05` spyglass, `h-06` coil, `h-08` miniature, `h-09` chart (`h-11` and `h-14` noted as clear) |
| gumiho | none (every hotspot has a painted object; `h-10` bead is small) |
| jersey-devil | `h-01` cradle, `h-02` bible page, `h-03` tracks, `h-08` crest stamp, `h-09` broadside, `h-13` trolley schedule, `h-14` poster |
| naddaha | `h-15` film bill, `h-17` pale shape, `h-11` shaduf |
| spring-heeled-jack | `h-08` letter, `h-09` letter stack, `h-10` lantern, `h-11` clock (all small, minimum boxes) |
| vetala | `h-11` distant fires, `h-15` footprints, `h-07` tree and bundle (large box) |
| yuki-onna | `h-14` faded print, `h-15` brazier, `h-09` smoke-hole (large), `h-03` willow (large) |

Not verified: that a painted object lies under every hotspot. There is no automatic check; the browser run judged visibility by screenshot for Banshee only.

## 7. Door id to legend id mapping fix

Content door ids are `hub-door-<legend-id>` except door 1, `hub-door-dutchman`, whose legend is `flying-dutchman`. The first Hall build sliced the prefix and so broke that door. `DOOR_LEGEND` in `apps/game/src/lib/hall.ts` is now an explicit table typed on `HUB_DOOR_IDS`; `doorLegendId` and `cabinetSlots` use it. `test/hall.test.ts` loads the real legend list and checks all 12 map to distinct real ids. Mutation check: changing the Dutchman entry failed two tests (`mutations.md`, 8.1).

## 8. Keeper's Note import and atlas page

- **Source:** `content/keepers-note.md` (read only). Parsed by `skeleton/src/keepers/parse.ts`; rows planned by `plan.ts`; written by `import.ts` in one transaction with a row lock. It skips when `content_hash` and the detail row count match. Errors name the table and SQLSTATE only.
- **Command:** `pnpm --filter @kiroween/skeleton db:import-keepers-note`. Run on `dev-skeleton-core` on 2026-11-20: run 1 `imported` (`keepers_note` 1 row, `keepers_note_details` 3 rows), run 2 `unchanged`.
- **Tables:** `keepers_note` (public text and anchor), `keepers_note_details` (the three drawer answers, server only), `player_flags`.
- **Atlas page:** `/legends/keepers-note`, handled before the legend lookup in `apps/atlas/src/server/functions.ts`. It uses the base palette, no pack theme. A footer link was added (`footer.keepersNote`). The anchor `keepers-note--ch-1` resolves through a fallback to `keepers_note.anchor`. The reads (`keepersRead.ts`) name explicit columns and never touch `keepers_note_details`.
- **Tests:** `skeleton/test/keepers-note.test.ts` (parse, exactly-once anchor, accepted forms), `keepers-read.test.ts` (SQL), `apps/atlas/test/keepers-note.test.tsx`. The SQL test lives in the skeleton because the atlas has no `drizzle-orm` dependency.
- Known gap G14: the note says eleven keys and fourteen rooms while the hall has twelve doors. Each phrase is a drawer answer, so it was left alone.

## 9. Schema changes and grants

- **Migration `skeleton/drizzle/0003_keepers_note_play_state.sql`** (journal and snapshot 0003 written). Creates `keepers_note`, `keepers_note_details`, `player_flags`; adds `runs.play_state` (default `'{}'`) and `runs.rev`. Differs from the approved SQL in form only (named constraints, statement breakpoints).
- **The single GRANT:** `GRANT SELECT ON "keepers_note" TO atlas_reader;` appended to the migration file (owner approved), and the same line added to the reader-role list in `docs/tech-decisions.md`. No grant on `keepers_note_details`, `player_flags` or `runs`.
- **Applied** to `dev-skeleton-core` only, 2026-11-20, `pnpm --filter @kiroween/skeleton db:migrate`. Not applied anywhere else. Verified with a throwaway script (deleted): the owner role can read and write the new tables; `atlas_reader` has SELECT on `keepers_note` only; the `atlas_web` connection is refused (42501) on the other three tables and on DELETE from `keepers_note`. `db:check-reader`: 36 of 36 at 3.6; "all reader-role checks passed" at 11.7.
- Noted, not changed: `keepers_note_details.ordinal` has no unique constraint (the migration was already applied; the importer replaces all rows in one transaction).
- **Imports run in Phase 4, both on `dev-skeleton-core`:**
  1. Keeper's Note import (above), 2026-11-20, run by the task.
  2. **Legend `db:import` for the owner's content rewrite of the twelve legends, owner-approved and run by the orchestrator, not by any spec task.** **Date: not recorded in any Phase 4 note.** Evidence only: `content/legends/*.md` were last modified 2026-11-20 (for example `banshee.md` at 14:40), so the import ran on or after that. The orchestrator should fill in the date and time here. At task 11.7, `db:check-models` reported stored models equal to parsed models (all "yes" in the tail that was read); I could not confirm it covered all twelve.
- Not done: no production or default-branch database was touched.

## 10. Phase 1 generator change for requirement 5.7 (owner-approved)

Property 7 found that Hint 2 used the slot's authored `hint2Anchor`, not the anchor of the fact the Run chose. A slot has several candidate facts, so in about 60% of slot-instances (5,663 of 9,200 over 200 seeds x 12 legends) the linked chapter did not contain the answer. Fix: Hint 2 opens the chosen fact's anchor; a bare `--versions` anchor is still refined to the true version.

| File | Change |
|---|---|
| `skeleton/src/generator/generate.ts` (`buildSlot`) | passes `fact.anchor` to `makeHints` (1 line) |
| `skeleton/src/generator/hints.ts` | `makeHints` takes `factAnchor` and uses it |
| `skeleton/test/helpers/properties.ts` | the hint-2 property now requires the chosen fact's anchor, replacing "equals the authored anchor" |
| `skeleton/test/generator.test.ts` | the `hint-anchor` error test calls `hint2Anchor` directly; the "bare versions anchor is refined" test sets the candidate facts' anchors to `fx--versions` |

After the fix the probe shows zero misses. Consequence: authored per-slot `hint2Anchor` values in the content files are unused for slots (the final puzzle's is unchanged). `content/` was not edited. Phase 1 parser, audit and RNG are unchanged.

## 11. Test results

Run in task 11.7 (`verify.md`) and repeated in `tester-review.md`. Not re-run in task 11.8.

| Suite | Files | Result |
|---|---|---|
| skeleton | 48 | 701 passed, 8 expected fail (709). About 154 to 244 s. |
| atlas | 10 | 161 passed (154 from Phase 3, 7 new) |
| game | 20 | 256 passed |
| `pnpm -r typecheck` | all three | clean |
| both builds (`@kiroween/game`, `@kiroween/atlas`) | | pass |
| `db:check-reader`, `db:check-models` (dev database) | | pass |
| `scan-secrets` test | | 6 of 6 |
| lint | | not available (no script) |

- **The 8 expected failures** are `it.fails` entries in `play-atlas-player.property.test.ts`: banshee, chupacabra, draugr, el-coco, gumiho, naddaha, spring-heeled-jack, vetala. A test asserts the exact set, so a newly failing or newly fixed legend is noticed. The Phase 1 to 3 tests are green and the atlas count is unchanged.
- **Known content findings are listed explicitly in section 15** (per-legend counts) and in `fairness.md`. They are not hidden by loosening any constant, budget or player.
- `pnpm -r test --run` is refused by pnpm ("Unknown option: 'run'"). Use `pnpm -r test` or `pnpm -r exec vitest --run`.
- Reliability: heavy property files slowed each other under CPU load and hit fixed timeouts. `skeleton/vitest.config.ts` now sets `testTimeout` 900 s, `hookTimeout` 120 s, `maxWorkers` 4; the game config sets 120 s. No iteration count, property, seed or constant changed (`test-reliability.md`).
- **Mutation record** (`mutations.md`, task 11.3): 37 numbered hand mutations, each restored and compared byte for byte. Five were not caught at first (#15, #16, #17 constants, #19 missing `.strict()`, #24 early tutorial hint); tests were added and all five are now caught. #11 is equivalent (the legend id is checked twice); removing both checks (#11b) is caught.
- **Test quality review** (`tester-review.md`, task 11.4): seven weak tests fixed, including empty-set loops and a new offline test (a guest plays to a win with `fetch` and sockets replaced by throwing spies and `DATABASE_URL` removed).
- Limit: the game vitest config has no DOM. Real focus, pointer-capture and click-suppression behaviour is covered only by the headless Chrome run (section 13).

## 12. Smoke-check results

`skeleton/scripts/smoke-play.ts`, task 11.1, through the real server functions of the game dev server (port 3000) against `dev-skeleton-core`. **26 of 26 steps passed.** It covers: a guest finishing the tutorial and getting a receipt; a guest winning banshee with no seed in any response; a signed-in test user redeeming the receipt (forged and guest redemptions refused, double redeem harmless); the user winning baba-yaga with the stored score equal to `score()` (475 on that run); refused client-sent score, counts, status, user id and seed; a draugr run filling the meter and restarting with a new seed; list of runs. The test user was deleted by exact id (0 rows left). The first full run failed two steps, both script bugs, fixed.

Limits: dev server, not the production build; not re-run in 11.7; only banshee, baba-yaga and draugr were played end to end.

## 13. Browser results, panorama sizes and throttled load

`apps/game/scripts/browser-check.mjs` (Chrome 157 headless over the DevTools protocol, production builds on ports 3200, 3201 and 3202). Raw numbers: `browser-results.json`; screenshots: `docs/phase-4-notes/screens/`. **43 of 46 checks pass.** Not re-run in 11.7. Guests only; no database user was created.

- **Passing:** keyboard-only play of the Hall, tutorial and the whole Banshee world (0 mouse events); 390 px touch (no horizontal scroll, every hotspot at least 44 x 44 px, drag pans, a drag from a hotspot does not open it); reduced motion (flash opacity 0 across 33 samples, only the fade runs); right-to-left with the Arabic flag (`dir=rtl`, no overflow, drag works). The Arabic catalog is empty, so English shows.
- **Bugs found and fixed with tests:** touch drag stopped after about 23 px (`lostpointercapture` from a child); spirit panel unreadable at 390 px (a media query that never matched, light ink on the light frame); the spirit figure hid "Pan right".
- **Panorama file sizes** (`ls -l`): hall 317,352 B; tutorial 308,466 B; Banshee scene 1 430,910 B, scene 2 441,756 B, scene 3 327,016 B. All 38 game scene files range from 247,460 B (flying-dutchman 01) to 482,648 B (jersey-devil 01). No image under `assets/` was changed. Banshee scenes 2 and 3 were not requested on first load (requirement 8.9 holds).

**Slow 4G profile** (1.6 Mbps down, 750 kbps up, 150 ms RTT, 4x CPU throttle, cache off, 390 px, 3 runs each; budget 3.0 s to scene paint):

| Screen | Scene paint, 3 runs (ms) | Median | Total transfer | Images | JS and CSS raw / gzipped | With sprites, spirit and meter blocked |
|---|---|---|---|---|---|---|
| Hall | 5823, 5871, 5845 | 5845 | 933,261 B (20 requests) | 317,558 | 495,749 / 158,054 | 5891 |
| Tutorial | 5240, 4883, 4861 | 4883 | 957,650 B (25) | 344,164 | 502,606 / 160,765 | 4925 |
| Banshee scene 1 | 11597, 10407, 10436 | 10436 | 1,906,353 B (34) | 1,209,927 | 518,929 / 165,958 | 6838 |

**These are the three failures against the 3.0 s budget.** First contentful paint is 0.7 to 1.7 s. Causes, as measured or estimated in `browser.md`:
1. The scene file alone is about 1.5 s of transfer. About 500 KB of JS and CSS loads first, and the local build server sends it uncompressed. Gzipped it is about 160 KB, which would save roughly 340 KB (about 1.6 s). That saving is an estimate, not a measurement.
2. On Banshee, sprites (about 575 KB), the spirit figure (168 KB) and the meter frame (35 KB) are `loading="lazy"` but already inside the viewport, so they download in parallel with the scene and push it from 6.8 s to 10.4 s. Requirement 14.1 says the first view should not wait for them.
3. Images came from the atlas origin on localhost over HTTP/1.1 (cross-origin). On one domain with HTTP/2 the scene's high priority should help more; not measured. The local atlas media response has no cache headers.

**Two proposed fixes, for the owner to decide:**
1. **Defer non-scene images until the scene image has loaded.** Start sprites, the spirit figure and the meter frame after the scene image's `load` event. This should bring Banshee near the 6.8 s "blocked" figure, which still misses 3.0 s on this profile. It changes the server-rendered markup and the viewer tests (`viewer.test.ts`, `fear-ui.test.ts`).
2. **Enable gzip or brotli in Phase 5 production.** Vercel normally compresses text assets; the local `serve-build.mjs` does not. This targets the roughly 340 KB of JS and CSS (about 1.6 s on this profile). Verify on a real preview deployment; the saving is an estimate.

Both together are expected to help most, but no combination was measured, so I cannot say whether the 3.0 s budget would be met.

Other browser findings: the Hall pan buttons stay physical left and right in right-to-left (by design); "hotspot visibility" is a visual judgement from screenshots, not an automatic check.

## 14. Skills used and findings

From `docs/kiro-usage.md` (Phase 4 skills). All used in the main thread; none started sub-agents of its own.

| Skill | What it found |
|---|---|
| read-the-damn-docs | `tanstack.com`, `developer.mozilla.org` and `neon.com` did not resolve: TanStack Start (3 pages), MDN (4) and Neon (2) were read only as search summaries plus installed types, so they are not confirmed against current pages. Kiro docs, Node `crypto` and Drizzle migration pages were read in full. Finds: `authTagLength: 16` on the GCM decipher; drizzle-kit 0.31.11 writes flat migration files; the current Kiro agent format is Markdown with `permissions.rules`; no physical-CSS hook existed. |
| agent-security (with agent-guard, `guard-2.20.md`, `guard-5.5.md`) | `decode` threw a bare `0` in five places (now one `reject()`); a validator that threw `notFound()` ran outside `safely()` (medium, fixed); `getShell` ran outside `safely()` (low, fixed); `serve-build.mjs` crashed on a handler rejection (low, fixed). No answer leak found. |
| impeccable (`impeccable-review.md`) | The brief said `agent-impeccable`; the catalog has no such name, so `impeccable` was used. Its launcher and screenshot tools were not run. Fixed 5 small game CSS or markup items (motion toggle size, short Hall links, tab focus clipping, busy strike-through, `dvh`). Polish items are in section 17. |
| agent-tester (`mutations.md`, `tester-review.md`) | 37 mutations, 5 initially uncaught, now caught; 7 weak tests fixed; a requirement-to-test map. |
| agent-guard (`guard-2.20` to `guard-9.14`) | Duplicated `guard` wrapper in `playStore.ts`; `getKeepersNote` filtered only on `limit(1)`; an atlas test imported a deep skeleton path; unused `world.spirit` prose sent to the browser; hardcoded separators in Hall names; focus not restored on panel close; 11 copies of the sprite box helper; the layout check did not verify the sprite stays inside its tap box; a start failure showed "loading" forever (new `StartRetry`). |
| verify-and-stop | Final check, section 11. |
| Not available or not used | `agent-impeccable` (not in the catalog). ponytail (no pass recorded in the Phase 4 notes). agent-pilot, agent-orchestrator, agent-implementer, agent-superpowers and any skill that starts its own sub-agents. |

Other Kiro features used: the spec workflow (`.kiro/specs/game-play/`), steering (all five files), the custom agent `game-balance-reviewer` and the `physical-css-check` hook (both created in Phase 4; the agent could not be launched by name through the sub-agent tool, so its prompt was run in the main thread), property-based testing with fast-check, headless Chrome over the DevTools protocol. The Neon MCP was not used in Phase 4 (the migration and import checks used throwaway scripts). Not verified: whether `PostFileSave` hooks fire on hand saves in the IDE (noted since Phase 1).

## 15. Fairness counts per legend and known content findings

From `fairness.md` (task 2.19, regenerated after the owner's content rewrite). A scripted player that reads only the views and the atlas text at the anchors it was given, 40 fixed seeds per legend, real fear constants.

| Legend | Won of 40 | Restarts | Wrong answers paid | Peak fear | Slots where it paid (seeds out of 40) |
|---|---|---|---|---|---|
| baba-yaga | 40 | 0 | 58 | 96 | p-5 true-or-told (25) |
| banshee | 39 | 1 | 70 | 100 | pz-2 ritual-order (32), pz-3 true-or-told (4) |
| chupacabra | 32 | 8 | 124 | 100 | p-5 (37), p-4 who-said-it (25), p-1 date-or-number (1) |
| draugr | 39 | 1 | 39 | 100 | p-1 original-name (10), p-5 (13), p-3 (2) |
| el-coco | 31 | 9 | 108 | 100 | p-2 object-match (13), p-4 (25), p-5 (30), p-1 (3) |
| flying-dutchman | 40 | 0 | 13 | 72 | pz-5 weakness (13) |
| gumiho | 38 | 2 | 72 | 100 | p-5 (34), p-1 (14), p-3 (10) |
| jersey-devil | 40 | 0 | 4 | 57 | p-5 object-match (2), p-2 (2) |
| naddaha | 39 | 1 | 52 | 100 | p-5 (30), p-3 (6) |
| spring-heeled-jack | 36 | 4 | 109 | 100 | p-5 (38), p-3 (6), p-4 (2), p-1 (8), p-2 (3) |
| vetala | 36 | 4 | 121 | 100 | p-5 (40), p-3 (11), p-1 (12), p-2 (2) |
| yuki-onna | 40 | 0 | 111 | 93 | p-5 (39) |

- **Eight known content findings** (not won on every seed): banshee, chupacabra, draugr, el-coco, gumiho, naddaha, spring-heeled-jack, vetala. Banshee joined the set after the owner's content rewrite (seed `fair-4`). baba-yaga, flying-dutchman, jersey-devil and yuki-onna win every seed (Property 14 runs over these four with a pinned fast-check seed, 100 runs).
- Cause: `true-or-told` slots (answer not required in the text) and paraphrased `date-or-number`, `object-match`, `original-name` and `who-said-it` slots. The reader has a word-overlap layer below the design's two rules (decision in `decisions.md`, task 2.19); the design-rule-only win rate is in section 5.
- A guessing player reaches a full meter on a bad run and restarts with a new seed (`play-guessing-anchors`); a lucky guesser can win, so that test accepts any of three seeds.

## 16. Content gaps G1 to G15 and content-related findings

From `requirements.md`, with how Phase 4 handled each. G-ids refer to the requirements table.

| Id | Gap | Handling |
|---|---|---|
| G1 | Final slot flagged in 1 of 12 legends (banshee) | Owner decision 1; final slot is last only where the generator marks it |
| G2 | The final puzzle is prose, not data | Played as an ordinary question; no object-ordering mechanic |
| G3 | "Breaking the curse" prose names every version | Shown only in the ending panel after a win |
| G4 | Per-event reduced-motion lines exist for 1 legend (`flying-dutchman`) | Catalog caption elsewhere; see the polish item below |
| G5 | Fear-event triggers are prose | Layout code assigns trigger kinds (decoy tap, scene enter, wrong answer, Hint 2); assignments are in `decisions.md` 6.3 for owner review |
| G6 | Tap text mentions fear effects without amounts | `HOTSPOT_FEAR` table (4 entries) and `HOTSPOT_FEAR_NONE` (7); a test fails if tap text mentions fear and is in neither |
| G7 | No text for a swapped hotspot | Neutral `tap.something` or `tap.nothing` |
| G8 | Hall and tutorial tap results thin | New catalog sentences, flagged for owner review (section 18) |
| G9 | No tutorial relic image | First cabinet slot glows; hall key image shown |
| G10 | Relic names not structured | Display name from the usage text; `jersey-devil` uses `world.relic.fallback`; flying-dutchman uses its usage text whole. A review list of all 12 names prints from `layout.test.ts` |
| G11 | Door frames do not exist | Doors are tap regions with a drawn lock overlay |
| G12 | No audio assets | No sound; captions replace sound cues |
| G13 | Spirit lines are prose | Generic catalog lines (`spirit.*`) |
| G14 | Keeper's Note numbers differ from the hall | Recorded only |
| G15 | "Time to dawn" has no real timer | Curses remaining shown as hours |

Further content findings from Phase 4:
- **`true-or-told` slots give paid guesses** (X-1, section 5). Content owner either writes the "told" and "documented by" wording into the chapter at the slot's anchor, or accepts the slot as a guess and keeps it out of the final position.
- **The authored per-slot `hint2Anchor` is superseded** by the chosen fact's anchor (section 10). Those values are now redundant.
- **Per-event reduced-motion lines are missing for 11 legends.** Only `flying-dutchman` has them.
- **Relic names:** `jersey-devil` has only "Relic" in the usage text (the catalog fallback is used); other usage texts vary in form ("relic: pocket doll", "Lamp of Vigil", "The Harbour Lantern").
- 12 `content/legends/*.md` files show as modified in `git status`. They match the owner's rewrite (`boundaries.md` c): only fact statements, tap texts, lead step and dead-end lines, nine `true-or-told` slot labels and the Flying Dutchman tag note changed; ids, anchors, answers, wrong answers and slot candidate lists are unchanged. No Phase 4 task edited them.
- Pre-existing audit gaps are in `docs/content-gaps.md` (Phase 1).

**Polish item: generic fear-event captions.** The two caption kinds (`fear.caption.sound` "You hear something far away." and `fear.caption.sight` "Something moves at the edge of sight.") are generic and replace each event's own text for 11 of 12 legends under reduced motion; only `flying-dutchman` has per-event reduced-motion lines. Per-event captions need new content. The caption kind per event (sound or sight) was a judgement call in `decisions.md` 6.3 (for example banshee 1 and spring-heeled-jack 1 are `sound`; chupacabra 3, spring-heeled-jack 3 and draugr 3 are `sight`). A test fails if any other legend gains a per-event line without the data being reviewed.

## 17. Polish items from the impeccable review (`impeccable-review.md`)

Fixed during Phase 4: motion toggle size and focus ring; Hall link width; scene-tab focus clipping; busy strike-through; `dvh` viewport; start-failure retry (`StartRetry`, 9.14); spirit panel contrast and the hidden "Pan right" (11.2).

Still open:
- **spring-heeled-jack: glow on surface is 2.8:1.** `resolveTheme` checks glow only against the background (large text). Panel headings need 4.5:1 on the surface. The fix belongs in the skeleton (`resolveTheme` also checks glow on surface, or panel headings use ink). Not changed because it is outside the game app.
- Pan buttons use `‹` `›` glyphs; a drawn icon would match the craft rule. Low priority.
- CSS order: `.spirit-panel-body` (ink) and `.spirit-caption` (cold) set the same property at equal specificity; the winner depends on bundle order.
- The Hall ending dialog is `aria-modal` with no focus trap, and Escape does not close it.
- The Hall reward slot text reads "An empty slot." inside the slot that glows; consider a copy change.
- Fear meter fill contrast is 2.5 to 2.7:1 on pack surfaces (the 3:1 pairing is against the background only).
- Spirit panel text over the painted frame: the 11.2 run fixed legibility at 390 px; contrast against the frame image itself is still a visual judgement.
- Not checked in a browser: fear flash with a flash analyser (the animation was parsed for flashes per second and sampled for reduced motion), real font rendering at 390 px.

## 18. New UI sentences needing owner wording review

All sentences below are in `apps/game/src/i18n/en.ts`, found by a read-only `git diff` against HEAD. Arabic (`ar.ts`) is empty by design (decision 26); missing keys fall back to English. One key was removed: `world.comingLater`. The atlas gained one key: `footer.keepersNote`. Keys were reviewed in the diff as they stand now.

- **Hall:** `hub.lamp`, `hub.jars`, `hub.window` (G8 decoy lines), `hub.clock`, `hub.clock.one`, `hub.clock.dawn`, `hub.ledger.title`, `hub.ledger.current`, `hub.ledger.fear`, `hub.ledger.curses`, `hub.ledger.seed`, `hub.ledger.none`, `hub.ledger.run`, `hub.cabinet.empty`, `hub.cabinet.title`, `hub.door.locked`, `hub.door.signin`, `hub.door.enter`, `hub.door.read`, `hub.door.readNamed`, `hub.door.stateNamed`, `hub.ending`, `hub.ending.close`, `hub.scene.alt`, `hub.label.ledger`, `hub.label.lamp`, `hub.label.clock`, `hub.label.cabinet`, `hub.label.jars`, `hub.label.window`, `hub.panel.close`, `hub.legends`.
- **Tutorial:** `tut.pan`, `tut.corkboard`, `tut.candle`, `tut.typewriter`, `tut.coat`, `tut.bookshelf`, `tut.mirror`, `tut.drawer.prompt`, `tut.drawer.wrong`, `tut.drawer.open`, `tut.drawer.label`, `tut.drawer.submit`, `tut.reward`, `tut.heading`, `tut.scene.alt`, `tut.label.coat`, `tut.label.bookshelf`, `tut.label.candle`, `tut.label.drawer`, `tut.label.typewriter`, `tut.label.mirror`, `tut.label.corkboard`, `tut.close`, `tut.toHall`, `tut.loading`, `tut.slot.glow`.
- **Spirit and taps:** `spirit.ask`, `spirit.right`, `spirit.wrong`, `spirit.final`, `spirit.needLead`, `tap.nothing`, `tap.something`.
- **Leads and hints:** `lead.title`, `lead.steps`, `lead.follow`, `lead.dead`, `lead.deadProof`, `lead.true`, `hint.1`, `hint.2`, `hint.2.again`, `hint.mark`.
- **Fear and restart:** `fear.meter`, `fear.caption.sound`, `fear.caption.sight`, `restart.title`, `restart.body`, `restart.again`.
- **World and navigation:** `world.scene`, `world.prev`, `world.next`, `world.hall`, `world.nav`, `world.panLeft`, `world.panRight`, `world.win`, `world.relic`, `world.relic.fallback`, `world.final`, `world.noLayout`, `world.loading`, `world.scene.alt` (unused for now), `world.notebook`, `world.slot`, `world.slot.hidden`, `world.slot.locked`, `world.slot.solved`, `world.slot.open`, `world.slot.show`, `world.question`, `world.option.tried`, `world.leads`, `world.leads.none`, `world.result`, `world.score`, `world.seed`, `world.relic.alt`, `world.controls` (unused for now).
- **Errors, settings, play:** `error.session`, `settings.motion`, `play.pending`, `play.startFailed`, `play.retry`.
- **Puzzle type names:** `puzzle.weakness`, `puzzle.ritual-order`, `puzzle.true-or-told`, `puzzle.original-name`, `puzzle.symbol`, `puzzle.date-or-number`, `puzzle.who-said-it`, `puzzle.object-match`.

Notes: `world.relic.alt` and `world.scene.alt` are placeholders; `world.scene.alt` and `world.controls` are not used by any component yet. Sentences marked G8 in the source comments were written to fill content gaps and carry the most risk of clashing with the owner's voice. `spirit.right` and `spirit.wrong` are generic lines (G13), not tied to a legend.

## 19. Open risks and Phase 5 items

- **Atlas `serve-build.mjs` crash.** About 120 s after an atlas page request whose stream does not finish, the local build server exits with `Stream lifetime exceeded` (an unhandled `error` event). Seen twice during the browser run. It is a Phase 3-era finding in a protected file, so it was not changed; the checks used a restart loop and a 2.5 s wait before closing atlas tabs. Handle it in Phase 5. Not known whether the Vercel build is affected.
- **Tutorial rate limit (residual risk).** There is no rate limit on tutorial answers. A wrong answer costs nothing by spec and answers are short (a year or a count), so a script can guess without limit. Impact is limited to marking the tutorial done for that user or guest. Revisit in Phase 5 with an edge or Vercel firewall rate limit on the tutorial action.
- **Guest replay.** A guest can reuse an older play token to retry a wrong answer without carrying its fear. A stateless token cannot prevent that. Guest runs store no score or progress, so only that guest's own run is affected. Signed-in runs use `rev` and are not affected.
- **Tutorial lock is not enforced on the server for guests.** "Tutorial done before entering a world" is enforced in the Hall (the browser holds the guest's receipt); `startWorld` does not check it. Signed-in players have `player_flags`, but the service does not enforce that rule either (`decisions.md` 2.7).
- **Production `/media` plan (Phase 5; nothing built).** In dev and the browser run, the game loads images from the atlas origin (`ATLAS_ORIGIN`, returned as `mediaBase`) through the atlas `/media` route. For production: serve `/media` with long cache headers (the local atlas answer has none), with compression for text assets, on the same domain so HTTP/2 applies; then re-measure on a Vercel preview (section 13). The two proposed fixes in section 13 belong here.
- **`serve-build.mjs` (game)** listens on all interfaces. It is a local check script only.
- **Arabic:** the flag turns on `dir=rtl` and `lang=ar`, but the catalog is empty, so English shows and a trailing full stop lands at the start of the line.
- Not verified by any test: the Hall guest flow in a real browser with a second visit after sign-in; Worlds other than Banshee in a browser (they are covered by property tests, layout tests and the 300-seed generation check only).
- `fairness.md` was not regenerated after the owner's final content edits beyond the refresh recorded in `decisions.md`. If `content/legends/` changes again, rerun the skeleton tests and update the known-findings set in `play-atlas-player.property.test.ts` and `fairness.md` (`FAIRNESS_WRITE=1`).

## 20. Secret-exposure incident

During the boundary check (task 11.5, `boundaries.md` h), one command that did not exclude `.env` printed the line holding `GAME_TOKEN_KEY` into a session log. The value is not repeated here. `.env` is git-ignored and untracked, so nothing reached the repo; `.env.example` holds the name with an empty value, and the secret scan test passes (6 of 6). **Recommendation: rotate the local `GAME_TOKEN_KEY` if that session log is stored or shared anywhere.** Rotating invalidates every outstanding guest token and tutorial receipt, which is harmless for local development. I did not read `.env` for this file.

## 21. Owner actions

1. **Rotate the local `GAME_TOKEN_KEY`** (section 20).
2. **Review the new UI wording** (section 18), especially the G8 sentences, the `spirit.*` lines and the `tap.*` fallbacks.
3. **Tune hotspot positions with `?layout=1`** for the guessed placements in section 6 (every World except gumiho and banshee has at least one).
4. **Decide on the image deferral** (section 13, fix 1): start sprites, spirit and meter images only after the scene image has loaded. It changes markup and viewer tests.
5. **Content fixes for the 8 known-finding legends** (banshee, chupacabra, draugr, el-coco, gumiho, naddaha, spring-heeled-jack, vetala): at minimum the `true-or-told` slots (X-1) and the paraphrased `date-or-number`, `object-match`, `original-name` and `who-said-it` slots listed per slot in section 15. Also consider X-3 (repeated anchors), X-4 (add `--versions` anchors to contradictions) and per-event reduced-motion lines for 11 legends (section 16). After any content change, rerun the skeleton tests and `FAIRNESS_WRITE=1`.
6. **Confirm the legend `db:import` date** and that all twelve legends are current in the database (section 9).
7. **Phase 5 production plan:** `/media` caching and compression (section 19), gzip or brotli (section 13 fix 2), rate limit on the tutorial action, the atlas `serve-build.mjs` crash, and a preview-deployment re-measure against the 3.0 s budget.
8. **Skeleton polish:** `resolveTheme` check for glow on surface (spring-heeled-jack 2.8:1).
9. Decide whether to keep the balance reviewer's X-1 recommendation or accept `true-or-told` as a guess slot.

## 22. What I did not do

- No commit and no push. All Phase 4 work is uncommitted (`HEAD` is `33467cb Phase 4 prompt`, the owner's commit).
- `vercel.json` was not touched. `assets/` was not touched. `content/` was not edited by any Phase 4 task (the 12 modified legend files are the owner's).
- `.env` was not read or edited in this task.
- Phase 5 was not started. No production deployment, no production database change, no rate limit, no compression, no image deferral, no `/media` cache work.
- No multiplayer (deferred by product rule).
- The three Slow 4G misses were reported, not fixed. The `resolveTheme` contrast issue, the atlas `serve-build.mjs` crash and the content findings were reported, not fixed.
- Nothing in this file was re-run in task 11.8. Test counts, smoke results and browser results are copied from tasks 11.1, 11.2, 11.4 and 11.7. I read `git diff` and `git status` only (read-only) to build the file list, the dependency list and the catalog key list.

## 23. Where to look

`docs/phase-4-notes/`: `decisions.md` (every choice made without asking, per task), `migration.md`, `phase1-changes.md`, `fairness.md`, `balance.md`, `guard-*.md`, `impeccable-review.md`, `tester-review.md`, `mutations.md`, `boundaries.md`, `browser.md`, `browser-results.json`, `smoke.md`, `verify.md`, `layout-open-matches.md`, `kiro-docs.md`, `docs-read.md`, `test-reliability.md`, `midway.md`, `screens/`. Also `docs/kiro-usage.md` (Phase 4 section), `.kiro/specs/game-play/`.
