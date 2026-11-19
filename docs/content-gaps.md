# Content gaps

Written by `pnpm --filter @kiroween/skeleton audit:content`. Legend files are never edited by this tool; the owner fixes content outside the spec.

Rules applied (R5.10 matcher, owner decision): a fact only fills a slot type that needs its answer in the story (every type except `true-or-told` and `ritual-order`) if its answer is written in the linked text. The label `documented:`, `told:` or `proposed:` is dropped, the answer is split on commas, " and " and parentheses, and a part passes when all its content words (ignoring a, an, the, of, and, or, to, in, on, at, with, near, about) are whole words of one paragraph. All parts must pass. `who-said-it` passes when the surname appears in the text. A trailing "-ed" on words over four letters is folded ("dressed" matches "dress"). A bare `<id>--versions` anchor is a valid target and is checked against the whole versions section.

Every filled slot needs a meaningful hotspot linked to one of its candidate facts, and the true lead needs a meaningful hotspot on every step (R5.7).

| legend | answers not found | slots with no hotspot | lead steps with no hotspot | versions that cannot be generated (of total) |
|---|---|---|---|---|
| baba-yaga | 0 | 0 | 0 | 0 of 4 |
| banshee | 0 | 0 | 0 | 0 of 4 |
| chupacabra | 0 | 0 | 0 | 0 of 4 |
| draugr | 0 | 0 | 0 | 0 of 4 |
| el-coco | 0 | 0 | 0 | 0 of 4 |
| flying-dutchman | 0 | 0 | 0 | 0 of 5 |
| gumiho | 0 | 0 | 0 | 0 of 4 |
| jersey-devil | 0 | 0 | 0 | 0 of 4 |
| naddaha | 0 | 0 | 0 | 0 of 4 |
| spring-heeled-jack | 0 | 0 | 0 | 0 of 4 |
| vetala | 0 | 0 | 0 | 0 of 4 |
| yuki-onna | 0 | 0 | 0 | 0 of 4 |

## Details

### baba-yaga

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

None.

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: none
- Lead steps with no meaningful hotspot: none

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

None.

### banshee

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

None.

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: none
- Lead steps with no meaningful hotspot: none

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

None.

### chupacabra

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

None.

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: none
- Lead steps with no meaningful hotspot: none

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

None.

### draugr

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

None.

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: none
- Lead steps with no meaningful hotspot: none

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

None.

### el-coco

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

None.

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: none
- Lead steps with no meaningful hotspot: none

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

None.

### flying-dutchman

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

None.

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: none
- Lead steps with no meaningful hotspot: none

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

None.

### gumiho

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

None.

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: none
- Lead steps with no meaningful hotspot: none

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

None.

### jersey-devil

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

None.

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: none
- Lead steps with no meaningful hotspot: none

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

None.

### naddaha

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

None.

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: none
- Lead steps with no meaningful hotspot: none

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

None.

### spring-heeled-jack

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

None.

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: none
- Lead steps with no meaningful hotspot: none

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

None.

### vetala

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

None.

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: none
- Lead steps with no meaningful hotspot: none

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

None.

### yuki-onna

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

None.

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: none
- Lead steps with no meaningful hotspot: none

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

None.
