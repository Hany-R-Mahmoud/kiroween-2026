import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import { en } from '../src/i18n/en.ts';
import { translate } from '../src/i18n/t.ts';
import { SCENE_HEIGHT, SCENE_WIDTH, type HotspotBox, type SceneLayout } from '../src/layout/types.ts';
import { readFileSync } from 'node:fs';
import { buttonPan, DRAG_THRESHOLD, isDrag, KEY_STEP, keyPan, lostCaptureEndsDrag } from '../src/lib/viewerInput.ts';

// The viewer reads the language from the router's root loader. Use the real translator for English instead.
vi.mock('../src/i18n/useT.ts', () => ({
  useT: () => (key: keyof typeof en, vars?: Record<string, string | number>) => translate('en', key, vars),
  useLang: () => 'en',
}));

const { Hotspot } = await import('../src/components/Hotspot.tsx');
const { SceneViewer } = await import('../src/components/SceneViewer.tsx');
const { ScenePaintContext } = await import('../src/components/ScenePaint.tsx');

// Limit: the game vitest config has no DOM (no jsdom or happy-dom installed). These tests render static markup and call
// the pure input functions the viewer uses. Real key, touch and drag behaviour is proven in headless Chrome (task 11.2).

const box: HotspotBox = { id: 'hs-comb', x: 400, y: 300, w: 300, h: 300, sprite: { assetId: 'shared-game-ui-fear-01', x: 400, y: 300, w: 300, h: 300 } };
const layout: SceneLayout = { sceneId: 'sc-1', assetId: 'shared-game-ui-frame-01', hotspots: [box] };

/** `settled` renders as if the scene image had loaded; otherwise as the server renders it. */
function viewer(marked: boolean, settled = false): string {
  const el = createElement(SceneViewer, {
      layout,
      name: 'The attic',
      alt: 'A dim attic',
      mediaBase: '',
      hotspots: [{ id: 'hs-comb', label: 'A bone comb', marked }],
      onActivate: () => {},
      headingId: 'h1',
    });
  return renderToStaticMarkup(
    settled ? createElement(ScenePaintContext.Provider, { value: { firstSceneLoaded: true, loadedSceneId: layout.assetId, onSceneSettled: () => {} } }, el) : el,
  );
}

describe('pan keys and buttons', () => {
  it('keys pan by the step and stay in [minPan, 0]', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('ArrowLeft', 'ArrowRight', 'Home', 'End'),
        fc.integer({ min: -4000, max: 0 }),
        fc.integer({ min: -4000, max: 0 }),
        (key, p, minPan) => {
          const pan = Math.max(minPan, p);
          const next = keyPan(key, pan, minPan)!;
          expect(next).toBeLessThanOrEqual(0);
          expect(next).toBeGreaterThanOrEqual(minPan);
        },
      ),
    );
    expect(keyPan('ArrowRight', 0, -1000)).toBe(-KEY_STEP);
    expect(keyPan('ArrowLeft', -500, -1000)).toBe(-500 + KEY_STEP);
    expect(keyPan('ArrowLeft', 0, -1000)).toBe(0);
    expect(keyPan('End', 0, -1000)).toBe(-1000);
    expect(keyPan('Home', -700, -1000)).toBe(0);
    expect(keyPan('a', 0, -1000)).toBeNull();
  });

  it('pan buttons move by half a viewport at least a key step, and stay in bounds', () => {
    fc.assert(
      fc.property(fc.integer({ min: -3000, max: 0 }), fc.constantFrom(-1, 1) as fc.Arbitrary<-1 | 1>, fc.integer({ min: 200, max: 1600 }), (pan, dir, vw) => {
        const sw = SCENE_WIDTH * 0.5;
        const min = Math.min(0, vw - sw);
        const start = Math.max(min, pan);
        const next = buttonPan(start, dir, vw, sw);
        expect(next).toBeLessThanOrEqual(0);
        expect(next).toBeGreaterThanOrEqual(min);
      }),
    );
    expect(buttonPan(0, -1, 800, 2048)).toBe(-400);
    expect(buttonPan(0, -1, 100, 2048)).toBe(-KEY_STEP);
  });

  it('renders both pan buttons with catalog names, the left one disabled at the start', () => {
    const html = viewer(false);
    expect(html).toContain(en['world.panLeft']);
    expect(html).toContain(en['world.panRight']);
    expect(/<button[^>]*disabled=""[^>]*class="scene-button"|<button[^>]*class="scene-button"[^>]*disabled=""/.test(html)).toBe(true);
  });

  it('the viewport is a focusable, named region that takes key input', () => {
    const html = viewer(false);
    expect(html).toMatch(/role="region"[^>]*aria-label="The attic"|aria-label="The attic"[^>]*role="region"/);
    expect(html).toMatch(/class="scene-viewport mood-vignette-inset"[^>]*tabindex="0"|tabindex="0"[^>]*class="scene-viewport mood-vignette-inset"/);
  });
});

describe('drag threshold', () => {
  it('travel over 8 px is a drag, 8 px or less is a tap', () => {
    expect(DRAG_THRESHOLD).toBe(8);
    fc.assert(fc.property(fc.integer({ min: -2000, max: 2000 }), (dx) => {
      expect(isDrag(dx)).toBe(Math.abs(dx) > 8);
    }));
    expect(isDrag(8)).toBe(false);
    expect(isDrag(-9)).toBe(true);
  });
});

describe('Hotspot', () => {
  it('Enter, Space and click share one path: a native button with only onClick', () => {
    const onActivate = vi.fn();
    const el = Hotspot({ box, label: 'A bone comb', marked: false, markedText: 'm', scale: 0.5, onActivate }) as ReactElement<Record<string, unknown>>;
    expect(el.type).toBe('button');
    expect(el.props.type).toBe('button');
    expect(el.props.onKeyDown).toBeUndefined();
    expect(el.props.onKeyUp).toBeUndefined();
    expect(el.props.onMouseDown).toBeUndefined();
    expect(el.props.tabIndex).toBeUndefined();
    (el.props.onClick as () => void)();
    expect(onActivate).toHaveBeenCalledExactlyOnceWith('hs-comb');
  });

  it('has an accessible name from the label', () => {
    const html = renderToStaticMarkup(createElement(Hotspot, { box, label: 'A bone comb', marked: false, markedText: 'Hint', scale: 1, onActivate: () => {} }));
    expect(html).toContain('<span class="sr-only">A bone comb</span>');
    expect(viewer(false)).toContain('A bone comb');
  });

  it('keeps a 44 px minimum target at small scale', () => {
    const html = renderToStaticMarkup(createElement(Hotspot, { box: { ...box, w: 100, h: 100 }, label: 'x', marked: false, markedText: 'h', scale: 0.25, onActivate: () => {} }));
    expect(html).toContain('inline-size:44px');
    expect(html).toContain('block-size:44px');
  });

  it('the marked state is a ring flag, an icon and hidden text, not colour alone', () => {
    const on = renderToStaticMarkup(createElement(Hotspot, { box, label: 'x', marked: true, markedText: en['hint.mark'], scale: 1, onActivate: () => {} }));
    const off = renderToStaticMarkup(createElement(Hotspot, { box, label: 'x', marked: false, markedText: en['hint.mark'], scale: 1, onActivate: () => {} }));
    expect(on).toContain('data-marked="true"');
    expect(on).toContain('<svg');
    expect(on).toContain(`<span class="sr-only">${en['hint.mark']}</span>`);
    expect(off).not.toContain('data-marked');
    expect(off).not.toContain('<svg');
    expect(off).not.toContain(en['hint.mark']);
    expect(viewer(true)).toContain(en['hint.mark']);
  });
});

describe('scene images', () => {
  it('the scene image has real size, high fetch priority, alt text and is not draggable', () => {
    const html = viewer(false);
    const img = /<img[^>]*class="scene-image"[^>]*>/.exec(html)![0];
    expect(img).toContain(`width="${SCENE_WIDTH}"`);
    expect(img).toContain(`height="${SCENE_HEIGHT}"`);
    expect(img).toContain('fetchPriority="high"');
    expect(img).toContain('alt="A dim attic"');
    expect(img).toContain('draggable="false"');
    expect(img).not.toContain('loading="lazy"');
  });

  it('server markup has the scene src and no sprite image, but keeps the sized sprite box (Requirement 11.4, 11.6)', () => {
    const html = viewer(false);
    expect(html).toContain('class="scene-image"');
    expect(html).not.toContain('scene-sprite-img');
    expect(html).not.toContain(`/${box.sprite!.assetId}`);
    expect(html).toContain('class="scene-sprite"');
  });

  it('after the scene settles, sprites are lazy, decorative and sized', () => {
    const img = /<img[^>]*scene-sprite-img[^>]*>/.exec(viewer(false, true))![0];
    expect(img).toContain('loading="lazy"');
    expect(img).toContain('alt=""');
    expect(img).toContain('width="300"');
    expect(img).toContain('height="300"');
  });
});

describe('touch drag keeps going when the browser releases its implicit capture (found in headless Chrome, task 11.2)', () => {
  it('only the viewport losing its own capture ends a drag, not a child', () => {
    const viewport = new EventTarget();
    expect(lostCaptureEndsDrag(viewport, viewport)).toBe(true);
    expect(lostCaptureEndsDrag(new EventTarget(), viewport)).toBe(false);
  });
  it('the viewer wires onLostPointerCapture through that rule', () => {
    const src = readFileSync(new URL('../src/components/SceneViewer.tsx', import.meta.url), 'utf8');
    expect(src).toMatch(/onLostPointerCapture=\{\(e\) => \{\s*if \(lostCaptureEndsDrag\(e\.target, e\.currentTarget\)\) endDrag\(e\);/);
    expect(src).not.toContain('onLostPointerCapture={endDrag}');
  });
});
