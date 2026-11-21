# Phase 5 decisions

Choices made during task execution under the working rule "choose the smallest option that fits, record it, continue". One entry per choice: task, choice, reason.

## Task 1.1

- **Debug folder:** `.debug/` at the repo root, added to `.gitignore`. All debug and layout screenshots go there, never to `docs/`.
- **Docs record:** pages and dates go to `docs/phase-5-notes/docs-read.md`, so this file holds only decisions.
- **Deployment Protection on the game alias:** the docs say Standard Protection leaves production domains open but restricts the production generated deployment URL. Whether the `<project>.vercel.app` production alias counts as a production domain is not stated plainly. Kept as an open fact for the check after the Vercel projects exist (task 1.12 / 3.2), as the design says.

## Task 1.2

- **Nitro version:** `nitro` pinned exactly to `3.0.261103-rc` in the `devDependencies` of both apps. It is the only version on npm `latest` (checked with `pnpm view nitro dist-tags` on 2026-11-21) and the one the Vercel TanStack Start page installs. It is a release candidate; the risk is design fact U5, settled by the local `VERCEL=1` build (task 1.5) and the first Vercel build log.
- **Dev dependency, not dependency:** Nitro is used only at build time by Vite, so it sits next to Vite in `devDependencies`. Vercel installs dev dependencies during the build.
- **Import:** `import { nitro } from 'nitro/vite'` (the package's `./vite` export). The plugin is added after `tanstackStart()` only when `process.env.VERCEL` is set.
- **Peer warning:** `pnpm add` reported an existing unmet peer (`@better-fetch/fetch` 1.3.3 wanted, 1.3.2 found, under `@neon/auth`). It predates this change and is left as is.

## Task 1.3

- **Files:** `apps/atlas/vercel.json` and `apps/game/vercel.json` created. Each keeps `git` exactly `{"deploymentEnabled":{"*":false,"main":true}}`, plus `$schema`, `installCommand` (`cd ../.. && pnpm install --frozen-lockfile`) and `headers`. The atlas file also holds the two `/game` rewrites. The repo-root `vercel.json` is unchanged.
- **Game alias placeholder:** the rewrite destinations use `https://GAME-PROJECT-ALIAS-PLACEHOLDER.vercel.app`. The real alias is written in after the Owner creates the game project (task 1.12). The config test fails if the placeholder is still there only once the alias is known (checked in task 3.1, before the push), not now.
- **CSP (Requirement 8.3):** a full CSP is sent, but with `'unsafe-inline'` in `script-src` and `style-src`. Resource that blocks a strict CSP: Start's server-rendered inline scripts (hydration data) and inline `style` attributes that carry theme variables. A nonce for every inline script is code work outside the requirements. `form-action` is left out so the sign-in redirect after a form post is not blocked.
- **Frame blocking:** both `frame-ancestors 'none'` in the CSP and `X-Frame-Options: DENY`, for older browsers.
- **`immutable` on `/media` (risk):** media files are named by asset id, not by content hash. A replaced image keeps its URL and stays cached for a year, so a changed image needs a new asset id. Accepted because the assets are final; recorded as the reason Requirement 4.6 allows.
- **Header rule overlap:** the atlas security rule uses `/:path((?!game(?:/|$)).*)` so responses that come through the `/game` rewrite do not get a second copy of each header. The game project sets its own.

## Task 1.4

- **Test place:** `skeleton/test/vercel-config.test.ts`, next to the other repo-level checks (`scan-secrets.test.ts`). It reads the three `vercel.json` files from disk, so `pnpm -r test` runs it with no network.
- **Extra checks beyond the task text:** the year-long cache rules, the `/game` rewrites being first, and the negative-lookahead source tested as a plain regex (`/gamebook` matches, `/game` and `/game/…` do not).
- **Mutation:** `nosniff` changed to `sniff` in the atlas rule: 1 test failed; file restored from a copy made just before the edit; 10 passed.

## Task 1.5

- **Vercel-style builds:** `VERCEL=1 pnpm --filter @kiroween/atlas build` and `VERCEL=1 pnpm --filter @kiroween/game build` both pass with no error (Nitro preset `vercel`, compatibility date 2026-11-21). Output goes to `apps/<app>/.vercel/output/` and `apps/<app>/node_modules/.nitro/`.
- **What the output shows:** the atlas static output holds `assets/`, `media/` and `world-land.svg`, so the `/media` copy reaches Vercel's static files (part of fact U5). The game static output sits under `static/game/`, so `/game/assets/…` is served by the game project. Nitro's own `config.json` already sets `cache-control: public, max-age=31536000, immutable` on `/assets/…` (atlas) and `/game/assets/…` (game); our `vercel.json` rules repeat it and add `/media`.
- **Not proven locally:** the generated `config.json` holds Nitro's routes only; Vercel merges `vercel.json` rewrites and headers at deploy time. Facts U1 (rewrite before the Nitro catch-all) and U4 (headers on rewritten responses) stay open until the first deploy.
- **Git-ignore check:** `.output/`, `.vercel/` and `.nitro/` were all listed in `.gitignore` already; `git check-ignore` confirms `apps/atlas/.vercel/output/config.json` and `apps/game/node_modules/.nitro/…` are ignored, and `git status` shows none of them. Nothing deleted, nothing added.
- **Normal builds and `serve-build.mjs`:** normal builds pass (`dist/client`, `dist/server` in both apps). Both local servers start (`build served on …`) and serve static files: atlas `/assets/…` 200, atlas `/media/…` 200, game `/game/assets/…` 200. Pages answer 500 because the database variables are not in the shell (`ATLAS_DATABASE_URL is not set`, `DATABASE_URL is not set`). Loading `.env` into the server (`node --env-file`) was blocked by Kiro's guard, which matches the rule never to read `.env`. Full page checks against a local build need the Owner to run the server with the env loaded; the deployed check in G3 covers the same pages.
- **Found running:** an older game `serve-build.mjs` (pid 83577, started 2026-11-20, port 3917, all interfaces) is still running from before this phase. Not started by Phase 5; left running. The Owner can stop it.

## Task 1.6

- **Cause (Requirement 9.1):** `@tanstack/router-core` `ssr/transformStreamWithRouter.js` arms a lifetime timer on every SSR stream: `lifetimeMs = (timeoutMs ?? 60000) * 2` = 120 s. If the stream has not finished by then it is errored with `new Error("Stream lifetime exceeded")`. A stream does not finish when the client stops reading (a stalled or backgrounded tab: backpressure holds the stream open) or when a serialization never resolves. `serve-build.mjs` copied the body with `Readable.fromWeb(body).pipe(res)`; `pipe` does not forward errors, so the source emitted `error` with no listener and Node exited. This matches "about 120 s after an unfinished stream".
- **Reproduced:** `/tmp/repro.mjs` (not in the repo) served a web stream that errors with the same message after 100 ms. Old `.pipe`: process exit 1 with `Error: Stream lifetime exceeded`. New helper: second request answers 200.
- **Fix:** new `apps/atlas/scripts/pipe-response.mjs` (`pipeResponse`): `stream.pipeline(Readable.fromWeb(body), res, cb)`. The callback ignores premature close, `ECONNRESET` and the lifetime error, and prints one line (message only) for anything else. `res.on('close')` destroys the source when the client leaves early, which cancels the web stream so Start can clean up.
- **Extra, same file:** `app.fetch` in the atlas `serve-build.mjs` is now in `try/catch` with a fixed 500 "Server error", as Phase 4 did for the game. Without it a rejected handler still ended the process. Smallest change that meets 9.2 "keep running".
- **Vercel (Requirement 9.3):** the Nitro `vercel` preset builds `functions/__server.func` with `launcherType: Nodejs`, `supportsResponseStreaming: true`, runtime `nodejs24.x`, and exports a web handler (`vercel.web.mjs`: `export default { fetch }`). Vercel's runtime consumes the returned `Response` itself; our `pipe` code is not used there. The lifetime timer still runs in Start, so a stalled client still gets its stream ended after 120 s, but that ends one response, not a long-lived process we own. Whether Vercel's runtime handles the stream error without failing the instance is checked on production in task 3.2 (abort a request mid-stream, then the next request must succeed).
- **Dependency:** `fast-check` `4.10.3` added exactly to the atlas `devDependencies` (same pin as the game) for this property test.
- **Note for 1.8:** Nitro's Vercel handler defines `req.ip` from the first `x-forwarded-for` entry, the same rule `visitorKey` uses.

## Task 1.7

- **Change:** `apps/game/scripts/serve-build.mjs` now calls `listen(port, 'localhost', …)`.
- **Check:** with the build server on port 3100, `lsof` shows it listening on `[::1]:3100` only (macOS resolves `localhost` to `::1` first). Node `fetch('http://localhost:3100/game/assets/…')`, the same client and default base `smoke.mjs` uses, gets 200. `127.0.0.1` and the LAN address are refused (`ECONNREFUSED`), so the server is no longer reachable from the network.
- **Smoke:** a full `smoke.mjs` run needs the server started with the dev database variables. Loading `.env` into the server was blocked (task 1.5), so smoke was not run end to end here. Its connection path (Node `fetch` to `http://localhost:<port>`) is the one checked above, and `browser-check.mjs` opens `localhost` too (its `127.0.0.1` is Chrome's DevTools socket, not this server). Binding kept. If the Owner's smoke run cannot connect, the fallback is `listen(port, '127.0.0.1')` and smoke with `http://127.0.0.1:3000`.
- **Side effect:** a tool that hard-codes `127.0.0.1` for this server would now be refused on macOS. None exists in the repo.

## Task 1.8

- **Module:** `skeleton/src/play/rateLimit.ts`, exported from the skeleton index. `createRateLimiter({ limit, windowMs, maxKeys, now })` is a fixed window per key in a `Map`. A key is re-inserted when its window restarts, so the first map entry is always the oldest window. When a new key would pass `maxKeys`, the oldest windows are dropped first. `retryAfterSeconds` is at least 1. A `size()` method was added so the test can check the `maxKeys` bound without reading internals.
- **Values (Requirement 10.1):** `TUTORIAL_ANSWER_LIMIT = 30` answers per `TUTORIAL_ANSWER_WINDOW_MS = 60_000` per visitor, `RATE_LIMIT_MAX_KEYS = 5000`. To change them: edit these three constants, then update the production smoke burst check (it expects a 429 within the first 40 answers). A test pins the shipped values so a change is a visible decision.
- **Key and fail open (Requirements 10.6, 10.7):** `visitorKey` takes the first `x-forwarded-for` entry, trimmed, else `x-real-ip`, trimmed. Empty or over 64 characters counts as absent. With no usable value it returns `null`, and the caller does not limit that request (fail open). There is no shared fallback key, so visitors never share one bucket. On Vercel the platform sets `x-forwarded-for`, so the fail-open path is for local runs and unusual proxies. The key is never logged.
- **Test model fix:** the first draft of the Property 1 model opened the first window at time 0 instead of at the first call; fast-check found it (`[1,3,[1,2]]`). The model was wrong, not the limiter.

## Task 1.9

- **Middleware:** `tutorialRateLimit` in `apps/game/src/server/middleware.ts`, on `tutorialAct` only: `.middleware([authMiddleware, tutorialRateLimit])`. On excess it sets 429 and throws `TOO_MANY_TRIES_MESSAGE` ("Too many tries. Wait a moment."). The handler never runs on a refused call, so fear and tutorial rules are untouched (10.5). The decision is a plain function `tutorialRateRefusal(headers, limiter)` so tests can call it with their own limiter.
- **Fixed text in one place:** `TOO_MANY_TRIES_MESSAGE` lives in `skeleton/src/play/rateLimit.ts` and is exported from both the skeleton index and `@kiroween/skeleton/client`. The tutorial page compares the error message with it (`isTooManyTries` in `playClient.ts`) and shows the new catalog key `error.tooManyTries` (same words; a test checks they match). Other failures still show `error.generic`.
- **No `Retry-After` header:** left out; Requirement 10.2 asks for a fixed text with no limit internals, and the client does not retry by itself.
- **Clock:** the Phase 1 rule (`rng.test.ts`, R4.3) bans `Date.now` under `skeleton/src`. `now` is therefore a required option of `createRateLimiter`; the game middleware passes `() => Date.now()`.
- **Changed Phase 4 test:** `apps/game/test/server.test.ts` "every server function runs behind the auth middleware or requireUser" now also accepts `, tutorialRateLimit` after `authMiddleware`. Auth still has to come first. The new test checks that only `tutorialAct` uses the limit.
- **Test style:** `apps/game/test/rate-limit.test.ts` replaces Start's `getRequest` and `setResponseStatus` with `vi.mock` and runs the real middleware and limiter: 30 calls pass to the handler unchanged, the 31st gets 429 with the fixed text and the handler is not called, the refusal has no digits or address, nothing is logged, another visitor is unaffected, and a request with no address is never limited.

## Task 1.10

- **Server lock (Requirements 23.1, 23.2):** new `PlayErrorCode` `'tutorial-required'` (403, "Do the tutorial first.") in `skeleton/src/play/errors.ts`. `startWorld` checks `store.tutorialDone(visitor.id)` for signed-in visitors right after the access rule (`requireWorld`) and before the legend, the current run or a new run is read or written. A refused start stores nothing. `actInWorld` is not checked: without a started run there is nothing to act on.
- **Order:** the access rule stays first, so a guest at a closed World still gets `sign-in-required`, and an unknown legend still gets `not-found`.
- **Guests (Requirement 23.3, decision):** no server check. A guest's tutorial receipt lives only in the browser, and checking it in `startWorld` would add a receipt field to the start input, changing the Phase 4 play schema (out of bounds). The Hall keeps the guest check, as in Phase 4. Effect: a guest who skips the Hall can open the guest World directly. That World is open to guests anyway, and guests store no score or progress.
- **Client message (Requirement 23.4):** `isTutorialRequired` in `playClient.ts` matches the fixed server text. On the World screen `StartRetry` then shows the Hall's existing locked-door text `hub.door.locked` and a button labelled `hall.tutorial` that goes to `/tutorial`, instead of a retry that would fail again. No new catalog key. `Hall.tsx` needed no change: it never calls `startWorld`, and it already shows locked doors from `tutorialDone`.
- **Test setup change:** the shared `playSetup` helper (`skeleton/test/helpers/play.ts`) now defaults to a player who has done the tutorial, the precondition of every Phase 4 World scenario; `{ tutorialDone: false }` gives the real memory-store flag. 64 Phase 4 tests failed under the lock before this, all because their players had no flag. The tutorial-flag test in `play-service.test.ts` now asks for the real flag. No test assertion was weakened.

## Task 1.11 (G1 gates)

- **Tests:** `pnpm -r test`, no database or network: skeleton 51 files, 722 passed, 8 expected fail; atlas 11 files, 163 passed; game 21 files, 266 passed. `pnpm -r typecheck` clean in all three.
- **agent-tester:** gaps found and closed: (1) the stream property did not check that a real error is reported; now it does when the client is still reading; (2) the `localhost` binding had no test; `serve-build.test.ts` now checks the only `listen` call. Both mutation-checked. Gap kept: the tutorial page's `error.tooManyTries` message has no render test (the route pulls in server functions); the mapping function and the catalog wording are tested.
- **agent-guard** (`guard_context.py` lanes: clean-code, test, docs): one fix, `skeleton/src/index.ts` — unused `type Hit` and `type RateLimiterOptions` re-exports removed. `size()` on the limiter is kept as the test seam for the `maxKeys` bound. Test lane: mocks only Start's request helpers (a boundary), assertions are on behaviour. clean-code-guard: 1 fixed, 0 flagged.
- **agent-security** (`security_change_scan.py`): 4 signals, all false positives (`en.ts:30` is the password field label; three `exec(` hits are `RegExp.exec`). Manual review:
  - **Finding S1 (medium, open until deploy):** Vercel docs (request headers) say Vercel overwrites `x-forwarded-for` with the client's public IP and does not forward outside values, so a visitor cannot spoof the key. Not documented: what the game project sees when the request arrives through the atlas project's external rewrite. If it is a Vercel edge address, many visitors would share a few buckets, which breaks Requirement 10.7 in effect. Check added to task 3.2, without printing any address: burst `tutorialAct` through `/game` until 429, then send answers straight to the game alias from the same machine. Limited on the alias too means the key is the visitor's address (pass). Not limited is ambiguous (per-instance counts), so repeat once; still not limited means stop and propose keying on `x-vercel-forwarded-for` or moving the limit to a Vercel firewall rule.
  - **S2 (low):** a client with many IPv6 addresses can fill the 5000-key map and push out other visitors' windows. Effect is fail-open for those visitors, never a lockout. Accepted.
  - **S3 (low):** Deployment Protection off on the game project makes its alias reachable directly. The alias sends the same security headers (game `vercel.json`), keeps CSRF and auth, and its cookies are host-only on the alias. No new data path. Accepted, as in the design.
  - Tutorial lock: enforced in the service before any read or write; refusal text fixed; access rule still first. No finding.
  - Headers/CSP: `'unsafe-inline'` recorded (1.3). `X-Frame-Options: DENY` plus `frame-ancestors 'none'`. No finding.
- **verify-and-stop:** G1 acceptance (Requirements 4.2, 4.10, 4.13, 8.1–8.4 config side, 9.1–9.4, 10.1–10.7, 23.1–23.6) proven by the commands above and tasks 1.2–1.10. Open, by design, until deploy: U1, U4, U5 (part), S1, and the Owner-run smoke against a local build.

## Run order change (Owner, after G1)

The Owner creates the Vercel projects in parallel. Task 1.12 stays open until the origin and alias arrive at Stop B. The tasks file is not reordered; this list is the order now in force:

1. **Block A** (no Owner step, no Neon MCP call): 2.2; 4.1, 4.2, 4.3; 4.4 (code and test only); 4.5; 5.1–5.7; 5.8 (write `book-check.mjs` and `test:browser` only); 5.9; 6.1, 6.2, 6.4; 7.1–7.4; 8.2–8.5; 9.2 (Phase 5 log so far); 10.1; 10.2 (code only). Each group's gates run as planned. The Mid_Phase_Stop no longer blocks G5 and G6.
2. Runs that need a server with the database are not a stop: the script is written and the run goes to **Deferred runs** below.
3. End of Block A: both `VERCEL=1` builds and `pnpm -r test`, then **Stop B**, asking in one message for (a) origin and alias, after which the alias goes into the rewrites and the 1.4 test reruns; (b) one start command per app for the Owner's terminal, then all deferred runs and the screenshot paths; (c) G2: 2.1, 2.3, 2.4 (Neon MCP calls approved by the Owner at that point), the 2.5 Owner steps, 2.6, 2.7.
4. One push stop (3.1) for G1, Block A and G2. Task 4.6 dropped. Hotspot corrections arrive with the push confirmation. Then 3.2, 3.3, 4.7.
5. Task 4.8 is no longer a stop: timings and both URLs go into this file. Then 8.1, 9.1, 9.3, 10.3–10.10.

Stops kept: 3.2 for the Services switch, and 3.2 if the rate-limit key behind the rewrite turns out to be shared by many visitors.

## Deferred runs

| # | Task | Run | Needs |
|---|---|---|---|
| D1 | 1.7 | `node apps/game/scripts/smoke.mjs http://localhost:3000` against the built game with the dev env | game server with env |
| D2 | 4.4 | `KW_COOKIE='<Cookie header of a signed-in user who finished the tutorial>' node apps/game/scripts/browser-check.mjs --only layout --base http://localhost:3000 --cookie-env KW_COOKIE` (without the cookie: drop `--cookie-env`; only Hall, Tutorial and the guest World run, the rest print SKIP) | game **dev** server with the database (`pnpm --filter @kiroween/game dev`, started by the Owner, port 3000; add `--guest-world <id>` if `GUEST_WORLD` is not banshee); Chrome; for all 12 Worlds the Owner supplies one Cookie header value in an environment variable (copy it from the browser's request headers after signing in as a user who finished the tutorial; the script never prints it) |
| D3 | 5.8 | `pnpm --filter @kiroween/atlas test:browser -- --base http://localhost:3001 --slow4g` (same as `node apps/atlas/scripts/book-check.mjs --base http://localhost:3001 --slow4g`; writes `docs/phase-5-notes/book-check-g5.json`, exit 1 on any failure; add `--legends a,b` to limit the legends; add `FEATURE_ARABIC=true` on the server to run the RTL key check, else it prints SKIP) | built atlas on base URL **http://localhost:3001** (`pnpm --filter @kiroween/atlas build` then `pnpm --filter @kiroween/atlas start`, started by the Owner with the database env and `PORT=3001` if the default differs); Chrome (or `CHROME_BIN`); Node 22+; no cookie or secret. Slow 4G texture time goes into the JSON as `paper texture load on Slow 4G` (`start_ms`, `end_ms`, `duration_ms`, `bytes`); copy those numbers into this file after the run |
| D4 | 6.3 | `node apps/game/scripts/browser-check.mjs --only timing` (Slow 4G, 3 runs: Hall, Tutorial_Room, Banshee scene 1) against the local built game and atlas with the mood layer on; compare with the Phase 4 numbers and the 4.7 production numbers; record load and paint effect | both local servers with env |

## Task 2.2

- **Script:** `skeleton/scripts/set-atlas-web-password.ts`, run as `DATABASE_URL_UNPOOLED="$(pbpaste)" pnpm --filter @kiroween/skeleton db:set-atlas-web-password` (new package script). `psql` is at `/opt/homebrew/bin/psql` on this machine, so the `pg` fallback was not built.
- **No `.env`:** the script reads only the inline `DATABASE_URL_UNPOOLED`. It does not call the shared `unpooledUrl()` helper, because that loads the repo `.env`, which holds the dev branch: a missing inline value would then silently change the dev password. Missing or malformed input prints `connection string: no` and `password set: no`, exit 2, and runs nothing.
- **Secrets path:** admin connection via `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGSSLMODE=require` in the child environment; arguments are `-X -q -v ON_ERROR_STOP=1` only. The new password (`randomBytes(24)`, base64url, 32 characters) goes to psql on standard input. Child stdout and stderr are discarded, since psql errors can name the host or role. The child environment is `PATH`, `HOME` and the PG variables only.
- **Output:** `password set: yes|no`, then on success `copied to clipboard: yes|no`. The reader URL is built with the `URL` API (pooled host = endpoint id + `-pooler`, `sslmode=require`) and sent only to `pbcopy` standard input.
- **Tests:** Property 13 with a fake child (any credentials, psql exit 0/1/3/spawn error, pbcopy exit 0/1/error), plus the real script run by `tsx` with fake `psql` and `pbcopy` on `PATH` that echo `$PGHOST` to stderr, to prove child noise never reaches the output.
- **Secret scan:** the first test draft and the design's placeholder URL tripped `scripts/scan-secrets.mjs` (credential-shaped literals). The test now joins URLs at run time and the design line was reworded. Scan: no findings.
## Task 4.1
- **Context default:** `ScenePaintContext` defaults to "nothing settled", so any viewer, spirit or meter rendered outside a provider defers its secondary images. `ScenePaintProvider` (in `ScenePaint.tsx`) holds the last settled scene id; `firstSceneLoaded` is true once any scene has settled. Smallest option: one `useState`, no per-scene set.
- **Placeholder:** the sprite's existing sized `span` is the placeholder; only the inner `img` is omitted. No new element, so layout, hotspot positions and sprite boxes are unchanged (Requirement 11.6).
- **Spirit panel frame:** the dialog frame is a CSS `background-image` on `SpiritPanel`; it is a secondary image too, so the inline style is set only after the first scene settled. The question text and its panel stay in the markup.
- **Settle paths:** scene `img` `onLoad`, `onError`, and a mount effect that settles if `imgRef.current?.complete` is already true.
- **Providers:** wrapped the returned tree of `WorldPlay`, `TutorialRoom` and `Hall` (one provider each).
- **Tests:** `viewer.test.ts` sprite test now checks the server markup (no sprite img, sprite box kept) and the settled markup (lazy, sized). `fear-ui.test.ts` gained a spirit-figure deferral test. New `scene-deferral.property.test.tsx` (Property 11, fast-check). Game `vitest.config.ts` include widened to `*.test.{ts,tsx}` so the `.tsx` test runs, same as the atlas.
- **Gap:** no DOM in the game tests, so real load/error events are checked by source wiring assertions, not by firing events.
- **Extra test touched:** `world.test.ts` asserted spirit images in server markup; it now asserts they are absent (same Requirement 11.4 change).
## Task 4.2
- **Docs read:** `pnpm view sharp version` gave 0.35.5; read sharp `resize` (`width` only auto-scales height; `withoutEnlargement`) and `webp` (default quality 80) pages. Network was reachable.
- **Dependency:** `sharp` 0.35.5, exact pin, `devDependencies` of `apps/atlas`. Installed with pnpm without a build-script approval prompt. Justification in `docs/tech-decisions.md`. Whether it runs on Vercel's Node 24 build image is checked at the first deploy (task 3.2).
- **Copy rule:** a file gets a copy when its id contains `-hero-` and it is wider than 1000 px. Name `<id>-w1000.webp`, same folder, width 1000, height by aspect ratio, WebP quality 80 (sharp default), no other options. The id passes `assetUrl`, so no new URL rule.
- **Output:** written in `writeBundle` to `<client build dir>/media/...` only. Nothing is written under `content/` or `assets/`; no Needs_File entry was needed.
- **"Copy exists":** `heroSmall(image)` (skeleton) returns the small copy only for ids with `-hero-` and a declared width over 1000, the same rule the build uses, so the `source` is emitted exactly when the build makes the copy. No manifest file.
- **Markup:** `Img` got a `hero` prop. Hero renders `picture > source[media="(max-width: 1000px)"][srcset][width][height] + img`. No `x`/`w` descriptors, no `sizes`. Used on the legend page only; the home page hero is unchanged (out of scope), though its copy is also built.
- **Preload:** the legend route emits two preload links: the phone copy with `media="(max-width: 1000px)"` and the full image with `media="not all and (max-width: 1000px)"` (exact complement, no gap for fractional widths).
- **Dev:** the dev middleware resizes `-w1000` requests on the fly through the same function (no file written).
- **Exports:** `HERO_SMALL_WIDTH`, `HERO_SMALL_MEDIA`, `hasHeroCopy`, `heroSmall`, `heroSmallId`, `heroSmallSize`, `heroSource` from `skeleton/src/assets/heroCopy.ts` via `client.ts` and `index.ts`. `heroSource` ignores the pixel ratio by design (used by task 4.3's properties).

## Task 4.3
- **Property 2 model:** `pictureChoice` in the test reads the max-width from `HERO_SMALL_MEDIA` and applies "first matching source wins, else img"; it takes the pixel ratio and ignores it because the source has no `x`/`w` descriptor. Checked against `heroSource` for random widths (0 to 8000, fractional) at ratios 1, 2, 3, plus 1000/1001 and 390 at all three ratios.
- **Property 3:** widths 1001 to 6000, heights 1 to 6000; height equals `round(h*1000/w)`, within 0.5 px of the exact ratio.
- **Markup test:** `apps/atlas/test/hero-markup.test.tsx`, over all twelve legends, no DOM beyond `renderToStaticMarkup`. Separate file from `legend-render.test.tsx` to leave that one untouched.
- **WebP-header test:** the existing one is `skeleton/test/asset-url.test.ts`. Added a case that reads `apps/atlas/dist/client/media` and checks each built hero copy has width 1000 and height within 1 px of the ratio. Skipped when that folder does not exist. It requires every wide hero to have a copy when a build exists, so a stale build from before task 4.2 would fail it.
- **Mutation:** see `mutations.md`.

## Task 4.4

- **Scenario:** `--only layout` in `apps/game/scripts/browser-check.mjs` (`layoutCheck`). New flags `--base` (default `http://localhost:3000`), `--cookie-env NAME`, `--guest-world` (default `banshee`). Not part of the default scenario list. It prints only `PASS <world> <scene>: .debug/screens/<file>` or `SKIP`/`FAIL` lines, never the cookie.
- **Reaching World scenes (smallest working option):** a Cookie header taken from an environment variable and sent with every request (`Network.setExtraHTTPHeaders`). Needs a signed-in user who finished the tutorial (the server locks Worlds without it, task 1.10). Without it only the Hall, the Tutorial_Room and the guest World run; the other eleven print SKIP (the server redirects them).
- **Scenes:** the World tab buttons (`.scene-tab`) are clicked one by one; the file name uses the layout scene id, exposed as `data-scene-id` on `.scene-viewport` (new, harmless in production).
- **Window:** 1800 by 1000, so the whole panorama (1536 px at scale 0.375) fits; the script notes when it does not.
- **Hall and Tutorial_Room outlines:** only the World route passed `outline`. `SceneViewer` now also reads `?layout=1` from the address after hydration when no `outline` prop is given, behind `import.meta.env.DEV`. World behaviour is unchanged (it always passes a boolean).
- **Test:** `apps/game/test/overlay-not-built.test.ts` checks that no built client `.js` contains `scene-outline`. Skipped without a build. A fresh normal build passes it; mutation in `mutations.md`. The class also stays in the built CSS (`scene.css`), which the test does not read.
- **Not run:** the scenario needs the dev server with the database (Deferred runs D2).
- **Paths the run writes** (`.debug/screens/`, git-ignored): `hall--<scene>.png`, `tutorial--tutorial.png`, and for each of `baba-yaga`, `banshee`, `chupacabra`, `draugr`, `el-coco`, `flying-dutchman`, `gumiho`, `jersey-devil`, `naddaha`, `spring-heeled-jack`, `vetala`, `yuki-onna`: `<world>--<scene-id>.png`, one per scene (scene ids are the layout `sceneId` values, e.g. `scene-01`).
- **Guessed hotspots to check in those screenshots** (from `docs/phase-4-notes/layout-open-matches.md`; ids are the box ids, e.g. `h-10`):
  - `baba-yaga`: h-10 hands (log wall), h-12 horns (post by window), h-14 print (middle post), h-16 skull (fence lamp), h-03 broom (stump)
  - `chupacabra`: h-06 drawing (clothesline post)
  - `draugr`: h-14 spear (path), h-02 horse rail (fence), h-06 lantern (left of door)
  - `el-coco`: h-04 hooded shadow (right wall)
  - `flying-dutchman`: h-03 letters, h-05 spyglass, h-06 rope coil, h-08 miniature, h-09 chart
  - `jersey-devil`: h-01 cradle, h-02 bible page, h-03 tracks, h-08 crest stamp, h-09 broadside, h-13 schedule
  - `naddaha`: h-15 film bill, h-17 pale shape, h-11 shaduf, h-07 palm trunk
  - `spring-heeled-jack`: h-08 folded letter, h-09 letter stack, h-11 clock, h-10 lantern
  - `vetala`: h-11 distant fires, h-15 footprints, h-07 tree and bundle (large)
  - `yuki-onna`: h-14 print, h-09 smoke-hole (large), h-15 brazier, h-03 willow (large)
  - `banshee`, `gumiho`: none listed in the open-matches file.

## Fix found during 4.4: limiter leaked into the client bundle (my bug from task 1.9)

- **Found:** the 4.4 sub-agent rebuilt the game, and the Phase 4 built-output test "the client bundle has no … answer data" failed: `dist/client/assets/functions-*.js` held `trueVersionId` (the run-table schema), the limiter code and the `createRateLimiter(...)` call.
- **Cause:** task 1.9 put the limiter instance and `tutorialRateRefusal` at the top level of `apps/game/src/server/middleware.ts`. Start removes only `.server()` bodies from the client build, so the top-level call kept the `@kiroween/skeleton` index, and with it the Drizzle schema, in the client chunk. The G1 run did not catch it because `dist` was built in task 1.5, before 1.9.
- **Fix:** limiter and `tutorialRateRefusal` moved to the new server-only `apps/game/src/server/tutorialRateLimit.ts`; `middleware.ts` references it only inside `.server()`. After a rebuild `true_version_id` is in no client file; "Too many tries" appears only as client text (catalog and `TOO_MANY_TRIES_MESSAGE`). Game tests 23 files, 275 passed.
- **Guard added:** the built-output test now also fails if `x-forwarded-for` or `retryAfterSeconds` appears in client JS.
- **Lesson for later tasks:** any built-output test needs a fresh build first; G10 rebuilds before testing.

## Task 4.5 (G4 code gates)

- **Tests:** fresh normal builds of both apps first (built-output tests read `dist`), then `pnpm -r test`: skeleton 53 files, 731 passed, 8 expected fail; atlas 12 files, 175 passed; game 23 files, 275 passed. Typecheck clean in all three. Secret scan: no findings.
- **agent-tester:** the 4.1 to 4.4 tests each have a recorded mutation. Found by the fresh build: the client-bundle leak from 1.9 (fixed, see above). Gaps kept: deferral is checked by server markup and handler wiring, not by firing real `load`/`error` events (no DOM in the game vitest config); the real browser check is the production timing run (4.7). The `--only layout` scenario itself is not run yet (deferred run D2).
- **impeccable** (launcher ran: `impeccable context`, then `detect --json --changed` in each app): no PRODUCT.md or DESIGN.md, so the incumbent code is the design authority for this refinement; no interview needed. Game: no findings. Atlas: 2 `broken-image` warnings on `LegendPage.tsx` lines 21 and 63; false positives, they are the `<Img>` component with an `image` prop, not raw `img` tags with an empty `src`. No visual change in G4 beyond placeholders that keep the existing sprite boxes, so no screenshot pass.
- **agent-guard:** clean-code-guard: 0 fixed, 1 flagged: `heroSource(width, dpr)` in `skeleton/src/assets/heroCopy.ts` has no production caller; it is the design's model of the browser's choice used by Property 2. Kept because the design names it; remove if the Owner prefers the test to hold the model. `ScenePaintContext` is exported for tests only (a seam, accepted).
- **verify-and-stop:** 11.1–11.6, 13.1–13.9 and 21.1–21.3 (code side) are covered by the tests above. Open by design: 13.3 on real phones and 14.x timings (production, 4.7); 21.x screenshots (D2).
## Task 5.1 (book foundations in the Skeleton)
- **Files:** `skeleton/src/book/{pagination.ts,bookPref.ts,bookColors.ts,book.css,index.ts}`, `skeleton/test/book-foundations.test.ts` (smoke only; Properties 4 to 8 come in 5.2 and 5.3), `skeleton/package.json`, `skeleton/tsconfig.json`, lockfile.
- **react pin:** `react` 19.3.1 (exactly the apps' version) as `peerDependencies` and `devDependencies`, plus `@types/react` 19.3.0 dev. Peer, so the apps' single React copy is used and the skeleton never ships its own (two copies break hooks). Dev, so the skeleton typechecks and tests its own components (Book.tsx in 5.4). `jsx: react-jsx` added to the skeleton tsconfig. `pnpm install` works; the only warning is the existing `@better-fetch/fetch` peer note.
- **Exports:** `./book` (index.ts) and `./book/book.css`. The index holds only pure modules for now; Book.tsx joins in 5.4.
- **Signatures** exactly as in the design. `pageCount` returns at least 1 and 1 on bad input. `pageOfOffset` uses a 0.5 px tolerance for sub-pixel layout and computes the page stride from the column count (always view width + gutter). `pageAfterReflow` returns page 0 for a null or unknown block; the hash-wins rule is left to the component (Requirement 16.6).
- **Preference:** key `kiroween.book.v1`, values `pages`/`scroll`, default `pages`; read and write swallow storage errors. The inline `<head>` script (5.5) maps this to `data-book` on/off.
- **Colours:** `PAPER_BASE #e9e1d3`, `PAPER_FLOOR #a89368`, `BOOK_INK #2b1d12` (checked ≥ 4.5 by the smoke test), `BOOK_ACCENT #4a1c12` (4.8:1 on the floor). `bookColors` takes `vars['--color-ink']`/`['--color-accent']` from a resolved theme or `ink`/`accent` from the base palette; invalid hex or low contrast falls back per role. Light pack inks always fall back (they cannot reach 4.5:1 on the floor).
- **book.css:** `--book-*` tokens on `:root`; paper = the existing `shared-atlas-paper-01` URL (`--book-paper-image`) multiplied with a warm tint, two foxing radials, a symmetric edge gradient (no direction needed) and an inset vignette. Pagination, spread (1024 px), gutter shadow, break rules, print reset and reduced motion (`prefers-reduced-motion` and `html[data-motion='reduce']`) are included so 5.4 only adds the component. Only logical properties; `translateX` sign comes from `--book-sign` (−1 in RTL). The paper URL is the `/media/shared/...` path that `assetUrl` produces, written literally because CSS cannot call it.
- **Open for 5.8:** the real lowest paper colour (texture × tint × edge × vignette) is checked in the browser; `PAPER_FLOOR` is an estimate until then.
- **Results:** `pnpm -r typecheck` clean (3 projects). `pnpm -r test`: skeleton 54 files, 736 passed, 8 expected fail; atlas 12 files, 175 passed; game 23 files, 275 passed.

## Task 5.2 (test the pure book logic)
- **File:** `skeleton/test/book-pagination.property.test.ts` (12 tests: Properties 4 to 7). No change to `skeleton/src/book`; no bug found.
- **Whole pixels:** Property 4 uses integer widths, gutters and offsets, and anchors inside a view (never in the gutter). `pageOfOffset` has a 0.5 px tolerance, so a fractional offset just before a boundary (e.g. 299.6 with view 300, gap 0) maps to the next page and sits 0.4 px before its start. That is the intended sub-pixel rule from 5.1; real DOM offsets of text starts are whole or snapped by the column layout.
- **Property 5 hash rule:** the rule (prefer `location.hash`) lives in Book.tsx (5.4). Tested here is the pure part: with the anchor id passed as the block, `pageAfterReflow` returns the anchor's page. The component test in 5.4 must cover the choice itself.
- **Property 6:** clamping is done in the test (`apply`), as the design says "`keyToDelta` plus clamping"; the component repeats the same clamp.
- **Mutations:** two rows added to `mutations.md` (gutter ignored; no rtl swap). Edited with `sed`, restored from `/tmp` copies, diff clean.

## Task 5.3 (test and extend ink contrast)
- **Files:** `skeleton/test/book-colors.property.test.ts` (new, 4 tests: Property 8), `skeleton/test/theme.test.ts` (2 tests added). No change to `skeleton/src/book`; `PAPER_FLOOR` kept at `#a89368`.
- **Extended contrast test:** `theme.test.ts` runs `bookColors` for the twelve packs, the base theme and the Keeper's Note page (14 pages) and requires ink and accent ≥ 4.5:1 on `PAPER_FLOOR`, `PAPER_BASE` and the warm tint read from `book.css`. The Keeper's Note page has no pack of its own; it uses the base theme, so it is the base palette row.
- **Property 8:** random hex pairs reach 4.5:1 on the floor; colours are kept when they pass and replaced by `BOOK_INK`/`BOOK_ACCENT` only when they fail; non-hex input falls back; for the twelve packs the resolved theme object (fonts, glow, headings) is not touched by `bookColors` (18.5: it returns only `ink` and `accent`).
- **Floor check (read-only, built copy `apps/atlas/dist/client/media/shared/shared-atlas-paper-01.webp` read with sharp, nothing written):** texture mean rgb(232 225 211); darkest single pixel rgb(126 117 97); darkest 8 px patch mean rgb(218 202 179), 16 px rgb(227 216 199), 32 px rgb(228 220 205). Layers modelled from `book.css`: tint multiply, foxing 0.1, edge gradient 0.18, inset vignette 0.3 (blur 3rem).
  - Worst case with every layer at full strength and the darkest 8 px patch: `#8e734c`, ink 3.65:1, accent 3.20:1. That is not reachable: the page padding (1.25rem = 20 px) keeps text off the edge, where the edge gradient (fades over 7%, about 25 px) is about 0.03 and the Gaussian vignette (sigma about 24 px) about 0.06; foxing covers two small ellipses only.
  - At the 20 px text inset (foxing full, edge 0.033, vignette 0.06) on the darkest 8 px patch the colour is about `#b79a6d`, lighter than `PAPER_FLOOR` `#a89368`. So the floor is the safer estimate and stays; no darkening needed. A test (`PAPER_FLOOR is no lighter...`) pins this arithmetic with the measured patch colour and the `book.css` tint.
  - A single dark pixel (rgb 126 117 97) is lower than the floor in isolation, but contrast is judged over the local paper, not one pixel.
- **Left to 5.8:** the browser check of real rendered paper colours at the text edge (narrow phone width, RTL), since the vignette and edge fractions above are modelled, not measured.
- **Mutation:** `BOOK_INK` fallback lowered to `#8a7a60`: 5 tests failed; restored by hand from a `/tmp` copy (diff clean). Row added to `mutations.md`.
## Task 5.4 (the Book component)
- **Files:** `skeleton/src/book/Book.tsx` (new), `book.css` (edited), `index.ts` (exports `Book`, `BookLabels`, `BookProps`), `skeleton/tsconfig.json` (`DOM` added to `lib` so the component typechecks), both apps' `i18n/en.ts`, `apps/atlas/test/book-component.test.tsx` (4 tests).
- **Test location:** the skeleton has no `react-dom` and vitest there only includes `*.test.ts`, so the markup tests sit in the atlas (which has `react-dom`), importing `@kiroween/skeleton/book`. No new dependency.
- **API:** `<Book labels hero?>children</Book>`. `labels` = `region`, `previous`, `next`, `toggle`, `indicator(n, m)`. No strings in the skeleton. The toggle is one button with `aria-pressed` (pressed = Read as one page), so one label serves both states. I dropped `aria-roledescription="book"` from the design markup because it is an announced string and would need a key.
- **CSS change (bug in 5.1):** padding was on `.book-flow`, which makes one turn (flow width + gutter) differ from the column stride by twice the padding. Padding moved to `.book-viewport`; the viewport clip, height and padding are now scoped to `html[data-book='on']` (before, they clipped the text in scroll view). Print rules use the same scope and also drop the paper. Added control styles (44 px targets, focus ring, chevrons mirrored in RTL).
- **Behaviour:** the component sets `html[data-book]` itself (`on` only when columns and `ResizeObserver` exist and the stored preference is `pages`), so the 5.5 inline script only avoids the first-paint flash. Server and first client render are the scroll view with controls hidden; a layout effect reads capability and `bookPref` before paint. All controls hide when everything fits one page (game panels), except that scroll view always shows the toggle.
- **Position tracking:** reading position is the first block (`[data-block]`, `[data-anchor-heading]`, `.book-chapter`) on the page, found with `pageOfOffset`; reflow uses `pageAfterReflow`. The hash wins while `hashRef` is set; any turn by the reader clears it. Hash landing, focus with `preventScroll` and the 2 s `data-landed` mark are inside the Book (AnchorFocus is folded in by 5.5). Toggle keeps the same block: pages→scroll `scrollIntoView`, scroll→pages sets the tracked block then reflows.
- **Keys** act from anywhere in the book (not only the viewport) so keys keep working after a button click; they are ignored with Alt/Ctrl/Meta/Shift and in scroll view. Prev/next use `aria-disabled` at the ends (not `disabled`, which would drop focus). Swipe: non-mouse pointers, 40 px, horizontal dominant.
- **Catalog keys (en, both apps; ar left empty per the existing pattern, so it falls back to English). Wording for owner review:** `book.region` "Story pages"; `book.previous` "Previous page"; `book.next` "Next page"; `book.pageOf` "Page {n} of {m}"; `book.readAsOnePage` "Read as one page".
- **Type fixes in earlier tests/code:** `pnpm -r typecheck` was failing in `book-colors.property.test.ts` and `book-pagination.property.test.ts` (5.2/5.3). Fixed by widening the `bookColors` parameter to `{ ink, accent }` (drops the `BASE_PALETTE` import) and typing two test Maps as `Map<string, number>`.
- **Needs the 5.8 browser check (no DOM here):** real page counts and the two-page spread at 1024 px; chapters starting on a page boundary; page turn by buttons, keys (LTR and RTL), swipe; focusin turning; reflow after resize and font load keeping the same text; hash landing and hash-wins on resize; toggle keeping the chapter; print; the no-columns fallback; reduced-motion transition; the `book-paper` padding/vignette against `PAPER_FLOOR`.
- **Not done (later tasks):** atlas/game integration, `[data-block]` tagging in StoryText, inline head script, router hash setting (5.5/5.6); anchors-once and CSS tests (5.7).
- **Results:** `pnpm -r typecheck` clean (3 projects). `pnpm -r test`: skeleton 56 files, 754 passed, 8 expected fail; atlas 13 files, 179 passed; game 23 files, 275 passed.
## Task 5.5 (Book in the atlas)
- **Files:** `LegendPage.tsx`, `KeepersNotePage.tsx`, `StoryText.tsx` (`data-block=""` on every paragraph), `bookLabels.ts` (new, catalog labels), `bookHead.ts` (new, head script), `routes/__root.tsx`, `router.tsx`, `styles.css`, `skeleton/src/book/Book.tsx`, `test/book-integration.test.tsx` (3 tests). `AnchorFocus.tsx` deleted (nothing else used it).
- **What is in the Book:** on a legend page, the cold open, chapters, versions, documented/told table and sources. Header (hero, title, meta) and the contents nav stay above it. Everything with a hash target sits inside the Book, because the router no longer scrolls and only the Book lands on hashes. Chapters got `book-chapter`, plates `book-plate`. The hero stays in the header (not a frontispiece): smallest change. Keeper's Note: the "Fiction" label and title header stay above the Book; only the chapter section is inside.
- **Book.tsx fix:** hash landing had `if (!supported) return`; with `defaultHashScrollIntoView: false`, browsers without columns would never scroll to a hash. Guard removed; landing runs in every view.
- **Head script:** `BOOK_HEAD_SCRIPT` via the root route's `head().scripts`: sets `html[data-book]` to `off` only when `kiroween.book.v1` is `scroll`, else `on`; storage errors give `on`. Inline, so it relies on the existing `'unsafe-inline'` script-src (vercel.json unchanged). Without JS the attribute is never set, so no-JS readers get the scroll view. The Book re-sets it after hydration (corrects it when columns are unsupported).
- **CSS:** `@import '@kiroween/skeleton/book/book.css'` in `styles.css`. The build warns once that `/media/shared/shared-atlas-paper-01.webp` is resolved at runtime (it is copied to `dist/client/media`); expected.
- **`/anchor/keepers-note--ch-1`:** path read: `resolveAnchorFn` checks the note table, then `redirect(atlasUrl(anchor))` (`atlasUrl` unchanged) to `/legends/keepers-note#keepers-note--ch-1`, which renders `KeepersNotePage` with the section `id` once inside the Book. Test pins the redirect target.
- **Not done:** applying `bookColors` ink/accent to the page (not in this task); real browser checks (5.8); anchors-once and CSS tests (5.7). The theme-pack text colours on paper are untested visually.
- **Results:** atlas build ok. `pnpm -r typecheck` clean. `pnpm -r test`: skeleton 56 files, 754 passed + 8 expected fail; atlas 14 files, 182 passed; game 23 files, 275 passed. No existing atlas test needed changes.

## Fix after 5.5: theme colours on the paper (Requirement 18.1)

- **Found:** headings inside the Book use `text-glow`, captions and notes use `text-muted`, links use the accent: all dark-theme colours. On `PAPER_FLOOR` (`#a89368`) they measure glow 2.10:1, accent 1.40:1, theme ink 2.30:1, muted 1.03:1. The 5.5 report said `bookColors` was not applied to the page.
- **Fix:** `.book-paper` in `skeleton/src/book/book.css` re-points `--color-ink` and `--color-muted` at `--book-ink` (5.47:1) and `--color-glow` and `--color-accent` at `--book-accent` (4.80:1). Tailwind v4 colour utilities read these variables, so no markup changed. Focus outlines that use `--color-glow` turn dark red on paper and stay visible.
- **Per-pack colours not wired:** all twelve packs are dark themes, so `bookColors(pack)` falls back to the book colours for every pack (5.3 Property 8). Wiring it per page would change nothing today. Display fonts are untouched, so each pack keeps its typeface on paper (18.5). Muted text uses the ink colour on paper; the difference to body text is the existing size and style.
- **Test:** `book-foundations.test.ts` reads `book.css` and fails if any of the four remaps is missing or its target is under 4.5:1 on the floor. Mutation-checked. Real rendered colours are checked in the browser (5.8, deferred).

## Task 5.6 (Book in the game)
- **Form:** the shared paper class `book-paper` (book.css) on the spirit panel text (`.spirit-panel-body`) and on a div around the tutorial question `<p>`. The `Book` component is not used: it needs labels and controls, and one page needs none. Paper, tokens and the colour remap stay in one place (skeleton `book.css`).
- **CSS:** `apps/game/src/styles.css` imports `@kiroween/skeleton/book/book.css`. The old theme-surface scrim and `color` on `.spirit-panel-body` were removed (the paper replaces them; its dark ink gives the contrast). The `fear-ui` scrim test now asserts the paper class and the absence of the old background/colour.
- **Image deferral:** the game sets `--book-paper-image: none` on `:root`, so no texture loads (and no wrong-origin `/media/` request). `SpiritPanel` sets the variable inline to `mediaUrl(mediaBase, 'shared-atlas-paper-01')` only after `firstSceneLoaded`, like the frame. The deferral property test strips that inline style in its "everything else identical" comparison and also asserts the server markup has no `--book-paper-image`. The tutorial question shows the tint without texture (its panel sits outside the scene-paint provider).
- **Motion:** `motion.ts` gained `applyMotionAttribute(root, reduced)` (`data-motion="reduce"` or removed). `useReducedMotion` calls it in an effect on the effective value (setting or system), so book.css's `html[data-motion='reduce']` rule applies. Nothing in the game pages the text, so this is for consistency with 18.4.
- **Unchanged:** fear amounts, token format, hotspot layout, strings, logical CSS.
- **Tests:** new `apps/game/test/book-paper.test.ts` (CSS import, paper class on both panels, data-motion set and removed). Mutation recorded in mutations.md.
- **Results:** game rebuilt normally. `pnpm -r typecheck` clean (3 projects). `pnpm -r test`: skeleton 56 files, 755 passed, 8 expected fail; atlas 14 files, 182 passed; game 24 files, 278 passed.
## Task 5.7 (book markup and anchor tests)
- **Files:** new `apps/atlas/test/anchors-once.test.tsx` (22 tests); `logical-css.test.ts` extended with one test over `skeleton/src/book` (comment lines skipped, since they hold prose like "right-to-left").
- **Both reading modes:** no DOM library is installed and the preference only sets `html[data-book]` and CSS, so the server markup is the markup of both modes. Property 10 runs on that markup for twelve legends (from content parsing) and the Keeper's Note (stub view, as in the other note tests). A source check pins that `Book.tsx` renders `{children}` exactly once and never behind `paged`/`supported`/`pref`. Property 10 is table-driven over the real content, not fast-check: the inputs are the 13 fixed pages.
- **Already covered, not repeated:** same subtree with/without hero, hero before chapter 1 inside `Book`, toggle label markup (book-component), only `shared-atlas-paper-01` as a `/media/` path (book-foundations). Added here: hero before chapter 1 on a real legend page, toggle label on a legend page, `url()` in `book.css` is only the shared paper, print rule, turn time at most 400 ms, reduced-motion rules. The "Fiction label outside the flow" check was already in book-integration.
- **Hash handler mutation:** not done. The hash landing (`land`, `hashchange`) works on `window.location`, scrolling and focus; no non-browser test here can see it. A source-string test would only fake it. **Added to the 5.8 browser check list:** open `/legends/<id>#<id>--ch-3` and `/anchor/keepers-note--ch-1` in pages and scroll views: the right page opens (or scrolls), the heading has focus, `data-landed` shows for 2 s, and a later `hashchange` lands again.
- **Mutations:** children rendered twice (many failures) and reduced-motion block removed (1 failure); both restored by hand from `/tmp` copies, diff clean. Rows in `mutations.md`.

## Test run note after 5.7 (machine load)

- `pnpm -r test` took 26 min at 24% CPU and 4 skeleton property files hit their 900 s per-test timeout (`play-answers-hints`, `play-atlas-player`, `play-leads-final`, `play-resume`). The machine's load average was 7.5 to 8.6 on 8 cores from other apps (Kiro, Chrome, an iOS simulator), and `pnpm -r` runs the three packages side by side.
- The same skeleton suite run alone right after: 56 files, 755 passed, 8 expected fail, no failure. Atlas (205) and game (278) passed in their own runs.
- Reading: a load-dependent timeout of the long Phase 4 property tests (100 full runs each through the real service), not a logic failure. No test or timeout was changed. If it repeats at the end of Block A, `pnpm -r --workspace-concurrency=1 test` is the fallback run, and the Owner is told.

## Task 5.8 (book-check.mjs, write only)

- **Order change (Owner):** script and package script written; the browser run is deferred as **D3** (see Deferred runs). No server, no Chrome, no database in this task. The task stays open until D3 runs and `docs/phase-5-notes/book-check-g5.json` exists.
- **Files:** `apps/atlas/scripts/book-check.mjs` (new), `"test:browser": "node scripts/book-check.mjs"` in `apps/atlas/package.json`, `apps/atlas/test/book-check-helpers.test.ts` (5 tests of the pure helpers: argument parsing, anchor filter, legend-id filter, colour/contrast maths, indicator, page-boundary and duration parsing; no Chrome). `main` runs only when the file is the entry point, so the test imports it safely.
- **Driver:** DevTools protocol over Node's WebSocket, copied in shape from `apps/game/scripts/browser-check.mjs`; Chrome path detection and `CHROME_BIN` as there; one browser context per page; no new dependency. Flags: `--base` (default `http://localhost:3001`), `--out` (default `docs/phase-5-notes/book-check-g5.json`, relative to the repo root), `--slow4g`, and `--legends a,b` (not asked for; skips reading the home page).
- **No database:** legend ids come from the `/legends/<id>` hrefs on the atlas home page (the check fails if it does not find 12; `--legends` overrides). Anchors come from element ids inside `.book` that match the stored-anchor pattern for that legend. The pattern is a copy of the skeleton's `ANCHOR_RE` (the script stays a plain `.mjs` with no build step).
- **Per legend and the Keeper's Note, at 390 and 1280:** pages on; page count and column count (1 at 390, 2 at 1280); no horizontal page scroll; every `.book-chapter` starts on a column boundary; every anchor opened by hash lands with its start inside the viewport rectangle and focus on it (or inside it); previous/next buttons; arrow keys, PageUp/PageDown, Home, End; swipe by touch events; indicator text; toggle to scroll view and back keeps the chapter; computed colour of body text, a heading and a link against `PAPER_FLOOR` and the real computed viewport tint, each at least 4.5:1. At 1280 only: after landing on a chapter, resizing to 900 px keeps it visible (hash wins).
- **Also:** reduced-motion emulation gives a 0 s flow transition; normal motion gives more than 0 and at most 400 ms; `/anchor/keepers-note--ch-1` ends at `/legends/keepers-note#keepers-note--ch-1` with one element of that id. RTL key swap: the script sets the `lang=ar` cookie; if `html[dir]` is not `rtl` the check is recorded as skipped (the server needs `FEATURE_ARABIC=true`).
- **Slow 4G texture:** with `--slow4g` one extra page at 390 px (cache off, 150 ms latency, 1.6 Mbit/s down, 750 kbit/s up, CPU x4: the profile the game timing check already uses) reads `performance` resource timing for `shared-atlas-paper-01` and writes `start_ms`, `end_ms`, `duration_ms`, `bytes` into the JSON. It fails only if the texture never loads. The numbers go into this file after D3.
- **JSON:** `base`, `generatedAt`, `summary` (pass/fail/skipped), `checks[]` with name, result, numbers, short note. No cookie, header or page text is written. Failing pages are saved as PNG in `.debug/book-check/`.
- **Not covered by the script (left from the 5.4 list, report at D3 if the Owner wants them):** the real print layout, the no-columns fallback, `focusin` turning, reflow after font load, and the `data-landed` 2 s mark. The two-page spread is checked by column count, not by screenshot.
- **Unverified:** the script has never run against a page. Selectors rely on `Book.tsx` markup read from source (`.book`, `.book-viewport`, `.book-flow`, `.book-indicator`, the two `aria-disabled` buttons in `.book-controls`, `button[aria-pressed]`). Expect a first-run fix or two at D3.
- **Results:** `node --check` ok; atlas `tsc --noEmit` clean; atlas tests: 16 files, 210 passed (was 15 files, 205; plus the new file with 5 tests). `pnpm -r test` not re-run.

## Task 5.9 (G5 gates)

- **Tests:** after fresh builds, `pnpm -r --workspace-concurrency=1 test` in 152 s: skeleton 56 files, 755 passed, 8 expected fail; atlas 16 files, 210 passed; game 24 files, 278 passed. Typecheck clean in all three. Secret scan: no findings.
- **Flaky-under-load finding:** two earlier full runs (26 min and 21 min) failed with 900 s / 120 s timeouts in the long Phase 4 property files, while the same suite took about 150 s at other times. One heavy file timed the same under `npx vitest` and `pnpm test` (27 s each), and the environment differs only by pnpm's own variables, so pnpm is not the cause. The slow runs coincide with load averages of 8 to 10 on 8 cores from other apps. No test or timeout was changed. Owner note: run the full suite with other heavy apps closed.
- **agent-tester:** Property 4 to 8 and 10 cover the pure book logic, contrast and anchors-once. Mutation rows: gutter, RTL key swap, fallback ink, theme-colour remap on paper, children rendered twice, reduced-motion rule, data-motion attribute. Not testable without a browser and moved to D3: hash landing and the hash handler, page counts, spread at 1024 px, chapter page boundaries, swipe, focus turning, reflow, toggle keeps chapter, print, no-columns fallback, real rendered contrast. `test:browser` (5.8) is written and not run; a fix or two on its first run is likely.
- **impeccable** (`detect --json --changed` in atlas and game, and on `skeleton/src/book`): only the two known `broken-image` false positives on `<Img>` in `LegendPage.tsx`. In-thread review against the brief (Part 1) and the design steering: aged paper from `shared-atlas-paper-01` only, warm tint, foxing, edges, vignette; two-page spread from 1024 px with a gutter shadow; one page on phones; no page-flip library and no 3D curl; turn at most 400 ms, none under reduced motion; theme packs keep their display fonts; dark-theme colours on paper fixed (see "Fix after 5.5"). No screenshot pass yet: that is the D3 run.
- **agent-guard:** clean-code-guard: 0 fixed, 0 flagged in `skeleton/src/book` (Book.tsx 301 lines of small callbacks; the only physical `left`/`right` are `getBoundingClientRect` maths, commented, not CSS). Test lane: `book-check-helpers.test.ts` tests pure helpers only; no test launches Chrome.
- **verify-and-stop:** 15.1–15.13, 16.1–16.7, 17.1–17.6, 18.1–18.5 are covered at the markup, CSS and pure-logic level by the tests above. 18.6 (paper texture timing) and every real-layout criterion wait for D3.
## Task 6.1 (mood layer)
- **Files:** new `skeleton/src/design/mood.css` and `Mood.tsx` (exports `Mood`, `MoodFog`); `skeleton/package.json` exports `./design/mood.css` and `./mood`. Both apps' `styles.css` import `mood.css`; both root routes render `<Mood />` first in the body. Game: `SceneViewer.tsx` (`mood-vignette-inset` on the viewport, `<MoodFog />` after the sprites and before the hotspots), `Hotspot.tsx` (`mood-hotspot-glow`), `Hall`/`TutorialRoom`/`WorldPlay` panels (`mood-worn`). Atlas: chapter plates (`mood-torn`), `router.tsx` pending component. No image, sound or library.
- **Vignette and candle** are page layers at `z-index: -1` (fixed, `pointer-events: none`, `aria-hidden`), painted over the propagated body background and under all content, so they cannot lower text contrast. Scene vignette is a faint corner shade (35% black at the corners, clear inside 65%) on the scene viewport, which holds no text.
- **Candle:** radial ember glow from `--color-accent`, opacity 8 s cycle, 7 keyframes (0.45 to 0.64): a change about every 1.1 s, at most 3 a second. Static at 0.5 under reduced motion.
- **Fog:** `.mood-fog` inside the scene stage, bottom 22% (max 9 rem), tinted with `--color-cold`, below the hotspots in paint order, no text in the stage, 60 s drift by `transform` (cheap, no repaint). Static band under reduced motion. Used by every scene (Hall, tutorial, worlds).
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` and `html[data-motion='reduce']` set `animation: none` on candle and fog and drop the glow transition. Print hides all overlays.
- **Worn edges:** `.mood-worn` = 1 px ink border plus inner shadow. `.mood-torn` adds the shared paper texture as a luminance mask (`@supports (mask-mode: luminance)`; solid layer on the content box, texture on the border box, `mask-composite: add`), so text and images inside the padding are never masked. A mask clips outlines, so `.mood-torn` is only on atlas plates (no focus ring). **Game panels use `.mood-worn` only** (they take a focus ring, and the game must not request `/media/` from its own origin): their edges are ink border and inner shadow, not torn. How ragged the atlas plate edge looks is unverified (no browser run here); the border band is only 0.4 rem. Check in the 6.3/browser pass.
- **Hotspot glow:** 40% glow-colour shadow on hover and focus-visible; the 3 px focus outline from `scene.css` is untouched. Boxes, sizes and click handling are unchanged (44 px minimum still set by `Hotspot.tsx`).
- **Keeper's Note "Fiction" label:** untouched; it sits above the Book and overlays are behind content.
- **Catalog keys (en; ar empty, falls back per existing pattern). Wording for owner review:**
  - game `loading.study`: "The study is dark. Someone is lighting a candle…" (replaces `tut.loading`, "The study is dark. Please wait…")
  - game `loading.room`: "The room is waking up. The candle leans toward you." (replaces `world.loading`, "The room is waking up.")
  - atlas `loading.page`: "The pages are being turned over by candlelight…" (new; the atlas had no loading text, so a router `defaultPendingComponent` shows it after the router's 1 s pending delay)
  - `play.pending` ("Working on your last move…") left as it is: it is a busy note, not a loading placeholder.
- **Old keys removed:** `tut.loading`, `world.loading`. `game/test/tutorial.test.ts` and `world.test.ts` now read the new keys (same assertions). `game/test/viewer.test.ts` markup regex now expects the extra `mood-vignette-inset` class (same checks).
- **Results:** both apps rebuilt normally (no new warnings). `pnpm -r typecheck` clean (3 projects). Tests, run per package because the machine load average was 33 to 47 and the full `pnpm -r` run hit the known 900 s skeleton timeouts (`legend-snapshot`, seen again): atlas 16 files, 210 passed; game 24 files, 278 passed; skeleton without the load-sensitive `play-*` and `legend-snapshot` files: 42 files, 615 passed. The skeleton full suite was not completed (no skeleton logic changed: CSS, one TSX file and two export lines). Mood tests are 6.2.

## Task 6.2 (test the mood layer)
- **Files:** new `apps/atlas/test/mood.test.tsx` (8 tests); `apps/atlas/test/logical-css.test.ts` gained a `mood.css` case. No source change. Skeleton has no separate test; the atlas hosts it like the existing book logical-CSS case.
- **Covered:** candle distinct brightness stops (0% and 100% as one) over the animation duration is at most 3 a second; `pointer-events: none` on `.mood-layer`, `.mood-fog`, `.mood-vignette-inset::after` (the candle and vignette spans sit inside `.mood-layer`); candle and fog are the only animations and both are `none` under `prefers-reduced-motion` and `html[data-motion='reduce']`, and the glow transition too; mood.css and Mood.tsx have one `url()` (the shared paper asset), no `@font-face`/`@import`, no imports, audio or img; `<Mood />` is imported and rendered in both root routes; the Fiction label is present on the Keeper's Note page with no mood element before it.
- **Reused, not duplicated:** hotspot 44 px is `apps/game/test/viewer.test.ts` (`keeps a 44 px minimum target`); the book page-turn reduced-motion case stays in `anchors-once.test.tsx`; "Fiction outside the flow" stays in `book-integration.test.tsx`.
- **Results (no browser, no server):** atlas `mood`+`logical-css` 12 passed; game `viewer`+`logical-css` 16 passed; atlas `book-integration`+`keepers-note` passed with the first run. Full suite not run.
- **Mutations:** two, in `mutations.md`; both failed as expected and `mood.css` was restored from `/tmp` (diff clean).

## Task 6.3 (deferred) and 6.4 (G6 gates)

- **6.3:** needs both local servers with the database env; recorded as deferred run D4.
- **Tests:** atlas 17 files, 219 passed; game 24 files, 278 passed; skeleton 56 files, 755 passed, 8 expected fail (144 s, run when load had dropped). Typecheck clean.
- **agent-tester:** candle rate, reduced motion, pointer events, no new assets and both root routes are tested and mutation-checked (6.2). Not testable without a browser: that fog never covers a hotspot or text, and the torn-edge look. Both go into the D3/D4 screenshots.
- **impeccable** (`detect` on `mood.css` and `Mood.tsx`: no findings; in-thread review against brief Part 2 and the content exclusions): effects are a vignette, a candle glow on an 8 s cycle (about one change per 1.1 s), low fog (at most 22% of the stage, 9 rem cap, painted under the hotspots, 60 s drift), worn ink edges on panels and a paper-texture mask on atlas plates, faint hotspot glow, in-voice loading lines. No symbols, no imagery beyond the shared paper, nothing imitating a film, game or brand. Reduced motion: static vignette, fixed candle brightness, no fog drift, no glow transition. The scene corner shade (`.mood-vignette-inset::after`, z-index 2, `pointer-events: none`) may darken the edges of hotspots near a corner; it never takes clicks. Check in D2/D4 screenshots.
- **agent-guard:** 0 fixed, 0 flagged. Catalog: `tut.loading` and `world.loading` replaced by `loading.study` and `loading.room`; `loading.page` new in the atlas (listed in 6.1 for the handover's wording section).
- **verify-and-stop:** 19.1–19.3, 19.5–19.12 covered by tests at the CSS and markup level; 19.4 (fog never covers hotspots or text) and 19.13 (timing) wait for D2/D4.

## Task 7.1

- **Install criteria (read 2026-11-21, web.dev "install-criteria"):** HTTPS; manifest with `name`/`short_name`, `icons` incl. 192 px and 512 px, `start_url`, `display` (`standalone` chosen), no `prefer_related_applications`; user engagement. No service worker is required, so none is added (Requirement 20.9: a worker only if the criteria need one). Screenshots and a description are optional; `description` is added from the catalog if a key exists, screenshots are not (no assets).

## Task 7.2

- Added `manifest[.]webmanifest.ts` server routes in both apps (`GET` handler, `Content-Type: application/manifest+json`, set in the route itself, so `vercel.json` needs no header rule). Game: `/game/manifest.webmanifest`, scope and start_url `/game/`, icons `/game/icons/<id>.png`. Atlas: `/manifest.webmanifest`, scope `/`, icons `/icons/<id>.png`.
- `name` and `short_name` both use the `app.title` catalog key (no separate short-title key exists). Colours: `BASE_PALETTE.bg` for theme and background.
- Both root routes link the manifest and the `apple-touch-180.png` icon; the game root gained a `theme-color` meta (atlas already had one).
- CSP `manifest-src 'self'` and the `/game/:path*` header rules already cover the manifest (same origin, under `/game/`). On the atlas, the `/:path((?!game…).*)` rule covers `/manifest.webmanifest`.
- Needs_File created with eight rows. No icon file, no service worker.

## Task 7.3

- One test file per app (`apps/atlas/test/manifest.test.ts`, `apps/game/test/manifest.test.ts`), identical except `APP` and `PREFIX`. They call `buildManifest()` and the route's `GET` handler directly, with no server or network.
- Root route checks read `__root.tsx` as text (importing it would pull in CSS and components). The Needs_File check matches on id and the `apps/<app>/public/icons/<id>.png` path.
- Icon files: if absent, the Needs_File row must exist; if present, they must be PNG with the expected dimensions (192, 512, 512, 180). No icon exists today.
- Service worker check: no `sw*`/`service-worker*` js/ts file in the app root, `public` or `src`.
- Built-output check scans `dist/server/assets/*.js` for `application/manifest+json`; skipped when there is no `dist/server`.

## Task 7.4 (G7 gates)

- **Tests:** atlas 18 files, 228 passed; game 25 files, 287 passed (from 7.3). Typecheck clean in all three; secret scan: no findings. Skeleton unchanged in G7.
- **agent-tester:** manifest fields, scopes, catalog names, PNG paths, Needs_File rows, root-route links and "no service worker" are tested; two mutations recorded. Not tested: the real `Content-Type` over HTTP (checked in production in 3.2/10.6) and Chrome's install prompt (needs the icon files; Owner check after adding them).
- **agent-guard:** 0 fixed, 1 flagged: `buildManifest()` is nearly the same in both apps (only the path prefix differs). Kept per app: two 20-line route files are simpler than a shared builder with a prefix option for two callers, and each app owns its own catalog. `name` and `short_name` both use `app.title`, because no short-title key exists; the Owner may add one when the final names arrive (catalog-only change).
- **Owner note:** `apps/game` has no `public/` folder yet. The icons go in `apps/game/public/icons/` (Vite serves it under `/game/`) and `apps/atlas/public/icons/`; exact rows in `content-and-assets-needed.md`.
- **verify-and-stop:** 20.1–20.8 covered by the tests above; 20.9 (no worker needed) recorded in 7.1.

## Task 8.2
- Approved exception to the Phase 4 boundary (R22). Changed only `resolveTheme` in `skeleton/src/theme/contrast.ts`: the glow is now checked at 4.5:1 against the background and the surface (was 3:1 on the background only). Candidates stay pack glow, base glow, ink. Everything else in the theme is unchanged. Pack data in `content/` is untouched.
- Why 4.5:1: panel headings are not always large text. Smallest rule that satisfies Property 9.
- Packs changed: only spring-heeled-jack, glow `#3d6e8f` to `#f4d58d` (base glow). Its pack glow was 2.8:1 on the surface. The other eleven keep their pack glow.
- `resolveTheme` now adds a `fallbacks` note for the glow on that pack. `skeleton/test/theme.test.ts` "falls back to the base accent..." now looks only at the accent notes, so the accent fallback list is still the same four packs. No snapshot changed; atlas and game tests needed no edits.
- New: `skeleton/test/theme-surface.property.test.ts` (Property 9, 4 tests: random palettes, fallback order, twelve packs, spring-heeled-jack).
- Mutation recorded in `mutations.md`: only the random-palette tests catch it, because the real pack also fails 4.5:1 on its background.
- Results: skeleton 57 files, 759 passed, 8 expected fail (existing `it.fails`); atlas 18 files, 228 passed; game 25 files, 287 passed. `tsc --noEmit` clean in skeleton, atlas and game. Existing note in `theme.test.ts` still checks glow at 3:1 on background; it still passes.
- Not marked complete.

## Task 8.3

- **Hall reward.** `hub.cabinet.empty` ("An empty slot.") removed from `en.ts`. Empty Hall cabinet slots now render no text and are `aria-hidden`; filled slots are unchanged. The tutorial reward slot uses a new Catalog sentence. `ar.ts` stays empty by design (falls back to English).
- **New catalog key (English text for owner review):** `tut.reward.line`: "The first slot of the cabinet is lit and waits for the first relic."
- **Removed catalog key:** `hub.cabinet.empty` ("An empty slot.").
- **Spirit panel colour order.** Real bug: `theme.css` loads after `book.css`, so `.spirit-caption` (cold) beat `.book-paper` (dark ink), putting light text on paper. Added `.spirit-panel-body.spirit-caption { color: var(--book-ink); }` in `theme.css` (two classes win by specificity, not by bundle order). Paper from Task 5.6 is untouched.
- **Ending dialog.** `dialogKeyAction` in `lib/focus.ts`: Escape closes, Tab/Shift+Tab keep focus on the dialog's only button. Focus returns to the opener on close (remembered when the dialog appears). Close button uses the same path.
- **Impeccable list, checked against current code:**
  - Fixed earlier: spring-heeled-jack glow on surface (8.2); start failure with no retry (`StartRetry`); spirit text over the painted frame (paper, 5.6; frame-image contrast remains a visual judgement, see below).
  - Fixed here: CSS order, ending dialog, empty-slot text.
  - Left open: `‹` `›` pan glyphs (low priority, cosmetic, not an AA failure); fear meter fill at 2.5 to 2.7:1 on pack surfaces (the 3:1 pairing against the background is met; design records this as open); text over the painted frame (needs the real-browser pass, 10.7).
- **Tests:** `apps/game/test/polish-8-3.test.ts` (key handler, Hall wiring, catalog, CSS order); `hall.test.ts` and `tutorial.test.ts` updated. Mutation recorded in `mutations.md`.
- **Results:** game 26 files / 291 tests, atlas 18 files / 228 tests, `tsc --noEmit` clean for both apps.

## Task 8.4

- **Test:** `skeleton/test/product-name.test.ts` reads both titles from the catalogs (`app.title` in each app's `en.ts`) and fails if either string appears in `apps/atlas/src`, `apps/game/src` or `skeleton/src` outside the catalog files (`i18n/<lang>.ts`) and the generated route tree. It also checks that both manifests read `'app.title'`. Mutation-checked.
- **Today:** no literal found; a rename is a catalog-only change. Final names were not chosen.
- **README (task 9.1):** markdown cannot read the catalog. The README will describe the project without either title string, so a rename never touches it.

## Task 8.5 (G8 gates; 8.1 waits for the Owner's hotspot corrections)

- **Tests:** skeleton 58 files, 764 passed, 8 expected fail (146 s); atlas 18 files, 228 passed; game 26 files, 291 passed. Typecheck clean; secret scan: no findings.
- **agent-tester:** 8.2 Property 9 (surface and background) with a mutation that only the random-palette tests catch (the real pack failed on both surfaces); 8.3 four tests plus the Escape mutation; 8.4 product-name test with a mutation. Gap: the ending-dialog focus trap and focus return are tested through the pure key helper and a source check, not by rendering and pressing keys (no DOM in the game tests). Keyboard pass on production in 10.7.
- **impeccable:** `detect --json --changed` in the game: no findings. Review: the spring-heeled-jack heading now uses the base glow `#f4d58d` (was `#3d6e8f`, 2.8:1 on its surface). The spirit caption on paper uses book ink regardless of stylesheet order. The empty cabinet slots no longer say "An empty slot." Left open by 8.3 with reasons: pan glyphs, fear meter fill at 2.5 to 2.7:1 on pack surfaces (meets 3:1 on the background, as a non-text element), frame-image contrast (browser pass in 10.7).
- **agent-guard:** 0 fixed, 0 flagged.
- **verify-and-stop:** 22.1–22.8 and 24.8–24.10 covered; 22.x items left open are listed in 8.3 with reasons; 21.4 / 7.4 (hotspot corrections) is task 8.1, after Stop B and the push.

## Task 10.1 (mutation record closed for Block A)

Requirement 26.12 coverage, each row in `docs/phase-5-notes/mutations.md` (mutation, file, failing test, restored):

| Criterion | Test | Mutation row |
|---|---|---|
| 26.2 anchor on its page | `book-pagination.property.test.ts` (Property 4) | 5.2 gutter ignored. Real landing: D3 browser run (no non-browser test can see `location.hash`; recorded under 5.7). |
| 26.3 one-page toggle, same text | `anchors-once.test.tsx`, `book-component.test.tsx` | 5.7 children rendered twice |
| 26.4 reduced motion: page turn, candle, fog | `anchors-once.test.tsx`; `mood.test.tsx`; `book-paper.test.ts` | 5.7 reduced-motion block removed; 6.2 candle/fog rule removed; 5.6 `data-motion` value |
| 26.5 image deferral | `scene-deferral.property.test.tsx`, `viewer.test.ts` | 4.1 `loadedSceneId` check removed |
| 26.6 tutorial lock | `tutorial-lock.property.test.ts` | 1.10 lock removed |
| 26.7 rate limit | `rate-limit.property.test.ts`, `rate-limit.test.ts` | 1.8 threshold, 1.8 shared key, 1.9 limit 10000 |
| 26.8 security headers | `vercel-config.test.ts` (configuration; real responses in 3.2) | 1.4 `nosniff` |
| 26.9 manifest and icon ids | `manifest.test.ts` (both apps) | 7.3 icon id renamed; 7.3 Needs_File row deleted |

Design's extra mutations: hero `min-width` (4.3), password printed (2.2), pipe callback (1.6, 1.11), `resolveTheme` surface check (8.2), Escape handler (8.3, row added now). All present. No missing mutation had to be run.

## Task 10.2 (smoke scripts for an https base, code only)

- **Files:** `skeleton/scripts/smoke-prod.ts` (runner), `skeleton/scripts/smokeProdLib.ts` (pure parts), `skeleton/test/smoke-prod-lib.test.ts`. Nothing was run against a server.
- **Deviation from "extend the two scripts":** `smoke-play.ts` and `smoke.mjs` stay as the dev checks. They cannot take a production base: `smoke-play.ts` stops unless the database URLs are on the dev branch and reads and deletes rows by SQL; `smoke.mjs` reads server-function ids from the dev server's module source. Smallest option: one new script that talks only HTTP, with the same wire format, cookie jar, fixed `Origin`/`Sec-Fetch-Site` headers and reading rule (copied, as `smoke-play.ts` already copies it from the test helper). It never loads `.env`.
- **Function ids in a production build:** names are gone. The script reads the game's built client files (from `/game/` scripts and their `./chunk.js` imports) and takes the 64-hex ids from `.handler(X(...))` in source order. The count must be exactly 12, and a unit test keeps `SERVER_FN_ORDER` equal to the `createServerFn` exports of `apps/game/src/server/functions.ts`. Checked offline against the local `apps/game/dist`: 12 ids. A calling mistake would show as a FAIL in step 2, not a silent pass.
- **Steps (`--only 1..6` or by name `headers|guest|user|anchor|leak|burst`; `--skip-burst`):** 1 headers on `/` and `/game/` (X-Content-Type-Options nosniff, Referrer-Policy, frame blocking by X-Frame-Options or CSP frame-ancestors, CSP present), `Cache-Control` immutable on one `/media` file found in the page HTML, `Content-Encoding` on the first script of each app; names and yes/no only. 2 guest: Hall (one open door, eleven locked), tutorial from the Keeper's Note text, Banshee win (up to 8 attempts, as in the dev script). 3 user: `kw-smoke-<18 hex>@example.com`, random password in memory, sign-up, user id written to `os.tmpdir()/kiroween-smoke-prod-user-id` (mode 600, id only) and the line "user id file written" printed, `startWorld` refused with 403 and "Do the tutorial first.", tutorial, Baba Yaga win, row check through `listMyRunsFn` (won row, score equals `score()` of the counted run and the end summary, slots solved), sign-out. 4 `/anchor/keepers-note--ch-1`: redirect, then the target page has `id="keepers-note--ch-1"` exactly once. 5 leak: every response of an unfinished run (steps 2 and 3, plus a short probe: start Banshee, tap every hotspot) is searched for the quoted keys `correctIndex`, `trueVersionId`, `true_version_id`, `trueLead`, `true_lead`, `seed`. 6 burst: wait 60 s, new guest tutorial session, up to 40 wrong tutorial answers, stop at the first 429. 429 in the first 40: PASS (position, and whether the body is the fixed text, are printed). None: `FINDING burst: ... limit is per instance, burst can spread over instances`; it does not fail the run. Then wait 60 s. 7 summary line: PASS / FAIL / FINDING / SKIP counts. Exit code 1 only on FAIL.
- **Limit of the leak check:** the correct option text is not searched. Every option of an open slot is in the view by design, so the text alone cannot tell a leak from a normal view. The check covers the secret keys and the seed. Hotspot role names and an unearned Hint 2 anchor are not searched either (the dev-script views carry neither by schema; `play-secrecy.property.test.ts` covers them).
- **Output rule:** the script prints header names with yes/no, statuses and counts. It never prints or writes a cookie, password, token, receipt, header value or seed. The only file is the id file. Cleanup by exact id stays with the main agent (Neon MCP, task 10.6).
- **Command for 10.6** (replace the base with the alias origin; the run takes about 3 minutes because of the two 60 s waits; add `--only <step>` to rerun one step, `--skip-burst` to drop the burst):

  `pnpm --filter @kiroween/skeleton exec tsx scripts/smoke-prod.ts https://<alias-origin>`

  Note for the burst: steps 2 and 3 answer tutorial questions from the same address, which is why step 6 waits 60 s first.
- **Tests:** `skeleton/test/smoke-prod-lib.test.ts`, 17 tests: argument parsing (https required, http for localhost only, bad `--only`, unknown flag), header checks on fake `Headers` (yes/no, no values printed), burst classification (429 at position, none is a finding, 429 after the 40th does not count), summary, leak keys, function-id reading, the id list against `functions.ts`. Skeleton typecheck clean.

## End of Block A, Stop B

- **Builds:** `VERCEL=1` builds of both apps pass (13 hero copies in `apps/atlas/.vercel/output/static/media/**`, game static under `static/game/`). Normal builds pass.
- **Tests:** `pnpm -r test` (default concurrency, load average about 4), 153 s: skeleton 59 files, 781 passed, 8 expected fail; atlas 18 files, 228 passed; game 26 files, 291 passed. Typecheck clean in all three. Secret scan: no findings. `git status`: nothing under `content/`, `assets/`, `.debug/` or any env file.
- **Block A tasks done:** 2.2; 4.1–4.5 (4.4 code only); 5.1–5.9 (5.8 written, not run); 6.1, 6.2, 6.4 (6.3 deferred); 7.1–7.4; 8.2–8.5; 9.2 (log so far, stays open for the final entry); 10.1; 10.2 (code only).
- **Open:** 1.12 (origin and alias), 2.1, 2.3–2.7, 3.x, 4.7, 6.3, 8.1, 9.1, 9.3, 10.3–10.10, and Deferred runs D1–D4.
- **10.6 note:** `smoke-prod.ts` reads the server-function ids from the local `apps/game/dist`. Ids are hashes of file and export, so the local build must be of the same commit that is deployed: rebuild right before 10.6.

## Stop B answers (Owner)

- **Origins:** Production_Origin `https://trick-or-told.vercel.app` (atlas project). Game alias `https://trick-or-true.vercel.app`. Both open without a Vercel login; Deployment Protection "Standard" (production open, previews protected). The alias is written into both `/game` rewrites in `apps/atlas/vercel.json`; the 1.4 config test passes (10). Task 1.12 done.
- **Vercel preset:** auto-detected as "Vite" (output `dist`). To confirm at 3.2 that Vercel uses Nitro's `.vercel/output`; if not, fix in `vercel.json`.
- **Final names (catalog only):** atlas `app.title` "The Atlas of the Night Archive" → "Trick or Told"; game `app.title` "The Night Archive" → "Trick or True". `ar` catalogs are empty and fall back. No other catalog value names a product ("atlas", "archive" elsewhere are in-world nouns). Manifests read `app.title` already. Packages, folders, storage keys, repo and old docs unchanged. Product-name test passes.
- **Wording:** `tut.reward.line` → "One slot is lit. It waits for your first relic."; `loading.page` → "Turning the pages by candlelight…".
- **Tests after the change:** atlas 228, game 291, product-name 5, all pass.
- **Neon:** production is branch `main`, id `br-delicate-brook-art2crov`. Never write to `br-blue-breeze-arxdc1lo`. G2 MCP calls confirmed as listed in the design.

## Task 2.1 (Neon MCP calls, read only)

Project `restless-silence-44986466` (`kiroween-2026`), production branch `main` = `br-delicate-brook-art2crov`. The dev branch `br-blue-breeze-arxdc1lo` is never written to.

| # | Tool | Arguments | Result |
|---|---|---|---|
| 1 | `list_projects` | `search: kiroween` | one project, `restless-silence-44986466`, Postgres 18, `aws-us-west-2` |
| 2 | `list_branches` | project | `main` (`br-delicate-brook-art2crov`, default) and `dev-skeleton-core` (`br-blue-breeze-arxdc1lo`) |
| 3 | `list_postgres_databases` | branch `br-delicate-brook-art2crov` | `neondb`, owner `neondb_owner` |
| 4 | `get_database_tables` | `neondb` on `br-delicate-brook-art2crov` | `[]` (no tables) |
| 5 | `list_postgres_roles` | branch `br-delicate-brook-art2crov` | `neondb_owner` only (no `atlas_reader`, no `atlas_web`) |
| 6 | `get_neon_auth_config` | branch `br-delicate-brook-art2crov` | 404 "Neon Auth is not enabled for this branch" |

- `describe_branch` was not called: calls 2 to 5 already give what it would (branch state, databases, tables).
- Google decision: Neon's shared Google credentials work on a production domain; the consent screen shows Neon's name. Design choice kept: enable Google on shared credentials now, Owner steps for own credentials in the handover.

## Task 2.3 (production schema and roles through the Neon MCP)

All calls: project `restless-silence-44986466`, branch `br-delicate-brook-art2crov` (`main`), database `neondb`, as the owner role. The dev branch was not touched. "Exact statements" for the migration files are the file contents split on `--> statement-breakpoint`, trimmed, empty parts dropped, in file order, one transaction per file (the split arrays were written to the git-ignored `.debug/prod-sql/` for the calls).

| # | Tool | Statements | Result |
|---|---|---|---|
| 7 | `run_sql_transaction` | `skeleton/drizzle/0000_curious_bishop.sql`: 38 statements (4 `CREATE TYPE`, 14 `CREATE TABLE`, 20 `ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY`) | 38 × `[]`, committed |
| 8 | `run_sql_transaction` | `0001_runs.sql`: 5 statements (`CREATE TYPE run_status`, `CREATE TABLE runs`, `ALTER TABLE legends ADD COLUMN model jsonb`, `CREATE INDEX runs_user_idx`, `CREATE UNIQUE INDEX runs_one_in_progress`) | 5 × `[]` |
| 9 | `run_sql_transaction` | `0002_versions_ordinal.sql`: `ALTER TABLE "versions" ADD COLUMN "ordinal" integer DEFAULT 0 NOT NULL;` `ALTER TABLE "versions" ALTER COLUMN "ordinal" DROP DEFAULT;` | 2 × `[]` |
| 10 | `run_sql_transaction` | `CREATE ROLE atlas_reader NOLOGIN;` `GRANT CONNECT ON DATABASE neondb TO atlas_reader;` `GRANT USAGE ON SCHEMA public TO atlas_reader;` `GRANT SELECT (id, title, region, map_lat, map_lng, era, scare_level, reading_time_min, one_line_hook, cold_open, documented_closing, theme) ON legends TO atlas_reader;` `GRANT SELECT ON chapters, versions, documented_told, sources, anchors TO atlas_reader;` `GRANT SELECT (legend_id, id, usage, size) ON assets TO atlas_reader;` (exactly as in `docs/tech-decisions.md`) | 6 × `[]` |
| 11 | `run_sql_transaction` | `0003_keepers_note_play_state.sql`: 6 statements (`CREATE TABLE keepers_note`, `keepers_note_details`, `player_flags`; `ALTER TABLE runs ADD COLUMN play_state`, `ADD COLUMN rev`; `GRANT SELECT ON "keepers_note" TO atlas_reader;`) | 6 × `[]` |
| 12 | `run_sql` | `CREATE ROLE atlas_web LOGIN IN ROLE atlas_reader;` | `[]` |
| 13 | `run_sql` | `select (select count(*) from information_schema.tables where table_schema='public') as public_tables, (select count(*) from legends) as legends, (select count(*) from runs) as runs, has_table_privilege('atlas_web','runs','SELECT') as web_runs, has_table_privilege('atlas_web','keepers_note','SELECT') as web_note, has_column_privilege('atlas_web','legends','model','SELECT') as web_model, (select rolcanlogin from pg_roles where rolname='atlas_web') as web_login, (select rolcanlogin from pg_roles where rolname='atlas_reader') as reader_login;` | 18 tables, 0 legends, 0 runs, `web_runs` false, `web_note` true, `web_model` false, `atlas_web` can log in, `atlas_reader` cannot |

- `atlas_web` has no password yet; the Owner's password script sets it (2.5). Until then nothing can log in as it.
- Production has no `drizzle.__drizzle_migrations` rows: a later `db:migrate` against production would re-run `0000`. Future production migrations are applied the same way, by file through the MCP (handover note).
- Never called: `get_connection_string`, `create_credential`, `reset_postgres_role_password`, `prepare_database_migration`, any `delete_*`.

## Task 2.4 (Neon Auth for production through the Neon MCP)

| # | Tool | Arguments | Result |
|---|---|---|---|
| 14 | `get_neon_auth_config` (read only) | dev branch `br-blue-breeze-arxdc1lo` | provider `better_auth`, email/password on, Google shared, organization off: the setup to mirror. No write to dev. |
| 15 | `provision_neon_auth` | branch `br-delicate-brook-art2crov`, `auth_provider: better_auth`, `database_name: neondb` | Neon Auth on; `neon_auth` schema created; production base URL `https://ep-flat-wildflower-arvjs35x.neonauth.c-4.us-west-2.aws.neon.tech/neondb/auth` (not a secret) |
| 16 | `get_neon_auth_config` | production | email/password enabled with sign-up allowed, no email verification; Google `shared`; organization plugin **enabled** by default; no trusted origins; `allow_localhost` true |
| 17 | `update_auth_plugins_organization` | production, `enabled: false` | organization off |
| 18 | `add_auth_trusted_domain` | production, `https://trick-or-true.vercel.app`, `better_auth` | ok |
| 19 | `add_auth_trusted_domain` | production, `https://trick-or-told.vercel.app`, `better_auth` | ok |
| 20 | `get_neon_auth_config` | production | trusted origins: both; email/password on; Google shared; organization off; `allow_localhost` true |

- **Sign-in methods on production (Requirement 5.9):** email and password (sign-up allowed, so the Owner can create the judge account at the site's sign-up page) and Google with Neon's shared credentials. Email verification off. The agent did not create or sign in to the judge account (5.10).
- `update_auth_email_and_password` not called: the defaults already match (enabled, sign-up on, no verification).
- `allow_localhost` stays on until the end of the production smoke (10.6), as designed.
- **Not set (outside the approved list):** the application name in auth emails defaults to the Neon project name `kiroween-2026`. Owner option: Console → Settings → Better Auth → Application Name (for example "Trick or True").
- **Own Google client (Owner option, Neon recommends it for production):** in Google Cloud Console create an OAuth client of type Web application; authorized redirect URI `https://ep-flat-wildflower-arvjs35x.neonauth.c-4.us-west-2.aws.neon.tech/neondb/auth/callback/google`; authorized JavaScript origin `https://trick-or-told.vercel.app`; then Neon Console → branch `main` → Settings → Auth → OAuth providers → Google → Configure, paste client id and secret. Publish the consent screen so users outside the test list can sign in.

## Task 2.5 (Owner steps, reported by the Owner)

- `db:import`: 12 legends, 147 anchors, 83 chapters, 52 versions, 423 facts into `main`. `db:import-keepers-note`: keepers_note 1, keepers_note_details 3. Password script: `password set: yes`, `copied to clipboard: yes`. `db:check-reader`: all checks passed.
- Vercel `trick-or-told` (Production): `ATLAS_DATABASE_URL` (sensitive), `PUBLIC_ORIGIN`, `FEATURE_ARABIC`. Vercel `trick-or-true` (Production): `DATABASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `GAME_TOKEN_KEY` (sensitive), `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`, `GUEST_WORLD`, `FEATURE_ARABIC`. `ATLAS_ORIGIN`, `DATABASE_URL_UNPOOLED` unset.
- Neon Auth application name on `main` set to "Trick or True" by the Owner.
- Vercel CLI link added `apps/atlas/.gitignore` and `apps/game/.gitignore` (`.vercel`, `.env*`), kept. The `.env.local` files it created were deleted by the Owner; never read.

## Function region (Owner change before the push)

- `"regions": ["pdx1"]` added to `apps/atlas/vercel.json` and `apps/game/vercel.json`. Reason: Neon production is in `aws-us-west-2` (Oregon); Vercel functions default to `iad1` (Washington, D.C.). Every server-rendered page and server function makes several database round trips, so running in `pdx1` (Portland, same region as the database) removes about 60–70 ms of cross-country latency per round trip. Static files stay on the CDN everywhere.
- The config test now checks `regions` is exactly `["pdx1"]` in both files; mutation (`iad1`) recorded.

## Task 2.6 (verify production database)

| # | Tool | Statement | Result |
|---|---|---|---|
| 21 | `run_sql` (branch `br-delicate-brook-art2crov`, `neondb`) | `select (select count(*) from legends) as legends, (select count(*) from keepers_note) as keepers_note, (select count(*) from keepers_note_details) as keepers_note_details, (select count(*) from runs) as runs, (select count(*) from player_flags) as player_flags, (select count(*) from neon_auth."user") as auth_users, has_table_privilege('atlas_web','runs','SELECT') as web_runs, has_table_privilege('atlas_web','keepers_note_details','SELECT') as web_details, has_table_privilege('atlas_web','player_flags','SELECT') as web_flags, has_table_privilege('atlas_web','facts','SELECT') as web_facts, has_column_privilege('atlas_web','legends','model','SELECT') as web_model, has_table_privilege('atlas_web','keepers_note','SELECT') as web_note;` | legends 12, keepers_note 1, keepers_note_details 3, runs 0, player_flags 0, auth users 0; `atlas_web` SELECT: runs false, keepers_note_details false, player_flags false, facts false, legends.model false, keepers_note true |

- Requirement 5.5: counts 12, 1, 0 as expected. The SQLSTATE 42501 refusals themselves were proven as `atlas_web` by the Owner's `db:check-reader` run ("all reader-role checks passed"); the owner-role MCP session can only show the privilege flags.
- Requirement 5.4: no dev rows copied: 0 runs, 0 player_flags, 0 auth users on production.

## Deferred run D1 (task 1.7) result

- Both Owner-started built servers answered: atlas `http://localhost:3001/` 200, game `http://localhost:3000/game/` 200 (the game server is the `localhost`-bound `serve-build.mjs`).
- `apps/game/scripts/smoke.mjs` cannot run against a built server: it reads server-function ids from the **dev** server's module source (`/game/src/server/functions.ts?tsr-shared=1`) and stopped with `no id for startWorld`. That is how it was built in Phase 4 ("against the running dev server"), not a binding problem; the `localhost` connection itself worked.
- Instead the new production smoke (`skeleton/scripts/smoke-prod.ts`, which reads ids from the built client) ran against the local build, guest-only so nothing is written to the dev database (guests store no rows): `--only guest` 4 PASS; `--only leak` 1 PASS (17 responses); against the atlas `--only anchor` 1 PASS (`keepers-note--ch-1` once). The `user` and `burst` steps were not run locally: `user` would create a user on the dev branch, which must not be written to through the MCP for cleanup.
- **Fix found by this run:** the smoke's Hall check looked for door labels in the page HTML, but the Hall's doors are drawn in the browser, so the HTML has none (`open 0; locked 0`). It now reads `getHall` (one open door, `banshee`, eleven closed). Rerun: PASS.
- **Binding kept** (`listen(port, 'localhost')`).
## Deferred run D3 (task 5.8) result and fixes
- **Run:** `cd apps/atlas && node scripts/book-check.mjs --base http://localhost:3001 --slow4g` against the Owner's built atlas (database env set by the Owner; server not stopped or restarted). First run: 248 passed, 56 failed, 1 skipped (`/tmp/book-check.txt`). Three failure groups, judged against Requirements 15.6, 15.8, 16.1–16.3 and the design's Book section.
- **Group 1, "chapters start at page boundaries" (all 12 legends, 390 and 1280): the check was wrong.** It tested each chapter's left offset from `.book-flow` against the column stride. In the atlas every chapter sits inside a `px-4` wrapper and is a centred `.measure` box, so its fragments start 16 px (390) or 56 px (1280) inside their columns on every page: baba-yaga@390 chapters at 406, 2356, 4306… with stride 390 (= 1 × 390 + 16). Each chapter's first fragment had top 0 in its column, so each chapter does start a new page (15.6). The Keeper's Note passed by luck of its box width. **Fix (measurement):** the check now reads the top of each chapter's first fragment (`getClientRects()[0]`) against the flow's top. `break-before: column` puts a chapter at the top of a new column, and the top is not shifted by padding or centring. A chapter that started lower in a column, without a page break, would fail. New helper `atColumnTop(top)` replaces `atPageBoundary`. The check is not weaker: a missing `break-before` still fails it.
- **Group 2, "swipe turns pages" (all 12 legends, both widths): the check was wrong.** The book starts below the page header (hero, title, contents), about 1300 px down at 390. The check took `y` from the viewport rect at scroll 0, then clamped it to half the window, so the touch landed on the header. Events seen: `pointerdown:touch` then `pointercancel` (the header has default `touch-action`, so the browser took the drag as a pan). The Keeper's Note at 390 passed because its book sits higher. **Fix (measurement):** before each swipe the check scrolls the viewport into the window and reads its rect again (images above it can still load and move it). A swipe inside the book then turns forward and back (`pointerup`, Book swipe handler, 40 px). The Book is unchanged.
- **Group 3, "every anchor lands visible and focused" on `<legend>--versions--<v>` anchors: the Book was wrong.** A version card (`article`) can start at the foot of a column with only its top padding there, and its `h3` heading moves to the next column. On landing, `reflow()` turned to the page of the card's box. Focus then went to the heading, and `onFocus` turned to the heading's page. The next reflow, from an image `load` or a resize while the hash still held, turned back to the card's page and hid the heading. Reproduced on the served bundle with chupacabra@390 `v-witness`: page 42 after landing, page 41 after one image `load`. This breaks 16.3 (open the page that holds the Anchor and focus its heading) and 16.6. **Fix (Book):** `skeleton/src/book/Book.tsx` `reflow()` computes the hash page from the Anchor's `[data-anchor-heading]` when it has one, else from the Anchor. One expression changed.
- **Check measurement change in the same group:** `landed()` now measures the heading's rect, not the Anchor's. The Anchor's rect is the union of all its column fragments, so its left edge could sit on the shown page while the heading was on the next one. The design asks for "the anchor's heading is inside the book viewport". After landing, the check also fires the Book's `load` listener (a `load` event on one flow image) and waits before it measures. The first run caught this bug only when a lazy plate happened to load; now it is caught every time. Both changes make the check stricter.
- **Rebuild and live state:** `pnpm --filter @kiroween/atlas build` ok. Before building I copied `dist` to `/tmp/atlas-dist-d3`. After building I copied the old files back without overwriting (`cp -Rn`), because Vite empties `dist` and the running server's HTML still names the old chunks. The served HTML still references `/assets/index-Cnf0Gaoq.js` (old Book), and the new build is `index-XKW1Dlk0.js`. **The Book fix (group 3) is not live: the Owner must restart the atlas server.** `dist/client/assets` now holds both builds' files, and a fresh build after the restart clears them. Groups 1 and 2 were check-only fixes and are verified live.
- **Group 3 verified without a restart:** a debug-only copy of the check (deleted afterwards, not in the repo) served the running `index-Cnf0Gaoq.js` through CDP `Fetch` with that one minified expression replaced by the new build's (`re(r,t)` → `re(r.querySelector('[data-anchor-heading]')??r,t)`, copied from `index-XKW1Dlk0.js`). Gumiho, spring-heeled-jack, chupacabra, vetala and yuki-onna at 390 and 1280: 142 passed, 0 failed, 2 skipped (RTL, Slow 4G). JSON: `.debug/book-check-patched.json`. Serving the whole new entry chunk did not hydrate, because it imports new route chunks the old HTML does not match.
- **Final run (all 12 legends and the Keeper's Note, `--slow4g`, served old bundle):** 296 passed, 8 failed, 1 skipped (`docs/phase-5-notes/book-check-g5.json`). Group 1: 26/26 pass. Group 2: 26/26 pass. Group 3: 8 fail, all `--versions--` anchors on the old Book: gumiho@390 and @1280, spring-heeled-jack@390, chupacabra@390 and @1280, vetala@390 and @1280, yuki-onna@390. They should pass after the Owner restarts, per the patched-bundle run above. The skip is the RTL key swap (server has `FEATURE_ARABIC` off). Task 5.8 stays open until a run after the restart writes 0 failures to `book-check-g5.json`.
- **Paper texture on Slow 4G (Requirement 18.6), `shared-atlas-paper-01`, 390 px, cache off:** first run start 2560 ms, end 5347 ms, duration 2786 ms, 52096 bytes. Final run start 2615 ms, end 5399 ms, duration 2785 ms, 52096 bytes.
- **Tests:** atlas `pnpm --filter @kiroween/atlas test` 18 files, 228 passed; skeleton `npx vitest run test/book-*.test.ts` 3 files, 22 passed; `tsc --noEmit` clean in atlas and skeleton. `book-check-helpers.test.ts` now tests `atColumnTop`. The Book change is DOM-only (no pure logic changed); its proof is the browser check and the mutation row in `mutations.md`.
- **Not checked:** the RTL swipe direction and RTL key swap (flag off), and no full run after the restart yet. In `.debug/`: `run1.json`, `run2.json`, `book-check-patched.json` and failure screenshots in `.debug/book-check/`.

## Deferred run D4 (task 6.3) result: local Slow 4G timing with the mood layer and image deferral

`node apps/game/scripts/browser-check.mjs --game http://localhost:3000 --atlas http://localhost:3001 --only timing --json .debug/timing/local-g6.json` against the Owner's local built servers (no compression, no caching: the local `serve-build.mjs`). Load average 5 to 9 from other apps during the run. Scene paint, 3 runs each:

| Screen | Phase 4 median | Phase 5 local runs | Phase 5 local median | Blocked-extras diagnostic | JS+CSS sent (gzip size) | Budget 3000 ms |
|---|---|---|---|---|---|---|
| Hall | 5845 | 8310, 5964, 6446 | 6446 | 5863 | 505000 B (160637) | miss |
| Tutorial_Room | 4883 | 5474, 4786, 4833 | 4833 | 4823 | 512307 B (163457) | miss |
| Banshee scene 1 | 10436 | 8138, 6878, 6874 | 6878 | 6852 | 528681 B (168657) | miss |

- **Deferral works:** with the extras blocked the scene paints at the same time as without (difference under 1%), so sprites, spirit figure and meter frame no longer compete with the scene image. Banshee improved 34% (10436 → 6878 ms).
- **Mood layer cost (Requirement 19.13):** the layer adds no request and no image. JS+CSS grew by about 10 KB compressed against Phase 4 (book, mood, manifest). The Hall median is 600 ms slower than Phase 4 while the blocked-extras run is about equal to Phase 4; with the first run at 8310 ms, under load, the difference is within this run's spread and is not attributed to the mood layer without the production rerun.
- **Remaining cause, measured:** the scene image arrives at the moment of paint (e.g. Banshee 431 KB at 6815–8080 ms); the 505–529 KB of uncompressed JS and CSS goes first on the 1.6 Mbps link. Production sends it gzip/brotli (about 160–169 KB), which on this profile is about 1.7 s less. The budget is judged on the production numbers (4.7); the local numbers are not the verdict.

## Task 2.7 (G2 gates)

- **Tests:** `pnpm -r --workspace-concurrency=1 test`: skeleton 59 files, 783 passed, 8 expected fail; atlas 18 files, 228 passed; game 26 files, 291 passed. Typecheck clean; secret scan: no findings. `git status`: no env file tracked or untracked (`.env` ignored), `.debug/` ignored (holds the split SQL and screenshots only).
- **agent-tester:** Property 13 (password script) passed with real fake-`psql`/`pbcopy` runs; production numbers verified through the MCP (12, 1, 3, 0, 0, 0 and the privilege flags), refusals as `atlas_web` proven by the Owner's `db:check-reader`. Smoke script fixed after its first real run (Hall check). Not run locally: smoke `user` and `burst` steps (they would write to the dev branch); run in 10.6 on production.
- **agent-security** (database roles, auth, secrets): scanner signals are all false positives (`RegExp.exec`, the `password` form label, the script's own name). Manual review:
  - Roles: `atlas_reader` NOLOGIN with column-limited grants; `atlas_web` LOGIN member only; no SELECT on `runs`, `keepers_note_details`, `player_flags`, `facts`, `legends.model`. Least privilege holds.
  - Password script: the password is interpolated into `ALTER ROLE … PASSWORD '…'`, but it is generated locally as base64url (`[A-Za-z0-9_-]`), so it cannot contain a quote; it travels on stdin; psql output discarded; child environment limited to `PATH`, `HOME`, `PG*`. No finding.
  - Secrets: the agent read and wrote none; the Owner set the three sensitive Vercel variables; production `GAME_TOKEN_KEY` and `NEON_AUTH_COOKIE_SECRET` are new. The Vercel CLI's `.env.local` files (sign-in token) were deleted by the Owner, and the new per-app `.gitignore` files cover `.env*`.
  - **Finding A1 (low, accepted for launch):** Neon Auth allows open sign-up with no email verification on the shared mail sender, so anyone can create accounts with any address. Impact: junk accounts and a guessed address getting a score row; no access to other users' data. Fix path (Owner): own SMTP provider, then turn on verification codes.
  - **Finding A2 (open until 10.6):** `allow_localhost` is on for production; turned off at the end of the production smoke as designed.
  - Dev-only `-w1000` media middleware reuses `mediaFile`'s canonical-path check; no traversal.
- **agent-guard:** 0 fixed, 0 flagged in G2 code (`set-atlas-web-password.ts`, `smoke-prod.ts` Hall fix).
- **verify-and-stop:** 5.1–5.10 and 6.1–6.7 met (5.8: shared Google credentials work; own-client steps recorded in 2.4). Open: D3 fix needs the Owner's atlas restart and one rerun; D2 (Owner).

## Task 5.8 closed (book check after the Owner's atlas restart)

- `node apps/atlas/scripts/book-check.mjs --base http://localhost:3001 --slow4g` against the restarted atlas (new bundle): **304 passed, 0 failed, 1 skipped** (RTL key swap: `FEATURE_ARABIC` off). Saved `docs/phase-5-notes/book-check-g5.json`.
- Paper texture on Slow 4G (Requirement 18.6): start 2595 ms, end 5362 ms, duration 2767 ms, 52096 bytes. It loads after first paint and does not block text: the paper shows its CSS tint until the texture arrives.

## Task 3.2, first deploy (commit 7dac05e): findings and fix (not yet deployed)

**Read-only checks on production (names and yes/no only), after the Owner's check:**
- Atlas `/` 200 with the four security headers, HTML `content-encoding: br`. Atlas JS `br`, `cache-control: public, max-age=31536000, immutable`. `/media` full hero and the new 1000 px copy: 200, the same year-long `immutable`. Game JS on the alias: `br`, year-long cache. So Vercel serves Nitro's `.vercel/output` despite the "Vite" preset (fact U5 settled), compression works (12.2), the hero copies are deployed, and `sharp` built on Vercel (U7 settled).
- Atlas `/game/` → 404 from the atlas app (U1 failed): the atlas `vercel.json` rewrites were not applied ahead of Nitro's catch-all `"/(.*)" → "/__server"` in the Build Output `config.json`.
- Game alias `/game/` 200 with **no** security headers (U4 / 8.1 failed for the game).

**Docs read (2026-11-21):** [Nitro routing, route rules](https://nitro.build/docs/routing) (headers, `proxy` to external URLs, matched least to most specific), and the installed Nitro 3.0.261103-rc Vercel preset source (`dist/_presets.mjs`, `generateBuildConfig`): route-rule `headers` become `continue: true` routes and an external `proxy` (http(s) target, no extra options) becomes a Vercel rewrite route (`dest`), all written **before** `{ handle: "filesystem" }` and the catch-all; `vercel.functions` is merged into the function's `.vc-config.json`.

**Fix (smallest that keeps one source):**
- New `skeleton/src/deploy/vercelRules.ts` (pure data): the four security headers and CSP (unchanged values), `/media/**` year-long cache, atlas `/game` and `/game/**` proxied to `https://trick-or-true.vercel.app/game…`, game `/**` (relative to its `/game/` base) security headers, function region `pdx1`.
- Both `vite.config.ts` pass them to Nitro, still only under `VERCEL`: `nitro({ routeRules, vercel: { functions: { regions: FUNCTION_REGIONS } } })`. The region is set here too because a prebuilt Build Output may not take `regions` from `vercel.json`.
- Both app `vercel.json` files now hold only `$schema`, `git` (unchanged), `installCommand` and `regions: ["pdx1"]`; the `headers` and `rewrites` blocks are removed so there is one source of truth.
- Local `VERCEL=1` builds: atlas `config.json` has the headers route, `/media`, then `^\/game\/?$ → https://trick-or-true.vercel.app/game` and `^\/game(/…)? → …/game/$1`, then `filesystem`, then the server; game `config.json` has the headers route on `^\/game(/…)?` before its server. Both functions' `.vc-config.json`: `regions: ["pdx1"]`. `/gamebook` does not match the proxy.
- Test `skeleton/test/vercel-config.test.ts` rewritten (16 tests): `git` key exact in all three files; app `vercel.json` keys exactly `$schema, git, installCommand, regions`; the rules module values; both vite configs pass rules and region; and, when a `VERCEL=1` build exists, the built `config.json` routes `/game`, `/game/`, `/game/tutorial`, `/game/_serverFn/…` to the game before the server, sends the headers before the server, and pins `pdx1`. Two mutations recorded.
- Expected after deploy, to check: the atlas `/**` header rule also matches proxied `/game` responses; values are identical to the game's own, so no conflict is expected (check for duplicated `x-frame-options`).
- Full suite after the change: skeleton 787 passed, 8 expected fail; atlas 228; game 291. Typecheck clean; secret scan clean. Local Owner servers untouched (both still 200; `VERCEL=1` builds write `.vercel/output` only).
- Still to check after the next deploy (3.2 continues): `/game/` through the atlas, headers on `/game/`, sign-in origin (`INVALID_ORIGIN`), the stream-abort check, and the rate-limit key behind the rewrite (finding S1; stop if shared).

## Task 3.2, second deploy (f4a9ff4): redirect loop on /game and /game/

- **Owner's live check:** fixed: game alias `/game/` 200 with the four headers; atlas `/` and `/game/tutorial` (through the proxy) 200 with headers, each header once; functions in `pdx1` (`x-vercel-id …::pdx1::…`); `/gamebook` stays an atlas 404. Broken: atlas `/game/` and `/game` → 307 `Location: /game/`, a loop.
- **Cause:** Nitro's exact rule compiles to `^\/game\/?$`, so it also matches `/game/`, and its target was `https://trick-or-true.vercel.app/game` (no slash). The game answers `/game` with a relative 307 to `/game/`, which the browser resolves against the atlas origin, back into the same rule.
- **Fix:** the exact rule now targets `https://trick-or-true.vercel.app/game/` (alias `/game/` answers 200). Built atlas `config.json`: `^\/game\/?$ → …/game/`, `^\/game(/…)? → …/game/$1`.
- **Test:** new built-config case: for `/game` and `/game/` the first matching rewrite's destination is exactly `…/game/`. Mutation (slash-less target) fails 2 tests; restored, 17 pass.
