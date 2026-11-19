// Every message is fixed: it never repeats client input, ids from other users, or database details.
// `status` is the HTTP status the server function answers with.

export class RunError extends Error {
  constructor(
    readonly code: 'not-signed-in' | 'not-found' | 'conflict' | 'invalid' | 'no-run' | 'unavailable',
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'RunError';
  }
}

export class NotSignedInError extends RunError {
  constructor() {
    super('not-signed-in', 401, 'Sign in to save your progress.');
  }
}

/** A run that does not exist, belongs to someone else, or is already finished: the caller cannot tell which. */
export class RunNotFoundError extends RunError {
  constructor() {
    super('not-found', 404, 'That run was not found.');
  }
}

/** Two starts for the same world raced and the database's one-run-in-progress rule refused the second. */
export class RunConflictError extends RunError {
  constructor() {
    super('conflict', 409, 'A run for this world is already starting. Try again.');
  }
}

/** `issues` names fields and rules only (for the UI to mark fields); it never contains the submitted values. */
export class ValidationError extends RunError {
  constructor(readonly issues: string[]) {
    super('invalid', 400, 'Some of the run details are not valid.');
  }
}

/** No seed gave a valid run for this legend. Names the legend, which is public. */
export class NoRunError extends RunError {
  constructor(readonly legendId: string) {
    super('no-run', 500, `No run could be made for the world "${legendId}". Please try again later.`);
  }
}

/** Any other store failure. The driver's message is dropped on purpose. */
export class StoreUnavailableError extends RunError {
  constructor() {
    super('unavailable', 503, 'Progress cannot be saved right now. Please try again.');
  }
}
