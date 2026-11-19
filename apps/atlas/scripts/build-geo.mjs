// One-off: turns Natural Earth v5.1.2 GeoJSON into the two committed geo files. Natural Earth is public domain
// (naturalearthdata.com terms of use). Fetch the two inputs to a temp folder first:
//   https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_land.geojson
//   https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_admin_0_countries.geojson
// Usage: node scripts/build-geo.mjs <folder with the two files>
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const dir = process.argv[2];
if (!dir) throw new Error('usage: node scripts/build-geo.mjs <folder with the two Natural Earth files>');
const read = (name) => JSON.parse(readFileSync(join(dir, `${name}.geojson`), 'utf8'));
const polygons = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []);
// The map's frame: longitudes -180 to 180, latitudes 84 to -58 (Antarctica is left out; nothing is distorted).
export const NORTH = 84;
export const SOUTH = -58;
const r1 = (n) => Math.round(n * 10) / 10;
const r2 = (n) => Math.round(n * 100) / 100;

// Equirectangular: x = longitude, y = -latitude, in degrees.
const ringPath = (ring) => `M${ring.map(([lng, lat]) => `${r1(lng)} ${r1(-lat)}`).join('L')}Z`;
const land = read('ne_110m_land')
  .features.flatMap((f) => polygons(f.geometry))
  .filter((p) => p[0].some(([, lat]) => lat > SOUTH))
  .map((p) => p.map(ringPath).join(''))
  .join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-180 ${-NORTH} 360 ${NORTH - SOUTH}" preserveAspectRatio="none"><path fill="#000" fill-rule="evenodd" d="${land}"/></svg>\n`;
writeFileSync(new URL('../public/world-land.svg', import.meta.url), svg);

const countries = read('ne_110m_admin_0_countries').features.map((f) => ({
  continent: f.properties.CONTINENT,
  polygons: polygons(f.geometry).map((p) => p.map((ring) => ring.map(([lng, lat]) => [r2(lng), r2(lat)]))),
}));
writeFileSync(new URL('../src/geo/countries.json', import.meta.url), `${JSON.stringify(countries)}\n`);
console.log(`world-land.svg ${svg.length} bytes; countries.json ${countries.length} countries`);
