# Phase 6 final local gates (task 8.6)

| Gate | Result |
|---|---|
| `pnpm -r test` | Pass. skeleton 884 passed + 8 expected fail (892, 67 files); atlas 283 (27 files); game 373 (39 files). |
| `pnpm -r typecheck` | Pass, clean in skeleton, atlas, game. |
| Production builds | Pass. `vite build` for atlas and game both succeed. |
| `vercel.json` (root, atlas, game) | Unchanged: `git diff HEAD` empty for all three and for `skeleton/src/deploy/vercelRules.ts`. Each still has `git.deploymentEnabled` = `{"*": false, "main": true}` and apps keep `installCommand` and `regions`. |
| content/, assets/ | `git diff --stat` empty for both. |
| Parser, generator, audit, auth, access rule, score formula, play rules, token format, rate limit | No file touched (none in the modified list). |
| Database | `skeleton/src/db/atlasRead.ts` touched (task 3.1): the `listLegends` assets SELECT also matches `%-atlas-hero-01` and returns `hero` on each summary. Same Drizzle builder, same columns (`legendId`, `id`, `size`), no schema, migration, role or write change. Needed for the home card image. `skeleton/src/atlas/view.ts` gained `heroOf` and an optional `hero` field (read-side view only). |
| `apps/atlas/scripts/pipe-response.mjs` | Kept, justified. A local-only Node server helper (`pnpm start`, not used on Vercel). Added a 5-line early return when `res.destroyed` so a client leaving before the body starts no longer crashes the local server with `ERR_STREAM_UNABLE_TO_PIPE`. It crashed the browser checks in 8.2. Existing 2 pipe-response tests pass. No effect on any app behaviour or on production. |
| `skeleton/package.json` | One added `exports` entry `./design/ui.css`. No dependency change. |
| Dependencies | `git diff HEAD` on all `package.json` files and `pnpm-lock.yaml`: no change. No new runtime dependency. |
| Secrets | Scan of the diff (added lines) and all 55 untracked files for connection strings, key/token/password assignments, private keys, JWT-like strings: no finding. `.env` not read. |
| Fonts | New CSS uses only `var(--font-ui)` (existing token); no new `font-family` literal, `@font-face` or font package. The font test passes within the full suite. |
| Images | No image file added or modified anywhere (checked tracked and untracked). Nothing added under `docs/` is an image. |
| Screenshots | Only under `.debug/`; `.gitignore:32` ignores `.debug/` and `git ls-files .debug` is empty. |

Blocked gates: none. No file under `content/` or `assets/` edited.

## Re-run after F1 to F4 (task 8.F6)
| Gate | Result |
|---|---|
| `pnpm -r test` (run per package) | Pass. skeleton 887 passed + 8 expected fail (895, 68 files); atlas 284 passed (28 files); game 385 passed (41 files). |
| Typecheck (`tsc --noEmit`) | Clean in skeleton, atlas, game. |
| Production builds | Pass. `pnpm build` succeeds for atlas and game. |
| `vercel.json` (root, atlas, game), `skeleton/src/deploy/vercelRules.ts` | `git diff HEAD` empty. |
| content/, assets/ | `git diff HEAD` and `git status` empty. |
| Dependencies | No change to `pnpm-lock.yaml`, root, atlas or game `package.json`. `skeleton/package.json` still only has the one `./design/ui.css` exports entry from 8.6. |
| Protected areas | F1 to F4 changed only CSS, components and tests under `apps/game`; no parser, generator, auth, access, score, rate-limit or DB file. |
| Secrets | Scan of added diff lines and all 60 untracked files: no finding. No `.env` in the untracked list; `.env` not opened. |
| Owner feedback | F1 to F4 all marked done; no new items. |
Blocked gates: none.

## Re-run after F5 to F8 (checkpoint 9.5, task 10.F9)
| Gate | Result |
|---|---|
| `pnpm test` per package | Pass. skeleton 893 passed + 8 expected fail (901, 68 files); atlas 287 passed (28 files); game 389 passed (41 files). 0 failed. |
| Typecheck (`pnpm -r typecheck`) | Clean in skeleton, atlas, game. |
| Production builds (`pnpm -r build`) | Pass for atlas and game. |
| `vercel.json` (root, atlas, game), `skeleton/src/deploy/vercelRules.ts` | `git diff HEAD` empty. |
| content/, assets/, `skeleton/src/**` (play, engine, view, token) | `git diff HEAD` and `git status` empty. Only skeleton test files changed. |
| Dependencies | No change to `pnpm-lock.yaml` or any `package.json`. |
| Secrets | `scripts/scan-secrets.mjs` (never opens `.env`): no finding. No `.env` in the changed or untracked list. |
| Screenshots | Only in `.debug/phase-6/f9/` (git-ignored). |
Blocked gates: none.

## Re-run with F9 in place (checkpoint 9.5, task 10.F12)
| Gate | Result |
|---|---|
| `pnpm test` per package (background, logs in `.debug/phase-6/f12/`) | Pass. skeleton 913 passed + 8 expected fail (921, 69 files); atlas 302 passed (29 files); game 399 passed (42 files). 0 failed. |
| Typecheck (`pnpm -r typecheck`) | Clean in skeleton, atlas, game (0 `error TS`). |
| Production builds (`pnpm -r build`) | Pass for atlas and game. |
| `vercel.json` (root, atlas, game) | `git diff HEAD` empty. |
| `content/`, `assets/`, `skeleton/src/play/**` | `git diff HEAD` and `git status` empty. |
| `skeleton/src` other changes | Only `client.ts` (+2), `index.ts` (+1) and the new `assets/imageCdn.ts` and `assets/imageBaseContext.ts` from F9 (new files; helper and context, no play logic). |
| Dependencies | No change to `pnpm-lock.yaml` or any `package.json`. |
| `skeleton/src/deploy/vercelRules.ts` | One line changed (1 insertion, 1 deletion), the `CSP` constant: `img-src 'self' data:;` became `img-src 'self' data: https://ik.imagekit.io;`. Nothing else in the file changed. |
| `.env.example` | Gained `IMAGE_CDN_URL=` with no value (name and a comment only; the comment's example `https://ik.imagekit.io/<id>` is a public URL placeholder, not a secret). |
| Secrets | `scripts/scan-secrets.mjs`: no finding. Added diff lines and the 9 untracked non-`.debug` files scanned with a pattern set (connection strings with credentials, AWS and GitHub keys, private keys, long secret assignments): no finding. No `.env` in the changed or untracked list; `.env` not opened. |
| Screenshots | Only in `.debug/phase-6/` (git-ignored). |
| Owner feedback | Read `owner-feedback.md`: F1 to F9 all done; no new items. |
Blocked gates: none.
