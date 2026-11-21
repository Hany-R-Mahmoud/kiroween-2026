import type { HotspotBox } from './types.ts';

// Box builders shared by the layout files. Panorama pixels, physical x on purpose: the painted scene is a fixed image
// and does not mirror in RTL.

/** A tap region over the painted scene, no sprite (Hall and Tutorial_Room). */
export function regionBox(id: string, x: number, y: number, w: number, h: number): HotspotBox {
  return { id, x, y, w, h, region: true };
}

/**
 * Box builder for a World whose sprite files are square (1024 by 1024) and named `<legend-id>-game-hotspot-NN` for
 * hotspot `h-NN`. The art box is the largest square that fits the tap box, centred in it, so the sprite keeps its
 * aspect ratio instead of stretching.
 */
export function squareSpriteBox(legendId: string) {
  return (id: string, x: number, y: number, w: number, h: number): HotspotBox => {
    const side = Math.min(w, h);
    return {
      id,
      x,
      y,
      w,
      h,
      sprite: {
        assetId: `${legendId}-game-hotspot-${id.slice('h-'.length)}`,
        x: x + Math.round((w - side) / 2),
        y: y + Math.round((h - side) / 2),
        w: side,
        h: side,
      },
    };
  };
}
