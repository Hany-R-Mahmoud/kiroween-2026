# Implementation Plan: shell-1-holo-card

## Overview

Language: TypeScript (strict), React, plain CSS with logical properties, GLSL ES 3.00 for the WebGL2 shader. The plan builds the card bottom-up: the asset resolver branch, the shared geometry and motion code, the CSS and the HTML renderer (the complete fallback), then the lazy WebGL renderer, then the hidden atlas page. Task 8 then adds free drag rotation (spin, inertia, settle, arrow keys), which replaces the discrete drag-to-tilt and tap-to-flip behaviour built in tasks 2.3, 3.1 and 4.1. The last task, Verify, is the only place where typecheck, tests and the visual and performance checks run. No test files are written and no suite is run before Verify.

Boundaries: do not touch game logic, the puzzle generator, the play engine, `content/`, `assets/` or the database. If a step needs that, stop and report. Do not commit or push.

## Tasks

- [x] 1. Serve shell layers through the asset resolver
  - [x] 1.1 Add the `shell-` branch to `assetUrl`
    - In `skeleton/src/assets/assetUrl.ts`, return `/media/shell/<id>.webp` for ids starting with `shell-`, placed before the `<legend>-<surface>-` regex
    - Update the doc comment of the function
    - Leave `apps/atlas/vite.media.ts` unchanged
    - _Requirements: 1.1, 1.4, 1.5_

- [x] 2. Shared card geometry and motion code
  - [x] 2.1 Create `skeleton/src/shell/holo/geometry.ts`
    - Export `ART`, `BG_ART`, `OUTLINE`, `HOLO_STEPS`, `HOLO_SIZES`, `TILT_MAX_DEG`, `PARALLAX` and the cartouche box constants with the values from the design
    - _Requirements: 1.2, 3.2, 3.4, 4.1, 4.2, 4.4_

  - [x] 2.2 Create `skeleton/src/shell/holo/useReducedMotion.ts`
    - `useSyncExternalStore` over `matchMedia('(prefers-reduced-motion: reduce)')` and a `MutationObserver` on `data-motion` of `<html>`
    - Server snapshot is `false`; changes apply without reload
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 2.3 Create `skeleton/src/shell/holo/motion.ts`
    - Pure `step(state, target, dt)` spring (stiffness 170, damping 24, `dt` clamped to 1/30 s)
    - Pointer and touch handling: clamp to [-1, 1], pointer capture for touch, 10 px drag threshold that swallows the click after a drag, no `deviceorientation` or `devicemotion`
    - Sway from the rAF timestamp, zero when reduced
    - One shared rAF loop with the render policy: stops when the card is off screen (IntersectionObserver), the document is hidden, or the back face is shown; skips every second frame after 1 s of pointer idle; renders nothing when the card is still and reduced
    - Registration API for a renderer `draw(state, time)` callback; writes `--tx` and `--ty` on `.holo-tilt` each frame
    - No `Math.random`, `Date.now`, `new Date(` or `crypto.random`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 10.1, 11.5, 11.6, 11.7_

- [x] 3. Styles and package export
  - [x] 3.1 Create `skeleton/src/shell/holoCard.css`
    - Scene (container query, perspective, aspect ratio 956/1319), `--u`, tilt transform, layer parallax transforms, clip to the outline radius, inner shadow via `drop-shadow` on the frame, engraved title, front button and back face, back plate, 3D flip, inert-friendly face stacking
    - Reduced-motion crossfade under `@media (prefers-reduced-motion: reduce)` and `html[data-motion='reduce']`, with a plain 200 ms opacity transition
    - `data-renderer="webgl"` hides the HTML art layers with `visibility: hidden`
    - Logical properties and design tokens only; comment where physical x is intentional
    - _Requirements: 2.5, 3.1, 3.2, 3.3, 3.4, 3.7, 4.1, 4.2, 4.3, 4.4, 9.2, 9.8, 9.9, 9.10_

  - [x] 3.2 Add the CSS export to `skeleton/package.json`
    - Add `"./shell/holo-card.css": "./src/shell/holoCard.css"` to `exports`
    - _Requirements: 2.1, 2.5_

- [x] 4. HoloCard component with the HTML renderer
  - [x] 4.1 Create `skeleton/src/shell/HoloCard.tsx`
    - Props `layers`, `strings`, `href`, `className`, with the `HoloCardStrings`, `HoloCardLayers` and `HoloCardProps` types from the design
    - Server-rendered DOM: scene, tilt, shadow, flip, front button (`aria-label` from `strings.name`), back face with image, title, line, link and "Turn back" button
    - Layer `<img>` attributes from `responsiveImage` when a CDN base exists (via `useImageBase()`), else `assetUrl`; `crossOrigin="anonymous"` when a base exists, `alt=""`, `decoding="async"`, explicit size, `draggable={false}`
    - Back image gets its `src` only after the card is armed (hover, focus or pointer down)
    - Flip state, `inert` on the hidden face, focus moved after `transitionend` with a 900 ms fallback timer, Escape and "Turn back" return focus to the front button
    - Connect `motion.ts` and `useReducedMotion`
    - Import only from the assets modules, `holo/` modules and React; no game, play, generator, model or db imports; no hard-coded visible text
    - _Requirements: 1.2, 1.3, 2.2, 2.3, 3.1, 3.5, 8.4, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 14.2_

  - [x] 4.2 Export `HoloCard` from `skeleton/src/shell/index.ts`
    - Export the component and its prop types so `@kiroween/skeleton/shell` provides them
    - _Requirements: 2.1, 2.4_

- [x] 5. WebGL renderer chunk
  - [x] 5.1 Create `skeleton/src/shell/holo/shader.ts`
    - Vertex and fragment source as string constants, WebGL2 only, one pass
    - Background parallax, fog, 48 procedural embers in 8 lanes, subject, frame, gold mask from colour (thresholds `L0`, `L1`, `W0`, `W1` tuned against the frame), luminance bevel normal with Blinn-Phong specular, thin-film foil and hashed sparkles on the gold mask, sweep, rim light, vignette, inner shadow from frame alpha
    - Ember and glow colours read from uniforms, no hex literals for them in TypeScript
    - _Requirements: 4.5, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 5.2 Create `skeleton/src/shell/holo/renderer.ts`
    - Lazy chunk entry: `getContext('webgl2', ...)` with failure paths that leave the HTML renderer untouched
    - Compile and link, upload the existing `<img>` elements as premultiplied mipmapped textures (no `fetch`, no `createImageBitmap(url)`)
    - Canvas inside the front face, sized by `ResizeObserver` with DPR cap 1 on coarse pointers and 1.5 otherwise
    - Read `--color-accent` and `--color-glow` for the ember uniforms, per-frame uniforms from the motion state, one-time sweep, single still lit frame when reduced
    - Register the `draw` callback with `motion.ts`; set `data-renderer="webgl"` after the first frame
    - `webglcontextlost`: `preventDefault`, destroy, remove the canvas, clear `data-renderer`; full cleanup of GL resources, observers and listeners on destroy
    - No three.js or other 3D library
    - _Requirements: 3.5, 3.6, 3.7, 6.6, 7.4, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

- [x] 6. Lazy WebGL upgrade wiring
  - [x] 6.1 Load the renderer from `HoloCard`
    - After hydration and once the three front images are decoded, schedule `import('./holo/renderer.ts')` with `requestIdleCallback` (fallback `setTimeout`)
    - Pass the layer image elements, scene and motion controller to the renderer; tear down on unmount, context loss or when the renderer reports failure
    - Pause drawing when the back face is shown and draw one frame when the front returns
    - _Requirements: 3.5, 3.6, 11.1, 11.3, 11.5, 11.6, 11.7_

- [x] 7. Hidden atlas page
  - [x] 7.1 Add the card strings to `apps/atlas/src/i18n/en.ts`
    - Keys `shell.card.true.title`, `shell.card.true.line`, `shell.card.true.link`, `shell.card.true.name`, `shell.card.turnBack` with the English text from the design; leave `ar.ts` unchanged
    - _Requirements: 14.1, 9.1, 9.4_

  - [x] 7.2 Create `apps/atlas/src/routes/lab.card.tsx`
    - `createFileRoute('/lab/card')` with `head()` returning `<meta name="robots" content="noindex, nofollow">`
    - Render `HoloCard` with the four shell layer ids, strings from `useT()`, and `href="/game/"`
    - Add no link, navigation entry, sitemap entry or `robots.txt` line; do not hand-edit `routeTree.gen.ts`
    - _Requirements: 13.1, 13.2, 13.3, 14.2_

  - [x] 7.3 Update `apps/atlas/src/styles.css`
    - Import `@kiroween/skeleton/shell/holo-card.css` after `ui.css`, keeping the `@layer` line first and `ui.css` imported once
    - Add `.lab-card-page` rules (logical properties only) that centre the card on the hub background, fit the first screen at 390×844 and 1280×800, and cause no horizontal scroll
    - _Requirements: 13.4, 13.5, 13.6, 2.5_

- [x] 8. Free drag rotation, inertia and keyboard spin
  - In `skeleton/src/shell/holo/geometry.ts`, add `DRAG_TILT_MAX_DEG`, `DRAG_THRESHOLD_PX`, `SPIN_FRICTION`, `SPIN_MAX_VELOCITY`, `SPIN_SETTLE_BELOW`, `SPIN_SETTLE_SPRING`, `ARROW_STEP_DEG` and `ARROW_IDLE_MS` with the design values
  - In `skeleton/src/shell/holo/motion.ts`:
    - Add the spin state `{ angle, velocity, mode, target }` (no angle limit) and the `faceOf(angle)` helper
    - Drag handling for mouse, pen and touch: start after the 10 px threshold without a jump, angle from horizontal pointer travel (`180 / stageWidthPx` degrees per px), physical pointer direction in LTR and RTL, drag tilt on the horizontal axis up to 20°, pointer capture, release velocity from smoothed recent samples
    - Inertia with exponential friction and the velocity cap, then a settle spring to the nearest multiple of 180°; a press during motion grabs the card, stops it, settles on the nearest face and swallows its click
    - `turnTo(index)` for tap, Enter, Space, Escape and "Turn back", using the same settle spring; keep the 10 px click swallow
    - `ArrowLeft` and `ArrowRight` steps of 60° in the visual direction (no `dir` lookup), settle 700 ms after the last step, ignored under reduced motion
    - Reduced motion: no drag rotation, no inertia, no arrow steps; a tap changes the settled face at once for the crossfade; snap to the nearest face if reduced motion turns on mid-spin
    - On `visibilitychange` to hidden, jump to the settle target; `onSettle(face)` callback fired only when the mode returns to `rest`
    - Write `--spin` on `.holo-flip` each frame and `data-spinning` on the scene; include the spin mode in the "animating" test of the shared rAF loop and pass the angle to the renderer `draw` callback
    - Keep the file free of `Math.random`, `Date.now`, `new Date(` and `crypto.random`; no device motion sensors
  - In `skeleton/src/shell/HoloCard.tsx`:
    - Derive `face` from `onSettle` only, and drive `inert` on the non-settled face from it; no inert or focus changes while the card spins
    - Move focus to the "Play the game" link when the settled face becomes the back and to the front button when it becomes the front (drag release, tap, Enter, Space, arrows, Escape, "Turn back"); keep the `transitionend` plus 900 ms fallback for the reduced-motion crossfade only
    - Wire the front button click, Escape, "Turn back" and the scene `keydown` for arrow keys to `motion.ts`; arm the back image on the first press
    - Pause the WebGL draw only when the settled face is the back and the spin is at rest; resume when a spin starts
  - In `skeleton/src/shell/holo/shader.ts` and `renderer.ts`, add the `uSpin` uniform (foil view-angle term and sweep position) fed from the draw callback
  - In `skeleton/src/shell/holoCard.css`:
    - Replace the discrete `[data-face='back']` rotation and its transition with `.holo-flip { transform: rotateY(var(--spin, 0deg)) }` and no transition when motion is not reduced
    - Keep both faces `backface-visibility: hidden` with the back face pre-rotated 180°, so the back appears as the angle passes 90°
    - Reduced motion (`@media (prefers-reduced-motion: reduce)` and `html[data-motion='reduce']`): `.holo-flip { transform: none }`, stacked faces and a 200 ms opacity crossfade selected by `data-face`
    - `cursor: grab` and `cursor: grabbing` (via `data-spinning`), `user-select: none`, `touch-action: none` on both faces; logical properties only
  - _Requirements: 8.3, 8.4, 8.8, 8.9, 8.10, 8.11, 8.12, 8.13, 9.2, 9.3, 9.5, 9.6, 9.7, 9.9, 9.11, 9.12, 9.13, 9.14, 10.1, 11.7, 11.9_

- [x] 9. Verify
  - Run `pnpm -r typecheck` and `pnpm -r test` once, and fix any failure the change caused. This is the first time either runs.
  - Build the atlas and serve it with `apps/atlas/scripts/serve-build.mjs` (environment set in the shell, no secrets written to files). Write a throwaway Playwright script in `.debug/shell-1/` that runs against `/lab/card` and produces, at 390×844 and 1280×800:
    - screenshots: still, tilted to each of the four corners, a mid-spin frame with the back visible, back face, reduced motion (system emulation and `data-motion='reduce'`), WebGL off, plus one pair with `dir="rtl"`
    - one video per size of about 5 seconds of pointer movement, then a drag spin with its release (inertia and settle on a face), then a flip and a flip back (touch-pointer drag at 390×844)
    - an RTL run (`dir="rtl"` on `<html>`) at both sizes with a drag to the right and to the left (the card follows the physical pointer direction), `ArrowRight` and `ArrowLeft` (each rotates toward its visual direction), and both faces unmirrored
    - `requestAnimationFrame` sampling for 5 seconds of pointer movement, unthrottled and with 4× CPU throttle, reporting median and slowest 5 percent frame times against the 22 ms target
    - the network request list with sizes (at load and after the first flip, device pixel ratio 1)
    - the keyboard flow: Tab reaches the card, Enter flips, focus lands on the "Play the game" link, Escape flips back and focus returns to the front button; `ArrowRight` and `ArrowLeft` step and settle (one press returns to the same face, two presses land on the other face and move focus to the link); a drag that settles on the back sets `inert` on the front face and moves focus to the link
  - Gzip the emitted lazy chunk from `apps/atlas/dist/client/assets` and report its size against the 25 KB budget
  - Look at the screenshots and tune the constants the design leaves open (gold thresholds, shininess, `--holo-radius`, title size), then re-run the affected captures
  - Write `docs/shell-1-handover.md`: what was built, files touched, fps, payload, chunk size and request numbers, screenshots and videos taken, new strings for owner review, and anything not done or weak (including the CDN payload and CORS points K1 and K2, and the D1 export-path reading of requirement 2.4)
  - Add a short entry to `docs/kiro-usage.md`
  - Do not commit or push
  - _Requirements: 11.8, 12.1, 12.2, 12.3, 12.4, 15.1, 15.2, 15.3, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10, 16.11, 16.12_

- [x] 10. Back face: keep the gold border clear
  - In `skeleton/src/shell/holoCard.css` (and `HoloCard.tsx` only if the markup changes), remove the full-width dark text panel from the back face
  - Place the title, the line, the link and the "Turn back" button in one centred block inside the inner edge of the gold border, in the empty lower half of the back image
  - No band, panel or opaque background may cross or cover the gold border or the corner ornaments; if more contrast is needed, use a soft dark glow behind the text only, inside the border
  - Keep 44px targets on the link and "Turn back"; logical properties and design tokens only
  - Done when at 390×844 and 1280×800 the whole gold border and all four corner ornaments are visible on the back face
  - Do not run anything in this task; checks happen in task 14
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 9.10_

- [x] 11. Cartouche word reads as TRUE
  - In `skeleton/src/shell/holoCard.css`, change `.holo-title` from the swash display face to the body serif in small caps with wider letter spacing, keeping the engraved colour and light lower edge
  - Centre the word in the cartouche and keep it inside the cartouche box
  - Done when a zoomed screenshot of the cartouche at 390×844 and 1280×800 reads clearly as "TRUE"
  - Do not run anything in this task; checks happen in task 14
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 3.4_

- [x] 12. Never show an empty card
  - In `skeleton/src/shell/holo/renderer.ts` and `HoloCard.tsx`, keep the canvas hidden and the HTML layers shown until the renderer has drawn its first complete frame with all three front textures uploaded and that frame has been presented
  - If the document is hidden when the renderer is ready, wait for `visibilitychange` before the swap
  - Show the canvas first, then hide the HTML art on the next frame, so the swap does not flash
  - Mark each layer `<img>` ready when it decodes (or at hydration if already complete) and show it from that moment; edit `holoCard.css` for the ready state with no fade under reduced motion
  - Keep the failure and context-loss paths that return to the HTML layers
  - Done when, with network throttled to Slow 4G, the card never shows as an empty dark box once images have loaded, and the swap does not flash
  - Do not run anything in this task; checks happen in task 14
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 3.5, 3.6_

- [x] 13. Fit at 1024×768
  - In `apps/atlas/src/styles.css`, in `@layer ui`, update `.lab-card-page` so a clear gap of at least 24px stays under the card at 1024×768, 1280×800 and 390×844, shrinking the card by height when needed
  - Logical properties only; no horizontal scroll
  - Do not run anything in this task; checks happen in task 14
  - _Requirements: 20.1, 20.2, 20.3, 13.5, 13.6_

- [x] 14. Verify fixes
  - Run `pnpm -r typecheck` and `pnpm -r test` once, and fix any failure the changes of tasks 10 to 13 caused. Write no tests
  - Using the throwaway setup in `.debug/shell-1/`, capture new screenshots only for the changed screens: the back face at 390×844 and 1280×800, the zoomed cartouche at 390×844 and 1280×800, the card page at 1024×768, 1280×800 and 390×844 showing the gap under the card, and the loading sequence under Slow 4G
  - Look at the screenshots and confirm each "Done when" of tasks 10 to 13; tune and re-capture only the affected screens
  - Add a short "Fixes" section to `docs/shell-1-handover.md` listing the four fixes, the files touched and the new screenshots
  - Do not commit or push
  - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5_

## Notes

- There are no test-writing tasks and no optional tasks. The design has no Correctness Properties section, so no property tests apply.
- No test suite or typecheck is run before task 9.
- Task 8 supersedes the discrete flip transition and the drag-to-tilt behaviour from tasks 2.3, 3.1 and 4.1; the hover tilt (12°) stays.
- Tasks 10 to 13 are fixes found after task 9. They run in sequence because they share files (`holoCard.css`, `HoloCard.tsx`), and nothing runs until task 14. Task 14 is the closing task and follows task 9, which stays completed.
- Tasks 5.2 and 6.1 are the only ones that connect the WebGL chunk; until 6.1 is done the card is the HTML renderer alone.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "2.2", "3.2", "7.1"] },
    { "id": 1, "tasks": ["2.3", "3.1", "5.1"] },
    { "id": 2, "tasks": ["4.1", "5.2"] },
    { "id": 3, "tasks": ["4.2", "6.1"] },
    { "id": 4, "tasks": ["7.2", "7.3"] },
    { "id": 5, "tasks": ["8"] },
    { "id": 6, "tasks": ["9"] },
    { "id": 7, "tasks": ["10"] },
    { "id": 8, "tasks": ["11"] },
    { "id": 9, "tasks": ["12"] },
    { "id": 10, "tasks": ["13"] },
    { "id": 11, "tasks": ["14"] }
  ]
}
```
