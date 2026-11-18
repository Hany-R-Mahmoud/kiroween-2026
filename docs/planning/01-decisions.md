# Kiroween 2026: locked decisions

Status: all decisions below are agreed. Names are the only item left, due 2026-12-01.

## Hackathon

| # | Decision |
|---|---|
| 1 | Category: Skeleton Crew (one skeleton template, two distinct apps built from it). |
| 2 | Solo entrant. |
| 3 | New public GitHub repo, MIT license, `/.kiro` committed at the root. All code is built in Kiro IDE. |
| 4 | Repo layout: `/skeleton`, `/apps/game`, `/apps/atlas`, `/.kiro`. Both apps deploy under one domain on separate paths. |
| 5 | Submission deadline 2026-12-04 14:00 PT. Target submit date 2026-12-03. |

## Product

| # | Decision |
|---|---|
| 6 | Skeleton: a horror lore engine. Content packs, seeded randomness, puzzle generator, gated reveal (hints), deep links into story chapters, per-legend theme packs, pannable scene explorer, auth and progress. |
| 7 | App 1, Atlas: worldwide scary legends told in documentary style. Public, no sign-in needed. |
| 8 | App 2, Game: single-player point-and-click investigation. Multiplayer is deferred until after the single-player game is stable. |
| 9 | The game cannot be solved without the atlas. Hints open the atlas at the exact chapter anchor. |
| 10 | Game structure: the archive house is the hub. The tutorial room is inside the hub. Each door leads to one legend's world with its own look. |
| 11 | Rooms are wide painted scenes the player pans with mouse or touch. Hotspots are either meaningful or decoys; the player only learns which by trying. |
| 12 | Each run has a random seed. The seed picks facts, puzzle types, wrong answers, hotspot roles and which story version is the true lead. |
| 13 | Competing witness versions create lead chains. Wrong leads end in dead ends that show a contradiction; the true lead can always be found by comparing versions in the atlas. |
| 14 | Hint 1 is free and points inside the scene. Hint 2 raises the fear meter and opens the atlas. A full fear meter restarts the room. |
| 15 | Property-based tests prove every seed produces solvable puzzles with exactly one correct answer that exists in the linked chapter. |

## Content

| # | Decision |
|---|---|
| 16 | Worldwide legends. Start with four, target 12, up to 16. |
| 17 | First four, written together: Flying Dutchman, Baba Yaga, Jersey Devil, Banshee. |
| 18 | Documentary storytelling: cold open, 5–7 chapters each ending on a hook, last chapter separates what is documented from what is told. |
| 19 | Real testimony is paraphrased and cited. No invented quotes for real people. Imagined scenes are labelled `[Dramatization]`. |
| 20 | Excluded: real crimes and murders, religion and scripture, occult instructions, sacred Indigenous beliefs, real tragedy sites, private addresses. Folklore creatures are allowed. |
| 21 | Content is stored on the server (Neon), not hardcoded. |
| 22 | Story text is English in v1. Audio narration is not in v1. |
| 23 | File format for every legend: [legend-format.md](../../content/legend-format.md). |

## Design

| # | Decision |
|---|---|
| 24 | One base design system plus one theme pack per legend that reflects its country and era. |
| 25 | Visual assets are generated with AI image tools whose terms grant ownership of the output. |
| 26 | English is the primary language. Arabic is built in but hidden behind a feature flag. All components are direction-aware (RTL and LTR) from day one. |

## Accounts and access

| # | Decision |
|---|---|
| 27 | Sign-in with Google or with username and password, both through Neon Auth. |
| 28 | Each account stores progress, completed worlds, score and run history. |
| 29 | Guests can play the tutorial and one legend world. The atlas is fully open without an account. |
| 30 | A judge test account with full access is created and its credentials go in the private Devpost submission field. |

## Tech

| Part | Choice |
|---|---|
| Apps | TanStack Start, React, TypeScript, Tailwind |
| Database | Neon Postgres |
| Auth | Neon Auth (Google + username/password) |
| Hosting | Vercel, Git deployments limited to `main` |
| Platform | Installable web app, mobile-first, works well on desktop |

## Deferred (not in the submission)

- Multiplayer traitors mode (each player on their own phone, joined by room code; single-phone mode as an option).
- Audio narration of stories.
- Arabic story content.
