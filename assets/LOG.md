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
