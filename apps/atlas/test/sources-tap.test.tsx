import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { allLegends } from '../../../skeleton/test/helpers/legends.ts';
import { LegendPage } from '../src/components/LegendPage';
import { atlasLegendFromModel } from '@kiroween/skeleton/client';
import { translate, type Translate } from '../src/i18n/t';

// Requirement 30: source links are at least 24 px tall, 8 px apart, and the external marker is named from the catalog.
const t: Translate = (key, vars) => translate('en', key, vars);
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const REM = 16;

/** Declarations of the rule whose selector list holds `selector`, or null. */
function rule(source: string, selector: string): string | null {
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (let m = re.exec(stripped); m; m = re.exec(stripped)) {
    if ((m[1] ?? '').split(',').some((s) => s.trim() === selector)) return m[2] ?? '';
  }
  return null;
}
const remOf = (body: string | null, prop: string): number | null => {
  const v = body ? new RegExp(`(?:^|[\\s;])${prop}:\\s*([\\d.]+)rem`).exec(body)?.[1] : undefined;
  return v === undefined ? null : Number(v) * REM;
};

const html = renderToStaticMarkup(<LegendPage legend={atlasLegendFromModel(allLegends.find((l) => l.id === 'banshee') ?? allLegends[0]!)} t={t} />);
const sources = /<section id="sources"[\s\S]*?<\/section>/.exec(html)?.[0] ?? '';
const links = [...sources.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map((m) => m[0]);

describe('source link tap size', () => {
  it('renders at least one external source link, each using the source-link class', () => {
    expect(links.length).toBeGreaterThan(0);
    for (const a of links) expect(a).toMatch(/class="[^"]*\bsource-link\b/);
  });
  it('the stylesheet gives the class a 24 px minimum height, block display and 4 px block padding', () => {
    const body = rule(css, '.source-link');
    expect(remOf(body, 'min-block-size')).toBeGreaterThanOrEqual(24);
    expect(body).toMatch(/display:\s*inline-block/);
    expect(remOf(body, 'padding-block')).toBeGreaterThanOrEqual(4);
  });
  it('keeps at least 8 px between items', () => {
    expect(sources).toMatch(/<ol[^>]*\bgap-(2|3|4)\b/);
  });
  it('marks the link external with a hidden glyph and a catalog label', () => {
    for (const a of links) {
      expect(a).toContain('<span aria-hidden="true"> ↗</span>');
      expect(a).toContain(`(${t('legend.sourceExternal')})`);
    }
    expect(t('legend.sourceExternal')).not.toBe('legend.sourceExternal');
  });
  it('fails when the minimum height rule is removed', () => {
    const broken = css.replace(/min-block-size:\s*1\.5rem;/, '');
    expect(remOf(rule(broken, '.source-link'), 'min-block-size')).toBeNull();
    expect(remOf(rule(css.replace(/min-block-size:\s*1\.5rem;/, 'min-block-size: 1rem;'), '.source-link'), 'min-block-size') ?? 0).toBeLessThan(24);
  });
});
