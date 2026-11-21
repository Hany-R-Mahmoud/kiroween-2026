import { squareSpriteBox } from '../boxes.ts';
import type { WorldLayout } from '../types.ts';
// Flying Dutchman Layout_Data over the three painted panoramas, in panorama pixels of the 4096 by 1536 images. Physical x
// on purpose: the painted scene is a fixed image and does not mirror in RTL. Positions were read from the scene images.
// Sprites come from the asset usage column (h-NN is hotspot-NN); `squareSpriteBox` centres each square sprite in its box.
const h = squareSpriteBox('flying-dutchman');

const flyingDutchman: WorldLayout = {
  legendId: 'flying-dutchman',
  scenes: [
    {
      sceneId: 'sc-deck',
      assetId: 'flying-dutchman-game-scene-01',
      hotspots: [
        h('h-01', 80, 560, 440, 900),
        h('h-03', 530, 825, 470, 400),
        h('h-04', 1010, 760, 200, 220),
        h('h-02', 1215, 1010, 250, 270),
        h('h-06', 1500, 870, 190, 410),
        h('h-05', 1700, 900, 470, 200),
      ],
    },
    {
      sceneId: 'sc-cabin',
      assetId: 'flying-dutchman-game-scene-02',
      hotspots: [
        h('h-11', 190, 150, 740, 495),
        h('h-09', 1010, 600, 580, 330),
        h('h-07', 1710, 930, 470, 230),
        h('h-12', 2200, 650, 230, 340),
        h('h-10', 2440, 870, 176, 240),
        h('h-08', 2680, 300, 220, 480),
      ],
    },
    {
      sceneId: 'sc-hold',
      assetId: 'flying-dutchman-game-scene-03',
      hotspots: [
        h('h-13', 95, 320, 1070, 1150),
        h('h-15', 1180, 1110, 1040, 340),
        h('h-14', 1646, 320, 740, 780),
        h('h-16', 2400, 280, 240, 560),
      ],
    },
  ],
};

export default flyingDutchman;
