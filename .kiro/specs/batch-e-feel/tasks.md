# Implementation Plan: Batch E Feel

## Overview

Batch E changes copy, CSS and one small route, in the order E1, E2, E3, E4, E5, then one Verify task, then the handover docs. All tasks are required. No task makes a commit or a push. Execution stops only if blocked, or if a change would touch game rules, scoring, fear amounts, pacing limits, hint charging, the puzzle generator, the play engine, `content/`, `assets/` or the database (Requirement 7). `skeleton/src/play/fear.ts`, `skeleton/src/play/fearTable.ts`, `fearPlayer.ts`, `content/` and `assets/` stay unmodified. No secrets in code, docs or tests.

## Tasks

- [x] 1. E1: Settle the names
  - [x] 1.1 Remove the placeholder comment and add the names line to the Entry_Page
    - In `apps/atlas/src/i18n/en.ts`, delete the "placeholder name (decisions: names are still open)" comment on line 3 and add key `shell.entry.names` = "Told is the atlas. True is the game."
    - In `apps/atlas/src/routes/index.tsx`, add a small muted `<p>` directly after `.shell-tagline` that renders the key and is allowed to wrap
    - Keep the two cards inside the first screen at 390x844 px. If they fall below the fold, shrink the line's block margins first
    - Change no other name, route or domain
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. E2: State the hook in the product
  - [x] 2.1 Update the game copy
    - In `apps/game/src/i18n/en.ts`, set `hall.intro` to "Each door holds one legend. Open it to enter its world. The answers live only in the atlas."
    - Add keys `shared.line.before`, `shared.line.engine`, `shared.line.after`, `shared.line.href` and `shared.line.external` with the values from the design (before + engine + after must equal the Shared_Line exactly; href is `https://github.com/Hany-R-Mahmoud/kiroween-2026#how-it-fits-together`)
    - _Requirements: 2.1, 2.4, 2.5_

  - [x] 2.2 Add the Shared_Line to the atlas footer
    - In `apps/atlas/src/i18n/en.ts`, add the four `shared.line.*` keys with text identical to the game's
    - In `apps/atlas/src/routes/__root.tsx`, add a fourth footer `<p>` with the Shared_Line, where "the same engine" is the Engine_Link: `rel="noopener noreferrer"`, class `link`, no `target`, a `↗` marker with `aria-hidden`, and sr-only text reusing `legend.sourceExternal`
    - Match the footer's existing link sizing (`inline-flex min-h-11 items-center`)
    - Add no `/about` route and no new footer component
    - _Requirements: 2.2, 2.4, 2.5, 2.6, 2.7_

  - [x] 2.3 Add the Shared_Line to the bottom of the Hall
    - In `apps/game/src/components/Hall.tsx`, add one muted `<p>` after the doors with the same Engine_Link markup, using `shared.line.external` for the sr-only text
    - Add no footer component for other pages
    - _Requirements: 2.3, 2.4, 2.5, 2.7_

- [x] 3. E3: Fear events with distinct looks
  - [x] 3.1 Add the stable look rule and the request field
    - In `apps/game/src/layout/fearEvents.ts`, add `FearLook` (`'cold' | 'fog' | 'dim'`) and the pure `fearLookOf(legendId, id)` from the design: legend offset from the order of `FEAR_EVENTS` (clamped to 0 for unknown ids, 0 for `null`), plus the event number, modulo 3. Use no `Math.random`, no RNG and no clock
    - Add a comment that new legends must append to `FEAR_EVENTS` and that reordering changes looks
    - Add `look: FearLook` to `FearRequest`
    - Leave `FearEventEntry`, `chooseFearEvent`, `fearPlayer.ts`, `fear.ts` and `fearTable.ts` unchanged
    - _Requirements: 3.1, 3.4, 3.5, 3.9, 3.11_

  - [x] 3.2 Set `look` in both producers
    - In `apps/game/src/routes/world.$target.tsx`, set `look: fearLookOf(info.id, entry.id)` when requesting an event
    - In `apps/game/src/components/TutorialRoom.tsx`, set `look: fearLookOf(null, MIRROR_EVENT.id)`
    - _Requirements: 3.4_

  - [x] 3.3 Draw the three looks and restyle the caption
    - In `apps/game/src/components/FearOverlay.tsx`, render inside the keyed wrapper, only when not reduced, a `fear-look fear-look-<look>` layer: the `mood-vignette-inset` element for cold, `<MoodFog />` from `@kiroween/skeleton/mood` in a wrapper for fog, and a plain black layer for dim. Remove the old `.fear-overlay-flash` element
    - In `apps/game/src/styles/fear.css` (the file that holds `fear-flash`), remove the `.fear-overlay-flash` rule and add the look rules using only opacity, transform and filter. Keep the `fear-flash` keyframe name and shape (`0%` 0, `14%` 1, `45%` 1, `100%` 0, one `animation: fear-flash <n>ms ... 1` declaration, opacity first). Use 3000 ms, equal to `EVENT_SHOW_MS`. Add `fear-tighten` (scale 1.08 to 1) for cold and `fear-rise` (translate 1rem to 0) for fog. Dim peaks at `rgb(0 0 0 / 0.55)` and sits above the hotspots so their glow goes dark. Override `.mood-vignette-inset` positioning with `.fear-overlay .fear-look-layer { position: absolute; inset: 0 }`, and offset the fog `inset-block-end: 3.5rem`
    - Start the caption with `animation-delay: 400ms` and a 2600 ms duration, keeping the `fear-caption-full` keyframes
    - Replace the caption's opaque `var(--color-surface)` box with a radial scrim (`rgb(0 0 0 / 0.8)` core, transparent edge), extra inline padding and a dark `text-shadow`
    - Hide `.fear-look` under `prefers-reduced-motion: reduce` and `html[data-motion='reduce']`. Keep the existing static `opacity: 1` caption rules so the Batch A fix stays
    - Keep at most one luminance change per second in every look
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 3.7, 3.8, 3.9, 3.10, 3.12, 3.13_

- [x] 4. E4: Book page turn feels like paper
  - [x] 4.1 Start the Turn_Shade from the Book
    - In `skeleton/src/book/Book.tsx`, add local `turnDir` state (`'next' | 'prev' | null`). In `goTo`, when `byReader` is true, the target page differs from `pageRef.current` and the book is paged, set it
    - Clear it with a timer of the `--book-turn-ms` value plus 50 ms (fallback 300 ms). Reset the timer on each turn and clear it on unmount
    - Render `data-turn` on the `.book-viewport`, `undefined` when idle, so rest markup is unchanged
    - Leave page position logic, anchors and the Batch A and D controls unchanged. This is the only file besides `book.css` that may change
    - _Requirements: 4.4, 4.5, 4.6, 4.8, 4.9, 4.10_

  - [x] 4.2 Paint the Turn_Shade in `book.css`
    - In `skeleton/src/book/book.css`, style `.book-viewport::before`: `position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0`, with a slight uniform dim (`rgb(40 25 10 / 0.07)`) and an edge shadow gradient (`rgb(40 25 10 / 0.3)` fading out by 35%)
    - Set `--turn-flip` from `--book-sign` for `[data-turn='next']` and its negation for `[data-turn='prev']`. Animate with `book-turn-shade var(--book-turn-ms) ease-out 1` using only opacity (0, 1 at 40%, 0) and `transform: scaleX(var(--turn-flip))` with a translate
    - Leave the `.book-flow` translate, `--book-turn-ms: 300ms`, the `::after` gutter shadow and the existing reduced-motion block text unchanged
    - Add a new, separate block after the existing one for `@media (prefers-reduced-motion: reduce)` and the `html[data-motion='reduce']` twin: `html[data-book='on'] .book-viewport::before { content: none }`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 4.8, 4.9_

- [x] 5. E5: llms.txt, the one new test, and test pins
  - [x] 5.1 Write the pure builder
    - Create `apps/atlas/src/seo/llms.ts` with `LlmsLegend` and `buildLlmsTxt(origin, legends)` in the style of `buildRobots`. Use one local helper `url = (path) => origin + path`
    - Body, in order: `# Trick or Told`; one paragraph (atlas, game, and that the game cannot be solved without the atlas since answers exist only in the legend chapters), with the legend count taken from `legends.length`; `## Legends` with one line per legend, `- [Title](url): hook`; `## Game` with the game URL and the tutorial
    - Collapse whitespace runs in hooks to one space and escape `[` and `]` in titles
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [x] 5.2 Add the route
    - Create `apps/atlas/src/routes/llms[.]txt.ts`, shaped like `robots[.]txt.ts`. `GET` reads `listLegends(database())` and `getEnv().publicOrigin`, and returns status 200 with `content-type: text/plain; charset=utf-8` and `cache-control: public, max-age=3600`
    - On a database error, return 503 `text/plain` with body `Unavailable` and no error detail
    - Let the route tree regenerate. Do not add the route to `sitemapPaths`, the sitemap or any other list
    - _Requirements: 5.1, 5.2, 5.10_

  - [x] 5.3 Write the single new test
    - Create `apps/atlas/test/llms.test.ts` (Vitest, example based, no network or database): build the text from the 12 ids in `LEGEND_IDS` with fake titles and hooks and a set origin, and assert one `- [Title](<origin>/legends/<id>): hook` line for each of the 12
    - Add no other new test anywhere in the batch
    - _Requirements: 6.1, 6.3_

  - [x] 5.4 Update existing tests pinned to changed text or markup
    - Run `pnpm -r test` once and fix only tests that fail because of an intended change. Expected candidates: tests reading `hall.intro`, `shell.entry.*` or footer text, tests that build a `FearRequest` without `look`, and snapshots of the old caption box
    - Confirm `apps/game/test/fear-ui.test.ts`, `apps/atlas/test/anchors-once.test.tsx` and `apps/atlas/test/book-component.test.tsx` pass without edits. Edit them only if a real pin breaks
    - Keep a list of each updated test and its reason for the handover
    - Do not weaken the property tests for the generator, RNG or lead logic
    - _Requirements: 6.2, 6.3, 6.4_

- [x] 6. Verify
  - [x] 6.1 Run the type check and the test suite once
    - Load `.env` into the shell only and print or write no value from it
    - Run `pnpm -r typecheck` and `pnpm -r test` (single run, no watch mode) once each and record pass or fail
    - If a failure comes from a protected area, stop and report
    - _Requirements: 8.1, 8.2, 7.1, 7.2_

  - [x] 6.2 Run the existing browser checks
    - Run the atlas book browser check once, and the Game browser check once if one exists. Record the results
    - _Requirements: 8.2_

  - [x] 6.3 Capture screenshots, fear frames, reduced-motion and llms.txt evidence
    - Write a throwaway Playwright script in `.debug/batch-e/` (not committed, no secrets). At 390x844 and 1280x800 capture the Entry_Page with the new line, the atlas footer, the Hall bottom line, and the Book mid-turn for next and previous
    - Record a short video or 4 to 6 frames (0, 400, 1200, 2600 ms) of each of the three Fear_Looks in the tutorial. The tutorial plays only `fe-1` (cold), so for fog and dim set the look on the live overlay or play a world scene whose events map to them
    - Check E3 and E4 once with `prefers-reduced-motion: reduce`: no look layer, no shade, caption visible
    - Compute the caption contrast from the real token values against a white scene backdrop and confirm at least 4.5:1. If it fails, raise the scrim core alpha only
    - Fetch `/llms.txt` from the local build and record the status, the content type and the line count. Confirm it is absent from `/sitemap.xml`
    - _Requirements: 8.3, 8.4, 8.5, 8.6, 3.8, 3.10, 5.1, 5.10_

- [x] 7. Handover docs
  - [x] 7.1 Write `docs/batch-e-handover.md`
    - For each of E1 to E5: done or partly done, files touched, check results, test pins updated, and anything weak
    - Include the Verify results (typecheck, tests, browser checks, screenshot and frame locations, `/llms.txt` status, content type and line count) and the full list of changed files
    - Contain no secret, token or connection string
    - _Requirements: 8.7, 8.10, 6.2, 6.4_

  - [x] 7.2 Add a short entry to `docs/kiro-usage.md`
    - Read the file first and follow its existing entry format. Append a short Batch E entry
    - Make no commit and no push
    - _Requirements: 8.8, 8.9_

## Notes

- Every task is required. No test sub-task is optional, and the only new test is the one in 5.3.
- The design has no Correctness Properties section, so there are no property-test tasks.
- Execute no commits or pushes in any task.
- Task 6 runs the checks and the screenshot script once; fixes found there go back to the owning task's files.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1", "4.1", "5.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "3.2", "3.3", "4.2", "5.2"] },
    { "id": 2, "tasks": ["5.3"] },
    { "id": 3, "tasks": ["5.4"] },
    { "id": 4, "tasks": ["6.1"] },
    { "id": 5, "tasks": ["6.2"] },
    { "id": 6, "tasks": ["6.3"] },
    { "id": 7, "tasks": ["7.1"] },
    { "id": 8, "tasks": ["7.2"] }
  ]
}
```
