import { squareSpriteBox } from '../boxes.ts';
import type { WorldLayout } from '../types.ts';
// Gumiho Layout_Data over the three painted panoramas, in panorama pixels of the 4096 by 1536 images. Physical x
// on purpose: the painted scene is a fixed image and does not mirror in RTL. Positions were read from the scene images.
// Sprites come from the asset usage column (h-NN is hotspot-NN); `squareSpriteBox` centres each square sprite in its box.
const h = squareSpriteBox('gumiho');

const gumiho: WorldLayout = {
  legendId: 'gumiho',
  scenes: [
    {
      sceneId: 'scene-courtyard',
      assetId: 'gumiho-game-scene-01',
      hotspots: [
        h('h-04', 255, 1290, 200, 220),
        h('h-12', 620, 1110, 230, 180),
        h('h-03', 860, 1190, 315, 310),
        h('h-01', 1200, 475, 490, 600),
        h('h-05', 1300, 1160, 400, 220),
        h('h-02', 3125, 470, 200, 180),
      ],
    },
    {
      sceneId: 'scene-bridge',
      assetId: 'gumiho-game-scene-02',
      hotspots: [
        h('h-08', 40, 960, 1480, 510),
        h('h-07', 80, 200, 1020, 750),
        h('h-09', 1535, 1265, 520, 195),
        h('h-06', 1700, 685, 1100, 270),
        h('h-14', 2080, 20, 750, 320),
      ],
    },
    {
      sceneId: 'scene-forest',
      assetId: 'gumiho-game-scene-03',
      hotspots: [
        h('h-13', 30, 955, 510, 415),
        h('h-11', 2275, 180, 200, 200),
        h('h-10', 2300, 950, 200, 200),
      ],
    },
  ],
};

export default gumiho;
