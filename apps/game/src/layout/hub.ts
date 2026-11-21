import { regionBox as r } from './boxes.ts';
import type { SceneLayout } from './types.ts';

// Hall Layout_Data. Boxes are tap regions over the painted scene `hub-game-scene-01` (no sprites), in panorama pixels
// of the 4096 by 1536 image. Physical x on purpose: the painted scene is a fixed image and does not mirror in RTL.
// Positions were read from the scene image, in scene order: desk and lamp, shelf with jars, three groups of four doors,
// grandfather clock, relic cabinet, window. Door boxes are the minimum width (176) where the painted door is narrower.

/** The 12 doors in the table order of `content/hub-and-tutorial.md`. */
export const HUB_DOOR_IDS = [
  'hub-door-dutchman',
  'hub-door-baba-yaga',
  'hub-door-jersey-devil',
  'hub-door-banshee',
  'hub-door-chupacabra',
  'hub-door-draugr',
  'hub-door-el-coco',
  'hub-door-gumiho',
  'hub-door-naddaha',
  'hub-door-spring-heeled-jack',
  'hub-door-vetala',
  'hub-door-yuki-onna',
] as const;

const DOOR_X: ReadonlyArray<readonly [number, number]> = [
  [768, 176], [944, 176], [1120, 176], [1300, 180],
  [1520, 176], [1700, 176], [1880, 180], [2070, 176],
  [2300, 210], [2520, 180], [2710, 176], [2890, 176],
];

export const HUB_SCENE: SceneLayout = {
  sceneId: 'hub',
  assetId: 'hub-game-scene-01',
  hotspots: [
    r('hub-lamp', 240, 720, 190, 210),
    r('hub-desk-ledger', 250, 940, 380, 200),
    r('hub-jars', 440, 560, 280, 360),
    ...HUB_DOOR_IDS.map((id, i) => r(id, DOOR_X[i]![0], 460, DOOR_X[i]![1], 820)),
    r('hub-clock', 3080, 410, 210, 900),
    r('hub-cabinet', 3300, 620, 300, 700),
    r('hub-window', 3640, 100, 380, 1180),
  ],
};
