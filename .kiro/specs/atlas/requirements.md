# Requirements: atlas (Phase 3)

Scope: the public atlas app, the skeleton functions it and the game share (`atlasUrl`, `assetUrl`), and two small changes in `apps/game`. No game play, no deployment. Source documents: `docs/phase-2-handover.md`, `docs/tech-decisions.md`, `docs/planning/01-decisions.md` (decisions 4, 7, 9, 18 to 26, 29), `content/legend-format.md` (sections 0 to 4, 8, 9, 10), the "Atlas shell" section of `content/hub-and-tutorial.md`, the steering files, `docs/planning/12-kiro-phase-3.md`.

## Decisions taken by the owner (requirements approval)

1. **Alt text** is built from stored text, for example "Illustration for chapter 3: \<chapter title\>". A real alt-text column comes later from content.
2. **The home list is grouped by continent.** Each legend's continent is worked out from its `map_point` with the Natural Earth data.
3. **`ATLAS_ORIGIN`** is an optional variable for the game: empty in production, `http://localhost:3001` locally. It is validated as an http(s) origin and used only to build links.
4. **Versions keep the file's order.** `versions` gets an `ordinal` column, the importer writes it, and one `db:import` runs on `dev-skeleton-core`. Runs are unaffected because they have no foreign keys. The migration SQL is shown in the design before it is applied.
5. **Map pin notes stay out.** They go to the content backlog.
6. **impeccable** (the available skill) does the design and accessibility review that the prompt calls agent-impeccable. The work stays in this chat.
7. **The Keeper's Note** (`content/keepers-note.md`) exists now, but stays out of Phase 3. It is imported with the tutorial in Phase 4. The work does not touch or read it.
8. **Design approval changes (owner).** (a) `PUBLIC_ORIGIN` for Open Graph URLs, as in R9.1. (b) If the Console's Reset password does not work for a role created with SQL, the fallback is psql's `\password atlas_web`, which sends only the hash. A literal password in `ALTER ROLE` is never suggested.

## Facts that shape the design (read from the content, the database schema and current docs)

1. **Stored content.** Phase 1 put these on `dev-skeleton-core`: `legends` (meta, cold open, closing paragraph, `theme` jsonb, plus game-only columns and the `model` snapshot), `chapters` (with `ordinal`), `versions` (no order column), `documented_told` (with `ordinal`), `sources`, `assets`, `anchors`. The hub and shared assets (`shared-atlas-hero-01`, `shared-atlas-map-01`) are not in the database: `content/hub-and-tutorial.md` is not imported.
2. **Theme packs are free text.** `theme.palette` is one string of `role #hex (description)` pairs, written with and without backticks. Every pack has `background`, `surface`, `ink`, `accent`, `danger` and `glow`; extra roles vary (`secondary` twice, `muted`, `cold`, `thread`, `shadow`). Font fields also carry notes and fallbacks, for example "Bad Script (Google Fonts, cursive with Cyrillic support); fallback Marck Script". For naddaha, the body field names two fonts: Noto Naskh Arabic for Arabic names, and Crimson Pro for English body text.
3. **Fonts.** The packs name 17 Google Fonts families, all of them OFL. Three legends use non-Latin script in their text: baba-yaga uses Cyrillic, gumiho uses Hangul and Han, and naddaha uses Arabic. To load only what a page needs, the fonts must come in `unicode-range` subsets.
4. **Asset `usage` values are labels, not alt text.** They read "atlas hero", "ch-1 illustration", "Map marker" and so on.
5. **Asset folders.** Assets live under `assets/<legend-id>/<surface>/<asset-id>.webp`, `assets/hub/` for `hub-*` and `tutorial-*`, and `assets/shared/` for `shared-*`. There are 423 WebP files, 74 MB. Every legend has a marker image. For banshee and jersey-devil it sits on the `shared` surface (`banshee-shared-marker-01`), for the others on `atlas`. naddaha has 6 chapters and 6 chapter plates; the others have 7 of each.
6. **Asset sizes** are text such as "2400x1350 (16:9)", "16:9, 2400×1350" or "Square, 512×512". Both `x` and `×` occur.
7. **Story text** has Markdown italics (`*bean sí*`) and paragraphs. `[Dramatization]` appears inside the text: 1 to 3 times per legend, in cold opens and chapters.
8. **Anchors.** Each legend has `<id>--ch-<n>` for every chapter, `<id>--versions`, and `<id>--versions--<version-id>` for each version (11 to 13 per legend). The tutorial's Hint 2 anchor `keepers-note--ch-1` belongs to content that does not exist yet (Phase 4).
9. **Neon roles.** Roles made with the Neon Console, API or CLI (and the MCP's `create_postgres_role`) get `neon_superuser`. A limited role must be made with SQL, and a role that can log in needs its password inside that SQL (Neon docs, "Manage database access"). The work must never handle a password, so the login role is the owner's step (see R2).
10. **Map data.** Natural Earth vector data is public domain; no permission is needed and credit is optional ("Made with Natural Earth"; naturalearthdata.com terms of use). An equirectangular projection (x from longitude, y from latitude) needs no map library.
11. **Versions today:** `@tanstack/react-start` 1.169.7 on npm; the game is pinned to 1.169.5.
12. **Regions are free text** such as "Ireland (island-wide belief; strongest tellings in Munster and Leinster)". No two legends share a region string.

## Glossary

- **Legend page**: `/legends/<legend-id>`, one legend's full documentary.
- **Anchor**: a stored deep-link target such as `banshee--ch-3`. It is an element id on the legend page.
- **Theme**: a legend's theme pack, applied only on its own legend page.
- **Base tokens**: the hub palette and fonts in `skeleton/src/design/tokens.css`.
- **Reader role**: the Postgres role the atlas connects with. It can only SELECT.

## R1. Atlas app

1. `apps/atlas` SHALL be a TanStack Start app (React, TypeScript `strict`, Tailwind) that imports `@kiroween/skeleton`, using the same pinned versions as `apps/game`.
2. THE atlas SHALL own the root path `/`. It SHALL NOT serve any page, route, file or redirect under `/game` or `/game/`. A request there SHALL get the atlas 404.
3. THE atlas SHALL be public and contain no auth code. Neither of its bundles SHALL contain an auth package or the game's variable names (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AUTH_*`). Its client bundle SHALL also contain no variable names at all. Only the atlas server may name `ATLAS_DATABASE_URL` and `FEATURE_ARABIC`.
4. THE atlas SHALL be mobile-first, work well on desktop, and use the base tokens from the skeleton without redefining them.
5. UI strings SHALL come from a translation catalog by key (`i18n-rtl.md`). Story text SHALL come from the database.

## R2. Content from Neon (decision 21)

1. THE atlas SHALL read only the tables and columns it shows: the display columns of `legends` and the rows of `chapters`, `versions`, `documented_told`, `sources`, `assets` and `anchors`. It SHALL NOT read `runs`, `neon_auth`, the game tables (`facts`, `leads`, `hotspots`, `puzzle_slots` and so on) or the `legends.model`, `final_puzzle`, `setting` or `spirit` columns.
2. THE reader role SHALL have SELECT on exactly what R2.1 lists, granted per table and per column, and nothing else. It SHALL NOT have INSERT, UPDATE, DELETE, CREATE or access to other schemas.
3. THE work SHALL create the privileges on `dev-skeleton-core` through the Neon MCP as a role that cannot log in (`NOLOGIN`, no password). The work SHALL then give the owner one SQL statement to run in the Neon SQL Editor. The statement creates a login role inside that role, and the owner types the password. The work SHALL then STOP and ask the owner to add the connection string to `.env` as `ATLAS_DATABASE_URL`. No secret value SHALL be read, printed or written by the work. `.env` SHALL never be opened.
4. THE atlas server SHALL connect only with `ATLAS_DATABASE_URL`. An error SHALL name the variable and never its value.
5. Every query SHALL be parameterized. Any value from the URL SHALL be validated before it reaches a query.
6. THE only schema change SHALL be an `ordinal` column on `versions` (owner decision 4).
   - The importer SHALL write each version's position in the legend file, from 1.
   - The migration SQL SHALL be shown in the design and applied only after approval, and only to `dev-skeleton-core`.
   - Then exactly one `db:import` SHALL run there.
   - Phase 1's import tests SHALL be updated for the new column. The parser, generator and audit SHALL not change.
   - IF the design needs any other schema change, THE work SHALL stop and ask.
7. A database error SHALL show a fixed, friendly error page and never a driver message, SQL or host.

## R3. Home

1. THE home page SHALL show the atlas hero image (`shared-atlas-hero-01`), a world map with one marker per legend, and a list of every legend grouped by continent. Each legend's continent SHALL be the Natural Earth continent of the country that contains its `map_point`; for a point at sea, the nearest country's. Groups SHALL be in a fixed order and legends sorted by title inside each group. The region string SHALL show on each item.
2. THE list SHALL be the accessible way in. It SHALL work without the map, by keyboard and with a screen reader, and on narrow screens.
3. THE map SHALL be geographically honest. Markers SHALL be placed from `map_point` on a real world outline from Natural Earth data, in an equirectangular projection. THE painted map (`shared-atlas-map-01`) MAY appear only as decoration and SHALL NOT be used to place markers.
4. Each marker SHALL be a keyboard-reachable button with an accessible name. It SHALL open a card with the title, region, era, scare level, reading time, `one_line_hook` and a link to the legend page. THE card SHALL close with Escape and return focus to its marker.
5. Touch targets SHALL be at least 44 px.
6. THE map data source and its licence SHALL be recorded for the README.

## R4. Legend page

1. `/legends/<legend-id>` SHALL show, in order: the hero image, title and meta; the cold open; chapters 1 to N, each with its chapter plate, title, text and hook; the versions section, with every version's source type, era, claim, conflicts, source and paragraph, in the file's order (`versions.ordinal`); the "What is documented, and what is told" table and its closing paragraph; and the sources list.
2. Every `[Dramatization]` in the text SHALL be shown as a visible label that is not only colour.
3. Story text SHALL render paragraphs and Markdown italics only. No stored text SHALL be rendered as HTML.
4. Sources SHALL show title, author and year. They SHALL link out when a URL exists, with `rel="noopener noreferrer"`.
5. Every image SHALL have alt text built from stored text (owner decision 1). A chapter plate SHALL read "Illustration for chapter \<n\>: \<chapter title\>", the hero "\<legend title\>: hero illustration", and a map marker "\<legend title\>". The patterns SHALL come from the translation catalog. The painted map used as decoration SHALL have `alt=""`.
6. An unknown or malformed legend id SHALL give the 404 page, and the id SHALL be validated before any query.

## R5. Deep links (decision 9)

1. Every stored anchor of a legend SHALL be the id of exactly one element on its legend page: chapter anchors on the chapter section, `<id>--versions` on the versions section, and `<id>--versions--<v>` on that version.
2. THE URL of an anchor SHALL be `/legends/<legend-id>#<anchor>`.
3. `/anchor/<anchor>` SHALL redirect to that URL when the anchor is stored. It SHALL return the 404 page when it is unknown. It SHALL check the anchor's format before any query, and a malformed anchor SHALL get the 404 page without a query.
4. THE skeleton SHALL export one pure function `atlasUrl(anchor)` that returns that URL as a root-relative path and throws on a malformed anchor. The game will call it in Phase 4.
5. Landing on an anchor, by load or by in-page link, SHALL scroll to it, move keyboard focus to its heading and briefly highlight it. With `prefers-reduced-motion: reduce` there SHALL be no smooth scroll and no animated highlight; a static highlight is fine.

## R6. Theme packs (decision 24)

1. Each legend page SHALL use its own theme: the palette roles as CSS custom properties scoped to that page, and its display and body fonts. Theme values SHALL be read from `legends.theme`, never invented (`design.md`).
2. Font files SHALL be self-hosted (no third-party font CDN), in `unicode-range` subsets, with `font-display: swap`. Only the fonts of the page being viewed SHALL be loaded.
3. For every theme, THE work SHALL check WCAG AA contrast (4.5:1) for body text (`ink`) and links (`accent`) against `background` and `surface`. Where a pair fails, that role SHALL use the base token on that page, and the fallback SHALL be recorded. No page SHALL ship text below AA.
4. Each page's theme SHALL also give the browser's theme colour and stay inside the shared brush and grain look (`design.md`).

## R7. Images

1. THE WebP files under `assets/` SHALL be served for both apps from one URL prefix that does not clash with either app's build files. The files SHALL not be copied or changed in the repo.
2. THE skeleton SHALL export one pure function `assetUrl(assetId)` that maps an asset id to its path using the folder rule in `assets/README.md`, and throws on an id that does not fit the rule.
3. Every image SHALL have `width` and `height`.
4. THE hero image SHALL load first, with high fetch priority. Every image below it SHALL load lazily.
5. THE server that serves the files SHALL serve only `.webp` files under `assets/`, by validated path. No path traversal SHALL be possible.

## R8. Arabic flag (decision 26)

1. THE atlas SHALL use the same `FEATURE_ARABIC` rule as the game, through the skeleton's `resolveLocale`. The root SHALL set `lang` and `dir`.
2. CSS SHALL use logical properties only. Story text SHALL stay English, and missing Arabic UI strings SHALL fall back to English per key.

## R9. Page basics

1. Every page SHALL have a title and a meta description. A legend page's description SHALL be its `one_line_hook`.
   - Its Open Graph image SHALL be its hero.
   - Absolute Open Graph URLs (`og:image`, `og:url`) SHALL be built only from the optional `PUBLIC_ORIGIN`, never from the request's `Host` header.
   - `PUBLIC_ORIGIN` SHALL be an `https:` origin, or `http://localhost` with an optional port, with no path, query or fragment.
   - When it is empty, `og:image` and `og:url` SHALL be left out.
2. Every page SHALL have one `h1`, landmarks (`header`, `nav`, `main`, `footer`), a skip link and a visible focus style.
3. THE atlas SHALL have a not-found page.

## R10. Changes in `apps/game` (only these two)

1. THE game SHALL get a not-found page (`notFoundComponent` on the root route).
2. Each hall door SHALL link to that legend's atlas page, open or locked (the atlas is open to everyone). The tutorial door is unchanged.
   - THE link SHALL be `ATLAS_ORIGIN` followed by the skeleton's root-relative atlas path.
   - `ATLAS_ORIGIN` SHALL be optional, empty by default (production, shared domain), and `http://localhost:3001` locally.
   - IF it is set, it SHALL be an `http:` or `https:` origin with no path, query or fragment. Otherwise the game SHALL stop with an error that names the variable and never its value.
   - It SHALL be used only to build links.
3. No other game code, and none of the Phase 2 auth, access, runs or score code, SHALL change. The Phase 1 parser, generator and audit SHALL not change.

## R11. Tests

1. With no database and no network, THE tests SHALL do the following:
   - Render each of the 12 legend pages from the parsed content files with `react-dom/server`, and prove that every anchor in the content appears exactly once as an element id.
   - Prove that every Hint 2 anchor in every legend's puzzle slots and final puzzle is one of those ids.
   - Prove that every asset id in the twelve legend files, and every shared asset id the atlas uses, maps through `assetUrl` to a file that exists under `assets/`, and that its stored size matches the file. `content/keepers-note.md` and the tutorial anchor `keepers-note--ch-1` are excluded until Phase 4 and listed in the handover.
   - Cover `atlasUrl` and the anchor resolver with valid, unknown and malformed anchors.
   - Run the contrast check: every theme passes, or its fallback is used and the rendered page uses it.
   - Prove that the atlas bundle has no auth code and no secret variable names.
2. Each test SHALL fail when its rule is broken. This is shown by breaking each rule once on purpose.
3. These tests SHALL run in `pnpm -r test` with an empty environment, and the Phase 1 and Phase 2 tests SHALL stay green.
4. Separately, a smoke check SHALL run against `dev-skeleton-core` with the reader role. It SHALL cover the home page, two legend pages, one `/anchor` redirect, one unknown anchor (404), and one write attempt with the reader role that is refused. THE exact commands and results SHALL be recorded.

## R12. Records and handover

1. THE work SHALL add a Phase 3 entry to `docs/kiro-usage.md` (Kiro features used, and the skills used with their findings) and update `docs/tech-decisions.md` and `.env.example` (variable names only).
2. THE work SHALL write `docs/phase-3-handover.md` with the following:
   - files and folders created; versions pinned and why;
   - how the atlas reads content (role, queries); the deep-link scheme and `atlasUrl`; how images and fonts are served;
   - the contrast results and fallbacks; the map data and its licence;
   - test counts and pass or fail; the smoke-check results;
   - skills used and their findings; anything that needs the owner's action.
3. Nothing SHALL be committed or pushed. `content/`, `assets/` and `vercel.json` SHALL not change. Phase 4 SHALL not start.

