import { squareSpriteBox } from '../boxes.ts';
import type { WorldLayout } from '../types.ts';
// Spring-heeled Jack Layout_Data over the three painted panoramas, in panorama pixels of the 4096 by 1536 images. Physical x
// on purpose: the painted scene is a fixed image and does not mirror in RTL. Positions were read from the scene images.
// Sprites come from the asset usage column (h-NN is hotspot-NN); `squareSpriteBox` centres each square sprite in its box.
const h = squareSpriteBox('spring-heeled-jack');

const springHeeledJack: WorldLayout = {
  legendId: 'spring-heeled-jack',
  scenes: [
    {
      sceneId: 'scene-lane',
      assetId: 'spring-heeled-jack-game-scene-01',
      hotspots: [
        h('h-04', 60, 520, 360, 640),
        h('h-01', 440, 130, 200, 700),
        h('h-06', 670, 1050, 470, 480),
        h('h-02', 1540, 650, 890, 670),
        h('h-03', 2610, 560, 500, 570),
        h('h-05', 3230, 600, 520, 550),
      ],
    },
    {
      sceneId: 'scene-mansion',
      assetId: 'spring-heeled-jack-game-scene-02',
      hotspots: [
        h('h-07', 255, 760, 675, 735),
        h('h-08', 1890, 840, 176, 260),
        h('h-11', 1908, 120, 176, 176),
        h('h-09', 2080, 840, 176, 260),
        h('h-10', 2380, 880, 176, 220),
        h('h-12', 2890, 870, 710, 580),
      ],
    },
    {
      sceneId: 'scene-roofs',
      assetId: 'spring-heeled-jack-game-scene-03',
      hotspots: [
        h('h-14', 290, 280, 190, 230),
        h('h-13', 730, 390, 270, 240),
        h('h-15', 1130, 845, 335, 680),
        h('h-16', 1900, 1230, 500, 290),
        h('h-17', 2455, 750, 585, 780),
        h('h-18', 3245, 900, 300, 620),
      ],
    },
  ],
};

export default springHeeledJack;
