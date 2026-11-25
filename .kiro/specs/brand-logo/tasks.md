# Implementation Plan: Brand Logo

## Overview

Install the finished logo art in order: icons, masters, atlas header, game header, tutorial checks, verification, handover. All tasks are required. No task makes a commit or a push. Execution stops if blocked, or if a change would touch game logic, the play engine, `content/`, `assets/` or the database (Requirement 7.10, 6.5). The art is copied, never redrawn. Final_Icons live in `../kiroween-review-2026-11-24/icons/final/`. No secrets in code, docs or logs.

## Tasks

- [x] 1. Icons
  - [x] 1.1 Replace the atlas icons
    - Copy `public/favicon.ico` and the five PNG files of `public/icons/` from the Final_Icons over the same-named files in `apps/atlas/public/` and `apps/atlas/public/icons/`
    - Do not change file names, link tags or manifests
    - _Requirements: 1.1, 1.4, 1.5_

  - [x] 1.2 Replace the game icons
    - List `apps/game/public/icons/`, then copy the same-named Final_Icons files over the four PNG files that exist there
    - Add `favicon-32.png` only if a game link tag points at it locally
    - Leave manifest 192/512 entries without `purpose` as they are
    - Compare checksums of all copied files with the sources
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [x] 2. Masters
  - [x] 2.1 Copy the SVG masters and write the README
    - Copy the nine files of `svg/` unchanged to `docs/brand/`
    - Write `docs/brand/README.md`: one line per file, the colours `#e0a84b` and `#0e0b10`, and "do not stretch, recolour outside these files, or redraw"
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Atlas header logo
  - [x] 3.1 Add the wordmark file and use it in the header
    - Copy `wordmark-gold.svg` to `apps/atlas/public/brand/wordmark-gold.svg`
    - In `apps/atlas/src/components/SiteHeader.tsx`, replace the text title in the home link with an image 32 to 36 px high whose `alt` is the `app.title` text
    - Keep the link's focus style and the header height; measure the header height before the change and after it
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Game header icon
  - [x] 4.1 Add the gold-only small icon to the game header
    - Create `apps/game/public/brand/icon-small.svg` from `icon-small.svg` by removing the background rect and nothing else
    - In the game header component, add an `<img>` of about 20 px with `alt=""` and `aria-hidden="true"` before the text title "Trick or True"
    - Leave the entry page `/` and `og/trick-or-told-1200x630.jpg` untouched
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2_

- [x] 5. Tutorial tap and keyboard checks
  - [x] 5.1 Reproduce both failures by hand
    - Build and serve the game on a port other than 3305 and 3306. In a real browser at 390x844 with touch emulation, tap the candle hotspot in the tutorial and note whether it lights and opens the panel
    - Using only the keyboard, go from the Hall into the tutorial and note where it stops
    - Decide for each: app wrong or check stale
    - _Requirements: 6.1, 6.2_

  - [x] 5.2 Fix the app or update the check
    - If the app is wrong, make the smallest change in presentation code only. Stop and report if it would touch game logic, the play engine, `content/` or the database
    - If the app works, update `apps/game/scripts/browser-check.mjs` and note what changed
    - Leave the Hall scene height and reduced motion checks alone and note in one line each whether the check or the app is out of date
    - _Requirements: 6.3, 6.4, 6.5, 6.6_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Verify
  - [x] 7.1 Typecheck and unit tests
    - Load `.env` into the shell only, never print values
    - Run `pnpm -r typecheck` and `pnpm -r test` once. Update any test that pins the header title markup and list those pins
    - _Requirements: 7.1, 7.2_

  - [x] 7.2 Build, serve and capture screenshots
    - Build and serve atlas and game on ports such as 3500 and 3501
    - Save screenshots at 390x844 and 1280x800 of the atlas header, the game header and a 32 px crop of the tab icon into `.debug/brand-logo/`
    - Report the atlas header height before and after in px
    - _Requirements: 7.3, 7.4_

  - [x] 7.3 Run the game browser check
    - Run `apps/game/scripts/browser-check.mjs` once for the groups keyboard, touch and motion
    - Report pass or fail against the last run (23 passed, 4 failed)
    - _Requirements: 7.5_

  - [x] 7.4 Fetch the assets and stop the servers
    - Fetch `/favicon.ico`, `/icons/favicon-32.png`, `/icons/icon-512.png`, `/game/icons/apple-touch-180.png` and the two `brand/` SVG files from the local build and record status and content type
    - Stop the servers started for this batch and leave ports 3305 and 3306 alone
    - _Requirements: 7.3, 7.6_

- [x] 8. Handover
  - [x] 8.1 Write the handover and the usage entry
    - Write `docs/brand-logo-handover.md`: files replaced, header changes, check results, test pins updated, anything weak
    - Add a short entry to `docs/kiro-usage.md`
    - Make no commit and no push. Report the full list of changed and new files
    - _Requirements: 7.7, 7.8, 7.9_

## Notes

- Every task is required; none is optional.
- Property-based testing does not apply (see design, Testing Strategy).
- The Hall scene height (540 vs 576) and reduced motion ("only the opacity fade runs") failures are judged, not fixed.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1"] },
    { "id": 1, "tasks": ["3.1", "4.1"] },
    { "id": 2, "tasks": ["5.1"] },
    { "id": 3, "tasks": ["5.2"] },
    { "id": 4, "tasks": ["6"] },
    { "id": 5, "tasks": ["7.1"] },
    { "id": 6, "tasks": ["7.2"] },
    { "id": 7, "tasks": ["7.3"] },
    { "id": 8, "tasks": ["7.4"] },
    { "id": 9, "tasks": ["8.1"] }
  ]
}
```
