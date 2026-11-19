import { describe, expect, it } from 'vitest';
import { mediaFile } from '../vite.media.ts';

const dir = '/repo/assets';

describe('mediaFile: only the canonical URL of an asset id is served', () => {
  it.each([
    ['/media/banshee/atlas/banshee-atlas-hero-01.webp', '/repo/assets/banshee/atlas/banshee-atlas-hero-01.webp'],
    ['/media/jersey-devil/shared/jersey-devil-shared-marker-01.webp', '/repo/assets/jersey-devil/shared/jersey-devil-shared-marker-01.webp'],
    ['/media/shared/shared-atlas-hero-01.webp', '/repo/assets/shared/shared-atlas-hero-01.webp'],
    ['/media/hub/tutorial-game-scene-01.webp', '/repo/assets/hub/tutorial-game-scene-01.webp'],
  ])('%s', (path, file) => expect(mediaFile(dir, path)).toBe(file));

  it.each([
    '/media/../.env',
    '/media/%2e%2e/.env',
    '/media/banshee/atlas/../../../.env',
    '/media/banshee/atlas/banshee-atlas-hero-01.png',
    '/media/banshee/game/banshee-atlas-hero-01.webp', // right file name, wrong folder
    '/media/banshee-atlas-hero-01.webp',
    '/media//banshee/atlas/banshee-atlas-hero-01.webp',
    '/media/banshee/atlas/Banshee-atlas-hero-01.webp',
    '/media/banshee/atlas/banshee%2Datlas-hero-01.webp',
    '/media/banshee/atlas/.webp',
    '/media/nothing.webp',
  ])('refuses %s', (path) => expect(mediaFile(dir, path)).toBeNull());
});
