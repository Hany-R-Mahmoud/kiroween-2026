# Kiro usage log

Factual record of how Kiro features were used in Phases 0 to 2. It feeds the final write-up. The sections after "Skills" are the running log written while the work was done.

## Phase 0 (setup)

- **Steering**: five files in `.kiro/steering/`. `product.md` and `tech.md` are always included; `content.md` applies to `content/**`; `i18n-rtl.md` to `.ts/.tsx/.css/.json` under `apps/` and `skeleton/`; `design.md` to `.tsx/.css` there. They carried the agreed decisions into every later session (single-player only, seeded randomness, no secrets in code, logical CSS only, one theme pack per legend).
- **Hook**: legend validator on save (`scripts/check-legend.mjs` plus two checks by reading the file). Passed on all twelve legends. Converted to the current JSON hook format in Phase 1.
- **MCP**: the Neon MCP server added to the workspace config; authenticated by the owner.

## Phase 1 (skeleton core)

- **Spec**: `.kiro/specs/skeleton-core/` (requirements, design, tasks), approved step by step. Owner decisions were folded back into the documents: pairwise hotspot swaps (R5.8), the "never" rule for leads (R2.8), valid deep-link anchors, two connection strings, final-puzzle handling, the R5.10 matcher.
- **Steering**: applied on every session; `tech.md` set the test and secrets rules the code follows.
- **Hooks**: `skeleton-tests.json` runs the skeleton tests on save with a command action (no agent turn); `content-validate.json` runs the legend checks on save with an agent action.
- **MCP (Neon)**: `list_projects`, `create_branch` (`dev-skeleton-core`), `list_branch_computes` and `list_postgres_endpoints` (to prove `.env` pointed at the dev branch, not the default one), `get_database_tables` and read-only `run_sql` counts to verify the schema and the import. No connection string was ever requested or read through the MCP.
- **Property-based testing (fast-check)**: 12 properties over 13 subjects (a hand-made fixture and the 12 legends), 100 seeds each, plus tests that break each rule on purpose and require the matching property to fail.

## Phase 2 (accounts and progress)

- **Spec**: `.kiro/specs/auth-progress/` (requirements, design, 26 tasks), approved step by step with two owner stops (after requirements, and at Task 13 for the Neon Auth variables). Owner decisions folded back into the documents: decision 27 changed to email and password, true version made on the server, our own auth route under `/game`, legend snapshot, no foreign keys on `runs`, abandon-on-start with a friendly 409, sessionless requests refused, `.env` never read.
- **Steering**: `tech.md` (secrets, seeded RNG, skeleton holds shared logic), `product.md` (access rule, guest world), `i18n-rtl.md` (logical CSS, catalog keys, `dir` on the root; enforced by two tests), `design.md` (hub palette).
- **Hooks**: `skeleton-tests.json` stayed on for saves under `skeleton/src`; the full suites were also run by hand at every checkpoint.
- **MCP (Neon)**: migration and import checks with read-only `run_sql`; Neon Auth provisioned and configured (`provision_neon_auth`, Google provider, trusted origin, email and password, Organization plugin off); smoke users deleted with `delete_auth_user`. No connection string or secret was requested through the MCP.
- **Property-based testing (fast-check)**: access rule and score properties, 100 runs each, next to the Phase 1 generator properties.
- Skills and their findings: see "Phase 2 skills" at the end of the running log.

## Skills

Used as global skills from `~/.kiro/skills`: read-the-damn-docs, ponytail, agent-tester, agent-security, agent-guard, verify-and-stop. None conflicted with the spec. agent-pilot, agent-superpowers and sub-agent skills were not used. What each found, in short:

- **read-the-damn-docs**: Drizzle guides now show `@rc` while npm `latest` is 0.45 (stable pinned); Neon says migrations use a direct connection; Kiro hooks moved to `.kiro/hooks/*.json` (v1), so the Phase 0 hook file was in the old format. Vitest docs timed out twice (noted).
- **ponytail**: kept modules small; removed dead code (`linkKey`, a duplicate export name, a dead variable).
- **agent-tester**: found a wrong test expectation (`ð` does not decompose), a no-op replace in a test, and led to the "break each rule on purpose" tests.
- **agent-security**: no real secrets in code; one fake connection-string literal in a test, now built at run time; `ImportError` carries no driver message.
- **agent-guard**: split a 330-line parser function and a 60-line `generate()`; found two pnpm built-in name clashes (`audit`, `import`); found a design rule that went beyond the requirement (fact-level hotspots).
- **verify-and-stop**: used for the final check; results in `docs/phase-1-handover.md`.

## Running log

### Group A (toolchain)
- read-the-damn-docs: Drizzle config/get-started docs (read; guides now show @rc, stable 0.45 pinned by owner), Neon pooling docs (read; migrations need direct), fast-check runners (read), npm metadata for engines/peers. Vitest docs site timed out twice; used only long-stable options and verified by running.
- ponytail: skeleton package kept minimal (no src modules yet beyond empty index).
- agent-guard (docs lane) on Group A: found one unverified claim (drizzle-kit "matches" drizzle-orm); reworded. All other claims in tech-decisions.md checked against npm metadata or fetched docs.

### Group B (model and parser)
- read-the-damn-docs: no new external API beyond zod 4 (`z.discriminatedUnion`, `z.enum`, `safeParse`), used as in its current docs shape; verified by typecheck and tests.
- ponytail: one regex family for ids and links, tables read by header name, no plugin system. `shortcut:` limits noted in code (wrong answers split on `;`).
- agent-tester on `test/parser.test.ts`: each negative test edits the real file text and requires a located error; `mustFail` asserts the edit changed the text so a no-op replace cannot pass; expected counts come from the source files and the earlier independent checker, not from parser output. Removed one no-op `.replace('| f01 |','| f01 |')`.
- agent-guard (code and tests) on Group B: `parseLegend` was one function of about 330 lines with a dead variable (`declaredIndex`) and a text-to-keys round trip for fact links. Split into `ctx.ts`, `facts.ts`, `world.ts` and section readers; 22 tests and typecheck pass before and after.

### Spec deviations found while parsing (design.md says otherwise)
1. Leads that are the true chain for a version write `dead end: none` and `contradiction: n/a (true lead)`. The model stores `contradiction: null` for them. Only chains with a contradiction can be shown as dead ends (R5.6 applies to those).
2. Contradiction is `{factIds[], anchors[]}` (several facts and anchors per line), not a single fact and anchor.
3. A hotspot linked as `lead-3` with no step is stored as a lead link with `step: null` (covers every step).
4. In the "Swappable hotspots:" sentence every hotspot id counts as swappable, because the sentence names the decoys that may swap in (draugr h-10, h-15).
5. Parser files are `parseLegend.ts`, `facts.ts`, `world.ts`, `ctx.ts`, `refs.ts`, `markdown.ts`, `loadLegends.ts`.

### Group C (RNG and audit)
- read-the-damn-docs: fast-check runners docs (fc.assert / fc.property) used as documented. A test arrow function that returns an `expect(...)` value made fast-check report a false failure; fixed with a block body.
- ponytail: RNG is xmur3 + sfc32 in one 70-line file; no seed-state API, no distribution helpers. Audit reuses `qualifyingFacts` from the generator instead of a second copy of the rules.
- agent-tester: RNG tests are properties over random seeds plus fixed cases for the ends of `int()`. A static test fails if `Math.random`, `Date.now`, `new Date(` or `crypto.random` appear under `skeleton/src`. Audit tests build one fixture legend and break one rule at a time, asserting the audit reports exactly that and nothing else. One test expectation was wrong (`ð` does not decompose under NFD); fixed the test, not the normaliser.
- agent-guard (code and tests) on Group C: found a name clash (`pnpm audit` is a pnpm built-in, so the script is `audit:content`) and one design rule that went beyond the requirement (see deviations).
- Side finding from the real `pnpm audit`: drizzle-kit 0.31.11 pulls `@esbuild-kit/*` with esbuild 0.18.20 (moderate advisory about the esbuild dev server). Dev tool only; no esbuild dev server is run. Not fixed; noted for the owner.

### More spec deviations (Group C)
6. Design 5.3 rule (f) ("a fact needs a hotspot that links to it") is replaced by the slot-level rule R5.7 states: each filled slot needs a meaningful hotspot linked to any of its candidate facts. The fact-level rule excluded most facts and was stricter than the requirement.
7. The answer-in-text check matches whole words, not substrings ("seven" must not match "seventh").
8. Slots are filled with distinct facts by seeded backtracking, so a solution is found whenever one exists.
9. The true lead is chosen among leads true for the version whose every step has a meaningful hotspot; if none, generation fails (R5.7, R5.13).
10. The generator never silently drops an infeasible version: it throws a typed error. The audit lists every infeasible version per legend in `docs/content-gaps.md`.

### Group D (generator)
- ponytail: `generate()` is split into `chooseLeads`, `chooseFacts`, `checkBaseCoverage`, `applySwaps`, `buildSlot`; no strategy objects, no options bag. `question` is the one convenience field beyond the requirements (statement with the answer blanked).
- agent-guard (code) on Group D: `generate()` was 60 lines (split as above); `hints.ts` exported one function under two names (now one). Output of 60 seeds x 12 legends was identical before and after the split.
- Tooling note: one multi-file shell heredoc wrote a corrupted `generate.ts` (repeated import text). Caught by the typecheck, rewritten with the file tool. No content or spec file was affected.
- Manual run: fixture legend generates for every seed; real legends generate only where the audit predicted (chupacabra 15 of 60 seeds, jersey-devil 42 of 60, the other ten 0 of 60).

### Group E (property tests)
- read-the-damn-docs: fast-check `assert`/`property` (runners page). Vitest console output: a `console.log` from a test shows only when that test runs in the same pass.
- agent-tester on the property tests: every property re-derives its rule from the Legend data (candidates, versions, anchors, hotspot links) and does not call generator code except `normalise`, which has its own tests. A second block takes a good run and breaks each rule on purpose (missing slot, 3 options, duplicate options, correct answer among the wrong ones, [R] fact in true-or-told, fact of the other version, a "never" lead as true lead, dead end with a missing anchor, slot or lead step with no meaningful hotspot, fewer than 5 decoys, invalid swap, bad hint 2 anchor, hint on a swapped-out hotspot, answer not in the chapter) and requires the matching property to report it. A third block checks that the fixture reaches both versions, 0 to 2 swaps and several fact choices, so the properties are not run on a single shape.
- Property results: 12 properties (determinism, typed errors only, and 10 rule properties) x 13 subjects (fixture + 12 legends) x 100 seeds each. Generated runs checked: fixture 1100, chupacabra 255, jersey-devil 834, the other ten legends 0 (they never generate; their gaps are reported by the feasibility tests).
- Feasibility: 2 tests per legend (24 total) fail and stay failing. Not skipped, not marked expected-to-fail, no rule loosened. They are the content gaps in `docs/content-gaps.md`.
- R6.5: the suite gives the same result with `.env` moved aside and an empty environment (`env -i`). Nothing under `src/` or `test/` reads `process.env`; the database tests use drizzle-orm only for table names and types and a recording stand-in for the database, and nothing the tests import loads `pg` or opens a connection.
- agent-guard (tests): replaced a cramped one-line try/catch in the determinism property with a small `outcome()` helper.

### Group F (hook)
- Docs read: Kiro hooks pages (index, types, actions). Current IDE format is `.kiro/hooks/<id>.json` with `"version": "v1"`, PascalCase triggers and `action.type` of `command` or `agent`. The hook files written in Phase 0 used the older IDE 0.x `.kiro.hook` format, which the current docs describe as migrated. Converted the Phase 0 content hook to the new format (same prompt, `PostFileSave`, matcher `content/legends/*.md`) and removed the old file so it cannot run twice.
- The skeleton test hook uses the **command** action (no agent turn): trigger `PostFileSave`, matcher on `skeleton/src/**/*.ts`, runs `pnpm --filter @kiroween/skeleton test`, prints only the failing test names and the summary to stderr on failure (the docs say a non-zero exit sends stderr to the agent), prints the summary on success. It edits nothing.
- Not verified inside the IDE: whether `PostFileSave` fires for saves you make by hand or only for saves made by the agent (the docs describe it as the agent saving or modifying files). The command and the matcher were run by hand and behave as described.
- Expected noise: while the 24 content-feasibility tests are red, this hook reports a failure on every save.

### Group G, part 1 (schema, import code, security review; no database touched yet)
- read-the-damn-docs: Drizzle config and node-postgres get-started pages (the guides now show the `@rc` line; checked the installed 0.45.4 type definitions for `drizzle({ client })`, `transaction`, `primaryKey`, `.references`), Neon connection-pooling page (migrations on a direct connection, pooler is PgBouncer in transaction mode). Result: schema uses inline `.references(..., { onDelete: 'cascade' })`; `drizzle-kit generate` needs no database; `drizzle.config.ts` throws only for `migrate` when `DATABASE_URL_UNPOOLED` is missing, and names the variable, never the value.
- Schema: 14 tables, 4 enums, 20 foreign keys, all `ON DELETE cascade`. Leads store contradiction facts, anchors and "true for" versions as arrays (a lead can name several), and the parser has already checked those ids.
- ponytail: the import is one function per legend (`delete`, then 14 inserts in parents-first order) driven by a pure `planLegend`. The only cast is `rows as never[]` in one helper, because the plan is typed per table where it is built.
- agent-tester on `test/db.test.ts`: the plan is checked against every PK and FK the schema declares, for all twelve legends, before any database exists; the import order is asserted against a recording stand-in; the error path is checked with a driver error whose message and detail contain a fake connection string, and the test fails if any part of it, or a `cause`, survives into the `ImportError`.
- agent-security review of `drizzle.config.ts`, `src/db/*`, `scripts/{env,import,prove-rollback}.ts`:
  - Secrets: connection strings are read only from `process.env` after `dotenv` loads the repo-root `.env` with `quiet: true`; only variable names are printed; `ImportError` carries legend, table and SQLSTATE and drops the driver's message and `cause`; the import's catch-all prints a fixed sentence.
  - Injection: all writes use Drizzle's parameterized builders; the one raw `sql` template (rollback proof) interpolates the legend id as a bound parameter and table names from a constant list through `sql.identifier`.
  - Blast radius: the rollback proof needs `DATABASE_URL_UNPOOLED` of the dev branch and touches only one legend's rows inside a transaction that is rolled back.
  - Scan (`security_change_scan.py`): `exec(` hits are all `RegExp.exec`; the `.env.example` hit is the variable name `NEON_AUTH_COOKIE_SECRET=` with no value; one real finding: a fake connection-string literal in `test/db.test.ts`. Fixed by building it from parts at run time and using an `.invalid` host.
  - Residual: a driver or drizzle-kit error printed by those tools themselves (not by our code) can include the database host (never the password); I do not paste such output into chat. Known moderate advisory in drizzle-kit's bundled esbuild 0.18 dev server (dev tool only).

### Group G, part 2 (Neon branch)
- Neon MCP (authenticated by the owner): `list_projects` showed 52 projects in the organisation and exactly one named `kiroween-2026` (`restless-silence-44986466`, aws-us-west-2). `create_branch` made `dev-skeleton-core` (`br-blue-breeze-arxdc1lo`) from the default branch `br-delicate-brook-art2crov`. No connection string was requested or read. Stopped at Task 16.2 for the owner to paste both strings into `.env`.

### Owner-approved spec change: R5.10 matcher (after Group G part 1)
- Replaced the exact-phrase "answer in chapter" check with the owner's part-based matcher (label stripped; split on commas, " and ", parentheses; each part's content words must be whole words of ONE paragraph; every part must pass; `who-said-it` needs only the surname). Updated `requirements.md` (R5.10), `design.md` (5.1) and the audit.
- Deviation I had to add and am flagging: as worded, banshee f12 ("white dress, red hair, pale face") does NOT pass, because "dress" and "dressed" are different whole words. The matcher folds a trailing "-ed" on words over four letters to the stem. `normalise` itself is unchanged. "bare feet" against "barefoot" still fails, as required.
- Tests (`test/matcher.test.ts`, 20 tests): the real banshee f12, f16 and f15 cases pass; "bare feet" vs "barefoot" fails; words split across two paragraphs fail; parts may pass in different paragraphs; labels, filler words, whole-word and plural folding, surname rule, empty answers.
- Result on the real legends: "answers not found" fell from 61 fact/type pairs to 28.
- `docs/content-gaps.md` is now written in three groups per legend: answers not found; slots or lead steps with no meaningful hotspot; slots with no fact for a version.

### Task 17: stopped before touching the database
- Checked `.env` without printing it: both strings parse; `DATABASE_URL` has the `-pooler` host, `DATABASE_URL_UNPOOLED` does not; both name the same compute endpoint.
- Compared that endpoint with the Neon MCP (`list_branch_computes`, `list_postgres_endpoints`): the endpoint in `.env` belongs to branch `br-delicate-brook-art2crov` (the project's default branch, the parent of `dev-skeleton-core`), not to `dev-skeleton-core` (`br-blue-breeze-arxdc1lo`, endpoint `ep-little-boat-arrb1poz`). R3.3 says migrations never go to the default branch, so no migration, import or query was run. The owner was asked to paste the strings of `dev-skeleton-core`.

## Phase 2 running log

### Requirements step
- Spec `.kiro/specs/auth-progress/requirements.md` written; stopped for the owner as the prompt requires.
- read-the-damn-docs: Neon managed Better Auth docs (overview, about, roadmap, plugins, authentication flow, JWT plugin, TanStack Router quick start). Findings: no username plugin (Neon manages plugins; none for usernames), so decision 27 cannot be met as worded; the session cookie belongs to Neon's auth domain; the documented server SDK is Next.js only; the JWT plugin (15 minutes, EdDSA, JWKS) exists for cross-domain use; shared Google credentials exist for testing.
- Skills: agent-orchestrator and agent-implementer were named in the message but the Phase 2 prompt forbids skills that start their own workflow, so they were not loaded. agent-security, agent-tester, agent-guard, ponytail and verify-and-stop are planned for later steps.
- No code, schema or `.env` change was made in this step. `content/` and `assets/` untouched.

### Design step
- Owner answers folded into `requirements.md` and `docs/tech-decisions.md` (decision 27 now "Google or email and password"; true version computed by the server; auth through our own `/game` route).
- Three Phase 1 test expectations updated to the owner's new content, each checked against the legend file first (suite 308 of 308). `db:import` run once on `dev-skeleton-core` after confirming `.env` still pointed at the dev endpoint; counts verified through the Neon MCP (an MCP count issued in parallel with the import showed old data and was repeated after the import finished).
- read-the-damn-docs: Neon managed auth (Next.js server SDK reference, authentication flow, JWT plugin); the installed `@neon/auth` 0.8.2 package (exports, types, `BUILDING-AN-ADAPTER.md`, `processAuthMiddleware` source); TanStack Start docs (server routes, middleware, router `basepath`). Findings: `@neon/auth/server` is a framework-neutral beta toolkit that names TanStack Start as a target, so we write a small adapter instead of a custom proxy; it needs `NEON_AUTH_COOKIE_SECRET`; loaders are isomorphic so guarded loaders must call server functions; the generator's seed-to-version result depends on the order of leads, which the Phase 1 tables do not keep for versions, facts, leads, assets and sources, so a row-by-row legend loader is unsafe (design 6.4).
- Tool note: a command with `rm -rf` was blocked by the owner's deny rule; later steps used a temp directory without recursive deletes.
- No app code, schema change or `.env` change in this step. `content/` and `assets/` untouched.

### Tasks step
- Owner approved the design with answers (legend snapshot option A, stub world route, abandon-on-start with a friendly 409 on a race, SQL delete of the test user by exact id if the API cannot, Arabic direction only) and two changes: the secret scan never opens `.env` (pattern scan, file and line only), and the four run functions reject a request with no verified session while guest progress never reaches the server.
- `requirements.md` and `design.md` updated for these; `tasks.md` written: 26 tasks in groups A to H. First task group is the base-path spike; the owner stop is Task 13 (Neon Auth provisioned, owner sets `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET`).
- Tooling note: a scripted multi-edit of `design.md` did not apply (nothing changed); the edits were redone one at a time with the edit tool.
- No app code, schema or `.env` change in this step.

### Group A (base-path spike)
- read-the-damn-docs: TanStack Start "build from scratch" page (Vite plugin from `@tanstack/react-start/plugin/vite`, `src/router.tsx` with `getRouter`, `src/routes/__root.tsx`, `createServerFn`), server routes page, router `basepath` option; the installed packages' types and source for what the docs do not say: request helpers (`getRequest`, `getRequestHeader`, `getCookie`, `setCookie`, `setResponseHeader`), `createStart`, `createMiddleware`, `createServerFn().validator(...)`, the plugin's `router.basepath`, `serverFns.base` and how it derives `/game/_serverFn/`.
- Result: Vite `base: '/game/'` plus `tanstackStart({ router: { basepath: '/game' } })`. `base` alone gave 404 on pages. Page, server route and server function proved in dev and in the production build. Outside `/game` the build only redirects (307) into `/game`. Details in `docs/tech-decisions.md`.
- Finding (agent-security, early): Start's server functions have a built-in CSRF check; a cross-site `Origin` gets 403 in dev and build.
- Testing notes: two probe mistakes were caught and redone. A curl `-w` quirk printed fake 404/000 lines; repeated requests showed 200. Node's `fetch` followed the 307 redirects and made `/` look served; `redirect: 'manual'` showed the 307. The production build uses a different server-function id than dev; the id was read from the build.
- ponytail / agent-guard: removed an unused `ReactNode` import and export from the spike's root route; corrected the `vite.config.ts` comment that said `base` alone was enough. Peer warning from Neon's own dependency tree recorded, not patched.
- Checkpoint: typecheck of both packages passes; `pnpm -r test` 308 of 308; nothing changed under `content/`, `assets/` or `vercel.json`.

### Group B (pure logic in the skeleton)
- New modules: `access/canEnter.ts`, `score/score.ts`, `runs/{validate,service,store,errors}.ts`, `guest/progress.ts`, `locale/resolveLocale.ts`, and `scripts/scan-secrets.mjs` at the repo root. 413 lines in all. No framework, database or network in any of them.
- Tests: 60 new (368 total, all pass), including the empty-environment run. Property tests (100 runs each): the tutorial and the guest world are open to every guest, every other world is closed to guests, every world is open to users; score never negative, more Hint 2 uses or wrong answers never raise it, more slots or the curse never lower it, each penalty costs exactly its amount above zero.
- agent-tester: 18 deliberate mutations (one rule broken at a time, matching tests run, file restored). All 18 are caught. The first pass found two survivors, both fixed: (1) the run service checked "in progress" before asking the store, a redundant check-then-update; it was removed and the store's atomic `WHERE status = 'in_progress'` is the only rule, now covered by mutating the fake store; (2) the scanner test never checked `scanDir` output for leaked text; the assertion was added.
- Test mistakes found and fixed: a hand-worked score was wrong (590, not 620); a seed-retry test assumed the first seed fails, but it did not; a placeholder helper in that test did nothing and was replaced by a real seed-dependent failure (a fixture whose `v-b` lead lacks a hotspot).
- agent-security (early): the run service takes a `Visitor`, never a user id, and rejects a guest before any store, loader or seed call; strict validators refuse a client-sent score, seed, true version or user id; error messages are fixed and never echo input; the scanner never opens `.env*` other than `.env.example` and reports file, line and pattern name only. The scanner flagged its own explanatory comment once (a false positive in the new file); the comment was reworded. A repo scan now reports nothing.
- ponytail / agent-guard: `finishRun` parsed its input twice; split into `parseFinish` and `checkFinishForLegend`. No unused exports. Strict typecheck with `--noUnusedLocals --noUnusedParameters` passes.

### Group C (database) and Neon Auth setup
- read-the-damn-docs: installed drizzle-orm 0.45.4 types for `check`, `uniqueIndex(...).on(...).where(...)`, `uuid().defaultRandom()`, and the error classes (`DrizzleQueryError` wraps the pg error in `cause` and also holds the SQL and its parameters); drizzle-kit `generate --name`. Neon MCP tool schemas for auth.
- **Design change found while building (for owner review):** design 6.1 gave `runs` foreign keys to `legends` and `versions`. The Phase 1 importer replaces a legend by delete then insert, so a foreign key would either cascade-delete every player's runs on each `db:import` or block the import. `runs.legend_id` and `runs.true_version_id` are plain text; the server checks the legend id against the catalogue and the true version comes from the generator.
- Migration `0001_runs`: enum `run_status`, table `runs` (uuid id, two CHECK constraints: counts non-negative and "finished_at set exactly when not in progress"), index `runs_user_idx`, partial unique index `runs_one_in_progress` on `(user_id, legend_id) where status = 'in_progress'`, nullable `legends.model jsonb`. Applied to `dev-skeleton-core` only, checked through the MCP after the command finished: all objects present, 2 migrations recorded, default branch still has no tables.
- `db:import` run once (allowed): 12 legends, all with `model`, 423 facts, row counts unchanged. `db:check-models` (new script) reads each stored model through `loadLegend` and prints yes or no: all 12 equal the parsed legend and give the same runs.
- New code: `db/runStore.ts` (every statement filters on `user_id`; start is one transaction that abandons the old in-progress run then inserts; finish updates only an in-progress row of that user; a 23505 on `runs_one_in_progress` becomes the friendly 409, anything else the fixed 503), `db/loadLegend.ts` (`loadCatalogue`, `loadLegend` through `legendSchema.parse`; a null model gives a fixed "run db:import" error). Tests: 39 new (407 total, all pass, also with an empty environment).
- agent-security on the database code: no raw SQL and no logging in the store or loader; the store reads only the SQLSTATE code and constraint name from errors, never the driver message, SQL or parameters (tested with a wrapped error carrying fake SQL, parameters and a host). Side finding outside this spec: Phase 1's `ImportError` reads `code` from the top-level error, so after Drizzle 0.45's wrapping its SQLSTATE is likely always empty. Only the import error message is affected; not changed.
- Neon MCP on `dev-skeleton-core`: `get_neon_auth_config` (not enabled), `provision_neon_auth` (Better Auth), `add_auth_oauth_provider` google (already present: Neon adds it with shared credentials), `add_auth_trusted_domain` `http://localhost:3000`, `update_auth_email_and_password` (enabled, sign-up allowed, no verification), `get_neon_auth_config` read back. Google uses Neon's shared credentials, so no own OAuth client is needed for local development. Neon enables its Organization plugin by default; the app does not use it (noted, not changed). Default branch checked again: no tables.
- Stopped at Task 13.3 for the owner to set `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` in `.env`.

### Owner answers after the Task 13 stop
- Owner set `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` and `GUEST_WORLD` in `.env` (not read by the agent).
- (1) No foreign keys on `runs`: approved; recorded in `design.md` 6.1 and `docs/tech-decisions.md`.
- (2) Phase 1 import SQLSTATE fix: the error unwrapping moved to one shared helper `skeleton/src/db/pgError.ts`, used by both `db/import.ts` and `db/runStore.ts` (one copy instead of two). One new test feeds the importer a Drizzle-shaped wrapped error (fake SQL, parameters and a connection string inside) and requires SQLSTATE `23505` while none of the SQL, parameters or string appears in the error. Mutation check: with the old top-level-only read, that test fails with `expected undefined to be '23505'`.
- (3) Organization plugin turned off on `dev-skeleton-core` through the MCP (`update_auth_plugins_organization` enabled false); `get_neon_auth_config` read back: organization, magic link and phone number plugins all off; email and password and the shared Google provider unchanged.

### Group D (authentication in the app)
- read-the-damn-docs: `@neon/auth` 0.8.2 installed types and source (`createAuthServer`, `handleAuthProxyRequest`, `processAuthMiddleware`, `RequestContext`, `MiddlewareResult`); TanStack Start environment-variables guide; Start's own source for request middleware (`handlerType`, `pathname`, `next().response`), `createCsrfMiddleware`, and its env plugin.
- New files: `apps/game/src/server/{env,auth,middleware,proxyPath}.ts`, `src/routes/api.auth.$.ts` (proxy), `src/start.ts` (global middleware), `vitest.config.ts`, `test/{env,proxy-path}.test.ts` (35 tests). `skeleton/src/db/client.ts` takes an optional pool size.
- **Findings (agent-security):**
  1. Once an app has `start.ts` with `createStart`, Start **stops adding its default CSRF middleware for server functions** (only a dev-time warning; nothing in production). `start.ts` adds `createCsrfMiddleware` explicitly, and also applies it to POSTs on our auth proxy. Checked live: server function same-origin 200, cross-site 403, no headers 403; cross-site POST to the proxy 403.
  2. Server-side `getSession()` trusts the signed `session_data` cache cookie when a session token is present. `NEON_AUTH_COOKIE_SECRET` therefore decides identity (whoever has it can forge a session), and a session revoked at Neon stays valid on our server until the cache expires (default 300 seconds). Recorded as a residual risk.
  3. Start's env plugin loads `.env` from the app folder only. A five-line Vite plugin loads the repo-root `.env` into the server's `process.env`; variables already set in the real environment win. Vite's client prefix is set to `KIROWEEN_PUBLIC_` (no such variable exists), so nothing in `.env` can be bundled into the browser even under a `VITE_` name.
  4. Methods other than GET and POST on the proxy fell through to the page router (200 with HTML). They now answer 405 with `Allow: GET, POST`.
- Live checks (dev server, real `.env`, real Neon Auth on the dev branch; only status codes printed): `/game/` 200; `get-session` as a guest 200 with `null`; bad proxy path 404; env error names the variable and never the value (seen before the env fix: "DATABASE_URL is not set").
- ponytail: the proxy route is one function; `getVisitor` treats any failure as a guest (no privilege on doubt).

### Group E (screens and server functions)
- New: `apps/game/src/i18n/{en,ar,t,useT}.ts`, `components/Field.tsx`, `auth/client.ts`, `server/{db,functions}.ts`, routes `index` (hall), `sign-in`, `sign-up`, `account`, `world.$target` (stub), the root with header and skip link. Skeleton: `account/displayName.ts`, `design/tokens.css` (hub palette and fonts, no font fetched from a third party), `client.ts` (browser-safe entry). Spike route `api.ping` removed.
- read-the-damn-docs: Start serializes only an error's `message` to the client (its ShallowErrorPlugin), so server functions turn every non-RunError into one generic message; router `getRouteApi`, `redirect`, `notFound`.
- Findings and fixes:
  1. Sign-up goes straight to Neon, so the display-name rule (R2.2) is enforced in our proxy for `sign-up/email` and `update-user` bodies (`cleanDisplayName`: 2 to 30 letters or digits of any script, single spaces and `' . - _` between them; markup, emoji, zero-width characters refused). The proxy also drops an `image` field.
  2. The skeleton's main entry exports database code; a new `@kiroween/skeleton/client` entry exports only pure modules, and a test fails if anything it reaches imports `pg`, `drizzle-orm`, `node:` or the db or parser folders. The production client bundle was checked: no driver, store, or secret variable names in it.
  3. WCAG contrast: the hub "danger" red is 3.31:1 on the background (AA needs 4.5:1). A tint `--color-danger-ink` (6.04:1) is used for error text; the palette token itself is unchanged. All other text pairs pass (lowest: muted on surface 5.79:1).
  4. A logical-CSS scanner and a no-hardcoded-JSX-text test run over `apps/game/src`; the scanner's own false positive (a comment saying "right-to-left") was fixed by rewording the comment.
- Manual run (dev server, dev branch, guest; status codes only): hall 200 with `lang="en" dir="ltr"`, 12 doors plus the tutorial, only The Banshee open and 11 locked; guest world 200 with its title; another world 307 to sign-in with no world data; unknown or malformed id 404; account shows the guest view. Arabic flag set only in a second server's process environment (`.env` untouched): off gives en/ltr even for an Arabic browser; on gives `ar`/`rtl` from Accept-Language, and a `lang=en` cookie wins.
- Not done: a keyboard-only pass in a real browser (no browser automation here). Checked instead by reading the markup: skip link, labelled nav, one h1 per page, every input labelled with hint and error tied by `aria-describedby`, errors announced with `role="alert"`, visible `focus-visible` outlines, 44 px minimum targets. Recorded for the owner.
- Tests: skeleton 431, game 41, all pass with an empty environment; strict typecheck with no unused locals passes in both packages; production build passes.

### Group F (agent-security review of the auth and progress surface)
Threat areas reviewed: the auth proxy, the global middleware and cookies, session checks, every server function, the run store, the access rule on every loader, CSRF, the session cache secret, environment handling, the guest module, the secret scan. Read in source: `@neon/auth` 0.8.2's proxy (`handleAuthRequest`, `prepareRequestHeaders`, response header allowlist, `exchangeOAuthToken`), TanStack Start's CSRF middleware and its default.

Confirmed safe, with evidence:
- Proxy upstream: the host is fixed by `NEON_AUTH_BASE_URL`; the toolkit forwards only an allowlist of request headers (`user-agent`, `authorization`, `referer`, `content-type`, `x-neon-client-info`) and only Neon Auth cookies, and returns only an allowlist of response headers (`content-type`, `set-cookie`, auth token headers). Other cookies on our domain never reach Neon.
- Google return trip: the redirect after the code exchange is the same request URL with the one-time verifier removed (same origin, no open redirect). The browser follows Neon's sign-in URL only if it is `https://`.
- Identity: only from `getSession()` on the server; no server function takes a user id; `getVisitor` treats any failure as a guest.
- Server functions: CSRF middleware listed explicitly (Start drops its default once `start.ts` exists); live checks 403 cross-site and 403 with no headers. Only `message` is serialized to clients and every non-RunError message is replaced by a generic one.
- Access rule: `canEnter` in `enterWorld`, `getHall`; denial is a redirect with no world data (live check).
- Runs: ownership by construction (`user_id` in every statement), guests refused before the store (service and `requireUser`), strict validators refuse client-sent score, seed, version and user id, the race maps to a fixed 409, driver errors reduced to code and constraint.
- Client bundle: no driver, store, or secret variable names (built and checked); Vite client prefix `KIROWEEN_PUBLIC_`.
- Scans: `node scripts/scan-secrets.mjs` finds nothing. `security_change_scan.py`: one "hardcoded secret" hit is the form label `'form.password': 'Password'` (false positive); the rest are "file touches a trust boundary" notes; `exec(` hits are `RegExp.exec`.

Fixed during the review:
- The proxy forwarded any well-formed path. It now forwards only the five endpoints the app uses; admin, organization, email change, profile update and account deletion return 404 (least privilege, like turning off the Organization plugin). The display-name check is now for sign-up only, the one path that sets a name.

Residual risks (for the handover):
- `NEON_AUTH_COOKIE_SECRET` signs the session cache cookie that the server trusts for identity: whoever has it can forge a session. Keep it out of everything but `.env` and the hosting secrets; rotate if exposed (all cached sessions then re-validate).
- A session revoked at Neon stays valid on our server until the cache cookie expires (default 300 seconds).
- No rate limiting of our own on sign-in or sign-up (Neon's service has its own limits). Anyone can sign up; email verification is off.
- Run counts (slots solved, Hint 2 uses, wrong answers, highest fear) are reported by the client; the score is computed on the server, and seed and true version are server-made (recorded in `docs/tech-decisions.md`).
- Google uses Neon's shared OAuth credentials: fine for development; production needs the owner's own Google client and the production trusted origin.

### Group G (smoke check against `dev-skeleton-core`)
- `apps/game/scripts/smoke.mjs`: 24 steps against the running dev server, using the real HTTP routes and the real server functions the way the browser calls them (Start's own seroval copy encodes the calls). It prints step names and status codes only, never a cookie, password, email or token. The test user has a random `@kiroween-smoke.invalid` address and a random password.
- Commands: `cd apps/game && nohup pnpm exec vite dev --port 3000 > /tmp/game-dev.log 2>&1 &`, then `node scripts/smoke.mjs`, then the dev server stopped.
- Run 1: 9 steps failed. Two real causes:
  1. **A bug in the app:** server functions refused guests with the right message but HTTP status 200. `requireUser` now sets 401 before it throws.
  2. **A bug in the script:** it decoded server-function replies with the wrong seroval call. It now uses `fromCrossJSON`.
- Run 2: all 24 steps passed. The guest sees 12 legends with only the guest world open. A guest gets a redirect with no world data, and 401 on starting or listing runs. A markup display name is refused before Neon. Sign-up, sign-in and `get-session` work. An unused auth endpoint gets 404. A signed-in user opens another world. A second start abandons the first run. A client-sent seed or score gets 400. Finishing someone else's run, or a missing run, gets 404, and so does finishing a run twice. The server computes the score: 515 = 5 × 100 + 50 − 15 − 20. The run list, completed worlds and account page are right. After sign-out the session is gone and the world is closed again.
- `db:check-models`: all 12 stored `legends.model` values equal the parsed legends.
- Cleanup through the Neon MCP on `dev-skeleton-core` only, by exact id, for each of the two smoke users (run 1 and run 2):
  - `delete from runs where user_id = '<test user id>'` (2 rows each).
  - `delete_auth_user` with `<test user id>`. The Neon Auth API delete worked, so the SQL fallback on `neon_auth."user"` was not needed.
  - Read back: 0 users, 0 sessions, 0 accounts, 0 runs. The temp file holding the id was removed.

### Group H (docs)
- `.env.example`: `GUEST_WORLD` and `FEATURE_ARABIC` added, and a one-line role for each auth variable. No values.
- `docs/tech-decisions.md`: the `@neon/auth` pin, the five-endpoint proxy, each variable's role, CSRF, the display-name rule, `danger-ink`, the client-reported counts limit, the score. The stale "planned packages" table was replaced.
- Finding (read-the-damn-docs, installed source): `@neon/auth` 0.8.2 reads only `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` and builds the JWKS address from the base URL. `NEON_AUTH_JWKS_URL` is read by nothing. It stays in `.env.example`, marked as unused.

### Phase 2 skills
Not used: agent-pilot, agent-superpowers, agent-orchestrator, agent-implementer, or any skill that starts sub-agents.
- **read-the-damn-docs**: Neon has no username sign-in, which changed decision 27. Neon ships a beta framework-neutral server toolkit. Start needs the router `basepath` as well as Vite's `base`, drops its default CSRF middleware once `start.ts` exists, serializes only an error's `message`, and its env plugin ignores `envDir`. The legend tables lose the order the generator needs, which led to the `legends.model` snapshot. `NEON_AUTH_JWKS_URL` is unused.
- **ponytail**: one-function proxy, no general path allowlist, a five-line env plugin instead of a dependency, no foreign keys where the importer would fight them. Removed the spike's unused export and a redundant check-then-update in the run service.
- **agent-security**: the CSRF default dropped by `start.ts`, the proxy narrowed to 5 endpoints, the display-name check placed in the proxy, 405 for other methods, the client env prefix, the browser-safe skeleton entry, and errors reduced to fixed messages. Residual risks are listed in Group F.
- **agent-tester**: 18 deliberate mutations, all caught after two survivors were fixed. Property tests for access and score. The smoke check found the 401 bug. Tests are checked again with an empty environment.
- **agent-guard**: see the final guard pass in `docs/phase-2-handover.md`.
- **verify-and-stop**: final verification; results in `docs/phase-2-handover.md`.
