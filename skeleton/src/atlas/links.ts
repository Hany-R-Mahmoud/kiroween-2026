// Deep links into the atlas (decision 9). Pure: the game calls atlasUrl in Phase 4 to open a hint's chapter.
const LEGEND_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** `<legend-id>--ch-<n>`, `<legend-id>--versions` or `<legend-id>--versions--<version-id>`, as stored in `anchors`. */
export const ANCHOR_RE = /^[a-z0-9]+(-[a-z0-9]+)*--(ch-[1-9][0-9]?|versions(--[a-z0-9]+(-[a-z0-9]+)*)?)$/;
const MAX_ANCHOR = 120;
export class AtlasLinkError extends Error {
  constructor(what: 'legend id' | 'anchor') {
    super(`Not a valid ${what}.`);
    this.name = 'AtlasLinkError';
  }
}
export const isAnchor = (s: string): boolean => s.length <= MAX_ANCHOR && ANCHOR_RE.test(s);
export const isLegendId = (s: string): boolean => s.length <= 100 && LEGEND_ID.test(s);
/** `/legends/<legend-id>`, root-relative. */
export function legendUrl(legendId: string): string {
  if (!isLegendId(legendId)) throw new AtlasLinkError('legend id');
  return `/legends/${legendId}`;
}
/** `/legends/<legend-id>#<anchor>`, root-relative. Checks the format only; whether the anchor exists is the resolver's job. */
export function atlasUrl(anchor: string): string {
  if (!isAnchor(anchor)) throw new AtlasLinkError('anchor');
  return `${legendUrl(anchor.slice(0, anchor.indexOf('--')))}#${anchor}`;
}
