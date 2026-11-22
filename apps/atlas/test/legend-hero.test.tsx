import { readFileSync } from 'node:fs';
import { atlasLegendFromModel } from '@kiroween/skeleton/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { allLegends } from '../../../skeleton/test/helpers/legends.ts';
import { LegendPage } from '../src/components/LegendPage';
import { translate, type Translate } from '../src/i18n/t';

// Requirement 24.1, 24.2, 24.4: the hero is height-capped and has a theme-colour placeholder.
const t: Translate = (key, vars) => translate('en', key, vars);
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** The declarations of the first rule whose selector is exactly `.legend-hero`. */
function ruleBody(source: string, selector: string): string {
  const m = new RegExp(`(?:^|[}\\s])${selector.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`).exec(source);
  return m?.[1] ?? '';
}

describe('legend hero first screen', () => {
  it('puts the legend-hero class on the hero img', () => {
    const legend = atlasLegendFromModel(allLegends[0]!);
    const html = renderToStaticMarkup(<LegendPage legend={legend} t={t} />);
    const img = /<img\b[^>]*>/.exec(html)![0];
    expect(img).toMatch(/class="[^"]*\blegend-hero\b/);
  });

  it('caps the height at min(46dvh, 28rem) and covers the box', () => {
    const body = ruleBody(css, '.legend-hero');
    expect(body).toMatch(/max-block-size:\s*min\(46dvh,\s*28rem\)/);
    expect(body).toMatch(/object-fit:\s*cover/);
  });

  it('shows a theme-token gradient placeholder, not a literal colour', () => {
    const body = ruleBody(css, '.legend-hero');
    expect(body).toMatch(/background:\s*linear-gradient\(var\(--color-surface\),\s*var\(--color-bg\)\)/);
    expect(body).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('the rule reader returns nothing for a missing rule (self-test)', () => {
    expect(ruleBody('.other { color: red }', '.legend-hero')).toBe('');
    expect(ruleBody('.legend-hero { max-block-size: 90dvh }', '.legend-hero')).not.toMatch(/46dvh/);
  });
});
