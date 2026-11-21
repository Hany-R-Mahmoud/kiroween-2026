# Headless Chrome checks and panorama timing (task 11.2)
Script: `apps/game/scripts/browser-check.mjs`. Raw numbers of the last full run: `docs/phase-4-notes/browser-results.json`. Screenshots: `docs/phase-4-notes/screens/`.

## Driver
Chrome/157 headless (`/Applications/Google Chrome.app`). No puppeteer, playwright or `ws` is installed and none can be added, so the script speaks the DevTools protocol itself over Node 24's built-in `WebSocket`. Keys are real `Input.dispatchKeyEvent` events, touch is `Input.dispatchTouchEvent`. Each scenario uses its own browser context (fresh storage, guest only). No database user was created, so there was nothing to delete. No cookie or token is printed.

## Commands (repo root)
1. `pnpm --filter @kiroween/atlas build` and `pnpm --filter @kiroween/game build`
2. Atlas build server (serves `/media`): `cd apps/atlas && bash -c 'set -a; . ../../.env; set +a; unset PUBLIC_ORIGIN; PORT=3201 exec node scripts/serve-build.mjs'`
3. Game build server: `cd apps/game && bash -c 'set -a; . ../../.env; set +a; ATLAS_ORIGIN=http://localhost:3201 PORT=3200 exec node scripts/serve-build.mjs'`
4. Right-to-left server: the same with `FEATURE_ARABIC=true PORT=3202`.
5. `node apps/game/scripts/browser-check.mjs --game http://localhost:3200 --atlas http://localhost:3201 --arabic http://localhost:3202 --json docs/phase-4-notes/browser-results.json`
6. All servers stopped by terminal id afterwards (ports 3200, 3201, 3202 free; `.env` only sourced in the shell, never edited). Ports 3000 to 3003 were left alone. The game ran from the production build, because dev-mode module loading makes the timing meaningless. The atlas server needed a restart loop (see findings).

## Result: 43 of 46 checks pass; the 3 misses are the timing budget (findings)
### 1. Keyboard only (all pass)
- Hall: Tab to the viewport and arrows pan (x 0, -480, -240). Tab to a locked door, focus pans it into view, 3px solid `rgb(244,213,141)` ring (`focus-ring-hall.png`). Enter opens the tutorial.
- Tutorial: Space on the candle opens the panel and takes focus; Escape closes it and focus returns to the hotspot. Hint 1 panel. The drawer question, Hint 2 (one atlas tab opened at the atlas address of the Keeper's Note chapter; chapter text read from the atlas page), the answer typed key by key as digits (4 candidates read from the chapter), reward, "Go to the hall".
- Hall again: the Banshee door reads "Enter The Banshee". Door panel, enter, then the whole world by keyboard: Tab-and-Enter on every hotspot of all three scenes (PageDown between scenes), Hint 2 for every puzzle (5 atlas tabs, text read from the atlas page), options chosen by the overlap reader, then threads. Curse broken on run 1 (no restart; last run 3 wrong answers; earlier runs 0 and 3, so seeds vary). The script allows up to 5 runs for the known Banshee seed losses; none was needed. "Back to the hall" by keyboard.
- Mouse watch (`mousedown`, `mouseup`, `mousemove`, `pointer*`, `touchstart`, `wheel`, `contextmenu`, `dblclick`, and any click with detail above 0): 0 events.
### 2. 390 px touch (all pass, after two fixes below)
- Hall, tutorial, Banshee scene 1: page width 390 = inner width (no horizontal scroll), also with the question panel open. Panorama loaded (hall 4096x1536). Every hotspot (18, 7, 6) is at least 44 x 44 CSS px; no other control is under 44 px.
- Finger drag pans (hall x 0 to -278, Banshee too), drag back restores. A drag that starts on a hotspot does not open it; a tap does. Tutorial candle tap lights it. Three touch taps on Banshee hotspots reach the server.
- `dvh`: the viewport rule is `min(70dvh, 36rem)`; at 844 px it is 576 px as computed. Screens: `hall-390.png`, `tutorial-390.png`, `world-scene-390.png`, `world-question-390.png` (plus `fear-meter-*.png`, `hall-rtl-390.png`, `focus-ring-hall.png`).
### 3. Reduced motion (all pass)
Control (motion allowed): the mirror event runs `fear-flash` (peak flash opacity 0.55) and `fear-caption-full`. With `prefers-reduced-motion: reduce` emulated: overlay `data-motion=reduced`, caption shown, flash opacity 0 throughout 33 samples, the only running fear animation is `fear-fade`.
### 4. Panorama size and Slow 4G timing
Profile: Chrome Slow 4G (1.6 Mbps down = 209,715 B/s, 750 kbps up, 150 ms RTT), 4x CPU throttle, cache off, 390 px phone, 3 runs each. "Scene paint" = two animation frames after the scene image has decoded, measured from navigation start. Budget 3.0 s (design).

| Screen | Scene file (`ls -l`) | Scene paint, 3 runs (ms) | Median | Total transfer | Of which images | JS and CSS (raw / gzipped) | With sprites, spirit, meter blocked |
|---|---|---|---|---|---|---|---|
| Hall | hub-game-scene-01.webp 317,352 | 5823, 5871, 5845 | 5845 | 933,261 B, 20 requests | 317,558 | 495,749 / 158,054 | 5891 |
| Tutorial | tutorial-game-scene-01.webp 308,466 | 5240, 4883, 4861 | 4883 | 957,650 B, 25 | 344,164 | 502,606 / 160,765 | 4925 |
| Banshee scene 1 | banshee-game-scene-01.webp 430,910 | 11597, 10407, 10436 | 10436 | 1,906,353 B, 34 | 1,209,927 | 518,929 / 165,958 | 6838 |

Banshee scenes 02 and 03 (441,756 and 327,016 B) were not requested on first load (requirement 8.9 holds); only Banshee and shared images were requested. All 38 game scene files under `assets/` range from 247,460 (flying-dutchman 01) to 482,648 bytes (jersey-devil 01); the full list is in `browser-results.json`. First contentful paint is 0.7 to 1.7 s (hall 1.7, tutorial 0.7, Banshee 1.7 s).
### 5. Items from the 9.13 list
| Item | Result |
|---|---|
| Focus rings over painted scenes | 3px solid glow ring with offset, visible over the hall door (`focus-ring-hall.png`). |
| Fear meter fill on its frame | The track sits inside the frame at 256x64; fill ratio equals value/100 (10 gives 0.100). Red fill sits in the frame's window (`fear-meter-filled.png`). |
| Spirit panel text over the frame | **Bug, fixed** (below). |
| Hotspot visibility on a phone | Hotspots are all at least 44 px; hall locks and Banshee sprites are visible over the painted objects (`hall-390.png`, `world-scene-390.png`). |
| Mobile `dvh` height | Pass (above). |
| Right-to-left (flag on, `lang=ar` cookie) | `dir=rtl`, `lang=ar`; the scene viewport stays `direction: ltr` at pan 0; no overflow at 390 px; drag still pans; the painted hall is not mirrored. The pan buttons keep physical order (Pan left on the left). The Arabic catalog still shows English sentences, so a trailing full stop lands at the start of the line (`hall-rtl-390.png`); this is the catalog's state, not a layout fault. |

## Bugs found and fixed in the game app (each with a test)
1. **Touch drag stopped after about 23 px.** `onLostPointerCapture={endDrag}` also ran for the browser's own implicit capture release on the pressed child, which fires as soon as the viewport takes capture. Fix: `lostCaptureEndsDrag(target, viewport)` in `lib/viewerInput.ts`, used in `SceneViewer.tsx`. Tests in `test/viewer.test.ts`. After the fix the drag pans 278 px. Mouse and keyboard were never affected.
2. **Spirit panel unreadable and cramped at 390 px.** The `@media (max-inline-size: 30rem)` rule never matches (not a media feature), so the close figure stayed and the text column was 118 px wide; the light ink also sat on the light parchment frame. Fix in `fear.css`: `@media (max-width: 30rem)`, and a theme-surface scrim behind the text. Tests in `test/fear-ui.test.ts`.
3. **The spirit corner figure hid the "Pan right" label** at 390 px. Fix in `fear.css`: `inset-block-end: 3.5rem`. Test in `test/fear-ui.test.ts`.
Game: typecheck clean, 256 of 256 tests pass (20 files).

## Findings (not fixed)
1. **First view misses the 3.0 s budget on all three screens** (hall 5.8 s, tutorial 4.9 s, Banshee 10.4 s on Slow 4G). No image under `assets/` was changed. Causes, measured:
   - The scene file alone is 1.5 s of transfer. About 500 KB of JS and CSS also loads before the scene, and the local build server sends it uncompressed. Gzipped it is about 160 KB, which would cut roughly 340 KB (about 1.6 s); an estimate, not a measurement.
   - Banshee: sprites (about 575 KB), the spirit figure (168 KB) and the meter frame (35 KB) are `loading="lazy"` but already inside the viewport, so they download at the same time as the scene and delay it from 6.8 s to 10.4 s. Requirement 14.1 asks the first view not to wait for them; they do. A fix (start sprites and spirit images after the scene image `load`) changes server-rendered markup and the viewer tests, so it is left for the owner's decision.
   - The images come from the atlas origin here (cross-origin, HTTP/1.1 on localhost); on one domain with HTTP/2 the scene's high priority should help more. Not measured.
   - The local atlas media answer has no cache headers.
2. **The atlas `serve-build.mjs` crashes** about 120 s after an atlas page request whose stream does not finish: `Stream lifetime exceeded`, unhandled `error` event, process exit (seen twice, after atlas tabs were opened and closed by the script). The atlas is protected this phase, so it is not changed. The script waits 2.5 s before closing atlas tabs, and the run used a restart loop for the atlas server. It is a local-server issue; whether the Vercel build is affected is not known.
3. The Hall pan buttons are physical left and right in right-to-left (by design for the painted scene); the Arabic catalog is not translated yet.
4. Hotspot "visibility" is a visual judgment from the screenshots; there is no automatic check that a painted object lies under each hotspot.
