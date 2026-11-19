import { getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import type { Db } from '../src/db/client.ts';
import { ImportError, importLegend } from '../src/db/import.ts';
import { planCounts, planLegend } from '../src/db/plan.ts';
import { allLegends, legendById } from './helpers/legends.ts';

const HASH = 'a'.repeat(64);
// built from parts so no connection-string literal sits in the repo (secret scanners flag those, even fake ones)
const SECRET = ['post', 'gresql', '://someuser:s3cr3t-value@', 'ep-example-host', '.invalid/db'].join('');

describe.each(allLegends.map((l) => [l.id, l] as const))('import plan for %s', (_id, l) => {
  const plan = planLegend(l, HASH);

  it('is the same on every call', () => {
    expect(planLegend(l, HASH)).toEqual(plan);
  });

  it('numbers versions 1 to n in the order of the legend file', () => {
    expect(plan.versions.map((v) => [v.ordinal, v.id])).toEqual(l.versions.map((v, i) => [i + 1, v.id]));
  });
  it('has one row per element of the legend', () => {
    expect(planCounts(plan)).toMatchObject({
      legends: 1,
      chapters: l.chapters.length,
      versions: l.versions.length,
      facts: l.facts.length,
      leads: l.leads.length,
      scenes: l.world.scenes.length,
      hotspots: l.world.hotspots.length,
      puzzleSlots: l.world.slots.length,
      fearEvents: l.world.fearEvents.length,
      assets: l.assets.length,
      sources: l.sources.length,
      documentedTold: l.documentedTold.rows.length,
    });
    expect(plan.factPuzzleTypes).toHaveLength(l.facts.reduce((n, f) => n + f.puzzleTypes.length, 0));
    expect(plan.anchors).toHaveLength(l.chapters.length + l.versions.length + 1);
  });

  it('would satisfy every key and foreign key the schema declares (checked before touching a database)', () => {
    const ids = (rows: { id: string }[]) => new Set(rows.map((r) => r.id));
    const anchors = new Set(plan.anchors.map((a) => a.anchor));
    const versions = ids(plan.versions);
    const scenes = ids(plan.scenes);
    const factIds = ids(plan.facts);
    const unique = (xs: string[]) => expect(new Set(xs).size).toBe(xs.length);

    unique(plan.anchors.map((a) => a.anchor));
    for (const rows of [plan.chapters, plan.versions, plan.facts, plan.leads, plan.scenes, plan.hotspots, plan.puzzleSlots, plan.fearEvents]) unique(rows.map((r) => r.id));
    unique(plan.assets.map((a) => a.id));
    unique(plan.sources.map((s) => s.id));
    unique(plan.chapters.map((c) => c.anchor));
    unique(plan.versions.map((v) => v.anchor));
    unique(plan.factPuzzleTypes.map((f) => `${f.factId}/${f.puzzleType}`));

    for (const c of plan.chapters) expect(anchors.has(c.anchor), c.id).toBe(true);
    for (const v of plan.versions) expect(anchors.has(v.anchor), v.id).toBe(true);
    for (const f of plan.facts) {
      expect(anchors.has(f.anchor), f.id).toBe(true);
      if (f.versionId) expect(versions.has(f.versionId), f.id).toBe(true);
    }
    for (const x of plan.leads) expect(versions.has(x.startsFrom), x.id).toBe(true);
    for (const h of plan.hotspots) expect(scenes.has(h.sceneId), h.id).toBe(true);
    for (const s of plan.puzzleSlots) expect(anchors.has(s.hint2Anchor), s.id).toBe(true);
    for (const t of plan.factPuzzleTypes) expect(factIds.has(t.factId)).toBe(true);
    const owner = [plan.anchors, plan.chapters, plan.versions, plan.facts, plan.leads, plan.scenes, plan.hotspots, plan.puzzleSlots, plan.fearEvents, plan.assets, plan.sources, plan.documentedTold].flat();
    for (const r of owner) expect(r.legendId).toBe(l.id);
  });
});

describe('legend model in the plan (R4.8)', () => {
  it.each(allLegends.map((l) => [l.id, l] as const))('%s: the legends row carries the parsed legend, unchanged by a JSON round trip', (_id, l) => {
    const model = planLegend(l, HASH).legends.model;
    expect(JSON.parse(JSON.stringify(model))).toEqual(l);
  });
});

describe('plan details', () => {
  it('stores a "never" lead and a true-chain lead the way the model has them', () => {
    const plan = planLegend(legendById('chupacabra'), HASH);
    const never = plan.leads.find((x) => x.id === 'chupacabra:lead-5')!;
    expect(never.neverTrue).toBe(true);
    expect(never.trueFor).toEqual([]);
    const trueChain = plan.leads.find((x) => x.id === 'chupacabra:lead-1')!;
    expect(trueChain.contradictionFactIds).toBeNull();
    expect(trueChain.neverTrue).toBe(false);
    expect(trueChain.trueFor).toEqual(['chupacabra:v-witness']);
  });

  it('classifies anchors as chapter, versions or version', () => {
    const kinds = new Map(planLegend(legendById('flying-dutchman'), HASH).anchors.map((a) => [a.anchor, a.kind]));
    expect(kinds.get('flying-dutchman--ch-3')).toBe('chapter');
    expect(kinds.get('flying-dutchman--versions')).toBe('versions');
    expect(kinds.get('flying-dutchman--versions--v-dice')).toBe('version');
  });
});

/** A stand-in for the database that records what the importer does and can fail on the nth insert. */
function fakeDb(failOnInsert?: number) {
  const calls: string[] = [];
  let inserts = 0;
  const tx = {
    delete: () => ({
      where: async () => {
        calls.push('delete');
      },
    }),
    insert: (table: Parameters<typeof getTableName>[0]) => ({
      values: async () => {
        inserts += 1;
        if (inserts === failOnInsert) throw Object.assign(new Error(`connect failed to ${SECRET}`), { code: '23505', detail: SECRET });
        calls.push(getTableName(table));
      },
    }),
  };
  return { db: { transaction: async (fn: (t: typeof tx) => Promise<void>) => fn(tx) } as unknown as Db, calls };
}

describe('importLegend', () => {
  it('deletes the legend first, then inserts parents before children', async () => {
    const { db, calls } = fakeDb();
    await importLegend(db, legendById('banshee'), HASH);
    expect(calls).toEqual(['delete', 'legends', 'anchors', 'chapters', 'versions', 'documented_told', 'facts', 'fact_puzzle_types', 'leads', 'scenes', 'hotspots', 'puzzle_slots', 'fear_events', 'assets', 'sources']);
  });

  it('names the legend, table and SQLSTATE when an insert fails, and never the driver message or the connection string', async () => {
    const { db } = fakeDb(3);
    const err = await importLegend(db, legendById('banshee'), HASH).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ImportError);
    const e = err as ImportError;
    expect([e.legendId, e.table, e.sqlState]).toEqual(['banshee', 'chapters', '23505']);
    const everything = JSON.stringify({ message: e.message, own: Object.getOwnPropertyNames(e).map((k) => (e as unknown as Record<string, unknown>)[k]), cause: e.cause });
    expect(everything).not.toContain('s3cr3t-value');
    expect(everything).not.toContain('ep-example-host');
    expect(e.cause).toBeUndefined();
  });

  it('reads the SQLSTATE from the error Drizzle 0.45 wraps around the pg error, and drops the SQL and parameters', async () => {
    const pgCause = Object.assign(new Error(`duplicate key ${SECRET}`), { code: '23505', detail: SECRET });
    const drizzleWrapped = Object.assign(new Error(`Failed query: insert into "chapters" params: ${SECRET}`), { query: 'insert into "chapters" ...', params: [SECRET], cause: pgCause });
    const calls: string[] = [];
    const tx = {
      delete: () => ({ where: async () => void calls.push('delete') }),
      insert: () => ({
        values: async () => {
          throw drizzleWrapped;
        },
      }),
    };
    const db = { transaction: async (fn: (t: typeof tx) => Promise<void>) => fn(tx) } as unknown as Db;
    const err = await importLegend(db, legendById('banshee'), HASH).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ImportError);
    expect((err as ImportError).sqlState).toBe('23505');
    expect((err as ImportError).message).toBe('import failed for banshee at legends (SQLSTATE 23505)');
    expect(JSON.stringify({ m: (err as ImportError).message, c: (err as ImportError).cause })).not.toMatch(/s3cr3t-value|insert into|params/);
  });

  it('a failure after the delete step (the test hook) is reported as a transaction failure and no insert ran', async () => {
    const { db, calls } = fakeDb();
    const err = await importLegend(db, legendById('banshee'), HASH, {
      afterDelete: () => {
        throw new Error(`boom ${SECRET}`);
      },
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ImportError);
    expect((err as ImportError).table).toBe('transaction');
    expect((err as ImportError).message).not.toContain('s3cr3t-value');
    expect(calls).toEqual(['delete']);
  });
});
