import { squareSpriteBox } from '../boxes.ts';
import type { WorldLayout } from '../types.ts';
// Naddaha Layout_Data over the three painted panoramas, in panorama pixels of the 4096 by 1536 images. Physical x
// on purpose: the painted scene is a fixed image and does not mirror in RTL. Positions were read from the scene images.
// Sprites come from the asset usage column (h-NN is hotspot-NN); `squareSpriteBox` centres each square sprite in its box.
const h = squareSpriteBox('naddaha');

const naddaha: WorldLayout = {
  legendId: 'naddaha',
  scenes: [
    {
      sceneId: 'scene-edge',
      assetId: 'naddaha-game-scene-01',
      hotspots: [
        h('h-01', 1060, 450, 220, 270),
        h('h-02', 1560, 1060, 190, 200),
        h('h-04', 1590, 1355, 460, 176),
        h('h-03', 1800, 700, 650, 400),
        h('h-05', 2050, 1110, 570, 340),
        h('h-06', 2650, 1000, 350, 470),
        h('h-07', 3000, 300, 240, 650),
      ],
    },
    {
      sceneId: 'scene-canal',
      assetId: 'naddaha-game-scene-02',
      hotspots: [
        h('h-12', 100, 100, 420, 800),
        h('h-09', 500, 1310, 520, 200),
        h('h-08', 560, 600, 700, 700),
        h('h-10', 1290, 1190, 340, 220),
        h('h-11', 1650, 1000, 560, 420),
      ],
    },
    {
      sceneId: 'scene-nile',
      assetId: 'naddaha-game-scene-03',
      hotspots: [
        h('h-13', 910, 1040, 680, 250),
        h('h-14', 1595, 1110, 176, 230),
        h('h-16', 1780, 1170, 650, 250),
        h('h-17', 1900, 630, 176, 176),
        h('h-15', 2150, 900, 200, 260),
        h('h-18', 2450, 1280, 640, 230),
      ],
    },
  ],
};

export default naddaha;
