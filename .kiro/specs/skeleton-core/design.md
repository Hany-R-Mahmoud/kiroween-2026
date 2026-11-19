# Design: skeleton-core

Implements `requirements.md` (R1 to R9). Logic and data only. All code lives in `skeleton/`, written as ES modules in strict TypeScript.

## 1. Toolchain and pins (R1)

Findings from the npm registry today:

| Package | Latest | Declares a TypeScript peer range? |
|---|---|---|
| @tanstack/react-start | 1.169.5 (needs vite >= 8) | No |
| vite | 8.3.8 | No |
| vitest | 5.1.1 (vite ^6.4 / ^7 / ^8) | No |
| typescript | 7.0.2 (`latest`), 6.0.3 (last 6.x) | n/a |

None of the three publishes a supported TypeScript range, so there is no official statement that supports TypeScript 7. TypeScript 7 is the native compiler; its JS API is exported only under `typescript/unstable/*`, and tools that import the classic API can break. Rule from the prompt: if 7 is not supported by all three, pin the latest supported major. I will pin **TypeScript 6.0.3** and record this reasoning. Task 1 runs a one-off `tsc --noEmit` and a Vitest run on TS 7 only to note the result in `docs/tech-decisions.md`; the pin does not change unless you ask.

Pins (exact versions in `skeleton/package.json`, locked by `pnpm-lock.yaml`):

| Package | Version | Role |
|---|---|---|
| typescript | 6.0.3 | strict compiler |
| vitest | 5.1.1 | test runner |
| fast-check | 4.10.3 | property tests |
| vite | 8.3.8 | required by TanStack Start and Vitest; skeleton uses it only through Vitest |
| zod | 4.6.7 | runtime schemas for the Legend model |
| drizzle-orm | 0.45.4 | schema and queries |
| drizzle-kit | 0.31.11 | migration generation and apply |
| pg + @types/pg | 8.23.1 / 8.23.1 | Node driver for import and migrate (supports interactive transactions) |
| tsx | 4.23.15 | run TypeScript scripts |
| dotenv | 18.0.10 | load `.env` in scripts |
| @types/node | `>=22` line | Node typings |

Why `pg` and not `@neondatabase/serverless`: the import needs a real transaction (R3.5). The Neon HTTP driver cannot hold one open. The apps can use the Neon driver later for request-time reads; both read the same schema.

`tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `module: NodeNext`, `target: ES2023`. Root script `pnpm -r test` calls `vitest run` in `skeleton/`; the two apps get a `test` script that exits 0 until they have tests (`--passWithNoTests`).

## 2. Package layout

```
skeleton/
  package.json  tsconfig.json  vitest.config.ts  drizzle.config.ts
  drizzle/                      generated SQL migrations (committed)
  scripts/
    import.ts                   load all legends into Neon
    audit.ts                    write docs/content-gaps.md
  src/
    index.ts                    public exports
    model/        schema.ts (zod), types.ts, ids.ts
    parser/       markdown.ts, sections/*.ts, parseLegend.ts, loadLegends.ts, errors.ts
    rng/          rng.ts
    generator/    generate.ts, versions.ts, slots.ts, options.ts,
                  swaps.ts, hints.ts, normalise.ts, audit.ts, errors.ts
    db/           schema.ts (drizzle), client.ts, import.ts
  test/
    helpers/legends.ts          parse all twelve once, shared
    parser.test.ts  rng.test.ts  generator.property.test.ts  audit.test.ts
```

Boundaries: `parser` knows Markdown, not the database. `generator` takes a parsed `Legend`, never touches files or the database. `db` takes a `Legend` and writes it. The generator is therefore the same code in tests, in the game server and in the atlas.

## 3. Content model and parser (R2)

### 3.1 Model

Zod schemas are the source of truth; TypeScript types are inferred from them. All IDs in the model are namespaced (`banshee:f07`). Anchors are not namespaced again (they already start with the legend id).

```ts
Legend {
  id, meta: { title, region, countryTheme, mapPoint: {lat,lng}, era, scareLevel, readingTimeMin, oneLineHook },
  coldOpen: string,
  chapters: Chapter[]            // { id, ordinal, anchor, title, sources: string[], text, hook }
  versions: Version[]            // { id, sourceType, era, claim, conflicts, sourceId, anchor, paragraph }
  documentedTold: { documented: string[]; told: string[] }
  facts: Fact[]                  // { id, statement, confidence: 'D'|'R'|'checked', anchor, versionId: string|null,
                                 //   puzzleTypes: PuzzleType[], answer, wrongAnswers: string[], difficulty: 1|2|3 }
  leads: Lead[]                  // { id, startsFrom, steps: string[], deadEnd, contradiction: {factId, anchor},
                                 //   canBeTrueFor: string[] | 'never' }
  world: {
    setting, scenes: Scene[],    // { id, name, description }
    hotspots: Hotspot[],         // { id, sceneId, object, role: 'meaningful'|'decoy', swappable, links: Link[], onTap }
    spirit: string,
    slots: PuzzleSlot[],         // { id, label, type, candidateFactIds, hint1, hint1Highlights: string[], hint2Anchor }
    finalPuzzle: { id, type, description, hint1, hint2Anchor },
    fearEvents: { id, description, reducedMotion: string }[]
  },
  theme: Record<'palette'|'displayFont'|'bodyFont'|'textures'|'motifs'|'ambientSound'|'uiAccents', string>,
  assets: Asset[], sources: Source[]
}
Link = { kind: 'fact', factId } | { kind: 'leadStep', leadId, step: number }
```

### 3.2 How the parser reads Markdown

The twelve files differ in layout (checked: `### Hotspots` vs `**Hotspots**`, scenes as bold paragraphs vs bullet lines, slot labels such as `pz-1` vs `p-1 The farm and the shepherd`, fear events as a list vs prose lines). The parser works in two layers:

1. **Section splitter.** Splits on `## <n>.` into sections 0 to 11. Inside section 7 it splits on a heading line matching `^(#{3} |\*\*)(Setting|Scenes|Hotspots|Spirit encounter|Puzzles|Breaking the curse|Fear events|Hints)` (case-insensitive, trailing colon or bold close allowed). This is the single place that handles the heading variants (R2.3).
2. **Per-section readers** in `sections/*.ts`. Tables are read by header name (not column position) through one shared `readTable()`. Bullet and prose blocks use small regexes.

Rules for the parts that vary:

- **Slot ids.** Take the first token of the slot cell (`p-1`, `pz-1`); the rest is the label. The final puzzle is the slot whose id contains `final`, or the "Breaking the curse" block.
- **Hotspot role and swappable.** Role from the role column (`Meaningful`, `Decoy`). `swappable` is true if the cell says "swappable", or the id appears in a "Swappable hotspots: ..." sentence under the table. A decoy listed there is swappable too. Ids listed as "Permanent decoys" are not.
- **Links.** `f-15`, `f15` tokens become fact links; `lead-2 step 1` becomes a lead-step link; `none`, `lead-2 (false trail)` and empty become no link (a false-trail reference is kept as text on `onTap`, not as a link).
- **Hint 1 highlights.** Hotspot ids found in the hint 1 text (`Highlight h-07 and h-03`) are stored; ids that do not exist in the hotspot list are a parse error.
- **Deep-link targets.** The valid anchor set of a legend is derived, not read from declarations: every chapter anchor, `<id>--versions`, and `<id>--versions--<v>` for each row of the versions table. Only two files declare the `--versions` index line, but `legend-format.md` section 3 defines the family, so it is valid everywhere. Any `anchor:` line in section 3 outside this set is a parse error. The set is stored on the Legend as `anchors`.
- **Hint 2 anchor.** Extracted from `Opens <anchor>`. It must be in the valid set; anything else is a parse error. A bare `<id>--versions` is valid as written; the generator may refine it to the true version's anchor (5.6).
- **Final puzzle vs slot.** Rows of the Puzzles table become slots. A row marked "(final)" (banshee `pz-5`) is a normal slot with `isFinal: true`. The "Breaking the curse" block becomes `finalPuzzle` text. A hint row that matches no slot (flying-dutchman `pz-final`) attaches to `finalPuzzle`.
- **Lead "can be true when".** Exactly R2.8. A line containing "never" gives `'never'`. Otherwise every `v-<id>` token found must exist in the versions table, and at least one must be present; otherwise the parse fails.
- **Facts.** `[D]` and `[R]` prefixes set `confidence` and are removed from the stored statement. Wrong answers split on `;`. `puzzle_types` split on `,`. `all` becomes `versionId: null`.
- **Fact and lead ID formats.** Kept as written, then namespaced: `banshee:f07`, `draugr:f-15`. Links are resolved to namespaced ids after all sections are read.

Errors: `ParseError { file, section, line, message }[]`. `parseLegend(text, file)` returns `{ ok: true, legend } | { ok: false, errors }`. It collects all errors in a file rather than stopping at the first. After zod validation it runs cross-checks: every fact anchor exists; every fact version exists; every lead contradiction fact exists and its anchor exists; every slot candidate fact exists; every linked fact or lead step exists; every Hint 2 anchor is valid.

`loadLegends(dir)` reads `content/legends/*.md` read-only (`fs.readFile` only; no write call exists in the package against `content/`).

## 4. Seeded randomness (R4)

`createRng(seed: string): Rng`. The seed string is hashed with xmur3 into four 32-bit words, and the stream comes from sfc32. Both are small, public-domain algorithms with no dependency.

```ts
interface Rng {
  next(): number                     // [0,1)
  int(min: number, max: number): number   // inclusive
  pick<T>(items: readonly T[]): T
  shuffle<T>(items: readonly T[]): T[]    // Fisher-Yates, returns a copy
  sample<T>(items: readonly T[], n: number): T[]   // without replacement
  fork(label: string): Rng           // independent stream: seed + '/' + label
}
```

The generator forks one stream per decision (`version`, `lead`, `slot:<id>`, `options:<id>`, `swaps`). Adding a decision later therefore does not reshuffle earlier ones, and a failing seed stays reproducible. A lint-style test greps `skeleton/src` for `Math.random` and `Date.now` and fails if it finds any (R4.3).

## 5. Run generator (R5)

`generate(legend: Legend, seed: string, audit?: LegendAudit): Run` is pure. `LegendAudit` is computed once per legend by `auditLegend(legend)` (5.1) and cached; `generate` calls it itself if not given.

### 5.1 Content audit (R5.10)
`auditLegend` returns, per fact, the puzzle types it may fill. A fact stays usable for `true-or-told` and `ritual-order` slots whatever the text says. For every other type it must pass `answerInText(paragraphs, answer, type)` in `generator/normalise.ts` (owner-approved matcher, replaces the exact-phrase check):
- `paragraphs` are the linked text split on blank lines: a chapter for a chapter anchor; the claim, conflicts and account of one version for a per-version anchor; every version for the bare `<id>--versions` anchor.
- `normalise` is unchanged: Unicode NFD, remove combining marks, lowercase, strip markdown `*` and `_`, punctuation to space, collapse whitespace, drop a trailing `s` from words over three letters.
- The answer loses a leading `documented:`, `told:` or `proposed:` label, then is split on commas, " and " and parentheses. Each part is its list of content words (the words a, an, the, of, and, or, to, in, on, at, with, near, about are ignored).
- A part passes when all its content words are whole words of one paragraph. The answer passes when every part passes. `who-said-it` passes when the surname (last word of the name) is a whole word anywhere in the text.
- Matcher-only fold: a word over four letters ending in "-ed" is cut to its stem ("dressed" matches "dress"). This is beyond the owner's wording and exists so banshee f12 passes.
Result: `gaps: { legendId, factId, puzzleType, reason }[]`. `scripts/audit.ts` writes them to `docs/content-gaps.md` and also lists per legend any version that cannot be generated (R5.13).

### 5.2 Choosing version and leads (R5.5, R5.6)

1. `candidateVersions` = versions that appear in the `canBeTrueFor` of at least one lead. Leads with `'never'` contribute nothing.
2. `trueVersion = rng.fork('version').pick(candidateVersions)`.
3. `trueLead` = pick from leads whose `canBeTrueFor` includes `trueVersion`. Every other lead is a dead-end chain, including leads with `'never'`.
4. Each dead end carries its contradiction fact id and anchor, verified to exist. A violation throws `GeneratorError('dead-end-anchor')`.

### 5.3 Filling slots (R5.2 to R5.4, R5.9, R5.13)

For each slot, in order, with `rng.fork('slot:' + id)`:

1. Candidates = `slot.candidateFactIds` that (a) exist, (b) list the slot's type in `puzzleTypes`, (c) have `versionId` null or equal to `trueVersion`, (d) are not `[R]` when the type is `true-or-told`, (e) are usable for this type per the audit, (f) have at least one hotspot link (fact link) in the base hotspot list so the fact can be reached (R5.7), (g) are not already used by an earlier slot in this run.
2. If none remain, throw `GeneratorError('no-qualifying-fact', { legend, slot, seed })`. No partial run, no relaxing of (a) to (g).
3. Pick one fact. Wrong answers: remove any wrong answer whose normalised form equals the correct answer, then `sample` exactly three from the rest. If fewer than three remain, throw `GeneratorError('too-few-wrong-answers')`.
4. Options = shuffle(correct + three wrong), four distinct by normalised form. Store `correctIndex`.

The "Breaking the curse" final puzzle is prose that depends on the true version (for example an ordered list of story beats). Phase 1 does not generate its options; the game spec will. The run carries it as `finalPuzzle` text with Hint 1 and resolved Hint 2. When the Puzzles table also lists the final puzzle as a row (banshee `pz-5`), that row is an ordinary slot: it goes through the same fill, option and hint steps and the same properties. Slots are never skipped because they are final.

### 5.4 Hotspot roles and swaps (R5.7, R5.8)

Inputs: base hotspots, filled slots, true lead steps. Requirements the final roles must keep ("needs"): for each filled fact, one meaningful hotspot holding its fact link; for each true-lead step, one meaningful hotspot holding that lead-step link.

1. Build candidate pairs: two hotspots in the same scene, both `swappable`, one meaningful and one decoy.
2. `pairs = rng.fork('swaps').shuffle(candidatePairs)`, with each hotspot used at most once. `k = rng.fork('swaps').int(0, pairs.length)`.
3. Apply pairs in order until `k` swaps are applied. For each pair, apply the swap on a copy: roles exchange, and the hotspot that becomes meaningful takes over the links of the one that became a decoy (which ends with no links). If the copy still meets all needs, keep it; otherwise skip the pair (it does not count toward `k`).
4. The decoy count is unchanged by every swap. A final check asserts `decoys >= 5` and every need met, or throws `GeneratorError('hotspot-invariant')`.

A legend with no valid pair (for example one where no decoy is marked swappable) always gets zero swaps. That is allowed by R5.8 and will be reported in the audit output.

### 5.5 Hints (R5.1, R5.12)

Per filled slot: `hint1 { text, highlight: hotspotId[] }` and `hint2 { anchor }`. Highlights are remapped through the swap table: if a highlighted hotspot swapped, the highlight moves to the hotspot that now holds the meaningful role, so Hint 1 never points at a decoy created by a swap.

### 5.6 Hint 2 anchors

Chapter, versions and per-version anchors are all valid. If a Hint 2 anchor is the bare `<id>--versions`, the run refines it to `<id>--versions--<trueVersion>` so the player lands on the right account. This is a refinement only: the bare anchor is not an error, is not reported as a gap, and a test accepts either form. Every emitted anchor must be in the legend's `anchors` set; otherwise `GeneratorError('hint-anchor')`.

### 5.7 Run shape

```ts
Run {
  legendId, seed, trueVersionId,
  trueLead: LeadRun, deadEnds: LeadRun[],   // LeadRun: { id, steps, deadEnd?, contradiction? }
  slots: { slotId, type, factId, question: string, options: [string,string,string,string], correctIndex, anchor,
           hint1: {text, highlight[]}, hint2: {anchor} }[],
  hotspots: { id, sceneId, role, links[] }[],
  swaps: [hotspotIdA, hotspotIdB][],
  finalPuzzle
}
```

`question` is the fact statement with its answer text blanked, so UI work can start without a content change. If the answer is not in the statement, the question falls back to the slot label. This is a convenience field and is not covered by the requirements.

## 6. Database (R3)

### 6.1 Tables (Drizzle `pgTable`, all keys are namespaced text)

| Table | Key columns |
|---|---|
| `legends` | `id` pk; title, region, country_theme, map_lat, map_lng, era, scare_level, reading_time_min, one_line_hook, cold_open, setting, spirit; `theme` jsonb (the seven tokens); `final_puzzle` jsonb; `content_hash` |
| `anchors` | `anchor` pk; `legend_id` fk; `kind` ('chapter','version'); `ref_id` |
| `chapters` | `id` pk; `legend_id` fk; `ordinal`; `anchor` fk to anchors, unique; title; `source_ids` text[]; body; hook |
| `versions` | `id` pk; `legend_id` fk; source_type, era, claim, conflicts, `source_id`, `anchor` fk, paragraph |
| `documented_told` | `id` serial pk; `legend_id` fk; `ordinal`; documented; told |
| `facts` | `id` pk; `legend_id` fk; statement; `confidence`; `anchor` fk to anchors; `version_id` fk nullable; answer; `wrong_answers` text[]; difficulty smallint |
| `fact_puzzle_types` | (`fact_id`, `puzzle_type`) pk |
| `leads` | `id` pk; `legend_id` fk; `starts_from` fk to versions; steps text[]; dead_end; `contradiction_fact_id` fk; `contradiction_anchor` fk; `true_for` text[]; `never_true` boolean |
| `scenes` | `id` pk; `legend_id` fk; ordinal; name; description |
| `hotspots` | `id` pk; `legend_id` fk; `scene_id` fk; object; `role`; `swappable`; `links` jsonb; on_tap |
| `puzzle_slots` | `id` pk; `legend_id` fk; ordinal; label; `puzzle_type`; `candidate_fact_ids` text[]; hint1; `hint1_highlights` text[]; `hint2_anchor` (text, may be the versions marker) |
| `fear_events` | `id` pk; `legend_id` fk; ordinal; description; reduced_motion |
| `assets` | `id` pk; `legend_id` fk; surface; kind; usage; size; background; prompt; must_avoid |
| `sources` | `id` pk (`banshee:S1`); `legend_id` fk; title; author; year; url; public_domain; supports |

All child tables use `ON DELETE CASCADE` from `legends`. Enums are Postgres enums for `puzzle_type`, `role`, `confidence`, `anchor_kind`.

### 6.2 Migrations and branch

- `drizzle-kit generate` writes SQL into `skeleton/drizzle/`. `drizzle-kit migrate` applies it using `DATABASE_URL`.
- The Neon MCP `create_branch` makes the branch `dev-skeleton-core`. The same MCP is used to verify afterwards (`describe_table_schema`, `run_sql` with `SELECT count(*)`), never to read a connection string into the chat.
- **Two variables.** `DATABASE_URL` is the pooled string (runtime, later phases). `DATABASE_URL_UNPOOLED` is the direct string, used by `drizzle-kit migrate` and the import script. Neon's connection-pooling docs say schema migrations should use a direct connection, and the pooler runs PgBouncer in transaction mode, which does not support session features. `drizzle.config.ts` and `scripts/import.ts` read `DATABASE_URL_UNPOOLED` and fail with a message that names the variable (never its value) if it is missing. `.env.example` gains `DATABASE_URL_UNPOOLED=` with no value.
- **Owner step.** The MCP can return connection strings, but Phase 1 forbids printing them. After `dev-skeleton-core` exists I stop and ask you to paste both strings of that branch into your own `.env`. Migrate and import are blocked until you confirm.

### 6.3 Import (R3.4 to R3.7)

`scripts/import.ts`:

1. `dotenv` loads `.env`. If `DATABASE_URL_UNPOOLED` is missing, exit with a message that names the variable and echoes no value.
2. Parse all legends. If any fails, print the errors and import nothing.
3. For each legend, in one transaction on one client: `DELETE FROM legends WHERE id = $1` (cascade clears children), then insert the legend row, anchors, then everything else in dependency order. Rollback on any error. A failed legend leaves its old rows intact; other legends are unaffected.
4. All statements use Drizzle's parameterized builders. No SQL string is built from content.
5. Errors are caught at the top and re-thrown as `ImportError` with legend id and table name only. The `pg` error object is never printed whole, because it can carry the host.
6. Output: rows inserted per table, per legend and in total. Re-running yields the same totals (verified by a test against the SQL statement list, and by running the script twice and comparing `count(*)` through the MCP).

`content_hash` (sha256 of the file) is stored so a later import can report "unchanged".

## 7. Tests (R6)

Run with `vitest run`. No network, no database (R6.5).

- `test/helpers/legends.ts` parses all twelve files once and exports them plus their audits.
- **Parser unit tests** on `banshee` (`### Hotspots` form, 16 hotspots) and `draugr` (`**Hotspots**` form, bare-prose formats): counts, namespaced ids, link parsing, hint anchors, swappable detection, and the `never` lead rule. Negative cases: a copy of the text with a missing anchor, an unknown puzzle type, an unknown version in "can be true when", and a hint highlight to a missing hotspot each produce a located error.
- **RNG tests:** same seed same sequence; different seeds differ; `sample` has no repeats; `fork` streams are independent of call order.
- **Feasibility test (one per legend):** `generate` succeeds for a fixed set of seeds. This test fails, loudly, for any legend that has a content gap leaving a slot empty (R5.13). I will not mark it skipped or expected-to-fail. The handover lists those legends as red.
- **Property tests** (fast-check, `numRuns: 100` per legend per property, seeds from `fc.string()` and `fc.uuid()`), run over every legend that passes feasibility:
  1. determinism: `generate(l, s)` deep-equals `generate(l, s)`;
  2. never throws;
  3. every slot filled, exactly four distinct options by normalised form, exactly one equals the correct answer;
  4. correct answer never among the three wrong ones;
  5. each fact's types include the slot type, version matches, no `[R]` in `true-or-told`;
  6. true version has a lead that can be true for it; the true lead is never a `never` lead;
  7. every dead end has a contradiction fact whose anchor exists;
  8. every filled fact and every true-lead step has a meaningful hotspot;
  9. at least 5 decoys; swaps only between swappable same-scene hotspots with different roles; the swapped-in hotspot took the link;
  10. Hint 2 anchor is a deep-link target (chapter, versions or per-version); the bare versions form is accepted;
  11. answer text is in the linked chapter for the types that require it.
  Test totals reported: 11 properties × legends × 100 runs.
- **Audit test:** `auditLegend` on a small hand-made fixture with a known gap.
- **Static test:** no `Math.random` or `Date.now` in `skeleton/src`.

## 8. Hook (R7)

`.kiro/hooks/skeleton-tests.kiro.hook`: trigger `fileEdited`, patterns `skeleton/src/**/*.ts`; action `askAgent` with the prompt: run `pnpm --filter @kiroween/skeleton test`, report the failing tests with their file and name, and do not edit any file. Same format as the existing `content-validate.kiro.hook`.

## 9. Docs

- `docs/tech-decisions.md`: every pin and reason (section 1), Drizzle and `pg` choices, TS 7 result.
- `docs/content-gaps.md`: written by `scripts/audit.ts`: per legend, facts excluded and why; slots with no usable fact.
- `docs/kiro-usage.md`: Phase 0 and Phase 1 entries (spec, steering, hooks, MCP, property tests).
- `docs/phase-1-handover.md`: per R9.

## 10. Risks and open points

1. **Strict answer-in-chapter check** may exclude many facts and leave some slots empty. Mitigation: run the audit before building the generator (Task 4) and show you the numbers. The rule stays as written.
2. **Hotspot reachability (5.3 f).** A fact is only used if a hotspot links it. Facts that are candidates for a slot but have no hotspot are never chosen. The audit lists them.
3. **Audit text for a `--versions` anchor.** A fact linked to `<id>--versions` is checked against the whole versions section (table plus paragraphs); a per-version anchor is checked against that version's paragraph.
4. **Two connection strings** (section 6.2).
5. **Drizzle line.** The Drizzle docs now show `@rc` (v1.0.0-rc.5) in their guides. npm `latest` is still 0.45.4 / 0.31.11. I pin the stable line and use only the long-stable API (`pgTable`, `drizzle-kit generate`/`migrate`, `db.transaction`). Task 2 checks the 0.45 docs before writing the schema.
6. **TypeScript 6 pin** rests on the absence of a supported-range statement, not on a documented incompatibility with 7.

## 11. Changes made during implementation

The design above is the plan. Where the real content or the owner's decisions changed it, the code follows this list (details and reasons in `docs/kiro-usage.md`):

1. Leads that are the true chain for a version write `contradiction: n/a`; the model stores `null`, and only chains with a contradiction can be dead ends. A contradiction is `{factIds[], anchors[]}`.
2. A hotspot linked as `lead-n` with no step covers every step of that lead.
3. In the "Swappable hotspots:" sentence every id counts as swappable (it names the decoys that may swap in).
4. Rule (f) of 5.3 (a fact needs a hotspot that links to it) is replaced by the slot-level R5.7 rule: each filled slot needs a meaningful hotspot linked to any of its candidate facts; the true lead must have a meaningful hotspot on every step, and the generator picks among leads that do.
5. Slots get distinct facts by seeded backtracking (`assignSlots`).
6. The answer-in-text check is the owner's part-based matcher (5.1), with one addition: a trailing "-ed" on words over four letters is folded.
7. An infeasible version is never dropped silently: the generator throws a typed `GeneratorError`; `docs/content-gaps.md` lists every one.
8. Parser files: `parseLegend.ts`, `facts.ts`, `world.ts`, `ctx.ts`, `refs.ts`, `markdown.ts`, `loadLegends.ts`. Database files: `db/schema.ts`, `db/plan.ts`, `db/import.ts`, `db/client.ts`.
9. Scripts are `audit:content` and `db:import` (the plain names are pnpm built-ins).
10. Hooks use the current `.kiro/hooks/*.json` format.
