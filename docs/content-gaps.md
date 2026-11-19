# Content gaps

Written by `pnpm --filter @kiroween/skeleton audit:content`. Legend files are never edited by this tool; the owner fixes content outside the spec.

Rules applied (R5.10 matcher, owner decision): a fact only fills a slot type that needs its answer in the story (every type except `true-or-told` and `ritual-order`) if its answer is written in the linked text. The label `documented:`, `told:` or `proposed:` is dropped, the answer is split on commas, " and " and parentheses, and a part passes when all its content words (ignoring a, an, the, of, and, or, to, in, on, at, with, near, about) are whole words of one paragraph. All parts must pass. `who-said-it` passes when the surname appears in the text. A trailing "-ed" on words over four letters is folded ("dressed" matches "dress"). A bare `<id>--versions` anchor is a valid target and is checked against the whole versions section.

Every filled slot needs a meaningful hotspot linked to one of its candidate facts, and the true lead needs a meaningful hotspot on every step (R5.7).

| legend | answers not found | slots with no hotspot | lead steps with no hotspot | versions that cannot be generated (of total) |
|---|---|---|---|---|
| baba-yaga | 1 | 0 | 11 | 4 of 4 |
| banshee | 4 | 1 | 3 | 4 of 4 |
| chupacabra | 3 | 0 | 0 | 2 of 4 |
| draugr | 2 | 0 | 7 | 4 of 4 |
| el-coco | 4 | 0 | 5 | 4 of 4 |
| flying-dutchman | 4 | 1 | 5 | 5 of 5 |
| gumiho | 2 | 0 | 7 | 4 of 4 |
| jersey-devil | 0 | 0 | 1 | 1 of 4 |
| naddaha | 2 | 0 | 5 | 4 of 4 |
| spring-heeled-jack | 3 | 1 | 4 | 4 of 4 |
| vetala | 2 | 1 | 8 | 4 of 4 |
| yuki-onna | 1 | 1 | 11 | 4 of 4 |

## Details

### baba-yaga

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

| fact | puzzle type | answer | anchor |
|---|---|---|---|
| f-015 | weakness | it must be fed | baba-yaga--ch-3 |

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: none
- Lead steps with no meaningful hotspot: lead-1 step 2, lead-1 step 3, lead-2 step 1, lead-2 step 2, lead-2 step 3, lead-3 step 1, lead-3 step 2, lead-3 step 3, lead-4 step 1, lead-4 step 2, lead-4 step 3

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

- `v-devourer`: slot p-2: no qualifying fact
- `v-devourer`: slot p-3: no qualifying fact
- `v-devourer`: slot p-4: no qualifying fact
- `v-lubok`: slot p-2: no qualifying fact
- `v-lubok`: slot p-3: no qualifying fact
- `v-lubok`: slot p-4: no qualifying fact
- `v-scholar`: slot p-2: no qualifying fact
- `v-scholar`: slot p-3: no qualifying fact
- `v-scholar`: slot p-4: no qualifying fact

### banshee

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

| fact | puzzle type | answer | anchor |
|---|---|---|---|
| f04 | symbol | hair loose and bare feet | banshee--ch-2 |
| f04 | object-match | hair loose and bare feet | banshee--ch-2 |
| f05 | weakness | documented: they kept it for funerals only | banshee--ch-2 |
| f10 | weakness | leave it where it lies | banshee--ch-7 |

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: pz-1
- Lead steps with no meaningful hotspot: lead-1 step 3, lead-4 step 2, lead-4 step 3

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

- `v-window`: slot pz-2: no qualifying fact
- `v-washer`: slot pz-2: no qualifying fact
- `v-clan`: slot pz-2: no qualifying fact

### chupacabra

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

| fact | puzzle type | answer | anchor |
|---|---|---|---|
| f-03 | object-match | two legs, upright | chupacabra--ch-3 |
| f-04 | symbol | spikes along the back | chupacabra--ch-3 |
| f-17 | original-name | Tracking the Chupacabra | chupacabra--ch-4 |

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: none
- Lead steps with no meaningful hotspot: none

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

- `v-radio`: slot p-3: no qualifying fact
- `v-film`: slot p-3: no qualifying fact

### draugr

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

| fact | puzzle type | answer | anchor |
|---|---|---|---|
| f-03 | original-name | Sweden | draugr--ch-2 |
| f-06 | symbol | heaviness | draugr--ch-2 |

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: none
- Lead steps with no meaningful hotspot: lead-1 step 3, lead-2 step 1, lead-2 step 3, lead-3 step 3, lead-4 step 1, lead-4 step 2, lead-4 step 3

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

- `v-eyrbyggja`: slot p-4: no qualifying fact
- `v-laxdaela`: slot p-1: no qualifying fact
- `v-laxdaela`: slot p-4: no qualifying fact
- `v-scholars`: slot p-1: no qualifying fact
- `v-scholars`: slot p-2: no qualifying fact
- `v-scholars`: slot p-4: no qualifying fact

### el-coco

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

| fact | puzzle type | answer | anchor |
|---|---|---|---|
| f-05 | object-match | a monkey's angry face | el-coco--ch-4 |
| f-11 | date-or-number | 80 | el-coco--ch-3 |
| f-18 | symbol | carries off children who sleep little | el-coco--ch-2 |
| f-34 | date-or-number | 1921 | el-coco--ch-5 |

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: none
- Lead steps with no meaningful hotspot: lead-1 step 3, lead-2 step 2, lead-2 step 3, lead-3 step 3, lead-4 step 3

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

- `v-monkey`: slot p-2: no qualifying fact

### flying-dutchman

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

| fact | puzzle type | answer | anchor |
|---|---|---|---|
| f-06 | date-or-number | 11 July 1881 | flying-dutchman--ch-6 |
| f-19 | weakness | refuse the letters | flying-dutchman--ch-3 |
| f-21 | symbol | steer it (no steersman) | flying-dutchman--ch-4 |
| f-29 | symbol | coming storm or disaster | flying-dutchman--ch-1 |

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: pz-1
- Lead steps with no meaningful hotspot: lead-1 step 2, lead-1 step 3, lead-3 step 3, lead-5 step 2, lead-5 step 3

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

- `v-redeemer`: slot pz-4: no qualifying fact

### gumiho

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

| fact | puzzle type | answer | anchor |
|---|---|---|---|
| f-35 | date-or-number | one thousand years | gumiho--ch-2 |
| f-36 | date-or-number | one hundred years | gumiho--ch-6 |

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: none
- Lead steps with no meaningful hotspot: lead-1 step 3, lead-2 step 1, lead-2 step 2, lead-2 step 3, lead-3 step 2, lead-4 step 2, lead-4 step 3

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

- `v-ascend`: slot p-4: no qualifying fact
- `v-qingqiu`: slot p-4: no qualifying fact

### jersey-devil

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

None.

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: none
- Lead steps with no meaningful hotspot: lead-4 step 3

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

None.

### naddaha

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

| fact | puzzle type | answer | anchor |
|---|---|---|---|
| f-12 | weakness | a companion who stays beside him | naddaha--ch-2 |
| f-16 | original-name | in his own house | naddaha--ch-3 |

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: none
- Lead steps with no meaningful hotspot: lead-2 step 3, lead-3 step 3, lead-4 step 1, lead-4 step 2, lead-4 step 3

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

- `v-path`: slot p-4: no qualifying fact
- `v-home`: slot p-4: no qualifying fact
- `v-blackman`: slot p-4: no qualifying fact
- `v-modern`: slot p-4: no qualifying fact

### spring-heeled-jack

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

| fact | puzzle type | answer | anchor |
|---|---|---|---|
| f-16 | object-match | a lamp like a bull's-eye lantern | spring-heeled-jack--ch-3 |
| f-20 | original-name | Peckham Rye | spring-heeled-jack--ch-2 |
| f-24 | date-or-number | twelve | spring-heeled-jack--ch-5 |

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: p-5
- Lead steps with no meaningful hotspot: lead-1 step 3, lead-2 step 1, lead-2 step 2, lead-2 step 3

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

- `v-street`: slot p-2: no qualifying fact
- `v-street`: slot p-3: no qualifying fact
- `v-dreadful`: slot p-2: no qualifying fact
- `v-dreadful`: slot p-3: no qualifying fact
- `v-army`: slot p-2: no qualifying fact
- `v-army`: slot p-3: no qualifying fact
- `v-army`: slot p-4: no qualifying fact

### vetala

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

| fact | puzzle type | answer | anchor |
|---|---|---|---|
| f-11 | weakness | when the king speaks | vetala--ch-2 |
| f-32 | date-or-number | 1880 to 1884 | vetala--ch-4 |

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: p-5
- Lead steps with no meaningful hotspot: lead-1 step 3, lead-2 step 2, lead-2 step 3, lead-3 step 1, lead-3 step 2, lead-3 step 3, lead-4 step 2, lead-4 step 3

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

- `v-burton`: slot p-1: no qualifying fact
- `v-burton`: slot p-2: no qualifying fact
- `v-later`: slot p-1: no qualifying fact
- `v-later`: slot p-2: no qualifying fact
- `v-later`: slot p-3: no qualifying fact
- `v-later`: slot p-4: no qualifying fact
- `v-hindi`: slot p-1: no qualifying fact
- `v-hindi`: slot p-2: no qualifying fact
- `v-hindi`: slot p-4: no qualifying fact

### yuki-onna

**1. Answers not found in the linked text** (the fact is left out of generation for that puzzle type)

| fact | puzzle type | answer | anchor |
|---|---|---|---|
| f-15 | object-match | a lamp | yuki-onna--ch-3 |

**2. Slots or lead steps with no meaningful hotspot**

- Slots with no meaningful hotspot linked to any of their facts: p-5
- Lead steps with no meaningful hotspot: lead-1 step 2, lead-1 step 3, lead-2 step 1, lead-2 step 2, lead-2 step 3, lead-3 step 1, lead-3 step 2, lead-3 step 3, lead-4 step 1, lead-4 step 2, lead-4 step 3

**3. Slots with no fact for a version** (a seed that picks that version makes generation fail)

- `v-sogi`: slot p-1: no qualifying fact
- `v-sogi`: slot p-3: no qualifying fact
- `v-ojiya`: slot p-1: no qualifying fact
- `v-ojiya`: slot p-3: no qualifying fact
- `v-picture`: slot p-1: no qualifying fact
- `v-picture`: slot p-3: no qualifying fact
