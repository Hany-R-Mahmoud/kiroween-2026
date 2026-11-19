/** Who is asking. Only the server builds a `user` visitor, from a session it has verified itself. */
export type Visitor = { kind: 'guest' } | { kind: 'user'; id: string; name: string };

export type Target = { kind: 'tutorial' } | { kind: 'legend'; id: string };

/**
 * Decision 29: guests may enter the tutorial and the one guest world; signed-in users may enter every world.
 * Whether the legend id exists is the caller's check (against the catalogue), so this stays total.
 */
export function canEnter(target: Target, visitor: Visitor, guestWorld: string): boolean {
  if (visitor.kind === 'user') return true;
  return target.kind === 'tutorial' || target.id === guestWorld;
}
