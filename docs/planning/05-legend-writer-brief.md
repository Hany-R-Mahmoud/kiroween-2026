# Legend writer brief

Instructions for whoever writes a new legend file (an AI agent or a person). This brief is also the base for the "lore researcher" custom agent in Kiro.

## The project in one paragraph

A horror "lore engine" skeleton with two apps on top: (1) a worldwide atlas of scary legends told in documentary style, and (2) a single-player point-and-click investigation game. The player pans across painted scenes, taps hotspots (some meaningful, some decoys) and solves puzzles that can only be solved by reading the atlas. Hints deep-link into atlas chapter anchors. Each run uses a random seed that picks facts, puzzle types, wrong answers, hotspot roles and which story version is the true lead, so competing versions create dead ends.

## Inputs

- Format contract (follow every section and heading): `content/legend-format.md` in this pack.
- A finished example to match in quality and shape: `content/legends/baba-yaga.md`.

## Workflow

1. **Research first.** Find original or scholarly sources: book scans (archive.org, HathiTrust, Google Books, Wikisource, Project Gutenberg and mirrors), museum and library pages, digitised newspapers, folklore archives, published reviews. Wikipedia is only a map to the originals.
2. **Write the full file** in the contract format.
3. **Check your own claims** against the sources before finishing:
   - Checked against an original or scholarly source: no tag, or `[D]` at the end of a fact statement.
   - Only confirmed through reference works: tag the fact `[R]`. `[R]` facts can fill date, name and object puzzles, never a true-or-told slot, and they are never "told".
   - Folklore or interpretation: "told" side.
   - Could not confirm at all: leave it out of the fact pool, or put it on the "told" side if it is a folk claim.
4. **Self-check before handing back:**
   - 5–7 chapters, each 400–700 words (count them).
   - Every source tag used anywhere is defined in the Sources table.
   - At least 24 facts, at least 6 version-specific, at least 4 documented and 4 told.
   - At least 3 lead chains; every dead end is explained by an atlas anchor.
   - At least 12 hotspots, at least 5 decoys, swappable ones marked.
   - Every asset in the required set has a complete prompt with hex colours, size and a "must avoid" list.

## Voice rules (these were the most common mistakes)

- Chapters are read in the atlas. **Never mention the game, players, puzzles, hotspots, seeds, the archive house or the atlas's own workings inside chapters, versions or the documented/told section.** That talk belongs only in sections 5–9.
- No first-person research notes in story text ("we could not find", "we did not read", "we keep", "we know"). Say it in the documentary voice: "the record is silent", "the attribution is not firm".
- Version write-ups describe the account only. No "a clue that mentions X belongs here" lines; write "X belongs to this account" instead.
- Never remove a detail only because a fetch came back cut short. Fetch the page again with a query aimed at that detail first; remove it only if the full text does not have it.
- Never use your own background knowledge as evidence. Every date and name needs a fetched source; if a fetch fails, try a mirror (for Project Gutenberg, `https://www.gutenberg.org/cache/epub/<id>/pg<id>.txt`; also Wikisource and archive.org) before tagging `[R]`.
- No quotes longer than 15 words from any source. Paraphrase.
- Never invent quotes for real people. Mark imagined scenes `[Dramatization]`.
- A version that names a real person as the culprit is never a true version. Mark its lead "can be true when: never" so it can only be a dead end.
- Wrong answers may be names, dates or places from elsewhere in the story, as long as the story never gives them as the answer to that fact.

## Content limits

Excluded: real crimes and murders as story drivers, religion and scripture, occult or ritual instructions, sacred beliefs of Indigenous peoples, real places of mass tragedy or suicide, private addresses, living private people, gore. Do not copy any film, TV, game, comic or brand depiction. Do not encourage visiting dangerous, closed or private places. Pick a public map point and explain the choice.

## Outputs

1. `content/legends/<id>.md`: the legend file.
2. `research/verification/<id>.md`: a table with columns claim | status (verified / reported [R] / told / removed) | evidence (summary or a quote under 15 words) | source URL. Then one line listing anything still open.

Do not create or edit any other file.
