// Where each map marker button goes. The dot always sits on the true point; when the 44 px button would overlap
// another, it moves to the first free spot around the point and a leader line joins them, so the map stays honest.
// Pure and deterministic: positions are in the map's design box and the page turns them into percentages.

/** The map's frame (the same as public/world-land.svg): longitudes -180 to 180, latitudes 84 to -58. */
export const FRAME = { west: -180, east: 180, north: 84, south: -58 } as const;
/** Design box: 960 px wide, the frame's aspect. Below this width the map scrolls sideways instead of shrinking. */
export const BOX = { width: 960, height: Math.round((960 * (FRAME.north - FRAME.south)) / (FRAME.east - FRAME.west)) } as const;
/** Touch target (design steering: at least 44 px), plus a small gap between buttons. */
export const BUTTON = 44;
const GAP = 4;
const RADII = [52, 104];
const DIRECTIONS = [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1]] as const;

export interface Point {
  x: number;
  y: number;
}
export interface Placed {
  id: string;
  point: Point;
  button: Point;
}

/** Equirectangular: x from longitude, y from latitude, in design-box pixels. */
export function project(lat: number, lng: number): Point {
  return {
    x: ((lng - FRAME.west) / (FRAME.east - FRAME.west)) * BOX.width,
    y: ((FRAME.north - lat) / (FRAME.north - FRAME.south)) * BOX.height,
  };
}
const overlaps = (a: Point, b: Point) => Math.abs(a.x - b.x) < BUTTON + GAP && Math.abs(a.y - b.y) < BUTTON + GAP;
const inside = (p: Point) => p.x >= BUTTON / 2 && p.x <= BOX.width - BUTTON / 2 && p.y >= BUTTON / 2 && p.y <= BOX.height - BUTTON / 2;
const candidates = (p: Point): Point[] => [p, ...RADII.flatMap((r) => DIRECTIONS.map(([dx, dy]) => ({ x: p.x + dx * r, y: p.y + dy * r })))];

/** Places every marker; legends are taken in id order so the layout never depends on query order. */
export function placeMarkers(points: readonly { id: string; lat: number; lng: number }[]): Placed[] {
  const placed: Placed[] = [];
  for (const { id, lat, lng } of [...points].sort((a, b) => a.id.localeCompare(b.id))) {
    const point = project(lat, lng);
    const button = candidates(point).find((c) => inside(c) && !placed.some((q) => overlaps(c, q.button)));
    if (!button) throw new Error(`no free spot for the marker of ${id}`);
    placed.push({ id, point, button });
  }
  return placed;
}
