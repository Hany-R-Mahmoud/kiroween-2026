# Shell phase 1: the "True" card, handover

Spec: `.kiro/specs/shell-1-holo-card/`. Hidden page: `/lab/card` in the atlas (noindex, no links). Nothing is committed or pushed.

## What was built

- `HoloCard` in `skeleton/src/shell/`, exported from `@kiroween/skeleton/shell`. Server-rendered HTML layers (background, subject, frame, engraved "True") with CSS tilt. This is the full fallback.
- Lazy WebGL2 renderer (one canvas, one fragment shader, no 3D library): parallax, fog, 48 procedural embers, metal gold from the frame colour, foil, sparkles, sweep, rim light, vignette, inner shadow.
- Free drag spin (mouse, pen, touch) with inertia and settle on a face, tap/Enter/Space flip, Escape and "Turn back", ArrowLeft/ArrowRight 60 degree steps, reduced-motion crossfade.
- `assetUrl` accepts `shell-*` ids (`/media/shell/<id>.webp`); `vite.media.ts` unchanged.

## Files touched

New: `skeleton/src/shell/HoloCard.tsx`, `skeleton/src/shell/holoCard.css`, `skeleton/src/shell/holo/{geometry,motion,useReducedMotion,renderer,shader}.ts`, `apps/atlas/src/routes/lab.card.tsx`.
Changed: `skeleton/src/assets/assetUrl.ts`, `skeleton/src/shell/index.ts`, `skeleton/package.json` (CSS export), `apps/atlas/src/i18n/en.ts`, `apps/atlas/src/styles.css`, `apps/atlas/src/routeTree.gen.ts` (generated).
Verify fix: `.lab-card-page` rules moved from `@layer components` to `@layer ui` in `apps/atlas/src/styles.css`. `holoCard.css` is in `ui` and set `inline-size: 100%` on the scene, so the page's size cap lost and the card was 1120 px wide at 1280x800 (not fitting the screen, R13.5). Now 516x712 at 1280x800 and 358x494 at 390x844.
`assets/LOG.md` shows as modified in git. I did not touch it in this task; it predates Verify. Nothing under `content/`, `assets/`, game, generator, play engine or database was changed by me.

## Typecheck and tests (run once, before the CSS fix)

- `pnpm -r typecheck`: clean.
- `pnpm -r test`: skeleton 916 passed + 8 expected fail, atlas 305, game 401. No failure to fix.
- After the CSS layer fix I re-ran only atlas tests (305 passed) and atlas typecheck (clean).

## Frame rate (rAF sampling, 5 s of continuous pointer movement, DPR 1)

Real GPU (Chromium, ANGLE Metal, Apple M3). Frames are vsync-locked at 60 Hz, so this shows no dropped frames, not the shader's headroom.

| Size | Throttle | Median ms | Slowest 5% (mean ms) | p95 ms | Max ms | fps |
|---|---|---|---|---|---|---|
| 390x844 | none | 16.7 | 16.8 | 16.7 | 16.8 | 60.0 |
| 390x844 | 4x CPU | 16.7 | 17.9 | 16.8 | 33.3 | 59.8 |
| 1280x800 | none | 16.7 | 17.9 | 16.8 | 33.4 | 59.8 |
| 1280x800 | 4x CPU | 16.7 | 17.9 | 16.7 | 33.3 | 59.8 |

Target: median at most 22 ms at 4x throttle. Met on this GPU. The CPU throttle does not slow the GPU, so a phone GPU is not measured.

Software GL (SwiftShader, no GPU), earlier run, for the worst case:

| Size | Throttle | Median ms | Slowest 5% (mean ms) | fps |
|---|---|---|---|---|
| 390x844 | none | 33.3 | 66.7 | 27.2 |
| 390x844 | 4x | 33.4 | 66.7 | 26.0 |
| 1280x800 | none | 66.7 | 87.6 | 14.4 |
| 1280x800 | 4x | 83.4 | 200.0 | 10.6 |

Without a GPU the fragment shader is too heavy at 1280 (and misses 22 ms at 390 too). Software-only devices are rare, but a low-end phone GPU is untested. Under such load the spin slows in wall-clock time because `dt` is clamped to 1/30 s. First cuts if needed: the inner-shadow taps and the fog octave (design K4).

## Payload and requests (CDN off, local build, DPR 1)

**CDN off.** Owner will measure the real CDN numbers after deploy. Same at both sizes because there is no resizing locally:

| | Bytes |
|---|---|
| Card images at load (bg 199,056 + subject 426,430 + frame 1,047,750) | 1,673,236 |
| After first flip (back 347,092 added) | 2,020,328 |
| Whole page at load (18 requests, all fonts, CSS, JS) | 2,305,012 |

The 350 KB (390) and 600 KB (1280) budgets are not met without the CDN, as design K1 said. Not a measured pass or fail for the CDN case.

Requests at load: 18, all to `localhost:3001` (own host). Document 6,758; CSS 4 files 47,142 total; JS 5 files incl. lazy renderer 9,937 (`index` 254,842, `useT` 84,008, `imageSet` 125,099, runtime 599, route 540); 3 fonts 100,708; 3 images. After first flip: 1 more request (back image).

**Widths each image would be requested at through the CDN** (`HOLO_STEPS` = 360, 420, 480, 560, 640, 800, 1000, 1200 and `HOLO_SIZES` = `min(110vw, 30.8rem)`). All four layers use the same `sizes`, so the same width:

| Viewport | `sizes` resolves to | DPR 1 | DPR 2 | DPR 3 |
|---|---|---|---|---|
| 390x844 | 429 px | w480 | w1000 | w1200 |
| 1280x800 | 492.8 px | w560 | w1000 | w1200 |

Front layers load at load, the back image only after the card is armed (hover, focus or press).

## Lazy chunk

`apps/atlas/dist/client/assets/renderer-*.js`: 9,937 bytes raw, **4,525 bytes gzip (4.4 KB)** against the 25 KB budget.

## Checks run

Playwright script: `.debug/shell-1/run.mjs` (throwaway), results in `.debug/shell-1/results.json`. WebGL renderer was active in all runs except the WebGL-off captures.

- Keyboard (both sizes): Tab reaches the card (5th tab), Enter flips and focus lands on "Play the game" (`/game/`), Escape returns focus to the front button. One ArrowRight returns to the same face (peak about 52 degrees), two ArrowRight land on the back with focus on the link, two ArrowLeft land on the back at -180. A slow drag past 90 degrees settles on the back, front `inert`, focus on the link.
- Drag sign: drag right gives a positive spin angle and the left edge comes toward the viewer (matrix check and `midspin-*.png`). The near surface follows the pointer, so the sign was correct and not changed. Corner tilt follows the same convention (surface normal turns toward the pointer, far edge goes away).
- RTL (`dir="rtl"` on `<html>`, both sizes): drag right +47.25, drag left -47.25 (physical direction), ArrowRight +49 and ArrowLeft -49 to -53 (visual direction), both settle on the front. Front face is pixel-identical LTR vs RTL (0 differing pixels); the back image is byte-identical LTR vs RTL with the text hidden. Back-face buttons swap order in RTL (link on the right). The back title and line stay left-aligned for English text because the atlas sets `unicode-bidi: plaintext` on `p` and headings on purpose (decision 22); Arabic strings would align right.
- Reduced motion (system emulation and `data-motion='reduce'`): tap flips to the back with a crossfade, focus on the link, no `--spin`.
- WebGL off: stays on the HTML renderer, no console errors; flip works.
- Horizontal scroll: none at 390x844 or 1280x800. Console errors: none.

## Screenshots and videos (`.debug/shell-1/`, git-ignored)

Per size (`-390`, `-1280`): `still`, `tilt-tl/tr/bl/br`, `midspin` (about 110 degrees, back visible), `back`, `reduced-system` (+`-back`), `reduced-attr` (+`-back`), `nowebgl` (+`-back`), `rtl-still`, `rtl-dragleft`, `rtl-arrowleft`, `rtl-back`. Videos: `video-390.webm` (touch drag via CDP) and `video-1280.webm` (mouse): pointer movement or sway, a drag spin with release, inertia and settle (to 360 degrees in both), a flip to the back and Escape back. About 6 to 7 s each, slightly over the "about 5 s" target.

## New strings for owner review (`apps/atlas/src/i18n/en.ts`; `ar.ts` falls back to English)

- `shell.card.true.title`: True
- `shell.card.true.line`: The answers live only in the atlas. Find them before dawn.
- `shell.card.true.link`: Play the game
- `shell.card.true.name`: True: play the game
- `shell.card.turnBack`: Turn back

## Not done or weak

- **K1, payload:** budgets cannot be judged until a deployment with `IMAGE_CDN_URL` set. Local payload is 1.67 MB for the front layers.
- **K2, CORS:** the owner confirmed ImageKit sends `access-control-allow-origin: *`, so `crossOrigin="anonymous"` is right. Not testable locally (CDN off), so the WebGL look through the CDN is unseen.
- **D1:** `HoloCard` is exported from `@kiroween/skeleton/shell`, not the main entry. Requirement 2.4 literally says `@kiroween/skeleton`. Needs the owner's yes.
- **Real phone GPU not measured.** Numbers are from an M3 and from software GL. Software GL fails the 22 ms target.
- The "True" glyph in IM Fell English SC has a large swash on the T; at 390 px it reads close to "I RUE" at a glance. Look at `still-390.png` and decide. Title size and `--holo-radius` were not changed.
- Gold thresholds and shininess were not retuned; the gold reads as metal in the screenshots.
- Touch on the 1280 run was not tested; the touch drag video is at 390 only (as specified). Hit testing during a spin (K7) was not exercised beyond grabbing in the video.
- Test files: none written (spec). No hooks or sub-agents were used in Verify.

## Fixes (tasks 10 to 14)

Four fixes after Verify. Files: `skeleton/src/shell/holoCard.css`, `skeleton/src/shell/HoloCard.tsx`, `skeleton/src/shell/holo/renderer.ts` (tasks 10 to 12), `apps/atlas/src/styles.css` (task 13).

1. **Back face keeps the gold border clear.** The full-width panel is gone. One centred block (title, line, link, "Turn back") sits inside the border with a soft dark glow behind the text only. In task 14 I raised the block (`inset-block-end` 104 to 300 units of `--u`) because at 1024 and 1280 the side-by-side buttons overlapped the lower corner ornaments. I also set `text-shadow: none` on the two buttons, because the glow smudged "Play the game". Checked: the whole border and all four corners are visible at 390x844, 1280x800 and 1024x768.
2. **"True" reads as TRUE.** Body serif, 600, small caps, 0.18em spacing. A zoomed capture (DPR 3) at 390 and 1280 reads clearly. The small caps render as clean caps (no visible synthesis). The word sat about 7 px high in the cartouche at 1280, so I added `padding-block-start: 16 --u` (an 8 unit nudge); it is now centred.
3. **No empty card.** The canvas stays hidden until the first full frame is presented; layers show as each image decodes. Slow 4G at 390x844 (throttled 1.6 Mbps, 562 ms): background decodes about 9.1 s, subject 10.7 s, frame 13.8 s, WebGL swap about 14.4 s. The card shows art at every step after the first image, and the swap has no flash in the captured frames. Before the first image arrives (about 9 s) the card is the plain surface colour, which is the network wait, not a bug. Frame-less state: the word "TRUE" floated over the bare art, so it is now hidden until the frame is ready.
4. **Gap under the card.** Clear space under the card, measured: 48 px at 1024x768 (card 470x648) and at 1280x800 (card 493x680), 163 px at 390x844 (card 358x494). Target was at least 24 px. No horizontal scroll at any size.

**JS off, found and fixed in task 14.** The `data-ready` rule set `opacity: 0` on every layer, so with JavaScript off the art was invisible (measured opacity 0 on all three layers). The hiding is now gated on a `data-js` attribute that `HoloCard` sets on the scene at hydration (`.holo-scene[data-js] .holo-layer:not([data-ready])`). Measured with JS off: opacity 1 on all layers. Before hydration the server HTML shows, with progressive image paint.

Typecheck: `pnpm -r typecheck` clean (run again after the last edits). `pnpm -r test` run once before the final CSS tweaks: skeleton 916 passed + 8 expected fail, atlas 305, game 401. No test failure. No tests written.

New screenshots in `.debug/shell-1/` (git-ignored): `fix-back-{390,1024,1280}.png`, `fix-cartouche-{390,1280}.png` and `fix-cartouche-zoom-{390,1280}.png` (DPR 3), `fix-gap-{390,1024,1280}.png`, `fix-slow4g-*.png` (sequence), `fix-nojs-390.png`; data in `fixes.json`; script `fixes.mjs`. Local server note: my captures ran against a build on port 3011 with the environment sourced in the shell only.

Weak: the Slow 4G run is local images, not the CDN. Under JS on, a layer still loading at hydration is hidden until decoded, so for a few seconds only the already-loaded layers show. Back-face text sits mid-card (about 55 to 65% down); on 390 the keyhole-to-title gap is smaller than at desktop but not touching.
