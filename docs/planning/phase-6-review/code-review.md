# Phase 6 UI code review: atlas and game

Date: 2026-11-22. Read-only review. No source file was edited. All paths are under `kiroween-2026/` unless a full path is given.
Design intent read: `.kiro/steering/design.md` and `kiroween-2026-pack/planning/15-look-and-feel-brief.md`.

## Short answer

The look is weak because there is no UI kit. There is one set of colour tokens and nothing else: no button component, no link component, no card or panel component, no spacing scale, no type scale, no radius or shadow tokens. Each screen then styles things by hand, so the two apps drift apart. On top of that, the atlas turns on one global rule that underlines every link in gold, which is the "search results page" look.

## Findings, ranked

### P1 (these produce the owner's complaints directly)

**P1-1. Every atlas link is underlined, with a thicker underline on hover.**
- Where: `apps/atlas/src/styles.css:30-38` (`a { color: accent; text-decoration-line: underline; ... } a:hover { thickness 2px }`).
- Cause: a bare element selector in `@layer base` styles every `<a>` and TanStack `<Link>` the same. Nav links, the "Read the legend" action (`components/WorldMap.tsx:34`), the contents list (`LegendPage.tsx:86,95,100`), legend titles in the list (`LegendList.tsx:19`), the footer link (`routes/__root.tsx:81`), reference links (`LegendPage.tsx:175`) all look like blue-link web results. Some places fight it with `no-underline` (`__root.tsx:66`), which shows nobody owns the rule.
- Smallest fix location: replace the global `a` rule with a shared `.link` (inline text links, underline only here) and a shared `.btn` (actions). Put both in the skeleton (see P1-2), then give the atlas nav, card actions and contents list the right class. Keep one underline style for links inside prose only.

**P1-2. There is no button component. Seven ad-hoc button systems exist.**
- Game:
  - `.scene-button` in `apps/game/src/components/scene.css:110-135` (surface fill, accent border). Used by Hall, Tutorial, SceneNav, SceneViewer pan buttons (`Hall.tsx:125,150,252,256,260`, `TutorialRoom.tsx:146-235`, `SceneNav.tsx:44-64`, `SceneViewer.tsx:247,251`).
  - `.world-button` in `components/world.css:20-48` (bg fill, accent text, `line-through` when disabled at `:42-44`). Used across `WorldPlay.tsx` (lines 100, 178, 216-283, 322).
  - `buttonClass` and `secondaryButtonClass` as Tailwind strings in `components/Field.tsx:51-54`. Used by sign-in and sign-up only, and exported from a form-field file.
  - `navLink` Tailwind string in `routes/__root.tsx:38` (also used for the Sign out button, `:70-72`).
  - `.tutorial-code` input in `components/tutorial.css:8-16`.
  - Inline link styles: `Hall.tsx:137`, `routes/sign-in.tsx:44`, `routes/sign-up.tsx:62`, `routes/__root.tsx:30`.
- Atlas: map marker button `WorldMap.tsx:20`, Close button `WorldMap.tsx:37`, and the book controls `skeleton/src/book/book.css:151-165` (size and padding only; Tailwind preflight strips the browser button look, so the page arrows and the "Read as one page" toggle have no fill, border or pressed style). `aria-pressed` on the toggle (`Book.tsx:288`) has no visual state.
- Cause: each phase added its own class. `.scene-button` and `.world-button` are near twins with different fill and text colours, and neither has a primary/secondary/danger/ghost hierarchy. Only the sign-in forms have a primary and a secondary. Hover, active and pressed states are missing on `.scene-button` and `.world-button` (no `:hover` rule at all).
- Smallest fix location: add one `skeleton/src/design/ui.css` (imported next to `tokens.css`) with `.btn`, `.btn-primary`, `.btn-quiet`, `.btn-icon`, plus hover, active, disabled and focus. Then make `.scene-button`, `.world-button`, `buttonClass`, `.book-controls button` and the atlas map buttons use or extend it. Do not rename the classes without updating tests (see Risks).

**P1-3. Two maps on the atlas home page.**
- Map A (decorative, painted): `apps/atlas/src/routes/index.tsx:9,36` renders `SHARED_ATLAS_IMAGES.map` (`shared-atlas-map-01`, 4096x2048, defined `skeleton/src/atlas/view.ts:113`) as a strip, `h-20 sm:h-28 object-cover opacity-60`, `alt=""`. It is cropped to a thin band, so it reads as a banner, not a map.
- Map B (real, interactive): `components/WorldMap.tsx` draws the Natural Earth outline (`public/world-land.svg`, applied as a CSS mask in `styles.css:110-114`, class `.land`) with 44 px markers from `geo/placeMarkers.ts`. Below 960 px it scrolls sideways (`WorldMap.tsx:50`, `minInlineSize: BOX.width`).
- Why it is confusing: the strip sits directly above the real map under the same heading (`index.tsx:32-37`), looks like "the map" at first glance, and shows wrong coastlines. The design file (`.kiro/specs/atlas/design.md:230`) says it is a "decorative band above the honest map" on purpose, and Phase 3 (`docs/planning/12-kiro-phase-3.md:35`) forbids placing markers on it.
- Dead or duplicated: no dead map component. The painted map is the only duplicate. `apps/atlas/src/geo/countries.json` (157 KB) is used only server-side by `geo/continent.ts` to group the list, not shown. `.land` fill is `muted 45% mixed into surface` (`styles.css:112`), so the real map is a dim grey shape on a dark panel with little contrast.
- Smallest fix location: delete the strip in `routes/index.tsx:36` (and the `map` import at `:9`), or move the painted map behind `WorldMap` as the page background of the one map box. Choose one. Then restyle `.land`/`.map-card` in `styles.css:110-127` and the container at `WorldMap.tsx:49-50`. Also add a fit-to-width mode for phones instead of forcing 960 px.

**P1-4. References and book colours break because the paper only re-points four colour variables.**
- Where: `skeleton/src/book/book.css:41-46` re-points `--color-ink`, `--color-muted`, `--color-glow`, `--color-accent` to dark brown, but only inside `.book-paper`, and `Book.tsx:264` adds `book-paper` only when pages are on (`paged`). Everything else in the dark token set is left alone.
- Result in page mode (light paper):
  - `LegendPage.tsx:41` Version cards use `bg-surface` (dark `#1c1620` or the pack's dark surface) while their text is now dark brown `#2b1d12`. That is about 1:1 contrast, unreadable.
  - `LegendPage.tsx:125-126` table rules use `border-surface` (dark lines on paper), and `head` uses `border-muted` (now brown).
  - `LegendPage.tsx:169-185` the Sources list: `text-muted` (`:172`) and link colour both become brown on brown, so the link reads as body text, with only the underline left. The `h2` at `:166` has no colour class, but the other section headings use `text-glow`, so heading colours are inconsistent.
  - `.dramatization` tag (`styles.css:86-99`) and `.plate` frame (`styles.css:100-104`, `bg-surface`) keep dark fills on paper.
- Result in scroll mode (dark): the same sections are correct (gold link, light ink), so the owner sees a different colour scheme depending on the "Read as one page" toggle and whether the Sources sit on the last page.
- Why tests did not catch it: `skeleton/test/book-foundations.test.ts:38-52` only checks that the four variables are re-pointed, not `--color-surface`, `--color-bg` or any `bg-*`/`border-*` utility. `bookColors()` (`skeleton/src/book/bookColors.ts`) is exported but nothing in either app calls it, so a pack's own ink is never used on paper; only fixed brown applies.
- Smallest fix location: in `book.css:41-46` also re-point `--color-surface` (to a slightly darker paper tone) and `--color-bg`, and add `--color-rule` for borders. Then change `LegendPage.tsx` Version card, table and Sources classes to semantic roles (`bg-surface`, `border-rule`, `.link`) so they follow the context. Alternatively wrap Versions, Table and Sources in a dark `.panel` outside the book. Do not leave them half in one context.

**P1-5. Landing pages have no entry point.**
- Atlas home (`routes/index.tsx:20-47`): full-width hero image (`aspect-[16/7]`), `h1`, one paragraph, then the map, then a plain two-column list. No call to action, no featured legends, no "play the game" link to `/game`, no counts. The Home link in the nav (`__root.tsx:69`) and the title link (`:66`) go to the same place. No link to the game exists anywhere in the atlas shell.
- Game home (`apps/game/src/routes/index.tsx:48-61`): `h1` is `sr-only`, a muted greeting, the panoramic Hall scene, then an underlined link list (`Hall.tsx:130-143`). There is no visible title, no "start" or "continue" button, no explanation of what to do. The tutorial is reached only by tapping a hotspot (`Hall.tsx:79`).
- Smallest fix location: add a visible title block and one primary `.btn-primary` ("Start the tutorial" or "Enter the Hall"; "Open the atlas") in `apps/game/src/routes/index.tsx` and `Hall.tsx`; add a hero CTA and a game link in `apps/atlas/src/routes/index.tsx` and `__root.tsx:64-72`.

### P2 (weak layout and consistency)

**P2-1. No token set beyond colour and font family.**
- `skeleton/src/design/tokens.css:6-21` has colours and three font families only. No spacing, type size, radius, shadow, border, z-index or layout-width tokens.
- Radii in use: `rounded` (4px), `rounded-xl` (12px), `0.5rem` in `scene.css`/`world.css`/`Field.tsx`, `12px` in `.map-card` (`styles.css:120`), `2px` in `.dramatization` and `:focus-visible` (`styles.css:28`), `4px` at `:133`.
- Type sizes used by classes: `text-sm` 17, `text-xl` 16, `text-3xl` 12, `text-lg` 6, `text-4xl` 5, `text-2xl` 5, `text-5xl` 3, `text-xs` 2. Heading sizes differ for the same role: legend titles `text-4xl sm:text-5xl` (`LegendPage.tsx:67`), the game page titles `text-3xl` (`account.tsx:28`, `WorldPlay.tsx:78`), section headings `text-3xl` or `text-xl` or `text-2xl` with no rule. `.story p` hard-codes `1.0625rem` and `line-height: 1.7` (`styles.css:77-82`) outside any scale.
- Spacing: gaps come from `gap-1/2/3/4/5/6/10/14/16` mixed with raw `1rem`/`0.75rem`/`0.5rem` in the game's CSS files. Page rhythm is `gap-14` on the atlas home, `gap-16` on legend pages, `gap-4` on every game page. Each section re-adds `px-4`/`mx-auto`/`measure` instead of using one container (17 uses of `px-4` in the atlas).
- Smallest fix location: add `--space-*`, `--radius-*`, `--shadow-*`, `--text-*` to `tokens.css` `@theme` (Tailwind 4 then generates utilities). Add `.container`/`.stack` helpers in `ui.css`.

**P2-2. Components hard-code hex fallbacks next to the token (and one test does not cover it).**
- 30+ `var(--color-x, #hex)` fallbacks in `apps/game/src/components/scene.css`, `world.css`, `tutorial.css` (examples `scene.css:21,28,73,118-121`, `world.css:15-30`) and `skeleton/src/design/mood.css:32,92,93,133`. The fallbacks repeat the base palette, so changing the palette later needs a search-and-replace in 5 files. They are harmless today, since the token is always set. The test at `apps/game/test/theme.test.ts:20-26` forbids hex only in `theme.css`, so these slip through.
- `apps/game/src/components/scene.css:240-241` uses `#ff4fd8` for a dev outline (acceptable if kept dev-only).
- `skeleton/src/book/book.css:8-17` defines paper tints as hex (intended, but they are not tokens other components can use).
- `skeleton/src/design/mood.css:12` `--mood-ink: #0e0b10` duplicates `--color-bg`.
- Smallest fix: drop the fallbacks (tokens are always loaded) or generate them from one place; point `--mood-ink` at `var(--color-bg)`.

**P2-3. Panels and cards are redefined per app.**
- Game: `.hall-panel` (`scene.css:169-177`) and `.world-panel` (`world.css:10-19`) are the same card with slightly different declarations. Atlas: `.map-card` (`styles.css:115-124`), `.plate` (`:100-104`), the Version card (`LegendPage.tsx:41` `rounded-xl bg-surface p-5`), and `WorldMap.tsx:49` (`rounded-xl bg-surface`). Four atlas card looks and two game ones, none shared.
- Smallest fix: one `.panel` in `ui.css`; keep `.hall-panel`/`.world-panel`/`.mood-worn` as additive classes (tests match some of them).

**P2-4. Atlas shell and header are thin and lack hierarchy.**
- `routes/__root.tsx:64-73`: header with two links to the same route. `max-w-6xl` main, `text-sm font-ui` nav. No logo, no active state, no language switch, no game link.
- Footer (`:77-85`) is three `text-xs text-muted` lines with a link.
- Game shell `routes/__root.tsx:54-86` uses `max-w-3xl` while the Hall viewer wants width; the scene sits at 768 px on a desktop screen.
- Smallest fix: `apps/atlas/src/routes/__root.tsx` and `apps/game/src/routes/__root.tsx`; move the shared header/footer to a skeleton component only if both apps agree on content.

**P2-5. Heading and ink colours depend on markup, not on context.**
- Atlas headings use `text-glow` on some `h2`s and nothing on others (`LegendPage.tsx:17,67,80,112,131,166`; `KeepersNotePage.tsx:18`). Game headings are coloured by `.hub-theme h1,h2` (`apps/game/src/styles/theme.css:17-23`) but `h3` in panels (`Hall.tsx:175`, `TutorialRoom.tsx:166`) is not.
- Atlas has no equivalent of the game's `.hub-theme/.world-theme` base rules; it relies on `@layer base` (`styles.css:8-69`) plus utilities.
- Smallest fix: one rule for `h1..h3` colour and font in the shared base layer, applied by both apps.

**P2-6. The book surface mixes dark page chrome and light paper with different frames.**
- On a legend page the dark hero, dark contents list, light paper block and dark controls row stack with no transition. Controls (`book.css:139-176`) are an unstyled row under the paper; the "Read as one page" toggle is plain text.
- Fix location: `skeleton/src/book/book.css` (controls) and `LegendPage.tsx:193-211` (frame).

**P2-7. The map popover card is the only atlas action surface.**
- `WorldMap.tsx:26-41` uses a native popover; actions are a bare underlined link plus a ring-only Close button (`:37`). Replace both with `.btn-primary` and `.btn-quiet`.

### P3 (cleanup and polish)

- **P3-1. Duplicated CSS between apps.** Both apps import the same three skeleton sheets. Duplicates that belong in the skeleton:
  - `:focus-visible` outline in atlas (`styles.css:25-29`, 2px glow, offset 3px) vs game (`scene.css:24-30`, 3px, offset 2px) vs the book (`book.css:161-165`, `currentColor`) vs Tailwind classes `focus-visible:outline-2 ... outline-glow` repeated in `Field.tsx`, `Hall.tsx:137`, `__root.tsx:38`, `sign-in.tsx:44`.
  - `.measure`/`.story` reading column (atlas only) while the game's spirit panel text has its own sizing (`fear.css:111-122`).
  - Two `Img`-like paths: `apps/atlas/src/components/Img.tsx` and `apps/game/src/lib/media.ts` + inline `<img>`.
  - Two near-identical i18n catalogs layout (`apps/*/src/i18n/{en,ar,t,useT}.ts`). Out of scope for UI, but the same boilerplate.
  - Disabled-button rules repeated: `scene.css:125-129`, `world.css:36-44`, `book.css:157-160`, Tailwind `disabled:opacity-60` (`Field.tsx:52-54`). Opacity differs (0.5, 0.55, 0.45, 0.6).
- **P3-2. `text-decoration: underline` is used as a state marker** on the current scene tab (`scene.css:134`) and `line-through` on tried options (`world.css:42-44`). Both feed the "web results" feel; use a mark or border instead.
- **P3-3. Atlas `unicode-bidi: plaintext` applies to many block elements** (`styles.css:53-64`). Intentional (decision 22) and the reason is commented. Keep it, but it means any new element type (e.g. `button`, `label`) added to cards in RTL will not follow it unless listed.
- **P3-4. RTL and logical properties are mostly clean.** The tests `apps/atlas/test/logical-css.test.ts` and `apps/game/test/logical-css.test.ts` plus the Kiro hook enforce it, and a grep found no `ml-/mr-/pl-/pr-/left-/right-/text-left/right`. Intended exceptions: the map (`dir="ltr"`, `WorldMap.tsx:50`) and the scene viewport (`scene.css:20,93`, `direction: ltr`). Two small risks: the `.book-chevron` flip is done by `[dir='rtl']` (`book.css:170`), and the fog drift uses `--book-sign` (`mood.css:103`); if the Phase 6 fixer adds icons, flip them the same way.
- **P3-5. `<a class="scene-button">` and `<a class="world-button">`** (`Hall.tsx:260`, `WorldPlay.tsx:226,283`, `TutorialRoom.tsx:157`) are links dressed as buttons. This is right for "Read the legend" navigation, but the shared `.btn` must support both `a` and `button`.
- **P3-6. Contrast constants live in TypeScript and CSS twice** (`bookColors.ts:5-8` and `book.css:8,11,12`). A test compares them. Keep it that way when tuning paper colours.

## Map of UI files a fixer must touch

Shared (do these first, both apps depend on them):
- `skeleton/src/design/tokens.css` (add spacing, radius, type, shadow, rule tokens).
- New `skeleton/src/design/ui.css` (`.btn*`, `.link`, `.panel`, `.container`, focus ring), and an `@import` line in `apps/atlas/src/styles.css:1-4` and `apps/game/src/styles.css:1-5`.
- `skeleton/src/book/book.css` (`:41-46` re-point surface/rule; `:139-176` controls as `.btn`).
- `skeleton/src/book/Book.tsx` (`:278-291` controls markup, only if class names change; keep `book-controls`).
- `skeleton/src/design/mood.css` (hex fallbacks, `--mood-ink`).

Atlas:
- `apps/atlas/src/styles.css` (`:30-38` remove global `a`; `:86-135` dramatization, plate, land, map-card).
- `apps/atlas/src/routes/index.tsx` (landing, remove or merge the painted strip at `:36`).
- `apps/atlas/src/routes/__root.tsx` (`:61-86` shell, nav, footer).
- `apps/atlas/src/components/WorldMap.tsx` (marker, card actions, phone fit).
- `apps/atlas/src/components/LegendList.tsx`, `MetaList.tsx` (list rows, links).
- `apps/atlas/src/components/LegendPage.tsx` (`:41` Version card, `:60` contents link, `:125-126` table, `:163-188` Sources, `:193-211` frame).
- `apps/atlas/src/components/KeepersNotePage.tsx` (heading colours, same Book frame).
- `apps/atlas/src/components/NotFound.tsx` (check link style).

Game:
- `apps/game/src/components/scene.css` (`.scene-button`, `.hall-panel`, hex fallbacks).
- `apps/game/src/components/world.css` (`.world-button`, `.world-panel`).
- `apps/game/src/components/tutorial.css`, `fear.css` (spirit panel, motion toggle).
- `apps/game/src/components/Field.tsx` (`:51-54` button strings: move into `.btn`).
- `apps/game/src/styles/theme.css` (heading and link base; no hex allowed here, a test checks).
- `apps/game/src/routes/index.tsx`, `components/Hall.tsx` (`:130-143` legend list, `:137` link), `routes/__root.tsx` (`:38` navLink, `:54-86` shell), `routes/sign-in.tsx`, `routes/sign-up.tsx`, `routes/account.tsx`, `routes/tutorial.tsx`.
- `apps/game/src/components/WorldPlay.tsx`, `TutorialRoom.tsx`, `SceneNav.tsx`, `SceneViewer.tsx` (button class usage; hint buttons and hint-2 links).

## Risks: tests and checks that pin current styles

Likely to fail if touched without care:
- `skeleton/test/book-foundations.test.ts:32-52` reads `book.css` by regex: the `.book-paper { ... }` block must still re-point the four variables to `--book-*` ones that reach 4.5:1 on `PAPER_FLOOR`; the file may name only the shared paper image. Adding `--color-surface` there is safe, but the regex `(?:^|\n)\.book-paper\s*\{([^}]*)\}` needs a plain block with no nested braces.
- `skeleton/test/book-colors.property.test.ts` and `bookColors.ts` constants must equal `book.css:8,11,12` values (paper tint, ink, accent). Change both together.
- `apps/game/test/theme.test.ts:20-26`: `theme.css` must have no hex and must not redefine any `--color-*` or `--font-*`; `tokens.css` must contain each `BASE_PALETTE` value exactly as `--color-<key>: <value>;`. Adding new tokens in `tokens.css` is safe; changing a palette value breaks it.
- `apps/game/test/polish-8-3.test.ts:25-27`: `.spirit-panel-body.spirit-caption { color: var(--book-ink) }` must stay.
- `apps/game/test/book-paper.test.ts:12-17` and `fear-ui.test.ts:145,169`: exact class strings `spirit-panel-body spirit-caption book-paper`, `--book-paper-image: none` in `styles.css`, and the `book-paper` class on the tutorial question (a regex over `TutorialRoom.tsx`).
- Class-name pins in markup tests: `world-button world-option` (`apps/game/test/world.test.ts:190`), `scene-button` with `disabled` attribute order (`viewer.test.ts:85`), `scene-viewport mood-vignette-inset` (`viewer.test.ts:91`), `scene-image`, `scene-sprite`, `spirit-corner`, `book-controls` / `book-flow` / `book-frontispiece` (`apps/atlas/test/book-component.test.tsx:32-51`), `dramatization` span (`legend-render.test.tsx:33`), `mood-layer` (`mood.test.tsx:31,84`). Add new classes next to the old ones; do not rename or reorder them.
- `apps/atlas/test/mood.test.tsx`: candle step rate, `pointer-events: none` on overlays, `animation: none` under reduced motion, only `shared-atlas-paper-01` as `url()`, no `@import` in `mood.css`.
- `apps/atlas/test/logical-css.test.ts` and `apps/game/test/logical-css.test.ts` plus `.kiro/hooks/physical-css-check.json`: no physical direction in any `apps/*/src`, `skeleton/src/book`, `skeleton/src/design/mood.css`. A new `ui.css` is not in the scanned paths for the book/mood checks, but keep it logical anyway.
- `apps/atlas/test/book-integration.test.tsx:37`: the Fiction label must stay before `class="book"` in the Keeper's Note page.
- `apps/atlas/test/anchors-once.test.tsx`, `anchor.test.ts` and the browser script `apps/atlas/scripts/book-check.mjs`: any change to Chapter, Version or Sources markup must keep every anchor id once and keep `data-anchor-heading` with `tabIndex={-1}`.
- `apps/atlas/test/hero-markup.test.tsx`: the hero `picture`/`source` markup is pinned; do not touch `Img.tsx` hero branch.
- `apps/atlas/test/geo.test.ts:65` reads `public/world-land.svg`; do not edit the SVG.
- Contrast: `skeleton/src/theme/hub.ts` pairs and the legend theme contrast checks (`skeleton/src/theme/contrast.ts`, run by the game's theme test and the legend tests) pin the dark palette. Any new colour pair (e.g. a button hover, a link tone on paper) should be added to those checks so a fix does not break AA.

Not covered by any test (the fixer should check by eye or add a check): links vs body text contrast on paper, `bg-surface` blocks on paper, button hover/active states, phone width of `WorldMap`, and the Sources page in both book and scroll mode, in at least one dark pack and one light-ink pack.

## Smallest correct order of work

1. `tokens.css` and `ui.css` (buttons, links, panel, focus ring, container).
2. `book.css` re-point plus `LegendPage.tsx` Version, table and Sources classes (fixes the references colours).
3. Remove the global `a` rule and give atlas nav, contents, list and card actions the new classes.
4. Choose one map; fix `.land` contrast and phone fit.
5. Convert `.scene-button`/`.world-button`/`Field.tsx` strings onto `.btn`, keeping class names.
6. Add the two landing pages' title and call to action.
7. Then spacing and type scale clean-up, and removal of hex fallbacks.
