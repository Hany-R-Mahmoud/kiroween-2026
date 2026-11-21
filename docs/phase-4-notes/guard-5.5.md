# Guard 5.5: server layer (agent-guard, agent-security)

Scope: `apps/game/src/server/*`, `src/start.ts`, `scripts/*`, `skeleton/src/db/tutorialRead.ts`, `test/server.test.ts`.

## Checked, no finding
- CSRF: `start.ts` lists `csrf` explicitly for every server function and for POSTs to `/game/api/auth/`.
- `requireUser`: guests get a fixed 401 before the handler. `redeemTutorialReceipt`, `listMyRunsFn`, `myCompletedWorldsFn` use it.
- Ownership: the user id comes only from `getVisitor()`. Play functions pass `passThrough` bodies to the Play_Service, whose strict schemas refuse unknown keys (`invalid`, tested). The play store filters on `user_id`.
- Fixed errors: `safely()` maps `PlayError` and `RunError` to their fixed message and status. Anything else becomes the fixed `unavailable`. `StoreUnavailableError` drops the driver message.
- Cookie and log hygiene: `getVisitor` fails to guest. Auth logging is `warn`. Set-Cookie headers are appended one per cookie. No `console` in server code. `smoke.mjs` prints step results only.
- No secret echo: `EnvError` names the variable and never the value. `GAME_TOKEN_KEY` stays server only (built-output test). `tutorialRead.ts` is server-only and reads drawer rows through `guard()`.
- `static-file.mjs`: malformed percent paths, NUL and `..` give 400.

## Findings fixed
1. **Validator failure skipped the fixed mapping (medium).** `targetOf` threw `notFound()` inside `.validator()`, which runs outside `safely()`. It now only passes the value through. The id shape check (`legendIdOf`) runs inside `safely()` in `enterWorld` and `getWorldInfo`. A malformed body can no longer reach the client with a framework message. `passThrough` never throws, and the service's `parsePlay` raises the fixed `invalid`.
2. **`getShell` outside `safely()` (low).** `getEnv()` could throw an `EnvError` whose message names a variable, and Start serializes `message`. It now runs inside `safely()`.
3. **`serve-build.mjs` crash on a handler rejection (low).** `app.fetch` is wrapped. It answers a fixed 500 and keeps running.

## Tests
Two source tests added to `test/server.test.ts`: validators are only `passThrough` or the non-throwing `targetOf`, and `getShell` uses `safely()`.
Game typecheck clean, 138 tests pass. Skeleton typecheck clean, 691 tests pass (7 expected fail, unchanged).

## Residual
- `serve-build.mjs` listens on all interfaces. Local check script only. Binding to 127.0.0.1 would break `localhost` resolving to `::1` for `smoke.mjs`, so it was left.
- Tutorial answers have no rate limit (recorded earlier in `decisions.md`).
- Malformed JSON bodies are rejected by Start before our code runs. Its message is not under our control from this scope.
