import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import { en } from '../src/i18n/en.ts';
import { translate } from '../src/i18n/t.ts';
import { HUB_DOOR_IDS, HUB_SCENE } from '../src/layout/hub.ts';
import { cabinetSlots, clockKey, cursesLeft, DOOR_LEGEND, doorLegendId, hallDoorState, OBJECT_LABEL } from '../src/lib/hall.ts';
import { fileURLToPath } from 'node:url';
import { loadLegends } from '@kiroween/skeleton';

vi.mock('../src/i18n/useT.ts', () => ({
  useT: () => (key: keyof typeof en, vars?: Record<string, string | number>) => translate('en', key, vars),
  useLang: () => 'en',
}));
const { HallView } = await import('../src/components/Hall.tsx');

const IDS = HUB_DOOR_IDS.map((d) => DOOR_LEGEND[d]);
const doors = IDS.map((id) => ({ id, title: `Title ${id}`, open: id === 'banshee', atlasHref: `http://atlas.test/legends/${id}` }));
const base = { doors, relics: [], ledger: [], current: null };
const render = (props: Partial<Parameters<typeof HallView>[0]> = {}): string =>
  renderToStaticMarkup(
    createElement(HallView, { data: base, mediaBase: '', tutorialDone: true, broken: [], curses: 12, onNavigate: () => {}, ...props } as Parameters<typeof HallView>[0]) as ReactElement,
  );

describe('hall rules (property 22)', () => {
  it('door state follows the tutorial flag, then the access rule', () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), (done, may) => {
        const s = hallDoorState(done, may);
        expect(s).toBe(!done ? 'locked' : may ? 'open' : 'signin');
      }),
    );
  });
  it('curses remaining is 12 minus distinct broken worlds', () => {
    fc.assert(fc.property(fc.array(fc.constantFrom(...IDS)), (broken) => {
        expect(cursesLeft(broken)).toBe(12 - new Set(broken).size);
      }),
    );
  });
  it('clock key: dawn at zero, singular at one, plural otherwise', () => {
    expect(clockKey(0, 'en')).toBe('hub.clock.dawn');
    expect(clockKey(1, 'en')).toBe('hub.clock.one');
    expect(clockKey(12, 'en')).toBe('hub.clock');
  });
  it('maps door hotspot ids to legend ids and refuses others', () => {
    expect(doorLegendId('hub-door-banshee')).toBe('banshee');
    expect(doorLegendId('hub-lamp')).toBeNull();
    expect(doorLegendId('hub-door-nope')).toBeNull();
  });
  it('all 12 doors map to real, distinct legend ids from the legend list', () => {
    const { legends } = loadLegends(fileURLToPath(new URL('../../../content/legends/', import.meta.url)));
    const real = legends.map((l) => l.id);
    const mapped = HUB_DOOR_IDS.map((d) => doorLegendId(d));
    expect(mapped).toHaveLength(12);
    for (const m of mapped) expect(real, String(m)).toContain(m);
    expect(new Set(mapped).size).toBe(12);
    expect(doorLegendId('hub-door-dutchman')).toBe('flying-dutchman');
  });
  it('every door gets its title label and relic slot, not the lamp fallback', () => {
    const open = render({ data: { ...base, doors: doors.map((d) => ({ ...d, open: true })) } });
    const locked = render({ tutorialDone: false });
    for (const id of IDS) {
      expect(open, id).toContain(`Enter Title ${id}`);
      expect(locked, id).toContain(`Title ${id}`);
    }
    expect(locked.match(/data-badge="lock"/g)).toHaveLength(12);
    const relics = IDS.map((legendId) => ({ legendId, assetId: `${legendId}-game-relic-01`, name: legendId }));
    expect(cabinetSlots(relics, ['flying-dutchman'])[0]?.legendId).toBe('flying-dutchman');
  });
  it('the cabinet has twelve slots and fills only broken worlds', () => {
    const relics = [{ legendId: 'banshee', assetId: 'banshee-game-relic-01', name: null }];
    const slots = cabinetSlots(relics, ['banshee']);
    expect(slots).toHaveLength(12);
    expect(slots.filter(Boolean)).toHaveLength(1);
    expect(cabinetSlots(relics, []).filter(Boolean)).toHaveLength(0);
  });
  it('every non-door hotspot has a label key', () => {
    for (const h of HUB_SCENE.hotspots) if (!doorLegendId(h.id)) expect(OBJECT_LABEL[h.id], h.id).toBeDefined();
  });
});

describe('Hall render', () => {
  it('renders 18 named buttons, a pan control pair, and no door cards', () => {
    const html = render();
    expect(html.match(/data-hotspot="/g)).toHaveLength(18);
    expect(html).toContain('Pan left');
    expect(html).not.toContain('Locked: sign in to enter');
    expect(html).not.toContain('Open</span>');
  });
  it('locks every door before the tutorial', () => {
    const html = render({ tutorialDone: false });
    expect(html.match(/data-badge="lock"/g)).toHaveLength(12);
    expect(html).toContain(en['hub.door.locked']);
  });
  it('after the tutorial a guest opens one door and sees sign-in on eleven', () => {
    const html = render();
    expect(html.match(/data-badge="signin"/g)).toHaveLength(11);
    expect(html).not.toContain('data-badge="lock"');
    expect(html).toContain('Enter Title banshee');
  });
  it('a signed-in player has no badges', () => {
    const html = render({ data: { ...base, doors: doors.map((d) => ({ ...d, open: true })) } });
    expect(html).not.toContain('data-badge');
  });
  it('every door has a Read the legend link through the atlas href', () => {
    const html = render();
    for (const id of IDS) expect(html).toContain(`href="http://atlas.test/legends/${id}"`);
  });
  it('shows the sign-in prompt in a guest door panel', () => {
    const html = render({ initialPanel: { kind: 'door', id: 'baba-yaga' } });
    expect(html).toContain(en['hub.door.signin']);
    expect(html).toContain('Sign in');
  });
  it('clock panel shows hours and no timer', () => {
    const html = render({ initialPanel: { kind: 'clock' }, curses: 11 });
    expect(html).toContain('11 hours until dawn.');
    expect(html).not.toContain('<time');
  });
  it('ledger shows seed only for ended runs', () => {
    const html = render({
      initialPanel: { kind: 'ledger' },
      curses: 11,
      data: { ...base, current: { legendId: 'banshee', title: 'Banshee', fear: 40 }, ledger: [{ id: 'r1', title: 'Banshee', status: 'won', seed: 'seed-ended' }] },
    });
    expect(html).toContain('Fear: 40 of 100');
    expect(html).toContain('Seed seed-ended.');
    expect(html).toContain('Curses remaining: 11');
  });
  it('cabinet shows twelve slots with a relic and empty slots', () => {
    const html = render({ initialPanel: { kind: 'cabinet' }, broken: ['banshee'], data: { ...base, relics: [{ legendId: 'banshee', assetId: 'banshee-game-relic-01', name: 'The Silver Comb' }] } });
    expect(html.match(/hall-cabinet-slot/g)).toHaveLength(12);
    expect(html).toContain('The Silver Comb');
    expect(html.match(/An empty slot\./g)).toHaveLength(11);
  });
  it('decoys show the catalog sentence only', () => {
    expect(render({ initialPanel: { kind: 'decoy', id: 'hub-jars' } })).toContain(en['hub.jars']);
  });
  it('the ending screen appears only when every curse is broken', () => {
    expect(render({ curses: 1 })).not.toContain('data-ending');
    const html = render({ curses: 0 });
    expect(html).toContain('data-ending');
    expect(html).toContain('shared-game-ui-dawn-01');
    expect(html).toContain(en['hub.ending']);
  });
});
