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
