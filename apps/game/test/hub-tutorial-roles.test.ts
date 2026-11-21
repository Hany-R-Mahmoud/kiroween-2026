import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { HUB_DOOR_IDS, HUB_SCENE } from '../src/layout/hub.ts';
import { TUTORIAL_SCENE } from '../src/layout/tutorial.ts';

// Compares the hall and tutorial layouts with the Hotspot tables in content/hub-and-tutorial.md (read only).
// Requirements 1.1, 2.1.

const doc = readFileSync(fileURLToPath(new URL('../../../content/hub-and-tutorial.md', import.meta.url)), 'utf8');

interface Row {
  id: string;
  role: string;
}

/** Rows of the table that follows `heading` (a `###` line), as id and the first word of the role cell. */
function table(heading: string, roleColumn: number): Row[] {
  const start = doc.indexOf(heading);
  expect(start, `heading ${heading}`).toBeGreaterThanOrEqual(0);
  const rows: Row[] = [];
  for (const line of doc.slice(start + heading.length).split('\n').slice(1)) {
    if (line.startsWith('#') || (rows.length > 0 && !line.startsWith('|'))) break;
    const cells = line.split('|').map((c) => c.trim());
    const id = cells[1] ?? '';
    if (/^(hub|tut)-[a-z-]+$/.test(id)) rows.push({ id, role: (cells[roleColumn + 1] ?? '').split(/[\s(]/)[0]! });
  }
  return rows;
}

const hubRows = table('### Hub hotspots', 2);
const tutRows = table('### Tutorial hotspots', 2);

const HUB_DECOYS = ['hub-lamp', 'hub-jars', 'hub-window'];
const TUT_MEANINGFUL = ['tut-corkboard', 'tut-drawer', 'tut-candle'];

describe('hall Hotspots against content/hub-and-tutorial.md', () => {
  it('has 18 Hotspots, the same ids as the table', () => {
    expect(hubRows).toHaveLength(18);
    expect(HUB_SCENE.hotspots).toHaveLength(18);
    expect(HUB_SCENE.hotspots.map((h) => h.id).sort()).toEqual(hubRows.map((r) => r.id).sort());
  });

  it('lists the 12 doors in the table order', () => {
    const tableDoors = hubRows.filter((r) => r.id.startsWith('hub-door-')).map((r) => r.id);
    expect(tableDoors).toHaveLength(12);
    expect([...HUB_DOOR_IDS]).toEqual(tableDoors);
    const layoutDoors = HUB_SCENE.hotspots.filter((h) => h.id.startsWith('hub-door-')).map((h) => h.id);
    expect(layoutDoors).toEqual(tableDoors);
  });

  it('has only decoys: lamp, jars, window; every other Hotspot is meaningful', () => {
    expect(hubRows.filter((r) => r.role === 'decoy').map((r) => r.id).sort()).toEqual([...HUB_DECOYS].sort());
    expect(hubRows.filter((r) => r.role === 'meaningful')).toHaveLength(15);
    expect(hubRows.every((r) => r.role === 'decoy' || r.role === 'meaningful')).toBe(true);
    for (const r of hubRows) expect(r.role, r.id).toBe(HUB_DECOYS.includes(r.id) ? 'decoy' : 'meaningful');
  });
});

describe('tutorial Hotspots against content/hub-and-tutorial.md', () => {
  it('has 7 Hotspots, the same ids as the table', () => {
    expect(tutRows).toHaveLength(7);
    expect(TUTORIAL_SCENE.hotspots).toHaveLength(7);
    expect(TUTORIAL_SCENE.hotspots.map((h) => h.id).sort()).toEqual(tutRows.map((r) => r.id).sort());
  });

  it('has three meaningful Hotspots (corkboard, drawer, candle) and four decoys', () => {
    expect(tutRows.filter((r) => r.role === 'meaningful').map((r) => r.id).sort()).toEqual([...TUT_MEANINGFUL].sort());
    const decoys = tutRows.filter((r) => r.role === 'decoy').map((r) => r.id).sort();
    expect(decoys).toEqual(['tut-bookshelf', 'tut-coat', 'tut-mirror', 'tut-typewriter']);
  });

  it('puts the corkboard last, past the right of the first 390 px view', () => {
    const board = TUTORIAL_SCENE.hotspots.find((h) => h.id === 'tut-corkboard')!;
    expect(TUTORIAL_SCENE.hotspots[TUTORIAL_SCENE.hotspots.length - 1]).toBe(board);
    // Pan start shows 390 CSS px at scale 1536/844 (scene fits the height of a phone): well under the board's x.
    expect(board.x).toBeGreaterThan(390 * 3);
  });
});
