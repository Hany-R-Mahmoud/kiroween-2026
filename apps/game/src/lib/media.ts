import { assetUrl } from '@kiroween/skeleton/client';

/**
 * The image URL for an asset id: the media base (empty for same origin, or an origin such as the atlas) followed by the
 * canonical `assetUrl` path. Throws the same `AssetIdError` as `assetUrl` for any id it refuses.
 */
export function mediaUrl(base: string, assetId: string): string {
  const path = assetUrl(assetId);
  return `${base.replace(/\/+$/, '')}${path}`;
}
