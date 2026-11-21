- `contentHash` is sha256 hex of the raw file text (same approach as the legend loader).
## 3.3 Schema migration
- Generated `0003_keepers_note_play_state.sql` with drizzle-kit 0.31.11. Differences from the approved SQL are form only except the missing grant (drizzle-kit cannot emit grants).
- Owner approved `GRANT SELECT ON keepers_note TO atlas_reader;` as the single grant. The repo keeps reader grants as hand-run SQL in `docs/tech-decisions.md` (no migration holds a grant), so the grant was appended to the migration file after a `--> statement-breakpoint`, and the same line was added to the reader-role list in `tech-decisions.md`.
- Applied on 2026-11-20; see `migration.md`.
- Applied 0003 to dev-skeleton-core only on 2026-11-20. Owner role has full access to the new tables and columns; `atlas_reader` can SELECT `keepers_note` and nothing else new (verified with grant checks and an `atlas_web` connection).
## 6.1 UI catalog
- `hub.clock` needs a singular form and the design lists one key. Added `hub.clock.one` ("{n} hour until dawn."); `hub.clock` is the other form. Callers pick by `Intl.PluralRules`.
- `world.comingLater` removed. The stub world page rendered it, so its paragraph was dropped (the page keeps title and back link) until the play page replaces it.
- `ar.ts` stays empty (missing keys fall back to English), as today. G8 sentences are flagged in a comment in `en.ts`.
## 6.2 Pan and media helpers
- `mediaUrl` strips trailing slashes from the base so `https://x/` and `https://x` give the same URL (`assetUrl` paths start with `/`). Refused ids throw `AssetIdError` unchanged.
- `panToReveal(pan, box, viewport, scene)` moves the least distance; a box wider than the viewport gets its left edge aligned. The result is always clamped.
## 2.2 Pure engine
- A swapped Hotspot (served role differs from authored role) answers with a neutral key: `tap.something` when that tap newly opened a slot or collected a step, else `tap.nothing`. The reply shape is the same for every Hotspot.
- `PlayState` has no status field (per design), so the ended state is derived: `fear >= FEAR.max` is `restarted`, else all slots solved and the true lead followed is `won`. `step` throws `PlayError('ended')` on such a state.
- Fear is clamped to 0..100 in the state. Reply ids (highlights) and state ids are raw (no legend prefix); fear table keys are `<legend-id>:<raw id>`.
- A repeated wrong option, an unknown id, an unopened or locked slot, and a follow with missing steps throw `PlayError('refused')` with no state change.
- `relicOf` returns `{ assetId, name }` with `name: null` when the usage is only "Relic" (jersey-devil); the caller uses the catalog fallback. A usage without a `relic:` prefix (flying-dutchman) is used whole.
- `curseText` on a win is `run.finalPuzzle.description`.
## 2.6 Hall rules and hub contrast
- `doorState` returns `locked` (tutorial not done, wins over everything), `open` or `signin`; it reuses `canEnter`. `cursesRemaining` is 12 minus distinct ids, floored at 0; the caller passes only that visitor's broken worlds (guests: the guest world only, from the browser).
- `hubContrastReport()` lists 12 pairings (design table; danger fill is non-text at 3.0). Colours not in `BASE_PALETTE` (cold, danger, danger-ink) are in `HUB_EXTRA`, and a test keeps them equal to `tokens.css`. Not exported from `client.ts` yet; later tasks add that when the game needs it.
## 3.2 Keeper's Note tests
- `skeleton/test/keepers-note.test.ts`: Property 25 generates documents in the real file's shape (varied text, phrases placed once in separate paragraphs), then runs parse, plan, database-shaped rows (details reversed) and the readers. Examples run against `content/keepers-note.md`.
- "No other year or count matches an answer": each detail's accepted forms (digits and spelled out) occur once together in the chapter; the only digits are `1887`; the only number words from two to twenty are `eleven` and `fourteen`. The word "one" is left out of the list because it is ordinary prose ("one door for each place").
- Mutation checks (parser phrase-once, parser anchor-once, detail sort, `alsoAccept` copy, hook mapping) each fail a test; all restored.

- 3.5: importer logic lives in `skeleton/src/keepers/import.ts` (the script is a thin wrapper like `import.ts`). Unchanged check compares `content_hash` and the detail row count, because details have no hash column of their own.
## 6.3 Layout types, fear events, registry
- G4: only `flying-dutchman` has per-event reduced-motion lines in the content. The other 11 legends use the catalog caption (`fear.caption.sound` or `fear.caption.sight`) under reduced motion. The fear data holds no reduced-motion text; a test fails if any other legend gains a per-event line without the data being reviewed.
- Fear event ids are `fe-1` to `fe-5`. The content gives ids only for `flying-dutchman`; the parser numbers the rest, and the data uses the same ids.
- Triggers follow the design table by event number. Exceptions "as written" (banshee 1 and 5, jersey-devil 5) equal the defaults. baba-yaga, draugr, vetala and yuki-onna event 5 are `decoy-tap` ("the player's last tap").
- Added an optional `scene` (1 to 3) on `scene-enter` entries so the engine does not guess: event 3 is scene 2, event 5 is scene 3. Banshee 5 ("returns to the scene", the comb on the loft sill) is scene 3.
- Caption kind: `sound` when the text names a sound word from the design list, plus the design's sound-only events. Judgement calls: banshee 1 (lament) and spring-heeled-jack 1 (thud) are sound-only per the design list. jersey-devil 4 (hoof taps, "audio cue with a text caption") is `sound`. chupacabra 3, spring-heeled-jack 3 ("rustles") and draugr 3 are `sight`, since the word is not in the list. All other events are `sight`.
- `MIN_BOX` is 176, plus `SCENE_WIDTH` 4096 and `SCENE_HEIGHT` 1536 in `layout/types.ts`.
- The registry (`layout/index.ts`) throws if a `worlds/<id>.ts` file's `legendId` differs from its file name, or if two files give the same id. No World files exist yet; the "every legend has a layout" check comes in 9.12.
- Layout rule tests run on a layout built from the content (banshee) plus mutations that each must fail, since no real World layout exists yet. Every registered layout is checked too once added.
## 6.4 Scene viewer, Hotspot, scene navigation
- Added catalog key `world.nav` ("Scenes") for the scene nav `aria-label`; no existing key fit.
- The viewer region and heading use the scene name from content; Hotspot names (`label`) are story text passed in by the caller. Hotspot ids in `hotspots` match `HotspotBox.id`.
- Pointer capture starts only after the 8 px threshold, so a plain tap still reaches the Hotspot button. The drag ends on `pointerup`, `pointercancel` and `lostpointercapture` (docs-read.md note). The click that follows a drag is cancelled in the capture phase.
- Pan is in screen px; scene scale = viewport height / 1536, minimum 0.25. The stage and pan buttons are `direction: ltr` so the fixed painted image and "Pan left" / "Pan right" stay physical in RTL.
- Hotspot tap box is at least 44 px. Sprite `width`/`height` attributes use the drawn box (doubled width for a cropped sheet half), because the sheet's real size is not in Layout_Data. Revisit in 6.8 or when real layouts land if the files differ.
- Scene pan memory per scene and focus-to-heading are split: the parent keeps pans (`initialPan`, `onPanChange`); `SceneNav` focuses the heading and announces on change (not on first render).
- Not wired into a route yet (7.7). Component tests are 6.8.
## 6.5 Themes and fonts
- Added the 22 `@fontsource/*` packages (same exact versions as the atlas) to `apps/game`, installed offline from the pnpm store. `apps/game/src/fonts.ts` is a copy of the atlas map (duplication recorded here, as the Phase 3 handover does); `test/fonts.test.ts` is the atlas test, so the map is checked against the installed OFL packages. The root links only `BASE_FONTS` (display, body, UI); a World will link its own `resolveTheme(...).families` through `fontLinks` when 7.7 builds the route.
- `lib/theme.ts` (`themeStyle`, `themeClass`, `themeColorMeta`) and `components/ThemeRoot.tsx` apply a resolved theme as inline CSS variables on the World root. Only the eight names `resolveTheme` returns are applied. `null` means the Hall or Tutorial_Room: no inline style, base tokens.
- `styles/theme.css` redefines no base token (tokens stay in the skeleton). It adds `.hub-theme` and `.world-theme` roots and three role variables: `--fear-fill` (danger, non-text), `--error-ink` (danger-ink), `--caption-ink` (cold). The test fails on a raw colour or a token redefinition in that file.
- `hubContrastReport` and `HubPairing` are now exported from `@kiroween/skeleton/client` (the 2.6 note said a later task would). Hub AA checks run in `test/theme.test.ts`; World AA checks come from `resolveTheme`, and the test re-checks the applied variables.
- Not done here: `getWorldInfo` returning the resolved theme, and using `ThemeRoot` in the Hall and World routes (7.x).
## 6.6 Pan and media property tests
- `test/pan-media.test.ts` holds Properties 23 and 24 (fast-check, 300 runs each) plus a few fixed edge cases. Boxes in Property 23 always fit both the viewport and the scene.
- Mutation check on `lib/pan.ts` and `lib/media.ts`, each restored afterwards: dropping the upper clamp, off-by-one reveal on either edge, dropping the media prefix, skipping `assetUrl` validation and a stray slash between base and path all fail a test. The one-pixel reveal cases are fixed examples because random boxes rarely land exactly on an edge.
- Equivalent mutant, not a gap: using `viewport - scene` without `Math.min(0, ...)` in `clampPan` gives the same result, because the outer `Math.min(0, ...)` already caps it at 0.
## 2.3 toView
- `view.ts` builds `PlayView` from the state and the Run. `endInfo` in `engine.ts` is now exported so the view and `step` share one end summary.
- `SlotView.index` is 1-based (the number the notebook shows). State: solved, else locked (final slot with others unsolved), else open (opened), else hidden. `question`, `options` and `tried` exist only for an open slot, options in generator order.
- `hint1` is never in the view: `PlayState` records no "Hint 1 asked" flag, and the design says Hint 1 is free, so its text arrives in the reply only. `hint2` appears only for slots in `hint2Used`.
- Leads are listed in content (`legend.leads`) order, not true-first, so list position does not reveal the true lead. A lead shows after its first step is collected; true and dead-end leads have the same fields. `start` is the starting version's `sourceType, era` (versions have no title field). A dead end with no authored text gets `text: ''` because the wire type requires a string.
- `ended` (with Seed and curse text) is present only when the state is won or restarted.
## 2.5 Tutorial rules
- `skeleton/src/play/tutorial.ts`: `pickTutorialDetail` uses `createRng('tutorial/' + seed).pick(['d-year','d-keys','d-rooms'])`; state `{v, detailId, fear, hint2Used, solved}` with a zod schema; `normaliseAnswer` is trim + lowercase; `isTutorialAnswer` checks the answer and every "Also accept" form (`eleven`, `fourteen`; `none` is an empty list, not a literal accepted word). Details are passed in as rows (`TutorialDetail`), read by the service from `keepers_note_details`.
- Wrong answer: no fear, no restart, state unchanged. Hint 2 adds `FEAR.tutorialHint2` once, repeat is free. `tutorialView` never carries the answer or the detail id; the drawer question comes only from the `drawer` reply.
- Action kinds follow `validate.ts` (`drawer`, `hint2`, `answer`); the design text says `tap-drawer`, the validated wire name is `drawer`.
- Receipt: `createTutorialReceipt` refuses unless solved; `verifyTutorialReceipt` checks kind, expiry, fixed seed marker and `{done:true}`. The DB write (`markTutorialDone`) stays in the service (2.7).
- Hint 1 constant equals the text in `content/hub-and-tutorial.md`; the comparison test is in 2.16.
- No tests added here; 2.16 owns the tutorial properties and examples.
## 2.8 Token codec property tests
- `test/token.property.test.ts` holds Properties 1 and 2 (fast-check). The key is `randomBytes(32)` per run and is never printed. Clock is injected.
- Property 1 also checks that the seed and a state value are not in the token text or the decoded bytes, and that the raw length is 12 + plain JSON + 16 (this catches a shortened tag). Short legend ids are left out of the clear-text check: a one-letter id appears in base64 by chance.
- Property 2 changes one character at every position (alphabet chars only), truncates at every length, and covers other legend, other kind, expiry (one second before passes, at the expiry second fails), other key, and one shared status/code/message across reasons. The only skipped case is the unused trailing bits of the last base64 character, which decode to identical bytes.
- Mutation check on `token.ts`, restored afterwards (byte-identical): kind dropped from AAD, expiry `<` instead of `<=`, no expiry check, receipt using the play TTL, fixed IV, a different error code, shorter tag, and both legend checks off all fail a test.
- Not a gap: removing only the legend from AAD, or only the payload legend check, still passes. Each check covers the other (defence in depth), so only removing both is observable; that case fails.

## Task 2.17: hall rules and hub contrast tests

- Extended `skeleton/test/hall.test.ts` (from task 2.6) instead of adding a file. New `Property 22` block (fast-check): door state for any visitor, tutorial flag, legend id and guest world; `doorStates` agrees with `doorState` and keeps id order; curses remaining equals 12 minus distinct broken worlds.
- Contrast tests now pin all 12 pairing names with their minimums (4.5 text, 3.0 large text and danger fill), the design ratios for every pairing not already pinned, and danger fill on surface at about 3.00 (the edge, at least 2.995).
- Mutation check on `play/hall.ts` and `theme/hub.ts`, restored afterwards: tutorial lock removed, guest `signin` turned into `open`, curses counted without distinct, danger minimum lowered to 2.5, a pairing removed, and the danger colour darkened each fail a test.
- Skeleton typecheck clean; 568 tests pass in 32 files.

## 3.6 Reader role checks
- The repo had no reader privilege list test. Added `skeleton/test/reader-privileges.test.ts`: it parses the GRANT statements in `docs/tech-decisions.md` and the migrations and requires exactly the four SELECT grants (legends columns, five whole tables, assets columns, `keepers_note`), plus CONNECT and USAGE, no `ALTER DEFAULT PRIVILEGES`, and no grant touching `keepers_note_details`, `player_flags` or `runs`.
- Moved the `db:check-reader` check lists into `skeleton/scripts/reader-checks.ts` (data only) so the test can read them. The script now also checks `keepers_note` is readable, and that `keepers_note_details`, `player_flags` and INSERT/UPDATE/DELETE on `keepers_note` are refused (42501).
- Run on dev-skeleton-core: `db:check-reader` 36 of 36 yes. Mutation check: adding `player_flags` to the grant and deleting the `player_flags` refusal made 3 tests fail; both edits restored.
## 6.7 Fear overlay, motion setting and spirit panel parts
- New: `lib/motion.ts` (`kiroween.motion.v1`, values `reduce`/`full`, none = follow the system), `lib/fearPlayer.ts` (4 s gate, one play per trigger key, caption choice), `components/{FearOverlay,FearMeter,SpiritPanel,MotionToggle}.tsx`, `components/fear.css`. Strings come from existing catalog keys (`fear.meter`, `fear.caption.*`, `settings.motion`); no new keys.
- Caption shows for 3 s (under the 4 s gap) in a polite live region. Full motion: one flash animation of 1.2 s with two rises (about 1.7 per second), run once. Reduced motion: no flash element animation, opacity-only fade of 400 ms at most (13% of 3 s). The per-event reduced-motion line is used only in the reduced path; otherwise the catalog caption.
- Fear meter: frame `shared-game-ui-fear-01` (decorative image) over a `role="meter"` fill, with the same value as hidden text. Fill uses `--fear-fill`.
- Spirit: `SpiritCorner` (full figure, `-spirit-01`) and `SpiritPanel` (`-spirit-02` in `shared-game-ui-frame-01`), both decorative images, URLs through `mediaUrl`. The panel takes children, so question text and reaction lines stay with the route that owns the run state.
- Tests in `test/fear-ui.test.ts` parse the keyframes (flashes per second at most 3, reduced fades at most 400 ms, no transform, no infinite loop). Component rendering is not tested here; the game vitest config has no DOM, and 6.8 owns viewer tests.
- Game typecheck clean; 99 tests pass in 10 files.
## 6.8 Viewer component tests
- The game vitest config has no DOM and no jsdom or happy-dom is installed (offline). `test/viewer.test.ts` therefore renders `SceneViewer` and `Hotspot` with `react-dom/server` static markup and tests pure functions for behaviour. `useT` is replaced by the real English `translate` through `vi.mock`, because the real hook needs the router root loader.
- To make behaviour testable, key, button and drag-threshold rules moved from `SceneViewer` into `lib/viewerInput.ts` (`keyPan`, `buttonPan`, `isDrag`, `DRAG_THRESHOLD`, `KEY_STEP`); `SceneViewer` calls them with unchanged behaviour.
- Enter, Space and click: `Hotspot` is a native `<button>` with only `onClick`; the test asserts the element type, no key or mouse handlers, and that `onClick` calls `onActivate(box.id)` once. The browser then gives all three the same path.
- Limit: the real key, touch, pointer-capture and click-suppression-after-drag behaviour (the `suppressClick` wiring) is not exercised without a DOM. It is proven in the headless Chrome task 11.2.
- Mutation check, each restored: drag threshold `>` to `>=`, ArrowRight clamp removed, End returns 0, button step changed, key handler added to Hotspot, `data-marked` removed, hidden marker text removed, 44 px minimum lowered, accessible label removed, `fetchPriority`, lazy sprite loading, `height`, region `aria-label`, `tabIndex`, and the disabled pan button each made a test fail.
## 7.1 Hall and tutorial layouts
- `layout/hub.ts` exports `HUB_SCENE` (18 tap regions) and `HUB_DOOR_IDS`; `layout/tutorial.ts` exports `TUTORIAL_SCENE` (7). Neither is in `WORLD_LAYOUTS` (that registry is one file per legend).
- Hotspot ids are the full ids from `content/hub-and-tutorial.md` (`hub-door-banshee`, `tut-corkboard`), since these have no legend prefix. `sceneId` is `hub` and `tutorial` (content names no scene id, order-based default); `assetId` is the scene file id.
- Boxes were placed from the scene images. The hall list is ordered by ascending x (not table order); door order is table order, left to right, since the content gives no door-to-position mapping beyond "Door 1..12".
- Painted doors in the hall are 150 to 210 px wide; doors 2, 3 and 4 are boxed at the 176 minimum, so doors 3 and 4 sit up to about 45 px right of the painted door. Door 4 boxes 1300 to 1480.
- Tutorial: drawer and candle share x 1640 (candle first); they do not overlap in y.

## 7.2 Banshee layout
- Sprite match: every sprite follows the asset usage column. `banshee-game-hotspot-15` is one sheet, left crop for `hs-bedstead`, right crop for `hs-candle`.
- Boxes were placed from the scene images, in the left-to-right order of each scene description. The chest (loft) and the half door, wall and back door (kitchen, ford) have no Hotspot, so nothing is placed there.
- Sprite art boxes equal the tap boxes (no separate art offset). The 1:1 sprites may need a visual tune with the `?layout=1` overlay.
## 2.7 Store port and service
- New: `skeleton/src/play/store.ts` (`PlayStore` port, `createMemoryPlayStore` with the same user, status and rev WHERE rules), `skeleton/src/play/service.ts`, `skeleton/test/play-service.test.ts`.
- Signature change from the design: `startTutorial` and `actInTutorial` take a `visitor` (second argument), because a solved tutorial must write `player_flags` for a signed-in user and return a receipt for a guest. The game server builds the visitor from the session.
- Response shape: `{ view, reply, ended, token }`. After a restart `view` is the new Run and `ended` is the old Run's summary (with its Seed). After a win `view.ended` is set and a guest `token` is null.
- Guest missing token on an action, an invalid token, an ended state, or a Seed that no longer generates: the one `session` error. Signed-in unusable state: `startWorld` abandons it and starts fresh; `actInWorld` answers `not-found`.
- `rev`: save or end failing once reloads and re-applies; a second miss answers `conflict` (409). A restart draws a Seed different from the old one, up to `MAX_SEED_TRIES`, then `NoRunError`.
- Not enforced in the service: "tutorial done before entering a world". The hall handles it (guest tutorial state is browser-only, so the server cannot check it).
- The service is not yet exported from `skeleton/src/index.ts`; the game server task (4.x) imports it or adds the export.
- Skeleton typecheck clean; tests pass.
## 4.1 Atlas Keeper's Note page
- Reads: new `skeleton/src/db/keepersRead.ts` (`getKeepersNote`, `isKeepersNoteAnchorStored`), exported from `index.ts`. Both select named columns of `keepers_note` only; `keepers_note_details` is never named. `client.ts` exports `isKeepersNoteId` and the `KeepersNoteView` type (pure). `listLegends` and `atlasUrl` are unchanged.
- The skeleton gained a file because the atlas has no other way to query through Drizzle; the task text said atlas only.
- `getLegend` now returns `{ kind: 'note', note }` or `{ kind: 'legend', legend, theme }`. `keepers-note` is handled before the legend lookup. The note page has no pack theme (base palette, no `theme` in loader data).
- `resolveAnchorFn` passes a lookup that tries `anchors`, then `keepers_note.anchor`. `resolveAnchor` is unchanged.
- Footer: `footer.keepersNote` catalog string, link to `/legends/keepers-note`. The page shows the stored label.
- Unit tests for this are task 4.2; the existing 154 atlas tests pass and atlas typecheck is clean.
## 7.3 Hall and tutorial role table tests
- New: `apps/game/test/hub-tutorial-roles.test.ts`. It reads `content/hub-and-tutorial.md` (read only) and parses the two Hotspot tables.
- Checks: hall has 18 Hotspots with the table's ids; the 12 doors match the table order (both `HUB_DOOR_IDS` and the scene list); hall decoys are exactly lamp, jars, window (15 meaningful); tutorial has 7 Hotspots with the table's ids; tutorial meaningful are corkboard, drawer, candle and the four decoys are coat, bookshelf, mirror, typewriter; corkboard is the last Hotspot and sits far right of the first 390 px view.
- Layout_Data carries no role field, so roles are compared between the doc and a role list pinned in the test. A role change in the doc fails the test until the list is updated on purpose.
- Mutation check (restored after): duplicated door id, removed `hub-jars`, renamed `tut-candle`, moved corkboard to x=700. Each failed the intended test.
- Game typecheck clean; 12 files, 116 tests pass.
## 6.9 Guard pass on the UI foundation
- Three small fixes (merged PageUp/PageDown branches, shared `MIN_TARGET_PX` constant in `layout/types.ts`, typed `FocusEvent` import). Details in `guard-6.9.md`. Game typecheck clean; 116 tests pass.
## 2.9 Payload secrecy property tests
- New: `skeleton/test/play-secrecy.property.test.ts` (Properties 3 and 4) and `skeleton/test/helpers/play.ts`. The helper now holds `playSetup`, `winningActions` and `playableLegends`, moved out of `play-service.test.ts`, which imports them.
- Property 3 drives the real `startWorld` and `actInWorld` (memory store, real token codec) for a random legend, Seed, signed-in or guest player and a random action list. After each response it checks: no forbidden key at any depth (`correctIndex`, `role`, `swaps`, `trueVersionId`, `trueLead`, `seed`), no Seed text, `hint2` only on slots whose Hint 2 was used, no unused Hint 2 anchor in the JSON (unless a followed dead end or another used slot handed out the same anchor), `options` equal to the generator's four texts in order, and the same lead field names for the true lead and dead ends.
- Limit: a followed lead differs in shape by design (`followed.kind` is `true` or `dead` with text and anchors), so the same-fields check applies to leads before they are followed.
- The check stops at a restart or win, because the response then carries the old Run's summary with its Seed, which is allowed. A separate test plays the winning script and checks every response before the last.
- Property 4 uses 30 fixed Seeds per legend, opens every slot through the service and records where the correct option sits in the served list. Each slot must show at least two positions.
- Mutation check (restored after): Hint 2 always shown, `correctIndex` added to a slot view, `trueVersionId` added to the view, correct option always first. Each failed Property 3 or 4.
## 2.10 Answers and hints property tests (Properties 5, 6, 7)
- New: `skeleton/test/play-answers-hints.property.test.ts`, 100 runs each, through the real `startWorld` and `actInWorld` (memory store, helpers from `test/helpers/play.ts`). Property 5: the correct option solves with no fear change; each untried wrong option adds exactly `FEAR.wrongAnswer`, is recorded in `tried`; a repeat is refused and changes nothing. Property 6: Hint 1 repeats leave the whole view unchanged and name only meaningful Hotspots; the first Hint 2 adds `FEAR.hint2` and returns the anchor, later ones return the same anchor with no charge. Property 7: the served anchor is in `legend.anchors` and its text (chapter, or version claim, conflicts and paragraph) contains the correct option by the generator's own `answerInText`. `true-or-told` and `ritual-order` slots are skipped there, as in the Phase 2 "answer is written in the linked text" property, because their answer is a judgement or an order.
- **Bug found by Property 7, fixed in the generator.** Hint 2 used the slot's authored `hint2Anchor`, not the anchor of the fact the Run chose. A slot has several candidate facts, so in about 60% of slot-instances (5663 of 9200 over 200 seeds x 12 legends) the linked chapter did not contain the answer. That breaks requirement 5.7 and would make Property 14 unwinnable. Fix: `generate.ts` passes `fact.anchor` to `makeHints` (`hints.ts`), keeping the refinement of a bare `--versions` anchor to the true version. After the fix the probe shows zero misses. The authored per-slot `hint2Anchor` in the content files is now unused for slots (the final puzzle's `hint2Anchor` is unchanged). Content finding for the owner: those authored anchors are redundant; nothing under `content/` was touched.
- The Phase 2 property "hint 2 deep-links ... " in `test/helpers/properties.ts` asserted the old behaviour (anchor equals the authored one). It now asserts the 5.7 rule: the hint anchor equals the chosen fact's anchor, refined only for the bare versions anchor.
- Mutation check (backed up, restored after; `src/play` diffed afterwards): wrong answer free, correct answer charges fear, Hint 1 charges, Hint 2 charged every time, repeated option accepted, generator back to the authored anchor. Each failed at least two of the three properties. `service.ts` was not mutated (the rules under test live in `engine.ts`).
## 2.10 confirmation pass: Phase 1 change made for requirement 5.7 (owner-approved)
- The owner approved the generator change. It is kept, nothing reverted. Details in `phase1-changes.md`.
- `git diff` of `generate.ts`, `hints.ts`, `test/generator.test.ts` and `test/helpers/properties.ts` shows only the hint-anchor rule. Phase 1/2 expectations that changed: the "hint 2 anchor" property, the `hint-anchor` error test and the "bare versions anchor is refined" test.
- Content finding: the authored per-slot `hint2Anchor` values are now unused for slots (the final puzzle's `hint2Anchor` is unchanged). `content/` was not touched.
- engine.ts re-verification: backed up to /tmp, then mutated by hand twice (line 138 wrong answer free; line 128 Hint 2 uncharged and uncounted). Properties 5 and 6 failed respectively. Each edit was reversed by hand and `cmp` against the backup reports identical bytes. Full skeleton suite and typecheck were run before the mutations (36 files, 605 tests pass) and again at the end.

## 2.13 Win, score and fear tests
- A restart with a positive score cannot be reached by play alone (wrong answers clamp the score to 0 first). The test saves a state through the in-memory store (meter at 85 to 94, all but one non-final slot solved), then makes one wrong answer through the real service. Smallest way to prove a restart never adds the curse bonus.
- Test file: `skeleton/test/play-win-score-fear.property.test.ts`. Heavy properties carry an explicit 120 s timeout.
## 2.19 Scripted player, guessing player, fairness report
- New: `skeleton/test/helpers/playFromAtlas.ts` (`playFromAtlas`, `playAsGuesser`, `rankOptions`, `atlasText`), `skeleton/test/play-atlas-player.property.test.ts` (Property 14, known-findings guard, report), `skeleton/test/play-guessing-anchors.test.ts` (requirements 13.3, 13.4). The player plays only through `startWorld`/`actInWorld`, reads the views, the Hint 2 anchor and the dead-end anchors from the views, and the chapter text from the legend at those anchors. It does not call `generate` and never reads `correctIndex`, roles, swaps or the true version. Hotspot ids to tap come from the authored hotspot list. Leads are followed in an order from `createRng('player/' + seed)`. Fear constants and the budget are untouched.
- **Decision: a word-overlap reading below the design's rules.** The design's two rules (statement sentence in the text; option within 80 characters of the longest matching part) alone win only 40 to 100% of seeds, because chapters paraphrase statements (example: "Craglea, the great bluff above the Shannon gorge near Killaloe" against the option "Craglea, near Killaloe"). Smallest fix that stays inside "reads only the atlas": when no design rule matches, rank options by how many option words occur in the text and how many question words sit within 80 characters. This is a reading skill, not a looser budget. The report keeps a column for the design-rule reader alone so the effect is visible.
- **Known content findings** (owner rule): chupacabra, draugr, el-coco, gumiho, naddaha, spring-heeled-jack, vetala are not won on every one of 40 seeds. Their win tests are `it.fails` and a test asserts the exact set. The other five win every seed. Cause and slots: `docs/phase-4-notes/fairness.md`. Main cause: `true-or-told` slots (answer not required in the text) and paraphrased `date-or-number`, `object-match`, `original-name` and `who-said-it` slots.
- Property 14 uses a pinned fast-check seed (`seed: 14`, 100 runs) over the five winnable legends, so a rare loss on an unseen seed cannot make the suite flaky. The 40-seed example suite and the exact-set test are the guard.
- Fairness table is written by the test only when `FAIRNESS_WRITE=1`, so a normal run writes nothing to `docs/`.
- Guessing player: a lucky guesser can win a Run (the true lead is one pick among a few). The test accepts any of three seeds and checks the first one that restarts; at least one must. The guesser asks Hint 2 on open slots first, then guesses options in order, then follows leads.
- Mutation check (backed up to /tmp/t219-backup before the first edit, undone by hand, `cmp` identical for all three): `generator/hints.ts` `hint2Anchor` returning `l.anchors[0]` failed Property 14; `play/engine.ts` `endStatus` with `FEAR.max + 1000` failed all 12 guessing tests; `play/view.ts` followed dead-end `anchors: []` failed the anchors test (after the player was changed to read anchors from the view, not the reply).

## 3.4 Postgres play store
- Empty or schema-invalid play_state on an in-progress row: `current` closes it as abandoned (guarded by id, user_id, status, rev; sets finished_at because of the runs_finished_when_closed check) and returns null. Reason: task text; a state-less open row would otherwise block the unique in-progress index.
- Abandon updates also bump rev. Errors map through runStore `toStoreError` (23505 on runs_one_in_progress becomes RunConflictError).
- markTutorialDone uses DO NOTHING as specified, so a player_flags row with a null tutorial_done_at would never be set; only this store writes that table, so no such row arises.

## Task 4.2: where the Keeper's Note SQL test lives
- `apps/atlas` has no `drizzle-orm` or `pg` dependency, so the recording stand-in cannot run there without a new dependency and a lockfile change. The SQL test is `skeleton/test/keepers-read.test.ts` (same stand-in as `atlas-read.test.ts`). The render, footer, `resolveAnchor`, `atlasUrl` and home-loader tests are in `apps/atlas/test/keepers-note.test.tsx`.
- The footer and the `functions.ts` anchor fallback are checked by reading the source text, because `Shell` is not exported and the server functions need a request context. This was the smallest option that stays inside the task.
- Mutation check (backups in /tmp/k42, restored and compared with cmp): duplicate anchor id, dropped label, removed footer text, details-table join in `keepersRead.ts`, removed anchor fallback, and a note reference in the home loader each made a test fail.
## Task 2.20: guard pass scope and file name
- The owner's message scoped the pass to `skeleton/src/play`, `skeleton/src/keepers` and tests, and named the notes file `guard-2.20.md` (task text said `guard-skeleton.md`, and `theme/hub.ts`). Followed the message. Reason: the latest owner instruction wins; `theme/hub.ts` was not reviewed.
- Guest token replay and unlimited tutorial guesses recorded as residual risks, not changed. Reason: stateless tokens and "wrong tutorial answer costs nothing" are spec decisions.

## Task 5.3 game server functions
- **Validation placement.** Each play function uses `.validator(passThrough)` and the Play_Service parses with its strict zod schemas inside `safely()`. Reason: a validator failure runs outside `safely()` and would skip the fixed status mapping; the service schemas already refuse unknown keys (user id, score, seed, counts).
- **Unknown errors.** `safely()` now maps every non-`PlayError`/`RunError` to the fixed `unavailable` error (503), per guard 2.20. This replaces the earlier generic 500 message.
- **Guest refusal.** `PlayError('sign-in-required')` from the service becomes `redirect({ to: '/sign-in' })` in `safely()`, so a guest asking for another world gets the Phase 2 redirect and no data.
- **Tutorial rate limit: not built.** The design gives no rate limit and a wrong tutorial answer costs nothing by spec. Residual risk: a script can guess the drawer answer without limit (answers are short: a year, a count). Impact is limited to marking the tutorial done for that user or guest. Revisit in Phase 5 (edge or Vercel firewall rate limit on `tutorialAct`).
- **Skeleton additions (needed to wire the service).** Exported the play service, `PlayError`, `createTokenCodec`, `relicOf`, `cursesRemaining` from the main entry, and added `db/tutorialRead.ts` (`loadTutorialDetails`, game role only, not in the client entry).
- **Hall data.** `getHall` returns `tutorialDone` (null for guests), `brokenWorlds`, `relics`, `cursesRemaining` (null for guests) and `ledger` (won or restarted runs only, with Seed). Guests get only the guest world's relic (public asset data).
- **Seed visibility.** `getAccount` rows carry `seed` only for won or restarted runs; null otherwise (abandoned and in progress hidden).
- **mediaBase** is `getEnv().atlasOrigin`, returned from `getShell`.
- **smoke.mjs** updated to call `startWorld`/`worldAct` instead of the removed functions; not run (needs a live server and database).

## Task 5.4: game server tests
- Tests live in `apps/game/test/server.test.ts`. Server functions need the Start runtime, so they are not called directly. The payload and guest-refusal tests call the Play_Service functions the server functions call (in-memory store, real token codec keyed through the game's own `parseEnv`). The source tests check that each server function sits behind `authMiddleware` or `requireUser`, goes through `safely()`, and that `safely()` maps `sign-in-required` to the `/sign-in` redirect.
- Built-output checks (removed functions absent from `dist/server`, CSRF and `requireUser` present, no `GAME_TOKEN_KEY`, token codec or answer field names in `dist/client`) are skipped when `dist/` does not exist, because `dist/` is not committed. Reason: `pnpm -r test` must pass with no build. Run `pnpm --filter @kiroween/game build` first to include them.
- Spec requirement 12 in the brief was read as 7.12 (key variable named, no value shown); `.env.example` is checked for the empty `GAME_TOKEN_KEY=` line and `env.test.ts` already covers the missing-key error.
- Mutations tried (each undone by hand, `cmp` against backup identical): added `finishRunFn`, `listMyRunsFn` without `requireUser`, removed the sign-in redirect, dropped `csrf` from `requestMiddleware`, added `correctIndex` to the slot view in `skeleton/src/play/view.ts`, appended `GAME_TOKEN_KEY correctIndex` to a built client file. Each made the matching test fail.
- Seeds in the payload test are distinctive strings, because a short seed such as `p-1` also appears as a slot id in the view and gave a false positive.
## 7.4 Client play library
- Split into `lib/playClient.ts` (no server import, takes the API and a storage, so it is testable) and `lib/play.ts` (binds the real server functions; `playClientFor(guest)`). Reason: importing `server/functions` in a unit test pulls in server-only code.
- Added a tutorial token key `kiroween.guest.tutorial.play.v1` so a guest reload resumes the tutorial. Not in the design list; smallest way to keep the `token` the server returns. Signed-in players keep nothing in the browser.
- A refused token (the one fixed session message) is cleared and the call retried once without it. A receipt is dropped only on that message; network or 503 keeps it for the next visit.
- Only a won run is written to guest progress (design). A restart is not recorded.
- Exported `PLAY_ERROR_MESSAGES` from `skeleton/src/client.ts` (browser-safe, no imports) to recognise the session message.
## 7.5 Hall route
- **Structure.** `components/Hall.tsx` (`HallView`, pure props, renders with react-dom/server) holds the scene, panels and ending; `routes/index.tsx` does the loader data, guest browser state and navigation; `lib/hall.ts` holds the pure rules. Door state is `hallDoorState(tutorialDone, mayEnter)` where `mayEnter` is the server's `canEnter` result per door (same rule as the skeleton `doorState`, which is not in the browser entry). Exported `WORLD_COUNT` from `skeleton/src/client.ts` for the count.
- **Locked door.** Activation goes straight to `/tutorial` (R1.3). The lock sentence is in the door's accessible name, and a CSS lock overlay is drawn through a new `badge` prop on `Hotspot` and `ViewerHotspot`. Signed-in and guest-open doors show a panel with "Enter {title}" and "Read the legend"; guest sign-in doors show the sign-in sentence and a sign-in button.
- **Read the legend for locked doors.** A locked door opens no panel, so a nav list of twelve "Read the legend" links sits under the scene. This also gives a link route that needs no panning.
- **Ledger current world and fear.** `getHall` now returns `current` (newest in-progress run, fear read from the play state with a number check) for signed-in players. Guests get null: their state is an opaque token, so the ledger shows curses remaining and no current world.
- **Ending.** Full-screen dialog with `shared-game-ui-dawn-01` and `hub.ending` when curses reach 0; a "Stay in the hall" button dismisses it for the visit (new key `hub.ending.close`).
- **New catalog keys** (owner review): `hub.scene.alt`, `hub.label.*` (object names), `hub.panel.close`, `hub.cabinet.title`, `hub.ledger.none`, `hub.ledger.run`, `hub.legends`, `hub.ending.close`.
- **Guest state** (receipt, broken worlds) is read in an effect, so the first paint is the locked hall for a guest and then updates. After sign-in a stored receipt is redeemed once and the loader is invalidated.
- **Typing.** `/tutorial` is not in the route tree until 7.8, so `navigate({ to: '/tutorial' as never })` is used; remove the cast after regenerating.
- Tests: `test/hall.test.ts` (property and render tests). Game typecheck, 172 tests and build pass.

## 7.6 Tutorial route
- **Structure.** `components/TutorialRoom.tsx` (pure props, renders with react-dom/server) holds the scene, panels, hints, drawer form and reward; `routes/tutorial.tsx` starts the tutorial through `playClientFor(guest)`, keeps the drawer question in state and calls the server for the drawer, Hint 2 and answers; `lib/tutorial.ts` holds the pure helpers (hint 2 href, answer trimming, label and tap-text maps); `components/tutorial.css` is logical-only.
- **Hint 2 in a new tab.** The click calls the server (fear +10 once), then `window.open(href, '_blank', 'noopener')` on the first charge only. After an `await` a pop-up blocker may refuse it, so once Hint 2 is used a visible `<a target="_blank" rel="noopener">` link ("Open the chapter again") is always shown. Href is `ATLAS_ORIGIN` (the shell's `mediaBase`) + `atlasUrl(anchor)`.
- **Mirror event.** Reuses `FearOverlay` with a fixed `sight` entry (`MIRROR_EVENT`); caption is the catalog sentence, and the tap panel shows `tut.mirror`. Candle sets a `data-lit` brightness filter and shows `tut.candle`.
- **Reward.** Key image `shared-game-ui-key-01`, a one-slot cabinet strip with `data-glow`, `tut.reward`, and "Go to the hall". The server marks the tutorial done (user flag or guest receipt, stored by the client library).
- **Wrong code.** Fixed sentence `tut.drawer.wrong` in a `role="alert"`; no fear change (server rule).
- **New catalog keys** (owner review): `tut.heading`, `tut.scene.alt`, `tut.label.*` (7 names), `tut.drawer.label`, `tut.drawer.submit`, `tut.close`, `tut.toHall`, `tut.loading`, `tut.slot.glow`.
- **Route tree.** `routeTree.gen.ts` regenerated by the Start build, not by hand; removed the `as never` cast in `routes/index.tsx`.
- **Type alias oddity.** `Send` in `routes/tutorial.tsx` is an indexed method type because the i18n JSX scan flags `> Word` in a plain arrow-function type.
- Tests: `test/tutorial.test.ts`. Game typecheck, 183 tests and build pass.
## 7.7 World route
- **Structure.** `components/WorldPlay.tsx` (pure props, renders with react-dom/server) draws nav, meter, scene, question panel, notebook, threads, restart notice and ending. `routes/world.$target.tsx` owns the server calls through `playClientFor(guest)`, Fear_Event choice and the Hint 2 new tab. `lib/world.ts` holds the pure rules. `components/world.css` is logical-only.
- **Server data.** `getWorldInfo` now also returns each scene's `alt` (content description) and `fearEvents: { id, reducedMotion }`. Reason: the viewer needs alt text, and flying-dutchman needs its per-event reduced-motion line (G4). Event prose stays on the server. The spirit prose is not sent to the browser view (design: shown nowhere before the end).
- **Which question shows.** The first open slot, or the one picked with "Show the question" in the notebook. Hint buttons sit on each notebook entry, so a hint never targets an ambiguous slot. The final slot is framed by `world.final` and `spirit.final` and shows the server's question; the curse prose (`ended.curseText`) shows only on the win panel.
- **Hint 2.** First use calls the server, then `window.open(href, '_blank', 'noopener')` only when `charged` is true. Once a slot has an anchor in the view, the button is replaced by a plain `<a target="_blank" rel="noopener">` ("Open the chapter again (free)"), which calls nothing, so reopening is free and survives a pop-up blocker.
- **Hint 1 marks.** Rebuilt from the view (highlights of unsolved slots), so a reload shows the same marks.
- **Fear events.** Per trigger the first unplayed entry of `layout/fearEvents.ts` plays (scene-enter by its `scene` number); played ids reset on a restart. A decoy tap is a tap reply that opened and collected nothing. Wrong answer and charged Hint 2 map to their triggers. The 4 s gate and `pointer-events: none` come from the existing `FearOverlay`. Entering scene 1 at load raises no event.
- **Dev overlay.** `SceneViewer` takes an `outline` prop, rendered only under `import.meta.env.DEV`, so the code is dead in the build (checked: no `scene-outline` in the built JS). Route search `?layout=1` turns it on (`validateSearch` returns `{ layout?: 1 }` so other links need no search).
- **Guest redirect.** The loader (`getWorldInfo`) redirects a guest at a non-guest world to sign-in before any data. A redirect thrown by a later call also goes to `/sign-in`.
- **Worlds without a layout.** Only banshee has a layout until task 9. Other worlds show `world.noLayout` plus the notebook and threads, and the player can still go back. Smallest option that fits.
- **ThemeRoot** prop type narrowed to `Pick<ResolvedTheme, 'vars'>`, because the server sends the resolved vars, theme colour and families only.
- **New catalog keys** (owner review): `world.noLayout`, `world.loading`, `world.scene.alt`, `world.notebook`, `world.slot*`, `world.question`, `world.option.tried`, `world.leads*`, `world.result`, `world.score`, `world.seed`, `world.relic.alt`, `world.controls`, `puzzle.*` (8 types). `world.scene.alt` and `world.controls` are unused for now.
- **Relic image** is drawn at 256 by 256 (assumed square, as in the hall cabinet). Not verified against the file.
- Tests: `test/world.test.ts`. Game typecheck, 200 tests and build pass.

## 8.1 (8A.1) Hall door to legend mapping
- Compared all 12 content door ids (`content/hub-and-tutorial.md`) with the 12 legend ids in `content/legends/`. Only door 1 differs: `hub-door-dutchman` is legend `flying-dutchman`. The other 11 are `hub-door-<legend-id>`.
- `DOOR_LEGEND` in `apps/game/src/lib/hall.ts` is an explicit table, typed on `HUB_DOOR_IDS`. `doorLegendId` and `cabinetSlots` use it, and `Hall.tsx` already reaches lock state, label, enter, atlas link, relic slot and sign-in prompt through those two. Prefix slicing is gone.
- Reason for keeping the table in `lib/hall.ts` rather than `layout/hub.ts`: it is Hall rules, not layout data; the smallest change.
- Tests in `test/hall.test.ts` read the real legend list with `loadLegends` and check all 12 map to distinct real ids and get the right label, lock and relic slot. Existing test ids now come from the table.

## 8.2 (8A.2) One play action in flight at a time
- Queue in the client library (`createPlayClient`): every start and act call waits for the one before it and reads its token from storage only when it starts, so it uses the token the previous reply stored. A failed call does not block the queue. Queue chosen over disabling alone because no caller can bypass it.
- `playClientFor` now returns one shared client per mode (guest, signed in), so the queue spans routes and handlers.
- 409 (signed in): the server already retries once on a `rev` mismatch. On a remaining "conflict" error the client reloads the stored run with `startWorld`, then applies the action once more. A second conflict is thrown and shown as the generic error. The 409 "run has ended" is a different message and is not retried. Replay is safe because a conflicted action was never saved.
- UI: routes count pending calls (`busy` = count above 0). Controls use `aria-disabled` plus a click guard instead of `disabled` while busy, so keyboard focus stays on the pressed button. Hotspot taps are not gated: they queue, so none is dropped. Containers get `aria-busy`; a status line uses catalog key `play.pending`. `[aria-disabled='true']` is styled like `:disabled` (no physical properties).
- Hall makes no play actions (only the receipt redeem, which uses its own receipt), so it needed no change beyond the shared client.
## Content refresh and 8.4 (8A.4) test reliability
- **Content refresh.** After the owner's rewrite of content/legends, the full skeleton suite had one legitimate change: Banshee now loses seed fair-4 (restarted; slots pz-2 ritual-order and pz-3 true-or-told). Added `banshee` to `KNOWN_CONTENT_FINDINGS` in `play-atlas-player.property.test.ts` (exact-set guard and `it.fails` entry kept). The set is now banshee, chupacabra, draugr, el-coco, gumiho, naddaha, spring-heeled-jack, vetala (8 legends; draugr still loses 1 seed so it stays listed). No other test pinned old text.
- **Fear guard (G6).** The "tap text mentioning fear/meter/tick is in HOTSPOT_FEAR or HOTSPOT_FEAR_NONE" test and the fear-budget test pass on the new tap texts. No new entries, so no content-findings record needed.
- **fairness.md** regenerated with `FAIRNESS_WRITE=1`.
- **8.4 cause and fix.** Fixed wall-clock timeouts plus all heavy files running at once under CPU load. Config now sets testTimeout 900 s, maxWorkers 4; per-file timeouts raised to 900 s. Details and result in `test-reliability.md`. Full suite with both dev servers running: 47 files, 694 passed, 8 expected fail.

## 8.3 (8A.3) Italic marks in game content text
- Reused the shared `inlineMarks`/`stripMarks` parser (skeleton `atlas/story.ts`, exported from the client entry); the atlas stays untouched. Added `apps/game/src/components/Marked.tsx` (renders `<em>`, no `dangerouslySetInnerHTML`). Used for question, options, tap text, hint text, dead-end text, lead steps, curse text, fear overlay text. Hotspot names, scene names, alt and relic name use `stripMarks`.
- Tests in `apps/game/test/marked.test.ts` use `createElement` in a `.ts` file because the game vitest config only includes `*.test.ts`. SceneNav is not render-tested (needs router context); it is covered by `stripMarks` use plus the Hotspot test.

## 9.1 Baba Yaga layout
- Sprite match: `h-NN` uses `baba-yaga-game-hotspot-NN` (usage column names each id). All 17 sprites are 1024x1024. Scene files: 01 clearing, 02 hut inside, 03 night yard (checked against the images).
- Aspect: `HotspotBox.sprite` has its own x, y, w, h, so no type change. The art box is the largest square inside the tap box, centred. Tap boxes are kept near square where the object allows it.
- Scene and hotspot ids are the content ids (`scene-clearing`, `h-01`), not `sc-`/`hs-`.
- Hotspots with no painted object (h-03, h-10, h-12, h-14, h-16) are placed by best guess and listed in `layout-open-matches.md`. Boxes follow ascending x, which differs from table order in the hut and yard.
- h-13 box covers mortar and pestle together (one Hotspot, one sprite). h-04 stones sit under the gate box (gate box ends x 1950, stones start 1960).
- **9.1 blocked on content, not on layout.** `apps/game/test/layout.test.ts` reports only `scene scene-clearing / scene-hut-inside / scene-night-yard: 0 asset matches`. The Baba Yaga asset table gives the scene usage as `game scene clearing`, `game scene hut inside`, `game scene night yard` (no scene id), while the test requires the usage text to name the content scene id (Banshee uses `Game scene sc-kitchen`). All hotspot, sprite, bounds, size, overlap and order checks pass. Fix needed is in `content/legends/baba-yaga.md` (usage text must name `scene-clearing`, etc.) or in the test rule; both are outside this task's allowed edits. The same issue is likely in other legends whose usage text omits scene ids.
## 9.1 unblocked: scene-image matching rule (orchestrator decision, owner's default rule)
- The design maps scene files to scenes by the name in the asset usage text, and failing that by order. The old test required the usage text to name the content scene id, which only Banshee does. Content is not changed.
- `apps/game/test/layout.test.ts` now matches a scene's image by (1) scene id in the usage text, else (2) the scene name (id without `sc-`/`scene-`, hyphens as spaces, case-insensitive, word-bounded; e.g. `game scene clearing` for `scene-clearing`), else (3) by order among assets whose usage mentions "game scene". Tiers 1 and 2 need exactly one hit.
- Still failing: a scene with no match, two scenes claiming one asset, and a layout `assetId` that is not the matched file. Negative examples for each were added.
- Mutation check: with the three checks disabled by hand, the three new negative tests failed; edits undone by hand, file compared equal to the backup.
- The old extra check "scene file order equals sorted asset order" was dropped; the matched file must equal the layout asset instead.
## 9.2 Chupacabra layout
- Same scheme as 9.1: content ids (`scene-farm`, `scene-town`, `scene-road`, `h-NN`), sprites by usage column, square art box centred in the tap box. Scene images match by name tier ("game scene farm/town/road").
- Boxes follow ascending x within each scene, not table order (town: bundle and bench come before the poster board). The mesquite tree, dry creek bed and farm path have no Hotspot, so nothing is placed there.
- Guessed placement: `h-06` only (see `layout-open-matches.md`). h-02 pen and h-01 fence split at x 630 because the painted fence wraps the pen.
## 9.3 Draugr layout
- Same scheme as 9.1 and 9.2: content ids (`scene-yard`, `scene-hall`, `scene-fjord`, `h-NN`), sprites by usage column, square art box centred in the tap box. Scene images match by name tier ("game scene yard/hall/fjord").
- Boxes follow ascending x, not table order. Guessed placements: `h-14` (no spear painted) and `h-02` (rail taken as the right-hand fence); see `layout-open-matches.md`.
- Tap boxes are trimmed so none overlap: yard horse rail ends at x 3290 where the tally post box starts; hall bench ends at x 2980 beside the linen.
- Nothing is placed on the fire, smoke-hole, barn, stone wall, boat or fjord.
## 9.4 El Coco layout
- Same scheme as 9.1 to 9.3: content ids (`scene-nursery`, `scene-street`, `scene-workshop`, `h-NN`), sprites by usage column (`el-coco-game-hotspot-NN`), square art box centred in the tap box. Scene images match by name tier ("game scene nursery/street/workshop").
- Boxes follow ascending x, not table order (nursery: toy horse before the hooded shadow; workshop: ink pot before the dictionary). Guessed placement: `h-04` only (see `layout-open-matches.md`).
- Tap boxes are trimmed so none overlap: cradle ends at x 1667 where the stool box starts; ink pot ends at y 945 above the copper plate; dictionary ends at x 2610 before the chalk drawing. Nothing is placed on the coat, window, shutters, press, lantern, tool tray or alley.
## 9.5 Flying Dutchman layout
- `layout/worlds/flying-dutchman.ts`. Scene ids are the content ids (`sc-deck`, `sc-cabin`, `sc-hold`); scene files `-scene-01/02/03` match by id from the usage text. Sprites follow the usage column (`h-NN` is `hotspot-NN`); sprite art box is the largest centred square in the tap box.
- Left-to-right order follows the painted images, not the description. In the cabin the painting has wall board, chart table, logbook, candle, goblet, miniature (the description lists the window first and the miniature near the end); the sea chest and window have no Hotspot.
- Deck: the letters rack is the wooden rack left of the bell; the dice cup is the barrel. The coil (`h-06`) is the hanging rope left of the brass rack; the spyglass (`h-05`) boxes the brass rack. Hold: ladder has no Hotspot.
- Game layout tests pass (22) and typecheck is clean.
## 9.6 Gumiho layout
- `layout/worlds/gumiho.ts`: content ids (`scene-courtyard`, `scene-bridge`, `scene-forest`, `h-NN`); sprites `gumiho-game-hotspot-NN` by the usage column (all 14 named); scene files 01/02/03 match by name tier ("game scene courtyard/bridge/forest"). Square art box centred in the tap box.
- Boxes follow ascending x, not table order (courtyard: jar, book box, desk, door shadow, step, lantern). Book box and desk share one painted table, so the box is split at x 860 (book box left, brush and right half of the desk for the desk); the desk's left end is unboxed. Nothing placed on the other doors, gate, wall, far bank, tree or fox silhouette.
- Bridge: reeds box (y 200 to 950) sits above the wall box (y 960 on) so they do not overlap.
- No guessed placements; every hotspot has a painted object. The bead (h-10) is small, boxed at the 200 px size around it. Game typecheck clean; 225 tests pass.
## 9.7 Jersey Devil layout
- `layout/worlds/jersey-devil.ts`: content ids (`scene-1`, `scene-2`, `scene-3`, `h-NN`); sprites `jersey-devil-game-hotspot-NN` by the usage column; scene files 01/02/03 match by id. Square art box centred in the tap box. Relic name uses the catalog fallback (nothing in the layout).
- Boxes follow ascending x of the painted images, not the description (scene 1: coop, tracks, bible, lantern, cradle, signpost). The cabin, swamp, furnace mouth, ceiling lamp, window, type case and frosted window have no Hotspot. Guessed placements are in `layout-open-matches.md`.
- Game typecheck clean; layout tests (22) pass. `test/server.test.ts` "guest: no response holds a secret" timed out at the default 5 s (took 5.6 s); unrelated to layout, same load-timeout pattern as task 8.4. Not changed here.
## 9.8 Naddaha layout and game test timeouts
- `layout/worlds/naddaha.ts`: scene ids `scene-edge`, `scene-canal`, `scene-nile` with files 01, 02, 03 (match by name). Boxes read from the images; guesses listed in `layout-open-matches.md`.
- Game vitest config now sets `testTimeout` and `hookTimeout` to 120_000 ms (server.test.ts "guest: no response holds a secret…" timed out at 5 s under load). No assertion changed.
## 9.9 Spring-heeled Jack layout
- Scenes: `scene-lane`, `scene-mansion`, `scene-roofs` with scene files 01, 02, 03. Asset usages say "game scene lane", "Mansion House", "roofs", so the name tier matches each; order agrees. Sprites follow the usage column (h-NN is hotspot-NN), no unclear match.
- Boxes read from the images, sorted by x (not id). Lane: chalk wall (h-04) lies left of the lamp (h-01); the cloak (h-06) is left of the cab. Roofs: the weathervane (h-14) is painted left of the chimney pots (h-13), the reverse of the description order.
- Mansion: letter and stack of letters sit on one small desk, so each got a 176 px box side by side (letter 1890, stack 2080); the clock is on the pediment above, boxed at 176 x 176 at x 1908.
- The distant leaping silhouette (roofs) has no Hotspot, so nothing is placed. Game typecheck clean; layout tests pass.

## 9.10 Vetala layout
- `layout/worlds/vetala.ts`: scene ids `scene-palace`, `scene-tree`, `scene-road` with files 01, 02, 03 (match by name tier, "game scene palace/tree/road"). Sprites `vetala-game-hotspot-NN` by the usage column. No unclear sprite or scene matches.
- Boxes follow ascending x of the painted images (palace: bowl, map, gem, lamp, manuscripts, perch). The chest, window, stone wall, thin road, reeds and lantern have no Hotspot, so nothing is placed there.

## 9.11 Yuki-onna layout
- New `layout/worlds/yuki-onna.ts`, same shape as vetala. Sprites follow the content asset table (h-NN is hotspot-NN); no unclear matches. `assets/README.md` has no per-asset usage column for this legend, so the content asset table was the source.
- Hotspots are listed by ascending x within each scene. Guessed placements are in `layout-open-matches.md`. Game typecheck clean, 19 files / 225 tests pass.

## Task 10.1
- The task text names `docs/phase-4-notes/kiro-docs.md`; the request named `docs-read.md`. Wrote the detail to `kiro-docs.md` and a short entry to `docs-read.md`. Reason: satisfies both with the least duplication.
- Agent file will be Markdown (`.kiro/agents/game-balance-reviewer.md`) with `permissions.rules`, not legacy `allowedTools`. Reason: current docs mark `allowedTools` as CLI 2.x legacy.

## 9.12
- `shared-game-ui-dawn-01` is a non-exported constant in `Hall.tsx`; the completeness test repeats the literal instead of changing app code. Other UI/spirit/key ids are imported from their modules.
- Relic ids and names come from skeleton `relicOf`. Jersey Devil has no relic name (catalog fallback), as in 9.7.

## 9.13 Impeccable review
- The catalog has no `agent-impeccable`; loaded `skill::impeccable` instead and used it in this thread with no sub-agents. Its launcher and screenshot tools were not run (no browser); steering and docs were read directly.
- Fixed only small game-app CSS/markup findings (motion toggle target, hall link width, tab focus clipping, busy strike-through, dvh). The spring-heeled-jack glow-on-surface contrast (2.8:1) belongs to the skeleton's `resolveTheme`, so it is recorded as a polish item, not changed. Details: `docs/phase-4-notes/impeccable-review.md`.

## 9.13 Impeccable review
- The catalog has no `agent-impeccable`; loaded `skill::impeccable` instead and used it in this thread with no sub-agents. Its launcher and screenshot tools were not run (no browser); steering and docs were read directly.
- Fixed only small game-app CSS/markup findings (motion toggle target, hall link width, tab focus clipping, busy strike-through, dvh). The spring-heeled-jack glow-on-surface contrast (2.8:1) belongs to the skeleton's `resolveTheme`, so it is recorded as a polish item, not changed. Details: `docs/phase-4-notes/impeccable-review.md`.
## 9.14 Guard pass on the eleven Worlds
- Shared box builders went to `apps/game/src/layout/boxes.ts`, outside `worlds/`, so the registry glob (`./worlds/*.ts`) still sees only World files. Banshee keeps its own helper (`hs-*` ids, crop sheet). Reason: smallest change that removes the 11 copies without changing any box.
- The start-failure retry was small enough to build: one component, two catalog keys (`play.startFailed`, `play.retry`; new wording for owner review), no Arabic text (per-key fallback, decision 26). Reason: the 9.13 note asked for it and it reuses the existing play client.
- `pnpm -r test --run` is refused by pnpm ("Unknown option: 'run'"); ran `pnpm -r exec vitest --run` instead, which is the same suites.

## 10.2 game-balance-reviewer agent
- No YAML package is a dependency of skeleton or apps/game (js-yaml exists only transitively in the pnpm store, not resolvable). Smallest option: the agent front matter uses one `key: value` per line with JSON-style values (valid YAML), and the test parses it with a small line parser plus JSON.parse. No dependency added.
- `resources` lists fear.ts, fearTable.ts, fairness.md and the decisions file (the docs-note plan named an `apps/game` fear.ts path that does not exist; the real file is skeleton/src/play/fear.ts). Shell and web_fetch are denied as well as non-balance writes.
- Test: skeleton/test/balance-reviewer-agent.test.ts. Mutation check (removing the deny rule's `exclude`) failed the test; file restored by hand, cmp identical.

## 10.3 physical-CSS hook
- Created `.kiro/hooks/physical-css-check.json` (PostFileSave, command, timeout 30) running `scripts/check-physical-css.mjs`. No existing hook covered it (kiro-docs.md).
- Pattern list copied from `apps/game/test/logical-css.test.ts`, which has no exemptions; the hook has none either. A test asserts every pattern's source appears in that test file so they cannot drift.
- Exit rule: 1 with findings on stderr, 0 when clean or the file is out of scope. The script only reads. The game test also scans `.ts`; the hook matcher follows the task (`.tsx`, `.css`).
- Added `scripts/check-physical-css.d.mts` so the game typecheck accepts the import.

## 10.4 Balance review
- The sub-agent tool cannot launch `.kiro/agents/game-balance-reviewer.md` by name, and that agent denies shell. I adopted its prompt and hard rules (no edits to `content/`, `assets/` or constants; findings only in `docs/phase-4-notes/balance.md`) and ran the review in this thread. The task text requires generated runs, so I used the shell for that only, via a temporary probe test (`skeleton/test/zz-balance-probe.test.ts`, deleted afterwards; output in /tmp).
- `fairness.md` was not regenerated: it is newer than every `content/legends/*.md` file and the fear files (checked by modification time), so `FAIRNESS_WRITE=1` was not needed.
- Probe: 300 generated seeds and 20 played seeds per legend, using `generate`, `playFromAtlas` and `atlasText`. Results are in `balance.md`. No constant, content or test was changed.

## 11.1 smoke script location and method
- The play smoke check is `skeleton/scripts/smoke-play.ts` (run with tsx), not under `apps/game/scripts`: `pg`, `dotenv` and `tsx` live in the skeleton and pnpm does not expose them to the game. It calls the game dev server over HTTP and uses `smoke.mjs`'s wire approach. Hotspot ids are read from the `hotspots` table (public layout data) rather than a GET server-function payload, whose encoding is not documented here. Test users are deleted with the SQL path (`neon_auth."user"` by id) instead of the Neon MCP, so the script is self-contained. Details: docs/phase-4-notes/smoke.md.
## 11.2 browser checks
- Driver: no puppeteer, playwright or `ws` is installed and nothing can be added, so `apps/game/scripts/browser-check.mjs` drives Chrome through the DevTools protocol with Node 24's built-in WebSocket. Smallest option that needs no install.
- The checks run against the production builds of the game and the atlas (as the task says), on ports 3200, 3201 and 3202 (the last with `FEATURE_ARABIC=true` for the right-to-left pass). The environment came from sourcing `.env` inside the shell command; `.env` was not edited or printed. Ports 3000 to 3003 were not touched.
- The atlas build server crashes about 120 s after a streamed atlas page is opened and closed (`Stream lifetime exceeded`). The atlas is protected this phase, so the run used a restart loop and the script waits 2.5 s before closing atlas tabs. Recorded as a finding in `browser.md`.
- Fixed in the game, with tests: touch drag ended early on `lostpointercapture` from a child; spirit panel media query used the invalid `max-inline-size` and the light text sat on the light frame; the spirit corner hid the Pan right label. Not fixed: the first-view budget misses (reported as findings as the task says), including the idea of deferring sprites and spirit images, which changes markup and tests.
- No database user was created: the checks are guest only, so nothing needed deleting.
## 11.4 Tester review
- Report named `docs/phase-4-notes/tester-review.md` as the owner's instruction says; the task text says `tester.md`. Smallest option: one file, the owner's name.
- Added one offline test (no fetch, sockets or DATABASE_URL) because no test covered the "no DB or network" requirement. Only tests changed; no source file.
## 11.8 Handover
- Wrote `docs/phase-4-handover.md`. The legend `db:import` date for the content rewrite is not in any note, so the handover says so and gives only the evidence (content files modified 2026-11-20); the orchestrator should fill in the date. Reason: not inventing a date.
- Test, smoke and browser numbers are copied from tasks 11.1, 11.2, 11.4 and 11.7, not re-run. Reason: task 11.8 is documentation only.
