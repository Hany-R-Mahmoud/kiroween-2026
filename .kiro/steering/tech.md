---
inclusion: always
---
# Tech

## Stack
- TanStack Start, React, TypeScript (`strict: true`), Tailwind CSS.
- Neon Postgres for content, progress and runs. Neon Auth with Google and username/password.
- Vercel hosting. Git deployments only for `main` (`vercel.json`). Both apps deploy under one domain on separate paths.
- Installable web app, mobile-first, good on desktop.

## Workspace
- pnpm workspace: `skeleton/`, `apps/game/`, `apps/atlas/`. Content in `content/`, images in `assets/`.
- Apps import shared logic from `@kiroween/skeleton`. Game logic and shared types go in the skeleton, never copied between apps.
- Do not edit files under `content/` or `assets/` from app code. Content reaches the apps through the Neon import.

## Testing
- Vitest. The puzzle generator uses property-based tests (fast-check): every seed yields solvable puzzles; exactly one correct answer; the answer appears in the linked chapter; the true lead is always deducible; hotspot roles never leave a world unsolvable.
- Run the property tests after any change to the generator, RNG or lead logic.

## Secrets
- No secrets, tokens or connection strings in code, docs, tests or committed config. Use environment variables; names are listed in `.env.example`.
- Validate input at server boundaries. Use parameterized queries only.
