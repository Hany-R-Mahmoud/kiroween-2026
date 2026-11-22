# Phase 6 review: merged fix list (2026-11-22)

Sources: `design-direction.md`, `impeccable.md`, `tester.md`, `code-review.md` in this folder. Claude spot-checked the main code claims (global `a` rule, two maps, Hall lock, answer-button colours). Guest-only checks on production.

## Root causes (fix these first; most symptoms follow)

1. **No UI component layer.** Tokens hold only colours and fonts (`skeleton/src/design/tokens.css:6-21`). No button, link, panel, spacing, type, radius or shadow scale, so every screen is styled by hand. The game has 5 button systems; the atlas has none.
2. **Global link rule.** `apps/atlas/src/styles.css:30-38` makes every `a` gold and underlined: nav, legend list, contents, card actions, references. This is the "search results" look.
3. **Paper context re-points only 4 colours.** `.book-paper` changes ink, muted, glow and accent, but surface, bg and border stay dark. Result: dark ink on dark cards (Versions cards about 1.1:1), oxblood answer buttons on dark (1.25:1), dark teal table rules on parchment, three link colours on one page. The contrast test (`skeleton/test/book-foundations.test.ts:38-52`) checks only those 4 variables.

## Design direction (from `design-direction.md`)

- One building, two rooms. Atlas: "The Archive Reading Room" (paper and brown ink, one candle). Game: "The Archive House, after hours" (dark wood, brass plates, lamp glow). Theme packs recolour only accent and display.
- Type: IM Fell English display, Source Serif 4 body (18 px on paper, 62 ch max), Inter for UI. All already in `KNOWN_FONTS`.
- Colour: add a paper pair (paper `#e8dcc0`, ink `#2a1d12`) and ember `#a8431f`; links glow on dark, rust on paper; one focus ring that works on both.
- Links navigate, buttons act. Brass-plate buttons, 44 px, radius 4, one primary per view.
- Motion: slow candle glow only; reduced motion turns it all off through one variable.
- Keep: all art, base tokens, contrast tests, font set, legend structure, book view, Hall pan scene, anchors, hints, guest mode.

## P1: first impression and broken reading (must fix)

| # | Fix | Where | Evidence |
|---|---|---|---|
| 1 | Add `skeleton/src/design/ui.css`: `.btn` (primary, secondary, ghost), `.link`, `.panel`, focus ring, spacing and type scale; import in both apps | skeleton, both `styles.css` | code-review 1, 9 |
| 2 | Replace the global `a` rule with `.link` used only for in-text links; nav and actions become buttons or styled nav items | `apps/atlas/src/styles.css:30` | code-review 2; impeccable 3 |
| 3 | Paper context: re-point surface, bg, border and link colours too; one link colour per context; Versions cards, tables and Sources readable on paper | `book.css:41-46`, `LegendPage.tsx:41,125,172` | tester 1; impeccable 6; code-review 5 |
| 4 | Game answer buttons and their focus ring readable (AA) wherever they sit | `world.css:20-48` and the paper panel | tester 2 |
| 5 | Extend the contrast test to every colour pair used on paper and on dark, incl. surface, border, link, button | `book-foundations.test.ts` | code-review 6 |
| 6 | Atlas home: one map only (remove the painted strip or make it the real map), hero with a main action, link to the game, legend cards with painted thumbnails instead of the underlined list; no black first paint | `routes/index.tsx:30-40`, `WorldMap.tsx` | all four |
| 7 | Map on phones: fits 390 px or pans with a visible hint; all 12 pins reachable | `WorldMap.tsx`, `styles.css:112` | tester 5; impeccable 3 |
| 8 | Game Hall: visible title, a clear "Start in the study" action, doors that say why they are locked ("opens after the study") instead of a silent jump to the tutorial | `Hall.tsx:79` | impeccable 7; tester 6 |
| 9 | Game scenes: scene fills the first screen with a compact top bar; pan buttons, fear meter and hints visible without scrolling at 1280x800 and 390 px | `scene.css`, tutorial and world routes | impeccable 8; tester 7 |
| 10 | Hotspots: a subtle glint so players see what can be clicked, and a visible reply on every click | `scene.css`, scene component | impeccable 8 |

## P2: clear usability problems

| # | Fix | Where |
|---|---|---|
| 11 | Book controls look like buttons; the toggle changes its label and `aria-pressed` | `book.css:151`, Book component |
| 12 | Book height uses the screen (not about 405 px of 800) so pages are fewer | Book component |
| 13 | Game header links to the atlas; atlas header links to the game | both `__root.tsx` |
| 14 | "All legends" link points to the list, not `/` | atlas header |
| 15 | Legend hero shows the title on the first screen at 1280x800 | legend route |
| 16 | Fear meter has a visible label; tutorial states its goal | game components |
| 17 | One hint area per puzzle set, not 8 repeated buttons; hint panel does not push the page | notebook, hint drawer |
| 18 | Hint 2 opens the atlas without a blocked pop-up (open synchronously or show a clear link before raising fear) | `tutorial.tsx:65`, `world.$target.tsx:107` |
| 19 | No layout shift from "Working on your last move…" | tutorial |
| 20 | Anchor links land with the heading in view (scroll margin) | atlas anchor route |
| 21 | Source links at least 24 px tall | LegendPage Sources |
| 22 | Contents list readable (not an underlined link wall) | LegendPage |

## P3: polish if time allows

- Banshee panorama brightness seam (asset).
- Book page-turn frame shows clipped text for a moment.
- Spacing and text sizes unified (8 sizes and 9 gaps now); hex fallbacks in game CSS and `mood.css` replaced by tokens.

## Rules for Kiro

- Add new classes beside the old ones; do not rename classes that tests pin (`spirit-panel-body spirit-caption book-paper`, `world-button world-option`, `scene-button`, `book-controls`, `.book-paper` regex, hub palette, mood rules, anchor and hero markup).
- No new libraries, no new images. Logical CSS only (RTL). WCAG AA. Reduced motion respected.
- Before and after screenshots at 390 and 1280 px for every P1 item, saved under `.debug/`.

## Not covered by the review

Game win screen, high fear, dead ends, puzzles 3-5, signed-in screens, Safari, real touch, screen readers. Kiro's own browser checks must cover these after the fixes.
