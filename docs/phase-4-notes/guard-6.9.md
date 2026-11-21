# Guard pass 6.9: UI foundation

Lanes run: clean-code (components, lib, layout types) and test (viewer, fear-ui, pan-media, theme, layout tests). Docs lane: no README or docs changed in scope, so none.

## Findings and fixes
1. `SceneViewer.tsx` `onKeyDown`: PageUp/PageDown handled in two separate branches (duplicate logic). Merged into one early branch; pan keys still apply only when the viewport itself has focus. Behavior unchanged.
2. Magic number 44 repeated in `Hotspot.tsx` (twice) and `SceneViewer.tsx`. Added `MIN_TARGET_PX` to `layout/types.ts` and used it in all three.
3. `SceneViewer.tsx` used the `React.FocusEvent` namespace without importing React. Now imports the `FocusEvent` type.

## Checked, no finding
- Tests assert behavior (pan bounds, drag threshold, single click path, marked state not colour only, image attributes), no mocks beyond the i18n hook needed because the vitest config has no DOM. The comment in `viewer.test.ts` states that limit.
- `useT` import style differs between files (`useT` vs `useT.ts`); both resolve and the mock path matches. Left as is.
- Theme helper drops any variable outside the allowed list; media helper goes through `assetUrl`. No secrets, nothing under `content/` or `assets/` touched.

## Checks
- `pnpm typecheck` (apps/game): clean.
- `pnpm test` (apps/game): 12 files, 116 tests pass.
