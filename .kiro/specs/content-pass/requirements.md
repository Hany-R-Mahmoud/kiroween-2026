# Requirements Document

## Introduction

The owner approved a content pass over the 12 legend files in `content/legends/`. The owner explicitly asks for edits to legend story text in this batch. This satisfies the steering rule "do not rewrite story text unless the user asks" for this scope only. The pass follows `content/legend-format.md` and `.kiro/steering/content.md`, `product.md` and `tech.md`.

Goal 1 makes answers fair. `skeleton/test/play-atlas-player.property.test.ts` lists eight legends in `KNOWN_CONTENT_FINDINGS` where an atlas-only player loses on some of 40 seeds: banshee, chupacabra, draugr, el-coco, gumiho, naddaha, spring-heeled-jack, vetala. Costly slots are mostly `true-or-told`, then `date-or-number`, `original-name`, `who-said-it` and `object-match`. Product rule: every seed yields solvable puzzles with one correct answer that exists in the linked chapter (`product.md`). Fixes are one plain sentence in the linked chapter.

Goal 2 is a light prose pass on all 12 legends: "X is not A. It is B." pairs, "Notice what ..." lead-ins, filler "strange" and "quietly", "Here is ..." and "That is the ..." openers, and chapter `Hook:` lines that are mostly questions.

Out of scope and protected: all code in `apps/` and `skeleton/src/`, the generator, player, fear constants and matcher, `assets/`, the database in production, and any test change except removing legends from `KNOWN_CONTENT_FINDINGS`. Sources, `sources:` lines, anchors, chapter ids, fact tables, the version list and all puzzle or fact data stay unchanged unless `content/legend-format.md` allows a wording change. No commit and no push.

## Glossary

- **Legend_Files**: the 12 Markdown files in `content/legends/`.
- **Chapter_Text**: narration of a chapter and its `Hook:` line. The cold open's dramatization label, tables and sources are not Chapter_Text.
- **Fairness_Test**: `skeleton/test/play-atlas-player.property.test.ts`, which plays 40 seeds per legend as an atlas-only player.
- **Known_Findings**: the `KNOWN_CONTENT_FINDINGS` list in the Fairness_Test.
- **Costly_Slot**: a puzzle slot whose correct answer an atlas-only player misses on at least one seed.
- **Fix_Sentence**: one added or reworded plain sentence in the chapter a Costly_Slot links to.
- **Prose_Patterns**: the five patterns of Goal 2: not-A-is-B pairs, "Notice what" lead-ins, "strange"/"quietly", "Here is"/"That is the" openers, question Hooks.
- **Answer_Text**: any sentence a puzzle or fact uses as answer text.
- **Content_Audit**: `pnpm --filter @kiroween/skeleton audit:content`.
- **Content_Check**: `pnpm check:content`.
- **Dev_Database**: the database named in `.env`; the production database is excluded.
- **Handover**: `docs/content-pass-handover.md`.

## Requirements

### Requirement 1: Baseline

**User Story:** As the owner, I want before numbers, so that I can see what the pass changed.

#### Acceptance Criteria

1. THE Content_Pass SHALL load `.env` into the shell only and print or write no value from it.
2. WHEN the baseline runs, THE Content_Pass SHALL run the Fairness_Test with `FAIRNESS_WRITE=1` to refresh `docs/phase-4-notes/fairness.md`.
3. THE Content_Pass SHALL record seeds won of 40 and the Costly_Slots per legend.
4. THE Content_Pass SHALL count the five Prose_Patterns per legend and save counts and the fairness result in `.debug/content-pass/`.

### Requirement 2: Fair answers

**User Story:** As a player using only the atlas, I want every answer findable in its linked chapter, so that no seed punishes me for a gap in the text.

#### Acceptance Criteria

1. WHEN a Costly_Slot of type `true-or-told` is fixed, THE Content_Pass SHALL add or reword one Fix_Sentence that says plainly whether the claim is documented, and by whom, or only told, using the wording the puzzle options use.
2. WHEN a Costly_Slot of type `date-or-number`, `original-name`, `who-said-it` or `object-match` is fixed, THE Content_Pass SHALL write the date, name, speaker or object in the Fix_Sentence the way the fact states it.
3. THE Content_Pass SHALL place each Fix_Sentence in the chapter that the slot's fact anchor points to.
4. THE Content_Pass SHALL keep every Fix_Sentence true to the sources already cited by that chapter and add no new claim.
5. THE Content_Pass SHALL keep sources, `sources:` lines, anchors, chapter ids, fact tables, the version list and all puzzle or fact data unchanged, except a wording change allowed by `content/legend-format.md`.
6. IF a fix needs a change to the generator, player, fear constants or matcher, THEN THE Content_Pass SHALL stop and report instead of editing.
7. WHEN a legend wins all 40 seeds, THE Content_Pass SHALL remove that legend from Known_Findings.
8. THE Content_Pass SHALL leave the player, the seeds and the budget of the Fairness_Test unchanged, and SHALL make no other test edit.

### Requirement 3: Prose pass

**User Story:** As a reader, I want plain documentary prose, so that the text does not sound formulaic.

#### Acceptance Criteria

1. WHEN Chapter_Text has an "X is not A. It is B." pair, THE Content_Pass SHALL keep the plain statement of B and drop "not A", unless A is a real version someone told.
2. WHEN Chapter_Text has a "Notice what ..." lead-in, THE Content_Pass SHALL cut the lead-in and keep the point.
3. THE Content_Pass SHALL cut or replace with a precise word the filler "strange" and "quietly", leaving at most one "strange" per legend.
4. WHEN Chapter_Text has a "Here is ..." or "That is the ..." opener, THE Content_Pass SHALL rewrite it as a direct statement.
5. THE Content_Pass SHALL make at most one in three `Hook:` lines per legend a question and state the open fact plainly in the others.
6. THE Content_Pass SHALL keep every fact, number, name, quote and source code (S1 and so on) exactly, and keep the documentary voice.
7. THE Content_Pass SHALL shorten no chapter by more than two sentences.
8. THE Content_Pass SHALL keep each Answer_Text sentence word for word.
9. THE Content_Pass SHALL edit only Chapter_Text, not the cold open's dramatization label, tables or sources.

### Requirement 4: Per-legend gate

**User Story:** As the maintainer, I want the content check after every legend, so that a break is found early.

#### Acceptance Criteria

1. WHEN edits to one legend are complete, THE Content_Pass SHALL run Content_Check and continue only when it passes.
2. THE Content_Pass SHALL edit only `content/legends/*.md`, the Known_Findings list, `docs/` files and `.debug/content-pass/`.
3. THE Content_Pass SHALL leave `apps/` and `skeleton/src/` unchanged.
4. THE Content_Pass SHALL keep the excluded topics of `content.md` out of every added sentence.

### Requirement 5: Final checks

**User Story:** As the owner, I want evidence, so that I can review without rerunning anything.

#### Acceptance Criteria

1. THE Content_Pass SHALL run once at the end: Content_Audit with all zeros in the gaps table, `pnpm -r typecheck`, `pnpm -r test`, and the Fairness_Test with `FAIRNESS_WRITE=1`.
2. THE Content_Pass SHALL report a before and after table per legend with seeds won of 40 and the counts of the five Prose_Patterns.
3. THE Content_Pass SHALL import into the Dev_Database with `pnpm --filter @kiroween/skeleton db:import`, build the atlas, and open one changed chapter in the local atlas to confirm the new text shows.
4. THE Content_Pass SHALL leave the production database untouched; the owner runs the production import after the push.
5. THE Content_Pass SHALL serve locally on ports other than 3305 and 3306 (for example 3500 and 3501) and stop every server afterwards.

### Requirement 6: Handover

**User Story:** As the owner, I want a short record, so that I know what changed and what did not.

#### Acceptance Criteria

1. THE Content_Pass SHALL write the Handover with, per legend, a short list of changes, fairness numbers, and any slot not fixed with the reason.
2. THE Content_Pass SHALL add a short entry to `docs/kiro-usage.md`.
3. THE Content_Pass SHALL make no commit and no push, and SHALL report the full list of changed files.
4. IF execution is blocked, THEN THE Content_Pass SHALL stop and report the blocker.
