import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { allLegends } from '../../../skeleton/test/helpers/legends.ts';
import { continentOf } from '../src/geo/continent.ts';
import { BOX, BUTTON, FRAME, placeMarkers, project } from '../src/geo/placeMarkers.ts';

// Checked against the Natural Earth polygons in the design (section 6); the Flying Dutchman's Cape Point pin is
// 0.25° off the coarse coastline, so it takes the nearest country's continent.
const EXPECTED = {
  'baba-yaga': 'Europe',
  banshee: 'Europe',
  chupacabra: 'North America',
  draugr: 'Europe',
  'el-coco': 'Europe',
  'flying-dutchman': 'Africa',
  gumiho: 'Asia',
  'jersey-devil': 'North America',
  naddaha: 'Africa',
  'spring-heeled-jack': 'Europe',
  vetala: 'Asia',
  'yuki-onna': 'Asia',
};
const points = allLegends.map((l) => ({ id: l.id, lat: l.meta.mapPoint.lat, lng: l.meta.mapPoint.lng }));

describe('continentOf', () => {
  it('puts every legend on its expected continent, including the point at sea', () => {
    expect(Object.fromEntries(points.map((p) => [p.id, continentOf(p.lat, p.lng)]))).toEqual(EXPECTED);
  });
  it('uses the containing country, not only the nearest vertex', () => {
    expect(continentOf(-1.3, 36.8)).toBe('Africa'); // Nairobi, far inside a polygon
    expect(continentOf(48.85, 2.35)).toBe('Europe');
  });
});

describe('placeMarkers', () => {
  // called inside each test, so a layout that throws fails a test instead of the whole file
  const placed = () => placeMarkers(points);
  it('places every legend once, with buttons inside the box that never overlap', () => {
    expect(placed().map((p) => p.id).sort()).toEqual(points.map((p) => p.id).sort());
    for (const p of placed()) {
      expect(p.button.x - BUTTON / 2, p.id).toBeGreaterThanOrEqual(0);
      expect(p.button.x + BUTTON / 2, p.id).toBeLessThanOrEqual(BOX.width);
      expect(p.button.y - BUTTON / 2, p.id).toBeGreaterThanOrEqual(0);
      expect(p.button.y + BUTTON / 2, p.id).toBeLessThanOrEqual(BOX.height);
    }
    const all = placed();
    for (const a of all)
      for (const b of all) if (a !== b) expect(Math.abs(a.button.x - b.button.x) >= BUTTON || Math.abs(a.button.y - b.button.y) >= BUTTON, `${a.id} / ${b.id}`).toBe(true);
  });
  it('keeps every dot on its true projected point, so each leader line ends there', () => {
    for (const p of placed()) {
      const src = points.find((x) => x.id === p.id)!;
      expect(p.point).toEqual(project(src.lat, src.lng));
    }
    expect(placed().some((p) => p.button.x !== p.point.x || p.button.y !== p.point.y)).toBe(true); // the European cluster had to move
  });
  it('does not depend on the order of the input', () => {
    expect(placeMarkers([...points].reverse())).toEqual(placed());
  });
  it('projects the frame corners onto the box corners', () => {
    expect(project(FRAME.north, FRAME.west)).toEqual({ x: 0, y: 0 });
    expect(project(FRAME.south, FRAME.east)).toEqual({ x: BOX.width, y: BOX.height });
  });
  it('matches the frame of the land outline file', () => {
    const svg = readFileSync(new URL('../public/world-land.svg', import.meta.url), 'utf8');
    expect(svg).toContain(`viewBox="${FRAME.west} ${-FRAME.north} ${FRAME.east - FRAME.west} ${FRAME.north - FRAME.south}"`);
  });
});
