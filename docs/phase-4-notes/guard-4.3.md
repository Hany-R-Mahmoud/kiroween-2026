# Guard 4.3: atlas changes

Lanes run: clean-code (code), test-guard (tests). Docs lane: no docs touched in scope.

Scope: `KeepersNotePage.tsx`, `routes/legends.$legendId.tsx`, `server/functions.ts`, `routes/__root.tsx` footer, `i18n/en.ts`, `skeleton/src/db/keepersRead.ts`, `test/keepers-note.test.tsx`.

## Findings

1. **Fixed (test boundary).** `test/keepers-note.test.tsx` imported `keepersNoteViewFromRow` from `../../../skeleton/src/keepers/read.ts`, a deep path into the skeleton source. Apps import the skeleton through its package entry points only. The test now builds a typed `KeepersNoteView` literal (type from `@kiroween/skeleton/client`). Same assertions.

## Checked, no finding

- Note branch runs before the legend lookup; `isLegendId` accepts the note id (regex), `isKeepersNoteId` then routes it. The loader result is a discriminated union (`kind`), used by both `head` and the component.
- `getKeepersNote` and `isKeepersNoteAnchorStored` name explicit columns, use bound parameters, and never touch `keepers_note_details` (a test enforces this).
- `resolveAnchor` signature unchanged; the fallback returns the note only when the stored anchor matches.
- `listLegends` and `atlasUrl` unchanged; the note is absent from home loader and map components (tested).
- Strings come from the catalog (`footer.keepersNote`); the note text is stored content. Page uses logical CSS only (`border-s`, `ps-4`); the footer link has a 44 px target.
- Anchor id appears exactly once; heading id is derived from the anchor and differs from it.
- Residual, accepted: the footer link and the `functions.ts` fallback are asserted by source text (recorded in decisions.md under 4.2).

## Phase 3 atlas tests

`git status` shows no modified files under `apps/atlas/test`; the only change is the new `keepers-note.test.tsx`. All 154 earlier tests pass.

## Results

- `pnpm --filter atlas typecheck` (run in `apps/atlas`): clean.
- `pnpm test` in `apps/atlas`: 10 files, 161 tests passed (154 Phase 3 + 7 new).
