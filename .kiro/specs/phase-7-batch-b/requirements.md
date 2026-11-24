# Requirements Document

## Introduction

Phase 7 Batch B refines the Atlas and Game apps on top of the Batch A shell (`.app-shell`, `--app-header-h`, the sticky book control row, the world grid, rail, tabs and overlays). The batch covers seven items, B0 to B6: a win screen without design notes, a faster legend page, a shorter atlas home, a "Play this legend" path from the atlas, guest-aware Hall messaging, visible loading and error states, and a clearer Hint 2.

Scope limits. This batch changes layout, links and UI states only. It does not change game logic, the puzzle generator, the play engine (including the parser of legend files), legend content, files under `content/` or `assets/`, or the database. The Batch A shell is built on, not undone. Shared pieces live in the skeleton. Steering applies: `tech.md`, `product.md`, `design.md` and `i18n-rtl.md` (no hardcoded UI strings, logical CSS properties only, 44px touch targets, WCAG AA, reduced-motion respected, RTL-aware components).

Verification limits. No new tests are written, except one unit test for B0 and, only if B6 adds a URL marker parser, one unit test for that parser. Checking is done once in a final "Verify" task (typecheck, test suites, atlas browser check) plus screenshots at 390x844, 667x375, 768x1024 and 1280x800 saved under `.debug/phase-7b/`, each also checked for `scrollWidth <= innerWidth`.

## Glossary

- **Game_App**: The point-and-click investigation app in `apps/game`.
- **Atlas_App**: The public legends app in `apps/atlas`.
- **Skeleton**: The shared package `@kiroween/skeleton` in `skeleton/`.
- **Batch_A_Shell**: The Batch A layout: `.app-shell`, `--app-header-h`, sticky book control row, world grid, rail, tabs and overlays.
- **Win_Screen**: The ending card in `WorldPlay.tsx` shown when a player completes a world.
- **Curse_Text**: The value `ended.curseText`, taken from `world.finalPuzzle.description`, a design specification and not player-facing text.
- **Catalog_Line**: A single short, legend-independent sentence stored in the English translation catalog and shown on the Win_Screen.
- **Legend_Page**: The atlas page at `/legends/<legend-id>` (`LegendPage.tsx`).
- **Book**: The paged or one-page chapter reader on the Legend_Page.
- **Book_Control_Row**: The sticky control row above the Book from Batch A.
- **Chapters_Control**: A compact control inside the Book_Control_Row that lists the chapters of the legend.
- **Home_View**: The atlas home page (`HomeView.tsx`).
- **Hall**: The archive house hub screen in the Game_App (`Hall.tsx`).
- **Free_World**: The one legend world a guest may enter in addition to the tutorial.
- **Guest**: A visitor who is not signed in.
- **Locked_World**: A world a Guest may not enter.
- **Dock**: The world's action area that shows action errors.
- **Last_Action**: The most recent player action sent from the Dock that failed.
- **Hint_Area**: The component (`HintArea.tsx`) that presents Hint 1 and Hint 2.
- **Hint_Marker**: A small URL marker added to the atlas URL when Hint 2 opens the atlas.
- **Hint_Banner**: The slim banner shown at the top of an atlas chapter when the Hint_Marker is present.
- **Pending_View**: A view inside the shell shown while a route loads.
- **Error_View**: A view inside the shell shown when a route fails, with a Retry button and a link home.
- **Spacing_Step**: The spacing token value used inside the Book.
- **Verify_Task**: The single final task that runs the one-time checks.

## Requirements

### Requirement 1: Win screen shows no design notes (B0)

**User Story:** As a player who has just won a world, I want a clean closing card, so that I do not see internal design notes.

#### Acceptance Criteria

1. WHEN a world ends in a win, THE Win_Screen SHALL render the existing heading, one Catalog_Line, the relic figure, the score and the seed.
2. THE Win_Screen SHALL omit the Curse_Text for every legend.
3. THE Game_App SHALL read the Catalog_Line from a new key in the English translation catalog.
4. THE Win_Screen SHALL present a "Back to the hall" action as the primary action and give it initial keyboard focus.
5. THE Win_Screen SHALL present a quiet "Read the full legend" link to `/legends/<legend-id>` in the Atlas_App next to the "Back to the hall" action.
6. WHEN The Banshee is won, THE Win_Screen SHALL display no slot identifiers, no version identifiers and no literal asterisks.
7. THE Win_Screen SHALL fit its card without inner scrolling at 390x844 and at 1280x800.
8. THE Game_App SHALL leave the engine, the parser, the generator and the content files unchanged.
9. THE Spec SHALL include one unit test that asserts the Win_Screen does not render the Curse_Text.

### Requirement 2: Legend page reaches the story faster (B1)

**User Story:** As a reader, I want the book to appear near the top of the legend page, so that I reach the story without scrolling past a long contents list.

#### Acceptance Criteria

1. THE Legend_Page SHALL present the list of chapters through a Chapters_Control inside the Book_Control_Row instead of a full Contents list stacked above the Book.
2. THE Chapters_Control SHALL provide touch targets of at least 44px.
3. THE Chapters_Control SHALL be operable by keyboard alone.
4. WHILE the active direction is right-to-left, THE Chapters_Control SHALL lay out and operate correctly.
5. THE Legend_Page SHALL use the Spacing_Step for the vertical gaps between its page-level sections.
6. WHEN the Legend_Page is shown at 1280x800, THE Legend_Page SHALL display the first line of the Book after at most one scroll.
7. WHEN the Legend_Page is shown at 390x844, THE Legend_Page SHALL display the title and the Chapters_Control on the first screen.
8. WHEN The Banshee is shown in one-page mode, THE Legend_Page SHALL render a total height clearly below 22000px.

### Requirement 3: Atlas home is shorter (B2)

**User Story:** As a visitor, I want the atlas home to be compact, so that I find a legend quickly.

#### Acceptance Criteria

1. WHILE the viewport is desktop width, THE Home_View SHALL place the legend list beside the map, with the map taking about two thirds of the width and the list about one third.
2. WHILE the viewport is desktop width, THE Home_View SHALL let the legend list scroll independently of the page.
3. WHILE the viewport is phone width, THE Home_View SHALL stack the map and the legend list and use spacing tokens for the gaps.
4. WHEN the Home_View is shown at 1280x800, THE Home_View SHALL have a total height of at most about 2.5 screens.
5. WHEN the Home_View is shown at 1280x800, THE Home_View SHALL make every one of the 12 legends reachable within the first two screens.

### Requirement 4: Play this legend from the atlas (B3)

**User Story:** As a reader of a legend, I want to jump into that legend's world, so that I can play what I just read.

#### Acceptance Criteria

1. THE Legend_Page SHALL present a "Play this legend" action at the end of the Book.
2. THE Book_Control_Row SHALL present a quiet "Play this legend" action.
3. WHEN a visitor activates a "Play this legend" action, THE Atlas_App SHALL navigate to `/game/world/<legend-id>`.
4. IF a Guest activates a "Play this legend" action for a Locked_World, THEN THE Game_App SHALL send the Guest to the sign-in page with the reason defined in Requirement 5.
5. THE Atlas_App SHALL read the "Play this legend" label from the translation catalog.

### Requirement 5: Guests know which world is free (B4)

**User Story:** As a guest, I want to see which world is free and why a world is locked, so that I do not have to tap doors to find out.

#### Acceptance Criteria

1. WHILE a visitor has not completed the tutorial, THE Hall SHALL show one line under the Hall heading reading "Start in the study to open the doors".
2. WHILE a Guest has completed the tutorial, THE Hall SHALL show one line under the Hall heading that names the Free_World and states that signing in opens the other worlds, together with a Sign in button.
3. WHILE a user is signed in, THE Hall SHALL show no additional state line under the Hall heading.
4. WHILE a Guest has completed the tutorial, THE Hall SHALL label the Free_World door "Free for guests" and label each Locked_World door "Sign in to open".
5. IF a Guest opens the URL of a Locked_World, THEN THE Game_App SHALL redirect the Guest to the sign-in page with a reason value.
6. WHEN the sign-in page receives a reason value, THE Game_App SHALL show one line above the sign-in form stating that guests can play the tutorial and one world and that signing in opens this one.
7. THE Game_App SHALL read every new Hall and sign-in string from the translation catalog.
8. THE Game_App SHALL leave the access rules (tutorial plus one world for Guests) unchanged.

### Requirement 6: Loading and error states are visible (B5)

**User Story:** As a player or reader, I want visible loading and error states, so that I know what is happening when the network is slow or fails.

#### Acceptance Criteria

1. THE Skeleton SHALL provide a shared Pending_View and a shared Error_View used by both apps.
2. THE Game_App router and THE Atlas_App router SHALL each set a default pending component and a default error component rendered inside the shell.
3. WHEN a route has been loading for more than about 200ms, THE Pending_View SHALL appear.
4. IF a route fails to load, THEN THE Error_View SHALL display an error message, a Retry button and a link home inside the shell.
5. THE Game_App and THE Atlas_App SHALL keep the not-found view inside the shell.
6. IF a Dock action fails, THEN THE Dock SHALL show the error and a Retry button that repeats the Last_Action.
7. WHEN the Dock shows an action error, THE Dock SHALL place the error and the Retry button on the first screen at 390x844.
8. THE account page SHALL show a Pending_View while it loads and an Error_View with Retry if loading fails.
9. WHEN the network is blocked in the browser, THE Game_App SHALL show a pending state and then an in-shell error with Retry on each game route and on the account page, and THE Atlas_App SHALL do the same on a Legend_Page.
10. THE Pending_View and THE Error_View SHALL respect `prefers-reduced-motion` and read all text from the translation catalog.

### Requirement 7: Hint 2 shows its cost and a way back (B6)

**User Story:** As a player, I want to see what a hint costs before I click it and to return to my game from the atlas, so that I can choose well and not get lost.

#### Acceptance Criteria

1. THE Hint_Area SHALL show the Hint 2 button with the label "Hint 2" and a separate small muted line beside it stating the fear it adds.
2. THE Hint_Area SHALL take the fear amount for Hint 2 from the existing game rules without redefining it.
3. IF the fear amount for Hint 2 varies, THEN THE Hint_Area SHALL show the muted line "Raises fear".
4. THE Hint_Area SHALL show the Hint 1 button with the label "Hint 1" and a separate small muted line "Free".
5. THE Hint_Area SHALL keep the full wording of each hint in its aria-label.
6. WHEN the viewport is 390px wide, THE Hint_Area SHALL show each hint label and its cost line on one line.
7. WHEN Hint 2 opens the atlas, THE Game_App SHALL add the Hint_Marker to the atlas URL.
8. WHEN the Atlas_App loads a chapter URL that carries the Hint_Marker, THE Atlas_App SHALL show the Hint_Banner at the top of the chapter reading "You came here for a hint. Back to your game".
9. WHEN the player activates the Hint_Banner button, THE Atlas_App SHALL focus the game tab, or close the current tab when focusing is not possible.
10. WHEN the Hint_Marker is present, THE Atlas_App SHALL keep the existing chapter highlight.
11. WHERE a URL marker parser is added, THE Atlas_App SHALL include one unit test for that parser.

### Requirement 8: Verification, handover and scope control

**User Story:** As the owner, I want one verification pass and a short handover, so that I can review the batch quickly without extra test churn.

#### Acceptance Criteria

1. THE tasks list SHALL be ordered B0 to B6, followed by one Verify_Task, followed by one handover task.
2. THE tasks list SHALL contain no per-feature test task.
3. THE Verify_Task SHALL run `pnpm -r typecheck`, `pnpm -r test` and `pnpm --filter @kiroween/atlas test:browser -- --base http://localhost:3001 --out .debug/phase-7b/book-check.json` once each.
4. THE Verify_Task SHALL save one screenshot per changed screen at 390x844, 667x375, 768x1024 and 1280x800 under `.debug/phase-7b/` and check `scrollWidth <= innerWidth` on each, reusing the Batch A scripts in `.debug/phase-7/`.
5. WHEN an existing test fails only because it pinned the old layout or old copy, THE Verify_Task SHALL update that pin and list it in the handover.
6. THE Verify_Task SHALL leave tests that cover game rules unweakened.
7. THE handover task SHALL write `docs/phase-7-batch-b-handover.md` listing per-task changes B0 to B6, files touched, check results, screenshots, updated test pins, new English strings for owner review and anything not done.
8. THE handover task SHALL add a short entry for this batch to `docs/kiro-usage.md`.
9. IF a change would touch game logic, the puzzle generator, the play engine, legend content or the database, THEN THE implementer SHALL stop and report instead of proceeding.
10. THE implementer SHALL leave all changes uncommitted and unpushed.
11. WHILE implementing B0 to B6, THE implementer SHALL run `pnpm -r typecheck` only after changes to TypeScript types or props and SHALL NOT run the test suites after individual tasks.
