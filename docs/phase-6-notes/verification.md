# Phase 6 verification (task 10.3, verify-and-stop; updated in task 10.F10 for F5 to F9)

The tables below are the task 10.3 record and are left as written. The section "Re-status after F5 to F9" at the end re-states 25.5, 10.3, 11.5 and 27.4 with the new evidence and lists later counts.

Scope: every acceptance criterion of Requirements 10 to 31 (P1 items 1 to 10 = Req 10 to 19; P2 items 11 to 22 = Req 20 to 31), then the cross-cutting requirements. Nothing was fixed. Gaps are recorded only. Git was read-only. No `.env` opened, no server started, no browser run.

Baseline: HEAD `0a7a36c` (Phase 6 commit) against its parent `5fcb86b`. The working tree differs from HEAD only in `docs/` and `.kiro/specs/ui-rework/` files, so the recorded local test, typecheck and browser results are still current for source.

## Fresh evidence run in this task (single files, no full suite)
| Package | Files | Result |
|---|---|---|
| skeleton | `ui-contrast.property`, `ui-layer`, `paper-constants.property`, `book-foundations`, `vercel-config`, `book-height` | 6 files, 91 tests pass |
| atlas | `home`, `header`, `world-map`, `anchor-margin`, `sources-tap`, `contents`, `hero-markup`, `geo`, `book-component`, `legend-hero` | 10 files, 73 pass |
| game | `hall`, `hall.property`, `hint-area`, `hint-area.property`, `hint2-tab`, `hint-tab.property`, `scene-glint`, `reply-line.property`, `fear-text.property`, `pending-row`, `header`, `world`, `theme` | 13 files, 117 pass |

Read-only git checks (`5fcb86b..HEAD`): no change under `content/` or `assets/`; the three `vercel.json` files and `skeleton/src/deploy/vercelRules.ts` unchanged (each `vercel.json` still holds `git.deploymentEnabled` = `{"*": false, "main": true}` plus `$schema`, `installCommand`, `regions` in the app files); `pnpm-lock.yaml` unchanged; the only `package.json` change is the `./design/ui.css` export in `skeleton/package.json`; no image or font file added or changed; the only DB-layer file touched is `skeleton/src/db/atlasRead.ts` (approved read-only SELECT widening); no `.env` in the diff.

Earlier full-suite evidence (task 9.5, tree unchanged since): skeleton 887 passed + 8 expected fail, atlas 284, game 385; `tsc --noEmit` clean in all three; secret scan clean (`final-gates.md`, `progress.md`). Not re-run here.

Evidence names: BC = `docs/phase-6-notes/browser-checks.md` section; DEC = `decisions.md` task section; MUT = `mutations.md`; SS = `screenshots-index.md` (files under `.debug/phase-6/`).

## Counts
| Scope | met | partly met | not met | not verifiable | total |
|---|---|---|---|---|---|
| P1 criteria (Req 10 to 19) | 73 | 6 | 0 | 0 | 79 |
| P2 criteria (Req 20 to 31) | 59 | 1 | 0 | 1 | 61 |
| Cross-cutting requirements (Req 1 to 9, 33 to 42, per requirement) | 16 | 2 | 1 | 0 | 19 |

## P1 items (Requirements 10 to 19)

### Req 10 (item 1, UI layer): 8 met, 1 partly
| # | Status | Evidence |
|---|---|---|
| 10.1 | met | `skeleton/test/ui-layer.test.ts` "defines .btn-primary/-secondary/-ghost/link/nav-item/panel"; `ui.css` exists |
| 10.2 | met | `apps/atlas/test/ui-import.test.ts`, `apps/game/test/ui-import.test.ts` |
| 10.3 | partly | hover/active/disabled/focus states and radius are in `ui.css` (read); no test found that pins the 44 px minimum height of `.btn` itself. 44 px measured on map pins, hint and menu controls in BC 3.7, 4.8 |
| 10.4 | met | classes used on `button` (Book, Field) and `a` (`nav-play`, Hall) in source; `ui.css` selectors are class-only |
| 10.5 | met | `ui-contrast.property.test.ts` rows D20a-c (primary label on fill, edge vs surface) |
| 10.6 | met | `ui-layer.test.ts` one `:focus-visible` outline rule; `skeleton/test/focus-rules.test.ts`; BC 8.3 keys-check 255/258 pass, ring 3px offset 3px |
| 10.7 | met | DEC 1.7, 3.5 (class added beside old class on scene, world, book, pin card, Field); `world.test.ts`, `viewer.test.ts` pass |
| 10.8 | met | `ui-layer.test.ts` no hex / no hex fallback scan with self-test |
| 10.9 | met | `ui-layer.test.ts` class test; mutation in DEC 1.8 |

### Req 11 (item 2, link rule): 5 met, 1 partly
| # | Status | Evidence |
|---|---|---|
| 11.1 | met | `apps/atlas/test/link-rule.test.ts` |
| 11.2 | met | DEC 1.5; `.link` only on running-text links |
| 11.3 | met | `apps/atlas/test/header.test.tsx`, `home.test.tsx` (card link `text-decoration: none`), `contents.test.tsx` |
| 11.4 | met | BC 3.7 "links with an underline outside running text: none"; BC 9.2 production |
| 11.5 | partly | `aria-current="page"` tested in `header.test.tsx` ("marks exactly one link as the current page"). The 2 px marker exists only in `ui.css` (`.nav-item[aria-current='page']` inset 2px box-shadow); no test or measurement pins it |
| 11.6 | met | `ui.css` has a comment and no `:visited` rule (read); not pinned by a test |

### Req 12 (item 3, paper colours): 7 met, 1 partly
| # | Status | Evidence |
|---|---|---|
| 12.1 | met | `book-foundations.test.ts` declaration check; MUT item 3 |
| 12.2 | met | one `--color-link` re-point; matrix link rows |
| 12.3 | met | `ui-contrast.property.test.ts`; BC 2.5 lowest Book_View 5.84 (Banshee), 6.05 (Naddaha) |
| 12.4 | met | Sources links use `.link` (underline) plus `↗`; `sources-tap.test.tsx`, `legend-render.test.tsx` |
| 12.5 | met | BC 2.5 Scroll_View 4.73, 4.82 (AA 4.5) |
| 12.6 | partly | `.plate`, `.dramatization` keep class names and use token variables (`apps/atlas/src/styles.css`), so they follow the context by construction; no test or screenshot checks them on paper |
| 12.7 | met | matrix card/surface rows; MUT items 3 and 5 |
| 12.8 | met | `apps/atlas/scripts/ui-check.mjs`, 8 runs pass, size and weight named (BC 2.5); production 8/0 (BC 9.2) |

### Req 13 (item 4, answer options): 4 met, 1 partly
| # | Status | Evidence |
|---|---|---|
| 13.1 | met | matrix; BC 2.5 options 12.67:1 |
| 13.2 | met | ring 12.67:1 (BC 2.5); keys-check |
| 13.3 | partly | `✕` plus "Tried" label and no `line-through` (DEC 2.3, `world.test.ts`); tried contrast from the token matrix only. No tried option was on screen in any browser run |
| 13.4 | met | `world.test.ts` passes (re-run) |
| 13.5 | met | `apps/game/scripts/ui-check.mjs`, 4 options at 390 and 1280, 15 px / weight 600 (BC 2.5); production 8/0 |

### Req 14 (item 5, contrast test): 6 met
| # | Status | Evidence |
|---|---|---|
| 14.1 | met | `ui-contrast.property.test.ts` matrix in both scopes (DEC 2.4) |
| 14.2 | met | `skeleton/test/helpers/uiContrast.ts` reads `tokens.css`, `book.css`, `ui.css` |
| 14.3 | met | failing-input cases in the test (DEC 2.4) |
| 14.4 | met | 12 packs and 300 generated palettes (DEC 2.4) |
| 14.5 | met | `it.each` "stops re-pointing" (DEC 2.6); `book-foundations.test.ts` guards rule, link, ring |
| 14.6 | met | MUT items 3, 4, 5 |

### Req 15 (item 6, atlas home): 12 met
| # | Status | Evidence |
|---|---|---|
| 15.1 | met | `home.test.tsx` "no painted map image and exactly one .land"; BC 3.7 |
| 15.2 | met | `home.test.tsx` hero checks; BC 3.7 (h1, primary inside first screen) |
| 15.3 | met | `header.test.tsx`, `home.test.tsx` `/game/` links |
| 15.4 | met | `home.test.tsx` card tests |
| 15.5 | met | card `alt=""`, link carries the title (DEC 3.4) |
| 15.6 | met | BC 3.7 hero background transparent at first paint; scrim test (DEC 3.8); `legend-hero.test.tsx` placeholder |
| 15.7 | met | not applicable: strip removed (DEC conflict 4) |
| 15.8 | met | `home.test.tsx`; MUT item 6 |
| 15.9 | met | `hero-markup.test.tsx` passes (re-run) |
| 15.10 | met | BC 3.7 primary inside first screen at 1280x800 |
| 15.11 | met | `home.test.tsx` card image attributes; `atlas-read.test.ts` single `hero` key (DEC 3.1, 3.4) |
| 15.12 | met | BC 3.7 local median 6128 to 5360 ms (-12.5%, limit 6741). Production 5580 ms is not a like-for-like pair (BC 9.3 note) |

### Req 16 (item 7, map on phones): 7 met
| # | Status | Evidence |
|---|---|---|
| 16.1 | met | `world-map.test.tsx` swipe text; BC 3.7 |
| 16.2 | met | BC 3.7 12 pins; keys-check (BC 8.3) |
| 16.3 | met | `world-map.test.tsx` 44 px and aria-label; BC 3.7 smallest 44 |
| 16.4 | met | `ui-contrast.property.test.ts` D18/D19 (3.13 and 4.39) and `.land` formula test |
| 16.5 | met | `world-map.test.tsx`; BC 3.7 Escape returns focus |
| 16.6 | met | `geo.test.ts` passes (re-run); `world-land.svg` not in the diff |
| 16.7 | met | DEC 3.5 centring; BC 8.4 scrollLeft 285 of 960 at 390 |

### Req 17 (item 8, Hall): 9 met, 1 partly
| # | Status | Evidence |
|---|---|---|
| 17.1 | met | BC 4.8 h1 and premise y 97/161 (390), 97/137 (1280) |
| 17.2 | met | `hall.test.ts`, `hall.property.test.tsx`; BC 4.8 states; departure in DEC (approvals) |
| 17.3 | met | `hall.test.ts` "locks every door before the tutorial"; `hall.property.test.tsx` |
| 17.4 | met | `hall.test.ts` panel/no-navigation case; BC 4.8; `item8-*-locked-after.png` |
| 17.5 | met | `hall.test.ts` guest-after-tutorial case; `item8-*-signin-or-open-after.png` |
| 17.6 | met | catalog text kept (DEC 4.2) |
| 17.7 | met | `hall.test.ts` door count; scene kept |
| 17.8 | met | no access-rule file in the diff (git check above) |
| 17.9 | partly | covered by `hall.test.ts` / property test from the existing access check; no browser run signed in (BC 8.2 "not covered: signed-in screens") |
| 17.10 | met | `hall.test.ts` three states, `hall.property.test.tsx` |

### Req 18 (item 9, scene layout): 9 met
| # | Status | Evidence |
|---|---|---|
| 18.1 | met | DEC 4.5; BC 8.F1 tabs row |
| 18.2 | met | BC 4.8 (bottoms 597/649/721/711, dock 773); BC 8.F1 and 8.F3 re-check |
| 18.3 | met | BC 4.8/6.15 tutorial top 197, Banshee 177 (under 200) |
| 18.4 | met | BC 4.8 one row at both widths; BC 8.F1 |
| 18.5 | met | BC 4.8 grid fix; scene uses full width |
| 18.6 | met | BC 4.8 scrollY 0 after taps |
| 18.7 | met | keys-check pan keys (BC 8.3); `viewer.test.ts`, `theme.test.ts` pinned classes |
| 18.8 | met | popover menu, DEC 4.4; `apps/game/scripts/header-check.mjs` 10/10 |
| 18.9 | met | `apps/game/test/header.test.tsx` 6 cases; header-check |

### Req 19 (item 10, hotspot affordance): 6 met, 1 partly
| # | Status | Evidence |
|---|---|---|
| 19.1 | met | `scene-glint.test.tsx`, `hotspot.property.test.tsx`; BC 8.F2 contrast of the glint 13.48/3.80/7.97 |
| 19.2 | met | `hotspot-glint-rule.test.ts` (static 0.9 under reduced motion); BC 8.4 motion 46/0 |
| 19.3 | partly | reply never empty (BC 4.8, `reply-line.property.test.ts`); the 300 ms bound is not measured anywhere |
| 19.4 | met | `reply-line.property.test.ts`; no server change |
| 19.5 | met | `hotspot-glint-rule.test.ts` size; `hotspot.property.test.tsx`; keys-check order |
| 19.6 | met | `scene-glint.test.tsx` |
| 19.7 | met | `reply-line.property.test.ts` all roles |

## P2 items (Requirements 20 to 31)

### Req 20 (item 11, book controls): 6 met
20.1 met (`book-component.test.tsx` btn classes). 20.2 met and 20.3 met (same file, label and `aria-pressed` both modes; BC 6.15). 20.4 met (key `book.readAsBook`; handover list is task 10.4). 20.5 met (MUT items 11, 20). 20.6 met (`book-foundations`, `book-component` pass).

### Req 21 (item 12, book height): 5 met
21.1 met (600 px at 1280x800, BC 6.15; `book-height.test.ts`). 21.2 met (Banshee 21 pages vs 22). 21.3 met (existing pagination tests unchanged). 21.4 met (`anchors-once`, `anchor`, `book-check.mjs` 50 pass, BC 6.15). 21.5 met (DEC 6.2 numbers and choice).

### Req 22 (item 13, cross links): 4 met
22.1, 22.2, 22.3 met (`apps/atlas/test/header.test.tsx`, `apps/game/test/header.test.tsx`, `home.test.tsx`; BC 6.15; BC 9.2 production). 22.4 met (`atlasUrl` / same-origin rule kept, DEC 3.2, 4.4).

### Req 23 (item 14, All legends): 4 met
`header.test.tsx` and `home.test.tsx` (`#legends`, differs from `/`, logo `/`); target exists (BC 6.15); `id="legends"` (DEC 3.3).

### Req 24 (item 15, legend hero): 4 met
24.1 met (h1 453 to 501 at 1280, BC 6.15). 24.2 met (304 to 344 at 390). 24.3 met (`hero-markup.test.tsx`). 24.4 met (`legend-hero.test.tsx`, surface-to-bg gradient).

### Req 25 (item 16, fear meter): 4 met, 1 not verifiable
25.1 met (`fear-ui.test.ts`, BC 6.15 "Fear: 0 of 100"). 25.2 met (`fear-ui.test.ts`). 25.3 met (`tut.goal`, DEC 6.5). 25.4 met (`fear-text.property.test.tsx`). **25.5 not verifiable**: no contrast pair for the fear text is in the matrix, and no browser scan covered it. Fear text colour not measured.

### Req 26 (item 17, one hint area): 7 met
26.1, 26.2, 26.3 met (`hint-area.test.tsx`, `hint-area.property.test.tsx` Property 7; MUT item 26). 26.4 met (BC 6.15 page height unchanged 893/849 while the sheet opens). 26.5 met (`hint-area.test.tsx`). 26.6 met (aria-label includes puzzle, DEC 6.8). 26.7 met (no play-rule or `atlasUrl` change; `world.test.ts` passes).

### Req 27 (item 18, Hint 2 and pop-up blockers): 7 met, 1 partly
27.1 met (`hint2-tab.test.tsx`, `hint-tab.property.test.ts`; BC 6.15 blocker off). 27.2 met (BC 6.15 blocker on: sentence and link, fear 0 to 10). 27.3 met (every refusal path in `hint2-tab.test.tsx`; BC 6.15 aborted case). **27.4 partly**: the fallback link's 44 px height and `rel="noopener"` have no test or measurement that I found. 27.5 met (fear 10 = `FEAR.tutorialHint2`). 27.6 and 27.7 met (`hint2-tab.test.tsx`, MUT item 27 plus the 6.10 mutations). 27.8 met (`atlasUrl` unchanged). Caveat: BC 6.15 used a `window.open` stand-in, not Chrome's real blocker. A signed-in world Hint 2 was not run.

### Req 28 (item 19, no layout shift): 4 met
28.1 met (`pending-row.test.ts`). 28.2 and 28.3 met (BC 6.15 scene top 169/169/169 at 390, 125/125/125 at 1280 for Banshee; tutorial 197 and 171). 28.4 met (`pending-row.test.ts` no animation).

### Req 29 (item 20, anchor landing): 6 met
29.1 met (`anchor-margin.test.ts`; MUT item 29). 29.2 met (BC 6.15 Book_View 70 to 142 at 390). 29.3 met (`book-check.mjs --legends banshee` 50 pass). 29.4 met (`anchors-once.test.tsx`). 29.5 met (MUT item 29). 29.6 met (BC 6.15 404 text).

### Req 30 (item 21, source links): 4 met
30.1 met (28 px height, 8 px gap; BC 6.15; `sources-tap.test.tsx`). 30.2 met (BC 6.15 both views). 30.3 met (`legend.sourceExternal`, DEC 2.2). 30.4 met (MUT item 30).

### Req 31 (item 22, contents list): 4 met
`contents.test.tsx` (one `ol`, no underline, hrefs kept, hover/focus marker); BC 6.15 rows 44 px (9 rows); anchors tests pass.

## Cross-cutting requirements
| Req | Status | Evidence |
|---|---|---|
| 1 UI-only scope | met | git check: no parser, generator, auth, access, score, rate-limit, DB schema or `vercelRules.ts` change; only `atlasRead.ts` widened (approved). Existing tests unedited in assertions (DEC 1.7 loosened two regexes, same cases) |
| 2 Protected paths | met | no diff under `content/`, `assets/`; no image added; `content-and-assets-needed.md` exists with the Banshee panorama entry |
| 3 No new libs, fonts, images | met | only `skeleton/package.json` `exports` entry changed; `fonts.test.ts` in both apps; `vercel.json` unchanged |
| 4 Design direction, conflicts | met | five conflicts in DEC; base tokens unchanged (`theme.test.ts` passes); 12 theme packs unchanged |
| 5 Order of work, status | met | `mid-phase-status.md` and `owner-feedback.md` exist; F1 to F4 done |
| 6 Additive classes, pinned tests | met | DEC 1.7, 1.6; `.book-paper` block regex test passes |
| 7 Logical CSS, catalog, reduced motion | met | `logical-css.test.ts` (both apps) and `ui-layer.test.ts`; BC 8.4 motion 46/0, RTL 63/0. New keys listed in DEC; the handover list is task 10.4 |
| 8 Deployment config | met | `vercel-config.test.ts` passes (re-run); files unchanged |
| 9 Environment safety | met | no `.env` in the diff; production checks guest only (BC 9.2); screenshots only under `.debug/` (git-ignored); git read-only |
| 33 New tests per criterion | met | tests named above; browser scripts under `apps/*/scripts/` with results in BC |
| 34 Existing tests green | met | per-package totals above (task 9.5, not re-run fully); no blocked tasks |
| 35 Mutation checks | met | MUT lists items 3, 4, 5, 6, 11, 20, 26, 27, 29, 30, each failed and restored |
| 36 Browser checks | partly met | all checks present (BC 8.2 to 8.5, keyboard, reduced motion). Gap: item 4 and 5 "before" shots have no open puzzle (SS "Gaps"), not re-takeable. Signed-in screens never checked. RTL text not checked (empty Arabic catalog) |
| 37 Production checks | met | BC 9.2, 9.3. Tutorial +3.3% and Banshee +1.6% over Phase 5 run 1 are recorded with cause (image size, run-to-run spread); the 1280 dead end skipped on production |
| 38 Process rules | met | DEC records choices; the `impeccable` skill load was refused and was not worked around (DEC 3.7) |
| 39 Kiro usage log | partly met | `docs/kiro-usage.md` has the Phase 6 entry (task 10.1, 10.2). It records `verify-and-stop` as pending; this task has now run it, but the entry was not updated (out of scope here) |
| 40 Handover | **not met** | `docs/phase-6-handover.md` does not exist yet. It belongs to task 10.4 |
| 41 Record files | met | all files present in `docs/phase-6-notes/`; Needs_File exists and has an entry |
| 42 Progress file | met | `progress.md` updated each task |

## Open items (nothing was fixed)
- Not met: Req 40 handover (task 10.4).
- Not verifiable: 25.5 fear text contrast.
- Partly met: 10.3 (44 px `.btn` not pinned), 11.5 (2 px marker unpinned), 12.6 (plate and dramatization on paper), 13.3 (tried option never on screen), 17.9 (signed-in Hall not run in a browser), 19.3 (300 ms not measured), 27.4 (fallback link size and `rel`), Req 36 (before-shot gap, signed-in), Req 39 (usage log not updated for this check).
- Known, accepted earlier: tutorial drawer covers hint buttons at 390 (DEC 6.16); Hint 1 hotspot marks not applied in a real run (owner note); the 3 s scene-paint budget is still missed because of the scene image size (BC 9.3).

## Re-status after F5 to F9 (task 10.F10, from the records only)
Evidence: `decisions.md` tasks 10.F5 to 10.F11, `mutations.md`, `browser-checks.md` ("Re-run after F5 to F8", "Task 10.F11", "Re-run ... with F9 in place"), `final-gates.md` (task 10.F12), `owner-feedback.md`. No test was run in this task; counts are those recorded in task 10.F12.

| Criterion | Was | Now | New evidence |
|---|---|---|---|
| 25.5 fear text contrast | not verifiable | **met** | Matrix row D22 in `skeleton/test/helpers/uiContrast.ts`: `.fear-meter-text` ink on page, 15 px (`--type-ui`), weight 400 (normal text), 15.06:1 against 4.5:1. Three cases in `ui-contrast.property.test.ts` (measured, CSS binding, failing page colour). Mutations: ink to muted in `fear.css` (1 caught); ink token darkened to `#4a443f` (4 caught). Not scanned in a browser |
| 10.3 `.btn` 44 px minimum | partly | **met** | `ui-layer.test.ts`: `--target` is 2.75rem and `.btn` `min-block-size` uses it. Mutation to 2rem caught (1) |
| 11.5 2 px current-item marker | partly | **met** | `ui-layer.test.ts`: `.nav-item[aria-current='page']` accent bar is 2px. Mutation to 1px caught (1). `aria-current` itself was already tested in `header.test.tsx` |
| 27.4 Hint 2 fallback link 44 px and `rel="noopener"` | partly | **met** | `hint-area.test.tsx`: the link's `target`, `rel="noopener"` and the `.scene-button` 44 px minimum. Mutations: `rel` removed (2 caught), `min-block-size` 44px to 30px (1 caught) |

Counts after the re-status (criteria in Requirements 10 to 31): P1 75 met, 4 partly (12.6, 13.3, 17.9, 19.3), 0 not met (79). P2 61 met, 0 partly, 0 not verifiable (61). Cross-cutting rows are not re-counted: Req 40 (handover) now has `docs/phase-6-handover.md` (task 10.4, updated in 10.F10) and Req 39 (usage log) is current; the other cross-cutting rows are as above. Req 1 changed in one respect: `skeleton/src/deploy/vercelRules.ts` now differs by one owner-approved line (below), and `.env.example` gained the name `IMAGE_CDN_URL=`.

### F5 to F9 evidence
- **F5** hero stacks below 40rem: image 16/9 fully visible at 360, 375, 390; h1 and primary action inside the first screen; 1280 unchanged. New case in `home.test.tsx`, mutation caught. (`decisions.md` 10.F5)
- **F6** header one row: 61 px at 360, 375, 390 and 1280 (was 105 at 360 and 375); "Play" visible below 40rem, full accessible name kept (label-in-name); targets 44 px; `header-check.mjs` 24/0 in later runs. Two new `header.test.tsx` cases, removing the `aria-label` fails 2. (`decisions.md` 10.F6)
- **F7** Hint 1 marks: client-only (`hint1Highlights`, `hint1Marks`), 3 cases in `world.test.ts`, 2 mutations caught. **Browser confirmation BLOCKED:** no Banshee Hint 1 row names a hotspot id (content), the server returns an empty highlight. Owner action: add hotspot ids to the Banshee Hint 1 rows outside Kiro, or check Flying Dutchman while signed in. Shots `.debug/phase-6/f7-banshee-*`.
- **F8** the four pins above.
- **F9** (task 10.F11) ImageKit CDN: `imageUrl`, `responsiveImage`, `parseImageBase`, `imageBase()` server-side only, `srcset`/`sizes`, matching preloads. The one approved rule change, `img-src 'self' data: https://ik.imagekit.io` (before `img-src 'self' data:`), with CSP tests for both apps (mutation caught). Banshee scene 1 431134 B to 231262 B (390, DPR 2) and 144958 B (1280). 0 broken images, 0 images downloaded twice. Local Slow 4G (loaded machine, load average about 9) off to on: Hall 7679 to 5246 ms, tutorial 5307 to 3238, Banshee scene 1 7131 to 4677, atlas home 5620 to 2388. The 3.0 s budget is still missed by the Hall and Banshee scene 1. Production not yet measured with the CDN (needs the push). Seven mutations on F9 caught.

### Later runs
| Item | Result |
|---|---|
| Full tests (task 10.F12) | skeleton 913 passed + 8 expected fail (921, 69 files); atlas 302 (29 files); game 399 (42 files). 0 failed. Typecheck clean in all three, both builds pass, secret scan clean |
| Browser checks, CDN off and on (10.F12) | atlas screens 36/0 each mode; game screens 38/0/1 skip off, 37/0/2 skips on (seed-dependent dead-end skips); atlas header 24/0 and game header 10/0 each mode; ui-check 8/0 per app each mode; atlas keyboard pass 141/0 at 360, 390, 1280 each mode; CDN on 18 page loads, 0 broken images, 0 CSP violation events (CSP enforcement not shown locally) |
| Protected files (10.F12, read-only git) | `content/`, `assets/`, `skeleton/src/play/**`, three `vercel.json` files, `pnpm-lock.yaml` and all `package.json` unchanged; `vercelRules.ts` only the `img-src` line |
| Mutation additions | 6 from F8, 2 from F7, 7 from F9 (table in `mutations.md` and the handover) |

### Open items now
- Partly met: 12.6, 13.3, 17.9, 19.3, Req 36 (before-shot gap, signed-in screens, RTL text).
- Content: F7 browser confirmation needs hotspot ids in the Banshee Hint 1 rows, or a signed-in Flying Dutchman check.
- Owner: Banshee panorama seam, like-for-like timing, signed-in checks, production CDN timing after the push, real pop-up blocker, commit of all files.
- Known: the 3.0 s scene-paint budget is still missed by the Hall and Banshee scene 1 (also with the CDN, locally).

## F10 (task 10.F13)
- Parser strip in `makeHint` only; diff in `skeleton/src/parser` is that one function. content/, assets/, vercel.json and play code unchanged.
- Tests: skeleton 915 passed + 8 expected fail, atlas 302, game 399. Typecheck, builds, secret scan clean. Generator property tests 158 pass. Load-induced timeouts (1 atlas, 6 skeleton) passed on re-run alone.
- Mutation: strip removed, 2 tests fail, restored, `cmp` identical.
- Dev DB import done after a hostname-only check; `hint1_highlights` non-empty on 53 of 60 slots, 0 texts with an id.
- Browser: Banshee Puzzle 1 Hint 1 marks `hs-dresser`, no id in text, 390 and 1280 (`.debug/phase-6/f13-*`).
- Owner action: run the production `db:import` after the push.
