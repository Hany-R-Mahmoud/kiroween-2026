import { assetUrl, imageUrl, responsiveImage } from '@kiroween/skeleton/client';

/**
 * The image URL for an asset id: the media base (empty for same origin, or an origin such as the atlas) followed by the
 * canonical `assetUrl` path. Throws the same `AssetIdError` as `assetUrl` for any id it refuses.
 */
export function mediaUrl(base: string, assetId: string): string {
  const path = assetUrl(assetId);
  return `${base.replace(/\/+$/, '')}${path}`;
}
/**
 * Attributes for an `img` of an asset. With no image CDN base this is exactly `{ src: mediaUrl(mediaBase, id) }`, so
 * pages without IMAGE_CDN_URL are unchanged. With a base the src and srcset point at sized CDN copies.
 */
export function imageAttrs(
  mediaBase: string,
  imageBase: string,
  assetId: string,
  copies: { axis: 'w' | 'h'; steps: readonly number[]; width: number; height: number; sizes: string },
): { src: string; srcSet?: string; sizes?: string } {
  const r = responsiveImage({ id: assetId, base: imageBase, ...copies });
  if (r) return r;
  return { src: imageBase ? imageUrl(assetId, imageBase) : mediaUrl(mediaBase, assetId) };
}
