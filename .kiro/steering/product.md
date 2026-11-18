---
inclusion: always
---
# Product

## Parts
- **Skeleton** (`skeleton/`): a horror lore engine. Content packs, seeded randomness, puzzle generator, gated reveal (hints), deep links into story chapters, per-legend theme packs, pannable scene explorer, auth and progress.
- **Atlas** (`apps/atlas`): worldwide scary legends told in documentary style. Public. No sign-in needed.
- **Game** (`apps/game`): single-player point-and-click investigation. Multiplayer is deferred and must not be built.

## Rules
- The game cannot be solved without the atlas. Puzzle answers exist only in the legend chapters.
- Hint 1 is free and points inside the scene. Hint 2 raises the fear meter and opens the atlas at the exact chapter anchor (`<legend-id>--ch-<n>`). A full fear meter restarts the room.
- Each run has a random seed. The seed picks facts, puzzle types, wrong answers, hotspot roles and which story version is the true lead. Never use `Math.random` for game logic; use the seeded RNG.
- Competing versions create lead chains. Wrong leads end in a dead end that shows a contradiction. The true lead can always be found by comparing versions in the atlas.
- Every seed must produce solvable puzzles with exactly one correct answer that exists in the linked chapter.
- Structure: the archive house is the hub and holds the tutorial room. Each door leads to one legend's world.
- Rooms are wide panned scenes. Hotspots are meaningful or decoys; the player learns which only by trying.
- Content is served from Neon, not hardcoded.

## Access
- Guests: tutorial plus one legend world. Atlas fully open.
- Accounts (Google or username/password): store progress, completed worlds, score, run history.
- A judge test account with full access exists. Its credentials go only in the private Devpost field, never in the repo.

## Reference
Full decisions: `docs/planning/01-decisions.md`.
