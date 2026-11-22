import fc from 'fast-check';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AA_LARGE, AA_TEXT, contrastRatio, resolveTheme } from '../src/theme/contrast.ts';
import { parsePalette, ThemeError } from '../src/theme/palette.ts';
import { allLegends } from './helpers/legends.ts';
import { PAPER_FLOOR } from '../src/book/bookColors.ts';
import { DESIGN_LAND, landRule, loadSources, measure, readSource, resolve, scopesOf, stripComments, type Sources } from './helpers/uiContrast.ts';

const sources = loadSources();
const base = measure(sources);

/** a copy of the sources with one exact text replaced; the replacement must exist, so a typo cannot hide a pass */
const mutate = (s: Sources, file: keyof Sources, from: string, to: string): Sources => {
  expect(s[file], `mutation target "${from}" exists`).toContain(from);
  return { ...s, [file]: s[file].replace(from, to) };
};

describe('Property 1: Every colour pair in the matrix meets its minimum', () => {
  // Feature: ui-rework, Property 1: Every colour pair in the matrix meets its minimum
  it('every dark and paper pair of design section 3.6 reaches its minimum (the failing pair is named)', () => {
    // **Validates: Requirements 10.5, 12.3, 12.5, 12.7, 13.1, 13.2, 14.1, 14.2, 14.3, 16.4**
    expect(base.measured.length).toBeGreaterThanOrEqual(40);
    expect(base.failures).toEqual([]);
  });
  it('any pair drawn from the matrix passes, 100 draws', () => {
    // **Validates: Requirements 14.1, 14.2**
    fc.assert(
      fc.property(fc.constantFrom(...base.measured), (m) => {
        expect(m.ratio, `${m.context} ${m.id} ${m.what}`).toBeGreaterThanOrEqual(m.min);
      }),
      { numRuns: 100 },
    );
  });
  it('the matrix covers surface, rule, link, primary, secondary, focus ring, land, pin and ember', () => {
    const text = base.measured.map((m) => m.what).join('|');
    for (const word of ['card', 'rule', 'link', 'primary', 'secondary', 'focus ring', 'land', 'pin', 'error']) expect(text).toContain(word);
    expect(new Set(base.measured.map((m) => m.context))).toEqual(new Set(['dark', 'paper']));
  });

  // Each rule must fail when broken: the same matrix on damaged sources names the damaged pair.
  it('fails when a dark token drops below its minimum (muted text)', () => {
    const r = measure(mutate(sources, 'tokens', '--color-muted: #9c9285', '--color-muted: #4a443f'));
    expect(r.failures.some((f) => f.includes('dark D4'))).toBe(true);
  });
  it('fails when the paper context stops re-pointing the card surface (the Phase 6 bug)', () => {
    const r = measure(mutate(sources, 'book', '--color-surface: var(--book-card);', ''));
    expect(r.failures.some((f) => f.includes('paper P3 '))).toBe(true);
  });
  it('fails when the paper context stops re-pointing the page colour', () => {
    const r = measure(mutate(sources, 'book', '--color-bg: var(--book-paper-tint);', ''));
    expect(r.failures.some((f) => f.includes('paper P2 ') || f.includes('paper P7 '))).toBe(true);
  });
  // Dropping one of these re-points leaves a failing pair. --color-rule, --color-link and --color-ring are not here:
  // their dark fallbacks still pass on paper, so book-foundations.test.ts (declaration check) guards those three.
  it.each([
    '--color-ink', '--color-muted', '--color-glow', '--color-accent', '--color-bg', '--color-surface',
    '--color-surface-raised', '--color-danger-ink',
  ])('fails when the paper context stops re-pointing %s', (name) => {
    const line = new RegExp(`^\\s*${name}:[^;]+;\\s*$`, 'm');
    expect(sources.book).toMatch(line);
    const r = measure({ ...sources, book: sources.book.replace(line, '') });
    expect(r.failures.filter((f) => f.startsWith('paper')).length, name).toBeGreaterThan(0);
  });
  it('fails when the paper rule colour is not re-pointed', () => {
    const r = measure(mutate(sources, 'book', '--color-rule: var(--book-ink);', '--color-rule: var(--book-card);'));
    expect(r.failures.some((f) => f.includes('paper P9a'))).toBe(true);
  });
  it('fails when the card fill is changed to a dark colour', () => {
    const r = measure(mutate(sources, 'book', '--book-card: #f6ecd2;', '--book-card: #1c1620;'));
    expect(r.failures.some((f) => f.includes('paper P3 '))).toBe(true);
  });
  it('fails when ember is made too light for a card', () => {
    const r = measure(mutate(sources, 'book', '--book-ember: #a8431f;', '--book-ember: #d9703f;'));
    expect(r.failures.some((f) => f.includes('paper P11'))).toBe(true);
  });
  it('fails when the map land fill is too close to the map card', () => {
    const r = measure(sources, { ...DESIGN_LAND, pct: 2 });
    expect(r.failures.some((f) => f.includes('dark D18'))).toBe(true);
  });
  // The pre-Phase-6 rule (45% muted over surface) was 2.26:1 against the map card; task 3.5 moved it to the design formula.
  it('styles.css .land uses the design formula', () => {
    expect(landRule(readSource('apps/atlas/src/styles.css'))).toEqual(DESIGN_LAND);
  });
  it('fails when a variable cannot be resolved', () => {
    const r = measure(mutate(sources, 'tokens', '--color-surface-raised: #261e2b;', ''));
    expect(r.failures.some((f) => f.includes('--color-surface-raised'))).toBe(true);
  });
});

describe('ui.css reads the variables the matrix measures', () => {
  const ui = stripComments(readSource('skeleton/src/design/ui.css'));
  /** declaration value of `prop` in the first rule whose selector is exactly `selector` */
  const decl = (css: string, selector: string, prop: string): string | undefined => {
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (m[1]!.trim() !== selector) continue;
      const d = new RegExp(`(?:^|[;\\s])${prop}\\s*:\\s*([^;]+)`).exec(m[2]!);
      if (d) return d[1]!.trim();
    }
    return undefined;
  };
  const bindings: [string, string, string][] = [
    ['.btn-primary', 'background', 'var(--color-accent)'],
    ['.btn-primary', 'color', 'var(--color-bg)'],
    ['.btn-primary:hover', 'background', 'var(--color-glow)'],
    ['.btn-secondary', 'color', 'var(--color-glow)'],
    ['.btn-secondary', 'border-color', 'var(--color-accent)'],
    ['.btn-ghost', 'color', 'var(--color-ink)'],
    ['.link', 'color', 'var(--color-link, var(--color-glow))'],
    [':focus-visible', 'outline', '3px solid var(--color-ring, var(--color-glow))'],
    ['.panel', 'background', 'var(--color-surface)'],
    ['.panel', 'color', 'var(--color-ink)'],
    ['.panel', 'border', '1px solid var(--color-muted)'],
    ['.panel-raised', 'background', 'var(--color-surface-raised)'],
  ];
  it.each(bindings)('%s sets %s to %s', (selector, prop, value) => {
    expect(decl(ui, selector, prop)).toBe(value);
  });
  it('the binding check fails when a rule is changed', () => {
    const broken = ui.replace('color: var(--color-bg);', 'color: var(--color-ink);');
    expect(decl(broken, '.btn-primary', 'color')).not.toBe('var(--color-bg)');
  });
});

describe('ember is only a flat fill colour on paper', () => {
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? (f === 'node_modules' ? [] : files(p)) : /\.(css|tsx?)$/.test(f) ? [p] : [];
    });
  /** places that read ember as a text colour or reference it outside its definition and the danger-ink re-point */
  const offenders = (name: string, text: string): string[] => {
    const hits: string[] = [];
    for (const m of stripComments(text).replace(/^\s*\/\/.*$/gm, '').matchAll(/([^\n;{}]*(?:--book-ember|--color-ember|BOOK_EMBER|text-ember)[^\n;{}]*)/g)) {
      const line = m[1]!.trim();
      if (/^--(book|color)-ember\s*:\s*#[0-9a-f]{6}$/i.test(line)) continue; // definition
      if (/^--color-danger-ink\s*:\s*var\(--book-ember\)$/.test(line)) continue; // the one allowed re-point
      if (/^export const BOOK_EMBER\b/.test(line)) continue;
      hits.push(`${name}: ${line}`);
    }
    return hits;
  };
  it('no stylesheet or component uses ember as a text colour', () => {
    const base = fileURLToPath(new URL('../../', import.meta.url));
    const all = [join(base, 'skeleton/src'), ...readdirSync(join(base, 'apps')).map((a) => join(base, 'apps', a, 'src'))].flatMap(files);
    expect(all.length).toBeGreaterThan(20);
    expect(all.flatMap((f) => offenders(f, readSource(f.slice(base.length))))).toEqual([]);
  });
  it('the scan fails when a rule uses ember as text colour', () => {
    expect(offenders('x.css', '.a { color: var(--book-ember); }')).not.toEqual([]);
    expect(offenders('x.tsx', '<p className="text-ember">')).not.toEqual([]);
  });
  it('ember on the textured paper floor is below 4.5:1, which is why it is flat-fill only', () => {
    const { paper } = scopesOf(sources);
    const ember = resolve('var(--book-ember)', paper);
    expect(contrastRatio(ember, PAPER_FLOOR)).toBeLessThan(AA_TEXT);
    expect(contrastRatio(ember, resolve('var(--book-card)', paper))).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

const hex = fc.integer({ min: 0, max: 0xffffff }).map((n) => `#${n.toString(16).padStart(6, '0')}`);
const paletteText = (p: { background: string; surface: string; ink: string; accent: string; glow: string }) =>
  `background ${p.background}; surface ${p.surface}; ink ${p.ink}; accent ${p.accent}; danger #ff0000; glow ${p.glow}`;

/** Pairs the shared button, link and ring use on a pack, against the pack's own background and surface. */
const pairFailures = (p: { background: string; surface: string }, v: Record<string, string>): string[] => {
  const out: string[] = [];
  const check = (label: string, fg: string, bg: string, min: number) => {
    const r = contrastRatio(fg, bg);
    if (r < min) out.push(`${label}: ${r.toFixed(2)}:1, needs ${min}:1`);
  };
  for (const [name, bg] of [['background', p.background], ['surface', p.surface]] as const) {
    check(`ink on ${name}`, v['--color-ink']!, bg, AA_TEXT);
    check(`accent on ${name}`, v['--color-accent']!, bg, AA_TEXT);
    check(`glow (link, secondary label) on ${name}`, v['--color-glow']!, bg, AA_TEXT);
    check(`ring (glow) on ${name}`, v['--color-glow']!, bg, AA_LARGE);
  }
  check('primary label (bg on accent)', p.background, v['--color-accent']!, AA_TEXT);
  check('primary label on hover (bg on glow)', p.background, v['--color-glow']!, AA_TEXT);
  return out;
};
const packFailures = (theme: { palette: string; displayFont: string; bodyFont: string }): string[] =>
  pairFailures(parsePalette(theme.palette), resolveTheme(theme).vars);

describe('Property 2: Theme packs keep the shared button, link and ring readable', () => {
  // Feature: ui-rework, Property 2: Theme packs keep the shared button, link and ring readable
  it('all twelve real packs', () => {
    // **Validates: Requirements 4.6, 10.5, 14.4**
    expect(allLegends).toHaveLength(12);
    for (const l of allLegends) expect(packFailures(l.theme), l.id).toEqual([]);
  });
  it('any generated palette is either refused or readable', () => {
    // **Validates: Requirements 4.6, 10.5, 14.4**
    fc.assert(
      fc.property(fc.record({ background: hex, surface: hex, ink: hex, accent: hex, glow: hex }), (p) => {
        try {
          expect(packFailures({ palette: paletteText(p), displayFont: 'PT Serif', bodyFont: 'PT Serif' })).toEqual([]);
        } catch (e) {
          if (!(e instanceof ThemeError)) throw e;
        }
      }),
      { numRuns: 300 },
    );
  });
  it('the check fails when glow equals the background or the accent is unreadable', () => {
    const p = parsePalette(allLegends[0]!.theme.palette);
    const good = resolveTheme(allLegends[0]!.theme).vars;
    expect(pairFailures(p, good)).toEqual([]);
    expect(pairFailures(p, { ...good, '--color-glow': p.background }).length).toBeGreaterThan(0);
    expect(pairFailures(p, { ...good, '--color-accent': p.background }).length).toBeGreaterThan(0);
  });
});
