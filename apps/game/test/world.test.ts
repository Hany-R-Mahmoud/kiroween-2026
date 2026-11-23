import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fc from 'fast-check';
import type { PlayView } from '@kiroween/skeleton/client';
import { describe, expect, it, vi } from 'vitest';
import { Hotspot } from '../src/components/Hotspot.tsx';
import { en } from '../src/i18n/en.ts';
import { translate } from '../src/i18n/t.ts';
import { fearEventsOf, worldLayout } from '../src/layout/index.ts';
import { readFileSync } from 'node:fs';
import { atlasHref, chooseFearEvent, hint1Marks, markedIds, reducedLineOf, triggerOf } from '../src/lib/world.ts';

vi.mock('../src/i18n/useT.ts', () => ({
  useT: () => (key: keyof typeof en, vars?: Record<string, string | number>) => translate('en', key, vars),
  useLang: () => 'en',
}));
vi.mock('../src/i18n/useT', () => ({
  useT: () => (key: keyof typeof en, vars?: Record<string, string | number>) => translate('en', key, vars),
  useLang: () => 'en',
}));
const { WorldPlay } = await import('../src/components/WorldPlay.tsx');

const scenes = [
  { id: 'sc-kitchen', name: 'The kitchen', alt: 'A cold kitchen' },
  { id: 'sc-ford', name: 'The ford', alt: 'A grey ford' },
  { id: 'sc-loft', name: 'The loft', alt: 'A dusty loft' },
];
const hotspots = [
  { id: 'hs-dresser', sceneId: 'sc-kitchen', name: 'A dresser' },
  { id: 'hs-cat', sceneId: 'sc-kitchen', name: 'A cat' },
];
const baseView: PlayView = {
  legendId: 'banshee',
  status: 'in_progress',
  fear: 24,
  slots: [
    { slotId: 'pz-1', index: 1, type: 'weakness', final: false, state: 'open', question: 'It fears ____.', options: ['salt', 'iron', 'ash', 'glass'], tried: [1], hint1: { text: 'Look near the hearth.', highlight: ['hs-dresser'] }, hint2: { anchor: 'banshee--ch-2' } },
    { slotId: 'pz-2', index: 2, type: 'symbol', final: false, state: 'hidden' },
    { slotId: 'pz-5', index: 3, type: 'date-or-number', final: true, state: 'locked' },
  ],
  leads: [
    { leadId: 'ld-1', start: 'The washerwoman', total: 3, steps: [{ n: 1, text: 'She was seen at the ford.' }], canFollow: false },
    { leadId: 'ld-2', start: 'The widow', total: 2, steps: [{ n: 1, text: 'A comb was found.' }, { n: 2, text: 'It was not hers.' }], canFollow: true, followed: { kind: 'dead', text: 'The widow died before the song.', anchors: ['banshee--ch-3'] } },
  ],
};
const noop = () => {};
function render(over: Record<string, unknown> = {}, view: PlayView | null = baseView): string {
  return renderToStaticMarkup(
    createElement(WorldPlay, {
      legendId: 'banshee',
      title: 'The Banshee',
      mediaBase: 'http://localhost:3001',
      scenes,
      hotspots,
      layout: worldLayout('banshee'),
      sceneIndex: 0,
      onScene: noop,
      view,
      reply: null,
      marked: markedIds(view),
      relic: null,
      restartNotice: false,
      chosenSlot: null,
      busy: false,
      failed: false,
      onChoose: noop,
      onTap: noop,
      onHint1: noop,
      onHint2: noop,
      onAnswer: noop,
      onFollow: noop,
      onDismissRestart: noop,
      onHall: noop,
      onRetry: noop,
      ...over,
    }),
  );
}

describe('World pending state', () => {
  it('shows a catalog status line, aria-busy and aria-disabled controls (not disabled) while a call is pending', () => {
    const html = render({ busy: true });
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('Working on your last move');
    const hint1 = [...html.matchAll(/<button([^>]*)>\s*Hint 1/g)].map((m) => m[1]!);
    expect(hint1.length).toBeGreaterThan(0);
    // A real `disabled` attribute would drop keyboard focus.
    for (const attrs of hint1) {
      expect(attrs).toContain('aria-disabled="true"');
      expect(attrs).not.toMatch(/\sdisabled(=|\s|$)/);
    }
  });
  it('shows none of it when idle', () => {
    const html = render();
    expect(html).toContain('aria-busy="false"');
    expect(html).not.toContain('Working on your last move');
    expect(html).not.toContain('aria-disabled');
  });
});

describe('World start failure', () => {
  it('replaces the loading line with the failure text and a retry button when start failed', () => {
    const html = render({ failed: true }, null);
    expect(html).toContain(en['play.startFailed']);
    expect(html).toMatch(new RegExp(`<button[^>]*>${en['play.retry']}</button>`));
    expect(html).not.toContain(en['loading.room']);
    expect(html).not.toContain(en['error.generic']);
  });
  it('a tutorial-required refusal shows the locked-door message and a way to the study, not a retry (Phase 5 lock)', () => {
    const html = render({ failed: true, onTutorial: noop }, null);
    expect(html).toContain(en['hub.door.locked']);
    expect(html).toContain(`>${en['hall.tutorial']}</button>`); // the label has brackets, so no RegExp
    expect(html).not.toContain(en['play.retry']);
    expect(html).not.toContain(en['play.startFailed']);
  });
  it('recognises the refusal by its fixed server text only', async () => {
    const { isTutorialRequired } = await import('../src/lib/playClient.ts');
    const { PLAY_ERROR_MESSAGES } = await import('@kiroween/skeleton/client');
    expect(isTutorialRequired(new Error(PLAY_ERROR_MESSAGES['tutorial-required']))).toBe(true);
    expect(isTutorialRequired(new Error(PLAY_ERROR_MESSAGES.unavailable))).toBe(false);
    expect(isTutorialRequired('Do the tutorial first.')).toBe(false);
  });
  it('shows the loading line and no retry while start is still running', () => {
    const html = render({}, null);
    expect(html).toContain(en['loading.room']);
    expect(html).not.toContain(en['play.startFailed']);
  });
  it('keeps the generic alert, not the retry, when a later call fails', () => {
    const html = render({ failed: true });
    expect(html).toContain(en['error.generic']);
    expect(html).not.toContain(en['play.startFailed']);
  });
});

describe('Hint 1 marks from the reply (F7)', () => {
  const noHint: PlayView = { ...baseView, slots: baseView.slots.map((x) => ({ ...x, hint1: undefined })) };
  const open = noHint.slots.find((x) => x.state === 'open')!.slotId;
  it('marks nothing without a reply, marks the replied ids while open, and nothing once the slot is solved', () => {
    expect(hint1Marks(noHint, {}).size).toBe(0);
    expect([...hint1Marks(noHint, { [open]: ['hs-cat'] })]).toEqual(['hs-cat']);
    const solved: PlayView = { ...noHint, slots: noHint.slots.map((x) => (x.slotId === open ? { ...x, state: 'solved' as const } : x)) };
    expect(hint1Marks(solved, { [open]: ['hs-cat'] }).size).toBe(0);
    expect(hint1Marks(noHint, { 'other-slot': ['hs-cat'] }).size).toBe(0);
    expect(hint1Marks(null, { [open]: ['hs-cat'] }).size).toBe(0);
  });
  it('the replied id renders a marked hotspot', () => {
    const html = renderToStaticMarkup(createElement(Hotspot, { box: { id: 'hs-cat', x: 0, y: 0, w: 60, h: 60 }, label: 'A cat', marked: hint1Marks(noHint, { [open]: ['hs-cat'] }).has('hs-cat'), markedText: 'Hint: look here', scale: 1, onActivate: () => {} }));
    expect(html).toContain('data-marked="true"');
  });
  it('WorldPlay keeps the reply highlight per slot and feeds it to the hotspots', () => {
    const src = readFileSync(new URL('../src/components/WorldPlay.tsx', import.meta.url), 'utf8');
    expect(src).toContain('setHint1Highlights((prev) => ({ ...prev, [asked]: highlight }))');
    expect(src).toContain('hint1Marks(view, hint1Highlights)');
    expect(src).toContain('marked: marked.has(h.id)');
  });
});
describe('World pure rules', () => {
  it('marks only the highlights of unsolved slots', () => {
    const view: PlayView = { ...baseView, slots: [baseView.slots[0]!, { ...baseView.slots[1]!, state: 'solved', hint1: { text: 'x', highlight: ['hs-cat'] } }] };
    expect([...markedIds(view)]).toEqual(['hs-dresser']);
    expect(markedIds(null).size).toBe(0);
  });
  it('builds atlas links from ATLAS_ORIGIN and refuses a malformed anchor', () => {
    expect(atlasHref('http://localhost:3001/', 'banshee--ch-2')).toBe('http://localhost:3001/legends/banshee#banshee--ch-2');
    expect(atlasHref('', 'banshee--ch-2')).toBe('/legends/banshee#banshee--ch-2');
    expect(atlasHref('', 'not an anchor')).toBeNull();
  });
  it('maps replies to Fear_Event triggers', () => {
    expect(triggerOf({ kind: 'tap', key: 'tap.nothing', opened: [], collected: 0 })).toEqual({ kind: 'decoy-tap' });
    expect(triggerOf({ kind: 'tap', text: 'x', opened: ['pz-1'], collected: 0 })).toBeNull();
    expect(triggerOf({ kind: 'answer', correct: false, slotId: 'pz-1' })).toEqual({ kind: 'wrong-answer' });
    expect(triggerOf({ kind: 'answer', correct: true, slotId: 'pz-1' })).toBeNull();
    expect(triggerOf({ kind: 'hint2', anchor: 'a--ch-1', charged: true })).toEqual({ kind: 'hint2' });
    expect(triggerOf({ kind: 'hint2', anchor: 'a--ch-1', charged: false })).toBeNull();
  });
  it('plays each event once per Run and scene events only for their scene', () => {
    const entries = fearEventsOf('banshee')!;
    const played = new Set<string>();
    const first = chooseFearEvent(entries, { kind: 'decoy-tap' }, played);
    expect(first?.id).toBe('fe-1');
    played.add('fe-1');
    expect(chooseFearEvent(entries, { kind: 'decoy-tap' }, played)).toBeNull();
    expect(chooseFearEvent(entries, { kind: 'scene-enter', scene: 2 }, new Set())?.id).toBe('fe-3');
    expect(chooseFearEvent(entries, { kind: 'scene-enter', scene: 1 }, new Set())).toBeNull();
  });
  it('every legend has an event for each trigger kind a reply can raise', () => {
    fc.assert(
      fc.property(fc.constantFrom('wrong-answer', 'hint2', 'decoy-tap'), (kind) => {
        for (const id of ['banshee', 'baba-yaga', 'flying-dutchman', 'yuki-onna']) expect(chooseFearEvent(fearEventsOf(id), { kind }, new Set())).not.toBeNull();
      }),
    );
  });
  it('reads the reduced-motion line by id, then by number', () => {
    const entry = fearEventsOf('flying-dutchman')![1]!;
    expect(reducedLineOf([{ id: 'fe-1', reducedMotion: null }, { id: 'fe-2', reducedMotion: 'A lamp dims.' }], entry)).toBe('A lamp dims.');
    expect(reducedLineOf([{ id: 'x:1', reducedMotion: null }, { id: 'x:2', reducedMotion: 'By number.' }], entry)).toBe('By number.');
    expect(reducedLineOf([], entry)).toBeNull();
  });
});

describe('World render', () => {
  it('shows the notebook with number and type before a puzzle opens, and the question with options in served order', () => {
    const html = render();
    expect(html).toContain('Puzzle 2: Symbol');
    expect(html).toContain('Not opened yet');
    expect(html).toContain('Puzzle 3: Date or number');
    expect(html).toContain('Locked until the other puzzles are solved');
    const at = ['salt', 'iron', 'ash', 'glass'].map((o) => html.indexOf(`>${o}`));
    expect(at.every((i) => i > 0)).toBe(true);
    expect(at).toEqual([...at].sort((a, b) => a - b));
    expect(html).toContain('It fears ____.');
  });
  it('disables tried options and only those', () => {
    const buttons = [...render().matchAll(/<button[^>]*class="world-button world-option[^"]*"[^>]*>/g)].map((m) => m[0]);
    expect(buttons).toHaveLength(4);
    expect(buttons.map((b) => b.includes('disabled'))).toEqual([false, true, false, false]);
  });
  it('shows scene navigation with the current scene marked, the deferred spirit figures, and the fear meter text', () => {
    const html = render();
    expect(html).toContain('aria-current="true"');
    expect(html).toContain('The ford');
    expect(html).toContain('class="spirit-corner"');
    // Secondary images wait for the scene image (Requirement 11.4); scene-deferral.property.test.tsx covers the settled markup.
    expect(html).not.toContain('banshee-game-spirit-0');
    expect(html).toContain('Fear: 24 of 100');
  });
  it('Hint 1 text is shown and highlighted hotspots are marked; used Hint 2 becomes a free new-tab link', () => {
    const html = render();
    expect(html).toContain('Look near the hearth.');
    expect(html).toContain('data-marked="true"');
    expect(html).toContain('Hint: look here');
    expect(html).toContain('href="http://localhost:3001/legends/banshee#banshee--ch-2"');
    expect(html).toContain('target="_blank" rel="noopener"');
    expect(html).toContain('Open the chapter again (free)');
    // The active puzzle used Hint 2, so its button is replaced by the link: no Hint 2 button.
    expect(html).not.toContain('Hint 2 (raises fear): opens the atlas');
    expect(html).toContain('Puzzle 1: Weakness');
  });
  it('a five-puzzle world shows exactly one Hint 1 and one Hint 2 for the active puzzle only, named in its label', () => {
    const open = (n: number) => ({ slotId: `pz-${n}`, index: n, type: 'weakness', final: false, state: 'open', question: 'q', options: ['a', 'b', 'c', 'd'] }) as unknown as PlayView['slots'][number];
    const view5: PlayView = { ...baseView, slots: [1, 2, 3, 4, 5].map(open) };
    const html = render({ chosenSlot: 'pz-3' }, view5);
    expect([...html.matchAll(/>\s*Hint 1 \(free\)</g)]).toHaveLength(1);
    expect([...html.matchAll(/>\s*Hint 2 \(raises fear\): opens the atlas</g)]).toHaveLength(1);
    expect(html).toContain('aria-label="Hint 1 (free), Puzzle 3: Weakness"');
    expect(html).toContain('aria-label="Hint 2 (raises fear): opens the atlas, Puzzle 3: Weakness"');
  });
  it('offers no hint buttons when the active puzzle is not open, and asks to open one', () => {
    const hidden: PlayView = { ...baseView, slots: [{ slotId: 'pz-2', index: 1, type: 'symbol', final: false, state: 'hidden' }, { slotId: 'pz-5', index: 2, type: 'date-or-number', final: true, state: 'locked' }] as PlayView['slots'] };
    const html = render({}, hidden);
    expect(html).not.toContain('Hint 1 (free)');
    expect(html).not.toContain('Hint 2 (raises fear)');
    expect(html).toContain('Open a puzzle in the notebook to ask for a hint.');
  });
  it('the notebook renders no hint buttons or hint text of its own', () => {
    const html = render();
    const notebook = html.slice(html.indexOf('world-notebook-title'), html.indexOf('world-leads-title'));
    expect(notebook).not.toContain('Hint 1');
    expect(notebook).not.toContain('Hint 2');
    expect(notebook).not.toContain('Look near the hearth.');
  });
  it('lists collected steps, a dead end with its text and a proof link, and no follow button after following', () => {
    const html = render();
    expect(html).toContain('A thread: The washerwoman');
    expect(html).toContain('1 of 3 steps found');
    expect(html).toContain('She was seen at the ford.');
    expect(html).toContain('This thread ends here.');
    expect(html).toContain('The widow died before the song.');
    expect(html).toContain('href="http://localhost:3001/legends/banshee#banshee--ch-3"');
    expect(html.match(/Follow this thread/g)).toHaveLength(1);
  });
  it('frames the final puzzle with the breaking-the-curse text', () => {
    const view: PlayView = { ...baseView, slots: [{ slotId: 'pz-5', index: 5, type: 'date-or-number', final: true, state: 'open', question: 'Say the year.', options: ['1', '2', '3', '4'] }] };
    const html = render({}, view);
    expect(html).toContain('Break the curse');
    expect(html).toContain('One thing is left. Break the curse.');
  });
  it('shows the restart notice and a button to dismiss it', () => {
    const html = render({ restartNotice: true });
    expect(html).toContain('role="alert"');
    expect(html).toContain('The fear is too much.');
    expect(html).toContain('The room starts over with new details.');
    expect(html).toContain('Try again');
    expect(render()).not.toContain('The fear is too much.');
  });
  it('shows the ending with curse prose, relic, score and the Seed, and no puzzle controls', () => {
    const won: PlayView = { ...baseView, status: 'won', ended: { status: 'won', score: 740, slotsSolved: 5, seed: 'seed-abc', curseText: 'The song is sung.' } };
    const html = render({ relic: { assetId: 'banshee-game-relic-01', name: 'The silver comb' } }, won);
    expect(html).toContain('The curse is broken.');
    expect(html).toContain('The song is sung.');
    expect(html).toContain('banshee-game-relic-01');
    expect(html).toContain('You take The silver comb.');
    expect(html).toContain('Score: 740');
    expect(html).toContain('Seed of this run: seed-abc');
    expect(html).toContain('Back to the hall');
    expect(html).not.toContain('Notebook');
  });
  it('uses the catalog relic name when content gives none (jersey-devil)', () => {
    const won: PlayView = { ...baseView, status: 'won', ended: { status: 'won', score: 1, slotsSolved: 5, seed: 's' } };
    expect(render({ title: 'The Jersey Devil', relic: { assetId: 'jersey-devil-game-relic-01', name: null } }, won)).toContain('You take Relic of The Jersey Devil.');
  });
  it('never shows a Seed before the Run ends, and shows a loading line before the first response', () => {
    expect(render()).not.toContain('Seed of this run');
    expect(render({}, null)).toContain('The room is waking up.');
  });
  it('falls back to a notice for a World with no layout yet', () => {
    expect(render({ layout: null })).toContain('This room is not ready yet.');
  });
});
