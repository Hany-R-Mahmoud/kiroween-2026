# Implementation Plan: shell-3-entry-live

## Overview

Language: TypeScript (strict), React 19, plain CSS with logical properties. The plan fixes the two `HoloCard` points from phase 2 first, adds the Catalog strings, moves the atlas home to `/legends`, replaces `/` with the entry page, deletes the lab routes, re-points every link, updates old pins, and ends with exactly one Verify task. No task is optional and no test file is added. No suite runs before Verify.

Boundaries: do not touch game logic, the puzzle generator, the RNG, the play engine, `content/`, `assets/` or the database. Editing `atlasHome()` in `GameHeader.tsx` is allowed because it is a link target. Do not change `git.deploymentEnabled` in any `vercel.json`. Do not hand-edit `routeTree.gen.ts`; the atlas build regenerates it. No multiplayer code, no secret in any file. Do not commit or push.

## Tasks

- [x] 1. Preview as a real image
  - In `skeleton/src/shell/HoloCard.tsx`, when `base` is set render the Preview as `<img className="holo-preview" src={imageUrl(layers.background, base, { axis: 'w', n: 32 })} alt="" aria-hidden="true" decoding="async" fetchPriority="high" draggable={false} />` as the first child of `.holo-art`, before the layer images; when `base` is empty keep the existing `span.holo-preview` with no inline style
  - In `skeleton/src/shell/holoCard.css`, keep the `.holo-preview` blur, scale, gradient and the `data-renderer='webgl'` hiding; add `img.holo-preview` sizing (`inline-size` and `block-size` 100%, `object-fit: cover`, `max-inline-size: none`); no transition
  - Do not add `crossOrigin` to the Preview; do not change the `data-ready` effect
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6_

- [x] 2. Cartouche word readable or hidden
  - In `skeleton/src/shell/holoCard.css`, add `@container (max-inline-size: 320px)` for `.holo-title` with `letter-spacing: 0.08em` and `padding-inline-start: 0.08em`, and `@container (max-inline-size: 200px)` with `display: none`; tokens and logical properties only
  - Leave the front button's `aria-label` and the `.holo-title` markup unchanged
  - The two thresholds are starting values that Verify may tune after measuring the word box
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3. Catalog strings
  - In `apps/atlas/src/i18n/en.ts`, add `shell.entry.links` ("More ways in"), `page.legends` ("All legends · {app}"), `page.legends.description`, `notFound.legends` ("See every legend") and `error.legends` ("See every legend"); change `notFound.home` and `error.home` to "Back to the start"; leave `ar.ts` unchanged
  - Reuse `nav.home`, `nav.play`, `nav.playShort` and `shell.entry.description`; add no other key
  - _Requirements: 7.3, 10.1, 11.6, 11.7_

- [x] 4. Legends page route
  - Create `apps/atlas/src/routes/legends.index.tsx` with `createFileRoute('/legends/')`, the loader `getHome()`, the `heroPreloads` link and the `HomeView` component copied from the current `routes/index.tsx`
  - Add `head`: title from `page.legends` with `{ app: translate('en', 'app.title') }`, description from `page.legends.description`, `og:title`, `og:description`, `og:url` only when the root loader's `publicOrigin` is set (same lookup as `legends.$legendId.tsx`), and a canonical link `/legends` (absolute with `publicOrigin` when set); keep the hero preload links in the same `links` array
  - Do not edit `HomeView`, `LegendList` or `WorldMap`; keep `id="legends"` on the list section
  - _Requirements: 4.1, 4.2, 4.3, 11.6, 11.7, 11.8, 11.9_

- [x] 5. Site header links
  - In `apps/atlas/src/components/SiteHeader.tsx`, change the "All legends" link to `to="/legends"` with `activeOptions={{ exact: true }}`; remove `hash` and `includeHash`; keep the brand `to="/"` and the Play anchor
  - Keep `nav-item`, `min-h-11` and the one-row layout
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6. Game header atlas link
  - In `apps/game/src/components/GameHeader.tsx`, make `atlasHome(atlasOrigin)` return `` `${atlasOrigin.replace(/\/+$/, '')}/legends` `` and update its doc comment; change nothing else in the file or in the game's logic
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 7. Entry page at `/`
  - Rewrite `apps/atlas/src/routes/index.tsx` as the entry page from `routes/lab.shell.tsx`: `createFileRoute('/')`, same component, entrance and hint state, Told `href="/legends"`, True `href="/game/"`
  - `head`: title `shell.entry.title`, description `shell.entry.description`, `og:title`, `og:description`, `og:url` only when `publicOrigin` is set, canonical `/` (absolute with `publicOrigin` when set); no `robots` tag
  - After the hint paragraphs add `<nav className="shell-links" aria-label={t('shell.entry.links')}>` with `<Link to="/legends" className="shell-link">` ("All legends", `nav.home`) and `<a href="/game/" className="shell-link" aria-label={t('nav.play')}>` (`nav.playShort`), always rendered
  - Delete `apps/atlas/src/routes/lab.shell.tsx` and `apps/atlas/src/routes/lab.card.tsx`
  - Do not edit `routeTree.gen.ts`
  - _Requirements: 3.1, 3.2, 3.4, 3.5, 5.1, 5.2, 10.1, 10.2, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 11.5, 13.5_

- [x] 8. Root shell and root error page
  - In `apps/atlas/src/routes/__root.tsx`, replace `CHROMELESS_PATH = '/lab/shell'` with a check `pathname === '/'` (no trailing-slash strip, which would turn `/` into an empty string) and update its comment
  - In `ErrorPage`, keep the plain anchor to `/` with `error.home` and add a plain anchor to `/legends` with `error.legends`, both `inline-flex min-h-11 items-center`
  - Keep the root `head()` title, description, `og:*`, manifest link and `theme-color` unchanged (the manifest test reads this file)
  - _Requirements: 3.3, 7.1, 7.2, 7.3, 7.4, 11.10_

- [x] 9. Not-found and router error links
  - In `apps/atlas/src/components/NotFound.tsx`, render two links in a wrapping row: `Link to="/"` with `notFound.home` and `Link to="/legends"` with `notFound.legends`, each `inline-flex min-h-11 items-center`
  - In `apps/atlas/src/router.tsx`, keep `DefaultError`'s single `Link to="/"` (the `ErrorView` `home` slot takes one node); its text now comes from the changed `error.home`
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 10. Entry page styles
  - In `apps/atlas/src/styles.css`, in `@layer ui`: add `.shell-links` and `.shell-link` (Target_Size, tokens, underline, visible `:focus-visible`), add `--shell-links` to `.shell-page` and subtract it from the card height in the side-by-side rule so there is no vertical scroll at 667x375, 1024x768 and 1280x800
  - Remove the `.lab-card-page` block and its comment; change the entry block comment from `/lab/shell` to `/`
  - Logical properties and tokens only; the entrance animation stays off under `prefers-reduced-motion` and `html[data-motion='reduce']`
  - _Requirements: 10.3, 10.6, 10.7, 14.5_

- [x] 11. Update old pins and check scripts
  - `apps/atlas/test/header.test.tsx`: `nav.home` href `/legends`, the duplicate-href check replaces `href="/legends"`, test title text; if the test router lacks a `/legends` route and the `href` does not render, add it in `apps/atlas/test/helpers/renderInRouter.tsx`
  - `apps/atlas/test/home.test.tsx`: change the `/#legends` wording in the comment only
  - `apps/game/test/header.test.tsx`: atlas link `href` is `/legends`; `atlasHome('https://atlas.example/')` is `https://atlas.example/legends`; the origin assertion is `href="https://atlas.example/legends"`
  - `apps/atlas/scripts/header-check.mjs`: navigate `${BASE}/legends`, Tab order `['/', '/legends', '/game/']`; `apps/atlas/scripts/screens-check.mjs`: home at `${BASE}/legends`; `apps/atlas/scripts/smoke.ts`: home checks fetch `/legends`
  - `README.md`: the atlas line says it owns `/`, `/legends` and `/media`
  - Run `rg` over `apps`, `skeleton` and `README.md` for `atlasHome`, `The atlas`, `/#legends` and `to="/"` and update any other pin found; list every file changed in this task for the handover
  - Do not add a test file
  - _Requirements: 9.1, 14.1, 14.2_

- [x] 12. Verify
  - Build and serve: `pnpm --filter @kiroween/atlas build` (this regenerates `routeTree.gen.ts`), then serve the atlas build on port 3001 with `apps/atlas/scripts/serve-build.mjs`; build and serve the game on its own port with `ATLAS_ORIGIN=http://localhost:3001`; set all variables in the shell only, write no value to any file
  - Run once: `pnpm -r typecheck`, `pnpm -r test`, and `pnpm --filter @kiroween/atlas test:browser -- --base http://localhost:3001 --out .debug/shell-3/book-check.json`; fix any failure this change caused and re-run only what failed
  - Write the throwaway Playwright script in `.debug/shell-3/` with:
    - screenshots at 390x844, 667x375 and 1280x800 of `/`, `/legends`, one Legend_Page, the game hall and the atlas 404; look at them; check no horizontal scroll, no vertical scroll of `/` at 667x375, 1024x768 and 1280x800, the Link_Row below the hint at Target_Size, and the Preview visible on each card
    - click-through: `/` Told to `/legends` to a legend to "Play this legend" to the game world (or its sign-in, recording the reason) to the Game_Header atlas link to `/legends`; and `/` True to `/game/` (the script forwards `/game/**` from the atlas origin to the game server, as the production proxy does)
    - back navigation: from a legend opened from `/legends`, browser back lands on `/legends`; a direct load of a legend records no step through `/`; from a legend, the header brand opens `/` and back returns to the legend, and "All legends" opens `/legends`
    - Hint 2: open one Hint 2 link or `/anchor/<anchor>` and confirm it lands on the chapter
    - slow link: at 390x844 with a 1.2 Mbps throttle and the CDN stand-in from `.debug/shell-2/` (CDN base set in the shell only), a screenshot every 500 ms for the first 3 s of `/`; no card may be a flat box, and each card shows its blurred Preview by the 500 ms shot; also confirm in the request log that the 32 px Preview is requested before or with the layer images
    - Cartouche_Word: `scrollWidth <= clientWidth` or `display: none` at 667x375, 390x844 and 1280x800; tune only the two container-query thresholds from task 2 if needed
    - every internal link on `/`, `/legends` and one Legend_Page returns 200
    - Entry page head: title, description, canonical, `og:*`, no `robots` tag; `/legends` title "All legends · Trick or Told", canonical `/legends`; `/lab/shell` and `/lab/card` answer 404
    - keyboard on `/`: Tab order is skip link, Told, True, All legends, Play
  - `rg` checks: no `/lab/` route, `lab.shell`, `lab.card` or `lab-card` under `apps`, `skeleton` and `README.md`; no `/#legends` link under `apps`, `skeleton` and `README.md`; no `/` or `/lab` rule in `skeleton/src/deploy/vercelRules.ts` and both `vercel.json` files, with `git.deploymentEnabled` unchanged and the `/game` and `/game/**` rules intact
  - Write `docs/shell-3-handover.md`, short: what changed, files touched, link map (old target, new target), check results, test pins updated, the frame fetched twice with the cache off noted as accepted, and anything weak
  - Add a short entry to `docs/kiro-usage.md`
  - Do not commit or push
  - _Requirements: 1.5, 2.5, 9.1, 9.2, 9.3, 9.4, 9.5, 12.1, 12.2, 12.3, 12.4, 13.1, 13.2, 13.3, 13.4, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

## Notes

- There are no test-writing tasks and no optional tasks. The design has no Correctness Properties section, so no property tests apply.
- Tasks 1 and 2 both edit `holoCard.css`, so they run in sequence. Task 1 also edits `HoloCard.tsx`.
- Task 4 copies the current `routes/index.tsx` before task 7 rewrites it, so 4 runs before 7.
- Tasks 7 and 10 are in sequence because the class names come from task 7's markup. Task 8 is the only task that edits `__root.tsx`, task 3 the only one that edits `en.ts`, and task 10 the only one that edits `styles.css`.
- `routeTree.gen.ts` is generated by the build in Verify. Typecheck before that build fails on the new routes, which is why Verify builds first.
- The Told and True cards link with plain anchors (full navigation), as in phase 2.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "3", "4", "5", "6"] },
    { "id": 1, "tasks": ["2", "7", "8", "9"] },
    { "id": 2, "tasks": ["10", "11"] },
    { "id": 3, "tasks": ["12"] }
  ]
}
```
