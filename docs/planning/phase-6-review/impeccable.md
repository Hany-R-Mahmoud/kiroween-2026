# Live UI critique: Trick or Told (atlas) and Trick or True (game)

Date: 2026-11-22. Method: live production pages, guest only, own browser tab, 1280x800 and 390x844, read-only (no repo edits). Measured with computed CSS and page metrics.
Evidence note: the browser tool returns screenshots inline but cannot write PNG files to disk, so "evidence" below is computed CSS or measured values, plus the exact view reproduced. Nothing was saved in the repo. Dark mode only exists: the code has no `prefers-color-scheme` rule, so there is no light theme to test.
Severity: P1 hurts first impression, P2 clear weakness, P3 polish.

## Verdict on the owner's complaints

| Complaint | Verified? | Short answer |
|---|---|---|
| Layout and spacing weak | Yes | Narrow centred column, huge empty bands, scene pushed below the fold in the game. |
| Buttons look poor | Yes | Book controls are bare text with no fill or border; game buttons are small outlined chips, all the same weight. |
| First page of each app unconvincing | Yes | Atlas home opens on black, then a hero fades in; list below is a wall of underlined gold links. Game hall has no visible title and no call to action. |
| Two different maps | Yes | A painted strip and a flat vector map are stacked on the home page. |
| Feels like a Google results page | Yes | Every legend and nav item is an underlined gold link with grey metadata under it. |
| References colours wrong | Partly confirmed, see section 3 | The same page uses three link colours. Sources change look between book view and one-page view. |

## 1. Atlas home (/)

**A1 (P1) Two maps, unclear which is the map.** 1280 and 390. A painted strip `shared-atlas-map-01.webp` (1120x112 at desktop, 80 px tall on phone, opacity 0.6) sits directly above a flat grey vector world map (SVG, 960x379 on phone) holding the 12 painted markers. Both sit under one heading "Where the legends are told". The strip looks like the map but has no markers. Fix: delete the strip as a second map. Use the painted map as the single base, with the markers on it (or keep the vector map and use the painted image only as a heading banner with no map content). One map, one job.

**A2 (P1) Opens on black.** 1280 and 390. First paint is empty dark; the 1152 px hero fades in after about 1 s (image opacity transition, no placeholder). On a slow phone this reads as broken. Fix: render a dark gradient or low-resolution blurred placeholder in the hero box at the final size, and do not fade from nothing.

**A3 (P1) Hero is a stock picture, not an invitation.** Desktop hero is an open book with candle, then the h1 "Trick or Told" (48 px) and one grey paragraph, then a heading, then the map. No visible primary action; the page never says "start here". Fix: put one clear action in the hero ("Read the Banshee" or "Open the atlas") and put the map or the legend rail in the first screen. On phone the hero is cropped to a 170 px strip.

**A4 (P1) Legend list looks like search results.** 1280. 28 links on page. Each legend is: underlined gold title (rgb(224,168,75), `text-decoration: underline`), grey place line, white teaser, tiny "20 min · Scare level 3 of 5". Padding 0, border 0, no image, no card. All 12 legends look identical; two columns by continent only. Fix: turn each legend into a card with its own painted marker or thumbnail, theme colour, scare indicator (dots or small moon icons), and no underline on titles. Keep underline only for in-sentence links.

**A5 (P2) "All legends" nav link goes to `/`.** Header "All legends" has href `/`, the same as the logo. It does nothing useful on the home page and is underlined gold, the loudest thing in the header. Fix: link it to the list anchor or make a real index; style header links without underline.

**A6 (P2) Phone map is clipped, no hint to pan.** 390. SVG is 960 px wide inside a 390 px column, `overflow-x` visible on the wrapper but the page does not scroll (scrollWidth 390), so the markers east of the view are cut off, with a marker half-visible on the right edge. Only North America shows first. Fix: make the map scroll horizontally with a visible scroll hint, or fit the map to the width and use bigger markers.

**A7 (P2) Markers are small on desktop.** 1280. Marker images 36x36 (44 on phone). Below the 44 px floor in the repo's own design file for desktop pointer, and they cluster over Europe (6 markers within about 150 px). Fix: 48 px markers, spread with leader lines (already started), and show the legend name on hover and focus.

**A8 (P3) Spacing.** Phone heading "Where the legends are told" wraps to two lines with a large gap before the map (about 80 px). Section headings are 30 px small caps with the same weight as continent headings. Fix: tighten and add a clearer step between H2 and H3.

## 2. Atlas legend page, top of page (/legends/banshee)

**B1 (P1) Hero image loads late and shows black first.** 1280. hero is `banshee-atlas-hero-01.webp`, 2400 px wide, `loading=auto`; first screen is an empty dark box with only the title at the bottom. Fix: placeholder colour from the theme, preload the hero, serve a smaller width for phones.

**B2 (P2) Title block is offset and loose.** 1280. Hero is full-width (1152), the title and facts block is a 512 px reading column starting about 190 px from the left edge, so the heading floats under the picture without alignment to either. Facts list ("Where", "First in the record", "Scare level", "Reading time") is grey 13-14 px on dark. Fix: align title and facts to the same left edge as the hero or centre both. Give the facts a bordered "file card" look.

**B3 (P2) Contents is an underlined link wall.** 1280. Eleven underlined links in two uneven columns that wrap at different lengths (items 2, 4, 6, 7 wrap to two lines, 1, 3, 5 do not). On phone it is a plain vertical list of 11 underlined links with 44 px rows. Fix: a numbered chapter list with roman numerals, one column, no underline, and the chapter title weight as the hover state.

## 3. Legend page, book view and references

**C1 (P1) Controls are bare text.** 1280 and 390. Previous and Next page are 44x44 icon buttons with `background: transparent; border: 0` and the page text colour; "Read as one page" is the same. Computed: bg rgba(0,0,0,0), border 0. The pager sits under the book on a black ground, 14 px, grey; there is no pressed, hover or disabled style beyond colour. Fix: real buttons with fill, brass border, visible focus ring, and a toggle that shows its state (see C2).

**C2 (P2) Toggle label never changes.** 390 and 1280. The button says "Read as one page" in both modes and `aria-pressed` is "false" in both. After pressing it the page turns to the scroll layout (about 21,900 px tall at desktop, 31,900 px on phone) but the label stays. Fix: swap label to "Read as a book", set `aria-pressed`, and say the current mode in text. The choice is remembered in `localStorage` key `kiroween.book.v1`, so a returning reader lands in the last mode without a visible cue.

**C3 (P2) Book is small for the screen.** 1280. Pages are about 536 px wide and about 405 px tall inside an 800 px viewport, with the title block and hero above. Page 1 of 22; at 390 px it is 57 pages. The left page ends with empty paper under the opening paragraph (a large blank at the bottom of page 1). Fix: make the book fill the viewport height, remove the large blank, and start the book in view without scrolling past the hero.

**C4 (P2) Text clips during page turn.** 1280. Mid-turn frame shows the right page clipped at its right edge (words cut off). It settles after the transition. Fix: clip the moving layer to the page box or use opacity only.

**C5 (P1) References and tables switch colour world.** 1280.
- Book view, paper: source links are oxblood rgb(74,28,18) with underline, on parchment; text ink rgb(43,29,18); labels S1 to S16 14 px ink. The links are almost the same brown as the body text, so they do not read as links, and every title is underlined.
- One-page view, dark: source links are sage rgb(143,168,154) on dark, while the home page and the game use gold rgb(224,168,75) for links. So the same page has three link colours (sage for contents and sources, oxblood on paper, gold elsewhere).
- Versions table in book view has row borders rgb(35,43,42) (a dark teal grey) drawn on parchment, so the rules are nearly invisible or look like dirt.
- Label column S9 and S10 do not align (the "S10" label is wider so its text indents about 6 px more than the others).
This is the likely source of the owner's "wrong colours" complaint: references and table keep dark-theme tokens inside the paper, and links lose contrast against ink. Fix: define paper-specific tokens for link, rule, label, and citation chip. Use a single treatment for sources: small-caps label, title in ink, link underline only on hover or a thin dotted rule, URL host in muted ink.

**C6 (P3) Last page is half empty.** Page 22 shows sources on the left page only and a blank right page. Fine for a book, but add an end mark or "Back to the atlas" action there.

**C7 (P3) Footer is small.** 1280. Footer text about 11 px, grey on black, and the "fiction" disclaimer is the only place it is stated. Fix: 13 px minimum.

## 4. Game hall (/game/)

**D1 (P1) No visible title or call to action.** 1280 and 390. The h1 "Trick or True" is 16 px and 1 px tall (visually hidden). First visible text is a grey sentence about being a guest, then a 16 px label "The archive hall". Nothing says what the game is or which door to open. Fix: a visible title and a one-line premise, a primary "Start the tutorial" button, and a second action for the Banshee world.

**D2 (P1) All 12 doors are padlocked for a guest.** 1280. Every door says "The door is locked. Find the key in the study" including the Banshee, which a guest can play. The text above says "one world". Reading the hall, the guest cannot tell which door is theirs. Also the real route is `/game/world/banshee` (the guessed `/game/banshee` returns a 404 page). Fix: open padlock or glow on the playable door, locked ones dimmed with a "Sign in" tooltip, and make the study key path obvious.

**D3 (P2) Narrow column, no immersion.** 1280. The scene and all content live in a 768 px main inside 1280, with the rest dark. The hall picture is about 740 px wide. Fix: let the scene go full-bleed to the viewport width (or near) and put controls on the scene as an overlay.

**D4 (P2) Header wraps on phone.** 390. Nav ("Hall", "Your progress", "Sign in") wraps to two rows; "Sign in" drops under the logo. Fix: collapse into a menu or shrink to one row.

**D5 (P2) The "Read the legends" links are an underlined link wall.** 1280. 12 underlined gold links wrap across five rows under the scene. Same Google-style pattern as the atlas list. Fix: a compact row of chips or move to the atlas link in the footer.

**D6 (P3) Pan buttons.** "Pan left" is dimmed at the start and "Pan right" is bright; both are small outlined chips below the image, far from the thumb. Fix: place edge arrows over the image and support drag hints.

## 5. Tutorial (/game/tutorial) and a world scene (/game/world/banshee)

**E1 (P1) The scene is below the fold.** 1280 and 390. Tutorial: title, instruction, "Back to the hall" button and a label take the top 170 px; the scene starts at y=170 and is 503 px tall at 1280, pan buttons at y=837 (below the 800 px fold). Banshee world: five scene buttons wrap over two rows, then Back, fear bar and the scene label, so the scene starts at about y=420 on desktop and y=529 on phone (844 px high). The player sees buttons before the picture. Fix: a single compact top bar; scene full height; everything else in overlays.

**E2 (P1) Hotspots have no visible affordance.** 1280. Hotspot buttons are transparent with 0 border (for example "Candle" 87x123, "Locked drawer" 255x64, "Cracked mirror" 258x499). Nothing shows what can be clicked. The repo brief asks for hover glow and "hotspots read on a phone". The Hall shows gold padlocks, so the inconsistency is clear. Fix: faint pulsing glints on interactables, plus a "Show hotspots" toggle.

**E3 (P2) Clicking a hotspot gave no visible reply.** 1280. I used the "Spinning wheel and grey wool" hotspot; the `role=status` region stayed empty and "Threads: No threads yet" did not change. This may be that the item needs a puzzle first, but nothing says so. Verify with the code; either way a click must give a response line. Fix: show a short caption on every click ("Nothing here yet", or the clue).

**E4 (P2) Visible seam in the painted scene.** 1280 and 390. The kitchen panorama shows a vertical brightness step: at 1280 about halfway across the picture (through the fireplace), at 390 a lighter band at the left edge from x=16 to about x=74. Source image is 4096x1536 and appears to be two exposures joined, or an overlay edge. Fix: re-blend the seam in the asset or hide an overlay edge.

**E5 (P2) Fear meter is unlabeled decoration.** 1280. A brass slot graphic, 25 px tall on phone, no visible label; "Fear: 0 of 100" is read only by screen readers. A new player does not know it exists. Fix: visible small label and value, and a short warning when it rises.

**E6 (P2) Hint "drawer" is an inline box far below the scene.** 1280. Hint 1 opens a bordered box under the scene with a full-width "Close" button, which pushes the page and moves the scene up. In the Banshee world the notebook repeats "Hint 1 (free)" and "Hint 2 (raises fear): opens the atlas" eight times in a row (five puzzles). The hint 2 label leaks the cost in the button text. Fix: one side or bottom sheet with a puzzle picker, a single pair of hint buttons, and a confirm step before the atlas opens.

**E7 (P3) Reduce-motion control is a raw checkbox** (default browser look) at the bottom of the page. Fix: style it as a switch in a settings strip.

**E8 (P3) Scene switcher in the Banshee world.** 1280. "Previous scene", three scene names and "Next scene" are five same-weight buttons; the active one is a pale sage-green pill with underlined text. Fix: tabs or numbered thumbnails.

## 6. Game: end screen

Not reached: finishing a world needs solving all puzzles and I did not play to the end in guest mode in this pass. Not verified.

## 7. Cross-cutting

- **X1 (P1) Link and button vocabulary.** Links are underlined gold in the atlas, underlined sage on legend pages, oxblood on paper; buttons are outlined 1 px gold chips with bg rgb(28,22,32) in the game and bare text in the book. No primary button anywhere. Fix: define three styles (primary, secondary, quiet) and one link style used only inside text.
- **X2 (P2) Two apps, one skeleton, one look.** Both open with the same dark column and gold small-caps headings; the game does not feel like a game (no scene-first layout, no title art). Fix: the game gets its own hall-first start with full-bleed painting; the atlas gets the book and map.
- **X3 (P2) Heading scale.** The game uses 16 px gold small-caps labels for scene names and hall titles; reading-order is lost. Fix: set a scale (display 40, h2 28, label 12 caps) and use it everywhere.
- **X4 (P3) Dark only.** No light mode. Fine for the theme; just record it as a decision.
- **X5 (P3) Image loading.** Images fade from opacity 0 (map strip at 0.6) and the legend page loads 2400 px heroes. Fix: responsive `srcset`.

## 10 highest-impact fixes

1. Replace the two stacked maps with one painted map carrying the markers (A1).
2. Turn the legend list into illustrated cards with no underlined titles (A4, X1).
3. Give the atlas hero one clear action and a first screen that shows the map or a legend (A3).
4. Show a visible game title, premise, and "Start the tutorial" button on the hall; mark the guest-playable doors as open (D1, D2).
5. Make game scenes fill the screen; fold the title, scene tabs and Back into one compact bar (E1, D3).
6. Add visible hotspot glints and a reply line for every click (E2, E3).
7. Give the book controls real button styling and a labelled toggle with state (C1, C2).
8. Fix the references and table colours with paper-specific tokens, one citation style (C5).
9. Replace the repeated inline hint buttons with one hint sheet and a confirm before the atlas opens; label the fear meter (E5, E6).
10. Remove the visible seam in the painted scenes; add placeholders so first paint is never black (E4, A2, B1).
