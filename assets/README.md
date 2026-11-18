# Assets

Save every generated image under its asset ID as the file name, in the folder that matches its legend and surface. The ID, size, background and prompt for each image are in the "Visual assets" section of the legend file, or in `content/hub-and-tutorial.md` for hub and shared images.

| Folder | Holds | IDs that start with |
|---|---|---|
| `flying-dutchman/atlas/` | Atlas hero, chapter plates, map marker | `flying-dutchman-atlas-` |
| `flying-dutchman/game/` | Scenes, hotspot sprites, spirit, relic | `flying-dutchman-game-` |
| `flying-dutchman/shared/` | Textures, UI frames | `flying-dutchman-shared-` |
| `baba-yaga/…`, `jersey-devil/…`, `banshee/…` | Same pattern | `<legend-id>-<surface>-` |
| `hub/` | Archive hall, tutorial room, door frames | `hub-`, `tutorial-` |
| `shared/` | Atlas map, atlas hero, paper texture, game UI | `shared-` |

## File rules

- Name: `<asset-id>.png` (for example `banshee-game-scene-01.png`). Use `.webp` only for final exports.
- Transparent backgrounds stay PNG with alpha.
- Keep the exact size listed in the legend file.
- Before saving, check: no text or letters, no logos, no likeness of a film, game or real person, no gore.
- Keep a note of the tool and the date used for each batch in `assets/LOG.md` so the README can disclose it.
