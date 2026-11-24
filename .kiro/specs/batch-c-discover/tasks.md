# Implementation Plan: batch-c-discover

## Overview

Language: TypeScript (strict), React 19, plain CSS with logical properties and the shared tokens. The plan first changes the strings, the shared share-tag function, `HoloCard`, the layout styles, the favicon and share image scripts, and the sitemap routes; then wires them into the atlas entry page, atlas heads and game heads; then updates old pins; and ends with exactly one Verify task. No task is optional and no test file is added. No suite runs before Verify.

Boundaries: do not touch game logic, the puzzle generator, the RNG, the play engine, `content/`, `assets/` or the database. Editing the game app's head, meta tags, i18n catalog and `noindex` on its sign-in, sign-up, account and 404 pages is allowed because it is not game logic. Never write into `assets/`; the share image script only reads it. Do not change `git.deploymentEnabled` in any `vercel.json`. Do not hand-edit `routeTree.gen.ts`; the atlas build regenerates it. Touch no logical-property rule: use `inline`/`block` properties only. No multiplayer code, no secret in any file. Do not commit or push.

## Tasks

- [x] 1. Atlas Catalog strings
  - In `apps/atlas/src/i18n/en.ts`: set `shell.entry.tagline` to "Twelve legends from around the world. Read them, or play them."; set `shell.entry.description` to "Twelve scary legends from around the world. Read them in the atlas, or play them in the investigation game."; set `shell.entry.hint.pointer` to "Drag or click a card to turn it." and `shell.entry.hint.touch` to "Drag or tap a card to turn it."
  - Delete the keys `shell.entry.links`, `shell.card.turnBack` and `home.listRegion`; keep `nav.home`, `nav.playShort`, `nav.play` (the site header uses them) and leave `shell.card.told.line` and `shell.card.true.line` unchanged
  - Add `share.image.alt` (one plain sentence describing the image: the Told and True cards under the title "Trick or Told"); if `apps/atlas/src/i18n/ar.ts` holds any deleted key, delete it there too; add no other key
  - _Requirements: 2.7, 2.8, 3.3, 4.1, 4.2, 4.4, 7.4_

- [x] 2. Shared share-tag function in the skeleton
  - Create `skeleton/src/seo/share.ts` exporting `SHARE_IMAGE_PATH` (`/og/trick-or-told-1200x630.jpg`), `SHARE_IMAGE_SIZE` (`{ width: 1200, height: 630 }`), the `ShareInput` and `MetaTag` types, and `shareTags(input)` as in the design
  - `shareTags` always returns `og:type` (`website`), `og:site_name`, `twitter:card` (`summary_large_image`), `twitter:title` and `twitter:description` (equal to the given title and description); only when `origin` is non-empty it also returns `og:image`, `og:image:width`, `og:image:height`, `og:image:alt` and `twitter:image`, with the image URL as `origin + SHARE_IMAGE_PATH`; never a relative image URL
  - Export `shareTags`, `SHARE_IMAGE_PATH`, `SHARE_IMAGE_SIZE` and the two types from `skeleton/src/client.ts` (browser-safe, no server import)
  - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.7, 7.9_

- [x] 3. HoloCard: click anywhere on the back turns it back
  - In `skeleton/src/shell/HoloCard.tsx`: add the `onClick` handler on `.holo-back` from the design (return when `event.target` is inside an `a`, else `motionRef.current?.turnBy(-1)`); import the `MouseEvent` type; delete the "Turn back" `button` and `strings.turnBack`; delete `turnBack` from `HoloCardStrings`; leave the Escape handler, `inert` handling and the click-swallow in `motion.ts` as they are
  - In `skeleton/src/shell/holoCard.css`: delete the `.holo-back-actions .btn` rule (keep `.holo-back-actions` for the link) and add `cursor: pointer` on `.holo-back`; check `skeleton/src/shell/index.ts` still compiles (it re-exports the type by name and needs no edit)
  - Do not change `skeleton/src/shell/holo/motion.ts` or `geometry.ts`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 4. Favicon and share image scripts, and their outputs
  - Create `apps/atlas/scripts/make-icons.mjs`: from `apps/atlas/public/icons/icon-512.png` write `apps/atlas/public/icons/favicon-32.png` and `apps/atlas/public/favicon.ico` (16, 32, 48 px PNG images packed with a hand-written ICONDIR and ICONDIRENTRY header, no new dependency); fail clearly if the source is missing
  - Create `apps/atlas/scripts/make-share-image.mjs` per the design: 1200x630 canvas `#0E0B10`, the Told and True cards side by side (each composited from `assets/shell/` background, subject and frame, in that order, same height), "Trick or Told" in IM Fell English SC above them (sharp `text` with the `@fontsource/im-fell-english-sc` font file; fall back to a headless Chrome rendered title layer if sharp cannot load it), JPEG with `mozjpeg`, quality stepped down until under 200 KB, written to a temp file then renamed to `apps/atlas/public/og/trick-or-told-1200x630.jpg`; read `assets/`, never write into it
  - Run both scripts once and keep their outputs; open the JPEG and check by eye that both cards are whole, the title is readable and nothing is clipped; check size and dimensions
  - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4_

- [x] 5. Entry page: no link row, share tags
  - In `apps/atlas/src/routes/index.tsx`: delete the `<nav className="shell-links">` and the unused `Link` import; delete the two `turnBack: t('shell.card.turnBack')` props; in `head`, spread `shareTags({ origin, title, description, imageAlt: translate('en', 'share.image.alt'), siteName: translate('en', 'app.title') })` into `meta` (keep the existing title, description, `og:title`, `og:description`, `og:url`, canonical; add no `robots` tag)
  - Check the new strings show: the tagline, the hints, and the description used for `description`, `og:description` and `twitter:description`
  - _Requirements: 2.7, 3.1, 4.3, 7.1, 7.2, 7.3, 7.5, 10.5_

- [x] 6. Legends page layout and entry page styles
  - In `apps/atlas/src/components/HomeView.tsx`: remove the `home-list-scroll` wrapper (and its `tabIndex`, `role`, `aria-label`); render `<LegendList>` directly in the `#legends` section
  - In `apps/atlas/src/styles.css`: delete the `.home-list-scroll` rule in the 64rem `.home-split` block and both `@layer utilities` blocks headed "Home list rows on desktop" and "List rows"; make `.home-split` one column at every width (delete its 64rem grid); set `.home-map` to `inline-size: 100%; max-inline-size: 46rem; margin-inline: auto`; set `.legend-cards` to `repeat(1, minmax(0, 1fr))`, 2 columns from `40rem` and 3 from `64rem`; add `min-inline-size: 0` on `.legend-card` and `.legend-card-body`; give only the region line (first `p` of `.legend-card-body`) `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`; keep the map's 48rem fit rules
  - In the same file delete `.shell-links` and `.shell-link`, the `--shell-links` custom property and its term in the side-by-side `--shell-card` calc; use tokens and logical properties only, and keep `prefers-reduced-motion` behaviour of the card image hover as it is
  - In `apps/atlas/src/components/LegendList.tsx`: change `CARD_SIZES` to `(min-width: 64rem) 22rem, (min-width: 40rem) 50vw, 100vw`; keep `cardImage()`, `widthCopies`, `loading="lazy"` and the markup
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 3.2, 3.5_

- [x] 7. Sitemap and robots routes
  - Create `apps/atlas/scripts/gen-legend-ids.mjs`: list `content/legends/*.md` (read only), exit non-zero when none, write `apps/atlas/src/seo/legendIds.gen.ts` with a sorted `export const LEGEND_IDS = [...] as const;` and a header comment saying it is generated; run it once and keep the output
  - In `apps/atlas/package.json` change the `build` script to `node scripts/gen-legend-ids.mjs && vite build`
  - Create `apps/atlas/src/seo/sitemap.ts` with pure `sitemapPaths(ids)`, `buildSitemap(origin, paths)` (XML-escaped `<loc>` values) and `buildRobots(origin)`
  - Create `apps/atlas/src/routes/robots[.]txt.ts` (GET, `text/plain; charset=utf-8`, `User-agent: *`, `Allow: /`, no `Disallow` line, a `Sitemap:` line only when `PUBLIC_ORIGIN` is set) and `apps/atlas/src/routes/sitemap[.]xml.ts` (GET, `application/xml; charset=utf-8`, 15 URLs, 404 when `PUBLIC_ORIGIN` is unset); both read `getEnv().publicOrigin` inside the handler and follow `routes/manifest[.]webmanifest.ts`
  - Make no change to `skeleton/src/deploy/vercelRules.ts` or either `vercel.json`
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 11.1, 11.2, 11.3_

- [x] 8. Atlas heads: icons, share tags, canonical, 404 noindex
  - In `apps/atlas/src/routes/__root.tsx`: add the two `rel: 'icon'` links (`/favicon.ico` sizes 48x48 and `/icons/favicon-32.png` type `image/png` sizes 32x32) to `links`
  - In `apps/atlas/src/components/NotFound.tsx`: render `<meta name="robots" content="noindex" />` as the first child of the section
  - In `apps/atlas/src/routes/legends.index.tsx`: spread `shareTags(...)` into `meta` with the page's own title and description (keep `og:title`, `og:description`, `og:url`, canonical and hero preloads)
  - In `apps/atlas/src/routes/legends.$legendId.tsx`: in both branches (legend and Keeper's Note) add `shareTags(...)` with the page's own title and description, add a canonical link `${origin}${legendUrl(id)}` to `links` (relative when `origin` is empty), and remove the hero `og:image` line; drop the `assetUrl` import if it becomes unused
  - _Requirements: 5.4, 6.5, 7.1, 7.2, 7.3, 7.5, 7.6, 7.7, 10.1, 10.2, 10.4, 10.5_

- [x] 9. Game heads: icons, share tags, canonical, noindex
  - In `apps/game/src/i18n/en.ts` add `hall.description` (one sentence about the investigation game) and `share.image.alt` (same sentence as the atlas key); add no other key
  - In `apps/game/src/routes/__root.tsx`: add the two icon links as absolute root paths (`/favicon.ico`, `/icons/favicon-32.png`, which the atlas serves on the same domain); add `<meta name="robots" content="noindex" />` to the game's `NotFound` component
  - In `apps/game/src/routes/index.tsx`: add `head: ({ matches }) =>` that reads `mediaBase` from `matches[0].loaderData` as the origin and returns the title (`app.title`), `description` and `og:*` from `hall.description`, `shareTags(...)` and a canonical link `${origin}/game/` (`/game/` when the origin is empty); add no `robots` tag
  - In `apps/game/src/routes/sign-in.tsx`, `sign-up.tsx` and `account.tsx` add `head: () => ({ meta: [{ name: 'robots', content: 'noindex' }] })` to each `createFileRoute` options object
  - Touch no file under `apps/game/src/server/`, `lib/`, or any play, hotspot, world or puzzle component
  - _Requirements: 5.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.8, 10.1, 10.3, 10.4, 10.5_

- [x] 10. Update existing pins
  - Search `apps/atlas/test`, `apps/atlas/scripts`, `apps/game/test`, `apps/game/scripts`, `skeleton/test` and `skeleton/src` for pins on: the "Turn back" button or `turnBack`, the `shell-links` row or "More ways in", the old tagline ("Read them, then prove you did"), the old description, the old hint lines ("tap to flip"), the `home-list-scroll` region, the list-row layout (hidden image or hook line, one column), `home.listRegion`, and the legend `og:image` hero URL (`apps/atlas/scripts/smoke.ts` line about `/media/<id>/atlas/<id>-atlas-hero-01.webp`)
  - Update each one to the new behaviour (for the smoke check: `og:image` equals `<origin>/og/trick-or-told-1200x630.jpg`); delete a pin only when what it checked is gone; write no new test file and keep a list of every changed pin (file and line) for the handover
  - _Requirements: 12.1, 12.2, 12.3_

- [x] 11. Verify
  - Load `.env` into the shell only (the same way as the last Verify; never print or write a value). Build with `pnpm --filter @kiroween/atlas build` (this runs the legend id generator and regenerates `routeTree.gen.ts`) and the game build; serve the atlas on port 3001 with `apps/atlas/scripts/serve-build.mjs` and the game on its own port with `ATLAS_ORIGIN` set, behind the same throwaway proxy that forwards `/game/**` as in `.debug/shell-3/`; set `PUBLIC_ORIGIN` in the shell to the local origin for the tag and sitemap checks, and run the tag and sitemap checks once more with it unset
  - Run once: `pnpm -r typecheck`, `pnpm -r test`, and `pnpm --filter @kiroween/atlas test:browser -- --base http://localhost:3001 --out .debug/batch-c/book-check.json`; fix any failure this change caused and re-run only what failed
  - Write the throwaway Playwright script in `.debug/batch-c/` with:
    - screenshots at 390x844, 768x1024 and 1280x800 of `/`, `/legends` (full page) and the back face of each card; look at them: the image cards show with 1, 2 and 3 columns, the list sits under the map, no inner scroll box, no horizontal scroll, the map is the same size as before at 1280, the cards and hint still fit the first screen of `/` at 390x844, 667x375, 1024x768 and 1280x800
    - flip: click the front turns to the back; click an empty area of the back turns to the front; click the back link navigates and does not flip; a drag on the back turns by drag and does not flip back by click; Escape on the back returns to the front; the "Turn back" button is not in the DOM; Tab on the back reaches only the link; repeat the empty-area click with `prefers-reduced-motion: reduce`
    - tab order on `/`: skip link, Told, True; no `.shell-links` or link row in the DOM
    - `/favicon.ico` (contains 16, 32 and 48 px images), `/icons/favicon-32.png`, `/robots.txt`, `/sitemap.xml` and `/og/trick-or-told-1200x630.jpg` answer 200 with the right content type; the JPEG is 1200x630 and under 200 KB; the sitemap parses and holds exactly the 15 expected URLs, none under `/anchor/`, sign-in, sign-up or account; `robots.txt` has `User-agent: *`, `Allow: /` and the absolute `Sitemap:` line, and no `Disallow` line; with `PUBLIC_ORIGIN` unset, `/sitemap.xml` is 404, the `Sitemap:` line and the absolute image tags are absent and no relative image URL is written
    - head tags on `/`, `/legends`, one legend page and `/game/`: title, description, canonical, `og:title`, `og:description`, and all Share_Tags with the right values; canonical on `/game/` and the legend page; `twitter:title` and `twitter:description` equal the `og:` pair; `robots` absent on these four pages; the icon links on an atlas page and on `/game/`
    - `noindex` present on `/game/sign-in`, `/game/sign-up`, `/game/account` and on the 404 page of both apps (read `document.head` after hydration and in the raw HTML; record the result for each)
    - every internal link on `/legends` returns 200
  - `rg` checks: no `home-list-scroll`, `shell-links`, `shell-link`, `turnBack`, `shell.entry.links` or `home.listRegion` under `apps`, `skeleton` and `README.md` (excluding build output); `git diff` shows no change in `content/`, `assets/`, `apps/game/src/server`, the generator, the play engine or the database code, and no change in either `vercel.json` or `skeleton/src/deploy/vercelRules.ts`; `git.deploymentEnabled` unchanged
  - Write `docs/batch-c-handover.md`, short: what changed, files touched, check results, test pins updated (from task 10), the share image attached (embed or link `apps/atlas/public/og/trick-or-told-1200x630.jpg`) and anything weak (robots.txt has no `Disallow`, so `noindex` alone keeps the three game pages out; the font path used for the title; the 404 `noindex` source, hoisted meta or head)
  - Add a short entry to `docs/kiro-usage.md`
  - Do not commit or push
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.8, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.4, 3.5, 5.1, 5.4, 5.5, 6.1, 6.5, 7.1, 7.7, 8.1, 8.3, 8.4, 9.1, 9.5, 10.3, 10.4, 11.1, 11.2, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9, 13.10_

- [x] 12. robots.txt: remove the Disallow lines
  - In `apps/atlas/src/seo/sitemap.ts` (`buildRobots`) remove the three `Disallow` lines (`/game/sign-in`, `/game/sign-up`, `/game/account`); keep `User-agent: *`, `Allow: /` and the `Sitemap:` line (only when `PUBLIC_ORIGIN` is set); the `noindex` meta on those pages is what keeps them out of search
  - Update any existing pin on those `Disallow` lines; add no test file
  - _Requirements: 9.1, 9.2, 10.3_

- [x] 13. Tagline on one line
  - In `apps/atlas/src/styles.css` find which parent shrinks `.shell-tagline` below its `max-inline-size: 48ch` at 1280x800 (it wraps to about 215 px) and fix it so the tagline is one line from 40rem up and wraps balanced (`text-wrap: balance`) on phones; do not change the card size or any card sizing variable
  - Logical properties and tokens only
  - _Requirements: 3.1, 3.5_

- [x] 14. Game hall: share image and canonical from PUBLIC_ORIGIN
  - In `apps/game/src/server/env.ts` add an optional `PUBLIC_ORIGIN`, validated exactly like the atlas's (https origin, or `http://localhost` with an optional port, no path; empty allowed)
  - Return it from the game root loader as a new field `siteOrigin` next to `mediaBase`; do not change `mediaBase` or any place that uses it
  - In `apps/game/src/routes/index.tsx` the hall `head` uses `siteOrigin` for `shareTags` and the canonical; when empty, leave out the image tags and the canonical link (never a relative one)
  - Add `PUBLIC_ORIGIN=` (no value) to the game section of `.env.example` and one line in the README env table if there is one
  - Touch no game logic, `vercel.json`, `git.deploymentEnabled`, `content/`, `assets/` or the database; add no test file
  - _Requirements: 7.1, 7.3, 7.8, 10.1_

## Notes

- There are no test-writing tasks and no optional tasks. The design has no Correctness Properties section, so no property tests apply.
- File ownership, so tasks that share a file run in sequence: `apps/atlas/src/i18n/en.ts` only in task 1; `HoloCard.tsx` and `holoCard.css` only in task 3; `apps/atlas/src/styles.css`, `HomeView.tsx` and `LegendList.tsx` only in task 6; `apps/atlas/package.json` only in task 7; `__root.tsx`, `NotFound.tsx`, `legends.index.tsx` and `legends.$legendId.tsx` (atlas) only in task 8; `apps/atlas/src/routes/index.tsx` only in task 5; game files only in task 9.
- Task 5 needs task 1 (keys), task 2 (`shareTags`) and task 3 (the `turnBack` field is gone). Tasks 8 and 9 need task 2. Task 10 comes after every code task so its search sees the final code.
- `routeTree.gen.ts` is generated by the build in Verify. Typecheck before that build fails on the two new routes, which is why Verify builds first.
- No suite runs before Verify; tasks 4 and 7 run only their own generator scripts.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2", "3", "4", "6", "7"] },
    { "id": 1, "tasks": ["5", "8", "9"] },
    { "id": 2, "tasks": ["10"] },
    { "id": 3, "tasks": ["11"] },
    { "id": 4, "tasks": ["12"] },
    { "id": 5, "tasks": ["13"] },
    { "id": 6, "tasks": ["14"] }
  ]
}
```
