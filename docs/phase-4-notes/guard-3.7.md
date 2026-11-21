# Guard pass 3.7: schema and import work

Lanes: clean-code (src/db/playStore.ts, keepersRead.ts, keepers/import.ts, scripts, schema, migration 0003) and test (reader-privileges, keepers tests). No DB writes, no migration, no import run.

## Fixed
1. `playStore.ts` carried a copy of the `guard` error wrapper from `runStore.ts` (DRY). `runStore.ts` now exports `guard`; `playStore.ts` imports it.
2. `keepersRead.ts` `getKeepersNote` selected from `keepers_note` with only `limit(1)`. It now filters on `id = 'keepers-note'`, matching the table's CHECK constraint, so a stray row cannot be served.

## Checked, no finding
- playStore: every statement filters on `user_id`; `save`/`end` check `rev` and `in_progress`; `end` is one transaction; `markTutorialDone` uses ON CONFLICT DO NOTHING; unusable state is closed as abandoned. Parameterized via drizzle.
- keepers/import.ts: one transaction, row lock on the note, idempotent by hash and detail count, errors carry table and SQLSTATE only. Script prints no connection data.
- Migration 0003 matches schema.ts; a single `GRANT SELECT ON keepers_note TO atlas_reader`; no grant on details, flags or runs.
- Reader checks and tests assert exactly the new privilege and the refusals; no mocks.

## Noted, left alone (migration already applied, out of scope to change)
- `keepers_note_details.ordinal` has no unique constraint; the importer replaces all rows in one transaction, so duplicates cannot arise through it.

## Verification
`pnpm --filter @kiroween/skeleton typecheck` clean; test: 46 files, 691 passed, 7 expected fail.
