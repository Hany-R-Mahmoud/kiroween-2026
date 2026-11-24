# Phase 7 Batch A handover
Spec: `.kiro/specs/phase-7-batch-a/` (requirements, design, tasks). Tasks A1 to A7, Verify (8) and this handover (9). Nothing was committed or pushed. Screenshots are paths only, under `.debug/phase-7/` (git-ignored).

## What changed per task
Per-task detail follows the requirement areas of the spec; the exact line changes are in `git diff`.
- **Atlas home / Book controls (atlas + skeleton)**: Book controls moved before the viewport and made sticky with offset `var(--book-controls-top, 0)`. Home hero no longer uses a dark scrim; `.home-hero-copy` has no background. Header and root route adjusted (`SiteHeader.tsx`, `__root.tsx`). Legend hero uses Tailwind `lg:` utilities in `LegendPage.tsx` because flex utilities beat the grid rule.
- **Book height (skeleton)**: short-viewport floor lowered from 30rem to 14rem. `headerPx` 56 and the 1280x800 result are unchanged.
- **Game world layout (A-tasks on `WorldPlay.tsx`, `world.css`, `scene.css`, `fear.css`, `styles.css`)**: new `WorldTabs.tsx` and `lib/useMediaQuery.ts`. Each panel has a close button below 64rem. Notebook and Leads lost their own bordered wrappers and heading ids. "Try again" is now `btn-primary`. `.world-overlay` is `position: fixed` (also through `.hall-ending`). New 667x375 two-column layout: scene left, dock and tabs right.
- **A7 (hints)**: `hint1For` varies across runs (`lib/world.ts`); `run: 0` added to the props helpers. Unit test added in `apps/game/test/world.test.ts`.
- **ui layer**: "Close panel" rule moved into the ui layer in `world.css`; a button rule added in `skeleton/src/design/ui.css`.
- **Fix found in verify**: `@media (max-block-size: 30rem)` is not a valid media feature. Changed to `max-height` in `apps/game/src/styles.css` and `world.css`.

## Files touched (`git status`, excluding `.debug/`)
Modified (21): `apps/atlas/src/components/LegendPage.tsx`, `apps/atlas/src/components/SiteHeader.tsx`, `apps/atlas/src/routes/__root.tsx`, `apps/atlas/src/styles.css`, `apps/atlas/test/book-component.test.tsx`, `apps/atlas/test/home.test.tsx`, `apps/game/src/components/WorldPlay.tsx`, `apps/game/src/components/fear.css`, `apps/game/src/components/scene.css`, `apps/game/src/components/world.css`, `apps/game/src/i18n/en.ts`, `apps/game/src/lib/world.ts`, `apps/game/src/routes/__root.tsx`, `apps/game/src/routes/world.$target.tsx`, `apps/game/src/styles.css`, `apps/game/test/hint-area.property.test.tsx`, `apps/game/test/world.test.ts`, `skeleton/src/book/Book.tsx`, `skeleton/src/book/book.css`, `skeleton/src/design/ui.css`, `skeleton/test/book-height.test.ts`.
New: `apps/game/src/components/WorldTabs.tsx`, `apps/game/src/lib/useMediaQuery.ts`, `.kiro/specs/phase-7-batch-a/`.
Diff size at writing: 434 insertions, 133 deletions in tracked files. Nothing under `content/` or `assets/`. `scripts/book-check.mjs` unchanged.

## Verify results
- `pnpm -r typecheck`: clean.
- `pnpm -r test`: green after the pin updates. Skeleton 915 pass and 8 expected fail; atlas 302; game 400. It was re-run after fixes, not run exactly once, because `pnpm -r` stops at the first failure.
- Browser check: 303 passed, 0 failed, 2 skipped (Arabic path with `FEATURE_ARABIC` off; Slow 4G). Output went to `.debug/phase-7/book-check.json` so `docs/phase-5-notes/book-check-g5.json` was not overwritten.
- Servers were stopped afterwards.

## Test pins updated
- `apps/atlas/test/book-component.test.tsx`: `flow()` regex (controls now before the viewport).
- `apps/atlas/test/home.test.tsx`: dark-scrim pin now asserts `.home-hero-copy` has no background.
- `skeleton/test/book-height.test.ts`: short-viewport floor 30rem to 14rem.
- `apps/game/test/world.test.ts`: `role="alert"` to `"alertdialog"` in the restart test; A7 source-string pins (about lines 152-153) rewritten to the new store calls; `run: 0` added to the props helper.
- `apps/game/test/hint-area.property.test.tsx`: `run: 0` added to props.
No game-rule or generator property test was weakened.

## Screenshots
58 PNGs in `.debug/phase-7/` at 390x844, 667x375, 768x1024 and 1280x800: atlas-home, atlas-legend-book (and scrolled), atlas-legend-onepage (and scrolled), atlas-404, game-hall, game-world-scene / question / notebook / leads, game-world-rtl, atlas-home-rtl, game-fear-caption-reduced, short-scene, short-notebook. By look, R1, R2 and R4 to R6 pass.

## Owner's open items
1. **Sticky offset (R4.2 vs R1.6)**: default applied is `var(--book-controls-top, 0)` = 0, so the atlas header scrolls away and the controls stick to the top. Owner to confirm or set a different offset.
2. **`world.test.ts` source-string pins**: the A7 pins check source text, not behaviour. Rewritten to the new store calls; Owner to decide whether to keep them.
3. **Short-landscape sheet height**: the design's fallback (sheet covers the dock) was not used. A two-column layout was built instead at 667x375. The sheet is about 190 px tall and scrolls. Owner to review `.debug/phase-7/` short-scene and short-notebook.
4. **New English strings** in `apps/game/src/i18n/en.ts` need owner review. The Leads tab label reads "Threads".

## Not done
- **R3 visuals are unverified.** The restart overlay needs the fear meter filled by wrong answers and the win overlay needs a solved world. No preview flag was added, so neither was captured.
- Contrast was judged by eye, not measured.
- Answering a puzzle in the world was not played through visually.
- Native RTL was not checked; RTL screenshots use forced `dir=rtl` only.
- Arabic path and Slow 4G browser checks were skipped.

## Fixes (follow-up, tasks 10 to 14)
Only `apps/game/src/components/world.css` was edited in this follow-up. The book was not touched, so no browser book check was re-run.

### Task 10: 667x375 fixes (world.css)
- Stage overflow clipped.
- Title and toggle order corrected.
- Motion label visually hidden at short heights; `aria-label` kept.
- Scene buttons in one row that scrolls sideways.
- Tab strip is `1fr 1fr`.
- Dock tightened.
- Measured: scrollWidth 667/667, scrollHeight 375/375.

### Task 11: top bar at 1280x800 and 768x1024
- Toggle sits at the end; scene buttons in one row; scene image about 52px taller.

### Task 12: restart and win overlays
- Captured at 390x844 and 1280x800. scrollY was 0 before and after. Tab is trapped in the overlay.
- Defect fixed: the win card relic image is capped with `max-block-size: min(16rem, 16dvh)` in world.css.
- Only the Banshee world was tried. Script `.debug/phase-7/overlays.mjs` reads the answers from `content/legends/banshee.md`.
- Content issues seen, untouched because `content/` is off limits:
  - Literal asterisks in the relic line: `*Lamp of Vigil*`.
  - Design-note wording in the win text: "The final puzzle (pz-5) asks the player to lay four objects...".
- At 667x375 the win card scrolls inside itself (cardScroll 187). The page does not scroll.

### Task 13: sweep
- 18 screens x 4 sizes: no sideways scroll, no fixes needed.

### Files touched in this follow-up
- `apps/game/src/components/world.css`. The other modified files in the `git status` list above come from the earlier Batch A tasks.

### Screenshots
- `.debug/phase-7/`: `game-restart-overlay-{390x844,1280x800}.png`, `game-win-overlay-{390x844,1280x800}.png`, plus the earlier 667x375, 768x1024 and per-screen shots from tasks 10 to 13. No new screenshots were taken in task 14.

### Check results (task 14)
- `pnpm -r typecheck`: clean.
- `pnpm -r test`: skeleton 915 pass and 8 expected fail; atlas 302; game 400. No test needed a pin change. No game-rule test was touched.

### Not done
- The script reported one small target under 44px, probably the skip link. Not identified.
- The win overlay card scrolls inside itself at 667x375.
- Stale `game-win-overlay-FAIL-*` and `game-restart-overlay-FAIL-*` screenshots in `.debug/phase-7/` can be deleted.

### Owner answers
- Sticky offset stays 0.
- Rewritten A7 source pins are kept.
- New English strings and "Threads" accepted.
- "Try again" as the primary action accepted.
