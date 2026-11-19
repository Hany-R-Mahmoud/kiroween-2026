# Tasks: atlas

Requirements: `requirements.md`. Design: `design.md`. Each group ends with a checkpoint.

Order:
- The spike comes first.
- The migration and the import come before the reader role, so the grants cover the final `versions` table.
- The owner stop is Task 12.

## Working rules (apply to every task)

**Skills.** Skills never override the spec, the steering files or the owner's prompt. On a conflict, follow the spec and tell the owner.
- **read-the-damn-docs**: before using TanStack Start, Tailwind, Drizzle, Neon roles, Fontsource or map data. Read the current docs or the installed package's types and source, and note what was read in `docs/kiro-usage.md`.
- **ponytail**: on every module (the smallest code that meets the requirement). No map library.
- **impeccable**: the design and accessibility review in Group G. It is the most important review in this phase. **agent-design**: only for its inclusive-visual check in the same task, because it sends code-level UI work to impeccable.
- **agent-tester**: on every test file. Each test must fail when its rule is broken.
- **agent-guard**, with **clean-code-guard** for code: at the end of each group.
- **verify-and-stop**: Task 31.
- Not used: agent-pilot, agent-superpowers, agent-orchestrator, agent-implementer, or any skill that starts sub-agents or its own workflow.

**Never:**
- Edit, create, delete or read `content/keepers-note.md`. Edit, create or delete anything else under `content/` or `assets/`. The legend files and `assets/` are read only.
- Edit `docs/content-gaps.md`, run `audit:content`, or touch `vercel.json`.
- Change the Phase 1 parser, generator or audit. The importer (`plan.ts`) and its test may change only for the ordinal.
- Change the Phase 2 auth, access, runs or score code, or the game outside Group H.
- Open `.env`, or print, log or write a secret.
- Commit or push, or start Phase 4.

**Database safety:**
- The migration, the import and the role statements go to `dev-skeleton-core` (`br-blue-breeze-arxdc1lo`) only.
- After each one, check through the Neon MCP that the dev branch has the change and that the default branch (`br-delicate-brook-art2crov`) still has no tables.
- Run an MCP check only after the command that changes data has finished.
- Before `db:migrate` or `db:import`, confirm by host name only, never by value, that `DATABASE_URL_UNPOOLED` names the dev endpoint `ep-little-boat-arrb1poz`.

**Files:**
- No recursive deletes. Write source files with the file tool; multi-file shell heredocs corrupted files in Phase 1.
- Run the typecheck after each group.
- Keep a running log in `docs/kiro-usage.md`; Task 30 finishes it.

**Tests:** the whole suite passes at every checkpoint (skeleton 431 and game 39 today, plus the new tests), also once with an empty environment. Any failure is real.

---

## Group A: pre-flight and spike

- [x] 1. Pre-flight
  - [x] 1.1 `git status`: nothing under `content/` or `assets/` is modified, `vercel.json` is unchanged, and the last commit is `8999850` (the owner's Keeper's Note and Phase 3 prompt, on top of `3fc81f2`).
  - [x] 1.2 Read the current docs and installed types for Start:
    - file routes with `notFoundComponent` and `errorComponent`;
    - `head()` with `meta` and `links`;
    - `redirect` and `notFound`;
    - `useMatches`;
    - the router's hash scrolling;
    - Vite `?url` imports of CSS.
    Read the Tailwind v4 docs on overriding theme variables on an element. Note what was read.
  - _Requirements: R11, design 1_
- [x] 2. **Spike: an empty atlas app at the root**
  - [x] 2.1 `apps/atlas/package.json` at the game's exact pins (design 1), plus `@kiroween/skeleton` as a workspace dependency. Then `pnpm install`.
  - [x] 2.2 The smallest app on port 3001: `vite.config.ts` (with the root-`.env` plugin copied from the game and `envPrefix: 'KIROWEEN_PUBLIC_'`), `tsconfig.json` (`strict`), `src/router.tsx`, `src/routes/__root.tsx` with a not-found component, `index.tsx`, one server function, and Tailwind wired with the skeleton tokens.
  - [x] 2.3 The `/media` Vite plugin (design 7). In development it serves canonical paths only. At build time it copies `assets/**/*.webp` into `dist/client/media/`. Also `scripts/serve-build.mjs`.
  - [x] 2.4 Prove the following in dev and in the production build. Print status codes only.
    - `/` returns 200.
    - An unknown path, `/game` and `/game/x` return 404.
    - The server function returns 200 same-origin and 403 cross-site.
    - `/media/banshee/atlas/banshee-atlas-hero-01.webp` returns 200 with `image/webp`.
    - `/media/../.env`, a `.png` path and a non-canonical path return 404.
    - A test page with two anchored sections and a hash link moves focus to the heading after the router's scroll.
  - [x] 2.5 Write the result to `docs/tech-decisions.md` (port, the `/media` mechanism, and how the hash focus works with the router).
  - _Requirements: R1.1, R1.2, R7.1, R7.5, R5.5_
- [x] 3. Group A checkpoint: typecheck; `pnpm -r test`; `git status` clean for the protected paths; **agent-guard** on the spike.

## Group B: pure skeleton modules (no framework, database or network)

- [x] 4. Links (`skeleton/src/atlas/links.ts`): `ANCHOR_RE`, `isAnchor`, `legendUrl` and `atlasUrl`, per design 5. Test `test/atlas-links.test.ts`:
  - property tests, 100 runs: valid ids round-trip; malformed strings throw;
  - all anchors in the 12 legend files pass.
  - _Requirements: R5.2, R5.4, R11.1_
- [x] 5. Assets (`skeleton/src/assets/assetUrl.ts`): `assetUrl` and `parseAssetSize`, per design 7. Test `test/asset-url.test.ts`:
  - every asset id in the 12 legend files, plus `shared-atlas-hero-01` and `shared-atlas-map-01`, maps to an existing file;
  - the WebP header width and height (a small header reader in the test helper) equal the parsed size;
  - malformed ids throw.

  If a content asset has no file, or its size does not match, stop and report it as a content finding. Do not change the file or the content.
  - _Requirements: R7.2, R7.3, R11.1_
- [x] 6. Theme (`skeleton/src/theme/{palette,contrast}.ts`): `parsePalette`, `themeFonts`, `contrastRatio` and `resolveTheme`, per design 8. Test `test/theme.test.ts`:
  - all 12 packs parse;
  - every resolved theme passes;
  - the fallback list is exactly the four link fallbacks in design 8;
  - the font stacks are pinned for all 12 (naddaha's body starts with Crimson Pro).
  - _Requirements: R6.1, R6.3, R11.1_
- [x] 7. Story text (`skeleton/src/atlas/story.ts`): `storyBlocks`. Tests cover paragraphs, italics, `[Dramatization]` at the start and in the middle, an unclosed `*` kept as text, and no HTML.
  - _Requirements: R4.2, R4.3_
- [x] 8. View (`skeleton/src/atlas/view.ts`): `AtlasLegend`, `atlasLegendFromModel` and `atlasLegendFromRows`, with assets matched by id and alt text left to the app. Export the pure modules from `index.ts` and `client.ts`.
  - Test `test/atlas-view.test.ts`: `atlasLegendFromRows(planLegend(l))` deep-equals `atlasLegendFromModel(l)` for all 12 legends.
  - This test fails until Task 10 adds the ordinal. Write it now, and expect it to fail here for that reason only.
  - The existing client-entry test still passes.
  - _Requirements: R2.1, R4.1, design 4_
- [x] 9. Group B checkpoint: strict typecheck with `--noUnusedLocals --noUnusedParameters`; tests green except the view test's expected ordinal failure; **agent-guard**.

## Group C: database (dev branch only)

- [x] 10. Ordinal in the importer
  - [x] 10.1 `skeleton/src/db/schema.ts`: `ordinal: integer('ordinal').notNull()` on `versions`. `skeleton/src/db/plan.ts`: `ordinal: i + 1`.
  - [x] 10.2 `test/db.test.ts`: versions are numbered 1 to n in file order for all 12 legends. Remove the view test's expected-failure marker (owner), so from here on it runs as a normal test and passes. The handover confirms this.
  - [x] 10.3 `pnpm --filter @kiroween/skeleton db:generate --name versions_ordinal`. Edit the generated SQL to the two statements in design 3.1 and check that the snapshot says not null with no default.
  - _Requirements: R2.6_
- [x] 11. Apply on `dev-skeleton-core`
  - [x] 11.1 Host check (dev endpoint), then `db:migrate`. MCP check: the column exists, it is not null with no default, 3 migrations are recorded, and the default branch has no tables.
  - [x] 11.2 Exactly one `db:import`. MCP check:
    - no version has ordinal 0;
    - ordinals are 1 to n per legend with no repeats;
    - each legend's version order matches its file;
    - row counts are unchanged (12 legends, 423 facts);
    - `legends.model` is set for all 12.
  - [x] 11.3 `db:check-models`: yes for all 12. `runs` is still there (0 rows).
  - _Requirements: R2.6_
- [x] 12. Reader role, then the **OWNER STOP**
  - [x] 12.1 Through the MCP, one call each: the seven statements in design 3.3. No password is used.
  - [x] 12.2 MCP check:
    - `atlas_web` exists with LOGIN and no password, is not a superuser, and is not a member of `neon_superuser`;
    - SELECT is true on the granted columns;
    - SELECT is false on `runs`, `legends.model`, `assets.prompt` and `neon_auth."user"`;
    - INSERT, UPDATE and DELETE are false everywhere.
  - [x] 12.3 **STOP.** Give the owner the two password options exactly as in design 3.3 (Console Reset password; or psql `\password atlas_web`). Ask for `ATLAS_DATABASE_URL` in `.env` and which option was used. Wait.
  - _Requirements: R2.2, R2.3_
- [x] 13. Group C checkpoint: tests green; MCP state as above; **agent-guard** on the migration, schema, plan and test changes.

## Group D: atlas data layer and checks

- [x] 14. `apps/atlas/src/server/env.ts`: `ATLAS_DATABASE_URL`, `FEATURE_ARABIC` and `PUBLIC_ORIGIN` (design 9). Test `test/env.test.ts` per design 11.
  - _Requirements: R2.4, R8.1, R9.1_
- [x] 15. `skeleton/src/db/atlasRead.ts` (design 3.4): explicit column lists, Drizzle builders only. Exported from the main entry only. Tests use the recording stand-in from Phase 1 and check that every query names columns and that every value is a bound parameter.
  - _Requirements: R2.1, R2.5_
- [x] 16. `apps/atlas/src/server/{db,anchor,functions}.ts`: the pool on `ATLAS_DATABASE_URL`; `resolveAnchor` (pure) with `test/anchor.test.ts`; server functions with a generic error message. The legend id and anchor are validated before any query.
  - _Requirements: R2.5, R2.7, R4.6, R5.3_
- [x] 17. `skeleton/scripts/check-reader-role.ts` and the script `db:check-reader` (design 12). It prints yes or no per line and never a value.
  - Run it once the owner has set `ATLAS_DATABASE_URL`. Every line must be as expected.
  - _Requirements: R2.2, R11.4_
- [x] 18. Group D checkpoint: tests; typecheck; **agent-guard**.

## Group E: map data

- [x] 19. `apps/atlas/scripts/build-geo.mjs` (design 6). Fetch Natural Earth v5.1.2 `ne_110m_land` and `ne_110m_admin_0_countries` to a temp folder, and record the source URLs and licence in `docs/tech-decisions.md`. Write `public/world-land.svg` and `src/geo/countries.json`.
  - _Requirements: R3.3, R3.6_
- [x] 20. `src/geo/continent.ts` and `src/geo/placeMarkers.ts`. Test `test/geo.test.ts` per design 11.
  - _Requirements: R3.1, R3.3, R3.5_
- [x] 21. Group E checkpoint: tests; **agent-guard** (also check the size of the generated files and that `countries.json` is not reachable from client code).

## Group F: pages, themes and fonts

- [x] 22. Shell and text:
  - `src/i18n/*` (catalog, with Arabic falling back to English per key);
  - `__root.tsx` with `lang`, `dir`, skip link, landmarks, header, footer (Natural Earth credit), not-found and error components, and `useMatches` for the theme variables on `<body>`;
  - `styles.css` with logical properties only, `focus-visible` outlines and the `[data-landed]` and `:target` highlights (motion only in `no-preference`).
  - _Requirements: R1.5, R8, R9.2, R9.3_
- [x] 23. Components:
  - `Img` (width, height, alt, lazy except the hero, `fetchPriority`);
  - `StoryText`;
  - `LegendPage` (design 5 and 9; contents nav; table with caption);
  - `AnchorFocus`;
  - `Map`, `MarkerCard` (popover) and `LegendList`.
  - _Requirements: R3, R4, R5.1, R5.5, R7.3, R7.4_
- [x] 24. Routes:
  - `index.tsx` (hero preloaded, map, list by continent);
  - `legends.$legendId.tsx` (head: title, description, `og:*` only with `PUBLIC_ORIGIN`, `theme-color`, its font stylesheets);
  - `anchor.$anchor.tsx`.
  - `src/fonts.ts` with the 22 Fontsource packages at exact pins. Confirm in the installed files that each package declares `font-display: swap` and is OFL.
  - _Requirements: R3, R4, R5.3, R6.2, R9.1_
- [x] 25. Tests per design 11: `legend-render`, `fonts`, `boundaries`, `i18n`, `logical-css`, and the rendered-theme check. Every test runs with no database.
  - _Requirements: R11.1, R11.3_
- [x] 26. Group F checkpoint: tests (also with `env -i`); strict typecheck; production build; **agent-guard**.

## Group G: design and accessibility review

- [x] 27. **impeccable** review of the home page and two legend pages (banshee, plus baba-yaga for its link fallback and Cyrillic text).
  - [x] 27.1 Run `impeccable context --target apps/atlas`. The project has no `PRODUCT.md` or `DESIGN.md`. Do not create them (owner): use the steering files (`product.md`, `design.md`, `i18n-rtl.md`) and the theme packs as the brief, and record this in the log. Mode: Read.
  - [x] 27.2 Run impeccable `critique` and `audit` on the pages:
    - hierarchy, reading comfort and measure;
    - each theme looking like its own world and staying readable;
    - the map card and list on a phone width and on desktop;
    - focus order and visible focus;
    - reduced motion;
    - RTL with the flag on;
    - contrast;
    - image loading and layout shift.
    Look at the rendered pages at phone and desktop widths if impeccable's tooling can render them. Otherwise review the rendered HTML and CSS, and list a browser pass for the owner.
  - [x] 27.3 **agent-design** inclusive-visual check: cultural motifs and wording on the legend pages; no loaded symbols as decoration.
  - [x] 27.4 Fix the findings inside the spec. Record each one in the log, and every finding left open with its reason.
  - _Requirements: R1.4, R3.2, R6, R9.2_

## Group H: game changes (only these)

- [x] 28. In `apps/game`, per design 10:
  - a root `notFoundComponent` with catalog keys;
  - `ATLAS_ORIGIN` in `env.ts`, with tests;
  - `atlasHref` from `getHall`;
  - a "Read the legend" link on every door (sibling links, no nesting);
  - `.env.example` with `ATLAS_ORIGIN=`, `ATLAS_DATABASE_URL=` and `PUBLIC_ORIGIN=`, no values.

  Game tests, typecheck and build pass. Prove the dev warning about a missing `notFoundComponent` is gone.
  - _Requirements: R10_

## Group I: test quality and smoke check

- [x] 29. Tests and smoke
  - [x] 29.1 **agent-tester**: break each rule in the design 11 table once, run the matching test, and restore. All of them must be caught. Record the list and the results.
  - [x] 29.2 `apps/atlas/scripts/smoke.ts` (design 12). Start the atlas dev server in the background, then run the smoke script and `db:check-reader`, then stop the server. Record every command and the pass or fail of every step. No secret is printed.
  - _Requirements: R11.2, R11.4_

## Group J: docs, final checks, handover

- [x] 30. Docs and guard
  - [x] 30.1 `docs/tech-decisions.md`:
    - atlas pins;
    - the reader role and its grants (the seven statements, which production also needs);
    - the migration;
    - `/media`, the fonts and their licence, the Natural Earth source and licence;
    - `PUBLIC_ORIGIN` and `ATLAS_ORIGIN`;
    - the contrast fallbacks;
    - the copied i18n and env-plugin code.
  - [x] 30.2 `docs/kiro-usage.md`: the Phase 3 entry (Kiro features used, and skills with their findings).
  - [x] 30.3 **agent-guard** over the whole Phase 3 diff, grouped by code, tests and docs (unused exports, function size, dead code, docs claims against the code, script names). Fix the findings inside the spec.
  - _Requirements: R12.1_
- [x] 31. Final verification (**verify-and-stop**). Run in this order and record the exact results:
  - `pnpm install --frozen-lockfile`;
  - the strict typecheck of every package;
  - `pnpm -r test`, and once more with `env -i`;
  - the production builds of `apps/atlas` and `apps/game`;
  - a grep of `apps/atlas/dist` for auth package names and the game's variable names, and of its client output for any variable name;
  - `pnpm check:content`;
  - `node scripts/scan-secrets.mjs`;
  - `git status`: no change under `content/` or `assets/`, and no change to `vercel.json`;
  - the Neon MCP: on the dev branch, `versions.ordinal` and the `atlas_web` grants are as designed; the default branch has no tables.

  Stop when the proof is complete.
  - _Requirements: R11, R12.3_
- [x] 32. Handover: write `docs/phase-3-handover.md` per R12.2. It includes:
  - the password option the owner used (never the value);
  - the exclusion of `keepers-note--ch-1`;
  - the owner actions: the production grants and password, `PUBLIC_ORIGIN` and `/media` at deployment, and a browser pass if Task 27 could not render.

  Do not commit or push. Stop and wait. Do not start Phase 4.
  - _Requirements: R12.2, R12.3_
