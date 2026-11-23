# Owner feedback

Review of the local after-screenshots (2026-11-22). Apply these before the push stop (9.1), as tasks 8.F1 to 8.F4. Mark each "done in task N".

## F1. Scene tabs are cut off at 1280 px

Status: done in task 8.F1.

In `screens-game-hint1-1280.png` and `status-banshee-scene-1280-after.png` the tab row ends in "Next s", and the earlier shot shows a bright scrollbar under it. Nothing tells the player that more tabs exist.

Fix: at 40rem and up, put the scene tabs on their own row under the back link and title, and let them wrap (no horizontal scroll, no scrollbar). Below 40rem the single scrolling row may stay, with its scrollbar hidden but a visible fade or "more" cue at the end. Re-check 18.2 (scene, pan buttons, fear meter and hints inside 1280x800) and 18.3 (scene top above y = 200 at 390) after the change.

## F2. Hotspot glints are not visible in any screenshot (done in task 8.F2)

Item 10 needs players to see what can be clicked. I cannot see a glint in the tutorial or Banshee shots at either width.

Fix: make the glint visible at first look on the darkest and the brightest parts of the paintings (for example a small glow dot of at least 8 px with a soft halo, peak opacity high enough to read). Keep decoys and clues identical and keep it static under reduced motion. Prove it: crop a 64 px box around three hotspots in a 1280 screenshot and save before and after crops in `.debug/phase-6/`. Measure the glint against its surrounding pixels at 3:1 or more at its brightest step.

## F3. Empty gaps in the scene dock at 1280 px

Status: done in task 8.F3.

At 1280x800 there is about 70 px of empty space between the fear meter row and the hint row. The reply line "Tap anything that glints." sits under the hints, far from the scene. Also, when the whole image fits, an empty dark strip shows at the inline end of the viewer (about 85 px at 1280).

Fix: put the fear meter, the reply line and the hint pair in one compact dock (fear and reply on one row, hints at the end, wrapping at 390 px). Centre the scene image in the viewer when it is narrower than the viewer. Re-check 18.2 and the 0 px shift of item 19.

## F4. Fear caption covers the notebook at 390 px

Status: done in task 8.F4.

In `item4-puzzle-390-after.png` the caption "Something moves at the edge of sight." is drawn over the notebook text and the "Show the question" button.

Fix: the fear caption must not cover controls or text. Place it over the scene image (or in the reply row) and keep `pointer-events: none`. Check at 390 and 1280 with a caption showing.

## F5. Atlas home hero art is invisible on phones, and phones load the 2400 px file
Status: done in task 10.F5.

Production check at 375x812 (2026-11-23): the hero image box is 512 px tall, but the copy panel (with its 90% background scrim) covers most of it, and the visible top strip is dark. A phone visitor never sees the painting. The `img` has no `srcset` or `sizes`, so phones download `shared-atlas-hero-01.webp` at 2400x1350.

Fix: below 40rem, stack the hero: the image first at 16/9 and fully visible, then the copy below it on the page background with no scrim. Keep the 1280 layout as it is. Do not change image sources or sizes in this round: phone-sized images will be handled in a separate image-delivery task.

## F6. Atlas header wraps to two rows at 375 px
Status: done in task 10.F6.

At 375x812 the header is 105 px tall: "Play Trick or True" drops to a second row. 375 px is a common phone width.

Fix: one row at 360 px and up. The smallest change is a shorter visible label below 40rem (for example "Play" with the full name kept as the accessible name, from a catalog key), or tighter gaps. Add the 360 px width to the header browser check.

## F7. Hint 1 hotspot marks never show (done in task 10.F7)

`skeleton/src/play/engine.ts:126` already returns `highlight` in the `hint1` reply, but the client only keeps the text (`hint1Texts` in `WorldPlay.tsx`) and `markedIds` reads `slot.hint1`, which the view never carries. So Hint 1 marks nothing in a real run.

Fix (client state only, no change to the engine, view, token or play rules): store the reply's `highlight` per slot next to `hint1Texts`, and add those ids to the marked set until the slot is solved. Add a test with a `hint1` reply that has a highlight, asserting the hotspot renders as marked, and a mutation check. Confirm in the browser that Hint 1 on Banshee Puzzle 1 marks at least one hotspot.
Status: client fix done in task 10.F7. Browser confirmation blocked: the Banshee Hint 1 rows in the content name no hotspot id, so the server returns an empty `highlight` (see decisions.md, Task 10.F7).

## F8. Close the small test gaps from verify-and-stop (done in task 10.F8)

Add the missing pins: the fear meter text contrast pair in the contrast matrix (25.5), the `.btn` 44 px minimum height (10.3), the 2 px current-item marker (11.5), and the Hint 2 fallback link's 44 px height and `rel="noopener"` (27.4). Each must fail when its rule is broken.

Status: pins added in task 10.F8 (D22 fear text 15.06:1, `.btn` 44 px, 2 px marker, Hint 2 link 44 px and `rel="noopener"`), each mutation-checked (see mutations.md).
## F9. Serve images through the ImageKit CDN with sized copies (owner-approved, run after F8)

Goal: phones and laptops download images sized for their screen, so the scene paint gets closer to the 3.0 s Slow 4G budget. No image files are added or changed. ImageKit fetches each original from our `/media/` folder once, resizes it from the URL, caches it and serves it from its CDN.

Already set up by the owner (do not change):
- ImageKit Web Folder origin: `https://trick-or-told.vercel.app/media`, served at the URL endpoint `https://ik.imagekit.io/hrim`. So `/media/banshee/game/banshee-game-scene-01.webp` is also `https://ik.imagekit.io/hrim/banshee/game/banshee-game-scene-01.webp`, and `?tr=h-900` returns a 900 px tall copy. No API key or account access is needed, and none may be added.
- Vercel production env `IMAGE_CDN_URL=https://ik.imagekit.io/hrim` in both projects. It is a public URL, not a secret. Locally it is unset unless you pass it on the command line (`IMAGE_CDN_URL=https://ik.imagekit.io/hrim node --env-file=.env ...`); never read or edit `.env`.
- Measured (Banshee scene 1, 4096x1536, 431 KB): `tr=h-600` and `tr=h-900` in WebP are about 230 KB at h-900; the atlas hero at `tr=w-800` is 41 KB in WebP against 161 KB today. ImageKit picks WebP from the browser's Accept header. Automatic AVIF is off on this plan; do not use it.

Do:
1. One helper in the skeleton, beside `assetUrl`, that takes an asset id, a CDN base and an optional transform (width or height) and returns the CDN URL `<base>/<path after /media/>?tr=<w-N|h-N>`. With no base it returns exactly what `assetUrl` returns today. Validate ids the same way; build `tr` only from integers. Unit tests for both paths, plus a property test that the no-CDN path equals `assetUrl` for every valid id.
2. Read `IMAGE_CDN_URL` on the server only and pass it to the pages the way the game already passes `mediaBase` (root loader data). Atlas and game both use it. Unset or empty means today's URLs, byte for byte, so every existing test stays green unchanged.
3. Use `srcset` and `sizes` with CDN copies where the gain is real:
   - scene panoramas in `SceneViewer` and the Hall: height-based copies (`h-600`, `h-900`, `h-1200`) with `w` descriptors from the aspect ratio, and `sizes` derived from the real CSS scene height. Target at 390 px with DPR 2: Banshee scene 1 at or under 250 KB; at 1280 px with DPR 1: at or under 250 KB.
   - the atlas home hero, legend heroes and legend cards: width-based copies (`w-400` to `w-2400`) with `sizes` matching the layout. With the CDN on, these replace the `-w1000` phone copies; with it off, keep today's markup.
   - spirit figures and sprites shown much smaller than their file: one or two width copies.
   - Leave the small paper and frame textures in CSS as they are.
4. Preload links (`routes/index.tsx`, `legends.$legendId.tsx`) must point at the same URL and `imagesrcset`/`imagesizes` that the `img` will pick, so nothing downloads twice. `og:image` keeps the original absolute URL.
5. Keep the `width` and `height` attributes at the original intrinsic size, so layout, hotspot boxes and pan maths do not move.
6. Security headers: add `https://ik.imagekit.io` to `img-src` in the CSP in `skeleton/src/deploy/vercelRules.ts` (the owner approves this one change to that file; no other rule changes), and update its test.
7. Fallback: if the CDN is down or over its free quota, the owner removes `IMAGE_CDN_URL` in Vercel and redeploys. Write this in the handover with the exact steps.
8. Disclosure: add one line to the README and to `docs/kiro-usage.md` saying images are delivered through ImageKit (free plan) from our own originals.

Checks: tests for every new branch (CDN on and off), the CSP test, mutation checks on the helper and the preload match. Local browser checks with the CDN passed on the command line: no broken images in the atlas home, a legend page, the Hall, the tutorial and the Banshee world at 390 and 1280; the network panel shows `ik.imagekit.io` URLs with `tr=`, no image downloaded twice, and the bytes per screen before and after. Run the local Slow 4G timing for the Hall, the tutorial, Banshee scene 1 and the atlas home with the CDN off and on (median of three each) and record both tables. Mark F9 "done in task 10.F11".

Status: done in task 10.F11 (numbering: 10.F9 was the re-run task). See decisions.md and browser-checks.md.

## F10. Hide the "Highlight …" ids from the Hint 1 text (owner content change already made) — done in task 10.F13 (production `db:import` still to run by the owner)

The owner added hotspot ids to the Hint 1 rows of the 11 other legends (48 rows, same form as Flying Dutchman: `<hint text> Highlight h-04.` or `Highlight hs-beetle and hs-journal.`). Rows whose hint names no object have no ids: baba-yaga p-5, banshee pz-5, draugr p-4, vetala p-2 and p-3, yuki-onna p-1 and p-3. The audit, the parse (0 errors) and all tests pass with the new content (skeleton 913 + 8 expected fail, game 399, atlas 302). Do not edit `content/`.

Problem: `makeHint` in `skeleton/src/parser/world.ts` keeps the `Highlight …` sentence inside `hint1.text`, and the game shows that text as-is. Players already see "Highlight h-07 and h-03." on Flying Dutchman in production, and would now see raw ids in every legend.

Fix: in `makeHint`, read the ids from the `Highlight …` sentence as today, but remove that trailing sentence from the returned `text` (the hint keeps its own words and final punctuation, with no stray quotes). Ids written elsewhere in the hint text keep today's behaviour. Tests: the Flying Dutchman pz-1 text equals "The logbook and the letters are different kinds of writing." with highlight `h-07`, `h-03`; no parsed Hint 1 text in any legend contains `Highlight` or an `h-`/`hs-` id token; the unknown-id error still fires (existing test); a mutation check that fails when the strip is removed. Then confirm in the browser (local, dev database) that Hint 1 on Banshee Puzzle 1 marks the dresser and the text shows no id.

Database: run `db:import` once on the dev branch only, after confirming `.env` points at the dev endpoint, and check `hint1_highlights` is non-empty for those slots. Do not touch production; the owner runs the production `db:import` after the push. Mark F10 "done in task N".

## After F5 to F8

Run F9 first, then: re-run the atlas and game screen checks at 360, 390 and 1280, the keyboard pass on the atlas header, and checkpoint 9.5 (tests, typecheck, secret scan). Update `docs/phase-6-handover.md` and `verification.md` with F5 to F8. Then stop and tell me the tree is ready to push.

## After F1 to F4

Re-run the affected browser checks (game screens, keyboard pass on the scene top bar, reduced motion for the glint). Save new after-shots for items 9 and 10. Run checkpoint 8.8 again (tests, typecheck, secret scan), then stop at 9.1.

Note from task 10.F9 (2026-11-23): F9 (ImageKit CDN) has no task in tasks.md, is not implemented, and changes `skeleton/src/deploy/vercelRules.ts`, which task 10.F9 must leave untouched. It is open and needs its own task; the F5 to F8 checks above ran without it. No other new items.
