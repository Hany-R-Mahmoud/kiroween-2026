import { readFileSync } from 'node:fs';
import { createElement, type ReactElement } from 'react';
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
const { TutorialRoom } = await import('../src/components/TutorialRoom.tsx');

type Props = Parameters<typeof TutorialRoom>[0];
const view = { fear: 0, hint1: { text: 'x', highlight: [] }, solved: false } as unknown as NonNullable<Props['view']>;
const render = (busy: boolean): string =>
  renderToStaticMarkup(
    createElement(TutorialRoom, {
      view, reply: null, question: null, mediaBase: '', atlasOrigin: 'http://atlas.test', reduced: false, busy, failed: false,
      onRetry: () => {}, onDrawer: () => {}, onHint2: () => {}, onAnswer: () => {}, onHall: () => {},
    } as Props) as ReactElement,
  );

const ROW = /<p role="status" class="scene-pending[^"]*"[^>]*>/;
/** Number of elements opened before the pending row: moves if anything is inserted above it. */
const elementsBeforeRow = (html: string): number => {
  const m = ROW.exec(html);
  return m ? html.slice(0, m.index).split('<').length - 1 : -1;
};
const comp = (f: string) => readFileSync(new URL(`../src/components/${f}`, import.meta.url), 'utf8');

describe('no layout shift while a move is processed (item 19)', () => {
  it('the tutorial renders the same pending row, in the same place, idle and busy', () => {
    const idle = render(false);
    const busy = render(true);
    expect(ROW.test(idle)).toBe(true);
    expect(ROW.test(busy)).toBe(true);
    expect(elementsBeforeRow(idle)).toBeGreaterThan(0);
    expect(elementsBeforeRow(busy)).toBe(elementsBeforeRow(idle));
    expect(idle.split('<').length).toBe(busy.split('<').length);
  });
  it('idle shows no text in the row, busy shows play.pending', () => {
    expect(render(false)).not.toContain(en['play.pending']);
    expect(render(true)).toContain(en['play.pending']);
    expect(render(true)).toMatch(/data-pending="true"/);
    expect(render(false)).not.toMatch(/data-pending/);
  });
  it('the checker catches an inserted line (self-test)', () => {
    const inserted = '<div><p role="status" class="scene-pending">x</p></div>';
    const shifted = '<div><p>Working</p><p role="status" class="scene-pending">x</p></div>';
    expect(elementsBeforeRow(shifted)).not.toBe(elementsBeforeRow(inserted));
  });
  it.each(['WorldPlay.tsx', 'TutorialRoom.tsx'])('%s mounts .scene-pending unconditionally with a non-breaking space idle', (f) => {
    const s = comp(f);
    const m = /(\{[^{}\n]*\?\s*)?<p role="status" className="scene-pending[^"]*"/.exec(s);
    expect(m).not.toBeNull();
    expect(m?.[1]).toBeUndefined();
    expect(s).toMatch(/: '\\u00a0'\}/);
    expect(s).not.toMatch(/world-pending/);
  });
  it('scene.css reserves height and adds no animation or transition', () => {
    const css = comp('scene.css');
    const rule = /(?:^|\n)\.scene-pending\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rule).toMatch(/min-block-size:\s*1\.5rem/);
    expect(rule).not.toMatch(/animation|transition|display:\s*none|visibility/);
  });
  // Task 8.F3 (compact dock): the dock places children by `order`, so the DOM order and the reserved rows stay as pinned above.
  it('the compact dock keeps the pending row last and reserves two reply lines', () => {
    const css = comp('scene.css');
    const dockPending = /\.scene-dock\s*>\s*\.scene-pending\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(dockPending).toMatch(/order:\s*4/);
    expect(dockPending).toMatch(/flex:\s*1 1 100%/);
    expect(dockPending).not.toMatch(/animation|transition|display:\s*none|visibility/);
    const reply = /(?:^|\n)\.scene-reply\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(reply).toMatch(/min-block-size:\s*3rem/);
    expect(css).toMatch(/\.scene-stage\s*\{[^}]*margin-inline:\s*auto/);
  });
});
