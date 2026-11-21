# Mid-way check: Hall, tutorial and Banshee world

## Results
`pnpm -r typecheck`: clean in skeleton, `@kiroween/atlas`, `@kiroween/game`.
`pnpm -r test` (no `--run` flag):
| Package | Files | Tests |
|---|---|---|
| skeleton | 46 | 691 passed, 7 expected fail (698) |
| @kiroween/atlas | 10 | 161 passed |
| @kiroween/game | 18 | 206 passed |

## Run it locally (two terminals, repo root)
The root `.env` must exist (database and auth values; set `ATLAS_ORIGIN=http://localhost:3001` so hall links reach the atlas).

1. Atlas, port 3001 (also serves `/media` and the Keeper's Note):
   `pnpm --filter @kiroween/atlas dev`
   Open http://localhost:3001/
2. Game, port 3000, base path `/game`:
   `pnpm --filter @kiroween/game dev`
   Open http://localhost:3000/game/

Package names are `@kiroween/atlas` and `@kiroween/game` (a bare `--filter atlas` matches nothing). The game needs the atlas dev server running, because images are loaded from the atlas `/media`.

## Try-list
Hall (`/game/`)
- Pan the scene by drag, arrow keys and the buttons. Tab to a tap region; Enter and Space work like a click.
- Open the ledger, the clock (hours left) and the cabinet (12 empty slots). Close each with the button and with Escape; focus should return to the region you tapped.
- Tap lamp, jars and window (decoys give a line, nothing else).
- Tap a door before the tutorial: it sends you to the tutorial.

Tutorial (`/game/tutorial`)
- Check the pan prompt. The corkboard sits past the right edge at 390 px width.
- Tap each of the seven objects; the mirror gives a short fear event.
- Open the drawer, try a wrong code (fixed refusal), use Hint 1 (highlight), then Hint 2 (atlas opens in a new tab at the Keeper's Note). Enter the code, see the key and the glowing first cabinet slot, go back to the hall.

Banshee world
- From the hall, enter Banshee (guest world). Open each of the three scenes with the scene buttons.
- Tap decoys, then use Hint 1 and Hint 2 on a puzzle. Answer wrong until the fear meter fills and the room restarts; read the restart notice, dismiss it (focus goes to the scene heading).
- Follow a lead to a dead end and read its proof in the atlas.
- Win: ending panel with curse prose, relic, score and Seed. Back in the hall the cabinet shows the relic.
- Sign in, leave and come back: the run resumes.
- Check at 390 px width and with reduced motion on (the toggle at the page bottom).
- Add `?layout=1` to a world URL (dev only) to see tap boxes.
