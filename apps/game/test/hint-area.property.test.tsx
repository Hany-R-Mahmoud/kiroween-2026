import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fc from 'fast-check';
import type { PlayView } from '@kiroween/skeleton/client';
import { describe, expect, it, vi } from 'vitest';
import { en } from '../src/i18n/en.ts';
import { translate } from '../src/i18n/t.ts';
import { worldLayout } from '../src/layout/index.ts';
import { activeSlot, markedIds } from '../src/lib/world.ts';

vi.mock('../src/i18n/useT.ts', () => ({
  useT: () => (key: keyof typeof en, vars?: Record<string, string | number>) => translate('en', key, vars),
  useLang: () => 'en',
}));
vi.mock('../src/i18n/useT', () => ({
  useT: () => (key: keyof typeof en, vars?: Record<string, string | number>) => translate('en', key, vars),
  useLang: () => 'en',
}));
const { WorldPlay } = await import('../src/components/WorldPlay.tsx');

// Feature: ui-rework, Property 7: One hint pair, offered only for an open puzzle
// **Validates: Requirements 26.1, 26.2, 26.3, 26.6**

const noop = () => {};
const scenes = [{ id: 'sc-kitchen', name: 'The kitchen', alt: 'A cold kitchen' }];
const hotspots = [{ id: 'hs-dresser', sceneId: 'sc-kitchen', name: 'A dresser' }];
const STATES = ['hidden', 'locked', 'open', 'solved'] as const;
const TYPES = ['weakness', 'symbol', 'date-or-number'] as const;

const slotArb = fc.record({ state: fc.constantFrom(...STATES), type: fc.constantFrom(...TYPES), used2: fc.boolean() });

function viewOf(specs: { state: (typeof STATES)[number]; type: (typeof TYPES)[number]; used2: boolean }[]): PlayView {
  return {
    legendId: 'banshee',
    status: 'in_progress',
    fear: 10,
    slots: specs.map((s, i) => ({
      slotId: `pz-${i + 1}`,
      index: i + 1,
      type: s.type,
      final: false,
      state: s.state,
      ...(s.state === 'open' ? { question: 'q', options: ['a', 'b', 'c', 'd'], ...(s.used2 ? { hint2: { anchor: `banshee--ch-${i + 1}` } } : {}) } : {}),
    })) as unknown as PlayView['slots'],
    leads: [],
  };
}
function render(view: PlayView, chosenSlot: string | null): string {
  return renderToStaticMarkup(
    createElement(WorldPlay, {
      legendId: 'banshee', title: 'The Banshee', mediaBase: 'http://localhost:3001', scenes, hotspots, layout: worldLayout('banshee'),
      sceneIndex: 0, onScene: noop, view, reply: null, marked: markedIds(view), relic: null, restartNotice: false, chosenSlot,
      busy: false, failed: false, onChoose: noop, onTap: noop, onHint1: noop, onHint2: noop, onAnswer: noop, onFollow: noop,
      onDismissRestart: noop, onHall: noop, onRetry: noop, run: 0,
    }),
  );
}
const labels = (html: string): { hint1: string[]; hint2: string[]; link: string[] } => ({
  hint1: [...html.matchAll(/<button[^>]*aria-label="(Hint 1 \(free\)[^"]*)"/g)].map((m) => m[1]!),
  hint2: [...html.matchAll(/<button[^>]*aria-label="(Hint 2 \(raises fear\)[^"]*)"/g)].map((m) => m[1]!),
  link: [...html.matchAll(/<a[^>]*data-hint2-link="true"[^>]*aria-label="([^"]*)"|<a[^>]*aria-label="([^"]*)"[^>]*data-hint2-link="true"/g)].map((m) => (m[1] ?? m[2])!),
});

describe('Property 7: one hint pair, offered only for an open puzzle', () => {
  it('renders one Hint 1 and at most one Hint 2 (or the free link), none unless the active puzzle is open, each named with the puzzle', () => {
    fc.assert(
      fc.property(fc.array(slotArb, { minLength: 1, maxLength: 6 }), fc.nat(10), (specs, pick) => {
        const view = viewOf(specs);
        const chosen = pick < specs.length ? `pz-${pick + 1}` : null;
        const slot = activeSlot(view, chosen);
        const { hint1, hint2, link } = labels(render(view, chosen));
        if (!slot || slot.state !== 'open') {
          expect(hint1).toHaveLength(0);
          expect(hint2).toHaveLength(0);
          expect(link).toHaveLength(0);
          return;
        }
        expect(hint1).toHaveLength(1);
        expect(hint2.length + link.length).toBe(1);
        expect(hint2.length).toBe(slot.hint2 ? 0 : 1);
        for (const name of [...hint1, ...hint2, ...link]) expect(name).toContain(`Puzzle ${slot.index}:`);
      }),
      { numRuns: 100 },
    );
  });
  it('a five-puzzle world with every puzzle open still shows one pair', () => {
    const view = viewOf(Array.from({ length: 5 }, () => ({ state: 'open' as const, type: 'weakness' as const, used2: false })));
    const html = render(view, 'pz-4');
    expect(labels(html).hint1).toHaveLength(1);
    expect(labels(html).hint2).toHaveLength(1);
  });
});
