import type { Legend } from '../model/schema.ts';

export interface Relic {
  assetId: string;
  /** The display name, or null when the content gives none. The caller then uses the catalog `world.relic.fallback` with the legend title. */
  name: string | null;
}

const RELIC_ASSET = /-game-relic-\d+$/;
const PREFIX = /^\s*relic\s*:/i;

/** The relic asset of a legend and its display name: the usage text without a leading `relic:` (any case), trimmed. */
export function relicOf(legend: Legend): Relic | null {
  const asset = legend.assets.find((a) => RELIC_ASSET.test(a.id));
  if (!asset) return null;
  // A usage with no prefix (flying-dutchman: "The Harbour Lantern") is already the name.
  const name = asset.usage.replace(PREFIX, '').trim();
  // jersey-devil's usage is only "Relic": no name, so the caller falls back to the catalog.
  return { assetId: asset.id, name: name.length > 0 && name.toLowerCase() !== 'relic' ? name : null };
}
