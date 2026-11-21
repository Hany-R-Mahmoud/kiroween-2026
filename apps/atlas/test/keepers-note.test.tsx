import { readFileSync } from 'node:fs';
import { atlasUrl, type KeepersNoteView } from '@kiroween/skeleton/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { KeepersNotePage } from '../src/components/KeepersNotePage';
import { translate, type Translate } from '../src/i18n/t';
import { resolveAnchor } from '../src/server/anchor';

// The Keeper's Note on the atlas (R3.4 to R3.7, R13.11). No database: a recording stand-in for the pg client, as in
// skeleton/test/atlas-read.test.ts. The live reader grants are covered by `db:check-reader`.
const t: Translate = (key, vars) => translate('en', key, vars);
const ANCHOR = 'keepers-note--ch-1';
const LABEL = 'Fiction: the story of this archive';
const NOTE: KeepersNoteView = { id: 'keepers-note', title: "The Keeper's Note", label: LABEL, readingTimeMin: 4, oneLineHook: 'A hook line.', chapterTitle: 'The first chapter', anchor: ANCHOR, paragraphs: ['First paragraph.', 'Second paragraph.'], hook: 'Closing hook.' };

const src = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const ids = (html: string) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]!);

describe("Keeper's Note page", () => {
  it('shows the title and the stored label, and carries the anchor as exactly one element id', () => {
    const html = renderToStaticMarkup(<KeepersNotePage note={NOTE} t={t} />);
    expect(html).toContain("The Keeper&#x27;s Note");
    expect(html).toContain(LABEL);
    expect(ids(html).filter((i) => i === ANCHOR)).toHaveLength(1);
    expect(new Set(ids(html)).size, 'duplicate ids').toBe(ids(html).length);
  });

  it('has the footer link to the note on every page, with a catalog label', () => {
    const root = src('../src/routes/__root.tsx');
    expect(root).toMatch(/<footer[\s\S]*legendId: 'keepers-note'[\s\S]*t\('footer\.keepersNote'\)[\s\S]*<\/footer>/);
    expect(translate('en', 'footer.keepersNote')).toContain("Keeper's Note");
  });
});

describe('/anchor/keepers-note--ch-1', () => {
  // the lookup of resolveAnchorFn in src/server/functions.ts: legend anchors first, then the note's stored anchor
  const lookup = (noteStored: boolean) => async (a: string) => (a === ANCHOR && noteStored ? 'keepers-note' : null);

  it('resolves to the note page at its anchor when the note is stored', async () => {
    expect(await resolveAnchor(ANCHOR, lookup(true))).toEqual({ kind: 'redirect', href: `/legends/keepers-note#${ANCHOR}` });
    expect(atlasUrl(ANCHOR)).toBe(`/legends/keepers-note#${ANCHOR}`);
  });

  it('is not found when the note is not stored', async () => {
    expect(await resolveAnchor(ANCHOR, lookup(false))).toEqual({ kind: 'notFound' });
  });

  it('the server function falls back to the note anchor lookup', () => {
    const fns = src('../src/server/functions.ts');
    expect(fns).toContain("findAnchorLegend(database(), a)) ?? ((await isKeepersNoteAnchorStored(database(), a)) ? 'keepers-note' : null)");
  });
});

describe("the Keeper's Note stays out of the legend list and the map", () => {
  it('the home loader and the map components never mention the note', () => {
    const fns = src('../src/server/functions.ts');
    const home = fns.slice(fns.indexOf('export const getHome'), fns.indexOf('export const getLegend'));
    expect(home.length).toBeGreaterThan(50);
    expect(home).not.toMatch(/keepers/i);
    for (const f of ['WorldMap.tsx', 'LegendList.tsx', 'home.ts']) expect(src(`../src/components/${f}`), f).not.toMatch(/keepers/i);
  });
});

describe('the atlas code never names keepers_note_details', () => {
  it('the read module, the server functions and the page do not name the details table in code', () => {
    const read = src('../../../skeleton/src/db/keepersRead.ts').replace(/\/\/.*$/gm, '');
    expect(read).toContain('keepersNote');
    expect(read).not.toMatch(/keepers_?note_?details/i);
    for (const f of ['../src/server/functions.ts', '../src/components/KeepersNotePage.tsx']) expect(src(f), f).not.toMatch(/keepers_?note_?details/i);
  });
});
