# Tasks: auth-progress

Requirements: `requirements.md`. Design: `design.md`. Each group ends with a checkpoint. Order matters: the base-path spike is first, and the owner stop is Task 13.

## Working rules (apply to every task)

- **Skills** (R11): **read-the-damn-docs** before using TanStack Start, Neon Auth or Better Auth, Drizzle, Tailwind or Vitest APIs (read the current docs or the installed package types, and note what was read in `docs/kiro-usage.md`); **ponytail** on every module (smallest code that meets the requirement); **agent-security** on auth, proxy, sessions, cookies, server functions, validation and ownership (Task 21 is the full review); **agent-tester** on every test file (each test must fail when its rule is broken); **agent-guard** at the end of each group; **verify-and-stop** in Task 25. Skills never override the spec, steering or the owner's prompt; on conflict follow the spec and tell the owner. Not used: agent-pilot, agent-superpowers, agent-orchestrator, agent-implementer, or any skill that starts sub-agents or its own workflow.
- **Never**: edit, create or delete anything under `content/` or `assets/`; edit `docs/content-gaps.md`; change the Phase 1 parser, generator, audit or their tests; run `audit:content`; open `.env` to inspect, compare or scan it; print, log or write a secret; touch `vercel.json`; commit or push; start Phase 3.
- **Database safety**: the migration and the import go to `dev-skeleton-core` only. After each, check through the Neon MCP that the new objects exist on the dev branch (`br-blue-breeze-arxdc1lo`) and that the default branch (`br-delicate-brook-art2crov`) has none. An MCP check issued in parallel with a command that changes data shows old data; run it after the command finishes.
- **No recursive deletes** (`rm -rf` is on the owner's deny list). Use the file tools, or single-file `rm`.
- **Writing files**: multi-file shell heredocs corrupted two files in Phase 1. Write source files with the file tool and run the typecheck after each group.
- Keep a running skill log in `docs/kiro-usage.md` (Task 24 finalises it).
- Tests: the whole suite must pass at every checkpoint (308 existing plus the new ones). Any failure is real.

---

## Group A: the base-path spike (first, before anything else)

- [x] 1. Pre-flight
  - [x] 1.1 `git status`: confirm nothing under `content/` or `assets/` is modified, and that `vercel.json` is unchanged.
  - [x] 1.2 Read the current TanStack Start docs for project setup, the Vite plugin, server routes, server functions, `createStart` and global request middleware, and the request helpers (`getRequest`, cookie helpers); list the exact import paths found, in `docs/kiro-usage.md`. Check which request helpers the installed `@tanstack/react-start` really exports (read its types) before using any name from the docs.
  - _Requirements: R11.1_
- [x] 2. **Spike: serve a minimal Start app under `/game`**
  - [x] 2.1 Add the dependencies to `apps/game/package.json` at the exact pins in design section 3 (`@tanstack/react-start`, `@neon/auth` 0.8.2 exact, `react`, `react-dom`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite`, `@types/react`, `@types/react-dom`), then `pnpm install`. Keep `pnpm@9.15.9`.
  - [x] 2.2 Build the smallest app: `vite.config.ts`, `tsconfig.json` (`strict`), one page, one server function (`createServerFn`), one server route (`/api/ping`), Tailwind wired.
  - [x] 2.3 Try the documented route first: router `basepath: '/game'` plus Vite `base: '/game/'`. Prove all three work under `/game`: the page, the server function call from the page, and the server route, in **dev** and in the **production build** (`vite build`, then run the built server). Record every command and result.
  - [x] 2.4 (not needed: the documented route worked) If any of the three fails, switch to the agreed fallback: put every route under `src/routes/game/` (no basepath), keep Vite `base: '/game/'` for assets, and prove the same three again in dev and build.
  - [x] 2.5 Write the result (which approach worked, the config, anything that did not) to `docs/tech-decisions.md`. `vercel.json` stays untouched.
  - _Requirements: R1.1, design 13_
- [x] 3. Group A checkpoint
  - Typecheck passes; `pnpm -r test` passes (308); `git status` shows no change under `content/`, `assets/` or to `vercel.json`.
  - **agent-guard** pass on the spike code and docs.

## Group B: pure logic in the skeleton (no framework, database or network)

- [x] 4. Access rule
  - [x] 4.1 `skeleton/src/access/canEnter.ts` per design 5 (`Visitor`, `Target`, `canEnter`).
  - [x] 4.2 `skeleton/test/access-score.property.test.ts` (access part), 100 runs each: the tutorial and the guest world are open to every guest; every other world is closed to a guest; every world is open to every signed-in user.
  - _Requirements: R3.1, R3.2, R7.1_
- [x] 5. Score
  - [x] 5.1 `skeleton/src/score/score.ts` per design 5.
  - [x] 5.2 Properties (same file), 100 runs each: never negative; more Hint 2 uses never raise the score; more wrong answers never raise it; more solved slots never lower it; exact values for hand-picked inputs (for example 5 slots plus the curse, no penalties, is 550).
  - _Requirements: R5.1, R7.1_
- [x] 6. Run validation
  - [x] 6.1 `skeleton/src/runs/validate.ts`: zod strict validators for start and finish with the limits in design 6.2 (`hint2Uses` 0 to 50, `wrongAnswers` 0 to 500, `highestFear` 0 to 100, `slotsSolved` 0 to the legend's slot count, status one of four, `won` needs all slots, legend id in the catalogue).
  - [x] 6.2 `skeleton/test/runs-validate.test.ts`: one valid case and at least one invalid case per rule, unknown fields rejected, no raw input echoed in error messages.
  - _Requirements: R4.5, R4.6, R7.2_
- [x] 7. Run service, store interface, errors
  - [x] 7.1 `skeleton/src/runs/store.ts` (the `RunStore` interface; every method takes `userId`), `errors.ts` (`NotSignedInError`, `RunConflictError`, `RunNotFoundError`, `ValidationError`, each with a fixed message), `service.ts` (`startRun`, `finishRun`, `listMyRuns`, `myCompletedWorlds`; each takes a `Visitor` and rejects a guest before any store call; `startRun` follows design 6.3 with an injected `newSeed`, up to 20 tries on `GeneratorError`, one transaction that closes the old in-progress run then inserts).
  - [x] 7.2 `skeleton/test/runs-session.test.ts`: all four functions reject a guest with `NotSignedInError` and a spy store sees zero calls.
  - [x] 7.3 `skeleton/test/runs-ownership.test.ts`: a fake store holding two users' rows; user B cannot get, finish, list or see completed worlds of A; a foreign run id behaves as not found; finishing twice fails.
  - [x] 7.4 `skeleton/test/runs-service.test.ts`: seed injected; `GeneratorError` retries, then fails naming the legend; stores the seed and the generator's true version, and the client supplies neither; the old in-progress run is closed as abandoned; a fake store that throws SQLSTATE `23505` on the unique index gives `RunConflictError`, other errors give a fixed generic error, and no extra row is left; the score stored equals `score(...)` of the validated counts; a score in the client input is rejected.
  - _Requirements: R4.3, R4.4, R4.6, R4.7, R4.9 to R4.11, R5.2, R7.2_
- [x] 8. Locale, guest progress, secret scanner
  - [x] 8.1 `skeleton/src/locale/resolveLocale.ts` (flag off always `en` and `ltr`; flag on, cookie then `Accept-Language`, `ar` gives `rtl`) and `skeleton/test/locale.test.ts`.
  - [x] 8.2 `skeleton/src/guest/progress.ts` (takes a storage object; imports nothing networked) and `skeleton/test/guest.test.ts` (works with a fake storage; a test reads the module source and fails on any `fetch`, `http`, `XMLHttpRequest`, `WebSocket` or server-function import).
  - [x] 8.3 `scripts/scan-secrets.mjs` (repo root, plain Node): scans tracked and untracked files except `.env*` other than `.env.example`, `.git` and `node_modules`, for `postgres://` and `postgresql://` strings with credentials, `neon.tech` hosts with credentials, and long base64 or hex values next to SECRET, KEY, TOKEN or PASSWORD. Prints `file:line` and the pattern name only, never the matched text. It never opens `.env`. `skeleton/test/scan-secrets.test.ts` tests the scanning function with fixtures built from parts (no secret-shaped literal in the repo): each pattern is flagged, `.env` is skipped, the output contains no matched text.
  - _Requirements: R4.12, R6, R7, 3a, 3b_
- [x] 9. Group B checkpoint
  - Typecheck (strict, no unused locals); `pnpm -r test` passes with no `.env` and an empty environment (`env -i`; move nothing, open nothing); every new test shown to fail when its rule is broken (agent-tester).
  - **agent-guard** pass on the new code and tests.

## Group C: database

- [x] 10. Schema and migration
  - [x] 10.1 Read the Drizzle 0.45 docs for `pgEnum`, `pgTable`, check constraints, partial unique indexes (`uniqueIndex(...).on(...).where(...)`), `generate --name` (read-the-damn-docs; check the installed types before using a name).
  - [x] 10.2 In `skeleton/src/db/schema.ts` add the `runs` table and `run_status` enum per design 6.1 (uuid pk, `user_id` text indexed, foreign keys to `legends` and `versions`, non-negative CHECKs, partial unique index on `(user_id, legend_id) where status = 'in_progress'`) and the nullable `model` jsonb column on `legends`.
  - [x] 10.3 In `skeleton/src/db/plan.ts` put `model: legend` in the legends row (so the importer writes it in the same transaction). Extend `skeleton/test/db.test.ts` (do not rewrite it): the plan carries the model and it equals the parsed legend after a JSON round trip.
  - [x] 10.4 `pnpm --filter @kiroween/skeleton db:generate -- --name runs` creates `drizzle/0001_runs.sql`. Review the SQL by eye: the enum, the CHECKs, the partial unique index, the `model` column.
  - _Requirements: R4.1, R4.8, R4.9_
- [x] 11. Run store and legend loader
  - [x] 11.1 `skeleton/src/db/runStore.ts`: the Drizzle implementation of `RunStore`. Every statement filters on `user_id`; `finishRun` updates only a row with that id, that user and `status = 'in_progress'`; `insertRun` and `closeInProgress` run in one transaction; the `23505` error on the partial index becomes `RunConflictError`; every other error becomes a fixed generic error with no driver message. Drizzle builders only.
  - [x] 11.2 `skeleton/src/db/loadLegend.ts`: `loadCatalogue(db)` (ids, titles, regions, slot counts) and `loadLegend(db, id)` that returns `legendSchema.parse(model)`; a null model gives the fixed "run db:import" error.
  - [x] 11.3 `skeleton/test/legend-snapshot.test.ts`: for all twelve legends the plan's model equals the parsed legend after a JSON round trip, and `generate` gives the same run for 20 seeds on both.
  - _Requirements: R4.4, R4.8_
- [x] 12. Apply, import, verify (dev branch only)
  - [x] 12.1 `pnpm --filter @kiroween/skeleton db:migrate`. Then, through the Neon MCP and after the command finished: `runs` exists on `br-blue-breeze-arxdc1lo`, the partial unique index exists, `legends.model` exists; the default branch has no tables.
  - [x] 12.2 `pnpm --filter @kiroween/skeleton db:import` once (allowed by the owner for the model column). Then through the MCP: 12 legends, `model` not null for all 12, row counts equal the Phase 1 totals (423 facts and so on).
  - [x] 12.3 Run the legend-versus-stored-model check (a short script that loads the twelve stored models and prints yes or no per legend; no row is printed). This is also smoke step 8.
  - _Requirements: R4.1, R4.8, R9.3_
- [x] 13. Group C checkpoint, then the Neon Auth setup and the **OWNER STOP**
  - [x] 13.1 Typecheck, full test suite, **agent-guard** pass on the database code, and **agent-security** on `runStore.ts` (parameterized builders, `user_id` in every statement, no driver message leaks).
  - [x] 13.2 Through the Neon MCP on `dev-skeleton-core`: `provision_neon_auth`; `add_auth_oauth_provider` for Google (Neon's shared credentials for development); `add_auth_trusted_domain` for `http://localhost:3000`; `update_auth_email_and_password` with email verification off. Read the config back with `get_neon_auth_config` (secrets are redacted by the tool) and confirm. If Google needs the owner's own OAuth client for local use, record that for the handover; create none.
  - [x] 13.3 **STOP.** Tell the owner: auth is provisioned on `dev-skeleton-core`; put `NEON_AUTH_BASE_URL` (from the Neon console) and a new `NEON_AUTH_COOKIE_SECRET` (`openssl rand -base64 32`) into `.env`, add `GUEST_WORLD=banshee` if they want to set it, and say "done". Do not read, print or check `.env`. Wait.
  - _Requirements: R2.3, R2.5, R2.6_

## Group D: authentication in the app

- [x] 14. Environment, request context, auth server
  - [x] 14.1 Read `@neon/auth` 0.8.2's `BUILDING-AN-ADAPTER.md` and the installed types again for the exact signatures (`createAuthServer`, `handleAuthProxyRequest`, `processAuthMiddleware`, `RequestContext`, `serializeSetCookie`).
  - [x] 14.2 `apps/game/src/server/env.ts`: reads and validates `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (32+ characters), `DATABASE_URL`, `GUEST_WORLD` (default `banshee`), `FEATURE_ARABIC`; memoized; errors name the variable and never include a value; `GUEST_WORLD` must be in the catalogue. `apps/game/test/env.test.ts` checks each failure names the variable and the message never contains the value passed in.
  - [x] 14.3 `server/request-context.ts` and `server/auth.ts` per design 4.1 (`sameSite: 'lax'`, log level `warn`, `getFramework()` returns `'tanstack-start'`); `getVisitor()` returns guest or `{ kind: 'user', id, name }` from `auth.getSession()` only.
  - _Requirements: R2.4, R2.5, R3.3, R6.4_
- [x] 15. The proxy route and the global middleware
  - [x] 15.1 `apps/game/src/server/proxyPath.ts`: the pure path allowlist from design 4.2. `apps/game/test/proxy-path.test.ts`: accepts `sign-in/email`, `sign-up/email`, `sign-out`, `get-session`, `callback/google`, `sign-in/social`, `token`, `.well-known/jwks.json`; rejects `..`, a leading slash, a full URL, encoded dots and slashes, spaces and empty paths.
  - [x] 15.2 `routes/api/auth/$.ts` (or `routes/game/api/auth/$.ts` if Task 2 used the fallback): GET and POST only; the path is checked first and anything else is a 404; the upstream is fixed by `NEON_AUTH_BASE_URL`; nothing from bodies or cookies is logged.
  - [x] 15.3 `src/start.ts`: the global request middleware per design 4.3 (`processAuthMiddleware` with `skipRoutes: ['/game']`; `allow` appends each `Set-Cookie` one by one; `redirect_oauth` returns a 302 with its cookies; `redirect_login` is treated as `allow`).
  - [x] 15.4 `server/middleware.ts`: `authMiddleware` (sets `context.visitor` from `getVisitor()`, nothing from the client) and `requireUser` (rejects a guest with the fixed not-signed-in error).
  - _Requirements: R2.4, R2.7, R2.8, R4.11_
- [x] 16. Group D checkpoint
  - Typecheck; full suite; dev server starts under `/game`; `GET /game/api/auth/get-session` answers (guest result); **agent-guard** pass.

## Group E: screens and server functions

- [x] 17. i18n, root, styles
  - [x] 17.1 `src/i18n/en.ts` (every string by key), empty `ar.ts` with per-key fallback to English, `t(key)`; the root sets `lang` and `dir` from `resolveLocale` and `FEATURE_ARABIC`.
  - [x] 17.2 Tailwind with logical utilities only. `apps/game/test/i18n.test.ts`: every key used in `src` exists in `en`; `apps/game/test/logical-css.test.ts`: scans `apps/game/src` for physical-direction utilities (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`, `border-l`, `border-r`, `float-left`, `float-right`) and fails on any.
  - _Requirements: R1.5, R6_
- [x] 18. Server functions
  - [x] 18.1 `getHall` (catalogue plus per-door open or locked from `canEnter`; the visitor's display name), `enterWorld` (visitor, target check against the catalogue, `canEnter`; denial redirects and returns no world data; allowed returns the title only), `getAccount` (display name and, for a user, `listMyRuns` and `myCompletedWorlds`). All use `authMiddleware`.
  - [x] 18.2 `startRunFn`, `finishRunFn`, `listMyRunsFn`, `myCompletedWorldsFn`: built on `requireUser`, inputs through the strict validators, no user id or score or version or seed in any input; typed errors mapped to fixed messages (409 for `RunConflictError`, 401 not signed in, 404 not found, 400 validation).
  - _Requirements: R3.4, R4.3 to R4.11_
- [x] 19. Screens
  - [x] 19.1 Hall (loader calls `getHall`; twelve doors plus the tutorial, each open or locked), sign in, sign up (display name, email, password; Google button), sign out, account (user: runs, completed worlds, best score; guest: local progress from `skeleton/src/guest`), and the stub world page (loader calls `enterWorld`; shows only the title and "game play comes later").
  - [x] 19.2 Plain and accessible: labels, error text tied to fields, keyboard order, visible focus, contrast, mobile first. Check with a keyboard-only pass and record it.
  - _Requirements: R1.2 to R1.4, R2.2_
- [x] 20. Group E checkpoint
  - Typecheck; full suite; **agent-guard** pass; a manual run of the app as a guest (hall shows twelve doors, only the tutorial and the guest world open; another world's URL gives no data).

## Group F: security review (the most important one)

- [x] 21. **agent-security** review of the whole auth and progress surface
  - Cover: the proxy route (fixed host, path allowlist, methods, logging), the global middleware and its cookie handling, `getVisitor` and `authMiddleware`, every server function (no trusted client identity, validators strict, fixed error messages), the run store (user filter in every statement, ownership by construction, conflict handling), `canEnter` use in every loader path, CSRF (origin check plus `SameSite=Lax`), session cache cookie signing, the env module, the guest module (no network), and the secret scan.
  - Run `node scripts/scan-secrets.mjs` and `security_change_scan.py`; classify each finding (real, or false positive with the reason). Fix real findings inside this spec; list the rest.
  - Record threat areas, findings, fixes and residual risks in `docs/kiro-usage.md`.
  - _Requirements: R11.1 (agent-security)_

## Group G: smoke check (against `dev-skeleton-core`)

- [x] 22. Smoke check
  - [x] 22.1 `apps/game/scripts/smoke.mjs` per design section 12: guest hall (twelve doors; only the tutorial and `banshee` open); guest request for another world gets no data; sign up a test user (random `@kiroween-smoke.invalid` address and random password, never printed) and sign in; take the verified user id from `get-session`; the same world request with the session returns the title; start and finish a run through the skeleton service with the real store and that id; list it; completed worlds; sign out and confirm the next request is a guest; check the twelve stored `legends.model` values.
  - [x] 22.2 Start the dev server in the background, run the smoke script, stop the server. Record every command and the result (pass or fail per step). No credential is printed.
  - [x] 22.3 Clean up: delete the test user's runs by the exact user id; delete the test user through Neon Auth if its delete endpoint is enabled; otherwise run one statement on `dev-skeleton-core` only, by the exact test user id: `delete from neon_auth."user" where id = '<exact id>'` (never a pattern), and record the statement with the id shown as `<test user id>`. Confirm through the MCP that no row for that id remains in `runs` or in `neon_auth.user`.
  - _Requirements: R8_

## Group H: documents, final checks, handover

- [x] 23. Docs
  - [x] 23.1 `docs/tech-decisions.md`: the final pins and reasons, the base-path result, decision 27, the client-reported counts (a known limit), the toolkit's beta status and why `@neon/auth` is pinned exactly, `NEON_AUTH_COOKIE_SECRET` and `NEON_AUTH_JWKS_URL` roles.
  - [x] 23.2 `.env.example`: add `GUEST_WORLD` and `FEATURE_ARABIC` with no secrets.
  - [x] 23.3 `docs/kiro-usage.md`: the Phase 2 entry (Kiro features used: spec with approvals at each step, steering, hooks, MCP calls, property tests; skills used and what each found).
  - _Requirements: R5.3, R6.4, R10.1_
- [x] 24. Final guard pass
  - **agent-guard** over the whole Phase 2 diff, grouped by code, tests and docs: unused exports, function size, dead code, docs claims checked against the code, script names, stale references. Fix findings inside the spec.
- [x] 25. Final verification (**verify-and-stop**)
  - Run in this order and record exact results: `pnpm install --frozen-lockfile`; strict typecheck of every package (with `--noUnusedLocals --noUnusedParameters` for the skeleton); `pnpm -r test` (also once with an empty environment, `env -i`, and no `.env` loaded by any test); the production build of `apps/game`; the Phase 0 content check `pnpm check:content`; `node scripts/scan-secrets.mjs` (file and line only); `git status` shows no change under `content/` or `assets/` and no `vercel.json` change; the Neon MCP shows `runs` and `legends.model` on the dev branch and nothing on the default branch.
  - Stop when the acceptance proof is complete.
  - _Requirements: R7.4, R7.6, R9, R11_
- [x] 26. Handover
  - Write `docs/phase-2-handover.md` per R10.2: files and folders created; versions pinned and why; how auth is set up (providers, where sessions are checked); the `runs` table and the migration name; the access rule; the score rule; test results (property tests, runs per property, unit tests, pass or fail); the smoke-check commands and results (with the delete statement and `<test user id>`); skills used and findings; anything that needs the owner's action (Google's own OAuth client before production, the production trusted origin, rate limiting, email verification).
  - Do not commit or push. Stop and wait. Do not start Phase 3.
  - _Requirements: R10.2, R9.4_
