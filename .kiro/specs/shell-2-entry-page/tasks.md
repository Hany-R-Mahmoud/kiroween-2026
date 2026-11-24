# Implementation Plan: shell-2-entry-page

## Overview

Language: TypeScript (strict), React 19, plain CSS with logical properties. The plan fixes the two production problems in `HoloCard` first (tasks 1 and 2), then adds the small set of optional `HoloCard` props the page needs, then builds the hidden page `/lab/shell`. The last task, Verify, is the only place where typecheck, tests, the Playwright script, the handover and the usage log run or are written. No test files are written and no suite is run before Verify.

Boundaries: do not touch game logic, the puzzle generator, the play engine, `content/`, `assets/` or the database. If a step needs that, skip it and list it as a blocker in `docs/shell-2-handover.md`. Do not move or link any route, keep `/lab/card`, add no multiplayer code, and write no secret into any file. Do not commit or push.

## Tasks

- [x] 1. Fix: renderer starts on a cold load
  - Create `skeleton/src/shell/holo/imageReady.ts` exporting `IMAGE_WAIT_MS` (10 000) and `waitForImage(img, timeoutMs?)` returning `{ promise, cancel }`, with the rules from the design: resolve after `decode()` when `complete && naturalWidth > 0`; otherwise wait for the next `load` (re-check `naturalWidth > 0`) or `error`; reject on `error` or on the timeout; `cancel()` removes listeners and the timer
  - In `skeleton/src/shell/HoloCard.tsx`, replace the local `ready()` with `waitForImage` for the three Front_Layers and call `cancel` in the effect cleanup; keep rejecting only on a real `error` or the timeout, so the HTML layers stay then
  - In the `data-ready` effect of `HoloCard.tsx`, keep the layer hidden while `complete && naturalWidth === 0` and keep the `load` listener attached until unmount (no timeout there), so a late image still shows
  - Do not run anything in this task; the cold-cache check is in task 9
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Fix: cap the srcset
  - In `skeleton/src/shell/holo/geometry.ts`, add `HOLO_MAX_SHOWN_PX` (493), `HOLO_REQUEST_FACTOR` (1.5), the pure `capSteps(steps, shownPx, factor)` and `HOLO_STEPS_CAPPED`; keep `HOLO_STEPS` and `HOLO_SIZES` unchanged
  - In `skeleton/src/shell/HoloCard.tsx`, pass `HOLO_STEPS_CAPPED` to `responsiveImage` in `layerAttrs` for all four layers
  - Done when the widest candidate in the `srcset` is 800 and the fallback `src` is the w800 copy
  - Do not run anything in this task
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. HoloCard props for a card pair
  - In `skeleton/src/shell/holo/motion.ts`, add `MotionOptions.onInteract` and call it once when a drag passes the 10 px threshold and once on `turnTo` or `turnBy`; keep the pointer listeners on the scene element and the file free of `Math.random`, `Date.now`, `new Date(` and `crypto.random`
  - In `skeleton/src/shell/holo/renderer.ts`, add `sweepDelayMs` to `HoloRendererOptions`; start accumulating `sweepElapsed` only after the delay, using the existing `dt`; keep `sweepDone = true` when reduced
  - In `skeleton/src/shell/HoloCard.tsx`, add the optional props `onFaceChange`, `onInteract`, `handleRef` (filled with `useImperativeHandle`, type `HoloCardHandle`) and `sweepDelayMs`; call `onFaceChange` from the `onSettle` path; implement `turnToFront({ quiet })` with a `quietNext` ref that makes `settleFocus` skip one `focus()`; guard `onInteract` to fire once per mount
  - In `skeleton/src/shell/index.ts`, export the `HoloCardHandle` type
  - Confirm that the motion controller's pointer tilt, IntersectionObserver and shared rAF loop are per card, and change them only if they are not
  - Defaults keep `/lab/card` unchanged; no hard-coded visible text
  - _Requirements: 7.4, 8.1, 8.2, 8.3, 8.4, 9.2_

- [x] 4. Never an empty card: Preview
  - In `skeleton/src/shell/HoloCard.tsx`, render `<span className="holo-preview" aria-hidden="true">` as the first child of `.holo-art`; with a CDN base set its inline `backgroundImage` is `imageUrl(layers.background, base, { axis: 'w', n: 32 })`
  - In `skeleton/src/shell/holoCard.css`, style `.holo-preview` (cover, blur in `--u` units, scale to hide the blur edge, clipped by the card outline); with no inline style paint a `linear-gradient` from `--color-surface` through `--color-bg` with a faint `--color-accent` mix; hide it under `data-renderer="webgl"` with the HTML art; no transition on it, so reduced motion adds none
  - Logical properties and design tokens only
  - Done when a card whose layers have not loaded shows its own blurred art (CDN on) or the palette gradient (CDN off), never a flat surface
  - Do not run anything in this task
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 5. Catalog strings
  - In `apps/atlas/src/i18n/en.ts`, add the nine keys from the design table: `shell.card.told.title`, `.line`, `.link`, `.name`, and `shell.entry.title`, `.tagline`, `.description`, `.hint.pointer`, `.hint.touch`, with the English text from the requirements; leave `ar.ts` unchanged
  - _Requirements: 4.3, 4.5, 4.6, 5.1, 5.2, 7.1, 7.2, 3.2_

- [x] 6. Hide the site chrome on `/lab/shell`
  - In `apps/atlas/src/routes/__root.tsx`, make `Shell` read the pathname with `useRouterState` and, for `/lab/shell` only, render the skip link and `<main>` without `SiteHeader`, the footer and the `max-w-6xl` cap
  - Every other route renders as before
  - _Requirements: 3.5, 3.6, 3.4_

- [x] 7. Entry page route
  - Create `apps/atlas/src/routes/lab.shell.tsx` with `createFileRoute('/lab/shell')`; `head()` returns the title "Trick or Told", the description and `<meta name="robots" content="noindex, nofollow">`, using the Catalog keys through the `translate('en', ...)` helper the legend route uses
  - Render the heading and tagline, then two `shell-slot` wrappers (Told first, True second) around `HoloCard`, then the two Hint lines
  - Told layers: `shell-card-told-bg-01`, `shell-card-told-subject-01`, `shell-card-frame-01`, `shell-card-back-01`, `href="/"`; True layers and `href="/game/"` as on `/lab/card`; strings from `useT()`; `sweepDelayMs` 0 for Told and 120 for True only while the entrance plays
  - Pair rule: each card's `onFaceChange('back')` calls `turnToFront({ quiet: true })` on the other card's handle
  - Hint: hide it for the visit after the first `onInteract` of either card; module-level `hintGone` written only in handlers
  - Entrance: `useState(() => !entrancePlayed)`; set `entrancePlayed = true` in an effect (never on the server); slots carry `data-enter` and `--enter-delay` (0 ms Told, 120 ms True) only while it is true
  - Add no link, sitemap entry or `robots.txt` line; do not hand-edit `routeTree.gen.ts` (the build regenerates it); keep `lab.card.tsx` unchanged
  - Look at `assets/shell/shell-card-told-subject-01.webp` against the frame in the Verify screenshots; it lies lower and smaller than True and ends above the cartouche, so no change is made here
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.4, 5.4, 7.3, 8.1, 8.2, 9.1, 9.2, 9.3, 9.5, 13.1_

- [x] 8. Page styles
  - In `apps/atlas/src/styles.css`, in `@layer ui`, add `.shell-page`, `.shell-head`, `.shell-name` (display font, small), `.shell-tagline`, `.shell-cards`, `.shell-slot`, `.shell-hint*` and the `shell-rise` keyframes
  - Side by side when `(min-width: 700px), (orientation: landscape)`, centered, card inline size the smaller of the width share and the height share so a gap of at least 24 px stays under the cards at 1024x768 and 1280x800; compact head at 667x375 so there is no vertical scroll
  - Stacked below that, Told above True; first card sized to fit the first screen with a 4.5 rem peek of the second card
  - Show the pointer Hint under `(hover: hover) and (pointer: fine)` and the touch Hint otherwise, removing the other with `display: none`
  - Entrance animation with `animation-delay: var(--enter-delay)` and `animation-fill-mode: both`; `animation: none` under `@media (prefers-reduced-motion: reduce)` and `html[data-motion='reduce']`
  - No horizontal scroll (`overflow-x: clip` on the page), logical properties and tokens only, 44 px targets, text contrast at least AA
  - Do not run anything in this task
  - _Requirements: 5.1, 5.2, 5.3, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 7.1, 7.2, 9.1, 9.4, 13.5_

- [x] 9. Verify
  - Run `pnpm -r typecheck` and `pnpm -r test` once and fix any failure the changes caused; write no tests
  - Build the atlas with the CDN base set in the shell only (no secret in any file) and serve it with `apps/atlas/scripts/serve-build.mjs`; write the throwaway Playwright script in `.debug/shell-2/` against `/lab/shell` with these captures:
    - screenshots at 390x844, 375x667, 667x375, 768x1024, 1024x768 and 1280x800: page at rest, Told back face, True back face, reduced motion, WebGL off; look at them and confirm the layout rules, the gap and peek, no horizontal scroll, and the Told subject inside the frame window and clear of the cartouche (if it is not, list it as a blocker in the handover)
    - one video at 1280x800 and one at 390x844: entrance, drag-spin each card, flip one then the other (the first turns back and keeps no focus change)
    - frame rate with both cards on screen at 1280x800, normal and 4x CPU throttle: median and slowest 5 percent
    - network: every request and its size, with the CDN on (cold cache, cache disabled) and off; confirm each Shared_Image loads once; report the widths requested at DPR 1, 2 and 3 and that none exceeds w800; report card image bytes at 390 px and desktop against the 500 KB and 900 KB budgets; confirm no host other than the app and the Image_CDN
    - cold load with the CDN base set and the cache disabled: both canvases reach `data-renderer="webgl"` within 15 seconds
    - keyboard: Tab reaches Told then True, Enter flips, focus lands on the back link, Escape turns back to the front button
    - Slow 4G at 390x844: a screenshot every 3 seconds until both cards are drawn, and a check that no card is ever a flat empty box
    - the Hint under mouse and touch emulation, and that it hides after the first drag or flip
  - Gzip the emitted lazy renderer chunk from `apps/atlas/dist/client/assets` and report its size against the 25 KB budget
  - Tune only the constants this phase added (preview blur, entrance timing, page spacing), then re-run the affected captures
  - Write `docs/shell-2-handover.md`, short: what changed, files touched, check numbers, screenshots and videos, new strings for owner review, "Continue" skipped with its reason and the game change that would unblock it (a last-world value written by the game, plus a legend name source without a database call), blockers, and anything weak
  - Add a short entry to `docs/kiro-usage.md`
  - Do not commit or push
  - _Requirements: 1.6, 2.3, 3.5, 4.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 8.5, 8.6, 9.4, 10.1, 11.1, 11.2, 12.1, 12.2, 12.3, 12.4, 13.1, 13.2, 13.3, 13.4, 14.1, 14.2, 14.3, 14.4, 14.5_

## Notes

- There are no test-writing tasks and no optional tasks. The design has no Correctness Properties section, so no property tests apply.
- No typecheck or test suite runs before task 9.
- Tasks 1 to 4 share `HoloCard.tsx` (and tasks 2, 3 and 4 touch `geometry.ts`, `motion.ts` and `renderer.ts`, `holoCard.css` once each), so they run in sequence. Tasks 5 and 6 touch different files and can run beside task 1.
- Task 8 follows task 7 because the class names come from its markup.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "5", "6"] },
    { "id": 1, "tasks": ["2"] },
    { "id": 2, "tasks": ["3"] },
    { "id": 3, "tasks": ["4"] },
    { "id": 4, "tasks": ["7"] },
    { "id": 5, "tasks": ["8"] },
    { "id": 6, "tasks": ["9"] }
  ]
}
```
