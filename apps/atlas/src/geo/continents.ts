// The home list's groups, in the order it shows them. Kept apart from continent.ts so client code can use it without
// the country polygons. Natural Earth's other values (Antarctica, open ocean) never group legends.
export const CONTINENTS = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'] as const;
export type Continent = (typeof CONTINENTS)[number];
