import { atlasUrl, isAnchor } from '@kiroween/skeleton/client';
export type AnchorResult = { kind: 'redirect'; href: string } | { kind: 'notFound' };
/**
 * `/anchor/<anchor>` (R5.3): the format is checked first, so a malformed anchor never reaches the lookup; a stored
 * anchor redirects to its place on the legend page; anything else is not found.
 */
export async function resolveAnchor(anchor: string, lookup: (anchor: string) => Promise<string | null>): Promise<AnchorResult> {
  if (!isAnchor(anchor)) return { kind: 'notFound' };
  return (await lookup(anchor)) === null ? { kind: 'notFound' } : { kind: 'redirect', href: atlasUrl(anchor) };
}
