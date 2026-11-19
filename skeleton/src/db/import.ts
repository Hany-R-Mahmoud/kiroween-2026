import { eq } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { Legend } from '../model/schema.ts';
import type { Db, Tx } from './client.ts';
import { planCounts, planLegend, type Plan } from './plan.ts';
import { anchors, assets, chapters, documentedTold, facts, factPuzzleTypes, fearEvents, hotspots, leads, legends, puzzleSlots, scenes, sources, versions } from './schema.ts';
import { pgError } from './pgError.ts';

/**
 * Names the legend and table, plus the SQLSTATE code. It never carries the driver's message or error object,
 * because those can contain the host or the connection string.
 */
export class ImportError extends Error {
  constructor(
    readonly legendId: string,
    readonly table: string,
    readonly sqlState: string | undefined,
  ) {
    super(`import failed for ${legendId} at ${table}${sqlState ? ` (SQLSTATE ${sqlState})` : ''}`);
    this.name = 'ImportError';
  }
}

export type RowCounts = Record<keyof Plan, number>;

/** Only for tests that prove the rollback. The normal entry point (`importAll`) never passes it. */
export interface TestHooks {
  afterDelete?: () => void | Promise<void>;
}

// reads the code from Drizzle's wrapped error too (Drizzle 0.45 puts the pg error in `cause`)
const sqlState = (e: unknown): string | undefined => pgError(e).code;

async function insertRows(tx: Tx, legendId: string, name: string, table: PgTable, rows: object[]): Promise<void> {
  if (!rows.length) return;
  try {
    await tx.insert(table).values(rows as never[]); // rows come from planLegend, typed per table there
  } catch (e) {
    throw new ImportError(legendId, name, sqlState(e));
  }
}

/** Replaces one legend inside one transaction: a failure anywhere leaves the previous rows untouched. */
export async function importLegend(db: Db, legend: Legend, contentHash: string, testHooks?: TestHooks): Promise<RowCounts> {
  const plan = planLegend(legend, contentHash);
  try {
    await db.transaction(async (tx) => {
      await tx.delete(legends).where(eq(legends.id, legend.id)); // child tables cascade
      await testHooks?.afterDelete?.();
      const put = (name: string, table: PgTable, rows: object | object[]): Promise<void> => insertRows(tx, legend.id, name, table, Array.isArray(rows) ? rows : [rows]);
      await put('legends', legends, plan.legends);
      await put('anchors', anchors, plan.anchors);
      await put('chapters', chapters, plan.chapters);
      await put('versions', versions, plan.versions);
      await put('documented_told', documentedTold, plan.documentedTold);
      await put('facts', facts, plan.facts);
      await put('fact_puzzle_types', factPuzzleTypes, plan.factPuzzleTypes);
      await put('leads', leads, plan.leads);
      await put('scenes', scenes, plan.scenes);
      await put('hotspots', hotspots, plan.hotspots);
      await put('puzzle_slots', puzzleSlots, plan.puzzleSlots);
      await put('fear_events', fearEvents, plan.fearEvents);
      await put('assets', assets, plan.assets);
      await put('sources', sources, plan.sources);
    });
  } catch (e) {
    throw e instanceof ImportError ? e : new ImportError(legend.id, 'transaction', sqlState(e));
  }
  return planCounts(plan);
}

/** The normal entry point: every legend, each in its own transaction. */
export async function importAll(db: Db, items: { legend: Legend; hash: string }[]): Promise<Map<string, RowCounts>> {
  const out = new Map<string, RowCounts>();
  for (const { legend, hash } of items) out.set(legend.id, await importLegend(db, legend, hash));
  return out;
}
