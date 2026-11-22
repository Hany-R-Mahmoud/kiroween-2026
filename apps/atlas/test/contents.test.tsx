import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { allLegends } from '../../../skeleton/test/helpers/legends.ts';
import { LegendPage } from '../src/components/LegendPage';
import { atlasLegendFromModel } from '@kiroween/skeleton/client';
import { translate, type Translate } from '../src/i18n/t';

// Requirement 31: one ordered list, one column, nav-item rows of at least 44 px, marker plus weight on hover and focus.
const t: Translate = (key, vars) => translate('en', key, vars);
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const REM = 16;

const model = allLegends.find((l) => l.id === 'banshee') ?? allLegends[0]!;
const legend = atlasLegendFromModel(model);
const html = renderToStaticMarkup(<LegendPage legend={legend} t={t} />);
const nav = /<nav aria-labelledby="contents-title"[\s\S]*?<\/nav>/.exec(html)?.[0] ?? '';
const links = [...nav.matchAll(/<a\b([^>]*)>/g)].map((m) => m[1] ?? '');
const hrefs = links.map((a) => /href="([^"]*)"/.exec(a)?.[1]);

/** Declarations of the first rule whose selector list holds `selector`, or null. */
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

describe('contents list', () => {
  it('is one ordered list in one column with a row per chapter plus versions and sources', () => {
    expect(nav.match(/<ol\b/g)).toHaveLength(1);
    expect(nav.match(/<li\b/g)).toHaveLength(legend.chapters.length + 2);
    expect(nav).not.toMatch(/grid-cols-2/);
  });
  it('gives every item the nav-item class and no link underline class', () => {
    expect(links.length).toBe(legend.chapters.length + 2);
    for (const a of links) {
      expect(a).toMatch(/class="[^"]*\bnav-item\b[^"]*\bcontents-link\b/);
      expect(/class="([^"]*)"/.exec(a)?.[1]?.split(/\s+/)).not.toContain('link');
    }
  });
  it('keeps every href', () => {
    expect(hrefs).toEqual([...legend.chapters.map((c) => `#${c.anchor}`), `#${legend.versionsAnchor}`, '#sources']);
  });
  it('prints the chapter number in the display font and keeps the text', () => {
    expect(nav).toContain('<span class="font-display">Chapter 1</span>');
    expect(nav).toMatch(/Chapter 1<\/span>: /);
  });
  it('rows are at least 44 px high, and hover and focus change weight and the start marker', () => {
    const base = rule(css, '.contents-link');
    expect(remOf(base, 'min-block-size')).toBeGreaterThanOrEqual(44);
    expect(base).toMatch(/border-inline-start:\s*0\.25rem solid transparent/);
    const active = rule(css, '.contents-link:hover');
    expect(active).toBeTruthy();
    expect(rule(css, '.contents-link:focus-visible')).toBe(active);
    expect(active).toMatch(/font-weight:\s*(6|7)00/);
    expect(active).toMatch(/border-inline-start-color:\s*var\(--color-accent\)/);
    expect(css).not.toMatch(/\.contents-link[^{]*\{[^}]*outline/);
  });
  it('fails when a rule is broken', () => {
    expect(remOf(rule(css.replace(/min-block-size:\s*2\.75rem;/, 'min-block-size: 2rem;'), '.contents-link'), 'min-block-size')).toBeLessThan(44);
    expect(rule(css.replace(/font-weight:\s*600;\s*\}\s*\}\s*\n\s*\n@layer components/, '}}\n\n@layer components'), '.contents-link:hover') ?? '').not.toMatch(/font-weight/);
  });
});
