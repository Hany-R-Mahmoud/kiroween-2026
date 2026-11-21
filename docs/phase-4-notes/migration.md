# Phase 4 migration notes
## Task 3.3 (status: applied to dev-skeleton-core, 2026-11-20)
Migration file: `skeleton/drizzle/0003_keepers_note_play_state.sql` (journal and snapshot `0003` also written).
Schema edits: `skeleton/src/db/schema.ts` (`keepersNote`, `keepersNoteDetails`, `playerFlags`, `runs.playState`, `runs.rev`).
### Diff against the approved SQL
Form only (accepted):
- Inline `CHECK`s on `keepers_note` became named table constraints; `UNIQUE` on `anchor` is a named constraint.
- Quoted identifiers, `DEFAULT '{}'` without cast, two `ALTER TABLE` statements, `--> statement-breakpoint` markers, statement order.
Grant (owner approved): `GRANT SELECT ON "keepers_note" TO atlas_reader;` appended to the migration file. Also listed in the reader-role block of `docs/tech-decisions.md`.
### Applied
- Target: dev-skeleton-core only (endpoint ep-little-boat-arrb1poz, direct), confirmed by the orchestrator.
- Command: `pnpm --filter @kiroween/skeleton db:migrate`, succeeded on 2026-11-20 (0003 including the GRANT). Not re-applied.
### Verification (2026-11-20, throwaway script, deleted afterwards; writes ran in rolled-back transactions)
- `runs` has `play_state` and `rev`.
- Owner/game role: SELECT, INSERT, UPDATE on `keepers_note`, `keepers_note_details`, `player_flags`, `runs`; test inserts and a `runs` update succeeded.
- `atlas_reader`: SELECT only on `keepers_note` (no INSERT/UPDATE/DELETE); no SELECT on `keepers_note_details`, `player_flags`, `runs`.
- Atlas connection (`atlas_web`): can read `keepers_note`; refused (42501) on the other three and on DELETE from `keepers_note`.
- No missing grants. `db:check-reader` updates are task 3.6 and not done here.

## Task 3.5 (status: imported into dev-skeleton-core, 2026-11-20)
Importer: `skeleton/scripts/import-keepers-note.ts` (package script `db:import-keepers-note`), logic in `skeleton/src/keepers/import.ts`. One transaction; locks the `keepers_note` row, skips when `content_hash` and the detail row count match, otherwise deletes and reinserts both tables. Does not call the legend importer. Errors report only table and SQLSTATE.
Command: `pnpm --filter @kiroween/skeleton db:import-keepers-note`
- Run 1: `status: imported`, written `keepers_note` 1, `keepers_note_details` 3.
- Run 2: `status: unchanged`, written 0 and 0. Row counts after: `keepers_note` 1, `keepers_note_details` 3.
- Skeleton typecheck clean; skeleton tests 548 of 548.
