# Phase 7 Batch B handover

Spec: `.kiro/specs/phase-7-batch-b/`. Nothing is committed or pushed. No change to game logic, the generator, the play engine, the legend parser, `content/`, `assets/` or the database.

## Changes per task

- **B0 Win screen.** `Ending` in `apps/game/src/components/WorldPlay.tsx` no longer shows the curse/design-note text. It shows the heading, one line (`world.win.line`), the relic, score, seed, then "Back to the hall" (primary, initial focus) and a ghost link "Read the full legend" to the atlas `/legends/<id>`. Tab and Shift+Tab cycle between the two controls. New `legendId` prop; `Ending` exported. New test `apps/game/test/win-screen.test.tsx`.
- **B1 Legend page reaches the story faster.** `Book` (`skeleton/src/book/Book.tsx`) gets `controlsStart`, `controlsEnd` and `banner` slots; the toggle has its own `hidden`. New `ChaptersControl.tsx` (popover with chapters, versions, sources links) replaces the Contents list. `.legend-page` spacing tokens and tighter section gaps (`LegendPage.tsx`, `styles.css`, `book.css`).
- **B2 Atlas home shorter.** `HomeView.tsx` splits map and list (`.home-split`). From 64rem the list is a compact, independently scrolling region (`.home-list-scroll`, focusable, labelled). Below 64rem it stacks as before. `LegendList` and `WorldMap` unchanged.
- **B3 Play from the atlas.** New `PlayLink.tsx`. Quiet variant in the Book control row, primary variant after the sources. Not on the Keeper's Note page.
- **B4 Guests know which world is free.** `hall.ts`: `hallNotice(...)` and a `guest` parameter on `doorReasonKey`. Hall shows a notice, "Free for guests" and "Sign in to open" labels, and a `free` badge in `SceneViewer`. Guests who hit a locked world are redirected to `/sign-in?reason=world` (`server/functions.ts` `requireAccess`, `world.$target.tsx`), and `sign-in.tsx` validates the search and shows the reason line.
- **B5 Loading and error states.** New `skeleton/src/shell/` (`PendingView`, `ErrorView`, `./shell` export, `.state-view` CSS). Both routers set `defaultPendingMs: 200`, `defaultPendingMinMs: 300` and pending/error components. Game root route got `RootError` (owner addition to 6.2). Dock error block with Retry (`onRetryAction` prop on `WorldPlay`, `last` action ref in `world.$target.tsx`).
- **B6 Hint 2 cost and way back.** `HintArea` shows label plus cost line; `WorldPlay` passes `FEAR.hint2`. `hintHref` in `apps/game/src/lib/world.ts` adds `?hint=1` to Hint 2 URLs only. Atlas `parseHintSearch` (`apps/atlas/src/lib/hintMarker.ts`), `HintBanner.tsx` and route `validateSearch`. New test `apps/atlas/test/hint-marker.test.ts`.

## Files touched (excluding `.debug`)

`git status --porcelain` also shows Batch A work, which is still uncommitted (`.kiro/specs/phase-7-batch-a/`, `docs/phase-7-batch-a-handover.md`, and Batch A edits in shared files such as `world.css`, `scene.css`, `Book.tsx`). The lists below are what Batch B touched or created; shared files carry both batches' changes.

**New:** `apps/atlas/src/components/{ChaptersControl,HintBanner,PlayLink}.tsx`, `apps/atlas/src/lib/hintMarker.ts`, `apps/atlas/test/hint-marker.test.ts`, `apps/game/src/components/WorldTabs.tsx` and `apps/game/src/lib/useMediaQuery.ts` (confirmed Batch A files, not Batch B), `apps/game/test/win-screen.test.tsx`, `skeleton/src/shell/{ErrorView,PendingView,index}.ts(x)`, this handover.

**Modified (43 tracked files in the working tree, 996 insertions, 257 deletions):**
- Atlas src: `HomeView`, `LegendPage`, `MetaList`, `SiteHeader` (components), `i18n/en.ts`, `router.tsx`, `routes/__root.tsx`, `routes/legends.$legendId.tsx`, `styles.css`.
- Atlas script/tests: `scripts/book-check.mjs`, `test/{book-component,contents,home,legend-render}.test.tsx`.
- Game src: `Hall`, `HintArea`, `Hotspot`, `SceneViewer`, `TutorialRoom`, `WorldPlay` (components), `fear.css`, `scene.css`, `world.css`, `i18n/en.ts`, `lib/hall.ts`, `lib/world.ts`, `router.tsx`, `routes/{__root,index,sign-in,world.$target}.tsx`, `server/functions.ts`, `styles.css`.
- Game tests: `hint-area.test.tsx`, `hint-area.property.test.tsx`, `server.test.ts`, `world.test.ts`.
- Skeleton: `package.json`, `src/book/Book.tsx`, `src/book/book.css`, `src/design/ui.css`, `test/book-height.test.ts`.
- `docs/kiro-usage.md`.

## One-time check results (`.debug/phase-7b/verify-results.md`)

**First run**
- `pnpm -r typecheck`: pass.
- `pnpm -r test`: failed. Skeleton 915 pass (+8 expected fail); atlas 29 failed / 276 passed; game 7 failed / 394 passed (run on its own because `pnpm -r` stopped at atlas). All were old-layout or old-copy pins (below).
- Browser check: 7 failures, all `ink and paper contrast >= 4.5`. The script read the first `.book a`, which is now a Chapters-panel link on a dark panel. Script pin, not a contrast fault.
- One layout fault fixed: at 390x844 the Chapters control was below the fold (bottom 887 px). Below 40rem the Scare level and Reading time facts now share one row; Chapters spans y 775 to 819.

**Fix pass (B6 banner, B1 one-page height, B2 home list)**
- Typecheck: pass.
- Tests: one failure, `skeleton/test/scale-tokens.test.ts` (literal `font-size: 0.875rem` in `.hint-banner`), fixed with `var(--type-small)`. Final: skeleton 69 files / 915 (+8 expected fail), atlas 30 / 305, game 43 / 401.
- Browser check: 303 passed, 0 failed, 2 skipped (Slow 4G, Arabic flag off). Output `.debug/phase-7b/book-check.json`.

**Measurements**
- `scrollWidth <= innerWidth`: 96 of 96 snapshots, four sizes.
- Banshee one-page at 1280x800: 21029 px first run, 20117 px after the fix. 768x1024: 21275. 667x375: 21519. 390x844: 30467.
- First Book line at 1280x800: top 557 px, on screen 1.
- Atlas home 1280x800: 1.81 screens (limit 2.5). Rows 150 px to 70 px, 6 legends visible before the list scrolls (was about 3), 12 in total.
- Win screen: dialog, no inner scroll, no slot/version ids, 0 asterisks, focus starts on "Back to the hall", focus stays inside (6 of 6 Tab checks), Read link goes to `/legends/banshee`.
- Hint buttons at 390: Hint 1 113x44, Hint 2 166x44, one row.
- Dock error at 390x844: alert y 502 to 578, Retry 534 to 578 (first screen). Retry recovers once the block is lifted.
- Hint banner (`?hint=1#banshee--ch-2`) after the fix: top 0, height 52, button 44 px, at all four sizes.
- B5 (fetch-blocked client navigation): account, world, atlas legend and root `getShell` all show pending, then error with Retry, and Retry recovers. Not-found pages stay in the shell.

## Screenshots

In `.debug/phase-7b/`, 88 PNGs named `<screen>-<w>x<h>.png`, each at 390x844, 667x375, 768x1024 and 1280x800. Screens: atlas-home, atlas-legend-book, atlas-legend-chapters-open, atlas-legend-onepage, atlas-hint-banner (re-taken after the fix), atlas-legend-pending, atlas-legend-error, atlas-404, game-win-overlay, game-hall-guest-new, game-hall-guest-after-tutorial, game-signin-reason, game-hint-area, game-dock-error, game-account-pending, game-account-error, game-tutorial-pending, game-tutorial-error, game-world-pending, game-world-error, game-root-error, game-notfound. The folder also holds the result JSON files and probe scripts.

## Updated test pins (confirmed from verify-results.md)

| File | Change |
| --- | --- |
| `apps/atlas/test/book-component.test.tsx` | Toggle regex allows `hidden=""` before `aria-pressed`. |
| `apps/atlas/test/contents.test.tsx` | Nav selector now `aria-label="Contents"` (Chapters popover nav). |
| `apps/atlas/test/legend-render.test.tsx` | External-link checks skip internal `/game/world/<id>` Play links. |
| `apps/game/test/hint-area.test.tsx` | Button regexes match the label span plus cost span. |
| `apps/game/test/world.test.ts` | Hint 1 pending regex, Hint 2 link `...banshee?hint=1#banshee--ch-2`, five-puzzle regexes, ending test asserts curse text absent. |
| `apps/game/test/server.test.ts` | `canEnter` redirect regex allows the block form and `search: { reason: 'world' }`. |
| `apps/atlas/scripts/book-check.mjs` | Selector `.book a:not(.contents-link):not(.btn)`. |

No game-rule test was removed or weakened. `home.test.tsx` and `hint-area.property.test.tsx` also show as modified in git; verify-results.md says they needed no change in this batch (earlier edits).

## New English strings for owner review

Game (`apps/game/src/i18n/en.ts`):
- `world.win.line`: "The archive is quieter tonight."
- `world.win.read`: "Read the full legend"
- `hall.study.line`: "Start in the study to open the doors"
- `hall.guest.line`: "{title} is free for guests. Sign in to open the other worlds."
- `hub.door.reason.free`: "Free for guests"
- `signIn.reason`: "Guests can play the tutorial and one world. Sign in to open this one."
- `loading.page`: "Opening the archive…"
- `error.view.title`: "This page could not be loaded"
- `error.view.body`: "Something went wrong while loading it. Please try again in a moment."
- `error.view.retry`: "Try again"
- `hint.1`: "Hint 1" (was "Hint 1 (free)")
- `hint.2`: "Hint 2" (was "Hint 2 (raises fear): opens the atlas")
- `hint.cost.free`: "Free"
- `hint.cost.fear`: "Adds {n} fear"
- `hint.cost.raises`: "Raises fear"
- Removed: `hall.guest`.

Atlas (`apps/atlas/src/i18n/en.ts`):
- `legend.chapters`: "Chapters"
- `legend.play`: "Play this legend"
- `home.listRegion`: "List of legends, grouped by continent. Scrolls on its own."
- `hint.banner.text`: "You came here for a hint."
- `hint.banner.back`: "Back to your game"
- `hint.banner.closeFailed`: "You can close this tab to go back to your game."
- `error.retry`: "Try again"
- Existing, now shown by the shared views: `loading.page` "Turning the pages by candlelight…", `error.title` "The atlas could not be read", `error.home` "Back to every legend".

## Decisions taken from design fallbacks

- **MetaList:** below 40rem, Scare level and Reading time share one row, so Chapters stays above the fold at 390x844.
- **Hint 2 cost:** "Adds 6 fear" comes from `FEAR.hint2`; the tutorial passes `FEAR.tutorialHint2`.
- **Hint banner button:** it closes the tab because `window.opener` is cut; if that fails, the `closeFailed` line shows.
- **Hint banner is sticky** (52 px, `--hint-banner-h`), and the Book control row sticks under it, so it stays visible after the anchor jump.
- **`onRetryAction`** is an optional prop on `WorldPlay`.
- **`reset()` guard:** TanStack passes `undefined` for loader errors, so `reset()` is called only when present.
- **Home compact rows** sit in `@layer utilities` (the earlier `components` layer lost to `.panel` and Tailwind utilities).
- **Banshee one-page:** spacing-only change (section gaps, card padding, paragraph spacing); no content or type scale change.

## Not done or open

- Signed-in Hall screenshot: no test credentials. Covered only by the `hallNotice` unit tests.
- RTL and Chapters popover keyboard checks were not run in a browser.
- The tutorial route has no loader, so it shows its own start error, not the route pending view.
- Banshee one-page is 20117 px at 1280 (under 22000, not the 20000 stretch aim); 21275 at 768 and 21519 at 667.
- B5 direct page loads cannot be network-blocked from the browser; checked through client navigation.
- `RootError` renders a minimal document without the site header.
- Win line stays "The archive is quieter tonight." for now (owner decision).
- Atlas home 1280: all 12 legends are in the list region, but only about 6 are visible before it scrolls. A strict "all 12 visible" reading fails.
- Nothing committed or pushed.

## Fixes

- **10 Atlas home.** Cause: bare `1fr` grid tracks could not shrink below their content, and the map's 960px minimum width made it pan and clip an edge pin. Fix: `minmax(0,1fr)` tracks, `min-inline-size: 0`, the map fits its column from 48rem with half-pin padding, the swipe hint is hidden from 48rem, and the map no longer pans from 48rem. Below 48rem it still pans. File: `apps/atlas/src/styles.css`.
- **11 Legend control row.** The quiet `PlayLink` gets class `play-link-quiet` and is hidden below 40rem. The row is `nowrap` and compacted in CSS (smaller type, tighter padding, ellipsis on labels). At 360px "Chapters" and "Read as one page" truncate slightly. The block sits unlayered at the end of `styles.css` because layered rules lost to `book.css` and `.btn`. Files: `PlayLink.tsx`, `styles.css`.
- **12 Tutorial Hint 2.** `tutorialHint2Href` adds `?hint=1`. Pins updated in `apps/game/test/tutorial.test.ts` (the helper assertions, and the rendered `href` assertion in the "new-tab link" test).
- **13 Sign-in redirect.** The `sign-in-required` PlayError redirect in `apps/game/src/server/functions.ts` now passes `search: { reason: 'world' }`.

### Check results

- `pnpm -r typecheck`: pass.
- `pnpm -r test`: skeleton 69 files / 915 passed (+8 expected fail); atlas 30 files / 305 passed; game 2 failures on the first run, both old pins (below). After the pins, the two files pass (36 tests); game total is 401 tests, 43 files.
- Browser check at 390x844, 667x375, 768x1024, 1280x800: `scrollWidth <= innerWidth` on all 12 snapshots. At 390 the control row is one line with and without `?hint=1`. At 1280 and 768 the home cards show borders and ellipsis and no pin is cut.
- Screenshots in `.debug/phase-7b/`: `fix-atlas-home-<w>x<h>.png`, `fix-legend-<w>x<h>.png`, `fix-legend-hint-<w>x<h>.png` (12 files), made by `fix-shots.mjs`.
- Pins updated: `apps/game/test/tutorial.test.ts` (Hint 2 link now `...keepers-note?hint=1#keepers-note--ch-1`), `apps/game/test/server.test.ts` (redirect regex now expects `search: { reason: 'world' }`). No game-rule test weakened.
