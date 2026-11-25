# Final polish handover

Spec: `.kiro/specs/final-polish/`. Hard limit respected: nothing visible in normal motion changed, and no file under `apps/*/src` or `skeleton/src` changed.

## Changes

1. **Yuki-onna cold open** (`content/legends/yuki-onna.md`, line 23): the line now starts with `[Dramatization]`. One line changed.
2. **Fairness template** (`skeleton/test/play-atlas-player.property.test.ts`): the template text now branches on `KNOWN_CONTENT_FINDINGS`. No assertion, player, seed or budget changed. `docs/phase-4-notes/fairness.md` was regenerated with `FAIRNESS_WRITE=1` (20 of 20 passed).
3. **Hall check** (`apps/game/scripts/browser-check.mjs`): the app was right and the check was stale. `clamp(18rem, 64dvh, 40rem)` came in with `54d5af4` (batch D, task D5; `.kiro/specs/batch-d-polish/design.md` line 113; `docs/batch-d-handover.md` line 46). The old `min(70dvh, 36rem)` came from `5146d15` / `3ff7d64`. Measured 540.16 px at 390x844. The check now reads `--scene-h` from the `.hall-scene` rule and compares with a 1.5 px tolerance. App and CSS untouched.
4. **Motion check** (same script): the check was stale. Under reduced motion `ui.css` sets `animation: none !important` (in both the `@media` block and `html[data-motion='reduce']`), and `fear.css` hides `.fear-look` and shows a static caption, so `getAnimations()` returns `[]`. With normal motion, `fear-flash`, `fear-tighten` and `fear-caption-full` run. The check now fails if any of those three runs under reduced motion, or if any animated property is transform, translate, scale, rotate, filter, offset or size. `html[data-motion='reduce']` was not checked in a browser (its CSS block equals the `@media` one). No app CSS changed.

## Results

- `pnpm -r typecheck`: pass.
- Tests: skeleton 924, atlas 306, game 401, all pass.
- Content audit: zeros.
- Game browser check, groups keyboard, touch, motion: 37 passed, 0 failed (last run 35 / 2). "hall" is not a group name: the Hall checks live in keyboard and touch. The layout group was not run.
- Dev import done (12 legends, 83 chapters, 423 facts, 198 hotspots). The label was seen in the `/legends/yuki-onna` HTML. Production import is left to the owner.
- Servers stopped: `lsof -nP -iTCP -sTCP:LISTEN | grep -E ':(3500|3501)'` returned nothing.

## Changed and new files (git status)

- `M apps/game/scripts/browser-check.mjs`
- `M content/legends/yuki-onna.md`
- `M docs/phase-4-notes/fairness.md`
- `M skeleton/test/play-atlas-player.property.test.ts`
- `?? .kiro/specs/final-polish/`
- This handover and the entry in `docs/kiro-usage.md` (written after the status snapshot).

## Weak points

- `.debug/final-polish/pids` is stale.
- The Hall measurement used the existing dist build.
- No commits or pushes.
