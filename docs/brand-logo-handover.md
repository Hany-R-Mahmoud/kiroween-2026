# Brand logo handover

Spec: `.kiro/specs/brand-logo/`.

## What changed
- **Icons replaced.** Atlas: `favicon.ico` and 5 PNGs in `public/icons/` (apple-touch-180, favicon-32, icon-192, icon-512, icon-maskable-512). Game: 4 PNGs in `public/icons/` and a new `favicon-32.png`, because the game's link tag pointed at a missing file.
- **Masters.** `docs/brand/` holds the brand masters and a README. Copies are served from `apps/atlas/public/brand/` and `apps/game/public/brand/`.
- **Atlas header.** Wordmark `<img>` 52x32 inside the fixed 56px header, `alt` = `app.title` (`SiteHeader.tsx`). The `header.test.tsx` helper now reads the img `alt`.
- **Game header.** `icon-small-gold.svg` at 20px, `aria-hidden`, before the text title (`GameHeader.tsx`), served from `/game/brand/`.
- **Unchanged.** Entry page and og image.

## Header height
56px before (inferred from `--app-header-h` 3.5rem, not measured on the baseline) and 56px after (measured, both apps, both sizes).

## Checks
- `pnpm -r typecheck`: pass.
- Tests: skeleton 916 passed + 8 expected fail; atlas 306; game 401.
- Browser check (keyboard, touch, motion): 35 passed, 2 failed. The last run was 23/4. The counts are not like-for-like because the keyboard flow used to stop early.
- Two checks were stale and fixed in `apps/game/scripts/browser-check.mjs` only:
  - Candle tap now re-reads the tutorial viewport rect (it reused the Hall rect).
  - Keyboard flow: a door Enter opens a door panel with a "Start in the study" button. Hint 1 reads `.hint-area .hint-sheet`. Hint 2 uses `.hint-area` and `a[data-hint2-link]`. Tabs go through a new `showTab` helper. The win-screen back button is scoped to `.world-ending`.
  - The app was correct for real players in every case.
- Remaining 2 failures:
  - Hall scene height 540 vs 576. The check is out of date: `scene.css` uses `clamp(18rem,64dvh,40rem)`.
  - Reduced motion "only the opacity fade runs" returns `[]`. The check looks out of date (Batch A `ui.css` switches animations off). Not confirmed.

## Asset fetches (local)
- Atlas `/favicon.ico`: 200 `image/x-icon`. `/brand/wordmark-gold.svg`: 200 `image/svg+xml`.
- Game icons: 200 `image/png`. Game brand: 200 `image/svg+xml`.
- Atlas `/icons/favicon-32.png` and `/icons/icon-512.png`: 200 `application/octet-stream` from the local `serve-build.mjs`. Check the type on Vercel.

## Weak points
- The git index still holds staged Batch E work mixed with these edits (`browser-check.mjs` is `MM`). Stage selectively.
- Screenshots are in `.debug/brand-logo/`; only some were viewed.
- No secrets. No commits or pushes.

## Files from `git status`
Brand-logo changes:
- `apps/atlas/public/favicon.ico`
- `apps/atlas/public/icons/apple-touch-180.png`, `favicon-32.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`
- `apps/atlas/src/components/SiteHeader.tsx`
- `apps/atlas/test/header.test.tsx`
- `apps/game/public/icons/apple-touch-180.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`
- `apps/game/src/components/GameHeader.tsx`
- `apps/game/scripts/browser-check.mjs` (also holds staged Batch E edits)
- New: `.kiro/specs/brand-logo/`, `apps/atlas/public/brand/`, `apps/game/public/brand/`, `apps/game/public/icons/favicon-32.png`, `docs/brand/`, `docs/brand-logo-handover.md`
- `docs/kiro-usage.md` (this entry; also holds a staged Batch E entry)

Staged Batch E work (not brand-logo):
- `.kiro/specs/batch-e-feel/*`
- `apps/atlas/src/i18n/en.ts`, `routeTree.gen.ts`, `routes/__root.tsx`, `routes/index.tsx`, `routes/llms[.]txt.ts`, `seo/llms.ts`, `styles.css`, `test/llms.test.ts`
- `apps/game/src/components/FearOverlay.tsx`, `Hall.tsx`, `TutorialRoom.tsx`, `fear.css`, `i18n/en.ts`, `layout/fearEvents.ts`, `routes/world.$target.tsx`
- `docs/batch-e-handover.md`
- `skeleton/src/book/Book.tsx`, `book.css`
