# Guard pass 9.14: the eleven Worlds

Skill: `skill::agent-guard`, loaded in this thread only, no sub-agents. Lanes run: clean-code (`apps/game/src/layout/**`: 12 World layouts, `fearEvents.ts`, `index.ts` registry, `hub.ts`, `tutorial.ts`; the 9.13 component and CSS fixes) and test (`layout.test.ts`, `world.test.ts`, `tutorial.test.ts`, `hub-tutorial-roles.test.ts`). Docs lane: no docs in scope.

## Findings and fixes

1. **Duplication: 11 copies of the sprite box math.** Every World except Banshee defined the same 17-line `h()` helper (largest square sprite centred in the tap box, sprite id from `h-NN`), differing only in the legend id. Moved it to `layout/boxes.ts` as `squareSpriteBox(legendId)`; each World now has `const h = squareSpriteBox('<legend-id>')`. Output is unchanged (same rounding, same ids). The file sits outside `worlds/`, so the registry glob does not pick it up.
2. **Duplication: the region helper.** `hub.ts` and `tutorial.ts` each defined the same one-line `r()`. Now `regionBox` in `layout/boxes.ts`, imported as `r`.
3. **Stale comment.** `layout/index.ts` said World files "are added per World in later tasks"; all 12 exist. Comment updated.
4. **Test that passes if the rule broke: sprite placement.** `layoutProblems` never checked that the drawn sprite stays inside its tap box, so a wrong centring offset would pass every test. Added the check (`sprite outside its box`), a mutation test that moves one sprite 10 px, and unit tests for `squareSpriteBox` (wide and tall box, odd remainder rounding, sprite id) and `regionBox`.
5. **Duplicate tests.** In the 9.12 block, `has five fear events for every world` repeated the first fear-events test, and `every hotspot sits inside its scene with a sprite or region` was a subset of `layoutProblems`, which already runs on every registered World. Both removed. The per-legend hotspot-id test stays (clear per-World failure name).
6. **9.13 polish item: start failure left "loading" forever.** If the first `start` in a World or the Tutorial_Room failed, the loading line stayed and there was no way to retry. New `components/StartRetry.tsx` (an alert with `play.startFailed` and a `play.retry` button). `WorldPlay` and `TutorialRoom` show it in place of the loading line when `failed` is set and there is no view; the routes pass `onRetry`, which reruns `start` / `startTutorial` through the existing play client. The generic error alert is now shown only once a view exists, so the two messages never stack. New keys in `en.ts` (Arabic falls back per key, as for every other key). Tests (react-dom/server) in `world.test.ts` and `tutorial.test.ts`: failure shows text and button, not loading; still starting shows loading; a later failure keeps the generic alert.

## Checked, no finding

- `fearEvents.ts`: one `row()` builder, no duplication; tests check ids against content, the scene field only on `scene-enter`, and G4 reduced-motion lines.
- Registry: file name must equal `legendId`, no two layouts per legend; covered by the 12-layout test.
- Naming: World layout constants are camelCase of the legend id in all 12 files. Banshee keeps its own `h(id, n, ...)` because its content ids are `hs-*` names (not `h-NN`), its sprite numbers do not follow the ids, and two hotspots share a cropped sprite sheet. Not merged into the shared helper on purpose.
- No `Math.random`, `console`, `any` or physical CSS in the scoped source. The 9.13 CSS fixes use logical properties; the logical-CSS scanner test passes.
- No dead exports in `layout/`.

## Recorded, not changed

- `lists the relic display names of all 12 legends for owner review` (`layout.test.ts`) prints to the console and asserts `rows.length === 12`, which is always true once the legend count test passes. It is an owner-review report, not a rule test. Left as is.
- `lists the asset directory it reads` only guards the `ROOT` path; kept because the file-existence checks would otherwise pass vacuously on a wrong root.
- The other 9.13 polish items (spring-heeled-jack glow contrast in the skeleton, spirit panel over the frame, pan glyphs, CSS order, ending dialog Escape, slot copy) are outside this task.

## Checks

- `pnpm --filter @kiroween/game typecheck`: clean.
- `pnpm -r exec vitest --run` (`pnpm -r test --run` is refused by pnpm as an unknown option): skeleton 47 files, 694 passed + 8 expected fail (702); atlas 10 files, 161 passed; game 19 files, 248 passed.
