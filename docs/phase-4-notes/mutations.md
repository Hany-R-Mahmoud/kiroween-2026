# Mutation checks (phase 4)

## 8.1 (8A.1) Hall door id to legend id mapping
- File: `apps/game/src/lib/hall.ts`. Mutation: `'hub-door-dutchman': 'flying-dutchman'` changed to `'hub-door-dutchman': 'dutchman'`.
- Result: `test/hall.test.ts` failed 2 tests ("all 12 doors map to real, distinct legend ids from the legend list" and "every door gets its title label and relic slot, not the lamp fallback").
- Reverted by hand; `cmp` against the backup copy was identical; game suite passes (208 tests).

## 8.2 (8A.2) One play action in flight
- File: `apps/game/src/lib/playClient.ts`. Backup copied to `/tmp` before mutating.
- Mutation A: the in-flight guard `tail.then(fn)` changed to `fn()`. `test/playClient.test.ts` failed 2 tests (chained tokens with overlapping calls; second 409 with the queue behind it).
- Mutation B: the 409 reload (`await startWorld(legendId); r = await send();`) changed to `throw e;`. Failed 2 tests (409 reload then apply once; second 409 reported and queue continues).
- Both undone by hand; `cmp` against the backup was identical.

## 9.12 All-worlds completeness (apps/game/test/layout.test.ts)
- Renamed `h-04` to `h-99` in `layout/worlds/gumiho.ts`: "every registered World layout is valid" and "gumiho: layout hotspot ids equal..." failed. Reverted by hand, cmp identical.
- Changed `FEAR_FRAME_ASSET` to `shared-game-ui-fear-09` in `components/FearMeter.tsx`: "maps every asset id the game uses to an existing file" failed. Reverted by hand, cmp identical.

## 11.3 Mutation record (requirement 13.13)

Method: every source file was copied to `/tmp/mut-bak/` in a separate step first. Each mutation was one hand edit, only the covering test files were run, and the edit was undone by hand. After each file's mutations, `cmp` against the backup was identical. Final `cmp` of all nine skeleton files, `docs/tech-decisions.md` and `apps/game/src/layout/worlds/banshee.ts` was identical. Test additions are listed under the table.

| # | Rule | File | Mutation | Test that caught it |
|---|---|---|---|---|
| 1 | Server answer check | `skeleton/src/play/engine.ts` | `option === slot.correctIndex` replaced by `true` (accept any) | `play-answers-hints.property` Property 5 (2 tests); `play-engine` smoke |
| 2 | No correct index in views | `skeleton/src/play/view.ts` | Added `correctIndex` to the slot view | `play-secrecy.property` Property 3 (2 tests); `view.test` "a fresh Run shows no question..." |
| 3 | Hint 2 once | `engine.ts` | `first = true` (no `hint2Used` check) | `play-answers-hints.property` Property 6; `play-engine` smoke |
| 4 | Dead end is not a wrong answer | `engine.ts` | `follow` increments `wrongAnswers` | `play-leads-final.property` Property 10; `play-win-score-fear.property` Property 12 |
| 5 | Win needs the true lead | `engine.ts` | `endStatus` lead condition `|| true` | `play-engine` smoke; `play-win-score-fear.property` Property 12 (4 tests) |
| 6 | Final slot last (engine) | `engine.ts` | `isLocked` returns false | `play-leads-final.property` Property 11 |
| 6b | Final slot last (view) | `view.ts` | `locked = false && ...` | `play-leads-final.property` Property 11 (2 tests) |
| 7 | Fear table once | `engine.ts` | removed `!state.tapped.includes(hotspotId)` | `play-taps-fear.property` Property 9 (2 tests) |
| 8 | Hint 2 anchor only when earned | `view.ts` | `if (true) view.hint2 = ...` | `play-secrecy.property` Property 3; `view.test` "opens a slot ... shows Hint 2 only after use" |
| 9 | Seed secrecy in progress | `view.ts` | `seed: run.seed` in the view | `play-secrecy.property` Property 3; `view.test` |
| 10 | Token expiry | `token.ts` | expiry check removed | `token.property` "refuses a token read after its expiry"; "valid just before expiry" |
| 11 | Token binding, legend id in AAD only | `token.ts` | `v1|${kind}` AAD | NOT CAUGHT, equivalent (see below) |
| 11b | Token binding, AAD and payload legend check both removed | `token.ts` | both removed | `token.property` "refuses a token read for another legend" |
| 12 | Token binding, kind in AAD | `token.ts` | `v1|${legendId}` AAD | `token.property` "refuses a token read as another kind"; `play-tutorial-receipt.property` Property 21 |
| 13 | Token tamper (auth tag verified) | `token.ts` | `decipher.final()` dropped | `token.property` "refuses a one-character change at every position"; "another kind" |
| 14 | Token payload secrecy / fresh IV | `token.ts` | IV fixed to zeros | `token.property` "uses a fresh IV" |
| 15 | Play token lifetime | `token.ts` | 6 h changed to 1 h | NOT CAUGHT at first; caught after the new pin test (see below) |
| 16 | Fear amounts | `fear.ts` | `wrongAnswer` 15 to 14 | `play-win-score-fear.property` Property 13 (by accident); caught by the new pin test |
| 17 | Fear amounts | `fear.ts` | `hint2` 6 to 5; `deadEnd` 6 to 7; `max` 100 to 99; `tutorialHint2` 10 to 9 (one at a time) | NOT CAUGHT by derived tests; each caught by the new `fear-budget.test` pin |
| 18 | Score from server counts | `score/score.ts` | `perWrongAnswer` 10 to 9 | `access-score.property` (2 tests); `play-win-score-fear.property` (3 tests) |
| 19 | Score ignores client input | `play/validate.ts` | `.strict()` removed from the answer action | NOT CAUGHT at first; caught after the new extra-key cases in `play-ownership-validation.property` |
| 20 | Tutorial answer forms | `tutorial.ts` | `alsoAccept` ignored | `play-tutorial-receipt.property` Property 17 (2 tests) |
| 21 | Tutorial answer normalising | `tutorial.ts` | `toLowerCase()` removed | `play-tutorial-receipt.property` Property 17 (2 tests) |
| 22 | Tutorial empty answer | `tutorial.ts` | empty string accepted | `play-tutorial-receipt.property` "refuses any other string..." |
| 23 | Tutorial Hint 2 once | `tutorial.ts` | `charged = true` | `play-tutorial-receipt.property` Property 18 |
| 24 | Tutorial Hint 2 anchor only when earned | `tutorial.ts` | `hint2` always in the view | NOT CAUGHT at first; caught after the new assertion in Property 18 |
| 25 | Receipt only when solved | `tutorial.ts` | solved check removed | `play-tutorial-receipt.property` "only a solved tutorial can produce a receipt" |
| 26 | Receipt kind | `tutorial.ts` | `verifyTutorialReceipt` decodes as `tutorial` | `play-tutorial-receipt.property` Property 21 (3 tests) |
| 27 | Door rule: tutorial lock | `play/hall.ts` | locked branch removed | `hall.test` (2 tests) |
| 28 | Door rule: guest sign-in | `hall.ts` | `'signin'` replaced by `'open'` | `hall.test` (2 tests) |
| 29 | Curses remaining | `hall.ts` | `Set(...).size` replaced by `.length` | `hall.test` (2 tests) |
| 30 | Ownership WHERE (save/end/abandon) | `skeleton/src/db/playStore.ts` | `eq(runs.userId, userId)` removed from `openRow` | `play-store-sql.test` (5 tests) |
| 31 | Ownership WHERE (current) | `playStore.ts` | user filter removed from `current` SELECT | `play-store-sql.test` (4 tests) |
| 32 | Ownership WHERE (begin) | `playStore.ts` | user filter removed from the abandon UPDATE | `play-store-sql.test` "begin abandons..." |
| 33 | Ownership WHERE (tutorialDone) | `playStore.ts` | user filter removed | `play-store-sql.test` "tutorialDone reads by user..." |
| 34 | Reader privileges | `docs/tech-decisions.md` | added `GRANT SELECT ON keepers_note_details TO atlas_reader;` | `reader-privileges.test` (2 tests) |
| 35 | Hotspot overlap | `apps/game/src/layout/worlds/banshee.ts` | `hs-wheel` x moved onto `hs-dresser` | `layout.test` "every registered World layout is valid" |
| 36 | Sprite match | `banshee.ts` | `hs-clock` sprite `05` to `55` | `layout.test` (2 tests: valid layout; asset ids map to files) |
| 37 | Hall door id, one play action in flight, layout completeness | see sections 8.1, 8.2, 9.12 above | | caught there |

### NOT CAUGHT items

- **#11 (legend id removed from the AAD only): equivalent.** The decoder checks the legend id twice: through the AAD, and again against `payload.legendId` after decryption. Removing one layer changes no observable result (the same fixed `session` error). Mutation 11b removes both and is caught, so the legend binding is tested. No test change.
- **#15, #16, #17 (constants):** the existing tests derive expectations from `PLAY_TOKEN_TTL_SECONDS` and `FEAR`, so a changed constant moves test and code together. Strengthened: `token.property.test.ts` now pins 21,600 s and 31,536,000 s; `fear-budget.test.ts` has a new test that pins `FEAR` (15, 6, 6, 10, 100) and `HOTSPOT_FEAR_STEP` (3). Each mutation re-run is caught.
- **#19:** no test sent an extra key on the `answer`, `hint1`, `hint2` or `follow` action. Added four cases to `play-ownership-validation.property.test.ts`. Re-run: caught.
- **#24:** the tutorial view's Hint 2 anchor was not asserted absent before use. Added the assertion to Property 18 in `play-tutorial-receipt.property.test.ts`. Re-run: caught.

No test was weakened. Test files changed: `token.property.test.ts`, `fear-budget.test.ts`, `play-ownership-validation.property.test.ts`, `play-tutorial-receipt.property.test.ts`.
