# Phase 6 review: tester findings

Scope: production https://trick-or-told.vercel.app/ (atlas) and /game/ (Trick or True), guest only, 2026-11-22.
Browser: built-in Browser pane (own tab). Widths: 1280x800 and 390x844 (emulated touch UA only at 390; clicks are mouse clicks).
No repo files edited. No sign-in. No load testing.
Evidence note: the Browser tool does not write screenshots to a chosen path. Screenshots were inspected inline only (no files saved under codex-debug-screenshots/tester/). Evidence below is computed values (getComputedStyle, getBoundingClientRect, localStorage, DOM) plus source line references.

Contrast method: WCAG relative luminance of computed `color` against the nearest ancestor with an opaque `background-color`. Non-text threshold 3:1.

## Findings

### P1-1. Book view on legend pages: "Versions and testimonies" cards are unreadable (dark ink on dark card). This is the owner's "references colours wrong".
- Routes: /legends/banshee, /legends/naddaha (confirmed on both; expect all 12 legends).
- Steps: open the legend with no stored preference (default is book view) -> go to the "Versions and testimonies" pages (Banshee about page 20+, Naddaha page 12 of 16) -> read the cards ("Reference summaries of the ...", Era, What they claim, Where it conflicts, Source).
- Expected: ink readable on the card.
- Actual: ink `rgb(43,29,18)` (parchment ink) on card `rgb(35,43,42)` (Banshee) or `rgb(26,42,52)` (Naddaha), ratio 1.13:1 / 1.11:1. Banshee: 42 text nodes fail; Naddaha: every card in the section. The cards have class `bg-surface` (dark) inside the parchment book page, so the book's "ink" colour tokens land on the dark surface token.
- Width: 1280 (same tokens apply at 390; not separately measured).
- Evidence: scan result `{"rgb(43, 29, 18) on rgb(35, 43, 42) ratio 1.13": 42}` on Banshee in book mode; card element `flex flex-col gap-3 rounded-xl bg-surface p-5`. Visual: card text visible only as a faint ghost on the parchment page.
- Contrast with one-page view: no failures on Banshee (Sources 7.01:1 links, 5.84:1 numbers, 13.8:1 heading). So the bug is specific to book view.
- Severity: P1 (unreadable core content, fails WCAG 1.4.3 by a wide margin).

### P1-2. Game puzzle answer buttons are almost invisible, and their focus ring too.
- Route: /game/world/banshee (guest). Steps: click hotspot "Keening shawl on peg" (or any that opens a puzzle) -> "Show the question" -> read the four answers.
- Expected: readable options, visible focus.
- Actual: option text `rgb(74,28,18)` on `rgb(20,24,26)` = 1.25:1 (class `world-button world-option`, 44px high). Focus outline on the same buttons is 3px solid `rgb(74,28,18)` (reported when focused programmatically; real Tab not confirmed on these buttons) so the ring is equally invisible. A player cannot read the answers without selecting text.
- Width: 1280.
- Severity: P1 (the main interaction of the game; WCAG 1.4.3 and 2.4.7 risk). Same root cause as P1-1: parchment-ink token on dark surface.

### P2-1. Atlas and game do not link to each other; the game nav has no way back to the atlas except a list at the bottom.
- Steps: atlas / and /legends/banshee: look for any link to /game/. Game /game/: header has Hall, Your progress, Sign in only.
- Actual: `a[href*=game]` on atlas home returns none; legend page has none. Game header has no "Atlas" link; the 12 "Read the legend" links sit at the very bottom of the Hall (y about 821-1013 on 1280x800).
- Expected: a visitor of either app can discover the other (the atlas is the sibling product).
- Severity: P2.

### P2-2. Atlas landing does not say what to do next; no primary action above the fold.
- Steps: open / at 1280x800 and 390x844.
- Actual: 1280x800: the H1 "Trick or Told" sits at y=589 of 800, above it is an empty dark band; there is one explanatory paragraph, no button. First screen shows no legends, no map and no CTA ("Start with a legend" or "Play the game"). The map section begins at y=793, below the fold. At 390: H1 at y=256, map at about y=700. Header "All legends" link goes to `/` (same as the logo; both `href="/"`), so it does nothing on the home page.
- Expected: within 10 s a new visitor can tell what this is and where to click.
- Severity: P2 (owner complaint "landing pages weak" confirmed on usability grounds).

### P2-3. Two maps on the home page; the interactive one is unreadable on phones.
- Steps: / at 390x844, scroll to "Where the legends are told".
- Actual: first a decorative parchment world-map strip (cropped, not interactive, `img` 4096px wide), then the interactive SVG map. On 390 the interactive map is 960px wide inside a 358px scroll box (`overflow-x:auto`, tabindex 0): only 2 of 12 pins are on screen (US East coast and Caribbean; Europe/Asia are offscreen), and the only scroll cue is a 1px-ish scrollbar. The hint "On small screens it scrolls sideways" exists only in the region's aria-label, not as visible text. 12 pins are 44x44 and none overlap (checked with 30px threshold), good.
- Expected: a visible "swipe the map" hint, or map starts centred on Europe, or the continent list first.
- Also (desktop): pins have no visible labels; the legend card opens as a centred modal popover that covers the map (not anchored to the pin). Escape closes it and returns focus to the pin (good).
- Severity: P2.

### P2-4. Hall gives no way to start; locked doors silently route to the tutorial.
- Steps: /game/ as guest. Read the notice "You can enter the tutorial and one world". Look for a Tutorial / Play button.
- Actual: no link to /game/tutorial anywhere in the DOM (`a[href*=tutorial]` = none). All 12 doors announce "The door is locked. Find the key in the study." Clicking a visible locked door navigates to /game/tutorial with no message (Hall.tsx line 79: locked -> `onNavigate({to:'tutorial'})`). Hotspots such as the brass lamp do nothing visible. The guest world (Banshee) is not marked anywhere; direct URL /game/world/banshee works without finishing the tutorial, which contradicts "locked".
- Expected: a visible "Start here: the tutorial" action; the guest world door marked as open.
- Severity: P2 (first-visit confusion; a visitor who does not click a padlock never finds the tutorial).

### P2-5. Game screens push controls, fear meter and hints below the fold; scene layout shifts on every action.
- Steps: /game/tutorial at 1280x800. Measure positions.
- Actual: scene is about 650px tall; Pan buttons y=837, fear meter y=916, Hint 1/Hint 2 y=977 on an 800px viewport; user must scroll to reach any control. After a hotspot click the page scrolls to the response panel and the scene is half off-screen. While a move is processed the text "Working on your last move..." is injected above the scene and moves the scene and buttons down about 25px (seen on hotspot click and Hint 2), then it moves back, so click targets jump. World pages: scene nav wraps ("Next scene" alone on a second row) and leaves a roughly 80px empty band before the scene.
- Severity: P2.

### P2-6. Tutorial has no stated goal; hint 1 text is vague.
- /game/tutorial text: "Drag the room left and right to look around..." only. No objective ("find the key"), no explanation of fear, hints, or puzzles. Candle response: "A pencil mark on the wall points toward the corkboard." Hint 1: "One pin is newer than the rest." Hint 2 (opens atlas) lands on /legends/keepers-note#keepers-note--ch-1.
- Fear meter has no visible number or label (only `aria-label="Fear: 10 of 100"` on a role=meter bar), so sighted players get an unlabeled bar.
- Severity: P2.

### P2-7. Hint 2 opens the atlas via `window.open` after an async call; popup blockers will block it.
- Steps: /game/tutorial, click Hint 2.
- Actual: after "Working on your last move..." the Browser pane reported "the page tried to open a popup window ... blocked". Source: routes/tutorial.tsx:65 and routes/world.$target.tsx:107 call `window.open(href,'_blank','noopener')` after the server round-trip, outside the user gesture. A fallback link "Open the chapter again (free)" appears (href `https://trick-or-told.vercel.app/legends/keepers-note#keepers-note--ch-1`, `target=_blank rel=noopener`, 44px high), but Hint 1's text stays on screen and fear has already risen to 10, with no sentence telling the player what happened or that the tab was blocked. In Safari / iOS expect the popup to be blocked every time.
- Severity: P2 (cost charged, reward not delivered; fallback not announced).

### P2-8. Book view page numbering and controls (atlas legend pages).
- Steps: /legends/banshee in book view, click Next.
- Actual: desktop shows "Page 1 of 22", Next shows "Page 2 of 22" while two-page spread content advances by more than one page of text; on 390 the book is "Page 1 of 57". Prev/Next and "Read as one page" are 44px targets but have no border/background (text-like, `background rgba(0,0,0,0)`), so they do not read as buttons (owner: "buttons poor"). First page of the book (Dramatization) fills only the upper half of the left page, and the right page starts with the chapter image whose lower third is an empty blank paper band. When the mode is stored, the choice persists in localStorage key `kiroween.book.v1` ("pages" or "scroll"), and the toggle label is the action ("Read as one page") not the state; `aria-pressed` is false in book mode, so the semantics read inversely to the label.
- Severity: P2/P3.

### P2-9. Desktop legend hero: first viewport is empty.
- /legends/banshee at 1280x800: the hero image is 648px tall, the title H1 is at y=733 (800px viewport), so the first screen shows a dark band and the title cut at the bottom edge. Same on /legends/naddaha. Mobile (390x844) is fine (H1 at y=304).
- Severity: P2.

### P2-10. Deep link `/anchor/banshee--ch-3` lands with the chapter heading hidden under the header.
- Steps: open /anchor/banshee--ch-3 at 390x844 (this is the target of game Hint 2).
- Actual: redirects to /legends/banshee#banshee--ch-3, book jumps to "Page 16 of 57", focus goes to `banshee--ch-3-title`, but window scrollY=1473 puts the heading at top = -100px (above the viewport). The first visible content is mid-chapter. Invalid anchor /anchor/nope--zzz returns HTTP 404 with "This page is not in the atlas / See every legend" (good).
- Severity: P2.

### P3-1. Reference links are small touch targets.
- Source list links on legend pages: 19px high (single-line) or 39px (two-line); WCAG 2.5.8 minimum is 24px (they are list items, not inline in a sentence). Also 12px-wide gaps. Example: "Banshee" 56x19, "Keening" 55x19, "Bunratty Castle" 102x19 at 390 width.
- Severity: P3.

### P3-2. Game puzzle notebook repeats identical "Hint 1 (free)" / "Hint 2 (raises fear): opens the atlas" buttons for each puzzle, including unopened ones.
- Four identical pairs; accessible names carry no puzzle name. Hints are offered for puzzles still "Not opened yet". Sighted/AT users cannot tell which puzzle a hint belongs to.
- Severity: P3.

### P3-3. Vague hotspot feedback.
- Banshee kitchen: "You hear something far away." "Nothing here." "You notice something." with no pointer on what changed. Dead ends are not distinguished from progress.
- Severity: P3.

### P3-4. Hall at 390: header wraps ("Sign in" on its own row), the scene is a 1010px tall column with only one door visible and Pan buttons at y=841 (below the fold).
- Severity: P3.

## What passed
- Skip link present on both apps; 44px header links; Escape closes the map popover and returns focus to its pin.
- Tab order and real keyboard focus ring on atlas brand link: 2px solid `rgb(217,164,91)`, offset 3px, `:focus-visible` true.
- Atlas one-page view: Banshee full scan, zero contrast failures.
- Game focus rings on scene buttons: 3px solid `rgb(217,164,91)`.
- No horizontal page overflow at 390 (`scrollWidth` 390 on /, legend, /game/).
- 404 route copy for a bad anchor.
- Mobile: all measured pins, pan buttons, scene nav buttons, hints are at least 44px tall.

## Coverage gaps (not tested)
- Win screen, fear overlay at high fear, dead-end states, and any signed-in-only world: not reached (puzzle answers are unreadable, see P1-2; I did not play to completion).
- Puzzles 3 to 5, scenes other than the peat-fire kitchen, panning by drag and by arrow keys (only button/hotspot clicks and JS clicks).
- Real touch gestures (swipe, long press); emulated 390 UA used mouse clicks only.
- Book view on legends other than Banshee/Naddaha at mobile width; whether P1-1 appears on all 12 legends (only 2 scanned).
- Screen reader behaviour (no AT run); `prefers-reduced-motion` and the "Reduce motion in scares" checkbox effect.
- Loading states on slow networks, offline/error copy for failed game API calls.
- Real Tab walk through the whole book (links on off-screen pages 20+ while on page 1) and focus ring on the game puzzle option buttons with a real key press.
- Safari/iOS (popup behaviour in P2-7 inferred from code plus the blocked popup in the Browser pane).
- Screenshot files were not saved to disk (tool limitation).
