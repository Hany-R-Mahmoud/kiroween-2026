// Pure helpers for the win screen. No I/O; the route reads the data and passes it in.

export interface EndingDoor {
  id: string;
  title: string;
  open: boolean;
}

export type EndingNext = { kind: 'world'; legendId: string; title: string } | { kind: 'signin'; title: string };

/**
 * The door after `currentId` in catalogue order (wrapping). Null when there is no other door.
 * A door the visitor cannot enter (the guest case) leads to sign-in instead.
 */
export function nextDoor(doors: readonly EndingDoor[] | null | undefined, currentId: string, signedIn: boolean): EndingNext | null {
  if (!doors || doors.length < 2) return null;
  const at = doors.findIndex((d) => d.id === currentId);
  if (at < 0) return null;
  const d = doors[(at + 1) % doors.length];
  if (!d || d.id === currentId) return null;
  return d.open || signedIn ? { kind: 'world', legendId: d.id, title: d.title } : { kind: 'signin', title: d.title };
}

/** The highest score among won runs of one legend, or null when there is none. */
export function bestOf(runs: readonly { legendId: string; status: string; score: number }[], legendId: string): number | null {
  let best: number | null = null;
  for (const r of runs) if (r.legendId === legendId && r.status === 'won' && (best === null || r.score > best)) best = r.score;
  return best;
}
