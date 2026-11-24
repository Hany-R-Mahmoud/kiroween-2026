# Asset log

All images in this folder were generated outside Kiro with an AI image tool, from the prompts in section 9 of each legend file and in `content/hub-and-tutorial.md`.

| Batches | Images | Tool | Date |
|---|---|---|---|
| 01 to 43 | 423 | muse.ai | 2026-11-19 |

## Processing

- The tool delivered PNG files (901 MB). The PNG originals are kept outside the repo, in `kiroween-2026-pack/assets/visual-assets/`.
- `kiroween-2026-pack/scripts/convert-assets.py` checked every file name and size against the content files (423 of 423 matched), then converted the images to WebP with `cwebp` 1.6.0: quality 80 for opaque images, and quality 85 with full-quality alpha for transparent ones. The result is 69 MB.
- 262 images that should be transparent came with a background, either plain or a painted checkerboard. The script cut the subject out with macOS Vision before conversion (`kiroween-2026-pack/scripts/cutout.swift`).

## Regenerated images

On 2026-11-19, 5 images were generated again with muse.ai (`regenerated-assets.zip` in the pack) and replaced the first versions:

- `draugr-game-scene-03` and `draugr-game-hotspot-18`: the updated prompts, which include the bundle of notes on the bench.
- `vetala-game-hotspot-15`: the first version was a flat icon that could not be cut out.
- `spring-heeled-jack-shared-ui-01` and `vetala-shared-ui-01`: the first versions had a motif in the middle of the panel.

## Open items

- `spring-heeled-jack-shared-ui-01` came out as a nearly plain paper panel without the iron railing and gas-lamp corners the prompt asked for. It works as a plain panel. Generate it again if the frame should match the other legends.

## Cleaned sprite (2026-11-22)

- `el-coco-game-hotspot-04`: the figure's shoulders were cut off flat at the bottom of the image, so a hard edge showed in the scene. The bottom 360 px now fade to fully transparent, and the lower side edges fade too, so the figure melts into the shadows. Same ID, size (1024×1024) and format; no layout change. Edited with sharp (alpha only, no new generated content).

## 2026-11-24 — Shell cards batch (Trick or Told)

Two holo cards for the atlas shell ("Trick or Told"): **Told** (books) and **True** (game).
Generated with the same image tool as the atlas/game batches (muse.ai), shared style line:
painterly digital illustration, film grain, deep shadows, candlelight,
palette #0E0B10 #1C1620 #E9E1D3, accent #E0A84B, glow #F4D58D. Card ratio 5:7.
Saved as WebP under `assets/shell/`.

| File | Size | Background | Notes |
|---|---|---|---|
| shell-card-told-bg-01.webp | 1200×1680 | opaque | Candle-lit study, shelves, map rolls, faint map (no readable text), candles low, empty center |
| shell-card-told-subject-01.webp | 1000×1400 | transparent | Open field journal on book stack, candle, pressed flower, brass key; no text on pages |
| shell-card-true-bg-01.webp | 1200×1680 | opaque | Archive hall, carved doors in fog, moonlight window right, one warm lamp, empty center |
| shell-card-true-subject-01.webp | 1000×1400 | transparent | Carved door half open, cold light in gap, veiled figure (no face), iron key in lock |
| shell-card-frame-01.webp | 1000×1400 | transparent window | Gold filigree frame (moths, keys, candle flames), empty cartouche bottom center |
| shell-card-back-01.webp | 1000×1400 | opaque | Plum-black #1C1620, gold filigree border, keyhole emblem upper third, lower half empty for code-set text |

Checks performed before handoff:
- No text/letters, logos, film/game/real-person likeness, or gore in any asset; no Souls-style elements (no bonfire, knight, sword, Gothic cathedral).
- Composite check (subject over background, frame over both): both subjects sit fully inside the frame window without touching its edges. To pass this, each subject layer was scaled within its 5:7 canvas to fit the window (Told ×0.61, True ×0.79), centered, bottom-aligned.
- Frame alpha is strictly binary (only 0 or 255, no semi-transparent halo): window fully transparent (alpha 0), frame fully opaque; area outside the frame also transparent.
- Subject cutouts have clean alpha edges with no white fringe.

Production notes:
- The generator returns opaque images only, so the two subjects were first regenerated on a flat magenta background and the background was removed by colour keying (a workaround, not true segmentation); the first subject attempts (dark scene backgrounds, door touching the edges) were discarded.
- The frame's window was generated as a flat teal panel and keyed out the same way; the dark backing inside the gold bands was kept opaque.
- Card back text is NOT baked into the image; it is set in code. Strings proposed for owner review:
  - Told: "Twelve legends, every version, with their sources." — Button: "Read the legends"
  - True: "The answers live only in the atlas. Find them before dawn." — Button: "Play the game"
