import { squareSpriteBox } from '../boxes.ts';
import type { WorldLayout } from '../types.ts';
// Yuki-onna Layout_Data over the three painted panoramas, in panorama pixels of the 4096 by 1536 images. Physical x
// on purpose: the painted scene is a fixed image and does not mirror in RTL. Positions were read from the scene images.
// Sprites come from the asset usage column (h-NN is hotspot-NN); `squareSpriteBox` centres each square sprite in its box.
const h = squareSpriteBox('yuki-onna');

const yukiOnna: WorldLayout = {
  legendId: 'yuki-onna',
  scenes: [
    {
      sceneId: 'scene-landing',
      assetId: 'yuki-onna-game-scene-01',
      hotspots: [
        h('h-03', 0, 0, 730, 680),
        h('h-02', 70, 850, 660, 390),
        h('h-04', 745, 690, 180, 540),
        h('h-01', 935, 1035, 890, 245),
        h('h-05', 3150, 815, 190, 300),
      ],
    },
    {
      sceneId: 'scene-hut',
      assetId: 'yuki-onna-game-scene-02',
      hotspots: [
        h('h-07', 570, 1030, 1030, 420),
        h('h-10', 1620, 1085, 380, 405),
        h('h-09', 1800, 0, 620, 460),
        h('h-06', 2470, 1090, 340, 340),
        h('h-08', 2990, 570, 570, 925),
      ],
    },
    {
      sceneId: 'scene-farmhouse',
      assetId: 'yuki-onna-game-scene-03',
      hotspots: [
        h('h-16', 920, 1170, 420, 360),
        h('h-12', 1000, 855, 210, 200),
        h('h-13', 1375, 940, 790, 470),
        h('h-11', 2170, 595, 845, 830),
        h('h-14', 3040, 620, 190, 190),
        h('h-15', 3050, 1170, 600, 330),
      ],
    },
  ],
};

export default yukiOnna;
