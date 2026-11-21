# Content fixes during Phase 4 (disclosure log)

Date: 2026-11-20. Made outside Kiro by the owner with Claude, while Kiro worked on Phase 4. Only files under `content/legends/` changed. No code changed. Answers, wrong answers, anchors, versions and hotspot links are unchanged.

Why: in the mid-way play test, the game showed questions built from fact statements. When a statement did not contain its answer word for word, the game fell back to the slot label ("Names", "Who said it") or showed the whole statement, which often gave the answer away. Tap texts and some lead text were written as designer notes ("Asks ...", "A number puzzle:", "the player ...") and some named the answer.

## Rules followed

1. Every fact used by a non-true-or-told slot has its exact answer in its statement once, so the game can blank it. Statements written as "in this year" questions stay as they are.
2. True-or-told statements are plain claims. They no longer say "is an interpretation", "is told" or "is not a record", and never contain their own answer.
3. True-or-told slots lost their labels (for example "p-5 Told or recorded" is now "p-5"), so the game shows the claim instead of the label.
4. Flying Dutchman: the trailing `[D]` and `[T]` tags were shown in questions. `[D]` moved to the start of the statement (the format's documented tag); `[T]` was removed. The note above the table now says that told facts carry no tag.
5. Tap texts are short in-world observations. They point at what to look up in the atlas and do not state answers. Hotspots that move the fear meter keep a mood line ("The room feels a little calmer", "The air turns colder") instead of naming the meter.
6. Lead steps and dead ends no longer mention the player, the seed, version ids or fact ids. The Banshee lament step no longer states the order.

## Counts

- Fact statements rewritten: 129 (127 in the first pass, 2 leaks found by a second check: vetala f-21, jersey-devil f-05).
- True-or-told slot labels removed: 9 legends.
- Flying Dutchman tags fixed: 33 statements.
- Tap texts rewritten: 145 of 198.
- Lead steps and dead ends fixed: 13 lines in baba-yaga, banshee and flying-dutchman.

## Checks

- Parser: 0 errors.
- `audit:content`: all 12 legends show 0 answers not found, 0 slots without a hotspot, 0 lead steps without a hotspot, 0 failing versions.
- Question check over all 349 slot-fact pairs: every non-true-or-told question has a blank or is a question-form statement; no true-or-told statement contains its answer or a give-away word; no tags left in statement text.

- Skeleton tests after the change: 690 pass, 7 expected fail, 1 fails by design. Property 14's known-findings set now also holds banshee, which loses 1 of 40 seeds (fair-4). Its true-or-told statements no longer give their answer (for example the bittern), so the scripted player now guesses there. The tap-fear guard first flagged "an old fear" in chupacabra h-05; that line now says "an old dread".

## For Kiro

- The known-findings set and `docs/phase-4-notes/fairness.md` must be regenerated, since question texts changed.
- The game reads legends from Neon, so `db:import` on `dev-skeleton-core` is needed before the new text shows in the running game.
