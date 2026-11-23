# Browser checks

## Baseline screenshots (task 1.1, "before", current code)
Local production builds of atlas (3001) and game (3000), headless Chrome, 390x844 and 1280x800, guest, no sign-in.
Files in `.debug/phase-6/` as `item<N>-<width>-before.png`. Script: `.debug/phase-6/shoot.mjs` (`shots before`).

| Items | Screen |
|---|---|
| 1, 2, 6 | atlas home `/` |
| 7 | atlas home scrolled to the map region |
| 3, 5 | `/legends/banshee` (book view as first loaded) |
| 8 | game Hall `/game/` |
| 9, 10 | game tutorial `/game/tutorial` (first load; no hotspot clicked) |
| 4 | Banshee world scene 1 `/game/world/banshee` (answer buttons are not open in this view; re-shoot with a puzzle open in task 2.x) |

Each shared screenshot is saved once per item number so every item has a file name with its number.

## Slow 4G, Atlas_Home (before)
Profile: 1.6 Mbps down, 750 kbps up, 150 ms RTT, CPU 4x, cache off, 390 px, three runs, local production build, headless Chrome. Wait 15 s per run.

| Row | LCP ms | FCP ms | load end ms | encoded bytes |
|---|---|---|---|---|
| run 1 | 6128 | 2960 | 10653 | 1677546 |
| run 2 | 7208 | 3960 | 11611 | 1673543 |
| run 3 | 5448 | 2280 | 10131 | 1673543 |
| **before, median** | **6128** | **2960** | **10653** | **1673543** |

Task 3.7 repeats it (`node .debug/phase-6/shoot.mjs timing after`). Limit (Req 15.12): after median not above 6128 x 1.10 = 6741 ms LCP.

## Task 2.5: contrast scan (local production build, guest, headless Chrome)
Scripts: `apps/atlas/scripts/ui-check.mjs` (every text node, colour against composited ancestor backgrounds, large text 3:1 by computed size and weight) and `apps/game/scripts/ui-check.mjs` (every Banshee puzzle option: text, border, focus ring). Both exit 1 on a miss and print numbers only.
- Atlas, Banshee and Naddaha, Book_View and Scroll_View, 390 and 1280 px: all 8 runs PASS. Lowest ratio: Book_View 5.84 (Banshee), 6.05 (Naddaha); Scroll_View 4.73 (Banshee), 4.82 (Naddaha). No text below its minimum, so no fix was needed.
- Game, Banshee, 4 options at 390 and 1280 px: all PASS. Text 12.67:1 (ink on paper tint), ring 12.67:1, border 12.67:1, 15 px / weight 600 (so 4.5 needed). Tried (disabled) options were not on screen in this guest run and are covered by the token matrix in task 2.4.
- Screenshots: `.debug/phase-6/item3-atlas-{pages,scroll}-{390,1280}-after.png` and `.debug/phase-6/item5-game-{390,1280}-after.png`. Item 4 (the paper surface) is the same Book_View shot as item 3. The "before" files for items 3 to 5 are the task 1.1 shots (item 5 had no open puzzle there).

## Task 3.7: atlas home after group 3 (local production build, guest, headless Chrome)

Slow 4G, Atlas_Home (after). Same profile and script as "before" (`node .debug/phase-6/shoot.mjs timing after`).

| Row | LCP ms | FCP ms | load end ms | encoded bytes |
|---|---|---|---|---|
| run 1 | 5348 | 2448 | 8291 | 1327968 |
| run 2 | 6680 | 3200 | 9223 | 1323810 |
| run 3 | 5360 | 2300 | 8258 | 1323810 |
| **after, median** | **5360** | **2448** | **8291** | **1323810** |
| before, median | 6128 | 2960 | 10653 | 1673543 |
| change | -12.5% | -17.3% | -22.2% | -20.9% |

Limit 6741 ms LCP: met (5360). No fix needed.

Checks (`.debug/phase-6/home-check.mjs`, 390x844 and 1280x800, scrolled to top):
- One map element (`[role=region]` scroller with one SVG outline), no painted-strip image.
- Hero `h1` (y 325 to 365 at 390; 349 to 397 at 1280) and primary button inside the first screen at both widths.
- Hero background is transparent at first paint (no opaque black box).
- 12 pins, smallest 44 px, each a real `button` with `popovertarget`; popover opens on activation, Escape closes it and focus returns to the pin (390 and 1280).
- Links with an underline outside running text: none.

Screenshots (`.debug/phase-6/`): `item6-{390,1280}-after.png`, `item7-{390,1280}-after.png` (before files from task 1.1), plus item 1, 2, 3 after shots. The game was not running, so `item4/5/8/9/10-*-after.png` from that same script run are error pages for items 4, 8, 9 and 10 and must be ignored (a safety rule blocked deleting them); `item5-game-*-after.png` stays the valid item 5 file.

Design-direction review (done by hand; the `impeccable` skill load was refused by the tool, so it was not used): 1280 hero now sits as one frame with the title, intro and two actions over the image, the header carries the Game link as a secondary plate, and the underlined "All legends" link is gone. Notes, not fixed (outside this task): at 390 the header wraps "Play Trick or True" to a second row, and the intro text sits over the bright book pages with less contrast than at 1280 (a visual check only; the contrast scan covers text on dark surfaces, not text on the hero image).

## Task 4.8: Hall, header and scenes (local production build, guest, headless Chrome)
Script `.debug/phase-6/scene-check.mjs` (numbers in `.debug/phase-6/scene-check-after.json`); header by `apps/game/scripts/header-check.mjs` (10 of 10 pass). Design review: `impeccable` loaded this time but its launcher was not run (no download); judged by eye against `design-direction.md` on the new screenshots.
**First run found two failures, fixed with CSS (attempt 1, both pass after):**
- Scene grid had an implicit auto column, so the viewer grew to the sprite width (scene 1344 px wide at 1280, page 1285 px wide at 390). Fix: `grid-template-columns: minmax(0, 1fr)` on `.scene-screen`.
- Fear meter measured 0x0 at 1280 (percentage width inside an auto dock column). Fix: `.fear-meter { inline-size: 16rem; max-inline-size: 100% }`.
- Tutorial scene top was y = 200 at 390 (needs under 200). Fix: pan note 13 px / line-height 1.25 below 40rem; top is now 190.
**Final measurements**
| Check | 390x844 | 1280x800 |
|---|---|---|
| Hall h1 / premise / primary (y bottom) | 97 / 161 / 277 | 97 / 137 / 233 |
| Hall states | locked: primary "Start in the study"; done: secondary "Visit the study again", no primary | same |
| Locked/hotspot panel | opens, has Close | same |
| 18.2 tutorial: viewer, pan, fear, hints bottom | n/a | 597, 649, 721, 711 (dock 773) |
| 18.2 Banshee 1: viewer, pan, fear | n/a | 597, 649, 721 (dock 773) |
| 18.3 scene top (tutorial / Banshee) | 190 / 177 | n/a |
| 18.3 fear, hints reachable | fear 657/765, hints 765, no horizontal overflow | n/a |
| Banshee scene buttons | one row (prev, 3 scenes, next) | one row |
| Hotspots with glint | 7/7 tutorial, 6/6 Banshee | same |
| Reply after every tap | never empty ("Tap anything that glints." idle, clue and decoy text, "Nothing here.") | same |
| Scroll after taps | scrollY 0 | 0 |
Notes: Banshee has no hint buttons on its first screen (hints live in the notebook after choosing a puzzle), so only the tutorial hints were measured. Page height is above the viewport (849 at 1280) because of header and footer; every control ends at 773 or higher up. Scene images are broken here (no image data locally), as in earlier runs.
Screenshots (replace the invalid error-page files): `.debug/phase-6/item{8,9,10,4}-{390,1280}-after.png`, plus `item8-*-locked-after.png`, `item8-*-signin-or-open-after.png`. Header: `header-menu-{390,1280}-after.png`.

## Task 6.15: P2 items (local production builds, guest, headless Chrome, 390x844 and 1280x800)
Script `.debug/phase-6/p2-check.mjs` (numbers in `.debug/phase-6/p2-check.json`, log `p2-run.log`); probe `p2-probe.mjs`; every-anchor run by `apps/atlas/scripts/book-check.mjs --legends banshee` (50 pass, 0 fail, 2 skip: RTL flag off, Slow 4G not asked; `.debug/phase-6/book-check-6.15.json`). Servers rebuilt, run with `node --env-file=.env`, stopped after.

**First run found two failures, both fixed (attempt 1 for the anchor, attempt 2 for the tutorial top):**
- `/anchor/banshee--ch-3` in Book_View: heading at y = -137 (390) and -121 (1280), focused but above the screen. Cause: the first landing ran `scrollIntoView` on the section while it was still the 3033 px tall one-page layout; after the Book paged, nothing scrolled the page window back. Fix: in the paged branch of the hash landing, `Book.tsx` scrolls the book viewport into view (`block: 'start'`, instant), and `book.css` gives `html[data-book='on'] .book-viewport` `scroll-margin-block-start: calc(var(--app-header-h, 3.5rem) + 1rem)`.
- Tutorial scene top at 390 was 215 (goal line from 6.5 pushed it past 200). Fix in `scene.css`, below 40rem only: top bar and scene grid row gap 0.25rem, note line-height 1.2. First try (top-bar gap only) gave 203; second gave 197.

**Final measurements**
| Check | 390x844 | 1280x800 |
|---|---|---|
| Toggle, Book_View | "Read as one page", aria-pressed false | same |
| Toggle, one-page view | "Read as a book", aria-pressed true | same |
| Book page height / Banshee pages | 644 px / 52 | 600 px / 21 |
| Cross links (atlas header) | `/`, `/#legends` (target exists), `/game/` | same |
| Cross link (game header) | "The atlas" to the atlas origin | same |
| Legend h1 (hero ends) | 304 to 344 (hero 61 to 280) | 453 to 501 (hero 61 to 429), inside 800 |
| Fear text | "Fear: 0 of 100" visible | same |
| Hint pair (tutorial) | one Hint 1, one Hint 2 | same |
| Hint 1 sheet | opens 437 to 507, page height unchanged (893) | 503 to 573 (849) |
| Scene top before/during/after a move, Banshee (server move, 1.5 s latency, "Working on your last move…" shown during) | 169 / 169 / 169 | 125 / 125 / 125 |
| Scene top before/during/after, tutorial tap (local, no pending) | 197 / 197 / 197 | 171 / 171 / 171 |
| Anchor heading, one-page view (top, bottom) | 72 to 108, focused | 72 to 108, focused |
| Anchor heading, Book_View | 70 to 142, focused | 72 to 108, focused |
| `/anchor/nope--zzz` | "This page is not in the atlas" | same |
| Smallest Sources link (both views) | 28 px (19 links) | 28 px |
| Contents rows | 44 px (9 rows) | 44 px |
| Tutorial scene top (18.3) | 197 (under 200) | 171 |

**Hint 2 (tutorial, guest).** `window.open` replaced in the page by a recording stand-in (headless has no real pop-up blocker), so these check the page's calls, not Chrome's blocker.
- Blocker off: opens `about:blank`, then `location.replace` to the chapter (`keepers-note--ch-1`); fear 0 to 10 = `FEAR.tutorialHint2`.
- Blocker on (`open` returns null): sentence "Your browser blocked the new tab. Open the chapter here:" and the chapter link; fear 0 to 10.
- Aborted (network offline): tab opened and closed, no link, fear unchanged (0), alert "Something went wrong. Please try again."
- Refused call: not reachable as a guest without forcing a server refusal; covered by `hint2-tab.test.tsx` (6.10, every refusal reaches the handler as null, same path as aborted).
- Signed-in world Hint 2 not run (no sign-in on production; no test account used here).

**Note, not fixed.** At 390 the tutorial drawer panel (fixed sheet, 494 to 836) covers the hint buttons while it is open; the player closes it to ask for a hint. At 1280 the buttons stay reachable. Left for the guard pass or Owner.

Screenshots (`.debug/phase-6/`): `p2-legend-{book,scroll}-{390,1280}.png`, `p2-anchor-{book,scroll}-{390,1280}.png` (`-b` probe copies are from before the fix), `p2-tutorial-*`, `p2-hint1-sheet-*`, `p2-shift-{tutorial,banshee}-*-during.png`, `p2-hint2-{aborted,blocker-off,blocker-on}-*`.
## Task 8.2: screen checks (local production builds, guest, headless Chrome)
Atlas rebuilt and game rebuilt, both run with `node --env-file=.env` as background processes (3001, 3000), stopped after. Scripts: `apps/atlas/scripts/screens-check.mjs` (24 checks) and `apps/game/scripts/screens-check.mjs` (24 checks); numbers in `.debug/phase-6/screens-atlas.json` and `screens-game.json`; screenshots `.debug/phase-6/screens-{atlas,game}-<screen>-<width>.png`. Both run at 390x844 and 1280x800. Final run: atlas 24 pass, 0 fail; game 24 pass, 0 fail, 0 skip.
| Screen | How it was reached | Result |
|---|---|---|
| Atlas home | `/` | pass (h1 inside first screen, no sideways page scroll) |
| World map | scroll to the map; 12 pins (44 px minimum), first pin opened, Escape closed | pass |
| Legend page, Book_View and Scroll_View, with references | `/legends/banshee`, toggle button; 19 sources with external links; the contents link to `#sources` brings the section into view in both views | pass |
| Anchor link | `/legends/banshee#banshee--ch-2` in both views | pass, lands in view |
| Hall | `/game/` | pass (primary action on first screen) |
| Tutorial | `/game/tutorial`; fear meter and hint pair present; Hint 1 opens text, fear unchanged | pass |
| Banshee world | `/game/world/banshee`; hotspots tapped until a puzzle opens | pass |
| Hint 1 / Hint 2 | buttons clicked on the open puzzle (`window.open` stubbed to read the target); Hint 2 target ends `banshee#banshee--ch-N`, fear rises by 6; that atlas anchor then loaded and is in view | pass |
| Fear meter | `aria-valuenow` and visible fill read in every scene | pass |
| Dead end | guest play token copied before each answer and put back after a wrong one (browser localStorage only), threads followed until one showed its contradiction with an atlas proof link | pass |
| High fear and restart | wrong answers kept until the meter was 75 or more (screenshot), more until the restart notice (focused, role alert); up to 5 fresh runs because the seed decides the right option | pass |
| Win screen | same token method through all puzzles and threads to the ending panel (focused, score text, Hall button) | pass |
Not covered: signed-in screens. A local dev sign-in is not available without reading `.env`, so none was attempted; no account was created and production was not touched.
**Failures and fixes**
- Atlas local server `scripts/pipe-response.mjs` crashed with `ERR_STREAM_UNABLE_TO_PIPE` when a client left before the body started (seen when the checker closed pages). Fix (attempt 1): return early if `res.destroyed`. `pipe-response` tests pass (2); server restarted, no crash in later runs.
- Checker mistakes fixed in the scripts (not app faults): pin count included the 12 card close buttons; hint buttons were clicked while the page was still busy with queued taps (they are `aria-disabled` then); Hint 1 fear compared to a value read before decoy taps added fear.
## Task 8.3: keyboard-only pass (local production builds, guest, headless Chrome, 390x844 and 1280x800)
Script `.debug/phase-6/keys-check.mjs` sends real key events through the DevTools Input domain (Tab, Shift+Tab, Enter, Space, Escape, ArrowLeft/Right, Home, End); it never calls `click()` or `focus()` to move around. Every Tab stop is described with its computed outline style, width, offset and colour; ring contrast is computed against the resolved background behind the control, and for controls over a picture (scene hotspots, viewer, paper with texture) also from screenshot pixels just outside the ring (median). Numbers and every stop: `.debug/phase-6/keys-atlas.json`, `keys-game.json`; log `keys-run.log`; screenshots `keys-{atlas,game}-<scenario>-<width>.png`. Atlas and game rebuilt after the fixes, run with `node --env-file=.env`, stopped after. Final run: **255 pass, 0 fail**.
**Covered:** atlas home (skip link, header, hero, 12 map pins, pin card Enter/Space/Escape/Close, 12 card links, footer; Shift+Tab); legend page in Book_View (Previous/Next with Enter and Space, page area with ArrowLeft/Right, toggle with Enter and Space) and one-page view (9 Contents links, 19 Sources links, Contents Enter lands on its chapter); game Hall (doors, locked-door panel open/Close/Escape, viewer); header menu at 390 (Enter opens, Escape returns focus, Tab passes the open menu, no trap) and at 1280 (button hidden, items are Tab stops); tutorial and Banshee world (viewer pan keys, pan buttons, hotspots, Hint 1 sheet, Escape, sheet Close, Hint 2, scene tab, answer options).
**Focus rings (computed)**
| Where | Ring | Stops (390 / 1280) | Lowest contrast |
|---|---|---|---|
| Atlas home, dark | solid 3px rgb(244,213,141), offset 3px | 32 / 32 | 12.45 |
| Legend, dark (header, contents, sources in one-page view, book controls) | solid 3px rgb(217,164,91), offset 3px | 35 / 35 | 8.01 |
| Legend, paper (links and page area inside the book) | solid 3px rgb(43,29,18), offset 3px; page area inset 3px ring | 21 / 21 | 12.67 |
| Game Hall | solid 3px rgb(244,213,141), offset 3px | 38 / 38 | 11.32 (pixels over the picture: 7.46) |
| Tutorial | same | 18 / 18 | 11.32 (pixels: 12.74) |
| Banshee world | 244,213,141 (header) and 217,164,91 (theme) | 19 / 19 | 8.01 (pixels: 8.01) |
Order: no stop jumps back up the page by more than 120 px, except hotspots and map pins, which follow the picture's own order and were left out of that check. No keyboard trap: every sweep wraps to the document. Viewer pan keys at 390: ArrowRight, ArrowLeft, End, Home all move the scene; at 1280 the scene fits the viewer (both pan buttons disabled), nothing to pan.
**Failures and fixes**
- Book page area ring 1.1:1 (paper): the global outline is cut by the viewport's `overflow: clip`/`clip-path`. Fix (attempt 1): `skeleton/src/book/book.css` `html[data-book='on'] .book-viewport:focus-visible { box-shadow: inset 0 0 0 3px var(--color-ring) }`; now 12.67:1.
- Hotspot ring over pale parts of the painting 1.44 to 2.53:1 (Sleeping cat, Keening shawl). Fix (attempt 1): `skeleton/src/design/mood.css` focus rule split from hover; adds a 9px `--color-bg` band under the ring so both sides of the ring are dark (two-colour ring). Now 7.46:1 or more on every sampled hotspot.
- Pan button pressed with Enter until the end became `disabled` and focus fell to the page body (390). Fix (attempt 1): `SceneViewer.tsx` moves focus to the other pan button when that happens.
- Hint 1 sheet Close button removed itself with focus on it (body). Fix: `HintArea.tsx` Close returns focus to Hint 1.
- Hint 2 button is replaced by the chapter link after the reply (body). Fix: `HintArea.tsx` focuses the link when focus was left on the body.
- A wrong answer disables the focused option (body). Fix: `WorldPlay.tsx` `Question` moves focus to the first option still open; a solved puzzle that closes its question sends a dropped focus to the scene heading.
- Checker mistakes fixed in the script, not app faults: Tab in the locked panel first reaches "Start in the study" (navigates), so the check now tabs to Close; menu second case started from the wrong control; book Space test started on the last page; ring pixels sampled before the 200 ms glow transition ended and outside the band.
Not covered: signed-in screens (no sign-in without reading `.env`); RTL keys (task 8.4).

## Task 8.4: reduced-motion and RTL passes (local production builds, guest, headless Chrome, 390x844 and 1280x800)
Script `.debug/phase-6/rm-rtl-check.mjs` (`motion`, `rtl`, `all`); probe `rtl-probe.mjs`; numbers in `.debug/phase-6/rmrtl.json`; screenshots `rm-switch-{390,1280}.png`, `rtl-{atlas,game}-<screen>-{390,1280}.png`, `rtl-atlas-home-popover-*.png`, `rtl-game-*-menu-390.png`. Atlas and game rebuilt, run with `node --env-file=.env`, stopped after. Final: motion 46 of 46 pass, RTL 63 of 63 pass.

**Reduced motion.** Two modes per screen: OS emulation (`prefers-reduced-motion: reduce` via DevTools, no stored setting) and in-app (`kiroween.motion.v1=reduce` plus `data-motion="reduce"`, OS says no preference). Screens: atlas home (pin card opened), legend page in Book_View (Next page clicked, scanned right after), game Hall, tutorial scene and Banshee scene (hotspots hovered and focused). Every element and `::before`/`::after` (1383 to 1491 styles on atlas, 306 to 417 on game) has computed `animation-name: none` and no non-zero animation or transition duration; `document.getAnimations()` is empty, read twice 250 ms apart. Control: with full motion the same scan finds 25 elements and 9 to 11 running animations, so a clean scan means something.
Motion switch and fear meter (tutorial, OS and in-app starts): switch is on at start with `data-motion=reduce`; the fear meter and the switch have no transition; clicking turns it off (attribute removed, storage `full`) and on again (attribute back, storage `reduce`), a marker on `window` survived, so no reload; nothing animates after switching back.
**First run failures, fixed (attempt 1, all pass after):**
- Game, in-app setting only: `.fear-meter-fill` kept `transition: 300ms` (its rule was media-query only). Fix: `html[data-motion='reduce'] .fear-meter-fill { transition: none }` in `fear.css`.
- Atlas, `data-motion` set: map pins kept a 200 ms `motion-safe:` transition (media only). Atlas has no in-app switch of its own, but `book.css` honours the attribute, so for consistency: class `map-pin` on the pin (`WorldMap.tsx`) and `html[data-motion='reduce'] .map-pin { transition: none }` at the end of atlas `styles.css`.

**RTL** (`dir="rtl"` set on `html` before the page runs; the Arabic locale is behind `FEATURE_ARABIC` and its text catalog is empty, so English text is shown). Screens: atlas home, legend page, game Hall, tutorial, Banshee scene, at 390 and 1280; the game header menu at 390; the pin card on the map.
- No horizontal overflow (page and every visible element outside scrollers) on all 10 screens.
- Header brand moves to the right edge on all screens (for example 8..133 to 242..367 at 390; 73..205 to 1060..1193 at 1280). Hall and tutorial headings follow it; the home hero copy panel moves to the right at 1280.
- `.icon-dir` arrows (Back to the hall) have `scaleX(-1)`; Book chevrons flipped; the pan buttons keep their physical glyphs by decision (1.7).
- Map: scroller stays `direction: ltr`; at 390 it starts centred (scrollLeft 285 of 960); at 1280 it fits.
- Popovers: pin card (9..367 at 390; 409..857 at 1280) and the game header menu (12..154, under its button at the inline end of the row) stay inside the viewport.
- Focus ring: 12 Tab stops per screen, 3 px solid, never clipped by either viewport edge.
- By design, not a fault: `unicode-bidi: plaintext` on headings, paragraphs and list items (atlas `styles.css`) makes English text keep its own start edge inside an RTL page, so the h1 and intro text stay left-aligned inside a mirrored box. The check accepts that.
**Failure fixed (attempt 1):** Banshee scene tabs at 390 in RTL: Tab left "The loft room" half out of the scrolling tab row (ring cut). Fix: `SceneNav.tsx` `onFocus` on the tab nav calls `scrollIntoView({block:'nearest', inline:'nearest'})` and `scene.css` `.scene-tabs` gets `scroll-padding-inline: 6px`. Passes after.
**Checker mistakes fixed in the script (not app faults):** pin click landed off-screen inside the scrolling map (now `.click()` after scrollIntoView); h1 mirror check ignored the plaintext rule; Tab sampled before the scroll settled.
Not covered: Arabic text itself (no catalog), signed-in screens. Tests after the edits: game 373 pass, atlas 283 pass, tsc clean in both.

## Task 8.5: before/after screenshot set
Inventory: every P1 item 1 to 10 has before and after files at 390 and 1280 (paths in `screenshots-index.md`). Gaps: the item 4 and item 5 before shots have no open puzzle (task 1.1 shot the scene and legend page only); old code cannot be rebuilt (git read-only), so these are recorded as gaps. Filled with fresh after shots with a puzzle open: `.debug/phase-6/item4-puzzle-{390,1280}-after.png` (and refreshed `item5-game-*-after.png`) from a rebuilt local game, run with `node --env-file=.env`, stopped after; `ui-check.mjs` 8 of 8 PASS (text 12.67:1). Stale error-page PNGs from task 3.7 were already overwritten in task 4.8; none remain invalid.

## Task 8.F2: hotspot glint (1280x800, guest, local builds, game 3000 + atlas 3001 as image origin)
- **Images.** With the atlas running on 3001 the scene images load (`naturalWidth` 4096, tutorial and Banshee); the earlier broken-image boxes came from the image origin not running. Measured on the real paintings.
- **Method.** `.debug/phase-6/f2-glint.mjs before|after`: 1280 screenshot with the hotspot centred, second screenshot with the glint hidden, 64 px crops saved as `.debug/phase-6/f2-glint-{before,after}-{1,2,3}-*.png` (tut-coat darkest, tut-mirror middle, tut-corkboard brightest of 13 hotspots measured). After shots are taken with the animation held at its brightest step (opacity 1). Contrast = WCAG luminance ratio.
- **Before** (6 px core at opacity 0.35 to 0.7 in a 14 px box): glint core vs painting ring (r 18 to 26 px): coat 4.02, mirror 1.79, corkboard 1.63. Only the dark one passed; the other two did not.
- **After** (core 9.4 px across, dark rim to 13 px, halo to 36 px, peak opacity 1, static 0.9): core vs its adjacent rim ring: coat 13.48, mirror 3.80, corkboard 7.97 (all >= 3:1). Core vs plain painting ring: coat 12.25, mirror 4.13, corkboard 1.74; on the brightest painting the dot is separated by its dark rim (7.97), not by the painting itself.
- **Reduced motion.** Computed style: animation `none` and opacity 0.9 under OS and in-app reduced motion is pinned by source test; not re-run in the browser.
- **Test.** New `apps/game/test/hotspot-glint-rule.test.ts` (size >= 8 px, rim, halo, peak opacity, opacity-only motion, reduced-motion static). scene-glint and hotspot.property tests unchanged and pass; tsc clean.

## Task 8.F5: re-run after owner feedback F1 to F4 (local production builds, guest, headless Chrome, 390x844 and 1280x800)
Rebuilt with `pnpm -r build`; game on 3000 and atlas on 3001 via `node --env-file=.env`; stopped after.
| Check | Result |
|---|---|
| `apps/game/scripts/screens-check.mjs` | 23 pass, 0 fail, 1 skip (1280 dead end: seed ended in a win; run alone with `--only dead`: 2 pass) |
| `apps/game/scripts/ui-check.mjs`, `header-check.mjs` | all PASS (options on paper 12.67:1, menu 390 and 1280) |
| `.debug/phase-6/keys-check.mjs all` | first run 254 pass, 4 fail (all script-side: map-pin class, pan range 32/48 px); after the script fixes 258 pass, 0 fail |
| `.debug/phase-6/topbar-keys.mjs` (real Tab, scene top bar: back link, tabs, Next scene) | all stops reachable in order at both widths, ring 3px solid on every stop, focused tabs inside the row, Shift+Tab back; 390 one scrolling row (no page overflow), 1280 no scroll (3 scenes fit one row); 2 count-artifact fails fixed in the script |
| `.debug/phase-6/rm-rtl-check.mjs motion` (OS and in-app, glint on tutorial and Banshee, fear meter) | 46 pass, 0 fail; control with full motion sees 25 animated styles; reduced: 0 bad styles, getAnimations 0 |
| Real high-fear caption (screens-check) | 390: caption 36,185-322,249 inside scene 16,169-374,459, no control or text hit, pointer-events none, opacity 1; 1280: caption 481,193-767,257 inside 80,177-1200,609, no hit; notebook starts at 1285 (390) and 1185 (1280), well below. 6 pass, 0 fail |
Not checked: RTL, signed-in, a caption held with the notebook scrolled into view (see decisions).

## Task 9.2: production guest checks (Requirement 37.1, 37.4; headless Chrome, 390x844 and 1280x800)
Targets (from `docs/phase-5-handover.md`): atlas `https://trick-or-told.vercel.app/`, game `https://trick-or-told.vercel.app/game/` (rewrite to the `trick-or-true` project). Existing scripts were pointed at these with their `--base`/`--game`/`--atlas`/`--shots` arguments; `keys-check.mjs` was copied to `.debug/phase-6/prod-keys-check.mjs` with the two base URLs and the output dir changed. No local servers were started. Screenshots and JSON: `.debug/phase-6/prod-shots/` (52 files) and `.debug/phase-6/prod-keys/` (34 files).
**What was done on production (guest only).** No sign-up, sign-in or credentials. Page loads, plus the scripts' normal guest play in a fresh browser context: tutorial Hint 1; Banshee world, taps on hotspots, Hint 1, Hint 2 (opens the atlas chapter), deliberate wrong answers to raise fear to a full meter (restart notice), a dead end and a win (correct answers) on Banshee. This is the same play the local `screens-check.mjs` does. The guest play token lives in browser localStorage; the server calls are the normal guest play-API calls of those screens. The keys-check also did guest play in the tutorial and Banshee. The Slow 4G Scene_Paint timing table (37.2/37.3) is not part of this task and was not run.
**New UI is live.** Atlas header has "All legends" and `Play Trick or True` (`nav-play`, href `/game/`); home also has a `Play Trick or True` button; one map (12 `map-pin`, 12 `map-card`, one SVG outline); game h1 and title "Trick or True", header with "The atlas", Hall, Your progress, Sign in; Hall has "Start in the study" and legend links to `/legends/<id>`.
| Check | Result |
|---|---|
| `apps/atlas/scripts/screens-check.mjs` (home, map, Banshee Book_View and Scroll_View, references 19 sources / 19 external links, contents link, anchor `#banshee--ch-2`) | 24 pass, 0 fail |
| `apps/atlas/scripts/ui-check.mjs` contrast (Banshee, Naddaha, pages and scroll) | 8 pass, 0 fail |
| `apps/game/scripts/ui-check.mjs` (Banshee puzzle options) | 8 pass, 0 fail |
| `apps/game/scripts/header-check.mjs` | 10 pass, 0 fail |
| `apps/game/scripts/screens-check.mjs --only hall,tutorial,world,fear` (Hall, tutorial, Hint 1, Banshee, Hint 2 to `banshee#banshee--ch-1`, fear meter, high-fear caption, full meter restart) | 22 pass, 0 fail, 0 skip |
| `screens-check.mjs --only dead,win` (first attempt: Chrome start failure, DevToolsActivePort missing; second run) | 3 pass, 0 fail, 1 skip (1280 dead end not reached, the run reached the win first; same skip as local 8.F5; 390 dead end passes) |
| `prod-keys-check.mjs all` (keyboard pass, atlas and game) | 258 pass, 0 fail (same as local 8.F5) |
| Image URLs on atlas home, Banshee page and Hall (34 unique files, status and content type) | 34 ok, 0 bad |
**Production matches local.** Contrast minima are identical: Book_View 5.84 (Banshee) and 6.05 (Naddaha), Scroll_View 4.73 and 4.82, game options 12.67:1 for text, ring and border. Keys-check 258/0 equals the local total.
**Cross links both ways.** Atlas to game: header and home links to `/game/`. Game to atlas: header "The atlas", Hall legend links, and Hint 2 (the anchor page shows `banshee--ch-1`).
**Not run.** Only the 1280 dead end (above). No production-only defect found. Totals: 333 pass, 0 fail, 1 skip.
## Task 9.3: Slow 4G on production (https://trick-or-told.vercel.app, guest, read-only page loads)
Profile: 1.6 Mbps down, 750 kbps up, 150 ms RTT, CPU 4x, cache off, 390 px, headless Chrome, a fresh browser context per run (cold cache, no cookies), three runs, median, 15 s wait per run. Script `.debug/phase-6/prod-timing.mjs` (same LCP, FCP, loadEventEnd and summed encodedBodySize as `shoot.mjs timing`, plus the scene-paint probe of `apps/game/scripts/browser-check.mjs`); numbers `.debug/phase-6/prod-timing-9.3.json`. Only GET page loads: no taps, no answers, no sign-in or sign-up, no writes. Banshee scene 1 was loaded as the world route `/game/world/banshee` exactly as a guest visitor does (the route renders the world's first scene; no tap was made). The machine was under heavy load (load average 74), the same kind of condition as Phase 5 run 2.
| Page | LCP ms (3 runs) | FCP ms | load end ms | bytes (encodedBodySize) | scene paint ms |
|---|---|---|---|---|---|
| Atlas home | 5580, 16900, 3836 | 1348 | 5519 | 941385 | n/a |
| Game Hall | 3672, 3668, 3700 | 1072 | 3601 | 588225 | 3664 |
| Game tutorial | 3820, 3604, 3688 | 1076 | 3554 | 619276 | 3652 |
| Banshee scene 1 | 4644, 4584, 4532 | 1204 | 4497 | 1549525 | 4594 |
Medians are the middle value of each column. Atlas run 2 is a stall (FCP 13052 ms, load 16927 ms) caused by the loaded machine; the median ignores it.
Comparison (Phase 5 numbers: `docs/phase-5-handover.md` section 9; game metric is scene paint, median of 3; atlas home metric is LCP):
| Page | Phase 5 (4.7, run 1) | Phase 5 (10.7, run 2, loaded machine) | Now | Change vs run 1 | Change vs run 2 | Verdict |
|---|---|---|---|---|---|---|
| Atlas home (before = local build, task 1.1; now = production) | 6128 (local, not Phase 5) | n/a | 5580 production (local after, 3.7: 5360) | -8.9% | n/a | Local before vs production after, NOT like for like. Gate not confirmed (see note) |
| Game Hall | 3714 | 4025 | 3664 | -1.3% | -9.0% | PASS |
| Game tutorial | 3535 | 3969 | 3652 | +3.3% | -8.0% | PASS against run 2; +3.3% against run 1 |
| Banshee scene 1 | 4521 | 4848 | 4594 | +1.6% | -5.2% | PASS against run 2; +1.6% against run 1 |
Atlas home gate note (Req 15.12, limit 6741 ms): the 6128 ms "before" is from a local production build (task 1.1, three runs, local server); the 5580 ms "after" is from the Vercel production site, measured here. Different servers, network path and caching, and the production median comes from a run set with one stall (3836, 5580, 16900; the machine was under heavy load). `docs/phase-5-handover.md` section 9 has game scene-paint figures only and no atlas home figure, so no production before exists to compare against. The like-for-like pair is local before 6128 vs local after 5360 (task 3.7, -12.5%, gate met). The production number (5580) is below the limit but is not a valid before/after comparison, and it is higher than the local after (5360). Follow-up if the Owner wants a production gate: measure the atlas home at the last Phase 5 production commit (a Vercel preview deployment of that commit, same profile and script `prod-timing.mjs`, three runs on a quiet machine) and compare with the current production median.
Findings:
- The 3.0 s budget is still missed by all three game screens, as in Phase 5. Cause is unchanged: the scene image (Banshee scene 1 is 430910 bytes) arrives about 3.5 to 4.6 s in. Smallest fix is outside Kiro: phone-width scene copies under new asset ids (listed in `content-and-assets-needed.md`).
- Tutorial (+3.3%) and Banshee (+1.6%) are above Phase 5 run 1 by an amount inside the run-to-run spread of that table (run 1 to run 2 differs by 8 to 12%) and the three runs of each are within 3% of each other, so no regression is claimed. Hall, tutorial and Banshee scene paint are not worse than run 2, measured under the same kind of load.
- Banshee transfer: 1549525 bytes of resource body now against 1250 KB total in 4.7. Extra weight is the six hotspot sprites (43 to 115 KB each) and the spirit figure (168 KB), which load after the scene paint (deferral from Phase 5), so paint is not delayed by them. If the Owner wants a smaller total: lower the sprite sizes (assets, not changed here).
- No source, content or asset file was edited.

## Re-run after F5 to F8 (task 10.F9)
Built atlas on :3001 and game on :3000 (`node --env-file=.env`, both stopped after). Screenshots and logs only in `.debug/phase-6/f9/`. The 360 px width was added to `screens-check.mjs` (atlas and game) and to the `SIZES` table of `.debug/phase-6/keys-check.mjs`; the game `header-check.mjs` still runs at 390 and 1280 only (its header is the menu button layout; no wrap issue reported at 360).
| Check | Widths | Result |
|---|---|---|
| `apps/atlas/scripts/screens-check.mjs` | 360, 390, 1280 | 36 pass, 0 fail (12 at 360) |
| `apps/game/scripts/screens-check.mjs` | 360, 390, 1280 | 39 pass, 0 fail, 0 skip (13 at 360) |
| `apps/atlas/scripts/header-check.mjs` | 360, 375, 390, 1280 | 24 pass, 0 fail; header 61 px at 360, one row, targets 44 px, label-in-name, Tab order logo, legends, game |
| `apps/game/scripts/header-check.mjs` | 390, 1280 | 10 pass, 0 fail |
| `apps/game/scripts/ui-check.mjs` | 390, 1280 | 8 pass, 0 fail (option contrast 12.67) |
| `apps/atlas/scripts/ui-check.mjs` | 390, 1280 | 8 pass, 0 fail |
| `keys-check.mjs atlas` (keyboard pass) | 360, 390, 1280 | 141 pass, 0 fail. Atlas home at 360: all 32 focusable controls are Tab stops, every stop has a ring of 2 px or more with 3:1 contrast, none hidden, order follows the page, no trap. This includes the short "Play" header link; its accessible name is the full label (header-check "label-in-name" and "Tab order"). |
Fixes needed: none.

## Task 10.F11: ImageKit CDN, local builds, guest
Atlas and game rebuilt. CDN off: atlas 3001, game 3000. CDN on: atlas 3011, game 3010, with `IMAGE_CDN_URL=https://ik.imagekit.io/hrim` on the command line (`.env` not read; `ATLAS_ORIGIN=http://localhost:3001` also passed to both game servers so local sprites load). Scripts `.debug/phase-6/f11-check.mjs` (numbers `f11-check.json`, shots `f11-{off,on}-<page>-<width>.png`) and `f11-timing.mjs` (`f11-timing.json`). 390 px runs use DPR 2, 1280 px runs DPR 1. Fresh browser context per run, cache on. Servers stopped after.
Result: 0 broken images and 0 failed requests on atlas home, Banshee legend page (also after forcing every lazy image to load), Hall, tutorial and Banshee world, at 390 and 1280. 0 images downloaded twice. Every `ik.imagekit.io` URL has `tr=w-N` or `tr=h-N` (13 on atlas home, 8 on the legend page, 1 to 2 on game pages). Markers, the paper texture, hotspot sprites and the fear frame stay on `/media/`.
Bytes of images in the first view (KB, requests):
| Screen | 390 off | 390 on | 1280 off | 1280 on |
|---|---|---|---|---|
| Atlas home | 1630 (26) | 1242 (26) | 1630 (26) | 727 (26) |
| Banshee legend page | 138 (2) | 115 (2) | 544 (3) | 235 (3) |
| Banshee legend page, all images loaded | 1656 (9) | 590 (9) | 1854 (9) | 646 (9) |
| Hall | 310 (1) | 159 (1) | 310 (1) | 97 (1) |
| Tutorial | 336 (2) | 191 (2) | 336 (2) | 131 (2) |
| Banshee scene 1 screen | 1182 (9) | 830 (9) | 1182 (9) | 746 (9) |
Scene file picked: Banshee scene 1 431134 B (off) to `h-900` 231262 B at 390/DPR 2 and `h-600` 144958 B at 1280/DPR 1. Target 250 KB: met at both. Hall `h-900` 162887 B and `h-600` 99312 B; tutorial 159852 B and 98383 B.
Local Slow 4G (1.6 Mbps down, 750 kbps up, 150 ms RTT, CPU 4x, cache off, 390 px DPR 1, fresh context, 12 s wait, median of three; game metric is scene paint, atlas home is LCP). The machine was loaded (load average about 9), so absolute values are higher than in 3.7 and 9.3; compare only the pair. The CDN copies had been requested before (ImageKit cache warm).
| Page | CDN off ms (3 runs) | median off | CDN on ms (3 runs) | median on | change |
|---|---|---|---|---|---|
| Hall (paint) | 7679, 8423, 7061 | 7679 | 5283, 5238, 5246 | 5246 | -31.7% |
| Tutorial (paint) | 5405, 5307, 5285 | 5307 | 3195, 3238, 3447 | 3238 | -39.0% |
| Banshee scene 1 (paint) | 8457, 7131, 6979 | 7131 | 5876, 4677, 4672 | 4677 | -34.4% |
| Atlas home (LCP) | 6144, 5620, 5252 | 5620 | 3044, 2388, 2252 | 2388 | -57.5% |
Resource bytes (encodedBodySize, median): Hall 614840 to 713740, tutorial 625736 to 723706, Banshee 703948 to 856126, atlas home 1309355 to 1053463. The three game screens rise because the local server run (cache off) also counts the CDN's own responses; the scene file itself is smaller (see above). The 3.0 s budget is still missed by Hall and Banshee scene 1 on this loaded machine; tutorial (3238) and atlas home (2388) are near or under it. A second attempt was not run: the remaining time is JavaScript, fonts and first-connection cost to a second origin, not image size.

## Re-run "After F5 to F8" with F9 in place (task 10.F12)
Built atlas and game (`pnpm -r build`, pass). Each app ran on :3001 (atlas) and :3000 (game) with `node --env-file=.env`, once with `IMAGE_CDN_URL` unset and once with `IMAGE_CDN_URL=https://ik.imagekit.io/hrim` on the command line (`.env` not opened). Servers stopped after. Logs and screenshots only in `.debug/phase-6/f12/` (git-ignored).
| Check | Widths | CDN off | CDN on |
|---|---|---|---|
| atlas `screens-check.mjs` | 360, 390, 1280 | 36 pass, 0 fail | 36 pass, 0 fail |
| game `screens-check.mjs` | 360, 390, 1280 | 38 pass, 0 fail, 1 skip (1280 dead end), re-run of `--only dead` 3 pass | 37 pass, 0 fail, 2 skip (dead end at 360 and 1280); `--only dead` re-run twice: 2 pass, 1 skip (360) |
| atlas `header-check.mjs` | 360, 375, 390, 1280 | 24 pass, 0 fail | 24 pass, 0 fail |
| game `header-check.mjs` | 390, 1280 | 10 pass, 0 fail | 10 pass, 0 fail |
| atlas `ui-check.mjs` | 390, 1280 | 8 pass, 0 fail | 8 pass, 0 fail |
| game `ui-check.mjs` | 390, 1280 | 8 pass, 0 fail | 8 pass, 0 fail |
| `keys-check.mjs atlas` (header keyboard pass) | 360, 390, 1280 | 141 pass, 0 fail | 141 pass, 0 fail |
Totals: 0 fail in either mode. The "dead end not reached" skips are seed-dependent (the guest's random seed lets the script follow the true lead first and win; the same screen passes at the other widths and in other runs); this is the known behaviour from 8.F5, not a failure.
Images and CSP (CDN on, `.debug/phase-6/f12/csp-check.mjs`; 6 pages x 360/390/1280 = 18 loads: atlas home, Banshee legend, Flying Dutchman legend, Hall, tutorial, Banshee world, every `img[loading=lazy]` forced eager): 0 broken images, 0 failed image requests, 0 CSP violation events or console CSP messages. Image hosts seen: `ik.imagekit.io` and the local origins only (in production the local origins are `'self'`). Page HTML carries 21 `src="https://ik.imagekit.io` URLs on the Banshee legend page; built CSS has no external URL (only a `tailwindcss.com` comment).
The local servers send no production CSP, and injecting it with the CDP Fetch domain did not take effect (a probe image to a blocked host was not blocked), so enforcement was not shown by a browser. The fallback check: the CSP string in `skeleton/src/deploy/vercelRules.ts` is `img-src 'self' data: https://ik.imagekit.io`, which covers every image host found above (`'self'`, `ik.imagekit.io`); `data:` covers inline images; fonts are `'self'`. The game page loads hotspot sprites from the local atlas origin :3001 in this local setup (`ATLAS_ORIGIN`/media base), which is `'self'` on the shared production domain.
Incident: during the CDN-on run the atlas server process exited once on a Neon connection error (network timeout to the database; unhandled in the local `serve-build.mjs` process, not a code change). It was restarted with the same command and the image/CSP pass was run on the restarted server. The screens, header, ui and keys runs had all passed before that.
Fixes needed: none.
