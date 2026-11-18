# Tech decisions

Versions read from the npm registry during Phase 0 setup.

## Pinned now

| Item | Pin | Why |
|---|---|---|
| pnpm | 9.15.9 (`packageManager` in root `package.json`) | Version installed on this machine. pnpm 12.21.0 is current on npm, but a pin we cannot run locally would break `pnpm install` for the owner. Move to 12.x deliberately in Phase 1 if wanted. |
| Node | `>=22` (`engines`); machine runs 24.13.1 | TanStack Start, Vite and Vercel all support current LTS. |
| Workspace | `pnpm-workspace.yaml`: `skeleton`, `apps/*` | Matches the agreed layout. |

No dependencies are installed. The workspace packages only declare names, so there is no lockfile yet.

## Planned for Phase 1 (not installed, not pinned)

Latest on npm today. Compatibility between them is not yet tested together.

| Package | Latest |
|---|---|
| @tanstack/react-start | 1.169.5 |
| react | 19.3.1 |
| tailwindcss | 4.3.5 |
| vite | 8.3.8 |
| vitest | 5.1.1 |
| fast-check | 4.10.3 |
| typescript | 7.0.2 |

Open risk: TypeScript 7.0 is a major version (native compiler). Confirm that TanStack Start, Vite and Vitest work with it in Phase 1. If not, pin the latest 5.x or 6.x. Pin exact versions in the lockfile once `pnpm install` has run clean.

## Other choices

- Neon Auth env var names in `.env.example` are our best guess and must be confirmed against the Neon Auth docs in Phase 1.
- `scripts/check-legend.mjs` is plain Node with no dependencies, so the content hook works before any install.
