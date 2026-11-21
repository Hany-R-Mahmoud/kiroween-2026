// The client play library, without any server import so it can be tested with a fake API and a fake storage.
// `lib/play.ts` binds it to the real server functions.
//
// What lives in the browser (design: "Guest token", "Guest progress in the hall", "Tutorial carry-over"):
//   kiroween.guest.play.v1.<legendId>  one encrypted play token per legend (guests only)
//   kiroween.guest.tutorial.v1         the tutorial receipt, until it is redeemed after sign-in
//   kiroween.guest.tutorial.play.v1    the tutorial's own token, so a reload resumes the tutorial
//   kiroween.guest.runs.v1             guest broken worlds (existing skeleton module), written from the server's result
// A stored value is only ever text that the server issued. Nothing here decodes a token or trusts one.
import { addGuestRun, atlasUrl, isLegendId, PLAY_ERROR_MESSAGES, TOO_MANY_TRIES_MESSAGE, readGuestRuns, type Action, type EndInfo, type KeyValueStore, type PlayView, type Reply } from '@kiroween/skeleton/client';
import type { PlayResponse, TutorialResponse } from '@kiroween/skeleton';

export const PLAY_TOKEN_PREFIX = 'kiroween.guest.play.v1.';
export const TUTORIAL_RECEIPT_KEY = 'kiroween.guest.tutorial.v1';
export const TUTORIAL_TOKEN_KEY = 'kiroween.guest.tutorial.play.v1';

/** Same shape the server accepts (`TOKEN_RE` in `skeleton/src/play/validate.ts`). Anything else is dropped, not sent. */
const TOKEN_SHAPE = /^v1\.[A-Za-z0-9_-]{20,4000}$/;

export type Store = Pick<KeyValueStore, 'getItem' | 'setItem'> & { removeItem?(key: string): void };

// ---- storage parsing (pure) ----------------------------------------------------------------------------------------

export const playTokenKey = (legendId: string): string => {
  if (!isLegendId(legendId)) throw new Error('legend id');
  return PLAY_TOKEN_PREFIX + legendId;
};

/** A stored token, or null when absent, malformed or the storage throws. */
export function readToken(storage: Store, key: string): string | null {
  try {
    const v = storage.getItem(key);
    return v !== null && TOKEN_SHAPE.test(v) ? v : null;
  } catch {
    return null;
  }
}

/** Stores a token. A blocked or full storage is ignored: the Run then lasts for the page only. */
export function writeToken(storage: Store, key: string, token: string): void {
  try {
    if (TOKEN_SHAPE.test(token)) storage.setItem(key, token);
  } catch {
    /* private mode or quota */
  }
}

/** Web Storage has `removeItem`; the narrow type does not require it, so fall back to an empty value that reads as null. */
export function clearToken(storage: Store, key: string): void {
  try {
    if (storage.removeItem) storage.removeItem(key);
    else storage.setItem(key, '');
  } catch {
    /* ignore */
  }
}

/** Guest broken worlds: distinct legend ids with a won run, in the order of the newest win. */
export function brokenWorldsOf(storage: Store): string[] {
  const seen: string[] = [];
  for (const r of readGuestRuns(storage)) if (r.status === 'won' && !seen.includes(r.legendId)) seen.push(r.legendId);
  return seen;
}

/** What the hall needs about a guest: the tutorial flag (a receipt is stored) and the broken worlds. */
export function guestHallState(storage: Store): { tutorialDone: boolean; brokenWorlds: string[] } {
  return { tutorialDone: readToken(storage, TUTORIAL_RECEIPT_KEY) !== null, brokenWorlds: brokenWorldsOf(storage) };
}

/** True when an error is the server's one fixed "session cannot be used" message. */
export const isSessionError = (e: unknown): boolean => e instanceof Error && e.message === PLAY_ERROR_MESSAGES.session;

/** True when an error is the server's 409 "the game moved on" (a `rev` mismatch that survived the server's own retry). */
export const isConflictError = (e: unknown): boolean => e instanceof Error && e.message === PLAY_ERROR_MESSAGES.conflict;
/** The World start was refused because this signed-in player has not done the tutorial (403, fixed text). */
export const isTutorialRequired = (e: unknown): boolean => e instanceof Error && e.message === PLAY_ERROR_MESSAGES['tutorial-required'];
/** The tutorial answer was refused by the rate limit (429, fixed text). */
export const isTooManyTries = (e: unknown): boolean => e instanceof Error && e.message === TOO_MANY_TRIES_MESSAGE;

// ---- views and reducers (pure) -------------------------------------------------------------------------------------

/** Hint 2 links for every slot that has used Hint 2. The anchor stays in the view, so a reload shows the same links. */
export function hint2Links(view: PlayView, atlasOrigin: string): { slotId: string; href: string }[] {
  const base = atlasOrigin.replace(/\/+$/, '');
  const out: { slotId: string; href: string }[] = [];
  for (const s of view.slots) {
    if (!s.hint2) continue;
    try {
      out.push({ slotId: s.slotId, href: base + atlasUrl(s.hint2.anchor) });
    } catch {
      /* a malformed anchor gets no link */
    }
  }
  return out;
}

/** The Seed for the ledger: only after the run has ended (the view carries it only then). */
export const ledgerSeed = (view: PlayView): string | null => (view.ended ? view.ended.seed : null);

export interface WorldState {
  view: PlayView | null;
  reply: Reply | null;
  /** The last run that ended in this session, for the ending or restart screen. */
  ended: EndInfo | null;
  /** True right after a full fear meter restarted the room, until the next action. */
  restartNotice: boolean;
}

export const initialWorldState: WorldState = { view: null, reply: null, ended: null, restartNotice: false };

export type WorldEvent = { kind: 'response'; response: Pick<PlayResponse, 'view' | 'reply' | 'ended'> } | { kind: 'dismiss-restart' };

export function worldReducer(state: WorldState, event: WorldEvent): WorldState {
  if (event.kind === 'dismiss-restart') return { ...state, restartNotice: false };
  const { view, reply, ended } = event.response;
  return { view, reply, ended: ended ?? state.ended, restartNotice: ended?.status === 'restarted' };
}

export interface TutorialState {
  view: TutorialResponse['view'] | null;
  reply: TutorialResponse['reply'];
  solved: boolean;
}

export const initialTutorialState: TutorialState = { view: null, reply: null, solved: false };

export function tutorialReducer(state: TutorialState, response: Pick<TutorialResponse, 'view' | 'reply'>): TutorialState {
  return { view: response.view, reply: response.reply, solved: state.solved || response.view.solved };
}

// ---- the client ----------------------------------------------------------------------------------------------------

type Call<T> = (args: { data: unknown }) => Promise<T>;

/** The server functions the client uses. Real ones are bound in `lib/play.ts`; tests pass fakes. */
export interface PlayApi {
  startWorld: Call<PlayResponse>;
  worldAct: Call<PlayResponse>;
  startTutorial: Call<TutorialResponse>;
  tutorialAct: Call<TutorialResponse>;
  redeemTutorialReceipt: Call<{ done: true }>;
}

export interface PlayClient {
  start(legendId: string): Promise<PlayResponse>;
  act(legendId: string, action: Action): Promise<PlayResponse>;
  startTutorial(): Promise<TutorialResponse>;
  actTutorial(action: { kind: 'drawer' } | { kind: 'hint2' } | { kind: 'answer'; value: string }): Promise<TutorialResponse>;
  /** Sends a stored receipt once after sign-in. Returns true when it was redeemed or refused for good. */
  redeemStoredReceipt(): Promise<boolean>;
}

/**
 * `storage` is the browser's localStorage for a guest, or null for a signed-in player (nothing is kept in the
 * browser then: the server holds the Run). The tutorial is stateless for everyone, so a signed-in client keeps its
 * tutorial token in memory for the page's life (Phase 5 fix: without it every signed-in tutorial action was sent
 * with no token and refused with the session error). A refused token is cleared and the call is made once more without it,
 * so a stale or expired token starts a fresh run instead of trapping the player.
 */
export function createPlayClient(api: PlayApi, storage: Store | null): PlayClient {
  // One play call in flight at a time. Each call waits for the one before it and reads its token from storage only when
  // it starts, so it uses the token the previous reply stored. A failed call does not block the ones behind it.
  let tail: Promise<unknown> = Promise.resolve();
  const single = <T>(fn: () => Promise<T>): Promise<T> => {
    const p = tail.then(fn);
    tail = p.catch(() => undefined);
    return p;
  };

  const memory = new Map<string, string>();
  const keep = (key: string, token: string | null): void => {
    if (!storage) {
      if (token === null) memory.delete(key);
      else memory.set(key, token);
      return;
    }
    if (token === null) clearToken(storage, key);
    else writeToken(storage, key, token);
  };

  const withToken = async <T extends { token: string | null }>(key: string, send: (token: string | null) => Promise<T>): Promise<T> => {
    const stored = storage ? readToken(storage, key) : (memory.get(key) ?? null);
    try {
      const r = await send(stored);
      keep(key, r.token);
      return r;
    } catch (e) {
      if (stored === null || !isSessionError(e)) throw e;
      if (storage) clearToken(storage, key);
      else memory.delete(key);
      const r = await send(null);
      keep(key, r.token);
      return r;
    }
  };

  const recordEnd = (r: PlayResponse): void => {
    // Only the server's own result is recorded, and only a win breaks a world (design: guest progress).
    if (storage && r.ended && r.ended.status === 'won') {
      addGuestRun(storage, { legendId: r.view.legendId, status: 'won', slotsSolved: r.ended.slotsSolved, score: r.ended.score, finishedAt: new Date().toISOString() });
    }
  };

  const startWorld = (legendId: string) => withToken(playTokenKey(legendId), (token) => api.startWorld({ data: { legendId, token } }));

  return {
    start: (legendId) => single(() => startWorld(legendId)),
    act: (legendId, action) =>
      single(async () => {
        const key = playTokenKey(legendId);
        const send = () => withToken(key, (token) => api.worldAct({ data: { legendId, token, action } }));
        let r: PlayResponse;
        try {
          r = await send();
        } catch (e) {
          if (!isConflictError(e)) throw e;
          // The server saw a newer revision (another tab or device wrote first) and did not apply this action.
          // Reload the stored run so nothing is lost, then apply the action once on top of it.
          await startWorld(legendId);
          r = await send();
        }
        recordEnd(r);
        return r;
      }),
    startTutorial: () => single(() => withToken(TUTORIAL_TOKEN_KEY, (token) => api.startTutorial({ data: { token } }))),
    actTutorial: (action) =>
      single(async () => {
        const r = await withToken(TUTORIAL_TOKEN_KEY, (token) => api.tutorialAct({ data: { token, action } }));
        if (r.receipt && storage) writeToken(storage, TUTORIAL_RECEIPT_KEY, r.receipt);
        return r;
      }),
    async redeemStoredReceipt() {
      if (!storage) return false;
      const receipt = readToken(storage, TUTORIAL_RECEIPT_KEY);
      if (receipt === null) return false;
      try {
        await api.redeemTutorialReceipt({ data: { receipt } });
      } catch (e) {
        // A receipt the server will never accept is dropped. Any other failure (network, 503) keeps it for the next visit.
        if (isSessionError(e)) clearToken(storage, TUTORIAL_RECEIPT_KEY);
        return false;
      }
      clearToken(storage, TUTORIAL_RECEIPT_KEY);
      return true;
    },
  };
}
