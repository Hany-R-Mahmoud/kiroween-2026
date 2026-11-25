# Requirements Document

## Introduction

The owner chose a new logo. The art is finished and lives outside the repo in `../kiroween-review-2026-11-24/icons/final/` (relative to the repo root). This batch installs it: new icons in both apps, master files in `docs/brand/`, a wordmark in the atlas header and a small icon in the game header. It also settles two failing game browser checks. The art is not redrawn or changed.

The logo shows TRICK on top, a line, and TOLD upside down below, like a playing card. The I of TRICK is a keyhole. The icon shows a T at top left and a turned T at bottom right. Colours are gold `#e0a84b` on `#0e0b10`, the existing `--color-accent` and `--color-bg`.

Source files in `icons/final/`:
- `public/favicon.ico` (16, 32, 48 px) and `public/icons/` with `favicon-32.png`, `apple-touch-180.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`.
- `svg/` with `wordmark-gold.svg` (transparent, for dark headers), `wordmark-gold-on-dark.svg`, `wordmark-black.svg`, `wordmark-white.svg`, `icon-any.svg`, `icon-rounded.svg`, `icon-maskable.svg`, `icon-small.svg`, `icon-black.svg`.

Out of scope and protected: game logic, the play engine, `content/`, `assets/` and the database. The share image `og/trick-or-told-1200x630.jpg`, the entry page `/`, file names, link tags and manifests stay unchanged. Two older browser check failures (Hall scene height 540 vs 576, reduced motion "only the opacity fade runs") are not fixed here.

## Glossary

- **Atlas**: the public app in `apps/atlas`, named "Trick or Told".
- **Game**: the point-and-click app in `apps/game`, named "Trick or True".
- **Final_Icons**: the art in `../kiroween-review-2026-11-24/icons/final/`.
- **Icon_Files**: `favicon.ico` and the PNG files under `public/icons/` of an app.
- **Master_Files**: the SVG files copied to `docs/brand/`.
- **Atlas_Header**: the header in `apps/atlas/src/components/SiteHeader.tsx`.
- **Game_Header**: the header of the Game that shows the text title.
- **Wordmark**: `wordmark-gold.svg`.
- **Small_Icon**: a copy of `icon-small.svg` with the dark background rect removed and nothing else changed.
- **Browser_Check**: `apps/game/scripts/browser-check.mjs`.
- **Verify_Task**: the final task that runs the checks and writes the handover.

## Requirements

### Requirement 1: Icons replaced

**User Story:** As a visitor, I want the new logo in the browser tab and on my home screen, so that the product looks consistent.

#### Acceptance Criteria

1. THE System SHALL replace `apps/atlas/public/favicon.ico` and the five PNG files in `apps/atlas/public/icons/` with the same-named Final_Icons files.
2. THE System SHALL replace the four PNG files that exist in `apps/game/public/icons/` with the same-named Final_Icons files.
3. WHERE the Game links `favicon-32.png` from `apps/game/public/icons/`, THE System SHALL replace that file as well.
4. THE System SHALL keep every file name, link tag and manifest entry unchanged, including manifest 192 and 512 entries that have no `purpose`.
5. THE System SHALL keep the Final_Icons art unchanged.

### Requirement 2: Master files

**User Story:** As the maintainer, I want the logo masters in the repo, so that nobody has to hunt for the originals.

#### Acceptance Criteria

1. THE System SHALL copy the nine files of `svg/` unchanged to `docs/brand/`.
2. THE System SHALL add `docs/brand/README.md` that states what each file is for and the two colours `#e0a84b` and `#0e0b10`.
3. THE README SHALL state: do not stretch, recolour outside these files, or redraw.

### Requirement 3: Atlas header wordmark

**User Story:** As an atlas reader, I want the wordmark in the header, so that the brand is visible on every page.

#### Acceptance Criteria

1. THE Atlas SHALL serve the Wordmark from `apps/atlas/public/brand/wordmark-gold.svg`.
2. THE Atlas_Header home link SHALL show the Wordmark image in place of the text title, between 32 and 36 px high.
3. THE Atlas_Header SHALL keep its current height.
4. THE home link SHALL keep the accessible name "Trick or Told", taken from the `app.title` text.
5. THE home link SHALL keep its visible focus style.

### Requirement 4: Game header icon

**User Story:** As a player, I want a small brand mark next to the game title, so that the game is tied to the atlas brand.

#### Acceptance Criteria

1. THE Game SHALL keep the name "Trick or True" and the text title in the Game_Header.
2. THE Game SHALL serve the Small_Icon from `apps/game/public/brand/`.
3. THE Game_Header SHALL show the Small_Icon before the title, about 20 px high, with `aria-hidden="true"`.
4. THE Small_Icon SHALL differ from `icon-small.svg` only by the removed background rect.

### Requirement 5: Unchanged surfaces

**User Story:** As the owner, I want only the approved places to change.

#### Acceptance Criteria

1. THE Atlas Entry_Page `/` SHALL keep its `h1` and show no wordmark.
2. THE System SHALL leave `og/trick-or-told-1200x630.jpg` unchanged.

### Requirement 6: Tutorial tap and keyboard checks

**User Story:** As the maintainer, I want to know whether two failing checks point at a real bug or a stale check.

#### Acceptance Criteria

1. WHEN the check "tutorial: a tap on the candle lights it" is investigated, THE System SHALL reproduce it by hand in a real browser at 390x844 with touch emulation and record whether the tap lights the candle and opens the panel.
2. WHEN the keyboard flow check is investigated, THE System SHALL reproduce it by hand using only the keyboard from the Hall into the tutorial.
3. IF the app is wrong, THEN THE System SHALL fix it with the smallest change in presentation code only.
4. IF the app works and the check is stale, THEN THE System SHALL update `apps/game/scripts/browser-check.mjs` and record what changed.
5. IF a fix would touch game logic, the play engine, `content/` or the database, THEN THE System SHALL stop and report.
6. THE System SHALL leave the Hall scene height check (540 vs 576) and the reduced motion check unchanged, and SHALL state in one line each whether the check or the app is out of date.

### Requirement 7: Verification and handover

**User Story:** As the owner, I want evidence and a short handover, so that I can review without rerunning anything.

#### Acceptance Criteria

1. THE Verify_Task SHALL load `.env` into the shell only and print or write no value from it.
2. THE Verify_Task SHALL run `pnpm -r typecheck` and `pnpm -r test` once, update any test that pins the header title markup, and list those pins.
3. THE Verify_Task SHALL build and serve both apps locally on ports other than 3305 and 3306, and stop them afterwards.
4. THE Verify_Task SHALL save screenshots at 390x844 and 1280x800 of the Atlas_Header, the Game_Header and a 32 px crop of the browser tab icon into `.debug/brand-logo/`, and report the Atlas_Header height before and after in px.
5. THE Verify_Task SHALL run the Browser_Check once for the groups keyboard, touch and motion, and report pass or fail against the last run of 23 passed and 4 failed.
6. THE Verify_Task SHALL fetch `/favicon.ico`, `/icons/favicon-32.png`, `/icons/icon-512.png`, `/game/icons/apple-touch-180.png` and the two `brand/` SVG files from the local build and record status and content type.
7. THE System SHALL write `docs/brand-logo-handover.md` with files replaced, header changes, check results, test pins updated and anything weak.
8. THE System SHALL add a short entry to `docs/kiro-usage.md`.
9. THE System SHALL make no commit and no push, and SHALL report the full list of changed and new files.
10. IF execution is blocked, THEN THE System SHALL stop and report the blocker.
