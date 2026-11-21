# Look and feel brief: old-book reading and Halloween mood

Date: 2026-11-20. Owner request, noted during the Phase 4 mid-way review. This is input for the next Kiro phase prompt, written only after the Phase 4 handover is checked. It is not a Kiro prompt.

## Why

- A legend page in the atlas is about 21,800 px tall at 1024 px wide: roughly 28 screens of scrolling.
- The reading pages look like a web article, not like an old book. The contest theme is Halloween and horror, and the frame around our images does not carry that mood yet.
- The painted assets stay exactly as they are. Only what surrounds them changes.

## Part 1: reading as an old book

Applies to every surface that shows story text: atlas legend pages, the Keeper's Note page, and the game's reading panels (question, spirit, notebook) where it fits. Build it once as a shared component and shared tokens, so every page gets it.

1. **Paper.** Use the existing `shared-atlas-paper-01` (tileable, 52 KB, currently unused). Warm it toward aged, yellowed paper with CSS (a multiply tint and a slightly darker edge), add faint foxing and a soft vignette with gradients. No new image files.
2. **Pages, not scroll.**
   - Desktop and wide tablets: an open book, two pages side by side, with a gutter shadow down the middle.
   - Phones and narrow tablets: one page.
   - The text flows into pages (CSS columns or an equivalent DOM/CSS method; no page-flip library).
   - Controls: previous and next page buttons, arrow keys, swipe on touch, and a "page 3 of 12" indicator. Each chapter starts on a new page.
3. **Anchors must still work.** `/anchor/<anchor>` and every Hint 2 link must open the page that holds that anchor, with the anchor still in the DOM exactly once. `atlasUrl` stays unchanged.
4. **"Read as one page" toggle.** Shows the current scroll layout, for screen readers, find-in-page, printing and anyone who prefers it. The choice is remembered per browser.
5. **Ink and type.** Dark brown ink on the paper, body text AA contrast (4.5:1) or better, checked by the existing contrast test. Each legend's theme pack still sets the display font and accents; drop caps for chapter openings are optional.
6. **Hero image** becomes the frontispiece: the first page or spread before chapter 1.
7. **Motion.** A short page-turn transition; with reduced motion, an instant change. No 3D page curl.
8. **Direction.** With the Arabic flag, the spread and the page controls follow the UI direction (logical CSS only). Story text stays English.

## Part 2: Halloween mood around the assets

All of it CSS and DOM only, no new images, no sound, no libraries.

1. **Darkness at the edges.** A viewport vignette on dark surfaces, so the eye is pulled to the lit scene or page.
2. **Candlelight.** A warm glow near lit areas that breathes slowly. It is a slow brightness change, never a flash: at most 3 changes a second, and fully off under reduced motion.
3. **Fog.** A low, slow, semi-transparent fog layer along the bottom of scenes and the hall. It never covers hotspots or text, and it is off under reduced motion.
4. **Edges.** Torn or burnt edges on image frames and panels (mask or border image from existing parchment assets), thin ink borders, dust specks.
5. **Small touches.** Hotspots glow faintly on hover and focus, loading lines in the story's voice, ember accent colour used sparingly.
6. **Limits.** It must not hide hotspots, lower text contrast, or slow a phone. Content exclusions still apply: no gore, no occult or religious symbols, nothing that imitates a film, game or brand. The "Fiction" label on the Keeper's Note stays clear.

## Checks to require

- Anchor tests stay green; a new test proves every anchor lands on the right page in book view.
- Keyboard-only and touch-only reading from the first page to the last.
- 390 px phone width: single page, no horizontal page scroll outside the book.
- Reduced motion: no page animation, no flicker, no fog movement.
- Contrast test for ink on paper in every theme.
- Page weight: no new image files; note the texture's load time on a throttled phone profile.

## When

After the Phase 4 handover, as the first block of the next phase (polish), before deployment. Not now, because:

- Kiro is building the eleven worlds on the current components; changing shared CSS mid-run causes rework and merge clashes inside one tree.
- The atlas reading pages were finished in Phase 3, and the Phase 4 prompt allows only the Keeper's Note change there.
- The mood work is best judged with all twelve worlds playable.
