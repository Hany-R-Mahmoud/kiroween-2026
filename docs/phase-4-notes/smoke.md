# Play smoke check (task 11.1)

Script: `skeleton/scripts/smoke-play.ts`. It builds on `apps/game/scripts/smoke.mjs` (same cookie jar, same server-function calls through Start's wire format) and is separate from it. It sits in `skeleton/` because that package has `pg`, `dotenv` and `tsx`; it reaches the game's copy of `seroval` by path, as `smoke.mjs` does.

Mode: through the real server functions of the game **dev server** (`vite dev`, port 3000) over HTTP, against `dev-skeleton-core`. The built server was not used.

## How it works
- It loads the root `.env` itself and stops before any request unless the hostnames of `DATABASE_URL_UNPOOLED`, `DATABASE_URL` and `ATLAS_DATABASE_URL` all start with the dev-skeleton-core endpoint. Only booleans are printed.
- The scripted player sees only the views the server functions return and atlas text (chapters, versions, Keeper's Note) read with the read-only atlas role through the atlas read functions. It uses the same reading rule as `skeleton/test/helpers/playFromAtlas.ts` (copied, with the overlap reader). Hotspot ids are the public layout ids from the `hotspots` table. It never reads a correct index, a role or a Seed.
- Test user: random email and password generated in the script, never printed. The user's id is kept in a temp file (ids only) so a crashed run can be cleaned by exact id with `--cleanup-file`.
- Cleanup, by exact id: `runs`, `player_flags`, then `neon_auth."user"` (the SQL fallback from Phase 2; sessions and accounts are deleted first only if the user delete is refused). It then counts rows left for those ids.

## Commands
1. `cd apps/game && pnpm exec vite dev --port 3000` (background)
2. `pnpm --filter @kiroween/skeleton exec tsx scripts/smoke-play.ts`
3. Stop the dev server.
4. Recovery only: `pnpm --filter @kiroween/skeleton exec tsx scripts/smoke-play.ts --cleanup-file`

## Result (26 of 26 steps pass)
```
PASS  guest finishes the tutorial from the Keeper's Note text and gets a receipt
PASS  guest starts banshee: view and token, no seed field
PASS  guest wins banshee through the server functions  (attempts 1)
PASS  a won guest Run has no token left to resume
PASS  sign up a test user
PASS  sign in with email and password
PASS  a fresh user has no tutorial flag
PASS  a guest cannot redeem a receipt  (status 401)
PASS  a forged receipt is refused and sets no flag  (status 400)
PASS  redeeming the guest receipt marks the tutorial done
PASS  a second redeem is harmless: same single row, same time
PASS  redeeming touched no run
PASS  user starts baba-yaga
PASS  client-reported score, counts, status, user id and seed are refused (top level and inside the action)
PASS  the refused calls changed nothing in the run row
PASS  user wins baba-yaga
PASS  runs row is won, finished, all slots solved
PASS  stored counts are the ones the server counted  (wrong 0, hint2 5)
PASS  stored score matches score() from those counts, and the won summary agrees  (475, expected 475)
PASS  user starts draugr
PASS  wrong answers and Hint 2 fill the fear meter: the server ends the Run as restarted
PASS  old row ended as restarted with a finish time
PASS  a new row is in progress with a different seed
PASS  stored wrong-answer count equals the answers the server refused  (stored 6, seen 6)
PASS  starting again resumes the new Run with fear 0 and no seed field
PASS  list my runs shows won, restarted and in progress
PASS  test users deleted by exact id (1)  (left: runs 0, flags 0, users 0, sessions 0, accounts 0)
```

## Notes
- The first full run failed two steps, both script bugs: the answer that fills the meter ends the Run and carries no reply, so the script undercounted wrong answers by one; and the cleanup compared a `uuid` column with text. Both fixed. The user that run left behind was removed by exact id with `--cleanup-file` (0 rows left). The second full run is the result above.
- Banshee is a known content finding (it loses on some seeds, `fairness.md`). The guest won on the first seed; the script retries up to 8 Runs, so a lost seed would show as `attempts` above 1, not as a failure.
- The Seed of an unfinished Run is compared in the script (new row differs from old) and never printed. No cookie, password, token or receipt is printed.
- The dev server was stopped afterwards.
