# Requirements Document

## Introduction

Phase 1 of the "Trick or Told" entry shell builds and proves one card: the "True" card, which opens the game. The card is a relic from the archive held up to a candle: restrained, heavy, gold that reads as metal, a subtle foil visible only at an angle, and depth from layers sliding against each other. At rest it looks like a finished painting in a frame.

The card can be held and turned: a mouse or touch drag spins it freely around its vertical axis, it keeps turning with inertia after release, and it settles on the front or the back. The card is a reusable component in the skeleton (`skeleton/src/shell/`). It is shown on a hidden, unlinked, noindex atlas page at `/lab/card`. First paint is plain HTML and CSS and is also the complete fallback. WebGL is a lazy upgrade. Phase 2 (second card, entry page) and Phase 3 (atlas moved to `/legends`, shell at `/`) are out of scope. If the quality is not good enough, work stops after this phase.

Scope boundaries: no change to game logic, the puzzle generator, the play engine, `content/`, `assets/` or the database. No tests are written; verification is one final "Verify" task.

## Glossary

- **Holo_Card**: The skeleton component in `skeleton/src/shell/` that renders the True card, front and back.
- **Card_Page**: The hidden atlas page at `/lab/card` that hosts the Holo_Card.
- **Front_Face**: The side of the Holo_Card showing the layers.
- **Back_Face**: The side of the Holo_Card showing the back image and HTML text.
- **Layer_Stack**: The ordered layers of the Front_Face: background, fog and embers, subject, frame, plus foil, sweep, rim light and vignette effects.
- **Background_Layer**: Image `shell-card-true-bg-01`, 1200×1680, opaque.
- **Subject_Layer**: Image `shell-card-true-subject-01`, 1000×1400, alpha.
- **Frame_Layer**: Image `shell-card-frame-01`, 1000×1400, alpha 0 or 255 only, transparent window, opaque from about x 22 to 978 and y 41 to 1360.
- **Back_Layer**: Image `shell-card-back-01`, 1000×1400, opaque.
- **Card_Outline**: The outer edge of the opaque Frame_Layer, used as the clip shape with a small corner radius.
- **Gold_Mask**: A mask computed in the shader from Frame_Layer colour where bright warm pixels are gold and dark plum pixels are not.
- **HTML_Renderer**: The first-paint renderer made of stacked `<img>` layers and CSS-only tilt. It is the full fallback.
- **WebGL_Renderer**: The lazily loaded single-canvas renderer using WebGL directly with one fragment shader.
- **Tilt**: The small rotation of the Holo_Card toward the pointer while it hovers, at most 12 degrees, with spring smoothing.
- **Spin_Angle**: The rotation of the Holo_Card around its vertical axis, in degrees, with no upper or lower limit. Multiples of 360 degrees show the Front_Face and odd multiples of 180 degrees show the Back_Face.
- **Drag_Threshold**: A pointer travel of 10 CSS pixels, beyond which a press is a drag and not a tap.
- **Inertia**: The continued change of the Spin_Angle after a drag is released, which slows down through friction.
- **Settled_Face**: The face (Front_Face or Back_Face) whose multiple of 180 degrees is nearest to the Spin_Angle once the Spin_Angle has stopped changing. Inertness, focus, rendering pause and Escape handling follow the Settled_Face.
- **Sway**: The very slow idle tilt that keeps the light moving.
- **Sweep**: The soft diagonal band of light crossing the card.
- **Reduced_Motion**: Active when the system `prefers-reduced-motion: reduce` setting is on or the in-app reduced-motion toggle is on.
- **Image_CDN**: The ImageKit service reached through `imageUrl` in `skeleton/src/assets/imageCdn.ts`.
- **Asset_Resolver**: `assetUrl` in `skeleton/src/assets/assetUrl.ts`.
- **Card_Strings**: The title "True", the line "The answers live only in the atlas. Find them before dawn.", the link label "Play the game", the accessible name "True: play the game" and the "Turn back" label, stored in the atlas i18n file.
- **Verify_Run**: The final task running typecheck, the test suites once, and the throwaway visual and performance checks.

## Requirements

### Requirement 1: Asset serving for shell layers

**User Story:** As a visitor, I want the card images to load fast at the size I see, so that the card appears quickly on my phone.

#### Acceptance Criteria

1. WHEN the Asset_Resolver receives an id starting with `shell-`, THE Asset_Resolver SHALL return the path `/media/shell/<id>.webp`.
2. WHERE the Image_CDN base is configured, THE Holo_Card SHALL request each layer through `imageUrl` with a width transform matching the displayed width.
3. WHERE the Image_CDN base is empty, THE Holo_Card SHALL request each layer from the plain `/media/shell/<id>.webp` path.
4. THE build SHALL copy the `assets/shell/` folder to the served media output in the same way as the other asset folders.
5. THE Holo_Card SHALL use the shell image files without resizing or re-encoding them in the repository.

### Requirement 2: Component placement and props

**User Story:** As a developer, I want the card to live in the skeleton and know nothing about the game, so that Phase 2 can reuse it in both apps.

#### Acceptance Criteria

1. THE Holo_Card SHALL reside in `skeleton/src/shell/` next to the existing pending and error views.
2. THE Holo_Card SHALL receive the layer image ids, the Card_Strings and the link target as props.
3. THE Holo_Card SHALL contain no reference to game, puzzle or play-engine modules.
4. THE Holo_Card SHALL be exported from `@kiroween/skeleton/shell`, next to PendingView and ErrorView, for use by the atlas app.
5. THE Holo_Card SHALL read colours, spacing and radii from design tokens defined in the design steering file and use logical CSS properties.

### Requirement 3: HTML first paint and fallback

**User Story:** As a visitor on any device, I want the card to look finished even without WebGL, so that the page is never broken.

#### Acceptance Criteria

1. WHEN the Card_Page first renders, THE HTML_Renderer SHALL display the Background_Layer, Subject_Layer and Frame_Layer as stacked images with a CSS-only tilt.
2. THE HTML_Renderer SHALL clip all layers to the Card_Outline with a small corner radius so that no background image shows outside the frame.
3. THE HTML_Renderer SHALL display a thin inner shadow of the frame over the picture along the inner window edge.
4. THE HTML_Renderer SHALL display the word "True" (styled as required by requirement 18) inside the Frame_Layer cartouche, at about x 410 to 590 and y 1215 to 1300 of the frame, as engraved dark text with a light lower edge.
5. IF WebGL is unavailable, THEN THE Holo_Card SHALL keep the HTML_Renderer as the final renderer.
6. IF the WebGL context is lost, THEN THE Holo_Card SHALL remove the canvas and display the HTML_Renderer.
7. WHILE Reduced_Motion is active, THE Holo_Card SHALL display the HTML_Renderer or a still lit WebGL frame without any tilt or spin.

### Requirement 4: Layer movement and parallax

**User Story:** As a visitor, I want the layers to slide against each other, so that the card has depth without large rotation.

#### Acceptance Criteria

1. WHEN the Tilt changes, THE Background_Layer SHALL move opposite to the Tilt by 3 to 4 percent of the card width at full Tilt.
2. WHEN the Tilt changes, THE Subject_Layer SHALL move with the Tilt by about 1 percent of the card width at full Tilt.
3. THE Frame_Layer SHALL remain stationary relative to the card.
4. THE Background_Layer SHALL be drawn larger than the card so that no edge is exposed at full Tilt.
5. THE Holo_Card SHALL draw the layers in this order from back to front: Background_Layer, fog and embers, Subject_Layer, Frame_Layer, foil and sparkles, Sweep, rim light and vignette.

### Requirement 5: Fog and embers

**User Story:** As a visitor, I want faint drifting embers and fog, so that the scene feels lit by a candle.

#### Acceptance Criteria

1. WHILE the WebGL_Renderer is running and Reduced_Motion is inactive, THE WebGL_Renderer SHALL draw between 30 and 60 embers rising slowly between the Background_Layer and the Subject_Layer.
2. THE WebGL_Renderer SHALL colour the embers #E0A84B and #F4D58D.
3. WHILE the WebGL_Renderer is running and Reduced_Motion is inactive, THE WebGL_Renderer SHALL draw a faint fog drift near the bottom of the card.
4. THE WebGL_Renderer SHALL generate ember and fog motion procedurally without image files.

### Requirement 6: Metal gold lighting

**User Story:** As a visitor, I want the frame gold to read as metal, so that the card feels heavy and old rather than flat yellow.

#### Acceptance Criteria

1. THE WebGL_Renderer SHALL compute the Gold_Mask from Frame_Layer colour rather than from Frame_Layer alpha.
2. THE WebGL_Renderer SHALL derive the bevel normal from the luminance of the gold.
3. WHEN the pointer or Tilt changes, THE WebGL_Renderer SHALL move a specular highlight on the gold to follow it.
4. THE WebGL_Renderer SHALL keep dark recesses of the gold dark.
5. THE WebGL_Renderer SHALL keep the plum backing of the frame matte and outside the Gold_Mask.
6. WHILE Reduced_Motion is active and the WebGL_Renderer is used, THE WebGL_Renderer SHALL draw the frame lit and still.

### Requirement 7: Foil, glitter, sweep and edge effects

**User Story:** As a visitor, I want a subtle foil that shows only at an angle, so that the card looks like a rare object without being gaudy.

#### Acceptance Criteria

1. THE WebGL_Renderer SHALL apply a thin-film colour shift to the Gold_Mask only, depending on the view angle, at low strength.
2. WHEN the Tilt changes, THE WebGL_Renderer SHALL make fine hashed sparkles on the Gold_Mask blink.
3. WHEN the Tilt changes, THE WebGL_Renderer SHALL move one soft diagonal Sweep band across the full card.
4. WHEN the Holo_Card first appears and Reduced_Motion is inactive, THE WebGL_Renderer SHALL play the Sweep once across the card.
5. THE WebGL_Renderer SHALL draw a rim light on the Card_Outline and a light vignette.
6. WHILE the Tilt is zero, THE Holo_Card SHALL show a finished still image with the foil not visible.

### Requirement 8: Pointer, touch and idle interaction

**User Story:** As a visitor, I want the card to respond smoothly to my pointer or finger, so that it feels physical.

#### Acceptance Criteria

1. WHEN the pointer moves over the Holo_Card, THE Holo_Card SHALL tilt toward the pointer by at most 12 degrees using spring smoothing.
2. WHEN the pointer leaves the Holo_Card, THE Holo_Card SHALL ease the Tilt back to zero.
3. WHEN a mouse or touch drag beyond the Drag_Threshold occurs on the Holo_Card and Reduced_Motion is inactive, THE Holo_Card SHALL rotate around its vertical axis to follow the horizontal drag with no limit on the Spin_Angle, and around its horizontal axis by at most 20 degrees.
4. WHEN a tap or click with pointer travel of at most the Drag_Threshold occurs on the Front_Face, THE Holo_Card SHALL flip.
5. WHILE no pointer or touch is active and Reduced_Motion is inactive, THE Holo_Card SHALL apply a very slow Sway.
6. THE Holo_Card SHALL read no device motion or device orientation sensor.
7. WHILE a touch drag is in progress, THE Holo_Card SHALL prevent page scrolling only for the drag on the card.
8. WHEN a drag is released and Reduced_Motion is inactive, THE Holo_Card SHALL keep changing the Spin_Angle at the release velocity, reduce that velocity through friction, and then settle the Spin_Angle on the nearest multiple of 180 degrees.
9. WHILE the Spin_Angle is more than 90 degrees from the Settled_Face during a spin, THE Holo_Card SHALL show the opposite face.
10. IF the pointer travel of a press exceeded the Drag_Threshold, THEN THE Holo_Card SHALL suppress the click that follows the release.
11. WHEN a touch drag begins on the Holo_Card, THE Holo_Card SHALL capture the touch pointer for the duration of the drag.
12. WHEN a press lands on the Holo_Card while the Spin_Angle is still changing, THE Holo_Card SHALL stop the change at the press and, on release, settle on the nearest face without flipping.
13. WHILE a drag is in progress or the Spin_Angle is changing, THE Holo_Card SHALL keep the 12-degree hover Tilt out of the vertical-axis rotation, so that only the Spin_Angle rotates the card around that axis.

### Requirement 9: Flip, focus and accessibility

**User Story:** As a keyboard or screen reader user, I want to flip the card and reach the game link, so that I can play without a pointer.

#### Acceptance Criteria

1. THE Front_Face SHALL be a button with the accessible name "True: play the game".
2. WHEN the button is clicked, tapped, or receives Enter or Space, THE Holo_Card SHALL turn to the Back_Face with a 3D turn by changing the Spin_Angle by 180 degrees.
3. WHEN the Settled_Face changes to the Back_Face, THE Holo_Card SHALL move focus to the "Play the game" link.
4. THE Back_Face SHALL show the title "True", the line "The answers live only in the atlas. Find them before dawn." and the link "Play the game" targeting `/game/`, as HTML text over the Back_Layer.
5. WHEN Escape is pressed or the "Turn back" button is activated while the Back_Face is the Settled_Face, THE Holo_Card SHALL turn to the Front_Face and return focus to the front button once the Settled_Face is the Front_Face.
6. WHILE the Back_Face is the Settled_Face, THE Holo_Card SHALL hide the Front_Face from assistive technology and the tab order.
7. WHILE the Front_Face is the Settled_Face, THE Holo_Card SHALL hide the Back_Face from assistive technology and the tab order.
8. THE Holo_Card SHALL give the front button, the link and the "Turn back" button an interactive target of at least 44 by 44 CSS pixels and a visible focus indicator.
9. WHILE Reduced_Motion is active, THE Holo_Card SHALL replace the 3D flip with a crossfade.
10. THE Holo_Card SHALL keep Back_Layer text at a contrast ratio of at least 4.5 to 1 against its background.
11. WHEN the Left Arrow or Right Arrow key is pressed while focus is inside the Holo_Card and Reduced_Motion is inactive, THE Holo_Card SHALL change the Spin_Angle by a step of 60 degrees in the direction that moves the near surface of the card toward the visual left or visual right respectively, regardless of the document text direction.
12. WHEN no arrow key has been pressed for 700 ms after an arrow step, THE Holo_Card SHALL settle the Spin_Angle on the nearest multiple of 180 degrees.
13. WHILE the Spin_Angle is changing, THE Holo_Card SHALL leave the inert state, focus and Settled_Face unchanged until the Spin_Angle has settled.
14. WHILE Reduced_Motion is active, THE Holo_Card SHALL ignore the Left Arrow and Right Arrow keys.

### Requirement 10: Reduced motion

**User Story:** As a visitor sensitive to motion, I want no animated motion on the card, so that the page is comfortable to use.

#### Acceptance Criteria

1. WHILE Reduced_Motion is active, THE Holo_Card SHALL disable Tilt, drag rotation, Inertia, arrow-key rotation, embers, Sway and Sweep, and a tap or click SHALL flip the card with a crossfade.
2. WHEN the in-app reduced-motion toggle changes, THE Holo_Card SHALL apply the new setting without a page reload.
3. WHEN the system `prefers-reduced-motion` setting changes, THE Holo_Card SHALL apply the new setting without a page reload.

### Requirement 11: WebGL loading and rendering policy

**User Story:** As a visitor on a modest phone, I want WebGL to cost little, so that the page stays fast and battery use stays low.

#### Acceptance Criteria

1. WHEN first paint has completed and WebGL is available, THE Holo_Card SHALL load the WebGL_Renderer lazily as a separate chunk.
2. THE WebGL_Renderer SHALL use WebGL directly with one renderer and one fragment shader and SHALL NOT depend on three.js or another 3D library.
3. WHEN the WebGL_Renderer is ready, THE WebGL_Renderer SHALL draw the layers into one canvas over the same box as the HTML_Renderer and clipped to the Card_Outline.
4. THE WebGL_Renderer SHALL cap the device pixel ratio at 1.5 on desktop and 1 on phones.
5. WHILE the Holo_Card is off screen, THE WebGL_Renderer SHALL render no frames.
6. WHILE the document is hidden, THE WebGL_Renderer SHALL render no frames.
7. WHILE the Holo_Card is on screen and the card is still, THE WebGL_Renderer SHALL render no frames when no Tilt, spin, Inertia, flip, Sway, ember or Sweep animation is running.
8. THE Holo_Card SHALL issue requests only to the site's own host and the Image_CDN host.
9. WHILE the Back_Face is the Settled_Face and the Spin_Angle is not changing, THE WebGL_Renderer SHALL render no frames.

### Requirement 12: Budgets

**User Story:** As a visitor on a mobile connection, I want the card to stay light, so that it loads quickly.

#### Acceptance Criteria

1. THE lazy WebGL chunk SHALL be at most 25 KB gzipped.
2. WHERE the viewport width is 390 CSS pixels, THE Holo_Card SHALL load card images totalling at most 350 KB.
3. WHERE the viewport width is 1280 CSS pixels, THE Holo_Card SHALL load card images totalling at most 600 KB.
4. WHILE the CPU is throttled 4 times, THE WebGL_Renderer SHALL achieve a median frame time of at most 22 ms during pointer movement.

### Requirement 13: Hidden card page

**User Story:** As the project owner, I want a hidden page to judge the card, so that I can decide whether to continue to Phase 2.

#### Acceptance Criteria

1. THE atlas app SHALL serve the Card_Page at `/lab/card`.
2. THE Card_Page SHALL carry a noindex robots directive.
3. THE atlas app SHALL contain no link, sitemap entry or navigation entry pointing to the Card_Page.
4. THE Card_Page SHALL centre the Holo_Card on the atlas hub background colour.
5. THE Card_Page SHALL size the Holo_Card so that it fits the first screen at 390×844 and at 1280×800.
6. THE Card_Page SHALL produce no horizontal scroll at 390×844 and at 1280×800.

### Requirement 14: Strings

**User Story:** As the project owner, I want all card text in the i18n file, so that I can review and change the wording.

#### Acceptance Criteria

1. THE atlas i18n file SHALL contain every Card_Strings entry.
2. THE Holo_Card SHALL receive Card_Strings through props and contain no hard-coded user-visible text.

### Requirement 15: Scope and safety boundaries

**User Story:** As the project owner, I want this phase to stay inside its boundary, so that game and content work is not disturbed.

#### Acceptance Criteria

1. THE Phase 1 work SHALL leave game logic, the puzzle generator, the play engine, `content/`, `assets/` and the database unmodified.
2. THE Phase 1 work SHALL add no second card, entry page or `/legends` route.
3. THE Phase 1 work SHALL add no secrets, tokens or connection strings to code, docs or configuration.
4. IF a change would touch game logic, the puzzle generator, the play engine, `content/`, `assets/` or the database, THEN THE implementer SHALL stop and report instead of making the change.
5. IF an implementation step is blocked, THEN THE implementer SHALL stop and report the blocker.

### Requirement 16: Verification and handover

**User Story:** As the project owner, I want measured evidence, so that I can decide whether the card meets the quality bar.

#### Acceptance Criteria

1. THE task list SHALL end with a single task named "Verify" and contain no test-writing task.
2. WHEN the Verify_Run executes, THE Verify_Run SHALL run `pnpm -r typecheck` and `pnpm -r test` once.
3. WHEN the Verify_Run executes, THE Verify_Run SHALL capture screenshots at 390×844 and 1280×800 of the still card, the card tilted to each corner, the card mid-spin with the Back_Face visible, the Back_Face, Reduced_Motion, and WebGL turned off, using a throwaway Playwright script in `.debug/shell-1/`.
4. WHEN the Verify_Run executes, THE Verify_Run SHALL record a video at each size of about 5 seconds of pointer movement, a drag spin with its release, inertia and settle, followed by a flip and a flip back.
5. WHEN the Verify_Run executes, THE Verify_Run SHALL sample `requestAnimationFrame` for 5 seconds during pointer movement, once unthrottled and once with 4 times CPU throttling, and report the median and slowest 5 percent frame times.
6. WHEN the Verify_Run executes, THE Verify_Run SHALL list every network request of the Card_Page with its size.
7. WHEN the Verify_Run executes, THE Verify_Run SHALL confirm by keyboard that Tab reaches the card, Enter flips it, focus lands on the "Play the game" link, Escape flips back, and the Left Arrow and Right Arrow keys rotate the card in steps and settle it.
8. WHEN the Verify_Run completes, THE implementer SHALL write `docs/shell-1-handover.md` listing what was built, files touched, fps, payload, chunk size and request numbers, screenshots and videos taken, new strings for owner review, and anything not done or weak.
9. WHEN the Verify_Run completes, THE implementer SHALL add a short entry to `docs/kiro-usage.md`.
10. THE implementer SHALL NOT commit or push changes.
11. THE product code SHALL contain no test-only code.
12. WHEN the Verify_Run executes, THE Verify_Run SHALL repeat the drag spin, the release and the Left Arrow and Right Arrow keys with `dir="rtl"` on `<html>` at both sizes, and confirm that the drag follows the physical pointer direction, that each arrow key rotates the card toward its visual direction, and that the Front_Face and Back_Face are not mirrored.

### Requirement 17: Back face keeps the gold border clear

**User Story:** As a visitor, I want to see the whole gold border and its corner ornaments on the back of the card, so that the back looks as finished as the front.

#### Acceptance Criteria

1. THE Back_Face SHALL place the title, the line, the link and the "Turn back" button inside the inner edge of the gold border, centred horizontally in the lower half of the Back_Layer image.
2. THE Back_Face SHALL show no band, panel or opaque background that crosses or covers the gold border or any of the four corner ornaments.
3. WHERE the Back_Face text needs more contrast than the Back_Layer image gives, THE Back_Face SHALL draw a soft dark glow behind the text only, inside the inner edge of the gold border.
4. THE Back_Face SHALL keep Back_Layer text at a contrast ratio of at least 4.5 to 1 against its background (requirement 9.10 still applies).
5. THE Back_Face SHALL keep the link and the "Turn back" button at an interactive target of at least 44 by 44 CSS pixels at 390×844 and at 1280×800.

### Requirement 18: The cartouche word reads as TRUE

**User Story:** As a visitor, I want the word on the front of the card to read as "TRUE" at a glance, so that I know which card I am looking at.

#### Acceptance Criteria

1. THE Holo_Card SHALL display the cartouche word with a type face and style whose capital T has no swash and is not mistaken for the letter I at the card size at 390 px viewport width.
2. THE Holo_Card SHALL display the cartouche word in the body serif face in small capitals with wider letter spacing, as engraved dark text with a light lower edge.
3. THE Holo_Card SHALL centre the cartouche word horizontally and vertically in the cartouche.
4. THE Holo_Card SHALL keep the cartouche word inside the cartouche box at about x 410 to 590 and y 1215 to 1300 of the frame.

### Requirement 19: The card is never shown empty

**User Story:** As a visitor, I want the card to show its art as soon as the images have loaded, so that I never see a dark empty rectangle.

#### Acceptance Criteria

1. WHEN the image of an HTML layer has decoded, THE HTML_Renderer SHALL make that layer visible.
2. WHILE the WebGL_Renderer has not drawn a first complete frame with the Background_Layer, Subject_Layer and Frame_Layer textures all uploaded, THE Holo_Card SHALL keep the canvas hidden and the HTML layers visible.
3. WHEN the WebGL_Renderer has drawn its first complete frame and the browser has presented that frame, THE Holo_Card SHALL show the canvas and then hide the HTML layers without a visible flash.
4. IF the document is hidden when the WebGL_Renderer is ready, THEN THE Holo_Card SHALL keep the HTML layers visible until the document is visible and the first complete frame has been presented.
5. WHERE the network is throttled to Slow 4G, THE Holo_Card SHALL show no empty dark card after the layer images have loaded.

### Requirement 20: Clear gap under the card

**User Story:** As a visitor on a small laptop or tablet, I want some space under the card, so that the card does not touch the bottom of the screen.

#### Acceptance Criteria

1. THE Card_Page SHALL leave a clear gap of at least 24 CSS pixels between the bottom edge of the Holo_Card and the bottom edge of the first screen at 1024×768, at 1280×800 and at 390×844.
2. WHERE the available height is smaller than the height of the Holo_Card at its widest size, THE Card_Page SHALL shrink the Holo_Card by height, keeping its aspect ratio.
3. THE Card_Page SHALL produce no horizontal scroll at 1024×768, at 1280×800 and at 390×844.

### Requirement 21: Verification of the fixes

**User Story:** As the project owner, I want the fixes checked once with new screenshots, so that I can see they work without a second full verification.

#### Acceptance Criteria

1. THE task list SHALL end with a single closing task named "Verify fixes" after the fix tasks and SHALL contain no test-writing task (this closing task follows the "Verify" task of requirement 16.1 and does not replace it).
2. WHEN the "Verify fixes" task executes, THE implementer SHALL run `pnpm -r typecheck` and `pnpm -r test` once.
3. WHEN the "Verify fixes" task executes, THE implementer SHALL capture new screenshots in `.debug/shell-1/` only for the changed screens: the Back_Face at 390×844 and 1280×800, the zoomed cartouche at 390×844 and 1280×800, the Card_Page at 1024×768, 1280×800 and 390×844, and the loading sequence under Slow 4G.
4. WHEN the "Verify fixes" task completes, THE implementer SHALL add a short "Fixes" section to `docs/shell-1-handover.md`.
5. THE implementer SHALL NOT commit or push changes made for requirements 17 to 21.
