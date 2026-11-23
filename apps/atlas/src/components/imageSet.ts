import { assetUrl, HERO_SMALL_MEDIA, heroSmall, responsiveImage, type ResponsiveImage } from '@kiroween/skeleton/client';
/** Width steps of the CDN copies of an atlas image (the CDN never upsizes: steps above the original are dropped). */
export const WIDTH_STEPS = [400, 800, 1200, 1600, 2400] as const;
/** The home and legend heroes fill the page, which is at most 72rem wide (`max-w-6xl`). */
export const HERO_SIZES = 'min(100vw, 72rem)';
/** Chapter plates sit inside the book page. */
export const PLATE_SIZES = '(min-width: 48rem) 40rem, 100vw';
/** The same `src`, `srcset` and `sizes` for the `img` and for its preload link, so the preload is the file the img picks. */
export function widthCopies(image: { id: string; width: number; height: number }, base: string, sizes: string): ResponsiveImage | null {
  return responsiveImage({ id: image.id, base, axis: 'w', steps: WIDTH_STEPS, width: image.width, height: image.height, sizes });
}
/** The root loader's image CDN base: '' when the CDN is off. */
export const imageBaseOf = (matches: readonly { loaderData?: unknown }[]): string => (matches[0]?.loaderData as { imageBase?: string } | undefined)?.imageBase ?? '';
/**
 * Preload links for a hero, matching the `img` Img renders. CDN on: one link with the same `srcset` and `sizes`.
 * CDN off: today's links, the phone copy at the media query and the full image otherwise (R13.3, R13.4).
 */
export function heroPreloads(hero: { id: string; width: number; height: number } | null, imageBase: string, phoneCopy: boolean) {
  if (!hero) return [];
  const copies = widthCopies(hero, imageBase, HERO_SIZES);
  const full = { rel: 'preload', as: 'image', href: copies?.src ?? assetUrl(hero.id), fetchPriority: 'high' as const };
  if (copies) return [{ ...full, imageSrcSet: copies.srcSet, imageSizes: copies.sizes }];
  const small = phoneCopy ? heroSmall(hero) : null;
  return small
    ? [{ ...full, href: assetUrl(small.id), media: HERO_SMALL_MEDIA }, { ...full, media: `not all and ${HERO_SMALL_MEDIA}` }]
    : [full];
}
