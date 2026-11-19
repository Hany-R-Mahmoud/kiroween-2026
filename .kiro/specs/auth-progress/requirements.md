# Requirements: auth-progress (Phase 2)

Scope: accounts and progress for the game app, plus the skeleton logic they need. No game play, no atlas app. Source documents: `docs/phase-1-handover.md`, `docs/tech-decisions.md`, `docs/planning/01-decisions.md` (decisions 4, 6, 26 to 30), the steering files, `docs/planning/10-kiro-phase-2.md`.

## Decisions taken by the owner

1. **Sign-in (changes decision 27).** Neon's managed auth cannot sign in with a username (checked against the current Neon docs: only email and password, Google and other social providers, and a fixed plugin list without usernames). Decision 27 is now: **"Google or email and password, both through Neon Auth."** The visitor also picks a **display name** at sign-up, shown in the game. The change is recorded in `docs/tech-decisions.md`.
2. **True version.** The server computes it. The client never reports it. On start, the server issues the seed, loads the legend from Neon, runs the skeleton generator to get the true version id, and stores both.
3. **Session.** Auth traffic goes through our own route under `/game`, so the session cookie is first-party and route loaders can read the verified session on server-rendered requests.
4. **Content state.** The owner fixed the content and committed it. Every version of all twelve legends generates, and the 24 feasibility tests pass. `db:import` was run once on `dev-skeleton-core` with the new content (423 facts; verified through the Neon MCP). `audit:content` stays off limits.
5. **Three Phase 1 test expectations** (`skeleton/test/parser.test.ts`: banshee f05 `puzzleTypes`, draugr decoy count, draugr p-1 candidate count) were updated to the owner's new content, checked against the legend files. No other Phase 1 code or test changed. The skeleton suite is 308 of 308.

6. **Design approvals (owner).** (a) Legend read-back: store the parsed legend in a new `legends.model` column, written in the same import transaction and read back through `legendSchema.parse`; one more `db:import` on `dev-skeleton-core` is allowed. (b) A stub route `/game/world/$target` shows only the world title. (c) Starting a run closes the user's older in-progress run for that world as `abandoned`, in the same transaction; a race that hits the unique index returns a fixed, friendly error, never a 500. (d) If Neon Auth's API cannot delete the test user, delete that one row with SQL on `dev-skeleton-core` only, by the exact test user id, never by a pattern, and record the statement in the handover without credentials. (e) The Arabic flag proves direction handling only; missing keys fall back to English. (f) The secret scan must not read `.env`, not even inside a script; it scans the repo for secret patterns and reports only file and line.

## Facts that shape the design (from the docs)

1. The Neon session cookie (`__Secure-neon-auth.session_token`, HttpOnly, SameSite=None) is set by the **Neon auth service on its own domain**. Our server sees it only if auth traffic goes through our domain.
2. The documented server SDK is for Next.js (`@neon/auth/next/server`). TanStack Router has a client-side quick start. There is **no documented TanStack Start server SDK**, so the proxy route is ours to write.
3. The JWT plugin gives a 15-minute EdDSA token, verifiable against the auth URL's `/.well-known/jwks.json` (issuer and audience are the auth URL's origin; the user id is `sub`).
4. Neon provides shared Google OAuth credentials for testing. Our own Google client is needed before production only.
5. The Neon MCP exposes `provision_neon_auth`, `add_auth_oauth_provider`, `add_auth_trusted_domain`, `update_auth_config` and `update_auth_email_and_password`. Trusted origins must include the local and later the production origin or redirects fail.
6. Anyone can sign up by default; restricted sign-up is not available yet.

## Glossary

- **Visitor**: a person using the game app, signed in (**user**) or not (**guest**).
- **World**: one legend's world behind a door, or the **tutorial** room.
- **Run**: one attempt at one world with one seed.
- **Verified session**: a session the server has checked itself with Neon Auth.
- **Catalogue**: the legends in Neon (`legends` table) with their slot counts (`puzzle_slots`).

## R1. Game app shell

**User story:** As a visitor, I want a small, working app so I can sign in and see which doors are open.

1. `apps/game` SHALL be a TanStack Start app (React, TypeScript `strict`, Tailwind) that imports `@kiroween/skeleton`, served under the base path `/game`. `apps/atlas` SHALL NOT be set up in this phase.
2. THE app SHALL have these screens only: sign in, sign up (with a display name), sign out, a hall that lists the twelve doors, an account page with the visitor's progress, and a stub world page `/game/world/$target` that shows only the world's title and says game play comes later.
3. THE hall SHALL list every legend in the catalogue as a door, open or locked for the current visitor according to R3. The tutorial SHALL be shown as always open.
4. THE screens SHALL be plain, accessible (keyboard, labels, contrast) and mobile-first.
5. THE app SHALL follow `i18n-rtl.md` and `design.md`: no hardcoded UI strings (a translation catalog by key), logical CSS properties only.
6. THE app SHALL have no game play.

## R2. Authentication (Neon Auth only)

1. THE app SHALL use Neon's managed auth (Better Auth) and no other auth system.
2. THE sign-in methods SHALL be **Google** and **email and password**. The sign-up form SHALL ask for a display name, an email and a password. The display name SHALL be validated (length, allowed characters) and shown in the hall and on the account page.
3. THE auth setup on `dev-skeleton-core` SHALL be done through the Neon MCP server if it can; otherwise the console steps SHALL be given to the owner. Trusted origins for local development SHALL be added.
4. THE app SHALL route all auth traffic through its own route under `/game` (a proxy in front of Neon Auth), so the session cookie is first-party. THE server SHALL take the visitor's identity only from a session it has verified itself, on every server function and every route loader, including server-rendered requests. It SHALL never accept a user id from the client.
5. THE secrets and URLs SHALL be `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL` and, only if the design needs it, `NEON_AUTH_COOKIE_SECRET`, read from the environment. After the auth is provisioned the work SHALL stop and ask the owner to put them in `.env`. No secret value SHALL be read, printed or written by the work.
6. IF Google needs the owner's own OAuth client for local development, THE handover SHALL say so. No OAuth client SHALL be created.
7. Sign-out SHALL end the session and return the visitor to the guest view.
8. THE proxy SHALL forward only auth paths to the configured Neon Auth URL (no open relay), SHALL not forward requests to any other host, and SHALL not log cookies or bodies.

## R3. Access rule (decision 29)

1. THE skeleton SHALL contain one pure function `canEnter(target, visitor, guestWorld)` that returns allowed or denied, where `target` is the tutorial or a legend id and `visitor` is guest or signed in.
2. A guest SHALL be allowed into the tutorial and into the guest world, and into nothing else. A signed-in user SHALL be allowed into every world.
3. THE guest world SHALL come from `GUEST_WORLD` (default `banshee`). IF the value names a legend that is not in the catalogue, THE app SHALL fail at start with a message that names the variable.
4. THE rule SHALL be enforced on the server in the route loaders (and in the server function that starts a run), not only in the UI. A denied request SHALL not return the world's data.
5. THE atlas SHALL stay fully open; nothing in this phase gates it.

## R4. Progress (decision 28)

1. A `runs` table SHALL be added to the Neon schema with a new Drizzle migration, applied on `dev-skeleton-core` only. Columns: run id, user id, legend id, seed, true version id, status (`in_progress`, `won`, `restarted`, `abandoned`), slots solved, Hint 2 uses, wrong answers, highest fear, score, started at, finished at.
2. Completed worlds, best score and run history SHALL be queries over `runs`. No extra table SHALL be added unless the design shows a real need.
3. THE server functions SHALL be: start a run, finish a run, list my runs, my completed worlds.
4. THE user id SHALL always come from the verified session. A user SHALL read and write only their own runs; another user's run id SHALL behave as if it does not exist.
5. EVERY input SHALL be validated at the server: the legend id exists in the catalogue; slots solved is an integer from 0 to that legend's slot count; Hint 2 uses and wrong answers are non-negative integers within a stated maximum; highest fear is an integer within the fear meter's range; the status is one of the four.
6. A run SHALL be finishable once: finishing a run that is not `in_progress` SHALL fail. `won` SHALL require slots solved equal to the legend's slot count.
7. WHEN a run starts, THE server SHALL issue the seed (a random value from a cryptographic source on the server), load the legend from Neon, run the skeleton generator for that seed, and store the seed and the true version id it produced. THE client SHALL send neither. IF the generator throws a `GeneratorError` for a seed, THE server SHALL try a bounded number of new seeds, then fail with an error that names the legend.
8. THE importer SHALL write the parsed legend into a new `legends.model` (jsonb) column in the same transaction as the content rows, and the server SHALL read a legend back through `legendSchema.parse` of that column. A test SHALL prove that, for all twelve legends, the stored model equals the parsed legend and that `generate` gives the same run on both. A check against the real database (a smoke step) SHALL prove the same for the twelve stored rows.
9. A user SHALL have at most one `in_progress` run per world. Starting a run SHALL close the user's older `in_progress` run for that world as `abandoned`, in the same transaction as the insert.
10. IF two starts race and one violates the unique index, THE server SHALL return a fixed, friendly error (not a 500), and SHALL leave exactly one `in_progress` run.
11. START RUN, FINISH RUN, LIST MY RUNS and MY COMPLETED WORLDS SHALL reject a request that has no verified session, before any store access, with a fixed "not signed in" error. A test SHALL prove this for all four.
12. GUESTS: progress SHALL stay in the browser and SHALL NOT be sent to the server. No server function SHALL accept progress from a guest.

## R5. Score

1. THE skeleton SHALL contain one pure function: 100 per solved slot, plus 50 for breaking the curse, minus 15 per Hint 2 use, minus 10 per wrong answer, never below 0.
2. THE server SHALL compute the score from the counts. It SHALL never accept a score from the client.
3. `docs/tech-decisions.md` SHALL record that the counts (slots solved, Hint 2 uses, wrong answers, highest fear) are reported by the client, a known limit for a single-player hackathon game. The seed and the true version are not.

## R6. Arabic flag (decision 26)

1. A `FEATURE_ARABIC` variable SHALL exist, off by default. With the flag off the document is `lang="en"` and `dir="ltr"`.
2. WITH the flag on, THE root SHALL set `lang` and `dir` from the locale (`ar` gives `rtl`).
3. EVERY component SHALL use logical CSS properties (start and end) so right to left works. No Arabic story content is in scope.
4. `GUEST_WORLD` and `FEATURE_ARABIC` SHALL be added to `.env.example` with no secrets.

## R7. Tests

1. Property tests (fast-check) SHALL cover: the score is never negative; more Hint 2 uses never raise the score; more wrong answers never raise it; the tutorial and the guest world are open to every guest; every world is open to every signed-in user; every other world is closed to a guest.
2. Unit tests SHALL cover server-side input validation (each rule in R4.5, R4.6 and R4.9), the ownership rule (one user cannot read or write another user's run), the start-run logic with a stand-in for the database, and the legend round trip (R4.8).
3. EACH test SHALL fail when its rule is broken.
4. THESE tests SHALL run in `pnpm -r test` with no database, no network and no `.env`.
4a. A repo secret scanner SHALL have its own tests (it flags each pattern in a fixture and never returns the matched text).
5. Pure logic that the server uses (validation, ownership, access, score, the legend loader) SHALL live in the skeleton or in plain modules that tests can import without a framework or a connection.
6. THE whole suite SHALL pass: the skeleton's 308 tests and the new ones. Any failing test is a real failure.

## R8. Smoke check

1. A separate smoke check against `dev-skeleton-core` SHALL: sign up a test user, sign in, start and finish a run, list it, sign out, then delete the test user's data.
2. THE exact commands and results SHALL be recorded. Credentials SHALL NOT be printed. The test user SHALL be removed afterwards.

## R9. Rules for this phase

1. THE work SHALL NOT edit, create or delete anything under `content/` or `assets/`, and SHALL NOT edit `docs/content-gaps.md`.
2. THE work SHALL NOT change the Phase 1 parser, generator, audit or their tests (apart from the three expectations in decision 5). New modules MAY be added to `skeleton/`.
3. THE work SHALL NOT run `audit:content`. `db:import` was allowed once for the new content and has been run; one more run is allowed after the `legends.model` migration.
3a. THE work SHALL NOT open `.env` to inspect, compare or scan it, not even inside a script. Scripts that need the database load the connection string through the environment as in Phase 1 and never print it. Branch safety is checked through the Neon MCP.
3b. THE secret scan SHALL look for patterns in the repo (`postgres://` and `postgresql://` strings with credentials, `neon.tech` hosts with credentials, long base64 or hex values next to SECRET, KEY, TOKEN or PASSWORD) and SHALL report only file and line, never the matched value.
4. THE work SHALL NOT commit or push, and SHALL NOT start Phase 3.

## R10. Usage log and handover

1. `docs/kiro-usage.md` SHALL get a Phase 2 entry: Kiro features used, and the skills used with what each found.
2. WHEN all tasks are done, `docs/phase-2-handover.md` SHALL list: files and folders created; versions pinned and why; how auth is set up (providers, where sessions are checked); the `runs` table and the migration name; the access rule; the score rule; test results (property tests, runs per property, unit tests, pass or fail); the smoke-check results; skills used and findings; anything that needs the owner's action.

## R11. Skills

1. THE work SHALL use: read-the-damn-docs before TanStack Start, Neon Auth or Better Auth, Drizzle, Tailwind and Vitest APIs; ponytail; agent-security (auth setup, the proxy, session checks, cookies, server functions, input validation, run ownership: the most important review); agent-tester; agent-guard after each group of tasks; verify-and-stop for the final check.
2. Skills SHALL NOT override this spec, the steering files or the owner's prompt. On conflict the spec wins and the owner is told.
3. agent-pilot, agent-superpowers, and any skill that starts sub-agents or its own workflow SHALL NOT be used. This includes agent-orchestrator and agent-implementer, which the owner named in a message: the Phase 2 prompt rules them out, so the prompt was followed.

## Out of scope

Game play, the atlas app, the "doors 2 to 4 stay locked until the tutorial is done" rule from `hub-and-tutorial.md`, email verification and password reset, audio, multiplayer, Arabic story content, any change to legend content.
