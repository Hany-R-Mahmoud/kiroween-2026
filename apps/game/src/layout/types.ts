// Layout_Data types. Coordinates are in panorama pixels of the 4096 by 1536 scene image, origin at the top left.
// Physical x on purpose: the painted scene is a fixed image and does not mirror in RTL (steering i18n-rtl.md, exception).

export const SCENE_WIDTH = 4096;
export const SCENE_HEIGHT = 1536;
/** Smallest tap target side on screen, CSS px. */
export const MIN_TARGET_PX = 44;
/** Smallest tap box side: 44 CSS px at the minimum scale of 0.25. */
export const MIN_BOX = 176;

export interface HotspotBox {
  /** Content hotspot id without the legend prefix, e.g. `hs-comb`. */
  id: string;
  /** Top-left of the tap box, panorama px. */
  x: number;
  y: number;
  /** Tap box size, panorama px; at least MIN_BOX. */
  w: number;
  h: number;
  /** Drawn art box. `crop` picks one half of a shared sprite sheet. */
  sprite?: { assetId: string; crop?: 'left' | 'right'; x: number; y: number; w: number; h: number };
  /** Hall and tutorial: a tap region over the painted scene, no sprite. */
  region?: true;
}

/** `hotspots` are ordered by ascending x. `sceneId` is the content scene id without the legend prefix. */
export interface SceneLayout {
  sceneId: string;
  assetId: string;
  hotspots: HotspotBox[];
}

export interface WorldLayout {
  legendId: string;
  scenes: SceneLayout[];
}
