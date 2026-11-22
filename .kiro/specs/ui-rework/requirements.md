# Requirements Document

## Introduction

Phase 6 of Kiroween 2026 reworks the user interface of the live atlas (Trick or Told) and game (Trick or True). Production is live. The owner reports a generic look (like a search results page), weak landing pages, poor buttons and layout, two maps on the atlas home page, and broken colours on the paper (references, version cards, game answer buttons).

The work is UI only. It covers every P1 item (1 to 10) and every P2 item (11 to 22) of `docs/planning/phase-6-review/00-fix-list.md`. P3 items are optional and come last. Root causes are fixed in this order: the shared UI layer (`skeleton/src/design/ui.css`), then the paper context, then the screens.

Sources read, in order: `docs/planning/phase-6-review/00-fix-list.md`, `design-direction.md`, `code-review.md`, `impeccable.md`, `tester.md` (same folder), `docs/phase-5-handover.md`, `docs/planning/15-look-and-feel-brief.md`, the five files in `.kiro/steering` (`content.md`, `design.md`, `i18n-rtl.md`, `product.md`, `tech.md`), and the workspace rules `tech` and `product`.

### Conflicts between design-direction.md and the steering files

Where the two disagree, the steering file wins (Requirement 4). The user accepted all five conflicts as written below:

1. **Display font.** `.kiro/steering/design.md` names `IM Fell English SC` as the display font. `design-direction.md` section 2 uses `IM Fell English` (non-SC) above 20 px and SC only for 12 to 14 px kickers. Steering wins: headings keep `IM Fell English SC`. Both families are in `KNOWN_FONTS`, so the direction's split stays available as a later option.
2. **Palette.** Steering fixes the hub palette (bg `#0E0B10`, surface `#1C1620`, ink `#E9E1D3`, muted `#9C9285`, accent `#E0A84B`, glow `#F4D58D`, danger `#B23A3A`, cold `#7FA7B5`) and says apps do not redefine base tokens. The direction adds a paper pair (`#e8dcc0`, `#2a1d12`), ember `#a8431f`, a raised surface and rule tokens. Resolution: add new tokens beside the base palette, never change a base value.
3. **Paper ink values.** Phase 5 pins the book ink `#2b1d12` and accent `#4a1c12` in `skeleton/src/book/bookColors.ts` and `book.css`, checked by `book-colors.property.test.ts`. The direction proposes `#2a1d12` for ink. Resolution: keep the pinned values unless a measured pair fails AA; change TypeScript, CSS and the test together if a value must move.
4. **Map.** `.kiro/specs/atlas/design.md:230` and `docs/planning/12-kiro-phase-3.md:35` keep the painted map as a decorative band and forbid markers on it. `design-direction.md` section 4 wants the painted map as the one map. The fix list allows either. Resolution: the smallest option (remove the painted strip, keep the real `WorldMap`) unless the design phase shows the pins align with the painted image; the choice goes in `docs/phase-6-notes/decisions.md`.
5. **Scope of the direction.** The direction lists extra pages and parts (How every legend is told strips, featured legend, crossover band, About page, chapter rail, game door grid from panorama crops, "Show hotspots" toggle, icon plates). These are not in the fix list and stay out of scope except where a P1 or P2 item names them.

## Glossary

- **UI_Rework**: the whole Phase 6 work covered by this document, including every document it writes.
- **Atlas_App**: the app in `apps/atlas` (Trick or Told).
- **Game_App**: the app in `apps/game` (Trick or True).
- **Skeleton**: the shared package `@kiroween/skeleton`.
- **UI_Layer**: the shared stylesheet `skeleton/src/design/ui.css` and the new tokens in `skeleton/src/design/tokens.css`.
- **Button_Class**: `.btn` with the variants `.btn-primary`, `.btn-secondary` and `.btn-ghost`; an icon variant `.btn-icon` is allowed.
- **Link_Class**: `.link`, the one style for links inside running text.
- **Panel_Class**: `.panel`, the one card surface.
- **Focus_Ring**: the single `:focus-visible` outline defined in the UI_Layer: 3 px solid, 3 px offset, readable on dark and on paper.
- **Paper_Context**: any element inside `.book-paper`, including the Book view and the game's `spirit-panel-body spirit-caption book-paper` panels.
- **Dark_Context**: any element on the dark page or game surface outside the Paper_Context.
- **Paper_Tokens**: the CSS variables the Paper_Context re-points: ink, muted, glow, accent, surface, bg, border (rule) and link.
- **Contrast_Test**: `skeleton/test/book-foundations.test.ts` and the tests that call `contrastRatio`.
- **AA**: WCAG 2.2 level AA: 4.5:1 for text under 24 px (or 18.66 px bold), 3:1 for large text and for non-text parts of controls and focus rings.
- **Pinned_Class**: a class name or markup shape that an existing test asserts. The list is in "Rules for Kiro" in `00-fix-list.md` and in `code-review.md` under "Risks": `spirit-panel-body spirit-caption book-paper`, `world-button world-option`, `scene-button`, `scene-viewport mood-vignette-inset`, `scene-image`, `scene-sprite`, `spirit-corner`, `book-controls`, `book-flow`, `book-frontispiece`, `dramatization`, `mood-layer`, the `.book-paper` block shape, the hub palette, the mood rules, and the anchor and hero markup.
- **Atlas_Home**: the route `apps/atlas/src/routes/index.tsx`.
- **World_Map**: `apps/atlas/src/components/WorldMap.tsx` with its 12 pins.
- **Painted_Strip**: the `shared-atlas-map-01` image rendered as a banner on Atlas_Home.
- **Legend_Card**: a card for one legend on Atlas_Home with its existing painted image, title, hook and meta.
- **Hall**: `apps/game/src/components/Hall.tsx`, the hub scene with twelve doors.
- **Scene_Screen**: the Tutorial room and a World scene in the Game_App.
- **Top_Bar**: the single compact bar above a Scene_Screen.
- **Hotspot**: a clickable region of a scene.
- **Hint_Area**: the panel in the Game_App that holds Hint 1 and Hint 2.
- **Hint_2_Link**: the link to the atlas chapter anchor, built with `atlasUrl`.
- **Book_View**: the paged reading layout; **Scroll_View**: the one-page layout; both rendered by `skeleton/src/book/Book.tsx`.
- **Anchor_Route**: the atlas route `/anchor/<anchor-id>`.
- **Sources_List**: the Sources section in `LegendPage.tsx`.
- **Reduced_Motion**: `prefers-reduced-motion: reduce` or the in-app motion setting set to reduced.
- **Protected_Paths**: everything under `content/` and `assets/`.
- **Needs_File**: `docs/phase-6-notes/content-and-assets-needed.md`.
- **Decisions_File**: `docs/phase-6-notes/decisions.md`.
- **Mutations_File**: `docs/phase-6-notes/mutations.md`.
- **Debug_Folder**: `.debug/phase-6/`, git-ignored.
- **Mid_Phase_Status**: the status note defined in Requirement 5. It does not stop the run.
- **Owner_Feedback_File**: `docs/phase-6-notes/owner-feedback.md`.
- **Progress_File**: `docs/phase-6-notes/progress.md`.
- **Sub_Agent**: any agent started during the UI_Rework.
- **Owner**: the human user.
- **Secret**: any password, token, cookie, key, connection string or value of an environment variable listed as secret in `.env.example`.

## Requirements

### Requirement 1: UI-only scope

**User Story:** As the Owner, I want only the interface to change, so that the live game rules and data stay exactly as they are.

#### Acceptance Criteria

1. THE UI_Rework SHALL leave unchanged the parser, the puzzle generator, the audit, auth, the access rule (guests: tutorial plus one world), the score formula, the play rules, the token format, fair-play secrecy, the tutorial rate limit, `skeleton/src/deploy/vercelRules.ts` routing rules, and the database schema and data.
2. WHEN a change would touch a file listed in criterion 1, THE UI_Rework SHALL stop that change and record the reason in the Decisions_File.
3. THE UI_Rework SHALL run no migration and no database write.
4. WHEN `pnpm -r test` runs, THE existing tests of the generator, play rules, token format, rate limit, vercelRules and access rule SHALL pass without edits to their assertions.

### Requirement 2: Protected paths and asset needs

**User Story:** As the Owner, I want content and assets untouched, so that the import pipeline stays the single source of content.

#### Acceptance Criteria

1. THE UI_Rework SHALL NOT edit, create, rename or delete any file under the Protected_Paths.
2. IF a fix needs an asset that does not exist (for example a seam-free Banshee panorama or a phone-width scene copy), THEN THE UI_Rework SHALL list the asset, its size, its purpose and the item that needs it in the Needs_File.
3. THE UI_Rework SHALL add no new image file anywhere in the repository.

### Requirement 3: No new libraries, fonts or images

**User Story:** As the Owner, I want the dependency and weight budget unchanged, so that the Slow 4G timings do not get worse.

#### Acceptance Criteria

1. THE UI_Rework SHALL add no runtime dependency to any `package.json`.
2. THE UI_Rework SHALL use only font families listed in `KNOWN_FONTS` in `skeleton/src/theme/palette.ts`.
3. WHEN the CSS of either app is scanned, THE font test SHALL find no `font-family` outside the `KNOWN_FONTS` set and the generic fallbacks.
4. THE UI_Rework SHALL change no `vercel.json` except to keep it as Requirement 8 states.

### Requirement 4: Design direction and conflict handling

**User Story:** As the Owner, I want one coherent look, so that the atlas and game read as two rooms of one building.

#### Acceptance Criteria

1. THE UI_Layer SHALL follow `design-direction.md`: one building and two rooms; links navigate and buttons act; brass-plate buttons; the paper pair and the ember colour; candle-only motion.
2. WHERE `design-direction.md` conflicts with a file in `.kiro/steering`, THE UI_Rework SHALL follow the steering file.
3. WHEN a conflict is found, THE UI_Rework SHALL record it in the Decisions_File and report it to the Owner in the Mid_Phase_Status and in the handover.
4. THE UI_Rework SHALL define new tokens (paper pair, ember, raised surface, rule, link on paper) beside the base palette and SHALL NOT change any base palette value pinned by `apps/game/test/theme.test.ts` and `skeleton/src/theme/hub.ts`.
5. THE UI_Layer SHALL define a spacing scale, a type scale, one radius of 4 px, and warm-black shadow tokens in `skeleton/src/design/tokens.css`.
6. WHERE a legend theme pack is active, THE UI_Layer SHALL let the pack recolour only the accent, the glow and the display font, and the existing theme pack values SHALL stay unchanged with their tests passing unedited.

### Requirement 5: Order of work, mid-phase status and Owner feedback

**User Story:** As the Owner, I want root causes fixed before screens, so that symptoms disappear together and rework stays small.

#### Acceptance Criteria

1. THE UI_Rework SHALL work in this order: (1) the UI_Layer and tokens (items 1 and 2); (2) the Paper_Context and contrast (items 3, 4 and 5); (3) Atlas_Home and the World_Map (items 6 and 7); (4) the Hall and the Scene_Screens (items 8, 9 and 10); (5) the Mid_Phase_Status; (6) P2 items 11 to 22; (7) P3 items.
2. WHEN group (4) is done and its checks pass, THE UI_Rework SHALL write `docs/phase-6-notes/mid-phase-status.md` listing the before and after screenshot paths at 390 px and 1280 px for the atlas home, one legend page with its references (Book_View), the Hall and the Banshee scene, plus the local URLs used, and SHALL then continue straight into group (6) without waiting. The Owner may write feedback in the Owner_Feedback_File.
3. THE UI_Rework SHALL NOT wait for the Owner at any point except task 9.1 (the Owner's push) and task 10.4 (the handover).
4. THE UI_Rework SHALL create the Owner_Feedback_File in the first task with a heading and the line "No feedback yet".
5. AT each checkpoint task, THE UI_Rework SHALL read the Owner_Feedback_File; for each item not marked done, it SHALL record the item in the Decisions_File before acting, add it as a task right after the current group, run it, and mark the item "done in task N" in the file.

### Requirement 6: Additive classes and pinned tests

**User Story:** As a maintainer, I want existing tests to keep protecting the code, so that the rework does not weaken them.

#### Acceptance Criteria

1. WHEN a style is added for an existing element, THE UI_Rework SHALL add the new class beside the old class and keep the old class name and its order in the markup.
2. THE UI_Rework SHALL NOT rename or remove a Pinned_Class.
3. IF a Pinned_Class or pinned markup must change, THEN THE UI_Rework SHALL change the pinning test in the same task and record the reason in the Decisions_File.
4. THE UI_Rework SHALL NOT weaken an existing assertion (no loosened ratio, no removed case), except as criterion 7 allows.
5. WHEN the `.book-paper` block in `skeleton/src/book/book.css` changes, THE block SHALL remain a plain block with no nested braces so that the regex in `book-foundations.test.ts` still reads it.
6. WHEN a paper colour constant changes in `book.css`, THE matching constant in `skeleton/src/book/bookColors.ts` SHALL change in the same task.
7. WHEN `apps/game/test/world.test.ts` or `apps/game/test/hall.test.ts` must change because a requested behaviour changes (the one hint area, the locked-door panel, the Hall primary action), THE UI_Rework SHALL change the file in the same task as the behaviour and record the reason in the Decisions_File; each new assertion SHALL be at least as strict as the one it replaces, and no case SHALL be deleted without a replacement case that covers the same behaviour.

### Requirement 7: Logical CSS, language catalog and reduced motion

**User Story:** As a reader of any direction or motion preference, I want every new element to follow the same rules, so that the interface works for everyone.

#### Acceptance Criteria

1. THE UI_Layer and every changed stylesheet or component SHALL use logical properties only (`margin-inline`, `padding-block`, `inset-inline`, `text-align: start`, and Tailwind `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`).
2. WHEN the logical-CSS tests in `apps/atlas/test/logical-css.test.ts`, `apps/game/test/logical-css.test.ts` and a new check of `skeleton/src/design/ui.css` run, THE tests SHALL find no physical direction property.
3. THE UI_Rework SHALL read every new label, message, aria-label and visible string from the catalog by key, and SHALL list each new key with its English text in the handover.
4. WHERE a new icon shows a direction (arrow or chevron), THE icon SHALL flip in a right-to-left layout.
5. WHILE Reduced_Motion is active, THE UI_Layer SHALL turn off every animation and transition through one variable, except an opacity cross-fade of at most 100 ms.
6. THE UI_Layer SHALL allow motion only as slow candle or lamp glow, with at most 3 brightness changes per second and no flashing.
7. WHEN the in-app motion toggle changes, THE UI_Layer SHALL apply the new setting without a reload.

### Requirement 8: Deployment configuration

**User Story:** As the Owner, I want Git deployments limited to `main`, so that previews are not built by accident.

#### Acceptance Criteria

1. THE root `vercel.json`, `apps/atlas/vercel.json` and `apps/game/vercel.json` SHALL each keep exactly `{"git": {"deploymentEnabled": {"*": false, "main": true}}}` plus the keys they already have (`$schema`, `installCommand`, `regions` in the two app files).
2. WHEN `vercel.json` files are tested, THE existing `vercel-config` test SHALL pass without edits.

### Requirement 9: Safety of the working environment

**User Story:** As the Owner, I want no secret exposed and no production change, so that the submission stays safe.

#### Acceptance Criteria

1. THE UI_Rework SHALL NOT read, print or write a Secret, and SHALL NOT open any `.env` file.
2. THE UI_Rework SHALL NOT sign up or sign in on the production site.
3. WHILE checking production, THE UI_Rework SHALL use guest access only and SHALL NOT write data.
4. THE UI_Rework SHALL save every screenshot under the Debug_Folder and none under `docs/`.
5. THE UI_Rework SHALL use git read-only (status, diff, log) and SHALL NOT commit, push, reset or change branches; the Owner pushes.
6. WHEN the secret scan runs, THE scan SHALL find no Secret in code, docs, tests or committed config.

### Requirement 10: Shared UI layer (P1 item 1)

**User Story:** As a maintainer, I want one button, link, panel and focus system, so that every screen stops styling itself by hand.

#### Acceptance Criteria

1. THE Skeleton SHALL provide `skeleton/src/design/ui.css` with Button_Class (primary, secondary, ghost), Link_Class, Panel_Class, the Focus_Ring, and the spacing and type scale from `tokens.css`.
2. WHEN `apps/atlas/src/styles.css` and `apps/game/src/styles.css` are read, THE two files SHALL import `ui.css` once each.
3. THE Button_Class SHALL give a minimum height of 44 px, a radius of 4 px, one primary button per view, and distinct hover, active, disabled and focus states.
4. THE Button_Class SHALL work on both `button` and `a` elements.
5. WHEN a primary button is measured on the dark context, THE pair of its text colour and fill SHALL reach 4.5:1, and its border or edge against the surface SHALL reach 3:1.
6. THE Focus_Ring SHALL be one definition used by `.btn`, `.link`, scene buttons, world buttons, book controls and form fields.
7. WHEN `.scene-button`, `.world-button`, the book controls, the map pin card actions and the `Field.tsx` button strings render, THE elements SHALL carry the new Button_Class beside their old class.
8. THE `ui.css` file SHALL contain no hex colour and no `var(--x, #hex)` fallback.
9. IF a Button_Class variant is removed from `ui.css`, THEN THE button test SHALL fail.

### Requirement 11: Link rule (P1 item 2)

**User Story:** As a visitor, I want navigation and actions that look like navigation and actions, so that the atlas stops looking like a search results page.

#### Acceptance Criteria

1. THE Atlas_App stylesheet `apps/atlas/src/styles.css` SHALL contain no bare `a` element selector that sets colour or underline.
2. THE Link_Class SHALL apply underline and link colour only to links inside running text.
3. THE atlas header items, the contents list, legend titles on cards, the footer link and card actions SHALL use nav-item or Button_Class styles with no underline.
4. WHEN the atlas pages are rendered, THE number of underlined links outside running text SHALL be zero.
5. WHEN the current page matches a header item, THE header item SHALL carry `aria-current="page"` and a visible 2 px marker that does not rely on colour alone.
6. WHEN a visited link is rendered, THE UI_Layer SHALL NOT change its colour.

### Requirement 12: Paper context colours (P1 item 3)

**User Story:** As a reader, I want every part of a legend page readable on paper, so that Versions, tables and Sources do not turn into dark ink on dark cards.

#### Acceptance Criteria

1. THE Paper_Context SHALL re-point surface, bg, border (rule) and link colours in addition to ink, muted, glow and accent.
2. WHILE an element is in the Paper_Context, THE element SHALL use one link colour only.
3. WHEN the Versions cards (`LegendPage.tsx:41`), the Versions table (`:125-126`) and the Sources_List (`:169-185`) render in the Paper_Context, THE text, link, label and border colours SHALL reach AA against the paper or card fill (borders 3:1 where they carry meaning).
4. THE Sources_List SHALL show source links so that they differ from body text by more than colour (underline or a 3:1 colour difference plus underline).
5. WHEN the same section renders in Scroll_View (dark), THE text and link pairs SHALL reach AA against the dark surface.
6. THE `.plate` frame and the `.dramatization` tag SHALL follow the active context and keep their Pinned_Class names.
7. WHEN the Versions card has `bg-surface` inside `.book-paper`, THE computed text and fill pair SHALL reach 4.5:1; IF the Paper_Tokens for surface are removed, THEN THE contrast test SHALL fail.
8. WHEN a legend page is checked in book mode on Banshee and Naddaha, THE browser scan SHALL find zero text nodes below AA, where AA is 4.5:1 for text under 24 px (or 18.66 px bold) and 3:1 for large text (24 px, or 18.66 px bold), and the scan SHALL name the font size and weight used for each measured node.

### Requirement 13: Game answer buttons (P1 item 4)

**User Story:** As a player, I want to read the answers and see which one has focus, so that I can play the main interaction.

#### Acceptance Criteria

1. WHEN `.world-button.world-option` renders on a dark panel or on a paper panel, THE option text and fill SHALL reach 4.5:1 against their actual background.
2. WHEN an option has keyboard focus, THE Focus_Ring SHALL reach 3:1 against the background of the option and against the surrounding panel.
3. WHILE an option is disabled or already tried, THE UI SHALL show a mark and a label (no `line-through` as the only state), and the text SHALL reach 4.5:1 for a tried option.
4. THE `world-button world-option` class string SHALL remain in the markup pinned by `apps/game/test/world.test.ts`.
5. WHEN the Banshee puzzle options are measured in the browser at 1280 px and 390 px, THE measured ratio of every option SHALL reach AA (4.5:1, or 3:1 for large text of 24 px or 18.66 px bold), and the measurement SHALL name the font size and weight used for each measured option.

### Requirement 14: Contrast test for every colour pair (P1 item 5)

**User Story:** As a maintainer, I want every colour pair pinned by a test, so that a token change cannot break readability silently.

#### Acceptance Criteria

1. THE Contrast_Test SHALL list every text, link, button, border and focus pair used in the Paper_Context and in the Dark_Context, including surface, border, link, primary button, secondary button, ghost button and Focus_Ring.
2. THE Contrast_Test SHALL read the pair values from `tokens.css`, `book.css` and `ui.css`, and SHALL NOT copy them as literals.
3. WHEN a text pair is below 4.5:1 or a non-text pair is below 3:1, THE Contrast_Test SHALL fail and name the pair.
4. THE Contrast_Test SHALL cover each legend theme pack in the Dark_Context for the accent, glow and link pairs.
5. IF any Paper_Tokens entry named in Requirement 12 is deleted from `.book-paper`, THEN THE Contrast_Test SHALL fail.
6. WHEN the mutation of Requirement 35 is applied to a Paper_Tokens value, THE Contrast_Test SHALL fail and the Mutations_File SHALL record it.

### Requirement 15: Atlas home first screen (P1 item 6)

**User Story:** As a first-time visitor, I want to understand the atlas and know where to click within seconds, so that I read a legend or start the game.

#### Acceptance Criteria

1. THE Atlas_Home SHALL show exactly one map.
2. THE Atlas_Home SHALL render the hero with a visible title, one sentence of purpose and one primary action (the first recommended legend, a real path).
3. THE Atlas_Home SHALL show a link to the Game_App at `/game/` in the header and in the hero area.
4. THE Atlas_Home SHALL show the legends as Legend_Cards, each with its existing painted image, the title, the one-line hook, the read time and the scare level, with no underlined title.
5. THE Legend_Card SHALL be one link target whose accessible name is the legend title.
6. WHEN the Atlas_Home renders on first paint, THE hero box SHALL have its final size and a theme-colour placeholder, and SHALL NOT show an opacity-0 black box.
7. IF the Painted_Strip is kept, THEN THE strip SHALL be the base of the one World_Map and SHALL carry no second set of coastlines.
8. WHEN the Atlas_Home markup is tested, THE test SHALL count the map elements (`img` of `shared-atlas-map-01` plus `.land`) and SHALL fail when the count is not one.
9. WHEN the hero markup is tested, THE existing `hero-markup.test.tsx` SHALL pass unchanged.
10. WHEN the Atlas_Home is checked at 1280x800, THE primary action SHALL sit fully inside the first screen.
11. THE Legend_Card image SHALL use the existing phone copy of the hero image, SHALL carry `loading="lazy"`, `decoding="async"`, explicit `width` and `height` and a `sizes` attribute, and THE summary read SHALL add only one optional hero key (a read-only widening of the existing SELECT).
12. WHEN the Atlas_Home is measured on Slow 4G at 390 px (median of three) before and after the thumbnails, THE after median SHALL NOT exceed the before median by more than 10%.

### Requirement 16: Map on phones (P1 item 7)

**User Story:** As a phone visitor, I want to reach all twelve pins, so that the map is usable without guessing.

#### Acceptance Criteria

1. WHEN the viewport is 390 px wide, THE World_Map SHALL either fit the width or pan sideways with visible text that tells the reader to swipe.
2. WHEN the viewport is 390 px wide, THE World_Map SHALL make all 12 pins reachable by touch and by keyboard.
3. THE pins SHALL be at least 44 px by 44 px with an `aria-label` that names the legend.
4. THE `.land` fill SHALL differ from the map card surface by at least 3:1 in contrast.
5. WHEN a pin is activated, THE popover SHALL show the legend name, a primary Button_Class action ("Read the legend") and a ghost close button, and Escape SHALL close the popover and return focus to the pin.
6. WHEN the geometry test runs, THE existing `apps/atlas/test/geo.test.ts` SHALL pass and `public/world-land.svg` SHALL stay unchanged.
7. WHERE the viewport is 390 px wide and the map pans, THE map SHALL start centred on a pin and SHALL show the swipe hint as visible text, not only in the `aria-label`.

### Requirement 17: Game Hall (P1 item 8)

**User Story:** As a first-time player, I want to see the title and a clear start action, so that I do not need to click a padlock to find the tutorial.

#### Acceptance Criteria

1. THE Hall SHALL show a visible title (`h1`) and a one-line premise in the first screen at 1280x800 and 390x844.
2. WHILE the tutorial is not done, THE Hall SHALL show the primary action "Start in the study" that links to `/game/tutorial`; WHILE the tutorial is done, THE Hall SHALL show the same link as a secondary action "Visit the study again" after the primary position, and THE Hall SHALL show no more than one primary action. This departs from the earlier wording (one primary "Start in the study" in every state) and the Owner approved it; THE UI_Rework SHALL record the departure in the Decisions_File.
3. WHILE the tutorial is not done (guest or signed in), THE Hall SHALL show all 12 doors locked, each with the reason "opens after the study", and SHALL offer the primary action "Start in the study" as the only way forward.
4. WHEN the player activates a locked door, THE Hall SHALL show a message that states why it is locked ("opens after the study" or "sign in to open") and SHALL NOT navigate silently to the tutorial.
5. WHILE the player is a guest and the tutorial is done, THE Hall SHALL show exactly one door open and 11 doors locked with the reason "sign in to open", each locked door with an accessible name that includes its reason.
6. THE Hall SHALL show the access rule text as a calm note, using the existing catalog text.
7. THE Hall SHALL keep its Hotspot and padlock pan scene and the existing door count (`WORLD_COUNT`).
8. THE Hall access check, guest receipt and Tutorial_Lock rules SHALL stay as implemented, and the door states in criteria 3, 5 and 9 SHALL be consistent with the Tutorial_Lock (no door opens before the tutorial is done).
9. WHILE the player is signed in and the tutorial is done, THE Hall SHALL show each door open or locked as the existing access rule defines.
10. WHEN the Hall test runs, THE test SHALL cover the three states of criteria 3, 5 and 9 (tutorial not done; guest after the tutorial; signed in after the tutorial) and SHALL read each door state from the existing access check, not from a new rule.

### Requirement 18: Scene layout (P1 item 9)

**User Story:** As a player, I want the picture and the controls on the first screen, so that I never scroll to reach the fear meter or hints.

#### Acceptance Criteria

1. THE Scene_Screen SHALL render one compact Top_Bar (back, title, scene name and scene switcher in one row, wrapping at most to two rows at 390 px).
2. WHEN the Scene_Screen is measured at 1280x800, THE scene image, pan buttons, fear meter and both hint buttons SHALL lie fully inside the viewport (bottom edge at or above 800 px) without page scroll.
3. WHEN the Scene_Screen is measured at 390x844, THE scene image SHALL start above y = 200 px, and the pan buttons, fear meter and hint buttons SHALL be reachable without scrolling the page more than one viewport height.
4. WHEN the Banshee world scene switcher renders at 390 px, THE five scene buttons SHALL NOT leave a lone wrapped button or an empty band above the scene.
5. THE Scene_Screen SHALL use the full available width up to the viewport width for the scene (no 768 px column at 1280 px).
6. WHEN a response panel appears after a Hotspot click, THE scene SHALL stay in view (no page scroll that hides the scene).
7. THE Scene_Screen SHALL keep the pan by drag and by arrow keys, and the Pinned_Classes `scene-viewport mood-vignette-inset`, `scene-image` and `scene-sprite`.
8. WHEN the Game_App header renders at 390 px, THE header SHALL fit in one row; IF one row is impossible, THEN THE Game_App SHALL collapse the header items to a popover menu (approved by the Owner) and THE UI_Rework SHALL record the choice in the Decisions_File.
9. WHEN the Game_App header is tested at 1280 px with the menu closed, THE test SHALL find every menu item visible and reachable by Tab and the menu button hidden; WHEN it is tested at 390 px, THE menu button SHALL open the menu, and Escape SHALL close the menu and return focus to the menu button.

### Requirement 19: Hotspot affordance and reply (P1 item 10)

**User Story:** As a player, I want to see what can be clicked and hear back from every click, so that I can tell progress from nothing.

#### Acceptance Criteria

1. THE Scene_Screen SHALL draw a subtle glint on every Hotspot, meaningful or decoy, with the same look for both (decoys stay indistinguishable).
2. WHILE Reduced_Motion is active, THE glint SHALL be static (no pulse).
3. WHEN a Hotspot is clicked, THE Scene_Screen SHALL show a visible reply line in the `role="status"` region within 300 ms of the response, and the reply SHALL never be empty.
4. WHEN the reply is "nothing here" or a clue, THE Scene_Screen SHALL show the text in the same place and SHALL NOT change what the server returns.
5. THE glint SHALL NOT change the Hotspot box size, the 44 px minimum target, or the keyboard focus order.
6. IF the glint class is removed, THEN THE glint test SHALL fail.
7. WHEN a Hotspot is clicked in the unit test of the scene component, THE `role="status"` text SHALL be non-empty for every Hotspot role (clue, decoy, dead end, locked).

### Requirement 20: Book controls (P2 item 11)

**User Story:** As a reader, I want book controls that look like buttons and say what state they are in, so that I know how to turn pages and switch views.

#### Acceptance Criteria

1. THE `.book-controls` previous, next and toggle controls SHALL carry Button_Class styling beside `book-controls`, with fill or border, hover, active, disabled and focus states.
2. WHEN Book_View is active, THE toggle label SHALL read "Read as one page" and `aria-pressed` SHALL be `false`.
3. WHEN Scroll_View is active, THE toggle label SHALL read "Read as a book" and `aria-pressed` SHALL be `true`.
4. THE new label SHALL come from a catalog key and SHALL be listed in the handover.
5. WHEN the Book component test toggles the mode, THE test SHALL assert both label and `aria-pressed` in both modes and SHALL fail if either stays unchanged.
6. THE `book-controls`, `book-flow` and `book-frontispiece` Pinned_Classes SHALL remain.

### Requirement 21: Book height (P2 item 12)

**User Story:** As a reader, I want the book to use the screen, so that there are fewer pages to turn.

#### Acceptance Criteria

1. WHEN Book_View renders at 1280x800, THE book page height SHALL be at least 60 % of the viewport height (at least 480 px), where it is about 405 px today.
2. WHEN Book_View renders at 1280x800, THE page count of Banshee SHALL be lower than the Phase 5 count of 22.
3. WHEN the viewport is resized, THE Book SHALL reflow and keep the first visible text, as in Phase 5.
4. THE anchor tests (`anchors-once`, `anchor`, `book-check.mjs`) SHALL pass unchanged.
5. BEFORE changing the book height, THE UI_Rework SHALL measure the rendered book page height and its limiting element at 1280x800 and 390x844, SHALL choose the change from that measurement, and SHALL record the numbers and the choice in the Decisions_File.

### Requirement 22: Cross links between the apps (P2 item 13)

**User Story:** As a visitor of either app, I want to find the other, so that the atlas and game feel like one place.

#### Acceptance Criteria

1. THE Atlas_App header SHALL contain a link to `/game/` with a catalog label.
2. THE Game_App header SHALL contain a link to the atlas at `/` with a catalog label.
3. WHEN either header is rendered, THE test SHALL find that link by its `href` and SHALL fail if the link is removed.
4. WHEN the Game_App runs behind its base path, THE atlas link SHALL use the existing `atlasUrl` helper or the same-origin rule (`ATLAS_ORIGIN` unset means same origin).

### Requirement 23: "All legends" link (P2 item 14)

**User Story:** As a visitor, I want "All legends" to take me to the list, so that the header item does something.

#### Acceptance Criteria

1. THE atlas header item "All legends" SHALL have an `href` that is not `/` and that points at the legend list (an anchor such as `/#legends` or a list route).
2. WHEN "All legends" is activated on Atlas_Home, THE page SHALL scroll to the legend list with its heading in view.
3. THE logo link SHALL keep `href="/"`.
4. WHEN the header is tested, THE test SHALL fail if both items have the same `href`.

### Requirement 24: Legend hero first screen (P2 item 15)

**User Story:** As a reader, I want to see the legend title on the first screen, so that I know where I am without scrolling.

#### Acceptance Criteria

1. WHEN a legend page is rendered at 1280x800, THE `h1` SHALL lie fully inside the first 800 px.
2. WHEN a legend page is rendered at 390x844, THE `h1` SHALL stay inside the first screen as it does today.
3. THE hero `picture` and `source` markup SHALL stay as `hero-markup.test.tsx` pins it.
4. THE hero box SHALL show the theme-colour placeholder until the image has decoded.

### Requirement 25: Fear meter label and tutorial goal (P2 item 16)

**User Story:** As a new player, I want to see what the fear meter is and what the tutorial wants, so that I understand the game in the first minute.

#### Acceptance Criteria

1. THE fear meter SHALL show a visible text label and value (for example "Fear 10 / 100") next to the bar, from catalog keys.
2. THE fear meter SHALL keep `role="meter"` and its `aria-label` and value attributes.
3. THE tutorial room SHALL show a one-sentence goal at the top of the Scene_Screen from a catalog key, and THE sentence SHALL state only what the tutorial content supports (open the locked drawer by answering its question).
4. WHEN the fear value changes, THE visible text SHALL change in the same render.
5. THE fear meter text SHALL reach 4.5:1 against its background.

### Requirement 26: One hint area (P2 item 17)

**User Story:** As a player, I want one place for hints, so that I do not scan eight identical buttons or lose my place when a hint opens.

#### Acceptance Criteria

1. THE Game_App SHALL render exactly one pair of buttons (Hint 1 and Hint 2) per puzzle set, with a visible puzzle picker or the active puzzle name shown in the Hint_Area.
2. WHEN the notebook of a world with five puzzles renders, THE count of buttons named "Hint 1" SHALL be one, and the count named "Hint 2" SHALL be one.
3. WHILE a puzzle is "Not opened yet", THE Hint_Area SHALL NOT offer a hint for that puzzle.
4. WHEN a hint opens, THE page layout above and around the scene SHALL NOT shift (the Hint_Area is a sheet or a reserved box that does not push the scene).
5. THE Hint 1 button SHALL stay free and the Hint 2 button SHALL keep its text that says it raises fear and opens the atlas.
6. THE accessible name of each hint button SHALL include the puzzle name.
7. THE fear cost, hint order and Hint_2_Link construction SHALL stay as implemented.

### Requirement 27: Hint 2 and pop-up blockers (P2 item 18)

**User Story:** As a player, I want Hint 2 to reach the atlas even when the browser blocks pop-ups, so that I do not pay fear for nothing.

#### Acceptance Criteria

1. WHEN the player activates Hint 2, THE Game_App SHALL open a blank tab synchronously in the click handler, and AFTER the server confirms the hint and fear is raised, THE Game_App SHALL set that tab's location to the `atlasUrl` target and set its opener to null; THE Game_App SHALL NOT reveal the chapter URL or link before fear is raised.
2. IF the browser blocks the blank tab, THEN THE Game_App SHALL, only after the server confirms the hint and fear is raised, show a sentence that says the tab was blocked, with a visible link to the chapter, in the Hint_Area.
3. IF the server call fails or is refused (network error, guest limit, rate limit or any other refusal), THEN THE Game_App SHALL close the blank tab in the same tick as the error is handled, SHALL leave fear unchanged and SHALL show no chapter link and no chapter URL.
4. THE fallback link SHALL be at least 44 px high and SHALL use `rel="noopener"`.
5. THE fear value after Hint 2 SHALL equal the value the play rules define (no change to the rule).
6. WHEN the unit test runs with a `window.open` that returns `null` and a successful server call, THE test SHALL assert that the sentence and the link appear only after fear is raised, and SHALL fail if either is missing.
7. WHEN the unit test runs with a failing server call, THE test SHALL assert for every failure path (network error, guest limit, rate limit, other refusal, and a reply that is not a hint) that `close()` is called on the blank tab and that no chapter link and no chapter URL is shown, and SHALL fail otherwise.
8. THE Hint 2 link target SHALL stay `<legend-id>--ch-<n>` as built by `atlasUrl`.

### Requirement 28: No layout shift while a move is processed (P2 item 19)

**User Story:** As a player, I want the buttons to stay where they are, so that I do not mis-tap.

#### Acceptance Criteria

1. WHILE a move is processed, THE Scene_Screen SHALL show "Working on your last move…" inside a box with reserved height.
2. WHEN the processing text appears and disappears, THE positions of the scene, pan buttons and hint buttons SHALL change by 0 px.
3. WHEN the browser check measures the scene top before, during and after a move, THE three values SHALL be equal.
4. WHILE Reduced_Motion is active, THE status text SHALL appear with no animation.

### Requirement 29: Anchor landing (P2 item 20)

**User Story:** As a player arriving from Hint 2, I want the chapter heading in view, so that I see where the answer is.

#### Acceptance Criteria

1. THE atlas anchor targets (`[data-anchor-heading]` and chapter headings) SHALL have a `scroll-margin-block-start` at least as large as the header height plus 16 px.
2. WHEN `/anchor/banshee--ch-3` is opened at 390x844, THE heading rectangle SHALL satisfy top >= header height and bottom <= viewport height.
3. WHEN `/anchor/<id>` is opened for every anchor of one legend in Book_View and in Scroll_View, THE heading SHALL be visible and focused.
4. THE anchor id SHALL stay unique in the DOM and `data-anchor-heading` with `tabIndex={-1}` SHALL stay.
5. IF the scroll margin is removed, THEN THE anchor test SHALL fail.
6. WHEN `/anchor/nope--zzz` is opened, THE route SHALL still return 404 with its current text.

### Requirement 30: Source link size (P2 item 21)

**User Story:** As a touch user, I want source links I can hit, so that I do not trigger the wrong one.

#### Acceptance Criteria

1. THE Sources_List links SHALL measure at least 24 px in height and at least 24 px in width, with at least 8 px between neighbouring links, at 390 px and 1280 px.
2. WHEN the Sources_List is measured on Banshee in book mode and in one-page mode, THE smallest link height SHALL be at least 24 px.
3. THE external-link marker SHALL carry an accessible name that says it opens an external site, from a catalog key.
4. IF the minimum height rule is removed from the stylesheet, THEN THE tap-size test SHALL fail.

### Requirement 31: Contents list (P2 item 22)

**User Story:** As a reader, I want a readable chapter list, so that I can pick a chapter without a wall of underlined links.

#### Acceptance Criteria

1. THE legend page contents SHALL render as one ordered list with the chapter number and title, in one column, with no underline on the items.
2. WHEN a contents item is hovered or focused, THE item SHALL show the change as weight or a marker, plus the Focus_Ring on focus.
3. WHEN the legend page is checked at 390 px, THE contents items SHALL be at least 44 px high.
4. THE contents links SHALL keep their `href` values, so that the anchor tests pass unchanged.

### Requirement 32: Optional P3 items

**User Story:** As the Owner, I want polish items done only when time allows, so that the P1 and P2 fixes ship first.

#### Acceptance Criteria

1. WHERE time remains after Requirement 31 is verified, THE UI_Rework SHALL clip the Book page-turn layer to the page box so that the mid-turn frame shows no clipped text.
2. WHERE time remains, THE UI_Rework SHALL unify the type sizes and gaps in use (8 sizes and 9 gaps today) onto the type and spacing scales of Requirement 4.
3. WHERE time remains, THE UI_Rework SHALL replace the hex fallbacks in `apps/game/src/components/scene.css`, `world.css`, `tutorial.css` and `skeleton/src/design/mood.css` with tokens, and point `--mood-ink` at `var(--color-bg)`, and `apps/game/test/theme.test.ts` SHALL still pass.
4. WHERE the Banshee panorama brightness seam is judged a defect, THE UI_Rework SHALL add the seam-free panorama request to the Needs_File and SHALL NOT edit the asset.
5. WHERE time remains, THE UI_Rework SHALL turn the "Reduce motion in scares" checkbox into a styled switch with the same label, `checked` state and storage.
6. WHERE the Game_App shows "Read the legends" links under the Hall, THE links SHALL render as a compact row of Button_Class chips or move to the footer.
7. IF a P3 item is not done, THEN THE handover SHALL list it as not done.

### Requirement 33: New tests per criterion

**User Story:** As a maintainer, I want a test for every testable criterion, so that a regression fails a test.

#### Acceptance Criteria

1. THE UI_Rework SHALL add at least one test for each testable criterion in Requirements 10 to 31, among them: contrast pairs, toggle label and `aria-pressed`, one map on Atlas_Home, cross links, scroll margin on anchors, tap target sizes, and no repeated hint buttons.
2. WHEN the rule a new test protects is broken, THE new test SHALL fail.
3. WHEN a criterion needs a browser (layout positions, viewport fit, measured contrast of rendered pixels), THE UI_Rework SHALL cover the criterion in a browser check script under the app's `scripts/` folder and SHALL record the result in `docs/phase-6-notes/`.
4. THE new tests SHALL run without a database and without network access.

### Requirement 34: Existing tests stay green

**User Story:** As the Owner, I want the whole suite green, so that the rework is safe to push.

#### Acceptance Criteria

1. WHEN `pnpm -r test` runs, THE run SHALL pass in the Skeleton, the Atlas_App and the Game_App with no database and no network.
2. WHEN typecheck runs in the three packages, THE typecheck SHALL report no error.
3. WHEN the secret scan runs, THE scan SHALL report no finding.
4. IF a test fails after two real attempts to fix it, THEN THE UI_Rework SHALL mark the task blocked, record the test, the two attempts and the error in the Decisions_File, and continue with the next task that does not depend on it.
5. THE number of blocked tasks SHALL NOT stop the run. THE UI_Rework SHALL stop for blocked tasks only IF every remaining unchecked task depends on a blocked one, and SHALL then write its status and report.
6. THE UI_Rework SHALL finish groups 6, 7 (P3 as time allows) and 8 locally before task 9.1, so that one push carries everything.
### Requirement 35: Mutation checks

**User Story:** As the Owner, I want proof that the important tests can fail, so that a green run means something.

#### Acceptance Criteria

1. WHEN a test for items 3, 4, 5, 6, 11, 20, 26, 27, 29 or 30 is added, THE UI_Rework SHALL apply one mutation that breaks the protected rule, confirm that the test fails, and restore the code.
2. THE UI_Rework SHALL record each mutation, the failing test and the restore in the Mutations_File.
3. WHEN a mutation does not make a test fail, THE UI_Rework SHALL strengthen the test and repeat the mutation.
4. WHEN all mutations are restored, THE `git diff` of the mutated lines SHALL equal the pre-mutation state.

### Requirement 36: Browser checks on local servers

**User Story:** As the Owner, I want the screens checked in a real browser at both widths, so that layout claims are measured.

#### Acceptance Criteria

1. THE UI_Rework SHALL run browser checks at 390x844 and 1280x800 against the local atlas on port 3001 and the local game on port 3000.
2. THE browser checks SHALL cover: Atlas_Home; the World_Map; a legend page in Book_View and in Scroll_View with its references; one anchor link; the Hall; the tutorial; the Banshee world; Hint 1 and Hint 2; the fear meter; a dead end; high fear; and the win screen.
3. WHEN a screen needs state (dead end, high fear, win), THE UI_Rework SHALL reach it through the local game flow and SHALL record how.
4. THE UI_Rework SHALL run one keyboard-only pass (Tab, Enter, Space, arrows, Escape) from the Hall through the tutorial and the Banshee world, and SHALL record each focus ring seen.
5. THE UI_Rework SHALL run one Reduced_Motion pass (OS setting and in-app toggle) and SHALL record that glint, candle, fog and page turn are static.
6. THE UI_Rework SHALL save before and after screenshots at 390 px and 1280 px for every P1 item (1 to 10) in the Debug_Folder, with file names that carry the item number, the width and "before" or "after".
7. WHEN a browser check fails, THE UI_Rework SHALL record the failure and the fix in `docs/phase-6-notes/`.
8. THE UI_Rework SHALL NOT start a local server as a foreground command; the Owner or a background process runs them.
9. IN THE SAME task as the move of `scene.css` and `world.css` into a cascade layer, THE UI_Rework SHALL save before and after screenshots of the Hall, the tutorial and one world scene in the Debug_Folder and SHALL record every visual change in the Decisions_File.

### Requirement 37: Production checks after the push

**User Story:** As the Owner, I want production confirmed after I push, so that the live site matches the local result.

#### Acceptance Criteria

1. WHEN the Owner reports a push, THE UI_Rework SHALL run guest-only checks on production for the screens of Requirement 36.
2. THE UI_Rework SHALL measure Scene_Paint on Slow 4G (1.6 Mbps down, 750 kbps up, 150 ms RTT, 4x CPU throttle, cache off, 390 px, median of three) for the Hall, the tutorial and Banshee scene 1, and SHALL add the Atlas_Home to the same timing table with a before and an after row.
3. WHEN a measured timing is worse than the Phase 5 production run 1 (3714 ms, 3535 ms, 4521 ms), THE UI_Rework SHALL record the cause and the fix attempt.
4. THE UI_Rework SHALL NOT sign up, sign in or write data on production.

### Requirement 38: Process rules for Sub_Agents

**User Story:** As the Owner, I want agents to decide small matters themselves, so that the work does not stall on questions.

#### Acceptance Criteria

1. THE Sub_Agent and the executor SHALL NOT ask the Owner a question during the run.
2. WHEN a decision is open, THE Sub_Agent SHALL follow this spec and pick the smallest option that meets the criteria.
3. THE Sub_Agent SHALL record each choice, with the options considered, in the Decisions_File.
4. THE Sub_Agent SHALL use git read-only.
5. IF the spec and a steering file conflict, THEN THE Sub_Agent SHALL follow the steering file and record the conflict.

### Requirement 39: Kiro usage log

**User Story:** As the Owner, I want the Phase 6 Kiro features recorded, so that the submission shows how Kiro was used.

#### Acceptance Criteria

1. WHEN the UI_Rework ends, THE `docs/kiro-usage.md` file SHALL contain a Phase 6 entry that names the spec, the steering files used, the hooks run, the Sub_Agents used and what each found.
2. THE Phase 6 entry SHALL list the skills used and one finding per skill.

### Requirement 40: Handover

**User Story:** As the Owner, I want one handover document, so that I can review and push with confidence.

#### Acceptance Criteria

1. WHEN the UI_Rework ends, THE file `docs/phase-6-handover.md` SHALL exist.
2. THE handover SHALL contain: the status of every item 1 to 22 (done, partly, blocked) with the test or check that proves it; the status of each P3 item; the conflicts of the Introduction and their resolution; the new catalog keys with English text; the new tokens and classes; the test counts from `pnpm -r test`; the mutation summary; the browser and production check results; the Slow 4G table against Phase 5; the Needs_File items; and the steps the Owner must take before the submission.
3. THE handover SHALL contain no Secret.
4. THE handover SHALL list each blocked task with the failing test, the two attempts and the error.
5. THE only stops in the run SHALL be task 9.1 (Owner push) and task 10.4 (handover).

### Requirement 41: Record files

**User Story:** As the Owner, I want the phase notes in one folder, so that I can audit what was decided and measured.

#### Acceptance Criteria

1. THE UI_Rework SHALL write its notes only under `docs/phase-6-notes/`: `decisions.md`, `mutations.md`, `content-and-assets-needed.md`, `owner-feedback.md`, `progress.md`, `mid-phase-status.md`, and the browser and production result files.
2. WHEN the Needs_File has no entry, THE file SHALL still exist and state "none needed".
3. THE UI_Rework SHALL write no screenshot, trace or video under `docs/`.

### Requirement 42: Progress file and restart

**User Story:** As the Owner, I want the run to resume by itself after a restart, so that nothing depends on my answers or on one long context.

#### Acceptance Criteria

1. AFTER every task, THE UI_Rework SHALL update the Progress_File with the last task done, the next task, the blocked tasks and the open decisions.
2. IF the context is summarised or the run restarts, THEN THE UI_Rework SHALL read the Progress_File and `tasks.md` first and continue from the next unchecked task without asking.
