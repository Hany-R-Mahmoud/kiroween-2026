# Mutations

Task 8.1 (design 7.3). Each mutation was applied by hand to the real source, the named tests were run with Vitest, then the file was put back from a copy taken before the edit. Restore was confirmed with `cmp` against that copy (identical in every case). `git diff` cannot show "restored" here because the working tree has uncommitted Phase 6 changes, so the pre-mutation copy is the baseline. Git was used read-only.

| Item | Mutation | File | Test that failed | Restored |
|---|---|---|---|---|
| 3 | delete `--color-surface: var(--book-card)` from `.book-paper` | `skeleton/src/book/book.css` | `book-foundations.test.ts` "declares each of them in the plain .book-paper block"; `ui-contrast.property.test.ts` matrix, "any pair drawn from the matrix", and the surface re-point cases (7 failed) | yes, identical |
| 4 | remove the `--color-bg` re-point inside `.book-paper` | `skeleton/src/book/book.css` | `ui-contrast.property.test.ts` matrix (P7/P8 pairs), "stops re-pointing --color-bg", "page colour"; `book-foundations.test.ts` declaration check (5 failed) | yes, identical |
| 5 | `--book-card: #f6ecd2` to `#1c1620` | `skeleton/src/book/book.css` | `ui-contrast.property.test.ts` (matrix, "card fill is changed to a dark colour"); `paper-constants.property.test.ts` Property 3 (CSS vs `bookColors.ts`) (7 failed) | yes, identical |
| 6 | add `<Img image={SHARED_ATLAS_IMAGES.map}>` back above `WorldMap` | `apps/atlas/src/components/HomeView.tsx` | `home.test.tsx` "has no painted map image and exactly one .land element" | yes, identical |
| 11 | make the toggle label constant (scroll view uses `labels.toggle`) | `skeleton/src/book/Book.tsx` | `book-component.test.tsx` "scroll view: toggle reads \"Read as a book\" and aria-pressed is true" | yes, identical |
| 20 | drop `aria-pressed` from the toggle button | `skeleton/src/book/Book.tsx` | `book-component.test.tsx` "book view: toggle reads \"Read as one page\", aria-pressed false, and carries btn classes" | yes, identical |
| 26 | render the hint pair twice in `WorldPlay` | `apps/game/src/components/WorldPlay.tsx` | `hint-area.property.test.tsx` Property 7 (both cases: random slots, five open puzzles) | yes, identical |
| 27 | replace `openBlankTab()` in the world route with a stub that calls `window.open(u)` on navigate | `apps/game/src/routes/world.$target.tsx` | `hint2-tab.test.tsx` "world.$target.tsx calls openBlankTab and applyHint2Reply" | yes, identical |
| 29 | `scroll-margin-block-start` set to `0` | `apps/atlas/src/styles.css` | `anchor-margin.test.ts` "[id] clears the header plus 1rem" and "[data-anchor-heading] clears the header plus 1rem" | yes, identical |
| 30 | delete `min-block-size: 1.5rem` from `.source-link` | `apps/atlas/src/styles.css` | `sources-tap.test.tsx` "the stylesheet gives the class a 24 px minimum height, block display and 4 px block padding" | yes, identical |

## Notes
- No test needed strengthening. Two first attempts were weak mutations, not weak tests, and are not counted as results: item 6 first used the hero image instead of the map image (passed, correctly), and item 26 first rendered an `offered={false}` pair (renders nothing, passed, correctly). Both were redone with a real mutation and failed as expected.
- Item 4 uses the design's "remove the `--color-bg` re-point" form. The design's alternative wording (option colours back to accent on bg) was not run separately; the same pair rows fail.
- Item 27 is caught by the source check, not by a run of the click. The game package has no jsdom (see 4.7 and 6.10 in decisions).

## Earlier entries merged from 6.10 (Hint 2 tests, `apps/game/src/lib/hintTab.ts`)
| Mutation | Result |
|---|---|
| `hint2Outcome` failed/free returns `closeTab: false` | caught (8 tests: every failure path, free, Property 6) |
| `openBlankTab` calls `location.replace` right after open | caught (10 tests) |
| `openBlankTab` skips `opener = null` | caught (1 test: success path) |

Other mutation checks made inside earlier tasks (1.8, 2.4, 2.6, 3.6, 4.7, 6.2, 6.6 to 6.13) are recorded in `decisions.md` under each task.
