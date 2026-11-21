// Physical x on purpose (requirement 8.3, steering i18n-rtl.md exception): the painted scene is a fixed image and does
// not mirror for Arabic (RTL). `pan` is the physical x offset of the scene's left edge inside the viewport, so it is
// 0 at the scene's left edge and negative when the scene is moved left. The same applies to Layout_Data coordinates.

/** Keeps the scene covering the viewport: the result lies in [min(0, viewport - scene), 0]. Idempotent. */
export function clampPan(pan: number, viewportWidth: number, sceneWidth: number): number {
  const min = Math.min(0, viewportWidth - sceneWidth);
  const p = Number.isFinite(pan) ? pan : 0;
  return Math.min(0, Math.max(min, p));
}

/**
 * The pan after which the box (physical x and width in scene pixels) is fully visible, moving as little as possible.
 * A box already inside the viewport leaves the pan unchanged (apart from clamping). A box wider than the viewport
 * gets its left edge aligned to the viewport's left edge.
 */
export function panToReveal(pan: number, box: { x: number; width: number }, viewportWidth: number, sceneWidth: number): number {
  const current = clampPan(pan, viewportWidth, sceneWidth);
  const left = box.x + current;
  const right = left + box.width;
  if (box.width >= viewportWidth) return clampPan(-box.x, viewportWidth, sceneWidth);
  if (left < 0) return clampPan(current - left, viewportWidth, sceneWidth);
  if (right > viewportWidth) return clampPan(current - (right - viewportWidth), viewportWidth, sceneWidth);
  return current;
}
