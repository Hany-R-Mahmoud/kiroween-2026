# Phase 0 handover

## Created

Folders: `skeleton/`, `apps/game/`, `apps/atlas/`, `.kiro/steering/`, `.kiro/hooks/`, `.kiro/settings/`, `scripts/`.

Files:
- `package.json`, `pnpm-workspace.yaml` (lists `skeleton` and `apps/*`; `pnpm -r list` shows all three)
- `skeleton/package.json`, `apps/game/package.json`, `apps/atlas/package.json`, plus `.gitkeep` in each folder
- `LICENSE` (MIT, holder is `<COPYRIGHT HOLDER>`), `README.md`, `.gitignore`, `.env.example`, `vercel.json`
- `.kiro/steering/{product,tech,content,i18n-rtl,design}.md`
- `.kiro/hooks/content-validate.kiro.hook`
- `.kiro/settings/mcp.json`
- `scripts/check-legend.mjs` (the checker the hook calls; plain Node, no dependencies)
- `docs/tech-decisions.md`, `docs/content-check.md`, `docs/phase-0-handover.md`

`content/`, `assets/` and the existing `docs/` files were not touched.

## Steering inclusion

| File | Included |
|---|---|
| product.md | Always |
| tech.md | Always |
| content.md | When a file matching `content/**` is in context |
| i18n-rtl.md | When a `.ts`, `.tsx`, `.css` or `.json` file under `apps/` or `skeleton/` is in context |
| design.md | When a `.tsx` or `.css` file under `apps/` or `skeleton/` is in context |

## Hook

Trigger: file saved matching `content/legends/*.md` (`fileEdited`). Action: asks the agent to run `node scripts/check-legend.mjs <file>` and report.

Script checks: sections 0-11 present; 5-7 chapters, each with a correct anchor, sources line, Hook line and 400-700 words; at least 24 facts (valid puzzle types, 3+ wrong answers, anchors exist, 6+ version-specific); no `[R]` fact in a `true-or-told` slot; 3+ lead chains; 12+ hotspots with 5+ decoys; 3-5 versions; 6+ sources; every `S<n>` used is defined.

The agent also checks by reading: 4+ documented and 4+ told facts, and `[Dramatization]` labels. The hook never edits the file.

## Content check

All 12 legends pass with no problems. Details in `docs/content-check.md`. Notes:
- Nine of the twelve files write the hotspot heading as `**Hotspots**` instead of `### Hotspots`. The script accepts both. Not a content error, but the format differs from `legend-format.md`, so the importer must accept both too.
- Naddaha has 6 chapters, which is allowed.
- I did not test the hook inside the IDE. I tested the script on all files and on one deliberately broken copy (undefined source tag), which it caught.

## Versions

See `docs/tech-decisions.md`. Pinned: pnpm 9.15.9 (the version installed here; pnpm 12.21.0 exists), Node `>=22`. No framework is installed. Latest registry versions are listed for Phase 1. TypeScript 7.0.2 is a new major and its compatibility with TanStack Start, Vite and Vitest is unverified.

## Needs your action

1. Fill in the copyright holder in `LICENSE`.
2. Authenticate the Neon MCP server in Kiro. I used the remote endpoint `https://mcp.neon.tech/mcp` with no credentials; I did not verify that it connects. If your Kiro version needs a different config shape, adjust `.kiro/settings/mcp.json`.
3. Confirm the Neon Auth variable names in `.env.example` (`NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `NEON_AUTH_JWKS_URL`). They are my guess and not checked against Neon docs.
4. Decide on pnpm 9 vs 12 before Phase 1.
5. No lockfile exists because no dependencies are installed. Nothing was committed.

Stopped here. Phase 1 not started.
