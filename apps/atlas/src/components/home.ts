import type { AtlasSummary } from '@kiroween/skeleton/client';
import type { Continent } from '../geo/continents';
import type { Placed } from '../geo/placeMarkers';
/** A legend on the home page: its summary, its continent and its marker position, all from the server. */
export type HomeLegend = AtlasSummary & { continent: Continent; place: Placed };
