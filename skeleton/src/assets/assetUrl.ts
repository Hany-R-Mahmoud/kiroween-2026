// Asset ids and their URLs, following the folder rule in assets/README.md. Pure: no file system access.
const ASSET_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** URL prefix for images. The atlas's build files use /assets/ and the game's use /game/, so this clashes with neither. */
export const MEDIA_PREFIX = '/media/';
export class AssetIdError extends Error {
  constructor() {
    super('Not a valid asset id.');
    this.name = 'AssetIdError';
  }
}
/**
 * `shared-*` -> /media/shared/<id>.webp; `hub-*` and `tutorial-*` -> /media/hub/<id>.webp;
 * `<legend-id>-<surface>-<kind>-<nn>` -> /media/<legend-id>/<surface>/<id>.webp, where the surface is the first
 * `-atlas-`, `-game-` or `-shared-` after a non-empty legend prefix. Throws on anything else.
 */
export function assetUrl(id: string): string {
  if (id.length > 100 || !ASSET_ID.test(id)) throw new AssetIdError();
  if (id.startsWith('shared-')) return `${MEDIA_PREFIX}shared/${id}.webp`;
  if (id.startsWith('hub-') || id.startsWith('tutorial-')) return `${MEDIA_PREFIX}hub/${id}.webp`;
  const m = /^(.+?)-(atlas|game|shared)-./.exec(id);
  if (!m) throw new AssetIdError();
  return `${MEDIA_PREFIX}${m[1]}/${m[2]}/${id}.webp`;
}
/** Width and height from the content's size text ("2400x1350 (16:9)", "16:9, 2400×1350", "Square, 512×512"), or null. */
export function parseAssetSize(text: string): { width: number; height: number } | null {
  const m = /(\d{2,5})\s*[x×]\s*(\d{2,5})/.exec(text);
  return m ? { width: Number(m[1]), height: Number(m[2]) } : null;
}
