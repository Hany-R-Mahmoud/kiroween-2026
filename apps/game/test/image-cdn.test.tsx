import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ImageBaseContext } from '@kiroween/skeleton/client';
import { describe, expect, it, vi } from 'vitest';
import { en } from '../src/i18n/en.ts';
import { translate } from '../src/i18n/t.ts';
import type { SceneLayout } from '../src/layout/types.ts';
import { imageAttrs, mediaUrl } from '../src/lib/media.ts';
import { EnvError, imageBase } from '../src/server/env.ts';

vi.mock('../src/i18n/useT.ts', () => ({
  useT: () => (key: keyof typeof en, vars?: Record<string, string | number>) => translate('en', key, vars),
  useLang: () => 'en',
}));
const { SceneViewer, HALL_SCENE_SIZES, SCENE_SCREEN_SIZES } = await import('../src/components/SceneViewer.tsx');
const { SpiritCorner, SpiritPanel } = await import('../src/components/SpiritPanel.tsx');
const { ScenePaintContext } = await import('../src/components/ScenePaint.tsx');

const BASE = 'https://ik.imagekit.io/hrim';
const layout: SceneLayout = { sceneId: 'sc-1', assetId: 'banshee-game-scene-01', hotspots: [] };
const scene = (base: string, extra: Record<string, unknown> = {}) =>
  renderToStaticMarkup(
    createElement(ImageBaseContext.Provider, { value: base }, createElement(SceneViewer, { layout, name: 'Room', alt: 'A room', mediaBase: 'http://atlas.test', hotspots: [], onActivate: () => {}, headingId: 'h1', ...extra })),
  );
const img = (html: string, cls: string) => new RegExp(`<img[^>]*${cls}[^>]*>`).exec(html)![0];
const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(tag)?.[1];

describe('imageAttrs', () => {
  const copies = { axis: 'h', steps: [600, 900, 1200], width: 4096, height: 1536, sizes: 'S' } as const;
  it('CDN off: exactly mediaUrl, no srcset and no sizes', () => {
    expect(imageAttrs('http://atlas.test', '', 'banshee-game-scene-01', copies)).toEqual({ src: mediaUrl('http://atlas.test', 'banshee-game-scene-01') });
  });
  it('CDN on: height copies with w descriptors from the aspect ratio', () => {
    const a = imageAttrs('http://atlas.test', BASE, 'banshee-game-scene-01', copies);
    expect(a.srcSet).toBe(
      `${BASE}/banshee/game/banshee-game-scene-01.webp?tr=h-600 1600w, ${BASE}/banshee/game/banshee-game-scene-01.webp?tr=h-900 2400w, ${BASE}/banshee/game/banshee-game-scene-01.webp?tr=h-1200 3200w`,
    );
    expect(a.sizes).toBe('S');
  });
  it('CDN on but nothing fits: the plain CDN URL, still validated', () => {
    expect(imageAttrs('', BASE, 'banshee-game-scene-01', { ...copies, steps: [5000] }).src).toBe(`${BASE}/banshee/game/banshee-game-scene-01.webp`);
    expect(() => imageAttrs('', BASE, 'Bad Id', copies)).toThrow();
  });
});

describe('SceneViewer image', () => {
  it('CDN off: src is today\'s URL and the img has no srcset', () => {
    const tag = img(scene(''), 'scene-image');
    expect(attr(tag, 'src')).toBe('http://atlas.test/media/banshee/game/banshee-game-scene-01.webp');
    expect(attr(tag, 'srcset')).toBeUndefined();
    expect(attr(tag, 'sizes')).toBeUndefined();
  });
  it('CDN on: srcset of height copies, sizes from the scene height, width and height stay intrinsic', () => {
    const tag = img(scene(BASE), 'scene-image');
    expect(attr(tag, 'srcset')).toContain('?tr=h-900 2400w');
    expect(attr(tag, 'sizes')).toBe(SCENE_SCREEN_SIZES);
    expect(attr(tag, 'width')).toBe('4096');
    expect(attr(tag, 'height')).toBe('1536');
    expect(attr(tag, 'src')).not.toContain('atlas.test');
  });
  it('the Hall passes its own sizes (scene height is min(52dvh, 28rem), width is 8/3 of it)', () => {
    expect(attr(img(scene(BASE, { imageSizes: HALL_SCENE_SIZES }), 'scene-image'), 'sizes')).toBe('min(138.67dvh, 74.67rem)');
  });
});

describe('spirit figures', () => {
  const paint = { firstSceneLoaded: true, loadedSceneId: 's', onSceneSettled: () => {} };
  const render = (base: string) =>
    renderToStaticMarkup(
      createElement(ScenePaintContext.Provider, { value: paint }, createElement(ImageBaseContext.Provider, { value: base }, createElement(SpiritCorner, { legendId: 'banshee', mediaBase: '' }), createElement(SpiritPanel, { legendId: 'banshee', mediaBase: '', children: 'Q' }))),
    );
  it('CDN off: plain src, no srcset', () => {
    const tag = img(render(''), 'banshee-game-spirit-01');
    expect(attr(tag, 'src')).toBe('/media/banshee/game/banshee-game-spirit-01.webp');
    expect(attr(tag, 'srcset')).toBeUndefined();
  });
  it('CDN on: two width copies, intrinsic size kept', () => {
    const tag = img(render(BASE), 'banshee-game-spirit-02');
    expect(attr(tag, 'srcset')).toBe(`${BASE}/banshee/game/banshee-game-spirit-02.webp?tr=w-200 200w, ${BASE}/banshee/game/banshee-game-spirit-02.webp?tr=w-400 400w`);
    expect(attr(tag, 'width')).toBe('1600');
    expect(attr(tag, 'height')).toBe('2400');
  });
});

describe('imageBase (server env)', () => {
  it('is empty when unset or empty', () => {
    expect(imageBase({})).toBe('');
    expect(imageBase({ IMAGE_CDN_URL: '' })).toBe('');
  });
  it('accepts the ImageKit endpoint, refuses other values without echoing them', () => {
    expect(imageBase({ IMAGE_CDN_URL: BASE })).toBe(BASE);
    expect(() => imageBase({ IMAGE_CDN_URL: 'http://evil.example' })).toThrow(EnvError);
    try {
      imageBase({ IMAGE_CDN_URL: 'http://evil.example' });
    } catch (e) {
      expect(String(e)).not.toContain('evil.example');
    }
  });
});
