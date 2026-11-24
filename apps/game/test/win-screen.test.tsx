import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { en } from '../src/i18n/en.ts';
import { translate } from '../src/i18n/t.ts';

vi.mock('../src/i18n/useT.ts', () => ({
  useT: () => (key: keyof typeof en, vars?: Record<string, string | number>) => translate('en', key, vars),
  useLang: () => 'en',
}));
vi.mock('../src/i18n/useT', () => ({
  useT: () => (key: keyof typeof en, vars?: Record<string, string | number>) => translate('en', key, vars),
  useLang: () => 'en',
}));
const { Ending } = await import('../src/components/WorldPlay.tsx');

type Props = Parameters<typeof Ending>[0];

describe('Ending (win screen)', () => {
  it('hides design notes and shows heading, catalog line, score, seed and the legend link', () => {
    const marker = 'DESIGN NOTE slot-3 *x*';
    const view = { ended: { curseText: marker, score: 742, seed: 'seed-abc' } } as unknown as Props['view'];
    const html = renderToStaticMarkup(
      createElement(Ending, { view, title: 'Banshee', relic: null, legendId: 'banshee', mediaBase: 'http://atlas.test', onHall: () => {} }),
    );
    expect(html).not.toContain('DESIGN NOTE');
    expect(html).not.toContain(marker);
    expect(html).toContain(en['world.win']);
    expect(html).toContain(en['world.win.line']);
    expect(html).toContain('Score: 742');
    expect(html).toContain('Seed of this run: seed-abc');
    expect(html).toContain('href="http://atlas.test/legends/banshee"');
  });
});
