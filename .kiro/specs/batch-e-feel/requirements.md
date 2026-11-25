# Requirements Document

## Introduction

Batch E of Kiroween 2026 follows Batch D (54d5af4, live). It settles the two product names, states the hook in the product, gives fear events and the book page turn a distinct feel, and adds an `/llms.txt` summary to the atlas. Source review entries (in `../kiroween-review-2026-11-24/`): US-02 (`03-unslop.md`), B7 (`SYNTHESIS.md`), PR-01 and PR-02 (`09-agent-product.md`), AM-03 and AM-05 (`05-huashu-art-motion.md`), SE-06 (`10-agent-seo.md`).

Findings confirmed against the code at the time of writing:
- US-02: `apps/atlas/src/i18n/en.ts` line 3 still carries the "placeholder name (decisions: names are still open)" comment.
- B7, PR-02: `hall.intro` in `apps/game/src/i18n/en.ts` line 13 does not say that answers live only in the atlas.
- PR-01: the atlas footer in `apps/atlas/src/routes/__root.tsx` has no skeleton line, and the Hall has none.
- AM-03: `fear.css` plays one black `fear-flash` for every event, with an opaque `var(--color-surface)` caption box. `FEAR_EVENTS` entries carry `trigger`, `caption` (`sound` or `sight`) and an `id` (`fe-1` to `fe-5`), but no visual look.
- AM-05: `skeleton/src/book/book.css` slides `.book-flow` with `--book-turn-ms: 300ms`; the gutter shadow is static.
- SE-06: no `/llms.txt` route exists; `apps/atlas/src/routes` has `robots[.]txt.ts` and `sitemap[.]xml.ts` only. The review says 13 legends; the owner states 12, and the 12 ids in `fearEvents.ts` match.
- Reusable mood classes `.mood-vignette-inset` and `.mood-fog` exist in `skeleton/src/design/mood.css`. Whether they are mounted inside the game scene stage is to be settled in design.
- The legend hook field is `oneLineHook` (see `skeleton/src/atlas/view.ts`).
- The atlas has no existing external-link treatment for sources in the files checked; design must confirm and otherwise use plain external link markup.

Out of scope and protected for later execution: game rules, scoring, fear amounts, pacing limits, hint charging, the puzzle generator, the play engine, `content/`, `assets/` and the database. `skeleton/src/play/fear.ts` and `fearTable.ts` stay unchanged. No new names, routes or domains. No `/about` page. No `Math.random` for game logic. No secrets in code, docs or tests.

## Glossary

- **Atlas**: the public app in `apps/atlas`, named "Trick or Told".
- **Game**: the point-and-click app in `apps/game`, named "Trick or True".
- **Entry_Page**: the atlas route `/`.
- **Hall**: the game hub screen that holds the doors to legend worlds.
- **Shared_Line**: the sentence "Two apps, one skeleton: the atlas and the game are built from the same engine."
- **Engine_Link**: the link on the words "the same engine" to `https://github.com/Hany-R-Mahmoud/kiroween-2026#how-it-fits-together`.
- **Fear_Event**: one of the five events per legend defined in `apps/game/src/layout/fearEvents.ts`.
- **Fear_Look**: one visual treatment of a Fear_Event: Cold_Vignette, Fog_Surge or Scene_Dim.
- **Cold_Vignette**: a Fear_Look that tightens a cold vignette over the scene, reusing `.mood-vignette-inset`.
- **Fog_Surge**: a Fear_Look that raises the fog layer once, reusing `.mood-fog`.
- **Scene_Dim**: a Fear_Look that briefly dims the scene while hotspot glow goes dark.
- **Fear_Overlay**: the non-interactive layer in `FearOverlay.tsx` that plays a Fear_Event.
- **Reduced_Motion**: the state where the system setting `prefers-reduced-motion: reduce` or the attribute `data-motion='reduce'` is active.
- **Book**: the page-turning reading view in `skeleton/src/book`.
- **Turn_Shade**: the soft shadow and the slight dim of the leaving page painted during a page turn.
- **Book_Viewport**: the clipped `.book-viewport` element.
- **Llms_Route**: the atlas route `/llms.txt`.
- **Public_Origin**: the `PUBLIC_ORIGIN` environment value, read through `getEnv().publicOrigin`; empty when unset.
- **Legend_Hook**: the `oneLineHook` field of a legend.
- **Verify_Task**: the final task that runs the checks and the screenshot script.

## Requirements

### Requirement 1: Names settled (E1, US-02)

**User Story:** As a visitor, I want to see how the two product names relate, so that I know which app is the reading atlas and which is the game.

#### Acceptance Criteria

1. THE Atlas SHALL contain no comment in `apps/atlas/src/i18n/en.ts` that describes the site name as a placeholder or as still open.
2. THE Entry_Page SHALL show the text "Told is the atlas. True is the game." directly under the tagline, with the string held in `apps/atlas/src/i18n/en.ts`.
3. WHILE the viewport is 390x844 px, THE Entry_Page SHALL keep the two cards visible within the first screen with the new line present.
4. WHERE the line does not fit on one line at 390 px width, THE Entry_Page SHALL wrap the line onto a second line.
5. THE System SHALL keep every other product name, route and domain unchanged, including the site and atlas name "Trick or Told" and the game name "Trick or True".

### Requirement 2: The hook stated in the product (E2, B7, PR-01, PR-02)

**User Story:** As a first-time visitor or judge, I want the product to say that the answers live only in the atlas and that both apps share one engine, so that the premise is clear at the point of entry.

#### Acceptance Criteria

1. THE Game SHALL set `hall.intro` in `apps/game/src/i18n/en.ts` to "Each door holds one legend. Open it to enter its world. The answers live only in the atlas."
2. THE Atlas SHALL show the Shared_Line in the footer rendered by `apps/atlas/src/routes/__root.tsx`.
3. THE Game SHALL show the Shared_Line as a small muted line at the bottom of the Hall, without a new footer component for other pages.
4. THE Shared_Line SHALL have identical text in both apps, each held in that app's `en.ts`.
5. THE Atlas and THE Game SHALL render the words "the same engine" as the Engine_Link to `https://github.com/Hany-R-Mahmoud/kiroween-2026#how-it-fits-together`, opening in the same tab.
6. WHERE the Atlas has an existing external-link treatment for sources, THE Engine_Link SHALL use that treatment.
7. THE System SHALL provide no `/about` route in either app.

### Requirement 3: Fear events with distinct looks (E3, AM-03)

**User Story:** As a player, I want each fear event to look different, so that the second event still surprises me and the scene art stays visible.

#### Acceptance Criteria

1. THE Game SHALL provide at least three distinct Fear_Looks: Cold_Vignette, Fog_Surge and Scene_Dim.
2. THE Game SHALL implement each Fear_Look using only the CSS properties opacity, transform and filter.
3. WHERE an existing layer provides the effect, THE Game SHALL reuse it: `.mood-vignette-inset` for Cold_Vignette and `.mood-fog` for Fog_Surge.
4. WHEN a Fear_Event plays, THE Game SHALL select its Fear_Look by a stable rule in `fearEvents.ts` or beside it, so that the same event on the same legend always gets the same look.
5. THE Game SHALL derive the Fear_Look without `Math.random` and without any seeded or unseeded randomness.
6. WHEN Scene_Dim plays, THE Fear_Overlay SHALL dim the scene and darken the hotspot glow for the duration of the effect.
7. WHEN a Fear_Event plays outside Reduced_Motion, THE Fear_Overlay SHALL start the caption fade-in after the visual cue has begun.
8. THE Fear_Overlay SHALL render the caption without the opaque `var(--color-surface)` box, with a text contrast ratio of at least 4.5:1 against the scene behind it.
9. THE Fear_Overlay SHALL keep at most one Fear_Event per 4000 ms, `EVENT_SHOW_MS` below the gap, and the existing gate in `fearPlayer.ts` unchanged.
10. THE Fear_Overlay SHALL cause fewer than two luminance changes in any one-second window during every Fear_Look.
11. THE Game SHALL keep every fear amount unchanged, and SHALL leave `skeleton/src/play/fear.ts` and `skeleton/src/play/fearTable.ts` unmodified.
12. WHILE Reduced_Motion is active, THE Fear_Overlay SHALL show no movement and no flash for any Fear_Look, and SHALL show the caption text visibly for the event's duration.
13. IF the page loads with Reduced_Motion active and a Fear_Event plays, THEN THE Fear_Overlay SHALL show the caption at full opacity, so the Batch A caption fix (A6) stays in effect.

### Requirement 4: Book page turn feels like paper (E4, AM-05)

**User Story:** As a reader of the atlas, I want the page turn to show a paper-like shade, so that the book feels like old paper and not a carousel.

#### Acceptance Criteria

1. THE Book SHALL keep the current translate of `.book-flow` and the current `--book-turn-ms` timing of 300 ms.
2. WHEN a page turn is in progress, THE Book SHALL paint a Turn_Shade on a pseudo-element of the Book_Viewport: a soft shadow moving across the turning side and a slight dim of the leaving page.
3. THE Book SHALL animate the Turn_Shade using only opacity and transform.
4. THE Book SHALL show the Turn_Shade for a next turn and for a previous turn.
5. THE Book SHALL show the Turn_Shade in two-page mode and in one-page mode.
6. THE Book SHALL show the Turn_Shade for turns made by keyboard.
7. WHILE Reduced_Motion is active, THE Book SHALL show no transition and no Turn_Shade.
8. WHEN a page turn ends, THE Book SHALL leave no residual shade on the pages.
9. THE Book SHALL keep page position logic, anchors and the controls added in Batches A and D unchanged.
10. WHERE a class toggle is needed to start the Turn_Shade, THE Book SHALL add it in `skeleton/src/book/Book.tsx` and in no other file outside `book.css`.

### Requirement 5: llms.txt (E5, SE-06)

**User Story:** As an agent or judge using AI tools, I want a concise generated index of the atlas and the game, so that I can find every legend quickly.

#### Acceptance Criteria

1. WHEN a GET request for `/llms.txt` reaches the Atlas, THE Llms_Route SHALL respond with status 200 and the header `content-type: text/plain; charset=utf-8`.
2. THE Llms_Route SHALL build its body from legend content at build time or request time and contain no hand-written legend lines.
3. THE Llms_Route SHALL start the body with the line "# Trick or Told".
4. THE Llms_Route SHALL follow the first line with one short paragraph stating what the atlas is, what the game is, and that the game cannot be solved without the atlas.
5. THE Llms_Route SHALL list under a "## Legends" heading one line per legend in the form "- [Title](absolute URL): Legend_Hook".
6. THE Llms_Route SHALL list under a "## Game" heading the game URL and the tutorial.
7. WHERE Public_Origin is non-empty, THE Llms_Route SHALL write every URL as Public_Origin followed by the path.
8. IF Public_Origin is empty, THEN THE Llms_Route SHALL write every URL as a relative path.
9. THE Llms_Route SHALL build the text in a pure function, in the style of `buildRobots` in `apps/atlas/src/seo/sitemap.ts`, so that it can be tested without a server.
10. THE Atlas SHALL leave `/llms.txt` out of the sitemap and out of every other list.

### Requirement 6: Testing and pins

**User Story:** As the maintainer, I want a lean test change, so that Batch E adds little test surface but no test fails because of an intended change.

#### Acceptance Criteria

1. THE System SHALL add exactly one new test: that the `/llms.txt` text lists all 12 legends.
2. WHEN an existing test pins text or markup that this batch changes, THE System SHALL update that test, and the handover SHALL list each updated pin.
3. THE System SHALL add no other new tests.
4. THE System SHALL contain no secret, token or connection string in code, docs, tests or committed configuration.

### Requirement 7: Stop conditions for execution

**User Story:** As the owner, I want execution to stop only on defined conditions, so that the batch finishes without avoidable interruptions.

#### Acceptance Criteria

1. IF execution is blocked, THEN THE System SHALL stop and report the blocker.
2. IF a change would touch game rules, scoring, fear amounts, pacing limits, hint charging, the puzzle generator, the play engine, `content/`, `assets/` or the database, THEN THE System SHALL stop and report instead of making the change.
3. THE System SHALL otherwise continue through E1 to E5 and the Verify_Task without asking for confirmation.

### Requirement 8: Verify task and handover

**User Story:** As the owner, I want one final verification pass and a handover document, so that I can review the batch without rerunning anything.

#### Acceptance Criteria

1. THE Verify_Task SHALL load `.env` into the shell only, and SHALL print or write no value from it.
2. THE Verify_Task SHALL run once each: `pnpm -r typecheck`, `pnpm -r test`, the atlas book browser check, and the Game browser check if one exists.
3. THE Verify_Task SHALL use a throwaway Playwright script in `.debug/batch-e/` to capture screenshots at 390x844 and 1280x800 of the Entry_Page with the new line, the atlas footer, the Hall bottom line, and the Book mid-turn for next and previous.
4. THE Verify_Task SHALL record a short video or 4 to 6 frames of each of the three Fear_Looks in the tutorial.
5. THE Verify_Task SHALL check E3 and E4 once with `prefers-reduced-motion: reduce`.
6. THE Verify_Task SHALL fetch `/llms.txt` from the local build and record the status, the content type and the line count.
7. WHEN the Verify_Task ends, THE System SHALL write `docs/batch-e-handover.md` with, for each of E1 to E5, done or partly done, files touched, check results, test pins updated and anything weak.
8. WHEN the Verify_Task ends, THE System SHALL add a short entry to `docs/kiro-usage.md`.
9. THE System SHALL make no commit and no push.
10. WHEN the batch ends, THE System SHALL report the full list of changed files.
