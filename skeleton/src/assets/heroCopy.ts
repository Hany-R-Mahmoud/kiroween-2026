// Phone-sized copies of hero images. Pure: no file system access. The copies are made at build time (apps/atlas/vite.media.ts).
export const HERO_SMALL_WIDTH = 1000;
/** The `picture` source media query. Width only, never pixel density (Requirement 13.8). */
export const HERO_SMALL_MEDIA = `(max-width: ${HERO_SMALL_WIDTH}px)`;
const HERO_ID = /-hero-/;
/** True for ids that get a small copy. */
export const hasHeroCopy = (id: string, width: number): boolean => HERO_ID.test(id) && width > HERO_SMALL_WIDTH;
/** Asset id of the small copy of a hero image. */
export const heroSmallId = (id: string): string => `${id}-w${HERO_SMALL_WIDTH}`;
/** Declared size of the small copy: width 1000, height by the full image's aspect ratio. */
export const heroSmallSize = (width: number, height: number): { width: number; height: number } => ({
  width: HERO_SMALL_WIDTH,
  height: Math.round((height * HERO_SMALL_WIDTH) / width),
});
/** The small copy of `image`, or null when the build makes none for it. */
export function heroSmall(image: { id: string; width: number; height: number }): { id: string; width: number; height: number } | null {
  return hasHeroCopy(image.id, image.width) ? { id: heroSmallId(image.id), ...heroSmallSize(image.width, image.height) } : null;
}
/** Which copy a viewport loads. Depends on the width only: the pixel ratio is accepted and ignored on purpose. */
export function heroSource(viewportCssWidth: number, _devicePixelRatio: number): 'small' | 'full' {
  return viewportCssWidth <= HERO_SMALL_WIDTH ? 'small' : 'full';
}
