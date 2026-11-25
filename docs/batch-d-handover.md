# Batch D (polish) handover

Spec: `.kiro/specs/batch-d-polish/`. Presentation changes only. Nothing committed or pushed.

## Per item

| Item | Result | Files |
|---|---|---|
| D1 source codes as links | done | `apps/atlas/src/components/sourceCodes.ts` (new), `StoryText.tsx`, `LegendPage.tsx`, `MetaList.tsx`, `apps/atlas/src/i18n/en.ts`, `apps/atlas/src/styles.css` |
| D2 Ending: next legend, best score, score line, focus trap | done | `apps/game/src/lib/ending.ts` (new), `WorldPlay.tsx`, `routes/world.$target.tsx`, `server/functions.ts` (`getWorldInfo.doors`) |
| D3 header menu | done | `GameHeader.tsx`, game `styles.css` |
| D4 scene stage transition | done | `SceneViewer.tsx`, `scene.css` |
| D5 Hall (heading, rows, lock badge) | done | `routes/index.tsx`, `Hall.tsx`, `scene.css` |
| D6 auth forms on the shared UI layer | done | `Field.tsx`, `sign-in.tsx`, `sign-up.tsx` |
| D7 hover gate and pressed state | done | `skeleton/src/design/ui.css`, `mood.css` |
| D8 one disabled look | done | `skeleton/src/book/book.css` (rule removed), `scene.css` |
| D9 long names | done; D9.1 (30rem box minimum) skipped, already fixed in Phase 7 | `scene.css`, `SceneNav.tsx` |
| D10 account page (guest titles, sign-in button, narrow table) | done | `routes/account.tsx`, `styles.css`, `server/functions.ts` (`getAccount.titles`) |

Also: `apps/game/src/i18n/en.ts` (new keys). No `Book.tsx` change was needed: it already listens for `hashchange`.

## Checks

- `pnpm -r typecheck`: clean (re-run after the last fix). Skeleton 916 passed + 8 expected fail; atlas 305 passed; game 401 passed (after the pin below).
- Atlas book browser check: 303 passed, 0 failed, 2 skipped (`.debug/batch-d/book-check.json`).
- No game browser check was run (`apps/game/scripts/browser-check.mjs` needs a signed-in cookie or sign-up for most passes).
- Playwright script `.debug/batch-d/verify.mjs` (+ `account.mjs`), screenshots in `.debug/batch-d/shots/` (account-with-runs shots are in `.debug/batch-d/.debug/batch-d/shots/`). All of these passed:
  - D1: S1 click lands on `#source-s1` in view, paged and one-page, at 390 and 1280; map and legend cards hold no `S<n>` / `ch-<n>`.
  - D4: `.scene-stage` is 0.25s normally, 0s while dragging, 0s under `prefers-reduced-motion` and `data-motion='reduce'`.
  - D7: no `:hover` rule applies under `hover: none`; `.btn` transform is `matrix(0.97,0,0,0.97,0,1)` while pressed.
  - D8: book control and scene disabled buttons are dashed, opacity 1 (book controls already carry `.btn`, no fix needed).
  - D3: menu top equals header bottom (56 px) at 390 and 320; menu closes after choosing a link.
  - D5: one `h1` in the Hall, no horizontal scroll at 390, 667, 1280.
  - D6: first field in error gets focus; password toggle flips the type; toggle is 44x44; no "forgot" text.
  - D9: 60-character scene name and door titles give no horizontal scroll at 320 and 390; the tab shows an ellipsis and has a `title`.
  - D4/D9: at 667x375 the dock is visible with no page scroll.
  - D10: guest account at 390 and 1280 has no horizontal scroll, shows the sign-in button and legend titles (not ids). Runs were seeded in browser localStorage only (a fixture; no content write).
- `git status`: no change in `content/`, `assets/`, `skeleton/src/score|generator|play|db`. No `opacity` in disabled rules, no `forgot` string, no physical CSS property added (only a `max-width` media query).

## Bug found and fixed in verify

The Sources list rendered a linked code (S10) inside an external-source `<a>`, giving nested anchors (S3 entry). Fixed in `LegendPage.tsx`: the title inside the external link renders with `SourceCodesContext` set to `null`. Confirmed in the DOM after rebuild.

## Test pins updated (task 11)

- `apps/game/test/image-cdn.test.tsx:62` "the Hall passes its own sizes": expects `clamp(48rem, 170.67dvh, 106.67rem)` (Hall scene height is `clamp(18rem, 64dvh, 40rem)`, width 8/3 of it). `HALL_SCENE_SIZES` in `SceneViewer.tsx:63` has the same value. This is the only pin changed.

## Not done / weak points

- **Win overlay not captured.** The crude lore-matching solver never won a run in 12 fresh attempts (wrong answers fill the fear meter), so there are no win screenshots and the Ending focus trap, score line and "Next legend" button were not checked in a browser. They are covered only by typecheck and unit tests. A signed-in or seeded run would be needed.
- Before/after captures for D5/D7 were not taken (no production build to compare against).
- The header menu button is hidden from 40rem, so the 667x375 menu check does not apply; checked at 390 and 320.
- UX-06: `--app-header-h` still disagrees with the real game header height. The menu uses the measured `--game-header-h` with `--app-header-h` as fallback.
- The guest sign-in `reason: 'world'` search value on "Next legend" is an assumption.
- Two server-function reads were added (`getWorldInfo.doors`, `getAccount` guest `titles`). Both are read-only and need a check in a deployed build.
- `HALL_SCENE_SIZES` changed, so the Hall image `sizes` hint changed with the new Hall scene height.
- The `scene.css` selector from task 7 (`.hall-bar`, `.hall-lines`, hidden scene heading) and the `world.nextLegend` catalog key need a look in review.
- At 320 px the header wraps "The atlas" and the "Reduce motion in scares" label is clipped (seen in `long-world-320.png`). Not touched by this batch.
- Throwaway dev servers ran on 3420 (proxy), 3421, 3422 and were stopped. Ports 3305/3306 were not used.
## Task 13: win overlay render check and Hall copy
- **Win overlay now checked.** The real `<Ending>` from `WorldPlay.tsx` was rendered to HTML with `renderToStaticMarkup` (esbuild bundle with `useT` aliased to the English translator, so no router). The HTML was injected into the built game page (`/game/sign-in` on port 3430) with the route CSS (`play-*.css`, `world-*.css`) linked in. The page behind was hidden to stand in for the real scene screen, which fits the viewport. Scripts: `.debug/batch-d/win-render.tsx`, `win-stub-useT.ts`, `win-up.sh`, `win-shoot.mjs`; results in `win-results.json`.
- Props: won `view` (score 320, seed b7k2-91xq), Banshee, relic Lamp of Vigil; variant A `best` 410 and `next` world Baba Yaga; variant B `best` null and `next` signin.
- Measured: no horizontal scroll at 390x844, 667x375 and 1280x800 (document and panel scrollWidth equal client width). The page behind never scrolled (0). Overlay is `position: fixed`.
- At 667x375 the panel scrolls inside itself (392 px of content in 309 px); the three buttons start below the fold and are reachable after scrolling (link bottom at 326 of 375).
- Hall, Next legend and Read the full legend are each 44 px high in every size and both variants. Score line: "Score: 320", then "Score: 100 per solved puzzle, 50 for breaking the curse, minus 15 per Hint 2 and 10 per wrong answer." (real `SCORE` values).
- No component or CSS change was needed. The "Next legend" button text does not name the legend (unchanged).
- Screenshots: `.debug/batch-d/shots/win-{world,signin}-{390x844,667x375,1280x800}.png`, plus `win-*-667x375-scrolled.png` (panel scrolled to the buttons).
- Copy: `hall.study.line` in `apps/game/src/i18n/en.ts` now ends with a full stop. No test pinned that string.
- `pnpm --filter @kiroween/game typecheck`: clean. `pnpm --filter @kiroween/game test`: 43 files, 401 tests passed.
- Task 14: `world.score.how` in `apps/game/src/i18n/en.ts` now starts "How scoring works:" instead of "Score:" (placeholders and the rest unchanged; no test pinned the old start).
- The game server on 3430 was stopped. 3305/3306 not used. The "Win overlay not captured" weak point above is resolved by this section (rendered with test props, not from a live run).
