import { squareSpriteBox } from '../boxes.ts';
import type { WorldLayout } from '../types.ts';
// Chupacabra Layout_Data over the three painted panoramas, in panorama pixels of the 4096 by 1536 images. Physical x on
// purpose: the painted scene is a fixed image and does not mirror in RTL. Positions were read from the scene images.
// Sprites come from the asset usage column (h-NN is hotspot-NN); `squareSpriteBox` centres each square sprite in its box.
const h = squareSpriteBox('chupacabra');

const chupacabra: WorldLayout = {
  legendId: 'chupacabra',
  scenes: [
    {
      sceneId: 'scene-farm',
      assetId: 'chupacabra-game-scene-01',
      hotspots: [
        h('h-01', 20, 760, 600, 700),
        h('h-02', 640, 1020, 380, 460),
        h('h-04', 920, 560, 680, 440),
        h('h-03', 1030, 1230, 230, 290),
        h('h-06', 1620, 620, 200, 300),
        h('h-05', 2160, 880, 300, 240),
      ],
    },
    {
      sceneId: 'scene-town',
      assetId: 'chupacabra-game-scene-02',
      hotspots: [
        h('h-07', 80, 360, 760, 1150),
        h('h-12', 860, 1140, 520, 360),
        h('h-09', 940, 80, 600, 800),
        h('h-10', 1760, 900, 500, 330),
        h('h-08', 1780, 40, 450, 740),
        h('h-11', 2290, 670, 340, 450),
        h('h-18', 2300, 200, 200, 440),
      ],
    },
    {
      sceneId: 'scene-road',
      assetId: 'chupacabra-game-scene-03',
      hotspots: [
        h('h-13', 300, 470, 200, 240),
        h('h-14', 430, 850, 540, 270),
        h('h-15', 1300, 560, 200, 360),
        h('h-16', 1600, 440, 700, 340),
        h('h-17', 3380, 590, 600, 720),
      ],
    },
  ],
};

export default chupacabra;
