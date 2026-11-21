# Requirements Document

## Introduction

Phase 4 of Kiroween 2026 turns the game app into a playable game. It covers the hall (hub), the tutorial room, the Keeper's Note in the atlas, the twelve legend worlds, server-side fair play, panning and input, the Kiro custom agent and hook, and the tests and smoke checks that prove it.

Source documents: `docs/phase-3-handover.md`, `docs/phase-2-handover.md`, `docs/tech-decisions.md`, `docs/planning/01-decisions.md` (decisions 6 to 15, 24, 26, 29), `content/legend-format.md` (sections 5 to 9 and the art direction), `content/hub-and-tutorial.md`, `content/keepers-note.md`, `assets/README.md`, `docs/planning/13-kiro-phase-4.md`, and the steering files in `.kiro/steering`.

The game stays single-player. Multiplayer is deferred and is not built. There is no sound in this phase, because there are no audio assets.

### Facts read from the repository that shape these requirements

1. **Phase 2 trusts the client.** `finishRun` takes slots solved, Hint 2 uses, wrong answers and highest fear from the browser (limits 0 to 50, 0 to 500, 0 to 100). `startRunFn` and `finishRunFn` are callable from the browser today. Moving play state to the server only closes the residual risk if those two functions can no longer be used to report a result.
2. **The generator output holds the secrets.** `generate(legend, seed)` returns `correctIndex`, hotspot `role`, `trueVersionId`, `swaps`, `trueLead`, `deadEnds` and each slot's `hint2Anchor`. Hotspot positions, hotspot text on tap and sprite choice are not in it.
3. **Hotspot sprites match cleanly.** In all 12 legends, every hotspot id is named in exactly one asset `usage` text (checked by exact token). The asset files exist for every scene, sprite, spirit (full and close) and relic in all 12 legends. Banshee's `banshee-game-hotspot-15` is one sheet that holds two items (`hs-bedstead` left half, `hs-candle` right half), and its usage text says so, so the match is not unclear.
4. **Scene files match by order and by name.** Each legend has three `*-game-scene-0n` files whose usage text names the scene (for example "game scene canal", "Game scene sc-ford", "Scene scene-2"), in the same order as the scene list in section 7.
5. **Shared game images exist:** `hub-game-scene-01`, `tutorial-game-scene-01`, `shared-game-ui-fear-01`, `-hint-01`, `-hint-02`, `-frame-01`, `-key-01`, `-dawn-01`. The twelve `hub-game-door-frame-*` images do not exist.
6. **Panorama sizes** are 4096 by 1536. The three Banshee scenes are 327 to 442 KB, the hub 317 KB, the tutorial 308 KB. All scene files together are 12 MB.
7. **The `legends.model` snapshot** (the parsed legend) sits in Neon and the atlas reader role cannot read it. The game server loads it through the existing `loadLegend`.
8. **The atlas has no Keeper's Note.** `/anchor/keepers-note--ch-1` returns 404 today. The anchors table and the legend tables are built for legends only.
9. **Local images.** The atlas serves `/media/...` through its own Vite plugin. The game has no such plugin, and the game and atlas run on different ports locally.

## Glossary

- **Game**: the app in `apps/game`, served under `/game`.
- **Atlas**: the app in `apps/atlas`, served at `/`.
- **Skeleton**: the package `@kiroween/skeleton`. Shared game logic and shared types live here.
- **Hall**: the archive house hub, drawn as the pannable scene `hub-game-scene-01`.
- **Tutorial_Room**: the study drawn as `tutorial-game-scene-01`.
- **World**: one legend's game, made of 2 to 3 scenes, a spirit, puzzle slots, leads, a relic and fear events, in that legend's theme pack.
- **Scene**: one wide panorama, 4096 by 1536 pixels.
- **Scene_Viewer**: the component that shows a Scene and pans it.
- **Hotspot**: a tappable object or region on a Scene. A World Hotspot is meaningful or a decoy. A Hall or Tutorial_Room Hotspot is a tap region over the painted scene.
- **Layout_Data**: game code (not content) that gives each Hotspot its position and size, in coordinates relative to its Scene, and its sprite or region.
- **Seed**: the random string that makes one Run. It comes from the server.
- **Run**: one attempt at one World, produced by one call of `generate()` for one Seed.
- **Play_Service**: the server-side module that holds the generated Run, checks every action and returns only what the player has earned.
- **Earned_Data**: data the player has unlocked by play: a puzzle's question and option texts after its slot opens, a Hint 1 text, a Hint 2 anchor after that Hint 2 is used, a dead end after its lead is followed, the true-lead confirmation after it is followed.
- **Secret_Data**: the correct answer or option index, a Hotspot's role, the true version id, the swaps, which lead is true, any Hint 2 anchor before use, and the Seed while the Run is in progress.
- **Guest_Token**: the encrypted and authenticated string that carries a guest's Play state. The server does not store it.
- **Fear_Meter**: a whole number from 0 to 100 for the current Run. At 100 the Run restarts.
- **Fear_Event**: one scripted scare from a legend's section 7. It never blocks progress.
- **Dead_End**: the point where a wrong lead ends, with its contradiction text and a link to the proving anchor.
- **Guest_World**: the legend id in `GUEST_WORLD` (default `banshee`).
- **Keepers_Note**: the fiction entry in `content/keepers-note.md`, anchor `keepers-note--ch-1`.
- **Atlas_Reader_Role**: the Postgres role `atlas_reader` (login role `atlas_web`) with SELECT only.
- **Content_Gap**: data a mechanic needs that the content files do not hold in structured form.
- **Balance_Reviewer**: the Kiro custom agent `game-balance-reviewer`.

## Owner decisions needed at requirements approval

Each item has a default. Approving this document without comment accepts every default. Where an item changes, the design follows the owner's choice.

1. **Final slot when none is flagged.** Only `banshee` marks a slot as final (`isFinal`). The other 11 legends write the last puzzle row as an ordinary slot and describe "Breaking the curse" as text. Default: the Game treats the slot flagged `isFinal` as final, and for a legend with none flagged it treats the last slot in file order as final, and records that legend as a Content_Gap. This is a game convention, not new content.
2. **True lead gates the win.** Default: a Run is won only when every slot is solved and the true lead has been followed to its end. Phase 2's "won needs every slot" stays valid because this rule is stricter.
3. **Dead ends and the score.** Default: following a wrong lead raises the Fear_Meter by the amount the design proposes, and does not count as a wrong answer, so the score formula inputs keep their Phase 2 meaning (wrong answers are wrong puzzle answers only).
4. **Showing the Seed.** The hub spec says the ledger shows the seed. A Seed shown during a Run, together with the public repository content, would let a player run `generate()` offline and learn every Secret_Data value. Default: the ledger shows a Run's Seed only after the Run has ended (won or restarted), and shows fear and curses remaining during the Run.
5. **Hint 2 repeats.** Default: the first use of Hint 2 on a slot raises fear and counts once. Opening the same slot's atlas link again is free and does not count.
6. **Resuming.** Default: a signed-in player who leaves a World keeps the Run in progress and resumes it. The Phase 2 behaviour "starting again abandons the old run" applies only to an explicit new start, which the game does not offer except through a fear restart.

## Content gaps found while reading the content files

Each gap names exactly what is missing. None is invented around. Where a default is given, the default is the smallest handling that keeps the game fair and playable, and the owner can replace it by adding content.

| # | Gap | Where | Default handling |
|---|---|---|---|
| G1 | Final slot is flagged in 1 of 12 legends. | `isFinal` is true only for `banshee`. | See owner decision 1. |
| G2 | The final puzzle is prose, not data. "Breaking the curse" describes laying objects in order, picking cards from a shelf and similar, per version. No structured list of objects, order or per-version answer exists. | All 12 legends, section 7. | The final slot is played as an ordinary question from `generate()`. No object-ordering mechanic is built. |
| G3 | The "Breaking the curse" prose names the contents of every version, so showing it before the end would reveal the true version. | All 12 legends. | It is shown only after the final answer is correct, in the ending panel of that World. Before that, the framing comes from catalog strings and the spirit. |
| G4 | Per-event reduced-motion lines are structured for 1 legend. `reducedMotion` is empty for every Fear_Event in 11 legends (`flying-dutchman` has them). Most legends give one world-level sentence instead. | `world.fearEvents[].reducedMotion` | Under reduced motion every Fear_Event becomes a static caption plus a short fade, using catalog strings. The per-event line is used where it exists. |
| G5 | Fear_Event triggers are prose ("when a decoy is tapped", "when the player returns to the scene"). No trigger type or condition is structured. | `world.fearEvents[].description` | Layout code assigns each event one of a small set of trigger kinds (decoy tap, scene enter, wrong answer, Hint 2). The design lists the assignment for owner review. Events that name sound show a caption instead. |
| G6 | Hotspot tap text mixes narration with effects. Examples: "Fear meter drops a little" (`hs-cat`), "Taking it raises fear a little" (`hs-comb`), "small sound", "a low boom sounds". Fear amounts per Hotspot are not structured. | `world.hotspots[].onTap` | The text is shown as written. Hotspot taps do not change the Fear_Meter. The design asks the owner whether to add structured amounts. |
| G7 | Text for a swapped Hotspot is missing. `onTap` describes the authored role. When the seed swaps a Hotspot, the text no longer fits ("Nothing else happens" on a Hotspot that now opens a puzzle). | Every Hotspot marked swappable. | When the served role equals the authored role, the Game shows `onTap`. When the role was swapped, the Game shows a neutral catalog sentence for "nothing here" or "something here". |
| G8 | Hall and tutorial tap results are one-line summaries ("Flickers, small sound", "A handprint appears and fades"). The tutorial's corkboard, typewriter, coat stand, bookshelf and mirror have no text. The candle "reveals a pencil mark" but the mark's content is not given. | `content/hub-and-tutorial.md` | Short UI sentences are written into the catalog and flagged for owner review. The pencil mark shows only a mark pointing at the corkboard, with no extra fact. |
| G9 | The tutorial reward "first relic slot lights up" has no relic image or name. The cabinet has twelve slots for twelve World relics. | `content/hub-and-tutorial.md` | The tutorial lights the first cabinet slot (an outline glow) and places the hall key (`shared-game-ui-key-01`). No tutorial relic image is invented. |
| G10 | Relic names are not structured. Usage texts read "relic: pocket doll", "Relic: Lamp of Vigil", "The Harbour Lantern", and for `jersey-devil` only "Relic". | `assets` usage column | The display name is the usage text without a leading "relic:" label. For `jersey-devil` the catalog string "Relic of {legend title}" is used. |
| G11 | The twelve door frames (`hub-game-door-frame-01..12`) do not exist. | `assets/` | Doors are tap regions over the painted hall. A catalog-drawn lock overlay shows the state. |
| G12 | No audio assets exist. Ambient sound and sound cues in the content are not played. | all | No sound. Captions replace sound cues. |
| G13 | Spirit lines are prose. How the spirit reacts to right and wrong answers is described in one paragraph, not as lines. | `world.spirit` | The spirit's question comes from `generate()`. Reaction lines come from the catalog and are generic. The paragraph is not parsed. |
| G14 | The Keeper's Note says the ring holds eleven keys and the house has fourteen rooms, while the hall has twelve doors and a tutorial room. This is flavour, and each phrase is a drawer answer, so it is not changed. | `content/keepers-note.md` | Recorded only. |
| G15 | The hub text says the ledger shows "time to dawn" and the clock shows "time left until dawn". The phase prompt asks for curses remaining, with no real-time timer. | `content/hub-and-tutorial.md` | Curses remaining are shown as hours (one hour per unbroken World). No real-time timer. |

## Requirements

### Requirement 1: The hall

**User Story:** As a player, I want to walk through a painted archive hall and tap its objects and doors, so that the game feels like one place and I can reach every legend world.

#### Acceptance Criteria

1. THE Game SHALL show the Hall as the pannable Scene `hub-game-scene-01` with Hotspots as tap regions for: `hub-desk-ledger`, `hub-lamp`, `hub-clock`, `hub-cabinet`, the twelve doors `hub-door-<legend-id>` (Dutchman, Baba Yaga, Jersey Devil, Banshee, Chupacabra, Draugr, El Coco, Gumiho, Naddaha, Spring-heeled Jack, Vetala, Yuki-onna, in the table order of `content/hub-and-tutorial.md`), `hub-jars` and `hub-window`.
2. THE Game SHALL not show the Phase 2 door cards on the Hall route.
3. WHILE the tutorial is not done, THE Game SHALL show a lock on every door and SHALL send the player to the Tutorial_Room when a door is activated.
4. WHILE the tutorial is done and the visitor is a guest, THE Game SHALL open the door of the Guest_World and SHALL show a sign-in prompt on each of the other eleven doors.
5. WHILE the tutorial is done and the visitor is signed in, THE Game SHALL open all twelve doors.
6. THE Game SHALL give each door a link "Read the legend" that opens `ATLAS_ORIGIN` plus `legendUrl(<legend-id>)`.
7. WHEN the player activates `hub-clock`, THE Game SHALL show the number of curses remaining as hours, one hour for each World not yet broken, and SHALL show no real-time timer.
8. WHEN the player activates `hub-desk-ledger`, THE Game SHALL show the run summary: the current World, fear, curses remaining, and the Seed only for a Run that has ended (owner decision 4).
9. WHEN the player activates `hub-cabinet`, THE Game SHALL show twelve slots and the relic of each broken World, using that World's relic image and display name (gap G10).
10. WHEN the player activates `hub-lamp`, `hub-jars` or `hub-window`, THE Game SHALL show the decoy result from the catalog (gap G8) and SHALL not change any progress.
11. WHEN all twelve Worlds are broken, THE Game SHALL show the ending screen with `shared-game-ui-dawn-01`.
12. WHERE a guest has broken the Guest_World, THE Game SHALL count only that World as broken for that guest, and SHALL keep this in the browser as the Phase 2 guest progress does.

### Requirement 2: The tutorial room

**User Story:** As a new player, I want a short guided room that teaches panning, tapping, hints and the fear meter, so that I understand the game before I enter a legend.

#### Acceptance Criteria

1. THE Game SHALL show the Tutorial_Room as the pannable Scene `tutorial-game-scene-01` with Hotspots `tut-corkboard`, `tut-drawer`, `tut-candle`, `tut-typewriter`, `tut-coat`, `tut-mirror` and `tut-bookshelf`, with the roles given in `content/hub-and-tutorial.md`.
2. WHEN the Tutorial_Room opens, THE Game SHALL show a prompt that asks the player to drag left and right, and the corkboard SHALL start outside the visible area at the 390 px viewport width.
3. WHEN a Tutorial_Room Run starts, THE Play_Service SHALL pick one of the three details in section 2 of `content/keepers-note.md` (`d-year`, `d-keys`, `d-rooms`) with the seeded RNG and SHALL keep the choice as Secret_Data.
4. WHEN the player activates `tut-drawer`, THE Game SHALL show the question text of the picked detail and a field for digits.
5. WHEN the player submits an answer, THE Play_Service SHALL accept the answer digits and the text in the "Also accept" column for that detail (`eleven` for `d-keys`, `fourteen` for `d-rooms`), compared after trimming spaces and ignoring letter case, and SHALL refuse every other value.
6. WHEN the player activates Hint 1 in the Tutorial_Room, THE Game SHALL show the text "One pin is newer than the rest." from the content and SHALL highlight `tut-corkboard`.
7. WHEN the player uses Hint 2 in the Tutorial_Room, THE Play_Service SHALL raise the Fear_Meter by the tutorial amount, once only, and SHALL return the anchor `keepers-note--ch-1`, and THE Game SHALL open `ATLAS_ORIGIN` plus `atlasUrl('keepers-note--ch-1')` in a new tab.
8. WHEN the player uses Hint 2 a second time in the same tutorial Run, THE Play_Service SHALL not raise the Fear_Meter again.
9. WHEN the correct code is submitted, THE Game SHALL show the hall key (`shared-game-ui-key-01`), SHALL light the first slot of the relic cabinet (gap G9) and SHALL mark the tutorial done.
10. WHEN a wrong code is submitted in the Tutorial_Room, THE Game SHALL show a fixed refusal message and SHALL not restart the Tutorial_Room.
11. WHEN the player activates `tut-mirror`, THE Game SHALL show the Fear_Event "a figure behind the player, then gone" in the form the reduced-motion setting allows.
12. WHEN a signed-in player finishes the tutorial, THE Play_Service SHALL store the tutorial as done for that user in Neon. WHEN a guest finishes it, THE Game SHALL store it in the browser only.

### Requirement 3: The Keeper's Note in the atlas

**User Story:** As a player, I want to read the Keeper's Note in the atlas, so that the tutorial's drawer code is found by reading, as in every legend.

#### Acceptance Criteria

1. THE importer for the Keepers_Note SHALL be a separate parser and script that reads `content/keepers-note.md` and SHALL not change the legend parser, the audit logic, `check:content` or `db:import` for legends.
2. THE importer SHALL store the title, label "Fiction: the story of this archive", reading time, one-line hook, the chapter text, the chapter hook, the anchor `keepers-note--ch-1` and the three drawer details of section 2 (phrase, question, answer, "Also accept").
3. THE Keepers_Note data SHALL not be stored as a row in `legends`, so it never appears in the map, the continent list or `listLegends`.
4. WHEN a visitor opens `/legends/keepers-note`, THE Atlas SHALL show the title, the label "Fiction: the story of this archive", and the chapter with its hook, with an element whose id is `keepers-note--ch-1`.
5. THE Atlas SHALL show a link to `/legends/keepers-note` in its footer, with its text taken from the translation catalog.
6. WHEN a visitor opens `/anchor/keepers-note--ch-1`, THE Atlas SHALL redirect to `/legends/keepers-note#keepers-note--ch-1`.
7. THE `atlasUrl` function SHALL stay unchanged, and `atlasUrl('keepers-note--ch-1')` SHALL return `/legends/keepers-note#keepers-note--ch-1` or the same value the existing function already returns for a well-formed anchor.
8. THE Atlas_Reader_Role SHALL receive SELECT on each new table or column that the page needs, and on nothing else. THE Atlas_Reader_Role SHALL not be able to read the drawer answers if the design stores them in a separate column or table that the page does not need.
9. THE Keepers_Note chapter text SHALL contain each of the three drawer-detail phrases exactly once, and the anchor `keepers-note--ch-1` SHALL appear exactly once on its page.
10. IF the design needs a new table, a new column or a new `db:import`, THEN THE work SHALL stop and ask the owner before running anything against Neon.

### Requirement 4: World play, leads and the final puzzle

**User Story:** As a player, I want to explore a legend's scenes, collect clues, follow leads that may end in dead ends, answer the spirit's puzzles and break the curse, so that I learn the legend by reading the atlas.

#### Acceptance Criteria

1. THE Game SHALL show each World with its 2 to 3 Scenes from section 7, using the files `<legend-id>-game-scene-0n` mapped by the scene name in the asset usage text and, as a check, by order.
2. THE Game SHALL draw every World Hotspot with its sprite (`<legend-id>-game-hotspot-nn`) at its Layout_Data position, matching sprite to Hotspot by the Hotspot id named in the asset `usage` text, and SHALL crop `banshee-game-hotspot-15` into its left half for `hs-bedstead` and its right half for `hs-candle`.
3. IF a Hotspot has no asset whose usage text names its id exactly once, THEN THE build check SHALL fail and the work SHALL stop and list the Hotspot.
4. THE Game SHALL show the spirit with its full figure (`<legend-id>-game-spirit-01`) and its close figure (`<legend-id>-game-spirit-02`), and SHALL use the close figure while the spirit asks a puzzle question.
5. THE Game SHALL apply the legend's theme pack to the World through CSS variables, using the same resolution rules and AA contrast checks as the atlas.
6. WHEN a World starts, THE Play_Service SHALL create one Run by calling `generate()` with a Seed made on the server with a cryptographic random source, and SHALL take the true version, the Hotspot roles and the swaps from that Run only.
7. WHEN the player activates a Hotspot, THE Play_Service SHALL return the tap text (gap G7 rules apply), any lead steps the Hotspot is linked to, and the slot it opens, and SHALL return no role.
8. WHEN the player activates a meaningful Hotspot that serves a slot, THE Play_Service SHALL open that slot, which makes its question and its four option texts Earned_Data.
9. WHEN the player has collected every step of a lead, THE Game SHALL allow the player to follow that lead.
10. WHEN the player follows a wrong lead, THE Play_Service SHALL return the Dead_End text, the contradiction text, and a link to each proving anchor, and THE Game SHALL open that anchor in the atlas on request through `ATLAS_ORIGIN` plus `atlasUrl(anchor)`.
11. WHEN the player follows the true lead, THE Play_Service SHALL mark the lead done and return a confirmation, and SHALL not return a Dead_End.
12. THE Play_Service SHALL return the same response shape for every lead (id, starting version title, collected steps), so the true lead cannot be told apart before it is followed.
13. WHEN every slot other than the final slot is solved, THE Game SHALL open the final slot (owner decision 1), framed by catalog text for "Breaking the curse" and the spirit's close figure.
14. WHEN the final slot is answered correctly and the true lead has been followed, THE Play_Service SHALL end the Run as won, THE Game SHALL show the legend's "Breaking the curse" prose (gap G3) and the relic with its name, and SHALL add the relic to the cabinet.
15. THE Game SHALL not build a richer final mechanic from prose (gap G2).
16. THE Layout_Data SHALL list, for each Scene, each Hotspot with a position and size relative to the Scene in panorama coordinates, in the left-to-right order of the objects in that Scene's description in section 7.
17. THE Layout_Data SHALL live in game code and SHALL not write to `content/` or `assets/`.

### Requirement 5: Hints

**User Story:** As a player, I want a free hint that points inside the scene and a costly hint that opens the story chapter, so that I can get unstuck without the game solving itself.

#### Acceptance Criteria

1. WHEN the player uses Hint 1 on a slot, THE Play_Service SHALL return that slot's Hint 1 text and the Hotspot ids to highlight, remapped for the Run's swaps, and SHALL not raise the Fear_Meter or any counter.
2. WHEN the Game receives Hint 1 highlight ids, THE Game SHALL mark those Hotspots with a visible, non-colour-only mark, and SHALL keep that mark readable under reduced motion.
3. WHEN the player uses Hint 2 on a slot for the first time, THE Play_Service SHALL raise the Fear_Meter, add one to the Hint 2 count, and return that slot's Hint 2 anchor for this Run.
4. WHEN the player uses Hint 2 on a slot for the first time, THE Game SHALL open `ATLAS_ORIGIN` plus `atlasUrl(anchor)` in a new tab with `rel="noopener"`, and SHALL keep the Play state in the current tab.
5. WHEN the player reopens Hint 2 for a slot that already used it, THE Play_Service SHALL return the same anchor, and SHALL not raise the Fear_Meter or the count.
6. THE Play_Service SHALL not return any Hint 2 anchor for a slot until that slot's Hint 2 has been used (owner decision 5).
7. THE anchor returned by Hint 2 SHALL be the anchor of the chosen fact for the slot (or the version-specific anchor the generator picks), and the answer SHALL appear in the chapter at that anchor.

### Requirement 6: Fear

**User Story:** As a player, I want the fear meter to rise when I use Hint 2 or answer wrongly, and a full meter to restart the world, so that hints and guesses have a cost.

#### Acceptance Criteria

1. THE design SHALL propose the fear amount for a Hint 2 use, a wrong answer, a Dead_End and the tutorial's single Hint 2, and SHALL keep them as named constants in one skeleton module.
2. WHEN a wrong puzzle answer is submitted, THE Play_Service SHALL raise the Fear_Meter by the wrong-answer amount and add one to the wrong-answer count.
3. WHEN a wrong lead is followed, THE Play_Service SHALL raise the Fear_Meter by the Dead_End amount and SHALL not add to the wrong-answer count (owner decision 3).
4. THE Game SHALL show the Fear_Meter with `shared-game-ui-fear-01` and a text equivalent that a screen reader can read.
5. WHEN the Fear_Meter reaches 100, THE Play_Service SHALL end the Run as restarted, SHALL start a new Run for the same World with a new Seed, and THE Game SHALL tell the player the room has restarted.
6. WHEN a Run restarts, THE Play_Service SHALL keep the restarted Run's counts for its stored row and SHALL give the new Run zero fear, zero counts and no solved slot.
7. WHEN a Fear_Event plays, THE Game SHALL not block any input, SHALL not flash more than three times in any one second, and SHALL follow the event's reduced-motion line, or the catalog fallback where none exists (gap G4).
8. WHILE the system setting `prefers-reduced-motion` is reduce or the in-app motion setting is reduced, THE Game SHALL replace every Fear_Event motion with a static caption and a fade of at most 400 ms.
9. THE Game SHALL offer an in-app motion setting that can switch Fear_Event motion off, and SHALL keep that choice in the browser.

### Requirement 7: Fair play on the server

**User Story:** As the owner, I want the server to hold the answers and count every action, so that a player cannot read the solution from the network or report a better result than they played.

#### Acceptance Criteria

1. THE Play_Service SHALL run `generate()` on the server and SHALL keep the Run's Secret_Data on the server for a signed-in player, or inside the Guest_Token for a guest.
2. THE Game SHALL never receive, before it is earned: a correct answer or correct option index, a Hotspot role, the true version id or true lead, the swaps, a Hint 2 anchor whose Hint 2 is unused, or the Seed while the Run is in progress.
3. WHEN a puzzle's question is sent, THE Play_Service SHALL send the four option texts in the order `generate()` produced them, without the correct index and without a field that marks the correct option.
4. WHEN the player submits an answer, THE Play_Service SHALL check it against the server copy of the Run, and SHALL count wrong answers, Hint 2 uses, solved slots and highest fear itself.
5. WHEN a Run ends, THE Play_Service SHALL compute the score with the unchanged Phase 2 formula (`skeleton/src/score/score.ts`) from the counts the server kept, and SHALL accept no count, score, Seed or status from the browser.
6. THE Game SHALL remove `startRunFn` and `finishRunFn` from the browser-callable server functions, so no browser can report a result. THE skeleton modules for the Phase 2 run service MAY stay, and their tests SHALL stay green.
7. THE Play state of a signed-in player SHALL live in Neon. IF it needs a new table or column, THEN THE work SHALL stop and ask the owner before any migration is applied.
8. THE Guest_Token SHALL be encrypted and authenticated with a key held in an environment variable, so a guest can neither read nor change the Run's Secret_Data.
9. THE Guest_Token SHALL carry an expiry time and a format version, and SHALL be bound to one legend id.
10. IF a Guest_Token is malformed, altered, expired or bound to a different legend, THEN THE Play_Service SHALL refuse it with a fixed error message and SHALL not reveal the reason.
11. THE Play_Service SHALL not store guest Play state on the server, and the Game SHALL keep the Guest_Token and guest progress in the browser only.
12. IF the Guest_Token key variable is not set, THEN THE Game server SHALL stop with an error that names the variable and never shows its value. IF the key variable does not exist in `.env.example`, THEN THE work SHALL stop, name the variable and ask the owner to add the value.
13. THE Guest_Token SHALL allow a guest to replay an older token. THE work SHALL record this limit, and SHALL record that it affects only that guest's own run, because guest results are not stored on the server and no guest score is kept.
14. EVERY server function SHALL validate its input with a strict schema, SHALL use fixed error messages, SHALL keep the CSRF middleware that Phase 2 set up, SHALL call `requireUser` where only signed-in users may act, and SHALL put the user id in the WHERE clause of every query on a player's rows. NO server function SHALL take a user id from the browser.
15. WHEN a guest asks for a World other than the Guest_World, THE Play_Service SHALL refuse with the Phase 2 redirect to sign-in and SHALL return no World data.
16. THE Play_Service SHALL use the seeded RNG for all game decisions, and SHALL use `Math.random` nowhere in game logic. THE Seed itself SHALL come from a cryptographic random source.
17. WHEN a signed-in player has a Run in progress for a World, THE Play_Service SHALL resume it (owner decision 6).

### Requirement 8: Panning and input

**User Story:** As a player on a phone or a laptop, I want to pan the scene by touch, mouse or keyboard and reach every object, so that I can play the whole game with the input I have.

#### Acceptance Criteria

1. THE Scene_Viewer SHALL pan a Scene by pointer drag with a mouse or a finger, using pointer events and plain DOM and CSS, with no game engine and no canvas library.
2. THE Scene_Viewer SHALL pan with the left and right arrow keys when it has focus, and SHALL show visible pan buttons to the left and to the right of the Scene.
3. THE Scene_Viewer SHALL keep the Scene inside its bounds, so no empty area shows past either edge.
4. THE Scene_Viewer SHALL state that its pan maths uses physical x with a comment that says why, because the painted Scene is a fixed image (`i18n-rtl.md` exception).
5. EVERY Hotspot SHALL be a focusable button with an accessible name from the catalog or the content, and activating it with Enter, Space, a click or a tap SHALL give the same result.
6. WHEN a Hotspot receives keyboard focus and lies outside the visible area, THE Scene_Viewer SHALL pan it into view.
7. THE Hotspot touch target SHALL be at least 44 by 44 CSS pixels at the 390 px viewport width, including Hotspots whose painted object is smaller.
8. THE Game SHALL be playable from the Hall through the Tutorial_Room to a broken curse with the keyboard alone, and with touch alone.
9. THE Scene_Viewer SHALL load a Scene with a width and height set, so layout does not shift, and SHALL load only the Scenes and sprites of the current World.
10. A drag that moves more than a small threshold SHALL not also activate the Hotspot under the finger.

### Requirement 9: Language and direction

**User Story:** As an Arabic-speaking player in a later release, I want the interface to switch language and direction, so that the game is ready for Arabic.

#### Acceptance Criteria

1. THE Game SHALL take every label, message and `aria-label` from the translation catalog by key, and story text from the content store.
2. THE Game SHALL use logical CSS properties only, and SHALL use physical left and right only in the Scene_Viewer pan maths and in painted-scene coordinates, with a comment that says why.
3. WHERE `FEATURE_ARABIC` is true, THE Game SHALL set `dir` and `lang` on the root and SHALL mirror directional icons and not mirror the painted Scenes, numbers or images.
4. THE Game SHALL format numbers with `Intl` using the active locale.
5. THE Game SHALL keep story text in English.

### Requirement 10: Two Phase 3 findings in the game

**User Story:** As the owner, I want the two game issues found in Phase 3 fixed, so that the local server cannot be crashed and the text test catches every hardcoded word.

#### Acceptance Criteria

1. WHEN a request path contains a malformed `%` sequence, THE Game's `scripts/serve-build.mjs` SHALL answer with a client error status and SHALL keep running.
2. THE Game's no-hardcoded-text test SHALL fail when a JSX line holds only a word of text.
3. THE Game's no-hardcoded-text test SHALL have a test that proves rule 2 by feeding it a failing sample.

### Requirement 11: Images in the game

**User Story:** As a developer, I want every game image to load from a known URL in both dev and build, so that no Scene or sprite is broken.

#### Acceptance Criteria

1. EVERY asset id the Game uses SHALL map through `assetUrl` to a file that exists under `assets/`, and a test SHALL check this for all ids in the Layout_Data and the shared game UI.
2. THE Game SHALL serve its images at the `/media/...` URL form that `assetUrl` returns, in dev and in the production build, without copying files into `assets/` or `content/`.
3. WHEN a request names a file outside the canonical `assetUrl` form, THE Game's image serving SHALL answer 404, using the same rule as the atlas.
4. THE Game SHALL give every Scene and sprite its real width and height and SHALL lazy-load sprites and Scenes that are not on screen.

### Requirement 12: Kiro custom agent and hook

**User Story:** As the owner, I want a balance-review agent and a right-to-left hook in `.kiro`, so that puzzle balance and direction rules are checked by Kiro itself.

#### Acceptance Criteria

1. THE work SHALL read the current Kiro documentation for custom agents and hooks before writing either file, and SHALL record the page and date in `docs/kiro-usage.md`.
2. THE work SHALL add a Kiro custom agent named `game-balance-reviewer` in the format the documentation gives, that reviews puzzle difficulty, fear pacing and dead-end fairness per World.
3. THE work SHALL run the Balance_Reviewer over all twelve Worlds and SHALL record its findings per World in `docs/phase-4-handover.md`.
4. WHERE no hook exists that checks physical left and right CSS on component save, THE work SHALL add one in `.kiro/hooks/` in the existing `v1` format, with a trigger on saving `.tsx` and `.css` files under `apps/` and `skeleton/`, which reports `left`, `right`, `margin-left`, `margin-right`, `padding-left`, `padding-right`, `border-left`, `border-right`, `text-left`, `text-right`, `ml-`, `mr-`, `pl-`, `pr-` and `float: left` or `right`, and edits nothing.
5. THE work SHALL record both in `docs/kiro-usage.md`.

### Requirement 13: Tests

**User Story:** As the owner, I want tests that fail when a rule is broken, so that I can trust the game without playing every seed by hand.

#### Acceptance Criteria

1. THE suite SHALL run with `pnpm -r test` with no database and no network, and the Phase 1 to 3 tests SHALL stay green (skeleton 513, game 46, atlas 154 at Phase 3, plus any tests the owner approved to change).
2. FOR ALL legends and many seeds, a scripted player that uses only the atlas text (the chapter text at each answer's anchor, and the contradiction anchors of dead ends) SHALL win the Run through the Play_Service.
3. FOR ALL legends, a scripted guessing player SHALL be able to reach a full Fear_Meter, and the restart SHALL produce a Seed different from the restarted Run's Seed.
4. FOR ALL legends and seeds, every Dead_End's contradiction anchor SHALL exist in the legend's anchors and the chapter text SHALL exist.
5. THE browser payload tests SHALL call the same code the server functions call, with an in-memory store, for a fresh Run and after each action, and SHALL assert that no response contains `correctIndex`, any role field, the true version id, any `swaps` field, or an unused Hint 2 anchor, and that the position of the correct option in the payload is not the same for all seeds.
6. THE tutorial tests SHALL cover each of the three details as the code, digit answers, the "Also accept" forms, and rejected values.
7. THE test for a tampered Guest_Token SHALL change one character, truncate it, replace it with a token for another legend, and expire it, and SHALL expect a refusal in each case.
8. THE score tests SHALL play Runs with known numbers of Hint 2 uses and wrong answers and SHALL expect the Phase 2 formula's value from the server counts.
9. THE layout tests SHALL check that every Hotspot of every World, the Hall and the Tutorial_Room has a Layout_Data position inside its Scene, a size of at least 44 CSS pixels at 390 px width, no overlap with another Hotspot of the same Scene, and a sprite or a region.
10. THE asset tests SHALL check that every asset id the Game uses maps through `assetUrl` to an existing file.
11. THE Keeper's Note tests SHALL check that its anchor appears once on its atlas page, that the three phrases each appear once in the chapter, and that the Atlas_Reader_Role privilege list includes the new tables or columns and nothing else.
12. THE tests SHALL include property tests (fast-check) for the generator-facing rules that the Phase 4 code depends on, and SHALL be run after any change to the generator, RNG or lead logic.
13. EVERY new test SHALL fail when the rule it checks is broken, shown by deliberate mutations recorded in the handover.
14. THE separate smoke check against `dev-skeleton-core` SHALL: as a guest, finish the tutorial and win the Banshee World through the server functions; as a test user, win one other World and check the run row and the score; trigger one full-fear restart; and delete the test users by exact id afterwards. THE smoke check SHALL print no cookie, password, token or Seed of an unfinished Run.
15. THE browser check SHALL use headless Chrome for: keyboard-only play from the Hall to a broken curse, a 390 px touch-width pass, and a reduced-motion pass.
16. THE work SHALL record the exact commands and results of the smoke and browser checks in the handover.

### Requirement 14: Panorama loading

**User Story:** As a player on a phone, I want scenes to appear without a long blank wait, so that the game is playable on a slow connection.

#### Acceptance Criteria

1. WHEN a Scene opens, THE Game SHALL show the Scene's first view without waiting for sprites and spirit images.
2. THE work SHALL measure the file size of every Scene it loads and the time to first view on a throttled phone profile, and SHALL record the numbers in the handover.
3. IF the first view of a Scene takes longer than the design's stated budget on the throttled profile, THEN THE work SHALL report it as a finding and SHALL not change an image under `assets/`.

### Requirement 15: Boundaries and database

**User Story:** As the owner, I want Phase 4 to stay inside its limits, so that content, the earlier phases and deployment are not changed by accident.

#### Acceptance Criteria

1. THE work SHALL not edit, create or delete any file under `content/` or `assets/`.
2. THE work SHALL not change the Phase 1 parser, generator or audit logic, the Phase 2 auth, access rule or score formula, or the Phase 3 atlas, except for the Keeper's Note changes in requirement 3 and the two game fixes in requirement 10.
3. THE work SHALL not change `vercel.json`.
4. THE work SHALL do database work only on `dev-skeleton-core`.
5. IF the design needs a schema change or a new `db:import`, THEN THE work SHALL stop and ask the owner before any such step.
6. THE work SHALL never read, print or write a secret value. IF a new secret is needed, THEN THE work SHALL stop, name the variable, and wait for the owner to add its value to `.env`.
7. THE work SHALL add new variable names to `.env.example` with no values.
8. THE work SHALL leave nothing committed or pushed.
9. THE work SHALL not start Phase 5.

### Requirement 16: Handover and usage log

**User Story:** As the owner, I want a handover document and a usage log, so that I can check the phase before I commit it.

#### Acceptance Criteria

1. THE work SHALL write `docs/phase-4-handover.md` with: files and folders created; versions pinned and why; the Play state model (server, Guest_Token, what the browser receives); the fear amounts and the Balance_Reviewer's findings per World; the Layout_Data and how to adjust a Hotspot position; the Keeper's Note import and its atlas page; schema changes and grants; test results (counts, pass or fail); the smoke-check results; panorama file sizes and load behaviour on a throttled phone profile; skills used and findings; Content_Gaps found; and anything that needs the owner's action.
2. THE work SHALL add a Phase 4 entry to `docs/kiro-usage.md` that lists the Kiro features used and each skill used with what it found.

## Process constraints

These are rules for how the work is done. They are not user stories. Skills never override this spec, the steering files or the owner's prompt. On a conflict the spec wins and the work tells the owner.

### Skills to use during implementation

| Skill | Used for |
|---|---|
| read-the-damn-docs | Before using TanStack Start server functions, pointer and touch events, Neon, Kiro custom agents or hooks, read the current official documentation. |
| ponytail | The smallest code that meets each requirement, especially panning and server state. |
| agent-security | The fair-play rules, the Guest_Token, input validation and every new server function. |
| agent-impeccable | Design and accessibility review of the Hall, the Tutorial_Room and two Worlds against the design steering and the theme packs. It runs in this thread, with reviewer sub-agents off. If the skill is not installed under that name, the work says so, uses `impeccable`, and continues. |
| agent-tester | Test quality. Each test must fail when its rule is broken. |
| agent-guard | A guard pass after each group of tasks. |
| verify-and-stop | The final check before the handover. |

### Skills not to use

- agent-pilot, agent-superpowers and agent-gamestudio.
- Any skill that starts sub-agents or its own workflow.

### Stops

The work SHALL stop and wait for the owner at each of these points:

1. After the requirements are written (this document).
2. After the design is written.
3. After the task list is written.
4. IF a schema change, a new `db:import` or a new secret is needed. The Guest_Token key variable is expected to need a new secret; the work names it and waits.
5. IF content is missing for a mechanic and the missing data blocks it.
6. IF a checkpoint fails and cannot be fixed inside this spec.
7. Once in the middle, when the Hall, the Tutorial_Room and the Banshee World are playable end to end. The work gives the commands to run both apps locally and a short list of what to try, then waits for feedback before it builds the other eleven Worlds.
8. After the handover is written. Phase 5 is not started.
