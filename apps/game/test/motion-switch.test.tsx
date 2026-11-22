// Task 7.5 (Requirement 32.5): the motion setting is a styled switch with the same label, checked state and storage.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { translate } from '../src/i18n/t.ts';
import { en } from '../src/i18n/en.ts';
import { measure, loadSources } from '../../../skeleton/test/helpers/uiContrast.ts';

vi.mock('../src/i18n/useT', () => ({
  useT: () => (key: keyof typeof en, vars?: Record<string, string | number>) => translate('en', key, vars),
}));
const { MotionToggle } = await import('../src/components/MotionToggle.tsx');

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');
/** Rule bodies whose selector list contains `needle`; a trailing `$` in needle means the selector must end there. */
export const rulesFor = (css: string, needle: string): string[] => {
  const exact = needle.endsWith('$');
  const n = exact ? needle.slice(0, -1) : needle;
  return [...strip(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((m) => m[1]!.split(',').some((sel) => (exact ? sel.trim().endsWith(n) : sel.includes(n))))
    .map((m) => m[2]!);
};

describe('motion switch markup', () => {
  const html = (reduced: boolean) => renderToStaticMarkup(<MotionToggle reduced={reduced} onChange={() => {}} />);
  it('is an input with role=switch inside the same label, same text, checked follows reduced', () => {
    const on = html(true);
    expect(on).toMatch(/<label class="motion-toggle"><input[^>]*type="checkbox"[^>]*role="switch"/);
    expect(on).toContain(en['settings.motion']);
    expect(on).toMatch(/checked=""/);
    expect(html(false)).not.toMatch(/checked/);
  });
});

describe('motion switch styling', () => {
  const css = read('../src/components/fear.css');
  const SW = ".motion-toggle input[role='switch']";
  it('uses tokens and logical properties only, with a 44 px target', () => {
    const all = rulesFor(css, '.motion-toggle').join('\n');
    expect(all).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(all).not.toMatch(/\b(left|right|margin-left|margin-right|padding-left|padding-right|width|height)\s*:/);
    expect(rulesFor(css, '.motion-toggle$')[0]).toMatch(/min-block-size:\s*44px/);
  });
  it('colours the states from the tokens the contrast matrix measures', () => {
    expect(rulesFor(css, SW + '$')[0]).toMatch(/border:\s*2px solid var\(--color-muted\)/);
    expect(rulesFor(css, SW + '::before$')[0]).toMatch(/background-color:\s*var\(--color-muted\)/);
    expect(rulesFor(css, SW + ':checked$')[0]).toMatch(/background-color:\s*var\(--color-accent\)/);
    expect(rulesFor(css, SW + ':checked::before$')[0]).toMatch(/background-color:\s*var\(--color-bg\)/);
  });
  it('has no transition of its own under reduced motion (system and in-app)', () => {
    // transitions run through --motion, and an explicit `transition: none` covers both switches
    expect(rulesFor(css, SW + '$')[0]).toMatch(/calc\(var\(--motion\) \* \d+ms\)/);
    const mq = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/g;
    const inMedia = [...strip(css).matchAll(mq)].map((m) => m[1]!).join('\n');
    expect(inMedia).toMatch(/\.motion-toggle input\[role='switch'\]::before[\s\S]*transition:\s*none/);
    const inApp = rulesFor(css, "html[data-motion='reduce'] .motion-toggle input[role='switch']");
    expect(inApp.join('\n')).toMatch(/transition:\s*none/);
  });
  it('fails when the rules are broken (self-check on a damaged copy)', () => {
    const damaged = css.replace(/transition: none;/g, '');
    expect(rulesFor(damaged, "html[data-motion='reduce'] .motion-toggle").join('')).not.toMatch(/transition:\s*none/);
  });
});

describe('motion switch contrast (matrix rows D21a to D21c)', () => {
  it('every switch state pair reaches 3:1', () => {
    const { measured, failures } = measure(loadSources());
    expect(measured.filter((m) => m.id.startsWith('D21')).length).toBe(3);
    expect(failures).toEqual([]);
  });
  it('fails when the muted token drops below 3:1 on the page', () => {
    const s = loadSources();
    const r = measure({ ...s, tokens: s.tokens.replace('--color-muted: #9c9285', '--color-muted: #1c1620') });
    expect(r.failures.some((f) => f.includes('D21a'))).toBe(true);
  });
});
