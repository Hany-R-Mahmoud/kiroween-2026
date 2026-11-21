import type { Visitor } from '@kiroween/skeleton';
import { NotSignedInError } from '@kiroween/skeleton';
import { createMiddleware } from '@tanstack/react-start';
import { getRequest, setResponseStatus } from '@tanstack/react-start/server';
import { getVisitor } from './auth';
import { tutorialRateRefusal } from './tutorialRateLimit';

/** Puts the verified visitor on the server-function context. Nothing comes from the client. */
export const authMiddleware = createMiddleware({ type: 'function' }).server(async ({ next }) => next({ context: { visitor: await getVisitor() } }));

/** Like authMiddleware, but refuses guests before the handler runs (R4.11). The service checks again. */
export const requireUser = createMiddleware({ type: 'function' })
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    if (context.visitor.kind !== 'user') {
      const e = new NotSignedInError();
      setResponseStatus(e.status); // 401; this runs before the handler's own error mapping
      throw new Error(e.message);
    }
    return next({ context: { user: context.visitor as Extract<Visitor, { kind: 'user' }> } });
  });

/**
 * Rate limit on the tutorial answer action only (Requirement 10). Runs before the handler; the play rules are untouched.
 * The limiter lives in `tutorialRateLimit.ts` and is referenced only inside `.server()`, which Start removes from the
 * client build; a top-level reference here would pull the skeleton (and its database schema) into the client bundle.
 */
export const tutorialRateLimit = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const refusal = tutorialRateRefusal(getRequest().headers);
  if (refusal) {
    setResponseStatus(refusal.status);
    throw new Error(refusal.message);
  }
  return next();
});
