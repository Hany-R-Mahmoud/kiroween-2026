import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { en } from '../src/i18n/en.ts';
import { translate } from '../src/i18n/t.ts';
import { isHintable } from '../src/lib/world.ts';

vi.mock('../src/i18n/useT.ts', () => ({
  useT: () => (key: keyof typeof en, vars?: Record<string, string | number>) => translate('en', key, vars),
  useLang: () => 'en',
}));
vi.mock('../src/i18n/useT', () => ({
  useT: () => (key: keyof typeof en, vars?: Record<string, string | number>) => translate('en', key, vars),
  useLang: () => 'en',
}));
const { HintArea } = await import('../src/components/HintArea.tsx');

type Props = Parameters<typeof HintArea>[0];
const noop = () => {};
const render = (over: Partial<Props> = {}): string =>
  renderToStaticMarkup(
    createElement(HintArea, { puzzle: 'Puzzle 3: Weakness', offered: true, busy: false, hint1Text: null, hint2Href: null, onHint1: noop, onHint2: noop, ...over }),
  );
const count = (html: string, re: RegExp): number => [...html.matchAll(re)].length;

describe('HintArea', () => {
  it('shows exactly one Hint 1 and one Hint 2 button, each named with the puzzle', () => {
    const html = render();
    expect(count(html, /<button[^>]*>\s*Hint 1 \(free\)</g)).toBe(1);
    expect(count(html, /<button[^>]*>\s*Hint 2 \(raises fear\): opens the atlas</g)).toBe(1);
    expect(html).toContain('aria-label="Hint 1 (free), Puzzle 3: Weakness"');
    expect(html).toContain('aria-label="Hint 2 (raises fear): opens the atlas, Puzzle 3: Weakness"');
    expect(html).toContain('Puzzle 3: Weakness');
  });
  it('uses aria-disabled, never disabled, while busy, and neither when idle', () => {
    const busy = render({ busy: true });
    const buttons = [...busy.matchAll(/<button([^>]*)>/g)].map((m) => m[1]!);
    expect(buttons).toHaveLength(2);
    for (const attrs of buttons) {
      expect(attrs).toContain('aria-disabled="true"');
      expect(attrs).not.toMatch(/\sdisabled(=|\s|$)/);
    }
    expect(render()).not.toContain('aria-disabled');
  });
  it('replaces the Hint 2 button by a free new-tab link named with the puzzle once Hint 2 was used', () => {
    const html = render({ hint2Href: 'http://atlas.test/legends/banshee#banshee--ch-2' });
    expect(html).toContain('href="http://atlas.test/legends/banshee#banshee--ch-2"');
    expect(html).toContain('target="_blank" rel="noopener"');
    expect(html).toContain('Open the chapter again (free)');
    expect(html).toContain('aria-label="Open the chapter again (free), Puzzle 3: Weakness"');
    expect(html).not.toContain('Hint 2 (raises fear)');
    expect(count(html, /<button[^>]*>\s*Hint 1 \(free\)</g)).toBe(1);
  });
  it('shows the Hint 1 text in a labelled sheet with a close button, and no sheet without text', () => {
    const html = render({ hint1Text: 'Look near the hearth.' });
    expect(html).toContain('class="hint-sheet');
    expect(html).toContain('role="region"');
    expect(html).toContain('Look near the hearth.');
    expect(html).toContain(en['tut.close']);
    expect(render()).not.toContain('hint-sheet');
  });
  it('offers no buttons and no sheet when the puzzle is not offered', () => {
    const html = render({ offered: false, hint1Text: 'Look near the hearth.' });
    expect(html).toBe('');
  });
  it('asks the player to open a puzzle when none is active', () => {
    const html = render({ puzzle: null, offered: false });
    expect(html).toContain(en['hint.area.pick']);
    expect(html).not.toContain('<button');
    expect(html).not.toContain('Hint 1 (free)');
  });
  it('fails the one-pair rule when the markup repeats a pair (failing-input check)', () => {
    const twice = render() + render();
    expect(count(twice, /<button[^>]*>\s*Hint 1 \(free\)</g)).not.toBe(1);
  });
  it('isHintable is true only for an open puzzle (Requirement 26.3)', () => {
    for (const state of ['hidden', 'locked', 'solved'] as const) expect(isHintable({ state } as never)).toBe(false);
    expect(isHintable({ state: 'open' } as never)).toBe(true);
    expect(isHintable(null)).toBe(false);
  });
});
