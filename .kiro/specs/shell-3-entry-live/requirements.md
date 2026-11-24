# Requirements Document

## Introduction

Shell phase 3 makes the entry page the home page. The page built in phase 2 at `/lab/shell` moves to `/` in the atlas app. The current atlas home moves to `/legends`, unchanged in content. The two hidden lab routes are deleted. Every link that meant "the atlas home" is re-pointed, the entry page gets two plain links under the cards, and both routes get their own head tags.

Two open points from phase 2 are closed first because they change `HoloCard`: the blurred Preview becomes a real `<img>` so it is requested with the layer images, and the cartouche word is either fully readable or hidden at small card sizes. A third phase 2 point (the frame fetched twice with the browser cache off) is accepted and only noted in the handover.

Boundaries: no change to game logic, the puzzle generator, the play engine, `content/`, `assets/` or the database. Editing the target of the game header's atlas link is allowed because it is a link. No multiplayer code, no new test files, no secrets in any file. `git.deploymentEnabled` in both `vercel.json` files stays as it is. Nothing is committed or pushed.

## Glossary

- **Atlas_App**: the app in `apps/atlas`, served at the domain root.
- **Game_App**: the app in `apps/game`, served under `/game/` and forwarded from the Atlas_App.
- **Entry_Page**: the page with the title "Trick or Told" and the Told and True cards, served at `/` after this phase.
- **Legends_Page**: the former atlas home (hero, map, legend list), served at `/legends` after this phase.
- **Legend_Page**: a page at `/legends/<legend-id>`.
- **Anchor_Route**: `/anchor/<anchor>`, which redirects to a chapter on a Legend_Page.
- **Told_Card**: the HoloCard that links to the Legends_Page.
- **True_Card**: the HoloCard that links to `/game/`.
- **HoloCard**: the card component exported from `@kiroween/skeleton/shell`.
- **Preview**: the 32 px blurred stand-in image a card shows under its layers while they load.
- **Cartouche_Word**: the engraved word ("Told" or "True") drawn by HoloCard over the frame's cartouche.
- **CDN_Base**: the image base URL from the app; empty when the image CDN is off.
- **Atlas_Header**: the site header of the Atlas_App (`SiteHeader`).
- **Game_Header**: the header of the Game_App (`GameHeader`), whose atlas link target is computed by `atlasHome()`.
- **Atlas_Error_Pages**: the atlas not-found view (`NotFound`) and the error views in `__root.tsx` and `router.tsx`.
- **Link_Row**: the row of two plain links under the cards on the Entry_Page.
- **Catalog**: the atlas i18n file `apps/atlas/src/i18n/en.ts`.
- **Route_Rules**: the Vercel route rules in `skeleton/src/deploy/vercelRules.ts` and the `vercel.json` files.
- **Verify_Script**: the throwaway Playwright script in `.debug/shell-3/`.
- **Target_Size**: 44 px, the minimum height and width of every interactive element.

## Requirements

### Requirement 1: Preview is a real image

**User Story:** As a visitor on a slow link, I want each card to show its blurred art almost at once, so that I never see a flat empty box.

#### Acceptance Criteria

1. WHERE the CDN_Base is set, THE HoloCard SHALL render the Preview as an `img` element that is the first child of `.holo-art`, with `src` set to the 32 px copy of the card's background layer, `fetchpriority="high"`, `decoding="async"`, `alt=""` and `aria-hidden="true"`.
2. WHERE the CDN_Base is set, THE HoloCard SHALL place the Preview `img` before the layer `img` elements in the server HTML, so the browser requests it with or before them.
3. WHERE the CDN_Base is empty, THE HoloCard SHALL render the Preview as a palette gradient with the same blur as the image Preview.
4. WHILE a card has not drawn its first WebGL frame, THE HoloCard SHALL show the Preview under the layers.
5. WHEN the page loads on a 1.2 Mbps link with the CDN_Base set, THE Entry_Page SHALL show the blurred Preview of each card within 500 ms, measured on the screenshot series of the Verify_Script.
6. THE HoloCard SHALL keep the Preview's blur, its cover fit and its hiding under `data-renderer="webgl"` as they are in phase 2.

### Requirement 2: Cartouche word is readable or hidden

**User Story:** As a visitor on a short phone screen, I want the word on the card to be either readable or absent, so that I never see a clipped word.

#### Acceptance Criteria

1. WHILE the card's inline size is at or above the minimum readable size, THE HoloCard SHALL show the Cartouche_Word with its full text inside the cartouche box, without clipping.
2. WHILE the card's inline size is below the minimum readable size, THE HoloCard SHALL hide the Cartouche_Word.
3. THE HoloCard SHALL decide between showing and hiding the Cartouche_Word with a container query on the card, not with a viewport query.
4. WHEN the Cartouche_Word is hidden, THE HoloCard SHALL keep the accessible name of the front button unchanged.
5. WHEN the Verify_Script measures the Cartouche_Word at 667x375, 390x844 and 1280x800, THE Cartouche_Word SHALL either have `scrollWidth` not greater than `clientWidth` or be `display: none`.

### Requirement 3: The entry page is the home page

**User Story:** As a visitor, I want the domain root to show the two cards, so that the first thing I see is the choice between reading and playing.

#### Acceptance Criteria

1. THE Atlas_App SHALL serve the Entry_Page at `/`.
2. THE Entry_Page SHALL render the same heading, tagline, two cards, entrance and hint behaviour as the phase 2 page at `/lab/shell`.
3. THE Entry_Page SHALL render no site header and no site footer.
4. THE Entry_Page SHALL omit the `robots` meta tag, so search engines may index it.
5. WHEN a visitor opens `/lab/shell` or `/lab/card`, THE Atlas_App SHALL answer with the atlas 404 page, because both routes are deleted.
6. THE Atlas_App SHALL keep the web manifest `start_url` at `/` and `scope` at `/`.

### Requirement 4: The legends page keeps the old home

**User Story:** As a reader, I want the full legend list at its own address, so that I can browse every legend.

#### Acceptance Criteria

1. THE Atlas_App SHALL serve the Legends_Page at `/legends`, from a new index route beside `legends.$legendId.tsx`.
2. THE Legends_Page SHALL show the same content as the former atlas home: hero, map, legend list and the section with id `legends`.
3. THE Legends_Page SHALL keep the hero image preload and the loader of the former atlas home.
4. WHEN a visitor opens `/legends/<legend-id>` for a known legend, THE Atlas_App SHALL serve the Legend_Page as before.
5. WHEN a visitor opens `/anchor/<anchor>`, THE Atlas_App SHALL redirect as before to `/legends/<legend-id>#<anchor>`.

### Requirement 5: Card targets

**User Story:** As a visitor, I want each card to lead where its name says, so that Told reads and True plays.

#### Acceptance Criteria

1. THE Told_Card SHALL link to `/legends`.
2. THE True_Card SHALL link to `/game/`.

### Requirement 6: Atlas header links

**User Story:** As a reader on the atlas, I want the header to take me to the entry page and to the legend list, so that the two places are different.

#### Acceptance Criteria

1. THE Atlas_Header SHALL link the brand "Trick or Told" to `/`.
2. THE Atlas_Header SHALL link "All legends" to `/legends` with no hash.
3. THE Atlas_Header SHALL keep the "Play" link to `/game/`.
4. WHILE the visitor is on the Legends_Page, THE Atlas_Header SHALL mark "All legends" as the current page.
5. THE Atlas_Header SHALL keep every link at the Target_Size and the header on one row at 360 px width.

### Requirement 7: Not-found and error pages

**User Story:** As a visitor who reaches a missing page or an error, I want a way home and a way to the legends, so that I am never stuck.

#### Acceptance Criteria

1. THE Atlas_Error_Pages SHALL link "home" to `/`.
2. WHERE the view has room for a second link, THE Atlas_Error_Pages SHALL add an "All legends" link to `/legends`.
3. THE Atlas_Error_Pages SHALL take the visible text of both links from the Catalog.
4. THE Atlas_Error_Pages SHALL give each link the Target_Size.

### Requirement 8: Game header atlas link

**User Story:** As a player, I want the game header's atlas link to open the legend list, so that I can look up an answer.

#### Acceptance Criteria

1. THE Game_Header SHALL link its atlas link to `<atlas origin>/legends`.
2. WHERE `ATLAS_ORIGIN` is empty, THE Game_Header SHALL link to `/legends`.
3. WHEN `ATLAS_ORIGIN` ends with a slash, THE `atlasHome()` function SHALL return a link with exactly one slash before `legends`.

### Requirement 9: No link left that meant the atlas home

**User Story:** As the owner, I want every old link to the atlas home found and re-pointed, so that nothing lands on the entry page by accident.

#### Acceptance Criteria

1. WHEN the Verify_Script runs `rg` over `apps`, `skeleton` and `README.md` for `#legends` hash links and for `lab` routes, THE repository SHALL show no `/#legends` link, no `/lab/` route, no `lab.shell` file and no `lab.card` file.
2. THE "Play this legend" link on a Legend_Page SHALL keep its target `/game/world/<legend-id>`.
3. THE Hint 2 links built by the Game_App SHALL keep opening `/anchor/<anchor>` on the atlas origin.
4. WHEN a visitor follows a Hint 2 link, THE Atlas_App SHALL open the chapter anchor on the Legend_Page.
5. WHEN the Verify_Script follows every internal link on `/`, `/legends` and one Legend_Page, THE Atlas_App SHALL answer each with status 200.

### Requirement 10: Link row on the entry page

**User Story:** As a keyboard or screen-reader visitor, I want plain links on the entry page, so that I can move on without turning cards.

#### Acceptance Criteria

1. THE Entry_Page SHALL render a Link_Row below the hint, inside a `nav` landmark with an accessible name from the Catalog.
2. THE Link_Row SHALL contain exactly two links in this order: "All legends" to `/legends` and "Play" to `/game/`.
3. THE Link_Row SHALL give each link the Target_Size.
4. THE Link_Row SHALL keep the "Play" link's accessible name "Play Trick or True", which contains the visible text "Play".
5. WHEN the hint is hidden after the first interaction, THE Entry_Page SHALL keep the Link_Row.
6. WHILE the cards are side by side, THE Entry_Page SHALL reserve the Link_Row's height in the card height budget, so that the page has no vertical scroll at 667x375, 1024x768 and 1280x800.
7. THE Link_Row SHALL use design tokens, logical CSS properties and a visible focus ring.

### Requirement 11: Head tags

**User Story:** As a person who shares the link, I want the right title and description on `/` and `/legends`, so that previews read well.

#### Acceptance Criteria

1. THE Entry_Page SHALL set the title to "Trick or Told".
2. THE Entry_Page SHALL set the description to "Read twelve scary legends from around the world, then play the investigation game."
3. THE Entry_Page SHALL set the canonical link to `/`, absolute with `PUBLIC_ORIGIN` when it is set.
4. THE Entry_Page SHALL set `og:title` and `og:description` to the same text as the title and description.
5. WHERE `PUBLIC_ORIGIN` is set, THE Entry_Page SHALL set `og:url` to the origin plus `/`.
6. THE Legends_Page SHALL set the title to "All legends · Trick or Told", from a Catalog key with the app name as a variable.
7. THE Legends_Page SHALL set its own description, from a Catalog key, with matching `og:title` and `og:description`.
8. THE Legends_Page SHALL set the canonical link to `/legends`, absolute with `PUBLIC_ORIGIN` when it is set.
9. WHERE `PUBLIC_ORIGIN` is set, THE Legends_Page SHALL set `og:url` to the origin plus `/legends`.
10. THE Atlas_App SHALL keep the root `og:title` and `og:description` as the fallback for the other pages.

### Requirement 12: Deploy rules

**User Story:** As the owner, I want the Vercel rules to match the new routes, so that `/game` forwarding keeps working.

#### Acceptance Criteria

1. WHEN the Verify_Script runs `rg` over the Route_Rules for `/` and `/lab`, THE Route_Rules SHALL contain no rule that names `/lab` and no rule that depends on `/` being the atlas home.
2. THE Route_Rules SHALL keep the `/game` and `/game/**` proxy rules as they are.
3. THE Route_Rules SHALL keep `git.deploymentEnabled` in both `vercel.json` files unchanged.
4. IF a Route_Rules entry names `/` or `/lab` as a page, THEN THE Route_Rules SHALL be updated to the new routes and the change SHALL be listed in the handover.

### Requirement 13: Back navigation

**User Story:** As a reader, I want back and the header to work from a legend page, so that I never loop through the entry page.

#### Acceptance Criteria

1. WHEN a visitor opens a Legend_Page from the Legends_Page and presses the browser back button, THE Atlas_App SHALL show the Legends_Page.
2. WHEN a visitor opens a Legend_Page from a shared link, THE Atlas_App SHALL serve it directly, without a client redirect or any step through the Entry_Page.
3. WHEN a visitor follows the Atlas_Header brand from a Legend_Page, THE Atlas_App SHALL show the Entry_Page, and the browser back button SHALL return to the Legend_Page.
4. WHEN a visitor follows "All legends" in the Atlas_Header from a Legend_Page, THE Atlas_App SHALL show the Legends_Page.
5. WHEN a visitor returns to `/` by client navigation, THE Entry_Page SHALL not replay the entrance.

### Requirement 14: Existing pins and scope limits

**User Story:** As the owner, I want old checks kept truthful and no new test files, so that the change stays small.

#### Acceptance Criteria

1. IF an existing test or check script pins `/` as the atlas home or the old header links, THEN THE change SHALL update that pin to the new target and list it in the handover.
2. THE change SHALL add no new test file.
3. THE change SHALL leave game logic, the puzzle generator, the RNG, the play engine, `content/`, `assets/` and the database unchanged.
4. THE change SHALL write no secret, token or connection string into any file.
5. THE change SHALL use logical CSS properties, design tokens and the Target_Size, and SHALL turn off the entrance animation under reduced motion.

### Requirement 15: Verification and handover

**User Story:** As the owner, I want one verification run and a short handover, so that I can judge the phase quickly.

#### Acceptance Criteria

1. WHEN the Verify task runs, THE Verify task SHALL run `pnpm -r typecheck`, `pnpm -r test` and the atlas book browser check with `--base http://localhost:3001 --out .debug/shell-3/book-check.json` once each.
2. THE Verify_Script SHALL capture screenshots at 390x844, 667x375 and 1280x800 of `/`, `/legends`, one Legend_Page, the game hall and the atlas 404 page.
3. THE Verify_Script SHALL click through `/` to Told, to `/legends`, to a legend, to "Play this legend", to the game world or its sign-in, to the Game_Header atlas link, and back to `/legends`, and SHALL click through `/` to True and `/game/`.
4. THE Verify_Script SHALL capture the first 3 s of `/` every 500 ms at 390x844 on a 1.2 Mbps link.
5. THE handover `docs/shell-3-handover.md` SHALL list what changed, files touched, the link map (old target and new target), check results, test pins updated, and anything weak, including the frame fetched twice with the cache off, accepted.
6. THE change SHALL add a short entry to `docs/kiro-usage.md`.
