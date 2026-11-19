# Tasks: skeleton-core

Requirements: `requirements.md`. Design: `design.md`. Order matters: each group ends with a checkpoint.

## Working rules (apply to every task)

- Skills (R10): **read-the-damn-docs** before any Drizzle, drizzle-kit, pg, Neon, Vitest or fast-check API (read current official docs, note the page in `docs/kiro-usage.md`); **ponytail** on every module (smallest code that meets the requirement, no speculative options, `shortcut:` comment for known limits); **agent-tester** on every test file; **agent-security** on db, env and import code; **agent-guard** at the end of each group; **verify-and-stop** in the last task.
- Skills never override the spec, steering files or the owner's prompt. On conflict, follow the spec and tell the owner. If a skill cannot be loaded, say so and continue.
- Do not use agent-pilot, agent-superpowers or any skill that starts sub-agents or its own workflow.
- Never edit `content/` or `assets/`. Never print, log or write a connection string. Do not commit or push. Do not start Phase 2.
- Log what each skill found in a running list; Task 19 writes it to `docs/kiro-usage.md`.

---

## Group A: toolchain (R1)

- [x] 1. Install and pin the toolchain
  - [x] 1.1 Read the current docs for Vitest, fast-check, Drizzle (0.45 line) and `pg`; confirm install commands and config shape for the pinned majors.
  - [x] 1.2 Add exact pins from design section 1 to `skeleton/package.json` (typescript 6.0.3, vitest 5.1.1, vite 8.3.8, fast-check 4.10.3, zod 4.6.7, drizzle-orm 0.45.4, drizzle-kit 0.31.11, pg and @types/pg 8.23.1, tsx 4.23.15, dotenv 18.0.10, @types/node on the 22+ line). Run `pnpm install` once from the root. Keep `pnpm@9.15.9`.
  - [x] 1.3 Add `skeleton/tsconfig.json` (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `module NodeNext`, `target ES2023`) and `skeleton/vitest.config.ts`. Add `test`, `typecheck`, `import`, `audit`, `db:generate`, `db:migrate` scripts to `skeleton/package.json`. Give both apps a `test` script that exits 0 with no tests.
  - [x] 1.4 Add `DATABASE_URL_UNPOOLED=` (no value) to `.env.example`.
  - [x] 1.5 (dropped by owner: TypeScript 6.0.3 is decided, no TS 7 trial.)
  - [x] 1.6 Update `docs/tech-decisions.md`: every pin with its reason, `pg` vs Neon HTTP driver, stable Drizzle 0.45 line (not `@rc`, owner decision), the two connection-string variables.
  - _Requirements: R1.1 to R1.4, R3.8_
- [x] 2. Group A checkpoint
  - `pnpm -r test` exits 0 with no tests, `pnpm --filter @kiroween/skeleton typecheck` passes, `git status` shows no `.env`.
  - Run the **agent-guard** pass on the config and docs changes.

## Group B: model and parser (R2)

- [x] 3. Content model
  - [x] 3.1 `model/schema.ts`: zod schemas and inferred types for everything in design 3.1, including `anchors`, `Slot.isFinal`, `Lead.canBeTrueFor: string[] | 'never'`, `Link` union. `model/ids.ts`: `namespace(legendId, id)` helper.
  - [x] 3.2 `parser/errors.ts`: `ParseError { file, section, line, message }`.
  - _Requirements: R2.1, R2.4, R2.5_
- [x] 4. Parser core
  - [x] 4.1 `markdown.ts`: split into sections 0 to 11; split section 7 on the heading variants (`### Hotspots` and `**Hotspots**`, same for Setting, Scenes, Spirit encounter, Puzzles, Breaking the curse, Fear events, Hints); one `readTable()` that reads columns by header name and keeps line numbers.
  - [x] 4.2 Sections 0 to 4 and 8 to 11: meta (including `map_point`), cold open, chapters (anchor, sources, hook, text), versions table and paragraphs, documented/told table, theme pack, assets, sources.
  - [x] 4.3 Derive the deep-link target set (chapters, `<id>--versions`, `<id>--versions--<v>`); report any section-3 `anchor:` line outside it.
  - [x] 4.4 Section 5 and 6: facts (`[D]`/`[R]`, `all`, wrong answers on `;`, types on `,`) and leads, with the "can be true when" rule from R2.8 (check "never" first, then `v-<id>` must exist in the versions table).
  - [x] 4.5 Section 7: scenes, hotspots (role, swappable from the cell or from the "Swappable hotspots" / "Permanent decoys" sentences, links to facts and lead steps, "false trail" kept as text), spirit, slots (first token is the id; "(final)" sets `isFinal`), final puzzle, fear events, hints (Hint 1 highlight ids must exist; Hint 2 must be a deep-link target; a hint row with no slot attaches to the final puzzle).
  - [x] 4.6 `parseLegend.ts`: assemble, run zod, run the cross-checks from design 3.2, namespace all IDs, collect all errors. `loadLegends.ts`: read `content/legends/*.md` read-only.
  - _Requirements: R2.2 to R2.8_
- [x] 5. Parser tests (plain unit tests)
  - [x] 5.1 `banshee` (`### Hotspots` form, final slot `pz-5`): counts, namespaced ids, link parsing, swappable detection, hint anchors, final slot flagged.
  - [x] 5.2 `draugr` (`**Hotspots**` form, `p-1 label` slot ids): same checks.
  - [x] 5.3 A `flying-dutchman` check that the bare `--versions` Hint 2 parses without error and `pz-final` hints attach to the final puzzle.
  - [x] 5.4 Negative cases on modified copies of the text: missing chapter anchor, unknown puzzle type, unknown version in "can be true when", a `never` line that also names a version (stays `never`), hint highlight to a missing hotspot, an anchor outside the valid set. Each yields a located error.
  - [x] 5.5 Run **agent-tester** checks on this file: each test fails when its rule is broken, none asserts a value copied from the parser's own output.
  - _Requirements: R2.2 to R2.8, R6.3_
- [x] 6. Group B checkpoint
  - All twelve legends parse with no errors (report counts per legend). Fix parser bugs, never the content. If a legend needs a format the design does not cover, tell the owner and ask.
  - **agent-guard** pass on code and tests of Group B.

## Group C: randomness and audit (R4, R5.10)

- [x] 7. Seeded RNG
  - [x] 7.1 `rng/rng.ts` with xmur3 + sfc32, `next`, `int`, `pick`, `shuffle`, `sample`, `fork`.
  - [x] 7.2 `rng.test.ts`: same seed same sequence; different seeds differ; `sample` has no repeats and the right length; `int` stays in range; `fork` streams do not depend on call order; a static test that fails if `Math.random` or `Date.now` appears under `skeleton/src`.
  - _Requirements: R4.1 to R4.4_
- [x] 8. Content audit
  - [x] 8.1 `generator/normalise.ts` (NFD, strip marks, lowercase, strip `*` and `_`, punctuation to space, collapse, trailing `s` on words over three letters).
  - [x] 8.2 `generator/audit.ts`: per fact and puzzle type, is the answer in the linked text (chapter text, the version paragraph, or the whole versions section for `<id>--versions`). `true-or-told` and `ritual-order` are exempt. Also list facts with no hotspot link and slots with no usable candidate.
  - [x] 8.3 `scripts/audit.ts` writes `docs/content-gaps.md` (legend, fact id, type, reason; slots with no usable candidate). Bare `--versions` anchors are not gaps.
  - [x] 8.4 `audit.test.ts` on a small hand-made fixture with one known gap and one known pass.
  - _Requirements: R5.10, R5.11, R5.13_
- [x] 9. Group C checkpoint
  - Run the audit on all twelve legends and **report the counts to the owner in chat** (excluded facts per legend, any slot with zero usable candidates). Do not loosen the rule and do not edit legends. Continue to Group D regardless; legends with empty slots are handled by Task 13.
  - **agent-guard** pass on Group C.

## Group D: generator (R5)

- [x] 10. Generator modules
  - [x] 10.1 `versions.ts`: candidate versions, true version, true lead, dead-end chains with contradiction fact and anchor checks (R5.5, R5.6).
  - [x] 10.2 `options.ts` and `slots.ts`: qualifying-fact filter (a to g in design 5.3), pick one, exactly three wrong answers, four distinct options by normalised form, `correctIndex`, typed `GeneratorError`s. Final-flagged slots go through the same path (R5.15).
  - [x] 10.3 `swaps.ts`: valid pairs (both swappable, same scene, different roles), seed-chosen count from 0 to the number of valid pairs, link takeover, skip when a need would be lost, decoy-count invariant (R5.7, R5.8).
  - [x] 10.4 `hints.ts`: Hint 1 with highlights remapped through swaps; Hint 2 anchors validated against the deep-link set, bare `--versions` optionally refined to the true version (R5.12).
  - [x] 10.5 `generate.ts`: assemble the `Run` (design 5.7) using one forked RNG stream per decision; carry `finalPuzzle` text; export from `index.ts`.
  - _Requirements: R5.1 to R5.9, R5.12 to R5.15_
- [x] 11. Group D checkpoint
  - Quick manual run of `generate` for 3 seeds on `banshee` and `jersey-devil`, output reviewed for shape.
  - **agent-guard** pass on Group D.

## Group E: property tests (R6)

- [x] 12. Test helpers and properties
  - [x] 12.1 `test/helpers/legends.ts`: parse and audit all twelve once.
  - [x] 12.2 One feasibility test per legend (a fixed seed set generates without error). Failures stay failing and loud; no skip, no `todo`, no loosened rule.
  - [x] 12.3 `generator.property.test.ts`: the eleven properties in design section 7, each with `numRuns: 100` per legend, seeds from `fc.string()` and `fc.uuid()`. Includes the final-flagged slot (banshee `pz-5`) in every slot property.
  - [x] 12.4 Run **agent-tester**'s checks on these tests: for each property, break the matching rule on purpose in a copy of a run (wrong option count, `[R]` fact in `true-or-told`, missing meaningful hotspot, bad anchor) and confirm the property fails; remove any property that only mirrors the implementation.
  - _Requirements: R5 (all), R6.1 to R6.5_
- [x] 13. Group E checkpoint
  - `pnpm -r test` result recorded (properties, legends, runs per property, pass or fail per legend).
  - `pnpm -r test` must pass with no `.env` present and no network (R6.5): run it with `.env` moved aside in a way that is restored afterwards (for example by running with `env -i` and a copy of the repo state, never by deleting or printing `.env`). Tests never read `DATABASE_URL`.
  - For any legend that fails feasibility because a slot has no qualifying fact: confirm it is listed in `docs/content-gaps.md`, and keep it for the handover. Do not edit the legend and do not loosen a rule.
  - **agent-guard** pass on Group E.

## Group F: hook (R7)

- [x] 14. Test hook
  - [x] 14.1 Create `.kiro/hooks/skeleton-tests.kiro.hook`: `fileEdited` on `skeleton/src/**/*.ts`. Check the Kiro hooks docs for a run-command action. If it exists, use it to run `pnpm --filter @kiroween/skeleton test` directly, so a save starts no agent turn. If only `askAgent` exists, use `askAgent` (run the command, report failing tests by file and name, edit nothing) and say so in `docs/kiro-usage.md`.
  - [x] 14.2 Validate the JSON and the pattern against the existing hook.
  - _Requirements: R7.1, R7.2_

## Group G: database (R3). Needs the owner.

- [x] 15. Schema and migrations (no database needed yet)
  - [x] 15.1 Read the Drizzle 0.45 docs for `pgTable`, `pgEnum`, relations, `drizzle-kit generate`, `migrate` and `db.transaction` (read-the-damn-docs).
  - [x] 15.2 `db/schema.ts` with the tables in design 6.1 (anchor kinds: chapter, versions, version), `drizzle.config.ts` reading `DATABASE_URL_UNPOOLED` only.
  - [x] 15.3 `pnpm db:generate` creates SQL in `skeleton/drizzle/`. Review the SQL for the cascade deletes and enums.
  - [x] 15.4 Write `db/import.ts` and `scripts/import.ts` per design 6.3: env check by variable name only, parse first and import nothing on any error, one transaction per legend (delete then insert), parameterized builders only, errors reduced to legend id and table name, per-table row counts.
  - [x] 15.5 Unit-test what needs no database: the statement plan for one legend is identical on two runs, and the error path never includes the env value.
  - [x] 15.6 Run **agent-security** on `drizzle.config.ts`, `db/*`, `scripts/import.ts` and env loading: secrets never logged or echoed, parameterized queries only, no string-built SQL, `.env` ignored, `pg` error objects never printed. Fix findings.
  - _Requirements: R3.1, R3.2, R3.5 to R3.7_
- [x] 16. Neon branch and **owner stop**
  - [x] 16.1 Use the Neon MCP server to list projects and create the branch `dev-skeleton-core` on the owner's project. Confirm the project with the owner first if more than one exists. Never read a connection string into the chat.
  - [x] 16.2 **STOP.** Tell the owner: the branch exists; paste the **pooled** string of `dev-skeleton-core` into `DATABASE_URL` and the **direct (unpooled)** string into `DATABASE_URL_UNPOOLED` in `.env`, in the editor, and say "done". Do nothing database-related until then.
  - _Requirements: R3.3, R3.9_
- [x] 17. Apply and import
  - [x] 17.1 `pnpm db:migrate` against the branch.
  - [x] 17.2 Verify the schema through the Neon MCP (`describe_table_schema` or `run_sql` on the branch only).
  - [x] 17.3 `pnpm db:import` for all twelve legends; record rows per table.
  - [x] 17.4 Run the import a second time; compare counts through the MCP; they must be identical (R3.4).
  - [x] 17.5 Prove R3.5 on the `dev-skeleton-core` branch only: through a test-only code path, inject a failure after the delete step inside the real per-legend transaction, then confirm that legend's row counts are unchanged. No scratch tables, no schema changes, nothing left behind. The injection hook is not reachable from the normal import entry point.
  - _Requirements: R3.3 to R3.5_
- [x] 18. Group G checkpoint
  - `git status` shows no `.env` and a scan of the repo for the strings `postgres://`, `postgresql://` and `neon.tech` finds none outside docs that quote the pattern generically.
  - **agent-guard** pass on Group G.

## Group H: docs, gate and handover (R8, R9, R10)

- [x] 19. Docs
  - [x] 19.1 `docs/kiro-usage.md`: entries for Phase 0 and Phase 1 (spec, steering, hooks, MCP, property tests, with what each did) and the skills list with what each found (R8.2). If a skill was unavailable, say so.
  - [x] 19.2 Finalise `docs/content-gaps.md` and `docs/tech-decisions.md`.
  - _Requirements: R8.1, R8.2_
- [x] 20. Final guard pass and verification
  - [x] 20.1 **agent-guard** pass over the whole Phase 1 diff, grouped by code, tests, docs. Fix findings that are inside this spec's scope; list the rest.
  - [x] 20.2 **verify-and-stop**: run once, in this order, and record exact results: `pnpm install --frozen-lockfile`, `pnpm --filter @kiroween/skeleton typecheck`, `pnpm -r test` (also once with no `.env` present, R6.5), the content hook script on all legends (`pnpm check:content`), the two-run import count comparison (reuse 17.4 if the code is unchanged since), the repo scan from 18. Report pass, fail, unavailable or blocked for each. Stop when the acceptance proof is complete; no extra polish.
  - _Requirements: R10.4_
- [x] 21. Handover
  - Write `docs/phase-1-handover.md` per R9.1: files and folders created; versions pinned and why; schema (tables and key columns); Neon branch name; import rows per table; test results (properties, legends, runs per property, pass or fail per legend); content-gaps summary including any legend that fails feasibility; skills used and findings; items needing owner action.
  - Do not commit or push. Stop and wait. Do not start Phase 2.
  - _Requirements: R9.1, R9.2_
