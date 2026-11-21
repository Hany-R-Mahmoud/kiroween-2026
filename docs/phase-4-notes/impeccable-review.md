# Impeccable review (task 9.13)

Skill: `skill::impeccable`, loaded in this thread only, reviewer sub-agents off, no sub-agents started. The catalog has no `agent-impeccable`; `impeccable` was used instead. The skill's `impeccable context` launcher and `shot` were not run (no browser, no PRODUCT.md/DESIGN.md read through it); the design steering (`.kiro/steering/design.md`, `i18n-rtl.md`) and `docs/` were read directly. Mode: Operate (game screens).

Scope: Hall (`Hall.tsx`), Tutorial_Room (`TutorialRoom.tsx`), Banshee and Flying Dutchman worlds (`WorldPlay.tsx`, layouts, theme), shared `scene.css`, `world.css`, `fear.css`, `theme.css`, `SceneViewer`, `Hotspot`, `SceneNav`, `FearOverlay`, `MotionToggle`. Method: code and CSS read, plus a throwaway contrast run over all 12 pack palettes through `resolveTheme` (file removed afterwards). No rendered browser check was possible.

## Passed

- Hierarchy: h1 (route) > h2 (scene / panel sections) > h3 (panels, leads). Focus moves to the panel or heading on open, Escape closes, focus returns to the opener.
- Touch targets: Hotspots enforce 44 px min inline and block size; `.scene-button` and `.world-button` have 44 px minimums; inputs `min-h-11`.
- Focus visibility: 3 px glow outline with offset on viewport, hotspots, buttons, panels, headings.
- Motion: fear flash has two dips in 1.2 s, and the fear gate allows one event per 4 s, so under 3 flashes in any second. `prefers-reduced-motion` kills the flash and the meter transition; the in-app setting switches to opacity-only fades of at most 400 ms. Overlay is `pointer-events: none`.
- RTL: all CSS logical; the physical stage is `direction: ltr` with a comment. No forbidden physical properties found in game CSS/TSX.
- Copy: every string via `t()` keys; errors say what to do ("Please try again").
- Loading, pending, error: `world.loading`, `tut.loading`, `play.pending` as `role=status`; errors as `role=alert`; restart notice takes focus.
- Contrast (all 12 packs through `resolveTheme`, base `cold`/`danger-ink`): cold caption on surface 5.6 to 6.2; danger-ink on surface 4.5 to 5.0; muted on surface 4.7 to 5.3; background on accent (current tab) 5.8 to 9.0. Banshee: glow/surface 6.5. Flying Dutchman: glow/surface 8.1.

## Fixed (game app only)

1. `MotionToggle` had no styles: a 13 px native checkbox and a label with no 44 px target. Added `.motion-toggle` in `fear.css` (44 px block size, 24 px checkbox, accent-color, visible focus ring) and imported `fear.css` in the component.
2. Hall legend links could be narrower than 44 px for short titles. Added `min-w-11 justify-center`.
3. `.scene-tabs` has `overflow-x: auto`, which clips the focus ring on the first and last tab. Added 6 px padding.
4. `.world-button[aria-disabled]` set `line-through` for the busy state, so every button flickered struck-through on each action. Strike-through now applies to `:disabled` only (a tried option); busy buttons just dim.
5. `.scene-viewport` height used `70vh`, which overshoots under mobile browser bars. Added a `70dvh` line after it (older browsers keep `vh`).

Typecheck and the game tests were rerun after these edits (see the report).

## Polish items (not fixed)

- **spring-heeled-jack: glow on surface is 2.8:1.** `resolveTheme` checks glow only against the background (large text). Panel headings (`text-xl text-glow` on `.world-panel`, surface background, normal weight) need 4.5:1 there. Fix belongs in the skeleton (`resolveTheme` also check glow on surface, or use ink for panel headings). Not in game-app scope.
- **Start failure leaves "loading" forever.** If the first `start` call fails in a World or the Tutorial_Room, the loading line stays next to the error alert and there is no retry control. Add a "Try again" button that reruns start (needs a new catalog key in `en.ts` and `ar.ts`).
- **Spirit panel text over a painted frame.** `.spirit-panel` draws text over `shared-game-ui-frame-01`; contrast is only guaranteed against the surface colour. Needs a browser check.
- **Pan buttons use `‹` `›` glyphs.** They are physical (the scene is fixed), so no mirroring is needed, but a drawn icon would match the craft rule. Low priority.
- **CSS order.** `.spirit-panel-body` (ink) and `.spirit-caption` (cold) set the same property at equal specificity; the winner depends on bundle order. Make it explicit.
- **Hall ending dialog** is `aria-modal` with no focus trap; focus starts on the button and nothing else is reachable by Tab order tricks, but Escape does not close it.
- **Hub reward slot text** says "An empty slot." inside the slot that glows; the list label carries the meaning. Consider a copy tweak.

## For task 11.2 (real browser)

- 390 px width: Hall, Tutorial_Room, Banshee, Flying Dutchman. Check no horizontal page scroll, tab wrap, pan buttons, panel placement below the fold.
- Focus ring visibility over painted scenes and on a hotspot at the viewport edge.
- Fear meter fill on the track over the frame image (danger fill is 2.5 to 2.7:1 on pack surfaces; the 3:1 pairing is against the background only).
- Spirit panel text over the frame image.
- Fear flash in full motion mode with a flash analyser or a frame capture; reduced mode shows fades only.
- Hotspot visibility on a phone in both worlds (decoys must stay unmarked).
- RTL pass with the Arabic flag on: panel layout, pan buttons, fear meter fill direction.
- Mobile browser bars with the new `dvh` viewport height.
- Real font rendering (IM Fell English SC, Playfair, etc.) and heading sizes at 390 px.
