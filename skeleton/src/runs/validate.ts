import { z } from 'zod';
import { ValidationError } from './errors.ts';

/** What the server needs to know about a legend to validate a run. */
export interface CatalogueEntry {
  id: string;
  slotCount: number;
}

export const LIMITS = { hint2Uses: 50, wrongAnswers: 500, highestFear: 100 } as const;
export const FINAL_STATUSES = ['won', 'restarted', 'abandoned'] as const;
export type FinalStatus = (typeof FINAL_STATUSES)[number];

const count = (max: number) => z.number().int().min(0).max(max);

// `.strict()`: a client that sends a score, a seed, a true version or a user id is refused, not silently stripped.
const startSchema = z.object({ legendId: z.string().min(1).max(100) }).strict();
const finishSchema = z
  .object({
    runId: z.uuid(),
    status: z.enum(FINAL_STATUSES),
    slotsSolved: z.number().int().min(0),
    hint2Uses: count(LIMITS.hint2Uses),
    wrongAnswers: count(LIMITS.wrongAnswers),
    highestFear: count(LIMITS.highestFear),
  })
  .strict();

export type StartInput = z.infer<typeof startSchema>;
export type FinishInput = z.infer<typeof finishSchema>;

/** Field paths and rule names only: the submitted values are never copied into the error. */
const issuesOf = (e: z.ZodError): string[] => e.issues.map((i) => `${i.path.join('.') || '(input)'}: ${i.code}`);

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new ValidationError(issuesOf(r.error));
  return r.data;
}

const findLegend = (catalogue: readonly CatalogueEntry[], id: string): CatalogueEntry => {
  const entry = catalogue.find((c) => c.id === id);
  if (!entry) throw new ValidationError(['legendId: unknown_legend']);
  return entry;
};

export function validateStart(input: unknown, catalogue: readonly CatalogueEntry[]): StartInput & { legend: CatalogueEntry } {
  const data = parse(startSchema, input);
  return { ...data, legend: findLegend(catalogue, data.legendId) };
}

/** Shape and limits that do not depend on the legend. Ownership is the store's job. */
export const parseFinish = (input: unknown): FinishInput => parse(finishSchema, input);

/** The legend's slot count is only known once the run (and so its legend) is found. */
export function checkFinishForLegend(data: FinishInput, slotCount: number): FinishInput {
  if (data.slotsSolved > slotCount) throw new ValidationError(['slotsSolved: too_big']);
  if (data.status === 'won' && data.slotsSolved !== slotCount) throw new ValidationError(['status: won_needs_every_slot']);
  return data;
}
