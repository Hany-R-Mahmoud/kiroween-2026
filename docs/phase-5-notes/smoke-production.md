# Production smoke (task 10.6)

Deploy `967a7cf`, 2026-11-21. Site under test: `https://trick-or-told.vercel.app` (atlas, and the game through `/game`). Command (run from `skeleton/`; the local game build of the same commit shares 12 of 12 server-function ids with production):

    npx tsx scripts/smoke-prod.ts https://trick-or-told.vercel.app

Step and result only. No cookie, password, token or address was printed or written.

| Step | Result |
|---|---|
| headers `/` (atlas): nosniff, Referrer-Policy, frame blocking, CSP | PASS |
| headers `/game/` (game, through the proxy): same four | PASS |
| headers `/media` file: `Cache-Control` immutable | PASS |
| headers JS of atlas and of game: `Content-Encoding` | first run: FAIL (`fetch failed`, network error mid-step); rerun `--only headers`: 5 PASS |
| guest: Hall with one open door (`banshee`) and eleven locked | PASS |
| guest finishes the tutorial from the Keeper's Note text | PASS |
| guest starts and wins `banshee` | PASS |
| user (throw-away `example.com` address): sign up | PASS |
| user: World start before the tutorial refused (403, "Do the tutorial first.") | PASS |
| user: finishes the tutorial | PASS |
| user: starts and wins `baba-yaga` | PASS |
| user: the server's own run list shows the won row with the run's score | PASS |
| user: sign out | PASS |
| anchor: `/anchor/keepers-note--ch-1` → Keeper's Note page holds the anchor exactly once | PASS |
| leak: 88 responses before the end of a run hold no `correctIndex`, `trueVersionId`, `trueLead` or seed | PASS |
| burst: 429 within the first 40 tutorial answers | PASS (at answer 31, fixed text, 200×30 then 429×1) |
| key: limit behind the proxy keyed on the visitor | PASS (through the proxy: 429 at answer 31; then 5 of 5 refused straight at the game alias) |

Summary: all steps PASS (18 PASS and 1 network FAIL in the full run; the failed step passed on its rerun). No FINDING.

## Cleanup (Neon MCP, production branch `br-delicate-brook-art2crov`)

Temporary user id `ee8a7214-beb1-4c58-ad74-e36278ae164e` (not a secret).

| Tool | Statement / arguments | Result |
|---|---|---|
| `run_sql` | `select (select count(*) from neon_auth."user") as users_total, (select count(*) from neon_auth."user" where id = 'ee8a7214-…') as this_user, (select email like '%@example.com' from neon_auth."user" where id = 'ee8a7214-…') as example_com, (select count(*) from runs where user_id = 'ee8a7214-…') as runs, (select count(*) from runs) as runs_total, (select count(*) from player_flags where user_id = 'ee8a7214-…') as flags, (select count(*) from player_flags) as flags_total;` | 1 user total, this one, on `example.com`; 1 run; 1 flag |
| `delete_auth_user` | `auth_user_id: ee8a7214-beb1-4c58-ad74-e36278ae164e` | ok |
| `run_sql_transaction` | `DELETE FROM runs WHERE user_id = 'ee8a7214-beb1-4c58-ad74-e36278ae164e';` `DELETE FROM player_flags WHERE user_id = 'ee8a7214-beb1-4c58-ad74-e36278ae164e';` and the count select | auth user 0, runs 0, flags 0; users total 0, runs total 0 |
| `update_auth_allow_localhost` | `allow_localhost: false` | `allow_localhost: false` |
| `get_neon_auth_config` | production | `allow_localhost` false; trusted origins the two production origins; email/password on; Google shared; organization off |

The local id file was deleted.
