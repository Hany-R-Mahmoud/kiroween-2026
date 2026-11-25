# Requirements Document

## Introduction

Batch D is a presentation-only polish pass on the atlas and the game. It applies ten items (D1 to D10) from the design review of 2026-11-24 (`../kiroween-review-2026-11-24/`, files 01 to 14). Each item was read in the code again for this spec. The design document records, per item, whether it is still open or already fixed by Phase 7.

The ten items: source codes in legend text become links (US-01); the ending offers the next legend and the best score (GS-03, GS-12); the game header menu closes and sits under the real header (UX-12); scene panning eases (AM-02); the Hall gets a larger scene, quieter padlocks and a clearer hierarchy (HD-06, UX-05, HM-08); the auth forms use the shared UI layer and show per-field errors (HD-10, UX-10); hover styles are gated for touch and buttons get a pressed state (EM-04); one disabled look everywhere (EM-05, HM-10); long names and short screens no longer break the layout (EM-09, EM-10); the account page shows legend titles, a sign-in link and a table that fits at 390 px (UX-09).

Boundaries: no change to game logic (rules, scoring math, fear, hint charging), the puzzle generator, the RNG, the play engine, `content/`, `assets/` or the database. No multiplayer code, no secret in any file, no new test file, nothing committed or pushed. If an item needs a change inside those boundaries, the handover marks it a blocker and the item is not changed.

## Glossary

- **Atlas_App**: the app in `apps/atlas`.
- **Game_App**: the app in `apps/game`, served under `/game/`.
- **Legend_Page**: a page at `/legends/<legend-id>` rendered by `LegendPage.tsx`.
- **Source_Entry**: one item of the Sources list on a Legend_Page.
- **Source_Code**: the text `S<n>` (for example `S1`) inside a parenthetical group of legend text, such as `(S1, S8)`.
- **Source_Link**: a link made from a Source_Code to its Source_Entry on the same page.
- **Chapter_Reference**: the text `ch-<n>` inside a parenthetical group, such as `(see ch-2)`.
- **Map_Card**: the legend card shown by `WorldMap.tsx` on the atlas home page; it renders `MetaList` and has no Sources list.
- **Ending**: the win overlay `Ending` in `apps/game/src/components/WorldPlay.tsx`.
- **Hall_Order**: the order of `doors` returned by the game's `getHall` server function (the catalogue order).
- **Best_Score**: the highest score of a won run of one legend, from the signed-in account history or the guest runs in browser storage, read the way the account page reads them.
- **Scoring_Facts**: the point values in `SCORE` (`skeleton/src/score/score.ts`): 100 per solved puzzle, 50 for breaking the curse, minus 15 per Hint 2, minus 10 per wrong answer, never below 0.
- **App_Menu**: the popover `#app-menu` in `GameHeader.tsx`.
- **Scene_Stage**: the element `.scene-stage` inside the scene viewport.
- **Hall_View**: the game Hall page: header, scene, doors list and panels.
- **Padlock_Badge**: the `.scene-hotspot-badge[data-kind='lock']` mark drawn over a locked Hall door.
- **Shared_UI_Layer**: `skeleton/src/design/ui.css` (classes `panel`, `btn`, `field`, `link`) plus `mood.css`.
- **Auth_Form**: the sign-in and sign-up forms in `apps/game/src/routes/sign-in.tsx` and `sign-up.tsx`.
- **Disabled_Look**: the dashed muted outline of `.btn:disabled` and `.btn[aria-disabled='true']` in `ui.css`.
- **Pointer_Hover_Query**: the media query `(hover: hover) and (pointer: fine)`.
- **Reduced_Motion**: the system setting `prefers-reduced-motion: reduce` or the in-app setting `html[data-motion='reduce']`.
- **Account_Page**: the page at `/account` in the Game_App.
- **Run_Table**: the history table of runs on the Account_Page.
- **Target_Size**: 44 px, the minimum height and width of every interactive element.
- **Verify_Script**: the throwaway Playwright script in `.debug/batch-d/`.

## Requirements

### Requirement 1: Source codes in legend text link to the Sources list

**User Story:** As a reader, I want the source codes in the legend text to take me to the source, so that I can check a claim without hunting through the list.

#### Acceptance Criteria

1. WHEN a Legend_Page shows a Source_Code that matches a Source_Entry of that legend inside a parenthetical group, THE Atlas_App SHALL render the Source_Code as a Source_Link to `#source-<id in lower case>`.
2. THE Atlas_App SHALL give each Source_Entry the element id `source-<id in lower case>`.
3. THE Source_Link SHALL keep the visible text `S<n>` and SHALL keep the brackets, commas and spaces around it as plain text.
4. THE Source_Link SHALL have the accessible name "Source <n>: <source title>" built from a catalog string.
5. IF a Source_Code has no matching Source_Entry, THEN THE Atlas_App SHALL render it as plain text.
6. WHEN a Chapter_Reference names a chapter that has an anchor on the same Legend_Page, THE Atlas_App SHALL render it as a link to that anchor; otherwise THE Atlas_App SHALL leave it as plain text.
7. THE Atlas_App SHALL apply the linking to the meta rows at the top of the Legend_Page, the chapter text, the versions, the documented-and-told table and the closing text.
8. WHEN a Source_Link is activated, THE Legend_Page SHALL bring the matching Source_Entry into view and mark it as the target in both the paged book view and the one-page view.
9. WHERE a legend card has no Sources list (the Map_Card), THE Atlas_App SHALL remove the Source_Codes and Chapter_References and their brackets from the card text instead of linking them.
10. THE Atlas_App SHALL leave every file under `content/` unchanged.

### Requirement 2: Ending offers the next legend and the best score

**User Story:** As a player who just won, I want a way to continue and a sense of my score, so that I have a reason to play on.

#### Acceptance Criteria

1. WHEN the Ending is shown and the Hall_Order holds a legend after the current one (wrapping to the first), THE Ending SHALL show a "Next legend" action next to "Hall".
2. WHILE the visitor is signed in, THE Ending SHALL make "Next legend" open the next legend's world.
3. WHILE the visitor is a guest and the next legend is not open to guests, THE Ending SHALL make "Next legend" open the sign-in page with `reason=world`.
4. IF the Hall_Order holds only the current legend, THEN THE Ending SHALL omit "Next legend".
5. WHEN a Best_Score for the current legend is known, THE Ending SHALL show it under the score line using the existing catalog string `account.bestScore`.
6. IF no Best_Score is known, THEN THE Ending SHALL show no best-score line.
7. THE Ending SHALL show one short line under the score that states the Scoring_Facts, with the numbers read from `SCORE` and the wording from the game catalog.
8. WHILE the Ending is open, THE Ending SHALL keep focus inside it, cycling through its actions with Tab and Shift+Tab, and SHALL keep Escape ignored as it is today.
9. THE Ending SHALL leave the scoring, the score value and the run record unchanged.
10. THE Game_App SHALL show no live score in the scene dock.

### Requirement 3: The game header menu closes and sits under the header

**User Story:** As a phone player, I want the menu to close after I pick a page and to sit right under the header, so that it does not cover the new page.

#### Acceptance Criteria

1. WHEN a link or button inside the App_Menu is chosen, THE Game_App SHALL close the App_Menu by calling `hidePopover()`.
2. THE Game_App SHALL place the open App_Menu directly under the real header, using the measured header block size.
3. WHEN the header size changes (window resize or font load), THE Game_App SHALL update the measured value.
4. IF the header cannot be measured, THEN THE Game_App SHALL fall back to `--app-header-h`.
5. THE Game_App SHALL keep the menu's inline layout from 40 rem unchanged.

### Requirement 4: Scene panning eases

**User Story:** As a player, I want a pan button press to glide, so that the scene feels like a room and not a page.

#### Acceptance Criteria

1. WHEN a pan button or an arrow key changes the pan, THE Scene_Stage SHALL move with a transition of about 250 ms and `ease-out`.
2. WHILE a drag is active, THE Scene_Stage SHALL have no transition.
3. WHILE Reduced_Motion is on, THE Scene_Stage SHALL have no transition.
4. THE Scene_Stage SHALL take its duration from `--motion` so that the in-app setting and the system setting both reach zero.

### Requirement 5: Hall layout and padlocks

**User Story:** As a visitor, I want a larger Hall scene with the doors list close by and one clear open door, so that I know where to go.

#### Acceptance Criteria

1. THE Hall_View SHALL show no heading that repeats the header logo; the single visible page heading SHALL be the Hall heading (`hall.heading`).
2. THE Hall_View SHALL put the Hall heading and the start button in one row above the scene and SHALL show the intro, greeting and guest or study line as at most two short lines.
3. THE Hall_View SHALL show the scene taller than today's `min(52dvh, 28rem)` and SHALL show the first row of the doors list sooner on a 1280x800 screen.
4. THE Hall_View SHALL give the doors-list title and the other section titles a size from the type scale at least one step above body text.
5. THE Padlock_Badge SHALL be smaller and lower in contrast than today's 28 px by 22 px accent badge.
6. THE Hall_View SHALL keep the "free" and "sign in" badges and the accessible door names (which carry the state) as they are.
7. THE Hall_View SHALL keep the set of locked doors unchanged.

### Requirement 6: Auth forms use the Shared_UI_Layer and show field errors

**User Story:** As a visitor who signs in or up, I want the form to look like the game and to tell me which field is wrong, so that I can fix it quickly.

#### Acceptance Criteria

1. THE Auth_Form SHALL use the classes `panel`, `btn` (variants primary, secondary or ghost), `field` and `link` and SHALL carry no Tailwind accent colour or radius class.
2. THE Auth_Form SHALL show each field's error directly under that field, with `aria-invalid="true"` on the input and `aria-describedby` naming the error and hint elements.
3. WHEN a submit fails client-side validation, THE Auth_Form SHALL move focus to the first field in error.
4. WHEN the server rejects the whole form, THE Auth_Form SHALL move focus to the form error, which SHALL have `role="alert"`.
5. WHEN the sign-in form is submitted with an empty email or an empty password, THE Auth_Form SHALL show that field's error without calling the server.
6. THE Auth_Form SHALL show a button on each password field that toggles between hidden and shown text, with an accessible name from the catalog and `aria-pressed`.
7. THE Auth_Form SHALL contain no "forgot password" link or flow.
8. THE Auth_Form SHALL keep a Target_Size hit area on every control.

### Requirement 7: Touch and press feedback

**User Story:** As a phone player, I want taps to show a pressed state and no stuck hover, so that the game answers my finger.

#### Acceptance Criteria

1. THE Shared_UI_Layer SHALL apply every `:hover` rule of `ui.css` only inside the Pointer_Hover_Query.
2. THE Shared_UI_Layer SHALL apply the hotspot glow `.mood-hotspot-glow:hover` of `mood.css` only inside the Pointer_Hover_Query.
3. WHEN an enabled `.btn` is pressed, THE Shared_UI_Layer SHALL show a pressed state (scale down and the existing tint, plus the 1 px shift) that works without hover.
4. WHILE a `.btn` is disabled or has `aria-disabled="true"`, THE Shared_UI_Layer SHALL show no pressed state.
5. THE Shared_UI_Layer SHALL time the pressed transition with `calc(var(--motion) * 80ms)` so that Reduced_Motion removes it.

### Requirement 8: One disabled look

**User Story:** As a player, I want every disabled button to look the same, so that I read the state at a glance.

#### Acceptance Criteria

1. THE Game_App SHALL show `.scene-button:disabled` and `.scene-button[aria-disabled='true']` with the Disabled_Look and no `opacity` rule.
2. THE Atlas_App and the Game_App SHALL show the book controls with `aria-disabled="true"` in the Disabled_Look and no `opacity` rule.
3. WHILE a button is busy (`aria-disabled="true"` while a request is pending), THE button SHALL keep its pending text and show the Disabled_Look.

### Requirement 9: Short screens and long names

**User Story:** As a player on a short phone screen, I want the scene and dock visible and long names kept inside the layout, so that nothing breaks.

#### Acceptance Criteria

1. THE Game_App SHALL size the world and tutorial scene box without a forced `min-block-size: 30rem`, so that at 667x375 the dock is visible without a page scroll.
2. WHEN a scene name is longer than the tab width limit, THE scene tab SHALL end with an ellipsis and SHALL carry the full name in `title`.
3. WHEN a Hall door title is longer than the line, THE Hall_View SHALL wrap or truncate it with an ellipsis and SHALL carry the full title in `title`.
4. WHEN a `.scene-title` is longer than the line, THE Game_App SHALL wrap it inside its row and SHALL carry the full title in `title`.
5. THE Game_App SHALL show no horizontal page scroll at 320 px with a temporary 60-character scene name, door title and scene title set in the browser only.

### Requirement 10: Account page

**User Story:** As a guest or a signed-in player, I want readable run history and a way to sign in, so that the page makes sense on a phone.

#### Acceptance Criteria

1. THE Run_Table SHALL show the legend title for every row, for signed-in players and for guests, and SHALL fall back to the id only when no title is known.
2. THE Account_Page SHALL show a "Sign in" link styled as a button in the guest note.
3. WHEN the viewport is narrower than 40 rem, THE Run_Table SHALL stack each run into one block with the legend title first and the status, score and date on following lines, each labelled from the catalog.
4. WHEN the viewport is 390 px wide, THE Account_Page SHALL show no horizontal scroll.

### Requirement 11: Boundaries, checks and handover

**User Story:** As the owner, I want the polish to change only presentation and to be checked once, so that the batch is safe to ship.

#### Acceptance Criteria

1. THE batch SHALL leave `content/`, `assets/`, the puzzle generator, the RNG, the play engine, the scoring code and the database schema and data unchanged.
2. THE batch SHALL add no test file and SHALL update only existing tests that pinned something the batch changes.
3. WHEN the final Verify task runs, THE Verify task SHALL run `pnpm -r typecheck`, `pnpm -r test` and the atlas book browser check once, and the game browser check if it exists.
4. THE Verify_Script SHALL take screenshots at 390x844, 667x375 and 1280x800 of the pages named in the design's Testing Strategy.
5. THE Verify_Script SHALL check that the Scene_Stage has no transition under `prefers-reduced-motion: reduce`.
6. THE Verify task SHALL write `docs/batch-d-handover.md` with, per item D1 to D10, the result (done, skipped as already fixed, or partly done), files touched, check results, test pins updated and anything weak.
7. THE Verify task SHALL add a short entry to `docs/kiro-usage.md`.
8. IF an item needs a change inside the boundaries of requirement 11.1, THEN THE handover SHALL mark it a blocker and THE batch SHALL leave that item unchanged.
