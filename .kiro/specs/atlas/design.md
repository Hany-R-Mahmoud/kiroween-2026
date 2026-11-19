# Design: atlas (Phase 3)

Implements `requirements.md` (R1 to R12, with the owner's decisions). Everything new goes in `apps/atlas`, in new skeleton modules, in one migration, and in the two allowed changes to `apps/game`.

## 1. Versions and dependencies

| Package | Pin | Why |
|---|---|---|
| `@tanstack/react-start` | 1.169.5 | The game's pin, so the workspace has one Start (npm has 1.169.7; upgrading both is a separate step). |
| `@tanstack/react-router` | 1.170.46 | The version Start depends on. |
| `react`, `react-dom` | 19.3.1 | As the game. React 19 has the `popover` and `popoverTarget` props, which the map cards use. |
| `tailwindcss`, `@tailwindcss/vite` | 4.3.5 | As the game. v4 utilities read `var(--color-*)`, so a theme can override tokens on one element. |
| `vite` / `vitest` / `typescript` / `@vitejs/plugin-react` | 8.3.8 / 5.1.1 / 6.0.3 / 6.3.0 | As the game. |
| `@fontsource/*` (22 families) | exact 5.3.x each | Self-hosted Google Fonts (OFL-1.1), already split into `unicode-range` subsets with `font-display: swap`. See section 8. |

Not added: any map library, any auth package, a Markdown library, an image library. The world data is Natural Earth v5.1.2, the current tagged release. A one-off script turns it into two committed files (section 6); it is not a dependency.

## 2. Layout

```
apps/atlas/
  package.json  tsconfig.json  vite.config.ts  vitest.config.ts
  scripts/build-geo.mjs        one-off: Natural Earth GeoJSON -> the two geo files (input path as an argument)
  scripts/serve-build.mjs      serves the production build locally, as in the game
  scripts/smoke.ts             smoke check against a running server (section 12)
  public/world-land.svg        generated: land outline, equirectangular
  src/router.tsx  src/styles.css   (no start.ts: without it Start keeps its default CSRF check on server functions; spike)
  vite.media.ts                the /media plugin (dev middleware and build copy)
  src/server/env.ts            ATLAS_DATABASE_URL, FEATURE_ARABIC, PUBLIC_ORIGIN (optional)
  src/server/db.ts             one pool (size 2) on ATLAS_DATABASE_URL
  src/server/functions.ts      getShell, getHome, getLegend, resolveAnchorFn
  src/server/anchor.ts         resolveAnchor(anchor, lookup): pure, tested
  src/geo/countries.json       generated: country polygons with CONTINENT only, coordinates rounded to 0.01°
  src/geo/continent.ts         continentOf(lat, lng)
  src/geo/placeMarkers.ts      marker layout with leader lines (section 6)
  src/fonts.ts                 family name -> Fontsource stylesheet URLs
  src/i18n/{en,ar,t,useT}.ts   catalog, same pattern as the game
  src/components/              Map, MarkerCard, LegendList, LegendPage, StoryText, Img, AnchorFocus, NotFound
  src/routes/                  __root.tsx, index.tsx, legends.$legendId.tsx, anchor.$anchor.tsx
  test/                        section 11
skeleton/src/
  atlas/links.ts               ANCHOR_RE, isAnchor, legendUrl, atlasUrl
  atlas/view.ts                AtlasLegend type, atlasLegendFromModel, atlasLegendFromRows
  atlas/story.ts               storyBlocks(text): paragraphs, italics, [Dramatization] marks
  assets/assetUrl.ts           assetUrl, parseAssetSize
  theme/palette.ts             parsePalette, themeFonts
  theme/contrast.ts            contrastRatio, resolveTheme
  db/atlasRead.ts              the atlas queries (section 3.4)
skeleton/drizzle/0002_versions_ordinal.sql
```

The atlas runs on port 3001 in development, with no base path, so it owns `/`.

Pure modules (`atlas/links`, `atlas/view`, `atlas/story`, `assets/assetUrl`, `theme/*`) are exported from both `@kiroween/skeleton` and `@kiroween/skeleton/client`. `db/atlasRead` is exported from the main entry only. The existing client-entry test keeps the browser entry free of database code.

**Known duplication.** The game's i18n `translate` (11 lines) and its root-`.env` Vite plugin (5 lines) are copied into the atlas, because the game may change only in two places this phase. Moving both into the skeleton is a small follow-up for a later phase.

## 3. Database

### 3.1 Migration `0002_versions_ordinal` (shown for approval; applied only after it)

```sql
ALTER TABLE "versions" ADD COLUMN "ordinal" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "versions" ALTER COLUMN "ordinal" DROP DEFAULT;
```

- Drizzle schema: `ordinal: integer('ordinal').notNull()`.
- `drizzle-kit generate` writes `ADD COLUMN "ordinal" integer NOT NULL`, which fails on a table that already has rows. The generated file is edited to the two statements above. The default fills the existing rows once and is then dropped, so after the migration every insert must give an ordinal.
- The final column matches the Drizzle snapshot: not null, no default.
- Rows hold 0 only until the import replaces them.
- Applied with `pnpm --filter @kiroween/skeleton db:migrate` (direct connection), after checking that `.env` points at the dev endpoint `ep-little-boat-arrb1poz`. The check is the Phase 2 one: hosts only, no values printed.

### 3.2 Importer change and the one `db:import`

- `skeleton/src/db/plan.ts` gets `ordinal: i + 1` on each version, in the parser's order, which is the file's order. The same pattern already exists for `documentedTold`, `scenes` and `hotspots`.
- `test/db.test.ts` gains this expectation: versions are numbered 1 to n in file order, for all 12 legends.
- Then exactly one `pnpm --filter @kiroween/skeleton db:import` runs on `dev-skeleton-core`.
- Checked afterwards through the MCP: no version has ordinal 0, ordinals are 1 to n per legend with no repeats, counts are unchanged, and `legends.model` is still 12 of 12. `db:check-models` must still say yes for all 12, because the model is unchanged.
- `runs` is untouched. It has no foreign keys, and the importer never writes it.
- The import reads `content/legends/` only, so `content/keepers-note.md` is not imported.

### 3.3 The reader role

Run through the Neon MCP on `dev-skeleton-core` after the migration, one statement per call. No password is involved:

```sql
CREATE ROLE atlas_reader NOLOGIN;
GRANT CONNECT ON DATABASE neondb TO atlas_reader;
GRANT USAGE ON SCHEMA public TO atlas_reader;
GRANT SELECT (id, title, region, map_lat, map_lng, era, scare_level, reading_time_min, one_line_hook, cold_open, documented_closing, theme) ON legends TO atlas_reader;
GRANT SELECT ON chapters, versions, documented_told, sources, anchors TO atlas_reader;
GRANT SELECT (legend_id, id, usage, size) ON assets TO atlas_reader;
CREATE ROLE atlas_web LOGIN IN ROLE atlas_reader;
```

- Grants are per table and column, with no `ALTER DEFAULT PRIVILEGES`, so a future table is never readable by accident.
- Not granted: `runs`, every game table, `legends.model`, `final_puzzle`, `setting`, `spirit`, `content_hash`, the asset `prompt` text, and the `neon_auth` and `drizzle` schemas.
- On Postgres 18, `PUBLIC` has no CREATE on `public`.
- `atlas_web` is created with LOGIN but no password, so it cannot sign in yet. It inherits `atlas_reader`.

**STOP for the owner.** Set the password for `atlas_web` one of two ways. Never use `ALTER ROLE … PASSWORD '<literal>'`, because the literal would stay in query history.

- **Option A, Console (try first; from Neon's "Manage roles" docs):**
  1. In the Neon Console, open project `kiroween-2026`, branch `dev-skeleton-core`, then Postgres database, then Roles.
  2. On `atlas_web`, choose **Reset password**. Neon sets a generated password, so nothing is typed into SQL.
  3. Click **Connect**, choose branch `dev-skeleton-core`, database `neondb`, role `atlas_web`, and turn connection pooling on. Copy the string.
- **Option B, psql (if the Console does not list `atlas_web` or its Reset password fails for a role created with SQL):**
  1. Connect with psql as the database owner to `dev-skeleton-core`, using the owner's direct connection string from the Console's Connect dialog.
  2. Run `\password atlas_web` and type the new password twice. psql hashes it on your machine and sends only the hash (`ALTER ROLE … PASSWORD 'SCRAM-SHA-256$…'`), so the plain password is not in any history.
  3. Build the string: take the owner's pooled string and replace its user and password with `atlas_web` and your new password, percent-encoding any special characters.

**What happened on `dev-skeleton-core` (owner, recorded for production):**
- Option A gave a connection string with no password, and `pg_authid` showed no password for `atlas_web`: the Console reset did not apply to a role created with SQL.
- Option B does not work on Neon. Neon accepts only plain-text passwords, so the SCRAM hash that psql's `\password` sends is refused.
- What worked: the owner set the password with a local script over the owner's connection, so it was sent as a parameter and never typed into the SQL Editor or kept in its history. The owner also rotated the `neondb_owner` password and updated `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
- For production, use the same local-script route.

Then, for either option:
- Add the string to `.env` as `ATLAS_DATABASE_URL=<that string>`. The optional `sslmode=verify-full` change applies to it too.
- Tell me which option you used. The handover records the option, never the value.

After the owner says done, the MCP checks the role, without any secret:
- `rolsuper` is false.
- `atlas_web` is not a member of `neon_superuser`.
- `has_table_privilege('atlas_web', 'runs', 'SELECT')` is false.
- `has_column_privilege('atlas_web', 'legends', 'model', 'SELECT')` is false.
- The live write refusal is checked in the smoke step (section 12).

Rejected: `neon roles create --access read_only`, because it grants SELECT on every table in `public`, including `runs`. Also rejected: a Console-made role, because it is a `neon_superuser` member.

The grants live in this design, the handover and `docs/tech-decisions.md`, not in a Drizzle migration, because roles are per branch. Production needs the same seven statements, which the handover lists as an owner action.

### 3.4 Queries (`skeleton/src/db/atlasRead.ts`)

Drizzle builders only, so everything is parameterized. Every select names its columns, because `select *` on `legends` would ask for columns the role cannot read and fail.

- `listLegends(db)`: display columns of `legends`, plus each legend's marker asset (`assets` where the id has kind `marker`, on any surface).
- `getAtlasLegend(db, id)`: one `legends` row; `chapters` by `ordinal`; `versions` by `ordinal`; `documented_told` by `ordinal`; `sources`, `assets` and `anchors` of that legend. These go to `atlasLegendFromRows`. Returns `null` for an unknown id.
- `findAnchorLegend(db, anchor)`: `select legend_id from anchors where anchor = $1`.

Sources have no order column. They are sorted by the number in their id (`S1`, `S2`, … `S10`), which is the file's order in all twelve legends. The equivalence test (section 11) proves this.

## 4. Shared model: `AtlasLegend`

One view type feeds the legend page:
- meta: id, title, region, era, scare level, reading time, hook, map point
- `coldOpen`
- `chapters[]`: ordinal, anchor, title, text, hook, plate
- `versionsAnchor`
- `versions[]`: anchor, id, source type, era, claim, conflicts, source id, paragraph
- `documentedTold`: rows and closing
- `sources[]`: id, title, author, year, url
- `hero` and `marker`: `{ id, width, height }`
- `theme`: the raw pack

Two pure builders:
- `atlasLegendFromRows(rows)`, used by the server after the queries.
- `atlasLegendFromModel(legend)`, used by the tests, from the parsed content files.

**Equivalence test:** Phase 1's pure `planLegend(legend)` produces exactly the rows the importer writes. `atlasLegendFromRows(planLegend(legend))` must deep-equal `atlasLegendFromModel(legend)` for all 12 legends. This proves, without a database, that the page the server builds from Neon is the page the tests render from the content files.

Assets are found by id: the hero is `<id>-atlas-hero-01`; the plate for chapter n is `<id>-atlas-chapter-<nn>`; the marker is the asset of kind `marker` on any surface. Sizes come from `parseAssetSize`.

## 5. Links and anchors (`skeleton/src/atlas/links.ts`)

```ts
export const ANCHOR_RE = /^[a-z0-9]+(-[a-z0-9]+)*--(ch-[1-9][0-9]?|versions(--[a-z0-9]+(-[a-z0-9]+)*)?)$/;
export const isAnchor = (s: string): boolean => s.length <= 120 && ANCHOR_RE.test(s);
export function legendUrl(legendId: string): string  // '/legends/<id>', throws on an id that fails the legend id rule
export function atlasUrl(anchor: string): string     // '/legends/<prefix>#<anchor>', throws when !isAnchor(anchor)
```

- All 147 stored anchors match `ANCHOR_RE`, and each one's prefix before `--` equals its `legend_id` (checked through the MCP).
- `atlasUrl` checks only the format. It never needs the database; whether the anchor exists is the resolver's job.

### Resolver `/anchor/$anchor`

- The route loader calls `resolveAnchorFn`, which calls the pure `resolveAnchor(anchor, lookup)`.
- A malformed anchor gets `notFound()` with no lookup.
- An unknown anchor gets `notFound()`.
- A known anchor gets `redirect({ href: atlasUrl(anchor) })` (307).
- Phase 2 showed that `notFound()` in a loader gives HTTP 404 under server rendering, and `redirect` gives 307.

### Landing on an anchor (`AnchorFocus`, client only)

- On first load and on `hashchange`, it takes the element whose id is the hash and that element's heading (`[data-anchor-heading]`, `tabIndex={-1}`).
- It scrolls with `behavior: 'smooth'`, or `'auto'` under `prefers-reduced-motion: reduce`. It then calls `focus({ preventScroll: true })` on the heading and sets `data-landed` for 2 seconds.
- CSS gives `[data-landed]` a glow animation only inside `@media (prefers-reduced-motion: no-preference)`. Otherwise it gets a static outline, and so does `:target`.
- The spike task checks how this works with the router's own hash scrolling.

On the legend page:
- Each chapter is `<section id="<anchor>" aria-labelledby>` with an `h2`.
- The versions section is `<section id="<id>--versions">` with an `h2`.
- Each version is `<article id="<id>--versions--<v>">` with an `h3`.
- A small "Contents" `nav` lists the chapters and versions by in-page links. It also exercises the in-page path of R5.5.

## 6. Home: map and list

### World data

`scripts/build-geo.mjs` reads Natural Earth v5.1.2 `ne_110m_land.geojson` and `ne_110m_admin_0_countries.geojson`. The script fetches them once to a temp folder; their source URLs are recorded in `docs/tech-decisions.md`. It writes two files:

- `public/world-land.svg`: the land outline as one SVG path.
  - Projection: equirectangular, x = longitude, y = −latitude.
  - viewBox `-180 -84 360 142` (latitudes 84 to −58; the crop is a framing choice and does not distort anything).
  - Coordinates rounded to 0.1°.
  - It is a static image, so it is cached and kept out of the HTML.
- `src/geo/countries.json`: each country's polygons and its `CONTINENT`, rounded to 0.01°. It is used only on the server. It is about 300 KB in the server bundle and never shipped to the client.

Licence: public domain. No permission is needed and credit is optional. The README credit "Made with Natural Earth" is recorded for the README.

### Continent (`continentOf(lat, lng)`)

- Point-in-polygon over the country polygons, holes respected.
- With no hit (a point at sea), it uses the country with the nearest vertex.
- Checked now against the real data:
  - Europe: baba-yaga, banshee, draugr, el-coco, spring-heeled-jack.
  - Asia: gumiho, vetala, yuki-onna.
  - Africa: naddaha, and flying-dutchman (Cape Point is 0.25° off the coarse coastline, so the nearest country, South Africa, is used).
  - North America: chupacabra, jersey-devil.
- Group order is fixed: Africa, Asia, Europe, North America, South America, Oceania. Empty groups are not shown.

### Map layout (`placeMarkers(points, box)`)

- At the map's design width of 960 px, Ireland and London are about 23 px apart. 44 px markers would overlap, so each legend gets a small dot at its true projected point and a 44 px marker button.
- The button sits on the point when there is room. Otherwise it moves to the first free spot in a fixed sequence: 8 directions at radius 52, then 104. A leader line runs from the dot to the button.
- The layout is deterministic and pure, so the map stays honest: every line ends at the real point.
- The map frame has a minimum width of 960 px and scrolls sideways on narrow screens. It is a labelled, keyboard-scrollable region (`tabindex="0"`, `role="region"`). The list below it is the main way in on a phone.
- The frame uses `dir="ltr"`, because a map is not mirrored. Positions are set with `inset-inline-start` and `inset-block-start` in percent, which inside `dir="ltr"` equal the physical x and y. A one-line comment explains this, as the i18n steering's pan exception allows.
- The painted map `shared-atlas-map-01` is a decorative band above the honest map (`alt=""`, `aria-hidden`), never behind it, so no one reads its wrong coastlines as geography.

### Marker card

- Each marker is `<button popoverTarget="card-<id>" aria-label="<title>">` showing the marker image.
- Its card is `<div popover id="card-<id>" role="dialog" aria-labelledby>`, with the title, region, era, scare level ("Scare level 3 of 5" as text, plus decorative marks), reading time, hook and a link to the legend page.
- The native popover gives Escape and light dismiss, and returns focus to the button when focus was inside. No script is needed.
- The card sits in the top layer, centred, styled with the base tokens.

### List

- One `h2` per continent, then `ul` items: the title (a link to the legend page), region, era and reading time. The hook is shown as text.
- It works with no script and no map.

### Hero

`shared-atlas-hero-01` (2400×1350), eager, `fetchPriority="high"`, with a `<link rel="preload" as="image">` in the head.

## 7. Images

- **`assetUrl(id)`** follows `assets/README.md`:
  - `shared-*` maps to `/media/shared/<id>.webp`.
  - `hub-*` and `tutorial-*` map to `/media/hub/<id>.webp`.
  - `<legend-id>-<surface>-<kind>-<nn>` maps to `/media/<legend-id>/<surface>/<id>.webp`, with surface `atlas`, `game` or `shared`. The surface is found as the first `-atlas-`, `-game-` or `-shared-` after a non-empty legend prefix.
  - Anything else throws.
- **Prefix `/media`.** The atlas's own build files are under `/assets/` and the game's under `/game/`, so `/media` clashes with neither. The game will use `ATLAS_ORIGIN + assetUrl(id)` in Phase 4.
- **Development.** A Vite plugin in the atlas (`configureServer`) serves `/media/*` from the repo's `assets/` folder. It takes the file name's id, recomputes `assetUrl(id)`, and serves only when that equals the request path exactly. So only canonical `.webp` paths are served, `..` or encoded tricks cannot match, and anything else gets 404. Files are streamed with `content-type: image/webp`.
- **Build.** The same plugin copies `assets/**/*.webp` into `dist/client/media/` at build time. That is build output, git-ignored, not a copy in the repo. `serve-build.mjs` serves those static files. Vercel comes in a later phase.
- **`parseAssetSize(text)`** reads the first `<w>[x×]<h>` in the size text. Every `<img>` gets `width`, `height`, `alt` and `decoding="async"`. Everything except the hero gets `loading="lazy"`.
- **Alt text** comes from the catalog patterns in R4.5.

## 8. Theme packs and fonts

### Palette

- `parsePalette(text)` reads each `role #RRGGBB` pair, with or without backticks; the first occurrence of a role wins. It requires `background`, `surface`, `ink`, `accent`, `danger` and `glow`. Values must match `#[0-9A-Fa-f]{6}`, so nothing else can reach a style attribute.
- `resolveTheme(theme, base)` returns CSS variables that override the base token names on the legend page:
  - `--color-bg`, `--color-surface`, `--color-ink`, `--color-accent`, `--color-glow`, `--color-danger`
  - `--font-display`, `--font-body`
  - It also returns a list of fallbacks.
- Checks (WCAG 2.x relative luminance; AA):
  - `ink` (body text) against `background` and `surface`: 4.5:1.
  - `accent` (links) against `background` and `surface`: 4.5:1.
  - `glow` (headings at 24 px and larger only): 3:1 against `background`.
  - Base `muted` (secondary text) against the theme's `background` and `surface`: 4.5:1.
- If a role fails, that role uses the base token. If the base token also fails, links use `ink`, always underlined. Every fallback is recorded.
- Computed now from the content:
  - `ink` passes everywhere (lowest 10.95:1).
  - `accent` fails as a link colour for baba-yaga (3.12 on background, 2.68 on surface), yuki-onna (3.59 and 2.86), jersey-devil (3.91 on surface) and draugr (4.33 on surface). Those four use the base accent `#E0A84B` for links.
  - `glow` passes 3:1 everywhere (spring-heeled-jack is lowest at 3.42, large text only).
  - Base `muted` passes on every background and surface (lowest 4.73:1).
- The root applies the variables on `<body>`. It reads them from the legend route's loader data through `useMatches`, so the header and footer take the theme as well. `<meta name="theme-color">` is the theme's background.

### Fonts

- `themeFonts(theme)` returns the family stacks.
  - Display stack: every known family named in the display field, in order. This includes the named fallbacks, such as Marck Script, Cormorant Garamond for draugr's Icelandic letters, Abril Fatface, Old Standard TT and Noto Serif.
  - Body stack: the same rule for the body field, except that a family named "for English" goes first. For naddaha that gives Crimson Pro, then Noto Naskh Arabic for the Arabic names.
  - A browser downloads a later family in a stack only for glyphs the earlier ones lack, so fallbacks normally cost nothing.
  - A family the font map does not know is a test failure, so a new pack with a new font forces adding its package.
- `src/fonts.ts` maps each family to its Fontsource stylesheets, imported with `?url`:
  - display: weight 400;
  - body: 400 normal and 400 italic where the family has an italic;
  - base families on every page: IM Fell English SC and Source Serif 4, plus Inter for UI labels.
- A legend route's `head().links` adds only its own families' stylesheets. Fontsource's default stylesheet holds every subset with `unicode-range`, so a page downloads only the chunks its text uses: Cyrillic for baba-yaga, Hangul for gumiho, Arabic for naddaha, Latin elsewhere. No third-party font CDN is used.
- Fontsource uses `font-display: swap`; a task confirms this in the installed files.
- Every family name reaches CSS only through the font map, quoted, so nothing from the database is put into CSS unchecked.
- 22 families: Bad Script, Marck Script, PT Serif, IM Fell English, IM Fell English SC, Source Serif 4, Playfair Display SC, Abril Fatface, Crimson Pro, Cormorant Garamond, Nanum Myeongjo, Gowun Batang, Libre Baskerville, Old Standard TT, Amiri, Noto Naskh Arabic, Yatra One, Noto Serif, Noto Serif Devanagari, Shippori Mincho, Noto Serif JP, Inter. All of them are OFL-1.1 on npm (checked).

## 9. Rendering, text and page basics

- **`storyBlocks(text)`** splits the text into paragraphs on blank lines. Inside a paragraph it yields text, italic (`*…*`) and dramatization (`[Dramatization]`) tokens. React renders them as `p`, `em` and a label: `<span class="dramatization">` with a border and the catalog text "Dramatization", not colour alone. Nothing is rendered as HTML. A test fails if any rendered story text still contains `*` or `[Dramatization]` as raw characters.
- **Legend page order** follows R4.1. The "documented and told" part is a real `<table>` with a `caption` and `th scope="col"`. Each source is an `li`, with a link only when the URL is `http(s)` (`rel="noopener noreferrer"`, `target` not set).
- **Head.** Each page has a title and description: the catalog text on home and 404, and the hook on a legend page. Every page also has `og:title` and `og:description`.
  - Absolute Open Graph URLs come only from **`PUBLIC_ORIGIN`** (owner change). The `Host` header is client-controlled and is never used to build them.
  - `PUBLIC_ORIGIN` is optional. When set, it must be an `https:` origin, or `http://localhost` with an optional port. In both cases `new URL(v).origin === v`: no path, query, fragment or trailing slash.
  - Any other value stops the server with an `EnvError` that names only the variable.
  - When it is set, legend pages add `og:image` (`PUBLIC_ORIGIN + assetUrl(hero)`) and every page adds `og:url` (`PUBLIC_ORIGIN + path`). When it is empty, both are left out.
  - It is read in `src/server/env.ts` and goes to the client only as part of those finished meta values.
- **Shell.** It has a skip link to `#main`; `header` with a `nav` (Home); `main`; and a `footer` with the Natural Earth credit and the "fiction labelled as fiction" note. Each page has one `h1`. Focus is shown by `focus-visible` outlines in `--color-glow` (contrast checked as above).
- **Locale.** `getShell` uses the skeleton's `resolveLocale` with `FEATURE_ARABIC`, the `lang` cookie and `Accept-Language`, as the game does. The root sets `lang` and `dir`. CSS uses logical properties only, and the game's logical-CSS and no-hardcoded-text tests are copied for `apps/atlas/src`.
- **Errors.** Server functions turn any error that is not `notFound` or `redirect` into one generic message. The root `errorComponent` shows a fixed friendly page. No driver text reaches the client.
- **`/game`.** The atlas has no route there, so `/game` and `/game/...` reach the atlas 404. A test checks that the generated route tree has no path that starts with `/game`.

## 10. Changes in `apps/game`

1. `src/routes/__root.tsx`: add `notFoundComponent` with a heading, one sentence and a link to the hall (new catalog keys). This removes the dev warning.
2. `src/server/env.ts`: add `atlasOrigin`.
   - An empty or missing value gives `''`.
   - Otherwise `new URL(v)` must have protocol `http:` or `https:`, and `url.origin === v` (no path, query or fragment, no trailing slash), or an `EnvError('ATLAS_ORIGIN', …)` naming only the variable.
   - New cases go in `test/env.test.ts`.
3. `getHall` (in `src/server/functions.ts`) adds `atlasHref: atlasOrigin + legendUrl(id)` to each door, computed on the server.
   - `index.tsx` gives each door a "Read the legend" link (aria-label "Read the legend: \<title\>"), open or locked.
   - An open door's card has two sibling links (enter, read) instead of one link wrapping the card, because nested links are invalid.
   - New catalog keys.
4. `.env.example` gets `ATLAS_ORIGIN=`, `ATLAS_DATABASE_URL=` and `PUBLIC_ORIGIN=`, each with a one-line comment and no value.

No change to auth, access, runs, score, the proxy, the middleware or the smoke script.

## 11. Tests (no database, no network, empty environment)

| Test | Proves | Broken on purpose by |
|---|---|---|
| `atlas/test/legend-render.test.tsx` | For each of the 12 parsed legends, the page rendered with `renderToString` has every content anchor exactly once as an element id. Every slot and final-puzzle Hint 2 anchor is among those ids. Every `[Dramatization]` in the source gives one label. No raw `*` remains. Every `img` has width, height and alt. Only the hero is not lazy. Every external link has `rel="noopener noreferrer"`. | Dropping a version's id; duplicating a chapter id; skipping the italic parser; removing `loading` |
| `skeleton/test/atlas-view.test.ts` | `atlasLegendFromRows(planLegend(l))` deep-equals `atlasLegendFromModel(l)` for all 12; versions are in file order | Ordering versions by id; ordering sources as text |
| `skeleton/test/atlas-links.test.ts` | Property tests: random valid legend ids, chapters and versions give `atlasUrl` = `/legends/<id>#<anchor>`; malformed strings (empty, `..`, `/`, upper case, `ch-0`, over 120 characters, `%2F`) throw. All 147 content anchors pass `isAnchor`. | Loosening `ANCHOR_RE` |
| `atlas/test/anchor.test.ts` | `resolveAnchor`: known gives a redirect to `atlasUrl`; unknown gives not found; malformed gives not found with the lookup never called (spy) | Moving the format check after the lookup |
| `skeleton/test/asset-url.test.ts` | Every asset id in the 12 legend files, and the shared ids the atlas uses (`shared-atlas-hero-01`, `shared-atlas-map-01`), map through `assetUrl` to an existing file under `assets/`. The file's WebP header width and height equal `parseAssetSize`. Malformed ids throw. | A wrong folder rule; a wrong size parse |
| `skeleton/test/theme.test.ts` | `parsePalette` reads all 12 packs; `resolveTheme` passes every check for every pack; the fallback list is exactly baba-yaga, draugr, jersey-devil and yuki-onna (links). The rendered banshee and baba-yaga pages carry the expected variables. | Skipping the surface check; using the theme accent anyway |
| `atlas/test/fonts.test.ts` | `themeFonts` gives the pinned stacks for all 12 (naddaha body: Crimson Pro first). Every family is in the font map. Every map entry resolves to an installed Fontsource stylesheet that declares `font-display: swap`. | Removing a map entry; reversing naddaha's order |
| `atlas/test/geo.test.ts` | `continentOf` gives the expected continent for all 12 points, including the sea fallback. `placeMarkers` gives no overlapping buttons, keeps every button inside the box, and every leader line ends at its true point. The SVG viewBox is the documented one. | Dropping the sea fallback; zero radius |
| `atlas/test/boundaries.test.ts` | `package.json` has no auth package. No file under `src` imports `@neon/auth` or `better-auth`, names `NEON_AUTH_`, or names `DATABASE_URL` other than `ATLAS_DATABASE_URL`. No module reachable from the client names `process.env`. The route tree has no `/game` path. | Adding an import of `@neon/auth` |
| `atlas/test/{i18n,logical-css}.test.ts` | As in the game | As in the game |
| `atlas/test/env.test.ts` | `ATLAS_DATABASE_URL` required and `postgres(ql):`; `FEATURE_ARABIC` true or false. `PUBLIC_ORIGIN`: empty is accepted, and so are `https://example.org`, `http://localhost` and `http://localhost:3001`. It is refused for `http://example.org`, a path, a query, a trailing slash or `ftp:`. Errors name only the variable. With it empty, the rendered legend head has no `og:image` and no `og:url`; with it set, both start with it. | Accepting any `http:` origin; building `og:image` from the request |
| game: `test/env.test.ts` additions | `ATLAS_ORIGIN` empty, valid http and https, and invalid (path, query, `ftp:`, not a URL); the error names only the variable | Removing the origin check |

- The build check in the final verification greps `apps/atlas/dist` for auth package names and the game's variable names (client and server). It also greps the client output for any variable name.
- The Phase 1 and Phase 2 suites stay green; only `db.test.ts` gains the ordinal expectation.
- Breaking each rule on purpose is done once per row, then restored, and recorded.

## 12. Smoke check (dev server, `dev-skeleton-core`, reader role)

`apps/atlas/scripts/smoke.ts` (run with the skeleton's `tsx`, because it reads the parsed content files) runs against `http://localhost:3001` and prints step results only:

- `/`: 200, 12 marker buttons, 12 list items in continent groups, the hero.
- `/legends/banshee` and `/legends/naddaha`: 200. The page's anchor ids equal the anchors of the parsed content file, read-only, each appearing once. The version ids are in the file's order.
- `/anchor/banshee--ch-3`: 307, `location: /legends/banshee#banshee--ch-3`.
- `/anchor/banshee--ch-99`: 404. `/anchor/BAD..x`: 404.
- `/game/`: 404.
- `/media/banshee/atlas/banshee-atlas-hero-01.webp`: 200, `image/webp`. `/media/../.env` and `/media/banshee/atlas/x.png`: 404.

`skeleton/scripts/check-reader-role.ts` (`pnpm --filter @kiroween/skeleton db:check-reader`) connects with `ATLAS_DATABASE_URL`, which dotenv loads from the repo-root `.env`; the value is never printed. It prints yes or no per line:
- the display columns of `legends` are readable;
- `legends.model` is refused;
- `runs` is refused;
- `neon_auth."user"` is refused;
- an `INSERT` into `legends` is refused;
- an `UPDATE` of `chapters` is refused.

"Refused" means SQLSTATE 42501, and nothing is written.

## 13. Order of work and stops

1. Spike: an empty atlas app on port 3001, root route, one server function, a 404, a `/media` file, and the hash-focus behaviour.
2. Skeleton pure modules and their tests.
3. Migration, importer, the one `db:import`, then MCP checks.
4. Reader role through the MCP, then **STOP** for the owner (section 3.3).
5. Atlas data layer.
6. Pages, then map and list.
7. Themes and fonts, then the **impeccable** review of the home and legend pages.
8. Game changes.
9. agent-tester mutation pass, then the smoke check.
10. Docs, the guard pass, verify-and-stop, the handover.

A guard pass (agent-guard with clean-code-guard) follows each group.

## 14. Risks and limits

- **No responsive image sizes.** Each WebP exists at one size, and the hero is 2400 px wide even on a phone. Making smaller copies would mean new files, and `assets/` is not ours to change. They could be made at build time in a later phase.
- **`/media` in production** needs the Vercel setup of the deployment phase.
- **The map needs sideways scrolling on narrow screens**; the list is the main way in there.
- **Link previews need `PUBLIC_ORIGIN`.** Until it is set (the deployment phase), pages have no `og:image` or `og:url`.
- **CJK and Arabic fonts are large**, but `unicode-range` means only the chunks a page uses are downloaded.
- **The reader role is per branch.** Production needs the same grants and its own Reset password.
- **`keepers-note--ch-1`** gives 404 at `/anchor/` until the Keeper's Note is imported in Phase 4.
