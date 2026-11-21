import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { en } from '../src/i18n/en.ts';
import { translate } from '../src/i18n/t.ts';
import { TUTORIAL_SCENE } from '../src/layout/tutorial.ts';
import { answerToSend, isWrongCode, TUTORIAL_LABEL, TUTORIAL_TAP_TEXT, tutorialHint2Href } from '../src/lib/tutorial.ts';

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
const view = { fear: 0, hint1: { text: 'One pin is newer than the rest.', highlight: ['tut-corkboard'] }, solved: false } as NonNullable<Props['view']>;
const render = (p: Partial<Props> = {}): string =>
  renderToStaticMarkup(
    createElement(TutorialRoom, {
      view,
      reply: null,
      question: null,
      mediaBase: '',
      atlasOrigin: 'http://atlas.test',
      reduced: false,
      busy: false,
      failed: false,
      onRetry: () => {},
      onDrawer: () => {},
      onHint2: () => {},
      onAnswer: () => {},
      onHall: () => {},
      ...p,
    } as Props) as ReactElement,
  );

describe('tutorial helpers', () => {
  it('Hint 2 opens the Keeper\u2019s Note chapter on the atlas origin', () => {
    expect(tutorialHint2Href('keepers-note--ch-1', 'http://atlas.test/')).toBe('http://atlas.test/legends/keepers-note#keepers-note--ch-1');
    expect(tutorialHint2Href('keepers-note--ch-1', '')).toBe('/legends/keepers-note#keepers-note--ch-1');
    expect(tutorialHint2Href('not an anchor', '')).toBeNull();
  });
  it('answers are trimmed and limited to 40 characters', () => {
    expect(answerToSend('  1887 ')).toBe('1887');
    expect(answerToSend('   ')).toBeNull();
    expect(answerToSend('1'.repeat(41))).toBeNull();
  });
  it('only a refused answer reply is a wrong code', () => {
    expect(isWrongCode({ kind: 'answer', correct: false })).toBe(true);
    expect(isWrongCode({ kind: 'answer', correct: true })).toBe(false);
    expect(isWrongCode(null)).toBe(false);
  });
  it('every Hotspot has a catalog name, and every non-drawer Hotspot has a tap sentence', () => {
    expect(TUTORIAL_SCENE.hotspots.length).toBeGreaterThan(0);
    for (const h of TUTORIAL_SCENE.hotspots) {
      expect(TUTORIAL_LABEL[h.id], h.id).toBeDefined();
      expect(TUTORIAL_LABEL[h.id]! in en).toBe(true);
      if (h.id !== 'tut-drawer') expect(TUTORIAL_TAP_TEXT[h.id]! in en, h.id).toBe(true);
    }
  });
});

describe('tutorial start failure', () => {
  it('replaces the loading line with the failure text and a retry button', () => {
    const html = render({ view: null, failed: true });
    expect(html).toContain(en['play.startFailed']);
    expect(html).toMatch(new RegExp(`<button[^>]*>${en['play.retry']}</button>`));
    expect(html).not.toContain(en['loading.study']);
  });
  it('shows the loading line while start is running, and no retry once the room is open', () => {
    expect(render({ view: null })).toContain(en['loading.study']);
    expect(render({ failed: true })).not.toContain(en['play.startFailed']);
  });
});

describe('tutorial room render', () => {
  it('shows the pan prompt, seven tap regions, the fear meter and the back-to-hall control', () => {
    const html = render();
    expect(html).toContain(en['tut.pan']);
    for (const h of TUTORIAL_SCENE.hotspots) expect(html).toContain(`data-hotspot="${h.id}"`);
    expect((html.match(/data-hotspot=/g) ?? []).length).toBe(7);
    expect(html).toContain('role="meter"');
    expect(html).toContain(en['world.hall']);
    expect(html).toContain('tutorial-game-scene-01');
  });
  it('shows a loading line and no meter before the server answers', () => {
    const html = render({ view: null });
    expect(html).toContain(en['loading.study']);
    expect(html).not.toContain('role="meter"');
  });
  it('the drawer panel shows the server question and a code input', () => {
    const html = render({ initialPanel: { kind: 'drawer' }, question: 'How many keys?' });
    expect(html).toContain('How many keys?');
    expect(html).toContain('id="tutorial-code"');
    expect(html).not.toContain(en['tut.drawer.wrong']);
  });
  it('a refused code shows the fixed sentence', () => {
    const html = render({ initialPanel: { kind: 'drawer' }, question: 'q', reply: { kind: 'answer', correct: false } });
    expect(html).toContain(en['tut.drawer.wrong']);
  });
  it('Hint 2 gives a new-tab link with rel noopener once used', () => {
    const html = render({ view: { ...view, fear: 10, hint2: { anchor: 'keepers-note--ch-1' } } });
    expect(html).toContain('href="http://atlas.test/legends/keepers-note#keepers-note--ch-1"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener"');
    expect(render()).not.toContain('data-hint2-link');
  });
  it('a solved tutorial shows the key, the glowing first slot and the way back to the hall', () => {
    const html = render({ view: { ...view, solved: true, reward: { key: true, firstSlotGlow: true } } });
    expect(html).toContain('shared-game-ui-key-01');
    expect(html).toContain('data-glow="true"');
    expect(html).toContain(en['tut.reward']);
    expect(html).toContain(en['tut.reward.line']);
    expect(html).not.toContain('An empty slot');
    expect(html).toContain(en['tut.toHall']);
  });
  it('shows a pending line, aria-busy and an aria-disabled Hint 2 while a call is pending', () => {
    const html = render({ busy: true });
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain(en['play.pending']);
    expect(html).toMatch(/<button[^>]*aria-disabled="true"[^>]*>/);
    expect(render()).not.toContain(en['play.pending']);
  });
  it('the corkboard is not marked until Hint 1 is asked', () => {
    expect(render()).not.toContain('data-marked');
  });
});
