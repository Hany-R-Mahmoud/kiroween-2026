# Kiro usage log

Factual record of how Kiro features were used in Phases 0 to 4. It feeds the final write-up. The sections after "Skills" are the running log written while the work was done.

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

## Phase 3 (atlas)

- **Spec**: `.kiro/specs/atlas/` (requirements, design, 32 tasks), approved step by step with an owner stop for the reader role's password. Owner decisions folded back in: alt text built from stored text; the list grouped by continent; `ATLAS_ORIGIN`; `versions.ordinal`; map pin notes left out; `PUBLIC_ORIGIN`; the password route; the Keeper's Note out of scope.
- **Steering**: `design.md` (hub palette, theme packs read and never invented, AA contrast, 44 px targets, reduced motion), `i18n-rtl.md` (catalog keys, logical properties, `dir` on the root; enforced by tests), `tech.md` (secrets, shared logic in the skeleton), `product.md` (the atlas is public).
- **Hooks**: `skeleton-tests.json` stayed on for saves under `skeleton/src`; full suites were also run by hand at every checkpoint.
- **MCP (Neon)**:
  - `run_sql` to check the migration, the import, the version order, the anchor format and the default branch;
  - seven role statements, then privilege checks on both roles.
  - No connection string or password was requested through the MCP.
- **Property-based testing (fast-check)**: `atlasUrl` and the anchor format, 100 runs, next to the Phase 1 and 2 properties.
- **Headless Chrome over the DevTools protocol** (a helper script outside the repo, no dependency) for screenshots at phone and desktop widths, the hash-focus check, real key presses for the map card, and the right-to-left pass.
- Skills and their findings: see "Phase 3 skills" at the end of the running log.

## Phase 4 (game play)

- **Spec**: `.kiro/specs/game-play/` (requirements, design, tasks), made in that order and approved step by step before any code. The tasks file groups the work into waves; the orchestrator moved each task through queued, in progress and completed.
- **Orchestrated task execution**: the orchestrator handed one task at a time to a spec-task sub-agent. Sub-agents ran one at a time, never in parallel, and each reported back before the next started. Sub-agents did not change task status and did not start sub-agents of their own.
- **Custom agent**: `game-balance-reviewer` (`.kiro/agents/game-balance-reviewer.md`), read-only apart from `docs/phase-4-notes/balance.md`. Details and findings in the running log below.
- **Hook**: `physical-css-check` (`.kiro/hooks/physical-css-check.json`), a `PostFileSave` command hook that reports physical left/right CSS in `apps/` and `skeleton/`. Details in the running log below.
- **Steering**: all five files in `.kiro/steering/` applied. `tech.md` (seeded RNG only, no secrets in code, the skeleton holds shared logic, property tests after generator changes), `product.md` (single player, the game cannot be solved without the atlas, the access rule), `i18n-rtl.md` (logical CSS, catalog keys; also the source of the hook's pattern list), `design.md` (contrast, 44 px targets, reduced motion), `content.md` (read-only `content/`).
- **MCP (Neon)**: not recorded in the Phase 4 notes as used. The Phase 4 migration (`0003`) and the Keeper's Note import were checked with throwaway scripts against `dev-skeleton-core` (`docs/phase-4-notes/migration.md`), not through the MCP.
- **Property-based testing (fast-check)**: properties for secrecy of the play payload, answers and hints, leads and the final puzzle, fear, score, the token codec, the tutorial and receipt, pan and media, and the hall rules. A scripted atlas-only player must win every legend (Property 14); eight legends are expected failures (`it.fails`, exact set) because of known content findings (`fairness.md`).
- **Headless Chrome over the DevTools protocol** (`apps/game/scripts/browser-check.mjs`, no dependency added): keyboard-only play, 390 px touch, reduced motion, Slow 4G timing. 43 of 46 checks passed; the 3 misses are the 3.0 s first-view budget (hall 5.8 s, tutorial 4.9 s, Banshee 10.4 s), recorded as findings. Three bugs found there were fixed with tests (touch drag stopping after about 23 px, unreadable spirit panel at 390 px, spirit figure hiding "Pan right").
- **Smoke check**: `skeleton/scripts/smoke-play.ts` through the real server functions against `dev-skeleton-core`: 26 of 26 steps passed; the test user was deleted by exact id.
- Skills and their findings: see "Phase 4 skills" at the end of the running log.

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

## Phase 3 running log (atlas)

### Spec
- `.kiro/specs/atlas/` (requirements, design, 32 tasks), approved step by step. Owner decisions folded in: alt text built from stored text, list grouped by continent from Natural Earth, `ATLAS_ORIGIN` for the game, a `versions.ordinal` column with one `db:import`, map pin notes left out, `PUBLIC_ORIGIN` for Open Graph URLs, the psql `\password` fallback for the reader role, `content/keepers-note.md` out of scope.
- read-the-damn-docs (requirements and design): Neon "Manage database access" and "Manage roles" (Console, API and MCP roles get `neon_superuser`; limited roles need SQL; Reset password sets a generated password); Natural Earth terms of use (public domain, credit optional); npm metadata for Start, Fontsource (22 families, all OFL-1.1) and world-atlas (not used); the Natural Earth v5.1.2 GeoJSON (has `CONTINENT`; all 12 map points tested: 11 inside a country, the Flying Dutchman 0.25° off the coarse coast).
- Skills: agent-orchestrator, agent-implementer and agent-pilot were named by the owner but are not loaded (the prompt forbids skills that start their own workflow). impeccable stands in for "agent-impeccable". agent-design sends code-level UI work to impeccable, so it is used only for its inclusive-visual check.

### Group A (spike)
- read-the-damn-docs: the installed router-core types (`hashScrollIntoView`, `defaultHashScrollIntoView`, `trailingSlash`, `notFoundComponent`); the game's working Start setup reused.
- Findings: (1) `trailingSlash` default redirected `/game/` (fixed with `preserve`); (2) no `start.ts` is needed in the atlas (Start's default CSRF stays on); (3) the game's local `serve-build.mjs` can be crashed by a malformed `%`-sequence (recorded, not changed).
- Testing: headless Chrome through the DevTools protocol (a helper script outside the repo, no dependency) for the hash-focus check. `test/media.test.ts`: 15 cases. Mutation check: dropping the canonical-path comparison fails 3 of them.
- ponytail: `/media` is one 60-line plugin with no server route and no static-file library. `assetUrl` was written in the spike because the plugin needs it; its tests are Task 5.

### Group B (pure skeleton modules)
- New: `skeleton/src/atlas/{links,story,view}.ts`, `assets/assetUrl.ts`, `theme/{palette,contrast}.ts`. Exported from the main and the browser-safe entry; the client-entry test still passes. 5 new test files (79 tests).
- Content findings, read only: every one of the 400+ asset ids in the legend files has its WebP at the canonical path, and every stored size equals the file's real header size (checked with a small WebP header reader). Some cold opens, closings, chapter texts and version paragraphs end with a Markdown divider line (`---`) that the Phase 1 parser keeps; `storyBlocks` drops divider-only lines (the parser is not changed). `[R]` tags appear in six "documented and told" cells and stay as text.
- Contrast, computed from the packs: ink passes everywhere; the pack accent fails as a link colour for baba-yaga, draugr, jersey-devil and yuki-onna, which fall back to the base accent. `BASE_PALETTE` is checked against `tokens.css` so the two cannot drift. `resolveTheme` throws instead of returning a colour below AA.
- agent-tester: the equivalence test hands the builder shuffled rows, because rows that arrive in file order would let a builder that ignores `ordinal` pass. 11 mutations (anchor format, length cap, asset folder rule, size order, surface contrast check, naddaha font order, italics, divider, source order, chapter order, marker surface): all caught. The full-equivalence test is `it.fails` until Task 10 and was checked to fail only on version order.
- clean-code-guard: `pick` first returned the last candidate silently when every candidate failed; it now throws. `versionsAnchor` first had a made-up fallback; both builders now require the stored anchor.

### Group C (database, dev branch only)
- `versions.ordinal` (`skeleton/src/db/schema.ts`), written by the importer as `i + 1` in file order (`plan.ts`). `test/db.test.ts`: versions are numbered 1 to n in file order for all 12 legends. The view test's expected-failure marker and its temporary cast were removed (owner), so it runs as a normal test from here on. It then found a real bug: the rows builder passed version rows through with a rest spread, so extra columns (`id`, `legendId`) leaked into the view. It now maps the fields explicitly. Mutations: dropping the version sort, and a constant ordinal in the plan, are both caught.
- Migration `0002_versions_ordinal`: drizzle-kit generated `ADD COLUMN "ordinal" integer NOT NULL`, which fails on a filled table. It was edited to the two approved statements (add with `DEFAULT 0`, then drop the default). The snapshot says not null with no default.
- Host check by name only: `DATABASE_URL_UNPOOLED` and `DATABASE_URL` both name the dev endpoint; `ATLAS_DATABASE_URL` is not set yet.
- `db:migrate`, then MCP: integer, not null, no default; 3 migrations; default branch has 0 tables.
- One `db:import`. MCP: 12 legends with `model`, 423 facts, 52 versions with ordinals 1 to n per legend and no repeats, none 0. Each legend's order matches its file (compared with the parsed content). `db:check-models`: yes for all 12. `runs`: 0 rows, untouched.
- Reader role through the MCP, one statement per call (design 3.3): `atlas_reader` (NOLOGIN) and `atlas_web` (LOGIN, no password, in `atlas_reader`). MCP check:
  - Neither role is a superuser or a member of `neon_superuser`, and neither has CREATEROLE, CREATEDB or BYPASSRLS.
  - SELECT on the granted `legends` and `assets` columns; refused on `legends.model`, `final_puzzle` and `assets.prompt`.
  - Table-level SELECT on exactly `anchors`, `chapters`, `documented_told`, `sources` and `versions`.
  - No access to `runs`, `facts`, `puzzle_slots` or the `neon_auth` schema. No CREATE on `public`.
  - INSERT, UPDATE, DELETE and TRUNCATE on none of the 25 tables in `public`, `neon_auth` and `drizzle`.
- **Owner stop (Task 12.3).**
  - First attempt (Console Reset password): the string in `.env` had no password, and `pg_authid` showed none for `atlas_web`. `db:check-reader` stopped with the fixed label "no password in the connection string". The script prints only a label from known phrases, never the driver's text.
  - Owner finding: Neon refuses the SCRAM hash that psql's `\password` sends (plain-text passwords only), so design 3.3's Option B does not work on Neon. The owner set the password with a local script over the owner's connection, and rotated the `neondb_owner` password (the old one had been exposed), updating `DATABASE_URL` and `DATABASE_URL_UNPOOLED`. Design 3.3 now records this for production.
  - Re-check: MCP shows `atlas_web` with a password, not a superuser, not in `neon_superuser`, a member of `atlas_reader` only. Host check by name only: all three strings point at the dev endpoint, each with a password. `db:check-reader`: 18 of 18 yes (5 tables and the display columns readable; `legends.model`, `final_puzzle`, `assets.prompt`, `runs`, `facts` and `neon_auth."user"` refused; INSERT, UPDATE, DELETE and CREATE TABLE refused, all with SQLSTATE 42501). `db:check-models` over the rotated owner string: 12 of 12 yes.

### Group D (atlas data layer)
- New: `apps/atlas/src/server/{env,db,anchor,functions}.ts`, `skeleton/src/db/atlasRead.ts`, `skeleton/scripts/check-reader-role.ts` (`db:check-reader`). `view.ts` gained `markerOf`, `AtlasSummary` and `SHARED_ATLAS_IMAGES`; the asset test now reads the shared ids and sizes from that one list.
- `PUBLIC_ORIGIN` is accepted only as an https origin or `http://localhost[:port]`, with no path, query, fragment or trailing slash. 10 refused forms are tested, and errors name only the variable.
- `test/atlas-read.test.ts` hands Drizzle a recording stand-in for the pg client, so it sees the exact SQL and bound values with no database. It checks: no `select *`; none of the columns the role may not read; only the granted tables; the legend id and the anchor only as bound values; the legend page read inside one transaction. 4 mutations (reading `legends.model`, the anchor put into the SQL text, the transaction dropped, reading `assets.prompt`): all caught. Dropping the resolver's format check: 8 tests fail.
- `db:check-reader` against the real dev branch, as `atlas_web`: 18 role checks plus 14 read checks, all yes. `listLegends` gives 12 legends, each with a marker. For all 12 legends `getAtlasLegend` deep-equals `atlasLegendFromModel` of the parsed file. `findAnchorLegend` finds `banshee--ch-3` and not `banshee--ch-99`.

### Group E (map data)
- `apps/atlas/scripts/build-geo.mjs` turns Natural Earth v5.1.2 `ne_110m_land` and `ne_110m_admin_0_countries` (public domain; fetched from the project's v5.1.2 GitHub tag to a temp folder) into two committed files:
  - `public/world-land.svg`: 49.7 KB, 17 KB gzipped, equirectangular, latitudes 84 to -58, shapes only.
  - `src/geo/countries.json`: 160 KB, continent plus polygons, coordinates rounded to 0.01°, server only.
- The outline is drawn as a CSS mask over a token colour, so the SVG file holds no colour values (design steering).
- `continentOf` and `placeMarkers` (44 px buttons, leader lines, deterministic). `getHome` adds each legend's continent and place on the server.
- agent-tester: 5 mutations. Two survivors were found and handled:
  - A layout that throws crashed the whole test file instead of failing a test; the layout is now computed inside each test.
  - Ignoring polygon holes changed nothing. The 110m data has one hole (Lesotho inside South Africa), on the same continent, so the hole logic was dead for this function and was removed (ponytail).
- Tooling note: the first temp folder held 404 pages saved under the official file names by an earlier failed `curl`. The script read them and failed loudly, and the files were fetched again under the right names.

### Group F (pages, themes, fonts)
- New:
  - `src/i18n/*`.
  - `src/components/{Img,StoryText,MetaList,LegendPage,LegendList,WorldMap,NotFound,AnchorFocus,home}`.
  - `src/routes/{__root,index,legends.$legendId,anchor.$anchor}.tsx`.
  - `src/fonts.ts` (22 Fontsource packages, exact pins, all OFL-1.1 with `font-display: swap` and `unicode-range`).
  - `src/geo/continents.ts` (the group list, without the polygons, for client code).
  - `styles.css`: themed selection, caret, scrollbars and focus; the 68ch measure; the landing highlight, animated only with no-preference.
- impeccable (craft floor read before the UI edits; mode Read). Found while building:
  - The hook was set in the glow colour, which is checked only for large text; it now uses ink.
  - "Chapter n" and "Who tells it" were eyebrow labels above headings (banned); the chapter number moved into the heading line.
  - Hover scaling now runs only with `motion-safe`.
- Looked at in headless Chrome:
  - Home on desktop: the real-outline map, all 12 markers, leader lines for Western Europe, Korea and Japan, and Egypt.
  - baba-yaga: Bad Script and PT Serif load; links use the base accent fallback.
  - Landing on `#baba-yaga--ch-3` with reduced motion focuses the chapter heading with a static outline.
  - naddaha on a phone: no sideways overflow.
- Findings fixed:
  - A banshee version claim has Markdown italics (`*bean chaointe*`) outside the story text. Short fields (version fields, chapter and source titles) now render through `InlineText`.
  - `resolveTheme` returns the page's font families, so the route links only its own stylesheets.
- agent-tester: 11 mutations on the Group F tests. Two survived at first, and both tests were strengthened:
  - A non-http source URL was never tested, because all content URLs are http(s). The test now adds `javascript:` and empty URLs.
  - A hardcoded word alone on a JSX line passed the one-line `>text<` scan. A second pattern was added. The game's copy of this test has the same gap; recorded, since the game may not change.
- The legend-render test's own first version counted the version headings' `-title` ids as anchors. That test bug was fixed.
- Checkpoint: atlas 154, skeleton 513, game 39 tests, also with an empty environment; strict typecheck and build pass. The client bundle has no auth code, no variable names and no country polygons; the server bundle has no auth code.

### Group G (impeccable design and accessibility review)
- `impeccable context` (run from `apps/atlas`): no PRODUCT.md or DESIGN.md (owner: not created); narrow refinement allowed on the existing implementation; brief = steering files and theme packs; mode Read. Impeccable's own reviewers are sub-agents, and the prompt forbids those, so the review ran in this thread. Impeccable reported that a newer version (v4.10.0) exists; not updated.
- Detector on the source: 5 "broken image" warnings, all false positives (it reads the `<Img>` component as an `<img>` with no `src`; the rendered tags have `src- Detector on the source: 5 "broken image" warnings, all false positives (it reads the `<Img>` component as an `<img>` with no `src`; the rendered tags have `src- Detector on the source: 5 "broken image" warnings, all false positives (it reads the `<Img>` component as a r- Detector on the source: 5 "broken image" warnings, all false positives (it reads the `<Img>` component as an `min(68ch, 34em)`.
  - Single words stranded on the last line: `text-wrap: pretty` on paragraphs, list items and definitions.
  - After the fixes: banshee clean, three advisory stragglers left in short meta values.
- Manual checks in headless Chrome, with real key presses through the DevTools protocol:
  - A marker opens its card with Enter; Tab moves into the card; Escape closes it and focus returns to the marker (native popover).
  - The marker's accessible name is the legend title.
  - Contents and list links now have 44 px targets (design steering).
- RTL (a second dev server with `FEATURE_ARABIC=true` set only in its process environment; `.env` untouched): `lang="ar"`, `dir="rtl"`, mirrored layout, the map box stays `dir="ltr"`, no sideways overflow on a 390 px phone.
  - Found: English text inside the right-to-left page broke at punctuation and numbers (".answer a voice", "of 5 3", "min 20"). Fixed with `unicode-bidi: plaintext` on text elements, so each block takes its direction from its first letter.
- Audit scores (impeccable audit, 0 to 4):
  - Accessibility 3: AA contrast everywhere, labelled regions, landmarks, skip link, focus visible, reduced motion respected. A screen-reader pass was not done.
  - Performance 3: hero preloaded and eager, everything else lazy, fonts only on use. The 2400 px hero is served to phones (no smaller copies exist).
  - Theming 4: every colour from tokens; the per-legend theme on `<body>`; the outline drawn as a mask.
  - Responsive 3: phone and desktop checked; the map scrolls sideways under 960 px by design.
  - Implementation integrity 4.
  - Total 17/20 (Good).
- agent-design (inclusive-visual check): the atlas draws no cultural motifs this phase, only the palette and fonts. A scan of the 12 packs' motif and UI-accent text for loaded symbols found only "cross-stitch" (a false positive). Note for Phase 4: for yuki-onna use the pack's neutral forms (seigaiha waves, hanko-style seals), never a rayed sun disc.

### Group H (game changes, only the two allowed)
- `apps/game/src/routes/__root.tsx`: a root `notFoundComponent` (catalog keys `notFound.*`). Checked live: `/game/no-such-room` gives 404 with the game's page, and the dev log no longer warns about a missing `notFoundComponent`.
- Door links: `env.ts` gains `ATLAS_ORIGIN` (optional; an http or https origin with no path, query or trailing slash, else an `EnvError` naming only the variable). `getHall` adds `atlasHref = atlasOrigin + legendUrl(id)` for every door, open or locked. `index.tsx` gives each door sibling "Enter" (open doors only) and "Read the legend" links with 44 px targets, instead of one link around the card.
  - 7 new env tests. Mutation: dropping the `origin === value` check fails 4 of them.
  - Live with `ATLAS_ORIGIN=http://localhost:3001` in the process environment: 12 atlas links in the hall, and the first one answers 200 on the atlas.
- `.env.example`: `ATLAS_ORIGIN`, `ATLAS_DATABASE_URL`, `PUBLIC_ORIGIN`, with comments and no values.
- No change to auth, access, runs, score, the proxy, the middleware or the smoke script.

### Group I (test quality and smoke check)
- agent-tester, summed over the phase: 50 deliberate mutations, each run against its tests and then restored, all caught in the end.
  - Group A: 1. Group B: 11. Group C: 2. Group D: 5. Group E: 5. Group F: 11 plus 2 re-runs. Group H: 1. `PUBLIC_ORIGIN`: 2.
  - Plus checks that the expected-failure test failed only on version order.
  - Five weak spots were found and fixed:
    - the shuffled rows in the equivalence test;
    - a layout throw that crashed the whole geo test file;
    - polygon-hole logic that could never change an answer (removed);
    - the untested non-http source URL;
    - the one-line no-hardcoded-text scan.
- Smoke, `apps/atlas/scripts/smoke.ts`: 25 steps, run with the skeleton's `tsx` because it compares pages with the parsed content files.
  - Commands, from the repo root:
    - `cd apps/atlas && env -u PUBLIC_ORIGIN pnpm exec vite dev --port 3001` and `PUBLIC_ORIGIN=http://localhost:3003 pnpm exec vite dev --port 3003` (both in the background);
    - `pnpm --dir skeleton exec tsx ../apps/atlas/scripts/smoke.ts http://localhost:3001`;
    - `pnpm --dir skeleton exec tsx ../apps/atlas/scripts/smoke.ts http://localhost:3003 --og http://localhost:3003`;
    - `pnpm --filter @kiroween/skeleton db:check-reader`;
    - both servers stopped.
  - Results:
    - Home: 12 markers, 12 legends, 4 continent groups, hero first with high priority.
    - banshee, naddaha and baba-yaga: every anchor once, versions in file order, the theme on `<body>`; baba-yaga uses the base accent.
    - Open Graph: none without `PUBLIC_ORIGIN`; `og:image` and `og:url` from it when set.
    - Anchors: `/anchor/banshee--ch-3` and a version anchor give 307 to the right place.
    - 404s: unknown and malformed anchors and legend ids, and `/game`, `/game/` and `/game/legends/banshee`, each without a redirect.
    - Images: `/media` serves a canonical image and refuses `..`, `%2e%2e`, `.png` and a wrong folder.
    - All 25 steps PASS in both runs. `db:check-reader`: 32 of 32 yes.
  - The first run of the smoke script itself had an argument-parsing bug: with no `--og`, the base URL was skipped. It was fixed in the script, and nothing changed in the app.

### Phase 3 skills
Not used: agent-pilot, agent-orchestrator, agent-implementer, agent-superpowers, or any skill that starts sub-agents (impeccable's own reviewer sub-agents were replaced by an in-thread pass).
- **read-the-damn-docs**:
  - Neon roles: Console, API and MCP roles are `neon_superuser`; limited roles need SQL; `--access read_only` would include `runs`.
  - Natural Earth's terms (public domain) and its v5.1.2 data.
  - Fontsource packages: all OFL-1.1, with `swap` and `unicode-range`.
  - The router's own hash scrolling, and `trailingSlash`.
  - Start's default CSRF without `start.ts`.
- **ponytail**:
  - No map library (equirectangular by hand), no static-file library (one Vite plugin), no Markdown library (italics and dramatization marks only).
  - Polygon-hole logic removed once it could not change an answer.
  - Theme roles cut to the ones the pages use.
- **impeccable**: covered in Group F and Group G. The main finds: the hook colour, the eyebrow labels, Inter overuse, the `ch` measure in Crimson Pro, stragglers, 44 px targets, and the bidi fix for English inside right-to-left pages. Audit 17/20.
- **agent-design**: no loaded symbol among the motifs; nothing decorative drawn this phase; a note for the game's yuki-onna world.
- **agent-tester**: 50 mutations, all caught after five weak tests were strengthened. Shuffled rows for the equivalence test. A real-database equivalence check for all 12 legends (`db:check-reader`). Two smoke runs of 25 steps.
- **agent-guard / clean-code-guard**: see the final guard pass in `docs/phase-3-handover.md`. Earlier finds:
  - a catch-all in the media plugin narrowed to `AssetIdError`;
  - `pick` returning a failing colour, which now throws;
  - a made-up `versionsAnchor` fallback, removed;
  - a rest-spread that leaked columns into the view;
  - duplicated token rendering in two components, merged.
- **verify-and-stop**: final verification; results in `docs/phase-3-handover.md`.

## Phase 4 running log (game play)

### Spec
- `.kiro/specs/game-play/` (requirements, design, tasks).

### Group A (preflight, task 1.1): docs read on 2026-11-20
Details and status per page: `docs/phase-4-notes/docs-read.md`.
- **read-the-damn-docs**:
  - TanStack Start: server functions, middleware, CSRF (authentication server primitives). Only search summaries and the installed 1.169.5 types could be read; `tanstack.com` did not resolve.
  - Node `crypto`: `createCipheriv`, `createDecipheriv`, `setAAD`, `getAuthTag`, `setAuthTag` for AES-256-GCM (read). Find: pass `authTagLength: 16` on the decipher.
  - MDN: Pointer events, `setPointerCapture`, `lostpointercapture`, `touch-action` (search summaries only; `developer.mozilla.org` did not resolve).
  - Drizzle: migrations, `drizzle-kit generate`, `drizzle-kit migrate` (read). Find: the docs show a folder-per-migration layout, the installed `drizzle-kit` 0.31.11 writes flat files.
  - Neon: Drizzle migrations and Drizzle connection guides (search summaries only; `neon.com` did not resolve).

### Custom agent and hook (tasks 10.1 to 10.5)
Docs read on 2026-11-20 (`kiro.dev` custom-agents configuration reference, hooks, hook types). Details: `docs/phase-4-notes/kiro-docs.md`.

#### Custom agent: `game-balance-reviewer`
- **File:** `.kiro/agents/game-balance-reviewer.md`.
- **Format and why:** Markdown with YAML front matter (`name`, `description`, `tools`, `resources`, `permissions`, `welcomeMessage`); the body is the system prompt. This is the format the current Kiro docs give. Only current fields are used, not the CLI 2.x legacy ones (`allowedTools`, `toolsSettings`). No YAML package is a dependency, so each field is one `key: value` line with a JSON-style value (valid YAML). A test, `skeleton/test/balance-reviewer-agent.test.ts`, parses the file.
- **Permissions:** `tools: ["read", "write"]`. `fs_write` is allowed only for `docs/phase-4-notes/balance.md` and denied for everything else. `shell` and `web_fetch` are denied. The prompt also forbids editing `content/` and `assets/`, reading `.env`, and fixing findings. Resources: `fear.ts`, `fearTable.ts`, `fairness.md`, `docs/planning/01-decisions.md`.
- **What it reviews, per World:** puzzle difficulty, fear pacing against the `FEAR` constants, dead-end fairness.
- **How it was run:** the sub-agent tool cannot launch a custom agent file by name, so the review (task 10.4) adopted the agent's prompt and hard rules in the main thread. Shell was used only for a temporary probe test (300 generated and 20 played seeds per legend), deleted afterwards. Nothing in `content/`, `assets/` or the constants was changed. Record: `docs/phase-4-notes/decisions.md` (10.4).
- **Findings** (`docs/phase-4-notes/balance.md`, all twelve Worlds):
  - 300 of 300 seeds generated per legend with no `GeneratorError`; every contradiction anchor resolves.
  - Worst-case fear is 78 to 87 in every World, below `FEAR.max` (100). No constant needs to change.
  - `true-or-told` slots act as paid guesses (major, X-1); they are the slot named in the lost runs. Banshee, chupacabra, el-coco, naddaha, spring-heeled-jack and vetala have a worst severity of major; the other six, minor.
  - Notes and minor items: hotspot fear is rare (X-2), some contradictions list one anchor twice (X-3), no dead end points at a `--versions` anchor (X-4), three never-true leads are always offered (X-6).
  - Suggested fixes are advice for the content owner and were not applied.

#### Hook: physical CSS on save
- **File:** `.kiro/hooks/physical-css-check.json` (format `v1`, same shape as the two existing hooks).
- **Trigger and matcher:** `PostFileSave`; matcher `(^|/)(apps|skeleton)/.*\.(tsx|css)$`; timeout 30 s.
- **Script:** `node scripts/check-physical-css.mjs` (type shim `scripts/check-physical-css.d.mts`). It reports physical left/right CSS per `.kiro/steering/i18n-rtl.md`, edits nothing, exits 1 with findings on stderr and 0 when clean or out of scope.
- **Testing:** `apps/game/test/physical-css-hook.test.ts` covers a failing and a clean sample, and asserts every pattern's source appears in `apps/game/test/logical-css.test.ts` so the two lists cannot drift.
- **Why no existing hook covered it:** `.kiro/hooks/` held only `skeleton-tests.json` and `content-validate.json`; the rule existed only as steering text (`kiro-docs.md`). Record: `docs/phase-4-notes/decisions.md` (10.3).

### Phase 4 skills
Skills used in this thread only. None started sub-agents of its own.

- **read-the-damn-docs** (`docs/phase-4-notes/docs-read.md`, `kiro-docs.md`):
  - Network limits: `tanstack.com`, `developer.mozilla.org` and `neon.com` did not resolve. For TanStack Start (3 pages), MDN (4 pages) and Neon (2 pages) only search summaries and the installed package types were read, and that was reported as such. The Kiro docs (custom agents reference, hooks, hook types) and the Node `crypto` and Drizzle migration pages were read.
  - Finds: pass `authTagLength: 16` on the AES-GCM decipher (Node 26 refuses other tag lengths without it); the installed `drizzle-kit` 0.31.11 writes flat migration files, while the docs show a folder per migration; the current Kiro agent format is Markdown with YAML front matter and `permissions.rules`, not the CLI 2.x legacy fields; there was no existing physical-CSS hook.
- **ponytail**: not used in Phase 4. The Phase 4 notes record no ponytail pass, so nothing is claimed for it.
- **agent-security** (with agent-guard, `guard-2.20.md`, `guard-5.5.md`):
  - guard-2.20 (play core): `decode` threw a bare `0` in five places; it now uses one `reject()` helper with the fixed `PlayError('session')`. No answer leak, no client-controlled score or count, token checks complete. Residual risks recorded, not changed: a guest can replay an older token to retry a wrong answer; tutorial answers have no rate limit; unknown store errors must be mapped to `unavailable` by the server layer.
  - guard-5.5 (server layer): a validator that threw `notFound()` ran outside `safely()` and could send a framework message to the client (medium; fixed, the shape check now runs inside `safely()`). `getShell` was outside `safely()` and could expose an `EnvError` variable name (low; fixed). `serve-build.mjs` crashed on a handler rejection (low; now a fixed 500). Two source tests added. Residual: `serve-build.mjs` listens on all interfaces (local script), tutorial answers unthrottled, malformed JSON bodies are rejected by Start before our code.
- **impeccable** (`docs/phase-4-notes/impeccable-review.md`, task 9.13): the owner's brief said `agent-impeccable`; the catalog has no such name, so `impeccable` was loaded. Reviewer sub-agents off, mode Operate; its launcher and screenshot tools were not run, so this pass was a code and CSS read plus a contrast run over all 12 packs. Fixed in the game app: `MotionToggle` had no styles or 44 px target; short Hall links under 44 px; the focus ring clipped on the scene tabs; busy buttons flickered struck-through; `70vh` viewport overshoot (added `70dvh`). Polish items not fixed then: spring-heeled-jack glow on surface 2.8:1 (a skeleton `resolveTheme` change), start failure left "loading" forever (fixed later in 9.14), spirit panel text over the frame, CSS order of two spirit rules, ending dialog without Escape, reward slot copy. The items needing a real browser were passed to task 11.2, which then found the three bugs listed above.
- **agent-tester** (`mutations.md`, `tester-review.md`, tasks 11.3 and 11.4):
  - 11.3: 37 numbered hand mutations (plus 6b and 11b), each restored and compared byte for byte with a backup. Five were not caught at first: the token lifetime and fear constants (#15, #16, #17; pinned by new tests), a missing `.strict()` on the answer action (#19), and a tutorial Hint 2 anchor shown too early (#24). #11 (legend id removed from the AAD only) is equivalent, because the payload check covers it; removing both is caught (11b). No test was weakened.
  - 11.4: seven weak tests fixed. Layout negative cases asserted only "some problem"; loops over empty sets could pass (layouts, reader grants, fear table, four source scans); `WORLD_COUNT` was derived from the code under test; no test proved a Run needs no database or network (added an offline test). A requirement-to-test map is in the file. Final runs: skeleton 48 files, 701 passed, 8 expected fail; atlas 10 files, 161 passed; game 20 files, 256 passed.
- **agent-guard** (`guard-2.20.md`, `3.7`, `4.3`, `5.5`, `6.9`, `7.9`, `9.14`; clean-code, test and security lanes, no sub-agents):
  - 2.20: see agent-security above.
  - 3.7: a duplicated `guard` wrapper in `playStore.ts` (now imported); `getKeepersNote` filtered on nothing but `limit(1)` (now `id = 'keepers-note'`). Left alone: `keepers_note_details.ordinal` has no unique constraint (the migration was already applied).
  - 4.3: an atlas test imported a deep skeleton path; now a typed literal from `@kiroween/skeleton/client`.
  - 5.5: see agent-security above.
  - 6.9: merged duplicate PageUp/PageDown branches; one `MIN_TARGET_PX` constant for the repeated 44; a missing `FocusEvent` import.
  - 7.9: `getWorldInfo` sent unused story prose (`world.spirit`) to the browser (removed); hardcoded separators in Hall names (new catalog keys); focus not restored when panels closed and not taken by the restart notice and ending panel (new `lib/focus.ts`); duplicated code; new `client-boundary.test.ts` that fails if client code imports server modules or skeleton values.
  - 9.14: eleven copies of the sprite box helper merged into `squareSpriteBox`; duplicated region helper merged; a stale comment; the layout check never verified the sprite stays inside its tap box (check and mutation test added); two duplicate tests removed; a start failure showed "loading" forever (new `StartRetry` with a retry button).
- **verify-and-stop**: final check in task 11.7, run in one thread with no sub-agents. Typecheck, the three suites (skeleton 701 pass and 8 expected fail, atlas 161, game 256), `db:check-reader`, `db:check-models` and both builds all pass. `vercel.json` and `assets/` are unchanged, the secret scan passes and `GAME_TOKEN_KEY` is empty in `.env.example`. Known findings: 12 `content/legends` files edited by the owner, eight legends not winnable on every seed, and the first view missing the 3.0 s Slow 4G budget (hall 5.8 s, tutorial 4.9 s, Banshee 10.4 s). No lint script exists. Evidence table: `docs/phase-4-notes/verify.md`.
- **Not available or not used**: `agent-impeccable` is not in the catalog (replaced by `impeccable`). ponytail was not used. agent-pilot, agent-orchestrator, agent-implementer, agent-superpowers and any skill that starts its own sub-agents were not used, as in Phase 3.

### Phase 4 process notes
- Sub-agents ran one at a time. The `game-balance-reviewer` file could not be launched by name through the sub-agent tool, so its review (task 10.4) adopted the file's prompt and hard rules in the main thread.
- One Phase 1 generator change, owner-approved: Hint 2 now uses the anchor of the fact the Run chose, not the slot's authored anchor (requirement 5.7; Property 7 found that in about 60% of slot-instances the linked chapter did not contain the answer). Only `generate.ts` and `hints.ts` changed, plus the three test expectations listed in `docs/phase-4-notes/phase1-changes.md`.
- One owner-approved `db:import` on `dev-skeleton-core` for the owner's content rewrite of the twelve legends, run by the orchestrator. The boundary check (task 11.5) could not find it in the notes, which is why it is stated here.
- Migration `0003` and the Keeper's Note import were applied to `dev-skeleton-core` only.
- Secret handling: a boundary-check command (task 11.5) that did not exclude `.env` printed the local `GAME_TOKEN_KEY` line into a session log. The file is git-ignored and untracked, so nothing reached the repo. Recommend rotating the local `GAME_TOKEN_KEY` if that session log is stored anywhere shared. The value is not repeated here.

## Phase 5 running log (launch and polish), so far

Written at the end of Block A (task 9.2). The production database, deploy and production checks come later and get their own entries.

### Spec

- Spec `launch-and-polish` (requirements first): requirements, design and tasks, each approved by the Owner with changes. The Owner reordered the run after G1 (Block A, then one Owner stop), recorded in `docs/phase-5-notes/decisions.md`.
- Tasks ran one at a time in one thread. G1 ran in the main thread; from task 4.1 on, most tasks ran in a `spec-task-execution` sub-agent, one at a time and alone in the tree, with the same rules (no questions to the Owner, choices in `decisions.md`, git read-only, no `.env`, nothing under `content/` or `assets/`).
- Steering applied throughout: `tech`, `product`, `i18n-rtl` (logical CSS only, catalog strings only), `design`.

### Hooks

- The Phase 4 hooks stayed on (`physical-css-check`, `skeleton-tests`, `content-validate`). No hook was added.
- Kiro's command guard blocked `node --env-file=../../.env` (task 1.5). That matches the rule never to read `.env`; local page checks that need the database moved to the Owner's terminal (Deferred runs D1 to D4).

### Neon MCP

All production database work went through the Neon MCP server, 24 calls so far, each with its exact statement in `docs/phase-5-notes/decisions.md` (tasks 2.1, 2.3, 2.4, 2.6, 3.2):
- read: `list_projects`, `list_branches`, `list_postgres_databases`, `get_database_tables`, `list_postgres_roles`, `get_neon_auth_config`;
- schema and roles: `run_sql_transaction` once per migration file (0000 to 0003) and once for the six reader-role statements, `run_sql` for `CREATE ROLE atlas_web …` and the checks;
- auth: `provision_neon_auth`, `update_auth_plugins_organization` (off), `add_auth_trusted_domain` (both origins);
- smoke cleanup: `delete_auth_user` and `run_sql_transaction` deleting the temporary user's rows by exact id.
Never called: `get_connection_string`, `create_credential`, `reset_postgres_role_password`, `prepare_database_migration`. Content imports and the `atlas_web` password ran in the Owner's terminal, because they need a connection string the agent must not see.

### Powers

- Checked the Kiro docs on 2026-11-21 (`kiro.dev/docs/powers`). The registry lists a Neon power (alongside Datadog, Dynatrace, Figma, Netlify, Postman, Supabase, Stripe, Strands SDK and AWS Aurora); no Vercel power is listed.
- Neon power: not installed. The workspace already has the Neon MCP server configured in `.kiro/settings/mcp.json` (used since Phase 2), which provides the tools the production steps need. Installing the power would add a second copy of the same server for no new capability. Vercel: none fits; Vercel docs were read with `read-the-damn-docs` instead.

### Deploy findings (Vercel)

- The first deploy showed that Vercel serves Nitro's Build Output, whose own catch-all route came before the `vercel.json` rewrites and headers. Routing and headers moved into Nitro route rules (`skeleton/src/deploy/vercelRules.ts`), found by reading the installed Nitro Vercel preset source. A second deploy fixed a `/game/` redirect loop (the exact rule must target `/game/`).
- A dev-server report from the Owner led to a real bug: signed-in players' tutorial tokens were never kept, so the tutorial could not be finished in the page (fixed in the play client, with tests).

### Phase 5 skills (so far)

| Skill | What it found |
|---|---|
| read-the-damn-docs | Vercel: TanStack Start needs the Nitro Vite plugin; a production domain belongs to one project, so `/game` goes through an external rewrite; Standard Protection leaves production domains open; Vercel overwrites `x-forwarded-for` with the client IP. Nitro 3 is only a release candidate on npm. sharp 0.35.5 resize/webp. web.dev install criteria need no service worker. Kiro powers: Neon listed, no Vercel. All pages loaded. |
| ponytail | Kept each item small: two Vercel projects and rewrites, not Services; in-memory rate limit, not a firewall rule; one Book component with CSS columns; paper class only for one-page game panels; no service worker. |
| agent-security | G1: 4 scanner signals, all false positives. Open finding S1: what `x-forwarded-for` the game sees behind the atlas rewrite (checked after deploy; stop if shared). S2/S3 low, accepted. |
| agent-tester | Mutation checks for every new test (rows in `docs/phase-5-notes/mutations.md`); gaps found and closed in G1 (stream error reporting, `localhost` binding). A fresh build exposed a client-bundle leak from 1.9 (fixed). Browser-only behaviour listed for D2/D3/D4. |
| agent-guard | Removed unused re-exports (G1); flagged `heroSource` (test-only model) and the twin manifest builders (kept). |
| impeccable | Launcher ran (`context`, `detect`): only two false-positive `broken-image` warnings on the `<Img>` component. In-thread review found the dark-theme colours on paper (glow 2.1:1, muted 1.03:1), fixed by re-pointing them inside `.book-paper`; the spirit caption colour order bug was fixed in 8.3. |
| verify-and-stop | One proof pass per group; open items listed per group in `decisions.md`. |
| Not used | agent-pilot, agent-superpowers, agent-gamestudio (they start their own workflows). |

### Phase 5 close

- Neon MCP calls after task 9.2: the final smoke cleanup (`run_sql`, `delete_auth_user`, `run_sql_transaction`), `update_auth_allow_localhost` (off) and `get_neon_auth_config`, and the browser-check user cleanup (`run_sql` twice, `run_sql_transaction`, `delete_auth_user`). All with exact statements in `docs/phase-5-notes/decisions.md` and `smoke-production.md`.
- Production checks run from Kiro: the production smoke (every step passed, including the visitor-keyed rate limit behind the proxy) and the headless Chrome checks (keyboard only as guest and signed in, 390 px touch, reduced motion, the book view at 390 and 1280 px, Slow 4G timing).
- The browser checks found two faults in the Phase 4 check script on a shared origin (it closed its own game page; its default screenshot folder was under `docs/`), both fixed.
- Skills at the close: agent-tester (signed-in tutorial now covered end to end in a real page), agent-security (no new finding; localhost sign-in turned off), agent-guard (one helper for four copies of a condition), verify-and-stop (requirement-by-requirement proof, open items listed in `docs/phase-5-handover.md`). Summary: `docs/phase-5-handover.md`.

## Phase 6 (UI rework)

Written at task 10.1 from `docs/phase-6-notes/progress.md` and `decisions.md`. Only what those records show is stated. The final check (10.3) was run afterwards and is summarised in the verify-and-stop row below; the handover is `docs/phase-6-handover.md` (10.4).

### Kiro features used

- **Spec workflow**: `.kiro/specs/ui-rework/` (requirements, design, tasks), made in that order and approved before any code. The tasks file groups work into groups 1 to 10 with checkpoint tasks (1.10, 2.7, 3.9, 4.10, 6.17, 7.6, 8.8, 8.F6, 9.5) and a guard pass at the end of most groups.
- **Run-all orchestration**: tasks ran one at a time, in order, in one thread, with at most one sub-agent at a time. The orchestrator moved each task through queued, in progress and completed.
- **Owner-feedback loop**: `docs/phase-6-notes/owner-feedback.md` was read at each checkpoint. The Owner's review of the local after-screenshots produced four items, run as tasks 8.F1 to 8.F4, each recorded in `decisions.md` before the change:
  - F1 scene tabs cut off at 1280 (CSS only: wrapping row from 40rem, hidden scrollbar and end fade below it).
  - F2 hotspot glints not visible (CSS only: 9.4 px dot with rim and halo, static under reduced motion; before/after crops; core against adjacent rim measured at 13.48, 3.80 and 7.97, all at least 3).
  - F3 empty gaps in the scene dock (CSS only: compact dock, centred stage; 0 px shift measured after a tap).
  - F4 fear caption over the notebook at 390 (caption moved into the scene stage, `pointer-events: none`; four tests added).
  - After F1 to F4 the browser checks were re-run (8.F5) and the checkpoint repeated (8.F6). All four are marked done in the file.
  - A second round from the Owner (production check at 375 px and test gaps from verify-and-stop), run as tasks 10.F5 to 10.F8 and 10.F11 (task names kept although the spec validator flags them), each recorded in `decisions.md` before the change:
    - F5 atlas home hero stacks below 40rem (CSS only; image 16/9 first, copy on the page background; one test case, mutation-checked).
    - F6 atlas header on one row at 360 px and up (short "Play" label from a new catalog key, full accessible name kept; new `header-check.mjs`, 61 px at 360, 375, 390, 1280).
    - F7 Hint 1 hotspot marks (client state only, three tests, two mutations). Browser confirmation is blocked because no Banshee Hint 1 row names a hotspot id; an owner action.
    - F8 test gaps closed (fear text contrast pair D22, `.btn` 44 px, 2 px current-item marker, Hint 2 fallback link); six mutations caught and restored.
    - F9 images through the ImageKit CDN, done as task 10.F11 (10.F9 was the re-run task). `IMAGE_CDN_URL` is read on the server only; one owner-approved CSP `img-src` change; seven mutations caught. Banshee scene 1 went from 431134 B to 231262 B at 390 px (DPR 2) and 144958 B at 1280 px. Local Slow 4G off to on improved by 32% to 58% on a loaded machine; production is not yet measured with the CDN.
    - The F5 to F9 browser checks were re-run (10.F9, 10.F12, CDN off and on) and checkpoint 9.5 repeated: skeleton 913 + 8 expected fail, atlas 302, game 399. The handover and `verification.md` were updated in 10.F10.
- **Progress and decisions files**: `docs/phase-6-notes/progress.md` (last task, next task, blocked, open decisions) and `decisions.md` (each choice, the options considered, the reason), plus `browser-checks.md`, `mutations.md`, `screenshots-index.md`, `final-gates.md`, `mid-phase-status.md` and `content-and-assets-needed.md`.
- **Steering files**: the existing `.kiro/steering/` files were used as written. Rule recorded in `decisions.md`: where `design-direction.md` or the spec conflicts with steering, steering wins. Five conflicts were recorded and accepted by the Owner (display font, palette, paper ink values, map, scope of the direction).
- **Property-based testing (fast-check)**: new properties for the UI rework, among them contrast over the colour matrix (Properties 1 and 2), paper constants (3), Hall states (4), reply line (5), Hint 2 tab flow (6), hint area (7), hotspot markup (8) and fear text (9). The new tests were mutation-checked and each mutation file entry restored; see `mutations.md`.
- **Hooks**: the Phase 6 notes do not record a hook run, so none is claimed here.
- **Sub-agents**: the guard passes recorded in `decisions.md` say "no sub-agent". No Phase 6 sub-agent findings are recorded in the notes read for this entry.

### Skills and what each found

| Skill | What the records show |
|---|---|
| impeccable | Loaded in some tasks (4.8, 8.F1 to 8.F4). In task 3.7 the load was refused by the tool and the review was done by eye, and the refusal was not worked around. Where it loaded, its launcher (`impeccable context`) was never run because no download or launcher was allowed. Every design review in Phase 6 was therefore a judgement by eye against `design-direction.md` on screenshots, not a skill-driven audit. Findings made that way: at 390 the atlas header wrapped the Game link (fixed with tighter spacing, one row, nav height 60), and the hero copy over the bright book pages failed contrast (measured 1.01 to 1.11 at 390; a scrim brought the worst case to 11.55 or more). |
| read-the-damn-docs | Listed in `tasks.md` for group 1 (cascade layers before `@import`). `decisions.md` records no docs fetched and no finding for it in Phase 6, so it is not claimed as used. |
| ponytail | Listed in `tasks.md`. `decisions.md` records no skill load. The notes do show a "smallest change" choice with the options weighed (for example CSS-only fixes for F1 to F4), but that is not recorded as the skill, so it is not credited to it. |
| agent-tester | Not recorded as loaded. The test-guard lane in pass 4.9 names an "agent-tester standard" (behaviour, a failing-input case, no fake data), and task 8.1 re-ran mutation checks on ten items: each failed its test and each source was restored and compared with a pre-edit copy. No test needed strengthening. |
| agent-guard | Loaded for each guard pass, run by hand with no sub-agent. Findings: 1.9 fixed two comment claims that were ahead of the code, one redundant RTL selector and one needless test export. 2.6 found that removing the `--color-rule`, `--color-link` or `--color-ring` paper re-points is invisible to a contrast test (the dark fallbacks still pass); the declaration check in `book-foundations.test.ts` guards them, and a case for the other eight re-points was added. 3.8 found the hero scrim had no guard and added one test. 4.9 found nothing and edited nothing. 6.16 found the Hint 2 test copied the handler's lines; `applyHint2Reply` now backs both routes and the test. The drawer panel covering the hint buttons at 390 was accepted. 8.7 found the CSS-only fixes of 8.3 and 8.4 had no test and added three source-check test files. 9.4 changed no source: it added an owner note on what production guest play can write (by code reading only, the database was not queried) and relabelled the atlas home Slow 4G row as local before against production after, not like for like. |
| verify-and-stop | Ran in task 10.3, by hand, no sub-agent. Result in `docs/phase-6-notes/verification.md`: P1 criteria 73 met, 6 partly met, 0 not met (79); P2 criteria 59 met, 1 partly met, 1 not verifiable (61; 25.5, fear text contrast); cross-cutting requirements 16 met, 2 partly (Req 36, 39), 1 not met (Req 40, the handover, written in 10.4). Single test files re-run: skeleton 91, atlas 73, game 117 pass. Read-only git check `5fcb86b..HEAD`: no change under `content/`, `assets/`, the `vercel.json` files or the lockfile. Nothing was fixed; gaps are listed in the handover. The Req 39 gap (this entry saying pending) is closed by this update. |
| Not used | Skills that start their own workflows or sub-agents (agent-pilot, agent-superpowers, agent-orchestrator) are not recorded in Phase 6. |

Images are delivered through ImageKit (free plan) from our own originals (task 10.F11); the apps use their own `/media/` files when `IMAGE_CDN_URL` is unset.

## Phase 7 Batch A (UI fixes)
Spec: `.kiro/specs/phase-7-batch-a/` (requirements, design, tasks), approved before code. Handover: `docs/phase-7-batch-a-handover.md`.
- **Spec workflow**: tasks A1 to A7, then a Verify task and a handover task, run one at a time by the orchestrator.
- **Verify task**: `pnpm -r typecheck` clean; `pnpm -r test` green after five test pins were updated (skeleton 915 + 8 expected fail, atlas 302, game 400); browser check 303 passed, 0 failed, 2 skipped. 58 screenshots at four viewport sizes under `.debug/phase-7/`.
- **Found in verify**: an invalid media feature (`max-block-size`), fixed to `max-height`; the 667x375 world layout was built as two columns instead of the design's fallback.
- **Not claimed**: no sub-agents, hooks or skill loads are recorded in these notes. The restart and win overlays (R3) were not captured visually.
## Phase 7 Batch B (UI changes)
Spec: `.kiro/specs/phase-7-batch-b/` (requirements, design, tasks), made in that order and approved before code. Handover: `docs/phase-7-batch-b-handover.md`.
- **Spec workflow**: tasks B0 to B6, then one Verify task and a handover task, run one at a time by the orchestrator. The Owner added a game `RootError` (error view for a failed root load) to task 6.2.
- **Sub-agents**: each task B0 to B6 was executed by a spec task execution sub-agent.
- **Verify task**: first run found old-layout test pins, one check-script selector and a Chapters control below the fold at 390x844. A fix pass followed (hint banner made sticky, Banshee one-page height, atlas home list). Final: `pnpm -r typecheck` clean; skeleton 915 (+8 expected fail), atlas 305, game 401; browser check 303 passed, 0 failed, 2 skipped. 88 screenshots at four sizes under `.debug/phase-7b/`.
- **Tests**: only two new unit tests (`win-screen.test.tsx`, `hint-marker.test.ts`); existing pins were updated for new layout and copy.
- **Not claimed**: no hooks or skill loads are recorded in these notes. Open items (signed-in Hall screenshot, RTL and popover keyboard checks) are listed in the handover.
## Shell phase 1 (True card)
Spec: `.kiro/specs/shell-1-holo-card/` (requirements, design, tasks). Handover: `docs/shell-1-handover.md`.
- **Spec workflow**: tasks 1 to 8 built the card; task 9 (Verify) was run by a spec task execution sub-agent.
- **Verify task**: `pnpm -r typecheck` clean; `pnpm -r test` green (skeleton 916 + 8 expected fail, atlas 305, game 401). One fix: the `/lab/card` size rule sat in `@layer components` and lost to the card's own `ui` layer rule, so the card was 1120 px wide at 1280x800; moved to `@layer ui`. Throwaway Playwright script and 50 screenshots and 2 videos under `.debug/shell-1/`.
- **Numbers**: 60 fps on a real GPU at both sizes and 4x CPU throttle; software GL misses the target. Lazy chunk 4.5 KB gzip. Image budgets need a CDN deployment to judge.
- **Not claimed**: no hooks or skill loads are recorded in these notes. No tests were written.
## Shell phase 2 (entry page)
Spec: `.kiro/specs/shell-2-entry-page/` (requirements, design, tasks). Handover: `docs/shell-2-handover.md`.
- **Spec workflow**: tasks 1 to 8 built two `HoloCard` fixes, the pair props, the Preview, the strings, the hidden route `/lab/shell` and its styles; task 9 (Verify) was run by a spec task execution sub-agent.
- **Verify task**: `pnpm -r typecheck` found one error from task 3 (`sweepDelayMs` under `exactOptionalPropertyTypes`), fixed; the atlas typecheck also needed the route tree regenerated by the build. `pnpm -r test` green (skeleton 916 + 8 expected fail, atlas 305, game 401). Two page-spacing fixes (Hint height outside the card height budget; tagline width). Throwaway Playwright scripts, screenshots and 2 videos under `.debug/shell-2/`. The CDN was simulated by a local stand-in (sharp resizing behind a route), not the real ImageKit.
- **Found in verify**: the blurred Preview is requested later than the layer images and arrives last on a slow link, so a card is a flat dark box until its background arrives. Not fixed (needs a markup change).
- **Not claimed**: no hooks or skill loads are recorded in these notes. No tests were written.
## Shell phase 3 (entry live)
Spec: `.kiro/specs/shell-3-entry-live/` (requirements, design, tasks). Handover: `docs/shell-3-handover.md`.
- **Spec workflow**: tasks 1 to 11 moved the entry page to `/`, the old home to `/legends`, and fixed the Preview and Cartouche word; task 12 (Verify) was run by a spec task execution sub-agent.
- **Verify task**: typecheck clean after the build regenerated the route tree. One test failure from this change (a duplicate focus-ring rule), fixed. Atlas 305 and game 401 pass; skeleton passed except that one file, re-run alone. The browser checks and screenshots did not run because the atlas needs a database variable that was not in the shell.
- **Not claimed**: no hooks or skill loads are recorded in these notes. No tests were written.
- **Verify, browser half**: run in a follow-up session. DB variables were loaded into the shell only (never printed or written). Built both apps, served them behind a throwaway proxy that forwards `/game/**`, ran the book check (303 passed after fixing its legend-list URL to `/legends`), a throwaway Playwright script under `.debug/shell-3/`, tuned the Cartouche hide threshold from measures, and re-ran the full skeleton suite (916 passed + 8 expected fail) and typecheck. The CDN was again a local stand-in.
## Batch C (discover)
Spec: `.kiro/specs/batch-c-discover/` (requirements, design, tasks). Handover: `docs/batch-c-handover.md`.
- **Spec workflow**: tasks 1 to 10 changed the strings, a shared `shareTags()`, `HoloCard` back-face click, the legend card grid, favicon and share image scripts, sitemap and robots routes, heads and old test pins; task 11 (Verify) was run by a spec task execution sub-agent.
- **Verify task**: typecheck clean; skeleton 916 (+8 expected fail), atlas 305, game 401; browser check 303 passed, 0 failed, 2 skipped. The first test run found two old pins in `image-cdn.test.tsx` that task 10 missed; fixed. Throwaway Playwright script, results and screenshots under `.debug/batch-c/`. `.env` was loaded into the shell only, never printed. The CDN was a local stand-in.
- **Not claimed**: no hooks or skill loads are recorded in these notes. No new tests were written.
## Batch D (polish)
Spec: `.kiro/specs/batch-d-polish/` (requirements, design, tasks). Handover: `docs/batch-d-handover.md`.
- **Spec workflow**: tasks 1 to 11 made ten presentation fixes (D1 to D10), one task per file group; task 12 (Verify) ran the checks and wrote the handover.
- **Verify task**: typecheck clean; skeleton 916 (+8 expected fail), atlas 305, game 401; atlas book check 303 passed, 0 failed, 2 skipped. One old pin updated (`image-cdn.test.tsx`). Verify found nested links in the Sources list (a source code inside an external link) and fixed them.
- **Not claimed**: the win overlay was not reached in a browser, so the Ending was not checked visually. No hooks or skill loads are recorded in these notes. No new tests were written.
## Batch E (feel)
Spec: `.kiro/specs/batch-e-feel/` (requirements, design, tasks). Handover: `docs/batch-e-handover.md`.
- **Spec workflow**: five changes to copy, CSS and one small route, one task per file group; the Verify task ran the checks and wrote the handover. They are the names line on the entry page ("Told is the atlas. True is the game."), the shared line with a link to the engine in the Hall and the atlas footer, three fear looks (cold, fog, dim; chosen by `fearLookOf` with no RNG and no clock), a paper-like turn shade on the book, and `/llms.txt` on the atlas.
- **Verify task**: typecheck clean; skeleton 916 (+8 expected fail), atlas 306, game 401. Verify fixed the Hall link target size (`min-h-11`) and one selector in the game browser check. The game browser check still has 4 failures, not confirmed as pre-existing; the atlas book check hung once after 288 passes (the one scenario run alone passed).
- **Not claimed**: no hooks or skill loads are recorded in these notes. One new test was written (`apps/atlas/test/llms.test.ts`). The game rules, scoring, fear amounts, generator, `content/`, `assets/` and database were not touched.
## Brand logo
Spec: `.kiro/specs/brand-logo/` (requirements, design, tasks). Handover: `docs/brand-logo-handover.md`.
- **Spec workflow**: tasks replaced the atlas and game icons, added the brand masters under `docs/brand/`, and put the logo in both headers (atlas wordmark image, game small gold icon); the last task wrote the handover.
- **Verify**: typecheck clean; skeleton 916 (+8 expected fail), atlas 306, game 401. Header height is 56px after (measured, both apps, both sizes). Game browser check: 35 passed, 2 failed (last run 23/4, not like-for-like). Two stale checks were fixed in `apps/game/scripts/browser-check.mjs`; the two remaining failures look like out-of-date checks (Hall scene height, reduced motion), not confirmed. Screenshots under `.debug/brand-logo/`, only some viewed.
- **Not claimed**: no hooks or skill loads are recorded in these notes. The staged Batch E work is mixed into the index with these edits, so stage selectively. No commits or pushes.
## Content pass
Spec: `.kiro/specs/content-pass/` (requirements, design, tasks). Handover: `docs/content-pass-handover.md`.
- **Spec workflow**: tasks edited `content/legends/*.md` only: puzzle-slot sentences in eight legends so the atlas-only player no longer pays wrong answers, and prose patterns removed in all twelve. One test edit: `KNOWN_CONTENT_FINDINGS` emptied.
- **Verify**: audit zeros, typecheck clean; skeleton 924, atlas 306, game 401. Fairness 12 of 12 legends win 40 of 40 seeds (before: eight legends between 31 and 39). Dev import done (12 legends, 83 chapters, 60 slots); production import left to the owner.
- **Not claimed**: no hooks or skill loads are recorded in these notes. Seven slots in five legends still cost a wrong answer; added sentences were not re-read against sources. No commits or pushes.
## Final polish
Spec: `.kiro/specs/final-polish/` (requirements, design, tasks). Handover: `docs/final-polish-handover.md`.
- **Spec workflow**: one content line (`[Dramatization]` at the start of the yuki-onna cold open), one fairness template branch on `KNOWN_CONTENT_FINDINGS` (text only), and two stale checks in `apps/game/scripts/browser-check.mjs` (Hall scene height, reduced motion). The app and CSS were right and were not touched.
- **Verify**: typecheck clean; skeleton 924, atlas 306, game 401; audit zeros; game browser check (keyboard, touch, motion) 37 passed, 0 failed. Fairness doc regenerated, 20 of 20. Dev import done (12 legends, 83 chapters, 423 facts, 198 hotspots); production import left to the owner. Ports 3500 and 3501 are free.
- **Not claimed**: no hooks or skill loads are recorded in these notes. The layout browser group was not run, `html[data-motion='reduce']` was not checked in a browser, and the Hall measurement used the existing dist build. No commits or pushes.
