import type { Visitor } from '../access/canEnter.ts';
import { GeneratorError } from '../generator/errors.ts';
import { generate } from '../generator/generate.ts';
import type { Legend } from '../model/schema.ts';
import { score } from '../score/score.ts';
import { NoRunError, NotSignedInError, RunNotFoundError } from './errors.ts';
import type { CompletedWorld, RunRow, RunStore } from './store.ts';
import { checkFinishForLegend, parseFinish, validateStart, type CatalogueEntry } from './validate.ts';

export const MAX_SEED_TRIES = 20;

/** What the run service needs besides the store. `newSeed` is injected so tests are deterministic. */
export interface RunDeps {
  store: RunStore;
  catalogue: readonly CatalogueEntry[];
  loadLegend: (legendId: string) => Promise<Legend>;
  newSeed: () => string;
}

/** Guests never reach the store: progress for guests stays in the browser (R4.11, R4.12). */
function requireUserId(visitor: Visitor): string {
  if (visitor.kind !== 'user') throw new NotSignedInError();
  return visitor.id;
}

/** The server issues the seed and computes the true version with the skeleton generator; the client sends neither. */
export async function startRun(deps: RunDeps, visitor: Visitor, input: unknown): Promise<RunRow> {
  const userId = requireUserId(visitor);
  const { legendId } = validateStart(input, deps.catalogue);
  const legend = await deps.loadLegend(legendId);
  for (let i = 0; i < MAX_SEED_TRIES; i++) {
    const seed = deps.newSeed();
    let trueVersionId: string;
    try {
      trueVersionId = generate(legend, seed).trueVersionId;
    } catch (e) {
      if (e instanceof GeneratorError) continue;
      throw e;
    }
    return deps.store.startRun(userId, { legendId, seed, trueVersionId });
  }
  throw new NoRunError(legendId);
}

/** Counts are reported by the client (a known limit); the score is always computed here from them. */
export async function finishRun(deps: RunDeps, visitor: Visitor, input: unknown): Promise<RunRow> {
  const userId = requireUserId(visitor);
  const parsed = parseFinish(input);
  const run = await deps.store.getRun(userId, parsed.runId);
  if (!run) throw new RunNotFoundError();
  const slotCount = deps.catalogue.find((c) => c.id === run.legendId)?.slotCount;
  if (slotCount === undefined) throw new RunNotFoundError();
  const data = checkFinishForLegend(parsed, slotCount);
  const runId = data.runId;
  const result = {
    status: data.status,
    slotsSolved: data.slotsSolved,
    hint2Uses: data.hint2Uses,
    wrongAnswers: data.wrongAnswers,
    highestFear: data.highestFear,
    score: score({ slotsSolved: data.slotsSolved, curseBroken: data.status === 'won', hint2Uses: data.hint2Uses, wrongAnswers: data.wrongAnswers }),
  };
  // the store finishes only an in-progress run of this user, atomically, so a run is finished once
  const finished = await deps.store.finishRun(userId, runId, result);
  if (!finished) throw new RunNotFoundError();
  return finished;
}

export async function listMyRuns(deps: Pick<RunDeps, 'store'>, visitor: Visitor): Promise<RunRow[]> {
  return deps.store.listRuns(requireUserId(visitor));
}

export async function myCompletedWorlds(deps: Pick<RunDeps, 'store'>, visitor: Visitor): Promise<CompletedWorld[]> {
  return deps.store.completedWorlds(requireUserId(visitor));
}
