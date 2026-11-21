// Product names live only behind the catalog title keys (Requirement 24.8 to 24.10): the Owner gives the final names
// before 2026-12-01, and changing them must be a catalog-only change. The names are read from the catalogs, so this
// test follows a rename.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { en as atlasEn } from '../../apps/atlas/src/i18n/en.ts';
import { en as gameEn } from '../../apps/game/src/i18n/en.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const SOURCES = ['apps/atlas/src', 'apps/game/src', 'skeleton/src'];
const CATALOG = /[/\\]i18n[/\\][a-z]{2}\.ts$/;
const GENERATED = /routeTree\.gen\.ts$/;
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx|css|html|json)$/.test(f) ? [p] : [];
  });
}
const titles = [...new Set([atlasEn['app.title'], gameEn['app.title']])];
// The game title is also the tail of the atlas title, so a file that names either is caught.
describe('product names come only from the catalog', () => {
  it('has names to look for', () => {
    for (const t of titles) expect(t.length).toBeGreaterThan(3);
  });
  it.each(SOURCES)('no title literal under %s outside the catalog files', (dir) => {
    const hits: string[] = [];
    for (const f of walk(join(root, dir))) {
      if (CATALOG.test(f) || GENERATED.test(f)) continue;
      const text = readFileSync(f, 'utf8');
      for (const t of titles) if (text.includes(t)) hits.push(`${f.slice(root.length)}: ${t}`);
    }
    expect(hits).toEqual([]);
  });
  it('the manifests and page titles read the title key', () => {
    for (const app of ['atlas', 'game']) {
      expect(readFileSync(join(root, `apps/${app}/src/routes/manifest[.]webmanifest.ts`), 'utf8')).toContain("'app.title'");
    }
  });
});
