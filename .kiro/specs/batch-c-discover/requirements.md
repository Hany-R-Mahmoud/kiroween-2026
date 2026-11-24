# Requirements Document

## Introduction

Batch C has two parts. Part 1 applies five fixes the owner asked for after using the live site (phases 2 and 3, production 5f649c8): the image cards come back on `/legends`, the card back turns on a click anywhere that is not the link, the link row under the entry cards goes, and the entry tagline stops saying "read first". Part 2 makes the site discoverable: a favicon, a share image with social tags, `robots.txt`, a sitemap, canonical links and `noindex` on private and 404 pages.

Checked on production today: `/favicon.ico`, `/robots.txt`, `/sitemap.xml` and `/game/favicon.ico` answer 404, and neither `/` nor `/game/` carries an `og:image` or `twitter:*` tag.

Boundaries: no change to game logic, the puzzle generator, the RNG, the play engine, `content/`, `assets/` or the database. Editing the game app's head and meta tags and adding `noindex` to its sign-in, sign-up, account and 404 pages is allowed because it is not game logic. Nothing is written into `assets/`. `git.deploymentEnabled` in both `vercel.json` files stays as it is. No multiplayer code, no secret in any file, no new test files, nothing committed or pushed.

## Glossary

- **Atlas_App**: the app in `apps/atlas`, served at the domain root.
- **Game_App**: the app in `apps/game`, served under `/game/` and forwarded from the Atlas_App.
- **Entry_Page**: the page at `/` with the Told card and the True card.
- **Legends_Page**: the page at `/legends` with the hero, the map and the legend list.
- **Legend_List**: the section "Every legend, by continent" on the Legends_Page.
- **Legend_Card**: one legend in the Legend_List: card image, region line, name, reading time and scare level.
- **Legend_Page**: a page at `/legends/<legend-id>`.
- **Game_Hall**: the game's hall page at `/game/`.
- **HoloCard**: the card component exported from `@kiroween/skeleton/shell`.
- **Back_Face**: the back side of a HoloCard, with its title, line and link.
- **Card_Link**: the link on a Back_Face ("Read the legends" or "Play the game").
- **Drag_Threshold**: `DRAG_THRESHOLD_PX` from `skeleton/src/shell/holo/geometry.ts`, the pointer travel after which a press counts as a drag.
- **Catalog**: the atlas i18n file `apps/atlas/src/i18n/en.ts`; the game has its own at `apps/game/src/i18n/en.ts`.
- **PUBLIC_ORIGIN**: the environment variable holding the site's public https origin, read by the Atlas_App server.
- **Share_Image**: the 1200x630 JPEG at `apps/atlas/public/og/trick-or-told-1200x630.jpg`.
- **Share_Tags**: `og:image`, `og:image:width`, `og:image:height`, `og:image:alt`, `og:type`, `og:site_name`, `twitter:card`, `twitter:title`, `twitter:description` and `twitter:image`.
- **Favicon_Set**: `/favicon.ico` (16, 32 and 48 px) and one 32 px PNG, both made from `apps/atlas/public/icons/icon-512.png`.
- **Sitemap**: the document at `/sitemap.xml`.
- **Robots_File**: the document at `/robots.txt`.
- **Route_Rules**: `skeleton/src/deploy/vercelRules.ts` and the two `vercel.json` files.
- **Verify_Script**: the throwaway Playwright script in `.debug/batch-c/`.
- **Target_Size**: 44 px, the minimum height and width of every interactive element.

## Requirements

### Requirement 1: Image cards on the Legends_Page

**User Story:** As a visitor, I want every legend shown as an image card under the map, so that I can browse the atlas by picture and not from a narrow text list.

#### Acceptance Criteria

1. THE Legend_List SHALL show each Legend_Card with its card image, region line, name, reading time and scare level at every viewport width.
2. THE Legend_List SHALL lay the Legend_Cards out in a grid of 1 column below 40rem, 2 columns from 40rem and 3 columns from 64rem.
3. THE Legends_Page SHALL show the Legend_List below the map at every viewport width.
4. THE Legend_List SHALL scroll with the page and SHALL NOT sit inside a box with its own scrollbar.
5. THE Legend_Card SHALL keep its grid tracks as `minmax(0, 1fr)` so that a region line longer than its card ends with an ellipsis and does not overflow.
6. THE Legend_Card SHALL take its image from `cardImage()` with the existing ImageKit `srcset` and `sizes`, and SHALL load it lazily.
7. THE Atlas_App SHALL contain no `.home-list-scroll` rule and no rule that hides `.legend-card-img` or the hook line.
8. THE Legends_Page SHALL keep the map as it is today, with the whole map visible in its column from 48rem.
9. THE Legend_List SHALL give each Legend_Card link a Target_Size hit area.

### Requirement 2: Turn a card back by clicking its Back_Face

**User Story:** As a visitor, I want to click anywhere on the back of a card to turn it over, so that I do not have to find a "Turn back" button.

#### Acceptance Criteria

1. WHEN a visitor clicks or taps the Back_Face outside the Card_Link and the pointer has not passed the Drag_Threshold, THE HoloCard SHALL turn to the front.
2. WHEN a visitor clicks or taps the Card_Link, THE HoloCard SHALL follow the link and SHALL stay on the Back_Face.
3. WHEN a visitor drags on the Back_Face past the Drag_Threshold, THE HoloCard SHALL turn by the drag and SHALL NOT treat the release as a click.
4. WHEN a visitor presses Escape while the Back_Face is shown, THE HoloCard SHALL turn to the front.
5. WHILE the Back_Face is shown, THE HoloCard SHALL put only the Card_Link in the tab order.
6. THE HoloCard SHALL NOT render a "Turn back" button, and `HoloCardStrings` SHALL NOT have a `turnBack` field.
7. THE Catalog SHALL NOT contain the key `shell.card.turnBack`, and no caller SHALL pass a `turnBack` string.
8. THE Catalog SHALL set `shell.entry.hint.pointer` to "Drag or click a card to turn it." and `shell.entry.hint.touch` to "Drag or tap a card to turn it."

### Requirement 3: Entry page without a link row

**User Story:** As a visitor, I want the entry page to hold only the two cards, so that the cards are the one way in.

#### Acceptance Criteria

1. THE Entry_Page SHALL NOT render the "All legends" and "Play" link row.
2. THE Atlas_App SHALL contain no `.shell-links` or `.shell-link` rule and no `--shell-links` height term in the card size calculation.
3. THE Catalog SHALL NOT contain the key `shell.entry.links`.
4. WHEN a visitor tabs through the Entry_Page, THE Entry_Page SHALL give focus in this order: the skip link, the Told card, the True card.
5. THE Entry_Page SHALL keep both cards and the hint inside the first screen at 390x844, 667x375, 1024x768 and 1280x800, as it does today.

### Requirement 4: Entry page wording

**User Story:** As a visitor, I want the entry page to say I can read or play, so that I do not think I must read before I can play.

#### Acceptance Criteria

1. THE Catalog SHALL set `shell.entry.tagline` to "Twelve legends from around the world. Read them, or play them."
2. THE Catalog SHALL set `shell.entry.description` to "Twelve scary legends from around the world. Read them in the atlas, or play them in the investigation game."
3. THE Entry_Page SHALL use `shell.entry.description` for its `description`, `og:description` and `twitter:description`.
4. THE Catalog SHALL keep the card back lines `shell.card.told.line` and `shell.card.true.line` unchanged.

### Requirement 5: Favicon

**User Story:** As a visitor with several tabs open, I want the site to show an icon in the tab, so that I can find it.

#### Acceptance Criteria

1. THE Atlas_App SHALL serve `/favicon.ico` with status 200 and an icon content type, holding images of 16, 32 and 48 px.
2. THE Atlas_App SHALL serve one 32 px PNG of the same icon.
3. THE Favicon_Set SHALL be made from `apps/atlas/public/icons/icon-512.png` and SHALL use no new artwork.
4. THE Atlas_App head SHALL carry `<link rel="icon">` tags for the ICO and the PNG.
5. THE Game_App head SHALL carry `<link rel="icon">` tags that point at the Atlas_App root files.
6. WHEN a browser requests `/game/favicon.ico`, THE Game_App MAY answer 404, because the Game_App head points at the root files.

### Requirement 6: Share image

**User Story:** As someone sharing a link, I want a picture to appear in the preview, so that the link looks like the site.

#### Acceptance Criteria

1. THE Share_Image SHALL be a JPEG of 1200x630 pixels and under 200 KB.
2. THE Share_Image SHALL show the Told and True card fronts side by side on the site's dark background (`#0E0B10`), each built from its `assets/shell/` background, subject and frame layers, with "Trick or Told" in the display font above them.
3. THE Share_Image SHALL use only existing art and SHALL NOT add or change any file under `assets/`.
4. THE Atlas_App SHALL keep the generating script in `apps/atlas/scripts/` and SHALL write the image to `apps/atlas/public/og/trick-or-told-1200x630.jpg`.
5. THE Atlas_App SHALL serve the Share_Image at `/og/trick-or-told-1200x630.jpg` with status 200 and the content type `image/jpeg`.

### Requirement 7: Share tags

**User Story:** As someone sharing any page of the site, I want the preview to carry the page's own title and description with the shared picture, so that the link reads correctly.

#### Acceptance Criteria

1. WHERE PUBLIC_ORIGIN is set, THE Entry_Page, Legends_Page, each Legend_Page and the Game_Hall SHALL carry every one of the Share_Tags.
2. THE `og:image` and `twitter:image` values SHALL be the absolute URL of the Share_Image built from PUBLIC_ORIGIN.
3. THE `og:image:width` SHALL be 1200, `og:image:height` SHALL be 630, `og:type` SHALL be `website`, `og:site_name` SHALL be "Trick or Told" and `twitter:card` SHALL be `summary_large_image`.
4. THE `og:image:alt` SHALL come from a Catalog key.
5. THE `twitter:title` and `twitter:description` SHALL equal the page's own `og:title` and `og:description`.
6. THE Legend_Page SHALL use the Share_Image as its `og:image` in place of the legend hero.
7. IF PUBLIC_ORIGIN is not set, THEN THE page SHALL leave out `og:image`, `og:image:width`, `og:image:height`, `og:image:alt` and `twitter:image` and SHALL NOT write a relative image URL.
8. THE Game_Hall SHALL take its origin from the same domain value the Game_App already reads for atlas links (`ATLAS_ORIGIN`), and SHALL leave out the absolute image tags when that value is empty.
9. THE Atlas_App and the Game_App SHALL build the Share_Tags with one shared function in the skeleton.

### Requirement 8: Robots file

**User Story:** As a search engine, I want a robots file, so that I know what I may crawl and where the sitemap is.

#### Acceptance Criteria

1. WHEN a client requests `/robots.txt`, THE Atlas_App SHALL answer 200 with the content type `text/plain`.
2. THE Robots_File SHALL allow all agents (`User-agent: *`, `Allow: /`) and SHALL contain no `Disallow` line; the `noindex` meta tag alone keeps `/game/sign-in`, `/game/sign-up` and `/game/account` out of search.
3. WHERE PUBLIC_ORIGIN is set, THE Robots_File SHALL end with a `Sitemap:` line holding the absolute Sitemap URL.
4. IF PUBLIC_ORIGIN is not set, THEN THE Robots_File SHALL leave out the `Sitemap:` line.

### Requirement 9: Sitemap

**User Story:** As a search engine, I want a sitemap of the public pages, so that I find every legend.

#### Acceptance Criteria

1. WHEN a client requests `/sitemap.xml` and PUBLIC_ORIGIN is set, THE Atlas_App SHALL answer 200 with the content type `application/xml` and 15 `<url>` entries: `/`, `/legends`, the 12 `/legends/<id>` pages and `/game/`.
2. THE Sitemap SHALL write each location as an absolute URL built from PUBLIC_ORIGIN.
3. THE Sitemap SHALL NOT list any `/anchor/` URL or any sign-in, sign-up or account URL.
4. THE Sitemap SHALL get its 12 legend ids from the content files in `content/legends/` at build time, and THE Atlas_App SHALL NOT read the database to answer the request.
5. IF PUBLIC_ORIGIN is not set, THEN THE Atlas_App SHALL answer `/sitemap.xml` with status 404.
6. THE Sitemap SHALL be well-formed XML whose `<loc>` values, read in order, equal the list the builder was given.
7. WHEN a legend id contains a character that XML escapes, THE Sitemap SHALL write it escaped.

### Requirement 10: Canonical and noindex

**User Story:** As a search engine, I want one canonical address per page and no index entries for private pages, so that results stay clean.

#### Acceptance Criteria

1. THE Game_Hall SHALL carry a canonical link to `<origin>/game/`, and each Legend_Page SHALL carry a canonical link to `<origin>/legends/<id>`.
2. IF PUBLIC_ORIGIN is not set, THEN THE Legend_Page canonical SHALL be the root-relative path, as the Legends_Page canonical is today.
3. THE Game_App sign-in, sign-up and account pages SHALL each carry `<meta name="robots" content="noindex">`.
4. THE Atlas_App 404 page and the Game_App 404 page SHALL each carry `<meta name="robots" content="noindex">`.
5. THE Entry_Page, Legends_Page, Legend_Pages and Game_Hall SHALL NOT carry a `robots` meta tag.

### Requirement 11: Routing of the new root files

**User Story:** As the site owner, I want the new root files served by the atlas, so that they do not reach the game project.

#### Acceptance Criteria

1. THE Route_Rules SHALL forward only `/game` and `/game/**` to the Game_App, so that `/favicon.ico`, `/robots.txt`, `/sitemap.xml` and `/og/**` are served by the Atlas_App without a new rule.
2. THE Route_Rules SHALL keep `git.deploymentEnabled` in both `vercel.json` files unchanged.
3. IF a new root file would need a Route_Rules change, THEN THE change SHALL be written in `skeleton/src/deploy/vercelRules.ts` and not in a `vercel.json` rewrite.

### Requirement 12: Existing pins

**User Story:** As the owner, I want the existing checks to match the new behaviour, so that they do not fail for old reasons.

#### Acceptance Criteria

1. THE change SHALL update every existing test or check script that pins the "Turn back" button, the link row, the old tagline, the old description, the old hint lines, the legend `og:image` hero URL or the list-row layout.
2. THE change SHALL add no new test file.
3. THE handover SHALL list each updated pin.

### Requirement 13: Verification and handover

**User Story:** As the owner, I want one verification run and a short handover, so that I can see what changed and what is weak.

#### Acceptance Criteria

1. THE Verify task SHALL load `.env` into the shell only and SHALL NOT print or write any value.
2. THE Verify task SHALL run `pnpm -r typecheck`, `pnpm -r test` and the atlas book browser check against the local build once.
3. THE Verify_Script SHALL take screenshots at 390x844, 768x1024 and 1280x800 of `/`, `/legends` (full page) and the Back_Face of each card.
4. THE Verify_Script SHALL check: click the front turns to the back; click an empty area of the back turns to the front; click the Card_Link navigates and does not flip; a drag on the back turns by drag; Escape on the back turns to the front.
5. THE Verify_Script SHALL check that the tab order on `/` is the skip link, Told, True, and that no link row is in the DOM.
6. THE Verify_Script SHALL check that `/favicon.ico`, `/robots.txt`, `/sitemap.xml` and the Share_Image answer 200 with the right content type, and that the Sitemap holds 15 URLs.
7. THE Verify_Script SHALL check the Share_Tags on `/`, `/legends`, one Legend_Page and `/game/`, and `noindex` on sign-in, sign-up, account and both 404 pages.
8. THE Verify_Script SHALL check that every internal link on `/legends` answers 200.
9. THE handover `docs/batch-c-handover.md` SHALL list what changed, files touched, check results, the updated pins, anything weak, and SHALL show the Share_Image.
10. THE `docs/kiro-usage.md` file SHALL get a short entry for this batch.
