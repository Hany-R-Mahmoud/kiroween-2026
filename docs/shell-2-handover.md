# Shell phase 2: the entry page, handover

Spec: `.kiro/specs/shell-2-entry-page/`. Hidden page: `/lab/shell` in the atlas (noindex, no links). `/lab/card` and `/` are unchanged. Nothing is committed or pushed.

## What changed

- **Fix 1, cold load:** `skeleton/src/shell/holo/imageReady.ts` (`waitForImage`) replaces the old `ready()`, so a layer that is `complete` with `naturalWidth` 0 waits for `load` or `error` (10 s limit).
- **Fix 2, srcset cap:** `HOLO_STEPS_CAPPED` (360 to 800) in `geometry.ts`, used for all four layers.
- **HoloCard props:** `onFaceChange`, `onInteract`, `handleRef` (`HoloCardHandle.turnToFront({ quiet })`), `sweepDelayMs`; Preview span under the layers.
- **Page:** `apps/atlas/src/routes/lab.shell.tsx`, styles in `apps/atlas/src/styles.css` (`@layer ui`), site header and footer hidden on this route in `__root.tsx`, nine Catalog keys in `en.ts`.

Files touched: `skeleton/src/shell/{HoloCard.tsx,holoCard.css,index.ts}`, `skeleton/src/shell/holo/{geometry,motion,renderer,imageReady}.ts`, `apps/atlas/src/{routes/lab.shell.tsx,routes/__root.tsx,styles.css,i18n/en.ts,routeTree.gen.ts}` (generated). Nothing under `content/`, `assets/`, game logic, generator, play engine or database was changed. `assets/LOG.md` is not touched by me.

## Typecheck and tests

- `pnpm -r typecheck` first run failed on a task 3 error: `sweepDelayMs: number | undefined` was not assignable to `HoloRendererOptions` under `exactOptionalPropertyTypes`. Fixed by typing the option `number | undefined` (`renderer.ts`). The atlas typecheck then failed because `routeTree.gen.ts` had no `/lab/shell`; `pnpm build` regenerates it. Both packages now clean.
- `pnpm -r test` once: skeleton 916 passed + 8 expected fail, atlas 305, game 401. No failure. After the last CSS edits I re-ran atlas tests (305) and atlas typecheck only.

## How the checks ran

Local build on free ports: 3022 with `IMAGE_CDN_URL=https://cdn.test/kw`, 3021 with no CDN. Variables set in the shell only (`.env` sourced, no value written anywhere). **The CDN was simulated.** No real CDN URL is available here, and the app requires https, so the Playwright script answers `https://cdn.test/**` from `assets/shell/` with `sharp` resizing (webp q80) and a response delay. Bytes are close to, not equal to, ImageKit's. Scripts: `.debug/shell-2/{lib,shots,net,checks,perf,videos}.mjs`; data in `*.json`. Real GPU (Chromium, ANGLE Metal, M3).

## Fix 1: cold load (CDN base set, cache disabled)

Both scenes reach `data-renderer="webgl"` with no console error. Image delay per response, time to both cards on WebGL:

| Delay | 1280x800 | 390x844 (DPR 3) |
|---|---|---|
| 0 ms | 328 ms | 271 ms |
| 800 ms | 1030 ms | 1056 ms |
| 3000 ms | 3205 ms | 3284 ms |

Limit is 15 s. I did not run the pre-fix code, so this shows the fixed code works, not that the old code failed in this setup.

## Fix 2: widths requested (CDN on, cold)

Highest requested layer width, same for all layers and both cards; the 32 px Preview is extra. None exceeds w800.

| Viewport | DPR 1 | DPR 2 | DPR 3 |
|---|---|---|---|
| 390x844 | w480 | w800 | w800 |
| 1280x800 | w560 | w800 | w800 |

Hosts: the app origin and the CDN only. Shared images (frame, back): each loaded once with the browser cache on. With the cache **disabled** the frame was fetched twice at 390 DPR 3 and at 1280 DPR 2 and 3 (two `img` elements, no memory cache). So "once" holds on a normal cold visit, not under a disabled cache.

## Budgets

CDN on (simulated bytes, both cards, includes two 32 px previews):

| Viewport | At load | After both cards flipped (back image added) | Budget |
|---|---|---|---|
| 390x844 DPR 1 | 138,564 | 196,162 | 500 KB |
| 390x844 DPR 2 and 3 | 284,240 | 403,948 | 500 KB |
| 1280x800 DPR 1 | 173,742 | 246,202 | 900 KB |
| 1280x800 DPR 2 and 3 | 284,240 | 403,948 | 900 KB |

Within budget. With the cache disabled the DPR 3 run totals 394,952 at load and 514,660 after the flips (duplicate frame), so the phone budget is exceeded only in that disabled-cache case, and only by the simulated bytes.

CDN off (local files, same at both sizes): card images at load 2,148,725 (told bg 203,428, true bg 199,095, told subject 271,807, true subject 426,497, frame 1,047,898); after both flips 2,495,875 (back 347,150). Whole page at load 2,790,524 in 20 requests, all to `localhost`. Each image once. The budgets do not apply without the CDN. Widths each image would be requested at are the table above.

Lazy renderer chunk: `renderer-CQFDCvSj.js` 10,548 bytes raw, **4,722 bytes gzip** (25 KB budget), shared by both cards.

## Frame rate, both cards, 1280x800 (6 s of pointer movement across both)

| Throttle | Median ms | Slowest 5% mean ms | p95 ms | Max ms | fps |
|---|---|---|---|---|---|
| none | 16.7 | 16.8 | 16.8 | 16.8 | 60 |
| 4x CPU | 16.7 | 19.6 | 16.8 | 49.9 | 59.5 |

Target median 22 ms: met. Frames are vsync-locked on this GPU, so this shows no dropped frames, not shader headroom. No phone GPU measured.

## Layout (screenshots in `.debug/shell-2/`, CDN on)

No horizontal scroll at any of the six sizes; no console errors; no header or footer; `robots` is `noindex, nofollow`; title "Trick or Told".

| Size | Cards (w x h) | Result |
|---|---|---|
| 1280x800 | 426x588, side by side | no vertical scroll, 92 px under the cards (Hint inside) |
| 1024x768 | 403x556, side by side | no vertical scroll, 92 px under |
| 768x1024 | 360x497, side by side | both visible |
| 667x375 | 228x315, side by side | no vertical scroll; 16 px under the cards |
| 390x844 | 358x494, stacked | Told whole; 214 px of True shown |
| 375x667 | 309x427, stacked | Told whole; 104 px of True shown |

Per size I captured: rest, Told back, True back, reduced motion (+back), WebGL off (`rest-*`, `told-back-*`, `true-back-*`, `reduced-*`, `reduced-back-*`, `nowebgl-*`). WebGL off keeps the HTML layers (`data-renderer` unset) with no errors. Reduced motion draws a still WebGL frame.

**Told subject vs frame window:** by eye at 390x844, 375x667, 1024x768 and 1280x800 the book, candle and key sit inside the frame window and end above the cartouche (about 30 px clear at 1280). No blocker.

**Fixes I made in Verify (page spacing only, `styles.css`):** (1) at 1024x768 and 1280x800 the page scrolled 44 px because the Hint was outside the card height budget; the Hint now comes off the card height (`--shell-hint`) and is 36 px high (it is text, not a target); (2) the tagline wrapped as "Read / them" at 36ch; max width is now 48ch.

## Keyboard and pair rule (both sizes, same results)

- Tab from the page start: skip link, Told, True.
- Enter on Told: faces back/front, focus on "Read the legends". Enter on True with Told open: True back, Told turns front, focus stays on "Play the game" (quiet turn). Escape: True front, focus on its front button. Reverse (click True, then click Told): Told back, True front, focus on Told's link.
- Contrast on `#0E0B10`: heading 15.06, tagline 6.39; the Hint uses the same muted token (not measured on its own, the element is removed after use).

## Hint

Mouse: "Drag a card to turn it."; touch: "Drag a card to turn it, tap to flip." Both hide after the first drag and after the first flip, mouse and touch (four runs). Not tested across client navigation.

## Entrance

Playwright videos `video-1280x800.webm` and `video-390x844.webm` (entrance, drag-spin each card, flip Told then True). I recorded them but could not play them back here, so the entrance timing is unseen by me.

## "Continue": skipped

The game keeps no last-world value that the page can read, and the legend name needs a database read (`getHome`). Reading `playClient.ts`: the guest play token key ends in the legend id, but the value is an encrypted token and only guests have it. Game change that would unblock it: the game writes a plain `lastWorld` (legend id) to local storage when a world starts, and the atlas exposes a legend name by id without a database call (a content-pack index). No "Continue" text is in the page (checked).

## Slow 4G, 390x844 DPR 3 (screenshots `slow4g-*`, every 3 s; link simulated in the stand-in, local files via CDP)

| Link | First art on a card | Both cards on WebGL | Flat box? |
|---|---|---|---|
| about 1.2 Mbps images, 562 ms | about 1.7 s | about 5 to 8 s | **yes, for the first about 1.5 s** |
| 300 kbps images | Told 2.7 s, True 5 s | 11 s | **yes, True is flat until about 5 s** |

Pixel spread (stdev) of a card is 0.3 to 0.5 before its first image (flat) and 35 to 55 after.

## Blockers and weak points

1. **Preview arrives last (requirement 10.1 not met on a slow link).** The five layer images are requested at about 95 ms (they are `img` in the HTML). The two 32 px Previews are CSS backgrounds and are requested at about 317 ms, after style recalc, at the same priority (`Low`). On a shared slow link they land behind the large images (3 s of 3.2 s at 1.2 Mbps; 8 s of 8.8 s at 300 kbps). So a card is a nearly flat dark box until its background arrives. Fix needs markup: make the Preview an `img` (high fetch priority) or add a preload for it in the page head. I did not change it (not a constant). The stand-in queue is my model of a slow link, but the request order is Chrome's.
2. **667x375 hides the tagline and the Hint** (`display: none`). The design says the tagline may not be hidden; with a 375 px height the cards fill the screen. Needs your decision (shrink cards further, or put the tagline beside the heading).
3. **CDN is simulated.** No real ImageKit numbers, real WebGL look through the CDN (CORS), or decode times. Please measure on a deployment.
4. **Frame duplicated with cache disabled** (above). Normal visits are fine.
5. **No real phone GPU** and I did not play back the videos.
6. **Hint contrast** inferred from the shared token, not measured on the element.
7. **Reduced motion** keeps the WebGL still frame; crossfade on flip was seen in `reduced-back-*` only by screenshot, not timed.
8. Not tested: RTL of the pair layout (side-by-side order mirrored), client navigation back to the page (entrance replay, hint memory), 768x1024 back faces beyond the screenshots.

## New strings for owner review (`apps/atlas/src/i18n/en.ts`; `ar.ts` falls back to English)

`shell.card.told.title` Told; `.line` Twelve legends, every version, with their sources.; `.link` Read the legends; `.name` Told: read the legends; `shell.entry.title` Trick or Told; `.tagline` Twelve legends. Read them, then prove you did.; `.description` Read twelve scary legends from around the world, then play the investigation game.; `.hint.pointer` Drag a card to turn it.; `.hint.touch` Drag a card to turn it, tap to flip.

No tests written. No hooks or sub-agents were used in Verify.
