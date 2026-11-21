# Guard pass 7.9: playable slice
Lanes run: clean-code (routes, Hall, TutorialRoom, WorldPlay, lib, layouts) and test (hall, tutorial, world, hub-tutorial-roles, layout, playClient, i18n, logical-css). Docs lane: no docs in scope.

## Findings and fixes
1. Payload: `getWorldInfo` (`server/functions.ts`) sent `legend.world.spirit` (story prose) to the browser and no client code read it. Removed the field. The loader now carries only id, title, scenes, Fear_Event reduced-motion lines, hotspot ids and names, theme and relic.
2. Hardcoded text: Hall built accessible names with literal separators (`"<title>. <state>"`, `"<Read the legend>: <title>"`). Added catalog keys `hub.door.stateNamed` and `hub.door.readNamed` and used them.
3. Focus: closing a Hall or Tutorial panel dropped focus to the page. New `lib/focus.ts` (`usePanelOpener`, `returnFocus`) remembers the opener and restores it on close and Escape.
4. Focus: the World restart notice and the ending panel appeared without taking focus. Both are now focused on appearing; dismissing the restart notice moves focus to the scene heading.
5. Dead and duplicate code: `Hall.tsx` repeated the panel `<h3>` five times next to an unused-in-most-cases helper, now one `heading()`; `playClient.startTutorial` had a pointless temp variable; `world.$target.tsx` had a three-field `PlayResult` interface that restated `PlayClient['start']`'s result, now one `Started` type.
6. Tests: added `test/client-boundary.test.ts`. It fails if client code outside the allowed files imports `/server/` modules, or imports a value (not a type) from the skeleton root, with a check that the scanner sees both forms. It also covers `returnFocus` and the new catalog keys.

## Checked, no finding
- Logical CSS: no physical utilities or properties in `apps/game/src`; the existing scanner test proves it detects each form. `translateX` in the pan is the scene's fixed painted image.
- No `Math.random`, `console`, `any`, `@ts-ignore`, `dangerouslySetInnerHTML` in routes, components, lib, layout.
- Client views: `PlayView` and the tutorial view carry no role, correct option or true-lead field; the Seed is shown only from `view.ended`.
- Unused exports: none outside tests.
- Existing tests assert behaviour (door state, order, served option order, tried options, Seed hidden before end, restart notice), not implementation.

## Limits
- The vitest config has no DOM, so focus effects are not exercised in a browser; only the helper is unit tested. Try focus by hand (midway.md).
- Arabic has no `hub.*` entries yet and falls back to English per key (existing design).
- `server/functions.ts` is outside the named scope; the change is a one-line removal of an unused field.

## Checks
- `pnpm -r typecheck`: skeleton, atlas, game clean.
- `pnpm -r test`: skeleton 46 files, 691 passed + 7 expected fail (698); atlas 10 files, 161 passed; game 18 files, 206 passed.
