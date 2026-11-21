# Requirements Document

## Introduction

Phase 5 of Kiroween 2026 takes the finished atlas and game from local builds to a live, fast, installable, atmospheric product. The work has eight parts, done in this order: production on Vercel and Neon; first-view speed; old-book reading; Halloween mood; installable web app; Phase 4 leftovers; README; Kiro features log. A tests-and-checks group and a final handover cover all of them.

Sources read for this document: `docs/phase-4-handover.md`, `docs/phase-3-handover.md` ("Needs your action", "Residual risks"), `docs/tech-decisions.md`, `docs/planning/01-decisions.md`, `docs/planning/02-work-plan.md` ("Finish", "Rules checklist"), `docs/planning/15-look-and-feel-brief.md`, `docs/planning/14-content-fixes-phase-4.md`, `docs/phase-4-notes/browser.md`, `docs/phase-4-notes/impeccable-review.md`, `docs/phase-4-notes/layout-open-matches.md`, and the five files in `.kiro/steering`.

Facts carried from earlier phases that these requirements rely on:
- Decision 4: both apps deploy under one domain on separate paths. The atlas owns `/`, the game owns `/game`.
- Phase 4 budget: scene paint within 3.0 s on Slow 4G (1.6 Mbps down, 750 kbps up, 150 ms RTT, 4x CPU throttle, cache off) at 390 px. Phase 4 measured 5845 ms (Hall), 4883 ms (Tutorial) and 10436 ms (Banshee scene 1), medians of three runs.
- The Neon project's default branch is empty (0 tables) and becomes production. `dev-skeleton-core` is the dev branch.
- Migrations 0000 to 0003 exist. `atlas_reader` and `atlas_web` are defined in `docs/tech-decisions.md`.
- Phase 4 owner actions that fall to Phase 5: `/media` caching and compression, the atlas `serve-build.mjs` crash, the tutorial rate limit, the tutorial lock, hotspot position checks, open polish items.

## Glossary

- **Launch_Project**: the whole Phase 5 work covered by this document, including all documents it writes.
- **Atlas_App**: the app in `apps/atlas`. It owns the path `/` and `/media`.
- **Game_App**: the app in `apps/game`. It owns the path `/game`.
- **Skeleton**: the shared package `@kiroween/skeleton`.
- **Production_Site**: the Vercel deployment of both apps on one domain.
- **Production_Origin**: the https origin of the Production_Site, with no path.
- **Vercel_Project**: one project in the Vercel dashboard, with a root directory, build command and settings.
- **Production_Database**: the default branch of the Neon project `kiroween-2026`.
- **Dev_Database**: the Neon branch `dev-skeleton-core`.
- **Neon_MCP**: the Neon MCP server configured in `.kiro/settings/mcp.json`.
- **Atlas_Web_Role**: the Postgres login role `atlas_web`, a member of `atlas_reader`.
- **Password_Script**: the local script the Owner runs in a terminal to set the Atlas_Web_Role password in the Production_Database.
- **Owner**: the human user of Kiro.
- **Sub_Agent**: any agent started by the main agent during the Launch_Project.
- **Thread**: the single main conversation in which tasks run.
- **Stop**: a point at which the main agent halts and waits for the Owner.
- **Mid_Phase_Stop**: the Stop defined in Requirement 7.
- **Protected_Paths**: everything under `content/` and `assets/`.
- **Secret**: any password, token, cookie, key, connection string, or value of an environment variable listed as secret in `.env.example`.
- **Debug_Folder**: a git-ignored folder, outside `docs/`, that holds screenshots made for debugging.
- **Slow_4G_Profile**: 1.6 Mbps down, 750 kbps up, 150 ms RTT, 4x CPU throttle, cache disabled, 390 px viewport.
- **Browser_Check_Script**: `apps/game/scripts/browser-check.mjs`.
- **Scene_Paint**: two animation frames after the scene image has decoded, measured from navigation start.
- **Scene_Image**: the panorama image of the current scene of the Hall, Tutorial_Room or a World.
- **Secondary_Images**: sprites, the spirit figure and the fear-meter frame in the game viewer.
- **Hero_Image**: the 2400 px hero image of a legend page in the Atlas_App.
- **Book_View**: the paged reading layout (two-page spread on wide screens, one page on narrow screens).
- **Scroll_View**: the existing single-column scrolling layout, shown when the "Read as one page" toggle is on.
- **Book_Component**: the one shared component that renders Book_View and Scroll_View.
- **Reading_Surface**: an atlas legend page, the Keeper's Note page, or a game reading panel where Book_Component fits.
- **Anchor**: a stored anchor id of the form `<legend-id>--ch-<n>`, `<legend-id>--versions`, `<legend-id>--versions--<v>` or `keepers-note--ch-1`.
- **Hint_2_Link**: the link the game opens at the Anchor named by Hint 2, built with `atlasUrl`.
- **Mood_Layer**: the CSS and DOM effects of Requirement 19: vignette, candlelight, fog, torn edges, hotspot glow, in-voice loading lines.
- **Reduced_Motion**: the `prefers-reduced-motion: reduce` media setting, or the in-app motion setting set to reduced.
- **Manifest**: the web app manifest of an app.
- **Icon_Asset_Id**: an asset id for an app icon, listed in the Needs_File.
- **Needs_File**: `docs/phase-5-notes/content-and-assets-needed.md`.
- **Decisions_File**: `docs/phase-5-notes/decisions.md`.
- **Handover_File**: `docs/phase-5-handover.md`.
- **Kiro_Usage_File**: `docs/kiro-usage.md`.
- **Layout_Overlay**: the `?layout=1` outline of every tap box in a scene.
- **Tutorial_Lock**: the rule that the tutorial must be done before a World is entered.
- **Catalog**: the translation catalog; `app.title` in the atlas catalog and the game title key in the game catalog hold the product names.
- **Rate_Limit**: a limit on how often one client may call the tutorial answer action.
- **Production_Smoke**: the checks of Requirement 27 run against the Production_Site.

## Requirements

### Requirement 1: Working rules and boundaries

**User Story:** As the Owner, I want Phase 5 to run in one thread with fixed limits, so that nothing outside the agreed scope changes.

#### Acceptance Criteria

1. THE Launch_Project SHALL run its tasks one at a time, in the order of the tasks file, in the Thread.
2. WHILE a Sub_Agent is running, THE Launch_Project SHALL run no other Sub_Agent and make no edits in the working tree outside that Sub_Agent.
3. THE Sub_Agent SHALL ask the Owner no questions, SHALL follow this spec, SHALL choose the smallest option that fits, SHALL record each such choice in the Decisions_File and SHALL continue.
4. THE Launch_Project SHALL run only read-only git commands.
5. WHEN an edit of the Launch_Project must be undone, THE Launch_Project SHALL undo the edit by hand and SHALL NOT use a git command that changes the working tree or history.
6. IF the network or a documentation site is unreachable, THEN THE Launch_Project SHALL use installed types and package files, record the gap and the fallback in the Decisions_File, and continue.
7. IF a test still fails after two real fix attempts, THEN THE Launch_Project SHALL mark the task blocked, record the reason in the Decisions_File, and move to the next independent task.
8. THE Launch_Project SHALL NOT create, edit or delete any file under the Protected_Paths.
9. IF a task needs content or an asset, THEN THE Launch_Project SHALL list the exact item in the Needs_File and continue without it.
10. THE Launch_Project SHALL NOT change the Phase 1 parser, generator or audit logic, the Phase 2 auth, access rule or score formula, or the Phase 4 play rules (fear amounts, token format, fair-play secrecy), except for the changes listed in Requirements 10, 22 and 23.
11. THE Launch_Project SHALL NOT commit or push.
12. WHEN every task is done or blocked, THE Launch_Project SHALL write the Handover_File and stop.

### Requirement 2: Secrets and debug output

**User Story:** As the Owner, I want no secret to appear in any file or output, so that the public repo and logs stay clean.

#### Acceptance Criteria

1. THE Launch_Project SHALL NOT read, print or write the value of any Secret, and SHALL NOT read the file `.env`.
2. WHEN a command could print environment or configuration, THE Launch_Project SHALL exclude Secret values from the command output.
3. IF a Secret value is needed, THEN THE Launch_Project SHALL stop and tell the Owner the variable name and where it goes (local `.env` or Vercel project settings), and SHALL NOT ask for the value.
4. THE Launch_Project SHALL write no Secret to code, docs, tests, committed config, notes or logs; recorded commands and results SHALL NOT contain a cookie, password or token.
5. THE Launch_Project SHALL save debug screenshots only in the Debug_Folder, and SHALL add the Debug_Folder to `.gitignore` if it is not listed.
6. THE Launch_Project SHALL NOT save a debug screenshot under `docs/`.
7. THE existing secret-scan test SHALL pass after all Phase 5 changes.

### Requirement 3: Stops

**User Story:** As the Owner, I want the agent to wait only at defined points, so that I can plan my time.

#### Acceptance Criteria

1. WHEN requirements, design or tasks are written, THE Launch_Project SHALL stop and wait for the Owner's approval of that document before the next phase of the spec.
2. WHEN a step can be done only by the Owner, THE Launch_Project SHALL stop and give the Owner the exact steps. The steps are: creating a Vercel_Project (with every setting given), adding a secret or environment variable (name and place only), running the Password_Script, and pushing to `main` so Vercel deploys.
3. IF a task needs a production database change that the approved design does not list, or a switch from the two Vercel_Projects to Vercel Services, THEN THE Launch_Project SHALL stop before making that change.
4. IF missing content or assets block a whole item, THEN THE Launch_Project SHALL stop and list the missing items.
5. WHEN the Mid_Phase_Stop conditions of Requirement 7 are met, THE Launch_Project SHALL stop and wait for Owner feedback.
6. IF more than two tasks are blocked, THEN THE Launch_Project SHALL stop and report the blocked tasks and reasons.
7. WHEN the Handover_File is written, THE Launch_Project SHALL stop and wait.
8. WHEN none of the conditions in criteria 1 to 7 applies, THE Launch_Project SHALL continue to the next task without waiting.

### Requirement 4: Production hosting design on Vercel

**User Story:** As the Owner, I want the smallest working Vercel setup for both apps on one domain, so that deployment is simple and the game cookie stays first-party.

#### Acceptance Criteria

1. THE design SHALL be based on current official documentation for TanStack Start on Vercel, Vercel monorepos, and routing of two apps under one domain, and SHALL record the pages read and the date in the Decisions_File.
2. THE design SHALL state the number of Vercel_Projects, the root directory of each, the install and build commands of each, and how a request to `/game` reaches the Game_App.
3. THE design SHALL state how `/media` is served and from which Vercel_Project.
4. WHILE the Production_Site is live, THE Production_Site SHALL serve the Atlas_App at `/` and `/media`, and the Game_App at `/game` and below, on the Production_Origin.
5. THE Production_Site SHALL set the Game_App auth cookie as a first-party cookie on the Production_Origin.
6. WHEN a response is a `/media` image, THE Production_Site SHALL send a `Cache-Control` header with `max-age` of at least 31536000 seconds and `immutable`, or the design SHALL record why a shorter value is used.
7. WHEN a response is a text asset (HTML, JS, CSS, JSON, SVG), THE Production_Site SHALL send it compressed with gzip or brotli to a client that sends a matching `Accept-Encoding`.
8. THE Production_Site SHALL serve `/media` from the same domain as the pages.
9. THE Production_Site SHALL set `ATLAS_ORIGIN` empty and `PUBLIC_ORIGIN` to the Production_Origin as an https origin.
10. THE Launch_Project SHALL keep in every `vercel.json` it creates or edits, in any folder Vercel uses as a project root, the object `{"git": {"deploymentEnabled": {"*": false, "main": true}}}` plus only the further keys that setup needs.
11. WHEN the design is approved, THE Launch_Project SHALL prepare the Owner steps for creating each Vercel_Project and SHALL stop under Requirement 3.2.
12. IF the two-project setup cannot serve `/game` on the Production_Origin and Vercel Services is the only remaining option, THEN THE Launch_Project SHALL stop under Requirement 3.3, SHALL tell the Owner why, SHALL list exactly what changes in the Vercel setup (projects, root directories, `vercel.json` files, environment variables), and SHALL make no such change until the Owner approves.
13. WHEN the build configuration of both apps is ready and before the first push, THE Launch_Project SHALL run the normal build command of each app locally with `VERCEL=1` set, SHALL fix any build error it shows, and SHALL NOT commit the build output (`.output/`, `.vercel/` and `.nitro/` SHALL be git-ignored; the Launch_Project SHALL NOT delete them, and SHALL run the normal builds afterwards and confirm the local servers still work).

### Requirement 5: Production database

**User Story:** As the Owner, I want the production database built from a fixed, approved list of statements, so that no dev data reaches it and every change is recorded.

#### Acceptance Criteria

1. THE design SHALL list the exact production steps in order: migrations 0000 to 0003, `db:import` of the twelve legends, the Keeper's Note import, the `atlas_reader` and `atlas_web` role statements from `docs/tech-decisions.md` (including the `keepers_note` grant), and the Neon Auth setup for production.
2. WHEN the design is approved, THE Launch_Project SHALL treat the listed production steps as approved and SHALL treat every other production database change as a Stop under Requirement 3.3.
3. WHERE the Neon_MCP can perform a listed step, THE Launch_Project SHALL use the Neon_MCP and SHALL record each call with its tool name and exact statement in the Decisions_File.
4. THE Launch_Project SHALL copy no dev user, session, run or `player_flags` row to the Production_Database.
5. WHEN the Production_Database setup is complete, THE Launch_Project SHALL check that the twelve legends and the Keeper's Note are present, that `runs` has 0 rows, and that `atlas_web` is refused (SQLSTATE 42501) on `runs`, `keepers_note_details`, `player_flags` and `legends.model`.
6. THE Launch_Project SHALL do all dev database work on the Dev_Database only.
7. THE design SHALL state that Neon Auth for production has the Production_Origin as a trusted domain.
8. THE design SHALL state whether Google sign-in on the Production_Origin works with Neon's shared credentials, based on current Neon documentation; IF it does not, THEN THE design SHALL give the Owner the exact steps to create a Google OAuth client, and the Launch_Project SHALL stop at those steps under Requirement 3.2.
9. THE design SHALL state the sign-in methods enabled on the Production_Database Neon Auth, and SHALL include email and password, so that the Owner can create the judge account with a password from the Owner's password manager.
10. THE Launch_Project SHALL NOT create the judge account and SHALL NOT sign in to the judge account.

### Requirement 6: Atlas_Web_Role password script and environment variables

**User Story:** As the Owner, I want to set the production reader password without it appearing anywhere, so that the database stays safe.

#### Acceptance Criteria

1. THE Launch_Project SHALL provide a local Password_Script that the Owner runs in a terminal.
2. WHEN the Owner runs the Password_Script, THE Password_Script SHALL generate a random password, set it with `ALTER ROLE` sent over psql standard input, copy the full `ATLAS_DATABASE_URL` to the clipboard, and print only yes or no results.
3. THE Password_Script SHALL NOT print, log or write the password or the connection string to the terminal, a file or the repo, and SHALL NOT set the password with a SCRAM hash or the Console reset.
4. IF the `ALTER ROLE` statement fails, THEN THE Password_Script SHALL print a "no" result and SHALL NOT copy anything to the clipboard.
5. THE design SHALL list, per Vercel_Project, the environment variable names, and SHALL mark which names need a new production value. THE design SHALL state the production setting of `FEATURE_ARABIC` as off, because the Arabic catalog is empty, and of `GUEST_WORLD` as `banshee`, next to their names.
6. THE Production_Site SHALL use its own `GAME_TOKEN_KEY` and its own `NEON_AUTH_COOKIE_SECRET`, different from the local values.
7. THE design SHALL NOT contain a value for any environment variable other than the `FEATURE_ARABIC` and `GUEST_WORLD` settings named in criterion 5.

### Requirement 7: Mid-phase stop

**User Story:** As the Owner, I want to review the live site and the hotspot screenshots before the large visual work starts, so that corrections come early.

#### Acceptance Criteria

1. WHEN production is live with the current look, the speed fixes of Requirements 11 to 14 are deployed, and the hotspot screenshots of Requirement 21 are saved, THE Launch_Project SHALL stop at the Mid_Phase_Stop.
2. THE Launch_Project SHALL give at the Mid_Phase_Stop both production URLs, the measured timings per screen from Requirement 14, and the path of every hotspot screenshot.
3. WHILE the Launch_Project waits at the Mid_Phase_Stop, THE Launch_Project SHALL make no change for Requirements 15 to 19.
4. WHEN the Owner sends hotspot corrections, THE Launch_Project SHALL apply them to the layout data in `apps/game/src/layout/` and run the game layout test.
5. THE Launch_Project SHALL start Requirements 15 to 19 only after the Owner's feedback at the Mid_Phase_Stop.

### Requirement 8: Security headers and content security policy

**User Story:** As the Owner, I want basic security headers on both apps, so that the live site follows common practice.

#### Acceptance Criteria

1. WHEN the Production_Site answers a request on either app, THE response SHALL include `X-Content-Type-Options: nosniff`, a `Referrer-Policy` header, and a `Content-Security-Policy` `frame-ancestors` directive or an equivalent frame-blocking header.
2. WHERE a `Content-Security-Policy` can be added without blocking fonts, images, scripts or sign-in, THE Production_Site SHALL send it.
3. THE Launch_Project SHALL record in the Decisions_File whether a full CSP was added and, IF it was not, which resource blocked it.
4. WHEN the headers are configured, THE Launch_Project SHALL check them on the built output of both apps by a test.
5. THE Launch_Project SHALL confirm after the Owner's deploy that the headers are present on a real production response.

### Requirement 9: Atlas local server crash

**User Story:** As the Owner, I want the atlas local server to stay up, so that local checks do not need a restart loop.

#### Acceptance Criteria

1. THE Launch_Project SHALL reproduce or explain the "Stream lifetime exceeded" exit of `apps/atlas/scripts/serve-build.mjs` that occurs about 120 seconds after a page request whose stream does not finish.
2. WHEN a response stream errors or the client closes it early, THE Atlas_App local server SHALL handle the error and keep running.
3. THE Launch_Project SHALL record whether the Vercel runtime has the same problem, based on current documentation and a check on the Production_Site.
4. THE Atlas_App SHALL have a test that fails when the stream error handler is removed.

### Requirement 10: Tutorial answer rate limit

**User Story:** As the Owner, I want a limit on tutorial answers, so that a script cannot guess without limit.

#### Acceptance Criteria

1. THE Launch_Project SHALL apply the smallest working Rate_Limit to the tutorial answer action, as a Vercel firewall rule or in server code, and SHALL document the choice, the limit values and how to change them in the Decisions_File.
2. WHEN a client exceeds the Rate_Limit, THE Game_App SHALL refuse the call with HTTP status 429 and a fixed error text that contains no answer and no limit internals.
3. WHEN a client stays within the Rate_Limit, THE Game_App SHALL process the tutorial answer exactly as before.
4. WHERE the Rate_Limit is in server code, THE Game_App SHALL key the limit on a value that is not a Secret and SHALL NOT log that value.
5. THE Rate_Limit SHALL NOT change the fear amounts or the tutorial rules.
6. IF a request carries no visitor address header, THEN THE Game_App SHALL NOT apply the Rate_Limit to that request, and THE Launch_Project SHALL record this fail-open choice in the Decisions_File.
7. THE Game_App SHALL NOT use a shared fallback key, so that no two visitors ever share one Rate_Limit bucket.

### Requirement 11: First-view image deferral

**User Story:** As a phone player, I want the scene image to load before the extras, so that the first view appears quickly.

#### Acceptance Criteria

1. WHEN a viewer renders, THE Game_App SHALL start the download of Secondary_Images only after the load event of the current Scene_Image.
2. WHILE the Scene_Image has not loaded, THE Game_App SHALL render no `src` for a Secondary_Image and SHALL keep every hotspot reachable by keyboard and touch with its accessible name.
3. IF the Scene_Image fails to load, THEN THE Game_App SHALL start the Secondary_Images anyway after the error event.
4. WHEN server-rendered markup is checked, THE markup SHALL contain the Scene_Image reference and no Secondary_Image `src`.
5. THE Launch_Project SHALL update the viewer tests (`viewer.test.ts`, `fear-ui.test.ts`) to the new behaviour.
6. THE Game_App SHALL change no layout, hotspot position or sprite box by this deferral.

### Requirement 12: Compression and caching

**User Story:** As a phone player, I want smaller downloads on repeat and first visits, so that pages load faster.

#### Acceptance Criteria

1. THE Production_Site SHALL meet Requirement 4.6 and 4.7 for both apps.
2. THE Launch_Project SHALL verify on the Production_Site, by response headers, the `Cache-Control` of one `/media` image and the `Content-Encoding` of one JS or CSS file.
3. IF a header from criteria 2 is missing, THEN THE Launch_Project SHALL fix the Vercel setup and verify again.

### Requirement 13: Smaller hero images for phones

**User Story:** As a phone player, I want a smaller hero image, so that the legend page does not download 2400 px.

#### Acceptance Criteria

1. THE design SHALL propose the smallest way to serve a smaller Hero_Image copy to narrow screens, and SHALL justify any build-time development dependency in the Decisions_File and `docs/tech-decisions.md`.
2. WHERE a build-time dependency is added, THE Launch_Project SHALL pin it to an exact version.
3. WHEN a viewport of 390 CSS px loads a legend page at a device pixel ratio of 1, 2 or 3, THE Atlas_App SHALL request a Hero_Image copy whose width is at most 1000 px.
4. WHEN a viewport wider than 1000 CSS px loads a legend page, THE Atlas_App SHALL request the full-size Hero_Image.
5. THE Atlas_App SHALL keep the Hero_Image `width` and `height` attributes consistent with the copy that is shown, so that layout does not shift.
6. THE Launch_Project SHALL write generated copies only to build output and SHALL NOT write to the Protected_Paths.
7. IF the smaller copies cannot be made without writing to the Protected_Paths, THEN THE Launch_Project SHALL record the need in the Needs_File and continue.
8. THE Atlas_App SHALL serve the Hero_Image through a `picture` element whose source selection uses a media query on viewport width (or an equivalent that does not select by pixel density), so that a phone never selects the 2400 px Hero_Image because of its device pixel ratio.
9. THE Launch_Project SHALL add a test that checks the Hero_Image copy choice at a 390 CSS px viewport at device pixel ratios 1, 2 and 3, and that fails when any of the three selects a copy wider than 1000 px.

### Requirement 14: Speed re-measurement

**User Story:** As the Owner, I want measured numbers against the 3.0 s budget on the real site, so that I know what passes.

#### Acceptance Criteria

1. WHEN requirements 11 to 13 are deployed, THE Launch_Project SHALL run the Browser_Check_Script timing on the Production_Site under the Slow_4G_Profile, 3 runs per screen, for the Hall, the Tutorial_Room and Banshee scene 1.
2. THE Launch_Project SHALL report per screen the three Scene_Paint values, the median, total transfer, image transfer, and pass or fail against 3000 ms.
3. THE Launch_Project SHALL report the Phase 4 numbers next to the new numbers per screen.
4. IF a screen misses 3000 ms, THEN THE Launch_Project SHALL report the miss and the measured cause, and SHALL NOT change the budget.
5. THE Launch_Project SHALL NOT modify any image under the Protected_Paths to reach the budget.

### Requirement 15: Old-book reading component

**User Story:** As a reader, I want story text laid out as an aged open book, so that reading feels like the Halloween setting and not like a long web page.

#### Acceptance Criteria

1. THE Launch_Project SHALL implement Book_View once, as one Book_Component with shared tokens in the Skeleton, and SHALL use it on every atlas legend page, on the Keeper's Note page, and on each game reading panel where it fits.
2. THE Book_Component SHALL draw paper from the existing `shared-atlas-paper-01` image, warmed with CSS (tint, darker edge, foxing, soft vignette), and SHALL add no new image file.
3. WHILE the viewport inline size is at least 1024 px and one-page mode is off, THE Book_Component SHALL show a two-page spread with a gutter shadow between the pages.
4. WHILE the viewport inline size is below 1024 px and one-page mode is off, THE Book_Component SHALL show one page.
5. THE Book_Component SHALL flow text into pages with plain DOM and CSS and SHALL use no page-flip library.
6. THE Book_Component SHALL start each chapter on a new page.
7. THE Book_Component SHALL show the Hero_Image as a frontispiece on the first page or spread, before chapter 1.
8. THE Book_Component SHALL provide previous and next page buttons, a page indicator of the form "page n of m", left and right arrow key turning, and swipe turning on touch.
9. WHEN the Owner uses keyboard only, THE Book_Component SHALL allow reaching the first and last page and every control by keyboard, with a visible focus ring.
10. WHEN the viewport is 390 px wide, THE Book_Component SHALL cause no horizontal page scroll outside the book.
11. WHERE the Arabic flag is on, THE Book_Component SHALL order the spread and place the page controls by the UI direction, using logical CSS properties only, and SHALL leave story text in English.
12. THE Book_Component SHALL use only CSS logical properties, with the existing exception for painted scenes.
13. WHEN the window is resized or the font loads, THE Book_Component SHALL recompute pages and keep the reader on the page that contains the first visible text of the previous layout.

### Requirement 16: Anchors in Book_View

**User Story:** As a player, I want every hint and deep link to open the page that holds the anchor, so that the book never hides the answer source.

#### Acceptance Criteria

1. WHEN `/anchor/<anchor>` resolves to a page, THE Book_Component SHALL open the page that holds that Anchor.
2. WHEN a Hint_2_Link is opened, THE Book_Component SHALL open the page that holds that Anchor.
3. WHEN the URL hash names an Anchor, THE Book_Component SHALL open the page that holds that Anchor and SHALL move focus to its heading without scrolling the window away from the book.
4. THE Atlas_App SHALL keep each Anchor in the DOM exactly once in Book_View and exactly once in Scroll_View.
5. THE Launch_Project SHALL keep `atlasUrl` and its output unchanged.
6. WHEN a viewport change moves an Anchor to another page, THE Book_Component SHALL keep the reader on the page that holds that Anchor if the hash names it.
7. THE `/anchor/keepers-note--ch-1` route SHALL open the Keeper's Note page at that Anchor on the Production_Site.

### Requirement 17: "Read as one page" toggle

**User Story:** As a reader who uses a screen reader, find-in-page or print, I want to switch off the pages, so that I get one continuous text.

#### Acceptance Criteria

1. THE Book_Component SHALL provide a "Read as one page" toggle, labelled from the Catalog.
2. WHEN the toggle is turned on, THE Book_Component SHALL show Scroll_View.
3. WHEN the toggle is turned on or off, THE Book_Component SHALL show the same story text, in the same order, with the same headings.
4. THE Book_Component SHALL remember the toggle choice per browser and apply it on the next page load, before first paint where possible.
5. WHEN a print is requested, THE Book_Component SHALL print Scroll_View.
6. WHEN the toggle changes, THE Book_Component SHALL keep the reader at the same chapter.

### Requirement 18: Ink contrast and motion in reading

**User Story:** As a reader, I want legible ink on every theme and no unwanted motion, so that reading is comfortable and safe.

#### Acceptance Criteria

1. THE Book_Component SHALL render body ink on the paper at a contrast ratio of at least 4.5:1 in every legend theme pack and in the base theme.
2. THE existing contrast test SHALL check ink on the warmed paper colour for all twelve packs, the base theme and the Keeper's Note page, and SHALL fail when a pair is below 4.5:1.
3. WHEN a page turns and Reduced_Motion is off, THE Book_Component SHALL animate the turn for at most 400 ms, without a 3D curl.
4. WHILE Reduced_Motion is on, THE Book_Component SHALL change pages instantly with no animation.
5. THE Book_Component SHALL keep each theme pack's display font and accents.
6. THE Launch_Project SHALL record the paper texture load time on the Slow_4G_Profile.

### Requirement 19: Halloween mood layer

**User Story:** As a visitor, I want the pages and scenes framed with candlelight, fog and worn edges, so that the Halloween mood carries beyond the painted assets.

#### Acceptance Criteria

1. THE Mood_Layer SHALL use CSS and DOM only, and SHALL add no image file, sound or library.
2. THE Mood_Layer SHALL draw a vignette at the viewport edges on dark surfaces.
3. THE Mood_Layer SHALL draw a candlelight glow whose brightness changes slowly and at most 3 times in any second.
4. THE Mood_Layer SHALL draw a low fog layer along the bottom of scenes and the Hall that does not cover a hotspot or text.
5. THE Mood_Layer SHALL draw torn or burnt edges on image frames and panels, using existing parchment assets as mask or border image.
6. WHEN a hotspot receives hover or focus, THE Game_App SHALL show a faint glow on that hotspot.
7. WHILE content loads, THE Game_App and Atlas_App SHALL show a loading line written in the story's voice, taken from the Catalog.
8. WHILE Reduced_Motion is on, THE Mood_Layer SHALL show no candlelight change, no fog movement and no flicker, and SHALL show static equivalents.
9. THE Mood_Layer SHALL keep text contrast at the levels of Requirement 18 and the existing AA rule.
10. THE Mood_Layer SHALL keep every hotspot at least 44 by 44 CSS px and clickable, with no overlay capturing pointer events.
11. THE Mood_Layer SHALL contain no gore, no occult or religious symbol, and nothing that imitates a film, game or brand.
12. THE Keeper's Note page SHALL keep its "Fiction" label clearly visible with the Mood_Layer on.
13. THE Launch_Project SHALL record how the Mood_Layer affects load and paint time on the Slow_4G_Profile.

### Requirement 20: Installable web app

**User Story:** As a phone user, I want to install the game, so that it opens like an app.

#### Acceptance Criteria

1. THE Game_App SHALL serve a Manifest with `name`, `short_name`, `start_url` inside `/game/`, `scope` `/game/`, `display`, `theme_color`, `background_color` and an `icons` list.
2. WHERE the cost is one file and one link, THE Atlas_App SHALL serve a Manifest with `scope` `/`.
3. THE Launch_Project SHALL read current install criteria from official documentation and SHALL record the criteria and the date in the Decisions_File.
4. THE Manifest `name` and `short_name` SHALL come from the Catalog title keys, and the page SHALL link the Manifest and set a `theme-color` meta tag.
5. THE Manifest `icons` list SHALL name only Icon_Asset_Ids, with PNG paths and the sizes listed in the Needs_File.
6. THE Launch_Project SHALL list in the Needs_File, as PNG, an icon of 192 px, an icon of 512 px, a maskable icon of 512 px and an apple-touch-icon of 180 px, each with its Icon_Asset_Id and size, and SHALL NOT create an icon file.
7. IF an icon file is missing, THEN THE Launch_Project SHALL still wire the Manifest and an `apple-touch-icon` link to the PNG paths of the Icon_Asset_Ids and continue.
8. THE Launch_Project SHALL keep every Manifest and Needs_File entry consistent, so that a test fails when a Manifest icon id is not in the Needs_File.
9. IF install requires a service worker under the current criteria, THEN THE Launch_Project SHALL add the smallest worker that meets the criteria and SHALL NOT cache any play response.

### Requirement 21: Hotspot position screenshots

**User Story:** As the Owner, I want an overlay screenshot of every scene, so that I can correct hotspot positions.

#### Acceptance Criteria

1. THE Launch_Project SHALL save one `?layout=1` Layout_Overlay screenshot for every scene of the Hall, the Tutorial_Room and each of the twelve Worlds.
2. THE Launch_Project SHALL save the screenshots in the Debug_Folder and SHALL list every path in the Decisions_File and at the Mid_Phase_Stop.
3. THE Launch_Project SHALL list the hotspots recorded as guesses in `docs/phase-4-notes/layout-open-matches.md` next to their screenshot paths.
4. WHEN the Owner sends corrections, THE Launch_Project SHALL apply them to the layout data and SHALL keep the rules enforced by the game layout test.
5. THE Layout_Overlay SHALL stay absent from production builds, and a test SHALL fail when `scene-outline` appears in the built client JS.

### Requirement 22: Phase 4 polish items

**User Story:** As the Owner, I want the open Phase 4 review items fixed, so that the game reads and looks right.

#### Acceptance Criteria

1. THE Skeleton `resolveTheme` SHALL check theme glow against the surface colour as well as the background, and SHALL reach 4.5:1 for panel headings on the surface in every pack, by using the base glow or the ink where the pack glow fails.
2. WHEN the spring-heeled-jack theme is resolved, THE panel heading colour on the surface SHALL have a contrast ratio of at least 4.5:1.
3. THE Hall reward slot SHALL show no "An empty slot." text, and the tutorial reward SHALL read as a sentence that fits the reward, from a Catalog key.
4. THE Launch_Project SHALL fix each remaining item of `docs/phase-4-notes/impeccable-review.md` (Phase 4 handover section 17) that is a bug or an AA failure, and SHALL list in the Decisions_File each item left open with its reason.
5. THE Game_App SHALL make the `.spirit-panel-body` and `.spirit-caption` colour order explicit, not dependent on bundle order.
6. THE Game_App SHALL close the Hall ending dialog on Escape and keep focus inside the dialog until it closes.
7. THE Launch_Project SHALL add a test for each fixed item that fails when the fix is removed.
8. THE Launch_Project SHALL NOT change a Phase 1 content parser, generator or audit result by these changes.

### Requirement 23: Tutorial lock and local server binding

**User Story:** As the Owner, I want the tutorial rule enforced on the server, so that a signed-in player cannot skip it.

#### Acceptance Criteria

1. WHEN a signed-in player starts a World and `player_flags.tutorial_done_at` is not set for that player, THE Game_App SHALL refuse the start with a fixed error and SHALL create no run.
2. WHEN a signed-in player starts a World and `player_flags.tutorial_done_at` is set, THE Game_App SHALL start the run as before.
3. THE Launch_Project SHALL record in the Decisions_File the decision for guests, with the reason (a guest's tutorial receipt is a client-held token, so the server rule is the receipt check where the token allows it, or the Hall check alone).
4. WHEN the Game_App refuses a start under criterion 1, THE Hall SHALL show the existing locked-door message and not a generic error.
5. THE Game_App local `scripts/serve-build.mjs` SHALL listen on `localhost` only, IF `scripts/smoke.mjs` still passes with that binding.
6. IF `scripts/smoke.mjs` fails with that binding, THEN THE Launch_Project SHALL keep the old binding and record the reason in the Decisions_File.

### Requirement 24: README

**User Story:** As a judge or reader of the repo, I want a complete README, so that I understand and can run the project.

#### Acceptance Criteria

1. THE README SHALL replace the TODO text and SHALL state what the project is.
2. THE README SHALL list the two production URLs.
3. THE README SHALL list the commands to run both apps locally and the test commands.
4. THE README SHALL describe in a short section how Kiro was used and SHALL link `docs/kiro-usage.md`.
5. THE README SHALL keep the existing disclosure paragraph unchanged in meaning.
6. THE README SHALL list third-party credits: fonts under OFL-1.1, "Made with Natural Earth." (public domain), and every other licence of code or data the project ships.
7. THE README SHALL state the MIT licence.
8. THE Launch_Project SHALL keep product names behind the existing Catalog keys (`app.title` in the atlas and the game title key in the game), so that a rename is a Catalog-only change.
9. THE Launch_Project SHALL NOT choose final product names; the Owner gives them before 2026-12-01.
10. THE test suite SHALL fail when a product name appears as a literal in app code outside the Catalog, the README or docs.

### Requirement 25: Kiro features and log

**User Story:** As the Owner, I want the Kiro features used in Phase 5 recorded, so that the submission write-up is accurate.

#### Acceptance Criteria

1. THE Launch_Project SHALL use the Neon_MCP for production database work where it can do the job, and SHALL record each call (tool name and statement, no Secret) in the Decisions_File.
2. THE Launch_Project SHALL check current Kiro documentation for powers relevant to Vercel or Neon, SHALL use one if it fits, and SHALL record the use or record that none fit.
3. THE Launch_Project SHALL add a Phase 5 entry to the Kiro_Usage_File listing each Kiro feature used and each skill used, with what each found.
4. WHEN a skill is unavailable, THE Launch_Project SHALL state that in the Kiro_Usage_File and continue.
5. THE Launch_Project SHALL use these skills: read-the-damn-docs, ponytail, agent-security, impeccable, agent-tester, agent-guard and verify-and-stop; agent-guard SHALL run after every group of tasks; agent-security SHALL run only after a group of tasks that touches deployment config, secrets, headers, the Rate_Limit, database roles, auth or the Tutorial_Lock; impeccable SHALL run in the Thread with no reviewer Sub_Agent.
6. THE Launch_Project SHALL NOT use agent-pilot, agent-superpowers, agent-gamestudio or any skill that starts Sub_Agents or its own workflow.
7. IF a skill instruction conflicts with this spec, the steering files or the Owner's prompt, THEN THE Launch_Project SHALL follow the spec, steering or prompt.

### Requirement 26: Automated tests

**User Story:** As the Owner, I want tests that fail when a rule is broken, so that the Phase 5 rules stay true.

#### Acceptance Criteria

1. WHEN `pnpm -r test` runs, THE existing Phase 1 to 4 tests SHALL pass with no database and no network.
2. THE Launch_Project SHALL add a test that every Anchor lands on the page that contains it in Book_View, for all twelve legends and the Keeper's Note.
3. THE Launch_Project SHALL add a test that the "Read as one page" toggle shows the same text in the same order as Book_View.
4. THE Launch_Project SHALL add a test that Reduced_Motion turns off page-turn animation, candlelight changes and fog movement.
5. THE Launch_Project SHALL add a test that non-scene images start loading only after the Scene_Image load.
6. THE Launch_Project SHALL add a test of the tutorial lock for signed-in players (refused without `tutorial_done_at`, allowed with it).
7. THE Launch_Project SHALL add a test of the Rate_Limit (calls within the limit pass; the call over the limit gets 429).
8. THE Launch_Project SHALL add a test that the security headers of Requirement 8 are present on built responses of both apps.
9. THE Launch_Project SHALL add a test of Manifest fields and of the Icon_Asset_Ids against the Needs_File.
10. THE Launch_Project SHALL add a test for the Hero_Image copy choice at 390 px and at a wide width.
11. THE Launch_Project SHALL add a test of the `ALTER ROLE` Password_Script that proves no password or connection string is written to standard output or standard error.
12. THE Launch_Project SHALL run each new test also against a deliberately broken rule by hand and SHALL record the mutation and the failing test name for each of the tests in criteria 2 to 9 in the Decisions_File.
13. THE property tests SHALL still run after any change that touches the generator, RNG or lead logic, and Phase 5 SHALL NOT make such a change except where Requirement 1.10 allows it.
14. WHEN a Phase 5 change touches `resolveTheme`, THE Launch_Project SHALL run the theme tests and the atlas and game tests that use it.

### Requirement 27: Production smoke check

**User Story:** As the Owner, I want the live site played end to end, so that I know production works before submission.

#### Acceptance Criteria

1. WHEN the Owner has pushed to `main` and Vercel has deployed, THE Launch_Project SHALL run the Production_Smoke on the Production_Site.
2. THE Production_Smoke SHALL, as a guest, load the Hall, finish the tutorial and win one Banshee run.
3. THE Production_Smoke SHALL, as a temporary test user created on the Production_Site with an email address on `example.com`, finish the tutorial before entering a World (Requirement 23 lock), then win one World other than Banshee and check that the stored score row equals the score of the run.
4. WHEN the Production_Smoke ends, THE Launch_Project SHALL delete the temporary test user and its rows by exact id, SHALL check 0 rows are left, and SHALL record the statements run through the Neon_MCP.
5. THE Production_Smoke SHALL open `/anchor/keepers-note--ch-1` and check that the page holds that Anchor once.
6. THE Production_Smoke SHALL check that network responses of an unfinished run contain none of: `correctIndex`, hotspot roles, the true version, the true lead, the Seed, an unearned Hint 2 Anchor, or the tutorial drawer answer.
7. THE Production_Smoke SHALL check the response headers of Requirements 4.6, 4.7 and 8.1.
8. THE Launch_Project SHALL record each command and result and SHALL NOT record a cookie, password or token.
9. IF a step of the Production_Smoke fails, THEN THE Launch_Project SHALL record the failure and its cause, and SHALL fix and rerun only the failed step where the fix is in scope.
10. THE Production_Smoke SHALL send up to 40 tutorial answers from one client within one Rate_Limit window and SHALL check that a 429 arrives within the first 40 answers. The limit is counted per server instance, so the burst can spread over instances. IF no 429 arrives, THEN the Production_Smoke SHALL record this as a finding with that reason, and the finding SHALL NOT block the task. The Production_Smoke SHALL then wait until the window has passed before the next step.

### Requirement 28: Production browser checks

**User Story:** As the Owner, I want the live site checked in a real browser at phone and desktop sizes, so that layout, input and motion are proven.

#### Acceptance Criteria

1. THE Launch_Project SHALL run headless Chrome on the Production_Site for each check in criteria 2 to 6.
2. THE check SHALL run keyboard-only play from the Hall to a broken curse with no mouse or touch events.
3. THE check SHALL run a 390 px touch pass over the Hall, the Tutorial_Room and one World: no horizontal page scroll, every hotspot at least 44 by 44 CSS px, drag pans.
4. THE check SHALL run a Reduced_Motion pass: no flash, no candlelight change, no fog movement, no page animation.
5. THE check SHALL run Book_View at a phone width (one page) and at a desktop width (two pages): page controls, arrow keys, swipe, page indicator, an Anchor landing, and the "Read as one page" toggle.
6. THE check SHALL run the Slow_4G_Profile timings of Requirement 14.
7. THE Launch_Project SHALL save results as text or JSON in `docs/phase-5-notes/` and any screenshot only in the Debug_Folder.
8. THE Launch_Project SHALL run the `test:browser` check of the Book_View once after the Book_View tasks and once in the final group, SHALL save each result in `docs/phase-5-notes/`, and SHALL treat a failure of that check like a failing test.

### Requirement 29: Handover

**User Story:** As the Owner, I want one handover file that lists what was built, how, and what I must do next, so that I can check and submit.

#### Acceptance Criteria

1. WHEN every task is done or blocked, THE Launch_Project SHALL write the Handover_File.
2. THE Handover_File SHALL contain these sections: production URLs; Vercel setup (projects, root directories, build settings, routing, headers, caching) and the content of every `vercel.json`; production database steps with exact statements and Neon_MCP calls; environment variable names per Vercel_Project; files and folders created; versions pinned and the reason for each; Book_View (how pages are built, anchors, toggle); the Mood_Layer (each effect and its Reduced_Motion behaviour); speed numbers before and after per screen; test results; Production_Smoke and browser results; security headers and the Rate_Limit; skills used and findings; content and assets still needed; actions the Owner must take before submission; and every new or changed Catalog key with its English text, so that the Owner can review the wording.
3. THE Handover_File SHALL state for each blocked task the reason and the next step.
4. THE Handover_File SHALL contain no Secret value.
5. THE Handover_File SHALL state which numbers were measured in Phase 5 and which are copied from earlier phases.
6. THE Launch_Project SHALL write all other Phase 5 notes only under `docs/phase-5-notes/`.
