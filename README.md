# Kiroween 2026: Legends

A horror lore engine and two apps built from it: a worldwide legends atlas told in documentary style, and a single-player point-and-click investigation game that cannot be solved without reading the atlas. Entry for the Kiroween 2026 hackathon, Skeleton Crew category.

## Live

- Atlas: https://trick-or-told.vercel.app/
- Game: https://trick-or-told.vercel.app/game/

The atlas is open to everyone. In the game a guest can play the tutorial and one legend's world; an account (email and password, or Google) unlocks every world and keeps progress, score and run history.

## How it fits together

- `skeleton/`: the shared lore engine: content parsing, seeded randomness, the puzzle generator, gated hints, deep links into story chapters, theme packs, the book reader, the mood layer, auth and progress.
- `apps/atlas/`: the public legends atlas (TanStack Start, React, Tailwind). Owns `/` and `/media`.
- `apps/game/`: the investigation game. Owns `/game` and is reached through the atlas domain.
- `content/` holds the legend texts and `assets/` the images; both reach the apps through an import into Neon Postgres, not from app code.
- Each run has its own seed. The seed picks the facts, puzzle types, wrong answers, hotspot roles and which story version is the true lead. Every puzzle answer exists only in a legend chapter, and Hint 2 opens the atlas at that chapter.

Production runs on two Vercel projects in one domain (the atlas forwards `/game` to the game project) and one Neon Postgres database. Details: `docs/phase-5-handover.md` and `docs/tech-decisions.md`.

## Run locally

Requirements: Node 22 or later, pnpm 9, and a Neon database branch. Copy `.env.example` to `.env` at the repo root and fill in the values (names only are listed there; see `docs/tech-decisions.md`).

```sh
pnpm install
pnpm --filter @kiroween/skeleton db:migrate        # first time, on your own dev branch
pnpm --filter @kiroween/skeleton db:import         # the legends
pnpm --filter @kiroween/skeleton db:import-keepers-note
pnpm --filter @kiroween/atlas dev                  # http://localhost:3001/
pnpm --filter @kiroween/game dev                   # http://localhost:3000/game/
```

Set `ATLAS_ORIGIN=http://localhost:3001` locally so the game's images and Hint 2 links reach the atlas.

## Tests

```sh
pnpm -r test          # every unit and property test; no database, no network
pnpm -r typecheck
pnpm --filter @kiroween/atlas test:browser -- --base http://localhost:3001   # book reader in headless Chrome, against a running atlas
```

The puzzle generator is covered by property tests (fast-check): every seed gives solvable puzzles with exactly one correct answer, that answer is in the linked chapter, and the true lead can always be deduced.

## How Kiro was used

Every phase was planned as a Kiro spec (requirements, design, tasks), run task by task, with steering files for the product rules, tech stack, design and right-to-left support, hooks for content validation, physical-CSS checks and the skeleton tests, a custom balance-reviewer agent, and the Neon MCP server for database work. The full log, phase by phase, is in [docs/kiro-usage.md](docs/kiro-usage.md).

## Disclosure

Legend research drafts and visual assets were prepared with AI tools outside Kiro and imported and validated through Kiro hooks. All code, specs, steering and tests were built in Kiro IDE.

Images are delivered through ImageKit (free plan) from our own originals; no image is added or changed there, and the apps fall back to their own `/media/` files when `IMAGE_CDN_URL` is unset.

## Credits

- Fonts: all served from the app through `@fontsource` packages, licensed under the SIL Open Font License 1.1 (OFL-1.1).
- Map outline: Made with Natural Earth. Natural Earth vector data is in the public domain.
- Libraries that ship in the apps: React, TanStack Router and Start, Tailwind CSS, pg and zod (MIT); Neon Auth (`@neon/auth`) and Drizzle ORM (Apache-2.0).

## License

MIT, see `LICENSE`.
