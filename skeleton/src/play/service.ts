// The Play_Service: the one place a request becomes a view. Pure orchestration over injected dependencies (store port,
// token codec, legend loader, seed source, clock), so it runs in tests with no database.
// Trust rules: the browser sends intentions only. Counts, score, status and seed are kept and computed here. A user id
// comes from the verified visitor and goes into every store call. Every error is a fixed PlayError.
import { canEnter, type Visitor } from '../access/canEnter.ts';
import { GeneratorError } from '../generator/errors.ts';
import { generate, type Run } from '../generator/generate.ts';
import type { Legend } from '../model/schema.ts';
import { NoRunError } from '../runs/errors.ts';
import { MAX_SEED_TRIES } from '../runs/service.ts';
import type { FinishedRun } from '../runs/store.ts';
import type { CatalogueEntry } from '../runs/validate.ts';
import { endStatus, initState, step } from './engine.ts';
import { PlayError } from './errors.ts';
import { playStateSchema, type PlayState } from './state.ts';
import type { NewPlayRun, PlayStore } from './store.ts';
import { TUTORIAL_LEGEND_ID, type TokenCodec } from './token.ts';
import {
  createTutorialReceipt,
  initTutorialState,
  pickTutorialDetail,
  tutorialStateSchema,
  tutorialStep,
  tutorialView,
  verifyTutorialReceipt,
  type TutorialDetail,
  type TutorialReply,
  type TutorialState,
  type TutorialView,
} from './tutorial.ts';
import type { EndInfo, PlayView, Reply } from './types.ts';
import { parsePlay, redeemSchema, startTutorialSchema, startWorldSchema, tutorialActSchema, worldActSchema } from './validate.ts';
import { toView } from './view.ts';

export interface PlayDeps {
  store: PlayStore;
  tokens: TokenCodec;
  loadLegend(legendId: string): Promise<Legend>;
  catalogue: readonly CatalogueEntry[];
  /** A Seed from a cryptographic random source. Injected so tests are deterministic. */
  newSeed(): string;
  guestWorld: string;
}

export interface TutorialDeps {
  store: Pick<PlayStore, 'markTutorialDone'>;
  tokens: TokenCodec;
  newSeed(): string;
  /** The rows of `keepers_note_details`. Read by the game server only. */
  loadTutorialDetails(): Promise<readonly TutorialDetail[]>;
}

export interface PlayResponse {
  /** The view of the Run to draw now. After a restart this is the new Run. */
  view: PlayView;
  /** The result of the action. Null for a start. */
  reply: Reply | null;
  /** Summary of a Run this call ended (also set on `view` when the Run is won). */
  ended: EndInfo | null;
  /** Guests only: the token to keep. Null for signed-in players, and after a won Run (nothing to resume). */
  token: string | null;
}

export interface TutorialResponse {
  view: TutorialView;
  reply: TutorialReply | null;
  token: string;
  /** Guests only, once solved: the receipt to keep and redeem after sign-in. */
  receipt?: string;
}

const MAX_REV_TRIES = 2; // first try, then one reload and retry; a second mismatch is a 409

// ---- helpers -------------------------------------------------------------------------------------------------------

function requireWorld(deps: Pick<PlayDeps, 'catalogue' | 'guestWorld'>, visitor: Visitor, legendId: string): void {
  if (!deps.catalogue.some((c) => c.id === legendId)) throw new PlayError('not-found');
  // A guest at another world gets the sign-in refusal and no World data.
  if (!canEnter({ kind: 'legend', id: legendId }, visitor, deps.guestWorld)) throw new PlayError('sign-in-required');
}

function parseState(value: unknown): PlayState | null {
  const r = playStateSchema.safeParse(value);
  return r.success ? r.data : null;
}

/** Regenerate the Run from its Seed. Null when the Seed no longer generates. */
function rebuild(legend: Legend, seed: string): Run | null {
  try {
    return generate(legend, seed);
  } catch (e) {
    if (e instanceof GeneratorError) return null;
    throw e;
  }
}

/** Draw Seeds until one generates, up to MAX_SEED_TRIES. `not` keeps a restart from reusing the old Seed. */
function newRun(deps: Pick<PlayDeps, 'newSeed'>, legend: Legend, not?: string): Run {
  for (let i = 0; i < MAX_SEED_TRIES; i++) {
    const seed = deps.newSeed();
    if (seed === not) continue;
    const run = rebuild(legend, seed);
    if (run) return run;
  }
  throw new NoRunError(legend.id);
}

const toNew = (run: Run, state: PlayState): NewPlayRun => ({ legendId: run.legendId, seed: run.seed, trueVersionId: run.trueVersionId, state });

function finished(info: EndInfo, state: PlayState): FinishedRun {
  return {
    status: info.status,
    slotsSolved: info.slotsSolved,
    hint2Uses: state.hint2Uses,
    wrongAnswers: state.wrongAnswers,
    highestFear: state.highestFear,
    score: info.score,
  };
}

function guestToken(deps: PlayDeps, run: Run, state: PlayState): string {
  return deps.tokens.encode('play', { legendId: run.legendId, seed: run.seed, state });
}

/** A guest's Run from a token. Any problem with the token, its state or its Seed is the one fixed session error. */
function guestRun(deps: PlayDeps, legend: Legend, token: string | null): { run: Run; state: PlayState } {
  if (token === null) throw new PlayError('session');
  const payload = deps.tokens.decode('play', legend.id, token);
  const state = parseState(payload.state);
  const run = state && rebuild(legend, payload.seed);
  if (!state || !run || endStatus(run, state)) throw new PlayError('session');
  return { run, state };
}

// ---- worlds --------------------------------------------------------------------------------------------------------

/** Start a World, or resume the Run in progress (requirement 7.17). */
export async function startWorld(deps: PlayDeps, visitor: Visitor, input: unknown): Promise<PlayResponse> {
  const { legendId, token } = parsePlay(startWorldSchema, input);
  requireWorld(deps, visitor, legendId);
  const legend = await deps.loadLegend(legendId);

  if (visitor.kind === 'guest') {
    if (token !== null) {
      const { run, state } = guestRun(deps, legend, token);
      return { view: toView(legend, run, state), reply: null, ended: null, token: guestToken(deps, run, state) };
    }
    const run = newRun(deps, legend);
    const state = initState(run);
    return { view: toView(legend, run, state), reply: null, ended: null, token: guestToken(deps, run, state) };
  }

  const userId = visitor.id;
  const row = await deps.store.current(userId, legendId);
  if (row) {
    const state = parseState(row.state);
    const run = state && rebuild(legend, row.seed);
    // An empty (Phase 2) or unusable state, or a Seed that no longer generates, is abandoned and a fresh Run starts.
    if (state && run && !endStatus(run, state)) return { view: toView(legend, run, state), reply: null, ended: null, token: null };
  }
  const run = newRun(deps, legend);
  const state = initState(run);
  await deps.store.begin(userId, toNew(run, state));
  return { view: toView(legend, run, state), reply: null, ended: null, token: null };
}

/** One action in a World. The server loads, applies, scores and saves; the browser learns only the view. */
export async function actInWorld(deps: PlayDeps, visitor: Visitor, input: unknown): Promise<PlayResponse> {
  const { legendId, token, action } = parsePlay(worldActSchema, input);
  requireWorld(deps, visitor, legendId);
  const legend = await deps.loadLegend(legendId);

  if (visitor.kind === 'guest') {
    const { run, state } = guestRun(deps, legend, token);
    const r = step(legend, run, state, action);
    if (!r.ended) return { view: toView(legend, run, r.state), reply: r.reply, ended: null, token: guestToken(deps, run, r.state) };
    if (r.ended.status === 'won') return { view: toView(legend, run, r.state), reply: r.reply, ended: r.ended, token: null };
    const next = newRun(deps, legend, run.seed);
    const fresh = initState(next);
    return { view: toView(legend, next, fresh), reply: r.reply, ended: r.ended, token: guestToken(deps, next, fresh) };
  }

  const userId = visitor.id;
  for (let attempt = 0; attempt < MAX_REV_TRIES; attempt++) {
    const row = await deps.store.current(userId, legendId);
    if (!row) throw new PlayError('not-found');
    const state = parseState(row.state);
    const run = state && rebuild(legend, row.seed);
    if (!state || !run) throw new PlayError('not-found');
    const r = step(legend, run, state, action);

    if (!r.ended) {
      if (await deps.store.save(userId, row.id, row.rev, r.state)) return { view: toView(legend, run, r.state), reply: r.reply, ended: null, token: null };
      continue; // another tab wrote first: reload and apply once more
    }

    const result = finished(r.ended, r.state);
    if (r.ended.status === 'won') {
      if (await deps.store.end(userId, row.id, row.rev, result)) return { view: toView(legend, run, r.state), reply: r.reply, ended: r.ended, token: null };
      continue;
    }
    // Restarted: the old row closes and a new Run with a new Seed opens in one transaction.
    const next = newRun(deps, legend, run.seed);
    const fresh = initState(next);
    if (await deps.store.end(userId, row.id, row.rev, result, toNew(next, fresh))) {
      return { view: toView(legend, next, fresh), reply: r.reply, ended: r.ended, token: null };
    }
  }
  throw new PlayError('conflict');
}

// ---- tutorial ------------------------------------------------------------------------------------------------------

function tutorialFromToken(deps: TutorialDeps, token: string | null): { seed: string; state: TutorialState } {
  if (token === null) throw new PlayError('session');
  const payload = deps.tokens.decode('tutorial', TUTORIAL_LEGEND_ID, token);
  const parsed = tutorialStateSchema.safeParse(payload.state);
  if (!parsed.success || parsed.data.detailId !== pickTutorialDetail(payload.seed)) throw new PlayError('session');
  return { seed: payload.seed, state: parsed.data };
}

const tutorialToken = (deps: TutorialDeps, seed: string, state: TutorialState): string =>
  deps.tokens.encode('tutorial', { legendId: TUTORIAL_LEGEND_ID, seed, state });

/** Start the tutorial, or resume it from a token. Works for guests and signed-in players; no row is stored. */
export async function startTutorial(deps: TutorialDeps, _visitor: Visitor, input: unknown): Promise<TutorialResponse> {
  const { token } = parsePlay(startTutorialSchema, input);
  if (token !== null) {
    const { seed, state } = tutorialFromToken(deps, token);
    return { view: tutorialView(state), reply: null, token: tutorialToken(deps, seed, state) };
  }
  const seed = deps.newSeed();
  const state = initTutorialState(seed);
  return { view: tutorialView(state), reply: null, token: tutorialToken(deps, seed, state) };
}

/** One tutorial action. A solved tutorial is stored as done for a signed-in player and returns a receipt for a guest. */
export async function actInTutorial(deps: TutorialDeps, visitor: Visitor, input: unknown): Promise<TutorialResponse> {
  const { token, action } = parsePlay(tutorialActSchema, input);
  const { seed, state } = tutorialFromToken(deps, token);
  const r = tutorialStep(state, await deps.loadTutorialDetails(), action);
  const out: TutorialResponse = { view: tutorialView(r.state), reply: r.reply, token: tutorialToken(deps, seed, r.state) };
  if (r.state.solved) {
    if (visitor.kind === 'user') await deps.store.markTutorialDone(visitor.id);
    else out.receipt = createTutorialReceipt(deps.tokens, r.state);
  }
  return out;
}

/** A guest's receipt, redeemed by a signed-in user. Idempotent; touches no Run, score or completed world. */
export async function redeemTutorialReceipt(deps: Pick<TutorialDeps, 'store' | 'tokens'>, visitor: Visitor, input: unknown): Promise<{ done: true }> {
  if (visitor.kind !== 'user') throw new PlayError('sign-in-required');
  const { receipt } = parsePlay(redeemSchema, input);
  verifyTutorialReceipt(deps.tokens, receipt);
  await deps.store.markTutorialDone(visitor.id);
  return { done: true };
}
