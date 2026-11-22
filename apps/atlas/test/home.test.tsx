import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HomeView } from '../src/components/HomeView';
import type { HomeLegend } from '../src/components/home';
import type { Continent } from '../src/geo/continents';
import { placeMarkers } from '../src/geo/placeMarkers';
import { translate, type Translate } from '../src/i18n/t';
import { attr, classes, renderInRouter, tags } from './helpers/renderInRouter';

// Requirements 15.1, 15.4, 15.5, 15.8, 15.11, 16.3: one map, a hero with one primary action and the game link,
// and legend cards that are one link each with a sized, lazy phone-copy image.
const t: Translate = (key, vars) => translate('en', key, vars);
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

const SPECS: { id: string; title: string; continent: Continent; lat: number; lng: number; image: 'hero' | 'marker' | 'none' }[] = [
  { id: 'banshee', title: 'The Banshee', continent: 'Europe', lat: 53, lng: -8, image: 'hero' },
  { id: 'el-coco', title: 'El Coco', continent: 'Europe', lat: 40, lng: -4, image: 'hero' },
  { id: 'gumiho', title: 'Gumiho', continent: 'Asia', lat: 37, lng: 127, image: 'marker' },
  { id: 'chupacabra', title: 'Chupacabra', continent: 'North America', lat: 18, lng: -66, image: 'none' },
];
const places = placeMarkers(SPECS.map(({ id, lat, lng }) => ({ id, lat, lng })));
const legends: HomeLegend[] = SPECS.map((s) => ({
  id: s.id,
  title: s.title,
  region: 'Somewhere',
  era: 'Old',
  scareLevel: 3,
  readingTimeMin: 9,
  oneLineHook: `Hook of ${s.title}.`,
  mapPoint: { lat: s.lat, lng: s.lng },
  marker: s.image === 'marker' ? { id: `${s.id}-atlas-marker-01`, width: 128, height: 128 } : null,
  hero: s.image === 'hero' ? { id: `${s.id}-atlas-hero-01`, width: 2400, height: 1350 } : null,
  continent: s.continent,
  place: places.find((p) => p.id === s.id)!,
}));

const slice = (html: string, open: RegExp, close: string) => {
  const start = html.search(open);
  expect(start, `${open} present`).toBeGreaterThanOrEqual(0);
  return html.slice(start, html.indexOf(close, start));
};
const cards = (html: string) => [...html.matchAll(/<li\b[^>]*class="[^"]*\blegend-card\b[^"]*"[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1]!);

/** Problems with one card's image, empty when it is right. */
function imageProblems(card: string, expectSmallCopy: boolean): string[] {
  const imgs = tags(card, 'img');
  if (imgs.length !== 1) return [`${imgs.length} images`];
  const img = imgs[0]!;
  const problems = ['loading', 'decoding', 'width', 'height', 'sizes'].filter((a) => !attr(img, a)).map((a) => `no ${a}`);
  if (attr(img, 'loading') !== 'lazy') problems.push('not lazy');
  if (attr(img, 'decoding') !== 'async') problems.push('not async');
  if (expectSmallCopy && !/-w1000\.webp$/.test(attr(img, 'src') ?? '')) problems.push('not the phone copy');
  return problems;
}

describe('atlas home', async () => {
  const html = await renderInRouter(<HomeView legends={legends} t={t} />);

  // Requirement 23.2: "All legends" (/#legends) lands on a section whose own heading is in view.
  describe('the #legends target', () => {
    it('is a section labelled by its visible heading, and the id appears once', () => {
      expect(html.match(/\sid="legends"/g)).toHaveLength(1);
      const section = tags(html, 'section').find((s) => attr(s, 'id') === 'legends') ?? '';
      expect(attr(section, 'aria-labelledby')).toBe('list-title');
      const body = html.slice(html.indexOf(section));
      expect(body).toMatch(new RegExp(`<h2\\b[^>]*id="list-title"[^>]*>${t('home.listHeading')}</h2>`));
      expect(html.indexOf('id="list-title"')).toBeGreaterThan(html.indexOf(section));
    });
    it('keeps a scroll margin so the heading is not under the edge', () => {
      expect(css).toMatch(/\[id\][^{]*{[^}]*scroll-margin-block-start:\s*(calc\([^;]*\)|[\d.]+rem)/);
    });
    it('the check fails when the id is renamed', () => {
      const broken = html.replace('id="legends"', 'id="list"');
      expect(tags(broken, 'section').some((s) => attr(s, 'id') === 'legends')).toBe(false);
    });
  });

  describe('one map', () => {
    it('has no painted map image and exactly one .land element', () => {
      expect(html).not.toContain('shared-atlas-map-01');
      expect(tags(html, 'img').filter((i) => /shared-atlas-map-01/.test(attr(i, 'src') ?? ''))).toHaveLength(0);
      expect(tags(html, 'div').filter((d) => classes(d).includes('land'))).toHaveLength(1);
    });

    it('the check fails when a second map is added', () => {
      const bad = `${html}<img src="/media/shared/shared-atlas-map-01.webp" /><div class="land"></div>`;
      expect(tags(bad, 'img').filter((i) => /shared-atlas-map-01/.test(attr(i, 'src') ?? ''))).toHaveLength(1);
      expect(tags(bad, 'div').filter((d) => classes(d).includes('land'))).toHaveLength(2);
    });
  });

  describe('hero', () => {
    const hero = slice(html, /<header\b[^>]*class="[^"]*\bhome-hero\b/, '</header>');

    it('has one h1 on the page', () => {
      expect(tags(html, 'h1')).toHaveLength(1);
      expect(hero).toContain('<h1');
    });

    it('has exactly one primary action, to the recommended legend', () => {
      const primary = tags(hero, 'a').filter((a) => classes(a).includes('btn-primary'));
      expect(primary).toHaveLength(1);
      expect(attr(primary[0]!, 'href')).toBe('/legends/banshee');
      expect(hero).toContain(t('home.start', { title: 'The Banshee' }));
    });

    it('links to the game at /game/ as a secondary action', () => {
      const game = tags(hero, 'a').filter((a) => attr(a, 'href') === '/game/');
      expect(game).toHaveLength(1);
      expect(classes(game[0]!)).toContain('btn-secondary');
      expect(classes(game[0]!)).not.toContain('btn-primary');
    });

    it('puts the hero copy on a dark scrim, because the painted pages behind it are bright (AA, measured in the browser)', () => {
      const rule = /\.home-hero-copy\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
      expect(rule).toMatch(/background:\s*color-mix\([^)]*var\(--color-bg\)\s+(8\d|9\d)%/);
    });

    it('the checks fail when the hero loses its primary action or the game link', () => {
      const noPrimary = hero.replace('btn-primary', 'btn-ghost');
      expect(tags(noPrimary, 'a').filter((a) => classes(a).includes('btn-primary'))).toHaveLength(0);
      const noGame = hero.replace('href="/game/"', 'href="/play/"');
      expect(tags(noGame, 'a').filter((a) => attr(a, 'href') === '/game/')).toHaveLength(0);
    });
  });

  describe('legend cards', () => {
    const list = cards(html);

    it('renders one card per legend', () => {
      expect(list).toHaveLength(legends.length);
    });

    it('each card is one link, named by its title, with no underline class', () => {
      for (const [i, card] of list.entries()) {
        const links = [...card.matchAll(/(<a\b[^>]*>)([\s\S]*?)<\/a>/g)];
        const title = legends.find((l) => card.includes(`>${l.title}</a>`))?.title;
        expect(links, `card ${i}`).toHaveLength(1);
        expect(title, `card ${i} link text is a legend title`).toBeDefined();
        expect(links[0]![2]!.replace(/<[^>]+>/g, '').trim()).toBe(title);
        expect(classes(links[0]![1]!), title).not.toContain('underline');
        expect(attr(links[0]![1]!, 'href'), title).toBe(`/legends/${legends.find((l) => l.title === title)!.id}`);
      }
    });

    it('the stylesheet removes the underline from the card link and stretches it over the card', () => {
      const rule = /\.legend-card-link\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
      expect(rule).toMatch(/text-decoration:\s*none/);
      expect(css).toMatch(/\.legend-card-link::after\s*\{[^}]*inset:\s*0/);
    });

    it('a card image has loading, decoding, width, height and sizes, and uses the phone copy of the hero', () => {
      for (const l of legends.filter((x) => x.hero)) {
        const card = list.find((c) => c.includes(`>${l.title}</a>`))!;
        expect(imageProblems(card, true), l.id).toEqual([]);
        const img = tags(card, 'img')[0]!;
        expect(attr(img, 'src')).toContain(`${l.id}-atlas-hero-01-w1000.webp`);
        expect(attr(img, 'width')).toBe('1000');
        expect(attr(img, 'height')).toBe('563');
      }
    });

    it('falls back to the marker when there is no hero, and shows no image when there is neither', () => {
      const gumiho = list.find((c) => c.includes('>Gumiho</a>'))!;
      expect(imageProblems(gumiho, false)).toEqual([]);
      expect(attr(tags(gumiho, 'img')[0]!, 'src')).toContain('gumiho-atlas-marker-01');
      expect(tags(list.find((c) => c.includes('>Chupacabra</a>'))!, 'img')).toHaveLength(0);
    });

    it('the image check fails for each broken rule', () => {
      const card = list.find((c) => c.includes('>The Banshee</a>'))!;
      for (const a of ['loading', 'decoding', 'width', 'height', 'sizes']) {
        const broken = card.replace(new RegExp(`\\s${a}="[^"]*"`), '');
        expect(imageProblems(broken, true), a).not.toEqual([]);
      }
      expect(imageProblems(card.replace('-w1000', ''), true)).toContain('not the phone copy');
      expect(imageProblems(card.replace('loading="lazy"', 'loading="eager"'), true)).toContain('not lazy');
    });
  });
});
