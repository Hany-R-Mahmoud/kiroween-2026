import { squareSpriteBox } from '../boxes.ts';
import type { WorldLayout } from '../types.ts';
// Baba Yaga Layout_Data over the three painted panoramas, in panorama pixels of the 4096 by 1536 images. Physical x on
// purpose: the painted scene is a fixed image and does not mirror in RTL. Positions were read from the scene images.
// Sprites come from the asset usage column (h-NN is hotspot-NN); `squareSpriteBox` centres each square sprite in its box.
const h = squareSpriteBox('baba-yaga');

const babaYaga: WorldLayout = {
  legendId: 'baba-yaga',
  scenes: [
    {
      sceneId: 'scene-clearing',
      assetId: 'baba-yaga-game-scene-01',
      hotspots: [
        h('h-06', 220, 320, 440, 520),
        h('h-01', 680, 660, 680, 720),
        h('h-02', 1370, 680, 580, 640),
        h('h-04', 1960, 1270, 650, 250),
        h('h-05', 2300, 380, 600, 740),
        h('h-03', 3220, 1020, 440, 460),
      ],
    },
    {
      sceneId: 'scene-hut-inside',
      assetId: 'baba-yaga-game-scene-02',
      hotspots: [
        h('h-10', 560, 120, 520, 520),
        h('h-09', 1040, 720, 720, 360),
        h('h-11', 1200, 200, 960, 440),
        h('h-08', 1830, 800, 620, 280),
        h('h-07', 2260, 340, 420, 440),
        h('h-12', 2920, 80, 300, 400),
      ],
    },
    {
      sceneId: 'scene-night-yard',
      assetId: 'baba-yaga-game-scene-03',
      hotspots: [
        h('h-17', 120, 880, 680, 420),
        h('h-13', 850, 920, 620, 560),
        h('h-14', 1700, 660, 300, 340),
        h('h-15', 2010, 1060, 960, 340),
        h('h-16', 3460, 760, 300, 440),
      ],
    },
  ],
};

export default babaYaga;
