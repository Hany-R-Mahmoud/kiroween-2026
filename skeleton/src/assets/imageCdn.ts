// Image CDN URLs (ImageKit, free plan). The CDN fetches each original from our own /media/ folder, resizes it from the
// URL and serves it. Pure: no file system access. An empty base means "no CDN": every function then returns what
// `assetUrl` returns today, so pages without the variable are byte for byte as before.
import { assetUrl, MEDIA_PREFIX } from './assetUrl.ts';

/** `w` sets the width, `h` the height, in whole pixels. */
export type ImageAxis = 'w' | 'h';
const MAX_SIDE = 8192;

/** A CDN base is empty (off) or an https origin with at most one path segment, no query or fragment. Anything else is a configuration error. */
export function parseImageBase(raw: string | undefined): string {
  const v = raw?.trim() ?? '';
  if (!v) return '';
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    throw new RangeError('IMAGE_CDN_URL is not a valid URL');
  }
  if (url.protocol !== 'https:' || url.username || url.password) throw new RangeError('IMAGE_CDN_URL must be an https origin');
  // One path segment is allowed: ImageKit endpoints look like https://ik.imagekit.io/<id>.
  if (url.pathname.replace(/^\/|\/$/g, '').includes('/')) throw new RangeError('IMAGE_CDN_URL must be an origin and at most one path segment');
  if (url.search || url.hash) throw new RangeError('IMAGE_CDN_URL must have no query or fragment');
  return `${url.origin}${url.pathname}`.replace(/\/+$/, '');
}

function size(n: number): number {
  if (!Number.isSafeInteger(n) || n < 1 || n > MAX_SIDE) throw new RangeError('Not a valid image size.');
  return n;
}

/**
 * No base: exactly `assetUrl(id)`. With a base: `<base>/<path after /media/>`, plus `?tr=<w|h>-<N>` when `tr` is given.
 * The id is validated by `assetUrl`; `tr` is built from integers only.
 */
export function imageUrl(id: string, base: string, tr?: { axis: ImageAxis; n: number }): string {
  const path = assetUrl(id);
  if (!base) return path;
  const url = `${base.replace(/\/+$/, '')}/${path.slice(MEDIA_PREFIX.length)}`;
  return tr ? `${url}?tr=${tr.axis}-${size(tr.n)}` : url;
}

export interface ResponsiveImage {
  src: string;
  srcSet: string;
  sizes: string;
}

/**
 * CDN copies of one image for `srcset`. `steps` are sizes on `axis` (width steps for `w`, height steps for `h`); steps
 * above the original are dropped. The `w` descriptor is the copy's real width (from the aspect ratio for height steps).
 * Returns null when there is no base or no step fits, and the caller keeps today's markup.
 */
export function responsiveImage(p: {
  id: string;
  base: string;
  axis: ImageAxis;
  steps: readonly number[];
  width: number;
  height: number;
  sizes: string;
}): ResponsiveImage | null {
  if (!p.base) return null;
  const own = p.axis === 'w' ? p.width : p.height;
  const steps = [...new Set(p.steps)].filter((n) => n <= own).sort((a, b) => a - b);
  if (steps.length === 0) return null;
  const widthOf = (n: number) => (p.axis === 'w' ? n : Math.round((n * p.width) / p.height));
  const srcSet = steps.map((n) => `${imageUrl(p.id, p.base, { axis: p.axis, n })} ${widthOf(n)}w`).join(', ');
  const src = imageUrl(p.id, p.base, { axis: p.axis, n: steps.filter((n) => n <= (p.axis === 'w' ? 1200 : 900)).at(-1) ?? steps[0]! });
  return { src, srcSet, sizes: p.sizes };
}
