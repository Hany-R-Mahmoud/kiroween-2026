# Implementation Plan: Launch and Polish (Phase 5)

## Overview

Language: TypeScript (strict), as in the design. Tasks run one at a time, in the order below, in one thread. Groups G1 to G10 are the top-level tasks 1 to 10 and follow the design's task-group table. The three security-relevant Phase 4 leftovers (rate limit, tutorial lock, atlas stream crash) sit in G1, as the design proposes.

**Rules that apply to every task** (Requirements 1, 2, 25):
- No sub-agent asks the Owner a question. Each choice the agent makes is recorded in `docs/phase-5-notes/decisions.md` and work continues.
- No Secret is read, printed or written. `.env` is never read. Read-only git only. No commit, no push. Nothing under `content/` or `assets/` is edited.
- A task that fails after two real fix attempts is marked blocked with its reason in the decisions file; work moves to the next independent task. More than two blocked tasks is a Stop.
- Tests are never optional. Every new test is also run against a deliberately broken rule by hand (mutation check); the mutation and the failing test name go in `docs/phase-5-notes/decisions.md` and `docs/phase-5-notes/mutations.md`.
- **STOP** tasks are points where the agent halts and waits for the Owner. The agent does not continue past one until the Owner has done the step or approved.
- Skill gating per group: `agent-guard` after every group; `agent-security` only after G1, G2, G3 and G10 (deployment config, secrets, headers, rate limit, database roles, auth, tutorial lock); `impeccable` in the thread (no reviewer sub-agent) after groups with UI changes; `read-the-damn-docs` before groups with outside-doc facts; `agent-tester` after groups that add tests; `verify-and-stop` at the end of each group; `ponytail` throughout. Skills that start sub-agents or their own workflow (agent-pilot, agent-superpowers, agent-gamestudio) are not used.

## Tasks

- [x] 1. G1: Hosting config, headers, Nitro, local Vercel-style build, server fixes, rate limit, tutorial lock
  - [x] 1.1 Prepare notes folder and read the Vercel docs
    - Run `read-the-damn-docs` for TanStack Start on Vercel, multiple projects under one domain, rewrites, Deployment Protection and headers. Record pages and dates in `docs/phase-5-notes/docs-read.md`.
    - Create `docs/phase-5-notes/decisions.md` and `docs/phase-5-notes/mutations.md`. Add `.debug/` to `.gitignore`.
    - _Requirements: 1.3, 1.6, 2.5, 2.6, 4.1_

  - [x] 1.2 Add the Nitro plugin to both apps behind `VERCEL`
    - Edit `apps/atlas/vite.config.ts` and `apps/game/vite.config.ts`: `...(process.env.VERCEL ? [nitro()] : [])` after `tanstackStart()`. Pin `nitro` to an exact version in both `package.json` files and record the version.
    - _Requirements: 4.2, 4.13_

  - [x] 1.3 Write `apps/atlas/vercel.json` and `apps/game/vercel.json`
    - Each keeps `git` exactly `{"deploymentEnabled":{"*":false,"main":true}}`, plus `installCommand` and `headers` (four security headers and the CSP from the design; immutable cache on `/media/:path*`, `/assets/:path*`, `/game/assets/:path*`).
    - Atlas file also holds the two `/game` rewrites with a clearly marked placeholder for the game alias. The repo-root `vercel.json` is not changed.
    - Record in decisions.md that the CSP uses `'unsafe-inline'` and why (Requirement 8.3), and the `immutable` risk.
    - _Requirements: 4.2, 4.3, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 8.1, 8.2, 8.3, 12.1_

  - [x] 1.4 Write the config test for `vercel.json` files
    - Test: `git` key of all three files is deep-equal to the required object; atlas all-paths rule and game rule hold `X-Content-Type-Options`, `Referrer-Policy` and a CSP with `frame-ancestors`; cache rules present.
    - Mutation: delete `nosniff` from the atlas rule, confirm failure, restore by hand.
    - _Requirements: 4.10, 8.1, 8.4, 26.8, 26.12_

  - [x] 1.5 Run the local Vercel-style build of both apps
    - Run `VERCEL=1 pnpm --filter @kiroween/atlas build` and `VERCEL=1 pnpm --filter @kiroween/game build`. Fix each build error.
    - Check `.output/`, `.vercel/`, `.nitro/` are git-ignored (read-only `git status`); add any missing one to `.gitignore`. Do not delete them. Then run the normal builds again and confirm `serve-build.mjs` still works.
    - _Requirements: 4.13, 1.4, 1.5_

  - [x] 1.6 Fix the atlas local server crash
    - Reproduce or explain the "Stream lifetime exceeded" exit first. Create `apps/atlas/scripts/pipe-response.mjs` (`stream.pipeline`, ignore premature-close and lifetime errors, cancel body on client close) and use it in `apps/atlas/scripts/serve-build.mjs`.
    - Read the Nitro/Vercel docs on stream errors and record whether Vercel has the same problem (the production abort check is in 3.2).
    - Write `apps/atlas/test/pipe-response.property.test.ts`. **Property 14: The local server survives stream errors.** Mutation: remove the error callback, confirm failure, restore.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 26.12_
    - **Validates: Requirements 9.2**

  - [x] 1.7 Bind the game local server to `localhost`
    - Change `listen(port, 'localhost')` in `apps/game/scripts/serve-build.mjs`. Run `apps/game/scripts/smoke.mjs`. If it fails, keep the old binding and record the reason.
    - _Requirements: 23.5, 23.6_

  - [x] 1.8 Implement the rate limiter
    - Create `skeleton/src/play/rateLimit.ts` with `createRateLimiter`, `visitorKey` (returns `null` when no valid header; no shared fallback key) and the constants (30 per 60 s, `maxKeys` 5000), with a comment on how to change them.
    - Write `skeleton/test/rate-limit.property.test.ts`. **Property 1: Rate limiter counts per key and window.** **Property 15: The rate-limit key is the visitor address, or nothing.**
    - Record the limit values and the fail-open choice in decisions.md.
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.6, 10.7_
    - **Validates: Requirements 10.2, 10.3, 10.6, 10.7**

  - [x] 1.9 Apply the limiter to `tutorialAct`
    - Add the middleware in `apps/game/src/server/middleware.ts` and wire it in `apps/game/src/server/functions.ts`. On excess: status 429, fixed text "Too many tries. Wait a moment.", new Catalog key `error.tooManyTries`. A request with no key is not limited.
    - Write the HTTP-layer test: within limit passes unchanged, 31st call gets 429, body holds no answer, key is not logged, fear amounts and tutorial rules untouched.
    - Mutation: raise the limit to 10000, confirm failure, restore.
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 26.7, 26.12_

  - [x] 1.10 Implement the tutorial lock
    - Add `'tutorial-required'` (403, "Do the tutorial first.") to `skeleton/src/play/errors.ts`. In `startWorld` (`skeleton/src/play/service.ts`) check `store.tutorialDone` for signed-in visitors before reading or creating a run. Guests: no change; record the decision and reason in decisions.md.
    - Map the error code to the existing locked-door message in `apps/game/src/components/StartRetry.tsx` and `Hall.tsx`.
    - Write `skeleton/test/tutorial-lock.property.test.ts`. **Property 12: The tutorial lock decides starts for signed-in players.** Add the Hall message-mapping test.
    - Mutation: remove the `tutorialDone` check, confirm failure, restore.
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 26.6, 26.12_
    - **Validates: Requirements 23.1, 23.2**

  - [x] 1.11 G1 gates
    - Run `pnpm -r test`. Run `agent-tester`, `agent-guard` and `agent-security` (deployment config, headers, rate limit, tutorial lock). Fix findings. Run `verify-and-stop` on G1 acceptance.
    - _Requirements: 1.7, 25.5, 26.1_

  - [x] 1.12 **STOP (Owner step): create the two Vercel projects**
    - Give the Owner the exact steps and settings from the design's hosting table (Root Directory, outside-source files on, Node 24.x, Deployment Protection off for the game project, domain on the atlas project). Wait.
    - After the Owner gives the Production_Origin and the game alias, write the alias into the atlas rewrites (no Secret involved) and re-run task 1.4's test.
    - _Requirements: 3.2, 4.11_

- [x] 2. G2: Production database, Neon Auth, Password_Script
  - [x] 2.1 Read Neon docs and check the empty production branch
    - Run `read-the-damn-docs` for Neon Auth trusted domains, OAuth, and the production checklist. Record in `docs-read.md`.
    - With the Neon MCP: `list_projects`, `list_branches`, `describe_branch`, `get_database_tables` (expect none), `list_postgres_databases`. Record each call.
    - _Requirements: 5.1, 5.3, 25.1_

  - [x] 2.2 Write the Password_Script
    - Create `skeleton/scripts/set-atlas-web-password.ts` as in the design (psql via environment variables and stdin, `randomBytes(24)` base64url, `pbcopy`, prints only yes/no). Fall back to the `pg` driver only if `psql` is missing.
    - Write `skeleton/test/password-script.property.test.ts` with faked `psql` and `pbcopy`. **Property 13: The Password_Script prints no secret and copies only on success.**
    - Mutation: print the password on failure, confirm failure, restore.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 26.11, 26.12_
    - **Validates: Requirements 6.2, 6.3, 6.4**

  - [x] 2.3 Build the production database through the Neon MCP
    - In order, each with `run_sql_transaction` per file or statement list: migrations 0000, 0001, 0002; the six reader-role statements; migration 0003; `CREATE ROLE atlas_web LOGIN IN ROLE atlas_reader;`. Split files on `--> statement-breakpoint`.
    - Record every call (tool name and exact statement) in decisions.md. Never call `get_connection_string`, `create_credential`, `reset_postgres_role_password` or `prepare_database_migration`. On a failed statement, stop and report; no changed SQL without approval.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 25.1_

  - [x] 2.4 Set up Neon Auth for production
    - `provision_neon_auth`, `get_neon_auth_config`, `add_auth_trusted_domain` (Production_Origin and game alias origin), enable email-and-password and Google, organization plugin off. Do not create or sign in to the judge account.
    - Record the Google shared-credentials decision and the Owner steps for own credentials in decisions.md.
    - _Requirements: 5.7, 5.8, 5.9, 5.10, 25.1_

  - [x] 2.5 **STOP (Owner step): all G2 Owner steps at once**
    - Give the Owner the exact steps in this order: (1) copy the direct connection string, run `DATABASE_URL_UNPOOLED="$(pbpaste)" pnpm --filter @kiroween/skeleton db:import`, then the same prefix with `db:import-keepers-note`; (2) run the password script; (3) run `db:check-reader` with the clipboard value; (4) paste the same clipboard value into Vercel as `ATLAS_DATABASE_URL` for the atlas project before copying anything else; (5) set the remaining environment variables for both projects (names per project from the design table, plus `FEATURE_ARABIC=false`, `GUEST_WORLD=banshee`; names and places only, no values). Ask only for the yes/no output. Wait.
    - _Requirements: 3.2, 5.1, 6.1, 6.2, 6.5, 6.6, 6.7_

  - [x] 2.6 Verify the production database
    - Run the step-7 queries through the MCP: counts 12, 1, 0; privilege checks for `atlas_web`. Record results. Confirm no dev rows were copied.
    - _Requirements: 5.4, 5.5_

  - [x] 2.7 G2 gates
    - Run `pnpm -r test`. Run `agent-tester`, `agent-guard` and `agent-security` (database roles, auth, secrets). Run `verify-and-stop`.
    - _Requirements: 25.5, 26.1_

- [x] 3. G3: First deploy and early production check
  - [x] 3.1 **STOP (Owner step): push to `main`**
    - Tell the Owner to push and to check that the game alias opens without a Vercel login. Wait for the deploy.
    - _Requirements: 3.2, 4.11_

  - [x] 3.2 Check the first deploy
    - Check: `GET /game/` is not the atlas 404; one `/media` file is served; `Cache-Control` on `/media`; `Content-Encoding` on one JS file of each app; four security headers on `/` and `/game/`; abort a request mid-stream and confirm the next request succeeds. Record yes/no results only.
    - On a miss, fix the Vercel setting or config and re-check. If the rewrite or `INVALID_ORIGIN` cannot be fixed, **STOP** under Requirement 3.3 and give the Owner the Services change list from the design.
    - _Requirements: 4.4, 4.5, 4.6, 4.7, 4.12, 8.5, 9.3, 12.2, 12.3_

  - [x] 3.3 G3 gates
    - Run `agent-security` (headers, deployment config), then `agent-guard` and `verify-and-stop`.
    - _Requirements: 25.5_

- [x] 4. G4: Image deferral, hero copies, hotspot screenshots, production timing, Mid_Phase_Stop
  - [x] 4.1 Defer secondary images until the scene loads
    - Create `apps/game/src/components/ScenePaint.tsx` (context). Update `SceneViewer.tsx`, `SpiritPanel.tsx`, `FearMeter.tsx`, `WorldPlay.tsx`, `TutorialRoom.tsx`, `Hall.tsx` as in the design (same-size span placeholder, settle on load and error, handle already-complete image).
    - Update `viewer.test.ts` and `fear-ui.test.ts`. Write `apps/game/test/scene-deferral.property.test.tsx`. **Property 11: Secondary images wait for the scene.**
    - Mutation: render sprites without the `loadedSceneId` check, confirm failure, restore.
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 26.5, 26.12_
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.6**

  - [x] 4.2 Serve smaller hero copies to phones
    - Add `sharp` (exact pin, devDependency of the atlas) and record the justification in decisions.md and `docs/tech-decisions.md`. Create `skeleton/src/assets/heroCopy.ts`. Extend `apps/atlas/vite.media.ts` to write `<id>-w1000.webp` into build output only. Update `Img.tsx`, `LegendPage.tsx` and the legend preload link to use `picture` with `media="(max-width: 1000px)"` and no density descriptors. Emit the `source` only when the copy was generated.
    - If copies cannot be made without writing to Protected_Paths, record in the Needs_File instead.
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_

  - [x] 4.3 Test the hero copy choice
    - Write `skeleton/test/hero-copy.property.test.ts`. **Property 2: Hero copy is chosen by viewport width only.** **Property 3: Hero copy keeps the aspect ratio.**
    - Write the markup test (one `picture`, one `source`, no `x`/`w` descriptors) and extend the WebP-header test for width 1000. Check 390 px at ratios 1, 2 and 3.
    - Mutation: swap the media query to `min-width`, confirm failure, restore.
    - _Requirements: 13.3, 13.4, 13.5, 13.8, 13.9, 26.10, 26.12_
    - **Validates: Requirements 13.3, 13.4, 13.5, 13.8, 13.9**

  - [x] 4.4 Add the layout screenshot scenario
    - Add `--only layout` to `apps/game/scripts/browser-check.mjs` (dev server with `?layout=1`, output to `.debug/screens/`, one file per scene of the Hall, Tutorial_Room and twelve Worlds). Add the test that fails when `scene-outline` appears in built client JS.
    - Run it. List every path in decisions.md next to the guessed hotspots from `docs/phase-4-notes/layout-open-matches.md`.
    - _Requirements: 2.5, 2.6, 21.1, 21.2, 21.3, 21.5_

  - [x] 4.5 G4 code gates
    - Run `pnpm -r test`. Run `agent-tester`, `impeccable` (in the thread), `agent-guard`, `verify-and-stop`.
    - _Requirements: 25.5, 26.1_

  - [x] 4.6 **STOP (Owner step): push to `main`**
    - Tell the Owner to push so the speed fixes deploy. Wait.
    - _Requirements: 3.2_

  - [x] 4.7 Measure production speed
    - Run `browser-check.mjs --only timing` with `--game` and `--atlas` set to the Production_Origin, Slow_4G_Profile, 3 runs for the Hall, Tutorial_Room and Banshee scene 1. Save `docs/phase-5-notes/timing-production.json` with three paint values, median, total and image transfer, pass/fail against 3000 ms, and the Phase 4 numbers (5845, 4883, 10436 ms) next to them. On a miss, report the measured cause. Do not change the budget or any image.
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 12.2_

  - [x] 4.8 **STOP (Mid_Phase_Stop): Owner review**
    - Give the Owner both production URLs, the timings per screen and every hotspot screenshot path. Make no change for G5 to G6 while waiting. Start G5 only after the Owner's feedback; keep any hotspot corrections for task 8.1.
    - _Requirements: 3.5, 7.1, 7.2, 7.3, 7.5_

- [x] 5. G5: Book component, anchors, toggle, ink and motion (starts after the Mid_Phase_Stop)
  - [x] 5.1 Add the book foundations in the Skeleton
    - Add `react` as peer and dev dependency (same pin as the apps) and `jsx: react-jsx` to the skeleton tsconfig. Create `skeleton/src/book/` with `pagination.ts`, `bookPref.ts`, `bookColors.ts`, `book.css` (tokens `--book-*`, paper from `shared-atlas-paper-01`, no new image) and `index.ts`. Add the `@kiroween/skeleton/book` package export.
    - _Requirements: 15.2, 15.5, 15.12, 17.4, 18.1, 18.5_

  - [x] 5.2 Test the pure book logic
    - Write `skeleton/test/book-pagination.property.test.ts`. **Property 4: An anchor's page makes the anchor visible.** **Property 5: Reflow keeps the reader on the same text, and the hash wins.** **Property 6: Page keys move within bounds in either direction.** **Property 7: The reading-mode preference round-trips.**
    - Mutation: make `pageOfOffset` ignore the gutter, confirm failure, restore.
    - _Requirements: 15.8, 15.9, 15.11, 15.13, 16.1, 16.2, 16.3, 16.6, 17.4, 26.2, 26.12_
    - **Validates: Requirements 15.8, 15.9, 15.11, 15.13, 16.1, 16.2, 16.3, 16.6, 17.4**

  - [x] 5.3 Test and extend ink contrast
    - Extend the contrast test; write `skeleton/test/book-colors.property.test.ts`. **Property 8: Book ink and accent reach 4.5:1 on the paper.** Run for all twelve packs, the base theme and the Keeper's Note page.
    - _Requirements: 18.1, 18.2, 18.5_
    - **Validates: Requirements 18.1, 18.2**

  - [x] 5.4 Build the Book component
    - Create `Book.tsx`: one DOM tree, CSS columns, transform page turn (at most 400 ms, no 3D, `none` under Reduced_Motion including `html[data-motion='reduce']`), spread at 1024 px and wider, chapter `break-before: column`, hero frontispiece, previous/next buttons, "page n of m" live region, arrow/Home/End/PageUp/PageDown keys (swapped in RTL), swipe with `touch-action: pan-y`, `focusin` page turn, `ResizeObserver` and `document.fonts.ready` reflow, "Read as one page" toggle from the Catalog (new keys in both catalogs), print forces scroll layout, Scroll_View fallback when columns or `ResizeObserver` are missing. Logical CSS only.
    - _Requirements: 15.1, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9, 15.10, 15.11, 15.12, 15.13, 17.1, 17.2, 17.3, 17.5, 17.6, 18.3, 18.4_

  - [x] 5.5 Integrate the Book into the atlas
    - Use it in `LegendPage.tsx` and `KeepersNotePage.tsx` (keep the "Fiction" label outside the paginated flow). Add the inline `<head>` script reading `kiroween.book.v1`. Set `defaultHashScrollIntoView: false` in `router.tsx`. Fold `AnchorFocus.tsx` into the Book (hash and `hashchange` landing, focus with `preventScroll`, `data-landed`). Leave `atlasUrl` unchanged. Confirm `/anchor/keepers-note--ch-1` opens the Keeper's Note at that anchor.
    - _Requirements: 15.1, 16.1, 16.2, 16.3, 16.5, 16.7, 17.4, 19.12_

  - [x] 5.6 Integrate the Book into the game
    - Wrap the spirit panel and tutorial question text (fits one page, no controls). Make `apps/game/src/lib/motion.ts` also set `document.documentElement.dataset.motion`.
    - _Requirements: 15.1, 18.4_

  - [x] 5.7 Write the book markup and anchor tests
    - `apps/atlas/test/anchors-once.test.tsx`. **Property 10: Every stored anchor appears once in the rendered page** (twelve legends and the Keeper's Note, both modes). Add the example tests: same content subtree for both preferences, hero before chapter 1, print rule, only `shared-atlas-paper-01` in `book.css`, transition at most 400 ms and `none` under reduced motion, toggle label from the Catalog. Extend `logical-css.test.ts` to `skeleton/src/book`.
    - Mutations: render a chapter only in `pages` view; drop the hash handler; remove the reduced-motion rule. Confirm each fails, restore by hand.
    - _Requirements: 15.2, 15.7, 15.12, 16.4, 17.3, 17.5, 18.3, 18.4, 26.2, 26.3, 26.4, 26.12_
    - **Validates: Requirements 16.4**

  - [x] 5.8 Write `book-check.mjs` and run `test:browser` (first run)
    - Create `apps/atlas/scripts/book-check.mjs` (DevTools protocol, no new dependency) and the script `pnpm --filter @kiroween/atlas test:browser`. For twelve legends and the Keeper's Note at 390 px and 1280 px: open every stored anchor by hash (heading visible and focused), chapters start at page boundaries, no horizontal page scroll, controls, arrow keys, swipe, indicator, toggle keeps the chapter. Run against the local built atlas and save `docs/phase-5-notes/book-check-g5.json`. A failure is a failing test.
    - Record paper texture load time on the Slow_4G_Profile in decisions.md.
    - _Requirements: 15.10, 16.1, 16.2, 16.3, 17.6, 18.6, 26.2, 28.8_

  - [x] 5.9 G5 gates
    - Run `pnpm -r test`. Run `agent-tester`, `impeccable` (in the thread), `agent-guard`, `verify-and-stop`.
    - _Requirements: 25.5, 26.1_

- [x] 6. G6: Halloween mood layer
  - [x] 6.1 Build the mood layer
    - Create `skeleton/src/design/mood.css` and `Mood.tsx`; wire into both root routes. Vignette, candlelight (at most 3 changes a second), bottom fog below hotspots, torn edges via the existing paper asset as mask with an ink-border fallback, hotspot hover/focus glow, in-voice loading lines from new Catalog keys in both catalogs. Static equivalents under Reduced_Motion. CSS and DOM only; no image, sound or library; no gore, occult symbol or imitation.
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9, 19.10, 19.11, 19.12_

  - [x] 6.2 Test the mood layer
    - Tests: candle keyframes give at most 3 changes a second; every mood element has `pointer-events: none`; every animation is `none` under reduced motion; hotspot boxes stay at least 44 by 44; logical-CSS test extended to `mood.css`; "Fiction" label still present on the Keeper's Note page.
    - Mutation: remove the reduced-motion rule for candle and fog, confirm failure, restore.
    - _Requirements: 19.3, 19.8, 19.10, 19.12, 26.4, 26.12_

  - [x] 6.3 Measure the mood layer cost
    - Run the Slow_4G timing locally with the layer on; record load and paint effect in decisions.md.
    - _Requirements: 19.13_

  - [x] 6.4 G6 gates
    - Run `pnpm -r test`. Run `agent-tester`, `impeccable` (in the thread), `agent-guard`, `verify-and-stop`.
    - _Requirements: 25.5, 26.1_

- [x] 7. G7: Installable apps
  - [x] 7.1 Read the install criteria
    - Run `read-the-damn-docs` for current install criteria. Record the criteria and the date in decisions.md. Add a service worker only if the criteria require one (smallest worker, no play response cached).
    - _Requirements: 20.3, 20.9_

  - [x] 7.2 Add manifests and icon links
    - Create `apps/game/src/routes/manifest[.]webmanifest.ts` (scope `/game/`) and the atlas equivalent (scope `/`). Names from the Catalog title keys. Link the manifest, set `theme-color` and `apple-touch-icon` in both root routes, pointing at PNG paths.
    - Create `docs/phase-5-notes/content-and-assets-needed.md` with a row per icon (192, 512, maskable 512, apple-touch 180) for each of `apps/game/public/icons/` and `apps/atlas/public/icons/`. Create no icon file.
    - _Requirements: 20.1, 20.2, 20.4, 20.5, 20.6, 20.7_

  - [x] 7.3 Test the manifests
    - Test fields, scopes, Catalog names, PNG paths, every manifest icon id and the apple-touch id having a Needs_File row, links in both root routes, no icon file and no service worker file created.
    - Mutations: rename an icon id in the manifest; delete its Needs_File row. Confirm failure, restore.
    - _Requirements: 20.1, 20.2, 20.4, 20.5, 20.8, 26.9, 26.12_

  - [x] 7.4 G7 gates
    - Run `pnpm -r test`. Run `agent-tester`, `agent-guard`, `verify-and-stop`.
    - _Requirements: 25.5, 26.1_

- [x] 8. G8: Phase 4 polish, hotspot corrections, product-name test
  - [x] 8.1 Apply the Owner's hotspot corrections
    - Apply the corrections from the Mid_Phase_Stop to the layout data in `apps/game/src/layout/` and run the game layout test. If none were sent, record that.
    - _Requirements: 7.4, 21.4_

  - [x] 8.2 Fix `resolveTheme` surface contrast
    - Check pack glow against the surface and the background; fall back to base glow, then ink. Write `skeleton/test/theme-surface.property.test.ts`. **Property 9: Panel headings reach 4.5:1 on the surface.** Include spring-heeled-jack.
    - Rerun the theme tests and the atlas and game tests that use `resolveTheme`.
    - Mutation: revert the surface check, confirm failure, restore.
    - _Requirements: 22.1, 22.2, 22.7, 22.8, 26.12, 26.14_
    - **Validates: Requirements 22.1, 22.2**

  - [x] 8.3 Fix the Hall reward, spirit panel order and ending dialog
    - Remove "An empty slot."; tutorial reward as a Catalog sentence. Make `.spirit-panel-body` and `.spirit-caption` colour order explicit. Close the ending dialog on Escape and keep focus inside until closed.
    - Fix every remaining bug or AA failure in `docs/phase-4-notes/impeccable-review.md`; list the items left open with reasons in decisions.md.
    - One test per fixed item. Mutation: remove the Escape handler, confirm failure, restore.
    - _Requirements: 22.3, 22.4, 22.5, 22.6, 22.7, 22.8, 26.12_

  - [x] 8.4 Add the product-name test
    - Test that Catalog title strings do not appear as literals in `apps/*/src` outside the Catalog files. Read names from the Catalog so the test follows a rename. Do not choose final names.
    - _Requirements: 24.8, 24.9, 24.10_

  - [x] 8.5 G8 gates
    - Run `pnpm -r test`. Run `agent-tester`, `impeccable` (in the thread), `agent-guard`, `verify-and-stop`.
    - _Requirements: 25.5, 26.1, 26.14_

- [x] 9. G9: README and Kiro log
  - [x] 9.1 Write the README
    - Replace the TODO. Add: what the project is; both production URLs; run and test commands; short "How Kiro was used" linking `docs/kiro-usage.md`; the existing disclosure paragraph unchanged in meaning; credits (OFL-1.1 fonts, "Made with Natural Earth.", licences read from shipped package files); MIT statement.
    - Write the README test (MIT statement, both URLs, link to `docs/kiro-usage.md`, credit strings).
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7_

  - [x] 9.2 Write the Kiro log
    - Add the Phase 5 section to `docs/kiro-usage.md`: spec, steering, hooks, Neon MCP calls (pointer to decisions.md), result of checking for a Vercel or Neon power (use one if it fits, record either way), each skill used and what it found or that it was unavailable. Update `docs/tech-decisions.md` with pinned versions and reasons.
    - _Requirements: 13.1, 25.1, 25.2, 25.3, 25.4_

  - [x] 9.3 G9 gates
    - Run `pnpm -r test`, `agent-guard` and `verify-and-stop`.
    - _Requirements: 25.5, 26.1_

- [x] 10. G10: Final checks, final deploy, production smoke, handover
  - [x] 10.1 Close the mutation record
    - Confirm `docs/phase-5-notes/mutations.md` lists mutation, file and failing test name for the tests of Requirements 26.2 to 26.9, plus the extra mutations named in the design. Run any missing one now and restore by hand.
    - _Requirements: 26.12_

  - [x] 10.2 Extend the smoke scripts for an https base
    - Extend `skeleton/scripts/smoke-play.ts` and `apps/game/scripts/smoke.mjs` to take an https base and implement the design's steps: headers (names only), guest tutorial and Banshee win, temporary `example.com` user (lock refusal, tutorial, win another World, score row check), `/anchor/keepers-note--ch-1` count, leak check, burst check (wait 60 s, send up to 40 answers, pass if a 429 arrives within the first 40; if none, record a finding that the limit is per instance and the burst can spread, which does not block; wait 60 s), cleanup helper. Nothing writes a cookie, password or token.
    - _Requirements: 27.2, 27.3, 27.5, 27.6, 27.7, 27.8, 27.10_

  - [x] 10.3 Full local test run
    - Run `pnpm -r test` (no database, no network), the property tests, and `pnpm --filter @kiroween/atlas test:browser` against the local build; save `docs/phase-5-notes/book-check-g10.json`. Fix failures; blocked after two real attempts.
    - _Requirements: 26.1, 26.13, 26.14, 28.8, 1.7_

  - [x] 10.4 G10 pre-deploy gates
    - Run `agent-tester`, `agent-security` (headers, rate limit, auth, secrets, tutorial lock, config) and `agent-guard`.
    - _Requirements: 25.5_

  - [x] 10.5 **STOP (Owner step): final push to `main`**
    - Tell the Owner to push and wait for the deploy.
    - _Requirements: 3.2_

  - [x] 10.6 Run the Production_Smoke
    - Run the smoke steps against the Production_Site and write `docs/phase-5-notes/smoke-production.md` (step and pass/fail only). The burst check passes on a 429 within the first 40 answers; no 429 is recorded as a finding (limit is per instance), not a failure. At the end delete the temporary user by exact id through the Neon MCP (`delete_auth_user`, then `run_sql` deletes from `runs` and `player_flags` by that id), confirm 0 rows left in all three places, and record the statements. Then call `update_auth_allow_localhost` to turn localhost off for production.
    - On a failed step, record cause, fix and rerun only that step when in scope.
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7, 27.8, 27.9, 27.10, 16.7_

  - [x] 10.7 Run the production browser checks
    - Against the Production_Site: keyboard-only play from the Hall to a broken curse; 390 px touch pass (Hall, Tutorial_Room, one World); Reduced_Motion pass; `test:browser` Book view at 390 px and 1280 px (save `book-check-g10.json` production result); Slow_4G timings again. Save results in `docs/phase-5-notes/browser-production.json` and `timing-production.json`; screenshots only in `.debug/`. Report the paper-texture and mood-layer timings.
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5, 28.6, 28.7, 28.8, 14.1, 14.2, 18.6, 19.13_

  - [x] 10.8 Final gates
    - Run `verify-and-stop` against all requirement acceptance conditions and `agent-guard` once more. Confirm secret-scan test passes and `git status` shows no `.debug/`, build output or Secret.
    - _Requirements: 2.7, 25.5, 26.1_

  - [x] 10.9 Write the Handover_File
    - Write `docs/phase-5-handover.md` with every section required by Requirement 29.2, each blocked task with reason and next step, which numbers were measured in Phase 5 and which are copied, and a section listing every new or changed Catalog key with its English text for the Owner's wording review; the Owner's actions before submission (judge account, Google sign-in check, product names before 2026-12-01, the four PNG icons in both `public/icons/` folders, final Devpost field). No Secret value. Other notes only under `docs/phase-5-notes/`.
    - _Requirements: 1.12, 29.1, 29.2, 29.3, 29.4, 29.5, 29.6_

  - [x] 10.10 **STOP (Handover): wait for the Owner**
    - Halt after the handover file is written. Make no further change.
    - _Requirements: 3.7, 1.12_

## Notes

- Group order follows the design: G1 to G4 (production, speed) then the Mid_Phase_Stop, then G5 to G9, then G10.
- STOP tasks: 1.12, 2.5 (all G2 Owner steps in one Stop), 3.1, 4.6, 4.8 (Mid_Phase_Stop), 10.5, 10.10 (Handover). Task 3.2 may also stop under Requirement 3.3.
- Each property test task names its design property and the requirements it validates.
- Tests are required, not optional. `pnpm -r test` must pass without a database, network or browser; `test:browser` runs in 5.8 and 10.3/10.7.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["1.4"] },
    { "id": 4, "tasks": ["1.5"] },
    { "id": 5, "tasks": ["1.6"] },
    { "id": 6, "tasks": ["1.7"] },
    { "id": 7, "tasks": ["1.8"] },
    { "id": 8, "tasks": ["1.9"] },
    { "id": 9, "tasks": ["1.10"] },
    { "id": 10, "tasks": ["1.11"] },
    { "id": 11, "tasks": ["1.12"] },
    { "id": 12, "tasks": ["2.1"] },
    { "id": 13, "tasks": ["2.2"] },
    { "id": 14, "tasks": ["2.3"] },
    { "id": 15, "tasks": ["2.4"] },
    { "id": 16, "tasks": ["2.5"] },
    { "id": 17, "tasks": ["2.6"] },
    { "id": 18, "tasks": ["2.7"] },
    { "id": 19, "tasks": ["3.1"] },
    { "id": 20, "tasks": ["3.2"] },
    { "id": 21, "tasks": ["3.3"] },
    { "id": 22, "tasks": ["4.1"] },
    { "id": 23, "tasks": ["4.2"] },
    { "id": 24, "tasks": ["4.3"] },
    { "id": 25, "tasks": ["4.4"] },
    { "id": 26, "tasks": ["4.5"] },
    { "id": 27, "tasks": ["4.6"] },
    { "id": 28, "tasks": ["4.7"] },
    { "id": 29, "tasks": ["4.8"] },
    { "id": 30, "tasks": ["5.1"] },
    { "id": 31, "tasks": ["5.2"] },
    { "id": 32, "tasks": ["5.3"] },
    { "id": 33, "tasks": ["5.4"] },
    { "id": 34, "tasks": ["5.5"] },
    { "id": 35, "tasks": ["5.6"] },
    { "id": 36, "tasks": ["5.7"] },
    { "id": 37, "tasks": ["5.8"] },
    { "id": 38, "tasks": ["5.9"] },
    { "id": 39, "tasks": ["6.1"] },
    { "id": 40, "tasks": ["6.2"] },
    { "id": 41, "tasks": ["6.3"] },
    { "id": 42, "tasks": ["6.4"] },
    { "id": 43, "tasks": ["7.1"] },
    { "id": 44, "tasks": ["7.2"] },
    { "id": 45, "tasks": ["7.3"] },
    { "id": 46, "tasks": ["7.4"] },
    { "id": 47, "tasks": ["8.1"] },
    { "id": 48, "tasks": ["8.2"] },
    { "id": 49, "tasks": ["8.3"] },
    { "id": 50, "tasks": ["8.4"] },
    { "id": 51, "tasks": ["8.5"] },
    { "id": 52, "tasks": ["9.1"] },
    { "id": 53, "tasks": ["9.2"] },
    { "id": 54, "tasks": ["9.3"] },
    { "id": 55, "tasks": ["10.1"] },
    { "id": 56, "tasks": ["10.2"] },
    { "id": 57, "tasks": ["10.3"] },
    { "id": 58, "tasks": ["10.4"] },
    { "id": 59, "tasks": ["10.5"] },
    { "id": 60, "tasks": ["10.6"] },
    { "id": 61, "tasks": ["10.7"] },
    { "id": 62, "tasks": ["10.8"] },
    { "id": 63, "tasks": ["10.9"] },
    { "id": 64, "tasks": ["10.10"] }
  ]
}
```
