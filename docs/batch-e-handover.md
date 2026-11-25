# Batch E handover: Feel

Spec: `.kiro/specs/batch-e-feel/`. Batch E changes copy, CSS and one small route. No game rules, scoring, fear amounts, pacing, hint charging, generator, play engine, `content/`, `assets/` or database were touched. `skeleton/src/play/fear.ts`, `fearTable.ts`, `fearPlayer.ts` are unmodified. No commits or pushes were made. No secrets appear in this document or in the changes.

## Status per item

### E1: Settle the names. Done

- Removed the "placeholder name" comment in the atlas catalog and added `shell.entry.names` = "Told is the atlas. True is the game."
- Rendered as a muted, wrapping `<p class="shell-names">` right after `.shell-tagline` on the Entry_Page.
- Files: `apps/atlas/src/i18n/en.ts`, `apps/atlas/src/routes/index.tsx`, `apps/atlas/src/styles.css`.
- `styles.css` was also touched, which the task text did not list: new `.shell-names` rule, `--shell-head-h` raised from 6.5rem to 7.75rem so the two cards stay on the first screen at 390x844, and `.shell-names` hidden together with `.shell-tagline` in the compact-height block.
- Checks: Entry_Page screenshots at 390x844 and 1280x800 in `.debug/batch-e/shots63/`.
- Test pins updated: none needed.
- Weak: the head height is a fixed value. A longer translation of the names line could push the cards down.

### E2: State the hook in the product. Done

- Game: `hall.intro` reworded. Added `shared.line.before/engine/after/href/external`. Shared_Line with Engine_Link added under the doors in the Hall.
- Atlas: same five keys, and a fourth footer `<p>` in `__root.tsx` with the same link.
- Engine_Link: `rel="noopener noreferrer"`, class `link`, no `target`, `↗` marker with `aria-hidden`, sr-only external text.
- Files: `apps/game/src/i18n/en.ts`, `apps/game/src/components/Hall.tsx`, `apps/atlas/src/i18n/en.ts`, `apps/atlas/src/routes/__root.tsx`.
- Batch E fix made during verify: the Hall link got `min-h-11` (44 px target) in `Hall.tsx`.
- Test pins updated: none needed.
- Weak: the link target is the README anchor `#how-it-fits-together` on GitHub. If that heading is renamed the link lands at the top of the README.

### E3: Fear events with distinct looks. Done

- `fearLookOf(legendId, id)` returns `cold`, `fog` or `dim`. It is pure and stable per legend and event. It uses no RNG, no `Math.random` and no clock.
- `FearRequest` gained `look`. Both producers set it (world route and tutorial room).
- `FearOverlay` draws a `fear-look fear-look-<look>` layer (inset vignette for cold, `MoodFog` for fog, black layer for dim). The layer is not rendered when motion is reduced. The old `.fear-overlay-flash` element is gone.
- The caption starts at 400 ms and runs 2600 ms. It now sits on a radial dark scrim with a text shadow instead of an opaque box. Static `opacity: 1` caption rules for reduced motion are kept (Batch A fix).
- Files: `apps/game/src/layout/fearEvents.ts`, `apps/game/src/routes/world.$target.tsx`, `apps/game/src/components/TutorialRoom.tsx`, `apps/game/src/components/FearOverlay.tsx`, `apps/game/src/components/fear.css`.
- Note: the spec said `apps/game/src/styles/fear.css`. The file actually lives at `apps/game/src/components/fear.css`, and that is the file edited.
- Note: the caption padding uses `var(--space-8, 3rem)`. I checked that `--space-8` exists. It is defined as `4rem` in `skeleton/src/design/tokens.css`, so the 3rem fallback is never used. The fallback is harmless and could be dropped.
- Caption contrast: 4.87:1 against a white scene backdrop (minimum 4.5:1), so the scrim alpha was not raised.
- Checks: fear frames at 0, 400, 1200 and 2600 ms for each look, and a reduced-motion check (no look layer, caption visible), in `.debug/batch-e/shots63/`.
- Test pins updated: none needed. `apps/game/test/fear-ui.test.ts` passes unedited.
- Weak: the tutorial plays only `fe-1` (cold), so fog and dim frames were captured by setting the look on the live overlay.
- Weak: the look depends on the order of `FEAR_EVENTS`. Reordering it changes looks. A comment in `fearEvents.ts` says new legends must be appended.

### E4: Book page turn feels like paper. Done

- `Book.tsx`: local `turnDir` state (`next` or `prev`), set in `goTo` only for reader-initiated turns to a different page in paged mode. It is cleared by a timer of `--book-turn-ms` plus 50 ms (300 ms fallback). `data-turn` is rendered on `.book-viewport` and is undefined at rest.
- `book.css`: `.book-viewport::before` Turn_Shade animated with opacity and transform only. Direction is mirrored through `--turn-flip` (follows `--book-sign`, so RTL works). A separate reduced-motion block (media query and `html[data-motion='reduce']`) sets `content: none` when the book is on.
- Files: `skeleton/src/book/Book.tsx`, `skeleton/src/book/book.css`.
- Checks: mid-turn screenshots for next and previous in `.debug/batch-e/shots63/`. Reduced-motion check shows no shade.
- Test pins updated: none needed. `anchors-once.test.tsx` and `book-component.test.tsx` pass unedited.
- Weak: the shade is a timed overlay, not tied to the real translate progress. If `--book-turn-ms` changes, the 50 ms margin still covers it.

### E5: llms.txt and tests. Done

- `buildLlmsTxt(origin, legends)` in `apps/atlas/src/seo/llms.ts`. Output has the title, one paragraph, a `## Legends` list (one `- [Title](url): hook` line per legend) and a `## Game` section.
- One source fix: `llms.ts` uses `translate('en', 'app.title')` for the product name, because the existing product-name test forbids the literal string in source.
- Route `apps/atlas/src/routes/llms[.]txt.ts`: 200 with `text/plain; charset=utf-8` and `cache-control: public, max-age=3600`. A database error returns 503 `Unavailable` with no detail. The route is not in the sitemap.
- The single new test: `apps/atlas/test/llms.test.ts` (12 legend lines, one per `LEGEND_IDS` entry).
- `apps/atlas/src/routeTree.gen.ts` was regenerated for the new route. It already had uncommitted modifications before this batch, so its diff (21 lines added) is not purely from Batch E. Review it before committing.
- Test pins updated: no existing test file was modified (`git status` shows only the new test file under test paths).
- Weak: the legend count and list come from the database at request time, so the file is only as correct as the imported content.

## Verify results

- Typecheck (`pnpm -r typecheck`): pass.
- Tests (`pnpm -r test`): skeleton 916 pass plus 8 expected fail, atlas 306 pass, game 401 pass.
- Atlas book browser check: full run 288 PASS, 0 FAIL, then the run hung after `keepers-note@390`. `keepers-note` run alone: 50 pass. The hang is not explained.
- Game browser check: 4 failures remain. They are not confirmed as pre-existing, since I did not run the check on a clean tree:
  1. keyboard flow timeout
  2. Hall scene height 540 vs 576
  3. tutorial candle tap
  4. reduced-motion opacity-only animation
- Batch E fixes made to the browser check and the Hall:
  - `Hall.tsx`: Hall link `min-h-11`.
  - `apps/game/scripts/browser-check.mjs`: selector `.fear-overlay-flash` changed to `.fear-look`.
- Evidence: `.debug/batch-e/shots63/` holds screenshots, fear frames and `results.json`. `.debug/` is a throwaway folder and is not meant to be committed.
- Caption contrast: 4.87:1.
- `/llms.txt`: status 200, `text/plain; charset=utf-8`, 23 lines, 12 legends, absent from `/sitemap.xml`.

## Changed files

Modified (from `git status`):

- `apps/atlas/src/i18n/en.ts`
- `apps/atlas/src/routeTree.gen.ts` (regenerated; had earlier modifications)
- `apps/atlas/src/routes/__root.tsx`
- `apps/atlas/src/routes/index.tsx`
- `apps/atlas/src/styles.css`
- `apps/game/scripts/browser-check.mjs`
- `apps/game/src/components/FearOverlay.tsx`
- `apps/game/src/components/Hall.tsx`
- `apps/game/src/components/TutorialRoom.tsx`
- `apps/game/src/components/fear.css`
- `apps/game/src/i18n/en.ts`
- `apps/game/src/layout/fearEvents.ts`
- `apps/game/src/routes/world.$target.tsx`
- `skeleton/src/book/Book.tsx`
- `skeleton/src/book/book.css`

New:

- `apps/atlas/src/routes/llms[.]txt.ts`
- `apps/atlas/src/seo/llms.ts`
- `apps/atlas/test/llms.test.ts`
- `docs/batch-e-handover.md` (this file)
- `.kiro/specs/batch-e-feel/` (spec)
- `.debug/batch-e/` (throwaway evidence)

Diff total for modified tracked files: 15 files, 200 insertions, 23 deletions (before this document).

## Open items

- Confirm the 4 game browser-check failures on a clean checkout. Done: see the table below.
- Find why the atlas book check hangs after `keepers-note@390` in a full run.
- Task 7.2 (entry in `docs/kiro-usage.md`) is still to do.

### Game browser-check failures: baseline (54d5af4, Batch D) vs Batch E

Same command both times: `browser-check.mjs --only keyboard,touch,motion`, built servers. Both runs: 23 passed, 4 failed.

| Check | Baseline 54d5af4 | Batch E |
|---|---|---|
| Keyboard flow ("keyboard check ran to the end") | FAIL, timeout waiting for tutorial route | FAIL, same |
| Hall scene height (expected 576) | FAIL, 540.16 at 844 inner height | FAIL, 540.16 |
| Tutorial candle tap lights it | FAIL | FAIL |
| Reduced motion "only the opacity fade runs" | FAIL, `[]` | FAIL, `[]` |

- Keyboard flow: pre-existing, not caused by Batch E.
- Hall height: pre-existing, not caused by Batch E.
- Candle tap: pre-existing, not caused by Batch E.
- Reduced motion: pre-existing, not caused by Batch E.
