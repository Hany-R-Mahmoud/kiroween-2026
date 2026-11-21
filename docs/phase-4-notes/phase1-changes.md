# Phase 1 change made for requirement 5.7 (owner-approved)
Hint 2 opens the anchor of the fact the Run chose for the slot, so the answer is always in the linked text.
## Files
- `skeleton/src/generator/generate.ts` (`buildSlot`): passes `fact.anchor` to `makeHints`.
- `skeleton/src/generator/hints.ts`: `makeHints` takes `factAnchor` and uses it instead of the slot's authored `hint2Anchor`. A bare `--versions` anchor is still refined to the true version by `hint2Anchor`.
## Test edits
- `skeleton/test/helpers/properties.ts`: the hint-2 property now requires the chosen fact's anchor (refined only when bare `--versions`), replacing "equals the authored anchor".
- `skeleton/test/generator.test.ts`: the `hint-anchor` error test calls `hint2Anchor` directly; the "bare versions anchor is refined" test sets the candidate facts' anchors to `fx--versions`.
## Content finding
Authored per-slot `hint2Anchor` values are now unused (the final puzzle's is unchanged). They are redundant. `content/` was not edited.
