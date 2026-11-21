# Test quality review (task 11.4, agent-tester)
Scope: `skeleton/test/` play-*, token*, view*, hall*, fear-budget*, keepers-*, reader-privileges*, balance-reviewer-agent*; `apps/game/test/*`; `apps/atlas/test/keepers-note*`. Method: read every loop and aggregate assertion for empty-set passes, expected values copied from the code under test, timing and ordering, and duplicates; then map each brief requirement to the tests that guard it. The hand mutations in `mutations.md` (11.3) already show which rules fail a test; this review added what those could not.

## Findings and fixes (no test weakened)
| # | Finding | Fix |
|---|---|---|
| 1 | `layout.test.ts` negative cases asserted only `.not.toEqual([])`. A layout rejected for an unrelated reason would still pass (for example the x-order case also changes other fields). | Each case now asserts its own problem text: `outside scene`, `under MIN_BOX`, `overlaps`, `x not ascending`, `no sprite or region`, `hotspot ids differ`, `sprite differs from content`, `scene order`, `file missing`, `refused by assetUrl`, `2 sprite matches`, `0 sprite matches`. |
| 2 | "every registered World layout is valid" loops over `WORLD_LAYOUTS`; an empty map would pass. | Added `size > 0` guard. |
| 3 | `reader-privileges`: "never grants the details, flags or runs tables" loops over parsed grants; a parser that found none would pass. | Added non-empty guards on `docGrants` and `migrationGrants`. |
| 4 | `hall.test` (skeleton): the curses property derives its expectation from `WORLD_COUNT`; changing the constant moves test and code together. | Pinned `WORLD_COUNT` to 12 in the example test. |
| 5 | `play-taps-fear`: "every table key names a real Hotspot" loops over the fear table; empty table passes. | Added non-empty guard. |
| 6 | Source scans could pass over zero files: `logical-css`, `i18n` (hardcoded text), `tutorial` (hotspot labels), `fonts` (entries). | Added a minimum count to each scan. |
| 7 | No test proved a Run needs no database or network (brief item). `play-store-sql` states it in a comment only. | New test in `play-service.test.ts`: a guest plays a world to a win with `fetch` and `net.Socket.connect` replaced by throwing spies, `DATABASE_URL` removed, and the spies asserted not called. |

Checked and left as is:
- Tautology risk in `play-win-score-fear` and `play-service` score checks: expected scores come from `score()` (Phase 2, unchanged) applied to counts the test itself produced by sending actions, not from the engine's own counters. Fear constants are pinned by `fear-budget.test` (mutations 15 to 17).
- Property 22 (`hall`) restates the door rule as an independent oracle; the example tests give the three outcomes literally. Acceptable.
- Loops in `play-guessing-anchors`, `play-atlas-player`, `play-leads-final`, `play-secrecy` already end in a counter or `toBeGreaterThan(0)` check, or follow a test that pins the legend count at 12.
- Timing: the only real delay is `setTimeout(15)` in `playClient.test.ts`. Order comes from the promise chain and `max in flight`, not the delay length, so it is not flaky. No wall-clock assertions, no `Math.random`, `.only`, or unconditional `.skip`. The one `describe.skipIf(!built)` in `server.test.ts` covers built output only; source rules run always.
- Known content findings: eight legends are listed as `it.fails` in `play-atlas-player` with an exact-set test (owner rule, `fairness.md`). Not changed.
- Duplicates: `hall.test.ts` exists in both skeleton (rule) and game (render); they test different layers. No test removed.

## Requirement to test map
| Brief requirement | Tests |
|---|---|
| Scripted atlas-only player wins | `play-atlas-player.property` Property 14 (12 legends, 40 seeds, exact known-findings set) |
| Guessing player hits full fear; restart gives a new seed | `play-guessing-anchors` (per legend: ends `restarted`, new seed, fear 0, old row keeps counts); `play-win-score-fear` Property 12 |
| Dead-end anchors exist | `play-guessing-anchors` "Dead-end contradiction anchors" (40 seeds, non-empty counter, atlas text at each anchor); `play-leads-final` Property 10 |
| Payloads inspected from real responses | `apps/game/test/server.test` "browser payloads: real service responses"; `play-secrecy.property` Property 3; `view.test` |
| Tutorial three details and accept forms | `play-tutorial-receipt.property` Properties 16 to 18 (3 details, digit and "Also accept" forms, trimming, case) |
| Tampered guest token refused | `token.property` Property 2 (every position, truncation, trailing data, other legend, other kind, expiry, other key, one message) |
| Server-counted hint 2 and wrong answers give the score | `play-win-score-fear.property` (Properties 12, 13); `play-service` "counts a Hint 2 itself"; `access-score.property`; `server.test` extra-key refusals; `play-ownership-validation.property` |
| Every hotspot has layout and sprite or region | `apps/game/test/layout.test` (`layoutProblems`, per-legend id equality, 12 layouts); `hub-tutorial-roles.test` |
| Asset ids map to files | `layout.test` "maps every asset id the game uses to an existing file" (non-empty check); `pan-media.test` |
| Keeper's Note anchor once, and reader role | `keepers-note.test` (skeleton, exactly-once check); `apps/atlas/test/keepers-note.test.tsx`; `keepers-read.test`; `reader-privileges.test` |
| Runs with no DB or network | `play-service.test` "offline" (new); `play-store-sql.test` (recording stand-in); `play-service` and `server.test` use the in-memory store |

## Final runs (each suite separately)
- `skeleton`: 48 files passed; 701 tests passed, 8 expected fail (known content findings); 154 s.
- `apps/atlas`: 10 files, 161 tests passed.
- `apps/game`: 20 files, 256 tests passed.

Not done: no new mutation re-run for the new guards (they only add assertions). The offline test was not mutation-checked against a real fetch call.
