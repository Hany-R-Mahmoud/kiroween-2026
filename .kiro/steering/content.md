---
inclusion: fileMatch
fileMatchPattern: "content/**"
---
# Content rules

The contract is `content/legend-format.md`. Follow it exactly.

## Voice
- Documentary: open cold, build suspense, end every chapter on a `Hook:` line. The last chapter is "What is documented, and what is told". The second-to-last covers modern sightings or modern culture, in our own words.
- 5 to 7 chapters of 400 to 700 words, each with `anchor: <legend-id>--ch-<n>` and a `sources:` line.

## Sourcing
- Paraphrase real testimony and cite it. Never invent quotes for real people. Imagined scenes start with `[Dramatization]`.
- Every claim used in a puzzle traces to a source in the Sources table. Every `S<n>` tag used must be defined there. At least 6 sources.
- Do not copy film, TV, game or book depictions.

## Fact tags
- `[D]`: documented, checked against a primary or scholarly source.
- `[R]`: reported by reference works, original not checked.
- Untagged means checked.
- `[R]` facts may fill `date-or-number`, `who-said-it` and `object-match` slots. Never a `true-or-told` slot, and never counted as "told". "Told" is only folklore and interpretation.

## Excluded
Real crimes and murders as story drivers, religion and scripture, occult instructions, sacred Indigenous beliefs, real places of mass tragedy or suicide, private addresses, living private people. Folklore creatures are allowed. Never encourage visiting dangerous, closed or private places.

## IDs
- Legend id is kebab-case and used in every asset and anchor ID. Asset IDs: `<legend-id>-<surface>-<kind>-<nn>`.
- Fact, hotspot, lead and version IDs are unique only inside one file. The importer prefixes them with the legend id.

## Editing
- Never change a story fact without updating the fact pool (statement, answer, wrong answers, anchor) and any lead or hotspot that cites it. Never move a fact's anchor without checking the chapter still contains it.
- The content hook only reports. Do not rewrite story text unless the user asks.
