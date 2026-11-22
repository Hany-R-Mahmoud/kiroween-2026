import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { hint2Outcome, type Hint2Server } from '../src/lib/hintTab.ts';

// Feature: ui-rework, Property 6: Hint 2 outcome never leaks or wastes a tab
// **Validates: Requirements 27.1, 27.2, 27.3, 27.6, 27.7**

const serverArb: fc.Arbitrary<Hint2Server> = fc.oneof(
  fc.record({ kind: fc.constant('charged' as const), href: fc.option(fc.webUrl(), { nil: null }) }),
  fc.constant({ kind: 'free' as const }),
  fc.constant({ kind: 'failed' as const }),
);

describe('Property 6: hint2Outcome', () => {
  it('never leaks or wastes a tab', () => {
    fc.assert(
      fc.property(fc.boolean(), serverArb, (tabOpened, server) => {
        const out = hint2Outcome(tabOpened, server);
        const charged = server.kind === 'charged';
        const href = charged ? server.href : null;
        expect(out.showBlockedLink !== null).toBe(charged && !tabOpened && href !== null);
        expect(out.navigate !== null).toBe(charged && tabOpened && href !== null);
        if (!charged) {
          expect(out.closeTab).toBe(true);
          expect(out.navigate).toBeNull();
          expect(out.showBlockedLink).toBeNull();
        }
        if (charged && tabOpened && href === null) expect(out.closeTab).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
