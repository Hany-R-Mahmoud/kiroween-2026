# Requirements Document

## Introduction

Phase 7, Batch A fixes four owner-reported layout problems and two bugs found in a review of production on 2026-11-24. The common cause of the layout problems is that the page shell does not own the viewport: `--app-header-h` is `3.5rem` in `skeleton/src/design/tokens.css` while the real headers differ in height, and both app roots use `min-h-screen` (100vh) while sections use `dvh`.

The batch is layout and CSS work, checked by looking at screens. It does not change game logic, the puzzle generator, content or the database. It follows the steering rules: shared tokens live in the skeleton, logical CSS properties for RTL, 44px touch targets, and reduced-motion swaps motion for a static or fade equivalent.

Check sizes (the four viewports used for every visual check): 390x844, 667x375 (landscape phone), 768x1024 and 1280x800.

## Glossary

- **Shell**: The root layout of an app (`apps/atlas/src/routes/__root.tsx`, `apps/game/src/routes/__root.tsx`) containing the header and the main region.
- **Atlas_App**: The public legend atlas in `apps/atlas`.
- **Game_App**: The point-and-click investigation in `apps/game`.
- **Header**: The top bar of each app.
- **Header_Token**: The CSS custom property `--app-header-h` in `skeleton/src/design/tokens.css`.
- **World_Screen**: The route `/game/world/*`, rendered by `WorldPlay.tsx`.
- **Scene**: The pannable scene (`.scene-screen`) on the World_Screen.
- **Side_Rail**: The region on desktop holding Question, Notebook and Leads.
- **Dock**: The phone-size tabbed dock or bottom sheet with Scene, Question, Notebook and Leads views.
- **Desktop_Breakpoint**: A viewport inline size of 64rem and up.
- **Win_Overlay**: The full-viewport overlay showing the Ending over the Scene.
- **Restart_Overlay**: The full-viewport overlay shown when the fear meter fills and the room restarts.
- **Book**: The story reader in `skeleton/src/book/Book.tsx`.
- **Book_Controls**: The control row with previous, indicator, next and the view toggle ("Read as one page" / "Read as a book").
- **Legend_Hero**: The hero image on the legend page (`LegendPage.tsx`, `apps/atlas/src/styles.css`).
- **Home_Hero**: The hero on the Atlas_App home page.
- **Fear_Caption**: The element `.fear-overlay-caption` in `apps/game/src/components/fear.css`.
- **Motion_Toggle**: The in-app reduced-motion setting.
- **Hint_1_State**: The Hint 1 texts and marks that `WorldPlay.tsx` keeps per slot id.
- **Run**: One seeded attempt at a world; a fear restart starts a new Run.
- **Verify_Task**: The single final task that runs the typecheck, unit tests, browser tests and the screenshot pass once.
- **Handover_Doc**: `docs/phase-7-batch-a-handover.md`.

## Requirements

### Requirement 1: Shell owns the viewport (A1)

**User Story:** As a visitor on any device, I want the header and content to fill the screen exactly, so that the page does not scroll when its content fits and the header does not hide or overlap content.

#### Acceptance Criteria

1. THE Shell SHALL render the body as a column with `min-block-size: 100dvh`, a fixed-height Header row and a main region that fills the remaining block size.
2. THE Shell SHALL replace `min-h-screen` in `apps/atlas/src/routes/__root.tsx` and `apps/game/src/routes/__root.tsx` with the shared viewport layout.
3. THE Header SHALL stay on a single row without wrapping in Atlas_App and Game_App at every check size.
4. THE Header_Token SHALL equal the rendered Header block size in Atlas_App and Game_App.
5. THE Shell SHALL define only the Header_Token and one small shell layout class in the skeleton, so that both apps import them and neither app copies them.
6. THE Shell SHALL remove the comment that describes the Atlas_App Header as sticky, because the Header scrolls away.
7. WHEN a page's content fits within the viewport, THE Shell SHALL show no page scroll at every check size.
8. THE Shell SHALL keep the Atlas_App Header and the Game_App Header as two separate components in their own apps; merging the two Headers or moving either into the skeleton is out of scope for this batch.
9. IF a Header cannot fit on one row at 390px, THEN THE Header SHALL shorten or hide its secondary link instead of wrapping.

### Requirement 2: World screen fits the viewport (A2)

**User Story:** As a player, I want to open, read and answer a puzzle without scrolling the page, so that the hint "Open a puzzle in the notebook" points at something I can see.

#### Acceptance Criteria

1. WHILE the viewport inline size is at or above the Desktop_Breakpoint, THE World_Screen SHALL render one grid that is one viewport high, with the Scene and its dock on one side and the Side_Rail on the other.
2. THE Side_Rail SHALL present Question, Notebook and Leads as tabs or stacked sections.
3. WHILE the viewport inline size is at or above the Desktop_Breakpoint, THE Side_Rail SHALL scroll by itself and THE World_Screen SHALL show no page scroll.
4. WHILE the viewport inline size is below the Desktop_Breakpoint, THE Dock SHALL show exactly one of Scene, Question, Notebook and Leads at a time.
5. THE World_Screen SHALL keep the page block size at or below the viewport block size at every check size.
6. THE Scene SHALL replace its `min-block-size: 30rem` floor in `apps/game/src/components/scene.css` with a lower value so that the Scene fits at 667x375.
7. WHERE the existing `.hall-panel` overlay pattern fits the Dock or Side_Rail, THE World_Screen SHALL reuse it.
8. WHEN a player opens a puzzle in the Notebook, THE World_Screen SHALL let the player read it, answer it and read Leads without page scroll.
9. THE World_Screen SHALL keep a keyboard focus order that follows the visual order of the Scene, Dock or Side_Rail, and the active view.
10. THE World_Screen SHALL keep every interactive target at 44px or larger in each inline and block dimension.
11. THE World_Screen SHALL use logical CSS properties so that the layout mirrors in RTL.

### Requirement 3: Win and fear restart over the scene (A3)

**User Story:** As a player, I want the win screen and the fear restart notice to appear on top of the scene, so that I see them without scrolling and the page does not jump.

#### Acceptance Criteria

1. WHEN the player wins a world, THE World_Screen SHALL show the Ending in a Win_Overlay that covers the viewport over the Scene.
2. WHEN the fear meter fills, THE World_Screen SHALL show the restart notice in a Restart_Overlay that covers the viewport over the Scene.
3. THE Win_Overlay SHALL reuse the Hall's `.hall-ending` style.
4. THE Restart_Overlay SHALL offer one primary action labelled "Try again".
5. WHILE the Win_Overlay or the Restart_Overlay is shown, THE World_Screen SHALL keep keyboard focus inside that overlay until the player chooses an action.
6. WHEN the Win_Overlay takes focus, THE World_Screen SHALL keep the page scroll position unchanged.
7. WHEN the player chooses "Try again", THE World_Screen SHALL close the Restart_Overlay and start the new Run.
8. WHILE the Motion_Toggle is on or the operating system requests reduced motion, THE World_Screen SHALL show both overlays without movement.

### Requirement 4: Book controls on top and sticky (A4)

**User Story:** As a reader, I want the book controls at the top and always reachable, so that I can switch between one-page and book modes from any scroll position.

#### Acceptance Criteria

1. THE Book SHALL render the Book_Controls before the book content in the DOM in both book mode and one-page mode.
2. THE Book SHALL position the Book_Controls sticky directly below the Header, using the Header_Token, with the page background behind them.
3. THE Book SHALL name the target view in the toggle label: "Read as one page" in book mode and "Read as a book" in one-page mode.
4. WHILE the Book is in one-page mode, THE Book SHALL keep the toggle visible and working with one tap at any scroll position.
5. WHEN the Book starts in one-page mode, THE Book SHALL let the reader switch to book mode with the toggle.
6. THE Book SHALL lower the `--book-page-height` floor in `skeleton/src/book/book.css` so that the page, the indicator and the arrows all fit at 375x667 and 667x375.
7. WHILE the document direction is RTL, THE Book SHALL mirror the Book_Controls order and the arrow directions.
8. WHEN the page is printed, THE Book SHALL hide the Book_Controls.
9. THE Book_Controls SHALL keep each interactive target at 44px or larger in each inline and block dimension.
10. THE Book SHALL use logical CSS properties for the Book_Controls layout.

### Requirement 5: Show hero images whole (A5)

**User Story:** As a visitor on desktop, I want to see each hero painting whole, so that the artwork is not cropped or covered by text.

#### Acceptance Criteria

1. WHILE the viewport inline size is at or above the Desktop_Breakpoint, THE Legend_Hero SHALL show the full 16:9 painting with no crop.
2. WHERE the legend title must stay on the first screen, THE Legend_Hero SHALL place the title beside the image or over its lower edge on wide viewports instead of cropping the image.
3. WHILE the viewport inline size is above 40rem, THE Home_Hero SHALL use two columns, with the painting fully visible in one column and the copy on the plain page background in the other.
4. WHILE the viewport inline size is above 40rem, THE Home_Hero SHALL show no scrim or overlay on the painting.
5. THE Legend_Hero and Home_Hero text SHALL meet WCAG AA contrast against its background at every check size.
6. THE Home_Hero SHALL keep the existing phone layout at 390x844.
7. THE Legend_Hero and Home_Hero SHALL use logical CSS properties so that the columns mirror in RTL.

### Requirement 6: Fear caption visible with reduced motion (A6)

**User Story:** As a player who has reduced motion on, I want to read the fear caption, so that I get the same information as other players.

#### Acceptance Criteria

1. WHILE reduced motion is on, THE Fear_Caption SHALL have a static visible state for the whole time the caption is shown.
2. WHILE reduced motion is on, THE Fear_Caption SHALL appear and disappear with no flash and no movement.
3. WHILE reduced motion is off, THE Fear_Caption SHALL keep its current animation.
4. WHEN a fear event occurs with the Motion_Toggle on, THE Game_App SHALL show the Fear_Caption.
5. THE Game_App SHALL fix the Fear_Caption in `apps/game/src/components/fear.css` or the Game_App's own CSS and SHALL NOT remove the `animation: none !important` rule in `skeleton/src/design/ui.css`.

### Requirement 7: Hint 1 state does not survive a fear restart (A7)

**User Story:** As a player, I want a fear restart to reset Hint 1, so that the room really starts over with new details as the restart copy says.

#### Acceptance Criteria

1. WHEN a fear restart starts a new Run, THE World_Screen SHALL show no Hint 1 text from the earlier Run.
2. WHEN a fear restart starts a new Run, THE World_Screen SHALL show no Hint 1 mark from the earlier Run.
3. THE World_Screen SHALL key the Hint_1_State by Run or clear it on restart, using the `restarted` signal in `world.$target.tsx` or the Run identity.
4. WHEN the player requests Hint 1 in the new Run, THE World_Screen SHALL show the Hint 1 text for that Run.
5. THE Game_App SHALL leave the fear meter rules, the hint gating rules, the seeded RNG and the puzzle generator unchanged.
6. THE batch SHALL include one small unit test that shows Hint_1_State from an earlier Run is not present after a restart.

### Requirement 8: Scope, testing and verification

**User Story:** As the project owner, I want this batch checked by looking at screens with a single verification pass, so that effort goes into layout rather than brittle tests.

#### Acceptance Criteria

1. THE batch SHALL leave game logic, the puzzle generator, the seeded RNG, content under `content/`, assets under `assets/` and the database unchanged.
2. THE batch SHALL add no new tests except the single unit test required by Requirement 7.
3. THE batch SHALL add no test that measures layout, pixel sizes, CSS values, class names, copy strings or snapshots.
4. WHEN the work on every other task is complete, THE Verify_Task SHALL run once: `pnpm -r typecheck`, `pnpm -r test`, `pnpm --filter @kiroween/atlas test:browser -- --base http://localhost:3001`, and the screenshot pass defined in criterion 9.
5. IF an existing test fails only because it pinned the old layout, THEN THE batch SHALL update that pin and list it in the Handover_Doc.
6. THE batch SHALL NOT weaken any test that covers game rules.
7. WHILE the work is in progress, THE batch SHALL run `pnpm -r typecheck` only after a change to TypeScript types or props.
8. THE batch SHALL avoid repeated saves of `skeleton/src/**/*.ts`, because a hook runs the skeleton tests on each save.
9. WHEN the Verify_Task runs the screenshot pass, THE Verify_Task SHALL take one screenshot per affected screen, once, at 390x844, 667x375, 768x1024 and 1280x800, and check each against the "Done when" criteria of Requirements 1 to 6.
10. THE batch SHALL keep the shared tokens and the shell layout class in the skeleton, with no copies between apps.
11. THE batch SHALL contain no secrets, tokens or connection strings in code, docs or config.
12. THE batch SHALL NOT commit or push.
13. WHILE a task from Requirements 1 to 6 is in progress, THE batch SHALL check that task by looking at the dev server only and SHALL save no screenshots.

### Requirement 9: Handover

**User Story:** As the project owner, I want a short handover and a usage log entry, so that I can review what changed and what was checked.

#### Acceptance Criteria

1. WHEN the Verify_Task finishes, THE batch SHALL write the Handover_Doc at `docs/phase-7-batch-a-handover.md`.
2. THE Handover_Doc SHALL list what changed per task A1 to A7.
3. THE Handover_Doc SHALL list the files touched.
4. THE Handover_Doc SHALL record the results of the Verify_Task.
5. THE Handover_Doc SHALL list the screenshots taken.
6. THE Handover_Doc SHALL list the test pins updated, or state that none were updated.
7. THE Handover_Doc SHALL list anything not done.
8. WHEN the Handover_Doc is written, THE batch SHALL add a short entry for this batch to `docs/kiro-usage.md`.
