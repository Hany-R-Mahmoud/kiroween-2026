# Phase 6 handover: UI rework

Spec: `.kiro/specs/ui-rework/` (requirements, design, tasks). All tasks are done and none is blocked. This file was written in task 10.4 and updated in task 10.F10 with Owner feedback F5 to F9 (F9 was done as task 10.F11; the task numbering is kept as is although the spec validator flags it). The agent stopped with the tree ready to push. Nothing was committed or pushed by the agent. Phase 6 source is in commit `0a7a36c` (parent `5fcb86b`). Records: `docs/phase-6-notes/` (`progress.md`, `decisions.md`, `browser-checks.md`, `mutations.md`, `final-gates.md`, `verification.md`, `screenshots-index.md`, `content-and-assets-needed.md`, `owner-feedback.md`, `mid-phase-status.md`). Screenshots are paths only, under `.debug/phase-6/` (git-ignored).

Scope held: UI only. No change under `content/` or `assets/`; no parser, generator, auth, access, score, rate-limit, token or schema change; no new dependency, font or image; the three `vercel.json` files and `pnpm-lock.yaml` are unchanged. `skeleton/src/deploy/vercelRules.ts` is unchanged except the one owner-approved CSP `img-src` line from F9 (section 6). Approved exceptions: read-only widening of the `listLegends` assets SELECT in `skeleton/src/db/atlasRead.ts` (optional `hero` on `AtlasSummary`), one `exports` entry `./design/ui.css` in `skeleton/package.json`, and a 5-line `res.destroyed` guard in the local-only `apps/atlas/scripts/pipe-response.mjs`.

## 1. What changed per screen

**Atlas home** (`HomeView.tsx`, `SiteHeader.tsx`, `LegendList.tsx`, `WorldMap.tsx`)
- Hero is one framed block: h1, intro, primary "Start with {legend}" (recommended legend, Banshee by default) and a secondary link to `/game/`. The copy sits on a scrim (`color-mix` of `--color-bg` at 90%) so text reads over the book pages.
- The painted map strip is gone. There is one map: the real `WorldMap`, with a visible swipe line, first render centred on the recommended pin, 12 pins at 44 px, pin card with `btn-primary` and `btn-ghost`.
- Legend cards (`li.legend-card.panel`): hero phone copy (marker fallback), lazy and sized, one stretched title link, auto-fill grid per continent.
- Header: logo, "All legends" (`/#legends`), "Play Trick or True" (`/game/`, secondary plate from 40rem). One row at 390 after tighter spacing.

**Legend page** (`LegendPage.tsx`, `Book.tsx`, `book.css`)
- Paper context re-pointed (see 3): Version card is a `.panel`, table rules use `.rule-b`, Sources links carry `↗` and a screen-reader "opens an external site".
- Hero capped (`.legend-hero`: 16/9, max 46dvh or 28rem, gradient placeholder) so the h1 is on the first screen.
- Book toggle reads "Read as a book" / "Read as one page" with `aria-pressed`. Book page height `clamp(30rem, 100dvh - header - 9rem, 52rem)`: 600 px at 1280x800 (was 576), Banshee 21 pages (was 22). Page-turn layer clipped (`contain: paint`, `clip-path`).
- Anchors: scroll margin header + 1rem on `[id]` and `[data-anchor-heading]`; in Book_View the viewport scrolls into view after paging.
- Sources links: `.source-link` (min 24 px box, 28 px measured), 8 px gap. Contents: one column, `.contents-link` rows of 44 px with a logical start-edge marker.

**Game header** (`GameHeader.tsx`): logo, "The atlas" link, and a native popover menu (Hall, Account, Sign in/out) below 40rem; inline from 40rem. Text routes use `.page-narrow`.

**Game Hall** (`Hall.tsx`, `lib/hall.ts`): visible h1 and premise; one primary "Start in the study" (secondary "Visit the study again" after the tutorial); a locked door opens a reason panel instead of navigating; legend links are ghost chips. Departure from original 17.2 recorded in `decisions.md` (4.2).

**Tutorial and world scenes** (`TutorialRoom.tsx`, `WorldPlay.tsx`, `scene.css`): one `.scene-screen` grid (top bar, stage, dock). Top bar: ghost Hall button, h1, tabs (own row, wrapping, from 40rem; one scrolling row with a fade below). Tutorial shows the goal sentence. Dock: fear meter with visible text, reply row, hints, always-mounted pending row. The tap-result panel is removed; the reply row prints `replyLine` (never empty). Hotspots glint (9.4 px dot, rim, halo; static under reduced motion). Stage centred when narrower than the viewer. `.hall-panel` is a fixed overlay sheet.

**Hint area** (`HintArea.tsx`): one Hint 1 and one Hint 2 for the active open puzzle, each named by puzzle. Hint 1 text opens in a sheet over the scene. Hint 2 opens a blank tab synchronously, navigates it only after a charged reply, closes it on any failure, and shows "Your browser blocked the new tab" plus a chapter link when the tab cannot open (`lib/hintTab.ts`).

**Fear meter** (`FearMeter.tsx`, `fear.css`): "Fear: n of 100" text beside the bar, agreeing with `aria-valuenow` and the fill. The fear caption now sits over the scene (absolute in the stage, `pointer-events: none`), not over the notebook. The reduced-motion control is a `role="switch"`.

## 2. The UI layer and how to use it

Files: `skeleton/src/design/ui.css` (import `@kiroween/skeleton/design/ui.css`, after `mood.css`, before `book.css`; both `styles.css` files start with the layer order line), tokens in `skeleton/src/design/tokens.css`.

Layer order (first line of each app's `styles.css`): `@layer theme, base, components, ui, utilities;`. `ui.css` sits after legacy `components` and before Tailwind `utilities`. The focus ring is in `base`. The `--motion` block is unlayered so its `!important` wins.

| Class | Use |
|---|---|
| `.btn` plus `.btn-primary`, `.btn-secondary`, `.btn-ghost` | Buttons on `<button>` or `<a>`. One primary per view. Min target 44 px (`--target`). `.btn-icon` for icon-only square buttons; `.icon-dir` on an arrow flips it in RTL. `aria-pressed` and `aria-current='true'` give the selected look. Add the class beside any old class; utilities still win. |
| `.link` | Running-text links only: underlined, `--color-link` (glow on dark, accent on paper). Not for nav, cards or lists. |
| `.nav-item` | Header, footer and list navigation: no underline, bottom bar on hover, 2 px marker on `aria-current='page'`. |
| `.panel`, `.panel-raised` | Surface with a border (`--color-muted` edge) and radius; raised uses `--color-surface-raised`. |
| `.field` | Form inputs (`Field.tsx`). |
| Focus ring | One global `:focus-visible`: 3 px solid `--color-ring` (falls back to `--color-glow`), offset 3 px. Do not add another outline rule; a test fails on a second one. Book viewport and hotspots use a `box-shadow` ring instead (clip and picture cases). |
| `--motion` | 1 or 0. 0 under `prefers-reduced-motion` and `html[data-motion='reduce']`. Every duration in `ui.css` is `calc(var(--motion) * Nms)`; animation is killed by `!important` rules. |

Tokens (all in `tokens.css`; no hex outside token files, no hex fallbacks):
- Colour: base palette unchanged, plus `--color-surface-raised` `#261e2b`, `--color-rule` `#3a3040` (decorative lines only), `--color-ember` `#a8431f`, `--color-danger-ink`.
- Space (8 px grid): `--space-1..8` = 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4 rem.
- Type: `--type-kicker` 0.75rem, `--type-ui` 0.9375rem, `--type-small` 0.875rem, `--type-body` 1.0625rem, `--type-lead` and `--type-h3` 1.25rem, `--type-h2` clamp(1.5rem, 1.5vw + 1rem, 2rem), `--type-h1` clamp(2rem, 3vw + 1rem, 3rem), `--type-display` clamp(2.6rem, 6vw + 1rem, 4.5rem). `scale-tokens.test.ts` fails on a raw `gap` or `font-size` that equals a step.
- Others: `--radius-ui` 4px, `--app-header-h` 3.5rem.
- Paper re-points (`book.css`): `:root` gets `--book-card` `#f6ecd2` and `--book-ember` `#a8431f`; `.book-paper` points `--color-bg` at `--book-paper-tint` (`#f0e2bc`), `--color-surface` and `--color-surface-raised` at `--book-card`, `--color-rule` at ink, `--color-link` at accent, `--color-ring` at ink, `--color-danger-ink` at ember. Pinned values unchanged: ink `#2b1d12`, accent `#4a1c12` (`bookColors.ts` now also exports `BOOK_CARD`, `BOOK_TINT`, `BOOK_EMBER`). Ember may only be defined or re-pointed to `--color-danger-ink`.
- Map land: `color-mix(in oklab, var(--color-muted) 66%, var(--color-bg))`.

Rules to keep: logical properties only; strings from the catalog (new keys are in `en.ts` only; `ar` falls back per key); theme packs and base token values untouched.

## 3. Contrast pairs and measured ratios

Source: matrix in `skeleton/test/helpers/uiContrast.ts`, read from the real CSS by `ui-contrast.property.test.ts` (values below are the ratios it measures today), plus browser scans. Text needs 4.5:1 (3:1 for large text, 24 px or 18.66 px bold), non-text needs 3:1.

**Dark context (matrix)**

| Pair | Min | Measured |
|---|---|---|
| D1 body text on page | 4.5 | 15.06 |
| D2 card text | 4.5 | 13.65 |
| D3 hover card text | 4.5 | 12.41 |
| D4 meta text on page | 4.5 | 6.39 |
| D5 meta text on card | 4.5 | 5.79 |
| D6 meta text on raised card | 4.5 | 5.27 |
| D7 link in text (glow) | 4.5 | 13.73 |
| D8 link in card text | 4.5 | 12.45 |
| D9 primary label | 4.5 | 9.19 |
| D10 primary label on hover | 4.5 | 13.73 |
| D11 secondary label | 4.5 | 13.73 |
| D12 secondary border | 3 | 9.19 |
| D13 card border and selected fill | 3 | 8.33 |
| D14 panel border | 3 | 5.79 |
| D15a/b/c focus ring on page / card / raised card | 3 | 13.73 / 12.45 / 11.32 |
| D16 error text on card | 4.5 | 5.47 |
| D18 map land against map card | 3 | 3.13 |
| D19 pin dot on land | 3 | 4.39 |
| D20a/b/c secondary label hover / pressed, selected label on selected fill | 4.5 | 11.06 / 8.80 / 9.21 |
| D21a/b/c motion switch: off border and thumb, on track, on thumb | 3 | 6.39 / 9.19 / 9.19 |
| D22 fear meter text (ink on page, 15 px, weight 400) | 4.5 | 15.06 |

**Paper context (matrix)**

| Pair | Min | Measured |
|---|---|---|
| P1 body text on paper floor | 4.5 | 5.47 |
| P2 body text on paper tint | 4.5 | 12.67 |
| P3 / P3b card text on card / raised card | 4.5 | 13.87 / 13.87 |
| P4 link on floor | 4.5 | 4.80 |
| P5 link in card | 4.5 | 12.17 |
| P6 / P6b muted label on card / floor | 4.5 | 13.87 / 5.47 |
| P7 / P7b primary label, hover | 4.5 | 11.13 / 11.13 |
| P8 selected option label | 4.5 | 12.67 |
| P8b / P8c secondary label on tint / card | 4.5 | 11.13 / 12.17 |
| P9a/b/c rule on card, rule on tint, panel border on card | 3 | 13.87 / 12.67 / 13.87 |
| P10a/b/c focus ring on floor / card / tint | 3 | 5.47 / 13.87 / 12.67 |
| P11 / P12 error and "Tried" label on card / tint | 4.5 | 5.12 / 4.68 |
| P13 tried-option mark on card | 3 | 12.17 |

The design numbers D18 (3.37) and D19 (4.08) were estimates; the test's oklab mix gives 3.13 and 4.39, both pass. The matrix also checks all 12 theme packs and 300 generated palettes (ink, accent, glow on bg and surface, ring at 3, primary label at 4.5).

**Browser scans** (`apps/atlas/scripts/ui-check.mjs`, `apps/game/scripts/ui-check.mjs`, `.debug/phase-6/*`; local and production gave equal numbers)
- Legend page, Book_View (paper): lowest text 5.84 (Banshee), 6.05 (Naddaha), AA 4.5. Scroll_View (dark surface): 4.73 (Banshee), 4.82 (Naddaha).
- Game answer options on paper, Banshee, 15 px / weight 600 (4.5 needed): text, border and ring 12.67:1.
- Atlas home hero copy over the picture, brightest pixel under each line, before the scrim: 1.01 to 1.11 at 390 and 2.57 (intro) to 4.06 (h1) at 1280 (fail). After: h1 11.55 (390) and 12.81 (1280); intro 12.39 and 13.53.
- Focus rings (3 px, offset 3 px; `keys-atlas.json`, `keys-game.json`): atlas home 12.45; legend dark 8.01 (lowest); legend paper 12.67; Hall 11.32 (7.46 sampled over the picture); tutorial 11.32 (12.74 sampled); Banshee 8.01. Before the fixes: book page area 1.1:1 and hotspots over pale painting 1.44 to 2.53:1.
- Hotspot glint at its brightest step, core against its adjacent rim (1280 crops): darkest 13.48, middle 3.80, brightest 7.97 (all at least 3). Before F2, core against the painting ring: 4.02, 1.79, 1.63.
- Fear text: matrix pair D22 (added in F8), `.fear-meter-text` ink on page, 15 px, weight 400 (normal text), 15.06:1 against 4.5:1. Passes, no token change. Not scanned in a browser.

## 4. P1 and P2 items: status and evidence

Counts from `verification.md` (task 10.3): P1 criteria 73 met, 6 partly, 0 not met (79); P2 criteria 59 met, 1 partly, 1 not verifiable (61). Nothing was fixed in that check. After F8 (task 10.F8; rows below and "Re-status after F5 to F9" in `verification.md`): P1 75 met, 4 partly (12.6, 13.3, 17.9, 19.3); P2 61 met, 0 partly, 0 not verifiable. Evidence names: BC = `browser-checks.md`, DEC = `decisions.md`, MUT = `mutations.md`.

| Item | Req | Status | Evidence / gap |
|---|---|---|---|
| 1 UI layer | 10 | 9 met (10.3 closed by F8) | `ui-layer.test.ts`, `ui-import.test.ts`, ring tests, keys-check. F8: `--target` 2.75rem and `.btn` `min-block-size` pinned in `ui-layer.test.ts`; mutation to 2rem caught |
| 2 Link rule | 11 | 6 met (11.5 closed by F8) | `link-rule.test.ts`, `header.test.tsx`, `contents.test.tsx`. F8: the 2 px accent bar on `.nav-item[aria-current='page']` is pinned in `ui-layer.test.ts`; mutation to 1px caught. 11.6 (no `:visited` rule) is read from source, not tested |
| 3 Paper colours | 12 | 7 met, **12.6 partly** | `book-foundations`, matrix, BC 2.5; MUT 3. Gap: `.plate` and `.dramatization` follow tokens by construction; no test or screenshot on paper |
| 4 Answer options | 13 | 4 met, **13.3 partly** | `world.test.ts`, BC 2.5 (12.67). Gap: no "Tried" option was on screen in any browser run; its contrast is from the matrix (P11, P12, P13) only |
| 5 Contrast test | 14 | 6 met | `ui-contrast.property.test.ts`, MUT 3, 4, 5 |
| 6 Atlas home | 15 | 12 met | `home.test.tsx`, `hero-markup.test.tsx`, BC 3.7. Timing: see section 8 |
| 7 Map on phones | 16 | 7 met | `world-map.test.tsx`, `geo.test.ts`, BC 3.7 and 8.4 |
| 8 Hall | 17 | 9 met, **17.9 partly** | `hall.test.ts`, `hall.property.test.tsx`, BC 4.8. Gap: signed-in Hall not run in a browser |
| 9 Scene layout | 18 | 9 met | BC 4.8, 8.F1, 8.F3 (scene, pan buttons, fear meter and hints end at 773 or above at 1280x800; tutorial top 197 and Banshee 169 at 390); `header.test.tsx`, `header-check.mjs` 10/10 |
| 10 Hotspot affordance | 19 | 6 met, **19.3 partly** | `scene-glint.test.tsx`, `hotspot-glint-rule.test.ts`, `reply-line.property.test.ts`, `hotspot.property.test.tsx`. Gap: the 300 ms bound on the reply is not measured anywhere (the reply is never empty) |
| 11 Book controls | 20 | 6 met | `book-component.test.tsx` (7 cases), MUT 11, 20 |
| 12 Book height | 21 | 5 met | `book-height.test.ts`; 600 px, 21 pages (BC 6.15) |
| 13 Cross links | 22 | 4 met | header tests in both apps, BC 6.15, BC 9.2 |
| 14 All legends | 23 | 4 met | `header.test.tsx`, `home.test.tsx` |
| 15 Legend hero | 24 | 4 met | `legend-hero.test.tsx`; h1 453 to 501 at 1280, 304 to 344 at 390 |
| 16 Fear meter | 25 | 5 met (25.5 closed by F8) | `fear-text.property.test.tsx` (Property 9), `fear-ui.test.ts`. F8: matrix pair D22 (`.fear-meter-text` ink on page, 15 px, weight 400 = normal text) measures 15.06:1 against 4.5:1; a CSS binding case pins ink, size and weight. No token change |
| 17 One hint area | 26 | 7 met | `hint-area.test.tsx`, `hint-area.property.test.tsx` (Property 7), MUT 26; page height unchanged while the sheet opens |
| 18 Hint 2 and pop-up blockers | 27 | 8 met (27.4 closed by F8) | `hint2-tab.test.tsx` (12), `hint-tab.property.test.ts` (Property 6), MUT 27. F8: a case in `hint-area.test.tsx` pins the fallback link's `target`, `rel="noopener"` and the `.scene-button` 44 px minimum; two mutations caught. Caveat: BC 6.15 used a `window.open` stand-in, not Chrome's real blocker; a signed-in world Hint 2 was not run |
| 19 No layout shift | 28 | 4 met | `pending-row.test.ts`; 0 px measured (BC 6.15, 8.F3) |
| 20 Anchor landing | 29 | 6 met | `anchor-margin.test.ts`, MUT 29, `book-check.mjs --legends banshee` 50 pass |
| 21 Source links | 30 | 4 met | `sources-tap.test.tsx`, MUT 30; 28 px, 19 links |
| 22 Contents list | 31 | 4 met | `contents.test.tsx`; 9 rows at 44 px |

Cross-cutting (Req 1 to 9, 33 to 42): 16 met, 2 partly, 1 not met at the time of the check. Partly: **Req 36** (item 4 and 5 "before" shots have no open puzzle and cannot be re-taken; signed-in screens never checked; RTL text not checked because the Arabic catalog is empty) and **Req 39** (usage log said verify-and-stop was pending; updated in this task). Not met: **Req 40** (this handover; written now). Req 37 production gaps: the 1280 dead end was not reached on production (skip).

Known and accepted: at 390 the tutorial drawer panel covers the hint buttons while open (closable by Escape or the Close button; DEC 6.16).

## 5. P3 items (Requirement 32)

| Task | Item | Status |
|---|---|---|
| 7.1 | Book page-turn layer clipped | Done: `contain: paint` and `clip-path: inset(0)`, `book-clip.test.ts`. Mid-turn screenshot not taken |
| 7.2 | Exact-match rem literals moved onto `--space-*` and `--type-*` | Done: `scale-tokens.test.ts`. Off-scale values left (0.4rem, 0.8125rem, 1.25rem, 1.5rem, 1.1em, px sizes); padding and margin are converted but not scanned |
| 7.3 | Hex fallbacks removed from game scene, world, tutorial and skeleton mood CSS | Done: `no-hex-fallbacks.test.ts`. `--mood-ink` is `var(--color-bg)` on `:root` |
| 7.4 | Banshee panorama brightness seam | Left for the owner (asset). Request written in `content-and-assets-needed.md`; seam not re-measured |
| 7.5 | Motion toggle as a switch | Done: `input[role=switch]`, `motion-switch.test.tsx` (7). Browser look and RTL screenshot not run (the 8.4 motion and RTL passes later covered the switch for reduced motion) |

## 6. Owner feedback F1 to F4

All four done, none open (`owner-feedback.md`).
- **F1 scene tabs cut off at 1280**: from 40rem tabs on their own wrapping row, no scroll; below 40rem one row, scrollbar hidden, end fade (flipped in RTL). 1280: tabs 113 to 169, dock bottom 773. 390: dock bottom 817 of 844, tutorial top 197, Banshee 169. No test pinned the old markup. Fade not checked in RTL.
- **F2 hotspot glints invisible**: 9.4 px core with dark rim and halo, peak opacity 1, static 0.9 under reduced motion. Core against rim 13.48, 3.80, 7.97. Crops `.debug/phase-6/f2-glint-{before,after}-{1,2,3}-*.png`. New `hotspot-glint-rule.test.ts`.
- **F3 empty gaps in the dock**: compact dock (fear, reply, hints on one row at 1280; wrap at 390), stage centred with auto margins. 0 px shift after a tap in four cases. `pending-row.test.ts` made stricter. Not checked: RTL, signed-in.
- **F4 fear caption over the notebook**: overlay moved into the stage, caption at the scene top, `pointer-events: none`; 4 cases added to `fear-ui.test.ts`. Real high-fear caption: 6 pass at both widths. A caption held with the notebook scrolled into view could not be produced; the notebook starts at 1285 (390) and 1185 (1280), below the scene.

## 6b. Owner feedback F5 to F9

All five done, none open (`owner-feedback.md`). F9 is recorded as done in task 10.F11 (the feedback file text said 10.F9, which was the re-run task; the numbering note is in `decisions.md`).

**F5 atlas home hero stacks below 40rem** (task 10.F5). One `@media (max-width: 39.999rem)` block in `apps/atlas/src/styles.css`: image first at 16/9 and fully visible, copy below on the page background, no scrim. Markup, image source and `srcset` unchanged; 1280 unchanged (scrim kept, h1 12.81, intro 13.53 over the image). Measured, headless Chrome, local build: image ratio 1.778 and fully visible at 360, 375 and 390; copy background transparent, no scrim; no sideways scroll. h1 and the primary action are inside the first screen: 360x800 h1 332 to 372, primary 536 to 580; 375x812 340 to 380 and 544 to 588; 390x844 304 to 344 and 480 to 524. Contrast on the page background: h1 13.73, intro 15.06. One new case in `home.test.tsx`, mutation-checked.

**F6 atlas header on one row** (task 10.F6). The Play link shows "Play" below 40rem (new key `nav.playShort`) and "Play Trick or True" from 40rem; `aria-label` keeps the full name, so the visible text is inside the accessible name. No CSS change. New `apps/atlas/scripts/header-check.mjs` at 360, 375, 390 and 1280: header 61 px at all four (was 105 at 360 and 375), one row, links 44 px, no sideways scroll, Tab order logo, legends, game, 24 checks pass in the later re-runs (26 in the first run). Two new cases in `header.test.tsx`; removing the `aria-label` fails two header tests.

**F7 Hint 1 hotspot marks** (task 10.F7). Client state only: `WorldPlay.tsx` keeps the `highlight` of each `hint1` reply per slot (`hint1Highlights`, beside `hint1Texts`) and marks through the new pure `hint1Marks(view, replied)` in `lib/world.ts` until the slot is solved; only ids the server returned are used. No change to engine, view, token or play rules. The tutorial had no gap. Tests: three cases in `world.test.ts`; mutations: keeping marks after solve and dropping the highlight storage are each caught. Known limit: like the Hint 1 text, stored ids are not cleared on a fear restart. **Browser confirmation is BLOCKED by content:** no Banshee Hint 1 row names a hotspot id, so the server returns an empty highlight and nothing can be marked on Banshee Puzzle 1. Flying Dutchman is the only legend with ids and needs sign-in. Owner action in section 11.

**F8 test gaps** (task 10.F8). Pins added, each with a mutation that was caught and restored: fear text pair D22 (25.5), `.btn` 44 px (10.3), 2 px current-item marker (11.5), Hint 2 fallback link 44 px and `rel="noopener"` (27.4). Detail in `mutations.md` and the re-status block in `verification.md`.

**F9 images through the ImageKit CDN** (task 10.F11).
- Built: skeleton `assets/imageCdn.ts` (`imageUrl`, `responsiveImage`, `parseImageBase`) and `assets/imageBaseContext.ts`; `imageBase()` in each app's `server/env.ts`, passed in the root loader data and provided through `ImageBaseContext`. Atlas hero, legend hero, plates and legend cards use width copies (400 to 2400); game scene panoramas use height copies (`h-600/900/1200`) with `sizes` from the CSS scene height; spirit figures use `w-200/w-400`. Preloads use the same `href`, `imagesrcset` and `imagesizes` as the `img`. `og:image`, markers, textures, sprites and `width`/`height` are unchanged. No image file added or changed, no API key, no AVIF, no new dependency.
- `IMAGE_CDN_URL` is read server-side only and is a public URL, not a secret. Unset or empty gives today's URLs byte for byte. `.env.example` gained the name `IMAGE_CDN_URL=` with no value.
- The single approved CSP change, `skeleton/src/deploy/vercelRules.ts` (one line, `CSP` constant; the test for both apps was updated):

```
img-src 'self' data: https://ik.imagekit.io;
```

(before: `img-src 'self' data:;`). Nothing else in that file changed; the `vercel.json` files are unchanged.
- Disclosure: one line each in `README.md` and `docs/kiro-usage.md`: images are delivered through ImageKit (free plan) from our own originals.

Image bytes in the first view, local, CDN off to on (KB, requests; 390 px at DPR 2, 1280 px at DPR 1; `browser-checks.md` "Task 10.F11"):

| Screen | 390 off | 390 on | 1280 off | 1280 on |
|---|---|---|---|---|
| Atlas home | 1630 (26) | 1242 (26) | 1630 (26) | 727 (26) |
| Banshee legend page | 138 (2) | 115 (2) | 544 (3) | 235 (3) |
| Banshee legend page, all images loaded | 1656 (9) | 590 (9) | 1854 (9) | 646 (9) |
| Hall | 310 (1) | 159 (1) | 310 (1) | 97 (1) |
| Tutorial | 336 (2) | 191 (2) | 336 (2) | 131 (2) |
| Banshee scene 1 screen | 1182 (9) | 830 (9) | 1182 (9) | 746 (9) |

Banshee scene 1 file: 431134 B (off), 231262 B at 390/DPR 2 (`h-900`), 144958 B at 1280/DPR 1 (`h-600`). The 250 KB target is met at both. 0 broken images, 0 failed requests, 0 images downloaded twice, every `ik.imagekit.io` URL has `tr=`.

Local Slow 4G (1.6 Mbps down, 750 kbps up, 150 ms RTT, CPU 4x, cache off, 390 px, median of 3; game metric is scene paint, atlas home is LCP). **Loaded-machine caveat:** load average was about 9 and the CDN copies were already warm, so absolute values are higher than in sections 8 (3.7, 9.3) and only the off/on difference is meaningful.

| Page | median off (ms) | median on (ms) | change |
|---|---|---|---|
| Hall (paint) | 7679 | 5246 | -31.7% |
| Tutorial (paint) | 5307 | 3238 | -39.0% |
| Banshee scene 1 (paint) | 7131 | 4677 | -34.4% |
| Atlas home (LCP) | 5620 | 2388 | -57.5% |

The 3.0 s scene-paint budget is **still missed by the Hall and Banshee scene 1** (tutorial 3238 and atlas home 2388 are near or under it). What remains is JavaScript, fonts and the first connection to a second origin, not image size. **Production has not been measured with the CDN**: that needs the push (section 11).

**Fallback if the CDN is down or over its free quota:**
1. Open the Vercel dashboard, the atlas project, Settings, Environment Variables.
2. Delete `IMAGE_CDN_URL` (or set it empty) for Production.
3. Do the same in the game project.
4. Redeploy each project (Deployments, latest, Redeploy). Environment changes apply only to new deployments.
5. Open the atlas home and the Banshee world and check that image URLs start with `/media/` again.

Nothing else changes: with the variable unset the pages use the files under `/media/`, as before. The CSP entry for `https://ik.imagekit.io` can stay.

**Re-run with F9 in place** (task 10.F12, local builds, CDN off and on, `browser-checks.md`): atlas screens 36 pass, 0 fail in both modes (360, 390, 1280); game screens 38 pass, 0 fail, 1 skip off and 37 pass, 0 fail, 2 skip on (seed-dependent dead-end skips, none failing); atlas header 24/0 and game header 10/0 in both modes; ui-check 8/0 per app in both modes; atlas keyboard pass 141/0 at 360, 390, 1280 in both modes. CDN on, 18 page loads (6 pages x 3 widths): 0 broken images, 0 CSP violation events. Local servers send no production CSP and an injected one did not take effect, so CSP enforcement was not shown by a browser; the string covers every image host seen (`'self'`, `ik.imagekit.io`; `data:` for inline images). One Neon timeout exited the local atlas server once; it was restarted and the image and CSP pass ran on the restarted server.

## 6c. Owner feedback F10 (Hint 1 text hides the Highlight ids, task 10.F13)

- `makeHint` in `skeleton/src/parser/world.ts` (the only parser change, owner-approved) still reads the ids from the trailing `Highlight …` sentence and now removes that sentence from `hint1.text`. Ids written elsewhere in a hint keep today's behaviour. Flying Dutchman pz-1 is now "The logbook and the letters are different kinds of writing." with highlight h-07, h-03.
- Tests added in `skeleton/test/parser.test.ts` (Flying Dutchman pz-1; no Hint 1 text in any legend contains `Highlight` or an `h-`/`hs-` id). The unknown-id error test still passes. Mutation (strip removed): 2 tests fail; restored, `cmp` identical (`mutations.md`).
- Dev database: host checked by name only (`ep-little-boat-arrb1poz`, the `dev-skeleton-core` endpoint); `db:import` run once on dev. Read-only check: `hint1_highlights` non-empty for 53 of 60 slots (Banshee 4 of 5; the 7 empty ones are the rows with no object), and 0 slots have `Highlight` or an id in `hint1_text`.
- Browser (local servers, dev DB): Banshee Puzzle 1, Hint 1 shows "The dresser plate has a word on its rim; look again." and marks `hs-dresser`, at 390 and 1280. Shots: `.debug/phase-6/f13-banshee-hint1-390.png`, `-1280.png` (check script `f13-check.mjs`). Note: a Hint 1 click made right after a puzzle opens was ignored once; the check waits and retries.
- Checkpoint 9.5 re-run: skeleton 915 passed + 8 expected fail, atlas 302, game 399; typecheck, builds and secret scan clean. Under heavy machine load (load average about 50) 1 atlas and 6 skeleton tests timed out; they passed when re-run alone.
- **Owner action:** after the push, run the production `db:import` (production `.env` values, not the dev ones). Until then production still shows "Highlight …" in Hint 1 on every legend.

## 7. Tests

Final run (task 10.F12, checkpoint 9.5 with F9 in place): `pnpm test` per package, `tsc --noEmit` clean in all three, both production builds pass, secret scan clean.

| Package | Phase 5 | Phase 6 end | New files (Phase 6) |
|---|---|---|---|
| skeleton | 796 passed + 8 expected fail (60 files) | 913 passed + 8 expected fail (921, 69 files); 887 + 8 at task 9.5 | `ui-layer`, `ui-contrast.property`, `paper-constants.property`, `book-height`, `book-clip`, `focus-rules`, `no-hex-fallbacks`, `scale-tokens`, helper `uiContrast` |
| atlas | 228 (18 files) | 302 (29 files); 284 at task 9.5 | `ui-import`, `link-rule`, `home`, `header`, `world-map`, `legend-hero`, `anchor-margin`, `sources-tap`, `contents`, `motion-transition`, helper `renderInRouter` |
| game | 293 (26 files) | 399 (42 files); 385 at task 9.5 | `ui-import`, `header`, `hall.property`, `scene-glint`, `reply-line.property`, `hotspot.property`, `hotspot-glint-rule`, `fear-text.property`, `hint-area`, `hint-area.property`, `hint2-tab`, `hint-tab.property`, `pending-row`, `motion-switch`, `motion-transition`; F9: `image-cdn` |

F5 to F9 added: skeleton `image-cdn.test.ts` (new) plus cases in `ui-contrast.property`, `ui-layer` and `vercel-config`; atlas `image-cdn.test.tsx` (new) plus cases in `home` and `header`; game `image-cdn.test.tsx` (new) plus cases in `world`, `hint-area`.

Existing files with changed or added cases: `hall.test.ts` 19 to 22, `world.test.ts` 24 to 27 (6.7), `fear-ui.test.ts`, `book-component.test.tsx` 4 to 7, `book-foundations.test.ts`, `atlas-read.test.ts`, `home.test.tsx`; `viewer.test.ts` and `world.test.ts` class regexes loosened (same cases). Properties 1 to 9 of the design are covered (1, 2 contrast; 3 paper constants; 4 Hall; 5 reply line; 6 Hint 2 tab; 7 hint area; 8 hotspot markup; 9 fear text). Fresh single-file re-run in task 10.3: skeleton 91, atlas 73, game 117 pass.

Mutation checks (task 8.1; each source restored and compared identical with a pre-edit copy; no test needed strengthening):

| Item | Mutation | Failed test |
|---|---|---|
| 3 | delete `--color-surface` re-point in `.book-paper` | `book-foundations`, `ui-contrast` (7 failed) |
| 4 | remove the `--color-bg` re-point | `ui-contrast`, `book-foundations` (5) |
| 5 | `--book-card` to a dark colour | `ui-contrast`, `paper-constants` (7) |
| 6 | painted map image added back above `WorldMap` | `home.test.tsx` no painted map |
| 11 | constant toggle label | `book-component` scroll-view label |
| 20 | drop `aria-pressed` | `book-component` book-view case |
| 26 | hint pair rendered twice | `hint-area.property` (both cases) |
| 27 | world route stubs `window.open` | `hint2-tab` source check (not a click run; no jsdom) |
| 29 | `scroll-margin-block-start: 0` | `anchor-margin` (2) |
| 30 | delete `min-block-size` on `.source-link` | `sources-tap` |

Additions after task 8.1 (each applied by hand, caught, restored; rows in `mutations.md`):

| Task | Mutation | Caught by |
|---|---|---|
| 10.F7 | `hint1Marks` keeps replied ids after the slot is solved | `world.test.ts` (1) |
| 10.F7 | drop `setHint1Highlights` in `WorldPlay` | `world.test.ts` source pin (1) |
| 10.F8 | fear text colour ink to muted in `fear.css` | D22 CSS binding (1) |
| 10.F8 | ink token darkened to `#4a443f` | matrix, 100 draws, D22 (4) |
| 10.F8 | `.btn` `min-block-size` `var(--target)` to 2rem | `ui-layer.test.ts` (1) |
| 10.F8 | `.nav-item[aria-current='page']` bar 2px to 1px | `ui-layer.test.ts` (1) |
| 10.F8 | Hint 2 link `rel="noopener"` removed | `hint-area.test.tsx`, markup test (2) |
| 10.F8 | `.scene-button` `min-block-size` 44px to 30px | `hint-area.test.tsx` (1) |
| 10.F11 | `imageUrl` slices the path one character early | CDN property, example URL, srcset (3) |
| 10.F11 | `imageUrl` with no base appends `?x` | no-CDN equals `assetUrl` (2) |
| 10.F11 | `tr` size check weakened to `n > 0` | integers-in-range test (1) |
| 10.F11 | CDN preload drops `imageSrcSet` | preload equals img (1) |
| 10.F11 | CDN preload `href` set to the local URL | preload equals img (1) |
| 10.F11 | game `imageAttrs` returns only `src` | 4 tests (imageAttrs, SceneViewer, Hall) |
| 10.F11 | `https://ik.imagekit.io` removed from CSP `img-src` | atlas and game CSP tests (2) |

F5 and F6 each have a mutation recorded in `decisions.md` (copy background changed fails the F5 case; removing the `aria-label` fails 2 header tests).

Three more from 6.10 (`hintTab.ts`): `closeTab: false` (8 caught), early `location.replace` (10), missing `opener = null` (1). Others are in `decisions.md` per task.

Test limits: the game package has no jsdom, so clicks are covered by static markup, pure rules and source checks. Route handlers are covered through `applyHint2Reply` and a source-text case. Focus moves and the tab scroll are checked only by the browser scripts.

## 8. Browser results

Method: headless Chrome at 390x844 and 1280x800, guest only, local production builds run with `node --env-file=.env` (stopped after) and the production site. No sign-in or sign-up anywhere.

**Local** (BC)
- Screens 8.2: atlas 24 pass, game 24 pass. After F1 to F4 (8.F5): screens 23 pass, 0 fail, 1 skip (1280 dead end not reached; alone 2/0/0).
- Keyboard 8.3 / 8.F5: 255 then 258 pass, 0 fail. Rings in section 3. Six focus bugs fixed on the way (book page ring, hotspot ring, pan button, Hint 1 Close, Hint 2 link, answer option).
- Reduced motion: 46 pass (OS and in-app; `getAnimations()` empty; control run sees 25 animated styles). RTL: 63 pass (no overflow, mirrored, popovers in view). Fixes: fear fill and map pin transitions off under `data-motion`; focused scene tab scrolled into view.
- P2 6.15: pass after two fixes (Book_View anchor landed above the screen; tutorial top 215 to 197).
- Real high-fear caption: 6 pass.

**Production** (`https://trick-or-told.vercel.app`, game under `/game/`, task 9.2): atlas screens 24/0, contrast 8/0, game options 8/0, header 10/0, game screens 22/0, dead end and win 3/0 with 1 skip (1280 dead end), keyboard 258/0, 34 image URLs ok. Contrast equals local. No production-only defect. Totals 333 pass, 0 fail, 1 skip. Shots `.debug/phase-6/prod-shots/`, `.debug/phase-6/prod-keys/`.

Guest play on production is believed to write no database rows (code reading in DEC 9.2; the database was not queried).

**Slow 4G** (1.6 Mbps down, 150 ms RTT, CPU 4x, cache off, 390 px, median of 3, headless Chrome; `.debug/phase-6/shoot.mjs`, `prod-timing.mjs`, `prod-timing-9.3.json`)

| Page | Before | After | Change |
|---|---|---|---|
| Atlas home, local build, LCP | 6128 ms (FCP 2960, load 10653, 1673543 bytes) | 5360 ms (FCP 2448, load 8291, 1323810 bytes) | LCP -12.5%, bytes -20.9%. Limit 6741. Met |
| Atlas home, production, LCP | none for Phase 5 | 5580 ms (runs 5580, 16900, 3836; one stall under load average 74) | Not like for like |

Not like for like: the 6128 ms before is a local server; the 5580 ms is Vercel production. Phase 5 has no atlas home figure. The like-for-like gate is the local pair above. Production 5580 is above local after (5360).

Game scene paint on production against Phase 5 (`phase-5-handover.md` section 9):

| Page | Phase 5 run 1 | Phase 5 run 2 (loaded) | Phase 6 | vs run 1 | vs run 2 |
|---|---|---|---|---|---|
| Hall | 3714 | 4025 | 3664 | -1.3% | -9.0% |
| Tutorial | 3535 | 3969 | 3652 | +3.3% | -8.0% |
| Banshee scene 1 | 4521 | 4848 | 4594 | +1.6% | -5.2% |

Treated as within run-to-run spread (run 1 and run 2 differ by 8 to 12%); no regression claimed. The 3.0 s scene-paint budget is still missed by all three, as in Phase 5, because of the scene image size (Banshee scene 1 is 430910 bytes).

## 9. Assets still needed

`content-and-assets-needed.md`:
1. **Banshee panorama without a brightness seam.** `assets/banshee/game/banshee-game-scene-01.webp` (file name assumed, to be confirmed against the scene list), 4096x1536 WebP, same path, same composition and edges, no larger than today. Check scenes 02 and 03 for the same step. Seam source: review finding E4; not re-measured. Re-run the Neon import after replacing it.
2. **Phone-width scene copies** under new asset ids (smallest fix for the 3.0 s scene paint; listed in the browser-checks 9.3 findings). Also noted there: the six Banshee hotspot sprites (43 to 115 KB each) and the spirit figure (168 KB) could be made smaller. Both are assets, outside Kiro.

## 10. Skills used and findings

Full account in `docs/kiro-usage.md` (Phase 6). Short form:
- **impeccable**: loaded in 4.8 and 8.F1 to 8.F4; refused in 3.7 and not worked around. The launcher was never run (no downloader allowed), so every design review was by eye against `design-direction.md`. Found: header wrap at 390, hero copy contrast (1.01 to 1.11).
- **agent-guard** (by hand, no sub-agent): 1.9 two comment fixes, a redundant selector, an unused export; 2.6 the `--color-rule`, `--color-link`, `--color-ring` re-points are invisible to a contrast test (guarded by a declaration check); 3.8 hero scrim test added; 6.16 `applyHint2Reply` so the test exercises the route; 8.7 three source-check tests for CSS-only fixes; 9.4 owner note on guest writes and the atlas Slow 4G relabel.
- **verify-and-stop** (10.3, by hand, no sub-agent): section 4 counts. Nothing fixed; git read-only for `5fcb86b..HEAD` clean for `content/`, `assets/`, `vercel.json` files, lockfile.
- **read-the-damn-docs, ponytail, agent-tester**: not recorded as loaded; not claimed.

## 11. Needs owner action

1. **Banshee panorama seam** (section 9, item 1): replace the asset outside Kiro, then re-run the Neon import. Phone-width scene copies are no longer needed for the same goal if the CDN stays on (F9 serves sized copies); keep the item only if the CDN is switched off.
2. **F7 content ids.** Hint 1 marks are built (section 6b) but cannot be confirmed in a browser: no Banshee Hint 1 row names a hotspot id. Either add hotspot ids (`h-xx`) to the Banshee Hint 1 rows outside Kiro (content, then re-run the import), or check Flying Dutchman, the only legend with ids, while signed in.
3. **Like-for-like timing.** Production Slow 4G has not been measured with the CDN (needs the push, item 5). For a production before/after on the atlas home, measure the last Phase 5 production commit on a Vercel preview deployment (same profile, `.debug/phase-6/prod-timing.mjs`, three runs, quiet machine) and compare with the current production median. The F9 off/on table in section 6b was taken on a loaded machine.
4. **Signed-in checks** were never run (no sign-in without reading `.env`): signed-in Hall states (17.9), a signed-in world Hint 2, Hall access for an account, and the F7 Dutchman check. The judge test account needs a manual pass on production.
5. **Production CDN timing after the push.** Push, confirm `IMAGE_CDN_URL=https://ik.imagekit.io/hrim` is set in both Vercel projects (it was set by the owner), then measure Slow 4G on production (Hall, tutorial, Banshee scene 1, atlas home, `prod-timing.mjs`) and check that image URLs start with `https://ik.imagekit.io/hrim/` and that the browser console shows no CSP error. If the CDN misbehaves, use the fallback steps in section 6b.
6. **Real pop-up blocker.** Hint 2 blocked-tab flow was checked with a `window.open` stand-in, not Chrome's blocker. Try it once with the blocker on.
7. **Optional follow-ups from the partly-met list** (items 10.3, 11.5, 25.5 and 27.4 are closed by F8): look at `.plate` and `.dramatization` on paper (12.6); see a "Tried" option on screen (13.3); measure the 300 ms reply bound (19.3).
8. **Commit all files.** Source for F5 to F9 is not in commit `0a7a36c`; the tree holds modified and new files in `apps/atlas`, `apps/game`, `skeleton`, `docs/`, `.kiro/specs/ui-rework/`, `.env.example` and `README.md`. Check `git status` first; the agent did not commit or push.
9. Scene images do not load in a local run without the atlas on port 3001 as the image origin; start both when reviewing the game locally.
10. The 1280 production dead end was skipped (the run reached the win first); the 390 dead end passes. Dead-end skips in local runs are seed-dependent.
11. RTL text is unchecked until the Arabic catalog has content.
