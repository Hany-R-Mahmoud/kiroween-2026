import { squareSpriteBox } from '../boxes.ts';
import type { WorldLayout } from '../types.ts';
// Vetala Layout_Data over the three painted panoramas, in panorama pixels of the 4096 by 1536 images. Physical x
// on purpose: the painted scene is a fixed image and does not mirror in RTL. Positions were read from the scene images.
// Sprites come from the asset usage column (h-NN is hotspot-NN); `squareSpriteBox` centres each square sprite in its box.
const h = squareSpriteBox('vetala');

const vetala: WorldLayout = {
  legendId: 'vetala',
  scenes: [
    {
      sceneId: 'scene-palace',
      assetId: 'vetala-game-scene-01',
      hotspots: [
        h('h-01', 295, 1090, 705, 320),
        h('h-03', 1125, 50, 540, 850),
        h('h-02', 1840, 1250, 200, 200),
        h('h-06', 1855, 550, 245, 690),
        h('h-04', 2560, 1260, 580, 260),
        h('h-05', 3160, 1000, 730, 500),
      ],
    },
    {
      sceneId: 'scene-tree',
      assetId: 'vetala-game-scene-02',
      hotspots: [
        h('h-11', 1330, 640, 480, 280),
        h('h-10', 1470, 1340, 810, 196),
        h('h-07', 2200, 0, 1700, 1150),
        h('h-08', 2340, 1320, 420, 200),
        h('h-09', 2765, 1240, 200, 260),
      ],
    },
    {
      sceneId: 'scene-road',
      assetId: 'vetala-game-scene-03',
      hotspots: [
        h('h-12', 165, 885, 310, 435),
        h('h-13', 1320, 150, 740, 880),
        h('h-14', 2090, 665, 300, 410),
        h('h-15', 2450, 1200, 900, 300),
        h('h-16', 3400, 760, 420, 300),
      ],
    },
  ],
};

export default vetala;
