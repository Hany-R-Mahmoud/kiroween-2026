# Phase 1 handover: skeleton core

Nothing is committed or pushed. Phase 2 has not been started.

## Status at a glance

| Area | Result |
|---|---|
| Parser | All twelve legends parse with no errors |
| Generator | Works and is proved on a hand-made fixture. Real legends generate only where their content allows it (see gaps below) |
| Database | Schema migrated and all twelve legends imported on branch `dev-skeleton-core`; import repeated three times with identical counts; rollback proved |
| Tests | 308 total: 284 pass, 24 fail. All 24 are per-legend content-feasibility tests (expected until content is fixed) |
| `pnpm -r test` | Exits 1 while those 24 are red. Your Phase 1 checklist item "`pnpm -r test` passes" cannot be ticked until the content gaps below are fixed |
| Secrets | No connection string or credential in any file (scanned against the real values in `.env`) |

## Files and folders

Created:

- `.kiro/specs/skeleton-core/` : `requirements.md`, `design.md` (with section 11, the changes made during implementation), `tasks.md`
- `.kiro/hooks/skeleton-tests.json` (command action, runs the skeleton tests on save), `.kiro/hooks/content-validate.json` (the Phase 0 hook in the current format)
- `skeleton/`: `package.json`, `tsconfig.json`, `vitest.config.ts`, `drizzle.config.ts`
  - `src/model/schema.ts` (legend model, zod)
  - `src/parser/` (`parseLegend.ts`, `facts.ts`, `world.ts`, `ctx.ts`, `refs.ts`, `markdown.ts`, `loadLegends.ts`)
  - `src/rng/rng.ts`
  - `src/generator/` (`generate.ts`, `versions.ts`, `slots.ts`, `options.ts`, `swaps.ts`, `hints.ts`, `normalise.ts`, `audit.ts`, `coverage.ts`, `errors.ts`)
  - `src/db/` (`schema.ts`, `plan.ts`, `import.ts`, `client.ts`)
  - `src/index.ts`
  - `scripts/` (`audit.ts`, `import.ts`, `prove-rollback.ts`, `env.ts`, `tables.ts`)
  - `drizzle/0000_curious_bishop.sql` plus `drizzle/meta/`
  - `test/` (8 test files and `helpers/fixture.ts`, `helpers/legends.ts`, `helpers/properties.ts`)
- `pnpm-lock.yaml`
- `docs/content-gaps.md`, `docs/kiro-usage.md`, `docs/phase-1-handover.md`

Changed:

- `docs/tech-decisions.md` (pins, reasons, scripts, database notes, hooks), `.env.example` (adds `DATABASE_URL_UNPOOLED`), `LICENSE` (your name), `apps/game/package.json` and `apps/atlas/package.json` (a placeholder `test` script)

Removed:

- `.kiro/hooks/content-validate.kiro.hook` (the old format, replaced by `content-validate.json`)

Not mine: `docs/planning/02-work-plan.md` and `docs/planning/07-kiro-phase-1.md` are yours and are left as they were. `content/` and `assets/` were never touched (a test checks the legend files' hash before and after parsing).

## Versions pinned

All exact, locked by `pnpm-lock.yaml`. Reasons are in `docs/tech-decisions.md`.

| Package | Version | Why, in one line |
|---|---|---|
| pnpm | 9.15.9 | your decision |
| typescript | 6.0.3 | your decision (TS 7 is new; Vite, Vitest and TanStack Start publish no supported range for it) |
| vitest / vite | 5.1.1 / 8.3.8 | current; TanStack Start needs Vite 8 |
| fast-check | 4.10.3 | property tests |
| zod | 4.6.7 | runtime schema |
| drizzle-orm / drizzle-kit | 0.45.4 / 0.31.11 | your decision: stable line, not `@rc` |
| pg, @types/pg | 8.23.1 | the import needs a real transaction |
| tsx, dotenv, @types/node | 4.23.15, 18.0.10, 24.19.2 | scripts, env loading, Node 24 types |

## Schema (14 tables, 4 enums, 20 foreign keys, all `ON DELETE cascade` from `legends`)

| Table | Key columns |
|---|---|
| `legends` | `id` (pk); title, region, map_lat/lng, scare_level, cold_open, setting, spirit, `theme` jsonb, `final_puzzle` jsonb, `content_hash` |
| `anchors` | `anchor` (pk), `legend_id`, `kind` (chapter, versions, version), `ref_id` |
| `chapters` | `id`, `legend_id`, `ordinal`, `anchor` (unique, fk), `body`, `hook`, `source_ids[]` |
| `versions` | `id`, `legend_id`, `anchor` (unique, fk), `claim`, `conflicts`, `paragraph` |
| `documented_told` | `id` (serial), `legend_id`, `ordinal`, `documented`, `told` |
| `facts` | `id`, `legend_id`, `anchor` (fk), `version_id` (fk, null = all), `confidence`, `answer`, `wrong_answers[]`, `difficulty` |
| `fact_puzzle_types` | (`fact_id`, `puzzle_type`) pk |
| `leads` | `id`, `legend_id`, `starts_from` (fk), `steps[]`, `dead_end`, `contradiction_fact_ids[]`, `contradiction_anchors[]`, `true_for[]`, `never_true` |
| `scenes` | `id`, `legend_id`, `ordinal`, `name`, `description` |
| `hotspots` | `id`, `legend_id`, `scene_id` (fk), `role`, `swappable`, `links` jsonb, `on_tap` |
| `puzzle_slots` | `id`, `legend_id`, `puzzle_type`, `is_final`, `candidate_fact_ids[]`, `hint1_text`, `hint1_highlights[]`, `hint2_anchor` (fk) |
| `fear_events` | `id`, `legend_id`, `description`, `reduced_motion` |
| `assets` | (`legend_id`, `id`) pk, `usage`, `size`, `prompt`, `must_avoid` |
| `sources` | (`legend_id`, `id`) pk, `title`, `author`, `year`, `url`, `public_domain` |

Ids are namespaced `<legend-id>:<raw id>` (for example `banshee:f07`). Contradictions and "true for" lists are arrays because a lead can name several facts, anchors and versions.

## Neon

- Project `kiroween-2026` (`restless-silence-44986466`), branch `dev-skeleton-core` (`br-blue-breeze-arxdc1lo`), created from the default branch `br-delicate-brook-art2crov`.
- The migration and every import ran on the dev branch only. The default branch has no tables.
- Your first two `.env` pastes pointed at the default branch; I caught that by comparing endpoints through the MCP and ran nothing until the strings were fixed. In the final fix I renamed one key in `.env` (the direct string was named `DATABASE_URL`, now `DATABASE_URL_UNPOOLED`); no value was read out or changed.

## Import result (checked in the database through the MCP, not only by the script)

Rows per table, all twelve legends: `legends` 12, `anchors` 147, `chapters` 83, `versions` 52, `documented_told` 99, `facts` 420, `fact_puzzle_types` 447, `leads` 52, `scenes` 36, `hotspots` 198, `puzzle_slots` 60, `fear_events` 60, `assets` 412, `sources` 139.

- Three imports in a row gave identical counts (idempotent).
- Rollback proof (`scripts/prove-rollback.ts banshee`): a failure injected after the delete step, inside the real per-legend transaction, left that legend's rows unchanged. No scratch table, no schema change.

## Tests

- 308 tests, 8 files: parser 22, RNG 9, matcher 20, audit 9, database plan 41, generator unit 25, generator properties 158, feasibility 24 (pass 284, fail 24).
- Properties: 12 (determinism, typed errors only, and 10 rule properties covering the slot fill, four distinct options with one correct, the correct answer never among the wrong ones, fact fits slot (type, version, `[R]`), true lead rules, dead-end contradictions, meaningful hotspots for every slot and lead step, at least 5 decoys and valid swaps, hint anchors, answer written in the text), on 13 subjects (the fixture and the 12 legends), 100 seeds each. Every property is also proved to fail when its rule is broken on purpose.
- Generated runs actually checked: fixture 1,100, chupacabra 255, jersey-devil 834, the other ten legends 0 (they cannot generate; that is what the feasibility tests report).
- Feasibility (2 tests per legend: every version generates; 40 fixed seeds generate): all 24 fail. They are not skipped or marked expected-to-fail, and no rule was loosened. Seeds that generate in 60: chupacabra 15, jersey-devil 42, all others 0.
- Same results with `.env` moved aside and an empty environment (R6.5). Nothing the tests import loads `pg` or opens a connection.

## Final verification (verify-and-stop)

| Check | Result |
|---|---|
| `pnpm install --frozen-lockfile` | pass |
| strict typecheck with `--noUnusedLocals --noUnusedParameters` | pass |
| `pnpm -r test` | 284 pass, 24 fail (feasibility only) |
| `pnpm -r test`, no `.env`, empty environment | same: 284 pass, 24 fail |
| `pnpm check:content` (Phase 0 script, all twelve) | 12 PASS |
| import repeated, database counts through the MCP | identical |
| repo scan for real `.env` values and connection-string shapes | none found; `.env` ignored by git |

## Changes you should know about

1. **R5.10 matcher: one addition to your wording.** As written, banshee f12 ("white dress, red hair, pale face") does not pass, because "dress" and "dressed" are different whole words. The matcher also folds a trailing "-ed" on words over four letters (`dressed` matches `dress`). "bare feet" against "barefoot" still fails. Tell me if you want it literal; f12 then goes back to "answer not found".
2. **Hook format.** Current Kiro loads `.kiro/hooks/*.json` (`version: "v1"`). The Phase 0 hook used the old format, so it may never have run. It is converted. I could not check inside the IDE whether `PostFileSave` fires when you save by hand or only when the agent saves.
3. **Test hook noise.** While the 24 feasibility tests are red, `skeleton-tests.json` reports a failure on every save.
4. **Rule (f) dropped.** My design rule "a fact needs a hotspot that links to it" went beyond R5.7 and made things worse; the rule is now per slot, as R5.7 says.
5. **Contradictions.** True-chain leads write `contradiction: n/a`; only leads with a contradiction can be shown as dead ends.
6. **Script names.** `audit:content` and `db:import` (plain `audit` and `import` are pnpm built-ins).
7. Other design changes are listed in `design.md` section 11 and `docs/kiro-usage.md`.

## Remaining content gaps, per legend (from `docs/content-gaps.md`)

Group 1: answers not found in the linked text. Group 2: slots or lead steps with no meaningful hotspot. Group 3: slots with no fact for a version. Fix these in the legend files, then run `pnpm --filter @kiroween/skeleton audit:content`, the tests, and `pnpm --filter @kiroween/skeleton db:import`.

| legend | answers not found | slots with no hotspot | lead steps with no hotspot | versions that cannot be generated |
|---|---|---|---|---|
| baba-yaga | 1 | 0 | 11 | 4 of 4 |
| banshee | 4 | 1 | 3 | 4 of 4 |
| chupacabra | 3 | 0 | 0 | 2 of 4 |
| draugr | 2 | 0 | 7 | 4 of 4 |
| el-coco | 4 | 0 | 5 | 4 of 4 |
| flying-dutchman | 4 | 1 | 5 | 5 of 5 |
| gumiho | 2 | 0 | 7 | 4 of 4 |
| jersey-devil | 0 | 0 | 1 | 1 of 4 |
| naddaha | 2 | 0 | 5 | 4 of 4 |
| spring-heeled-jack | 3 | 1 | 4 | 4 of 4 |
| vetala | 2 | 1 | 8 | 4 of 4 |
| yuki-onna | 1 | 1 | 11 | 4 of 4 |

The cause that matters most: lead steps with no meaningful hotspot (R5.7). A hotspot links to a lead step only when its "Linked fact_ids or lead step" cell says so (for example `lead-2 step 1`). Most legends leave most steps unlinked.

### Details

#### baba-yaga

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

| fact | puzzle type | answer | anchor |
|---|---|---|---|
| f-015 | weakness | it must be fed | baba-yaga--ch-3 |

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: none
- Lead steps with no meaningful hotspot: lead-1 step 2, lead-1 step 3, lead-2 step 1, lead-2 step 2, lead-2 step 3, lead-3 step 1, lead-3 step 2, lead-3 step 3, lead-4 step 1, lead-4 step 2, lead-4 step 3

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

- `v-devourer`: slot p-2: no qualifying fact
- `v-devourer`: slot p-3: no qualifying fact
- `v-devourer`: slot p-4: no qualifying fact
- `v-lubok`: slot p-2: no qualifying fact
- `v-lubok`: slot p-3: no qualifying fact
- `v-lubok`: slot p-4: no qualifying fact
- `v-scholar`: slot p-2: no qualifying fact
- `v-scholar`: slot p-3: no qualifying fact
- `v-scholar`: slot p-4: no qualifying fact

#### banshee

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

| fact | puzzle type | answer | anchor |
|---|---|---|---|
| f04 | symbol | hair loose and bare feet | banshee--ch-2 |
| f04 | object-match | hair loose and bare feet | banshee--ch-2 |
| f05 | weakness | documented: they kept it for funerals only | banshee--ch-2 |
| f10 | weakness | leave it where it lies | banshee--ch-7 |

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: pz-1
- Lead steps with no meaningful hotspot: lead-1 step 3, lead-4 step 2, lead-4 step 3

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

- `v-window`: slot pz-2: no qualifying fact
- `v-washer`: slot pz-2: no qualifying fact
- `v-clan`: slot pz-2: no qualifying fact

#### chupacabra

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

| fact | puzzle type | answer | anchor |
|---|---|---|---|
| f-03 | object-match | two legs, upright | chupacabra--ch-3 |
| f-04 | symbol | spikes along the back | chupacabra--ch-3 |
| f-17 | original-name | Tracking the Chupacabra | chupacabra--ch-4 |

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: none
- Lead steps with no meaningful hotspot: none

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

- `v-radio`: slot p-3: no qualifying fact
- `v-film`: slot p-3: no qualifying fact

#### draugr

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

| fact | puzzle type | answer | anchor |
|---|---|---|---|
| f-03 | original-name | Sweden | draugr--ch-2 |
| f-06 | symbol | heaviness | draugr--ch-2 |

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: none
- Lead steps with no meaningful hotspot: lead-1 step 3, lead-2 step 1, lead-2 step 3, lead-3 step 3, lead-4 step 1, lead-4 step 2, lead-4 step 3

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

- `v-eyrbyggja`: slot p-4: no qualifying fact
- `v-laxdaela`: slot p-1: no qualifying fact
- `v-laxdaela`: slot p-4: no qualifying fact
- `v-scholars`: slot p-1: no qualifying fact
- `v-scholars`: slot p-2: no qualifying fact
- `v-scholars`: slot p-4: no qualifying fact

#### el-coco

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

| fact | puzzle type | answer | anchor |
|---|---|---|---|
| f-05 | object-match | a monkey's angry face | el-coco--ch-4 |
| f-11 | date-or-number | 80 | el-coco--ch-3 |
| f-18 | symbol | carries off children who sleep little | el-coco--ch-2 |
| f-34 | date-or-number | 1921 | el-coco--ch-5 |

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: none
- Lead steps with no meaningful hotspot: lead-1 step 3, lead-2 step 2, lead-2 step 3, lead-3 step 3, lead-4 step 3

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

- `v-monkey`: slot p-2: no qualifying fact

#### flying-dutchman

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

| fact | puzzle type | answer | anchor |
|---|---|---|---|
| f-06 | date-or-number | 11 July 1881 | flying-dutchman--ch-6 |
| f-19 | weakness | refuse the letters | flying-dutchman--ch-3 |
| f-21 | symbol | steer it (no steersman) | flying-dutchman--ch-4 |
| f-29 | symbol | coming storm or disaster | flying-dutchman--ch-1 |

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: pz-1
- Lead steps with no meaningful hotspot: lead-1 step 2, lead-1 step 3, lead-3 step 3, lead-5 step 2, lead-5 step 3

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

- `v-redeemer`: slot pz-4: no qualifying fact

#### gumiho

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

| fact | puzzle type | answer | anchor |
|---|---|---|---|
| f-35 | date-or-number | one thousand years | gumiho--ch-2 |
| f-36 | date-or-number | one hundred years | gumiho--ch-6 |

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: none
- Lead steps with no meaningful hotspot: lead-1 step 3, lead-2 step 1, lead-2 step 2, lead-2 step 3, lead-3 step 2, lead-4 step 2, lead-4 step 3

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

- `v-ascend`: slot p-4: no qualifying fact
- `v-qingqiu`: slot p-4: no qualifying fact

#### jersey-devil

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

None.

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: none
- Lead steps with no meaningful hotspot: lead-4 step 3

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

None.

#### naddaha

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

| fact | puzzle type | answer | anchor |
|---|---|---|---|
| f-12 | weakness | a companion who stays beside him | naddaha--ch-2 |
| f-16 | original-name | in his own house | naddaha--ch-3 |

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: none
- Lead steps with no meaningful hotspot: lead-2 step 3, lead-3 step 3, lead-4 step 1, lead-4 step 2, lead-4 step 3

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

- `v-path`: slot p-4: no qualifying fact
- `v-home`: slot p-4: no qualifying fact
- `v-blackman`: slot p-4: no qualifying fact
- `v-modern`: slot p-4: no qualifying fact

#### spring-heeled-jack

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

| fact | puzzle type | answer | anchor |
|---|---|---|---|
| f-16 | object-match | a lamp like a bull's-eye lantern | spring-heeled-jack--ch-3 |
| f-20 | original-name | Peckham Rye | spring-heeled-jack--ch-2 |
| f-24 | date-or-number | twelve | spring-heeled-jack--ch-5 |

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: p-5
- Lead steps with no meaningful hotspot: lead-1 step 3, lead-2 step 1, lead-2 step 2, lead-2 step 3

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

- `v-street`: slot p-2: no qualifying fact
- `v-street`: slot p-3: no qualifying fact
- `v-dreadful`: slot p-2: no qualifying fact
- `v-dreadful`: slot p-3: no qualifying fact
- `v-army`: slot p-2: no qualifying fact
- `v-army`: slot p-3: no qualifying fact
- `v-army`: slot p-4: no qualifying fact

#### vetala

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

| fact | puzzle type | answer | anchor |
|---|---|---|---|
| f-11 | weakness | when the king speaks | vetala--ch-2 |
| f-32 | date-or-number | 1880 to 1884 | vetala--ch-4 |

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: p-5
- Lead steps with no meaningful hotspot: lead-1 step 3, lead-2 step 2, lead-2 step 3, lead-3 step 1, lead-3 step 2, lead-3 step 3, lead-4 step 2, lead-4 step 3

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

- `v-burton`: slot p-1: no qualifying fact
- `v-burton`: slot p-2: no qualifying fact
- `v-later`: slot p-1: no qualifying fact
- `v-later`: slot p-2: no qualifying fact
- `v-later`: slot p-3: no qualifying fact
- `v-later`: slot p-4: no qualifying fact
- `v-hindi`: slot p-1: no qualifying fact
- `v-hindi`: slot p-2: no qualifying fact
- `v-hindi`: slot p-4: no qualifying fact

#### yuki-onna

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

| fact | puzzle type | answer | anchor |
|---|---|---|---|
| f-15 | object-match | a lamp | yuki-onna--ch-3 |

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: p-5
- Lead steps with no meaningful hotspot: lead-1 step 2, lead-1 step 3, lead-2 step 1, lead-2 step 2, lead-2 step 3, lead-3 step 1, lead-3 step 2, lead-3 step 3, lead-4 step 1, lead-4 step 2, lead-4 step 3

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

- `v-sogi`: slot p-1: no qualifying fact
- `v-sogi`: slot p-3: no qualifying fact
- `v-ojiya`: slot p-1: no qualifying fact
- `v-ojiya`: slot p-3: no qualifying fact
- `v-picture`: slot p-1: no qualifying fact
- `v-picture`: slot p-3: no qualifying fact

## Skills used (global skills, none conflicted with the spec)

- read-the-damn-docs: Drizzle guides show `@rc` while npm `latest` is 0.45; Neon: migrations on a direct connection; Kiro hooks moved to `.kiro/hooks/*.json`. The Vitest docs site timed out twice.
- ponytail: small modules; removed dead code (`linkKey`, a dead variable, a duplicate export name).
- agent-tester: wrong test expectation fixed; a no-op replace removed; led to the break-each-rule tests.
- agent-security: no real secrets in code; a fake connection-string literal in a test is now built at run time; the import error carries no driver message.
- agent-guard (code, tests, docs): split a 330-line parser function and a 60-line `generate()`; two pnpm name clashes; one design rule beyond the requirement; docs claims checked against the code.
- verify-and-stop: the final check above.
- Not used: agent-pilot, agent-superpowers and any sub-agent skill. Full notes in `docs/kiro-usage.md`.

## Needs your action

1. Fix the content gaps above (they are yours to fix; no legend was edited), then re-run the audit, the tests and `db:import`.
2. Decide on the "-ed" fold (change 1).
3. In the IDE, check that both hooks appear in the Agent Hooks panel and whether `PostFileSave` fires on your own saves.
4. Optional: put `sslmode=verify-full` in both connection strings; `pg` warns that `sslmode=require` will change meaning in pg 9.
5. Commit when you are ready. Your two planning files (`02-work-plan.md`, `07-kiro-phase-1.md`) go in with it.
6. Known advisory: drizzle-kit bundles an old esbuild with a moderate dev-server advisory. Dev tool only.
7. Phase 2 (auth and progress) is written from this file; it has not been started.
