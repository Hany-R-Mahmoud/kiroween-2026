# Kiro usage log

Factual record of how Kiro features were used in Phase 0 and Phase 1. It feeds the final write-up. The sections after "Skills" are the running log written while the work was done.

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
