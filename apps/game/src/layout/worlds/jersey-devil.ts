import { squareSpriteBox } from '../boxes.ts';
import type { WorldLayout } from '../types.ts';
// Jersey Devil Layout_Data over the three painted panoramas, in panorama pixels of the 4096 by 1536 images. Physical x
// on purpose: the painted scene is a fixed image and does not mirror in RTL. Positions were read from the scene images.
// Sprites come from the asset usage column (h-NN is hotspot-NN); `squareSpriteBox` centres each square sprite in its box.
const h = squareSpriteBox('jersey-devil');

const jerseyDevil: WorldLayout = {
  legendId: 'jersey-devil',
  scenes: [
    {
      sceneId: 'scene-1',
      assetId: 'jersey-devil-game-scene-01',
      hotspots: [
        h('h-03', 150, 1200, 330, 330),
        h('h-05', 205, 800, 470, 390),
        h('h-02', 800, 930, 200, 180),
        h('h-06', 822, 660, 176, 200),
        h('h-01', 1180, 880, 300, 180),
        h('h-04', 1980, 640, 360, 700),
      ],
    },
    {
      sceneId: 'scene-2',
      assetId: 'jersey-devil-game-scene-02',
      hotspots: [
        h('h-10', 480, 900, 1000, 600),
        h('h-07', 1500, 400, 900, 640),
        h('h-08', 2540, 900, 240, 260),
        h('h-09', 2990, 960, 300, 300),
        h('h-11', 3600, 700, 480, 800),
      ],
    },
    {
      sceneId: 'scene-3',
      assetId: 'jersey-devil-game-scene-03',
      hotspots: [
        h('h-12', 700, 150, 400, 450),
        h('h-13', 1260, 480, 250, 250),
        h('h-17', 1650, 1150, 250, 190),
        h('h-14', 1910, 1090, 420, 220),
        h('h-16', 2400, 800, 950, 700),
        h('h-15', 3500, 140, 440, 1200),
      ],
    },
  ],
};

export default jerseyDevil;
