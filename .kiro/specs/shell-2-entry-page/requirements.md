# Requirements Document

## Introduction

Shell phase 2 builds the entry page "Trick or Told" on the hidden route `/lab/shell` (not linked, noindex). The page shows two holographic cards: Told (the atlas) and True (the game). It reuses `HoloCard` from `@kiroween/skeleton/shell` and changes that component only where this phase needs it. Phase 3 will move the page to `/` and the atlas home to `/legends`; no route moves now, and `/lab/card` stays.

Two production fixes found on commit 7bb1328 come first: the WebGL renderer never starts on a cold load, and phones download wider layer images than the renderer draws.

Boundaries: no change to game logic, the puzzle generator, the play engine, `content/`, `assets/` or the database. No tests are written. Nothing is committed or pushed.

## Glossary

- **Entry_Page**: the page at `/lab/shell` in the atlas app.
- **HoloCard**: the card component exported from `@kiroween/skeleton/shell`.
- **Card_Pair**: the Told card and the True card on the Entry_Page.
- **Told_Card**: the HoloCard built from `shell-card-told-bg-01`, `shell-card-told-subject-01`, `shell-card-frame-01` and `shell-card-back-01`.
- **True_Card**: the HoloCard built from `shell-card-true-bg-01`, `shell-card-true-subject-01`, `shell-card-frame-01` and `shell-card-back-01`.
- **Front_Layers**: the background, subject and frame images of a card.
- **Back_Image**: `shell-card-back-01`, shown on the back face of both cards.
- **Shared_Images**: the frame image and the Back_Image, used by both cards.
- **Renderer_Starter**: the code in `HoloCard.tsx` that waits for the Front_Layers and then schedules the lazy WebGL renderer chunk.
- **Ready_Marker**: the `data-ready` attribute that shows a layer once its image has decoded.
- **Image_CDN**: the ImageKit host serving resized copies of the card images when the CDN base is set.
- **CDN_Base**: the image base URL provided by the app; empty when the CDN is off.
- **Preview**: the small blurred stand-in a card shows while its layers load.
- **Hint**: the line under the Card_Pair that explains drag and tap.
- **Entrance**: the one-time fade-and-rise of the cards and the sweep band across each card.
- **Idle_Sway**: the slow automatic tilt of a card with no pointer on it.
- **Catalog**: the atlas i18n file `apps/atlas/src/i18n/en.ts`.
- **Verify_Script**: the throwaway Playwright script in `.debug/shell-2/`.

## Requirements

### Requirement 1: Renderer starts on a cold load

**User Story:** As a visitor on a cold cache, I want the WebGL card to start after the images arrive, so that I get the full effect and not only the HTML layers.

#### Acceptance Criteria

1. WHEN a Front_Layer image is `complete` with `naturalWidth` 0 at the time the Renderer_Starter inspects it, THE Renderer_Starter SHALL wait for the next `load` or `error` event of that image.
2. WHEN the awaited `load` event fires and `naturalWidth` is greater than 0, THE Renderer_Starter SHALL continue and schedule the renderer.
3. IF the awaited image fires `error`, THEN THE Renderer_Starter SHALL stop and leave the HTML layers in place.
4. IF no `load` or `error` event arrives within 10 seconds of the wait starting, THEN THE Renderer_Starter SHALL stop and leave the HTML layers in place.
5. WHEN the Ready_Marker effect inspects a layer that is `complete` with `naturalWidth` 0, THE HoloCard SHALL keep waiting for the `load` event of that layer and set the Ready_Marker when it fires.
6. WHERE the app runs with the CDN_Base set and the browser cache disabled, THE HoloCard SHALL mount the canvas with `data-renderer="webgl"` after the images have loaded.

### Requirement 2: Layer requests match what the renderer draws

**User Story:** As a phone user, I want the card to download no more pixels than it draws, so that the page loads faster on mobile data.

#### Acceptance Criteria

1. WHERE the CDN_Base is set, THE HoloCard SHALL build the `srcset` of every layer from width steps that do not exceed the smallest step that is at least 1.5 times the widest shown width of the art box.
2. THE HoloCard SHALL keep the widest requested layer width at or below 1000 px on every device pixel ratio.
3. WHERE the CDN_Base is set and the viewport is 390 px wide at device pixel ratio 3, THE HoloCard SHALL request no layer wider than 800 px.
4. THE HoloCard SHALL use the same `sizes` and the same capped step list for every layer of every card, so that both cards of the Card_Pair request the same width for each Shared_Image.
5. WHERE the CDN_Base is empty, THE HoloCard SHALL use the local image URL without a `srcset`, as before.

### Requirement 3: Hidden entry route

**User Story:** As the owner, I want the entry page on a hidden route, so that I can review it before Phase 3 moves it to the root.

#### Acceptance Criteria

1. THE Entry_Page SHALL be served at `/lab/shell`.
2. THE Entry_Page SHALL set the page title "Trick or Told", a one-line description and `<meta name="robots" content="noindex, nofollow">`.
3. THE System SHALL add no link, sitemap entry or `robots.txt` line pointing at `/lab/shell`.
4. THE System SHALL keep the route `/lab/card` and the route `/` unchanged.
5. THE Entry_Page SHALL omit the site header and the site footer.
6. THE Entry_Page SHALL keep the skip link to the main content.

### Requirement 4: Told card

**User Story:** As a visitor, I want a second card that leads to the legends, so that I can choose between reading and playing.

#### Acceptance Criteria

1. THE Told_Card SHALL use the layers `shell-card-told-bg-01`, `shell-card-told-subject-01`, the shared `shell-card-frame-01` and the shared `shell-card-back-01`.
2. THE Told_Card SHALL show the cartouche word "TOLD" in the same style as the word "TRUE".
3. THE Told_Card SHALL show on its back face the title "Told", the line "Twelve legends, every version, with their sources." and the link "Read the legends".
4. THE HoloCard SHALL take the link target from the `href` prop, and the Entry_Page SHALL pass `/` for the Told_Card.
5. THE Told_Card SHALL expose the accessible name "Told: read the legends" on its front button.
6. THE Catalog SHALL hold every new visible string and accessible name under keys prefixed `shell.card.told.` or `shell.entry.`.
7. THE Told_Card subject SHALL lie inside the frame window and clear of the cartouche at 390x844 and 1280x800, checked by looking at screenshots in the same way as the True_Card.

### Requirement 5: Page header and order

**User Story:** As a visitor, I want a small title and one line above the cards, so that I know where I am while the cards stay the hero.

#### Acceptance Criteria

1. THE Entry_Page SHALL show the name "Trick or Told" in the display font as the page heading.
2. THE Entry_Page SHALL show the line "Twelve legends. Read them, then prove you did." under the heading.
3. THE Entry_Page SHALL render the heading and the line smaller than the cards so that the cards remain the largest elements.
4. THE Entry_Page SHALL place the Told_Card first and the True_Card second in the reading order, the tab order and the visual order.
5. WHERE the document direction is right-to-left, THE Entry_Page SHALL mirror the inline order of the side-by-side layout and keep Told first in reading order.

### Requirement 6: Responsive layout

**User Story:** As a visitor on any device, I want both cards laid out to fit my screen, so that I can see them without hunting.

#### Acceptance Criteria

1. WHILE the viewport is 1024x768 or 1280x800, THE Entry_Page SHALL show the Card_Pair side by side, centered, both cards fully visible on the first screen with a clear gap of at least 24 px under the cards.
2. WHILE the viewport is 768x1024, THE Entry_Page SHALL show the Card_Pair side by side with both cards fully visible.
3. WHILE the viewport is 390x844 or 375x667, THE Entry_Page SHALL stack the cards with Told above True, and THE Entry_Page SHALL show the whole Told_Card within the first screen.
4. WHILE the viewport is 390x844 or 375x667, THE Entry_Page SHALL show the top of the True_Card within the first screen, at least 48 px of its height.
5. WHILE the viewport is 667x375, THE Entry_Page SHALL show the Card_Pair side by side with no vertical scroll.
6. THE Entry_Page SHALL cause no horizontal scroll at 390x844, 375x667, 667x375, 768x1024, 1024x768 and 1280x800.
7. THE Entry_Page SHALL use logical CSS properties only and design tokens for color, spacing and type.
8. THE Entry_Page SHALL keep every interactive target at least 44 px in both dimensions.

### Requirement 7: Interaction hint

**User Story:** As a first-time visitor, I want a short hint on how to turn a card, so that I find the drag and the flip.

#### Acceptance Criteria

1. WHILE the primary pointer is a mouse or a trackpad, THE Entry_Page SHALL show the Hint "Drag a card to turn it." under the Card_Pair.
2. WHILE the primary pointer is touch, THE Entry_Page SHALL show the Hint "Drag a card to turn it, tap to flip." under the Card_Pair.
3. WHEN the user starts a drag of a card or flips a card, THE Entry_Page SHALL hide the Hint for the rest of that page visit.
4. THE HoloCard SHALL report the first drag start and the first flip of a card through an optional callback prop.

### Requirement 8: Behaviour of two cards

**User Story:** As a visitor, I want the two cards to behave as a pair, so that only one answer is open at a time and the page stays smooth.

#### Acceptance Criteria

1. WHEN one card settles on its back face, THE Entry_Page SHALL turn the other card to its front face if that card shows its back.
2. WHEN the Entry_Page turns the other card to its front, THE HoloCard SHALL leave keyboard focus on the card that settled on its back.
3. WHILE a card is outside the viewport, THE HoloCard SHALL stop drawing that card and its Idle_Sway.
4. WHILE the pointer is over one card, THE HoloCard SHALL apply the full pointer tilt and effects to that card only, and the other card SHALL keep its Idle_Sway only.
5. THE Entry_Page SHALL download each Shared_Image once for the Card_Pair.
6. THE Entry_Page SHALL request no host other than the app origin and the Image_CDN.

### Requirement 9: Entrance

**User Story:** As a visitor, I want a short entrance when the page opens, so that the cards feel introduced and not dropped in.

#### Acceptance Criteria

1. WHEN the Entry_Page mounts for the first time in a page load, THE Entry_Page SHALL fade and raise the Told_Card into place, and the True_Card SHALL follow 120 ms later.
2. WHEN the Entry_Page mounts for the first time in a page load, THE HoloCard SHALL cross each card with the sweep band once, the True_Card 120 ms after the Told_Card.
3. WHEN the Entry_Page mounts again in the same page load through client navigation, THE Entry_Page SHALL show the cards at rest with no Entrance.
4. WHILE reduced motion is on, by system setting or by the in-app setting, THE Entry_Page SHALL show the cards at rest with no fade, no rise and no sweep.
5. THE Entry_Page SHALL render the cards visible in the server HTML, so that the page is usable with JavaScript off.

### Requirement 10: Never an empty card

**User Story:** As a visitor on a slow connection, I want each card to show something of its own art while it loads, so that I never see a flat empty box.

#### Acceptance Criteria

1. WHILE the Front_Layers of a card have not decoded, THE HoloCard SHALL show a blurred Preview of that card's own art.
2. WHERE the CDN_Base is set, THE HoloCard SHALL build the Preview from its background image requested at a width of 32 px.
3. WHERE the CDN_Base is empty, THE HoloCard SHALL build the Preview as a CSS gradient from the hub palette tokens.
4. WHEN the first Front_Layer has decoded, THE HoloCard SHALL show it above the Preview.
5. WHEN the WebGL renderer has presented its first frame, THE HoloCard SHALL hide the Preview together with the HTML art.
6. THE HoloCard SHALL apply no fade to the Preview or the layers while reduced motion is on.

### Requirement 11: Continue where you left off

**User Story:** As a returning player, I want a quiet link to my last world, so that I can resume quickly, only if the game already keeps that value.

#### Acceptance Criteria

1. THE Entry_Page SHALL show no "Continue" line in this phase.
2. THE handover document SHALL state that "Continue" was skipped, name the reason (the game keeps no last-world value in the browser, and the legend name needs a database read), and list the game change that would unblock it.

### Requirement 12: Performance budgets

**User Story:** As the owner, I want the page to stay within the Phase 1 budgets, so that it works on a phone.

#### Acceptance Criteria

1. THE lazy WebGL chunk SHALL stay at or below 25 KB gzipped, shared by both cards.
2. WHERE the CDN_Base is set, THE Card_Pair SHALL load at most 500 KB of card images on a 390 px wide phone and at most 900 KB on desktop, both cards together.
3. WHERE the CDN_Base is empty, THE Verify_Script SHALL report the card image bytes and the width each image would be requested at.
4. WHILE both cards are on screen at 1280x800 with 4x CPU throttle on a real GPU, THE Card_Pair SHALL reach a median frame time of at most 22 ms.

### Requirement 13: Accessibility and keyboard

**User Story:** As a keyboard user, I want to reach and operate both cards, so that I can use the page without a pointer.

#### Acceptance Criteria

1. WHEN the user presses Tab from the page start, THE Entry_Page SHALL move focus to the Told_Card and then to the True_Card.
2. WHEN the user presses Enter on a focused card front, THE HoloCard SHALL flip that card and move focus to its link.
3. WHEN the user presses Escape on a card back, THE HoloCard SHALL turn the card to its front and move focus to its front button.
4. WHILE reduced motion is on, THE HoloCard SHALL swap faces with a crossfade and no rotation.
5. THE Entry_Page SHALL give the heading, the line and the Hint text contrast of at least WCAG AA on the hub background.

### Requirement 14: Scope limits

**User Story:** As the owner, I want this phase to stay inside its boundaries, so that no protected area changes.

#### Acceptance Criteria

1. THE System SHALL leave game logic, the puzzle generator, the play engine, `content/`, `assets/` and the database unchanged.
2. IF a step needs a change in a protected area, THEN THE handover document SHALL list it as a blocker and the step SHALL be skipped.
3. THE System SHALL add no secret, token or connection string to code, docs or committed config.
4. THE System SHALL add no test file and no test of layout, pixels, CSS, class names, copy or snapshots.
5. THE System SHALL add no multiplayer code.
