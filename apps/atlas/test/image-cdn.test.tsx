import { assetUrl, ImageBaseContext, imageUrl, SHARED_ATLAS_IMAGES } from '@kiroween/skeleton/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EnvError, imageBase } from '../src/server/env';
import { HERO_SIZES, heroPreloads, imageBaseOf, widthCopies } from '../src/components/imageSet';
import { Img } from '../src/components/Img';
import { LegendList } from '../src/components/LegendList';
import { translate, type Translate } from '../src/i18n/t';
import { attr, renderInRouter, tags } from './helpers/renderInRouter';

const BASE = 'https://ik.imagekit.io/hrim';
const t: Translate = (key, vars) => translate('en', key, vars);
const { hero } = SHARED_ATLAS_IMAGES;
const withBase = (base: string, ui: React.ReactElement) => <ImageBaseContext.Provider value={base}>{ui}</ImageBaseContext.Provider>;
const legendImage = { id: 'banshee-atlas-hero-01', width: 2400, height: 1350 };
const phoneCopy = { id: 'banshee-atlas-hero-01-w1000', width: 1000, height: 563 };

describe('Img with the CDN off (default context)', () => {
  it('keeps today\'s markup: assetUrl src, no srcset, even when sizes is passed', () => {
    const off = renderToStaticMarkup(<Img image={hero} alt="" priority sizes={HERO_SIZES} />);
    const old = renderToStaticMarkup(<Img image={hero} alt="" priority />);
    expect(off).toBe(old);
    expect(off).toContain(`src="${assetUrl(hero.id)}"`);
    expect(off).not.toContain('srcSet');
    expect(off).not.toContain('srcset');
  });
  it('an empty base is the same as no provider', () => {
    expect(renderToStaticMarkup(withBase('', <Img image={hero} alt="" sizes={HERO_SIZES} />))).toBe(renderToStaticMarkup(<Img image={hero} alt="" sizes={HERO_SIZES} />));
  });
  it('a hero with a phone copy still uses the picture element', () => {
    const html = renderToStaticMarkup(<Img image={legendImage} hero sizes={HERO_SIZES} alt="x" />);
    expect(html.startsWith('<picture>')).toBe(true);
    expect(html).toContain(`srcSet="${assetUrl(phoneCopy.id)}"`);
    expect(html).toBe(renderToStaticMarkup(<Img image={legendImage} hero alt="x" />));
  });
});

describe('Img with the CDN on', () => {
  it('uses sized width copies, keeps the intrinsic width and height, and drops the picture', () => {
    const html = renderToStaticMarkup(withBase(BASE, <Img image={legendImage} hero sizes={HERO_SIZES} alt="x" priority />));
    const img = tags(html, 'img')[0]!;
    expect(attr(img, 'srcset')).toContain(`${BASE}/banshee/atlas/banshee-atlas-hero-01.webp?tr=w-400 400w`);
    expect(attr(img, 'srcset')).toContain('?tr=w-2400 2400w');
    expect(attr(img, 'sizes')).toBe(HERO_SIZES);
    expect(attr(img, 'src')).toMatch(/^https:\/\/ik\.imagekit\.io\/hrim\/banshee\/atlas\/banshee-atlas-hero-01\.webp\?tr=w-1200$/);
    expect(attr(img, 'width')).toBe('2400');
    expect(attr(img, 'height')).toBe('1350');
    expect(html).not.toContain('<picture>');
  });
  it('an image without sizes (a marker) keeps the local URL', () => {
    expect(renderToStaticMarkup(withBase(BASE, <Img image={hero} alt="" />))).toBe(renderToStaticMarkup(<Img image={hero} alt="" />));
  });
});

describe('preload matches the img', () => {
  it('CDN off: today\'s single preload for the home hero', () => {
    expect(heroPreloads(hero, '', false)).toEqual([{ rel: 'preload', as: 'image', href: assetUrl(hero.id), fetchPriority: 'high' }]);
  });
  it('CDN off: the legend hero keeps the phone/desktop pair', () => {
    const links = heroPreloads(legendImage, '', true);
    expect(links).toHaveLength(2);
    expect(links[0]).toMatchObject({ href: assetUrl(phoneCopy.id) });
    expect(links[1]).toMatchObject({ href: assetUrl(legendImage.id) });
  });
  it('CDN on: one link whose href, srcset and sizes equal what the img renders', () => {
    for (const image of [hero, legendImage]) {
      const [link] = heroPreloads(image, BASE, true) as Array<{ href: string; imageSrcSet: string; imageSizes: string }>;
      const img = tags(renderToStaticMarkup(withBase(BASE, <Img image={image} hero sizes={HERO_SIZES} alt="" priority />)), 'img')[0]!;
      expect(heroPreloads(image, BASE, true)).toHaveLength(1);
      expect(link!.href).toBe(attr(img, 'src'));
      expect(link!.imageSrcSet).toBe(attr(img, 'srcset'));
      expect(link!.imageSizes).toBe(attr(img, 'sizes'));
    }
  });
  it('reads the base from the root loader data, and is empty without it', () => {
    expect(imageBaseOf([{ loaderData: { imageBase: BASE } }])).toBe(BASE);
    expect(imageBaseOf([{ loaderData: {} }])).toBe('');
    expect(imageBaseOf([])).toBe('');
  });
  it('og:image stays the original absolute URL (route source still uses assetUrl)', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../src/routes/legends.$legendId.tsx', import.meta.url), 'utf8');
    expect(src).toContain("property: 'og:image', content: `${origin}${assetUrl(legend.hero.id)}`");
  });
});

describe('legend cards', () => {
  const legends = [
    {
      id: 'banshee', title: 'Banshee', region: 'Ireland', oneLineHook: 'h', scareLevel: 3, readingTimeMin: 5, continent: 'Europe',
      hero: legendImage, marker: null,
    },
  ] as unknown as Parameters<typeof LegendList>[0]['legends'];
  const card = async (base: string) => tags(await renderInRouter(withBase(base, <LegendList legends={legends} t={t} />)), 'img')[0]!;
  it('CDN off: the phone copy by assetUrl with sizes, as before', async () => {
    const img = await card('');
    expect(attr(img, 'src')).toBe(assetUrl(phoneCopy.id));
    expect(attr(img, 'srcset')).toBeUndefined();
    expect(attr(img, 'width')).toBe('1000');
  });
  it('CDN on: width copies of the hero with its intrinsic size', async () => {
    const img = await card(BASE);
    expect(attr(img, 'srcset')).toContain(`${imageUrl(legendImage.id, BASE, { axis: 'w', n: 400 })} 400w`);
    expect(attr(img, 'sizes')).toBe('(min-width: 48rem) 24rem, 100vw');
    expect(attr(img, 'width')).toBe('2400');
    expect(attr(img, 'height')).toBe('1350');
  });
});

describe('widthCopies', () => {
  it('is null with no base', () => {
    expect(widthCopies(legendImage, '', 'S')).toBeNull();
  });
});

describe('imageBase (server env)', () => {
  it('is empty when unset or empty, so every URL is as before', () => {
    expect(imageBase({})).toBe('');
    expect(imageBase({ IMAGE_CDN_URL: '' })).toBe('');
  });
  it('accepts the ImageKit endpoint and refuses anything else with an error that names only the variable', () => {
    expect(imageBase({ IMAGE_CDN_URL: BASE })).toBe(BASE);
    expect(() => imageBase({ IMAGE_CDN_URL: 'http://evil.example/x' })).toThrow(EnvError);
    try {
      imageBase({ IMAGE_CDN_URL: 'http://evil.example/x' });
    } catch (e) {
      expect(String(e)).not.toContain('evil.example');
    }
  });
});
