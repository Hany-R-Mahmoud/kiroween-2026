# Content check results

Run during Phase 0 with `node scripts/check-legend.mjs --all` (same logic the save hook uses). No legend file was edited.

Checks: sections 0-11 present; 5-7 chapters with correct anchor, sources line, Hook line, 400-700 words; at least 24 facts, valid puzzle types, 3+ wrong answers each, anchors resolve, at least 6 version-specific; no [R] fact in a true-or-told slot; at least 3 lead chains; at least 12 hotspots with at least 5 decoys; 3-5 versions; at least 6 sources; every S-tag used is defined.

Word count excludes the `anchor:`, `sources:` and `Hook:` lines.

Not checked by the script (the hook asks the agent to check these on save): 4+ documented and 4+ told facts, and `[Dramatization]` labels.

Result: 12 of 12 files pass. Zero problems found.

### baba-yaga.md: PASS
chapters 7 (words 585/536/484/513/507/428/476), facts 32 (version-specific 19), leads 4, hotspots 17 (decoys 7), versions 4, sources 11

### banshee.md: PASS
chapters 7 (words 669/562/638/598/604/598/552), facts 30 (version-specific 19), leads 4, hotspots 16 (decoys 7), versions 4, sources 19

### chupacabra.md: PASS
chapters 7 (words 496/520/545/476/575/517/504), facts 36 (version-specific 28), leads 5, hotspots 18 (decoys 8), versions 5, sources 8

### draugr.md: PASS
chapters 7 (words 606/540/530/617/537/464/479), facts 40 (version-specific 38), leads 4, hotspots 18 (decoys 8), versions 4, sources 9

### el-coco.md: PASS
chapters 7 (words 530/579/542/551/462/476/538), facts 37 (version-specific 30), leads 4, hotspots 14 (decoys 6), versions 4, sources 12

### flying-dutchman.md: PASS
chapters 7 (words 614/633/663/610/553/664/520), facts 32 (version-specific 24), leads 5, hotspots 16 (decoys 6), versions 5, sources 17

### gumiho.md: PASS
chapters 7 (words 593/553/639/564/578/522/572), facts 39 (version-specific 26), leads 5, hotspots 14 (decoys 8), versions 5, sources 10

### jersey-devil.md: PASS
chapters 7 (words 529/491/585/550/553/553/497), facts 32 (version-specific 23), leads 4, hotspots 17 (decoys 6), versions 4, sources 12

### naddaha.md: PASS
chapters 6 (words 629/490/549/627/617/554), facts 41 (version-specific 27), leads 4, hotspots 18 (decoys 9), versions 4, sources 15

### spring-heeled-jack.md: PASS
chapters 7 (words 540/517/500/450/484/477/455), facts 37 (version-specific 32), leads 5, hotspots 18 (decoys 7), versions 5, sources 8

### vetala.md: PASS
chapters 7 (words 544/504/551/474/478/444/484), facts 34 (version-specific 29), leads 4, hotspots 16 (decoys 7), versions 4, sources 10

### yuki-onna.md: PASS
chapters 7 (words 498/534/538/521/473/451/503), facts 30 (version-specific 25), leads 4, hotspots 16 (decoys 7), versions 4, sources 8

