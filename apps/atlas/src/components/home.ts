import type { AtlasSummary } from '@kiroween/skeleton/client';
import type { Continent } from '../geo/continents';
import type { Placed } from '../geo/placeMarkers';
/** A legend on the home page: its summary, its continent and its marker position, all from the server. */
export type HomeLegend = AtlasSummary & { continent: Continent; place: Placed };

/** The legend the hero's primary action opens first: Banshee when present, else the first by title. */
export const RECOMMENDED_FIRST_LEGEND = 'banshee';

export function pickFirstLegend<T extends { id: string; title: string }>(legends: readonly T[]): T | undefined {
  return legends.find((l) => l.id === RECOMMENDED_FIRST_LEGEND) ?? [...legends].sort((a, b) => a.title.localeCompare(b.title))[0];
}
