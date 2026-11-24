# Implementation Plan: Phase 7, Batch A

## Overview

Seven layout and CSS parts (A1 to A7) in the order the owner set, then one Verify task and one handover task. The language is TypeScript with CSS; the design already uses concrete code, so no language question applies.

Working rules for every task:

- Check each task by looking at the dev server only. Save no screenshots and run no tests until the Verify task (R8.13).
- Run `pnpm -r typecheck` only after a change to TypeScript types or props. It is called out in the tasks where that happens (R8.7).
- Do not edit `skeleton/src/**/*.ts` more than once per file, because a hook runs the skeleton tests on each save (R8.8). `.tsx` and `.css` files are not affected.
- Do not change game logic, the puzzle generator, the seeded RNG, `content/`, `assets/` or the database (R8.1). Do not merge or move the two headers (R1.8). Do not commit or push (R8.12).
- Add no tests except the A7 unit test (R8.2, R8.3). If an existing test fails only because it pinned the old layout, update that pin and note it for the handover (R8.5). Never weaken a game-rule test (R8.6).
- Put no secrets, tokens or connection strings in code, docs or config (R8.11).

## Tasks

- [x] 1. A1: Shell owns the viewport
  - [x] 1.1 Add the shared shell class in the skeleton
    - In `skeleton/src/design/ui.css`, inside `@layer ui`, add `.app-shell` as designed: flex column with `min-block-size: 100dvh`, a header child with `flex: none; box-sizing: border-box; block-size: var(--app-header-h)`, a main child with `flex: 1 0 auto`, and `inline-size: 100%` on `main` and `footer` children.
    - Leave `--app-header-h` at `3.5rem` in `skeleton/src/design/tokens.css`. Do not copy the token or the class into either app.
    - _Requirements: 1.1, 1.4, 1.5, 8.10_

  - [x] 1.2 Apply the shell to both apps and fix both headers to the token height
    - Replace `min-h-screen` with `app-shell` on the body in `apps/atlas/src/routes/__root.tsx` and `apps/game/src/routes/__root.tsx`.
    - In `apps/atlas/src/components/SiteHeader.tsx`, on the `nav` drop `py-2` and `flex-wrap`, add `h-full` and `flex-nowrap`, and give the logo link `min-w-0` and `truncate`. Leave `apps/game/src/components/GameHeader.tsx` as it is, since the shell class fixes its height.
    - If the dev server shows the Atlas header overflowing at 360 to 390 px, hide the "All legends" link below 40rem (`hidden min-[40rem]:inline-flex`). Apply this only if the overflow is visible.
    - In `apps/atlas/src/styles.css` (around line 53), reword the comment that calls the header sticky to "a landed section clears the header (height + 1rem)". Do not change the `scroll-margin-block-start` rule.
    - Look at both apps in the dev server: header on one row at its token height, no page scroll when content fits, Game menu popover flush under the header.
    - _Requirements: 1.2, 1.3, 1.4, 1.6, 1.7, 1.8, 1.9_

- [x] 2. A2: World screen fits the viewport
  - [x] 2.1 Add the desktop media-query hook and catalog keys
    - Create `apps/game/src/lib/useMediaQuery.ts` with `useDesktop()` for `(min-width: 64rem)`: default `false` on the server, corrected on mount, same pattern as `useReducedMotion`.
    - Add the catalog keys `world.tabs.label`, `world.tab.scene`, `world.sheet.close` and `world.question.none` to `apps/game/src/i18n/en.ts`. Use no hardcoded strings.
    - _Requirements: 2.1, 2.4_

  - [x] 2.2 Create the tab strip component
    - Create `apps/game/src/components/WorldTabs.tsx`: `role="tablist"` with four buttons (`role="tab"`, `aria-selected`, `aria-controls`) for Scene, Question, Notebook and Leads. Support arrow keys (direction follows `document.dir`), Home and End. Hide the Scene tab from 64rem up. Each button is at least 44 px in both dimensions.
    - Export the `WorldTab` type: `'scene' | 'question' | 'notebook' | 'leads'`.
    - _Requirements: 2.2, 2.4, 2.9, 2.10, 2.11_

  - [x] 2.3 Write the grid, rail, sheet and sizing CSS
    - In `apps/game/src/styles.css`, add `--game-pad: var(--space-4)` and set it to `var(--space-2)` under `@media (max-block-size: 30rem)`. In `apps/game/src/routes/__root.tsx`, make the `main` padding use `var(--game-pad)` instead of `p-4`.
    - In `apps/game/src/components/world.css`, add `.world-root` (`block-size: calc(100dvh - var(--app-header-h) - 2 * var(--game-pad)); min-block-size: 0`), the `.world-grid` areas below and from 64rem, `.world-rail` (`display: contents` below 64rem, flex column with its own scroll from 64rem) and `.world-sheet` (the `.hall-panel` look made absolute inside the stage cell with `grid-area: stage`, `max-block-size: none`, own scroll). Add the short-landscape compaction under `max-block-size: 30rem`.
    - In `apps/game/src/components/scene.css`, change `min-block-size: 30rem` (around line 277) to `0` and the `.scene-screen .scene-viewport` floor `14rem` (around line 376) to `8rem`. Leave the tutorial's plain `.scene-screen` rules working.
    - In `apps/game/src/components/fear.css` (or `scene.css`), make `.spirit-panel` one column with `padding-inline: 1.5rem` and hide `.spirit-close` inside `.world-rail` and `.world-sheet`.
    - Use logical properties only. Keep every interactive target at 44 px or larger.
    - _Requirements: 2.1, 2.3, 2.5, 2.6, 2.7, 2.10, 2.11_

  - [x] 2.4 Restructure WorldPlay and the route onto the grid
    - In `apps/game/src/components/WorldPlay.tsx`, render `<div className="scene-screen world-grid">` with this DOM order: top bar, stage, dock (fear, reply, hints), then `.world-rail` holding the tab strip and the three panels. Keep all three panels in the DOM, set `hidden` on the inactive ones, and wrap each in `role="tabpanel"` with `aria-labelledby`.
    - Add `tab` state. The effective tab is `question` when the viewport is desktop and `tab` is `scene`. Choosing "Show" on a Notebook puzzle switches to Question. A fear restart or a win resets the tab to `scene`. Below 64rem a non-Scene tab opens its panel as the stage-only sheet; it takes focus when it opens, and Escape closes it and returns focus to its tab.
    - Add the optional `motion?: ReactNode` prop, rendered in the top bar with `margin-inline-start: auto`. In `apps/game/src/routes/world.$target.tsx`, add `className="world-root"` to `ThemeRoot` and pass `motion={<MotionToggle .../>}` in place of the toggle rendered below the scene.
    - Run `pnpm -r typecheck` once after this task, because the props changed.
    - Look at the dev server only: one viewport high with no page scroll, Question, Notebook and Leads readable and answerable without page scroll, scene fits at 667x375, tab focus order follows the visual order.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.8, 2.9, 2.10, 2.11_

- [x] 3. A3: Win and fear restart over the scene
  - [x] 3.1 Turn the ending and the restart notice into overlays
    - In `apps/game/src/components/WorldPlay.tsx`, render `Ending` as `<div className="hall-ending world-overlay" role="dialog" aria-modal="true" aria-labelledby="world-win-title">` around the existing card, and the restart notice as the same container with `role="alertdialog"`, `aria-labelledby="world-restart-title"` and `aria-describedby` on the body. The restart overlay has one primary action, the existing "Try again" button, which calls `onDismissRestart()`.
    - Trap focus with `onKeyDown` and `dialogKeyAction` from `apps/game/src/lib/focus.ts` (on `'trap'`, `preventDefault()` and refocus the button). Ignore Escape. Focus the button on mount with `focus({ preventScroll: true })`.
    - In `apps/game/src/components/scene.css`, add the `.world-overlay` modifier beside `.hall-ending`: centred content, and a card with `max-block-size: 100%; overflow-y: auto`. Add no animation or transition.
    - Look at the dev server only: both overlays cover the viewport and the page does not jump.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 4. A4: Book controls on top and sticky
  - [x] 4.1 Move the controls before the book content
    - In `skeleton/src/book/Book.tsx`, move the `book-controls` block (around lines 289-302) before the `book-viewport` div (around line 273). Keep the handlers, labels and `hidden={!supported || single}` unchanged. Save the file once.
    - _Requirements: 4.1, 4.3, 4.4, 4.5_

  - [x] 4.2 Make the controls sticky, shorten the page floor and fix print
    - In `skeleton/src/book/book.css`, give `.book-controls` `position: sticky; inset-block-start: var(--book-controls-top, 0); z-index: 5`, the page background and `border-block-end`. Do not set `--book-controls-top` in the Atlas.
    - Move the controls rules (around lines 159-186) above the `@media print` block so the print rule hides the controls.
    - Change the `--book-page-height` floor from `30rem` to `14rem`: `clamp(14rem, calc(100dvh - var(--app-header-h) - 9rem), 52rem)`.
    - Use logical properties only. Keep the RTL mirroring rules and the 44 px targets.
    - Look at the dev server only: controls first and sticky in book mode and one-page mode, one-tap toggle at any scroll position, page, indicator and arrows fit at 375x667 and 667x375.
    - _Requirements: 4.2, 4.4, 4.6, 4.7, 4.8, 4.9, 4.10_

- [x] 5. A5: Show hero images whole
  - [x] 5.1 Two-column legend hero from 64rem
    - In `apps/atlas/src/components/LegendPage.tsx`, add `legend-header` to the `LegendHeader` wrapper and `legend-intro` to the copy block.
    - In `apps/atlas/src/styles.css`, add the `@media (min-width: 64rem)` block from the design: a two-column grid (`3fr 2fr`), `.legend-hero` with `max-block-size: none; object-fit: contain`, and the intro without inline margin or padding. Leave the base `.legend-hero` rule and the phone and tablet layouts unchanged. Use logical properties.
    - _Requirements: 5.1, 5.2, 5.5, 5.7_

  - [x] 5.2 Two-column home hero with no scrim above 40rem
    - In `apps/atlas/src/styles.css`, make `.home-hero` a two-column grid and `.home-hero-frame` a static 16:9 box. Delete the `::after` scrim rules (including the `[dir='rtl']` one) and the copy scrim background. Give `.home-hero-copy` `align-self: center` and `padding-inline: var(--space-4)`. Do not edit the phone block (`max-width: 39.999rem`).
    - Look at the dev server only: painting whole in one column and copy on the plain background in the other above 40rem, and the phone layout unchanged at 390x844.
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 6. A6: Fear caption visible with reduced motion
  - [x] 6.1 Add the static visible state for the caption
    - In `apps/game/src/components/fear.css`, add `opacity: 1` for `.fear-overlay-caption` under `.fear-overlay[data-motion='reduced']`, `@media (prefers-reduced-motion: reduce)` and `html[data-motion='reduce']`. Keep the existing `full` rule, the `fear-fade` rule and its keyframes.
    - Do not touch `animation: none !important` in `skeleton/src/design/ui.css`.
    - Look at the dev server only, with the Motion_Toggle on: the caption shows for its whole time, appears and disappears with no flash or movement, and animates as before with motion on.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7. A7: Hint 1 state does not survive a fear restart
  - [x] 7.1 Add the pure Hint 1 store helper
    - In `apps/game/src/lib/world.ts`, add `Hint1Store`, `emptyHint1(run)` and `hint1For(store, run)` as designed. Save the file once.
    - _Requirements: 7.3, 7.5_

  - [x] 7.2 Key the Hint 1 state by Run in WorldPlay and the route
    - In `apps/game/src/routes/world.$target.tsx`, add `const [run, setRun] = useState(0)`, call `setRun(runNo.current)` where `runNo` is incremented on `restarted`, and pass `run` to `WorldPlay`.
    - In `apps/game/src/components/WorldPlay.tsx`, add the required `run: number` prop. Replace the Hint 1 texts and highlights state with one `Hint1Store` state, read through `hint1For(store, p.run)`, and write in the reply effect with `setStore((prev) => ...)` using `hint1For(prev, p.run)`. Clear `hint1Asked.current` when `p.run` changes.
    - Leave the fear meter rules, hint gating, seeded RNG and generator unchanged.
    - Run `pnpm -r typecheck` once after this task, because the props changed.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 7.3 Add the A7 unit test and update the pins it affects
    - In `apps/game/test/world.test.ts`, add one `it` block next to the existing `hint1Marks` tests: a store filled in Run 0 gives an empty store from `hint1For(store, 1)` (`texts` and `highlights` both empty), `hint1Marks(view, hint1For(store, 1).highlights)` marks nothing, and `hint1For(store, 0)` still returns the stored text. No DOM and no layout.
    - Update the existing pins this change affects: add `run: 0` to the `WorldPlay` props helper (around line 49), and rewrite the two source-string pins (around lines 152-153) to match the new store calls. Do not weaken any assertion. Note both updates for the handover.
    - _Requirements: 7.6, 8.2, 8.5, 8.6_

- [x] 8. Verify
  - Run once, after all other implementation tasks are done (R8.4):
    - `pnpm -r typecheck`
    - `pnpm -r test`
    - `pnpm --filter @kiroween/atlas test:browser -- --base http://localhost:3001`
  - Update only the existing test pins that pinned the old layout, and record each for the handover. Expected pins from the design: `apps/atlas/test/book-component.test.tsx:33` (the `flow()` regex), `apps/atlas/test/home.test.tsx:114-117` (the dark-scrim pin), and the floor expectations in `skeleton/test/book-height.test.ts` (keep `headerPx === 56` and the 1280x800 expectations). Update `scripts/book-check.mjs` only if it measures old positions. Never weaken a game-rule test or the generator property tests.
  - Take the single screenshot pass: one screenshot per affected screen, once, at 390x844, 667x375, 768x1024 and 1280x800, saved under `.debug/phase-7/`. Use the existing CDP scripts in `apps/atlas/scripts/` where they cover a screen and one throwaway script under `.debug/phase-7/` for the game screens (not added to any test directory). Screens: Atlas home, Atlas legend page in book mode and one-page mode, a short Atlas page or 404, Game hall, Game world on the Scene, Question, Notebook and Leads tabs, the win and restart overlays, and the fear caption with reduced motion on. Add one RTL screenshot each of the world and the home hero.
  - Check each screenshot against the acceptance criteria of Requirements 1 to 6. If the win overlay cannot be reached without solving a world by hand, record it as not captured instead of adding a preview flag to the code. If the 667x375 sheet is unusable, apply the design's fallback of covering the dock in short landscape only, and record it.
  - Keep the results (command output summaries, screenshot list, pins updated, anything not done) for the handover.
  - _Requirements: 8.4, 8.5, 8.6, 8.9, 8.12_

- [x] 9. Handover
  - Write `docs/phase-7-batch-a-handover.md` with: what changed per task A1 to A7, the files touched, the results of the Verify task, the screenshots taken, the test pins updated (or a statement that none were), and anything not done. Include the owner's open items from the design: the R4.2 vs R1.6 sticky offset choice, the `world.test.ts` source-string pins, and the short-landscape sheet height result.
  - Add a short entry for this batch to `docs/kiro-usage.md`.
  - Do not commit or push. Put no secrets in either file.
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 8.11, 8.12_

- [x] 10. Fix the world screen at 667x375
  - Seen in `.debug/phase-7/short-scene-667x375.png` and `.debug/phase-7/game-world-notebook-667x375.png`: the ghost sprite draws outside the scene box over the scene buttons; the scene button row runs off the right edge ("The loft ro" is cut); the title "The Banshee" is cut at the right edge; the four tab labels ("Question", "Notebook") overflow their buttons; the hint line is cut ("Open a puzzle in the notebook to").
  - Fix ideas (implementer's choice): clip sprites and hotspots to the scene viewport; put the scene buttons in one row that scrolls sideways, or show only Previous / current / Next at short heights; at short heights show the motion toggle without its text label and keep its `aria-label`; give the tab strip the full width or use shorter labels that still fit 44 px targets.
  - Touch CSS and markup only, mainly `apps/game/src/components/scene.css`, `world.css`, `WorldTabs.tsx` and `WorldPlay.tsx`. Keep every interactive target at 44 px or larger and use logical properties.
  - Done when, at 667x375, `document.documentElement.scrollWidth <= innerWidth`, no text or sprite is cut or outside its box, and the page still has no vertical scroll.
  - Global rules: no changes to game logic, generator, content, assets or database; add no tests; no commit or push; check by screenshots only, using throwaway scripts under `.debug/phase-7/` (not in any test directory).
  - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.10, 8.1, 8.2, 8.12_

- [x] 11. Tidy the world top bar at 1280x800
  - Seen in `.debug/phase-7/game-world-notebook-1280x800.png`: the title is squeezed between the motion toggle and the rail tabs, and the scene buttons wrap to two rows.
  - Put the title right after "Back to the hall" and the motion toggle at the end of the bar. Keep the scene buttons on one row (sideways scroll if needed).
  - Done when, at 1280x800 and 768x1024, the title, toggle and scene buttons each sit on one line with clear space, and the scene image gets the height the second button row used.
  - Global rules: no changes to game logic, generator, content, assets or database; add no tests; no commit or push; check by screenshots only, using throwaway scripts under `.debug/phase-7/`.
  - _Requirements: 2.1, 2.3, 2.5, 8.1, 8.2, 8.12_

- [x] 12. Check the win and restart overlays (R3)
  - Not captured before. Use a throwaway Playwright script in `.debug/phase-7/`; put no preview flags or test-only code in the product.
  - Restart: answer puzzles wrong until fear reaches the limit. Win: solve a world with the right answers, read from the content files inside the script only (do not edit `content/`). If a world cannot be solved this way, say so and stop on that item.
  - Done when screenshots of both overlays at 390x844 and 1280x800 show the overlay fully visible, the page did not jump (scroll position unchanged), and Tab stays inside the overlay.
  - Fix any overlay defect found in the code (CSS and markup only).
  - Global rules: no changes to game logic, generator, content, assets or database; add no tests; no commit or push; check by screenshots only.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 8.1, 8.2, 8.12_

- [x] 13. Check there is no sideways scroll anywhere
  - For every screen captured in `.debug/phase-7/`, check `scrollWidth <= innerWidth` at 390x844, 667x375, 768x1024 and 1280x800, with a throwaway script under `.debug/phase-7/`.
  - Fix any overflow found. If a fix is outside Batch A, list it for the handover instead.
  - Global rules: no changes to game logic, generator, content, assets or database; add no tests; no commit or push; check by screenshots and measurements only.
  - _Requirements: 1.1, 1.4, 2.1, 8.1, 8.2, 8.12_

- [x] 14. Finish: checks, screenshots and handover fixes
  - Run once at the end: `pnpm -r typecheck` and `pnpm -r test`. Run `pnpm --filter @kiroween/atlas test:browser -- --base http://localhost:3001` only if the book was touched.
  - Take new screenshots only for screens changed in tasks 10 to 13, saved under `.debug/phase-7/`.
  - Add a short "Fixes" section to `docs/phase-7-batch-a-handover.md`: what was fixed in tasks 10 to 13, files touched, screenshots, check results, and anything not done. Note the owner answers: sticky offset stays 0; the rewritten A7 source pins are kept; the new English strings and "Threads" are accepted; "Try again" as the primary action is accepted.
  - Global rules: no changes to game logic, generator, content, assets or database; add no tests; do not commit or push; put no secrets in the docs.
  - _Requirements: 1.1, 2.1, 3.1, 8.1, 8.2, 8.4, 8.12_

## Notes

- There are no optional tasks. The A7 unit test (7.3) and the Verify task (8) are required, and no other test work is planned.
- The design has no Correctness Properties section, so there are no property-based test tasks. The existing generator property tests are not touched and run only inside `pnpm -r test` in the Verify task.
- Tasks are ordered A1 to A7, then Verify, then Handover. Tasks that touch the same file (`WorldPlay.tsx`, `scene.css`, `world.$target.tsx`, `styles.css`) sit in separate waves.
- Tasks 10 to 14 are follow-up fixes after owner review. They add no tests and make no commit or push; they are checked by screenshots only.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2"] },
    { "id": 4, "tasks": ["2.3"] },
    { "id": 5, "tasks": ["2.4"] },
    { "id": 6, "tasks": ["3.1"] },
    { "id": 7, "tasks": ["4.1"] },
    { "id": 8, "tasks": ["4.2"] },
    { "id": 9, "tasks": ["5.1"] },
    { "id": 10, "tasks": ["5.2"] },
    { "id": 11, "tasks": ["6.1"] },
    { "id": 12, "tasks": ["7.1"] },
    { "id": 13, "tasks": ["7.2"] },
    { "id": 14, "tasks": ["7.3"] },
    { "id": 15, "tasks": ["8"] },
    { "id": 16, "tasks": ["9"] },
    { "id": 17, "tasks": ["10"] },
    { "id": 18, "tasks": ["11"] },
    { "id": 19, "tasks": ["12"] },
    { "id": 20, "tasks": ["13"] },
    { "id": 21, "tasks": ["14"] }
  ]
}
```
