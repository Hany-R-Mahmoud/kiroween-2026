// Every message is fixed: it never repeats client input, other players' ids, or database details.
// `status` is the HTTP status the server function answers with.

export type PlayErrorCode = 'invalid' | 'session' | 'sign-in-required' | 'not-found' | 'conflict' | 'ended' | 'refused' | 'unavailable';

const TABLE: Record<PlayErrorCode, { status: number; message: string }> = {
  invalid: { status: 400, message: 'That request is not valid.' },
  // One message for every bad token: malformed, altered, expired, wrong legend, wrong kind, wrong version.
  session: { status: 400, message: 'This game session cannot be used. Start again.' },
  'sign-in-required': { status: 401, message: 'Sign in to enter this world.' },
  'not-found': { status: 404, message: 'That was not found.' },
  conflict: { status: 409, message: 'The game moved on. Please try again.' },
  ended: { status: 409, message: 'This run has ended.' },
  refused: { status: 422, message: 'That action is not allowed now.' },
  unavailable: { status: 503, message: 'The game cannot continue right now. Please try again.' },
};

export class PlayError extends Error {
  readonly status: number;
  constructor(readonly code: PlayErrorCode) {
    super(TABLE[code].message);
    this.name = 'PlayError';
    this.status = TABLE[code].status;
  }
}

export const PLAY_ERROR_MESSAGES: Readonly<Record<PlayErrorCode, string>> = Object.fromEntries(
  Object.entries(TABLE).map(([k, v]) => [k, v.message]),
) as Record<PlayErrorCode, string>;
