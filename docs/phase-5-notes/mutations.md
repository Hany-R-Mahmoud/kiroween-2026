# Phase 5 mutation checks

Each important new test is checked by breaking its rule by hand, running the test, confirming it fails, and undoing the break by hand.

| Task | Test file | Mutation (what was broken) | Result with mutation | Restored and green |
|---|---|---|---|---|
| 1.4 | `skeleton/test/vercel-config.test.ts` | atlas all-paths rule: `nosniff` changed to `sniff` | 1 failed (`apps/atlas/vercel.json sends the security headers on …`) | yes, 10 passed |
| 1.6 | `apps/atlas/test/pipe-response.property.test.ts` | `pipeline(source, res, cb)` replaced by `source.pipe(res)` | 1 failed (property: uncaught `Stream lifetime exceeded`, server gone) | yes, 2 passed |
| 1.8 | `skeleton/test/rate-limit.property.test.ts` | refusal threshold raised to `limit * 1000` | 1 failed (Property 1, first-`limit`-then-refuse) | yes, 7 passed |
| 1.8 | `skeleton/test/rate-limit.property.test.ts` | `visitorKey` falls back to a shared `'unknown'` key | 1 failed (Property 15, fallback to nothing) | yes, 7 passed |
| 1.9 | `apps/game/test/rate-limit.test.ts` | `TUTORIAL_ANSWER_LIMIT` raised from 30 to 10000 | 2 failed (31st gets 429; refusal text) | yes, 7 passed |
| 1.10 | `skeleton/test/tutorial-lock.property.test.ts` | `tutorialDone` check in `startWorld` removed | 2 failed (Property 12; refusal-then-open) | yes, 4 passed |
| 1.11 | `apps/game/test/serve-build.test.ts` | `listen(port, 'localhost', …)` back to `listen(port, …)` | 1 failed (listens on localhost only) | yes, 5 passed |
| 1.11 | `apps/atlas/test/pipe-response.property.test.ts` | pipeline callback no longer reports unexpected errors | 1 failed (property: real error reported) | yes, 2 passed |
| 2.2 | `skeleton/test/password-script.property.test.ts` | password printed on the failure line | 2 failed (Property 13; CLI psql exit 3) | yes, 5 passed |
| 4.1 | `apps/game/src/components/SceneViewer.tsx` | sprite `img` rendered without the `loadedSceneId === layout.assetId` check (`true ?`) | 4 failed (Property 11: server markup; other-scene sprites; wiring check; viewer.test.ts server markup) | yes, 19 passed |
| 4.3 | `skeleton/test/hero-copy.property.test.ts`, `apps/atlas/test/hero-markup.test.tsx` | `HERO_SMALL_MEDIA` changed from `(max-width: …)` to `(min-width: …)` | 2 failed in skeleton (Property 2, 390 px); 12 failed in atlas (media attribute on each legend) | yes, restored from `/tmp` copy; skeleton 29 and atlas 12 passed |
| 4.4 | `apps/game/test/overlay-not-built.test.ts` | `/*scene-outline*/` appended to a built client file (`dist/client/assets/play-*.js`), after a fresh normal build | 1 failed (has no layout overlay marker) | yes, file restored from a `/tmp` copy; 1 passed |
| 5.2 | `skeleton/test/book-pagination.property.test.ts` | `pageOfOffset` page stride computed with gap 0 (gutter ignored) | 1 failed (Property 4, anchor page and visibility) | yes, restored from a `/tmp` copy; 12 passed |
| 5.2 | `skeleton/test/book-pagination.property.test.ts` | `keyToDelta` `ArrowRight` always `1` (no rtl swap) | 1 failed (Property 6, arrows swap in rtl) | yes, restored from a `/tmp` copy; 12 passed |
| 5.3 | `skeleton/test/book-colors.property.test.ts`, `skeleton/test/theme.test.ts` | `BOOK_INK` fallback lowered from `#2b1d12` to `#8a7a60` | 5 failed in skeleton (Property 8 x2, theme.test book contrast and floor-estimate checks, book-foundations smoke) | yes, restored from a `/tmp` copy; 20 passed |
| 5.5 | `skeleton/test/book-foundations.test.ts` | `--color-glow` remap inside `.book-paper` renamed away | 1 failed (dark-theme colours do not reach the paper) | yes, 6 passed |
| 5.6 | `apps/game/test/book-paper.test.ts` | `applyMotionAttribute` in `apps/game/src/lib/motion.ts` sets `'full'` instead of `'reduce'` | 1 failed (motion.ts sets data-motion=reduce and removes it otherwise) | yes, restored from a `/tmp` copy; 3 passed |
| 5.7 | `apps/atlas/test/anchors-once.test.tsx` | `{children}` rendered twice in `Book.tsx` | failed (every legend and the Keeper's Note: anchor count 2, plus the single-`{children}` check) | yes, restored from a `/tmp` copy (diff clean); 22 passed |
| 5.7 | `apps/atlas/test/anchors-once.test.tsx` | `@media (prefers-reduced-motion: reduce)` block removed from `book.css` | 1 failed (transition is none under prefers-reduced-motion and data-motion) | yes, restored from a `/tmp` copy (diff clean); 22 passed |
| 5.7 | hash handler | `hashchange`/`land` removed from `Book.tsx` | not mutated: no non-browser test can observe it (needs `window.location.hash`, scrolling and focus). Listed for 5.8. | n/a |
| 6.2 | `apps/atlas/test/mood.test.tsx` | candle/fog `animation: none` rule removed from the `@media (prefers-reduced-motion: reduce)` block of `mood.css` | 1 failed (sets every animation to none under prefers-reduced-motion and data-motion=reduce) | yes, restored from a `/tmp` copy (diff clean); 8 passed |
| 6.2 | `apps/atlas/test/mood.test.tsx` | candle cycle `8s` changed to `2s` (7 changes in 2 s = 3.5 a second) | 1 failed (changes brightness at most 3 times a second) | yes, restored from a `/tmp` copy (diff clean); 8 passed |
| 7.3 | `apps/atlas/test/manifest.test.ts` (same file in `apps/game/test`) | manifest icon id `icon-maskable-512` renamed to `icon-maskable-x` | 1 failed (every manifest icon id has a Needs_File row) | yes, restored from a `/tmp` copy; atlas 228 passed |
| 7.3 | `apps/atlas/test/manifest.test.ts` | Needs_File row for atlas `icon-192` deleted | 2 failed (Needs_File row for each icon id; row for a missing icon file) | yes, restored from a `/tmp` copy; atlas 228 passed |
| 8.2 | `skeleton/test/theme-surface.property.test.ts` | `resolveTheme` glow check reverted to background only (`[['background', p.background]]`, 4.5:1) | 2 failed (Property 9 random palettes: glow on surface; fallback order). The twelve-pack and spring-heeled-jack tests still passed: with 4.5:1 on the background alone, `#3d6e8f` already falls back to the base glow, so only the random-palette properties see the missing surface check. | yes, restored from a `/tmp` copy (diff clean); 4 passed |
| 8.3 | `apps/game/test/polish-8-3.test.ts` | Escape branch removed from `dialogKeyAction` (`apps/game/src/lib/focus.ts`) | 1 failed (Escape closes the ending dialog) | yes |

## Task 8.3
- Removed the Escape branch from `dialogKeyAction` (`apps/game/src/lib/focus.ts`): `polish-8-3.test.ts` failed. Restored by hand from `/tmp/focus.ts.8-3`; test passes again.
| 8.4 | `skeleton/test/product-name.test.ts` | title literal added as a comment in `Hall.tsx` | 1 failed (no title literal under apps/game/src) | yes, 5 passed |
| Stop B | `skeleton/test/vercel-config.test.ts` | game `regions` changed to `iad1` | 1 failed (runs functions in pdx1) | yes, 12 passed |
| D3 (5.8) | `apps/atlas/test/book-check-helpers.test.ts` | `atColumnTop` made to accept any finite top (drops the tolerance test) | 1 failed (`reads the indicator, page boundaries and durations`) | yes, 5 passed |
| D3 (5.8) | `apps/atlas/scripts/book-check.mjs` (browser, `every anchor lands visible and focused`) | Book `reflow()` hash page taken from the Anchor box, not its heading (the served pre-fix bundle) | 8 failed (`--versions--` anchors in gumiho, spring-heeled-jack, chupacabra, vetala, yuki-onna) | yes, with the fix patched into the served chunk: 142 passed, 0 failed for those 5 legends |
| 3.2 | `skeleton/test/vercel-config.test.ts` | atlas `/game/**` proxy rule removed, VERCEL=1 rebuild | 2 failed (rule test; built output: /game paths before the server) | yes, 16 passed |
| 3.2 | `skeleton/test/vercel-config.test.ts` | game route rules emptied (no headers), VERCEL=1 rebuild | 3 failed (rule test; built game headers; …) | yes, 16 passed |
| 3.2 | `skeleton/test/vercel-config.test.ts` | exact `/game` proxy target back to slash-less `…/game`, VERCEL=1 rebuild | 2 failed (rule value; built: /game and /game/ never map to slash-less /game) | yes, 17 passed |
| 8.1 | `apps/game/test/playClient.test.ts` | signed-in client reads no in-memory token (`: null` instead of `memory.get(key)`) | 2 failed (signed-in tutorial tokens; double start) | yes, 24 passed |
| 9.1 | `skeleton/test/readme.test.ts` | game production URL line removed from the README | 1 failed (gives both production URLs) | yes, 8 passed |
