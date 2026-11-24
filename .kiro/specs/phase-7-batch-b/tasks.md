# Implementation Plan: Phase 7 Batch B

## Overview

Implementation language is TypeScript (React, TanStack Start, Tailwind), as in the design. Tasks follow the order B0, B1, B2, B3, B4, B5, B6, then one Verify task, then one handover task.

Rules for every task:
- Do not touch game logic, the puzzle generator, the play engine, the legend parser, legend content, `content/`, `assets/` or the database. If a change would, stop and report (Requirement 8.9).
- Run `pnpm -r typecheck` only after a change to TypeScript types or props, as marked below. Do not run the test suites during B0 to B6.
- Add no tests except the B0 win-screen unit test (1.2) and the B6 URL marker parser unit test (7.4).
- All new UI strings go in the translation catalog (English `en.ts`). Use logical CSS properties only, 44px touch targets, and respect reduced motion.
- Do not commit or push. Leave all changes in the working tree.

## Tasks

- [x] 1. B0: Win screen without design notes
  - [x] 1.1 Rework `Ending` in `apps/game/src/components/WorldPlay.tsx`
    - Delete the `ended.curseText` paragraph. Leave `PlayView.ended.curseText`, the engine and the parser unchanged.
    - Render the heading, one catalog line (`world.win.line`), the relic figure, the score, the seed, then an actions row.
    - Make "Back to the hall" `btn btn-primary` with initial keyboard focus. Add a quiet `btn btn-ghost` link "Read the full legend" (`world.win.read`) to the atlas `/legends/<legend-id>`, built from `mediaBase` and `legendUrl`. Pass a new `legendId` prop from `WorldPlay`.
    - Make the Tab and Shift+Tab trap cycle between the two controls. Leave `dialogKeyAction` unchanged.
    - Export `Ending` for the unit test. Add `world.win.line` and `world.win.read` to the game `en.ts`.
    - If the relic overflows at 390x844, add `max-block-size: 30dvh` on `.world-ending .world-relic img` (CSS only).
    - Run `pnpm -r typecheck` (new prop and export).
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [x] 1.2 Write the win-screen unit test
    - Create `apps/game/test/win-screen.test.tsx`, mocking `useT` as `hint-area.test.tsx` does.
    - Render `Ending` with `ended.curseText` set to a marker string such as `'DESIGN NOTE slot-3 *x*'`. Assert the output does not contain it, and does contain the heading, the catalog line, the score, the seed and a link to `/legends/<id>`.
    - This is the only B0 test.
    - _Requirements: 1.9_

- [x] 2. B1: Legend page reaches the story faster
  - [x] 2.1 Add control-row slots to `Book` in `skeleton/src/book/Book.tsx`
    - Add optional `controlsStart`, `controlsEnd` and `banner` (`ReactNode`) props. Render order in the row: `controlsStart`, previous, indicator, next, toggle, `controlsEnd`. Render `banner` above the row inside the Book.
    - Hide the whole row only when it has no slot content and `!supported || single`. Give the toggle its own `hidden={!supported || single}`. Keep `KeepersNotePage` behaviour unchanged.
    - Run `pnpm -r typecheck` (new props).
    - _Requirements: 2.1, 2.3_

  - [x] 2.2 Replace the Contents list with `ChaptersControl` on the legend page
    - Create `apps/atlas/src/components/ChaptersControl.tsx`: a `btn btn-secondary` button with `popoverTarget` and a `popover="auto"` panel holding a `<nav>` with the chapters, versions and sources links (44px rows). Close the panel on link click with `hidePopover()`.
    - Remove `Contents` from `LegendPage.tsx` and pass `ChaptersControl` as `controlsStart` to `Book`.
    - Add the `.legend-page` class and `--legend-gap: var(--space-6)` in `apps/atlas/src/styles.css`. Use it for the page-level section gaps. Change the inter-section gap inside the Book to `var(--space-7)`.
    - Style the panel with logical properties only, so it mirrors in RTL. Add the catalog keys `legend.chapters` and `legend.contents` if missing.
    - Run `pnpm -r typecheck` (new component props).
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 3. B2: Atlas home is shorter
  - [x] 3.1 Split the Home view into map and list columns
    - In `apps/atlas/src/components/HomeView.tsx`, wrap the map and list sections in `.home-split`. Keep `id="legends"` on the list section. Wrap `LegendList` in `.home-list-scroll` with `tabIndex={0}`, `role="region"` and an `aria-label` from a new `home.listRegion` key.
    - In `apps/atlas/src/styles.css`, stack the sections below 64rem with spacing tokens. From 64rem use a grid of `minmax(0, 2fr) minmax(0, 1fr)`, an independently scrolling list (`max-block-size` from `100dvh` minus the header height, `overflow-y: auto`, `overscroll-behavior: contain`) and compact rows (one column, hidden card image and hook line, 44px minimum row height).
    - Leave `LegendList` and `WorldMap` unchanged.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. B3: Play this legend from the atlas
  - [x] 4.1 Add `PlayLink` and place it on the legend page
    - Create `apps/atlas/src/components/PlayLink.tsx`: a plain `<a href="/game/world/<legendId>">` with `variant` `quiet` (`btn-ghost`) or `primary` (`btn-primary`), label from the new `legend.play` key ("Play this legend").
    - Use the quiet variant as `controlsEnd` of the Book control row. Use the primary variant in a closing section after the sources, at the end of the Book. Do not add it to the Keeper's Note page.
    - Run `pnpm -r typecheck` (new component props).
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [x] 5. B4: Guests know which world is free
  - [x] 5.1 Hall notice and door labels
    - In `apps/game/src/lib/hall.ts`, add the pure `hallNotice(signedIn, tutorialDone, doors)` and the `guest` parameter of `doorReasonKey` (returns `hub.door.reason.free` for an open door when `guest`). Leave `canEnter` and the access rules unchanged.
    - In `apps/game/src/routes/index.tsx`, render the notice under the Hall heading: the study line, or the guest line with a "Sign in" button (44px), or nothing when signed in. Remove the old `hall.guest` line and key.
    - Add an optional `guest` prop to `HallView`. Show "Free for guests" on the free door and "Sign in to open" on locked doors, as visible text in the door panel and in the hotspot label. Add the `'free'` badge value to `SceneViewer` with one CSS rule next to the existing badges.
    - Add the catalog keys `hall.study.line`, `hall.guest.line` and `hub.door.reason.free`.
    - Run `pnpm -r typecheck` (changed types and props).
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7, 5.8_

  - [x] 5.2 Redirect guests with a reason and show the sign-in line
    - In `apps/game/src/server/functions.ts`, `requireAccess`: for a guest redirect to `/sign-in` with `search: { reason: 'world' }`. Change only the redirect target and search.
    - In `apps/game/src/routes/world.$target.tsx`, `run`: navigate to `/sign-in` with `search: { reason: 'world' }` in the redirect branch.
    - In `apps/game/src/routes/sign-in.tsx`, add `validateSearch` that accepts only `reason: 'world'`, and render `<p role="note">` with `signIn.reason` above the form when it is set. Add that key to `en.ts`. Do not hand-edit `routeTree.gen.ts`.
    - Run `pnpm -r typecheck` (changed route search types).
    - _Requirements: 4.4, 5.5, 5.6, 5.7, 5.8_

- [x] 6. B5: Loading and error states
  - [x] 6.1 Shared `PendingView` and `ErrorView` in the skeleton
    - Create `skeleton/src/shell/PendingView.tsx`, `ErrorView.tsx` and `index.ts`. All text is a prop. `ErrorView` takes `title`, `body`, `retryLabel`, `onRetry` and a `home` node. Never show `error.message`.
    - Add the `./shell` export to `skeleton/package.json`.
    - Add `.state-view`, `.state-view-mark` and `@keyframes state-pulse` to `skeleton/src/design/ui.css`, with logical properties and the existing reduced-motion override.
    - Run `pnpm -r typecheck` (new exports and props).
    - _Requirements: 6.1, 6.4, 6.10_

  - [x] 6.2 Router defaults in both apps
    - In `apps/atlas/src/router.tsx` and `apps/game/src/router.tsx`, set `defaultPendingMs: 200`, `defaultPendingMinMs: 300`, `defaultPendingComponent` and `defaultErrorComponent`. Each app has small wrappers that read text with `translate('en', key)` (not `useT`).
    - The error wrapper's Retry calls `reset()` and `router.invalidate()`. Confirm the behaviour in the installed `@tanstack/react-router` version. The home link uses the app's own `Link`.
    - Move the atlas local `Pending` into its wrapper. Keep the atlas root `errorComponent` as the fallback for a root failure. Leave both not-found views unchanged.
    - Add game keys `loading.page`, `error.view.title`, `error.view.body`, `error.view.retry` and atlas key `error.retry`.
    - Give the game root route `apps/game/src/routes/__root.tsx` (it has a loader and no `errorComponent`) an `errorComponent` (`RootError`) that uses the shared skeleton `ErrorView`, with Retry (`reset()` then `router.invalidate()`) and a home link, so a failed root load does not show the router's built-in page. It must render without the loader data: no `Route.useLoaderData()`, no `useT()`. Text comes from `translate('en', key)` with the same `error.view.*` and `notFound.hall` keys. Use the minimal document described in the design.
    - Run `pnpm -r typecheck` (new wrapper props and the `RootError` component).
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.8, 6.9, 6.10_

  - [x] 6.3 Dock error with Retry
    - In `apps/game/src/routes/world.$target.tsx`, keep a `last` ref holding the last action. `act` sets it before the call. `onHint2` sets it to call `onHint2(slotId)` again, so a retry opens a new tab inside the click. Pass `onRetryAction` to `WorldPlay`.
    - In `WorldPlay.tsx`, replace the bare error paragraph with a `.scene-error` block holding the error text and a Retry button (`play.retry`). Keep `StartRetry` for a failed first start.
    - In the scene CSS, make `.scene-dock > .scene-error` first in the dock (`order: 0`, full width, wrapping) so it is on the first screen at 390x844 and at the top of the scrolling dock at 667x375. Add no client-side deduplication and change no server code.
    - Run `pnpm -r typecheck` (new prop).
    - _Requirements: 6.6, 6.7_

- [x] 7. B6: Hint 2 shows its cost and a way back
  - [x] 7.1 Hint labels with a cost line
    - In `apps/game/src/components/HintArea.tsx`, add the optional `fear` prop. Show "Hint 1" with a muted "Free" line, and "Hint 2" with a muted "Adds {n} fear" line (number formatted with `Intl.NumberFormat`), or "Raises fear" when `fear` is undefined. Keep the aria-label keys and wording unchanged.
    - Pass `FEAR.hint2` from `@kiroween/skeleton/client` in `WorldPlay`. Do not redefine the amount.
    - Update the catalog: `hint.1` is "Hint 1", `hint.2` is "Hint 2". Add `hint.cost.free`, `hint.cost.fear` and `hint.cost.raises`.
    - In `scene.css`, make each hint button one row (`inline-flex`, `white-space: nowrap`), keep `flex-wrap` on `.hint-buttons`, and style `.hint-cost` small and muted.
    - Run `pnpm -r typecheck` (new prop).
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 7.2 Add the hint marker to Hint 2 URLs
    - In `apps/game/src/lib/world.ts`, add `hintHref(origin, anchor)` that calls `atlasHref` and inserts `?hint=1` before the `#`. Return null when `atlasHref` returns null.
    - Use it for Hint 2 only: `hint2Href` in `WorldPlay` and `hrefOf` in `world.$target.tsx` `onHint2`. Grep `atlasHref(` and list every call. Keep plain `atlasHref` for the dead-end proof links. Change the tutorial Hint 2 path the same way if it shares the helper.
    - Run `pnpm -r typecheck` (new helper).
    - _Requirements: 7.7_

  - [x] 7.3 Hint banner on the atlas chapter
    - Create `apps/atlas/src/lib/hintMarker.ts` with the pure `parseHintSearch(search)` returning `{ hint: 1 }` for `1` or `'1'`, else `{}`.
    - In `routes/legends.$legendId.tsx`, add `validateSearch: parseHintSearch`, read `Route.useSearch().hint`, and pass `showHintBanner` to `LegendPage`, which passes the banner to `Book` through the `banner` slot.
    - Create `apps/atlas/src/components/HintBanner.tsx`: a slim `role="note"` bar with the text and a "Back to your game" button. The button tries `window.opener?.focus()` and otherwise calls `window.close()`. Keep the existing chapter highlight.
    - Add the catalog keys `hint.banner.text` ("You came here for a hint.") and `hint.banner.back` ("Back to your game"). Style the bar with logical properties and 44px targets.
    - Run `pnpm -r typecheck` (new route search type and props).
    - _Requirements: 7.8, 7.9, 7.10_

  - [x] 7.4 Write the URL marker parser unit test
    - Create `apps/atlas/test/hint-marker.test.ts` for `parseHintSearch`: accepts `1` and `'1'`, rejects missing, `0`, other strings and other types.
    - This is the only B6 test.
    - _Requirements: 7.11_

- [x] 8. Verify
  - Run each of these once, in this order, and record the results:
    - `pnpm -r typecheck`
    - `pnpm -r test`
    - `pnpm --filter @kiroween/atlas test:browser -- --base http://localhost:3001 --out .debug/phase-7b/book-check.json`
  - Reuse the Batch A scripts in `.debug/phase-7/`. Save one screenshot per changed screen (win screen, legend page, atlas home, Hall as guest and as signed in, sign-in with reason, Hint area, dock error, pending and error views) at 390x844, 667x375, 768x1024 and 1280x800 under `.debug/phase-7b/`. On each, check `scrollWidth <= innerWidth`.
  - Also check: Banshee one-page height below 22000px; legend page first Book line within one scroll at 1280x800; title and Chapters control on the first screen at 390x844; atlas home at 1280x800 about 2.5 screens or less with all 12 legends in the first two screens; Banshee win screen shows no slot or version identifiers or asterisks and fits without inner scroll at 390x844 and 1280x800.
  - Check B5 by blocking the network in the browser: each game route and the account page show a pending state, then an in-shell error with Retry; the atlas legend page does the same. Check that not-found stays inside the shell in both apps.
  - Also block the game root loader request (`getShell`) and confirm the root error view shows the `ErrorView` in the minimal document with Retry and the home link, as in the design.
  - Fix failures. Update a test only when it pinned the old layout or old copy (for example the old hint labels or the old `hall.guest` line), and keep a list of each updated pin. Do not weaken or remove any test that covers game rules. If a failure needs a game-logic, generator, engine, content or database change, stop and report.
  - Run `pnpm -r typecheck` and `pnpm -r test` again only if a fix was made.
  - _Requirements: 8.3, 8.4, 8.5, 8.6, 8.9, 8.10, 8.11, 1.6, 1.7, 2.6, 2.7, 2.8, 3.4, 3.5, 6.5, 6.7, 6.9_

- [x] 9. Handover and Kiro usage entry
  - Write `docs/phase-7-batch-b-handover.md` with: per-task changes B0 to B6; files touched; results of the three checks; screenshots saved under `.debug/phase-7b/`; the list of updated test pins; all new English strings for owner review (including `world.win.line`); decisions taken from the design fallbacks; and anything not done.
  - Add a short entry for this batch to `docs/kiro-usage.md`.
  - Do not commit or push.
  - _Requirements: 8.7, 8.8, 8.10_

- [x] 10. Fix atlas home desktop clipping
  - At 1280x800 (`.debug/phase-7b/atlas-home-1280x800.png`) the list cards in `.home-list-scroll` are cut on the right (no right border, region line cut with no ellipsis), and a map pin is cut at the map's right edge. Fix in `apps/atlas` CSS (`styles.css`), within the compact-row block and the map column. `LegendList` and `WorldMap` components stay unchanged unless strictly necessary.
  - Done when: cards show both borders with an ellipsis on long lines, and no pin is cut at 1280x800 and 768x1024.
  - _Requirements: 3.1, 3.3_

- [x] 11. Book control row on one line below 40rem
  - Below 40rem, hide the quiet "Play this legend" (`PlayLink` quiet variant in the Book control row). The primary one at the end of the book stays. Keep the row on one line (no wrap) below 40rem, with and without the sticky hint banner.
  - Done when: at 390x844 the row is one line, with and without the banner.
  - _Requirements: 2.1, 4.1, 7.8_

- [x] 12. Hint marker on tutorial Hint 2
  - Add the `?hint=1` marker to `tutorialHint2Href` in `apps/game/src/lib/tutorial.ts` (inserted before `#`, same shape as `hintHref`). Update the one URL pin in `apps/game/test/tutorial.test.ts`. This adds no new test. Run `pnpm -r typecheck` only if types change.
  - _Requirements: 7.7_

- [x] 13. Reason on the sign-in-required redirect, then finish
  - In `apps/game/src/server/functions.ts`, the PlayError `sign-in-required` redirect: add `search: { reason: 'world' }` like the other guest redirect. Change only the redirect.
  - Finish (once, after 10-13): run `pnpm -r typecheck` and `pnpm -r test` once. Take new screenshots only for 10 (atlas home) and 11 (legend page with and without `?hint=1`) at 390x844, 667x375, 768x1024 and 1280x800 under `.debug/phase-7b/`, with `scrollWidth <= innerWidth`. Add a short "Fixes" section to `docs/phase-7-batch-b-handover.md` (tasks 10-13, files, check results, screenshots, pins updated). The win line stays "The archive is quieter tonight." `WorldTabs.tsx` and `useMediaQuery.ts` are confirmed Batch A files; update the handover's note.
  - Do not commit or push.
  - _Requirements: 4.4, 5.5, 8.7_

## Notes

- Tasks 1.2 and 7.4 are the only test tasks. They are not marked optional because the requirements call for them.
- Each task references the requirement clauses it covers.
- The Verify task is the only place the test suites and the browser check run.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2"] },
    { "id": 4, "tasks": ["3.1"] },
    { "id": 5, "tasks": ["4.1"] },
    { "id": 6, "tasks": ["5.1"] },
    { "id": 7, "tasks": ["5.2"] },
    { "id": 8, "tasks": ["6.1"] },
    { "id": 9, "tasks": ["6.2"] },
    { "id": 10, "tasks": ["6.3"] },
    { "id": 11, "tasks": ["7.1"] },
    { "id": 12, "tasks": ["7.2"] },
    { "id": 13, "tasks": ["7.3"] },
    { "id": 14, "tasks": ["7.4"] },
    { "id": 15, "tasks": ["8"] },
    { "id": 16, "tasks": ["9"] },
    { "id": 17, "tasks": ["10"] },
    { "id": 18, "tasks": ["11"] },
    { "id": 19, "tasks": ["12"] },
    { "id": 20, "tasks": ["13"] }
  ]
}
```
