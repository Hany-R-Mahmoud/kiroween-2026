// Which continent a map point is on, from Natural Earth v5.1.2 country polygons (public domain). Server only: the
// polygon file stays out of the client bundle (a boundary test checks that).
import countries from './countries.json' with { type: 'json' };
import { CONTINENTS, type Continent } from './continents';

type Ring = number[][];
interface Country {
  continent: string;
  polygons: Ring[][];
}
const COUNTRIES = countries as Country[];

/** Even-odd ray casting; x is longitude, y latitude. */
function inRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i] as [number, number];
    const [xj, yj] = ring[j] as [number, number];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
// Outer rings only: the one hole in the 110m countries (Lesotho inside South Africa) is on the same continent, so
// holes can never change the answer.
const inPolygon = (lng: number, lat: number, polygon: Ring[]) => inRing(lng, lat, polygon[0]!);

/** The continent of the country that contains the point; for a point at sea, the country with the nearest vertex. */
export function continentOf(lat: number, lng: number): Continent {
  const hit = COUNTRIES.find((c) => c.polygons.some((p) => inPolygon(lng, lat, p)));
  let found = hit?.continent;
  if (!found) {
    let best = Infinity;
    for (const c of COUNTRIES)
      for (const [x, y] of c.polygons.flatMap((p) => p[0]!) as [number, number][]) {
        const d = (x - lng) ** 2 + (y - lat) ** 2;
        if (d < best) [best, found] = [d, c.continent];
      }
  }
  if (!CONTINENTS.includes(found as Continent)) throw new Error('map point is not near a continent');
  return found as Continent;
}
