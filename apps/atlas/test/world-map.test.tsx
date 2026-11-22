import { describe, expect, it } from 'vitest';
import type { HomeLegend } from '../src/components/home';
import { WorldMap } from '../src/components/WorldMap';
import { BUTTON, placeMarkers } from '../src/geo/placeMarkers';
import { translate, type Translate } from '../src/i18n/t';
import { attr, classes, renderInRouter, tags } from './helpers/renderInRouter';

// Requirements 16.3, 16.5, 16.7, 11.5: the pin card has a primary and a ghost button, the swipe hint is visible on
// phones, and every pin is a touch target of at least 44 px.
const t: Translate = (key, vars) => translate('en', key, vars);
const SPECS = [
  { id: 'banshee', title: 'The Banshee', lat: 53, lng: -8 },
  { id: 'el-coco', title: 'El Coco', lat: 40, lng: -4 },
  { id: 'gumiho', title: 'Gumiho', lat: 37, lng: 127 },
];
const places = placeMarkers(SPECS);
const legends: HomeLegend[] = SPECS.map((s) => ({
  id: s.id,
  title: s.title,
  region: 'Somewhere',
  era: 'Old',
  scareLevel: 3,
  readingTimeMin: 9,
  oneLineHook: `Hook of ${s.title}.`,
  mapPoint: { lat: s.lat, lng: s.lng },
  marker: null,
  hero: null,
  continent: 'Europe',
  place: places.find((p) => p.id === s.id)!,
}));

const px = (style: string, prop: string) => Number(new RegExp(`(?:^|;)\\s*${prop}:\\s*([\\d.]+)px`).exec(style)?.[1] ?? 0);
/** The pin buttons: the ones that open a popover (not the ones inside it that close it). */
const pins = (html: string) => tags(html, 'button').filter((b) => attr(b, 'popovertarget') && !attr(b, 'popovertargetaction'));
const smallPins = (html: string) => pins(html).filter((b) => Math.min(px(attr(b, 'style') ?? '', 'inline-size'), px(attr(b, 'style') ?? '', 'block-size')) < 44);

describe('world map', async () => {
  const html = await renderInRouter(<WorldMap legends={legends} t={t} />);

  it('has one pin per legend', () => {
    expect(pins(html)).toHaveLength(legends.length);
  });

  it('makes every pin at least 44 px in both directions', () => {
    expect(BUTTON).toBeGreaterThanOrEqual(44);
    expect(smallPins(html)).toEqual([]);
  });

  it('the pin size check fails for a 40 px pin', () => {
    const bad = html.replace('inline-size:44px', 'inline-size:40px');
    expect(smallPins(bad)).toHaveLength(1);
  });

  it('gives each pin card a primary "Read the legend" link and a ghost Close button that hides the popover', () => {
    const cards = [...html.matchAll(/<div\b[^>]*\bpopover="auto"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g)].map((m) => m[1]!);
    expect(cards).toHaveLength(legends.length);
    for (const card of cards) {
      const read = tags(card, 'a').filter((a) => classes(a).includes('btn-primary'));
      expect(read).toHaveLength(1);
      expect(card).toContain(t('card.read'));
      const close = tags(card, 'button').filter((b) => classes(b).includes('btn-ghost'));
      expect(close).toHaveLength(1);
      expect(attr(close[0]!, 'popovertargetaction')).toBe('hide');
    }
  });

  it('shows the swipe text in a paragraph that is hidden only from 60rem up', () => {
    const p = [...html.matchAll(/(<p\b[^>]*>)([^<]*)<\/p>/g)].find((m) => m[2] === t('home.mapSwipe'));
    expect(p, 'swipe text rendered').toBeDefined();
    const cls = classes(p![1]!);
    expect(cls).not.toContain('hidden');
    expect(cls).not.toContain('sr-only');
    expect(cls).not.toContain('invisible');
    expect(cls.filter((c) => /hidden/.test(c))).toEqual(['min-[60rem]:hidden']);
    expect(attr(p![1]!, 'aria-hidden')).toBeUndefined();
  });

  it('the swipe check fails when the text is always hidden', () => {
    const bad = html.replace('min-[60rem]:hidden', 'hidden');
    const p = [...bad.matchAll(/(<p\b[^>]*>)([^<]*)<\/p>/g)].find((m) => m[2] === t('home.mapSwipe'))!;
    expect(classes(p[1]!)).toContain('hidden');
  });
});
