# Legend file format and art direction

Every legend lives in one Markdown file under `legends/<legend-id>.md`. The game, the atlas and the asset pipeline all read from it, so every section below is required and must keep the same headings and IDs.

Language: English. Write UI-facing labels so they can be translated to Arabic later (no puns that only work in English inside puzzle answers).

## Content rules

- Documentary style: open cold, build suspense, end every chapter on a hook that makes the reader want the next one.
- Never invent quotes and attribute them to real people. Paraphrase real testimony and cite it. Any imagined scene is marked `[Dramatization]` at its start.
- Every factual claim used in a puzzle must be traceable to a source in the Sources section.
- Excluded: real crimes and murders as story drivers, religious figures or scripture, spiritual or occult instructions, sacred beliefs of Indigenous peoples, real places of mass tragedy or suicide, private home addresses, living private people.
- Do not encourage visiting dangerous, closed or private places.
- Do not copy film, TV, game or book depictions (for example a specific movie's ghost ship design or a sports team logo). Use public-domain folklore and our own descriptions.
- Puzzle answers must depend on details as we tell them, so a quick web search does not give the answer.

## Required sections

### 0. Meta

| Field | Example |
|---|---|
| id | `flying-dutchman` (kebab-case, used in every asset and anchor ID) |
| title | The Flying Dutchman |
| region | Cape of Good Hope / Dutch maritime folklore |
| country_theme | Netherlands (Dutch Golden Age maritime) |
| map_point | lat, lng of the place most tied to the legend (public place only) |
| era | When the legend first appears in records |
| scare_level | 1–5 |
| reading_time_min | Estimated minutes for all chapters |
| one_line_hook | One sentence for cards and the map popup |

### 1. Cold open

80–150 words. A scene or a question that hooks the reader. Can be a `[Dramatization]`.

### 2. Chapters

Five to seven chapters. Each chapter:

```
#### ch-1 · <Chapter title>
anchor: <legend-id>--ch-1
sources: S1, S3
<400–700 words of documentary narration>
Hook: <the last line or two that pull the reader forward>
```

The anchor is the deep-link target. Game hints open the atlas at this anchor.

The second-to-last chapter covers modern sightings or the legend in modern culture (described in our own words). The last chapter is always "What is documented, and what is told" (see section 4); it still gets an anchor.

### 3. Versions and testimonies

Three to five competing accounts. These drive the dead ends in the game.

| version_id | Who tells it (source type) | Era | What they claim | Where it conflicts with other versions | Source |
|---|---|---|---|---|---|
| v-sailors | 19th-century sailors' logs | 1880s | ... | ... | S2 |

After the table, write each version as a short paragraph (100–200 words) inside the chapter it belongs to, or in a "Versions" subsection with its own anchor `<legend-id>--versions--<version_id>`.

### 4. What is documented, and what is told

A two-column table plus a short closing paragraph.

| Documented (with source) | Told (folklore, no firm record) |
|---|---|

### 5. Fact pool

At least 24 facts. The puzzle generator picks from this pool using a random seed, so variety matters.

| fact_id | Statement (as we tell it) | anchor | version_id or `all` | puzzle_types | answer | plausible wrong answers (3+) | difficulty 1–3 |
|---|---|---|---|---|---|---|---|

`puzzle_types` uses these values: `weakness`, `ritual-order`, `true-or-told`, `original-name`, `symbol`, `date-or-number`, `who-said-it`, `object-match`.

Rules:
- At least 6 facts are version-specific (their answer changes depending on which version a clue points to).
- At least 4 facts belong to the "documented" side and at least 4 to the "told" side.
- Wrong answers must be plausible, and the story must never present them as the answer to this fact. Names, dates and places that appear in the story for other facts make good wrong answers.
- Confidence tags at the start of a statement: `[D]` documented and checked against a primary or scholarly source; `[R]` reported by reference works, original not checked. Untagged means checked. `[R]` facts may fill `date-or-number`, `who-said-it` and `object-match` slots, but never a `true-or-told` slot, and they never count as "told". "Told" is only for folklore and interpretation.
- IDs (fact, hotspot, lead, version) only need to be unique inside one legend file; formats may differ between files (`f-01`, `f-001`, `f01`). The importer prefixes every ID with the legend id (`banshee:f07`).

### 6. Leads and dead ends

At least three lead chains. One chain is the true path for a given seed; the others end in a dead end.

```
lead-id: lead-<n>
starts from: version_id
steps: 2–4 short steps the player follows (object to inspect, place to search, fact to recall)
dead end: what the player finds that breaks this lead
contradiction: fact_id and anchor that prove this lead is wrong
can be true when: which seed condition makes this the true lead (for example "seed picks v-sailors")
```

Every dead end must be explainable by reading the atlas. Never a dead end that only luck can avoid.

### 7. Game world

The world behind this legend's door in the archive house.

- **Setting:** where the player stands (for example "the deck of a becalmed ship at night").
- **Scenes:** 2–3 wide pannable scenes. For each: id, what the player sees from left to right, mood, light sources.
- **Hotspots:** at least 12 per world across its scenes. For each:

| hotspot_id | scene_id | Object | Meaningful or decoy | Linked fact_ids or lead step | What happens on tap |
|---|---|---|---|---|---|

At least 5 are decoys. Meaningful/decoy status may be swapped by the seed, so mark which ones are swappable.

- **Spirit encounter:** how the legend's figure appears, what it asks, how it reacts to wrong answers (raises the fear meter) and right answers.
- **Puzzles:** 3–5 puzzle slots for this world, each with its puzzle_type and which facts can fill it.
- **Breaking the curse:** the final puzzle of this world and the relic the player earns.
- **Fear events:** 3–5 scripted scares (sound, light flicker, figure in the corner) that never block progress and respect reduced-motion settings.
- **Hints:** for each puzzle slot, hint 1 (free, points inside the scene) and hint 2 (costs fear, opens the atlas at a named anchor).

### 8. Theme pack

| Token | Value |
|---|---|
| palette | 6–8 hex colors with roles: background, surface, ink, accent, danger, glow |
| display font | A Google Font that fits the culture and era |
| body font | A readable Google Font |
| textures | e.g. salt-stained wood, tar rope, sail canvas |
| motifs | ornaments and border patterns rooted in the culture |
| ambient sound | description of the loop (no copyrighted music) |
| ui accents | how buttons, frames and dividers look in this world |

### 9. Visual assets

Every asset has a stable ID: `<legend-id>-<surface>-<kind>-<nn>`.
`surface` is `atlas`, `game` or `shared`. `kind` is `hero`, `chapter`, `scene`, `hotspot`, `spirit`, `relic`, `marker`, `texture`, `ui`, `portrait`.

| asset_id | Surface and usage | Size / aspect | Background | Prompt | Must avoid |
|---|---|---|---|---|---|

Required set per legend:
- 1 atlas hero, 16:9, 2400×1350
- 1 illustration per chapter, 3:2, 1800×1200
- 1 map marker icon, square, 512×512, transparent
- 2–3 game scenes, wide panorama 8:3, 4096×1536, no characters baked in, room for hotspots
- 1 sprite per hotspot object, square, 1024×1024, transparent background
- 1 spirit figure, full body, 2:3, 1600×2400, transparent background, plus 1 "close" variant
- 1 relic item, square, 1024×1024, transparent
- 2 seamless textures, 1024×1024, tileable
- 1 UI frame or border ornament set, transparent

Prompts must be complete on their own (style, subject, composition, light, palette hex codes, aspect). Follow the art direction below.

### 10. Sources

| id | Title | Author or publisher | Year | URL | Public domain? | What it supports |
|---|---|---|---|---|---|---|

Prefer primary or scholarly sources, archived newspapers, folklore collections and museum pages. At least 6 sources.

### 11. Sensitivity and IP notes

Anything to watch for: modern trademarks, film versions to avoid copying, cultural details to handle with care.

## Art direction (shared by all legends)

- **Base look:** painterly digital illustration with an archival feel: visible brush texture, fine film grain, aged paper vignettes. Dark, atmospheric, not gory. Scary through mood, shadow and suggestion, never blood or injury.
- **Light:** one strong motivated light source per image (lantern, moon, candle, fog glow) with deep shadow. High contrast so hotspots read clearly on a phone.
- **Per-world identity:** palette, ornaments and architecture come from the legend's culture and era. Keep the brush style and grain constant so all worlds feel like one game.
- **Atlas images** read like plates in an old illustrated field journal: framed compositions, room for a caption.
- **Game scenes** are clean backgrounds: no text, no UI, no characters baked in, interesting objects spread across the full width so panning reveals new things.
- **Hotspot sprites** match the scene's light direction and palette so they sit naturally when composited.
- **Never:** text or letters inside images, logos, real identifiable people, film or game likenesses, gore.
