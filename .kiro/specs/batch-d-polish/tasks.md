# Implementation Plan: batch-d-polish

## Overview

Language: TypeScript (strict), React 19, plain CSS with logical properties and the shared tokens. The plan makes the ten polish items D1 to D10 as one task per file group, so that no two tasks edit the same file. Tasks in the first wave are independent. The second wave wires the Hall, the Ending, the header and account page, and the auth forms. Then the existing pins are updated, and exactly one Verify task runs the checks and writes the handover. No task is optional and no test file is added. No suite runs before Verify.

Boundaries: do not change game logic (rules, scoring math, fear, hint charging), the puzzle generator, the RNG, the play engine, `content/`, `assets/` or the database. Only presentation changes. Never write into `content/` or `assets/`. Do not change the value of `SCORE` or any scoring code; `SCORE` is only read. Use logical CSS properties only (`inline`/`block`, `ms-*`, `ps-*`, `text-start`), tokens from the shared design layer and 44 px targets. Every new interactive transition uses `calc(var(--motion) * Nms)` or an explicit reduced-motion case. No new UI string is hardcoded: it comes from the catalog. No secret in any file. If a task finds that an item would need a change inside the boundaries, it leaves that item unchanged and records it as a blocker for the handover. Do not commit or push.

Already fixed by Phase 7: D9 part 1 (the `30rem` scene box minimum is gone). Task 6 confirms it and changes nothing for it.

## Tasks

- [x] 1. Atlas: source codes become links (D1)
  - Create `apps/atlas/src/components/sourceCodes.ts` with `CodeSegment`, `CodeIndex`, `splitCodes(text, index)` and `stripCodes(text)` as in the design (links only for codes that have a Source_Entry, chapter references only when `${legendId}--ch-<n>` is a chapter anchor, closing-only groups such as `..., S8)` handled, never throws)
  - In `apps/atlas/src/components/StoryText.tsx` add `SourceCodesContext` (default `null`); in `Tokens`, pass plain text tokens through `splitCodes` and render `source` and `chapter` segments as `<a className="source-code link">` with the visible text unchanged and `aria-label` from `t('legend.sourceCodeName', { n, title })` for sources; leave `em` and `dramatization` tokens as they are
  - In `apps/atlas/src/components/LegendPage.tsx` provide the context from `legend.sources` (lower-cased id to `stripMarks(title)`) and `legend.chapters` anchors; give each Source_Entry `li` `id="source-<id in lower case>"` and `className="source-entry"`
  - In `apps/atlas/src/components/MetaList.tsx` render `region` and `era` through the context-aware text; with no provider (the Map_Card in `WorldMap.tsx`) render `stripCodes(value)`; do not edit `WorldMap.tsx` or `LegendList.tsx` (its cards show no codes today; confirm that and record it)
  - In `apps/atlas/src/i18n/en.ts` add `legend.sourceCodeName` ("Source {n}: {title}"); add it to `ar.ts` only if that file holds every other `legend.*` key
  - In `apps/atlas/src/styles.css` add `.source-entry:target` (inline-start border in the accent colour, `scroll-margin-block-start`) and a hit area of at least 24 px for `.source-code`, with no hover-only style
  - Check in the browser (a built atlas on `/legends/baba-yaga`, paged and one-page view) that a click on `S1` lands on its Source_Entry; if the paged book does not turn to it, add a `hashchange` listener in `skeleton/src/book/Book.tsx` that holds the hash target and re-measures as the mount path does; make no other skeleton change
  - Do not edit anything under `content/`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

- [x] 2. Game catalog strings
  - In `apps/game/src/i18n/en.ts` add `world.next` ("Next legend"), `world.score.how` ("Score: {slot} per solved puzzle, {curse} for breaking the curse, minus {hint} per Hint 2 and {wrong} per wrong answer."), `form.showPassword`, `form.hidePassword` and `error.passwordRequired`; reuse `account.bestScore`, `nav.signIn`, `error.emailInvalid` and the `account.col*` keys as they are
  - If `apps/game/src/i18n/ar.ts` holds every key of `en.ts`, add the same keys there with Arabic text; otherwise leave it and let the fallback apply
  - Add no other key and change no existing string
  - _Requirements: 2.5, 2.7, 6.5, 6.6_

- [x] 3. Shared UI layer: hover gate and pressed state (D7)
  - In `skeleton/src/design/ui.css` move every `:hover` rule (`.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.link`, `.nav-item`) inside `@media (hover: hover) and (pointer: fine)`; add `.btn:active:not(:disabled):not([aria-disabled='true'])` with `transform: translateY(1px) scale(0.97)` and give `.btn-ghost:active` a tint; make sure the disabled rule (`transform: none`) still wins; add `-webkit-tap-highlight-color: transparent` to `.btn`; keep the transition on `calc(var(--motion) * 80ms)`
  - In `skeleton/src/design/mood.css` move `.mood-hotspot-glow:hover` inside the same media query and add `.mood-hotspot-glow:active` with the same glow; keep the existing focus rule and the reduced-motion cases
  - Do not edit the disabled rule of `ui.css` beyond keeping it winning over `:active`
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 4. Book controls: one disabled look (D8, book part)
  - In `skeleton/src/book/book.css` delete the rule `.book-controls button[aria-disabled='true']` (opacity and cursor); the buttons are `.btn`, so `ui.css` styles them
  - Change nothing else in the file
  - _Requirements: 8.2, 8.3_

- [x] 5. Server functions: read-only data for the Ending and the account page (D2, D10)
  - In `apps/game/src/server/functions.ts`, `getWorldInfo`: add `doors` (`{ id, title, open }[]`) built from `getCatalogue()` and `canEnter({ kind: 'legend', id }, visitor, guestWorld)` exactly as `getHall` builds its doors, in the same order; add no answer, role or run field
  - In `getAccount`, guest branch: return `{ signedIn: false as const, titles }` where `titles` maps catalogue id to title (read only)
  - Touch no play function, no store, no schema and no scoring code
  - _Requirements: 2.1, 2.2, 2.3, 10.1, 11.1_

- [x] 6. Scene CSS, viewer and tabs (D4, D5 styles, D8 scene part, D9)
  - In `apps/game/src/components/SceneViewer.tsx` add a `dragging` state set true when a drag becomes active and false in `endDrag`, and `data-dragging={dragging || undefined}` on the viewport; leave the pan math untouched
  - In `apps/game/src/components/SceneNav.tsx` wrap each tab name in `<span className="scene-tab-name">` and add `title={stripMarks(name)}` to the tab button
  - In `apps/game/src/components/scene.css`:
    - D4: `.scene-stage { transition: transform calc(var(--motion) * 250ms) ease-out; }` and `.scene-viewport[data-dragging='true'] > .scene-stage { transition: none; }`
    - D5: `.hall-scene { --scene-h: clamp(18rem, 64dvh, 40rem); }`; make `.scene-hotspot-badge[data-kind='lock']` 18x14 px with a muted `color-mix` of accent and bg, no ring shadow, and a matching shackle; leave the `free` and `signin` badges as they are; add `.hall-bar` (one row: heading and start button, wraps on phones) and `.hall-lines` (two short muted lines)
    - D8: in `.scene-button:disabled, .scene-button[aria-disabled='true']` remove `opacity` and keep `cursor: not-allowed`
    - D9: `.scene-tab { max-inline-size: 14rem; }`, `.scene-tab-name { min-inline-size: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }`, `.scene-title { min-inline-size: 0; overflow-wrap: anywhere; }`, `.hall-door-link { max-inline-size: 100%; min-inline-size: 0; overflow-wrap: anywhere; text-align: start; }`
    - D9.1: confirm no `min-block-size: 30rem` remains on `.scene-screen` or the scene box and add none; record "already fixed" for the handover
  - Logical properties only; the pan `translateX` stays the documented physical exception
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.3, 5.5, 5.6, 5.7, 8.1, 8.3, 9.1, 9.2, 9.3, 9.4_

- [x] 7. Hall: heading, rows and door names (D5, D9)
  - In `apps/game/src/routes/index.tsx` replace the `h1` "Trick or True" with one visible heading `t('hall.heading')` at the same level, drop the duplicate title, and collapse the intro, greeting and notice lines into one `.hall-lines` block of at most two short lines (keep the catalog strings; the guest "Sign in" button stays)
  - In `apps/game/src/components/Hall.tsx` put the start button into the `.hall-bar` row with the heading (the route passes the heading or `HallView` renders the bar; choose one and keep one `h1` on the page); visually hide the scene's own heading with the clip rule `.scene-screen .scene-heading` uses, keeping its id for focus; give the doors-list `h2` the `--type-h2` size; render each door chip as `className="btn btn-ghost hall-door-link"` with `title={d.title}`; keep the door state logic, `hallDoorState` use and which doors are locked unchanged
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7, 9.3_

- [x] 8. Ending: next legend, best score, score line (D2)
  - Create `apps/game/src/lib/ending.ts` with `EndingDoor`, `EndingNext`, `nextDoor(doors, currentId, signedIn)` and `bestOf(runs, legendId)` as in the design (pure, no I/O)
  - In `apps/game/src/routes/world.$target.tsx`, once `state.view?.ended?.status === 'won'`, read the best score once (signed in: `getAccount()` and the matching `completed` entry; guest: `bestOf(readGuestRuns(window.localStorage), info.id)` in an effect), compute `next` from `info.doors`, and pass `best`, `next` and `onNext` to `WorldPlay`; a failed read leaves `best` null; for a guest the next action navigates to `/sign-in` with `search: { reason: 'world' }`, for a signed-in player to `/world/$target`
  - In `apps/game/src/components/WorldPlay.tsx` add optional props `next`, `best`, `onNext` to `WorldPlayProps` and `Ending`; show `account.bestScore` under the score line when `best !== null`; show `world.score.how` with `SCORE` values from `@kiroween/skeleton/client`; add the "Next legend" button between Hall and "Read the full legend"; rewrite the focus trap to cycle an ordered list of the rendered controls with Tab and Shift+Tab; keep Escape ignored; do not add a live score to the dock; do not change how the score is computed or stored
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

- [x] 9. Header menu and account page (D3, D10)
  - In `apps/game/src/components/GameHeader.tsx` add a ref on the `header` and on the menu; measure the header block size into `--game-header-h` on `document.documentElement` in a layout effect with a `ResizeObserver` (guarded); close the menu with `hidePopover()` when a link or button inside it is chosen (sign-out too)
  - In `apps/game/src/styles.css` set `.nav-menu:popover-open { inset-block-start: var(--game-header-h, var(--app-header-h)); }` and add the `.run-table` narrow layout in `@layer components`: below `40rem` hide the `thead` visually, make each `tr` a grid block with the title first and `td::before { content: attr(data-label) }` labels for status, score and date; from `40rem` the table is as it is today; do not change `--app-header-h`
  - In `apps/game/src/routes/account.tsx` read `titles` from the loader for guests and show `titles[r.legendId] ?? r.legendId`; add `<Link to="/sign-in" className="btn btn-primary">` with `t('nav.signIn')` after the guest note; give the table `className="run-table"` and each `td` a `data-label` from the existing `account.col*` strings
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 10.1, 10.2, 10.3, 10.4_

- [x] 10. Auth forms on the shared UI layer (D6)
  - In `apps/game/src/components/Field.tsx` use `className="field"` on the input (remove the Tailwind border, radius and colour classes and the unused `required`); replace `buttonClass` and `secondaryButtonClass` with `'btn btn-primary'` and `'btn btn-secondary'` (keep the exports); add a show/hide button for `type="password"` fields (`btn btn-ghost btn-icon`, `aria-pressed`, `aria-controls`, `aria-label` from `form.showPassword` / `form.hidePassword`) that flips the input between `password` and `text`; add an optional `inputRef`
  - In `apps/game/src/routes/sign-in.tsx` and `sign-up.tsx` wrap the content in `panel page-narrow`; keep per-field errors under their field with `aria-invalid` and `aria-describedby`; after a failed submit focus the first element with `aria-invalid="true"`, else the form error (`role="alert"`, `tabIndex={-1}`); on sign-in check an empty email (`error.emailInvalid`) and an empty password (`error.passwordRequired`) before calling the server; make the Google button `btn btn-secondary` and the switch link `link`; add no "forgot password" link or flow
  - Keep every control at least 44 px high
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [x] 11. Update existing pins
  - Search `apps/atlas/test`, `apps/game/test`, `skeleton/test` and the scripts under `apps/*/scripts` for pins on what this batch changed: the Ending actions, props and focus trap; the Hall `h1` text and the heading order; `.hall-scene` scene size and badge size; `.scene-stage` CSS and the viewport markup; tab markup in `SceneNav`; the disabled rules in `scene.css` and `book.css`; hover rules in `ui.css` and `mood.css`; the `Field` classes and `buttonClass`; `getWorldInfo` and `getAccount` result shapes; `MetaList` text and the Sources `li`; the header menu CSS
  - Update each pin to the new behaviour, or delete it only when what it checked is gone; write no new test file and no new test case; keep a list of every changed pin (file and line) for the handover
  - _Requirements: 11.2_

- [x] 12. Verify
  - Load `.env` into the shell only, the same way as before (never print or write a value). Build and serve the atlas and the game as in `.debug/batch-c/` (`up.sh` and the same proxy for `/game/**`)
  - Run once: `pnpm -r typecheck`, `pnpm -r test`, the atlas book browser check (`pnpm --filter @kiroween/atlas test:browser -- --base http://localhost:3001 --out .debug/batch-d/book-check.json`), and the game browser check if one exists; fix any failure this batch caused and re-run only what failed
  - Write the throwaway Playwright script in `.debug/batch-d/` that takes screenshots at 390x844, 667x375 and 1280x800 of: a legend page with linked source codes and its Sources list after clicking one code; the win overlay (reach it as earlier phases did, or render it with a test world); the Hall; sign-in with a field error; the account page as a guest; the world scene at 667x375; the open header menu and the same page after choosing a link in it; before and after captures for D5 and D7 where cheap (before from the last production build, after from the local build). Look at every screenshot
  - The script also checks: the `S1` link target exists and is in view after the click (paged and one-page view); the Map_Card text holds no `S<n>` or `ch-<n>`; `.scene-stage` computed `transition-duration` is about `0.25s` normally, `0s` while dragging and `0s` under `prefers-reduced-motion: reduce` and under `data-motion='reduce'`; the header menu closes after choosing a link and its top equals the header's bottom edge; with `hover: none` emulation no hover rule applies; a `.btn` shows a changed `transform` while pressed; disabled and busy buttons all show the dashed outline and have no `opacity` below 1; at 667x375 the dock is visible without a page scroll; a temporary 60-character scene name, door title and scene title set through the DOM (never in content) cause no horizontal scroll at 320 and 390 px and the tab ends with an ellipsis and has a `title`; the account page at 390 px has no horizontal scroll and shows legend titles; the sign-in page puts focus on the first field in error and the password toggle changes the input type
  - `rg` and `git diff` checks: no change in `content/`, `assets/`, `skeleton/src/score/`, `skeleton/src/generator/`, `skeleton/src/play/`, `skeleton/src/db/`; no `opacity` in disabled rules; no physical CSS property added; no `forgot` string added
  - Write `docs/batch-d-handover.md`, short: per item D1 to D10 the result (done, skipped as already fixed, or partly done), files touched, check results, test pins updated (from task 11), blockers if any, and anything weak (at least: `--app-header-h` still disagrees with the real game header height (UX-06), the guest sign-in reason is an assumption, the two server-function reads)
  - Add a short entry to `docs/kiro-usage.md`
  - Do not commit or push
  - _Requirements: 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 4.1, 4.2, 4.3, 7.1, 7.3, 8.1, 9.5, 10.4_

- [x] 13. Win overlay render check and Hall copy
  - Render the `Ending` overlay with test props in a throwaway script in `.debug/batch-d/` (not in `apps/`), inject it into the built game page so the real CSS applies, and screenshot at 390x844, 667x375 and 1280x800 into `.debug/batch-d/shots/win-*.png`; check fit, no horizontal scroll, reachable buttons at 667x375 (page behind must not scroll), the score line in plain English with real `SCORE` numbers, and Hall / Next legend / Read the legend visible and 44 px high; fix anything wrong in the component or CSS and re-shoot
  - In `apps/game/src/i18n/en.ts` add the missing full stop to the Hall line "Start in the study to open the doors"
  - Run `pnpm --filter @kiroween/game typecheck` and `pnpm --filter @kiroween/game test` once, stop every server started, add the results to `docs/batch-d-handover.md`
  - Do not commit or push
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 14. Score line copy
  - In `apps/game/src/i18n/en.ts` change only the start of `world.score.how` from "Score:" to "How scoring works:"; keep the placeholders and the rest of the sentence
  - Do not change `WorldPlay.tsx`, the `SCORE` values or any other string; run `pnpm --filter @kiroween/game typecheck` and `pnpm --filter @kiroween/game test` once; no screenshots; add one line to the "Task 13" section of `docs/batch-d-handover.md`
  - Do not commit or push
  - _Requirements: 2.7_

## Notes

- There are no test-writing tasks and no optional tasks. The design has no Correctness Properties section, so no property tests apply.
- File ownership, so tasks that share a file never run together: `apps/atlas` files only in task 1; `apps/game/src/i18n/*` only in task 2; `ui.css` and `mood.css` only in task 3; `book.css` only in task 4; `server/functions.ts` only in task 5; `scene.css`, `SceneViewer.tsx` and `SceneNav.tsx` only in task 6; `Hall.tsx` and `routes/index.tsx` only in task 7; `WorldPlay.tsx`, `world.$target.tsx` and `lib/ending.ts` only in task 8; `GameHeader.tsx`, the game `styles.css` and `account.tsx` only in task 9; `Field.tsx`, `sign-in.tsx` and `sign-up.tsx` only in task 10.
- Task 7 needs the class names from task 6. Task 8 needs the keys from task 2 and the `doors` field from task 5. Task 9 needs the `titles` field from task 5. Task 10 needs the keys from task 2. Task 11 comes after every code task so its search sees the final code.
- Task 1 may touch `skeleton/src/book/Book.tsx` only for the hash behaviour, and no other task edits that file.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2", "3", "4", "5", "6"] },
    { "id": 1, "tasks": ["7", "8", "9", "10"] },
    { "id": 2, "tasks": ["11"] },
    { "id": 3, "tasks": ["12"] },
    { "id": 4, "tasks": ["13"] },
    { "id": 5, "tasks": ["14"] }
  ]
}
```
