# Content and assets needed

## 1. Seam-free Banshee kitchen panorama (requested in task 7.4; Req 32.4, 2.2)

**Judgement:** defect. It is visible at first look on both phone and desktop and sits in the main play surface.

**The seam.** The Banshee kitchen panorama shows a vertical brightness step. At 1280 px wide it runs about halfway across the picture, through the fireplace. At 390 px wide a lighter band appears at the left edge, from about x=16 to x=74. The image looks like two exposures joined, or an overlay edge. Source: `docs/planning/phase-6-review/impeccable.md`, finding E4 (P2). It was not re-measured in this phase; the CSS side was checked and adds no overlay at that position.

**Asset.** `assets/banshee/game/banshee-game-scene-01.webp` (the kitchen scene, to be confirmed against the scene list). Scenes 02 and 03 are the same size and format and should be checked for the same step when the asset is replaced.

**Required:**
- Size: 4096 x 1536 px, the same as today, so hotspot boxes and pan maths stay valid.
- Format: WebP, same file name and path as the current file (replace in place).
- Content: same composition and object positions as the current scene. Brightness and colour continuous across the full width, with no vertical step anywhere.
- Left and right edges: unchanged framing, because the viewer pans without wrapping.
- Weight: no larger than the current file, to keep the phone load time recorded in `browser-checks.md`.

**Where it goes.** Banshee world scene 1 in the game (`apps/game`, scene viewer, `scene-image`). Scene images come from `assets/` through the Neon import, so the owner replaces the file and re-runs the import. The UI rework did not edit the asset, and no CSS workaround was added.

**Item that needs it.** Fix-list P3 "Banshee panorama brightness seam (asset)"; task 7.4.
