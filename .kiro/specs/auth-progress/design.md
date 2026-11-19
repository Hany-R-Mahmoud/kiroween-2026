# Design: auth-progress (Phase 2)

Implements `requirements.md` (R1 to R11). Read the requirements first. Everything here was checked against the current docs and against the installed `@neon/auth` 0.8.2 package, except where a line says **verify in Task N**.

## 0. Summary

- A TanStack Start app in `apps/game`, mounted at `/game`.
- Neon Auth through **our own proxy route** `/game/api/auth/*`, built on the `@neon/auth/server` toolkit that Neon ships for framework adapters (its own guide names TanStack Start).
- All decisions about access, validation, score and runs are **pure functions in `skeleton/`**, tested without a framework, database or network. The app only wires them.
- Every loader that guards data calls a **server function**, because TanStack loaders also run in the browser on client-side navigation.
- A `runs` table and a `legends.model` column in one new migration (`0001_runs`); legends are read back from that stored model (section 6.4, approved).

## 1. Findings that shaped it

1. `@neon/auth/server` is a **framework-neutral toolkit** (beta). It exports `handleAuthProxyRequest` (a `Request` to `Response` proxy with session-cache and cookie handling), `createAuthServer` (server-side `getSession()` and sign-in methods, driven by a small `RequestContext` we write), `processAuthMiddleware` (finishes the OAuth return trip and refreshes session cookies) and helpers. `next` is only an optional peer. Its `BUILDING-AN-ADAPTER.md` lists TanStack Start (`getRequest`) as an intended target. Neon says minor versions may break this surface and tells adapter authors to **pin narrowly**, so I pin `@neon/auth` to `0.8.2` exactly.
2. `processAuthMiddleware` does the OAuth code exchange **before** it checks whether the route needs a session, so it works even when every route is public (guests browse the hall).
3. `NEON_AUTH_COOKIE_SECRET` **is needed**: it signs the `session_data` cache cookie the toolkit mints (at least 32 characters). `NEON_AUTH_JWKS_URL` is not used by this design (we verify sessions through the auth service, not by checking JWTs ourselves); it stays in `.env.example` for later phases and needs no value for Phase 2.
4. TanStack Router **loaders run on the server for the first request and in the browser for client-side navigation.** A loader that reads the session itself would run in the browser and be bypassable. So loaders only call server functions; the checks live there.
5. TanStack's own middleware guide says to derive the session from a server-trusted source, never from `sendContext`. The design follows that.
6. `@tanstack/react-start` 1.169.5 depends on exact versions of the router and plugin packages and needs Vite 8 or later (we have 8.3.8).

## 2. Architecture

```text
Browser ──/game/api/auth/*──► [route: api/auth/$]  ── handleAuthProxyRequest ──► Neon Auth service
   │                                                       (first-party cookies on our domain)
   │ document requests
   ▼
[global request middleware]  processAuthMiddleware: finish OAuth return, refresh session cookies
   │
   ▼
[route loaders] ──call──► [server functions] ──► authMiddleware (auth.getSession → visitor)
                                                   │
                                  canEnter / validate / score (skeleton, pure)
                                                   │
                                           RunStore (skeleton, Drizzle) ──► Neon Postgres (dev-skeleton-core)
```

## 3. Packages and pins

Exact versions, locked by `pnpm-lock.yaml`. Final pins are written to `docs/tech-decisions.md` in Task 1 after a clean install; these are the registry values today.

| Package | Version | Why |
|---|---|---|
| `@tanstack/react-start` | 1.169.5 | the app framework; brings an exact router and plugin |
| `@neon/auth` | **0.8.2, exact** | Neon's toolkit; the server subpath is beta, so no range |
| `react`, `react-dom` | 19.3.1 | current |
| `@vitejs/plugin-react` | 6.3.0 | needs Vite 8 |
| `vite` | 8.3.8 | already pinned in the workspace |
| `tailwindcss`, `@tailwindcss/vite` | 4.3.5 | Tailwind 4 with the Vite plugin |
| `@types/react`, `@types/react-dom` | 19.3.0 | types |
| `typescript`, `vitest`, `fast-check`, `zod`, `drizzle-orm`, `pg` | unchanged | as in Phase 1 |

No UI kit and no Better Auth UI: plain forms keep every string in our catalog and every style logical. `better-auth` arrives as a dependency of `@neon/auth`.

## 4. Authentication

### 4.1 Files (all under `apps/game/src`)

| File | Role |
|---|---|
| `server/env.ts` | reads and validates the environment once (section 9); names the variable in every error, never the value |
| `server/request-context.ts` | the toolkit's `RequestContext` for TanStack Start: cookies and headers from the current request, `setCookie` through Start's response helpers, origin from `Origin` or `Referer`, framework `'tanstack-start'` |
| `server/auth.ts` | `createAuthServer({ baseUrl, context, cookieSecret, sameSite: 'lax', log })` and `getVisitor()` returning `{ kind: 'guest' }` or `{ kind: 'user', id, name }` |
| `routes/api/auth/$.ts` | the proxy route: GET and POST only, calls `handleAuthProxyRequest` |
| `start.ts` | the global request middleware (4.3) |
| `server/middleware.ts` | `authMiddleware`: a server-function middleware that sets `context.visitor` from `getVisitor()` |
| `auth/client.ts` | the browser client, `createAuthClient('<origin>/game/api/auth', { adapter: BetterAuthVanillaAdapter() })` |
| `routes/sign-in.tsx`, `sign-up.tsx` | plain forms; sign-up asks for display name, email, password |

### 4.2 The proxy route

- Mounted at `/game/api/auth/$`. Handlers for **GET and POST only** (sign-in, sign-up, sign-out, session, OAuth callback and token calls all use these). PUT, PATCH and DELETE are not mounted.
- **Changed in the security review (Task 21):** the proxy forwards only the five endpoints the app uses: `get-session`, `sign-in/email`, `sign-up/email`, `sign-in/social`, `sign-out` (an exact-match list in `server/proxyPath.ts`). Everything else, including admin, organization, email change, profile update and account deletion, gets 404. The Google return trip lands on Neon's domain and the server finishes it by calling Neon directly, so it needs no proxy path. The upstream host is fixed by `NEON_AUTH_BASE_URL`; the request can never choose a host. Sign-up bodies are checked for the display name (R2.2) and an `image` field is dropped before forwarding.
- No request or response bodies and no cookies are logged. The toolkit's log level is `warn`.
- The toolkit forwards the request's `Origin` upstream, so Neon enforces its trusted-origin list. CSRF protection is therefore Neon's origin check plus `SameSite=Lax` cookies.

### 4.3 Global request middleware

On every document request under `/game` (not the auth route, not static assets), call `processAuthMiddleware` with `skipRoutes: ['/game']` (everything counts as public, so guests are never redirected). Handle its three results:

- `allow`: continue and append its `Set-Cookie` values to the response (session cache refresh).
- `redirect_oauth`: return a 302 with its cookies (this finishes the Google return trip).
- `redirect_login`: cannot happen with all routes public; if it does, treat it as `allow`.

Multiple `Set-Cookie` headers are appended one by one (the guide warns that joining them corrupts dates).

### 4.4 How a request gets its identity

`getVisitor()` calls `auth.getSession()` (the toolkit validates the cookie, uses the signed cache when fresh, and calls Neon when stale). It returns a guest if there is no valid session. **Nothing from the client is trusted**: server functions take their inputs through validators and never a user id.

### 4.5 Loader pattern (R3.4)

Loaders are isomorphic, so each guarded loader calls a server function and does nothing else:

```text
routes/world.$target.tsx   loader: () => enterWorld({ data: { target } })
                           enterWorld (server function, authMiddleware):
                             visitor from context  →  canEnter(target, visitor, guestWorld)
                             denied  → throw redirect to the hall (or sign-in), returns no world data
                             allowed → returns the legend's public summary (title, region, slot count)
```

The same pattern serves the hall and the account page. A denied request never receives the world's data because the server function returns nothing on denial. The world route is a **stub gate** ("game play comes later"); it exists so the rule is enforced and testable on a real loader.

### 4.6 Sign-in methods

- **Email and password:** `signUp.email({ email, password, name })` and `signIn.email({ email, password })`.
- **Google:** `signIn.social({ provider: 'google', callbackURL: '/game' })`. Neon's shared Google credentials work for local development; your own client is needed before production. I do not create one.
- **Sign-out:** `signOut()`, then reload the hall as a guest.
- Email verification is left off for now (Neon's default); anyone can sign up (a Neon limit).

### 4.7 Neon setup (Task 4, through the MCP)

`provision_neon_auth` on `dev-skeleton-core`; `add_auth_oauth_provider` (Google); `add_auth_trusted_domain` for `http://localhost:3000`; `update_auth_email_and_password` (verification off). Then **stop** and ask you to set `NEON_AUTH_BASE_URL` and a fresh `NEON_AUTH_COOKIE_SECRET` (`openssl rand -base64 32`) in `.env`. I never read, print or write them.

## 5. Access rule and score (skeleton, pure)

```ts
// skeleton/src/access/canEnter.ts
type Visitor = { kind: 'guest' } | { kind: 'user' };
type Target = { kind: 'tutorial' } | { kind: 'legend'; id: string };
canEnter(target: Target, visitor: Visitor, guestWorld: string): boolean
```

Guest: tutorial and `guestWorld` only. User: everything. Whether a legend id exists is not its job (the caller checks the catalogue first), so the function stays total and testable.

```ts
// skeleton/src/score/score.ts
score({ slotsSolved, curseBroken, hint2Uses, wrongAnswers }): number
  = max(0, 100*slotsSolved + (curseBroken ? 50 : 0) - 15*hint2Uses - 10*wrongAnswers)
```

Inputs are integers (checked by the validator before this is called). The server derives `curseBroken` from `status === 'won'`.

## 6. Runs

### 6.1 The table (new migration `0001_runs`, applied to `dev-skeleton-core` only)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, pk, default `gen_random_uuid()` | |
| `user_id` | text, not null | the verified session's id; no foreign key into `neon_auth` (that schema branches and resets with Neon), indexed |
| `legend_id` | text, **no foreign key** (see the note below the table) | checked against the catalogue by the server |
| `seed` | text, not null | issued by the server |
| `true_version_id` | text, **no foreign key** | computed by the server with the generator |
| `status` | enum `run_status` | `in_progress`, `won`, `restarted`, `abandoned` |
| `slots_solved`, `hint2_uses`, `wrong_answers`, `highest_fear` | smallint, not null, default 0, with CHECK constraints (`>= 0`) | |
| `score` | integer, not null, default 0, CHECK `>= 0` | computed by the server |
| `started_at` | timestamptz, default `now()` | |
| `finished_at` | timestamptz, null | set when the run leaves `in_progress` |


**No foreign keys from `runs` (changed during build, approved by the owner).** The Phase 1 importer replaces a legend by deleting its row and inserting it again. A foreign key from `runs` to `legends` or `versions` would either cascade and delete every player's runs on each `db:import`, or (restrict) make the import fail. So `legend_id` and `true_version_id` are plain text. The server checks `legend_id` against the catalogue before inserting (validation in `runs/validate.ts`), and `true_version_id` is produced by the generator, never sent by the client.

A **partial unique index** on `(user_id, legend_id) where status = 'in_progress'` gives R4.9 at the database level.

**R4.9 (approved):** starting a run closes any `in_progress` run of that user for that world as `abandoned` (score 0, counts as stored) in the same transaction, then inserts the new one. A player who closed the tab can start again; history keeps the abandoned attempt.

**Race (R4.10, approved):** two starts for the same user and world can both pass the close step and then collide on the partial unique index (SQLSTATE `23505`). The store catches exactly that code on that index and throws a typed `RunConflictError`; the server function turns it into the fixed message "A run for this world is already starting. Try again." with HTTP 409. Any other database error becomes a fixed generic error. The loser leaves no row, so exactly one run stays `in_progress`. A unit test drives the store with a fake that throws `23505`.

Completed worlds, best score and history are queries over this table, always filtered by `user_id`.

### 6.2 Logic in the skeleton, repository behind an interface

```text
skeleton/src/runs/
  validate.ts   validateStart, validateFinish (pure; limits below)
  service.ts    startRun, finishRun, listMyRuns, myCompletedWorlds  (take a RunStore and a Catalogue)
  store.ts      interface RunStore { ... }   // every method takes userId and filters on it
skeleton/src/db/runStore.ts   drizzle implementation of RunStore
```

**No session, no access (R4.11).** The four service functions (`startRun`, `finishRun`, `listMyRuns`, `myCompletedWorlds`) take a `Visitor`, not a user id. A guest visitor makes each of them throw `NotSignedInError` **before** the store is touched. The server functions are also built on a `requireUser` middleware that does the same, so the rule is checked twice (service and server function). The tests call each of the four with a guest and a spy store and require the store to see zero calls.

`RunStore` methods all take `userId` and put it in the SQL `WHERE`: `getRun(userId, runId)`, `finishRun(userId, runId, …)` (updates only a row with that `id`, that `user_id` and `status = 'in_progress'`), `closeInProgress(userId, legendId)`, `insertRun(...)`, `listRuns(userId)`, `completedWorlds(userId)`. A run id that belongs to someone else therefore behaves as if it does not exist. Ownership is by construction, not by an if-statement after the fact, and the unit tests check it with a fake store that holds two users' rows.

**Validation limits** (stated, as R4.5 asks): `slotsSolved` integer 0 to the legend's slot count; `hint2Uses` 0 to 50; `wrongAnswers` 0 to 500; `highestFear` 0 to 100; `status` one of the four; `legendId` in the catalogue. `won` requires `slotsSolved === slotCount`. Finishing a run that is not `in_progress` fails. Unknown fields are rejected (zod `.strict()`).

### 6.3 Starting a run (R4.7)

```text
startRun(store, catalogue, userId, legendId, deps)
  1. validate legendId in the catalogue
  2. for up to 20 tries:  seed = deps.newSeed()          // crypto.randomUUID(), injected so tests are deterministic
                          legend = await catalogue.loadLegend(legendId)   // loaded once, before the loop
                          try run = generate(legend, seed)  → trueVersionId = run.trueVersionId; stop
                          catch GeneratorError → next seed
  3. none worked → error naming the legend
  4. one transaction: closeInProgress(userId, legendId); insertRun(userId, legendId, seed, trueVersionId)
```

`generate` is the Phase 1 function, unchanged. The client never sends a seed or a version.

### 6.4 Reading a legend back from Neon (R4.8): option A, approved

The generator's choice of true version depends on the **order** of `leads` (and facts, versions), and the Phase 1 tables do not keep order for `versions`, `facts`, `leads`, `assets` and `sources`. Rebuilding a legend from rows could silently change which version a seed produces. So:

- A new nullable column `legends.model jsonb` holds the parsed `Legend`. It is added by the same migration as `runs` (`0001_runs`).
- `planLegend` puts `model` in the legends row, so the importer writes it in the **same transaction** as every other row. This is a small change to `db/schema.ts` and `db/plan.ts`; the Phase 1 parser, generator, audit and their tests are untouched, and the plan tests are extended, not rewritten.
- `loadLegend(db, id)` reads `model` and returns `legendSchema.parse(model)`. A null `model` (a legend imported before this migration) gives a fixed error telling the operator to run `db:import`, never a crash.
- One more `db:import` on `dev-skeleton-core` fills the column. The relational tables stay for the atlas.
- Tests: for all twelve legends, the model in the plan equals the parsed legend after a JSON round trip, and `generate` gives the same run for 20 seeds on both. The smoke check repeats this against the twelve stored rows.

## 7. Guests

A small client-only module (`apps/game/src/guest/progress.ts`, with its logic in `skeleton/src/guest/progress.ts` so it can be tested) stores recent runs in `localStorage`, takes the storage object as a parameter, and imports nothing that can reach the network. The account page shows these for a guest. Nothing is sent to the server, and no server function takes progress from a guest (R4.12): the four run functions reject guests (6.2) and nothing else writes progress.

## 8. Arabic flag and i18n

- `FEATURE_ARABIC` (default off). Off: `<html lang="en" dir="ltr">` always.
- On: the locale comes from a `lang` cookie, then `Accept-Language`; `ar` gives `dir="rtl"`. Computed by a pure `resolveLocale(flag, cookie, acceptLanguage)` in the skeleton, tested.
- Strings come from `src/i18n/en.ts` by key through `t(key)`. An `ar` catalog is created empty and **falls back to English per key**; I do not write Arabic UI text (quality is yours to judge), so the flag proves the direction handling only. A test checks that every key used in the app exists in `en`.
- Tailwind classes use only logical utilities (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`). A test scans `apps/game/src` for physical-direction utilities and fails if it finds any.

## 9. Environment

| Variable | Used for | Secret |
|---|---|---|
| `DATABASE_URL` | the app's database connection (pooled), server only | yes, already set |
| `NEON_AUTH_BASE_URL` | the upstream Neon Auth service | no, but you set it |
| `NEON_AUTH_COOKIE_SECRET` | signs the session cache cookie, 32+ characters | yes, you generate it |
| `NEON_AUTH_JWKS_URL` | not used in Phase 2 | no |
| `GUEST_WORLD` | the one world a guest may play (default `banshee`) | no |
| `FEATURE_ARABIC` | `true` turns the flag on (default off) | no |

`server/env.ts` validates once, memoizes, and throws an error that **names the variable** (a missing or too-short value, or `GUEST_WORLD` not in the catalogue) without printing any value. TanStack Start has no hook that can block the server from listening, so the check runs on the first request after boot and every request fails with that message until it is fixed. `GUEST_WORLD` and `FEATURE_ARABIC` are added to `.env.example` with no secrets.

## 10. Security review points (agent-security checklist for the build)

| Surface | Control |
|---|---|
| Proxy | fixed upstream host; GET and POST only; path allowlist; no body or cookie logging; no response rewriting beyond the toolkit's cookie sanitising |
| Identity | only from `auth.getSession()` on the server; server-function validators take no user id; server functions are built with `authMiddleware` |
| Cookies | HttpOnly and Secure (toolkit), `SameSite=Lax` so the Google return trip works; cache cookie signed with `NEON_AUTH_COOKIE_SECRET` |
| Authorization | `canEnter` in server functions; denial returns no data; run ownership by construction in the store; the four run functions reject visitors with no verified session before touching the store (checked in the service and again by `requireUser`) |
| Input | zod strict validators; limits in 6.2; legend id checked against the catalogue |
| Score and counts | score is computed on the server; counts are client-reported (a known limit, recorded in `docs/tech-decisions.md`); seed and true version are server-made |
| Errors | typed errors with fixed messages; no stack traces, SQL or env values in responses |
| SQL | Drizzle builders only; no string-built SQL |
| Secrets | none in code, tests or docs; `.env` ignored. The final scan is **pattern-based and never opens `.env`**: `scripts/scan-secrets.mjs` flags `postgres://` or `postgresql://` strings with credentials, `neon.tech` hosts with credentials, and long base64 or hex values next to SECRET, KEY, TOKEN or PASSWORD, in tracked and untracked files except `.env*` (only `.env.example` is read), `.git` and `node_modules`. It prints file and line only, never the matched text. Its own tests build their fixtures from parts so no secret-shaped literal sits in the repo. Branch safety (that the migration and import landed on `dev-skeleton-core` and not on the default branch) is checked through the Neon MCP, not by reading `.env` |
| Known gaps | no rate limiting on sign-in or sign-up (Neon's service has its own); anyone can sign up (Neon); email verification off |

## 11. Tests

| Requirement | Test | Where |
|---|---|---|
| R7.1 | properties: score never negative; more Hint 2 or wrong answers never raise it; tutorial and guest world open to every guest; every world open to every user; every other world closed to a guest | `skeleton/test/access-score.property.test.ts`, 100 runs each |
| R7.2 | validation rules one by one, with an invalid case for each | `skeleton/test/runs-validate.test.ts` |
| R7.2 | ownership: two users' rows in a fake store; user B cannot get, finish or list A's run; a foreign run id behaves as not found | `skeleton/test/runs-ownership.test.ts` |
| R7.2 | start-run logic with a fake store: seed injected; `GeneratorError` retries then fails naming the legend; stores seed and the generator's true version; abandons the old in-progress run; the client cannot supply either value | `skeleton/test/runs-service.test.ts` |
| R4.10 | a fake store that throws `23505` on the unique index: fixed friendly 409, no extra row | `skeleton/test/runs-service.test.ts` |
| R4.11 | all four functions reject a guest and never touch the store (spy store) | `skeleton/test/runs-session.test.ts` |
| R4.12 | the guest module imports nothing networked; the four run functions are the only writers | `skeleton/test/guest.test.ts` |
| R7.2 / R4.8 | legend snapshot round trip for all twelve legends (plan model equals the parsed legend; same `generate` output) | `skeleton/test/legend-snapshot.test.ts` |
| R7 (4a) | the secret scanner flags each pattern in a fixture, skips `.env*` except the example, and returns file and line only | `skeleton/test/scan-secrets.test.ts` |
| R6 | `resolveLocale`; i18n keys exist in `en`; no physical-direction utilities in `apps/game/src` | `skeleton/test/locale.test.ts`, `apps/game/test/*.test.ts` |
| 4.2 | the proxy path allowlist (pure function) accepts the real Better Auth paths and rejects `..`, absolute URLs and odd characters | `apps/game/test/proxy-path.test.ts` |
| 7 | guest storage: logic works with a fake storage; the module has no network import | `skeleton/test/guest.test.ts` |
| 9 | env validation names the variable and never echoes a value | `apps/game/test/env.test.ts` |

Each test is checked by breaking its rule on purpose, as in Phase 1. All run in `pnpm -r test` with no database, network or `.env`. The whole suite must pass (308 existing plus the new ones).

## 12. Smoke check (R8), against `dev-skeleton-core`

`apps/game/scripts/smoke.mjs`, run with the dev server up (`pnpm --filter @kiroween/game dev`). It uses a cookie jar and the real HTTP routes where it can:

1. `GET /game` as a guest: the hall lists twelve doors, only the tutorial and `banshee` open.
2. `GET /game/world/<another legend>` as a guest: no world data (redirect).
3. `POST /game/api/auth/sign-up/email` (random `@kiroween-smoke.invalid` address, random password, never printed), then sign in.
4. `GET /game/api/auth/get-session`: take the verified user id.
5. `GET /game/world/<another legend>` with the session cookie: world summary returned.
6. Start a run and finish it through the skeleton service (real `RunStore`, the verified user id), list it, read completed worlds.
7. Sign out; the next hall request is a guest again.
8. Read the twelve stored `legends.model` values and check each equals the parsed legend (prints yes or no per legend, never a row).
9. Clean up: delete the test user's runs by the exact user id; delete the test user through Neon Auth if its delete endpoint is enabled. If it is not, delete exactly one row with SQL on `dev-skeleton-core` only, by the exact test user id (`delete from neon_auth."user" where id = '<exact id>'`, run through the Neon MCP with the dev branch id), never by a pattern. The statement goes in the handover with the id shown as `<test user id>`; no credentials.

Every command and result is recorded in the handover. No credentials are printed.

## 13. Base path `/game` (risk, Task 2 spike)

`basepath` is a documented router option, but I have not found documentation for how Start serves its **server routes and server-function URLs** under a base path. Task 2 builds the smallest app first (one page, one server function, one server route) and proves all three under `/game` in dev and in the production build, before anything else is written. If Start cannot do it with `basepath` and Vite `base`, the fallback is to place every route under `src/routes/game/` so every URL starts with `/game`, with Vite `base: '/game/'` for assets. I will report which one worked. `vercel.json` stays exactly as the decisions file says.

## 14. Files and folders this phase adds

`.kiro/specs/auth-progress/` · `apps/game/` (Start app: `src/`, `scripts/smoke.mjs`, `test/`, `vite.config.ts`, `tsconfig.json`, `package.json`) · `skeleton/src/{access,score,runs,guest,locale}/`, `skeleton/src/db/runStore.ts`, a `runs` table in `skeleton/src/db/schema.ts`, `skeleton/drizzle/0001_runs.sql` (the `runs` table and the `legends.model` column), `scripts/scan-secrets.mjs` (repo root) · the new skeleton tests above · `docs/phase-2-handover.md` · edits to `docs/tech-decisions.md`, `docs/kiro-usage.md`, `.env.example`. Nothing under `content/` or `assets/`.

## 15. Decisions taken at design approval

1. Legend read-back: option A (`legends.model`), one more `db:import` allowed (6.4).
2. A stub world route `/game/world/$target`, title only.
3. Starting a run abandons the older in-progress run in the same transaction; a race returns a fixed friendly 409 (6.1).
4. Test-user deletion by the exact id with SQL on the dev branch only, if the API cannot (12, step 9).
5. Arabic flag: direction only, English fallback per key.
6. The secret scan never opens `.env` (10).
7. Run functions reject sessionless requests and guest progress never reaches the server (6.2, 7).
8. The base-path spike is Task 2, before anything else; `src/routes/game/` is the agreed fallback; `vercel.json` stays untouched (13).
