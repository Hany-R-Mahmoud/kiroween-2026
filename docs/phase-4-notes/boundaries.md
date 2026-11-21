# Phase 4 boundaries check (task 11.5)

Method: read-only `git status`, `git diff`, `git log`, `git show HEAD:<file>` (stdout only), one throwaway comparison script in /tmp, and the secret scan test. Nothing was reverted or edited outside this report.

Overall: no violation of the Phase 4 boundaries. One item for the owner to confirm (content/ was edited by the owner, see c). One minor note (e).

## a. assets/
Unchanged. `git status` and `git diff --stat -- assets` are empty.

## b. vercel.json
Unchanged. Empty `git status` and diff.

## c. content/
Changed (12 files, all under `content/legends/`): baba-yaga, banshee, chupacabra, draugr, el-coco, flying-dutchman, gumiho, jersey-devil, naddaha, spring-heeled-jack, vetala, yuki-onna (297 insertions, 297 deletions).

- Nothing outside `content/legends/` changed. `keepers-note.md`, `hub-and-tutorial.md`, `legend-format.md` and every other content file are unchanged.
- These match the owner's log (`kiroween-2026-pack/planning/14-content-fixes-phase-4.md`: statements, tap texts, lead and dead-end lines, true-or-told slot labels, Flying Dutchman tags). No Phase 4 task is recorded as editing content/.
- Structural check, old (`HEAD`) against new, per legend: fact rows keep the same id, anchor, version, types, answer, wrong answers and difficulty; hotspot rows keep id, scene, name, role and linked facts/leads; line counts outside tables are equal. Only the fact statement, the tap text, the lead step/dead-end text, the 9 true-or-told slot labels (`p-5 Told or recorded` to `p-5`) and the Flying Dutchman tag note changed. The slot candidate fact lists are identical in all 12 files.
- Flying Dutchman: `[D]` moved to the statement start, `[T]` removed, the note above the table updated; two lead steps lost their `(f-26)`-style fact ids. This matches the log.
- Not checkable: a comparison with the DB state at import time. The legend db:import was not found in any `docs/phase-4-notes` file, so I cannot confirm from the notes that it ran (see g).

## d. Phase 1 parser, generator, audit
Changed under `skeleton/src/{parser,generator,audit,model,rng,...}`: only
- `skeleton/src/generator/generate.ts` (1 line: passes `fact.anchor` to `makeHints`)
- `skeleton/src/generator/hints.ts` (`makeHints` takes the chosen fact's anchor and uses it for Hint 2)

Tests changed, matching `docs/phase-4-notes/phase1-changes.md`: `skeleton/test/generator.test.ts` (2 expectations), `skeleton/test/helpers/properties.ts` (hint-anchor property). That is three expectations. Parser, audit, rng, model, design, assets and locale directories: no change.

Other non-listed edits in skeleton (not Phase 1 logic): `skeleton/vitest.config.ts` (timeouts and `maxWorkers: 4`, iteration counts unchanged, comment explains), `skeleton/package.json` (adds `db:import-keepers-note`), `skeleton/scripts/check-reader-role.ts` (moves the checks into new `reader-checks.ts`).
Phase 2 file touched: `skeleton/src/db/runStore.ts` exports `guard` (one word, `export` added). Harmless and needed by `playStore.ts`.

## e. Phase 2 auth, access rule, score formula
- `skeleton/src/access/`, `skeleton/src/score/`, `skeleton/src/runs/`, `skeleton/src/account/`, `skeleton/src/guest/`: no diff.
- `apps/game/src/auth/`, `apps/game/src/server/auth.ts`, `middleware.ts`, `proxyPath.ts`: no diff.
- `canEnter` is still the single access rule; the game server and `play/service.ts` and `play/hall.ts` call it. `play/engine.ts` calls the existing `score()` with the same inputs.
- Edited game files with Phase 4 purpose: `apps/game/src/server/{db,env,functions}.ts`. `functions.ts` replaces the Phase 2 stub run functions (`publicRun`, run list) with play functions, as designed. `env.ts` adds `GAME_TOKEN_KEY`. Not a boundary violation.
- `skeleton/src/db/schema.ts`: only adds `runs.play_state`, `runs.rev` and three new tables; the existing `runs` constraints and indexes are untouched.

## f. Phase 3 atlas
Changed files in `apps/atlas`: `src/i18n/en.ts` (one key `footer.keepersNote`), `src/routes/__root.tsx` (footer link), `src/routes/legends.$legendId.tsx` (note branch), `src/server/functions.ts` (note read before the legend lookup, plus the anchor fallback for `keepers-note--ch-1`). New: `src/components/KeepersNotePage.tsx`, `test/keepers-note.test.tsx`. Nothing else in `apps/atlas`. Skeleton support: `skeleton/src/atlas/story.ts` adds two pure exports (`inlineMarks`, `stripMarks`) that the game uses; the existing `storyBlocks` is unchanged.

## g. Database
- Schema: only migration `0003_keepers_note_play_state.sql` (+ journal and snapshot 0003). It creates `keepers_note`, `keepers_note_details`, `player_flags`, adds `runs.play_state` and `runs.rev`, and grants SELECT on `keepers_note` to `atlas_reader` (owner approved, in `migration.md`). No other schema file or earlier migration changed.
- Imports recorded in `migration.md`: Keeper's Note import run 1 `imported`, run 2 `unchanged`. The one-off legend `db:import` for the owner's content fix is not recorded in `docs/phase-4-notes`. If it has not been run, the running game still shows the old text; the owner's log says it is needed.

## h. Secrets
- `pnpm --filter @kiroween/skeleton exec vitest run test/scan-secrets.test.ts`: 6 of 6 pass.
- Grep of the tree (excluding `.env`, node_modules, dist, .git) for connection strings with credentials, `npg_`, `sk-`, `AKIA`, JWT shapes: no matches.
- `GAME_TOKEN_KEY` appears in `.env.example` with an empty value and in code and docs as a name only.
- Note: one of my own check commands, which did not exclude `.env`, printed the local `.env` line holding `GAME_TOKEN_KEY` into the session log. The file is git-ignored and untracked, so nothing reached the repo, but the owner may want to rotate that local key if the session log is stored anywhere shared.

## i. .env
`.env` is ignored (`.gitignore:6`) and not tracked. `.env.example` gained two lines: a comment and `GAME_TOKEN_KEY=` (empty). No `.env` change is committed.

## Commits and pushes
`HEAD` is `33467cb Phase 4 prompt` (the owner's commit; branch is "ahead 1" of origin/main from it). All Phase 4 work is uncommitted in the working tree. No Phase 4 agent commit or push exists.
