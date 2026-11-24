/**
 * Geometry of the True card art. Shared by the HTML renderer (CSS) and the
 * WebGL renderer (uniforms). All values are fixed properties of the art files
 * in assets/shell/, not props.
 */

/** Frame, subject and back images, in art units (px of the source files). */
export const ART = { w: 1000, h: 1400 } as const;

/** Background image: same 5:7 ratio, drawn larger so parallax never shows an edge. */
export const BG_ART = { w: 1200, h: 1680 } as const;

/** Opaque outline of the frame inside the 1000x1400 art. This is the card shape. */
export const OUTLINE = { x0: 22, x1: 978, y0: 41, y1: 1360 } as const;

/** Outline size in art units (956 x 1319). */
export const OUTLINE_SIZE = {
  w: OUTLINE.x1 - OUTLINE.x0,
  h: OUTLINE.y1 - OUTLINE.y0,
} as const;

/** Stage (card box) aspect ratio, inline / block. */
export const STAGE_ASPECT = `${OUTLINE_SIZE.w} / ${OUTLINE_SIZE.h}`;

/** Width steps requested from the image CDN. */
export const HOLO_STEPS = [360, 420, 480, 560, 640, 800, 1000, 1200] as const;

/**
 * `sizes` attribute for layer images: the art box is about 1.1 times the stage
 * width, and the stage is capped at 28rem.
 */
export const HOLO_SIZES = 'min(110vw, 30.8rem)';

/** Tilt at full deflection, in degrees. */
export const TILT_MAX_DEG = 12;

/** Layer travel at full tilt, in percent of card width. Background moves opposite. */
export const PARALLAX = { background: 3.5, subject: 1.0 } as const;

/**
 * Art box inside the stage, in percent of the stage. The art is larger than the
 * outline and clipped by it. Symmetric left to right, so the same in RTL.
 */
export const ART_BOX = {
  insetInlineStart: (-OUTLINE.x0 / OUTLINE_SIZE.w) * 100, // -2.3013
  inlineSize: (ART.w / OUTLINE_SIZE.w) * 100, // 104.6025
  insetBlockStart: (-OUTLINE.y0 / OUTLINE_SIZE.h) * 100, // -3.1085
  blockSize: (ART.h / OUTLINE_SIZE.h) * 100, // 106.1410
} as const;

/** Cartouche text box in art units (frame x 410 to 590, y 1215 to 1300). */
export const CARTOUCHE_ART = { x0: 410, x1: 590, y0: 1215, y1: 1300 } as const;

/** Cartouche text box in percent of the art box. */
export const CARTOUCHE = {
  insetInlineStart: (CARTOUCHE_ART.x0 / ART.w) * 100, // 41
  inlineSize: ((CARTOUCHE_ART.x1 - CARTOUCHE_ART.x0) / ART.w) * 100, // 18
  insetBlockStart: (CARTOUCHE_ART.y0 / ART.h) * 100, // 86.79
  blockSize: ((CARTOUCHE_ART.y1 - CARTOUCHE_ART.y0) / ART.h) * 100, // 6.07
} as const;

/** Largest rotation around the horizontal axis while dragging, in degrees. */
export const DRAG_TILT_MAX_DEG = 20;

/** Pointer path length in px above which a press counts as a drag. */
export const DRAG_THRESHOLD_PX = 10;

/** Exponential friction of the spin after release, per second. */
export const SPIN_FRICTION = 3.2;

/** Largest spin speed in degrees per second. */
export const SPIN_MAX_VELOCITY = 1440;

/** Inertia hands over to the settle spring below this speed, in degrees per second. */
export const SPIN_SETTLE_BELOW = 60;

/** Settle spring toward the nearest multiple of 180 degrees. Slightly under critical damping. */
export const SPIN_SETTLE_SPRING = { stiffness: 120, damping: 20 } as const;

/** One arrow key press, in degrees. */
export const ARROW_STEP_DEG = 60;

/** Quiet time after the last arrow step before the card settles, in ms. */
export const ARROW_IDLE_MS = 700;
