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

## After F1 to F4

Re-run the affected browser checks (game screens, keyboard pass on the scene top bar, reduced motion for the glint). Save new after-shots for items 9 and 10. Run checkpoint 8.8 again (tests, typecheck, secret scan), then stop at 9.1.
