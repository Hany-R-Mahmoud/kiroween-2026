import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { KeepersNotePage } from '../src/components/KeepersNotePage';
import { translate } from '../src/i18n/t';
// Mood layer, no browser (launch-and-polish 6.2; Requirements 19.3, 19.8, 19.10, 19.12, 26.4). Reads mood.css as text.
const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const css = read('../../../skeleton/src/design/mood.css');
const tsx = read('../../../skeleton/src/design/Mood.tsx');
const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');
/** Top-level-ish rules: [selector, body] for rules that hold no nested block (nested @media bodies are flattened). */
const rules = [...bare.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => [m[1]!.trim(), m[2]!] as const);
const body = (sel: string) => rules.filter(([s]) => s.split(',').map((x) => x.trim()).includes(sel)).map(([, b]) => b);

describe('mood.css: candle (19.3)', () => {
  const kf = /@keyframes mood-candle\s*\{([\s\S]*?\n\})/.exec(bare)![1]!;
  const stops = [...kf.matchAll(/([\d%,\s]+)\{[^}]*opacity/g)].flatMap((m) => m[1]!.split(',').map((s) => s.trim()).filter(Boolean));
  const dur = /animation:\s*mood-candle\s+([\d.]+)s/.exec(bare)![1]!;
  it('changes brightness at most 3 times a second', () => {
    const distinct = new Set(stops.map((s) => (s === '100%' ? '0%' : s))).size; // 0% and 100% are one value, one cycle
    expect(distinct).toBeGreaterThan(1);
    expect(distinct / Number(dur)).toBeLessThanOrEqual(3);
  });
});

describe('mood.css: overlays take no input (19.8)', () => {
  it('every overlay rule has pointer-events: none', () => {
    for (const sel of ['.mood-layer', '.mood-fog', '.mood-vignette-inset::after'])
      expect(body(sel).some((b) => /pointer-events:\s*none/.test(b)), sel).toBe(true);
    // children of .mood-layer are not positioned boxes of their own input: they inherit none through the layer
    expect(tsx).toContain('className="mood-layer" aria-hidden="true"');
  });
});

describe('mood.css: reduced motion (19.10)', () => {
  const animated = [...bare.matchAll(/([^{}]+)\{[^{}]*\banimation:[ ]+(?!none)[^;}]+/g)].map((m) => m[1]!.trim());
  const reduce = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?\n\})/.exec(bare)![1]!;
  const motion = bare.split("html[data-motion='reduce']").slice(1).join('|');
  it('finds the candle and the fog as the only animations', () => {
    expect(animated).toEqual(['.mood-candle', '.mood-fog::before']);
  });
  it('sets every animation to none under prefers-reduced-motion and under data-motion=reduce', () => {
    for (const sel of animated) {
      const re = new RegExp(`${sel.replace(/[.:]/g, '\\$&')}[^{]*\\{[^}]*animation:\\s*none`);
      expect(reduce, sel).toMatch(re);
      expect(motion, sel).toMatch(re);
    }
    expect(reduce).toMatch(/\.mood-hotspot-glow\s*\{[^}]*transition:\s*none/);
    expect(motion).toMatch(/\.mood-hotspot-glow\s*\{[^}]*transition:\s*none/);
  });
});

describe('mood.css: logical only, no new assets (19.12)', () => {
  it('no physical-direction property in mood.css', () => {
    expect(bare).not.toMatch(/(?:^|[\s;{])(?:left|right)\s*:|(?:margin|padding|border)-(?:left|right)|text-align\s*:\s*(?:left|right)/m);
  });
  it('references no url() but the shared paper asset, and imports no font, sound or library', () => {
    const urls = [...(bare + tsx).matchAll(/url\(([^)]*)\)/g)].map((m) => m[1]!.replace(/['"]/g, ''));
    expect(urls).toEqual(['/media/shared/shared-atlas-paper-01.webp']);
    expect(bare).not.toMatch(/@font-face|@import/);
    expect([...tsx.matchAll(/^import .*$/gm)]).toEqual([]);
    expect(tsx).not.toMatch(/Audio|<audio|<img|<video/);
  });
});

describe('Mood in the app shells (19.1)', () => {
  it('both root routes import and render <Mood />', () => {
    for (const app of ['atlas', 'game']) {
      const root = read(`../../${app}/src/routes/__root.tsx`);
      expect(root, app).toContain("import { Mood } from '@kiroween/skeleton/mood'");
      expect(root, app).toContain('<Mood />');
    }
  });
});

describe("Keeper's Note Fiction label (26.4)", () => {
  it('stays in the page, outside any mood element', () => {
    const t = (k: Parameters<typeof translate>[1], v?: Record<string, string | number>) => translate('en', k, v);
    const html = renderToStaticMarkup(
      <KeepersNotePage t={t} note={{ anchor: 'keepers-note--ch-1', label: 'FICTION-LABEL', title: 'T', oneLineHook: 'H', readingTimeMin: 2, chapterTitle: 'C', paragraphs: ['One.'], hook: 'Hook.' } as never} />,
    );
    const at = html.indexOf('FICTION-LABEL');
    expect(at).toBeGreaterThan(-1);
    for (const m of html.matchAll(/class="[^"]*\bmood-(?:layer|fog|vignette)\b[^"]*"/g)) expect(m.index!, 'overlay wraps label').toBeLessThan(0);
    expect(html.slice(0, at)).not.toMatch(/mood-(?:layer|fog|vignette)/);
  });
});
