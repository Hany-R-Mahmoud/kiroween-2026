import { asc, count, eq } from 'drizzle-orm';
import { legendSchema, type Legend } from '../model/schema.ts';
import type { CatalogueEntry } from '../runs/validate.ts';
import type { Db } from './client.ts';
import { legends, puzzleSlots } from './schema.ts';

export interface CatalogueLegend extends CatalogueEntry {
  title: string;
  region: string;
}

/** Fixed message: the operator must re-import after the migration that added `legends.model`. */
export class LegendModelMissingError extends Error {
  constructor(readonly legendId: string) {
    super(`The stored model for "${legendId}" is missing. Run db:import.`);
    this.name = 'LegendModelMissingError';
  }
}

/** Every legend in Neon with its slot count, in title order. */
export async function loadCatalogue(db: Db): Promise<CatalogueLegend[]> {
  return db
    .select({ id: legends.id, title: legends.title, region: legends.region, slotCount: count(puzzleSlots.id) })
    .from(legends)
    .leftJoin(puzzleSlots, eq(puzzleSlots.legendId, legends.id))
    .groupBy(legends.id, legends.title, legends.region)
    .orderBy(asc(legends.title));
}

/** The stored parsed legend, validated again on the way out. Null when the id is not in the catalogue. */
export async function loadLegend(db: Db, id: string): Promise<Legend | null> {
  const [row] = await db.select({ model: legends.model }).from(legends).where(eq(legends.id, id)).limit(1);
  if (!row) return null;
  if (row.model === null) throw new LegendModelMissingError(id);
  return legendSchema.parse(row.model);
}
