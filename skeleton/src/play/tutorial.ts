import { z } from 'zod';
import { createRng } from '../rng/rng.ts';
import { PlayError } from './errors.ts';
import { FEAR } from './fear.ts';
import { TUTORIAL_LEGEND_ID, type TokenCodec } from './token.ts';
import type { TutorialAction } from './validate.ts';

// Tutorial rules (design: "Tutorial"). Pure except for the receipt helpers, which use an injected codec.
// Tap results for the seven tutorial Hotspots are fixed catalog text on the client; only the seeded drawer code lives here.

export const TUTORIAL_DETAIL_IDS = ['d-year', 'd-keys', 'd-rooms'] as const;
export type TutorialDetailId = (typeof TUTORIAL_DETAIL_IDS)[number];

/** Anchor of the Keeper's Note chapter that holds every drawer answer. */
export const TUTORIAL_ANCHOR = 'keepers-note--ch-1';

/** Hint 1 text and highlight. Copied from content/hub-and-tutorial.md; a test compares them with the file. */
export const TUTORIAL_HINT1 = { text: 'One pin is newer than the rest.', highlight: ['tut-corkboard'] } as const;

/** One row of `keepers_note_details`, as read by the game server. Answers never go to the browser before they are earned. */
export interface TutorialDetail {
  detailId: string;
  question: string;
  answer: string;
  /** The "Also accept" forms. An empty list means "none". */
  alsoAccept: readonly string[];
}

export const tutorialStateSchema = z
  .object({
    v: z.literal(1),
    detailId: z.enum(TUTORIAL_DETAIL_IDS),
    fear: z.number().int().min(0).max(FEAR.max),
    hint2Used: z.boolean(),
    solved: z.boolean(),
  })
  .strict();
export type TutorialState = z.infer<typeof tutorialStateSchema>;

/** The Seed picks one of the three details. Same Seed, same detail. */
export function pickTutorialDetail(seed: string): TutorialDetailId {
  return createRng('tutorial/' + seed).pick(TUTORIAL_DETAIL_IDS);
}

export function initTutorialState(seed: string): TutorialState {
  return { v: 1, detailId: pickTutorialDetail(seed), fear: 0, hint2Used: false, solved: false };
}

export function normaliseAnswer(value: string): string {
  return value.trim().toLowerCase();
}

/** True when `value` equals the answer or any "Also accept" form, after normalising both sides. */
export function isTutorialAnswer(detail: TutorialDetail, value: string): boolean {
  const given = normaliseAnswer(value);
  if (given === '') return false;
  return [detail.answer, ...detail.alsoAccept].some((accepted) => normaliseAnswer(accepted) === given);
}

export type TutorialReply =
  | { kind: 'drawer'; question: string }
  | { kind: 'hint2'; anchor: string; charged: boolean }
  | { kind: 'answer'; correct: boolean };

/** What the browser sees. The answer and the detail id are never here. */
export interface TutorialView {
  fear: number;
  hint1: { text: string; highlight: string[] };
  /** Present only after Hint 2 was used. */
  hint2?: { anchor: string };
  solved: boolean;
  reward?: { key: true; firstSlotGlow: true };
}

export function tutorialView(state: TutorialState): TutorialView {
  return {
    fear: state.fear,
    hint1: { text: TUTORIAL_HINT1.text, highlight: [...TUTORIAL_HINT1.highlight] },
    ...(state.hint2Used ? { hint2: { anchor: TUTORIAL_ANCHOR } } : {}),
    solved: state.solved,
    ...(state.solved ? { reward: { key: true as const, firstSlotGlow: true as const } } : {}),
  };
}

/**
 * One tutorial step. `details` are the rows read from the store; the picked one must be among them.
 * A wrong answer costs no fear and does not restart. Hint 2 charges `FEAR.tutorialHint2` once.
 */
export function tutorialStep(
  state: TutorialState,
  details: readonly TutorialDetail[],
  action: TutorialAction,
): { state: TutorialState; reply: TutorialReply } {
  const detail = details.find((d) => d.detailId === state.detailId);
  if (!detail) throw new PlayError('unavailable');

  switch (action.kind) {
    case 'drawer':
      return { state, reply: { kind: 'drawer', question: detail.question } };
    case 'hint2': {
      const charged = !state.hint2Used;
      const next = charged ? { ...state, hint2Used: true, fear: Math.min(FEAR.max, state.fear + FEAR.tutorialHint2) } : state;
      return { state: next, reply: { kind: 'hint2', anchor: TUTORIAL_ANCHOR, charged } };
    }
    case 'answer': {
      const correct = isTutorialAnswer(detail, action.value);
      return { state: correct ? { ...state, solved: true } : state, reply: { kind: 'answer', correct } };
    }
  }
}

// Receipt: an encrypted token (kind `receipt`, 365 days) that a guest keeps and redeems once after sign-in.

const RECEIPT_SEED = 'tutorial-done';
const receiptStateSchema = z.object({ done: z.literal(true) }).strict();

/** Only a solved tutorial may produce a receipt. */
export function createTutorialReceipt(codec: TokenCodec, state: TutorialState): string {
  if (!state.solved) throw new PlayError('refused');
  return codec.encode('receipt', { legendId: TUTORIAL_LEGEND_ID, seed: RECEIPT_SEED, state: { done: true } });
}

/** True when the receipt is genuine, of kind `receipt`, and not expired. Throws PlayError('session') otherwise. */
export function verifyTutorialReceipt(codec: TokenCodec, receipt: string): true {
  const payload = codec.decode('receipt', TUTORIAL_LEGEND_ID, receipt);
  if (payload.seed !== RECEIPT_SEED || !receiptStateSchema.safeParse(payload.state).success) throw new PlayError('session');
  return true;
}
