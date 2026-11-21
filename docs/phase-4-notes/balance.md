# Balance review, all twelve Worlds (task 10.4)

Reviewer: `game-balance-reviewer` (`.kiro/agents/game-balance-reviewer.md`). The review was run in the main thread by adopting that agent's prompt and rules, not by launching the agent file by name (see decisions.md). Nothing under `content/`, `assets/` or the constants was changed. Findings only.

## Evidence used

- `docs/phase-4-notes/fairness.md` (written 14:58, newer than every legend file, so not refreshed): 40 fixed seeds per legend.
- `FEAR` in `skeleton/src/play/fear.ts`: wrong answer 15, Hint 2 6, dead end 6, tutorial Hint 2 10, max 100.
- `HOTSPOT_FEAR` in `skeleton/src/play/fearTable.ts` (step 3): `baba-yaga:h-05` +3, `banshee:hs-cat` -3, `banshee:hs-comb` +3, `flying-dutchman:h-04` +3. All four ids exist in their legend.
- Fear events: every World has 5, all text and sound or visual cues. None changes the meter by itself (the meter is changed only by the constants above and `HOTSPOT_FEAR`).
- Generator and play helpers (`generate`, `playFromAtlas`, `atlasText`) run over 300 generated Runs per legend (seeds `bal-0` to `bal-299`) and 20 played Runs per legend (seeds `fair-0` to `fair-19`), through a temporary probe test that was deleted afterwards.
- Decision 13 in `docs/planning/01-decisions.md`.

Generation: 300 of 300 seeds generated for every legend, no `GeneratorError`. No Run offered a dead end that could be true for its own true version. Every contradiction fact id and anchor resolves, in the legend model and through `atlasText` (0 missing, statically and in 20 played Runs per legend).

## Summary table

Worst case = 5 slots x 6 + dead ends x 6 + positive hotspot ticks x 3 + 2 wrong answers x 15, using the most dead ends any generated Run offered. The test `fear-budget.test.ts` assumes 4 dead ends and 3 ticks (93). Wrong answers affordable = how many wrong answers fit on top of Hint 2 on every slot, all dead ends and all ticks before fear reaches 100.

| World | Slot types (final slot marked *) | Win rate (full / design-rule reader) | Ambiguous | Wrong paid / Restarts (40 seeds) | Peak fear (40 seeds) | Worst case | Wrong answers affordable | Dead ends (max per Run) | Worst severity |
|---|---|---|---|---|---|---|---|---|---|
| baba-yaga | object-match, symbol, ritual-order, weakness, true-or-told | 100% / 63% | 14% | 58 / 0 | 96 | 81 | 3 | 3 | minor |
| banshee | original-name, ritual-order, true-or-told, date-or-number, object-match* | 98% / 43% | 0% | 70 / 1 | 100 | 81 | 3 | 3 | major |
| chupacabra | date-or-number, original-name, object-match, who-said-it, true-or-told | 80% / 75% | 5% | 124 / 8 | 100 | 84 | 3 | 4 | major |
| draugr | original-name, object-match, date-or-number, symbol, true-or-told | 98% / 85% | 26% | 39 / 1 | 100 | 78 | 3 | 3 | minor |
| el-coco | original-name, object-match, date-or-number, who-said-it, true-or-told | 78% / 50% | 50% | 108 / 9 | 100 | 78 | 3 | 3 | major |
| flying-dutchman | true-or-told, original-name, date-or-number, object-match, weakness | 100% / 90% | 0% | 13 / 0 | 72 | 87 | 2 | 4 | minor |
| gumiho | original-name, object-match, date-or-number, who-said-it, true-or-told | 95% / 93% | 22% | 72 / 2 | 100 | 84 | 3 | 4 | minor |
| jersey-devil | original-name, date-or-number, who-said-it, true-or-told, object-match | 100% / 78% | 28% | 4 / 0 | 57 | 78 | 3 | 3 | minor |
| naddaha | original-name, object-match, date-or-number, weakness, true-or-told | 98% / 40% | 33% | 52 / 1 | 100 | 78 | 3 | 3 | major |
| spring-heeled-jack | date-or-number, original-name, object-match, who-said-it, true-or-told | 90% / 80% | 28% | 109 / 4 | 100 | 84 | 3 | 4 | major |
| vetala | object-match, weakness, date-or-number, original-name, true-or-told | 90% / 90% | 22% | 121 / 4 | 100 | 78 | 3 | 3 | major |
| yuki-onna | object-match, symbol, weakness, date-or-number, true-or-told | 100% / 100% | 4% | 111 / 0 | 93 | 78 | 3 | 3 | minor |

Cross-World points:

- Fear budget: every World's worst case (78 to 87) is below `FEAR.max` (100) and below the assumed 93. No constant needs to change for the budget rule.
- Every World has exactly five slots. Final slot is `object-match` only in banshee; elsewhere the last slot is `true-or-told` in 9 Worlds (see finding X-1).

## Cross-World findings

### X-1 `true-or-told` slots are guesses (major)
- Slots: `p-5` in baba-yaga, chupacabra, draugr, el-coco, gumiho, naddaha, spring-heeled-jack, vetala, yuki-onna; `p-4` in jersey-devil; `pz-3` in banshee; `pz-1` in flying-dutchman.
- Evidence (fairness.md, "Slots where the player paid a wrong answer"): `true-or-told` costs a wrong answer in 25 of 40 seeds (baba-yaga), 37 (chupacabra), 30 (el-coco), 34 (gumiho), 30 (naddaha), 38 (spring-heeled-jack), 40 (vetala), 39 (yuki-onna). It is the slot named in every lost Run listed under "Content findings". `TEXT_EXEMPT` in `generator/audit.ts` exempts the type from the answer-in-chapter rule.
- Suggested fix (content owner): write the "told" and "documented by ..." wording into the chapter at the slot's anchor so a reader can match it, or accept that this slot is a paid guess and keep it out of the final slot. Do not loosen `FEAR.wrongAnswer`.

### X-2 Hotspot fear is rare (note)
- Evidence: only four `HOTSPOT_FEAR` entries exist, in three Worlds (baba-yaga, banshee, flying-dutchman). Nine Worlds have no hotspot that changes fear. Seven further hotspots are listed in `HOTSPOT_FEAR_NONE`.
- Effect: the pacing in those Worlds comes only from wrong answers, Hint 2 and dead ends. This is consistent with the budget test (max 3 ticks) but means the Spirit encounter text ("the meter rises or falls") has little mechanical echo.
- Suggested fix: none required. If a World should feel scarier, add a +3 entry for it; the budget has room (see "Wrong answers affordable").

### X-3 Contradiction lists the same anchor twice (minor)
- Evidence: a contradiction's `anchors` repeats one chapter in draugr lead-3 and lead-4, el-coco lead-2, lead-3 and lead-4, flying-dutchman lead-4 and lead-5, gumiho lead-2, lead-4 and lead-5, naddaha lead-2, lead-3 and lead-4, spring-heeled-jack lead-4 (section 6 of each legend file). In each case the two sides of the contradiction sit in the same chapter.
- Effect: the dead end shows one link twice, or the Game must de-duplicate. No anchor is missing.
- Suggested fix: list the anchor once, or point the second entry at the `--versions--<v>` anchor that states the opposing account. This also helps X-4.

### X-4 No dead end points at a version anchor (note)
- Evidence: all contradiction anchors across the twelve legends are chapter anchors (`<id>--ch-<n>`). None is `<id>--versions` or `<id>--versions--<v>`.
- Effect: decision 13 says the true lead is found by comparing versions in the atlas. The contradiction text takes the player to chapters, and the comparison itself relies on Hint 2 anchors for the slots (which `hint2Anchor` refines to `--versions--<v>` for the true version). Deducibility holds through the slots, not through the dead-end links.
- Suggested fix: add the relevant `--versions--<v>` anchor to each contradiction.

### X-5 Contradiction facts mostly describe the lead's own version, not the true one (note)
- Proxy used: for each candidate true version and each dead end shown for it, whether a contradiction fact belongs to the true version or to `all`. Counting pairs that do not: baba-yaga 8 of 9, banshee 8 of 12, chupacabra 7 of 13, draugr 8 of 9, el-coco 2 of 9, flying-dutchman 12 of 20, gumiho 6 of 13, jersey-devil 11 of 12, naddaha 6 of 9, spring-heeled-jack 10 of 13, vetala 5 of 9, yuki-onna 7 of 9.
- Reading: the dead end shows an internal contradiction of that lead's version, which is a valid dead end. The player still has to know which version is true from the solved slots. This is a proxy, not proof of ambiguity, and the files do not say which contradiction the author meant to be true-version-specific.
- Suggested fix: none required. Where a dead end should help a player rule it out, make one contradiction fact belong to the true version.

### X-6 Never-true leads are always offered (minor)
- Slots or leads: chupacabra lead-5 (v-lab), gumiho lead-5 (v-local), spring-heeled-jack lead-4 (v-marquess).
- Evidence: `canBeTrueFor: never`. `chooseLeads` always includes them as dead ends. The generated Runs for chupacabra, gumiho and spring-heeled-jack offer 4 dead ends in some seeds, versus 3 elsewhere.
- Effect: a player learns after one Run that the lead is always wrong. It also costs 6 fear whenever followed.
- Suggested fix: acceptable as authored. If it should vary, give the lead `canBeTrueFor` a version that can be true.

## Findings per World

### baba-yaga
- Puzzle difficulty: types object-match, symbol, ritual-order, weakness, true-or-told. Ambiguous 27 of 200 (14%). Win 100%. Design-rule reader alone 63% (gap 37 points).
  - `p-5` [true-or-told]: wrong answer paid in 25 of 40 seeds. Severity `minor`. Suggested fix: see X-1.
  - Reader gap: severity `note`. A reader who follows the exact sentence wins only 63%; the rest need paraphrase matching. Suggested fix: keep answer wording close to the question in the chapter at the anchor.
- Fear pacing: peak 96 in 40 seeds, 0 restarts. Worst case 81. One positive tick (`h-05` +3). 3 wrong answers fit. Severity `note`: peak 96 means a player with 3 wrongs plus a dead end is 4 points from a restart. Suggested fix: none.
- Dead ends: 3 dead ends with contradictions (lead-2, lead-3, lead-4), lead-1 has none because it is the lead for v-donor. Anchors exist (`ch-2`, `ch-3`, `ch-5`). 28 anchors given in 20 played Runs, 0 missing. Every version had a true lead in 300 seeds. Severity `note`.

### banshee
- Puzzle difficulty: original-name, ritual-order, true-or-told, date-or-number, object-match (final). Ambiguous 0%. Win 98%. Design-rule reader 43% (gap 55 points).
  - `pz-2` [ritual-order]: wrong answer paid in 32 of 40 seeds. Severity `major`. Evidence: fairness.md. Suggested fix: write the order as one sentence in the chapter at the anchor, so a reader can match it.
  - `pz-3` [true-or-told]: paid in 4 seeds; with `pz-2` it caused the one lost seed (`fair-4`, restarted). Severity `minor`. Suggested fix: see X-1.
- Fear pacing: peak 100 (one restart), worst case 81, 3 wrong answers fit. Hotspot fear: `hs-comb` +3, `hs-cat` -3 (a relief). The Spirit text says the meter falls on a correct answer; the code never lowers fear for a correct answer. Severity `note`. Suggested fix: change the text, not the code. I did not check the text beyond the Spirit encounter paragraph.
- Dead ends: all four leads have a contradiction (4 candidate dead ends, up to 3 offered). Anchors `ch-2`, `ch-3`, `ch-4`, `ch-5`, `ch-6` exist, 0 missing in 43 given. Severity `note`.

### chupacabra
- Puzzle difficulty: date-or-number, original-name, object-match, who-said-it, true-or-told. Ambiguous 10 of 200 (5%). Win 80% (32 of 40), design-rule reader 75%. Eight restarts.
  - `p-5` [true-or-told]: paid in 37 of 40 seeds. Severity `major`. See X-1.
  - `p-4` [who-said-it]: paid in 25 of 40 seeds. Severity `major`. Evidence: fairness.md. Suggested fix: state who said it in the chapter at the anchor, in the words the option uses.
  - `p-1` [date-or-number]: 1 seed. Severity `note`.
- Fear pacing: 124 wrong answers paid, peak 100, 8 restarts, 20-seed average peak 83. Worst case 84 with 4 dead ends. 3 wrong answers fit. No hotspot tick. Severity `major` (restarts come from reading cost, not from the constants). Suggested fix: content changes above; do not change `FEAR`.
- Dead ends: lead-5 is never true (X-6). Contradiction anchors `ch-2` to `ch-7` exist, 0 missing in 48 given. Severity `note`.

### draugr
- Puzzle difficulty: original-name, object-match, date-or-number, symbol, true-or-told. Ambiguous 52 of 200 (26%). Win 98%, design-rule reader 85%.
  - Ambiguity at 26% is at the flag line. Severity `minor`. Suggested fix: make wrong options not appear in the chapter at the anchor.
  - `p-1` [original-name]: paid in 10 seeds; `p-5` [true-or-told] in 13. One lost seed (`fair-9`). Severity `minor`. See X-1.
- Fear pacing: 39 wrong paid, peak 100 once, worst case 78, 3 wrong fit. 20-seed average peak 53. Severity `note`.
- Dead ends: leads 2 to 4 have contradictions; lead-3 and lead-4 list the same anchor twice (X-3). Anchors exist, 0 missing in 45 given. Severity `minor` (X-3).

### el-coco
- Puzzle difficulty: original-name, object-match, date-or-number, who-said-it, true-or-told. Ambiguous 99 of 200 (50%). Win 78% (31 of 40), design-rule reader 50%. Nine restarts.
  - Ambiguity: half of all slot-instances have more than one option text in the chapter at the anchor. Severity `major`. Suggested fix: rewrite the chapter text at the fact anchors so only the answer appears, or choose wrong answers that the chapter does not use.
  - `p-5` [true-or-told] 30 seeds, `p-4` [who-said-it] 25, `p-2` [object-match] 13, `p-1` [original-name] 3. Severity `major`. See X-1.
- Fear pacing: 108 wrong paid, peak 100, 9 restarts, 20-seed average peak 73. Worst case 78, 3 wrong fit. No hotspot tick. Severity `major` (same cause as ambiguity).
- Dead ends: lead-2, lead-3, lead-4 each repeat an anchor (X-3). Anchors exist, 0 missing in 51 given. Severity `minor`.

### flying-dutchman
- Puzzle difficulty: true-or-told, original-name, date-or-number, object-match, weakness (final). Ambiguous 0%. Win 100%, design-rule reader 90%. The only World where `true-or-told` is the first slot.
  - `pz-5` [weakness]: paid in 13 seeds. Severity `note`.
- Fear pacing: 13 wrong paid, peak 72, no restarts. This is the highest worst case (87): five leads give four dead ends in every Run, plus one tick (`h-04`). Only 2 wrong answers fit on top of Hint 2 on every slot and all dead ends. Severity `minor`. Suggested fix: none now; if a sixth slot, fifth lead or second tick is added, `fear-budget.test.ts` will need a re-approved budget.
- Dead ends: five leads, all with contradictions. Anchors `ch-2` to `ch-6` exist, 0 missing in 74 given. lead-4 and lead-5 repeat an anchor (X-3). lead-1's contradiction fact belongs to v-dice while the lead is for v-letters. Severity `note`.

### gumiho
- Puzzle difficulty: original-name, object-match, date-or-number, who-said-it, true-or-told. Ambiguous 43 of 200 (22%). Win 95%, design-rule reader 93%. Two restarts.
  - `p-5` [true-or-told] 34 seeds, `p-1` [original-name] 14, `p-3` [date-or-number] 10. Severity `minor`. See X-1.
- Fear pacing: 72 wrong paid, peak 100, worst case 84, 3 wrong fit. 20-seed average peak 61. Only 6 meaningful hotspots of 14 (8 decoys), the lowest ratio of any World. Severity `note`: decoy-heavy, which raises the number of wasted taps but taps cost no fear.
- Dead ends: lead-5 is never true (X-6). lead-2, lead-4, lead-5 repeat an anchor (X-3). Anchors exist, 0 missing in 54 given. Severity `minor`.

### jersey-devil
- Puzzle difficulty: original-name, date-or-number, who-said-it, true-or-told, object-match (final). Ambiguous 56 of 200 (28%). Win 100%, design-rule reader 78%.
  - Ambiguity 28% is over the flag line. Severity `minor`. Suggested fix: as for draugr.
- Fear pacing: 4 wrong paid in 40 seeds, peak 57, 20-seed average 39. Fear barely matters here: a player who reads the atlas pays almost nothing. Severity `minor`. Suggested fix: none under the rule not to change constants. If a harder World is wanted, make the true-or-told slot a guess (X-1) or add a +3 hotspot.
- Dead ends: all four leads have contradictions; none repeats an anchor. Anchors exist, 0 missing in 44 given. 11 of 12 pairs do not mention the true version (X-5). Severity `note`.

### naddaha
- Puzzle difficulty: original-name, object-match, date-or-number, weakness, true-or-told. Ambiguous 65 of 200 (33%), the second highest. Win 98%, design-rule reader 40% (gap 58 points, the widest after banshee).
  - Ambiguity 33%. Severity `major`. Suggested fix: as for el-coco.
  - `p-5` [true-or-told] 30 seeds, `p-3` [date-or-number] 6. One lost seed (`fair-37`). Severity `minor`.
- Fear pacing: 52 wrong paid, peak 100 once, worst case 78, 3 wrong fit. Severity `note`.
- Dead ends: lead-2, lead-3, lead-4 repeat an anchor (X-3). Anchors exist, 0 missing in 43 given. Severity `minor`.

### spring-heeled-jack
- Puzzle difficulty: date-or-number, original-name, object-match, who-said-it, true-or-told. Ambiguous 56 of 200 (28%). Win 90% (36 of 40), design-rule reader 80%. Four restarts.
  - `p-5` [true-or-told] 38 seeds, `p-3` [object-match] 6, `p-1` [date-or-number] 8, `p-4` [who-said-it] 2, `p-2` [original-name] 3. Every slot costs something. Severity `major`. See X-1.
- Fear pacing: 109 wrong paid, peak 100, 20-seed average peak 81, worst case 84 (four dead ends), 3 wrong fit. Severity `major` (same cause).
- Dead ends: lead-4 is never true (X-6) and repeats an anchor (X-3). Anchors exist, 0 missing in 42 given. Severity `minor`.

### vetala
- Puzzle difficulty: object-match, weakness, date-or-number, original-name, true-or-told. Ambiguous 43 of 200 (22%). Win 90%, design-rule reader 90% (no gap, so the lost seeds are not paraphrase problems). Four restarts.
  - `p-5` [true-or-told]: paid in 40 of 40 seeds, the only certain cost in any World. Severity `major`. See X-1.
  - `p-3` [date-or-number] 11 seeds, `p-1` [object-match] 12. Severity `minor`.
- Fear pacing: 121 wrong paid, peak 100, 20-seed average peak 84 (highest), worst case 78, 3 wrong fit. Severity `major` (same cause).
- Dead ends: lead-2 to lead-4 have contradictions, anchors exist, 0 missing in 36 given. Severity `note`.

### yuki-onna
- Puzzle difficulty: object-match, symbol, weakness, date-or-number, true-or-told. Ambiguous 8 of 200 (4%). Win 100%, design-rule reader 100%.
  - `p-5` [true-or-told]: paid in 39 of 40 seeds. Severity `minor` (it is still always winnable).
- Fear pacing: 111 wrong paid, peak 93, no restart, 20-seed average peak 80. The World sits 7 points under the restart line with a perfect reader, a small margin. Worst case 78. Severity `minor`. Suggested fix: see X-1; do not raise `FEAR.max`.
- Dead ends: lead-2 to lead-4 have contradictions, anchors exist, 0 missing in 46 given. Severity `note`.

## What could not be checked

- `note`: whether the Spirit encounter and Fear event texts match what the code does (for example "the meter falls" on a correct answer). I read the banshee text and the constants only. A text-to-code check needs the Game build, which the agent's tools do not cover.
- `note`: balance for the tutorial room and the hub. This review covers the twelve legend Worlds only. The tutorial Hint 2 cost (`FEAR.tutorialHint2` 10) is not in a legend file.
- `note`: the 20-seed played averages come from a fresh probe, the other numbers from fairness.md (40 seeds). The two agree on win rate (for example baba-yaga 20 of 20, chupacabra 15 of 20 against 80%).
