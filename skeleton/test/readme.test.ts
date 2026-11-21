// README content (Requirement 24): what the project is, both production URLs, run and test commands, the Kiro log
// link, the disclosure, credits and the MIT statement. Product names stay in the catalogs, so the README names neither.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { en as atlasEn } from '../../apps/atlas/src/i18n/en.ts';
import { en as gameEn } from '../../apps/game/src/i18n/en.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const readme = readFileSync(`${root}README.md`, 'utf8');
describe('README', () => {
  it('has no TODO left', () => expect(readme).not.toMatch(/\bTODO\b/));
  it('gives both production URLs', () => {
    expect(readme).toContain('https://trick-or-told.vercel.app/');
    expect(readme).toContain('https://trick-or-told.vercel.app/game/');
  });
  it('says how to run both apps and the tests', () => {
    for (const cmd of ['pnpm install', 'pnpm --filter @kiroween/atlas dev', 'pnpm --filter @kiroween/game dev', 'pnpm -r test']) expect(readme).toContain(cmd);
  });
  it('links the Kiro log', () => expect(readme).toContain('](docs/kiro-usage.md)'));
  it('keeps the disclosure paragraph', () => {
    expect(readme).toMatch(/## Disclosure\n\nLegend research drafts and visual assets were prepared with AI tools outside Kiro/);
    expect(readme).toContain('All code, specs, steering and tests were built in Kiro IDE.');
  });
  it('credits the fonts, Natural Earth and the shipped libraries', () => {
    expect(readme).toContain('SIL Open Font License 1.1 (OFL-1.1)');
    expect(readme).toContain('Made with Natural Earth.');
    expect(readme).toMatch(/Apache-2\.0/);
  });
  it('states the MIT licence, and LICENSE is MIT', () => {
    expect(readme).toMatch(/## License\n\nMIT, see `LICENSE`\./);
    expect(readFileSync(`${root}LICENSE`, 'utf8')).toMatch(/^MIT License/);
  });
  it('names no product title, so a rename stays catalog-only', () => {
    for (const t of [atlasEn['app.title'], gameEn['app.title']]) expect(readme).not.toContain(t);
  });
});
