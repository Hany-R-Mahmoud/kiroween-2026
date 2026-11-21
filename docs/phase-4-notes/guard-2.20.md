# Guard and security pass 2.20: skeleton play core
Scope: `skeleton/src/play/*`, `skeleton/src/keepers/*` and their tests (`play-*`, `token.property`, `keepers-*`, `display-name`).
Lanes run: clean-code (play, keepers sources), test (play and keepers tests), security (trust boundaries). Docs lane: no docs in scope. Task text also names `theme/hub.ts`; the owner's scope for this pass is play and keepers only, so it was not reviewed.

## Findings and fixes
1. `play/token.ts` `decode` used `throw 0` (non-Error throw literal) in five places. Replaced with a `reject()` helper that throws the fixed `PlayError('session')`. Behavior unchanged: the catch already mapped every failure to that error. Severity: low (clean code).

## Checked, no finding
- Fair play: the browser sends intentions only (`.strict()` schemas refuse user id, score, counts, status, seed). Counts, fear, score and status are computed in `engine.ts`. Repeated wrong option is refused, so no fear farming. Hint 2 charges once per slot. Hotspot fear applies once per hotspot and only when served role equals authored role. Final slot stays locked until the others are solved. Win needs all slots and the true lead.
- No answer leaks: `view.ts` never reads `correctIndex`, hotspot roles, swaps, true version, an unearned Hint 2 anchor, or an in-progress seed. Questions and options appear only for opened slots. Lead lists use content order and the same fields for true and dead leads. Seed and curse text appear only in `ended`. Property 3 (secrecy) and Property 4 (option position) cover this.
- Guest token: AES-256-GCM, random 12-byte IV, AAD binds kind and legend, expiry checked, every failure is the same `PlayError('session')`, key length checked and never echoed. Tests cover tamper at every position, truncation, wrong legend, wrong kind, expiry, wrong key, identical message and status.
- Input validation: ids by `ID_RE`, tokens by `TOKEN_RE` with a 4000 char cap, answers 1 to 40 chars, option 0 to 3. Play state from a token or the database is re-parsed with the strict `playStateSchema`; an unusable state is a fixed error or an abandoned row, never partly used.
- Ownership: every store call takes the verified `visitor.id`; the memory store matches id, user, status and rev.
- Errors: `PlayError` messages come from a fixed table. `KeepersImportError` names table and SQLSTATE only. `NoRunError` is a fixed-message `RunError`.
- Keepers: the atlas view type has no answers; details map only on the game server side. Importer uses drizzle parameterised queries in one transaction. The parser reads a trusted repo file, no ReDoS-prone patterns.
- No `Math.random`, `console` or `process.env` in scope.

## Residual risks (no code change, by design or outside scope)
- Guest replay: a guest can reuse an older token to retry a wrong answer without carrying its fear. A stateless token cannot prevent this. Guest runs store no score or progress, so only that guest's own run is affected. Signed-in runs use `rev` and are not affected.
- Tutorial answers cost no fear by spec (3 details, short answers), so a script could guess without limit. Rate limiting belongs to the server function layer (later task); it should apply to `actInTutorial`.
- Store or driver errors that are not `PlayError` or `RunError` propagate from the service. The server functions (task 5) must map unknown errors to `unavailable`.
- `reading_time_min` has no upper bound in the parser; a huge value fails at import with the fixed SQLSTATE message. Trusted file, left as is.

## Checks
- `pnpm typecheck` (skeleton): clean.
- `pnpm test` (skeleton): 46 files, 691 passed, 7 expected fail (the known content findings).
