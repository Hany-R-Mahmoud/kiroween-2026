# Implementation Plan: ui-rework (Phase 6)

## Overview

This plan reworks the UI of the atlas and the game in the order the Owner set: shared UI layer, paper context and contrast, atlas home and map, Hall and scenes, a mid-phase status note (no wait), P2 items 11 to 22, optional P3 items, checks and mutations, all finished locally so one push carries everything, a stop for the Owner's push (task 9.1), production checks, then the Kiro usage entry, handover and a final stop (task 10.4). Those two are the only stops in the run.

Language: TypeScript (strict), CSS, Vitest, fast-check. The design uses TypeScript, so no language question applies.

### Working rules (apply to every task)

- Restart rule: if context is summarised or the run restarts, read `docs/phase-6-notes/progress.md` and this `tasks.md` first, then continue from the next unchecked task without asking anyone.
- Progress file: after every task, update `docs/phase-6-notes/progress.md` with the last task done, the next task, the blocked tasks and the open decisions (Req 42).
- Owner feedback: the Owner may write requests in `docs/phase-6-notes/owner-feedback.md` at any time. The run never waits for it. At every checkpoint task (1.10, 2.7, 3.9, 4.10, 6.17, 7.6, 8.8) read the file. For each item not marked done: record it in the Decisions_File before acting, add it as a task numbered `<group>.F<n>` right after the current group (and as its own wave in the Task Dependency Graph), run it, and mark the item "done in task <id>" in the file (Req 5.4, 5.5).
- Tasks run one at a time, in the order listed, in one thread. At most one sub-agent runs at a time.
- Neither the executor nor any sub-agent asks the Owner a question during the run. They follow this spec and the design, choose the smallest option that meets the criteria (this also applies to any step that says "ask"), record the choice with the options considered in `docs/phase-6-notes/decisions.md` (Decisions_File), and continue (Req 38.1 to 38.3). If the spec conflicts with a steering file, the steering file wins and the conflict is recorded (Req 38.5).
- Git is read-only: `status`, `diff`, `log` only. No commit, push, reset or branch change (Req 9.5, 38.4).
- No edits under `content/` or `assets/`. No new image, font, dependency or `vercel.json` change (Req 2, 3, 8).
- No secret is read, printed or written; no `.env` is opened (Req 9.1).
- No foreground dev server. The Owner or a background process runs atlas on port 3001 and game on port 3000 (Req 36.8).
- Screenshots go to `.debug/phase-6/` only, named `<item>-<width>-<before|after>.png` (Req 9.4, 36.6). Notes go only under `docs/phase-6-notes/` (Req 41.1).
- A test that still fails after two real attempts: mark the task blocked, record the test, both attempts and the error in the Decisions_File, then continue with the next task that does not depend on it (Req 34.4). The number of blocked tasks never stops the run. Stop only if every remaining unchecked task depends on a blocked one, and then write the status and report (Req 34.5).
- The only stops in the run are task 9.1 (Owner push) and task 10.4 (handover). Task 5 writes a status note and continues.
- "Checkpoint" means `pnpm -r test` green, typecheck clean, no secret finding, then the Owner feedback read and progress file update described above. A red checkpoint is handled by the blocked-task rule, not by asking.
- Old class names stay beside new ones; pinned tests are not weakened (Req 6). `world.test.ts` and `hall.test.ts` change only in the task that changes their behaviour, with before/after case counts recorded (Req 6.7).
- Skills per group are listed in each group. Use `impeccable` before and after each screen change (take the before screenshot first), `read-the-damn-docs` for platform behaviour (cascade layers, popover, `window.open`, `aria-current`), `ponytail` for the smallest change, `agent-tester` for tests and browser checks, `agent-guard` for the guard pass at the end of each group, `verify-and-stop` for the final check.
- Test sub-tasks are not starred in this plan, because Req 33 and 35 make them mandatory. Only P3 sub-tasks carry the `*` mark.

## Tasks

- [x] 1. Group 1: shared UI layer, tokens, layer order and layer move (fix list items 1, 2)
  - Skills: `impeccable` (before/after), `read-the-damn-docs` (cascade layers before `@import`), `ponytail`, `agent-tester`, `agent-guard`.
  - [x] 1.1 Create the notes folder and take the baselines before any change
    - Create `docs/phase-6-notes/decisions.md` with the five conflicts of the requirements Introduction, the "steering wins" rule, the map choice (remove Painted_Strip, keep `WorldMap`) and the header-menu approval.
    - Create `docs/phase-6-notes/owner-feedback.md` with the heading `# Owner feedback` and the line `No feedback yet`, and `docs/phase-6-notes/progress.md` with the headings Last task done, Next task, Blocked tasks, Open decisions (all "none" at start).
    - Create `docs/phase-6-notes/mutations.md`, `docs/phase-6-notes/browser-checks.md` and `docs/phase-6-notes/content-and-assets-needed.md` (content "none needed" for now; the Banshee seam entry is added only if task 7.4 runs).
    - Save the "before" screenshots for P1 items 1 to 10 at 390x844 and 1280x800 in `.debug/phase-6/` (current code).
    - Measure the atlas home on Slow 4G (1.6 Mbps down, 750 kbps up, 150 ms RTT, 4x CPU, cache off, 390 px, median of three) on a local production build, before any change. Record it as the "before" row in `browser-checks.md`. Task 3.7 repeats it for the "after" row.
    - _Requirements: 2.2, 4.3, 5.4, 9.4, 15.12, 36.6, 36.9, 41.1, 41.2, 42.1_

  - [x] 1.2 Add the new tokens to `skeleton/src/design/tokens.css`
    - Add, inside the existing `@theme` block and below the base palette: `--color-surface-raised`, `--color-rule`, `--color-ember`, `--space-1..8`, `--type-*` scale, `--radius-ui: 4px`, the three warm shadows, `--target`, `--app-header-h`.
    - Change no base value (`apps/game/test/theme.test.ts` and `skeleton/src/theme/hub.ts` stay green).
    - _Requirements: 4.4, 4.5, 3.2_

  - [x] 1.3 Create `skeleton/src/design/ui.css`
    - Inside `@layer ui`: `.btn` with `-primary`, `-secondary`, `-ghost`, `-icon`, the dashed disabled state, `aria-pressed` style; `.link`; `.nav-item` with `aria-current` bar; `.panel`, `.panel-raised`; `.field`.
    - In `@layer base`: the single `:focus-visible` ring (3 px, 3 px offset, `var(--color-ring, var(--color-glow))`).
    - The `--motion` switch for `prefers-reduced-motion` and `html[data-motion='reduce']`, plus the universal `animation: none` blocks. Transitions use `calc(var(--motion) * Nms)`.
    - Logical properties only, no hex, no `var(--x, #hex)`. Read-the-docs check of `@layer` before `@import` first.
    - _Requirements: 10.1, 10.3, 10.4, 10.5, 10.6, 10.8, 7.1, 7.5, 7.6, 7.7, 11.2, 11.6_

  - [x] 1.4 Wire `ui.css` into both apps and remove the duplicate focus rules
    - In `apps/atlas/src/styles.css` and `apps/game/src/styles.css`: first line `@layer theme, base, components, ui, utilities;`, then the imports, with `ui.css` imported once.
    - Delete the separate focus outlines (`apps/atlas/src/styles.css` 2 px rule, `scene.css`, `world.css`, `world-button:focus-visible`, `hall-panel:focus-visible`, the `book.css` controls outline, Tailwind `focus-visible:outline-*` strings). Leave `:target` and `[data-landed]` outlines.
    - _Requirements: 10.2, 10.6_

  - [x] 1.5 Remove the global atlas `a` rule and give every atlas link a class
    - Delete the `a` and `a:hover` rules in `apps/atlas/src/styles.css`.
    - Add `.link` to links in running text (`StoryText`/`InlineText`, Sources titles, `ErrorPage`, `NotFound`) and `.nav-item` to the footer link and the existing header links. Do not change hrefs.
    - Wrap nothing else; the header, cards and contents are reworked in later tasks.
    - _Requirements: 11.1, 11.2, 11.3, 11.6_

  - [x] 1.6 Move `scene.css` and `world.css` into `@layer components` with before/after screenshots
    - First take the "before" screenshots of the Hall, the tutorial and Banshee scene 1 at 390 px and 1280 px into `.debug/phase-6/` (names carry `layer-move` and `before`).
    - Wrap both files in `@layer components`; move the `.hub-theme a, .world-theme a` rule in `apps/game/src/styles/theme.css` into `@layer base`. Do not wrap `book.css`; keep the `.book-paper` block plain.
    - Delete the colour, border and radius lines of `.scene-button` and `.world-button` that `.btn` now supplies; keep layout lines.
    - Take the "after" screenshots, compare, and record every visible difference in the Decisions_File as accepted (with reason) or fixed. If none, record "no visible change".
    - Re-run `apps/game/test/theme.test.ts`.
    - _Requirements: 6.5, 36.9, 10.2_

  - [x] 1.7 Add Button_Class beside the old classes
    - `SceneNav.tsx`, `TutorialRoom.tsx`, `Hall.tsx`: `scene-button btn btn-secondary`; `WorldPlay.tsx`: `world-button btn btn-secondary` and `world-button world-option btn btn-secondary`; `Book.tsx` controls: `btn btn-secondary` (previous and next also `btn-icon`); `Field.tsx` buttons: `btn btn-primary`.
    - Keep old class names and their order; direction icons get `icon-dir`.
    - Map pin card actions are done in task 3.5.
    - _Requirements: 10.7, 6.1, 6.2, 7.4_

  - [x] 1.8 Write the UI layer tests
    - `skeleton/test/ui-layer.test.ts`: `ui.css` defines `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.link`, `.nav-item`, `.panel` (removing one fails); no hex, no hex fallback; no physical-direction property; one `--motion` switch under both conditions; no other stylesheet declares `outline` inside `:focus-visible`; no `focus-visible:outline-*` string in `apps/*/src`.
    - `apps/atlas/test/ui-import.test.ts` and `apps/game/test/ui-import.test.ts`: `ui.css` imported once, `@layer` order line first.
    - `apps/atlas/test/link-rule.test.ts`: no bare `a` selector that sets colour or underline.
    - Extend the existing logical-CSS scans to cover `ui.css`.
    - _Requirements: 10.1, 10.2, 10.6, 10.8, 10.9, 11.1, 7.2, 7.5, 33.1_

  - [x] 1.9 Guard pass for group 1
    - Run `agent-guard` over the group 1 diff (clean code, test quality, docs accuracy). Fix findings within scope; record the rest in the Decisions_File.
    - _Requirements: 34.1_

  - [x] 1.10 Checkpoint - `pnpm -r test` green
    - Run `pnpm -r test` and typecheck in the three packages. Ensure all tests pass; on a failure apply the blocked-task rule and do not ask the user. Then read `docs/phase-6-notes/owner-feedback.md` and handle open items as described in the working rules, and update `progress.md`.
    - _Requirements: 34.1, 34.2_

- [x] 2. Group 2: paper context and contrast (fix list items 3, 4, 5)
  - Skills: `impeccable` (before/after), `ponytail`, `agent-tester`, `agent-guard`.
  - [x] 2.1 Re-point the paper tokens in CSS and TypeScript
    - In `skeleton/src/book/book.css` add `--book-card`, `--book-ember` to `:root`, and `--color-bg`, `--color-surface`, `--color-surface-raised`, `--color-rule`, `--color-link`, `--color-ring`, `--color-danger-ink` to the plain `.book-paper` block (no nested braces).
    - In `skeleton/src/book/bookColors.ts` add `BOOK_CARD`, `BOOK_TINT`, `BOOK_EMBER` equal to the CSS values. Keep `#2b1d12` and `#4a1c12`.
    - _Requirements: 12.1, 6.5, 6.6, 4.4_

  - [x] 2.2 Fix the paper markup in `LegendPage.tsx`
    - Add `panel` to the Version card (keep `bg-surface`), a `.rule-b` class (in `apps/atlas/src/styles.css`, `@layer components`) for table rules, `.link` on Sources links with the external marker and its label key `legend.sourceExternal`.
    - Change classes only; no id or anchor changes. Check Scroll_View on the dark surface.
    - _Requirements: 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 7.3_

  - [x] 2.3 Fix the game answer buttons on dark and paper
    - In `world.css`/`WorldPlay.tsx`/`SpiritPanel.tsx`: options get ink text and ink border on the paper tint inside `.book-paper`; keep `world-button world-option`.
    - Tried and disabled options show the mark and the word "Tried" (`world.option.triedMark`), not `line-through` alone; text keeps 4.5:1.
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 7.3_

  - [x] 2.4 Write the contrast tests (Properties 1, 2, 3)
    - `skeleton/test/ui-contrast.property.test.ts`: the full pair matrix D1 to D20 and P1 to P13 from design section 3.6, values read from `tokens.css`, `book.css`, `ui.css` and `bookColors.ts` (no literals); follow `var()` and the `.book-paper` re-points; name the failing pair. Cover surface, rule, link, primary, secondary, ghost, focus ring, land and ember-only-on-flat-fill.
    - **Property 1: Every colour pair in the matrix meets its minimum**
    - **Validates: Requirements 10.5, 12.3, 12.5, 12.7, 13.1, 13.2, 14.1, 14.2, 14.3, 16.4**
    - Theme packs: for all 12 packs and generated palettes through `resolveTheme`, accent, glow and ink reach 4.5:1 on pack bg and surface, and the ring reaches 3:1.
    - **Property 2: Theme packs keep the shared button, link and ring readable**
    - **Validates: Requirements 4.6, 10.5, 14.4**
    - `skeleton/test/paper-constants.property.test.ts`: ink, accent, card, tint, ember equal in `book.css` and `bookColors.ts`.
    - **Property 3: Paper constants agree between CSS and TypeScript**
    - **Validates: Requirements 6.6**
    - Extend `skeleton/test/book-foundations.test.ts` (assertions added only): each re-pointed variable is declared in `.book-paper`; removing one fails.
    - Each property runs at least 100 iterations and carries `// Feature: ui-rework, Property N: <title>`.
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 12.7_

  - [x] 2.5 Add the browser contrast scan and run it locally
    - `apps/atlas/scripts/ui-check.mjs` (extending `book-check.mjs` helpers): walk every text node on Banshee and Naddaha in Book_View and Scroll_View, compute colour against the effective background, report font size and weight, fail below 4.5 (3 for large text).
    - `apps/game/scripts/ui-check.mjs`: measure every Banshee puzzle option and its ring at 390 px and 1280 px, with size and weight.
    - Record results and fixes in `docs/phase-6-notes/browser-checks.md`. Save before/after screenshots for items 3, 4, 5.
    - _Requirements: 12.8, 13.5, 36.6, 36.7, 33.3_

  - [x] 2.6 Guard pass for group 2
    - Run `agent-guard` over the group 2 diff and fix findings within scope.
    - _Requirements: 34.1_

  - [x] 2.7 Checkpoint - `pnpm -r test` green
    - Run `pnpm -r test` and typecheck. Ensure all tests pass; on a failure apply the blocked-task rule and do not ask the user. Then read `docs/phase-6-notes/owner-feedback.md` and handle open items as described in the working rules, and update `progress.md`.
    - _Requirements: 34.1, 34.2_

- [x] 3. Group 3: atlas landing and map (fix list items 6, 7)
  - Skills: `impeccable` (before/after), `read-the-damn-docs` (native `popover`, `aria-current`, `sizes`), `ponytail`, `agent-tester`, `agent-guard`.
  - [x] 3.1 Add the optional `hero` field to the atlas summary
    - `skeleton/src/atlas/view.ts`: `AtlasSummary.hero: AtlasImage | null`. `skeleton/src/db/atlasRead.ts` `listLegends`: widen the existing assets SELECT to include `%-atlas-hero-01` and fill `hero` with the existing `image(assets, heroId(id))` helper. Read-only; no schema or write change.
    - Update `atlas-read.test.ts` and `view.test.ts` only by adding the one `hero` key. Record the change in the Decisions_File.
    - _Requirements: 15.11, 1.1, 1.3_

  - [x] 3.2 Rebuild the atlas header
    - `apps/atlas/src/routes/__root.tsx`: `<nav>` with logo (`href="/"`), "All legends" (`href="/#legends"`), and "Play Trick or True" (`href="/game/"`, `.nav-item` below 40rem, `.btn btn-secondary` above), `activeOptions={{ exact: true }}` for `aria-current="page"`. Add keys `nav.play`. Add `.nav-play` rules in `styles.css`.
    - Update `[id], [data-anchor-heading] { scroll-margin-block-start }` is left to task 6.12.
    - _Requirements: 11.3, 11.5, 15.3, 22.1, 23.1, 23.3, 7.3_

  - [x] 3.3 Rework the home hero and remove the second map
    - `apps/atlas/src/routes/index.tsx`: remove the Painted_Strip `<Img image={map}>` and its import (leave `SHARED_ATLAS_IMAGES` untouched). Add the `home-hero` markup with fixed-size frame, gradient placeholder, `h1`, one sentence (`home.intro`), `.btn btn-primary` "Start with {title}" to a real legend path (`RECOMMENDED_FIRST_LEGEND` in `home.ts`, banshee else first by title) and the `/game/` link. Add the `home-hero` CSS (with RTL gradient mirror) and keys `home.start`. Give the legend list `id="legends"`.
    - Do not change `hero-markup.test.tsx` or `LegendPage` hero markup.
    - _Requirements: 15.1, 15.2, 15.3, 15.6, 15.7, 15.9, 15.10, 23.2_

  - [x] 3.4 Replace the legend list with Legend_Cards
    - `LegendList.tsx`: `li.legend-card.panel` with image (`heroSmall` copy, `loading="lazy"`, `decoding="async"`, explicit `width`/`height`, CSS `aspect-ratio`, `sizes`), kicker, title link with stretched `::after`, hook, read time and scare level. `hero: null` falls back to the marker. Keep continent grouping. No underline on the title; card focus ring via `:has()`.
    - _Requirements: 15.4, 15.5, 15.11, 11.3, 11.4_

  - [x] 3.5 Make the World_Map usable on phones
    - `WorldMap.tsx`: container `bg-bg`, land `color-mix(in oklab, var(--color-muted) 66%, var(--color-bg))`; visible `home.mapSwipe` text (hidden at 60rem and up); `useLayoutEffect` centres the recommended legend's pin on first render; pin card "Read the legend" `.btn btn-primary` and close `.btn btn-ghost` with `popovertargetaction="hide"`. Keep pins at least 44 px with legend-name labels. Do not touch `geo.test.ts` or `public/world-land.svg`.
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 10.7, 7.3_

  - [x] 3.6 Write the atlas home tests
    - `apps/atlas/test/home.test.tsx`: map count is one (`shared-atlas-map-01` `img` count 0 and `.land` count 1); hero has `h1`, one `.btn-primary`, `a[href="/game/"]`; each card is one link named by its title with no underline class; each card image has `loading`, `decoding`, `width`, `height`, `sizes` and uses the phone copy.
    - `apps/atlas/test/world-map.test.tsx`: pin card has `.btn-primary` and `.btn-ghost`; visible swipe text; pins at least 44 px.
    - `apps/atlas/test/header.test.tsx`: `nav-item`, one `aria-current="page"`, `href="/game/"`, `href="/#legends"`, logo `href="/"`, fails when both items share an `href`.
    - _Requirements: 15.1, 15.4, 15.5, 15.8, 15.11, 16.3, 16.5, 16.7, 11.5, 22.3, 23.4, 33.1_

  - [x] 3.7 Browser checks, Slow 4G "after" and screenshots
    - At 390x844 and 1280x800: one map element; hero `h1` and primary button fully inside the first screen at 1280x800; no opaque black hero box at first paint; all 12 pins reachable by touch and keyboard at 390; popover Escape returns focus; zero underlined links outside running text.
    - Repeat the Slow 4G home measurement (median of three) on a local production build; the "after" median must not exceed the "before" median from task 1.1 by more than 10%. If it does, record the cause, shrink `sizes` or fall back to the marker, and re-measure.
    - Save before/after screenshots for items 6 and 7; record results.
    - _Requirements: 15.6, 15.10, 15.12, 16.1, 16.2, 11.4, 36.6, 36.7_

  - [x] 3.8 Guard pass for group 3
    - Run `agent-guard` over the group 3 diff and fix findings within scope.
    - _Requirements: 34.1_

  - [x] 3.9 Checkpoint - `pnpm -r test` green
    - Run `pnpm -r test` and typecheck. Ensure all tests pass; on a failure apply the blocked-task rule and do not ask the user. Then read `docs/phase-6-notes/owner-feedback.md` and handle open items as described in the working rules, and update `progress.md`.
    - _Requirements: 34.1, 34.2_

- [x] 4. Group 4: Hall and scenes (fix list items 8, 9, 10)
  - Skills: `impeccable` (before/after), `read-the-damn-docs` (popover menu, `role="status"`), `ponytail`, `agent-tester`, `agent-guard`.
  - [x] 4.1 Add the pure helpers `doorReasonKey` and `replyLine`
    - `apps/game/src/lib/hall.ts`: `doorReasonKey(state)` (null exactly when the state is `open`). `apps/game/src/lib/world.ts`: `replyLine(reply, t)` (never empty; server text when non-blank). Add keys `hub.door.reason.study`, `hub.door.reason.signin`, `scene.reply.idle`.
    - No access logic is added; `hallDoorState` stays the source.
    - _Requirements: 17.3, 17.5, 17.8, 19.3, 19.4, 7.3_

  - [x] 4.2 Rework the Hall
    - `Hall.tsx` and `routes/index.tsx`: visible `h1` and one-line premise (`hall.intro`) in the first screen; greeting and access rule as a calm note; primary "Start in the study" (`hall.start`, link to `/tutorial`) before the tutorial, secondary "Visit the study again" (`hall.study.again`) after; locked door opens the door panel (locked text plus a primary "Start in the study" button, signin text plus "Sign in", open plus "Enter", "Read the legend" in all) and never navigates silently; accessible names use `doorReasonKey` text via `hub.door.stateNamed`; legends link list becomes a row of `.btn btn-ghost` chips; Hall scene height `--scene-h: min(52dvh, 28rem)`.
    - Record the departure from the original 17.2 wording in the Decisions_File.
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 17.9, 32.6, 7.3_

  - [x] 4.3 Update and extend the Hall tests (Property 4)
    - Record `hall.test.ts` case count before. Replace the "locked door goes to the tutorial" case with a stricter "locked door opens a panel, no navigation" case; add primary/secondary action cases and the three-state test (tutorial not done; guest after tutorial; signed in after tutorial) reading state from `hallDoorState`. Record the reason and after-count (not lower) in the Decisions_File.
    - `apps/game/test/hall.property.test.tsx`: random tutorial flag, 12 access flags, guest flag.
    - **Property 4: Hall door state is the existing rule, with a reason for every closed door**
    - **Validates: Requirements 17.3, 17.4, 17.5, 17.8, 17.9, 17.10**
    - _Requirements: 6.7, 17.10, 33.1_

  - [x] 4.4 Rebuild the game header with the popover menu
    - `apps/game/src/routes/__root.tsx`: logo, atlas link (`href` from the same-origin rule / `atlasUrl`, key `nav.atlas`), menu button (`nav.menu`, `popovertarget="app-menu"`) and `div#app-menu[popover]` holding Hall, Account, Sign in or Sign out. At 40rem and up the menu is inline and the button hidden. `main` becomes `max-w-6xl`; text-only routes (account, sign-in, sign-up, not found) wrap in `.page-narrow`. Record the popover choice in the Decisions_File.
    - `apps/game/test/header.test.tsx`: atlas link found by `href`; fails when removed; menu markup (button, popover, items).
    - _Requirements: 18.8, 18.9, 22.2, 22.3, 22.4, 7.3_

  - [x] 4.5 Build the shared scene screen layout
    - Tutorial and world routes render one `.scene-screen` grid: compact top bar (Hall `.btn-ghost` with flipping arrow, `h1`, scene tabs in one scrolling row), viewer, `.scene-dock`. Keep `SceneNav` markup, `scene-viewport mood-vignette-inset`, `scene-image`, `scene-sprite`, pan by drag and keys. The dock holds the fear meter, the existing hint buttons (the single hint pair for the tutorial; the world pair moves into the HintArea in task 6.7) and the reply row. Remove the tap-result panel and the page scroll to it.
    - Record in the Decisions_File that the world hint-button check of 18.2 is re-run after task 6.7.
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7_

  - [x] 4.6 Add the hotspot glint and the always-on reply
    - `Hotspot.tsx`: add `hotspot-glint` beside `scene-hotspot mood-hotspot-glow`; `scene.css` glint rule (6 s, three opacity steps, `pointer-events: none`, static base opacity under reduced motion). Same class list for every hotspot.
    - `.scene-reply` (`role="status"`, always mounted, `min-block-size: 2.75rem`) prints `replyLine(...)`. Hall and tutorial panels (`hall-panel`) become an overlay sheet that does not push the scene. Server responses are unchanged.
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 18.6, 7.5, 7.6_

  - [x] 4.7 Write the scene tests (Properties 5, 8)
    - `apps/game/test/scene-glint.test.tsx`: every hotspot has `hotspot-glint`; removing the class fails; `role="status"` is non-empty after a click for clue, decoy, dead end and locked roles.
    - `apps/game/test/reply-line.property.test.ts`: null, non-tap, tap with text, with only key, with neither, whitespace-only text.
    - **Property 5: A reply line is never empty**
    - **Validates: Requirements 19.3, 19.4, 19.7**
    - `apps/game/test/hotspot.property.test.tsx`: random box, label, marked flag.
    - **Property 8: Hotspots look the same whatever their role**
    - **Validates: Requirements 19.1, 19.5**
    - _Requirements: 19.6, 19.7, 33.1_

  - [x] 4.8 Browser checks for the Hall, header and scenes
    - At 390x844 and 1280x800: Hall `h1`, premise and primary action inside the first screen; the three Hall states (clear/set the guest receipt in `localStorage`, finish the tutorial locally) and the locked-door panel text; header at 1280 px (menu closed, items visible and Tab-reachable, menu button hidden) and at 390 px (menu opens, Escape closes and returns focus); scene image, pan buttons, fear meter and hint buttons end at or above y = 800 at 1280x800 for the tutorial and Banshee scene 1 (existing hint buttons); scene top under y = 200 at 390; five Banshee scene buttons in one row; glint on every hotspot; reply text non-empty after a meaningful, a decoy and a locked hotspot.
    - Save before/after screenshots for items 8, 9, 10; record results and fixes.
    - _Requirements: 17.1, 18.2, 18.3, 18.4, 18.8, 18.9, 19.1, 19.3, 36.6, 36.7_

  - [x] 4.9 Guard pass for group 4
    - Run `agent-guard` over the group 4 diff and fix findings within scope.
    - _Requirements: 34.1_

  - [x] 4.10 Checkpoint - `pnpm -r test` green
    - Run `pnpm -r test` and typecheck. Ensure all tests pass; on a failure apply the blocked-task rule and do not ask the user. Then read `docs/phase-6-notes/owner-feedback.md` and handle open items as described in the working rules, and update `progress.md`.
    - _Requirements: 34.1, 34.2_

- [x] 5. Group 5: mid-phase status note (no wait)
  - Skills: `impeccable` (final before/after check), `agent-tester`.
  - Produce the final "after" screenshots at 390x844 and 1280x800 in `.debug/phase-6/` for: atlas home, one legend page with its references in Book_View, the Hall, and the Banshee scene.
  - Write `docs/phase-6-notes/mid-phase-status.md` with the before and after screenshot paths for those four screens at both widths, the local URLs used (atlas `http://localhost:3001/`, a legend page, game `http://localhost:3000/game/` Hall and the Banshee world), the conflicts from the Introduction and the map, header-menu and Hall primary-action decisions, and any blocked tasks. Mention that the Owner may write feedback in `docs/phase-6-notes/owner-feedback.md`.
  - Read `owner-feedback.md` and handle open items as in the working rules, update `progress.md`, then continue straight into task 6.1. Do not wait.
  - _Requirements: 5.2, 5.3, 5.4, 5.5, 4.3, 36.6, 42.1_

- [x] 6. Group 6: P2 items 11 to 22
  - Skills: `impeccable` (before/after), `read-the-damn-docs` (`window.open`, `scroll-margin`, `aria-pressed`), `ponytail`, `agent-tester`, `agent-guard`.
  - [x] 6.1 Book controls and toggle (item 11)
    - `Book.tsx`: add `toggleBook` to `BookLabels`; Book_View shows "Read as one page" with `aria-pressed="false"`, Scroll_View shows "Read as a book" with `aria-pressed="true"`. `bookLabels.ts` passes both; add key `book.readAsBook`. Keep `book-controls`, `book-flow`, `book-frontispiece`.
    - Extend `apps/atlas/test/book-component.test.tsx`: label and `aria-pressed` asserted in both modes; buttons carry `btn`; pinned classes remain.
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 7.3_

  - [x] 6.2 Book height (item 12)
    - First measure the rendered book page height and its limiting ancestor at 1280x800 and 390x844 with the browser script; record the numbers in the Decisions_File.
    - Choose the change from the measurement (`--book-page-height: clamp(30rem, calc(100dvh - var(--app-header-h) - 9rem), 52rem)` if the variable is the limit, otherwise fix the limiting parent). Check page height at least 480 px at 1280x800 and Banshee page count below 22; anchor tests and `book-pagination` unchanged.
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5_

  - [x] 6.3 Cross links and "All legends" (items 13, 14)
    - Confirm the atlas header (task 3.2) and game header (task 4.4) links; add any missing test: both headers render the link by `href`, atlas "All legends" `href` differs from the logo, and the game link follows the `ATLAS_ORIGIN`-unset same-origin rule. Verify "All legends" scrolls to `#legends` with the heading in view.
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 23.1, 23.2, 23.3, 23.4_

  - [x] 6.4 Legend hero first screen (item 15)
    - `LegendPage.tsx`/`styles.css`: hero image class gets `max-block-size: min(46dvh, 28rem)` with `object-fit: cover` and the placeholder gradient until decoded. `picture`/`source`/`img` markup unchanged.
    - _Requirements: 24.1, 24.2, 24.3, 24.4_

  - [x] 6.5 Fear meter label and tutorial goal (item 16)
    - `FearMeter.tsx`: make the text span visible (`.fear-meter-text`, `aria-hidden="true"`), keep `role="meter"`, `aria-label`, `aria-valuemin/max/now`; reuse key `fear.meter`.
    - Tutorial top bar: add `tut.goal` ("Goal: open the locked drawer by answering its question.") after re-reading the `tut.*` keys, `TutorialRoom.tsx` and `lib/tutorial.ts`; change the sentence and record it if the content differs. Move `tut.pan` under it as a muted line.
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5, 7.3_

  - [x] 6.6 Write the fear text property test (Property 9)
    - `apps/game/test/fear-text.property.test.tsx`: any number incl. negative, above 100, fractional and `NaN`; visible text, `aria-valuenow` and fill width use the same clamped, rounded value. Extend `fear-ui.test.ts` (assertions added only).
    - **Property 9: The fear text matches the fear value**
    - **Validates: Requirements 25.1, 25.2, 25.4**
    - _Requirements: 25.4, 25.5_

  - [x] 6.7 One hint area (item 17)
    - Add `isHintable(slot)` (`state === 'open'`) to `lib/world.ts`. Create `components/HintArea.tsx`: active puzzle name, `hint.area.pick` when none, Hint 1 and Hint 2 as `.btn btn-secondary` with names from `hint.1.named` and `hint.2.named`, `aria-disabled` while busy (no `disabled`, none when idle), free link `hint.2.again` when hint 2 was used, Hint 1 text in a `.hint-sheet` that does not push the page. Move the tutorial's hint pair into the same component. `Notebook` keeps the puzzle list and no longer renders hint buttons. Fear cost, hint order and `atlasUrl` construction stay.
    - Re-run the world-scene 18.2 check for hint buttons and record it.
    - _Requirements: 26.1, 26.3, 26.4, 26.5, 26.6, 26.7, 18.2, 7.3_

  - [x] 6.8 Update the hint tests (Property 7)
    - Record `world.test.ts` case count before. Replace slot-level hint assertions (lines near 83 and 203 to 210) with at-least-as-strict ones: one "Hint 1" and one "Hint 2" button for a five-puzzle world, active-slot hint text, free link for a used hint 2, `aria-disabled` while busy and none when idle. Record the reason and after-count (not lower) in the Decisions_File.
    - `apps/game/test/hint-area.test.tsx` and `hint-area.property.test.tsx`: random slot states, chosen index, used-hint flag.
    - **Property 7: One hint pair, offered only for an open puzzle**
    - **Validates: Requirements 26.1, 26.2, 26.3, 26.6**
    - _Requirements: 6.7, 26.2, 33.1_

  - [x] 6.9 Hint 2 blank-tab flow (item 18), with early verification of two assumptions
    - Step 1 (first, before writing code): check the real code for the two design assumptions and record the result in the Decisions_File.
      - Assumption A: `run` stores `lastError`. Current code check: `run` in `routes/world.$target.tsx` (lines 62 to 88) and `routes/tutorial.tsx` (lines 33 to 49) sets `failed`/`tooMany` state in `catch` and returns `null`; no `lastError` ref exists. Smallest UI-only handling if still true: do not add a ref; treat every `null` reply as `{ kind: 'failed', cause: 'other' }`, since the cause never changes the outcome. Drop `failureCause` from the design's sketch.
      - Assumption B: guest-limit refusals throw so `act()` returns `null`. Read `apps/game/src/lib/playClient.ts` and the guest limit path. If a refusal is returned as a normal response instead of thrown, then `r` is non-null and its reply is not a hint, which `hint2Outcome` already maps to `failed` (closes the tab, no link). If it throws, `null` covers it. Either way no server or rule change; record which one holds.
    - Step 2: create `apps/game/src/lib/hintTab.ts` (`openBlankTab`, `hint2Outcome`, `Hint2Server`, `Hint2Outcome`). In `tutorial.tsx` and `world.$target.tsx` call `openBlankTab()` synchronously in the click handler before `act`, then `goTo`, `close()` and set the blocked link from `hint2Outcome(tab.opened, server)`. `close()` runs in the same tick as the failure is handled (no `await` or timer between). Chapter URL comes only from the server reply. Add `hint.2.blocked`; the blocked-tab link is `.btn btn-secondary`, at least 44 px high, `rel="noopener"`, shown in the HintArea only after fear is raised.
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 27.8, 7.3_

  - [x] 6.10 Write the Hint 2 tests (Property 6)
    - `apps/game/test/hint-tab.property.test.ts`: `tabOpened` x server outcome (`charged` with and without href, `free`, `failed` with each cause).
    - **Property 6: Hint 2 outcome never leaks or wastes a tab**
    - **Validates: Requirements 27.1, 27.2, 27.3, 27.6, 27.7**
    - `apps/game/test/hint2-tab.test.tsx`: `window.open` returns `null` plus a successful call shows the sentence and link only after fear is raised; an `it.each` table over network error, guest limit, rate limit (429), another refusal, and a reply that is not a hint asserts `close()` called exactly once after one microtask flush (no timer advanced), no chapter link and no chapter URL; the blank tab opens synchronously inside the click.
    - _Requirements: 27.6, 27.7, 33.1_

  - [x] 6.11 No layout shift while a move is processed (item 19)
    - Replace the inserted "Working on your last move…" line with the always-present `.scene-pending` row (`min-block-size: 1.5rem`, `&nbsp;` when idle, text from `play.pending` when busy); no animation. The existing "shows none of it when idle" test must pass unchanged.
    - _Requirements: 28.1, 28.2, 28.4_

  - [x] 6.12 Anchor landing (item 20)
    - `apps/atlas/src/styles.css`: `[id], [data-anchor-heading] { scroll-margin-block-start: calc(var(--app-header-h) + 1rem) }`. Keep `data-anchor-heading`, `tabIndex={-1}`, unique ids and the 404 text.
    - `apps/atlas/test/anchor-margin.test.ts`: margin at least header plus 1rem (removing it fails); existing anchor tests unchanged.
    - _Requirements: 29.1, 29.4, 29.5, 29.6_

  - [x] 6.13 Source link size (item 21)
    - Sources links: `min-block-size: 1.5rem`, `display: inline-block`, `padding-block: 0.25rem`, 0.5rem between items; external marker `aria-hidden` with the visually hidden `legend.sourceExternal` text.
    - `apps/atlas/test/sources-tap.test.tsx`: stylesheet has the minimum height rule (removing it fails); marker label present.
    - _Requirements: 30.1, 30.3, 30.4_

  - [x] 6.14 Contents list (item 22)
    - `Contents` in `LegendPage.tsx`: one `<ol>`, one column, `.nav-item` rows of at least 2.75rem, number in display font, hover/focus marker plus weight plus ring. Keep every `href`.
    - `apps/atlas/test/contents.test.tsx`: one `ol`, `.nav-item`, hrefs unchanged.
    - _Requirements: 31.1, 31.2, 31.3, 31.4_

  - [x] 6.15 Browser checks for P2 items
    - At 390 and 1280: `/anchor/banshee--ch-3` heading top at or below header height and bottom at or above viewport height; every anchor of one legend visible and focused in Book_View and Scroll_View; `/anchor/nope--zzz` still 404; smallest Sources link height at least 24 px in both modes; contents items at least 44 px at 390; legend `h1` inside the first 800 px at 1280x800; Banshee page count and page height; scene top equal before, during and after a move (three samples); Hint 2 with the pop-up blocker on shows sentence and link, with it off opens the chapter, with aborted and refused calls the tab closes and no link shows, and fear after Hint 2 equals before plus the play-rule cost.
    - Record results and fixes.
    - _Requirements: 29.2, 29.3, 30.2, 31.3, 24.1, 21.1, 21.2, 28.3, 27.1, 27.2, 27.3, 27.5, 36.7_

  - [x] 6.16 Guard pass for group 6
    - Run `agent-guard` over the group 6 diff and fix findings within scope.
    - _Requirements: 34.1_

  - [x] 6.17 Checkpoint - `pnpm -r test` green
    - Run `pnpm -r test` and typecheck. Ensure all tests pass; on a failure apply the blocked-task rule and do not ask the user. Then read `docs/phase-6-notes/owner-feedback.md` and handle open items as described in the working rules, and update `progress.md`.
    - _Requirements: 34.1, 34.2_

- [x] 7. Group 7: P3 items (optional, only if time remains)
  - Skills: `ponytail`, `read-the-damn-docs`, `agent-tester`, `agent-guard`. The Hall legends row (P3 item 6) was done in task 4.2.
  - [x]* 7.1 Clip the Book page-turn layer
    - Add `contain: paint` and `clip-path: inset(0)` to `.book-viewport`; check the mid-turn screenshot shows no clipped text.
    - _Requirements: 32.1_

  - [x]* 7.2 Unify type sizes and gaps
    - Move components onto `--type-*` and `--space-*`; fonts stay in `KNOWN_FONTS`.
    - _Requirements: 32.2, 3.2, 3.3_

  - [x]* 7.3 Replace hex fallbacks with tokens
    - In `scene.css`, `world.css`, `tutorial.css` and `skeleton/src/design/mood.css`; set `--mood-ink: var(--color-bg)`; `apps/game/test/theme.test.ts` must pass.
    - _Requirements: 32.3_

  - [x]* 7.4 Record the Banshee seam request
    - If the seam is judged a defect, add the seam-free panorama request (size, purpose, item) to `docs/phase-6-notes/content-and-assets-needed.md`. Do not edit the asset.
    - _Requirements: 32.4, 2.2_

  - [x]* 7.5 Motion toggle as a styled switch
    - `MotionToggle.tsx`: `input[role=switch]` styled, same label, `checked` state and storage; works without reload.
    - _Requirements: 32.5, 7.7_

  - [x] 7.6 Checkpoint - `pnpm -r test` green
    - Run `pnpm -r test` and typecheck, with a guard pass over any P3 changes made. Ensure all tests pass; on a failure apply the blocked-task rule and do not ask the user. Then read `docs/phase-6-notes/owner-feedback.md` and handle open items as described in the working rules, and update `progress.md`. List every skipped P3 item for the handover.
    - _Requirements: 32.7, 34.1_

- [x] 8. Group 8: tests, mutation checks and local browser checks
  - Skills: `agent-tester`, `agent-guard`, `impeccable` (final after pass), `verify-and-stop`.
  - [x] 8.1 Run the mutation checks and record them
    - For each of items 3, 4, 5, 6, 11, 20, 26, 27, 29, 30 apply the mutation from design section 7.3, run the test, confirm it fails, restore, and confirm `git diff` of the mutated lines equals the pre-mutation state. Record mutation, failing test and restore in `docs/phase-6-notes/mutations.md`. If a mutation does not fail a test, strengthen the test and repeat.
    - _Requirements: 35.1, 35.2, 35.3, 35.4, 14.6_

  - [x] 8.2 Finish the local browser check scripts and run them
    - Complete `apps/atlas/scripts/ui-check.mjs` and `apps/game/scripts/ui-check.mjs` for every screen of Req 36.2 at 390x844 and 1280x800 against ports 3001 and 3000: atlas home, map, a legend page in Book_View and Scroll_View with references, one anchor link, Hall, tutorial, Banshee world, Hint 1 and Hint 2, fear meter, a dead end, high fear, win screen. Record how each stateful screen was reached.
    - _Requirements: 36.1, 36.2, 36.3, 36.7, 33.3_

  - [x] 8.3 Keyboard-only pass
    - Tab, Enter, Space, arrows and Escape from the Hall through the tutorial and the Banshee world; record each focus ring with computed outline colour and width.
    - _Requirements: 36.4, 10.6, 13.2_

  - [x] 8.4 Reduced-motion and RTL passes
    - OS emulation and the in-app toggle: glint, candle, fog and page turn are static, toggle works without reload. RTL pass with `dir="rtl"`: icons flip, header does not overflow, the map still starts centred.
    - _Requirements: 36.5, 7.4, 7.5, 7.7, 19.2, 28.4_

  - [x] 8.5 Complete the before/after screenshot set
    - Ensure `.debug/phase-6/` holds before and after screenshots at 390 and 1280 for every P1 item 1 to 10 with the item number, width and `before`/`after` in the file name; fill any gap. Nothing under `docs/`.
    - _Requirements: 36.6, 9.4, 41.3_

  - [x] 8.6 Run the final local gates
    - `pnpm -r test`, typecheck in the three packages, the secret scan, and read-only `git status`/`git diff --stat` to confirm no change under `content/` or `assets/`, no `vercel.json` change, no new dependency, no image added, and the forbidden areas of Req 1.1 untouched. Record the counts for the handover.
    - _Requirements: 1.1, 1.4, 2.1, 2.3, 3.1, 3.4, 8.1, 8.2, 9.6, 34.1, 34.2, 34.3_

  - [x] 8.7 Guard pass for group 8
    - Run `agent-guard` over tests, scripts and notes written in this group.
    - _Requirements: 34.1_

  - [x] 8.8 Checkpoint - `pnpm -r test` green
    - Run `pnpm -r test` and typecheck. Ensure all tests pass; on a failure apply the blocked-task rule and do not ask the user. Then read `docs/phase-6-notes/owner-feedback.md` and handle open items as described in the working rules, and update `progress.md`.
    - _Requirements: 34.1, 34.2_

  - [x] 8.F1 Scene tabs wrap and scroll (Owner feedback F1)
    - From `docs/phase-6-notes/owner-feedback.md` item F1: at 40rem and up the scene tabs wrap onto more lines; below 40rem they stay in one scrolling row with the scrollbar hidden and a visible fade or "more" cue at the scrolling edge (logical properties only, cue flips in a right-to-left layout).
    - Re-check the 18.2 and 18.3 results (first-screen fit at 390 px and 1280 px, one-row tabs below 40rem) and record them. Record item F1 in the Decisions_File before acting and mark it "done in task 8.F1" in the feedback file.
    - Existing tests pinned to the old scene-tab markup (for example the five-in-one-row browser check and `SceneNav` tests) may change in this task; record the reason in the Decisions_File, keep each new assertion at least as strict as the one it replaces.
    - _Requirements: 18.2, 18.3, 6.3, 6.7, 7.1_

  - [x] 8.F2 Visible hotspot glint (Owner feedback F2)
    - From `owner-feedback.md` item F2: the hotspot glint is a glow dot of at least 8 px with a halo, with 3:1 contrast against the surrounding pixels at its brightest step. Decoys and clues carry the identical class list and look. Under reduced motion the glint is static (still visible).
    - Use the `impeccable` skill for the visual judgement. Prove it with 64 px before/after crops of three hotspots saved in `.debug/phase-6/` (names carry `glint`, `before` or `after`), and record the measured contrast.
    - Update the glint assertions in `hotspot.property.test.tsx` and the scene tests only as the old markup requires, with the reason recorded; Property 8 stays as strict.
    - _Requirements: 19.1, 19.5, 7.5, 7.6, 6.3, 6.7, 36.6_

  - [x] 8.F3 One compact scene dock (Owner feedback F3)
    - From `owner-feedback.md` item F3: the scene dock is one compact block. Fear meter and reply share one row, the hint buttons sit at the end, and the row wraps at 390 px. Centre the scene image when it is narrower than the viewer (logical properties).
    - Re-check 18.2 (controls on the first screen) and the item 19 result of 0 px shift when the reply changes, and record both.
    - Existing tests pinned to the old dock markup may change in this task; record the reason in the Decisions_File and keep each assertion at least as strict.
    - _Requirements: 18.2, 18.6, 19.3, 19.4, 6.3, 6.7, 7.1_

  - [x] 8.F4 Fear caption never covers anything (Owner feedback F4)
    - From `owner-feedback.md` item F4: the fear caption must not cover controls or text. Place it over the scene image or in the reply row, with `pointer-events: none`.
    - Check at 390 px and 1280 px with the caption showing: no overlap with any control or text, and every control stays clickable. Record the measurements.
    - _Requirements: 18.2, 18.6, 19.3, 19.4, 36.6_

  - [x] 8.F5 Re-run the affected browser checks (Owner feedback F1 to F4)
    - Re-run the game screen checks of tasks 4.8 and 8.x at 390 px and 1280 px (tutorial, Banshee scene 1, Hall). Run the keyboard pass on the scene top bar and the scene tabs (Tab order, visible focus ring, tabs reachable inside the scrolling row). Run the reduced-motion check for the glint (static, still visible).
    - Save new "after" shots for items 9 and 10 in `.debug/phase-6/` and update `docs/phase-6-notes/screenshots-index.md` with each new path.
    - _Requirements: 18.2, 18.3, 19.1, 19.3, 7.5, 36.6, 36.7_

  - [x] 8.F6 Checkpoint 8.8 again - `pnpm -r test` green
    - Run `pnpm -r test`, typecheck and the secret scan. Ensure all tests pass; on a failure apply the blocked-task rule and do not ask the user. Then read `docs/phase-6-notes/owner-feedback.md`, handle open items as described in the working rules, and update `progress.md`.
    - Task 9.1 (the stop) runs only after this task.
    - _Requirements: 34.1, 34.2_

- [x] 9. Group 9: Owner push, then production checks (guest only)
  - Skills: `agent-tester`, `agent-guard`, `verify-and-stop`.
  - [x] 9.1 STOP for the Owner's push
    - Depends on 8.F6 (and so on 8.F1 to 8.F5 and 8.8). Precondition: groups 6, 7 (P3 only if time remains) and 8, including 8.F1 to 8.F6, are finished locally, so one push carries everything. If any is unfinished, go back to it first.
    - Read `owner-feedback.md` and handle open items first. Write a short status listing what is ready to push, the blocked tasks (if any) and the P3 items skipped. Stop and wait until the Owner reports the push. Do not push, commit or touch git state. This is one of the two stops in the run.
    - _Requirements: 9.5, 37.1, 42.1_

  - [x] 9.2 Production guest checks
    - After the Owner reports the push, run the Req 36.2 screens on production as a guest only: no sign-up, no sign-in, no writes. Record in `docs/phase-6-notes/production-checks.md`.
    - _Requirements: 37.1, 37.4, 9.2, 9.3_

  - [x] 9.3 Slow 4G timings on production
    - Measure Scene_Paint on Slow 4G (1.6 Mbps down, 750 kbps up, 150 ms RTT, 4x CPU, cache off, 390 px, median of three) for the Hall, the tutorial and Banshee scene 1, and the atlas home before/after rows. Compare with Phase 5 production run 1 (3714 ms, 3535 ms, 4521 ms). For each timing worse than Phase 5, record the cause and a fix attempt.
    - _Requirements: 37.2, 37.3, 15.12_

  - [x] 9.4 Guard pass for group 9
    - Run `agent-guard` over the production notes and any fix made.
    - _Requirements: 34.1_

  - [x] 9.5 Checkpoint - `pnpm -r test` green
    - Run `pnpm -r test` and typecheck once more if any fix was made. Ensure all tests pass; on a failure apply the blocked-task rule and do not ask the user. Then read `docs/phase-6-notes/owner-feedback.md` and handle open items as described in the working rules, and update `progress.md`.
    - _Requirements: 34.1, 34.2_

- [x] 10. Group 10: Kiro usage, final check, handover
  - Skills: `agent-guard`, `verify-and-stop`, `agent-docs`.
  - [x] 10.1 Write the Phase 6 entry in `docs/kiro-usage.md`
    - Name this spec, the steering files used, the hooks run, the sub-agents used and what each found, and the skills used with one finding per skill (impeccable, read-the-damn-docs, ponytail, agent-tester, agent-guard, verify-and-stop).
    - _Requirements: 39.1, 39.2_

  - [x] 10.2 Guard pass over the docs
    - Run `agent-guard` (docs accuracy) over `docs/kiro-usage.md` and `docs/phase-6-notes/`.
    - _Requirements: 34.1_

  - [x] 10.3 Final check with verify-and-stop
    - Use `verify-and-stop` to prove acceptance without expanding scope: `pnpm -r test`, typecheck, secret scan, read-only git diff against Req 1, 2, 3 and 8, mutation file complete, screenshots present, records present (including a Needs_File that exists). Fix only failures; record anything blocked.
    - _Requirements: 34.1, 34.2, 34.3, 41.2_

  - [x] 10.4 Write `docs/phase-6-handover.md` and stop
    - Contents: status of items 1 to 22 (done, partly, blocked) with the test or check that proves each; status of each P3 item (not done items listed); the conflicts and their resolution; new catalog keys with English text (the table in the design plus any added); new tokens and classes; `pnpm -r test` counts; mutation summary; browser and production results; the Slow 4G table against Phase 5; Needs_File items; each blocked task with failing test, two attempts and error; steps the Owner must take before submission. No secret.
    - Then stop. Do not commit or push. This is the last of the two stops in the run.
    - _Requirements: 40.1, 40.2, 40.3, 40.4, 9.1, 9.5_

  - [x] 10.F5 Atlas home hero stacks on narrow screens (Owner feedback F5)
    - Depends on 10.4. From `docs/phase-6-notes/owner-feedback.md` item F5: below 40rem the atlas home hero stacks, with the image first at 16/9 fully visible and the copy below it on the page background with no scrim. The 1280 layout stays unchanged. No change to the image source or size.
    - _Requirements: 15_

  - [x] 10.F6 Atlas header on one row at 360 px (Owner feedback F6)
    - Depends on 10.F5. From `docs/phase-6-notes/owner-feedback.md` item F6: the atlas header fits one row at 360 px and up. Below 40rem use a shorter visible label from a catalog key with the full accessible name kept, or tighter gaps. Add 360 px to the header browser check.
    - _Requirements: 11, 22_

  - [x] 10.F7 Hint 1 hotspot marks (Owner feedback F7)
    - Depends on 10.F6. From `docs/phase-6-notes/owner-feedback.md` item F7: client state only. Store the highlight from the hint1 reply per slot beside `hint1Texts` in `WorldPlay` and add it to the marked set until the slot is solved. No change to the engine, views, tokens or play rules.
    - Test with a highlight that asserts the marked render, run a mutation check, and confirm in the browser on Banshee Puzzle 1.
    - _Requirements: 26_

  - [x] 10.F8 Close test gaps (Owner feedback F8)
    - Depends on 10.F7. Add tests for the fear meter text contrast pair, the `.btn` 44 px minimum height, the 2 px current-item marker, and the Hint 2 fallback link (44 px and `rel="noopener"`). Each test must fail when the thing it guards is broken.
    - _Requirements: 25.5, 10.3, 11.5, 27.4_

  - [x] 10.F9 Re-run screen checks and checkpoint
    - Depends on 10.F8. Re-run the atlas and game screen checks at 360, 390 and 1280 px, and do a keyboard pass on the atlas header. Then run checkpoint 9.5: tests, typecheck and secret scan. Ensure all tests pass, ask the user if questions arise.
    - _Requirements: 11, 15, 22, 26, 34.1_

  - [x] 10.F11 Serve images through the ImageKit CDN with sized copies (Owner feedback F9)
    - Depends on 10.F9. Follow F9 steps 1 to 8 and its Checks in `docs/phase-6-notes/owner-feedback.md` exactly.
    - The owner approves the single CSP `img-src` change in `skeleton/src/deploy/vercelRules.ts` and its test. No other rule change.
    - `IMAGE_CDN_URL` is read server-side only. When unset, image URLs are today's URLs byte for byte.
    - No image files are added or changed. No API key. No AVIF. Never read `.env`; pass `IMAGE_CDN_URL` on the command line.
    - Numbering note: the feedback file says F9 is "done in task 10.F9", but 10.F9 is the re-run task. Mark F9 "done in task 10.F11" and record the numbering in `docs/phase-6-notes/decisions.md`.
    - _Requirements: 11, 15, 22, 26, 34.1_

  - [x] 10.F12 Re-run the "After F5 to F8" checks with F9 in place
    - Depends on 10.F11. Re-run the atlas and game screen checks at 360, 390 and 1280 px, with the CDN off and on. Do a keyboard pass on the atlas header.
    - Then run checkpoint 9.5: full tests, typecheck, builds, secret scan, and a protected-file diff that allows only the approved CSP change. Ensure all tests pass, ask the user if questions arise.
    - _Requirements: 11, 15, 22, 26, 34.1_

  - [x] 10.F10 Update handover and verification notes, then stop
    - Depends on 10.F12. Update `docs/phase-6-handover.md` and `docs/phase-6-notes/verification.md` with F5 to F8. Then stop with the tree ready to push. Do not commit or push.
    - _Requirements: 40.1, 40.2, 9.5_

## Notes

- Tasks run strictly in order, one at a time; there is no parallelism, so each wave in the graph holds one task.
- Tasks marked with `*` (P3 only) are optional and can be skipped. Test sub-tasks in groups 1 to 6 are mandatory because Req 33 and 35 require them.
- Two stop points only: task 9.1 (wait for Owner push) and task 10.4 (handover). Task 5 writes a status note and does not wait. Groups 6, 7 and 8 finish locally before 9.1 so one push carries everything.
- Owner feedback is read at every checkpoint and never awaited. Feedback tasks are named `<group>.F<n>` and added to the Task Dependency Graph as their own waves right after the current group.
- `docs/phase-6-notes/progress.md` is updated after every task. After a restart or context summary, read it and this file, then continue from the next unchecked task.
- Property tests cover Properties 1 to 9 of the design (2.4, 4.3, 4.7, 6.6, 6.8, 6.10). The generator, RNG and lead logic are not changed, so the generator property tests are not triggered.
- The Slow 4G "before" for the atlas home is taken in task 1.1 (before any change) so later CSS work does not skew it; task 3.7 takes the "after".
- The world-scene hint-button check of 18.2 can only be final after the HintArea (6.7); task 4.5 records this and 6.7 re-runs it.
- The early verification of the two Hint 2 assumptions is the first step of task 6.9. A pre-read of the code found no `lastError` in `apps/game/src`, so the smallest handling (every `null` reply is a failure) is the expected outcome.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["1.4"] },
    { "id": 4, "tasks": ["1.5"] },
    { "id": 5, "tasks": ["1.6"] },
    { "id": 6, "tasks": ["1.7"] },
    { "id": 7, "tasks": ["1.8"] },
    { "id": 8, "tasks": ["1.9"] },
    { "id": 9, "tasks": ["1.10"] },
    { "id": 10, "tasks": ["2.1"] },
    { "id": 11, "tasks": ["2.2"] },
    { "id": 12, "tasks": ["2.3"] },
    { "id": 13, "tasks": ["2.4"] },
    { "id": 14, "tasks": ["2.5"] },
    { "id": 15, "tasks": ["2.6"] },
    { "id": 16, "tasks": ["2.7"] },
    { "id": 17, "tasks": ["3.1"] },
    { "id": 18, "tasks": ["3.2"] },
    { "id": 19, "tasks": ["3.3"] },
    { "id": 20, "tasks": ["3.4"] },
    { "id": 21, "tasks": ["3.5"] },
    { "id": 22, "tasks": ["3.6"] },
    { "id": 23, "tasks": ["3.7"] },
    { "id": 24, "tasks": ["3.8"] },
    { "id": 25, "tasks": ["3.9"] },
    { "id": 26, "tasks": ["4.1"] },
    { "id": 27, "tasks": ["4.2"] },
    { "id": 28, "tasks": ["4.3"] },
    { "id": 29, "tasks": ["4.4"] },
    { "id": 30, "tasks": ["4.5"] },
    { "id": 31, "tasks": ["4.6"] },
    { "id": 32, "tasks": ["4.7"] },
    { "id": 33, "tasks": ["4.8"] },
    { "id": 34, "tasks": ["4.9"] },
    { "id": 35, "tasks": ["4.10"] },
    { "id": 36, "tasks": ["5"] },
    { "id": 37, "tasks": ["6.1"] },
    { "id": 38, "tasks": ["6.2"] },
    { "id": 39, "tasks": ["6.3"] },
    { "id": 40, "tasks": ["6.4"] },
    { "id": 41, "tasks": ["6.5"] },
    { "id": 42, "tasks": ["6.6"] },
    { "id": 43, "tasks": ["6.7"] },
    { "id": 44, "tasks": ["6.8"] },
    { "id": 45, "tasks": ["6.9"] },
    { "id": 46, "tasks": ["6.10"] },
    { "id": 47, "tasks": ["6.11"] },
    { "id": 48, "tasks": ["6.12"] },
    { "id": 49, "tasks": ["6.13"] },
    { "id": 50, "tasks": ["6.14"] },
    { "id": 51, "tasks": ["6.15"] },
    { "id": 52, "tasks": ["6.16"] },
    { "id": 53, "tasks": ["6.17"] },
    { "id": 54, "tasks": ["7.1"] },
    { "id": 55, "tasks": ["7.2"] },
    { "id": 56, "tasks": ["7.3"] },
    { "id": 57, "tasks": ["7.4"] },
    { "id": 58, "tasks": ["7.5"] },
    { "id": 59, "tasks": ["7.6"] },
    { "id": 60, "tasks": ["8.1"] },
    { "id": 61, "tasks": ["8.2"] },
    { "id": 62, "tasks": ["8.3"] },
    { "id": 63, "tasks": ["8.4"] },
    { "id": 64, "tasks": ["8.5"] },
    { "id": 65, "tasks": ["8.6"] },
    { "id": 66, "tasks": ["8.7"] },
    { "id": 67, "tasks": ["8.8"] },
    { "id": 68, "tasks": ["8.F1"] },
    { "id": 69, "tasks": ["8.F2"] },
    { "id": 70, "tasks": ["8.F3"] },
    { "id": 71, "tasks": ["8.F4"] },
    { "id": 72, "tasks": ["8.F5"] },
    { "id": 73, "tasks": ["8.F6"] },
    { "id": 74, "tasks": ["9.1"] },
    { "id": 75, "tasks": ["9.2"] },
    { "id": 76, "tasks": ["9.3"] },
    { "id": 77, "tasks": ["9.4"] },
    { "id": 78, "tasks": ["9.5"] },
    { "id": 79, "tasks": ["10.1"] },
    { "id": 80, "tasks": ["10.2"] },
    { "id": 81, "tasks": ["10.3"] },
    { "id": 82, "tasks": ["10.4"] },
    { "id": 83, "tasks": ["10.F5"] },
    { "id": 84, "tasks": ["10.F6"] },
    { "id": 85, "tasks": ["10.F7"] },
    { "id": 86, "tasks": ["10.F8"] },
    { "id": 87, "tasks": ["10.F9"] },
    { "id": 88, "tasks": ["10.F11"] },
    { "id": 89, "tasks": ["10.F12"] },
    { "id": 90, "tasks": ["10.F10"] }
  ]
}
```
