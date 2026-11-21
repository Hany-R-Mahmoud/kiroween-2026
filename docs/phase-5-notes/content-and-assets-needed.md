# Content and assets needed

The Owner adds these PNG icon files outside Kiro. No icon file is created by the agent. Until they exist, the manifests and the `apple-touch-icon` links still name these paths.

| id | size | format | purpose | path |
| --- | --- | --- | --- | --- |
| icon-192 | 192x192 | PNG | any | apps/game/public/icons/icon-192.png |
| icon-512 | 512x512 | PNG | any | apps/game/public/icons/icon-512.png |
| icon-maskable-512 | 512x512 | PNG | maskable (keep art inside the inner 80 %) | apps/game/public/icons/icon-maskable-512.png |
| apple-touch-180 | 180x180 | PNG | apple-touch-icon (no transparency) | apps/game/public/icons/apple-touch-180.png |
| icon-192 | 192x192 | PNG | any | apps/atlas/public/icons/icon-192.png |
| icon-512 | 512x512 | PNG | any | apps/atlas/public/icons/icon-512.png |
| icon-maskable-512 | 512x512 | PNG | maskable (keep art inside the inner 80 %) | apps/atlas/public/icons/icon-maskable-512.png |
| apple-touch-180 | 180x180 | PNG | apple-touch-icon (no transparency) | apps/atlas/public/icons/apple-touch-180.png |

## Optional: phone-width first scenes (speed, task 4.7)

The 3.0 s Slow 4G budget is missed on production by the scene image size (Hall 318 KB, Tutorial 309 KB, Banshee scene 1 431 KB). Not required for the submission. If wanted, add phone copies under new ids (the originals stay):

| New asset id | From | Size | Format | Target bytes |
|---|---|---|---|---|
| `hub-game-scene-01-w1200` | `hub-game-scene-01` | 1200 px wide, same aspect ratio | WebP | about 130 KB |
| `tutorial-game-scene-01-w1200` | `tutorial-game-scene-01` | 1200 px wide | WebP | about 130 KB |
| `banshee-game-scene-01-w1200` | `banshee-game-scene-01` | 1200 px wide | WebP | about 150 KB |

The game would then need a small change to pick them below 1000 px (not built; the pan layout is defined on the full image, so hotspot boxes would need checking).

## Sprite fix (Owner review of D2)

| Asset id | Problem | Needed |
|---|---|---|
| `el-coco-game-hotspot-04` | opaque strip along the bottom edge (alpha 221–237), so a hard-edged rectangle shows under the hooded figure | a cleaned sprite with a fully transparent bottom edge, same id, size and format; no layout change needed |
