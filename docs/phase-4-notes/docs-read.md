# Phase 4 docs read (task 1.1)

Date read: 2026-11-20. Skill: `read-the-damn-docs`.

**Status key.** READ = page fetched and read in full or by section. LOCAL = the page could not be fetched, so the installed package source or types were read instead. SNIPPET = only the search-result summary of the page was seen. The fetch tool could not resolve `tanstack.com`, `developer.mozilla.org`, `neon.com` or `raw.githubusercontent.com` (DNS error on every attempt). Only `nodejs.org` and `orm.drizzle.team` were reachable. Nothing below marked SNIPPET or LOCAL is confirmed against the current page. Re-read those pages when network access allows.

Installed versions: `@tanstack/react-start` 1.169.5 (`start-client-core` 1.170.39), `drizzle-orm` 0.45.4, `drizzle-kit` 0.31.11, Node 24.13.1 (local), `pg` 8.23.1.

## TanStack Start

| Page | Status | Date |
|---|---|---|
| https://tanstack.com/start/latest/docs/framework/react/guide/server-functions | SNIPPET | 2026-11-20 |
| https://tanstack.com/start/latest/docs/framework/react/guide/middleware | SNIPPET | 2026-11-20 |
| https://tanstack.com/start/latest/docs/framework/react/guide/authentication-server-primitives (CSRF) | SNIPPET | 2026-11-20 |
| Installed `@tanstack/start-client-core` types (`createServerFn.d.ts`, `createCsrfMiddleware.d.ts`) and `apps/game/src/start.ts` | LOCAL | 2026-11-20 |

Facts taken:
- Server functions are same-origin RPC endpoints. Requests are checked with `Sec-Fetch-Site`, then `Origin`, then `Referer`. Public or cross-origin endpoints belong in server routes. Matches the design's trust boundary.
- `createCsrfMiddleware` exists in 1.169.5 with options `origin`, `secFetchSite`, `filter` and a failure response. `apps/game/src/start.ts` already lists it as a request middleware with a `filter` on `handlerType === 'serverFn'`. The comment there says Start applies the default CSRF check only when the app has no `start.ts`. Every new server function is covered as long as that filter stays. Matches the design ("CSRF middleware kept").
- Every server function is callable by a direct POST regardless of route guards, so each one must authorize itself (`requireUser`). Matches design 7.14.

## Node `crypto` AES-256-GCM

| Page | Status | Date |
|---|---|---|
| https://nodejs.org/api/crypto.html (`createCipheriv`, `createDecipheriv`, `cipher.setAAD`, `cipher.getAuthTag`, `decipher.setAuthTag`) | READ (by section) | 2026-11-20 |

Facts taken:
- `createCipheriv('aes-256-gcm', key32, iv12, { authTagLength: 16 })`. In GCM mode `authTagLength` is optional and defaults to 16 bytes.
- `setAAD` must be called before `update`. `getAuthTag` only after `final`. On decrypt, `setAuthTag` must be called before `final`, and `final` throws if the data or tag was altered.
- Node 26 refuses GCM tags other than 128 bits unless `authTagLength` is passed to `createDecipheriv`. Node 20.13 and 22 deprecate it. **Implementation note:** pass `{ authTagLength: 16 }` on the decipher and check the tag is exactly 16 bytes, so a truncated tag cannot be accepted on any Node version.
- IVs need not be secret. A fresh random 12-byte IV per token (design) is correct.

No difference from the design.

## MDN pointer events, pointer capture, `touch-action`

| Page | Status | Date |
|---|---|---|
| https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events | SNIPPET (fetch failed) | 2026-11-20 |
| https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture | SNIPPET | 2026-11-20 |
| https://developer.mozilla.org/en-US/docs/Web/API/Element/lostpointercapture_event | SNIPPET | 2026-11-20 |
| https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action | SNIPPET (fetch failed; only the summary and third-party pages saw `pan-y`) | 2026-11-20 |
| https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/drag (cross-check, search summary) | SNIPPET | 2026-11-20 |

Facts taken (unconfirmed against the full pages):
- `setPointerCapture(pointerId)` retargets later events for that pointer to the element until `releasePointerCapture` or `pointerup`. `lostpointercapture` fires after release. Chrome's drag guide says to clear the dragging state on `lostpointercapture` and also handle `pointercancel`.
- `touch-action: pan-y` lets the browser handle vertical panning and leaves horizontal gestures to script. Matches the design (`touch-action: pan-y` on the viewer).
- **Implementation note:** the viewer should end a drag on `pointerup`, `pointercancel` and `lostpointercapture`, not only `pointerup`.

No difference from the design found. The full MDN pages still need a read before task 6.4.

## Neon and Drizzle migrations

| Page | Status | Date |
|---|---|---|
| https://orm.drizzle.team/docs/migrations | READ (first 4.6 KB) | 2026-11-20 |
| https://orm.drizzle.team/docs/drizzle-kit-generate | READ | 2026-11-20 |
| https://orm.drizzle.team/docs/drizzle-kit-migrate | READ | 2026-11-20 |
| https://neon.com/docs/guides/drizzle-migrations | SNIPPET (fetch failed) | 2026-11-20 |
| https://neon.com/docs/guides/drizzle | SNIPPET (fetch failed) | 2026-11-20 |
| `skeleton/drizzle.config.ts`, `skeleton/drizzle/` | LOCAL | 2026-11-20 |

Facts taken:
- `drizzle-kit generate` diffs the schema files against the latest snapshot and writes SQL. `drizzle-kit migrate` reads the migration files, compares with the `__drizzle_migrations` log table (schema `drizzle`), and applies the unapplied ones. `--custom` writes an empty file for hand-written SQL such as a `GRANT`.
- Neon snippets: migrations run against a branch's connection string. The repo already uses the unpooled string (`DATABASE_URL_UNPOOLED`) for `migrate`, which is the right choice for DDL.

**Difference from the design (not a contradiction):** the current Drizzle docs show a folder-per-migration layout (`<timestamp>_<name>/migration.sql` and `snapshot.json`). The installed `drizzle-kit` 0.31.11 and the repo use flat files (`drizzle/0000_*.sql`, `drizzle/meta/*_snapshot.json`, `_journal.json`). Task 3.3 should follow the repo's installed behaviour and should not upgrade `drizzle-kit`. The design only says "generate the Drizzle migration", so no design text changes.

## Differences from the design

None that contradicts it. Two points the implementation must carry:
1. This repo's `createServerFn` input check is `.validator(...)` (installed 1.169.5 types). The search results suggest newer or older releases name it `inputValidator`. Use what the installed types accept and run typecheck.
2. Decipher with `authTagLength: 16` (above).

## Open gap

TanStack Start (3 pages), MDN (4 pages) and Neon (2 pages) were not read in full. The facts above for them come from search summaries and the installed package. This is reported to the owner in the task result.
## 6.2 pan helpers
MDN pointer-event docs were unreachable (no network). Local knowledge and the installed TypeScript DOM types were used. The helpers are pure and use no pointer API.
## Task 2.20
- No network used. Skills `agent-guard` and `agent-security` were loaded and applied in this thread only (no sub-agents, no change-scan script run). Lanes: clean-code, test, security.

## Task 10.1 (Kiro custom agents and hooks)
- 2026-11-20. Read in full: kiro.dev/docs/custom-agents/configuration-reference/, kiro.dev/docs/hooks/, kiro.dev/docs/hooks/types/. Local: `.kiro/hooks/*.json`, `.kiro/steering/i18n-rtl.md`. Chosen formats and the check for an existing RTL hook are in `docs/phase-4-notes/kiro-docs.md`. No RTL hook exists.
