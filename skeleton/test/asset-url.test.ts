import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AssetIdError, assetUrl, MEDIA_PREFIX, parseAssetSize } from '../src/assets/assetUrl.ts';
import { SHARED_ATLAS_IMAGES } from '../src/atlas/view.ts';
import { allLegends } from './helpers/legends.ts';
import { webpSize } from './helpers/webp.ts';

const ASSETS = fileURLToPath(new URL('../../assets/', import.meta.url));
const fileOf = (id: string) => `${ASSETS}${assetUrl(id).slice(MEDIA_PREFIX.length)}`;
// The hub and shared assets are not imported (content/hub-and-tutorial.md); these are the ones the atlas uses.
const SHARED_USED = Object.values(SHARED_ATLAS_IMAGES).map((i) => ({ id: i.id, size: `${i.width}x${i.height}` }));
const contentAssets = [...allLegends.flatMap((l) => l.assets.map((a) => ({ id: a.id, size: a.size }))), ...SHARED_USED];

describe('assetUrl (folder rule in assets/README.md)', () => {
  it('maps every asset id in the twelve legend files and the shared ids the atlas uses to an existing file', () => {
    expect(contentAssets.length).toBeGreaterThan(400);
    const missing = contentAssets.filter((a) => !existsSync(fileOf(a.id))).map((a) => a.id);
    expect(missing).toEqual([]);
  });

  it("gives each file's real width and height as the stored size", () => {
    const wrong = contentAssets.flatMap((a) => {
      const stored = parseAssetSize(a.size);
      const real = webpSize(fileOf(a.id));
      return stored && stored.width === real.width && stored.height === real.height ? [] : [`${a.id}: stored ${a.size}, file ${real.width}x${real.height}`];
    });
    expect(wrong).toEqual([]);
  });

  // Built phone copies (Requirement 13.2): skipped when apps/atlas has no build, like the other built-output tests.
  const built = fileURLToPath(new URL('../../apps/atlas/dist/client/media/', import.meta.url));
  it.skipIf(!existsSync(built))('every built hero copy is 1000 px wide with the full image ratio', () => {
    const wide = contentAssets.filter((a) => /-hero-/.test(a.id) && (parseAssetSize(a.size)?.width ?? 0) > 1000);
    expect(wide.length).toBeGreaterThan(0);
    for (const a of wide) {
      const copy = `${built}${assetUrl(`${a.id}-w1000`).slice(MEDIA_PREFIX.length)}`;
      expect(existsSync(copy), `${a.id} has a built copy`).toBe(true);
      const real = webpSize(copy);
      const full = parseAssetSize(a.size)!;
      expect(real.width, a.id).toBe(1000);
      expect(Math.abs(real.height - (full.height * 1000) / full.width), a.id).toBeLessThanOrEqual(1);
    }
  });

  it.each([
    ['banshee-atlas-hero-01', '/media/banshee/atlas/banshee-atlas-hero-01.webp'],
    ['flying-dutchman-game-scene-02', '/media/flying-dutchman/game/flying-dutchman-game-scene-02.webp'],
    ['jersey-devil-shared-marker-01', '/media/jersey-devil/shared/jersey-devil-shared-marker-01.webp'],
    ['spring-heeled-jack-atlas-chapter-07', '/media/spring-heeled-jack/atlas/spring-heeled-jack-atlas-chapter-07.webp'],
    ['shared-atlas-map-01', '/media/shared/shared-atlas-map-01.webp'],
    ['hub-game-scene-01', '/media/hub/hub-game-scene-01.webp'],
    ['tutorial-game-scene-01', '/media/hub/tutorial-game-scene-01.webp'],
  ])('%s -> %s', (id, url) => expect(assetUrl(id)).toBe(url));

  it.each(['', 'banshee', 'banshee-hero-01', 'atlas-hero-01', '-atlas-hero', 'Banshee-atlas-hero-01', 'banshee-atlas-', 'banshee/atlas-hero', '../banshee-atlas-hero-01', 'banshee-atlas-hero-01.webp', 'x'.repeat(101)])(
    'refuses %j',
    (id) => expect(() => assetUrl(id)).toThrow(AssetIdError),
  );
});

describe('parseAssetSize', () => {
  it.each([
    ['2400x1350 (16:9)', 2400, 1350],
    ['16:9, 2400×1350', 2400, 1350],
    ['Square, 512×512', 512, 512],
    ['1024x1024 tileable', 1024, 1024],
  ])('%s', (text, width, height) => expect(parseAssetSize(text)).toEqual({ width, height }));
  it('gives null when the text has no size', () => expect(parseAssetSize('16:9')).toBeNull());
});
