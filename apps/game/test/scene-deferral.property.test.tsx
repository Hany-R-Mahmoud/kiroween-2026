import { readFileSync } from 'node:fs';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import { en } from '../src/i18n/en.ts';
import { translate } from '../src/i18n/t.ts';
import type { HotspotBox, SceneLayout } from '../src/layout/types.ts';

// Same stand-in as viewer.test.ts: the components read the language from the router's root loader.
vi.mock('../src/i18n/useT.ts', () => ({
  useT: () => (key: keyof typeof en, vars?: Record<string, string | number>) => translate('en', key, vars),
  useLang: () => 'en',
}));

const { SceneViewer } = await import('../src/components/SceneViewer.tsx');
const { SpiritCorner, SpiritPanel } = await import('../src/components/SpiritPanel.tsx');
const { FearMeter } = await import('../src/components/FearMeter.tsx');
const { ScenePaintContext, ScenePaintProvider } = await import('../src/components/ScenePaint.tsx');

const SCENE_ASSETS = ['shared-game-ui-frame-01'] as const;
const SPRITE_ASSETS = ['shared-game-ui-fear-01', 'banshee-game-spirit-01', 'banshee-game-spirit-02'] as const;

const boxArb = (i: number): fc.Arbitrary<HotspotBox> =>
  fc.record({
    x: fc.integer({ min: 0, max: 3500 }),
    y: fc.integer({ min: 0, max: 1200 }),
    w: fc.integer({ min: 176, max: 600 }),
    h: fc.integer({ min: 176, max: 600 }),
    sprite: fc.record({
      assetId: fc.constantFrom(...SPRITE_ASSETS),
      x: fc.integer({ min: 0, max: 3500 }),
      y: fc.integer({ min: 0, max: 1200 }),
      w: fc.integer({ min: 100, max: 600 }),
      h: fc.integer({ min: 100, max: 600 }),
    }),
  }).map((b) => ({ id: `hs-${i}`, ...b }));

const layoutArb: fc.Arbitrary<{ layout: SceneLayout; labels: string[] }> = fc
  .tuple(fc.constantFrom(...SCENE_ASSETS), fc.integer({ min: 0, max: 6 }))
  .chain(([assetId, n]) =>
    fc.tuple(fc.tuple(...Array.from({ length: n }, (_, i) => boxArb(i))), fc.array(fc.stringMatching(/^[A-Za-z][A-Za-z ]{2,14}$/), { minLength: n, maxLength: n })).map(([hotspots, labels]) => ({
      layout: { sceneId: 'sc-1', assetId, hotspots } as SceneLayout,
      labels,
    })),
  );

type Paint = { firstSceneLoaded: boolean; loadedSceneId: string | null; onSceneSettled: (id: string) => void };
const deferred: Paint = { firstSceneLoaded: false, loadedSceneId: null, onSceneSettled: () => {} };
const settledFor = (id: string): Paint => ({ firstSceneLoaded: true, loadedSceneId: id, onSceneSettled: () => {} });

function page(layout: SceneLayout, labels: string[], paint: Paint | null): string {
  const tree = createElement(
    'div',
    null,
    createElement(SceneViewer, {
      layout,
      name: 'Room',
      alt: 'A room',
      mediaBase: '',
      hotspots: layout.hotspots.map((h, i) => ({ id: h.id, label: labels[i]!, marked: false })),
      onActivate: () => {},
      headingId: 'h1',
    }),
    createElement(SpiritCorner, { legendId: 'banshee', mediaBase: '' }),
    createElement(SpiritPanel, { legendId: 'banshee', mediaBase: '', children: 'Question' }),
    createElement(FearMeter, { value: 10, mediaBase: '' }),
  );
  return renderToStaticMarkup(paint ? createElement(ScenePaintContext.Provider, { value: paint }, tree) : tree);
}

const imgs = (html: string) => [...html.matchAll(/<img[^>]*>/g)].map((m) => m[0]);
const hotspotButtons = (html: string) => html.match(/<button[^>]*scene-hotspot[\s\S]*?<\/button>/g) ?? [];
const spriteBoxes = (html: string) => html.match(/<span class="scene-sprite"[^>]*>/g) ?? [];
const withoutSecondary = (html: string) =>
  html
    .replace(/<img[^>]*(scene-sprite-img|fear-meter-frame)[^>]*>/g, '')
    .replace(/<img[^>]*banshee-game-spirit[^>]*>/g, '')
    .replace(/ style="background-image:[^"]*"/g, '')
    .replace(/ style="--book-paper-image:[^"]*"/g, '');

describe('Property 11: Secondary images wait for the scene', () => {
  it('server markup holds the scene src only; hotspots keep name and box', () => {
    /** **Validates: Requirements 11.1, 11.2, 11.4, 11.6** */
    fc.assert(
      fc.property(layoutArb, ({ layout, labels }) => {
        const html = page(layout, labels, null);
        const found = imgs(html);
        expect(found).toHaveLength(1);
        expect(found[0]).toContain('class="scene-image"');
        expect(found[0]).toContain(`/media/`);
        expect(html).not.toContain('scene-sprite-img');
        expect(html).not.toContain('url(');
        for (const a of SPRITE_ASSETS) expect(html).not.toContain(a);
        expect(html).not.toContain('--book-paper-image');
        expect(spriteBoxes(html)).toHaveLength(layout.hotspots.length);
        const buttons = hotspotButtons(html);
        expect(buttons).toHaveLength(layout.hotspots.length);
        buttons.forEach((b, i) => {
          expect(b).toContain(`<span class="sr-only">${labels[i]}</span>`);
          expect(b).toMatch(/inline-size:\d+(\.\d+)?px/);
        });
      }),
    );
  });

  it('once settled, every secondary image has a src and the boxes are unchanged', () => {
    /** **Validates: Requirements 11.1, 11.3, 11.6** */
    fc.assert(
      fc.property(layoutArb, ({ layout, labels }) => {
        const before = page(layout, labels, deferred);
        const after = page(layout, labels, settledFor(layout.assetId));
        expect(imgs(after).filter((i) => i.includes('scene-sprite-img'))).toHaveLength(layout.hotspots.length);
        for (const i of imgs(after)) expect(i).toMatch(/src="\/media\/[^"]+"/);
        expect(after).toContain('fear-meter-frame');
        expect(after).toContain('banshee-game-spirit-01');
        expect(after).toContain('banshee-game-spirit-02');
        expect(hotspotButtons(after)).toEqual(hotspotButtons(before));
        expect(spriteBoxes(after)).toEqual(spriteBoxes(before));
        // Everything except the secondary images is identical.
        expect(withoutSecondary(after)).toBe(withoutSecondary(before));
      }),
    );
  });

  it('sprites of another scene stay deferred until their own scene settles', () => {
    /** **Validates: Requirements 11.1, 11.2** */
    fc.assert(
      fc.property(layoutArb, ({ layout, labels }) => {
        const html = page(layout, labels, { firstSceneLoaded: true, loadedSceneId: 'some-other-scene', onSceneSettled: () => {} });
        expect(html).not.toContain('scene-sprite-img');
      }),
    );
  });

  it('the provider starts deferred, and the viewer settles on load, on error and when already complete', () => {
    /** **Validates: Requirements 11.1, 11.3** */
    const el = createElement(ScenePaintProvider, null, createElement(SpiritCorner, { legendId: 'banshee', mediaBase: '' }));
    expect(imgs(renderToStaticMarkup(el as ReactElement))).toHaveLength(0);
    const src = readFileSync(new URL('../src/components/SceneViewer.tsx', import.meta.url), 'utf8');
    expect(src).toMatch(/onLoad=\{\(\) => onSceneSettled\(layout\.assetId\)\}/);
    expect(src).toMatch(/onError=\{\(\) => onSceneSettled\(layout\.assetId\)\}/);
    expect(src).toMatch(/imgRef\.current\?\.complete/);
    expect(src).toContain('loadedSceneId === layout.assetId');
  });

  it('the three screens provide the context', () => {
    for (const f of ['WorldPlay', 'TutorialRoom', 'Hall']) {
      const src = readFileSync(new URL(`../src/components/${f}.tsx`, import.meta.url), 'utf8');
      expect(src, f).toContain('<ScenePaintProvider>');
    }
  });
});
