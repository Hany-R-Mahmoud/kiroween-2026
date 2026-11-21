import { squareSpriteBox } from '../boxes.ts';
import type { WorldLayout } from '../types.ts';
// Draugr Layout_Data over the three painted panoramas, in panorama pixels of the 4096 by 1536 images. Physical x on
// purpose: the painted scene is a fixed image and does not mirror in RTL. Positions were read from the scene images.
// Sprites come from the asset usage column (h-NN is hotspot-NN); `squareSpriteBox` centres each square sprite in its box.
const h = squareSpriteBox('draugr');

const draugr: WorldLayout = {
  legendId: 'draugr',
  scenes: [
    {
      sceneId: 'scene-yard',
      assetId: 'draugr-game-scene-01',
      hotspots: [
        h('h-05', 0, 620, 500, 730),
        h('h-01', 520, 1135, 760, 290),
        h('h-06', 925, 690, 176, 190),
        h('h-04', 1110, 730, 270, 360),
        h('h-02', 2970, 740, 320, 260),
        h('h-03', 3310, 860, 630, 650),
      ],
    },
    {
      sceneId: 'scene-hall',
      assetId: 'draugr-game-scene-02',
      hotspots: [
        h('h-07', 325, 280, 915, 1120),
        h('h-12', 2240, 900, 740, 330),
        h('h-11', 2615, 1240, 360, 210),
        h('h-10', 2985, 1215, 355, 250),
        h('h-09', 3165, 540, 245, 350),
        h('h-08', 3420, 240, 660, 1240),
      ],
    },
    {
      sceneId: 'scene-fjord',
      assetId: 'draugr-game-scene-03',
      hotspots: [
        h('h-13', 0, 600, 850, 510),
        h('h-15', 860, 985, 290, 470),
        h('h-18', 1235, 1010, 855, 490),
        h('h-14', 2160, 1000, 520, 360),
        h('h-16', 2725, 1265, 380, 190),
        h('h-17', 3115, 780, 385, 495),
      ],
    },
  ],
};

export default draugr;
