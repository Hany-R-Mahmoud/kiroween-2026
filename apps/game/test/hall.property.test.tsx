import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import { en } from '../src/i18n/en.ts';
import { translate } from '../src/i18n/t.ts';
import { HUB_DOOR_IDS } from '../src/layout/hub.ts';
import { DOOR_LEGEND, doorReasonKey, hallDoorState } from '../src/lib/hall.ts';

vi.mock('../src/i18n/useT.ts', () => ({
  useT: () => (key: keyof typeof en, vars?: Record<string, string | number>) => translate('en', key, vars),
  useLang: () => 'en',
}));
const { HallView } = await import('../src/components/Hall.tsx');

const IDS = HUB_DOOR_IDS.map((d) => DOOR_LEGEND[d]);

// Feature: ui-rework, Property 4: Hall door state is the existing rule, with a reason for every closed door
describe('Hall door state (property 4)', () => {
  it('every door name follows hallDoorState, and every closed door carries its reason', () => {
    // **Validates: Requirements 17.3, 17.4, 17.5, 17.8, 17.9, 17.10**
    fc.assert(
      fc.property(fc.boolean(), fc.array(fc.boolean(), { minLength: 12, maxLength: 12 }), fc.boolean(), (done, access, guest) => {
        // A guest may only have the guest world open, whatever the 12 flags say.
        const doors = IDS.map((id, i) => ({
          id,
          title: `Title ${id}`,
          open: guest ? id === 'banshee' && (access[i] ?? false) : (access[i] ?? false),
          atlasHref: `http://atlas.test/legends/${id}`,
        }));
        const html = renderToStaticMarkup(
          createElement(HallView, {
            data: { doors, relics: [], ledger: [], current: null },
            mediaBase: '',
            tutorialDone: done,
            broken: [],
            curses: 12,
            onNavigate: () => {},
          } as Parameters<typeof HallView>[0]) as ReactElement,
        );
        let locks = 0;
        let signins = 0;
        for (const d of doors) {
          const state = hallDoorState(done, d.open);
          const key = doorReasonKey(state);
          expect(key === null).toBe(state === 'open');
          if (key === null) expect(html).toContain(`Enter ${d.title}`);
          else expect(html).toContain(translate('en', 'hub.door.stateNamed', { title: d.title, state: en[key] }));
          if (state === 'locked') locks++;
          if (state === 'signin') signins++;
        }
        expect(html.match(/data-badge="lock"/g)?.length ?? 0).toBe(locks);
        expect(html.match(/data-badge="signin"/g)?.length ?? 0).toBe(signins);
        if (!done) expect(locks).toBe(12);
      }),
      { numRuns: 100 },
    );
  });
});
