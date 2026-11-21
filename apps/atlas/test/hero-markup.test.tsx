import { atlasLegendFromModel, heroSmallSize } from '@kiroween/skeleton/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { allLegends } from '../../../skeleton/test/helpers/legends.ts';
import { LegendPage } from '../src/components/LegendPage';
import { translate, type Translate } from '../src/i18n/t';

// Requirement 13.3, 13.5, 13.8: the legend hero is one picture with one phone-copy source, chosen by width only.
const t: Translate = (key, vars) => translate('en', key, vars);
const tags = (html: string, name: string) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map((m) => m[0]);

describe.each(allLegends.map((l) => [l.id, l] as const))('legend hero markup %s', (id, l) => {
  const legend = atlasLegendFromModel(l);
  const html = renderToStaticMarkup(<LegendPage legend={legend} t={t} />);
  const picture = /<picture>([\s\S]*?)<\/picture>/.exec(html);

  it('renders exactly one picture with one source and the full image as the img fallback', () => {
    expect(html.match(/<picture\b/g)).toHaveLength(1);
    const inner = picture![1]!;
    const sources = tags(inner, 'source');
    expect(sources).toHaveLength(1);
    const source = sources[0]!;
    expect(source).toContain('media="(max-width: 1000px)"');
    expect(source).not.toMatch(/srcSet="[^"]*\s\d+(\.\d+)?[xw]/i);
    expect(source).not.toMatch(/\ssizes=/i);
    expect(source).toContain(`srcSet="/media/${id}/atlas/${id}-atlas-hero-01-w1000.webp"`);
    const small = heroSmallSize(legend.hero!.width, legend.hero!.height);
    expect(source).toContain(`width="${small.width}"`);
    expect(source).toContain(`height="${small.height}"`);
    expect(small.width).toBe(1000);
    const img = tags(inner, 'img');
    expect(img).toHaveLength(1);
    expect(img[0]).toContain(`src="/media/${id}/atlas/${id}-atlas-hero-01.webp"`);
    expect(img[0]).toContain(`width="${legend.hero!.width}"`);
    expect(img[0]).toContain(`height="${legend.hero!.height}"`);
    expect(inner.indexOf('<source')).toBeLessThan(inner.indexOf('<img'));
  });
});
