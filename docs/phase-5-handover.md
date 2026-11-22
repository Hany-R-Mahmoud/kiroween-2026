# Phase 5 handover: launch and polish

Spec: `.kiro/specs/launch-and-polish/` (requirements, design, tasks). Every task is done; none is blocked. Detailed notes, every decision and every database call: `docs/phase-5-notes/decisions.md`. Nothing was committed or pushed by the agent; the Owner pushed `7dac05e`, `f4a9ff4`, `ff7d536` and `967a7cf`. Production checks below were run against `967a7cf` unless stated.

## 1. Production URLs

- Atlas: **https://trick-or-told.vercel.app/**
- Game: **https://trick-or-told.vercel.app/game/** (`/game` without the slash also answers 200)
- Game project alias (rewrite target, public): https://trick-or-true.vercel.app/game/

## 2. Vercel setup

| | Atlas project `trick-or-told` | Game project `trick-or-true` |
|---|---|---|
| Root Directory | `apps/atlas` | `apps/game` |
| Source files outside the root | included (needs `skeleton/`) | included |
| Install command (`vercel.json`) | `cd ../.. && pnpm install --frozen-lockfile` | same |
| Build command | `pnpm build` (`vite build`; Nitro runs because Vercel sets `VERCEL`) | same |
| Framework preset | auto-detected "Vite"; Vercel serves Nitro's `.vercel/output` (Build Output API) | same |
| Node.js | 24.x | 24.x |
| Function region | `pdx1` (next to Neon `aws-us-west-2`) | `pdx1` |
| Domain | production domain `trick-or-told.vercel.app` | its own alias only |
| Deployment Protection | Standard (production open, previews protected) | Standard (production open) |
| Git deployments | `main` only | `main` only |

**Routing, headers and caching come from Nitro route rules, not `vercel.json`.** Nitro's Build Output `config.json` ends in a catch-all route to the server, which came before `vercel.json` rewrites and headers on the first deploy (atlas `/game/` was an atlas 404; the game sent no security headers). The rules now live in one file, `skeleton/src/deploy/vercelRules.ts`, passed to `nitro({ routeRules, vercel: { functions: { regions: ['pdx1'] } } })` in both `vite.config.ts` files (only when `VERCEL` is set, so local builds and `serve-build.mjs` are unchanged). Nitro writes them ahead of its catch-all:

- Atlas: security headers on `/**`; `cache-control: public, max-age=31536000, immutable` on `/media/**` (Nitro adds the same on `/assets/**`); `/game` → `https://trick-or-true.vercel.app/game/` (with the slash: the slash-less target caused a redirect loop on the second deploy) and `/game/**` → `https://trick-or-true.vercel.app/game/**`.
- Game (base `/game/`): security headers on `/game/**`; Nitro's year-long cache on `/game/assets/**`.
- Compression: Vercel's CDN serves brotli for HTML, JS and CSS (checked on production).
- The game's auth cookie is set by responses that come back through the rewrite, so it is a host-only, first-party cookie on `trick-or-told.vercel.app`. `ATLAS_ORIGIN` is unset in production, so `/media` and Hint 2 links stay on the same origin.

**`vercel.json` files** (each keeps exactly `{"git": {"deploymentEnabled": {"*": false, "main": true}}}`):

```json
// /vercel.json (repo root, unchanged)
{"git": {"deploymentEnabled": {"*": false, "main": true}}}
// /apps/atlas/vercel.json and /apps/game/vercel.json (identical)
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "git": { "deploymentEnabled": { "*": false, "main": true } },
  "installCommand": "cd ../.. && pnpm install --frozen-lockfile",
  "regions": ["pdx1"]
}
```

The Services fallback was not needed.

## 3. Production database (Neon project `kiroween-2026`, id `restless-silence-44986466`, branch `main` = `br-delicate-brook-art2crov`)

The dev branch `br-blue-breeze-arxdc1lo` was never written to. All calls and exact statements: `decisions.md` tasks 2.1, 2.3, 2.4, 2.6, 3.2 and `smoke-production.md`.

1. Checked empty (MCP, read only): `list_projects`, `list_branches`, `list_postgres_databases`, `get_database_tables` (none), `list_postgres_roles` (owner only), `get_neon_auth_config` (not enabled).
2. Migrations through the MCP, one `run_sql_transaction` per file, statements split on `--> statement-breakpoint`: `0000_curious_bishop.sql` (38), `0001_runs.sql` (5), `0002_versions_ordinal.sql` (2).
3. Reader role (`run_sql_transaction`), exactly as in `docs/tech-decisions.md`:
   ```sql
   CREATE ROLE atlas_reader NOLOGIN;
   GRANT CONNECT ON DATABASE neondb TO atlas_reader;
   GRANT USAGE ON SCHEMA public TO atlas_reader;
   GRANT SELECT (id, title, region, map_lat, map_lng, era, scare_level, reading_time_min, one_line_hook, cold_open, documented_closing, theme) ON legends TO atlas_reader;
   GRANT SELECT ON chapters, versions, documented_told, sources, anchors TO atlas_reader;
   GRANT SELECT (legend_id, id, usage, size) ON assets TO atlas_reader;
   ```
4. `0003_keepers_note_play_state.sql` (6, ends with `GRANT SELECT ON "keepers_note" TO atlas_reader;`), then `run_sql` `CREATE ROLE atlas_web LOGIN IN ROLE atlas_reader;`.
5. Neon Auth: `provision_neon_auth` (`better_auth`, `neondb`); `update_auth_plugins_organization` off; `add_auth_trusted_domain` `https://trick-or-told.vercel.app` and `https://trick-or-true.vercel.app`. Sign-in methods on production: **email and password** (sign-up open, no email verification) and **Google on Neon's shared credentials**. Production auth base URL `https://ep-flat-wildflower-arvjs35x.neonauth.c-4.us-west-2.aws.neon.tech/neondb/auth`. Application name "Trick or True" (set by the Owner). At the end of the smoke: `update_auth_allow_localhost` false.
6. Owner, in a terminal (connection strings never seen by the agent): `db:import` (12 legends, 147 anchors, 83 chapters, 52 versions, 423 facts), `db:import-keepers-note` (1 note, 3 details), `db:set-atlas-web-password` (`password set: yes`, `copied to clipboard: yes`), `db:check-reader` (all checks passed).
7. Verified (MCP `run_sql`): legends 12, keepers_note 1, keepers_note_details 3, runs 0; `atlas_web` has no SELECT on `runs`, `keepers_note_details`, `player_flags`, `facts`, `legends.model`, and has SELECT on `keepers_note`.
8. Temporary smoke and browser-check users (all on `example.com`) were deleted by exact id with their `runs` and `player_flags` rows. **Production now holds 0 users, 0 runs, 0 player flags.** The judge account was never created or used by the agent.

Never called: `get_connection_string`, `create_credential`, `reset_postgres_role_password`, `prepare_database_migration`.

Note: production has no `drizzle.__drizzle_migrations` rows. Do not run `db:migrate` against production (it would re-run `0000`); apply future migrations by file through the MCP, as above.

## 4. Environment variables (names only; production scope)

| Variable | Atlas | Game | Production value |
|---|---|---|---|
| `ATLAS_DATABASE_URL` | yes | – | new, secret (pooled `atlas_web` string from the password script) |
| `PUBLIC_ORIGIN` | yes | – | `https://trick-or-told.vercel.app` |
| `DATABASE_URL` | – | yes | new, secret (pooled owner string of `main`) |
| `NEON_AUTH_BASE_URL` | – | yes | new (production auth base URL above) |
| `NEON_AUTH_JWKS_URL` | – | yes | new |
| `NEON_AUTH_COOKIE_SECRET` | – | yes | **new, secret, not the dev value** |
| `GAME_TOKEN_KEY` | – | yes | **new, secret, not the dev value** |
| `GUEST_WORLD` | – | yes | `banshee` |
| `FEATURE_ARABIC` | yes | yes | `false` (the Arabic catalog is empty) |
| `ATLAS_ORIGIN` | – | unset | empty: same origin |
| `DATABASE_URL_UNPOOLED` | unset | unset | local only (imports) |

## 5. Files and folders created

- Skeleton: `src/book/` (`Book.tsx`, `book.css`, `bookColors.ts`, `bookPref.ts`, `pagination.ts`, `index.ts`), `src/design/Mood.tsx`, `src/design/mood.css`, `src/deploy/vercelRules.ts`, `src/play/rateLimit.ts`, `src/assets/heroCopy.ts`; `scripts/set-atlas-web-password.ts`, `scripts/smoke-prod.ts`, `scripts/smokeProdLib.ts`; 13 test files (book ×3, hero copy, password script, product name, rate limit, README, smoke lib, theme surface, tutorial lock, vercel config).
- Atlas: `vercel.json`, `.gitignore` (Vercel CLI), `scripts/pipe-response.mjs`, `scripts/book-check.mjs` (`test:browser`), `src/bookHead.ts`, `src/components/bookLabels.ts`, `src/routes/manifest[.]webmanifest.ts`; 8 test files. Deleted: `src/components/AnchorFocus.tsx` (folded into the Book).
- Game: `vercel.json`, `.gitignore` (Vercel CLI), `src/components/ScenePaint.tsx`, `src/server/tutorialRateLimit.ts`, `src/routes/manifest[.]webmanifest.ts`; 7 test files.
- Docs: `docs/phase-5-notes/` (decisions, docs read, mutations, content and assets needed, smoke and browser results, timing and book-check JSON), this file. `README.md` rewritten. `docs/kiro-usage.md` and `docs/tech-decisions.md` extended.
- Git-ignored: `.debug/` (screenshots, split SQL, debug scripts).

## 6. Versions pinned (exact)

| Package | Version | Why |
|---|---|---|
| `nitro` | `3.0.261103-rc` (dev, both apps) | Vercel's TanStack Start guide deploys through it; the only version on npm `latest` (release candidate). Loaded only under `VERCEL`. |
| `sharp` | `0.35.5` (dev, atlas) | builds the 1000 px hero copies at build time (worked on Vercel's build image) |
| `fast-check` | `4.10.3` (dev, atlas) | property test of the local server's stream handling (same pin as game and skeleton) |
| `react` / `@types/react` | `19.3.1` peer + dev / `19.3.0` dev (skeleton) | the shared Book component, using the apps' single React copy |

## 7. Book view

- **One component, both views:** `skeleton/src/book/Book.tsx` renders one DOM tree. "Pages" uses CSS columns inside a clipped viewport and turns with a `transform` (at most 400 ms, no 3D curl, `none` under `prefers-reduced-motion` and `html[data-motion='reduce']`). "Read as one page" only switches `html[data-book]`, so the same text and every anchor exist exactly once in both views; print always uses the one-page layout.
- **Pages:** two-page spread with a gutter shadow from 1024 px inline size, one page below; each chapter starts a new column (`break-before: column`); the hero is a frontispiece before chapter 1. Paper: the existing `shared-atlas-paper-01`, multiplied by a warm tint, with foxing, darker edges and a soft vignette; no new image. Inside the paper, the dark-theme colours (glow, accent, muted, ink) are re-pointed at the book ink `#2b1d12` (5.47:1 on the darkest paper) and accent `#4a1c12` (4.80:1); every pack keeps its display font.
- **Controls:** previous/next buttons, "Page n of m" live region, arrow keys (swapped in right to left), Home/End/PageUp/PageDown, swipe with `touch-action: pan-y`, focus turning to the page of the focused element, reflow on resize and font load that keeps the first visible text (the hash wins).
- **Anchors:** on load and on `hashchange` the Book opens the page that holds the anchor's heading and focuses it without scrolling the window. `/anchor/<anchor>` and Hint 2 links (`atlasUrl` unchanged) land the same way. `/anchor/keepers-note--ch-1` was checked on production.
- **Toggle:** catalog label `book.readAsOnePage`, remembered in `localStorage` (`kiroween.book.v1`); a tiny inline `<head>` script sets `html[data-book]` before first paint.
- **Where:** every atlas legend page and the Keeper's Note (the "Fiction" label stays above the book). The game's spirit panel and tutorial question use the same paper class and tokens (one page, no controls).

## 8. Mood layer (CSS and DOM only; no image, sound or library)

| Effect | How | Reduced motion |
|---|---|---|
| Vignette | fixed page layer behind content; corner shade on scene viewports | static (unchanged) |
| Candlelight | fixed layer, 8 s cycle in 7 steps (about one change per 1.1 s) | no animation, fixed brightness |
| Fog | short band (at most 22 % of the stage, 9 rem cap) painted under the hotspots, 60 s drift | no drift |
| Worn and torn edges | ink border and inner shadow on panels; atlas chapter plates add the shared paper texture as a luminance mask | static |
| Hotspot glow | faint glow on hover and focus; the 3 px focus outline and 44 px targets unchanged | no transition |
| Loading lines | catalog lines in the story's voice (`loading.study`, `loading.room`, `loading.page`) | – |

Every overlay has `pointer-events: none`; layers are hidden in print. No symbols, no imagery beyond the shared paper, nothing imitating a film, game or brand.

## 9. Speed (Slow 4G: 1.6 Mbps, 150 ms RTT, 4× CPU, cache off, 390 px; scene paint, median of 3)

| Screen | Phase 4 (local, copied) | Phase 5 production, run 1 (4.7, `ff7d536`) | run 2 (10.7, `967a7cf`, heavy machine load) | Budget 3000 ms |
|---|---|---|---|---|
| Hall | 5845 ms | **3714 ms** (−36 %) | 4025 ms | fail |
| Tutorial_Room | 4883 ms | **3535 ms** (−28 %) | 3969 ms | fail |
| Banshee scene 1 | 10436 ms | **4521 ms** (−57 %) | 4848 ms | fail |

- Fixes: secondary images (sprites, spirit figure, meter frame) start only after the scene image loads or fails; brotli and year-long caching on production (JS and CSS about 510 KB → about 165 KB on the wire); phones get a 1000 px hero copy through `<picture media="(max-width: 1000px)">` with no density descriptors (390 px at pixel ratio 1, 2 and 3 picks the small copy; the Banshee hero copy is 89 KB against 292 KB).
- Remaining cause, measured: the scene images themselves (Hall 318 KB, Tutorial 309 KB, Banshee 431 KB) arrive at 3.5–4.8 s after first paint at about 1 s. They are under `assets/` and were not changed; the budget was not changed. Phone-width copies are listed as optional in the Needs_File.
- Paper texture on Slow 4G (production): 1001 → 2894 ms, 52 KB; it loads after first paint, the paper shows its tint until then. Mood layer: no extra request or image.
- Measured in Phase 5: every production number above, the local D4 run (`decisions.md`) and the book checks. Copied: the Phase 4 column.

## 10. Tests

- `pnpm -r test` (no database, no network): **skeleton 60 files, 796 passed, 8 expected fail; atlas 18 files, 228 passed; game 26 files, 293 passed.** Typecheck clean in all three; secret scan clean. Phase 1 to 4 tests all green (the play-test helper now gives its World players a done tutorial, the lock's precondition; no assertion weakened).
- New tests cover anchors-once (Property 10), the one-page toggle, reduced motion for page turns, candle and fog, image deferral (Property 11), the tutorial lock (Property 12), the rate limit (Properties 1 and 15 and the HTTP layer), the Nitro route rules and built Vercel output, manifests and icon ids, hero copy choice (Properties 2 and 3), the password script (Property 13), book pagination and colours (Properties 4 to 8), panel heading contrast (Property 9), local server streams (Property 14), product names, README and the smoke script's helpers.
- 32 mutation checks, each recorded with the mutation, the failing test and the restore in `docs/phase-5-notes/mutations.md`.
- Note: two full runs earlier in the phase timed out (21 and 26 min) while other apps held the machine at load average 8 to 47; the same suite takes about 150 s otherwise. Nothing was changed for it.

## 11. Production smoke and browser checks

Smoke (`docs/phase-5-notes/smoke-production.md`), all steps PASS: headers on `/`, `/game/` and `/media`; brotli on JS of both apps; guest Hall (one open door, eleven locked), tutorial and Banshee win; temporary user: World refused before the tutorial (403), tutorial, Baba Yaga win, the won row with its score in the server's own run list; `/anchor/keepers-note--ch-1` holds the anchor once; 88 responses with no answer data before the end of a run; burst: 429 at answer 31 with the fixed text; key: the limit behind the proxy is keyed on the visitor (no FINDING). One network error in the first headers run passed on its rerun.

Headless Chrome on production (`browser-production.json`): keyboard only as guest, Hall → tutorial → Banshee curse broken, 13 PASS; keyboard only **signed in** (temporary user), tutorial solved in the page and the Banshee curse broken, 14 PASS (server confirmed); 390 px touch 15 PASS; reduced motion 4 PASS; book view at 390 and 1280 px 292 PASS, 1 FAIL that passed on its rerun (draugr at 1280, load timeout), 1 SKIP (right-to-left keys, flag off); `/game` without the slash hydrates with no failed request; 0 CSP violations on five pages.

## 12. Security headers and rate limit

- Headers on every atlas and game response, each once: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, and a CSP: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`. `'unsafe-inline'` stays because Start's server-rendered inline scripts and theme style attributes need it; `form-action` is left out so the sign-in redirect is not blocked.
- Rate limit: 30 tutorial answers per 60 s per visitor address (`x-forwarded-for` first entry, else `x-real-ip`), in server memory, on `tutorialAct` only; over the limit: 429 "Too many tries. Wait a moment." No address: not limited (fail open); no shared bucket. Counts are per instance and reset on a cold start, so this slows a guessing script and does not stop a determined one. Change the values in `skeleton/src/play/rateLimit.ts` and the smoke's burst expectation.
- Tutorial lock: a signed-in player without `tutorial_done_at` gets 403 "Do the tutorial first." from `startWorld` before any run is read or created; the World screen then shows the locked-door message and a button to the study. Guests keep the Hall check only (their receipt lives in the browser; a server check would change the play schema).
- Local servers: the atlas `serve-build.mjs` no longer exits on "Stream lifetime exceeded" (`pipe-response.mjs`); on Vercel aborted streams did not affect the next request. The game `serve-build.mjs` listens on `localhost` only.
- Accepted findings: open sign-up without email verification (junk accounts possible); the game alias is public with the same headers, CSRF and auth.

## 13. Bugs found and fixed in this phase (beyond the plan)

- The rate limiter pulled the database schema into a client bundle (moved to a server-only module; a test now guards it).
- Dark-theme colours on the paper fell to 1.0–2.3:1 (re-pointed to the book ink and accent).
- **Signed-in players could not finish the tutorial in the page** (their client kept no tutorial token, so each answer was refused with the session error). Found from the Owner's dev-server report; fixed in `playClient.ts`; verified end to end on production.
- Production routing (Nitro catch-all ahead of `vercel.json`) and the `/game/` redirect loop.
- Phase 4 browser-check script: closed its own game page on a shared origin; default screenshots under `docs/` (now `.debug/`).

## 14. Skills used and findings

| Skill | Findings |
|---|---|
| read-the-damn-docs | TanStack Start on Vercel through Nitro; one domain per project, so `/game` by rewrite; Standard Protection leaves production open; Vercel overwrites `x-forwarded-for`; Nitro route rules and the installed Nitro Vercel preset (rules written ahead of the catch-all); Neon Auth production checklist and shared Google credentials; install criteria (no service worker needed); sharp resize/webp; Kiro powers (Neon listed, no Vercel; not installed, the Neon MCP was already configured). All pages loaded. |
| ponytail | two projects and rewrites, not Services; in-memory rate limit, not a firewall rule; one Book with CSS columns; paper class for one-page game panels; no service worker. |
| agent-security | false positives only from the scanner; S1 (rate-limit key behind the proxy) checked on production and closed; open sign-up accepted; localhost sign-in turned off. |
| agent-tester | 32 mutations; gaps found and closed (stream errors, `localhost` binding, signed-in tutorial in a real page). |
| agent-guard | unused re-exports removed; one helper for four copies of a condition; test-only seams flagged and kept. |
| impeccable | launcher `context` and `detect` ran (two false positives); found the dark-theme colours on paper and the spirit caption order bug. |
| verify-and-stop | one proof pass per group; open items below. |
| Not used | agent-pilot, agent-superpowers, agent-gamestudio (they start their own workflows). |

## 15. Catalog keys added or changed (English text, for your wording review; Arabic falls back)

| App | Key | English |
|---|---|---|
| atlas | `app.title` (changed) | Trick or Told |
| game | `app.title` (changed) | Trick or True |
| atlas | `loading.page` | Turning the pages by candlelight… |
| game | `loading.study` (replaces `tut.loading`) | The study is dark. Someone is lighting a candle… |
| game | `loading.room` (replaces `world.loading`) | The room is waking up. The candle leans toward you. |
| game | `tut.reward.line` | One slot is lit. It waits for your first relic. |
| game | `error.tooManyTries` | Too many tries. Wait a moment. |
| atlas and game | `book.region` | Story pages |
| atlas and game | `book.previous` | Previous page |
| atlas and game | `book.next` | Next page |
| atlas and game | `book.pageOf` | Page {n} of {m} |
| atlas and game | `book.readAsOnePage` | Read as one page |
| game | `hub.cabinet.empty` (removed) | was "An empty slot." |

The server's fixed error "Do the tutorial first." is a play error message in the skeleton, not a catalog key; the World screen shows the existing `hub.door.locked` text for it.

## 16. Content and assets still needed (`docs/phase-5-notes/content-and-assets-needed.md`)

- App icons, PNG: `icon-192` (192×192), `icon-512` (512×512), `icon-maskable-512` (512×512, art inside the inner 80 %), `apple-touch-180` (180×180, no transparency), in both `apps/game/public/icons/` and `apps/atlas/public/icons/`. The manifests and links already point at them; they 404 until added.
- `el-coco-game-hotspot-04`: a cleaned sprite without the opaque bottom strip.
- Optional, for the speed budget: 1200 px phone copies of the three first scenes (needs a small game change).
- Optional: a favicon for the atlas.

## 17. Before the submission (Owner)

1. Create the judge account at https://trick-or-told.vercel.app/game/sign-up with a password from your password manager; put its credentials only in the private Devpost field.
2. Sign in with Google once on the live site (shared credentials show Neon's name on the consent screen; your own Google client steps are in `decisions.md` task 2.4).
3. Add the eight icon files and push.
4. Review the catalog wording in section 15.
5. Optional: own SMTP sender in Neon Auth, then email verification codes (closes the open sign-up finding).
6. Final Devpost fields: the two URLs above, `README.md`, `docs/kiro-usage.md`.
