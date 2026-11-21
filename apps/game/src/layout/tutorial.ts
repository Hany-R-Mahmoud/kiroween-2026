import { regionBox as r } from './boxes.ts';
import type { SceneLayout } from './types.ts';

// Tutorial Layout_Data over the painted scene `tutorial-game-scene-01` (no sprites), panorama pixels of the 4096 by 1536
// image. Physical x on purpose: the painted scene is a fixed image and does not mirror in RTL.
// The corkboard sits at the far right, outside the visible area at 390 px with the pan at its start.

export const TUTORIAL_SCENE: SceneLayout = {
  sceneId: 'tutorial',
  assetId: 'tutorial-game-scene-01',
  hotspots: [
    r('tut-coat', 160, 120, 560, 1380),
    r('tut-bookshelf', 770, 380, 810, 1100),
    r('tut-candle', 1640, 820, 240, 340),
    r('tut-drawer', 1640, 1180, 700, 176),
    r('tut-typewriter', 1890, 770, 520, 380),
    r('tut-mirror', 2540, 120, 710, 1370),
    r('tut-corkboard', 3350, 290, 610, 860),
  ],
};
