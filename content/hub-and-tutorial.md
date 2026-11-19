# Hub, tutorial and shared assets

The twelve legend files cover each legend's world. This file covers what sits around them: the archive house (hub), the tutorial room, the atlas shell and the shared UI. Follow the art direction in [legend-format.md](legend-format.md).

## The archive house (hub)

**Premise.** The player is the new night archivist of an old house that collects legends from around the world. Each locked door holds one legend's curse. The player has until dawn to break them. The house is fiction, labelled as such in the atlas.

**Base palette (hub only):**

| Role | Hex |
|---|---|
| background | `#0E0B10` |
| surface | `#1C1620` |
| ink | `#E9E1D3` |
| muted ink | `#9C9285` |
| accent (candle) | `#E0A84B` |
| glow | `#F4D58D` |
| danger (fear) | `#B23A3A` |
| cold (spirit) | `#7FA7B5` |

**Fonts:** display `IM Fell English SC`, body `Source Serif 4`. UI labels `Inter`.

### Hub scene

`hub-game-scene-01` · the archive hall, panorama 8:3, 4096×1536.
Left to right: a reading desk with a brass lamp; a tall shelf of boxed files and jars; twelve legend doors spaced evenly across the hall in three groups of four, each carved differently; a grandfather clock showing the hours until dawn; a glass relic cabinet with twelve empty slots; a window with moonlight and fog.

### Hub hotspots

| hotspot_id | Object | Role | On tap |
|---|---|---|---|
| hub-desk-ledger | Archive ledger on the desk | meaningful | Opens run summary: seed, fear, time to dawn |
| hub-lamp | Brass lamp | decoy | Flickers, small sound |
| hub-clock | Grandfather clock | meaningful | Shows time left until dawn |
| hub-cabinet | Relic cabinet | meaningful | Shows earned relics |
| hub-door-dutchman | Door 1 | meaningful | Enters the Flying Dutchman world |
| hub-door-baba-yaga | Door 2 | meaningful | Enters the Baba Yaga world |
| hub-door-jersey-devil | Door 3 | meaningful | Enters the Jersey Devil world |
| hub-door-banshee | Door 4 | meaningful | Enters the Banshee world |
| hub-door-chupacabra | Door 5 | meaningful | Enters the Chupacabra world |
| hub-door-draugr | Door 6 | meaningful | Enters the Draugr world |
| hub-door-el-coco | Door 7 | meaningful | Enters the El Coco world |
| hub-door-gumiho | Door 8 | meaningful | Enters the Gumiho world |
| hub-door-naddaha | Door 9 | meaningful | Enters the Naddaha world |
| hub-door-spring-heeled-jack | Door 10 | meaningful | Enters the Spring-heeled Jack world |
| hub-door-vetala | Door 11 | meaningful | Enters the Vetala world |
| hub-door-yuki-onna | Door 12 | meaningful | Enters the Yuki-onna world |
| hub-jars | Specimen jars | decoy | Something moves inside, then nothing |
| hub-window | Fogged window | decoy | A handprint appears and fades |

Every door shows a lock until the tutorial is done. After that, guests can open one door, the guest world (Banshee by default, set by `GUEST_WORLD`); the other eleven show a sign-in prompt. Signed-in players can open all twelve.

## Tutorial room

`tutorial-game-scene-01` · the archivist's study, panorama 8:3, 4096×1536.
A small study behind the hall: a desk with a locked drawer, a corkboard of pinned notes, a typewriter, a candle, a cracked mirror, a coat stand, a bookshelf.

**Story.** The previous archivist left a note: the drawer holds the key to the hall, and the code is hidden in "The Keeper's Note", a short fictional entry in the atlas.

**What it teaches, in order:**

1. **Pan:** a prompt asks the player to drag left and right. The corkboard is off-screen at the start.
2. **Tap and decoys:** the coat stand and typewriter are decoys; the corkboard is meaningful.
3. **Hint 1 (free):** points to the corkboard: "One pin is newer than the rest."
4. **Hint 2 (costs fear):** opens the atlas at `keepers-note--ch-1`. The fear meter rises once so the player sees how it works.
5. **Solve:** the drawer code comes from a detail in that chapter. The seed picks which of three details is the code, so replaying gives a new answer.
6. **Reward:** the hall key and the first relic slot lights up.

### Tutorial hotspots

| hotspot_id | Object | Role |
|---|---|---|
| tut-corkboard | Corkboard with notes | meaningful |
| tut-drawer | Locked drawer | meaningful (puzzle) |
| tut-candle | Candle | meaningful (raises light, reveals a pencil mark) |
| tut-typewriter | Typewriter | decoy |
| tut-coat | Coat stand | decoy |
| tut-mirror | Cracked mirror | decoy (fear event: a figure behind the player, then gone) |
| tut-bookshelf | Bookshelf | decoy |

### The Keeper's Note (atlas entry)

Short fictional entry, one chapter of about 300 words, labelled "Fiction: the story of this archive". Anchor `keepers-note--ch-1`. It must contain three distinct details that can serve as the drawer code (a year, a number of keys, a room count), each tied to a different phrase so hints can point at them. Written in the same documentary voice.

## Atlas shell

| asset_id | Usage | Size | Background | Prompt | Must avoid |
|---|---|---|---|---|---|
| shared-atlas-map-01 | World map base for the atlas | 4096×2048, 2:1 | opaque | Hand-painted antique world map on aged parchment, muted sepia and ink tones with faint deep-teal seas (#1F3A40), soft vignette, subtle film grain, no labels, no text, no compass rose lettering, painterly archival style | Any text or labels, modern borders, logos |
| shared-atlas-hero-01 | Atlas landing hero | 2400×1350, 16:9 | opaque | An open leather field journal on a dark wooden desk at night, lit by a single candle (#E0A84B glow), pressed flowers, a brass magnifier, faint fog drifting from the pages, painterly digital illustration, film grain, deep shadows, palette #0E0B10 #1C1620 #E9E1D3 | Text on pages, hands, faces |
| shared-atlas-paper-01 | Seamless paper texture for story pages | 1024×1024 tileable | opaque | Seamless aged paper texture, warm off-white #E9E1D3 with faint foxing and fibers, even lighting, tileable | Visible seams, stains that look like text |

## Shared game UI

| asset_id | Usage | Size | Background | Prompt | Must avoid |
|---|---|---|---|---|---|
| shared-game-ui-fear-01 | Fear meter frame | 1024×256 | transparent | Ornate thin brass gauge frame shaped like a horizontal thermometer, aged metal, small engraved flourishes, empty inside, painterly, soft candle highlight | Text, numbers |
| shared-game-ui-hint-01 | Hint 1 icon (free) | 512×512 | transparent | A small brass magnifying glass, painterly icon, warm highlight #F4D58D, centered | Text |
| shared-game-ui-hint-02 | Hint 2 icon (costs fear) | 512×512 | transparent | An old field journal half-open with a faint cold blue glow #7FA7B5 leaking from the pages, painterly icon, centered | Text |
| shared-game-ui-frame-01 | Dialog frame for spirit speech | 1600×900 | transparent | Torn parchment panel with burnt edges and a thin ink border, empty center, painterly | Text |
| shared-game-ui-key-01 | Hall key (tutorial reward) | 1024×1024 | transparent | Heavy iron skeleton key with a ribbon tag, painterly, candle-lit from the left | Text on tag |
| shared-game-ui-dawn-01 | Ending screen | 2400×1350 | opaque | The archive house seen from outside at first light, fog lifting, warm sunrise breaking through #F4D58D over cold blue night #7FA7B5, painterly, peaceful | People, text |
| hub-game-door-frame-01..12 | Door frames, one per legend, styled by that legend's theme pack | 1024×2048 | transparent | See each legend's theme pack: a tall wooden door whose carvings and hardware reflect the legend's culture, closed, painterly, lit from the left by candlelight | Text, symbols of religion |
