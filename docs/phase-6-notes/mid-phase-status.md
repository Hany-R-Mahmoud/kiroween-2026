# Phase 6 mid-phase status (after groups 1 to 4)

The run does not wait. Groups 1 to 4 (P1 items 1 to 10) are done and checkpointed (`pnpm -r test` green, typecheck clean). The Owner may write feedback in `docs/phase-6-notes/owner-feedback.md` at any time; it is read at each checkpoint.

## Local URLs (production builds, `node --env-file=.env`, guest, no sign-in)

- Atlas home: http://localhost:3001/
- Legend page, Book_View, references (Sources) page: http://localhost:3001/legends/banshee#sources-title
- Game Hall: http://localhost:3000/game/
- Banshee scene: http://localhost:3000/game/world/banshee

## Screenshots (`.debug/phase-6/`, 390x844 and 1280x800)

| Screen | Width | Before | After |
|---|---|---|---|
| Atlas home | 390 | `item6-header-hero-390-before.png` | `status-atlas-home-390-after.png` |
| Atlas home | 1280 | `item6-header-hero-1280-before.png` | `status-atlas-home-1280-after.png` |
| Legend page (Banshee), references in Book_View | 390 | `item3-390-before.png` | `status-legend-references-390-after.png` |
| Legend page (Banshee), references in Book_View | 1280 | `item3-1280-before.png` | `status-legend-references-1280-after.png` |
| Game Hall | 390 | `item8-390-before.png` | `status-hall-390-after.png` |
| Game Hall | 1280 | `item8-1280-before.png` | `status-hall-1280-after.png` |
| Banshee scene | 390 | `item4-390-before.png` | `status-banshee-scene-390-after.png` |
| Banshee scene | 1280 | `item4-1280-before.png` | `status-banshee-scene-1280-after.png` |

All four "after" screens were re-shot for this note (header, hero and Hall changed after the earlier after-shots). The legend "before" shots show the old first page of the book, not the references page, because the baseline was taken before the paper changes; the "after" shots are on page 55 of 58 (390) and 21 of 22 (1280), with Sources visible. Script: `status-shoot.mjs`. Earlier per-item shots (`item<N>-<width>-<before|after>.png`) are still there.

## What changed

- Shared UI layer: tokens, `ui.css` in `@layer ui`, one focus ring, `.btn`/`.link`/`.nav-item`/`.panel`; scene and world CSS moved into `@layer components` (no visible change).
- Paper context: paper tokens re-pointed, Version card, table rules, external-link marker on Sources; answer options readable on paper, tried options show a mark and "Tried". Contrast scans pass at both widths.
- Atlas home: one map (painted strip removed), hero with a primary "Start with Banshee" button and game link, legend cards with images, phone-usable map with swipe hint. Slow 4G LCP median 5360 ms vs 6128 ms before.
- Atlas header: logo, "All legends" (`/#legends`), "Play Trick or True" (`/game/`).
- Game Hall: visible title and premise, primary "Start in the study", locked doors open a reason panel instead of navigating.
- Game header: popover menu at narrow width; atlas link by href.
- Scenes: one scene-screen layout (top bar, viewer, dock), hotspot glint on every hotspot, always-present reply line; the Banshee scene controls end at or above y = 800 at 1280x800.

## Decisions to know (all in `decisions.md`)

- The five conflicts between `design-direction.md` and the steering files: steering wins; new tokens sit beside the base palette; pinned paper ink kept.
- Map: Painted_Strip removed, real `WorldMap` kept.
- Header menu: popover used in the game header.
- Hall primary action "Start in the study" (departure from the original 17.2).
- Read-only `hero` field added to the atlas summary.

## Blocked tasks

None.

## Open issues

- The `impeccable` skill could not be loaded in this run; before/after reviews were done by eye against `design-direction.md`.
- Item 4 shows the scene with no puzzle open; options on paper are covered by the contrast scan, not by this shot.
- Error-page PNGs from an earlier run (task 3.7) could not be deleted; they are marked invalid in `browser-checks.md`.
- Group 6 onward (items 11 to 22) is not started.
