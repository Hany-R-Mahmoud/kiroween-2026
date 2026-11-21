import { squareSpriteBox } from '../boxes.ts';
import type { WorldLayout } from '../types.ts';
// El Coco Layout_Data over the three painted panoramas, in panorama pixels of the 4096 by 1536 images. Physical x on
// purpose: the painted scene is a fixed image and does not mirror in RTL. Positions were read from the scene images.
// Sprites come from the asset usage column (h-NN is hotspot-NN); `squareSpriteBox` centres each square sprite in its box.
const h = squareSpriteBox('el-coco');

const elCoco: WorldLayout = {
  legendId: 'el-coco',
  scenes: [
    {
      sceneId: 'scene-nursery',
      assetId: 'el-coco-game-scene-01',
      hotspots: [
        h('h-01', 707, 820, 960, 680),
        h('h-02', 1700, 930, 330, 580),
        h('h-03', 2440, 700, 210, 190),
        h('h-05', 2740, 970, 360, 330),
        h('h-04', 3500, 300, 500, 900),
      ],
    },
    {
      sceneId: 'scene-street',
      assetId: 'el-coco-game-scene-02',
      hotspots: [
        h('h-08', 130, 200, 840, 1300),
        h('h-09', 1150, 470, 230, 400),
        h('h-06', 1600, 60, 900, 330),
        h('h-07', 2930, 950, 220, 300),
        h('h-10', 3140, 110, 300, 450),
      ],
    },
    {
      sceneId: 'scene-workshop',
      assetId: 'el-coco-game-scene-03',
      hotspots: [
        h('h-11', 460, 950, 650, 220),
        h('h-14', 930, 765, 215, 180),
        h('h-12', 1550, 400, 1060, 585),
        h('h-13', 2630, 760, 920, 560),
      ],
    },
  ],
};

export default elCoco;
