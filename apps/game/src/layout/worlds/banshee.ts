import type { HotspotBox, WorldLayout } from '../types.ts';
// Banshee Layout_Data over the three painted panoramas, in panorama pixels of the 4096 by 1536 images. Physical x on
// purpose: the painted scene is a fixed image and does not mirror in RTL. Positions were read from the scene images;
// each sprite is drawn over the tap box. Sprites come from the asset usage column.
const h = (id: string, n: string, x: number, y: number, w: number, hh: number, crop?: 'left' | 'right'): HotspotBox => ({
  id,
  x,
  y,
  w,
  h: hh,
  sprite: { assetId: `banshee-game-hotspot-${n}`, ...(crop ? { crop } : {}), x, y, w, h: hh },
});

const banshee: WorldLayout = {
  legendId: 'banshee',
  scenes: [
    {
      sceneId: 'sc-kitchen',
      assetId: 'banshee-game-scene-01',
      hotspots: [
        h('hs-dresser', '02', 860, 250, 580, 1000),
        h('hs-wheel', '04', 1470, 660, 360, 800),
        h('hs-hearth', '01', 1850, 300, 800, 1000),
        h('hs-clock', '05', 2680, 300, 200, 260),
        h('hs-cat', '06', 2900, 780, 200, 220),
        h('hs-shawl', '03', 3700, 440, 300, 740),
      ],
    },
    {
      sceneId: 'sc-ford',
      assetId: 'banshee-game-scene-02',
      hotspots: [
        h('hs-thorn', '11', 300, 150, 900, 1000),
        h('hs-heron', '10', 1210, 780, 220, 300),
        h('hs-stones', '09', 1450, 960, 1100, 360),
        h('hs-washstone', '07', 2640, 900, 640, 500),
        h('hs-beetle', '08', 3300, 960, 300, 420),
      ],
    },
    {
      sceneId: 'sc-loft',
      assetId: 'banshee-game-scene-03',
      hotspots: [
        h('hs-bedstead', '15', 90, 640, 990, 850, 'left'),
        h('hs-casement', '12', 1100, 260, 450, 650),
        h('hs-candle', '15', 2230, 1230, 230, 230, 'right'),
        h('hs-journal', '14', 2560, 820, 520, 420),
        h('hs-comb', '13', 3440, 1040, 300, 260),
      ],
    },
  ],
};

export default banshee;
