# Visual direction: Trick or Told and Trick or True

Date: 2026-11-22. Direction only, no defect list. Based on live pages at 1280 and 390 px (guest), the tokens in `skeleton/src/theme/`, `.kiro/steering/design.md` and `planning/15-look-and-feel-brief.md`.

## 0. What the live build does today (one paragraph, for context)

Dark page, painted hero, then lists of text. Links are underlined gold text, headings are small-caps in one size family, the world map appears twice (a painted strip and a grey vector map), and the legend list is plain text rows. Paper and book chrome exist on the legend page (frame on hero, paper block) but stop at the first section. The painted art is strong; everything around it is flat. The fix is not more effects. It is a clear surface language: **dark room, lit objects**. Dark is the room; paper, brass and candle are the things you touch and read.

## 1. Identity

**Trick or Told: "The Archive Reading Room."** A keeper's long table at night. You open a bound volume under one candle. Everything readable sits on aged paper in dark brown ink; everything around it is the dark room. Tone: calm, documentary, a little dry. Scares come from restraint and from the "documented vs told" ledger, not from effects. Interactions feel like handling objects: open a volume, turn to a chapter, pull a card from a drawer.

**Trick or True: "The Archive House, after hours."** The same building, seen from inside. You are not reading, you are looking and choosing. The Hall is lit by lamps; each door is an object with a brass plate. Surfaces are dark wood, brass and lamp-glow rather than paper. Controls look like fittings (brass plates, tags, a notebook ribbon). Tone: tense, quiet, tactile, never gory.

**Shared:** one building (the Archive), one candle-and-brass accent, one type system, one set of tokens. The atlas is the library wing (paper on dark); the game is the house (wood and glow on dark). Hint links in the game open the atlas like pulling a volume off the shelf: the transition should feel like walking from one room into the other (same header plate, same brass, paper appears). Each legend's theme pack recolours only the accent, glow and a hero tint; it never changes layout or components.

## 2. Type system

All free on Google Fonts and already in `KNOWN_FONTS`; self-host (fonts.ts already does). No new family needed.

| Role | Family | Use |
|---|---|---|
| Display (shared) | IM Fell English (regular and italic) for large titles; IM Fell English SC only for small kickers and plates | Hero titles, chapter titles, card titles. Small caps only at 12 to 14 px with +0.08em tracking; the current full-size small caps for headings reads cramped and shouty, drop it for anything above 20 px |
| Body on paper | Source Serif 4 (opsz variable if the package has it), 400 | Story text, notes, references |
| Body on dark | Source Serif 4, 400 | Intro paragraphs, card blurbs |
| UI labels | Inter 500/600 | Buttons, tabs, meta (read time, scare level), page counter. 13 to 15 px, tracking +0.02em |
| Arabic (UI direction flag) | Noto Naskh Arabic for body; Amiri for display | Already known fonts; story text stays English |
| Legend display override | Each theme pack's display font, titles only | As today. Body stays Source Serif 4 so reading is uniform |

Scale (rem, 1rem = 16 px, fluid with `clamp`):

| Token | Size | Line height | Use |
|---|---|---|---|
| `--t-display` | clamp(2.6rem, 6vw + 1rem, 5rem) | 1.02 | Landing titles, legend title |
| `--t-h1` | clamp(2rem, 3vw + 1rem, 3rem) | 1.1 | Section titles |
| `--t-h2` | clamp(1.5rem, 1.5vw + 1rem, 2rem) | 1.2 | Chapter titles |
| `--t-h3` | 1.25rem | 1.3 | Card titles |
| `--t-lead` | 1.25rem | 1.55 | Landing intro, cold open |
| `--t-body` | 1.125rem (18 px) on paper, 1.0625rem on dark | 1.65 | Story text |
| `--t-ui` | 0.9375rem | 1.2 | Buttons and meta |
| `--t-kicker` | 0.75rem small caps | 1.2 | Labels above titles |

Reading measure: 62 ch maximum (about 34 to 38 em), min 34 ch; on a two-page spread each page is about 52 to 60 ch. Paragraph gap 0.9em with no first-line indent after a heading, indent 1.2em after that (book convention); do not mix with a blank-line gap. Drop cap (3 lines, display font, ember colour) on the first paragraph of each chapter only. Numerals: use `font-variant-numeric: oldstyle-nums` in prose where the font supports it, lining in UI.

## 3. Colour rules

Base tokens stay as in the steering file. Add only the paper pair and four semantic roles. Contrast figures are approximate; the existing contrast test must pin each pair.

Dark room (page and game): bg `#0e0b10`, surface `#1c1620`, raised surface `#261e2b` (new, for hover and cards), line `#3a3040`, ink `#e9e1d3`, muted `#9c9285`, accent `#e0a84b`, glow `#f4d58d`.

Paper (reading surfaces): paper `#e8dcc0`, paper-shade `#d9c9a4` (edge, gutter), ink-p `#2a1d12` (about 11:1), muted-p `#5c4a38` (about 6:1), rule-p `#b8a47c` (decor only), ember `#a8431f` (about 5.2:1 on paper; drop caps, accents), link-p `#7a2e1a` (about 7:1).

| Element | On dark | On paper |
|---|---|---|
| Body text | ink | ink-p |
| Link in prose | glow `#f4d58d`, underline 1px at 0.2em offset in accent at 60% opacity; hover: underline becomes solid and 2px, no colour jump | link-p, same underline rule, darker on hover (`#5a1f10`) |
| Visited | no change (do not recolour visited in a story) | no change |
| Navigation item (not in prose) | ink, no underline, accent bar 2px under current item (`aria-current`) | ink-p, same |
| Focus (all) | 3px solid glow, 3px offset, plus 1px bg-colour inner ring | 3px solid ink-p, 3px offset, plus 1px paper inner ring; never rely on colour alone |
| Selection | glow at 30% bg, ink text | ember at 25%, ink-p text |
| Disabled | muted at 60%, no shadow; still shows label | muted-p at 60% |
| Danger or "told, not documented" | `#e06b6b` text, `#b23a3a` fill (existing) | ember used with a text label |

**Documented vs told** is a core device. Use two marks everywhere (never colour alone): "Documented" = solid ink dot or filled square plus word; "Told" = hollow ring plus word and italic. Colours: documented uses ink, told uses ember (on paper) or accent (on dark).

**References and citations (paper):** small block at chapter end or a final "Sources" leaf. Number in ember small caps `[1]`, text in Source Serif 4 at 0.9rem in muted-p, line height 1.5, hanging indent 1.6em. Title of the work in italic; the URL shown as plain text in muted-p with a link underline only on hover and focus (still a real link; use an arrow glyph `↗` with `aria-hidden` and an accessible label "opens external site"). In-text markers are superscript `¹` links in link-p, hit area padded to 24 px, jump to the source with a highlight in paper-shade for 2 s (static outline under reduced motion). Each source line shows kind: "primary", "collection", "scholarship" in small caps so the reader sees what is documented. On dark (game notebook), same structure with muted and glow.

Ember on dark: use the accent `#e0a84b` instead of the paper ember. Ember never appears as body text. Colour is never the only carrier of state.

## 4. Components

**Rule: links navigate or define; buttons do things.** Prose links are underlined inline text (rule above). Anything that opens a place, starts, submits, toggles or reveals is a button-shaped object, never an underlined word. The "All legends", "Hall", "Sign in" header items and "Pan left/right" are the current offenders; they become nav items and buttons below.

**Buttons** (min 44 px high, 16 px radius max 4 px: brass plate, not pill; padding 0 20px; Inter 600 15 px; icon optional, logical start side).
- Primary: fill accent `#e0a84b`, text `#0e0b10` (about 9.5:1), 1px top inner highlight `#f4d58d`, 1px bottom edge `#9a6f27`, shadow `0 2px 0 #000 at 50%` plus soft `0 8px 20px -8px` accent at 35%. Hover: fill glow `#f4d58d`. Active: translate 1px, remove drop shadow. One primary per view ("Begin the tutorial", "Read the legend", "Start investigating").
- Secondary: transparent fill, 1.5px border accent, text glow, same size. Hover: fill accent at 14%. On paper: border ink-p, text ink-p, hover fill paper-shade.
- Ghost: no border, text ink with muted underline only on hover and focus; used for "Pan left", "Close", "Back to legends"; still has a 44 px target and an icon or arrow so it does not look like a link.
- Icon plates (pan, page turn): 48 px square brass-edge buttons with arrow glyphs that flip in RTL (`scaleX(-1)` under `:dir(rtl)`; use logical properties for position).
- Locked state: plate with padlock icon, label "Sign in to open", never an empty hotspot.
- Loading: label changes to story-voice line ("Unlocking...") and a thin accent bar; no spinner.

**Cards for legends** (replace text rows). A card is a "folio": painted thumbnail on top (existing legend hero, 16:10, cover-fit, paper edge border from the same frame treatment as the legend page), paper-tone label area below. Contents: kicker (region in small caps), title (h3 display), one-line hook (2 lines clamp), meta row (read time, scare level shown as 5 small candle glyphs filled/empty with text "3 of 5"). Whole card is one link (`<a>` wraps title; card click via `::after` stretch), hover: image lifts 2 px and a soft glow in the legend's own accent; focus ring as rule above. Grid: 1 column under 560, 2 up to 960, 3 above; gap 24 px. Group by continent with a sticky small-caps header.

**Chapter navigation** (legend page).
- Desktop: left rail (start side) listing chapters as a vertical ribbon: chapter number in display font, short title, tiny progress dot (done, current, upcoming); current is accent bar plus bold. Sticky, 220 px wide.
- Mobile: a slim top bar showing "Chapter 3 of 8" and a bookmark button that opens a sheet with the list. Previous/Next chapter plates at the end of each chapter, with the hook text beneath ("Next: Chapter 4, The woman in the casement").
- Chapter end: a "hook" band in display italic centered between two thin rules, then the Next plate. This makes the cliffhanger the visual climax of each chapter.
- Keep the book-page idea from the brief for the reading body; the rail and bar sit outside the book, on dark.

**Map: one map, one job.** Use only `shared-atlas-map-01.webp` (painted), delete the grey vector map. Its role is orientation on the landing page only: a section "Twelve places" with 12 pins; tapping a pin opens a small folio preview (the card above) and a "Read" button. On mobile it becomes a horizontally scrollable painted map (touch pan, 140 vw wide) above the card list, with the list being the real navigation. No map on legend pages beyond a small locator chip (region name plus a cropped map thumbnail) in the legend header. Pins are 44 px targets with the legend's number, labelled via `aria-label`; the map is decorative-plus-shortcut, never the only way to reach a legend.

**Header.** A brass-edged plate bar: wordmark (display, left/start), nav as items (not underlined links): Legends, Play, About; the other app is reached via one clear secondary button "Play Trick or True" / "Read the legends". Height 56 px; background bg at 85% with blur-free solid fallback.

**Frames and edges.** One reusable frame component: parchment torn border from the existing frame asset (`shared-game-ui-frame-01`) or CSS mask, 1px ink line inside. Used on hero, cards, game scene, notebook. Do not nest frames.

**Surfaces.** Three elevations only: room (bg), object (surface with line border, radius 4), page (paper). Radius 4 px everywhere (archive objects, not app bubbles). Shadows are warm black (`#000` at 40 to 55%), never grey drops.

## 5. Landing pages (existing art only)

### Trick or Told (atlas)

Assets: `shared-atlas-hero-01` (open book, candle, magnifier), `shared-atlas-paper-01`, `shared-atlas-map-01`, each legend's hero.

1. **Opening (100 svh, min 560 px).** Full-bleed hero image with a dark gradient from the start edge; title "Trick or Told" in `--t-display`; one line promise ("Twelve legends. What is documented, and what is only told."); primary "Start with the Banshee" (first recommended legend, a real path) and secondary "Browse all twelve". Kicker above the title: "An atlas of world horror legends". Candle breathes slowly (see motion).
2. **How every legend is told.** Four paper strips side by side (stacked on mobile): The cold open / Chapters that end on hooks / Documented vs told / References. Each with a small icon from existing glyphs or a plain numeral in display font and two lines of copy. Purpose: explain the format in 10 seconds.
3. **Featured legend.** One large folio (banshee or the scariest): hero left, title, hook, "documented vs told" ledger preview (3 items with the marks from section 3), primary "Read the Banshee". Reading preview of the cold open in 5 lines on paper.
4. **Twelve places (map).** Painted map with pins plus the card grid grouped by continent below.
5. **Crossover.** Dark band using a game scene (`hub-game-scene-01`), copy: "Now step inside one." Primary "Play Trick or True", secondary "How the game uses the atlas".
6. **Footer plate.** Honest notes: legends are folklore told for fiction; "Fiction" labels for Keeper's Note; sources policy; accessibility link.

### Trick or True (game)

Assets: `hub-game-scene-01`, `tutorial-game-scene-01`, each world's panorama, `shared-game-ui-*` (frame, hint, key, dawn, fear).

1. **Opening.** Full-bleed Hall scene (hub), darkened vignette. Title "Trick or True"; line: "Twelve doors. One investigator. Decide what is true." Primary "Enter the tutorial study" (guest-reachable), secondary "See the twelve doors". Small text under: "Guests: tutorial plus one world. Sign in to open every door." (that line as a calm note, not a banner).
2. **How you play.** Three plates: Look (pan the room) / Collect (clues in the notebook) / Decide (the question at the door); each with a 4 to 6 word caption and a cropped scene detail. A fourth line shows the fear meter and the hint key with its real icons from `shared-game-ui-*`.
3. **The Hall as a door grid.** The twelve doors as cards: crop from each world's panorama, brass number plate, lock state, name, scare level. This replaces the current text list. The panning Hall scene stays as the play surface; the landing shows the doors statically so people see what is behind them.
4. **Hints open the atlas.** One panel: left a game scene crop, right a paper preview of a chapter; copy "Stuck? The answer is in the record." Secondary "Open the atlas".
5. **Guest vs signed in**, then footer with accessibility settings (reduced motion, sound off) shown as real toggles.

## 6. Motion rules

- Principle: slow and physical (candle, dust, lamp), never sudden. Max 3 brightness changes per second; nothing flashes; nothing moves faster than 8 px/s except user-driven pans.
- Durations: hover and focus 120 ms; button press 80 ms; page or chapter change 280 ms ease-out; panel open 220 ms; candle and lamp breathing 6 to 9 s cycle, 4 to 8% opacity swing only.
- Allowed: fade, 2 to 8 px translate, glow opacity, parchment reveal on scroll once per element (opacity 0 to 1, 8 px rise), a 600 ms fade-in for hero image.
- Not allowed: parallax scrolling, shaking, page curls, auto-playing carousels, scroll-jacking, big zoom.
- Reduced motion (`prefers-reduced-motion: reduce` and the in-app toggle, either wins): all animation and transition durations become 0 except opacity cross-fades up to 100 ms; candle and fog off (static glow at mid value); no scroll reveals (everything visible); fear events replaced by a static equivalent as the steering file says; smooth scroll off.
- Implement with one CSS variable `--motion: 1|0` set on the root and multiplied into durations, so the in-app toggle is a single switch.
- Fog: one pseudo-element gradient under scenes only, `pointer-events: none`, never over hotspots or text.

## 7. What to keep from the current build

- The painted WebP art as is; the oil-paint look is the identity. Only the surroundings change.
- Base palette tokens, hub and contrast tests, per-legend theme packs (they recolour accent and display only).
- IM Fell English display and Source Serif 4 body; the whole font set and its self-hosting.
- Legend page structure: cold open, chapters ending on hooks, "documented vs told", references. This is the product; the design makes it visible.
- The parchment-framed hero on the legend page and the paper block with margin note (Keeper note style); make it the standard frame.
- The Hall panorama with pan controls and the lock objects; the door plates grow out of this.
- Hint to atlas anchor links, `atlasUrl` and anchor behaviour, RTL-aware layout, guest mode.
- The "Read as one page" idea and the book view from brief 15; the reading body should still be paged on wide screens, with the chapter rail outside the book.

## Build order for 4 days (existing assets, fonts only)

1. Day 1: tokens (type scale, paper pair, focus, motion variable), button and link components, frame and card components in the skeleton.
2. Day 2: atlas landing (sections 1 to 6), legend card grid, single painted map.
3. Day 3: legend reading page (chapter rail, hook band, references style, drop caps), then game landing and door grid.
4. Day 4: reduced-motion and contrast pass in both apps, 390 and 1280 checks, RTL flip check on icons and rails, Lighthouse accessibility sweep.

Constraints honoured: no new libraries, no new images, logical CSS properties only (`margin-inline`, `inset-inline`, `padding-block`), WCAG AA text contrast, 44 px targets, nothing resembles a film, game or brand.
